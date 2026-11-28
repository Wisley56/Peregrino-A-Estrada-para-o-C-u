import type { Contexto } from '../jogo/Contexto';

/**
 * Uma parte do jogo que recebe o contexto compartilhado (os sistemas e os módulos de região). Os campos de quem
 * estende já podem usar `this.ctx` na inicialização.
 */
export abstract class Parte {
  constructor(readonly ctx: Contexto) {}
}

/**
 * Um sistema do jogo (combate, oração, viagem...). O `Jogo` chama `atualizar` a cada quadro na ordem que ele define;
 * na queda e na volta ao título, cada sistema zera o que é seu.
 */
export interface Sistema {
  atualizar?(dt: number): void;
  /** O peregrino caiu sem corações e volta ao último descanso. */
  aoMorrer?(): void;
  /** O jogo voltou à tela inicial. */
  aoVoltarAoTitulo?(): void;
}
