import * as THREE from 'three';
import { ESCALA_HUMANO, montarHumano, type Humano } from '../voxel/Humano';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * "Os que passam": as sombras comuns das Ruas da Bahia (docs/regioes/01-ruas-da-bahia.md, seção 3). Vultos de
 * pedra, de chapéu e guarda-chuva, que andam em fila pelas ruas olhando para o chão. Não atacam: empurram quem
 * está no caminho e fecham passagens. Uma luz desfaz um deles por um tempo; mas a resposta da região é outra:
 * quando o peregrino passa carregando um doente, a fila para, abre caminho e levanta os olhos.
 */

const S = ESCALA_HUMANO;
const PEDRA = 0x8e8a82, PEDRA_ESCURA = 0x6a6660, PEDRA_CLARA = 0xa8a49a;
/** Raio do corpo, para empurrar. */
const RAIO = 0.42;
/** A que distância de quem carrega um doente a fila para e abre caminho. */
const ALCANCE_ABRIR = 7;
/** Quanto tempo um passante desfeito pela luz leva para voltar. */
const VOLTA = 30;

function montarPassante(semente: number): Humano {
  const tom = (k: number) => variar(PEDRA, k, semente, 0, 0.05);
  const h = montarHumano({
    genero: 'm', idade: 'adulto', pele: PEDRA_CLARA, penteado: 'curto', corCabelo: PEDRA_ESCURA,
    traje: semente % 3 === 0 ? 'manto_rico' : 'tunica', cor: tom(1), cor2: PEDRA_ESCURA,
  });
  // o chapéu de aba
  const c = new Modelo()
    .caixa(-1, 6, -1, 8, 1, 8, (x, y, z) => variar(PEDRA_ESCURA, x, y, z, 0.05))
    .caixa(0, 7, 0, 6, 2, 6, (x, y, z) => variar(PEDRA_ESCURA, x, y, z, 0.05))
    .caixa(0, 7, 0, 6, 1, 6, 0x4e4a46);
  h.cabeca.add(c.malha(S, [3, 0, 3]));
  // o guarda-chuva fechado na mão direita: o cabo curvo acima da mão, o pano enrolado e a ponteira no chão
  if (h.bracoD) {
    const g = new Modelo()
      .caixa(0, 0, 0, 1, 2, 1, PEDRA_ESCURA).ponto(0, 2, 1, PEDRA_ESCURA).ponto(0, 1, 1, PEDRA_ESCURA)
      .caixa(-1, -7, -1, 3, 7, 3, (x, y, z) => variar(0x4a4844, x, y, z, 0.05))
      .caixa(0, -9, 0, 1, 2, 1, PEDRA_CLARA);
    const m = g.malha(S, [0.5, 0, 0.5]);
    m.position.set(0, -6.6 * S, 0.4 * S);
    h.bracoD.add(m);
  }
  h.raiz.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return h;
}

export class Passante {
  readonly raiz = new THREE.Group();
  readonly pos = new THREE.Vector3();
  readonly humano: Humano;
  /** Para onde olha, andando. */
  rumo = 0;
  /** Desfeito pela luz: some e volta depois de `VOLTA` segundos. */
  desfeito = 0;
  /** 0 com o vulto inteiro … 1 sumido (o desfazer e o voltar são graduais). */
  private sumico = 0;
  private fase = Math.random() * 10;
  /** O desvio para o lado quando abre caminho, e a cabeça erguida. */
  readonly desvio = new THREE.Vector3();
  olhando = 0;

  constructor(semente: number) {
    this.humano = montarPassante(semente);
    this.raiz.add(this.humano.raiz);
  }

  get ativo() {
    return this.desfeito <= 0 && this.raiz.visible;
  }

  /** Para a mira (`Alvo`). */
  get ativa() {
    return this.ativo;
  }

  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(this.desvio).setY(this.pos.y + 1.1);
  }

  desfazer() {
    this.desfeito = VOLTA;
  }

  /** Põe o modelo onde a fila mandou, andando (`andando`) ou parado. */
  mostrar(dt: number, andando: boolean, olharPara: THREE.Vector3 | null) {
    this.desfeito = Math.max(0, this.desfeito - dt);
    this.sumico += ((this.desfeito > 0 ? 1 : 0) - this.sumico) * Math.min(1, dt * 3);
    const h = this.humano;
    h.raiz.scale.set(1 - this.sumico * 0.3, 1 - this.sumico * 0.9, 1 - this.sumico * 0.3);
    h.raiz.visible = this.sumico < 0.97;
    if (andando) this.fase += dt * 6;
    const passo = andando ? Math.sin(this.fase) : 0;
    this.raiz.position.copy(this.pos).add(this.desvio);
    this.raiz.position.y += andando ? Math.abs(passo) * 0.03 : 0;
    let alvo = this.rumo;
    if (olharPara) alvo = Math.atan2(olharPara.x - this.raiz.position.x, olharPara.z - this.raiz.position.z);
    let d = alvo - this.raiz.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.raiz.rotation.y += d * Math.min(1, dt * 5);
    // a cabeça baixa de quem não vê ninguém; erguida quando para diante do sofredor
    const cab = 0.42 * (1 - this.olhando) - 0.05 * this.olhando;
    h.cabeca.rotation.x += (cab - h.cabeca.rotation.x) * Math.min(1, dt * 4);
    h.bracoE?.rotation.set(-passo * 0.35, 0, 0.05);
    h.bracoD?.rotation.set(passo * 0.25, 0, -0.05);
  }
}

/**
 * Uma fila de passantes. Com `velocidade` > 0 eles andam em fila pelo caminho, de ponta a ponta e de volta (ou
 * em volta, se `fechado`); com 0, ficam parados lado a lado nos pontos do caminho, fechando uma passagem.
 */
export class FilaDePassantes {
  readonly passantes: Passante[] = [];
  private comprimentos: number[] = [];
  private total = 0;
  private s = 0;
  private parada = 0;
  /** Verdadeiro no quadro em que um deles empurrou o peregrino. */
  empurrou = false;

  constructor(
    readonly grupo: THREE.Group,
    private caminho: THREE.Vector3[],
    quantos: number,
    private chao: (x: number, z: number) => number,
    private velocidade = 1.1,
    private espaco = 1.4,
    private fechado = false,
    semente = 1,
  ) {
    for (let k = 1; k < caminho.length; k++) this.comprimentos.push(caminho[k].distanceTo(caminho[k - 1]));
    if (fechado) this.comprimentos.push(caminho[0].distanceTo(caminho[caminho.length - 1]));
    this.total = this.comprimentos.reduce((a, b) => a + b, 0);
    this.s = (quantos - 1) * espaco;
    for (let k = 0; k < quantos; k++) {
      const p = new Passante(semente * 31 + k * 7);
      this.passantes.push(p);
      grupo.add(p.raiz);
    }
    this.posicionar();
  }

  set visivel(v: boolean) {
    for (const p of this.passantes) p.raiz.visible = v;
  }

  get visivel() {
    return this.passantes[0]?.raiz.visible ?? false;
  }

  /** O ponto a `d` metros do começo do caminho (0 … total), e o rumo de quem anda para a frente nele. */
  private pontoEm(d: number, destino: THREE.Vector3): number {
    const n = this.caminho.length;
    for (let k = 0; k < this.comprimentos.length; k++) {
      const c = this.comprimentos[k];
      if (d <= c || k === this.comprimentos.length - 1) {
        const a = this.caminho[k], b = this.caminho[(k + 1) % n];
        destino.lerpVectors(a, b, c > 0 ? Math.max(0, Math.min(1, d / c)) : 0);
        return Math.atan2(b.x - a.x, b.z - a.z);
      }
      d -= c;
    }
    destino.copy(this.caminho[0]);
    return 0;
  }

  /**
   * Num caminho aberto, a fila vai até a ponta e volta como uma corrente: o percurso é um laço de ida e volta
   * (2 × total), e quem volta anda 0,6 m para o lado, para a ida e a volta não se atravessarem.
   */
  private posicionar() {
    const anda = this.velocidade > 0;
    const laco = this.fechado ? this.total : 2 * this.total;
    this.passantes.forEach((p, k) => {
      if (anda) {
        const u = (((this.s - k * this.espaco) % laco) + laco) % laco;
        const volta = !this.fechado && u > this.total;
        const rumo = this.pontoEm(volta ? laco - u : u, p.pos);
        p.rumo = volta ? rumo + Math.PI : rumo;
        if (!this.fechado) {
          p.pos.x += Math.cos(p.rumo) * 0.6;
          p.pos.z -= Math.sin(p.rumo) * 0.6;
        }
      } else {
        p.pos.copy(this.caminho[Math.min(k, this.caminho.length - 1)]);
      }
      p.pos.y = this.chao(p.pos.x, p.pos.z);
    });
  }

  /**
   * `carregando`: o peregrino leva um doente nas costas. Perto dele a fila inteira para; cada um dá um passo para
   * o lado, longe do peregrino, e olha para quem ele carrega.
   */
  atualizar(dt: number, jogador: THREE.Vector3, carregando: boolean) {
    if (!this.visivel) return;
    let perto = false;
    for (const p of this.passantes) if (p.ativo && p.pos.distanceTo(jogador) < ALCANCE_ABRIR) perto = true;
    const abrir = carregando && perto;
    this.parada += ((abrir ? 1 : 0) - this.parada) * Math.min(1, dt * 3);
    const anda = this.velocidade > 0 && !abrir;
    if (anda) {
      this.s += this.velocidade * dt;
      this.posicionar();
    }
    for (const p of this.passantes) {
      const quer = new THREE.Vector3();
      if (this.parada > 0.01) {
        // para o lado, longe do peregrino (perpendicular ao caminho, se ele está na frente)
        const lado = p.pos.clone().sub(jogador).setY(0);
        if (lado.lengthSq() < 1e-4) lado.set(1, 0, 0);
        lado.normalize().multiplyScalar(1.3 * this.parada);
        quer.copy(lado);
      }
      p.desvio.lerp(quer, Math.min(1, dt * 4));
      p.olhando = this.parada;
      p.mostrar(dt, anda, this.parada > 0.3 ? jogador : null);
    }
  }

  /** Os passantes inteiros são sólidos: empurram para fora quem esbarra neles. */
  colidir(pos: THREE.Vector3, raio: number) {
    if (!this.visivel) return;
    for (const p of this.passantes) {
      if (!p.ativo) continue;
      const cx = p.pos.x + p.desvio.x, cz = p.pos.z + p.desvio.z;
      const dx = pos.x - cx, dz = pos.z - cz;
      const min = RAIO + raio;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1e-3;
        // andando, o empurrão é um pouco mais forte: eles não desviam
        const k = this.velocidade > 0 && this.parada < 0.5 ? 1.15 : 1;
        pos.x = cx + (dx / d) * min * k;
        pos.z = cz + (dz / d) * min * k;
        this.empurrou = true;
      }
    }
  }

  /** Uma luz chegou em `p`: desfaz o passante que ela tocou. */
  atingirLuz(p: THREE.Vector3) {
    if (!this.visivel) return false;
    const c = new THREE.Vector3();
    for (const q of this.passantes) {
      if (!q.ativo) continue;
      if (q.centro(c).distanceTo(p) < 0.85) {
        q.desfazer();
        return true;
      }
    }
    return false;
  }
}
