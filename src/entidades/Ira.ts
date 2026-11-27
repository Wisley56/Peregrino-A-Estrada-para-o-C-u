import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Fisica } from './Peregrino';
import { ResultadoGolpe, Sombra } from './Sombra';
import { Chefe, Impacto, InfoJogador } from './Guardiao';
import type { LimitesArena } from './CoracaoDePedra';
import { AJUSTES } from '../config/ajustes';

/**
 * A Ira: o chefão do Mar da Tempestade, no naufrágio (At 27,41-44). Um vício capital (São Gregório Magno,
 * *Moralia* XXXI): a raiva que responde no mesmo tom e só faz a tempestade crescer. Sobe do mar entre o navio
 * encalhado e a praia de Malta: um tronco de água de tempestade, com espuma nos ombros, veias de brasa no peito, os
 * punhos fechados e a boca aberta num grito.
 *
 * "A resposta branda aplaca o furor, a palavra dura excita a ira" (Pr 15,1). A mecânica é essa:
 * - A água não se fere. Bater nela não dói nela: acende a brasa do peregrino (a barra "Brasa", no Jogo).
 * - Com a brasa cheia o peregrino está irado: cada golpe que ele der alimenta a Ira (ela se cura).
 * - A provocação: ela aponta e grita. Quem está rezando quando o grito chega guarda o coração; quem não está, acende.
 * - A fúria: três punhos de água, um depois do outro, onde o peregrino está. Quem passa pelos três sem revidar, sem
 *   ser pego e sem estar em brasa vence pela mansidão: a Ira se cansa, afunda até a cintura e a brasa do peito fica
 *   à mostra. Só então o cajado e a luz ferem.
 * - O punho (um só, com a marca na água) e o vagalhão (um anel de onda que se pula).
 * - Na metade da vida, "não se ponha o sol sobre a vossa ira" (Ef 4,26): ela cresce, os raios vermelhos caem nas
 *   marcas, e a provocação vem mais vezes.
 */

const S = 0.1;
/** Abaixo disso a brasa não impede a mansidão. */
export const BRASA_MANSA = 70;

type Ataque =
  | { tipo: 'punho'; t: number; alvos: THREE.Vector3[]; feitos: number }
  | { tipo: 'furia'; t: number; alvos: THREE.Vector3[]; feitos: number; revidou: boolean; pegou: boolean }
  | { tipo: 'vagalhao'; t: number; acertou: boolean }
  | { tipo: 'provocar'; t: number; gritou: boolean }
  | { tipo: 'raios'; t: number; alvos: THREE.Vector3[]; caiu: boolean }
  | { tipo: 'pausa'; t: number; duracao: number };

// ─────────────────────────── o modelo (voxel de 0,1 m; escala 2,6) ───────────────────────────

/** A água de tempestade: verde-chumbo escuro, com riscos de espuma onde a água vira. */
const agua = (x: number, y: number, z: number) => {
  const r = (x * 7 + y * 13 + z * 5) % 17;
  if (r === 0) return variar(0xbfd0d4, x, y, z, 0.04);
  return variar([0x1e3e4a, 0x18323e, 0x24485a, 0x1a3846][Math.abs(x + 2 * y + 3 * z) % 4], x, y, z, 0.05);
};
const espuma = (x: number, y: number, z: number) => variar((x + y + z) % 3 ? 0xdde8ea : 0xc4d4d8, x, y, z, 0.03);

const geos: Record<string, THREE.BufferGeometry> = {};
function geo(nome: string, fazer: () => THREE.BufferGeometry) {
  return (geos[nome] ??= fazer());
}

/** O tronco: a tromba-d'água torcida na base, o peito largo e os ombros de espuma. */
function tronco() {
  const m = new Modelo();
  // a base: um redemoinho que se alarga para cima
  for (let y = 0; y < 8; y++) {
    const r = 3 + y * 0.45;
    const giro = y * 0.7;
    for (let x = -6; x <= 6; x++)
      for (let z = -6; z <= 6; z++) {
        const d = Math.hypot(x, z);
        if (d > r) continue;
        const a = Math.atan2(z, x) + giro;
        m.ponto(x, y, z, Math.sin(a * 3) > 0.6 && d > r - 1.2 ? espuma(x, y, z) : agua(x, y, z));
      }
  }
  // o peito e a barriga
  m.caixa(-6, 8, -4, 12, 9, 8, agua);
  m.caixa(-7, 12, -4, 14, 5, 8, agua);
  // o vão do peito, onde fica a brasa (as veias e a brasa são malhas à parte)
  m.caixa(-2, 11, 2, 4, 4, 2, 0x0c1a20);
  // os ombros, curvados para a frente, com a crista de espuma
  m.caixa(-9, 16, -4, 18, 3, 8, agua);
  m.caixa(-9, 19, -3, 6, 1, 6, espuma).caixa(3, 19, -3, 6, 1, 6, espuma);
  m.caixa(-8, 18, -4, 2, 1, 1, espuma).caixa(6, 18, 3, 2, 1, 1, espuma);
  // o pescoço, grosso e enterrado nos ombros
  m.caixa(-3, 19, -2, 6, 2, 5, agua);
  return m.geometria(S, [0, 0, 0]);
}

/** A cabeça: a testa franzida, os olhos fundos, a boca aberta no grito e a crista de espuma que o vento leva. */
function cabeca() {
  const m = new Modelo();
  m.caixa(-4, 0, -3, 8, 7, 7, agua);
  m.caixa(-4, 5, 3, 8, 1, 1, 0x10222a); // o cenho, carregado
  m.ponto(-1, 4, 4, 0x10222a).ponto(0, 4, 4, 0x10222a); // a ruga entre os olhos
  m.caixa(-3, 4, 4, 2, 1, 1, null).caixa(1, 4, 4, 2, 1, 1, null); // as órbitas (os olhos são malhas à parte)
  m.caixa(-2, 0, 4, 4, 3, 1, null); // a boca aberta
  m.caixa(-2, 0, 3, 4, 3, 1, 0x3a0a08); // o fundo da boca, em brasa
  m.ponto(-2, 2, 4, 0xdde8ea).ponto(1, 2, 4, 0xdde8ea); // os dentes de espuma
  // a crista de espuma, varrida para trás pelo vento
  m.caixa(-3, 7, -3, 6, 1, 6, espuma);
  m.caixa(-2, 8, -4, 4, 1, 5, espuma).caixa(-1, 9, -6, 2, 1, 4, espuma).caixa(-1, 10, -8, 2, 1, 3, espuma);
  m.caixa(-4, 6, -5, 1, 2, 2, espuma).caixa(3, 6, -5, 1, 2, 2, espuma);
  return m.geometria(S, [0, 0, 0]);
}

/** Um braço com o punho fechado. O pivô fica no ombro: girar em x levanta e baixa o braço. */
function braco(lado: 1 | -1) {
  const m = new Modelo();
  const x0 = lado > 0 ? 0 : -4;
  m.caixa(x0, -10, -2, 4, 10, 4, agua);
  m.caixa(x0 - (lado > 0 ? 0 : 1), -14, -3, 5, 4, 5, agua); // o punho
  m.caixa(x0 - (lado > 0 ? 0 : 1), -11, 2, 5, 1, 1, 0x10222a); // os nós dos dedos
  m.caixa(x0, -2, -2, 4, 1, 4, espuma);
  return m.geometria(S, [0, 0, 0]);
}

/** As veias de brasa que racham o peito e os braços. */
function veias() {
  const m = new Modelo();
  const fio = (pts: [number, number][], z: number) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= n; i++) m.ponto(Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by - ay) * i) / n), z, 0xffffff);
    }
  };
  fio([[0, 11], [-2, 14], [-5, 15], [-7, 18]], 4);
  fio([[0, 11], [2, 13], [3, 16], [6, 17]], 4);
  fio([[-1, 11], [-3, 9], [-2, 6]], 4);
  fio([[1, 11], [4, 10], [5, 8]], 4);
  return m.geometria(S, [0, 0, 0]);
}

/** A brasa do peito: um carvão vermelho com as fendas acesas. É ela que se fere quando a Ira se cansa. */
function brasa() {
  const m = new Modelo();
  const c = (x: number, y: number, z: number) => ((x * 3 + y * 5 + z) % 4 === 0 ? 0xffb040 : variar(0xd8401a, x, y, z, 0.08));
  m.caixa(-2, 0, -1, 4, 3, 2, c).caixa(-1, 3, -1, 2, 1, 2, c).caixa(-1, -1, -1, 2, 1, 2, c);
  return m.geometria(S, [0, 1, 0]);
}

/** O punho de água que sobe do mar e cai onde estava a marca. */
function punhoDoMar() {
  const m = new Modelo();
  m.caixa(-6, 0, -5, 12, 9, 10, agua);
  m.caixa(-6, 9, -5, 12, 1, 10, espuma);
  m.caixa(-7, 0, -6, 1, 9, 12, espuma).caixa(6, 0, -6, 1, 9, 12, espuma); // a espuma que escorre pelos lados
  m.caixa(-6, 4, 5, 12, 1, 1, 0x10222a).caixa(-6, 7, 5, 12, 1, 1, 0x10222a); // as dobras dos dedos
  m.caixa(-4, -14, -3, 8, 14, 6, agua); // o pulso, que sai da água
  return m.geometria(S * 2, [0, 0, 0]);
}

export class Ira extends Sombra implements Chefe {
  readonly efeitos = new THREE.Group();
  readonly impactos: Impacto[] = [];
  alerta = '';
  readonly mensagemBloqueio: string = 'A água não se fere, e quem se acende é você. Não revide: esquive, reze e deixe a fúria passar.';
  private ataque: Ataque | null = null;
  private ultimo = '';
  private espera = 3.2;
  /** Ataques desde a última fúria (a fúria vem a cada dois ou três). */
  private semFuria = 0;
  private cresceu = false;
  private avisados = new Set<string>();
  private info: InfoJogador = { pos: new THREE.Vector3(), noChao: true, esquivando: false, invulneravel: false };
  private fis: Fisica | null = null;

  private cabecaM: THREE.Mesh;
  private bracoE = new THREE.Group();
  private bracoD = new THREE.Group();
  private veiasM: THREE.Mesh;
  private brasaM: THREE.Mesh;
  private matVeias = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xd83a1a });
  private matBrasa = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x801808 });
  private matOlhos = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
  private escalaViva = 1;

  // os efeitos na água
  private marcas: THREE.Mesh[] = [];
  private punhos: THREE.Mesh[] = [];
  private anel: THREE.Mesh;
  private raiosM: THREE.Mesh[] = [];
  private respingos: THREE.InstancedMesh;
  private gotas: { p: THREE.Vector3; v: THREE.Vector3; vida: number }[] = [];
  private tFim = -1;

  constructor(id: string, casa: THREE.Vector3, private readonly lim: LimitesArena) {
    super(id, casa, { escala: AJUSTES.chefoes.ira.escala, vida: AJUSTES.chefoes.ira.vida, adormecida: true, visao: 90 });
    this.corpo.geometry = geo('tronco', tronco);
    this.duracaoAtordoada = AJUSTES.chefoes.ira.tempoCansada;
    this.cabecaM = new THREE.Mesh(geo('cabeca', cabeca), this.material);
    this.cabecaM.position.set(0, 20.5 * S, 0.8 * S);
    const be = new THREE.Mesh(geo('bracoE', () => braco(-1)), this.material);
    const bd = new THREE.Mesh(geo('bracoD', () => braco(1)), this.material);
    this.bracoE.position.set(-9 * S, 18 * S, 0);
    this.bracoD.position.set(9 * S, 18 * S, 0);
    this.bracoE.add(be);
    this.bracoD.add(bd);
    this.veiasM = new THREE.Mesh(geo('veias', veias), this.matVeias);
    this.brasaM = new THREE.Mesh(geo('brasa', brasa), this.matBrasa);
    this.brasaM.position.set(0, 12 * S, 3.5 * S);
    this.brasaM.scale.setScalar(1.4);
    this.corpo.add(this.cabecaM, this.bracoE, this.bracoD, this.veiasM, this.brasaM);
    for (const m of [this.corpo, this.cabecaM, be, bd]) m.castShadow = true;
    // os olhos fundos, acesos de raiva
    this.cabecaM.add(...this.olhos);
    this.olhos[0].position.set(-2 * S, 4.5 * S, 4.2 * S);
    this.olhos[1].position.set(2 * S, 4.5 * S, 4.2 * S);
    for (const o of this.olhos) {
      o.material = this.matOlhos;
      o.scale.set(0.9, 0.45, 1);
    }

    // as marcas precisam se ver no mundo cinzento: claras e somadas à luz, não só vermelhas
    const matMarca = new THREE.MeshBasicMaterial({ color: 0xffc8a0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const matPunho = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x16303a });
    for (let i = 0; i < 5; i++) {
      const marca = new THREE.Mesh(new THREE.RingGeometry(AJUSTES.chefoes.ira.raioPunho * 0.72, AJUSTES.chefoes.ira.raioPunho, 32).rotateX(-Math.PI / 2), matMarca.clone());
      const miolo = new THREE.Mesh(new THREE.CircleGeometry(AJUSTES.chefoes.ira.raioPunho * 0.72, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff9a60, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
      marca.add(miolo);
      marca.visible = false;
      this.marcas.push(marca);
      const raio = new THREE.Mesh(new THREE.BoxGeometry(0.35, 22, 0.35).translate(0, 11, 0), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.9 }));
      raio.visible = false;
      this.raiosM.push(raio);
    }
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(geo('punhoDoMar', punhoDoMar), matPunho);
      p.visible = false;
      p.castShadow = true;
      this.punhos.push(p);
    }
    this.anel = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.32, 6, 48).rotateX(Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x2a5866, emissive: 0x0a1a20, transparent: true, opacity: 0.85 }),
    );
    this.anel.visible = false;
    this.respingos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xe6eef0 }), 120);
    this.respingos.count = 0;
    this.respingos.frustumCulled = false;
    this.efeitos.add(...this.marcas, ...this.punhos, ...this.raiosM, this.anel, this.respingos);
  }

  get fase2() {
    return this.vida <= this.vidaMax / 2;
  }

  /** Cansada pela mansidão: afundou até a cintura e a brasa do peito está à mostra. */
  get exposta() {
    return this.estado === 'atordoada';
  }

  get raioCorpo() {
    return 0.55 * this.escala * this.escalaViva;
  }

  get raioContato() {
    return 0.65 * this.escala * this.escalaViva;
  }

  centro(destino = new THREE.Vector3()) {
    // a mira vai ao peito, onde está a brasa
    return destino.copy(this.pos).add(new THREE.Vector3(0, (this.exposta ? 0.9 : 1.3) * this.escala * this.escalaViva, 0));
  }

  sentir(info: InfoJogador) {
    this.info = info;
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    if (this.exposta) {
      const r = super.ferir(dano, de, tipo);
      this.empurrao.multiplyScalar(0.15);
      if (r === 'ferido') this.estado = 'atordoada'; // continua cansada até o tempo acabar
      // passou da metade: ela se levanta na hora, maior (a fase 2 é um momento à parte)
      if (r === 'ferido' && !this.cresceu && this.fase2) {
        this.estado = 'perseguir';
        this.t = 0;
      }
      if (r === 'morreu') this.cancelar();
      return r;
    }
    this.flash = 0.12;
    if (this.ataque?.tipo === 'furia') this.ataque.revidou = true;
    if (this.info.irado) {
      // o golpe de quem está em brasa alimenta a tempestade
      this.vida = Math.min(this.vidaMax, this.vida + 1.5);
      this.corFlash.setRGB(0.9, 0.25, 0.1);
      this.impactos.push({ dano: 0, de: this.pos.clone(), brasa: 4, aviso: 'Golpe de raiva: a Ira se alimenta dele. Reze (R) para esfriar a brasa.', som: 'rugido' });
    } else {
      this.corFlash.setRGB(0.4, 0.55, 0.6);
      this.impactos.push({ dano: 0, de: this.pos.clone(), brasa: tipo === 'luz' ? 5 : 8 });
      if (tipo === 'luz') this.avisar('luz', this.mensagemBloqueio);
    }
    return 'bloqueado';
  }

  derrotar(): ResultadoGolpe {
    const r = super.derrotar();
    if (r === 'morreu') this.cancelar();
    return r;
  }

  protected desfazer(): ResultadoGolpe {
    const r = super.desfazer();
    // a tempestade se desfaz em chuva mansa: a água cai de volta no mar, e a brasa se apaga
    this.tFim = 0;
    this.gotas = [];
    for (let i = 0; i < 120; i++) {
      const a = i * 2.39996, r0 = 0.4 + (i % 7) * 0.3;
      this.gotas.push({
        p: this.pos.clone().add(new THREE.Vector3(Math.cos(a) * r0, 1 + (i % 13) * 0.45, Math.sin(a) * r0)),
        v: new THREE.Vector3(Math.cos(a) * (1.5 + (i % 3)), 2 + (i % 5), Math.sin(a) * (1.5 + (i % 3))),
        vida: 2.5,
      });
    }
    return r;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fis = fis;
    super.atualizar(dt, fis, jogador);
    const m = 3;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, this.lim.x0 + m, this.lim.x1 - m);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, this.lim.z0 + m, this.lim.z1 - m);
    this.raiz.position.x = this.pos.x;
    this.raiz.position.z = this.pos.z;
    // as veias e os olhos: mais acesos com a fúria; quase apagados quando ela se cansa
    const pulso = (Math.sin(this.t * (this.fase2 ? 9 : 5)) + 1) / 2;
    const fogo = this.exposta ? 0.25 : this.ataque?.tipo === 'furia' || this.ataque?.tipo === 'provocar' ? 1 : 0.55 + pulso * 0.3;
    this.matVeias.color.setRGB(0.85 * fogo + 0.1, 0.22 * fogo, 0.06 * fogo);
    this.matOlhos.color.setRGB(1, 0.35 * fogo + 0.1, 0.12 * fogo);
    const b = this.exposta ? 0.7 + pulso * 0.3 : 0.2;
    this.matBrasa.emissive.setRGB(b, b * 0.25, 0.02);
    this.brasaM.visible = this.exposta || this.estado === 'desfazendo';
    // cansada, a água fica escura e quieta: o que brilha é só a brasa do peito
    if (this.ativa && this.flash <= 0) this.material.emissive.setRGB(this.exposta ? 0.01 : 0.03 + 0.05 * fogo, 0.01, this.exposta ? 0.03 : 0.01);
    if (this.cresceu) this.escalaViva += (1.22 - this.escalaViva) * Math.min(1, dt * 1.5);
    this.atualizarEfeitos(dt);
  }

  /** Sobe do fundo ao despertar; cansada, afunda até a cintura. */
  protected alturaExtra() {
    if (this.desperto < 1) return -(1 - this.desperto) * 7;
    return this.exposta ? -1.6 : -0.35 + Math.sin(this.fase * 1.4) * 0.18;
  }

  protected posar(paraJogador: THREE.Vector3) {
    if (!this.ativa) return;
    if (!this.exposta) this.raiz.rotation.y = Math.atan2(paraJogador.x, paraJogador.z);
    const respira = 1 + Math.sin(this.fase * 2.4) * 0.025;
    this.corpo.scale.set(this.escalaViva * respira, this.escalaViva * (2 - respira), this.escalaViva * respira);
    this.corpo.rotation.set(this.exposta ? 0.35 : 0.12, 0, this.exposta ? Math.sin(this.t * 1.5) * 0.04 : 0);
    this.cabecaM.rotation.x = this.exposta ? 0.5 : -0.15 + Math.sin(this.fase * 3) * 0.04;
    // os braços: em repouso, abertos e de punho fechado; os ataques os movem
    const a = this.ataque;
    let e = -0.25 + Math.sin(this.fase * 1.7) * 0.1, d = -0.25 + Math.sin(this.fase * 1.7 + 1) * 0.1;
    let ez = -0.35, dz = 0.35;
    if (this.exposta) {
      e = d = 0.15;
      ez = -0.1;
      dz = 0.1;
    } else if (a?.tipo === 'punho' || a?.tipo === 'furia') {
      // ergue um punho e o desce quando o do mar cai
      const ciclo = a.tipo === 'furia' ? 0.8 : 1.15;
      const k = (a.t % ciclo) / ciclo;
      const lado = a.feitos % 2;
      const golpe = k < 0.75 ? -2.6 * (k / 0.75) : -2.6 + 3.2 * ((k - 0.75) / 0.25);
      if (lado) d = golpe;
      else e = golpe;
    } else if (a?.tipo === 'vagalhao') {
      const k = Math.min(1, a.t / 0.9);
      e = d = a.t < 0.9 ? -2.8 * k : -2.8 + Math.min(1, (a.t - 0.9) * 5) * 3;
      ez = -0.6;
      dz = 0.6;
    } else if (a?.tipo === 'provocar') {
      d = -1.5; // aponta
      dz = 0.05;
      this.cabecaM.rotation.x = -0.35 + Math.sin(this.t * 22) * 0.05;
    } else if (a?.tipo === 'raios') {
      e = d = -3;
      ez = -0.3;
      dz = 0.3;
    }
    this.bracoE.rotation.set(e, 0, ez);
    this.bracoD.rotation.set(d, 0, dz);
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    if (this.estado === 'desfazendo' || this.estado === 'vencida' || this.adormecida) {
      this.alerta = '';
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.exposta) {
      this.alerta = 'A Ira se cansou: golpeie a brasa do peito (cajado ou luz)!';
      if (this.t > this.duracaoAtordoada) {
        this.estado = 'perseguir';
        this.t = 0;
        this.espera = 1.5;
        this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'A Ira se levanta de novo.', som: 'rugido' });
      }
      return new THREE.Vector3();
    }
    if (this.fase2 && !this.cresceu) {
      this.cresceu = true;
      this.cancelar();
      this.impactos.push({
        dano: 0, de: this.pos.clone(), som: 'rugido', brasa: 10,
        aviso: '"Não se ponha o sol sobre a vossa ira" (Ef 4,26). Ela cresce: raios caem nas marcas vermelhas.',
        sussurro: 'Você tem razão. Tem toda a razão. Bata!',
      });
    }
    if (!this.ataque) {
      this.alerta = (this.info.irado ? 'Você está em brasa: reze (R) antes de tudo. ' : '') + 'Não revide a fúria: só a mansidão a cansa';
      this.espera -= dt;
      if (this.espera <= 0) this.escolher();
      this.estado = 'perseguir';
      // fica a uma distância de quem grita: nem longe, nem perto
      return paraJogador.clone().multiplyScalar(dist > 11 ? 1.6 : dist < 6 ? -1.2 : 0);
    }
    return this.executar(dt);
  }

  /** Um ponto na água, dentro da arena, perto do peregrino. */
  private alvo(dx = 0, dz = 0) {
    const p = this.info.pos;
    return new THREE.Vector3(
      THREE.MathUtils.clamp(p.x + dx, this.lim.x0 + 1, this.lim.x1 - 1), p.y,
      THREE.MathUtils.clamp(p.z + dz, this.lim.z0 + 1, this.lim.z1 - 1),
    );
  }

  private escolher() {
    this.t = 0;
    let tipo: string;
    if (this.semFuria >= (this.fase2 ? 2 : 3) || (this.semFuria >= 2 && Math.random() < 0.4)) tipo = 'furia';
    else {
      const opcoes = ['punho', 'vagalhao', 'provocar', 'punho'];
      if (this.fase2) opcoes.push('raios', 'provocar', 'raios');
      const validas = opcoes.filter((o) => o !== this.ultimo);
      tipo = validas[Math.floor(Math.random() * validas.length)];
    }
    this.ultimo = tipo;
    this.semFuria = tipo === 'furia' ? 0 : this.semFuria + 1;
    if (tipo === 'furia') {
      this.ataque = { tipo: 'furia', t: 0, alvos: [], feitos: 0, revidou: false, pegou: false };
      this.avisar('furia', 'A fúria! Três punhos onde você estiver. Não revide: esquive (C) ou saia das marcas, e deixe passar.');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'rugido' });
    } else if (tipo === 'punho') {
      const alvos = this.fase2 ? [this.alvo(), this.alvo((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)] : [this.alvo()];
      this.ataque = { tipo: 'punho', t: 0, alvos, feitos: 0 };
      this.avisar('punho', 'O punho do mar: saia da marca vermelha!');
    } else if (tipo === 'vagalhao') {
      this.ataque = { tipo: 'vagalhao', t: 0, acertou: false };
      this.avisar('vagalhao', 'O vagalhão: pule o anel de onda (Espaço)!');
    } else if (tipo === 'provocar') {
      this.ataque = { tipo: 'provocar', t: 0, gritou: false };
      this.avisar('provocar', 'Ela vai provocar: reze (R) para guardar o coração, ou a brasa sobe.');
    } else {
      const alvos = [this.alvo()];
      for (let i = 0; i < 3; i++) alvos.push(this.alvo((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
      this.ataque = { tipo: 'raios', t: 0, alvos, caiu: false };
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'raio' });
    }
  }

  private cancelar() {
    this.ataque = null;
    this.perigosa = false;
    this.espera = 1.8;
  }

  private pausar(duracao: number) {
    this.ataque = { tipo: 'pausa', t: 0, duracao };
    this.espera = this.fase2 ? 1.5 : 2.2;
  }

  /** O punho do mar cai em `p`: fere quem está na marca e o joga para fora. */
  private cair(p: THREE.Vector3, dano = 1) {
    this.respingar(p, 18);
    this.impactos.push({ dano: 0, de: p.clone(), som: 'onda' });
    const d = Math.hypot(this.info.pos.x - p.x, this.info.pos.z - p.z);
    if (d < AJUSTES.chefoes.ira.raioPunho && !this.info.invulneravel && !this.info.esquivando) {
      const fora = new THREE.Vector3(this.info.pos.x - p.x, 0, this.info.pos.z - p.z);
      if (fora.lengthSq() < 0.01) fora.set(1, 0, 0);
      this.impactos.push({ dano, de: p.clone(), empurrao: fora.normalize().multiplyScalar(6), brasa: 12 });
      return true;
    }
    return false;
  }

  private executar(dt: number): THREE.Vector3 {
    const a = this.ataque!;
    a.t += dt;
    switch (a.tipo) {
      case 'punho': {
        this.estado = 'preparar';
        this.alerta = 'O punho do mar: saia da marca!';
        if (a.feitos === 0 && a.t > 1.15) {
          a.alvos.forEach((p) => this.cair(p));
          a.feitos = 1;
        }
        if (a.t > 1.9) this.pausar(0.8);
        break;
      }
      case 'furia': {
        this.estado = 'preparar';
        this.alerta = `A fúria (${Math.min(3, a.feitos + 1)} de 3): não revide!`;
        const ciclo = 0.8;
        // cada punho marca onde o peregrino está e cai 0,8 s depois
        if (a.alvos.length === a.feitos && a.feitos < 3) a.alvos.push(this.alvo());
        if (a.feitos < 3 && a.t > ciclo * (a.feitos + 1)) {
          if (this.cair(a.alvos[a.feitos], 0.5)) a.pegou = true;
          a.feitos++;
        }
        if (a.t > ciclo * 3 + 0.6) {
          if (!a.revidou && !a.pegou && !this.info.irado && (this.info.brasa ?? 0) < BRASA_MANSA) {
            this.estado = 'atordoada';
            this.t = 0;
            this.ataque = null;
            this.espera = 1.5;
            this.impactos.push({
              dano: 0, de: this.pos.clone(), som: 'rugido', brasa: -25,
              aviso: '"A resposta branda aplaca o furor" (Pr 15,1). A Ira se cansou: a brasa do peito está à mostra!',
            });
            return new THREE.Vector3();
          }
          if (a.revidou) {
            this.vida = Math.min(this.vidaMax, this.vida + 3);
            this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'Você revidou: a fúria se alimentou da sua.', sussurro: frase() });
          } else if (a.pegou) this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'A fúria pegou você. Na próxima, esquive e deixe passar.' });
          else this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'Com o coração em brasa não há mansidão: reze (R) para esfriar.' });
          this.pausar(0.8);
        }
        break;
      }
      case 'vagalhao': {
        this.estado = 'preparar';
        this.alerta = 'O vagalhão: pule o anel!';
        if (a.t > 0.9 && a.t - dt <= 0.9) {
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
          this.respingar(this.pos, 14);
        }
        const r = this.raioAnel(a.t);
        const d = Math.hypot(this.info.pos.x - this.pos.x, this.info.pos.z - this.pos.z);
        if (r > 0 && !a.acertou && Math.abs(d - r) < 0.5 && this.info.noChao && !this.info.invulneravel) {
          a.acertou = true;
          const fora = new THREE.Vector3(this.info.pos.x - this.pos.x, 0, this.info.pos.z - this.pos.z).normalize();
          this.impactos.push({ dano: 0.5, de: this.pos.clone(), empurrao: fora.multiplyScalar(8), brasa: 8 });
        }
        if (r > AJUSTES.chefoes.ira.anelMax) this.pausar(0.7);
        break;
      }
      case 'provocar': {
        this.estado = 'preparar';
        this.alerta = 'Ela vai provocar: reze (R)!';
        if (a.t > 1.3 && !a.gritou) {
          a.gritou = true;
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'rugido' });
          if (this.info.rezando) this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'O grito passa: a oração guardou o coração.' });
          else this.impactos.push({ dano: 0, de: this.pos.clone(), brasa: this.fase2 ? 30 : 22, sussurro: frase() });
        }
        if (a.t > 2.2) this.pausar(0.5);
        break;
      }
      case 'raios': {
        this.estado = 'preparar';
        this.alerta = 'Raios: saia das marcas!';
        if (a.t > 1.1 && !a.caiu) {
          a.caiu = true;
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'raio' });
          for (const p of a.alvos) {
            this.respingar(p, 6);
            if (Math.hypot(this.info.pos.x - p.x, this.info.pos.z - p.z) < AJUSTES.chefoes.ira.raioPunho * 0.75 && !this.info.invulneravel) {
              this.impactos.push({ dano: 0.5, de: p.clone(), brasa: 8 });
              break;
            }
          }
        }
        if (a.t > 1.7) this.pausar(0.8);
        break;
      }
      case 'pausa':
        this.estado = 'perseguir';
        if (a.t > a.duracao) this.ataque = null;
        break;
    }
    return new THREE.Vector3();
  }

  private raioAnel(t: number) {
    return t < 0.9 ? 0 : 1.5 + (t - 0.9) * AJUSTES.chefoes.ira.velAnel;
  }

  private respingar(p: THREE.Vector3, n: number) {
    for (let i = 0; i < n; i++) {
      if (this.gotas.length > 110) this.gotas.shift();
      const a = Math.random() * Math.PI * 2;
      this.gotas.push({
        p: new THREE.Vector3(p.x, this.agua(p.x, p.z), p.z),
        v: new THREE.Vector3(Math.cos(a) * (1 + Math.random() * 2.5), 3 + Math.random() * 4, Math.sin(a) * (1 + Math.random() * 2.5)),
        vida: 1.2,
      });
    }
  }

  private agua(x: number, z: number) {
    return this.fis?.nivelAgua?.(x, z) ?? this.pos.y;
  }

  private avisar(chave: string, texto: string) {
    if (this.avisados.has(chave)) return;
    this.avisados.add(chave);
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: texto });
  }

  private atualizarEfeitos(dt: number) {
    const a = this.ataque;
    // as marcas vermelhas na água, e os punhos que sobem do mar
    const marcas: { p: THREE.Vector3; k: number }[] = [];
    const punhos: { p: THREE.Vector3; k: number }[] = [];
    if (a?.tipo === 'punho') {
      for (const p of a.alvos) {
        if (a.t < 1.15) marcas.push({ p, k: a.t / 1.15 });
        punhos.push({ p, k: (a.t - 0.55) / 0.6 });
      }
    } else if (a?.tipo === 'furia') {
      a.alvos.forEach((p, i) => {
        const t0 = 0.8 * i, k = (a.t - t0) / 0.8;
        if (k < 1) marcas.push({ p, k: Math.max(0, k) });
        if (k > 0.35 && k < 1.6) punhos.push({ p, k: (k - 0.35) / 0.65 });
      });
    } else if (a?.tipo === 'raios' && a.t < 1.1) for (const p of a.alvos) marcas.push({ p, k: a.t / 1.1 });
    this.marcas.forEach((m, i) => {
      const x = marcas[i];
      m.visible = !!x;
      if (!x) return;
      m.position.set(x.p.x, this.agua(x.p.x, x.p.z) + 0.08, x.p.z);
      m.scale.setScalar(1.3 - x.k * 0.3);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 + x.k * 0.5 + Math.sin(x.k * 30) * 0.08;
    });
    this.punhos.forEach((m, i) => {
      const x = punhos[i];
      m.visible = !!x && x.k > -0.2 && x.k < 1.5;
      if (!m.visible || !x) return;
      // sobe do mar (k 0 → 0,7), fica no alto e cai (0,7 → 1), e afunda depois
      const k = x.k;
      const alto = k < 0.7 ? Math.max(0, k / 0.7) * 5 : k < 1 ? 5 - ((k - 0.7) / 0.3) * 5.2 : -0.2 - (k - 1) * 4;
      m.position.set(x.p.x, this.agua(x.p.x, x.p.z) + alto - 0.6, x.p.z);
      m.rotation.set(Math.PI, Math.atan2(x.p.x - this.pos.x, x.p.z - this.pos.z), 0);
    });
    // os raios vermelhos
    const rs = a?.tipo === 'raios' && a.t > 1.1 && a.t < 1.4 ? a : null;
    this.raiosM.forEach((m, i) => {
      const p = rs?.alvos[i];
      m.visible = !!p;
      if (p) {
        m.position.set(p.x, this.agua(p.x, p.z), p.z);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.9 - (rs!.t - 1.1) * 2.5;
      }
    });
    // o anel do vagalhão
    const vg = a?.tipo === 'vagalhao' ? a : null;
    const r = vg ? this.raioAnel(vg.t) : 0;
    this.anel.visible = r > 0;
    if (r > 0) {
      this.anel.position.set(this.pos.x, this.agua(this.pos.x, this.pos.z) + 0.15, this.pos.z);
      this.anel.scale.set(r, 1 + Math.sin(vg!.t * 9) * 0.15, r);
    }
    // os respingos
    if (this.tFim >= 0) this.tFim += dt;
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1);
    let n = 0;
    for (const g of this.gotas) {
      g.vida -= dt;
      g.v.y -= 9.8 * dt;
      g.p.addScaledVector(g.v, dt);
      if (g.vida > 0 && g.p.y > this.agua(g.p.x, g.p.z) - 0.3 && n < 120) {
        mat.compose(g.p, q, um.setScalar(Math.min(1, g.vida * 1.5)));
        this.respingos.setMatrixAt(n++, mat);
      }
    }
    this.gotas = this.gotas.filter((g) => g.vida > 0);
    this.respingos.count = n;
    this.respingos.instanceMatrix.needsUpdate = true;
  }

  /** Remove o chefão e seus efeitos da cena (luta reiniciada). */
  descartar() {
    this.efeitos.parent?.remove(this.efeitos);
    this.raiz.parent?.remove(this.raiz);
  }
}

const FRASES = [
  'Eles não te respeitam. Vai deixar?',
  'Quem cala consente. Responda!',
  'Você tem razão. Tem toda a razão.',
  'Se fosse com eles, eles não perdoariam.',
  'Bata primeiro. Depois se explica.',
  'Mansidão é coisa de fraco.',
  'Grite. Assim eles aprendem.',
];
function frase() {
  return FRASES[Math.floor(Math.random() * FRASES.length)];
}
