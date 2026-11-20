import * as THREE from 'three';
import { ConstrutorMalha, FACES, ocluir } from '../../voxel/Malha';
import { variar } from '../../voxel/Modelo';
import { NIVEL_MAR } from './Geografia';
import type { TerrenoMundo } from './TerrenoMundo';

/**
 * A montagem de um ladrilho do chão e de um pedaço do minimapa: código puro (sem cena nem DOM), que roda tanto no
 * thread principal quanto na obra (o Web Worker que faz os ladrilhos sem travar o jogo).
 */

/** Células por lado de um ladrilho, em qualquer nível. */
export const N = 32;
/** Até que profundidade (m) a parede de uma coluna é feita metro a metro, com a sombra dos cantos; abaixo, um painel só. */
const PAREDE_FINA = 14;

const laterais = FACES.filter((f) => f.n[1] === 0);
const faceTopo = FACES.find((f) => f.n[1] === 1)!;
const TERRA = 0x8a6a48, AREIA_FUNDA = 0xc9a66c, ROCHA = 0x8a8274;
const COR_AGUA_MAPA = 0x2f86a8;

/** A malha pronta, em vetores que podem ser passados de um thread a outro sem cópia. */
export interface MalhaCrua {
  pos: Float32Array;
  nor: Float32Array;
  cor: Float32Array;
  idx: Uint32Array;
}

/** A cor da parede de uma coluna, `prof` metros abaixo do topo: a cor do topo, depois terra (ou areia), depois rocha. */
function corDoLado(topo: number, prof: number) {
  const r = (topo >> 16) & 255, g = (topo >> 8) & 255, b = topo & 255;
  if (prof < 1) return (Math.round(r * 0.9) << 16) | (Math.round(g * 0.9) << 8) | Math.round(b * 0.9);
  const areia = r > 185 && g > 150 && b < g;
  return prof < 5 ? (areia ? AREIA_FUNDA : TERRA) : ROCHA;
}

/**
 * A malha de um ladrilho de 32 × 32 células de `celula` metros, com o canto em (x0, z0), em coordenadas locais
 * (a origem é o canto). Devolve `null` se não há o que desenhar. `fino`: colunas de 1 m com a oclusão de canto e as
 * paredes metro a metro, como as das regiões.
 */
export function construirLadrilho(terreno: TerrenoMundo, x0: number, z0: number, celula: number, fino: boolean): MalhaCrua | null {
  const L = N + 2;
  // as alturas das células e de uma volta de vizinhas (para as paredes e a sombra dos cantos)
  const h = new Float32Array(L * L);
  let max = -Infinity;
  for (let i = -1; i <= N; i++)
    for (let j = -1; j <= N; j++) {
      const a = terreno.altura(x0 + (i + 0.5) * celula, z0 + (j + 0.5) * celula);
      h[(i + 1) * L + j + 1] = a;
      if (a > max) max = a;
    }
  // de longe, o fundo do mar não se vê (o mar ao longe é opaco)
  if (!fino && max < NIVEL_MAR - 1) return null;
  const H = (i: number, j: number) => h[(i + 1) * L + j + 1];
  const cheio = (i: number, y: number, j: number) => y < H(Math.max(-1, Math.min(N, i)), Math.max(-1, Math.min(N, j)));
  const b = new ConstrutorMalha();
  const cor = new THREE.Color();
  const v: [number, number, number][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const ao = [0, 0, 0, 0];
  let quads = 0;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const xa = x0 + i * celula, za = z0 + j * celula;
      // o miolo das regiões tem a malha delas
      if (terreno.dentroDeRegiao(xa, za, xa + celula, za + celula)) continue;
      const a = H(i, j);
      const topo = terreno.cor(xa + celula / 2, za + celula / 2);
      cor.setHex(fino ? variar(topo, xa, a, za, 0.035) : topo);
      const x = i * celula, z = j * celula;
      for (let k = 0; k < 4; k++) v[k] = [x + faceTopo.v[k][0] * celula, a, z + faceTopo.v[k][2] * celula];
      b.quad(v, faceTopo.n, cor, 1, fino ? ocluir(cheio, [i, a, j], 1, faceTopo.v, ao) : undefined);
      quads++;
      for (const f of laterais) {
        const ni = i + f.n[0], nj = j + f.n[2];
        const borda = ni < 0 || nj < 0 || ni >= N || nj >= N;
        // na borda do ladrilho, a parede desce uma célula a mais (a saia): esconde a fresta para o nível vizinho
        const base = borda ? Math.min(H(ni, nj), a - celula) : H(ni, nj);
        if (base >= a) continue;
        if (fino) {
          const corte = Math.max(base, a - PAREDE_FINA);
          for (let y = corte; y < a; y++) {
            cor.setHex(corDoLado(topo, a - 1 - y));
            for (let k = 0; k < 4; k++) v[k] = [x + f.v[k][0], y + f.v[k][1], z + f.v[k][2]];
            b.quad(v, f.n, cor, f.sombra, ocluir(cheio, [ni, y, nj], f.n[0] ? 0 : 2, f.v, ao));
            quads++;
          }
          // um penhasco mais fundo que isso: o resto da parede, de rocha, num painel só (senão a coluna fica no ar)
          if (corte > base) {
            cor.setHex(ROCHA);
            for (let k = 0; k < 4; k++) v[k] = [x + f.v[k][0], f.v[k][1] ? corte : base, z + f.v[k][2]];
            b.quad(v, f.n, cor, f.sombra);
            quads++;
          }
        } else {
          cor.setHex(corDoLado(topo, a - base > 6 ? 5 : 1));
          for (let k = 0; k < 4; k++) v[k] = [x + f.v[k][0] * celula, f.v[k][1] ? a : base, z + f.v[k][2] * celula];
          b.quad(v, f.n, cor, f.sombra);
          quads++;
        }
      }
    }
  if (!quads) return null;
  return { pos: new Float32Array(b.pos), nor: new Float32Array(b.nor), cor: new Float32Array(b.cor), idx: new Uint32Array(b.idx) };
}

/** A malha crua vira geometria do Three (no thread principal). */
export function geometriaDe(m: MalhaCrua) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(m.cor, 3));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** O chão visto de cima num quadrado de `lado` m com o canto em (x0, z0), 1 pixel por metro (RGBA, para o minimapa). */
export function pintarQuadrado(terreno: TerrenoMundo, x0: number, z0: number, lado: number) {
  const px = new Uint8ClampedArray(lado * lado * 4);
  for (let j = 0; j < lado; j++)
    for (let i = 0; i < lado; i++) {
      const x = x0 + i + 0.5, z = z0 + j + 0.5;
      const cor = terreno.altura(x, z) < NIVEL_MAR ? COR_AGUA_MAPA : terreno.cor(x, z);
      const k = (j * lado + i) * 4;
      px[k] = (cor >> 16) & 255;
      px[k + 1] = (cor >> 8) & 255;
      px[k + 2] = cor & 255;
      px[k + 3] = 255;
    }
  return px;
}
