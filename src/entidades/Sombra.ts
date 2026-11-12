import * as THREE from 'three';
import { Modelo } from '../voxel/Modelo';
import { Fisica } from './Peregrino';

const S = 0.1;

function geometriaSombra(blindada: boolean) {
  const m = new Modelo();
  const tons = [0x1b1428, 0x241a36, 0x2e2142, 0x160f20];
  const cor = (x: number, y: number, z: number) => tons[Math.abs((x * 7 + y * 13 + z * 5) % tons.length)];
  // corpo em forma de chama/gota, mais largo embaixo
  for (let y = 0; y < 16; y++) {
    const r = y < 4 ? 3 + y * 0.6 : 5.4 - (y - 4) * 0.36;
    for (let x = -6; x <= 6; x++)
      for (let z = -6; z <= 6; z++) {
        const borda = Math.sin(x * 1.7 + y * 0.9) * 0.6 + Math.cos(z * 1.3 - y) * 0.6;
        if (x * x + z * z <= (r + borda) * (r + borda)) m.ponto(x, y, z, cor(x, y, z));
      }
  }
  // fiapos no topo
  m.caixa(-1, 16, 0, 1, 3, 1, 0x241a36).caixa(2, 16, -1, 1, 2, 1, 0x1b1428).caixa(-3, 15, 1, 1, 2, 1, 0x2e2142);
  // braços
  m.caixa(-8, 6, -1, 3, 2, 2, 0x1b1428).caixa(6, 6, -1, 3, 2, 2, 0x1b1428);
  if (blindada) {
    // couraça de pedra negra: placas no peito, ombros e coroa de espinhos
    const placa = (x: number, y: number, z: number) => ((x + y + z) % 2 ? 0x3c3848 : 0x4a4558);
    m.caixa(-4, 4, 4, 9, 6, 2, placa);
    m.caixa(-7, 8, -2, 3, 2, 5, placa).caixa(5, 8, -2, 3, 2, 5, placa);
    for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2]]) m.caixa(x, 15, z, 1, 3, 1, 0x4a4558);
  }
  return m.geometria(S, [0, 0, 0]);
}

const geos = new Map<boolean, THREE.BufferGeometry>();
const geoOlho = new THREE.BoxGeometry(S * 1.2, S * 1.6, S * 0.6);
const matOlho = new THREE.MeshBasicMaterial({ color: 0xff5a3c });

export type EstadoSombra =
  | 'vagar' | 'perseguir' | 'preparar' | 'investir' | 'recuar' | 'atordoada' | 'desfazendo' | 'vencida';

export interface OpcoesSombra {
  escala?: number;
  vida?: number;
  /** Com couraça: o cajado não fere até a luz atordoar. */
  blindada?: boolean;
  /** Distância em que começa a perseguir. */
  visao?: number;
  /** Fica parada até `acordar()` (chefões). */
  adormecida?: boolean;
}

export type ResultadoGolpe = 'morreu' | 'ferido' | 'bloqueado' | 'atordoado' | 'nada';

export class Sombra {
  /** Multiplica a visão de todas as sombras comuns (Temor de Deus 3: Pequenez). */
  static percepcao = 1;
  readonly raiz = new THREE.Group();
  readonly pos = new THREE.Vector3();
  protected corpo: THREE.Mesh;
  protected olhos: THREE.Mesh[];
  /** 0 = dormindo no chão, 1 = desperta (anima o despertar). */
  protected desperto: number;
  protected material: THREE.MeshLambertMaterial;
  readonly escala: number;
  readonly vidaMax: number;
  readonly blindada: boolean;
  protected visao: number;
  vida: number;
  estado: EstadoSombra = 'vagar';
  protected adormecida: boolean;
  protected t = 0;
  protected fase = Math.random() * 10;
  protected flash = 0;
  protected corFlash = new THREE.Color(1, 0.95, 0.8);
  protected dirInvestida = new THREE.Vector3();
  protected empurrao = new THREE.Vector3();
  /** O que aparece quando o cajado não fere. */
  readonly mensagemBloqueio: string = 'A couraça resiste ao cajado!';
  /** O jogo lê isto para saber se a investida acertou. */
  perigosa = false;

  constructor(readonly id: string, protected casa: THREE.Vector3, op: OpcoesSombra = {}) {
    this.escala = op.escala ?? 1;
    this.vidaMax = this.vida = op.vida ?? 4;
    this.blindada = op.blindada ?? false;
    this.visao = op.visao ?? 11;
    this.adormecida = op.adormecida ?? false;
    this.desperto = this.adormecida ? 0 : 1;
    let geo = geos.get(this.blindada);
    if (!geo) geos.set(this.blindada, (geo = geometriaSombra(this.blindada)));
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 });
    this.corpo = new THREE.Mesh(geo, this.material);
    this.corpo.castShadow = true;
    const olhoE = new THREE.Mesh(geoOlho, matOlho);
    olhoE.position.set(-1.8 * S, 10 * S, 4.6 * S);
    const olhoD = olhoE.clone();
    olhoD.position.x = 1.8 * S;
    this.corpo.add(olhoE, olhoD);
    this.olhos = [olhoE, olhoD];
    this.raiz.add(this.corpo);
    this.raiz.scale.setScalar(this.escala);
    this.pos.copy(casa);
  }

  /** Ponto onde fica a mira. */
  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(new THREE.Vector3(0, 1.1 * this.escala, 0));
  }

  get ativa() {
    return this.estado !== 'desfazendo' && this.estado !== 'vencida';
  }

  /** Raio em que encostar no peregrino fere. */
  get raioContato() {
    return 0.75 * this.escala;
  }

  get raioInvestida() {
    return 1.3 * this.escala;
  }

  get raioCorpo() {
    return 0.5 * this.escala;
  }

  acordar() {
    this.adormecida = false;
    if (this.estado === 'vagar') this.estado = 'perseguir';
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    this.adormecida = false;
    if (this.blindada && this.estado !== 'atordoada') {
      if (tipo === 'golpe') {
        this.flash = 0.12;
        this.corFlash.setRGB(0.5, 0.5, 0.6);
        this.empurrao.subVectors(this.pos, de).setY(0).normalize().multiplyScalar(2);
        return 'bloqueado';
      }
      // a luz atravessa a couraça e atordoa
      this.vida -= 1;
      this.flash = 0.25;
      this.corFlash.setRGB(1, 0.95, 0.8);
      this.estado = 'atordoada';
      this.t = 0;
      this.perigosa = false;
      return this.vida <= 0 ? this.desfazer() : 'atordoado';
    }
    this.vida -= dano;
    this.flash = 0.18;
    this.corFlash.setRGB(1, 0.95, 0.8);
    const empurra = this.blindada ? 3 : 7;
    this.empurrao.subVectors(this.pos, de).setY(0).normalize().multiplyScalar(empurra);
    if (this.vida <= 0) return this.desfazer();
    if (this.estado !== 'atordoada') {
      this.estado = 'recuar';
      this.t = 0;
    }
    this.perigosa = false;
    return 'ferido';
  }

  /** Derrota por roteiro (ignora couraça e fases): a sombra se desfaz como se tivesse levado o último golpe. */
  derrotar(): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    this.vida = 0;
    return this.desfazer();
  }

  protected desfazer(): ResultadoGolpe {
    this.estado = 'desfazendo';
    this.t = 0;
    this.perigosa = false;
    return 'morreu';
  }

  /** Quanto tempo a luz deixa a couraça atordoada. */
  protected duracaoAtordoada = 2.2;

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.t += dt;
    this.fase += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.flash > 0) this.material.emissive.copy(this.corFlash);
    else if (this.estado === 'atordoada') this.material.emissive.setRGB(0.25, 0.3, 0.5 + Math.sin(this.t * 20) * 0.15);
    else this.material.emissive.setRGB(0.06, 0.02, 0.1);

    const paraJogador = new THREE.Vector3().subVectors(jogador, this.pos).setY(0);
    const dist = paraJogador.length();
    paraJogador.normalize();
    const vel = this.decidir(dt, paraJogador, dist, jogador);
    this.mover(dt, fis, vel);
    this.posar(paraJogador);
  }

  /** Máquina de estados: devolve a velocidade desejada. Chefões sobrescrevem. */
  protected decidir(_dt: number, paraJogador: THREE.Vector3, dist: number, _jogador: THREE.Vector3) {
    const vel = new THREE.Vector3();
    const lento = this.blindada ? 0.75 : 1;
    switch (this.estado) {
      case 'vagar': {
        if (this.adormecida) break;
        const a = this.fase * 0.4;
        const alvo = new THREE.Vector3(this.casa.x + Math.cos(a) * 3, 0, this.casa.z + Math.sin(a) * 3);
        vel.subVectors(alvo, this.pos).setY(0).clampLength(0, 1.2);
        if (dist < this.visao * Sombra.percepcao) this.estado = 'perseguir';
        break;
      }
      case 'perseguir':
        vel.copy(paraJogador).multiplyScalar(2.6 * lento);
        if (dist < 2.6 * Math.sqrt(this.escala)) {
          this.estado = 'preparar';
          this.t = 0;
        }
        if (dist > 20 + this.visao) this.estado = 'vagar';
        break;
      case 'preparar':
        vel.copy(paraJogador).multiplyScalar(-0.6);
        if (this.t > (this.blindada ? 0.85 : 0.6)) {
          this.estado = 'investir';
          this.t = 0;
          this.dirInvestida.copy(paraJogador);
        }
        break;
      case 'investir':
        this.perigosa = true;
        vel.copy(this.dirInvestida).multiplyScalar(9 * lento);
        if (this.t > 0.32 * Math.sqrt(this.escala)) {
          this.estado = 'recuar';
          this.perigosa = false;
          this.t = 0;
        }
        break;
      case 'recuar':
        vel.copy(paraJogador).multiplyScalar(-1.8);
        if (this.t > 0.9) this.estado = 'perseguir';
        break;
      case 'atordoada':
        if (this.t > this.duracaoAtordoada) {
          this.estado = 'recuar';
          this.t = 0;
        }
        break;
      case 'desfazendo': {
        const k = Math.min(1, this.t / 0.9);
        this.raiz.scale.set((1 + k * 0.6) * this.escala, (1 - k) * this.escala, (1 + k * 0.6) * this.escala);
        this.material.emissive.setRGB(1 * k, 0.9 * k, 0.6 * k);
        if (k >= 1) {
          this.estado = 'vencida';
          this.raiz.visible = false;
        }
        break;
      }
    }
    return vel;
  }

  /** Altura extra sobre o chão (o chefão usa para saltar). */
  protected alturaExtra() {
    return 0;
  }

  /** Anda só para onde o chão continua no mesmo nível (não atravessa paredes). Devolve se bateu numa parede. */
  protected mover(dt: number, fis: Fisica, vel: THREE.Vector3) {
    vel.add(this.empurrao);
    this.empurrao.multiplyScalar(Math.max(0, 1 - dt * 6));
    const nx = this.pos.x + vel.x * dt, nz = this.pos.z + vel.z * dt;
    const hAgora = fis.altura(this.pos.x, this.pos.z);
    let bateu = false;
    if (Math.abs(fis.altura(nx, this.pos.z) - hAgora) < 1.1) this.pos.x = nx;
    else bateu = true;
    if (Math.abs(fis.altura(this.pos.x, nz) - hAgora) < 1.1) this.pos.z = nz;
    else bateu = true;
    fis.colidir(this.pos, this.raioCorpo);
    const chao = Math.max(fis.altura(this.pos.x, this.pos.z), fis.nivelMinimo ?? -99);
    if (!this.adormecida) this.desperto = Math.min(1, this.desperto + dt * 1.2);
    const flutuar = this.estado === 'atordoada' ? 0.05 : (0.35 + Math.sin(this.fase * 2.2) * 0.12) * this.desperto - 0.25 * (1 - this.desperto);
    const extra = this.alturaExtra();
    this.pos.y += (chao + flutuar + extra - this.pos.y) * Math.min(1, dt * (extra > 0.01 ? 12 : 6));
    // dormindo: olhos apagados, corpo baixo e escuro; ao despertar, os olhos acendem
    for (const o of this.olhos) o.visible = this.desperto > 0.15;
    if (this.desperto < 1 && this.flash <= 0) this.material.emissive.multiplyScalar(this.desperto);
    this.raiz.position.copy(this.pos);
    return bateu;
  }

  protected posar(paraJogador: THREE.Vector3) {
    if (!this.ativa) return;
    if (this.estado !== 'atordoada') this.raiz.rotation.y = Math.atan2(paraJogador.x, paraJogador.z);
    const pulso = this.estado === 'preparar' ? 1 + Math.sin(this.t * 40) * 0.06
      : this.desperto < 1 ? 1.12 - this.desperto * 0.12 + Math.sin(this.fase * 1.2) * 0.02 // dormindo: respira devagar, achatado
      : 1 + Math.sin(this.fase * 3) * 0.03;
    const torto = this.estado === 'atordoada' ? 0.85 : 1;
    this.corpo.scale.set(pulso, (2 - pulso) * torto, pulso);
    this.corpo.rotation.z = this.estado === 'atordoada' ? Math.sin(this.t * 6) * 0.15 : 0;
  }
}
