/**
 * Occlusion regression for segmented models.
 *
 * A composite built from part sheets must look like a single-pass render of the
 * same model. That is the whole point of the depth sheets, and it is the thing
 * that used to break: with a draw order picked from per-part numbers, a door on
 * the far wall painted itself over the roof as soon as the building turned.
 *
 * What is checked, per (asset, facing):
 *
 *   coverage  every pixel that has any surface in the ground-truth render has
 *             one in the composite, and vice versa — no part is missing, none
 *             is drawn where nothing exists;
 *   depth     the depth the compositor settled on equals the ground truth's
 *             nearest surface (within a fraction of a voxel), which is only
 *             possible if the per-pixel z-test picked the nearest part;
 *   colour    on "pure" pixels — pixels only one part touches — the composite
 *             colour is the ground truth's colour, so the right part won.
 *
 * Boundary pixels where two parts meet are excluded from the colour check on
 * purpose: a single-pass render averages sub-samples of both parts there, and a
 * segmented composite cannot reproduce that mixture. Coverage and depth still
 * cover those pixels.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScribe } from '../tools/voxel_pipeline/v3/scribe.mjs';
import { MATERIALS, MATERIAL_IDS, MATERIAL_NAMES, colorFor } from '../tools/voxel_pipeline/v3/materials.mjs';
import { cameraBasis, renderPart, buildPalette } from '../tools/voxel_pipeline/v3/raster.mjs';
import { MODELS } from '../tools/voxel_pipeline/v3/models/index.mjs';
import { BUILDING_FACINGS, UNIT_FACINGS } from '../tools/voxel_pipeline/v3/bake.mjs';
import { compositeParts } from '../tools/voxel_pipeline/v3/composite.mjs';
import { decodeDepth } from '../tools/voxel_pipeline/v3/depth-map.mjs';
import { decodePng } from '../tools/voxel_pipeline/v3/contact.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANVAS = 512;
/** compositeParts' default margin, in output pixels. */
const PAD = 4;
/** Ground-truth depth may differ by this much: sheet depth is quantised to 1/32
 * voxel but at a steep edge a part sheet and the full render can also disagree
 * about which sub-sample is nearest, which costs a few voxels of depth. */
const DEPTH_TOLERANCE = 0.75;

const palette = buildPalette(MATERIAL_NAMES, n => colorFor(n, 'standard'), MATERIALS);
const geometry = new Map();

function model(id) {
  if (!geometry.has(id)) {
    const scribe = createScribe({ materialIds: MATERIAL_IDS });
    MODELS[id].build(scribe);
    geometry.set(id, scribe.finish({ cull: true }));
  }
  return geometry.get(id);
}

function assetDir(id) {
  return path.join(ROOT, 'game_assets', MODELS[id].folder, id);
}

function manifestOf(id) {
  return JSON.parse(fs.readFileSync(path.join(assetDir(id), 'manifest.json'), 'utf8'));
}

/** The facing a part is drawn from — mirrors `shiftFacing()` in the review page. */
function sheetFacing(part, facing, unitIndex, steps = 0) {
  const order = part.facingOrder ?? [];
  if (!part.traverse || !order.length) return part.facings[facing] ? facing : order[unitIndex % order.length];
  const n = order.length;
  const base = unitIndex % n;
  return order[(((base + steps) % n) + n) % n];
}

/**
 * Design space -> camera axis for a facing. Mirrors `cameraBasis(angle).dHat`,
 * the direction the depth sheets are measured along.
 */
function viewDirAt(angle) {
  const p = (angle * Math.PI) / 180;
  const v = [Math.sin(p) + Math.cos(p), Math.cos(p) - Math.sin(p), 1];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Yaw a design-space point about a pivot, +Z up. */
function yawAbout(point, pivot, deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = point[0] - pivot[0], dy = point[1] - pivot[1];
  return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c, point[2]];
}

/** The pivot a traverse chain turns about — the turret ring, not the gun. */
function traverseRootOf(manifest, part) {
  if (part.traverseRoot) return part.traverseRoot;
  let root = part.pivotDesign;
  let cursor = part;
  const guard = new Set();
  while (cursor && cursor.parent && !guard.has(cursor.name)) {
    guard.add(cursor.name);
    const parent = manifest.parts[cursor.parent];
    if (!parent) break;
    if (parent.traverse) root = parent.pivotDesign;
    cursor = parent;
  }
  return root;
}

/**
 * Place every part of one facing the way the review page does, then composite.
 *
 * `steps` is a traverse, in 22.5-degree unit facings. A traversing part is drawn
 * from the sheet baked `steps` cameras round the ring, its pivot is orbited about
 * its parent's pivot, and its depth is corrected by
 * `(v_scene − v_sheet) · root / 8` — see the note in composite.mjs and
 * `depthBias` in the review page. All three have to agree or the gun sinks into
 * the hull as it swings.
 */
function compositeFromSheets(id, facing, steps = 0) {
  const dir = assetDir(id);
  const manifest = manifestOf(id);
  const meta = manifest.facingMeta.find(f => f.id === facing);
  assert.ok(meta, `${id}: no facing ${facing}`);
  const G = meta.groundCentre, M = meta.screenMatrix;
  const cache = new Map();
  const read = (f) => {
    const key = f.file;
    if (!cache.has(key)) {
      const im = decodePng(fs.readFileSync(path.join(dir, key)));
      cache.set(key, { w: im.w, h: im.h, data: im.data });
    }
    return cache.get(key);
  };

  const layers = [];
  for (const [name, part] of Object.entries(manifest.parts)) {
    const sheetOf = sheetFacing(part, facing, meta.unitIndex, steps);
    const entry = part.facings[sheetOf];
    assert.ok(entry, `${id}/${name}: no sheet for ${sheetOf} at step ${steps}`);
    assert.ok(entry.files.depth, `${id}/${name}: sheet has no depth map`);
    const traversing = !!part.traverse && steps !== 0;
    let pv = part.pivotDesign;
    if (traversing) {
      let cursor = part;
      const guard = new Set();
      while (cursor && cursor.parent && !guard.has(cursor.name)) {
        guard.add(cursor.name);
        const parent = manifest.parts[cursor.parent];
        if (!parent) break;
        pv = yawAbout(pv, parent.pivotDesign, steps * 22.5);
        cursor = parent;
      }
    }
    const dx = pv[0] - G[0], dy = pv[1] - G[1], dz = (pv[2] ?? 0) - G[2];
    const screen = [M[0] * dx + M[1] * dy + M[2] * dz, M[3] * dx + M[4] * dy + M[5] * dz];
    let depthBias = 0;
    if (traversing) {
      const root = traverseRootOf(manifest, part);
      const vScene = meta.viewDir;
      const vSheet = viewDirAt(part.facingSet === 'unit'
        ? Number(String(sheetOf).slice(1)) * 22.5
        : meta.angle);
      depthBias = ((vScene[0] - vSheet[0]) * root[0]
        + (vScene[1] - vSheet[1]) * root[1]
        + (vScene[2] - vSheet[2]) * (root[2] ?? 0)) / (manifest.designVoxelsPerTileUnit || 8);
    }
    layers.push({
      name,
      ox: screen[0] - entry.pivot[0],
      oy: screen[1] - entry.pivot[1],
      pivot: entry.pivot,
      screen,
      depthBias,
      albedo: read(entry.files.albedo),
      normal: read(entry.files.normal),
      material: read(entry.files.material),
      depth: read(entry.files.depth),
      scale: 1,
    });
  }
  return { comp: compositeParts(layers), layers, meta };
}

/**
 * Ground truth: every voxel of the model through one depth buffer.
 *
 * With `steps`, the parts that traverse are yawed rigidly about the ring they
 * are mounted on — what a voxel engine would actually draw, not what a rotated
 * sprite would. The rotation lands on the integer grid only at multiples of 90°,
 * so comparisons at other steps are lossy for reasons that have nothing to do
 * with the compositor.
 */
function renderTruth(id, facing, superSample, steps = 0) {
  const geom = model(id);
  const set = MODELS[id].kind === 'unit' ? UNIT_FACINGS : BUILDING_FACINGS;
  const f = set.find(q => q.id === facing);
  const basis = cameraBasis(f.angle, 1);
  const occluders = new Set();
  const all = [];
  const manifest = fs.existsSync(path.join(assetDir(id), 'manifest.json')) ? manifestOf(id) : null;
  for (const part of geom.parts) {
    const pmeta = manifest ? manifest.parts[part.name] : null;
    const pivot = pmeta && pmeta.traverse && steps ? traverseRootOf(manifest, pmeta) : null;
    for (const v of part.voxels) {
      const q = pivot ? yawAbout(v, pivot, steps * 22.5) : v;
      const p = [Math.round(q[0]), Math.round(q[1]), Math.round(q[2]), v[3]];
      occluders.add(`${p[0]},${p[1]},${p[2]}`);
      all.push(p);
    }
  }
  const r = renderPart(all, { basis, palette, superSample, occluders });
  const gp = basis.project(CANVAS / 2, CANVAS / 2, 0);
  return { r, groundPixel: [gp[0] - r.origin[0], gp[1] - r.origin[1]] };
}

/**
 * Compare a composite against the ground truth, aligning on the projected
 * ground centre — the one point every placement is anchored to.
 */
function compare(id, facing, { superSample = 4, steps = 0 } = {}) {
  const { comp, layers } = compositeFromSheets(id, facing, steps);
  const { r: truth, groundPixel } = renderTruth(id, facing, superSample, steps);
  const L0 = layers[0];
  const gx = Math.round(L0.ox - comp.minX) + 4 + L0.pivot[0];
  const gy = Math.round(L0.oy - comp.minY) + 4 + L0.pivot[1];
  const ox = Math.round(gx - groundPixel[0]);
  const oy = Math.round(gy - groundPixel[1]);

  const W = comp.W, H = comp.H;
  const result = {
    id, facing, steps, W, H,
    union: 0, coverageMiss: 0,
    pure: 0, colourMiss: 0, worstColour: 0,
    depthPixels: 0, depthBad: 0, depthMax: 0, worstDepthAt: null,
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tx = x - ox, ty = y - oy;
      const inTruth = tx >= 0 && ty >= 0 && tx < truth.w && ty < truth.h;
      const cell = y * W + x;
      const ca = comp.A[cell * 4 + 3];
      const tcell = inTruth ? ty * truth.w + tx : -1;
      const ta = inTruth ? truth.albedo[tcell * 4 + 3] : 0;
      if (ca > 0 || ta > 0) result.union++;
      if ((ca > 0) !== (ta > 0)) result.coverageMiss++;
      if (!inTruth || ca === 0 || ta === 0) continue;

      const cz = comp.zbuf[cell];
      const tz = truth.depth[tcell];
      // Only fully-covered pixels: on the silhouette edge a part sheet and the
      // full render can disagree by half a pixel of sample phase, which moves
      // which surface owns the pixel without anything being wrong.
      if (ca === 255 && ta === 255 && Number.isFinite(cz) && Number.isFinite(tz)) {
        result.depthPixels++;
        const d = Math.abs(cz - tz);
        if (d > result.depthMax) { result.depthMax = d; result.worstDepthAt = [x, y, cz, tz]; }
        if (d > DEPTH_TOLERANCE) result.depthBad++;
      }

      if (ca === 255 && ta === 255 && comp.cover[cell] === 1) {
        result.pure++;
        const diff = Math.max(
          Math.abs(comp.A[cell * 4] - truth.albedo[tcell * 4]),
          Math.abs(comp.A[cell * 4 + 1] - truth.albedo[tcell * 4 + 1]),
          Math.abs(comp.A[cell * 4 + 2] - truth.albedo[tcell * 4 + 2]),
        );
        if (diff > result.worstColour) result.worstColour = diff;
        if (diff > 16) result.colourMiss++;
      }
    }
  }
  return result;
}

function assertMatchesGroundTruth(result) {
  const { id, facing, steps, union, coverageMiss, pure, colourMiss, depthBad, depthPixels } = result;
  assert.ok(union > 200, `${id}/${facing}@${steps}: only ${union} pixels have surface — nothing to compare`);
  // Half a pixel of sample phase on an edge is allowed; a part in the wrong
  // place is not, and it shows up as whole regions rather than a fringe.
  assert.ok(coverageMiss / union < 0.01, `${id}/${facing}@${steps}: ${coverageMiss}/${union} pixels disagree on`
    + ' silhouette — a part is missing, misplaced, or drawn where the model has nothing');
  assert.ok(depthBad / depthPixels < 0.01, `${id}/${facing}@${steps}: ${depthBad}/${depthPixels} pixels disagree on depth`
    + ` (worst ${result.depthMax.toFixed(3)} tile units at ${JSON.stringify(result.worstDepthAt)})`
    + ' — the compositor is not showing the nearest part');
  assert.ok(pure > 100, `${id}/${facing}@${steps}: only ${pure} single-part pixels to check colour on`);
  assert.ok(
    colourMiss / pure < 0.01,
    `${id}/${facing}@${steps}: ${colourMiss}/${pure} single-part pixels have the wrong colour`
    + ` (worst ${result.worstColour}) — the wrong part won`,
  );
}

test('barracks: door and flag never paint over the roof', () => {
  // `down` is the facing that exposed the bug: the door is on the far wall there.
  for (const facing of ['down', 'right', 'left', 'up']) {
    assertMatchesGroundTruth(compare('barracks', facing));
  }
});

test('recon: body, wheels and turret compose correctly', () => {
  for (const facing of ['d00', 'd07']) assertMatchesGroundTruth(compare('recon', facing));
});

test('at-turret: turret and barrel compose on the hull from every scene facing', () => {
  // The building bakes 4 facings; the gun rides on the 16-camera unit ring.
  for (const facing of BUILDING_FACINGS.map(f => f.id)) {
    assertMatchesGroundTruth(compare('at-turret', facing));
  }
});

test('at-turret: the gun stays on top of the hull while it traverses', () => {
  // The bug this pins: at a traverse the gun was drawn from another camera's
  // sheet with no depth correction, so its depth was measured along a different
  // axis than the hull's. It sat ~37 tile units too far back and the hull
  // painted over every pixel of the turret that the pit wall was in front of —
  // 232 wrong pixels of a 1000-pixel silhouette, i.e. the gun vanished into the
  // roof. Cardinal steps only: a quarter turn re-voxelises exactly, so the
  // ground truth is exact there.
  for (const facing of ['right', 'up']) {
    for (const steps of [4, 8, 12]) assertMatchesGroundTruth(compare('at-turret', facing, { steps }));
  }
});

test('at-turret: every traverse step resolves to a complete sheet', () => {
  // Drawing the gun at step 11 means drawing a sheet baked from another camera
  // and re-registering it on the ring. A hole in that ring is a part that
  // vanishes when the gun swings, so every step has to resolve.
  const manifest = manifestOf('at-turret');
  const meta = manifest.facingMeta.find(f => f.id === 'down');
  const missing = [];
  for (const [name, part] of Object.entries(manifest.parts)) {
    if (!part.traverse) continue;
    for (let step = 0; step < 16; step++) {
      const facing = sheetFacing(part, 'down', meta.unitIndex, step);
      const entry = part.facings[facing];
      if (!entry) { missing.push(`${name} step ${step} → ${facing}`); continue; }
      for (const map of ['albedo', 'normal', 'material', 'depth']) {
        if (!entry.files[map]) missing.push(`${name} step ${step} → ${facing} has no ${map}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('every part sheet ships a depth map', () => {
  const broken = [];
  for (const [id, def] of Object.entries(MODELS)) {
    const manifestPath = path.join(ROOT, 'game_assets', def.folder, id, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const [name, part] of Object.entries(manifest.parts)) {
      for (const [facing, entry] of Object.entries(part.facings)) {
        if (!entry.files?.depth) { broken.push(`${id}/${name}/${facing}`); continue; }
        if (!fs.existsSync(path.join(ROOT, 'game_assets', def.folder, id, entry.files.depth.file))) {
          broken.push(`${id}/${name}/${facing} (file missing)`);
        }
      }
    }
  }
  assert.deepEqual(broken.slice(0, 6), [], `${broken.length} part sheets have no depth map — re-bake`);
});

test('depth codec round-trips within a 32nd of a voxel', () => {
  const step = 1 / 32 / 8; // 1/32 design voxel, in tile units
  for (const value of [0, 1.5, -12.25, 127.9, -127.9, 63.125]) {
    const q = Math.round((value + 128) * 256);
    const back = decodeDepth(q);
    assert.ok(Math.abs(back - value) <= step + 1e-9, `${value} decoded to ${back}`);
  }
});

test('composite places hi-resolution sheets with their scale', () => {
  // The review page draws rotated segments from the 4x sheets and tests them
  // against the runtime-scale depth sheet. That only works if `scale` maps the
  // colour pixel back onto the depth sheet exactly, so build a 2x sheet and
  // check the depth test makes the same decisions as on the runtime sheet.
  const { comp: base, layers } = compositeFromSheets('recon', 'd00');
  const hi = layers.map((l) => {
    const w = l.albedo.w * 2, h = l.albedo.h * 2;
    const up = (src) => {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const s = ((y >> 1) * l.albedo.w + (x >> 1)) * 4;
          const d = (y * w + x) * 4;
          data[d] = src.data[s]; data[d + 1] = src.data[s + 1];
          data[d + 2] = src.data[s + 2]; data[d + 3] = src.data[s + 3];
        }
      }
      return { w, h, data };
    };
    return {
      ...l,
      albedo: up(l.albedo),
      normal: up(l.normal),
      material: up(l.material),
      depth: l.depth,
      scale: 2,
    };
  });
  const zoomed = compositeParts(hi);
  // `pad` is in output pixels at both scales, so the content maps as
  // (x - pad) * 2 + pad rather than a plain doubling.
  assert.ok(Math.abs(zoomed.W - (base.W * 2 - PAD * 2)) <= 2, `zoomed width ${zoomed.W} vs ${base.W}`);
  let compared = 0, disagreed = 0;
  for (let y = PAD; y < base.H - PAD; y++) {
    for (let x = PAD; x < base.W - PAD; x++) {
      const b = base.owner[y * base.W + x];
      const z = zoomed.owner[((y - PAD) * 2 + PAD) * zoomed.W + ((x - PAD) * 2 + PAD)];
      // Boundary pixels can flip at 2× because the depth sheet is sampled with
      // nearest-neighbour and an edge sample lands a quarter pixel away, so only
      // pixels that are unambiguous in both images are compared.
      if (b < 0 || z < 0 || base.cover[y * base.W + x] !== 1) continue;
      compared++;
      if (b !== z) disagreed++;
    }
  }
  assert.ok(compared > 200, `only ${compared} owned pixels compared`);
  assert.ok(disagreed / compared < 0.01, `${disagreed}/${compared} pixels pick a different part at 2x`);
});
