import type { IdArea } from '../mundo/Area';
import type { Flag, TemFlag } from './Flags';

/**
 * A ficha de cada região e interior: nome, quando a história dela acorda, como se chega, a luz e a barra de cor.
 * Acrescentar uma região é preencher uma ficha aqui (e criar a área); o `Jogo` lê daqui em vez de um `switch` por
 * região. Só dados: nada de three.js, para os testes e o build poderem ler.
 */

/** Luz, névoa e céu de uma área (cores em hexadecimal; o que falta fica como estava). */
export interface Ambiente {
  nevoa: { cor: number; perto: number; longe: number };
  hemi: { ceu: number; chao: number; forca: number };
  sol?: { cor: number; forca: number };
  ceu?: { topo: number; horizonte: number };
}

export const AMBIENTES = {
  /** O vale e o padrão: tarde clara, névoa morna. */
  vale: { nevoa: { cor: 0xe8dcc4, perto: 45, longe: 150 }, hemi: { ceu: 0xcfe3ff, chao: 0x6b5a3a, forca: 1.5 }, sol: { cor: 0xfff1d6, forca: 2.4 }, ceu: { topo: 0x4a86d0, horizonte: 0xf3d9b0 } },
  /** Debaixo da terra: só a névoa escura e a luz baixa (sem sol nem céu). */
  cripta: { nevoa: { cor: 0x07060a, perto: 10, longe: 46 }, hemi: { ceu: 0xa49c9a, chao: 0x3a2c20, forca: 0.95 } },
  /** Sol forte e ar quente: névoa clara, cor de areia. */
  deserto: { nevoa: { cor: 0xf0dcb4, perto: 50, longe: 165 }, hemi: { ceu: 0xe6eeff, chao: 0x9a7448, forca: 1.45 }, sol: { cor: 0xffe6b8, forca: 2.8 }, ceu: { topo: 0x5a92d8, horizonte: 0xf6dfb2 } },
  /** Meio-dia: sol a pino, luz branca e dura, ar tremendo de calor. */
  meiodia: { nevoa: { cor: 0xfff0d4, perto: 28, longe: 110 }, hemi: { ceu: 0xfff8ec, chao: 0xb08a58, forca: 1.35 }, sol: { cor: 0xfffaf0, forca: 2.9 }, ceu: { topo: 0x7aa8e0, horizonte: 0xfff0d0 } },
  /** Fim de tarde na Úmbria: luz dourada e baixa, névoa quente sobre os olivais. */
  cidade: { nevoa: { cor: 0xf2dcb4, perto: 48, longe: 160 }, hemi: { ceu: 0xdce8ff, chao: 0x7a6040, forca: 1.45 }, sol: { cor: 0xffdca0, forca: 2.6 }, ceu: { topo: 0x4f8ad8, horizonte: 0xf6d29a } },
  /** Salão fechado à luz de velas: ouro quente, cantos escuros, ar pesado de comida. */
  palacio: { nevoa: { cor: 0x2a140e, perto: 26, longe: 70 }, hemi: { ceu: 0xffe0b0, chao: 0x4a2a18, forca: 0.95 }, sol: { cor: 0xffd0a0, forca: 1.1 }, ceu: { topo: 0x1a0a10, horizonte: 0x4a2018 } },
  /** O sol de Salvador: luz branca e quente, céu muito azul, e o ar limpo da brisa do mar. */
  bahia: { nevoa: { cor: 0xdde8ee, perto: 60, longe: 210 }, hemi: { ceu: 0xd6ecff, chao: 0x8a7a5a, forca: 1.5 }, sol: { cor: 0xfff2dc, forca: 2.7 }, ceu: { topo: 0x2f84e0, horizonte: 0xe4eef2 } },
  /** O fim do verão no Mediterrâneo: luz clara e seca, mar de um azul fundo, e o horizonte longe. */
  mediterraneo: { nevoa: { cor: 0xd9e6ec, perto: 90, longe: 300 }, hemi: { ceu: 0xd8ecff, chao: 0x8a7c5a, forca: 1.5 }, sol: { cor: 0xfff0d8, forca: 2.7 }, ceu: { topo: 0x2a78d0, horizonte: 0xe0ecf0 } },
  /** Malta antes da cor, na praia do fogo e da víbora: a garoa fria. */
  garoa: { nevoa: { cor: 0x7a848a, perto: 24, longe: 130 }, hemi: { ceu: 0xc8d2dc, chao: 0x4a4a44, forca: 0.95 }, sol: { cor: 0xd8e0e8, forca: 0.55 }, ceu: { topo: 0x4a545c, horizonte: 0x7a848a } },
  /** Malta nos três dias com Públio: o céu nublado. */
  nublado: { nevoa: { cor: 0xaab4b8, perto: 60, longe: 230 }, hemi: { ceu: 0xc8d2dc, chao: 0x4a4a44, forca: 1.2 }, sol: { cor: 0xd8e0e8, forca: 1.3 }, ceu: { topo: 0x7a8a98, horizonte: 0xb8c4c8 } },
  /** O caminho entre as regiões: ar limpo e horizonte longe, para se ver aonde se vai. */
  ermo: { nevoa: { cor: 0xdfe9ee, perto: 140, longe: 1500 }, hemi: { ceu: 0xd6e8ff, chao: 0x7a7458, forca: 1.5 }, sol: { cor: 0xfff2dc, forca: 2.6 }, ceu: { topo: 0x3a82d8, horizonte: 0xe6eef2 } },
} as const satisfies Record<string, Ambiente>;
export type NomeAmbiente = keyof typeof AMBIENTES;

/** O que acorda a história de uma região: uma flag, um chefão vencido, o véu do Vale desfeito, ou qualquer um de vários. */
export type Requisito = { flag: Flag } | { vencida: string } | { veuAberto: true } | { algum: Requisito[] };

/** O que o requisito consulta no jogo. */
export interface ConsultaRequisito {
  tem: TemFlag;
  venceu: (sombra: string) => boolean;
  veuAberto: boolean;
}

export function cumpre(r: Requisito, c: ConsultaRequisito): boolean {
  if ('flag' in r) return c.tem(r.flag);
  if ('vencida' in r) return c.venceu(r.vencida);
  if ('veuAberto' in r) return c.veuAberto;
  return r.algum.some((x) => cumpre(x, c));
}

export interface DefRegiao {
  /** Nome no mapa, no minimapa e nos avisos. */
  nome: string;
  /** Rótulo da barra de cor enquanto se está nela. */
  barraDeCor: string;
  /** Luz, névoa e céu. */
  ambiente: NomeAmbiente;
  /** A tempestade toma o lugar do ambiente: sempre (o navio) ou só com a região acordada (o naufrágio). */
  tempestade?: 'sempre' | 'acordada';
  /** Som de fundo; com `ate`, só enquanto a flag não estiver marcada. */
  som?: { tipo: 'cripta' | 'deserto' | 'tempestade'; ate?: Flag };
  /** Quando a história dela acorda. Sem requisito, está sempre acordada. */
  acorda?: Requisito;
  /** A flag que diz que já se esteve lá (para deduzir as visitas de um save antigo). */
  entrou?: Flag;
  /** Nó do Ink tocado na primeira vez que se chega a pé (marcando `entrou`); a chegada vira o checkpoint. */
  chegada?: string;
  /** A flag que pinta a região em cor no mapa-múndi. */
  restauracao?: Flag;
}

export const REGIOES: Record<IdArea, DefRegiao> = {
  vale: { nome: 'O Vale', barraDeCor: 'Cor do Vale', ambiente: 'vale', restauracao: 'vale_restaurado' },
  cripta: { nome: 'A Cripta', barraDeCor: 'Cor do Vale', ambiente: 'cripta', som: { tipo: 'cripta' }, entrou: 'cripta_entrou' },
  deserto: {
    nome: 'Deserto das Vozes', barraDeCor: 'Cor do Deserto', ambiente: 'deserto', som: { tipo: 'deserto' },
    acorda: { algum: [{ veuAberto: true }, { flag: 'deserto_entrou' }] }, entrou: 'deserto_entrou', chegada: 'deserto_chegada', restauracao: 'deserto_restaurado',
  },
  meiodia: { nome: 'Poço do Meio-Dia', barraDeCor: 'Cor do Deserto', ambiente: 'meiodia', som: { tipo: 'deserto' }, entrou: 'meiodia_entrou' },
  cidade: {
    nome: 'Cidade Dourada', barraDeCor: 'Cor da Cidade', ambiente: 'cidade',
    acorda: { flag: 'meiodia_vencido' }, entrou: 'cidade_entrou', chegada: 'cidade_chegada', restauracao: 'cidade_restaurada',
  },
  palacio: { nome: 'Palácio da Gula', barraDeCor: 'Cor da Cidade', ambiente: 'palacio', entrou: 'palacio_entrou' },
  bahiabaixa: {
    nome: 'Bahia: Cidade Baixa', barraDeCor: 'Cor da Bahia', ambiente: 'bahia',
    acorda: { vencida: 'palacio_gula' }, entrou: 'bahia_entrou', chegada: 'bahia_chegada', restauracao: 'bahia_restaurada',
  },
  bahiaalta: {
    nome: 'Bahia: Cidade Alta', barraDeCor: 'Cor da Bahia', ambiente: 'bahia',
    acorda: { vencida: 'palacio_gula' }, entrou: 'bahia_alta_entrou', chegada: 'bahia_alta_chegada', restauracao: 'bahia_restaurada',
  },
  creta: {
    nome: 'Creta: Bons Portos', barraDeCor: 'Cor do Mar', ambiente: 'mediterraneo',
    acorda: { flag: 'bahia_coracao_vencido' }, entrou: 'creta_entrou', chegada: 'creta_chegada', restauracao: 'mar_restaurado',
  },
  navio: { nome: 'O Mar da Tempestade', barraDeCor: 'Cor do Mar', ambiente: 'mediterraneo', tempestade: 'sempre', som: { tipo: 'tempestade' }, entrou: 'navio_entrou' },
  naufragio: {
    nome: 'O Naufrágio', barraDeCor: 'Cor do Mar', ambiente: 'mediterraneo', tempestade: 'acordada', som: { tipo: 'tempestade', ate: 'naufragio_ira_vencida' },
    acorda: { flag: 'naufragio_encalhou' }, entrou: 'naufragio_encalhou', restauracao: 'mar_restaurado',
  },
  malta: {
    nome: 'Malta', barraDeCor: 'Cor do Mar', ambiente: 'mediterraneo',
    acorda: { flag: 'naufragio_ira_vencida' }, entrou: 'malta_entrou', chegada: 'malta_chegada', restauracao: 'mar_restaurado',
  },
  ermo: { nome: 'O Caminho', barraDeCor: 'Cor do Vale', ambiente: 'ermo' },
};
