/**
 * 64×64×64 unit sculptors with tagged mechanical groups.
 *
 * Canonical facing is 'right' (+X); bake.mjs rotates 90° steps about Z for the
 * other facings (never mirrored). Every moving part is drawn into its own
 * group so `poseOpsFor` in build.mjs can yaw / pitch / spin / wrap / hide it
 * per clip frame; cyclic patterns (tread cleats, wheel lugs, wakes, exhaust
 * plumes) are drawn from the pose argument.
 *
 * Scale contract: one voxel step is half a runtime pixel, so these 64³ models
 * occupy exactly the same 64×32 iso footprint the 32³ models did, with twice
 * the geometric resolution (rounded armour, panel lines, hatches, glazing).
 */

const TEAM = '#df794b', LIGHT = '#ffc68b', DARK = '#934b32';
const STEEL = '#4c4935', METAL = '#8e9680', TRACK = '#3b4732', WHEEL = '#788066';
const SKIN = '#efcf99', GLASS = '#b8dedc', GUN = '#354d42', PLATE = '#5e6a4e';
const TRIM = '#dfe6ea', RUBBER = '#2b3128', CANVAS_C = '#6b5a3a';
const CHAR = '#241a12', SMOKE = '#d8dede', FOAM = '#e2f6f8', SEA = '#324b50';

/** Tread belt with static loop + wrapped cleat group + spinning roadwheels. */
function tracks(c, x0, x1, y0, y1, tag) {
  const h = 8;
  c.group('body');
  c.box(x0 + 2, y0, 1, x1 - 2, y1, h, TRACK);
  c.box(x0, y0 + 1, 2, x1, y1 - 1, h - 1, TRACK);
  // Rounded drive sprocket & idler ends.
  c.cylY(x0 + 3, y0 + 1, y1 - 1, 4, 3.4, TRACK);
  c.cylY(x1 - 4, y0 + 1, y1 - 1, 4, 3.4, TRACK);
  // Tread cleats (period 4, wrap 1/frame): the top run rides proud of the
  // skirt and the ground run grousers stick out past the outer track face,
  // so the marching tread reads from every facing.
  c.group(`cleat${tag}`);
  const gy = tag === 'L' ? y0 - 2 : y1;
  for (let x = x0 + 2; x < x1 - 3; x += 4) {
    c.box(x, y0 + 1, h, x + 2, y1 - 1, h + 2, RUBBER);
    c.box(x, gy, 2, x + 2, gy + 2, 6, RUBBER);
  }
  c.pivot(`cleat${tag}`, [x0 + 2, x1 - 3]);
  // Roadwheels on the outer face: rim disc plus four lugs (spin -50°/frame;
  // 50 is coprime with the 90° lug symmetry so no two frames alias).
  c.group('wheels');
  const axles = [];
  const wy = tag === 'L' ? y0 - 1 : y1 - 2;
  for (let x = x0 + 10; x <= x1 - 10; x += 12) {
    axles.push([x, 4]);
    c.cylY(x, wy, wy + 3, 4, 2.4, WHEEL);
    for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
      c.put(x + dx, wy, 4 + dz, STEEL);
      c.put(x + dx, wy + 2, 4 + dz, STEEL);
    }
  }
  if (tag === 'L') c.pivot('wheels', axles);
  c.group('body');
  // Inset upper track skirt (panel line) that keeps the cleats exposed.
  c.box(x0 + 2, y0 + 2, h, x1 - 2, y1 - 2, h + 1, PLATE);
}

function wheels(c, axleXs, y0, y1, r = 5) {
  c.group('body');
  c.box(axleXs[0] - 2, y0 + 2, 3, axleXs.at(-1) + 3, y1 - 2, 8, DARK);
  c.group('wheels');
  const axles = [];
  for (const ax of axleXs) {
    for (const [ya, yb] of [[y0, y0 + 3], [y1 - 3, y1]]) {
      axles.push([ax, r]);
      c.cylY(ax, ya, yb, r, r - 0.8, RUBBER);
      c.cylY(ax, ya, yb, r, r * 0.45, WHEEL);
      // Lugs proud of the tyre (radius r vs disc r-0.8) so the -50°/frame
      // spin sweeps the silhouette and never aliases a previous frame.
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
        c.put(ax + dx, ya, r + dz, STEEL);
        c.put(ax + dx, yb - 1, r + dz, STEEL);
      }
    }
  }
  c.pivot('wheels', axles);
  c.group('body');
}

/** Bow/stern wake foam that marches with the move clip. */
function wake(c, bowX, sternX, y0, y1, pose) {
  const f = pose?.action === 'move' ? pose.frame : 0;
  c.group('wake');
  // Bow wave: two foam whiskers whose length alternates with the cycle.
  const bl = 6 + (f % 2) * 3;
  c.box(bowX - 2, y0 - 2, 1, bowX + bl, y0, 2, FOAM);
  c.box(bowX - 2, y1, 1, bowX + bl, y1 + 2, 2, FOAM);
  // Stern trail: three churn patches stepping aft each frame.
  for (let i = 0; i < 3; i++) {
    const x = sternX + 2 - ((f + i) % 4) * 3;
    c.box(x, y0 + 2, 1, x + 4, y1 - 2, 2, i === 0 ? FOAM : '#b8dedc');
  }
  c.group('body');
}

/* ------------------------------------------------------------- foot units -- */
function footUnit(c, id, pose) {
  const isMech = id === 'mech', isEng = id === 'engineer', isMed = id === 'medic';
  const vest = isMech ? PLATE : isMed ? '#d8dede' : TEAM;
  // Legs: separated boots + trousers, tagged for the gait.
  c.group('legL');
  c.box(20, 20, 0, 27, 29, 3, RUBBER);
  c.box(21, 21, 3, 26, 29, 14, TRACK);
  c.box(20, 20, 12, 27, 29, 14, DARK);
  c.group('legR');
  c.box(20, 35, 0, 27, 44, 3, RUBBER);
  c.box(21, 35, 3, 26, 43, 14, TRACK);
  c.box(20, 35, 12, 27, 44, 14, DARK);
  // Upper body: pelvis, torso, pack, arms, head — one rigid group.
  c.group('upper');
  c.box(20, 20, 14, 27, 44, 18, DARK);              // pelvis + belt
  c.box(19, 20, 18, 28, 44, 30, vest);              // torso
  c.box(21, 22, 22, 28, 42, 30, TEAM);              // chest panel
  c.box(24, 26, 30, 27, 38, 31, LIGHT);             // collar
  if (isEng) {
    c.box(12, 22, 18, 19, 42, 32, CANVAS_C);        // charge pack
    c.box(13, 24, 24, 15, 40, 30, '#4a5245');
    c.box(9, 26, 24, 12, 30, 28, '#e8c468');        // detonator caps
    c.box(12, 32, 32, 18, 38, 34, STEEL);           // strap buckle
  } else if (isMed) {
    c.box(14, 24, 18, 19, 40, 28, '#dfe6ea');       // aid satchel
    c.box(15, 30, 28, 18, 34, 29, '#d94b38');       // red cross
    c.box(16, 26, 22, 17, 38, 24, '#d94b38');
  } else {
    c.box(14, 24, 18, 19, 40, 30, isMech ? STEEL : CANVAS_C); // field pack
    c.box(14, 26, 30, 18, 38, 31, DARK);
  }
  c.box(22, 16, 20, 28, 20, 30, TEAM);              // left arm
  c.box(22, 44, 20, 28, 48, 30, TEAM);              // right arm
  c.box(26, 38, 22, 32, 44, 26, SKIN);              // hands
  c.box(22, 24, 30, 28, 40, 38, SKIN);              // head
  c.box(26, 26, 32, 28, 38, 34, '#e8c468');         // face shade
  c.box(20, 22, 36, 29, 42, 40, DARK);              // helmet rim
  c.box(21, 23, 40, 28, 41, 44, TEAM);              // helmet crown
  c.box(24, 26, 44, 27, 37, 45, LIGHT);
  if (isMech) c.box(27, 26, 32, 30, 38, 36, GLASS); // tactical visor
  c.pivot('upper', [24, 16]);
  // Weapon group (also the engineer's tools / medic's litter).
  c.group('weapon');
  if (isMech) {
    c.cylX(12, 54, 45, 31, 3.4, STEEL);             // bazooka tube
    c.cylX(50, 56, 45, 31, 4.2, DARK);
    c.cylX(10, 16, 45, 31, 4.0, METAL);
    c.box(36, 40, 24, 42, 46, 30, GUN);
  } else if (isEng) {
    c.box(30, 36, 22, 42, 44, 28, '#4a5245');       // demolition charge
    c.box(32, 38, 28, 40, 42, 30, '#e8c468');
    c.box(42, 38, 24, 54, 40, 26, '#8c6b42');       // breaching hammer
    c.box(52, 36, 24, 58, 44, 28, '#c8ccd0');
  } else if (isMed) {
    c.box(22, 22, 28, 34, 44, 30, '#f2f4ef');       // stretcher strap
    c.box(30, 38, 20, 44, 42, 24, '#9aa39a');       // folded litter
    c.box(44, 38, 20, 48, 42, 24, '#d94b38');       // triage tag
  } else {
    c.box(30, 38, 24, 44, 42, 28, STEEL);           // rifle stock + body
    c.box(38, 38, 20, 42, 42, 24, DARK);            // magazine
    c.box(44, 38, 26, 58, 40, 28, GUN);             // barrel
    c.box(46, 38, 28, 50, 39, 29, STEEL);           // sight rail
  }
  c.pivot('weapon', [30, 26]);
  c.group('body');
}



/* --------------------------------------------------------- ground vehicles - */
function groundVehicle(c, id, pose) {
  const wheeled = id === 'recon' || id === 'rockets' || id === 'missiles' || id === 'aegis';
  const wide = id === 'mega' || id === 'heavy' || id === 'bastion';
  const x0 = wide ? 4 : 8, x1 = wide ? 60 : 56;
  const yL = wide ? 10 : 14, yR = wide ? 54 : 50;

  if (wheeled) {
    wheels(c, id === 'rockets' ? [16, 30, 46] : [18, 46], yL, yR);
  } else {
    tracks(c, x0, x1, yL, yL + 8, 'L');
    tracks(c, x0, x1, yR - 8, yR, 'R');
  }

  // Hull: sloped glacis, deck panel lines, headlights, exhaust grille.
  c.group('body');
  c.box(x0 + 2, yL + 4, 6, x1 - 2, yR - 4, 14, DARK);
  c.box(x0 + 4, yL + 2, 10, x1 - 4, yR - 2, 18, TEAM);
  c.ramp(x1 - 10, x1, yL + 4, yR - 4, 10, 6, 10, LIGHT);   // sloped glacis
  c.box(x0 + 8, yL + 4, 18, x1 - 8, yR - 4, 19, LIGHT);    // deck line
  c.box(x1 - 4, yL + 4, 14, x1, yL + 8, 18, '#ece7bc');    // headlights
  c.box(x1 - 4, yR - 8, 14, x1, yR - 4, 18, '#ece7bc');
  c.box(x0, yL + 8, 12, x0 + 4, yR - 8, 16, STEEL);        // exhaust grille
  for (let y = yL + 9; y < yR - 8; y += 4) c.put(x0 + 1, y, 16, CHAR);

  if (id === 'bastion') {
    bastionBody(c);
    c.group('turret');
    c.cylZ(30, 32, 20, 28, 9.0, STEEL);                    // oversized turret ring
    c.box(20, 20, 22, 44, 44, 32, TEAM);                   // angular mantlet block
    c.box(22, 22, 32, 42, 42, 34, LIGHT);
    c.box(18, 24, 24, 22, 40, 30, PLATE);                  // bustle armour
    c.pivot('turret', [30, 32]);
    c.group('barrel');
    c.box(40, 29, 24, 62, 35, 30, GUN);                    // long siege cannon
    c.box(44, 28, 23, 48, 36, 31, DARK);                   // thermal sleeve
    c.box(56, 27, 22, 62, 37, 32, STEEL);                  // double-baffle brake
    c.put(62, 31, 27, '#ece7bc'); c.put(62, 33, 27, '#ece7bc');
    c.pivot('barrel', [40, 24]);
    c.group('body');
    c.box(26, 30, 34, 30, 34, 44, METAL);                  // rangefinder mast
    c.put(26, 30, 44, LIGHT);
    return;
  }
  if (id === 'aegis') {
    aegisBody(c);
    c.group('rack');                                       // quad SAM elevator
    c.box(14, 20, 18, 32, 44, 22, STEEL);
    for (const [my, mz] of [[22, 22], [38, 22], [22, 30], [38, 30]]) {
      c.cylX(12, 34, my, mz, 2.6, '#ece7bc');
      c.box(12, my - 1, mz - 1, 15, my + 2, mz + 2, DARK);
    }
    c.box(10, 28, 14, 14, 36, 18, DARK);                   // elevator hinge
    c.pivot('rack', [12, 18]);
    c.group('ammo');                                       // reload magazine tips
    c.put(34, 22, 22, '#ece7bc'); c.put(34, 38, 22, '#ece7bc');
    c.put(34, 22, 30, '#ece7bc'); c.put(34, 38, 30, '#ece7bc');
    c.group('body');
    return;
  }
  if (id === 'apc') {
    c.shell(12, 20, 18, 48, 44, 30, TEAM);
    c.box(14, 22, 30, 44, 42, 31, LIGHT);                  // roof
    c.box(42, 22, 22, 50, 42, 28, GLASS);                  // windshield
    c.box(10, 24, 18, 14, 40, 28, PLATE);                  // troop door
    c.cylZ(28, 32, 31, 35, 4.2, DARK);                     // roof hatch
    c.cylZ(28, 32, 35, 36, 3.0, PLATE);
  } else if (id === 'recon') {
    c.shell(20, 20, 18, 46, 44, 28, TEAM);
    c.box(40, 22, 22, 48, 42, 28, GLASS);                  // cab glass
    c.cylZ(30, 32, 28, 33, 5.4, STEEL);                    // pintle ring
    c.group('rack');
    c.box(30, 30, 33, 34, 34, 36, STEEL);
    c.box(34, 30, 32, 58, 32, 34, GUN);                    // twin MG barrels,
    c.box(34, 33, 32, 58, 35, 34, GUN);                    // proud of the nose
    c.box(54, 28, 30, 58, 37, 36, STEEL);                  // heavy muzzle brace
    c.pivot('rack', [32, 33]);
    c.group('body');
    c.box(22, 22, 28, 24, 24, 44, METAL);                  // whip antenna
    c.put(22, 22, 44, LIGHT);
  } else if (id === 'rockets') {
    c.shell(38, 20, 18, 54, 44, 30, TEAM);                 // cab
    c.box(48, 22, 22, 56, 42, 28, GLASS);
    c.box(40, 22, 30, 52, 42, 31, LIGHT);
    c.group('rack');                                       // MLRS box, elevates
    for (let s = 0; s < 5; s++) {
      c.box(12 + s * 6, 20, 20 + s * 4, 22 + s * 6, 44, 30 + s * 4, PLATE);
    }
    for (const ry of [22, 30, 38]) {
      c.box(32, ry, 32, 44, ry + 4, 42, DARK);             // tube bores
      c.put(44, ry + 1, 36, '#ece7bc'); c.put(44, ry + 2, 36, '#ece7bc');
    }
    c.pivot('rack', [20, 22]);
    c.group('ammo');
    for (const ry of [23, 31, 39]) c.box(40, ry, 34, 44, ry + 3, 40, '#ece7bc');
    c.group('body');
  } else if (id === 'missiles') {
    c.shell(40, 20, 18, 54, 44, 28, TEAM);                 // cab
    c.box(48, 22, 22, 56, 42, 26, GLASS);
    c.box(18, 22, 18, 36, 42, 26, STEEL);                  // radar pedestal
    c.box(16, 24, 26, 20, 40, 30, METAL);
    c.group('rack');                                       // twin SAM rails
    for (const my of [23, 39]) {
      for (let s = 0; s < 14; s++) {
        const mx = 14 + s * 2;
        const mz = 26 + Math.floor(s * 1.1);
        c.cylX(mx, mx + 2, my, mz, 2.6, s > 11 ? DARK : '#ece7bc');
      }
    }
    c.pivot('rack', [16, 26]);
    c.group('ammo');
    for (const my of [23, 39]) {
      c.cylX(20, 40, my, 32, 2.0, TRIM);
      c.box(38, my - 2, 34, 42, my + 2, 38, DARK);
    }
    c.group('body');
  } else if (id === 'artillery') {
    c.box(6, 18, 2, 10, 24, 8, STEEL);                     // recoil spades
    c.box(6, 40, 2, 10, 46, 8, STEEL);
    c.shell(14, 20, 18, 38, 44, 30, TEAM);                 // casemate
    c.box(16, 22, 30, 34, 42, 31, DARK);
    c.group('barrel');                                     // elevated howitzer
    for (let s = 0; s < 14; s++) {
      const bx = 30 + s * 2;
      const bz = 26 + Math.floor(s * 1.0);
      c.cylX(bx, bx + 2, 32, bz, s < 4 ? 3.4 : 2.4, s > 11 ? DARK : STEEL);
    }
    c.box(56, 30, 38, 60, 34, 42, DARK);                   // muzzle brake
    c.pivot('barrel', [30, 26]);
    c.group('body');
  } else if (id === 'antiair') {
    c.cylZ(29, 32, 18, 28, 10.2, TEAM, 'turret');
    c.cylZ(29, 32, 28, 30, 7.4, LIGHT, 'turret');
    c.group('turret');
    c.box(16, 26, 30, 22, 38, 40, METAL);                  // tracking radar
    c.box(15, 27, 40, 21, 37, 41, '#bbc4c8');
    c.pivot('turret', [29, 32]);
    c.group('barrel');
    for (const gy of [26, 36]) {                           // twin autocannons
      for (let s = 0; s < 12; s++) {
        c.box(32 + s * 2, gy, 26 + Math.floor(s * 0.9), 36 + s * 2, gy + 4, 30 + Math.floor(s * 0.9), GUN);
      }
    }
    c.pivot('barrel', [32, 26]);
    c.group('body');
  } else if (id === 'mega') {
    c.box(6, 10, 10, 56, 16, 18, PLATE);                   // sponsons
    c.box(6, 48, 10, 56, 54, 18, PLATE);
    c.shell(16, 16, 18, 46, 48, 32, TEAM);
    c.box(20, 18, 32, 42, 46, 35, LIGHT);
    c.group('turret');
    c.cylZ(26, 24, 35, 39, 4.2, DARK);
    c.cylZ(26, 40, 35, 39, 4.2, DARK);
    c.pivot('turret', [28, 32]);
    c.group('barrel');
    for (const gy of [25, 39]) {
      c.cylX(42, 62, gy, 27, 3.0, STEEL);
      c.box(58, gy - 3, 24, 63, gy + 3, 30, DARK);
    }
    c.pivot('barrel', [42, 27]);
    c.group('body');
  } else if (id === 'heavy') {
    c.box(6, 12, 10, 56, 18, 16, PLATE);                   // armour skirts
    c.box(6, 46, 10, 56, 52, 16, PLATE);
    c.shell(18, 18, 18, 44, 46, 30, TEAM);
    c.box(22, 20, 30, 40, 44, 33, LIGHT);
    c.group('turret');
    c.cylZ(27, 26, 33, 37, 3.8, DARK);                     // cupola
    c.pivot('turret', [28, 32]);
    c.group('barrel');
    c.cylX(40, 62, 32, 26, 3.0, STEEL);
    c.box(58, 28, 22, 63, 36, 30, DARK);
    c.pivot('barrel', [40, 26]);
    c.group('body');
  } else {
    // Light tank: rounded turret, commander hatch, crisp gun + muzzle ring.
    c.group('turret');
    c.cylZ(30, 32, 18, 29, 10.2, TEAM);
    c.cylZ(30, 32, 29, 31, 7.4, LIGHT);
    c.cylZ(27, 28, 31, 35, 3.4, DARK);
    c.pivot('turret', [30, 32]);
    c.group('barrel');
    c.cylX(38, 60, 32, 26, 2.4, STEEL);
    c.box(56, 30, 24, 62, 34, 28, DARK);
    c.pivot('barrel', [38, 26]);
    c.group('body');
  }
}

/* ---------------------------------------------------------------- air units - */
function airUnit(c, id, pose) {
  if (id === 'copter') {
    for (const y of [20, 42]) {                            // landing skids
      c.box(20, y, 4, 46, y + 2, 6, STEEL, 'body');
      c.box(26, y, 6, 28, y + 2, 14, STEEL, 'body');
      c.box(40, y, 6, 42, y + 2, 14, STEEL, 'body');
    }
    c.group('body');
    c.box(20, 24, 14, 52, 40, 24, DARK);                  // fuselage
    c.box(22, 24, 16, 50, 40, 26, TEAM);
    c.box(26, 26, 26, 44, 38, 30, TEAM);
    c.box(38, 26, 18, 54, 38, 26, GLASS);                 // tandem canopy
    c.box(34, 26, 24, 46, 38, 30, GLASS);
    c.box(52, 30, 14, 60, 34, 18, STEEL);                 // chin sensor + gun
    c.box(28, 12, 18, 38, 52, 22, TEAM);                  // stub wings
    c.group('pods');
    c.cylX(26, 42, 15, 16, 3.0, STEEL);                   // rocket pods
    c.cylX(26, 42, 49, 16, 3.0, STEEL);
    c.pivot('pods', [30, 16]);
    c.group('ammo');
    for (const py of [15, 49]) for (const pz of [14, 18]) c.put(42, py, pz, '#ece7bc');
    c.group('body');
    c.box(6, 30, 18, 22, 34, 24, TEAM);                   // tail boom
    c.box(4, 30, 20, 12, 34, 34, DARK);                   // swept fin
    c.box(4, 30, 30, 10, 34, 36, LIGHT);
    c.group('rotorTail');
    c.box(4, 26, 30, 8, 38, 32, STEEL);                   // tail rotor blades
    c.box(5, 31, 22, 7, 33, 40, STEEL);
    c.pivot('rotorTail', [32, 31]);
    c.group('body');
    c.cylZ(30, 32, 30, 36, 3.0, STEEL);                   // rotor mast
    c.group('rotorMain');
    c.box(4, 30, 34, 60, 34, 36, '#344c41');              // 4-blade main rotor
    c.box(30, 4, 34, 34, 60, 36, '#344c41');
    c.box(30, 30, 36, 34, 34, 38, LIGHT);
    c.pivot('rotorMain', [32, 32]);
    if (pose?.action === 'move') {                        // rotor disc blur tips
      c.group('disc');
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * Math.PI * 2;
        c.put(Math.round(32 + Math.cos(t) * 28), Math.round(32 + Math.sin(t) * 28), 35, '#8e9680');
      }
      c.group('body');
    }
  } else if (id === 'lift-copter') {
    for (const x of [18, 44]) {
      c.cylY(x, 18, 22, 8, 3.0, TRACK, 'body');
      c.cylY(x, 42, 46, 8, 3.0, TRACK, 'body');
    }
    c.group('body');
    c.box(12, 22, 10, 52, 42, 26, TEAM);
    c.box(12, 20, 10, 48, 24, 16, DARK);
    c.box(12, 40, 10, 48, 44, 16, DARK);
    c.box(16, 24, 26, 48, 40, 28, LIGHT);
    c.box(46, 24, 16, 56, 40, 24, GLASS);                 // glazed nose
    c.box(8, 24, 10, 14, 40, 16, PLATE);                  // cargo ramp
    for (const y of [26, 36]) for (const x of [22, 30, 38]) {
      c.box(x, y, 18, x + 4, y + 2, 22, GLASS);
    }
    c.box(14, 28, 26, 22, 36, 36, DARK);                  // aft pylon
    c.box(42, 28, 26, 50, 36, 34, TEAM);                  // fore pylon
    c.group('rotorMain');
    c.box(2, 30, 36, 38, 34, 38, '#344c41');
    c.box(16, 10, 36, 20, 54, 38, '#344c41');
    c.pivot('rotorMain', [18, 32]);
    c.group('rotorFore');
    c.box(26, 30, 34, 62, 34, 36, '#344c41');
    c.box(44, 10, 34, 48, 54, 36, '#344c41');
    c.pivot('rotorFore', [46, 32]);
    c.group('body');
  } else if (id === 'fighter') {
    c.group('body');
    c.cylX(12, 52, 32, 20, 5.0, TEAM);                    // fuselage
    c.cylX(50, 60, 32, 20, 3.0, LIGHT);                   // nose
    c.put(60, 31, 20, STEEL); c.put(60, 32, 20, STEEL);
    c.box(36, 28, 24, 50, 36, 28, GLASS);                 // bubble canopy
    for (let d = 4; d <= 26; d += 2) {                    // swept delta wings
      const wx0 = Math.max(14, 32 - Math.floor(d * 0.7));
      const wx1 = Math.max(wx0 + 8, 44 - Math.floor(d * 0.85));
      c.box(wx0, 32 - d, 18, wx1, 34 - d, 22, d > 22 ? LIGHT : TEAM);
      c.box(wx0, 30 + d, 18, wx1, 32 + d, 22, d > 22 ? LIGHT : TEAM);
    }
    c.box(16, 4, 18, 30, 8, 22, '#ece7bc');               // wingtip missiles…
    c.box(16, 56, 18, 30, 60, 22, '#ece7bc');
    c.box(10, 22, 22, 22, 26, 34, DARK);                  // twin tails
    c.box(10, 38, 22, 22, 42, 34, DARK);
    c.box(12, 22, 30, 20, 26, 34, TEAM);
    c.box(12, 38, 30, 20, 42, 34, TEAM);
    c.cylX(6, 14, 27, 20, 3.0, STEEL);                    // twin nozzles
    c.cylX(6, 14, 37, 20, 3.0, STEEL);
    const plume = pose?.action === 'move' ? [3, 6, 4][pose.frame % 3]
      : pose?.action === 'attack' ? 7 : 2;
    for (const py of [27, 37]) {
      for (let i = 0; i < plume; i++) c.box(4 - i, py - 1, 19, 5 - i, py + 2, 21, i % 2 ? '#ff8c3a' : '#ffe27a');
    }
    c.group('ammo');                                     // wingtip missiles,
    c.cylX(26, 38, 6, 20, 1.6, TRIM);                    // nosed proud of the
    c.cylX(26, 38, 58, 20, 1.6, TRIM);                   // rails so their
    c.put(38, 6, 20, '#ece7bc'); c.put(38, 58, 20, '#ece7bc'); // launch reads
    c.group('body');
    c.group('bay');
    c.box(24, 30, 13, 36, 34, 15, DARK);                 // ventral airbrake
    c.group('body');
  } else if (id === 'uav') {
    // Quad-rotor reconnaissance drone: sensor ball, four rotor booms.
    c.group('body');
    c.box(26, 26, 18, 38, 38, 26, DARK);                   // core body
    c.box(27, 27, 20, 37, 37, 27, TEAM);
    c.cylZ(32, 32, 12, 18, 4.0, STEEL);                    // gyro stabilised ball
    c.box(30, 30, 13, 35, 35, 17, GLASS);
    c.put(34, 32, 14, LIGHT);
    for (const [bx, by] of [[12, 12], [12, 48], [48, 12], [48, 48]]) {
      c.box(Math.min(bx, 32), Math.min(by, 32), 22, Math.max(bx, 32) + 2, Math.max(by, 32) + 2, 25, DARK); // booms
      c.cylZ(bx, by, 25, 29, 2.2, STEEL);                  // rotor masts
    }
    c.box(6, 30, 20, 12, 34, 26, TEAM);                    // tail vane + datalink
    c.box(4, 30, 26, 10, 34, 34, DARK);
    c.put(5, 32, 34, LIGHT);
    // Each rotor gets its OWN group + hub pivot: a shared group would yaw the
    // whole quad assembly about the airframe centre instead of spinning blades.
    for (const [bx, by] of [[12, 12], [12, 48], [48, 12], [48, 48]]) {
      c.group(`rotor${bx}-${by}`);
      c.box(bx - 8, by - 1, 29, bx + 10, by + 2, 31, '#344c41');
      c.box(bx - 1, by - 8, 29, bx + 2, by + 10, 31, '#344c41');
      c.put(bx, by, 31, LIGHT);
      c.pivot(`rotor${bx}-${by}`, [bx, by]);
    }
    c.group('rotorTail');
    c.box(4, 28, 30, 8, 36, 32, STEEL);                    // yaw vane (wobble)
    c.pivot('rotorTail', [32, 31]);
    c.group('body');
    if (pose?.action === 'move') {
      c.group('disc');
      for (const [bx, by] of [[12, 12], [12, 48], [48, 12], [48, 48]]) {
        for (let a = 0; a < 8; a++) {
          const t = (a / 8) * Math.PI * 2;
          c.put(Math.round(bx + Math.cos(t) * 9), Math.round(by + Math.sin(t) * 9), 30, '#8e9680');
        }
      }
      c.group('body');
    }
  } else if (id === 'mpa') {
    // Maritime patrol jet: high wing, nose radar, belly torpedo bay, MAD boom.
    c.group('body');
    c.cylX(10, 58, 32, 20, 5.4, TEAM);                     // long fuselage
    c.box(50, 27, 22, 62, 37, 26, GLASS);                  // cockpit band
    c.cylZ(58, 32, 14, 20, 4.6, METAL);                    // nose radar dome
    c.put(62, 32, 17, LIGHT);
    c.box(24, 8, 22, 44, 30, 26, TEAM);                    // high straight wings
    c.box(24, 34, 22, 44, 56, 26, TEAM);
    for (const py of [12, 50]) {                           // wing engines
      c.cylX(26, 40, py, 18, 3.4, STEEL);
      const plume = pose?.action === 'move' ? [2, 4, 3][pose.frame % 3] : 2;
      for (let i = 0; i < plume; i++) c.box(24 - i, py - 1, 17, 25 - i, py + 2, 19, i % 2 ? '#ff8c3a' : '#ffe27a');
    }
    c.box(6, 26, 22, 14, 38, 26, DARK);                    // tailplane + fin
    c.box(6, 30, 26, 16, 34, 40, DARK);
    c.box(8, 31, 32, 14, 33, 40, TEAM);
    c.cylX(2, 10, 32, 20, 1.6, STEEL);                     // MAD boom
    c.box(4, 24, 24, 10, 26, 30, DARK);                    // sonobuoy chutes
    c.box(4, 38, 24, 10, 40, 30, DARK);
    c.group('bay');
    c.box(30, 28, 25, 44, 36, 27, DARK);                   // dorsal chute doors
    c.box(30, 28, 27, 33, 36, 28, METAL);                  // hinge line
    c.group('ammo');
    c.cylX(30, 42, 32, 10, 2.2, STEEL);                    // torpedo half-recessed
    c.put(42, 32, 10, '#ece7bc');
    c.group('body');
  } else if (id === 'specter') {
    // Faceted stealth flying wing: internal bay, canted fins, dark coating.
    c.group('body');
    for (let d = 4; d <= 26; d += 2) {                     // blended wing body
      const wx0 = Math.max(8, 30 - Math.floor(d * 0.9));
      const wx1 = Math.max(wx0 + 10, 46 - Math.floor(d * 0.6));
      c.box(wx0, 32 - d, 18, wx1, 34 - d, 24, d > 20 ? DARK : TEAM);
      c.box(wx0, 30 + d, 18, wx1, 32 + d, 24, d > 20 ? DARK : TEAM);
    }
    c.box(20, 26, 18, 48, 38, 26, TEAM);                   // centre spine
    c.box(24, 28, 26, 44, 36, 28, DARK);                   // flush canopy strip
    c.box(38, 29, 26, 46, 35, 27, GLASS);
    c.box(10, 14, 24, 20, 18, 34, DARK);                   // canted fins
    c.box(10, 46, 24, 20, 50, 34, DARK);
    c.cylX(6, 14, 28, 20, 2.6, CHAR);                      // buried nozzles
    c.cylX(6, 14, 36, 20, 2.6, CHAR);
    const plume = pose?.action === 'move' ? [2, 3, 2][pose.frame % 3] : 1;
    for (const py of [28, 36]) {
      for (let i = 0; i < plume; i++) c.box(4 - i, py - 1, 19, 5 - i, py + 2, 21, i % 2 ? '#ff8c3a' : '#ffe27a');
    }
    c.group('bay');
    c.box(26, 29, 26, 40, 35, 29, CHAR);                   // dorsal speed-brake
    c.box(26, 29, 29, 29, 35, 30, METAL);                  // hinge
    c.group('ammo');
    for (const by of [30, 34]) c.cylX(28, 38, by, 13, 1.8, STEEL); // precision bombs
    c.group('body');
  } else {
    c.group('body');
    c.cylX(8, 56, 32, 21, 6.2, TEAM);                     // bomber fuselage
    c.box(46, 26, 22, 58, 38, 26, GLASS);                 // cockpit
    c.box(20, 26, 26, 48, 38, 28, LIGHT);
    for (let d = 6; d <= 28; d += 2) {                    // high-aspect wings
      const wx0 = Math.max(10, 36 - Math.floor(d * 0.75));
      const wx1 = Math.max(wx0 + 10, 48 - Math.floor(d * 0.75));
      c.box(wx0, 32 - d, 20, wx1, 34 - d, 24, TEAM);
      c.box(wx0, 30 + d, 20, wx1, 32 + d, 24, TEAM);
    }
    for (const py of [11, 20, 42, 51]) {                  // four jet pods
      c.cylX(24, 40, py, 15, 3.2, STEEL);
      c.cylX(38, 42, py, 15, 2.8, METAL);
      const plume = pose?.action === 'move' ? [2, 4, 3][pose.frame % 3] : 2;
      for (let i = 0; i < plume; i++) c.box(22 - i, py - 1, 14, 23 - i, py + 2, 16, i % 2 ? '#ff8c3a' : '#ffe27a');
    }
    c.box(6, 18, 22, 16, 46, 24, DARK);                   // tailplane
    c.box(6, 28, 24, 18, 36, 38, DARK);                   // tall fin
    c.box(8, 30, 30, 16, 34, 38, TEAM);
    c.group('bay');
    c.box(26, 29, 27, 44, 35, 29, DARK);                  // dorsal speed-brake
    c.box(26, 29, 29, 30, 35, 30, METAL);                 // panel + hinge
    for (const by of [16, 48]) c.box(31, by, 12, 35, by + 1, 20, DARK); // pylons
    c.group('ammo');                                     // outboard bombs hung
    for (const by of [16, 48]) {                         // below the pods so
      c.cylX(28, 40, by, 9, 2.2, STEEL);                 // every facing sees
      c.put(40, by, 9, '#ece7bc');                       // the drop
    }
    c.group('body');
  }
}

/* ------------------------------------------- Secret-Lab ground prototypes -- */
function bastionBody(c) {
  // Siege-heavy hull: layered plate, deep skirts, dozer-style glacis.
  c.group('body');
  c.box(6, 14, 6, 58, 50, 16, DARK);
  c.box(8, 12, 10, 56, 52, 20, TEAM);
  c.box(10, 14, 20, 54, 50, 22, LIGHT);                    // deck plate
  for (let x = 12; x < 52; x += 5) {                       // reactive armour blocks
    c.box(x, 10, 12, x + 3, 12, 18, PLATE);
    c.box(x, 52, 12, x + 3, 54, 18, PLATE);
  }
  c.box(50, 16, 12, 58, 48, 20, PLATE);                    // layered glacis
  c.box(52, 18, 16, 60, 46, 22, LIGHT);
  c.box(4, 16, 12, 8, 48, 18, STEEL);                      // rear exhaust bank
  for (let y = 18; y < 46; y += 4) c.put(5, y, 18, CHAR);
  c.box(54, 14, 14, 58, 18, 18, '#ece7bc');                // blackout lights
  c.box(54, 46, 14, 58, 50, 18, '#ece7bc');
}

function aegisBody(c) {
  c.group('body');
  c.box(10, 16, 6, 54, 48, 14, DARK);                     // chassis deck
  c.box(12, 14, 10, 52, 50, 18, TEAM);
  c.shell(38, 18, 14, 56, 46, 26, TEAM);                   // forward cab
  c.box(46, 20, 18, 56, 44, 24, GLASS);                    // panoramic glazing
  c.box(38, 18, 24, 52, 46, 26, LIGHT);
  c.box(12, 18, 14, 16, 46, 20, PLATE);                    // rear deck plate
  c.box(34, 30, 18, 38, 34, 34, STEEL);                    // radar mast
  c.box(32, 26, 34, 40, 38, 38, METAL);                    // rotating search array
  c.box(34, 28, 38, 38, 36, 40, LIGHT);
  for (let y = 20; y < 44; y += 6) c.put(14, y, 20, CHAR); // grille lines
}

/* --------------------------------------------------------------- sea units - */
function seaUnit(c, id, pose) {
  if (id === 'uhac') {
    // Ultra Heavy-lift Amphibious Connector: twin pontoons, a full-length
    // vehicle well and a bow ramp that drops toward the beach.
    c.group('body');
    for (const [y0, y1] of [[10, 24], [40, 54]]) {           // catamaran pontoons
      for (let x = 4; x < 60; x++) {
        const taper = x > 46 ? Math.floor((x - 46) * 0.5) : x < 10 ? Math.floor((10 - x) * 0.4) : 0;
        c.box(x, y0 + taper, 0, x + 1, y1 - taper, 8, SEA);
        c.box(x, y0 + 1 + taper, 8, x + 1, y1 - 1 - taper, 12, TEAM);
      }
    }
    c.box(8, 24, 6, 56, 40, 12, DARK);                      // well floor
    c.clearBox(14, 26, 8, 52, 38, 20);                      // open vehicle well
    c.box(14, 26, 4, 52, 38, 6, '#8e9c78');
    for (let x = 18; x < 50; x += 8) c.box(x, 26, 6, x + 4, 38, 8, '#6d7a62'); // deck cleats
    c.box(8, 22, 12, 56, 26, 18, TEAM);                     // well walls
    c.box(8, 38, 12, 56, 42, 18, TEAM);
    for (let x = 12; x < 54; x += 6) {                      // inwale ribbing
      c.put(x, 24, 18, LIGHT); c.put(x, 39, 18, LIGHT);
    }
    c.box(52, 24, 4, 62, 40, 8, '#5a4a2e');                 // bow ramp (dropped)
    c.box(54, 26, 8, 62, 38, 10, '#8e9c78');
    c.box(58, 26, 10, 62, 38, 11, LIGHT);
    c.group('upper');                                       // aft bridge block
    c.shell(6, 24, 12, 20, 40, 24, '#a79771');
    c.box(8, 26, 16, 18, 38, 20, GLASS);
    c.box(6, 24, 24, 18, 40, 26, LIGHT);
    c.box(10, 30, 26, 13, 34, 40, STEEL);                   // mast + crane kingpost
    c.box(9, 28, 34, 14, 36, 36, STEEL);
    c.box(14, 30, 34, 30, 34, 36, STEEL);
    c.pivot('upper', [12, 12]);
    c.group('body');
    c.box(24, 8, 12, 34, 10, 20, STEEL);                    // hull-side crane arms
    c.box(24, 54, 12, 34, 56, 20, STEEL);
    c.box(48, 8, 0, 58, 10, 2, FOAM);                       // waterline foam
    c.box(48, 54, 0, 58, 56, 2, FOAM);
    wake(c, 58, 4, 10, 54, pose);
    return;
  }
  if (id === 'submarine') {
    c.group('body');
    for (let x = 6; x <= 56; x++) {
      const t = Math.abs(x - 32) / 26;
      const r = Math.max(3.0, 8.4 * (1 - t * t * 0.65));
      c.cylX(x, x + 1, 32, 7, r, '#2e3f4a');
    }
    c.box(12, 26, 12, 50, 38, 16, '#4a6070');
    c.box(16, 28, 14, 46, 36, 16, TEAM);
    c.box(44, 18, 8, 52, 46, 10, STEEL);                 // bow dive planes
    c.box(4, 22, 6, 12, 42, 10, STEEL);                  // stern planes
    c.box(4, 30, 2, 12, 34, 18, DARK);
    c.box(24, 26, 16, 38, 38, 28, '#3a4f5e');            // sail
    c.box(26, 26, 22, 36, 38, 26, TEAM);
    c.box(30, 30, 28, 32, 34, 38, METAL);                // periscope
    c.box(30, 30, 36, 36, 34, 38, GLASS);
    c.group('hatch');
    c.box(44, 28, 14, 50, 36, 16, '#586064');            // deck tube hatch
    c.group('ammo');
    c.cylX(46, 58, 32, 15, 2.0, STEEL);                  // torpedo rides the deck
    c.put(58, 32, 15, '#ece7bc');
    c.group('body');
    wake(c, 56, 6, 24, 40, pose);
    return;
  }
  if (id === 'lander') {
    c.group('body');
    c.box(6, 18, 0, 56, 46, 8, SEA);
    c.box(8, 20, 8, 54, 44, 14, TEAM);
    c.clearBox(16, 24, 6, 50, 40, 14);                   // open vehicle well
    c.box(16, 24, 4, 50, 40, 6, '#8e9c78');
    for (let x = 20; x < 48; x += 8) c.box(x, 24, 6, x + 4, 40, 8, '#6d7a62');
    c.box(50, 22, 4, 60, 42, 14, '#5a4a2e');             // bow ramp
    c.box(52, 24, 8, 60, 40, 16, '#8e9c78');
    c.shell(8, 22, 14, 20, 42, 24, '#a79771');           // aft bridge
    c.box(16, 24, 18, 20, 40, 22, GLASS);
    c.box(8, 22, 24, 20, 42, 26, LIGHT);
    c.box(10, 24, 26, 14, 28, 32, STEEL);                // funnels
    c.box(10, 36, 26, 14, 40, 32, STEEL);
    c.group('body');
    wake(c, 58, 6, 18, 46, pose);
    return;
  }
  const len = id === 'gunboat' ? [10, 54] : [4, 60];
  c.group('body');
  for (let x = len[0]; x < len[1]; x++) {
    const bowTaper = x > 40 ? Math.floor((x - 40) * 0.65) : 0;
    const sternTaper = x < 12 ? Math.floor((12 - x) * 0.4) : 0;
    const half = Math.max(4, (id === 'battleship' ? 14 : 12) - Math.max(bowTaper, sternTaper));
    c.box(x, 32 - half, 0, x + 1, 32 + half, 8, SEA);
    c.box(x, 33 - half, 8, x + 1, 31 + half, 12, TEAM);
  }
  c.box(48, 22, 0, 58, 24, 2, FOAM);                     // waterline bow wave
  c.box(48, 40, 0, 58, 42, 2, FOAM);
  c.group('upper');
  c.shell(22, 24, 12, 38, 40, 22, '#d9d6b4');            // bridge
  c.box(24, 24, 16, 38, 40, 20, TEAM);
  c.box(34, 26, 18, 40, 38, 22, GLASS);
  c.box(24, 26, 22, 34, 38, 30, '#a79771');              // mast
  c.box(28, 30, 30, 32, 34, 40, STEEL);
  c.box(26, 26, 36, 34, 38, 38, LIGHT);
  c.pivot('upper', [30, 12]);
  c.group('body');
  if (id === 'gunboat') {
    c.cylZ(44, 32, 12, 18, 4.4, STEEL, 'turret');
    c.group('barrel');
    c.box(46, 30, 14, 62, 34, 16, GUN);                  // long bow gun…
    c.box(58, 29, 13, 62, 35, 17, STEEL);                // …with muzzle brake
    c.pivot('barrel', [46, 14]);
    c.group('body');
    c.pivot('turret', [44, 32]);
  } else if (id === 'cruiser') {
    c.group('hatch');
    c.box(40, 26, 12, 50, 38, 16, STEEL);                // VLS block
    c.box(46, 28, 16, 56, 36, 18, DARK);
    c.group('ammo');
    c.box(42, 30, 16, 46, 34, 24, TRIM);                 // missile rising
    c.group('body');
    c.box(10, 26, 12, 20, 38, 16, WHEEL);                // aft AA gun
    c.box(12, 28, 16, 20, 36, 22, STEEL);
  } else if (id === 'battleship') {
    c.group('turret');
    c.cylZ(45, 32, 12, 20, 6.2, STEEL);                  // fore main turret
    c.box(41, 28, 18, 49, 36, 22, LIGHT);
    c.pivot('turret', [45, 32]);
    c.group('barrel');
    for (const by of [28, 32, 36]) c.box(45, by, 16, 60, by + 2, 20, GUN);
    c.pivot('barrel', [45, 16]);
    c.group('body');
    c.cylZ(15, 32, 12, 20, 6.2, STEEL);                  // aft turret (static)
    c.box(11, 28, 18, 15, 36, 22, LIGHT);
    for (const by of [28, 32, 36]) c.box(4, by, 16, 15, by + 2, 20, GUN);
    c.cylZ(23, 32, 22, 34, 3.8, DARK);                   // armoured funnel
  }
  wake(c, len[1] - 2, len[0], 20, 44, pose);
}

/* ---------------------------------------------------------------- dispatch -- */
export function unitVoxels(c, id, pose) {
  if (id === 'infantry' || id === 'mech' || id === 'engineer' || id === 'medic' || id === 'rocket-infantry' || id === 'aa-infantry' || id === 'sniper') {
    footUnit(c, id, pose);
  } else if (id === 'copter' || id === 'lift-copter' || id === 'fighter' || id === 'bomber'
    || id === 'uav' || id === 'mpa' || id === 'specter') {
    airUnit(c, id, pose);
  } else if (['gunboat', 'cruiser', 'battleship', 'submarine', 'lander', 'uhac'].includes(id)) {
    seaUnit(c, id, pose);
  } else {
    groundVehicle(c, id, pose);
  }
}

/* --------------------------------------------------------- army deltas ----- */
/**
 * Voxel identity per army at 64³. Hull colours are fixed palette entries; the
 * owner-0 orange entries survive only on accents (stripe, insignia, wing
 * tips), so bake.mjs's team remap still produces all six owner variants.
 * Headgear voxels are regrouped into `upper` so the gait carries them.
 */
export const ARMY_VOXEL_STYLES = {
  allies: {
    hull: '#7d8a5a', light: '#a6b27a', dark: '#5a6642', plate: '#5f6c48',
    trim: '#dfe6ea', accent: '#df794b',
  },
  soviets: {
    hull: '#7a3b30', light: '#a85a48', dark: '#4d2520', plate: '#4d2520',
    trim: '#e0b94a', accent: '#df794b',
  },
  empire: {
    hull: '#cfc9b6', light: '#ece8d8', dark: '#8c8670', plate: '#a8a48c',
    trim: '#2f4a7a', accent: '#df794b',
  },
  legion: {
    hull: '#a58a5a', light: '#c4aa78', dark: '#6e5a38', plate: '#6e5a38',
    trim: '#2b2b2b', accent: '#df794b',
  },
};

const INFANTRY_UNITS = new Set(['infantry', 'mech', 'engineer', 'medic', 'rocket-infantry', 'aa-infantry', 'sniper']);
const AIR_UNITS = new Set(['copter', 'lift-copter', 'fighter', 'bomber', 'uav', 'mpa', 'specter']);
const SEA_UNITS = new Set(['submarine', 'gunboat', 'cruiser', 'battleship', 'lander', 'uhac']);

function voxelBounds(c) {
  let minX = 64, minY = 64, minZ = 64, maxX = -1, maxY = -1, maxZ = -1;
  for (const [x, y, z] of c.entries()) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {minX, minY, minZ, maxX, maxY, maxZ};
}

export function applyArmyDelta(c, id, armyId) {
  const S = ARMY_VOXEL_STYLES[armyId];
  if (!S) return;
  c.recolor({
    '#df794b': S.hull,
    '#ffc68b': S.light,
    '#934b32': S.dark,
    '#5e6a4e': S.plate,
  });
  const b = voxelBounds(c);
  const infantry = INFANTRY_UNITS.has(id);
  const air = AIR_UNITS.has(id);
  const sea = SEA_UNITS.has(id);
  const midX = Math.round((b.minX + b.maxX) / 2);
  const midY = Math.round((b.minY + b.maxY) / 2);
  const clampY = y => Math.max(0, Math.min(63, y));

  // Team accent stripe on both long sides (wings for aircraft) plus a deck
  // insignia: owner-0 palette entries so every seat variant really differs.
  const stripeZ = infantry ? 32 : air ? 18 : 12;
  c.paint((x, y, z) => (y === b.minY || y === b.maxY) &&
    x >= midX - 12 && x <= midX + 12 && z >= stripeZ && z <= stripeZ + 3, S.accent);
  c.paint((x, y, z) => Math.abs(x - midX) <= 2 && Math.abs(y - midY) <= 2 &&
    z >= stripeZ && z <= stripeZ + 3, S.accent);

  if (armyId === 'allies') {
    if (infantry) {
      // Round helmet: wide rim + domed crown, carried by the gait.
      c.group('upper');
      c.box(18, 20, 36, 38, 44, 38, S.plate);
      c.box(22, 24, 42, 34, 40, 46, S.hull);
      c.put(midX, midY, 45, S.accent);
      c.group('body');
    } else {
      c.box(b.maxX, clampY(midY - 6), 10, Math.min(63, b.maxX + 4), clampY(midY + 6), 16, S.hull);
      c.box(b.maxX + 2, clampY(midY - 4), 16, Math.min(63, b.maxX + 6), clampY(midY + 4), 18, S.hull);
      for (const [x, y, z, col] of c.entries()) {
        if (col === GUN && x > b.maxX - 18 && y % 4 === 0) c.del(x, y, z);
      }
      c.box(b.minX + 6, midY, 18, b.minX + 8, midY + 2, 26, S.trim);
      c.put(b.minX + 6, midY, 26, S.accent);
      if (air) {
        c.box(b.maxX - 18, b.minY, 22, b.maxX - 12, b.minY + 2, 28, S.hull);
        c.box(b.maxX - 18, b.maxY - 2, 22, b.maxX - 12, b.maxY, 28, S.hull);
      } else if (sea) {
        c.box(Math.min(63, b.maxX + 2), clampY(midY - 4), 4, Math.min(63, b.maxX + 4), clampY(midY + 4), 10, S.hull);
      }
    }
  } else if (armyId === 'soviets') {
    if (infantry) {
      c.group('upper');
      c.box(18, 20, 36, 40, 44, 40, S.plate);            // fur hat
      c.box(20, 22, 40, 38, 42, 46, S.hull);
      c.put(midX, midY, 45, S.accent);
      c.group('body');
    } else if (air) {
      // Aircraft keep clear skins: wingtip endplates + stripes only, so bomb
      // racks, bays and control surfaces stay visible and animatable.
      c.box(b.minX + 4, clampY(b.minY - 2), 10, b.maxX - 4, clampY(b.minY + 2), 18, S.plate);
      c.box(b.minX + 4, clampY(b.maxY - 2), 10, b.maxX - 4, clampY(b.maxY + 2), 18, S.plate);
    } else if (sea) {
      // Ships keep clear decks: a sail/deckhouse accent only, so hatches,
      // torpedoes and gun arcs stay visible and animatable.
      for (const [x, y, z, col] of c.entries()) {
        if (col === GUN && x > midX && !c.has(x, y + 2, z)) c.put(x, y + 2, z, GUN);
      }
      c.box(midX - 6, clampY(midY - 6), 12, midX + 6, clampY(midY + 6), 14, S.hull);
      c.put(midX, midY, 14, S.accent);
    } else {
      c.box(b.minX + 4, clampY(b.minY - 2), 10, b.maxX - 4, clampY(b.minY + 2), 18, S.plate);
      c.box(b.minX + 4, clampY(b.maxY - 2), 10, b.maxX - 4, clampY(b.maxY + 2), 18, S.plate);
      c.box(b.minX + 6, b.minY + 6, 18, b.maxX - 6, b.maxY - 6, 22, S.plate);
      for (const [x, y, z, col] of c.entries()) {
        if (col === GUN && x > midX && !c.has(x, y + 2, z)) c.put(x, y + 2, z, GUN);
      }
      c.box(midX - 4, clampY(midY - 4), 22, midX + 6, clampY(midY + 4), 26, S.hull);
    }
  } else if (armyId === 'empire') {
    if (infantry) {
      c.group('upper');
      c.box(20, 22, 40, 38, 42, 46, S.hull);            // peaked cap
      c.box(34, 24, 38, 42, 40, 40, S.plate);
      c.put(midX, midY, 45, S.accent);
      c.group('body');
    } else if (air) {
      c.box(b.minX + 8, b.minY, 18, b.maxX - 8, clampY(b.minY + 2), 22, S.hull);
      c.box(b.minX + 8, clampY(b.maxY - 2), 18, b.maxX - 8, b.maxY, 22, S.hull);
      c.box(b.maxX - 14, b.minY, 18, b.maxX - 10, clampY(b.minY + 2), 28, S.trim);
      c.box(b.maxX - 14, clampY(b.maxY - 2), 18, b.maxX - 10, b.maxY, 28, S.trim);
      c.box(midX - 2, midY - 2, b.maxZ, midX + 2, midY + 2, Math.min(62, b.maxZ + 4), S.trim);
    } else if (sea) {
      c.box(midX - 6, midY - 6, 12, midX + 6, midY + 6, 22, S.hull);
      c.box(midX - 4, midY - 4, 22, midX + 4, midY + 4, 28, S.light);
      c.box(midX - 2, midY - 2, 28, midX + 2, midY + 2, 34, S.trim);
      c.box(Math.min(63, b.maxX + 2), clampY(midY - 4), 4, Math.min(63, b.maxX + 4), clampY(midY + 4), 10, S.hull);
      c.box(b.minX, clampY(midY - 6), 10, b.maxX, clampY(midY + 6), 12, S.trim);
    } else {
      for (const [x, y] of [[b.minX, b.minY], [b.minX, b.maxY], [b.maxX, b.minY], [b.maxX, b.maxY]]) {
        for (let z = 10; z <= 18; z++) c.del(x, y, z);
      }
      c.box(b.minX + 6, clampY(b.minY + 2), 18, b.maxX - 6, clampY(b.maxY - 2), 20, S.light);
      c.box(b.maxX - 8, clampY(midY - 4), 18, b.maxX - 2, clampY(midY + 4), 20, S.trim);
    }
  } else if (armyId === 'legion') {
    if (infantry) {
      c.group('upper');
      c.paint((x, y, z) => z === 38 && x >= 22 && x <= 38 && y >= 22 && y <= 42, S.accent);
      c.box(18, 24, 36, 22, 30, 40, S.accent);          // bandana knot
      c.group('body');
    } else {
      // Deck planks are ground-vehicle furniture: on ships and aircraft the
      // bounds-derived boxes would bury gun barrels and bomb racks.
      if (!air && !sea) {
        c.box(b.minX + 4, b.minY, 10, b.minX + 14, b.maxY, 16, S.plate);
        c.box(b.maxX - 14, b.minY, 10, b.maxX - 6, b.maxY, 16, S.hull);
        c.box(b.minX + 2, clampY(b.minY + 4), 18, b.minX + 6, clampY(b.minY + 8), 24, '#8c6b42');
        c.box(b.minX + 2, clampY(b.maxY - 8), 18, b.minX + 6, clampY(b.maxY - 4), 24, '#8c6b42');
        c.box(b.maxX - 8, clampY(midY - 4), 10, b.maxX - 2, clampY(midY + 4), 14, '#c8b084');
      }
      if (id === 'recon' || id === 'apc' || id === 'tank') {
        c.clearBox(midX - 6, midY - 6, 24, midX + 6, midY + 6, 30);
      }
      if (air || sea) {
        c.box(b.minX + 4, clampY(b.minY + 4), 16, b.minX + 8, clampY(b.minY + 8), 22, '#8c6b42');
      }
    }
  }

  // Guarantee a visible owner-0 accent patch on exposed top voxels so every
  // team variant differs in the bake (an interior accent would bake identical).
  {
    const all = c.entries().filter(([x, y, z]) => !c.has(x, y, z + 1))
      .sort((a, bb) => bb[2] - a[2]);
    const pick = all.find(([x, y, z]) => z === all[0]?.[2] && Math.abs(x - midX) <= 8 && Math.abs(y - midY) <= 8)
      ?? all[0];
    if (pick) {
      const [px, py, pz] = pick;
      c.paint((x, y, z) => z === pz && Math.abs(x - px) <= 2 && Math.abs(y - py) <= 2, S.accent);
    }
  }
  if (!c.entries().some(([, , , col]) => col === S.accent)) {
    const top = c.entries().filter(([x, y, z]) => !c.has(x, y, z + 1)).sort((a, bb) => bb[2] - a[2])[0];
    if (top) c.put(top[0], top[1], top[2], S.accent);
  }
}
