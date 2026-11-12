import { Story } from 'inkjs';
import roteiro from '../dialogos/peregrino.ink';
import { falante, type Falante } from './Falantes';

/** O que o jogo oferece ao roteiro. O save (Estado) continua sendo a fonte da verdade. */
export interface ContextoDialogo {
  tem(flag: string): boolean;
  marcar(flag: string): void;
  nivel(dom: string): number;
  valor(chave: string): number;
  nome(): string;
  feminino(): boolean;
  /** Efeito de jogo pedido pelo roteiro com `~ evento("nome")`. */
  evento(nome: string): void;
}

/** Uma fala pronta para a caixa de diálogo. */
export interface Passo {
  /** Id do falante (chave do retrato), ou null em narração. */
  id: string | null;
  falante: Falante | null;
  texto: string;
  /** Segundos com a caixa fechada antes desta fala (tag `#pausa:1.4`). */
  pausa: number;
  /** Escolhas que aparecem depois desta fala. */
  escolhas: string[];
}

/** Quem mostra as falas (o Hud). */
export interface Palco {
  conduzir(fonte: (escolha?: number) => Passo | null, aoTerminar: () => void): void;
}

const LINHA = /^([a-z_]+):\s*(.*)$/s;

/**
 * Executa os roteiros Ink compilados no build. Uma só história para o jogo todo: cada conversa
 * é um nó (`antao`, `vale_altar`…) tocado com `tocar`. Conversas pedidas durante outra entram na fila.
 */
export class Dialogos {
  private historia: Story;
  private fila: { no: string; fim?: () => void }[] = [];
  private tocando = false;

  constructor(
    private palco: Palco,
    ctx: ContextoDialogo,
  ) {
    this.historia = new Story(roteiro);
    const h = this.historia;
    h.onError = (msg) => console.error(`[ink] ${msg}`);
    // getters puros podem ser avaliados na leitura antecipada do Ink; efeitos, não
    h.BindExternalFunction('tem', (f: string) => ctx.tem(f), true);
    h.BindExternalFunction('nivel', (d: string) => ctx.nivel(d), true);
    h.BindExternalFunction('valor', (k: string) => ctx.valor(k), true);
    h.BindExternalFunction('nome', () => ctx.nome(), true);
    h.BindExternalFunction('g', (m: string, f: string) => (ctx.feminino() ? f : m), true);
    h.BindExternalFunction('marcar', (f: string) => ctx.marcar(f), false);
    h.BindExternalFunction(
      'primeira',
      (f: string) => {
        const nova = !ctx.tem(f);
        if (nova) ctx.marcar(f);
        return nova;
      },
      false,
    );
    h.BindExternalFunction('evento', (n: string) => ctx.evento(n), false);
  }

  /**
   * Troca de falante durante a conversa: `{ padre: 'frei_leao' }` faz as falas `padre:` do roteiro comum
   * da confissão saírem com o nome e o retrato do confessor da região.
   */
  apelidos: Record<string, string> = {};

  get ocupado() {
    return this.tocando;
  }

  /** Toca a conversa do nó `no`; `fim` roda quando ela acaba. */
  tocar(no: string, fim?: () => void) {
    if (this.tocando) {
      this.fila.push({ no, fim });
      return;
    }
    this.tocando = true;
    this.historia.ChoosePathString(no);
    this.palco.conduzir(
      (escolha) => this.proximo(escolha),
      () => {
        this.tocando = false;
        fim?.();
        const seguinte = this.fila.shift();
        if (seguinte) this.tocar(seguinte.no, seguinte.fim);
      },
    );
  }

  /** Esvazia a fila e interrompe a conversa (ao voltar à tela inicial). */
  encerrar() {
    this.fila = [];
    this.tocando = false;
  }

  private proximo(escolha?: number): Passo | null {
    const h = this.historia;
    if (escolha !== undefined) h.ChooseChoiceIndex(escolha);
    while (h.canContinue) {
      const linha = (h.Continue() ?? '').trim();
      if (!linha) continue;
      const tags = h.currentTags ?? [];
      const m = LINHA.exec(linha);
      if (m && this.apelidos[m[1]]) m[1] = this.apelidos[m[1]];
      const quem = m ? falante(m[1]) : null;
      if (import.meta.env.DEV && !quem) console.warn(`[ink] fala sem falante conhecido: "${linha}"`);
      const pausa = Number(tags.find((t) => t.startsWith('pausa:'))?.slice(6) ?? 0);
      return {
        id: quem && m ? m[1] : null,
        falante: quem,
        texto: quem && m ? m[2] : linha,
        pausa: Number.isFinite(pausa) ? pausa : 0,
        escolhas: h.canContinue ? [] : h.currentChoices.map((c) => c.text),
      };
    }
    // escolhas logo no começo de um nó, sem fala antes delas
    if (h.currentChoices.length) return { id: null, falante: null, texto: '', pausa: 0, escolhas: h.currentChoices.map((c) => c.text) };
    return null;
  }
}
