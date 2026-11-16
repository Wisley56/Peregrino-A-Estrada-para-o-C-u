/**
 * Gera o ícone do site (favicon) por código: a pomba do Espírito Santo num disco de vitral, em pixel art,
 * com as cores do vitral da tela inicial (src/ui/Vitral.ts).
 *
 *   node tools/gerar-icone.mjs
 *
 * Saída em public/: favicon-16.png, favicon-32.png e apple-touch-icon.png (180×180, o de 32 ampliado sobre o fundo do jogo).
 * Cada tamanho pequeno tem o seu desenho (16 e 32 px), para ficar nítido em vez de reduzido e borrado. Não há SVG de
 * propósito: com um SVG o navegador o usaria também na aba de 16 px, reduzindo o desenho de 32 e borrando a pomba.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CORES = {
  k: '#17100b', // chumbo
  O: '#e2bd5c', // ouro
  o: '#94681e', // ouro escuro
  B: '#173f8f', // vidro azul fundo
  b: '#2156b5', // vidro azul
  c: '#4f8fe8', // vidro azul claro (o brilho no centro)
  r: '#a8202f', // joia vermelha
  a: '#d49a26', // joia âmbar
  W: '#f7f2e6', // pomba
  w: '#c9d6ec', // sombra das penas
  F: '#0d0b14', // fundo do ícone da Apple (o mesmo do jogo)
};

/** Metade esquerda da pomba; a direita é o espelho. De asas abertas, cabeça ao alto e cauda em leque, como no vitral. */
const POMBA_32 = [
  'W..........',
  'WW.........',
  'WWW........',
  'WWWW.....WW',
  '.WWWW...WWW',
  '.wWWWW..WWW',
  '..wWWWW..WW',
  '..wwWWWWWWW',
  '...wwWWWWWW',
  '....w.wWWWW',
  '.......wWWW',
  '........WWW',
  '........WWW',
  '.......WWWW',
  '......WWwWW',
  '......Ww.wW',
];
const POMBA_16 = [
  'W....',
  'WW...',
  'wWW.W',
  '.wWWW',
  '..wWW',
  '...WW',
  '..WWW',
  '..W.W',
];

const espelhar = (meia) => meia.map((l) => l + [...l].reverse().join(''));

/** Um disco de vitral n×n: aro de ouro, um anel de joias (só no grande), vidro azul mais claro no centro. */
function disco(n, joias) {
  const g = Array.from({ length: n }, () => Array(n).fill('.'));
  const c = (n - 1) / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c);
      const R = n / 2;
      if (d > R - 0.15) continue;
      if (joias && d > R - 1.1) g[y][x] = 'o';
      else if (d > R - (joias ? 2.1 : 1.1)) g[y][x] = 'O';
      else if (joias && d > R - 3.1) {
        const ang = Math.atan2(y - c, x - c) + Math.PI;
        const seg = Math.floor((ang / (Math.PI * 2)) * 16);
        g[y][x] = seg % 2 ? 'r' : 'a';
      } else if (joias && d > R - 4.1) g[y][x] = 'k';
      else g[y][x] = d < R * 0.35 ? 'c' : d < R * 0.62 ? 'b' : 'B';
    }
  return g;
}

function compor(n, pomba, dy, joias) {
  const g = disco(n, joias);
  const p = espelhar(pomba);
  const x0 = (n - p[0].length) / 2;
  p.forEach((l, y) => [...l].forEach((ch, x) => ch !== '.' && (g[y + dy][x + x0] = ch)));
  return g;
}

const ico32 = compor(32, POMBA_32, 8, true);
const ico16 = compor(16, POMBA_16, 4, false);

const crcT = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function bloco(tipo, dados) {
  const t = Buffer.concat([Buffer.from(tipo), dados]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(t));
  return Buffer.concat([len, t, c]);
}

/** PNG RGBA de uma grade ampliada por `esc` (vizinho mais próximo), com `borda` pixels de fundo `fundo` em volta. */
function png(g, esc = 1, borda = 0, fundo = null) {
  const n = g.length * esc + borda * 2;
  const linhas = [];
  for (let y = 0; y < n; y++) {
    const l = Buffer.alloc(1 + n * 4);
    for (let x = 0; x < n; x++) {
      const gx = Math.floor((x - borda) / esc), gy = Math.floor((y - borda) / esc);
      let ch = g[gy]?.[gx] ?? '.';
      if (ch === '.' && fundo) ch = fundo;
      if (ch === '.') continue;
      const h = CORES[ch];
      l.writeUInt32BE(((parseInt(h.slice(1), 16) << 8) | 0xff) >>> 0, 1 + x * 4);
    }
    linhas.push(l);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

const saida = new URL('../public/', import.meta.url);
mkdirSync(saida, { recursive: true });
writeFileSync(new URL('favicon-16.png', saida), png(ico16));
writeFileSync(new URL('favicon-32.png', saida), png(ico32));
writeFileSync(new URL('apple-touch-icon.png', saida), png(ico32, 5, 10, 'F'));
console.log('ícones gerados em public/');
