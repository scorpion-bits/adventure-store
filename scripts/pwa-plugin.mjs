// Plugin do Vite para o app instalável (PWA) na versão "standalone": depois do build, escreve dist/sw.js com a lista de
// todos os arquivos do jogo. O service worker guarda tudo na instalação, então o jogo abre e roda sem internet.
// A versão muda sozinha quando qualquer arquivo muda (hash da lista com tamanhos), e o cache antigo é apagado.
import { cpSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';

function listar(dir, base = dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? listar(caminho, base) : [relative(base, caminho).split('\\').join('/')];
  });
}

const SW = (versao, arquivos) => `// Gerado por scripts/pwa-plugin.mjs — não edite. Versão ${versao}.
const CACHE = 'loja-${versao}';
const ARQUIVOS = ${JSON.stringify(arquivos)};

// cache: 'reload' pula o cache HTTP do navegador (a página tem max-age de minutos): sem isso o service worker novo podia guardar
// o index.html velho e o app ficava preso na versão antiga
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('loja-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// cache primeiro (os arquivos do build têm hash no nome); o que não estiver lá vai à rede e fica guardado
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit
      || fetch(req).then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
`;

// extras: arquivos fora da pasta do jogo que ele usa (caminhos relativos ao sw.js), ex.: o PixiJS do site
// copiarPublico: itens de `public/` a copiar para o build (na versão do site a pasta public não vai inteira)
export function pwaPlugin({ extras = [], copiarPublico = [] } = {}) {
  let outDir = 'dist';
  let raiz = '.';
  return {
    name: 'pwa-service-worker',
    apply: 'build',
    configResolved(cfg) { outDir = resolve(cfg.root, cfg.build.outDir); raiz = cfg.root; },
    closeBundle() {
      for (const item of copiarPublico) {
        const origem = resolve(raiz, 'public', item);
        if (existsSync(origem)) cpSync(origem, join(outDir, item), { recursive: true });
      }
      const arquivos = listar(outDir).filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha1');
      for (const f of arquivos) hash.update(`${f}:${statSync(join(outDir, f)).size};`);
      for (const e of extras) hash.update(`${e};`);
      const versao = hash.digest('hex').slice(0, 10);
      // './' (a página) mais cada arquivo, relativos à pasta do sw.js
      writeFileSync(join(outDir, 'sw.js'), SW(versao, ['./', ...arquivos.map((f) => `./${f}`), ...extras]));
    },
  };
}
