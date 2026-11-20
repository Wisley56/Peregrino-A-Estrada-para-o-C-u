import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import type { Fisica } from './Peregrino';

/** Tamanho do voxel do barco (m): o do saveiro da Bahia (0,25) em escala 0,75. O casco tem 36 de comprido (6,75 m). */
const VX = 0.25 * 0.75;
/** Meio comprimento do casco (m), da popa à proa. */
const MEIO = 18 * VX;
/** Quanto o casco afunda (m): água mais rasa que isto, ele encalha. */
export const CALADO = 0.7;
/** A quilha fica esta altura abaixo da superfície (o piso, um pouco acima dela). */
const QUILHA = 0.45;
/** Velocidade máxima (m/s): normal e com a vela toda (Shift). */
const VMAX = 7, VMAX_CHEIA = 10.5;
/** Giro mais rápido do casco (rad/s), com o barco em velocidade. */
const GIRO_MAX = 0.9;
/** Ângulo máximo da cana do leme (rad). */
const LEME_MAX = 0.24;
/** Velocidade do vento (m/s), para a flâmula do mastro. */
const VENTO_V = 6;

/** Voxel do casco (x, y, z) → metros no barco (a origem fica na quilha, no meio do comprimento). */
const em = (x: number, y: number, z: number) => new THREE.Vector3(x * VX, y * VX, (z - 18) * VX);
const v = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

/** Meia boca do casco (em voxels) em cada fatia, da popa (0) à proa (35): popa larga, proa fina. */
const boca = (z: number) => Math.max(2, Math.round(6 * Math.sqrt(Math.sin(Math.PI * Math.min(1, 0.15 + (z / 35) * 0.95)))));
/** A borda (tosado): sobe na proa e um pouco na popa, para o casco não parecer uma caixa. */
const borda = (z: number) => 5 + (z > 25 ? Math.round((z - 25) / 3.5) : 0) + (z < 3 ? 1 : 0);
/** Fatias do mastro e do banco da popa. */
const Z_MASTRO = 23, Z_BANCO = 6;
/** A vela: do pé (`Y_PE`) ao topo do mastro, e quantas colunas ela tem da testa (no mastro) à valuma. */
const Y_PE = 11, Y_TOPO = 34, COLUNAS = 14;

/**
 * Para onde o vento sopra (rumo, na convenção do peregrino), devagar mudando. É só para a vela e a flâmula: a
 * velocidade do barco não depende dele (o barco é para andar no mundo, não um simulador de vela).
 */
export function rumoDoVento(t: number) {
  return 2.4 + Math.sin(t * 0.031) * 0.3 + Math.sin(t * 0.0071) * 0.5;
}

/** O que o timoneiro faz, para a pose do peregrino (`Peregrino.timoneiro`). */
export interface Timoneiro {
  /** A cana do leme, de -1 a 1 (a mão vai junto). */
  leme: number;
  /** A mão da escota puxa (0 solta … 1 caçada). */
  escota: number;
  /** O casco adernado (rad): o corpo pende para o outro lado. */
  aderna: number;
  /** 0 olhando a proa … 1 olhando a vela (de vez em quando). */
  olharVela: number;
  /** Para que lado está a vela (-1 ou 1, no x do barco). */
  ladoVela: number;
}

/** Pool de espuma e borrifo, no mundo (não no barco): a esteira fica para trás enquanto ele anda. */
class Espuma {
  static readonly N = 240;
  readonly malha: THREE.InstancedMesh;
  private p = new Float32Array(Espuma.N * 3);
  private vel = new Float32Array(Espuma.N * 3);
  private vida = new Float32Array(Espuma.N);
  private vidaMax = new Float32Array(Espuma.N);
  private tam = new Float32Array(Espuma.N);
  private giro = new Float32Array(Espuma.N);
  /** 0: espuma boiando; 1: borrifo no ar (cai e vira espuma). */
  private noAr = new Uint8Array(Espuma.N);
  private prox = 0;
  private vivos = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Vector3();
  private eixoY = new THREE.Vector3(0, 1, 0);
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor() {
    this.malha = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshLambertMaterial({ color: 0xdfe7ea }), Espuma.N);
    this.malha.frustumCulled = false;
    this.malha.castShadow = false;
    this.malha.receiveShadow = false;
    for (let i = 0; i < Espuma.N; i++) this.malha.setMatrixAt(i, this.zero);
  }

  soltar(x: number, y: number, z: number, vx: number, vy: number, vz: number, tam: number, vida: number, noAr = false) {
    const i = this.prox;
    this.prox = (this.prox + 1) % Espuma.N;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = y;
    this.p[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.tam[i] = tam;
    this.vida[i] = vida;
    this.vidaMax[i] = vida;
    this.giro[i] = Math.random() * Math.PI;
    this.noAr[i] = noAr ? 1 : 0;
    this.vivos = Espuma.N;
  }

  atualizar(dt: number, fis: Fisica) {
    if (!this.vivos) return;
    let vivos = 0;
    for (let i = 0; i < Espuma.N; i++) {
      if (this.vida[i] <= 0) continue;
      this.vida[i] -= dt;
      if (this.vida[i] <= 0) {
        this.malha.setMatrixAt(i, this.zero);
        continue;
      }
      vivos++;
      const k = i * 3;
      const agua = fis.nivelAgua?.(this.p[k], this.p[k + 2]) ?? this.p[k + 1];
      if (this.noAr[i]) {
        this.vel[k + 1] -= 9.8 * dt;
        this.p[k] += this.vel[k] * dt;
        this.p[k + 1] += this.vel[k + 1] * dt;
        this.p[k + 2] += this.vel[k + 2] * dt;
        // caiu na água: vira espuma
        if (this.p[k + 1] < agua && this.vel[k + 1] < 0) {
          this.noAr[i] = 0;
          this.vida[i] = this.vidaMax[i] = 0.9 + Math.random() * 0.6;
          this.tam[i] *= 1.4;
          this.vel[k] *= 0.2;
          this.vel[k + 2] *= 0.2;
        }
      } else {
        const atrito = Math.max(0, 1 - dt * 0.9);
        this.vel[k] *= atrito;
        this.vel[k + 2] *= atrito;
        this.p[k] += this.vel[k] * dt;
        this.p[k + 2] += this.vel[k + 2] * dt;
        this.p[k + 1] = agua + 0.03;
      }
      // cresce depressa, se espalha e some aos poucos
      const f = 1 - this.vida[i] / this.vidaMax[i];
      const s = this.tam[i] * (this.noAr[i] ? 1 : Math.min(1, f * 6) * (1 + f * 0.5) * (1 - f * f));
      this.q.setFromAxisAngle(this.eixoY, this.giro[i] + f * 0.6);
      this.m.compose(this.e.set(this.p[k], this.p[k + 1], this.p[k + 2]), this.q, new THREE.Vector3(s, s, s));
      this.malha.setMatrixAt(i, this.m);
    }
    this.vivos = vivos;
    this.malha.instanceMatrix.needsUpdate = true;
  }
}

/**
 * O barco do peregrino: um saveiro pequeno, de vela de pano e leme de cana, que ele mesmo conduz pelo mar do mundo
 * aberto (fase 6 da reforma). Flutua na superfície da água (com as ondas), balança com elas, vira devagar para onde o
 * jogador manda e encalha onde a água fica mais rasa que o `CALADO`. Não tem combate a bordo. A posição vai para o
 * save (`Estado.barco`).
 *
 * Tudo nele se mexe: a vela enfuna com o vento (que muda devagar, `rumoDoVento`) e vai para o bordo de sotavento, a
 * retranca cruza de um bordo ao outro quando o vento passa pela popa (o jaibe), a vela panejando quando se aproa ao
 * vento ou quando ninguém está no leme; a cana do leme acompanha a curva; a flâmula do mastro aponta o vento aparente;
 * o casco aderna com a vela e na curva e levanta a proa com a velocidade. Na água ficam a esteira em V, a espuma da
 * proa e os borrifos (`efeitos`, no mundo).
 */
export class Barco {
  readonly grupo = new THREE.Group();
  /** A espuma e os borrifos (no mundo; o `Jogo` põe na cena e esconde junto com o barco). */
  readonly efeitos = new THREE.Group();
  private casco = new THREE.Group();
  /** Onde o peregrino se senta (no banco da popa, junto à cana do leme), no piso. */
  private assento = new THREE.Object3D();
  private vela = new THREE.Group();
  private colunas: THREE.Object3D[] = [];
  private leme = new THREE.Group();
  private flamula = new THREE.Group();
  private gomos: THREE.Object3D[] = [];
  private escota: THREE.Mesh;
  private espuma = new Espuma();
  /** Posição da quilha no mundo (y na água). */
  readonly pos = new THREE.Vector3();
  /** Para onde a proa aponta (a mesma convenção do peregrino: 0 olha para +z). */
  rumo = 0;
  /** Velocidade para a frente (m/s; negativa é de ré). */
  velocidade = 0;
  aBordo = false;
  /** Bateu no raso neste quadro (para o aviso). */
  encalhou = false;
  /** A retranca cruzou de um bordo ao outro neste quadro (para o tranco no som). */
  jaibe = false;
  /** 0 … 1: quanto a vela está panejando (batendo solta). */
  panejo = 0;
  private arfagem = 0;
  private adernamento = 0;
  private t = 0;
  private rumoAntes = 0;
  private giro = 0;
  private cana = 0;
  private cheia = false;
  /** Ângulo da retranca (rad, em volta do mastro) e a velocidade dela (é uma mola: balança e cruza com tranco). */
  private retranca = 0.4;
  private vRetranca = 0;
  private enfuna = 0;
  private olhar = 0;
  private andado = 0;
  private respingo = 0;
  private marola = 0;

  constructor() {
    this.montar();
    this.escota = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xc8b48a }));
    this.casco.add(this.escota);
    this.grupo.add(this.casco);
    this.efeitos.add(this.espuma.malha);
  }

  /** As peças do saveiro, em voxels: casco com piso e bancos, mastro, vela em colunas, retranca, leme e flâmula. */
  private montar() {
    const c = new Modelo();
    const costado = (y: number, topo: number) => (y === topo ? 0x5a4632 : y <= 2 ? 0x2a4a8a : y === 3 ? 0xe8e0d0 : 0xb83a32);
    for (let z = 0; z < 36; z++) {
      const w = boca(z), topo = borda(z);
      c.caixa(-w + 1, 0, z, 2 * w - 1, 1, 1, v(0x4a3a2a));
      for (let y = 1; y <= topo; y++) c.ponto(-w, y, z, variar(costado(y, topo), -w, y, z, 0.04)).ponto(w, y, z, variar(costado(y, topo), w, y, z, 0.04));
      // o piso de tábuas (a 0,75 m da quilha, acima da linha d'água) e, na proa, a coberta
      if (z > 0 && z < 34) c.caixa(-w + 1, 3, z, 2 * w - 1, 1, 1, (x, y, k) => variar(x % 3 === 0 ? 0x6e5a42 : 0x8a7458, x, y, k, 0.05));
      if (z >= 30) c.caixa(-w + 1, topo, z, 2 * w - 1, 1, 1, v(0x7a6448));
    }
    // o painel da popa, a roda de proa, os bancos e o pé do mastro
    const wp = boca(0), tp = borda(0);
    c.caixa(-wp + 1, 1, 0, 2 * wp - 1, tp, 1, (x, y, z) => variar(costado(y, tp), x, y, z, 0.04));
    c.caixa(0, 1, 36, 1, borda(35) + 1, 1, v(0x5a4632));
    const wb = boca(Z_BANCO);
    c.caixa(-wb + 1, 4, Z_BANCO, 2 * wb - 1, 2, 2, v(0x9a8262));
    const wm = boca(Z_MASTRO);
    c.caixa(-wm + 1, 4, Z_MASTRO - 1, 2 * wm - 1, 1, 3, v(0x9a8262));
    c.caixa(0, 4, Z_MASTRO, 1, Y_TOPO - 2, 1, v(0x6a5440));
    // a moringa de barro e um rolo de corda no piso
    c.caixa(3, 4, 10, 1, 2, 1, v(0xb8743a)).ponto(3, 6, 10, 0x8a5a2a);
    c.caixa(-4, 4, 26, 2, 1, 2, v(0xc8b48a));
    this.casco.add(c.malha(VX, [0, 0, 18]));
    this.assento.position.copy(em(-2.25, 4, Z_BANCO + 0.6));
    this.casco.add(this.assento);

    // a vela gira em volta do mastro; cada coluna (da testa à valuma) é uma peça, para ela poder enfunar e panejar
    this.vela.position.copy(em(0.5, 0, Z_MASTRO + 0.5));
    const ret = new Modelo();
    ret.caixa(0, Y_PE - 1, Z_MASTRO - COLUNAS, 1, 1, COLUNAS, v(0x5a4632));
    this.vela.add(ret.malha(VX, [0.5, 0, Z_MASTRO + 0.5]));
    for (let k = 1; k <= COLUNAS; k++) {
      const z = Z_MASTRO - k;
      const topo = Math.min(Y_TOPO, Math.floor(Y_PE + (COLUNAS - k) / 0.42));
      const col = new Modelo();
      for (let y = Y_PE; y <= topo; y++) {
        const costura = (y - Y_PE) % 6 === 5 || k === COLUNAS;
        col.ponto(0, y, z, variar(costura ? 0xc8b898 : 0xe8dcc0, 0, y, z, 0.05));
      }
      const g = new THREE.Group();
      g.add(col.malha(VX, [0.5, 0, Z_MASTRO + 0.5]));
      this.colunas.push(g);
      this.vela.add(g);
    }
    this.casco.add(this.vela);

    // o leme: a porta atrás da popa e a cana comprida que vem até a mão do timoneiro
    this.leme.position.copy(em(0.5, 0, -0.5));
    const l = new Modelo();
    l.caixa(0, -2, -3, 1, 7, 2, v(0x5a4632));
    l.caixa(0, 5, -1, 1, 2, 1, v(0x4a3a2a));
    l.caixa(0, 7, -1, 1, 1, 10, v(0x7a5a3a));
    l.ponto(0, 7, 9, 0x4a3a2a);
    this.leme.add(l.malha(VX, [0.5, 0, -0.5]));
    this.casco.add(this.leme);

    // a flâmula no topo do mastro: três gomos encadeados que ondulam
    this.flamula.position.copy(em(0.5, Y_TOPO + 1, Z_MASTRO + 0.5));
    let pai: THREE.Object3D = this.flamula;
    for (let i = 0; i < 3; i++) {
      const f = new Modelo();
      const alto = i < 2 ? 2 : 1;
      f.caixa(0, 0, 0, 1, alto, 2, i % 2 ? 0xe8e0d0 : 0xb83a32);
      const g = new THREE.Group();
      if (i) g.position.z = 2 * VX;
      g.add(f.malha(VX, [0.5, alto / 2, 0]));
      pai.add(g);
      this.gomos.push(g);
      pai = g;
    }
    this.casco.add(this.flamula);

    this.casco.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** Põe o barco parado num lugar (ao carregar o save, ao chamá-lo a um cais). */
  colocar(x: number, z: number, rumo: number, fis: Fisica) {
    this.pos.set(x, (fis.nivelAgua?.(x, z) ?? 0) - QUILHA, z);
    this.rumo = rumo;
    this.rumoAntes = rumo;
    this.velocidade = 0;
    this.aplicar();
  }

  /** O ponto do mundo a `frente` m da quilha, na linha da proa. */
  ponto(frente: number, lado = 0, destino = new THREE.Vector3()) {
    const s = Math.sin(this.rumo), c = Math.cos(this.rumo);
    return destino.set(this.pos.x + s * frente + c * lado, this.pos.y, this.pos.z + c * frente - s * lado);
  }

  /** Onde o peregrino fica a bordo: sentado no banco da popa (o ponto é o piso sob ele). */
  lugarDoPeregrino(destino = new THREE.Vector3()) {
    this.grupo.updateMatrixWorld(true);
    return this.assento.getWorldPosition(destino);
  }

  /** Prende o boneco do peregrino ao banco: ele vai junto com o casco, arfando e adernando. */
  prenderAoAssento(raiz: THREE.Object3D) {
    this.grupo.updateMatrixWorld(true);
    this.assento.getWorldPosition(raiz.position);
    this.assento.getWorldQuaternion(raiz.quaternion);
  }

  /** O que o timoneiro está fazendo agora (a pose do peregrino). */
  get timoneiro(): Timoneiro {
    return {
      leme: this.cana / LEME_MAX,
      escota: this.enfuna,
      aderna: this.adernamento,
      olharVela: this.olhar,
      ladoVela: Math.sign(this.retranca) || 1,
    };
  }

  /** 0 … 1: quanto a água corre no casco (para o som). */
  get somDaAgua() {
    return Math.min(1, Math.abs(this.velocidade) / VMAX_CHEIA + this.marola * 0.15);
  }

  /** Profundidade da água no ponto (m; negativa ou zero em terra). */
  static profundidade(fis: Fisica, x: number, z: number) {
    const agua = fis.nivelAgua?.(x, z);
    return agua === null || agua === undefined ? -1 : agua - fis.altura(x, z);
  }

  /**
   * O casco cabe aqui (a água tem calado no meio, na proa e na popa)? `sentido` 1 olha só o meio e a proa (andando
   * para a frente), -1 só o meio e a popa (de ré): uma ponta já no raso não prende o barco que se afasta dele.
   */
  cabe(fis: Fisica, x: number, z: number, rumo: number, sentido = 0) {
    const s = Math.sin(rumo), c = Math.cos(rumo);
    const pontos = sentido > 0 ? [0, MEIO] : sentido < 0 ? [-MEIO, 0] : [-MEIO, 0, MEIO];
    for (const f of pontos) if (Barco.profundidade(fis, x + s * f, z + c * f) < CALADO) return false;
    return true;
  }

  /**
   * Conduz: `desejo` é a direção pedida no mundo (como a do andar, relativa à câmera, comprimento 0..1). O barco vira
   * devagar para ela e anda tanto mais quanto mais a proa já aponta para lá; para trás, vai de ré, devagar.
   */
  conduzir(dt: number, desejo: THREE.Vector3, cheia: boolean, fis: Fisica) {
    this.encalhou = false;
    this.cheia = cheia;
    const forca = Math.min(1, desejo.length());
    let alvoV = 0;
    if (forca > 0.05) {
      const alvo = Math.atan2(desejo.x, desejo.z);
      let dif = alvo - this.rumo;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      const cos = Math.cos(dif);
      // de ré quando se pede quase o contrário da proa; senão vira para o pedido
      if (cos < -0.7) alvoV = -1.5 * forca;
      else {
        const giro = (0.35 + Math.min(1, Math.abs(this.velocidade) / VMAX) * (GIRO_MAX - 0.35)) * dt;
        this.rumo += Math.max(-giro, Math.min(giro, dif));
        alvoV = Math.max(0, cos) * forca * (cheia ? VMAX_CHEIA : VMAX);
      }
    }
    const acel = alvoV > this.velocidade ? 1.6 : 2.4;
    this.velocidade += Math.max(-acel * dt, Math.min(acel * dt, alvoV - this.velocidade));

    // anda, se a água lá na frente (ou atrás, de ré) ainda tem calado
    const passo = this.velocidade * dt;
    if (passo) {
      const s = Math.sin(this.rumo), c = Math.cos(this.rumo);
      const nx = this.pos.x + s * passo, nz = this.pos.z + c * passo;
      if (this.cabe(fis, nx, nz, this.rumo, Math.sign(passo))) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else {
        // encalha: para com um tranco, recuando um palmo, e a água espirra na proa
        this.encalhou = Math.abs(this.velocidade) > 0.6;
        if (this.encalhou) this.borrifar(Math.sign(this.velocidade) * (MEIO - 0.2), 14, 1.4);
        this.velocidade = -Math.sign(this.velocidade) * Math.min(0.6, Math.abs(this.velocidade) * 0.2);
      }
    }
    this.animar(dt, fis, true);
  }

  /** Sem ninguém no leme: o barco para aos poucos e fica balançando onde está, a vela batendo solta. */
  deriva(dt: number, fis: Fisica) {
    this.cheia = false;
    this.velocidade *= Math.max(0, 1 - dt * 1.5);
    this.animar(dt, fis, false);
  }

  /** Tudo o que se mexe sozinho: o casco nas ondas, a vela, o leme, a flâmula e a água em volta. */
  private animar(dt: number, fis: Fisica, comGente: boolean) {
    this.t += dt;
    this.jaibe = false;
    const vel = Math.abs(this.velocidade), vk = Math.min(1, vel / VMAX);
    // a curva: o leme vai para o lado contrário dela e o casco aderna para fora
    let d = this.rumo - this.rumoAntes;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rumoAntes = this.rumo;
    const giro = dt > 0 ? d / dt : 0;
    this.giro += (giro - this.giro) * Math.min(1, dt * 6);
    const alvoCana = comGente ? -Math.max(-1, Math.min(1, this.giro / GIRO_MAX)) * LEME_MAX : Math.sin(this.t * 0.7) * 0.05;
    this.cana += (alvoCana - this.cana) * Math.min(1, dt * 5);
    this.leme.rotation.y = this.cana;

    // o vento no barco: de onde vem, em relação à proa (0 = de proa; ±π = de popa; positivo = pelo bordo +x)
    const vento = rumoDoVento(this.t);
    let teta = vento + Math.PI - this.rumo;
    teta = Math.atan2(Math.sin(teta), Math.cos(teta));
    const a = Math.abs(teta), lado = Math.sign(teta) || 1;
    // aproado (vento quase de proa) ou sem ninguém na escota: a vela bate; senão enfuna, mais com a vela toda
    let enfuna = Math.max(0, Math.min(1, (a - 0.55) / 0.55));
    if (!comGente) enfuna *= 0.25;
    this.enfuna += (enfuna * (this.cheia ? 1.25 : 1) - this.enfuna) * Math.min(1, dt * 2.5);
    this.panejo += (Math.max(0, 1 - enfuna * 1.4) - this.panejo) * Math.min(1, dt * 3);
    // a retranca vai para sotavento, tanto mais aberta quanto mais o vento vem de trás; é uma mola, que balança
    const abre = comGente ? Math.max(0.14, Math.min(1.3, (a - 0.45) * 0.6)) : 1.0;
    const alvoRet = a < 0.55 ? Math.sin(this.t * 1.9) * 0.1 + Math.sign(this.retranca) * 0.06 : lado * abre;
    const antes = this.retranca;
    this.vRetranca += ((alvoRet - this.retranca) * 9 - this.vRetranca * 3.2) * dt;
    this.vRetranca += Math.sin(this.t * 13) * this.panejo * 0.6 * dt;
    this.retranca += this.vRetranca * dt;
    if (Math.sign(antes) !== Math.sign(this.retranca) && Math.abs(this.vRetranca) > 0.9) this.jaibe = true;
    this.vela.rotation.y = this.retranca;
    // o pano: barriga para sotavento (no meio da corda), e a onda do panejo correndo da testa para a valuma
    const barriga = this.enfuna * 0.24;
    const sota = -Math.sign(this.retranca || lado);
    for (let k = 0; k < this.colunas.length; k++) {
      const u = (k + 1) / COLUNAS;
      const bate = Math.sin(this.t * 15 - k * 0.9) * 0.1 * u * this.panejo;
      this.colunas[k].position.x = sota * barriga * Math.sin(Math.PI * Math.min(1, u * 1.08)) + bate;
    }
    // a escota: da ponta da retranca até o olhal no bordo, junto ao timoneiro
    const ponta = new THREE.Vector3(0, (Y_PE - 0.5) * VX, -(COLUNAS - 1) * VX).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.retranca).add(this.vela.position);
    const olhal = em(Math.sign(this.retranca || 1) * (boca(Z_BANCO + 3) - 0.5), 5.6, Z_BANCO + 3);
    this.esticar(this.escota, olhal, ponta, 0.035);

    // a flâmula aponta o vento aparente (o vento menos o andar do barco) e ondula
    const vr = vento - this.rumo;
    const ax = Math.sin(vr) * VENTO_V, az = Math.cos(vr) * VENTO_V - this.velocidade;
    const forte = Math.min(1.6, Math.hypot(ax, az) / VENTO_V);
    let alvoFl = Math.atan2(ax, az) - this.flamula.rotation.y;
    alvoFl = Math.atan2(Math.sin(alvoFl), Math.cos(alvoFl));
    this.flamula.rotation.y += alvoFl * Math.min(1, dt * 4);
    this.gomos.forEach((g, i) => (g.rotation.y = Math.sin(this.t * (9 + forte * 4) - i * 1.2) * (0.25 + i * 0.15) * forte));

    // de vez em quando o timoneiro olha a vela (mais quando ela bate)
    const ciclo = (this.t * 0.17 + this.panejo * 0.3) % 1;
    this.olhar += ((ciclo > 0.82 ? 1 : 0) - this.olhar) * Math.min(1, dt * 3);

    this.flutuar(dt, fis, lado, vk);
    this.agua(dt, fis, vel);
  }

  /** Estica uma peça fina (a corda da escota) entre dois pontos do casco. */
  private esticar(m: THREE.Mesh, de: THREE.Vector3, ate: THREE.Vector3, grossura: number) {
    m.position.copy(de).add(ate).multiplyScalar(0.5);
    m.scale.set(grossura, grossura, de.distanceTo(ate));
    m.lookAt(this.casco.localToWorld(ate.clone()));
  }

  /**
   * Acompanha a superfície da água: altura no meio, arfagem pela proa e pela popa, adernamento pelos bordos; e por
   * cima disso a vela (aderna a sotavento), a curva (aderna para fora) e a velocidade (a proa sobe e bate nas ondas).
   */
  private flutuar(dt: number, fis: Fisica, ladoVento: number, vk: number) {
    const agua = (f: number, l: number) => {
      const p = this.ponto(f, l);
      return fis.nivelAgua?.(p.x, p.z) ?? this.pos.y + QUILHA;
    };
    const meio = agua(0, 0);
    const k = Math.min(1, dt * 4);
    const bate = Math.sin(this.t * (2.2 + vk * 2.5)) * 0.03 * vk;
    this.pos.y += (meio - QUILHA + bate - this.pos.y) * k;
    const arf = Math.atan2(agua(MEIO, 0) - agua(-MEIO, 0), 2 * MEIO) * 0.8 + vk * 0.035 + bate * 0.4;
    const vela = ladoVento * 0.1 * this.enfuna * vk * (this.cheia ? 1.3 : 1);
    const curva = Math.max(-0.08, Math.min(0.08, this.giro * vk * 0.12));
    const ader = Math.atan2(agua(0, 1.2) - agua(0, -1.2), 2.4) * 0.8 + Math.sin(this.t * 1.3) * 0.02 + vela + curva;
    this.arfagem += (arf - this.arfagem) * k;
    this.adernamento += (Math.max(-0.22, Math.min(0.22, ader)) - this.adernamento) * Math.min(1, dt * 2.5);
    this.aplicar();
  }

  /** A esteira em V da popa, a onda e o borrifo da proa, e a marola batendo no casco parado. */
  private agua(dt: number, fis: Fisica, vel: number) {
    const s = Math.sin(this.rumo), c = Math.cos(this.rumo);
    const p = new THREE.Vector3();
    const sentido = Math.sign(this.velocidade) || 1;
    // a cada palmo andado: um par de espumas que se abrem para os lados (o V) e a água revolta no meio
    this.andado += vel * dt;
    while (this.andado > 0.4) {
      this.andado -= 0.4;
      for (const l of [-1, 1]) {
        this.ponto(-sentido * (MEIO - 0.3), l * 0.75, p);
        const abre = 0.35 + vel * 0.07;
        this.espuma.soltar(p.x, p.y, p.z, c * l * abre - s * sentido * 0.3, 0, -s * l * abre - c * sentido * 0.3, 0.15 + Math.random() * 0.09, 2.6 + Math.random() * 0.8);
      }
      this.ponto(-sentido * (MEIO + 0.2), (Math.random() - 0.5) * 0.5, p);
      this.espuma.soltar(p.x, p.y, p.z, 0, 0, 0, 0.2 + Math.random() * 0.08, 1.5 + Math.random() * 0.6);
    }
    // a proa abrindo a água: espuma junto ao casco e, rápido, borrifos que voam e caem
    if (this.velocidade > 1.5) {
      this.respingo += dt * this.velocidade * 1.6;
      while (this.respingo > 1) {
        this.respingo -= 1;
        const l = Math.random() < 0.5 ? -1 : 1;
        this.ponto(MEIO - 1.0 - Math.random() * 0.8, l * 0.95, p);
        this.espuma.soltar(p.x, p.y, p.z, c * l * 0.9, 0, -s * l * 0.9, 0.13 + Math.random() * 0.07, 1.1 + Math.random() * 0.5);
      }
      if (this.velocidade > 4 && Math.random() < dt * (this.velocidade - 4) * 5) this.borrifar(MEIO - 0.4, 2 + Math.floor(Math.random() * 3), (this.velocidade - 3) / 6);
    }
    // parado, a marola bate de leve no costado
    this.marola += (Math.max(0, 1 - vel) - this.marola) * Math.min(1, dt);
    if (Math.random() < dt * 2.2 * this.marola) {
      const l = Math.random() < 0.5 ? -1 : 1;
      this.ponto((Math.random() - 0.5) * 2 * (MEIO - 0.8), l * 1.05, p);
      this.espuma.soltar(p.x, p.y, p.z, c * l * 0.15, 0, -s * l * 0.15, 0.16, 1.3);
    }
    this.espuma.atualizar(dt, fis);
  }

  /** Borrifos que saltam da proa (ou da popa, de ré) para os lados e para cima. */
  private borrifar(frente: number, n: number, forca: number) {
    const s = Math.sin(this.rumo), c = Math.cos(this.rumo);
    const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const l = Math.random() < 0.5 ? -1 : 1;
      this.ponto(frente, l * (0.2 + Math.random() * 0.4), p);
      const lat = (1 + Math.random() * 1.6) * forca, fr = this.velocidade * 0.5;
      this.espuma.soltar(p.x, p.y + QUILHA + 0.1, p.z, c * l * lat + s * fr, (1.4 + Math.random() * 1.8) * forca, -s * l * lat + c * fr, 0.1 + Math.random() * 0.08, 3, true);
    }
  }

  private aplicar() {
    this.grupo.position.copy(this.pos);
    this.grupo.rotation.set(0, this.rumo, 0);
    this.casco.rotation.set(-this.arfagem, 0, this.adernamento);
  }
}
