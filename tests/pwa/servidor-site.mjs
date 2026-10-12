// Monta uma "cópia do site" para testar a versão publicada em scorpionbits.com/loja/: o jogo (build "site") em /loja/ e, ao lado,
// o PixiJS, as fontes e o logo em /assets/, como no repositório do site. Serve tudo na porta 5197 (sem frameworks).
import { execSync } from 'node:child_process';
import { cpSync, createReadStream, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..', '..');
const site = resolve(raiz, 'tests/out/site-raiz');

execSync('npx vite build --mode site', { cwd: raiz, stdio: 'inherit' });
rmSync(site, { recursive: true, force: true });
mkdirSync(join(site, 'assets/vendor'), { recursive: true });
cpSync(resolve(raiz, 'dist-site'), join(site, 'loja'), { recursive: true });
cpSync(resolve(raiz, 'node_modules/pixi.js/dist/pixi.min.js'), join(site, 'assets/vendor/pixi.min.js'));
cpSync(resolve(raiz, 'public/fonts'), join(site, 'assets/fonts'), { recursive: true });
for (const f of ['logo-glyph.png', 'favicon.png']) cpSync(resolve(raiz, 'public', f), join(site, 'assets', f));

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
createServer((req, res) => {
  let caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let arquivo = join(site, caminho);
  if (existsSync(arquivo) && statSync(arquivo).isDirectory()) arquivo = join(arquivo, 'index.html');
  if (!existsSync(arquivo)) { res.writeHead(404); res.end('não achei'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(arquivo).pipe(res);
}).listen(5197, () => console.log('site de teste em http://localhost:5197/loja/'));
