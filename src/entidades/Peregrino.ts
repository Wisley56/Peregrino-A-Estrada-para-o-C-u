import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Visual, misturar } from '../core/Aparencia';
import { lamparinaModelo } from '../mundo/Cenario';

const S = 0.085; // tamanho do voxel do personagem (m)

export interface Fisica {
  altura(x: number, z: number): number;
  /** Empurra um círculo (x, z) para fora dos obstáculos. */
  colidir(pos: THREE.Vector3, raio: number): void;
  /** Altura mínima para quem flutua (ex.: a superfície da água). */
  nivelMinimo?: number;
}

const FIXAS = {
  calca: 0x5b4a3a,
  meia: 0x6b5444,
  sandalia: 0x5a3a1e,
  corda: 0xd8c79a,
  cordaBranca: 0xeee8d8,
  chapeu: 0x7a5a36,
  vieira: 0xf2eee0,
  galao: 0xc9a24a,
  cajado: 0x8b6a3c,
  cabaca: 0xd89a3a,
  olho: 0x2a1a12,
};

/** Cabelo em voxels sobre a cabeça 6x6x6 (rosto em z = 5). */
function pentear(m: Modelo, vis: Visual) {
  const v = (x: number, y: number, z: number) => variar(vis.corCabelo, x, y, z, 0.05);
  const p = (x: number, y: number, z: number, hex: number | ((x: number, y: number, z: number) => number) = v) => {
    if (vis.chapeu && y >= 6) return; // o chapéu cobre o alto da cabeça
    m.ponto(x, y, z, typeof hex === 'function' ? hex(x, y, z) : hex);
  };
  const capa = () => {
    for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) p(x, 5, z);
    for (let x = 0; x < 6; x++) for (let z = 0; z < 5; z++) p(x, 4, z);
    for (let x = 0; x < 6; x++) for (let y = 1; y < 5; y++) for (let z = 0; z < 2; z++) p(x, y, z);
    for (const x of [0, 5]) for (let y = 2; y < 5; y++) for (let z = 2; z < 4; z++) p(x, y, z);
  };
  switch (vis.cabelo) {
    case 'raspado': {
      const ralo = misturar(vis.corCabelo, vis.corPele, 0.35);
      for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) p(x, 5, z, ralo);
      for (let x = 0; x < 6; x++) for (let y = 3; y < 5; y++) p(x, y, 0, ralo);
      break;
    }
    case 'curto':
      capa();
      break;
    case 'cacheado':
      capa();
      for (let x = -1; x < 7; x++)
        for (let z = -1; z < 6; z++) if ((x + z) % 2 === 0) p(x, 6, z);
      for (const x of [-1, 6]) for (let y = 2; y < 6; y++) for (let z = 0; z < 4; z++) if ((y + z) % 2 === 0) p(x, y, z);
      for (let x = 0; x < 6; x++) for (let y = 1; y < 6; y++) if ((x + y) % 2) p(x, y, -1);
      break;
    case 'crespo':
      for (let x = -1; x < 7; x++)
        for (let y = 2; y < 9; y++)
          for (let z = -2; z < 6; z++) {
            const dx = (x - 2.5) / 4.1, dy = (y - 5) / 3.4, dz = (z - 2) / 4.1;
            if (dx * dx + dy * dy + dz * dz > 1) continue;
            if (z >= 4 && y <= 4 && x >= 0 && x <= 5) continue; // rosto livre
            p(x, y, z);
          }
      break;
    case 'longo':
      capa();
      for (let x = 0; x < 6; x++) for (let y = -4; y < 5; y++) p(x, y, -1);
      for (const x of [-1, 6]) for (let y = -2; y < 5; y++) for (let z = -1; z < 3; z++) p(x, y, z);
      break;
    case 'tranca': {
      capa();
      const escuro = misturar(vis.corCabelo, 0x000000, 0.2);
      for (let y = -7; y < 3; y++) for (let x = 2; x < 4; x++) p(x, y, -1, (y + x) % 2 ? escuro : vis.corCabelo);
      p(2, -8, -1, 0xb8333a);
      p(3, -8, -1, 0xb8333a);
      break;
    }
    case 'coque':
      capa();
      for (let x = 1; x < 5; x++) for (let y = 3; y < 7; y++) for (let z = -3; z < -1; z++) if (!(x % 3 === 1 && y === 6)) p(x, y, z);
      break;
  }
}

function construirRig(vis: Visual) {
  const v = (hex: number) => (x: number, y: number, z: number) => variar(hex, x, y, z, 0.035);
  const f = vis.genero === 'f';
  const R = vis.corRoupa;
  const R2 = misturar(R, 0x1a1008, 0.3);
  const destaque = vis.roupa === 'faixa' ? (R === 0xa65448 ? FIXAS.galao : 0xb8333a) : FIXAS.galao;

  // perna em duas peças (coxa e canela) com joelho, para ajoelhar de verdade
  const perna = () => ({
    coxa: new Modelo().caixa(0, 4, 0, 3, 4, 3, v(f ? FIXAS.meia : FIXAS.calca)).malha(S, [1.5, 8, 1.5]),
    canela: new Modelo()
      .caixa(0, 2, 0, 3, 2, 3, v(f ? FIXAS.meia : FIXAS.calca))
      .caixa(0, 0, 0, 3, 2, 4, v(FIXAS.sandalia))
      .malha(S, [1.5, 4, 1.5]),
  });

  // tronco: 8 x 9 x 5, frente em z = 4
  const t = new Modelo().caixa(0, 0, 0, 8, 9, 5, v(R));
  if (f) {
    for (const x of [0, 7]) for (let y = 3; y < 6; y++) for (let z = 0; z < 5; z++) t.ponto(x, y, z, null); // cintura
    t.caixa(0, -4, 0, 8, 4, 5, v(R)); // saia longa
    t.caixa(-1, -4, -1, 10, 1, 7, v(R2));
  } else {
    t.caixa(0, -2, 0, 8, 2, 5, v(R));
  }
  const barra = f ? -4 : -2;
  switch (vis.roupa) {
    case 'tunica':
      t.caixa(f ? -1 : 0, barra, f ? -1 : 0, f ? 10 : 8, 1, f ? 7 : 5, FIXAS.galao);
      t.caixa(2, 8, 4, 4, 1, 1, FIXAS.galao);
      t.caixa(0, 2, 0, 8, 1, 5, v(FIXAS.corda));
      break;
    case 'capa':
      t.caixa(-1, 6, -1, 10, 3, 7, v(R2));
      t.caixa(3, 6, 6, 2, 2, 1, FIXAS.vieira);
      t.caixa(0, 2, 0, 8, 1, 5, v(FIXAS.corda));
      break;
    case 'veste':
      t.caixa(1, 7, -2, 6, 3, 2, v(R2)); // capuz caído nas costas
      t.caixa(0, 2, 0, 8, 1, 5, FIXAS.cordaBranca);
      t.caixa(5, -1, 5, 1, 3, 1, FIXAS.cordaBranca); // ponta do cordão franciscano
      break;
    case 'faixa':
      for (const x of [2, 5]) t.caixa(x, barra + 1, 5, 1, 9 - barra - 1, 1, destaque);
      t.caixa(2, 8, 0, 4, 1, 5, destaque);
      break;
  }
  const tronco = t.malha(S, [4, 0, 2.5]);

  const c = new Modelo().caixa(0, 0, 0, 6, 6, 6, v(vis.corPele));
  const sombraPele = misturar(vis.corPele, 0x2a1a12, 0.22);
  if (vis.idade === 'idoso') {
    c.caixa(1, 4, 5, 4, 1, 1, sombraPele); // rugas na testa
    c.ponto(0, 2, 5, sombraPele).ponto(5, 2, 5, sombraPele);
  }
  pentear(c, vis);
  c.ponto(1, 2, 5, FIXAS.olho).ponto(4, 2, 5, FIXAS.olho);
  if (f) c.ponto(1, 3, 5, FIXAS.olho).ponto(4, 3, 5, FIXAS.olho).caixa(2, 0, 5, 2, 1, 1, misturar(vis.corPele, 0xb84a4a, 0.35));
  c.caixa(2, 1, 6, 2, 1, 1, sombraPele); // nariz
  if (!f && vis.idade === 'idoso') c.caixa(0, -1, 4, 6, 2, 2, v(vis.corCabelo)).caixa(1, -2, 5, 4, 1, 1, v(vis.corCabelo)); // barba
  else if (!f && vis.idade === 'adulto') c.caixa(1, 0, 5, 4, 1, 1, misturar(vis.corCabelo, vis.corPele, 0.4));
  const cabeca = c.malha(S, [3, 0, 3]);

  const chapeu = vis.chapeu
    ? new Modelo()
        .caixa(0, 0, 0, 10, 1, 10, v(FIXAS.chapeu))
        .caixa(2, 1, 2, 6, 2, 6, v(FIXAS.chapeu))
        .caixa(4, 1, 8, 2, 2, 1, FIXAS.vieira)
        .malha(S, [5, 0, 5])
    : null;

  const braco = () =>
    new Modelo()
      .caixa(0, 2, 0, 2, 5, 2, v(vis.roupa === 'capa' ? R2 : R))
      .caixa(0, 2, 0, 2, 1, 2, vis.roupa === 'tunica' ? FIXAS.galao : v(R))
      .caixa(0, 0, 0, 2, 2, 2, v(vis.corPele))
      .malha(S, [1, 7, 1]);

  const cajado = new Modelo()
    .caixa(0, 0, 0, 1, 24, 1, v(FIXAS.cajado))
    .caixa(-1, 17, -1, 3, 3, 3, v(FIXAS.cabaca))
    .caixa(0, 20, 0, 1, 1, 1, v(FIXAS.corda))
    .malha(S, [0.5, 11, 0.5]);

  return { perna, tronco, cabeca, chapeu, braco, cajado };
}

export type Acao = 'livre' | 'golpe' | 'luz' | 'esquiva' | 'rezando' | 'ferido';

export class Peregrino {
  readonly raiz = new THREE.Group();
  private centro = new THREE.Group();
  private corpo = new THREE.Group();
  private pernaE: THREE.Object3D;
  private joelhoE = new THREE.Group();
  private joelhoD = new THREE.Group();
  private pernaD: THREE.Object3D;
  private bracoE: THREE.Object3D;
  private bracoD: THREE.Object3D;
  private tronco: THREE.Object3D;
  private cabeca: THREE.Object3D;
  readonly cajado: THREE.Object3D;

  readonly pos = new THREE.Vector3();
  vy = 0;
  noChao = true;
  rumo = 0; // ângulo para onde olha (0 = +z)
  velocidadeHoriz = 0;
  acao: Acao = 'livre';
  tempoAcao = 0;
  invulneravel = 0;
  private fase = 0;
  private yVisual = 0;
  private dirEsquiva = new THREE.Vector3();

  /** Visual atual (gênero, idade, cores...). Trocar com `vestir()`. */
  visual: Visual;

  constructor(visual: Visual) {
    this.visual = visual;
    const quadril = 8 * S;
    const ombro = quadril + 9 * S;
    this.pernaE = new THREE.Group();
    this.pernaE.position.set(-2 * S, quadril, 0);
    this.pernaD = new THREE.Group();
    this.pernaD.position.set(2 * S, quadril, 0);
    this.joelhoE.position.y = -4 * S;
    this.joelhoD.position.y = -4 * S;
    this.pernaE.add(this.joelhoE);
    this.pernaD.add(this.joelhoD);
    this.tronco = new THREE.Group();
    this.tronco.position.set(0, quadril, 0);
    this.cabeca = new THREE.Group();
    this.cabeca.position.set(0, ombro, 0);
    this.bracoE = new THREE.Group();
    this.bracoE.position.set(-5 * S, ombro - 0.3 * S, 0);
    this.bracoD = new THREE.Group();
    this.bracoD.position.set(5 * S, ombro - 0.3 * S, 0);
    this.cajado = new THREE.Group();
    this.cajado.position.set(0, -6 * S, 0.5 * S);
    this.bracoD.add(this.cajado);
    this.corpo.add(this.pernaE, this.pernaD, this.tronco, this.cabeca, this.bracoE, this.bracoD);
    this.centro.position.y = 0.85;
    this.corpo.position.y = -0.85;
    this.centro.add(this.corpo);
    this.raiz.add(this.centro);
    this.vestir(visual);
  }

  /** Remonta as peças do boneco com outro visual, sem mexer nas articulações nem na pose. */
  vestir(visual: Visual) {
    this.visual = visual;
    const r = construirRig(visual);
    const trocar = (junta: THREE.Object3D, ...malhas: (THREE.Mesh | null)[]) => {
      for (const filho of [...junta.children]) {
        if (filho === this.cajado || filho === this.lamparina || filho === this.joelhoE || filho === this.joelhoD) continue;
        if ((filho as THREE.Mesh).isMesh) (filho as THREE.Mesh).geometry.dispose();
        junta.remove(filho);
      }
      for (const m of malhas) if (m) junta.add(m);
    };
    const pE = r.perna(), pD = r.perna();
    trocar(this.pernaE, pE.coxa);
    trocar(this.joelhoE, pE.canela);
    trocar(this.pernaD, pD.coxa);
    trocar(this.joelhoD, pD.canela);
    trocar(this.tronco, r.tronco);
    if (r.chapeu) r.chapeu.position.set(0, 6 * S, 0);
    trocar(this.cabeca, r.cabeca, r.chapeu);
    trocar(this.bracoE, r.braco());
    trocar(this.bracoD, r.braco());
    trocar(this.cajado, r.cajado);
    this.raiz.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private lamparina: THREE.Group | null = null;
  private luzLamparina: THREE.PointLight | null = null;

  /** Mostra a Lamparina da Fé na mão esquerda; acesa, ela ilumina em volta. */
  segurarLamparina(visivel: boolean, acesa: boolean) {
    if (visivel && !this.lamparina) {
      this.lamparina = lamparinaModelo(0.045);
      this.lamparina.position.set(0, -9.5 * S, 0.6 * S);
      this.luzLamparina = new THREE.PointLight(0xffd88a, 0, 13, 1.3);
      this.luzLamparina.position.y = 0.15;
      this.lamparina.add(this.luzLamparina);
      this.bracoE.add(this.lamparina);
    }
    if (this.lamparina) this.lamparina.visible = visivel;
    if (this.luzLamparina) this.luzLamparina.intensity = visivel && acesa ? 9 : 0;
  }

  /** O idoso anda mais devagar. */
  get fatorVelocidade() {
    return this.visual.idade === 'idoso' ? 0.82 : 1;
  }

  /** Ponto do alto do cajado, para onde sai a luz. */
  pontaDoCajado(destino = new THREE.Vector3()) {
    return this.cajado.localToWorld(destino.set(0, 13 * S, 0));
  }

  frente(destino = new THREE.Vector3()) {
    return destino.set(Math.sin(this.rumo), 0, Math.cos(this.rumo));
  }

  teleportar(x: number, y: number, z: number) {
    this.pos.set(x, y, z);
    this.yVisual = y;
    this.vy = 0;
  }

  iniciar(acao: Acao, dir?: THREE.Vector3) {
    this.acao = acao;
    this.tempoAcao = 0;
    if (acao === 'esquiva') {
      this.dirEsquiva.copy(dir && dir.lengthSq() > 0 ? dir : this.frente().multiplyScalar(-1)).normalize();
      this.invulneravel = 0.5;
    }
  }

  /**
   * Move o peregrino. `desejo` é a direção no mundo (comprimento 0..1).
   * `olharPara` (opcional) mantém o rosto virado para o alvo travado.
   */
  atualizar(dt: number, fis: Fisica, desejo: THREE.Vector3, velocidade: number, pular: boolean, olharPara: THREE.Vector3 | null) {
    this.tempoAcao += dt;
    this.invulneravel = Math.max(0, this.invulneravel - dt);

    let vx = 0, vz = 0;
    const travadoNaAcao = this.acao === 'rezando' || this.acao === 'luz' || this.acao === 'ferido';
    if (this.acao === 'esquiva') {
      const k = Math.max(0, 1 - this.tempoAcao / 0.45);
      vx = this.dirEsquiva.x * 10 * (0.4 + k);
      vz = this.dirEsquiva.z * 10 * (0.4 + k);
      if (this.tempoAcao > 0.45) this.acao = 'livre';
    } else if (!travadoNaAcao) {
      const fator = this.acao === 'golpe' ? 0.35 : 1;
      vx = desejo.x * velocidade * fator;
      vz = desejo.z * velocidade * fator;
    }
    if (this.acao === 'golpe' && this.tempoAcao > 0.38) this.acao = 'livre';
    if (this.acao === 'luz' && this.tempoAcao > 0.35) this.acao = 'livre';
    if (this.acao === 'ferido' && this.tempoAcao > 0.3) this.acao = 'livre';

    // na água, mais devagar
    if (this.pos.y < 2.45 - 0.3) {
      vx *= 0.55;
      vz *= 0.55;
    }

    this.velocidadeHoriz = Math.hypot(vx, vz);

    // movimento por eixo, com degrau de até 1 bloco
    const raio = 0.32;
    const tentar = (dx: number, dz: number) => {
      const nx = this.pos.x + dx, nz = this.pos.z + dz;
      const h = Math.max(
        fis.altura(nx + Math.sign(dx) * raio, nz + Math.sign(dz) * raio),
        fis.altura(nx, nz),
      );
      if (h > this.pos.y + 1.05) return; // parede
      this.pos.x = nx;
      this.pos.z = nz;
    };
    tentar(vx * dt, 0);
    tentar(0, vz * dt);
    fis.colidir(this.pos, raio);

    // gravidade e pulo
    const chao = fis.altura(this.pos.x, this.pos.z);
    if (pular && this.noChao && !travadoNaAcao && this.acao !== 'esquiva') {
      this.vy = 8.6;
      this.noChao = false;
    }
    this.vy -= 25 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= chao) {
      // degrau: sobe direto se estava no chão
      this.pos.y = chao;
      this.vy = 0;
      this.noChao = true;
    } else if (this.noChao && this.pos.y - chao < 1.05 && this.vy <= 0) {
      this.pos.y = chao; // desce degraus sem "voar"
      this.vy = 0;
    } else {
      this.noChao = this.pos.y - chao < 0.02;
    }

    // rumo
    if (olharPara && this.acao !== 'esquiva') {
      const alvo = Math.atan2(olharPara.x - this.pos.x, olharPara.z - this.pos.z);
      this.rumo = girarPara(this.rumo, alvo, dt * 14);
    } else if (this.velocidadeHoriz > 0.1 && this.acao !== 'esquiva') {
      this.rumo = girarPara(this.rumo, Math.atan2(vx, vz), dt * 12);
    }

    this.animar(dt);
  }

  private animar(dt: number) {
    const andando = this.velocidadeHoriz > 0.2 && this.noChao;
    this.fase += dt * (andando ? this.velocidadeHoriz * 2.3 : 1.6);
    const balanco = (andando ? Math.min(1, this.velocidadeHoriz / 5) : 0) * (this.visual.idade === 'idoso' ? 0.7 : 1);
    const s = Math.sin(this.fase);

    this.yVisual += (this.pos.y - this.yVisual) * Math.min(1, dt * 18);
    this.raiz.position.set(this.pos.x, this.yVisual, this.pos.z);
    this.raiz.rotation.y = this.rumo;

    // pose base
    let pE = s * 0.8 * balanco, pD = -s * 0.8 * balanco;
    let bE = -s * 0.6 * balanco, bD = s * 0.5 * balanco - 0.15;
    let bEz = 0.08, bDz = -0.08;
    let corpoY = Math.abs(Math.cos(this.fase)) * 0.06 * balanco;
    const idoso = this.visual.idade === 'idoso';
    let corpoRx = idoso ? 0.13 : 0;
    let cabecaRx = idoso ? -0.12 : 0;
    let cajadoRx = 0.15;
    // joelho: dobra só para trás; ao andar, dobra um pouco na perna que vai à frente
    let jE = Math.max(0, s) * 0.7 * balanco, jD = Math.max(0, -s) * 0.7 * balanco;

    if (!this.noChao) {
      pE = -0.6;
      pD = 0.3;
      jE = 0.8;
      jD = 0.5;
      bE = -0.9;
      bD = -0.5;
    }
    if (this.acao === 'livre' && !andando && this.noChao) {
      corpoY = Math.sin(this.fase) * 0.012;
      bE = Math.sin(this.fase) * 0.04;
    }

    const t = this.tempoAcao;
    switch (this.acao) {
      case 'golpe': {
        const k = Math.min(1, t / 0.32);
        // ergue e desce o cajado num arco
        bD = k < 0.35 ? -2.6 * (k / 0.35) : -2.6 + (k - 0.35) / 0.65 * 3.3;
        cajadoRx = 0.15 + (k < 0.35 ? 0 : 0.6);
        corpoRx = k < 0.35 ? -0.05 : 0.15;
        break;
      }
      case 'luz':
        bD = -1.5;
        bE = -1.3;
        bEz = 0.3;
        bDz = -0.3;
        cajadoRx = 1.3;
        break;
      case 'rezando': {
        // ajoelhado nos dois joelhos: coxas retas, canelas deitadas para trás, mãos postas e cabeça inclinada
        const k = Math.min(1, t / 0.35);
        pE = pD = -0.05 * k;
        jE = jD = 1.57 * k;
        corpoY = -4 * S * k;
        bE = bD = -0.95;
        bEz = 0.42;
        bDz = -0.42;
        cabecaRx = 0.4 * k;
        cajadoRx = 1.15; // o cajado fica apoiado, inclinado para a frente
        break;
      }
      case 'esquiva':
        corpoRx = Math.min(1, t / 0.45) * Math.PI * 2;
        pE = pD = -1.2;
        jE = jD = 1.8;
        bE = bD = -1.2;
        break;
      case 'ferido':
        corpoRx = -0.3;
        bE = bD = -0.6;
        break;
    }

    const suav = Math.min(1, dt * 16);
    const lerp = (o: THREE.Object3D, eixo: 'x' | 'z', v: number) => (o.rotation[eixo] += (v - o.rotation[eixo]) * suav);
    lerp(this.pernaE, 'x', pE);
    lerp(this.pernaD, 'x', pD);
    lerp(this.joelhoE, 'x', jE);
    lerp(this.joelhoD, 'x', jD);
    lerp(this.bracoE, 'x', bE);
    lerp(this.bracoD, 'x', bD);
    lerp(this.bracoE, 'z', bEz);
    lerp(this.bracoD, 'z', bDz);
    lerp(this.cabeca, 'x', cabecaRx);
    lerp(this.cajado, 'x', cajadoRx);
    if (this.acao === 'esquiva') {
      this.centro.rotation.x = corpoRx;
      this.corpo.position.y = -0.85 - 0.3 + 0.3 * Math.cos(Math.min(1, t / 0.45) * Math.PI * 2);
    } else {
      if (this.centro.rotation.x > Math.PI) this.centro.rotation.x -= Math.PI * 2;
      this.centro.rotation.x += (corpoRx - this.centro.rotation.x) * suav;
      this.corpo.position.y += (-0.85 + corpoY - this.corpo.position.y) * suav;
    }
  }
}

export function girarPara(atual: number, alvo: number, passo: number) {
  let d = alvo - atual;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return atual + Math.max(-passo, Math.min(passo, d));
}
