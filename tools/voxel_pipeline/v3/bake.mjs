#!/usr/bin/env node
/**
 * 512³-native baker: segmented sprite sheets + normal + material maps.
 *
 * Contract (documented in docs/PLAN_512_native_16dir_segmented_pipeline.md):
 *
 *   * one folder per asset:            game_assets/<kind>/<asset>/
 *   * one PNG per part per facing:     sheets/<asset>__<part>__<facing>__albedo.png
 *                                      sheets/<asset>__<part>__<facing>__normal.png
 *                                      sheets/<asset>__<part>__<facing>__material.png
 *   * the asset manifest records the shared ground anchor so the parts
 *     composite exactly, plus each part's rotation pivot in pixels.
 *
 * Units get 16 facings, buildings keep the 4 legacy cardinal facings
 * (`right`/`up`/`left`/`down` = the same poses the old sheets used), because a
 * building's footprint is axis-aligned on the board.
 *
 * Run: node tools/voxel_pipeline/v3/bake.mjs [--only tank,barracks] [--k 4] [--ss 2]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pngBytes } from '../bake.mjs';
import { createScribe, CANVAS } from './scribe.mjs';
import { MATERIALS, MATERIAL_IDS, MATERIAL_NAMES, colorFor, materialMapDescriptor } from './materials.mjs';
import { cameraBasis, renderPart, buildPalette } from './raster.mjs';
import { encodeDepth, DEPTH_SCALE, DEPTH_BIAS } from './depth-map.mjs';
import { MODELS } from './models/index.mjs';
import { validateModel } from './validate.mjs';
import {
  relight, defaultRig, singleLight, normalView, materialIdView, channelView, tilePanels,
} from './light.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** 16 unit facings: 22.5° steps. d00 is the pose legacy sheets called `right`. */
export const UNIT_FACINGS = Array.from({ length: 16 }, (_, i) => {
  const angle = i * 22.5;
  const screen = (45 + angle) % 360;          // where the model's nose points on screen
  const names = ['E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW', 'N', 'NNE', 'NE', 'ENE'];
  return {
    id: `d${String(i).padStart(2, '0')}`,
    angle,
    screenAngle: screen,
    label: names[Math.round((((screen % 360) + 360) % 360) / 22.5) % 16],
  };
});

/** 4 building facings, identical poses to the legacy right/up/left/down set. */
export const BUILDING_FACINGS = [
  { id: 'right', angle: 0 },
  { id: 'up', angle: 90 },
  { id: 'left', angle: 180 },
  { id: 'down', angle: 270 },
];

/**
 * Runtime render scale.
 *
 * The 512 lattice maps onto one legacy 64×32 tile (8 design voxels per tile
 * unit), so k = 1 renders a full-tile footprint as exactly a 64 px diamond —
 * the same world scale the old 64³ sheets had. Baking at k = 4 produced sheets
 * four times too large, which for a building means it could never sit in its
 * tile. Review images are rendered separately at PREVIEW_K for eyeballing.
 */
export const RUNTIME_K = 1;
// Review images only: 8 puts a design voxel at half a pixel, which is where
// silhouette and attachment can actually be judged. Override with
// VOXEL_PREVIEW_K when a part needs a closer look; runtime sheets never change.
export const PREVIEW_K = Number(process.env.VOXEL_PREVIEW_K ?? 8);
// ss = 4 samples per output pixel. At runtime scale one pixel covers ~8 design
// voxels per axis, so 4 samples is the smallest grid that stops the downsample
// from aliasing into noise; it costs ~2x the bake time, not 4x (the work is per
// covered face, not per sample).
const DEFAULTS = { k: RUNTIME_K, ss: 4 };
/**
 * Scale of the optional review sheet set (`--sheet-k N`).
 *
 * Runtime sheets are 1:1 with the game and stay that way — a 512³ tank is a
 * ~60×43 image, which is right for the engine and useless for inspection. The
 * review gallery composites those sheets and magnifies them, and magnifying a
 * 60-pixel image is what made a rotated turret look like frosted glass.
 *
 * So the same part/facing renders are also written at `sheetK` into
 * `sheets-hi/`, where the gallery can draw them at (or near) display size
 * without inventing detail. Review artifact only: the engine keeps reading
 * `sheets/`, and `--sheet-k 0` turns the set off entirely.
 */
const SHEET_K_DEFAULT = Number(process.env.VOXEL_SHEET_K ?? 4);

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function partFileName(asset, part, facing, map) {
  return `${asset}__${part}__${facing}__${map}.png`;
}

/**
 * Composite part renders onto one canvas using their shared ground anchor.
 *
 * A part's pixel (px, py) sits at world offset (px - anchor), so to place every
 * part on one canvas each is drawn at `ox = originX + maxAnchorX - anchorX`
 * (and the same for y). Getting that sign wrong scatters the parts — which is
 * exactly the bug this replaces: the barrel used to land 2×120 px from its ring.
 *
 * Parts are drawn far-to-near using their centroid depth so overlaps read
 * correctly; the authoritative preview is still the single-pass render, this is
 * the anchor/segmentation check.
 */
function compositePreview(parts, pad = 8, key = 'albedo') {
  // Coverage always comes from the albedo alpha. The material map carries
  // emissive in its own alpha channel, and the normal map has no meaningful
  // alpha, so masking by the channel's own alpha silently drops every
  // non-emissive pixel (that bug blanked the metalness/roughness panels).
  const mask = p => p.albedo;
  // Material ids must never be blended (an average of two ids is a third id);
  // the nearest part wins. Colour and normals are alpha-composited.
  const pickNearest = key === 'material';
  const maxAx = Math.max(...parts.map(p => p.anchor[0]));
  const maxAy = Math.max(...parts.map(p => p.anchor[1]));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of parts) {
    const ox = maxAx - p.anchor[0];
    const oy = maxAy - p.anchor[1];
    minX = Math.min(minX, ox);
    minY = Math.min(minY, oy);
    maxX = Math.max(maxX, ox + p.w);
    maxY = Math.max(maxY, oy + p.h);
  }
  const w = Math.ceil(maxX - minX) + pad * 2;
  const h = Math.ceil(maxY - minY) + pad * 2;
  const out = new Uint8ClampedArray(w * h * 4);
  const cov = new Uint8Array(w * h);      // silhouette coverage, independent of channel alpha
  // Real occlusion: every part carries its own depth sheet, and each pixel goes
  // to whichever part is nearest. Draw order is irrelevant — which is the whole
  // point, because no single ordering is right for 16 facings (a far-side door
  // must lose to the wall, a turret must win over the deck under it).
  const zbuf = new Float32Array(w * h).fill(-Infinity);
  for (const p of parts) {
    const ox = Math.round(maxAx - p.anchor[0] - minX) + pad;
    const oy = Math.round(maxAy - p.anchor[1] - minY) + pad;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const s = (y * p.w + x) * 4;
        const a = mask(p)[s + 3] / 255;
        if (a <= 0) continue;
        const dx = x + ox, dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue;
        const d = dy * w + dx;
        const z = p.depthBuf ? p.depthBuf[y * p.w + x] : p.depth;
        const pixel = d * 4;
        if (a * 255 > cov[d]) cov[d] = Math.round(a * 255);
        if (z <= zbuf[d]) continue;                    // something nearer owns it
        zbuf[d] = z;
        if (pickNearest) {
          out[pixel] = p[key][s]; out[pixel + 1] = p[key][s + 1];
          out[pixel + 2] = p[key][s + 2]; out[pixel + 3] = p[key][s + 3];
          continue;
        }
        // Keep the winner's own coverage in alpha so silhouette edges stay
        // anti-aliased; the colour itself is never blended between parts.
        out[pixel] = p[key][s]; out[pixel + 1] = p[key][s + 1];
        out[pixel + 2] = p[key][s + 2]; out[pixel + 3] = Math.round(a * 255);
      }
    }
  }
  return { w, h, buf: Buffer.from(out.buffer, out.byteOffset, out.length), coverage: cov };
}

/**
 * Single-pass render of the whole model: every part's voxels in one depth
 * buffer. This is the authoritative preview because occlusion between parts
 * (turret ring inside hull, barrel over deck) is resolved by real depth instead
 * of by draw order.
 */
function renderWhole(parts, { basis, palette, superSample, occluders }) {
  const all = [];
  for (const p of parts) for (const v of p.voxels) all.push(v);
  return renderPart(all, { basis, palette, superSample, occluders });
}

export function bakeAsset(id, def, { k = DEFAULTS.k, ss = DEFAULTS.ss, sheetK = 0, outRoot = ROOT } = {}) {
  const scribe = createScribe({ materialIds: MATERIAL_IDS });
  def.build(scribe);
  const geom = scribe.finish({ cull: true });
  const problems = validateModel(id, def, geom);
  if (problems.length) {
    throw new Error(`${id}: geometry validation failed\n  - ${problems.join('\n  - ')}`);
  }
  // A part traverses if it says so, or if an ancestor in its mount chain does —
  // a gun on a turret ring swings with the ring.
  const traversing = new Set();
  for (const part of geom.parts) {
    let cursor = part;
    const guard = new Set();
    while (cursor && !guard.has(cursor.name)) {
      guard.add(cursor.name);
      if (cursor.traverse) { traversing.add(part.name); break; }
      cursor = cursor.parent ? geom.parts.find(q => q.name === cursor.parent) : null;
    }
  }

  const palette = buildPalette(MATERIAL_NAMES, name => colorFor(name, 'standard'), MATERIALS);
  const occluders = new Set();
  for (const part of geom.parts) for (const [x, y, z] of part.voxels) occluders.add(`${x},${y},${z}`);

  const facings = def.kind === 'unit' ? UNIT_FACINGS : BUILDING_FACINGS;
  const PREVIEW_FACING = def.kind === 'unit' ? 'd00' : 'right';
  const assetDir = path.join(outRoot, 'game_assets', def.folder, id);
  const sheetDir = path.join(assetDir, 'sheets');
  fs.mkdirSync(sheetDir, { recursive: true });
  const hiK = sheetK > k ? sheetK : 0;              // 0 = no review sheet set
  const hiSheetDir = path.join(assetDir, 'sheets-hi');
  if (hiK) fs.mkdirSync(hiSheetDir, { recursive: true });

  const manifest = {
    format: 'field-command-voxel-sheet-4',
    // Review-only sheet set at hiK times the runtime detail; null when the bake
    // was run without `--sheet-k`.
    hiSheetScale: hiK || null,
    asset: id,
    kind: def.kind,
    group: def.group,
    canvas: CANVAS,
    designVoxelsPerTileUnit: CANVAS / 64,
    renderScale: k,
    previewScale: PREVIEW_K,
    superSample: ss,
    pxPerVoxel: k / (CANVAS / 64),
    // A full-tile footprint must land on exactly the legacy 64x32 diamond.
    tileDiamond: [64 * (k / RUNTIME_K), 32 * (k / RUNTIME_K)],
    facings: facings.map(f => f.id),
    facingMeta: facings.map(f => {
      const basis = cameraBasis(f.angle, k);
      const G = [CANVAS / 2, CANVAS / 2, 0];
      const p0 = basis.project(G[0], G[1], G[2]);
      // 2x3 row-major: design-voxel offset from the ground centre -> pixels.
      // A segmented part can then be registered by its WORLD pivot instead of
      // by concatenating crop offsets: screenPos = screenMatrix · (pivot - G).
      const col = (dx, dy, dz) => {
        const q = basis.project(G[0] + dx, G[1] + dy, G[2] + dz);
        return [q[0] - p0[0], q[1] - p0[1]];
      };
      const c0 = col(1, 0, 0), c1 = col(0, 1, 0), c2 = col(0, 0, 1);
      return {
        ...f,
        // Index into the 16-unit-camera ring for this scene facing. A turreted
        // building is baked at 4 scene facings but its turret at 16 cameras, so
        // the runtime needs to know which unit index a scene facing corresponds
        // to before it can add a traverse step.
        unitIndex: Math.round((((f.angle % 360) + 360) % 360) / 22.5) % 16,
        viewDir: basis.dHat,
        screenMatrix: [c0[0], c1[0], c2[0], c0[1], c1[1], c2[1]],
        groundCentre: G,
      };
    }),
    teamTint: {
      note: 'Albedo is baked in the standard livery. Recolour pixels whose material map red channel matches these ids to apply an army livery.',
      materialIds: Object.entries(MATERIALS).filter(([, m]) => m.team).map(([name]) => ({ name, id: MATERIAL_IDS[name], role: MATERIALS[name].team })),
      liveries: JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/voxel_pipeline/v3/livery.json'), 'utf8')),
    },
    normalMap: { space: 'view', channelOrder: 'rgb', range: '0..255 maps -1..1', up: '+g means screen up' },
    materialMap: { channelOrder: 'rgba', meaning: ['materialId', 'metalness', 'roughness', 'emissive'], table: materialMapDescriptor() },
    depthMap: {
      note: 'Per-part view depth, one PNG per part per facing. Composite by z-test on this; do NOT try to order segments by a single depth per part.',
      channelOrder: 'rgba',
      meaning: ['depthHi', 'depthLo', 'unused', 'covered'],
      encoding: 'q = depthHi * 256 + depthLo; depth = q / scale - bias  (tile units = design voxels / 8)',
      scale: DEPTH_SCALE,
      bias: DEPTH_BIAS,
      coveredAlpha: 255,
      largerIsCloser: true,
    },
    parts: {},
    clips: { idle: 1 },
    sourceGeometry: {
      parts: geom.parts.map(p => ({
        name: p.name,
        dynamic: p.dynamic,
        traverse: traversing.has(p.name),
        parent: p.parent ?? null,
        voxels: p.voxels.length,
        pivotDesign: p.pivot,
        bounds: p.bounds,
      })),
      totalVoxels: geom.totalVoxels,
    },
  };

  // Pass 1: render every part at every facing, write the per-part sheets.
  // Renders are kept in memory only for the composite pass below (few MB).
  //
  // Camera sets differ per part:
  //
  //   * a **unit** turns as a whole, so every part shares the 16 unit cameras —
  //     the sprite photographed from another azimuth *is* the same part yawed,
  //     which is what makes runtime traverse possible without re-rendering;
  //   * a **building** body only ever has its 4 cardinal cameras, but a turret
  //     on that building still has to swing through 16 steps, so the turret and
  //     everything mounted on it are baked at the 16 unit cameras instead.
  const unitFacingAt = angle => UNIT_FACINGS[
    Math.round((((angle % 360) + 360) % 360) / 22.5) % 16];

  const byFacing = facings.map(() => []);
  for (const part of geom.parts) {
    const partFacings = (def.kind === 'unit' || !traversing.has(part.name))
      ? facings : UNIT_FACINGS;
    const entry = {
      name: part.name,
      dynamic: part.dynamic,
      // Mounted-on part: the runtime rotates this part's pivot about the
      // parent's pivot when the parent traverses.
      parent: part.parent ?? null,
      pivotDesign: part.pivot,
      traverse: traversing.has(part.name),
      // Which camera ring this part was baked on, and the order of its facings.
      facingSet: partFacings === UNIT_FACINGS ? 'unit' : 'scene',
      facingOrder: partFacings.map(f => f.id),
      facings: {},
    };
    const centroid = [
      (part.bounds.minX + part.bounds.maxX) / 2,
      (part.bounds.minY + part.bounds.maxY) / 2,
      (part.bounds.minZ + part.bounds.maxZ) / 2,
    ];
    const cache = new Map();
    partFacings.forEach(facing => {
      const basis = cameraBasis(facing.angle, k);
      const rendered = renderPart(part.voxels, { basis, palette, superSample: ss, occluders });
      if (!rendered) throw new Error(`${id}/${part.name}/${facing.id}: empty render`);
      const ax = basis.project(CANVAS / 2, CANVAS / 2, 0);
      const anchor = [ax[0] - rendered.origin[0], ax[1] - rendered.origin[1]];
      const pivotScreen = basis.project(part.pivot[0], part.pivot[1], part.pivot[2] ?? 0);
      const pivotPx = [pivotScreen[0] - rendered.origin[0], pivotScreen[1] - rendered.origin[1]];
      const files = {};
      for (const map of ['albedo', 'normal', 'material']) {
        const name = partFileName(id, part.name, facing.id, map);
        const blob = pngBytes(rendered.w, rendered.h, Buffer.from(rendered[map].buffer));
        fs.writeFileSync(path.join(sheetDir, name), blob);
        files[map] = { file: `sheets/${name}`, w: rendered.w, h: rendered.h, sha256: sha256(blob) };
      }
      // Depth sheet: what the compositor z-tests on. See depth-map.mjs — one
      // depth per part was never enough to order segments across 16 facings.
      {
        const name = partFileName(id, part.name, facing.id, 'depth');
        const px = Buffer.alloc(rendered.w * rendered.h * 4);
        for (let i = 0; i < rendered.w * rendered.h; i++) {
          if (rendered.albedo[i * 4 + 3] === 0) continue;      // uncovered: A stays 0
          const q = encodeDepth(rendered.depth[i]);
          px[i * 4] = q >> 8;
          px[i * 4 + 1] = q & 255;
          px[i * 4 + 2] = 0;
          px[i * 4 + 3] = 255;
        }
        const blob = pngBytes(rendered.w, rendered.h, px);
        fs.writeFileSync(path.join(sheetDir, name), blob);
        files.depth = { file: `sheets/${name}`, w: rendered.w, h: rendered.h, sha256: sha256(blob) };
      }
      // Review sheet: same part, same camera, `hiK` times the detail. Anchors and
      // pivots are re-derived from THIS render, because a pivot is a pixel
      // coordinate and hi pixels are a different unit to runtime pixels.
      let filesHi = null;
      if (hiK) {
        const hiBasis = cameraBasis(facing.angle, hiK);
        const hi = renderPart(part.voxels, { basis: hiBasis, palette, superSample: ss, occluders });
        // Every screen quantity is re-projected at the hi scale: `ax` above is in
        // runtime pixels, and mixing the two units silently offsets the part.
        const hiPivot = hiBasis.project(part.pivot[0], part.pivot[1], part.pivot[2] ?? 0);
        const hiAx = hiBasis.project(CANVAS / 2, CANVAS / 2, 0);
        filesHi = {};
        const hiFiles = {};
        for (const map of ['albedo', 'normal', 'material']) {
          const name = `${id}__${part.name}__${facing.id}__${map}@${hiK}x.png`;
          const blob = pngBytes(hi.w, hi.h, Buffer.from(hi[map].buffer));
          fs.writeFileSync(path.join(hiSheetDir, name), blob);
          hiFiles[map] = { file: `sheets-hi/${name}`, w: hi.w, h: hi.h, sha256: sha256(blob) };
        }
        filesHi = {
          w: hi.w,
          h: hi.h,
          // Screen position of the part pivot inside its own crop, in hi pixels.
          pivot: [round2(hiPivot[0] - hi.origin[0]), round2(hiPivot[1] - hi.origin[1])],
          anchor: [round2(hiAx[0] - hi.origin[0]), round2(hiAx[1] - hi.origin[1])],
          files: hiFiles,
        };
      }

      const depth = basis.depth(centroid[0], centroid[1], centroid[2]);
      entry.facings[facing.id] = {
        anchor: [round2(anchor[0]), round2(anchor[1])],
        pivot: [round2(pivotPx[0]), round2(pivotPx[1])],
        // Painter order for segmented composition: parts with a smaller
        // view-space depth draw first. Runtimes should sort on this rather than
        // guessing from the part name.
        depth: round2(depth),
        w: rendered.w,
        h: rendered.h,
        files,
        ...(filesHi ? { filesHi } : {}),
      };
      cache.set(facing.id, {
        name: part.name,
        albedo: rendered.albedo,
        normal: rendered.normal,
        material: rendered.material,
        depthBuf: rendered.depth,
        w: rendered.w,
        h: rendered.h,
        anchor,
        depth,
      });
    });
    // The composite for a scene facing uses each part exactly as that camera
    // saw it: the scene facing itself for a scene-baked part, the unit facing at
    // the same angle for a part baked on the unit ring.
    facings.forEach((facing, fi) => {
      const rec = cache.get(facing.id) ?? cache.get(unitFacingAt(facing.angle).id);
      if (!rec) throw new Error(`${id}/${part.name}: no render for scene facing ${facing.id}`);
      byFacing[fi].push(rec);
    });
    manifest.parts[part.name] = entry;
  }

  // Pass 2: one composite per facing, built with exactly the anchor maths a
  // runtime performs. If this ever disagrees with preview.png an anchor is
  // wrong, which is precisely the failure this artifact exists to catch.
  const facingComposite = {};
  const facingLit = {};
  facings.forEach((facing, fi) => {
    const maps = {};
    for (const key of ['albedo', 'normal', 'material']) {
      const comp = compositePreview(byFacing[fi], 2, key);
      maps[key] = comp;
      const name = `${id}__composite__${facing.id}__${key}.png`;
      const blob = pngBytes(comp.w, comp.h, comp.buf);
      fs.writeFileSync(path.join(sheetDir, name), blob);
      facingComposite[facing.id] ??= { w: comp.w, h: comp.h, files: {} };
      facingComposite[facing.id].files[key] = { file: `sheets/${name}`, sha256: sha256(blob) };
    }
    // Relight from the composited normal + material maps, not from the
    // pre-lit albedo, so this image is an actual test of those maps.
    const lit = relight(
      new Uint8ClampedArray(maps.albedo.buf),
      new Uint8ClampedArray(maps.normal.buf),
      new Uint8ClampedArray(maps.material.buf),
      defaultRig(),
    );
    const litName = `${id}__lit__${facing.id}__albedo.png`;
    const litBlob = pngBytes(maps.albedo.w, maps.albedo.h, Buffer.from(lit.buffer));
    fs.writeFileSync(path.join(sheetDir, litName), litBlob);
    facingLit[facing.id] = { file: `sheets/${litName}`, w: maps.albedo.w, h: maps.albedo.h,
      sha256: sha256(litBlob) };
  });
  manifest.composite = {
    note: 'every part of one facing pre-composited through the shared ground anchor',
    facings: facingComposite,
  };
  manifest.lit = {
    note: 'the composite re-shaded through a virtual three-point rig using the normal and '
      + 'material maps (key/fill/rim). If normals or PBR channels are wrong, this is where it shows.',
    rig: 'three-point',
    facings: facingLit,
  };

  // ---- review pass -------------------------------------------------------
  // The sheets above are runtime scale. For human inspection the preview facing
  // is rendered again at PREVIEW_K: geometry detail is only judgeable at a scale
  // where one voxel is a visible fraction of a pixel.
  const previewFixture = facings.findIndex(f => f.id === PREVIEW_FACING);
  const previewAngled = facings[previewFixture];
  const previewBasis = cameraBasis(previewAngled.angle, PREVIEW_K);
  const whole = renderWhole(geom.parts, { basis: previewBasis, palette, superSample: ss, occluders });
  fs.writeFileSync(path.join(assetDir, 'preview.png'),
    pngBytes(whole.w, whole.h, Buffer.from(whole.albedo.buffer)));

  const pv = geom.parts.map(part => {
    const basis = cameraBasis(previewAngled.angle, PREVIEW_K);
    const rendered = renderPart(part.voxels, { basis, palette, superSample: ss, occluders });
    const ax = basis.project(CANVAS / 2, CANVAS / 2, 0);
    const c = part.bounds;
    return {
      name: part.name,
      albedo: rendered.albedo,
      normal: rendered.normal,
      material: rendered.material,
      w: rendered.w,
      h: rendered.h,
      anchor: [ax[0] - rendered.origin[0], ax[1] - rendered.origin[1]],
      depth: basis.depth((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, (c.minZ + c.maxZ) / 2),
    };
  });

  const pvAlbedo = compositePreview(pv, 2, 'albedo');
  const pvNormal = compositePreview(pv, 2, 'normal');
  const pvMaterial = compositePreview(pv, 2, 'material');
  const A = new Uint8ClampedArray(pvAlbedo.buf);
  const N = new Uint8ClampedArray(pvNormal.buf);
  const M = new Uint8ClampedArray(pvMaterial.buf);
  const panel = data => ({ w: pvAlbedo.w, h: pvAlbedo.h, data });

  // (a) full three-point rig
  fs.writeFileSync(path.join(assetDir, 'preview-lit.png'),
    pngBytes(pvAlbedo.w, pvAlbedo.h, Buffer.from(relight(A, N, M, defaultRig()).buffer)));

  // (b) light-direction sweep: eight azimuths, one light each. Normals that are
  // wrong (flipped axis, zeroed, or aliased across facings) cannot survive this.
  const sweep = [];
  for (let i = 0; i < 8; i++) {
    const az = i * 45;
    sweep.push(panel(relight(A, N, M, singleLight(az, 40))));
  }
  const sweepTiled = tilePanels(sweep);
  fs.writeFileSync(path.join(assetDir, 'preview-lights.png'),
    pngBytes(sweepTiled.w, sweepTiled.h, Buffer.from(sweepTiled.data.buffer)));

  // (c) map inspection: albedo | normal | material id | metalness | roughness | emissive
  const mapPanels = tilePanels([
    panel(A),
    panel(normalView(N, pvNormal.coverage)),
    panel(materialIdView(M, pvMaterial.coverage)),
    panel(channelView(M, 'metalness', pvMaterial.coverage)),
    panel(channelView(M, 'roughness', pvMaterial.coverage)),
    panel(channelView(M, 'emissive', pvMaterial.coverage)),
  ]);
  fs.writeFileSync(path.join(assetDir, 'preview-maps.png'),
    pngBytes(mapPanels.w, mapPanels.h, Buffer.from(mapPanels.data.buffer)));

  manifest.previewLit = { file: 'preview-lit.png', facing: PREVIEW_FACING, rig: 'three-point',
    note: 'relit from the normal + material maps' };
  manifest.previewLights = { file: 'preview-lights.png', facing: PREVIEW_FACING,
    order: Array.from({ length: 8 }, (_, i) => `azimuth ${i * 45}deg / elevation 40deg`),
    note: 'one virtual light per panel, proving the normal map is directionally correct' };
  manifest.previewMaps = { file: 'preview-maps.png', facing: PREVIEW_FACING,
    panels: ['albedo', 'normal', 'material-id', 'metalness', 'roughness', 'emissive'] };

  const composite = compositePreview(pv, 2, 'albedo');
  fs.writeFileSync(path.join(assetDir, 'preview-parts.png'),
    pngBytes(composite.w, composite.h, composite.buf));

  manifest.preview = { file: 'preview.png', facing: PREVIEW_FACING, w: whole.w, h: whole.h, mode: 'single-pass' };
  manifest.previewParts = { file: 'preview-parts.png', facing: PREVIEW_FACING, w: composite.w,
    h: composite.h, mode: 'composited-from-part-sheets' };
  fs.writeFileSync(path.join(assetDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const fileCount = Object.values(manifest.parts)
    .reduce((s, p) => s + Object.keys(p.facings).length * 3, 0);
  const bytes = Object.values(manifest.parts).reduce((s, p) => s
    + Object.values(p.facings).reduce((t, f) => t + ['albedo', 'normal', 'material']
      .reduce((u, m) => u + fs.statSync(path.join(assetDir, f.files[m].file)).size, 0), 0), 0);
  return { manifest, assetDir, fileCount, bytes, voxels: geom.totalVoxels };
}

const round2 = v => Math.round(v * 100) / 100;

/** Top-level index so tools and the game can enumerate every baked asset. */
export function writeIndex(outRoot = ROOT) {
  const index = { format: 'field-command-voxel-index-4', canvas: CANVAS, generatedBy: 'tools/voxel_pipeline/v3/bake.mjs', units: {}, buildings: {} };
  for (const [id, def] of Object.entries(MODELS)) {
    const dir = path.join(outRoot, 'game_assets', def.folder, id, 'manifest.json');
    if (!fs.existsSync(dir)) continue;
    const m = JSON.parse(fs.readFileSync(dir, 'utf8'));
    const bucket = def.kind === 'unit' ? index.units : index.buildings;
    bucket[id] = {
      folder: `game_assets/${def.folder}/${id}`,
      manifest: `game_assets/${def.folder}/${id}/manifest.json`,
      preview: `game_assets/${def.folder}/${id}/preview.png`,
      group: def.group,
      parts: Object.keys(m.parts),
      facings: m.facings,
    };
  }
  fs.writeFileSync(path.join(outRoot, 'game_assets', 'voxel-index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : fallback;
  };
  if (process.argv.includes('--list')) {
    for (const [id, def] of Object.entries(MODELS)) console.log(`${id} ${def.kind}`);
    process.exit(0);
  }
  if (process.argv.includes('--index-only')) {
    const index = writeIndex();
    console.log(`Index rewritten: ${Object.keys(index.units).length} units, ${Object.keys(index.buildings).length} buildings`);
    process.exit(0);
  }
  const onlyArg = arg('--only', null);
  const only = onlyArg ? onlyArg.split(',').map(s => s.trim()).filter(Boolean) : null;
  const k = Number(arg('--k', DEFAULTS.k));
  const ss = Number(arg('--ss', DEFAULTS.ss));
  // Review sheet set. Off by default (`--sheet-k 0`): it roughly quadruples the
  // bytes on disk and only the review gallery reads it.
  const sheetK = Number(arg('--sheet-k', SHEET_K_DEFAULT));
  const ids = only ?? Object.keys(MODELS);
  const t0 = Date.now();
  let files = 0, bytes = 0, voxels = 0;
  for (const id of ids) {
    const def = MODELS[id];
    if (!def) { console.error(`unknown asset "${id}"`); process.exitCode = 1; continue; }
    const r = bakeAsset(id, def, { k, ss, sheetK });
    files += r.fileCount; bytes += r.bytes; voxels += r.voxels;
    console.log(`  ${id.padEnd(22)} ${String(r.voxels).padStart(8)} voxels  `
      + `${String(r.fileCount).padStart(4)} png  ${(r.bytes / 1048576).toFixed(2)} MB`);
  }
  const index = writeIndex();
  console.log(`Baked ${ids.length} assets → ${files} PNG (${(bytes / 1048576).toFixed(1)} MB) `
    + `from ${voxels.toLocaleString()} voxels in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Index: game_assets/voxel-index.json (${Object.keys(index.units).length} units, `
    + `${Object.keys(index.buildings).length} buildings)`);
}
