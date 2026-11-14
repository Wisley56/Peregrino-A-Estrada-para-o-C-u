import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * Os modelos do terceiro estágio do galinheiro: o Hospital Irmã Dulce (docs/regioes/01-ruas-da-bahia.md, seção 5,
 * "O Hospital Irmã Dulce"). A planta tem 17 × 7 m (voxel de 0,25 m), com a porta em +z como o galinheiro:
 *
 * - no meio, a enfermaria grande (as duas fileiras de catres);
 * - a oeste, a capelinha (altar, sacrário, crucifixo e dois bancos);
 * - a leste, o quarto simples de Irmã Dulce, com a cadeira num canto;
 * - fora, a entrada curva de vidro com a marquise branca em arco, as colunas, os dois vasos com palmeirinhas, o
 *   letreiro de letras verdes (só as letras: o logotipo do hospital é marca registrada e não entra) e, a leste,
 *   o pátio com a mangueira.
 *
 * A fachada moderna é anacrônica de propósito: é o "agora" do que o galinheiro virou.
 */

const v = (hex: number, k = 0.04) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
const CAL = 0xf4f1ea, BARRA = 0x5f9e8f, BRANCO = 0xf8f8f4, VIDRO = 0xa8d4e0, MADEIRA = 0x6a4a30, OURO = 0xd8b048;
const VERDE_LETRA = 0x1f8a4a;

/** O vidro da entrada: claro e transparente, sem projetar sombra. */
export const materialVidro = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.36, depthWrite: false });

/** A planta do hospital, em voxels de 0,25 m: largura, fundo e a altura do térreo. */
export const W3 = 68, D3 = 28, H3 = 12;
/** As divisórias entre a enfermaria e as alas (x local, em metros): a capelinha a oeste, o quarto a leste. */
export const DIVISAO = 5;

/** Uma janela de 5 voxels de largura com caixilho branco e o vidro, numa parede ao longo de x (eixo 'x') ou de z. */
function janela(m: Modelo, a: number, y: number, fixo: number, eixo: 'x' | 'z', alto = 4) {
  for (let i = -1; i <= 5; i++)
    for (let j = -1; j <= alto; j++) {
      const borda = i === -1 || i === 5 || j === -1 || j === alto || i === 2;
      const cor = borda ? BRANCO : VIDRO;
      if (eixo === 'x') m.ponto(a + i, y + j, fixo, cor);
      else m.ponto(fixo, y + j, a + i, cor);
    }
}

/** O térreo: as paredes caiadas com a barra verde-água, as divisórias com as passagens, as janelas e a porta. */
export function hospitalTerreo() {
  const m = new Modelo();
  const parede = (x: number, y: number, z: number) => (y < 4 ? variar(BARRA, x, y, z, 0.03) : variar(CAL, x, y, z, 0.012));
  m.caixa(0, 0, 0, W3, H3, 1, parede).caixa(0, 0, D3 - 1, W3, H3, 1, parede);
  m.caixa(0, 0, 0, 1, H3, D3, parede).caixa(W3 - 1, 0, 0, 1, H3, D3, parede);
  // as divisórias (x local -5 e +5), cada uma com a passagem no meio
  for (const x of [14, 54]) m.caixa(x, 0, 1, 1, H3, D3 - 2, parede).caixa(x, 0, 12, 1, 9, 5, null);
  // a porta principal, larga, no meio da fachada
  m.caixa(31, 0, D3 - 1, 6, 9, 1, null);
  for (const x of [30, 37]) m.caixa(x, 0, D3 - 1, 1, 10, 1, BRANCO);
  m.caixa(30, 9, D3 - 1, 8, 1, 1, BRANCO);
  // janelas: a capelinha, a enfermaria e o quarto na frente; no fundo, as altas da enfermaria; uma em cada lado
  for (const x of [5, 19, 44, 58]) janela(m, x, 4, D3 - 1, 'x');
  for (const x of [20, 43]) janela(m, x, 6, 0, 'x', 3);
  janela(m, 11, 4, 0, 'z');
  janela(m, 11, 4, W3 - 1, 'z');
  // o rodapé branco por fora
  for (let x = 0; x < W3; x++) if (x < 31 || x > 36) m.ponto(x, 0, D3, BRANCO);
  return m.malha(0.25, [W3 / 2, 0, D3 / 2]);
}

/** O chão de ladrilho (um voxel, posto logo abaixo do nível da rua): a enfermaria em xadrez, as alas em tábua. */
export function hospitalPiso() {
  const m = new Modelo();
  m.caixa(1, 0, 1, W3 - 2, 1, D3 - 2, (x, _y, z) => {
    if (x < 14 || x > 54) return variar(0x9a7450, x, 0, z, 0.06); // tábuas nas alas
    return ((x >> 1) + (z >> 1)) % 2 ? 0xe8e2d4 : 0xbcc8c0;
  });
  return m.malha(0.25, [W3 / 2, 0, D3 / 2]);
}

/**
 * O andar de cima (some com o peregrino dentro, como os telhados): o forro, as paredes com janelas, a laje e a
 * platibanda. A frente, no meio, fica lisa para o letreiro.
 */
export function hospitalAndar() {
  const m = new Modelo();
  const A = 10;
  const parede = v(CAL, 0.012);
  m.caixa(0, H3, 0, W3, 1, D3, v(0xe2ded4, 0.01)); // o forro
  m.caixa(0, H3 + 1, 0, W3, A, 1, parede).caixa(0, H3 + 1, D3 - 1, W3, A, 1, parede);
  m.caixa(0, H3 + 1, 0, 1, A, D3, parede).caixa(W3 - 1, H3 + 1, 0, 1, A, D3, parede);
  m.caixa(0, H3 + A + 1, 0, W3, 1, D3, v(0xd8d4cc, 0.02)); // a laje
  // a platibanda e a cornija
  for (let x = 0; x < W3; x++) for (const z of [0, D3 - 1]) m.ponto(x, H3 + A + 2, z, BRANCO);
  for (let z = 0; z < D3; z++) for (const x of [0, W3 - 1]) m.ponto(x, H3 + A + 2, z, BRANCO);
  for (let x = -1; x <= W3; x++) m.ponto(x, H3 + 1, D3, BRANCO).ponto(x, H3 + A + 1, D3, BRANCO);
  // as janelas: as alas na frente; o fundo todo; os lados
  for (const x of [4, 59]) janela(m, x, H3 + 4, D3 - 1, 'x');
  for (const x of [6, 18, 31, 43, 56]) janela(m, x, H3 + 4, 0, 'x');
  for (const z of [5, 18]) {
    janela(m, z, H3 + 4, 0, 'z');
    janela(m, z, H3 + 4, W3 - 1, 'z');
  }
  return m.malha(0.25, [W3 / 2, 0, D3 / 2]);
}

/** Letras de 5 linhas (1 = voxel). O til do "Ã" fica por cima, em duas linhas. */
const LETRAS: Record<string, string[]> = {
  H: ['1001', '1001', '1111', '1001', '1001'],
  O: ['0110', '1001', '1001', '1001', '0110'],
  S: ['0111', '1000', '0110', '0001', '1110'],
  P: ['1110', '1001', '1110', '1000', '1000'],
  I: ['111', '010', '010', '010', '111'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  A: ['0110', '1001', '1111', '1001', '1001'],
  L: ['1000', '1000', '1000', '1000', '1111'],
  R: ['1110', '1001', '1110', '1010', '1001'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  D: ['1110', '1001', '1001', '1001', '1110'],
  U: ['1001', '1001', '1001', '1001', '0110'],
  C: ['0111', '1000', '1000', '1000', '0111'],
  E: ['1111', '1000', '1110', '1000', '1111'],
};

/**
 * O letreiro "HOSPITAL IRMÃ DULCE" em letras verdes (voxel de 0,1 m), em relevo, centrado em x, com a base em y 0.
 * A frente fica em +z.
 */
export function letreiro(texto = 'HOSPITAL IRMÃ DULCE') {
  const m = new Modelo();
  const largura = (c: string) => (c === ' ' ? 2 : (LETRAS[c === 'Ã' ? 'A' : c]?.[0].length ?? 3));
  const total = [...texto].reduce((t, c) => t + largura(c) + 1, -1);
  let x = -Math.floor(total / 2);
  for (const c of texto) {
    const g = LETRAS[c === 'Ã' ? 'A' : c];
    if (g)
      g.forEach((linha, j) =>
        [...linha].forEach((b, i) => {
          if (b === '1') m.ponto(x + i, 4 - j, 0, VERDE_LETRA).ponto(x + i, 4 - j, -1, 0x14603a);
        }),
      );
    if (c === 'Ã') ['0101', '1010'].forEach((linha, j) => [...linha].forEach((b, i) => b === '1' && m.ponto(x + i, 7 - j, 0, VERDE_LETRA)));
    x += largura(c) + 1;
  }
  return m.malha(0.1, [0, 0, 0]);
}

/** A palmeirinha de vaso (voxel de 0,125 m): o tronco anelado e as folhas em arco, a partir de y `base`. */
function palmeirinha(m: Modelo, cx: number, cz: number, base: number) {
  for (let y = 0; y < 9; y++) m.caixa(cx, base + y, cz, 1, 1, 1, y % 3 === 0 ? 0x7a5a36 : 0x9a7a4a);
  const topo = base + 9;
  const folha = v(0x3a8a3a, 0.08);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    for (let s = 1; s <= 6; s++) {
      const x = Math.round(cx + Math.cos(a) * s), z = Math.round(cz + Math.sin(a) * s);
      const y = topo + Math.round(1.2 * s - 0.2 * s * s);
      m.ponto(x, y, z, folha(x, y, z));
    }
  }
  m.ponto(cx, topo, cz, 0x3a7a32);
}

/**
 * A entrada, por fora (voxel de 0,125 m; a origem fica na face da fachada, no meio da porta, e +z sai para a
 * rua): a marquise branca em arco, o caixilho branco da entrada curva, as duas colunas e os dois vasos com
 * palmeirinhas. O vidro é outro modelo (`entradaVidro`).
 */
export function entradaFachada() {
  const m = new Modelo();
  const R = 16, RM = 22;
  for (let x = -RM; x < RM; x++)
    for (let z = 0; z < RM; z++) {
      const r = Math.hypot(x + 0.5, z + 0.5);
      if (r >= RM) continue;
      // a marquise: a laje e a borda mais alta
      m.ponto(x, 21, z, BRANCO);
      if (r >= RM - 1.5) m.ponto(x, 22, z, BRANCO).ponto(x, 23, z, 0xe8e8e2);
      // o caixilho da entrada curva: a base, a viga e os montantes; e o chão de granito claro
      if (r < R + 0.2) m.ponto(x, -1, z, variar(0xd8d8d0, x, 0, z, 0.03));
      if (r < R - 1 || r >= R + 0.2) continue;
      const a = Math.atan2(x + 0.5, z + 0.5);
      if (Math.abs(a) < 0.42) continue; // a porta
      m.ponto(x, 0, z, BRANCO).ponto(x, 20, z, BRANCO);
      const k = Math.round(a / 0.26);
      if (Math.abs(a - k * 0.26) < 0.05 || Math.abs(a) < 0.48) m.caixa(x, 1, z, 1, 19, 1, BRANCO);
    }
  // as duas colunas, sob a borda da marquise
  for (const s of [-1, 1]) m.caixa(Math.round(s * 13.6) - 1, 0, 12, 2, 21, 2, BRANCO);
  // os vasos brancos com as palmeirinhas, dos dois lados da entrada
  for (const s of [-1, 1]) {
    const cx = s * 27;
    m.caixa(cx - 3, 0, 3, 6, 5, 6, v(BRANCO, 0.015));
    m.caixa(cx - 4, 5, 2, 8, 1, 8, BRANCO).caixa(cx - 3, 5, 3, 6, 1, 6, 0x4a3422);
    palmeirinha(m, cx, 6, 6);
  }
  return m.malha(0.125, [0, 0, 0]);
}

/** O vidro da entrada curva (o mesmo arco do caixilho, sem os montantes). */
export function entradaVidro() {
  const m = new Modelo();
  const R = 16;
  for (let x = -R - 1; x <= R; x++)
    for (let z = 0; z <= R; z++) {
      const r = Math.hypot(x + 0.5, z + 0.5);
      if (r < R - 1 || r >= R + 0.2) continue;
      const a = Math.atan2(x + 0.5, z + 0.5);
      const k = Math.round(a / 0.26);
      if (Math.abs(a) < 0.48 || Math.abs(a - k * 0.26) < 0.05) continue;
      m.caixa(x, 1, z, 1, 19, 1, VIDRO);
    }
  return m.malha(0.125, [0, 0, 0]);
}

/** O pátio a leste: a mureta baixa com a abertura na frente, a mangueira e o banco (voxel de 0,25 m, origem no canto). */
export function patio() {
  const m = new Modelo();
  const mureta = v(CAL, 0.02);
  // de x 0 a 18 (4,5 m) e de z 0 a 28 (7 m); a abertura fica na frente (+z)
  m.caixa(17, 0, 0, 1, 2, D3, mureta).caixa(0, 0, 0, 18, 2, 1, mureta);
  m.caixa(0, 0, D3 - 1, 6, 2, 1, mureta).caixa(12, 0, D3 - 1, 6, 2, 1, mureta);
  for (let x = 0; x < 18; x++) for (const z of [0, D3 - 1]) if (z === 0 || x < 6 || x >= 12) m.ponto(x, 2, z, BRANCO);
  for (let z = 0; z < D3; z++) m.ponto(17, 2, z, BRANCO);
  // o chão de terra batida com grama nas bordas
  const rnd = aleatorio(91);
  m.caixa(0, -1, 1, 17, 1, D3 - 2, (x, _y, z) => variar(rnd() < 0.3 || x > 14 || z < 3 ? 0x6a8a3a : 0x9a7a52, x, 0, z, 0.08));
  // o banco de madeira, de frente para a mangueira
  m.caixa(5, 0, 3, 1, 2, 1, MADEIRA).caixa(11, 0, 3, 1, 2, 1, MADEIRA).caixa(4, 2, 2, 9, 1, 2, v(0x8a6a44, 0.06)).caixa(4, 3, 2, 9, 2, 1, v(0x8a6a44, 0.06));
  return m.malha(0.25, [0, 0, 0]);
}

/** A mangueira do pátio: o tronco torto e a copa larga e escura (voxel de 0,25 m, centrada no tronco). */
export function mangueira() {
  const m = new Modelo();
  const rnd = aleatorio(57);
  for (let y = 0; y < 10; y++) m.caixa(y > 6 ? 1 : 0, y, 0, 2, 1, 2, v(0x5a4030, 0.08));
  for (const [dx, dz] of [[1, 0], [-1, 1], [0, -1]]) for (let s = 1; s < 4; s++) m.ponto(dx * s, 8 + s, dz * s, 0x5a4030);
  const R = 7;
  for (let x = -R; x <= R; x++)
    for (let y = -4; y <= 5; y++)
      for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x / R, (y - 0.5) / 4.6, z / R);
        if (d > 1 || (d > 0.82 && rnd() < 0.5)) continue;
        if (d < 0.6 && rnd() < 0.7) continue; // oca por dentro
        const r = rnd();
        m.ponto(x, 12 + y, z, r < 0.06 ? 0xd8a030 : variar(r < 0.5 ? 0x2a5a2a : 0x3a6a30, x, y, z, 0.08)); // e umas mangas
      }
  return m.malha(0.25, [1, 0, 1]);
}

/** O crucifixo de parede (voxel de 0,125 m), com a frente em +z. */
export function crucifixo() {
  const m = new Modelo();
  m.caixa(0, 0, 0, 1, 8, 1, 0x3e2616).caixa(-2, 5, 0, 5, 1, 1, 0x3e2616);
  m.caixa(0, 2, 1, 1, 4, 1, 0xd8b898).ponto(-1, 5, 1, 0xd8b898).ponto(1, 5, 1, 0xd8b898).ponto(0, 6, 1, 0xc8a888);
  return m.malha(0.125, [0.5, 0, 0]);
}

/**
 * O altarzinho da capelinha (voxel de 0,125 m): a mesa com a toalha branca de barra dourada, o sacrário dourado no
 * meio, dois castiçais e as flores. A frente fica em +x (o altar encosta na parede oeste).
 */
export function altarzinho() {
  const m = new Modelo();
  m.caixa(0, 0, -5, 4, 7, 10, v(0xe8e2d6, 0.02));
  m.caixa(4, 1, -5, 1, 6, 10, (_x, y) => (y === 6 ? OURO : BRANCO)); // a toalha caindo na frente
  m.caixa(0, 7, -5, 5, 1, 10, BRANCO);
  m.caixa(1, 8, -1, 2, 3, 2, OURO).ponto(1, 11, 0, OURO).ponto(2, 11, -1, OURO).ponto(3, 9, 0, 0x8a6a20); // o sacrário
  for (const z of [-4, 3]) m.ponto(1, 8, z, OURO).caixa(1, 9, z, 1, 2, 1, 0xf4f0e0).ponto(1, 11, z, 0xffc040);
  for (const z of [-2, 2]) m.ponto(2, 8, z, 0xf0f0ec).ponto(2, 9, z, 0x2a7a3a).ponto(2, 10, z, z < 0 ? 0xd84a5a : 0xf0d040);
  return m.malha(0.125, [0, 0, 0]);
}

/** Um banco da capelinha (voxel de 0,125 m), ao longo de z, com o encosto do lado +x (quem senta olha para -x). */
export function bancoCapelinha(comprimento = 11) {
  const m = new Modelo();
  const madeira = v(0x5a3a22, 0.05);
  for (const z of [0, comprimento - 1]) m.caixa(0, 0, z, 3, 3, 1, madeira).caixa(2, 3, z, 1, 4, 1, madeira);
  m.caixa(0, 3, 0, 3, 1, comprimento, madeira).caixa(2, 4, 0, 1, 3, comprimento, madeira);
  m.caixa(-2, 0, 0, 1, 1, comprimento, madeira); // o genuflexório
  return m.malha(0.125, [1.5, 0, comprimento / 2]);
}

/**
 * A cadeira de madeira com o assento de palhinha (voxel de 0,125 m), virada para +z. Por cerca de trinta anos,
 * Irmã Dulce dormiu sentada numa cadeira.
 */
export function cadeira() {
  const m = new Modelo();
  const madeira = v(0x5a3a24, 0.05);
  for (const x of [-2, 2]) for (const z of [-2, 2]) m.caixa(x, 0, z, 1, 4, 1, madeira);
  m.caixa(-2, 4, -2, 5, 1, 5, (x, _y, z) => ((x + z) % 2 ? 0xc8a860 : 0xb89850));
  m.caixa(-2, 5, -2, 5, 7, 1, madeira).caixa(-1, 7, -2, 3, 3, 1, (x, y) => ((x + y) % 2 ? 0xc8a860 : 0xb89850));
  for (const x of [-2, 2]) m.caixa(x, 7, -1, 1, 1, 4, madeira).caixa(x, 5, 2, 1, 2, 1, madeira); // os braços
  return m.malha(0.125, [0.5, 0, 0.5]);
}

/** A mesinha do quarto (voxel de 0,125 m): a lamparina acesa, o breviário e o terço. */
export function mesinhaDoQuarto() {
  const m = new Modelo();
  const madeira = v(MADEIRA, 0.06);
  for (const x of [-2, 2]) for (const z of [-2, 1]) m.caixa(x, 0, z, 1, 6, 1, madeira);
  m.caixa(-2, 6, -2, 5, 1, 4, madeira);
  m.caixa(-1, 7, -1, 1, 1, 1, 0x2a2a30).caixa(-1, 8, -1, 1, 2, 1, 0xd8c8a0).ponto(-1, 10, -1, 0xffc040); // a lamparina
  m.caixa(1, 7, -1, 2, 1, 2, 0x3a1a14).ponto(1, 8, -1, 0xd8c8a0); // o breviário
  m.ponto(0, 7, 1, 0x2a2018).ponto(1, 7, 1, 0x2a2018).ponto(2, 7, 1, 0x2a2018).ponto(2, 7, 0, 0x2a2018); // o terço
  return m.malha(0.125, [0, 0, 0]);
}
