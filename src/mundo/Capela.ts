import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { montarHumano, type Figurino } from '../voxel/Humano';
import { Npc, type DefNpc } from '../entidades/Npc';

/**
 * Capela de região, com o interior completo de uma igreja católica: nave com bancos e tapete, presbitério
 * elevado com grade de comunhão, altar com toalha e velas, sacrário com a lâmpada do Santíssimo, crucifixo,
 * ambão, sede, imagens de Nossa Senhora e de São José, velas votivas, pias de água benta, Via Sacra,
 * arandelas e um confessionário em que se entra.
 *
 * Casca (paredes, telhado, campanário) em voxel de 0,25 m; mobília em voxel de 0,125 m, para ter detalhe.
 * O estilo (cores) muda por região, a planta é a mesma.
 *
 * Coordenadas locais: origem no centro do piso, +z para a porta, metros.
 */
const C = 0.25; // voxel da casca
const M = 0.125; // voxel da mobília
const W = 36, D = 56, H = 20; // casca: largura (x), comprimento (z), altura das paredes (voxels)
const PICO = 9; // fileiras do telhado (2:1)

export interface EstiloCapela {
  reboco: number;
  pedra: number;
  telha: number;
  cumeeira: number;
  madeira: number;
  madeiraEscura: number;
  pisoA: number;
  pisoB: number;
  marmore: number;
  tapete: number;
  /** Cores dos vitrais. */
  vitral: number[];
  flores: number[];
}

export const ESTILO_VALE: EstiloCapela = {
  reboco: 0xeae2d0,
  pedra: 0x9b9284,
  telha: 0xa84a32,
  cumeeira: 0x7a3022,
  madeira: 0x8a5a34,
  madeiraEscura: 0x5e3a20,
  pisoA: 0xc2b8a4,
  pisoB: 0xa89e8a,
  marmore: 0xe6e0d4,
  tapete: 0x9a1f2a,
  vitral: [0x2f5fc8, 0xc83242, 0xe8c45a, 0x3aa866, 0x8a4ad0],
  flores: [0xf2a0c8, 0xffffff, 0xf2d24a],
};

/** Caixa de colisão (local). `topo` em metros acima do piso de fora. */
export interface CaixaLocal { x0: number; x1: number; z0: number; z1: number; topo: number }
/** Piso elevado (local): quem pisa dentro fica a `altura` metros acima do chão de fora. */
export interface PisoLocal { x0: number; x1: number; z0: number; z1: number; altura: number }

export interface Capela {
  grupo: THREE.Group;
  /** Some quando o peregrino está dentro, para a câmera ver o interior por cima. */
  telhado: THREE.Object3D;
  caixas: CaixaLocal[];
  pisos: PisoLocal[];
  /** Retângulo do interior (para saber se o peregrino está dentro). */
  interior: { x0: number; x1: number; z0: number; z1: number };
  /** Luzes de dentro (o Jogo apaga quando o peregrino está longe). */
  luzes: THREE.PointLight[];
  pontos: {
    porta: THREE.Vector3;
    /** Diante da grade de comunhão, no centro (onde se recebe a Eucaristia). */
    comunhao: THREE.Vector3;
    sacrario: THREE.Vector3;
    /** Entrada do lado do penitente, no confessionário. */
    confessionario: THREE.Vector3;
    /** Onde o peregrino se ajoelha para confessar, e para onde ele olha (a grade). */
    joelhoConfissao: THREE.Vector3;
    gradeConfissao: THREE.Vector3;
    /** Onde fica o padre (atrás da grade). */
    padre: THREE.Vector3;
  };
}

const lx = (ix: number) => (ix - W / 2) * C;
const lz = (iz: number) => (iz - D / 2) * C;

export function construirCapela(e: EstiloCapela = ESTILO_VALE): Capela {
  const grupo = new THREE.Group();
  const v = (hex: number, k = 0.04) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
  const reboco = v(e.reboco, 0.025);
  const pedra = v(e.pedra, 0.06);

  // ════════════════════════ casca ════════════════════════
  const m = new Modelo();
  const janela = (iy: number, centro: number, j: number, larg = 6, base = 8, topo = 15) => {
    // janela em arco: retângulo com o alto arredondado
    const meio = centro - 0.5;
    const raio = larg / 2;
    if (iy < base || iy > topo + raio) return false;
    if (Math.abs(j - meio) > raio) return false;
    if (iy > topo) return (j - meio) ** 2 + (iy - topo) ** 2 <= raio * raio;
    return true;
  };
  const corVitral = (iy: number, j: number, centro: number, topo = 15) => {
    const dj = Math.abs(j - (centro - 0.5));
    const raio = 3;
    // moldura dourada na borda (inclusive no arco)
    if (dj > 2 || (iy > topo && dj ** 2 + (iy - topo) ** 2 > (raio - 1) ** 2)) return e.vitral[2];
    if ((iy === 12 && dj < 2) || (dj < 0.6 && iy >= 9)) return e.vitral[1]; // cruz vermelha
    if (iy > topo) return e.vitral[4]; // céu roxo no arco
    return e.vitral[iy < 12 ? (dj < 1.2 ? 3 : 0) : dj < 1.2 ? 0 : 3];
  };
  const JANELAS_LADO = [8, 21, 33, 45];

  // piso: nave em xadrez, tapete no corredor, presbitério de mármore um degrau acima
  for (let ix = 2; ix < W - 2; ix++)
    for (let iz = 2; iz < D - 2; iz++) {
      const presb = iz < 16;
      const corredor = ix >= 15 && ix <= 20 && iz >= 16;
      let cor: number;
      if (presb) cor = variar((ix + iz) % 4 < 2 ? e.marmore : 0xcfc6b4, ix, 0, iz, 0.02);
      else if (corredor) cor = ix === 15 || ix === 20 ? 0xd8b04a : variar(e.tapete, ix, 0, iz, 0.03);
      else cor = variar(((ix >> 1) + (iz >> 1)) % 2 ? e.pisoA : e.pisoB, ix, 0, iz, 0.025);
      m.ponto(ix, 0, iz, cor);
      if (presb) m.ponto(ix, 1, iz, cor);
    }
  m.caixa(14, 0, 16, 8, 1, 1, v(e.marmore, 0.02)); // degrau do presbitério, diante do altar

  // paredes (2 voxels), com rodapé de pedra por fora e lambri de madeira por dentro
  for (let iy = 0; iy < H; iy++)
    for (let ix = 0; ix < W; ix++)
      for (let iz = 0; iz < D; iz++) {
        const lado = ix < 2 || ix >= W - 2;
        const fundoFrente = iz < 2 || iz >= D - 2;
        if (!lado && !fundoFrente) continue;
        const dentro = (ix === 1 || ix === W - 2 || iz === 1 || iz === D - 2) && !(ix < 1 || ix > W - 2 || iz < 1 || iz > D - 2);
        // porta em arco na frente
        if (iz >= D - 2) {
          const dx = ix - 17.5;
          if (Math.abs(dx) < 4 && (iy <= 9 || dx * dx + (iy - 9) ** 2 < 16)) continue;
          // rosácea
          const r2 = dx * dx + (iy - 15.5) ** 2;
          if (r2 < 6.5) {
            const ang = Math.atan2(iy - 15.5, dx);
            m.ponto(ix, iy, iz, r2 < 1 ? e.vitral[2] : e.vitral[Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8) % 4]);
            continue;
          }
        }
        // vitrais dos lados
        if (lado) {
          const c = JANELAS_LADO.find((c) => janela(iy, c, iz));
          if (c !== undefined) {
            m.ponto(ix, iy, iz, corVitral(iy, iz, c));
            continue;
          }
        }
        let cor: number;
        if (dentro && iy >= 1 && iy <= 4) cor = iy === 4 ? e.madeiraEscura : variar(e.madeira, ix, iy, iz, 0.04);
        else if (!dentro && iy < 2) cor = pedra(ix, iy, iz);
        else cor = reboco(ix, iy, iz);
        m.ponto(ix, iy, iz, cor);
      }
  // pilastras de pedra por fora e cornija
  for (const iz of [0, 14, 27, 40, D - 1]) for (let iy = 0; iy < H; iy++) m.ponto(-1, iy, iz, pedra(-1, iy, iz)).ponto(W, iy, iz, pedra(W, iy, iz));
  for (let iz = -1; iz <= D; iz++) m.ponto(-1, H - 1, iz, pedra(-1, H, iz)).ponto(W, H - 1, iz, pedra(W, H, iz));
  // rodapé saliente de pedra
  for (let iz = -1; iz <= D; iz++) for (let iy = 0; iy < 2; iy++) m.ponto(-1, iy, iz, pedra(-1, iy, iz)).ponto(W, iy, iz, pedra(W, iy, iz));
  for (let ix = -1; ix <= W; ix++) for (let iy = 0; iy < 2; iy++) {
    m.ponto(ix, iy, -1, pedra(ix, iy, -1));
    if (Math.abs(ix - 17.5) >= 4) m.ponto(ix, iy, D, pedra(ix, iy, D));
  }
  // arco da porta em pedra (aduelas)
  for (let ix = 12; ix < 24; ix++)
    for (let iy = 0; iy < 15; iy++) {
      const dx = ix - 17.5;
      const r2 = dx * dx + (iy - 9) ** 2;
      const naLateral = iy <= 9 && Math.abs(dx) >= 4 && Math.abs(dx) < 5;
      if ((iy > 9 && r2 >= 16 && r2 < 26) || naLateral) m.ponto(ix, iy, D, (ix + iy) % 3 ? e.pedra : 0x8a8274);
    }
  // o que fica acima das paredes (empenas, campanário, telhado) é uma malha só, que some com o peregrino dentro
  const t = new Modelo();
  // empenas (frente e fundo), em degraus como nas capelas de pedra
  for (let k = 0; k < PICO; k++) {
    const iy = H + k;
    for (let ix = 2 * k; ix < W - 2 * k; ix++)
      for (const iz of [0, 1, D - 2, D - 1]) {
        if (iz >= D - 2 && (ix - 17.5) ** 2 + (iy - 15.5) ** 2 < 6.5) continue;
        t.ponto(ix, iy, iz, reboco(ix, iy, iz));
      }
  }
  // campanário sobre a fachada: base, sineira em arco, sino, cobertura e cruz
  const T0 = 13, T1 = 23, TZ0 = D - 6, TZ1 = D;
  const topoT = H + PICO + 1;
  for (let iy = H + 4; iy < topoT + 7; iy++)
    for (let ix = T0; ix < T1; ix++)
      for (let iz = TZ0; iz < TZ1; iz++) {
        const borda = ix === T0 || ix === T1 - 1 || iz === TZ0 || iz === TZ1 - 1;
        if (!borda) continue;
        const canto = (ix === T0 || ix === T1 - 1) && (iz === TZ0 || iz === TZ1 - 1);
        const sineira = iy >= topoT && iy < topoT + 5 && !canto;
        const meioX = Math.abs(ix - 17.5) < 2.5, meioZ = Math.abs(iz - (TZ0 + 2.5)) < 1.5;
        if (sineira && (meioX || meioZ) && iy < topoT + 4) continue; // vãos da sineira
        t.ponto(ix, iy, iz, canto ? pedra(ix, iy, iz) : reboco(ix, iy, iz));
      }
  t.caixa(T0 - 1, topoT - 1, TZ0 - 1, T1 - T0 + 2, 1, TZ1 - TZ0 + 2, pedra); // cornija da torre
  t.caixa(T0 - 1, topoT + 5, TZ0 - 1, T1 - T0 + 2, 1, TZ1 - TZ0 + 2, pedra);
  t.caixa(16, topoT, TZ0 + 2, 4, 3, 2, (_x, y) => (y === topoT ? 0xb88a2a : 0xd8b04a)); // sino
  t.caixa(17, topoT + 3, TZ0 + 2, 2, 2, 2, 0x5a4a3a); // trave do sino
  for (let k = 0; k < 6; k++) t.caixa(T0 + k, topoT + 6 + k, TZ0 + k - 1, T1 - T0 - 2 * k, 1, TZ1 - TZ0 - 2 * k + 2, (x, y, z) => ((x + z + y) % 3 ? e.telha : e.cumeeira));
  t.caixa(16, topoT + 9, TZ0 + 1, 4, 1, 4, e.cumeeira); // remate da cobertura
  t.caixa(17, topoT + 10, TZ0 + 2, 2, 8, 2, 0xe8c45a).caixa(15, topoT + 15, TZ0 + 2, 6, 2, 2, 0xe8c45a); // cruz
  // adro: degrau de pedra, canteiros de flores e lanternas
  m.caixa(11, 0, D + 1, 14, 1, 3, pedra);
  for (const x0 of [3, 26]) {
    m.caixa(x0, 0, D + 1, 7, 1, 2, v(0x5a3e26, 0.08));
    for (let ix = x0; ix < x0 + 7; ix++)
      for (let iz = D + 1; iz < D + 3; iz++) {
        const h = (ix * 7 + iz * 3) % 5;
        m.ponto(ix, 1, iz, v(0x3e8a3a, 0.1)(ix, 1, iz));
        if (h < 3) m.ponto(ix, 2, iz, h === 0 ? e.flores[0] : h === 1 ? 0x4a9a3e : e.flores[(ix + iz) % e.flores.length]);
      }
  }
  for (const ix of [10, 25]) m.caixa(ix, 8, D, 1, 1, 1, 0x2a2a2a).caixa(ix, 9, D, 1, 2, 1, 0xffd27a).caixa(ix, 11, D, 1, 1, 1, 0x2a2a2a);
  const casca = m.malha(C, [W / 2, 0, D / 2]);
  grupo.add(casca);

  // ════════════════════════ telhado (some com o peregrino dentro) ════════════════════════
  // (as águas do telhado; as empenas e o campanário, montados acima, vão junto)
  for (let k = 0; k < PICO; k++) {
    const iy = H + k;
    for (let iz = -2; iz < D + 2; iz++) {
      const telha = (x: number) => ((iz + k) % 4 === 0 ? e.cumeeira : variar(e.telha, x, iy, iz, 0.05));
      for (const ix of [2 * k - 2, 2 * k - 1]) t.ponto(ix, iy, iz, telha(ix));
      for (const ix of [W - 2 * k, W - 2 * k + 1]) t.ponto(ix, iy, iz, telha(ix));
    }
  }
  for (let iz = -2; iz < D + 2; iz++) t.caixa(2 * PICO - 2, H + PICO, iz, W - 4 * PICO + 4, 1, 1, e.cumeeira); // cumeeira
  const telhado = t.malha(C, [W / 2, 0, D / 2]);
  grupo.add(telhado);

  // ════════════════════════ mobília ════════════════════════
  const piso = (presbiterio = false) => (presbiterio ? 0.5 : 0.25);
  const por = (obj: THREE.Object3D, x: number, y: number, z: number, rotY = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = rotY;
    grupo.add(obj);
    return obj;
  };
  const madeira = v(e.madeira, 0.05);
  const madeiraEsc = v(e.madeiraEscura, 0.04);
  const caixas: CaixaLocal[] = [];

  // bancos: 5 fileiras de cada lado do corredor, de frente para o altar (−z)
  const banco = new Modelo();
  const L = 22;
  banco.caixa(0, 3, 0, L, 1, 4, madeira); // assento
  banco.caixa(0, 4, 4, L, 4, 1, madeira).caixa(0, 8, 4, L, 1, 1, madeiraEsc); // encosto
  banco.caixa(0, 5, 5, L, 1, 1, madeiraEsc); // porta-livros atrás
  banco.caixa(0, 0, -2, L, 1, 1, v(0x7a2a2a, 0.04)); // genuflexório (estofado)
  for (const x of [0, L - 1]) {
    banco.caixa(x, 0, -2, 1, 9, 7, madeiraEsc); // cabeceiras
    banco.ponto(x, 8, -2, null).ponto(x, 8, -1, null).ponto(x, 7, -2, null);
  }
  const geoBanco = banco.geometria(M, [L / 2, 0, 2]);
  const BANCOS_Z = [-0.6, 0.45, 1.5, 2.55, 3.6];
  for (const z of BANCOS_Z)
    for (const x of [-2.25, 2.25]) {
      const b = new THREE.Mesh(geoBanco, casca.material);
      b.castShadow = true;
      b.receiveShadow = true;
      por(b, x, piso(), z);
      caixas.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 0.25, z1: z + 0.4, topo: 1.2 });
    }

  // grade de comunhão diante do presbitério, aberta no centro
  const grade = new Modelo();
  const LG = 26;
  grade.caixa(0, 0, 0, LG, 1, 2, v(e.marmore, 0.02)).caixa(0, 6, 0, LG, 1, 2, madeiraEsc);
  for (let x = 0; x < LG; x += 2) grade.caixa(x, 1, 0, 1, 5, 1, (x2, y) => (y === 3 ? 0xd8b04a : madeira(x2, y, 0)));
  const geoGrade = grade.geometria(M, [LG / 2, 0, 1]);
  for (const x of [-2.4, 2.4]) {
    const g = new THREE.Mesh(geoGrade, casca.material);
    g.castShadow = true;
    por(g, x, piso(true), -3.1);
    caixas.push({ x0: x - 1.65, x1: x + 1.65, z0: -3.25, z1: -2.95, topo: 1.4 });
  }

  // altar de pedra com toalha branca, velas e missal
  const altar = new Modelo();
  altar.caixa(0, 0, 0, 16, 7, 7, v(e.marmore, 0.03));
  for (const x of [2, 7, 12]) altar.caixa(x, 1, 7, 2, 5, 1, v(0xcfc6b4, 0.02)); // relevos (arcadas)
  altar.caixa(7, 2, 8, 2, 4, 1, 0xd8b04a).caixa(6, 4, 8, 4, 1, 1, 0xd8b04a); // cruz dourada na frente
  altar.caixa(-1, 7, -1, 18, 1, 9, 0xf4f1ea); // toalha
  altar.caixa(-1, 4, -1, 1, 3, 9, 0xf4f1ea).caixa(16, 4, -1, 1, 3, 9, 0xf4f1ea); // caindo nos lados
  altar.caixa(-1, 6, 8, 18, 1, 1, 0xd8b04a); // galão
  for (const x of [0, 15]) altar.caixa(x, 8, 3, 1, 1, 1, 0xd8b04a).caixa(x, 9, 3, 1, 2, 1, 0xd8b04a).caixa(x, 11, 3, 1, 3, 1, 0xfaf6e8).ponto(x, 14, 3, 0xffc04a);
  altar.caixa(10, 8, 2, 3, 1, 2, 0x8e1b2a).caixa(10, 9, 2, 3, 1, 2, 0xefe4c8); // missal na estante
  const mAltar = por(altar.malha(M, [8, 0, 3.5]), 0, piso(true), -5.0);
  void mAltar;
  caixas.push({ x0: -1.1, x1: 1.1, z0: -5.5, z1: -4.5, topo: 1.6 });

  // sacrário dourado sobre a coluna, no fundo, com o véu (conopeu) e a lâmpada do Santíssimo
  const sac = new Modelo();
  sac.caixa(1, 0, 1, 6, 10, 5, v(e.marmore, 0.03)); // coluna
  sac.caixa(0, 10, 0, 8, 1, 7, v(0xcfc6b4, 0.02));
  sac.caixa(1, 11, 1, 6, 6, 5, (x, y) => variar(y === 16 ? 0xb88a2a : 0xe0b84e, x, y, 0, 0.03)); // caixa dourada
  sac.caixa(3, 12, 6, 2, 4, 1, 0xf4f1ea).caixa(2, 14, 6, 4, 1, 1, 0xf4f1ea); // cruz branca na porta
  sac.caixa(2, 17, 2, 4, 1, 3, 0xe0b84e).caixa(3, 18, 3, 2, 2, 1, 0xe0b84e); // cúpula e cruz
  sac.caixa(0, 11, 0, 1, 6, 6, 0xf0ead8).caixa(7, 11, 0, 1, 6, 6, 0xf0ead8); // conopeu
  por(sac.malha(M, [4, 0, 3.5]), 0, piso(true), -6.25);
  const lamp = new Modelo();
  lamp.caixa(0, 0, 0, 1, 1, 3, 0x3a3a3a).caixa(0, -3, 2, 1, 3, 1, 0x3a3a3a); // braço de ferro
  lamp.caixa(-1, -6, 1, 3, 3, 3, 0xc8202a).ponto(0, -5, 2, 0xffd27a).caixa(-1, -7, 1, 3, 1, 3, 0xd8b04a);
  por(lamp.malha(M, [0, 0, 0]), 0.75, 2.2, -6.5);
  const luzSac = new THREE.PointLight(0xff3a2a, 1.6, 4, 2);
  luzSac.position.set(0.8, 1.55, -6.1);
  grupo.add(luzSac);

  // crucifixo no fundo, sobre o sacrário (voxel de 1/22 m, para o Corpo de Cristo ter detalhe)
  const cr = new Modelo();
  const pele = 0xd8a882;
  cr.caixa(9, 0, 0, 6, 44, 2, madeiraEsc).caixa(0, 27, 0, 24, 6, 2, madeiraEsc).caixa(8, 0, 0, 8, 1, 3, madeiraEsc);
  cr.caixa(9, 39, 2, 6, 3, 1, 0xf4f1ea).caixa(10, 40, 3, 4, 1, 1, 0x8e1b2a); // INRI
  cr.caixa(10, 33, 2, 4, 5, 2, pele).caixa(9, 37, 2, 6, 1, 2, 0x5a6a3a).ponto(11, 34, 4, 0x6a4a3a).ponto(13, 35, 4, 0x3a2a1a); // cabeça, coroa de espinhos
  cr.caixa(10, 22, 2, 4, 10, 2, pele); // tronco
  cr.caixa(1, 29, 2, 9, 2, 2, pele).caixa(14, 29, 2, 9, 2, 2, pele); // braços
  cr.caixa(10, 18, 2, 4, 4, 3, 0xf4f1ea); // perizônio
  cr.caixa(10, 8, 2, 4, 10, 2, pele); // pernas
  cr.ponto(1, 30, 4, 0x8a1a1a).ponto(22, 30, 4, 0x8a1a1a).ponto(11, 8, 4, 0x8a1a1a).ponto(13, 25, 4, 0x8a1a1a); // chagas
  por(cr.malha(1 / 22, [12, 0, 0]), 0, 2.95, -6.5);

  // ambão (à esquerda) e sede (à direita)
  const ambao = new Modelo();
  ambao.caixa(0, 0, 0, 5, 1, 4, madeiraEsc).caixa(1, 1, 1, 3, 7, 2, madeira).caixa(-1, 8, -1, 7, 1, 6, madeiraEsc);
  ambao.caixa(2, 3, 3, 1, 3, 1, 0xd8b04a).caixa(1, 4, 3, 3, 1, 1, 0xd8b04a);
  ambao.caixa(0, 9, 0, 5, 1, 4, 0xefe4c8).caixa(2, 9, 0, 1, 1, 4, 0x8e1b2a); // livro aberto
  por(ambao.malha(M, [2.5, 0, 2]), -2.4, piso(true), -3.9, 0.25);
  caixas.push({ x0: -2.8, x1: -2.0, z0: -4.2, z1: -3.6, topo: 1.4 });
  const sede = new Modelo();
  sede.caixa(0, 0, 0, 5, 3, 5, madeiraEsc).caixa(0, 3, 0, 5, 1, 5, 0x9a1f2a).caixa(0, 3, 4, 5, 9, 1, madeiraEsc).caixa(1, 5, 3, 3, 6, 1, 0x9a1f2a);
  sede.caixa(0, 4, 0, 1, 2, 4, madeiraEsc).caixa(4, 4, 0, 1, 2, 4, madeiraEsc);
  por(sede.malha(M, [2.5, 0, 2.5]), 3.2, piso(true), -5.0, -Math.PI / 2);
  caixas.push({ x0: 2.9, x1: 3.6, z0: -5.35, z1: -4.65, topo: 1.4 });

  // imagens: Nossa Senhora e São José em pedestais, com flores
  const pedestal = new Modelo();
  pedestal.caixa(0, 0, 0, 6, 1, 6, v(e.marmore, 0.03)).caixa(1, 1, 1, 4, 4, 4, v(0xcfc6b4, 0.03)).caixa(0, 5, 0, 6, 1, 6, v(e.marmore, 0.03));
  const imagem = (f: Figurino, x: number, rot: number) => {
    por(pedestal.malha(M, [3, 0, 3]), x, piso(), -2.1);
    const h = montarHumano(f);
    h.raiz.scale.setScalar(0.62);
    por(h.raiz, x, piso() + 0.75, -2.1, rot);
    caixas.push({ x0: x - 0.4, x1: x + 0.4, z0: -2.5, z1: -1.7, topo: 3 });
  };
  imagem({ genero: 'f', idade: 'jovem', pele: 0xf0d0b0, penteado: 'veu', corCabelo: 0x3b2618, traje: 'vestido', cor: 0xf4f1ea, cor2: 0x2f5fc8, halo: true }, -3.45, 0.5);
  imagem({ genero: 'm', idade: 'adulto', pele: 0xe0b890, penteado: 'curto', corCabelo: 0x4a3020, barba: 'curta', traje: 'tunica', cor: 0x6a8a4a, cor2: 0x8a5a2a, acessorio: 'cajado', halo: true }, 3.45, -0.5);
  // velas votivas diante de Nossa Senhora
  const votivas = new Modelo();
  votivas.caixa(0, 0, 0, 1, 5, 1, 0x2a2a2a).caixa(5, 0, 0, 1, 5, 1, 0x2a2a2a).caixa(0, 5, 0, 6, 1, 3, 0x2a2a2a);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) votivas.ponto(i, 6, j * 2, j ? 0xc8202a : 0xf4f1ea).ponto(i, 7, j * 2, (i + j) % 2 ? 0xffc04a : 0xffe08a);
  por(votivas.malha(M, [3, 0, 1.5]), -2.8, piso(), -1.65, 0.5);
  for (const x of [-1.6, 1.6]) {
    const vaso = new Modelo();
    vaso.caixa(0, 0, 0, 3, 3, 3, 0xd8b04a).caixa(1, 3, 1, 1, 3, 1, 0x3e8a3a);
    for (const [dx, dy, dz] of [[0, 5, 0], [2, 6, 1], [1, 7, 2], [0, 6, 2], [2, 5, 0], [1, 6, 1]]) vaso.ponto(dx, dy, dz, e.flores[(dx + dz) % e.flores.length]);
    vaso.caixa(0, 4, 1, 3, 1, 1, 0x4a9a3e);
    por(vaso.malha(M, [1.5, 0, 1.5]), x, piso(true), -5.3);
  }

  // pias de água benta junto à porta
  const pia = new Modelo();
  pia.caixa(1, 0, 1, 2, 7, 2, v(e.pedra, 0.05)).caixa(0, 7, 0, 4, 1, 4, v(e.pedra, 0.05)).caixa(0, 8, 0, 4, 1, 1, v(e.pedra, 0.05)).caixa(0, 8, 3, 4, 1, 1, v(e.pedra, 0.05));
  pia.caixa(0, 8, 1, 1, 1, 2, v(e.pedra, 0.05)).caixa(3, 8, 1, 1, 1, 2, v(e.pedra, 0.05)).caixa(1, 8, 1, 2, 1, 2, 0x6aa8d8);
  for (const x of [-1.55, 1.55]) {
    por(pia.malha(M, [2, 0, 2]), x, piso(), 6.1);
    caixas.push({ x0: x - 0.25, x1: x + 0.25, z0: 5.85, z1: 6.35, topo: 1.2 });
  }

  // Via Sacra: 14 estações nas paredes, 7 de cada lado; arandelas entre os vitrais
  const estacao = new Modelo();
  estacao.caixa(0, 0, 0, 4, 5, 1, madeiraEsc).caixa(1, 1, 0, 2, 3, 1, 0xe8dcc4).ponto(1, 3, 1, 0x3a2a1a).ponto(2, 3, 1, 0x3a2a1a).ponto(2, 4, 1, 0x3a2a1a).ponto(2, 2, 1, 0x3a2a1a);
  estacao.caixa(1, 5, 0, 2, 1, 1, madeiraEsc).ponto(2, 6, 0, 0xd8b04a);
  const geoEst = estacao.geometria(M, [2, 0, 0]);
  for (let i = 0; i < 7; i++) {
    const z = -2.4 + i * 1.3;
    for (const [x, r] of [[-4.0, Math.PI / 2], [4.0, -Math.PI / 2]] as const) {
      const est = new THREE.Mesh(geoEst, casca.material);
      por(est, x, 1.2, z, r);
    }
  }
  const arandela = new Modelo();
  arandela.caixa(0, 0, 0, 2, 1, 2, 0x2a2a2a).caixa(0, 1, 0, 2, 2, 2, 0xffd27a).caixa(0, 3, 0, 2, 1, 2, 0x2a2a2a).caixa(0, 0, -1, 2, 1, 1, 0x2a2a2a);
  const geoAr = arandela.geometria(M, [1, 0, -1]);
  for (const z of [-3.4, -0.25, 2.75, 5.6])
    for (const [x, r] of [[-4.0, Math.PI / 2], [4.0, -Math.PI / 2]] as const) por(new THREE.Mesh(geoAr, casca.material), x, 3.0, z, r);
  const luzNave = new THREE.PointLight(0xffd8a0, 9, 14, 1.4);
  luzNave.position.set(0, 3.6, 0.5);
  grupo.add(luzNave);

  // ════════════════════════ confessionário (canto de trás, à esquerda; entra-se pelo lado do penitente) ════════════════════════
  const conf = construirConfessionario(e);
  const CX = -3.5, CZ = 5.5; // centro do confessionário (encostado na parede esquerda, frente para +x)
  por(conf.malha, CX, piso(), CZ, Math.PI / 2);
  // colisão: paredes externas e o compartimento do padre (fechado); o do penitente fica aberto na frente
  caixas.push(
    { x0: -4.0, x1: -3.0, z0: 6.3, z1: 6.45, topo: 3 }, // parede do lado da porta
    { x0: -4.0, x1: -3.0, z0: 4.55, z1: 5.5, topo: 3 }, // compartimento do padre
  );
  const localConf = (x: number, z: number) => {
    // modelo: x 0..18 (0,1 m), frente em +z; girado +90°: x do modelo → −z do mundo, z do modelo → +x
    const mx = (x - 9) * 0.1, mz = (z - 5) * 0.1;
    return new THREE.Vector3(CX + mz, piso(), CZ - mx);
  };

  // ════════════════════════ colisão das paredes e pisos ════════════════════════
  const xi = lx(2), xf = lx(W - 2), zi = lz(2), zf = lz(D - 2);
  const ALTO = 9;
  caixas.push(
    { x0: lx(0), x1: xi, z0: lz(0), z1: lz(D), topo: ALTO },
    { x0: xf, x1: lx(W), z0: lz(0), z1: lz(D), topo: ALTO },
    { x0: lx(0), x1: lx(W), z0: lz(0), z1: zi, topo: ALTO },
    { x0: lx(0), x1: lx(14), z0: zf, z1: lz(D), topo: ALTO },
    { x0: lx(22), x1: lx(W), z0: zf, z1: lz(D), topo: ALTO },
    { x0: -0.9, x1: 0.9, z0: -6.75, z1: -5.75, topo: 2.2 }, // sacrário
  );
  const pisos: PisoLocal[] = [
    { x0: xi, x1: xf, z0: zi, z1: lz(16), altura: 0.5 }, // presbitério
    { x0: lx(14), x1: lx(22), z0: lz(16), z1: lz(17), altura: 0.5 }, // degrau
    { x0: xi, x1: xf, z0: lz(16), z1: zf, altura: 0.25 }, // nave
    { x0: lx(13.9), x1: lx(22.1), z0: zf, z1: lz(D), altura: 0.25 }, // soleira
    { x0: lx(11), x1: lx(25), z0: lz(D), z1: lz(D + 4), altura: 0.25 }, // adro
  ];

  return {
    grupo,
    telhado,
    caixas,
    pisos,
    interior: { x0: xi, x1: xf, z0: zi, z1: zf },
    luzes: [luzNave, luzSac],
    pontos: {
      porta: new THREE.Vector3(0, 0, lz(D) + 1.2),
      comunhao: new THREE.Vector3(0, piso(), -2.6),
      sacrario: new THREE.Vector3(0, piso(true), -5.9),
      confessionario: localConf(4.5, 12),
      joelhoConfissao: localConf(5, 5),
      gradeConfissao: localConf(9, 5),
      padre: localConf(13.5, 4.5),
    },
  };
}

/**
 * Confessionário de madeira (0,1 m por voxel), frente para +z, 1,8 m de largura:
 * à esquerda o penitente (aberto, cortina puxada, genuflexório junto à grade); à direita o padre, atrás da porta.
 */
function construirConfessionario(e: EstiloCapela) {
  const m = new Modelo();
  const madeira = (x: number, y: number, z: number) => variar(e.madeira, x, y, z, 0.05);
  const escura = (x: number, y: number, z: number) => variar(e.madeiraEscura, x, y, z, 0.04);
  const friso = (x: number, y: number, z: number) => variar(0xc08a4a, x, y, z, 0.03);
  const roxo = (x: number, y: number, z: number) => variar(x % 2 ? 0x6a3088 : 0x542470, x, y, z, 0.03);
  const ouro = 0xe0b84e;
  const WC = 18, HC = 23, DC = 10;
  m.caixa(0, 0, 0, WC, 1, DC, escura); // estrado
  m.caixa(0, 1, 0, WC, HC, 1, madeira); // fundo
  for (const x of [0, 9, WC - 1]) m.caixa(x, 1, 0, 1, HC, DC, madeira); // laterais e divisória
  for (const x of [0, 9, WC - 1]) m.caixa(x, 1, DC - 1, 1, HC, 1, escura).ponto(x, 19, DC - 1, friso(x, 19, DC - 1)); // pilastras
  // grade entre penitente e padre, na altura do rosto de quem está ajoelhado
  for (let y = 8; y < 14; y++) for (let z = 3; z < 8; z++) m.ponto(9, y, z, (y + z) % 2 ? null : escura(9, y, z));
  m.caixa(1, 7, 3, 3, 1, 5, escura); // apoio para os braços, junto à grade
  // genuflexório do penitente
  m.caixa(1, 1, 2, 7, 1, 6, v2(0x7a2a2a));
  // cortina roxa puxada para o canto
  m.caixa(1, 3, DC - 1, 2, 17, 1, roxo).caixa(1, 20, DC - 1, 8, 1, 1, ouro);
  // porta do padre: moldura, almofadas e treliça
  m.caixa(10, 1, DC - 1, 7, 19, 1, friso);
  m.caixa(11, 2, DC - 1, 5, 7, 1, madeira).caixa(11, 10, DC - 1, 5, 3, 1, madeira);
  for (let y = 14; y < 19; y++) for (let x = 11; x < 16; x++) m.ponto(x, y, DC - 1, (x + y) % 2 ? null : escura(x, y, DC - 1));
  m.ponto(15, 10, DC, ouro);
  m.caixa(11, 1, 2, 5, 4, 4, escura); // banco do padre
  // arquitrave, cornija e cruz
  m.caixa(0, 20, DC - 1, WC, 3, 1, escura).caixa(0, 21, DC, WC, 1, 1, friso);
  m.caixa(0, HC + 1, 0, WC, 1, DC + 1, friso).caixa(1, HC + 2, 1, WC - 2, 1, DC - 1, escura);
  m.caixa(8, HC + 3, 4, 2, 6, 1, ouro).caixa(6, HC + 6, 4, 6, 1, 1, ouro);
  return { malha: m.malha(0.1, [9, 0, 5]) };
}

function v2(hex: number) {
  return (x: number, y: number, z: number) => variar(hex, x, y, z, 0.04);
}

/** Caixa e piso já no espaço do mundo (o piso guarda a altura absoluta). */
export interface CaixaMundo { x0: number; x1: number; z0: number; z1: number; topo: number }
export interface PisoMundo { x0: number; x1: number; z0: number; z1: number; altura: number }

/**
 * A capela de uma região posta no mundo: o prédio, o padre que confessa, a colisão, os pisos elevados e
 * os pontos dos sacramentos já em coordenadas do mundo. A área só a coloca e repassa física e atualização;
 * o Jogo cuida da confissão e da comunhão do mesmo jeito em qualquer região.
 */
export class CapelaRegional {
  readonly capela: Capela;
  readonly padre: Npc;
  readonly altar: THREE.Vector3;
  readonly sacrario: THREE.Vector3;
  readonly confessionario: THREE.Vector3;
  readonly joelhoConfissao: THREE.Vector3;
  readonly gradeConfissao: THREE.Vector3;
  readonly porta: THREE.Vector3;
  readonly caixas: CaixaMundo[];
  readonly pisos: PisoMundo[];
  private t = 0;

  constructor(estilo: EstiloCapela, readonly x: number, readonly z: number, readonly chao: number, padre: DefNpc) {
    this.capela = construirCapela(estilo);
    const cap = this.capela;
    cap.grupo.position.set(x, chao, z);
    const noMundo = (v: THREE.Vector3) => v.clone().add(new THREE.Vector3(x, chao, z));
    this.caixas = cap.caixas.map((b) => ({ x0: b.x0 + x, x1: b.x1 + x, z0: b.z0 + z, z1: b.z1 + z, topo: b.topo + chao }));
    this.pisos = cap.pisos.map((p) => ({ x0: p.x0 + x, x1: p.x1 + x, z0: p.z0 + z, z1: p.z1 + z, altura: p.altura + chao }));
    this.altar = noMundo(cap.pontos.comunhao);
    this.porta = noMundo(cap.pontos.porta);
    this.sacrario = noMundo(cap.pontos.sacrario);
    this.confessionario = noMundo(cap.pontos.confessionario);
    this.joelhoConfissao = noMundo(cap.pontos.joelhoConfissao);
    this.gradeConfissao = noMundo(cap.pontos.gradeConfissao);
    this.padre = new Npc(padre, noMundo(cap.pontos.padre), Math.PI / 2);
    cap.grupo.add(this.padre.raiz);
    this.padre.raiz.position.sub(cap.grupo.position); // o padre fica dentro do grupo da capela
  }

  get grupo() {
    return this.capela.grupo;
  }

  /** Telhado some com o peregrino dentro; as luzes de dentro só acendem perto (o número de luzes não muda). */
  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.padre.atualizar(dt, jogador);
    this.capela.telhado.visible = !this.dentro(jogador);
    const perto = Math.hypot(jogador.x - this.x, jogador.z - this.z) < 30;
    const [nave, sac] = this.capela.luzes;
    nave.intensity = perto ? 9 : 0;
    sac.intensity = perto ? 1.4 + Math.sin(this.t * 7) * 0.15 + Math.sin(this.t * 17) * 0.1 : 0;
  }

  /** Altura do piso elevado em (x, z), ou null fora dele. */
  piso(x: number, z: number) {
    for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) return p.altura;
    return null;
  }

  /** O peregrino está dentro (o telhado some e a câmera passa por cima das paredes). */
  dentro(p: THREE.Vector3) {
    const r = this.capela.interior;
    const x = p.x - this.x, z = p.z - this.z;
    return x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 + 0.3;
  }

  /** Chão visto pela câmera com o peregrino dentro: as paredes contam como chão alto. */
  alturaCamera(x: number, z: number, base: (x: number, z: number) => number) {
    const r = this.capela.interior;
    const lx = x - this.x, lz = z - this.z;
    if (lx < r.x0 + 0.1 || lx > r.x1 - 0.1 || lz < r.z0 + 0.1 || lz > r.z1 - 0.1) return this.chao + 5.2;
    return base(x, z);
  }

  /** Contorno da capela no minimapa. */
  noMapa(x: number, z: number) {
    return Math.abs(x - this.x) < 4.6 && z > this.z - 7.1 && z < this.z + 7.1;
  }
}
