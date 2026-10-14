import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const caixa = (page) => page.getByTestId('backup');

test('exportar gera o código, importar num jogo novo traz o progresso e pede confirmação antes de substituir', async ({ page, browser }) => {
  test.slow();      // abre dois jogos e recarrega um deles: perto do limite de 30 s numa máquina mais lenta
  const errors = await openGame(page);
  await page.evaluate(() => {
    const L = window.__loja;
    L.game.state.ouro = 98765;
    L.game.state.estoque['espada_ferro:1'] = 11;
    L.giveMaterial('barra_ferro', 33);
    L.addRep?.(900);
  });
  const repAntes = await page.evaluate(() => window.__loja.state().rep);
  await page.evaluate(() => window.__loja.abrirBackup());
  await expect(caixa(page)).toBeVisible();
  const codigo = page.getByTestId('backup-codigo');
  await expect(codigo).toHaveValue(/^LOJA1-[0-9a-f]{8}-/, { timeout: 10_000 });
  const texto = await codigo.inputValue();
  console.log(`código com ${texto.length} caracteres`);
  expect(texto.length).toBeLessThan(20_000);
  await page.screenshot({ path: shotPath('backup-exportar') });
  // copiar: dá o aviso (o clipboard pode estar bloqueado no teste; a mensagem muda, mas aparece)
  await page.getByTestId('backup-copiar').click();
  await expect(caixa(page).locator('.bk-msg').first()).not.toHaveText('');
  await page.keyboard.press('Escape');
  await expect(caixa(page)).toHaveCount(0);

  // outro aparelho: navegador novo, jogo novo
  const ctx = await browser.newContext({ viewport: VIEWPORTS.portrait });
  const p2 = await ctx.newPage();
  const erros2 = await openGame(p2);
  expect((await p2.evaluate(() => window.__loja.state().ouro))).not.toBe(98765);
  await p2.evaluate(() => window.__loja.abrirBackup());
  const entrada = p2.getByTestId('backup-entrada');
  // código errado: mensagem clara, nada muda
  await entrada.fill(texto.slice(0, -30));
  await p2.getByTestId('backup-importar').click();
  await expect(caixa(p2).locator('.bk-msg.erro')).toContainText('incompleto');
  expect((await p2.evaluate(() => window.__loja.state().ouro))).not.toBe(98765);
  // código certo (colado com quebras de linha): mostra o resumo e pede confirmação
  await entrada.fill(`Meu save:\n${texto.match(/.{1,60}/g).join('\n')}`);
  await p2.getByTestId('backup-importar').click();
  await expect(caixa(p2).locator('.bk-msg.ok')).toContainText('98.765');
  await expect(p2.getByTestId('backup-importar')).toHaveText('Substituir meu progresso');
  expect((await p2.evaluate(() => window.__loja.state().ouro)), 'ainda não substituiu').not.toBe(98765);
  await p2.screenshot({ path: shotPath('backup-importar') });
  await Promise.all([p2.waitForEvent('load'), p2.getByTestId('backup-importar').click()]);
  await p2.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  const s2 = await p2.evaluate(() => window.__loja.state());
  expect(s2.ouro).toBeGreaterThanOrEqual(98765);
  expect(s2.estoque['espada_ferro:1']).toBe(11);
  expect(s2.materiais.barra_ferro).toBe(33);
  expect(s2.rep).toBe(repAntes);
  // e continua depois de recarregar de novo (o save importado foi gravado de verdade)
  await p2.reload();
  await p2.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  expect((await p2.evaluate(() => window.__loja.state().estoque['espada_ferro:1']))).toBe(11);
  expect(errors).toEqual([]);
  expect(erros2).toEqual([]);
  await ctx.close();
});

test('lixo no campo não quebra nada', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__loja.abrirBackup());
  const antes = await page.evaluate(() => window.__loja.state().ouro);
  for (const lixo of ['', 'oi', '{"a":1}', 'LOJA1-00000000-abc', '<script>alert(1)</script>']) {
    await page.getByTestId('backup-entrada').fill(lixo);
    await page.getByTestId('backup-importar').click();
    await expect(caixa(page).locator('.bk-msg.erro')).not.toHaveText('');
  }
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(antes);
  expect(errors).toEqual([]);
});
