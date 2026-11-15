import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import type { Humano } from '../voxel/Humano';
import type { DefNpc } from './Npc';

const S = 0.085; // a escala de voxel do peregrino e dos santos
const P = 17; // a altura do pescoço, em voxels

const OURO = 0xd9b24a, OURO_CLARO = 0xeccb6a, OLHO = 0x221610, SANDALIA = 0x6a4428;
const pano = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

/** O que a mão leva: o livro (o Evangelho, as cartas), o rolo, a pena, a espada. */
export type Atributo = 'livro' | 'rolo' | 'pena' | 'espada' | 'bolsa' | 'nada';

/** A ficha de um santo dos tempos apostólicos, de túnica e himácio (o manto grego), como nos ícones. */
export interface FichaApostolica {
  pele: number;
  sombraPele: number;
  cabelo: number;
  /** Calvo na frente (Paulo), cabelo cheio, ou cacheado. */
  penteado: 'cheio' | 'cacheado' | 'calvo_frente';
  barba: 'curta' | 'longa' | 'pontuda';
  corBarba: number;
  tunica: number;
  himacio: number;
  /** A faixa (clavo) da túnica, descendo do ombro. */
  clavo?: number;
  maoDireita: Atributo;
  maoEsquerda: Atributo;
  /** Fios grisalhos no cabelo e na barba (0 … 1). */
  grisalho?: number;
  /** Pés descalços em vez das sandálias (Paulo, como nos ícones). */
  descalco?: boolean;
  /** As rugas da testa alta. */
  rugas?: boolean;
  /** A corrente do preso no pulso direito (At 28,20). */
  corrente?: boolean;
}

/** Cor de fio de cabelo, com os grisalhos sorteados por posição. */
function fio(f: FichaApostolica) {
  return (x: number, y: number, z: number) => {
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return h - Math.floor(h) < (f.grisalho ?? 0) ? variar(0xb8b2a8, x, y, z, 0.04) : variar(f.corBarba, x, y, z, 0.05);
  };
}

/**
 * O corpo: as sandálias, a túnica comprida com o clavo e, por cima, o himácio, que passa pelo ombro esquerdo, cobre
 * as costas e cruza a frente do corpo na diagonal, como nos ícones.
 */
function corpo(m: Modelo, f: FichaApostolica) {
  if (f.descalco) {
    // os pés descalços, com os dedos marcados pela sombra
    m.caixa(-2, 0, 0, 2, 1, 3, (x, y, z) => variar(f.pele, x, y, z, 0.03)).caixa(1, 0, 0, 2, 1, 3, (x, y, z) => variar(f.pele, x, y, z, 0.03));
    m.ponto(-2, 0, 2, f.sombraPele).ponto(2, 0, 2, f.sombraPele);
  } else {
    m.caixa(-2, 0, 0, 2, 1, 3, SANDALIA).caixa(1, 0, 0, 2, 1, 3, SANDALIA);
    m.ponto(-1, 0, 2, f.pele).ponto(2, 0, 2, f.pele); // os dedos aparecendo na sandália
  }
  m.caixa(-3, 1, -2, 7, P - 1, 5, pano(f.tunica, 0.04));
  m.caixa(-3, 1, -2, 7, 1, 5, pano(f.tunica, 0.08)); // a barra
  if (f.clavo) m.caixa(-2, 2, 3, 1, P - 3, 1, f.clavo).caixa(2, 2, 3, 1, P - 3, 1, f.clavo);
  // o himácio: as costas, o lado esquerdo inteiro e a faixa que cruza o peito do ombro esquerdo ao quadril direito
  const h = pano(f.himacio, 0.05);
  m.caixa(-4, 3, -3, 9, P - 3, 1, h);
  m.caixa(4, 3, -3, 1, P - 3, 7, h);
  for (let y = 3; y < P; y++) {
    const x = Math.round(-3 + ((y - 3) / (P - 4)) * 7); // sobe do quadril direito (-x) ao ombro esquerdo (+x)
    m.caixa(Math.max(-4, x - 3), y, 3, 4, 1, 1, h);
  }
  m.caixa(1, P - 2, -3, 4, 2, 7, h); // o pano sobre o ombro esquerdo
  m.caixa(-4, 3, 3, 9, 2, 1, h); // a borda de baixo, na frente
}

/** A cabeça (6×6×6, rosto em z = 5) com o cabelo, a barba e a auréola. */
function cabeca(f: FichaApostolica) {
  const h = new Modelo();
  const fios = fio(f);
  h.caixa(0, 0, 0, 6, 6, 6, (x, y, z) => variar(f.pele, x, y, z, 0.025));
  // o rosto: os olhos escuros, as sobrancelhas, o nariz comprido dos ícones, a boca
  h.ponto(1, 2, 5, OLHO).ponto(4, 2, 5, OLHO);
  h.ponto(1, 3, 5, fios(1, 3, 5)).ponto(4, 3, 5, fios(4, 3, 5));
  h.caixa(2, 1, 6, 2, 2, 1, f.sombraPele);
  h.ponto(0, 2, 5, f.sombraPele).ponto(5, 2, 5, f.sombraPele);
  // o cabelo
  const nuca = (y0: number) => {
    for (let y = y0; y < 6; y++) {
      for (let x = 0; x < 6; x++) h.ponto(x, y, 0, fios(x, y, 0));
      for (let z = 0; z < 4; z++) h.ponto(0, y, z, fios(0, y, z)).ponto(5, y, z, fios(5, y, z));
    }
  };
  if (f.penteado === 'calvo_frente') {
    // a testa alta e calva, com o tufo no alto e o cabelo dos lados e da nuca (a imagem de Paulo)
    nuca(1);
    for (let x = 0; x < 6; x++) for (let z = 0; z < 3; z++) h.ponto(x, 6, z, fios(x, 6, z));
    h.ponto(2, 6, 3, fios(2, 6, 3)).ponto(3, 6, 3, fios(3, 6, 3));
    if (f.rugas) h.caixa(1, 5, 5, 4, 1, 1, f.sombraPele); // a ruga funda da testa calva
  } else {
    nuca(2);
    h.caixa(0, 6, 0, 6, 1, 6, fios);
    h.caixa(0, 5, 5, 6, 1, 1, fios); // a franja
    if (f.penteado === 'cacheado') for (const [x, y, z] of [[-1, 4, 2], [6, 4, 2], [-1, 5, 4], [6, 5, 4], [1, 7, 2], [4, 7, 3], [2, 7, 0]]) h.ponto(x, y, z, fios(x, y, z));
  }
  // a barba: as faces, o bigode e o queixo; comprida ou pontuda conforme o santo
  for (let y = 0; y < 2; y++) for (let z = 2; z < 6; z++) h.ponto(0, y, z, fios(0, y, z)).ponto(5, y, z, fios(5, y, z));
  for (let x = 0; x < 6; x++) h.ponto(x, 0, 5, fios(x, 0, 5));
  h.ponto(1, 1, 5, fios(1, 1, 5)).ponto(4, 1, 5, fios(4, 1, 5));
  h.caixa(2, 0, 5, 2, 1, 1, 0x7a4a3a); // a boca
  h.caixa(0, -1, 1, 6, 1, 5, fios).caixa(1, -1, 6, 4, 1, 1, fios);
  if (f.barba === 'longa') h.caixa(0, -3, 2, 6, 2, 4, fios).caixa(1, -5, 3, 4, 2, 3, fios).caixa(2, -6, 4, 2, 1, 2, fios);
  else if (f.barba === 'pontuda') h.caixa(1, -3, 3, 4, 2, 3, fios).caixa(2, -4, 4, 2, 1, 2, fios);
  else h.caixa(1, -2, 2, 4, 1, 4, fios);
  // a auréola
  for (let x = -4; x <= 9; x++)
    for (let y = -2; y <= 12; y++) {
      const r = Math.hypot(x - 2.5, y - 4.5);
      if (r > 4.6 && r < 6.2) h.ponto(x, y, -2, (x + y) % 2 ? OURO : OURO_CLARO);
    }
  return h;
}

/** Desenha o atributo na mão (a mão fica em x0, na altura P-8, à frente do corpo). */
function atributo(m: Modelo, a: Atributo, x0: number) {
  const y = P - 9;
  switch (a) {
    case 'livro': // o códice, de capa vermelha com cantoneiras de ouro, apoiado no braço
      m.caixa(x0 - 1, y - 1, 3, 4, 5, 2, 0x8a2a24).caixa(x0 - 1, y - 1, 3, 1, 1, 2, OURO).caixa(x0 + 2, y + 3, 3, 1, 1, 2, OURO);
      m.caixa(x0 - 1, y - 1, 5, 4, 5, 1, 0xeee6d0);
      break;
    case 'rolo': // o rolo de pergaminho
      m.caixa(x0, y - 2, 3, 1, 6, 1, 0xe6dcc0).ponto(x0, y - 3, 3, 0x8a6a42).ponto(x0, y + 4, 3, 0x8a6a42);
      break;
    case 'pena': // o cálamo de escrever
      m.caixa(x0, y, 4, 1, 4, 1, 0xe8e2d0).ponto(x0, y - 1, 4, 0x2a2018);
      break;
    case 'espada': // a espada do martírio, de ponta para baixo, segura pelo punho
      m.caixa(x0, -1, 3, 1, P - 9, 1, 0xc8ccd4).caixa(x0 - 1, P - 10, 3, 3, 1, 1, 0x8a6a42).caixa(x0, P - 9, 3, 1, 2, 1, 0x6a4428);
      break;
    case 'bolsa': // a bolsa de couro do médico, pendurada
      m.caixa(x0 - 1, y - 4, 2, 3, 3, 2, 0x7a5232).ponto(x0, y - 1, 3, 0x7a5232);
      break;
  }
}

function bracos(f: FichaApostolica) {
  const pele = (x: number, y: number, z: number) => variar(f.pele, x, y, z, 0.025);
  const bd = new Modelo();
  bd.caixa(-7, P - 6, -1, 2, 6, 3, pano(f.tunica, 0.04));
  bd.caixa(-7, P - 9, 0, 2, 3, 4, pano(f.tunica, 0.04)); // o antebraço, dobrado para a frente
  bd.caixa(-7, P - 9, 4, 2, 2, 1, pele);
  atributo(bd, f.maoDireita, -7);
  if (f.corrente) {
    // a algema de ferro no pulso e os elos caindo dela
    bd.caixa(-8, P - 8, 3, 4, 1, 2, 0x4a4c52);
    for (let k = 0; k < 6; k++) bd.ponto(-8 + (k % 2), P - 10 - k, 5, k % 2 ? 0x6a6c72 : 0x3a3c42);
  }
  const be = new Modelo();
  be.caixa(6, P - 6, -1, 2, 6, 3, pano(f.himacio, 0.05)); // o himácio cobre o braço esquerdo
  be.caixa(6, P - 9, 0, 2, 3, 4, pano(f.himacio, 0.05));
  be.caixa(6, P - 9, 4, 2, 2, 1, pele);
  atributo(be, f.maoEsquerda, 7);
  return { bd, be };
}

/** Monta um santo dos tempos apostólicos a partir da ficha. */
export function montarApostolico(f: FichaApostolica): Humano {
  const c = new Modelo();
  corpo(c, f);
  const malhaCorpo = c.malha(S, [0.5, 0, 0.5]);
  const grupoCabeca = new THREE.Group();
  grupoCabeca.position.set(0, P * S, 0.4 * S);
  grupoCabeca.add(cabeca(f).malha(S, [3, 0, 3]));
  const { bd, be } = bracos(f);
  const bracoD = new THREE.Group();
  bracoD.position.set(-6.5 * S, P * S, 0);
  bracoD.add(bd.malha(S, [-6, P, 0.5]));
  const bracoE = new THREE.Group();
  bracoE.position.set(6.5 * S, P * S, 0);
  bracoE.add(be.malha(S, [7, P, 0.5]));
  const raiz = new THREE.Group();
  raiz.add(malhaCorpo, grupoCabeca, bracoD, bracoE);
  const livreD = f.maoDireita === 'nada', livreE = f.maoEsquerda === 'nada';
  return { raiz, corpo: malhaCorpo, cabeca: grupoCabeca, alturaOlhos: (P + 2.5) * S, bracoD, bracoE, maoOcupada: livreD ? 'e' : livreE ? 'd' : 'e' };
}

/**
 * São Lucas, o médico amado (Cl 4,14), que escreveu o Evangelho e os Atos e estava no navio ("nós", At 27,1). Nos
 * ícones: jovem, de cabelo cacheado e barba curta castanha, túnica verde e himácio vermelho, com o livro e a pena.
 */
export const LUCAS: DefNpc = {
  id: 'lucas',
  falante: 'lucas',
  no: 'creta_lucas',
  rotulo: 'F: falar com São Lucas',
  visual: () =>
    montarApostolico({
      pele: 0xc8946a, sombraPele: 0xa6744e, cabelo: 0x4a3020, penteado: 'cacheado', barba: 'curta', corBarba: 0x4a3020,
      tunica: 0x3e6a4a, himacio: 0x9a2e2a, clavo: 0xc8a050, maoDireita: 'pena', maoEsquerda: 'livro',
    }),
};

/**
 * Santo Aristarco, macedônio de Tessalônica (At 27,2), que viajou com Paulo e foi seu "companheiro de prisão"
 * (Cl 4,10). Nos ícones: de barba grisalha, himácio azul-acinzentado sobre a túnica clara, com um rolo na mão.
 */
export const ARISTARCO: DefNpc = {
  id: 'aristarco',
  falante: 'aristarco',
  no: 'creta_aristarco',
  rotulo: 'F: falar com Santo Aristarco',
  visual: () =>
    montarApostolico({
      pele: 0xc89c76, sombraPele: 0xa67a56, cabelo: 0x5a4a3a, penteado: 'cheio', barba: 'longa', corBarba: 0x6a5a4a, grisalho: 0.45,
      tunica: 0xd8ccb0, himacio: 0x5a6a80, clavo: 0x8a2a24, maoDireita: 'nada', maoEsquerda: 'rolo',
    }),
};

/**
 * São Paulo Apóstolo, levado preso a Roma (At 27,1). Como na imagem de referência e nos ícones: calvo na frente, de
 * testa alta e barba comprida castanha, túnica clara e himácio vermelho-terra, descalço, com a espada (do martírio)
 * na mão direita e o livro (as cartas) na esquerda, e a auréola. Leva a corrente no pulso.
 */
export const PAULO: DefNpc = {
  id: 'paulo',
  falante: 'paulo',
  no: 'creta_paulo',
  rotulo: 'F: falar com São Paulo',
  visual: () =>
    montarApostolico({
      pele: 0xc89470, sombraPele: 0xa0704e, cabelo: 0x5a3420, penteado: 'calvo_frente', barba: 'longa', corBarba: 0x6a3c22, grisalho: 0.12,
      tunica: 0xe4dcc8, himacio: 0xa04a2a, clavo: 0x8a3a22, maoDireita: 'espada', maoEsquerda: 'livro',
      descalco: true, rugas: true, corrente: true,
    }),
};
