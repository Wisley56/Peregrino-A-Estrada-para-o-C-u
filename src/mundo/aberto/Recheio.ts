import * as THREE from 'three';
import { aleatorio } from '../../core/Ruido';
import { materialVoxel } from '../../voxel/Malha';
import { carregarVox, geometriaVox, reduzirVox } from '../../voxel/Vox';
import type { Povoamento } from '../../fauna/Fauna';
import type { IdEspecie } from '../../fauna/Especies';
import { construirCruzeiro } from '../Cenario';
import { coqueiro } from '../BahiaModelos';
import { cipreste, oliveira } from '../CidadeModelos';
import { arbusto, marco, palmeira, pedregulho } from '../Deserto';
import { folhas } from '../Mundo';
import { capelinha, imagem, MEIO_CAPELINHA } from './ErmoModelos';
import { BEIRAS, NIVEL_MAR, lugarDaBeira, pontoNaEstrada, type DefBeira } from './Geografia';
import type { Bioma, TerrenoMundo } from './TerrenoMundo';

/** Lado (m) das células do recheio, carregadas e descartadas inteiras. */
const CELULA = 48;
/** Até onde (m) se veem as árvores e as pedras grandes. */
const RAIO_LONGE = 250;
/** Até onde (m) se vê o miúdo (capim, flores, pedrinhas) e as árvores fazem sombra. */
const RAIO_MEIO = 80;
/** Até onde (m) as árvores vão com todos os voxels (daí até RAIO_LONGE, com voxels maiores). */
const RAIO_PERTO = 36;
/** Uma árvore a cada tantos metros, no máximo (a grade de sorteio). */
const PASSO = 4;
/** Tempo por quadro para montar células novas (ms). */
const ORCAMENTO = 2.5;
/** O jogador precisa andar isto (m) para a lista de células ser revista. */
const PASSO_REVISAO = 8;
/** Raio (m) em volta de capelinhas e cruzeiros em que nada nasce. */
const CLAREIRA = 7;

/**
 * Os tipos de planta e de pedra do ermo. `grande`: visto de longe e com sombra de perto; `tronco`: o raio (m) do
 * choque (0: atravessa-se, como capim). Cada tipo tem algumas variantes (geometrias), sorteadas.
 */
type Tipo = 'pinheiro' | 'pequena' | 'alamo' | 'oliveira' | 'cipreste' | 'coqueiro' | 'palmeira' | 'arbusto' | 'pedregulho' | 'marco' | 'pedra' | 'grama' | 'flor';
const FICHAS: Record<Tipo, { grande: boolean; tronco: number }> = {
  pinheiro: { grande: true, tronco: 0.45 },
  pequena: { grande: true, tronco: 0.35 },
  alamo: { grande: true, tronco: 0.35 },
  oliveira: { grande: true, tronco: 0.4 },
  cipreste: { grande: true, tronco: 0.35 },
  coqueiro: { grande: true, tronco: 0.3 },
  palmeira: { grande: true, tronco: 0.3 },
  arbusto: { grande: true, tronco: 0 },
  pedregulho: { grande: true, tronco: 1 },
  marco: { grande: true, tronco: 0.45 },
  pedra: { grande: false, tronco: 0 },
  grama: { grande: false, tronco: 0 },
  flor: { grande: false, tronco: 0 },
};

/** O que nasce em cada bioma: dado o sorteio `r` (0 a 1) e o lugar, o tipo (ou nada). */
function receita(b: Bioma, r: number, h: number, dEstrada: number, costa: number): Tipo | null {
  switch (b) {
    case 'prado':
      if (h > 20) return r < 0.3 ? 'pinheiro' : r < 0.36 ? 'pedra' : r < 0.6 ? 'grama' : null;
      return r < 0.04 ? 'pequena' : r < 0.06 ? 'alamo' : r < 0.075 ? 'pinheiro' : r < 0.1 ? 'pedra' : r < 0.42 ? 'grama' : r < 0.57 ? 'flor' : null;
    case 'deserto':
      // os marcos de pedras empilhadas dos peregrinos, à beira da estrada
      if (dEstrada < 6) return r < 0.04 ? 'marco' : null;
      return r < 0.008 ? 'palmeira' : r < 0.06 ? 'arbusto' : r < 0.075 ? 'pedregulho' : r < 0.09 ? 'pedra' : null;
    case 'campos':
      // os ciprestes em fila à beira da estrada, como nas estradas da Úmbria
      if (dEstrada > 4 && dEstrada < 6.5) return r < 0.22 ? 'cipreste' : r < 0.5 ? 'grama' : null;
      return r < 0.03 ? 'oliveira' : r < 0.04 ? 'cipreste' : r < 0.06 ? 'pedra' : r < 0.38 ? 'grama' : r < 0.52 ? 'flor' : null;
    case 'mata':
      if (costa < 140 && r < 0.07) return 'coqueiro';
      return r < 0.1 ? 'pequena' : r < 0.13 ? 'alamo' : r < 0.15 ? 'pedra' : r < 0.5 ? 'grama' : r < 0.6 ? 'flor' : null;
    case 'praia':
      return r < 0.025 ? 'coqueiro' : r < 0.05 ? 'pedra' : null;
    case 'rocha':
      return r < 0.1 ? 'pinheiro' : r < 0.22 ? 'pedra' : r < 0.27 ? 'pedregulho' : null;
    default:
      return null;
  }
}

/** Uma variante instanciada: as malhas de perto (com sombra, se grande) e de longe. */
interface Variante {
  tipo: Tipo;
  geo: THREE.BufferGeometry;
  /** A versão de voxels maiores, para longe (ou a mesma, se o modelo já é leve). */
  geoLonge: THREE.BufferGeometry;
  perto: THREE.InstancedMesh;
  /** De RAIO_PERTO a RAIO_MEIO: o modelo de longe, ainda com sombra (só para os grandes que têm versão de longe). */
  meio: THREE.InstancedMesh | null;
  longe: THREE.InstancedMesh | null;
}

interface Celula {
  ix: number;
  iz: number;
  /** As matrizes de cada variante (16 números por peça). */
  pecas: Map<number, number[]>;
  /** Os troncos e pedras em que se esbarra: x, z, raio. */
  troncos: [number, number, number][];
  dist: number;
}

/** Uma capelinha ou um cruzeiro já posto no chão. */
export interface Beira {
  def: DefBeira;
  /** O pé do monumento (no chão). */
  pos: THREE.Vector3;
  /** Para onde a frente olha (rumo, como o do peregrino). */
  frente: number;
  /** Onde fica quem reza diante dele, e para onde olha. */
  diante: THREE.Vector3;
  rumoDiante: number;
}

const chave = (ix: number, iz: number) => `${ix}:${iz}`;
const hash = (ix: number, iz: number) => (Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663) ^ 0x5bd1e995) >>> 0;

/**
 * O recheio do ermo: a vegetação e as pedras de cada bioma, as capelinhas e os cruzeiros de beira de estrada e os
 * bichos da terra de ligação. A vegetação é sorteada por célula (sempre a mesma em cada lugar), montada perto do
 * peregrino aos poucos e desenhada por instâncias: uma malha por variante para o que está perto (com sombra) e outra
 * para o que está longe. O miúdo só existe perto.
 */
export class Recheio {
  readonly grupo = new THREE.Group();
  readonly beiras: Beira[] = [];
  private variantes: Variante[] = [];
  private porTipo = new Map<Tipo, number[]>();
  private readonly celulas = new Map<string, Celula>();
  private fila: { ix: number; iz: number; dist: number }[] = [];
  private readonly ultimo = new THREE.Vector2(Infinity, Infinity);
  private sujo = false;
  private desdeRecompor = 0;
  /** Os troncos das capelinhas e dos cruzeiros (fixos). */
  private readonly troncosFixos: [number, number, number][] = [];
  /** Para o painel de desenvolvimento: células montadas, peças em cena e tempo gasto montando. */
  readonly medida = { celulas: 0, pecas: 0, ms: 0 };
  private pronto = false;

  constructor(private readonly terreno: TerrenoMundo) {
    this.grupo.name = 'recheio';
    this.porBeiras();
  }

  /** Carrega os modelos (os .vox do Veloren e os feitos por código). Antes disso o ermo fica só com as beiras. */
  async carregar() {
    const V = 'assets/veloren/';
    const SPRITE = 1 / 11;
    // as árvores do Veloren têm milhares de triângulos: de longe vão com voxels 2 vezes maiores (uns 4 vezes menos)
    const longes = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
    const geo = async (arq: string, escala: number, recolorir?: Parameters<typeof geometriaVox>[1]['recolorir'], reduzir = 1) => {
      const m = await carregarVox(V + arq);
      const g = geometriaVox(m, { escala, recolorir });
      if (reduzir > 1) longes.set(g, geometriaVox(reduzirVox(m, reduzir), { escala: escala * reduzir, recolorir }));
      return g;
    };
    const [pinheiros, pequenas, alamos, pedras, gramas, flores] = await Promise.all([
      Promise.all([1, 2, 3, 4].map((i) => geo(`arvores/pinheiro_${i}.vox`, 0.34, { 2: folhas(0x2f6a3c, 0.05) }, 2))),
      Promise.all([1, 2, 3, 4].map((i) => geo(`arvores/pequena_${i}.vox`, 0.3, { 1: folhas(0x4f9a3a, 0.06) }, 2))),
      Promise.all([1, 2, 3].map((i) => geo(`arvores/alamo_${i}.vox`, 0.17, { 1: folhas(0x5aa848, 0.06) }, 3))),
      Promise.all([0, 1, 2].map((i) => geo(`pedras/rock-${i}.vox`, SPRITE * 1.8))),
      Promise.all(['grass_short_1', 'grass_short_2', 'grass_med_1', 'grass_med_2', 'grass_long_1'].map((n) => geo(`grama/${n}.vox`, SPRITE))),
      Promise.all(['flower_blue_1', 'flower_red_1', 'flower_white_1', 'flower_yellow-0', 'flower_pink_1', 'flower_purple_1', 'sunflower_1'].map((n) => geo(`flores/${n}.vox`, SPRITE))),
    ]);
    const deCodigo = (f: (s: number) => THREE.Mesh, n: number) => Array.from({ length: n }, (_, i) => f(911 + i * 37).geometry);
    const modelos: Record<Tipo, THREE.BufferGeometry[]> = {
      pinheiro: pinheiros, pequena: pequenas, alamo: alamos, pedra: pedras, grama: gramas, flor: flores,
      oliveira: deCodigo(oliveira, 3), cipreste: deCodigo(cipreste, 3), coqueiro: deCodigo(coqueiro, 3),
      palmeira: deCodigo((s) => palmeira(s), 3), arbusto: deCodigo(arbusto, 3), pedregulho: deCodigo(pedregulho, 3), marco: deCodigo(marco, 2),
    };
    for (const tipo of Object.keys(modelos) as Tipo[]) {
      const ids: number[] = [];
      for (const g of modelos[tipo]) {
        g.computeBoundingSphere();
        const grande = FICHAS[tipo].grande;
        const perto = this.instancias(g, 64);
        perto.castShadow = grande;
        const geoLonge = longes.get(g) ?? g;
        const longe = grande ? this.instancias(geoLonge, 64) : null;
        const meio = grande && geoLonge !== g ? this.instancias(geoLonge, 64) : null;
        if (meio) meio.castShadow = true;
        ids.push(this.variantes.length);
        this.variantes.push({ tipo, geo: g, geoLonge, perto, meio, longe });
      }
      this.porTipo.set(tipo, ids);
    }
    this.pronto = true;
    this.ultimo.set(Infinity, Infinity);
  }

  private instancias(g: THREE.BufferGeometry, n: number) {
    const m = new THREE.InstancedMesh(g, materialVoxel, n);
    m.count = 0;
    m.receiveShadow = true;
    m.frustumCulled = true;
    this.grupo.add(m);
    return m;
  }

  /** Põe no chão as capelinhas e os cruzeiros das estradas. */
  private porBeiras() {
    const t = this.terreno;
    for (const def of BEIRAS) {
      const l = lugarDaBeira(def);
      // a estrada de verdade serpenteia em volta da linha das ESTRADAS: procura o eixo dela na perpendicular e põe o
      // monumento a 4,5 m dele, do lado pedido
      const p = pontoNaEstrada(def.estrada, def.t), nx = -p.dz * def.lado, nz = p.dx * def.lado;
      let eixo = 0, melhor = Infinity;
      for (let s = -16; s <= 16; s += 0.5) {
        const d = t.distEstrada(p.x + nx * s, p.z + nz * s);
        if (d < melhor) {
          melhor = d;
          eixo = s;
        }
      }
      l.x = p.x + nx * (eixo + 4.5);
      l.z = p.z + nz * (eixo + 4.5);
      // o pé fica no mais alto do chão debaixo dele, para não ficar enterrado de um lado
      let y = -Infinity;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) y = Math.max(y, t.altura(l.x + dx, l.z + dz));
      const pos = new THREE.Vector3(l.x, y, l.z);
      const fx = Math.sin(l.rumo), fz = Math.cos(l.rumo);
      const diante = new THREE.Vector3(l.x + fx * 2.6, 0, l.z + fz * 2.6);
      diante.y = t.altura(diante.x, diante.z);
      this.beiras.push({ def, pos, frente: l.rumo, diante, rumoDiante: l.rumo + Math.PI });
      const g = new THREE.Group();
      g.position.copy(pos);
      g.rotation.y = l.rumo;
      if (def.tipo === 'capela') {
        const corpo = new THREE.Mesh(capelinha(), materialVoxel);
        const santo = new THREE.Mesh(imagem(def.devocao ?? 'guia'), materialVoxel);
        santo.position.set(0, 0.8, 0.33);
        corpo.castShadow = corpo.receiveShadow = true;
        g.add(corpo, santo);
        this.troncosFixos.push([l.x, l.z, Math.hypot(MEIO_CAPELINHA.x, MEIO_CAPELINHA.z) * 0.85]);
      } else {
        g.add(construirCruzeiro());
        this.troncosFixos.push([l.x, l.z, 0.85]);
      }
      this.grupo.add(g);
    }
  }

  /** Revê as células em volta de (x, z), monta as que faltam (dentro do orçamento) e redesenha as instâncias. */
  atualizar(dt: number, x: number, z: number) {
    if (!this.pronto) return;
    if (Math.hypot(x - this.ultimo.x, z - this.ultimo.y) > PASSO_REVISAO) {
      this.ultimo.set(x, z);
      this.rever(x, z);
    }
    const t0 = performance.now();
    while (this.fila.length && performance.now() - t0 < ORCAMENTO) {
      const c = this.fila.shift()!;
      if (this.celulas.has(chave(c.ix, c.iz))) continue;
      this.celulas.set(chave(c.ix, c.iz), this.montar(c.ix, c.iz, c.dist));
      this.sujo = true;
    }
    this.medida.ms += performance.now() - t0;
    this.desdeRecompor += dt;
    // enquanto há células na fila, redesenha só de tempos em tempos (cada redesenho copia todas as matrizes)
    if (this.sujo && (!this.fila.length || this.desdeRecompor > 0.3)) this.recompor();
  }

  private distCelula(ix: number, iz: number, x: number, z: number) {
    const x0 = ix * CELULA, z0 = iz * CELULA;
    return Math.hypot(Math.max(x0 - x, 0, x - x0 - CELULA), Math.max(z0 - z, 0, z - z0 - CELULA));
  }

  private rever(x: number, z: number) {
    for (const [k, c] of this.celulas) {
      c.dist = this.distCelula(c.ix, c.iz, x, z);
      if (c.dist > RAIO_LONGE * 1.2) this.celulas.delete(k);
    }
    this.fila = [];
    const a = Math.ceil(RAIO_LONGE / CELULA);
    const cx = Math.floor(x / CELULA), cz = Math.floor(z / CELULA);
    for (let ix = cx - a; ix <= cx + a; ix++)
      for (let iz = cz - a; iz <= cz + a; iz++) {
        const d = this.distCelula(ix, iz, x, z);
        if (d > RAIO_LONGE || this.celulas.has(chave(ix, iz))) continue;
        const x0 = ix * CELULA, z0 = iz * CELULA;
        // célula toda dentro de uma região: a vegetação é a dela
        if (this.terreno.dentroDeRegiao(x0, z0, x0 + CELULA, z0 + CELULA)) continue;
        this.fila.push({ ix, iz, dist: d });
      }
    this.fila.sort((p, q) => p.dist - q.dist);
    this.sujo = true;
  }

  /** Sorteia o que nasce numa célula (sempre o mesmo, pela semente do lugar). */
  private montar(ix: number, iz: number, dist: number): Celula {
    const t = this.terreno, rnd = aleatorio(hash(ix, iz));
    const c: Celula = { ix, iz, pecas: new Map(), troncos: [], dist };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), eixo = new THREE.Vector3(0, 1, 0);
    for (let gx = 0; gx < CELULA; gx += PASSO)
      for (let gz = 0; gz < CELULA; gz += PASSO) {
        const x = ix * CELULA + gx + rnd() * PASSO * 0.9, z = iz * CELULA + gz + rnd() * PASSO * 0.9;
        const r = rnd(), giro = rnd() * Math.PI * 2, esc = rnd(), var_ = rnd();
        if (t.regiaoEm(x, z)) continue;
        const h = t.altura(x, z);
        if (h < NIVEL_MAR + 0.5) continue;
        const dEstrada = t.distEstrada(x, z);
        if (dEstrada < 3) continue;
        if (this.beiras.some((b) => Math.hypot(b.pos.x - x, b.pos.z - z) < CLAREIRA)) continue;
        const tipo = receita(t.bioma(x, z), r, h, dEstrada, t.costa(x, z));
        if (!tipo) continue;
        const ficha = FICHAS[tipo];
        if (ficha.grande) {
          // árvore e pedra grande só em chão quase plano, e longe da estrada
          if (dEstrada < 4 && tipo !== 'cipreste' && tipo !== 'marco') continue;
          if (Math.abs(t.altura(x + 1, z) - h) > 1 || Math.abs(t.altura(x, z + 1) - h) > 1 || Math.abs(t.altura(x - 1, z) - h) > 1) continue;
        }
        const ids = this.porTipo.get(tipo)!;
        const id = ids[Math.floor(var_ * ids.length)];
        const e = ficha.grande ? 0.85 + esc * 0.4 : 0.8 + esc * 0.5;
        m.compose(p.set(x, h, z), q.setFromAxisAngle(eixo, giro), s.set(e, e, e));
        let l = c.pecas.get(id);
        if (!l) c.pecas.set(id, (l = []));
        for (const n of m.elements) l.push(n);
        if (ficha.tronco) c.troncos.push([x, z, ficha.tronco * e]);
      }
    this.medida.celulas++;
    return c;
  }

  /** Copia as matrizes das células para as instâncias: as de perto e as de longe. */
  private recompor() {
    this.sujo = false;
    this.desdeRecompor = 0;
    const listas = () => this.variantes.map((): number[][] => []);
    const perto = listas(), meio = listas(), longe = listas();
    for (const c of this.celulas.values()) {
      for (const [id, l] of c.pecas) {
        const v = this.variantes[id];
        // perto: tudo com todos os voxels; no meio, os que têm versão de longe vão com ela (com sombra); longe, só os grandes
        if (c.dist < RAIO_PERTO || (c.dist < RAIO_MEIO && !v.meio)) perto[id].push(l);
        else if (c.dist < RAIO_MEIO && v.meio) meio[id].push(l);
        else if (v.longe) longe[id].push(l);
      }
    }
    let total = 0;
    this.variantes.forEach((v, id) => {
      v.perto = this.encher(v.perto, perto[id], FICHAS[v.tipo].grande);
      if (v.meio) v.meio = this.encher(v.meio, meio[id], true);
      if (v.longe) v.longe = this.encher(v.longe, longe[id], false);
      total += v.perto.count + (v.meio?.count ?? 0) + (v.longe?.count ?? 0);
    });
    this.medida.pecas = total;
  }

  /** Enche uma malha de instâncias com as listas dadas (trocando-a por uma maior se não couber). */
  private encher(malha: THREE.InstancedMesh, listas: number[][], sombra: boolean) {
    let n = 0;
    for (const l of listas) n += l.length / 16;
    if (n > malha.instanceMatrix.count) {
      const nova = new THREE.InstancedMesh(malha.geometry, materialVoxel, Math.ceil(n * 1.5));
      nova.receiveShadow = true;
      nova.castShadow = sombra;
      this.grupo.remove(malha);
      malha.dispose();
      this.grupo.add(nova);
      malha = nova;
    }
    const arr = malha.instanceMatrix.array as Float32Array;
    let o = 0;
    for (const l of listas) {
      arr.set(l, o);
      o += l.length;
    }
    malha.count = n;
    malha.instanceMatrix.needsUpdate = true;
    malha.visible = n > 0;
    if (n > 0) malha.computeBoundingSphere();
    return malha;
  }

  /** Empurra um círculo para fora dos troncos, das pedras grandes, das capelinhas e dos cruzeiros. */
  colidir(pos: THREE.Vector3, raio: number) {
    const empurrar = (tx: number, tz: number, r: number) => {
      const dx = pos.x - tx, dz = pos.z - tz, d = Math.hypot(dx, dz), min = r + raio;
      if (d >= min || d < 1e-6) return;
      pos.x = tx + (dx / d) * min;
      pos.z = tz + (dz / d) * min;
    };
    for (const [x, z, r] of this.troncosFixos) empurrar(x, z, r);
    const ix = Math.floor(pos.x / CELULA), iz = Math.floor(pos.z / CELULA);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const c = this.celulas.get(chave(ix + a, iz + b));
        if (c) for (const [x, z, r] of c.troncos) if (Math.abs(x - pos.x) < 3 && Math.abs(z - pos.z) < 3) empurrar(x, z, r);
      }
  }

  /**
   * Os bichos do ermo: um bando a cada ~85 m de terra (numa grade, com o lugar sorteado dentro de cada quadra), com
   * as espécies do bioma de cada lugar. São centenas de bandos: a `Fauna` os solta só perto do peregrino
   * (`definirSitios`). Sempre os mesmos, pela semente.
   */
  povoamento(): Povoamento[] {
    const t = this.terreno, rnd = aleatorio(5150);
    const BICHOS: Partial<Record<Bioma, [IdEspecie, number, number][]>> = {
      // espécie, quantos, raio do território
      prado: [['ovelha', 4, 10], ['cervo', 2, 16], ['coelho', 3, 12], ['raposa', 1, 18], ['corvo', 2, 14], ['lebre', 2, 12], ['cavalo', 2, 12]],
      deserto: [['lagartixa', 3, 14], ['camelo', 2, 10], ['antilope', 3, 16], ['hiena', 2, 14], ['aguia', 1, 40]],
      campos: [['cabra', 4, 10], ['jumento', 1, 6], ['lebre', 2, 14], ['boi', 2, 10], ['corvo', 2, 14], ['ovelha', 3, 10]],
      mata: [['esquilo', 2, 10], ['raposa', 1, 16], ['coelho', 2, 12], ['sapo', 3, 8], ['cervo', 2, 14]],
      praia: [['tartaruga', 2, 8], ['pato', 3, 10], ['ganso', 2, 10]],
      rocha: [['cabra', 3, 12], ['aguia', 1, 40], ['corvo', 2, 14]],
    };
    const PASSO = 85, lista: Povoamento[] = [];
    for (let x = -2000; x < 1900; x += PASSO)
      for (let z = -800; z < 3500; z += PASSO) {
        const px = x + rnd() * PASSO, pz = z + rnd() * PASSO, sorte = rnd(), escolha = rnd(), beira = rnd();
        if (sorte > 0.8 || t.regiaoEm(px, pz) || t.altura(px, pz) < NIVEL_MAR + 1) continue;
        // a faixa de areia é estreita: perto do mar, quase sempre são os bichos da praia
        const costa = t.costa(px, pz);
        const opcoes = BICHOS[costa < 60 && beira < 0.7 ? 'praia' : t.bioma(px, pz)];
        if (!opcoes) continue;
        const [especie, n, raio] = opcoes[Math.floor(escolha * opcoes.length)];
        lista.push({ especie, quantidade: n, centro: [px, pz], raio });
      }
    // a beira do mar, numa grade mais fina: tartarugas, patos e gansos ao longo de toda a costa
    const COSTA = 45;
    for (let x = -2000; x < 1900; x += COSTA)
      for (let z = -800; z < 3500; z += COSTA) {
        const px = x + rnd() * COSTA, pz = z + rnd() * COSTA, sorte = rnd(), escolha = rnd();
        if (sorte > 0.4) continue;
        const costa = t.costa(px, pz);
        if (costa < 3 || costa > 30 || t.regiaoEm(px, pz) || t.altura(px, pz) < NIVEL_MAR + 1) continue;
        const opcoes = BICHOS.praia!;
        const [especie, n, raio] = opcoes[Math.floor(escolha * opcoes.length)];
        lista.push({ especie, quantidade: n, centro: [px, pz], raio });
      }
    return lista;
  }
}
