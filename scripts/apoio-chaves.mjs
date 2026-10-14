// Gera o par de chaves que assina os códigos da loja de apoio (ECDSA P-256).
//  - a chave PRIVADA fica em segredos/apoio-chave-privada.jwk.json (fora do git): quem a tem consegue emitir códigos. Guarde uma cópia
//    num lugar seguro (gerenciador de senhas); se perder, ninguém mais consegue emitir códigos que o jogo aceite;
//  - a chave PÚBLICA é impressa: cole em src/data/apoio.js (campo chavePublica). Ela só confere códigos, não os cria.
// Rodar de novo cria outro par e INVALIDA todos os códigos emitidos antes. Por isso o script não sobrescreve a chave existente
// (apague o arquivo antes, de propósito, se quiser trocar).
// Uso:  npm run apoio:chaves
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const arquivo = resolve('segredos/apoio-chave-privada.jwk.json');
if (existsSync(arquivo)) {
  console.error(`Já existe ${arquivo}.\nApague esse arquivo se quiser mesmo trocar de chave (todos os códigos emitidos antes deixam de valer).`);
  process.exit(1);
}
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
mkdirSync(resolve('segredos'), { recursive: true });
writeFileSync(arquivo, `${JSON.stringify(privateKey.export({ format: 'jwk' }), null, 2)}\n`, { mode: 0o600 });
const pub = publicKey.export({ format: 'jwk' });
console.log(`Chave privada gravada em ${arquivo} (NÃO commite; faça uma cópia segura).\nChave pública (cole em src/data/apoio.js, campo chavePublica):\n${JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y })}`);
