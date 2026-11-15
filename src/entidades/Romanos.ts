import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import type { Humano } from '../voxel/Humano';
import type { DefNpc } from './Npc';

const S = 0.085; // a escala de voxel do peregrino e dos santos
const P = 17; // a altura do pescoço, em voxels

const TUNICA = 0xa8262a, TUNICA_SOMBRA = 0x86181e, MANTO = 0x8e1a20;
const MALHA = 0x8a8c92, MALHA_ESCURA = 0x6e7076, BRONZE = 0xc49a4a, OURO = 0xd9b24a, PRATA = 0xc8ccd2;
const COURO = 0x6a4428, COURO_ESCURO = 0x4a2e1a, FERRO = 0x9a9ca2, ELMO = 0xb0a890;
const CRINA = 0xb8202a, MADEIRA = 0x7a5a36, VIDEIRA = 0x6a4a2a;
const PELE = 0xc89a74, SOMBRA_PELE = 0xa8785a, OLHO = 0x221610, CABELO = 0x3a2a1e, LABIO = 0x8a5a48;

const pano = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
/** A cota de malha: anéis miúdos, claro e escuro em xadrez. */
const cota = (x: number, y: number, z: number) => variar((x + y + z) % 2 ? MALHA : MALHA_ESCURA, x, y, z, 0.03);

export type Posto = 'centuriao' | 'soldado';

/**
 * O corpo, sem os braços: as sandálias de soldado (cáligas), a túnica vermelha, a saia de tiras de couro (ptérigas)
 * e a cota de malha (lorica hamata) com o cinturão. O centurião leva as grevas de prata, as condecorações (fáleras) no
 * peito, a espada do lado esquerdo e o manto vermelho nas costas; o soldado, a espada do lado direito.
 */
function corpoRomano(m: Modelo, posto: Posto) {
  const centuriao = posto === 'centuriao';
  // as pernas e as cáligas: a pele por entre as tiras
  for (const x0 of [-2, 1]) {
    m.caixa(x0, 0, 0, 2, 1, 3, COURO_ESCURO);
    m.caixa(x0, 1, 0, 2, 3, 2, (x, y, z) => (y % 2 ? variar(PELE, x, y, z, 0.03) : COURO));
    if (centuriao) m.caixa(x0, 1, 1, 2, 4, 1, pano(PRATA, 0.03)); // as grevas
    else m.caixa(x0, 4, 0, 2, 1, 2, variar(PELE, x0, 4, 0, 0.03));
  }
  m.caixa(-2, 5, -1, 5, 3, 3, pano(TUNICA, 0.04)); // a barra da túnica entre as pernas e a saia
  // a saia de tiras de couro com as pontas de metal
  for (let x = -3; x < 4; x++) m.caixa(x, 5, 2, 1, 3, 1, x % 2 ? COURO : COURO_ESCURO).ponto(x, 5, 2, BRONZE);
  m.caixa(-3, 6, -2, 7, 3, 4, pano(TUNICA_SOMBRA, 0.04));
  // a cota de malha, do quadril aos ombros, e o cinturão de placas de bronze
  m.caixa(-3, 8, -2, 7, P - 8, 5, cota);
  m.caixa(-4, P - 3, -2, 9, 3, 5, cota); // os ombros (as dobras de malha)
  m.caixa(-3, 9, 3, 7, 1, 1, BRONZE).caixa(-3, 9, -2, 7, 1, 1, BRONZE);
  m.caixa(-3, 9, -2, 1, 1, 5, BRONZE).caixa(3, 9, -2, 1, 1, 5, BRONZE);
  // a gola da túnica aparecendo no pescoço
  m.caixa(-1, P - 1, 2, 3, 1, 1, TUNICA);
  // a espada (gládio) na bainha, presa ao cinturão: do lado esquerdo (+x) para o centurião, do direito para o soldado
  const xs = centuriao ? 4 : -4;
  m.caixa(xs, 4, 0, 1, 6, 2, COURO_ESCURO).caixa(xs, 10, 0, 1, 2, 2, BRONZE).ponto(xs, 12, 1, MADEIRA);
  if (centuriao) {
    // as fáleras: as condecorações de ouro e de prata presas nas correias sobre o peito
    m.caixa(-2, 11, 3, 1, 5, 1, COURO).caixa(2, 11, 3, 1, 5, 1, COURO).caixa(-2, 15, 3, 5, 1, 1, COURO);
    for (const [x, y, c] of [[-2, 12, OURO], [2, 12, OURO], [0, 13, PRATA], [-2, 14, PRATA], [2, 14, PRATA], [0, 11, OURO]] as const) m.ponto(x, y, 4, c);
    // o manto vermelho caído nas costas, preso nos ombros
    m.caixa(-4, 3, -3, 9, P - 3, 1, pano(MANTO, 0.05));
    m.caixa(-4, P - 1, -3, 9, 1, 2, pano(MANTO, 0.05));
    m.ponto(-4, P - 1, 2, BRONZE).ponto(4, P - 1, 2, BRONZE);
  }
}

/**
 * A cabeça (6×6×6, rosto em z = 5): o rosto barbeado dos romanos, o cabelo curto aparecendo na nuca, e o elmo de
 * ferro com a proteção da nuca, as abas das faces e a pala. O centurião leva a crista de crina vermelha atravessada
 * de orelha a orelha (a crista transversa, para os homens o acharem no meio da batalha); o soldado, um botão no alto.
 */
function cabecaRomana(posto: Posto, semente: number) {
  const h = new Modelo();
  const idade = semente % 3;
  h.caixa(0, 0, 0, 6, 6, 6, (x, y, z) => variar(PELE, x, y, z, 0.025));
  h.ponto(1, 2, 5, OLHO).ponto(4, 2, 5, OLHO);
  h.ponto(1, 3, 5, CABELO).ponto(4, 3, 5, CABELO);
  h.caixa(2, 1, 6, 2, 1, 1, SOMBRA_PELE);
  h.caixa(2, 0, 5, 2, 1, 1, LABIO);
  if (idade === 2) h.ponto(0, 1, 5, SOMBRA_PELE).ponto(5, 1, 5, SOMBRA_PELE); // as rugas de quem já marchou muito
  for (let x = 0; x < 6; x++) h.ponto(x, 1, 0, CABELO).ponto(x, 2, 0, CABELO);
  // o elmo: a calota, a nuca larga e caída, a pala na testa e as abas das faces
  const ferro = (x: number, y: number, z: number) => variar(ELMO, x, y, z, 0.04);
  h.caixa(-1, 4, -1, 8, 3, 8, ferro);
  h.caixa(0, 7, 0, 6, 1, 6, ferro);
  h.caixa(-1, 1, -2, 8, 3, 1, ferro).caixa(-1, 0, -3, 8, 1, 1, ferro); // a proteção da nuca
  h.caixa(-1, 4, 6, 8, 1, 1, BRONZE); // a pala
  h.caixa(-1, 0, 2, 1, 4, 4, ferro).caixa(6, 0, 2, 1, 4, 4, ferro); // as abas das faces
  h.ponto(-1, 2, 5, BRONZE).ponto(6, 2, 5, BRONZE);
  if (posto === 'centuriao') {
    for (let x = -2; x <= 7; x++) {
      const alto = 3 - Math.round(Math.abs(x - 2.5) * 0.35);
      h.caixa(x, 8, 2, 1, alto, 2, (xx, y, z) => variar(CRINA, xx, y, z, 0.07));
    }
  } else h.caixa(2, 8, 2, 2, 1, 2, BRONZE);
  return h;
}

/**
 * Os braços. O centurião segura na mão direita (-x) a vara de videira, o sinal do posto (com ela comandava e
 * castigava); o soldado segura o pilo (a lança de arremesso) e leva no braço esquerdo o escudo grande, curvo e vermelho.
 */
function bracosRomanos(posto: Posto) {
  const pele = (x: number, y: number, z: number) => variar(PELE, x, y, z, 0.025);
  const bd = new Modelo();
  bd.caixa(-7, P - 4, -1, 2, 4, 3, cota); // o ombro, de malha
  bd.caixa(-7, P - 7, -1, 2, 3, 3, pano(TUNICA, 0.04)); // a manga curta da túnica
  bd.caixa(-7, P - 12, -1, 2, 5, 3, pele);
  const be = new Modelo();
  be.caixa(6, P - 4, -1, 2, 4, 3, cota);
  be.caixa(6, P - 7, -1, 2, 3, 3, pano(TUNICA, 0.04));
  be.caixa(6, P - 12, -1, 2, 5, 3, pele);
  if (posto === 'centuriao') {
    // a vara de videira, nodosa, segura de pé ao lado do corpo
    for (let y = P - 18; y < P - 3; y++) bd.ponto(-6 + (y % 5 === 0 ? -1 : 0), y, 2, variar(VIDEIRA, 0, y, 0, 0.08));
    bd.caixa(-7, P - 13, 2, 1, 1, 1, VIDEIRA);
  } else {
    // o pilo: a haste de madeira e a ponta comprida de ferro
    bd.caixa(-6, -2, 2, 1, P + 8, 1, MADEIRA);
    bd.caixa(-6, P + 6, 2, 1, 6, 1, FERRO);
    // o escudo no braço esquerdo, curvo, vermelho com as bordas e o umbo de bronze
    const sx = 9;
    for (let y = P - 18; y < P - 1; y++)
      for (let z = -4; z <= 5; z++) {
        const borda = y === P - 18 || y === P - 2 || z === -4 || z === 5;
        const curva = Math.abs(z - 0.5) > 3 ? -1 : 0;
        be.ponto(sx + curva, y, z, borda ? BRONZE : variar((y + z) % 7 === 0 ? OURO : TUNICA, sx, y, z, 0.04));
      }
    be.caixa(sx + 1, P - 11, 0, 1, 2, 2, BRONZE);
  }
  return { bd, be };
}

/** Um romano: o centurião (com a crista, a vara e o manto) ou um soldado da escolta (com o pilo e o escudo). */
export function montarRomano(posto: Posto, semente = 0): Humano {
  const c = new Modelo();
  corpoRomano(c, posto);
  const corpo = c.malha(S, [0.5, 0, 0.5]);
  const cabeca = new THREE.Group();
  cabeca.position.set(0, P * S, 0.4 * S);
  cabeca.add(cabecaRomana(posto, semente).malha(S, [3, 0, 3]));
  const { bd, be } = bracosRomanos(posto);
  const bracoD = new THREE.Group();
  bracoD.position.set(-6.5 * S, P * S, 0);
  bracoD.add(bd.malha(S, [-6, P, 0.5]));
  const bracoE = new THREE.Group();
  bracoE.position.set(6.5 * S, P * S, 0);
  bracoE.add(be.malha(S, [7, P, 0.5]));
  const raiz = new THREE.Group();
  raiz.add(corpo, cabeca, bracoD, bracoE);
  return { raiz, corpo, cabeca, alturaOlhos: (P + 2.5) * S, bracoD, bracoE, maoOcupada: posto === 'centuriao' ? 'd' : 'e' };
}

/** Júlio, centurião da coorte Augusta, que leva Paulo preso a Roma e o trata com humanidade (At 27,1.3.43). */
export const JULIO: DefNpc = {
  id: 'julio',
  falante: 'julio',
  no: 'creta_julio',
  rotulo: 'F: falar com o centurião Júlio',
  visual: () => montarRomano('centuriao', 1),
};

/** Um soldado da escolta dos presos (At 27,31.42). */
export function soldado(n: number): DefNpc {
  return { id: `soldado_${n}`, falante: 'soldado', no: 'creta_soldado', rotulo: 'F: falar com o soldado', visual: () => montarRomano('soldado', n + 2) };
}
