import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';

/**
 * A chuva de tempestade: riscos que caem de lado com o vento, numa caixa de 44 m em volta do peregrino, e renascem
 * no alto quando passam do chão (`base`) ou saem da caixa. Serve ao navio e ao naufrágio.
 */
export class Chuva {
  readonly malha: THREE.LineSegments;
  private readonly gotas: Float32Array;
  private readonly sorte = aleatorio(2715);

  constructor(private readonly base: number, n = 1400) {
    this.gotas = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) this.repor(i, new THREE.Vector3(), true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.gotas, 3));
    this.malha = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xb8c4cc, transparent: true, opacity: 0.45 }));
    this.malha.frustumCulled = false;
  }

  private repor(i: number, centro: THREE.Vector3, espalhar: boolean) {
    const x = centro.x + (this.sorte() - 0.5) * 44, z = centro.z + (this.sorte() - 0.5) * 44;
    const y = centro.y + (espalhar ? this.sorte() * 26 - 6 : 18 + this.sorte() * 4);
    const o = i * 6;
    const g = this.gotas;
    g[o] = x;
    g[o + 1] = y;
    g[o + 2] = z;
    g[o + 3] = x - 0.18;
    g[o + 4] = y - 0.9;
    g[o + 5] = z - 0.35;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    if (!this.malha.visible) return;
    const g = this.gotas;
    const queda = 22 * dt;
    for (let i = 0; i < g.length; i += 6) {
      g[i] -= queda * 0.2;
      g[i + 3] -= queda * 0.2;
      g[i + 1] -= queda;
      g[i + 4] -= queda;
      g[i + 2] -= queda * 0.4;
      g[i + 5] -= queda * 0.4;
      if (g[i + 1] < this.base - 2 || Math.abs(g[i] - jogador.x) > 24 || Math.abs(g[i + 2] - jogador.z) > 24) this.repor(i / 6, jogador, false);
    }
    (this.malha.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
