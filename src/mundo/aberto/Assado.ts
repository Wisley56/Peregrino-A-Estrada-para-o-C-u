import type { IdArea } from '../Area';
import type { Carimbo } from './TerrenoMundo';

/**
 * Uma região "assada" em números, para ir para a obra (o Web Worker): lá não chegam as áreas, só vetores. O chão de
 * ligação precisa da região em dois lugares: na volta de 1 m da borda (é dela que a encosta desce faixa afora, e é
 * nela que as paredes e a sombra dos cantos encostam) e, mais grosso, no miolo (que os ladrilhos de longe, de 4 e
 * 16 m, às vezes pegam pela metade). Então guarda-se a borda metro a metro e o miolo numa grade de 4 m.
 */
export interface CarimboCru {
  id: IdArea;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  faixa: number;
  /** As quatro tiras da borda, 1 m de largura: oeste e leste (ao longo de z), norte e sul (ao longo de x). */
  borda: { alt: Float32Array; cor: Uint32Array };
  /** O miolo numa grade de `PASSO` m (amostrado no centro de cada quadrado). */
  miolo: { alt: Float32Array; cor: Uint32Array; nx: number; nz: number };
}

const PASSO = 4;

/** Amostra a região (no thread principal, onde as áreas existem). */
export function assar(c: Carimbo): CarimboCru {
  const w = c.x1 - c.x0, d = c.z1 - c.z0;
  const n = 2 * d + 2 * w;
  const borda = { alt: new Float32Array(n), cor: new Uint32Array(n) };
  const por = (k: number, x: number, z: number) => {
    borda.alt[k] = c.altura(x, z);
    borda.cor[k] = c.cor(x, z);
  };
  for (let j = 0; j < d; j++) {
    por(j, c.x0 + 0.5, c.z0 + j + 0.5);
    por(d + j, c.x1 - 0.5, c.z0 + j + 0.5);
  }
  for (let i = 0; i < w; i++) {
    por(2 * d + i, c.x0 + i + 0.5, c.z0 + 0.5);
    por(2 * d + w + i, c.x0 + i + 0.5, c.z1 - 0.5);
  }
  const nx = Math.ceil(w / PASSO), nz = Math.ceil(d / PASSO);
  const miolo = { alt: new Float32Array(nx * nz), cor: new Uint32Array(nx * nz), nx, nz };
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = Math.min(c.x1 - 0.5, c.x0 + i * PASSO + PASSO / 2), z = Math.min(c.z1 - 0.5, c.z0 + j * PASSO + PASSO / 2);
      miolo.alt[i * nz + j] = c.altura(x, z);
      miolo.cor[i * nz + j] = c.cor(x, z);
    }
  return { id: c.id, x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, faixa: c.faixa, borda, miolo };
}

/** Os vetores a transferir para a obra sem cópia. */
export function transferiveis(cs: CarimboCru[]) {
  return cs.flatMap((c) => [c.borda.alt.buffer, c.borda.cor.buffer, c.miolo.alt.buffer, c.miolo.cor.buffer]);
}

/** De volta a um carimbo (na obra): a borda é exata; o miolo, a grade de 4 m. */
export function desassar(c: CarimboCru): Carimbo {
  const w = c.x1 - c.x0, d = c.z1 - c.z0;
  const indice = (x: number, z: number) => {
    const i = Math.min(w - 1, Math.max(0, Math.floor(x - c.x0))), j = Math.min(d - 1, Math.max(0, Math.floor(z - c.z0)));
    if (i === 0) return j;
    if (i === w - 1) return d + j;
    if (j === 0) return 2 * d + i;
    if (j === d - 1) return 2 * d + w + i;
    return -1 - (Math.min(c.miolo.nx - 1, Math.floor(i / PASSO)) * c.miolo.nz + Math.min(c.miolo.nz - 1, Math.floor(j / PASSO)));
  };
  return {
    id: c.id, x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, faixa: c.faixa,
    altura: (x, z) => {
      const k = indice(x, z);
      return k >= 0 ? c.borda.alt[k] : c.miolo.alt[-1 - k];
    },
    cor: (x, z) => {
      const k = indice(x, z);
      return k >= 0 ? c.borda.cor[k] : c.miolo.cor[-1 - k];
    },
  };
}
