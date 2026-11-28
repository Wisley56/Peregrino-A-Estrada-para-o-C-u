import { ehFlag } from './Flags';
import { ehEventoInk } from './EventosInk';

/** Algo que um roteiro usa e não está nos registros. */
export interface ForaDoRegistro {
  tipo: 'flag' | 'evento';
  nome: string;
  linha: number;
}

/**
 * O que um roteiro Ink usa e não está nos registros, com a linha: flags lidas ou gravadas (`tem("x")`, `marcar("x")`,
 * `primeira("x")`, ver `Flags.ts`) e eventos pedidos ao jogo (`evento("x")`, ver `EventosInk.ts`). Comentários e
 * declarações `EXTERNAL` ficam de fora. Usado pelo plugin do Ink no build (`tools/vite-plugin-ink.ts`) e pelos testes.
 */
export function foraDosRegistros(texto: string): ForaDoRegistro[] {
  const fora: ForaDoRegistro[] = [];
  texto.split(/\r?\n/).forEach((l, i) => {
    if (/^\s*(\/\/|EXTERNAL\b)/.test(l)) return;
    for (const m of l.matchAll(/\b(?:tem|marcar|primeira)\(\s*"([^"]*)"\s*\)/g)) if (!ehFlag(m[1])) fora.push({ tipo: 'flag', nome: m[1], linha: i + 1 });
    for (const m of l.matchAll(/\bevento\(\s*"([^"]*)"\s*\)/g)) if (!ehEventoInk(m[1])) fora.push({ tipo: 'evento', nome: m[1], linha: i + 1 });
  });
  return fora;
}
