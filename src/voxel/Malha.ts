import * as THREE from 'three';

/**
 * Volume de voxels em coordenadas do Three (Y para cima).
 * `cor(x, y, z)` devolve null quando a célula está vazia.
 */
export interface Volume {
  min: [number, number, number];
  max: [number, number, number]; // exclusivo
  cor(x: number, y: number, z: number): THREE.Color | null;
}

// Faces de um cubo unitário, em sentido anti-horário visto de fora.
export const FACES: { n: [number, number, number]; v: [number, number, number][]; sombra: number }[] = [
  { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sombra: 0.86 },
  { n: [-1, 0, 0], v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], sombra: 0.86 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], sombra: 1.0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sombra: 0.6 },
  { n: [0, 0, 1], v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], sombra: 0.93 },
  { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sombra: 0.93 },
];

/**
 * Oclusão de ambiente embutida (estilo Minecraft): cada vértice de face olha os 3 blocos vizinhos na camada
 * à frente da face (dois lados e a diagonal) e escurece quanto mais fechado é o canto. Fica gravada na cor
 * dos vértices ao montar a malha, então não custa nada por quadro e vale em qualquer predefinição gráfica.
 * Índice = quantos lados estão livres (0 = canto fechado .. 3 = aberto).
 */
export const LUZ_DO_CANTO = [0.56, 0.73, 0.87, 1];

/**
 * Nível de oclusão (0..3) dos 4 cantos de uma face. `cheio(x,y,z)` diz se a célula tem bloco;
 * `frente` é a célula vizinha à face (célula + normal) e `d` o eixo da normal.
 */
export function ocluir(
  cheio: (x: number, y: number, z: number) => boolean,
  frente: [number, number, number],
  d: number,
  cantos: [number, number, number][],
  saida: number[],
) {
  const u = (d + 1) % 3, w = (d + 2) % 3;
  const q = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const su = cantos[k][u] ? 1 : -1, sw = cantos[k][w] ? 1 : -1;
    q[0] = frente[0]; q[1] = frente[1]; q[2] = frente[2];
    q[u] += su;
    const l1 = cheio(q[0], q[1], q[2]);
    q[u] -= su; q[w] += sw;
    const l2 = cheio(q[0], q[1], q[2]);
    q[u] += su;
    const diag = cheio(q[0], q[1], q[2]);
    saida[k] = l1 && l2 ? 0 : 3 - (+l1 + +l2 + +diag);
  }
  return saida;
}

/** Acumula quads e gera uma BufferGeometry com cores por vértice. */
export class ConstrutorMalha {
  pos: number[] = [];
  nor: number[] = [];
  cor: number[] = [];
  idx: number[] = [];

  /** `ao`: nível de oclusão (0..3) de cada um dos 4 cantos, ou nada (face toda aberta). */
  quad(
    verts: [number, number, number][],
    n: [number, number, number],
    c: THREE.Color,
    escurecer = 1,
    ao?: number[],
  ) {
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const v = verts[k];
      const luz = escurecer * (ao ? LUZ_DO_CANTO[ao[k]] : 1);
      this.pos.push(v[0], v[1], v[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.cor.push(c.r * luz, c.g * luz, c.b * luz);
    }
    // a diagonal do quad não pode passar pelo canto escuro, senão a sombra se espalha torta
    if (ao && ao[0] + ao[2] < ao[1] + ao[3]) this.idx.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
    else this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  geometria(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.cor, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/**
 * Gera a malha de um volume: só as faces expostas, com um sombreamento leve
 * por direção (estilo voxel clássico). `escala` = tamanho de um voxel em metros;
 * `pivo` = ponto do volume (em voxels) que vira a origem da malha.
 */
export function malhaDoVolume(vol: Volume, escala: number, pivo: [number, number, number] = [0, 0, 0]) {
  const b = new ConstrutorMalha();
  const min = vol.min;
  const dim = [vol.max[0] - min[0], vol.max[1] - min[1], vol.max[2] - min[2]];
  if (dim.some((d) => !(d > 0))) return b.geometria();

  // grade de ids de cor (0 = vazio), com uma borda vazia em volta
  const cores: THREE.Color[] = [];
  const ids = new Map<number, number>();
  const gx = dim[0] + 2, gy = dim[1] + 2, gz = dim[2] + 2;
  const grade = new Int32Array(gx * gy * gz);
  const at = (x: number, y: number, z: number) => ((x + 1) * gy + (y + 1)) * gz + (z + 1);
  for (let x = 0; x < dim[0]; x++)
    for (let y = 0; y < dim[1]; y++)
      for (let z = 0; z < dim[2]; z++) {
        const c = vol.cor(x + min[0], y + min[1], z + min[2]);
        if (!c) continue;
        const k = c.getHex();
        let id = ids.get(k);
        if (id === undefined) {
          id = cores.push(c);
          ids.set(k, id);
        }
        grade[at(x, y, z)] = id;
      }

  // greedy meshing: junta faces vizinhas da mesma cor em retângulos
  const v: [number, number, number][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const p = [0, 0, 0];
  const cheio = (x: number, y: number, z: number) => grade[at(x, y, z)] !== 0;
  const ao = [0, 0, 0, 0];
  const frente: [number, number, number] = [0, 0, 0];
  for (const f of FACES) {
    const d = f.n[0] ? 0 : f.n[1] ? 1 : 2;
    const u = (d + 1) % 3, w = (d + 2) % 3;
    const du = dim[u], dw = dim[w];
    const mascara = new Int32Array(du * dw);
    for (let i = 0; i < dim[d]; i++) {
      for (let bb = 0; bb < dw; bb++)
        for (let a = 0; a < du; a++) {
          p[d] = i; p[u] = a; p[w] = bb;
          const c = grade[at(p[0], p[1], p[2])];
          const viz = c ? grade[at(p[0] + f.n[0], p[1] + f.n[1], p[2] + f.n[2])] : 1;
          if (!c || viz) {
            mascara[a + bb * du] = 0;
            continue;
          }
          frente[0] = p[0] + f.n[0]; frente[1] = p[1] + f.n[1]; frente[2] = p[2] + f.n[2];
          ocluir(cheio, frente, d, f.v, ao);
          mascara[a + bb * du] = c * 256 + ao[0] + ao[1] * 4 + ao[2] * 16 + ao[3] * 64;
        }
      for (let bb = 0; bb < dw; bb++)
        for (let a = 0; a < du; ) {
          const c = mascara[a + bb * du];
          if (!c) { a++; continue; }
          let largura = 1;
          while (a + largura < du && mascara[a + largura + bb * du] === c) largura++;
          let altura = 1;
          crescer: while (bb + altura < dw) {
            for (let k = 0; k < largura; k++) if (mascara[a + k + (bb + altura) * du] !== c) break crescer;
            altura++;
          }
          for (let k = 0; k < 4; k++) {
            const q = [0, 0, 0];
            q[d] = i + f.v[k][d];
            q[u] = a + f.v[k][u] * largura;
            q[w] = bb + f.v[k][w] * altura;
            v[k] = [
              (q[0] + min[0] - pivo[0]) * escala,
              (q[1] + min[1] - pivo[1]) * escala,
              (q[2] + min[2] - pivo[2]) * escala,
            ];
          }
          const cantos = [c & 3, (c >> 2) & 3, (c >> 4) & 3, (c >> 6) & 3];
          b.quad(v, f.n, cores[(c >> 8) - 1], f.sombra, cantos);
          for (let y = 0; y < altura; y++) for (let k = 0; k < largura; k++) mascara[a + k + (bb + y) * du] = 0;
          a += largura;
        }
    }
  }
  return b.geometria();
}

export const materialVoxel = new THREE.MeshLambertMaterial({ vertexColors: true });
