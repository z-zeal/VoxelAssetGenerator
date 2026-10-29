/**
 * Patrol boat — `gunboat`, 16 facings.
 *
 * The smallest warship in the set, and the one whose silhouette has to do the
 * most work: at 8× a patrol boat is a deckhouse, a mast and a gun, sitting on a
 * wedge of hull.
 *
 *   * **a flared bow and a low freeboard** — the hull is short and wide, and the
 *     boot stripe is what stops it reading as a barge;
 *   * **one deckhouse well aft** — a patrol boat's bridge sits back so the
 *     foredeck gun has a clear arc; putting it forward makes a tugboat;
 *   * **a tall mast over a low hull** — the mast is the antenna farm, and it is
 *     the tallest thing on the sprite.
 *
 * Parts: `body`, `gun` (fore turret, traverse), `barrel` (child of the turret,
 * traverse), `launcher` (aft missile rack, dynamic).
 */
import { antenna, hatch, liftingEye } from '../kit.mjs';
import { hull, deckHouse, funnel, mast, gunMount, vls, rail, anchor } from '../kit-naval.mjs';

const DECK = 62;

export function buildGunboat(c) {
  /* ------------------------------------------------------------------ hull */
  c.part('body');
  hull(c, {
    waterline: 30, bootBand: 6,
    stations: [
      [ 52, 16, 30, 54],
      [ 76, 32, 18, 58],
      [120, 40, 12, DECK],
      [200, 42, 10, DECK],
      [300, 40, 10, DECK],
      [356, 32, 14, DECK + 2],
      [392, 20, 22, DECK + 4],
      [416, 8, 32, DECK + 6],
    ],
  });
  // Deck surface and a light line along its edge. `halfWAt` mirrors the station
  // table above, so the deck and the rails follow the hull instead of floating
  // outside it at the bow.
  const halfWAt = (x) => {
    const pts = [[52, 16], [76, 32], [120, 40], [200, 42], [300, 40], [356, 32], [392, 20], [416, 8]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, w0] = pts[i], [x1, w1] = pts[i + 1];
      if (x >= x0 && x <= x1) return Math.round(w0 + (w1 - w0) * ((x - x0) / Math.max(1, x1 - x0)));
    }
    return 8;
  };
  for (let x = 60; x < 414; x++) {
    const w = halfWAt(x);
    c.box(x, 256 - w + 2, DECK - 1, x + 1, 256 + w - 2, DECK, 'steel.dark');
    for (const sgn of [-1, 1]) {
      c.box(x, Math.min(256 + sgn * w, 256 + sgn * (w - 2)), DECK - 2, x + 1,
        Math.max(256 + sgn * w, 256 + sgn * (w - 2)), DECK, 'team.light');
    }
  }
  anchor(c, { x: 396, halfW: 12, z0: 34, z1: 50 });
  rail(c, { x0: 96, x1: 300, halfW: 40, z: DECK });
  rail(c, { x0: 300, x1: 356, halfW: 31, z: DECK });

  /* --------------------------------------------------------- deck furniture */
  deckHouse(c, {
    x0: 236, x1: 316, halfW: 27, z0: DECK, z1: DECK + 34,
    winZ: DECK + 20, taper: 0.18, mat: 'team.light',
  });
  c.box(246, 232, DECK + 34, 300, 280, DECK + 38, 'team.dark');          // bridge roof
  c.box(258, 240, DECK + 38, 288, 272, DECK + 42, 'team.light');         // pilot house
  hatch(c, { cx: 272, cy: 256, z: DECK + 42, r: 8 });
  funnel(c, { x: 214, halfW: 14, len: 22, z0: DECK + 6, z1: DECK + 40, rake: 8 });
  mast(c, { x: 296, z0: DECK + 42, z1: DECK + 96, spread: 14, yards: 2 });
  antenna(c, { x: 288, y: 256, z: DECK + 96, height: 34 });
  c.box(268, 246, DECK + 42, 282, 266, DECK + 50, 'glass.dark');          // radar housing
  liftingEye(c, { x: 200, y: 246, z: DECK });

  /* ------------------------------------------------------------------- gun */
  c.part('gun');
  gunMount(c, { x: 348, z: DECK - 2, r: 15, barrel: 0, dir: 1, part: 'gun' });
  c.pivot('gun', [348, 256, DECK - 2]);
  c.parent('gun', 'body');
  c.dynamic('gun');
  c.traverse('gun');

  c.part('barrel');
  c.cylX(354, 402, 256, DECK + 12, 4, 'steel.dark');
  c.cylX(400, 408, 256, DECK + 12, 5, 'gunmetal');
  c.box(344, 248, DECK + 2, 362, 264, DECK + 12, 'team.hull');
  c.pivot('barrel', [354, 256, DECK + 12]);
  c.parent('barrel', 'gun');
  c.dynamic('barrel');
  c.traverse('barrel');
  c.part('body');

  /* -------------------------------------------------------------- launcher */
  // Aft missile rack: two rows of cells, angled up. It is the one piece of deck
  // furniture that says "modern" rather than "second world war".
  c.part('launcher');
  vls(c, { x0: 118, x1: 186, halfW: 20, z: DECK, cols: 3, rows: 2, part: 'launcher' });
  for (const s of [-1, 1]) {
    c.box(120, 256 + s * 22, DECK + 2, 184, 256 + s * 26, DECK + 16, 'steel.dark');
  }
  c.pivot('launcher', [152, 256, DECK]);
  c.parent('launcher', 'body');
  c.dynamic('launcher');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x9d21, 'steel.dark', { rate: 0.018, only: ['team.light'] });
  c.mottle(0x2b77, ['team.dark', 'team.hull'], 0.016, { only: ['team.hull'] });
  return c;
}
