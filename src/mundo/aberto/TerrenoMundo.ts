import { Ruido } from '../../core/Ruido';
import type { IdArea } from '../Area';
import { NIVEL_MAR } from './Geografia';

/**
 * Uma região feita à mão, "carimbada" no mundo: dentro do retângulo vale o chão dela; numa faixa em volta, ele se
 * desfaz no terreno do mundo (a terra de ligação, ou o mar).
 */
export interface Carimbo {
  id: IdArea;
  /** O retângulo (m do mundo) em que a região manda. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Largura da faixa de fora em que o chão da região se mistura com o do mundo (m). */
  faixa: number;
  altura(x: number, z: number): number;
  /** Cor do chão visto de cima (0xRRGGBB). */
  cor(x: number, z: number): number;
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A espinha da terra firme: a terra é o que fica a menos de `largura` destes trechos (com a costa recortada por
 * ruído). Do Deserto ao Vale, do Deserto à Cidade Dourada, e dali contornando a baía pelo norte até as terras atrás
 * da Bahia. O resto é mar; Creta e Malta são ilhas (a terra delas vem do carimbo).
 */
const ESPINHA: [number, number, number, number, number][] = [
  // x0, z0, x1, z1, largura
  [-1300, 0, 0, 0, 620],
  [-1300, 0, -900, 1200, 560],
  [-900, 1200, -150, 1750, 480],
  [-150, 1750, 850, 1700, 460],
  [850, 1700, 1250, 2350, 520],
  [1250, 2350, 1050, 2950, 420],
];

/** Os biomas da terra de ligação: cada um é a vizinhança de uma região e tem as cores dela. */
const BIOMAS: { x: number; z: number; alcance: number; cores: [number, number]; seco?: boolean }[] = [
  { x: 0, z: 0, alcance: 1, cores: [0x6f9a4a, 0x7ba552] }, // os prados do Vale
  { x: -1300, z: 0, alcance: 0.9, cores: [0xd9b77a, 0xcfa968], seco: true }, // as areias do Deserto
  { x: -900, z: 1200, alcance: 0.9, cores: [0x94aa52, 0xa8a04a] }, // os campos dourados da Cidade
  { x: 900, z: 2200, alcance: 1, cores: [0x5a9440, 0x6aa04a] }, // a mata do litoral da Bahia
];
const AREIA = 0xe2d2a0, ROCHA = 0x8a8274, ROCHA_ALTA = 0xa39a8c;

function distSegmento(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}

const misturar = (a: number, b: number, t: number) => {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};

/**
 * O chão do mundo inteiro: uma função só de altura e de cor para qualquer ponto. Junta as regiões feitas à mão
 * (os carimbos) com o terreno procedural entre elas (simplex), sem emenda: é o que os chunks desenham, o que a
 * física pisa e o que o mapa-múndi mostra.
 */
export class TerrenoMundo {
  private readonly ruido = new Ruido(7001);
  private readonly ruidoCor = new Ruido(7002);

  constructor(readonly carimbos: Carimbo[]) {}

  /** A região que manda em (x, z), ou `null` no ermo (a terra de ligação e o mar aberto). */
  regiaoEm(x: number, z: number): Carimbo | null {
    for (const c of this.carimbos) if (x >= c.x0 && x < c.x1 && z >= c.z0 && z < c.z1) return c;
    return null;
  }

  /**
   * A região mais presente em (x, z) e o quanto (1 dentro dela, caindo a 0 no fim da faixa de mistura). Dentro do
   * retângulo de uma região, só ela conta.
   */
  private presenca(x: number, z: number): [Carimbo | null, number] {
    let melhor: Carimbo | null = null, peso = 0;
    for (const c of this.carimbos) {
      const fora = Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));
      if (fora === 0) return [c, 1];
      const w = 1 - suave(0, c.faixa, fora);
      if (w > peso) {
        peso = w;
        melhor = c;
      }
    }
    return [melhor, peso];
  }

  /** Quanto (m) se está terra adentro: positivo em terra, negativo no mar. */
  costa(x: number, z: number) {
    let d = -Infinity;
    for (const [ax, az, bx, bz, larg] of ESPINHA) d = Math.max(d, larg - distSegmento(x, z, ax, az, bx, bz));
    return d + this.ruido.fbmSimplex(x / 420, z / 420, 3) * 95 + this.ruido.simplex(x / 85 + 40, z / 85) * 16;
  }

  /** O terreno procedural, sem as regiões (m, não arredondado). */
  alturaNatural(x: number, z: number) {
    const d = this.costa(x, z);
    const r = this.ruido;
    if (d <= 0) return NIVEL_MAR - 1 - suave(0, 70, -d) * 8 + r.simplex(x / 40, z / 40 + 9) * 0.8;
    const praia = NIVEL_MAR + 1 + suave(0, 40, d) * 3;
    const colinas = suave(20, 220, d) * (r.fbmSimplex(x / 280 + 3, z / 280, 4) * 0.5 + 0.5) * 16;
    // a serra do norte, atrás do Vale e do Deserto
    const serra = suave(-280, -560, z) * suave(60, 260, d) * r.cristas(x / 440, z / 440 + 5, 4) * 64;
    return praia + colinas + serra + r.fbmSimplex(x / 26 + 7, z / 26, 2) * 0.9;
  }

  /** A cor do chão natural (a terra de ligação e o fundo do mar). */
  corNatural(x: number, z: number, h = this.alturaNatural(x, z)) {
    const d = this.costa(x, z);
    const n = this.ruidoCor.fbm(x * 0.07, z * 0.07, 3);
    if (d < 12 || h < NIVEL_MAR + 1.5) return misturar(AREIA, 0xcdbb86, n);
    if (h > 46) return misturar(ROCHA, ROCHA_ALTA, n);
    // o bioma é o da região mais próxima, com a fronteira recortada por ruído
    const jx = this.ruidoCor.simplex(x / 150, z / 150) * 140, jz = this.ruidoCor.simplex(x / 150 + 30, z / 150) * 140;
    let b = BIOMAS[0], melhor = Infinity;
    for (const k of BIOMAS) {
      const dist = Math.hypot(x + jx - k.x, z + jz - k.z) / k.alcance;
      if (dist < melhor) {
        melhor = dist;
        b = k;
      }
    }
    const cor = misturar(b.cores[0], b.cores[1], n);
    return h > 30 && !b.seco ? misturar(cor, ROCHA, suave(30, 46, h)) : cor;
  }

  /** A altura do chão em (x, z), em colunas inteiras de 1 m. */
  altura(x: number, z: number) {
    const [c, w] = this.presenca(x, z);
    if (c && w >= 1) return c.altura(x, z);
    const natural = this.alturaNatural(x, z);
    if (!c || w <= 0) return Math.round(natural);
    // na faixa de mistura, a borda da região (o ponto mais próximo dentro dela) desce até o terreno do mundo
    const bx = Math.min(c.x1 - 0.5, Math.max(c.x0 + 0.5, x)), bz = Math.min(c.z1 - 0.5, Math.max(c.z0 + 0.5, z));
    return Math.round(natural + (c.altura(bx, bz) - natural) * w);
  }

  /** A cor do chão em (x, z). */
  cor(x: number, z: number) {
    const [c, w] = this.presenca(x, z);
    if (c && w >= 1) return c.cor(x, z);
    const natural = this.corNatural(x, z);
    if (!c || w <= 0) return natural;
    const bx = Math.min(c.x1 - 0.5, Math.max(c.x0 + 0.5, x)), bz = Math.min(c.z1 - 0.5, Math.max(c.z0 + 0.5, z));
    // pontilhado em vez de cores intermediárias: voxels não têm meia cor
    return this.ruidoCor.valor(x * 0.9, z * 0.9) < w ? c.cor(bx, bz) : natural;
  }
}
