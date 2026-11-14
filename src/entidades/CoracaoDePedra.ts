import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Fisica } from './Peregrino';
import { ResultadoGolpe, Sombra } from './Sombra';
import { Chefe, Impacto, InfoJogador } from './Guardiao';

/**
 * O Coração de Pedra, a Dureza de Coração: chefão das Ruas da Bahia (docs/regioes/01-ruas-da-bahia.md, seção 3).
 * Na tradição (São Gregório Magno, *Moralia*), é o vício oposto ao dom da Piedade: a indiferença de quem vê o
 * doente na calçada e atravessa a rua. "Tirarei do vosso peito o coração de pedra" (Ez 36,26).
 *
 * Um colosso de uns 5 m feito dos paralelepípedos do largo, de sobrecasaca de pedra polida e botões de ferro. A
 * cabeça é uma máscara lisa, sem boca, sempre virada para longe; uma das mãos tapa o ouvido. No peito, atrás de
 * uma grade de sacada colonial, bate um coração de pedra escura com uma brasa fraca nas fendas.
 *
 * - Couraça: nada o fere enquanto a grade está fechada. A arena (LargoDoCruzeiro) abre a grade (`expor`) quando o
 *   peregrino socorre três enfermos: a oração deles racha a pedra. Exposto, a luz e o cajado ferem.
 * - Passar ao largo: um olhar em cone, cinzento. Quem é pego fica indiferente por 4 s (não socorre, anda devagar).
 *   Os enfermos já socorridos fazem sombra: atrás deles, o olhar não pega (a arena diz quem está protegido).
 * - Portas que batem: as portas do largo batem em sequência e uma onda de pó atravessa o chão. Pule.
 * - Pedras rolando: fileiras de paralelepípedos atravessam o largo, com brechas para passar (ou pule).
 * Na metade da vida, "Não é comigo.": tapa os dois ouvidos, e a arena dobra a pressa da pedra e apaga as marcas.
 */

const S = 0.1;
const OLHOS = 0xd8e4ec; // cinza-gelo: sem cor nenhuma
const TEMPO_EXPOSTO = 8;
const RAIO_OLHAR = 14;
const ABERTURA_OLHAR = 0.5; // meio ângulo do cone (rad)
const VEL_PEDRAS = 6.5;
const VEL_ONDA = 7.5;

export interface LimitesArena {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

type Ataque =
  | { tipo: 'olhar'; t: number; dir: THREE.Vector3; pegou: boolean }
  | { tipo: 'pedras'; t: number; linhas: { inicio: number; brechas: number[]; acertou: boolean }[] }
  | { tipo: 'portas'; t: number; deNorte: boolean; acertou: boolean }
  | { tipo: 'cansado'; t: number; duracao: number };

// ─────────────────────────── o modelo (voxel de 0,1 m; escala 2,3) ───────────────────────────

/** Paralelepípedo da ladeira com juntas de musgo escuro. */
const pedra = (x: number, y: number, z: number) => {
  if ((x + 2 * y + 3 * z) % 7 === 0) return variar(0x3a4a2e, x, y, z, 0.06);
  return variar([0x8a8680, 0x7a7670, 0x969088, 0x6e6a64][Math.abs(x * 3 + y * 5 + z * 7) % 4], x, y, z, 0.05);
};
/** A sobrecasaca de pedra polida, de "gente de bem". */
const casaca = (x: number, y: number, z: number) => variar((x + y) % 9 === 0 ? 0x4e5258 : 0x5e6268, x, y, z, 0.025);
const FERRO = 0x26282c;

const geos: Record<string, THREE.BufferGeometry> = {};
function geo(nome: string, fazer: () => THREE.BufferGeometry) {
  return (geos[nome] ??= fazer());
}

function corpoColosso() {
  const m = new Modelo();
  // as pernas: colunas de paralelepípedo, com os pés largos
  m.caixa(-4, 0, -2, 3, 7, 4, pedra).caixa(1, 0, -2, 3, 7, 4, pedra);
  m.caixa(-5, 0, -2, 5, 1, 5, pedra).caixa(0, 0, -2, 5, 1, 5, pedra);
  // a sobrecasaca: o tronco, com as abas descendo atrás
  m.caixa(-6, 7, -3, 12, 10, 6, casaca);
  m.caixa(-6, 4, -3, 12, 3, 2, casaca);
  m.caixa(-6, 7, 3, 2, 10, 1, casaca).caixa(4, 7, 3, 2, 10, 1, casaca); // as lapelas
  // o vão do peito, onde bate o coração (a grade fica na frente, à parte)
  m.caixa(-3, 10, 1, 6, 6, 3, null);
  m.caixa(-3, 10, 0, 6, 6, 1, 0x1a1a1c); // o fundo escuro do vão
  for (const y of [8, 9]) for (const x of [-1, 1]) m.ponto(x, y, 3, FERRO); // os botões de ferro, abaixo do vão
  m.caixa(-2, 7, 3, 4, 1, 1, FERRO); // o cinto da casaca
  // os ombros e o colarinho alto
  m.caixa(-8, 15, -3, 16, 3, 6, casaca);
  m.caixa(-2, 17, -2, 4, 2, 4, 0xd8d4cc);
  // o braço esquerdo dele (à direita de quem olha), erguido: a mão tapa o ouvido
  m.caixa(-10, 11, -2, 3, 6, 3, casaca).caixa(-10, 17, -2, 3, 3, 3, casaca);
  m.caixa(-8, 19, -2, 2, 3, 3, pedra);
  return m.geometria(S, [0, 0, 0]);
}

/** O braço direito: descido junto ao corpo, ou erguido tapando o outro ouvido (fase 2). */
function bracoDireito(erguido: boolean) {
  const m = new Modelo();
  if (erguido) {
    m.caixa(7, 11, -2, 3, 6, 3, casaca).caixa(7, 17, -2, 3, 3, 3, casaca);
    m.caixa(6, 19, -2, 2, 3, 3, pedra);
  } else {
    m.caixa(7, 8, -2, 3, 9, 3, casaca);
    m.caixa(7, 5, -1, 3, 3, 3, pedra); // a mão, fechada
  }
  return m.geometria(S, [0, 0, 0]);
}

/** A máscara lisa, sem boca, pálida como pedra-sabão. Os olhos só aparecem quando ela racha. */
function mascara() {
  const m = new Modelo();
  const lisa = (x: number, y: number, z: number) => variar(0xb8bcc0, x, y, z, 0.02);
  m.caixa(-3, 0, -3, 6, 6, 6, lisa);
  m.caixa(-2, 6, -2, 4, 1, 4, lisa);
  m.caixa(-1, 2, 3, 2, 2, 1, lisa); // o nariz, sem narinas
  m.caixa(-3, 6, -3, 6, 1, 6, 0x2a2a2e).caixa(-4, 6, -4, 8, 1, 8, 0x2a2a2e).caixa(-2, 7, -2, 4, 3, 4, 0x2a2a2e); // a cartola
  return m.geometria(S, [0, 0, 0]);
}

/** A grade de sacada colonial de ferro batido que fecha o peito, com as volutas. */
function grade() {
  const m = new Modelo();
  for (let x = -4; x <= 3; x++) m.ponto(x, 0, 0, FERRO).ponto(x, 7, 0, FERRO);
  for (let x = -4; x <= 3; x += 2) m.caixa(x, 1, 0, 1, 6, 1, FERRO);
  for (const [x, y] of [[-3, 3], [-2, 4], [0, 3], [1, 4], [-3, 5], [1, 2]]) m.ponto(x, y, 0, 0x3a3c42); // volutas
  m.ponto(-1, 3, 1, 0x8a6a2a); // o ferrolho
  return m.geometria(S, [0, 0, 0]);
}

/** O coração de pedra escura, com as fendas da brasa. */
function coracaoDePedra() {
  const m = new Modelo();
  const c = (x: number, y: number, z: number) => ((x * 5 + y * 3 + z) % 6 === 0 ? 0xc83a1a : variar(0x3a3436, x, y, z, 0.05));
  m.caixa(-2, 1, 0, 4, 2, 2, c).caixa(-1, 0, 0, 2, 1, 2, c).caixa(-2, 3, 0, 2, 1, 2, c).caixa(0, 3, 0, 2, 1, 2, c);
  return m.geometria(S, [0, 0, 0]);
}

/** O coração de carne que aparece quando a pedra racha (Ez 36,26). */
function coracaoDeCarne() {
  const m = new Modelo();
  const c = (x: number, y: number, z: number) => variar((x + y + z) % 4 === 0 ? 0xe04a5a : 0xc8203a, x, y, z, 0.05);
  m.caixa(-3, 2, -1, 6, 3, 3, c).caixa(-2, 1, -1, 4, 1, 3, c).ponto(0, 0, 0, 0xc8203a);
  m.caixa(-3, 5, -1, 2, 1, 3, c).caixa(1, 5, -1, 2, 1, 3, c);
  m.ponto(-1, 4, 2, 0xf08a9a).ponto(-2, 3, 2, 0xf08a9a); // o brilho
  return m.geometria(0.12, [0, 2.5, 0]);
}

export class CoracaoDePedra extends Sombra implements Chefe {
  readonly efeitos = new THREE.Group();
  readonly impactos: Impacto[] = [];
  alerta = '';
  readonly mensagemBloqueio: string = 'A pedra não sente nada: socorra três enfermos para rachar a couraça!';
  private ataque: Ataque | null = null;
  private ultimo = '';
  private espera = 3;
  private surdo = false;
  private avisados = new Set<string>();
  private info: InfoJogador = { pos: new THREE.Vector3(), noChao: true, esquivando: false, invulneravel: false };
  private fis: Fisica | null = null;
  /** A arena diz se o peregrino está à sombra de um enfermo socorrido (o olhar não pega). */
  protegido: (p: THREE.Vector3) => boolean = () => false;

  private cabeca: THREE.Mesh;
  private bracoBaixo: THREE.Mesh;
  private bracoErguido: THREE.Mesh;
  private gradePivo = new THREE.Group();
  private coracao: THREE.Mesh;
  private matCoracao = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x400800 });
  private matOlhos = new THREE.MeshBasicMaterial({ color: OLHOS });
  private abertura = 0;
  /** Rachaduras na couraça (as orações dos socorridos): 0 a 3. */
  private rachaduras = 0;

  // efeitos no chão do largo
  private cone: THREE.Mesh;
  private pedras: THREE.InstancedMesh;
  private onda: THREE.Mesh;
  private po: THREE.Mesh[] = [];
  private carne: THREE.Mesh;
  private escombros: THREE.InstancedMesh;
  private queda: { p: THREE.Vector3; v: THREE.Vector3 }[] = [];
  private tFim = -1;

  constructor(id: string, casa: THREE.Vector3, private readonly lim: LimitesArena) {
    super(id, casa, { escala: 2.3, vida: 30, adormecida: true, visao: 60 });
    this.corpo.geometry = geo('corpo', corpoColosso);
    this.duracaoAtordoada = TEMPO_EXPOSTO;
    this.cabeca = new THREE.Mesh(geo('mascara', mascara), this.material);
    this.cabeca.position.y = 18.5 * S;
    this.bracoBaixo = new THREE.Mesh(geo('bracoBaixo', () => bracoDireito(false)), this.material);
    this.bracoErguido = new THREE.Mesh(geo('bracoErguido', () => bracoDireito(true)), this.material);
    this.bracoErguido.visible = false;
    const g = new THREE.Mesh(geo('grade', grade), this.material);
    this.gradePivo.position.set(0, 9.5 * S, 3.6 * S);
    this.gradePivo.add(g);
    this.coracao = new THREE.Mesh(geo('coracao', coracaoDePedra), this.matCoracao);
    this.coracao.position.set(0, 11 * S, 1 * S);
    this.corpo.add(this.cabeca, this.bracoBaixo, this.bracoErguido, this.gradePivo, this.coracao);
    for (const m of [this.corpo, this.cabeca, this.bracoBaixo, this.bracoErguido, g]) m.castShadow = true;
    // os olhos: na máscara, escondidos até ela rachar
    this.cabeca.add(...this.olhos);
    this.olhos[0].position.set(-1.3 * S, 3.4 * S, 3.05 * S);
    this.olhos[1].position.set(1.3 * S, 3.4 * S, 3.05 * S);
    for (const o of this.olhos) {
      o.material = this.matOlhos;
      o.scale.set(0.7, 0.4, 1);
    }

    // o olhar em cone, rente ao chão
    this.cone = new THREE.Mesh(
      new THREE.CircleGeometry(RAIO_OLHAR, 28, -ABERTURA_OLHAR, ABERTURA_OLHAR * 2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4a5058, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.cone.visible = false;
    // as fileiras de paralelepípedos que rolam
    this.pedras = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), new THREE.MeshLambertMaterial({ color: 0x84807a }), 4 * 48);
    this.pedras.count = 0;
    this.pedras.castShadow = true;
    this.pedras.frustumCulled = false;
    // a onda das portas que batem: um muro baixo de pó que atravessa o largo
    this.onda = new THREE.Mesh(
      new THREE.BoxGeometry(lim.x1 - lim.x0, 0.55, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xb8b0a0, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.onda.visible = false;
    const matPo = new THREE.MeshBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.6, depthWrite: false });
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), matPo);
      p.visible = false;
      this.po.push(p);
    }
    // a vitória: o coração de carne e os escombros que voltam para o chão
    this.carne = new THREE.Mesh(geo('carne', coracaoDeCarne), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x501018 }));
    this.carne.visible = false;
    this.escombros = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), new THREE.MeshLambertMaterial({ color: 0x8a8680 }), 60);
    this.escombros.count = 0;
    this.escombros.frustumCulled = false;
    this.efeitos.add(this.cone, this.pedras, this.onda, ...this.po, this.carne, this.escombros);
  }

  get fase2() {
    return this.vida <= this.vidaMax / 2;
  }

  /** A grade está aberta: o coração à mostra, e só então ele pode ser ferido. */
  get exposto() {
    return this.estado === 'atordoada';
  }

  /** Tapou os dois ouvidos ("Não é comigo."): a arena apressa a pedra e apaga as marcas. */
  get naoEComigo() {
    return this.surdo;
  }

  get raioCorpo() {
    return 0.55 * this.escala;
  }

  get raioContato() {
    return 0.7 * this.escala;
  }

  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(new THREE.Vector3(0, 1.3 * this.escala, 0));
  }

  /** Onde fica o coração, no mundo (os raios das orações vão até ali). */
  peito(destino = new THREE.Vector3()) {
    return this.corpo.localToWorld(destino.set(0, 12.5 * S, 3 * S));
  }

  sentir(info: InfoJogador) {
    this.info = info;
  }

  /** Uma oração de quem foi socorrido racha a couraça. */
  rachar(n: number) {
    this.rachaduras = Math.min(3, n);
    this.flash = 0.3;
    this.corFlash.setRGB(1, 0.9, 0.7);
  }

  /** Três orações: a grade cai e o coração fica à mostra por uns segundos. */
  expor() {
    if (!this.ativa || this.exposto) return;
    this.cancelar();
    this.estado = 'atordoada';
    this.t = 0;
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'A grade caiu: o coração está à mostra. Agora!', som: 'rugido' });
  }

  /** A pedra endureceu (um enfermo petrificou): a couraça se cura um pouco. */
  endurecer(vida: number) {
    if (!this.ativa) return;
    this.vida = Math.min(this.vidaMax, this.vida + vida);
    this.flash = 0.3;
    this.corFlash.setRGB(0.35, 0.35, 0.4);
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    if (!this.exposto) {
      this.flash = 0.12;
      this.corFlash.setRGB(0.55, 0.55, 0.6);
      return 'bloqueado';
    }
    const r = super.ferir(dano, de, tipo);
    this.empurrao.multiplyScalar(0.1); // pedra demais para ser empurrada
    if (r === 'ferido') this.estado = 'atordoada'; // a grade continua aberta até o tempo acabar
    if (r === 'morreu') this.cancelar();
    return r;
  }

  derrotar(): ResultadoGolpe {
    const r = super.derrotar();
    if (r === 'morreu') this.cancelar();
    return r;
  }

  protected desfazer(): ResultadoGolpe {
    const r = super.desfazer();
    // o coração racha: por dentro, um coração de carne. O colosso desmorona em paralelepípedos.
    this.tFim = 0;
    const peito = this.peito();
    this.carne.position.copy(peito);
    this.carne.visible = true;
    this.queda = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 * 3.7, r0 = 0.3 + (i % 5) * 0.25;
      this.queda.push({
        p: this.pos.clone().add(new THREE.Vector3(Math.cos(a) * r0, 0.5 + (i % 11) * 0.42, Math.sin(a) * r0)),
        v: new THREE.Vector3(Math.cos(a) * (1 + (i % 3)), 1 + (i % 4), Math.sin(a) * (1 + (i % 3))),
      });
    }
    return r;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fis = fis;
    super.atualizar(dt, fis, jogador);
    // mantém o colosso dentro do largo
    const m = 2.2;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, this.lim.x0 + m, this.lim.x1 - m);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, this.lim.z0 + m, this.lim.z1 - m);
    this.raiz.position.x = this.pos.x;
    this.raiz.position.z = this.pos.z;
    if (this.ativa && this.flash <= 0) this.material.emissive.setRGB(0.03 * this.rachaduras, 0.025 * this.rachaduras, 0.02 * this.rachaduras);
    // a brasa do coração: fraca, e acesa quando a grade cai
    const pulso = (Math.sin(this.t * (this.exposto ? 7 : 3)) + 1) / 2;
    const brasa = this.exposto ? 0.55 + pulso * 0.35 : 0.12 + pulso * 0.1;
    this.matCoracao.emissive.setRGB(brasa, brasa * 0.18, 0.02);
    this.abertura += ((this.exposto ? 1 : 0) - this.abertura) * Math.min(1, dt * 5);
    this.gradePivo.rotation.x = this.abertura * 1.45;
    this.atualizarEfeitos(dt);
  }

  /** O colosso é pedra: não flutua como as sombras. */
  protected alturaExtra() {
    return this.desperto < 1 ? 0 : -0.35 - Math.sin(this.fase * 2.2) * 0.12;
  }

  protected posar(paraJogador: THREE.Vector3) {
    super.posar(paraJogador);
    if (!this.ativa) return;
    this.corpo.scale.set(1, 1, 1);
    this.corpo.rotation.z = 0;
    // nunca olha para ninguém: a máscara vira para o lado oposto, e balança devagar, de quem não quer ver
    this.cabeca.rotation.y = Math.PI * 0.72 * (Math.sin(this.fase * 0.3) > 0 ? 1 : -1) + Math.sin(this.fase * 0.9) * 0.08;
    this.cabeca.rotation.x = this.exposto ? 0.25 : 0;
    this.bracoBaixo.visible = !this.surdo;
    this.bracoErguido.visible = this.surdo;
    // os olhos só aparecem com a máscara rachada (a fase 2)
    for (const o of this.olhos) o.visible = this.surdo;
    // passo pesado: o corpo balança um pouco quando anda
    this.corpo.rotation.x = this.exposto ? -0.08 : 0;
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    if (this.estado === 'desfazendo' || this.estado === 'vencida' || this.adormecida) {
      this.alerta = '';
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.exposto) {
      this.alerta = 'O coração está à mostra: golpeie (cajado ou luz)!';
      if (this.t > this.duracaoAtordoada) {
        this.estado = 'perseguir';
        this.t = 0;
        this.rachaduras = 0;
        this.espera = 1.2;
        this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'A pedra se fechou de novo.', som: 'rugido' });
      }
      return new THREE.Vector3();
    }
    if (this.fase2 && !this.surdo) {
      this.surdo = true;
      this.impactos.push({
        dano: 0, de: this.pos.clone(), som: 'rugido',
        aviso: '"Não é comigo." Ele tapou os dois ouvidos: procure quem precisa olhando e escutando.',
        sussurro: 'Não é comigo. Não vi. Não ouvi.',
      });
    }
    if (!this.ataque) {
      this.alerta = this.rachaduras > 0 ? `Couraça rachada (${this.rachaduras} de 3): socorra mais enfermos` : 'A couraça não cede: socorra os enfermos (F)';
      this.espera -= dt;
      if (this.espera <= 0) this.escolher(dist);
      this.estado = 'perseguir';
      // caminha devagar, como quem passa sem olhar
      return paraJogador.clone().multiplyScalar(dist > 7 ? (this.surdo ? 1.5 : 1.1) : dist < 4 ? -0.6 : 0);
    }
    return this.executar(dt, paraJogador, dist);
  }

  private escolher(dist: number) {
    const opcoes = dist > 8 ? ['olhar', 'olhar', 'pedras', 'portas'] : ['olhar', 'portas', 'pedras', 'portas'];
    if (this.surdo) opcoes.push('pedras', 'olhar');
    const validas = opcoes.filter((o) => o !== this.ultimo);
    const tipo = validas[Math.floor(Math.random() * validas.length)];
    this.ultimo = tipo;
    this.t = 0;
    if (tipo === 'olhar') {
      const dir = this.info.pos.clone().sub(this.pos).setY(0);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      this.ataque = { tipo, t: 0, dir: dir.normalize(), pegou: false };
      this.avisar('olhar', 'Passar ao largo: saia do olhar cinzento, ou fique atrás de quem você socorreu!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'torpor' });
    } else if (tipo === 'pedras') {
      const n = this.surdo ? 4 : 3;
      const linhas = [];
      for (let i = 0; i < n; i++) {
        const brechas = [this.lim.z0 + 2 + Math.random() * (this.lim.z1 - this.lim.z0 - 4)];
        if (Math.random() < 0.6 || i === 0) brechas.push(this.lim.z0 + 2 + Math.random() * (this.lim.z1 - this.lim.z0 - 4));
        linhas.push({ inicio: i * (this.surdo ? 1.2 : 1.6), brechas, acertou: false });
      }
      this.ataque = { tipo, t: 0, linhas };
      this.avisar('pedras', 'Pedras rolando: passe pelas brechas ou pule (Espaço)!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
    } else {
      this.ataque = { tipo: 'portas', t: 0, deNorte: this.info.pos.z > (this.lim.z0 + this.lim.z1) / 2, acertou: false };
      this.avisar('portas', 'As portas batem: veja o pó nas soleiras e pule a onda (Espaço)!');
    }
  }

  private cansar(duracao: number) {
    this.ataque = { tipo: 'cansado', t: 0, duracao };
    this.espera = this.surdo ? 1.4 : 2.2;
  }

  private cancelar() {
    this.ataque = null;
    this.perigosa = false;
    this.espera = 1.6;
  }

  private executar(dt: number, paraJogador: THREE.Vector3, dist: number): THREE.Vector3 {
    const a = this.ataque!;
    a.t += dt;
    const vel = new THREE.Vector3();
    switch (a.tipo) {
      case 'olhar': {
        this.estado = 'preparar';
        this.alerta = 'Passar ao largo: saia do olhar cinzento!';
        const mira = 1.3, dura = 1.7;
        if (a.t > mira && !a.pegou && !this.info.invulneravel) {
          const para = this.info.pos.clone().sub(this.pos).setY(0);
          const d = para.length();
          if (d < RAIO_OLHAR && d > 0.01 && para.normalize().dot(a.dir) > Math.cos(ABERTURA_OLHAR) && !this.protegido(this.info.pos)) {
            a.pegou = true;
            this.impactos.push({ dano: 0, de: this.pos.clone(), indiferenca: 4, sussurro: frase() });
          }
        }
        if (a.t > mira + dura) this.cansar(0.9);
        vel.copy(a.dir).multiplyScalar(a.t > mira ? 0.6 : 0); // passa ao largo, devagar
        break;
      }
      case 'pedras': {
        this.estado = 'preparar';
        this.alerta = 'Pedras rolando: brechas ou pulo!';
        const largura = this.lim.x1 - this.lim.x0 + 3;
        for (const l of a.linhas) {
          const x = this.lim.x1 - (a.t - l.inicio) * VEL_PEDRAS;
          if (a.t < l.inicio || l.acertou || x < this.lim.x0 - 2) continue;
          const p = this.info.pos;
          if (Math.abs(p.x - x) < 0.55 && this.info.noChao && !this.info.invulneravel && !this.info.esquivando && !l.brechas.some((b) => Math.abs(p.z - b) < 1.25)) {
            l.acertou = true;
            this.impactos.push({ dano: 1, de: new THREE.Vector3(x + 1, p.y, p.z), som: 'raio' });
          }
        }
        const ultima = a.linhas[a.linhas.length - 1];
        if (a.t - ultima.inicio > largura / VEL_PEDRAS) this.cansar(0.8);
        vel.copy(paraJogador).multiplyScalar(dist > 6 ? 0.5 : 0);
        break;
      }
      case 'portas': {
        this.estado = 'preparar';
        this.alerta = 'As portas batem: pule a onda!';
        const aviso = 1.0;
        if (a.t > aviso && a.t - dt <= aviso) this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
        const z = this.zOnda(a);
        if (a.t > aviso && !a.acertou && this.info.noChao && !this.info.invulneravel && Math.abs(this.info.pos.z - z) < 0.45) {
          a.acertou = true;
          this.impactos.push({ dano: 0.5, de: new THREE.Vector3(this.info.pos.x, this.info.pos.y, z) });
        }
        if (a.t > aviso + (this.lim.z1 - this.lim.z0) / VEL_ONDA) this.cansar(0.9);
        break;
      }
      case 'cansado':
        this.estado = 'perseguir';
        if (a.t > a.duracao) this.ataque = null;
        break;
    }
    return vel;
  }

  private zOnda(a: { t: number; deNorte: boolean }) {
    const andou = Math.max(0, a.t - 1) * VEL_ONDA;
    return a.deNorte ? this.lim.z0 + andou : this.lim.z1 - andou;
  }

  private avisar(chave: string, texto: string) {
    if (this.avisados.has(chave)) return;
    this.avisados.add(chave);
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: texto });
  }

  private atualizarEfeitos(dt: number) {
    const a = this.ataque;
    const chao = (x: number, z: number) => (this.fis ? this.fis.altura(x, z) : this.pos.y);

    // o olhar: cresce na mira, depois pesa cinzento
    const ol = a?.tipo === 'olhar' ? a : null;
    this.cone.visible = !!ol;
    if (ol) {
      this.cone.position.set(this.pos.x, chao(this.pos.x, this.pos.z) + 0.06, this.pos.z);
      this.cone.rotation.y = Math.atan2(-ol.dir.z, ol.dir.x);
      const k = Math.min(1, ol.t / 1.3);
      this.cone.scale.setScalar(0.3 + k * 0.7);
      (this.cone.material as THREE.MeshBasicMaterial).opacity = ol.t < 1.3 ? 0.18 + k * 0.25 + Math.sin(ol.t * 16) * 0.06 : 0.62;
    }

    // as pedras rolando (desviam do cruzeiro, que é pedra também, mas fica de pé)
    const pd = a?.tipo === 'pedras' ? a : null;
    let n = 0;
    if (pd) {
      const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), um = new THREE.Vector3(1, 1, 1);
      for (const l of pd.linhas) {
        const x = this.lim.x1 - (pd.t - l.inicio) * VEL_PEDRAS;
        if (pd.t < l.inicio || x < this.lim.x0 - 2) continue;
        for (let z = this.lim.z0 + 0.4; z < this.lim.z1 - 0.3 && n < this.pedras.instanceMatrix.count; z += 0.7) {
          if (l.brechas.some((b) => Math.abs(z - b) < 1.25)) continue;
          if (this.cruzeiro && Math.hypot(x - this.cruzeiro.x, z - this.cruzeiro.z) < 1.7) continue;
          e.set(0, 0, (pd.t - l.inicio) * 9 + z);
          mat.compose(new THREE.Vector3(x, chao(x, z) + 0.27, z), q.setFromEuler(e), um);
          this.pedras.setMatrixAt(n++, mat);
        }
      }
      this.pedras.instanceMatrix.needsUpdate = true;
    }
    this.pedras.count = n;

    // as portas que batem: o pó nas soleiras, depois a onda
    const pt = a?.tipo === 'portas' ? a : null;
    this.onda.visible = !!pt && pt.t > 1;
    if (pt) {
      const z0 = pt.deNorte ? this.lim.z0 : this.lim.z1;
      this.po.forEach((p, i) => {
        p.visible = pt.t < 1.3;
        const x = this.lim.x0 + ((i + 0.5) / this.po.length) * (this.lim.x1 - this.lim.x0);
        const k = (pt.t * 1.6 + i * 0.13) % 1;
        p.position.set(x, chao(x, z0) + 0.3 + k * 0.5, z0 + (pt.deNorte ? 0.4 : -0.4));
        p.scale.setScalar(0.5 + k * 0.9);
      });
      const z = this.zOnda(pt);
      this.onda.position.set((this.lim.x0 + this.lim.x1) / 2, chao(this.pos.x, z) + 0.28, z);
    } else for (const p of this.po) p.visible = false;

    // a vitória: o coração de carne bate no ar, e os escombros caem e somem no chão
    if (this.tFim >= 0) {
      this.tFim += dt;
      const bate = 1 + Math.max(0, Math.sin(this.tFim * 7)) ** 8 * 0.25;
      this.carne.scale.setScalar(bate * Math.min(1, this.tFim * 2));
      this.carne.position.y += dt * 0.12;
      this.carne.rotation.y += dt * 0.6;
      this.carne.visible = this.tFim < 6;
      const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1);
      let k = 0;
      for (const c of this.queda) {
        c.v.y -= 9.8 * dt;
        c.p.addScaledVector(c.v, dt);
        const h = chao(c.p.x, c.p.z) + 0.16 - Math.max(0, this.tFim - 2.5) * 0.2;
        if (c.p.y < h) {
          c.p.y = h;
          c.v.set(0, 0, 0);
        }
        mat.compose(c.p, q.setFromEuler(new THREE.Euler(c.p.x, c.p.z, 0)), um);
        if (this.tFim < 4.2) this.escombros.setMatrixAt(k++, mat);
      }
      this.escombros.count = k;
      this.escombros.instanceMatrix.needsUpdate = true;
    }
  }

  /** O cruzeiro do largo (as pedras rolando desviam dele). */
  cruzeiro: THREE.Vector3 | null = null;

  /** Remove o chefão e seus efeitos da cena (luta reiniciada). */
  descartar() {
    this.efeitos.parent?.remove(this.efeitos);
    this.raiz.parent?.remove(this.raiz);
  }
}

const FRASES = [
  'Não é comigo.',
  'Alguém vai ajudar. Alguém sempre ajuda.',
  'Eu tenho os meus problemas.',
  'Se eu parar para cada um, não chego a lugar nenhum.',
  'Não olhe. É mais fácil.',
  'Ele deve ter feito por merecer.',
];
function frase() {
  return FRASES[Math.floor(Math.random() * FRASES.length)];
}
