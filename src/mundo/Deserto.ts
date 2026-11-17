import * as THREE from 'three';
import type { Povoamento } from '../fauna/Fauna';
import { Ruido, aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';
import { materialVoxel } from '../voxel/Malha';
import { carregarVox, geometriaVox } from '../voxel/Vox';
import { Sombra } from '../entidades/Sombra';
import { ANTAO } from '../entidades/Antao';
import { Npc } from '../entidades/Npc';
import { Area } from './Area';
import { construirCruzeiro, construirPlaca } from './Cenario';
import { malhaDeColunas } from './Terreno';
import type { FonteMapa } from '../ui/Minimapa';
import { escurecer } from './PocoMeioDia';
import { CapelaRegional, type EstiloCapela } from './Capela';
import type { DefNpc } from '../entidades/Npc';
import { ORIGENS } from './aberto/Geografia';

/**
 * O Deserto das Vozes (segunda região). Fica longe do Vale (em ORIGEM) e é uma área separada,
 * como a cripta. Um rastro de marcos de pedra leva da passagem leste até a caverna de Santo Antão;
 * no caminho, miragens bonitas sussurram tentações e escondem sombras. O dom da Ciência (E)
 * mostra o que elas são e desfaz a parede falsa do desfiladeiro a oeste.
 */

const TAM = 160;
const META = TAM / 2;
export const ORIGEM_DESERTO = ORIGENS.deserto;
/** Sombras do deserto que devolvem a cor (4 escondidas nas miragens + 2 à vista). */
export const TOTAL_SOMBRAS_DESERTO = 6;

/** Rastro (coordenadas locais) da passagem leste até a caverna. */
const RASTRO: [number, number][] = [
  [72, 0], [52, -2], [36, -6], [22, -6], [15, -6], [6, -9], [-6, -15], [-18, -22], [-28, -27], [-36, -32],
];
const POCO = new THREE.Vector2(15, -6);
const CAVERNA = { boca: new THREE.Vector2(-39, -35), centro: new THREE.Vector2(-50, -45), rx: 16, rz: 14 };
const MESAS: [number, number, number, number, number][] = [
  // x, z, raio x, raio z, altura
  [-50, -45, 16, 14, 12], [22, -40, 9, 8, 9], [40, 38, 8, 10, 8], [-12, 47, 11, 8, 10], [56, -44, 6, 6, 7], [-46, 12, 6, 7, 8],
];
/** Estrada velha ao sul, que sobe para a Cidade Dourada (x local do corredor). */
const X_SUL = 14;
/** Fenda no penhasco oeste (fechada pela parede falsa). */
const FENDA = { z: 30, parede: -58.5, fim: -76 };

/**
 * A capela do deserto (centro, coordenadas locais), ao norte do poço, com a porta para o rastro. Tem 9 × 14 m;
 * o terreno em volta é aplanado e uma trilha liga o adro ao rastro.
 */
const CAPELA_DESERTO = new THREE.Vector2(30, -25);
const PORTA_CAPELA_Z = CAPELA_DESERTO.y + 8.5;

/**
 * A capela dos mosteiros do deserto do Egito (o de Santo Antão, no Mar Vermelho): adobe caiado, terraço com
 * cúpulas brancas, piso de terracota, tapete de lã tingida e vidros cor de âmbar e turquesa.
 */
const ESTILO_DESERTO: EstiloCapela = {
  reboco: 0xeadcc0,
  pedra: 0xc2996a,
  telha: 0xd8c8a8,
  cumeeira: 0xb8a078,
  madeira: 0x8e6238,
  madeiraEscura: 0x5a3a1e,
  pisoA: 0xc88e5a,
  pisoB: 0xb07648,
  marmore: 0xeee2c8,
  tapete: 0x8a2a1e,
  vitral: [0x2a8a9a, 0xb83a2a, 0xe0a83a, 0x3a9a7a, 0x2a4a9a],
  flores: [0xd83a8a, 0xf2d24a, 0xffffff],
  cobertura: 'cupulas',
  cal: 0xf6f0e4,
};

/**
 * O monge-sacerdote que confessa na capela do deserto: hábito negro com capuz, como os monges do Egito,
 * barba longa e branca e o livro das orações.
 */
const MONGE: DefNpc = {
  id: 'monge_deserto',
  falante: 'monge',
  no: 'capela_confissao',
  visual: { genero: 'm', idade: 'idoso', pele: 0xc08a60, penteado: 'capuz', corCabelo: 0xe8e4dc, barba: 'longa', traje: 'habito', cor: 0x1e1a1c, cor2: 0x2a2226, acessorio: 'livro' },
};

type TipoMiragem = 'oasis' | 'ouro' | 'banquete' | 'casa';
const MIRAGENS: { tipo: TipoMiragem; x: number; z: number; falas: string[] }[] = [
  { tipo: 'oasis', x: 34, z: 20, falas: ['Pare aqui. Descanse… para que continuar?', 'Água fresca, sombra. Ninguém vai cobrar nada.', 'O caminho é longo demais. Fique.'] },
  { tipo: 'ouro', x: 3, z: 24, falas: ['Isto é seu. Pegue.', 'Com este ouro, ninguém nunca mais vai te dizer não.', 'Só um pouco. Ninguém vai ver.'] },
  { tipo: 'banquete', x: -24, z: 4, falas: ['Você merece. Coma, beba.', 'Esqueça o jejum. Amanhã você reza.', 'Sente-se. A mesa está posta só para você.'] },
  { tipo: 'casa', x: -12, z: -40, falas: ['Volte para casa. Lá era tão mais fácil.', 'Este deserto não leva a lugar nenhum.', 'Sua família sente sua falta. Volte.'] },
];
const SOMBRAS_SOLTAS: [number, number][] = [[42, -12], [-10, -24]];

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function distSegmento(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function distRastro(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < RASTRO.length - 1; i++) d = Math.min(d, distSegmento(x, z, ...RASTRO[i], ...RASTRO[i + 1]));
  return d;
}

// ───────────────────────────── modelos (arte por código) ─────────────────────────────

/** Tamareira: tronco anelado e levemente inclinado, folhas caídas e cachos de tâmaras. */
function palmeira(semente: number, material: THREE.Material = materialVoxel) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const alt = 20 + Math.floor(rnd() * 6);
  const inc = (rnd() - 0.5) * 0.25;
  for (let y = 0; y < alt; y++) {
    const ox = Math.round(inc * y * y * 0.05);
    m.caixa(ox, y, 0, 2, 1, 2, y % 3 === 0 ? 0x6e5232 : 0x8a6a42);
  }
  const tx = Math.round(inc * alt * alt * 0.05);
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * Math.PI * 2 + rnd();
    for (let t = 0; t < 11; t++) {
      const x = tx + Math.round(Math.cos(a) * t), z = Math.round(Math.sin(a) * t);
      const y = alt + 1 - Math.round(t * t * 0.05);
      m.ponto(x, y, z, t % 2 ? 0x4f8a3a : 0x3f7a30).ponto(x + 1, y, z, 0x467f34);
    }
  }
  m.caixa(tx - 1, alt - 2, 0, 1, 2, 1, 0xb8692a).caixa(tx + 2, alt - 2, 1, 1, 2, 1, 0xa85a22);
  return m.malha(0.2, [1, 0, 1], material);
}

/** Marco de pedras empilhadas (o rastro dos peregrinos). */
function marco(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0x9a8a74, x, y, z, 0.08);
  let y = 0;
  for (let n = 4; n >= 1; n--) {
    const off = Math.round((rnd() - 0.5) * 2);
    m.caixa(-n + off, y, -n, n * 2, 2, n * 2, pedra);
    y += 2;
  }
  return m.malha(0.15, [0, 0, 0]);
}

/** Pedregulho de arenito. */
function pedregulho(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const r = 3 + rnd() * 3;
  for (let x = -6; x <= 6; x++)
    for (let y = 0; y <= 6; y++)
      for (let z = -6; z <= 6; z++) {
        const e = (x * x) / (r * r) + (y * y) / (r * r * 0.55) + (z * z) / (r * r * 0.8);
        if (e <= 1 + Math.sin(x * 1.7 + z) * 0.15) m.ponto(x, y, z, variar(y > 3 ? 0xc48a58 : 0xa86a40, x, y, z, 0.07));
      }
  return m.malha(0.25, [0, 0, 0]);
}

/** Arbusto seco. */
function arbusto(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  for (let g = 0; g < 7; g++) {
    let x = 0, z = 0;
    const dx = rnd() - 0.5, dz = rnd() - 0.5;
    for (let y = 0; y < 5; y++) {
      x += dx * 1.4;
      z += dz * 1.4;
      m.ponto(Math.round(x), y, Math.round(z), y > 2 ? 0x8a7a4a : 0x6e5a36);
    }
  }
  return m.malha(0.15, [0, 0, 0]);
}

/** Poço de pedra com trave e balde. */
function poco() {
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0xa59a88, x, y, z, 0.07);
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 6; z++) {
      const d = Math.hypot(x, z);
      if (d <= 6 && d > 4) m.caixa(x, 0, z, 1, 5, 1, pedra);
      else if (d <= 4) m.ponto(x, 0, z, 0x1f3a52);
    }
  const madeira = (x: number, y: number, z: number) => variar(0x6e4a2a, x, y, z, 0.05);
  m.caixa(-6, 5, 0, 1, 9, 1, madeira).caixa(6, 5, 0, 1, 9, 1, madeira).caixa(-6, 13, 0, 13, 1, 1, madeira);
  m.caixa(0, 8, 0, 1, 5, 1, 0xc9b48a).caixa(-1, 6, -1, 3, 2, 3, madeira);
  return m.malha(0.2, [0.5, 0, 0.5]);
}

/** Parede de arenito do desfiladeiro (a falsa usa um material próprio, para se desfazer). */
function paredeFalsa(material: THREE.Material) {
  const m = new Modelo();
  const faixas = [0xb8794a, 0xa86a40, 0xc99360, 0x9a5e3a];
  for (let z = 0; z < 16; z++)
    for (let y = 0; y < 34; y++) {
      if (y > 28 && Math.sin(z * 1.9) * 3 + 30 < y) continue;
      m.caixa(0, y, z, 3, 1, 1, variar(faixas[Math.floor(y / 3) % 4], 0, y, z, 0.06));
    }
  return m.malha(0.5, [1.5, 0, 8], material);
}

/** O que cada miragem mostra: tudo bonito demais, um pouco brilhante. */
function modeloMiragem(tipo: TipoMiragem, mat: THREE.MeshLambertMaterial) {
  const g = new THREE.Group();
  const m = new Modelo();
  if (tipo === 'oasis') {
    for (let x = -18; x <= 18; x++)
      for (let z = -18; z <= 18; z++) {
        const d = Math.hypot(x, z);
        if (d < 18 && d > 12) m.ponto(x, 0, z, variar(d < 15 ? 0x5fae46 : 0x78b850, x, 0, z, 0.06));
        if (d <= 12) m.ponto(x, 0, z, 0x3c9ad6);
      }
    for (const [x, z] of [[14, 6], [-15, 3], [4, -16], [9, 13]]) m.ponto(x, 1, z, 0xf06a8a).ponto(x + 1, 1, z, 0xffe070);
    const base = m.malha(0.25, [0, 0, 0], mat);
    g.add(base);
    for (const [i, x, z] of [[1, 3.6, -2], [2, -3.4, 2.2], [3, 0.8, 3.8]]) {
      const p = palmeira(900 + i, mat);
      p.position.set(x, 0, z);
      g.add(p);
    }
    return g;
  }
  if (tipo === 'ouro') {
    const ouro = [0xf2c94c, 0xe0b03a, 0xffe08a, 0xd49a26];
    for (let y = 0; y < 6; y++)
      for (let x = -7; x <= 7; x++)
        for (let z = -7; z <= 7; z++)
          if (Math.hypot(x, z) <= 7 - y * 1.1) m.ponto(x, y, z, ouro[Math.abs(x * 3 + y * 5 + z * 7) % 4]);
    m.ponto(2, 5, 1, 0xd8203a).ponto(-3, 3, 4, 0x2ab86a).ponto(4, 2, -4, 0x3a6ad8);
    // baú aberto
    const madeira = (x: number, y: number, z: number) => variar(0x7a4a26, x, y, z, 0.05);
    m.caixa(8, 0, -3, 8, 5, 6, madeira).caixa(9, 5, -2, 6, 1, 4, 0xffe08a).caixa(8, 5, 3, 8, 6, 1, madeira);
    m.caixa(8, 2, -3, 8, 1, 1, 0xe0b03a).caixa(11, 1, -4, 2, 2, 1, 0xe0b03a);
    g.add(m.malha(0.2, [0, 0, 0], mat));
    return g;
  }
  if (tipo === 'banquete') {
    const madeira = (x: number, y: number, z: number) => variar(0x6e4a2a, x, y, z, 0.05);
    for (const [x, z] of [[-10, -4], [9, -4], [-10, 3], [9, 3]]) m.caixa(x, 0, z, 1, 5, 1, madeira);
    m.caixa(-11, 5, -5, 22, 1, 10, 0xf4ede0).caixa(-11, 4, -5, 22, 1, 1, 0xb8303a).caixa(-11, 4, 4, 22, 1, 1, 0xb8303a);
    m.caixa(-8, 6, -2, 4, 2, 3, 0xc08040).caixa(-2, 6, 1, 3, 2, 2, 0xb07038); // pães
    for (const [x, z] of [[3, -3], [4, -2], [3, -2], [4, -3]]) m.ponto(x, 6, z, 0x6a2a7a).ponto(x, 7, z, 0x7a3a8a); // uvas
    m.caixa(7, 6, -1, 1, 3, 1, 0xf2c94c).caixa(6, 9, -2, 3, 1, 3, 0xf2c94c); // cálice
    m.caixa(-5, 6, 2, 2, 4, 2, 0xc06040).ponto(-5, 10, 2, 0xc06040); // jarro
    for (const x of [-7, 0, 6]) m.caixa(x, 0, 7, 3, 3, 3, madeira).caixa(x, 0, -10, 3, 3, 3, madeira); // bancos
    g.add(m.malha(0.2, [0, 0, 0], mat));
    return g;
  }
  // casa: a saudade do que ficou para trás
  const cal = (x: number, y: number, z: number) => variar(0xeadfcc, x, y, z, 0.03);
  m.caixa(-10, 0, 0, 20, 14, 2, cal);
  for (let k = 0; k < 6; k++) m.caixa(-11 + k, 14 + k, -1, 22 - k * 2, 1, 4, variar(0xb0563a, k, 0, 0, 0.05));
  m.caixa(-3, 0, 1, 6, 9, 2, 0xffd890).caixa(-3, 0, 2, 6, 9, 1, null); // porta aberta, luz quente
  m.caixa(-3, 0, 2, 1, 9, 1, 0x6b4a2e).caixa(2, 0, 2, 1, 9, 1, 0x6b4a2e).caixa(-3, 9, 2, 6, 1, 1, 0x6b4a2e);
  m.caixa(5, 6, 1, 4, 4, 2, 0xffd890).caixa(5, 6, 2, 4, 1, 1, 0x6b4a2e).caixa(6, 7, 2, 1, 3, 1, 0x6b4a2e);
  m.caixa(-9, 0, 2, 2, 3, 2, 0x9a5a3a).ponto(-8, 3, 2, 0xe84a6a).ponto(-9, 3, 3, 0x4fae46); // vaso
  g.add(m.malha(0.25, [0, 0, 1], mat));
  return g;
}

// ───────────────────────────── miragem ─────────────────────────────

class Miragem {
  readonly grupo: THREE.Group;
  readonly material: THREE.MeshLambertMaterial;
  readonly sombra: Sombra;
  /** -1 = intacta; 0..1 = desfazendo; 1 = acabou. */
  desfeita = -1;
  private t = Math.random() * 10;
  private fala = 0;
  constructor(readonly pos: THREE.Vector3, readonly tipo: TipoMiragem, readonly falas: string[], id: string) {
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92, emissive: 0x3a2a10 });
    this.grupo = modeloMiragem(tipo, this.material);
    this.grupo.position.copy(pos);
    this.grupo.rotation.y = Math.random() * Math.PI * 2;
    this.sombra = new Sombra(id, pos.clone(), { visao: 16 });
  }

  get intacta() {
    return this.desfeita < 0;
  }

  proximaFala() {
    return this.falas[this.fala++ % this.falas.length];
  }

  /** Tremula como ar quente; ao se desfazer, encolhe, escurece e some. */
  atualizar(dt: number) {
    this.t += dt;
    if (this.desfeita < 0) {
      this.grupo.scale.set(1 + Math.sin(this.t * 3.1) * 0.025, 1 + Math.sin(this.t * 2.3) * 0.05, 1);
      this.grupo.position.y = this.pos.y + Math.sin(this.t * 1.7) * 0.08;
      this.material.opacity = 0.82 + Math.sin(this.t * 2.6) * 0.1;
    } else if (this.desfeita < 1) {
      this.desfeita = Math.min(1, this.desfeita + dt / 1.3);
      const k = this.desfeita;
      this.grupo.scale.set(1 + k * 0.6, Math.max(0.02, 1 - k), 1 + k * 0.6);
      this.material.opacity = 0.9 * (1 - k);
      this.material.emissive.setRGB(0.25 * (1 - k), 0.05, 0.35 * (1 - k));
      if (k >= 1) this.grupo.visible = false;
    }
  }
}

// ───────────────────────────── área ─────────────────────────────

export interface EventosDeserto {
  /** Uma miragem sussurrou (texto em itálico na tela). */
  sussurro(texto: string): void;
  /** Uma miragem se desfez e a sombra dela apareceu. `porCiencia` = vista de longe com o dom. */
  miragemDesfeita(porCiencia: boolean): void;
}

export class Deserto implements Area {
  readonly id = 'deserto' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  private alturas = new Int16Array(TAM * TAM);
  private tipo = new Uint8Array(TAM * TAM); // 0 areia, 1 rastro, 2 rocha, 3 capim do poço
  private ruido = new Ruido(1987);
  private circulos: { x: number; z: number; r: number }[] = [];
  private caixas: { x0: number; x1: number; z0: number; z1: number; topo: number }[] = [];
  private miragens: Miragem[] = [];
  private grupoMiragens = new THREE.Group();
  private tempoSussurro = 0;
  private t = 0;

  readonly chegada: THREE.Vector3;
  readonly saida: THREE.Vector3;
  readonly poco: THREE.Vector3;
  readonly cruz: THREE.Vector3;
  readonly fogo: THREE.Vector3;
  readonly caverna: THREE.Vector3;
  readonly antao: Npc;
  /** A capela do deserto, com o monge que confessa. */
  readonly capela: CapelaRegional;
  readonly parede: THREE.Vector3;
  readonly fimFenda: THREE.Vector3;
  /** Fim do corredor do sul: a estrada para a Cidade Dourada. */
  readonly estradaSul: THREE.Vector3;
  readonly luzFogo = new THREE.PointLight(0xff9a40, 6, 9, 1.5);
  private malhaParede: THREE.Mesh;
  private matParede: THREE.MeshLambertMaterial;
  private caixaParede: { x0: number; x1: number; z0: number; z1: number; topo: number };
  /** -1 = de pé; 0..1 = desfazendo. */
  private desfazendoParede = -1;
  private poeira: THREE.Points;

  constructor(private eventos: EventosDeserto) {
    this.gerarAlturas();
    const terreno = malhaDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 40);
    terreno.position.copy(ORIGEM_DESERTO);
    this.grupo.add(terreno, this.grupoMiragens);

    const w = (lx: number, lz: number, dy = 0) => new THREE.Vector3(lx + ORIGEM_DESERTO.x, 0, lz + ORIGEM_DESERTO.z).setY(this.altura(lx + ORIGEM_DESERTO.x, lz + ORIGEM_DESERTO.z) + dy);
    this.chegada = w(62, 0);
    this.saida = w(70, 0);
    this.poco = w(POCO.x, POCO.y);
    this.cruz = w(POCO.x + 3, POCO.y - 3.5);
    this.fogo = w(-34.5, -35.5);
    this.caverna = w(CAVERNA.boca.x, CAVERNA.boca.y);
    this.parede = w(FENDA.parede, FENDA.z);
    this.fimFenda = w(FENDA.fim + 3, FENDA.z + 1.6);
    this.estradaSul = w(X_SUL, 72);

    // poço, cruz de pedra e tamareiras
    const p = poco();
    p.position.copy(this.poco);
    const c = construirCruzeiro();
    c.position.copy(this.cruz);
    this.grupo.add(p, c);
    this.circulos.push({ x: this.poco.x, z: this.poco.z, r: 1.35 }, { x: this.cruz.x, z: this.cruz.z, r: 0.85 });
    for (const [i, dx, dz] of [[1, -3.5, 3], [2, 4, 3.5], [3, -2.5, -4.5], [4, 6.5, -1]]) {
      const palma = palmeira(i);
      palma.position.copy(w(POCO.x + dx, POCO.y + dz));
      this.grupo.add(palma);
      this.circulos.push({ x: palma.position.x, z: palma.position.z, r: 0.35 });
    }

    // a capela do deserto, com o monge no confessionário (o chão já foi aplanado em gerarAlturas)
    const hc = this.altura(CAPELA_DESERTO.x + ORIGEM_DESERTO.x, CAPELA_DESERTO.y + ORIGEM_DESERTO.z);
    this.capela = new CapelaRegional(ESTILO_DESERTO, CAPELA_DESERTO.x + ORIGEM_DESERTO.x, CAPELA_DESERTO.y + ORIGEM_DESERTO.z, hc, MONGE);
    this.grupo.add(this.capela.grupo);
    this.caixas.push(...this.capela.caixas);
    // duas tamareiras no adro
    for (const [i, dx] of [[7, -6.5], [8, 6.2]]) {
      const palma = palmeira(i);
      palma.position.copy(w(CAPELA_DESERTO.x + dx, PORTA_CAPELA_Z - 0.5));
      this.grupo.add(palma);
      this.circulos.push({ x: palma.position.x, z: palma.position.z, r: 0.35 });
    }

    // Santo Antão, na boca da caverna, e o fogo dele
    const pa = w(-36.2, -31.8);
    this.antao = new Npc(ANTAO, pa, Math.PI / 4);
    this.grupo.add(this.antao.raiz);
    this.circulos.push({ x: pa.x, z: pa.z, r: 0.5 });
    this.luzFogo.position.copy(this.fogo).add(new THREE.Vector3(0, 1, 0));
    this.grupo.add(this.luzFogo);
    this.circulos.push({ x: this.fogo.x, z: this.fogo.z, r: 0.7 });
    // fundo escuro da caverna
    const dir = new THREE.Vector2().subVectors(CAVERNA.centro, CAVERNA.boca).normalize();
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 6), new THREE.MeshBasicMaterial({ color: 0x0e0906 }));
    const fl = CAVERNA.boca.clone().addScaledVector(dir, 5.6);
    fundo.position.copy(w(fl.x, fl.y, 3));
    fundo.rotation.y = Math.atan2(-dir.x, -dir.y);
    this.grupo.add(fundo);

    // rastro de marcos de pedra
    let k = 0;
    for (let i = 1; i < RASTRO.length - 1; i++) {
      const [ax, az] = RASTRO[i], [bx, bz] = RASTRO[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 9));
      for (let s = 0; s < n; s++) {
        const t = s / n;
        const lado = k % 2 ? 2.6 : -2.6;
        const nx = -(bz - az), nz = bx - ax, nl = Math.hypot(nx, nz);
        const m = marco(50 + k++);
        m.position.copy(w(ax + (bx - ax) * t + (nx / nl) * lado, az + (bz - az) * t + (nz / nl) * lado));
        this.grupo.add(m);
        this.circulos.push({ x: m.position.x, z: m.position.z, r: 0.45 });
      }
    }

    // placas: na chegada (de volta ao Vale) e no fim da fenda
    const placaLeste = construirPlaca();
    placaLeste.position.copy(w(66, 2.6));
    placaLeste.rotation.y = -Math.PI / 2;
    const placaFenda = construirPlaca();
    placaFenda.position.copy(this.fimFenda);
    placaFenda.rotation.y = Math.PI / 2;
    const placaSul = construirPlaca();
    placaSul.position.copy(w(X_SUL + 2.4, 70));
    this.grupo.add(placaLeste, placaFenda, placaSul);

    // parede falsa na fenda do oeste
    this.matParede = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 });
    this.malhaParede = paredeFalsa(this.matParede);
    this.malhaParede.position.copy(w(FENDA.parede, FENDA.z));
    this.malhaParede.position.y = this.parede.y;
    this.grupo.add(this.malhaParede);
    this.caixaParede = { x0: this.parede.x - 0.8, x1: this.parede.x + 0.8, z0: this.parede.z - 4, z1: this.parede.z + 4, topo: this.parede.y + 20 };
    this.caixas.push(this.caixaParede);

    // pedregulhos e arbustos secos espalhados
    const rnd = aleatorio(31);
    for (let n = 0; n < 140; n++) {
      const lx = (rnd() - 0.5) * 116, lz = (rnd() - 0.5) * 116;
      if (distRastro(lx, lz) < 5 || Math.hypot(lx - POCO.x, lz - POCO.y) < 9) continue;
      if (Math.abs(lx - CAPELA_DESERTO.x) < 10 && lz > CAPELA_DESERTO.y - 11 && lz < -5) continue; // a capela e a trilha
      if (MIRAGENS.some((mi) => Math.hypot(lx - mi.x, lz - mi.z) < 8)) continue;
      if (this.tipoEm(lx, lz) === 2) continue;
      const big = rnd() < 0.3;
      const obj = big ? pedregulho(200 + n) : arbusto(400 + n);
      obj.position.copy(w(lx, lz));
      obj.rotation.y = rnd() * Math.PI * 2;
      this.grupo.add(obj);
      if (big) this.circulos.push({ x: obj.position.x, z: obj.position.z, r: 1.1 });
    }

    // grãos de areia no vento
    const n = 500;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = (rnd() - 0.5) * 60;
      pts[i * 3 + 1] = rnd() * 6;
      pts[i * 3 + 2] = (rnd() - 0.5) * 60;
    }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.poeira = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0xf0dcb0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
    this.poeira.frustumCulled = false;
    this.grupo.add(this.poeira);
  }

  /** A fogueira do Veloren, junto de Santo Antão. */
  async povoar() {
    const g = geometriaVox(await carregarVox('assets/veloren/objetos/fogueira.vox'), { escala: 1 / 11 });
    const f = new THREE.Mesh(g, materialVoxel);
    f.position.copy(this.fogo);
    f.castShadow = true;
    this.grupo.add(f);
  }

  /** Recoloca miragens, sombras e a parede conforme o save. */
  reiniciar(sombrasVencidas: Set<string>, flags: Set<string>) {
    for (const s of this.sombras) this.grupo.remove(s.raiz);
    this.sombras.length = 0;
    this.grupoMiragens.clear();
    this.miragens = [];
    MIRAGENS.forEach((mi, i) => {
      const id = `deserto_miragem_${i + 1}`;
      if (sombrasVencidas.has(id)) return;
      const p = new THREE.Vector3(mi.x + ORIGEM_DESERTO.x, 0, mi.z + ORIGEM_DESERTO.z);
      p.y = this.altura(p.x, p.z);
      const m = new Miragem(p, mi.tipo, mi.falas, id);
      this.miragens.push(m);
      this.grupoMiragens.add(m.grupo);
    });
    SOMBRAS_SOLTAS.forEach(([x, z], i) => {
      const id = `deserto_sombra_${i + 1}`;
      if (sombrasVencidas.has(id)) return;
      const p = new THREE.Vector3(x + ORIGEM_DESERTO.x, 0, z + ORIGEM_DESERTO.z);
      p.y = this.altura(p.x, p.z);
      const s = new Sombra(id, p);
      this.sombras.push(s);
      this.grupo.add(s.raiz);
    });
    // parede
    const aberta = flags.has('deserto_parede');
    this.desfazendoParede = aberta ? 1 : -1;
    this.malhaParede.visible = !aberta;
    this.matParede.opacity = 1;
    this.malhaParede.scale.set(1, 1, 1);
    const i = this.caixas.indexOf(this.caixaParede);
    if (aberta && i >= 0) this.caixas.splice(i, 1);
    if (!aberta && i < 0) this.caixas.push(this.caixaParede);
  }

  get paredeAberta() {
    return this.desfazendoParede >= 0;
  }

  get miragensRestantes() {
    return this.miragens.filter((m) => m.intacta).length;
  }

  /** O dom da Ciência, em volta de `p`: desfaz as miragens e a parede falsa. Devolve o que revelou. */
  revelar(p: THREE.Vector3, raio: number) {
    let miragens = 0;
    for (const m of this.miragens)
      if (m.intacta && m.pos.distanceTo(p) < raio) {
        this.desfazer(m, true);
        miragens++;
      }
    let parede = false;
    if (!this.paredeAberta && this.parede.distanceTo(p) < raio * 0.6) {
      this.desfazendoParede = 0;
      this.caixas.splice(this.caixas.indexOf(this.caixaParede), 1);
      parede = true;
    }
    return { miragens, parede };
  }

  private desfazer(m: Miragem, porCiencia: boolean) {
    m.desfeita = 0;
    setTimeout(() => {
      this.sombras.push(m.sombra);
      this.grupo.add(m.sombra.raiz);
      m.sombra.acordar();
    }, 500);
    this.eventos.miragemDesfeita(porCiencia);
  }

  /** A história do deserto ainda não chegou: as miragens não sussurram nem se desfazem. */
  private dormindo = false;
  dormir(sim: boolean) {
    this.dormindo = sim;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.antao.atualizar(dt, jogador);
    this.capela.atualizar(dt, jogador);
    this.luzFogo.intensity = 5 + Math.sin(this.t * 13) * 1 + Math.sin(this.t * 31) * 0.6;
    // miragens: sussurram de longe; de perto, se desfazem e mostram a sombra
    let perto: Miragem | null = null;
    let dm = Infinity;
    for (const m of this.dormindo ? [] : this.miragens) {
      m.atualizar(dt);
      if (!m.intacta) continue;
      const d = m.pos.distanceTo(jogador);
      if (d < 5) this.desfazer(m, false);
      else if (d < 18 && d < dm) {
        dm = d;
        perto = m;
      }
    }
    this.tempoSussurro -= dt;
    if (perto && this.tempoSussurro <= 0) {
      this.tempoSussurro = 5.5;
      this.eventos.sussurro(perto.proximaFala());
    }
    // parede falsa se desfazendo
    if (this.desfazendoParede >= 0 && this.desfazendoParede < 1) {
      this.desfazendoParede = Math.min(1, this.desfazendoParede + dt / 1.8);
      const k = this.desfazendoParede;
      this.malhaParede.scale.set(1 + k * 0.5, 1 - k * 0.6, 1 + k * 0.3);
      this.matParede.opacity = 1 - k;
      this.matParede.emissive.setRGB(k * 0.4, k * 0.35, k * 0.6);
      if (k >= 1) this.malhaParede.visible = false;
    }
    // a areia no vento acompanha o peregrino
    this.poeira.position.set(jogador.x, jogador.y, jogador.z);
    const pos = this.poeira.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) - dt * (3 + (i % 5));
      if (x < -30) x += 60;
      pos.setX(i, x);
      pos.setY(i, (pos.getY(i) + Math.sin(this.t * 2 + i) * dt * 0.3 + 6) % 6);
    }
    pos.needsUpdate = true;
  }

  // ───────────────────────────── terreno ─────────────────────────────

  private tipoEm(lx: number, lz: number) {
    const i = Math.floor(lx + META), j = Math.floor(lz + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 2;
    return this.tipo[i * TAM + j];
  }

  private chao(x: number, z: number) {
    return 6 + (this.ruido.fbm(x * 0.015 + 3, z * 0.015 + 3, 3) - 0.5) * 3;
  }

  private gerarAlturas() {
    const dirCav = new THREE.Vector2().subVectors(CAVERNA.centro, CAVERNA.boca).normalize();
    const fimCav = CAVERNA.boca.clone().addScaledVector(dirCav, 6);
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const x = i - META + 0.5, z = j - META + 0.5;
        const base = this.chao(x, z);
        // dunas: cristas onduladas que mudam de direção
        const ondas = Math.sin(x * 0.085 + 2 * Math.sin(z * 0.04)) * (0.4 + 0.6 * this.ruido.fbm(x * 0.03, z * 0.03, 2));
        let h = base + ondas * 2.6 + (this.ruido.fbm(x * 0.05 + 9, z * 0.05 + 9, 2) - 0.5) * 2.5;
        let tipo = 0;
        // lugares planos: o rastro, o poço, as miragens, a chegada, a frente da caverna
        const dr = distRastro(x, z);
        let plano = 1 - suave(2.5, 6, dr);
        plano = Math.max(plano, 1 - suave(6, 9, Math.hypot(x - POCO.x, z - POCO.y)));
        for (const mi of MIRAGENS) plano = Math.max(plano, 1 - suave(5, 8, Math.hypot(x - mi.x, z - mi.z)));
        plano = Math.max(plano, 1 - suave(6, 9, Math.hypot(x + 35, z + 32)));
        if (z > 38) plano = Math.max(plano, 1 - suave(3, 7, Math.abs(x - X_SUL)));
        // a capela e o adro, e a trilha da porta até o rastro
        const fora = Math.max(Math.abs(x - CAPELA_DESERTO.x) - 6.5, Math.abs(z - CAPELA_DESERTO.y - 1) - 9.5, 0);
        plano = Math.max(plano, 1 - suave(0, 5, fora));
        const trilha = Math.abs(x - CAPELA_DESERTO.x) < 1.3 && z > PORTA_CAPELA_Z && z < -6;
        if (trilha) plano = 1;
        const baseCapela = this.chao(CAPELA_DESERTO.x, CAPELA_DESERTO.y);
        const naCapela = 1 - suave(0, 5, fora);
        h = h + ((naCapela > 0 ? base + (baseCapela - base) * naCapela : base) - h) * plano;
        if (dr < 1.5 || trilha) tipo = 1;
        if (Math.hypot(x - POCO.x, z - POCO.y) < 6 && this.ruido.fbm(x * 0.4, z * 0.4) > 0.5) tipo = 3;
        // mesas de arenito (penhascos)
        for (const [mx, mz, rx, rz, alt] of MESAS) {
          const e = ((x - mx) / rx) ** 2 + ((z - mz) / rz) ** 2 + (this.ruido.fbm(x * 0.2, z * 0.2) - 0.5) * 0.35;
          if (e < 1) {
            h = this.chao(mx, mz) + alt + (e < 0.6 ? 1 : 0);
            tipo = 2;
          }
        }
        // a caverna de Santo Antão: um corte no penhasco
        if (distSegmento(x, z, CAVERNA.boca.x, CAVERNA.boca.y, fimCav.x, fimCav.y) < 2.6) {
          h = base;
          tipo = 1;
        }
        // penhascos na borda do mundo, com a passagem leste e a fenda oeste
        const borda = Math.max(Math.abs(x), Math.abs(z));
        const corredorLeste = x > 50 && Math.abs(z) < 2.8;
        const fenda = x < -52 && x > FENDA.fim && Math.abs(z - FENDA.z) < 3.4;
        const corredorSul = z > 50 && Math.abs(x - X_SUL) < 2.8;
        if (corredorSul) {
          h = this.chao(X_SUL, 52);
          tipo = 1;
        }
        if (borda > 60 && !corredorLeste && !fenda && !corredorSul) {
          h = Math.max(h, base + 10 + Math.min(14, (borda - 60) * 2) + this.ruido.fbm(x * 0.1, z * 0.1) * 5);
          tipo = 2;
        }
        if (corredorLeste || fenda) {
          h = this.chao(corredorLeste ? 60 : -58, corredorLeste ? 0 : FENDA.z);
          tipo = 1;
        }
        this.alturas[i * TAM + j] = Math.round(h);
        this.tipo[i * TAM + j] = tipo;
      }
  }

  private corTopo(i: number, j: number, h: number) {
    const t = this.tipo[i * TAM + j];
    const x = i - META, z = j - META;
    if (t === 2) return variar(this.ruido.fbm(x * 0.1, z * 0.1) > 0.5 ? 0xc78e58 : 0xb97f4c, i, h, j, 0.05);
    if (t === 1) return variar((i * 7 + j * 3) % 5 === 0 ? 0xa98a60 : 0xc6a06a, i, h, j, 0.05);
    if (t === 3) return variar(0x9aa858, i, h, j, 0.06);
    const n = this.ruido.fbm(x * 0.06, z * 0.06, 2);
    const listra = (x * 0.7 + z * 0.3 + Math.sin(z * 0.2) * 2) % 3 < 0.9;
    const base = n < 0.42 ? 0xdcbb80 : n < 0.58 ? 0xe3c58e : 0xd2b076;
    return variar(listra ? (base === 0xdcbb80 ? 0xe6cb96 : 0xe8cf9c) : base, i, h, j, 0.035);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (this.tipo[i * TAM + j] === 2) {
      const faixas = [0xb8794a, 0xa86a40, 0xc99360, 0x9a5e3a];
      return prof === 0 ? topo : variar(faixas[Math.floor(y / 2) % 4], i, y, j, 0.05);
    }
    return prof < 2 ? variar(0xcfae76, i, y, j, 0.04) : variar(0xb08458, i, y, j, 0.05);
  }

  /** Lagartixas nas pedras, camelos no oásis do poço, antílopes e hienas ao longe, aves de rapina. */
  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + ORIGEM_DESERTO.x, lz + ORIGEM_DESERTO.z];
    return [
      { especie: 'lagartixa', quantidade: 6, centro: c(0, 0), raio: 45 },
      { especie: 'camelo', quantidade: 2, centro: [this.poco.x + 5, this.poco.z + 4], raio: 6 },
      { especie: 'antilope', quantidade: 3, centro: c(-38, 38), raio: 13 },
      { especie: 'hiena', quantidade: 2, centro: c(38, -42), raio: 12 },
      { especie: 'corvo', quantidade: 2, centro: [this.poco.x, this.poco.z], raio: 18 },
      { especie: 'aguia', quantidade: 1, centro: c(0, 0), raio: 45 },
    ];
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_DESERTO.x - META, z0: ORIGEM_DESERTO.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        const i = Math.floor(x - ORIGEM_DESERTO.x + META), j = Math.floor(z - ORIGEM_DESERTO.z + META);
        if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0x6a4a30;
        const b = this.caixaParede;
        if (!this.paredeAberta && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return 0x8a5a36; // a rocha (falsa)
        if (this.capela.noMapa(x, z)) return 0xf2ead8;
        const h = this.alturas[i * TAM + j];
        const c = this.corTopo(i, j, h);
        return this.tipo[i * TAM + j] === 2 ? escurecer(c, 0.72) : c;
      },
    };
  }

  // ───────────────────────────── física ─────────────────────────────

  altura(x: number, z: number) {
    const p = this.capela?.piso(x, z);
    if (p != null) return p;
    const i = Math.floor(x - ORIGEM_DESERTO.x + META), j = Math.floor(z - ORIGEM_DESERTO.z + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 99;
    return this.alturas[i * TAM + j];
  }

  colidir(pos: THREE.Vector3, raio: number) {
    for (const c of this.circulos) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const min = c.r + raio;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    for (const b of this.caixas) {
      if (pos.y >= b.topo) continue;
      const x0 = b.x0 - raio, x1 = b.x1 + raio, z0 = b.z0 - raio, z1 = b.z1 + raio;
      if (pos.x <= x0 || pos.x >= x1 || pos.z <= z0 || pos.z >= z1) continue;
      const e = [pos.x - x0, x1 - pos.x, pos.z - z0, z1 - pos.z];
      const k = e.indexOf(Math.min(...e));
      if (k === 0) pos.x = x0;
      else if (k === 1) pos.x = x1;
      else if (k === 2) pos.z = z0;
      else pos.z = z1;
    }
  }
}
