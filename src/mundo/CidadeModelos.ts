import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * Arte por código da Cidade Dourada: uma cidade de colina da Úmbria, como Assis, de pedra rosada
 * (a pedra do monte Subásio) e telhado de barro. No centro, os ricos douraram fachadas e telhados:
 * é a cidade que esqueceu os pobres.
 */

const v = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

/** Pedra rosada do Subásio, em fiadas de tons diferentes. */
export const PEDRA_ROSA = [0xe2c4b2, 0xd6b4a0, 0xeed6c8, 0xcfa896];
const pedraRosa = (x: number, y: number, z: number) =>
  variar(PEDRA_ROSA[(Math.floor(y / 2) + Math.floor((x + z) / 5)) & 3], x, y, z, 0.035);
const TELHA = [0xb5603c, 0xa85434, 0xc06a44];
const OURO = [0xe0b440, 0xf0cc60, 0xc89a30];

export type Frente = 'n' | 's' | 'e' | 'o';
const ROT: Record<Frente, number> = { s: 0, n: Math.PI, e: Math.PI / 2, o: -Math.PI / 2 };

/**
 * Casa de pedra de um ou dois andares (voxel de 0,25 m), com porta em arco, janelas com venezianas,
 * vasos de gerânio, cornija e telhado de duas águas. A frente fica para `frente`. `dourada`: a casa
 * de um rico, com fachada caiada, frisos e telhado de ouro.
 * Devolve a malha já posta no centro do retângulo (largura × profundidade em metros, no mundo).
 */
export function casa(semente: number, largura: number, profundidade: number, frente: Frente, dourada = false) {
  const rnd = aleatorio(semente);
  const deLado = frente === 'e' || frente === 'o';
  const W = Math.round((deLado ? profundidade : largura) * 4);
  const D = Math.round((deLado ? largura : profundidade) * 4);
  const andares = W >= 24 && rnd() < 0.7 ? 2 : 1;
  const H = andares * 12 + 2;
  const m = new Modelo();
  const parede = dourada ? v(0xf2e6cc, 0.025) : pedraRosa;
  const base = dourada ? v(0xd8c49a, 0.03) : v(0xb89a88, 0.05);
  const friso = dourada ? (x: number, y: number, z: number) => variar(OURO[(x + y) % 3], x, y, z, 0.03) : v(0xc8b0a0, 0.03);
  const venez = dourada ? 0x2a5a3a : [0x3a5a3a, 0x6a4a2a, 0x3a4a6a, 0x5a6a3a][Math.floor(rnd() * 4)];
  // paredes (oca por dentro: só se vê a casca)
  m.caixa(0, 0, 0, W, H, 1, parede).caixa(0, 0, D - 1, W, H, 1, parede);
  m.caixa(0, 0, 0, 1, H, D, parede).caixa(W - 1, 0, 0, 1, H, D, parede);
  // embasamento e cunhais
  m.caixa(0, 0, D - 1, W, 2, 1, base).caixa(0, 0, 0, 1, 2, D, base).caixa(W - 1, 0, 0, 1, 2, D, base);
  for (let y = 2; y < H; y += 2) m.caixa(0, y, D - 1, 1, 1, 1, friso).caixa(W - 1, y, D - 1, 1, 1, 1, friso);
  // cornija e friso entre os andares
  m.caixa(-1, H - 1, D - 1, W + 2, 1, 2, friso);
  if (andares === 2) m.caixa(0, 12, D - 1, W, 1, 2, friso);
  // porta em arco, no centro da frente
  const px = Math.floor(W / 2) - 2;
  m.caixa(px, 0, D - 1, 4, 7, 1, dourada ? v(0xc89a30, 0.04) : v(0x6a4428, 0.05));
  m.caixa(px - 1, 7, D - 1, 6, 1, 1, friso).ponto(px, 6, D - 1, friso(px, 6, D - 1)).ponto(px + 3, 6, D - 1, friso(px + 3, 6, D - 1));
  m.ponto(px + 3, 3, D, dourada ? 0xffe08a : 0x2a2018); // aldrava
  m.caixa(px - 1, 0, D, 6, 1, 1, base); // degrau
  // janelas: na frente e nos lados, com venezianas abertas e floreiras
  const janela = (x: number, y: number, z: number, dz: number, ladoX: boolean) => {
    if (ladoX) {
      m.caixa(x, y, z, 1, 4, 3, 0x2a2018);
      m.caixa(x + dz, y, z - 1, 1, 4, 1, venez).caixa(x + dz, y, z + 3, 1, 4, 1, venez);
      m.caixa(x + dz, y - 1, z, 1, 1, 3, friso);
    } else {
      m.caixa(x, y, z, 3, 4, 1, 0x2a2018);
      m.caixa(x - 1, y, z + dz, 1, 4, 1, venez).caixa(x + 3, y, z + dz, 1, 4, 1, venez);
      m.caixa(x, y - 1, z + dz, 3, 1, 1, friso);
      if (rnd() < 0.55) {
        m.caixa(x, y - 1, z + dz * 2, 3, 1, 1, 0x8a4a2a);
        m.ponto(x, y, z + dz * 2, 0xd8283a).ponto(x + 2, y, z + dz * 2, 0xe84a5a).ponto(x + 1, y, z + dz * 2, 0x3a7a2a);
      }
    }
  };
  for (let a = 0; a < andares; a++) {
    const y = 4 + a * 12 + (a === 0 ? 0 : 1);
    for (let x = 3; x + 3 < W - 2; x += 7) {
      if (a === 0 && x + 3 > px - 1 && x < px + 5) continue; // não em cima da porta
      janela(x, y, D - 1, 1, false);
      if (rnd() < 0.5) janela(x, y, 0, -1, false);
    }
    for (let z = 4; z + 3 < D - 3; z += 8) {
      janela(0, y, z, -1, true);
      janela(W - 1, y, z, 1, true);
    }
  }
  // telhado de duas águas (cumeeira paralela à frente), com beiral
  const telha = dourada
    ? (x: number, y: number, z: number) => variar(OURO[(x & 1) + ((y & 1) ? 1 : 0) > 1 ? 2 : (x & 1)], x, y, z, 0.03)
    : (x: number, y: number, z: number) => variar(TELHA[(x + (y & 1)) % 3], x, y, z, 0.04);
  const fileiras = Math.ceil(D / 2);
  for (let k = 0; k <= fileiras; k++) {
    const z0 = k - 1, z1 = D - k;
    if (z1 < z0) break;
    m.caixa(-1, H + Math.floor(k / 2), z0, W + 2, 1, 1, telha).caixa(-1, H + Math.floor(k / 2), z1, W + 2, 1, 1, telha);
    // empenas (os triângulos das pontas) em pedra
    if (k > 1) m.caixa(0, H + Math.floor(k / 2) - 1, z0, 1, 1, z1 - z0 + 1, parede).caixa(W - 1, H + Math.floor(k / 2) - 1, z0, 1, 1, z1 - z0 + 1, parede);
  }
  const topo = H + Math.floor(fileiras / 2);
  m.caixa(-1, topo, Math.floor(D / 2) - 1, W + 2, 1, 2, dourada ? v(0xc89a30) : v(0x8a3a22));
  // chaminé
  const cx = 2 + Math.floor(rnd() * (W - 6));
  m.caixa(cx, H, Math.floor(D / 4), 2, topo - H + 3, 2, parede).caixa(cx - 1, topo + 3, Math.floor(D / 4) - 1, 4, 1, 4, base);
  const malha = m.malha(0.25, [W / 2, 0, D / 2]);
  malha.rotation.y = ROT[frente];
  return malha;
}

/** Oliveira: tronco retorcido e oco, copa larga verde-prateada, com azeitonas. */
export function oliveira(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const casca = v(0x6a5a4a, 0.08);
  let x = 0, z = 0;
  for (let y = 0; y < 9; y++) {
    x += Math.round((rnd() - 0.5) * 1.4);
    z += Math.round((rnd() - 0.5) * 1.4);
    m.caixa(x - 1, y, z - 1, 3, 1, 3, casca);
    if (y < 3) m.ponto(x, y, z, null); // o oco do tronco velho
  }
  for (let g = 0; g < 4; g++) {
    const a = rnd() * Math.PI * 2;
    for (let t = 1; t < 5; t++) m.ponto(x + Math.round(Math.cos(a) * t), 9 + Math.floor(t / 2), z + Math.round(Math.sin(a) * t), 0x5a4a3a);
  }
  const folha = [0x8a9a62, 0x7a8c58, 0x9aa874, 0x6e8050];
  for (let i = -7; i <= 7; i++)
    for (let k = -7; k <= 7; k++)
      for (let y = 9; y <= 15; y++) {
        const e = (i * i + k * k) / 46 + ((y - 12) * (y - 12)) / 9 + (rnd() - 0.5) * 0.35;
        if (e < 1) m.ponto(x + i, y, z + k, rnd() < 0.04 ? 0x3a3a2a : folha[Math.floor(rnd() * 4)]);
      }
  return m.malha(0.2, [x + 0.5, 0, z + 0.5]);
}

/** Cipreste: alto, estreito e escuro, como os das estradas da Úmbria. */
export function cipreste(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const alt = 26 + Math.floor(rnd() * 8);
  m.caixa(0, 0, 0, 1, 3, 1, 0x4a3a2a);
  for (let y = 2; y < alt; y++) {
    const r = Math.max(0, Math.round(Math.sin((y / alt) * Math.PI) * 2.6 - (y > alt * 0.7 ? 0.6 : 0)));
    for (let i = -r; i <= r; i++)
      for (let k = -r; k <= r; k++)
        if (i * i + k * k <= r * r + 1) m.ponto(i, y, k, variar(rnd() < 0.5 ? 0x2e4a2a : 0x26402a, i, y, k, 0.06));
  }
  return m.malha(0.2, [0.5, 0, 0.5]);
}

/** Fonte da praça: tanque octogonal, coluna e taça, tudo dourado pelos ricos. A água corre. */
export function fonte() {
  const m = new Modelo();
  const ouro = (x: number, y: number, z: number) => variar(OURO[(x + z + y) % 3], x, y, z, 0.03);
  const pedra = v(0xe8d8c4, 0.03);
  for (let x = -10; x <= 10; x++)
    for (let z = -10; z <= 10; z++) {
      const r = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.72);
      if (r <= 10 && r > 8.6) m.caixa(x, 0, z, 1, 4, 1, r > 9.4 ? ouro : pedra);
      else if (r <= 8.6) m.ponto(x, 0, z, pedra(x, 0, z)).ponto(x, 1, z, 0x4a8ac8).ponto(x, 2, z, r < 3 ? 0x5a9ad8 : null);
    }
  m.caixa(-1, 1, -1, 3, 12, 3, pedra).caixa(-1, 4, -1, 3, 1, 3, ouro);
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= 17) m.ponto(x, 13, z, ouro(x, 13, z));
  m.caixa(-3, 14, -3, 7, 1, 7, (x, _y, z) => (x * x + z * z <= 9 ? 0x6aaee8 : null));
  m.caixa(0, 14, 0, 1, 4, 1, ouro).caixa(-1, 18, -1, 3, 1, 3, ouro).ponto(0, 19, 0, 0xfff0a0);
  return m.malha(0.2, [0.5, 0, 0.5]);
}

/**
 * Fachada do Palácio do Banquete, ao norte da praça: um palácio de ouro, com colunata, escadaria,
 * estandartes e as portas fechadas. Lá dentro, a Gula dá um banquete que nunca acaba.
 */
export function palacio() {
  const m = new Modelo();
  const W = 88, D = 56, H = 46;
  const cal = v(0xf4e8cc, 0.02);
  const ouro = (x: number, y: number, z: number) => variar(OURO[(x + y + z) % 3], x, y, z, 0.03);
  const marmore = v(0xece2d2, 0.02);
  m.caixa(0, 0, 0, W, H, D, cal);
  // escadaria
  for (let k = 0; k < 4; k++) m.caixa(20 - k * 2, k, D + 6 - k * 2, W - 40 + k * 4, 1, 2, marmore);
  m.caixa(16, 0, D, W - 32, 4, 2, marmore);
  // colunata com capitéis dourados
  for (let x = 18; x <= W - 20; x += 9) {
    m.caixa(x, 4, D + 2, 3, 26, 3, marmore).caixa(x - 1, 30, D + 1, 5, 2, 5, ouro).caixa(x - 1, 4, D + 1, 5, 1, 5, ouro);
  }
  m.caixa(14, 32, D, W - 28, 3, 6, ouro); // entablamento
  for (let k = 0; k < 8; k++) m.caixa(14 + k * 4, 35 + k, D + 2, W - 28 - k * 8, 1, 3, cal); // frontão
  m.caixa(14, 35, D + 4, W - 28, 1, 1, ouro);
  // portas de ouro, fechadas, com uma taça em relevo
  m.caixa(W / 2 - 7, 4, D, 14, 20, 1, ouro).caixa(W / 2, 4, D + 1, 1, 20, 1, 0xa88020);
  m.caixa(W / 2 - 3, 12, D + 1, 2, 4, 1, 0xfff0a0).caixa(W / 2 + 2, 12, D + 1, 2, 4, 1, 0xfff0a0);
  // janelas altas com vidros dourados e estandartes vermelhos
  for (let x = 6; x < W - 6; x += 14) {
    if (Math.abs(x + 2 - W / 2) < 12) continue;
    m.caixa(x, 12, D, 4, 10, 1, 0xf0c860).caixa(x - 1, 22, D, 6, 1, 1, ouro);
  }
  for (const x of [8, W - 12]) m.caixa(x, 26, D, 4, 14, 1, 0xa8202a).caixa(x + 1, 30, D + 1, 2, 2, 1, 0xf0c860);
  // cúpula dourada
  for (let y = 0; y < 14; y++) {
    const r = Math.round(Math.sqrt(Math.max(0, 196 - y * y)));
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r) m.ponto(W / 2 + x, H + y, D / 2 + z, ouro(x, y, z));
  }
  m.caixa(W / 2, H + 14, D / 2, 1, 4, 1, ouro).caixa(W / 2 - 1, H + 18, D / 2 - 1, 3, 3, 3, 0xfff0a0);
  // ameias douradas na cornija
  for (let x = 0; x < W; x += 3) m.caixa(x, H, D - 2, 2, 2, 2, ouro).caixa(x, H, 0, 2, 2, 2, ouro);
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/**
 * São Damião, a capelinha em ruínas fora dos muros. `estagio` vai de 0 (só os alicerces e as paredes caídas)
 * a 4 (paredes de pé, telhado e a cruz pintada de São Damião sobre a porta). Francisco ouviu dessa cruz:
 * "Francisco, vai e repara a minha casa, que, como vês, está em ruínas."
 */
export function saoDamiao(estagio: number) {
  const m = new Modelo();
  const W = 22, D = 30;
  const alturas = [3, 6, 9, 12, 14];
  const h = alturas[Math.max(0, Math.min(4, estagio))];
  const rnd = aleatorio(77);
  const pedra = (x: number, y: number, z: number) => variar(PEDRA_ROSA[(y + x) & 3], x, y, z, 0.05);
  const pedraVelha = (x: number, y: number, z: number) => variar(0xa89890, x, y, z, 0.07);
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < W; x++)
      for (const z of [0, D - 1]) {
        if (z === D - 1 && x >= 8 && x < 14 && y < 9) continue; // a porta
        const quebra = estagio < 4 && y >= h - 2 + Math.round(Math.sin(x * 1.3) * 1.5 + rnd() * 1.5);
        if (y < h && !quebra) m.ponto(x, y, z, y < 3 ? pedraVelha(x, y, z) : pedra(x, y, z));
      }
    for (let z = 1; z < D - 1; z++)
      for (const x of [0, W - 1]) {
        if (z >= 10 && z < 14 && y >= 5 && y < 9) continue; // janelinhas
        const quebra = estagio < 4 && y >= h - 2 + Math.round(Math.sin(z * 0.9) * 1.5 + rnd() * 1.5);
        if (y < h && !quebra) m.ponto(x, y, z, y < 3 ? pedraVelha(x, y, z) : pedra(x, y, z));
      }
  }
  // pedras caídas em volta enquanto está em ruínas
  if (estagio < 4)
    for (let i = 0; i < 26 - estagio * 6; i++) {
      const x = Math.floor(rnd() * (W + 8)) - 4, z = Math.floor(rnd() * (D + 8)) - 4;
      if (x > 1 && x < W - 2 && z > 1 && z < D - 2) continue;
      m.caixa(x, 0, z, 1 + Math.floor(rnd() * 2), 1, 1 + Math.floor(rnd() * 2), pedraVelha);
    }
  if (estagio >= 4) {
    // telhado de barro e o campanário de espadana
    for (let k = 0; k <= W / 2; k++)
      m.caixa(k - 1, 14 + Math.floor(k / 2), -1, 1, 1, D + 2, (x, y, z) => variar(TELHA[(z + y) % 3], x, y, z, 0.04))
        .caixa(W - k, 14 + Math.floor(k / 2), -1, 1, 1, D + 2, (x, y, z) => variar(TELHA[(z + y) % 3], x, y, z, 0.04));
    for (let k = 1; k < W / 2; k++) m.caixa(k, 13 + Math.floor(k / 2), D - 1, W - 2 * k, 1, 1, pedra);
    m.caixa(9, 20, D - 1, 4, 6, 1, pedra).caixa(10, 21, D - 1, 2, 3, 1, null).caixa(10, 22, D, 2, 2, 1, 0xc8a040); // sino
    // a cruz de São Damião sobre a porta: cruz pintada, com o Cristo de olhos abertos sobre fundo vermelho e negro
    const cx = 11;
    m.caixa(cx - 1, 9, D, 2, 5, 1, 0x1a1a1a).caixa(cx - 3, 11, D, 6, 1, 1, 0x1a1a1a);
    m.caixa(cx - 1, 10, D + 1, 2, 3, 1, 0xf0e8d8).caixa(cx - 2, 11, D + 1, 4, 1, 1, 0xf0e8d8);
    m.ponto(cx - 1, 13, D + 1, 0xb02020).ponto(cx, 13, D + 1, 0xb02020).ponto(cx - 1, 9, D + 1, 0xb02020);
    m.ponto(cx - 1, 14, D, 0xe0b440).ponto(cx, 14, D, 0xe0b440);
  }
  // altar simples lá dentro
  m.caixa(8, 0, 2, 6, 4, 3, pedraVelha);
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** Monte de pedras boas, junto à pedreira velha: de onde se tiram as pedras para São Damião. */
export function pilhaPedras() {
  const m = new Modelo();
  const rnd = aleatorio(31);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 7;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    const y = Math.max(0, Math.round((7 - r) * 0.6 - rnd()));
    m.caixa(x, y, z, 2, 1, 2, (xx, yy, zz) => variar(PEDRA_ROSA[(xx + zz) & 3], xx, yy, zz, 0.06));
  }
  return m.malha(0.25, [0.5, 0, 0.5]);
}

/** Uma pedra de construção, para levar no ombro. */
export function pedraDeCarregar() {
  const m = new Modelo().caixa(0, 0, 0, 5, 3, 4, (x, y, z) => variar(PEDRA_ROSA[(x + y) & 3], x, y, z, 0.07));
  const malha = m.malha(0.1, [2.5, 1.5, 2]);
  malha.castShadow = true;
  return malha;
}

/** Casebre de palha e pau do leproso, fora dos muros (os leprosos viviam longe das cidades). */
export function casebre() {
  const m = new Modelo();
  const pau = v(0x5e4a32, 0.08);
  const palha = (x: number, y: number, z: number) => variar((x + y) % 2 ? 0xc8a860 : 0xb89850, x, y, z, 0.08);
  for (const [x, z] of [[0, 0], [11, 0], [0, 9], [11, 9]]) m.caixa(x, 0, z, 1, 7, 1, pau);
  for (let k = 0; k < 6; k++) m.caixa(-1 + k, 7 + k, -1, 14 - k * 2, 1, 12, palha);
  m.caixa(0, 0, 0, 12, 6, 1, palha).caixa(0, 0, 0, 1, 6, 10, palha).caixa(11, 0, 0, 1, 6, 10, palha);
  m.caixa(1, 0, 3, 3, 1, 5, 0x8a7a5a); // a esteira
  m.caixa(8, 0, 10, 2, 2, 2, 0x6a5a48).ponto(8, 2, 10, 0xb08a4a); // a tigela de esmolas
  return m.malha(0.2, [6, 0, 5]);
}

/** A toca do lobo: rochas empilhadas com uma boca escura e ossos espalhados. */
export function tocaLobo() {
  const m = new Modelo();
  const rnd = aleatorio(91);
  const rocha = (x: number, y: number, z: number) => variar(y > 6 ? 0x9a9488 : 0x857e72, x, y, z, 0.07);
  for (let x = -12; x <= 12; x++)
    for (let z = -10; z <= 4; z++)
      for (let y = 0; y < 12; y++) {
        const e = (x * x) / 150 + ((z + 3) * (z + 3)) / 60 + (y * y) / 120 + (rnd() - 0.5) * 0.15;
        const boca = Math.abs(x) < 4 && z > -6 && y < 6;
        if (e < 1 && !boca) m.ponto(x, y, z, rocha(x, y, z));
      }
  m.caixa(-3, 0, -6, 7, 6, 1, 0x1a1612);
  for (const [x, z] of [[3, 7], [-5, 6], [6, 5], [0, 9]]) m.caixa(x, 0, z, 3, 1, 1, 0xe8e0d0).ponto(x - 1, 0, z, 0xe8e0d0); // ossos
  return m.malha(0.25, [0.5, 0, 0.5]);
}

/** Barraca de feira dos mercadores de ouro: toldo listrado e balcão cheio de joias e pratos finos. */
export function barraca(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const pau = v(0x6a4a2a, 0.05);
  const listra = [[0xb02030, 0xf0e0c0], [0x2a4a9a, 0xf0e0c0], [0x2a7a4a, 0xf0d080]][Math.floor(rnd() * 3)];
  for (const [x, z] of [[0, 0], [15, 0], [0, 9], [15, 9]]) m.caixa(x, 0, z, 1, 12, 1, pau);
  m.caixa(0, 0, 7, 16, 5, 3, pau);
  for (let x = 1; x < 15; x++) if (rnd() < 0.6) m.ponto(x, 5, 8, OURO[Math.floor(rnd() * 3)]);
  m.ponto(4, 6, 8, 0xc02838).ponto(10, 6, 8, 0x2a7ac0);
  for (let k = 0; k < 4; k++) m.caixa(-1, 12 + k, -1 + k * 3, 18, 1, 3, (x) => listra[(x >> 1) & 1]);
  return m.malha(0.2, [8, 0, 5]);
}

/** As iscas da Gula: coisas boas demais largadas pelas ruas. Brilham, mas pesam. */
export type TipoIsca = 'calice' | 'prato' | 'moedas' | 'taca' | 'coroa';

export function isca(tipo: TipoIsca) {
  const m = new Modelo();
  const ouro = (x: number, y: number, z: number) => variar(OURO[(x + y + z + 9) % 3], x, y, z, 0.03);
  if (tipo === 'calice') {
    m.caixa(-2, 0, -2, 5, 1, 5, ouro).caixa(0, 1, 0, 1, 4, 1, ouro);
    for (let y = 5; y < 9; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x * x + z * z <= 5 && (y === 5 || x * x + z * z >= 3)) m.ponto(x, y, z, ouro(x, y, z));
    m.ponto(0, 7, 3, 0xc02838);
  } else if (tipo === 'prato') {
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= 18) m.ponto(x, 0, z, ouro(x, 0, z));
    m.caixa(-2, 1, -2, 4, 2, 3, 0xb86a2a).caixa(-1, 3, -1, 2, 1, 2, 0xc87a3a).ponto(2, 1, -1, 0xe8e0d0); // o assado
    m.ponto(3, 1, 2, 0x6a2a7a).ponto(2, 1, 3, 0x7a3a8a).ponto(-3, 1, 2, 0xd8b040); // uvas e pão
  } else if (tipo === 'moedas') {
    for (let i = 0; i < 9; i++) m.caixa((i % 3) * 2 - 2, Math.floor(i / 4), Math.floor(i / 3) * 2 - 2, 2, 1, 2, ouro);
    m.caixa(-1, 2, -1, 2, 1, 2, ouro).ponto(0, 3, 0, 0xfff0a0);
  } else if (tipo === 'taca') {
    m.caixa(-1, 0, -1, 3, 1, 3, ouro).caixa(0, 1, 0, 1, 3, 1, ouro).caixa(-1, 4, -1, 3, 3, 3, ouro).caixa(0, 6, 0, 1, 1, 1, 0x6a0a2a);
    m.caixa(3, 0, 0, 2, 4, 2, 0x3a6a3a).ponto(3, 4, 0, 0x3a6a3a).ponto(4, 5, 0, 0xc89a30); // a garrafa
  } else {
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const r = Math.hypot(x, z); if (r > 2 && r < 3.6) m.caixa(x, 0, z, 1, 2, 1, ouro); }
    for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) m.ponto(x, 2, z, ouro(x, 2, z));
    m.ponto(0, 1, 3, 0xc02838).ponto(3, 1, 0, 0x2a7ac0);
  }
  const malha = m.malha(0.06, [0.5, 0, 0.5], new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a3a08 }));
  return malha;
}
