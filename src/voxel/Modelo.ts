import * as THREE from 'three';
import { Volume, malhaDoVolume, materialVoxel } from './Malha';

/**
 * Modelador de voxels por código (arte original do projeto).
 * Coordenadas já em Y para cima. Cores em hexadecimal sRGB.
 */
/** Chave numérica de uma célula (coordenadas de -1024 a 1023 em cada eixo). */
const B = 2048, OFS = 1024;
const chave = (x: number, y: number, z: number) => ((x + OFS) * B + (y + OFS)) * B + (z + OFS);

export class Modelo {
  private celulas = new Map<number, THREE.Color>();
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
    const k = chave(x, y, z);
    if (hex === null) {
      this.celulas.delete(k);
      return this;
    }
    this.celulas.set(k, Modelo.cor(hex));
    const mn = this.min, mx = this.max;
    if (x < mn[0]) mn[0] = x;
    if (y < mn[1]) mn[1] = y;
    if (z < mn[2]) mn[2] = z;
    if (x + 1 > mx[0]) mx[0] = x + 1;
    if (y + 1 > mx[1]) mx[1] = y + 1;
    if (z + 1 > mx[2]) mx[2] = z + 1;
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
      cor: (x, y, z) => this.celulas.get(chave(x, y, z)) ?? null,
      cada: (f) => {
        for (const [k, c] of this.celulas) {
          const z = (k % B) - OFS, r = Math.floor(k / B);
          f(Math.floor(r / B) - OFS, (r % B) - OFS, z, c);
        }
      },
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
