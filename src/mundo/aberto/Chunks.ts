import * as THREE from 'three';
import { construirLadrilho, geometriaDe, N, type MalhaCrua } from './Ladrilho';
import { Obra } from './Obra';
import type { TerrenoMundo } from './TerrenoMundo';

/**
 * Os níveis de detalhe: o lado da célula (m) e até que distância do jogador o nível é usado. Cada ladrilho de um
 * nível se parte em 16 do nível mais fino (4 × 4). De perto, colunas de 1 m como as das regiões; de longe, blocos
 * maiores, que a névoa e a distância disfarçam.
 */
export const NIVEIS = [
  { celula: 1, raio: 128 },
  { celula: 4, raio: 640 },
  { celula: 16, raio: 1700 },
];
const TOPO = NIVEIS.length - 1;
/** Quanto além do raio um ladrilho já feito é mantido (para não refazer ao ir e voltar). */
const FOLGA = 1.25;
/** Tempo por quadro para pôr em cena os ladrilhos que a obra entregou (ms). */
const ORCAMENTO = 3;
/** Quantos ladrilhos podem estar na obra ao mesmo tempo (mais que isso só atrasa a resposta a quem anda). */
const NA_OBRA = 8;
/** O jogador precisa andar isto (m) para a lista de ladrilhos ser refeita. */
const PASSO_REVISAO = 6;

interface Ladrilho {
  nivel: number;
  ix: number;
  iz: number;
  /** A malha; `null` se o ladrilho está feito mas não tem o que desenhar (todo dentro de uma região, ou no fundo do mar). */
  malha: THREE.Mesh | null;
  feito: boolean;
  /** Já foi pedido à obra (e a resposta ainda não chegou). */
  pedido: boolean;
  /** Distância do jogador (m) na última revisão. */
  dist: number;
  /** Está dentro do raio do nível mais fino: os 16 filhos devem substituí-lo. */
  partido: boolean;
}

const chave = (nivel: number, ix: number, iz: number) => `${nivel}:${ix}:${iz}`;

/**
 * O chão do mundo em ladrilhos carregados por distância (os "chunks"), em três níveis de detalhe. Desenha o que o
 * `TerrenoMundo` descreve, menos o miolo das regiões feitas à mão (cada uma tem a sua malha): assim a terra de
 * ligação encosta nelas sem emenda. Os ladrilhos são feitos pela obra (Web Workers), os mais grosseiros primeiro, e
 * entram em cena aos poucos; um ladrilho só some quando os 16 mais finos que o substituem estão prontos.
 */
export class Chunks {
  readonly grupo = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly ladrilhos = new Map<string, Ladrilho>();
  private fila: Ladrilho[] = [];
  private readonly ultimo = new THREE.Vector2(Infinity, Infinity);
  /** Os ladrilhos que a obra entregou e ainda não entraram em cena. */
  private prontos: [Ladrilho, MalhaCrua | null][] = [];
  readonly obra: Obra;
  /** Quantos ladrilhos foram feitos e quanto tempo levou (para o painel de desenvolvimento). */
  readonly medida = { feitos: 0, ms: 0 };

  constructor(private readonly terreno: TerrenoMundo) {
    this.obra = new Obra(terreno);
  }

  get total() {
    return this.ladrilhos.size;
  }

  get pendentes() {
    return this.fila.length + this.obra.emAndamento + this.prontos.length;
  }

  /**
   * Revê os ladrilhos em volta de (x, z), manda à obra os que faltam e põe em cena os que ela entregou.
   * `tudo`: faz todos agora, aqui mesmo (trava o quadro; para quando não pode haver buraco nenhum).
   */
  atualizar(x: number, z: number, tudo = false) {
    if (Math.hypot(x - this.ultimo.x, z - this.ultimo.y) > PASSO_REVISAO) {
      this.ultimo.set(x, z);
      this.rever(x, z);
    }
    const vivo = (l: Ladrilho) => this.ladrilhos.get(chave(l.nivel, l.ix, l.iz)) === l;
    if (tudo) {
      for (const l of this.fila) if (!l.feito && vivo(l)) this.fazer(l, this.montar(l));
      this.fila = [];
    }
    while (this.fila.length && this.obra.emAndamento < NA_OBRA) {
      const l = this.fila.shift()!;
      if (l.feito || l.pedido || !vivo(l)) continue;
      l.pedido = true;
      const { celula } = NIVEIS[l.nivel], lado = celula * N;
      this.obra.ladrilho(l.ix * lado, l.iz * lado, celula, l.nivel === 0, (m) => this.prontos.push([l, m]));
    }
    const t0 = performance.now();
    let feitos = 0;
    while (this.prontos.length && (feitos === 0 || performance.now() - t0 < ORCAMENTO)) {
      const [l, m] = this.prontos.shift()!;
      l.pedido = false;
      if (l.feito || !vivo(l)) continue;
      this.fazer(l, m);
      feitos++;
    }
    if (feitos || tudo) {
      this.medida.feitos += feitos;
      this.medida.ms += performance.now() - t0;
      this.mostrar();
    }
  }

  /** Faz a malha de um ladrilho aqui mesmo, sem a obra. */
  private montar(l: Ladrilho) {
    const { celula } = NIVEIS[l.nivel], lado = celula * N;
    return construirLadrilho(this.terreno, l.ix * lado, l.iz * lado, celula, l.nivel === 0);
  }

  private dist(nivel: number, ix: number, iz: number, x: number, z: number) {
    const lado = NIVEIS[nivel].celula * N;
    const x0 = ix * lado, z0 = iz * lado;
    return Math.hypot(Math.max(x0 - x, 0, x - x0 - lado), Math.max(z0 - z, 0, z - z0 - lado));
  }

  /** Refaz a lista do que deve existir: marca o que está perto, enfileira o que falta e joga fora o que ficou longe. */
  private rever(x: number, z: number) {
    const vivos = new Set<string>();
    // `forcado`: é um dos 16 filhos de um ladrilho partido (existem todos ou nenhum, para o pai poder ceder o lugar)
    const visitar = (nivel: number, ix: number, iz: number, forcado: boolean) => {
      const d = this.dist(nivel, ix, iz, x, z);
      const k = chave(nivel, ix, iz);
      let l = this.ladrilhos.get(k);
      if (!forcado && d > NIVEIS[nivel].raio * (l ? FOLGA : 1)) return;
      if (!l) {
        l = { nivel, ix, iz, malha: null, feito: false, pedido: false, dist: d, partido: false };
        this.ladrilhos.set(k, l);
      }
      l.dist = d;
      vivos.add(k);
      if (nivel === 0) return;
      const raioFino = NIVEIS[nivel - 1].raio;
      l.partido = d < raioFino;
      // os filhos nascem quando o pai entra no raio deles e duram até ele sair da folga
      const temFilhos = this.ladrilhos.has(chave(nivel - 1, ix * 4, iz * 4));
      if (l.partido || (temFilhos && d < raioFino * FOLGA)) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) visitar(nivel - 1, ix * 4 + a, iz * 4 + b, true);
    };
    const lado = NIVEIS[TOPO].celula * N, alcance = NIVEIS[TOPO].raio * FOLGA;
    for (let ix = Math.floor((x - alcance) / lado); ix <= Math.floor((x + alcance) / lado); ix++)
      for (let iz = Math.floor((z - alcance) / lado); iz <= Math.floor((z + alcance) / lado); iz++) visitar(TOPO, ix, iz, false);
    for (const [k, l] of this.ladrilhos)
      if (!vivos.has(k)) {
        if (l.malha) {
          this.grupo.remove(l.malha);
          l.malha.geometry.dispose();
        }
        this.ladrilhos.delete(k);
      }
    // primeiro os grosseiros (cobrem tudo depressa), e em cada nível os mais próximos
    this.fila = [...this.ladrilhos.values()].filter((l) => !l.feito && !l.pedido).sort((a, b) => b.nivel - a.nivel || a.dist - b.dist);
    this.mostrar();
  }

  /** Põe em cena a malha de um ladrilho. */
  private fazer(l: Ladrilho, crua: MalhaCrua | null) {
    const lado = NIVEIS[l.nivel].celula * N;
    l.feito = true;
    if (!crua) return;
    const m = new THREE.Mesh(geometriaDe(crua), this.material);
    m.position.set(l.ix * lado, 0, l.iz * lado);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    m.receiveShadow = l.nivel === 0;
    m.visible = false;
    l.malha = m;
    this.grupo.add(m);
  }

  /** Decide o que se vê: um ladrilho partido só dá lugar aos filhos quando os 16 estão feitos. */
  private mostrar() {
    const filhosProntos = (l: Ladrilho) => {
      for (let a = 0; a < 4; a++)
        for (let b = 0; b < 4; b++) {
          const f = this.ladrilhos.get(chave(l.nivel - 1, l.ix * 4 + a, l.iz * 4 + b));
          if (!f || !f.feito) return false;
        }
      return true;
    };
    const ver = (l: Ladrilho, visivel: boolean) => {
      const cede = visivel && l.partido && filhosProntos(l);
      if (l.malha) l.malha.visible = visivel && !cede;
      if (l.nivel === 0) return;
      for (let a = 0; a < 4; a++)
        for (let b = 0; b < 4; b++) {
          const f = this.ladrilhos.get(chave(l.nivel - 1, l.ix * 4 + a, l.iz * 4 + b));
          if (f) ver(f, cede);
        }
    };
    for (const l of this.ladrilhos.values()) if (l.nivel === TOPO) ver(l, l.feito);
  }
}

