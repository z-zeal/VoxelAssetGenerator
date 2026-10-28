/**
 * Camera-space voxel rasterizer for the 512³ pipeline.
 *
 * The old baker rotated the voxel model by 90°/45° steps and relied on an
 * axis-aligned 2:1 cube stamp. At 512³ that is both wrong (22.5° steps cannot
 * be represented) and slow. This rasterizer keeps the model untouched and puts
 * the azimuth in the projection instead:
 *
 *   u = x / 8, v = y / 8, w = z / 8          (512 design voxels -> tile units)
 *   X = u·cosφ − v·sinφ,  Y = u·sinφ + v·cosφ   (camera azimuth φ)
 *   sx = (X − Y) · 0.5K,  sy = ((X + Y) · 0.5 − w) · K
 *
 * which is exactly the legacy 64×32 diamond at K = 1 and an arbitrarily large
 * render at K > 1. Because the model is never resampled, every azimuth (22.5°,
 * 11.25°, anything) is exact, and the same pass emits albedo, view-space
 * normals and a material id map with a real depth buffer.
 *
 * Output contract per part per facing:
 *   albedo   RGBA8, lit like the legacy sheets (so unlit runtimes still look right)
 *   normal   RGB8, view-space normal: R = right, G = up, B = toward viewer
 *   material RGB8 + A: R = material id, G = metalness, B = roughness, A = emissive
 */
import { CANVAS } from './scribe.mjs';

/** Legacy mapping: the 512 canvas is 8 design voxels per old 64-canvas voxel. */
export const VOXELS_PER_TILE_UNIT = CANVAS / 64;

const LIGHT = (() => {
  const v = [-0.38, -0.52, 0.92];
  const l = Math.hypot(...v);
  return v.map(c => c / l);
})();

const FACE_DEFS = [
  // normal (design space), corner order (CCW seen from outside), shade anchor
  { n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

const NORMAL_INDEX = new Map(FACE_DEFS.map((f, i) => [f.n.join(','), i]));

/** Basis for one azimuth: projection + depth + view-space normal mapping. */
export function cameraBasis(azimuthDeg, k = 4) {
  const phi = (azimuthDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  // Null direction of the projection == camera axis (points at the viewer).
  const d = [sin + cos, cos - sin, 1];
  const dl = Math.hypot(...d);
  const dHat = d.map(c => c / dl);
  // Screen gradients (before orthonormalisation).
  const gx = [cos - sin, -(sin + cos), 0];
  const gy = [0.5 * (cos + sin), 0.5 * (cos - sin), -1];
  const ortho = (g) => {
    const s = g[0] * dHat[0] + g[1] * dHat[1] + g[2] * dHat[2];
    const p = [g[0] - s * dHat[0], g[1] - s * dHat[1], g[2] - s * dHat[2]];
    const l = Math.hypot(...p) || 1;
    return p.map(c => c / l);
  };
  const right = ortho(gx);
  const up = ortho(gy);
  return {
    azimuthDeg, phi, cos, sin, k, dHat, right, up,
    /** design voxel -> raster pixel (SS resolution; caller adds origin). */
    project(x, y, z) {
      const u = x / VOXELS_PER_TILE_UNIT, v = y / VOXELS_PER_TILE_UNIT;
      const w = z / VOXELS_PER_TILE_UNIT;
      const X = u * cos - v * sin;
      const Y = u * sin + v * cos;
      return [(X - Y) * 0.5 * k, ((X + Y) * 0.5 - w) * k];
    },
    /** Larger == closer to the viewer. */
    depth(x, y, z) {
      return ((x / VOXELS_PER_TILE_UNIT) * dHat[0]
        + (y / VOXELS_PER_TILE_UNIT) * dHat[1]
        + (z / VOXELS_PER_TILE_UNIT) * dHat[2]);
    },
    /** View-space normal for a design-space face normal. */
    viewNormal(n) {
      const nn = n[0] * dHat[0] + n[1] * dHat[1] + n[2] * dHat[2]; // toward viewer
      return [
        n[0] * right[0] + n[1] * right[1] + n[2] * right[2],
        n[0] * up[0] + n[1] * up[1] + n[2] * up[2],
        nn,
      ];
    },
    faceVisible(n) {
      return n[0] * dHat[0] + n[1] * dHat[1] + n[2] * dHat[2] > 0.0001;
    },
  };
}

function shadeFor(n, emissive) {
  const l = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  const base = 0.58 + 0.42 * Math.max(0, l);
  return emissive > 0 ? Math.min(1.35, base + emissive * 0.5) : base;
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Render one part to raster buffers.
 *
 * @param {Array<[number,number,number,number]>} voxels [x,y,z,matId] (may be a
 *   shared occupancy set for face culling across parts: `occluders`).
 * @param {object} opts
 *   basis      cameraBasis() result
 *   lut        Int32Array or Uint8 arrays per material: albedo rgb + metal/rough/emissive
 *   superSample internal multiplier (default 2)
 *   occluders  Set of "x,y,z" for the whole model, so parts do not draw hidden faces
 */
export function renderPart(voxels, { basis, palette, superSample = 2, occluders = null }) {
  const ss = superSample;
  const k = basis.k * ss;
  // Project every voxel to find the crop box first.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const projected = new Array(voxels.length);
  for (let i = 0; i < voxels.length; i++) {
    const [x, y, z] = voxels[i];
    const [px, py] = basis.project(x + 0.5, y + 0.5, z + 0.5);
    const sx = px * ss, sy = py * ss;
    projected[i] = [sx, sy];
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  }
  if (!voxels.length) return null;
  // One voxel of slack for the splat radius, plus a pixel of padding.
  const pad = Math.ceil(Math.max(2, k));
  const x0 = Math.floor(minX) - pad;
  const y0 = Math.floor(minY) - pad;
  const w = Math.ceil(maxX) - x0 + pad + 1;
  const h = Math.ceil(maxY) - y0 + pad + 1;

  const color = new Float32Array(w * h * 4);
  const normal = new Float32Array(w * h * 3);
  const matBuf = new Float32Array(w * h * 2);       // id (+0.5 bias for "empty")
  const depth = new Float32Array(w * h).fill(-Infinity);

  const put = (x, y, z, faceIdx, matId) => {
    const face = FACE_DEFS[faceIdx];
    const vn = basis.viewNormal(face.n);
    const m = palette[matId];
    const [r, g, b] = m.rgb;
    const shade = shadeFor(face.n, m.emissive);
    // Quad corners of the face, projected.
    const pts = face.corners.map(([cx, cy, cz]) => {
      const [px, py] = basis.project(x + cx, y + cy, z + cz);
      return [px * ss - x0, py * ss - y0];
    });
    const d = basis.depth(x + 0.5, y + 0.5, z + 0.5);
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const [px, py] of pts) {
      if (px < bx0) bx0 = px; if (px > bx1) bx1 = px;
      if (py < by0) by0 = py; if (py > by1) by1 = py;
    }
    // Conservative sub-pixel expansion: a face smaller than a pixel still
    // stamps its centre pixel, so 512-scale detail never drops out.
    bx0 = Math.max(0, Math.floor(bx0 - 0.5));
    bx1 = Math.min(w - 1, Math.ceil(bx1 + 0.5));
    by0 = Math.max(0, Math.floor(by0 - 0.5));
    by1 = Math.min(h - 1, Math.ceil(by1 + 0.5));
    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        const i = py * w + px;
        if (d <= depth[i]) continue;
        depth[i] = d;
        color[i * 4] = r * shade;
        color[i * 4 + 1] = g * shade;
        color[i * 4 + 2] = b * shade;
        color[i * 4 + 3] = 1;
        normal[i * 3] = vn[0];
        normal[i * 3 + 1] = vn[1];
        normal[i * 3 + 2] = vn[2];
        matBuf[i * 2] = matId + 1;
        matBuf[i * 2 + 1] = shade;
      }
    }
  };

  const has = (x, y, z) => occluders.has(`${x},${y},${z}`);
  for (const [x, y, z, matId] of voxels) {
    for (let f = 0; f < FACE_DEFS.length; f++) {
      const face = FACE_DEFS[f];
      if (!basis.faceVisible(face.n)) continue;
      if (has(x + face.n[0], y + face.n[1], z + face.n[2])) continue;
      put(x, y, z, f, matId);
    }
  }

  // Box-downsample the supersample buffer to the sprite grid.
  const outW = Math.max(1, Math.round(w / ss));
  const outH = Math.max(1, Math.round(h / ss));
  const albedo = new Uint8ClampedArray(outW * outH * 4);
  const nrm = new Uint8ClampedArray(outW * outH * 4);
  const mat = new Uint8ClampedArray(outW * outH * 4);

  for (let py = 0; py < outH; py++) {
    for (let px = 0; px < outW; px++) {
      let r = 0, g = 0, b = 0, a = 0, nx = 0, ny = 0, nz = 0;
      const matCount = new Map();
      let shadeSum = 0, shadeN = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const sx = px * ss + dx, sy = py * ss + dy;
          if (sx >= w || sy >= h) continue;
          const i = sy * w + sx;
          if (color[i * 4 + 3] === 0) continue;
          r += color[i * 4]; g += color[i * 4 + 1]; b += color[i * 4 + 2];
          a++;
          nx += normal[i * 3]; ny += normal[i * 3 + 1]; nz += normal[i * 3 + 2];
          const id = Math.round(matBuf[i * 2]) - 1;
          matCount.set(id, (matCount.get(id) ?? 0) + 1);
          shadeSum += matBuf[i * 2 + 1];
          shadeN++;
        }
      }
      const o = (py * outW + px) * 4;
      if (!a) { albedo[o + 3] = 0; continue; }
      albedo[o] = r / a;
      albedo[o + 1] = g / a;
      albedo[o + 2] = b / a;
      albedo[o + 3] = Math.round((a / (ss * ss)) * 255);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nrm[o] = ((nx / nl) * 0.5 + 0.5) * 255;
      nrm[o + 1] = ((ny / nl) * 0.5 + 0.5) * 255;
      nrm[o + 2] = ((nz / nl) * 0.5 + 0.5) * 255;
      nrm[o + 3] = 255;
      let bestId = 0, bestN = -1;
      for (const [id, n] of matCount) if (n > bestN) { bestN = n; bestId = id; }
      const m = palette[bestId];
      mat[o] = bestId;
      mat[o + 1] = Math.round(m.metal * 255);
      mat[o + 2] = Math.round(m.rough * 255);
      mat[o + 3] = Math.round((m.emissive ?? 0) * 255);
    }
  }

  const origin = [x0 / ss, y0 / ss];
  return { w: outW, h: outH, albedo, normal: nrm, material: mat, origin };
}

/** Build the per-material render palette from a livery-resolved material list. */
export function buildPalette(materialNames, colorFor, materials) {
  return materialNames.map((name) => {
    const m = materials[name];
    return {
      rgb: parseHex(colorFor(name)),
      metal: m.metal,
      rough: m.rough,
      emissive: m.emissive ?? 0,
    };
  });
}
