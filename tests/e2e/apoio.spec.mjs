import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const janela = (page) => page.getByTestId('apoio');

test('janela de apoio: Pix de valor livre, loja, passo a passo da compra e ativação de um código', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__loja.abrirApoio());
  await expect(janela(page)).toBeVisible();
  await expect(janela(page)).toContainText('60345144000101');
  await expect(page.getByTestId('produto-pacote_apoiador')).toContainText('R$ 19,90');
  await page.screenshot({ path: shotPath('apoio-janela') });

  // copiar a chave: o clipboard pode estar bloqueado no teste, mas o aviso aparece
  await page.getByTestId('apoio-copiar-chave').click();
  await expect(janela(page).locator('.bk-msg').first()).not.toHaveText('');

  // passo a passo da compra de um tema
  await page.getByTestId('comprar-tema_gelo').click();
  await expect(page.getByTestId('pix-tema_gelo')).toBeVisible();
  await expect(janela(page)).toContainText('R$ 4,90');
  await page.screenshot({ path: shotPath('apoio-comprar') });

  // código errado: mensagem clara, nada muda
  await page.getByTestId('apoio-codigo').fill('LOJAP1-abc.def');
  await page.getByTestId('apoio-ativar').click();
  await expect(page.getByTestId('apoio-msg')).toContainText('não');
  expect(await page.evaluate(() => window.__loja.apoio.apoiador())).toBe(false);

  // código certo (assinado com uma chave de teste, que o jogo passa a aceitar só nesta página)
  const codigo = await page.evaluate(async () => {
    const { assinarCodigo } = await import('/src/core/apoio.js');
    const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    window.__loja.apoio.usarChavePublica(await crypto.subtle.exportKey('jwk', k.publicKey));
    return assinarCodigo('pacote_apoiador', 'teste-e2e', await crypto.subtle.exportKey('jwk', k.privateKey));
  });
  await page.getByTestId('apoio-codigo').fill(codigo);
  await page.getByTestId('apoio-ativar').click();
  await expect(page.getByTestId('produto-tema_gelo')).toContainText('você tem');
  await expect(page.getByTestId('produto-sem_anuncios')).toContainText('você tem');
  await expect(janela(page)).toContainText('obrigado');
  await page.screenshot({ path: shotPath('apoio-ativado') });
  expect(await page.evaluate(() => window.__loja.apoio.semAnuncios())).toBe(true);

  // o tema liberado já pode ser usado (e a conquista de "todas as decorações" não depende dele)
  await page.keyboard.press('Escape');
  await expect(janela(page)).toHaveCount(0);
  const tema = await page.evaluate(async () => {
    const { usarDecoracao, temaAtual } = await import('/src/core/upgrades.js');
    const r = usarDecoracao(window.__loja.game, 'gelo');
    return { ok: r.ok, id: temaAtual(window.__loja.game).id };
  });
  expect(tema).toEqual({ ok: true, id: 'gelo' });

  // o código fica guardado à parte do save: apagar o progresso não o leva embora
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('scorpion-bits-loja-apoio')).length);
  expect(guardado).toBe(1);
  expect(errors).toEqual([]);
});

test('o jogo sem códigos mostra os temas pagos como "Loja de apoio" em Melhorias', async ({ page }) => {
  const errors = await openGame(page);
  const p = await page.evaluate(() => window.__loja.tabCenter(4));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'melhorias');
  await page.evaluate(() => window.__loja.melhorias.irParaSub?.('loja'));
  await page.waitForTimeout(400);
  const nomes = await page.evaluate(() => window.__loja.melhorias.nomes());
  expect(nomes.some((n) => n.startsWith('apoio-tema:'))).toBe(true);
  expect(errors).toEqual([]);
});
