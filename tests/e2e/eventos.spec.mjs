import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const aberto = (page) => page.waitForFunction(() => window.__loja.eventos.mostrando() && window.__loja.modalOpen());
const clicarModal = async (page, nome) => {
  await quadros(page, 3);
  const p = await page.evaluate((n) => window.__loja.eventos.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 3);
};

test('um evento abre sozinho, não se fecha sem escolher, e a escolha aplica os efeitos', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__loja.eventos.disparar('inspecao_fiscal'));
  await aberto(page);
  await page.screenshot({ path: shotPath('portrait-evento') });

  // não dá para dispensar: Esc e toque fora não fecham
  await page.keyboard.press('Escape');
  await page.mouse.click(4, 840);
  await quadros(page, 3);
  expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBe('inspecao_fiscal');

  const ouroAntes = await page.evaluate(() => window.__loja.state().ouro);
  await clicarModal(page, 'escolha:0');                           // pagar a taxa de 40
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(ouroAntes - 40);
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBeNull();
  await page.screenshot({ path: shotPath('portrait-evento-resultado') });
  await clicarModal(page, 'continuar');
  expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
  expect(errors).toEqual([]);
});

test('escolha que custa mais do que o jogador tem não resolve o evento', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { window.__loja.state().ouro = 5; window.__loja.eventos.disparar('feira_cidade'); });
  await aberto(page);
  await clicarModal(page, 'escolha:0');                           // montar barraca: 30
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBe('feira_cidade');
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(5);
  await clicarModal(page, 'escolha:1');                           // deixar como está: grátis
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBeNull();
  await clicarModal(page, 'continuar');
  expect(errors).toEqual([]);
});

test('bônus de evento aparece numa faixa na Loja, com o tempo que falta', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__loja.eventos.disparar('feira_cidade'));
  await aberto(page);
  await clicarModal(page, 'escolha:0');
  await clicarModal(page, 'continuar');
  expect(await page.evaluate(() => window.__loja.state().bonus.length)).toBe(1);
  expect(await page.evaluate(() => window.__loja.game.mods.chegada)).toBeCloseTo(1.5, 5);
  await page.evaluate(() => window.__loja.loja.renderAgora());
  await quadros(page, 4);
  await page.screenshot({ path: shotPath('portrait-bonus-faixa') });
  await page.evaluate(() => window.__loja.skip(7 * 60000));
  await quadros(page, 3);
  expect(await page.evaluate(() => window.__loja.game.mods.chegada)).toBe(1);
  expect(errors).toEqual([]);
});

test('evento pendente volta ao reabrir o jogo', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { window.__loja.eventos.disparar('ladrao_loja'); window.__loja.save(); });
  await aberto(page);
  await page.reload();
  await page.waitForFunction(() => window.__loja?.ready);
  await aberto(page);
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBe('ladrao_loja');
  expect(errors).toEqual([]);
});

test('durante o tutorial nenhum evento dispara', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  await page.evaluate(() => { window.__loja.state().eventos.proximo = 0; });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__loja.eventos.pendente())).toBeNull();
  expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
  expect(errors).toEqual([]);
});

test('o evento espera uma janela aberta (configurações) fechar para aparecer', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__loja.openSettings());
  await page.waitForFunction(() => window.__loja.modalOpen());
  await page.evaluate(() => window.__loja.eventos.disparar('bardo_loja'));
  await quadros(page, 4);
  expect(await page.evaluate(() => window.__loja.eventos.mostrando())).toBe(false);
  await page.evaluate(() => window.__loja.closeModal());
  await aberto(page);
  expect(errors).toEqual([]);
});
