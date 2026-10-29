/**
 * Airframe sub-assemblies: fuselages, rotors, wings, jet pipes, stores.
 *
 * Aircraft are the first family in the roster that is *not* a box on the ground,
 * and the mistakes that come with that are specific:
 *
 *   * **a fuselage built as one box is a bus.** It has to be lofted — a few
 *     stations along X, each with its own half-width and half-height, so the
 *     nose tapers, the cabin swells and the tail boom necks down;
 *   * **a rotor built at 45° cannot be drawn with axis-aligned boxes.** The
 *     blades are stamped along their own direction, one chord slice at a time,
 *     so a diagonal blade is a staircase of real voxels rather than a fan of
 *     blocks;
 *   * **an aircraft is thin.** Its height span is small on purpose, so a model
 *     needs an explicit `minSpan`; the default 180 gate is there to catch a
 *     model authored at 64³, and a helicopter passes it only because the rotor
 *     mast lifts the top of the model.
 *
 * Every rotor is its own part with its pivot on the hub, so the runtime can spin
 * it and the review page can turn the disc without touching the airframe.
 *
 * Frame: +X forward, Y lateral (256 = centre line), Z up (0 = ground).
 */

/**
 * Lofted fuselage.
 *
 * `stations` are `[x, halfW, halfH, zMid]` triples sampled nose-to-tail; each
 * pair of neighbours is filled with a stepped box so the body has a continuous
 * skin. Passing a `mat` per station lets a model band the airframe (a lighter
 * spine over a dark belly) without a second volume pass.
 */
export function fuselage(c, { stations, mat = 'team.hull', part = 'body', belly = null }) {
  c.part(part);
  for (let i = 0; i < stations.length - 1; i++) {
    const [x0, w0, h0, m0] = stations[i];
    const [x1, w1, h1, m1] = stations[i + 1];
    const steps = Math.max(1, Math.abs(x1 - x0));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const w = Math.round(w0 + (w1 - w0) * t);
      const h = Math.round(h0 + (h1 - h0) * t);
      const zm = Math.round(m0 + (m1 - m0) * t);
      c.box(x, 256 - w, zm - h, x + 1, 256 + w, zm + h, mat);
      if (belly) c.box(x, 256 - Math.round(w * 0.8), zm - h, x + 1, 256 + Math.round(w * 0.8), zm - h + 5, belly);
    }
  }
  return c;
}

/**
 * Rounded cross-section cap, used for noses and tail cones.
 * Steps the radius down along X so the tip is not a flat wall.
 */
export function noseCap(c, { x, dir = 1, halfW, halfH, zMid, steps = 10, mat = 'team.hull' }) {
  for (let i = 0; i < steps; i++) {
    const t = 1 - i / steps;
    const w = Math.max(1, Math.round(halfW * Math.sqrt(t)));
    const h = Math.max(1, Math.round(halfH * Math.sqrt(t)));
    c.box(x + dir * i, 256 - w, zMid - h, x + dir * i + dir, 256 + w, zMid + h, mat);
  }
  return c;
}

/** Glazed canopy: frames follow the rake so the glass sits inside metal. */
export function canopy(c, { x0, x1, halfW, z0, z1, rake = 6, mat = 'glass.dark', frame = 'steel.dark' }) {
  const h = Math.max(1, z1 - z0);
  const step = (i) => Math.round(rake * (1 - i / Math.max(1, h - 1)));
  for (let i = 0; i < h; i++) {
    const k = step(i);
    const w = Math.round(halfW * (0.72 + 0.28 * (1 - i / h)));
    c.box(x0 + k, 256 - w, z0 + i, x0 + k + 4, 256 + w, z0 + i + 1, mat);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < h; i++) {
      const k = step(i);
      const w = Math.round(halfW * (0.72 + 0.28 * (1 - i / h)));
      c.box(x0 + k, 256 + s * w - 3, z0 + i, x0 + k + 4, 256 + s * w + 3, z0 + i + 1, frame);
    }
  }
  c.box(x1 - 4, 256 - halfW, z0 - 2, x1, 256 + halfW, z0 + 1, frame);
  return c;
}

/**
 * One rotor disc: mast, hub and `blades` blades stamped along their own angle.
 *
 * `tilt` twists the blade tip up or down; a flat disc catches no light and reads
 * as a grey ring, whereas a slight coning gives the eye something to hold.
 */
export function rotor(c, {
  cx, cy, z, radius, blades = 4, chord = 14, part = 'rotor',
  mat = 'steel.dark', hubMat = 'steel.bright', phase = 0, mastZ = null, mastMat = 'steel.dark',
}) {
  c.part(part);
  const hubR = Math.max(8, Math.round(radius * 0.11));
  if (mastZ !== null) c.cylZ(cx, cy, mastZ, z, Math.max(5, hubR - 3), mastMat);
  c.cylZ(cx, cy, z, z + 10, hubR, hubMat);
  c.sphere(cx, cy, z + 12, hubR - 2, mat);

  for (let b = 0; b < blades; b++) {
    const a = phase + (b / blades) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let r = hubR; r <= radius; r++) {
      const px = Math.round(cx + dx * r);
      const py = Math.round(cy + dy * r);
      const w = Math.max(2, Math.round(chord * 0.5));
      // Chord is perpendicular to the blade; stamping a square of `w` around the
      // centre line keeps the edge straight without rotating a box.
      c.box(px - w, py - w, z + 2, px + w + 1, py + w + 1, z + 5, mat);
      // Root reinforcement, and a tip light on one blade so the disc reads when
      // it is edge-on.
      if (r < hubR + 14) c.box(px - w, py - w, z + 1, px + w + 1, py + w + 1, z + 5, 'steel');
    }
    const tipX = Math.round(cx + dx * radius), tipY = Math.round(cy + dy * radius);
    c.box(tipX - 4, tipY - 4, z + 2, tipX + 4, tipY + 4, z + 5, 'lamp.red');
  }
  c.part('body');
  return c;
}

/**
 * Tail rotor: a disc in the X–Z plane (spins about Y), set on a fin.
 * `side` is +1 for the port fin, -1 for starboard.
 */
export function tailRotor(c, { x, side = 1, cz, radius, y, blades = 3, chord = 9, part = 'tail-rotor', mat = 'steel.dark' }) {
  c.part(part);
  const hubY = y;
  c.cylY(x, hubY - 6, hubY + 6, cz, Math.max(6, Math.round(radius * 0.18)), 'steel.bright');
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    for (let r = 6; r <= radius; r++) {
      const px = Math.round(x + dx * r);
      const pz = Math.round(cz + dz * r);
      const w = Math.max(1, Math.round(chord * 0.4));
      c.box(px - w, Math.min(hubY, hubY + side * 3), pz - w, px + w + 1, Math.max(hubY, hubY + side * 3), pz + w + 1, mat);
    }
  }
  c.part('body');
  return c;
}

/** Skid landing gear: two longitudinal tubes, two cross members, four legs. */
export function skids(c, { x0, x1, halfW = 118, z = 18, mat = 'steel.dark' }) {
  c.part('body');
  for (const s of [-1, 1]) {
    const y = 256 + s * halfW;
    c.box(x0, y - 6, z, x1, y + 6, z + 7, mat);                    // ground tube
    c.box(x0 + 14, y - 6, z + 7, x0 + 30, y + 6, z + 12, mat);     // front upturn
    c.box(x1 - 30, y - 6, z + 7, x1 - 14, y + 6, z + 12, mat);
    for (const x of [x0 + 44, x1 - 44]) {
      c.box(x - 5, y - 5, z + 6, x + 5, y + 5, z + 62, mat);       // leg
      c.box(x - 7, y - 7, z + 54, x + 7, y + 7, z + 62, 'steel');  // clamp
    }
  }
  for (const x of [x0 + 40, x1 - 40]) {
    c.box(x - 6, 256 - halfW, z + 8, x + 6, 256 + halfW, z + 14, mat);
  }
  return c;
}

/** Swept or straight wing pair, with a spar band that catches the light. */
export function wingPair(c, {
  x, halfSpan, chord, thick = 7, sweep = 0, dihedral = 0, cz = 256,
  mat = 'team.hull', tipMat = 'team.dark', part = 'body',
}) {
  c.part(part);
  for (const s of [-1, 1]) {
    for (let i = 0; i <= halfSpan; i++) {
      const y = 256 + s * i;
      const xo = x - Math.round(sweep * (i / halfSpan));
      const z = cz + Math.round(dihedral * (i / halfSpan));
      const ch = Math.max(4, Math.round(chord * (1 - 0.35 * (i / halfSpan))));
      c.box(xo, y, z - thick, xo + ch, y + 1, z + thick, mat);
    }
    // Tip cap and a nav light: with a thin wing, the tip is what the silhouette
    // is judged on.
    const y = 256 + s * halfSpan;
    const xo = x - Math.round(sweep);
    const zt = cz + Math.round(dihedral);
    c.box(xo - 2, y, zt - thick - 1, xo + Math.max(4, Math.round(chord * 0.65)) + 2, y + 2, zt + thick + 1, tipMat);
    c.box(xo, y, zt - 2, xo + 5, y + 1, zt + 3, s > 0 ? 'lamp.red' : 'lamp.cyan');
  }
  return c;
}

/** Horizontal or vertical stabiliser pair (a V-tail is `dihedral` > 0). */
export function tailPlane(c, {
  x, halfSpan, chord, thick = 5, sweep = 0, dihedral = 0, cz = 256, mat = 'team.hull', part = 'body',
}) {
  return wingPair(c, { x, halfSpan, chord, thick, sweep, dihedral, cz, mat, part, tipMat: mat });
}

/** Single vertical fin, drawn as a stack of slabs so the leading edge rakes. */
export function fin(c, { x0, x1, z0, z1, rake = 0, thick = 6, mat = 'team.hull', tipMat = 'team.dark' }) {
  const h = Math.max(1, z1 - z0);
  for (let i = 0; i <= h; i++) {
    const z = z0 + i;
    const off = Math.round(rake * (i / h));
    const ch = Math.max(4, Math.round((x1 - x0) * (1 - 0.45 * (i / h))));
    c.box(x0 + off, 256 - thick, z, x0 + off + ch, 256 + thick, z + 1, mat);
  }
  c.box(x0 + rake, 256 - thick - 1, z1, x0 + rake + Math.max(4, Math.round((x1 - x0) * 0.55)) + 1, 256 + thick + 1, z1 + 2, tipMat);
  return c;
}

/**
 * Glazed strip down both flanks, following the fuselage taper.
 *
 * A canopy alone leaves an airframe reading as a blimp from every side facing:
 * the windows are what say "cockpit" from the quarter views, and the quarter
 * views are 12 of the 16 facings. `halfW0`/`halfW1` are the fuselage half-widths
 * at `x0`/`x1`; the glass is laid one voxel proud of that surface.
 */
export function sideGlass(c, { x0, x1, halfW0, halfW1, z0, z1, mat = 'solar', frame = 'team.dark', part = 'body' }) {
  c.part(part);
  for (let x = x0; x <= x1; x++) {
    const w = Math.round(halfW0 + (halfW1 - halfW0) * ((x - x0) / Math.max(1, x1 - x0)));
    const inset = (x - x0) % 14 < 2 ? 1 : 0;              // a frame pillar every 14
    for (const s of [-1, 1]) {
      const y = 256 + s * (w - inset);
      c.box(x, Math.min(y, y + s * 2), z0, x + 1, Math.max(y, y + s * 2), z1, inset ? frame : mat);
    }
  }
  c.part('body');
  return c;
}

/** Jet pipe: a nozzle throat that closes down, with a hot inner ring. */
export function jetPipe(c, { x0, x1, cz, r0, r1, part = 'body' }) {
  c.part(part);
  const steps = Math.max(4, Math.abs(x1 - x0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = Math.round(r0 + (r1 - r0) * t);
    c.cylX(x0 + Math.round((x1 - x0) * t), x0 + Math.round((x1 - x0) * t) + 1, 256, cz, r, 'steel.dark');
    if (t > 0.45) c.cylX(x0 + Math.round((x1 - x0) * t), x0 + Math.round((x1 - x0) * t) + 1, 256, cz, Math.max(3, r - 6), 'scorch');
  }
  c.part('body');
  return c;
}

/** Engine nacelle: a pod with an intake lip and an exhaust, hung on a pylon. */
export function nacelle(c, { x0, x1, cy, cz, r, part = 'body', pylonTo = null }) {
  c.part(part);
  c.cylX(x0, x1, cy, cz, r, 'team.hull');
  c.cylX(x0, x0 + 6, cy, cz, Math.max(4, r - 5), 'iron');             // intake
  c.cylX(x1 - 8, x1, cy, cz, Math.max(4, r - 6), 'scorch');          // exhaust
  if (pylonTo !== null) {
    c.box(x0 + 10, Math.min(cy, 256), cz - 3, x1 - 16, Math.max(cy, 256), cz + 5, 'team.dark');
  }
  c.part('body');
  return c;
}

/** External stores: a rocket pod or a missile on a wing pylon. */
export function store(c, { x, cy, cz, len = 60, r = 9, kind = 'pod', part = 'body' }) {
  c.part(part);
  c.box(x - 6, cy - 3, cz + r, x + 6, cy + 3, cz + r + 10, 'team.dark');   // pylon
  if (kind === 'pod') {
    c.cylX(x, x + len, cy, cz, r, 'team.dark');
    for (let i = 0; i < 4; i++) {
      const yy = cy - r + 3 + i * 5;
      c.cylX(x + len - 2, x + len + 2, yy, cz, 2, 'gunmetal');              // tube mouths
    }
  } else {
    c.cylX(x, x + len, cy, cz, r, 'team.light');
    // Nose cone: stepped radii. There is no cone primitive along X, and a
    // stepped taper is what the voxel silhouette wants anyway.
    for (let i = 0; i < 16; i++) {
      const rr = Math.max(1, Math.round(r * (1 - i / 16)));
      c.cylX(x + len + i, x + len + i + 1, cy, cz, rr, i > 12 ? 'steel.bright' : 'steel.dark');
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.box(x + 14, cy + Math.round(Math.cos(a) * (r + 1)) - 1, cz + Math.round(Math.sin(a) * (r + 1)) - 1,
        x + 30, cy + Math.round(Math.cos(a) * (r + 1)) + 1, cz + Math.round(Math.sin(a) * (r + 1)) + 1, 'steel');
    }
  }
  c.part('body');
  return c;
}

/** Underslung sensor ball on a yoke — the drone's and the gunship's eye. */
export function sensorBall(c, { x, cz, r = 18, part = 'sensor', yokeMat = 'steel.dark' }) {
  c.part(part);
  c.box(x - 5, 256 - 5, cz + r, x + 5, 256 + 5, cz + r + 14, yokeMat);
  c.sphere(x, 256, cz, r, 'optic');
  c.box(x + r - 6, 256 - 6, cz - 6, x + r + 2, 256 + 6, cz + 6, 'glass.dark');  // lens face
  c.box(x - r + 4, 256 - 4, cz - r + 2, x + r - 4, 256 + 4, cz - r + 8, 'steel.dark');
  c.part('body');
  return c;
}

/** Pusher propeller disc at the tail, in the Y–Z plane. */
export function propDisc(c, { x, cy = 256, cz, radius, blades = 4, part = 'prop', mat = 'steel.dark' }) {
  c.part(part);
  c.cylX(x - 8, x + 8, cy, cz, Math.max(4, Math.round(radius * 0.16)), 'steel.bright');
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2;
    const dy = Math.cos(a), dz = Math.sin(a);
    for (let r = 5; r <= radius; r++) {
      const py = Math.round(cy + dy * r);
      const pz = Math.round(cz + dz * r);
      c.box(x - 1, py - 2, pz - 2, x + 2, py + 3, pz + 3, mat);
    }
  }
  c.part('body');
  return c;
}

/** Winch, hook and cable under a lift helicopter's belly. */
export function bellyHook(c, { x, cz, part = 'body' }) {
  c.part(part);
  c.box(x - 18, 256 - 14, cz - 16, x + 18, 256 + 14, cz, 'steel.dark');
  c.cylZ(x, 256, cz - 26, cz - 14, 10, 'steel');
  c.box(x - 3, 256 - 3, cz - 54, x + 3, 256 + 3, cz - 24, 'steel.bright');
  c.box(x - 9, 256 - 9, cz - 66, x + 9, 256 + 9, cz - 52, 'iron');
  c.part('body');
  return c;
}
