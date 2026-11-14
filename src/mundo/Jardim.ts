import * as THREE from 'three';
import { AGOSTINHO } from '../entidades/Agostinho';
import { Npc } from '../entidades/Npc';
import { ALTURA_DO_MURO, BANCO, CANTEIROS, FIGUEIRA, LIVRO, PORTA, figueira, livroAberto, muroDoJardim } from './JardimModelos';
import { JARDIM } from './Terreno';

/** Caixa de colisão. `baixa`: a porta estreita, que só deixa passar quem está de joelhos. */
export interface CaixaDoJardim { x0: number; x1: number; z0: number; z1: number; topo: number; baixa?: boolean }

/** Onde Santo Agostinho espera, junto da figueira, olhando para a porta (m, locais). */
const LUGAR_AGOSTINHO = { x: 0.1, z: -0.9 };

/**
 * O jardim murado de Santo Agostinho, no Vale. Só se entra pela porta estreita do muro do oeste, de joelhos
 * (`Peregrino.ajoelhado`): em pé, o peregrino não cabe. Dentro, a figueira, o banco com o livro aberto e o santo.
 */
export class JardimDeAgostinho {
  readonly grupo = new THREE.Group();
  readonly caixas: CaixaDoJardim[] = [];
  readonly circulos: { x: number; z: number; r: number }[] = [];
  readonly agostinho: Npc;
  /** O livro aberto no banco (o ponto da interação). */
  readonly livro: THREE.Vector3;
  /** Diante da porta, do lado de fora (onde o Espírito Santo fala da porta estreita). */
  readonly porta: THREE.Vector3;
  private readonly o: THREE.Vector3;

  constructor(chao: number) {
    const o = (this.o = new THREE.Vector3(JARDIM.x, chao, JARDIM.z));
    this.grupo.position.copy(o);
    const muro = muroDoJardim();
    const arvore = figueira();
    arvore.position.set(FIGUEIRA.x, 0, FIGUEIRA.z);
    const livro = livroAberto();
    livro.position.set(LIVRO.x, BANCO.altura, LIVRO.z);
    livro.rotation.y = 0.25;
    for (const m of [muro, arvore, livro]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.grupo.add(m);
    }

    // o muro: os quatro lados (o do oeste partido pela porta) e a porta, que só os pequenos atravessam
    const topo = chao + ALTURA_DO_MURO;
    const M = JARDIM.meio, E = 0.5;
    const local = (x0: number, z0: number, x1: number, z1: number, t: number, baixa = false) =>
      this.caixas.push({ x0: o.x + x0, x1: o.x + x1, z0: o.z + z0, z1: o.z + z1, topo: t, baixa });
    local(-M, -M, M, -M + E, topo);
    local(-M, M - E, M, M, topo);
    local(M - E, -M, M, M, topo);
    local(-M, -M, -M + E, PORTA.z0, topo);
    local(-M, PORTA.z1, -M + E, M, topo);
    local(PORTA.x0, PORTA.z0, PORTA.x1, PORTA.z1, topo, true);
    // os canteiros e o banco (baixos: barram o passo, mas a câmera e o pulo passam por cima)
    for (const c of CANTEIROS) local(c.x0, c.z0, c.x1, c.z1, chao + 0.3);
    local(BANCO.x0, BANCO.z0, BANCO.x1, BANCO.z1, chao + BANCO.altura);
    this.circulos.push({ x: o.x + FIGUEIRA.x, z: o.z + FIGUEIRA.z, r: 0.4 });

    const pa = new THREE.Vector3(o.x + LUGAR_AGOSTINHO.x, chao, o.z + LUGAR_AGOSTINHO.z);
    // o santo fica em coordenadas do mundo: a área põe o corpo dele no próprio grupo
    this.agostinho = new Npc(AGOSTINHO, pa, -Math.PI / 2);
    this.circulos.push({ x: pa.x, z: pa.z, r: 0.45 });

    this.livro = new THREE.Vector3(o.x + LIVRO.x, chao + BANCO.altura, o.z + LIVRO.z);
    this.porta = new THREE.Vector3(o.x - M - 1.2, chao, o.z);
  }

  /** Dentro do muro (m do mundo). */
  dentro(x: number, z: number) {
    const m = JARDIM.meio - 0.5;
    return Math.abs(x - this.o.x) < m && Math.abs(z - this.o.z) < m;
  }

  /**
   * Debaixo da verga da porta estreita: aqui ninguém se levanta. A margem (0,2 m) é menor que o raio do peregrino
   * (0,32 m): em pé, a parede o segura antes de ele chegar aqui, e ele não fica de joelhos sem querer.
   */
  tetoBaixo(x: number, z: number) {
    const lx = x - this.o.x, lz = z - this.o.z;
    return lx > PORTA.x0 - 0.2 && lx < PORTA.x1 + 0.2 && lz > PORTA.z0 - 0.1 && lz < PORTA.z1 + 0.1;
  }

  /** No minimapa: o muro e os canteiros. */
  noMapa(x: number, z: number) {
    const lx = Math.abs(x - this.o.x), lz = Math.abs(z - this.o.z);
    const m = JARDIM.meio;
    return lx < m && lz < m && (lx > m - 0.6 || lz > m - 0.6);
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.agostinho.atualizar(dt, jogador);
  }
}
