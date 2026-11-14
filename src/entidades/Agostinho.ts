import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import type { Humano } from '../voxel/Humano';
import type { DefNpc } from './Npc';

const S = 0.085; // mesma escala de voxel do peregrino
/** Altura do pescoço, em voxels (a mesma do Humano comum). */
const P = 17;

const PRETO = 0x1e1b20, CINTO = 0x3a2a1c, FIVELA = 0xb8a060, SAPATO = 0x2a2420;
const OURO_PANO = 0xc9a23a, OURO = 0xe2bc4e, GALAO = 0x8e1b2a, BORDADO = 0xe8cc6a;
const BRANCO = 0xf2eee2, RUBI = 0xb01828, ESMERALDA = 0x1e8a5a;
const PELE = 0xb07a52, SOMBRA_PELE = 0x8e5e3c, OLHO = 0x221610, SOBRANCELHA = 0x2e2018, LABIO = 0x6a4234;
const CORACAO = 0xc0182a, CORACAO_SOMBRA = 0x8e1020, CHAMA = 0xf08a24, CHAMA_CLARA = 0xffd84a;

const pano = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
/** O brocado do pluvial: ouro com um desenho miúdo em losango, um pouco mais claro. */
const brocado = (x: number, y: number, z: number) => variar((x + y + z) % 4 === 0 ? 0xdcb650 : OURO_PANO, x, y, z, 0.04);
/** O galão vermelho com o bordado de ouro, em pontos alternados. */
const galao = (x: number, y: number, z: number) => ((y + x) % 3 === 0 ? BORDADO : variar(GALAO, x, y, z, 0.04));
/** A barba e o cabelo: castanho-escuro com fios grisalhos. */
const grisalho = (x: number, y: number, z: number) => {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return h - Math.floor(h) < 0.35 ? variar(0x9a9088, x, y, z, 0.04) : variar(0x5a4232, x, y, z, 0.05);
};

/**
 * O corpo, sem os braços: o hábito preto dos agostinianos com o cinto de couro, e por cima o pluvial de bispo em
 * brocado de ouro, com os galões vermelhos ao longo da abertura, o capuz de enfeite nas costas, o fecho com a pedra
 * e a cruz peitoral.
 */
function corpoAgostinho(m: Modelo) {
  m.caixa(-2, 0, 0, 2, 1, 3, SAPATO).caixa(1, 0, 0, 2, 1, 3, SAPATO);
  m.caixa(-3, 1, -2, 7, P - 1, 5, pano(PRETO, 0.04));
  m.caixa(-4, 1, -3, 9, 3, 7, pano(PRETO, 0.04)); // a barra do hábito, mais larga
  m.caixa(-2, 8, 3, 5, 1, 1, CINTO).ponto(0, 8, 3, FIVELA); // o cinto de couro, na abertura do pluvial
  // o pluvial: costas, lados, as abas da frente e os ombros
  m.caixa(-5, 3, -3, 11, P - 3, 1, brocado);
  m.caixa(-5, 3, -3, 1, P - 3, 6, brocado).caixa(5, 3, -3, 1, P - 3, 6, brocado);
  m.caixa(-5, 3, 3, 3, P - 3, 1, brocado).caixa(3, 3, 3, 3, P - 3, 1, brocado);
  m.caixa(-5, P - 2, -3, 11, 2, 7, brocado);
  m.caixa(-3, 3, 3, 1, P - 3, 1, galao).caixa(3, 3, 3, 1, P - 3, 1, galao); // os galões da abertura
  m.caixa(-5, 3, -4, 11, 1, 8, galao); // a barra do pluvial
  // o capuz de enfeite nas costas: um escudo vermelho com a borda de ouro
  m.caixa(-3, 9, -4, 7, 5, 1, pano(GALAO, 0.04));
  m.caixa(-3, 13, -4, 7, 1, 1, BORDADO).caixa(-3, 9, -4, 1, 4, 1, BORDADO).caixa(3, 9, -4, 1, 4, 1, BORDADO);
  m.caixa(-2, 9, -4, 5, 1, 1, BORDADO);
  // o fecho do pluvial sobre o peito, com o rubi
  m.caixa(-2, P - 3, 4, 5, 2, 1, OURO).ponto(0, P - 3, 5, RUBI).ponto(0, P - 2, 5, RUBI);
  // a cruz peitoral, pendurada abaixo do fecho
  m.caixa(0, 10, 3, 1, 3, 1, OURO).caixa(-1, 11, 3, 3, 1, 1, OURO);
}

/**
 * A cabeça (6×6×6, rosto em z = 5, como a do Humano): pele morena de africano do norte (ele era de Tagaste, na
 * Numídia), olhos escuros e atentos, a barba cheia, castanha e já grisalha, e por cima a mitra branca com os galões
 * de ouro, as pedras e as duas ínfulas caídas nas costas. A auréola dourada fica atrás.
 */
function cabecaAgostinho() {
  const h = new Modelo();
  h.caixa(0, 0, 0, 6, 6, 6, (x, y, z) => variar(PELE, x, y, z, 0.025));
  // o cabelo curto, dos lados e atrás, por baixo da mitra
  for (let y = 1; y < 6; y++) {
    for (let z = 0; z < 4; z++) h.ponto(0, y, z, grisalho(0, y, z)).ponto(5, y, z, grisalho(5, y, z));
    for (let x = 0; x < 6; x++) h.ponto(x, y, 0, grisalho(x, y, 0));
  }
  // o rosto
  h.ponto(1, 2, 5, OLHO).ponto(4, 2, 5, OLHO);
  h.ponto(1, 3, 5, SOBRANCELHA).ponto(4, 3, 5, SOBRANCELHA);
  h.caixa(2, 1, 6, 2, 1, 1, SOMBRA_PELE); // o nariz
  h.ponto(0, 2, 5, SOMBRA_PELE).ponto(5, 2, 5, SOMBRA_PELE); // as olheiras de quem estudou e chorou muito
  // a barba cheia: as faces, o bigode, o queixo e a parte de baixo do rosto
  for (let y = 0; y < 2; y++) for (let z = 2; z < 6; z++) h.ponto(0, y, z, grisalho(0, y, z)).ponto(5, y, z, grisalho(5, y, z));
  for (let x = 0; x < 6; x++) h.ponto(x, 0, 5, grisalho(x, 0, 5));
  h.ponto(1, 1, 5, grisalho(1, 1, 5)).ponto(4, 1, 5, grisalho(4, 1, 5)); // o bigode
  h.caixa(2, 0, 5, 2, 1, 1, LABIO);
  h.caixa(0, -2, 1, 6, 2, 5, grisalho).caixa(1, -3, 2, 4, 1, 4, grisalho).caixa(1, -2, 6, 4, 1, 1, grisalho);
  // a mitra: a faixa de ouro na testa, o corpo branco que se estreita e as duas pontas, de frente e de costas
  h.caixa(0, 6, 0, 6, 1, 6, OURO);
  h.caixa(0, 7, 0, 6, 2, 6, pano(BRANCO, 0.02));
  h.caixa(1, 9, 0, 4, 1, 6, pano(BRANCO, 0.02));
  h.caixa(1, 10, 0, 4, 2, 2, pano(BRANCO, 0.02)).caixa(1, 10, 4, 4, 2, 2, pano(BRANCO, 0.02));
  h.caixa(2, 12, 0, 2, 1, 2, pano(BRANCO, 0.02)).caixa(2, 12, 4, 2, 1, 2, pano(BRANCO, 0.02));
  // o galão de ouro que sobe pelo meio da mitra, na frente e atrás, com as pedras
  for (const z of [0, 5]) h.caixa(2, 7, z, 2, 6, 1, OURO);
  h.ponto(2, 8, 5, RUBI).ponto(3, 10, 5, ESMERALDA).ponto(2, 12, 5, RUBI);
  // as ínfulas, as duas fitas caídas nas costas, com a franja de ouro
  h.caixa(1, 1, -1, 1, 6, 1, pano(BRANCO, 0.02)).caixa(4, 1, -1, 1, 6, 1, pano(BRANCO, 0.02));
  h.ponto(1, 1, -1, OURO).ponto(4, 1, -1, OURO).ponto(1, 4, -1, OURO).ponto(4, 4, -1, OURO);
  // a auréola, atrás da mitra
  for (let x = -4; x <= 9; x++)
    for (let y = -1; y <= 13; y++) {
      const r = Math.hypot(x - 2.5, y - 6);
      if (r > 4.6 && r < 6.2) h.ponto(x, y, -3, (x + y) % 2 ? OURO : 0xeccb6a);
    }
  return h;
}

/**
 * Os braços (giram no ombro). O direito (-x) segura diante do peito o coração em chamas trespassado por uma flecha,
 * o atributo dele ("feriste o meu coração com a tua palavra", Confissões IX, 2; X, 6); o esquerdo segura o báculo.
 */
function bracos() {
  const manga = pano(PRETO, 0.04);
  const pele = (x: number, y: number, z: number) => variar(PELE, x, y, z, 0.025);
  const bd = new Modelo();
  bd.caixa(-7, P - 6, -1, 2, 6, 3, brocado); // o pluvial sobre o braço
  bd.caixa(-7, P - 7, 0, 2, 2, 5, manga); // o antebraço, para a frente
  bd.caixa(-7, P - 7, 5, 2, 2, 1, pele); // a mão, de palma para cima
  // o coração, de pé sobre a mão
  const c0 = P - 5;
  const linhas: [number, number[]][] = [
    [0, [-6]], [1, [-7, -6, -5]], [2, [-8, -7, -6, -5, -4]], [3, [-8, -7, -6, -5, -4]], [4, [-8, -7, -5, -4]],
  ];
  for (const [dy, xs] of linhas)
    for (const x of xs) for (const z of [5, 6]) bd.ponto(x, c0 + dy, z, dy < 2 && z === 5 ? CORACAO_SOMBRA : CORACAO);
  // as chamas que saem do alto do coração
  bd.ponto(-7, c0 + 5, 5, CHAMA).ponto(-6, c0 + 5, 5, CHAMA_CLARA).ponto(-5, c0 + 5, 5, CHAMA).ponto(-6, c0 + 6, 5, CHAMA_CLARA);
  bd.ponto(-6, c0 + 5, 6, CHAMA).ponto(-6, c0 + 7, 5, CHAMA);
  // a flecha atravessada, de baixo para cima, com a ponta de prata e as penas brancas
  for (let x = -10; x <= -2; x++) bd.ponto(x, c0 + 1 + Math.round(((x + 10) * 3) / 8), 7, x === -2 ? 0xc8ccd4 : x <= -9 ? 0xf2f0e8 : 0xd9c27a);

  const be = new Modelo();
  be.caixa(6, P - 6, -1, 2, 6, 3, brocado);
  be.caixa(6, P - 8, 0, 2, 2, 3, manga);
  be.caixa(6, P - 8, 3, 2, 2, 1, pele);
  // o báculo de ouro: a haste até o chão, o nó e a volta no alto, aberta para fora
  be.caixa(7, 0, 4, 1, P + 11, 1, OURO);
  be.caixa(6, P + 3, 3, 3, 2, 3, OURO);
  for (const [x, y] of [[7, P + 11], [7, P + 12], [8, P + 13], [9, P + 13], [10, P + 12], [10, P + 11], [9, P + 10]]) be.ponto(x, y, 4, OURO);
  be.ponto(8, P + 11, 4, RUBI);
  return { bd, be };
}

/** Santo Agostinho, bispo de Hipona e doutor da Igreja, como nas imagens tradicionais. */
export function montarAgostinho(): Humano {
  const c = new Modelo();
  corpoAgostinho(c);
  const corpo = c.malha(S, [0.5, 0, 0.5]);
  const cabeca = new THREE.Group();
  cabeca.position.set(0, P * S, 0.4 * S);
  cabeca.add(cabecaAgostinho().malha(S, [3, 0, 3]));
  const { bd, be } = bracos();
  const bracoD = new THREE.Group();
  bracoD.position.set(-6.5 * S, P * S, 0);
  bracoD.add(bd.malha(S, [-6, P, 0.5]));
  const bracoE = new THREE.Group();
  bracoE.position.set(6.5 * S, P * S, 0);
  bracoE.add(be.malha(S, [7, P, 0.5]));
  const raiz = new THREE.Group();
  raiz.add(corpo, cabeca, bracoD, bracoE);
  // o báculo ocupa a mão esquerda: os gestos usam a direita, a do coração
  return { raiz, corpo, cabeca, alturaOlhos: (P + 2.5) * S, bracoD, bracoE, maoOcupada: 'e' };
}

/** Santo Agostinho, guia do Vale do Esquecimento: a conversão e o Temor de Deus. */
export const AGOSTINHO: DefNpc = {
  id: 'agostinho',
  falante: 'agostinho',
  no: 'agostinho',
  rotulo: 'F: falar com Santo Agostinho',
  visual: () => montarAgostinho(),
};
