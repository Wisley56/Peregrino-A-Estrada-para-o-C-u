import * as THREE from 'three';
import type { Povoamento } from '../fauna/Fauna';
import { Animal } from '../fauna/Animal';
import { Ruido, aleatorio } from '../core/Ruido';
import { variar } from '../voxel/Modelo';
import { figurinoDoPovo, type Figurino } from '../voxel/Humano';
import { Sombra } from '../entidades/Sombra';
import { FRANCISCO } from '../entidades/Francisco';
import { Npc, type DefNpc } from '../entidades/Npc';
import type { IdFalante } from '../dialogo/Falantes';
import { Area } from './Area';
import { CapelaRegional, type EstiloCapela } from './Capela';
import { construirCruzeiro, construirPlaca } from './Cenario';
import { malhaDeColunas } from './Terreno';
import type { FonteMapa } from '../ui/Minimapa';
import { escurecer } from './PocoMeioDia';
import {
  barraca, casa, casebre, cipreste, fonte, isca, oliveira, palacio, pilhaPedras, saoDamiao, tocaLobo,
  type Frente, type TipoIsca,
} from './CidadeModelos';
import { ORIGENS } from './aberto/Geografia';

/**
 * A Cidade Dourada (terceira região): uma cidade de colina da Úmbria, cercada de muralha, como Assis.
 * Fica longe das outras áreas (em ORIGEM_CIDADE). Chega-se pelo sul, pela estrada que sobe entre ciprestes.
 *
 * Fora dos muros, onde os pobres vivem: o leproso junto à estrada, as ruínas de São Damião (onde Francisco
 * reza), a pedreira velha, a toca do lobo e os olivais. Dentro, o centro foi dourado pelos ricos: praça de
 * lajes de ouro, fonte dourada, a feira das coisas finas e, ao norte, o Palácio do Banquete, onde a Gula
 * mora. Pelas ruas, a Gula larga iscas (pratos, taças, ouro): quem pega fica pesado.
 */

const TAM = 160;
const META = TAM / 2;
export const ORIGEM_CIDADE = ORIGENS.cidade;
/** Altura do chão dentro dos muros. */
const CHAO = 14;
/** Retângulo de dentro dos muros (local). */
const MURO = { x0: -38, x1: 38, z0: -56, z1: 12 };
const GROSSURA = 2;
/** Sombras da cidade que devolvem a cor. */
export const TOTAL_SOMBRAS_CIDADE = 4;
/** Atos de piedade da região: o leproso, os três mendigos, o lobo e São Damião. */
export const TOTAL_ATOS_CIDADE = 6;
/** Pedras para reconstruir São Damião. */
export const PEDRAS_DAMIAO = 4;

type Ret = [number, number, number, number]; // x0, z0, largura, profundidade

/** Ruas calçadas (dentro dos muros). */
const RUAS: Ret[] = [
  [-3, -9, 6, 21], // rua principal, da porta à praça
  [-38, 8, 76, 4], // rua junto ao muro sul
  [-30, -30, 18, 4], // rua da capela (oeste)
  [12, -30, 24, 4], // rua da feira (leste)
  [-38, -17, 26, 4], // beco oeste
  [12, -17, 26, 4], // beco leste
  [-16, -17, 4, 25], // travessa oeste
  [12, -17, 4, 25], // travessa leste
];
/** A praça dourada. */
const PRACA: Ret = [-12, -36, 24, 27];

/** Casas: retângulo no mundo (local), para onde dá a frente, e se é dourada (dos ricos). */
const CASAS: [number, number, number, number, Frente, boolean][] = [
  [-11, -7, 7, 6.5, 'e', true], [-11, 0.5, 7, 7, 'e', false],
  [4, -7, 7, 6.5, 'o', true], [4, 0.5, 7, 7, 'o', false],
  [-37, -25, 9, 7.5, 'n', false], [-27, -25, 9, 7.5, 'n', false],
  [-37, -12, 9, 7.5, 'n', false], [-27, -12, 9, 7.5, 'n', false],
  [-37, -1, 9, 8.5, 's', false], [-27, -1, 9, 8.5, 's', false],
  [17, -25, 9, 7.5, 'n', true], [27, -25, 10, 7.5, 'n', false],
  [17, -12, 9, 7.5, 'n', false], [27, -12, 10, 7.5, 'n', false],
  [17, -1, 9, 8.5, 's', false], [27, -1, 10, 8.5, 's', false],
  [15, -42, 10, 11, 's', true], [27, -42, 10, 11, 's', false],
  [15, -55, 10, 11, 'n', false], [27, -55, 10, 11, 'n', false],
  [-37, -55, 7, 9, 'e', false],
];
const PALACIO = { x: 0, z: -45, larg: 22, prof: 14 };
const CAPELA_CIDADE = { x: -25, z: -38 };
const FONTE = new THREE.Vector2(0, -20);

/** A estrada de fora (do sul até a porta) e o caminho até São Damião. */
const ESTRADA: [number, number][] = [[0, 80], [0, 62], [2, 50], [1, 36], [0, 24], [0, 13]];
const CAMINHO_DAMIAO: [number, number][] = [[1, 40], [-12, 42], [-24, 44], [-35, 44]];
const CAMINHO_LOBO: [number, number][] = [[1, 30], [16, 31], [30, 33], [40, 34]];
const DAMIAO = new THREE.Vector2(-40, 44);
const PEDREIRA = new THREE.Vector2(-50, 26);
const CASEBRE = new THREE.Vector2(9, 47);
const TOCA = new THREE.Vector2(47, 34);
const TRIGO: Ret = [14, 16, 22, 12];

/** Onde a Gula largou as iscas (local). */
const ISCAS: { tipo: TipoIsca; x: number; z: number }[] = [
  { tipo: 'prato', x: 6, z: -26 },
  { tipo: 'calice', x: -7, z: -33 },
  { tipo: 'moedas', x: -1.5, z: -1 },
  { tipo: 'taca', x: 22, z: -28 },
  { tipo: 'coroa', x: -30, z: -15 },
  { tipo: 'prato', x: 30, z: -15 },
  { tipo: 'moedas', x: -22, z: 10 },
];
const SOMBRAS_LOCAIS: [number, number][] = [[0, 3], [-24, -15], [24, -15], [26, -28]];

/** A capela da cidade, de pedra rosada do Subásio, com vitrais no azul de Giotto. */
const ESTILO_UMBRIA: EstiloCapela = {
  reboco: 0xecd8ca,
  pedra: 0xd2ae9a,
  telha: 0xb5603c,
  cumeeira: 0x8a3a22,
  madeira: 0x7a5232,
  madeiraEscura: 0x4e3420,
  pisoA: 0xdcc6b4,
  pisoB: 0xc4aa96,
  marmore: 0xf2e8dc,
  tapete: 0x6e2a2a,
  vitral: [0x2a4ab8, 0xc83242, 0xe8c45a, 0x3a9a66, 0x6a4ad0],
  flores: [0xffffff, 0xf2d24a, 0xe84a6a],
};

/** Frei Leão: o confessor de Francisco, frade e padre; hábito castanho e estola roxa. */
const FREI_LEAO: DefNpc = {
  id: 'frei_leao',
  falante: 'frei_leao',
  no: 'capela_confissao',
  visual: { genero: 'm', idade: 'adulto', pele: 0xdcae8a, penteado: 'tonsura', corCabelo: 0x3b2618, barba: 'curta', traje: 'habito', cor: 0x7a5232, cor2: 0x6a3088, acessorio: 'livro' },
};

export interface Pobre {
  id: 'tomas' | 'rita' | 'beppo';
  npc: Npc;
}

const POBRES: { id: Pobre['id']; x: number; z: number; rumo: number; visual: Figurino }[] = [
  // Tomás, velho cego, junto à porta da cidade
  { id: 'tomas', x: 4.2, z: 9.6, rumo: -Math.PI / 2, visual: { ...figurinoDoPovo(11, 'pobre'), genero: 'm', idade: 'idoso', penteado: 'capuz', barba: 'longa', acessorio: 'cajado' } },
  // Rita, a viúva, no canto da praça
  { id: 'rita', x: -10.4, z: -10.6, rumo: Math.PI * 0.75, visual: { ...figurinoDoPovo(23, 'pobre'), genero: 'f', idade: 'adulto', penteado: 'veu', barba: undefined, acessorio: undefined } },
  // Beppo, o menino, nos degraus da capela
  { id: 'beppo', x: -22.2, z: -29.6, rumo: 0, visual: { ...figurinoDoPovo(37, 'pobre'), genero: 'm', idade: 'crianca', penteado: 'curto', barba: undefined, acessorio: undefined } },
];

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function distSegmento(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function distLinha(x: number, z: number, linha: [number, number][]) {
  let d = Infinity;
  for (let i = 0; i < linha.length - 1; i++) d = Math.min(d, distSegmento(x, z, ...linha[i], ...linha[i + 1]));
  return d;
}

const dentro = (x: number, z: number, [x0, z0, w, d]: Ret) => x >= x0 && x < x0 + w && z >= z0 && z < z0 + d;

interface Caixa { x0: number; x1: number; z0: number; z1: number; topo: number }

/** Uma isca da Gula largada na rua. */
export interface Isca {
  id: string;
  tipo: TipoIsca;
  pos: THREE.Vector3;
  malha: THREE.Mesh;
  pega: boolean;
}

export const NOME_ISCA: Record<TipoIsca, string> = {
  prato: 'o prato do banquete',
  calice: 'o cálice de ouro',
  moedas: 'as moedas de ouro',
  taca: 'a taça de vinho',
  coroa: 'a coroa de ouro',
};

export class Cidade implements Area {
  readonly id = 'cidade' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  private alturas = new Int16Array(TAM * TAM);
  /** 0 grama, 1 estrada, 2 muralha, 3 rua, 4 praça, 5 olival, 6 trigo, 7 rocha, 8 morro */
  private tipo = new Uint8Array(TAM * TAM);
  private ruido = new Ruido(1226);
  private circulos: { x: number; z: number; r: number }[] = [];
  private caixas: Caixa[] = [];
  private t = 0;

  readonly capela: CapelaRegional;
  readonly chegada: THREE.Vector3;
  readonly saida: THREE.Vector3;
  /** A estrada do mar, que desce para o porto (e para a Bahia). */
  readonly estradaDoMar: THREE.Vector3;
  readonly cruzeiro: THREE.Vector3;
  readonly fonte: THREE.Vector3;
  readonly portaPalacio: THREE.Vector3;
  readonly francisco: Npc;
  readonly mercador: Npc;
  readonly leproso: Npc;
  readonly leprosoCurado: Npc;
  readonly pobres: Pobre[] = [];
  readonly iscas: Isca[] = [];
  /** Junto às ruínas: onde se assentam as pedras; e a pedreira, de onde se tiram. */
  readonly damiao: THREE.Vector3;
  readonly altarDamiao: THREE.Vector3;
  readonly pedreira: THREE.Vector3;
  readonly toca: THREE.Vector3;
  lobo: Animal | null = null;
  /** 'toca' (bravo, longe de todos), 'seguindo' (fez as pazes e vem junto) ou 'cidade' (mora na praça). */
  estadoLobo: 'toca' | 'seguindo' | 'cidade' = 'toca';
  private malhaDamiao: THREE.Mesh;
  private estagioDamiao = -1;
  private caixasDamiao: Caixa[] = [];

  constructor() {
    this.gerarAlturas();
    const terreno = malhaDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 40);
    terreno.position.copy(ORIGEM_CIDADE);
    this.grupo.add(terreno);

    const w = (lx: number, lz: number, dy = 0) => new THREE.Vector3(lx + ORIGEM_CIDADE.x, 0, lz + ORIGEM_CIDADE.z).setY(this.altura(lx + ORIGEM_CIDADE.x, lz + ORIGEM_CIDADE.z) + dy);
    const por = (o: THREE.Object3D, lx: number, lz: number, rot = 0) => {
      o.position.copy(w(lx, lz));
      o.rotation.y = rot;
      this.grupo.add(o);
      return o;
    };
    const caixaLocal = (x0: number, z0: number, larg: number, prof: number, topo: number) =>
      this.caixas.push({ x0: x0 + ORIGEM_CIDADE.x, x1: x0 + larg + ORIGEM_CIDADE.x, z0: z0 + ORIGEM_CIDADE.z, z1: z0 + prof + ORIGEM_CIDADE.z, topo });

    this.chegada = w(0, 57);
    this.saida = w(0, 68);
    this.estradaDoMar = w(0, 75);
    this.cruzeiro = w(4.5, 58);
    this.fonte = w(FONTE.x, FONTE.y);
    this.portaPalacio = w(PALACIO.x, PALACIO.z + PALACIO.prof / 2 + 2.6);
    this.damiao = w(DAMIAO.x + 4.6, DAMIAO.y);
    this.altarDamiao = w(DAMIAO.x - 2.2, DAMIAO.y);
    this.pedreira = w(PEDREIRA.x, PEDREIRA.y);
    this.toca = w(TOCA.x - 5, TOCA.y);

    // casas, palácio, fonte e feira
    CASAS.forEach(([x0, z0, larg, prof, frente, dourada], i) => {
      por(casa(400 + i, larg, prof, frente, dourada), x0 + larg / 2, z0 + prof / 2);
      caixaLocal(x0, z0, larg, prof, CHAO + 14);
    });
    por(palacio(), PALACIO.x, PALACIO.z);
    caixaLocal(PALACIO.x - PALACIO.larg / 2, PALACIO.z - PALACIO.prof / 2, PALACIO.larg, PALACIO.prof + 0.6, CHAO + 20);
    por(fonte(), FONTE.x, FONTE.y);
    this.circulos.push({ x: this.fonte.x, z: this.fonte.z, r: 2.1 });
    for (const [i, x, z] of [[1, 10, -15], [2, 10, -22]] as const) {
      por(barraca(700 + i), x, z, -Math.PI / 2);
      caixaLocal(x - 1, z - 1.6, 2, 3.2, CHAO + 3);
    }

    // a porta da cidade: arco sobre a passagem da muralha
    const arco = new THREE.Group();
    const pedra = new THREE.MeshLambertMaterial({ color: 0xd8b8a4 });
    const viga = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.2, GROSSURA + 0.4), pedra);
    viga.position.y = 4.6;
    viga.castShadow = true;
    arco.add(viga);
    por(arco, 0, MURO.z1 + GROSSURA / 2);

    // capela da região, com Frei Leão no confessionário
    const hc = this.altura(CAPELA_CIDADE.x + ORIGEM_CIDADE.x, CAPELA_CIDADE.z + ORIGEM_CIDADE.z);
    this.capela = new CapelaRegional(ESTILO_UMBRIA, CAPELA_CIDADE.x + ORIGEM_CIDADE.x, CAPELA_CIDADE.z + ORIGEM_CIDADE.z, hc, FREI_LEAO);
    this.grupo.add(this.capela.grupo);
    this.caixas.push(...this.capela.caixas);

    // gente: Francisco em São Damião, o leproso na estrada, os pobres, o mercador na praça
    this.francisco = new Npc(FRANCISCO, w(DAMIAO.x + 6, DAMIAO.y + 2.4), -Math.PI / 2 - 0.6);
    const doente: Figurino = { genero: 'm', idade: 'adulto', pele: 0xc8b49a, penteado: 'capuz', corCabelo: 0x3b2618, barba: 'curta', traje: 'trapos', cor: 0x8a8270, cor2: 0xe8e0d0, acessorio: 'muleta' };
    this.leproso = new Npc({ id: 'leproso', falante: 'leproso', no: 'leproso', rotulo: 'F: falar com o leproso', visual: doente }, w(CASEBRE.x - 4, CASEBRE.y - 2), -Math.PI / 2);
    this.leprosoCurado = new Npc(
      { id: 'leproso_curado', falante: 'leproso', no: 'leproso', rotulo: 'F: falar com o homem curado', visual: { ...doente, pele: 0xdcb08a, penteado: 'curto', traje: 'tunica', cor: 0x6a7a5a, acessorio: undefined } },
      w(CASEBRE.x - 4, CASEBRE.y - 2), -Math.PI / 2,
    );
    this.mercador = new Npc(
      { id: 'mercador', falante: 'mercador', no: 'mercador', rotulo: 'F: falar com o mercador', visual: { ...figurinoDoPovo(5, 'rico'), genero: 'm', idade: 'adulto', barba: 'curta' } },
      w(6.5, -32.5), Math.PI * 0.85,
    );
    this.grupo.add(this.francisco.raiz, this.leproso.raiz, this.leprosoCurado.raiz, this.mercador.raiz);
    for (const n of [this.francisco, this.leproso, this.mercador]) this.circulos.push({ x: n.pos.x, z: n.pos.z, r: 0.45 });
    for (const p of POBRES) {
      const npc = new Npc({ id: p.id, falante: p.id as IdFalante, no: p.id, rotulo: `F: falar com ${p.id === 'tomas' ? 'Tomás' : p.id === 'rita' ? 'Rita' : 'Beppo'}`, visual: p.visual }, w(p.x, p.z), p.rumo);
      this.pobres.push({ id: p.id, npc });
      this.grupo.add(npc.raiz);
      this.circulos.push({ x: npc.pos.x, z: npc.pos.z, r: 0.4 });
    }

    // fora dos muros: São Damião, a pedreira, o casebre, a toca, o cruzeiro e as placas
    this.malhaDamiao = saoDamiao(0);
    this.definirEstagioDamiao(0);
    por(pilhaPedras(), PEDREIRA.x, PEDREIRA.y);
    this.circulos.push({ x: this.pedreira.x, z: this.pedreira.z, r: 1.4 });
    por(casebre(), CASEBRE.x, CASEBRE.y, Math.PI);
    caixaLocal(CASEBRE.x - 1.3, CASEBRE.y - 1, 2.6, 2.1, 20);
    por(tocaLobo(), TOCA.x, TOCA.y, -Math.PI / 2);
    this.circulos.push({ x: TOCA.x + ORIGEM_CIDADE.x + 0.6, z: TOCA.y + ORIGEM_CIDADE.z, r: 2.6 });
    const cruz = construirCruzeiro();
    por(cruz, 4.5, 58);
    this.circulos.push({ x: this.cruzeiro.x, z: this.cruzeiro.z, r: 0.85 });
    const placa = construirPlaca();
    por(placa, 2.6, 73, Math.PI);

    // ciprestes na estrada; oliveiras nos olivais
    for (let z = 20; z < 66; z += 6.5)
      for (const lado of [-3.6, 3.6]) {
        if (Math.hypot(lado - 4.5, z - 58) < 3) continue;
        const c = cipreste(Math.round(z * 3 + lado));
        por(c, lado + (z % 13 < 6 ? 0.3 : -0.3), z);
        this.circulos.push({ x: c.position.x, z: c.position.z, r: 0.45 });
      }
    const rnd = aleatorio(4242);
    for (let n = 0; n < 220; n++) {
      const lx = (rnd() - 0.5) * 120, lz = 16 + rnd() * 48;
      if (this.tipoEm(lx, lz) !== 5) continue;
      if (distLinha(lx, lz, ESTRADA) < 5 || distLinha(lx, lz, CAMINHO_DAMIAO) < 3 || distLinha(lx, lz, CAMINHO_LOBO) < 3) continue;
      if (Math.hypot(lx - DAMIAO.x, lz - DAMIAO.y) < 9 || Math.hypot(lx - TOCA.x, lz - TOCA.y) < 8 || Math.hypot(lx - PEDREIRA.x, lz - PEDREIRA.y) < 5) continue;
      if (this.circulos.some((c) => Math.hypot(c.x - ORIGEM_CIDADE.x - lx, c.z - ORIGEM_CIDADE.z - lz) < 4)) continue;
      const o = oliveira(900 + n);
      por(o, lx, lz, rnd() * Math.PI * 2);
      this.circulos.push({ x: o.position.x, z: o.position.z, r: 0.5 });
    }

    // as iscas da Gula
    ISCAS.forEach((d, i) => {
      const malha = isca(d.tipo);
      const pos = w(d.x, d.z);
      malha.position.copy(pos);
      this.grupo.add(malha);
      this.iscas.push({ id: `cidade_isca_${i + 1}`, tipo: d.tipo, pos, malha, pega: false });
    });
  }

  /** O lobo de Gubbio, com o corpo do Veloren. */
  async povoar() {
    const lobo = new Animal('lobo', this.toca.clone(), 3);
    await lobo.montar();
    lobo.semFuga = true;
    this.lobo = lobo;
    this.grupo.add(lobo.raiz);
  }

  /** Recoloca o que muda com o progresso (sombras, iscas, o leproso, São Damião e o lobo). */
  reiniciar(sombrasVencidas: Set<string>, flags: Set<string>) {
    for (const s of this.sombras) this.grupo.remove(s.raiz);
    this.sombras.length = 0;
    SOMBRAS_LOCAIS.forEach(([x, z], i) => {
      const id = `cidade_sombra_${i + 1}`;
      if (sombrasVencidas.has(id)) return;
      const p = new THREE.Vector3(x + ORIGEM_CIDADE.x, 0, z + ORIGEM_CIDADE.z);
      p.y = this.altura(p.x, p.z);
      const s = new Sombra(id, p);
      this.sombras.push(s);
      this.grupo.add(s.raiz);
    });
    for (const i of this.iscas) {
      i.pega = flags.has(i.id);
      i.malha.visible = !i.pega;
    }
    this.mostrarLeproso(flags.has('cidade_leproso'));
    let pedras = 0;
    for (let n = 1; n <= PEDRAS_DAMIAO; n++) if (flags.has(`cidade_pedra_${n}`)) pedras = n;
    this.definirEstagioDamiao(pedras);
    this.estadoLobo = flags.has('cidade_lobo') ? 'cidade' : 'toca';
    this.colocarLobo();
  }

  mostrarLeproso(curado: boolean) {
    this.leproso.raiz.visible = !curado;
    this.leprosoCurado.raiz.visible = curado;
  }

  /** O leproso que foi curado, ou o doente. */
  get homemDaEstrada() {
    return this.leproso.raiz.visible ? this.leproso : this.leprosoCurado;
  }

  get pedrasAssentadas() {
    return Math.max(0, this.estagioDamiao);
  }

  get damiaoPronto() {
    return this.estagioDamiao >= PEDRAS_DAMIAO;
  }

  /** Remonta a capelinha com `n` pedras assentadas (0 = ruína, 4 = de pé, com telhado e a cruz). */
  definirEstagioDamiao(n: number) {
    if (n === this.estagioDamiao) return;
    this.estagioDamiao = n;
    this.grupo.remove(this.malhaDamiao);
    this.malhaDamiao.geometry.dispose();
    this.malhaDamiao = saoDamiao(n);
    this.malhaDamiao.position.set(DAMIAO.x + ORIGEM_CIDADE.x, this.altura(DAMIAO.x + ORIGEM_CIDADE.x, DAMIAO.y + ORIGEM_CIDADE.z), DAMIAO.y + ORIGEM_CIDADE.z);
    this.malhaDamiao.rotation.y = Math.PI / 2; // a porta para o leste, para o caminho
    this.grupo.add(this.malhaDamiao);
    // paredes (com a porta a leste). A ruína baixa (até 1,5 m) não deixa passar; dá para entrar pela porta.
    for (const c of this.caixasDamiao) this.caixas.splice(this.caixas.indexOf(c), 1);
    const x0 = DAMIAO.x - 3.75 + ORIGEM_CIDADE.x, x1 = DAMIAO.x + 3.75 + ORIGEM_CIDADE.x;
    const z0 = DAMIAO.y - 2.75 + ORIGEM_CIDADE.z, z1 = DAMIAO.y + 2.75 + ORIGEM_CIDADE.z;
    const topo = this.altura(DAMIAO.x + ORIGEM_CIDADE.x, DAMIAO.y + ORIGEM_CIDADE.z) + 4;
    const zc = DAMIAO.y + ORIGEM_CIDADE.z;
    this.caixasDamiao = [
      { x0, x1, z0, z1: z0 + 0.3, topo },
      { x0, x1, z0: z1 - 0.3, z1, topo },
      { x0, x1: x0 + 0.3, z0, z1, topo },
      { x0: x1 - 0.3, x1, z0, z1: zc - 0.8, topo },
      { x0: x1 - 0.3, x1, z0: zc + 0.8, z1, topo },
    ];
    this.caixas.push(...this.caixasDamiao);
  }

  /** O lobo fez as pazes: vem junto do peregrino até a cidade. */
  pactoLobo() {
    this.estadoLobo = 'seguindo';
    this.colocarLobo();
  }

  private colocarLobo() {
    const l = this.lobo;
    if (!l) return;
    if (this.estadoLobo === 'cidade') {
      l.mudarCasa(this.fonte.clone().add(new THREE.Vector3(4, 0, 5)), 4);
      l.pos.copy(this.fonte).add(new THREE.Vector3(4, 0, 5));
      l.seguir = false;
    } else if (this.estadoLobo === 'toca') {
      l.mudarCasa(this.toca, 3);
      l.pos.copy(this.toca);
      l.seguir = false;
    } else l.seguir = true;
    l.semFuga = true;
  }

  /** O peregrino está dentro dos muros. */
  dentroDosMuros(p: THREE.Vector3) {
    const x = p.x - ORIGEM_CIDADE.x, z = p.z - ORIGEM_CIDADE.z;
    return x > MURO.x0 && x < MURO.x1 && z > MURO.z0 && z < MURO.z1;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.capela.atualizar(dt, jogador);
    for (const n of [this.francisco, this.homemDaEstrada, this.mercador, ...this.pobres.map((p) => p.npc)]) n.atualizar(dt, jogador);
    // as iscas giram e brilham
    for (const i of this.iscas) {
      if (i.pega) continue;
      i.malha.rotation.y = this.t * 0.8 + i.pos.x;
      i.malha.position.y = i.pos.y + 0.25 + Math.sin(this.t * 2 + i.pos.z) * 0.06;
      (i.malha.material as THREE.MeshLambertMaterial).emissive.setRGB(0.35 + Math.sin(this.t * 4 + i.pos.x) * 0.15, 0.22, 0.03);
    }
    const l = this.lobo;
    if (l) {
      l.atualizar(dt, this, jogador);
      // com o peregrino dentro dos muros, o lobo que o seguia fica morando na praça
      if (this.estadoLobo === 'seguindo' && this.dentroDosMuros(l.pos) && this.dentroDosMuros(jogador)) {
        this.estadoLobo = 'cidade';
        l.mudarCasa(this.fonte.clone().add(new THREE.Vector3(4, 0, 5)), 4);
        l.seguir = false;
      }
    }
  }

  // ───────────────────────────── terreno ─────────────────────────────

  private tipoEm(lx: number, lz: number) {
    const i = Math.floor(lx + META), j = Math.floor(lz + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 8;
    return this.tipo[i * TAM + j];
  }

  private base(x: number, z: number) {
    return 6 + (this.ruido.fbm(x * 0.02 + 5, z * 0.02 + 5, 3) - 0.5) * 4;
  }

  private gerarAlturas() {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const x = i - META + 0.5, z = j - META + 0.5;
        let h = this.base(x, z);
        let tipo = 0;
        // a colina da cidade: sobe até o pé dos muros
        const fora = Math.max(MURO.x0 - GROSSURA - x, x - MURO.x1 - GROSSURA, MURO.z0 - GROSSURA - z, z - MURO.z1 - GROSSURA, 0);
        h = h + (CHAO - h) * (1 - suave(0, 16, fora));
        if (fora > 0 && fora < 16) tipo = 8;
        // olivais e trigo na encosta sul
        if (z > 16 && fora > 3) tipo = this.ruido.fbm(x * 0.05 + 2, z * 0.05) > 0.47 ? 5 : 0;
        if (dentro(x, z, TRIGO)) tipo = 6;
        // estrada e caminhos (planos, com subida suave)
        const de = distLinha(x, z, ESTRADA);
        if (de < 1.6) tipo = 1;
        if (distLinha(x, z, CAMINHO_DAMIAO) < 1.1 || distLinha(x, z, CAMINHO_LOBO) < 1) tipo = 1;
        if (de < 4) {
          const subida = this.base(0, 62) + (CHAO - this.base(0, 62)) * suave(48, 15, z);
          h = h + (subida - h) * (1 - suave(1.5, 4, de));
        }
        // aplaina em volta de São Damião, do casebre e da pedreira
        for (const [p, r] of [[DAMIAO, 7], [CASEBRE, 4], [PEDREIRA, 5], [TOCA, 6]] as const) {
          const d = Math.hypot(x - p.x, z - p.y);
          if (d < r + 3) h = h + (this.base(p.x, p.y) - h) * (1 - suave(r, r + 3, d));
        }
        // dentro dos muros: chão plano, ruas e praça
        if (x >= MURO.x0 && x < MURO.x1 && z >= MURO.z0 && z < MURO.z1) {
          h = CHAO;
          tipo = 0;
          if (RUAS.some((r) => dentro(x, z, r))) tipo = 3;
          if (dentro(x, z, PRACA)) tipo = 4;
          if (Math.hypot(x - CAPELA_CIDADE.x, z - CAPELA_CIDADE.z - 7.5) < 3) tipo = 3;
        }
        // a muralha, com ameias, torres nos cantos e a porta ao sul
        const naMuralha = x >= MURO.x0 - GROSSURA && x < MURO.x1 + GROSSURA && z >= MURO.z0 - GROSSURA && z < MURO.z1 + GROSSURA &&
          !(x >= MURO.x0 && x < MURO.x1 && z >= MURO.z0 && z < MURO.z1);
        const porta = Math.abs(x) < 2.6 && z >= MURO.z1 && z < MURO.z1 + GROSSURA;
        if (naMuralha && !porta) {
          const canto = (Math.abs(x) > MURO.x1 - 2 && (z < MURO.z0 + 2 || z > MURO.z1 - 2)) || (Math.abs(x) < 6 && Math.abs(x) > 2.6 && z > MURO.z1 - 1);
          h = CHAO + 7 + (canto ? 4 : 0) + ((Math.floor(x) + Math.floor(z)) % 2 === 0 ? 1 : 0);
          tipo = 2;
        }
        if (porta) {
          h = CHAO;
          tipo = 1;
        }
        // montes na borda do mundo, com a estrada do sul
        const borda = Math.max(Math.abs(x), Math.abs(z));
        const corredor = z > 60 && Math.abs(x) < 3;
        if (borda > 64 && !corredor) {
          // perto da garganta do sul, as encostas descem em rampa até a estrada
          const garganta = z > 56 ? suave(3, 12, Math.abs(x)) : 1;
          h = Math.max(h, this.base(x, z) + (10 + Math.min(16, (borda - 64) * 2) + this.ruido.fbm(x * 0.1, z * 0.1) * 5) * garganta);
          tipo = 7;
        }
        if (corredor) {
          h = this.base(0, 62);
          tipo = 1;
        }
        this.alturas[i * TAM + j] = Math.round(h);
        this.tipo[i * TAM + j] = tipo;
      }
  }

  private corTopo(i: number, j: number, h: number) {
    const t = this.tipo[i * TAM + j];
    const x = i - META, z = j - META;
    switch (t) {
      case 1: return variar((i * 7 + j * 3) % 5 === 0 ? 0xb89870 : 0xcaa87a, i, h, j, 0.05);
      case 2: return variar(0xd8b8a4, i, h, j, 0.04);
      case 3: return variar((Math.floor(x / 1) + Math.floor(z / 1)) % 3 === 0 ? 0xa89a8c : 0xbcae9e, i, h, j, 0.04);
      case 4: {
        // lajes de ouro e de pedra clara, em xadrez largo, com frisos dourados
        const laje = (Math.floor(x / 3) + Math.floor(z / 3)) & 1;
        const friso = Math.abs(x % 3) < 0.6 || Math.abs(z % 3) < 0.6;
        return variar(friso ? 0xe0b440 : laje ? 0xecd4a0 : 0xf2e4c4, i, h, j, 0.03);
      }
      case 5: return variar(this.ruido.fbm(x * 0.2, z * 0.2) > 0.5 ? 0x9a9a5a : 0x8e9452, i, h, j, 0.05);
      case 6: return variar(Math.floor(z) % 2 ? 0xd8b860 : 0xceae54, i, h, j, 0.05);
      case 7: return variar(0x8a8274, i, h, j, 0.06);
      case 8: return variar(this.ruido.fbm(x * 0.08, z * 0.08) > 0.5 ? 0x8aa04a : 0x7e9444, i, h, j, 0.05);
      default: return variar(this.ruido.fbm(x * 0.06, z * 0.06) > 0.5 ? 0x94aa52 : 0x88a04a, i, h, j, 0.05);
    }
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    const t = this.tipo[i * TAM + j];
    if (t === 2) {
      const faixas = [0xdcbca8, 0xd0ac98, 0xe6cebe, 0xc8a290];
      return variar(faixas[(Math.floor(y / 1) + (Math.floor((i + j) / 3) & 1)) & 3], i, y, j, 0.04);
    }
    if (t === 7) return variar(y % 3 ? 0x857e72 : 0x948c80, i, y, j, 0.06);
    return prof === 0 ? topo : variar(prof < 2 ? 0x8a6a48 : 0x7a5c40, i, y, j, 0.05);
  }

  /** Burros e galinhas na cidade, ovelhas e cabras nos olivais, pombos e aves pelo céu. */
  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + ORIGEM_CIDADE.x, lz + ORIGEM_CIDADE.z];
    return [
      { especie: 'jumento', quantidade: 1, centro: c(-6, 30), raio: 4 },
      { especie: 'ovelha', quantidade: 5, centro: c(-22, 56), raio: 8 },
      { especie: 'cabra', quantidade: 2, centro: c(-50, 50), raio: 6 },
      { especie: 'galinha', quantidade: 4, centro: c(16, 46), raio: 4 },
      { especie: 'gato', quantidade: 2, centro: c(-20, 9), raio: 10 },
      { especie: 'cao', quantidade: 1, centro: c(20, 9), raio: 8 },
      { especie: 'ganso', quantidade: 2, centro: c(-36, 34), raio: 5 },
      { especie: 'corvo', quantidade: 2, centro: c(0, -20), raio: 20 },
      { especie: 'aguia', quantidade: 1, centro: c(0, 10), raio: 50 },
    ];
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_CIDADE.x - META, z0: ORIGEM_CIDADE.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        const lx = x - ORIGEM_CIDADE.x, lz = z - ORIGEM_CIDADE.z;
        const i = Math.floor(lx + META), j = Math.floor(lz + META);
        if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0x5a5448;
        if (this.capela.noMapa(x, z)) return 0xe8d0c0;
        for (const [x0, z0, larg, prof, , dourada] of CASAS) if (lx >= x0 && lx < x0 + larg && lz >= z0 && lz < z0 + prof) return dourada ? 0xd8a838 : 0xa85434;
        if (Math.abs(lx - PALACIO.x) < PALACIO.larg / 2 && Math.abs(lz - PALACIO.z) < PALACIO.prof / 2) return 0xe8c050;
        const h = this.alturas[i * TAM + j];
        const c = this.corTopo(i, j, h);
        const t = this.tipo[i * TAM + j];
        return t === 2 ? escurecer(c, 0.75) : t === 7 ? escurecer(c, 0.7) : c;
      },
    };
  }

  // ───────────────────────────── física ─────────────────────────────

  altura(x: number, z: number) {
    const p = this.capela?.piso(x, z);
    if (p != null) return p;
    const i = Math.floor(x - ORIGEM_CIDADE.x + META), j = Math.floor(z - ORIGEM_CIDADE.z + META);
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 99;
    return this.alturas[i * TAM + j];
  }

  /** As casas, o palácio e as paredes contam como blocos maciços para a câmera e para a mira. */
  alturaCamera(x: number, z: number) {
    let h = this.altura(x, z);
    // a porta da muralha é aberta no chão, mas o arco por cima é maciço: a câmera passa rente, por baixo dele
    const lx = x - ORIGEM_CIDADE.x, lz = z - ORIGEM_CIDADE.z;
    if (Math.abs(lx) < 2.6 && lz >= MURO.z1 && lz < MURO.z1 + GROSSURA) return CHAO + 12;
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
  }
}
