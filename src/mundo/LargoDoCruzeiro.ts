import * as THREE from 'three';
import { CoracaoDePedra, type LimitesArena } from '../entidades/CoracaoDePedra';
import { deitado } from '../entidades/Enfermos';
import type { Sombra } from '../entidades/Sombra';
import { figurinoDoPovo, montarHumano, type Humano } from '../voxel/Humano';

/**
 * O Largo do Cruzeiro de São Francisco, a arena do Coração de Pedra (docs/regioes/01-ruas-da-bahia.md, seção 3).
 * Cinco enfermos estão deitados nos degraus do cruzeiro e nas soleiras. Durante a luta, uma crosta cinza sobe
 * devagar em cada um (a barra de pedra sobre ele): é o vício do chefão, a indiferença que endurece.
 *
 * - Socorrer (F) desfaz a pedra: o enfermo se levanta e reza, e a oração racha a couraça. Três orações abrem a
 *   grade do peito e o coração fica à mostra (CoracaoDePedra.expor). Quando a pedra se fecha de novo, a dureza
 *   volta a se espalhar: os socorridos sentam-se de novo, e a crosta recomeça.
 * - Quem petrifica de todo vira estátua: a pedra vai para a couraça (o chefão se cura) e a pessoa sai da luta até a
 *   grade abrir de novo.
 * - De pé, os socorridos fazem sombra: atrás deles, o olhar do colosso não pega.
 * - "Não é comigo." (fase 2): a crosta sobe duas vezes mais rápido e as barras somem; só se vê quem precisa por uma
 *   mão erguida ou, com o dom da Ciência, pelo brilho fraco.
 */

export const ID_CORACAO = 'bahiaalta_coracao';
/** Quanto tempo leva para a pedra cobrir um enfermo de todo (s), antes da fase 2. */
const TEMPO_PEDRA = 42;
const ORACOES_PARA_ABRIR = 3;

type Situacao = 'caido' | 'socorrido' | 'petrificado';

interface EnfermoDoLargo {
  pos: THREE.Vector3;
  rumo: number;
  situacao: Situacao;
  /** A crosta de pedra: 0 (nada) a 1 (petrificado). */
  pedra: number;
  deitado: THREE.Group;
  humanoDeitado: Humano;
  dePe: Humano;
  crosta: THREE.Mesh;
  estatua: THREE.Mesh;
  barraFundo: THREE.Sprite;
  barra: THREE.Sprite;
  brilho: THREE.Sprite;
  /** A mão erguida de vez em quando (o sinal de quem precisa, na fase 2). */
  mao: number;
  raio: { linha: THREE.Line; t: number };
}

export interface EventosLargo {
  lutaComecou: () => void;
  socorrido: (oracoes: number) => void;
  petrificou: () => void;
}

export class LargoDoCruzeiro {
  readonly grupo = new THREE.Group();
  readonly enfermos: EnfermoDoLargo[] = [];
  chefe: CoracaoDePedra | null = null;
  lutando = false;
  vencido = false;
  /** O dom da Ciência está aceso: os enfermos brilham de leve, mesmo sem as barras. */
  ciencia = false;
  /** Um diálogo aberto (ou a queda): a pedra não sobe. */
  pausado = false;
  private disponivel = false;
  private oracoes = 0;
  private estavaExposto = false;
  private t = 0;

  constructor(
    private readonly sombras: Sombra[],
    private readonly lim: LimitesArena,
    private readonly casa: THREE.Vector3,
    private readonly cruzeiro: THREE.Vector3,
    lugares: [number, number, number][],
    private readonly eventos: EventosLargo,
  ) {
    const matCrosta = new THREE.MeshLambertMaterial({ color: 0x8a8884, transparent: true, opacity: 0.92 });
    const matEstatua = new THREE.MeshLambertMaterial({ color: 0x7a7874 });
    lugares.forEach(([x, z, rumo], i) => {
      const fig = figurinoDoPovo(700 + i * 13, 'pobre');
      const humanoDeitado = montarHumano(fig);
      const g = deitado(humanoDeitado, fig, 0.05);
      const raiz = new THREE.Group();
      raiz.position.set(x, 0, z);
      raiz.rotation.y = rumo;
      raiz.add(g);
      // a crosta cobre o corpo dos pés para a cabeça (o corpo deitado vai de z 0,55 a -1,2, mais ou menos)
      const crosta = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 1).translate(0, 0.2, -0.5), matCrosta);
      crosta.position.z = 0.55;
      crosta.scale.z = 0.001;
      const estatua = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 1.8).translate(0, 0.25, -0.35), matEstatua);
      estatua.visible = false;
      raiz.add(crosta, estatua);
      // de pé, rezando: as mãos juntas diante do peito
      const dePe = montarHumano(fig);
      dePe.bracoD?.rotation.set(-0.8, 0, -0.32);
      dePe.bracoE?.rotation.set(-0.8, 0, 0.32);
      dePe.cabeca.rotation.x = 0.25;
      dePe.raiz.visible = false;
      dePe.corpo.castShadow = true;
      raiz.add(dePe.raiz);
      // a barra de pedra, sobre a pessoa
      const barraFundo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x2a2a2e, depthTest: false, transparent: true, opacity: 0.75 }));
      barraFundo.scale.set(0.9, 0.11, 1);
      barraFundo.position.set(0, 1.35, 0);
      const barra = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xb8b8bc, depthTest: false }));
      barra.center.set(0, 0.5);
      barra.scale.set(0.001, 0.08, 1);
      barra.position.set(-0.44, 1.35, 0);
      barraFundo.renderOrder = barra.renderOrder = 10;
      const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      brilho.scale.set(1.6, 1.6, 1);
      brilho.position.set(0, 0.4, -0.3);
      raiz.add(barraFundo, barra, brilho);
      // o raio da oração, do enfermo socorrido até o coração do colosso
      const linha = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0 }),
      );
      linha.frustumCulled = false;
      this.grupo.add(raiz, linha);
      this.enfermos.push({
        pos: new THREE.Vector3(x, 0, z), rumo, situacao: 'caido', pedra: 0, deitado: g, humanoDeitado, dePe, crosta, estatua,
        barraFundo, barra, brilho, mao: 2 + i * 1.7, raio: { linha, t: 0 },
      });
      (raiz.userData as { enfermo: number }).enfermo = i;
    });
  }

  /** Põe cada enfermo no chão do largo (a altura vem da área). */
  assentar(altura: (x: number, z: number) => number) {
    for (const e of this.enfermos) {
      e.pos.y = altura(e.pos.x, e.pos.z);
      e.deitado.parent!.position.y = e.pos.y;
    }
  }

  /**
   * A partir do save: depois da enfermaria, o colosso dorme sob o chão do largo e os cinco estão caídos; vencido, o
   * largo fica livre (os moradores levaram os enfermos ao hospital).
   */
  reiniciar(vencidas: Set<string>, flags: Set<string>) {
    this.descartarLuta();
    this.vencido = vencidas.has(ID_CORACAO);
    this.disponivel = flags.has('bahia_enfermaria') && !this.vencido;
    this.grupo.visible = this.disponivel;
    this.recomecar();
    if (this.disponivel) this.criarChefe();
  }

  private recomecar() {
    this.oracoes = 0;
    this.estavaExposto = false;
    this.enfermos.forEach((e, i) => {
      e.pedra = 0.08 + i * 0.07;
      this.mudar(e, 'caido');
    });
  }

  private criarChefe() {
    this.chefe = new CoracaoDePedra(ID_CORACAO, this.casa.clone(), this.lim);
    this.chefe.cruzeiro = this.cruzeiro;
    this.chefe.protegido = (p) => this.protegido(p);
    this.chefe.raiz.rotation.y = -Math.PI / 2;
    this.sombras.push(this.chefe);
    this.grupo.add(this.chefe.raiz, this.chefe.efeitos);
  }

  private descartarLuta() {
    this.chefe?.descartar();
    if (this.chefe) this.sombras.splice(this.sombras.indexOf(this.chefe), 1);
    this.chefe = null;
    this.lutando = false;
  }

  /** Morreu na luta: tudo volta ao começo. */
  reiniciarLuta() {
    if (!this.lutando) return;
    this.descartarLuta();
    this.recomecar();
    this.criarChefe();
  }

  /** O colosso desmoronou: os enfermos se levantam (os moradores vêm buscá-los depois). */
  chefeVencido() {
    this.lutando = false;
    this.vencido = true;
    for (const e of this.enfermos) {
      e.pedra = 0;
      this.mudar(e, 'socorrido');
    }
  }

  /** O peregrino está dentro do largo? */
  dentro(p: THREE.Vector3) {
    return p.x > this.lim.x0 && p.x < this.lim.x1 && p.z > this.lim.z0 && p.z < this.lim.z1;
  }

  /** Precisa de socorro (para a interação F). */
  precisa(i: number) {
    const e = this.enfermos[i];
    return this.lutando && e.situacao !== 'socorrido';
  }

  /** Socorre um enfermo: a pedra se desfaz, ele se levanta e reza, e a oração racha a couraça. */
  socorrer(i: number) {
    const e = this.enfermos[i];
    const c = this.chefe;
    if (!this.lutando || !c || e.situacao === 'socorrido') return;
    e.pedra = 0;
    this.mudar(e, 'socorrido');
    e.raio.t = 1.2;
    if (c.exposto) {
      this.eventos.socorrido(0);
      return;
    }
    this.oracoes++;
    c.rachar(this.oracoes);
    this.eventos.socorrido(this.oracoes);
    if (this.oracoes >= ORACOES_PARA_ABRIR) {
      this.oracoes = 0;
      c.expor();
    }
  }

  /** À sombra de um socorrido: ele está entre o colosso e o peregrino, perto dele. */
  private protegido(p: THREE.Vector3) {
    const c = this.chefe;
    if (!c) return false;
    const ab = p.clone().sub(c.pos).setY(0);
    const comp = ab.length();
    if (comp < 0.01) return false;
    ab.divideScalar(comp);
    return this.enfermos.some((e) => {
      if (e.situacao !== 'socorrido' || e.pos.distanceTo(p) > 3.2) return false;
      const ap = e.pos.clone().sub(c.pos).setY(0);
      const t = ap.dot(ab);
      if (t < 0.5 || t > comp - 0.2) return false;
      return ap.addScaledVector(ab, -t).length() < 0.9;
    });
  }

  private mudar(e: EnfermoDoLargo, s: Situacao) {
    e.situacao = s;
    e.deitado.visible = s === 'caido';
    e.crosta.visible = s === 'caido';
    e.estatua.visible = s === 'petrificado';
    e.dePe.raiz.visible = s === 'socorrido';
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    if (!this.disponivel) return;
    this.t += dt;
    const c = this.chefe;
    // a luta começa quando o peregrino pisa no largo: o colosso se levanta do próprio chão
    if (c && c.ativa && !this.lutando && !this.vencido && this.dentro(jogador) && jogador.x > this.lim.x0 + 1.5) {
      this.lutando = true;
      c.acordar();
      this.eventos.lutaComecou();
    }
    const exposto = !!c?.exposto;
    // a pedra se fechou de novo: a dureza volta a se espalhar sobre todos
    if (this.estavaExposto && !exposto && this.lutando) {
      for (const e of this.enfermos) {
        e.pedra = e.situacao === 'petrificado' ? 0.6 : 0.15;
        this.mudar(e, 'caido');
      }
      this.oracoes = 0;
    }
    this.estavaExposto = exposto;
    const surdo = !!c?.naoEComigo;
    const ritmo = this.lutando && !exposto && !this.pausado ? (surdo ? 2 : 1) / TEMPO_PEDRA : 0;

    for (const e of this.enfermos) {
      if (e.situacao === 'caido') {
        e.pedra = Math.min(1, e.pedra + ritmo * dt);
        if (e.pedra >= 1) {
          this.mudar(e, 'petrificado');
          c?.endurecer(3);
          this.eventos.petrificou();
        }
      }
      e.crosta.scale.z = Math.max(0.001, e.pedra * 1.75);
      // a barra de pedra: some na fase 2 ("Não é comigo."); com a Ciência, o brilho fraco
      const comBarra = this.lutando && e.situacao === 'caido' && !surdo;
      e.barra.visible = e.barraFundo.visible = comBarra;
      e.barra.scale.x = Math.max(0.001, e.pedra * 0.88);
      (e.barra.material as THREE.SpriteMaterial).color.setHex(e.pedra > 0.75 ? 0xd85a4a : 0xb8b8bc);
      (e.brilho.material as THREE.SpriteMaterial).opacity = this.lutando && e.situacao === 'caido' && this.ciencia ? 0.35 + Math.sin(this.t * 4) * 0.12 : 0;
      // a mão erguida de quem ainda precisa, de tempos em tempos
      e.mao -= dt;
      if (e.mao < -1.1) e.mao = 3 + Math.random() * 3;
      e.humanoDeitado.bracoD?.rotation.set(e.situacao === 'caido' && e.mao < 0 ? -1.4 : 0, 0, 0.12);
      // de pé, voltados para o colosso
      if (e.situacao === 'socorrido' && c) e.dePe.raiz.rotation.y = Math.atan2(c.pos.x - e.pos.x, c.pos.z - e.pos.z) - e.rumo;
      // o raio da oração
      const r = e.raio;
      r.t = Math.max(0, r.t - dt);
      const mat = r.linha.material as THREE.LineBasicMaterial;
      mat.opacity = Math.min(1, r.t * 1.5);
      r.linha.visible = r.t > 0 && !!c;
      if (r.linha.visible && c) {
        const pos = r.linha.geometry.getAttribute('position') as THREE.BufferAttribute;
        const peito = c.peito();
        pos.setXYZ(0, e.pos.x, e.pos.y + 1.2, e.pos.z);
        pos.setXYZ(1, peito.x, peito.y, peito.z);
        pos.needsUpdate = true;
      }
    }
  }
}
