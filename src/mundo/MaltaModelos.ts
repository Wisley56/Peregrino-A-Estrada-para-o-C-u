import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * Malta no século I (arte por código): os feixes de gravetos e a fogueira da praia (At 28,2-3), a víbora (28,3), a
 * casa de campo de Públio, com o pátio, o pórtico, a prensa de azeite e a cisterna (28,7), o leito do pai dele
 * (28,8), o poço do povoado e a insígnia dos Dióscuros, pintada na proa do navio que passou o inverno na ilha (28,11).
 *
 * Origem de cada modelo no chão, no centro da base (m). A frente fica em +z.
 */

export const V = 0.25;

const COR = {
  calcario: 0xd8c290,
  calcarioEscuro: 0xbca878,
  reboco: 0xe6dcc0,
  rebocoSujo: 0xd2c6a6,
  telha: 0xa8583a,
  telhaEscura: 0x8a4630,
  madeira: 0x6a4a30,
  madeiraClara: 0x8a6a46,
  graveto: 0x6a5640,
  gravetoClaro: 0x8a7458,
  cinza: 0x4a4440,
  carvao: 0x2a2420,
  linho: 0xd8ccb0,
  la: 0x8a5a4a,
  porta: 0x5a3a24,
  coluna: 0xeae2cc,
};

const pedra = (base: number) => (x: number, y: number, z: number) => {
  const junta = ((x + z + (y % 2) * 2) % 4 + 4) % 4 === 0 || y % 3 === 0;
  return variar(junta ? COR.calcarioEscuro : base, x, y, z, 0.05);
};

/** Um feixe de gravetos secos da garriga, amarrado com uma tira de junco (1 m, deitado ao longo de x). */
export function feixeDeGravetos(semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente * 19 + 4);
  for (let k = 0; k < 14; k++) {
    const y = Math.floor(r() * 3), z = Math.floor(r() * 3) - 1;
    const x0 = -4 - Math.floor(r() * 3), x1 = 4 + Math.floor(r() * 3);
    for (let x = x0; x <= x1; x++) m.ponto(x, y + (x === x1 && r() < 0.5 ? 1 : 0), z, variar(r() < 0.5 ? COR.graveto : COR.gravetoClaro, x, y, z, 0.08));
  }
  for (const x of [-2, 2]) for (let y = 0; y < 3; y++) m.ponto(x, y, -2, 0x9a8a50).ponto(x, y, 2, 0x9a8a50);
  return m.malha(0.125, [0, 0, 0]);
}

/** A fogueira da praia: o círculo de pedras, a cinza e os troncos meio queimados (a chama é desenhada à parte). */
export function fogueiraDePraia() {
  const m = new Modelo();
  for (let a = 0; a < 18; a++) {
    const t = (a / 18) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 6), z = Math.round(Math.sin(t) * 6);
    m.caixa(x - 1, 0, z - 1, 2, 2, 2, pedra(a % 3 ? COR.calcario : COR.calcarioEscuro));
  }
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (x * x + z * z < 22) m.ponto(x, 0, z, variar((x + z) % 3 ? COR.cinza : COR.carvao, x, 0, z, 0.08));
  // os troncos em cone, as pontas pretas
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    for (let k = 0; k < 5; k++) m.ponto(dx * (4 - k), 1 + Math.floor(k / 2), dz * (4 - k), k > 2 ? COR.carvao : COR.madeira);
  }
  return m.malha(V * 0.5, [0, 0, 0]);
}

/**
 * A víbora que saiu do calor e se prendeu à mão de Paulo (At 28,3): corpo grosso e curto, cabeça triangular, o
 * desenho em zigue-zague no dorso. Comprida ao longo de z, com a cabeça em +z.
 */
export function vibora() {
  const m = new Modelo();
  const comp = 22;
  for (let z = 0; z < comp; z++) {
    const x = Math.round(Math.sin(z * 0.45) * 2);
    const grosso = z < 3 ? 1 : z > comp - 4 ? 2 : 2;
    for (let dx = 0; dx < grosso; dx++)
      for (let y = 0; y < 2; y++) {
        const zigue = ((z + (dx ? 1 : 0)) % 4 < 2) === (y === 1);
        m.ponto(x + dx, y, z, y === 1 && zigue ? 0x2a2420 : variar(0x8a7a5a, x, y, z, 0.06));
      }
  }
  // a cabeça larga, os olhos e a língua
  const hx = Math.round(Math.sin(comp * 0.45) * 2);
  m.caixa(hx - 1, 0, comp, 4, 2, 3, (x, y, z) => variar(0x6a5a44, x, y, z, 0.05));
  m.ponto(hx - 1, 1, comp + 2, 0xd8b030).ponto(hx + 2, 1, comp + 2, 0xd8b030);
  m.ponto(hx, 0, comp + 3, 0xa02a2a).ponto(hx + 1, 0, comp + 3, 0xa02a2a);
  return m.malha(0.03, [0.5, 0, comp / 2]);
}

/** O leito de madeira com o colchão de lã, o travesseiro e o cobertor (onde o pai de Públio está de cama). */
export function leito() {
  const m = new Modelo();
  m.caixa(-4, 0, -8, 9, 2, 17, COR.madeira);
  for (const [x, z] of [[-4, -8], [4, -8], [-4, 8], [4, 8]]) m.caixa(x, 0, z, 1, 4, 1, COR.madeiraClara);
  m.caixa(-4, 2, -8, 9, 1, 17, (x, y, z) => variar(COR.linho, x, y, z, 0.04));
  m.caixa(-3, 3, 5, 7, 1, 3, 0xece4d0); // o travesseiro, na cabeceira (+z)
  m.caixa(-4, 3, -8, 9, 1, 11, (x, y, z) => variar((x + z) % 4 === 0 ? 0x6a3a2a : COR.la, x, y, z, 0.05));
  m.caixa(-5, 0, 8, 11, 6, 1, COR.madeira); // a cabeceira
  return m.malha(V * 0.5, [0, 0, 0]);
}

/** O poço do povoado: o bocal redondo de pedra, as duas forquilhas, a trave e o balde. */
export function poco() {
  const m = new Modelo();
  for (let x = -4; x <= 4; x++)
    for (let z = -4; z <= 4; z++) {
      const d = Math.hypot(x, z);
      if (d <= 4.4 && d > 2.6) m.caixa(x, 0, z, 1, 3, 1, pedra(COR.calcario));
      else if (d <= 2.6) m.ponto(x, 0, z, 0x1a2a30);
    }
  m.caixa(-5, 0, 0, 1, 9, 1, COR.madeira).caixa(5, 0, 0, 1, 9, 1, COR.madeira).caixa(-5, 9, 0, 11, 1, 1, COR.madeira);
  m.caixa(0, 5, 0, 1, 4, 1, 0x8a7a5a).caixa(-1, 3, -1, 3, 2, 3, COR.madeiraClara);
  return m.malha(V, [0, 0, 0]);
}

/** A prensa de azeite da casa de campo: a bacia de pedra redonda e a mó em pé, com o eixo de madeira. */
export function prensaDeAzeite() {
  const m = new Modelo();
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 6; z++) {
      const d = Math.hypot(x, z);
      if (d <= 6.2) m.caixa(x, 0, z, 1, d > 4.6 ? 4 : 2, 1, pedra(COR.calcarioEscuro));
    }
  m.caixa(-1, 2, -1, 2, 6, 2, COR.madeira);
  for (let y = 0; y < 8; y++) for (let z = -4; z <= 4; z++) if (Math.hypot(y - 4, z) <= 4.2) m.caixa(1, y + 2, z, 2, 1, 1, pedra(COR.calcario));
  m.caixa(-8, 6, 0, 16, 1, 1, COR.madeiraClara);
  return m.malha(V * 0.5, [0, 0, 0]);
}

/** Uma esteira de palha no chão (onde se deita um enfermo). */
export function esteira() {
  const m = new Modelo();
  m.caixa(-3, 0, -7, 7, 1, 14, (x, _y, z) => variar((x + z) % 2 ? 0xc4a868 : 0xb09456, x, 0, z, 0.05));
  return m.malha(V * 0.5, [0, 0, 0]);
}

/** As medidas da casa de campo (m): o retângulo de fora e o pátio no meio. A porta fica no meio da frente (+z). */
export const VILLA = {
  largura: 26,
  fundo: 22,
  /** O pátio aberto (local): x de -x0 a x0, z de z0 a z1. */
  patio: { x0: -8, x1: 8, z0: -5, z1: 7 },
  /** O pórtico de colunas, no fundo do pátio (a sombra onde está o leito do pai). */
  portico: { z0: -5, z1: -2.5 },
  /** A largura da passagem da porta. */
  porta: 3,
  /** Altura das paredes (m) e da cumeeira (m). */
  parede: 3.5,
  cumeeira: 5,
};

/**
 * A casa de campo de Públio, o principal da ilha (At 28,7): as alas de quartos em volta de um pátio aberto, as paredes
 * rebocadas e os telhados de telha caindo para o pátio, o pórtico de colunas no fundo, a porta grande na frente, a
 * cisterna no meio do pátio e a prensa de azeite num canto (o azeite era a riqueza das terras do campo de Malta).
 */
export function villaDePublio() {
  const m = new Modelo();
  const W = Math.round(VILLA.largura / V), D = Math.round(VILLA.fundo / V);
  const x0 = -W / 2, z0 = -D / 2;
  const P = VILLA.patio;
  const px0 = Math.round(P.x0 / V), px1 = Math.round(P.x1 / V), pz0 = Math.round(P.z0 / V), pz1 = Math.round(P.z1 / V);
  const h = Math.round(VILLA.parede / V), cume = Math.round(VILLA.cumeeira / V);
  const reboco = (x: number, y: number, z: number) => variar(y < 2 ? COR.calcarioEscuro : (x * 5 + y * 3 + z * 7) % 29 === 0 ? COR.rebocoSujo : COR.reboco, x, y, z, 0.025);
  // o bloco das alas inteiro, e o pátio cavado no meio
  m.caixa(x0, 0, z0, W, h, D, reboco);
  m.caixa(px0, 0, pz0, px1 - px0, h + 1, pz1 - pz0, null);
  // a passagem da porta, da frente até o pátio, com o batente de pedra
  const meia = Math.round(VILLA.porta / 2 / V);
  m.caixa(-meia, 0, pz1, meia * 2, h - 3, z0 + D - pz1, null);
  m.caixa(-meia - 1, h - 3, z0 + D - 1, meia * 2 + 2, 1, 1, pedra(COR.calcarioEscuro));
  for (const x of [-meia - 1, meia]) m.caixa(x, 0, z0 + D - 1, 1, h - 3, 1, pedra(COR.calcarioEscuro));
  // as portas dos quartos, abertas para o pátio (escuras), e as janelinhas de fora
  for (let x = px0 + 4; x < px1 - 4; x += 12) {
    m.caixa(x, 0, pz0 - 1, 4, 9, 1, (xx, y, z) => variar(COR.porta, xx, y, z, 0.04));
  }
  for (let z = pz0 + 4; z < pz1 - 4; z += 14) {
    m.caixa(px0 - 1, 0, z, 1, 9, 4, (x, y, zz) => variar(COR.porta, x, y, zz, 0.04));
    m.caixa(px1, 0, z, 1, 9, 4, (x, y, zz) => variar(COR.porta, x, y, zz, 0.04));
  }
  for (let x = x0 + 6; x < x0 + W - 6; x += 14) {
    if (Math.abs(x) < meia + 4) continue;
    m.caixa(x, 7, z0 + D - 1, 2, 3, 1, 0x2a2018).caixa(x, 7, z0, 2, 3, 1, 0x2a2018);
  }
  // os telhados: de cada ala, caindo da cumeeira de fora para o pátio
  const telha = (x: number, y: number, z: number) => variar((x + y) % 2 ? COR.telha : COR.telhaEscura, x, y, z, 0.05);
  for (let x = x0 - 1; x < x0 + W + 1; x++)
    for (let z = z0 - 1; z < z0 + D + 1; z++) {
      const dentroPatio = x >= px0 && x < px1 && z >= pz0 && z < pz1;
      if (dentroPatio) continue;
      // a distância até a borda do pátio (em voxels), para a queda do telhado
      const dx = x < px0 ? px0 - x : x >= px1 ? x - px1 + 1 : 0;
      const dz = z < pz0 ? pz0 - z : z >= pz1 ? z - pz1 + 1 : 0;
      const d = Math.max(dx, dz);
      const fora = Math.min(x - (x0 - 1), x0 + W - x, z - (z0 - 1), z0 + D - z);
      const y = h + Math.min(cume - h, Math.round(Math.min(d, fora * 2) * 0.35));
      m.ponto(x, y, z, telha(x, y, z));
    }
  // o pórtico do fundo: o piso de lajes, as colunas e o telhado de telha sobre elas
  const qz0 = Math.round(VILLA.portico.z0 / V), qz1 = Math.round(VILLA.portico.z1 / V);
  m.caixa(px0, 0, qz0, px1 - px0, 1, qz1 - qz0, (x, y, z) => variar((x + z) % 2 ? 0xcfc2a2 : 0xbfb292, x, y, z, 0.04));
  for (let x = px0 + 1; x < px1; x += 10) m.caixa(x, 1, qz1 - 2, 2, h - 1, 2, (xx, y, z) => variar(y === h - 1 || y === 1 ? COR.calcario : COR.coluna, xx, y, z, 0.03));
  m.caixa(px0, h, qz0, px1 - px0, 1, qz1 - qz0 + 1, COR.madeira);
  for (let z = qz0; z <= qz1; z++) m.caixa(px0, h + 1 + Math.floor((qz1 - z) / 4), z, px1 - px0, 1, 1, telha(0, h, z));
  // a cisterna no meio do pátio (o bocal redondo) e a prensa num canto ficam como peças à parte
  return m.malha(V, [0, 0, 0]);
}

/**
 * A insígnia dos Dióscuros (At 28,11): os gêmeos Castor e Pólux, os protetores dos marinheiros, pintados lado a lado
 * numa tábua, cada um com o gorro e a estrela por cima. Uma tábua plana, a pintura em +z.
 */
export function insigniaDosDioscuros() {
  const m = new Modelo();
  m.caixa(-7, 0, 0, 14, 10, 1, (x, y, z) => variar(0x2a4a6a, x, y, z, 0.04));
  m.caixa(-7, 0, 1, 14, 1, 1, 0xc8a050).caixa(-7, 9, 1, 14, 1, 1, 0xc8a050);
  for (const cx of [-4, 3]) {
    m.caixa(cx, 1, 1, 2, 4, 1, 0xe8dcc0); // a túnica
    m.caixa(cx, 5, 1, 2, 2, 1, 0xd8a878); // a cabeça
    m.caixa(cx, 7, 1, 2, 1, 1, 0xc8a050); // o gorro
    m.ponto(cx, 8, 1, 0xfff0a0).ponto(cx + 1, 8, 1, 0xfff0a0); // a estrela
    m.ponto(cx + (cx < 0 ? 2 : -1), 3, 1, 0xa0a8b0); // a lança
  }
  return m.malha(0.1, [0, 0, 0]);
}

/** A chama da fogueira: blocos que tremem (MeshBasic aditivo: lê-se pela luz, mesmo no mundo ainda cinza). */
export function chamaDeFogueira() {
  const g = new THREE.Group();
  const cores = [0xff7a20, 0xffa040, 0xffd070, 0xfff0b0];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cores[i % 4], transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
    const t = 0.12 + (i % 3) * 0.06;
    const b = new THREE.Mesh(new THREE.BoxGeometry(t, t * 2.2, t), mat);
    const a = (i / 9) * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.18 * (i % 2 ? 1 : 0.4), 0.25 + (i % 4) * 0.12, Math.sin(a) * 0.18 * (i % 2 ? 1 : 0.4));
    b.userData.fase = i * 1.37;
    g.add(b);
  }
  return g;
}
