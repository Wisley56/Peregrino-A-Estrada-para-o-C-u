import { Ruido } from '../../core/Ruido';
import type { IdArea } from '../Area';
import { ESTRADAS, NIVEL_MAR } from './Geografia';

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

/** Os biomas da terra de ligação (cada um é a vizinhança de uma região), mais a praia, a rocha alta e o mar. */
export type Bioma = 'prado' | 'deserto' | 'campos' | 'mata' | 'praia' | 'rocha' | 'mar';

/** Os biomas de terra: cada um tem as cores da região de que é vizinho, e a cor da terra batida das estradas. */
const BIOMAS: { nome: Bioma; x: number; z: number; alcance: number; cores: [number, number]; estrada: number; seco?: boolean }[] = [
  { nome: 'prado', x: 0, z: 0, alcance: 1, cores: [0x6f9a4a, 0x7ba552], estrada: 0x9a8058 }, // os prados do Vale
  { nome: 'deserto', x: -1300, z: 0, alcance: 0.9, cores: [0xd9b77a, 0xcfa968], estrada: 0xbf9a62, seco: true }, // as areias do Deserto
  { nome: 'campos', x: -900, z: 1200, alcance: 0.9, cores: [0x94aa52, 0xa8a04a], estrada: 0xa88a5e }, // os campos dourados da Cidade
  { nome: 'mata', x: 900, z: 2200, alcance: 1, cores: [0x5a9440, 0x6aa04a], estrada: 0x9a6a48 }, // a mata do litoral da Bahia (terra vermelha)
];

/** Meia largura (m) da terra batida das estradas, e a largura da beira em que ela se desfaz no mato. */
const ESTRADA_MEIA = 1.7, ESTRADA_BEIRA = 1.2;

/** Os trechos das estradas, com a caixa de cada um (alargada) para descartar depressa os que estão longe. */
const TRECHOS = ESTRADAS.flatMap((e) =>
  e.slice(0, -1).map(([ax, az], k) => {
    const [bx, bz] = e[k + 1], m = 24;
    return { ax, az, bx, bz, x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, z0: Math.min(az, bz) - m, z1: Math.max(az, bz) + m };
  }),
);
/** As pontas das estradas (as saídas das regiões): ali a estrada não serpenteia, para cair certinho no corte. */
const PONTAS = ESTRADAS.flatMap((e) => [e[0], e[e.length - 1]]);
const CAIXA_ESTRADAS = TRECHOS.reduce((c, t) => [Math.min(c[0], t.x0), Math.min(c[1], t.z0), Math.max(c[2], t.x1), Math.max(c[3], t.z1)], [Infinity, Infinity, -Infinity, -Infinity]);
/**
 * Inclinação (m de altura por m de distância) com que a borda de uma região desce ou sobe até o terreno do mundo.
 * Uma serra de borda vira encosta, e um corte (estrada, desfiladeiro) vira uma rampa que se abre na planície, em vez
 * de a borda ser esticada faixa afora como um paredão.
 */
const ENCOSTA = 0.7;
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

  /** O carimbo de uma área, se ela é uma região do mundo aberto. */
  carimboDe(id: IdArea) {
    return this.carimbos.find((c) => c.id === id) ?? null;
  }

  /** Distância (m) de (x, z) à borda de uma região: positiva do lado de fora, negativa dentro dela. */
  distancia(c: Carimbo, x: number, z: number) {
    const fora = Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));
    return fora > 0 ? fora : -Math.min(x - c.x0, c.x1 - x, z - c.z0, c.z1 - z);
  }

  /** O retângulo [xa, xb] × [za, zb] está inteiro dentro de uma região? (Esse chão é a malha dela que desenha.) */
  dentroDeRegiao(xa: number, za: number, xb: number, zb: number) {
    for (const c of this.carimbos) if (xa >= c.x0 && xb <= c.x1 && za >= c.z0 && zb <= c.z1) return true;
    return false;
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

  /**
   * Quanto (0 a 1) (x, z) é estrada: 1 na terra batida, caindo a 0 na beira. O eixo é a linha das `ESTRADAS`
   * entortada por ruído, para as estradas serpentearem em vez de correr em linha reta de ponto a ponto.
   */
  estrada(x: number, z: number) {
    return 1 - suave(ESTRADA_MEIA, ESTRADA_MEIA + ESTRADA_BEIRA, this.distEstrada(x, z));
  }

  /** A distância (m) de (x, z) ao eixo da estrada mais próxima (`Infinity` a mais de ~24 m de todas). */
  distEstrada(x: number, z: number) {
    if (x < CAIXA_ESTRADAS[0] || x > CAIXA_ESTRADAS[2] || z < CAIXA_ESTRADAS[1] || z > CAIXA_ESTRADAS[3]) return Infinity;
    let ponta = Infinity;
    for (const [px, pz] of PONTAS) ponta = Math.min(ponta, Math.hypot(x - px, z - pz));
    const amp = 9 * suave(12, 90, ponta);
    const qx = x + this.ruido.simplex(x / 110 + 11, z / 110) * amp, qz = z + this.ruido.simplex(x / 110, z / 110 + 23) * amp;
    let d = Infinity;
    for (const t of TRECHOS) if (qx >= t.x0 && qx <= t.x1 && qz >= t.z0 && qz <= t.z1) d = Math.min(d, distSegmento(qx, qz, t.ax, t.az, t.bx, t.bz));
    return d;
  }

  /** O bioma de terra mais próximo de (x, z), com a fronteira recortada por ruído. */
  private biomaDeTerra(x: number, z: number) {
    const jx = this.ruidoCor.simplex(x / 150, z / 150) * 140, jz = this.ruidoCor.simplex(x / 150 + 30, z / 150) * 140;
    let b = BIOMAS[0], melhor = Infinity;
    for (const k of BIOMAS) {
      const dist = Math.hypot(x + jx - k.x, z + jz - k.z) / k.alcance;
      if (dist < melhor) {
        melhor = dist;
        b = k;
      }
    }
    return b;
  }

  /** O bioma do chão natural em (x, z) (o que cresce e o que vive ali). */
  bioma(x: number, z: number, h = this.alturaNatural(x, z)): Bioma {
    const d = this.costa(x, z);
    if (d <= 0 || h < NIVEL_MAR) return 'mar';
    if (d < 12 || h < NIVEL_MAR + 1.5) return 'praia';
    if (h > 46) return 'rocha';
    return this.biomaDeTerra(x, z).nome;
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
    // na estrada o chão é batido: sem os calombos miúdos
    const miudo = r.fbmSimplex(x / 26 + 7, z / 26, 2) * 0.9 * (1 - this.estrada(x, z));
    return praia + colinas + serra + miudo;
  }

  /** A cor do chão natural (a terra de ligação e o fundo do mar). */
  corNatural(x: number, z: number, h = this.alturaNatural(x, z)) {
    const d = this.costa(x, z);
    const n = this.ruidoCor.fbm(x * 0.07, z * 0.07, 3);
    if (d < 12 || h < NIVEL_MAR + 1.5) return misturar(AREIA, 0xcdbb86, n);
    if (h > 46) return misturar(ROCHA, ROCHA_ALTA, n);
    // o bioma é o da região mais próxima, com a fronteira recortada por ruído
    const b = this.biomaDeTerra(x, z);
    // a estrada: terra batida, com a beira pontilhada sobre o mato
    const e = this.estrada(x, z);
    if (e > 0 && this.ruidoCor.valor(x * 1.3, z * 1.3) < e) return misturar(b.estrada, 0x7a6448, n * 0.5);
    const cor = misturar(b.cores[0], b.cores[1], n);
    return h > 30 && !b.seco ? misturar(cor, ROCHA, suave(30, 46, h)) : cor;
  }

  /**
   * Na faixa em volta de uma região: a altura que a borda dela (o ponto mais próximo dentro) projeta em (x, z),
   * descendo ou subindo em encosta até o terreno do mundo, e quanto ela ainda pesa ali (0 a 1, para a cor).
   */
  private borda(c: Carimbo, w: number, x: number, z: number, natural: number): [number, number] {
    const bx = Math.min(c.x1 - 0.5, Math.max(c.x0 + 0.5, x)), bz = Math.min(c.z1 - 0.5, Math.max(c.z0 + 0.5, z));
    const d = Math.hypot(x - bx, z - bz) - 0.5;
    const e = c.altura(bx, bz), dif = e - natural;
    const alcance = Math.max(6, Math.abs(dif) / ENCOSTA);
    const h = dif > 0 ? Math.max(natural, e - ENCOSTA * d) : Math.min(natural, e + ENCOSTA * d);
    // no fim da faixa o mundo manda de todo, mesmo que a encosta ainda não tenha chegado lá
    return [natural + (h - natural) * Math.min(1, w * 4), Math.max(0, 1 - d / alcance)];
  }

  /** A altura do chão em (x, z), em colunas inteiras de 1 m. */
  altura(x: number, z: number) {
    const [c, w] = this.presenca(x, z);
    if (c && w >= 1 && x < c.x1 && z < c.z1) return c.altura(x, z);
    const natural = this.alturaNatural(x, z);
    if (!c || w <= 0) return Math.round(natural);
    return Math.round(this.borda(c, w, x, z, natural)[0]);
  }

  /** A cor do chão em (x, z). */
  cor(x: number, z: number) {
    const [c, w] = this.presenca(x, z);
    if (c && w >= 1 && x < c.x1 && z < c.z1) return c.cor(x, z);
    const hn = this.alturaNatural(x, z);
    const natural = this.corNatural(x, z, hn);
    if (!c || w <= 0) return natural;
    const bx = Math.min(c.x1 - 0.5, Math.max(c.x0 + 0.5, x)), bz = Math.min(c.z1 - 0.5, Math.max(c.z0 + 0.5, z));
    const peso = this.borda(c, w, x, z, hn)[1];
    // a estrada chega até a borda da região por cima da encosta dela
    const e = this.estrada(x, z);
    if (e > 0 && this.ruidoCor.valor(x * 1.3, z * 1.3) < e) return misturar(this.biomaDeTerra(x, z).estrada, 0x7a6448, this.ruidoCor.fbm(x * 0.07, z * 0.07, 3) * 0.5);
    // pontilhado em vez de cores intermediárias: voxels não têm meia cor
    return this.ruidoCor.valor(x * 0.9, z * 0.9) < peso ? c.cor(bx, bz) : natural;
  }
}
