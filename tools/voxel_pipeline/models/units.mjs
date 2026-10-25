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
function attackDogUnit(c) {
  const FUR = '#8c6b42', FUR_D = '#4a3520', FUR_L = '#c4a06a', MUZZLE = '#2b221a';
  // Diagonal gait leg pairs so standard foot poseOps animate a natural 4-leg trot.
  c.group('legL');
  c.box(37, 22, 0, 42, 27, 3, MUZZLE);                 // front-left paw
  c.box(37, 23, 3, 41, 27, 12, FUR);                   // front-left leg
  c.box(15, 37, 0, 20, 42, 3, MUZZLE);                 // rear-right paw
  c.box(15, 37, 3, 20, 41, 12, FUR);                   // rear-right leg
  c.group('legR');
  c.box(37, 37, 0, 42, 42, 3, MUZZLE);                 // front-right paw
  c.box(37, 37, 3, 41, 41, 12, FUR);                   // front-right leg
  c.box(15, 22, 0, 20, 27, 3, MUZZLE);                 // rear-left paw
  c.box(15, 23, 3, 20, 27, 12, FUR);                   // rear-left leg
  // Canine torso, K9 tactical vest, upright tail, neck, head, and pointed ears.
  c.group('upper');
  c.box(14, 24, 11, 43, 40, 20, FUR);                  // muscular body
  c.box(16, 25, 16, 38, 39, 22, FUR_D);                // dark Shepherd saddle
  c.box(36, 25, 10, 44, 39, 18, FUR_L);                // deep chest
  // K9 tactical harness & team saddle panels
  c.box(25, 23, 12, 37, 41, 23, TEAM);
  c.box(27, 23, 15, 35, 41, 21, LIGHT);
  c.box(29, 30, 23, 33, 34, 25, STEEL);                // leash D-ring + K9 beacon
  // Upright alert tail
  c.box(10, 30, 16, 15, 34, 22, FUR_D);
  c.box(7, 30, 20, 12, 34, 27, FUR_D);
  // Muscular neck + spiked/armored collar
  c.box(38, 26, 17, 46, 38, 26, FUR);
  c.box(39, 25, 18, 44, 39, 23, DARK);
  c.put(42, 24, 21, LIGHT); c.put(42, 40, 21, LIGHT);
  // Head skull & tall pointed Shepherd ears
  c.box(41, 25, 23, 50, 39, 32, FUR);
  c.box(43, 26, 28, 50, 38, 32, FUR_D);
  c.box(41, 24, 32, 46, 28, 39, FUR_D);                // left pointed ear
  c.box(41, 36, 32, 46, 40, 39, FUR_D);                // right pointed ear
  c.box(43, 25, 33, 45, 27, 37, FUR_L);
  c.box(43, 37, 33, 45, 39, 37, FUR_L);
  c.put(49, 27, 29, '#ffe27a');                        // alert eyes
  c.put(49, 36, 29, '#ffe27a');
  c.pivot('upper', [28, 14]);
  // Snout and snapping jaws in `weapon` group so attack frames lunge forward.
  c.group('weapon');
  c.box(49, 27, 24, 58, 37, 29, MUZZLE);               // upper snout
  c.box(56, 29, 27, 60, 35, 30, '#12181a');            // black nose
  c.box(48, 28, 21, 57, 36, 24, FUR_D);                // lower jaw
  c.put(55, 29, 24, '#f2f4ef');                        // canine fangs
  c.put(55, 35, 24, '#f2f4ef');
  c.pivot('weapon', [46, 24]);
  c.group('body');
}

function footUnit(c, id, pose) {
  if (id === 'attack-dog') {
    attackDogUnit(c, pose);
    return;
  }
  const isMech = id === 'mech', isEng = id === 'engineer', isMed = id === 'medic';
  const isRocket = id === 'rocket-infantry', isAA = id === 'aa-infantry', isSniper = id === 'sniper';
  const isGren = id === 'grenadier', isFlame = id === 'flamethrower', isDemo = id === 'demolitionist';
  const isCmdo = id === 'commando', isOff = id === 'officer', isSpy = id === 'spy';
  const isHero = id === 'elite-hero', isScout = id === 'scout';
  const vest = isMech || isRocket || isGren ? PLATE
    : isAA || isFlame ? '#4a5245'
    : isSniper || isScout ? '#5e6a4e'
    : isDemo ? '#3b4732'
    : isCmdo ? '#2b3128'
    : isSpy ? '#3a4048'
    : isMed ? '#d8dede'
    : TEAM;
  // Legs: separated boots + trousers, tagged for the gait.
  c.group('legL');
  c.box(20, 20, 0, 27, 29, 3, RUBBER);
  c.box(21, 21, 3, 26, 29, 14, isSpy ? '#2b3138' : isCmdo ? '#2b3128' : TRACK);
  c.box(20, 20, 12, 27, 29, 14, isOff || isHero ? '#e8c468' : DARK);
  c.group('legR');
  c.box(20, 35, 0, 27, 44, 3, RUBBER);
  c.box(21, 35, 3, 26, 43, 14, isSpy ? '#2b3138' : isCmdo ? '#2b3128' : TRACK);
  c.box(20, 35, 12, 27, 44, 14, isOff || isHero ? '#e8c468' : DARK);
  // Upper body: pelvis, torso, pack, arms, head — one rigid group.
  c.group('upper');
  c.box(20, 20, 14, 27, 44, 18, isSpy ? '#3a4048' : DARK); // pelvis + belt
  if (isOff || isSpy) {
    // Long trench-coat / command greatcoat skirts extending down over the hips
    c.box(18, 19, 10, 28, 45, 18, isSpy ? '#3a4048' : DARK);
  }
  if (isDemo || isFlame) {
    // Heavy protective blast / fire apron over the front pelvis
    c.box(26, 22, 10, 29, 42, 19, isFlame ? '#3b4238' : STEEL);
  }
  c.box(19, 20, 18, 28, 44, 30, vest);                 // torso
  c.box(21, 22, 22, 28, 42, 30, isSpy ? '#4a535c' : TEAM); // chest panel
  c.box(24, 26, 30, 27, 38, 31, isOff || isHero ? '#e8c468' : LIGHT); // collar
  if (isGren) {
    // Diagonal bandolier of 4 fragmentation grenades + heavy blast pauldrons
    c.box(20, 14, 24, 28, 20, 31, STEEL);              // left blast pauldron
    c.box(20, 44, 24, 28, 50, 31, STEEL);              // right blast pauldron
    for (let i = 0; i < 4; i++) {
      const gy = 23 + i * 5;
      const gz = 20 + (i % 2) * 3;
      c.box(27, gy, gz, 30, gy + 3, gz + 4, '#4a5245');
      c.put(29, gy + 1, gz + 4, '#e8c468');
    }
  }
  if (isOff) {
    // Golden officer epaulettes and diagonal command sash
    c.box(21, 15, 28, 28, 22, 32, '#e8c468');
    c.box(21, 42, 28, 28, 49, 32, '#e8c468');
    c.box(27, 24, 20, 29, 40, 28, '#e8c468');
    c.box(28, 26, 26, 30, 30, 29, '#d94b38');          // medal ribbon
  }
  if (isHero) {
    // Oversized tiered power-armor shoulder pauldrons + golden chest crest
    c.box(19, 11, 22, 29, 20, 33, TEAM);
    c.box(19, 44, 22, 29, 53, 33, TEAM);
    c.box(20, 11, 31, 28, 20, 34, '#e8c468');
    c.box(20, 44, 31, 28, 53, 34, '#e8c468');
    c.box(27, 24, 22, 30, 40, 29, '#e8c468');          // golden eagle breastplate
  }
  if (isEng) {
    c.box(12, 22, 18, 19, 42, 32, CANVAS_C);        // charge pack
    c.box(13, 24, 24, 15, 40, 30, '#4a5245');
    c.box(9, 26, 24, 12, 30, 28, '#e8c468');        // detonator caps
    c.box(12, 32, 32, 18, 38, 34, STEEL);           // strap buckle
  } else if (isMed) {
    c.box(14, 24, 18, 19, 40, 28, '#dfe6ea');       // aid satchel
    c.box(15, 30, 28, 18, 34, 29, '#d94b38');       // red cross
    c.box(16, 26, 22, 17, 38, 24, '#d94b38');
  } else if (isRocket) {
    c.box(13, 22, 18, 19, 42, 30, '#4a5245');       // RPG quiver pack
    c.box(14, 25, 30, 18, 29, 36, '#5e6a4e');       // spare rocket tube L
    c.box(14, 35, 30, 18, 39, 36, '#5e6a4e');       // spare rocket tube R
    c.box(14, 25, 36, 18, 29, 39, '#d94b38');       // spare warhead tip L
    c.box(14, 35, 36, 18, 39, 39, '#d94b38');       // spare warhead tip R
  } else if (isAA) {
    c.box(12, 22, 18, 19, 42, 31, STEEL);           // MANPADS battery & IFF pack
    c.box(13, 24, 31, 17, 28, 44, GUN);             // vertical whip radar mast
    c.box(12, 23, 44, 18, 29, 46, '#e8c468');       // sensor tip
    c.box(13, 34, 31, 18, 40, 35, '#5fc4e8');       // coolant cell
  } else if (isSniper) {
    c.box(15, 22, 18, 19, 42, 30, '#4a5245');       // ghillie camo cloak
    c.box(13, 24, 20, 16, 40, 28, '#5e6a4e');       // camo foliage strips
    c.box(18, 16, 26, 28, 48, 31, '#4a5245');       // ghillie shoulder cape
  } else if (isGren) {
    c.box(12, 21, 18, 19, 43, 31, CANVAS_C);        // grenade drum rucksack
    c.cylZ(15, 26, 31, 36, 3.2, STEEL);             // spare 40mm drum canister L
    c.cylZ(15, 38, 31, 36, 3.2, STEEL);             // spare 40mm drum canister R
    c.box(13, 24, 36, 17, 40, 38, '#e8c468');
  } else if (isFlame) {
    // Prominent twin vertical pressurized fuel cylinders + hazard bands
    c.cylZ(14, 25, 16, 37, 4.2, '#d94b38');         // left fuel tank
    c.cylZ(14, 39, 16, 37, 4.2, '#d94b38');         // right fuel tank
    c.cylZ(14, 25, 24, 28, 4.4, '#e8c468');         // hazard stripe L
    c.cylZ(14, 39, 24, 28, 4.4, '#e8c468');         // hazard stripe R
    c.cylZ(14, 32, 20, 34, 3.0, '#5fc4e8');         // central propellant tank
    c.box(12, 23, 37, 17, 41, 40, STEEL);           // pressure manifold + valves
  } else if (isDemo) {
    // Heavy explosives rucksack with C4 bricks, red dynamite & plunger handle
    c.box(10, 20, 17, 19, 44, 34, '#4a5245');
    c.box(9, 22, 20, 13, 30, 31, '#c8b084');        // strapped C4 blocks
    c.box(9, 34, 20, 13, 42, 31, '#d94b38');        // dynamite charges
    c.box(13, 29, 34, 16, 35, 41, STEEL);           // T-plunger shaft
    c.box(12, 25, 41, 17, 39, 43, '#e8c468');       // T-plunger handle
  } else if (isCmdo) {
    c.box(13, 23, 19, 19, 41, 31, '#2b3128');       // spec-ops assault pack
    c.box(12, 20, 22, 16, 26, 29, '#8c6b42');       // grappling rope coil
    c.box(14, 36, 31, 17, 40, 41, '#c8ccd0');       // angled combat machete blade
  } else if (isOff) {
    c.box(15, 25, 19, 19, 39, 29, '#6b5a3a');       // leather command case
    c.box(15, 26, 29, 17, 28, 42, METAL);           // command whip aerial
  } else if (isSpy) {
    // Upturned high trench-coat collar; no bulky field pack
    c.box(18, 22, 29, 26, 42, 34, '#2b3138');
  } else if (isHero) {
    // Full-length flowing heroic cape / mantle with gold border
    c.box(13, 16, 7, 19, 48, 31, DARK);
    c.box(12, 18, 9, 16, 46, 29, TEAM);
    c.box(12, 16, 7, 17, 48, 9, '#e8c468');         // golden cape hem
  } else if (isScout) {
    c.box(13, 23, 18, 19, 41, 30, '#4a5245');       // forward-observer radio pack
    c.box(14, 25, 30, 16, 27, 49, STEEL);           // tall long-range whip antenna
    c.box(13, 24, 49, 17, 28, 51, '#e8c468');       // high-vis antenna tip
    c.box(12, 24, 15, 19, 40, 18, '#5e6a4e');       // rolled scout bedroll
  } else {
    c.box(14, 24, 18, 19, 40, 30, isMech ? STEEL : CANVAS_C); // field pack
    c.box(14, 26, 30, 18, 38, 31, DARK);
  }
  c.box(22, 16, 20, 28, 20, 30, isSpy ? '#3a4048' : TEAM); // left arm
  c.box(22, 44, 20, 28, 48, 30, isSpy ? '#3a4048' : TEAM); // right arm
  c.box(26, 38, 22, 32, 44, 26, SKIN);              // hands
  c.box(22, 24, 30, 28, 40, 38, SKIN);              // head
  c.box(26, 26, 32, 28, 38, 34, '#e8c468');         // face shade
  // Headgear per specialist role
  if (isCmdo) {
    // Slanted elite crimson/team beret + quad-tube green night-vision goggles
    c.box(20, 21, 38, 29, 44, 43, '#a83228');
    c.box(21, 24, 43, 28, 43, 45, TEAM);
    c.box(27, 25, 33, 33, 39, 37, '#2b3128');       // NVG housing
    c.box(31, 26, 34, 34, 31, 36, '#7eb06a');       // glowing NVG left tubes
    c.box(31, 33, 34, 34, 38, 36, '#7eb06a');       // glowing NVG right tubes
  } else if (isOff) {
    // High-peaked military officer visor cap with golden cockade
    c.box(21, 22, 37, 32, 42, 39, '#1e2226');       // glossy visor peak
    c.box(20, 22, 39, 29, 42, 42, DARK);            // cap band
    c.box(18, 20, 42, 31, 44, 46, TEAM);            // wide flared officer crown
    c.box(28, 30, 40, 32, 34, 45, '#e8c468');       // golden officer crest
  } else if (isSpy) {
    // Wide-brimmed covert fedora hat + dark sunglasses
    c.box(17, 18, 37, 33, 46, 39, '#2b3138');       // wide fedora brim
    c.box(20, 22, 39, 29, 42, 41, TEAM);            // hatband
    c.box(20, 23, 41, 29, 41, 46, '#3a4048');       // pinched fedora crown
    c.box(27, 25, 33, 30, 39, 36, '#12181a');       // dark sunglasses
  } else if (isHero) {
    // Heroic crested battle helmet with golden T-visor & side wings
    c.box(20, 21, 36, 30, 43, 45, TEAM);
    c.box(22, 30, 44, 31, 34, 49, '#e8c468');       // tall heroic crest fin
    c.box(27, 25, 32, 31, 39, 37, '#e8c468');       // golden faceplates
    c.box(28, 27, 33, 32, 37, 36, '#5fc4e8');       // glowing T-visor
  } else if (isScout) {
    // Soft wide-brim recon boonie hat + comms headset
    c.box(18, 19, 36, 31, 45, 38, '#5e6a4e');
    c.box(21, 23, 38, 28, 41, 43, '#4a5245');
    c.box(23, 24, 38, 27, 40, 40, TEAM);
    c.box(22, 40, 32, 27, 44, 37, STEEL);           // comms earcup
  } else {
    c.box(20, 22, 36, 29, 42, 40, isSniper ? '#4a5245' : DARK); // helmet rim / boonie brim
    c.box(21, 23, 40, 28, 41, 44, isSniper ? '#5e6a4e' : TEAM); // helmet crown
    c.box(24, 26, 44, 27, 37, 45, isSniper ? '#4a5245' : LIGHT);
    if (isMech || isRocket || isDemo) c.box(27, 26, 32, 30, 38, 36, GLASS); // blast visor
    if (isFlame) {
      c.box(26, 25, 31, 32, 39, 37, STEEL);         // full respirator mask
      c.box(29, 27, 33, 33, 37, 36, '#5fc4e8');     // faceplate lens
    }
    if (isAA) {
      c.box(27, 25, 32, 31, 39, 36, '#5fc4e8');     // AA targeting HUD visor
      c.box(22, 41, 32, 27, 44, 37, STEEL);         // earcup comms
    }
    if (isSniper) {
      c.box(18, 20, 36, 31, 44, 38, '#4a5245');     // wide ghillie hood brim
      c.box(27, 28, 33, 30, 36, 35, DARK);          // camo face veil
    }
  }
  c.pivot('upper', [24, 16]);
  // Weapon group (also the engineer's tools / medic's litter).
  c.group('weapon');
  if (isMech) {
    c.cylX(12, 54, 45, 31, 3.4, STEEL);             // bazooka tube
    c.cylX(50, 56, 45, 31, 4.2, DARK);
    c.cylX(10, 16, 45, 31, 4.0, METAL);
    c.box(36, 40, 24, 42, 46, 30, GUN);
  } else if (isRocket) {
    c.cylX(12, 50, 44, 31, 2.8, '#4a5245');         // RPG launch tube
    c.cylX(8, 14, 44, 31, 3.8, GUN);                // flared exhaust bell
    c.cylX(48, 56, 44, 31, 4.2, '#d94b38');         // oversized shaped-charge warhead
    c.cylX(55, 60, 44, 31, 2.2, '#e8c468');         // piezo fuse probe
    c.box(34, 41, 24, 40, 46, 30, GUN);             // pistol grip
  } else if (isAA) {
    c.box(10, 41, 28, 56, 49, 36, '#4a5245');       // rectangular MANPADS box launcher
    c.box(52, 40, 27, 58, 50, 37, STEEL);           // front seeker housing
    c.box(57, 42, 29, 60, 48, 35, '#5fc4e8');       // IR seeker dome
    c.box(44, 37, 24, 52, 41, 33, METAL);           // side IFF antenna array
    c.box(34, 41, 22, 42, 47, 28, '#e8c468');       // battery coolant unit
  } else if (isSniper) {
    c.box(26, 38, 24, 44, 42, 28, '#4a5245');       // precision rifle chassis
    c.box(44, 38, 25, 61, 40, 27, GUN);             // long free-floated barrel
    c.box(59, 37, 24, 63, 41, 28, STEEL);           // heavy muzzle brake
    c.box(33, 37, 29, 49, 41, 33, GUN);             // high-power telescopic scope
    c.box(48, 37, 29, 50, 41, 33, '#5fc4e8');       // scope objective lens
    c.box(50, 36, 18, 53, 42, 25, STEEL);           // deployed folding bipod
  } else if (isGren) {
    // 6-shot revolving drum grenade launcher + raised quadrant sight
    c.box(26, 38, 23, 36, 43, 28, DARK);            // launcher stock
    c.cylX(34, 45, 41, 25, 4.4, STEEL);             // oversized 6-chamber revolving drum
    c.cylX(44, 57, 41, 26, 2.8, GUN);               // heavy large-bore grenade barrel
    c.box(54, 38, 24, 58, 44, 29, '#e8c468');       // brass muzzle ring
    c.box(38, 39, 29, 43, 42, 34, METAL);           // flip-up quadrant arc sight
  } else if (isFlame) {
    // Flexible fuel hose from backpack + twin-tube flamethrower wand + pilot flame
    c.box(16, 45, 19, 34, 49, 23, RUBBER);          // armoured fuel feed hose
    c.box(30, 38, 22, 48, 45, 28, STEEL);           // flamethrower valve body
    c.cylX(46, 58, 41, 26, 2.4, GUN);               // main fuel projector barrel
    c.box(46, 39, 22, 57, 43, 24, '#e8c468');       // lower igniter rod
    c.box(57, 39, 24, 61, 43, 29, '#ff8c3a');       // glowing pilot flame cone
    c.box(60, 40, 25, 63, 42, 28, '#ffe27a');       // white-hot flame tip
  } else if (isDemo) {
    // Heavy shaped-charge breaching satchel + remote detonator clacker
    c.box(28, 12, 22, 36, 18, 29, '#4a5245');       // detonator clacker in left hand
    c.box(31, 14, 29, 34, 16, 33, '#d94b38');       // armed red beacon
    c.box(32, 34, 20, 52, 46, 31, '#c8b084');       // heavy C4 breaching satchel
    c.box(34, 33, 22, 50, 47, 29, '#d94b38');       // red explosive booster bands
    c.box(38, 36, 31, 46, 44, 34, '#e8c468');       // brass timer & fuse assembly
  } else if (isCmdo) {
    // Heavy suppressed bullpup carbine + drum mag + laser sight
    c.box(26, 38, 23, 46, 43, 29, '#2b3128');       // black bullpup receiver
    c.cylX(34, 41, 41, 20, 3.2, STEEL);             // high-capacity drum mag
    c.box(34, 38, 29, 44, 43, 33, METAL);           // holographic optic
    c.cylX(46, 61, 40, 26, 2.2, STEEL);             // long cylindrical sound suppressor
    c.box(46, 42, 27, 52, 45, 30, '#d94b38');       // laser designator module
  } else if (isOff) {
    // Raised field binoculars + extended command pistol / saber
    c.box(28, 14, 26, 38, 22, 31, '#2b3128');       // binoculars in left hand
    c.box(36, 14, 27, 39, 22, 30, '#5fc4e8');       // binocular lenses
    c.box(30, 38, 24, 40, 43, 29, '#e8c468');       // golden hilt / pistol grip
    c.box(38, 39, 26, 56, 42, 29, '#c8ccd0');       // gleaming command saber / barrel
  } else if (isSpy) {
    // Covert intelligence briefcase in left hand + silenced pistol in right
    c.box(22, 11, 11, 35, 17, 22, '#5a4430');       // leather intelligence briefcase
    c.box(26, 12, 22, 31, 16, 24, '#e8c468');       // brass handle & clasps
    c.box(30, 38, 24, 42, 42, 28, '#2b3138');       // compact pistol frame
    c.cylX(42, 55, 40, 26, 1.8, '#1e2226');         // long covert silencer
  } else if (isHero) {
    // Twin-barrel heavy rotary plasma/vulcan carbine + energy coils
    c.box(26, 35, 22, 48, 46, 31, STEEL);           // heavy weapon housing
    c.box(32, 36, 17, 44, 45, 22, '#e8c468');       // golden ammo cassette
    c.box(34, 36, 31, 46, 45, 34, '#5fc4e8');       // glowing plasma coils
    c.cylX(46, 62, 38, 25, 2.0, GUN);               // left rotary barrel
    c.cylX(46, 62, 43, 25, 2.0, GUN);               // right rotary barrel
    c.box(56, 36, 23, 61, 45, 29, '#e8c468');       // muzzle clamp
  } else if (isScout) {
    // Large rangefinder binoculars held forward + compact slung carbine
    c.box(28, 27, 28, 46, 42, 34, '#2b3128');       // dual-barrel rangefinder binoculars
    c.box(44, 28, 29, 48, 33, 33, '#5fc4e8');       // left objective lens
    c.box(44, 36, 29, 48, 41, 33, '#5fc4e8');       // right objective lens
    c.box(30, 41, 20, 50, 45, 25, GUN);             // slung compact scout carbine
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
  const wheeled = id === 'recon' || id === 'rockets' || id === 'missiles' || id === 'aegis'
    || id === 'supply-truck' || id === 'command-vehicle';
  const wide = id === 'mega' || id === 'heavy' || id === 'bastion'
    || id === 'tank-destroyer';
  const x0 = wide ? 4 : 8, x1 = wide ? 60 : 56;
  const yL = wide ? 10 : 14, yR = wide ? 54 : 50;

  if (wheeled) {
    const threeAxle = id === 'rockets' || id === 'supply-truck' || id === 'command-vehicle';
    wheels(c, threeAxle ? [16, 30, 46] : [18, 46], yL, yR);
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
  } else if (id === 'ifv') {
    // Infantry Fighting Vehicle: sloped armored troop hull with side firing
    // ports, rear troop ramp, offset 2-man turret, 30mm autocannon + side ATGM pod.
    c.shell(10, 18, 18, 48, 46, 26, TEAM);
    c.box(12, 20, 26, 46, 44, 28, LIGHT);
    c.box(8, 22, 12, 12, 42, 25, PLATE);                    // rear troop ramp
    for (const px of [16, 24, 32]) {                        // side vision blocks & firing ports
      c.box(px, 17, 21, px + 4, 19, 24, GLASS);
      c.box(px, 45, 21, px + 4, 47, 24, GLASS);
      c.put(px + 1, 17, 19, CHAR);
      c.put(px + 1, 46, 19, CHAR);
    }
    c.group('turret');
    c.cylZ(32, 32, 28, 35, 8.2, TEAM);                      // faceted 2-man IFV turret
    c.cylZ(32, 32, 35, 37, 6.0, LIGHT);
    c.box(25, 40, 30, 37, 46, 36, PLATE);                   // side ATGM twin launcher box
    c.put(37, 42, 33, '#d94b38');
    c.put(37, 44, 33, '#d94b38');
    c.box(28, 26, 37, 34, 32, 40, GLASS);                   // commander thermal sight
    c.pivot('turret', [32, 32]);
    c.group('barrel');
    c.box(38, 30, 31, 60, 34, 34, GUN);                     // rapid-fire 30mm autocannon
    c.box(40, 29, 30, 48, 35, 35, STEEL);                   // barrel cage
    c.box(57, 29, 30, 61, 35, 35, DARK);                    // flash suppressor
    c.pivot('barrel', [38, 32]);
    c.group('body');
  } else if (id === 'supply-truck') {
    // 6x6 military logistics truck: high cab-over-engine front cab + flatbed
    // with olive canvas supply tilt, ammo crates, and team fuel drums.
    c.shell(40, 18, 18, 56, 46, 32, TEAM);                  // high front cab
    c.box(42, 20, 32, 54, 44, 34, LIGHT);                   // cab roof
    c.box(50, 20, 22, 57, 44, 29, GLASS);                   // wide windshield
    c.box(38, 20, 18, 40, 24, 34, STEEL);                   // exhaust stack
    c.box(8, 16, 16, 40, 48, 20, PLATE);                    // cargo flatbed + sideboards
    // Ribbed olive canvas canopy over forward half of bed
    c.shell(22, 18, 20, 39, 46, 33, '#8c8458');
    for (const rx of [23, 28, 33, 38]) {
      c.box(rx, 17, 20, rx + 2, 47, 34, '#6e6642');         // canvas rib bows
    }
    // Exposed rear cargo deck with ammo crates & vertical fuel drums
    c.box(10, 19, 20, 21, 31, 28, '#a68246');               // wooden ammo crate
    c.box(10, 19, 23, 21, 31, 25, '#6e542a');
    c.cylZ(14, 39, 20, 30, 3.6, '#d94b38');                 // red fuel drum 1
    c.cylZ(14, 39, 24, 26, 3.7, '#e8c468');
    c.cylZ(20, 39, 20, 30, 3.6, TEAM);                      // team supply drum 2
  } else if (id === 'mobile-repair') {
    // Armored engineering recovery & field-repair vehicle: forward crew cab
    // with amber hazard beacons, rear welding/tool deck, and A-frame crane boom.
    c.shell(34, 18, 18, 54, 46, 30, TEAM);                  // forward armored cab
    c.box(48, 20, 22, 55, 44, 27, GLASS);                   // cab armored glass
    c.box(36, 20, 30, 50, 44, 32, LIGHT);
    c.box(42, 22, 32, 46, 26, 36, '#ff9c38');               // left amber beacon
    c.box(42, 38, 32, 46, 42, 36, '#ff9c38');               // right amber beacon
    // Rear engineering work deck with red tool cabinets & welding gas cylinders
    c.box(10, 18, 18, 34, 26, 27, '#b8382c');               // red tool cabinet
    c.box(12, 17, 20, 32, 19, 25, STEEL);                   // drawer pulls
    c.cylZ(14, 41, 18, 30, 2.8, '#4fa8d8');                 // oxygen cylinder
    c.cylZ(21, 41, 18, 30, 2.8, '#d94b38');                 // acetylene cylinder
    c.cylY(30, 26, 38, 22, 4.2, STEEL);                     // heavy recovery winch drum
    // Articulated hazard-yellow A-frame crane boom extending aft/upward
    for (let s = 0; s < 14; s++) {
      const bx = 34 - s * 2;
      const bz = 24 + Math.floor(s * 1.15);
      c.box(bx, 27, bz, bx + 4, 30, bz + 3, '#e5b93c');
      c.box(bx, 34, bz, bx + 4, 37, bz + 3, '#e5b93c');
      if (s % 3 === 0) c.box(bx, 27, bz, bx + 3, 37, bz + 3, STEEL);
    }
    c.box(6, 29, 38, 12, 35, 42, STEEL);                    // crane sheave head
    c.box(8, 31, 26, 10, 33, 38, CHAR);                     // hoist cable
    c.box(7, 30, 22, 11, 34, 26, '#e5b93c');                // heavy hook block
  } else if (id === 'command-vehicle') {
    // 6x6 Mobile Command Vehicle (C4I HQ): tall armored command van body,
    // tactical map-room windows, rooftop satcom radome, and rotating radar mast.
    c.shell(10, 16, 18, 54, 48, 32, TEAM);                  // full-length command van
    c.box(12, 18, 32, 52, 46, 34, LIGHT);                   // command deck roof
    c.box(48, 19, 22, 56, 45, 29, GLASS);                   // armored cab windshield
    for (const wx of [16, 26, 36]) {                        // side C4I battle-staff windows
      c.box(wx, 15, 23, wx + 6, 17, 28, GLASS);
      c.box(wx, 47, 23, wx + 6, 49, 28, GLASS);
    }
    c.box(12, 18, 34, 22, 46, 38, PLATE);                   // rooftop HVAC / generator pack
    c.cylZ(29, 32, 34, 41, 5.8, '#e6ecee');                 // white satcom dome
    c.cylZ(29, 32, 41, 43, 3.8, '#ffffff');
    c.box(40, 29, 34, 46, 35, 42, STEEL);                   // radar pedestal mast
    c.box(38, 18, 42, 48, 46, 46, '#bbc4c8');               // planar C4I radar array
    c.box(42, 20, 43, 44, 44, 45, TEAM);
    c.box(14, 18, 34, 16, 20, 50, METAL);                   // dual whip antennas
    c.box(14, 44, 34, 16, 46, 50, METAL);
    c.put(14, 18, 50, '#ff4b38');
    c.put(14, 44, 50, '#ff4b38');
  } else if (id === 'mine-layer') {
    // Tracked Mine-Laying Vehicle: armored forward cab, open rear mine magazine
    // holding stacked rows of anti-tank mines, and dual stern deployment chutes.
    c.shell(36, 18, 18, 54, 46, 30, TEAM);                  // forward armored cab
    c.box(38, 20, 30, 52, 44, 32, LIGHT);
    c.box(48, 20, 22, 55, 44, 28, GLASS);
    c.box(44, 29, 32, 48, 35, 36, '#e8c468');               // hazard beacon
    // Open-topped rear mine magazine bay with side rails
    c.box(10, 16, 18, 36, 20, 26, PLATE);
    c.box(10, 44, 18, 36, 48, 26, PLATE);
    c.box(10, 20, 18, 36, 44, 20, DARK);
    // Visible rows of circular olive/yellow anti-tank mines in magazine
    for (const mx of [15, 23, 31]) {
      for (const my of [26, 38]) {
        c.cylZ(mx, my, 20, 25, 3.4, '#4a5245');
        c.cylZ(mx, my, 25, 27, 2.2, '#e8c468');
        c.put(mx, my, 27, '#d94b38');
      }
    }
    // Dual angled stern mine-laying chute ramps descending to ground level
    for (const cy of [22, 36]) {
      for (let s = 0; s < 8; s++) {
        c.box(4 + s, cy, 6 + s * 2, 8 + s, cy + 6, 10 + s * 2, s % 2 === 0 ? '#e5b93c' : STEEL);
      }
    }
  } else if (id === 'tank-destroyer') {
    // Turretless Casemate Tank Destroyer (Jagdpanzer / StuG silhouette):
    // wide low-profile sloped superstructure, side armor skirts, heavy cast
    // gun mantlet, and extra-long high-velocity anti-tank cannon.
    c.box(6, 10, 10, 56, 15, 18, PLATE);                    // left schurzen skirt
    c.box(6, 49, 10, 56, 54, 18, PLATE);                    // right schurzen skirt
    c.shell(10, 15, 16, 42, 49, 28, TEAM);                  // low wide casemate
    c.ramp(34, 48, 16, 48, 16, 12, 14, LIGHT);              // sharply raked glacis roof
    c.box(14, 18, 28, 38, 46, 30, LIGHT);                   // low casemate roof
    c.cylZ(22, 24, 30, 33, 3.2, DARK);                      // low periscope hatch
    c.box(10, 20, 20, 14, 44, 26, STEEL);                   // rear ammo-loading hatch
    c.group('turret');
    c.box(38, 25, 20, 48, 39, 30, STEEL);                   // heavy Saukopf cast mantlet
    c.box(40, 27, 22, 50, 37, 28, DARK);
    c.pivot('turret', [42, 32]);
    c.group('barrel');
    c.cylX(44, 63, 32, 25, 2.6, GUN);                       // extra-long HV AT gun barrel
    c.box(52, 29, 22, 56, 35, 28, STEEL);                   // mid-barrel bore evacuator
    c.box(59, 28, 21, 63, 36, 29, DARK);                    // heavy T-muzzle brake
    c.pivot('barrel', [44, 25]);
    c.group('body');
  } else if (id === 'flame-tank') {
    // Flame Tank: armored assault hull with twin oversized red napalm fuel
    // drums + yellow hazard bands on the rear flanks and a shrouded flame projector.
    for (const fy of [16, 48]) {                            // external pressurized napalm tanks
      c.cylX(8, 28, fy, 23, 4.4, '#d94b38');
      c.box(13, fy - 4, 19, 16, fy + 4, 27, '#e8c468');     // hazard band 1
      c.box(21, fy - 4, 19, 24, fy + 4, 27, '#e8c468');     // hazard band 2
      c.box(26, fy - 2, 21, 34, fy + 2, 25, STEEL);         // armored fuel feed pipe
    }
    c.box(10, 22, 18, 26, 42, 26, PLATE);                   // rear armored fuel manifold
    c.group('turret');
    c.cylZ(32, 32, 18, 29, 9.6, TEAM);                      // compact flame turret
    c.cylZ(32, 32, 29, 31, 7.0, LIGHT);
    c.box(28, 28, 31, 36, 36, 34, '#d94b38');               // pressurized turret dome
    c.pivot('turret', [32, 32]);
    c.group('barrel');
    c.cylX(38, 56, 32, 25, 3.4, STEEL);                     // heavy shrouded flame projector
    c.box(52, 28, 21, 58, 36, 29, DARK);                    // igniter cage shroud
    c.box(58, 29, 22, 62, 35, 28, '#ff7730');               // pilot flame jet
    c.box(60, 30, 23, 63, 34, 27, '#ffd84a');               // white-hot flame core
    c.pivot('barrel', [38, 25]);
    c.group('body');
  } else if (id === 'amphibious-tank') {
    // Amphibious Light Tank (PT-76 / AAV silhouette): boat-hull V-bow with
    // raised trim vane, side buoyancy sponsons with waterline stripe, stern waterjets.
    c.box(12, 14, 12, 52, 19, 19, TEAM);                     // left buoyancy pontoon
    c.box(12, 45, 12, 52, 50, 19, TEAM);                     // right buoyancy pontoon
    c.box(14, 14, 14, 50, 16, 16, FOAM);                     // waterline plimsoll mark L
    c.box(14, 48, 14, 50, 50, 16, FOAM);                     // waterline plimsoll mark R
    c.ramp(44, 55, 16, 48, 12, 9, 11, LIGHT);                // boat-shaped bow + splash vane
    c.box(51, 18, 18, 56, 46, 24, PLATE);                    // erected bow surf-breaker board
    c.box(8, 19, 10, 12, 26, 16, CHAR);                      // left stern water-jet nozzle
    c.box(8, 38, 10, 12, 45, 16, CHAR);                      // right stern water-jet nozzle
    c.box(18, 20, 19, 22, 24, 34, STEEL);                    // amphibious snorkel mast
    c.group('turret');
    c.cylZ(31, 32, 18, 27, 9.2, TEAM);                       // low-profile dish turret
    c.cylZ(31, 32, 27, 29, 6.8, LIGHT);
    c.pivot('turret', [31, 32]);
    c.group('barrel');
    c.cylX(38, 56, 32, 24, 2.2, GUN);                        // stabilized 76mm gun
    c.box(52, 30, 22, 56, 34, 26, STEEL);
    c.pivot('barrel', [38, 24]);
    c.group('body');
  } else if (id === 'mine-clearing') {
    // Heavy Armored Mine-Clearing Vehicle: reinforced engineering hull,
    // roof MICLIC line-charge launcher tub, and massive front V-shaped toothed mine plow.
    c.clearBox(46, 16, 6, 56, 48, 19);                       // trim front nose for plow mount
    c.shell(12, 16, 18, 44, 48, 30, TEAM);                   // reinforced engineering hull
    c.box(14, 18, 30, 42, 46, 32, LIGHT);
    c.box(38, 22, 22, 46, 42, 28, GLASS);                    // armored driver vision blocks
    c.box(16, 22, 32, 34, 42, 39, PLATE);                    // rooftop line-charge rocket tub
    c.box(18, 24, 39, 32, 40, 41, '#e5b93c');                // hazard-striped tub lid
    // Heavy hydraulic lift booms projecting from the front glacis
    c.box(42, 20, 8, 54, 25, 15, STEEL);
    c.box(42, 39, 8, 54, 44, 15, STEEL);
    // Massive angled V-shaped steel mine plow with hazard chevrons & digger teeth
    for (let s = 0; s < 9; s++) {
      const px = 61 - s;
      const yOff = s * 2;
      c.box(px - 3, 30 - yOff, 3, px + 1, 34 - yOff, 16, s % 2 === 0 ? STEEL : '#e5b93c');
      c.box(px - 3, 30 + yOff, 3, px + 1, 34 + yOff, 16, s % 2 === 0 ? STEEL : '#e5b93c');
      // Bottom steel ripper teeth skimming the ground (z=0..4)
      c.box(px, 30 - yOff, 0, px + 2, 33 - yOff, 4, GUN);
      c.box(px, 31 + yOff, 0, px + 2, 34 + yOff, 4, GUN);
    }
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
  } else if (id === 'ground-attack-jet') {
    // Close-Air-Support Attack Jet (A-10 Warthog / Su-25 Frogfoot silhouette):
    // straight plank wings with 4 weapon pylons, high-mounted twin turbofan
    // engine pods on the aft spine, H-tail twin fins, and heavy rotary nose gun.
    c.group('body');
    c.cylX(10, 54, 32, 20, 4.8, TEAM);                     // armored fuselage
    c.cylX(50, 58, 32, 19, 3.4, LIGHT);                    // sloped nose cone
    c.box(56, 30, 16, 63, 34, 20, GUN);                    // 30mm GAU-8 rotary nose cannon
    c.box(38, 28, 23, 50, 36, 28, GLASS);                  // armored bathtub canopy
    // Straight unswept low-aspect attack wings with upturned wingtip fairings
    c.box(26, 4, 18, 40, 60, 22, TEAM);
    c.box(28, 4, 22, 38, 60, 23, LIGHT);
    c.box(25, 2, 18, 41, 6, 25, DARK);                     // left wingtip pod
    c.box(25, 58, 18, 41, 62, 25, DARK);                   // right wingtip pod
    // Twin high-mounted dorsal turbofan nacelles (signature A-10 silhouette)
    for (const ey of [22, 42]) {
      c.cylX(14, 28, ey, 26, 4.2, STEEL);
      c.cylX(26, 30, ey, 26, 3.6, METAL);
      const plume = pose?.action === 'move' ? [3, 5, 4][pose.frame % 3] : 2;
      for (let i = 0; i < plume; i++) {
        c.box(12 - i, ey - 1, 25, 13 - i, ey + 2, 27, i % 2 ? '#ff8c3a' : '#ffe27a');
      }
    }
    // H-tail twin vertical stabilizers at ends of wide tailplane
    c.box(6, 18, 20, 16, 46, 23, DARK);                    // horizontal tailplane
    c.box(6, 16, 18, 16, 20, 33, TEAM);                    // left H-tail fin
    c.box(6, 44, 18, 16, 48, 33, TEAM);                    // right H-tail fin
    c.group('bay');
    c.box(26, 29, 24, 37, 35, 28, DARK);                    // dorsal speed-brake
    c.box(28, 8, 14, 38, 14, 18, DARK);                     // split wing-tip airbrakes
    c.box(28, 50, 14, 38, 56, 18, DARK);
    c.group('ammo');
    for (const py of [14, 21, 43, 50]) {                   // underwing rocket pods & AGMs
      c.cylX(26, 42, py, 14, 2.0, TRIM);
      c.put(42, py, 14, '#d94b38');
    }
    c.group('body');
  } else if (id === 'transport-plane') {
    // Heavy 4-Engine Military Airlifter (C-130 / C-17 silhouette):
    // wide deep cargo fuselage, rear loading ramp, high-mounted wings with
    // 4 underwing engine pods, and a tall T-tail empennage.
    c.group('body');
    c.shell(10, 22, 12, 54, 42, 28, TEAM);                 // wide cargo hold fuselage
    c.box(14, 24, 28, 50, 40, 30, LIGHT);                  // fuselage crown
    c.box(50, 24, 14, 58, 40, 26, TEAM);                   // bulbous nose radome
    c.box(56, 27, 16, 61, 37, 22, DARK);                   // weather radar cone
    c.box(48, 24, 20, 56, 40, 26, GLASS);                  // flight-deck wrap windshield
    c.box(6, 24, 14, 14, 40, 26, PLATE);                   // upswept rear cargo ramp
    c.box(16, 20, 12, 38, 44, 17, DARK);                   // main landing gear sponsons
    // High-mounted wide transport wings spanning y=2..62
    c.box(26, 2, 25, 40, 62, 29, TEAM);
    c.box(28, 4, 29, 38, 60, 30, LIGHT);
    // Four underwing turbofan/turboprop nacelles
    for (const py of [10, 19, 45, 54]) {
      c.cylX(26, 42, py, 21, 3.0, STEEL);
      c.box(41, py - 2, 19, 44, py + 2, 23, METAL);
      const plume = pose?.action === 'move' ? [2, 4, 3][pose.frame % 3] : 2;
      for (let i = 0; i < plume; i++) {
        c.box(24 - i, py - 1, 20, 25 - i, py + 2, 22, i % 2 ? '#ff8c3a' : '#ffe27a');
      }
    }
    // Tall T-tail vertical stabilizer + high horizontal tailplane
    c.box(6, 29, 26, 16, 35, 42, DARK);
    c.box(8, 30, 30, 14, 34, 41, TEAM);
    c.box(4, 18, 41, 14, 46, 44, TEAM);                    // T-tail top stabilizer
  } else if (id === 'stealth-fighter') {
    // Angular Stealth Tactical Fighter (F-22 Raptor / F-35 silhouette,
    // distinct from flying-wing bomber `specter`): chined diamond fuselage,
    // gold-tinted canopy, diamond wings, outward-canted V-tails, 2D vector nozzles.
    const RAM = '#2c343b', RAM_L = '#424c56';
    c.group('body');
    c.box(10, 25, 17, 56, 39, 24, RAM);                    // chined stealth fuselage
    c.box(52, 28, 18, 61, 36, 22, RAM_L);                  // sharp diamond nose
    c.box(16, 27, 24, 48, 37, 26, TEAM);                   // dorsal team stealth panel
    c.box(36, 28, 24, 50, 36, 29, '#e8c468');              // gold-tinted stealth canopy
    // Diamond trapezoidal wings with sawtooth team leading/trailing trim
    for (let d = 6; d <= 26; d += 2) {
      const wx0 = 16 + Math.floor(d * 0.35);
      const wx1 = 44 - Math.floor(d * 0.55);
      c.box(wx0, 32 - d, 19, wx1, 34 - d, 22, d > 22 ? TEAM : RAM);
      c.box(wx0, 30 + d, 19, wx1, 32 + d, 22, d > 22 ? TEAM : RAM);
    }
    // Outward-canted twin V-tails + horizontal stabilators
    c.box(6, 16, 18, 16, 48, 21, RAM_L);
    for (let z = 0; z < 12; z++) {
      const yOff = Math.floor(z * 0.5);
      c.box(8 + Math.floor(z * 0.3), 23 - yOff, 22 + z, 18, 26 - yOff, 24 + z, z > 8 ? TEAM : RAM);
      c.box(8 + Math.floor(z * 0.3), 38 + yOff, 22 + z, 18, 41 + yOff, 24 + z, z > 8 ? TEAM : RAM);
    }
    // Rectangular 2D thrust-vectoring exhaust nozzles
    c.box(6, 27, 18, 12, 31, 22, STEEL);
    c.box(6, 33, 18, 12, 37, 22, STEEL);
    const plume = pose?.action === 'move' ? [3, 6, 4][pose.frame % 3]
      : pose?.action === 'attack' ? 7 : 2;
    for (const py of [28, 34]) {
      for (let i = 0; i < plume; i++) c.box(4 - i, py, 19, 5 - i, py + 2, 21, i % 2 ? '#5fc4e8' : '#ffe27a');
    }
    c.group('bay');
    c.box(24, 29, 26, 36, 35, 29, RAM_L);                   // dorsal stealth speed-brake
    c.box(24, 26, 13, 40, 38, 16, RAM_L);                   // ventral internal weapons bay doors
    c.group('ammo');
    for (const my of [22, 42]) {
      c.cylX(26, 42, my, 15, 1.8, TRIM);                    // internal bay AAM missiles
      c.put(42, my, 15, '#d94b38');
    }
    c.group('body');
  } else if (id === 'spy-plane') {
    // High-Altitude Strategic Reconnaissance Jet (U-2 / SR-71 hybrid):
    // ultra-slender dark needle fuselage, full-span glider wings with sensor
    // pods, dorsal satcom hump, and ventral electro-optical camera bay.
    const BLACK = '#232830', CHINE = '#38404c';
    c.group('body');
    c.cylX(6, 60, 32, 20, 3.6, BLACK);                     // slender needle fuselage
    c.box(8, 26, 19, 58, 38, 21, CHINE);                   // lateral stealth chines
    c.box(56, 30, 19, 63, 34, 21, TEAM);                   // pitot nose spear
    c.box(42, 29, 22, 52, 35, 26, GLASS);                  // pressurized high-altitude cockpit
    c.box(24, 29, 23, 38, 35, 27, TEAM);                   // dorsal satcom hump fairing
    c.box(40, 29, 14, 52, 35, 17, '#5fc4e8');              // ventral optical/SLAR camera window
    // Ultra-high-aspect-ratio glider wings spanning y=0..64 with wingtip sensor pods
    c.box(26, 0, 19, 36, 64, 22, BLACK);
    c.box(28, 2, 22, 34, 62, 23, TEAM);
    c.cylX(22, 40, 2, 20, 2.2, CHINE);                     // left wingtip ELINT pod
    c.cylX(22, 40, 61, 20, 2.2, CHINE);                    // right wingtip ELINT pod
    // Twin inward-canted vertical tail fins + single afterburner nozzle
    c.box(6, 24, 21, 16, 27, 33, BLACK);
    c.box(6, 37, 21, 16, 40, 33, BLACK);
    c.box(8, 24, 29, 14, 27, 33, TEAM);
    c.box(8, 37, 29, 14, 40, 33, TEAM);
    c.cylX(4, 10, 32, 20, 3.0, STEEL);
    const plume = pose?.action === 'move' ? [4, 7, 5][pose.frame % 3] : 2;
    for (let i = 0; i < plume; i++) {
      c.box(2 - i, 30, 19, 3 - i, 34, 21, i % 2 ? '#ff8c3a' : '#ffe27a');
    }
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
  if (id === 'carrier') {
    // Full-Deck Aircraft Carrier (Nimitz / Queen Elizabeth flattop silhouette):
    // wide overhanging angled flight deck with runway markings & bow ski-jump,
    // starboard-only island superstructure with radar mast, and parked strike jets.
    c.group('body');
    for (let x = 2; x < 62; x++) {
      const bowTaper = x > 46 ? Math.floor((x - 46) * 0.5) : 0;
      const sternTaper = x < 10 ? Math.floor((10 - x) * 0.3) : 0;
      const half = Math.max(6, 15 - Math.max(bowTaper, sternTaper));
      c.box(x, 32 - half, 0, x + 1, 32 + half, 9, SEA);
      c.box(x, 33 - half, 9, x + 1, 31 + half, 13, TEAM);
    }
    // Wide overhanging flight deck (y=11..53) with dark non-skid surface
    c.box(4, 11, 13, 60, 53, 16, '#363c3a');
    c.box(52, 16, 15, 62, 34, 18, '#363c3a');              // bow ski-jump / catapult ramp
    c.box(4, 11, 15, 60, 13, 16, '#e8c468');               // port deck safety stripe
    c.box(4, 51, 15, 60, 53, 16, TEAM);                    // starboard team trim
    for (let x = 8; x < 58; x += 6) {
      c.box(x, 23, 16, x + 4, 25, 17, '#ece7bc');          // angled runway centerline dashes
    }
    // Starboard-only island superstructure (y=42..52)
    c.group('upper');
    c.shell(22, 42, 16, 38, 52, 28, '#d9d6b4');
    c.box(24, 42, 20, 36, 52, 24, TEAM);
    c.box(32, 40, 22, 39, 50, 26, GLASS);                  // bridge + pri-fly windows
    c.box(26, 44, 28, 34, 50, 36, STEEL);                  // island radar mast
    c.box(24, 42, 36, 36, 52, 39, LIGHT);                  // planar air-search radar
    c.pivot('upper', [30, 16]);
    c.group('hatch');
    c.box(40, 10, 13, 50, 16, 16, STEEL);                  // port deck-edge aircraft elevator
    c.group('ammo');
    // Miniature strike jet poised on bow catapult track (launches forward on attack)
    c.box(38, 21, 16, 48, 27, 19, TEAM);
    c.box(40, 17, 17, 45, 31, 18, LIGHT);
    c.box(46, 23, 17, 50, 25, 19, GLASS);
    c.group('body');
    // Second parked strike jet aft on starboard deck
    c.box(10, 34, 16, 20, 40, 19, LIGHT);
    c.box(12, 30, 17, 17, 44, 18, TEAM);
    c.box(48, 12, 0, 58, 14, 2, FOAM);
    c.box(48, 50, 0, 58, 52, 2, FOAM);
    wake(c, 60, 2, 12, 52, pose);
    return;
  }
  if (id === 'naval-repair') {
    // Naval Repair & Salvage Tender: broad auxiliary hull, forward bridge with
    // amber beacons, midships machine-shop deck, and twin tall yellow gantry cranes.
    c.group('body');
    for (let x = 6; x < 58; x++) {
      const bowTaper = x > 44 ? Math.floor((x - 44) * 0.6) : 0;
      const half = Math.max(5, 13 - bowTaper);
      c.box(x, 32 - half, 0, x + 1, 32 + half, 8, SEA);
      c.box(x, 33 - half, 8, x + 1, 31 + half, 13, TEAM);
    }
    c.box(8, 21, 13, 52, 43, 14, '#8e9680');               // steel work deck
    c.group('upper');
    c.shell(38, 22, 14, 50, 42, 25, '#d9d6b4');            // forward bridge house
    c.box(46, 24, 18, 51, 40, 22, GLASS);
    c.box(40, 24, 25, 48, 40, 27, LIGHT);
    c.box(42, 25, 27, 46, 29, 31, '#ff9c38');              // port amber beacon
    c.box(42, 35, 27, 46, 39, 31, '#ff9c38');              // starboard amber beacon
    c.pivot('upper', [44, 14]);
    c.group('body');
    // Midships machine shop, red tool containers, and welding gas tanks
    c.box(26, 23, 14, 36, 31, 21, '#b8382c');              // red repair container
    c.cylZ(30, 38, 14, 23, 2.8, '#4fa8d8');                // oxygen tank
    c.cylZ(24, 38, 14, 23, 2.8, '#e8c468');                // acetylene tank
    // Twin heavy lattice gantry crane kingposts & hazard-yellow jib booms
    c.box(18, 21, 14, 22, 25, 34, STEEL);                  // port crane tower
    c.box(18, 39, 14, 22, 43, 34, STEEL);                  // starboard crane tower
    c.box(18, 21, 32, 22, 43, 35, '#e5b93c');              // gantry crossbeam
    for (let s = 0; s < 8; s++) {
      c.box(18 - s * 2, 22, 28 + Math.floor(s * 0.8), 21 - s * 2, 25, 31 + Math.floor(s * 0.8), '#e5b93c');
      c.box(18 - s * 2, 39, 28 + Math.floor(s * 0.8), 21 - s * 2, 42, 31 + Math.floor(s * 0.8), '#e5b93c');
    }
    c.box(4, 23, 20, 6, 25, 34, CHAR);                     // port hoist cable
    c.box(4, 39, 20, 6, 41, 34, CHAR);                     // starboard hoist cable
    c.box(3, 22, 17, 7, 26, 21, '#e5b93c');                // hook block L
    c.box(3, 38, 17, 7, 42, 21, '#e5b93c');                // hook block R
    wake(c, 56, 6, 19, 45, pose);
    return;
  }
  if (id === 'mine-layer-ship') {
    // Naval Mine-Laying Vessel: broad-transom minelayer hull, forward bridge,
    // twin stern mine rails loaded with 6 horned naval mines, and transom chutes.
    c.group('body');
    for (let x = 6; x < 58; x++) {
      const bowTaper = x > 42 ? Math.floor((x - 42) * 0.65) : 0;
      const half = Math.max(5, 13 - bowTaper);
      c.box(x, 32 - half, 0, x + 1, 32 + half, 8, SEA);
      c.box(x, 33 - half, 8, x + 1, 31 + half, 13, TEAM);
    }
    c.box(6, 20, 13, 50, 44, 14, DARK);                    // recessed mine deck
    c.box(8, 19, 13, 38, 22, 18, PLATE);                   // port mine-deck bulwark
    c.box(8, 42, 13, 38, 45, 18, PLATE);                   // starboard bulwark
    c.group('upper');
    c.shell(38, 23, 14, 50, 41, 24, '#d9d6b4');            // forward bridge
    c.box(46, 25, 18, 51, 39, 22, GLASS);
    c.box(40, 25, 24, 48, 39, 26, LIGHT);
    c.box(42, 30, 26, 46, 34, 36, STEEL);                  // navigation mast
    c.pivot('upper', [44, 14]);
    c.group('body');
    // Twin parallel steel mine tracks running aft to stern transom chutes
    c.box(4, 25, 12, 36, 28, 15, STEEL);
    c.box(4, 36, 12, 36, 39, 15, STEEL);
    // Six horned spherical naval contact mines on the twin rails
    for (const mx of [12, 22, 32]) {
      for (const my of [26, 37]) {
        c.cylZ(mx, my, 15, 21, 3.2, '#2b3128');
        c.cylZ(mx, my, 17, 19, 3.5, '#e8c468');
        c.put(mx, my, 21, '#d94b38');                      // top contact horn
        c.put(mx + 3, my, 18, '#d94b38');
        c.put(mx - 3, my, 18, '#d94b38');
      }
    }
    // Stern hazard-striped mine deployment ramps over transom
    c.box(3, 24, 8, 8, 29, 14, '#e5b93c');
    c.box(3, 35, 8, 8, 40, 14, '#e5b93c');
    wake(c, 56, 6, 19, 45, pose);
    return;
  }
  const len = (id === 'gunboat' || id === 'missile-boat') ? [10, 54] : [4, 60];
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
  } else if (id === 'destroyer') {
    // Sleek Multi-Role Guided-Missile Destroyer (Arleigh Burke / Type 45):
    // faceted stealthy deckhouse, fore rapid-fire 5-inch turret + gun,
    // midships angled Harpoon anti-ship canisters, and aft helipad + torpedo tubes.
    c.group('turret');
    c.box(43, 28, 12, 50, 36, 18, STEEL);                // faceted stealth gun cupola
    c.box(44, 29, 18, 49, 35, 20, LIGHT);
    c.pivot('turret', [46, 32]);
    c.group('barrel');
    c.box(48, 31, 15, 61, 33, 18, GUN);                  // high-elevation 5-inch naval gun
    c.pivot('barrel', [48, 15]);
    c.group('body');
    // Angled midships quad anti-ship missile canisters + aft helipad marking
    for (let s = 0; s < 5; s++) {
      c.box(16 + s * 2, 22, 12 + s, 20 + s * 2, 28, 15 + s, PLATE);
      c.box(16 + s * 2, 36, 12 + s, 20 + s * 2, 42, 15 + s, PLATE);
    }
    c.box(6, 25, 12, 15, 39, 13, '#363c3a');             // aft ASW helipad deck
    c.box(8, 29, 13, 13, 35, 14, '#ece7bc');             // helipad H circle
  } else if (id === 'missile-boat') {
    // Fast Attack Missile Corvette (Osa / Tarantul silhouette):
    // bow rotary CIWS gun + twin oversized angled anti-ship missile box launchers aft.
    c.cylZ(45, 32, 12, 18, 3.6, STEEL);                  // bow rotary gun dome
    c.box(47, 31, 14, 54, 33, 16, GUN);
    c.group('hatch');
    for (const my of [21, 37]) {                         // twin oversized angled ASM boxes
      for (let s = 0; s < 6; s++) {
        c.box(10 + s * 2, my, 12 + s, 16 + s * 2, my + 6, 17 + s, s === 5 ? DARK : TEAM);
      }
    }
    c.group('ammo');
    for (const my of [23, 39]) {                         // emerging anti-ship missiles
      c.cylX(20, 30, my + 1, 20, 2.0, TRIM);
      c.put(30, my + 1, 20, '#d94b38');
    }
    c.group('body');
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

const INFANTRY_UNITS = new Set([
  'infantry', 'mech', 'engineer', 'medic', 'rocket-infantry', 'aa-infantry', 'sniper',
  'grenadier', 'flamethrower', 'demolitionist', 'commando', 'officer', 'spy',
  'elite-hero', 'attack-dog', 'scout',
]);
const CUSTOM_HEADGEAR_UNITS = new Set([
  'commando', 'officer', 'spy', 'elite-hero', 'attack-dog', 'scout',
]);

const AIR_UNITS = new Set([
  'copter', 'lift-copter', 'fighter', 'bomber', 'uav', 'mpa', 'specter',
  'ground-attack-jet', 'transport-plane', 'stealth-fighter', 'spy-plane',
]);
const SEA_UNITS = new Set([
  'submarine', 'gunboat', 'cruiser', 'battleship', 'lander', 'uhac',
  'destroyer', 'missile-boat', 'carrier', 'naval-repair', 'mine-layer-ship',
]);

/* ---------------------------------------------------------------- dispatch -- */
export function unitVoxels(c, id, pose) {
  if (INFANTRY_UNITS.has(id)) {
    footUnit(c, id, pose);
  } else if (AIR_UNITS.has(id)) {
    airUnit(c, id, pose);
  } else if (SEA_UNITS.has(id)) {
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

  if (id === 'attack-dog') {
    c.group('upper');
    if (armyId === 'allies') {
      // Allied K9 tactical Kevlar vest, twin side saddle packs, and GPS/radio whip antenna
      c.box(25, 20, 15, 37, 44, 21, S.hull);
      c.box(27, 18, 14, 35, 21, 20, S.trim);
      c.box(27, 43, 14, 35, 46, 20, S.trim);
      c.box(28, 31, 21, 30, 33, 30, METAL);
      c.put(29, 32, 30, S.accent);
      c.box(38, 25, 18, 41, 39, 25, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet heavy armored war-hound harness with spiked steel shoulder plates & red-star crest
      c.box(24, 19, 14, 39, 45, 22, S.plate);
      c.box(26, 22, 22, 37, 42, 25, S.hull);
      for (const sx of [27, 33, 39]) {
        c.box(sx, 18, 20, sx + 2, 21, 25, S.trim);
        c.box(sx, 43, 20, sx + 2, 46, 25, S.trim);
      }
      c.box(29, 29, 25, 35, 35, 27, S.accent);
    } else if (armyId === 'empire') {
      // Empire cyber-recon hound with angular ivory/cobalt sensor fins & brow optic visor
      c.box(25, 21, 15, 37, 43, 21, S.light);
      c.box(26, 18, 17, 35, 22, 26, S.trim);
      c.box(26, 42, 17, 35, 46, 26, S.trim);
      c.box(28, 28, 21, 35, 36, 26, S.hull);
      c.box(42, 26, 27, 47, 38, 30, S.trim);
      c.box(45, 27, 28, 48, 37, 30, GLASS);
    } else {
      // Legion outrider salvage hound with riveted scrap flank armor & strapped stim canisters
      c.box(25, 19, 14, 37, 45, 21, S.dark);
      c.box(26, 20, 21, 35, 26, 26, '#8c6b42');
      c.box(26, 38, 21, 35, 44, 26, '#8c6b42');
      for (const mx of [28, 32, 36]) c.box(mx, 30, 21, mx + 2, 34, 27, S.trim);
      c.box(29, 29, 21, 34, 35, 25, S.accent);
    }
    c.group('body');
  } else if (CUSTOM_HEADGEAR_UNITS.has(id)) {
    c.group('upper');
    if (armyId === 'allies') {
      // Allied spec-ops: wide composite shoulder pauldrons, tactical comtac headset & SATCOM whip antenna
      c.box(20, 16, 26, 28, 22, 31, S.hull);
      c.box(20, 42, 26, 28, 48, 31, S.hull);
      c.box(22, 17, 31, 26, 21, 32, S.trim);
      c.box(22, 43, 31, 26, 47, 32, S.trim);
      c.box(15, 20, 28, 18, 23, 44, METAL);
      c.put(16, 21, 44, S.accent);
      c.box(26, 19, 36, 32, 22, 42, S.trim);
      c.box(26, 42, 36, 32, 45, 42, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet shock-specialist: heavy slab pauldrons, armored high gorget collar, gold trim & twin assault cylinders
      c.box(18, 14, 25, 30, 22, 33, S.plate);
      c.box(18, 42, 25, 30, 50, 33, S.plate);
      c.box(21, 15, 31, 27, 21, 34, S.trim);
      c.box(21, 43, 31, 27, 49, 34, S.trim);
      c.box(17, 22, 32, 23, 42, 39, S.dark);
      c.box(13, 22, 22, 18, 29, 35, S.hull);
      c.box(13, 35, 22, 18, 42, 35, S.hull);
    } else if (armyId === 'empire') {
      // Empire royal operative: upturned winged samurai sode pauldrons, dorsal sashimono banner mast & brow crest
      c.box(19, 14, 27, 29, 21, 35, S.light);
      c.box(19, 43, 27, 29, 50, 35, S.light);
      c.box(20, 13, 33, 28, 16, 37, S.trim);
      c.box(20, 48, 33, 28, 51, 37, S.trim);
      c.box(14, 30, 26, 17, 34, 48, S.trim);
      c.box(11, 29, 38, 15, 35, 47, S.accent);
      c.box(34, 25, 41, 40, 39, 45, S.trim);
    } else {
      // Legion merc operative: asymmetrical spiked scrap left pauldron, survival bedroll & desert scarf tail
      c.box(19, 13, 26, 30, 22, 35, S.dark);
      c.box(22, 14, 35, 26, 18, 39, S.trim);
      c.box(21, 42, 26, 27, 47, 31, '#8c6b42');
      c.box(13, 20, 30, 20, 44, 36, '#8c6b42');
      c.box(14, 26, 34, 20, 34, 40, S.accent);
    }
    c.put(midX, midY, b.maxZ, S.accent);
    c.group('body');
  } else if (armyId === 'allies') {
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
