#!/usr/bin/env node
/**
 * Contact strip: every facing of an asset in one row, for human review.
 *
 * Reads `game_assets/<kind>/<asset>/manifest.json` and stitches the
 * per-facing composites (`<asset>__composite__<facing>__albedo.png`) into a
 * single PNG with the facings labelled by their screen direction in the
 * filename order. This is the artifact that makes "16 distinct directions"
 * and "the parts still register" checkable at a glance instead of by faith.
 *
 *   node tools/voxel_pipeline/v3/contact.mjs --only tank
 *   → game_assets/units/tank/contact.png
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { pngBytes } from '../bake.mjs';
import { MODELS } from './models/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Minimal PNG decoder for the 8-bit RGBA images this pipeline writes. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8;
  let w = 0, h = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('expected 8-bit RGBA');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4);
  const stride = w * 4;
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= 4 ? prev[x - 4] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, data: out };
}

/** Stitch images left-to-right with a margin, bottom-aligned on a shared ground line. */
function stitchRow(images, { pad = 6, background = [24, 26, 28] } = {}) {
  const w = images.reduce((s, im) => s + im.w, 0) + pad * (images.length + 1);
  const h = Math.max(...images.map(im => im.h)) + pad * 2;
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = background[0];
    out[i * 4 + 1] = background[1];
    out[i * 4 + 2] = background[2];
    out[i * 4 + 3] = 255;
  }
  let x = pad;
  for (const im of images) {
    const y = h - pad - im.h;
    for (let row = 0; row < im.h; row++) {
      for (let col = 0; col < im.w; col++) {
        const s = (row * im.w + col) * 4;
        const a = im.data[s + 3] / 255;
        if (a <= 0) continue;
        const d = ((y + row) * w + x + col) * 4;
        for (let k = 0; k < 3; k++) out[d + k] = im.data[s + k] * a + out[d + k] * (1 - a);
      }
    }
    x += im.w + pad;
  }
  return { w, h, buf: out };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

if (isMain) {
const onlyArg = arg('--only', null);
const ids = onlyArg ? onlyArg.split(',').map(s => s.trim()) : Object.keys(MODELS);

for (const id of ids) {
  const def = MODELS[id];
  if (!def) { console.error(`unknown asset "${id}"`); continue; }
  const dir = path.join(ROOT, 'game_assets', def.folder, id);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) { console.error(`${id}: not baked yet`); continue; }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Prefer the relit composite: it is shaded from the normal + material maps, so
  // the strip doubles as a lighting check.
  const lit = manifest.lit?.facings ?? {};
  const useLit = Object.keys(lit).length > 0;
  const images = [];
  for (const facing of manifest.facings) {
    const entry = useLit ? lit[facing] : manifest.composite?.facings?.[facing]?.files?.albedo
      ? { file: manifest.composite.facings[facing].files.albedo.file }
      : null;
    if (!entry) continue;
    images.push(decodePng(fs.readFileSync(path.join(dir, entry.file))));
  }
  if (!images.length) { console.error(`${id}: no composites`); continue; }
  const strip = stitchRow(images);
  fs.writeFileSync(path.join(dir, 'contact.png'), pngBytes(strip.w, strip.h, strip.buf));
  console.log(`${id}: ${images.length} facings (${useLit ? 'relit' : 'pre-lit'}) → contact.png (${strip.w}×${strip.h})`);
}
}
