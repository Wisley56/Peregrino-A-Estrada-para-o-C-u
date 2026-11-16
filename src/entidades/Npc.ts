import * as THREE from 'three';
import type { IdFalante } from '../dialogo/Falantes';
import { registrarRetrato } from '../dialogo/Retratos';
import { montarHumano, type Figurino, type Humano } from '../voxel/Humano';
import { Gesticulador, type Gesto } from './Gestos';

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
  /** Todos os NPCs criados (de todas as áreas), para achar o corpo de quem fala no roteiro. */
  private static todos: Npc[] = [];

  /** O NPC visível mais perto de `perto` que fala como `falante` (até `raio` metros), ou null. */
  static doFalante(falante: string, perto: THREE.Vector3, raio = 14): Npc | null {
    let melhor: Npc | null = null;
    let d2 = raio * raio;
    for (const n of Npc.todos) {
      if (n.def.falante !== falante || !n.visivel) continue;
      const d = n.pos.distanceToSquared(perto);
      if (d < d2) {
        d2 = d;
        melhor = n;
      }
    }
    return melhor;
  }

  readonly raiz = new THREE.Group();
  readonly gestos: Gesticulador;
  readonly pos: THREE.Vector3;
  readonly humano: Humano;
  /** Verdadeiro enquanto a conversa com ele está aberta. */
  falando = false;
  /** Andando para algum lugar: o corpo segue o caminho, não o peregrino. */
  andando = false;
  /** Não vira o corpo para ninguém (quem está deitado num leito). */
  fixo = false;
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
    this.gestos = new Gesticulador(this.humano);
    this.inclinacaoCabeca = this.humano.cabeca.rotation.x;
    Npc.todos.push(this);
  }

  /** Põe o NPC noutro lugar, virado para `rumo`. */
  colocar(p: THREE.Vector3, rumo = this.rumoBase) {
    this.pos.copy(p);
    this.raiz.position.copy(p);
    this.rumoBase = rumo;
    this.raiz.rotation.y = rumo;
    this.andando = false;
  }

  /**
   * Anda em linha reta até `destino` (sem física: quem chama escolhe um caminho livre), com o passo balançando um
   * pouco. `chao` dá a altura do chão em cada ponto. Devolve true quando chega.
   */
  andarPara(destino: THREE.Vector3, dt: number, chao: (x: number, z: number) => number, vel = 1.8) {
    const dx = destino.x - this.pos.x, dz = destino.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) {
      this.andando = false;
      this.raiz.position.copy(this.pos);
      return true;
    }
    const passo = Math.min(d, vel * dt);
    this.pos.x += (dx / d) * passo;
    this.pos.z += (dz / d) * passo;
    this.pos.y = chao(this.pos.x, this.pos.z);
    this.rumoBase = Math.atan2(dx, dz);
    this.andando = true;
    this.raiz.position.copy(this.pos);
    this.raiz.position.y += Math.abs(Math.sin(this.t * 8)) * 0.035;
    return false;
  }

  private inclinacaoCabeca: number;
  private olharY = 0;

  /** Está na cena (ele e todos os pais visíveis e ligados ao mundo). */
  get visivel() {
    let o: THREE.Object3D | null = this.raiz;
    for (; o; o = o.parent) {
      if (!o.visible) return false;
      if (o.type === 'Scene') return true;
    }
    return false;
  }

  /** Onde estão os olhos dele, no mundo (para a câmera de conversa). */
  olhos(destino = new THREE.Vector3()) {
    this.raiz.updateWorldMatrix(true, false);
    return destino.set(0, this.humano.alturaOlhos, 0).applyMatrix4(this.raiz.matrixWorld);
  }

  /** Começa uma fala dele: `segundos` é o tempo da caixa escrevendo; `gesto`, o pedido pelo roteiro. */
  fala(segundos: number, gesto?: Gesto) {
    if (gesto) this.gestos.tocar(gesto);
    this.gestos.falar(segundos);
  }

  /** A fala passou para outro: ele para de mexer a boca (e só escuta). */
  calar() {
    this.gestos.calar();
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    const dx = jogador.x - this.pos.x, dz = jogador.z - this.pos.z;
    const perto = dx * dx + dz * dz < ALCANCE_OLHAR * ALCANCE_OLHAR;
    const paraJogador = Math.atan2(dx, dz);
    // o corpo vira devagar; a cabeça vai na frente, até um limite
    const alvoCorpo = this.andando || this.fixo ? this.rumoBase : this.falando ? paraJogador : perto ? this.rumoBase + angulo(paraJogador - this.rumoBase) * 0.5 : this.rumoBase;
    this.raiz.rotation.y += angulo(alvoCorpo - this.raiz.rotation.y) * Math.min(1, dt * (this.falando ? 4 : 2));
    const cabeca = this.humano.cabeca;
    const alvoCabeca = perto ? THREE.MathUtils.clamp(angulo(paraJogador - this.raiz.rotation.y), -LIMITE_CABECA, LIMITE_CABECA) : Math.sin(this.t * 0.4) * 0.25;
    this.olharY += (alvoCabeca - this.olharY) * Math.min(1, dt * 5);
    // respiração e os gestos de conversa (a cabeça soma o gesto ao olhar)
    this.humano.corpo.scale.y = 1 + Math.sin(this.t * 1.6) * 0.008;
    const g = this.gestos.atualizar(dt);
    cabeca.rotation.x = this.inclinacaoCabeca + g.cabX;
    cabeca.rotation.y = this.olharY + g.cabY;
    cabeca.rotation.z = g.cabZ;
    cabeca.position.y = this.alturaPescoco + Math.max(0, g.cabX) * 0.012;
  }

}

function angulo(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
