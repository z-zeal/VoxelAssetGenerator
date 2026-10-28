#!/usr/bin/env node
/**
 * Zero-dependency static server for the voxel review gallery.
 *
 * The gallery has to read PNG pixels (to relight sprites from the normal and
 * material maps) and fetch the manifests, and browsers refuse both from
 * `file://` — a local file is an opaque origin, so canvases get tainted and
 * `fetch` is blocked. Serving the folder over http keeps everything same-origin.
 *
 *   node tools/voxel_pipeline/v3/serve.mjs [port]
 *   → http://localhost:8099/voxel-sprite-review-v4.html
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/voxel-sprite-review-v4.html';

  const target = path.join(ROOT, urlPath);
  // Refuse to escape the repository root.
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end(`not found: ${urlPath}`);
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-cache',
      // The gallery is also served through a preview proxy; keep it embeddable.
      'access-control-allow-origin': '*',
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voxel review gallery → http://localhost:${PORT}/voxel-sprite-review-v4.html`);
  console.log(`serving ${ROOT}`);
});
