import * as THREE from 'three';
import { Volume, malhaDoVolume } from './Malha';

/**
 * Leitor do formato .vox (MagicaVoxel), usado pelos modelos do Veloren.
 * O .vox tem Z para cima; aqui convertemos para Y para cima:
 *   three.x = vox.x, three.y = vox.z, three.z = -vox.y
 */
export interface ModeloVox {
  tamanho: [number, number, number]; // em coordenadas do .vox (x, y, z)
  voxels: { x: number; y: number; z: number; i: number }[];
  paleta: THREE.Color[]; // índice 1..255
}

/**
 * Lê o modelo `indice` do arquivo. Um .vox pode guardar vários modelos (pares SIZE/XYZI, na ordem); o Veloren
 * escolhe um deles pelo `model_index` do manifesto (o rato, por exemplo, tem cabeça, peito, cauda e patas num
 * arquivo só).
 */
export function lerVox(buf: ArrayBuffer, indice = 0): ModeloVox {
  const d = new DataView(buf);
  const id = (o: number) => String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3));
  if (id(0) !== 'VOX ') throw new Error('arquivo .vox inválido');
  let tamanho: [number, number, number] = [0, 0, 0];
  const voxels: ModeloVox['voxels'] = [];
  let paletaBruta: Uint8Array | null = null;
  let modelo = 0; // índice do par SIZE/XYZI em leitura

  const percorrer = (o: number, fim: number) => {
    while (o < fim) {
      const nome = id(o);
      const conteudo = d.getInt32(o + 4, true);
      const filhos = d.getInt32(o + 8, true);
      const c = o + 12;
      if (nome === 'MAIN') percorrer(c + conteudo, c + conteudo + filhos);
      else if (nome === 'SIZE' && modelo === indice) {
        tamanho = [d.getInt32(c, true), d.getInt32(c + 4, true), d.getInt32(c + 8, true)];
      } else if (nome === 'XYZI') {
        if (modelo === indice) {
          const n = d.getInt32(c, true);
          for (let k = 0; k < n; k++) {
            const p = c + 4 + k * 4;
            voxels.push({ x: d.getUint8(p), y: d.getUint8(p + 1), z: d.getUint8(p + 2), i: d.getUint8(p + 3) });
          }
        }
        modelo++;
      } else if (nome === 'RGBA') {
        paletaBruta = new Uint8Array(buf, c, 1024);
      }
      o = c + conteudo + (nome === 'MAIN' ? filhos : filhos);
    }
  };
  percorrer(8, buf.byteLength);
  if (indice >= modelo) throw new Error(`o .vox tem ${modelo} modelo(s); não há o de índice ${indice}`);

  const paleta: THREE.Color[] = [new THREE.Color(0, 0, 0)];
  for (let i = 1; i < 256; i++) {
    const p = paletaBruta as Uint8Array | null;
    if (p) paleta.push(new THREE.Color().setRGB(p[(i - 1) * 4] / 255, p[(i - 1) * 4 + 1] / 255, p[(i - 1) * 4 + 2] / 255, THREE.SRGBColorSpace));
    else paleta.push(new THREE.Color().setHSL(i / 255, 0.5, 0.5));
  }
  return { tamanho, voxels, paleta };
}

export interface OpcoesVox {
  escala: number;
  /** Deslocamento do Veloren (em voxels, coordenadas .vox). Padrão: centralizado na base. */
  deslocamento?: [number, number, number];
  /** Troca a cor de certos índices da paleta (ex.: folhas das árvores do Veloren). */
  recolorir?: Record<number, (x: number, y: number, z: number) => THREE.Color>;
  /** Espelha no eixo x, como o Veloren faz com as peças do lado esquerdo. */
  espelhar?: boolean;
}

/** Converte o modelo em geometria (Y para cima). */
export function geometriaVox(m: ModeloVox, op: OpcoesVox): THREE.BufferGeometry {
  const [sx, sy, sz] = m.tamanho;
  // grade no espaço do Three: gx = vox.x, gy = vox.z, gz = (sy - 1 - vox.y)
  const grade = new Map<number, THREE.Color>();
  const chave = (x: number, y: number, z: number) => (x * 512 + y) * 512 + z;
  for (const v of m.voxels) {
    const f = op.recolorir?.[v.i];
    const cor = f ? f(v.x, v.y, v.z) : m.paleta[v.i];
    grade.set(chave(op.espelhar ? sx - 1 - v.x : v.x, v.z, sy - 1 - v.y), cor);
  }
  const vol: Volume = {
    min: [0, 0, 0],
    max: [sx, sz, sy],
    cor: (x, y, z) => (x < 0 || y < 0 || z < 0 ? null : grade.get(chave(x, y, z)) ?? null),
  };
  // pivô: por padrão, centro da base. Com deslocamento do Veloren: vértice = voxel + desloc.
  let pivo: [number, number, number];
  if (op.deslocamento) {
    const [ox, oy, oz] = op.deslocamento;
    // o voxel ocupa three.z em [-(vy+oy+1), -(vy+oy)], e a grade usa gz = sy-1-vy  =>  pivô z = sy + oy
    pivo = [-ox, -oz, sy + oy];
  } else {
    pivo = [sx / 2, 0, sy / 2];
  }
  return malhaDoVolume(vol, op.escala, pivo);
}

const arquivos = new Map<string, Promise<ArrayBuffer>>();
const cache = new Map<string, Promise<ModeloVox>>();
export function carregarVox(url: string, indice = 0): Promise<ModeloVox> {
  const chave = `${url}#${indice}`;
  let p = cache.get(chave);
  if (!p) {
    let bruto = arquivos.get(url);
    if (!bruto) {
      bruto = fetch(url).then((r) => {
        if (!r.ok) throw new Error(`não foi possível carregar ${url}`);
        return r.arrayBuffer();
      });
      arquivos.set(url, bruto);
    }
    p = bruto.then((b) => lerVox(b, indice));
    cache.set(chave, p);
  }
  return p;
}
