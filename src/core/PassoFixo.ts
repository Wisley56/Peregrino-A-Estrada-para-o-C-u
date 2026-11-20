/**
 * Passo fixo para a física (o padrão do `FixedUpdate` dos motores de jogo): o tempo de cada quadro entra num
 * acumulador e a física avança em passos de tamanho fixo, quantos couberem. Assim o pulo, a queda e as colisões
 * dão o mesmo resultado a 30, 60 ou 144 quadros por segundo. O que sobra no acumulador (a fração de um passo) serve
 * para interpolar o que se desenha entre o passo anterior e o atual.
 *
 * Num quadro muito longo (a aba voltou do segundo plano, um engasgo), no máximo `maxPassos` passos rodam e o resto
 * do atraso é descartado: melhor o jogo andar um pouco devagar que travar tentando alcançar o relógio.
 */
export class PassoFixo {
  private acumulado = 0;

  constructor(
    readonly passo = 1 / 60,
    readonly maxPassos = 5,
  ) {}

  /**
   * Põe `dt` no acumulador e chama `passar(passo, i)` para cada passo que coube. Devolve a fração (0 a 1) do passo
   * seguinte já decorrida, para a interpolação.
   */
  avancar(dt: number, passar: (passo: number, i: number) => void): number {
    this.acumulado = Math.min(this.acumulado + Math.max(0, dt), this.passo * this.maxPassos);
    let i = 0;
    // a folga de 1e-9 evita perder um passo por erro de arredondamento (6 × 1/60 pode dar 0,09999…)
    while (this.acumulado >= this.passo - 1e-9) {
      passar(this.passo, i++);
      this.acumulado = Math.max(0, this.acumulado - this.passo);
    }
    return this.acumulado / this.passo;
  }

  /** Esquece o tempo acumulado (depois de um teleporte, de uma pausa, de trocar de área). */
  zerar() {
    this.acumulado = 0;
  }
}
