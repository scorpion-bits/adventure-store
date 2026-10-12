import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const KEY = 'scorpion-bits-loja-v1';

test('jogo novo começa com 100 de ouro, salva e recarrega o progresso', async ({ page }) => {
  const errors = await openGame(page);
  expect(await page.evaluate(() => window.__loja.origem)).toBe('novo');
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(100);

  await page.evaluate(() => { window.__loja.give(50); window.__loja.addRep(40); window.__loja.save(); });
  await page.reload();
  await page.waitForFunction(() => window.__loja?.ready);
  expect(await page.evaluate(() => window.__loja.origem)).toBe('carregado');
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(150);
  expect(await page.evaluate(() => window.__loja.game.nivel())).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('save antigo, com poucos campos, carrega sem erro', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('semeado')) {
      sessionStorage.setItem('semeado', '1');
      localStorage.setItem(key, JSON.stringify({ versao: 1, ouro: 7 }));
    }
  }, KEY);
  const errors = await openGame(page);
  expect(await page.evaluate(() => window.__loja.origem)).toBe('carregado');
  const s = await page.evaluate(() => window.__loja.state());
  expect(s.ouro).toBe(7);
  expect(s.stats.vendas).toBe(0);
  expect(errors).toEqual([]);
});

test('save corrompido não impede o jogo de abrir', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('semeado')) {
      sessionStorage.setItem('semeado', '1');
      localStorage.setItem(key, '{{{ lixo');
    }
  }, KEY);
  const errors = await openGame(page);
  expect(await page.evaluate(() => window.__loja.origem)).toBe('corrompido');
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(100);
  expect(errors).toEqual([]);
});

test('virar o dia do calendário atualiza o dia de jogo', async ({ page }) => {
  const errors = await openGame(page);
  const antes = await page.evaluate(() => window.__loja.state().dia.data);
  await page.evaluate(() => window.__loja.setDay('2099-03-04'));
  expect(await page.evaluate(() => window.__loja.state().dia.data)).toBe('2099-03-04');
  expect(antes).not.toBe('2099-03-04');
  expect(errors).toEqual([]);
});

test('apagar progresso volta ao jogo novo', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { window.__loja.give(500); window.__loja.save(); });
  await page.evaluate(() => window.__loja.reset());
  await page.waitForFunction(() => window.__loja?.ready);
  expect(await page.evaluate(() => window.__loja.origem)).toBe('novo');
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(100);
  await page.waitForTimeout(900);
  await page.screenshot({ path: shotPath('portrait-dados') });
  expect(errors).toEqual([]);
});
