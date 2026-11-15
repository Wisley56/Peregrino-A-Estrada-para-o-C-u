import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { ARISTARCO, LUCAS, PAULO } from '../entidades/Companheiros';
import { MARINHEIROS, NAUCLERO, PILOTO, PRESOS } from '../entidades/GenteDeCreta';
import { Npc, type DefNpc } from '../entidades/Npc';
import { JULIO, soldado } from '../entidades/Romanos';
import { Sombra } from '../entidades/Sombra';
import type { FonteMapa } from '../ui/Minimapa';
import { figurinoDoPovo } from '../voxel/Humano';
import type { Area } from './Area';
import { CABINE, MASTRO, MEIO_COMPRIMENTO, anfora, ancora, bote, bordaEm, convesEm, meiaLarguraConves, navioAlexandrino, sacoDeTrigo } from './NavioModelos';
import { Oceano } from './Oceano';

/** Onde fica o navio no mundo (longe das outras áreas). O navio não sai do lugar: é o mar que corre por ele. */
export const ORIGEM_NAVIO = new THREE.Vector3(2400, 0, 0);
const NIVEL = 8;
/** O fundo, muito abaixo: em toda parte fora do navio se nada. */
const FUNDO = NIVEL - 60;
/** O navio vai um pouco mais alto na água que no porto, para as cristas não lamberem o convés. */
const ALTURA_CASCO = NIVEL + 0.3;
/** A velocidade com que o mar passa (m/s): o navio corre com o vento (At 27,15). */
const VELOCIDADE = 3.4;

/**
 * As etapas da viagem (At 27,14-38), na ordem. Cada uma termina numa flag do save; a etapa atual é a primeira
 * que falta.
 */
export type EtapaNavio = 'bote' | 'cintar' | 'carga' | 'brigas' | 'anjo' | 'sonda' | 'ancoras' | 'fuga' | 'pao' | 'amanhecer';
const ORDEM: [EtapaNavio, string][] = [
  ['bote', 'navio_bote'], ['cintar', 'navio_cintado'], ['carga', 'navio_carga'], ['brigas', 'navio_brigas'], ['anjo', 'navio_anjo'],
  ['sonda', 'navio_sonda'], ['ancoras', 'navio_ancoras'], ['fuga', 'navio_fuga'], ['pao', 'navio_pao'],
];
export function etapaDoNavio(tem: (flag: string) => boolean): EtapaNavio {
  for (const [etapa, flag] of ORDEM) if (!tem(flag)) return etapa;
  return 'amanhecer';
}

/** Quantas cargas o peregrino ajuda a lançar ao mar (At 27,18). */
export const CARGAS = 5;
/** Os pontos onde se passa o cabo por baixo do casco (At 27,17): x, z locais. */
const CABOS: [number, number][] = [[-1, -3.5], [1, 1.5], [-1, 8]];
/** As brigas no convés: o centro de cada par de marinheiros (local). */
const BRIGAS: [number, number][] = [[2.2, 9.5], [2.6, -2.5], [-2.6, -6.2]];
/** As quatro âncoras da popa (At 27,29). */
const ANCORAS: [number, number][] = [[-1.5, -13.6], [-0.5, -13.6], [0.5, -13.6], [1.5, -13.6]];
/** A pilha da carga, ao lado da escotilha. */
const PILHA = { x: -2.3, z: 5 };

const marujo = (n: number, pele: number, cor: number): DefNpc => ({
  id: `navio_marinheiro_${n}`, falante: 'marinheiro', no: 'navio_marinheiro', rotulo: 'F: falar com o marinheiro',
  visual: { genero: 'm', idade: 'jovem', pele, penteado: 'curto', corCabelo: 0x231a17, barba: n % 2 ? 'curta' : undefined, traje: 'avental', cor, cor2: 0x5a4a3a },
});
const doNavio = (d: DefNpc, no: string): DefNpc => ({ ...d, id: `navio_${d.id}`, no });

/**
 * O navio de Alexandria no meio da tempestade (At 27,14-38): o Euraquilão, catorze dias sem sol nem estrelas, o anjo
 * que Paulo viu, as âncoras da popa, a fuga dos marinheiros e o pão partido antes do amanhecer. É a segunda parte do
 * Mar da Tempestade; o naufrágio e a Ira vêm depois.
 *
 * - O navio fica parado no mundo; o mar corre por ele (`Oceano.deriva`) e a câmera balança (`balancar`), como quem
 *   está a bordo. Chuva em volta do peregrino, relâmpagos que clareiam tudo.
 * - As etapas vêm das flags (`etapaDoNavio`); `arrumar` põe cada coisa e cada um no lugar da etapa.
 * - As ondas que varrem o convés vêm de tempos em tempos (`ondasAtivas`): quem não está junto do mastro é empurrado,
 *   e quem cai no mar é puxado de volta pelos marinheiros (no Jogo).
 */
export class Tempestade implements Area {
  readonly id = 'navio' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly nivelMinimo = NIVEL;
  readonly oceano = new Oceano(NIVEL, 0x1d4f5e);
  /** Onde se chega e onde se volta depois de cair no mar: junto do mastro. */
  readonly chegada: THREE.Vector3;
  readonly npcs: Npc[] = [];
  readonly paulo: Npc;
  readonly julio: Npc;
  /** Os pares de marinheiros que brigam. */
  readonly brigas: [Npc, Npc][] = [];
  /** 0 (dia de tempestade) … 1 (a noite sem estrelas). */
  escuridao = 0.35;
  /** O clarão do relâmpago (0 … 1), que o Jogo soma à luz. */
  relampago = 0;
  /** As ondas no convés só vêm enquanto há trabalho a fazer (o Jogo liga). */
  ondasAtivas = false;
  /** Durante as conversas e as trocas de área o mar não manda ondas ao convés. */
  pausa = false;
  /** Avisos para o Jogo: a onda vem, a onda quebrou (lado: -1 bombordo, 1 estibordo), o trovão. */
  aoAvisarOnda: (() => void) | null = null;
  aoQuebrarOnda: ((lado: number) => void) | null = null;
  aoTrovejar: (() => void) | null = null;

  private readonly navio = new THREE.Vector3();
  private readonly modelo: THREE.Group;
  private readonly boteMalha: THREE.Mesh;
  private readonly cabosVisuais: THREE.Mesh[] = [];
  private readonly cargas: THREE.Object3D[] = [];
  private readonly ancoras: THREE.Mesh[] = [];
  private readonly chuva: THREE.LineSegments;
  private readonly gotas: Float32Array;
  private readonly luzRaio = new THREE.AmbientLight(0xdde6ff, 0);
  private readonly sorte = aleatorio(2714);
  private t = 0;
  private proximoRaio = 4;
  private trovaoEm = -1;
  private proximaOnda = 14;
  private avisou = false;
  private ladoOnda = 1;
  private boteNaAgua: 'reboque' | 'conves' | 'fuga' | 'longe' = 'reboque';
  private boteDeriva = 0;
  private gestoT = 0;
  private readonly circulos: { x: number; z: number; r: number }[] = [];

  constructor() {
    this.navio.set(ORIGEM_NAVIO.x, ALTURA_CASCO, ORIGEM_NAVIO.z);
    this.oceano.intensidade = 1;
    this.oceano.amplitude = 1.45;
    this.oceano.deriva.set(0, VELOCIDADE);
    this.modelo = navioAlexandrino(false, false);
    this.modelo.position.copy(this.navio);
    this.grupo.add(this.modelo, this.oceano.malha, this.luzRaio);

    this.boteMalha = bote();
    this.boteMalha.castShadow = true;
    this.grupo.add(this.boteMalha);

    // os cabos passados por baixo do casco: uma cinta de corda de borda a borda (aparecem quando passados)
    for (const [, z] of CABOS) {
      const meia = meiaLarguraConves(z) + 0.4;
      const cinta = new THREE.Mesh(new THREE.TorusGeometry(meia, 0.06, 4, 24, Math.PI), new THREE.MeshLambertMaterial({ color: 0xb9a57a }));
      cinta.position.set(this.navio.x, this.navio.y + bordaEm(z) - 0.05, this.navio.z + z);
      cinta.rotation.set(0, 0, Math.PI); // o arco abre para baixo, abraçando o casco
      cinta.scale.y = (bordaEm(z) + 1.6) / meia;
      cinta.visible = false;
      this.cabosVisuais.push(cinta);
      this.grupo.add(cinta);
    }
    // a carga ao lado da escotilha: sacos de trigo e ânforas, que vão sendo lançados ao mar
    for (let i = 0; i < CARGAS + 3; i++) {
      const c = i % 3 === 2 ? anfora(i) : sacoDeTrigo(i);
      const lx = PILHA.x + ((i % 3) - 1) * 0.5, lz = PILHA.z + (Math.floor(i / 3) - 1) * 0.55;
      c.position.set(this.navio.x + lx, this.navio.y + convesEm(lz) + (i >= 6 ? 0.4 : 0), this.navio.z + lz);
      c.rotation.y = i * 0.9;
      this.cargas.push(c);
      this.grupo.add(c);
    }
    this.circulos.push({ x: this.navio.x + PILHA.x, z: this.navio.z + PILHA.z, r: 0.85 });
    for (const [x, z] of ANCORAS) {
      const a = ancora();
      a.position.set(this.navio.x + x, this.navio.y + convesEm(z) + 0.02, this.navio.z + z);
      a.rotation.y = Math.PI / 2;
      this.ancoras.push(a);
      this.grupo.add(a);
    }

    // a chuva: riscos que caem de lado com o vento, numa caixa em volta do peregrino
    const N = 1400;
    this.gotas = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) this.reporGota(i, new THREE.Vector3(), true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.gotas, 3));
    this.chuva = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xb8c4cc, transparent: true, opacity: 0.45 }));
    this.chuva.frustumCulled = false;
    this.grupo.add(this.chuva);

    // a gente a bordo
    const npc = (def: DefNpc) => {
      const n = new Npc(def, this.navio, 0);
      this.grupo.add(n.raiz);
      this.npcs.push(n);
      return n;
    };
    this.paulo = npc(doNavio(PAULO, 'navio_paulo'));
    npc(doNavio(LUCAS, 'navio_lucas'));
    npc(doNavio(ARISTARCO, 'navio_aristarco'));
    this.julio = npc(doNavio(JULIO, 'navio_julio'));
    npc(doNavio(PILOTO, 'navio_piloto'));
    npc(doNavio(NAUCLERO, 'navio_nauclero'));
    npc(doNavio(soldado(1), 'navio_soldado'));
    npc(doNavio(soldado(2), 'navio_soldado'));
    npc(doNavio(PRESOS[0], 'navio_preso'));
    npc(doNavio(PRESOS[1], 'navio_preso'));
    const peles = [0x8a5a3a, 0xb07a52, 0x6a4430, 0xa06a46, 0x7a4e34, 0xc08a60];
    const roupas = [0x7a6a52, 0x5a6a72, 0x8a7a5a, 0x6a5a48, 0x4a5a6a, 0x7a5a42];
    for (let k = 0; k < 3; k++) {
      const a = npc(marujo(k * 2, peles[k * 2], roupas[k * 2]));
      const b = npc(k === 0 ? doNavio(MARINHEIROS[0], 'navio_marinheiro') : marujo(k * 2 + 1, peles[k * 2 + 1], roupas[k * 2 + 1]));
      this.brigas.push([a, b]);
    }
    npc({ id: 'navio_marinheiro_velho', falante: 'marinheiro', no: 'navio_marinheiro', rotulo: 'F: falar com o marinheiro', visual: { ...figurinoDoPovo(733, 'pobre'), genero: 'm', idade: 'idoso', barba: 'longa', acessorio: undefined } });

    this.chegada = this.local(1.6, MASTRO.z + 1.2);
  }

  // ───────────── ajudantes ─────────────

  /** Ponto do mundo a partir de coordenadas locais do navio, em cima do convés. */
  local(lx: number, lz: number) {
    return new THREE.Vector3(this.navio.x + lx, this.navio.y + convesEm(lz), this.navio.z + lz);
  }

  /** Onde se segura o cabo do bote, na popa. */
  get cabosDoBote() {
    return this.local(0, -MEIO_COMPRIMENTO + 1.4);
  }
  /** Os pontos da borda onde se passa cada cabo por baixo do casco. */
  pontoDoCabo(i: number) {
    const [lado, z] = CABOS[i];
    return this.local(lado * (meiaLarguraConves(z) - 0.4), z);
  }
  get pilha() {
    return this.local(PILHA.x + 0.9, PILHA.z);
  }
  /** O ponto da borda mais perto de `p` (para lançar a carga ao mar). */
  bordaPerto(p: THREE.Vector3) {
    const lz = Math.max(-MEIO_COMPRIMENTO + 3, Math.min(MEIO_COMPRIMENTO - 3, p.z - this.navio.z));
    const lado = p.x >= this.navio.x ? 1 : -1;
    return this.local(lado * (meiaLarguraConves(lz) - 0.3), lz);
  }
  centroDaBriga(i: number) {
    return this.local(BRIGAS[i][0], BRIGAS[i][1]);
  }
  get proa() {
    return this.local(0, MEIO_COMPRIMENTO - 2.2);
  }
  pontoDaAncora(i: number) {
    return this.local(ANCORAS[i][0], ANCORAS[i][1] + 0.6);
  }
  get mastro() {
    return this.local(MASTRO.x, MASTRO.z);
  }
  /** Distância (m) do ponto ao mastro, no plano. */
  pertoDoMastro(p: THREE.Vector3) {
    return Math.hypot(p.x - (this.navio.x + MASTRO.x), p.z - (this.navio.z + MASTRO.z));
  }

  private reporGota(i: number, centro: THREE.Vector3, espalhar: boolean) {
    const x = centro.x + (this.sorte() - 0.5) * 44, z = centro.z + (this.sorte() - 0.5) * 44;
    const y = centro.y + (espalhar ? this.sorte() * 26 - 6 : 18 + this.sorte() * 4);
    const o = i * 6;
    this.gotas[o] = x;
    this.gotas[o + 1] = y;
    this.gotas[o + 2] = z;
    this.gotas[o + 3] = x - 0.18;
    this.gotas[o + 4] = y - 0.9;
    this.gotas[o + 5] = z - 0.35;
  }

  // ───────────── a história ─────────────

  /** Cada coisa e cada um no seu lugar, conforme a etapa. */
  arrumar(tem: (flag: string) => boolean) {
    const etapa = etapaDoNavio(tem);
    const i = ORDEM.findIndex(([e]) => e === etapa);
    const passou = (e: EtapaNavio) => i === -1 || ORDEM.findIndex(([x]) => x === e) < i;
    this.escuridao = { bote: 0.35, cintar: 0.4, carga: 0.5, brigas: 0.78, anjo: 0.86, sonda: 0.93, ancoras: 0.93, fuga: 0.95, pao: 0.75, amanhecer: 0.45 }[etapa];
    this.ondasAtivas = etapa === 'bote' || etapa === 'cintar' || etapa === 'carga' || etapa === 'brigas';
    this.boteNaAgua = etapa === 'bote' ? 'reboque' : etapa === 'fuga' ? 'fuga' : passou('fuga') ? 'longe' : 'conves';
    this.boteDeriva = 0;
    CABOS.forEach((_, k) => (this.cabosVisuais[k].visible = passou('cintar') || tem(`navio_cabo_${k + 1}`)));
    const lancadas = passou('carga') ? CARGAS : [1, 2, 3, 4, 5].filter((n) => tem(`navio_lancou_${n}`)).length;
    this.cargas.forEach((c, k) => (c.visible = k >= lancadas));
    this.ancoras.forEach((a, k) => (a.visible = !passou('ancoras') && !tem(`navio_ancora_${k + 1}`)));

    const [paulo, lucas, aristarco, julio, piloto, nauclero, sold1, sold2, preso1, preso2] = this.npcs;
    const por = (n: Npc, lx: number, lz: number, rumo: number) => n.colocar(this.local(lx, lz), rumo);
    if (etapa === 'pao' || etapa === 'amanhecer') {
      // todos em volta do mastro, para o pão que Paulo parte (At 27,35-36)
      por(paulo, 0, MASTRO.z - 1.4, 0);
      const roda = [lucas, aristarco, julio, nauclero, sold1, sold2, preso1, preso2, ...this.brigas.flat(), this.npcs[this.npcs.length - 1]];
      roda.forEach((n, k) => {
        const a = Math.PI * 0.15 + (k / roda.length) * Math.PI * 1.7;
        const r = 2.6 + (k % 2) * 0.9;
        const lx = Math.sin(a) * r * 0.85, lz = MASTRO.z + Math.cos(a) * r;
        por(n, lx, lz, Math.atan2(-lx, MASTRO.z - lz));
      });
      por(piloto, 2.9, -10.5, Math.PI);
      return;
    }
    por(paulo, -1.2, MASTRO.z - 1.2, Math.PI / 2);
    por(lucas, -2.3, MASTRO.z - 2.6, Math.PI / 3);
    por(aristarco, -0.4, MASTRO.z - 2.9, 0);
    por(julio, 1.4, CABINE.z1 + 1.3, 0);
    por(piloto, 2.9, -10.5, Math.PI);
    por(nauclero, -2.9, -9.8, Math.PI * 0.75);
    por(sold1, -1.3, CABINE.z1 + 1.5, 0.3);
    por(sold2, 2.8, 7.5, -Math.PI / 2);
    por(preso1, -3.1, 7.6, Math.PI / 2);
    por(preso2, -3.2, 9.1, Math.PI / 2);
    this.brigas.forEach(([a, b], k) => {
      const [cx, cz] = BRIGAS[k];
      if (etapa === 'brigas' && !tem(`navio_briga_${k + 1}`)) {
        // frente a frente, de punho fechado
        por(a, cx - 0.65, cz, Math.PI / 2);
        por(b, cx + 0.65, cz, -Math.PI / 2);
      } else {
        por(a, cx - 1.1, cz - 0.6, Math.PI / 2 + 0.6);
        por(b, cx + 1.1, cz + 0.5, -Math.PI / 2 - 0.4);
      }
    });
    if (etapa === 'fuga') {
      // os marinheiros junto do bote, já na água, fingindo lançar as âncoras da proa (At 27,30)
      const [m1, m2] = this.brigas[0];
      por(m1, 3.0, 10.4, Math.PI / 2);
      por(m2, 2.6, 11.6, Math.PI / 2);
    }
  }

  // ───────────── o quadro ─────────────

  /** Balança a câmera como o convés: rola de um bordo ao outro e arfa de proa a popa. Depois que ela se posicionou. */
  balancar(cam: THREE.Camera) {
    const k = 0.7 + this.escuridao * 0.5;
    const rolagem = (Math.sin(this.t * 0.83) * 0.07 + Math.sin(this.t * 1.71 + 1) * 0.025) * k;
    const arfagem = (Math.sin(this.t * 0.61 + 2) * 0.035 + Math.sin(this.t * 1.33) * 0.012) * k;
    cam.rotateZ(rolagem);
    cam.rotateX(arfagem);
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.oceano.atualizar(dt, jogador);
    for (const n of this.npcs) n.atualizar(dt, jogador);

    // as brigas: os dois gesticulam um para o outro
    this.gestoT -= dt;
    if (this.gestoT <= 0) {
      this.gestoT = 1.6 + this.sorte() * 1.2;
      for (const [a, b] of this.brigas) {
        if (Math.abs(a.pos.x - b.pos.x) < 1.5 && !a.falando && !b.falando) {
          a.gestos.tocar('nao');
          setTimeout(() => b.gestos.tocar('nao'), 500);
        }
      }
    }

    // o bote: a reboque atrás da popa, no convés, ou na água à proa, indo embora depois de cortadas as cordas
    const b = this.boteMalha;
    b.visible = this.boteNaAgua !== 'longe' || this.boteDeriva < 60;
    if (this.boteNaAgua === 'reboque') {
      const z = this.navio.z - MEIO_COMPRIMENTO - 5;
      b.position.set(this.navio.x + Math.sin(this.t * 0.7) * 0.8, this.oceano.altura(this.navio.x, z) + 0.2, z);
      b.rotation.set(Math.sin(this.t * 1.3) * 0.12, Math.sin(this.t * 0.5) * 0.15, Math.sin(this.t * 1.1) * 0.15);
    } else if (this.boteNaAgua === 'conves') {
      b.position.copy(this.local(2.45, 4.6)).y += 0.5;
      b.rotation.set(0, 0, 0.12);
    } else {
      if (this.boteNaAgua === 'longe') this.boteDeriva += dt * 4;
      const x = this.navio.x + 5.6 + this.boteDeriva * 0.3, z = this.navio.z + 9 - this.boteDeriva;
      b.position.set(x, this.oceano.altura(x, z) + 0.2 - Math.max(0, this.boteDeriva - 30) * 0.05, z);
      b.rotation.set(Math.sin(this.t * 1.3) * 0.15, 0.2, Math.sin(this.t * 1.1) * 0.18);
    }

    // a chuva cai inclinada pelo vento e renasce no alto
    const g = this.gotas;
    const queda = 22 * dt;
    for (let i = 0; i < g.length; i += 6) {
      g[i] -= queda * 0.2;
      g[i + 3] -= queda * 0.2;
      g[i + 1] -= queda;
      g[i + 4] -= queda;
      g[i + 2] -= queda * 0.4;
      g[i + 5] -= queda * 0.4;
      if (g[i + 1] < NIVEL - 2 || Math.abs(g[i] - jogador.x) > 24 || Math.abs(g[i + 2] - jogador.z) > 24) this.reporGota(i / 6, jogador, false);
    }
    (this.chuva.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    // os relâmpagos (e o trovão, um pouco depois)
    this.proximoRaio -= dt;
    if (this.proximoRaio <= 0) {
      this.proximoRaio = 5 + this.sorte() * 9;
      this.relampago = 1;
      this.trovaoEm = 0.5 + this.sorte() * 1.2;
    }
    if (this.trovaoEm > 0) {
      this.trovaoEm -= dt;
      if (this.trovaoEm <= 0) this.aoTrovejar?.();
    }
    this.relampago = Math.max(0, this.relampago - dt * (this.relampago > 0.5 ? 6 : 2.2));
    this.luzRaio.intensity = this.relampago * 2.4;

    // as ondas que varrem o convés
    if (this.ondasAtivas && !this.pausa) {
      this.proximaOnda -= dt;
      if (!this.avisou && this.proximaOnda <= 2.2) {
        this.avisou = true;
        this.ladoOnda = this.sorte() < 0.5 ? -1 : 1;
        this.aoAvisarOnda?.();
      }
      if (this.proximaOnda <= 0) {
        this.aoQuebrarOnda?.(this.ladoOnda);
        this.proximaOnda = 16 + this.sorte() * 12;
        this.avisou = false;
      }
    }
  }

  /** O bote já foi cortado: segue à deriva e some. */
  soltarBote() {
    this.boteNaAgua = 'longe';
    this.boteDeriva = 0;
  }

  // ───────────── física ─────────────

  private alturaNavio(x: number, z: number): number | null {
    const lx = x - this.navio.x, lz = z - this.navio.z;
    if (Math.abs(lz) >= MEIO_COMPRIMENTO - 0.25) return null;
    const meia = meiaLarguraConves(lz);
    if (Math.abs(lx) > meia + 0.3) return null;
    const conves = this.navio.y + convesEm(lz);
    if (Math.abs(lx) > meia) return this.navio.y + bordaEm(lz);
    if (lx > CABINE.x0 && lx < CABINE.x1 && lz > CABINE.z0 && lz < CABINE.z1) return conves + CABINE.altura + 0.7;
    if (lz > 3.5 && lz < 6.5 && Math.abs(lx) < 1.5) return conves + 0.25; // a escotilha
    if (this.boteNaAgua === 'conves' && lx > 1.6 && lx < 3.3 && lz > 2.1 && lz < 7.1) return conves + 0.75; // o bote içado
    return conves;
  }

  altura(x: number, z: number) {
    return this.alturaNavio(x, z) ?? FUNDO;
  }

  colidir(pos: THREE.Vector3, raio: number) {
    const mx = this.navio.x + MASTRO.x, mz = this.navio.z + MASTRO.z;
    const extras: { x: number; z: number; r: number }[] = [{ x: mx, z: mz, r: 0.35 }];
    for (const n of this.npcs) extras.push({ x: n.pos.x, z: n.pos.z, r: 0.35 });
    for (const c of [...this.circulos, ...extras]) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + raio;
      if (d >= min || d < 1e-6) continue;
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }

  nivelAgua(x: number, z: number) {
    return this.oceano.altura(x, z);
  }

  fonteMapa(): FonteMapa {
    const lado = 64;
    return {
      x0: this.navio.x - lado / 2, z0: this.navio.z - lado / 2, largura: lado, profundidade: lado,
      cor: (x, z) => (this.alturaNavio(x, z) !== null ? 0x7a5636 : 0x1d3f4a),
    };
  }
}
