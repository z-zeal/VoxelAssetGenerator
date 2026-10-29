/**
 * Foot-formation sub-assemblies: a humanoid rig, a quadruped and a walker.
 *
 * Everything else in this pipeline is built from hulls, turrets and running gear.
 * Infantry is the opposite problem: the silhouette is 200 voxels tall and about
 * 60 wide, so there is no room for a hull form to carry the identity. Three
 * things do all the work instead:
 *
 *   1. **proportion** — the figure is posed with real joints (shoulder, elbow,
 *      hip, knee), not stacked boxes, because a straight-legged block reads as a
 *      chess piece at every one of the 16 facings;
 *   2. **headgear and the weapon** — at sprite scale the helmet and the barrel
 *      are the two shapes you can still resolve, so the roster is separated
 *      mostly by those;
 *   3. **the load** — pack, tanks, toolbox, satchel. This is what actually
 *      distinguishes an engineer from a rifleman from a flamethrower at 64 px.
 *
 * Parts: `body` (legs, pelvis, torso, webbing, load, support arm), `head`
 * (pivoted at the neck so it can look independently) and `arm.R` (the aiming arm
 * *with* its weapon, so an aim animation rotates the whole assembly rather than
 * leaving the gun floating).
 *
 * Frame: +X forward, Y lateral (256 = centre line), Z up (0 = ground).
 */

export const CY = 256;

/** Standing proportions. Keep these together: the whole roster is scaled off them. */
export const P = {
  boot: 0,
  bootTop: 16,
  knee: 64,
  thighTop: 104,
  pelvisTop: 126,
  waist: 132,
  chest: 152,
  torsoTop: 178,
  neck: 182,
  headTop: 210,
  shoulderZ: 172,
  shoulderY: 290,
  hipY: 272,
};

/* ------------------------------------------------------------------ body ---- */

/**
 * Legs and boots.
 *
 * `stride` swings one leg forward and the other back; `crouch` bends both at the
 * knee and drops the pelvis. Both are cheap and both beat a symmetric stand,
 * which reads as a toy soldier from the side.
 */
export function legs(c, { stride = 0, crouch = 0, bulk = 0 } = {}) {
  const drop = crouch;
  const legs = [
    { cy: CY - 16, dx: stride },
    { cy: CY + 16, dx: -stride },
  ];
  for (const { cy, dx } of legs) {
    // Boot: long, with a raised heel and a toe cap, because a flat slab foot is
    // invisible from the isometric angle.
    c.box(226 + dx, cy - 13, 0, 276 + dx, cy + 13, 8, 'boot');
    c.box(222 + dx, cy - 12, 0, 232 + dx, cy + 12, 4, 'boot');
    c.box(230 + dx, cy - 14, 8, 272 + dx, cy + 14, 14, 'boot');
    c.box(268 + dx, cy - 10, 8, 276 + dx, cy + 10, 12, 'steel.dark');       // toe cap
    // Shin, with a knee pad over the joint.
    c.box(238 + dx, cy - 11, 14, 260 + dx, cy + 11, 58 - drop, 'team.dark');
    c.box(236 + dx, cy - 13, 54 - drop, 262 + dx, cy + 13, 68 - drop, 'plate.dark');
    // Thigh.
    c.box(234 + dx, cy - 12 - bulk, 66 - drop, 262 + dx, cy + 12 + bulk, 104 - drop, 'team.hull');
    // Boot lace line, so the calf is not one clean column.
    for (let z = 20; z < 48 - drop; z += 8) c.box(236 + dx, cy - 9, z, 240 + dx, cy + 9, z + 2, 'cloth.dark');
  }
  return c;
}

/** Pelvis, belt and torso. `bulk` thickens the chest for armoured units. */
export function torso(c, { drop = 0, bulk = 0 } = {}) {
  const b = bulk;
  c.box(232 - b, 232 - b * 2, 104 - drop, 262 + b, 280 + b * 2, 128 - drop, 'team.hull');   // pelvis
  c.box(230 - b, 230 - b * 2, 120 - drop, 264 + b, 282 + b * 2, 132 - drop, 'webbing');     // belt
  c.box(234, 234, 116 - drop, 240, 278, 126 - drop, 'steel.dark');                          // pouch row
  c.box(250, 234, 116 - drop, 256, 278, 126 - drop, 'steel.dark');

  // Chest: wider at the shoulders than at the waist, which is what stops the
  // torso reading as a crate.
  c.box(230 - b, 234 - b * 2, 130 - drop, 262 + b, 278 + b * 2, 156 - drop, 'team.hull');
  c.box(228 - b, 230 - b * 2, 154 - drop, 262 + b, 282 + b * 2, 178 - drop, 'team.hull');
  c.box(224 - b, 228 - b * 2, 168 - drop, 266 + b, 284 + b * 2, 180 - drop, 'team.dark');    // yoke

  // Webbing across the chest and a chest rig, in the team accent so it reads.
  for (const y of [240, 272]) {
    c.box(226, y - 4, 132 - drop, 266, y + 4, 178 - drop, 'webbing');
  }
  c.box(262, 244, 152 - drop, 268, 268, 170 - drop, 'cloth.dark');                          // chest rig
  c.box(266, 236, 136 - drop, 272, 262, 150 - drop, 'team.accent');                          // magazine pouches
  c.box(266, 264, 136 - drop, 272, 280, 150 - drop, 'team.accent')
  c.box(232, 248, 132 - drop, 238, 264, 176 - drop, 'steel.dark');                           // slung strap, back
  return c;
}

/** Shoulder yoke caps: the points the arms hang from, and a silhouette anchor. */
export function shoulders(c, { drop = 0, bulk = 0 } = {}) {
  for (const s of [-1, 1]) {
    c.box(238, CY + s * 26 - 10, 158 - drop, 258, CY + s * 26 + 10, 176 - drop, 'team.dark');
  }
  if (bulk > 0) {
    for (const s of [-1, 1]) {
      c.box(232, CY + s * 30 - 12, 164 - drop, 264, CY + s * 30 + 12, 178 - drop, 'plate');
      c.box(234, CY + s * 38 - 8, 166 - drop, 262, CY + s * 38 + 8, 176 - drop, 'plate.dark');
    }
  }
  return c;
}

/**
 * The support arm: shoulder to elbow to the weapon's handguard.
 *
 * Deliberately drawn across the body. An arm hanging straight down would read as
 * a mannequin, and the rifle would float unsupported.
 */
export function supportArm(c, { drop = 0, target = { x: 326, y: 288, z: 152 } } = {}) {
  // Thin, and crossing to the weapon. Both matter: a fat arm at the side reads as
  // a sausage, and an arm that stops short leaves the rifle unsupported.
  const hy = CY - 26;
  const ey = CY - 30;
  c.line(250, hy, 168 - drop, 258, ey, 148 - drop, 'team.dark', { thickness: 11 });
  c.box(252, ey - 7, 144 - drop, 264, ey + 5, 156 - drop, 'plate.dark');            // elbow pad
  const tx = target.x - 10, ty = target.y - 6, tz = target.z - drop;
  c.line(258, ey, 148 - drop, tx, ty, tz + 2, 'team.dark', { thickness: 10 });
  c.box(tx - 2, ty - 7, tz - 6, tx + 10, ty + 5, tz + 6, 'skin.dark');              // glove on the handguard
  return c;
}

/* ------------------------------------------------------------------ head ---- */

const HEADGEAR = {
  helmet: null,          // handled below
  beret: 'beret',
  cap: 'cap',
  hardhat: 'hardhat',
  fedora: 'fedora',
  ghillie: 'ghillie',
  peaked: 'peaked',
  hood: 'hood',
};

/** Head, face and headgear. Own part: pivot at the neck. */
export function head(c, { headgear = 'helmet', mask = false, drop = 0, mat = 'skin' } = {}) {
  c.part('head');
  const z0 = P.neck - drop;
  c.box(246, 248, 176 - drop, 258, 264, 186 - drop, 'skin.dark');              // neck
  c.box(238, 244, 184 - drop, 264, 268, 208 - drop, mat);                      // skull
  c.box(236, 242, 188 - drop, 240, 270, 204 - drop, 'skin.dark');              // jaw
  // Eyes and a brow: two dark cells each, and they are the only face detail that
  // survives downsampling.
  for (const y of [249, 259]) {
    c.box(262, y, 196 - drop, 265, y + 4, 200 - drop, 'boot');
    c.box(262, y - 1, 201 - drop, 265, y + 5, 203 - drop, 'hair');
  }
  c.box(262, 252, 188 - drop, 265, 262, 192 - drop, 'skin.dark');              // nose shadow

  if (mask) {
    c.box(258, 240, 184 - drop, 268, 272, 200 - drop, 'boot');                 // respirator
    c.box(266, 248, 188 - drop, 272, 264, 196 - drop, 'steel.dark');
    c.box(238, 240, 198 - drop, 266, 272, 208 - drop, 'steel.dark');           // goggles bridge
  }

  /* --------------------------------------------------------------- headgear */
  switch (headgear) {
    case 'helmet': {
      // Olive shell, not body colour: a helmet in the uniform's own tone just
      // thickens the head into a bucket.
      c.box(234, 240, 200 - drop, 266, 272, 212 - drop, 'cloth.dark');         // dome
      c.box(238, 244, 212 - drop, 262, 268, 218 - drop, 'cloth.dark');         // crown
      c.box(232, 238, 198 - drop, 268, 274, 202 - drop, 'webbing');            // brim
      c.box(260, 240, 196 - drop, 270, 272, 200 - drop, 'webbing');            // peak
      c.box(236, 240, 206 - drop, 266, 244, 210 - drop, 'plate.dark');         // band
      c.box(248, 272, 196 - drop, 256, 276, 202 - drop, 'cloth.dark');         // chin strap
      break;
    }
    case 'beret': {
      c.box(236, 240, 206 - drop, 266, 270, 214 - drop, 'team.dark');
      c.box(232, 246, 210 - drop, 262, 276, 218 - drop, 'team.dark');          // slouch to one side
      c.box(258, 244, 204 - drop, 264, 252, 210 - drop, 'brass');              // cap badge
      break;
    }
    case 'cap': {
      c.box(236, 242, 206 - drop, 266, 270, 212 - drop, 'team.dark');
      c.box(264, 246, 204 - drop, 272, 266, 208 - drop, 'team.dark');          // peak
      break;
    }
    case 'peaked': {
      c.box(236, 242, 206 - drop, 266, 270, 216 - drop, 'team.dark');
      c.box(234, 244, 214 - drop, 266, 268, 222 - drop, 'team.dark');          // high crown
      c.box(264, 244, 202 - drop, 276, 268, 208 - drop, 'boot');               // peak
      c.box(258, 240, 210 - drop, 266, 244, 218 - drop, 'brass');              // badge
      break;
    }
    case 'hardhat': {
      c.box(234, 240, 206 - drop, 266, 272, 214 - drop, 'lamp.warm');
      c.box(246, 244, 214 - drop, 258, 268, 220 - drop, 'lamp.warm');          // crown ridge
      c.box(236, 238, 204 - drop, 268, 274, 208 - drop, 'lamp.warm');          // wide brim
      break;
    }
    case 'fedora': {
      c.box(232, 236, 204 - drop, 268, 276, 210 - drop, 'cloth.dark');         // brim
      c.box(238, 242, 208 - drop, 264, 270, 222 - drop, 'cloth.dark');         // crown
      c.box(238, 242, 210 - drop, 264, 270, 214 - drop, 'canvas');             // band
      break;
    }
    case 'ghillie': {
      // Tapered hood, then a ragged fringe. A single box round the head reads as
      // a cardboard carton, which is what the first version looked like.
      c.box(234, 242, 194 - drop, 266, 272, 206 - drop, 'cloth.dark');
      c.box(238, 246, 206 - drop, 264, 268, 216 - drop, 'cloth.dark');
      c.box(242, 250, 216 - drop, 260, 264, 222 - drop, 'cloth');
      c.box(236, 244, 190 - drop, 268, 270, 196 - drop, 'cloth');
      for (let i = 0; i < 26; i++) {
        const y = 232 + (i * 11) % 48;
        const z = 172 + (i * 7) % 26;
        const x = 226 + (i % 6) * 4;
        c.box(x, y, z - drop, x + 4, y + 4, z + 8 - drop, i % 3 ? 'cloth' : 'cloth.dark');
      }
      break;
    }
    case 'hood': {
      c.box(234, 240, 198 - drop, 266, 274, 216 - drop, 'cloth.dark');
      c.box(238, 244, 190 - drop, 268, 270, 200 - drop, 'cloth');
      break;
    }
    case 'none': break;
    default: throw new Error(`unknown headgear "${headgear}"`);
  }

  c.pivot('head', [252, 256, 180 - drop]);
  c.dynamic('head');
  c.part('body');
  return c;
}

/* ---------------------------------------------------------------- weapons -- */

/**
 * Hand weapons. All of them are drawn from a grip at `(x, y, z)` pointing +X, so
 * the aiming arm and the gun always agree on where the hands are.
 *
 * The returned object carries geometry the caller may need — `tip` is where the
 * muzzle ends, `mountZ`/`mountY` are a shoulder or back attach point.
 */
export function weapon(c, kind, { x = 300, y = 296, z = 148, drop = 0 } = {}) {
  z -= drop;
  switch (kind) {
    case 'rifle': {
      c.box(x - 26, y - 5, z - 6, x + 4, y + 5, z + 6, 'gunmetal');            // receiver
      c.box(x - 40, y - 4, z - 4, x - 24, y + 4, z + 5, 'gunmetal.lit');       // stock
      c.box(x - 44, y - 4, z - 8, x - 38, y + 4, z + 4, 'gunmetal');           // butt plate
      c.box(x + 6, y - 4, z - 3, x + 26, y + 4, z + 3, 'gunmetal.lit');        // handguard
      c.cylX(x + 24, x + 56, y, z, 3, 'steel.dark');                           // barrel
      c.box(x + 50, y - 4, z - 4, x + 58, y + 4, z + 4, 'steel.dark');         // flash hider
      c.box(x + 2, y - 3, z + 6, x + 8, y + 3, z + 10, 'steel.dark');          // sight
      c.box(x - 16, y - 4, z - 18, x - 8, y + 4, z - 6, 'gunmetal');           // magazine
      c.box(x - 4, y - 4, z - 12, x + 2, y + 4, z - 6, 'steel.dark');          // grip
      return { tip: x + 56, mountZ: z, mountY: y };
    }
    case 'smg': {
      c.box(x - 16, y - 5, z - 5, x + 6, y + 5, z + 5, 'gunmetal');
      c.box(x - 30, y - 4, z - 4, x - 14, y + 4, z + 3, 'steel.dark');         // wire stock
      c.cylX(x + 4, x + 22, y, z, 2, 'steel.dark');
      c.box(x - 14, y - 3, z - 14, x - 6, y + 3, z - 5, 'gunmetal');           // magazine
      c.box(x - 2, y - 4, z - 10, x + 4, y + 4, z - 5, 'steel.dark');
      return { tip: x + 22 };
    }
    case 'pistol': {
      c.box(x - 4, y - 4, z - 4, x + 18, y + 4, z + 4, 'gunmetal');
      c.box(x - 2, y - 3, z - 12, x + 6, y + 3, z - 4, 'steel.dark');
      c.box(x + 16, y - 2, z - 2, x + 22, y + 2, z + 2, 'steel.dark');
      return { tip: x + 22 };
    }
    case 'sniper': {
      c.box(x - 30, y - 4, z - 5, x + 6, y + 4, z + 5, 'gunmetal');
      c.box(x - 46, y - 4, z - 4, x - 28, y + 4, z + 4, 'cloth.dark');         // cheek rest
      c.cylX(x + 4, x + 72, y, z, 2, 'steel.dark');                            // long barrel
      c.box(x + 66, y - 3, z - 5, x + 72, y + 3, z + 1, 'steel.dark');         // brake
      c.cylX(x - 20, x + 8, y, z + 10, 4, 'steel.dark');                       // scope
      c.box(x - 14, y - 4, z + 6, x - 10, y + 4, z + 10, 'steel.dark');
      c.box(x + 2, y - 3, z - 14, x + 8, y + 3, z - 5, 'gunmetal');            // magazine
      // Bipod, folded forward: the second-longest silhouette in the roster.
      c.line(x + 44, y - 4, z - 2, x + 58, y - 16, z - 24, 'steel.dark', { thickness: 3 });
      c.line(x + 44, y + 4, z - 2, x + 58, y + 16, z - 24, 'steel.dark', { thickness: 3 });
      return { tip: x + 72 };
    }
    case 'launcher': {
      // Drum-fed grenade launcher: fat receiver, drum under it.
      c.box(x - 20, y - 6, z - 7, x + 10, y + 6, z + 7, 'gunmetal');
      c.cylY(x - 2, y - 14, y + 14, z - 6, 10, 'gunmetal.lit');                // drum
      c.cylY(x - 6, y - 12, y + 12, z - 6, 5, 'steel.dark');
      c.cylX(x + 8, x + 40, y, z, 5, 'steel.dark');                            // fat tube
      c.box(x + 36, y - 6, z - 6, x + 42, y + 6, z + 6, 'steel.dark');
      c.box(x - 26, y - 4, z - 4, x - 18, y + 4, z + 5, 'gunmetal');           // stock
      return { tip: x + 42 };
    }
    case 'rocket': {
      // Shoulder tube, rear venturi and a foregrip. The tube is the identity.
      c.cylX(x - 40, x + 44, y, z + 8, 9, 'gunmetal');
      c.cylX(x + 42, x + 50, y, z + 8, 12, 'steel.dark');                      // blast cone
      c.cylX(x + 50, x + 54, y, z + 8, 6, 'scorch');
      c.cylX(x - 46, x - 40, y, z + 8, 12, 'steel.dark');                      // venturi
      c.box(x - 8, y - 3, z - 4, x + 4, y + 3, z + 2, 'steel.dark');           // trigger group
      c.box(x + 20, y - 2, z - 2, x + 26, y + 2, z + 4, 'steel.dark');         // foregrip
      c.box(x + 10, y - 4, z + 16, x + 22, y + 4, z + 22, 'team.accent');      // sight block
      return { tip: x + 54 };
    }
    case 'manpads': {
      // Anti-air tube angled up over the shoulder: the only weapon in the roster
      // that points at the sky.
      c.box(x - 30, y - 8, z - 6, x + 6, y + 8, z + 10, 'gunmetal');           // launch tube body
      c.cylX(x + 4, x + 46, y, z + 16, 8, 'gunmetal');
      c.cylX(x + 44, x + 50, y, z + 22, 10, 'steel.dark');                     // seeker head
      c.cylX(x + 48, x + 54, y, z + 22, 6, 'optic');
      c.box(x - 34, y - 6, z, x - 28, y + 6, z + 8, 'steel.dark');             // grip
      c.box(x + 12, y - 3, z + 4, x + 20, y + 3, z + 10, 'steel.dark');        // sight
      return { tip: x + 54 };
    }
    case 'flamer': {
      c.box(x - 18, y - 5, z - 5, x + 12, y + 5, z + 5, 'gunmetal');
      c.cylX(x + 12, x + 52, y, z, 3, 'steel.dark');                           // lance
      c.cylX(x + 46, x + 54, y, z, 5, 'brass');                                // nozzle
      c.box(x + 50, y - 3, z - 3, x + 54, y + 3, z + 3, 'lamp.warm');          // pilot flame
      c.box(x - 12, y + 5, z - 2, x - 4, y + 12, z + 8, 'steel.dark');         // hose elbow
      return { tip: x + 54 };
    }
    case 'bolter': {
      // Heavy rifle: oversized receiver, box magazine, wide muzzle brake. The
      // "heavy" weapon class needs to look heavier than the sniper's long barrel,
      // so this is short and fat rather than long and thin.
      c.box(x - 24, y - 7, z - 8, x + 8, y + 7, z + 8, 'gunmetal');
      c.box(x + 6, y - 5, z - 5, x + 34, y + 5, z + 5, 'gunmetal.lit');
      c.cylX(x + 32, x + 58, y, z, 4, 'steel.dark');
      c.box(x + 54, y - 7, z - 7, x + 64, y + 7, z + 7, 'steel.dark');        // muzzle brake
      c.box(x - 14, y - 6, z - 22, x - 2, y + 6, z - 8, 'gunmetal');          // box magazine
      c.box(x - 32, y - 5, z - 4, x - 24, y + 5, z + 6, 'gunmetal');
      c.cylX(x - 10, x + 4, y, z + 12, 4, 'steel.dark');                      // sight
      return { tip: x + 64 };
    }
    case 'cannon': {
      c.box(x - 30, y - 8, z - 8, x + 10, y + 8, z + 8, 'gunmetal');
      c.cylX(x + 8, x + 66, y, z, 7, 'gunmetal');
      c.cylX(x + 60, x + 70, y, z, 9, 'steel.dark');                           // muzzle brake
      c.box(x - 26, y - 6, z - 6, x - 18, y + 6, z + 6, 'steel.dark');
      return { tip: x + 70 };
    }
    case 'none': return { tip: x };
    default: throw new Error(`unknown weapon "${kind}"`);
  }
}

/** The aiming arm, with its weapon attached. Own part, pivoted at the shoulder. */
export function aimArm(c, { weaponKind = 'rifle', drop = 0, grip = null } = {}) {
  c.part('arm.R');
  const gx = grip?.x ?? 300;
  const gy = grip?.y ?? 292;
  const gz = (grip?.z ?? 146) - drop;
  // Upper arm, elbow pad, forearm, small glove. A 15-voxel arm over a 30-voxel
  // span is a blob; 11 over the same span is a limb.
  c.line(252, CY + 26, P.shoulderZ - drop, 242, CY + 34, gz + 10, 'team.dark', { thickness: 12 });
  c.box(236, CY + 28, gz + 6, 250, CY + 40, gz + 20, 'plate.dark');               // elbow pad
  c.line(242, CY + 34, gz + 8, gx - 6, CY + 30, gz + 2, 'team.dark', { thickness: 11 });
  c.box(gx - 10, gy - 7, gz - 6, gx + 2, gy + 7, gz + 8, 'skin.dark');            // glove
  weapon(c, weaponKind, { x: gx, y: gy, z: gz + drop, drop });
  c.pivot('arm.R', [252, CY + 26, P.shoulderZ - drop]);
  c.dynamic('arm.R');
  c.part('body');
  return c;
}

/* ------------------------------------------------------------------ loads -- */

/** Rucksack, radio, fuel tanks, toolbox — the third identity channel. */
export function load(c, kind, { drop = 0 } = {}) {
  const z = (v) => v - drop;
  switch (kind) {
    case 'none': break;
    case 'pack': {
      c.box(196, 236, z(138), 232, 276, z(176), 'cloth');
      c.box(200, 240, z(140), 230, 272, z(146), 'cloth.dark');                 // bed roll
      c.box(198, 244, z(168), 232, 268, z(174), 'steel.dark');
      c.line(214, 240, z(176), 226, 236, z(130), 'webbing', { thickness: 4 });  // strap
      break;
    }
    case 'heavy': {
      c.box(186, 230, z(130), 232, 282, z(180), 'cloth');
      c.box(190, 234, z(126), 230, 278, z(132), 'cloth.dark');
      c.box(186, 238, z(150), 232, 274, z(158), 'canvas');                     // strapped load
      for (const y of [244, 268]) {
        c.box(188, y - 3, z(130), 194, y + 3, z(180), 'webbing');
      }
      break;
    }
    case 'radio': {
      c.box(198, 232, z(140), 232, 272, z(176), 'cloth.dark');
      c.box(196, 236, z(152), 200, 268, z(176), 'steel.dark');
      for (let y = 240; y < 268; y += 6) c.box(194, y, z(160), 198, y + 3, z(172), 'lamp.cyan');  // dials
      c.box(196, 240, z(176), 202, 246, z(212), 'steel.dark');                 // whip antenna
      c.box(198, 240, z(212), 200, 246, z(224), 'steel.dark');
      break;
    }
    case 'toolkit': {
      c.box(200, 232, z(142), 232, 272, z(174), 'cloth');
      c.box(186, 232, z(146), 202, 268, z(166), 'lamp.warm');                  // orange toolbox
      c.box(190, 236, z(166), 198, 262, z(172), 'steel.dark');                 // handle
      c.cylX(180, 192, 246, z(158), 4, 'steel.dark');                          // shovel shaft
      break;
    }
    case 'tanks': {
      // Standing cylinders, not lying ones: the tops have to rise above the
      // shoulders or the whole load is hidden behind the torso from every facing.
      for (const y of [238, 274]) {
        c.cylZ(212, y, z(118), z(190), 13, 'steel');
        c.cylZ(212, y, z(186), z(194), 9, 'steel.bright');                     // valve cap
        c.cylZ(212, y, z(140), z(146), 14, 'steel.dark');                      // banding
        c.cylZ(212, y, z(164), z(168), 14, 'steel.dark');
      }
      c.box(196, 228, z(126), 230, 284, z(134), 'steel.dark');                 // manifold
      c.box(200, 232, z(128), 228, 280, z(136), 'brass');
      c.line(196, 276, z(170), 236, 286, z(150), 'brass', { thickness: 5 });   // feed hose
      break;
    }
    case 'satchel': {
      c.box(214, 226, z(136), 234, 246, z(164), 'cloth.dark');                 // belt bag
      c.box(210, 268, z(140), 232, 286, z(170), 'canvas');                     // demo bag
      c.cylX(206, 216, 280, z(152), 5, 'rust');                                // charges
      c.cylX(206, 216, 276, z(160), 5, 'rust');
      break;
    }
    case 'briefcase': {
      c.box(210, 232, z(96), 222, 264, z(124), 'cloth.dark');                  // case
      c.box(212, 244, z(124), 214, 252, z(128), 'steel.dark');                 // handle
      break;
    }
    default: throw new Error(`unknown load "${kind}"`);
  }
  return c;
}

/* ------------------------------------------------------------------ coat --- */

/**
 * Cape or greatcoat.
 *
 * Built as stacked slabs that widen as they fall, so the hem swings out behind
 * the legs. The first version was a single vertical slab and it read as a board
 * strapped to the back — a cape only reads as cloth if the outline changes with
 * height.
 */
export function cape(c, {
  drop = 0, hemZ = 56, topZ = 176, halfTop = 28, halfHem = 50,
  back = 198, mat = 'cloth.dark', trim = null, steps = 9,
} = {}) {
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const z0 = topZ - (topZ - hemZ) * t1;
    const z1 = topZ - (topZ - hemZ) * t0;
    const half = Math.round(halfTop + (halfHem - halfTop) * t1);
    const xb = back - Math.round(8 * t1);            // leans back as it falls
    c.box(Math.round(xb), CY - half, Math.round(z0) - drop, 214, CY + half, Math.round(z1) - drop, mat);
  }
  if (trim) c.box(back - 10, CY - halfHem, hemZ - drop, 214, CY + halfHem, hemZ + 6 - drop, trim);
  return c;
}

/**
 * Long coat.
 *
 * A trench coat is a *cone*, not a panel: it closes right round the body from the
 * waist to the hem, which is why the spy has no readable legs below knee height.
 * The first version was a flat back panel plus two narrow side strips, and the
 * strips read as poles sticking out of the hips.
 */
export function coat(c, { drop = 0, hemZ = 58, topZ = 150, steps = 5 } = {}) {
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const z0 = topZ - (topZ - hemZ) * t1;
    const z1 = topZ - (topZ - hemZ) * t0;
    const half = Math.round(34 + 18 * t1);
    const xb = 224 - Math.round(10 * t1);
    c.box(xb, CY - half, Math.round(z0) - drop, 266, CY + half, Math.round(z1) - drop, 'cloth.dark');
  }
  // Belt over the coat, and a darker front opening so it is not one cone of colour.
  c.box(222, CY - 38, 118 - drop, 268, CY + 38, 126 - drop, 'canvas');
  c.box(264, CY - 6, hemZ - drop, 268, CY + 6, 128 - drop, 'cloth.dark');
  c.box(226, 226, topZ - 2 - drop, 250, 286, topZ + 26 - drop, 'cloth.dark');   // collar
  c.box(248, 232, topZ + 12 - drop, 254, 280, topZ + 26 - drop, 'canvas');      // lapel
  return c;
}

/* --------------------------------------------------------- compose figure -- */

/**
 * Compose a whole standing rifleman-equivalent.
 *
 * Order matters: legs → torso → shoulders → load → support arm → head → weapon
 * arm. Everything except `head` and `arm.R` lands in `body`, so a bake produces
 * three sheets per facing.
 */
export function humanoid(c, o = {}) {
  const {
    headgear = 'helmet', mask = false, pack = 'pack', weaponKind = 'rifle',
    stride = 0, crouch = 0, bulk = 0, coatLen = 0, skin = 'skin', grip = null,
  } = o;
  c.part('body');
  legs(c, { stride, crouch, bulk });
  torso(c, { drop: crouch, bulk });
  shoulders(c, { drop: crouch, bulk });
  if (coatLen) coat(c, { drop: crouch, len: coatLen });
  load(c, pack, { drop: crouch });
  supportArm(c, {
    drop: crouch,
    target: { x: (grip?.x ?? 300) + 26, y: (grip?.y ?? 292) - 8, z: (grip?.z ?? 146) + 6 },
  });
  head(c, { headgear, mask, drop: crouch, mat: skin });
  aimArm(c, { weaponKind, drop: crouch, grip });
  return c;
}

/* -------------------------------------------------------------- quadruped -- */

/**
 * Attack dog: a quadruped with a harness, a back-mounted weapon cradle and a
 * sensor mast. Four legs is the entire silhouette problem — a bodied dog at this
 * scale is a loaf on sticks unless the chest and haunches are separate masses.
 */
export function quadruped(c) {
  c.part('body');
  const z = 62;                                   // body underside
  // Chest and haunches, separate masses with an arch between them.
  c.box(238, 228, z, 300, 284, z + 52, 'team.hull');
  c.box(212, 236, z + 6, 244, 276, z + 44, 'team.hull');
  c.box(292, 236, z + 4, 318, 276, z + 44, 'team.hull');            // neck block
  c.box(310, 240, z + 10, 328, 272, z + 52, 'team.hull');           // rising neck
  c.box(240, 236, z + 44, 296, 276, z + 56, 'team.dark');           // back plate
  c.box(250, 244, z + 56, 286, 268, z + 64, 'plate.dark');          // weapon cradle
  c.box(258, 248, z + 64, 280, 264, z + 70, 'gunmetal');
  c.cylX(278, 300, 256, z + 67, 4, 'steel.dark');
  c.box(236, 244, z + 56, 246, 268, z + 68, 'steel.dark');          // sensor mast
  c.box(234, 248, z + 68, 246, 264, z + 76, 'optic');
  c.box(226, 232, z + 20, 244, 280, z + 40, 'canvas');              // harness panniers

  // Legs: upper and lower segments with a real bend, front pair forward.
  for (const [x, phase] of [[286, 1], [242, -1]]) {
    for (const s of [-1, 1]) {
      const y = CY + s * 22;
      c.line(x, y, z + 14, x + phase * 12, y, z - 22, 'team.dark', { thickness: 17 });  // heavy thigh
      c.box(x - 12, y - 10, z - 4, x + 12, y + 10, z + 26, 'team.dark');                // shoulder mass
      c.line(x + phase * 12, y, z - 20, x - phase * 2, y, 10, 'team.dark', { thickness: 11 });
      c.box(x - phase * 2 - 11, y - 9, 0, x - phase * 2 + 11, y + 9, 12, 'boot');       // paw
    }
  }
  // Tail, up and back: a stub tail reads as a missing part.
  c.line(228, 256, z + 44, 192, 256, z + 34, 'team.dark', { thickness: 8 });
  c.box(184, 250, z + 30, 196, 262, z + 42, 'team.dark');

  // Dynamic part: the head, pivoted at the neck so it can track.
  c.part('head');
  // Head sits above the body line and forward of it: a head level with the
  // shoulders reads as a bump on a loaf.
  c.box(324, 238, z + 40, 350, 274, z + 74, 'team.hull');            // skull
  c.box(348, 244, z + 44, 366, 268, z + 64, 'team.dark');            // muzzle
  c.box(364, 248, z + 50, 372, 264, z + 58, 'boot');                 // nose
  for (const y of [246, 262]) c.box(352, y, z + 58, 358, y + 6, z + 64, 'lamp.warm');
  for (const s2 of [-1, 1]) {                                        // ears
    c.box(330, CY + s2 * 16 - 5, z + 74, 344, CY + s2 * 16 + 5, z + 90, 'team.dark');
    c.box(332, CY + s2 * 16 - 3, z + 76, 342, CY + s2 * 16 + 3, z + 86, 'cloth.dark');
  }
  c.box(326, 242, z + 62, 348, 270, z + 70, 'team.dark');            // brow
  c.pivot('head', [326, 256, z + 50]);
  c.dynamic('head');
  c.part('body');
  return c;
}

/* ----------------------------------------------------------------- walker -- */

/**
 * Mech: a two-legged walker, not a scaled-up human. The differences that make it
 * read as a machine are the **reverse-jointed legs**, a cockpit pod hung between
 * the hips, and weapon pods on the ends of the arms rather than hands holding
 * guns.
 */
export function walker(c) {
  c.part('body');
  const hipZ = 150;
  // Legs: thigh down-forward, shin back to the ankle, big foot.
  for (const s of [-1, 1]) {
    const y = CY + s * 34;
    c.sphere(250, y, hipZ, 20, 'steel.dark');
    c.line(250, y, hipZ, 286, y, hipZ - 46, 'plate', { thickness: 22 });       // thigh, forward
    c.sphere(286, y, hipZ - 46, 18, 'steel.dark');
    c.line(286, y, hipZ - 46, 254, y, 46, 'plate', { thickness: 20 });         // shin, back
    c.box(238, y - 18, 40, 274, y + 18, 60, 'steel.dark');                     // ankle
    c.box(226, y - 22, 0, 300, y + 22, 22, 'plate.dark');                      // foot
    c.box(292, y - 16, 0, 306, y + 16, 14, 'steel.dark');                      // toe
    c.box(232, y - 10, 22, 254, y + 10, 40, 'steel.dark');
    // Hydraulic ram alongside the shin, so the joint is legible.
    c.line(280, y + s * 22, hipZ - 50, 262, y + s * 22, 60, 'steel.bright', { thickness: 6 });
  }
  // Hip block. The pod and arms above it are the traversing part.
  c.box(230, 208, hipZ - 12, 280, 304, hipZ + 26, 'plate.dark');
  c.part('turret');
  c.box(214, 216, hipZ + 8, 274, 296, hipZ + 52, 'plate');                     // pod
  c.box(272, 224, hipZ + 22, 280, 288, hipZ + 48, 'solar');                    // canopy, on the front face
  c.box(268, 218, hipZ + 16, 276, 294, hipZ + 52, 'steel.dark');               // canopy frame
  c.box(278, 228, hipZ + 26, 282, 284, hipZ + 44, 'optic');                    // glare
  for (const s2 of [-1, 1]) {
    c.box(222, 256 + s2 * 40, hipZ + 22, 268, 256 + s2 * 44, hipZ + 40, 'team.hull');   // faction stripe
  }
  c.box(216, 230, hipZ + 52, 268, 282, hipZ + 58, 'team.dark');                // pod roof band
  c.box(216, 224, hipZ + 52, 268, 288, hipZ + 60, 'steel.dark');               // pod roof
  c.box(198, 232, hipZ + 26, 212, 280, hipZ + 40, 'gunmetal');                 // chin sensor
  c.box(204, 240, hipZ + 30, 210, 272, hipZ + 36, 'optic');

  // Arms: shoulder pivot outboard, weapon pod on the forearm.
  for (const s of [-1, 1]) {
    const y = CY + s * 58;
    c.sphere(262, y, hipZ + 40, 20, 'steel.dark');
    c.line(262, y, hipZ + 40, 292, y, hipZ + 4, 'plate', { thickness: 20 });
    c.box(280, y - 16, hipZ - 22, 330, y + 16, hipZ + 16, 'plate');            // forearm housing
    c.box(326, y - 12, hipZ - 16, 348, y + 12, hipZ + 8, 'gunmetal');
    if (s < 0) {
      c.cylX(344, 386, y, hipZ - 4, 7, 'gunmetal');                            // left: long cannon
      c.cylX(380, 390, y, hipZ - 4, 9, 'steel.dark');
    } else {
      for (let i = 0; i < 3; i++) {                                           // right: rocket pod
        c.cylX(346, 372, y - 8 + i * 8, hipZ + 6, 4, 'scorch');
      }
      c.box(342, y - 16, hipZ - 2, 376, y + 16, hipZ + 14, 'gunmetal');
    }
    c.box(276, y - 18, hipZ - 26, 300, y + 18, hipZ - 20, 'steel.bright');     // shoulder pad
  }
  // Antennae and a rear counterweight, so the pod is not floating on the hips.
  c.box(228, 214, hipZ + 60, 234, 220, hipZ + 96, 'steel.dark');
  c.box(230, 292, hipZ + 60, 236, 298, hipZ + 86, 'steel.dark');
  c.box(206, 220, hipZ + 2, 232, 292, hipZ + 14, 'steel.dark');
  c.pivot('turret', [256, 256, hipZ + 18]);
  c.dynamic('turret');
  c.traverse('turret');
  c.part('body');
  return c;
}
