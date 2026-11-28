import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Visual, misturar } from '../core/Aparencia';
import { lamparinaModelo } from '../mundo/Cenario';
import type { Timoneiro } from './Barco';
import { AJUSTES } from '../config/ajustes';

const S = 0.085; // tamanho do voxel do personagem (m)

export interface Fisica {
  altura(x: number, z: number): number;
  /** Empurra um círculo (x, z) para fora dos obstáculos. */
  colidir(pos: THREE.Vector3, raio: number): void;
  /** Altura mínima para quem flutua (ex.: a superfície da água). */
  nivelMinimo?: number;
  /**
   * A superfície da água em (x, z), com as ondas, ou `null` onde não há água. Sem esta função, vale `nivelMinimo`.
   * Onde a água passa de `AJUSTES.nado.profundidade`, o peregrino nada.
   */
  nivelAgua?(x: number, z: number): number | null;
}

/** Corações que uma queda de `altura` m tira (0 se não fere). */
export function danoDeQueda(altura: number, coracoesMax: number) {
  if (altura <= AJUSTES.queda.segura) return 0;
  if (altura >= AJUSTES.queda.fatal) return coracoesMax;
  return Math.ceil((altura - AJUSTES.queda.segura) / AJUSTES.queda.porMeio) * 0.5;
}

const FIXAS = {
  calca: 0x5b4a3a,
  meia: 0x6b5444,
  sandalia: 0x5a3a1e,
  corda: 0xd8c79a,
  cordaBranca: 0xeee8d8,
  chapeu: 0x7a5a36,
  vieira: 0xf2eee0,
  galao: 0xc9a24a,
  cajado: 0x8b6a3c,
  cabaca: 0xd89a3a,
  olho: 0x2a1a12,
};

/** Cabelo em voxels sobre a cabeça 6x6x6 (rosto em z = 5). */
function pentear(m: Modelo, vis: Visual) {
  const v = (x: number, y: number, z: number) => variar(vis.corCabelo, x, y, z, 0.05);
  const p = (x: number, y: number, z: number, hex: number | ((x: number, y: number, z: number) => number) = v) => {
    if (vis.chapeu && y >= 6) return; // o chapéu cobre o alto da cabeça
    m.ponto(x, y, z, typeof hex === 'function' ? hex(x, y, z) : hex);
  };
  const capa = () => {
    for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) p(x, 5, z);
    for (let x = 0; x < 6; x++) for (let z = 0; z < 5; z++) p(x, 4, z);
    for (let x = 0; x < 6; x++) for (let y = 1; y < 5; y++) for (let z = 0; z < 2; z++) p(x, y, z);
    for (const x of [0, 5]) for (let y = 2; y < 5; y++) for (let z = 2; z < 4; z++) p(x, y, z);
  };
  switch (vis.cabelo) {
    case 'raspado': {
      const ralo = misturar(vis.corCabelo, vis.corPele, 0.35);
      for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) p(x, 5, z, ralo);
      for (let x = 0; x < 6; x++) for (let y = 3; y < 5; y++) p(x, y, 0, ralo);
      break;
    }
    case 'curto':
      capa();
      break;
    case 'cacheado':
      capa();
      for (let x = -1; x < 7; x++)
        for (let z = -1; z < 6; z++) if ((x + z) % 2 === 0) p(x, 6, z);
      for (const x of [-1, 6]) for (let y = 2; y < 6; y++) for (let z = 0; z < 4; z++) if ((y + z) % 2 === 0) p(x, y, z);
      for (let x = 0; x < 6; x++) for (let y = 1; y < 6; y++) if ((x + y) % 2) p(x, y, -1);
      break;
    case 'crespo':
      for (let x = -1; x < 7; x++)
        for (let y = 2; y < 9; y++)
          for (let z = -2; z < 6; z++) {
            const dx = (x - 2.5) / 4.1, dy = (y - 5) / 3.4, dz = (z - 2) / 4.1;
            if (dx * dx + dy * dy + dz * dz > 1) continue;
            if (z >= 4 && y <= 4 && x >= 0 && x <= 5) continue; // rosto livre
            p(x, y, z);
          }
      break;
    case 'longo':
      capa();
      for (let x = 0; x < 6; x++) for (let y = -4; y < 5; y++) p(x, y, -1);
      for (const x of [-1, 6]) for (let y = -2; y < 5; y++) for (let z = -1; z < 3; z++) p(x, y, z);
      break;
    case 'tranca': {
      capa();
      const escuro = misturar(vis.corCabelo, 0x000000, 0.2);
      for (let y = -7; y < 3; y++) for (let x = 2; x < 4; x++) p(x, y, -1, (y + x) % 2 ? escuro : vis.corCabelo);
      p(2, -8, -1, 0xb8333a);
      p(3, -8, -1, 0xb8333a);
      break;
    }
    case 'coque':
      capa();
      for (let x = 1; x < 5; x++) for (let y = 3; y < 7; y++) for (let z = -3; z < -1; z++) if (!(x % 3 === 1 && y === 6)) p(x, y, z);
      break;
  }
}

function construirRig(vis: Visual) {
  const v = (hex: number) => (x: number, y: number, z: number) => variar(hex, x, y, z, 0.035);
  const f = vis.genero === 'f';
  const R = vis.corRoupa;
  const R2 = misturar(R, 0x1a1008, 0.3);
  const destaque = vis.roupa === 'faixa' ? (R === 0xa65448 ? FIXAS.galao : 0xb8333a) : FIXAS.galao;

  // perna em duas peças (coxa e canela) com joelho, para ajoelhar de verdade
  const perna = () => ({
    coxa: new Modelo().caixa(0, 4, 0, 3, 4, 3, v(f ? FIXAS.meia : FIXAS.calca)).malha(S, [1.5, 8, 1.5]),
    canela: new Modelo()
      .caixa(0, 2, 0, 3, 2, 3, v(f ? FIXAS.meia : FIXAS.calca))
      .caixa(0, 0, 0, 3, 2, 4, v(FIXAS.sandalia))
      .malha(S, [1.5, 4, 1.5]),
  });

  // tronco: 8 x 9 x 5, frente em z = 4
  const t = new Modelo().caixa(0, 0, 0, 8, 9, 5, v(R));
  if (f) {
    for (const x of [0, 7]) for (let y = 3; y < 6; y++) for (let z = 0; z < 5; z++) t.ponto(x, y, z, null); // cintura
    t.caixa(0, -4, 0, 8, 4, 5, v(R)); // saia longa
    t.caixa(-1, -4, -1, 10, 1, 7, v(R2));
  } else {
    t.caixa(0, -2, 0, 8, 2, 5, v(R));
  }
  const barra = f ? -4 : -2;
  switch (vis.roupa) {
    case 'tunica':
      t.caixa(f ? -1 : 0, barra, f ? -1 : 0, f ? 10 : 8, 1, f ? 7 : 5, FIXAS.galao);
      t.caixa(2, 8, 4, 4, 1, 1, FIXAS.galao);
      t.caixa(0, 2, 0, 8, 1, 5, v(FIXAS.corda));
      break;
    case 'capa':
      t.caixa(-1, 6, -1, 10, 3, 7, v(R2));
      t.caixa(3, 6, 6, 2, 2, 1, FIXAS.vieira);
      t.caixa(0, 2, 0, 8, 1, 5, v(FIXAS.corda));
      break;
    case 'veste':
      t.caixa(1, 7, -2, 6, 3, 2, v(R2)); // capuz caído nas costas
      t.caixa(0, 2, 0, 8, 1, 5, FIXAS.cordaBranca);
      t.caixa(5, -1, 5, 1, 3, 1, FIXAS.cordaBranca); // ponta do cordão franciscano
      break;
    case 'faixa':
      for (const x of [2, 5]) t.caixa(x, barra + 1, 5, 1, 9 - barra - 1, 1, destaque);
      t.caixa(2, 8, 0, 4, 1, 5, destaque);
      break;
  }
  const tronco = t.malha(S, [4, 0, 2.5]);

  const c = new Modelo().caixa(0, 0, 0, 6, 6, 6, v(vis.corPele));
  const sombraPele = misturar(vis.corPele, 0x2a1a12, 0.22);
  if (vis.idade === 'idoso') {
    c.caixa(1, 4, 5, 4, 1, 1, sombraPele); // rugas na testa
    c.ponto(0, 2, 5, sombraPele).ponto(5, 2, 5, sombraPele);
  }
  pentear(c, vis);
  c.ponto(1, 2, 5, FIXAS.olho).ponto(4, 2, 5, FIXAS.olho);
  if (f) c.ponto(1, 3, 5, FIXAS.olho).ponto(4, 3, 5, FIXAS.olho).caixa(2, 0, 5, 2, 1, 1, misturar(vis.corPele, 0xb84a4a, 0.35));
  c.caixa(2, 1, 6, 2, 1, 1, sombraPele); // nariz
  if (!f && vis.idade === 'idoso') c.caixa(0, -1, 4, 6, 2, 2, v(vis.corCabelo)).caixa(1, -2, 5, 4, 1, 1, v(vis.corCabelo)); // barba
  else if (!f && vis.idade === 'adulto') c.caixa(1, 0, 5, 4, 1, 1, misturar(vis.corCabelo, vis.corPele, 0.4));
  const cabeca = c.malha(S, [3, 0, 3]);

  const chapeu = vis.chapeu
    ? new Modelo()
        .caixa(0, 0, 0, 10, 1, 10, v(FIXAS.chapeu))
        .caixa(2, 1, 2, 6, 2, 6, v(FIXAS.chapeu))
        .caixa(4, 1, 8, 2, 2, 1, FIXAS.vieira)
        .malha(S, [5, 0, 5])
    : null;

  const braco = () =>
    new Modelo()
      .caixa(0, 2, 0, 2, 5, 2, v(vis.roupa === 'capa' ? R2 : R))
      .caixa(0, 2, 0, 2, 1, 2, vis.roupa === 'tunica' ? FIXAS.galao : v(R))
      .caixa(0, 0, 0, 2, 2, 2, v(vis.corPele))
      .malha(S, [1, 7, 1]);

  const cajado = new Modelo()
    .caixa(0, 0, 0, 1, 24, 1, v(FIXAS.cajado))
    .caixa(-1, 17, -1, 3, 3, 3, v(FIXAS.cabaca))
    .caixa(0, 20, 0, 1, 1, 1, v(FIXAS.corda))
    .malha(S, [0.5, 11, 0.5]);

  return { perna, tronco, cabeca, chapeu, braco, cajado };
}

/** Mola amortecida de um grau de liberdade: segue o alvo com atraso e balança um pouco ao parar. */
class Mola {
  x = 0;
  v = 0;
  constructor(private rigidez: number, private amortecimento: number) {}
  passo(alvo: number, dt: number) {
    // integra em subpassos para não explodir com dt grande (aba escondida, queda de quadros)
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = Math.min(dt, 0.1) / n;
    for (let i = 0; i < n; i++) {
      this.v += ((alvo - this.x) * this.rigidez - this.v * this.amortecimento) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

export type Acao = 'livre' | 'golpe' | 'luz' | 'esquiva' | 'rezando' | 'ferido' | 'carinho';

/** Duração do carinho num bicho (s). */
export const DURACAO_CARINHO = 2.2;

export class Peregrino {
  readonly raiz = new THREE.Group();
  private centro = new THREE.Group();
  private corpo = new THREE.Group();
  private pernaE: THREE.Object3D;
  private joelhoE = new THREE.Group();
  private joelhoD = new THREE.Group();
  private pernaD: THREE.Object3D;
  private bracoE: THREE.Object3D;
  private bracoD: THREE.Object3D;
  private tronco: THREE.Object3D;
  private cabeca: THREE.Object3D;
  readonly cajado: THREE.Object3D;
  /** O cajado pendurado nas costas, em diagonal (no nado, quando as mãos estão nas braçadas). */
  private cajadoCostas: THREE.Object3D;

  readonly pos = new THREE.Vector3();
  /**
   * Onde desenhar o peregrino e para onde a câmera olha: `pos` interpolada entre o passo de física anterior e o
   * atual (ver `interpolar` e `PassoFixo`). Sem interpolação, é a própria `pos`.
   */
  readonly posVisual = new THREE.Vector3();
  private posAntes = new THREE.Vector3();
  /** A posição da malha no passo anterior e no atual (com a altura suavizada), para a interpolação. */
  private raizAntes = new THREE.Vector3();
  private raizAgora = new THREE.Vector3();
  vy = 0;
  noChao = true;
  rumo = 0; // ângulo para onde olha (0 = +z)
  velocidadeHoriz = 0;
  acao: Acao = 'livre';
  /** No carinho: bicho grande (cavalo, boi…) é afagado de pé; o pequeno, agachado. */
  carinhoAlto = false;
  tempoAcao = 0;
  invulneravel = 0;
  private fase = 0;
  private yVisual = 0;
  /** 0 parado … 1 andando: sobe e desce aos poucos, para o passo começar e terminar macio. */
  private passoK = 0;
  /** Ritmo à parte para o idle (respiração), que não salta quando o passo para. */
  private respira = Math.random() * 10;
  private rumoAntes = 0;
  private inclinaCurva = 0;
  /** Agachada ao cair de um pulo (1 = queda forte), some em ~0,3 s. */
  private impacto = 0;
  /** O ponto mais alto desde que saiu do chão (m), para medir a queda. */
  private picoNoAr = 0;
  /**
   * De que altura caiu no último pouso em terra (m, do ponto mais alto do salto ao chão): o `Jogo` lê, aplica o dano
   * e zera. Cair na água funda não conta (a água freia), nem descer degraus andando.
   */
  queda = 0;
  private chapeu: THREE.Object3D | null = null;
  private molaChapeu = new Mola(160, 9);
  private molaCajado = new Mola(90, 7);
  private molaLamparina = new Mola(40, 2.6);
  private yAntes = 0;
  private dirEsquiva = new THREE.Vector3();

  /** Visual atual (gênero, idade, cores...). Trocar com `vestir()`. */
  visual: Visual;

  constructor(visual: Visual) {
    this.visual = visual;
    const quadril = 8 * S;
    const ombro = quadril + 9 * S;
    this.pernaE = new THREE.Group();
    this.pernaE.position.set(-2 * S, quadril, 0);
    this.pernaD = new THREE.Group();
    this.pernaD.position.set(2 * S, quadril, 0);
    this.joelhoE.position.y = -4 * S;
    this.joelhoD.position.y = -4 * S;
    this.pernaE.add(this.joelhoE);
    this.pernaD.add(this.joelhoD);
    this.tronco = new THREE.Group();
    this.tronco.position.set(0, quadril, 0);
    this.cabeca = new THREE.Group();
    this.cabeca.position.set(0, ombro, 0);
    this.bracoE = new THREE.Group();
    this.bracoE.position.set(-5 * S, ombro - 0.3 * S, 0);
    this.bracoD = new THREE.Group();
    this.bracoD.position.set(5 * S, ombro - 0.3 * S, 0);
    this.cajado = new THREE.Group();
    this.cajado.position.set(0, -6 * S, 0.5 * S);
    this.bracoD.add(this.cajado);
    // nas costas: atravessado do ombro direito ao quadril esquerdo, por fora da capa
    this.cajadoCostas = new THREE.Group();
    this.cajadoCostas.position.set(0, 4.5 * S, -4.2 * S);
    this.cajadoCostas.rotation.set(0, 0, -0.75);
    this.cajadoCostas.visible = false;
    this.tronco.add(this.cajadoCostas);
    this.corpo.add(this.pernaE, this.pernaD, this.tronco, this.cabeca, this.bracoE, this.bracoD);
    this.centro.position.y = 0.85;
    this.corpo.position.y = -0.85;
    this.centro.add(this.corpo);
    this.raiz.add(this.centro);
    this.vestir(visual);
  }

  /** Remonta as peças do boneco com outro visual, sem mexer nas articulações nem na pose. */
  vestir(visual: Visual) {
    this.visual = visual;
    const r = construirRig(visual);
    const trocar = (junta: THREE.Object3D, ...malhas: (THREE.Mesh | null)[]) => {
      for (const filho of [...junta.children]) {
        if (filho === this.cajado || filho === this.cajadoCostas || filho === this.lamparina || filho === this.joelhoE || filho === this.joelhoD) continue;
        if ((filho as THREE.Mesh).isMesh) (filho as THREE.Mesh).geometry.dispose();
        junta.remove(filho);
      }
      for (const m of malhas) if (m) junta.add(m);
    };
    const pE = r.perna(), pD = r.perna();
    trocar(this.pernaE, pE.coxa);
    trocar(this.joelhoE, pE.canela);
    trocar(this.pernaD, pD.coxa);
    trocar(this.joelhoD, pD.canela);
    trocar(this.tronco, r.tronco);
    if (r.chapeu) r.chapeu.position.set(0, 6 * S, 0);
    this.chapeu = r.chapeu;
    trocar(this.cabeca, r.cabeca, r.chapeu);
    trocar(this.bracoE, r.braco());
    trocar(this.bracoD, r.braco());
    trocar(this.cajado, r.cajado);
    trocar(this.cajadoCostas, new THREE.Mesh(r.cajado.geometry.clone(), r.cajado.material));
    this.raiz.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private lamparina: THREE.Group | null = null;
  private luzLamparina: THREE.PointLight | null = null;

  /** Mostra a Lamparina da Fé na mão esquerda; acesa, ela ilumina em volta. */
  segurarLamparina(visivel: boolean, acesa: boolean) {
    if (visivel && !this.lamparina) {
      this.lamparina = lamparinaModelo(0.045);
      this.lamparina.position.set(0, -9.5 * S, 0.6 * S);
      this.luzLamparina = new THREE.PointLight(0xffd88a, 0, 13, 1.3);
      this.luzLamparina.position.y = 0.15;
      this.lamparina.add(this.luzLamparina);
      this.bracoE.add(this.lamparina);
    }
    if (this.lamparina) this.lamparina.visible = visivel;
    if (this.luzLamparina) this.luzLamparina.intensity = visivel && acesa ? 9 : 0;
  }

  /** Força do pulo (1 = normal, 0 = não pula): o ouro da Gula e as pedras de São Damião pesam. */
  forcaPulo = 1;
  private saco: THREE.Mesh | null = null;
  private carga: THREE.Object3D | null = null;
  /** A carga vai nas costas (alguém carregado): os braços seguram as pernas atrás e o cajado fica guardado. */
  private cargaNasCostas = false;

  /** O saco de ouro pendurado na cintura, maior quanto mais pesa (0 esconde). */
  mostrarPeso(n: number) {
    if (n > 0 && !this.saco) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3 * S, 3.4 * S, 2.6 * S), new THREE.MeshLambertMaterial({ color: 0x8a6a3a, emissive: 0x2a1a04 }));
      const ouro = new THREE.Mesh(new THREE.BoxGeometry(2 * S, 0.8 * S, 1.6 * S), new THREE.MeshLambertMaterial({ color: 0xe8c050, emissive: 0x6a4a08 }));
      ouro.position.y = 2 * S;
      m.add(ouro);
      m.castShadow = true;
      this.saco = m;
      this.corpo.add(m);
    }
    if (!this.saco) return;
    this.saco.visible = n > 0;
    const k = 0.8 + Math.min(n, 6) * 0.14;
    this.saco.scale.setScalar(k);
    this.saco.position.set(-4.6 * S, 7.2 * S - 1.7 * S * k, 0.8 * S);
  }

  /**
   * Leva um objeto no ombro (a pedra de São Damião) ou alguém nas costas (os enfermos da Bahia); `null` larga.
   */
  /** Velocidade vinda de fora (m/s), que se desfaz sozinha: a onda que varre o convés do navio. */
  readonly empurrao = new THREE.Vector3();

  carregar(obj: THREE.Object3D | null, lugar: 'ombro' | 'costas' = 'ombro') {
    if (this.carga) this.corpo.remove(this.carga);
    this.carga = obj;
    this.cargaNasCostas = !!obj && lugar === 'costas';
    this.cajado.visible = !this.cargaNasCostas;
    if (obj) {
      if (lugar === 'ombro') obj.position.set(5.2 * S, 18.6 * S, -0.6 * S);
      else obj.position.set(0, 0, 0); // quem vai nas costas já vem posto (Enfermos.nasCostas)
      this.corpo.add(obj);
    }
  }

  get carregando() {
    return this.carga !== null;
  }

  /**
   * De joelhos (Temor de Deus: fazer-se pequeno). O peregrino anda devagar sobre os joelhos, de mãos postas e
   * curvado, como os romeiros nos santuários; não pula. É assim que se passa pela porta estreita (Mt 7,13).
   */
  ajoelhado = false;
  /** 0 em pé … 1 de joelhos: a pose desce e sobe aos poucos. */
  private joelhosK = 0;

  /**
   * Nadando: a água passa de `AJUSTES.nado.profundidade`. O peregrino boia com a onda, sem pulo nem cajado na mão (o cajado
   * vai pendurado nas costas); parado, fica de pé na água batendo as pernas; andando, nada de peito.
   */
  nadando = false;
  /** A superfície da água debaixo do peregrino (ou `null` em terra seca). */
  superficie: number | null = null;
  /** 0 boiando parado … 1 nadando: a pose deita aos poucos. */
  private nadoK = 0;
  /** Entrou na água fundo agora (para o respingo): vira false depois de lido. */
  mergulhou = false;
  /** 0 fora … 1 dentro da água funda (a pose de nado entra aos poucos) e o ritmo da braçada. */
  private aguaK = 0;
  private bracada = 0;

  /**
   * No barco: sentado no banco da popa, a mão do cajado na cana do leme e a outra na escota (o cajado vai nas
   * costas). `null` fora do barco. Quem prende o boneco ao casco (que arfa e aderna) é o `Jogo`.
   */
  timoneiro: Timoneiro | null = null;
  /** 0 de pé … 1 sentado ao leme (a pose entra aos poucos). */
  private sentadoK = 0;

  /** O idoso anda mais devagar. */
  get fatorVelocidade() {
    return this.visual.idade === 'idoso' ? 0.82 : 1;
  }

  /** Ponto do alto do cajado, para onde sai a luz. */
  pontaDoCajado(destino = new THREE.Vector3()) {
    return this.cajado.localToWorld(destino.set(0, 13 * S, 0));
  }

  frente(destino = new THREE.Vector3()) {
    return destino.set(Math.sin(this.rumo), 0, Math.cos(this.rumo));
  }

  teleportar(x: number, y: number, z: number) {
    this.pos.set(x, y, z);
    // sem rastro: o passo anterior também fica no destino
    this.posAntes.set(x, y, z);
    this.posVisual.set(x, y, z);
    this.raizAntes.set(x, y, z);
    this.raizAgora.set(x, y, z);
    this.raiz.position.set(x, y, z);
    this.yVisual = y;
    this.vy = 0;
    this.picoNoAr = y;
    this.queda = 0;
  }

  /**
   * Desenha o peregrino a uma fração `k` (0 a 1) do caminho entre o passo de física anterior e o atual, para o
   * movimento não tremer quando a tela roda mais quadros por segundo que a física (60 passos por segundo).
   */
  interpolar(k: number) {
    this.raiz.position.lerpVectors(this.raizAntes, this.raizAgora, k);
    this.posVisual.lerpVectors(this.posAntes, this.pos, k);
  }

  iniciar(acao: Acao, dir?: THREE.Vector3) {
    this.acao = acao;
    this.tempoAcao = 0;
    if (acao === 'esquiva') {
      this.dirEsquiva.copy(dir && dir.lengthSq() > 0 ? dir : this.frente().multiplyScalar(-1)).normalize();
      this.invulneravel = 0.5;
    }
  }

  /**
   * Move o peregrino. `desejo` é a direção no mundo (comprimento 0..1).
   * `olharPara` (opcional) mantém o rosto virado para o alvo travado.
   */
  atualizar(dt: number, fis: Fisica, desejo: THREE.Vector3, velocidade: number, pular: boolean, olharPara: THREE.Vector3 | null) {
    this.posAntes.copy(this.pos);
    this.raizAntes.copy(this.raizAgora);
    this.tempoAcao += dt;
    this.invulneravel = Math.max(0, this.invulneravel - dt);

    let vx = 0, vz = 0;
    const travadoNaAcao = this.acao === 'rezando' || this.acao === 'luz' || this.acao === 'ferido' || this.acao === 'carinho';
    if (this.acao === 'esquiva') {
      const P = AJUSTES.peregrino;
      const k = Math.max(0, 1 - this.tempoAcao / P.esquivaDuracao);
      vx = this.dirEsquiva.x * P.esquivaVelocidade * (0.4 + k);
      vz = this.dirEsquiva.z * P.esquivaVelocidade * (0.4 + k);
      if (this.tempoAcao > P.esquivaDuracao) this.acao = 'livre';
    } else if (!travadoNaAcao) {
      const fator = this.acao === 'golpe' ? AJUSTES.peregrino.lentidaoNoGolpe : 1;
      vx = desejo.x * velocidade * fator;
      vz = desejo.z * velocidade * fator;
    }
    if (this.acao === 'golpe' && this.tempoAcao > AJUSTES.peregrino.golpeDuracao) this.acao = 'livre';
    if (this.acao === 'luz' && this.tempoAcao > AJUSTES.peregrino.luzDuracao) this.acao = 'livre';
    if (this.acao === 'ferido' && this.tempoAcao > AJUSTES.peregrino.feridoDuracao) this.acao = 'livre';
    if (this.acao === 'carinho' && this.tempoAcao > DURACAO_CARINHO) this.acao = 'livre';

    // na água: vadeando, mais devagar; nadando, bem mais devagar (correr vira nadar com força)
    const agua = fis.nivelAgua ? fis.nivelAgua(this.pos.x, this.pos.z) : fis.nivelMinimo ?? null;
    if (this.nadando) {
      vx *= 0.5;
      vz *= 0.5;
    } else if (agua !== null && this.pos.y < agua - 0.3) {
      vx *= 0.55;
      vz *= 0.55;
    }

    // um empurrão de fora (a onda que varre o convés): passa pela mesma física, e as paredes o param
    vx += this.empurrao.x;
    vz += this.empurrao.z;
    this.empurrao.multiplyScalar(Math.max(0, 1 - dt * 2.2));
    this.velocidadeHoriz = Math.hypot(vx, vz);

    // movimento por eixo, com degrau de até 1 bloco. Nadando, sobe-se à margem que fique até 0,6 m acima da água.
    const raio = AJUSTES.peregrino.raio;
    const base = this.nadando && this.superficie !== null ? Math.max(this.pos.y, this.superficie - 0.45) : this.pos.y;
    const tentar = (dx: number, dz: number) => {
      const nx = this.pos.x + dx, nz = this.pos.z + dz;
      const h = Math.max(
        fis.altura(nx + Math.sign(dx) * raio, nz + Math.sign(dz) * raio),
        fis.altura(nx, nz),
      );
      if (h > base + AJUSTES.peregrino.degrau) return; // parede
      this.pos.x = nx;
      this.pos.z = nz;
    };
    tentar(vx * dt, 0);
    tentar(0, vz * dt);
    fis.colidir(this.pos, raio);

    // água funda: nada, boiando com a onda (a margem baixa é chão: lá ele sai andando)
    const chao = fis.altura(this.pos.x, this.pos.z);
    this.superficie = fis.nivelAgua ? fis.nivelAgua(this.pos.x, this.pos.z) : fis.nivelMinimo ?? null;
    const fundo = this.superficie !== null && this.superficie - chao > AJUSTES.nado.profundidade;
    // entra no nado quando o corpo chega à água funda (caindo de um pulo, só quando bate na água)
    const entrar = fundo && this.pos.y <= this.superficie! - AJUSTES.nado.afundaNadando + 0.2;
    if (fundo && (this.nadando || entrar)) {
      this.picoNoAr = this.pos.y;
      if (!this.nadando) {
        this.nadando = true;
        this.mergulhou = this.vy < -3 || this.velocidadeHoriz > 1;
        this.ajoelhado = false;
      }
      this.nadoK += ((this.velocidadeHoriz > 0.3 ? 1 : 0) - this.nadoK) * Math.min(1, dt * 3);
      const alvo = this.superficie! - (AJUSTES.nado.afundaParado + (AJUSTES.nado.afundaNadando - AJUSTES.nado.afundaParado) * this.nadoK);
      // a queda é freada pela água e o corpo volta à tona aos poucos
      this.vy = this.vy * Math.max(0, 1 - dt * 6) + (alvo - this.pos.y) * dt * 30;
      this.pos.y += this.vy * dt;
      this.pos.y = Math.max(this.pos.y, chao);
      this.noChao = false;
      this.rumoPorDesejo(olharPara, vx, vz, dt);
      this.animar(dt);
      return;
    }
    this.nadando = false;
    this.nadoK = 0;

    // gravidade e pulo
    if (pular && this.noChao && !travadoNaAcao && !this.ajoelhado && this.acao !== 'esquiva' && this.forcaPulo > 0) {
      this.vy = AJUSTES.peregrino.pulo * this.forcaPulo;
      this.noChao = false;
    }
    this.vy -= AJUSTES.peregrino.gravidade * dt;
    this.pos.y += this.vy * dt;
    this.picoNoAr = this.noChao ? this.pos.y : Math.max(this.picoNoAr, this.pos.y);
    if (this.pos.y <= chao) {
      // degrau: sobe direto se estava no chão; vindo do ar, agacha conforme a força da queda
      if (!this.noChao && this.vy < -4) this.impacto = Math.max(this.impacto, Math.min(1, -this.vy / 16));
      if (!this.noChao) this.queda = Math.max(this.queda, this.picoNoAr - chao);
      this.picoNoAr = chao;
      this.pos.y = chao;
      this.vy = 0;
      this.noChao = true;
    } else if (this.noChao && this.pos.y - chao < AJUSTES.peregrino.degrau && this.vy <= 0) {
      this.pos.y = chao; // desce degraus sem "voar"
      this.vy = 0;
    } else {
      this.noChao = this.pos.y - chao < 0.02;
    }

    this.rumoPorDesejo(olharPara, vx, vz, dt);
    this.animar(dt);
  }

  /** Vira o rosto para o alvo travado ou para onde anda. */
  private rumoPorDesejo(olharPara: THREE.Vector3 | null, vx: number, vz: number, dt: number) {
    if (olharPara && this.acao !== 'esquiva') {
      const alvo = Math.atan2(olharPara.x - this.pos.x, olharPara.z - this.pos.z);
      this.rumo = girarPara(this.rumo, alvo, dt * 14);
    } else if (this.velocidadeHoriz > 0.1 && this.acao !== 'esquiva') {
      this.rumo = girarPara(this.rumo, Math.atan2(vx, vz), dt * (this.nadando ? 5 : 12));
    }
  }

  private animar(dt: number) {
    const andando = this.velocidadeHoriz > 0.2 && this.noChao;
    // o passo acompanha o chão percorrido; a amplitude entra e sai aos poucos
    const alvoPasso = andando ? Math.min(1, this.velocidadeHoriz / 5) : 0;
    this.passoK += (alvoPasso - this.passoK) * Math.min(1, dt * (alvoPasso > this.passoK ? 8 : 6));
    if (this.passoK > 0.02) this.fase += dt * Math.max(this.velocidadeHoriz, 1.2) * 2.3;
    this.respira += dt;
    const balanco = this.passoK * (this.visual.idade === 'idoso' ? 0.7 : 1);
    const s = Math.sin(this.fase);
    // curva: o corpo inclina para dentro, proporcional ao giro e à velocidade
    let giro = this.rumo - this.rumoAntes;
    while (giro > Math.PI) giro -= Math.PI * 2;
    while (giro < -Math.PI) giro += Math.PI * 2;
    this.rumoAntes = this.rumo;
    const alvoCurva = dt > 0 ? Math.max(-0.18, Math.min(0.18, (giro / dt) * 0.035 * this.passoK)) : 0;
    this.inclinaCurva += (alvoCurva - this.inclinaCurva) * Math.min(1, dt * 6);
    this.impacto = Math.max(0, this.impacto - dt * 3.2);
    const subida = dt > 0 ? (this.yVisual - this.yAntes) / dt : 0;
    this.yAntes = this.yVisual;

    this.yVisual += (this.pos.y - this.yVisual) * Math.min(1, dt * 18);
    this.raiz.position.set(this.pos.x, this.yVisual, this.pos.z);
    this.raizAgora.copy(this.raiz.position);
    this.posVisual.copy(this.pos);
    this.raiz.rotation.set(0, this.rumo, 0);

    // pose base
    let pE = s * 0.8 * balanco, pD = -s * 0.8 * balanco;
    let bE = -s * 0.6 * balanco, bD = s * 0.5 * balanco - 0.15;
    let bEz = 0.08, bDz = -0.08;
    let corpoY = Math.abs(Math.cos(this.fase)) * 0.06 * balanco;
    const idoso = this.visual.idade === 'idoso';
    let corpoRx = idoso ? 0.13 : 0;
    let cabecaRx = idoso ? -0.12 : 0;
    let cajadoRx = 0.15;
    // joelho: dobra só para trás; ao andar, dobra um pouco na perna que vai à frente
    let jE = Math.max(0, s) * 0.7 * balanco, jD = Math.max(0, -s) * 0.7 * balanco;

    if (!this.noChao) {
      pE = -0.6;
      pD = 0.3;
      jE = 0.8;
      jD = 0.5;
      bE = -0.9;
      bD = -0.5;
    }
    // correndo, o corpo vai à frente; o quadril gira um pouco a cada passo e a cabeça compensa
    corpoRx += balanco * 0.1;
    let corpoRy = s * 0.07 * balanco;
    let cabecaRy = -corpoRy * 0.7;
    if (this.acao === 'livre' && this.noChao) {
      // parado: respira (o peito sobe e desce), troca o peso de perna e às vezes olha em volta
      const parado = 1 - balanco;
      const r = this.respira;
      corpoY += Math.sin(r * 1.7) * 0.012 * parado;
      bE += Math.sin(r * 1.7 - 0.6) * 0.04 * parado;
      bD += Math.sin(r * 1.7 - 0.9) * 0.025 * parado;
      const peso = Math.sin(r * 0.37) * parado;
      pE += Math.max(0, peso) * 0.06;
      jE += Math.max(0, peso) * 0.12;
      pD += Math.max(0, -peso) * 0.06;
      jD += Math.max(0, -peso) * 0.12;
      corpoY -= Math.abs(peso) * 0.012;
      const olhada = Math.floor(r / 3.2);
      cabecaRy += Math.sin(olhada * 7331) * 0.35 * parado * (Math.sin(olhada * 1337) > 0.2 ? 1 : 0);
    }
    if (this.impacto > 0 && this.noChao) {
      const k = Math.sin(Math.min(1, this.impacto) * Math.PI * 0.5);
      corpoY -= k * 0.16;
      pE -= k * 0.55;
      pD -= k * 0.55;
      jE += k * 1.0;
      jD += k * 1.0;
      bE -= k * 0.35;
      corpoRx += k * 0.12;
    }

    // nadando: parado, de pé na água pedalando e remando com as mãos; andando, deitado em nado de peito (os braços
    // vão à frente juntos e abrem para os lados, as pernas encolhem e chutam). O cajado vai pendurado nas costas.
    this.aguaK += ((this.nadando ? 1 : 0) - this.aguaK) * Math.min(1, dt * 5);
    if (this.nadando) this.bracada += dt * (1.6 + this.velocidadeHoriz * 0.8);
    if (this.aguaK > 0.01) {
      const a = this.aguaK, n = this.nadoK, c = this.bracada * 2.2;
      const mistura = (de: number, para: number) => de + (para - de) * a;
      const entre = (boiando: number, nado: number) => boiando + (nado - boiando) * n;
      const abre = Math.max(0, Math.sin(c)); // os braços abrem para os lados
      const chute = Math.max(0, Math.sin(c + Math.PI * 0.6)); // as pernas chutam logo depois
      pE = mistura(pE, entre(Math.sin(c * 0.7) * 0.4, 0.15 + chute * 0.35));
      pD = mistura(pD, entre(-Math.sin(c * 0.7) * 0.4, 0.15 + chute * 0.35));
      jE = mistura(jE, entre(0.5 + Math.max(0, Math.sin(c * 0.7)) * 0.5, 0.25 + (1 - chute) * 0.9));
      jD = mistura(jD, entre(0.5 + Math.max(0, -Math.sin(c * 0.7)) * 0.5, 0.25 + (1 - chute) * 0.9));
      bE = mistura(bE, entre(-0.55 + Math.sin(c) * 0.12, -2.75 + abre * 0.85));
      bD = mistura(bD, entre(-0.55 - Math.sin(c) * 0.12, -2.75 + abre * 0.85));
      bEz = mistura(bEz, entre(-0.35 + Math.sin(c) * 0.25, -abre * 0.7));
      bDz = mistura(bDz, entre(0.35 - Math.sin(c) * 0.25, abre * 0.7));
      corpoRx = mistura(corpoRx, entre(0.12, 1.3));
      corpoRy *= 1 - a;
      corpoY = mistura(corpoY, Math.sin(c * 0.7) * 0.03);
      cabecaRx = mistura(cabecaRx, entre(0, -1.0)); // deitado, ergue a cabeça para ver aonde vai
    }
    // ao leme: sentado no banco, as coxas para a frente e as canelas para baixo; a mão direita segue a cana do leme,
    // a esquerda segura a escota e dá um puxão de vez em quando; o corpo pende contra o adernamento e a cabeça às
    // vezes sobe para a vela
    let contrapeso = 0;
    const tim = this.timoneiro;
    this.sentadoK += ((tim ? 1 : 0) - this.sentadoK) * Math.min(1, dt * 6);
    if (this.sentadoK > 0.01) {
      const k = this.sentadoK;
      const mistura = (de: number, para: number) => de + (para - de) * k;
      const leme = tim?.leme ?? 0, puxa = (tim?.escota ?? 0) * (0.5 + 0.5 * Math.sin(this.respira * 0.9));
      pE = mistura(pE, -1.42);
      pD = mistura(pD, -1.38);
      jE = mistura(jE, 1.25);
      jD = mistura(jD, 1.32);
      corpoY = mistura(corpoY, -0.2 + Math.sin(this.respira * 1.7) * 0.008);
      corpoRx = mistura(corpoRx, 0.06 + puxa * 0.05);
      corpoRy = mistura(corpoRy, -leme * 0.12);
      bD = mistura(bD, -0.42 + Math.abs(leme) * 0.08);
      bDz = mistura(bDz, -0.05 + leme * 0.55);
      bE = mistura(bE, -0.6 - puxa * 0.22);
      bEz = mistura(bEz, 0.32);
      const olha = tim?.olharVela ?? 0;
      cabecaRx = mistura(cabecaRx, -0.42 * olha);
      cabecaRy = mistura(cabecaRy, olha * 0.5 * (tim?.ladoVela ?? 1) - leme * 0.15);
      contrapeso = -(tim?.aderna ?? 0) * 0.6 * k;
    }

    // no nado e ao leme o cajado sai da mão e vai para as costas (com alguém carregado, as costas são da carga)
    const costas = this.aguaK >= 0.5 || this.sentadoK >= 0.5;
    this.cajado.visible = !this.cargaNasCostas && !costas;
    this.cajadoCostas.visible = !this.cargaNasCostas && costas;

    // de joelhos: as coxas quase retas, as canelas deitadas para trás, o corpo curvado e as mãos postas; a cada
    // passo um joelho vai à frente e o quadril balança
    const alvoJoelhos = this.ajoelhado && this.acao === 'livre' ? 1 : 0;
    this.joelhosK += (alvoJoelhos - this.joelhosK) * Math.min(1, dt * 7);
    if (this.joelhosK > 0.01 && this.acao === 'livre') {
      const k = this.joelhosK;
      const passo = Math.sin(this.fase * 0.8) * this.passoK;
      const mistura = (a: number, b: number) => a + (b - a) * k;
      pE = mistura(pE, -0.12 + passo * 0.22);
      pD = mistura(pD, -0.12 - passo * 0.22);
      jE = mistura(jE, 1.57);
      jD = mistura(jD, 1.57);
      corpoY = mistura(corpoY, -4 * S + Math.abs(passo) * 0.02);
      corpoRx = mistura(corpoRx, 0.5);
      corpoRy += passo * 0.1 * k;
      bE = mistura(bE, -0.95);
      bD = mistura(bD, -0.95);
      bEz = mistura(bEz, 0.42);
      bDz = mistura(bDz, -0.42);
      cabecaRx = mistura(cabecaRx, -0.25); // a cabeça levanta um pouco para ver o caminho
      cajadoRx = mistura(cajadoRx, 1.15);
    }

    if (this.cargaNasCostas && this.acao === 'livre') {
      // as mãos para trás, segurando as pernas de quem vai nas costas; o corpo um pouco curvado sob o peso
      bE = 0.55 + bE * 0.3;
      bD = 0.55 + bD * 0.3;
      bEz = 0.12;
      bDz = -0.12;
      corpoRx += 0.1;
    }
    const t = this.tempoAcao;
    switch (this.acao) {
      case 'golpe': {
        const k = Math.min(1, t / 0.32);
        // ergue e desce o cajado num arco
        bD = k < 0.35 ? -2.6 * (k / 0.35) : -2.6 + (k - 0.35) / 0.65 * 3.3;
        cajadoRx = 0.15 + (k < 0.35 ? 0 : 0.6);
        corpoRx = k < 0.35 ? -0.05 : 0.15;
        break;
      }
      case 'luz':
        bD = -1.5;
        bE = -1.3;
        bEz = 0.3;
        bDz = -0.3;
        cajadoRx = 1.3;
        break;
      case 'rezando': {
        // ajoelhado nos dois joelhos: coxas retas, canelas deitadas para trás, mãos postas e cabeça inclinada
        const k = Math.min(1, t / 0.35);
        pE = pD = -0.05 * k;
        jE = jD = 1.57 * k;
        corpoY = -4 * S * k;
        bE = bD = -0.95;
        bEz = 0.42;
        bDz = -0.42;
        cabecaRx = 0.4 * k;
        cajadoRx = 1.15; // o cajado fica apoiado, inclinado para a frente
        break;
      }
      case 'esquiva':
        corpoRx = Math.min(1, t / 0.45) * Math.PI * 2;
        pE = pD = -1.2;
        jE = jD = 1.8;
        bE = bD = -1.2;
        break;
      case 'carinho': {
        // a mão esquerda afaga o bicho, indo e voltando; a direita segura o cajado de lado
        const k = Math.min(1, t / 0.3) * Math.min(1, (DURACAO_CARINHO - t) / 0.3);
        const afago = Math.sin(t * 7) * 0.22 * k;
        if (this.carinhoAlto) {
          bE = (-1.45 + afago) * k;
          bEz = 0.15 * k;
          cabecaRx = 0.1 * k;
        } else {
          // agachado num joelho, inclinado para a frente
          pE = -1.25 * k;
          jE = 1.35 * k;
          pD = 0.15 * k;
          jD = 1.65 * k;
          corpoY = -4 * S * k;
          corpoRx = 0.28 * k;
          bE = (-1.05 + afago) * k;
          bEz = (0.1 + Math.sin(t * 3.5) * 0.08) * k;
          cabecaRx = 0.3 * k;
        }
        bD = -0.15 * k;
        cajadoRx = 0.2 * k;
        break;
      }
      case 'ferido':
        corpoRx = -0.3;
        bE = bD = -0.6;
        break;
    }

    const suav = Math.min(1, dt * 16);
    const lerp = (o: THREE.Object3D, eixo: 'x' | 'z', v: number) => (o.rotation[eixo] += (v - o.rotation[eixo]) * suav);
    lerp(this.pernaE, 'x', pE);
    lerp(this.pernaD, 'x', pD);
    lerp(this.joelhoE, 'x', jE);
    lerp(this.joelhoD, 'x', jD);
    lerp(this.bracoE, 'x', bE);
    lerp(this.bracoD, 'x', bD);
    lerp(this.bracoE, 'z', bEz);
    lerp(this.bracoD, 'z', bDz);
    lerp(this.cabeca, 'x', cabecaRx);
    this.cabeca.rotation.y += (cabecaRy - this.cabeca.rotation.y) * Math.min(1, dt * 5);
    this.corpo.rotation.y += (corpoRy - this.corpo.rotation.y) * suav;
    this.centro.rotation.z = this.acao === 'esquiva' ? 0 : -this.inclinaCurva + contrapeso;
    // movimento secundário: o cajado acompanha a mão com atraso, o chapéu balança no passo e na queda,
    // a lamparina pende como pêndulo (fica de pé enquanto o braço balança)
    this.cajado.rotation.x = this.molaCajado.passo(cajadoRx, dt);
    if (this.chapeu) {
      const alvo = -balanco * 0.06 + Math.sin(this.fase * 2) * 0.025 * balanco - Math.max(-6, Math.min(6, subida)) * 0.012;
      this.chapeu.rotation.x = this.molaChapeu.passo(alvo, dt);
    }
    if (this.lamparina) this.lamparina.rotation.x = this.molaLamparina.passo(-this.bracoE.rotation.x - this.centro.rotation.x, dt);
    if (this.acao === 'esquiva') {
      this.centro.rotation.x = corpoRx;
      this.corpo.position.y = -0.85 - 0.3 + 0.3 * Math.cos(Math.min(1, t / 0.45) * Math.PI * 2);
    } else {
      if (this.centro.rotation.x > Math.PI) this.centro.rotation.x -= Math.PI * 2;
      this.centro.rotation.x += (corpoRx - this.centro.rotation.x) * suav;
      this.corpo.position.y += (-0.85 + corpoY - this.corpo.position.y) * suav;
    }
  }
}

export function girarPara(atual: number, alvo: number, passo: number) {
  let d = alvo - atual;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return atual + Math.max(-passo, Math.min(passo, d));
}
