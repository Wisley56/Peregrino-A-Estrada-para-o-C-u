import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { materialVoxel } from '../voxel/Malha';
import { carregarVox, geometriaVox } from '../voxel/Vox';
import { Fisica } from '../entidades/Peregrino';
import type { Povoamento } from '../fauna/Fauna';
import { Sombra } from '../entidades/Sombra';
import type { DefNpc } from '../entidades/Npc';
import { CAPELA, JARDIM, LAGO, NIVEL_AGUA, PASSAGEM, Terreno, estradaX } from './Terreno';
import { JardimDeAgostinho } from './Jardim';
import { construirCruzeiro, construirEntradaCripta, construirPlaca, construirVeu } from './Cenario';
import { Area } from './Area';
import { CapelaRegional, ESTILO_VALE } from './Capela';
import type { FonteMapa } from '../ui/Minimapa';
import { escurecer } from './PocoMeioDia';

interface Circulo { x: number; z: number; r: number }
/** `baixa`: só os pequenos passam (a porta estreita do jardim de Agostinho, para quem vai de joelhos). */
interface Caixa { x0: number; x1: number; z0: number; z1: number; topo: number; baixa?: boolean }

const V = 'assets/veloren/';
const SPRITE = 1 / 11; // escala dos sprites do Veloren (voxel de 1/11 de bloco)

/** Folhas das árvores do Veloren usam índices especiais da paleta; damos cor com variação. */
/** Lado (m) das células da pegada das árvores. */
const CELULA_PE = 0.5;
/**
 * Pegada sólida de uma árvore: as células de 0,5 m onde o tronco ou as raízes tocam o chão e sobem mais de
 * 0,6 m (os pinheiros grandes do Veloren têm raízes que se abrem até ~4 m do tronco). Os galhos baixos não
 * tocam o chão e ficam de fora. Devolve os centros das células, no espaço do modelo.
 */
const pegadas = new Map<THREE.BufferGeometry, [number, number][]>();
function pegada(g: THREE.BufferGeometry) {
  let lista = pegadas.get(g);
  if (lista) return lista;
  const pos = g.getAttribute('position');
  const chave = (x: number, z: number) => `${Math.floor(x / CELULA_PE + 1e-3)},${Math.floor(z / CELULA_PE + 1e-3)}`;
  const noChao = new Set<string>();
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.05) noChao.add(chave(pos.getX(i), pos.getZ(i)));
  const topo = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 3) continue;
    const k = chave(pos.getX(i), pos.getZ(i));
    if (noChao.has(k)) topo.set(k, Math.max(topo.get(k) ?? 0, y));
  }
  lista = [];
  for (const [k, y] of topo)
    if (y > 0.6) {
      const [a, b] = k.split(',').map(Number);
      lista.push([(a + 0.5) * CELULA_PE, (b + 0.5) * CELULA_PE]);
    }
  pegadas.set(g, lista);
  return lista;
}

export function folhas(base: number, variacao: number) {
  const c = new THREE.Color(base);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  // poucos tons (em manchas largas) para o greedy meshing conseguir juntar faces
  const tons = [-1, 0, 1].map((n) => new THREE.Color().setHSL(hsl.h + n * 0.015, hsl.s, hsl.l + n * variacao));
  return (x: number, y: number, z: number) => {
    const n = Math.sin(x * 0.9 + y * 0.5 + z * 0.7) * 0.6 + Math.sin(x * 0.35 - z * 0.45 + y * 0.8) * 0.6;
    return tons[n < -0.35 ? 0 : n > 0.35 ? 2 : 1];
  };
}

/** Padre da capela do Vale: batina preta e estola roxa (a cor da penitência), breviário na mão. */
const PADRE: DefNpc = {
  id: 'padre_vale',
  falante: 'padre',
  no: 'capela_confissao',
  visual: { genero: 'm', idade: 'idoso', pele: 0xe2b896, penteado: 'calvo', corCabelo: 0xd8d4cc, traje: 'habito', cor: 0x1c1a20, cor2: 0x6a3088, acessorio: 'livro' },
};

export class Mundo implements Fisica, Area {
  readonly id = 'vale' as const;
  readonly nivelMinimo = NIVEL_AGUA;
  readonly grupo = new THREE.Group();
  readonly terreno = new Terreno();
  readonly sombras: Sombra[] = [];
  private circulos: Circulo[] = [];
  private caixas: Caixa[] = [];
  /** Células sólidas (troncos e raízes), em espaço do mundo, numa grade de CELULA_PE. */
  private solidas = new Set<number>();

  readonly inicio: THREE.Vector3;
  readonly fogueira: THREE.Vector3;
  readonly cruzeiro: THREE.Vector3;
  /** A capela do Vale, com o padre que confessa. */
  readonly capela: CapelaRegional;
  /** O jardim murado de Santo Agostinho, com a porta estreita. */
  readonly jardim: JardimDeAgostinho;
  /** O peregrino está de joelhos (o jogo avisa a cada quadro): a porta estreita deixa passar. */
  pequeno = false;
  readonly luzFogueira = new THREE.PointLight(0xff9a40, 8, 10, 1.5);
  readonly entradaCripta: THREE.Vector3;
  readonly veu: THREE.Vector3;
  readonly fimPassagem: THREE.Vector3;
  private malhaVeu: THREE.Mesh;
  private caixaVeu: Caixa;
  /** 0 = intacto, sobe até 1 enquanto se desfaz. */
  private desfazendoVeu = -1;
  private t = 0;

  constructor() {
    this.grupo.add(this.terreno.malha, this.terreno.agua);
    const h = (x: number, z: number) => this.terreno.altura(x, z);

    const zi = 47;
    this.inicio = new THREE.Vector3(estradaX(zi), h(estradaX(zi), zi), zi);
    this.fogueira = new THREE.Vector3(estradaX(zi) + 3.6, 0, zi - 1);
    this.fogueira.y = h(this.fogueira.x, this.fogueira.z);
    this.cruzeiro = new THREE.Vector3(estradaX(12) + 4.2, 0, 12);
    this.cruzeiro.y = h(this.cruzeiro.x, this.cruzeiro.z);
    const hc = h(CAPELA.x, CAPELA.y);

    // capela: nave com bancos, presbitério, sacrário e confessionário em que se entra
    this.capela = new CapelaRegional(ESTILO_VALE, CAPELA.x, CAPELA.y, hc, PADRE);
    this.grupo.add(this.capela.grupo);
    this.caixas.push(...this.capela.caixas);

    // o jardim de Agostinho, à direita da estrada
    this.jardim = new JardimDeAgostinho(h(JARDIM.x, JARDIM.z));
    this.grupo.add(this.jardim.grupo, this.jardim.agostinho.raiz);
    this.caixas.push(...this.jardim.caixas);
    this.circulos.push(...this.jardim.circulos);

    // cruzeiro
    const cruz = construirCruzeiro();
    cruz.position.copy(this.cruzeiro);
    this.grupo.add(cruz);
    this.circulos.push({ x: this.cruzeiro.x, z: this.cruzeiro.z, r: 0.85 });

    this.luzFogueira.position.copy(this.fogueira).add(new THREE.Vector3(0, 1, 0));
    this.grupo.add(this.luzFogueira);
    this.circulos.push({ x: this.fogueira.x, z: this.fogueira.z, r: 0.8 });

    // entrada da cripta, no adro da capela
    this.entradaCripta = new THREE.Vector3(CAPELA.x + 7.5, hc, CAPELA.y + 1);
    const arco = construirEntradaCripta();
    arco.position.copy(this.entradaCripta);
    this.grupo.add(arco);
    const e = this.entradaCripta;
    this.caixas.push(
      { x0: e.x - 1.75, x1: e.x - 1, z0: e.z - 1.5, z1: e.z + 1.5, topo: hc + 4 },
      { x0: e.x + 1, x1: e.x + 1.75, z0: e.z - 1.5, z1: e.z + 1.5, topo: hc + 4 },
      { x0: e.x - 1.75, x1: e.x + 1.75, z0: e.z - 1.5, z1: e.z + 0.6, topo: hc + 4 },
    );

    // véu de trevas na passagem do oeste
    this.veu = new THREE.Vector3(PASSAGEM.veu, 0, PASSAGEM.z);
    this.veu.y = h(this.veu.x, this.veu.z);
    this.malhaVeu = construirVeu(6, 5);
    this.malhaVeu.position.copy(this.veu).add(new THREE.Vector3(0, -0.5, 0));
    this.grupo.add(this.malhaVeu);
    this.caixaVeu = { x0: this.veu.x - 0.6, x1: this.veu.x + 0.6, z0: this.veu.z - 3, z1: this.veu.z + 3, topo: this.veu.y + 6 };
    this.caixas.push(this.caixaVeu);
    this.fimPassagem = new THREE.Vector3(PASSAGEM.fim + 2.5, 0, PASSAGEM.z + 1.4);
    this.fimPassagem.y = h(this.fimPassagem.x, this.fimPassagem.z);
    const placa = construirPlaca();
    placa.position.copy(this.fimPassagem);
    placa.rotation.y = Math.PI / 2;
    this.grupo.add(placa);
  }

  get veuAberto() {
    return this.desfazendoVeu >= 0;
  }

  /** Começa a desfazer o véu (com animação) ou o remove de vez, ao carregar um save. */
  abrirVeu(imediato = false) {
    if (this.desfazendoVeu >= 0) return;
    this.desfazendoVeu = imediato ? 1 : 0;
    this.caixas.splice(this.caixas.indexOf(this.caixaVeu), 1);
    if (imediato) this.malhaVeu.visible = false;
  }

  /** Volta a fechar o véu (outro jogo salvo carregado depois de voltar à tela inicial). */
  fecharVeu() {
    if (this.desfazendoVeu < 0) return;
    this.desfazendoVeu = -1;
    if (!this.caixas.includes(this.caixaVeu)) this.caixas.push(this.caixaVeu);
    const v = this.malhaVeu;
    v.visible = true;
    v.scale.set(1, 1, 1);
    const mat = v.material as THREE.MeshLambertMaterial;
    mat.opacity = 0.88;
    mat.emissive.setHex(0x1a0d33);
  }

  atualizar(dt: number, jogador?: THREE.Vector3) {
    this.t += dt;
    if (jogador) {
      this.capela.atualizar(dt, jogador);
      this.jardim.atualizar(dt, jogador);
    }
    const v = this.malhaVeu;
    if (this.desfazendoVeu < 0) {
      v.scale.set(1 + Math.sin(this.t * 2.1) * 0.15, 1 + Math.sin(this.t * 1.3) * 0.03, 1);
      (v.material as THREE.MeshLambertMaterial).opacity = 0.8 + Math.sin(this.t * 3) * 0.08;
    } else if (this.desfazendoVeu < 1) {
      this.desfazendoVeu = Math.min(1, this.desfazendoVeu + dt / 1.6);
      const k = this.desfazendoVeu;
      v.scale.set(1 + k * 2, 1 - k * 0.9, 1);
      (v.material as THREE.MeshLambertMaterial).opacity = 0.88 * (1 - k);
      (v.material as THREE.MeshLambertMaterial).emissive.setRGB(k, k * 0.85, k * 0.5);
      if (k >= 1) v.visible = false;
    }
  }

  /** Carrega os modelos .vox do Veloren e espalha a vegetação. */
  async povoar(sombrasVencidas: Set<string>) {
    const geo = async (arq: string, escala: number, recolorir?: Parameters<typeof geometriaVox>[1]['recolorir']) =>
      geometriaVox(await carregarVox(V + arq), { escala, recolorir });

    const folhaComum = folhas(0x4f9a3a, 0.06);
    const folhaPinho = folhas(0x2f6a3c, 0.05);
    const [pinheiros, pequenas, alamos, pedras, gramas, flores, fogueira] = await Promise.all([
      Promise.all([1, 2, 3, 4].map((i) => geo(`arvores/pinheiro_${i}.vox`, 0.34, { 2: folhaPinho }))),
      Promise.all([1, 2, 3, 4].map((i) => geo(`arvores/pequena_${i}.vox`, 0.3, { 1: folhaComum }))),
      Promise.all([1, 2, 3].map((i) => geo(`arvores/alamo_${i}.vox`, 0.17, { 1: folhas(0x5aa848, 0.06) }))),
      Promise.all([0, 1, 2].map((i) => geo(`pedras/rock-${i}.vox`, SPRITE * 1.8))),
      Promise.all(['grass_short_1', 'grass_short_2', 'grass_med_1', 'grass_med_2', 'grass_long_1'].map((n) => geo(`grama/${n}.vox`, SPRITE))),
      Promise.all(['flower_blue_1', 'flower_red_1', 'flower_white_1', 'flower_yellow-0', 'flower_pink_1', 'flower_purple_1', 'sunflower_1'].map((n) => geo(`flores/${n}.vox`, SPRITE))),
      geo('objetos/fogueira.vox', SPRITE),
    ]);

    const fog = new THREE.Mesh(fogueira, materialVoxel);
    fog.position.copy(this.fogueira);
    fog.castShadow = true;
    this.grupo.add(fog);

    // instâncias agrupadas por modelo e por célula de 24 m, para o descarte por câmera (e por sombra) funcionar
    const CELULA = 24;
    const lotes = new Map<string, { g: THREE.BufferGeometry; mats: THREE.Matrix4[] }>();
    const idGeo = new Map<THREE.BufferGeometry, number>();
    const rnd = aleatorio(4242);
    const por = (g: THREE.BufferGeometry, x: number, z: number, escala = 1, solida = false) => {
      const angulo = rnd() * Math.PI * 2;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, this.terreno.altura(x, z), z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angulo),
        new THREE.Vector3(escala, escala, escala),
      );
      // árvores cujas raízes cairiam na estrada, na passagem ou na água não nascem
      if (solida && !this.marcarPegada(g, x, z, angulo, escala, (wx, wz) => livre(wx, wz, 0))) return;
      if (!idGeo.has(g)) idGeo.set(g, idGeo.size);
      const chave = `${idGeo.get(g)}|${Math.floor(x / CELULA)}|${Math.floor(z / CELULA)}`;
      let lote = lotes.get(chave);
      if (!lote) lotes.set(chave, (lote = { g, mats: [] }));
      lote.mats.push(m);
    };

    const livre = (x: number, z: number, margem: number) => {
      const h = this.terreno.altura(x, z);
      if (h <= 3) return false;
      for (let dx = -margem; dx <= margem; dx += margem || 1)
        for (let dz = -margem; dz <= margem; dz += margem || 1) if (this.terreno.pesoEstrada(x + dx, z + dz) > 0.05) return false;
      if (Math.hypot(x - CAPELA.x, z - CAPELA.y) < 15) return false;
      if (Math.max(Math.abs(x - JARDIM.x), Math.abs(z - JARDIM.z)) < JARDIM.meio + 2.5) return false;
      if (Math.hypot(x - this.inicio.x, z - this.inicio.z) < 6) return false;
      if (Math.hypot(x - this.cruzeiro.x, z - this.cruzeiro.z) < 3) return false;
      if (x < PASSAGEM.entrada + 3 && Math.abs(z - PASSAGEM.z) < 3.5) return false;
      if (Math.abs(Math.abs(x - estradaX(z))) < 4 && z > CAPELA.y && z < 56) return false;
      return true;
    };

    const pegar = <T,>(l: T[]) => l[Math.floor(rnd() * l.length)];
    for (let x = -66; x < 66; x += 3)
      for (let z = -66; z < 66; z += 3) {
        const px = x + rnd() * 2.6, pz = z + rnd() * 2.6;
        const h = this.terreno.altura(px, pz);
        const borda = Math.max(Math.abs(px), Math.abs(pz));
        const dLago = Math.hypot(px - LAGO.x, (pz - LAGO.y) * 1.3);
        const r = rnd();
        if (!livre(px, pz, 2)) {
          if (livre(px, pz, 0) && r < 0.5) por(pegar(gramas), px, pz);
          continue;
        }
        if (borda > 63) continue; // atrás das montanhas ninguém vê
        if ((borda > 52 || (h > 17 && Math.hypot(px - CAPELA.x, pz - CAPELA.y) > 20)) && r < 0.5) {
          const g = pegar(pinheiros), e = 0.85 + rnd() * 0.4;
          por(g, px, pz, e, true);
        } else if (dLago < 24 && dLago > 15 && r < 0.3) {
          const g = pegar(alamos), e = 0.9 + rnd() * 0.3;
          por(g, px, pz, e, true);
        } else if (borda < 50 && r < 0.07) {
          const g = pegar(pequenas), e = 0.9 + rnd() * 0.4;
          por(g, px, pz, e, true);
        } else if (r < 0.12) {
          por(pegar(pedras), px, pz, 0.8 + rnd() * 0.8);
        } else if (r < 0.5) {
          por(pegar(gramas), px, pz);
          if (rnd() < 0.6) por(pegar(gramas), px + 1, pz + 0.6);
        } else if (r < 0.72) {
          por(pegar(flores), px, pz);
        }
      }

    for (const { g, mats } of lotes.values()) {
      const inst = new THREE.InstancedMesh(g, materialVoxel, mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      const grande = (g.boundingBox?.max.y ?? 0) > 1.5;
      inst.castShadow = grande;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.grupo.add(inst);
    }

    this.reporSombras(sombrasVencidas);
  }

  /** (Re)cria as sombras que roubaram as cores do vale, menos as já vencidas (ao carregar um save). */
  reporSombras(sombrasVencidas: Set<string>) {
    for (const s of this.sombras) this.grupo.remove(s.raiz);
    this.sombras.length = 0;
    const lugares = [28, 16, 2, -10, -22];
    lugares.forEach((z, i) => {
      const id = `vale_sombra_${i + 1}`;
      if (sombrasVencidas.has(id)) return;
      const lado = i % 2 ? -6 : 6;
      const casa = new THREE.Vector3(estradaX(z) + lado, 0, z);
      casa.y = Math.max(this.terreno.altura(casa.x, casa.z), NIVEL_AGUA);
      const s = new Sombra(id, casa);
      this.sombras.push(s);
      this.grupo.add(s.raiz);
    });
  }

  altura(x: number, z: number) {
    return this.capela.piso(x, z) ?? this.terreno.altura(x, z);
  }

  /** O Vale é pastoril: rebanho no prado, bichos do mato nas bordas, patos no lago e aves no céu. */
  povoamento(): Povoamento[] {
    return [
      { especie: 'ovelha', quantidade: 6, centro: [-28, 24], raio: 9 },
      { especie: 'cabra', quantidade: 3, centro: [-44, -8], raio: 9 },
      { especie: 'coelho', quantidade: 4, centro: [18, 42], raio: 13 },
      { especie: 'lebre', quantidade: 2, centro: [-12, 48], raio: 10 },
      { especie: 'esquilo', quantidade: 3, centro: [30, -24], raio: 11 },
      { especie: 'raposa', quantidade: 1, centro: [42, -38], raio: 10 },
      { especie: 'cervo', quantidade: 2, centro: [-40, -36], raio: 10 },
      { especie: 'pato', quantidade: 4, centro: [LAGO.x, LAGO.y], raio: 8 },
      { especie: 'sapo', quantidade: 2, centro: [LAGO.x - 9, LAGO.y + 2], raio: 4 },
      { especie: 'corvo', quantidade: 3, centro: [8, 6], raio: 24 },
      { especie: 'aguia', quantidade: 1, centro: [CAPELA.x, CAPELA.y], raio: 38 },
      { especie: 'coruja', quantidade: 1, centro: [CAPELA.x + 11, CAPELA.y + 6], raio: 5 },
    ];
  }

  fonteMapa(): FonteMapa {
    const t = this.terreno;
    return {
      x0: -80, z0: -80, largura: 160, profundidade: 160,
      cor: (x, z) => {
        const h = t.altura(x, z);
        if (h >= 99) return 0x3a3428;
        if (h <= NIVEL_AGUA + 0.05 && Math.hypot(x - LAGO.x, (z - LAGO.y) * 1.3) < 16) return 0x3a7ac0;
        if (this.capela.noMapa(x, z)) return 0xe8dcc4; // a capela
        if (this.jardim.noMapa(x, z)) return 0xb9ae98; // o muro do jardim de Agostinho
        if (t.pesoEstrada(x, z) > 0.35) return 0xc8a46a;
        const borda = Math.max(Math.abs(x), Math.abs(z));
        if (borda > 58 && h > 12) return escurecer(0x8a8274, 0.7 + Math.min(1, (h - 12) / 30) * 0.4);
        return escurecer(0x5a9a40, 0.7 + Math.min(h, 24) / 48);
      },
    };
  }

  /** Marca a pegada de uma árvore girada e escalada (cada célula vira quatro cantos + o centro). Sem lugar, não marca e devolve false. */
  private marcarPegada(g: THREE.BufferGeometry, x: number, z: number, angulo: number, escala: number, pode: (x: number, z: number) => boolean) {
    const c = Math.cos(angulo), s = Math.sin(angulo);
    const m = CELULA_PE * 0.45;
    const celulas: number[] = [];
    for (const [lx, lz] of pegada(g))
      for (const [ox, oz] of [[0, 0], [-m, -m], [m, -m], [-m, m], [m, m]]) {
        const ax = (lx + ox) * escala, az = (lz + oz) * escala;
        // rotação em Y do three.js: x' = x cos + z sen, z' = -x sen + z cos
        const wx = x + ax * c + az * s, wz = z - ax * s + az * c;
        if (!pode(wx, wz)) return false;
        celulas.push(chaveSolida(Math.floor(wx / CELULA_PE), Math.floor(wz / CELULA_PE)));
      }
    for (const k of celulas) this.solidas.add(k);
    return true;
  }

  colidir(pos: THREE.Vector3, raio: number) {
    // o Vale não tem mais parede invisível: quem segura são as montanhas da borda (íngremes demais para subir);
    // sai-se pelo desfiladeiro do oeste, ou por onde a serra deixar
    // troncos e raízes: empurra para fora de cada célula sólida que o círculo toca
    const i0 = Math.floor((pos.x - raio) / CELULA_PE), i1 = Math.floor((pos.x + raio) / CELULA_PE);
    const k0 = Math.floor((pos.z - raio) / CELULA_PE), k1 = Math.floor((pos.z + raio) / CELULA_PE);
    for (let i = i0; i <= i1; i++)
      for (let k = k0; k <= k1; k++) {
        if (!this.solidas.has(chaveSolida(i, k))) continue;
        const x0 = i * CELULA_PE, z0 = k * CELULA_PE;
        const qx = Math.min(Math.max(pos.x, x0), x0 + CELULA_PE), qz = Math.min(Math.max(pos.z, z0), z0 + CELULA_PE);
        const dx = pos.x - qx, dz = pos.z - qz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= raio * raio) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x = qx + (dx / d) * raio;
          pos.z = qz + (dz / d) * raio;
        } else {
          // o centro caiu dentro da célula: sai pelo lado mais perto
          const e = [pos.x - x0, x0 + CELULA_PE - pos.x, pos.z - z0, z0 + CELULA_PE - pos.z];
          const j = e.indexOf(Math.min(...e));
          if (j === 0) pos.x = x0 - raio;
          else if (j === 1) pos.x = x0 + CELULA_PE + raio;
          else if (j === 2) pos.z = z0 - raio;
          else pos.z = z0 + CELULA_PE + raio;
        }
      }
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
      if (pos.y >= b.topo || (b.baixa && this.pequeno)) continue;
      const x0 = b.x0 - raio, x1 = b.x1 + raio, z0 = b.z0 - raio, z1 = b.z1 + raio;
      if (pos.x <= x0 || pos.x >= x1 || pos.z <= z0 || pos.z >= z1) continue;
      const empurros = [pos.x - x0, x1 - pos.x, pos.z - z0, z1 - pos.z];
      const k = empurros.indexOf(Math.min(...empurros));
      if (k === 0) pos.x = x0;
      else if (k === 1) pos.x = x1;
      else if (k === 2) pos.z = z0;
      else pos.z = z1;
    }
  }
}

function chaveSolida(i: number, k: number) {
  return (i + 4096) * 8192 + (k + 4096);
}
