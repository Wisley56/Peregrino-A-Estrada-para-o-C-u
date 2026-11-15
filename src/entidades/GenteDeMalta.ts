import { figurinoDoPovo } from '../voxel/Humano';
import { montarApostolico } from './Companheiros';
import type { DefNpc } from './Npc';

/**
 * A gente de Malta (At 28,1-10): os moradores que acenderam o fogo e "nos trataram com rara humanidade" (28,2),
 * Públio, o principal da ilha, e o pai dele, e os enfermos que vieram para ser curados (28,9).
 */

/**
 * São Paulo em Malta: o mesmo dos ícones (calvo na frente, barba comprida, himácio vermelho-terra, descalço, a
 * corrente no pulso), mas com a mão direita livre: é a mão que junta os gravetos e em que a víbora se prende (At 28,3).
 * A imagem de Malta é essa: Paulo sacudindo a víbora no fogo.
 */
export const PAULO_MALTA: DefNpc = {
  id: 'paulo',
  falante: 'paulo',
  no: 'malta_paulo',
  rotulo: 'F: falar com São Paulo',
  visual: () =>
    montarApostolico({
      pele: 0xc89470, sombraPele: 0xa0704e, cabelo: 0x5a3420, penteado: 'calvo_frente', barba: 'longa', corBarba: 0x6a3c22, grisalho: 0.12,
      tunica: 0xe4dcc8, himacio: 0xa04a2a, clavo: 0x8a3a22, maoDireita: 'nada', maoEsquerda: 'livro',
      descalco: true, rugas: true, corrente: true,
    }),
};

/** Os moradores da praia, que descem com o fogo e os mantos; cada um tira a sua conclusão da víbora (At 28,4-6). */
export const MORADORES: DefNpc[] = [
  {
    id: 'anciao', falante: 'maltes', no: 'malta_anciao', rotulo: 'F: falar com o ancião',
    visual: { genero: 'm', idade: 'idoso', pele: 0x9a6a46, penteado: 'capuz', corCabelo: 0x3a2a20, barba: 'longa', traje: 'tunica', cor: 0x6a5a48, cor2: 0x8a7a5a, acessorio: 'cajado' },
  },
  {
    id: 'mulher', falante: 'maltesa', no: 'malta_mulher', rotulo: 'F: falar com a moradora',
    visual: { genero: 'f', idade: 'adulto', pele: 0xb07a52, penteado: 'veu', corCabelo: 0x231a17, traje: 'vestido', cor: 0x7a5a4a, cor2: 0xd8ccb0, acessorio: 'cesto' },
  },
  {
    id: 'pescador', falante: 'maltes', no: 'malta_pescador', rotulo: 'F: falar com o pescador',
    visual: { genero: 'm', idade: 'jovem', pele: 0x8a5a3a, penteado: 'curto', corCabelo: 0x231a17, barba: 'curta', traje: 'avental', cor: 0x5a6a72, cor2: 0x5a4a3a },
  },
  {
    id: 'rapaz', falante: 'maltes', no: 'malta_rapaz', rotulo: 'F: falar com o rapaz',
    visual: { genero: 'm', idade: 'jovem', pele: 0xa8784e, penteado: 'curto', corCabelo: 0x3b2618, traje: 'tunica', cor: 0x8a7a5a, cor2: 0x6a5a48 },
  },
];

/** Públio, "o principal da ilha" (At 28,7): de toga branca com a faixa de púrpura, como um magistrado de Roma. */
export const PUBLIO: DefNpc = {
  id: 'publio',
  falante: 'publio',
  no: 'malta_publio',
  rotulo: 'F: falar com Públio',
  visual: { genero: 'm', idade: 'adulto', pele: 0xb88a62, penteado: 'curto', corCabelo: 0x2a1e18, traje: 'manto_rico', cor: 0xe8e2d2, cor2: 0x6a2a5a },
};

/** O pai de Públio, de cama "com febre e disenteria" (At 28,8). */
export const PAI_DE_PUBLIO: DefNpc = {
  id: 'pai_publio',
  falante: 'pai_publio',
  no: 'malta_pai',
  rotulo: 'F: falar com o pai de Públio',
  visual: { genero: 'm', idade: 'idoso', pele: 0xb88a62, penteado: 'calvo', corCabelo: 0x3a2a20, barba: 'curta', traje: 'tunica', cor: 0xe8e2d2, cor2: 0x6a2a5a },
};

/** O criado que guarda a porta da casa de campo. */
export const CRIADO: DefNpc = {
  id: 'criado',
  falante: 'criado',
  no: 'malta_criado',
  rotulo: 'F: falar com o criado',
  visual: { genero: 'm', idade: 'jovem', pele: 0x7a4a30, penteado: 'curto', corCabelo: 0x1a1210, traje: 'avental', cor: 0x8a7a5a, cor2: 0x6a5a48 },
};

/** Quem leva de barco para longe da ilha (a viagem de volta: Bahia, Creta, Cidade Dourada). */
export const BARQUEIRO: DefNpc = {
  id: 'barqueiro',
  falante: 'maltes',
  no: 'malta_barco',
  rotulo: 'F: falar com o barqueiro',
  visual: { genero: 'm', idade: 'idoso', pele: 0x8a5a3a, penteado: 'capuz', corCabelo: 0x3a2a20, barba: 'longa', traje: 'avental', cor: 0x5a6a72, cor2: 0x8a7a5a },
};

/** Um enfermo da ilha (At 28,9): onde está, e como fica depois de curado. */
export interface DefEnfermoMalta {
  id: 'febril' | 'coxo' | 'cego' | 'mae';
  /** Como aparece doente e depois de curado. */
  doente: DefNpc;
  curado: DefNpc;
}

const morador = (id: string, no: string, rotulo: string, falante: 'maltes' | 'maltesa', visual: DefNpc['visual']): DefNpc => ({ id, falante, no, rotulo, visual });

/**
 * Os outros enfermos da ilha, que vieram e foram curados (At 28,9): a mulher com febre, no poço do povoado; o
 * pescador que não anda direito, no porto; o velho cego, à porta de Melite; e a mãe do menino doente, na casa do sul.
 */
export const ENFERMOS_MALTA: DefEnfermoMalta[] = [
  {
    id: 'febril',
    doente: morador('febril', 'malta_febril', 'F: falar com a mulher no poço', 'maltesa', { ...figurinoDoPovo(1601, 'povo'), genero: 'f', penteado: 'veu', idade: 'adulto', acessorio: undefined }),
    curado: morador('febril', 'malta_febril', 'F: falar com a mulher curada', 'maltesa', { ...figurinoDoPovo(1601, 'povo'), genero: 'f', penteado: 'veu', idade: 'adulto', acessorio: 'cesto' }),
  },
  {
    id: 'coxo',
    doente: morador('coxo', 'malta_coxo', 'F: falar com o homem da muleta', 'maltes', { ...figurinoDoPovo(1613, 'pobre'), genero: 'm', idade: 'adulto', acessorio: 'muleta' }),
    curado: morador('coxo', 'malta_coxo', 'F: falar com o homem curado', 'maltes', { ...figurinoDoPovo(1613, 'pobre'), genero: 'm', idade: 'adulto', acessorio: undefined }),
  },
  {
    id: 'cego',
    doente: morador('cego', 'malta_cego', 'F: falar com o velho cego', 'maltes', { ...figurinoDoPovo(1627, 'pobre'), genero: 'm', idade: 'idoso', barba: 'longa', acessorio: 'cajado' }),
    curado: morador('cego', 'malta_cego', 'F: falar com o velho curado', 'maltes', { ...figurinoDoPovo(1627, 'pobre'), genero: 'm', idade: 'idoso', barba: 'longa', acessorio: undefined }),
  },
  {
    id: 'mae',
    doente: morador('mae', 'malta_mae', 'F: falar com a mãe do menino', 'maltesa', { ...figurinoDoPovo(1639, 'povo'), genero: 'f', penteado: 'veu', idade: 'adulto', acessorio: undefined }),
    curado: morador('mae', 'malta_mae', 'F: falar com a mãe do menino', 'maltesa', { ...figurinoDoPovo(1639, 'povo'), genero: 'f', penteado: 'veu', idade: 'adulto', acessorio: undefined }),
  },
];

/** O menino doente (deitado na esteira) e, curado, de pé ao lado da mãe. */
export const MENINO: DefNpc = morador('menino', 'malta_menino', 'F: falar com o menino', 'maltes', { ...figurinoDoPovo(1651, 'povo'), genero: 'm', idade: 'crianca', acessorio: undefined });
