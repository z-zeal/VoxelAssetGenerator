/**
 * Wheeled-vehicle sub-assemblies.
 *
 * The tracked kit is built around one rule — a road wheel is *inboard* of the
 * track, so the band paints over it and the wheel only reads through the loop's
 * opening. Every wheeled vehicle needs the exact opposite: the tyre IS the
 * silhouette. So this kit is deliberately separate rather than a flag on
 * `trackGear()`, and it differs in three ways:
 *
 *   * **tyres are outboard and fully exposed** — carcass, tread lugs and a hub
 *     face you can see from the side;
 *   * **the hull stops at a sill line above the wheel tops**, with a narrower
 *     chassis between the wheels, so arches appear without any boolean cutting;
 *   * **mudguards arc over each wheel**, which is what stops a wheeled hull from
 *     reading as a tracked one with the tracks removed.
 *
 * Frame: +X forward, Y lateral (256 = centre line), Z up (0 = ground).
 */

/** Outboard direction for a side: the left flank is towards -Y, the right +Y. */
const outward = (side) => (side === 'L' ? -1 : 1);

/**
 * One road wheel.
 *
 * `y0`/`y1` are the tyre's lateral faces in either order; `out` says which side
 * is the outer face so the rim and hub land on the visible side. Always pass the
 * *outer* value in `out`'s direction — a hub on the inboard face is invisible
 * from every one of the 16 facings and wastes voxels.
 */
export function tyre(c, { x, y0, y1, r, out = 1, part = 'wheels.L' }) {
  const a0 = Math.min(y0, y1);
  const a1 = Math.max(y0, y1);
  const z = r;                                  // sits on the ground
  c.part(part);

  // Carcass, then a slightly narrower shoulder band, so the tread stands proud.
  c.cylY(x, a0, a1, z, r, 'tyre');
  c.cylY(x, a0 + 1, a1 - 1, z, r - 3, 'tyre');

  // Tread lugs: blocks round the circumference at full radius. A bare cylinder
  // at this scale is a smooth grey disc; the lugs are what say "tyre".
  const n = Math.max(14, Math.round((2 * Math.PI * r) / 11));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tx = Math.round(x + Math.cos(a) * (r - 2));
    const tz = Math.round(z + Math.sin(a) * (r - 2));
    c.box(tx - 2, a0, tz - 2, tx + 2, a1, tz + 2, 'track.worn');
  }

  // Rim and hub, on the outboard face only.
  const yo = out > 0 ? a1 : a0;
  const yi = yo - out * 4;
  c.cylY(x, Math.min(yo, yi), Math.max(yo, yi), z, r * 0.62, 'steel.dark');
  c.cylY(x, Math.min(yo, yo + out), Math.max(yo, yo + out), z, r * 0.34, 'steel');
  c.cylY(x, Math.min(yo, yo + out * 2), Math.max(yo, yo + out * 2), z, r * 0.16, 'steel.bright');
  c.bolts(x, yo + out, z, r * 0.44, 6, 'steel.dark', 2);

  c.part('body');
  return c;
}

/**
 * One side's axle set: wheels, mudguards and the axle shafts back to the chassis.
 *
 * `innerY` is where the shaft should meet the chassis; it defaults to a little
 * inboard of the tyre so the shaft is never left floating.
 */
export function axleGear(c, {
  side,
  axles = [],
  y0, y1,
  r = 44,
  innerY,
  part = `wheels.${side}`,
  guard = true,
  shaftZ = null,
}) {
  const out = outward(side);
  const a0 = Math.min(y0, y1);
  const a1 = Math.max(y0, y1);
  const yIn = innerY ?? (side === 'L' ? a1 : a0);

  for (const x of axles) {
    tyre(c, { x, y0: a0, y1: a1, r, out, part });
    // Axle shaft + a differential hump where it meets the chassis.
    const sy = Math.min(yIn, yIn + out * 26);
    const ey = Math.max(yIn, yIn + out * 26);
    c.part(part);
    c.box(x - 4, sy, (shaftZ ?? r) - 4, x + 4, ey, (shaftZ ?? r) + 4, 'steel.dark');
    c.part('body');
  }

  if (guard) mudguards(c, { side, axles, y0: a0, y1: a1, r, innerY: yIn });
  return c;
}

/**
 * Arched mudguard over each wheel.
 *
 * Built as an arc of slabs whose height follows the circle, not as a straight
 * box: a flat fender over a round wheel is the single most common way a voxel
 * truck ends up looking like a lorry with square arches.
 */
export function mudguards(c, { side, axles, y0, y1, r, innerY, mat = 'team.dark', thickness = 7 }) {
  const a0 = Math.min(y0, y1);
  const a1 = Math.max(y0, y1);
  c.part('body');
  for (const x of axles) {
    for (let i = -4; i <= 4; i++) {
      const dx = i * Math.round((r + 12) / 5);
      const dz = Math.round(Math.sqrt(Math.max(0, (r + 8) ** 2 - dx * dx)));
      const z0 = r + dz - 2;
      c.box(x + dx - 6, a0, z0, x + dx + 6, a1, z0 + thickness, mat);
    }
    // Fender stay back to the chassis, so the guard is carried, not floating.
    const sy = Math.min(innerY, innerY + (a0 < a1 ? 0 : 0));
    c.box(x - 2, Math.min(sy, a1), r + 6, x + 2, Math.max(sy, a1), r + 14, 'steel.dark');
  }
  return c;
}

/**
 * Hull for a wheeled vehicle.
 *
 * `sillZ` is the bottom of the body proper — set it just above the wheel tops
 * and the arches take care of themselves. Below it only the narrower chassis
 * exists, so from the side the wheels stand clear of the hull instead of being
 * embedded in it.
 */
export function wheeledHull(c, {
  x0, x1,
  halfW,
  chassisHalf = halfW - 34,
  bellyZ = 26,
  sillZ = 88,
  deckZ = 150,
  bevel = 3,
  bevelH = 46,
  glacis = null,          // { run, noseZ } swept bonnet
  mat = 'team.hull',
  deckMat = 'team.light',
  tail = true,
}) {
  const cy = 256;
  c.part('body');

  // Chassis rails and the belly pan: narrower than the wheels are wide, which is
  // what makes the wheel arch read as an arch.
  c.box(x0 + 10, cy - chassisHalf, bellyZ, x1 - 14, cy + chassisHalf, sillZ + 6, 'plate.dark');
  c.box(x0 + 16, cy - chassisHalf + 8, bellyZ - 6, x1 - 20, cy + chassisHalf - 8, bellyZ + 6, 'iron');

  // Body above the sill, chamfered towards the deck.
  const stepH = Math.max(6, Math.round(bevelH / bevel));
  const z0 = Math.max(sillZ, deckZ - bevel * stepH);
  for (let i = 0; i < bevel; i++) {
    const inset = i * 4;
    c.box(x0, cy - halfW + inset, z0 + i * stepH, x1, cy + halfW - inset, deckZ, mat);
  }
  c.box(x0 + 6, cy - halfW + (bevel - 1) * 4, deckZ - 4, x1 - 6, cy + halfW - (bevel - 1) * 4, deckZ, deckMat);

  // Bonnet: a swept nose from deck height down to the grille.
  if (glacis) {
    const gx0 = x1, gx1 = x1 + (glacis.run ?? 40);
    c.profileX(gx0, gx1, cy - halfW + 8, cy + halfW - 8,
      x => deckZ - ((x - gx0) / (gx1 - gx0)) * (deckZ - glacis.noseZ),
      () => Math.max(sillZ, glacis.noseZ - 26),
      mat);
    // Deck-coloured skin along the top of the swept nose.
    //
    // Written as explicit voxels, not as `c.paint(predicate)`: a predicate on
    // (x, z) alone also matches everything *above* the bonnet — cab, windscreen,
    // mirrors — and a deferred paint silently overwrites it all at finish time.
    // That cost five vehicles their glazing, so the paint pass is gone.
    for (let x = gx0; x < gx1; x++) {
      const zTop = Math.round(deckZ - ((x - gx0) / (gx1 - gx0)) * (deckZ - glacis.noseZ));
      c.box(x, cy - halfW + 8, zTop - 6, x + 1, cy + halfW - 8, zTop, deckMat);
    }
    // Grille face.
    c.box(gx1 - 4, cy - halfW + 14, Math.max(sillZ, glacis.noseZ - 24), gx1, cy + halfW - 14,
      Math.max(sillZ, glacis.noseZ - 12), 'steel.dark');
  }

  if (tail) {
    c.box(x0 - 8, cy - halfW + 10, sillZ - 10, x0 + 2, cy + halfW - 10, deckZ - 8, 'team.dark');
    c.box(x0 - 10, cy - 22, sillZ - 4, x0 - 4, cy + 22, sillZ + 12, 'steel.dark');
  }
  return c;
}

/**
 * Bumper bar across the nose, with lamps and tow lugs. Reads as a road vehicle
 * at a glance and gives the front facing something to catch the light.
 */
export function bumper(c, { x, halfW = 110, z = 92, mat = 'steel.dark' }) {
  c.part('body');
  c.box(x, 256 - halfW, z, x + 8, 256 + halfW, z + 14, mat);
  c.box(x + 8, 256 - halfW + 10, z + 2, x + 10, 256 + halfW - 10, z + 12, 'steel');
  for (const s of [-1, 1]) {
    c.box(x - 2, 256 + s * (halfW - 12), z - 6, x + 10, 256 + s * (halfW - 2), z + 20, 'steel.dark');
    c.cylX(x + 4, x + 12, 256 + s * (halfW - 30), z + 26, 10, 'steel.dark');
    c.cylX(x + 12, x + 14, 256 + s * (halfW - 30), z + 26, 7, 'lamp.warm');
  }
  return c;
}

/**
 * Windscreen: a raked glass panel with a frame, drawn as horizontal strips whose
 * reach shrinks with height. A single vertical glass box reads as a hole.
 *
 * The default is `solar`, not `glass`. Every `glass` material is dithered to
 * stand in for transparency, and at sprite scale — especially on a panel this
 * large — the dither reads as wire mesh, not as a window. A solid dark tint with
 * a bright reflection streak is what actually says "glazed" at 64 pixels.
 */
export function windscreen(c, { x, y0, y1, z0, z1, rake = 6, mat = 'solar' }) {
  c.part('body');
  const h = Math.max(1, z1 - z0);
  // Bottom edge furthest forward, top edge flush with the cab face: the screen
  // leans back as it rises. The previous version stepped the other way, which
  // built a forward-leaning visor.
  const step = (i) => Math.round(rake * (1 - i / Math.max(1, h - 1)));
  for (let i = 0; i < h; i++) {
    const k = step(i);
    c.box(x + k, y0, z0 + i, x + k + 3, y1, z0 + i + 1, mat);
  }
  // Reflection streak across the upper glass, so the pane is not a flat slab.
  for (let i = Math.round(h * 0.55); i < Math.round(h * 0.8); i++) {
    const k = step(i);
    const ya = y0 + Math.round((y1 - y0) * 0.12);
    const yb = y0 + Math.round((y1 - y0) * 0.46);
    c.box(x + k + 1, ya, z0 + i, x + k + 4, yb, z0 + i + 1, 'steel.bright');
  }
  // Frame: pillars that follow the rake, a header rail and a sill.
  for (const y of [y0 - 3, y1]) {
    for (let i = 0; i < h; i++) {
      const k = step(i);
      c.box(x + k, y, z0 + i, x + k + 3, y + 3, z0 + i + 1, 'steel.dark');
    }
  }
  c.box(x - 1, y0 - 4, z1, x + 4, y1 + 4, z1 + 3, 'steel.dark');
  c.box(x + rake - 1, y0 - 4, z0 - 3, x + rake + 4, y1 + 4, z0, 'steel.dark');
  return c;
}
