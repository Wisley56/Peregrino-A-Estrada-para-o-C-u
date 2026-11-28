/**
 * Atalhos de progresso do modo dev: cada etapa é o estado de um jogador que acabou de chegar àquele ponto da
 * história. As etapas são cumulativas (a "Acídia vencida" inclui o Vale, Mamom e o Deserto).
 *
 * Os ids das sombras seguem os das áreas (`vale_sombra_N`, `deserto_miragem_N`...). Se uma área ganhar sombras
 * novas, acrescente aqui.
 */
import type { Estado } from '../core/Estado';
import type { IdArea } from '../mundo/Area';
import type { Flag } from '../historia/Flags';

const ids = <P extends string>(prefixo: P, n: number) => Array.from({ length: n }, (_, i) => `${prefixo}${i + 1}` as `${P}${number}`);

interface Etapa {
  id: string;
  nome: string;
  sombras: string[];
  chefoes: string[];
  flags: Flag[];
  /** Onde o peregrino aparece depois de aplicar a etapa. */
  area: IdArea;
  ponto: number;
}

export const ETAPAS: Etapa[] = [
  { id: 'comeco', nome: 'Começo do jogo', sombras: [], chefoes: [], flags: ['intro'], area: 'vale', ponto: 0 },
  {
    id: 'vale', nome: 'Vale restaurado', sombras: ids('vale_sombra_', 5), chefoes: [],
    flags: ['vale_restaurado', 'cruzeiro', 'confissao_explicada'], area: 'vale', ponto: 4,
  },
  {
    id: 'mamom', nome: 'Mamom vencido', sombras: [], chefoes: ['cripta_guardiao'],
    flags: ['cripta_laje', 'cripta_entrou', 'cripta_portao', 'cripta_dica_chama', 'cripta_dica_guardiao', 'lamparina'], area: 'vale', ponto: 5,
  },
  {
    id: 'deserto', nome: 'Deserto restaurado', sombras: [...ids('deserto_miragem_', 4), ...ids('deserto_sombra_', 2)], chefoes: [],
    flags: ['veu_oeste', 'deserto_entrou', 'deserto_dica_miragem', 'deserto_dica_vozes', 'deserto_parede', 'deserto_poco', 'deserto_cruz', 'deserto_restaurado', 'dom_ciencia'],
    area: 'deserto', ponto: 0,
  },
  {
    id: 'acidia', nome: 'Acídia vencida', sombras: [], chefoes: ['meiodia_acedia'],
    flags: ['meiodia_entrou', 'meiodia_dica', 'meiodia_vencido'], area: 'deserto', ponto: 5,
  },
  {
    id: 'cidade', nome: 'Cidade pronta para a Gula', sombras: ids('cidade_sombra_', 4), chefoes: [],
    flags: [
      'cidade_entrou', 'cidade_dica_peso', 'cidade_dica_pobres', 'cidade_fonte', 'cidade_cruzeiro', 'dom_piedade',
      'cidade_leproso', 'cidade_ajudou_tomas', 'cidade_ajudou_rita', 'cidade_ajudou_beppo',
      'cidade_retribuiu_tomas', 'cidade_retribuiu_rita', 'cidade_retribuiu_beppo', 'cidade_retribuiu_leproso',
      'cidade_lobo', 'cidade_lobo_praca', ...ids('cidade_pedra_', 4), 'cidade_damiao', 'cidade_portas_abertas',
    ],
    area: 'cidade', ponto: 2,
  },
  {
    id: 'tudo', nome: 'Gula vencida', sombras: [], chefoes: ['palacio_gula'],
    flags: ['palacio_entrou', 'palacio_dica', 'gula_vencida', 'cidade_restaurada'], area: 'palacio', ponto: 1,
  },
  {
    // a Bahia até o Largo do Cruzeiro: só o que a luta com o Coração pede (o hospital e os enfermos ficam por fazer)
    id: 'coracao', nome: 'Coração de Pedra vencido', sombras: [], chefoes: ['bahiaalta_coracao'],
    flags: ['peregrino_adulto', 'bahia_entrou', 'bahia_alta_entrou', 'bahia_enfermaria', 'bahia_coracao_dica', 'bahia_coracao_vencido'],
    area: 'bahiaalta', ponto: 0,
  },
  {
    // o navio na ordem de etapaDoNavio (Tempestade.ts) e o naufrágio na de etapaDoNaufragio
    id: 'ira', nome: 'Ira vencida (navio e naufrágio)', sombras: [], chefoes: ['naufragio_ira'],
    flags: [
      'creta_entrou', 'navio_entrou', 'navio_bote', 'navio_cintado', 'navio_carga', 'navio_brigas', 'navio_anjo', 'navio_sonda',
      'navio_ancoras', 'navio_fuga', 'navio_pao', 'naufragio_encalhou', 'naufragio_presos', 'naufragio_ira_dica', 'naufragio_ira_vencida',
    ],
    area: 'naufragio', ponto: 2,
  },
  {
    // Malta na ordem de etapaDeMalta (Malta.ts), até a partida
    id: 'malta', nome: 'Malta: partida (tudo até aqui)', sombras: [], chefoes: [],
    flags: ['malta_entrou', 'malta_fogo', 'malta_vibora', 'malta_boatos', 'malta_publio', 'dom_conselho', 'malta_pai_curado', 'malta_curas', 'mar_restaurado', 'malta_tres_meses'],
    area: 'malta', ponto: 0,
  },
];

/**
 * Leva o estado à etapa pedida, do zero (mantém a identidade e os dons comprados). As graças contam como se o
 * jogador tivesse vencido tudo: 1 por sombra, 3 por chefão.
 */
export function aplicarEtapa(e: Estado, id: string) {
  const ate = ETAPAS.findIndex((x) => x.id === id);
  if (ate < 0) throw new Error(`etapa desconhecida: ${id}`);
  const identidade = e.identidade;
  const dons = e.dons;
  const slot = e.slot;
  const semSalvar = e.semSalvar;
  e.zerar();
  Object.assign(e, { identidade, dons, slot, semSalvar });
  for (const etapa of ETAPAS.slice(0, ate + 1)) {
    for (const s of etapa.sombras) e.sombrasVencidas.add(s);
    for (const c of etapa.chefoes) {
      e.sombrasVencidas.add(c);
      e.flags.add(`graca_grande_${c}`);
    }
    for (const f of etapa.flags) e.flags.add(f);
    e.gracas += etapa.sombras.length + etapa.chefoes.length * 3;
  }
  e.cor = e.sombrasVencidas.has('vale_sombra_5') ? 1 : 0;
  e.restaurar();
  return ETAPAS[ate];
}

