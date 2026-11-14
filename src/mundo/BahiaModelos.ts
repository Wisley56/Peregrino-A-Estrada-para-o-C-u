import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';
import { materialVoxel } from '../voxel/Malha';

/**
 * Arte por código das Ruas da Bahia (Salvador, anos 1940 e 1950), a partir das referências do autor:
 * - os casarios coloniais do Pelourinho: sobrados colados, coloridos, com cunhais e cornijas brancas, portas
 *   altas com bandeira, sacadas de ferro e telhado de barro;
 * - as palafitas dos Alagados: barracos de tábua sobre estacas, na maré;
 * - as igrejas: o Bonfim (branco e cantaria, torres de cúpula de azulejo), São Francisco (cantaria cor de
 *   areia, torres de pirâmide) e o Rosário dos Pretos (azul);
 * - o Elevador Lacerda (art déco), o Mercado Modelo, o chafariz do Terreiro de Jesus e o cruzeiro de
 *   São Francisco.
 * Todos os modelos são montados com a frente para +z e giram com `Frente`.
 */

const v = (hex: number, k = 0.04) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

export type Frente = 'n' | 's' | 'e' | 'o';
export const ROT: Record<Frente, number> = { s: 0, n: Math.PI, e: Math.PI / 2, o: -Math.PI / 2 };

/** As cores dos casarios, tiradas das fotos do Pelourinho. */
export const CORES_CASARIO = [
  0x5cb8a6, // verde-água
  0xf0c64a, // amarelo
  0xe898ae, // rosa
  0x8cc0e2, // azul-claro
  0xe8893a, // laranja
  0xf0ebde, // branco
  0x6aa868, // verde
  0xd8645c, // coral
  0xa894d4, // lilás
  0xf2d8a0, // creme
];
const CORES_PORTA = [0x2e6a4a, 0x2a4a7a, 0x6a3a22, 0x3a7a6a, 0x7a2a2a];
const BRANCO = 0xf4f0e6;
const FERRO = 0x24242a;
const VIDRO = 0x5a7a8a;
const ESCURO = 0x1c1816;
const TELHA = [0xb0583a, 0x9e4c32, 0xc0663e, 0xa8603e];

/**
 * Sobrado colonial baiano (voxel de 0,25 m). `andares` 1 a 3. `fundacao`: quanto o embasamento desce abaixo do
 * chão (em voxels), para não abrir vão nas ladeiras.
 */
export function casario(
  semente: number, largura: number, profundidade: number, frente: Frente,
  o: { andares?: number; cor?: number; fundacao?: number; simples?: boolean; esquina?: 'esq' | 'dir' } = {},
) {
  const rnd = aleatorio(semente);
  const deLado = frente === 'e' || frente === 'o';
  const W = Math.round((deLado ? profundidade : largura) * 4);
  const D = Math.round((deLado ? largura : profundidade) * 4);
  const andares = o.andares ?? (rnd() < 0.3 ? 3 : 2);
  const AND = 14;
  const H = andares * AND + 2;
  const F = o.fundacao ?? 8;
  const base = o.cor ?? CORES_CASARIO[Math.floor(rnd() * CORES_CASARIO.length)];
  // reboco caiado é liso: cores chapadas deixam o greedy meshing juntar as faces (bem menos triângulos)
  const parede = base;
  const branco = BRANCO;
  const soco = 0x8a8478;
  const corPorta = CORES_PORTA[Math.floor(rnd() * CORES_PORTA.length)];
  const porta = corPorta;
  const portaEscura = new THREE.Color(corPorta).multiplyScalar(0.78).getHex();
  const m = new Modelo();

  // casca: frente, fundos e lados
  m.caixa(0, -F, 0, W, H + F, 1, parede).caixa(0, -F, D - 1, W, H + F, 1, parede);
  m.caixa(0, -F, 0, 1, H + F, D, parede).caixa(W - 1, -F, 0, 1, H + F, D, parede);
  // embasamento (soco) e cunhais brancos
  m.caixa(0, -F, D - 1, W, F + 2, 1, soco);
  m.caixa(0, 2, D, 1, H - 2, 1, branco).caixa(W - 1, 2, D, 1, H - 2, 1, branco);
  // cornijas entre os andares e no alto
  for (let a = 1; a < andares; a++) m.caixa(0, a * AND, D, W, 1, 1, branco);
  m.caixa(-1, H - 2, D, W + 2, 1, 2, branco);

  // vãos: portas no térreo, portas-janelas com sacada em cima
  const n = Math.max(1, Math.floor((W - 2) / 7));
  const passo = (W - 2) / n;
  const corrida = !o.simples && rnd() < 0.3; // sacada corrida no primeiro andar
  for (let i = 0; i < n; i++) {
    const cx = Math.round(1 + passo * (i + 0.5));
    // térreo: porta alta com bandeira em arco, ou janela com grade
    const ehPorta = i === Math.floor(n / 2) || rnd() < 0.55;
    if (ehPorta) {
      const w = passo >= 6 ? 4 : 3, x0 = cx - Math.floor(w / 2);
      m.caixa(x0, 2, D - 1, w, 9, 1, porta);
      if (w === 4) m.caixa(x0 + 1, 2, D - 1, 2, 9, 1, portaEscura);
      m.caixa(x0, 11, D - 1, w, 2, 1, VIDRO).caixa(x0 + Math.floor(w / 2), 11, D - 1, 1, 2, 1, BRANCO);
      m.caixa(x0 - 1, 2, D, 1, 12, 1, branco).caixa(x0 + w, 2, D, 1, 12, 1, branco).caixa(x0, 13, D, w, 1, 1, branco);
      m.ponto(x0, 12, D, BRANCO).ponto(x0 + w - 1, 12, D, BRANCO); // os cantos do arco
    } else {
      const x0 = cx - 1;
      m.caixa(x0, 5, D - 1, 3, 6, 1, ESCURO);
      for (let x = x0; x < x0 + 3; x++) if ((x - x0) % 2 === 0) m.caixa(x, 5, D, 1, 6, 1, FERRO);
      m.caixa(x0 - 1, 4, D, 5, 1, 1, branco).caixa(x0 - 1, 11, D, 5, 1, 1, branco);
    }
    for (let a = 1; a < andares; a++) {
      const y0 = a * AND + 2;
      const x0 = cx - 1;
      // porta-janela de duas folhas meio abertas, com bandeira
      m.caixa(x0, y0, D - 1, 3, 8, 1, ESCURO);
      m.caixa(x0, y0, D, 1, 8, 1, porta).caixa(x0 + 2, y0, D, 1, 8, 1, porta);
      m.caixa(x0, y0 + 8, D - 1, 3, 2, 1, VIDRO).ponto(x0 + 1, y0 + 8, D - 1, BRANCO);
      m.caixa(x0 - 1, y0, D, 1, 11, 1, branco).caixa(x0 + 3, y0, D, 1, 11, 1, branco).caixa(x0, y0 + 10, D, 3, 1, 1, branco);
      if (o.simples || (corrida && a === 1)) continue;
      // sacada de ferro: laje de pedra e gradil com balaústres
      m.caixa(x0 - 1, y0 - 1, D, 5, 1, 2, branco);
      m.caixa(x0 - 1, y0 + 3, D + 1, 5, 1, 1, FERRO);
      for (let x = x0 - 1; x < x0 + 4; x += 2) m.caixa(x, y0, D + 1, 1, 3, 1, FERRO);
      m.caixa(x0 - 1, y0, D, 1, 4, 1, FERRO).caixa(x0 + 3, y0, D, 1, 4, 1, FERRO);
    }
  }
  if (corrida) {
    const y0 = AND + 2;
    m.caixa(1, y0 - 1, D, W - 2, 1, 2, branco);
    m.caixa(1, y0 + 3, D + 1, W - 2, 1, 1, FERRO);
    for (let x = 1; x < W - 1; x += 2) m.caixa(x, y0, D + 1, 1, 3, 1, FERRO);
  }

  // casa de esquina: a parede do lado também tem janelas, cunhal e embasamento
  if (o.esquina) {
    const x = o.esquina === 'esq' ? 0 : W - 1, dx = o.esquina === 'esq' ? -1 : 1;
    m.caixa(x, -F, 0, 1, F + 2, D, soco).caixa(x + dx, 2, 0, 1, H - 2, 1, branco);
    m.caixa(x + dx, H - 2, -1, 1, 1, D + 2, branco);
    for (let a = 1; a < andares; a++) m.caixa(x + dx, a * AND, 0, 1, 1, D, branco);
    for (let z = 3; z + 3 < D - 2; z += 7)
      for (let a = 0; a < andares; a++) {
        const y0 = a === 0 ? 5 : a * AND + 3;
        const alt = a === 0 ? 6 : 7;
        m.caixa(x, y0, z, 1, alt, 3, ESCURO);
        if (a === 0) for (let zz = z; zz < z + 3; zz += 2) m.caixa(x + dx, y0, zz, 1, alt, 1, FERRO);
        else m.caixa(x + dx, y0, z, 1, alt, 1, porta).caixa(x + dx, y0, z + 2, 1, alt, 1, porta);
        m.caixa(x + dx, y0 - 1, z - 1, 1, 1, 5, branco).caixa(x + dx, y0 + alt, z - 1, 1, 1, 5, branco);
      }
  }

  // cobertura: platibanda (parapeito branco e terraço) ou telhado de duas águas com beiral
  if (rnd() < 0.35) {
    m.caixa(0, H - 1, D - 1, W, 3, 1, parede).caixa(0, H + 1, D, W, 1, 1, branco);
    m.caixa(1, H - 2, 1, W - 2, 1, D - 2, 0x9a948a);
    const telha = (_x: number, _y: number, z: number) => TELHA[z & 3];
    for (let k = 1; k < Math.floor(D / 2) - 1; k++) {
      const y = H - 2 + Math.floor(k / 3);
      m.caixa(1, y, k, W - 2, 1, 1, telha).caixa(1, y, D - 2 - k, W - 2, 1, 1, telha);
    }
  } else {
    const telha = (_x: number, _y: number, z: number) => TELHA[z & 3];
    const fileiras = Math.ceil(D / 2);
    for (let k = 0; k <= fileiras; k++) {
      const z0 = k - 1, z1 = D - k + 1;
      if (z1 < z0) break;
      const y = H - 1 + Math.floor(k / 2);
      m.caixa(-1, y, z0, W + 2, 1, 1, telha).caixa(-1, y, z1, W + 2, 1, 1, telha);
      if (k > 1) m.caixa(0, y - 1, z0, 1, 1, z1 - z0 + 1, parede).caixa(W - 1, y - 1, z0, 1, 1, z1 - z0 + 1, parede);
    }
    m.caixa(-1, H - 1 + Math.floor(fileiras / 2), Math.floor(D / 2) - 1, W + 2, 1, 2, 0x7a3a22);
  }
  const malha = m.malha(0.25, [W / 2, 0, D / 2]);
  malha.rotation.y = ROT[frente];
  return malha;
}

/** Cores das tábuas pintadas das palafitas (da referência do autor), e a madeira crua. */
export const CORES_PALAFITA = [0xa8322e, 0xd08a2a, 0x3a5a3e, 0x3a5a8a, 0x8a7a66, 0x7a6a58];

/**
 * Palafita dos Alagados: um barraco de um cômodo, de tábuas desencontradas, sobre estacas na maré, com
 * telhado de zinco ou de telha remendada e uma varandinha. A origem é o piso, no centro do cômodo; a
 * varanda fica na frente (+z). `estacas`: quanto as estacas descem (em voxels de 0,25 m).
 */
export function palafita(semente: number, estacas: number, cor?: number) {
  const rnd = aleatorio(semente);
  const W = 12 + Math.floor(rnd() * 3) * 2, D = 12 + Math.floor(rnd() * 2) * 2;
  const VAR = 5; // varanda
  const base = cor ?? CORES_PALAFITA[Math.floor(rnd() * CORES_PALAFITA.length)];
  const tabua = (i: number) => {
    const h = Math.sin(i * 91.7 + semente) * 43758.5;
    const r = h - Math.floor(h);
    return r < 0.08 ? 0x2a2018 : variar(base, i, semente, 0, 0.12 * r);
  };
  const madeira = v(0x3a2e24, 0.06);
  const piso = (x: number, y: number, z: number) => ((z + x * 3) % 7 === 0 ? 0x4a3a2a : variar(0x7a6650, x, y, z, 0.07));
  const m = new Modelo();
  // estacas: nos cantos, no meio e sob a varanda, um pouco tortas
  for (const sx of [0, W >> 1, W - 1])
    for (const sz of [0, D - 1, D + VAR - 1]) {
      const torto = rnd() < 0.3 ? 1 : 0;
      m.caixa(sx, -estacas, sz, 1, estacas - 4, 1, madeira).caixa(sx + torto, -4, sz, 1, 3, 1, madeira);
    }
  // assoalho do cômodo e da varanda
  m.caixa(0, -1, 0, W, 1, D + VAR, piso);
  // paredes de tábua (verticais na frente e nos fundos, por coluna; nos lados, por fileira)
  const ALT = 10;
  for (let x = 0; x < W; x++) {
    m.caixa(x, 0, D - 1, 1, ALT, 1, tabua(x));
    m.caixa(x, 0, 0, 1, ALT, 1, tabua(x + 40));
  }
  for (let z = 0; z < D; z++) {
    m.caixa(0, 0, z, 1, ALT, 1, tabua(z + 80));
    m.caixa(W - 1, 0, z, 1, ALT, 1, tabua(z + 120));
  }
  // porta aberta e janela de caixilho
  const px = 2 + Math.floor(rnd() * 2);
  m.caixa(px, 0, D - 1, 3, 8, 1, ESCURO);
  const jx = W - 6;
  m.caixa(jx, 3, D - 1, 4, 4, 1, 0x3a4a52);
  m.caixa(jx, 5, D - 1, 4, 1, 1, 0xe0d8c8).caixa(jx + 2, 3, D - 1, 1, 4, 1, 0xe0d8c8);
  m.caixa(jx - 1, 2, D, 6, 1, 1, 0xe0d8c8).caixa(jx - 1, 7, D, 6, 1, 1, 0xe0d8c8);
  // guarda-corpo da varanda
  for (let x = 0; x < W; x += 3) m.caixa(x, 0, D + VAR - 1, 1, 4, 1, madeira);
  m.caixa(0, 3, D + VAR - 1, W, 1, 1, madeira);
  // telhado de uma água baixa, de zinco ondulado ou de telha, com algumas peças remendadas
  const zinco = rnd() < 0.6;
  const cob = (x: number, y: number, z: number) => {
    if (((x * 13 + z * 7) % 17) === 0) return zinco ? 0x8a5a3a : 0x7a7a7a; // remendo
    return zinco ? (x & 1 ? 0x9aa0a4 : 0x7c8286) : variar(TELHA[(x + z) % 4], x, y, z, 0.05);
  };
  // a água cai para a frente: o fundo é o mais alto. Cada fileira tem duas camadas, para os degraus se encostarem,
  // e as paredes sobem até o telhado (as empenas dos lados e o fundo), sem fresta entre a parede e a cobertura.
  const topo = (z: number) => ALT + Math.floor((D + 1 - Math.max(0, Math.min(D + 1, z))) / 4);
  for (let z = -1; z <= D + 1; z++) m.caixa(-1, topo(z) - 1, z, W + 2, 2, 1, cob);
  for (let z = 0; z < D; z++) {
    const h = topo(z) - 1 - ALT;
    if (h <= 0) continue;
    m.caixa(0, ALT, z, 1, h, 1, tabua(z + 80)).caixa(W - 1, ALT, z, 1, h, 1, tabua(z + 120));
  }
  for (let x = 0; x < W; x++) m.caixa(x, ALT, 0, 1, topo(0) - 1 - ALT, 1, tabua(x + 40));
  // o cobertinho da varanda, de lona
  m.caixa(0, ALT - 1, D + 1, W, 1, VAR - 1, (x) => ((x >> 1) & 1 ? 0x5a7a8a : 0x6a8a9a));
  const malha = m.malha(0.25, [W / 2, 0, D / 2]);
  return { malha, largura: W / 4, profundidade: (D + VAR) / 4, frenteZ: (D / 2 + VAR) / 4, fundoZ: -D / 8 };
}

/** Pinguela: passarela de tábuas sobre estacas, de `comprimento` metros, ao longo de +z. */
export function pinguela(semente: number, comprimento: number, estacas: number) {
  const L = Math.round(comprimento * 4);
  const m = new Modelo();
  const madeira = v(0x3a2e24, 0.06);
  for (let z = 0; z < L; z++) {
    const falha = Math.sin(z * 7.3 + semente) > 0.93;
    m.caixa(0, -1, z, 4, 1, 1, falha ? 0x2a2018 : variar(z % 3 ? 0x8a7458 : 0x7a6448, z, semente, 0, 0.08));
  }
  for (let z = 0; z < L; z += 6) m.caixa(0, -estacas, z, 1, estacas - 1, 1, madeira).caixa(3, -estacas, z, 1, estacas - 1, 1, madeira);
  return m.malha(0.25, [2, 0, 0]);
}

/** Canoa de pescador. */
export function canoa(semente: number) {
  const rnd = aleatorio(semente);
  const casco = [0x2a5a8a, 0xb83a32, 0x3a7a4a, 0xe0d8c0][Math.floor(rnd() * 4)];
  const m = new Modelo();
  for (let z = 0; z < 14; z++) {
    const w = z < 2 || z > 11 ? 1 : z < 4 || z > 9 ? 2 : 3;
    const x0 = -Math.floor(w / 2) - 1;
    m.caixa(x0, 0, z, w + 2, 1, 1, v(0x4a3a2a)).caixa(x0, 1, z, 1, 1, 1, casco).caixa(x0 + w + 1, 1, z, 1, 1, 1, casco);
  }
  m.caixa(-1, 1, 6, 3, 1, 1, 0x6a5440);
  return m.malha(0.25, [0, 0, 7]);
}

/** Saveiro de vela: o barco de carga da Baía de Todos os Santos, de casco pintado e vela trapezoidal. */
export function saveiro() {
  const m = new Modelo();
  const casco = (x: number, y: number, z: number) => (y < 2 ? variar(0x2a4a8a, x, y, z, 0.04) : y === 2 ? 0xe8e0d0 : variar(0xb83a32, x, y, z, 0.04));
  for (let z = 0; z < 36; z++) {
    const t = z / 35;
    const w = Math.max(1, Math.round(5 * Math.sin(Math.PI * Math.min(1, t * 1.15))));
    m.caixa(-w, 0, z, 2 * w + 1, 1, 1, v(0x5a4632));
    for (let y = 1; y < 4; y++) m.ponto(-w, y, z, casco(-w, y, z)).ponto(w, y, z, casco(w, y, z));
  }
  m.caixa(-4, 3, 6, 9, 1, 22, v(0x8a7458, 0.06)); // convés
  m.caixa(0, 4, 20, 1, 34, 1, v(0x6a5440)); // mastro
  // vela trapezoidal, creme gasta: larga embaixo, estreita no alto
  for (let y = 8; y < 36; y++) {
    const comp = Math.round(16 - (y - 8) * 0.36);
    for (let z = 20 - comp; z < 20; z++) m.ponto(0, y, z, variar(0xe8dcc0, 0, y, z, 0.05));
  }
  m.caixa(-3, 4, 4, 7, 3, 4, v(0x7a5a3a)); // a cabine
  return m.malha(0.25, [0, 0, 18]);
}

/** Coqueiro: tronco anelado e um pouco inclinado, palmas caídas e cocos. */
export function coqueiro(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const alt = 22 + Math.floor(rnd() * 10);
  const incl = (rnd() - 0.5) * 0.25, inclZ = (rnd() - 0.5) * 0.25;
  let x = 0, z = 0;
  for (let y = 0; y < alt; y++) {
    const nx = Math.round(incl * y * y * 0.05), nz = Math.round(inclZ * y * y * 0.05);
    const cor = y % 3 ? 0x8a7a62 : 0x6a5a48;
    // o tronco é contínuo: quando ele se desloca, a fiada cobre a posição velha e a nova
    m.caixa(Math.min(x, nx), y, Math.min(z, nz), 2 + Math.abs(nx - x), 1, 2 + Math.abs(nz - z), cor);
    x = nx;
    z = nz;
  }
  const fol = (k: number) => (k % 2 ? 0x4a8a3a : 0x5a9a42);
  for (let f = 0; f < 9; f++) {
    const a = (f / 9) * Math.PI * 2 + rnd() * 0.3;
    for (let t = 1; t < 13; t++) {
      const px = x + Math.round(Math.cos(a) * t), pz = z + Math.round(Math.sin(a) * t);
      const py = alt + 2 - Math.round((t * t) / 18);
      m.ponto(px, py, pz, fol(t)).ponto(px + 1, py, pz, fol(t + 1));
    }
  }
  m.caixa(x - 1, alt - 1, z - 1, 4, 3, 4, v(0x6a8a3a));
  m.ponto(x - 1, alt - 2, z, 0x6a4a22).ponto(x + 2, alt - 2, z + 1, 0x7a5a2a).ponto(x, alt - 2, z + 2, 0x6a4a22);
  return m.malha(0.25, [1, 0, 1]);
}

/** Palmeira-imperial: o tronco liso e cinza das praças de Salvador, com o capitel verde e palmas no alto. */
export function palmeiraImperial(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const alt = 40 + Math.floor(rnd() * 8);
  for (let y = 0; y < alt; y++) {
    const w = y < 3 ? 3 : 2;
    m.caixa(-Math.floor(w / 2), y, -Math.floor(w / 2), w, 1, w, v(0xb8b4a8, 0.03));
  }
  m.caixa(-1, alt, -1, 2, 6, 2, v(0x6a9a4a, 0.04));
  for (let f = 0; f < 10; f++) {
    const a = (f / 10) * Math.PI * 2;
    for (let t = 1; t < 12; t++)
      m.ponto(Math.round(Math.cos(a) * t), alt + 6 + Math.round(t * 0.4 - (t * t) / 16), Math.round(Math.sin(a) * t), t % 2 ? 0x3a7a32 : 0x4a8a3a);
  }
  return m.malha(0.25, [0, 0, 0]);
}

/** Poste de ferro com lampião, como os do Terreiro de Jesus. */
export function poste() {
  const m = new Modelo();
  m.caixa(-1, 0, -1, 3, 2, 3, FERRO).caixa(0, 2, 0, 1, 26, 1, FERRO);
  m.caixa(-1, 27, -1, 3, 1, 3, FERRO).caixa(-1, 28, -1, 3, 3, 3, 0xf2e2a0).caixa(-1, 31, -1, 3, 1, 3, FERRO).ponto(0, 32, 0, FERRO);
  return m.malha(0.125, [0, 0, 0]);
}

/**
 * O chafariz do Terreiro de Jesus: bacia redonda de pedra, coluna de ferro com duas taças e a estátua no alto,
 * e o gradil de ferro em volta (voxel de 0,25 m). Raio do gradil: 4,6 m.
 */
export function chafariz() {
  const m = new Modelo();
  const pedra = 0xd8d0c0;
  const bronze = (_x: number, y: number, _z = 0) => (y % 5 ? 0x3a4038 : 0x4a5a48);
  const R = 12;
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z);
      if (d > R) continue;
      if (d > R - 1.5) m.caixa(x, 0, z, 1, 3, 1, pedra);
      else m.ponto(x, 0, z, d < 3 ? 0xa8a090 : 0x4a7a8a); // água da bacia
    }
  m.caixa(-2, 0, -2, 4, 6, 4, pedra);
  m.caixa(-1, 6, -1, 2, 18, 2, bronze);
  const taca = (y: number, r: number) => {
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (Math.hypot(x, z) <= r) m.ponto(x, y, z, bronze(x, y, z));
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) { const d = Math.hypot(x, z); if (d <= r && d > r - 1) m.ponto(x, y + 1, z, bronze(x, y, z)); }
  };
  taca(10, 6);
  taca(18, 4);
  // a estátua no alto: uma figura de bronze
  m.caixa(-1, 24, -1, 2, 2, 2, bronze).caixa(-1, 26, -1, 2, 5, 2, bronze).caixa(-1, 31, -1, 2, 2, 2, bronze);
  m.ponto(1, 28, 0, bronze(1, 28, 0)).ponto(2, 29, 0, bronze(2, 29, 0));
  // gradil em volta, com pontas de lança
  // as barras ficam espaçadas (um vão entre elas), com o corrimão embaixo e em cima
  const RG = 18;
  const feitas = new Set<string>();
  let k = 0;
  for (let a = 0; a < 360; a += 0.5) {
    const x = Math.round(Math.cos((a * Math.PI) / 180) * RG), z = Math.round(Math.sin((a * Math.PI) / 180) * RG);
    const chave = x + ',' + z;
    if (feitas.has(chave)) continue;
    feitas.add(chave);
    m.ponto(x, 4, z, FERRO);
    if (k++ % 3 === 0) m.caixa(x, 0, z, 1, 4, 1, FERRO).ponto(x, 5, z, FERRO);
  }
  return m.malha(0.25, [0, 0, 0]);
}

/** O cruzeiro de São Francisco: a grande cruz de pedra clara sobre um pedestal de degraus, no meio do largo. */
export function cruzeiroDePedra() {
  const m = new Modelo();
  const pedra = (_x: number, y: number) => (y % 4 === 0 ? 0xcac4b4 : 0xdad4c4);
  m.caixa(-10, 0, -10, 20, 2, 20, pedra).caixa(-8, 2, -8, 16, 2, 16, pedra).caixa(-6, 4, -6, 12, 2, 12, pedra);
  m.caixa(-4, 6, -4, 8, 10, 8, pedra).caixa(-5, 15, -5, 10, 2, 10, pedra);
  m.caixa(-2, 17, -2, 4, 34, 4, pedra);
  m.caixa(-11, 40, -2, 22, 4, 4, pedra);
  // pontas floreadas da cruz
  for (const [x, y] of [[-12, 41], [11, 41], [-1, 51]] as const) m.caixa(x, y - 1, -2, 2, 4, 4, pedra);
  m.caixa(-2, 51, -2, 4, 2, 4, pedra);
  return m.malha(0.125, [0, 0, 0]);
}

export interface EstiloIgreja {
  parede: number;
  cantaria: number;
  porta: number;
  telha: number;
  /** `bulbo`: cúpula bulbosa (de azulejo, no Bonfim); `piramide`: agulha de pirâmide (São Francisco). */
  torre: 'bulbo' | 'piramide';
  coberturaTorre: (x: number, y: number, z: number) => number;
  largura: number;
  comprimento: number;
  alturaFachada: number;
  alturaTorre: number;
}

const AZULEJO = (x: number, y: number, z: number) => (((x + y + z) & 1) ? 0x2a5aa8 : 0xeef0f2);

export const IGREJA_BONFIM: EstiloIgreja = {
  parede: 0xf6f4ee, cantaria: 0xd2b880, porta: 0x4a3020, telha: 0xa85a3a, torre: 'bulbo', coberturaTorre: AZULEJO,
  largura: 15, comprimento: 30, alturaFachada: 13, alturaTorre: 22,
};
export const IGREJA_SAO_FRANCISCO: EstiloIgreja = {
  parede: 0xd8b880, cantaria: 0xc8a468, porta: 0x3a2618, telha: 0x9e4c32, torre: 'piramide',
  coberturaTorre: (x, y, z) => variar(0xc8a468, x, y, z, 0.05),
  largura: 16, comprimento: 24, alturaFachada: 14, alturaTorre: 24,
};
export const IGREJA_ROSARIO: EstiloIgreja = {
  parede: 0x4a7ac8, cantaria: 0xf2eee4, porta: 0x3a2a1a, telha: 0xa85a3a, torre: 'bulbo',
  coberturaTorre: (x, y, z) => variar(0xf2eee4, x, y, z, 0.04),
  largura: 12, comprimento: 14, alturaFachada: 11, alturaTorre: 18,
};
export const CATEDRAL: EstiloIgreja = {
  parede: 0xeae2d0, cantaria: 0xcfc2a6, porta: 0x3a2a1a, telha: 0x9e4c32, torre: 'piramide',
  coberturaTorre: (x, y, z) => variar(0x9aa0a4, x, y, z, 0.04),
  largura: 16, comprimento: 18, alturaFachada: 14, alturaTorre: 20,
};

/**
 * Igreja colonial baiana vista de fora (voxel de 0,25 m): duas torres nos cantos da frente, fachada com
 * pilastras e cornijas de cantaria, três portas, três janelas em arco, frontão recortado de volutas com óculo
 * e cruz, nave de telhado de duas águas. A origem é o centro da frente, no chão; a nave vai para -z.
 */
export function igreja(e: EstiloIgreja) {
  const Wv = Math.round(e.largura * 4), Lv = Math.round(e.comprimento * 4);
  const Hf = Math.round(e.alturaFachada * 4), Ht = Math.round(e.alturaTorre * 4);
  const T = 12; // lado da torre
  const parede = e.parede, pedra = e.cantaria;
  const m = new Modelo();
  const fz = Lv - 1; // a frente
  const Hn = Hf - 10; // altura das paredes da nave

  // nave
  m.caixa(0, 0, 0, Wv, Hn, 1, parede).caixa(0, 0, 0, 1, Hn, Lv, parede).caixa(Wv - 1, 0, 0, 1, Hn, Lv, parede);
  m.caixa(0, 0, 0, 1, 2, Lv, pedra).caixa(Wv - 1, 0, 0, 1, 2, Lv, pedra);
  m.caixa(-1, Hn - 1, 0, 1, 1, Lv, pedra).caixa(Wv, Hn - 1, 0, 1, 1, Lv, pedra);
  for (let z = 8; z < Lv - T - 4; z += 12) {
    for (const x of [0, Wv - 1]) {
      m.caixa(x, Hn - 18, z, 1, 10, 4, 0x3a4a5a).caixa(x, Hn - 8, z + 1, 1, 1, 2, 0x3a4a5a);
      for (const dx of [-1, 1]) if ((x === 0 && dx === -1) || (x === Wv - 1 && dx === 1)) m.caixa(x + dx, Hn - 19, z - 1, 1, 12, 1, pedra).caixa(x + dx, Hn - 19, z + 4, 1, 12, 1, pedra).caixa(x + dx, Hn - 19, z - 1, 1, 1, 6, pedra);
    }
    // pilastras das laterais
    m.caixa(-1, 0, z - 3, 1, Hn - 1, 1, pedra).caixa(Wv, 0, z - 3, 1, Hn - 1, 1, pedra);
  }
  // telhado de duas águas (cumeeira ao longo da nave)
  const telhaEscura = new THREE.Color(e.telha).multiplyScalar(0.9).getHex();
  const telha = (x: number) => ((x >> 1) & 1 ? telhaEscura : e.telha);
  for (let k = 0; k <= Wv / 2; k++) {
    const y = Hn + Math.floor(k / 2);
    m.caixa(k - 1, y, -1, 1, 1, Lv - T + 1, telha).caixa(Wv - k, y, -1, 1, 1, Lv - T + 1, telha);
  }

  // fachada central, entre as torres
  m.caixa(T, 0, fz, Wv - 2 * T, Hf, 1, parede);
  m.caixa(T, 0, fz + 1, Wv - 2 * T, 2, 1, pedra);
  for (const x of [T, T + 1, Wv - T - 2, Wv - T - 1]) m.caixa(x, 0, fz + 1, 1, Hf, 1, pedra);
  m.caixa(T - 1, Hf - 2, fz + 1, Wv - 2 * T + 2, 2, 2, pedra);
  m.caixa(T, Math.floor(Hf / 2), fz + 1, Wv - 2 * T, 1, 1, pedra);
  const cx = Math.floor(Wv / 2);
  // portas: a do meio, alta e em arco; as duas dos lados, menores
  const portaArco = (x0: number, w: number, h: number) => {
    m.caixa(x0, 0, fz, w, h, 1, e.porta);
    m.caixa(x0 + Math.floor(w / 2), 0, fz, 1, h - 2, 1, new THREE.Color(e.porta).multiplyScalar(0.8).getHex());
    m.caixa(x0 - 1, 0, fz + 1, 1, h + 1, 1, pedra).caixa(x0 + w, 0, fz + 1, 1, h + 1, 1, pedra);
    m.caixa(x0, h, fz + 1, w, 1, 1, pedra).caixa(x0 + 1, h + 1, fz + 1, w - 2, 1, 1, pedra);
    m.ponto(x0, h - 1, fz, e.parede).ponto(x0 + w - 1, h - 1, fz, e.parede);
  };
  portaArco(cx - 3, 6, 16);
  const vaoLado = Math.floor((Wv - 2 * T - 10) / 4);
  portaArco(T + 2 + vaoLado - 2, 4, 12);
  portaArco(Wv - T - 2 - vaoLado - 2, 4, 12);
  // janelas do coro, em arco, de caixilho branco
  const yj = Math.floor(Hf / 2) + 3;
  for (const x0 of [cx - 2, T + 2 + vaoLado - 2, Wv - T - 2 - vaoLado - 2]) {
    m.caixa(x0, yj, fz, 4, 10, 1, 0x3a4a5a);
    m.caixa(x0, yj + 4, fz, 4, 1, 1, 0xf6f4ee).caixa(x0 + 1, yj, fz, 1, 10, 1, 0xf6f4ee).caixa(x0 + 2, yj, fz, 1, 10, 1, 0xf6f4ee);
    m.caixa(x0 - 1, yj - 1, fz + 1, 6, 1, 1, pedra).caixa(x0 - 1, yj, fz + 1, 1, 10, 1, pedra).caixa(x0 + 4, yj, fz + 1, 1, 10, 1, pedra);
    m.caixa(x0, yj + 10, fz + 1, 4, 1, 1, pedra).ponto(x0, yj + 9, fz, e.parede).ponto(x0 + 3, yj + 9, fz, e.parede);
  }
  // frontão recortado: sobe em volutas até a cruz, com o óculo no meio
  const meia = Math.floor(Wv / 2) - T;
  const ALT_FR = 16;
  for (let r = 0; r < ALT_FR; r++) {
    const t = r / ALT_FR;
    const hw = Math.round(meia * (1 - t * t * 0.85) - (r > 2 && r < 6 ? 2 * Math.sin(((r - 2) / 4) * Math.PI) : 0));
    if (hw < 2) break;
    m.caixa(cx - hw, Hf + r, fz, 2 * hw, 1, 1, parede);
    m.ponto(cx - hw, Hf + r, fz + 1, e.cantaria).ponto(cx + hw - 1, Hf + r, fz + 1, e.cantaria);
  }
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) {
    const d = Math.hypot(x, y);
    if (d <= 3.2) m.ponto(cx + x, Hf + 6 + y, fz, d > 2.2 ? e.cantaria : 0x3a4a5a);
  }
  m.caixa(cx - 1, Hf + ALT_FR - 4, fz, 2, 2, 1, pedra);
  m.caixa(cx - 1, Hf + ALT_FR - 2, fz, 2, 8, 1, pedra).caixa(cx - 3, Hf + ALT_FR + 2, fz, 6, 2, 1, pedra);

  // torres
  for (const x0 of [0, Wv - T]) {
    const z0 = Lv - T;
    m.caixa(x0, 0, z0, T, Ht, 1, parede).caixa(x0, 0, fz, T, Ht, 1, parede);
    m.caixa(x0, 0, z0, 1, Ht, T, parede).caixa(x0 + T - 1, 0, z0, 1, Ht, T, parede);
    // cunhais e cornijas de cantaria
    for (const cxx of [x0, x0 + T - 1]) m.caixa(cxx, 0, fz + 1, 1, Ht, 1, pedra);
    m.caixa(x0, 0, fz + 1, T, 2, 1, pedra);
    for (const y of [Math.floor(Hf / 2), Hf - 2, Ht - 2]) m.caixa(x0 - 1, y, z0 - 1, T + 2, 2, T + 2, pedra);
    // janelinha e sineira (vãos em arco nas três faces)
    m.caixa(x0 + 4, yj, fz, 4, 8, 1, 0x3a4a5a).caixa(x0 + 3, yj - 1, fz + 1, 6, 1, 1, pedra);
    const yb = Hf + 2;
    for (const [fx, fzz, ao] of [[x0 + 3, fz, 'z'], [x0, z0 + 3, 'x'], [x0 + T - 1, z0 + 3, 'x']] as const) {
      if (ao === 'z') m.caixa(fx, yb, fzz, 6, 12, 1, ESCURO).ponto(fx, yb + 11, fzz, e.parede).ponto(fx + 5, yb + 11, fzz, e.parede);
      else m.caixa(fx, yb, fzz, 1, 12, 6, ESCURO).ponto(fx, yb + 11, fzz, e.parede).ponto(fx, yb + 11, fzz + 5, e.parede);
    }
    m.caixa(x0 + 5, yb + 6, fz - 3, 2, 3, 2, 0x8a6a2a); // o sino
    // cobertura da torre
    const tc = x0 + T / 2 - 0.5, zc = z0 + T / 2 - 0.5;
    if (e.torre === 'bulbo') {
      for (let y = 0; y < 14; y++) {
        const r = y < 2 ? T / 2 - 1 : 5.6 * Math.sin(Math.PI * (0.18 + (y / 14) * 0.82)) + (y < 5 ? 0.6 : 0);
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) if (Math.hypot(x + x0 - tc, z + z0 - zc) <= r) m.ponto(x0 + x, Ht + y, z0 + z, e.coberturaTorre(x, y, z));
      }
      m.caixa(x0 + 5, Ht + 14, z0 + 5, 2, 4, 2, pedra).caixa(x0 + 4, Ht + 18, z0 + 4, 4, 1, 4, pedra);
      m.caixa(x0 + 5, Ht + 19, z0 + 5, 2, 6, 2, 0x5a5a5a).caixa(x0 + 3, Ht + 22, z0 + 5, 6, 1, 2, 0x5a5a5a);
    } else {
      for (let y = 0; y < 18; y++) {
        const r = (T / 2) * (1 - y / 18);
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) if (Math.max(Math.abs(x + x0 - tc), Math.abs(z + z0 - zc)) <= r) m.ponto(x0 + x, Ht + y, z0 + z, e.coberturaTorre(x, y, z));
      }
      m.caixa(x0 + 5, Ht + 18, z0 + 5, 2, 5, 2, pedra).caixa(x0 + 3, Ht + 21, z0 + 5, 6, 1, 2, 0x5a5a5a);
      // pináculos nos cantos
      for (const [px, pz] of [[0, 0], [T - 1, 0], [0, T - 1], [T - 1, T - 1]]) m.caixa(x0 + px, Ht, z0 + pz, 1, 4, 1, pedra);
    }
  }
  const malha = m.malha(0.25, [Wv / 2, 0, Lv]);
  return { malha, largura: e.largura, comprimento: e.comprimento };
}

/**
 * O gradil do adro do Bonfim, coberto de fitinhas de todas as cores (voxel de 0,125 m), ao longo de +x.
 * As fitas são presas no alto e caem em feixes de comprimentos diferentes.
 */
export function gradilDeFitas(semente: number, comprimento: number) {
  const L = Math.round(comprimento * 8);
  const m = new Modelo();
  const rnd = aleatorio(semente);
  const CORES = [0xd8283a, 0xf2d020, 0x2a9a4a, 0x2a5ad0, 0xf6f6f6, 0xe86aa8, 0x8a3ac8, 0xf08a20, 0x2ac8c8];
  for (let x = 0; x < L; x++) {
    if (x % 12 === 0) m.caixa(x, 0, 0, 1, 10, 1, FERRO);
    m.ponto(x, 9, 0, FERRO);
    for (const z of [-1, 0, 1]) {
      if (rnd() < 0.15) continue;
      const c = CORES[Math.floor(rnd() * CORES.length)];
      const cai = 3 + Math.floor(rnd() * 6);
      m.caixa(x, 9 - cai, z, 1, cai, 1, c);
    }
  }
  return m.malha(0.125, [0, 0, 0]);
}

/**
 * A casa abandonada (voxel de 0,25 m): um cômodo térreo de 6 × 5 m, reboco descascado e manchado de umidade, as
 * janelas pregadas com tábuas e o telhado com buracos. `aberta`: a porta pregada foi forçada e as tábuas estão no
 * chão. Dentro, chão de terra batida, uma esteira de palha junto à parede do fundo, um caixote e entulho.
 * Origem no centro do cômodo, no chão; a porta dá para +z.
 */
export function casaAbandonada(aberta: boolean) {
  const W = 24, D = 20, H = 15;
  const m = new Modelo();
  const sorte = (x: number, y: number, z: number) => {
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return h - Math.floor(h);
  };
  const reboco = (x: number, y: number, z: number) => {
    const r = sorte(x, y, z);
    if (y <= 3) return variar(r < 0.4 ? 0x8a7e68 : 0x9a8e76, x, y, z, 0.04); // a barra de umidade
    if (r < 0.12) return variar(0x9a6a4a, x, y, z, 0.05); // o tijolo onde o reboco caiu
    return variar(r < 0.3 ? 0xbcb29a : 0xccc2a8, x, y, z, 0.03);
  };
  const madeira = (x: number, y: number, z: number) => variar(x % 3 ? 0x6a5236 : 0x5a4430, x, y, z, 0.06);
  // chão de terra batida (o topo fica no nível do chão)
  m.caixa(0, -1, 0, W, 1, D, (x, y, z) => variar(sorte(x, 0, z) < 0.1 ? 0x5a4a38 : 0x6e5c46, x, y, z, 0.05));
  // as paredes, com o vão da porta na frente
  m.caixa(0, 0, 0, W, H, 1, reboco);
  m.caixa(0, 0, 1, 1, H, D - 1, reboco).caixa(W - 1, 0, 1, 1, H, D - 1, reboco);
  for (let x = 1; x < W - 1; x++) if (x < 9 || x > 14) m.caixa(x, 0, D - 1, 1, H, 1, reboco);
  m.caixa(9, 11, D - 1, 6, H - 11, 1, reboco); // a verga sobre a porta
  // a porta: pregada com tábuas, ou forçada (as tábuas caídas na soleira)
  if (!aberta) {
    for (let x = 9; x < 15; x++) m.caixa(x, 0, D - 1, 1, 11, 1, madeira);
    for (let k = 0; k < 6; k++) m.ponto(9 + k, 2 + k, D, 0x4a3a28).ponto(14 - k, 2 + k, D, 0x4a3a28); // o X pregado
  } else {
    m.caixa(8, 0, D + 1, 7, 1, 2, madeira).caixa(10, 0, D + 3, 2, 1, 4, madeira);
  }
  // as janelas da frente e dos lados, pregadas com tábuas tortas
  for (const x0 of [2, 17]) {
    m.caixa(x0, 4, D - 1, 5, 5, 1, ESCURO);
    m.caixa(x0 - 1, 5, D, 7, 1, 1, madeira).caixa(x0, 7, D, 6, 1, 1, madeira);
  }
  m.caixa(0, 5, 8, 1, 4, 4, ESCURO).caixa(-1, 6, 7, 1, 1, 6, madeira);
  m.caixa(W - 1, 5, 8, 1, 4, 4, ESCURO);
  // o telhado de uma água, caindo para a frente, de telhas velhas, com buracos e as ripas à mostra
  const topo = (z: number) => H + Math.floor((D - Math.max(0, Math.min(D, z))) / 5);
  for (let z = -1; z <= D + 1; z++)
    for (let x = -1; x <= W; x++) {
      const y = topo(z);
      if (sorte(x >> 1, 0, z >> 1) < 0.08) {
        if (z % 4 === 0) m.ponto(x, y - 1, z, 0x4a3a2a); // a ripa
        continue;
      }
      m.caixa(x, y - 1, z, 1, 2, 1, variar(TELHA[z & 3], x, y, z, 0.06));
    }
  for (let z = 1; z < D; z++) {
    const h = topo(z) - 1 - H;
    if (h > 0) m.caixa(0, H, z, 1, h, 1, reboco).caixa(W - 1, H, z, 1, h, 1, reboco);
  }
  m.caixa(0, H, 0, W, topo(0) - 1 - H, 1, reboco);
  // dentro: a esteira junto ao fundo, o caixote, um lampião velho e o entulho
  m.caixa(3, 0, 2, 8, 1, 4, (x, _y, z) => ((x + z) % 2 ? 0xc8a860 : 0xb89850));
  m.caixa(W - 5, 0, 2, 3, 3, 3, madeira).ponto(W - 4, 3, 3, 0x8a6a2a);
  for (let k = 0; k < 9; k++) m.ponto(2 + Math.floor(sorte(k, 1, 2) * (W - 4)), 0, 7 + Math.floor(sorte(k, 2, 1) * (D - 9)), 0x8a7e68);
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** Um saco de estopa amarrado em cima (2 × 3 × 2 voxels de 0,25 m), com a base em (x, y, z). */
function saco(m: Modelo, x: number, y: number, z: number, cor: number) {
  m.caixa(x, y, z, 2, 2, 2, v(cor, 0.06)).caixa(x, y + 2, z, 2, 1, 2, v(cor, 0.06)).ponto(x, y + 3, z, 0x6a5236);
}

/** Um caixote de ripas (3 voxels de lado), com a base em (x, y, z). */
function caixote(m: Modelo, x: number, y: number, z: number) {
  m.caixa(x, y, z, 3, 3, 3, (xx, yy, zz) => variar(yy === y + 1 ? 0x5a4430 : 0x8a6a44, xx, yy, zz, 0.05));
}

/**
 * A frente do armazém do Comércio (voxel de 0,25 m), para encostar na fachada de um sobrado: a porta larga aberta,
 * o toldo listrado, a tabuleta e, na calçada, sacos de farinha e de cacau e caixotes. Frente para +z; a origem é o
 * pé da parede, no meio da porta.
 */
export function armazem() {
  const m = new Modelo();
  const listra = (x: number) => (Math.floor((x + 8) / 2) % 2 ? 0xb83a32 : 0xeee6d2);
  // a porta aberta (o escuro da loja), o batente e uma folha da porta rebatida para dentro
  m.caixa(-3, 0, 0, 6, 10, 1, 0x1e1812);
  m.caixa(-4, 0, 0, 1, 11, 1, 0x5a4430).caixa(3, 0, 0, 1, 11, 1, 0x5a4430).caixa(-4, 10, 0, 8, 1, 1, 0x5a4430);
  m.caixa(-3, 0, 0, 1, 10, 1, v(0x3a5a3a));
  // o toldo: listrado, caindo para a rua, com a franja
  for (let z = 1; z <= 6; z++) {
    const y = 12 - Math.floor(z / 2);
    for (let x = -7; x <= 6; x++) m.ponto(x, y, z, listra(x));
  }
  for (let x = -7; x <= 6; x++) if (x % 2 === 0) m.ponto(x, 8, 6, listra(x));
  // a tabuleta verde sobre o toldo, com a letra clara em pontos
  m.caixa(-5, 13, 0, 10, 3, 1, v(0x2a5a3a, 0.03));
  for (let x = -4; x < 4; x++) if (x % 3 !== 2) m.ponto(x, 14, 1, 0xe8dcb0);
  // a mercadoria na calçada
  saco(m, -7, 0, 1, 0xc8b088);
  saco(m, -5, 0, 2, 0xb89c70);
  saco(m, -6, 3, 1, 0xd8c8a0);
  saco(m, 4, 0, 2, 0x8a6a44);
  caixote(m, 5, 0, 1);
  caixote(m, 5, 3, 1);
  m.caixa(6, 6, 2, 1, 1, 1, 0xd8b048).ponto(5, 6, 2, 0x8a4a2a); // frutas no caixote de cima
  return m.malha(0.25, [0, 0, 0]);
}

/** A doação do comerciante à porta do convento: sacos de farinha e feijão, um caixote com vidros de remédio. */
export function mantimentos() {
  const m = new Modelo();
  saco(m, 0, 0, 0, 0xd8c8a0);
  saco(m, 2, 0, 0, 0xc8b088);
  saco(m, 1, 3, 0, 0xb89c70);
  saco(m, 0, 0, 2, 0x8a6a44);
  caixote(m, 3, 0, 3);
  for (const [x, z] of [[3, 3], [4, 4], [5, 3]]) m.caixa(x, 3, z, 1, 2, 1, 0x3a7a5a).ponto(x, 5, z, 0xd8d0c0); // os vidros
  return m.malha(0.25, [3, 0, 3]);
}

/** Uma esteira de palha estendida no chão (2 × 1 m), ao longo de z. */
export function esteira() {
  const m = new Modelo().caixa(0, 0, 0, 4, 1, 8, (x, _y, z) => ((x + z) % 2 ? 0xc8a860 : 0xb89850));
  return m.malha(0.25, [2, 0, 4]);
}

/**
 * O muro da colina coberto de fitinhas (voxel de 0,125 m): uma grade de ferro encostada no paredão, com as fitas
 * do Senhor do Bonfim amarradas em cada barra, umas sobre as outras, até quase não se ver a pedra. Ao longo de +x,
 * de `comprimento` metros e `altura` metros a partir do chão; as fitas pendem na frente (+z).
 */
export function muroDeFitas(semente: number, comprimento: number, altura: number) {
  const L = Math.round(comprimento * 8), H = Math.round(altura * 8);
  const m = new Modelo();
  const rnd = aleatorio(semente);
  const CORES = [0xd8283a, 0xf2d020, 0x2a9a4a, 0x2a5ad0, 0xf6f6f6, 0xe86aa8, 0x8a3ac8, 0xf08a20, 0x2ac8c8, 0x1e7a3a, 0xc81e5a];
  // a grade: montantes a cada 1,5 m e uma barra a cada 0,75 m
  for (let x = 0; x < L; x += 12) m.caixa(x, 0, 0, 1, H, 1, FERRO);
  const barras: number[] = [];
  for (let y = H - 1; y > 2; y -= 6) barras.push(y);
  for (const y of barras) m.caixa(0, y, 0, L, 1, 1, FERRO);
  // as fitas: em cada barra, uma por coluna (quase sempre), de comprimento variado, em duas camadas
  for (const y of barras)
    for (let x = 0; x < L; x++)
      for (const z of [1, 2]) {
        if (rnd() < (z === 1 ? 0.06 : 0.35)) continue;
        const cai = Math.min(y, 4 + Math.floor(rnd() * 5));
        m.caixa(x, y - cai, z, 1, cai, 1, CORES[Math.floor(rnd() * CORES.length)]);
      }
  return m.malha(0.125, [0, 0, 0]);
}

/**
 * O Elevador Lacerda, art déco (voxel de 0,5 m): o prédio da base com as entradas, a torre de nervuras
 * verticais encostada na escarpa e o bloco do alto, com a passarela que vai até a beira da Cidade Alta.
 * Origem no centro da base, no chão; a passarela sai para +x. `subida`: a altura da passarela, em metros.
 */
export function elevadorLacerda(subida: number, passarela: number) {
  const m = new Modelo();
  const S = 0.5;
  const H = Math.round(subida / S);
  const P = Math.round(passarela / S);
  const creme = (x: number, _y: number, z: number) => ((x + z) % 4 === 0 ? 0xe4dccb : 0xf2ecdf);
  const friso = 0xcfc6b2;
  const vidro = 0x3a4a5a;
  // base: 12 × 10 m, 6 m de altura, com três entradas e marquise
  m.caixa(-12, 0, -10, 24, 12, 20, creme);
  for (const z of [-6, 0, 6]) m.caixa(-13, 0, z - 2, 1, 8, 4, ESCURO).caixa(-14, 8, z - 3, 2, 1, 6, friso);
  m.caixa(-13, 11, -10, 1, 1, 20, friso);
  // torre: 8 × 7 m, das costas da base até o alto
  for (let y = 12; y < H; y++)
    for (let x = -8; x < 8; x++)
      for (let z = -7; z < 7; z++) {
        if (x > -8 && x < 7 && z > -7 && z < 6) continue;
        const nervura = (x + 8) % 3 === 0 || (z + 7) % 3 === 0;
        m.ponto(x, y, z, nervura ? friso : creme(x, y, z));
      }
  // faixas de janelas estreitas na torre
  for (let y = 16; y < H - 4; y += 2) for (const z of [-4, 0, 4]) m.ponto(-8, y, z, vidro);
  // bloco do alto: mais largo, com janelões e a casa de máquinas
  m.caixa(-10, H, -9, 20, 10, 18, creme);
  for (let z = -7; z < 8; z += 3) m.caixa(-11, H + 3, z, 1, 4, 2, vidro);
  m.caixa(-11, H + 9, -10, 22, 1, 20, friso).caixa(-6, H + 10, -5, 12, 4, 10, creme);
  m.caixa(-7, H + 14, -6, 14, 1, 12, friso);
  // passarela coberta até a beira da escarpa
  m.caixa(10, H, -3, P, 1, 6, friso);
  m.caixa(10, H + 1, -3, P, 1, 1, creme).caixa(10, H + 1, 2, P, 1, 1, creme);
  for (let x = 10; x < 10 + P; x += 4) m.caixa(x, H + 2, -3, 1, 4, 1, creme).caixa(x, H + 2, 2, 1, 4, 1, creme);
  m.caixa(10, H + 6, -3, P, 1, 6, friso);
  return m.malha(S, [0, 0, 0]);
}

/**
 * O Mercado Modelo (antiga Casa da Alfândega): sobrado neoclássico de arcos, platibanda e a rotunda voltada
 * para o mar (voxel de 0,5 m). A frente (+z) é a rua; a rotunda fica atrás. Medidas em metros.
 */
export function mercadoModelo(largura: number, profundidade: number) {
  const m = new Modelo();
  const W = Math.round(largura * 2), D = Math.round(profundidade * 2), H = 20;
  const parede = 0xeadcb4, friso = 0xd2c094;
  m.caixa(0, 0, 0, W, H, 1, parede).caixa(0, 0, D - 1, W, H, 1, parede).caixa(0, 0, 0, 1, H, D, parede).caixa(W - 1, 0, 0, 1, H, D, parede);
  m.caixa(1, H - 1, 1, W - 2, 1, D - 2, v(0x9a948a));
  // arcos do térreo e janelas de cima, nas quatro faces
  const vaos = (face: 'f' | 't' | 'e' | 'd') => {
    const comp = face === 'f' || face === 't' ? W : D;
    for (let i = 3; i < comp - 3; i += 5) {
      const put = (a: number, y: number, h: number, w: number, c: number) => {
        if (face === 'f') m.caixa(a, y, D - 1, w, h, 1, c);
        else if (face === 't') m.caixa(a, y, 0, w, h, 1, c);
        else if (face === 'e') m.caixa(0, y, a, 1, h, w, c);
        else m.caixa(W - 1, y, a, 1, h, w, c);
      };
      put(i, 0, 7, 3, ESCURO);
      put(i, 7, 1, 1, 0xeadcb4);
      put(i + 2, 7, 1, 1, 0xeadcb4);
      put(i, 11, 5, 3, 0x3a4a5a);
      put(i + 1, 11, 5, 1, 0xf2ece0);
    }
  };
  for (const f of ['f', 't', 'e', 'd'] as const) vaos(f);
  m.caixa(-1, 9, -1, W + 2, 1, D + 2, friso).caixa(-1, H - 2, -1, W + 2, 1, D + 2, friso);
  m.caixa(0, H, D - 1, W, 2, 1, parede).caixa(0, H, 0, W, 2, 1, parede).caixa(0, H, 0, 1, 2, D, parede).caixa(W - 1, H, 0, 1, 2, D, parede);
  // frontão no meio da frente, com o nome
  const cx = Math.floor(W / 2);
  m.caixa(cx - 6, H + 2, D - 1, 12, 3, 1, parede).caixa(cx - 3, H + 5, D - 1, 6, 2, 1, parede);
  m.caixa(cx - 5, H + 3, D, 10, 1, 1, 0x6a5a3a);
  // rotunda atrás, voltada para o mar
  const R = 7;
  for (let y = 0; y < H - 2; y++)
    for (let x = -R; x <= R; x++)
      for (let z = -R; z <= 0; z++) {
        const d = Math.hypot(x, z);
        if (d > R || d < R - 1.2) continue;
        const janela = y > 10 && y < 16 && (x + 20) % 3 === 0;
        m.ponto(cx + x, y, z, janela ? 0x3a4a5a : y === 9 ? friso : parede);
      }
  for (let x = -R; x <= R; x++) for (let z = -R; z <= 0; z++) if (Math.hypot(x, z) <= R) m.ponto(cx + x, H - 2, z, 0x9a948a);
  return m.malha(0.5, [W / 2, 0, D / 2]);
}

/**
 * O Convento de Santo Antônio, onde Irmã Dulce pediu licença para abrigar os doentes: igrejinha branca de
 * frontão simples e sineira, e o corpo do convento, comprido, com janelas de verga reta (voxel de 0,25 m).
 * Frente para +z, origem no centro da frente.
 */
export function conventoSantoAntonio() {
  const m = new Modelo();
  const cal = 0xf4f0e8, pedra = 0xc8bca4, telha = (_x: number, y: number) => TELHA[y & 3];
  // a igrejinha: 8 × 14 m
  const W = 32, L = 56, H = 32;
  m.caixa(0, 0, 0, 1, H, L, cal).caixa(W - 1, 0, 0, 1, H, L, cal).caixa(0, 0, 0, W, H, 1, cal).caixa(0, 0, L - 1, W, H, 1, cal);
  for (const x of [0, W - 1]) m.caixa(x, 0, L, 1, H, 1, pedra);
  m.caixa(0, 0, L, W, 2, 1, pedra).caixa(-1, H - 1, L, W + 2, 1, 1, pedra);
  for (let r = 0; r < 10; r++) m.caixa(r, H + r, L - 1, W - 2 * r, 1, 1, cal).ponto(r, H + r, L, pedra).ponto(W - 1 - r, H + r, L, pedra);
  m.caixa(14, 0, L - 1, 4, 14, 1, 0x5a3a22).caixa(13, 14, L, 6, 1, 1, pedra);
  m.caixa(14, 20, L - 1, 4, 5, 1, 0x3a4a5a);
  m.caixa(12, H + 10, L - 1, 8, 8, 1, cal).caixa(14, H + 12, L - 1, 4, 4, 1, ESCURO).caixa(15, H + 13, L - 2, 2, 2, 1, 0x8a6a2a);
  m.caixa(15, H + 18, L - 1, 2, 4, 1, pedra).caixa(14, H + 20, L - 1, 4, 1, 1, pedra);
  for (let k = 0; k <= W / 2; k++) m.caixa(k - 1, H + Math.floor(k / 2), -1, 1, 1, L, telha).caixa(W - k, H + Math.floor(k / 2), -1, 1, 1, L, telha);
  // o convento ao lado: 20 × 12 m, dois andares
  const cw = 80, cd = 48, ch = 26;
  const x0 = W;
  m.caixa(x0, 0, L - cd, cw, ch, 1, cal).caixa(x0, 0, L - 1, cw, ch, 1, cal).caixa(x0 + cw - 1, 0, L - cd, 1, ch, cd, cal);
  m.caixa(x0, 0, L, cw, 2, 1, pedra).caixa(x0, 13, L, cw, 1, 1, pedra).caixa(x0 - 1, ch - 1, L, cw + 2, 1, 1, pedra);
  for (let x = x0 + 3; x < x0 + cw - 3; x += 6) {
    m.caixa(x, 4, L - 1, 3, 6, 1, 0x3a4a5a).caixa(x - 1, 10, L, 5, 1, 1, pedra);
    m.caixa(x, 16, L - 1, 3, 6, 1, 0x3a4a5a).caixa(x - 1, 22, L, 5, 1, 1, pedra);
  }
  for (let k = 0; k <= cd / 2; k++) m.caixa(x0 - 1, ch + Math.floor(k / 2), L - cd - 1 + k, cw + 2, 1, 1, telha).caixa(x0 - 1, ch + Math.floor(k / 2), L - k, cw + 2, 1, 1, telha);
  return m.malha(0.25, [W / 2, 0, L]);
}

/**
 * Silhueta de quarteirões ao longe (voxel de 1 m): blocos de cores de casario com janelas e telhados, para o
 * fundo do cenário (a Cidade Alta vista de baixo, a Cidade Baixa vista do alto). Ao longo de +x.
 */
export function silhueta(semente: number, comprimento: number, profundidade: number, alturaMax: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  let x = 0;
  while (x < comprimento) {
    const w = 3 + Math.floor(rnd() * 4), h = 4 + Math.floor(rnd() * (alturaMax - 4));
    const cor = CORES_CASARIO[Math.floor(rnd() * CORES_CASARIO.length)];
    const recuo = Math.floor(rnd() * Math.max(1, profundidade - 4));
    m.caixa(x, 0, recuo, w, h, profundidade - recuo, (xx, y, z) => (y % 3 === 1 && (xx + z) % 2 === 0 && y < h - 1 ? 0x3a3a40 : variar(cor, xx, y, z, 0.02)));
    m.caixa(x, h, recuo, w, 1, profundidade - recuo, v(TELHA[Math.floor(rnd() * 4)]));
    x += w;
  }
  return m.malha(1, [0, 0, 0]);
}

/**
 * Junta muitas malhas de voxel (todas com o material de voxel) em poucas, por pedaços de `lado` metros, para
 * gastar menos chamadas de desenho. As malhas já devem estar posicionadas (position, rotation).
 */
export class Juntador {
  private pedacos = new Map<string, THREE.BufferGeometry[]>();
  constructor(private lado = 40) {}

  add(malha: THREE.Mesh) {
    malha.updateMatrix();
    const g = malha.geometry.clone().applyMatrix4(malha.matrix);
    malha.geometry.dispose();
    const c = new THREE.Vector3();
    g.computeBoundingBox();
    g.boundingBox!.getCenter(c);
    const k = `${Math.floor(c.x / this.lado)},${Math.floor(c.z / this.lado)}`;
    let lista = this.pedacos.get(k);
    if (!lista) this.pedacos.set(k, (lista = []));
    lista.push(g);
  }

  /** As malhas juntas, uma por pedaço. */
  malhas() {
    const saida: THREE.Mesh[] = [];
    for (const lista of this.pedacos.values()) {
      const g = mergeGeometries(lista, false);
      for (const x of lista) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, materialVoxel);
      m.castShadow = true;
      m.receiveShadow = true;
      saida.push(m);
    }
    this.pedacos.clear();
    return saida;
  }
}
