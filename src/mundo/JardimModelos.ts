import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * O jardim murado de Santo Agostinho (arte por código). Lembra o jardim de Milão onde ele se converteu, debaixo de
 * uma figueira, ao ouvir uma criança cantar "toma e lê" (Confissões VIII, 12): o muro de pedra com uma única porta
 * baixa e estreita (Mt 7,13), a figueira, o banco de pedra com o livro do Apóstolo aberto e os canteiros de ervas.
 *
 * Tudo em metros locais, com a origem no centro do jardim, no chão. O muro tem 12 m de lado por fora.
 */

/** Voxel do muro, da figueira e dos canteiros (m). */
const V = 0.25;
/** Metade do lado do muro por fora, em voxels (6 m). */
const M = 24;
/** Altura do muro, em voxels, sem o capeamento (2,75 m). */
const ALTURA_MURO = 11;
/** Altura do vão da porta, em voxels (1,75 m): o peregrino de joelhos cabe, de chapéu; em pé (2 m), não. */
const VAO = 7;

/** A porta estreita, no meio do muro do oeste: 1 m de largura e 1,75 m de altura (em pé, ninguém passa). */
export const PORTA = { x0: -M * V, x1: (-M + 2) * V, z0: -0.5, z1: 0.5, altura: VAO * V };
/** Altura do muro com o capeamento (m). */
export const ALTURA_DO_MURO = (ALTURA_MURO + 1) * V;
/** O tronco da figueira (m). */
export const FIGUEIRA = { x: 2.6, z: -1.4 };
/** O banco de pedra, debaixo da figueira, e o livro aberto em cima dele (m, múltiplos do voxel). */
export const BANCO = { x0: 0.5, x1: 2.25, z0: 0.5, z1: 1, altura: 0.5 };
export const LIVRO = { x: 1, z: 0.75 };
/** Os canteiros de ervas, encostados nos muros do norte e do sul (m). */
export const CANTEIROS = [
  { x0: -4, x1: 4, z0: -5.5, z1: -4.5 },
  { x0: -4, x1: 4, z0: 4.5, z1: 5.5 },
];

const pedra = (x: number, y: number, z: number) => {
  // fiadas de pedra: blocos de 3 voxels com junta escura, desencontrados a cada fiada
  const junta = ((x + z + (y % 2)) % 3 + 3) % 3 === 0;
  return variar(junta ? 0x9c927e : 0xb9ae98, x, y, z, 0.06);
};

/** O muro, a porta estreita com a verga e a cruz, o banco e os canteiros com as ervas e as flores. */
export function muroDoJardim() {
  const m = new Modelo();
  const rnd = aleatorio(354);
  const H = ALTURA_MURO;
  // os quatro lados (2 voxels de espessura) e o capeamento, um pouco mais largo
  m.caixa(-M, 0, -M, 2 * M, H, 2, pedra).caixa(-M, 0, M - 2, 2 * M, H, 2, pedra);
  m.caixa(-M, 0, -M, 2, H, 2 * M, pedra).caixa(M - 2, 0, -M, 2, H, 2 * M, pedra);
  const capa = (x: number, y: number, z: number) => variar(0xa59a86, x, y, z, 0.05);
  m.caixa(-M - 1, H, -M - 1, 2 * M + 2, 1, 4, capa).caixa(-M - 1, H, M - 3, 2 * M + 2, 1, 4, capa);
  m.caixa(-M - 1, H, -M - 1, 4, 1, 2 * M + 2, capa).caixa(M - 3, H, -M - 1, 4, 1, 2 * M + 2, capa);
  // o rodapé, mais escuro e úmido
  const rodape = (x: number, y: number, z: number) => variar(0x8e8572, x, y, z, 0.05);
  for (const [x0, z0, w, d] of [[-M, -M, 2 * M, 2], [-M, M - 2, 2 * M, 2], [-M, -M, 2, 2 * M], [M - 2, -M, 2, 2 * M]] as const)
    m.caixa(x0, 0, z0, w, 1, d, rodape);

  // a porta estreita: o vão (4 voxels de largura), as ombreiras de pedra clara e a verga inteiriça por cima
  m.caixa(-M, 0, -2, 2, VAO, 4, null);
  const ombreira = (x: number, y: number, z: number) => variar(0xcfc4ac, x, y, z, 0.03);
  m.caixa(-M, 0, -3, 2, VAO, 1, ombreira).caixa(-M, 0, 2, 2, VAO, 1, ombreira);
  m.caixa(-M - 1, VAO, -4, 3, 1, 8, (x, y, z) => variar(0x8a8070, x, y, z, 0.03));
  // a soleira gasta e a pequena cruz em relevo sobre a verga, do lado de fora
  m.caixa(-M - 1, 0, -2, 3, 1, 4, (x, y, z) => variar(0x9a907c, x, y, z, 0.04));
  m.caixa(-M - 1, 0, -2, 1, 1, 4, null); // a soleira afunda um pouco na terra
  const CRUZ = 0xd8ccb0;
  m.caixa(-M - 1, VAO + 1, -1, 1, 3, 2, CRUZ).caixa(-M - 1, VAO + 2, -2, 1, 1, 4, CRUZ);

  // hera nas faces de fora e roseiras subindo pelas de dentro
  const hera = (x: number, y: number, z: number) => variar(rnd() < 0.5 ? 0x3f6a2c : 0x4e7c34, x, y, z, 0.05);
  for (let n = 0; n < 9; n++) {
    const lado = n % 4;
    const ao = Math.floor(rnd() * (2 * M - 10)) - M + 5;
    const alto = 3 + Math.floor(rnd() * 6);
    for (let y = 0; y < alto; y++)
      for (let k = -2; k <= 2; k++) {
        if (rnd() < 0.35 + y * 0.05) continue;
        const a = ao + k + Math.round(Math.sin(y * 1.3 + n) * 1.2);
        if (lado === 0) m.ponto(a, y, -M - 1, hera(a, y, 0));
        else if (lado === 1) m.ponto(a, y, M, hera(a, y, 1));
        else if (lado === 2 && Math.abs(a) > 4) m.ponto(-M - 1, y, a, hera(0, y, a));
        else if (lado === 3) m.ponto(M, y, a, hera(1, y, a));
      }
  }
  for (const [x0, z0, dz] of [[-14, M - 3, 0], [10, M - 3, 0], [-8, -M + 2, 0], [12, -M + 2, 0]] as const) {
    for (let y = 1; y < 8; y++)
      for (let k = -2; k <= 2; k++) {
        if (rnd() < 0.45) continue;
        const x = x0 + k + Math.round(Math.sin(y * 0.9 + x0) * 1.4);
        m.ponto(x, y, z0 + dz, rnd() < 0.22 && y > 2 ? (rnd() < 0.5 ? 0xc8324a : 0xe8708a) : hera(x, y, z0));
      }
  }

  // os canteiros: a beira de pedra, a terra e as ervas (alecrim, lavanda, arruda, manjericão) com flores
  const terra = (x: number, y: number, z: number) => variar(0x5a3e28, x, y, z, 0.06);
  for (const c of CANTEIROS) {
    const x0 = c.x0 / V, x1 = c.x1 / V, z0 = c.z0 / V, z1 = c.z1 / V;
    m.caixa(x0, 0, z0, x1 - x0, 1, z1 - z0, (x, y, z) => variar(0xa49a86, x, y, z, 0.05));
    m.caixa(x0 + 1, 0, z0 + 1, x1 - x0 - 2, 1, z1 - z0 - 2, terra);
    for (let x = x0 + 1; x < x1 - 1; x++)
      for (let z = z0 + 1; z < z1 - 1; z++) {
        const r = rnd();
        if (r < 0.25) continue;
        const tipo = Math.floor((x - x0) / 4) % 4;
        const verde = [0x4a6a3a, 0x6a8a5a, 0x5a7a3e, 0x3e7a2e][tipo];
        const alto = 1 + Math.floor(rnd() * (tipo === 1 ? 3 : 2));
        for (let y = 1; y <= alto; y++) m.ponto(x, y, z, variar(verde, x, y, z, 0.06));
        if (tipo === 1 && rnd() < 0.7) m.ponto(x, alto + 1, z, variar(0x8a6ac8, x, alto, z, 0.06)); // lavanda
        else if (tipo === 3 && rnd() < 0.3) m.ponto(x, alto + 1, z, rnd() < 0.5 ? 0xf2f0e8 : 0xf2d24a);
      }
  }

  // o banco de pedra, debaixo da figueira: o assento e os dois pés
  const b = { x0: BANCO.x0 / V, x1: BANCO.x1 / V, z0: BANCO.z0 / V, z1: BANCO.z1 / V };
  const assento = (x: number, y: number, z: number) => variar(0xc2b8a2, x, y, z, 0.04);
  m.caixa(b.x0, 1, b.z0, b.x1 - b.x0, 1, b.z1 - b.z0, assento);
  m.caixa(b.x0 + 1, 0, b.z0, 1, 1, b.z1 - b.z0, pedra).caixa(b.x1 - 2, 0, b.z0, 1, 1, b.z1 - b.z0, pedra);
  return m.malha(V, [0, 0, 0]);
}

/**
 * A figueira: o tronco claro e retorcido, os galhos abertos e a copa larga de folhas grandes, com figos roxos e
 * verdes por baixo. Origem no pé do tronco.
 */
export function figueira() {
  const m = new Modelo();
  const rnd = aleatorio(1913);
  const casca = (x: number, y: number, z: number) => variar(0x8a8270, x, y, z, 0.07);
  // o tronco, um pouco torto, mais grosso embaixo
  for (let y = 0; y < 9; y++) {
    const dx = Math.round(Math.sin(y * 0.5) * 0.8);
    const w = y < 2 ? 3 : 2;
    m.caixa(-1 + dx, y, -1, w, 1, w, casca);
  }
  m.caixa(-2, 0, -1, 1, 1, 2, casca).caixa(2, 0, 0, 1, 1, 1, casca); // as raízes saindo da terra
  // os galhos: do alto do tronco para cinco lados
  const pontas: [number, number, number][] = [];
  for (let g = 0; g < 5; g++) {
    const ang = (g / 5) * Math.PI * 2 + rnd() * 0.5;
    const comp = 5 + Math.floor(rnd() * 3);
    let x = 0, y = 7 + (g % 2), z = 0;
    for (let i = 0; i < comp; i++) {
      x = Math.round(Math.cos(ang) * i);
      z = Math.round(Math.sin(ang) * i);
      y += i % 2 ? 1 : 0;
      m.ponto(x, y, z, casca(x, y, z));
    }
    pontas.push([x, y, z]);
  }
  // a copa: tufos de folhas em volta da ponta de cada galho e um no alto, com falhas (as folhas lobadas)
  const folha = [0x3e6a26, 0x4e7a2e, 0x5e8a36, 0x6a9a3e];
  pontas.push([0, 13, 0]);
  for (const [cx, cy, cz] of pontas) {
    const r = 3.4 + rnd() * 1.2;
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      for (let y = Math.floor(cy - r * 0.7); y <= cy + r * 0.8; y++)
        for (let z = Math.floor(cz - r); z <= cz + r; z++) {
          const d = Math.hypot(x - cx, (y - cy) / 0.75, z - cz);
          if (d > r || rnd() < 0.18 + (d / r) * 0.25) continue;
          const t = Math.min(3, Math.max(0, Math.floor((y - cy + r) / (r * 0.6))));
          m.ponto(x, y, z, variar(folha[t], x, y, z, 0.05));
        }
    // os figos, pendurados por baixo de cada tufo
    for (let n = 0; n < 5; n++) {
      const x = cx + Math.round((rnd() - 0.5) * r * 1.4), z = cz + Math.round((rnd() - 0.5) * r * 1.4);
      m.ponto(x, Math.round(cy - r * 0.7) - 1, z, rnd() < 0.6 ? 0x5a2a48 : 0x8aa040);
    }
  }
  return m.malha(V, [0.5, 0, 0.5]);
}

/**
 * O livro do Apóstolo aberto no banco (as cartas de São Paulo): a capa de couro, as duas páginas que sobem da
 * lombada, as linhas do texto e a fita vermelha. Origem no meio da lombada, embaixo.
 */
export function livroAberto() {
  const m = new Modelo();
  const COURO = 0x6a2418, PAGINA = 0xf0e6cc, LINHA = 0x8a8070, FITA = 0xb01828;
  m.caixa(-6, 0, -4, 12, 1, 8, (x, y, z) => variar(COURO, x, y, z, 0.05));
  for (const lado of [-1, 1]) {
    for (let i = 1; i <= 5; i++) {
      const x = lado < 0 ? -i : i - 1;
      const y = i < 2 ? 1 : 2; // as páginas sobem da lombada e descansam abertas
      m.caixa(x, 1, -3, 1, y, 6, PAGINA);
      if (i > 1) for (let z = -2; z <= 1; z++) if ((z + i) % 3) m.ponto(x, y, z, LINHA);
    }
  }
  m.caixa(0, 1, -3, 1, 1, 6, PAGINA); // a lombada
  m.caixa(0, 2, 2, 1, 1, 3, FITA).ponto(0, 1, 4, FITA); // a fita, caindo para fora
  return m.malha(0.04, [0, 0, 0]);
}
