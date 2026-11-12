import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Fisica } from './Peregrino';
import { ResultadoGolpe, Sombra } from './Sombra';
import { Chefe, Impacto, InfoJogador } from './Guardiao';

/**
 * Acídia, o demônio do meio-dia (Sl 91,6: "nem o mal que devasta ao meio-dia"): chefão do Deserto das Vozes.
 * Os padres do deserto chamavam assim a tentação do cansaço da alma, que chega na hora mais quente
 * e faz tudo parecer sem sentido. Ele não grita: ele cansa.
 *
 * - Miragens: ele se multiplica em reflexos iguais a ele. Nenhum se fere, nem ele. Com a Ciência (E),
 *   os reflexos se desfazem e a forma verdadeira aparece; só então o cajado e a luz o ferem.
 * - Sol a pino: marcas de sol no chão; logo depois, os raios caem nelas (duas levas na fase 2).
 * - Torpor (o vício dele): um bocejo vira uma névoa lenta que persegue o peregrino. Se pegar, ele fica pesado
 *   (anda devagar, sem luz e sem Ciência) até rezar (R). A luz desfaz a névoa no ar.
 * - Onda de mormaço: um anel de calor que se abre no chão. Pule.
 * Na metade da vida, o meio-dia arde mais forte: um reflexo a mais e ataques mais rápidos.
 */

const S = 0.1;
const OLHOS = 0xffd060;

let geoCache: THREE.BufferGeometry | null = null;
function geometriaAcedia() {
  if (geoCache) return geoCache;
  const m = new Modelo();
  const veste = (x: number, y: number, z: number) => variar([0x6a5a46, 0x5a4c3c, 0x76664e][Math.abs(x + y * 3 + z) % 3], x, y, z, 0.05);
  const pele = (x: number, y: number, z: number) => variar(0x9a8a6e, x, y, z, 0.04);
  // a parte de baixo se desfaz como ar quente: estreita embaixo, ondulada
  for (let y = 0; y < 9; y++) {
    const r = 1.5 + y * 0.36;
    for (let x = -5; x <= 5; x++)
      for (let z = -5; z <= 5; z++) {
        const borda = Math.sin(x * 1.3 + y * 1.1) * 0.5 + Math.cos(z * 1.7 - y * 0.8) * 0.4;
        if ((x * x) / 1.1 + z * z <= (r + borda) ** 2) m.ponto(x, y, z, veste(x, y, z));
      }
  }
  // tronco caído para a frente, ombros largos e moles
  for (let y = 9; y < 15; y++)
    for (let x = -5; x <= 5; x++)
      for (let z = -3; z <= 3; z++) {
        const largura = 4.5 - Math.abs(y - 12) * 0.2;
        if ((x * x) / (largura * largura) + ((z - (y - 9) * 0.25) ** 2) / 9 <= 1) m.ponto(x, y, z, veste(x, y, z));
      }
  m.caixa(-6, 13, -1, 3, 2, 3, veste).caixa(4, 13, -1, 3, 2, 3, veste); // ombros caídos
  // braços compridos, pendurados até quase o chão, com dedos longos
  for (const lado of [-1, 1]) {
    const x = lado < 0 ? -7 : 5;
    m.caixa(x, 4, 0, 2, 10, 2, veste);
    m.caixa(x, 2, 0, 2, 2, 2, pele).caixa(x, 0, 1, 1, 2, 1, pele).caixa(x + 1, 0, 0, 1, 2, 1, pele);
  }
  // ampulheta presa ao peito: o tempo que ele faz parecer inútil
  m.caixa(-1, 9, 4, 3, 1, 1, 0x6a4a28).caixa(-1, 13, 4, 3, 1, 1, 0x6a4a28);
  m.ponto(0, 10, 4, 0xd8a050).ponto(-1, 12, 4, 0xe8dcc0).ponto(1, 12, 4, 0xe8dcc0).ponto(0, 11, 4, 0xd8a050).ponto(0, 12, 4, 0xd8a050);
  // cabeça baixa, inclinada para a frente, com chifres curtos e caídos para trás
  m.caixa(-2, 15, 1, 5, 5, 5, pele);
  m.caixa(-2, 15, 5, 5, 1, 1, pele).caixa(-1, 14, 5, 3, 1, 1, pele); // queixo comprido
  m.caixa(-3, 19, 1, 1, 1, 2, 0x4a3a2a).caixa(-4, 19, 0, 1, 1, 1, 0x4a3a2a).caixa(-4, 18, -1, 1, 1, 1, 0x3a2a1a);
  m.caixa(3, 19, 1, 1, 1, 2, 0x4a3a2a).caixa(4, 19, 0, 1, 1, 1, 0x4a3a2a).caixa(4, 18, -1, 1, 1, 1, 0x3a2a1a);
  m.caixa(-2, 17, 5, 5, 1, 1, 0x6a5a44); // pálpebras pesadas sobre os olhos
  // o sol do meio-dia atrás dele: disco baço com raios
  for (let x = -9; x <= 9; x++)
    for (let y = -9; y <= 9; y++) {
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const raio = r > 6.6 && r < 9.4 && Math.abs(((a / (Math.PI * 2)) * 12) % 1) < 0.3;
      if ((r > 5 && r < 6.4) || raio) m.ponto(x, 16 + y, -4, r < 6.4 ? ((x + y) & 1 ? 0xd8b048 : 0xc89a38) : 0xe8c060);
    }
  geoCache = m.geometria(S, [0, 0, 0]);
  return geoCache;
}

/** Corpo comum à forma verdadeira e aos reflexos: iguais de propósito. */
class FormaDoMeioDia extends Sombra {
  protected matOlhos = new THREE.MeshBasicMaterial({ color: OLHOS });
  readonly mensagemBloqueio: string = 'É uma miragem: use a Ciência (E)!';

  constructor(id: string, casa: THREE.Vector3, vida: number, adormecida: boolean) {
    super(id, casa, { escala: 2, vida, adormecida, visao: 60 });
    this.corpo.geometry = geometriaAcedia();
    // olhos meio fechados, sob as pálpebras
    this.olhos[0].position.set(-1.2 * S, 16.6 * S, 5.6 * S);
    this.olhos[1].position.set(1.8 * S, 16.6 * S, 5.6 * S);
    for (const o of this.olhos) {
      o.material = this.matOlhos;
      o.scale.set(1, 0.45, 1);
    }
  }

  get raioCorpo() {
    return 0.55 * this.escala;
  }

  /** Volta a ficar de pé num lugar novo, com um tremor de ar quente. */
  surgirEm(p: THREE.Vector3) {
    this.pos.copy(p);
    this.casa.copy(p);
    this.raiz.position.copy(p);
    this.flash = 0.35;
    this.corFlash.setRGB(1, 0.85, 0.5);
  }
}

/** Um reflexo: anda e ataca como o original, mas nada o fere. A Ciência o desfaz. */
export class Reflexo extends FormaDoMeioDia {
  constructor(id: string, casa: THREE.Vector3) {
    super(id, casa, 99, false);
    this.estado = 'perseguir';
  }

  ferir(_dano: number, de: THREE.Vector3): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    this.flash = 0.12;
    this.corFlash.setRGB(0.55, 0.5, 0.45);
    this.empurrao.subVectors(this.pos, de).setY(0).normalize().multiplyScalar(1.5);
    return 'bloqueado';
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    return super.decidir(dt, paraJogador, dist, jogador).multiplyScalar(this.estado === 'investir' ? 0.8 : 0.65);
  }

  dissolver() {
    if (this.ativa) this.desfazer();
  }
}

type Ataque =
  | { tipo: 'sol'; t: number; levas: { pontos: THREE.Vector3[]; inicio: number; caiu: boolean }[] }
  | { tipo: 'torpor'; t: number; nuvem: THREE.Vector3; viva: boolean }
  | { tipo: 'mormaco'; t: number; r: number; acertou: boolean }
  | { tipo: 'cansado'; t: number; duracao: number };

const ESPERA_RAIO = 1.35;
const VEL_ANEL = 7.5;
const RAIO_MAX_ANEL = 15;

export class Acedia extends FormaDoMeioDia implements Chefe {
  readonly efeitos = new THREE.Group();
  readonly impactos: Impacto[] = [];
  alerta = '';
  /** O peregrino está usando a Ciência: a forma verdadeira aparece e pode ser ferida. */
  revelado = false;
  private ataque: Ataque | null = null;
  private ultimo = '';
  private espera = 2;
  private enfurecido = false;
  private avisados = new Set<string>();
  private info: InfoJogador = { pos: new THREE.Vector3(), noChao: true, esquivando: false, invulneravel: false };
  private fis: Fisica | null = null;

  private marcas: THREE.Mesh[] = [];
  private raios: THREE.Mesh[] = [];
  private nuvem: THREE.Group;
  private anel: THREE.Mesh;

  constructor(id: string, casa: THREE.Vector3) {
    super(id, casa, 24, true);
    const geoMarca = new THREE.CircleGeometry(1.25, 28).rotateX(-Math.PI / 2);
    const geoRaio = new THREE.CylinderGeometry(0.9, 1.15, 16, 16, 1, true).translate(0, 8, 0);
    for (let i = 0; i < 16; i++) {
      const marca = new THREE.Mesh(
        geoMarca,
        new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      const raio = new THREE.Mesh(
        geoRaio,
        new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      marca.visible = raio.visible = false;
      this.marcas.push(marca);
      this.raios.push(raio);
      this.efeitos.add(marca, raio);
    }
    // a névoa do torpor: novelos cinza-violeta que giram devagar
    this.nuvem = new THREE.Group();
    const matNuvem = new THREE.MeshLambertMaterial({ color: 0x8a7a9a, transparent: true, opacity: 0.62, emissive: 0x2a2038, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), matNuvem);
      b.position.set(Math.cos(i * 2.4) * (0.2 + (i % 4) * 0.16), Math.sin(i * 1.7) * 0.35, Math.sin(i * 2.4) * (0.2 + (i % 4) * 0.16));
      b.rotation.set(i, i * 0.5, 0);
      this.nuvem.add(b);
    }
    this.nuvem.visible = false;
    this.anel = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.anel.visible = false;
    this.efeitos.add(this.nuvem, this.anel);
  }

  get fase2() {
    return this.vida <= this.vidaMax / 2;
  }

  /** Quantos reflexos ele quer em volta agora (nenhum quando a Ciência o revela). */
  get reflexosDesejados() {
    if (this.revelado || !this.ativa || this.adormecida) return 0;
    return this.fase2 ? 3 : 2;
  }

  sentir(info: InfoJogador) {
    this.info = info;
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    if (this.ativa && !this.revelado) {
      this.flash = 0.12;
      this.corFlash.setRGB(0.55, 0.5, 0.45);
      this.empurrao.subVectors(this.pos, de).setY(0).normalize().multiplyScalar(1.5);
      return 'bloqueado';
    }
    const r = super.ferir(dano, de, tipo);
    if (r === 'morreu') this.cancelar();
    return r;
  }

  /** Um projétil de luz passou por `p`: desfaz a névoa do torpor, se ela estiver ali. */
  atingirNuvem(p: THREE.Vector3) {
    const a = this.ataque;
    if (a?.tipo !== 'torpor' || !a.viva || a.nuvem.distanceTo(p) > 1.2) return false;
    a.viva = false;
    this.impactos.push({ dano: 0, de: a.nuvem.clone(), aviso: 'A luz desfez a névoa!', som: 'dissolver' });
    this.cansar(0.8);
    return true;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fis = fis;
    super.atualizar(dt, fis, jogador);
    // revelado, ele brilha um pouco: é o verdadeiro
    if (this.revelado && this.ativa && this.flash <= 0) this.material.emissive.setRGB(0.22, 0.32, 0.5);
    this.matOlhos.color.setHex(this.revelado ? 0xfff2c0 : this.fase2 ? 0xff8a3a : OLHOS);
    this.atualizarEfeitos(dt);
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    if (this.estado === 'desfazendo' || this.estado === 'vencida' || this.adormecida) {
      this.alerta = '';
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.fase2 && !this.enfurecido) {
      this.enfurecido = true;
      this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'O meio-dia arde mais forte!', som: 'rugido' });
    }
    if (!this.ataque) {
      this.alerta = this.revelado ? 'Revelado: golpeie agora!' : 'Miragens: use a Ciência (E) para achar o verdadeiro';
      this.espera -= dt;
      if (this.espera <= 0 && (this.estado === 'perseguir' || this.estado === 'vagar')) this.escolher(dist);
      if (this.estado === 'vagar') this.estado = 'perseguir';
      return super.decidir(dt, paraJogador, dist, jogador).multiplyScalar(0.7);
    }
    return this.executar(dt, paraJogador, dist);
  }

  private escolher(dist: number) {
    const opcoes = dist > 6 ? ['torpor', 'torpor', 'sol', 'sol', 'mormaco'] : ['sol', 'mormaco', 'mormaco', 'torpor'];
    if (this.fase2) opcoes.push('sol', 'mormaco');
    const validas = opcoes.filter((o) => o !== this.ultimo);
    const tipo = validas[Math.floor(Math.random() * validas.length)];
    this.ultimo = tipo;
    this.t = 0;
    if (tipo === 'sol') {
      this.ataque = { tipo, t: 0, levas: [{ pontos: this.pontosDeSol(), inicio: 0, caiu: false }] };
      this.avisar('sol', 'Sol a pino: saia das marcas de luz!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'sol' });
    } else if (tipo === 'torpor') {
      this.ataque = { tipo, t: 0, nuvem: this.pos.clone().add(new THREE.Vector3(0, 3, 0)), viva: true };
      this.avisar('torpor', 'O bocejo do torpor: fuja da névoa ou desfaça-a com a luz!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'torpor' });
    } else {
      this.ataque = { tipo: 'mormaco', t: 0, r: 0, acertou: false };
      this.avisar('mormaco', 'Onda de mormaço: pule (Espaço)!');
    }
  }

  private pontosDeSol() {
    const centro = this.info.pos.clone();
    const pontos: THREE.Vector3[] = [centro.clone()];
    const total = this.fase2 ? 8 : 6;
    for (let i = 0; pontos.length < total && i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5.5;
      const p = centro.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      if (this.fis && Math.abs(this.fis.altura(p.x, p.z) - this.fis.altura(centro.x, centro.z)) < 0.5 && pontos.every((q) => q.distanceTo(p) > 2.2))
        pontos.push(p);
    }
    return pontos;
  }

  private cansar(duracao: number) {
    this.ataque = { tipo: 'cansado', t: 0, duracao };
    this.espera = this.fase2 ? 1.3 : 2.1;
  }

  derrotar(): ResultadoGolpe {
    const r = super.derrotar();
    if (r === 'morreu') this.cancelar();
    return r;
  }

  private cancelar() {
    this.ataque = null;
    this.perigosa = false;
  }

  private executar(dt: number, paraJogador: THREE.Vector3, dist: number): THREE.Vector3 {
    const a = this.ataque!;
    a.t += dt;
    const vel = new THREE.Vector3();
    switch (a.tipo) {
      case 'sol':
        this.estado = 'preparar';
        this.alerta = 'Sol a pino: saia das marcas de luz!';
        // na fase 2, uma segunda leva cai onde o peregrino foi parar
        if (this.fase2 && a.levas.length === 1 && a.t > 1.1) {
          a.levas.push({ pontos: this.pontosDeSol(), inicio: a.t, caiu: false });
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'sol' });
        }
        for (const l of a.levas)
          if (!l.caiu && a.t - l.inicio > ESPERA_RAIO) {
            l.caiu = true;
            this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'raio' });
            if (!this.info.invulneravel)
              for (const p of l.pontos)
                if (Math.hypot(p.x - this.info.pos.x, p.z - this.info.pos.z) < 1.3) {
                  this.impactos.push({ dano: 0.5, de: p.clone() });
                  break;
                }
          }
        if (a.levas.every((l) => l.caiu) && a.t - a.levas[a.levas.length - 1].inicio > ESPERA_RAIO + 0.5) this.cansar(0.9);
        break;

      case 'torpor': {
        this.estado = 'perseguir';
        this.alerta = 'Fuja da névoa do torpor ou desfaça-a com a luz!';
        vel.copy(paraJogador).multiplyScalar(dist < 7 ? -1.2 : 0.4); // fica de longe, olhando
        if (a.viva) {
          const alvo = this.info.pos.clone().add(new THREE.Vector3(0, 1, 0));
          const para = alvo.sub(a.nuvem);
          const v = this.fase2 ? 4.1 : 3.3;
          if (para.length() > 0.01) a.nuvem.addScaledVector(para.normalize(), v * dt);
          const d = a.nuvem.distanceTo(this.info.pos.clone().add(new THREE.Vector3(0, 1, 0)));
          if (d < 1.1 && !this.info.esquivando && !this.info.invulneravel) {
            a.viva = false;
            this.impactos.push({ dano: 0, de: a.nuvem.clone(), torpor: true, aviso: 'O torpor pesa sobre você… Segure R para rezar!', som: 'torpor' });
            this.cansar(1.2);
          } else if (a.t > 6.5) {
            a.viva = false;
            this.cansar(0.6);
          }
        }
        break;
      }

      case 'mormaco':
        this.estado = 'preparar';
        this.alerta = 'Onda de mormaço: pule (Espaço)!';
        if (a.t > 0.6) {
          a.r += dt * (this.fase2 ? VEL_ANEL * 1.2 : VEL_ANEL);
          if (!a.acertou && !this.info.invulneravel && this.info.noChao) {
            const d = Math.hypot(this.info.pos.x - this.pos.x, this.info.pos.z - this.pos.z);
            if (Math.abs(d - a.r) < 0.6) {
              a.acertou = true;
              this.impactos.push({ dano: 0.5, de: this.pos.clone() });
            }
          }
          if (a.r > RAIO_MAX_ANEL) this.cansar(0.8);
        } else if (a.t < 0.05) this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
        break;

      case 'cansado':
        this.estado = 'perseguir';
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

  private atualizarEfeitos(dt: number) {
    const a = this.ataque;
    // sol a pino: marcas que crescem e os raios que caem
    let k = 0;
    if (a?.tipo === 'sol')
      for (const l of a.levas) {
        const t = a.t - l.inicio;
        for (const p of l.pontos) {
          if (k >= this.marcas.length) break;
          const marca = this.marcas[k], raio = this.raios[k];
          k++;
          const chao = this.fis ? this.fis.altura(p.x, p.z) : p.y;
          marca.visible = true;
          marca.position.set(p.x, chao + 0.04, p.z);
          const c = Math.min(1, t / ESPERA_RAIO);
          (marca.material as THREE.MeshBasicMaterial).opacity = l.caiu ? Math.max(0, 0.7 - (t - ESPERA_RAIO) * 1.4) : 0.12 + c * 0.38 + Math.sin(t * 20) * 0.08 * c;
          marca.scale.setScalar(0.5 + c * 0.5);
          const q = t - ESPERA_RAIO;
          raio.visible = q > -0.08 && q < 0.5;
          raio.position.set(p.x, chao, p.z);
          (raio.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - Math.max(0, q) * 1.7);
          raio.scale.set(1, Math.min(1, (q + 0.08) * 8), 1);
        }
      }
    for (; k < this.marcas.length; k++) this.marcas[k].visible = this.raios[k].visible = false;

    // torpor
    const tor = a?.tipo === 'torpor' && a.viva ? a : null;
    this.nuvem.visible = !!tor;
    if (tor) {
      this.nuvem.position.copy(tor.nuvem);
      this.nuvem.rotation.y += dt * 1.4;
      this.nuvem.scale.setScalar(Math.min(1, tor.t * 2) * (1 + Math.sin(tor.t * 4) * 0.08));
    }

    // anel de mormaço
    const an = a?.tipo === 'mormaco' && a.r > 0 ? a : null;
    this.anel.visible = !!an;
    if (an) {
      this.anel.position.set(this.pos.x, (this.fis ? this.fis.altura(this.pos.x, this.pos.z) : this.pos.y) + 0.05, this.pos.z);
      this.anel.scale.setScalar(Math.max(0.1, an.r));
      (this.anel.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.max(0, 1 - an.r / RAIO_MAX_ANEL);
    }
  }

  /** Remove o chefão e seus efeitos da cena (luta reiniciada). */
  descartar() {
    this.efeitos.parent?.remove(this.efeitos);
    this.raiz.parent?.remove(this.raiz);
  }
}
