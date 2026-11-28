/**
 * Registro das flags da história. Uma flag é um fato do save ("a laje da cripta cedeu", "Rita foi socorrida"), lido e
 * gravado pelo TypeScript (`Jogo.marcar`, `estado.flags`) e pelo Ink (`tem`, `marcar`, `primeira`).
 *
 * - As **fixas** ficam listadas por região; as **famílias** são prefixos seguidos de um id (`dom_ciencia`,
 *   `navio_cabo_2`).
 * - O tipo `Flag` só aceita uma fixa ou um prefixo de família: um erro de digitação no TypeScript vira erro de
 *   compilação. O plugin do Ink (`tools/vite-plugin-ink.ts`) confere os roteiros contra este registro, e uma flag
 *   desconhecida num `.ink` derruba o build.
 * - **Nunca renomeie uma flag**: ela está gravada nos saves. Para aposentar uma, deixe-a aqui com um comentário.
 * - Este arquivo não importa nada do jogo: o build o lê em Node.
 */

/** Flags fixas, por região. */
export const FLAGS_FIXAS = {
  /** Do caminho todo: abertura, sacramentos, dons, livro, idade. */
  geral: [
    'agostinho', 'barco_conduziu', 'capela_comunhao', 'capela_sem_confissao', 'confissao_explicada',
    'confissao_padre', 'cruzeiro', 'digital_conselho_aperfeicoado', 'gula_vencida', 'intro', 'lamparina',
    'livro_agostinho', 'mar_restaurado', 'peregrino_adulto', 'sacrario', 'veu_oeste',
  ],
  /** Vale das Sombras. */
  vale: [
    'vale_porta_estreita', 'vale_porta_vista', 'vale_restaurado',
  ],
  /** Cripta. */
  cripta: [
    'cripta_dica_chama', 'cripta_dica_guardiao', 'cripta_entrou', 'cripta_laje', 'cripta_portao',
  ],
  /** Deserto. */
  deserto: [
    'deserto_capela', 'deserto_cruz', 'deserto_dica_miragem', 'deserto_dica_vozes', 'deserto_entrou',
    'deserto_parede', 'deserto_poco', 'deserto_restaurado',
  ],
  /** Poço do Meio-Dia. */
  meiodia: [
    'meiodia_dica', 'meiodia_entrou', 'meiodia_vencido',
  ],
  /** Cidade Dourada. */
  cidade: [
    'cidade_cruzeiro', 'cidade_damiao', 'cidade_dica_peso', 'cidade_dica_pobres', 'cidade_entrou', 'cidade_fonte',
    'cidade_leproso', 'cidade_lobo', 'cidade_lobo_praca', 'cidade_portas_abertas', 'cidade_restaurada',
  ],
  /** Palácio do Banquete. */
  palacio: [
    'palacio_dica', 'palacio_entrou',
  ],
  /** Bahia (cidade baixa, alta, hospital e Bonfim). */
  bahia: [
    'bahia_alta_entrou', 'bahia_bonfim_entrou', 'bahia_casa_aberta', 'bahia_casa_expulsos',
    'bahia_comerciante_doou', 'bahia_comerciante_manso', 'bahia_comerciante_pedido', 'bahia_comerciante_raiva',
    'bahia_coracao_dica', 'bahia_coracao_vencido', 'bahia_cruzeiro', 'bahia_dulce_chamou', 'bahia_dulce_conheceu',
    'bahia_dulce_esquecidos', 'bahia_enfermaria', 'bahia_entrou', 'bahia_esquecidos_todos',
    'bahia_galinheiro_esteiras', 'bahia_galinheiro_licenca', 'bahia_galinheiro_limpo', 'bahia_galinheiro_todos',
    'bahia_hospital_entrou', 'bahia_menino_abrigado', 'bahia_passantes_empurram', 'bahia_piedade_aperfeicoada',
    'bahia_restaurada', 'bahia_sala_milagres', 'bahia_saveiro_creta',
  ],
  /** Creta. */
  creta: [
    'creta_aristarco_conheceu', 'creta_conselho', 'creta_conselho_calado', 'creta_conselho_ira',
    'creta_conselho_manso', 'creta_entrou', 'creta_julio_conheceu', 'creta_laseia_entrou',
    'creta_laseia_velho_conheceu', 'creta_lucas_conheceu', 'creta_nauclero_conheceu', 'creta_pastor_conheceu',
    'creta_paulo_conheceu', 'creta_paulo_no_cais', 'creta_pescador_conheceu', 'creta_piloto_conheceu',
  ],
  /** O navio na tempestade. */
  navio: [
    'navio_ancoras', 'navio_anjo', 'navio_anjo_tocou', 'navio_bote', 'navio_brigas', 'navio_carga', 'navio_cintado',
    'navio_entrou', 'navio_fuga', 'navio_fuga_vista_tocou', 'navio_gritou', 'navio_pao', 'navio_pao_tocou',
    'navio_sonda', 'navio_sonda_1',
  ],
  /** O naufrágio. */
  naufragio: [
    'naufragio_dica_brasa', 'naufragio_encalhou', 'naufragio_ira_dica', 'naufragio_ira_vencida', 'naufragio_presos',
    'naufragio_presos_calado', 'naufragio_presos_ira', 'naufragio_presos_manso',
  ],
  /** Malta. */
  malta: [
    'malta_boatos', 'malta_curas', 'malta_entrou', 'malta_fogo', 'malta_pai_curado', 'malta_pai_rezar',
    'malta_publio', 'malta_todos_no_patio', 'malta_tres_meses', 'malta_vibora', 'malta_vibora_correu',
    'malta_vibora_esperou', 'malta_vibora_julgou',
  ],
  /** O ermo entre as regiões (mundo aberto). */
  ermo: [
    'ermo_boaviagem', 'ermo_cristovao', 'ermo_cruzeiro', 'ermo_guia',
  ],
} as const;

/** Famílias de flags: o prefixo e o que ele marca. */
export const FAMILIAS_DE_FLAGS = {
  dom_: 'Dom do Espírito Santo recebido (`dom_<id do dom>`; o Temor de Deus vem de graça e não tem flag).',
  graca_grande_: 'A graça grande do chefão já foi dada (`graca_grande_<id da sombra>`).',
  cidade_ajudou_: 'O peregrino socorreu o pobre da Cidade Dourada (`cidade_ajudou_<tomas|rita|beppo>`).',
  cidade_retribuiu_: 'O socorrido retribuiu (`cidade_retribuiu_<id>`).',
  cidade_pedra_: 'Pedra levada a São Damião (`cidade_pedra_<n>`, de 1 a PEDRAS_DAMIAO).',
  cidade_isca_: 'Isca de ouro apanhada (`cidade_isca_<n>`).',
  bahia_recolhido_: 'Enfermo da Bahia levado ao abrigo (`bahia_recolhido_<id do enfermo>`).',
  bahia_galinheiro_: 'Sujeira do galinheiro limpa (`bahia_galinheiro_<id em SUJEIRAS>`); há também etapas fixas com o mesmo prefixo.',
  bahia_esteira_: 'Esteira estendida para o enfermo (`bahia_esteira_<id do enfermo>`).',
  bahia_leito_: 'Enfermo deitado no leito (`bahia_leito_<id do enfermo>`).',
  navio_briga_: 'Briga apartada no navio (`navio_briga_<1-3>`).',
  navio_cabo_: 'Cabo passado sob o casco (`navio_cabo_<1-3>`).',
  navio_ancora_: 'Âncora lançada (`navio_ancora_<1-4>`).',
  navio_lancou_: 'Fardo de carga lançado ao mar (`navio_lancou_<1-5>`).',
  malta_boato_: 'Boato ouvido de um morador de Malta (`malta_boato_<id do morador>`).',
  malta_enfermo_: 'Enfermo de Malta avisado (`malta_enfermo_<id>`).',
  malta_feixe_: 'Feixe de gravetos apanhado (`malta_feixe_<k>`, a partir de 0).',
  malta_lancou_: 'Feixe lançado ao fogo (`malta_lancou_<1-5>`).',
} as const;

export type FlagFixa = (typeof FLAGS_FIXAS)[keyof typeof FLAGS_FIXAS][number];
export type FamiliaDeFlag = keyof typeof FAMILIAS_DE_FLAGS;
/** Uma flag da história: fixa, ou prefixo de família seguido do id. */
export type Flag = FlagFixa | `${FamiliaDeFlag}${string}`;

const FIXAS = new Set<string>(Object.values(FLAGS_FIXAS).flat());
const PREFIXOS = Object.keys(FAMILIAS_DE_FLAGS);

/** Consulta de flag que os módulos de região recebem do jogo. */
export type TemFlag = (flag: Flag) => boolean;

/** A string é uma flag registrada (fixa, ou família com um id simples depois do prefixo)? */
export function ehFlag(s: string): s is Flag {
  return FIXAS.has(s) || PREFIXOS.some((p) => s.startsWith(p) && /^[a-z0-9_]+$/.test(s.slice(p.length)));
}
