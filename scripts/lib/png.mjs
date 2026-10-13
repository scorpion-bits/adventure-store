// Leitor e gravador mínimos de PNG (sem entrelaçamento): o suficiente para empacotar os atlas
// sem depender de nenhuma biblioteca de imagem.
import { inflateSync, deflateSync } from 'node:zlib';

const ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Lê PNG sem entrelaçamento: RGBA ou RGB de 8 bits e paleta (1, 2, 4 ou 8 bits, com transparência da chunk tRNS). Devolve sempre RGBA.
export function lerPng(buf) {
  if (!buf.subarray(0, 8).equals(ASSINATURA)) throw new Error('não é um PNG');
  let pos = 8;
  let w = 0; let h = 0; let profundidade = 0; let tipoCor = 0; let entrelacado = 0;
  let paleta = null; let transparencia = null;
  const dados = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tipo = buf.toString('ascii', pos + 4, pos + 8);
    const corpo = buf.subarray(pos + 8, pos + 8 + len);
    if (tipo === 'IHDR') { w = corpo.readUInt32BE(0); h = corpo.readUInt32BE(4); profundidade = corpo[8]; tipoCor = corpo[9]; entrelacado = corpo[12]; }
    else if (tipo === 'PLTE') paleta = corpo;
    else if (tipo === 'tRNS') transparencia = corpo;
    else if (tipo === 'IDAT') dados.push(corpo);
    else if (tipo === 'IEND') break;
    pos += 12 + len;
  }
  const suportado = entrelacado === 0 && ((tipoCor === 6 && profundidade === 8) || (tipoCor === 2 && profundidade === 8) || (tipoCor === 3 && profundidade <= 8));
  if (!suportado) throw new Error('só PNG sem entrelaçamento, RGBA/RGB de 8 bits ou com paleta é suportado');
  const canais = tipoCor === 6 ? 4 : tipoCor === 2 ? 3 : 1;
  const bitsPixel = canais * profundidade;
  const stride = Math.ceil((w * bitsPixel) / 8);          // bytes por linha (sem o byte de filtro)
  const bpp = Math.max(1, bitsPixel >> 3);                 // bytes por pixel para os filtros
  const raw = inflateSync(Buffer.concat(dados));
  const bruto = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filtro = raw[y * (stride + 1)];
    const linha = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? bruto[y * stride + x - bpp] : 0;
      const b = y > 0 ? bruto[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? bruto[(y - 1) * stride + x - bpp] : 0;
      let v = linha[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      bruto[y * stride + x] = v & 0xff;
    }
  }
  if (tipoCor === 6) return { w, h, px: bruto };
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (tipoCor === 2) {
        const i = y * stride + x * 3;
        px[o] = bruto[i]; px[o + 1] = bruto[i + 1]; px[o + 2] = bruto[i + 2]; px[o + 3] = 255;
      } else {
        const bit = x * profundidade;
        const byte = bruto[y * stride + (bit >> 3)];
        const idx = (byte >> (8 - profundidade - (bit & 7))) & ((1 << profundidade) - 1);
        px[o] = paleta[idx * 3]; px[o + 1] = paleta[idx * 3 + 1]; px[o + 2] = paleta[idx * 3 + 2];
        px[o + 3] = transparencia && idx < transparencia.length ? transparencia[idx] : 255;
      }
    }
  }
  return { w, h, px };
}

const tabelaCrc = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = tabelaCrc[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function bloco(tipo, corpo) {
  const t = Buffer.from(tipo, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(corpo.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, corpo])));
  return Buffer.concat([len, t, corpo, crc]);
}

export function gravarPng({ w, h, px }) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([ASSINATURA, bloco('IHDR', ihdr), bloco('IDAT', deflateSync(raw, { level: 9 })), bloco('IEND', Buffer.alloc(0))]);
}
