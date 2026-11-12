import * as THREE from 'three';
import type { Povoamento } from '../fauna/Fauna';
import { Ruido } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';
import { Sombra } from '../entidades/Sombra';
import { Acedia, Reflexo } from '../entidades/Acedia';
import { Area } from './Area';
import { construirPlaca } from './Cenario';
import { malhaDeColunas } from './Terreno';
import { FonteMapa } from '../ui/Minimapa';

/**
 * O Poço do Meio-Dia: arena do chefão do deserto, depois da fenda. É uma área separada.
 * Uma praça redonda de pedra cercada de penhascos, desenhada como um relógio de sol: as linhas das horas
 * no chão e o ponteiro (um obelisco) no meio. Ao norte fica um poço seco. Vencida a acídia, ele volta a ter água.
 */

const TAM = 64;
const META = TAM / 2;
export const ORIGEM_MEIODIA = new THREE.Vector3(-500, 0, -400);
const RAIO = 15;
const CHAO = 4;
const POCO = new THREE.Vector2(0, -11.5);
const ID_CHEFE = 'meiodia_acedia';
/** Onde a cortina de areia cai (x local), no corredor de entrada. */
const X_CORTINA = 17;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Obelisco de arenito: o ponteiro do relógio de sol. */
function obelisco() {
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0xd2b07a, x, y, z, 0.05);
  m.caixa(-4, 0, -4, 9, 2, 9, (x, y, z) => variar(0xa88a5a, x, y, z, 0.05));
  for (let y = 2; y < 30; y++) {
    const r = y < 26 ? 2 - Math.floor((y - 2) / 12) : 0;
    m.caixa(-r, y, -r, r * 2 + 1, 1, r * 2 + 1, pedra);
  }
  m.caixa(0, 30, 0, 1, 1, 1, 0xe8c060);
  return m.malha(0.2, [0.5, 0, 0.5]);
}

/** Poço de pedra rachado, sem trave (ninguém tira água dele há muito tempo). */
function pocoSeco() {
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0xa0947e, x, y, z, 0.08);
  for (let x = -8; x <= 8; x++)
    for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x, z);
      if (d <= 8 && d > 5.5) {
        const alto = 4 + (Math.sin(x * 1.3 + z * 0.7) > 0.6 ? -2 : 0); // pedras caídas
        m.caixa(x, 0, z, 1, alto, 1, pedra);
      } else if (d <= 5.5) m.ponto(x, 0, z, 0x1a1208);
    }
  return m.malha(0.2, [0.5, 0, 0.5]);
}

/** Cortina de areia que cai quando a luta começa e fecha a entrada. */
function cortina() {
  const m = new Modelo();
  for (let z = -7; z <= 7; z++)
    for (let y = 0; y < 30; y++) m.ponto(0, y, z, variar((y + z) % 3 ? 0xd8b880 : 0xc8a46c, 0, y, z, 0.06));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.88, emissive: 0x3a2a10 });
  return m.malha(0.4, [0.5, 0, 0.5], mat);
}

export interface EventosMeioDia {
  lutaComecou(): void;
}

export class PocoMeioDia implements Area {
  readonly id = 'meiodia' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  private alturas = new Int16Array(TAM * TAM);
  private ruido = new Ruido(606);
  private circulos: { x: number; z: number; r: number }[] = [];
  private malhaCortina: THREE.Mesh;
  /** 0 = aberta, 1 = fechada. */
  private fechamento = 0;
  private agua: THREE.Mesh;
  private luzAgua = new THREE.PointLight(0x9ad8ff, 0, 10, 1.4);
  private reflexos: Reflexo[] = [];
  private semReflexos = 0;
  private nReflexo = 0;
  private t = 0;

  readonly chegada: THREE.Vector3;
  readonly saida: THREE.Vector3;
  readonly centro: THREE.Vector3;
  readonly poco: THREE.Vector3;
  readonly obelisco: THREE.Vector3;
  acedia: Acedia | null = null;
  lutando = false;
  vencido = false;
  /** O jogo liga enquanto o dom da Ciência estiver ativo. */
  ciencia = false;

  constructor(private eventos: EventosMeioDia) {
    this.gerarAlturas();
    const terreno = malhaDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 24);
    terreno.position.copy(ORIGEM_MEIODIA);
    this.grupo.add(terreno);

    const w = (lx: number, lz: number) => new THREE.Vector3(lx + ORIGEM_MEIODIA.x, 0, lz + ORIGEM_MEIODIA.z).setY(CHAO);
    this.chegada = w(25, 0);
    this.saida = w(29, 0);
    this.centro = w(0, 0);
    this.poco = w(POCO.x, POCO.y);
    this.obelisco = w(0, 0);

    const ob = obelisco();
    ob.position.copy(this.obelisco);
    const ps = pocoSeco();
    ps.position.copy(this.poco);
    this.grupo.add(ob, ps);
    this.circulos.push({ x: this.obelisco.x, z: this.obelisco.z, r: 0.95 }, { x: this.poco.x, z: this.poco.z, r: 1.75 });

    this.agua = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x3a8ad0, emissive: 0x1a4a7a, transparent: true, opacity: 0.92 }),
    );
    this.agua.position.copy(this.poco).add(new THREE.Vector3(0, 0.55, 0));
    this.luzAgua.position.copy(this.poco).add(new THREE.Vector3(0, 1.4, 0));
    this.grupo.add(this.agua, this.luzAgua);

    const placa = construirPlaca();
    placa.position.copy(w(27, 2.4));
    placa.rotation.y = -Math.PI / 2;
    this.grupo.add(placa);

    this.malhaCortina = cortina();
    this.malhaCortina.position.copy(w(X_CORTINA, 0));
    this.grupo.add(this.malhaCortina);
  }

  /** Recoloca a arena conforme o save. */
  reiniciar(sombrasVencidas: Set<string>) {
    this.descartarLuta();
    this.vencido = sombrasVencidas.has(ID_CHEFE);
    this.lutando = false;
    this.fechamento = 0;
    this.agua.visible = this.vencido;
    this.luzAgua.intensity = this.vencido ? 6 : 0;
    if (!this.vencido) this.criarChefe();
  }

  private criarChefe() {
    this.acedia = new Acedia(ID_CHEFE, this.centro.clone().add(new THREE.Vector3(0, 0, -6.5)));
    this.sombras.push(this.acedia);
    this.grupo.add(this.acedia.raiz, this.acedia.efeitos);
  }

  private descartarLuta() {
    this.acedia?.descartar();
    this.acedia = null;
    for (const r of this.reflexos) this.grupo.remove(r.raiz);
    this.reflexos = [];
    this.sombras.length = 0;
  }

  /** Morreu na luta: tudo volta ao começo. */
  reiniciarLuta() {
    if (!this.lutando) return;
    this.lutando = false;
    this.descartarLuta();
    this.criarChefe();
  }

  /** A acídia caiu: a cortina se abre e o poço volta a ter água. */
  chefeVencido() {
    this.lutando = false;
    this.vencido = true;
    for (const r of this.reflexos) r.dissolver();
    this.agua.visible = true;
    this.agua.scale.setScalar(0.01);
  }

  atingirLuz(p: THREE.Vector3) {
    return this.acedia?.atingirNuvem(p) ?? false;
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.t += dt;
    const g = this.acedia;
    // a luta começa ao entrar na praça
    if (g && g.ativa && !this.lutando && !this.vencido && jogador.x - ORIGEM_MEIODIA.x < 9.5) {
      this.lutando = true;
      g.acordar();
      this.semReflexos = 2.2; // os reflexos aparecem depois que ele se levanta
      this.eventos.lutaComecou();
    }
    // cortina de areia
    const quer = this.lutando ? 1 : 0;
    this.fechamento += Math.sign(quer - this.fechamento) * Math.min(Math.abs(quer - this.fechamento), dt * 1.6);
    const k = this.fechamento;
    this.malhaCortina.visible = k > 0.01;
    this.malhaCortina.scale.set(1, Math.max(0.01, k), 1);
    this.malhaCortina.position.y = CHAO + (1 - k) * 12;
    (this.malhaCortina.material as THREE.MeshLambertMaterial).opacity = 0.88 * Math.min(1, k * 1.5);

    // água viva voltando ao poço
    if (this.vencido && this.agua.scale.x < 1) {
      this.agua.scale.setScalar(Math.min(1, this.agua.scale.x + dt * 0.5));
      this.luzAgua.intensity = this.agua.scale.x * 6;
    }
    if (this.agua.visible) this.agua.position.y = this.poco.y + 0.55 + Math.sin(this.t * 2) * 0.02;

    // miragens da acídia: com a Ciência, os reflexos somem e ele fica à vista
    if (g && this.lutando) {
      g.revelado = this.ciencia;
      const vivos = this.reflexos.filter((r) => r.ativa);
      if (this.ciencia) {
        for (const r of vivos) r.dissolver();
        this.semReflexos = 1.4;
      } else if (vivos.length < g.reflexosDesejados) {
        this.semReflexos -= dt;
        if (this.semReflexos <= 0) this.multiplicar(g.reflexosDesejados);
      }
    }
    // tira da lista os reflexos que já se desfizeram
    for (const r of this.reflexos.filter((r) => r.estado === 'vencida')) {
      this.grupo.remove(r.raiz);
      this.sombras.splice(this.sombras.indexOf(r), 1);
      this.reflexos.splice(this.reflexos.indexOf(r), 1);
    }
  }

  /** Ele e os reflexos reaparecem embaralhados em volta da praça. */
  private multiplicar(n: number) {
    const g = this.acedia!;
    for (const r of this.reflexos) r.dissolver();
    const lugares: THREE.Vector3[] = [];
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / (n + 1)) * Math.PI * 2;
      lugares.push(this.centro.clone().add(new THREE.Vector3(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5)));
    }
    lugares.sort(() => Math.random() - 0.5);
    g.surgirEm(lugares[0]);
    for (let i = 1; i <= n; i++) {
      const r = new Reflexo(`meiodia_reflexo_${this.nReflexo++}`, lugares[i]);
      r.surgirEm(lugares[i]);
      this.reflexos.push(r);
      this.sombras.push(r);
      this.grupo.add(r.raiz);
    }
    this.semReflexos = 0;
  }

  // ───────────────────────────── terreno ─────────────────────────────

  private gerarAlturas() {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) {
        const x = i - META + 0.5, z = j - META + 0.5;
        const r = Math.hypot(x, z);
        let h = CHAO;
        const corredor = x > RAIO - 2 && Math.abs(z) < 2.6;
        if (r > RAIO + 0.5 && !corredor) h = CHAO + 9 + Math.min(10, (r - RAIO) * 1.2) + Math.round(this.ruido.fbm(x * 0.12, z * 0.12) * 5);
        else if (r > RAIO - 0.6 && !corredor) h = CHAO + 1 + Math.round(suave(RAIO - 0.6, RAIO + 0.5, r) * 4); // degrau ao pé do penhasco
        this.alturas[i * TAM + j] = h;
      }
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META + 0.5, z = j - META + 0.5;
    const r = Math.hypot(x, z);
    if (h > CHAO) {
      const faixas = [0xc78e58, 0xb97f4c];
      return variar(faixas[this.ruido.fbm(x * 0.1, z * 0.1) > 0.5 ? 0 : 1], i, h, j, 0.05);
    }
    if (r > RAIO - 0.6) return variar(0xd8b880, i, h, j, 0.04); // corredor de areia
    // relógio de sol: anel, linhas das horas, lajes alternadas e areia acumulada perto da borda
    const a = Math.atan2(z, x);
    const hora = Math.abs(((a / (Math.PI * 2)) * 12 + 12) % 1 - 0.5) > 0.44;
    if (r > 12.8 && r < 13.8) return variar(0x8e7650, i, h, j, 0.04);
    if (hora && r > 3 && r < 12.8) return variar(0x9a8460, i, h, j, 0.04);
    if (r > 11 && this.ruido.fbm(x * 0.3, z * 0.3) > 0.55) return variar(0xe2c690, i, h, j, 0.04);
    const laje = (Math.floor(x / 2) + Math.floor(z / 2)) & 1;
    return variar(laje ? 0xd8c49a : 0xcbb68a, i, h, j, 0.035);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    const faixas = [0xb8794a, 0xa86a40, 0xc99360, 0x9a5e3a];
    return variar(faixas[Math.floor(y / 2) % 4], i, y, j, 0.05);
  }

  /** O minimapa: o mesmo desenho do chão, visto de cima. */
  /** O meio-dia é quase sem vida: lagartixas, uma tartaruga junto ao poço e corvos à espera. */
  povoamento(): Povoamento[] {
    return [
      { especie: 'lagartixa', quantidade: 3, centro: this.centro, raio: 12 },
      { especie: 'tartaruga', quantidade: 1, centro: [this.poco.x + 2.5, this.poco.z + 2], raio: 3 },
      { especie: 'corvo', quantidade: 3, centro: this.centro, raio: 12 },
    ];
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_MEIODIA.x - META,
      z0: ORIGEM_MEIODIA.z - META,
      largura: TAM,
      profundidade: TAM,
      cor: (x, z) => {
        const i = Math.floor(x - ORIGEM_MEIODIA.x + META), j = Math.floor(z - ORIGEM_MEIODIA.z + META);
        if (i < 0 || j < 0 || i >= TAM || j >= TAM) return 0x6a4a30;
        const h = this.alturas[i * TAM + j];
        const c = this.corTopo(i, j, h);
        return h > CHAO + 2 ? escurecer(c, 0.7) : c;
      },
    };
  }

  // ───────────────────────────── física ─────────────────────────────

  private caixas: { x0: number; x1: number; z0: number; z1: number; topo: number }[] = [];

  altura(x: number, z: number) {
    // a cortina fechada é uma parede de verdade: segura o peregrino e também a câmera
    if (this.fechamento > 0.5 && Math.abs(x - ORIGEM_MEIODIA.x - X_CORTINA) < 0.7 && Math.abs(z - ORIGEM_MEIODIA.z) < 3) return CHAO + 12;
    const i = Math.floor(x - ORIGEM_MEIODIA.x + META), j = Math.floor(z - ORIGEM_MEIODIA.z + META);
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

/** Escurece uma cor 0xRRGGBB (para os penhascos no minimapa). */
export function escurecer(c: number, k: number) {
  return (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
}
