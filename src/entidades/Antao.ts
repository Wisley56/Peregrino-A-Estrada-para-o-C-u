import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';

const S = 0.085; // mesma escala de voxel do peregrino

/**
 * Santo Antão do Deserto (arte por código), seguindo a iconografia tradicional (como nos painéis do
 * século XV): ancião calvo no alto da cabeça, com uma coroa de cabelo branco dos lados e barba branca longa
 * e ondulada até o peito; capa escura de eremita, aberta na frente, com o tau claro no lado esquerdo do peito,
 * sobre o hábito castanho; na mão direita o bastão em tau com o sino pendurado, na esquerda o livro.
 * O halo dourado fica atrás da cabeça.
 */
function modeloAntao() {
  const m = new Modelo();
  const capa = (x: number, y: number, z: number) => variar(0x2b211c, x, y, z, 0.07);
  const habito = (x: number, y: number, z: number) => variar(0x8a6440, x, y, z, 0.05);
  const pele = (x: number, y: number, z: number) => variar(0xd6a27a, x, y, z, 0.03);
  const barba = (x: number, y: number, z: number) => variar(0xf1efe8, x, y, z, 0.04);
  const madeira = (x: number, y: number, z: number) => variar(0x6e4a2a, x, y, z, 0.06);
  const OURO = 0xd9b24a, TAU = 0xe8eef6;

  // hábito castanho (aparece no meio, onde a capa abre)
  m.caixa(-3, 0, -2, 7, 15, 5, habito);
  m.caixa(-2, 0, 3, 2, 1, 1, 0x3a2414).caixa(1, 0, 3, 2, 1, 1, 0x3a2414); // pés
  m.caixa(-1, 8, 3, 3, 1, 1, 0x4a3420); // cordão
  // capa escura: costas, lados e as duas abas da frente, abrindo embaixo
  m.caixa(-4, 1, -3, 9, 16, 1, capa);
  m.caixa(-5, 1, -3, 1, 15, 5, capa).caixa(5, 1, -3, 1, 15, 5, capa);
  m.caixa(-4, 1, 2, 2, 16, 2, capa).caixa(3, 1, 2, 2, 16, 2, capa);
  m.caixa(-2, 12, 3, 1, 5, 1, capa).caixa(2, 12, 3, 1, 5, 1, capa); // a gola fecha um pouco no peito
  m.caixa(-5, 15, -3, 11, 2, 6, capa); // ombros
  m.caixa(-3, 17, -4, 7, 2, 2, (x, y, z) => variar(0x241b16, x, y, z, 0.06)); // capuz caído nas costas
  // o tau no lado esquerdo do peito (o esquerdo dele é o +x)
  m.caixa(3, 13, 4, 3, 1, 1, TAU).caixa(4, 10, 4, 1, 3, 1, TAU);
  // braço direito (-x) segurando o bastão
  m.caixa(-7, 11, -1, 2, 5, 3, capa).caixa(-7, 11, 2, 2, 2, 2, capa).caixa(-7, 11, 4, 2, 2, 1, pele);
  // braço esquerdo (+x) segurando o livro vermelho
  m.caixa(6, 9, -1, 2, 7, 3, capa).caixa(4, 8, 2, 3, 2, 2, capa);
  m.caixa(2, 7, 4, 4, 4, 1, 0x8e1b2a).caixa(2, 10, 4, 4, 1, 1, 0xefe4c8).caixa(3, 8, 5, 2, 2, 1, OURO); // livro com fecho
  m.caixa(5, 8, 5, 1, 2, 1, pele);
  // cabeça: rosto magro, calvo no alto
  m.caixa(-2, 18, -2, 5, 5, 5, pele);
  m.caixa(-1, 23, -1, 3, 1, 3, pele);
  // coroa de cabelo branco dos lados e atrás
  m.caixa(-3, 19, -2, 1, 3, 4, barba).caixa(3, 19, -2, 1, 3, 4, barba).caixa(-2, 19, -3, 5, 4, 1, barba);
  m.caixa(-3, 22, -1, 1, 1, 1, barba).caixa(3, 22, -1, 1, 1, 1, barba);
  // rosto
  m.ponto(-1, 21, 3, 0x2a1a10).ponto(1, 21, 3, 0x2a1a10); // olhos
  m.caixa(-2, 22, 3, 2, 1, 1, barba).caixa(1, 22, 3, 2, 1, 1, barba); // sobrancelhas brancas
  m.ponto(0, 20, 3, 0xc48c62).ponto(0, 20, 4, 0xb98458); // nariz
  // barba longa e ondulada até o peito, com bigode
  m.caixa(-2, 19, 3, 5, 1, 1, barba);
  m.caixa(-3, 17, 2, 1, 3, 2, barba).caixa(3, 17, 2, 1, 3, 2, barba);
  m.caixa(-2, 13, 3, 5, 6, 2, barba);
  m.caixa(-1, 10, 3, 3, 3, 2, barba).caixa(0, 9, 4, 1, 1, 1, barba);
  m.caixa(-2, 12, 4, 1, 1, 1, barba).caixa(2, 11, 4, 1, 1, 1, barba);
  // bastão em tau com o sino pendurado
  m.caixa(-6, 0, 5, 1, 24, 1, madeira);
  m.caixa(-9, 24, 5, 7, 1, 1, madeira);
  m.caixa(-9, 22, 5, 1, 2, 1, 0x3a2a18); // cordinha
  m.caixa(-10, 20, 4, 3, 2, 3, OURO).ponto(-9, 19, 5, 0x8a6a1a); // sino e badalo
  // halo dourado atrás da cabeça
  for (let x = -5; x <= 5; x++)
    for (let y = -5; y <= 5; y++) {
      const r = Math.hypot(x, y);
      if (r > 3.6 && r < 5.2) m.ponto(x, 21 + y, -4, (x + y) % 2 ? OURO : 0xeccb6a);
    }
  return m.malha(S, [0.5, 0, 0.5]);
}

export class Antao {
  readonly raiz = new THREE.Group();
  readonly pos: THREE.Vector3;
  private corpo: THREE.Mesh;
  private t = 0;
  private rumo: number;

  constructor(pos: THREE.Vector3, rumo: number) {
    this.pos = pos.clone();
    this.rumo = rumo;
    this.corpo = modeloAntao();
    this.raiz.add(this.corpo);
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.y = rumo;
  }

  /** Respira devagar e vira para o peregrino quando ele chega perto. */
  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    const d = jogador.distanceTo(this.pos);
    const alvo = d < 9 ? Math.atan2(jogador.x - this.pos.x, jogador.z - this.pos.z) : this.rumo;
    let dr = alvo - this.raiz.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    this.raiz.rotation.y += dr * Math.min(1, dt * 3);
    this.corpo.scale.y = 1 + Math.sin(this.t * 1.6) * 0.008;
  }
}
