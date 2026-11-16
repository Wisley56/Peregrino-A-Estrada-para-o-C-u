import * as THREE from 'three';
import { aleatorio, Ruido } from '../core/Ruido';
import { ARISTARCO, LUCAS } from '../entidades/Companheiros';
import { BARQUEIRO, CRIADO, ENFERMOS_MALTA, MENINO, MORADORES, PAI_DE_PUBLIO, PAULO_MALTA, PUBLIO, type DefEnfermoMalta } from '../entidades/GenteDeMalta';
import { MARINHEIROS, NAUCLERO, PILOTO, PRESOS } from '../entidades/GenteDeCreta';
import { Npc, type DefNpc } from '../entidades/Npc';
import { JULIO, soldado } from '../entidades/Romanos';
import { Sombra } from '../entidades/Sombra';
import type { Povoamento } from '../fauna/Fauna';
import type { FonteMapa } from '../ui/Minimapa';
import { deitado } from '../entidades/Enfermos';
import { figurinoDoPovo, montarHumano, type Figurino } from '../voxel/Humano';
import { variar } from '../voxel/Modelo';
import type { Area } from './Area';
import { Juntador } from './BahiaModelos';
import { Chuva } from './Chuva';
import { PISO, alfarrobeira, barcoDePesca, casaCretense, cipreste, fonteDaPraca, muralha, muroSeco, oliveira, portaDaCidade, posteDeAmarracao, rochedo } from './CretaModelos';
import {
  VILLA, chamaDeFogueira, esteira, feixeDeGravetos, fogueiraDePraia, insigniaDosDioscuros, leito, poco, prensaDeAzeite, vibora, villaDePublio,
} from './MaltaModelos';
import { BORDA_PAREDE, CABINE, MASTRO, MEIO_COMPRIMENTO, anfora, bordaEm, convesEm, meiaLarguraConves, navioAlexandrino, sacoDeTrigo } from './NavioModelos';
import { Oceano } from './Oceano';
import { blocosDeColunas } from './Terreno';
import { NIVEL_MAR, ORIGENS } from './aberto/Geografia';

/** Canto de Malta no mundo (longe das outras áreas). */
export const ORIGEM_MALTA = ORIGENS.malta;
const TAM = 320;
const META = TAM / 2;
const NIVEL = NIVEL_MAR;
const FUNDO_ABERTO = NIVEL - 9;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A linha da costa (z local) em cada x: a terra fica ao sul (z menor), o mar ao norte. No meio, a baía onde o navio
 * encalhou (a "baía de São Paulo", na tradição de Malta); a leste, a enseada funda do porto.
 */
function costa(x: number) {
  return 58 + 5 * Math.sin(x * 0.035 + 0.7) + 2.5 * Math.sin(x * 0.1) - 20 * Math.exp(-(x * x) / (2 * 42 * 42)) - 16 * Math.exp(-((x - 112) ** 2) / (2 * 12 * 12));
}

// ───────────── o desenho do lugar (m, coordenadas locais) ─────────────

/** A fogueira da praia, acesa pelos moradores por causa da chuva e do frio (At 28,2). */
const FOGO = { x: -4, d: 8 };
/** Os montes de gravetos secos espalhados pela garriga atrás da praia (x, z). */
const GRAVETOS: [number, number][] = [[-30, 18], [-48, 10], [22, 20], [38, 8], [-14, -2], [8, -10], [55, 24], [-62, 26]];
/** Quantos feixes o fogo pede antes de Paulo lançar o dele (At 28,3). */
export const FEIXES = 5;
/** A casa de campo de Públio (centro, local). A porta fica ao norte, para o lado da praia. */
const CASA_PUBLIO = { x: -40, z: -62 };
/** As estradas de terra: da praia à casa de Públio, ao povoado, ao porto e a Melite. */
const ESTRADAS: [number, number][][] = [
  [[-2, 24], [-8, 6], [-20, -14], [-34, -34], [-40, -49]],
  [[-20, -14], [0, -26], [22, -38], [30, -50]],
  [[-2, 24], [20, 26], [50, 30], [80, 26], [98, 26]],
  [[-20, -14], [-60, -40], [-90, -80], [-100, -115]],
  [[0, -26], [-4, -60], [-6, -86]],
];
/** O porto da enseada do leste: o cais e a bacia funda, onde o navio de Alexandria passou o inverno (At 28,11). */
const CAIS = { x0: 102, x1: 106, z0: 26, z1: 60 };
const BACIA = { x0: 106, x1: 122, z0: 34, z1: 76 };
const NAVIO = { x: 113.5, z: 50 };
const PRANCHA_Z = 1;
/** O povoado (x, z, largura, fundo, pisos, caiada, escada, parreira). */
const CASAS: [number, number, number, number, 1 | 2, boolean, boolean, boolean][] = [
  [8, -40, 6, 5, 1, true, true, true],
  [18, -47, 5, 4.5, 1, false, true, false],
  [35, -44, 6, 5, 1, true, false, true],
  [43, -59, 5, 4, 1, false, true, false],
  [13, -63, 7, 5, 2, true, true, false],
  [29, -71, 5, 4, 1, false, false, true],
  [-6, -94, 6, 5, 1, false, true, true], // a casa do sul, onde o menino está doente
  [64, 40, 5, 4, 1, true, false, false], // a casa do barqueiro, junto à praia do leste
];
const POCO_ALDEIA = { x: 26, z: -55 };
/** Melite, a cidade da ilha, no planalto do sudoeste, murada, com a porta para o leste. */
const MELITE = { x0: -146, x1: -104, z0: -134, z1: -96, porta: -115 };
const CASAS_MELITE: [number, number, number, number, 1 | 2, number][] = [
  [-138, -128, 6, 5, 2, 0], [-126, -129, 5, 4.5, 1, 0], [-114, -128, 6, 5, 1, 0], [-138, -103, 6, 5, 1, Math.PI], [-124, -102, 5, 5, 2, Math.PI],
];
const PRACA_MELITE = { x: -124, z: -115 };
/** O navio encalhado, lá fora no banco de areia da baía (fora do mapa, no mar aberto). */
const DESTROCO = { x: 14, z: 182, rumo: Math.PI + 0.25 };
/** A ponta oeste da praia, por onde se volta à enseada do naufrágio. */
const VOLTA_X = -96;
/** A entrada do pátio de Públio, logo depois da porta (por onde passa quem chega pela estrada). */
const PATIO: [number, number] = [CASA_PUBLIO.x, CASA_PUBLIO.z + VILLA.patio.z1 - 1];

/**
 * A ordem de Malta (At 28,1-11): o fogo, a víbora, o que dizem dela, Públio, o pai dele, os enfermos, as honras e a
 * partida, três meses depois.
 */
export type EtapaMalta = 'fogo' | 'vibora' | 'boatos' | 'publio' | 'pai' | 'enfermos' | 'honras' | 'partida';
export function etapaDeMalta(tem: (flag: string) => boolean): EtapaMalta {
  if (!tem('malta_fogo')) return 'fogo';
  if (!tem('malta_vibora')) return 'vibora';
  if (!tem('malta_boatos')) return 'boatos';
  if (!tem('malta_publio')) return 'publio';
  if (!tem('malta_pai_curado')) return 'pai';
  if (!tem('malta_curas')) return 'enfermos';
  if (!tem('malta_tres_meses')) return 'honras';
  return 'partida';
}

/** Os moradores que tiram uma conclusão da víbora (o Conselho os corrige um a um). */
export const BOATOS = MORADORES.map((m) => m.id);
export const ID_ENFERMOS = ENFERMOS_MALTA.map((e) => e.id);

interface Plataforma { x: number; z: number; mx: number; mz: number; h: number }
interface Piso { x0: number; x1: number; z0: number; z1: number; y: (x: number, z: number) => number }
interface Caixa { x0: number; x1: number; z0: number; z1: number; topo: number }

const enum T { Natural, Terra, Calcada, Cais }

const deMalta = (d: DefNpc, no = d.no, sufixo = ''): DefNpc => ({ ...d, id: `malta_${d.id}${sufixo}`, no });

/** A víbora na cena do fogo: escondida, pulando para a mão, presa, sacudida ou voando de volta ao fogo. */
type FaseVibora = 'oculta' | 'pulando' | 'presa' | 'sacudida' | 'voando';

/**
 * Malta (At 28,1-11): a quarta e última parte do Mar da Tempestade, onde a cor volta e se recebe o dom do Conselho.
 *
 * - O mapa (320 × 320 m) é de blocos, como Creta: a baía com a praia larga onde os náufragos se juntam em volta do
 *   fogo, a garriga atrás dela (com os gravetos), a estrada que sobe para a casa de campo de Públio, o povoado com o
 *   poço, a enseada do porto a leste (com o navio dos Dióscuros) e Melite, murada, no planalto do sudoeste. Lá fora,
 *   no banco de areia, ainda se vê o navio encalhado.
 * - A história anda pelas flags (`etapaDeMalta`), e `arrumar` põe cada um no lugar. Quem precisa ir de um lugar a
 *   outro anda pelas estradas (`levar`).
 * - A cena da víbora é tocada pelo roteiro (`cenaDaVibora`): Paulo lança o feixe, a víbora salta do calor e se prende
 *   à mão dele, e ele a sacode no fogo.
 */
export class Malta implements Area {
  readonly id = 'malta' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly nivelMinimo = NIVEL;
  readonly oceano = new Oceano(NIVEL, 0x1d7f98);
  readonly npcs: Npc[] = [];
  readonly paulo: Npc;
  readonly lucas: Npc;
  readonly aristarco: Npc;
  readonly julio: Npc;
  readonly publio: Npc;
  readonly pai: Npc;
  readonly criado: Npc;
  readonly barqueiro: Npc;
  readonly moradores: Npc[] = [];
  /** Os enfermos: como estão doentes e como ficam curados (um dos dois aparece). */
  readonly enfermos = new Map<DefEnfermoMalta['id'], { doente: Npc; curado: Npc; casa: THREE.Vector3; rumo: number; vaga: THREE.Vector3; chegou: boolean }>();
  readonly menino: Npc;
  readonly meninoDeitado: THREE.Group;
  /** Onde se chega (na praia, junto ao fogo), o fogo, a casa de Públio e os outros pontos das interações. */
  readonly chegada: THREE.Vector3;
  readonly fogo: THREE.Vector3;
  readonly portaPublio: THREE.Vector3;
  readonly leito: THREE.Vector3;
  readonly prancha: THREE.Vector3;
  readonly cais: THREE.Vector3;
  readonly povoado: THREE.Vector3;
  readonly portaMelite: THREE.Vector3;
  readonly voltaEnseada: THREE.Vector3;
  /** Os montes de gravetos (o ponto e a malha, que some quando se apanha). */
  readonly gravetos: { pos: THREE.Vector3; malha: THREE.Object3D }[] = [];
  /** O peregrino leva um feixe (o Jogo diz). */
  levandoFeixe = false;
  /** Quantos feixes já foram lançados no fogo (0 … FEIXES): a chama cresce com eles. */
  feixes = 0;
  /** Paulo impõe as mãos sobre o pai de Públio (a oração junto ao leito). */
  pauloImpondo = false;
  /** O tempo: 0 chuva fria (o fogo e a víbora), 1 nublado (os três dias com Públio), 2 claro (a cor voltou). */
  clima: 0 | 1 | 2 = 0;
  /** Durante as conversas e as transições a gente não anda. */
  pausa = false;
  /** Chamado quando alguém que ia pela estrada chega aonde ia. */
  aoChegar: ((n: Npc) => void) | null = null;

  private readonly alturas = new Int16Array(TAM * TAM);
  private readonly tipo = new Uint8Array(TAM * TAM);
  private readonly ruido = new Ruido(5113);
  private readonly ruidoCor = new Ruido(5114);
  private readonly plataformas: Plataforma[] = [];
  private readonly pisos: Piso[] = [];
  private readonly caixas: Caixa[] = [];
  private readonly circulos: { x: number; z: number; r: number }[] = [];
  private readonly juntador = new Juntador(40);
  private readonly navio = new THREE.Vector3();
  private readonly chuva = new Chuva(NIVEL, 900);
  private readonly chama: THREE.Group;
  private readonly luzFogo = new THREE.PointLight(0xffa050, 0, 16, 1.6);
  private readonly feixeDePaulo: THREE.Object3D;
  private readonly cobra: THREE.Object3D;
  private readonly provisoes = new THREE.Group();
  private faseVibora: FaseVibora = 'oculta';
  private tVibora = 0;
  private labareda = 0;
  private readonly caminhos = new Map<Npc, { pts: THREE.Vector3[]; espera: number }>();
  private t = 0;

  constructor() {
    this.prepararPlataformas();
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const [h, t] = this.gerar(i - META + 0.5, j - META + 0.5);
        this.alturas[i * TAM + j] = Math.round(h);
        this.tipo[i * TAM + j] = t;
      }
    const terreno = blocosDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 12);
    terreno.position.copy(ORIGEM_MALTA);
    this.oceano.intensidade = 0.22;
    this.grupo.add(terreno, this.oceano.malha, this.chuva.malha);

    this.navio.set(NAVIO.x + ORIGEM_MALTA.x, NIVEL, NAVIO.z + ORIGEM_MALTA.z);
    this.montarPraia();
    this.montarCasaDePublio();
    this.montarPovoado();
    this.montarPorto();
    this.montarMelite();
    this.montarCampo();
    for (const m of this.juntador.malhas()) this.grupo.add(m);

    // a fogueira: as pedras ficam no juntador; a chama e a luz, à parte (crescem com os feixes)
    this.fogo = this.w(FOGO.x, costa(FOGO.x) - FOGO.d);
    this.chama = chamaDeFogueira();
    this.chama.position.copy(this.fogo);
    this.luzFogo.position.copy(this.fogo).add(new THREE.Vector3(0, 1.2, 0));
    this.grupo.add(this.chama, this.luzFogo);

    // a gente
    const npc = (def: DefNpc) => {
      const n = new Npc(def, this.fogo, 0);
      this.grupo.add(n.raiz);
      this.npcs.push(n);
      return n;
    };
    this.paulo = npc(deMalta(PAULO_MALTA));
    this.lucas = npc(deMalta(LUCAS, 'malta_lucas'));
    this.aristarco = npc(deMalta(ARISTARCO, 'malta_aristarco'));
    this.julio = npc(deMalta(JULIO, 'malta_julio'));
    npc(deMalta(soldado(1), 'malta_soldado'));
    npc(deMalta(soldado(2), 'malta_soldado'));
    npc(deMalta(PRESOS[0], 'malta_preso'));
    npc(deMalta(PRESOS[1], 'malta_preso'));
    npc(deMalta(PILOTO, 'malta_piloto'));
    npc(deMalta(NAUCLERO, 'malta_nauclero'));
    npc(deMalta(MARINHEIROS[0], 'malta_marinheiro'));
    npc(deMalta(MARINHEIROS[1], 'malta_marinheiro'));
    for (let k = 0; k < 4; k++) {
      const fig = figurinoDoPovo(1700 + k * 13, 'pobre');
      npc({ id: `malta_naufrago_${k}`, falante: 'marinheiro', no: 'malta_naufrago', rotulo: 'F: falar com o náufrago', visual: { ...fig, genero: 'm', acessorio: undefined } });
    }
    for (const m of MORADORES) this.moradores.push(npc(deMalta(m)));
    this.publio = npc(deMalta(PUBLIO));
    this.pai = npc(deMalta(PAI_DE_PUBLIO));
    this.criado = npc(deMalta(CRIADO));
    this.barqueiro = npc(deMalta(BARQUEIRO));
    this.menino = npc(deMalta(MENINO));
    // o menino doente, deitado na esteira à porta de casa (um corpo à parte, sem conversa)
    this.meninoDeitado = new THREE.Group();
    {
      const fig = MENINO.visual as Figurino;
      this.meninoDeitado.add(esteira(), deitado(montarHumano(fig), fig, 0.1));
      this.grupo.add(this.meninoDeitado);
    }

    // os enfermos: onde estão, a vaga deles no pátio de Públio, e o par doente/curado
    const vagas = [[-6, 1.2], [-2.5, 2.2], [2.5, 2.2], [6, 1.2]];
    const casas: Record<DefEnfermoMalta['id'], [number, number, number]> = {
      febril: [POCO_ALDEIA.x - 1.6, POCO_ALDEIA.z + 1.2, Math.PI / 2],
      coxo: [CAIS.x0 - 2, costa(CAIS.x0) - 6, Math.PI / 2],
      cego: [MELITE.x1 + 3, MELITE.porta + 3.5, Math.PI / 2],
      mae: [CASAS[6][0] + 2.2, CASAS[6][1] + 4.8, 0],
    };
    ENFERMOS_MALTA.forEach((e, k) => {
      const doente = npc(deMalta(e.doente));
      const curado = npc(deMalta(e.curado, e.curado.no, '_curado'));
      const [x, z, rumo] = casas[e.id];
      this.enfermos.set(e.id, { doente, curado, casa: this.w(x, z), rumo, vaga: this.naCasa(vagas[k][0], vagas[k][1]), chegou: false });
    });

    this.chegada = this.w(FOGO.x + 2, costa(FOGO.x) - FOGO.d + 4);
    this.portaPublio = this.naCasa(0, VILLA.fundo / 2 + 2);
    this.leito = this.naCasa(-3, -3.75);
    this.prancha = this.w(CAIS.x1 - 0.8, NAVIO.z + PRANCHA_Z);
    this.cais = this.w(CAIS.x0 + 2, NAVIO.z - 6);
    this.povoado = this.w(POCO_ALDEIA.x, POCO_ALDEIA.z + 3);
    this.portaMelite = this.w(MELITE.x1 + 4, MELITE.porta);
    this.voltaEnseada = this.w(VOLTA_X, costa(VOLTA_X) - 3);

    // o feixe que Paulo traz na mão e a víbora (escondida até a cena)
    this.feixeDePaulo = feixeDeGravetos(99);
    this.feixeDePaulo.rotation.set(0, Math.PI / 2, 0.3);
    this.feixeDePaulo.position.set(0, -0.62, 0.42);
    this.paulo.humano.bracoD?.add(this.feixeDePaulo);
    this.cobra = vibora();
    this.cobra.visible = false;
    this.grupo.add(this.cobra);
    this.grupo.add(this.provisoes);
  }

  // ───────────── o chão ─────────────

  private prepararPlataformas() {
    const plano = (x: number, z: number, mx: number, mz: number, minimo = NIVEL + 1) =>
      this.plataformas.push({ x, z, mx, mz, h: Math.max(minimo, Math.round(this.bruto(x, z))) });
    plano((MELITE.x0 + MELITE.x1) / 2, (MELITE.z0 + MELITE.z1) / 2, (MELITE.x1 - MELITE.x0) / 2 + 1, (MELITE.z1 - MELITE.z0) / 2 + 1);
    plano(CASA_PUBLIO.x, CASA_PUBLIO.z, VILLA.largura / 2 + 2, VILLA.fundo / 2 + 3);
    for (const [x, z, w, f] of CASAS) plano(x, z, w / 2 + 1.5, f / 2 + 2.5);
    plano(POCO_ALDEIA.x, POCO_ALDEIA.z, 3, 3);
    plano(FOGO.x, costa(FOGO.x) - FOGO.d, 4, 4);
    this.praiaDoFogo = this.plataformas[this.plataformas.length - 1];
  }

  /** A plataforma da fogueira (fica de areia, não de terra). */
  private praiaDoFogo: Plataforma | null = null;

  private bruto(x: number, z: number) {
    const d = costa(x) - z;
    let h: number;
    if (d >= 0) {
      const praia = NIVEL + 0.4 + Math.min(d, 14) * 0.12;
      const colinas = suave(14, 90, d) * this.ruido.fbm(x * 0.013 + 3, z * 0.013 + 3, 4) * 16;
      const planalto = suave(90, 190, d) * 14;
      // a ponta de rocha entre a baía e o porto
      const ponta = suave(18, 4, Math.abs(x - 72)) * 4 * suave(-1, 6, d);
      h = praia + colinas + planalto + ponta + (this.ruido.fbm(x * 0.15, z * 0.15, 2) - 0.5) * 1.2 * suave(10, 22, d);
    } else {
      const fundura = Math.min(9, 0.8 + -d * 0.16);
      h = NIVEL - fundura + (this.ruido.fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.2;
    }
    return h;
  }

  private gerar(x: number, z: number): [number, T] {
    let h = this.bruto(x, z);
    let t = T.Natural;
    for (const e of ESTRADAS) if (distanciaAoCaminho(x, z, e) < 1.5 && costa(x) - z > 12) t = T.Terra;
    for (const p of this.plataformas) {
      const fora = Math.max(Math.abs(x - p.x) - p.mx, Math.abs(z - p.z) - p.mz);
      const k = 1 - suave(0, 4, fora);
      if (k > 0) h = h + (p.h - h) * k;
      if (fora < 0.5 && p !== this.plataformas[0] && p !== this.praiaDoFogo) t = T.Terra;
    }
    // o pátio da casa de Públio e a praça de Melite, de lajes
    const P = VILLA.patio;
    if (x > CASA_PUBLIO.x + P.x0 && x < CASA_PUBLIO.x + P.x1 && z > CASA_PUBLIO.z + P.z0 && z < CASA_PUBLIO.z + P.z1) t = T.Calcada;
    if (x > MELITE.x0 && x < MELITE.x1 && z > MELITE.z0 && z < MELITE.z1) t = Math.hypot(x - PRACA_MELITE.x, z - PRACA_MELITE.z) < 8 ? T.Calcada : T.Terra;
    if (x > BACIA.x0 && x < BACIA.x1 && z > BACIA.z0 && z < BACIA.z1) h = Math.min(h, NIVEL - 3.2);
    if (x > CAIS.x0 && x < CAIS.x1 && z > CAIS.z0 && z < CAIS.z1) {
      h = Math.max(h, NIVEL + 1);
      t = T.Cais;
    }
    return [h, t];
  }

  private h(i: number, j: number) {
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return Math.round(FUNDO_ABERTO);
    return this.alturas[i * TAM + j];
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META, z = j - META;
    const n = this.ruidoCor.fbm(x * 0.07, z * 0.07, 3);
    const t = this.tipo[i * TAM + j] as T;
    if (t === T.Cais) return variar((i + Math.floor(j / 2)) % 3 === 0 ? 0xa89a80 : 0xc4b694, i, h, j, 0.05);
    if (t === T.Calcada) return variar((i + j) % 2 ? 0xd8c8a0 : 0xc8b890, i, h, j, 0.04);
    if (h < NIVEL) {
      const fundura = NIVEL - h;
      if (fundura <= 1) return variar(0xdccb94, i, h, j, 0.04);
      if (fundura <= 3) return variar(n > 0.55 ? 0x9aa07a : 0xc4b282, i, h, j, 0.05);
      return variar(n > 0.5 ? 0x5a7a50 : 0x7d8e72, i, h, j, 0.05);
    }
    if (t === T.Terra) return variar(n > 0.5 ? 0xc0a070 : 0xb09064, i, h, j, 0.05);
    const inclinacao = Math.max(Math.abs(this.h(i + 1, j) - h), Math.abs(this.h(i - 1, j) - h), Math.abs(this.h(i, j + 1) - h), Math.abs(this.h(i, j - 1) - h));
    if (inclinacao >= 3) return variar(n > 0.5 ? 0xd8c290 : 0xcab27e, i, h, j, 0.05); // o calcário dourado de Malta
    if (h <= NIVEL + 1.5 && costa(x) - z < 15) return variar(n > 0.5 ? 0xe8d8a6 : 0xdecb94, i, h, j, 0.04); // a praia
    // a garriga: tomilho, lentisco, a terra vermelha e a pedra que aparece entre eles
    const mato = n < 0.3 ? 0x8a9450 : n < 0.48 ? 0xa4a062 : n < 0.62 ? 0x7a8648 : n < 0.72 ? 0xa8704a : 0xcdb886;
    return variar(mato, i, h, j, 0.05);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    if (this.tipo[i * TAM + j] === T.Cais) return variar((y + i) % 2 ? 0x9a8c72 : 0xb0a284, i, y, j, 0.05);
    if (y < NIVEL + 1) return variar(0xc9b888, i, y, j, 0.05);
    return variar(y % 3 === 0 ? 0xcdb684 : 0xd8c290, i, y, j, 0.04); // as camadas de globigerina
  }

  // ───────────── ajudantes (coordenadas locais) ─────────────

  private w(lx: number, lz: number, dy = 0) {
    const p = new THREE.Vector3(lx + ORIGEM_MALTA.x, 0, lz + ORIGEM_MALTA.z);
    p.y = this.altura(p.x, p.z) + dy;
    return p;
  }

  /** Um ponto da casa de Públio (local da casa: o centro dela, com a porta em +z). */
  private naCasa(lx: number, lz: number) {
    return this.w(CASA_PUBLIO.x + lx, CASA_PUBLIO.z + lz);
  }

  private chao(lx: number, lz: number) {
    return this.alturaTerreno(lx + ORIGEM_MALTA.x, lz + ORIGEM_MALTA.z);
  }

  private por(o: THREE.Object3D, lx: number, lz: number, rot = 0, y?: number, juntar = true) {
    o.position.set(lx + ORIGEM_MALTA.x, y ?? this.chao(lx, lz), lz + ORIGEM_MALTA.z);
    o.rotation.y = rot;
    if (juntar && o instanceof THREE.Mesh) this.juntador.add(o);
    else this.grupo.add(o);
    return o;
  }

  private caixa(x0: number, z0: number, x1: number, z1: number, topo: number) {
    this.caixas.push({ x0: x0 + ORIGEM_MALTA.x, x1: x1 + ORIGEM_MALTA.x, z0: z0 + ORIGEM_MALTA.z, z1: z1 + ORIGEM_MALTA.z, topo });
  }

  private piso(x0: number, z0: number, x1: number, z1: number, y: (lx: number, lz: number) => number) {
    const ox = ORIGEM_MALTA.x, oz = ORIGEM_MALTA.z;
    this.pisos.push({ x0: x0 + ox, x1: x1 + ox, z0: z0 + oz, z1: z1 + oz, y: (x, z) => y(x - ox, z - oz) });
  }

  private circulo(lx: number, lz: number, r: number) {
    this.circulos.push({ x: lx + ORIGEM_MALTA.x, z: lz + ORIGEM_MALTA.z, r });
  }

  /** Uma casa de pedra de teto plano (as mesmas de Creta: Malta é Mediterrâneo também), com o terraço e a escada. */
  private casa(lx: number, lz: number, w: number, f: number, pisos: 1 | 2, caiada: boolean, escada: boolean, parreira: boolean, rot: number, semente: number) {
    const chao = this.chao(lx, lz);
    this.por(casaCretense({ largura: w, fundo: f, pisos, caiada, escada, parreira, semente }), lx, lz, rot, chao);
    const giro = Math.round(rot / (Math.PI / 2)) & 3;
    const largX = giro % 2 ? f : w, largZ = giro % 2 ? w : f;
    const terraco = chao + PISO * pisos + 0.25;
    this.piso(lx - largX / 2, lz - largZ / 2, lx + largX / 2, lz + largZ / 2, (x, z) =>
      Math.abs(x - lx) > largX / 2 - 0.25 || Math.abs(z - lz) > largZ / 2 - 0.25 ? terraco + 0.5 : terraco);
    if (escada && giro === 0) {
      const alto = Math.round((PISO * pisos) / 0.25);
      const zFrente = lz + f / 2 - 0.5;
      this.piso(lx + w / 2, zFrente - alto * 0.25, lx + w / 2 + 0.75, zFrente + 0.25, (_x, z) => chao + Math.min(alto, Math.max(1, Math.ceil((zFrente + 0.25 - z) / 0.25))) * 0.25);
    }
    if (parreira && giro === 0) {
      this.circulo(lx - 1 - 0.875, lz + f / 2 + 1.875, 0.2);
      this.circulo(lx + 1.875, lz + f / 2 + 1.875, 0.2);
    }
  }

  // ───────────── a praia ─────────────

  private montarPraia() {
    const fx = FOGO.x, fz = costa(FOGO.x) - FOGO.d;
    this.por(fogueiraDePraia(), fx, fz);
    this.circulo(fx, fz, 0.9);
    // os gravetos da garriga: cada monte é um feixe que se apanha
    GRAVETOS.forEach(([x, z], k) => {
      const malha = feixeDeGravetos(k);
      malha.rotation.y = k * 1.1;
      malha.position.set(x + ORIGEM_MALTA.x, this.chao(x, z), z + ORIGEM_MALTA.z);
      this.grupo.add(malha);
      this.gravetos.push({ pos: this.w(x, z), malha });
    });
    // as tábuas e os destroços que o mar trouxe para a praia, e o navio encalhado lá fora, no banco
    const r = aleatorio(5101);
    const matTabua = new THREE.MeshLambertMaterial({ color: 0x6a4a30 });
    for (let k = 0; k < 16; k++) {
      const x = -50 + r() * 100, z = costa(x) - 1 - r() * 4;
      const tabua = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.6 + r() * 1.4), matTabua);
      tabua.castShadow = tabua.receiveShadow = true;
      this.por(tabua, x, z, r() * Math.PI, this.chao(x, z) + 0.06, false);
    }
    for (let k = 0; k < 4; k++) {
      const x = -30 + k * 17 + r() * 4, z = costa(x) - 2 - r() * 3;
      this.por(anfora(k), x, z, r() * 6, undefined, false).rotation.z = Math.PI / 2;
    }
    const destroco = navioAlexandrino(false, false);
    destroco.position.set(DESTROCO.x + ORIGEM_MALTA.x, NIVEL - 1.1, DESTROCO.z + ORIGEM_MALTA.z);
    destroco.rotation.set(0.1, DESTROCO.rumo, 0.06);
    this.grupo.add(destroco);
    for (let k = -4; k <= 4; k++) {
      this.circulos.push({
        x: DESTROCO.x + ORIGEM_MALTA.x + Math.sin(DESTROCO.rumo) * k * 3.2,
        z: DESTROCO.z + ORIGEM_MALTA.z + Math.cos(DESTROCO.rumo) * k * 3.2,
        r: 3.6 - Math.abs(k) * 0.3,
      });
    }
    // rochas na garriga e na ponta da praia
    for (const [x, z] of [[-70, 30], [-58, 14], [30, 14], [46, 2], [70, 46], [76, 50], [-20, 6]]) {
      this.por(rochedo(x * 3 + z), x, z, x);
      this.circulo(x, z, 1.2);
    }
  }

  // ───────────── a casa de Públio ─────────────

  private montarCasaDePublio() {
    const cx = CASA_PUBLIO.x, cz = CASA_PUBLIO.z;
    const chao = this.plataformas[1].h;
    this.por(villaDePublio(), cx, cz, 0, chao);
    const P = VILLA.patio, W = VILLA.largura / 2, D = VILLA.fundo / 2;
    const topo = chao + VILLA.cumeeira + 0.5;
    // as alas são blocos (os quartos ficam fechados); a porta da frente passa até o pátio
    this.caixa(cx - W, cz - D, cx + W, cz + P.z0, topo); // a ala do fundo
    this.caixa(cx - W, cz + P.z0, cx + P.x0, cz + P.z1, topo); // a ala do oeste
    this.caixa(cx + P.x1, cz + P.z0, cx + W, cz + P.z1, topo); // a ala do leste
    const meia = VILLA.porta / 2;
    this.caixa(cx - W, cz + P.z1, cx - meia, cz + D, topo); // a frente, dos dois lados da porta
    this.caixa(cx + meia, cz + P.z1, cx + W, cz + D, topo);
    // o pórtico: o piso um degrau acima e as colunas
    this.piso(cx + P.x0, cz + VILLA.portico.z0, cx + P.x1, cz + VILLA.portico.z1, () => chao + 0.25);
    for (let k = 0; k <= 6; k++) this.circulo(cx + P.x0 + 0.5 + k * 2.5, cz + VILLA.portico.z1 - 0.25, 0.3);
    // a cisterna no meio do pátio, a prensa num canto, o leito do pai sob o pórtico
    this.por(poco(), cx, cz + 1.2, 0, chao);
    this.circulo(cx, cz + 1.2, 1.3);
    this.por(prensaDeAzeite(), cx + 6, cz + 5, 0, chao);
    this.circulo(cx + 6, cz + 5, 0.9);
    this.por(leito(), cx - 3, cz - 3.75, Math.PI / 2, chao + 0.25);
    this.caixa(cx - 4.1, cz - 4.3, cx - 1.9, cz - 3.2, chao + 0.75);
    for (let k = 0; k < 3; k++) this.por(anfora(k + 3), cx + 7.2, cz - 4.4 + k * 0.45, k, chao + 0.25);
    // as esteiras dos enfermos, no pátio, esperando
    for (const [x, z] of [[-6, 1.2], [-2.5, 2.2], [2.5, 2.2], [6, 1.2]]) this.por(esteira(), cx + x, cz + z + 0.9, Math.PI / 2, chao);
    // o olival e os socalcos de pedra seca atrás da casa
    const r = aleatorio(5131);
    for (let i = 0; i < 20; i++) {
      const x = cx - 26 + (i % 5) * 10 + r() * 3, z = cz - 22 - Math.floor(i / 5) * 8 - r() * 2;
      if (z < -150) continue;
      this.por(oliveira(i + 30), x, z, r() * 6);
      this.circulo(x, z, 0.45);
    }
    for (let i = 0; i < 5; i++) {
      const x = cx - 26 + i * 11, z = cz - 18;
      this.por(muroSeco(8, i + 7), x, z, 0);
      this.caixa(x, z - 0.1, x + 8, z + 0.6, this.chao(x + 4, z) + 0.9);
    }
    this.por(cipreste(77), cx - 16, cz + 14);
    this.circulo(cx - 16, cz + 14, 0.6);
    this.por(cipreste(78), cx + 16, cz + 14);
    this.circulo(cx + 16, cz + 14, 0.6);
  }

  // ───────────── o povoado ─────────────

  private montarPovoado() {
    CASAS.forEach(([x, z, w, f, pisos, caiada, escada, parreira], n) => this.casa(x, z, w, f, pisos, caiada, escada, parreira, 0, 140 + n));
    this.por(poco(), POCO_ALDEIA.x, POCO_ALDEIA.z);
    this.circulo(POCO_ALDEIA.x, POCO_ALDEIA.z, 1.3);
    // o menino doente, na esteira à porta da casa do sul
    const [mx, mz, , mf] = CASAS[6];
    this.meninoDeitadoEm = this.w(mx + 0.6, mz + mf / 2 + 2.2);
    for (const [x, z, k] of [[2, -50, 'a'], [24, -36, 'c'], [48, -50, 'a'], [6, -72, 'c'], [38, -78, 'a'], [-14, -88, 'a']] as const) {
      this.por(k === 'c' ? cipreste(x + 200) : alfarrobeira(x + 200), x, z);
      this.circulo(x, z, k === 'c' ? 0.6 : 0.4);
    }
    // os campos murados do povoado
    for (let i = 0; i < 6; i++) {
      const x = 52 + (i % 2) * 10, z = -40 - Math.floor(i / 2) * 12;
      this.por(muroSeco(9, 40 + i), x, z, 0);
      this.caixa(x, z - 0.1, x + 9, z + 0.6, this.chao(x + 4.5, z) + 0.9);
    }
  }

  private meninoDeitadoEm = new THREE.Vector3();

  // ───────────── o porto ─────────────

  private montarPorto() {
    // o navio de Alexandria que invernou na ilha, com a insígnia dos Dióscuros pintada na proa (At 28,11)
    const navio = navioAlexandrino(false);
    navio.position.copy(this.navio);
    for (const lado of [-1, 1]) {
      const z = MEIO_COMPRIMENTO - 3.4;
      const ins = insigniaDosDioscuros();
      ins.position.set(lado * (meiaLarguraConves(z) + 0.42), convesEm(z) - 0.95, z);
      ins.rotation.y = lado * Math.PI / 2;
      navio.add(ins);
    }
    this.grupo.add(navio);
    for (const z of [30, 38, 46, 54]) this.por(posteDeAmarracao(), CAIS.x1 - 0.4, z);
    const zp = NAVIO.z + PRANCHA_Z;
    const xBorda = NAVIO.x - meiaLarguraConves(PRANCHA_Z) - 0.3;
    const yCais = NIVEL + 1, yConves = NIVEL + convesEm(PRANCHA_Z);
    const prancha = new THREE.Mesh(new THREE.BoxGeometry(xBorda - CAIS.x1 + 0.6, 0.12, 1.1), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    prancha.position.set((CAIS.x1 + xBorda) / 2 + ORIGEM_MALTA.x, (yCais + yConves) / 2 + 0.04, zp + ORIGEM_MALTA.z);
    prancha.rotation.z = Math.atan2(yConves - yCais, xBorda - CAIS.x1);
    prancha.castShadow = prancha.receiveShadow = true;
    this.grupo.add(prancha);
    this.piso(CAIS.x1 - 0.05, zp - 0.55, xBorda + 0.35, zp + 0.55, (x) => yCais + ((x - CAIS.x1) / (xBorda - CAIS.x1)) * (yConves - yCais));
    // os barcos de pesca da praia do leste
    for (const [x, d, rot] of [[56, 3, 0.2], [44, 4, -0.3]] as const) {
      this.por(barcoDePesca(x), x, costa(x) - d, rot);
      this.circulo(x, costa(x) - d, 1.3);
    }
    // o que os moradores levam ao navio na partida: "puseram a bordo o necessário" (At 28,10)
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? sacoDeTrigo(i) : anfora(i);
      s.position.set(CAIS.x0 + 0.8 + (i % 3) * 0.7 + ORIGEM_MALTA.x, NIVEL + 1, zp + 3 + Math.floor(i / 3) * 0.6 + ORIGEM_MALTA.z);
      s.rotation.y = i;
      this.provisoes.add(s);
    }
  }

  // ───────────── Melite ─────────────

  private montarMelite() {
    const L = MELITE;
    const base = this.plataformas[0].h;
    const alto = base + 4.5;
    const parede = (xa: number, za: number, xb: number, zb: number) => {
      const comp = Math.hypot(xb - xa, zb - za);
      this.por(muralha(comp), xa, za, Math.atan2(-(zb - za), xb - xa), base);
      const ex = 0.5;
      this.caixa(Math.min(xa, xb) - ex, Math.min(za, zb) - ex, Math.max(xa, xb) + ex, Math.max(za, zb) + ex, alto);
    };
    parede(L.x0, L.z0, L.x1, L.z0);
    parede(L.x0, L.z1 - 1, L.x1, L.z1 - 1);
    parede(L.x0 + 1, L.z0, L.x0 + 1, L.z1);
    parede(L.x1 - 1, L.z0, L.x1 - 1, L.porta - 3.5);
    parede(L.x1 - 1, L.porta + 3.5, L.x1 - 1, L.z1);
    this.por(portaDaCidade(), L.x1 - 1.5, L.porta, Math.PI / 2, base);
    this.caixa(L.x1 - 3, L.porta - 3.5, L.x1, L.porta - 1.6, alto + 1.5);
    this.caixa(L.x1 - 3, L.porta + 1.6, L.x1, L.porta + 3.5, alto + 1.5);
    for (const [x, z, w, f, pisos, rot] of CASAS_MELITE) this.casa(x, z, w, f, pisos, (x + z) % 2 === 0, false, false, rot, x * 3 + z);
    this.por(fonteDaPraca(), PRACA_MELITE.x, PRACA_MELITE.z);
    this.caixa(PRACA_MELITE.x - 1.5, PRACA_MELITE.z - 1.5, PRACA_MELITE.x + 1.5, PRACA_MELITE.z + 1, base + 0.75);
    for (const [x, z] of [[-112, -108], [-112, -122], [-134, -116]]) {
      this.por(cipreste(x - z), x, z);
      this.circulo(x, z, 0.6);
    }
  }

  // ───────────── o campo ─────────────

  private montarCampo() {
    const r = aleatorio(5171);
    const livre = (x: number, z: number) => {
      if (costa(x) - z < 14) return false;
      for (const e of ESTRADAS) if (distanciaAoCaminho(x, z, e) < 3) return false;
      for (const p of this.plataformas) if (Math.abs(x - p.x) < p.mx + 3 && Math.abs(z - p.z) < p.mz + 3) return false;
      for (const [gx, gz] of GRAVETOS) if (Math.hypot(x - gx, z - gz) < 3) return false;
      return !(x > CAIS.x0 - 6 && z > 10);
    };
    for (let i = 0; i < 90; i++) {
      const x = -150 + r() * 300, z = -150 + r() * 190;
      if (!livre(x, z)) continue;
      const k = r();
      if (k < 0.32) {
        this.por(alfarrobeira(i + 300), x, z, r() * 6);
        this.circulo(x, z, 0.4);
      } else if (k < 0.45) {
        this.por(oliveira(i + 300), x, z, r() * 6);
        this.circulo(x, z, 0.45);
      } else if (k < 0.55) {
        this.por(cipreste(i + 300), x, z);
        this.circulo(x, z, 0.5);
      } else {
        this.por(rochedo(i + 300), x, z, r() * 6);
        this.circulo(x, z, 1.2);
      }
    }
  }

  // ───────────── a história ─────────────

  /** Põe cada um no seu lugar conforme a história (ao entrar, ao carregar e depois de cada passo). */
  arrumar(tem: (flag: string) => boolean) {
    const e = etapaDeMalta(tem);
    this.caminhos.clear();
    this.pauloImpondo = false;
    this.clima = tem('malta_curas') ? 2 : tem('malta_vibora') ? 1 : 0;
    this.chuva.malha.visible = this.clima === 0;
    this.feixes = Math.min(FEIXES, [1, 2, 3, 4, 5].filter((n) => tem(`malta_lancou_${n}`)).length);
    this.gravetos.forEach((g, k) => (g.malha.visible = !tem(`malta_feixe_${k}`) && e === 'fogo'));
    this.feixeDePaulo.visible = e === 'fogo' || e === 'vibora';
    this.faseVibora = 'oculta';
    this.cobra.visible = false;
    this.provisoes.visible = e === 'partida';
    for (const n of this.npcs) {
      n.raiz.visible = true;
      n.fixo = false;
    }

    const fx = FOGO.x, fz = costa(FOGO.x) - FOGO.d;
    const roda = (n: Npc, ang: number, r: number) => {
      const p = this.w(fx + Math.sin(ang) * r, fz + Math.cos(ang) * r);
      n.colocar(p, ang + Math.PI);
    };
    const [paulo, lucas, aristarco, julio, s1, s2, p1, p2, piloto, nauclero, m1, m2] = this.npcs;
    const naufragos = this.npcs.slice(12, 16);
    const [anciao, mulher, pescador, rapaz] = this.moradores;
    const daNave = [lucas, aristarco, julio, s1, s2, p1, p2, piloto, nauclero, m1, m2, ...naufragos];

    // a gente do navio, em roda do fogo (até os três meses); depois, no cais. A roda é larga e o ancião fica longe de
    // Paulo, para a câmera de conversa ter onde ficar e cada um ser alcançável sem o vizinho tomar a vez
    if (e !== 'partida') {
      daNave.forEach((n, k) => roda(n, -Math.PI * 0.85 + (k / (daNave.length - 1)) * Math.PI * 1.7, 5.4 + (k % 3) * 1.1));
      roda(paulo, Math.PI * 0.08, 2.4);
      roda(anciao, -Math.PI * 0.4, 3.0);
      roda(mulher, Math.PI * 0.95, 3.2);
      pescador.colocar(this.w(fx + 9, fz + 2), -Math.PI / 2);
      rapaz.colocar(this.w(fx - 8, fz - 3), Math.PI / 2);
    }
    this.barqueiro.colocar(this.w(60, costa(60) - 4), 0);

    // Públio e a casa dele
    const emCasa = e === 'pai' || e === 'enfermos' || e === 'honras';
    this.publio.raiz.visible = e === 'publio' || emCasa || e === 'partida';
    this.criado.raiz.visible = this.publio.raiz.visible;
    if (e === 'publio') {
      this.publio.colocar(this.w(fx - 3.5, fz - 5.5), Math.PI * 0.1);
      this.criado.colocar(this.w(fx - 5, fz - 6.5), Math.PI * 0.2);
    } else if (emCasa) {
      this.publio.colocar(this.naCasa(-0.6, -2.0), Math.PI);
      this.criado.colocar(this.naCasa(2.4, VILLA.fundo / 2 + 1.2), 0);
    }
    // os três companheiros e Júlio, hospedados por Públio três dias (At 28,7)
    if (emCasa) {
      paulo.colocar(this.naCasa(-4.6, -2.4), Math.PI * 0.75);
      lucas.colocar(this.naCasa(3.5, -2.0), -Math.PI * 0.6);
      aristarco.colocar(this.naCasa(4.6, -0.6), -Math.PI * 0.5);
      julio.colocar(this.naCasa(-6.2, 3.8), Math.PI * 0.8);
      if (e === 'honras') julio.colocar(this.w(CAIS.x0 + 2, NAVIO.z - 2), Math.PI / 2);
    }
    // o pai: de cama até ser curado; depois, de pé junto ao leito
    if (tem('malta_pai_curado')) this.pai.colocar(this.naCasa(-1.4, -3.3), Math.PI * 0.9);
    else {
      this.pai.colocar(this.leito, Math.PI / 2);
      deitar(this.pai, 0.47);
      this.pai.fixo = true;
    }
    if (tem('malta_pai_curado')) levantar(this.pai);
    this.pai.raiz.visible = emCasa || e === 'publio';

    // os enfermos: em casa, a caminho (refeito como chegado) ou no pátio; curados depois das curas
    for (const [id, x] of this.enfermos) {
      const curado = tem('malta_curas');
      x.doente.raiz.visible = !curado;
      x.curado.raiz.visible = curado;
      const avisado = tem(`malta_enfermo_${id}`);
      x.chegou = avisado;
      const lugar = avisado || curado ? x.vaga : x.casa;
      const rumo = avisado || curado ? Math.PI : x.rumo;
      x.doente.colocar(lugar, rumo);
      x.curado.colocar(lugar, rumo);
      if (e === 'partida') x.curado.colocar(this.w(CAIS.x0 + 1 + ID_ENFERMOS.indexOf(id) * 0.9, NAVIO.z + 8), Math.PI / 2);
    }
    // o menino: deitado em casa; com a mãe avisada, no pátio de Públio; curado, de pé ao lado dela
    const maeAvisada = tem('malta_enfermo_mae');
    const vagaMae = this.enfermos.get('mae')!.vaga;
    this.meninoDeitado.visible = !tem('malta_curas');
    this.meninoDeitado.position.copy(maeAvisada ? vagaMae.clone().add(new THREE.Vector3(0.9, 0, 0.4)) : this.meninoDeitadoEm);
    this.meninoDeitado.rotation.y = Math.PI / 2;
    this.menino.raiz.visible = tem('malta_curas');
    this.menino.colocar(vagaMae.clone().add(new THREE.Vector3(0.8, 0, 0.3)), Math.PI);

    // a partida, três meses depois: todos no cais; os moradores trazem as provisões (At 28,10-11)
    if (e === 'partida') {
      const cais = (n: Npc, dx: number, dz: number, rumo = Math.PI / 2) => n.colocar(this.w(CAIS.x0 + dx, NAVIO.z + dz), rumo);
      cais(paulo, 2.6, 2.2);
      cais(lucas, 1.6, 3.4);
      cais(aristarco, 1.2, 1.4);
      cais(julio, 2.8, -0.2);
      [s1, s2, p1, p2, piloto, nauclero, m1, m2].forEach((n, k) => cais(n, 0.9 + (k % 3) * 1.1, -2 - Math.floor(k / 3) * 1.4));
      naufragos.forEach((n, k) => cais(n, 1 + (k % 2) * 1.6, -6.5 - Math.floor(k / 2) * 1.3));
      this.moradores.forEach((n, k) => n.colocar(this.w(CAIS.x0 - 3 - k * 1.2, costa(CAIS.x0) - 5 - (k % 2)), Math.PI * 0.4));
      this.publio.colocar(this.w(CAIS.x0 + 1.2, NAVIO.z + 5.6), Math.PI / 2);
      this.criado.colocar(this.w(CAIS.x0 + 1.0, NAVIO.z + 6.8), Math.PI / 2);
      this.pai.colocar(this.w(CAIS.x0 - 0.4, NAVIO.z + 5.2), Math.PI / 2);
      this.pai.raiz.visible = true;
    }
  }

  /** O pai de Públio sarou: levanta-se do leito. */
  levantarOPai() {
    levantar(this.pai);
    this.pai.fixo = false;
    this.pai.colocar(this.naCasa(-1.4, -3.3), Math.PI * 0.9);
  }

  /** Públio leva os náufragos para casa: Paulo, Lucas, Aristarco e Júlio sobem a estrada atrás dele. */
  subirParaACasa() {
    const destinos: [Npc, number, number][] = [
      [this.publio, -0.6, -2.0], [this.criado, 2.4, VILLA.fundo / 2 + 1.2], [this.paulo, -4.6, -2.4],
      [this.lucas, 3.5, -2.0], [this.aristarco, 4.6, -0.6], [this.julio, -6.2, 3.8],
    ];
    destinos.forEach(([n, lx, lz], k) => this.levar(n, [...ESTRADAS[0], PATIO], this.naCasa(lx, lz), k * 0.9));
  }

  /** Um enfermo foi avisado: sai de casa e vai pela estrada até a casa de Públio. */
  mandarParaACasa(id: DefEnfermoMalta['id']) {
    const x = this.enfermos.get(id);
    if (!x) return;
    const rotas: Record<DefEnfermoMalta['id'], [number, number][]> = {
      febril: [[22, -38], [0, -26], [-20, -14], [-34, -34], [-40, -49], PATIO],
      coxo: [[98, 26], [80, 26], [50, 30], [20, 26], [-2, 24], [-8, 6], [-20, -14], [-34, -34], [-40, -49], PATIO],
      cego: [[-100, -115], [-90, -80], [-60, -40], [-34, -34], [-40, -49], PATIO],
      mae: [[-6, -86], [-4, -60], [-20, -50], [-40, -49], PATIO],
    };
    this.levar(x.doente, rotas[id], x.vaga, 0);
    x.chegou = false;
    if (id === 'mae') {
      // a mãe leva o menino: ele some da esteira de casa e aparece na do pátio quando ela chegar
      this.meninoDeitado.visible = false;
    }
  }

  /** Todos os avisados já chegaram ao pátio (e há quatro). */
  enfermosNoPatio(tem: (flag: string) => boolean) {
    for (const [id, x] of this.enfermos) if (!tem(`malta_enfermo_${id}`) || !x.chegou) return false;
    return true;
  }

  /** Faz alguém andar pelos pontos de uma estrada (locais) até `fim`, depois de `espera` segundos. */
  private levar(n: Npc, rota: [number, number][], fim: THREE.Vector3, espera: number) {
    const pts = rota.map(([x, z]) => this.w(x, z));
    // começa pelo ponto da estrada mais perto de onde ele está
    let k0 = 0, melhor = Infinity;
    pts.forEach((p, k) => {
      const d = p.distanceToSquared(n.pos);
      if (d < melhor) {
        melhor = d;
        k0 = k;
      }
    });
    this.caminhos.set(n, { pts: [...pts.slice(k0), fim], espera });
  }

  /** A cena do fogo, passo a passo, pedida pelo roteiro. */
  cenaDaVibora(passo: 'lanca' | 'prende' | 'sacode') {
    if (passo === 'lanca') {
      this.feixeDePaulo.visible = false;
      this.labareda = 1;
      return;
    }
    if (passo === 'prende') {
      this.faseVibora = 'pulando';
      this.tVibora = 0;
      this.cobra.visible = true;
      return;
    }
    this.faseVibora = 'sacudida';
    this.tVibora = 0;
  }

  /** O próximo passo do caminho (para a rosa dos ventos do Conselho). */
  rumo(tem: (flag: string) => boolean, jogador: THREE.Vector3): THREE.Vector3 | null {
    const perto = (lista: THREE.Vector3[]) => lista.reduce<THREE.Vector3 | null>((a, p) => (!a || p.distanceToSquared(jogador) < a.distanceToSquared(jogador) ? p : a), null);
    switch (etapaDeMalta(tem)) {
      case 'fogo':
        return this.levandoFeixe ? this.fogo : perto(this.gravetos.filter((_, k) => !tem(`malta_feixe_${k}`)).map((g) => g.pos));
      case 'vibora':
        return this.paulo.pos;
      case 'boatos':
        return perto(this.moradores.filter((n) => !tem(`malta_boato_${n.def.id.slice(6)}`)).map((n) => n.pos));
      case 'publio':
        return this.publio.pos;
      case 'pai':
        return tem('malta_pai_rezar') ? this.leito : this.publio.pos;
      case 'enfermos': {
        const falta = [...this.enfermos].filter(([id]) => !tem(`malta_enfermo_${id}`)).map(([, x]) => x.doente.pos);
        return falta.length ? perto(falta) : this.paulo.pos;
      }
      case 'honras':
        return this.julio.pos;
      case 'partida':
        return this.prancha;
    }
  }

  // ───────────── o quadro ─────────────

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.oceano.atualizar(dt, jogador);
    this.chuva.atualizar(dt, jogador);
    const chao = (x: number, z: number) => this.altura(x, z);
    for (const [n, c] of this.caminhos) {
      if (this.pausa) break;
      if (c.espera > 0) {
        c.espera -= dt;
        continue;
      }
      const caminho = c.pts;
      if (n.andarPara(caminho[0], dt, chao, 1.7)) {
        caminho.shift();
        if (!caminho.length) {
          this.caminhos.delete(n);
          n.colocar(n.pos, Math.PI);
          for (const x of this.enfermos.values()) if (x.doente === n) x.chegou = true;
          if (n === this.enfermos.get('mae')?.doente) {
            this.meninoDeitado.position.copy(n.pos).add(new THREE.Vector3(0.9, 0, 0.4));
            this.meninoDeitado.visible = true;
          }
          this.aoChegar?.(n);
        }
      }
    }
    for (const n of this.npcs) if (!this.caminhos.has(n)) n.atualizar(dt, jogador);

    // o fogo: cresce com os feixes; a labareda do feixe de Paulo; o tremor das chamas
    this.labareda = Math.max(0, this.labareda - dt * 0.7);
    const k = (0.35 + 0.65 * (this.feixes / FEIXES)) * (1 + this.labareda * 0.8);
    this.chama.scale.setScalar(0.55 + k * 0.6);
    this.chama.children.forEach((b) => {
      const f = b.userData.fase as number;
      b.scale.y = 0.8 + Math.sin(this.t * 9 + f) * 0.25 + Math.sin(this.t * 23 + f * 2) * 0.1;
      b.rotation.y = this.t * 0.6 + f;
    });
    this.luzFogo.intensity = (3 + 6 * k) * (0.9 + Math.sin(this.t * 13) * 0.08);

    // Paulo impondo as mãos sobre o pai de Públio (At 28,8)
    const bd = this.paulo.humano.bracoD, be = this.paulo.humano.bracoE;
    if (this.pauloImpondo && bd && be) {
      const ergue = -1.0 + Math.sin(this.t * 1.4) * 0.05;
      bd.rotation.x += (ergue - bd.rotation.x) * Math.min(1, dt * 4);
      be.rotation.x += (ergue - be.rotation.x) * Math.min(1, dt * 4);
    }
    // o pai com febre: treme debaixo do cobertor
    if (this.pai.fixo) this.pai.humano.raiz.position.x = Math.sin(this.t * 31) * 0.006;

    this.atualizarVibora(dt);
  }

  private atualizarVibora(dt: number) {
    if (this.faseVibora === 'oculta') return;
    this.tVibora += dt;
    const bd = this.paulo.humano.bracoD;
    const mao = new THREE.Vector3(0, -0.66, 0.4);
    if (bd) bd.localToWorld(mao);
    const c = this.cobra;
    if (this.faseVibora === 'pulando') {
      // salta do calor da fogueira para a mão (At 28,3)
      const k = Math.min(1, this.tVibora / 0.35);
      c.position.lerpVectors(this.fogo, mao, k);
      c.position.y += Math.sin(k * Math.PI) * 0.5;
      c.lookAt(mao);
      if (k >= 1) {
        this.faseVibora = 'presa';
        this.tVibora = 0;
      }
      return;
    }
    if (this.faseVibora === 'presa') {
      // pendurada da mão, a cauda balançando
      c.position.copy(mao);
      c.position.y -= 0.18;
      c.rotation.set(Math.PI / 2 + Math.sin(this.tVibora * 6) * 0.25, this.paulo.raiz.rotation.y, Math.sin(this.tVibora * 4) * 0.3);
      if (bd) bd.rotation.x = -0.5 + Math.sin(this.tVibora * 2) * 0.05;
      return;
    }
    if (this.faseVibora === 'sacudida') {
      // Paulo sacode a mão sobre o fogo
      if (bd) {
        bd.rotation.x = -0.7 + Math.sin(this.tVibora * 26) * 0.45;
        bd.rotation.z = Math.sin(this.tVibora * 19) * 0.2;
      }
      c.position.copy(mao);
      c.position.y -= 0.18;
      c.rotation.set(Math.PI / 2 + Math.sin(this.tVibora * 26) * 0.8, this.paulo.raiz.rotation.y, 0);
      if (this.tVibora > 0.9) {
        this.faseVibora = 'voando';
        this.tVibora = 0;
        this.voo.copy(mao);
      }
      return;
    }
    // voando de volta para o fogo, onde some
    const k = Math.min(1, this.tVibora / 0.45);
    c.position.lerpVectors(this.voo, this.fogo, k);
    c.position.y += Math.sin(k * Math.PI) * 0.7;
    c.rotation.x += dt * 14;
    if (bd) {
      bd.rotation.x *= 1 - Math.min(1, dt * 5);
      bd.rotation.z *= 1 - Math.min(1, dt * 5);
    }
    if (k >= 1) {
      this.faseVibora = 'oculta';
      c.visible = false;
      this.labareda = 1;
      if (bd) bd.rotation.set(0, 0, 0);
    }
  }

  private voo = new THREE.Vector3();

  // ───────────── física ─────────────

  private alturaTerreno(x: number, z: number) {
    const i = Math.floor(x - ORIGEM_MALTA.x + META), j = Math.floor(z - ORIGEM_MALTA.z + META);
    return this.h(i, j);
  }

  /** O navio dos Dióscuros, no cais: o convés, a borda (aberta na prancha), a cabine. `null` fora dele. */
  private alturaNavio(x: number, z: number): number | null {
    const lx = x - this.navio.x, lz = z - this.navio.z;
    if (Math.abs(lz) >= MEIO_COMPRIMENTO - 0.25) return null;
    const meia = meiaLarguraConves(lz);
    if (Math.abs(lx) > meia + 0.3) return null;
    const conves = this.navio.y + convesEm(lz);
    if (Math.abs(lx) > meia) {
      if (lx < 0 && Math.abs(lz - PRANCHA_Z) < 0.55) return conves;
      return this.navio.y + bordaEm(lz) + BORDA_PAREDE;
    }
    if (lx > CABINE.x0 && lx < CABINE.x1 && lz > CABINE.z0 && lz < CABINE.z1) return conves + CABINE.altura + 0.7;
    if (lz > 3.5 && lz < 6.5 && Math.abs(lx) < 1.5) return conves + 0.25;
    return conves;
  }

  altura(x: number, z: number) {
    const navio = this.alturaNavio(x, z);
    if (navio !== null) return navio;
    let h = this.alturaTerreno(x, z);
    for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) h = Math.max(h, p.y(x, z));
    return h;
  }

  colidir(pos: THREE.Vector3, raio: number) {
    for (const b of this.caixas) {
      if (pos.y >= b.topo) continue;
      const qx = Math.min(Math.max(pos.x, b.x0), b.x1), qz = Math.min(Math.max(pos.z, b.z0), b.z1);
      const dx = pos.x - qx, dz = pos.z - qz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= raio * raio) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = qx + (dx / d) * raio;
        pos.z = qz + (dz / d) * raio;
      } else {
        const e = [pos.x - b.x0, b.x1 - pos.x, pos.z - b.z0, b.z1 - pos.z];
        const k = e.indexOf(Math.min(...e));
        if (k === 0) pos.x = b.x0 - raio;
        else if (k === 1) pos.x = b.x1 + raio;
        else if (k === 2) pos.z = b.z0 - raio;
        else pos.z = b.z1 + raio;
      }
    }
    const mx = this.navio.x + MASTRO.x, mz = this.navio.z + MASTRO.z;
    const extras = [{ x: mx, z: mz, r: 0.35 }];
    for (const n of this.npcs) if (n.raiz.visible && !n.fixo) extras.push({ x: n.pos.x, z: n.pos.z, r: 0.35 });
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

  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + ORIGEM_MALTA.x, lz + ORIGEM_MALTA.z];
    return [
      { especie: 'cabra', quantidade: 5, centro: c(-70, -60), raio: 16 },
      { especie: 'ovelha', quantidade: 4, centro: c(60, -60), raio: 12 },
      { especie: 'lagartixa', quantidade: 8, centro: c(0, -20), raio: 70 },
      { especie: 'galinha', quantidade: 5, centro: c(20, -55), raio: 8 },
      { especie: 'jumento', quantidade: 1, centro: c(CASA_PUBLIO.x + 10, CASA_PUBLIO.z + 16), raio: 4 },
      { especie: 'gato', quantidade: 2, centro: c(PRACA_MELITE.x, PRACA_MELITE.z), raio: 8 },
      { especie: 'cao', quantidade: 1, centro: c(CASA_PUBLIO.x - 4, CASA_PUBLIO.z + 15), raio: 5 },
      { especie: 'coelho', quantidade: 4, centro: c(-60, -10), raio: 30 },
    ];
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_MALTA.x - META, z0: ORIGEM_MALTA.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        if (this.alturaNavio(x, z) !== null) return 0x7a5636;
        for (const b of this.caixas) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1 && b.x1 - b.x0 > 1.5 && b.z1 - b.z0 > 1.5) return 0xb0583a;
        for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1 && p.x1 - p.x0 > 2) return 0xe6dcc4;
        const i = Math.floor(x - ORIGEM_MALTA.x + META), j = Math.floor(z - ORIGEM_MALTA.z + META);
        const h = this.h(i, j);
        if (h < NIVEL) return NIVEL - h <= 1.5 ? 0x6fc4cc : NIVEL - h <= 4 ? 0x3c9cb0 : 0x1f6f8a;
        return this.corTopo(i, j, h);
      },
    };
  }
}

/** Deita um NPC (de costas, a cabeça para -z do corpo) a `altura` do chão dele: no leito ou na esteira. */
function deitar(n: Npc, altura: number) {
  const s = 0.085;
  const g = suporte(n);
  g.rotation.x = -Math.PI / 2;
  g.position.set(0, altura + 2.5 * s, 15.5 * s);
}

/**
 * Um grupo entre o NPC e o corpo dele, para deitá-lo: os gestos de conversa mexem a cada quadro na raiz do corpo
 * (inclinar o tronco, recuar), então a pose de deitado fica num nível acima, e os gestos continuam valendo por cima.
 */
const suportes = new WeakMap<Npc, THREE.Group>();
function suporte(n: Npc) {
  let g = suportes.get(n);
  if (!g) {
    g = new THREE.Group();
    n.raiz.remove(n.humano.raiz);
    g.add(n.humano.raiz);
    n.raiz.add(g);
    suportes.set(n, g);
  }
  return g;
}

/** Põe de pé quem estava deitado. */
function levantar(n: Npc) {
  const g = suportes.get(n);
  if (!g) return;
  g.rotation.set(0, 0, 0);
  g.position.set(0, 0, 0);
}

/** Distância (m) de um ponto ao caminho (uma linha quebrada). */
function distanciaAoCaminho(x: number, z: number, pts: [number, number][]) {
  let melhor = Infinity;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
    const vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    melhor = Math.min(melhor, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return melhor;
}
