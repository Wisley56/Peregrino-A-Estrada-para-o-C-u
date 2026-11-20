/**
 * Relógio de cenas no tempo do jogo: "daqui a tantos segundos, faça isto". Substitui o `setTimeout` nas cenas.
 * O tempo do `setTimeout` é o do relógio de parede: corre com o jogo pausado, ignora a câmera lenta do modo dev e
 * dispara mesmo depois de voltar à tela inicial. A agenda só anda quando o jogo anda (`atualizar`), e `limpar`
 * cancela tudo de uma vez (ao sair para o título ou começar outro jogo).
 */
export class Agenda {
  private tempo = 0;
  private fila: { quando: number; ordem: number; fazer: () => void }[] = [];
  private ordem = 0;

  /** Agenda `fazer` para daqui a `segundos` de jogo. */
  depois(segundos: number, fazer: () => void) {
    this.fila.push({ quando: this.tempo + Math.max(0, segundos), ordem: this.ordem++, fazer });
  }

  /** Avança o relógio e roda, na ordem em que vencem, as tarefas vencidas (inclusive as que elas agendarem já vencidas). */
  atualizar(dt: number) {
    this.tempo += Math.max(0, dt);
    for (;;) {
      let i = -1;
      for (let k = 0; k < this.fila.length; k++) {
        const t = this.fila[k];
        if (t.quando <= this.tempo && (i < 0 || t.quando < this.fila[i].quando || (t.quando === this.fila[i].quando && t.ordem < this.fila[i].ordem))) i = k;
      }
      if (i < 0) return;
      const [t] = this.fila.splice(i, 1);
      t.fazer();
    }
  }

  /** Cancela tudo o que estava agendado. */
  limpar() {
    this.fila = [];
  }

  /** Quantas tarefas esperam a vez. */
  get pendentes() {
    return this.fila.length;
  }
}
