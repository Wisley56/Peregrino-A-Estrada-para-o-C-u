import * as THREE from 'three';
import type { Fisica } from '../entidades/Peregrino';
import { Animal } from './Animal';
import type { IdEspecie, VozAnimal } from './Especies';

/** Um grupo de bichos de uma espécie numa parte da região. */
export interface Povoamento {
  especie: IdEspecie;
  quantidade: number;
  /** Centro do território (x, z no mundo). */
  centro: THREE.Vector3 | [number, number];
  /** Raio do território (m). */
  raio: number;
}

/** A partir desta distância o bicho some e para de pensar; entre ATIVO e VISIVEL ele só fica parado. */
const DIST_ATIVO = 55;
const DIST_VISIVEL = 95;
/** Bandos sob demanda: nascem quando o peregrino chega a esta distância do território e somem além de SITIO_SAI. */
const SITIO_ENTRA = 170;
const SITIO_SAI = 260;

/** Um bando sob demanda: o território e os bichos dele, quando existem. */
interface Sitio {
  p: Povoamento;
  semente: number;
  bichos: Animal[] | null;
  carregando: boolean;
}

/**
 * Fauna de uma região. A área declara o povoamento (quem vive onde) e a Fauna cuida do resto: sorteia lugares
 * válidos no chão, carrega os corpos do Veloren (geometria compartilhada entre os bichos da mesma espécie),
 * atualiza só quem está perto e toca uma voz de vez em quando.
 */
export class Fauna {
  readonly grupo = new THREE.Group();
  readonly animais: Animal[] = [];
  private tempoVoz = 4 + Math.random() * 6;
  private sitios: Sitio[] = [];
  private tempoSitios = 0;

  constructor(private fis: Fisica) {
    this.grupo.name = 'fauna';
  }

  /** A área foi recriada (a cripta é remontada a cada partida): os bichos passam a andar no chão novo. */
  trocarFisica(fis: Fisica) {
    this.fis = fis;
  }

  /** Cria os bichos. `semente` deixa a distribuição igual a cada partida. */
  async povoar(povoamento: Povoamento[], semente = 1) {
    let a = semente >>> 0;
    const rnd = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const criados: Promise<Animal>[] = [];
    for (const p of povoamento) {
      const c = Array.isArray(p.centro) ? new THREE.Vector3(p.centro[0], 0, p.centro[1]) : p.centro.clone();
      for (let i = 0; i < p.quantidade; i++) {
        const bicho = new Animal(p.especie, c, p.raio);
        this.lugarValido(bicho, c, p.raio, rnd);
        criados.push(bicho.montar());
      }
    }
    for (const b of await Promise.all(criados)) {
      this.animais.push(b);
      this.grupo.add(b.raiz);
      b.raiz.position.copy(b.pos);
    }
  }

  /**
   * Povoamento sob demanda, para um mundo grande: cada bando só existe com o peregrino perto (SITIO_ENTRA) e some
   * longe (SITIO_SAI). O lugar de cada bicho sai da semente do bando, então ele volta sempre do mesmo jeito.
   */
  definirSitios(povoamento: Povoamento[], semente = 1) {
    this.sitios = povoamento.map((p, i) => ({ p, semente: (semente + i * 7919) >>> 0, bichos: null, carregando: false }));
    this.tempoSitios = 0;
  }

  /** Quantos bandos sob demanda há, e quantos estão soltos agora. */
  get contagemSitios() {
    return { total: this.sitios.length, soltos: this.sitios.filter((s) => s.bichos).length };
  }

  private reverSitios(jogador: THREE.Vector3) {
    for (const s of this.sitios) {
      const [cx, cz] = Array.isArray(s.p.centro) ? s.p.centro : [s.p.centro.x, s.p.centro.z];
      const d = Math.hypot(cx - jogador.x, cz - jogador.z) - s.p.raio;
      if (d < SITIO_ENTRA && !s.bichos && !s.carregando) void this.soltar(s);
      else if (d > SITIO_SAI && s.bichos) {
        for (const b of s.bichos) {
          this.grupo.remove(b.raiz);
          const i = this.animais.indexOf(b);
          if (i >= 0) this.animais.splice(i, 1);
        }
        s.bichos = null;
      }
    }
  }

  private async soltar(s: Sitio) {
    s.carregando = true;
    let a = s.semente;
    const rnd = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const c = Array.isArray(s.p.centro) ? new THREE.Vector3(s.p.centro[0], 0, s.p.centro[1]) : s.p.centro.clone();
    const bichos = await Promise.all(
      Array.from({ length: s.p.quantidade }, () => {
        const b = new Animal(s.p.especie, c, s.p.raio);
        this.lugarValido(b, c, s.p.raio, rnd);
        return b.montar();
      }),
    );
    s.carregando = false;
    s.bichos = bichos;
    for (const b of bichos) {
      b.raiz.position.copy(b.pos);
      b.raiz.visible = false;
      this.animais.push(b);
      this.grupo.add(b.raiz);
    }
  }

  private lugarValido(b: Animal, c: THREE.Vector3, raio: number, rnd: () => number) {
    const f = this.fis;
    for (let k = 0; k < 24; k++) {
      const ang = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * raio;
      const x = c.x + Math.cos(ang) * r, z = c.z + Math.sin(ang) * r;
      const h = f.altura(x, z);
      if (f.nivelMinimo !== undefined && h < f.nivelMinimo && !b.ficha.nada) continue;
      if (Math.abs(f.altura(x + 1, z) - h) > 1 || Math.abs(f.altura(x, z + 1) - h) > 1) continue;
      const p = new THREE.Vector3(x, h, z);
      f.colidir(p, 0.4);
      if (Math.hypot(p.x - x, p.z - z) > 0.01) continue; // dentro de parede ou pedra
      b.pos.copy(p);
      return;
    }
    b.pos.set(c.x, f.altura(c.x, c.z), c.z);
  }

  /** `voz` toca o som de um bicho perto (o Jogo liga isso ao sintetizador). */
  atualizar(dt: number, jogador: THREE.Vector3, voz?: (v: VozAnimal, distancia: number) => void) {
    if (this.sitios.length && (this.tempoSitios -= dt) <= 0) {
      this.tempoSitios = 0.5;
      this.reverSitios(jogador);
    }
    let maisPerto: Animal | null = null;
    let dPerto = Infinity;
    for (const b of this.animais) {
      const d = Math.hypot(b.pos.x - jogador.x, b.pos.z - jogador.z);
      b.raiz.visible = d < DIST_VISIVEL;
      if (d > DIST_ATIVO) continue;
      b.atualizar(dt, this.fis, jogador);
      if (b.ficha.voz && d < dPerto) {
        dPerto = d;
        maisPerto = b;
      }
    }
    // de tempos em tempos, o bicho mais perto se faz ouvir
    this.tempoVoz -= dt;
    if (this.tempoVoz <= 0) {
      this.tempoVoz = 7 + Math.random() * 12;
      if (maisPerto && dPerto < 16 && voz) voz(maisPerto.ficha.voz!, dPerto);
    }
  }
}
