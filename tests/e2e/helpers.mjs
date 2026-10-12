import { mkdirSync } from 'node:fs';

export const VIEWPORTS = {
  portrait: { width: 390, height: 844 },
  landscape: { width: 844, height: 390 },
  desktop: { width: 1280, height: 800 },
};

mkdirSync(new URL('../out/shots', import.meta.url), { recursive: true });
export const shotPath = (name) => new URL(`../out/shots/${name}.png`, import.meta.url).pathname;

// abre o jogo e devolve a lista de erros de console/página (deve terminar vazia)
export async function openGame(page, opcoes = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  // ?hoje fixa a data do jogo numa época sem evento sazonal (os números dos testes não podem depender do dia em que rodam)
  await page.goto(`/?${opcoes.tutorial ? '' : 'semtutorial&'}${opcoes.conquistas ? '' : 'semconquistas&'}hoje=${opcoes.hoje ?? '2026-08-04'}`);
  await page.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  await page.waitForTimeout(600);   // animação de entrada
  return errors;
}

// espera `n` quadros do navegador (o Pixi só atualiza as áreas de toque ao desenhar; com GL por software cada quadro demora)
export const quadros = (page, n = 3) => page.evaluate((k) => new Promise((resolve) => {
  const passo = (i) => (i <= 0 ? resolve() : requestAnimationFrame(() => passo(i - 1)));
  passo(k);
}), n);

// rola a lista da tela até `nome` ficar visível e espera o Pixi desenhar (tela: 'oficina' | 'mercado' | 'melhorias')
export async function ver(page, tela, nome) {
  await page.evaluate(([t, n]) => window.__loja[t].ver(n), [tela, nome]);
  await quadros(page, 3);
}
