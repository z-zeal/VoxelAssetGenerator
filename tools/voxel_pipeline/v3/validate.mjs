/**
 * Geometry gates for the 512³ pipeline.
 *
 * These run before a single pixel is drawn, so a broken model fails fast with a
 * message instead of producing a plausible-looking but wrong sheet. Anything
 * that can be checked on the lattice is checked here; anything visual belongs to
 * the preview review.
 */
import { CANVAS } from './scribe.mjs';

export function validateModel(id, def, geom) {
  const problems = [];
  if (!geom.parts.length) problems.push('model produced no voxels');

  for (const part of geom.parts) {
    const b = part.bounds;
    for (const [axis, lo, hi] of [['x', b.minX, b.maxX], ['y', b.minY, b.maxY], ['z', b.minZ, b.maxZ]]) {
      if (lo < 0 || hi >= CANVAS) {
        problems.push(`part "${part.name}" leaves the canvas on ${axis}: ${lo}..${hi} (allowed 0..${CANVAS - 1})`);
      }
    }
    if (!part.voxels.length) problems.push(`part "${part.name}" is empty`);
  }

  // A 512³ model that only fills a corner of the lattice is almost always a
  // coordinate bug (e.g. authored for 64³), so require a minimum footprint.
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of geom.parts) {
    for (const v of p.voxels) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < lo[i]) lo[i] = v[i];
        if (v[i] > hi[i]) hi[i] = v[i];
      }
    }
  }
  const span = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const minSpan = def.minSpan ?? 180;
  for (const [i, axis] of ['x', 'y', 'z'].entries()) {
    if (span[i] < minSpan) {
      problems.push(`model spans only ${span[i]} voxels on ${axis} (minimum ${minSpan}) — `
        + 'is this authored for the 512 lattice?');
    }
  }
  if (hi[2] > CANVAS - 8) problems.push('model touches the top of the canvas');

  for (const required of def.requiredParts ?? []) {
    if (!geom.parts.some(p => p.name === required)) {
      problems.push(`missing required part "${required}"`);
    }
  }
  if (def.kind === 'unit') {
    const dynamic = geom.parts.filter(p => p.dynamic).map(p => p.name);
    if (!dynamic.length) problems.push('unit has no dynamic part (turret/barrel/rotor) to segment');
  }
  return problems;
}
