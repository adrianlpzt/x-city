/**
 * Servidor estático mínimo para producción (Railway u otro PaaS).
 * Sin dependencias: sirve la carpeta dist/ que genera `npm run build`.
 *
 *   npm run build && npm start     → http://localhost:8080 (o $PORT)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Cabeceras de seguridad. El juego no carga nada de terceros, así que la CSP
// puede ser estricta. 'unsafe-inline' en style-src lo necesita Phaser (estilos
// del canvas) y el favicon es un data: URI.
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

async function resolveFile(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const candidate = resolve(join(ROOT, normalize(pathname)));
  // Evita path traversal (../../etc/passwd): el fichero debe quedar dentro de dist/
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;
  try {
    const s = await stat(candidate);
    if (s.isFile()) return candidate;
    if (s.isDirectory()) {
      const index = join(candidate, 'index.html');
      if ((await stat(index)).isFile()) return index;
    }
  } catch {
    /* no existe */
  }
  return null;
}

const gzCache = new Map();

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS }).end();
    return;
  }
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS }).end('ok');
    return;
  }

  const file = await resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }).end('No encontrado');
    return;
  }
  const raw = await readFile(file);
  // Gzip (Phaser pesa 1,2 MB sin comprimir y ~330 KB comprimido). Se cachea en memoria.
  const compressible = /^(text\/|application\/json|image\/svg)/.test(MIME[extname(file)] ?? '');
  const wantsGzip = compressible && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
  let body = raw;
  if (wantsGzip) {
    body = gzCache.get(file) ?? gzipSync(raw, { level: 9 });
    gzCache.set(file, body);
  }
  const isAsset = file.includes(`${sep}assets${sep}`); // nombres con hash → cacheables "para siempre"
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Content-Length': body.length,
    ...(wantsGzip ? { 'Content-Encoding': 'gzip' } : {}),
    Vary: 'Accept-Encoding',
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...SECURITY_HEADERS,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`X City sirviendo ${ROOT} en el puerto ${PORT}`);
});
