import * as THREE from 'three';
import type { Fisica } from '../entidades/Peregrino';
import { girarPara } from '../entidades/Peregrino';
import { criarCorpo, type Corpo, type Pose } from './Corpo';
import { anatomia, ficha, type Ficha, type IdEspecie } from './Especies';

type Estado = 'parado' | 'andando' | 'comendo' | 'fugindo' | 'seguindo' | 'voando' | 'pousando';

/**
 * Um bicho com vida própria: o comportamento da ficha decide o que ele faz, o corpo do Veloren decide como
 * isso aparece. Não tem combate; é ambiente e companhia na estrada.
 */
export class Animal {
  readonly raiz = new THREE.Group();
  readonly pos = new THREE.Vector3();
  readonly ficha: Ficha;
  private corpo!: Corpo;
  private estado: Estado = 'parado';
  private rumo = Math.random() * Math.PI * 2;
  private destino = new THREE.Vector3();
  private espera = Math.random() * 3;
  private tempoEstado = 0;
  private altura = 0;
  private pose: Pose = { vel: 0, giro: 0, subida: 0, comer: false, voar: false, bater: false, olhar: 0 };
  private antes = new THREE.Vector3();
  private rumoAntes = 0;
  private medido = false;
  private olharAlvo = 0;
  /** Segundos do carinho (para, olha para o peregrino e faz a voz). */
  carinho = 0;
  /** Não foge do peregrino (o lobo de Gubbio, que não tem medo de ninguém). */
  semFuga = false;
  /** Segue o peregrino como um bicho manso, seja qual for a ficha (o lobo depois do pacto). */
  seguir = false;

  constructor(
    readonly especie: IdEspecie,
    private centro: THREE.Vector3,
    private raio: number,
  ) {
    this.ficha = ficha(especie);
    this.pos.copy(centro);
    this.destino.copy(centro);
  }

  async montar() {
    this.corpo = await criarCorpo(this.especie).montar(!this.ficha.semSombra);
    this.raiz.add(this.corpo.raiz);
    if (this.voaSempre) this.estado = 'voando';
    return this;
  }

  /** Muda o território do bicho (o lugar onde ele passeia). */
  mudarCasa(centro: THREE.Vector3, raio: number) {
    this.centro = centro.clone();
    this.raio = raio;
    this.sortearDestino();
  }

  private get voaSempre() {
    return this.ficha.comportamento === 'voo_continuo';
  }
  private get voador() {
    return this.voaSempre || this.ficha.comportamento === 'ave_voo';
  }

  private mudar(e: Estado) {
    this.estado = e;
    this.tempoEstado = 0;
  }

  private sortearDestino(longeDe?: THREE.Vector3, minimo = 0) {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.raio;
      this.destino.set(this.centro.x + Math.cos(a) * r, 0, this.centro.z + Math.sin(a) * r);
      if (!longeDe || Math.hypot(this.destino.x - longeDe.x, this.destino.z - longeDe.z) > minimo) return;
    }
  }

  /** Dá um passo no chão; devolve false se o caminho não serve (barranco, água). */
  private passo(fis: Fisica, rumo: number, v: number) {
    const nx = this.pos.x + Math.sin(rumo) * v, nz = this.pos.z + Math.cos(rumo) * v;
    const h = fis.altura(nx, nz);
    const agua = fis.nivelMinimo !== undefined && h < fis.nivelMinimo - 0.05;
    if (Math.abs(h - fis.altura(this.pos.x, this.pos.z)) > 1.05 || (agua && !this.ficha.nada)) return false;
    this.pos.x = nx;
    this.pos.z = nz;
    return true;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    const f = this.ficha;
    this.tempoEstado += dt;
    this.carinho = Math.max(0, this.carinho - dt);
    const dx = this.pos.x - jogador.x, dz = this.pos.z - jogador.z;
    const dist = Math.hypot(dx, dz);
    const susto = !this.semFuga && f.fuga !== undefined && dist < f.fuga && this.carinho <= 0;
    let v = 0;
    let comer = 0;
    let voar = 0;
    let forte = false;

    if (this.carinho > 0) {
      // vem até a mão do peregrino, vira a cabeça para ele e se esfrega de um lado para o outro
      this.rumo = girarPara(this.rumo, Math.atan2(-dx, -dz), dt * 5);
      this.estado = 'parado';
      const perto = anatomia(this.especie).corpo === 'quadruped_medium' ? 1.35 : 0.85;
      if (dist > perto + 0.05) {
        v = Math.min(f.velocidade, (dist - perto) * 3);
        this.passo(fis, this.rumo, v * dt);
      }
      this.olharAlvo = Math.sin(this.tempoEstado * 5) * 0.35;
    } else if (this.voador && (this.estado === 'voando' || this.estado === 'pousando')) {
      voar = 1;
      ({ v, forte } = this.voo(dt, jogador));
    } else if (susto && this.voador) {
      this.mudar('voando');
      this.sortearDestino(jogador, (f.fuga ?? 4) * 2);
    } else if (susto) {
      // foge para longe do peregrino, sem sair demais do território
      if (this.estado !== 'fugindo') this.mudar('fugindo');
      const longe = Math.hypot(this.pos.x - this.centro.x, this.pos.z - this.centro.z) > this.raio * 1.6;
      const alvo = Math.atan2(dx, dz) + (longe ? Math.sign(Math.sin(this.tempoEstado)) * 1.2 : 0);
      this.rumo = girarPara(this.rumo, alvo, dt * 6);
      v = f.velocidade * 2.5;
      if (!this.passo(fis, this.rumo, v * dt)) this.rumo += 1.4;
    } else if ((f.comportamento === 'manso' || this.seguir) && dist < (this.seguir ? 40 : 9) && dist > 2.2) {
      if (this.estado !== 'seguindo') this.mudar('seguindo');
      this.rumo = girarPara(this.rumo, Math.atan2(-dx, -dz), dt * 4);
      v = f.velocidade * (this.seguir ? (dist > 5 ? 3.2 : 1.6) : dist > 5 ? 1.6 : 1);
      this.passo(fis, this.rumo, v * dt);
    } else if (this.estado === 'andando' || this.estado === 'fugindo' || this.estado === 'seguindo') {
      if (this.estado !== 'andando') {
        this.mudar('andando');
        this.sortearDestino();
      }
      const ax = this.destino.x - this.pos.x, az = this.destino.z - this.pos.z;
      if (Math.hypot(ax, az) < 0.5) this.parar();
      else {
        this.rumo = girarPara(this.rumo, Math.atan2(ax, az), dt * 3);
        v = f.velocidade;
        if (!this.passo(fis, this.rumo, v * dt)) this.parar();
      }
    } else {
      // parado ou comendo: conta o tempo e escolhe o próximo passeio
      this.espera -= dt;
      if (this.estado === 'comendo') comer = 1;
      if (this.espera <= 0) {
        this.mudar('andando');
        this.sortearDestino();
      }
    }

    // empurrão de leve quando o peregrino esbarra
    if (dist < 0.9 && !voar) {
      this.pos.x += (dx / (dist || 1)) * dt * 1.5;
      this.pos.z += (dz / (dist || 1)) * dt * 1.5;
    }
    if (!voar) fis.colidir(this.pos, 0.35);

    // altura: no chão, boiando ou no ar
    const chao = fis.altura(this.pos.x, this.pos.z);
    const piso = this.ficha.nada && fis.nivelMinimo !== undefined ? Math.max(chao, fis.nivelMinimo - 0.25) : chao;
    if (voar) {
      const alvo = this.estado === 'pousando' ? 0 : (f.altitude ?? 8);
      this.altura += (alvo - this.altura) * Math.min(1, dt * (this.estado === 'pousando' ? 1.2 : 0.8));
      this.pos.y = piso + this.altura;
    } else {
      this.altura = 0;
      this.pos.y += (piso - this.pos.y) * Math.min(1, dt * 12);
    }

    // pose: o corpo escolhe a animação do Veloren pelo movimento medido (o que andou de fato, depois da colisão)
    if (this.carinho <= 0) this.olharAlvo = 0;
    const p = this.pose;
    p.olhar += (this.olharAlvo - p.olhar) * Math.min(1, dt * 3);
    if (dt > 0) {
      const k = Math.min(1, dt * 10);
      const vel = this.medido ? Math.hypot(this.pos.x - this.antes.x, this.pos.z - this.antes.z) / dt : 0;
      const sub = this.medido ? (this.pos.y - this.antes.y) / dt : 0;
      let dr = this.rumo - this.rumoAntes;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      p.vel += (Math.min(vel, 30) - p.vel) * k;
      p.subida += (Math.max(-20, Math.min(20, sub)) - p.subida) * k;
      p.giro += (dr / dt - p.giro) * k;
    }
    this.antes.copy(this.pos);
    this.rumoAntes = this.rumo;
    this.medido = true;
    p.comer = comer > 0;
    p.voar = voar > 0;
    p.bater = forte || this.altura < (f.altitude ?? 8) * 0.6;
    void v;
    this.corpo.posar(dt, p);
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.y = this.rumo;
    // inclina na curva quando voa
    this.raiz.rotation.z = voar ? Math.sin(this.tempoEstado * 0.8) * 0.25 : 0;
  }

  private parar() {
    const pasta = this.ficha.comportamento !== 'manso' && Math.random() < 0.6;
    this.mudar(pasta ? 'comendo' : 'parado');
    this.espera = 2 + Math.random() * (this.ficha.comportamento === 'pasto' ? 7 : 4);
  }

  /** Voo: circula sobre o território; quem não voa sempre pousa longe do peregrino depois de um tempo. */
  private voo(dt: number, jogador: THREE.Vector3): { v: number; forte: boolean } {
    const f = this.ficha;
    // quem voa sempre plana na própria velocidade; os outros fogem batendo as asas
    const v = this.voaSempre ? f.velocidade : 3.5 + f.velocidade * 2;
    if (this.estado === 'voando') {
      const ax = this.destino.x - this.pos.x, az = this.destino.z - this.pos.z;
      const perto = Math.hypot(ax, az) < 3;
      if (perto) this.sortearDestino();
      this.rumo = girarPara(this.rumo, Math.atan2(ax, az), dt * (this.voaSempre ? 0.9 : 1.6));
      if (!this.voaSempre && this.tempoEstado > 6 + Math.random() * 6) {
        this.mudar('pousando');
        this.sortearDestino(jogador, (f.fuga ?? 4) * 1.8);
      }
    } else {
      const ax = this.destino.x - this.pos.x, az = this.destino.z - this.pos.z;
      this.rumo = girarPara(this.rumo, Math.atan2(ax, az), dt * 2.5);
      if (Math.hypot(ax, az) < 1 || this.tempoEstado > 9) {
        if (this.altura < 0.3) {
          this.parar();
          return { v: 0, forte: false };
        }
      }
    }
    const passo = (this.estado === 'pousando' ? v * 0.5 : v) * dt;
    this.pos.x += Math.sin(this.rumo) * passo;
    this.pos.z += Math.cos(this.rumo) * passo;
    // a águia plana; morcegos e aves assustadas batem as asas sem parar
    return { v: passo / Math.max(dt, 1e-4), forte: !(this.voaSempre && f.velocidade > 5) };
  }
}
