import * as THREE from 'three';
import { aleatorio, Ruido } from '../core/Ruido';
import { ARISTARCO, LUCAS, PAULO } from '../entidades/Companheiros';
import { deitado } from '../entidades/Enfermos';
import { MARINHEIROS, NAUCLERO, PILOTO, PRESOS } from '../entidades/GenteDeCreta';
import { Ira } from '../entidades/Ira';
import { Npc, type DefNpc } from '../entidades/Npc';
import { JULIO, soldado } from '../entidades/Romanos';
import { Sombra } from '../entidades/Sombra';
import type { FonteMapa } from '../ui/Minimapa';
import { figurinoDoPovo, montarHumano } from '../voxel/Humano';
import { variar } from '../voxel/Modelo';
import type { Area } from './Area';
import { Chuva } from './Chuva';
import { BORDA_PAREDE, CABINE, MASTRO, MEIO_COMPRIMENTO, bordaEm, convesEm, meiaLarguraConves, navioAlexandrino } from './NavioModelos';
import { Oceano } from './Oceano';
import { blocosDeColunas } from './Terreno';
import { NIVEL_MAR, ORIGENS } from './aberto/Geografia';

/** Canto da enseada no mundo (longe das outras áreas). */
export const ORIGEM_NAUFRAGIO = ORIGENS.naufragio;
export const ID_IRA = 'naufragio_ira';
const TAM = 200;
const META = TAM / 2;
const NIVEL = NIVEL_MAR;
const FUNDO_ABERTO = NIVEL - 9;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A linha da praia (z local) em cada x: a terra de Malta fica ao sul (z menor); nas pontas, os promontórios. */
function costa(x: number) {
  return -42 + 5 * Math.sin(x * 0.04 + 0.5) + 2.5 * Math.sin(x * 0.11) + suave(50, 88, Math.abs(x)) * 46;
}
/** O banco de areia "entre dois mares" (At 27,41): onde a proa encravou (z do meio da crista). */
function banco(x: number) {
  return 18 + 2 * Math.sin(x * 0.06);
}

/** O navio encalhado: o meio dele (local), a proa para a praia (-z), a proa erguida e a popa afundando. */
const NAVIO = { x: 0, z: 30 };
/** A inclinação do navio (rad): a proa presa na areia, a popa caída para o mar. */
const INCLINACAO = 0.105;
/** A linha d'água do meio do navio, abaixo do nível do mar: ele afundou com o encalhe. */
const BAIXA = 0.925;
/** A brecha da borda, dos dois lados, por onde se desce ao mar (z local do navio). */
const BRECHA = { z0: 4.5, z1: 8.5 };
/** Daqui para a popa, a borda falsa se desfez com as ondas (z local do navio). */
const POPA_QUEBRADA = -7;
/** A arena: as águas rasas entre o banco e a praia (local). */
const ARENA = { x0: -30, x1: 30, z0: -35, z1: 8 };
/** Os baixios de areia (x, z, raio) e o poço fundo (x, z, raio) no meio da arena. */
const BAIXIOS: [number, number, number][] = [[-15, -14, 4], [13, -22, 3.5], [-4, -29, 3]];
const POCO: [number, number, number] = [11, -6, 3.5];
/** O rochedo da ponta leste (as "ilhas de São Paulo", na tradição de Malta). */
const ILHOTA = { x: 74, z: 22, r: 9 };

/** A ordem do naufrágio (At 27,41-44; 28,1): os presos, a Ira, a praia. */
export type EtapaNaufragio = 'presos' | 'ira' | 'praia';
export function etapaDoNaufragio(tem: (flag: string) => boolean): EtapaNaufragio {
  if (!tem('naufragio_presos')) return 'presos';
  if (!tem('naufragio_ira_vencida')) return 'ira';
  return 'praia';
}

export interface EventosNaufragio {
  lutaComecou: () => void;
}

const doNaufragio = (d: DefNpc, no: string): DefNpc => ({ ...d, id: `naufragio_${d.id}`, no });

/**
 * O naufrágio, na enseada de Malta (At 27,39-44): a terceira parte do Mar da Tempestade, onde está o chefão, a Ira.
 * Malta em si (o fogo, a víbora, Públio e a cor que volta) é a parte seguinte, e vai se abrir a partir desta praia.
 *
 * - O mapa (200 × 200 m) é de blocos (`blocosDeColunas`): a praia ao sul, os morros de calcário de Malta atrás dela,
 *   os dois promontórios fechando a enseada, o rochedo da ponta leste e, no meio, o banco de areia onde o navio
 *   encalhou. Entre o banco e a praia, águas rasas onde se vadeia: é a arena.
 * - O navio fica de proa para a praia, com a proa erguida e cravada na areia e a popa afundando, varrida pelas
 *   ondas (At 27,41). A física segue a inclinação (`alturaNavio`). Desce-se pela brecha da borda; da água, sobe-se
 *   pela popa, que a borda já não protege.
 * - Etapas (`etapaDoNaufragio`): os soldados querem matar os presos (At 27,42) e Júlio os impede (27,43); todos se
 *   lançam ao mar, uns nadando e outros em tábuas (27,43-44), e a Ira sobe da água entre eles e a praia; vencida
 *   ela, todos estão na praia (27,44).
 */
export class Naufragio implements Area {
  readonly id = 'naufragio' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly nivelMinimo = NIVEL;
  readonly oceano = new Oceano(NIVEL, 0x1d4f5e);
  readonly npcs: Npc[] = [];
  readonly paulo: Npc;
  readonly julio: Npc;
  readonly soldados: Npc[] = [];
  readonly presos: Npc[] = [];
  /** Onde se chega com o encalhe (na proa) e o lugar da praia. */
  readonly chegada: THREE.Vector3;
  readonly praia: THREE.Vector3;
  readonly arenaEntrada: THREE.Vector3;
  chefe: Ira | null = null;
  lutando = false;
  /** Durante as conversas e a queda: os náufragos não se movem e o mar não manda raios. */
  pausa = false;
  escuridao = 0.55;
  relampago = 0;
  aoTrovejar: (() => void) | null = null;

  private readonly ruido = new Ruido(4127);
  private readonly ruidoCor = new Ruido(4128);
  private readonly alturas = new Int16Array(TAM * TAM);
  private readonly navio = new THREE.Vector3();
  private readonly modelo: THREE.Group;
  private readonly chuva = new Chuva(NIVEL);
  private readonly luzRaio = new THREE.AmbientLight(0xdde6ff, 0);
  private readonly sorte = aleatorio(2741);
  private readonly tabuas: THREE.InstancedMesh;
  private readonly destrocos: { p: THREE.Vector3; v: THREE.Vector3; giro: number; tam: number }[] = [];
  private readonly naufragos: { raiz: THREE.Group; tabua: THREE.Mesh; inicio: THREE.Vector3; fim: THREE.Vector3; t: number; fase: number }[] = [];
  private readonly lim = {
    x0: ARENA.x0 + ORIGEM_NAUFRAGIO.x, x1: ARENA.x1 + ORIGEM_NAUFRAGIO.x,
    z0: ARENA.z0 + ORIGEM_NAUFRAGIO.z, z1: ARENA.z1 + ORIGEM_NAUFRAGIO.z,
  };
  private etapa: EtapaNaufragio = 'presos';
  private t = 0;
  private proximoRaio = 3;
  private trovaoEm = -1;
  private vencido = false;

  constructor(private readonly eventos: EventosNaufragio) {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) this.alturas[i * TAM + j] = Math.round(this.bruto(i - META + 0.5, j - META + 0.5));
    const terreno = blocosDeColunas(TAM, (i, j) => this.h(i, j), (i, j, h) => this.corTopo(i, j, h), (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 12);
    terreno.position.copy(ORIGEM_NAUFRAGIO);
    this.oceano.intensidade = 0.55;
    this.oceano.amplitude = 0.45;
    this.aoRedor.add(this.oceano.malha, this.chuva.malha);
    this.grupo.add(terreno, this.aoRedor, this.luzRaio);

    // o navio encalhado: virado para a praia, a proa erguida e a popa afundada
    this.navio.set(NAVIO.x + ORIGEM_NAUFRAGIO.x, NIVEL - BAIXA, NAVIO.z + ORIGEM_NAUFRAGIO.z);
    this.modelo = navioAlexandrino(false, false);
    this.modelo.position.copy(this.navio);
    this.modelo.rotation.set(INCLINACAO, Math.PI, 0);
    this.grupo.add(this.modelo);

    // as tábuas: as que boiam pela enseada e as que a popa vai soltando
    this.tabuas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.12, 2.6), new THREE.MeshLambertMaterial({ color: 0x6a4a30 }), 40);
    this.tabuas.castShadow = true;
    this.tabuas.frustumCulled = false;
    this.grupo.add(this.tabuas);
    for (let i = 0; i < 40; i++) {
      const presa = i < 22;
      const x = presa ? (this.sorte() - 0.5) * 70 : (this.sorte() - 0.5) * 8;
      const z = presa ? -30 + this.sorte() * 70 : 40 + this.sorte() * 6;
      this.destrocos.push({
        p: this.w(x, z), v: new THREE.Vector3(presa ? 0 : (this.sorte() - 0.5) * 0.6, 0, presa ? 0 : -0.25 - this.sorte() * 0.3),
        giro: this.sorte() * Math.PI * 2, tam: 0.6 + this.sorte() * 0.6,
      });
    }

    // os náufragos agarrados às tábuas (At 27,44): vão, devagar, para a praia
    const matTabua = new THREE.MeshLambertMaterial({ color: 0x7a5636 });
    for (let k = 0; k < 6; k++) {
      const fig = figurinoDoPovo(760 + k * 17, 'pobre');
      const corpo = deitado(montarHumano(fig), fig, 0.06);
      const tabua = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 2.4), matTabua);
      tabua.position.set(0, 0.02, -0.3);
      const raiz = new THREE.Group();
      raiz.add(tabua, corpo);
      this.grupo.add(raiz);
      const x = -22 + k * 8.5 + (this.sorte() - 0.5) * 3;
      this.naufragos.push({
        raiz, tabua, inicio: this.w(x, 4 - (k % 3) * 6), fim: this.w(x * 0.8, costa(x * 0.8) + 2.2), t: 0, fase: k * 1.3,
      });
    }

    // a gente do navio
    const npc = (def: DefNpc) => {
      const n = new Npc(def, this.navio, 0);
      this.grupo.add(n.raiz);
      this.npcs.push(n);
      return n;
    };
    this.paulo = npc(doNaufragio(PAULO, 'naufragio_paulo'));
    npc(doNaufragio(LUCAS, 'naufragio_lucas'));
    npc(doNaufragio(ARISTARCO, 'naufragio_aristarco'));
    this.julio = npc(doNaufragio(JULIO, 'naufragio_julio'));
    npc(doNaufragio(PILOTO, 'naufragio_piloto'));
    npc(doNaufragio(NAUCLERO, 'naufragio_nauclero'));
    this.soldados.push(npc(doNaufragio(soldado(1), 'naufragio_soldado')), npc(doNaufragio(soldado(2), 'naufragio_soldado')));
    this.presos.push(npc(doNaufragio(PRESOS[0], 'naufragio_preso')), npc(doNaufragio(PRESOS[1], 'naufragio_preso')));
    npc(doNaufragio(MARINHEIROS[0], 'naufragio_marinheiro'));
    npc({ ...doNaufragio(MARINHEIROS[1] ?? MARINHEIROS[0], 'naufragio_marinheiro'), id: 'naufragio_marinheiro_2' });

    this.chegada = this.local(0, 11.5);
    this.praia = this.w(0, costa(0) - 2);
    this.arenaEntrada = this.w(0, 6);
  }

  // ───────────── o chão ─────────────

  private bruto(x: number, z: number) {
    const c = costa(x);
    const d = c - z;
    let h: number;
    if (d >= 0) {
      const praia = NIVEL + 0.35 + Math.min(d, 12) * 0.1;
      const morros = suave(10, 48, d) * this.ruido.fbm(x * 0.02 + 5, z * 0.02 + 5, 4) * 17;
      const ponta = suave(48, 82, Math.abs(x)) * 7 * suave(-1, 4, d);
      h = praia + morros + ponta + (this.ruido.fbm(x * 0.14, z * 0.14, 2) - 0.5) * 1.1 * suave(6, 16, d);
    } else {
      const s = -d;
      const zb = banco(x);
      let prof = Math.min(0.95, 0.1 + s * 0.06);
      if (z > zb + 6) prof = Math.min(9, Math.max(prof, 0.95 + (z - zb - 6) * 0.35));
      h = NIVEL - prof;
      // a crista do banco de areia, larga no meio da enseada
      const k = suave(46, 30, Math.abs(x));
      const topo = NIVEL + 0.1 - Math.max(0, Math.abs(z - zb) - 6) * 0.3;
      h += Math.max(0, topo - h) * k;
      for (const [bx, bz, r] of BAIXIOS) h = Math.max(h, NIVEL + 0.1 - Math.max(0, Math.hypot(x - bx, z - bz) - r) * 0.45);
      const [px, pz, pr] = POCO;
      h = Math.min(h, NIVEL - 2.3 + Math.max(0, Math.hypot(x - px, z - pz) - pr) * 0.6);
      h += (this.ruido.fbm(x * 0.07, z * 0.07, 2) - 0.5) * 0.3;
    }
    // o rochedo da ponta leste
    const di = Math.hypot(x - ILHOTA.x, z - ILHOTA.z);
    if (di < ILHOTA.r + 6) {
      const ang = Math.atan2(z - ILHOTA.z, x - ILHOTA.x);
      const ri = ILHOTA.r * (0.7 + 0.6 * this.ruido.fbm(Math.cos(ang) * 1.3 + 9, Math.sin(ang) * 1.3, 3));
      const rocha = di < ri ? NIVEL + 2 + 5 * suave(0, ri * 0.6, ri - di) + this.ruido.fbm(x * 0.12, z * 0.12 + 3, 3) * 3 : -99;
      h = Math.max(h, NIVEL - 1.5 - suave(ri, ri + 6, di) * 4, rocha);
    }
    return h;
  }

  private h(i: number, j: number) {
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return FUNDO_ABERTO;
    return this.alturas[i * TAM + j];
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META, z = j - META;
    const n = this.ruidoCor.fbm(x * 0.07, z * 0.07, 3);
    if (h < NIVEL) {
      const fundura = NIVEL - h;
      if (fundura <= 1.2) return variar(n > 0.55 ? 0xd2c08a : 0xdccb94, i, h, j, 0.04);
      if (fundura <= 3) return variar(n > 0.55 ? 0x9aa07a : 0xc4b282, i, h, j, 0.05);
      return variar(n > 0.5 ? 0x5a7a50 : 0x7d8e72, i, h, j, 0.05);
    }
    if (Math.hypot(x - ILHOTA.x, z - ILHOTA.z) < ILHOTA.r + 2 && h > NIVEL + 1) return variar(n > 0.5 ? 0xc8b48a : 0xb8a47c, i, h, j, 0.05);
    const inclinacao = Math.max(Math.abs(this.h(i + 1, j) - h), Math.abs(this.h(i - 1, j) - h), Math.abs(this.h(i, j + 1) - h), Math.abs(this.h(i, j - 1) - h));
    // o calcário dourado de Malta nas encostas e nos rochedos
    if (inclinacao >= 3) return variar(n > 0.5 ? 0xd8c290 : 0xcab27e, i, h, j, 0.05);
    if (h <= NIVEL + 1 && costa(x) - z < 14) return variar(n > 0.5 ? 0xe8d8a6 : 0xdecb94, i, h, j, 0.04); // a praia
    // a garriga: tomilho, alfarrobeira baixa e a pedra que aparece entre eles
    const mato = n < 0.32 ? 0x8a9450 : n < 0.5 ? 0xa4a062 : n < 0.66 ? 0x7a8648 : 0xcdb886;
    return variar(mato, i, h, j, 0.05);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    if (y < NIVEL + 1) return variar(0xc9b888, i, y, j, 0.05);
    return variar(y % 3 === 0 ? 0xcdb684 : 0xd8c290, i, y, j, 0.04); // camadas de globigerina
  }

  // ───────────── ajudantes ─────────────

  /** Ponto do mundo no chão, a partir do local. */
  private w(lx: number, lz: number) {
    const p = new THREE.Vector3(lx + ORIGEM_NAUFRAGIO.x, 0, lz + ORIGEM_NAUFRAGIO.z);
    p.y = this.altura(p.x, p.z);
    return p;
  }

  /** O z local do navio (proa +) a partir do z do mundo, e o x local a partir do x. O navio está virado: proa em -z. */
  private paraNavio(x: number, z: number) {
    return { lx: this.navio.x - x, lz: (this.navio.z - z) / Math.cos(INCLINACAO) };
  }

  /** Altura (mundo) de um ponto do navio, dado em coordenadas do navio a `y` acima da linha d'água dele. */
  private yNavio(lz: number, y: number) {
    return this.navio.y + y * Math.cos(INCLINACAO) + lz * Math.sin(INCLINACAO);
  }

  /** Um ponto do convés, em coordenadas do navio (proa em +lz). */
  local(lx: number, lz: number) {
    return new THREE.Vector3(this.navio.x - lx, this.yNavio(lz, convesEm(lz)), this.navio.z - lz * Math.cos(INCLINACAO));
  }

  /** O ponto do convés perto dos presos (para a interação dos soldados). */
  get proa() {
    return this.local(0, 11);
  }

  /** O peregrino está dentro da arena e fora do navio, na água ou nos baixios. */
  naArena(p: THREE.Vector3) {
    return p.x > this.lim.x0 && p.x < this.lim.x1 && p.z > this.lim.z0 && p.z < this.lim.z1 && this.alturaNavio(p.x, p.z) === null;
  }

  // ───────────── a história ─────────────

  arrumar(tem: (flag: string) => boolean) {
    this.etapa = etapaDoNaufragio(tem);
    this.vencido = this.etapa === 'praia';
    this.escuridao = { presos: 0.55, ira: 0.62, praia: 0.12 }[this.etapa];
    this.oceano.intensidade = this.vencido ? 0.14 : 0.55;
    this.chuva.malha.visible = !this.vencido;
    const [paulo, lucas, aristarco, julio, piloto, nauclero, s1, s2, p1, p2, m1, m2] = this.npcs;
    for (const n of this.npcs) n.raiz.visible = true;
    const praia = (n: Npc, lx: number, dz: number, rumo = Math.PI) => n.colocar(this.w(lx, costa(lx) - dz), rumo);
    if (this.etapa === 'presos') {
      // todos na proa erguida; os soldados de espada na mão diante dos presos (At 27,42)
      const por = (n: Npc, lx: number, lz: number, rumo: number) => n.colocar(this.local(lx, lz), rumo);
      por(p1, -0.9, 12.6, Math.PI);
      por(p2, 0.5, 13.1, Math.PI);
      por(s1, -1.1, 10.6, 0);
      por(s2, 0.8, 10.4, 0);
      por(julio, 2.0, 9.4, -Math.PI / 2);
      por(paulo, -2.2, 9.2, Math.PI / 2);
      por(lucas, -2.7, 7.4, Math.PI / 3);
      por(aristarco, -1.7, 6.6, Math.PI / 4);
      por(piloto, 2.4, 5.2, Math.PI * 0.8);
      por(nauclero, 1.6, 3.6, Math.PI);
      por(m1, 2.9, 6.8, -Math.PI / 2);
      por(m2, -2.9, 5.6, Math.PI / 2);
      for (const n of this.naufragos) n.raiz.visible = false;
      return;
    }
    if (this.etapa === 'ira') {
      // os que sabiam nadar já estão na praia (At 27,43); Paulo reza com Lucas e Aristarco na beira d'água
      praia(julio, -6, 1, Math.PI);
      praia(s1, -8, 2.5, Math.PI);
      praia(s2, -4, 2.8, Math.PI);
      praia(p1, 6, 2.6, Math.PI);
      praia(p2, 8, 3, Math.PI);
      praia(piloto, 14, 2, Math.PI);
      praia(nauclero, 16, 3.5, Math.PI * 0.9);
      praia(m1, -14, 1.5, Math.PI);
      praia(m2, -16, 3, Math.PI);
      praia(paulo, 0, -0.5, Math.PI);
      praia(lucas, -2, 0.8, Math.PI);
      praia(aristarco, 2, 0.8, Math.PI);
      this.naufragos.forEach((n) => {
        n.t = 0;
        n.raiz.visible = true;
      });
      return;
    }
    // vencida a Ira: todos na praia, em volta de Paulo (At 27,44)
    praia(paulo, 0, 4, Math.PI);
    const roda = [lucas, aristarco, julio, s1, s2, p1, p2, piloto, nauclero, m1, m2];
    roda.forEach((n, k) => {
      const a = -Math.PI * 0.8 + (k / (roda.length - 1)) * Math.PI * 1.6;
      const lx = Math.sin(a) * 4.5, dz = 4 + Math.cos(a) * 3.2;
      praia(n, lx, dz, Math.atan2(-lx, -(Math.cos(a) * 3.2)) + Math.PI);
    });
    this.naufragos.forEach((n, k) => {
      n.t = 1;
      n.raiz.visible = true;
      n.raiz.position.copy(n.fim);
      n.raiz.position.x += (k - 2.5) * 1.6;
      n.raiz.position.y = this.altura(n.raiz.position.x, n.raiz.position.z);
    });
  }

  /** A luta: a Ira dorme no fundo da enseada até o peregrino entrar na água. */
  reiniciar(vencidas: Set<string>, tem: (flag: string) => boolean) {
    this.descartarLuta();
    this.vencido = vencidas.has(ID_IRA);
    if (!this.vencido) this.criarChefe();
    this.arrumar(tem);
  }

  private criarChefe() {
    this.chefe = new Ira(ID_IRA, this.w(0, -13).setY(NIVEL - 6), this.lim);
    this.chefe.raiz.rotation.y = 0;
    this.chefe.raiz.position.copy(this.chefe.pos);
    this.sombras.push(this.chefe);
    this.grupo.add(this.chefe.raiz, this.chefe.efeitos);
  }

  private descartarLuta() {
    this.chefe?.descartar();
    if (this.chefe) this.sombras.splice(this.sombras.indexOf(this.chefe), 1);
    this.chefe = null;
    this.lutando = false;
  }

  /** Morreu na luta: a Ira volta ao fundo, e os náufragos à água. */
  reiniciarLuta() {
    if (!this.lutando) return;
    this.descartarLuta();
    this.criarChefe();
    for (const n of this.naufragos) n.t = 0;
  }

  /** A Ira se desfez: o mar se acalma, a chuva para. */
  chefeVencido() {
    this.lutando = false;
    this.vencido = true;
  }

  // ───────────── o quadro ─────────────

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.oceano.atualizar(dt, jogador);
    this.chuva.atualizar(dt, jogador);
    for (const n of this.npcs) n.atualizar(dt, jogador);
    // o mar se acalma depois da Ira
    const calma = this.vencido ? 0.14 : 0.55;
    this.oceano.intensidade += (calma - this.oceano.intensidade) * Math.min(1, dt * 0.4);
    if (this.vencido) {
      this.escuridao += (0.12 - this.escuridao) * Math.min(1, dt * 0.3);
      this.chuva.malha.visible = this.escuridao > 0.3;
    }

    // a luta começa quando o peregrino entra na água da enseada
    const c = this.chefe;
    if (c && c.ativa && !this.lutando && this.etapa === 'ira' && this.naArena(jogador)) {
      this.lutando = true;
      c.acordar();
      this.eventos.lutaComecou();
    }

    // os náufragos nas tábuas: boiam, batem as pernas e vão chegando à praia durante a luta
    for (const n of this.naufragos) {
      if (!n.raiz.visible || n.t >= 1) continue;
      if (this.lutando && !this.pausa) n.t = Math.min(0.92, n.t + dt / 150);
      const p = n.raiz.position.lerpVectors(n.inicio, n.fim, n.t);
      p.x += Math.sin(this.t * 0.4 + n.fase) * 0.6;
      p.y = Math.max(this.altura(p.x, p.z), this.oceano.altura(p.x, p.z) - 0.05);
      n.raiz.rotation.set(Math.sin(this.t * 1.3 + n.fase) * 0.08, Math.PI + Math.sin(this.t * 0.3 + n.fase) * 0.3, Math.sin(this.t * 1.1 + n.fase) * 0.1);
    }

    // as tábuas: as soltas boiam paradas; as da popa saem com a corrente e renascem lá
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), esc = new THREE.Vector3();
    this.destrocos.forEach((d, i) => {
      d.p.addScaledVector(d.v, dt);
      if (d.v.lengthSq() > 0 && d.p.z < this.navio.z - 6) {
        d.p.set(this.navio.x + (this.sorte() - 0.5) * 6, 0, this.navio.z + 12 + this.sorte() * 4);
      }
      const y = Math.max(this.oceano.altura(d.p.x, d.p.z), this.altura(d.p.x, d.p.z) + 0.06);
      e.set(Math.sin(this.t * 1.2 + i) * 0.12, d.giro + Math.sin(this.t * 0.2 + i) * 0.2, Math.sin(this.t + i * 0.7) * 0.1);
      mat.compose(new THREE.Vector3(d.p.x, y, d.p.z), q.setFromEuler(e), esc.set(1, 1, d.tam));
      this.tabuas.setMatrixAt(i, mat);
    });
    this.tabuas.instanceMatrix.needsUpdate = true;

    // os relâmpagos, enquanto dura a tempestade
    if (!this.vencido && !this.pausa) {
      this.proximoRaio -= dt;
      if (this.proximoRaio <= 0) {
        this.proximoRaio = 6 + this.sorte() * 10;
        this.relampago = 1;
        this.trovaoEm = 0.4 + this.sorte();
      }
    }
    if (this.trovaoEm > 0) {
      this.trovaoEm -= dt;
      if (this.trovaoEm <= 0) this.aoTrovejar?.();
    }
    this.relampago = Math.max(0, this.relampago - dt * (this.relampago > 0.5 ? 6 : 2.2));
    this.luzRaio.intensity = this.relampago * 2.2;
  }

  // ───────────── física ─────────────

  /** O navio inclinado: convés, borda (com a brecha e a popa quebrada), cabine e escotilha. `null` fora dele. */
  private alturaNavio(x: number, z: number): number | null {
    const { lx, lz } = this.paraNavio(x, z);
    if (Math.abs(lz) >= MEIO_COMPRIMENTO - 0.25) return null;
    const meia = meiaLarguraConves(lz);
    if (Math.abs(lx) > meia + 0.3) return null;
    const conves = this.yNavio(lz, convesEm(lz));
    if (Math.abs(lx) > meia) {
      if (lz < POPA_QUEBRADA || (lz > BRECHA.z0 && lz < BRECHA.z1)) return conves;
      return this.yNavio(lz, bordaEm(lz) + BORDA_PAREDE);
    }
    if (lx > CABINE.x0 && lx < CABINE.x1 && lz > CABINE.z0 && lz < CABINE.z1) return conves + CABINE.altura + 0.7;
    if (lz > 3.5 && lz < 6.5 && Math.abs(lx) < 1.5) return conves + 0.25;
    return conves;
  }

  altura(x: number, z: number) {
    const n = this.alturaNavio(x, z);
    if (n !== null) return n;
    const i = Math.floor(x - ORIGEM_NAUFRAGIO.x + META), j = Math.floor(z - ORIGEM_NAUFRAGIO.z + META);
    return this.h(i, j);
  }

  colidir(pos: THREE.Vector3, raio: number) {
    const mastro = this.local(MASTRO.x, MASTRO.z);
    const extras: { x: number; z: number; r: number }[] = [{ x: mastro.x, z: mastro.z, r: 0.35 }];
    for (const n of this.npcs) if (n.raiz.visible) extras.push({ x: n.pos.x, z: n.pos.z, r: 0.35 });
    for (const c of extras) {
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

  /** No mundo aberto, o mar (e a chuva) da área só aparece com o peregrino dentro dela: de fora, vê-se o mar do mundo. */
  private readonly aoRedor = new THREE.Group();
  presente(sim: boolean) {
    this.aoRedor.visible = sim;
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_NAUFRAGIO.x - META, z0: ORIGEM_NAUFRAGIO.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        if (this.alturaNavio(x, z) !== null) return 0x7a5636;
        const i = Math.floor(x - ORIGEM_NAUFRAGIO.x + META), j = Math.floor(z - ORIGEM_NAUFRAGIO.z + META);
        const h = this.h(i, j);
        if (h < NIVEL) return NIVEL - h <= 1.5 ? 0x6fc4cc : NIVEL - h <= 4 ? 0x3c9cb0 : 0x1f6f8a;
        return this.corTopo(i, j, h);
      },
    };
  }
}
