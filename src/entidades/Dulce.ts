import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { montarHumano, type Humano } from '../voxel/Humano';
import type { DefNpc } from './Npc';
import { deitado, nasCostas } from './Enfermos';

const S = 0.085; // mesma escala de voxel do peregrino
/** Altura do pescoço, em voxels. Dulce era muito pequena: três voxels abaixo do Humano comum (17). */
const PESCOCO = 14;

const BRANCO = 0xeceae6, GOLA = 0xfafaf8, MARINHO = 0x1c2a4c, MARINHO_SOMBRA = 0x152038;
const PELE = 0xe8c2a2, SOMBRA_PELE = 0xcc9e80, OLHO = 0x2a1c14, SOBRANCELHA = 0x6a4a36, LABIO = 0xc0786a, FACE = 0xe8a898;
const MADEIRA = 0x3e2616, MEDALHA = 0x2f8a5a, PRATA = 0xc8ccd4, SAPATO = 0x2a2420;
// o menino: pele morena, cabelo preto, a camisa gasta e o calção
const PELE_MENINO = 0x8a5a3a, CABELO_MENINO = 0x1a1410, CAMISA = 0xcfc6ae, CALCAO = 0x5a5040;

const pano = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

/**
 * O corpo de Irmã Dulce, a partir da imagem de referência: túnica branca até os pés, o escapulário azul-marinho
 * na frente e nas costas, a gola branca larga e arredondada sobre os ombros, a medalha de Nossa Senhora (verde e
 * prata) presa ao escapulário e os sapatos pretos. Sem os braços: eles são modelos próprios, ou a pose do colo.
 */
function corpoDulce(m: Modelo) {
  m.caixa(-2, 0, 0, 2, 1, 3, SAPATO).caixa(1, 0, 0, 2, 1, 3, SAPATO);
  m.caixa(-3, 1, -2, 7, PESCOCO - 1, 5, pano(BRANCO, 0.03));
  m.caixa(-4, 1, -3, 9, 4, 7, pano(BRANCO, 0.03)); // a barra mais larga embaixo
  for (const x of [-3, 3]) m.caixa(x, 1, 3, 1, 4, 1, pano(0xd8d6d2, 0.03)); // pregas da barra
  // o escapulário, do peito aos pés, na frente e nas costas
  m.caixa(-2, 1, 3, 5, PESCOCO - 3, 1, pano(MARINHO, 0.02));
  m.caixa(-2, 1, -3, 5, PESCOCO - 3, 1, pano(MARINHO, 0.02));
  m.caixa(-2, 1, 3, 1, PESCOCO - 3, 1, pano(MARINHO_SOMBRA, 0.03)).caixa(2, 1, 3, 1, PESCOCO - 3, 1, pano(MARINHO_SOMBRA, 0.03));
  // a gola branca larga, arredondada, cobrindo os ombros e caindo em meia-lua no peito
  const gola = pano(GOLA, 0.012);
  m.caixa(-5, PESCOCO - 1, -3, 11, 1, 7, gola).caixa(-4, PESCOCO - 2, -3, 9, 1, 7, gola);
  m.caixa(-3, PESCOCO - 3, 3, 7, 1, 1, gola).caixa(-1, PESCOCO - 4, 3, 3, 1, 1, gola);
  m.caixa(-3, PESCOCO - 3, -3, 7, 1, 1, gola);
  // a medalha: redonda, verde no meio, aro de prata, presa logo abaixo da gola
  const my = PESCOCO - 7;
  m.ponto(0, my, 4, MEDALHA).ponto(-1, my, 4, PRATA).ponto(1, my, 4, PRATA).ponto(0, my + 1, 4, PRATA).ponto(0, my - 1, 4, PRATA);
  m.ponto(0, my + 2, 4, MARINHO_SOMBRA); // a fitinha que a prende
}

/**
 * A cabeça (6×6×6, rosto em z = 5, como a do Humano): a touca branca emoldura o rosto e passa sob o queixo; o
 * véu azul-marinho cobre a touca por cima e por trás e cai até os ombros. Rosto de pele clara, olhos vivos, as
 * rugas finas nos cantos dos olhos e um sorriso pequeno e cansado.
 */
function cabecaDulce() {
  const h = new Modelo();
  const pele = (x: number, y: number, z: number) => variar(PELE, x, y, z, 0.025);
  h.caixa(0, 0, 0, 6, 6, 6, pele);
  // a touca branca: a faixa da testa, os lados do rosto e a volta sob o queixo
  // o véu: o alto, as costas e os lados, caindo até os ombros
  const veu = pano(MARINHO, 0.02);
  h.caixa(-1, 6, -1, 8, 1, 7, veu);
  h.caixa(-1, -3, -1, 8, 9, 1, veu).caixa(-1, -3, 0, 1, 9, 5, veu).caixa(6, -3, 0, 1, 9, 5, veu);
  h.caixa(-1, 6, 6, 8, 1, 1, pano(MARINHO_SOMBRA, 0.02)); // a borda do véu na testa
  // a touca branca: a faixa da testa e os lados do rosto, a moldura entre o rosto e o véu
  const touca = pano(GOLA, 0.012);
  h.caixa(0, 5, 5, 6, 1, 1, touca).caixa(-1, -1, 5, 1, 7, 1, touca).caixa(6, -1, 5, 1, 7, 1, touca);
  h.caixa(0, -1, 5, 6, 1, 1, touca); // a volta sob o queixo
  // rosto
  h.ponto(1, 2, 5, OLHO).ponto(4, 2, 5, OLHO);
  h.ponto(1, 3, 5, SOBRANCELHA).ponto(4, 3, 5, SOBRANCELHA);
  h.ponto(0, 2, 5, SOMBRA_PELE).ponto(5, 2, 5, SOMBRA_PELE); // as rugas nos cantos dos olhos
  h.caixa(2, 1, 6, 2, 1, 1, SOMBRA_PELE); // nariz
  h.ponto(0, 1, 5, FACE).ponto(5, 1, 5, FACE); // faces coradas
  h.caixa(2, 0, 5, 2, 1, 1, LABIO).ponto(1, 0, 5, SOMBRA_PELE).ponto(4, 0, 5, SOMBRA_PELE); // o sorriso pequeno
  return h;
}

/**
 * A pose do colo: os dois antebraços para a frente, na altura do peito, e o menino deitado neles, de lado, com a
 * cabeça no braço esquerdo dela (+x), os olhos fechados, as pernas caídas sobre o braço direito e um braço solto.
 */
function coloComMenino(m: Modelo) {
  const manga = pano(BRANCO, 0.03);
  const pele = (x: number, y: number, z: number) => variar(PELE, x, y, z, 0.025);
  const y = PESCOCO - 7; // os antebraços
  m.caixa(-5, y + 1, -1, 2, 6, 3, manga).caixa(4, y + 1, -1, 2, 6, 3, manga); // braços colados ao corpo
  m.caixa(-5, y, 1, 2, 2, 6, manga).caixa(4, y, 1, 2, 2, 6, manga); // antebraços para a frente
  m.caixa(-5, y, 7, 2, 2, 1, pele).caixa(4, y, 7, 2, 2, 1, pele); // as mãos, por baixo do menino
  // o menino, deitado sobre os antebraços
  const b = y + 2;
  const peleM = (x: number, yy: number, z: number) => variar(PELE_MENINO, x, yy, z, 0.03);
  m.caixa(-2, b, 4, 6, 3, 4, pano(CAMISA, 0.07)); // o tronco, na camisa gasta
  m.caixa(1, b + 1, 8, 2, 1, 1, pano(0xb8ae94, 0.04)); // um remendo
  m.caixa(-5, b, 4, 3, 3, 4, pano(CALCAO, 0.05)); // o calção
  m.caixa(-8, b, 5, 3, 2, 2, peleM); // as coxas, sobre o braço direito dela
  m.caixa(-9, b - 4, 5, 2, 5, 2, peleM); // as pernas caídas
  m.caixa(-9, b - 5, 5, 2, 1, 3, pano(0x6a4228, 0.04)); // os pés descalços
  m.caixa(4, b, 4, 4, 4, 4, peleM); // a cabeça, apoiada no braço esquerdo dela
  m.caixa(8, b, 4, 1, 4, 4, pano(CABELO_MENINO, 0.03)).caixa(7, b + 3, 4, 1, 1, 4, pano(CABELO_MENINO, 0.03));
  m.caixa(6, b + 1, 8, 1, 2, 1, 0x3a2418); // os olhos fechados
  m.ponto(4, b + 1, 8, 0x7a4a34); // a boca entreaberta, cansada
  m.caixa(2, b - 3, 8, 1, 4, 1, peleM); // o braço solto, caído
}

/** Os braços soltos (giram no ombro); a direita segura o crucifixo de madeira escura, pendente de um cordão. */
function bracos() {
  const manga = pano(BRANCO, 0.03);
  const pele = (x: number, y: number, z: number) => variar(PELE, x, y, z, 0.025);
  const bd = new Modelo().caixa(-5, PESCOCO - 6, -1, 2, 6, 3, manga).caixa(-5, PESCOCO - 7, -1, 2, 1, 3, pele);
  const be = new Modelo().caixa(4, PESCOCO - 6, -1, 2, 6, 3, manga).caixa(4, PESCOCO - 7, -1, 2, 1, 3, pele);
  const c = PESCOCO - 8;
  bd.ponto(-4, c, 1, 0x4a3a2a); // o cordão
  bd.caixa(-4, c - 4, 1, 1, 4, 1, MADEIRA).caixa(-5, c - 2, 1, 3, 1, 1, MADEIRA).ponto(-4, c - 2, 2, 0xd8c070); // a cruz e o Cristo
  return { bd, be };
}

/**
 * Santa Dulce dos Pobres (Irmã Dulce), arte por código a partir da imagem de referência. `comMenino`: a pose do
 * colo, carregando o menino doente (a primeira aparição); sem ele, os braços são articulados para os gestos.
 * Dentro da região ela não tem auréola: é só uma freira. A auréola vem na cena final.
 */
export function montarDulce(comMenino = false): Humano {
  const c = new Modelo();
  corpoDulce(c);
  if (comMenino) coloComMenino(c);
  const corpo = c.malha(S, [0.5, 0, 0.5]);
  const cabeca = new THREE.Group();
  cabeca.position.set(0, PESCOCO * S, 0.4 * S);
  cabeca.rotation.x = comMenino ? 0.22 : 0.08; // a postura um pouco curvada; no colo, olha para o menino
  cabeca.add(cabecaDulce().malha(S, [3, 0, 3]));
  const raiz = new THREE.Group();
  raiz.add(corpo, cabeca);
  const h: Humano = { raiz, corpo, cabeca, alturaOlhos: (PESCOCO + 2.5) * S };
  if (!comMenino) {
    const { bd, be } = bracos();
    const bracoD = new THREE.Group();
    bracoD.position.set(-4.5 * S, PESCOCO * S, 0);
    bracoD.add(bd.malha(S, [-4, PESCOCO, 0.5]));
    const bracoE = new THREE.Group();
    bracoE.position.set(4.5 * S, PESCOCO * S, 0);
    bracoE.add(be.malha(S, [5, PESCOCO, 0.5]));
    // em repouso, as mãos se juntam na frente, segurando o crucifixo
    bracoD.rotation.set(-0.42, 0, 0.2);
    bracoE.rotation.set(-0.42, 0, -0.2);
    raiz.add(bracoD, bracoE);
    Object.assign(h, { bracoD, bracoE, maoOcupada: 'd' as const });
  }
  return h;
}

/**
 * O menino doente (o mesmo do colo de Irmã Dulce): pele morena, cabelo preto, a camisa gasta e o calção.
 * `costas`: agarrado às costas de quem o carrega, os braços por cima dos ombros e a cabeça caída de lado;
 * `deitado`: de costas numa esteira, a cabeça para -z.
 */
export function menino(pose: 'costas' | 'deitado'): THREE.Object3D {
  const f = { genero: 'm', idade: 'crianca', pele: PELE_MENINO, penteado: 'curto', corCabelo: CABELO_MENINO, traje: 'trapos', cor: CAMISA, cor2: CALCAO } as const;
  const h = montarHumano(f);
  return pose === 'costas' ? nasCostas(h, f) : deitado(h, f);
}

/** Irmã Dulce, guia das Ruas da Bahia (aperfeiçoa o dom da Piedade). */
export const DULCE: DefNpc = {
  id: 'dulce',
  falante: 'dulce',
  no: 'dulce',
  rotulo: 'F: falar com Irmã Dulce',
  visual: () => montarDulce(false),
};

/** Irmã Dulce na primeira aparição, com o menino doente nos braços. */
export const DULCE_COM_MENINO: DefNpc = { ...DULCE, id: 'dulce_menino', visual: () => montarDulce(true) };
