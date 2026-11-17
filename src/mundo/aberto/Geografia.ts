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
export interface DefPontoDeViagem {
  id: string;
  nome: string;
  area: IdArea;
  tipo: TipoPontoDeViagem;
  principal?: boolean;
}

export const PONTOS_DE_VIAGEM: readonly DefPontoDeViagem[] = [
  { id: 'vale_cruzeiro', nome: 'O cruzeiro do Vale', area: 'vale', tipo: 'cruzeiro', principal: true },
  { id: 'vale_capela', nome: 'A capela do Vale', area: 'vale', tipo: 'capela' },
  { id: 'deserto_capela', nome: 'A capela do Deserto', area: 'deserto', tipo: 'capela', principal: true },
  { id: 'deserto_poco', nome: 'O poço do Deserto', area: 'deserto', tipo: 'lugar' },
  { id: 'cidade_capela', nome: 'A capela da Cidade Dourada', area: 'cidade', tipo: 'capela', principal: true },
  { id: 'cidade_estrada', nome: 'A porta da estrada do mar', area: 'cidade', tipo: 'lugar' },
  { id: 'bahia_cais', nome: 'O cais do saveiro', area: 'bahiabaixa', tipo: 'cais', principal: true },
  { id: 'bahia_bonfim', nome: 'A igreja do Bonfim', area: 'bahiabaixa', tipo: 'capela' },
  { id: 'bahia_praca', nome: 'A Praça Tomé de Sousa', area: 'bahiaalta', tipo: 'lugar', principal: true },
  { id: 'creta_praia', nome: 'Bons Portos', area: 'creta', tipo: 'cais', principal: true },
  { id: 'malta_praia', nome: 'A praia do fogo, em Malta', area: 'malta', tipo: 'lugar', principal: true },
  { id: 'malta_porto', nome: 'O porto de Malta', area: 'malta', tipo: 'cais' },
];

export const pontoDeViagem = (id: string) => PONTOS_DE_VIAGEM.find((p) => p.id === id) ?? null;
