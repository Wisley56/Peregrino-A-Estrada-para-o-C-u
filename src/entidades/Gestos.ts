/**
 * Gestos de conversa dos NPCs, procedurais como a animação do peregrino: cada gesto é uma curva curta que
 * soma uma pose (tronco, cabeça e braços) por cima do que o NPC já faz (respirar, olhar para quem fala).
 *
 * O roteiro pede um gesto com a tag `#gesto:nome` na fala (o gesto é de quem fala) ou `#gesto:id=nome` (de
 * outro personagem em cena). Falas sem tag ganham só o "falar" de fundo: cabeça viva e, nas falas longas, uma
 * mão que acompanha a frase.
 *
 * Eixos (no espaço do personagem, que olha para +z): tronco.x > 0 inclina para a frente; cabeca.x > 0 olha para
 * baixo; braço.x < 0 leva a mão para a frente e para o alto; braço.z > 0 abre o braço para fora e < 0 o traz para
 * diante do peito (o mesmo sentido para os dois braços; a conversão para cada lado é feita na hora de aplicar).
 */
import * as THREE from 'three';
import type { Humano } from '../voxel/Humano';

export const GESTOS = [
  'sim', 'nao', 'inclinar', 'ceu', 'explicar', 'abencoar', 'acolher', 'triste', 'surpresa', 'rezar', 'pensar', 'peito',
] as const;
export type Gesto = (typeof GESTOS)[number];

export const ehGesto = (g: string): g is Gesto => (GESTOS as readonly string[]).includes(g);

/** Uma pose somada à de descanso. Ângulos em radianos; recuo em metros (negativo = para trás). */
interface Pose {
  troncoX: number;
  troncoZ: number;
  recuo: number;
  cabX: number;
  cabY: number;
  cabZ: number;
  /** Braço livre (o da mão sem objeto) e o outro. */
  livre: [number, number, number];
  outro: [number, number, number];
}

const zero = (): Pose => ({ troncoX: 0, troncoZ: 0, recuo: 0, cabX: 0, cabY: 0, cabZ: 0, livre: [0, 0, 0], outro: [0, 0, 0] });

interface DefGesto {
  /** Duração (s). */
  dur: number;
  /** Pose no instante u (0..1) do gesto; `t` é o tempo corrido, para tremidas e ritmos. */
  pose(p: Pose, u: number, t: number): void;
}

/** Sobe rápido, fica e desce no fim (para gestos que seguram uma pose). */
const sino = (u: number, sobe = 0.18, desce = 0.25) => suave(Math.min(1, u / sobe)) * suave(Math.min(1, (1 - u) / desce));
const suave = (x: number) => x * x * (3 - 2 * x);

const DEFS: Record<Gesto, DefGesto> = {
  // acena que sim: três toques de cabeça, o último mais leve
  sim: { dur: 1.1, pose: (p, u) => (p.cabX = Math.max(0, Math.sin(u * Math.PI * 3)) * 0.28 * (1 - u * 0.5)) },
  // balança a cabeça, sem pressa
  nao: { dur: 1.3, pose: (p, u) => ((p.cabY = Math.sin(u * Math.PI * 4) * 0.32 * sino(u, 0.1, 0.3)), (p.cabX = 0.06 * sino(u))) },
  // reverência: o corpo inteiro se inclina e a cabeça desce mais um pouco
  inclinar: {
    dur: 1.8,
    pose: (p, u) => {
      const k = sino(u, 0.3, 0.35);
      p.troncoX = 0.2 * k;
      p.cabX = 0.32 * k;
      p.livre = [-0.35 * k, 0, -0.1 * k];
      p.outro = [-0.35 * k, 0, -0.1 * k];
    },
  },
  // olhar o alto, os dois braços abertos para cima (a postura do orante)
  ceu: {
    dur: 2.6,
    pose: (p, u) => {
      const k = sino(u, 0.25, 0.3);
      p.cabX = -0.5 * k;
      p.troncoX = -0.06 * k;
      p.livre = [-2.3 * k, 0, 0.35 * k];
      p.outro = [-2.3 * k, 0, 0.35 * k];
    },
  },
  // a mão acompanha a frase, em batidas
  explicar: {
    dur: 2.2,
    pose: (p, u, t) => {
      const k = sino(u, 0.15, 0.3);
      p.livre = [(-0.95 + Math.sin(t * 5.5) * 0.18) * k, 0.25 * k, (0.12 + Math.sin(t * 3.1) * 0.08) * k];
      p.cabZ = Math.sin(t * 2.2) * 0.08 * k;
      p.troncoX = 0.04 * k;
    },
  },
  // a mão sobe e traça a cruz no ar: de cima para baixo, da esquerda para a direita
  abencoar: {
    dur: 3.0,
    pose: (p, u) => {
      const k = sino(u, 0.12, 0.18);
      const f = Math.min(1, Math.max(0, (u - 0.15) / 0.7)); // traço da cruz
      let x = -1.75, z = 0;
      if (f < 0.4) x = -2.05 + (f / 0.4) * 0.75; // de cima para baixo
      else if (f < 0.55) x = -1.3 - ((f - 0.4) / 0.15) * 0.4; // volta ao meio
      else z = Math.sin(((f - 0.55) / 0.45) * Math.PI * 2) * 0.32; // de um lado ao outro
      p.livre = [x * k, 0, z * k];
      p.cabX = 0.12 * k;
    },
  },
  // os braços se abrem para receber quem chega
  acolher: {
    dur: 2.2,
    pose: (p, u) => {
      const k = sino(u, 0.25, 0.3);
      p.livre = [-0.55 * k, 0, 0.95 * k];
      p.outro = [-0.55 * k, 0, 0.95 * k];
      p.troncoX = -0.05 * k;
      p.cabX = -0.08 * k;
    },
  },
  // cabeça baixa e ombros caídos
  triste: {
    dur: 2.6,
    pose: (p, u) => {
      const k = sino(u, 0.3, 0.3);
      p.cabX = 0.42 * k;
      p.troncoX = 0.08 * k;
      p.livre = [-0.15 * k, 0, -0.12 * k];
      p.outro = [-0.15 * k, 0, -0.12 * k];
    },
  },
  // um passo atrás, as mãos sobem
  surpresa: {
    dur: 1.4,
    pose: (p, u) => {
      const k = sino(u, 0.08, 0.5);
      p.recuo = -0.14 * k;
      p.troncoX = -0.1 * k;
      p.cabX = -0.18 * k;
      p.livre = [-0.8 * k, 0, 0.3 * k];
      p.outro = [-0.8 * k, 0, 0.3 * k];
    },
  },
  // mãos postas diante do peito, cabeça inclinada
  rezar: {
    dur: 3.0,
    pose: (p, u) => {
      const k = sino(u, 0.2, 0.25);
      p.livre = [-1.25 * k, 0, -0.42 * k];
      p.outro = [-1.25 * k, 0, -0.42 * k];
      p.cabX = 0.3 * k;
      p.troncoX = 0.05 * k;
    },
  },
  // a mão no queixo, a cabeça de lado
  pensar: {
    dur: 2.4,
    pose: (p, u) => {
      const k = sino(u, 0.2, 0.25);
      p.livre = [-1.7 * k, 0, -0.5 * k];
      p.cabX = 0.12 * k;
      p.cabZ = 0.16 * k;
    },
  },
  // a mão no peito: humildade, sinceridade
  peito: {
    dur: 2.0,
    pose: (p, u) => {
      const k = sino(u, 0.2, 0.3);
      p.livre = [-1.2 * k, 0, -0.75 * k];
      p.troncoX = 0.06 * k;
      p.cabX = 0.12 * k;
    },
  },
};

/**
 * Toca os gestos de um humano. Guarda a pose de descanso dos braços e soma por cima a do gesto atual, com um
 * fio de "fala" de fundo enquanto o personagem está com a palavra.
 */
export class Gesticulador {
  private atual: { def: DefGesto; t: number } | null = null;
  private t = Math.random() * 10;
  /** Segundos restantes de fala (a caixa ainda escrevendo a frase dele). */
  private fala = 0;
  private longa = false;
  private pose = zero();
  private readonly baseD: THREE.Euler | null;
  private readonly baseE: THREE.Euler | null;
  private readonly baseRaiz: THREE.Vector3;
  /** Modelo inteiro (sem cabeça nem braços próprios): os gestos vão para o corpo, mais contidos. */
  private readonly inteiro: boolean;

  constructor(private h: Humano) {
    this.baseD = h.bracoD?.rotation.clone() ?? null;
    this.baseE = h.bracoE?.rotation.clone() ?? null;
    this.baseRaiz = h.raiz.position.clone();
    this.inteiro = h.cabeca.children.length === 0;
  }

  get ocupado() {
    return this.atual !== null;
  }

  tocar(g: Gesto) {
    this.atual = { def: DEFS[g], t: 0 };
  }

  /** A fala dele começou: `segundos` é quanto a caixa leva para escrever a frase. */
  falar(segundos: number) {
    this.fala = segundos;
    this.longa = segundos > 1.4;
    // frase longa sem gesto pedido: a mão acompanha
    if (this.longa && !this.atual && this.h.bracoD) this.tocar('explicar');
  }

  calar() {
    this.fala = 0;
  }

  /**
   * Avança e aplica a pose. A cabeça recebe só o que o gesto soma (`cabX`, `cabY`, `cabZ` são devolvidos para o
   * NPC juntar com o olhar dele).
   */
  atualizar(dt: number): { cabX: number; cabY: number; cabZ: number } {
    this.t += dt;
    this.fala = Math.max(0, this.fala - dt);
    const p = zero();
    if (this.atual) {
      const a = this.atual;
      a.t += dt;
      const u = a.t / a.def.dur;
      if (u >= 1) this.atual = null;
      else a.def.pose(p, u, this.t);
    }
    // a fala de fundo: a cabeça acompanha as sílabas
    if (this.fala > 0) {
      const k = Math.min(1, this.fala * 3);
      p.cabX += Math.sin(this.t * 7.3) * 0.045 * k;
      p.cabZ += Math.sin(this.t * 3.7) * 0.035 * k;
    }
    // suaviza a chegada de cada pose (um gesto que começa por cima de outro não salta)
    const s = Math.min(1, dt * 14);
    const q = this.pose;
    for (const k of ['troncoX', 'troncoZ', 'recuo', 'cabX', 'cabY', 'cabZ'] as const) q[k] += (p[k] - q[k]) * s;
    for (let i = 0; i < 3; i++) {
      q.livre[i] += (p.livre[i] - q.livre[i]) * s;
      q.outro[i] += (p.outro[i] - q.outro[i]) * s;
    }

    const h = this.h;
    if (this.inteiro) {
      // santos de modelo único: o corpo todo inclina e vira um pouco no lugar da cabeça
      h.raiz.rotation.x = q.troncoX + q.cabX * 0.35;
      h.raiz.rotation.z = q.troncoZ + q.cabZ * 0.4;
      h.raiz.rotation.y = q.cabY * 0.3;
    } else {
      h.raiz.rotation.x = q.troncoX;
      h.raiz.rotation.z = q.troncoZ;
    }
    h.raiz.position.z = this.baseRaiz.z + q.recuo;
    // o braço livre é o da mão sem objeto (com o cajado na direita, gesticula com a esquerda)
    const livreDireito = h.maoOcupada !== 'd';
    const [bl, bo] = livreDireito ? [h.bracoD, h.bracoE] : [h.bracoE, h.bracoD];
    const [basel, baseo] = livreDireito ? [this.baseD, this.baseE] : [this.baseE, this.baseD];
    // abrir (z > 0) é girar para -x no braço direito e para +x no esquerdo
    const abrir = (direito: boolean) => (direito ? -1 : 1);
    if (bl && basel) bl.rotation.set(basel.x + q.livre[0], basel.y + q.livre[1], basel.z + q.livre[2] * abrir(livreDireito));
    if (bo && baseo) bo.rotation.set(baseo.x + q.outro[0], baseo.y + q.outro[1], baseo.z + q.outro[2] * abrir(!livreDireito));
    return this.inteiro ? { cabX: 0, cabY: 0, cabZ: 0 } : { cabX: q.cabX, cabY: q.cabY, cabZ: q.cabZ };
  }
}
