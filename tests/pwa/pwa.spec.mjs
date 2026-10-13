import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

// as duas versões do jogo são instaláveis: a da página do repositório e a que vai para scorpionbits.com/loja/
const VERSOES = [
  { nome: 'página do repositório', url: 'http://localhost:5198/', escopo: 'http://localhost:5198/' },
  { nome: 'site (/loja/)', url: 'http://localhost:5197/loja/', escopo: 'http://localhost:5197/loja/' },
];

async function abrir(page, url) {
  const erros = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  return erros;
}

for (const v of VERSOES) {
  test.describe(v.nome, () => {
    test('o manifesto e os ícones existem e descrevem um app que abre em tela cheia', async ({ page, request }) => {
      const erros = await abrir(page, v.url);
      const href = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(href).toBeTruthy();
      const m = await (await request.get(new URL(href, page.url()).href)).json();
      expect(m.display).toBe('standalone');
      expect(m.name).toBe('Loja do Aventureiro');
      expect(m.lang).toBe('pt-BR');
      const tamanhos = m.icons.map((i) => i.sizes);
      expect(tamanhos).toContain('192x192');
      expect(tamanhos).toContain('512x512');
      expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
      for (const icone of m.icons) {
        const r = await request.get(new URL(icone.src, new URL(href, page.url())).href);
        expect(r.status(), icone.src).toBe(200);
        expect(r.headers()['content-type']).toContain('image/png');
      }
      expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBe(1);
      expect(erros).toEqual([]);
    });

    test('o service worker instala, guarda o jogo e ele abre sem internet', async ({ page, context }) => {
      const erros = await abrir(page, v.url);
      const reg = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
      expect(reg).toBe(v.escopo);
      await page.waitForFunction(async () => {
        const nomes = await caches.keys();
        const nome = nomes.find((n) => n.startsWith('loja-'));
        if (!nome) return false;
        return (await (await caches.open(nome)).keys()).length >= 8;
      }, null, { timeout: 20_000 });
      await page.reload();
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
      expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
      expect(await page.locator('canvas').count()).toBe(1);
      expect(await page.evaluate(() => typeof window.PIXI !== 'undefined' || document.querySelector('canvas') !== null)).toBe(true);
      await context.setOffline(false);
      expect(erros.filter((e) => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
    });

    test('o progresso salvo continua depois de fechar e abrir de novo, também offline', async ({ page, context }) => {
      await abrir(page, v.url);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
      await page.evaluate(() => localStorage.setItem('scorpion-bits-loja-teste', 'ok'));
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
      expect(await page.evaluate(() => localStorage.getItem('scorpion-bits-loja-teste'))).toBe('ok');
      await context.setOffline(false);
    });
  });
}

test('o service worker da versão do site guarda também o PixiJS e as fontes do site (fora da pasta /loja/)', async ({ page }) => {
  await abrir(page, 'http://localhost:5197/loja/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => {
    const nome = (await caches.keys()).find((n) => n.startsWith('loja-'));
    return !!nome && (await (await caches.open(nome)).keys()).length >= 8;
  }, null, { timeout: 20_000 });
  const urls = await page.evaluate(async () => {
    const nome = (await caches.keys()).find((n) => n.startsWith('loja-'));
    return (await (await caches.open(nome)).keys()).map((r) => new URL(r.url).pathname);
  });
  expect(urls).toContain('/assets/vendor/pixi.min.js');
  expect(urls).toContain('/assets/fonts/grotesk-latin.woff2');
  expect(urls).toContain('/loja/index.html');
});

// ---------- atualização: o app instalado não pode ficar preso numa versão velha ----------
// Sobe uma cópia do build numa pasta temporária, abre o jogo, "publica" uma versão nova por cima e confere que o app a percebe
// sozinho ao voltar para o primeiro plano (um app instalado costuma ser só retomado, sem recarregar a página) e se atualiza.
test('o app instalado percebe a versão nova ao voltar ao primeiro plano e se atualiza sozinho', async ({ page }) => {
  const { cpSync, mkdtempSync, readFileSync, writeFileSync, createReadStream, existsSync, statSync } = await import('node:fs');
  const { createServer } = await import('node:http');
  const { tmpdir } = await import('node:os');
  const { join, extname } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'loja-atualizacao-'));
  cpSync(new URL('../../dist', import.meta.url).pathname, dir, { recursive: true });
  const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
  const servidor = createServer((req, res) => {
    let caminho = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(caminho) && statSync(caminho).isDirectory()) caminho = join(caminho, 'index.html');
    if (!existsSync(caminho)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' });
    createReadStream(caminho).pipe(res);
  });
  await new Promise((ok) => servidor.listen(5196, ok));
  try {
    await abrir(page, 'http://localhost:5196/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();                                      // agora o service worker controla a página
    await page.waitForFunction(() => !document.getElementById('boot') && !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
    expect(await page.locator('meta[name="versao-teste"]').count()).toBe(0);

    // versão nova publicada: página e service worker mudam
    const html = readFileSync(join(dir, 'index.html'), 'utf8').replace('<head>', '<head><meta name="versao-teste" content="2">');
    writeFileSync(join(dir, 'index.html'), html);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8').replace(/const CACHE = 'loja-[^']+'/, "const CACHE = 'loja-versao-de-teste'");
    writeFileSync(join(dir, 'sw.js'), sw);

    // o jogador volta para o app (sem recarregar a página)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => page.locator('meta[name="versao-teste"]').count(), { timeout: 30_000 }).toBe(1);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
    expect(await page.locator('canvas').count()).toBe(1);
  } finally {
    servidor.close();
  }
});
