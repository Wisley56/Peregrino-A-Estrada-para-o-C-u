/**
 * Registro dos eventos que os roteiros Ink pedem ao jogo com `~ evento("nome")` (tratados em `Jogo.eventoDialogo`).
 * Como as flags (`Flags.ts`): o tipo `EventoInk` fecha o TypeScript, e o plugin do Ink derruba o build se um `.ink`
 * pedir um evento que não está aqui. Este arquivo não importa nada do jogo: o build o lê em Node.
 */

/** Eventos fixos, por região. */
export const EVENTOS_FIXOS = {
  /** Do caminho todo. */
  geral: ['absolvicao', 'dom_ciencia'],
  /** Cidade Dourada. */
  cidade: ['dom_piedade', 'curar_leproso', 'pacto_lobo'],
  /** Bahia. */
  bahia: ['carregar_enfermo', 'carregar_menino', 'expulsos', 'comerciante_sai', 'dulce_galinheiro', 'passagem', 'piedade_aperfeicoada', 'doacao'],
  /** Creta. */
  creta: ['paulo_ao_cais', 'conselho'],
  /** O navio na tempestade. */
  navio: ['bote', 'briga', 'anjo', 'sonda', 'cortar_bote', 'pao', 'amanhecer'],
  /** O naufrágio. */
  naufragio: ['presos'],
  /** Malta. */
  malta: ['vibora_lanca', 'vibora_prende', 'vibora_sacode', 'vibora_fim', 'dom_conselho', 'boato', 'hospedar', 'rezar_pai', 'curas', 'tres_meses'],
} as const;

/** Famílias de eventos: o prefixo e o que vem depois dele. */
export const FAMILIAS_DE_EVENTOS = {
  viajar_: 'Viaja para um ponto de viagem já descoberto (`viajar_<id em PONTOS_DE_VIAGEM>`).',
  socorrer_: 'Socorre um pobre da Cidade Dourada (`socorrer_<tomas|rita|beppo>`).',
  doar_: 'Dá o ouro a um pobre da Cidade Dourada (`doar_<id>`).',
  retribuir_: 'O socorrido retribui e devolve as forças (`retribuir_<id>`, inclusive `leproso`).',
  enfermo_: 'Avisa um enfermo de Malta (`enfermo_<id>`).',
} as const;

export type EventoFixo = (typeof EVENTOS_FIXOS)[keyof typeof EVENTOS_FIXOS][number];
export type FamiliaDeEvento = keyof typeof FAMILIAS_DE_EVENTOS;
/** Um evento pedido pelo Ink: fixo, ou prefixo de família seguido do id. */
export type EventoInk = EventoFixo | `${FamiliaDeEvento}${string}`;

const FIXOS = new Set<string>(Object.values(EVENTOS_FIXOS).flat());
const PREFIXOS = Object.keys(FAMILIAS_DE_EVENTOS);

/** A string é um evento registrado? */
export function ehEventoInk(s: string): s is EventoInk {
  return FIXOS.has(s) || PREFIXOS.some((p) => s.startsWith(p) && /^[a-z0-9_]+$/.test(s.slice(p.length)));
}
