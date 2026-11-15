import * as THREE from 'three';
import { Modelo } from '../voxel/Modelo';
import { Fisica } from './Peregrino';
import { ResultadoGolpe, Sombra } from './Sombra';

/**
 * Mamom, o Guardião da Avareza: chefão da cripta (Mt 6,24 — "não podeis servir a Deus e a Mamom").
 *
 * Ataques:
 *  - Investida em série (2, ou 3 na fase 2), parando ao bater na parede.
 *  - Golpe sísmico: salta e cai, soltando uma onda pelo chão. Pule para escapar.
 *  - Corrente da Cobiça (o vício dele): mira e lança uma corrente dourada. Se pegar, puxa o peregrino,
 *    rouba energia espiritual e o alimenta. Esquive para o lado (C) ou interrompa com a luz enquanto ele mira.
 *  - Chuva de Moedas (fase 2): marcas douradas no chão; as moedas caem logo depois.
 * A couraça só cede à luz (atordoa); atordoado, o cajado fere. Depois do atordoamento ele revida com o golpe sísmico.
 */

export interface Impacto {
  dano: number;
  de: THREE.Vector3;
  /** Energia espiritual roubada. */
  roubo?: number;
  /** Puxa o peregrino até este ponto. */
  puxarPara?: THREE.Vector3;
  aviso?: string;
  /** Deixa o peregrino pesado (o torpor da acídia). */
  torpor?: boolean;
  som?: 'onda' | 'corrente' | 'moedas' | 'rugido' | 'roubo' | 'sol' | 'raio' | 'torpor' | 'dissolver';
  /** Peso de banquete que cai sobre o peregrino (a chuva de iguarias da Gula). */
  peso?: number;
  /** Arrasta o peregrino neste quadro (deslocamento em metros: o devorar da Gula). */
  arrasto?: THREE.Vector3;
  /** O vício sussurra ao peregrino. */
  sussurro?: string;
  /** Segundos de indiferença (o olhar do Coração de Pedra): não socorre e anda devagar. */
  indiferenca?: number;
  /** Quanto a brasa do peregrino sobe (ou desce, se negativo): a Ira acende quem responde no mesmo tom. */
  brasa?: number;
  /** Uma velocidade que joga o peregrino para longe (m/s), que passa pela física: o punho do mar, o vagalhão. */
  empurrao?: THREE.Vector3;
}

export interface InfoJogador {
  pos: THREE.Vector3;
  noChao: boolean;
  esquivando: boolean;
  invulneravel: boolean;
  /** Quanto o peregrino carrega (o devorar da Gula puxa mais forte quem pesa mais). */
  peso?: number;
  /** Está rezando (a oração guarda o coração da provocação da Ira). */
  rezando?: boolean;
  /** A brasa do peregrino (0 a 100) e se ele está irado (a brasa encheu e ainda não esfriou). */
  brasa?: number;
  irado?: boolean;
}

/** O que o jogo precisa de um chefão: o que ele acertou, o aviso da barra e onde está o peregrino. */
export interface Chefe extends Sombra {
  readonly impactos: Impacto[];
  alerta: string;
  sentir(info: InfoJogador): void;
}

type Ataque =
  | { tipo: 'investida'; fase: 'preparar' | 'correr' | 'pausa'; t: number; restantes: number; dir: THREE.Vector3 }
  | { tipo: 'impacto'; fase: 'subir' | 'cair' | 'onda'; t: number; ondas: number[]; acertou: boolean }
  | { tipo: 'corrente'; fase: 'mirar' | 'lancar' | 'recolher'; t: number; dir: THREE.Vector3; alcance: number }
  | { tipo: 'moedas'; t: number; pontos: THREE.Vector3[]; caiu: boolean; acertou: boolean }
  | { tipo: 'cansado'; t: number; duracao: number };

const OURO = 0xd8b45a;
const ALCANCE_CORRENTE = 15;
const ELOS = 26;
const VEL_ONDA = 8.5;
const RAIO_MAX_ONDA = 13;

function geometriaCoroa() {
  const m = new Modelo();
  const ouro = (x: number, y: number, z: number) => ((x + y + z) % 2 ? OURO : 0xc29a3e);
  // aro da coroa
  for (let x = -4; x <= 4; x++)
    for (let z = -4; z <= 4; z++) {
      const r = Math.hypot(x, z);
      if (r > 3.2 && r < 4.6) m.caixa(x, 16, z, 1, 2, 1, ouro);
    }
  // pontas
  for (const [x, z] of [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, 3], [-3, 3], [3, -3]]) m.caixa(x, 18, z, 1, 2, 1, ouro);
  m.ponto(0, 17, 5, 0xc02838).ponto(-3, 17, 3, 0x2a7ac0).ponto(3, 17, 3, 0x2a9a4a); // gemas
  // colar de moedas sobre o peito
  for (let x = -4; x <= 4; x++) m.ponto(x, 9 + Math.round(Math.abs(x) * 0.4), 6, (x & 1) === 0 ? OURO : 0xe8c870);
  m.caixa(-1, 6, 6, 3, 3, 1, OURO).ponto(0, 7, 7, 0xfff0b0); // medalhão
  return m.geometria(0.1, [0, 0, 0]);
}

export class Guardiao extends Sombra implements Chefe {
  /** Efeitos no chão e no ar (onda, corrente, moedas). A cripta adiciona ao seu grupo. */
  readonly efeitos = new THREE.Group();
  /** Acertos no peregrino deste quadro; o jogo consome e aplica. */
  readonly impactos: Impacto[] = [];
  /** Texto curto para a barra do chefão. */
  alerta = '';
  private ataque: Ataque | null = null;
  private ultimo = '';
  private espera = 1.4;
  private info: InfoJogador = { pos: new THREE.Vector3(), noChao: true, esquivando: false, invulneravel: false };
  private fis: Fisica | null = null;
  private bateu = false;
  private vingar = false;
  private enfurecido = false;
  private avisados = new Set<string>();
  private matOlhos = new THREE.MeshBasicMaterial({ color: 0xff5a3c });

  private onda: THREE.Mesh;
  private elos: THREE.Mesh[] = [];
  private mira: THREE.Mesh;
  private marcas: THREE.Mesh[] = [];
  private moedas: THREE.Group[] = [];

  constructor(id: string, casa: THREE.Vector3) {
    super(id, casa, { escala: 2, vida: 30, blindada: true, adormecida: true, visao: 0 });
    const coroa = new THREE.Mesh(geometriaCoroa(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a1e04 }));
    coroa.castShadow = true;
    this.corpo.add(coroa);
    for (const o of this.olhos) o.material = this.matOlhos;

    this.onda = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xa070ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.onda.visible = false;
    this.efeitos.add(this.onda);

    const geoElo = new THREE.BoxGeometry(0.16, 0.16, 0.42);
    const matElo = new THREE.MeshLambertMaterial({ color: OURO, emissive: 0x4a3408 });
    for (let i = 0; i < ELOS; i++) {
      const e = new THREE.Mesh(geoElo, matElo);
      e.visible = false;
      this.elos.push(e);
      this.efeitos.add(e);
    }
    this.mira = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 1).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.mira.visible = false;
    this.efeitos.add(this.mira);

    const geoMarca = new THREE.CircleGeometry(1.2, 28).rotateX(-Math.PI / 2);
    const geoMoeda = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10);
    const matMoeda = new THREE.MeshLambertMaterial({ color: OURO, emissive: 0x5a4010 });
    for (let i = 0; i < 8; i++) {
      const marca = new THREE.Mesh(
        geoMarca,
        new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      marca.visible = false;
      this.marcas.push(marca);
      const g = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const moeda = new THREE.Mesh(geoMoeda, matMoeda);
        moeda.position.set(Math.cos(k * 2.1) * 0.45 * (k % 3) * 0.6, k * 0.25, Math.sin(k * 2.1) * 0.45 * (k % 3) * 0.6);
        moeda.rotation.set(k, k * 0.7, 0);
        g.add(moeda);
      }
      g.visible = false;
      this.moedas.push(g);
      this.efeitos.add(marca, g);
    }
  }

  get fase2() {
    return this.vida <= this.vidaMax / 2;
  }

  /** O jogo informa onde está o peregrino antes de cada atualização. */
  sentir(info: InfoJogador) {
    this.info = info;
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    // no alto do salto, nada o alcança
    if (this.ataque?.tipo === 'impacto' && this.ataque.fase !== 'onda' && this.ativa) {
      this.flash = 0.1;
      this.corFlash.setRGB(0.5, 0.5, 0.6);
      return 'bloqueado';
    }
    const antes = this.estado;
    const r = super.ferir(dano, de, tipo);
    if (r === 'atordoado' || (antes === 'atordoada' && this.estado === 'recuar')) this.vingar = true;
    if (r === 'atordoado' || r === 'morreu') this.cancelar();
    return r;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fis = fis;
    super.atualizar(dt, fis, jogador);
    this.atualizarEfeitos(dt);
  }

  protected mover(dt: number, fis: Fisica, vel: THREE.Vector3) {
    this.bateu = super.mover(dt, fis, vel);
    return this.bateu;
  }

  protected alturaExtra() {
    const a = this.ataque;
    if (a?.tipo !== 'impacto') return 0;
    if (a.fase === 'subir') return Math.min(1, a.t / 0.55) * 2.8;
    if (a.fase === 'cair') return Math.max(0, 1 - a.t / 0.14) * 2.8;
    return 0;
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    this.duracaoAtordoada = this.fase2 ? 1.7 : 2.2;
    const base = this.estado === 'atordoada' || this.estado === 'desfazendo' || this.estado === 'vencida' || this.adormecida;
    this.matOlhos.color.setHex(this.fase2 || this.ataque?.tipo === 'corrente' ? 0xffc83a : 0xff5a3c);
    if (base) {
      this.alerta = this.estado === 'atordoada' ? 'Atordoado: golpeie com o cajado!' : '';
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.fase2 && !this.enfurecido) {
      this.enfurecido = true;
      this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'Mamom se enfurece!', som: 'rugido' });
    }
    // depois de atordoado, recua um instante e revida com o golpe sísmico
    if (this.estado === 'recuar' && !this.ataque) {
      if (this.t < 0.5) return paraJogador.clone().multiplyScalar(-2);
      this.estado = 'perseguir';
      if (this.vingar) {
        this.vingar = false;
        this.iniciar('impacto');
      }
    }
    if (!this.ataque) {
      this.alerta = 'Couraça de trevas: use a luz';
      this.estado = 'perseguir';
      this.espera -= dt;
      if (this.espera <= 0) this.escolher(dist);
      return paraJogador.clone().multiplyScalar(dist > 3 ? (this.fase2 ? 3 : 2.3) : 0);
    }
    return this.executar(dt, paraJogador, dist);
  }

  private escolher(dist: number) {
    const opcoes: string[] = [];
    if (dist > 6) opcoes.push('corrente', 'corrente', 'corrente', 'investida');
    else if (dist < 3.5) opcoes.push('impacto', 'impacto', 'investida', 'corrente');
    else opcoes.push('investida', 'corrente', 'corrente', 'impacto');
    if (this.fase2) opcoes.push('moedas', 'moedas');
    const validas = opcoes.filter((o) => o !== this.ultimo);
    this.iniciar(validas[Math.floor(Math.random() * validas.length)] as Ataque['tipo']);
  }

  private iniciar(tipo: Ataque['tipo']) {
    this.cancelar();
    this.ultimo = tipo;
    this.t = 0;
    switch (tipo) {
      case 'investida':
        this.ataque = { tipo, fase: 'preparar', t: 0, restantes: this.fase2 ? 3 : 2, dir: new THREE.Vector3() };
        break;
      case 'impacto':
        this.ataque = { tipo, fase: 'subir', t: 0, ondas: [], acertou: false };
        break;
      case 'corrente':
        this.ataque = { tipo, fase: 'mirar', t: 0, dir: new THREE.Vector3(), alcance: 0 };
        this.avisar('corrente', 'Corrente da Cobiça: esquive para o lado (C)!');
        this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'corrente' });
        break;
      case 'moedas': {
        const pontos: THREE.Vector3[] = [this.info.pos.clone()];
        for (let i = 0; pontos.length < 8 && i < 40; i++) {
          const a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * 5;
          const p = this.info.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
          if (this.fis && this.fis.altura(p.x, p.z) < 0.5 && pontos.every((q) => q.distanceTo(p) > 1.6)) pontos.push(p);
        }
        this.ataque = { tipo, t: 0, pontos, caiu: false, acertou: false };
        this.avisar('moedas', 'Chuva de Moedas: saia das marcas douradas!');
        break;
      }
      case 'cansado':
        this.ataque = { tipo, t: 0, duracao: 1 };
        break;
    }
  }

  private cansar(duracao: number) {
    this.cancelar();
    this.ataque = { tipo: 'cansado', t: 0, duracao };
    this.espera = this.fase2 ? 0.6 : 1.1;
  }

  private executar(dt: number, paraJogador: THREE.Vector3, dist: number): THREE.Vector3 {
    const a = this.ataque!;
    a.t += dt;
    const vel = new THREE.Vector3();
    switch (a.tipo) {
      case 'investida':
        this.alerta = 'Investida!';
        if (a.fase === 'preparar') {
          this.estado = 'preparar';
          vel.copy(paraJogador).multiplyScalar(-0.8);
          if (a.t > (this.fase2 ? 0.65 : 0.9)) {
            a.fase = 'correr';
            a.t = 0;
            a.dir.copy(paraJogador);
          }
        } else if (a.fase === 'correr') {
          this.estado = 'investir';
          this.perigosa = true;
          vel.copy(a.dir).multiplyScalar(this.fase2 ? 13 : 11.5);
          if (a.t > 0.55 || (this.bateu && a.t > 0.05)) {
            this.perigosa = false;
            a.fase = 'pausa';
            a.t = 0;
            a.restantes--;
          }
        } else {
          this.estado = 'preparar';
          if (a.t > 0.3) {
            if (a.restantes > 0) {
              a.fase = 'preparar';
              a.t = 0.25; // as seguintes vêm mais rápido
            } else this.cansar(1.3);
          }
        }
        break;

      case 'impacto':
        this.estado = 'preparar';
        if (a.fase === 'subir') {
          this.alerta = 'Ele vai cair: prepare o pulo!';
          vel.copy(paraJogador).multiplyScalar(Math.min(dist, 4) * 0.55);
          if (a.t > 0.7) {
            a.fase = 'cair';
            a.t = 0;
          }
        } else if (a.fase === 'cair') {
          if (a.t > 0.14) {
            a.fase = 'onda';
            a.t = 0;
            a.ondas.push(0);
            if (this.fase2) a.ondas.push(-0.55);
            this.impactos.push({ dano: dist < 2 ? 0.5 : 0, de: this.pos.clone(), som: 'onda' });
            this.avisar('onda', 'Onda sísmica: pule (Espaço)!');
          }
        } else {
          this.alerta = 'Pule a onda (Espaço)!';
          for (let i = 0; i < a.ondas.length; i++) a.ondas[i] += dt * VEL_ONDA;
          if (!a.acertou && !this.info.invulneravel) {
            const d = Math.hypot(this.info.pos.x - this.pos.x, this.info.pos.z - this.pos.z);
            for (const r of a.ondas)
              if (r > 0 && Math.abs(d - r) < 0.7 && this.info.noChao) {
                a.acertou = true;
                this.impactos.push({ dano: 0.5, de: this.pos.clone() });
              }
          }
          if (a.ondas.every((r) => r > RAIO_MAX_ONDA)) this.cansar(0.9);
        }
        break;

      case 'corrente': {
        const peito = this.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
        if (a.fase === 'mirar') {
          this.estado = 'preparar';
          this.alerta = 'Corrente da Cobiça: esquive para o lado (C)!';
          // acompanha o peregrino e trava a mira um pouco antes de lançar
          if (a.t < 0.85) a.dir.copy(this.info.pos).add(new THREE.Vector3(0, 0.9, 0)).sub(peito).normalize();
          if (a.t > 1.3) {
            a.fase = 'lancar';
            a.t = 0;
          }
        } else if (a.fase === 'lancar') {
          this.estado = 'preparar';
          a.alcance = Math.min(ALCANCE_CORRENTE, a.alcance + dt * 24);
          const ponta = peito.clone().addScaledVector(a.dir, a.alcance);
          const bateuNaParede = this.fis ? this.fis.altura(ponta.x, ponta.z) > ponta.y : false;
          const d = ponta.distanceTo(this.info.pos.clone().add(new THREE.Vector3(0, 0.9, 0)));
          if (d < 0.95 && !this.info.esquivando && !this.info.invulneravel) {
            // pegou: puxa, rouba energia e se alimenta dela
            const ate = this.pos.clone().addScaledVector(a.dir.clone().setY(0).normalize(), 2.6);
            this.impactos.push({ dano: 1, de: this.pos.clone(), roubo: 30, puxarPara: ate, aviso: 'Mamom roubou sua energia!', som: 'roubo' });
            this.vida = Math.min(this.vidaMax, this.vida + 1);
            a.fase = 'recolher';
            a.t = 0;
          } else if (a.alcance >= ALCANCE_CORRENTE || bateuNaParede) {
            a.fase = 'recolher';
            a.t = 0;
          }
        } else {
          a.alcance = Math.max(0, a.alcance - dt * 30);
          if (a.alcance <= 0) this.cansar(this.fase2 ? 0.6 : 0.9);
        }
        break;
      }

      case 'moedas':
        this.estado = 'preparar';
        this.alerta = 'Saia das marcas douradas!';
        if (!a.caiu && a.t > 1.45) {
          a.caiu = true;
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'moedas' });
          if (!this.info.invulneravel)
            for (const p of a.pontos)
              if (Math.hypot(p.x - this.info.pos.x, p.z - this.info.pos.z) < 1.25) {
                a.acertou = true;
                this.impactos.push({ dano: 0.5, de: p.clone() });
                break;
              }
        }
        if (a.t > 2.1) this.cansar(0.8);
        break;

      case 'cansado':
        this.estado = 'perseguir';
        this.alerta = 'Couraça de trevas: use a luz';
        if (a.t > a.duracao) this.ataque = null;
        break;
    }
    return vel;
  }

  private avisar(chave: string, texto: string) {
    if (this.avisados.has(chave)) return;
    this.avisados.add(chave);
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: texto });
  }

  /** Interrompe o ataque atual (atordoado, morto ou trocando de ataque). */
  derrotar(): ResultadoGolpe {
    const r = super.derrotar();
    if (r === 'morreu') this.cancelar();
    return r;
  }

  private cancelar() {
    this.ataque = null;
    this.perigosa = false;
  }

  private atualizarEfeitos(dt: number) {
    const a = this.ataque;
    // onda sísmica
    if (a?.tipo === 'impacto' && a.fase === 'onda') {
      const r = Math.max(...a.ondas);
      this.onda.visible = r > 0;
      this.onda.position.set(this.pos.x, this.pos.y - 0.3, this.pos.z);
      this.onda.scale.setScalar(Math.max(0.1, r));
      (this.onda.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.max(0, 1 - r / RAIO_MAX_ONDA);
      // segunda onda: usa a mesma malha, piscando, quando a primeira já passou
      if (a.ondas.length > 1 && a.ondas[0] > RAIO_MAX_ONDA && a.ondas[1] > 0) this.onda.scale.setScalar(a.ondas[1]);
    } else this.onda.visible = false;

    // corrente da cobiça
    const corrente = a?.tipo === 'corrente' ? a : null;
    const peito = this.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
    this.mira.visible = !!corrente && corrente.fase === 'mirar';
    if (corrente && corrente.fase === 'mirar') {
      this.mira.position.copy(peito);
      this.mira.lookAt(peito.clone().add(corrente.dir));
      this.mira.scale.set(1, 1, ALCANCE_CORRENTE);
      (this.mira.material as THREE.MeshBasicMaterial).opacity = corrente.t > 0.85 ? 0.4 + 0.4 * Math.abs(Math.sin(corrente.t * 30)) : 0.3;
    }
    for (let i = 0; i < ELOS; i++) {
      const e = this.elos[i];
      const dist = (i / ELOS) * ALCANCE_CORRENTE;
      e.visible = !!corrente && corrente.fase !== 'mirar' && dist < corrente.alcance;
      if (e.visible && corrente) {
        e.position.copy(peito).addScaledVector(corrente.dir, dist);
        e.lookAt(e.position.clone().add(corrente.dir));
        e.rotateZ(i % 2 ? Math.PI / 2 : 0);
      }
    }

    // chuva de moedas
    const chuva = a?.tipo === 'moedas' ? a : null;
    for (let i = 0; i < this.marcas.length; i++) {
      const p = chuva?.pontos[i];
      const marca = this.marcas[i], g = this.moedas[i];
      marca.visible = !!p;
      g.visible = !!p && chuva!.t > 1.05;
      if (!p || !chuva) continue;
      const chao = this.fis ? this.fis.altura(p.x, p.z) : 0;
      marca.position.set(p.x, chao + 0.03, p.z);
      const k = Math.min(1, chuva.t / 1.45);
      (marca.material as THREE.MeshBasicMaterial).opacity = chuva.caiu ? Math.max(0, 0.6 - (chuva.t - 1.45) * 0.8) : 0.1 + k * 0.32 + Math.sin(chuva.t * 18) * 0.08 * k;
      marca.scale.setScalar(0.6 + k * 0.4);
      const queda = Math.max(0, 1 - (chuva.t - 1.05) / 0.4);
      g.position.set(p.x, chao + 0.05 + queda * 7, p.z);
      g.rotation.y += dt * 6;
    }
  }

  /** Remove o chefão e seus efeitos da cena (luta reiniciada). */
  descartar() {
    this.efeitos.parent?.remove(this.efeitos);
    this.raiz.parent?.remove(this.raiz);
  }
}
