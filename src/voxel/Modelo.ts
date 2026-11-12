import * as THREE from 'three';
import { Volume, malhaDoVolume, materialVoxel } from './Malha';

/**
 * Modelador de voxels por código (arte original do projeto).
 * Coordenadas já em Y para cima. Cores em hexadecimal sRGB.
 */
export class Modelo {
  private celulas = new Map<string, THREE.Color>();
  private min: [number, number, number] = [Infinity, Infinity, Infinity];
  private max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  private static cores = new Map<number, THREE.Color>();

  static cor(hex: number) {
    let c = Modelo.cores.get(hex);
    if (!c) {
      c = new THREE.Color(hex);
      Modelo.cores.set(hex, c);
    }
    return c;
  }

  ponto(x: number, y: number, z: number, hex: number | null) {
    const k = `${x},${y},${z}`;
    if (hex === null) {
      this.celulas.delete(k);
      return this;
    }
    this.celulas.set(k, Modelo.cor(hex));
    this.min = [Math.min(this.min[0], x), Math.min(this.min[1], y), Math.min(this.min[2], z)];
    this.max = [Math.max(this.max[0], x + 1), Math.max(this.max[1], y + 1), Math.max(this.max[2], z + 1)];
    return this;
  }

  /** Caixa cheia de (x, y, z) com largura w, altura h e profundidade d. `hex` pode variar por voxel. */
  caixa(x: number, y: number, z: number, w: number, h: number, d: number, hex: number | null | ((x: number, y: number, z: number) => number | null)) {
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++)
        for (let k = z; k < z + d; k++) this.ponto(i, j, k, typeof hex === 'function' ? hex(i, j, k) : hex);
    return this;
  }

  geometria(escala: number, pivo: [number, number, number]) {
    const vol: Volume = {
      min: this.min,
      max: this.max,
      cor: (x, y, z) => this.celulas.get(`${x},${y},${z}`) ?? null,
    };
    return malhaDoVolume(vol, escala, pivo);
  }

  malha(escala: number, pivo: [number, number, number], material: THREE.Material = materialVoxel) {
    const m = new THREE.Mesh(this.geometria(escala, pivo), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

/** Variação determinística de cor, para dar textura aos voxels. */
export function variar(hex: number, x: number, y: number, z: number, intensidade = 0.06) {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  const r = (h - Math.floor(h)) * 2 - 1;
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, r * intensidade);
  return c.getHex();
}
