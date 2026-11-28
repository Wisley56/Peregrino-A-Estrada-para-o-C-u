import * as THREE from 'three';
import type { IdArea } from '../Area';

/**
 * A geografia do mundo: onde fica cada região no mapa único. Antes cada área vivia num canto qualquer, longe das
 * outras; agora as regiões ao ar livre têm lugar certo umas em relação às outras, com terra (ou mar) entre elas.
 *
 * Eixos: +x é o leste, +z é o sul. Distâncias em metros. A disposição é simbólica, mas respeita o que as regiões já
 * dizem de si: sai-se do Vale pelo oeste para o Deserto; a estrada velha do Deserto desce para o sul; a Cidade
 * Dourada abre a porta para o sul, de onde sai a estrada do mar; a Bahia olha para o oeste, para a baía (como
 * Salvador); Creta e Malta têm as montanhas ao norte e o porto ao sul; o naufrágio foi na enseada ao lado da
 * praia de Malta.
 *
 *                     N
 *      Deserto ───────────── Vale
 *         │
 *         └─── Cidade Dourada
 *                    │   (a baía)
 *                    └──────────── Bahia
 *
 *            Creta
 *                              Naufrágio · Malta
 *
 * Os interiores e as cenas à parte (cripta, poço, palácio, o navio na tempestade) não têm lugar no mapa: ficam
 * numa faixa distante, ao norte, e entra-se neles por uma porta.
 */

/** O nível do mar, um só para o mundo todo (m). */
export const NIVEL_MAR = 2;

/** As áreas que têm origem própria (o Vale fica na origem do mundo). */
export type IdOrigem = 'cripta' | 'deserto' | 'meiodia' | 'cidade' | 'palacio' | 'bahiabaixa' | 'bahiaalta' | 'creta' | 'navio' | 'naufragio' | 'malta';

const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);

/** A faixa dos interiores, longe de tudo. */
const Z_INTERIORES = -9000;

/**
 * A Cidade Alta fica a leste da Baixa, em cima da escarpa: a origem dela é tal que o Elevador Lacerda de cima
 * (ELEVADOR_ALTA, em Bahia.ts) cai sobre o de baixo (ELEVADOR_BAIXA).
 */
const BAHIA_BAIXA = v(500, 2300);
const ELEVADOR_BAIXA = { x: 56, z: 26 };
const ELEVADOR_ALTA = { x: -52, z: 26 };

export const ORIGENS: Record<IdOrigem, THREE.Vector3> = {
  deserto: v(-1300, 0),
  cidade: v(-900, 1200),
  bahiabaixa: BAHIA_BAIXA,
  bahiaalta: v(BAHIA_BAIXA.x + ELEVADOR_BAIXA.x - ELEVADOR_ALTA.x, BAHIA_BAIXA.z + ELEVADOR_BAIXA.z - ELEVADOR_ALTA.z),
  creta: v(-400, 4000),
  malta: v(1600, 4600),
  // a enseada do naufrágio, a oeste de Malta: a praia dela na mesma linha da praia de Malta, um estreito de 24 m
  // entre o promontório leste da enseada e a ponta oeste da ilha
  naufragio: v(1316, 4696),
  cripta: v(0, Z_INTERIORES),
  meiodia: v(-1000, Z_INTERIORES),
  palacio: v(1000, Z_INTERIORES),
  navio: v(2000, Z_INTERIORES),
};

/**
 * Onde as áreas ficavam antes do mapa único (saves da versão 1): [x, z, nível do chão]. O mar ficava no nível 8
 * em Creta, no naufrágio e em Malta; agora é o `NIVEL_MAR` de todo o mundo, e essas terras desceram junto.
 */
export const ORIGENS_V1: Record<IdOrigem, [number, number, number]> = {
  cripta: [400, 400, 0],
  deserto: [-500, 0, 0],
  meiodia: [-500, -400, 0],
  cidade: [500, 0, 0],
  palacio: [500, -330, 0],
  bahiabaixa: [0, 700, 0],
  bahiaalta: [0, 1000, 0],
  creta: [1600, 0, 8],
  navio: [2400, 0, 8],
  naufragio: [3200, 0, 8],
  malta: [4000, 0, 8],
};

/** O nível do mar de cada área hoje (para deslocar a altura de um ponto salvo na versão 1). */
const NIVEL_HOJE: Partial<Record<IdOrigem, number>> = { creta: NIVEL_MAR, naufragio: NIVEL_MAR, malta: NIVEL_MAR, navio: 8 };

/** Traz um ponto salvo na versão 1 (quando as áreas ficavam em outro lugar) para o mapa único. */
export function pontoDaV1(area: string, p: [number, number, number]): [number, number, number] {
  const antes = ORIGENS_V1[area as IdOrigem], agora = ORIGENS[area as IdOrigem];
  if (!antes || !agora) return p;
  const dy = (NIVEL_HOJE[area as IdOrigem] ?? 0) - antes[2];
  return [p[0] - antes[0] + agora.x, p[1] + dy, p[2] - antes[1] + agora.z];
}

/** O que marca um ponto de viagem no chão: uma capela, um cruzeiro, um cais ou um lugar conhecido da região. */
export type TipoPontoDeViagem = 'capela' | 'cruzeiro' | 'cais' | 'lugar';

/**
 * Um lugar para onde a viagem rápida leva. Descobre-se chegando perto dele (a pé, a nado ou de barco); o lugar exato
 * no chão vem da própria região (`Jogo.lugarDoPonto`). O ponto `principal` de uma região é o que se dá como
 * descoberto a quem já tinha passado por ela antes de os pontos existirem (saves antigos).
 */
/**
 * Onde se chega ao viajar para o ponto: perto de um marco da área (uma posição que a área expõe com esse nome, ou
 * `capela` = diante da porta da capela da região), afastado `desvio` [x, z] m, olhando para `rumo`.
 */
export interface LugarDoPonto {
  marco: 'capela' | 'cruzeiro' | 'poco' | 'estradaDoMar' | 'saveiro' | 'chegada' | 'cais';
  desvio?: readonly [number, number];
  rumo: 'norte' | 'sul' | 'leste' | 'oeste';
}

export interface DefPontoDeViagem {
  id: string;
  nome: string;
  area: IdArea;
  tipo: TipoPontoDeViagem;
  principal?: boolean;
  /** Onde se chega. Os pontos à beira das estradas do ermo não têm: a chegada vem da própria beira. */
  lugar?: LugarDoPonto;
}

export const PONTOS_DE_VIAGEM: readonly DefPontoDeViagem[] = [
  { id: 'vale_cruzeiro', nome: 'O cruzeiro do Vale', area: 'vale', tipo: 'cruzeiro', principal: true, lugar: { marco: 'cruzeiro', desvio: [0, 2.5], rumo: 'norte' } },
  { id: 'vale_capela', nome: 'A capela do Vale', area: 'vale', tipo: 'capela', lugar: { marco: 'capela', rumo: 'norte' } },
  { id: 'deserto_capela', nome: 'A capela do Deserto', area: 'deserto', tipo: 'capela', principal: true, lugar: { marco: 'capela', rumo: 'norte' } },
  { id: 'deserto_poco', nome: 'O poço do Deserto', area: 'deserto', tipo: 'lugar', lugar: { marco: 'poco', desvio: [3, 0], rumo: 'oeste' } },
  { id: 'cidade_capela', nome: 'A capela da Cidade Dourada', area: 'cidade', tipo: 'capela', principal: true, lugar: { marco: 'capela', rumo: 'norte' } },
  { id: 'cidade_estrada', nome: 'A porta da estrada do mar', area: 'cidade', tipo: 'lugar', lugar: { marco: 'estradaDoMar', desvio: [0, -3], rumo: 'norte' } },
  { id: 'bahia_cais', nome: 'O cais do saveiro', area: 'bahiabaixa', tipo: 'cais', principal: true, lugar: { marco: 'saveiro', desvio: [0, -2.5], rumo: 'norte' } },
  { id: 'bahia_bonfim', nome: 'A igreja do Bonfim', area: 'bahiabaixa', tipo: 'capela', lugar: { marco: 'capela', rumo: 'norte' } },
  { id: 'bahia_praca', nome: 'A Praça Tomé de Sousa', area: 'bahiaalta', tipo: 'lugar', principal: true, lugar: { marco: 'chegada', rumo: 'leste' } },
  { id: 'creta_praia', nome: 'Bons Portos', area: 'creta', tipo: 'cais', principal: true, lugar: { marco: 'chegada', rumo: 'sul' } },
  { id: 'malta_praia', nome: 'A praia do fogo, em Malta', area: 'malta', tipo: 'lugar', principal: true, lugar: { marco: 'chegada', rumo: 'norte' } },
  { id: 'malta_porto', nome: 'O porto de Malta', area: 'malta', tipo: 'cais', lugar: { marco: 'cais', rumo: 'leste' } },
  // à beira das estradas do ermo (BEIRAS, abaixo)
  { id: 'ermo_cruzeiro_oeste', nome: 'O cruzeiro da estrada do Deserto', area: 'ermo', tipo: 'cruzeiro' },
  { id: 'ermo_cristovao', nome: 'A capelinha de São Cristóvão', area: 'ermo', tipo: 'capela' },
  { id: 'ermo_cruzeiro_campos', nome: 'O cruzeiro dos campos', area: 'ermo', tipo: 'cruzeiro' },
  { id: 'ermo_guia', nome: 'A capelinha de Nossa Senhora da Guia', area: 'ermo', tipo: 'capela' },
  { id: 'ermo_boaviagem', nome: 'A capelinha de Nossa Senhora da Boa Viagem', area: 'ermo', tipo: 'capela' },
];

export const pontoDeViagem = (id: string) => PONTOS_DE_VIAGEM.find((p) => p.id === id) ?? null;

// ───────────── as estradas do ermo e o que fica à beira delas ─────────────

/**
 * As estradas da terra de ligação, de saída em saída das regiões (m do mundo). São só terra batida, um pouco mais
 * lisa que o chão em volta: guiam quem anda sem prender ninguém. Cada uma sai reta da região antes de fazer curva,
 * para cair no corte (corredor, passagem, porta) que a região abre na própria borda.
 */
export const ESTRADAS: readonly (readonly [number, number])[][] = [
  // do Vale (a passagem do oeste) ao Deserto (o corredor do leste)
  [[-80, 8], [-250, 30], [-520, -12], [-800, 28], [-1060, -10], [-1220, 0]],
  // do Deserto (o corredor do sul) até diante da porta da Cidade Dourada, contornando a muralha pelo oeste
  [[-1286, 80], [-1276, 380], [-1160, 760], [-1060, 1060], [-1040, 1310], [-960, 1350], [-900, 1345]],
  // a estrada do mar: da porta da Cidade Dourada à Cidade Alta da Bahia, pelo norte da baía
  [[-900, 1280], [-900, 1345], [-820, 1470], [-560, 1615], [-200, 1730], [220, 1760], [620, 1830], [880, 2040], [860, 2230], [760, 2300], [672, 2300]],
];

/** Um ponto de uma estrada: a posição a uma fração `t` (0 a 1) do comprimento dela, e a direção em que ela corre. */
export function pontoNaEstrada(i: number, t: number) {
  const e = ESTRADAS[i];
  let total = 0;
  for (let k = 0; k < e.length - 1; k++) total += Math.hypot(e[k + 1][0] - e[k][0], e[k + 1][1] - e[k][1]);
  let falta = t * total;
  for (let k = 0; k < e.length - 1; k++) {
    const [ax, az] = e[k], [bx, bz] = e[k + 1];
    const l = Math.hypot(bx - ax, bz - az);
    if (falta <= l || k === e.length - 2) {
      const u = Math.min(1, falta / l);
      return { x: ax + (bx - ax) * u, z: az + (bz - az) * u, dx: (bx - ax) / l, dz: (bz - az) / l };
    }
    falta -= l;
  }
  return { x: e[0][0], z: e[0][1], dx: 1, dz: 0 };
}

/** A imagem de uma capelinha (devoções reais dos viajantes). */
export type Devocao = 'cristovao' | 'guia' | 'boaviagem';

/** Uma capelinha ou um cruzeiro de beira de estrada: em que estrada, a que fração dela e de que lado. */
export interface DefBeira {
  id: string;
  tipo: 'capela' | 'cruzeiro';
  estrada: number;
  t: number;
  /** 1: à direita de quem anda no sentido da estrada; -1: à esquerda. */
  lado: 1 | -1;
  devocao?: Devocao;
}

export const BEIRAS: readonly DefBeira[] = [
  { id: 'ermo_cruzeiro_oeste', tipo: 'cruzeiro', estrada: 0, t: 0.52, lado: 1 },
  { id: 'ermo_cristovao', tipo: 'capela', estrada: 1, t: 0.42, lado: -1, devocao: 'cristovao' },
  { id: 'ermo_cruzeiro_campos', tipo: 'cruzeiro', estrada: 2, t: 0.18, lado: 1 },
  { id: 'ermo_guia', tipo: 'capela', estrada: 2, t: 0.5, lado: 1, devocao: 'guia' },
  { id: 'ermo_boaviagem', tipo: 'capela', estrada: 2, t: 0.8, lado: 1, devocao: 'boaviagem' },
];

/** Onde fica uma beira: a 4,5 m do eixo da estrada, de frente para ela. */
export function lugarDaBeira(b: DefBeira) {
  const p = pontoNaEstrada(b.estrada, b.t);
  // a direita de quem anda para (dx, dz), com +z ao sul: (-dz, dx)
  const nx = -p.dz * b.lado, nz = p.dx * b.lado;
  return { x: p.x + nx * 4.5, z: p.z + nz * 4.5, rumo: Math.atan2(-nx, -nz) };
}
