/** Ruído de valor 2D com interpolação suave e fBm. Determinístico por semente. */
export class Ruido {
  constructor(private semente = 1337) {}

  private hash(x: number, y: number) {
    let h = (x * 374761393 + y * 668265263 + this.semente * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  valor(x: number, y: number) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = this.hash(xi, yi), b = this.hash(xi + 1, yi);
    const c = this.hash(xi, yi + 1), d = this.hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  fbm(x: number, y: number, oitavas = 4) {
    let s = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < oitavas; i++) {
      s += this.valor(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return s / norm;
  }

  /**
   * Ruído simplex 2D (gradientes numa malha de triângulos), de -1 a 1. Mais liso e sem as direções preferidas do
   * ruído de valor: é o que dá forma ao relevo do mundo aberto.
   */
  simplex(x: number, y: number) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    return 70 * (this.canto(i, j, x0, y0) + this.canto(i + i1, j + j1, x1, y1) + this.canto(i + 1, j + 1, x2, y2));
  }

  private canto(i: number, j: number, x: number, y: number) {
    const t = 0.5 - x * x - y * y;
    if (t <= 0) return 0;
    const g = GRADIENTES[Math.floor(this.hash(i, j) * 8) & 7];
    return t * t * t * t * (g[0] * x + g[1] * y);
  }

  /** Soma de oitavas de simplex, de -1 a 1. */
  fbmSimplex(x: number, y: number, oitavas = 4, ganho = 0.5) {
    let s = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oitavas; i++) {
      s += this.simplex(x * freq, y * freq) * amp;
      norm += amp;
      amp *= ganho;
      freq *= 2;
    }
    return s / norm;
  }

  /** Cristas (serras): o simplex dobrado no zero, de 0 a 1, com os picos nas linhas em que o ruído se anula. */
  cristas(x: number, y: number, oitavas = 4) {
    let s = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oitavas; i++) {
      const c = 1 - Math.abs(this.simplex(x * freq, y * freq));
      s += c * c * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return s / norm;
  }
}

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const R2 = Math.SQRT1_2;
const GRADIENTES: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [R2, R2], [-R2, R2], [R2, -R2], [-R2, -R2]];

/** Gerador pseudoaleatório (mulberry32). */
export function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
