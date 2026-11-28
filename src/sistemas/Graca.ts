import * as THREE from 'three';
import { colunaDeLuz } from '../mundo/Cenario';
import { type Sistema, Parte } from './Sistema';

/** A graça recebida: a coluna de luz que desce sobre o peregrino, o som e o aviso. */
export class SistemaGraca extends Parte implements Sistema {
  coluna = colunaDeLuz();
  tempoColuna = -1;

  atualizar(dt: number) {
    this.atualizarColuna(dt);
  }

  atualizarColuna(dt: number) {
    if (this.tempoColuna < 0) return;
    this.tempoColuna += dt;
    const t = this.tempoColuna;
    this.coluna.visible = true;
    this.coluna.position.copy(this.ctx.peregrino.pos);
    (this.coluna.material as THREE.MeshBasicMaterial).opacity = Math.min(1, t * 3) * Math.max(0, 1 - (t - 1) / 1.2) * 0.55;
    this.coluna.scale.set(1 + t * 0.1, 1, 1 + t * 0.1);
    if (t > 2.2) {
      this.tempoColuna = -1;
      this.coluna.visible = false;
    }
  }

  /** Uma graça recebida (não conquistada): a luz desce, o som da graça e o aviso. */
  receberGraca(aviso: string) {
    this.ctx.estado.gracas += 1;
    this.ctx.estado.salvar();
    this.ctx.efeitos.ouro = 0.9;
    this.ctx.som.graca();
    this.tempoColuna = 0;
    this.ctx.hud.anunciar(`✦ ${aviso} · uma graça (G)`, 3);
  }
}
