import * as THREE from 'three';
import type { IdFalante } from '../dialogo/Falantes';
import { registrarRetrato } from '../dialogo/Retratos';
import { montarHumano, type Figurino, type Humano } from '../voxel/Humano';

/** Ficha de um personagem com quem se conversa. */
export interface DefNpc {
  /** Id único (também usado no save e no minimapa). */
  id: string;
  /** Quem fala nos roteiros. */
  falante: IdFalante;
  /** Nó do roteiro Ink tocado ao interagir. */
  no: string;
  /** Texto da interação ("F: falar com …"). Padrão: o nome do falante. */
  rotulo?: string;
  /** Aparência: uma ficha do construtor de humanos, ou um modelo próprio (santos com iconografia). */
  visual: Figurino | (() => Humano);
}

const ALCANCE_OLHAR = 9;
const LIMITE_CABECA = 1.0;

/**
 * Um NPC: respira, vira o corpo para o peregrino quando ele chega perto, acompanha com a cabeça
 * e gesticula enquanto fala. Não tem física própria; fica onde a área o pôs.
 */
export class Npc {
  readonly raiz = new THREE.Group();
  readonly pos: THREE.Vector3;
  readonly humano: Humano;
  /** Verdadeiro enquanto a conversa com ele está aberta. */
  falando = false;
  private t = Math.random() * 10;
  private rumoBase: number;
  private alturaPescoco: number;

  constructor(
    readonly def: DefNpc,
    pos: THREE.Vector3,
    rumo: number,
  ) {
    this.pos = pos.clone();
    this.rumoBase = rumo;
    const visual = def.visual;
    const fabrica = typeof visual === 'function' ? visual : () => montarHumano(visual);
    this.humano = fabrica();
    registrarRetrato(def.falante, fabrica);
    this.alturaPescoco = this.humano.cabeca.position.y;
    this.raiz.add(this.humano.raiz);
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.y = rumo;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    const dx = jogador.x - this.pos.x, dz = jogador.z - this.pos.z;
    const perto = dx * dx + dz * dz < ALCANCE_OLHAR * ALCANCE_OLHAR;
    const paraJogador = Math.atan2(dx, dz);
    // o corpo vira devagar; a cabeça vai na frente, até um limite
    const alvoCorpo = this.falando ? paraJogador : perto ? this.rumoBase + angulo(paraJogador - this.rumoBase) * 0.5 : this.rumoBase;
    this.raiz.rotation.y += angulo(alvoCorpo - this.raiz.rotation.y) * Math.min(1, dt * (this.falando ? 4 : 2));
    const cabeca = this.humano.cabeca;
    const alvoCabeca = perto ? THREE.MathUtils.clamp(angulo(paraJogador - this.raiz.rotation.y), -LIMITE_CABECA, LIMITE_CABECA) : Math.sin(this.t * 0.4) * 0.25;
    cabeca.rotation.y += (alvoCabeca - cabeca.rotation.y) * Math.min(1, dt * 5);
    // respiração; ao falar, um aceno leve de cabeça
    this.humano.corpo.scale.y = 1 + Math.sin(this.t * 1.6) * 0.008;
    const aceno = this.falando ? Math.sin(this.t * 7) * 0.05 : 0;
    cabeca.rotation.z = aceno * 0.4;
    cabeca.position.y = this.alturaPescoco + Math.max(0, aceno) * 0.02;
  }

}

function angulo(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
