import * as THREE from 'three';
import { aleatorio, Ruido } from '../core/Ruido';
import { ARISTARCO, LUCAS, PAULO } from '../entidades/Companheiros';
import { GENTE_DE_LASEIA, MARINHEIROS, NAUCLERO, PADEIRA, PASTOR, PESCADOR, PILOTO, PRESOS } from '../entidades/GenteDeCreta';
import { Npc, type DefNpc } from '../entidades/Npc';
import { JULIO, soldado } from '../entidades/Romanos';
import { Sombra } from '../entidades/Sombra';
import type { Povoamento } from '../fauna/Fauna';
import type { FonteMapa } from '../ui/Minimapa';
import { variar } from '../voxel/Modelo';
import type { Area } from './Area';
import { Juntador } from './BahiaModelos';
import {
  PISO, alfarrobeira, barcoDePesca, casaCretense, cipreste, farol, fonteDaPraca, forno, muralha, muroSeco, oliveira, portaDaCidade,
  portico, posteDeAmarracao, redeSecando, rochedo,
} from './CretaModelos';
import { BORDA_PAREDE, CABINE, MASTRO, MEIO_COMPRIMENTO, anfora, bote, bordaEm, convesEm, meiaLarguraConves, navioAlexandrino, sacoDeTrigo } from './NavioModelos';
import { Oceano } from './Oceano';
import { blocosDeColunas } from './Terreno';
import { NIVEL_MAR, ORIGENS } from './aberto/Geografia';

/** Canto do mapa de Creta no mundo (longe das outras áreas). */
export const ORIGEM_CRETA = ORIGENS.creta;
/** Colunas de 1 m de cada lado. */
const TAM = 320;
const META = TAM / 2;
export { NIVEL_MAR };
/** Fundo do mar aberto, fora do mapa (m): fundo demais para se ficar de pé; nada-se para onde quiser. */
const FUNDO_ABERTO = NIVEL_MAR - 8;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A linha da costa (z local) em cada x: a terra fica ao norte (z menor), o mar ao sul. No meio, a enseada de Bons
 * Portos entra pela terra (At 27,8); a leste a costa sobe em falésias.
 */
function costa(x: number) {
  return 34 + 14 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.063 + 1.1) - 40 * Math.exp(-((x + 5) ** 2) / (2 * 38 * 38));
}

// ───────────── o desenho do lugar (m, coordenadas locais) ─────────────

/** As ilhotas na boca da enseada (x, z e raio). */
const ILHOTAS: [number, number, number][] = [
  [-22, 44, 9],
  [20, 58, 6],
];
/** O cais de pedra, que sai da praia mar adentro, e a bacia funda ao lado dele, onde o navio está atracado. */
const CAIS = { x0: -46, x1: -40, z0: -12, z1: 22 };
const BACIA = { x0: -40, x1: -26, z0: -8, z1: 32 };
/** O navio de Alexandria, de proa para o mar (+z), encostado no cais. */
const NAVIO = { x: -34.5, z: 11 };
/** A prancha de embarque, do cais à borda do navio (z local do navio). */
const PRANCHA_Z = 1;

/** As casas de Bons Portos: x, quanto ficam terra adentro, largura, fundo, pisos, caiada, escada, parreira. */
const CASAS: [number, number, number, number, 1 | 2, boolean, boolean, boolean][] = [
  [-58, 14, 6, 5, 1, true, true, true], // a casa onde Paulo e os companheiros esperam o tempo firmar
  [-68, 16, 5, 4.5, 1, false, true, false],
  [-79, 13, 7, 5, 2, true, true, false], // a casa do mestre do porto
  [-90, 15, 5, 5, 1, false, false, true],
  [-63, 27, 5, 4, 1, true, false, false],
  [-75, 28, 6, 5, 1, false, true, true],
  [-87, 29, 5, 4, 1, true, true, false],
  [-98, 22, 5, 4, 1, true, false, false],
  [-71, 41, 6, 5, 2, false, true, false],
  [-52, 9, 9, 6, 1, false, false, false], // o armazém do trigo, junto do cais
];

/** A estrada de terra de Bons Portos a Laseia, pelo alto das colinas da costa. */
const ESTRADA: [number, number][] = [
  [-74, -12], [-58, -14], [-44, -19], [-20, -25], [0, -18], [24, -9], [48, 3], [72, 12],
];
/** Laseia, no planalto sobre as falésias do leste (At 27,8), murada, com a porta para o oeste. */
const LASEIA = { x0: 72, x1: 108, z0: -6, z1: 30, porta: 12 };
/** As casas de Laseia (x, z, largura, fundo, pisos, rotação). */
const CASAS_LASEIA: [number, number, number, number, 1 | 2, number][] = [
  [79, 0, 6, 5, 2, 0], [87, -1, 5, 4.5, 1, 0], [100, 0, 7, 5, 2, 0], [80, 25, 6, 5, 1, Math.PI],
  [92, 25, 5, 5, 2, Math.PI], [102, 24, 5, 4, 1, Math.PI], [103, 12, 5, 6, 1, -Math.PI / 2],
];
/** A praça de Laseia (centro). */
const AGORA = { x: 90, z: 12 };
/** O farol, na ponta da falésia, além de Laseia. */
const FAROL = { x: 128, z: 33 };
/** A cabana do pastor, nas encostas do norte. */
const CABANA = { x: -25, z: -92 };

interface Plataforma { x: number; z: number; mx: number; mz: number; h: number }
interface Piso { x0: number; x1: number; z0: number; z1: number; y: (x: number, z: number) => number }
interface Caixa { x0: number; x1: number; z0: number; z1: number; topo: number }

const enum T { Natural, Terra, Cais, Calcada }

/**
 * Creta: a costa sul, em Bons Portos, perto da cidade de Laseia (At 27,8), onde o navio de Paulo esperou o tempo
 * firmar. É a primeira das três partes do Mar da Tempestade (Creta, o navio, Malta).
 *
 * - O mapa (320 × 320 m) é feito de blocos (`blocosDeColunas`); o mar é o `Oceano`, que segue o jogador até o
 *   horizonte. Fora do mapa é mar aberto: nada-se até onde se quiser.
 * - Bons Portos: o cais de pedra com o navio de Alexandria atracado, a vila de pescadores e o armazém do trigo.
 * - Pela estrada das colinas, a leste, Laseia: murada, com a praça, a fonte e o pórtico; além dela, o farol.
 * - As casas têm terraço: sobe-se pelas escadas de fora. Embarca-se no navio pela prancha.
 */
export class Creta implements Area {
  readonly id = 'creta' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  /** Os bichos não entram no mar; as sombras boiam nele. */
  readonly nivelMinimo = NIVEL_MAR;
  readonly oceano = new Oceano(NIVEL_MAR, 0x1d7f98);
  /** Na praia de Bons Portos, junto aos barcos, olhando o cais e o navio. */
  readonly chegada: THREE.Vector3;
  /** Na ponta da ilhota maior (para testar a travessia a nado). */
  readonly ilhota: THREE.Vector3;
  /** O barco de pesca que leva de volta à Bahia. */
  readonly barcoDeVolta: THREE.Vector3;
  /** Pontos para o painel e para as interações. */
  readonly cais: THREE.Vector3;
  readonly conves: THREE.Vector3;
  readonly casaDePaulo: THREE.Vector3;
  readonly praca: THREE.Vector3;
  readonly portaLaseia: THREE.Vector3;
  readonly farol: THREE.Vector3;
  readonly cabana: THREE.Vector3;
  /** Quem vive aqui ou espera o navio partir. */
  readonly npcs: Npc[] = [];
  /** São Paulo: reza na casa da praia até baterem à porta; depois desce ao cais e, após o conselho, embarca. */
  paulo!: Npc;
  lucas!: Npc;
  aristarco!: Npc;
  /** Onde se embarca (a ponta da prancha, no cais). */
  readonly prancha: THREE.Vector3;
  /** Chamado quando Paulo chega ao cais. */
  aoChegarPaulo: (() => void) | null = null;
  private caminhoPaulo: THREE.Vector3[] = [];
  private portaPaulo = new THREE.Vector3();

  private readonly alturas = new Int16Array(TAM * TAM);
  private readonly tipo = new Uint8Array(TAM * TAM);
  private readonly ruido = new Ruido(4127);
  private readonly ruidoCor = new Ruido(311);
  private readonly plataformas: Plataforma[] = [];
  private readonly pisos: Piso[] = [];
  private readonly caixas: Caixa[] = [];
  private readonly circulos: { x: number; z: number; r: number }[] = [];
  private readonly juntador = new Juntador(40);
  private readonly navio = new THREE.Vector3();

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
    terreno.position.copy(ORIGEM_CRETA);
    this.aoRedor.add(this.oceano.malha);
    this.grupo.add(terreno, this.aoRedor);

    this.navio.set(NAVIO.x + ORIGEM_CRETA.x, NIVEL_MAR, NAVIO.z + ORIGEM_CRETA.z);
    this.montarPorto();
    this.montarVila();
    this.montarLaseia();
    this.montarCampo();
    for (const m of this.juntador.malhas()) this.grupo.add(m);
    this.porGente();

    this.chegada = this.w(-63, costa(-63) - 5);
    this.ilhota = this.w(ILHOTAS[0][0], ILHOTAS[0][1]);
    this.barcoDeVolta = this.w(-95, costa(-95) - 1.5);
    this.cais = this.w(-43, NAVIO.z - 4);
    this.conves = new THREE.Vector3(this.navio.x, this.navio.y + convesEm(4), this.navio.z + 4);
    const [cx, cd] = CASAS[0];
    this.casaDePaulo = this.w(cx, costa(cx) - cd + 4);
    this.praca = this.w(AGORA.x, AGORA.z + 4);
    this.portaLaseia = this.w(LASEIA.x0 - 4, LASEIA.porta);
    this.farol = this.w(FAROL.x - 6, FAROL.z);
    this.cabana = this.w(CABANA.x, CABANA.z + 5);
    this.prancha = this.w(CAIS.x1 - 0.8, NAVIO.z + PRANCHA_Z);
  }

  // ───────────── o chão ─────────────

  /** As plataformas planas: o chão de cada casa, a praça da vila e o planalto de Laseia (alturas tiradas do terreno). */
  private prepararPlataformas() {
    const plano = (x: number, z: number, mx: number, mz: number, minimo = NIVEL_MAR + 1) =>
      this.plataformas.push({ x, z, mx, mz, h: Math.max(minimo, Math.round(this.bruto(x, z))) });
    plano((LASEIA.x0 + LASEIA.x1) / 2, (LASEIA.z0 + LASEIA.z1) / 2, (LASEIA.x1 - LASEIA.x0) / 2 + 1, (LASEIA.z1 - LASEIA.z0) / 2 + 1);
    for (const [x, d, w, f] of CASAS) plano(x, costa(x) - d + 1, w / 2 + 1.5, f / 2 + 2.5);
    plano(-74, costa(-74) - 21, 5, 3); // a pracinha do forno
    plano(CABANA.x, CABANA.z, 4, 4);
  }

  /** O terreno natural (sem as plataformas): a costa, as colinas, as montanhas, as ilhotas. */
  private bruto(x: number, z: number) {
    const d = costa(x) - z; // quanto se está terra adentro (negativo: no mar)
    const falesia = suave(60, 105, x) + suave(-70, -115, x) * 0.6;
    let h: number;
    if (d >= 0) {
      // a praia sobe devagar; atrás dela, colinas de mato baixo; ao norte, as montanhas (o Ida, ao longe)
      const praia = NIVEL_MAR + 0.4 + Math.min(d, 14) * 0.12;
      const colinas = suave(10, 70, d) * this.ruido.fbm(x * 0.012 + 3, z * 0.012 + 3, 4) * 24;
      const montanhas = suave(70, 160, -z) * (0.55 + 0.45 * this.ruido.fbm(x * 0.02, z * 0.02, 3)) * 36;
      const rocha = falesia * 9 * suave(-0.5, 3.5, d);
      h = praia + colinas + montanhas + rocha + (this.ruido.fbm(x * 0.15, z * 0.15, 2) - 0.5) * 1.2 * suave(8, 20, d);
    } else {
      // o fundo desce da praia para o mar aberto (mais depressa ao pé das falésias), com dunas de areia
      const fundura = Math.min(8, 0.8 + -d * 0.2 * (1 + falesia * 1.5));
      h = NIVEL_MAR - fundura + (this.ruido.fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.4;
    }
    // as ilhotas: rochedos de contorno irregular, com paredões e um topo ondulado, e uma prainha no pé
    for (const [ix, iz, r] of ILHOTAS) {
      const ang = Math.atan2(z - iz, x - ix);
      const ri = r * (0.7 + 0.6 * this.ruido.fbm(Math.cos(ang) * 1.3 + ix, Math.sin(ang) * 1.3 + iz, 3));
      const di = Math.hypot(x - ix, z - iz);
      if (di < ri + 7) {
        const praia = NIVEL_MAR + 0.5 - suave(ri + 1, ri + 7, di) * 4;
        const rocha = di < ri ? NIVEL_MAR + 2.5 + r * 0.55 * suave(0, ri * 0.6, ri - di) + this.ruido.fbm(x * 0.12 + 7, z * 0.12, 3) * 4 : -99;
        h = Math.max(h, praia, rocha);
      }
    }
    return h;
  }

  /** O chão de verdade: o natural com as plataformas, a estrada, o cais e a bacia do porto. */
  private gerar(x: number, z: number): [number, T] {
    let h = this.bruto(x, z);
    let t = T.Natural;
    // a estrada: segue o terreno, sem o detalhe miúdo, e é de terra batida
    const de = distanciaAoCaminho(x, z, ESTRADA);
    if (de < 1.6 && costa(x) - z > 2) t = T.Terra;
    for (const p of this.plataformas) {
      const fora = Math.max(Math.abs(x - p.x) - p.mx, Math.abs(z - p.z) - p.mz);
      const k = 1 - suave(0, 4, fora);
      if (k > 0) h = h + (p.h - h) * k;
      if (fora < 0.5 && p !== this.plataformas[0]) t = T.Terra;
    }
    // Laseia: o chão calçado dentro dos muros
    if (x > LASEIA.x0 && x < LASEIA.x1 && z > LASEIA.z0 && z < LASEIA.z1) t = Math.hypot(x - AGORA.x, z - AGORA.z) < 9 ? T.Calcada : T.Terra;
    // a bacia do porto, dragada para o navio, e o cais de pedra por cima de tudo
    if (x > BACIA.x0 && x < BACIA.x1 && z > BACIA.z0 && z < BACIA.z1) h = Math.min(h, NIVEL_MAR - 3.2);
    if (x > CAIS.x0 && x < CAIS.x1 && z > CAIS.z0 && z < CAIS.z1) {
      h = Math.max(h, NIVEL_MAR + 1);
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
    if (t === T.Calcada) return variar((i + j) % 2 ? 0xcfc2a2 : 0xbfb292, i, h, j, 0.04);
    if (h < NIVEL_MAR) {
      const fundura = NIVEL_MAR - h;
      if (fundura <= 1) return variar(0xdccb94, i, h, j, 0.04);
      if (fundura <= 3) return variar(n > 0.55 ? 0x9aa07a : 0xc4b282, i, h, j, 0.05);
      return variar(n > 0.5 ? 0x5a7a50 : 0x7d8e72, i, h, j, 0.05); // a posidônia, a erva do fundo do Mediterrâneo
    }
    if (t === T.Terra) return variar(n > 0.5 ? 0xb89c6c : 0xa88c60, i, h, j, 0.05);
    const inclinacao = Math.max(
      Math.abs(this.h(i + 1, j) - h), Math.abs(this.h(i - 1, j) - h), Math.abs(this.h(i, j + 1) - h), Math.abs(this.h(i, j - 1) - h),
    );
    if (inclinacao >= 3 || h >= NIVEL_MAR + 34) return variar(n > 0.5 ? 0xd2c9b2 : 0xc2b89e, i, h, j, 0.05); // calcário
    if (h <= NIVEL_MAR + 1 && costa(x) - z < 16) return variar(n > 0.5 ? 0xe8d8a6 : 0xdecb94, i, h, j, 0.04); // areia
    // o mato seco de Creta: tomilho, lentisco e terra clara entre eles
    const mato = n < 0.35 ? 0x8f9a4e : n < 0.55 ? 0xa6a660 : n < 0.68 ? 0x7c8a46 : 0xbcae78;
    return variar(mato, i, h, j, 0.05);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    if (this.tipo[i * TAM + j] === T.Cais) return variar((y + i) % 2 ? 0x9a8c72 : 0xb0a284, i, y, j, 0.05);
    if (y < NIVEL_MAR + 1) return variar(0xc9b888, i, y, j, 0.05);
    return variar(y % 3 === 0 ? 0xb8ad94 : 0xc6bba0, i, y, j, 0.04); // camadas de calcário
  }

  // ───────────── ajudantes (coordenadas locais) ─────────────

  /** Ponto do mundo a partir do local, no chão. */
  private w(lx: number, lz: number, dy = 0) {
    const p = new THREE.Vector3(lx + ORIGEM_CRETA.x, 0, lz + ORIGEM_CRETA.z);
    p.y = this.altura(p.x, p.z) + dy;
    return p;
  }

  private chao(lx: number, lz: number) {
    return this.alturaTerreno(lx + ORIGEM_CRETA.x, lz + ORIGEM_CRETA.z);
  }

  /** Põe um objeto no chão (ou na altura `y`), girado. Malhas de voxel vão para o juntador. */
  private por(o: THREE.Object3D, lx: number, lz: number, rot = 0, y?: number, juntar = true) {
    o.position.set(lx + ORIGEM_CRETA.x, y ?? this.chao(lx, lz), lz + ORIGEM_CRETA.z);
    o.rotation.y = rot;
    if (juntar && o instanceof THREE.Mesh) this.juntador.add(o);
    else this.grupo.add(o);
    return o;
  }

  private caixa(x0: number, z0: number, x1: number, z1: number, topo: number) {
    this.caixas.push({ x0: x0 + ORIGEM_CRETA.x, x1: x1 + ORIGEM_CRETA.x, z0: z0 + ORIGEM_CRETA.z, z1: z1 + ORIGEM_CRETA.z, topo });
  }

  private piso(x0: number, z0: number, x1: number, z1: number, y: (lx: number, lz: number) => number) {
    const ox = ORIGEM_CRETA.x, oz = ORIGEM_CRETA.z;
    this.pisos.push({ x0: x0 + ox, x1: x1 + ox, z0: z0 + oz, z1: z1 + oz, y: (x, z) => y(x - ox, z - oz) });
  }

  private circulo(lx: number, lz: number, r: number) {
    this.circulos.push({ x: lx + ORIGEM_CRETA.x, z: lz + ORIGEM_CRETA.z, r });
  }

  /**
   * Uma casa: o modelo, o terraço em que se anda (com a mureta em volta, que se passa por cima) e a escada de fora.
   * `rot` em múltiplos de 90°.
   */
  private casa(lx: number, lz: number, w: number, f: number, pisos: 1 | 2, caiada: boolean, escada: boolean, parreira: boolean, rot: number, semente: number) {
    const chao = this.chao(lx, lz);
    this.por(casaCretense({ largura: w, fundo: f, pisos, caiada, escada, parreira, semente }), lx, lz, rot, chao);
    const giro = Math.round(rot / (Math.PI / 2)) & 3;
    const largX = giro % 2 ? f : w, largZ = giro % 2 ? w : f;
    const terraco = chao + PISO * pisos + 0.25;
    this.piso(lx - largX / 2, lz - largZ / 2, lx + largX / 2, lz + largZ / 2, (x, z) =>
      Math.abs(x - lx) > largX / 2 - 0.25 || Math.abs(z - lz) > largZ / 2 - 0.25 ? terraco + 0.5 : terraco);
    if (escada && giro === 0) {
      // a escada sobe junto à parede do lado (+x), da frente para o fundo
      const alto = Math.round((PISO * pisos) / 0.25);
      const zFrente = lz + f / 2 - 0.5;
      this.piso(lx + w / 2, zFrente - alto * 0.25, lx + w / 2 + 0.75, zFrente + 0.25, (_x, z) => chao + Math.min(alto, Math.max(1, Math.ceil((zFrente + 0.25 - z) / 0.25))) * 0.25);
    }
    if (parreira && giro === 0) {
      this.circulo(lx - 1 - 0.875, lz + f / 2 + 1.875, 0.2);
      this.circulo(lx + 1.875, lz + f / 2 + 1.875, 0.2);
    }
  }

  // ───────────── Bons Portos ─────────────

  private montarPorto() {
    // o navio atracado, de vela recolhida, com o bote amarrado ao lado
    const navio = navioAlexandrino(false);
    navio.position.copy(this.navio);
    this.grupo.add(navio);
    const b = bote();
    this.por(b, NAVIO.x + 6.3, NAVIO.z - 4, 0.08, NIVEL_MAR - 0.25, false);
    // os postes de amarração na beira do cais, ânforas e sacos esperando o embarque
    for (const z of [-2, 6, 14, 20]) this.por(posteDeAmarracao(), CAIS.x1 - 0.4, z);
    for (let i = 0; i < 6; i++) this.por(anfora(i), CAIS.x0 + 0.6 + (i % 3) * 0.45, -6 + Math.floor(i / 3) * 0.45, i);
    for (let i = 0; i < 5; i++) this.por(sacoDeTrigo(i), CAIS.x0 + 0.8 + (i % 2) * 0.8, 1 + Math.floor(i / 2) * 0.55, i * 0.6);
    this.circulo(CAIS.x0 + 1, -5.6, 0.8);
    this.circulo(CAIS.x0 + 1.2, 1.6, 0.9);
    // a prancha de embarque: do cais à borda do navio, subindo um pouco
    const zp = NAVIO.z + PRANCHA_Z;
    const xBorda = NAVIO.x - meiaLarguraConves(PRANCHA_Z) - 0.3;
    const yCais = NIVEL_MAR + 1, yConves = NIVEL_MAR + convesEm(PRANCHA_Z);
    const prancha = new THREE.Mesh(new THREE.BoxGeometry(xBorda - CAIS.x1 + 0.6, 0.12, 1.1), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    prancha.position.set((CAIS.x1 + xBorda) / 2 + ORIGEM_CRETA.x, (yCais + yConves) / 2 + 0.04, zp + ORIGEM_CRETA.z);
    prancha.rotation.z = Math.atan2(yConves - yCais, xBorda - CAIS.x1);
    prancha.castShadow = prancha.receiveShadow = true;
    this.grupo.add(prancha);
    this.piso(CAIS.x1 - 0.05, zp - 0.55, xBorda + 0.35, zp + 0.55, (x) => yCais + ((x - CAIS.x1) / (xBorda - CAIS.x1)) * (yConves - yCais));
    // os barcos de pesca puxados na areia e o barco que leva de volta à Bahia
    for (const [x, d, r] of [[-62, 4, 0.3], [-70, 5, -0.2], [-80, 4, 0.5]] as const) {
      this.por(barcoDePesca(Math.abs(x)), x, costa(x) - d, r);
      this.circulo(x, costa(x) - d, 1.3);
    }
    this.por(barcoDePesca(2), -95, costa(-95) + 0.5, 0.1, NIVEL_MAR - 0.3);
  }

  private montarVila() {
    CASAS.forEach(([x, d, w, f, pisos, caiada, escada, parreira], n) => this.casa(x, costa(x) - d, w, f, pisos, caiada, escada, parreira, 0, 40 + n));
    // as redes secando na praia, o forno de pão na pracinha
    for (const [x, d] of [[-66, 8], [-84, 8]]) {
      this.por(redeSecando(), x, costa(x) - d, 0.1);
      this.circulo(x - 1.9, costa(x) - d, 0.2);
      this.circulo(x + 1.9, costa(x) - d, 0.2);
    }
    this.por(forno(), -77, costa(-74) - 21);
    this.circulo(-77, costa(-74) - 21, 1);
    // ciprestes e alfarrobeiras entre as casas
    const arvores: [number, number, 'c' | 'a'][] = [[-53, 22, 'c'], [-82, 22, 'a'], [-95, 32, 'c'], [-66, 36, 'a'], [-60, 44, 'c'], [-83, 40, 'c']];
    arvores.forEach(([x, d, k], n) => {
      this.por(k === 'c' ? cipreste(n) : alfarrobeira(n), x, costa(x) - d);
      this.circulo(x, costa(x) - d, k === 'c' ? 0.6 : 0.4);
    });
  }

  // ───────────── Laseia ─────────────

  private montarLaseia() {
    const L = LASEIA;
    const alto = this.plataformas[0].h + 4.5;
    /** Um trecho de muralha de a até b (ao longo de x ou de z). */
    const parede = (xa: number, za: number, xb: number, zb: number) => {
      const comp = Math.hypot(xb - xa, zb - za);
      const m = muralha(comp);
      this.por(m, xa, za, Math.atan2(-(zb - za), xb - xa), this.plataformas[0].h);
      const ex = 0.5;
      this.caixa(Math.min(xa, xb) - ex, Math.min(za, zb) - ex, Math.max(xa, xb) + ex, Math.max(za, zb) + ex, alto);
    };
    parede(L.x0, L.z0, L.x1, L.z0);
    parede(L.x0, L.z1 - 1, L.x1, L.z1 - 1);
    parede(L.x1 - 1, L.z0, L.x1 - 1, L.z1);
    parede(L.x0, L.z0, L.x0, L.porta - 3.5);
    parede(L.x0, L.porta + 3.5, L.x0, L.z1);
    // a porta, com as duas torres
    this.por(portaDaCidade(), L.x0 + 0.5, L.porta, Math.PI / 2, this.plataformas[0].h);
    this.caixa(L.x0 - 1, L.porta - 3.5, L.x0 + 2, L.porta - 1.6, alto + 1.5);
    this.caixa(L.x0 - 1, L.porta + 1.6, L.x0 + 2, L.porta + 3.5, alto + 1.5);
    for (const [x, z, w, f, pisos, rot] of CASAS_LASEIA) this.casa(x, z, w, f, pisos, (x + z) % 2 === 0, false, (x * z) % 3 === 0, rot, x * 7 + z);
    // a praça: a fonte no meio e o pórtico ao norte
    this.por(fonteDaPraca(), AGORA.x, AGORA.z);
    this.caixa(AGORA.x - 1.5, AGORA.z - 1.5, AGORA.x + 1.5, AGORA.z + 1, this.plataformas[0].h + 0.75);
    this.por(portico(16), AGORA.x - 8, AGORA.z - 7);
    this.caixa(AGORA.x - 8, AGORA.z - 9, AGORA.x + 8, AGORA.z - 8.75, this.plataformas[0].h + 4);
    for (let x = AGORA.x - 7.75; x < AGORA.x + 8; x += 2) this.circulo(x, AGORA.z - 6.75, 0.3);
    for (const [x, z] of [[76, 6], [76, 18], [96, 20], [84, 20]]) {
      this.por(cipreste(x + z), x, z);
      this.circulo(x, z, 0.6);
    }
  }

  // ───────────── o campo ─────────────

  private montarCampo() {
    const r = aleatorio(707);
    const livre = (x: number, z: number) => {
      if (costa(x) - z < 6) return false;
      if (distanciaAoCaminho(x, z, ESTRADA) < 3) return false;
      for (const p of this.plataformas) if (Math.abs(x - p.x) < p.mx + 3 && Math.abs(z - p.z) < p.mz + 3) return false;
      return !(x > CAIS.x0 - 4 && x < BACIA.x1 && z > -20);
    };
    // o olival atrás da vila
    for (let i = 0; i < 22; i++) {
      const x = -112 + (i % 6) * 9 + r() * 3, d = 40 + Math.floor(i / 6) * 8 + r() * 3;
      const z = costa(x) - d;
      if (!livre(x, z)) continue;
      this.por(oliveira(i), x, z, r() * 6);
      this.circulo(x, z, 0.45);
    }
    // alfarrobeiras, ciprestes e rochedos espalhados pelas colinas
    for (let i = 0; i < 70; i++) {
      const x = -140 + r() * 270, z = -140 + r() * 160;
      if (!livre(x, z) || this.chao(x, z) > NIVEL_MAR + 30) continue;
      const k = r();
      if (k < 0.3) {
        this.por(alfarrobeira(i), x, z, r() * 6);
        this.circulo(x, z, 0.4);
      } else if (k < 0.5) {
        this.por(cipreste(i), x, z);
        this.circulo(x, z, 0.5);
      } else {
        this.por(rochedo(i), x, z, r() * 6);
        this.circulo(x, z, 1.2);
      }
    }
    // os socalcos de pedra seca na encosta acima da vila
    for (let i = 0; i < 6; i++) {
      const x = -108 + i * 9, z = costa(x) - 56 - (i % 2) * 6;
      this.por(muroSeco(7, i), x, z, 0);
      this.caixa(x, z - 0.1, x + 7, z + 0.6, this.chao(x + 3.5, z) + 0.9);
    }
    // o farol na ponta da falésia, a cabana do pastor e o curral
    this.por(farol(), FAROL.x, FAROL.z);
    this.circulo(FAROL.x, FAROL.z, 1.8);
    this.casa(CABANA.x, CABANA.z, 4, 3.5, 1, false, false, false, 0, 99);
    for (const [x, z, rot] of [[-32, -86, 0], [-32, -86, -Math.PI / 2], [-25, -86, -Math.PI / 2]] as const) {
      this.por(muroSeco(7, x), x, z, rot);
      if (rot === 0) this.caixa(x, z - 0.1, x + 7, z + 0.6, this.chao(x + 3.5, z) + 0.9);
      else this.caixa(x - 0.1, z, x + 0.6, z + 7, this.chao(x, z + 3.5) + 0.9);
    }
  }

  // ───────────── a gente ─────────────

  private porGente() {
    const npc = (def: DefNpc, lx: number, lz: number, rumo: number, y?: number) => {
      const p = new THREE.Vector3(lx + ORIGEM_CRETA.x, 0, lz + ORIGEM_CRETA.z);
      p.y = y ?? this.altura(p.x, p.z);
      const n = new Npc(def, p, rumo);
      this.grupo.add(n.raiz);
      this.npcs.push(n);
      this.circulos.push({ x: p.x, z: p.z, r: 0.4 });
      return n;
    };
    const noConves = (lz: number) => this.navio.y + convesEm(lz);
    // no cais: o centurião, o dono do navio, um marinheiro com a carga e um soldado de guarda
    npc(JULIO, CAIS.x1 - 1.6, NAVIO.z + PRANCHA_Z + 2.2, Math.PI);
    npc(NAUCLERO, CAIS.x0 + 1.5, NAVIO.z + PRANCHA_Z + 4.5, Math.PI * 0.75);
    npc(MARINHEIROS[0], CAIS.x0 + 1.8, -3, Math.PI / 2);
    npc(soldado(1), CAIS.x0 + 2.5, costa(-44) - 1.5, Math.PI);
    // no convés: o piloto junto à cabine e dois marinheiros
    npc(PILOTO, NAVIO.x + 0.8, NAVIO.z + CABINE.z1 + 1.2, 0, noConves(CABINE.z1 + 1.2));
    npc(MARINHEIROS[1], NAVIO.x - 1.6, NAVIO.z + 7, Math.PI / 2, noConves(7));
    npc(MARINHEIROS[2], NAVIO.x + 2, NAVIO.z - 2, -Math.PI / 2, noConves(-2));
    // diante do armazém: os presos e o outro soldado
    const [ax, ad, , af] = CASAS[9];
    const az = costa(ax) - ad + af / 2 + 2;
    npc(PRESOS[0], ax - 1.2, az, 0);
    npc(PRESOS[1], ax + 0.4, az + 0.3, -0.4);
    npc(soldado(2), ax, az - 1.7, 0); // de guarda à porta do armazém
    // diante da casa onde Paulo espera: Lucas, que escreve, e Aristarco
    const [cx, cd, , cf] = CASAS[0];
    const cz = costa(cx) - cd + cf / 2 + 2.6;
    this.lucas = npc(LUCAS, cx + 2.2, cz, -0.3);
    this.aristarco = npc(ARISTARCO, cx - 1.6, cz + 0.2, 0.4);
    // Paulo, lá dentro: só aparece à porta quando alguém bate
    this.paulo = npc(PAULO, cx, cz - 1.6, 0);
    this.portaPaulo.copy(this.paulo.pos);
    this.paulo.raiz.visible = false;
    this.circulos.pop(); // ele anda: não deixa um círculo parado na porta
    // na vila: o velho pescador junto aos barcos e a mulher do forno
    npc(PESCADOR, -71.5, costa(-70) - 6.5, 0.4);
    npc(PADEIRA, -75.5, costa(-74) - 21, -Math.PI / 2);
    // em Laseia: o vendedor, a mulher da fonte, o velho do pórtico e o guarda da porta
    npc(GENTE_DE_LASEIA[0], AGORA.x + 5, AGORA.z + 3, -Math.PI * 0.6);
    npc(GENTE_DE_LASEIA[1], AGORA.x - 1, AGORA.z + 1.8, Math.PI);
    npc(GENTE_DE_LASEIA[2], AGORA.x - 3, AGORA.z - 5.5, 0);
    npc(GENTE_DE_LASEIA[3], LASEIA.x0 + 3, LASEIA.porta - 2.2, -Math.PI / 2);
    // nas encostas do norte: o pastor
    npc(PASTOR, CABANA.x + 3, CABANA.z + 4, 0.6);
  }

  // ───────────── a história de Paulo em Creta ─────────────

  /** Paulo abre a porta da casa (bateram). */
  pauloNaPorta() {
    this.paulo.colocar(this.portaPaulo, 0);
    this.paulo.raiz.visible = true;
  }

  /** Paulo desce ao cais, para o conselho do centurião: pela praia, à frente do armazém, e pelo cais até a prancha. */
  levarPauloAoCais() {
    const [cx] = CASAS[0];
    const pts: [number, number][] = [[cx, -3], [-51, -3], [-46.5, -9.5], [-43, -9.5], [-42.6, 4], [-42.6, NAVIO.z + PRANCHA_Z - 1.6]];
    this.caminhoPaulo = pts.map(([x, z]) => this.w(x, z));
  }

  /** Põe cada um no seu lugar conforme a história (ao carregar o jogo ou depois de um evento). */
  arrumar(tem: (flag: string) => boolean) {
    this.caminhoPaulo = [];
    const [cx, cd, , cf] = CASAS[0];
    const cz = costa(cx) - cd + cf / 2 + 2.6;
    const conves = (lx: number, lz: number) => new THREE.Vector3(this.navio.x + lx, this.navio.y + convesEm(lz), this.navio.z + lz);
    if (tem('creta_conselho')) {
      // decidida a partida, os três esperam a bordo, junto ao mastro
      this.paulo.colocar(conves(-1.2, MASTRO.z - 1.2), Math.PI / 2);
      this.lucas.colocar(conves(1.4, MASTRO.z - 2.4), -Math.PI / 2);
      this.aristarco.colocar(conves(-0.6, MASTRO.z - 3.2), Math.PI / 4);
      this.paulo.raiz.visible = true;
    } else {
      this.lucas.colocar(this.w(cx + 2.2, cz), -0.3);
      this.aristarco.colocar(this.w(cx - 1.6, cz + 0.2), 0.4);
      if (tem('creta_paulo_no_cais')) this.paulo.colocar(this.w(-42.6, NAVIO.z + PRANCHA_Z - 1.6), -Math.PI / 2);
      else this.paulo.colocar(this.portaPaulo, 0);
      this.paulo.raiz.visible = tem('creta_paulo_conheceu');
      if (tem('creta_paulo_conheceu') && !tem('creta_paulo_no_cais')) this.levarPauloAoCais();
    }
  }

  // ───────────── física ─────────────

  /** O chão natural (colunas do terreno). */
  private alturaTerreno(x: number, z: number) {
    const i = Math.floor(x - ORIGEM_CRETA.x + META), j = Math.floor(z - ORIGEM_CRETA.z + META);
    return this.h(i, j);
  }

  /**
   * O navio: o convés onde se anda, a borda falsa (parede), a cabine e o casco, que barra quem nada. A prancha abre
   * a borda do lado do cais. `null` fora do navio.
   */
  private alturaNavio(x: number, z: number): number | null {
    const lx = x - this.navio.x, lz = z - this.navio.z;
    if (Math.abs(lz) >= MEIO_COMPRIMENTO - 0.25) return null;
    const meia = meiaLarguraConves(lz);
    if (Math.abs(lx) > meia + 0.3) return null;
    const conves = this.navio.y + convesEm(lz);
    if (Math.abs(lx) > meia) {
      if (lx < 0 && Math.abs(lz - PRANCHA_Z) < 0.55) return conves; // a abertura da prancha
      return this.navio.y + bordaEm(lz) + BORDA_PAREDE;
    }
    if (lx > CABINE.x0 && lx < CABINE.x1 && lz > CABINE.z0 && lz < CABINE.z1) return conves + CABINE.altura + 0.7;
    if (lz > 3.5 && lz < 6.5 && Math.abs(lx) < 1.5) return conves + 0.25; // a escotilha com a tampa
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
    for (const c of [...this.circulos, { x: mx, z: mz, r: 0.35 }]) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + raio;
      if (d >= min || d < 1e-6) continue;
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }

  /** O mar, com as ondas (na terra seca a água fica abaixo do chão e não conta). */
  nivelAgua(x: number, z: number) {
    return this.oceano.altura(x, z);
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.oceano.atualizar(dt, jogador);
    if (this.caminhoPaulo.length) {
      const chao = (x: number, z: number) => this.altura(x, z);
      if (this.paulo.andarPara(this.caminhoPaulo[0], dt, chao, 1.6)) {
        this.caminhoPaulo.shift();
        if (!this.caminhoPaulo.length) {
          this.paulo.colocar(this.paulo.pos, -Math.PI / 2);
          this.aoChegarPaulo?.();
        }
      }
    }
    for (const n of this.npcs) if (n !== this.paulo || !this.caminhoPaulo.length) n.atualizar(dt, jogador);
  }

  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + ORIGEM_CRETA.x, lz + ORIGEM_CRETA.z];
    return [
      { especie: 'cabra', quantidade: 6, centro: c(CABANA.x - 3, CABANA.z + 10), raio: 14 },
      { especie: 'lagartixa', quantidade: 8, centro: c(10, -40), raio: 60 },
      { especie: 'gato', quantidade: 3, centro: c(-70, costa(-70) - 18), raio: 10 },
      { especie: 'cao', quantidade: 1, centro: c(CABANA.x + 2, CABANA.z + 6), raio: 5 },
      { especie: 'jumento', quantidade: 1, centro: c(-84, costa(-84) - 22), raio: 4 },
      { especie: 'galinha', quantidade: 4, centro: c(AGORA.x - 8, AGORA.z + 12), raio: 4 },
      { especie: 'aguia', quantidade: 1, centro: c(0, -60), raio: 60 },
    ];
  }

  /** No mundo aberto, o mar (e a chuva) da área só aparece com o peregrino dentro dela: de fora, vê-se o mar do mundo. */
  private readonly aoRedor = new THREE.Group();
  presente(sim: boolean) {
    this.aoRedor.visible = sim;
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_CRETA.x - META, z0: ORIGEM_CRETA.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        if (this.alturaNavio(x, z) !== null) return 0x7a5636;
        for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1 && p.x1 - p.x0 > 2) return 0xe6dcc4;
        const i = Math.floor(x - ORIGEM_CRETA.x + META), j = Math.floor(z - ORIGEM_CRETA.z + META);
        const h = this.h(i, j);
        if (h < NIVEL_MAR) return NIVEL_MAR - h <= 1.5 ? 0x6fc4cc : NIVEL_MAR - h <= 4 ? 0x3c9cb0 : 0x1f6f8a;
        return this.corTopo(i, j, h);
      },
    };
  }
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
