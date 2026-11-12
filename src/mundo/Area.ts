import * as THREE from 'three';
import { Fisica } from '../entidades/Peregrino';
import { Sombra } from '../entidades/Sombra';
import type { FonteMapa } from '../ui/Minimapa';

/** Algo em que a mira pode travar (sombras, braseiros apagados...). */
export interface Alvo {
  pos: THREE.Vector3;
  centro(destino?: THREE.Vector3): THREE.Vector3;
  readonly ativa: boolean;
}

export type IdArea = 'vale' | 'cripta' | 'deserto' | 'meiodia';
export const AREAS: IdArea[] = ['vale', 'cripta', 'deserto', 'meiodia'];

/** Um lugar jogável com chão, obstáculos e inimigos próprios. */
export interface Area extends Fisica {
  readonly id: IdArea;
  readonly grupo: THREE.Group;
  readonly sombras: Sombra[];
  /** Alvos além das sombras (ex.: braseiros). */
  alvos?(): Alvo[];
  /** Um projétil de luz chegou em `p`; devolve true se algo da área o absorveu. */
  atingirLuz?(p: THREE.Vector3): boolean;
  atualizar?(dt: number, jogador: THREE.Vector3): void;
  /** O chão visto de cima, para o minimapa. */
  fonteMapa(): FonteMapa;
}
