// Pix "copia e cola" (BR Code estático do Banco Central): monta o texto que o app do banco entende, com a chave da Scorpion Bits e,
// se houver, o valor. É só texto: nada sai do aparelho e não há como saber se o pagamento foi feito (veja core/apoio.js para os códigos).

// CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), o que o BR Code exige no fim do texto
export function crc16(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;
// o BR Code só aceita letras sem acento, números e alguns sinais nos nomes
const limpar = (s, max) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);

// `valor` em reais (opcional); `txid`: identificador da cobrança (letras e números, até 25; "***" = sem identificador)
export function pixCopiaECola({ chave, nome, cidade, valor, txid = '***' }) {
  if (!chave) throw new Error('Pix sem chave');
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  let texto = campo('00', '01') + campo('01', '11') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (valor !== undefined && valor !== null) {
    if (!(valor > 0) || valor > 99999999) throw new Error('valor do Pix inválido');
    texto += campo('54', valor.toFixed(2));
  }
  texto += campo('58', 'BR') + campo('59', limpar(nome, 25)) + campo('60', limpar(cidade, 15));
  texto += campo('62', campo('05', txid === '***' ? txid : limpar(txid, 25).replace(/ /g, '')));
  texto += '6304';
  return texto + crc16(texto);
}

export const reais = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
