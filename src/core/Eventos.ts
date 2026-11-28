import type { IdArea } from '../mundo/Area';
import type { Flag } from '../historia/Flags';
import type { EventoInk } from '../historia/EventosInk';

/**
 * Os acontecimentos do jogo que outras partes podem querer saber, com o que cada um traz. Os sistemas e os módulos
 * de região (a divisão do `Jogo.ts`) se falam por aqui, sem um conhecer o outro.
 */
export interface MapaDeEventos {
  /** Uma flag da história foi marcada (por \`Jogo.marcar\`, pelo TypeScript ou pelo Ink). */
  flagMarcada: { flag: Flag };
  /** Uma sombra foi vencida; \`chefao\` quando é um dos chefões-vícios. */
  sombraVencida: { id: string; chefao: boolean };
  /** O peregrino passou a estar numa área (a pé, a nado, por porta ou por viagem). */
  entrouNaArea: { de: IdArea; para: IdArea };
  /** Um roteiro Ink pediu um efeito de jogo com \`~ evento("nome")\`. */
  eventoInk: { nome: EventoInk };
  /** O peregrino caiu sem corações. */
  morreu: Record<string, never>;
  /** O jogo voltou para a tela inicial. */
  voltouAoTitulo: Record<string, never>;
}

export type NomeDoEvento = keyof MapaDeEventos;
type Ouvinte<N extends NomeDoEvento> = (dados: MapaDeEventos[N]) => void;

/** Barramento de eventos tipado: \`emitir\` só aceita o que \`MapaDeEventos\` declara, com os dados certos. */
export class Eventos {
  private ouvintes: { [N in NomeDoEvento]?: Ouvinte<N>[] } = {};

  /** Passa a ouvir o evento; devolve a função que para de ouvir. */
  ouvir<N extends NomeDoEvento>(nome: N, fn: Ouvinte<N>): () => void {
    const lista = (this.ouvintes[nome] ??= []) as Ouvinte<N>[];
    lista.push(fn);
    return () => {
      const i = lista.indexOf(fn);
      if (i >= 0) lista.splice(i, 1);
    };
  }

  emitir<N extends NomeDoEvento>(nome: N, dados: MapaDeEventos[N]) {
    // copia a lista: um ouvinte pode deixar de ouvir (ou outro começar) no meio da entrega
    for (const fn of [...((this.ouvintes[nome] ?? []) as Ouvinte<N>[])]) fn(dados);
  }
}
