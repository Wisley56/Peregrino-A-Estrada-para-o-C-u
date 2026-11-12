import * as THREE from 'three';
import { carregarVox, geometriaVox } from '../voxel/Vox';
import { materialVoxel } from '../voxel/Malha';
import { Fisica, girarPara } from './Peregrino';

/**
 * Ovelha montada a partir das peças .vox do Veloren (GPL-3.0),
 * com os deslocamentos de `quadruped_small_*_manifest.ron`
 * e as posições de osso de `voxygen/anim/src/quadruped_small/mod.rs`.
 */
const BASE = 'assets/veloren/ovelha/';
const ESCALA = 0.8 / 11;

// Veloren: x direita, y frente, z cima  ->  Three: (x, z, -y)
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y);

type Pecas = Record<'head' | 'chest' | 'tail' | 'foot_fr' | 'foot_br', THREE.BufferGeometry>;
let pecas: Promise<Pecas> | null = null;

function carregarPecas(): Promise<Pecas> {
  const desloc: Record<keyof Pecas, [number, number, number]> = {
    head: [-5, 0, -5],
    chest: [-5, -5.5, -3.5],
    tail: [-2, -2, -1.5],
    foot_fr: [-1, -1.5, -5],
    foot_br: [-1, -1.5, -5.5],
  };
  pecas ??= Promise.all(
    (Object.keys(desloc) as (keyof Pecas)[]).map(async (k) => {
      const m = await carregarVox(BASE + k + '.vox');
      return [k, geometriaVox(m, { escala: 1, deslocamento: desloc[k] })] as const;
    }),
  ).then((l) => Object.fromEntries(l) as Pecas);
  return pecas;
}

export class Ovelha {
  readonly raiz = new THREE.Group();
  readonly pos = new THREE.Vector3();
  private pernas: THREE.Mesh[] = [];
  private cabeca!: THREE.Mesh;
  private rumo = Math.random() * Math.PI * 2;
  private destino = new THREE.Vector3();
  private espera = Math.random() * 3;
  private fase = Math.random() * 10;
  private andando = false;
  balindo = 0;

  constructor(private centro: THREE.Vector3, private raioPasto: number) {
    this.pos.copy(centro);
    this.destino.copy(centro);
  }

  async montar() {
    const p = await carregarPecas();
    const malha = (g: THREE.BufferGeometry) => {
      const m = new THREE.Mesh(g, materialVoxel);
      m.castShadow = true;
      return m;
    };
    const esqueleto = new THREE.Group();
    esqueleto.scale.setScalar(ESCALA);
    esqueleto.rotation.y = Math.PI; // o Veloren olha para +y; aqui o "frente" é +z
    const peito = malha(p.chest);
    peito.position.copy(V(0, 2, 7));
    this.cabeca = malha(p.head);
    this.cabeca.position.copy(V(0, 4, 4));
    const cauda = malha(p.tail);
    cauda.position.copy(V(0, -5, 0));
    peito.add(this.cabeca, cauda);
    const lugares: [number, number, number, THREE.BufferGeometry][] = [
      [-3.5, 2, -2, p.foot_fr], [3.5, 2, -2, p.foot_fr],
      [-3.5, -3.5, -2, p.foot_br], [3.5, -3.5, -2, p.foot_br],
    ];
    for (const [x, y, z, g] of lugares) {
      const perna = malha(g);
      perna.position.copy(V(x, y, z));
      peito.add(perna);
      this.pernas.push(perna);
    }
    esqueleto.add(peito);
    this.raiz.add(esqueleto);
    return this;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fase += dt;
    this.balindo = Math.max(0, this.balindo - dt);
    const longe = this.pos.distanceTo(jogador);
    if (this.espera > 0) {
      this.espera -= dt;
      this.andando = false;
      if (this.espera <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * this.raioPasto;
        this.destino.set(this.centro.x + Math.cos(a) * r, 0, this.centro.z + Math.sin(a) * r);
      }
    } else {
      const dx = this.destino.x - this.pos.x, dz = this.destino.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) this.espera = 2 + Math.random() * 5;
      else {
        this.andando = true;
        this.rumo = girarPara(this.rumo, Math.atan2(dx, dz), dt * 3);
        const v = 1.1 * dt;
        const nx = this.pos.x + Math.sin(this.rumo) * v, nz = this.pos.z + Math.cos(this.rumo) * v;
        if (Math.abs(fis.altura(nx, nz) - this.pos.y) <= 1 && fis.altura(nx, nz) > 2) {
          this.pos.x = nx;
          this.pos.z = nz;
        } else this.espera = 1;
      }
    }
    if (longe < 1.2) {
      // o peregrino empurra de leve
      const dx = this.pos.x - jogador.x, dz = this.pos.z - jogador.z;
      this.pos.x += (dx / (longe || 1)) * dt * 1.5;
      this.pos.z += (dz / (longe || 1)) * dt * 1.5;
    }
    fis.colidir(this.pos, 0.45);
    const chao = fis.altura(this.pos.x, this.pos.z);
    this.pos.y += (chao - this.pos.y) * Math.min(1, dt * 12);
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.y = this.rumo;

    const s = this.andando ? Math.sin(this.fase * 9) * 0.5 : 0;
    this.pernas.forEach((p, i) => (p.rotation.x = (i === 0 || i === 3 ? s : -s)));
    if (this.cabeca) {
      const pastando = !this.andando && Math.sin(this.fase * 0.7) > 0.3;
      const alvo = this.balindo > 0 ? -0.25 + Math.sin(this.fase * 30) * 0.05 : pastando ? 0.5 : 0;
      this.cabeca.rotation.x += (alvo - this.cabeca.rotation.x) * Math.min(1, dt * 5);
    }
  }
}
