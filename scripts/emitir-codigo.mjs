// Emite um código da loja de apoio, depois que o pagamento chegou. O código vai para o jogador por e-mail/mensagem e ele o digita no jogo.
// Usa a chave privada de segredos/apoio-chave-privada.jwk.json (criada por `npm run apoio:chaves`; fora do git) ou o caminho em APOIO_CHAVE_PRIVADA.
// Uso:  npm run apoio:codigo -- <produto> [<identificador do pedido>]
//   ex.: npm run apoio:codigo -- tema_gelo pix-2026-10-14-joao
//        npm run apoio:codigo -- --lista        (mostra os produtos)
// O identificador do pedido existe para o mesmo código não ser ativado duas vezes no mesmo aparelho; se faltar, usa a data e hora.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { APOIO } from '../src/data/apoio.js';
import { assinarCodigo } from '../src/core/apoio.js';

const [produto, pedido] = process.argv.slice(2);
if (!produto || produto === '--lista') {
  console.log('Produtos:\n' + APOIO.produtos.map((p) => `  ${p.id.padEnd(18)} R$ ${p.preco.toFixed(2).replace('.', ',')}  ${p.nome}`).join('\n'));
  process.exit(produto ? 0 : 1);
}
if (!APOIO.produtos.some((p) => p.id === produto)) { console.error(`Produto desconhecido: ${produto}. Rode com --lista.`); process.exit(1); }
const arquivo = resolve(process.env.APOIO_CHAVE_PRIVADA ?? 'segredos/apoio-chave-privada.jwk.json');
if (!existsSync(arquivo)) { console.error(`Não achei a chave privada em ${arquivo}. Rode "npm run apoio:chaves" (ou aponte APOIO_CHAVE_PRIVADA).`); process.exit(1); }
const chave = JSON.parse(readFileSync(arquivo, 'utf8'));
const id = pedido ?? new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
console.log(await assinarCodigo(produto, id, chave));
