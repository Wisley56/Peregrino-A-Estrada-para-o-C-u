import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Sombra } from '../entidades/Sombra';
import { Guardiao } from '../entidades/Guardiao';
import { Alvo, Area } from './Area';
import { lamparinaModelo } from './Cenario';
import type { FonteMapa } from '../ui/Minimapa';

/**
 * Cripta dos Primeiros Peregrinos (primeira "dungeon").
 * Grade de células de 1 m; cada célula tem uma altura de chão (0 = piso, 4 = parede).
 * O peregrino não sobe mais de 1 bloco, então paredes, portões e pedestais bloqueiam sozinhos.
 *
 *   Relicário ─(porta R)─ Arena do Guardião
 *                              │ porta A (fecha durante a luta)
 *                              │ portão G (abre com os 3 braseiros)
 *                         Sala das Lâmpadas
 *                              │
 *                         Entrada (escada para a capela)
 */
const W = 32, H = 40;
export const ORIGEM = new THREE.Vector3(400, 0, 400);
const PAREDE = 4;
const PEDESTAL = 1.2;
const VOX = 0.5;
const TEMPO_CHAMA = 14;

type Retangulo = [number, number, number, number]; // x0, z0, x1, z1 (inclusive)

const SALAS: Retangulo[] = [
  [2, 2, 8, 8], // relicário
  [11, 1, 26, 10], // arena
  [17, 11, 19, 13], // corredor norte (porta A em z=11, portão G em z=13)
  [8, 14, 28, 25], // sala das lâmpadas
  [17, 26, 19, 29], // corredor sul
  [12, 30, 24, 36], // entrada
];
const PILARES: Retangulo[] = [
  [11, 17, 12, 18], [24, 17, 25, 18], [11, 21, 12, 22], [24, 21, 25, 22], // sala das lâmpadas
  [14, 4, 14, 4], [23, 4, 23, 4], [14, 8, 14, 8], [23, 8, 23, 8], // arena
];
const PORTA_RELICARIO: Retangulo = [9, 4, 10, 6];
const PORTA_ARENA: Retangulo = [17, 11, 19, 11];
const PORTAO_LAMPADAS: Retangulo = [17, 13, 19, 13];

/** Centro de uma célula em coordenadas do mundo. */
const mundo = (x: number, z: number, y = 0) => new THREE.Vector3(ORIGEM.x + x + 0.5, y, ORIGEM.z + z + 0.5);

class Portao {
  readonly malha: THREE.Mesh;
  aberto: boolean;
  private alvoY: number;

  constructor(private cripta: Cripta, private r: Retangulo, aberto: boolean, cor = 0x3a3a44) {
    const [x0, z0, x1, z1] = r;
    const w = (x1 - x0 + 1) / VOX, d = (z1 - z0 + 1) / VOX;
    const m = new Modelo();
    for (let x = 0; x < w; x++)
      for (let z = 0; z < d; z++)
        for (let y = 0; y < PAREDE / VOX; y++) {
          const barra = w > d ? x % 2 === 0 : z % 2 === 0;
          const faixa = y === 1 || y === 5 || y === 7;
          if (barra || faixa) m.ponto(x, y, z, faixa ? 0x55535e : variar(cor, x, y, z, 0.05));
        }
    this.malha = m.malha(VOX, [0, 0, 0]);
    this.malha.position.copy(mundo(x0, z0)).add(new THREE.Vector3(-0.5, 0, -0.5));
    this.aberto = aberto;
    this.alvoY = aberto ? -PAREDE : 0;
    this.malha.position.y = this.alvoY;
    this.malha.visible = !aberto;
    cripta.marcar(r, aberto ? 0 : PAREDE);
  }

  abrir() {
    if (this.aberto) return;
    this.aberto = true;
    this.alvoY = -PAREDE;
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    this.alvoY = 0;
    this.malha.visible = true;
    this.cripta.marcar(this.r, PAREDE);
  }

  atualizar(dt: number) {
    const y = this.malha.position.y;
    if (y === this.alvoY) return;
    const passo = (this.aberto ? 2.2 : 9) * dt;
    this.malha.position.y = this.alvoY < y ? Math.max(this.alvoY, y - passo) : Math.min(this.alvoY, y + passo);
    if (this.aberto && this.malha.position.y <= -PAREDE + 0.01) {
      this.malha.visible = false;
      this.cripta.marcar(this.r, 0);
    }
  }
}

export class Braseiro implements Alvo {
  readonly pos: THREE.Vector3;
  readonly grupo = new THREE.Group();
  private fogo: THREE.Mesh;
  readonly luz = new THREE.PointLight(0xff9a40, 0, 11, 1.4);
  private luzBrasa = new THREE.PointLight(0xff4a18, 0, 4, 1.6);
  private brasas: THREE.Mesh;
  aceso = false;
  restante = 0;
  fixo = false;

  constructor(x: number, z: number) {
    this.pos = mundo(x, z);
    const pedra = (x: number, y: number, z: number) => variar(0x777065, x, y, z, 0.06);
    const base = new Modelo()
      .caixa(1, 0, 1, 4, 3, 4, pedra)
      .caixa(2, 3, 2, 2, 6, 2, pedra)
      .caixa(0, 9, 0, 6, 1, 6, pedra)
      .caixa(0, 10, 0, 6, 2, 1, pedra).caixa(0, 10, 5, 6, 2, 1, pedra)
      .caixa(0, 10, 1, 1, 2, 4, pedra).caixa(5, 10, 1, 1, 2, 4, pedra)
      .caixa(1, 10, 1, 4, 1, 4, 0x2a2420) // carvão
      .malha(0.1, [3, 0, 3]);
    const chama = new Modelo()
      .caixa(1, 0, 1, 4, 2, 4, 0xff8a2a)
      .caixa(2, 2, 2, 2, 2, 2, 0xffc24a)
      .caixa(2, 4, 2, 1, 2, 1, 0xfff0a0)
      .caixa(3, 3, 3, 1, 1, 1, 0xfff0a0)
      .malha(0.1, [3, 0, 3], new THREE.MeshBasicMaterial({ vertexColors: true }));
    chama.castShadow = false;
    chama.position.y = 1.1;
    this.fogo = chama;
    this.luz.position.y = 1.6;
    // brasas: com o braseiro apagado, um resto de calor avermelhado mostra onde ele está
    this.brasas = new Modelo()
      .ponto(1, 0, 2, 0xff5a1e).ponto(3, 0, 1, 0xff7a2a).ponto(2, 0, 3, 0xc8401a).ponto(4, 0, 3, 0xff5a1e).ponto(3, 0, 4, 0xc8401a)
      .malha(0.1, [3, 0, 3], new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.brasas.position.y = 1.11;
    this.luzBrasa.position.y = 1.4;
    this.grupo.add(base, chama, this.luz, this.brasas, this.luzBrasa);
    this.grupo.position.copy(this.pos);
    this.apagar();
  }

  get ativa() {
    return !this.aceso;
  }

  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(new THREE.Vector3(0, 1.25, 0));
  }

  acender(fixo = false) {
    this.aceso = true;
    this.fixo = this.fixo || fixo;
    this.restante = TEMPO_CHAMA;
    this.fogo.visible = true;
  }

  apagar() {
    this.aceso = false;
    this.fogo.visible = false;
    this.luz.intensity = 0;
  }

  atualizar(dt: number, t: number) {
    this.brasas.visible = !this.aceso;
    if (!this.aceso) {
      this.luzBrasa.intensity = 1.6 + Math.sin(t * 2.3 + this.pos.x) * 0.6;
      return;
    }
    this.luzBrasa.intensity = 0;
    if (!this.fixo) {
      this.restante -= dt;
      if (this.restante <= 0) return this.apagar();
    }
    // a chama encolhe com o tempo e, nos últimos segundos, tremula avisando que vai apagar
    const tamanho = this.fixo ? 1 : 0.45 + 0.55 * (this.restante / TEMPO_CHAMA);
    const fraca = !this.fixo && this.restante < 4 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 9)) : 1;
    this.luz.intensity = (7 + Math.sin(t * 13 + this.pos.x) * 1.2) * fraca * (0.5 + 0.5 * tamanho);
    const largura = 0.7 + 0.3 * tamanho;
    this.fogo.scale.set(largura, (0.9 + Math.sin(t * 17 + this.pos.z) * 0.12) * fraca * tamanho, largura);
  }
}

export interface EventosCripta {
  /** Os três braseiros acesos ao mesmo tempo. */
  portaoAberto(): void;
  braseiroAceso(acesos: number): void;
  braseirosApagaram(): void;
  lutaComecou(): void;
}

export class Cripta implements Area {
  readonly id = 'cripta' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly braseiros: Braseiro[];
  readonly chegada = mundo(18, 34);
  readonly escada = mundo(18, 36);
  readonly relicario = mundo(4, 4).add(new THREE.Vector3(0, 0, 0.5));
  readonly centroArena = mundo(18, 5);
  /** Estela com a inscrição dos primeiros peregrinos. */
  readonly estela = mundo(15, 34);
  private poeira!: THREE.Points;
  readonly nivelMinimo = -99;
  guardiao: Guardiao | null = null;
  lutando = false;
  private chamouAjuda = false;
  private alturas = new Float32Array(W * H).fill(PAREDE);
  private portaoLampadas: Portao;
  private portaArena: Portao;
  private portaRelicario: Portao;
  private velas: THREE.PointLight[] = [];
  private brilhoRelicario: THREE.Mesh;
  private relicariaItem: THREE.Group;
  private t = 0;

  constructor(
    vencidas: Set<string>,
    flags: Set<string>,
    private eventos: EventosCripta,
  ) {
    for (const [x0, z0, x1, z1] of SALAS) this.marcar([x0, z0, x1, z1], 0);
    // vãos das portas: o piso é desenhado; quem fecha é o próprio portão
    for (const p of [PORTA_RELICARIO, PORTA_ARENA, PORTAO_LAMPADAS]) this.marcar(p, 0);
    for (const p of PILARES) this.marcar(p, PAREDE);
    this.marcar([4, 4, 4, 5], PEDESTAL); // altar do relicário
    this.grupo.add(this.construirSalas());

    this.braseiros = [new Braseiro(10, 24), new Braseiro(26, 24), new Braseiro(18, 15)];
    for (const b of this.braseiros) {
      this.grupo.add(b.grupo);
      this.marcarPonto(b.pos, PEDESTAL);
    }

    const portaoAberto = flags.has('cripta_portao');
    const guardiaoVencido = vencidas.has('cripta_guardiao');
    if (portaoAberto) this.braseiros.forEach((b) => b.acender(true));
    this.portaoLampadas = new Portao(this, PORTAO_LAMPADAS, portaoAberto);
    this.portaArena = new Portao(this, PORTA_ARENA, true, 0x4a2a3a);
    this.portaRelicario = new Portao(this, PORTA_RELICARIO, guardiaoVencido, 0x4a2a3a);
    this.grupo.add(this.portaoLampadas.malha, this.portaArena.malha, this.portaRelicario.malha);

    // candelabros de chão
    for (const [x, z] of [[13, 31], [23, 31], [12, 2], [25, 2], [3, 3]]) this.candelabro(x, z);
    this.decorar();

    // relicário: altar com a lamparina
    const altar = new Modelo()
      .caixa(0, 0, 0, 4, 5, 8, (x, y, z) => variar(0xb9b2a2, x, y, z, 0.04))
      .caixa(0, 4, 0, 4, 1, 8, 0xc9a24a)
      .malha(0.25, [0, 0, 0]);
    altar.position.copy(mundo(4, 4)).add(new THREE.Vector3(-0.5, -0.05, -0.5));
    this.grupo.add(altar);
    this.relicariaItem = new THREE.Group();
    this.relicariaItem.add(lamparinaModelo(0.07));
    this.relicariaItem.position.copy(this.relicario).add(new THREE.Vector3(0, 1.3, 0));
    this.brilhoRelicario = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.8, 4, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe9a6, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.brilhoRelicario.position.copy(this.relicariaItem.position).add(new THREE.Vector3(0, 1.6, 0));
    this.grupo.add(this.relicariaItem, this.brilhoRelicario);
    if (flags.has('lamparina')) this.retirarLamparina();

    // inimigos
    const sombra = (id: string, x: number, z: number) => {
      if (vencidas.has(id)) return;
      const s = new Sombra(id, mundo(x, z), { visao: 8 });
      this.sombras.push(s);
      this.grupo.add(s.raiz);
    };
    sombra('cripta_sombra_1', 14, 20);
    sombra('cripta_sombra_2', 22, 23);
    if (!guardiaoVencido) this.criarGuardiao();
  }

  /** Muda a altura do chão de um retângulo de células. */
  marcar([x0, z0, x1, z1]: Retangulo, h: number) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) this.alturas[z * W + x] = h;
  }

  private marcarPonto(p: THREE.Vector3, h: number) {
    const x = Math.floor(p.x - ORIGEM.x), z = Math.floor(p.z - ORIGEM.z);
    this.marcar([x, z, x, z], h);
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM.x - 4, z0: ORIGEM.z - 4, largura: W + 8, profundidade: H + 8,
      cor: (x, z) => {
        const h = this.altura(x, z);
        return h >= PAREDE ? 0x2a2420 : h > 0.5 ? 0x8a7a60 : 0x6e665a;
      },
    };
  }

  altura(x: number, z: number) {
    const i = Math.floor(x - ORIGEM.x), j = Math.floor(z - ORIGEM.z);
    if (i < 0 || j < 0 || i >= W || j >= H) return PAREDE;
    return this.alturas[j * W + i];
  }

  colidir() {
    /* as paredes são degraus altos demais: o próprio movimento já bloqueia */
  }

  alvos(): Alvo[] {
    return this.braseiros.filter((b) => !b.aceso);
  }

  atingirLuz(p: THREE.Vector3) {
    for (const b of this.braseiros) {
      if (b.aceso || b.centro().distanceTo(p) > 0.9) continue;
      b.acender();
      const acesos = this.braseiros.filter((x) => x.aceso).length;
      if (acesos === this.braseiros.length) {
        this.braseiros.forEach((x) => x.acender(true));
        this.portaoLampadas.abrir();
        this.eventos.portaoAberto();
      } else this.eventos.braseiroAceso(acesos);
      return true;
    }
    return false;
  }

  private candelabro(x: number, z: number) {
    const m = new Modelo()
      .caixa(1, 0, 1, 3, 1, 3, 0x2e2c30)
      .caixa(2, 1, 2, 1, 12, 1, 0x3a383e)
      .caixa(0, 13, 0, 5, 1, 5, 0x3a383e)
      .caixa(2, 14, 2, 1, 2, 1, 0xf2ead0)
      .ponto(2, 16, 2, 0xffd36b)
      .malha(0.1, [2.5, 0, 2.5]);
    m.position.copy(mundo(x, z));
    const luz = new THREE.PointLight(0xffb060, 5, 12, 1.5);
    luz.position.copy(m.position).add(new THREE.Vector3(0, 1.75, 0));
    this.velas.push(luz);
    this.grupo.add(m, luz);
  }

  /** Túmulos dos peregrinos, a estela da entrada, a cruz do relicário e a poeira no ar. */
  private decorar() {
    // túmulos (1 × 2 células), com a vieira do peregrino na cabeceira e a cruz na tampa
    const pedra = (x: number, y: number, z: number) => variar(0x9a9386, x, y, z, 0.05);
    const tampa = (x: number, y: number, z: number) => variar(0xaba496, x, y, z, 0.04);
    const tumulo = () => {
      const m = new Modelo().caixa(1, 0, 1, 6, 5, 14, pedra).caixa(0, 5, 0, 8, 1, 16, tampa);
      m.caixa(3, 6, 4, 2, 1, 9, 0x6e685d).caixa(1, 6, 6, 6, 1, 2, 0x6e685d); // cruz entalhada
      for (const [x, y] of [[3, 2], [4, 2], [2, 3], [3, 3], [4, 3], [5, 3], [3, 4], [4, 4]]) m.ponto(x, y, 0, 0xd9c9a0); // vieira
      return m.malha(0.125, [0, 0, 0]);
    };
    for (const [x, z] of [[13, 33], [23, 33], [13, 35], [23, 35]]) {
      const t = tumulo();
      t.position.set(ORIGEM.x + x, 0, ORIGEM.z + z);
      this.grupo.add(t);
      this.marcar([x, z, x, z + 1], PEDESTAL);
    }

    // estela com a inscrição, ao pé da escada
    const estela = new Modelo()
      .caixa(0, 0, 0, 8, 2, 3, pedra)
      .caixa(1, 2, 1, 6, 10, 1, tampa)
      .caixa(3, 8, 0, 2, 3, 1, 0xc9a24a).caixa(2, 9, 0, 4, 1, 1, 0xc9a24a) // cruz dourada
      .caixa(2, 4, 0, 4, 1, 1, 0x5d574e).caixa(2, 6, 0, 3, 1, 1, 0x5d574e) // linhas do texto
      .malha(0.125, [4, 0, 1.5]);
    estela.position.copy(this.estela);
    estela.rotation.y = Math.PI; // a face escrita olha para quem desce a escada
    this.grupo.add(estela);
    this.marcarPonto(this.estela, PEDESTAL);

    // relicário: cruz dourada em relevo na parede atrás do altar, com um vitral de luz
    const cruz = new Modelo()
      .caixa(0, 0, 3, 1, 14, 2, 0xd8b45a)
      .caixa(0, 8, 0, 1, 2, 8, 0xd8b45a)
      .malha(0.2, [0, 0, 4], new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a2a08 }));
    cruz.position.set(ORIGEM.x + 2.02, 0.6, this.relicario.z);
    this.grupo.add(cruz);
    const luzCruz = new THREE.PointLight(0xffd890, 3, 7, 1.5);
    luzCruz.position.set(ORIGEM.x + 3, 2.6, this.relicario.z);
    this.grupo.add(luzCruz);

    // poeira suspensa no ar
    const n = 380;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x0, z0, x1, z1] = SALAS[i % SALAS.length];
      pos[i * 3] = ORIGEM.x + x0 + Math.random() * (x1 - x0 + 1);
      pos[i * 3 + 1] = 0.3 + Math.random() * 3.4;
      pos[i * 3 + 2] = ORIGEM.z + z0 + Math.random() * (z1 - z0 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.poeira = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0xffe6b8, size: 0.03, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.grupo.add(this.poeira);
  }

  private construirSalas() {
    const m = new Modelo();
    const n = PAREDE / VOX;
    for (let x = 0; x < W; x++)
      for (let z = 0; z < H; z++) {
        const h = this.alturas[z * W + x];
        const ehParede = h >= PAREDE;
        // o miolo maciço longe das salas só ganha o tampo (a câmera alta enxerga por cima das paredes)
        if (ehParede && !this.vizinhoDeChao(x, z) && !(x >= 17 && x <= 19 && z >= 37)) {
          for (let a = 0; a < 2; a++)
            for (let b = 0; b < 2; b++) {
              const vx = x * 2 + a, vz = z * 2 + b;
              m.ponto(vx, n, vz, variar((vx >> 1) % 2 === (vz >> 1) % 2 ? 0x6a655d : 0x625d55, vx, n, vz, 0.05));
            }
          continue;
        }
        if (x >= 17 && x <= 19 && z >= 37) {
          // escada de saída subindo para a capela (só visual: sair é por interação)
          for (let a = 0; a < 2; a++)
            for (let b = 0; b < 2; b++) {
              const vx = x * 2 + a, vz = z * 2 + b, topo = (vz - 73) * 1;
              for (let y = 0; y <= topo; y++) m.ponto(vx, y, vz, variar(y === topo ? 0x9a9488 : 0x7d776c, vx, y, vz, 0.05));
            }
          continue;
        }
        for (let a = 0; a < 2; a++)
          for (let b = 0; b < 2; b++) {
            const vx = x * 2 + a, vz = z * 2 + b;
            if (!ehParede) {
              let ladrilho = (x + z) % 2 ? 0x8a8478 : 0x7d776c;
              // mosaico de uma cruz dourada no centro da sala das lâmpadas
              const cruz = (x === 18 && z >= 17 && z <= 23) || (z === 19 && x >= 16 && x <= 20);
              if (cruz) ladrilho = (vx + vz) % 2 ? 0xb8984e : 0xa88a44;
              else if ((Math.abs(x - 18) === 1 && z >= 17 && z <= 23) || (Math.abs(z - 19) === 1 && x >= 16 && x <= 20)) ladrilho = 0x6a645a;
              // círculo escuro gasto no chão da arena
              const r = Math.hypot(x - 18, z - 5.5);
              if (z <= 10 && x >= 11 && r > 3.2 && r < 4.2) ladrilho = 0x5a5250;
              m.ponto(vx, 0, vz, variar(ladrilho, vx, 0, vz, 0.05));
              continue;
            }
            for (let y = 0; y <= n; y++) {
              const argamassa = y % 2 === 0 || (vx + vz + (y >> 1)) % 4 === 0;
              let cor = argamassa ? 0x5d5850 : [0x6f6a62, 0x7a756c, 0x655f58][(vx * 3 + vz * 7 + y) % 3];
              if (y <= 1 && (vx * 13 + vz * 7) % 5 === 0) cor = 0x4f6a3a; // musgo
              if (y === n) cor = 0x8f897f;
              m.ponto(vx, y, vz, variar(cor, vx, y, vz, 0.04));
            }
          }
      }
    const malha = m.malha(VOX, [0, 1, 0]);
    malha.position.set(ORIGEM.x, 0, ORIGEM.z);
    return malha;
  }

  private vizinhoDeChao(x: number, z: number) {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const i = x + dx, j = z + dz;
        if (i >= 0 && j >= 0 && i < W && j < H && this.alturas[j * W + i] < PAREDE) return true;
      }
    return false;
  }

  /** Começa a luta quando o peregrino entra na arena. */
  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    this.portaoLampadas.atualizar(dt);
    this.portaArena.atualizar(dt);
    this.portaRelicario.atualizar(dt);
    const antes = this.braseiros.filter((b) => b.aceso).length;
    for (const b of this.braseiros) b.atualizar(dt, this.t);
    if (antes > 0 && this.braseiros.every((b) => !b.aceso)) this.eventos.braseirosApagaram();
    this.velas.forEach((l, i) => (l.intensity = 5 + Math.sin(this.t * 11 + i * 2) * 0.6 + Math.sin(this.t * 23 + i) * 0.4));
    this.relicariaItem.rotation.y += dt * 0.8;
    // a poeira sobe e desce devagar
    const pp = this.poeira.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) {
      let y = pp.getY(i) + Math.sin(this.t * 0.5 + i) * dt * 0.06 + dt * 0.02;
      if (y > 3.8) y = 0.3;
      pp.setY(i, y);
    }
    pp.needsUpdate = true;
    this.relicariaItem.position.y = this.relicario.y + 1.35 + Math.sin(this.t * 2) * 0.05;

    const g = this.guardiao;
    if (g && g.ativa && !this.lutando && jogador.z - ORIGEM.z < 10.2 && jogador.x - ORIGEM.x > 11) {
      this.lutando = true;
      this.portaArena.fechar();
      g.acordar();
      this.eventos.lutaComecou();
    }
    if (g && this.lutando && !this.chamouAjuda && g.vida <= g.vidaMax / 2) {
      // na metade da vida, o Guardião chama duas sombras
      this.chamouAjuda = true;
      for (const [i, [x, z]] of [[13, 2], [24, 9]].entries()) {
        const s = new Sombra(`cripta_ajudante_${i}`, mundo(x, z), { visao: 30 });
        s.acordar();
        this.sombras.push(s);
        this.grupo.add(s.raiz);
      }
    }
  }

  /** O Guardião caiu: abre a arena e o relicário. */
  guardiaoVencido() {
    this.lutando = false;
    this.portaArena.abrir();
    this.portaRelicario.abrir();
    for (const s of this.sombras) if (s.id.startsWith('cripta_ajudante') && s.ativa) s.ferir(99, s.pos, 'luz');
  }

  /** Morreu na luta: tudo volta ao começo da arena. */
  reiniciarLuta() {
    if (!this.lutando || !this.guardiao) return;
    this.lutando = false;
    this.chamouAjuda = false;
    this.portaArena.abrir();
    const g = this.guardiao;
    g.descartar();
    this.sombras.splice(this.sombras.indexOf(g), 1);
    for (const s of this.sombras.filter((s) => s.id.startsWith('cripta_ajudante'))) {
      this.grupo.remove(s.raiz);
      this.sombras.splice(this.sombras.indexOf(s), 1);
    }
    this.criarGuardiao();
  }

  private criarGuardiao() {
    this.guardiao = new Guardiao('cripta_guardiao', this.centroArena);
    this.sombras.push(this.guardiao);
    this.grupo.add(this.guardiao.raiz, this.guardiao.efeitos);
  }

  retirarLamparina() {
    this.relicariaItem.visible = false;
    this.brilhoRelicario.visible = false;
  }

  get lamparinaNoAltar() {
    return this.relicariaItem.visible;
  }
}
