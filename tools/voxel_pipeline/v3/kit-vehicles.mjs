/**
 * Tracked-vehicle sub-assemblies.
 *
 * Extracted from the tank pilot so the whole tracked family (B4a) shares one
 * running gear and one hull, and so a fix here lands on every vehicle at once.
 * The two defects the tank pilot shipped with are structurally impossible with
 * these builders:
 *
 *   * **road wheels proud of the track** — a wheel is always placed *inboard* of
 *     the band's outer face (`WHEEL_INSET`), so the track ribbon paints over it
 *     wherever the two overlap and the wheel only reads through the loop's
 *     opening. That is what "tucked behind the track" means geometrically.
 *   * **slab-sided hull** — `trackedHull()` bevels the sponson in three steps
 *     instead of extruding one vertical wall from belly to deck.
 *
 * Frame: +X forward, Y lateral (256 = centre line), Z up (0 = ground).
 */
import { roadWheel, suspensionArm, trackLoop, louvres, crate } from './kit.mjs';

/** How far inboard of the band's outer face a wheel face sits, in voxels. */
export const WHEEL_INSET = 3;

/**
 * One track run with its wheels, sprocket, idler, return rollers and fender.
 *
 * `y0`/`y1` are the band's lateral extents; the outboard face is `y0` for the
 * left track and `y1` for the right. Everything else is longitudinal.
 */
export function trackGear(c, {
  side,
  x0, x1,
  y0, y1,
  z0 = 0, z1 = 126,
  wheels, wheelR = 42, wheelZ,
  sprocketX, sprocketR = 46,
  idlerX, idlerR = 44,
  rollers = [], rollerZ, rollerR = 15,
  linkWidth = 9,
  skirt = false,
  part = `running.${side}`,
}) {
  const left = side === 'L';
  const out = left ? y0 : y1;                 // band's outer face
  const dir = left ? 1 : -1;                  // inboard direction
  const w0 = out + dir * WHEEL_INSET;         // wheel face
  const w1 = out + dir * (WHEEL_INSET + 8);   // wheel back
  const at = (d) => out + dir * d;

  c.part(part);
  trackLoop(c, { x0, x1, y0, y1, z0, z1, part, linkWidth });

  const cz = wheelZ ?? (z0 + z1) / 2;
  for (const x of wheels ?? []) {
    roadWheel(c, { x, y0: w0, y1: w1, z: cz, r: wheelR, part });
    suspensionArm(c, { x, z: cz - wheelR + 6, y0: y0 + 20, y1: y1 - 20, part });
  }

  if (sprocketX !== undefined) {
    c.cylY(sprocketX, w0, w1, cz, sprocketR, 'steel.dark', { hollowR: sprocketR * 0.62 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tx = Math.round(sprocketX + Math.cos(a) * sprocketR);
      const tz = Math.round(cz + Math.sin(a) * sprocketR);
      c.box(tx - 3, Math.min(w0, w1), tz - 3, tx + 3, Math.max(w0, w1), tz + 3, 'steel');
    }
    c.cylY(sprocketX, at(0), at(1), cz, sprocketR * 0.38, 'steel.bright');
  }
  if (idlerX !== undefined) {
    c.cylY(idlerX, w0, w1, cz, idlerR, 'steel.dark', { hollowR: idlerR * 0.6 });
    c.bolts(idlerX, at(0.5), cz, idlerR * 0.42, 10, 'steel', 2);
  }
  for (const x of rollers) {
    c.cylY(x, w0, at(2), rollerZ ?? z1 - 8, rollerR, 'steel.dark');
    c.cylY(x, at(2), at(1) , rollerZ ?? z1 - 8, rollerR * 0.5, 'steel.bright');
  }

  // Fender line over the track, plus the skirt that hides the top of the run.
  c.box(x0 - 4, left ? y0 - 6 : y0, z1 + 6, x1 + 4, left ? y1 : y1 + 6, z1 + 14, 'plate');
  c.rivets(x0, left ? y0 - 5 : y0 + 1, z1 + 14, x1, left ? y0 - 5 : y0 + 1, z1 + 14, 10, 'steel.dark');
  if (skirt) {
    c.box(x0 + 10, left ? y0 - 5 : y1, z1 - 10, x1 - 20, left ? y0 - 1 : y1 + 5, z1 + 6, 'team.dark');
    for (let x = x0 + 24; x < x1 - 24; x += 26) {
      c.box(x, left ? y0 - 6 : y1 + 1, z1 - 8, x + 1, left ? y0 - 4 : y1 + 3, z1 + 4, 'team.light');
    }
  }
  c.part('body');
}

/**
 * Hull: belly, lower sides, bevelled sponsons, deck, tail plate.
 *
 * The bevel is the whole point — a single box from belly to deck is what made
 * the pilot read as a slab. Three inward steps over the top `bevel` voxels give
 * the sponson a chamfer that catches the light at every facing.
 */
export function trackedHull(c, {
  x0, x1,                 // hull longitudinal extents (lower hull inset by 8)
  halfW,                  // half width of the sponson at the deck
  lowerHalf = halfW - 40, // half width of the lower hull (between the tracks)
  bellyZ = 26,
  deckZ = 146,
  bevel = 3,              // number of chamfer steps on the sponson
  bevelH = 54,            // how far down from the deck the chamfer runs
  glacis = null,          // {x1, noseZ} swept front slope from deckZ to noseZ
  mat = 'team.hull',
  deckMat = 'team.light',
  tail = true,
  nose = true,
}) {
  const cy = 256;
  c.part('body');
  // Belly pan and lower sides.
  c.box(x0 + 8, cy - lowerHalf - 8, bellyZ, x1 - 12, cy + lowerHalf + 8, bellyZ + 18, 'plate.dark');
  c.box(x0 + 4, cy - lowerHalf, bellyZ + 18, x1 - 8, cy + lowerHalf, deckZ - 46, 'team.dark');

  // Sponson with a stepped chamfer: each slab reaches the deck but is narrower
  // than the one below it, so the union is a stair-stepped chamfer rather than
  // one vertical wall.
  const stepH = Math.max(6, Math.round(bevelH / bevel));
  const z0 = deckZ - bevel * stepH;
  for (let i = 0; i < bevel; i++) {
    const inset = i * 4;
    c.box(x0, cy - halfW + inset, z0 + i * stepH, x1, cy + halfW - inset, deckZ, mat);
  }
  // Deck plate, painted rather than stacked a second time.
  c.box(x0 + 8, cy - halfW + (bevel - 1) * 4, deckZ - 4, x1 - 6, cy + halfW - (bevel - 1) * 4, deckZ, deckMat);

  // Glacis: swept nose from deck height down to the nose beam.
  if (glacis) {
    const gx0 = x1, gx1 = x1 + (glacis.run ?? 56);
    c.profileX(gx0, gx1, cy - halfW + 10, cy + halfW - 10,
      x => deckZ - ((x - gx0) / (gx1 - gx0)) * (deckZ - glacis.noseZ),
      () => glacis.noseZ - 18,
      mat);
    c.paint((x, y, z) => x >= gx0 && x < gx1 && z >= deckZ - 10, deckMat);
  }

  if (nose) {
    c.box(x1 + ((glacis?.run) ?? 56) - 4, cy - lowerHalf + 4, (glacis?.noseZ ?? deckZ) - 24,
      x1 + ((glacis?.run) ?? 56) + 4, cy + lowerHalf - 4, (glacis?.noseZ ?? deckZ) - 12, 'steel.dark');
  }
  if (tail) {
    c.box(x0 - 12, cy - lowerHalf + 8, bellyZ, x0 + 2, cy + lowerHalf - 8, deckZ - 6, 'team.dark');
    c.box(x0 - 14, cy - 24, bellyZ + 12, x0 - 6, cy + 24, bellyZ + 30, 'steel.dark');
  }
  // Panel seams and rivet lines on the bevelled sponson.
  for (const s of [-1, 1]) {
    const yy = cy + s * (halfW - (bevel - 1) * 4) - s * 1;
    c.rivets(x0 + 12, yy, deckZ - 8, x1 - 12, yy, deckZ - 8, 16, 'steel.dark');
  }
  return c;
}

/** Engine deck: louvre pair, exhaust, fuel fillers — shared by every vehicle. */
export function engineDeck(c, { x0, x1, deckZ, cy = 256, halfW = 88, exhaustSide = -1 }) {
  c.part('body');
  const y0 = cy - halfW + 8, y1 = cy + halfW - 8;
  louvres(c, { x0, x1, y0, y1: cy - 20, z: deckZ + 4, slat: 5 });
  louvres(c, { x0, x1, y0: cy + 20, y1, z: deckZ + 4, slat: 5 });
  c.box(x0 - 4, cy - 12, deckZ + 2, x1 + 4, cy + 12, deckZ + 8, 'steel.dark');
  c.cylZ(x0 + 8, cy - halfW + 22, deckZ + 4, deckZ + 12, 10, 'brass');
  c.cylZ(x0 + 8, cy + halfW - 22, deckZ + 4, deckZ + 12, 10, 'brass');
  const ey = exhaustSide < 0 ? cy - halfW + 6 : cy + halfW - 6;
  c.box(x0 - 20, ey - 14, deckZ + 2, x0 - 2, ey + 14, deckZ + 22, 'steel.dark');
  c.cylX(x0 - 26, x0 - 18, ey, deckZ + 12, 9, 'rust');
  c.part('body');
}

/**
 * Bolt-on appliqué armour: a plate with a chamfer and bolt row, used to make an
 * APC read as an APC and not as a small tank.
 */
export function applique(c, { x0, x1, y, z0, z1, side, mat = 'plate' }) {
  const s = side === 'L' ? -1 : 1;
  const yOuter = y;
  c.box(x0, yOuter - 6, z0, x1, yOuter + 6, z1, mat);
  c.bolts((x0 + x1) / 2, yOuter + s * 6, z0 + 4, (x1 - x0) / 2 - 8, 6, 'steel.dark', 2);
  return c;
}

/** Stowage rail along a sponson edge, with lashed crates. */
export function stowageRail(c, { x0, x1, y, z, side, crates = 2 }) {
  c.part('body');
  c.box(x0, y - 2, z, x1, y + 2, z + 4, 'steel.dark');
  const span = (x1 - x0) / crates;
  for (let i = 0; i < crates; i++) {
    const cx = x0 + i * span + 6;
    const x1c = cx + span - 12;
    crate(c, { x0: cx, y0: side === 'L' ? y - 22 : y + 2, z0: z + 4,
      x1: x1c, y1: side === 'L' ? y - 2 : y + 22, z1: z + 26,
      mat: i % 2 ? 'canvas' : 'wood', lid: 'steel.dark' });
  }
  c.part('body');
  return c;
}

/**
 * Cast turret shell: an octagonal plan, tapered inward with height.
 *
 * `cylZ` stacks were tried first and read as a cake tin — a turret's plan is a
 * rounded *rectangle*, not a circle, and the flat flanks are what carry the
 * bustle, the smoke banks and the vision blocks. Two overlapping boxes per level
 * give the octagon; each level is inset so the shell slopes.
 */
export function castTurret(c, {
  cx, cy,
  halfX, halfY,
  z0, z1,
  levels = 3,
  taper = 6,
  chamfer = 30,
  part = 'turret',
  mat = 'team.hull',
}) {
  c.part(part);
  const h = z1 - z0;
  for (let i = 0; i < levels; i++) {
    const za = z0 + Math.round((i * h) / levels);
    const zb = z0 + Math.round(((i + 1) * h) / levels);
    const hx = halfX - taper * i;
    const hy = halfY - taper * i;
    const ch = Math.max(8, chamfer - i * 2);
    c.box(cx - hx, cy - (hy - ch), za, cx + hx, cy + (hy - ch), zb, mat);
    c.box(cx - (hx - ch), cy - hy, za, cx + (hx - ch), cy + hy, zb, mat);
  }
  c.part('body');
  return c;
}
