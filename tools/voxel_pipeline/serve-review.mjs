#!/usr/bin/env node
/**
 * Static review server: serves the repository root so every review page loads
 * its sprite sheets and previews through the same relative paths they use in
 * game. Binds 0.0.0.0 and sends no frame/origin restrictions, so it works
 * behind a proxied live preview.
 *
 * Caching: review art is regenerated constantly and the file names never
 * change, so assets are served with `Cache-Control: no-cache` plus an
 * mtime+size ETag. The browser revalidates every request and gets a cheap 304
 * when nothing changed — it can never show a stale scene or lineup after a
 * re-bake, which a long max-age would silently do.
 *
 * Run: npm run voxels:serve   (http://0.0.0.0:8000)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT ?? 8000);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const INDEX = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voxel asset review — 128³ / 32-unit tiles</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#0f1319;color:#eef3f8;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:48px 22px 80px}
h1{font-size:clamp(24px,3vw,36px);margin:0 0 8px}
p{color:#a7b4c4;margin:0 0 26px}
a.card{display:block;text-decoration:none;color:inherit;background:#171d26;border:1px solid #2a3442;border-radius:12px;padding:16px 18px;margin:12px 0;transition:.15s}
a.card:hover{border-color:#8fd0a4;transform:translateY(-1px)}
.card b{display:block;font-size:17px;margin-bottom:3px}
.card span{color:#a7b4c4;font-size:14px}
.tag{display:inline-block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#8fd0a4;border:1px solid #2f4f3c;border-radius:999px;padding:1px 8px;margin-left:8px;vertical-align:2px}
small{color:#7d8b9c}
</style>
</head>
<body><main>
<h1>Voxel asset review</h1>
<p>500 models on the 128×128×128 canvas with a 32-voxel ground tile, multi-tile buildings and
role-sized units (1 / 1.25 / 1.5 / 1.75 / 2 tiles). Pages are served from the repository root, so
sprite sheets and previews load through the same relative paths they use in game.</p>

<a class="card" href="/docs/review/scale-review.html">
  <b>Scale review sheet <span class="tag">start here</span></b>
  <span>True-scale unit lineups with ground footprints, unit-size before/after, the mixed-elevation
  scene, before/after, all 500 previews at their real pixel size and the full sizing matrix.</span>
</a>

<a class="card" href="/docs/review/unit-size.png">
  <b>Unit size: was 1×1 → role size</b>
  <span>Same art, same 128×64 tile: every unit forced into one tile (old pipeline) beside the shipped
  sprite at its role size, with a footprint bar in tiles.</span>
</a>

<a class="card" href="/terrain-elevation-editor.html">
  <b>Terrain &amp; elevation editor</b>
  <span>Interactive map editor: elevation brushes (0–32), terrain painting, footprint-validating
  building placement with live preview, and footprint-aware inspection.</span>
</a>

<a class="card" href="/voxel-sprite-review.html">
  <b>Sprite browser</b>
  <span>Every preview plus one baked strip per facing and model, searchable by name, kind and
  category, with a pixel-zoom viewer.</span>
</a>

<a class="card" href="/docs/ASSET_SIZING_MATRIX.md">
  <b>Sizing matrix (markdown)</b>
  <span>Generated per-asset table: category, height class, size class, footprints, model bounds,
  render scale, sprite pixels and validation status.</span>
</a>

<p style="margin-top:30px"><small>Generated from <code>data/voxels.json</code> and the baked manifest by
<code>tools/voxel_pipeline/review.mjs</code>, <code>sizing-matrix.mjs</code> and
<code>sprite-index.mjs</code>.</small></p>
</main></body></html>
`;

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    ...headers,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }
  if (urlPath === '/' || urlPath === '/index.html') {
    send(res, 200, INDEX, { 'Content-Type': 'text/html; charset=utf-8' });
    return;
  }
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, `Not found: ${urlPath}`, { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      ETag: etag,
      'Content-Type': type,
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Voxel review server listening on http://${HOST}:${PORT}`);
});
