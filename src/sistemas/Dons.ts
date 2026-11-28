import { AJUSTES } from '../config/ajustes';
import { type Sistema, Parte } from './Sistema';

/** Os dons e os itens: a Ciência (E) e a Lamparina da Fé (L). */
export class SistemaDons extends Parte implements Sistema {
  /** Segundos que ainda restam do dom da Ciência ligado. */
  tempoCiencia = 0;
  lamparinaAcesa = false;

  /** Dom da Ciência (E): por alguns segundos, vê o que as coisas são de verdade. */
  usarCiencia() {
    if (!this.ctx.estado.flags.has('dom_ciencia') || this.tempoCiencia > 0) return;
    if (this.ctx.oracao.torpor > 0) {
      this.ctx.hud.anunciar('O torpor pesa demais. Segure R para rezar.', 1.8);
      return;
    }
    const nivel = this.ctx.estado.nivel('ciencia');
    const custo = nivel >= 3 ? AJUSTES.oracao.cienciaCustoNivel3 : AJUSTES.oracao.cienciaCusto;
    if (this.ctx.estado.energia < custo) {
      this.ctx.hud.anunciar(`A Ciência precisa de ${custo} de energia. Segure R para rezar.`, 2);
      return;
    }
    this.ctx.estado.energia -= custo;
    this.tempoCiencia = nivel >= 2 ? 11 : 8;
    this.ctx.som.ciencia();
    this.ctx.hud.mostrarDica(null);
  }

  atualizarCiencia(dt: number) {
    const tem = this.ctx.estado.flags.has('dom_ciencia');
    const ligada = this.tempoCiencia > 0;
    if (ligada) this.tempoCiencia = Math.max(0, this.tempoCiencia - dt);
    // o que a Ciência mostra em cada região (a rocha falsa do deserto, a Acídia no Poço)
    for (const m of this.ctx.modulos) m.ciencia?.(ligada);
    this.ctx.efeitos.ciencia = this.tempoCiencia > 0 ? Math.min(1, this.tempoCiencia / 0.6) : 0;
    this.ctx.hud.mostrarDom(
      tem ? (this.tempoCiencia > 0 ? `✧ Ciência · ${Math.ceil(this.tempoCiencia)} s` : '✧ Ciência · E') : null,
      this.tempoCiencia > 0,
    );
  }

  /** Ciência 5 (a verdade fere a mentira): +1 de dano com a Ciência ativa. */
  bonusDaVerdade() {
    return this.tempoCiencia > 0 && this.ctx.estado.nivel('ciencia') >= 5 ? 1 : 0;
  }

  atualizarLamparina() {
    const tem = this.ctx.estado.flags.has('lamparina');
    this.ctx.peregrino.segurarLamparina(tem && this.lamparinaAcesa, this.lamparinaAcesa);
    this.ctx.hud.mostrarItem(tem ? (this.lamparinaAcesa ? '🏮 Lamparina acesa · L' : '🏮 Lamparina · L') : null, this.lamparinaAcesa);
  }

  aoMorrer() {
    this.tempoCiencia = 0;
  }

  aoVoltarAoTitulo() {
    this.tempoCiencia = 0;
    this.lamparinaAcesa = false;
    this.atualizarCiencia(0);
  }
}
