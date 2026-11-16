import { figurinoDoPovo, type Figurino } from '../voxel/Humano';
import type { DefNpc } from './Npc';

/**
 * A gente de Bons Portos e de Laseia e a tripulação do navio de Alexandria (At 27,8-13). O centurião e os soldados
 * ficam em `Romanos.ts`; Lucas e Aristarco, em `Companheiros.ts`.
 */

const OURO = 0xd9b24a;

/** O piloto: o homem do leme, que conhece os ventos e quer passar o inverno em Fênix (At 27,11-12). */
export const PILOTO: DefNpc = {
  id: 'piloto',
  falante: 'piloto',
  no: 'creta_piloto',
  rotulo: 'F: falar com o piloto',
  visual: { genero: 'm', idade: 'adulto', pele: 0x9a6a46, penteado: 'curto', corCabelo: 0x2a1e18, barba: 'curta', traje: 'tunica', cor: 0x4a5a6a, cor2: 0x8a7a5a, acessorio: 'cajado' },
};

/** O dono do navio (o nauclero), que leva o trigo de Alexandria a Roma e tem pressa de chegar (At 27,11). */
export const NAUCLERO: DefNpc = {
  id: 'nauclero',
  falante: 'nauclero',
  no: 'creta_nauclero',
  rotulo: 'F: falar com o dono do navio',
  visual: { genero: 'm', idade: 'adulto', pele: 0xb07a52, penteado: 'calvo', corCabelo: 0x2a1e18, barba: 'curta', traje: 'manto_rico', cor: 0x2a4a6a, cor2: OURO, acessorio: 'bolsa' },
};

const marujo = (pele: number, cor: number, barba?: 'curta' | 'longa'): Figurino => ({
  genero: 'm', idade: 'jovem', pele, penteado: 'curto', corCabelo: 0x231a17, barba, traje: 'avental', cor, cor2: 0x5a4a3a,
});

/** Os marinheiros (o navio leva 276 pessoas ao todo: At 27,37). */
export const MARINHEIROS: DefNpc[] = [
  { id: 'marinheiro_1', falante: 'marinheiro', no: 'creta_marinheiro', rotulo: 'F: falar com o marinheiro', visual: marujo(0x8a5a3a, 0x7a6a52) },
  { id: 'marinheiro_2', falante: 'marinheiro', no: 'creta_marinheiro', rotulo: 'F: falar com o marinheiro', visual: marujo(0xb07a52, 0x5a6a72, 'curta') },
  { id: 'marinheiro_3', falante: 'marinheiro', no: 'creta_marinheiro', rotulo: 'F: falar com o marinheiro', visual: marujo(0x6a4430, 0x8a7a5a) },
];

/** Os outros presos que o centurião leva a Roma (At 27,1). */
export const PRESOS: DefNpc[] = [
  { id: 'preso_1', falante: 'preso', no: 'creta_preso', rotulo: 'F: falar com o preso', visual: { ...figurinoDoPovo(901, 'pobre'), genero: 'm', acessorio: undefined } },
  { id: 'preso_2', falante: 'preso', no: 'creta_preso', rotulo: 'F: falar com o preso', visual: { ...figurinoDoPovo(917, 'pobre'), genero: 'm', acessorio: undefined } },
];

/** Os pescadores de Bons Portos, que conhecem o vento que desce das montanhas. */
export const PESCADOR: DefNpc = {
  id: 'pescador',
  falante: 'pescador',
  no: 'creta_pescador',
  rotulo: 'F: falar com o velho pescador',
  visual: { genero: 'm', idade: 'idoso', pele: 0x9a6a46, penteado: 'capuz', corCabelo: 0x3a2a20, barba: 'longa', traje: 'avental', cor: 0x6a5a48, cor2: 0x8a7a5a },
};

/** A mulher do forno, que assa o pão da vila. */
export const PADEIRA: DefNpc = {
  id: 'padeira',
  falante: 'padeira',
  no: 'creta_padeira',
  rotulo: 'F: falar com a mulher do forno',
  visual: { genero: 'f', idade: 'adulto', pele: 0xc0906a, penteado: 'veu', corCabelo: 0x231a17, traje: 'avental', cor: 0x8a6a5a, cor2: 0xd8ccb0, acessorio: 'pao' },
};

/** A gente de Laseia: o vendedor da praça, a mulher da fonte, o velho do pórtico e o guarda da porta. */
export const GENTE_DE_LASEIA: DefNpc[] = [
  { id: 'laseia_mercador', falante: 'laseiano', no: 'creta_laseia_mercador', rotulo: 'F: falar com o morador', visual: { ...figurinoDoPovo(1201, 'rico'), genero: 'm' } },
  { id: 'laseia_fonte', falante: 'laseiana', no: 'creta_laseia_fonte', rotulo: 'F: falar com a moradora', visual: { ...figurinoDoPovo(1213, 'povo'), genero: 'f', penteado: 'veu', acessorio: 'cesto' } },
  { id: 'laseia_velho', falante: 'laseiano', no: 'creta_laseia_velho', rotulo: 'F: falar com o morador', visual: { ...figurinoDoPovo(1229, 'povo'), genero: 'm', idade: 'idoso', barba: 'longa', acessorio: 'cajado' } },
  { id: 'laseia_guarda', falante: 'laseiano', no: 'creta_laseia_guarda', rotulo: 'F: falar com o morador', visual: { ...figurinoDoPovo(1237, 'povo'), genero: 'm', idade: 'adulto', traje: 'tunica', cor: 0x6a5a48, acessorio: 'cajado' } },
];

/** O pastor das cabras, nas encostas do norte. */
export const PASTOR: DefNpc = {
  id: 'pastor',
  falante: 'pastor',
  no: 'creta_pastor',
  rotulo: 'F: falar com o pastor',
  visual: { genero: 'm', idade: 'jovem', pele: 0xa8784e, penteado: 'curto', corCabelo: 0x3b2618, traje: 'tunica', cor: 0x8a7a5a, acessorio: 'cajado' },
};
