import * as THREE from 'three';
import { carregarVox, geometriaVox } from '../voxel/Vox';
import { materialVoxel } from '../voxel/Malha';
import { anatomia, type Anatomia, type IdEspecie } from './Especies';

/**
 * Esqueletos e animações dos bichos, portados do Veloren (`voxygen/anim/src/<corpo>/{idle,run,feed,fly}.rs`,
 * GPL-3.0): cada osso fica onde o `SkeletonAttr` da espécie manda, cada peça .vox entra com o deslocamento do
 * manifesto, e as poses usam as mesmas fórmulas de lá. Como no Veloren, a pose calculada é um alvo: os ossos
 * se aproximam dele a cada quadro, e é isso que deixa macias as trocas entre animações.
 *
 * Os ossos vivem no espaço do Veloren (x direita, y frente, z cima). Só a raiz converte para o Three
 * (y cima, frente em +z), então as rotações podem ser escritas como no código original.
 */
const BASE = 'assets/veloren/fauna/';
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const qa = new THREE.Quaternion();

/** O que o comportamento pede ao corpo; o corpo escolhe a animação do Veloren que corresponde. */
export interface Pose {
  /** Velocidade horizontal de verdade (m/s). */
  vel: number;
  /** Giro do rumo (rad/s), para inclinar na curva. */
  giro: number;
  /** Velocidade vertical (m/s): sobe/desce morro, decola. */
  subida: number;
  /** Pastando ou ciscando. */
  comer: boolean;
  /** No ar. */
  voar: boolean;
  /** No ar, batendo asas (falso: planando). */
  bater: boolean;
  /** Virar a cabeça para um lado (rad), somado ao olhar da animação (o carinho usa). */
  olhar: number;
}

const geometrias = new Map<string, Promise<THREE.BufferGeometry>>();
function geometria(arquivo: string, desloc: [number, number, number], espelhar: boolean, indice = 0) {
  const chave = `${arquivo}#${indice}|${espelhar ? 'e' : 'd'}|${desloc.join(',')}`;
  let g = geometrias.get(chave);
  if (!g) {
    g = carregarVox(BASE + arquivo, indice).then((m) => geometriaVox(m, { escala: 1, deslocamento: desloc, espelhar }));
    geometrias.set(chave, g);
  }
  return g;
}

type Par = [number, number];
type Trio = [number, number, number];

export abstract class Corpo {
  /** Já no espaço do Three, com a frente em +z. */
  readonly raiz = new THREE.Group();
  protected readonly base = new THREE.Group();
  protected readonly ossos: Record<string, THREE.Object3D> = {};
  /** Escala do Veloren (scaler / 11 ou / 8) já aplicada na base. */
  readonly escala: number;
  /** Animação em curso e há quanto tempo (o `anim_time` do Veloren, que zera a cada troca). */
  private anim: Animacao | null = null;
  protected tAnim = 0;
  /** O `global_time` do Veloren; começa sorteado para os bichos não olharem todos juntos. */
  protected tGlobal = Math.random() * 100;
  /** Distância andada (o `acc_vel` do Veloren): o passo acompanha o chão, sem patinar. */
  protected acc = Math.random() * 10;
  private alvoP: Record<string, THREE.Vector3> = {};
  private alvoQ: Record<string, THREE.Quaternion> = {};
  private alvoS: Record<string, number> = {};
  private primeiro = true;

  constructor(protected readonly a: Anatomia) {
    this.base.rotation.x = -Math.PI / 2; // Veloren (z cima) → Three (y cima)
    const virar = new THREE.Group();
    virar.rotation.y = Math.PI; // o Veloren olha para +y, que virou −z; aqui a frente é +z
    virar.add(this.base);
    this.raiz.add(virar);
    this.escala = this.escalaBase();
    this.base.scale.setScalar(this.escala);
  }

  protected abstract escalaBase(): number;
  /** Ossos e hierarquia (sem malhas). */
  protected abstract esqueleto(): void;
  /** Qual animação do Veloren vale para esta pose. */
  protected abstract escolher(p: Pose): Animacao;
  /** Escreve a pose-alvo de cada osso (com P, R e S), como as funções `update_skeleton` do Veloren. */
  protected abstract calcular(anim: Animacao, p: Pose): void;

  protected n(chave: string, padrao = 0): number {
    const v = this.a.attr[chave];
    return typeof v === 'number' ? v : padrao;
  }
  protected par(chave: string): Par {
    const v = this.a.attr[chave];
    return Array.isArray(v) ? [Number(v[0]), Number(v[1])] : [0, 0];
  }
  protected trio(chave: string): Trio {
    const v = this.a.attr[chave];
    return Array.isArray(v) ? [Number(v[0]), Number(v[1]), Number(v[2])] : [0, 0, 0];
  }

  protected osso(nome: string, pai: THREE.Object3D) {
    const o = new THREE.Object3D();
    o.name = nome;
    pai.add(o);
    this.ossos[nome] = o;
    this.alvoP[nome] = new THREE.Vector3();
    this.alvoQ[nome] = new THREE.Quaternion();
    this.alvoS[nome] = 1;
    return o;
  }

  /** Veste cada osso com a peça .vox do manifesto. */
  async montar(sombra: boolean) {
    this.esqueleto();
    await Promise.all(
      Object.entries(this.a.pecas).map(async ([nome, p]) => {
        const osso = this.ossos[nome];
        if (!osso) return;
        const m = new THREE.Mesh(await geometria(p.arquivo, p.desloc, p.espelhar, p.indice), materialVoxel);
        m.rotation.x = Math.PI / 2; // a geometria vem no espaço do Three; o osso está no do Veloren
        m.castShadow = sombra;
        m.receiveShadow = true;
        osso.add(m);
      }),
    );
    this.posar(0, POSE_PARADA);
    return this;
  }

  /**
   * Um quadro: escolhe a animação, calcula a pose-alvo e aproxima cada osso dela, como o `interpolate` do
   * Veloren (fator 15·dt). É isso que deixa as trocas (andar → parar → pastar) macias.
   */
  posar(dt: number, p: Pose) {
    const anim = this.escolher(p);
    if (anim !== this.anim) {
      this.anim = anim;
      this.tAnim = 0;
    }
    this.tAnim += dt;
    this.tGlobal += dt;
    this.acc += p.vel * dt;
    for (const k in this.alvoS) this.alvoS[k] = 1;
    this.calcular(anim, p);
    const k = this.primeiro ? 1 : Math.min(1, dt * 15);
    this.primeiro = false;
    for (const nome in this.ossos) {
      const o = this.ossos[nome];
      o.position.lerp(this.alvoP[nome], k);
      o.quaternion.slerp(this.alvoQ[nome], k);
      o.scale.setScalar(o.scale.x + (this.alvoS[nome] - o.scale.x) * k);
    }
  }

  /** Posição-alvo do osso. */
  protected P(nome: string, x: number, y: number, z: number) {
    this.alvoP[nome].set(x, y, z);
  }
  /** Rotação-alvo: produto das rotações na ordem dada, como `Quaternion::rotation_x(a) * rotation_z(b)`. */
  protected R(nome: string, ...giros: [Eixo, number][]) {
    const q = this.alvoQ[nome].identity();
    for (const [e, ang] of giros) q.multiply(qa.setFromAxisAngle(e === 'x' ? X : e === 'y' ? Y : Z, ang));
  }
  /** Escala-alvo (volta a 1 a cada quadro). */
  protected S(nome: string, s: number) {
    this.alvoS[nome] = s;
  }

  /** O `head_look` do Veloren: um olhar novo de tempos em tempos (a suavização faz a cabeça virar devagar). */
  protected olhar(passo: number, ax: number, ay: number): [number, number] {
    const f = Math.floor(this.tGlobal / 2 + this.tAnim / passo);
    return [Math.sin(f * 7331) * ax, Math.sin(f * 1337) * ay];
  }

  /** O `tilt` do Veloren: inclina o corpo para dentro da curva (o original mede o giro de um quadro, a 60 Hz). */
  protected inclinacao(p: Pose) {
    return Math.max(-0.2, Math.min(0.2, p.giro / 60)) * 1.3;
  }
}

type Eixo = 'x' | 'y' | 'z';
type Animacao = 'idle' | 'run' | 'feed' | 'fly';
const POSE_PARADA: Pose = { vel: 0, giro: 0, subida: 0, comer: false, voar: false, bater: false, olhar: 0 };
const PI = Math.PI;

/**
 * O Veloren anda com bichos mais rápidos que os nossos (passeio a 3–5 m/s). Com a velocidade real, o passo
 * sairia curto demais para o chão percorrido; esta escala só alimenta a amplitude da animação.
 */
const VEL_ANIM = 2.2;

/** Quadrúpedes pequenos (`quadruped_small/{idle,run,feed}.rs`): ovelha, coelho, raposa, cão… */
class QuadrupedePequeno extends Corpo {
  protected escalaBase() {
    return this.n('scaler', 1) / 11;
  }
  protected esqueleto() {
    const peito = this.osso('chest', this.base);
    this.osso('head', peito);
    this.osso('tail', peito);
    for (const k of ['foot_fl', 'foot_fr', 'foot_bl', 'foot_br']) this.osso(k, peito);
  }
  protected escolher(p: Pose): Animacao {
    return p.vel > 0.15 ? 'run' : p.comer ? 'feed' : 'idle';
  }
  protected calcular(anim: Animacao, p: Pose) {
    const t = this.tAnim;
    const [c0, c1] = this.par('chest');
    const [h0, h1] = this.par('head');
    const [t0, t1] = this.par('tail');
    const [f0, f1, f2] = this.trio('feet_f');
    const [b0, b1, b2] = this.trio('feet_b');
    const feed = this.n('feed', 1);
    if (anim === 'idle') {
      const slow = Math.sin(t * 3.5), slowAlt = Math.sin(t * 3.5 + PI / 2);
      const [lx, ly] = this.olhar(8, 0.5, 0.25);
      this.P('head', 0, h0, h1 + slow * 0.2);
      this.R('head', ['z', lx + p.olhar], ['x', ly + slowAlt * 0.03]);
      this.P('chest', slow * 0.05, c0, c1);
      this.R('chest', ['y', slow * 0.05]);
      this.P('foot_fl', -f0, f1, f2 + slow * -0.2);
      this.R('foot_fl', ['x', slow * 0.03], ['y', slow * -0.05]);
      this.P('foot_fr', f0, f1, f2 + slow * 0.2);
      this.R('foot_fr', ['x', slowAlt * 0.03], ['y', slow * -0.05]);
      this.P('foot_bl', -b0, b1, b2 + slow * -0.2);
      this.R('foot_bl', ['x', slowAlt * 0.03], ['y', slow * -0.05]);
      this.P('foot_br', b0, b1, b2 + slow * 0.2);
      this.R('foot_br', ['x', slow * 0.03], ['y', slow * -0.05]);
      this.P('tail', 0, t0, t1);
      this.R('tail', ['z', slow * 0.4]);
      return;
    }
    if (anim === 'feed') {
      const slow = Math.sin(t * 5), quick = Math.sin(t * 14), slowAlt = Math.sin(t * 3.5 + PI);
      const [, ly] = this.olhar(2, 1, 0.5);
      this.P('head', 0, h0 + 1.5, h1 + slow * 0.2);
      this.R('head', ['z', ly], ['x', slow * 0.05 + quick * 0.08 - 0.4 * feed]);
      this.P('chest', slow * 0.02, c0, c1);
      this.R('chest', ['x', -0.35 * feed], ['y', ly * 0.1]);
      const y = slow * -0.02 - ly * 0.1;
      this.P('foot_fl', -f0, f1, f2 + 0.5);
      this.R('foot_fl', ['x', slow * 0.01 + 0.25 * feed], ['y', y]);
      this.P('foot_fr', f0, f1, f2 + 0.5);
      this.R('foot_fr', ['x', slowAlt * 0.01 + 0.25 * feed], ['y', y]);
      this.P('foot_bl', -b0, b1 + 1, b2 - 1);
      this.R('foot_bl', ['x', slowAlt * 0.01 + 0.15 * feed], ['y', y]);
      this.P('foot_br', b0, b1 + 1, b2 - 1);
      this.R('foot_br', ['x', slow * 0.01 + 0.15 * feed], ['y', y]);
      this.P('tail', 0, t0, t1);
      this.R('tail', ['z', slow * 0.3 + ly * 0.3]);
      return;
    }
    // run
    const speed = Math.min(12, p.vel * VEL_ANIM);
    const sn = (speed / 12) ** 0.4;
    const ph = (this.acc * VEL_ANIM + t * 12) * 0.42 * this.n('tempo', 1);
    const short = Math.sin(ph + PI) * sn;
    const shortalt = Math.sin(ph + PI * 0.5) * sn;
    const footvert = Math.sin(ph) * sn;
    const footvertt = Math.sin(ph + PI * 0.4) * sn;
    const footvertf = Math.sin(ph + PI * 0.3) * sn;
    const footverttf = Math.sin(ph + PI * 0.7) * sn;
    const tilt = this.inclinacao(p);
    const xTilt = Math.atan2(p.subida, Math.max(0.01, p.vel)) * sn;
    const lateral = this.n('lateral', 0), vc = 1 - lateral;
    const spring = this.n('spring', 1), minimize = this.n('minimize', 1), maximize = this.n('maximize', 1);
    for (const k of ['foot_fl', 'foot_fr', 'foot_bl', 'foot_br']) this.S(k, 1.02);
    this.P('head', 0, h0, h1);
    this.R('head', ['x', xTilt * -0.5 + vc * short * -0.2], ['y', tilt * 0.8], ['z', lateral * -short * 0.2 + tilt * -1.2 + p.olhar]);
    this.P('chest', 0, c0, c1 + 2 * sn * spring + shortalt * 3 * spring);
    this.R('chest', ['x', vc * short * 0.2 * spring + xTilt], ['y', tilt * 0.8], ['z', lateral * short * 0.2 + tilt * -1.5]);
    this.P('foot_fl', -f0, f1 + footverttf * 3 * minimize, f2 + Math.max(-1, footvertf * -1.5));
    this.R('foot_fl', ['x', 0.2 * sn + maximize * footverttf * 0.65], ['z', tilt * -0.5], ['y', tilt * 1.5]);
    this.P('foot_fr', f0, f1 + footvertt * 3 * minimize, f2 + Math.max(-1, footvert * -1.5));
    this.R('foot_fr', ['x', 0.2 * sn + maximize * footvertt * 0.65], ['z', tilt * -0.5], ['y', tilt * 1.5]);
    this.P('foot_bl', -b0, b1 + footvertt * -1.4, b2 + Math.max(-1, footvert * 1.5));
    this.R('foot_bl', ['x', -0.25 * sn + maximize * footvertt * -0.8], ['y', tilt * 1.5], ['z', tilt * -1.5]);
    this.P('foot_br', b0, b1 + footverttf * -1.4, b2 + Math.max(-1, footvertf * 1.5));
    this.R('foot_br', ['x', -0.25 * sn + maximize * footverttf * -0.8], ['y', tilt * 1.5], ['z', tilt * -1.5]);
    this.P('tail', 0, t0, t1);
    this.R('tail', ['x', vc * short * 0.2 + xTilt], ['y', tilt * 0.8], ['z', lateral * -short * 0.2 + tilt * 1.5]);
  }
}

/** Quadrúpedes médios (`quadruped_medium/{idle,run,feed}.rs`): cervo, camelo, cavalo, boi, lobo… */
class QuadrupedeMedio extends Corpo {
  protected escalaBase() {
    return this.n('scaler', 1) / 11;
  }
  protected esqueleto() {
    const frente = this.osso('torso_front', this.base);
    const tras = this.osso('torso_back', frente);
    const pescoco = this.osso('neck', frente);
    const cabeca = this.osso('head', pescoco);
    const mandibula = this.osso('jaw', cabeca);
    this.osso('ears', this.tromba ? mandibula : cabeca);
    this.osso('tail', tras);
    this.osso('foot_fl', this.osso('leg_fl', frente));
    this.osso('foot_fr', this.osso('leg_fr', frente));
    this.osso('foot_bl', this.osso('leg_bl', tras));
    this.osso('foot_br', this.osso('leg_br', tras));
  }
  private get tromba() {
    return this.a.attr.ears_for_trunk === true;
  }
  /** `feed: (abaixa a cabeça para pastar?, quanto)`. */
  private get feed(): [boolean, number] {
    const v = this.a.attr.feed;
    return Array.isArray(v) ? [v[0] === true, Number(v[1])] : [false, 0];
  }
  protected escolher(p: Pose): Animacao {
    return p.vel > 0.15 ? 'run' : p.comer ? 'feed' : 'idle';
  }
  protected calcular(anim: Animacao, p: Pose) {
    const t = this.tAnim;
    const [h0, h1] = this.par('head');
    const [n0, n1] = this.par('neck');
    const [j0, j1] = this.par('jaw');
    const [t0, t1] = this.par('tail');
    const [tf0, tf1] = this.par('torso_front');
    const [tb0, tb1] = this.par('torso_back');
    const [e0, e1] = this.par('ears');
    const [lf0, lf1, lf2] = this.trio('leg_f');
    const [lb0, lb1, lb2] = this.trio('leg_b');
    const [pf0, pf1, pf2] = this.trio('feet_f');
    const [pb0, pb1, pb2] = this.trio('feet_b');
    for (const k of ['neck', 'jaw', 'leg_fl', 'leg_fr', 'leg_bl', 'leg_br', 'ears']) this.S(k, 1.02);
    for (const k of ['foot_fl', 'foot_fr', 'foot_bl', 'foot_br']) this.S(k, 0.96);

    if (anim === 'idle' || anim === 'feed') {
      const slower = Math.sin(t + PI), slow = Math.sin(t * 3.5 + PI);
      const [lx, ly] = this.olhar(8, 0.5, 0.25);
      const [abaixa, quanto] = this.feed;
      const tr = anim === 'feed' ? Math.min(1, t * t) * quanto : 0;
      if (anim === 'feed' && abaixa) {
        const fast = Math.sin(t * 5), faster = Math.sin(t * 14);
        this.P('head', 0, h0, h1 + slower * 0.2 + tr * 1.5);
        this.R('head', ['z', 0.3 * lx], ['x', fast * 0.05 + faster * 0.08 + tr * -0.5]);
        this.P('neck', 0, n0 + tr, n1 + slower * 0.1 + tr * 1.5);
        this.R('neck', ['x', tr * -0.5]);
        this.P('jaw', 0, j0 - slower * 0.12, j1 + slow * 0.2);
        this.R('jaw', ['x', Math.min(0, fast * 0.18 + faster * 0.26)]);
      } else {
        this.P('head', 0, h0, h1 + slower * 0.2);
        this.R('head', ['z', 0.3 * lx + p.olhar], ['x', 0.3 * ly]);
        this.P('neck', 0, n0, n1 + slower * 0.1);
        this.R('neck');
        this.P('jaw', 0, j0 - slower * 0.12, j1 + slow * 0.2);
        this.R('jaw', ['x', slow * 0.05 - 0.08]);
      }
      const trc = anim === 'feed' && abaixa ? tr : 0;
      this.P('tail', 0, t0, t1);
      this.R('tail', ['z', slow * 0.2 + (anim === 'feed' ? lx : this.olhar(2, 0.25, 0.125)[0])]);
      this.P('torso_front', 0, tf0, tf1 + slower * 0.3 + trc * -6);
      this.R('torso_front', ['x', trc * -0.7], ['y', slow * 0.02]);
      this.P('torso_back', 0, tb0, tb1 + slower * 0.2);
      this.R('torso_back', ['x', trc * 0.5], ['y', -slow * 0.005]);
      this.P('ears', 0, e0, e1);
      if (this.tromba) this.R('ears');
      else this.R('ears', ['x', slower * 0.03]);
      this.P('leg_fl', -lf0, lf1 + trc * -2.2, lf2 + slow * -0.15 + slower * -0.15 + trc * 2.4);
      this.R('leg_fl', ['x', trc], ['y', slow * -0.02]);
      this.P('leg_fr', lf0, lf1 + trc * -2.2, lf2 + slow * 0.15 + slower * -0.15 + trc * 2.4);
      this.R('leg_fr', ['x', trc], ['y', slow * -0.02]);
      this.P('leg_bl', -lb0, lb1, lb2 + slower * -0.3 + trc * -1.3);
      this.R('leg_bl', ['x', trc * 0.2], ['y', slow * -0.02]);
      this.P('leg_br', lb0, lb1, lb2 + slower * -0.3 + trc * -1.3);
      this.R('leg_br', ['x', trc * 0.2], ['y', slow * -0.02]);
      this.P('foot_fl', -pf0, pf1, pf2 + slower * -0.2);
      this.R('foot_fl', ['x', trc * -0.3]);
      this.P('foot_fr', pf0, pf1, pf2 + slower * -0.2);
      this.R('foot_fr', ['x', trc * -0.3]);
      this.P('foot_bl', -pb0, pb1, pb2 + slower * -0.2);
      this.R('foot_bl');
      this.P('foot_br', pb0, pb1, pb2 + slower * -0.2);
      this.R('foot_br');
      return;
    }

    // run (o galope do Veloren; devagar vira passo)
    const scaler = this.n('scaler', 1), tempo = this.n('tempo', 1), spring = this.n('spring', 1);
    const speed = Math.min(24, p.vel * VEL_ANIM);
    const canceler = (speed / 24) ** 0.6;
    const amp = canceler / scaler;
    const ph = (this.acc * VEL_ANIM + t * 2.5) * 0.72 * tempo;
    const sb = Math.sin(ph + PI * -0.15 - 0.5);
    const short = Math.sqrt(1 / (0.72 + 0.28 * sb * sb)) * sb;
    const shortalt = Math.sin(ph + (PI * 3) / 8 - 0.5);
    const [lx, ly] = this.olhar(2, 0.5, 0.25);
    const sa = speed < 5 ? 0 : speed / 24;
    const s1 = sa - PI / 2 - (sa * PI * 3) / 4;
    const s2 = sa + PI / 2 + (sa * PI) / 2;
    const s3 = sa + PI / 4 - (sa * PI) / 4;
    const s4 = sa - (PI * 3) / 4 + (sa * PI) / 2;
    const c5 = canceler * 0.05;
    const f1a = Math.sin(ph + c5 + s1), f1b = Math.sin(ph + 1.1 + c5 + s1);
    const f2a = Math.sin(ph + s2 + PI), f2b = Math.sin(ph + 1.1 + s2 + PI);
    const f3a = Math.sin(ph + s3 + PI), f3b = Math.sin(ph + PI / 2 + s3 + PI);
    const f4a = Math.sin(ph + c5 + s4), f4b = Math.sin(ph + PI / 2 + c5 + s4);
    const tilt = this.inclinacao(p);
    const xTilt = Math.atan2(p.subida, Math.max(0.01, p.vel)) * canceler;
    const cm = Math.max(0.5, canceler);
    this.P('head', 0, h0, h1 + shortalt * -0.2);
    this.R('head', ['x', (ly * 0.3) / cm + amp * short * 0.2 - 0.1], ['z', (lx * 0.3) / cm + tilt * -2 + p.olhar], ['y', tilt * 0.8]);
    this.P('neck', 0, n0, n1 + shortalt * -0.8);
    this.R('neck', ['z', tilt * -0.8], ['x', amp * short * 0.05], ['y', tilt * 0.3]);
    this.P('jaw', 0, j0, j1);
    this.R('jaw');
    this.P('tail', 0, t0, t1);
    this.R('tail', ['x', amp * shortalt * -0.3], ['z', tilt * 1.5]);
    this.P('torso_front', 0, tf0, tf1 + canceler + canceler * shortalt * 2.5 * spring + xTilt * 10 * canceler);
    this.R('torso_front', ['x', Math.min(0.1, amp * Math.max(-0.2, short * -0.13) * spring) + xTilt * Math.min(1, canceler * 6)], ['y', tilt * 0.8], ['z', tilt * -1.5]);
    this.P('torso_back', 0, tb0, tb1 + amp * shortalt * 0.2 - 0.2);
    this.R('torso_back', ['x', amp * short * -0.07], ['z', tilt * 1.8], ['y', tilt * 0.6]);
    this.P('ears', 0, e0, e1);
    if (this.tromba) this.R('ears');
    else this.R('ears', ['x', amp * shortalt * 0.2 + 0.2]);
    this.P('leg_fl', -lf0, lf1 + amp * f1b * -1.6, lf2 + amp * f1a * 2.3);
    this.R('leg_fl', ['x', 0.2 * canceler + amp * f1a], ['z', tilt * -0.5], ['y', tilt * 1.5]);
    this.P('leg_fr', lf0, lf1 + amp * f2b * -1.6, lf2 + amp * f2a * 2.3);
    this.R('leg_fr', ['x', 0.2 * canceler + amp * f2a], ['z', tilt * -0.5], ['y', tilt * 1.5]);
    this.P('leg_bl', -lb0, lb1 + amp * f3a * -4.5, lb2 + amp * f3b * -2.2);
    this.R('leg_bl', ['x', canceler * -0.1 + amp * f3a * -1.2], ['y', tilt * 1.5], ['z', tilt * -1.5]);
    this.P('leg_br', lb0, lb1 + amp * f4a * -4.5, lb2 + amp * f4b * -2.2);
    this.R('leg_br', ['x', canceler * -0.1 + amp * f4a * -1.2], ['y', tilt * 1.5], ['z', tilt * -1.5]);
    const sa0 = this.n('startangle', 0);
    this.P('foot_fl', -pf0, pf1, pf2 + Math.max(-1, f1a * 2) * amp + canceler);
    this.R('foot_fl', ['x', sa0 * canceler + amp * f1b * -0.85], ['y', -tilt]);
    this.P('foot_fr', pf0, pf1, pf2 + Math.max(-1, f2a * 2) * amp + canceler);
    this.R('foot_fr', ['x', sa0 * canceler + amp * f2b * -0.85], ['y', -tilt]);
    this.P('foot_bl', -pb0, pb1, pb2 + Math.max(0, f3a * 0.8) * amp + canceler);
    this.R('foot_bl', ['x', amp * f3b * -0.7 - 0.2 * canceler], ['y', -tilt]);
    this.P('foot_br', pb0, pb1, pb2 + Math.max(0, f4a * 0.8) * amp + canceler);
    this.R('foot_br', ['x', amp * f4b * -0.7 - 0.2 * canceler], ['y', -tilt]);
  }
}

/** Aves médias (`bird_medium/{idle,run,feed,fly}.rs`): galinha, pato, corvo, águia, morcego… */
class Ave extends Corpo {
  // (getter: o construtor da base chama escalaBase() antes dos campos da subclasse existirem)
  private get sc() {
    return this.n('scaler', 1);
  }
  protected escalaBase() {
    return this.sc / 8;
  }
  protected esqueleto() {
    const peito = this.osso('chest', this.base);
    this.osso('head', peito);
    this.osso('tail', peito);
    this.osso('wing_out_l', this.osso('wing_in_l', peito));
    this.osso('wing_out_r', this.osso('wing_in_r', peito));
    this.osso('leg_l', this.base);
    this.osso('leg_r', this.base);
  }
  protected escolher(p: Pose): Animacao {
    return p.voar ? 'fly' : p.vel > 0.1 ? 'run' : p.comer ? 'feed' : 'idle';
  }
  protected calcular(anim: Animacao, p: Pose) {
    const t = this.tAnim, sc = this.sc;
    const [c0, c1] = this.par('chest');
    const [h0, h1] = this.par('head');
    const [t0, t1] = this.par('tail');
    const [wi0, wi1, wi2] = this.trio('wing_in');
    const [wo0, wo1, wo2] = this.trio('wing_out');
    const [l0, l1, l2] = this.trio('leg');
    for (const k of ['chest', 'leg_l', 'leg_r']) this.S(k, sc * 0.99);
    this.S('head', 0.99);
    this.S('tail', 1.01);
    this.P('head', 0, h0, h1);
    this.P('tail', 0, t0, t1);
    this.P('wing_in_l', -wi0, wi1, wi2);
    this.P('wing_in_r', wi0, wi1, wi2);

    if (anim === 'idle' || anim === 'feed') {
      const [lx, ly] = this.olhar(8, 0.5, 0.25);
      const wsc = Math.cos(t * 4.5);
      this.P('leg_l', -l0, l1, l2);
      this.R('leg_l');
      this.P('leg_r', l0, l1, l2);
      this.R('leg_r');
      if (anim === 'idle') {
        this.S('wing_in_l', sc * 0.99);
        this.S('wing_in_r', sc * 0.99);
        this.P('chest', 0, c0 * sc, (c1 + wsc * 0.06 + 1.5) * sc);
        this.R('chest');
        this.R('head', ['z', lx + p.olhar], ['x', -Math.abs(ly) + wsc * 0.01]);
        this.R('tail', ['x', 0.6]);
        this.R('wing_in_l', ['x', -PI / 2], ['y', -PI / 2.5 + wsc * 0.06], ['z', -PI / 4]);
        this.R('wing_in_r', ['x', -PI / 2], ['y', PI / 2.5 - wsc * 0.06], ['z', PI / 4]);
        this.P('wing_out_l', -wo0 / 2.5, wo1, wo2 + 1);
        this.P('wing_out_r', wo0 / 2.5, wo1, wo2 + 1);
        this.R('wing_out_l', ['y', 0.1], ['z', 0.2]);
        this.R('wing_out_r', ['y', -0.1], ['z', -0.2]);
      } else {
        const wf = Math.cos(t * 9);
        this.P('chest', 0, c0, c1 + wsc * 0.06 - 1.8);
        this.R('chest', ['x', this.n('feed', -0.65)]);
        this.R('head', ['z', lx], ['x', -0.2 - Math.abs(ly) + wsc * 0.01]);
        this.R('tail', ['x', 0]);
        this.R('wing_in_l', ['y', -0.7 + wf * 0.08], ['z', 0.2]);
        this.R('wing_in_r', ['y', 0.7 - wf * 0.08], ['z', -0.2]);
        this.P('wing_out_l', -wo0, wo1, wo2);
        this.P('wing_out_r', wo0, wo1, wo2);
        this.R('wing_out_l', ['y', -0.2], ['z', 0.2]);
        this.R('wing_out_r', ['y', 0.2], ['z', -0.2]);
      }
      return;
    }

    if (anim === 'run') {
      this.S('wing_in_l', sc * 0.99);
      this.S('wing_in_r', sc * 0.99);
      const speed = Math.min(22, p.vel * VEL_ANIM);
      const sn = Math.sqrt(speed / 13);
      const ph = (this.acc * VEL_ANIM + t * 5) * 0.8 * 0.8;
      const sb = Math.sin(ph + PI * -0.15 - 0.5);
      const short = Math.sqrt(1 / (0.72 + 0.28 * sb * sb)) * sb * sn;
      const shortalt = Math.sin(ph + (PI * 3) / 8 - 0.5) * sn;
      const f1a = Math.sin(ph * 2 + PI) * sn, f1b = Math.sin(ph * 2 + PI / 2 + PI) * sn;
      const f2a = Math.sin(ph * 2) * sn, f2b = Math.sin(ph * 2 + PI / 2) * sn;
      const tilt = this.inclinacao(p);
      const xTilt = Math.atan2(p.subida, Math.max(0.01, p.vel)) * sn;
      this.R('head', ['x', -0.1 * sn + short * -0.05], ['y', tilt * 0.2 + f1a * 0.25], ['z', shortalt * -0.05 - tilt * 1.5 + p.olhar]);
      this.P('chest', 0, c0 * sc, (c1 + 1.5 + short * 0.5 + Math.max(f1b, f2b) * 2 + xTilt * 4 + 0.5 * sn) * sc);
      this.R('chest', ['x', short * 0.07 + xTilt], ['y', tilt * 0.8 - f1a * 0.25], ['z', shortalt * 0.1]);
      this.R('tail', ['x', 0.6 + short * -0.02]);
      this.R('wing_in_l', ['x', -PI / 1.5], ['y', -PI / 2.5], ['z', -PI / 3]);
      this.R('wing_in_r', ['x', -PI / 1.5], ['y', PI / 2.5], ['z', PI / 3]);
      this.P('wing_out_l', -wo0, wo1, wo2);
      this.P('wing_out_r', wo0, wo1, wo2);
      this.R('wing_out_l', ['y', -0.2 + short * 0.05], ['z', 0.2]);
      this.R('wing_out_r', ['y', 0.2 + short * -0.05], ['z', -0.2]);
      this.P('leg_l', -l0, l1 + f1b * -1.8, l2 + (f1b + 1) * 0.75);
      this.R('leg_l', ['x', -0.2 * sn + f1a * 0.75], ['y', tilt * 0.5 + Math.max(0, f1b) * 0.6]);
      this.P('leg_r', l0, l1 + f2b * -1.8, l2 + (f2b + 1) * 0.75);
      this.R('leg_r', ['x', -0.2 * sn + f2a * 0.75], ['y', tilt * 0.5 - Math.max(0, f2b) * 0.6]);
      return;
    }

    // fly: batendo asas (decolagem, voo baixo) ou planando (a águia lá no alto)
    const slow = Math.sin(t * 2), fast = Math.sin(t * 4);
    const vxy = p.vel;
    const tilt = this.inclinacao(p);
    this.S('wing_in_l', sc * 0.99);
    this.S('wing_in_r', sc * 0.99);
    this.R('head', ['x', Math.min(-0.3, -0.5 + (0.2 * vxy) / 5) + fast * 0.05]);
    this.P('wing_out_l', -wo0, wo1, wo2);
    this.P('wing_out_r', wo0, wo1, wo2);
    if (p.bater) {
      const freq = 8;
      const flap = (off: number) =>
        (7 / 16) * Math.sin(freq * t + off) + (7 / 64) * Math.sin(freq * 2 * t + off) + (1 / 48) * Math.sin(freq * 3 * t + off);
      const flap1 = flap(0), flap2 = flap(-1.7), flap3 = flap(-2), flap4 = flap(-2.4);
      this.P('chest', 0, c0, c1 - flap4 * 1.5);
      this.R('chest', ['x', Math.max(-0.2, 0.2 - (0.2 * vxy) / 5) - flap1 * 0.2], ['y', tilt * 1.8 + fast * 0.01]);
      this.R('wing_in_l', ['y', -flap1 * 1.9 + 0.2], ['x', 0.4]);
      this.R('wing_in_r', ['y', flap1 * 1.9 - 0.2], ['x', 0.4]);
      this.R('wing_out_l', ['y', -flap3 * 1.2 - 0.3]);
      this.R('wing_out_r', ['y', flap3 * 1.2 + 0.3]);
      this.R('tail', ['x', -flap2 * 0.2 + 0.1], ['z', tilt]);
      const perna = Math.max(-1.2, (-1 * vxy) / 5) + flap1 * -0.1;
      this.P('leg_l', -l0, l1, l2 - flap4 * 1.5);
      this.R('leg_l', ['x', perna], ['y', tilt * 1.6 + fast * 0.01]);
      this.P('leg_r', l0, l1, l2 - flap4 * 1.5);
      this.R('leg_r', ['x', perna], ['y', tilt * 1.6 + fast * 0.01]);
    } else {
      const sobe = Math.min(0.8, (0.8 * p.subida) / 80), sobe2 = Math.min(0.2, (0.4 * p.subida) / 80);
      this.P('chest', 0, c0, c1 + slow * 0.05);
      this.R('chest', ['x', -0.2 + slow * 0.05 + sobe], ['y', tilt * 1.8 + fast * 0.01]);
      this.R('wing_in_l', ['y', 0.1 + slow * 0.04 + sobe], ['x', 0.4]);
      this.R('wing_in_r', ['y', -0.1 + slow * -0.04 - sobe], ['x', 0.4]);
      this.R('wing_out_l', ['y', 0.1 + slow * 0.04 + sobe2]);
      this.R('wing_out_r', ['y', -0.1 + slow * -0.04 - sobe2]);
      this.R('tail', ['x', 0.04 - slow * 0.04], ['z', tilt]);
      this.P('leg_l', -l0, l1, l2 + 1 + slow * 0.05);
      this.R('leg_l', ['x', -1.2 + slow * -0.05], ['y', tilt * 1.6 + fast * 0.01]);
      this.P('leg_r', l0, l1, l2 + 1 + slow * 0.05);
      this.R('leg_r', ['x', -1.2 + slow * -0.05], ['y', tilt * 1.6 + fast * 0.01]);
    }
  }
}

export function criarCorpo(id: IdEspecie): Corpo {
  const a = anatomia(id);
  if (a.corpo === 'quadruped_small') return new QuadrupedePequeno(a);
  if (a.corpo === 'quadruped_medium') return new QuadrupedeMedio(a);
  return new Ave(a);
}
