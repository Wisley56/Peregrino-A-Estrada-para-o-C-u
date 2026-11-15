import * as THREE from 'three';
import type { Povoamento } from '../fauna/Fauna';
import { Fisica } from '../entidades/Peregrino';
import { Sombra } from '../entidades/Sombra';
import type { FonteMapa } from '../ui/Minimapa';
import type { CapelaRegional } from './Capela';

/** Algo em que a mira pode travar (sombras, braseiros apagados...). */
export interface Alvo {
  pos: THREE.Vector3;
  centro(destino?: THREE.Vector3): THREE.Vector3;
  readonly ativa: boolean;
}

export type IdArea = 'vale' | 'cripta' | 'deserto' | 'meiodia' | 'cidade' | 'palacio' | 'bahiabaixa' | 'bahiaalta' | 'creta' | 'navio' | 'naufragio';
export const AREAS: IdArea[] = ['vale', 'cripta', 'deserto', 'meiodia', 'cidade', 'palacio', 'bahiabaixa', 'bahiaalta', 'creta', 'navio', 'naufragio'];

/** Um lugar jogável com chão, obstáculos e inimigos próprios. */
export interface Area extends Fisica {
  readonly id: IdArea;
  readonly grupo: THREE.Group;
  readonly sombras: Sombra[];
  /** Alvos além das sombras (ex.: braseiros). */
  alvos?(): Alvo[];
  /** Um projétil de luz chegou em `p`; devolve true se algo da área o absorveu. */
  atingirLuz?(p: THREE.Vector3): boolean;
  /** O cajado golpeou a partir de `de`, olhando para `frente`; devolve true se algo da área (não uma sombra) caiu. */
  golpear?(de: THREE.Vector3, frente: THREE.Vector3): boolean;
  atualizar?(dt: number, jogador: THREE.Vector3): void;
  /**
   * Altura do que é maciço para a câmera e para a mira (terreno mais construções). Sem ela, vale `altura`.
   * A câmera não entra nas casas e a mira para nas paredes.
   */
  alturaCamera?(x: number, z: number): number;
  /** O chão visto de cima, para o minimapa. */
  fonteMapa(): FonteMapa;
  /** A capela da região (confissão e Eucaristia), se houver. */
  readonly capela?: CapelaRegional;
  /** Quem vive na região (fauna do Veloren). */
  povoamento?(): Povoamento[];
}
