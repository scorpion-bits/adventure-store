import { mkdirSync } from 'node:fs';

export const VIEWPORTS = {
  portrait: { width: 390, height: 844 },
  landscape: { width: 844, height: 390 },
  desktop: { width: 1280, height: 800 },
};

mkdirSync(new URL('../out/shots', import.meta.url), { recursive: true });
export const shotPath = (name) => new URL(`../out/shots/${name}.png`, import.meta.url).pathname;

// abre o jogo e devolve a lista de erros de console/página (deve terminar vazia)
export async function openGame(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto('/');
  await page.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  await page.waitForTimeout(600);   // animação de entrada
  return errors;
}
