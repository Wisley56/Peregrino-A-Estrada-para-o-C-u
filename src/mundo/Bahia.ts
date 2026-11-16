import * as THREE from 'three';
import type { Povoamento } from '../fauna/Fauna';
import { Ruido, aleatorio } from '../core/Ruido';
import { variar } from '../voxel/Modelo';
import { Modelo } from '../voxel/Modelo';
import { Sombra } from '../entidades/Sombra';
import { Npc } from '../entidades/Npc';
import { DULCE, DULCE_COM_MENINO, SUPERIORA, menino } from '../entidades/Dulce';
import { Hospital } from './Hospital';
import { CapelaRegional, type EstiloCapela } from './Capela';
import { SalaDosMilagres } from './SalaDosMilagres';
import { LargoDoCruzeiro, type EventosLargo } from './LargoDoCruzeiro';
import type { DefNpc } from '../entidades/Npc';
import { ENFERMOS, corpoDoEnfermo, type DefEnfermo } from '../entidades/Enfermos';
import { FilaDePassantes } from '../entidades/Passantes';
import { figurinoDoPovo } from '../voxel/Humano';
import type { Alvo, Area } from './Area';
import { malhaDeColunas } from './Terreno';
import type { FonteMapa } from '../ui/Minimapa';
import { escurecer } from './PocoMeioDia';
import {
  CORES_CASARIO, CATEDRAL, IGREJA_BONFIM, IGREJA_ROSARIO, IGREJA_SAO_FRANCISCO, Juntador, ROT, armazem, canoa, casaAbandonada, mantimentos, casario, chafariz, coqueiro, esteira, muroDeFitas,
  conventoSantoAntonio, cruzeiroDePedra, elevadorLacerda, gradilDeFitas, igreja, mercadoModelo,
  mesaComGuardaSol, palafita, palmeiraImperial, pinguela, poste, saveiro, silhueta, type Frente,
} from './BahiaModelos';
import { NIVEL_MAR, ORIGENS } from './aberto/Geografia';

/**
 * As Ruas da Bahia (quarta região, de Santa Dulce dos Pobres): uma Salvador sem data exata, com o clima dos
 * anos 1940 e 1950. São duas áreas ligadas pelo Elevador Lacerda:
 *
 * - **Cidade Baixa** (`bahiabaixa`): chega-se de saveiro pela Rampa do Mercado Modelo. O Comércio, com os
 *   sobrados e o elevador encostado na escarpa; ao norte, a Península de Itapagipe: o Largo de Roma, o
 *   Convento de Santo Antônio e o galinheiro (que vira o hospital), a Colina Sagrada do Bonfim e, na enseada,
 *   as palafitas dos Alagados.
 * - **Cidade Alta** (`bahiaalta`): a Praça Tomé de Sousa no alto do elevador, a rua até o Terreiro de Jesus
 *   (chafariz, palmeiras, a Catedral), o Largo do Cruzeiro de São Francisco (a arena do Coração de Pedra) e a
 *   ladeira que desce ao Largo do Pelourinho e ao Rosário dos Pretos.
 *
 * Coordenadas locais em metros; +z é o sul. Ver docs/regioes/01-ruas-da-bahia.md.
 */

/** A superfície da baía: é o mar, no mesmo nível do resto do mundo. */
export const AGUA_BAHIA = NIVEL_MAR;
/** O chão da Cidade Baixa e o da Cidade Alta (o alto da escarpa). */
const CHAO = 4;
const PLANALTO = 30;
/** Quem anda não entra na água funda nem desce a escarpa. */
const PAREDE = 99;
/**
 * O fundo da água para quem anda nela: a água fica pela cintura do peregrino. Por enquanto ele vadeia; quando houver
 * natação, a água funda passa a ser nado.
 */
const FUNDO_VAU = AGUA_BAHIA - 1;

enum T {
  Terra, Rua, Calcada, Praca, Areia, Agua, Lama, Escarpa, Quarteirao, Cais, Adro, Baixa, Morro,
}

type Ret = [number, number, number, number]; // x0, z0, largura, profundidade
const dentro = (x: number, z: number, [x0, z0, w, d]: Ret) => x >= x0 && x < x0 + w && z >= z0 && z < z0 + d;

interface Caixa { x0: number; x1: number; z0: number; z1: number; topo: number }
/** Chão que não é do mapa de alturas: pinguelas, varandas, a ladeira e as escadarias. */
interface Piso { x0: number; x1: number; z0: number; z1: number; y: (x: number, z: number) => number }
/** Uma fileira de casarios ao longo de uma rua. */
interface Fileira { ret: Ret; frente: Frente; andares?: number; semente: number; esquina?: false }

/** A base comum das duas áreas: mapa de alturas de colunas de 1 m, água, caixas, pisos e casarios. */
abstract class MapaDaBahia implements Area {
  abstract readonly id: 'bahiabaixa' | 'bahiaalta';
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  protected readonly meta: number;
  protected alturas: Int16Array;
  protected tipo: Uint8Array;
  protected ruido = new Ruido(1949);
  protected caixas: Caixa[] = [];
  protected circulos: { x: number; z: number; r: number }[] = [];
  protected pisos: Piso[] = [];
  /** Retângulos (locais) dos prédios, com a cor deles no minimapa. */
  protected predios: { ret: Ret; cor: number }[] = [];
  protected juntador = new Juntador(40);
  protected t = 0;
  /** "Os que passam": as filas de vultos de pedra desta área. */
  readonly filas: FilaDePassantes[] = [];
  /** O peregrino leva um doente nas costas (o Jogo avisa a cada quadro): as filas param e abrem caminho. */
  alguemNasCostas = false;
  /** O que só aparece quando a cor volta (a vitória sobre o Coração de Pedra), e as caixas que vêm com isso. */
  protected depoisDaCor: THREE.Object3D[] = [];
  protected caixasDaCor: [Caixa, number][] = [];
  /** Os enfermos caídos nesta área, onde estão (o ponto da interação) e o corpo deitado. */
  readonly enfermos = new Map<string, { def: DefEnfermo; pos: THREE.Vector3; corpo: THREE.Object3D }>();

  constructor(protected readonly tam: number, readonly origem: THREE.Vector3) {
    this.meta = tam / 2;
    this.alturas = new Int16Array(tam * tam);
    this.tipo = new Uint8Array(tam * tam);
  }

  /** Gera o mapa de alturas e os tipos de chão (célula i, j ↔ local x, z). */
  protected abstract gerarChao(x: number, z: number): [number, T];

  protected montarTerreno() {
    for (let i = 0; i < this.tam; i++)
      for (let j = 0; j < this.tam; j++) {
        const [h, t] = this.gerarChao(i - this.meta + 0.5, j - this.meta + 0.5);
        this.alturas[i * this.tam + j] = Math.round(h);
        this.tipo[i * this.tam + j] = t;
      }
    const terreno = malhaDeColunas(this.tam, (i, j) => this.alturas[i * this.tam + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 40);
    terreno.position.copy(this.origem);
    this.grupo.add(terreno);
    // a baía: um plano grande até o horizonte (fica escondido sob a terra)
    const g = new THREE.PlaneGeometry(900, 900);
    g.rotateX(-Math.PI / 2);
    const agua = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x1e6a80, transparent: true, opacity: 0.84, emissive: 0x03202a }));
    agua.position.set(this.origem.x, AGUA_BAHIA, this.origem.z);
    agua.receiveShadow = true;
    this.grupo.add(agua);
  }

  // ───────────── ajudantes (coordenadas locais) ─────────────

  protected tipoEm(lx: number, lz: number) {
    const i = Math.floor(lx + this.meta), j = Math.floor(lz + this.meta);
    if (i < 0 || j < 0 || i >= this.tam || j >= this.tam) return T.Quarteirao;
    return this.tipo[i * this.tam + j] as T;
  }

  protected chaoLocal(lx: number, lz: number) {
    return this.altura(lx + this.origem.x, lz + this.origem.z);
  }

  /** Ponto do mundo a partir do local, no chão. */
  protected w(lx: number, lz: number, dy = 0) {
    const p = new THREE.Vector3(lx + this.origem.x, 0, lz + this.origem.z);
    p.y = this.altura(p.x, p.z) + dy;
    return p;
  }

  /** Põe um objeto no chão (ou na altura `y`), girado. Malhas de voxel vão para o juntador. */
  protected por(o: THREE.Object3D, lx: number, lz: number, rot = 0, y?: number, juntar = true) {
    o.position.set(lx + this.origem.x, y ?? this.chaoLocal(lx, lz), lz + this.origem.z);
    o.rotation.y = rot;
    if (juntar && o instanceof THREE.Mesh) this.juntador.add(o);
    else this.grupo.add(o);
    return o;
  }

  protected caixaLocal(x0: number, z0: number, larg: number, prof: number, topo = PAREDE) {
    this.caixas.push({ x0: x0 + this.origem.x, x1: x0 + larg + this.origem.x, z0: z0 + this.origem.z, z1: z0 + prof + this.origem.z, topo });
    return this;
  }

  protected pisoLocal(x0: number, z0: number, larg: number, prof: number, y: (lx: number, lz: number) => number) {
    const ox = this.origem.x, oz = this.origem.z;
    this.pisos.push({ x0: x0 + ox, x1: x0 + larg + ox, z0: z0 + oz, z1: z0 + prof + oz, y: (x, z) => y(x - ox, z - oz) });
  }

  protected circulo(lx: number, lz: number, r: number) {
    this.circulos.push({ x: lx + this.origem.x, z: lz + this.origem.z, r });
  }

  /** Uma fila de passantes num caminho (pontos locais). Sem velocidade, eles ficam parados fechando a passagem. */
  protected fila(pontos: [number, number][], quantos: number, velocidade = 1.1, fechado = false, semente = 1) {
    const caminho = pontos.map(([x, z]) => new THREE.Vector3(x + this.origem.x, 0, z + this.origem.z));
    const f = new FilaDePassantes(this.grupo, caminho, quantos, (x, z) => this.altura(x, z), velocidade, 1.4, fechado, semente);
    this.filas.push(f);
    return f;
  }

  /** Os enfermos desta área, cada um deitado numa esteira (ou no fundo de uma canoa, que a maré levou). */
  protected porEnfermos() {
    for (const def of ENFERMOS) {
      if (def.area !== this.id) continue;
      const [lx, lz, rot] = def.lugar;
      const grupo = new THREE.Group();
      let y: number;
      if (def.sobre === 'canoa') {
        y = AGUA_BAHIA - 0.05;
        grupo.add(canoa(700 + lx));
        grupo.add(corpoDoEnfermo(def, 'deitado', 0.25));
      } else {
        y = this.chaoLocal(lx, lz);
        grupo.add(esteira(), corpoDoEnfermo(def, 'deitado'));
      }
      this.por(grupo, lx, lz, rot, y, false);
      this.enfermos.set(def.id, { def, pos: new THREE.Vector3(lx + this.origem.x, y + 0.3, lz + this.origem.z), corpo: grupo });
    }
  }

  /** O enfermo está (ou não) caído no lugar dele. */
  mostrarEnfermo(id: string, visivel: boolean) {
    const e = this.enfermos.get(id);
    if (e) e.corpo.visible = visivel;
  }

  /** Um dos passantes empurrou o peregrino desde a última pergunta. */
  houveEmpurrao() {
    let e = false;
    for (const f of this.filas) {
      e ||= f.empurrou;
      f.empurrou = false;
    }
    return e;
  }

  alvos(): Alvo[] {
    return this.filas.flatMap((f) => f.passantes.filter((p) => p.ativo));
  }

  atingirLuz(p: THREE.Vector3) {
    return this.filas.some((f) => f.atingirLuz(p));
  }

  /**
   * Enche a fileira de sobrados de larguras sorteadas (5 a 7 m), cada um no chão da sua frente.
   * `chao`: altura do chão de cada casa (para as ladeiras); sem ela, o do mapa.
   */
  protected fileira(f: Fileira, chao?: (lx: number, lz: number) => number) {
    const [x0, z0, w, d] = f.ret;
    const rnd = aleatorio(f.semente);
    const aoLongoDeX = f.frente === 'n' || f.frente === 's';
    const comp = aoLongoDeX ? w : d, prof = aoLongoDeX ? d : w;
    let a = 0, n = 0;
    while (a < comp - 0.5) {
      let larg = 5 + Math.floor(rnd() * 3);
      if (comp - a - larg < 4.5) larg = comp - a;
      // as casas das pontas da fileira são de esquina (lado de fora com janelas). O lado "esq" do modelo é
      // o x local mínimo; com a frente para s ou o, ele fica no começo da fileira; para n ou e, no fim.
      const primeira = a === 0, ultima = a + larg >= comp - 0.01;
      const comeco = f.frente === 's' || f.frente === 'o' ? 'esq' : 'dir';
      const fim = comeco === 'esq' ? 'dir' : 'esq';
      const esquina = f.esquina === false ? undefined : primeira ? comeco : ultima ? fim : undefined;
      const lx = aoLongoDeX ? x0 + a + larg / 2 : x0 + w / 2;
      const lz = aoLongoDeX ? z0 + d / 2 : z0 + a + larg / 2;
      const larguraX = aoLongoDeX ? larg : prof, profZ = aoLongoDeX ? prof : larg;
      // a frente da casa: o lado do retângulo que dá para a rua
      const fx = f.frente === 'e' ? x0 + w : f.frente === 'o' ? x0 : lx;
      const fz = f.frente === 's' ? z0 + d : f.frente === 'n' ? z0 : lz;
      const y = chao ? chao(fx, fz) : this.chaoLocal(lx, lz);
      const malha = casario(f.semente * 31 + n, larguraX, profZ, f.frente, { andares: f.andares, fundacao: chao ? 14 : 8, esquina });
      this.por(malha, lx, lz, ROT[f.frente], y);
      this.caixaLocal(lx - larguraX / 2, lz - profZ / 2, larguraX, profZ);
      a += larg;
      n++;
    }
    this.predios.push({ ret: f.ret, cor: 0xb8603e });
  }

  /** Fecha o juntador: as malhas de voxel juntas vão para o grupo. */
  protected juntar() {
    for (const m of this.juntador.malhas()) this.grupo.add(m);
  }

  // ───────────── cores do chão ─────────────

  protected corTopo(i: number, j: number, h: number): number {
    const t = this.tipo[i * this.tam + j] as T;
    const x = i - this.meta, z = j - this.meta;
    switch (t) {
      case T.Rua: {
        // paralelepípedo: pedras cinzentas de tons diferentes
        const k = (Math.floor(x * 1.7) * 7 + Math.floor(z * 1.3) * 13) % 5;
        return variar([0x8a8680, 0x7a7670, 0x969088, 0x84807a, 0x6e6a64][Math.abs(k)], i, h, j, 0.05);
      }
      case T.Calcada: return variar(0xc8c0b0, i, h, j, 0.03);
      case T.Praca: {
        // pedra portuguesa: ondas pretas e brancas
        const onda = ((Math.floor(z * 0.6 + Math.sin(x * 0.4) * 1.8) % 5) + 5) % 5;
        return variar(onda === 0 ? 0x4a4a4c : 0xeae6dc, i, h, j, 0.02);
      }
      case T.Areia: return variar(0xe2d2a8, i, h, j, 0.04);
      case T.Agua: return variar(h < 1 ? 0x8a8a6a : 0xb8aa82, i, h, j, 0.05);
      case T.Lama: return variar(0x5a4a34, i, h, j, 0.06);
      case T.Escarpa: case T.Morro: return variar(this.ruido.fbm(x * 0.07, z * 0.07) > 0.5 ? 0x4a7a36 : 0x548440, i, h, j, 0.03);
      case T.Quarteirao: return variar(((Math.floor(x) + Math.floor(z * 0.5)) & 1) ? 0xb0583a : 0x9e4c32, i, h, j, 0.05);
      case T.Cais: return variar(0xb8b0a0, i, h, j, 0.04);
      case T.Adro: return variar((Math.floor(x / 2) + Math.floor(z / 2)) & 1 ? 0xe2dccc : 0xd4ccba, i, h, j, 0.02);
      case T.Baixa: return variar(((Math.floor(x / 3) + Math.floor(z / 4)) & 1) ? 0xa8583a : 0x8a8680, i, h, j, 0.06);
      default: return variar(this.ruido.fbm(x * 0.08, z * 0.08) > 0.55 ? 0x7a9a46 : 0x9a8a64, i, h, j, 0.05);
    }
  }

  protected corLado(i: number, y: number, j: number, prof: number, topo: number): number {
    const t = this.tipo[i * this.tam + j] as T;
    if (t === T.Escarpa || t === T.Morro) {
      // a escarpa: mato em manchas largas, com pedra e terra vermelha aparecendo aqui e ali
      const n = this.ruido.fbm(i * 0.07 + y * 0.09, j * 0.07, 3);
      return variar(n > 0.66 ? 0x8a8478 : n > 0.6 ? 0x9a5a3a : n > 0.45 ? 0x4a7a34 : 0x3e6a2e, i, y, j, 0.04);
    }
    if (t === T.Cais) return variar(y % 2 ? 0x8a8478 : 0x9a9488, i, y, j, 0.05);
    if (t === T.Quarteirao) {
      // as sobras das quadras viram empenas de casa: cores de casario em trechos de 6 m, faixa branca no alto
      if (prof === 0) return topo;
      if (prof === 1) return 0xf4f0e6;
      const k = Math.abs(Math.floor(i / 6) * 7 + Math.floor(j / 6) * 3) % CORES_CASARIO.length;
      return CORES_CASARIO[k];
    }
    return prof === 0 ? topo : variar(prof < 2 ? 0x8a6a48 : 0x7a5c40, i, y, j, 0.05);
  }

  // ───────────── física ─────────────

  altura(x: number, z: number) {
    for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) return p.y(x, z);
    const i = Math.floor(x - this.origem.x + this.meta), j = Math.floor(z - this.origem.z + this.meta);
    if (i < 0 || j < 0 || i >= this.tam || j >= this.tam) return this.foraDoMapa();
    const t = this.tipo[i * this.tam + j];
    if (t === T.Baixa) return PAREDE;
    if (t === T.Agua) return Math.max(this.alturas[i * this.tam + j], FUNDO_VAU);
    return this.alturas[i * this.tam + j];
  }

  /** A baía: a água fica no mesmo nível em toda parte (o fundo do vau a deixa pela cintura: vadeia-se, não se nada). */
  nivelAgua() {
    return AGUA_BAHIA;
  }

  /**
   * Fora do mapa. Na Cidade Baixa é o mar aberto, onde se vadeia como na baía; na Cidade Alta é o limite da área
   * (até o mundo aberto juntar as duas).
   */
  protected foraDoMapa() {
    return PAREDE;
  }

  /** Para a câmera e a mira: o chão de verdade (a água rasa, o fundo) e os prédios como blocos. */
  alturaCamera(x: number, z: number) {
    let h: number | undefined;
    for (const p of this.pisos) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) { h = p.y(x, z); break; }
    if (h === undefined) {
      const i = Math.floor(x - this.origem.x + this.meta), j = Math.floor(z - this.origem.z + this.meta);
      if (i < 0 || j < 0 || i >= this.tam || j >= this.tam) return AGUA_BAHIA;
      h = Math.max(this.alturas[i * this.tam + j], AGUA_BAHIA);
    }
    for (const b of this.caixas) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1 && b.topo > h) h = Math.min(b.topo, h + 14);
    return h;
  }

  colidir(pos: THREE.Vector3, raio: number) {
    for (const f of this.filas) f.colidir(pos, raio);
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

  fonteMapa(): FonteMapa {
    return {
      x0: this.origem.x - this.meta, z0: this.origem.z - this.meta, largura: this.tam, profundidade: this.tam,
      cor: (x, z) => {
        const lx = x - this.origem.x, lz = z - this.origem.z;
        const i = Math.floor(lx + this.meta), j = Math.floor(lz + this.meta);
        if (i < 0 || j < 0 || i >= this.tam || j >= this.tam) return 0x2a6a7a;
        for (const p of this.predios) if (dentro(lx, lz, p.ret)) return p.cor;
        const t = this.tipo[i * this.tam + j] as T;
        if (t === T.Agua) return 0x2a7a8a;
        const c = this.corTopo(i, j, this.alturas[i * this.tam + j]);
        return t === T.Escarpa || t === T.Quarteirao ? escurecer(c, 0.75) : c;
      },
    };
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    for (const f of this.filas) f.atualizar(dt, jogador, this.alguemNasCostas);
  }

  /**
   * A partir do save: os enfermos já recolhidos não estão mais caídos, e os que passam somem quando o Coração de
   * Pedra é vencido (a cidade volta a olhar para os lados).
   */
  reiniciar(_sombrasVencidas: Set<string>, flags: Set<string>) {
    for (const id of this.enfermos.keys()) this.mostrarEnfermo(id, !flags.has(`bahia_recolhido_${id}`));
    const cor = flags.has('bahia_coracao_vencido');
    for (const f of this.filas) f.visivel = !cor;
    for (const o of this.depoisDaCor) o.visible = cor;
    for (const [c, topo] of this.caixasDaCor) c.topo = cor ? topo : -PAREDE;
  }
}

// ═════════════════════════════ Cidade Baixa ═════════════════════════════

export const ORIGEM_BAHIA_BAIXA = ORIGENS.bahiabaixa;

/** Ruas (paralelepípedo) da Cidade Baixa. */
const RUAS_BAIXA: Ret[] = [
  [-8, -84, 8, 164], // a avenida: do Comércio até Itapagipe
  [0, 22, 54, 8], // a rua do elevador
  [26, 6, 6, 70], // a travessa
  [0, 50, 54, 6], // rua do sul
  [0, 0, 54, 6], // rua do norte
  [54, -10, 8, 90], // a rua junto à escarpa
  [-8, -44, 40, 4], // o caminho do Bonfim
];
const PRACA_CAIRU: Ret = [-22, 14, 14, 36];
const MERCADO: Ret = [-38, 26, 14, 16];
const RAMPA: Ret = [-48, 46, 6, 10];
const LARGO_ROMA: Ret = [0, -40, 30, 20];
const ELEVADOR_BAIXA = new THREE.Vector2(56, 26);
const COLINA: Ret = [32, -88, 26, 38];
const ADRO_BONFIM: Ret = [32, -58, 26, 8];
const ESCADARIA_BONFIM: Ret = [38, -50, 14, 8];
const ALTURA_COLINA = 8;
const GALINHEIRO = new THREE.Vector2(14, -49);
const CONVENTO = new THREE.Vector2(32, -32);
/** Onde Irmã Dulce aparece com o menino: na calçada da avenida, diante de uma porta que não se abriu. */
const DULCE_CALCADA = new THREE.Vector2(-1.6, 40);
/** O armazém do Comércio, na fachada de um sobrado da avenida (a porta dá para o oeste), onde o comerciante fica. */
const ARMAZEM = new THREE.Vector2(0, 33);
/** Onde o comerciante espera, à porta do convento, quando vem trazer a doação; e onde ela fica depois. */
const COMERCIANTE_CONVENTO = new THREE.Vector2(CONVENTO.x - 5.6, CONVENTO.y - 1.2);
const DOACAO = new THREE.Vector2(CONVENTO.x - 4.4, CONVENTO.y - 4.2);
/** A casa abandonada (o centro do cômodo), junto ao cais, com a porta para o leste. */
const CASA = new THREE.Vector2(-30, 12);
/** Onde Irmã Dulce fica em cada momento da história, e para onde olha. */
const LUGARES_DULCE = {
  calcada: [DULCE_CALCADA.x, DULCE_CALCADA.y, -Math.PI / 2],
  casa: [CASA.x + 1.4, CASA.y - 0.8, Math.PI / 2],
  casaFora: [CASA.x + 4.6, CASA.y - 1.6, 0.4],
  convento: [CONVENTO.x - 2.8, CONVENTO.y + 1.4, -Math.PI / 2],
  galinheiro: [GALINHEIRO.x + 3.4, GALINHEIRO.y + 1.2, 0],
  // no hospital, no corredor entre as duas fileiras de catres, de frente para a porta
  hospital: [GALINHEIRO.x - 1.5, GALINHEIRO.y - 0.15, 0],
} as const;
/** O médico voluntário, no corredor da enfermaria do hospital, olhando os catres do fundo. */
const MEDICO_LUGAR: [number, number, number] = [GALINHEIRO.x + 2.3, GALINHEIRO.y - 0.1, Math.PI];
const MEDICO: DefNpc = {
  id: 'medico_hospital',
  falante: 'medico',
  no: 'bahia_medico',
  rotulo: 'F: falar com o médico',
  visual: { genero: 'm', idade: 'adulto', pele: 0xb07a52, penteado: 'curto', corCabelo: 0x2a2420, barba: 'curta', traje: 'avental', cor: 0xf2f2ee, cor2: 0x3a3a44, acessorio: 'bolsa' },
};
/** A madre superiora, à porta do convento, ao sul da esteira do menino. */
const SUPERIORA_LUGAR: [number, number, number] = [CONVENTO.x - 2.6, CONVENTO.y - 4.6, -Math.PI / 2];
export type LugarDulce = keyof typeof LUGARES_DULCE;
/**
 * As esteiras do abrigo, à porta do convento, ao norte da porta (a do menino fica ao sul): uma por enfermo,
 * na ordem de ENFERMOS, ao longo da parede.
 */
const ABRIGO = (k: number): [number, number] => [CONVENTO.x - 2.4, CONVENTO.y + 3.8 + k * 2.3];
/** Os caminhos de Irmã Dulce: da calçada até a casa, e da casa até o convento, por ruas livres. */
const CAMINHOS_DULCE: Record<'casa' | 'convento' | 'galinheiro', [number, number][]> = {
  casa: [[-4, 26], [CASA.x + 4.6, CASA.y - 1.6]],
  convento: [[-4, 3], [-4, -28], [27, -28], [CONVENTO.x - 2.8, CONVENTO.y + 1.4]],
  // do convento ao galinheiro, entrando pela porta (que fica em +z)
  galinheiro: [[27, -37], [GALINHEIRO.x + 0.2, GALINHEIRO.y + 6.5], [GALINHEIRO.x + 0.2, GALINHEIRO.y + 2.4], [GALINHEIRO.x + 3.4, GALINHEIRO.y + 1.2]],
};

/** As quadras do Comércio: duas fileiras de sobrados de costas uma para a outra. */
const FILEIRAS_BAIXA: Fileira[] = [
  // cada quadra tem as fachadas para a avenida (ou a travessa) e para as duas ruas
  { ret: [0, 30, 10, 20], frente: 'o', semente: 31 }, { ret: [10, 30, 16, 10], frente: 'n', semente: 11 }, { ret: [10, 40, 16, 10], frente: 's', semente: 12 },
  { ret: [32, 30, 10, 20], frente: 'o', semente: 32 }, { ret: [42, 30, 12, 10], frente: 'n', semente: 13 }, { ret: [42, 40, 12, 10], frente: 's', semente: 14 },
  { ret: [0, 6, 10, 16], frente: 'o', semente: 33 }, { ret: [10, 6, 16, 8], frente: 'n', semente: 15 }, { ret: [10, 14, 16, 8], frente: 's', semente: 16 },
  { ret: [32, 6, 10, 16], frente: 'o', semente: 34 }, { ret: [42, 6, 12, 8], frente: 'n', semente: 17 }, { ret: [42, 14, 12, 8], frente: 's', semente: 18 },
  { ret: [0, 56, 10, 20], frente: 'o', semente: 35 }, { ret: [10, 56, 16, 10], frente: 'n', semente: 19 }, { ret: [32, 56, 22, 10], frente: 'n', semente: 20 },
  { ret: [10, 66, 44, 10], frente: 's', semente: 21, andares: 2 },
  // Itapagipe: casas baixas ao longo da avenida
  { ret: [0, -18, 8, 18], frente: 'o', semente: 22, andares: 1 }, { ret: [-16, -24, 8, 22], frente: 'e', semente: 23, andares: 1 },
  { ret: [0, -84, 8, 22], frente: 'o', semente: 24, andares: 1 },
];

/**
 * As palafitas dos Alagados, encostadas nas pinguelas: para onde dá a varanda, a posição ao longo da pinguela e a
 * linha (x ou z) da beira da pinguela em que a varanda encosta.
 */
const PALAFITAS: [Frente, number, number][] = [
  ['s', -18, -41], ['s', -33, -41], ['s', -50, -41],
  ['n', -20, -40], ['n', -32, -40], ['n', -40, -40], ['n', -52, -40],
  ['s', -32, -66], ['s', -50, -66], ['n', -36, -65], ['n', -52, -65],
  ['e', -72, -44.5], ['e', -54, -44.5], ['o', -74, -43.5], ['o', -56, -43.5],
  ['e', -56, -26.5], ['o', -52, -25.5],
];
/** As pinguelas (local): retângulos de 1 m de largura. */
const PINGUELAS: Ret[] = [
  [-56, -41, 44, 1], // a principal, da praia para o oeste
  [-26.5, -66, 1, 25], // ao norte
  [-44.5, -78, 1, 37],
  [-54, -66, 30, 1],
];
const ALTURA_PINGUELA = AGUA_BAHIA + 1.1;

/**
 * A nave do Senhor do Bonfim por dentro: cal branca, cantaria dourada, mármore claro em xadrez e os vitrais em
 * azul-claro e branco (o interior é do `interiorBonfim`: azulejo, talha dourada, tribunas, lustres, o teto pintado e
 * a Sala dos Milagres).
 */
const ESTILO_BONFIM: EstiloCapela = {
  reboco: 0xf6f4ee,
  pedra: 0xd2b880,
  telha: 0xa85a3a,
  cumeeira: 0x7a3022,
  madeira: 0x6a4428,
  madeiraEscura: 0x4a2c18,
  pisoA: 0xeee8dc,
  pisoB: 0xc8bea8,
  marmore: 0xf2eee6,
  tapete: 0x9a1f2a,
  vitral: [0x9ac8ec, 0xf2f6fa, 0xe8c45a, 0x6aa8d8, 0xd8e8f4],
  flores: [0xffffff, 0xf2d24a, 0xf2a0c8],
  embutida: true,
  interiorBonfim: true,
};

/** O capelão do Bonfim, que confessa na basílica: um padre idoso de batina preta, com o livro. */
const CAPELAO: DefNpc = {
  id: 'capelao_bonfim',
  falante: 'capelao',
  no: 'capela_confissao',
  visual: { genero: 'm', idade: 'idoso', pele: 0x9a6a48, penteado: 'calvo', corCabelo: 0xd8d4cc, traje: 'habito', cor: 0x1a1a1e, cor2: 0x2a2a30, acessorio: 'livro' },
};

export class BahiaBaixa extends MapaDaBahia {
  readonly id = 'bahiabaixa' as const;
  readonly chegada: THREE.Vector3;
  readonly elevador: THREE.Vector3;
  readonly mercado: THREE.Vector3;
  readonly galinheiro: THREE.Vector3;
  readonly convento: THREE.Vector3;
  readonly bonfim: THREE.Vector3;
  readonly alagados: THREE.Vector3;
  readonly saveiro: THREE.Vector3;
  /** Irmã Dulce: com o menino nos braços (a primeira aparição) e com os braços livres (depois do abrigo). */
  readonly dulce: Npc;
  readonly dulceComMenino: Npc;
  /** A madre superiora, à porta do convento: quem dá a licença para o galinheiro. */
  readonly superiora: Npc;
  /** O galinheiro, que vira enfermaria (e, depois da vitória, o hospital). */
  readonly hospital: Hospital;
  /** O médico voluntário, no hospital (só no terceiro estágio). */
  readonly medico: Npc;
  private circuloMedico!: { x: number; z: number; r: number };
  /** As paredes que colidem em cada estágio: as do galinheiro e enfermaria, e as do hospital (com o topo de cada). */
  private paredesGalinheiro: [Caixa, number][] = [];
  private paredesHospital: [Caixa, number][] = [];
  /** O dono da casa abandonada, que chega e expulsa Dulce e o menino. */
  readonly dono: Npc;
  /**
   * O comerciante do armazém (a cena do cuspe): à porta da loja; depois da resposta mansa, vai ao convento levar a
   * doação, e então volta para a loja.
   */
  readonly comerciante: Npc;
  /** A nave do Bonfim (confissão, comunhão, descanso) e a Sala dos Milagres; a fachada some com o peregrino dentro. */
  readonly capela: CapelaRegional;
  readonly salaDosMilagres: SalaDosMilagres;
  private bonfimFora!: THREE.Object3D;
  private circuloComerciante!: { x: number; z: number; r: number };
  private doacao!: THREE.Object3D;
  /** A porta da casa (por fora), o meio do cômodo (junto à esteira) e a porta do convento. */
  readonly casaPorta: THREE.Vector3;
  readonly casaDentro: THREE.Vector3;
  readonly conventoPorta: THREE.Vector3;
  private casaFechada!: THREE.Mesh;
  private casaAberta!: THREE.Mesh;
  private portaCasa!: Caixa;
  private meninoNaCasa!: THREE.Object3D;
  private meninoNoConvento!: THREE.Object3D;
  private circuloDulce!: { x: number; z: number; r: number };
  /** Os enfermos já recolhidos, deitados nas esteiras do abrigo. */
  private abrigados = new Map<string, THREE.Object3D>();
  /** Para onde Irmã Dulce está andando (o próximo ponto primeiro). */
  private rotaDulce: THREE.Vector3[] = [];

  constructor() {
    super(176, ORIGEM_BAHIA_BAIXA);
    this.montarTerreno();

    this.chegada = this.w(-40, 51);
    this.saveiro = this.w(-44, 51).setY(AGUA_BAHIA);
    this.elevador = this.w(ELEVADOR_BAIXA.x - 8.5, ELEVADOR_BAIXA.y);
    this.mercado = this.w(MERCADO[0] + MERCADO[2] + 2, MERCADO[1] + MERCADO[3] / 2);
    this.galinheiro = this.w(GALINHEIRO.x, GALINHEIRO.y + 5);
    this.convento = this.w(CONVENTO.x - 2, CONVENTO.y);
    this.bonfim = this.w(ADRO_BONFIM[0] + ADRO_BONFIM[2] / 2, ADRO_BONFIM[1] + 3);
    this.alagados = this.w(-10, -40.5);

    // a escadaria do Bonfim (degraus de 25 cm) e a ladeirinha da rampa do mercado
    const [ex, ez, ew, ed] = ESCADARIA_BONFIM;
    const degrau = (lz: number) => CHAO + Math.min(ALTURA_COLINA - CHAO, Math.ceil(((ez + ed - lz) / ed) * 16) * 0.25);
    this.pisoLocal(ex, ez, ew, ed, (_x, lz) => degrau(lz));
    const esc = new Modelo();
    for (let z = 0; z < ed * 4; z++) {
      const topo = Math.round((degrau(ez + (z + 0.5) / 4) - CHAO) * 4);
      esc.caixa(0, 0, z, ew * 4, topo, 1, (x, y) => (y === topo - 1 ? variar(0xe2dccc, x, y, z, 0.02) : variar(0xcac2b0, x, y, z, 0.03)));
    }
    this.por(esc.malha(0.25, [0, 0, 0]), ex, ez, 0, CHAO);

    for (const f of FILEIRAS_BAIXA) this.fileira(f);

    // o Mercado Modelo, de frente para a praça; a rotunda dá para o mar
    const [mx, mz, mw, md] = MERCADO;
    this.por(mercadoModelo(md, mw), mx + mw / 2, mz + md / 2, Math.PI / 2);
    this.caixaLocal(mx, mz, mw, md);
    this.circulo(mx - 0.5, mz + md / 2, 3.6);
    this.predios.push({ ret: MERCADO, cor: 0xeadcb4 });

    // o Elevador Lacerda, encostado na escarpa: a passarela sobe até a Cidade Alta
    this.por(elevadorLacerda(PLANALTO - CHAO, 5), ELEVADOR_BAIXA.x, ELEVADOR_BAIXA.y, 0, CHAO);
    this.caixaLocal(ELEVADOR_BAIXA.x - 6, ELEVADOR_BAIXA.y - 5, 12, 10);
    this.predios.push({ ret: [ELEVADOR_BAIXA.x - 6, ELEVADOR_BAIXA.y - 5, 12, 10], cor: 0xf2ecdf });
    // a Cidade Alta vista de baixo, no alto da escarpa
    for (let k = 0; k < 4; k++) this.por(silhueta(70 + k, 40, 10, 12), 64, -46 + k * 44, Math.PI / 2, PLANALTO);

    // o Convento de Santo Antônio e o galinheiro, no Largo de Roma
    this.por(conventoSantoAntonio(), CONVENTO.x, CONVENTO.y, -Math.PI / 2);
    this.caixaLocal(CONVENTO.x, CONVENTO.y - 4, 14, 8);
    this.caixaLocal(CONVENTO.x, CONVENTO.y + 4, 12, 20);
    this.predios.push({ ret: [CONVENTO.x, CONVENTO.y - 4, 14, 28], cor: 0xf4f0e8 });
    this.hospital = new Hospital(this.w(GALINHEIRO.x, GALINHEIRO.y));
    this.grupo.add(this.hospital.grupo);
    const parede = (lista: [Caixa, number][], [x0, z0, w, d]: Ret, topo: number) => {
      this.caixaLocal(GALINHEIRO.x + x0, GALINHEIRO.y + z0, w, d, topo);
      lista.push([this.caixas[this.caixas.length - 1], topo]);
    };
    for (const r of [[-5, -3.5, 10, 0.4], [-5, 3.1, 4, 0.4], [1.5, 3.1, 3.5, 0.4], [-5, -3.5, 0.4, 7], [4.6, -3.5, 0.4, 7]] as Ret[])
      parede(this.paredesGalinheiro, r, CHAO + 2.8);
    // o hospital: as paredes de fora (com o andar de cima), as divisórias com as passagens, a entrada curva, as
    // colunas e os vasos, e o pátio (mureta baixa, a mangueira e o banco)
    const ALTO = CHAO + 5.9, TERREO = CHAO + 3, MURETA = CHAO + 0.55;
    for (const r of [[-8.5, -3.5, 17, 0.3], [-8.5, 3.2, 7.75, 0.3], [0.75, 3.2, 7.75, 0.3], [-8.5, -3.5, 0.3, 7], [8.2, -3.5, 0.3, 7]] as Ret[])
      parede(this.paredesHospital, r, ALTO);
    for (const x of [-5, 5]) for (const r of [[x, -3.5, 0.25, 3], [x, 0.75, 0.25, 2.75]] as Ret[]) parede(this.paredesHospital, r, TERREO);
    for (const s of [-1, 1]) {
      for (const a of [0.55, 0.8, 1.05, 1.3, 1.55]) parede(this.paredesHospital, [s * Math.sin(a) * 2 - 0.15, 3.5 + Math.cos(a) * 2 - 0.15, 0.3, 0.3], CHAO + 2.9);
      parede(this.paredesHospital, [s * 1.7 - 0.15, 5.0, 0.3, 0.3], CHAO + 2.9);
      parede(this.paredesHospital, [s * 3.375 - 0.4, 3.85, 0.8, 0.8], CHAO + 0.8);
    }
    for (const r of [[12.75, -3.5, 0.25, 7], [8.5, -3.5, 4.5, 0.25], [8.5, 3.25, 1.5, 0.25], [11.5, 3.25, 1.5, 0.25]] as Ret[])
      parede(this.paredesHospital, r, MURETA);
    parede(this.paredesHospital, [10.75, -0.05, 0.5, 0.5], CHAO + 4); // o tronco da mangueira
    parede(this.paredesHospital, [9.5, -3.0, 2.3, 0.5], CHAO + 0.6); // o banco
    this.predios.push({ ret: [GALINHEIRO.x - 5, GALINHEIRO.y - 3.5, 10, 7], cor: 0x8a7458 });

    // o Bonfim, no alto da Colina Sagrada, de frente para o sul, com o gradil das fitas no adro
    // (a porta central é aberta: dentro está a nave, uma CapelaRegional embutida com a Sala dos Milagres ao lado)
    const bon = igreja(IGREJA_BONFIM, true);
    const bx = ADRO_BONFIM[0] + ADRO_BONFIM[2] / 2, bz = ADRO_BONFIM[1];
    this.bonfimFora = this.por(bon.malha, bx, bz, 0, ALTURA_COLINA, false);
    const lb = bon.largura / 2;
    this.caixaLocal(bx - lb, bz - 0.3, lb - 1, 0.55); // a fachada, dos dois lados da porta
    this.caixaLocal(bx + 1, bz - 0.3, lb - 1, 0.55);
    this.caixaLocal(bx - lb, bz - bon.comprimento, 0.3, bon.comprimento); // as paredes de fora
    this.caixaLocal(bx + lb - 0.3, bz - bon.comprimento, 0.3, bon.comprimento);
    this.caixaLocal(bx - lb, bz - bon.comprimento, bon.largura, bon.comprimento - 14.4); // o fundo (sacristia, coro)
    this.capela = new CapelaRegional(ESTILO_BONFIM, bx + this.origem.x, bz - 7.25 + this.origem.z, ALTURA_COLINA, CAPELAO);
    this.grupo.add(this.capela.grupo);
    this.caixas.push(...this.capela.caixas);
    for (const p of this.capela.pisos) this.pisos.push({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, y: () => p.altura });
    this.salaDosMilagres = new SalaDosMilagres(this.capela);
    this.predios.push({ ret: [bx - bon.largura / 2, bz - bon.comprimento, bon.largura, bon.comprimento], cor: 0xf6f4ee });
    for (const [x0, comp] of [[ADRO_BONFIM[0], ex - ADRO_BONFIM[0]], [ex + ew, ADRO_BONFIM[0] + ADRO_BONFIM[2] - ex - ew]] as const) {
      this.por(gradilDeFitas(500 + x0, comp), x0, ADRO_BONFIM[1] + ADRO_BONFIM[3] - 0.3, 0, ALTURA_COLINA);
      this.caixaLocal(x0, ADRO_BONFIM[1] + ADRO_BONFIM[3] - 0.5, comp, 0.4, ALTURA_COLINA + 1.2);
    }
    // e o gradil segue em volta de todo o alto da colina, dos dois lados da basílica e atrás dela: as fitinhas do
    // Senhor do Bonfim amarradas em toda a volta, um dos símbolos da Bahia
    const [cx0, cz0, cw] = COLINA, beira = 0.35, frente = ADRO_BONFIM[1] + ADRO_BONFIM[3] - 0.3;
    const lado = frente - (cz0 + beira);
    for (const x of [cx0 + beira, cx0 + cw - beira]) {
      this.por(gradilDeFitas(700 + x, lado), x, cz0 + beira, -Math.PI / 2, ALTURA_COLINA);
      this.caixaLocal(x - 0.2, cz0 + beira, 0.4, lado, ALTURA_COLINA + 1.2);
    }
    this.por(gradilDeFitas(760, cw - 2 * beira), cx0 + beira, cz0 + beira, 0, ALTURA_COLINA);
    this.caixaLocal(cx0 + beira, cz0 + beira - 0.2, cw - 2 * beira, 0.4, ALTURA_COLINA + 1.2);
    // e o paredão da colina, por fora, também coberto de fitas: os dois lados, os fundos e a frente, dos dois lados
    // da escadaria. Cada face desce até o chão (ou a água) que está diante dela.
    const fundoDe = (pts: [number, number][]) => Math.min(...pts.map(([x, z]) => this.chaoLocal(x, z)));
    const face = (x: number, z: number, rot: number, comp: number, pts: [number, number][]) => {
      const base = fundoDe(pts) - 0.3;
      this.por(muroDeFitas(820 + x + z * 3, comp, ALTURA_COLINA - base), x, z, rot, base);
    };
    const ao = (a: number, b: number, n = 8) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n);
    const czF = cz0 + COLINA[3];
    face(cx0 - 0.02, cz0, -Math.PI / 2, COLINA[3], ao(cz0, czF).map((z) => [cx0 - 0.8, z] as [number, number]));
    face(cx0 + cw + 0.02, czF, Math.PI / 2, COLINA[3], ao(cz0, czF).map((z) => [cx0 + cw + 0.8, z] as [number, number]));
    face(cx0 + cw, cz0 - 0.02, Math.PI, cw, ao(cx0, cx0 + cw).map((x) => [x, cz0 - 0.8] as [number, number]));
    face(cx0, czF + 0.02, 0, ex - cx0, ao(cx0, ex, 3).map((x) => [x, czF + 0.8] as [number, number]));
    face(ex + ew, czF + 0.02, 0, cx0 + cw - ex - ew, ao(ex + ew, cx0 + cw, 3).map((x) => [x, czF + 0.8] as [number, number]));
    for (const [x, z] of [[34, -50], [56, -50], [35, -85], [55, -85]]) {
      this.por(coqueiro(600 + x * 3 + z), x, z);
      this.circulo(x, z, 0.4);
    }

    // os Alagados: palafitas e pinguelas sobre a maré
    for (const [x0, z0, w, d] of PINGUELAS) {
      const longoX = w > d;
      const p = pinguela(x0 * 7 + z0, longoX ? w : d, 14);
      if (longoX) this.por(p, x0, z0 + 0.5, Math.PI / 2, ALTURA_PINGUELA);
      else this.por(p, x0 + 0.5, z0, 0, ALTURA_PINGUELA);
      this.pisoLocal(x0, z0, w, d, () => ALTURA_PINGUELA);
    }
    PALAFITAS.forEach(([frente, ao, beira], n) => {
      const p = palafita(300 + n, 14);
      // o centro do cômodo, recuado da beira da pinguela até a frente da varanda encostar nela
      const x = frente === 'e' ? beira - p.frenteZ : frente === 'o' ? beira + p.frenteZ : ao;
      const z = frente === 's' ? beira - p.frenteZ : frente === 'n' ? beira + p.frenteZ : ao;
      this.por(p.malha, x, z, ROT[frente], ALTURA_PINGUELA);
      // o varal e o vaso, que aparecem quando a cor volta
      this.depoisDaCor.push(this.por(p.enfeites, x, z, ROT[frente], ALTURA_PINGUELA, false));
      // o cômodo é maciço; a varanda é chão
      const meiaX = p.largura / 2, frenteZ = p.frenteZ, fundoZ = -(p.profundidade - p.frenteZ);
      const [ax, az, bx2, bz2] = girar(frente, -meiaX, fundoZ, meiaX, frenteZ);
      this.pisoLocal(x + ax, z + az, bx2 - ax, bz2 - az, () => ALTURA_PINGUELA);
      const [cx0, cz0, cx1, cz1] = girar(frente, -meiaX, fundoZ, meiaX, frenteZ - 1.3);
      this.caixaLocal(x + cx0, z + cz0, cx1 - cx0, cz1 - cz0);
      this.predios.push({ ret: [x + ax, z + az, bx2 - ax, bz2 - az], cor: 0x8a5a3a });
    });
    for (let k = 0; k < 6; k++) this.por(canoa(800 + k), -18 - k * 7, -52 + (k % 2) * 16, k * 0.7, AGUA_BAHIA - 0.05);

    // o saveiro na rampa, coqueiros no cais e na praça, postes
    this.por(saveiro(), -51, 51, 0.15, AGUA_BAHIA - 0.2);
    for (let z = -20; z < 78; z += 9) {
      if (z > 24 && z < 58) continue;
      this.por(coqueiro(900 + z), -40, z);
      this.circulo(-40, z, 0.4);
    }
    for (const [x, z] of [[-20, 16], [-10, 16], [-20, 48], [-10, 48], [-14, -26], [-24, -6], [-36, -14], [-30, 4], [6, -30], [24, -24]]) {
      this.por(coqueiro(950 + x * 5 + z), x, z);
      this.circulo(x, z, 0.4);
    }
    for (const [x, z] of [[-9, 20], [-9, 44], [-9, 30], [10, 22], [40, 22], [10, -36], [26, -36]]) {
      this.por(poste(), x, z, 0, undefined, false);
      this.circulo(x, z, 0.2);
    }

    // a casa abandonada junto ao cais: paredes sólidas, a porta pregada (até ser forçada) e o cômodo em que se entra.
    // Com a porta para o leste, o fundo do modelo (-z) fica a oeste e a largura dele corre ao longo de z.
    this.casaFechada = this.por(casaAbandonada(false), CASA.x, CASA.y, ROT.e, undefined, false) as THREE.Mesh;
    this.casaAberta = this.por(casaAbandonada(true), CASA.x, CASA.y, ROT.e, undefined, false) as THREE.Mesh;
    for (const c of [this.casaFechada, this.casaAberta]) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
    this.caixaLocal(CASA.x - 2.5, CASA.y - 3, 0.25, 6); // o fundo
    this.caixaLocal(CASA.x - 2.5, CASA.y - 3, 5, 0.25).caixaLocal(CASA.x - 2.5, CASA.y + 2.75, 5, 0.25); // os lados
    this.caixaLocal(CASA.x + 2.25, CASA.y - 3, 0.25, 2.25).caixaLocal(CASA.x + 2.25, CASA.y + 0.75, 0.25, 2.25); // a frente
    this.caixaLocal(CASA.x + 2.25, CASA.y - 0.75, 0.25, 1.5);
    this.portaCasa = this.caixas[this.caixas.length - 1];
    this.predios.push({ ret: [CASA.x - 2.5, CASA.y - 3, 5, 6], cor: 0xa89c84 });
    this.casaPorta = this.w(CASA.x + 3.6, CASA.y);
    this.casaDentro = this.w(CASA.x + 0.6, CASA.y + 0.6);
    this.conventoPorta = this.w(CONVENTO.x - 2.2, CONVENTO.y);
    // o menino deitado: na esteira da casa (até o dono chegar) e na esteira à porta do convento (depois)
    this.meninoNaCasa = this.por(menino('deitado'), CASA.x - 1.6, CASA.y + 1.4, 0, undefined, false);
    const est = this.por(esteira(), CONVENTO.x - 2.4, CONVENTO.y - 1.6, 0, undefined, false);
    this.meninoNoConvento = this.por(menino('deitado'), CONVENTO.x - 2.4, CONVENTO.y - 1.6, 0, undefined, false);
    this.meninoNoConvento.userData.esteira = est;

    // Irmã Dulce (o retrato vem do primeiro registro: o rosto dela sem o menino)
    this.dulce = new Npc(DULCE, this.w(DULCE_CALCADA.x, DULCE_CALCADA.y), -Math.PI / 2);
    this.dulceComMenino = new Npc(DULCE_COM_MENINO, this.w(DULCE_CALCADA.x, DULCE_CALCADA.y), -Math.PI / 2);
    this.grupo.add(this.dulce.raiz, this.dulceComMenino.raiz);
    this.circuloDulce = { x: 0, z: 0, r: 0.5 };
    this.circulos.push(this.circuloDulce);
    // o dono da casa: homem de posses, de terno claro e chapéu
    this.dono = new Npc(
      { id: 'dono_casa', falante: 'dono_casa', no: 'bahia_dono_depois', rotulo: 'F: falar com o dono da casa', visual: { ...figurinoDoPovo(77, 'rico'), genero: 'm', idade: 'adulto', barba: 'curta' } },
      this.w(CASA.x + 4.6, CASA.y + 1.2), -Math.PI / 2,
    );
    this.grupo.add(this.dono.raiz);
    // os esquecidos: caídos nos Alagados e junto ao Mercado; as esteiras do abrigo, à espera deles
    this.porEnfermos();
    ENFERMOS.forEach((def, k) => {
      const [x, z] = ABRIGO(k);
      const g = new THREE.Group();
      g.add(esteira(), corpoDoEnfermo(def, 'deitado'));
      this.abrigados.set(def.id, this.por(g, x, z, 0, undefined, false));
      g.visible = false;
    });
    // os que passam: em volta do Mercado (passando rente a Raimundo, sem olhar) e pela avenida
    this.fila([[-37, 23], [-22.6, 23], [-22.6, 44]], 5, 1.0, false, 1);
    this.fila([[-6, -20], [-6, 62]], 4, 1.1, false, 2);
    // o armazém do Comércio e o comerciante, de terno claro e colete, à porta
    this.por(armazem(), ARMAZEM.x - 0.05, ARMAZEM.y, ROT.o);
    this.circulo(ARMAZEM.x - 1.6, ARMAZEM.y - 1.6, 0.5);
    this.circulo(ARMAZEM.x - 1.4, ARMAZEM.y + 1.6, 0.5);
    this.comerciante = new Npc(
      {
        id: 'comerciante', falante: 'comerciante', no: 'bahia_comerciante', rotulo: 'F: falar com o dono do armazém',
        visual: { genero: 'm', idade: 'adulto', pele: 0xd8a888, penteado: 'curto', corCabelo: 0x2a2018, barba: 'curta', traje: 'tunica', cor: 0xe8e0cc, cor2: 0x6a5a48, acessorio: 'bolsa' },
      },
      this.w(ARMAZEM.x - 1.2, ARMAZEM.y), -Math.PI / 2,
    );
    this.grupo.add(this.comerciante.raiz);
    this.circuloComerciante = { x: 0, z: 0, r: 0.45 };
    this.circulos.push(this.circuloComerciante);
    this.doacao = this.por(mantimentos(), DOACAO.x, DOACAO.y, 0.3, undefined, false);
    // a madre superiora, à porta do convento
    this.superiora = new Npc(SUPERIORA, this.w(SUPERIORA_LUGAR[0], SUPERIORA_LUGAR[1]), SUPERIORA_LUGAR[2]);
    this.grupo.add(this.superiora.raiz);
    this.circulo(SUPERIORA_LUGAR[0], SUPERIORA_LUGAR[1], 0.45);
    // o médico voluntário, no hospital
    this.medico = new Npc(MEDICO, this.w(MEDICO_LUGAR[0], MEDICO_LUGAR[1]), MEDICO_LUGAR[2]);
    this.grupo.add(this.medico.raiz);
    this.circuloMedico = { x: this.medico.pos.x, z: this.medico.pos.z, r: 0.4 };
    this.circulos.push(this.circuloMedico);
    this.colocarComerciante('loja');
    this.colocarDulce('calcada', true);
    this.abrirCasa(false);
    this.deitarMenino(null);
    this.dono.raiz.visible = false;

    this.juntar();
  }

  /** A Dulce que está em cena: com o menino até ele ter abrigo. */
  get dulceEmCena() {
    return this.dulceComMenino.raiz.visible ? this.dulceComMenino : this.dulce;
  }

  mostrarDulce(comMenino: boolean) {
    this.dulceComMenino.raiz.visible = comMenino;
    this.dulce.raiz.visible = !comMenino;
  }

  /** Põe Irmã Dulce (as duas versões juntas) num dos lugares da história, parada. */
  colocarDulce(onde: LugarDulce, comMenino: boolean) {
    const [x, z, rumo] = LUGARES_DULCE[onde];
    const p = this.w(x, z);
    this.dulce.colocar(p, rumo);
    this.dulceComMenino.colocar(p, rumo);
    this.rotaDulce = [];
    this.mostrarDulce(comMenino);
  }

  /** Irmã Dulce, de braços livres, vai a pé até a casa, o convento ou o galinheiro. */
  dulceIr(para: 'casa' | 'convento' | 'galinheiro') {
    this.mostrarDulce(false);
    this.rotaDulce = CAMINHOS_DULCE[para].map(([x, z]) => this.w(x, z));
  }

  /** Ela já chegou aonde ia (e está a menos de `raio` metros de `p`). */
  dulcePerto(p: THREE.Vector3, raio: number) {
    return this.rotaDulce.length === 0 && this.dulceEmCena.pos.distanceTo(p) < raio;
  }

  abrirCasa(aberta: boolean) {
    this.casaFechada.visible = !aberta;
    this.casaAberta.visible = aberta;
    this.portaCasa.topo = aberta ? -PAREDE : PAREDE;
  }

  /** Onde o menino está deitado (ou em nenhuma esteira, quando está no colo ou nas costas de alguém). */
  deitarMenino(onde: 'casa' | 'convento' | null) {
    this.meninoNaCasa.visible = onde === 'casa';
    this.meninoNoConvento.visible = onde === 'convento';
  }

  override atualizar(dt: number, jogador: THREE.Vector3) {
    super.atualizar(dt, jogador);
    const d = this.dulceEmCena;
    if (this.rotaDulce.length) {
      // longe dos olhos do peregrino ela apressa o passo, para não o deixar esperando
      const vel = d.pos.distanceTo(jogador) > 16 ? 4.2 : 1.8;
      if (d.andarPara(this.rotaDulce[0], dt, (x, z) => this.altura(x, z), vel)) {
        this.rotaDulce.shift();
        if (!this.rotaDulce.length) {
          const fim = d.pos.clone();
          const lugar = (Object.keys(LUGARES_DULCE) as LugarDulce[]).find((k) => Math.hypot(LUGARES_DULCE[k][0] + this.origem.x - fim.x, LUGARES_DULCE[k][1] + this.origem.z - fim.z) < 0.3);
          if (lugar) d.colocar(fim, LUGARES_DULCE[lugar][2]);
        }
      }
      // as duas versões andam juntas
      const outra = d === this.dulce ? this.dulceComMenino : this.dulce;
      outra.colocar(d.pos, d.raiz.rotation.y);
    }
    this.circuloDulce.x = d.pos.x;
    this.circuloDulce.z = d.pos.z;
    d.atualizar(dt, jogador);
    if (this.dono.raiz.visible) this.dono.atualizar(dt, jogador);
    this.comerciante.atualizar(dt, jogador);
    this.superiora.atualizar(dt, jogador);
    if (this.medico.raiz.visible) this.medico.atualizar(dt, jogador);
    this.capela.atualizar(dt, jogador);
    this.salaDosMilagres.atualizar(jogador);
    this.bonfimFora.visible = !this.capela.dentro(jogador);
  }

  /** O comerciante à porta da loja ou à porta do convento (com a doação). */
  colocarComerciante(onde: 'loja' | 'convento') {
    const p = onde === 'loja' ? this.w(ARMAZEM.x - 1.2, ARMAZEM.y) : this.w(COMERCIANTE_CONVENTO.x, COMERCIANTE_CONVENTO.y);
    this.comerciante.colocar(p, onde === 'loja' ? -Math.PI / 2 : Math.PI / 2);
    this.circuloComerciante.x = p.x;
    this.circuloComerciante.z = p.z;
  }

  /** Um passo à frente da porta do armazém (onde o peregrino pede). */
  get armazemPorta() {
    return this.w(ARMAZEM.x - 3.2, ARMAZEM.y);
  }

  get comercianteNoConvento() {
    return this.comerciante.pos.distanceTo(this.w(COMERCIANTE_CONVENTO.x, COMERCIANTE_CONVENTO.y)) < 1;
  }

  mostrarDoacao(v: boolean) {
    this.doacao.visible = v;
  }

  /** Onde fica a esteira do enfermo no abrigo, à porta do convento. */
  posAbrigo(id: string) {
    const k = ENFERMOS.findIndex((e) => e.id === id);
    const [x, z] = ABRIGO(Math.max(0, k));
    return this.w(x, z);
  }

  /** O enfermo recolhido está (ou não) na esteira dele, no abrigo. */
  mostrarAbrigado(id: string, visivel: boolean) {
    const a = this.abrigados.get(id);
    if (a) a.visible = visivel;
  }

  /** A história de Dulce e do menino, a partir do save (o menino nas costas do peregrino não é guardado). */
  override reiniciar(sombrasVencidas: Set<string>, flags: Set<string>) {
    super.reiniciar(sombrasVencidas, flags);
    for (const id of this.abrigados.keys()) this.mostrarAbrigado(id, flags.has(`bahia_recolhido_${id}`));
    this.hospital.aplicar(flags);
    this.salaDosMilagres.aplicar(flags);
    // o hospital (depois da vitória): as paredes dele colidem no lugar das do galinheiro, e o médico está lá
    const hospital = flags.has('bahia_coracao_vencido');
    for (const [c, topo] of this.paredesGalinheiro) c.topo = hospital ? -PAREDE : topo;
    for (const [c, topo] of this.paredesHospital) c.topo = hospital ? topo : -PAREDE;
    this.medico.raiz.visible = hospital;
    this.circuloMedico.x = hospital ? this.medico.pos.x : 1e6;
    for (const id of this.abrigados.keys()) if (flags.has(`bahia_leito_${id}`)) this.mostrarAbrigado(id, false);
    // o comerciante: depois da resposta mansa ele está no convento com a doação, até entregá-la
    const doou = flags.has('bahia_comerciante_doou');
    this.colocarComerciante(flags.has('bahia_comerciante_manso') && !doou ? 'convento' : 'loja');
    this.mostrarDoacao(doou);
    const abrigado = flags.has('bahia_menino_abrigado'), expulsos = flags.has('bahia_casa_expulsos');
    this.abrirCasa(flags.has('bahia_casa_aberta'));
    this.dono.raiz.visible = expulsos && !abrigado;
    // depois da enfermaria, o menino está num catre dela
    const enfermaria = flags.has('bahia_enfermaria');
    if (abrigado) {
      this.colocarDulce(hospital ? 'hospital' : flags.has('bahia_galinheiro_licenca') ? 'galinheiro' : 'convento', false);
      this.deitarMenino(enfermaria ? null : 'convento');
    } else {
      this.colocarDulce(expulsos ? 'casaFora' : 'calcada', true);
      this.deitarMenino(null);
    }
    (this.meninoNoConvento.userData.esteira as THREE.Object3D).visible = abrigado && !enfermaria;
  }

  /** O menino foi para a esteira do convento: a esteira aparece com ele. */
  abrigarMenino() {
    this.deitarMenino('convento');
    (this.meninoNoConvento.userData.esteira as THREE.Object3D).visible = true;
  }

  /** O mar aberto, além da borda do mapa: vadeia-se como na baía. */
  protected override foraDoMapa() {
    return FUNDO_VAU;
  }

  protected gerarChao(x: number, z: number): [number, T] {
    // a escarpa e o alto dela, a leste
    if (x >= 62) return [PLANALTO, T.Escarpa];
    // o morro ao sul, fechando a cidade
    if (z >= 78) return [CHAO + Math.min(7, (z - 77) * 1.5) + this.ruido.fbm(x * 0.1, z * 0.1) * 2, T.Morro];
    // a Colina Sagrada do Bonfim
    if (dentro(x, z, COLINA)) {
      if (dentro(x, z, ADRO_BONFIM)) return [ALTURA_COLINA, T.Adro];
      if (dentro(x, z, ESCADARIA_BONFIM)) return [CHAO, T.Adro];
      if (z > ADRO_BONFIM[1] + ADRO_BONFIM[3]) return [CHAO + 2, T.Morro];
      return [ALTURA_COLINA, z < -84 || x < 34 || x > 56 ? T.Morro : T.Adro];
    }
    // o mar e a enseada dos Alagados
    const fundo = (d: number) => [Math.max(-1, 2 - Math.floor(d / 3)), T.Agua] as [number, T];
    if (z < -26 && x < -10) {
      const praia = x - -12; // de -12 para o oeste é água
      if (praia > 0) return [CHAO - 1, T.Areia];
      return x > -16 ? [2, T.Lama] : fundo(-12 - x);
    }
    if (dentro(x, z, RAMPA)) return [CHAO - 1, T.Cais];
    if (x < -42) return fundo(-42 - x);
    if (x < -38 && z > -26) return [CHAO, T.Cais];
    if (z < -26 && x < -8) return [CHAO - 1, T.Areia];
    // chão da cidade
    if (dentro(x, z, PRACA_CAIRU)) return [CHAO, T.Praca];
    if (dentro(x, z, LARGO_ROMA)) return [CHAO, T.Calcada];
    if (RUAS_BAIXA.some((r) => dentro(x, z, r))) return [CHAO, T.Rua];
    if (dentro(x, z, [32, 22, 22, 8])) return [CHAO, T.Praca]; // a pracinha do elevador
    if (z > 0 && x > -38) return [CHAO, T.Calcada];
    return [CHAO, T.Terra];
  }

  /** Galinhas no galinheiro, gatos e cães pelas ruas. */
  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + this.origem.x, lz + this.origem.z];
    return [
      { especie: 'galinha', quantidade: 5, centro: c(GALINHEIRO.x - 9, GALINHEIRO.y + 5), raio: 3 },
      { especie: 'gato', quantidade: 3, centro: c(14, 26), raio: 14 },
      { especie: 'cao', quantidade: 2, centro: c(-4, -10), raio: 12 },
    ];
  }
}

/** Gira um retângulo local (x0, z0)–(x1, z1) de um modelo com a frente `f` e devolve os cantos ordenados. */
function girar(f: Frente, x0: number, z0: number, x1: number, z1: number): [number, number, number, number] {
  const a = ROT[f];
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  const pts = [[x0, z0], [x1, z1]].map(([x, z]) => [x * c + z * s, -x * s + z * c]);
  return [Math.min(pts[0][0], pts[1][0]), Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1])];
}

// ═════════════════════════════ Cidade Alta ═════════════════════════════

export const ORIGEM_BAHIA_ALTA = ORIGENS.bahiaalta;

const BEIRA = -44; // a beira da escarpa, a oeste
const PRACA_TOME: Ret = [-44, 12, 18, 28];
const RUA_MISERICORDIA: Ret = [-26, 22, 18, 8];
const TERREIRO: Ret = [-8, 6, 24, 34];
const LARGO_CRUZEIRO: Ret = [16, 14, 28, 20];
const LADEIRA: Ret = [8, -36, 8, 42];
const LARGO_PELOURINHO: Ret = [-6, -56, 36, 20];
const CHAO_PELOURINHO = 22;
/** O beco ao lado do Rosário dos Pretos, onde João se escondeu; os que passam fecham a boca dele. */
const BECO: Ret = [2, -62, 4, 6];
const CRUZEIRO = new THREE.Vector2(30, 24);
const CHAFARIZ = new THREE.Vector2(4, 23);
const ELEVADOR_ALTA = new THREE.Vector2(-52, 26);

/** A altura da ladeira do Pelourinho: desce do Terreiro (z = 6) até o largo (z = -36). */
const alturaLadeira = (lz: number) => {
  const t = Math.min(1, Math.max(0, (LADEIRA[1] + LADEIRA[3] - lz) / LADEIRA[3]));
  return Math.round((PLANALTO - t * (PLANALTO - CHAO_PELOURINHO)) * 4) / 4;
};

const FILEIRAS_ALTA: Fileira[] = [
  // a Praça Tomé de Sousa e a rua até o Terreiro
  { ret: [-44, 4, 18, 8], frente: 's', semente: 41 }, { ret: [-44, 40, 18, 8], frente: 'n', semente: 42 },
  { ret: [-26, 12, 18, 10], frente: 's', semente: 43 }, { ret: [-26, 30, 18, 10], frente: 'n', semente: 44 },
  // o Terreiro de Jesus
  { ret: [-8, 40, 24, 9], frente: 'n', semente: 45 },
  // o Largo do Cruzeiro de São Francisco
  { ret: [16, 4, 28, 10], frente: 's', semente: 46 }, { ret: [16, 34, 28, 10], frente: 'n', semente: 47 },
  // a ladeira
  { ret: [-2, -36, 10, 24], frente: 'e', semente: 48 }, { ret: [16, -36, 10, 40], frente: 'o', semente: 49 },
  // o Largo do Pelourinho
  { ret: [-14, -56, 8, 20], frente: 'e', semente: 50 }, { ret: [30, -56, 8, 20], frente: 'o', semente: 51 },
  { ret: [-6, -62, 8, 6], frente: 's', semente: 52 }, { ret: [18, -62, 12, 6], frente: 's', semente: 53 },
];

export class BahiaAlta extends MapaDaBahia {
  readonly id = 'bahiaalta' as const;
  readonly chegada: THREE.Vector3;
  readonly elevador: THREE.Vector3;
  readonly chafariz: THREE.Vector3;
  readonly cruzeiro: THREE.Vector3;
  readonly saoFrancisco: THREE.Vector3;
  readonly pelourinho: THREE.Vector3;
  readonly rosario: THREE.Vector3;
  /** O Largo do Cruzeiro de São Francisco: a arena do Coração de Pedra, com os cinco enfermos. */
  readonly largo: LargoDoCruzeiro;

  constructor(eventosLargo: EventosLargo) {
    super(128, ORIGEM_BAHIA_ALTA);
    this.montarTerreno();
    this.pisoLocal(LADEIRA[0], LADEIRA[1], LADEIRA[2], LADEIRA[3], (_x, lz) => alturaLadeira(lz));

    this.chegada = this.w(BEIRA + 5, ELEVADOR_ALTA.y);
    this.elevador = this.w(BEIRA + 1.6, ELEVADOR_ALTA.y);
    this.chafariz = this.w(CHAFARIZ.x, CHAFARIZ.y);
    this.cruzeiro = this.w(CRUZEIRO.x, CRUZEIRO.y);
    this.saoFrancisco = this.w(LARGO_CRUZEIRO[0] + LARGO_CRUZEIRO[2] - 2, CRUZEIRO.y);
    this.pelourinho = this.w(12, -40);
    this.rosario = this.w(12, -50);

    // a ladeira: o calçamento de paralelepípedo em degraus de 25 cm
    const lad = new Modelo();
    const [lx0, lz0, lw, ld] = LADEIRA;
    for (let z = 0; z < ld * 4; z++) {
      const topo = Math.round((alturaLadeira(lz0 + (z + 0.5) / 4) - CHAO_PELOURINHO) * 4);
      for (let x = 0; x < lw * 4; x++) {
        const k = (Math.floor(x / 2) * 7 + Math.floor(z / 2) * 13) % 5;
        lad.caixa(x, topo - 6, z, 1, 6, 1, (_a, y) => (y === topo - 1 ? variar([0x8a8680, 0x7a7670, 0x969088, 0x84807a, 0x6e6a64][k], x, y, z, 0.04) : 0x6a6660));
      }
    }
    this.por(lad.malha(0.25, [0, 0, 0]), lx0, lz0, 0, CHAO_PELOURINHO);

    for (const f of FILEIRAS_ALTA) {
      const naLadeira = f.semente === 48 || f.semente === 49;
      this.fileira(f, naLadeira ? (_x, lz) => alturaLadeira(Math.min(LADEIRA[1] + LADEIRA[3], Math.max(LADEIRA[1], lz))) : undefined);
    }

    // as igrejas: a Catedral no Terreiro, São Francisco no fim do largo, o Rosário dos Pretos no Pelourinho
    const igr = (estilo: typeof CATEDRAL, x: number, z: number, frente: Frente, y: number, cor: number) => {
      const g = igreja(estilo);
      this.por(g.malha, x, z, ROT[frente], y);
      const [a, b, c, d] = girar(frente, -g.largura / 2, -g.comprimento, g.largura / 2, 0);
      this.caixaLocal(x + a, z + b, c - a, d - b);
      this.predios.push({ ret: [x + a, z + b, c - a, d - b], cor });
    };
    igr(CATEDRAL, -1, TERREIRO[1], 's', PLANALTO, 0xeae2d0);
    igr(IGREJA_SAO_FRANCISCO, LARGO_CRUZEIRO[0] + LARGO_CRUZEIRO[2], CRUZEIRO.y, 'o', PLANALTO, 0xd8b880);
    igr(IGREJA_ROSARIO, 12, LARGO_PELOURINHO[1] + 4, 's', CHAO_PELOURINHO, 0x4a7ac8);

    // o chafariz e o cruzeiro
    this.por(chafariz(), CHAFARIZ.x, CHAFARIZ.y);
    this.circulo(CHAFARIZ.x, CHAFARIZ.y, 4.8);
    this.por(cruzeiroDePedra(), CRUZEIRO.x, CRUZEIRO.y);
    this.circulo(CRUZEIRO.x, CRUZEIRO.y, 1.4);

    // a arena: o colosso dorme sob o chão do largo, a leste do cruzeiro; os cinco nos degraus e nas soleiras
    const [ax, az, aw, ad] = LARGO_CRUZEIRO, o = this.origem;
    this.largo = new LargoDoCruzeiro(
      this.sombras,
      { x0: ax + o.x, x1: ax + aw + o.x, z0: az + o.z, z1: az + ad + o.z },
      this.w(CRUZEIRO.x + 6, CRUZEIRO.y),
      this.w(CRUZEIRO.x, CRUZEIRO.y),
      ([[CRUZEIRO.x - 1.9, CRUZEIRO.y - 1.2, Math.PI / 2], [CRUZEIRO.x + 0.6, CRUZEIRO.y + 2.1, 0], [21, LARGO_CRUZEIRO[1] + 0.9, Math.PI / 2], [38, LARGO_CRUZEIRO[1] + 0.9, -Math.PI / 2], [25, LARGO_CRUZEIRO[1] + LARGO_CRUZEIRO[3] - 1.1, Math.PI / 2]] as [number, number, number][])
        .map(([x, z, r]) => [x + o.x, z + o.z, r]),
      eventosLargo,
    );
    this.largo.assentar((x, z) => this.altura(x, z));
    this.grupo.add(this.largo.grupo);

    // palmeiras-imperiais e postes no Terreiro e na praça
    for (const [x, z] of [[-5, 9], [13, 9], [-5, 37], [13, 37], [-41, 15], [-41, 37], [-29, 37]]) {
      this.por(palmeiraImperial(1000 + x * 7 + z), x, z);
      this.circulo(x, z, 0.45);
    }
    for (const [x, z] of [[-2, 16], [10, 16], [-2, 30], [10, 30], [20, 18], [40, 18], [20, 30], [40, 30], [-36, 20], [-36, 34], [2, -44], [22, -44]]) {
      this.por(poste(), x, z, 0, undefined, false);
      this.circulo(x, z, 0.2);
    }

    // quando a cor volta: as mesinhas com guarda-sol vermelho nos dois lados do Largo do Pelourinho
    for (const [x, z] of [[-2.5, -49], [-2.5, -42], [26.5, -49], [26.5, -42]]) {
      this.depoisDaCor.push(this.por(mesaComGuardaSol(x * 13 + z), x, z, 0, undefined, false));
      this.caixaLocal(x - 0.45, z - 0.45, 0.9, 0.9, CHAO_PELOURINHO + 0.9);
      this.caixasDaCor.push([this.caixas[this.caixas.length - 1], CHAO_PELOURINHO + 0.9]);
    }

    // os esquecidos do Pelourinho, e os que passam: em volta do Terreiro e parados na boca do beco
    this.porEnfermos();
    this.fila([[-6, 10], [14, 10], [14, 36], [-6, 36]], 5, 1.0, true, 3);
    this.fila([[BECO[0] + 0.8, BECO[1] + BECO[3] - 0.4], [BECO[0] + 2, BECO[1] + BECO[3] - 0.4], [BECO[0] + 3.2, BECO[1] + BECO[3] - 0.4]], 3, 0, false, 4);

    // o Elevador Lacerda: sobe da Cidade Baixa até a beira da praça; uma balaustrada fecha a escarpa
    this.por(elevadorLacerda(PLANALTO - CHAO, 5), ELEVADOR_ALTA.x, ELEVADOR_ALTA.y, 0, CHAO);
    this.caixaLocal(BEIRA - 0.6, -this.meta, 0.6, this.tam);
    const bal = new Modelo();
    for (let z = 0; z < PRACA_TOME[3] * 4; z++) {
      if (Math.abs(PRACA_TOME[1] + z / 4 - ELEVADOR_ALTA.y) < 1.6) continue;
      bal.ponto(0, 3, z, 0xf2eee4).ponto(0, 0, z, 0xf2eee4);
      if (z % 2 === 0) bal.caixa(0, 1, z, 1, 2, 1, 0xe8e2d6);
    }
    this.por(bal.malha(0.25, [0, 0, 0]), BEIRA - 0.25, PRACA_TOME[1], 0, PLANALTO);
    // a Cidade Baixa lá embaixo, e o porto
    for (const [k, z0, comp] of [[0, -64, 40], [1, -22, 32], [2, 40, 24]]) this.por(silhueta(90 + k, comp, 14, 10), BEIRA - 2, z0, -Math.PI / 2, CHAO);

    this.juntar();
  }

  protected gerarChao(x: number, z: number): [number, T] {
    if (x < BEIRA - 2) return [CHAO, T.Baixa];
    if (x < BEIRA) return [PLANALTO, T.Escarpa];
    if (dentro(x, z, PRACA_TOME) || dentro(x, z, TERREIRO)) return [PLANALTO, T.Praca];
    if (dentro(x, z, RUA_MISERICORDIA) || dentro(x, z, LARGO_CRUZEIRO)) return [PLANALTO, T.Rua];
    if (dentro(x, z, LADEIRA)) return [Math.floor(alturaLadeira(z)) - 1, T.Rua];
    if (dentro(x, z, LARGO_PELOURINHO) || dentro(x, z, BECO)) return [CHAO_PELOURINHO, T.Rua];
    // o chão sob as casas é o da rua da frente; o resto da quadra são telhados
    const sob = FILEIRAS_ALTA.find((f) => dentro(x, z, f.ret));
    if (sob) {
      if (sob.semente === 48 || sob.semente === 49) return [Math.floor(alturaLadeira(Math.max(LADEIRA[1], z))) - 2, T.Calcada];
      return [sob.semente >= 50 ? CHAO_PELOURINHO : PLANALTO, T.Calcada];
    }
    // o resto das quadras são telhados, que descem junto com a ladeira
    const chao = z < LADEIRA[1] ? CHAO_PELOURINHO : z < LADEIRA[1] + LADEIRA[3] ? alturaLadeira(z) : PLANALTO;
    return [Math.round(chao) + 7, T.Quarteirao];
  }

  override reiniciar(sombrasVencidas: Set<string>, flags: Set<string>) {
    super.reiniciar(sombrasVencidas, flags);
    this.largo.reiniciar(sombrasVencidas, flags);
  }

  override atualizar(dt: number, jogador: THREE.Vector3) {
    super.atualizar(dt, jogador);
    this.largo.atualizar(dt, jogador);
  }

  /** Gatos nos telhados baixos e um cão no Terreiro. */
  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + this.origem.x, lz + this.origem.z];
    return [
      { especie: 'gato', quantidade: 3, centro: c(28, 24), raio: 10 },
      { especie: 'cao', quantidade: 1, centro: c(4, 30), raio: 8 },
    ];
  }
}
