import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Sombra } from '../entidades/Sombra';
import { Gula } from '../entidades/Gula';
import { Npc, type DefNpc } from '../entidades/Npc';
import { Alvo, Area } from './Area';
import { malhaDeColunas } from './Terreno';
import type { FonteMapa } from '../ui/Minimapa';
import { escurecer } from './PocoMeioDia';
import { ORIGENS } from './aberto/Geografia';

/**
 * O Salão do Banquete, dentro do palácio da Cidade Dourada: a arena da Gula. É uma área separada.
 * Um salão de mármore e ouro, sem teto à vista (a câmera vê de cima, como na cripta), com duas mesas compridas
 * nas paredes de leste e oeste, cheias de travessas que nunca se esvaziam, e o trono da Gula ao norte.
 * Vencida a Gula, a mesa é dos pobres: pão e peixes em vez de ouro (Lc 14,13).
 */

const TAM = 64;
const META = TAM / 2;
export const ORIGEM_BANQUETE = ORIGENS.palacio;
const CHAO = 4;
/** O salão (coordenadas locais). */
const SALAO = { x0: -16, x1: 16, z0: -14, z1: 14 };
const PORTA = 2.4;
const ID_CHEFE = 'palacio_gula';
/** Onde as portas de ouro fecham (z local). */
const Z_PORTAS = 14.4;
const MESA = { x0: 12.4, x1: 14.6, z0: -10, z1: 8.5 };
const ALTURA_MESA = 1.05;

/** As travessas: as três primeiras servem desde o começo; a quarta, na fase 2. */
const TRAVESSAS: { lado: -1 | 1; z: number; tipo: TipoTravessa }[] = [
  { lado: -1, z: -5, tipo: 'porco' },
  { lado: 1, z: 1, tipo: 'bolo' },
  { lado: -1, z: 4.5, tipo: 'frutas' },
  { lado: 1, z: -6.5, tipo: 'peixe' },
];

export type IdAjudante = 'tomas' | 'rita' | 'beppo' | 'leproso';
/** Onde ficam, junto à porta, os pobres que vieram com o peregrino. */
const LUGAR_AJUDANTE: Record<IdAjudante, [number, number]> = { tomas: [-9, 12.2], rita: [-4.8, 12.6], beppo: [4.8, 12.6], leproso: [9, 12.2] };
/** Depois da vitória, sentados à mesa. */
const LUGAR_NA_MESA: Record<IdAjudante, [number, number]> = { tomas: [-11.4, -3], rita: [-11.4, 3], beppo: [11.4, -2], leproso: [11.4, 4] };

type TipoTravessa = 'porco' | 'bolo' | 'frutas' | 'peixe';

const ouro = (x: number, y: number, z: number) => variar([0xe8c050, 0xd4a83e, 0xf0d070][Math.abs(x + y + z) % 3], x, y, z, 0.03);

/** O banquete numa travessa de ouro (voxel de 0,08 m). */
function modeloTravessa(tipo: TipoTravessa | 'pao') {
  const m = new Modelo();
  for (let x = -6; x <= 6; x++) for (let z = -5; z <= 5; z++) if ((x * x) / 40 + (z * z) / 28 <= 1) m.ponto(x, 0, z, ouro(x, 0, z));
  for (let x = -6; x <= 6; x++) for (let z = -5; z <= 5; z++) { const r = (x * x) / 40 + (z * z) / 28; if (r <= 1 && r > 0.72) m.ponto(x, 1, z, ouro(x, 1, z)); }
  if (tipo === 'porco') {
    // leitão assado com uma maçã na boca (o porco é o animal da Gula nas alegorias dos vícios)
    const assado = (x: number, y: number, z: number) => variar((x + y) % 3 ? 0xb8682e : 0xa0561e, x, y, z, 0.06);
    m.caixa(-4, 1, -2, 8, 4, 5, assado).caixa(-3, 5, -1, 6, 1, 3, assado);
    m.caixa(4, 2, -1, 2, 3, 3, assado).ponto(6, 3, 0, 0xd02a2a).ponto(6, 4, 0, 0xd02a2a); // focinho e maçã
    m.ponto(5, 4, -1, 0x2a1a10).ponto(5, 4, 1, 0x2a1a10);
    m.caixa(-5, 3, 0, 1, 1, 1, assado).ponto(-6, 4, 0, assado(0, 0, 0)); // rabinho
    for (const [x, z] of [[-3, -3], [-3, 3], [2, -3], [2, 3]]) m.ponto(x, 1, z, 0x8a4418);
  } else if (tipo === 'bolo') {
    // torre de doces e frutas cristalizadas
    for (let y = 1; y < 9; y++) {
      const r = 4.5 - y * 0.45;
      for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (x * x + z * z <= r * r) m.ponto(x, y, z, y % 3 === 0 ? 0xf0e0c8 : y % 3 === 1 ? 0xe8a0b0 : 0xc87a4a);
    }
    m.ponto(0, 9, 0, 0xc0182a).ponto(2, 4, 3, 0x3a9a3a).ponto(-3, 3, 1, 0xe8c040).ponto(1, 6, -2, 0xc0182a);
  } else if (tipo === 'frutas') {
    // uvas, figos, peras e romãs empilhados
    const cores = [0x6a2a8a, 0x5a2478, 0x8a3a9a, 0xc8a030, 0xb0302a, 0x6a8a2a];
    for (let y = 1; y < 6; y++) for (let x = -4; x <= 4; x++) for (let z = -3; z <= 3; z++)
      if (x * x + z * z + (y - 1) * (y - 1) * 1.6 <= 18) m.ponto(x, y, z, cores[Math.abs(x * 3 + y * 7 + z * 5) % cores.length]);
    m.caixa(0, 6, 0, 1, 2, 1, 0x5a3a1a);
  } else if (tipo === 'peixe') {
    // um peixe enorme assado, com limões
    const pele = (x: number, y: number, z: number) => variar(x % 2 ? 0xc8a060 : 0xb88a48, x, y, z, 0.05);
    m.caixa(-5, 1, -2, 9, 3, 4, pele).caixa(-6, 2, -1, 1, 2, 2, pele).caixa(4, 1, -1, 2, 3, 2, pele);
    m.caixa(-7, 1, -2, 1, 4, 4, 0xa07838).ponto(4, 3, 1, 0x1a1a1a);
    m.ponto(-2, 1, 3, 0xf0e040).ponto(1, 1, 3, 0xf0e040).ponto(0, 1, -3, 0x5a9a3a);
  } else {
    // depois da vitória: pães e peixes, como no milagre da multiplicação
    m.caixa(-4, 1, -3, 4, 2, 3, 0xc89048).caixa(-3, 3, -2, 2, 1, 1, 0xd8a058).caixa(1, 1, -3, 4, 2, 3, 0xb8803a);
    m.caixa(-4, 1, 1, 8, 2, 2, 0x8a9aa8).ponto(4, 2, 2, 0x5a6a78).ponto(-4, 2, 1, 0x1a1a1a);
  }
  return m.malha(0.08, [0, 0, 0]);
}

/** Uma travessa do banquete: a Gula se alimenta enquanto houver alguma cheia. A luz ou o cajado a derrubam. */
export class Travessa implements Alvo {
  readonly pos: THREE.Vector3;
  readonly grupo = new THREE.Group();
  private malha: THREE.Mesh;
  private brilho: THREE.Mesh;
  servida = false;
  tombada = false;
  /** 0 = em pé, 1 = caída (anima). */
  private queda = 0;
  /** 0 = vazia, 1 = servida (anima). */
  private surgir = 0;
  private lado: number;

  constructor(x: number, z: number, lado: number, tipo: TipoTravessa) {
    this.lado = lado;
    this.pos = new THREE.Vector3(x + ORIGEM_BANQUETE.x, CHAO + ALTURA_MESA, z + ORIGEM_BANQUETE.z);
    this.malha = modeloTravessa(tipo);
    this.malha.rotation.y = lado > 0 ? -Math.PI / 2 : Math.PI / 2;
    // um halo dourado por baixo, para a travessa se destacar à distância
    this.brilho = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.brilho.position.y = 0.02;
    this.grupo.add(this.malha, this.brilho);
    this.grupo.position.copy(this.pos);
    this.grupo.visible = false;
  }

  get ativa() {
    return this.servida && !this.tombada;
  }

  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(new THREE.Vector3(0, 0.3, 0));
  }

  servir() {
    this.servida = true;
    this.tombada = false;
    this.queda = 0;
    this.surgir = 0;
    this.grupo.visible = true;
  }

  tombar() {
    if (!this.ativa) return false;
    this.tombada = true;
    return true;
  }

  /** Esconde (luta reiniciada ou vitória). */
  recolher() {
    this.servida = false;
    this.tombada = false;
    this.grupo.visible = false;
  }

  /** Troca o banquete pela mesa dos pobres. */
  virarPao() {
    this.grupo.remove(this.malha);
    this.malha = modeloTravessa('pao');
    this.malha.rotation.y = this.lado > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.grupo.add(this.malha);
    this.grupo.visible = true;
    this.brilho.visible = false;
    this.malha.position.set(0, 0, 0);
    this.malha.rotation.z = 0;
    this.malha.scale.setScalar(1);
  }

  atualizar(dt: number, t: number) {
    if (!this.servida) return;
    this.surgir = Math.min(1, this.surgir + dt * 2.5);
    if (this.tombada) this.queda = Math.min(1, this.queda + dt * 3);
    const k = this.queda;
    // tomba para fora da mesa, e a comida se espalha no chão
    this.malha.rotation.z = this.lado * k * 1.4;
    this.malha.position.set(this.lado * k * 0.9, -k * (ALTURA_MESA - 0.1) + Math.sin(k * Math.PI) * 0.3, 0);
    this.malha.scale.setScalar(0.3 + this.surgir * 0.7);
    this.brilho.visible = !this.tombada;
    (this.brilho.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(t * 4 + this.pos.z) * 0.12;
  }
}

function mesa() {
  const m = new Modelo();
  const madeira = (x: number, y: number, z: number) => variar(0x5a3420, x, y, z, 0.05);
  const L = Math.round((MESA.z1 - MESA.z0) / 0.1), W = Math.round((MESA.x1 - MESA.x0) / 0.1);
  for (const [x, z] of [[1, 2], [W - 3, 2], [1, L - 4], [W - 3, L - 4], [1, Math.floor(L / 2)], [W - 3, Math.floor(L / 2)]]) m.caixa(x, 0, z, 2, 9, 2, madeira);
  m.caixa(0, 9, 0, W, 1, L, madeira);
  // toalha branca bordada de ouro, caindo pelos lados
  m.caixa(-1, 10, -1, W + 2, 1, L + 2, (x, _y, z) => ((x + z) % 13 === 0 ? 0xe0c060 : 0xf4efe4));
  m.caixa(-1, 5, -1, 1, 5, L + 2, (_x, y, z) => (y === 5 ? 0xd8b048 : (z % 9 === 0 ? 0xe8e0d0 : 0xf4efe4)));
  m.caixa(W, 5, -1, 1, 5, L + 2, (_x, y, z) => (y === 5 ? 0xd8b048 : (z % 9 === 0 ? 0xe8e0d0 : 0xf4efe4)));
  // candelabros, taças e jarros entre as travessas
  for (let z = 6; z < L - 4; z += 22) {
    m.caixa(Math.floor(W / 2) - 1, 11, z, 2, 1, 2, ouro).caixa(Math.floor(W / 2), 12, z, 1, 5, 1, ouro);
    m.caixa(Math.floor(W / 2) - 2, 16, z, 5, 1, 1, ouro).ponto(Math.floor(W / 2) - 2, 17, z, 0xf4eedc).ponto(Math.floor(W / 2) + 2, 17, z, 0xf4eedc).ponto(Math.floor(W / 2), 17, z, 0xf4eedc);
    m.caixa(3, 11, z + 10, 1, 2, 1, ouro).ponto(3, 13, z + 10, 0x7a0a2a);
    m.caixa(W - 5, 11, z + 14, 2, 3, 2, 0x3a5a3a);
  }
  return m.malha(0.1, [0, 0, 0]);
}

/** O trono da Gula: largo, de ouro e veludo vinho, para caber a barriga. */
function trono() {
  const m = new Modelo();
  const veludo = (x: number, y: number, z: number) => variar(0x6a1830, x, y, z, 0.05);
  m.caixa(-12, 0, -6, 25, 3, 12, ouro); // degraus
  m.caixa(-10, 3, -4, 21, 6, 9, veludo); // assento
  m.caixa(-10, 9, -5, 21, 22, 2, veludo).caixa(-11, 3, -6, 23, 30, 1, ouro); // encosto
  m.caixa(-12, 3, -4, 2, 10, 9, ouro).caixa(11, 3, -4, 2, 10, 9, ouro); // braços
  for (let x = -11; x <= 11; x += 2) m.ponto(x, 33 - Math.round(Math.abs(x) * 0.4), -6, 0xf0d070); // coroa do encosto
  m.ponto(0, 28, -4, 0xc0183a).ponto(-5, 24, -4, 0x2a7ac0).ponto(5, 24, -4, 0x2a9a4a);
  return m.malha(0.1, [0, 0, 0]);
}

/** Coluna de mármore com capitel de ouro. */
function coluna() {
  const m = new Modelo();
  const marmore = (x: number, y: number, z: number) => variar((x + y) % 5 === 0 ? 0xd8ccbc : 0xf0e8dc, x, y, z, 0.02);
  m.caixa(-4, 0, -4, 8, 3, 8, ouro);
  for (let y = 3; y < 60; y++) m.caixa(-3, y, -3, 6, 1, 6, (x, yy, z) => ((x + z + 6) % 3 === 0 ? 0xe0d4c4 : marmore(x, yy, z)));
  m.caixa(-4, 60, -4, 8, 3, 8, ouro).caixa(-5, 63, -5, 10, 2, 10, ouro);
  return m.malha(0.1, [0, 0, 0]);
}

/** Tapeçaria vermelha com franja de ouro, pendurada na parede. */
function tapecaria(semente: number) {
  const m = new Modelo();
  for (let x = 0; x < 16; x++)
    for (let y = 0; y < 30; y++) {
      const borda = x === 0 || x === 15 || y === 0 || y === 29;
      const motivo = Math.abs(x - 7.5) + Math.abs(y - 16) < 4 + (semente % 2);
      m.ponto(x, y, 0, borda ? 0xd8b048 : motivo ? 0xe8c050 : (x + y) % 7 === 0 ? 0x7a1a30 : 0x8a1e36);
    }
  for (let x = 0; x < 16; x += 2) m.ponto(x, -1, 0, 0xd8b048);
  return m.malha(0.1, [0, 0, 0]);
}

/** As portas de ouro do salão, que se fecham quando a luta começa. */
function portas() {
  const m = new Modelo();
  for (let x = -24; x < 24; x++)
    for (let y = 0; y < 50; y++) {
      const friso = x === -24 || x === 23 || x === -1 || x === 0 || y % 12 === 0;
      m.ponto(x, y, 0, friso ? 0xc89a34 : variar((x + y) & 1 ? 0xe8c050 : 0xd8b048, x, y, 0, 0.03));
    }
  return m.malha(0.1, [0, 0, 0.5]);
}

export interface EventosBanquete {
  lutaComecou(): void;
  /** O banquete se serviu de novo (som e aviso). */
  banqueteServido(primeira: boolean): void;
  /** Uma travessa caiu; `restantes` ainda estão cheias. */
  travessaCaiu(restantes: number): void;
}

export interface Ajudante {
  id: IdAjudante;
  npc: Npc;
  presente: boolean;
}

export class Banquete implements Area {
  readonly id = 'palacio' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly travessas: Travessa[] = [];
  readonly ajudantes: Ajudante[] = [];
  private alturas = new Int16Array(TAM * TAM);
  private circulos: { x: number; z: number; r: number }[] = [];
  private caixas: { x0: number; x1: number; z0: number; z1: number; topo: number }[] = [];
  private malhaPortas: THREE.Mesh[] = [];
  /** 0 = abertas, 1 = fechadas. */
  private fechamento = 0;
  private servirEm = -1;
  private servidas = 0;
  private t = 0;
  private luzes: THREE.PointLight[] = [];

  readonly chegada: THREE.Vector3;
  readonly saida: THREE.Vector3;
  readonly centro: THREE.Vector3;
  readonly trono: THREE.Vector3;
  gula: Gula | null = null;
  lutando = false;
  vencido = false;

  constructor(private eventos: EventosBanquete, defs: Record<IdAjudante, DefNpc>) {
    this.gerarAlturas();
    const terreno = malhaDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 16);
    terreno.position.copy(ORIGEM_BANQUETE);
    this.grupo.add(terreno);

    const w = (lx: number, lz: number) => new THREE.Vector3(lx + ORIGEM_BANQUETE.x, CHAO, lz + ORIGEM_BANQUETE.z);
    this.chegada = w(0, 18.5);
    this.saida = w(0, 21);
    this.centro = w(0, 0);
    this.trono = w(0, -12.4);

    const por = (o: THREE.Object3D, lx: number, lz: number, rot = 0, y = CHAO) => {
      o.position.set(lx + ORIGEM_BANQUETE.x, y, lz + ORIGEM_BANQUETE.z);
      o.rotation.y = rot;
      this.grupo.add(o);
      return o;
    };
    // as mesas, de parede a parede, e as travessas sobre elas
    for (const lado of [-1, 1]) {
      const x0 = lado > 0 ? MESA.x0 : -MESA.x1;
      por(mesa(), x0, MESA.z0);
      this.caixas.push({ x0: x0 + ORIGEM_BANQUETE.x, x1: x0 + (MESA.x1 - MESA.x0) + ORIGEM_BANQUETE.x, z0: MESA.z0 + ORIGEM_BANQUETE.z, z1: MESA.z1 + ORIGEM_BANQUETE.z, topo: CHAO + 3 });
    }
    for (const tv of TRAVESSAS) {
      const x = tv.lado * (MESA.x0 + MESA.x1) / 2;
      const t = new Travessa(x, tv.z, tv.lado, tv.tipo);
      this.travessas.push(t);
      this.grupo.add(t.grupo);
    }
    por(trono(), 0, -12.4);
    this.caixas.push({ x0: this.trono.x - 1.2, x1: this.trono.x + 1.3, z0: this.trono.z - 0.6, z1: this.trono.z + 0.6, topo: CHAO + 3.3 });
    // colunas ao longo das paredes e tapeçarias entre elas
    for (const z of [-12, -6, 0, 6, 12])
      for (const lado of [-1, 1]) {
        por(coluna(), lado * 15.3, z);
        this.circulos.push({ x: lado * 15.3 + ORIGEM_BANQUETE.x, z: z + ORIGEM_BANQUETE.z, r: 0.55 });
      }
    for (const x of [-9, -4.5, 4.5, 9]) {
      por(coluna(), x, -13.3);
      this.circulos.push({ x: x + ORIGEM_BANQUETE.x, z: -13.3 + ORIGEM_BANQUETE.z, r: 0.55 });
    }
    for (const [i, x] of [-12, -7, 6.2, 11.2].entries()) por(tapecaria(i), x - 0.8 + (x > 0 ? 0 : 0), -13.95, 0, CHAO + 1.6);
    for (const [i, z] of [-9, -3, 3, 9].entries()) {
      por(tapecaria(i + 1), -15.95, z - 0.8, Math.PI / 2, CHAO + 1.6);
      por(tapecaria(i + 2), 15.95, z + 0.8, -Math.PI / 2, CHAO + 1.6);
    }
    // as portas de ouro: duas folhas, em pé quando fechadas
    for (const lado of [-1, 1]) {
      const p = portas();
      p.scale.set(lado * 0.5, 1, 1);
      por(p, lado * 1.2, Z_PORTAS);
      this.malhaPortas.push(p);
    }
    // luz quente de velas: três luzes para o salão inteiro (o número de luzes não muda durante o jogo)
    for (const [x, z, k] of [[-8, -6, 26], [8, -6, 26], [0, 8, 22]] as const) {
      const l = new THREE.PointLight(0xffb060, k, 26, 1.3);
      l.position.copy(w(x, z)).setY(CHAO + 5);
      this.luzes.push(l);
      this.grupo.add(l);
    }

    // os pobres que o peregrino ajudou na cidade: vieram junto, como Francisco prometeu
    for (const id of Object.keys(LUGAR_AJUDANTE) as IdAjudante[]) {
      const [x, z] = LUGAR_AJUDANTE[id];
      const npc = new Npc({ ...defs[id], id: `palacio_${id}`, no: `palacio_${id}` }, w(x, z), Math.PI);
      npc.raiz.visible = false;
      this.ajudantes.push({ id, npc, presente: false });
      this.grupo.add(npc.raiz);
    }
  }

  /** Recoloca o salão conforme o save. */
  reiniciar(sombrasVencidas: Set<string>, flags: Set<string>) {
    this.descartarLuta();
    this.vencido = sombrasVencidas.has(ID_CHEFE);
    this.lutando = false;
    this.fechamento = 0;
    const ajudou: Record<IdAjudante, boolean> = {
      tomas: flags.has('cidade_ajudou_tomas'),
      rita: flags.has('cidade_ajudou_rita'),
      beppo: flags.has('cidade_ajudou_beppo'),
      leproso: flags.has('cidade_leproso'),
    };
    for (const a of this.ajudantes) {
      a.presente = ajudou[a.id];
      a.npc.raiz.visible = a.presente;
      const [x, z] = (this.vencido ? LUGAR_NA_MESA : LUGAR_AJUDANTE)[a.id];
      this.moverAjudante(a, x, z);
    }
    if (this.vencido) for (const t of this.travessas) t.virarPao();
    else {
      for (const t of this.travessas) t.recolher();
      this.criarChefe();
    }
  }

  private moverAjudante(a: Ajudante, x: number, z: number) {
    a.npc.pos.set(x + ORIGEM_BANQUETE.x, CHAO, z + ORIGEM_BANQUETE.z);
    a.npc.raiz.position.copy(a.npc.pos);
  }

  private criarChefe() {
    this.gula = new Gula(ID_CHEFE, this.trono.clone().add(new THREE.Vector3(0, 0, 2.6)));
    this.sombras.push(this.gula);
    this.grupo.add(this.gula.raiz, this.gula.efeitos);
    this.servidas = 0;
    this.servirEm = -1;
  }

  private descartarLuta() {
    this.gula?.descartar();
    this.gula = null;
    this.sombras.length = 0;
  }

  /** Morreu na luta: tudo volta ao começo. */
  reiniciarLuta() {
    if (!this.lutando) return;
    this.lutando = false;
    this.descartarLuta();
    for (const t of this.travessas) t.recolher();
    this.criarChefe();
  }

  /** A Gula caiu: as portas se abrem e a mesa é dos pobres. */
  chefeVencido() {
    this.lutando = false;
    this.vencido = true;
    for (const t of this.travessas) t.virarPao();
    for (const a of this.ajudantes) {
      const [x, z] = LUGAR_NA_MESA[a.id];
      this.moverAjudante(a, x, z);
    }
  }

  /** Quantos pobres vieram (para o roteiro). */
  get quantosVieram() {
    return this.ajudantes.filter((a) => a.presente).length;
  }

  alvos(): Alvo[] {
    return this.lutando ? this.travessas.filter((t) => t.ativa) : [];
  }

  atingirLuz(p: THREE.Vector3) {
    for (const t of this.travessas) if (t.ativa && t.centro().distanceTo(p) < 1.1) return this.derrubar(t);
    return false;
  }

  private derrubar(t: Travessa) {
    if (!t.tombar()) return false;
    this.eventos.travessaCaiu(this.travessas.filter((x) => x.ativa).length);
    return true;
  }

  /** O cajado derruba a travessa que estiver à frente, ao alcance. */
  golpear(de: THREE.Vector3, frente: THREE.Vector3) {
    for (const t of this.travessas) {
      if (!t.ativa) continue;
      const para = t.pos.clone().sub(de).setY(0);
      if (para.length() < 2.5 && para.normalize().dot(frente) > 0.2) return this.derrubar(t);
    }
    return false;
  }

  private servir() {
    const n = this.gula?.fase2 ? 4 : 3;
    for (let i = 0; i < n; i++) this.travessas[i].servir();
    this.eventos.banqueteServido(this.servidas === 0);
    this.servidas++;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    const g = this.gula;
    // a luta começa ao passar das portas
    if (g && g.ativa && !this.lutando && !this.vencido && jogador.z - ORIGEM_BANQUETE.z < Z_PORTAS - 3) {
      this.lutando = true;
      g.acordar();
      this.servir();
      this.eventos.lutaComecou();
    }
    // as portas de ouro: abertas para os lados (para fora do vão), fechadas no meio
    const quer = this.lutando ? 1 : 0;
    this.fechamento += Math.sign(quer - this.fechamento) * Math.min(Math.abs(quer - this.fechamento), dt * 1.4);
    this.malhaPortas.forEach((p, i) => {
      const lado = i === 0 ? -1 : 1;
      p.rotation.y = lado * (1 - this.fechamento) * 1.5;
    });

    for (const t of this.travessas) t.atualizar(dt, this.t);
    for (const a of this.ajudantes) if (a.presente) a.npc.atualizar(dt, jogador);
    for (const [i, l] of this.luzes.entries()) l.intensity = (i === 2 ? 22 : 26) + Math.sin(this.t * 9 + i * 2) * 1.6 + Math.sin(this.t * 23 + i) * 0.8;

    if (!g || !this.lutando || !g.ativa) return;
    // na fase 2, a quarta travessa chega logo
    if (g.fase2 && !this.travessas[3].servida && !g.faminta) this.travessas[3].servir();
    const cheias = this.travessas.filter((t) => t.ativa).length;
    g.saciada = cheias > 0;
    if (cheias === 0 && !g.faminta && this.servirEm < 0) {
      g.esfomear();
      this.servirEm = 0;
    }
    // passada a fome, o banquete volta: ele não acaba nunca
    if (this.servirEm >= 0 && !g.faminta) {
      this.servirEm += dt;
      if (this.servirEm > 1.1) {
        this.servirEm = -1;
        this.servir();
      }
    }
  }

  // ───────────────────────────── terreno ─────────────────────────────

  private dentroDoSalao(x: number, z: number) {
    return x >= SALAO.x0 && x < SALAO.x1 && z >= SALAO.z0 && z < SALAO.z1;
  }

  private gerarAlturas() {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const x = i - META + 0.5, z = j - META + 0.5;
        const corredor = Math.abs(x) < PORTA && z >= SALAO.z1 && z < 23;
        let h = CHAO;
        if (!this.dentroDoSalao(x, z) && !corredor) {
          // paredes altas de mármore; um friso mais alto nos cantos
          const canto = (Math.abs(x) > 15 && Math.abs(z) > 13) || (Math.abs(x) < 4 && z > 13 && z < 15.5);
          h = CHAO + 11 + (canto ? 2 : 0);
        }
        this.alturas[i * TAM + j] = h;
      }
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META + 0.5, z = j - META + 0.5;
    if (h > CHAO) return variar(0xd8b048, i, h, j, 0.04); // o alto das paredes, dourado
    // tapete vermelho da porta ao trono, com borda de ouro
    if (Math.abs(x) < 1.6 && z > -11) return Math.abs(x) > 1.2 ? variar(0xd8b048, i, h, j, 0.03) : variar(0x8a1a2a, i, h, j, 0.04);
    // piso em xadrez de mármore e ouro, com uma rosa dos ventos no centro
    const r = Math.hypot(x, z - 1);
    if (r < 4.2 && r > 3.4) return variar(0xd8b048, i, h, j, 0.03);
    const xadrez = (Math.floor(x / 2) + Math.floor(z / 2)) & 1;
    return variar(xadrez ? 0xf0e8dc : 0xd4b878, i, h, j, 0.025);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    // paredes de mármore com rodapé escuro e faixas de ouro
    if (y < CHAO + 1) return variar(0x5a3a2a, i, y, j, 0.04);
    if (y === CHAO + 5 || y === CHAO + 10) return variar(0xd8b048, i, y, j, 0.03);
    return variar((i + y + j) % 6 === 0 ? 0xe0d4c4 : 0xf0e8dc, i, y, j, 0.02);
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_BANQUETE.x - META,
      z0: ORIGEM_BANQUETE.z - META,
      largura: TAM,
      profundidade: TAM,
      cor: (x, z) => {
        const i = Math.floor(x - ORIGEM_BANQUETE.x + META), j = Math.floor(z - ORIGEM_BANQUETE.z + META);
        if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0x3a2418;
        const lx = x - ORIGEM_BANQUETE.x, lz = z - ORIGEM_BANQUETE.z;
        if (Math.abs(lx) >= MESA.x0 && Math.abs(lx) < MESA.x1 && lz >= MESA.z0 && lz < MESA.z1) return 0xf4efe4;
        const h = this.alturas[i * TAM + j];
        const c = this.corTopo(i, j, h);
        return h > CHAO ? escurecer(c, 0.55) : c;
      },
    };
  }

  // ───────────────────────────── física ─────────────────────────────

  altura(x: number, z: number) {
    const lx = x - ORIGEM_BANQUETE.x, lz = z - ORIGEM_BANQUETE.z;
    // as portas fechadas são parede de verdade
    if (this.fechamento > 0.5 && Math.abs(lx) < PORTA + 0.5 && Math.abs(lz - Z_PORTAS) < 0.6) return CHAO + 11;
    const i = Math.floor(lx + META), j = Math.floor(lz + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 99;
    return this.alturas[i * TAM + j];
  }

  /** As mesas e o trono contam como maciços para a câmera e para a mira. */
  alturaCamera(x: number, z: number) {
    let h = this.altura(x, z);
    for (const b of this.caixas) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1 && b.topo > h) h = b.topo;
    return h;
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
    // os pobres que vieram também ocupam lugar
    for (const a of this.ajudantes) {
      if (!a.presente) continue;
      const dx = pos.x - a.npc.pos.x, dz = pos.z - a.npc.pos.z;
      const min = 0.4 + raio;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = a.npc.pos.x + (dx / d) * min;
        pos.z = a.npc.pos.z + (dz / d) * min;
      }
    }
  }
}
