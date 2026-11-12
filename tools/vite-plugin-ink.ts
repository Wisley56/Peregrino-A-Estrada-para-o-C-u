import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { Compiler, CompilerOptions } from 'inkjs/full';

/**
 * Compila roteiros Ink (.ink) no build, como os estúdios fazem com o inklecate:
 * o jogo recebe só o formato de execução do Ink, pronto, sem compilar nada no navegador.
 *
 * - `import roteiro from './dialogos/peregrino.ink'` devolve o JSON compilado (string).
 * - INCLUDE resolve a partir da pasta do arquivo principal; cada incluído é observado pelo
 *   servidor de desenvolvimento, então editar uma fala recarrega o jogo.
 * - Erro de roteiro (nó inexistente, desvio quebrado, função não declarada) derruba o build
 *   com arquivo e linha; avisos aparecem no terminal.
 */
export function ink(): Plugin {
  return {
    name: 'peregrino-ink',
    enforce: 'pre',
    transform(_codigo, id) {
      if (!id.endsWith('.ink')) return null;
      const arquivo = id.split('?')[0];
      const pasta = path.dirname(arquivo);
      const incluidos: string[] = [];
      const erros: string[] = [];
      const avisos: string[] = [];
      const fileHandler = {
        ResolveInkFilename: (nome: string) => path.resolve(pasta, nome),
        LoadInkFileContents: (caminho: string) => {
          incluidos.push(caminho);
          return fs.readFileSync(caminho, 'utf8');
        },
      };
      const opcoes = new CompilerOptions(
        arquivo,
        [],
        false,
        (mensagem: string, tipo: number) => (tipo === 2 ? erros : avisos).push(mensagem),
        fileHandler,
      );
      const compilador = new Compiler(fs.readFileSync(arquivo, 'utf8'), opcoes);
      let historia = null;
      try {
        historia = compilador.Compile();
      } catch (e) {
        if (!erros.length) erros.push(String(e));
      }
      for (const a of avisos) this.warn(a);
      for (const caminho of incluidos) this.addWatchFile(caminho);
      if (erros.length || !historia) this.error(`Roteiro Ink com erro:\n  ${erros.join('\n  ')}`);
      const json = historia.ToJson();
      if (!json) this.error('O Ink não gerou o roteiro compilado.');
      return { code: `export default ${JSON.stringify(json)};`, map: null };
    },
  };
}
