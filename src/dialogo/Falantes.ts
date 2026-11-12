/**
 * Quem pode falar nos roteiros (.ink). A fala `antao: Paz a você` usa o id `antao`.
 * Um id fora desta tabela é erro de roteiro: aparece no console em desenvolvimento.
 */
export interface Falante {
  /** Nome mostrado na caixa de diálogo. */
  nome: string;
  /** Estilo da caixa: o Espírito Santo fala em luz dourada, sem retrato (GDD 8). */
  estilo?: 'espirito' | 'inscricao' | 'vicio';
}

export const FALANTES = {
  espirito: { nome: 'Espírito Santo', estilo: 'espirito' },
  inscricao: { nome: 'Inscrição', estilo: 'inscricao' },
  placa: { nome: 'Placa', estilo: 'inscricao' },
  antao: { nome: 'Santo Antão' },
  mamom: { nome: 'Mamom', estilo: 'vicio' },
  acedia: { nome: 'Acídia', estilo: 'vicio' },
  padre: { nome: 'Padre' },
  francisco: { nome: 'São Francisco' },
  frei_leao: { nome: 'Frei Leão' },
  leproso: { nome: 'O leproso' },
  tomas: { nome: 'Tomás' },
  rita: { nome: 'Rita' },
  beppo: { nome: 'Beppo' },
  mercador: { nome: 'Mercador' },
  gula: { nome: 'Gula', estilo: 'vicio' },
} satisfies Record<string, Falante>;

export type IdFalante = keyof typeof FALANTES;

export function falante(id: string): Falante | null {
  return (FALANTES as Record<string, Falante>)[id] ?? null;
}
