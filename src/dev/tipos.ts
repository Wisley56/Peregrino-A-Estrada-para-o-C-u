/**
 * Contrato entre o jogo e o painel de desenvolvedor. Só tipos: nada daqui vai para o build de produção.
 *
 * O painel não mexe nos campos privados do `Jogo`. Ele recebe, por `Jogo.ganchosDev()`, um conjunto pequeno de
 * operações com nome (ir para um lugar, preparar um chefão, recarregar o progresso...). Assim o jogo continua
 * dono das próprias regras e o painel não quebra a cada refatoração.
 */
import type * as THREE from 'three';
import type { Estado } from '../core/Estado';
import type { Peregrino } from '../entidades/Peregrino';
import type { Sombra } from '../entidades/Sombra';
import type { IdArea } from '../mundo/Area';

/** Opções que o jogo consulta a cada quadro. `Jogo.dev` só deixa de ser null no modo dev. */
export interface OpcoesDev {
  painelAberto: boolean;
  /** Nada fere o peregrino. */
  invencivel: boolean;
  /** A energia espiritual fica sempre cheia. */
  energiaInfinita: boolean;
  /** Multiplica a velocidade de andar e correr. */
  velocidade: number;
  /** 0 congela o mundo (a câmera continua livre); 0,25 é câmera lenta. */
  escalaTempo: number;
  /** Com o tempo congelado, quantos quadros ainda avançar (um por vez). */
  passos: number;
}

export interface PontoDev {
  nome: string;
  pos: THREE.Vector3;
  /** Para onde o peregrino olha ao chegar (rad, como `Peregrino.rumo`). */
  rumo: number;
}

export interface AreaDev {
  id: IdArea;
  nome: string;
  pontos: PontoDev[];
}

export interface ChefeDev {
  id: string;
  nome: string;
  area: IdArea;
  /** A sombra-chefão em cena (null se já foi vencida e não está na área). */
  entidade(): Sombra | null;
  lutando(): boolean;
  vencido(): boolean;
  /** Desfaz a vitória, cumpre o que a arena exige e põe o peregrino na entrada: a luta começa em seguida. */
  lutar(): void;
  /** Recomeça a luta em curso, como numa queda, mas sem morrer. */
  reiniciar(): void;
  /** Leva o chefão à metade da vida (fase 2). */
  fase2(): void;
  /** Derrota o chefão agora, pelo mesmo caminho de uma vitória de verdade (graças, coração, diálogo). */
  vencer(): void;
}

/** Leitura rápida para o overlay (F3). */
export interface InfoDev {
  qps: number;
  area: IdArea;
  arfagem: number;
  guinada: number;
  chefe: string | null;
  travado: string | null;
  mira: THREE.Vector3;
  peso: number;
  torpor: number;
}

export interface GanchosDev {
  readonly estado: Estado;
  readonly peregrino: Peregrino;
  readonly renderer: THREE.WebGLRenderer;
  areas(): AreaDev[];
  /** O chão do mundo visto de cima (para conferir a geografia): o retângulo pedido, a `passo` metros por pixel. */
  mapaDoMundo(x0: number, z0: number, x1: number, z1: number, passo: number): HTMLCanvasElement;
  chefes(): ChefeDev[];
  info(): InfoDev;
  /** Vai a um ponto (troca de área com o véu, ou teleporta direto se já estiver nela). */
  irPara(area: IdArea, pos: THREE.Vector3, rumo?: number): void;
  /** Recria sombras, portas, NPCs e arenas a partir das flags e vitórias atuais. */
  recarregarProgresso(): void;
  /** Começa uma sessão sem espaço de jogo (nada é salvo), opcionalmente já numa área. */
  iniciarTeste(area?: IdArea): void;
  /** Cura corações e energia, tira peso e torpor. */
  curar(): void;
  /** Encerra o diálogo aberto. */
  pularDialogo(): void;
  /** Uma sombra comum vencida pelo caminho normal (graça, cor da região). */
  vencerSombra(s: Sombra): void;
  /** Sombras da área atual ainda de pé. */
  sombrasDaArea(): Sombra[];
}
