import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * Creta no século I (arte por código, voxel de 0,25 m): as casas de pedra de Bons Portos e de Laseia, com teto plano
 * de terra batida sobre vigas, escadas por fora para o terraço, pátio com parreira; os barcos de pesca puxados na
 * areia e as redes secando; o forno de pão; as oliveiras, as alfarrobeiras e os ciprestes; os muros de pedra seca
 * dos socalcos; o farol da falésia; a muralha e a porta de Laseia; a fonte e o pórtico da praça.
 *
 * Origem de cada modelo no chão, no centro da base (m). A frente (porta) fica em +z.
 */

export const V = 0.25;

const COR = {
  calcario: 0xd8c8a0,
  calcarioEscuro: 0xbcae88,
  cal: 0xeee6d2,
  caiadoSujo: 0xddd2b8,
  viga: 0x6a4a30,
  terraco: 0xb49a70,
  porta: 0x5a3a24,
  portaClara: 0x7a5434,
  janela: 0x2a2018,
  parreira: 0x5e7a34,
  uva: 0x5a2a4a,
  tronco: 0x6a5a48,
  troncoOliveira: 0x7a6a56,
  folhaOliveira: 0x8a9a6a,
  folhaOliveiraEscura: 0x6e7e54,
  folhaAlfarroba: 0x3e5a2a,
  cipreste: 0x2e4a2a,
  barco: 0x5a7a8a,
  barcoFaixa: 0xc8a050,
  rede: 0x8a7a5a,
  telha: 0xb0583a,
};

const pedra = (base: number) => (x: number, y: number, z: number) => {
  const junta = ((x + z + (y % 2) * 2) % 4 + 4) % 4 === 0 || y % 3 === 0;
  return variar(junta ? COR.calcarioEscuro : base, x, y, z, 0.05);
};

export interface OpcoesCasa {
  /** Largura (x) e fundo (z) em m, múltiplos de 0,25. */
  largura: number;
  fundo: number;
  /** 1 ou 2 pisos. */
  pisos?: 1 | 2;
  /** Caiada (branca) ou de pedra à vista. */
  caiada?: boolean;
  /** Escada de pedra por fora, subindo ao terraço. */
  escada?: boolean;
  /** Parreira sobre a porta. */
  parreira?: boolean;
  semente?: number;
}

/** Altura de um piso (m). */
export const PISO = 2.75;

/** Uma casa de pedra de teto plano: a porta na frente, janelinhas, as pontas das vigas para fora, o terraço com mureta. */
export function casaCretense(o: OpcoesCasa) {
  const m = new Modelo();
  const r = aleatorio(o.semente ?? 1);
  const w = Math.round(o.largura / V), d = Math.round(o.fundo / V);
  const pisos = o.pisos ?? 1;
  const h = Math.round((PISO * pisos) / V);
  const x0 = -Math.floor(w / 2), z0 = -Math.floor(d / 2);
  const parede = o.caiada
    ? (x: number, y: number, z: number) => variar(y < 2 ? COR.calcarioEscuro : (x * 7 + y * 3 + z) % 23 === 0 ? COR.caiadoSujo : COR.cal, x, y, z, 0.025)
    : pedra(COR.calcario);
  m.caixa(x0, 0, z0, w, h, d, parede);
  m.caixa(x0 + 1, 1, z0 + 1, w - 2, h - 1, d - 2, null);
  // o terraço de terra batida, a mureta em volta e as pontas das vigas saindo na frente e atrás
  m.caixa(x0, h, z0, w, 1, d, (x, y, z) => variar(COR.terraco, x, y, z, 0.05));
  m.caixa(x0, h + 1, z0, w, 2, 1, parede).caixa(x0, h + 1, z0 + d - 1, w, 2, 1, parede);
  m.caixa(x0, h + 1, z0, 1, 2, d, parede).caixa(x0 + w - 1, h + 1, z0, 1, 2, d, parede);
  for (let x = x0 + 2; x < x0 + w - 1; x += 4) {
    m.caixa(x, h - 1, z0 - 1, 1, 1, 1, COR.viga).caixa(x, h - 1, z0 + d, 1, 1, 1, COR.viga);
  }
  // a porta de tábuas, com o batente de pedra e a soleira
  const px = -2;
  m.caixa(px - 1, 0, z0 + d - 1, 6, 9, 1, pedra(COR.calcarioEscuro));
  m.caixa(px, 0, z0 + d - 1, 4, 8, 1, (x, y, z) => variar((x + 10) % 2 ? COR.portaClara : COR.porta, x, y, z, 0.04));
  // janelinhas altas, estreitas
  const janelas = Math.max(1, Math.floor(w / 10));
  for (let i = 0; i < janelas; i++) {
    const jx = x0 + Math.round(((i + 1) * w) / (janelas + 1)) - 1;
    if (Math.abs(jx - px - 1) < 4) continue;
    m.caixa(jx, 6, z0 + d - 1, 2, 3, 1, COR.janela);
    m.caixa(jx, 6, z0, 2, 3, 1, COR.janela);
  }
  if (pisos === 2) {
    m.caixa(x0 + 2, 17, z0 + d - 1, 2, 3, 1, COR.janela).caixa(x0 + w - 4, 17, z0 + d - 1, 2, 3, 1, COR.janela);
  }
  // a escada de pedra encostada na parede do lado, subindo ao terraço
  if (o.escada) {
    for (let i = 0; i < h; i++) m.caixa(x0 + w, 0, z0 + d - 3 - i, 3, i + 1, 1, pedra(COR.calcarioEscuro));
  }
  // a parreira: os paus e as folhas sobre a porta, com cachos
  if (o.parreira) {
    for (const x of [px - 4, px + 7]) m.caixa(x, 0, z0 + d + 7, 1, 10, 1, COR.viga);
    for (let x = px - 4; x <= px + 7; x++)
      for (let z = z0 + d; z <= z0 + d + 7; z++) {
        if (r() < 0.78) m.ponto(x, 10, z, variar(COR.parreira, x, 10, z, 0.08));
        if (r() < 0.06) m.ponto(x, 9, z, COR.uva);
      }
  }
  return m.malha(V, [0, 0, 0]);
}

/** O forno de pão, de barro, em cúpula. */
export function forno() {
  const m = new Modelo();
  for (let y = 0; y < 6; y++) {
    const r = y < 2 ? 4 : 4 - (y - 1) * 0.8;
    for (let x = -4; x < 4; x++) for (let z = -4; z < 4; z++) if (x * x + z * z <= r * r) m.ponto(x, y, z, variar(0xc89a6a, x, y, z, 0.05));
  }
  m.caixa(-1, 0, 3, 2, 2, 1, 0x2a1a12);
  return m.malha(V, [0, 0, 0]);
}

/** Um barco de pesca puxado na areia, um pouco tombado, com o remo e a rede dentro. */
export function barcoDePesca(semente = 0) {
  const m = new Modelo();
  const cor = [COR.barco, 0x8a5a3a, 0x6a7a5a][semente % 3];
  const comp = 20, larg = 6;
  for (let z = -comp / 2; z < comp / 2; z++) {
    const u = (z + 0.5) / (comp / 2);
    const w = (larg / 2) * Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 2.2));
    for (let y = 0; y < 4; y++) {
      const wy = w * (0.55 + 0.45 * (y / 3));
      for (let x = -Math.ceil(wy); x < Math.ceil(wy); x++) {
        if (Math.abs(x + 0.5) <= wy - 1.1 && y > 0) continue;
        m.ponto(x, y, z, variar(y === 3 ? COR.barcoFaixa : cor, x, y, z, 0.05));
      }
    }
  }
  m.caixa(-2, 1, -2, 4, 1, 4, COR.rede).caixa(-3, 3, 2, 7, 1, 1, COR.viga);
  return m.malha(V, [0, 0, 0]);
}

/** Redes secando entre dois paus. */
export function redeSecando() {
  const m = new Modelo();
  m.caixa(-8, 0, 0, 1, 8, 1, COR.viga).caixa(7, 0, 0, 1, 8, 1, COR.viga);
  for (let x = -7; x < 7; x++)
    for (let y = 2; y < 8; y++) {
      const caimento = Math.round(1.6 * Math.sin(((x + 7) / 14) * Math.PI));
      if ((x + y) % 2 === 0 || y === 7) m.ponto(x, y - caimento, 0, variar(COR.rede, x, y, 0, 0.06));
    }
  return m.malha(V, [0, 0, 0]);
}

/** Uma oliveira velha: tronco torcido, copa larga e prateada. */
export function oliveira(semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente * 13 + 7);
  let x = 0, z = 0;
  for (let y = 0; y < 9; y++) {
    m.caixa(x - 1, y, z - 1, y < 3 ? 3 : 2, 1, y < 3 ? 3 : 2, variar(COR.troncoOliveira, x, y, z, 0.06));
    if (y > 2 && r() < 0.4) x += r() < 0.5 ? 1 : -1;
    if (y > 2 && r() < 0.4) z += r() < 0.5 ? 1 : -1;
  }
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 8, yy = 8 + Math.round(r() * 6 - Math.max(0, d - 5));
    const cx = Math.round(x + Math.cos(a) * d), cz = Math.round(z + Math.sin(a) * d);
    m.ponto(cx, yy, cz, variar(r() < 0.5 ? COR.folhaOliveira : COR.folhaOliveiraEscura, cx, yy, cz, 0.07));
  }
  return m.malha(V, [0, 0, 0]);
}

/** Uma alfarrobeira: copa redonda, escura e cheia. */
export function alfarrobeira(semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente * 31 + 3);
  m.caixa(-1, 0, -1, 2, 7, 2, (x, y, z) => variar(COR.tronco, x, y, z, 0.06));
  for (let x = -9; x <= 9; x++)
    for (let y = 0; y <= 9; y++)
      for (let z = -9; z <= 9; z++) {
        const d = (x * x) / 81 + ((y - 4) * (y - 4)) / 25 + (z * z) / 81;
        if (d <= 1 && (d > 0.6 || r() < 0.08) && r() < 0.85) m.ponto(x, y + 6, z, variar(COR.folhaAlfarroba, x, y, z, 0.08));
      }
  return m.malha(V, [0, 0, 0]);
}

/** Um cipreste: a chama verde-escura, alta e fina. */
export function cipreste(semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente * 17 + 1);
  const alto = 28 + Math.floor(r() * 10);
  m.caixa(0, 0, 0, 1, 3, 1, COR.tronco);
  for (let y = 2; y < alto; y++) {
    const raio = 2.6 * Math.sin((Math.PI * (y - 1)) / alto) ** 0.7;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= raio * raio && r() < 0.92) m.ponto(x, y, z, variar(COR.cipreste, x, y, z, 0.07));
  }
  return m.malha(V, [0, 0, 0]);
}

/** Um trecho de muro de pedra seca (dos socalcos e currais), `comprimento` em m, ao longo de x. */
export function muroSeco(comprimento: number, semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente + 5);
  const n = Math.round(comprimento / V);
  for (let x = 0; x < n; x++) {
    const alto = 3 + (r() < 0.3 ? 1 : 0);
    for (let y = 0; y < alto; y++) m.caixa(x, y, 0, 1, 1, 2, variar(r() < 0.3 ? COR.calcarioEscuro : 0xc4b690, x, y, 0, 0.08));
  }
  return m.malha(V, [0, 0, 0]);
}

/** Um poste de amarração de pedra (no cais). */
export function posteDeAmarracao() {
  const m = new Modelo();
  m.caixa(-1, 0, -1, 2, 3, 2, pedra(COR.calcarioEscuro)).caixa(-1, 3, -1, 2, 1, 2, COR.calcario);
  return m.malha(V, [0, 0, 0]);
}

/** O farol da falésia: torre redonda de pedra com o braseiro no alto. */
export function farol() {
  const m = new Modelo();
  for (let y = 0; y < 40; y++) {
    const raio = 6 - y * 0.06;
    for (let x = -7; x <= 7; x++)
      for (let z = -7; z <= 7; z++) {
        const d = Math.hypot(x, z);
        if (d <= raio && d > raio - 1.3) m.ponto(x, y, z, pedra(COR.calcario)(x, y, z));
      }
  }
  m.caixa(-1, 0, 5, 3, 8, 2, null).caixa(-1, 0, 5, 3, 8, 1, COR.porta);
  for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (x * x + z * z <= 30) m.ponto(x, 40, z, COR.calcarioEscuro);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) m.ponto(x, 41, z, 0x4a4a4a);
  for (const [x, z] of [[-5, -2], [5, -2], [-5, 2], [5, 2], [-2, 5], [2, 5], [-2, -5], [2, -5]]) m.caixa(x, 41, z, 1, 3, 1, COR.calcarioEscuro);
  return m.malha(V, [0, 0, 0]);
}

/** Um trecho de muralha (com ameias), `comprimento` em m, ao longo de x. */
export function muralha(comprimento: number) {
  const m = new Modelo();
  const n = Math.round(comprimento / V);
  m.caixa(0, 0, 0, n, 16, 4, pedra(COR.calcario));
  for (let x = 0; x < n; x += 4) m.caixa(x, 16, 0, 2, 2, 4, pedra(COR.calcario));
  return m.malha(V, [0, 0, 0]);
}

/** A porta da cidade: duas torres quadradas e o arco entre elas (passagem de 3 m), ao longo de x. */
export function portaDaCidade() {
  const m = new Modelo();
  for (const x0 of [-14, 6]) {
    m.caixa(x0, 0, -6, 8, 22, 12, pedra(COR.calcario));
    for (let x = x0; x < x0 + 8; x += 3) m.caixa(x, 22, -6, 2, 2, 12, pedra(COR.calcario));
  }
  m.caixa(-6, 0, -4, 12, 18, 8, pedra(COR.calcarioEscuro));
  m.caixa(-6, 0, -4, 12, 12, 8, null);
  for (let x = -6; x < 6; x++) {
    const arco = Math.round(Math.sqrt(Math.max(0, 36 - (x + 0.5) ** 2)) * 0.6);
    m.caixa(x, 12, -4, 1, arco, 8, null);
  }
  return m.malha(V, [0, 0, 0]);
}

/** O pórtico da praça (a estoa): colunas e o teto de telhas, ao longo de x, aberto para +z. */
export function portico(comprimento: number) {
  const m = new Modelo();
  const n = Math.round(comprimento / V);
  m.caixa(0, 0, -8, n, 1, 10, COR.calcarioEscuro);
  m.caixa(0, 1, -8, n, 14, 1, pedra(COR.calcario));
  for (let x = 1; x < n - 1; x += 8) m.caixa(x, 1, 0, 2, 13, 2, (xx, y, z) => variar(COR.cal, xx, y, z, 0.03));
  m.caixa(0, 14, -8, n, 1, 11, COR.calcario);
  for (let z = -8; z <= 3; z++) m.caixa(0, 15 + Math.floor((z + 8) / 4) * 0, z, n, 1, 1, variar(COR.telha, 0, 0, z, 0.05));
  return m.malha(V, [0, 0, 0]);
}

/** A fonte da praça: a bacia de pedra e a bica numa estela. */
export function fonteDaPraca() {
  const m = new Modelo();
  m.caixa(-6, 0, -4, 12, 3, 8, pedra(COR.calcario));
  m.caixa(-5, 1, -3, 10, 2, 6, 0x4f8fa8);
  m.caixa(-2, 0, -6, 4, 10, 2, pedra(COR.calcarioEscuro)).caixa(0, 7, -4, 1, 1, 2, 0x8a7a5a);
  return m.malha(V, [0, 0, 0]);
}

/** Pedras soltas e um rochedo de calcário (para enfeitar o mato). */
export function rochedo(semente = 0) {
  const m = new Modelo();
  const r = aleatorio(semente * 7 + 11);
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const cx = Math.round(r() * 8 - 4), cz = Math.round(r() * 8 - 4), rr = 1.5 + r() * 2.5;
    for (let x = -4; x <= 4; x++)
      for (let y = 0; y <= 4; y++)
        for (let z = -4; z <= 4; z++) if ((x * x + z * z) / (rr * rr) + (y * y) / (rr * rr * 0.6) <= 1) m.ponto(cx + x, y, cz + z, variar(0xc8bea6, x, y, z, 0.07));
  }
  return m.malha(V, [0, 0, 0]);
}
