/**
 * Virtual light rig — relighting test for the baked normal and material maps.
 *
 * The albedo sheet is pre-lit with a fixed studio light, which is convenient for
 * unlit runtimes but hides whether the normal map is actually correct. This
 * module re-shades the composited albedo using the *normal* map and the
 * *material* map with a configurable light rig, so a wrong normal axis, a stale
 * metalness channel or a broken emissive channel shows up immediately instead of
 * surviving to runtime.
 *
 * Everything is view space, matching the map contract:
 *   normal   R = right, G = up, B = toward viewer, 0..255 maps -1..1
 *   material R = material id, G = metalness, B = roughness, A = emissive
 *
 * No dependencies; operates on plain RGBA buffers.
 */

const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/** Build a light direction (view space) from azimuth/elevation in degrees. */
export function lightDir(azimuthDeg, elevationDeg) {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  // +x right, +y up, +z toward viewer
  return [
    Math.cos(el) * Math.cos(az),
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
  ];
}

/** A default three-point rig: warm key, cool fill, cold rim. */
export function defaultRig() {
  return [
    { dir: lightDir(125, 45), color: [1.0, 0.96, 0.88], intensity: 1.05, key: true },
    { dir: lightDir(-40, 18), color: [0.55, 0.68, 0.90], intensity: 0.45 },
    { dir: lightDir(-150, 30), color: [0.65, 0.80, 1.0], intensity: 0.35, rim: true },
  ];
}

/** A single-light rig, used to prove the normals respond to direction. */
export function singleLight(azimuthDeg, elevationDeg, intensity = 1.15) {
  return [
    { dir: lightDir(azimuthDeg, elevationDeg), color: [1, 1, 1], intensity, key: true },
    { dir: [0, 0.25, 0.95], color: [0.25, 0.30, 0.40], intensity: 0.25 },  // ambient-ish fill
  ];
}

/**
 * Re-shade one composited sprite.
 *
 * @param {Uint8ClampedArray} albedo  RGBA, pre-lit colours
 * @param {Uint8ClampedArray} normal  RGBA, view-space normals
 * @param {Uint8ClampedArray} material RGBA, id/metalness/roughness/emissive
 * @param {Array} rig                 lights from defaultRig()/singleLight()
 * @param {object} opts               ambient, rim, exposure
 */
export function relight(albedo, normal, material, rig = defaultRig(), opts = {}) {
  const { ambient = 0.30, rimStrength = 0.35, exposure = 1.0 } = opts;
  const w = albedo.length / 4;
  const out = new Uint8ClampedArray(albedo.length);
  const lights = rig.map(l => {
    const [x, y, z] = l.dir;
    const len = Math.hypot(x, y, z) || 1;
    return { ...l, dir: [x / len, y / len, z / len] };
  });

  for (let i = 0; i < w; i++) {
    const o = i * 4;
    const a = albedo[o + 3];
    if (a === 0) { out[o + 3] = 0; continue; }

    // Decode the view-space normal.
    let nx = (normal[o] / 255) * 2 - 1;
    let ny = (normal[o + 1] / 255) * 2 - 1;
    let nz = (normal[o + 2] / 255) * 2 - 1;
    const nlen = Math.hypot(nx, ny, nz) || 1;
    nx /= nlen; ny /= nlen; nz /= nlen;

    const metal = material[o + 1] / 255;
    const rough = material[o + 2] / 255;
    const emissive = material[o + 3] / 255;

    const ar = albedo[o] / 255, ag = albedo[o + 1] / 255, ab = albedo[o + 2] / 255;

    // Diffuse albedo: metals have almost none.
    const dr = ar * (1 - metal * 0.9), dg = ag * (1 - metal * 0.9), db = ab * (1 - metal * 0.9);
    // Specular tint: dielectrics are white-ish, metals take the albedo.
    const sr = 0.04 + (ar - 0.04) * metal;
    const sg = 0.04 + (ag - 0.04) * metal;
    const sb = 0.04 + (ab - 0.04) * metal;
    const specPower = Math.pow(2, 1 + 9 * (1 - rough));

    let r = dr * ambient, g = dg * ambient, b = db * ambient;
    let specSum = 0;
    for (const L of lights) {
      const ndl = Math.max(0, nx * L.dir[0] + ny * L.dir[1] + nz * L.dir[2]);
      r += dr * L.color[0] * L.intensity * ndl;
      g += dg * L.color[1] * L.intensity * ndl;
      b += db * L.color[2] * L.intensity * ndl;
      // Blinn-Phong half vector against the viewer (0,0,1).
      const hx = L.dir[0], hy = L.dir[1], hz = L.dir[2] + 1;
      const hl = Math.hypot(hx, hy, hz) || 1;
      const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
      const spec = ndl > 0 ? Math.pow(ndh, specPower) * L.intensity : 0;
      specSum += spec;
      r += sr * spec * L.color[0];
      g += sg * spec * L.color[1];
      b += sb * spec * L.color[2];
    }

    // Fresnel-ish rim: grazing angles pick up light, which makes curvature read.
    const rim = Math.pow(1 - Math.min(1, Math.max(0, nz)), 3) * rimStrength;
    r += rim; g += rim; b += rim;

    // Emissive is self-lit and unaffected by the rig.
    if (emissive > 0) {
      r += ar * emissive * 1.6;
      g += ag * emissive * 1.6;
      b += ab * emissive * 1.6;
    }

    out[o] = clamp255(r * 255 * exposure);
    out[o + 1] = clamp255(g * 255 * exposure);
    out[o + 2] = clamp255(b * 255 * exposure);
    out[o + 3] = a;
  }
  return out;
}

/** Colour-code the material id channel so segmentation/material mistakes are visible. */
export function materialIdView(material, coverage = null, palette = null) {
  const out = new Uint8ClampedArray(material.length);
  for (let i = 0; i < material.length; i += 4) {
    if (coverage && coverage[i / 4] === 0) { out[i + 3] = 0; continue; }
    const id = material[i];
    const [r, g, b] = palette ? palette(id) : hashColor(id);
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }
  return out;
}

function hashColor(id) {
  // Golden-ratio hue rotation: adjacent ids are always visually distinct.
  const h = (id * 137.508) % 360;
  return hslToRgb(h / 360, 0.62, 0.56);
}

function hslToRgb(h, s, l) {
  const f = n => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/** Visualise a single material channel (metalness/roughness/emissive) as greyscale. */
export function channelView(material, channel, coverage = null) {
  const offset = { metalness: 1, roughness: 2, emissive: 3 }[channel];
  const out = new Uint8ClampedArray(material.length);
  for (let i = 0; i < material.length; i += 4) {
    if (coverage && coverage[i / 4] === 0) { out[i + 3] = 0; continue; }
    const v = material[i + offset];
    out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
  }
  return out;
}

/** Visualise the normal map directly (already RGB-encoded). */
export function normalView(normal, coverage = null) {
  const out = new Uint8ClampedArray(normal.length);
  for (let i = 0; i < normal.length; i += 4) {
    if (coverage && coverage[i / 4] === 0) { out[i + 3] = 0; continue; }
    out[i] = normal[i]; out[i + 1] = normal[i + 1]; out[i + 2] = normal[i + 2]; out[i + 3] = 255;
  }
  return out;
}

/** Tile RGBA panels left-to-right, bottom-aligned, on a dark background. */
export function tilePanels(panels, { pad = 6, background = [22, 24, 26] } = {}) {
  const w = panels.reduce((s, p) => s + p.w, 0) + pad * (panels.length + 1);
  const h = Math.max(...panels.map(p => p.h)) + pad * 2;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = background[0];
    out[i * 4 + 1] = background[1];
    out[i * 4 + 2] = background[2];
    out[i * 4 + 3] = 255;
  }
  let x = pad;
  for (const p of panels) {
    const y = h - pad - p.h;
    for (let row = 0; row < p.h; row++) {
      for (let col = 0; col < p.w; col++) {
        const s = (row * p.w + col) * 4;
        const a = p.data[s + 3] / 255;
        if (a <= 0) continue;
        const d = ((y + row) * w + x + col) * 4;
        for (let k = 0; k < 3; k++) out[d + k] = p.data[s + k] * a + out[d + k] * (1 - a);
      }
    }
    x += p.w + pad;
  }
  return { w, h, data: out };
}
