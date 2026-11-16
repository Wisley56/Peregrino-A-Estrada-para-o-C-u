import * as THREE from 'three';
import { Ruido } from '../core/Ruido';
import { ConstrutorMalha, FACES, ocluir } from '../voxel/Malha';
import { variar } from '../voxel/Modelo';

export const TAM = 160; // colunas (1 m cada)
export const META = TAM / 2;
export const NIVEL_AGUA = 2.45;
export const CAPELA = new THREE.Vector2(0, -36);
export const LAGO = new THREE.Vector2(38, 16);
/**
 * O jardim murado de Santo Agostinho, à direita da estrada, logo depois da fogueira: o centro e a metade do lado
 * de fora do muro (m). A trilha de terra sai da estrada e vai até a porta estreita, no meio do muro do oeste.
 */
export const JARDIM = { x: 17.5, z: 36, meio: 6 };
/** Corredor pelas montanhas do oeste: o véu fica em `veu`, e o caminho termina em `fim`. */
export const PASSAGEM = { z: 8, entrada: -52, veu: -61, fim: -67 };

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Centro da estrada no eixo X para uma posição Z. A estrada sobe do sul até a capela. */
export function estradaX(z: number) {
  return 7 * Math.sin(z * 0.045) + 2.5 * Math.sin(z * 0.11 + 1.3);
}

export class Terreno {
  readonly alturas = new Int16Array(TAM * TAM);
  readonly estrada = new Float32Array(TAM * TAM); // 0..1, peso da estrada
  readonly malha: THREE.Mesh;
  readonly agua: THREE.Mesh;
  private ruido = new Ruido(2026);
  private ruidoCor = new Ruido(77);

  constructor() {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const [h, e] = this.alturaContinua(i - META + 0.5, j - META + 0.5);
        this.alturas[i * TAM + j] = Math.round(h);
        this.estrada[i * TAM + j] = e;
      }
    this.malha = this.gerarMalha();
    this.agua = this.gerarAgua();
  }

  private base(x: number, z: number) {
    const morro = 11 * Math.exp(-((x - CAPELA.x) ** 2 + (z - CAPELA.y) ** 2) / (2 * 24 * 24));
    return 3.2 + this.ruido.fbm(x * 0.022 + 10, z * 0.022 + 10, 4) * 9 + morro;
  }

  private alturaContinua(x: number, z: number): [number, number] {
    let h = this.base(x, z);
    // detalhe fino
    h += (this.ruido.fbm(x * 0.12, z * 0.12, 2) - 0.5) * 1.6;

    // estrada: acompanha a altura suavizada do próprio traçado
    let pesoEstrada = 0;
    if (z > CAPELA.y + 6 && z < 56) {
      const cx = estradaX(z);
      const dist = Math.abs(x - cx);
      pesoEstrada = 1 - suave(1.6, 3.2, dist);
      const plano = 1 - suave(2.5, 7, dist);
      h = h + (this.base(cx, z) - h) * plano;
    }

    // adro da capela, plano
    const dc = Math.hypot(x - CAPELA.x, z - CAPELA.y);
    const hc = this.base(CAPELA.x, CAPELA.y);
    h = h + (hc - h) * (1 - suave(10, 15, dc));
    if (dc < 9 && z > CAPELA.y) pesoEstrada = Math.max(pesoEstrada, 1 - suave(1.4, 2.8, Math.abs(x - CAPELA.x)));

    // o jardim de Agostinho: um patamar plano em volta do muro e a trilha de terra até a porta
    const dj = Math.max(Math.abs(x - JARDIM.x), Math.abs(z - JARDIM.z));
    const hj = this.base(JARDIM.x, JARDIM.z);
    h = h + (hj - h) * (1 - suave(JARDIM.meio + 1.5, JARDIM.meio + 5, dj));
    if (x > estradaX(z) + 1 && x < JARDIM.x - JARDIM.meio && Math.abs(z - JARDIM.z) < 1.2)
      pesoEstrada = Math.max(pesoEstrada, 1 - suave(0.5, 1.1, Math.abs(z - JARDIM.z)));

    // lago
    const dl = Math.hypot(x - LAGO.x, (z - LAGO.y) * 1.3);
    h = h + (0.6 - h) * (1 - suave(7, 15, dl));

    // montanhas na borda (limite do mundo)
    const borda = Math.max(Math.abs(x), Math.abs(z));
    if (borda > 58) h += (borda - 58) * 1.4 + this.ruido.fbm(x * 0.08, z * 0.08) * 6 * suave(58, 70, borda);

    // passagem a oeste, cortando as montanhas (fechada pelo véu de trevas)
    if (x < PASSAGEM.entrada + 4 && x > PASSAGEM.fim - 3) {
      const w = (1 - suave(1.3, 2.6, Math.abs(z - PASSAGEM.z))) * (1 - suave(PASSAGEM.entrada, PASSAGEM.entrada + 4, x));
      const hp = this.base(PASSAGEM.entrada, PASSAGEM.z);
      h = h + (hp - h) * w;
      if (w > 0.5) pesoEstrada = Math.max(pesoEstrada, 1 - suave(0.8, 1.6, Math.abs(z - PASSAGEM.z)));
    }

    return [h, pesoEstrada];
  }

  /** Altura do topo da coluna em (x, z) do mundo. */
  altura(x: number, z: number) {
    const i = Math.floor(x + META), j = Math.floor(z + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 99;
    return this.alturas[i * TAM + j];
  }

  pesoEstrada(x: number, z: number) {
    const i = Math.floor(x + META), j = Math.floor(z + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0;
    return this.estrada[i * TAM + j];
  }

  private h(i: number, j: number) {
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0;
    return this.alturas[i * TAM + j];
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META, z = j - META;
    const n = this.ruidoCor.fbm(x * 0.08, z * 0.08, 3);
    const e = this.estrada[i * TAM + j];
    const perto = Math.hypot(x - LAGO.x, (z - LAGO.y) * 1.3);
    if (h <= 2) return variar(0x8a7a52, i, h, j, 0.05); // fundo do lago
    if (h <= 3 && perto < 19) return variar(0xd9c68e, i, h, j, 0.04); // areia
    if (e > 0.5) return variar(n > 0.5 ? 0xb39468 : 0xa48660, i, h, j, 0.05); // estrada de terra
    if (h >= 22) return variar(n > 0.45 ? 0x8b8a86 : 0x9d9b95, i, h, j, 0.05); // rocha
    if (h >= 18) return variar(n > 0.5 ? 0x6f8f4a : 0x86956a, i, h, j, 0.05);
    const verde = n < 0.4 ? 0x5f9a3c : n < 0.55 ? 0x6eab44 : n < 0.65 ? 0x7cb64c : 0x8ab955;
    return variar(verde, i, h, j, 0.045);
  }

  private gerarMalha() {
    return malhaDeColunas(TAM, (i, j) => this.h(i, j), (i, j, h) => this.corTopo(i, j, h), (i, y, j, prof, topo) =>
      prof === 0 ? topo : prof < 3 ? variar(0x7a5a3a, i, y, j, 0.05) : variar(0x7d7a74, i, y, j, 0.05),
    );
  }

  private gerarAgua() {
    const g = new THREE.CircleGeometry(24, 48);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(
      g,
      new THREE.MeshLambertMaterial({ color: 0x4f9fd0, transparent: true, opacity: 0.72, emissive: 0x0a2a44 }),
    );
    m.position.set(LAGO.x, NIVEL_AGUA, LAGO.y);
    m.scale.set(1, 1, 0.8);
    m.receiveShadow = true;
    return m;
  }
}

/**
 * Malha de colunas de voxel (1 m) a partir de um mapa de alturas `tam`×`tam`, centrado na origem.
 * `corLado` recebe a profundidade abaixo do topo (0 = a primeira camada) e a cor do topo.
 * Paredes mais fundas que `profundidadeMax` ficam abertas embaixo (ninguém as vê).
 */
export function malhaDeColunas(
  tam: number,
  h: (i: number, j: number) => number,
  corTopo: (i: number, j: number, h: number) => number,
  corLado: (i: number, y: number, j: number, prof: number, topo: number) => number,
  profundidadeMax = 6,
) {
  const m = new THREE.Mesh(geometriaDeColunas(tam, 0, tam, 0, tam, h, corTopo, corLado, profundidadeMax), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true;
  return m;
}

/**
 * O mesmo terreno de `malhaDeColunas`, partido em blocos de `bloco`×`bloco` colunas (um grupo com uma malha por
 * bloco, todas com o mesmo material). Para os mapas grandes: o renderizador só desenha os blocos que a câmera vê,
 * e cada bloco tem a sua esfera envolvente. O grupo se posiciona como a malha única (centrado na origem).
 */
export function blocosDeColunas(
  tam: number,
  h: (i: number, j: number) => number,
  corTopo: (i: number, j: number, h: number) => number,
  corLado: (i: number, y: number, j: number, prof: number, topo: number) => number,
  profundidadeMax = 6,
  bloco = 48,
) {
  const grupo = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (let i0 = 0; i0 < tam; i0 += bloco)
    for (let j0 = 0; j0 < tam; j0 += bloco) {
      const g = geometriaDeColunas(tam, i0, Math.min(tam, i0 + bloco), j0, Math.min(tam, j0 + bloco), h, corTopo, corLado, profundidadeMax);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, material);
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      grupo.add(m);
    }
  return grupo;
}

/** As colunas do retângulo [i0, i1) × [j0, j1) de um mapa `tam`×`tam` (vizinhos de fora do retângulo contam na oclusão). */
function geometriaDeColunas(
  tam: number,
  i0: number,
  i1: number,
  j0: number,
  j1: number,
  h: (i: number, j: number) => number,
  corTopo: (i: number, j: number, h: number) => number,
  corLado: (i: number, y: number, j: number, prof: number, topo: number) => number,
  profundidadeMax: number,
) {
  const meta = tam / 2;
  const b = new ConstrutorMalha();
  const cor = new THREE.Color();
  const v: [number, number, number][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const laterais = FACES.filter((f) => f.n[1] === 0);
  const topo = FACES.find((f) => f.n[1] === 1)!;
  // um bloco existe na coluna (i, j) abaixo da altura dela; fora do mapa, só o chão (y < 0)
  const cheio = (i: number, y: number, j: number) => (i < 0 || j < 0 || i >= tam || j >= tam ? y < 0 : y < h(i, j));
  const ao = [0, 0, 0, 0];
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const a = h(i, j);
      const hexTopo = corTopo(i, j, a);
      const x = i - meta, z = j - meta;
      cor.setHex(hexTopo);
      for (let k = 0; k < 4; k++) v[k] = [x + topo.v[k][0], a, z + topo.v[k][2]];
      b.quad(v, topo.n, cor, 1, ocluir(cheio, [i, a, j], 1, topo.v, ao));
      for (const f of laterais) {
        const hv = i + f.n[0] < 0 || j + f.n[2] < 0 || i + f.n[0] >= tam || j + f.n[2] >= tam ? 0 : h(i + f.n[0], j + f.n[2]);
        for (let y = Math.max(hv, a - profundidadeMax); y < a; y++) {
          cor.setHex(corLado(i, y, j, a - 1 - y, hexTopo));
          for (let k = 0; k < 4; k++) v[k] = [x + f.v[k][0], y + f.v[k][1], z + f.v[k][2]];
          b.quad(v, f.n, cor, f.sombra, ocluir(cheio, [i + f.n[0], y, j + f.n[2]], f.n[0] ? 0 : 2, f.v, ao));
        }
      }
    }
  return b.geometria();
}
