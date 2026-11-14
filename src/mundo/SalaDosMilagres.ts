import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';
import { ENFERMOS, type DefEnfermo } from '../entidades/Enfermos';
import type { CapelaRegional } from './Capela';

/**
 * O que há dentro da Sala dos Milagres do Bonfim (docs/regioes/01-ruas-da-bahia.md, seção 5): a sala lembra os
 * milagres pela gratidão, não pela doença. Sem membros de cera (decisão do autor).
 *
 * - a parede de fotografias emolduradas: famílias, crianças, casamentos, formaturas;
 * - o painel de cortiça com cartas e bilhetes de agradecimento;
 * - a cascata de fitinhas descendo do teto, um véu colorido por onde se passa por baixo;
 * - as velas acesas no nicho, com flores frescas;
 * - os corações de prata pendurados numa grade.
 *
 * Cada enfermo que o peregrino levou ao hospital (flag `bahia_leito_<id>`) deixa ali uma foto e uma carta com o
 * nome dele, que se pode ler. A sala fica na direita da nave (coordenadas locais da capela, em metros): de x 4,5
 * a 6,75, de z -2,75 a 4,75; a porta para a nave fica em x 4,5, de z 2,5 a 3,5.
 */
const X0 = 4.5, X1 = 6.75, Z0 = -2.75, Z1 = 4.75;
const CHAO = 0.25;
const MOLDURAS = [0xe0b84e, 0x5a3a22, 0x2a2420, 0xc8c8cc, 0x8a5a34];
const FOTOS = [0xc8a878, 0xb89868, 0xd8c8a8, 0x9a8a78, 0xe8dcc4, 0xa8b8c8, 0xd8b8a0];

/** Uma fotografia emoldurada (voxel de 0,0625 m), de frente para +z: a moldura, o fundo e gente de cor. */
function foto(m: Modelo, x: number, y: number, w: number, h: number, rnd: () => number) {
  const moldura = MOLDURAS[Math.floor(rnd() * MOLDURAS.length)];
  const fundo = FOTOS[Math.floor(rnd() * FOTOS.length)];
  m.caixa(x, y, 0, w, h, 1, moldura);
  m.caixa(x + 1, y + 1, 1, w - 2, h - 2, 1, (xx, yy, zz) => variar(fundo, xx, yy, zz, 0.03));
  // as pessoas da foto: cabeças e ombros, uma, duas ou uma família
  const n = 1 + Math.floor(rnd() * Math.min(3, (w - 2) / 2));
  for (let k = 0; k < n; k++) {
    const px = x + 1 + Math.floor(((k + 0.5) * (w - 2)) / n);
    const roupa = [0x3a3a48, 0xf4f1ea, 0x6a3a2a, 0x2a4a7a][Math.floor(rnd() * 4)];
    if (h > 4) m.ponto(px, y + 1, 2, roupa).ponto(px, y + 2, 2, [0xe0b890, 0x8a5a3a, 0x6a4028, 0xc89870][Math.floor(rnd() * 4)]);
  }
}

/** A foto de um dos enfermos (voxel de 0,0625 m): maior, de moldura dourada, com a pessoa nas cores dela. */
function fotoDoEnfermo(def: DefEnfermo) {
  const m = new Modelo();
  const f = def.figurino;
  m.caixa(0, 0, 0, 8, 10, 1, (x, y) => (x === 0 || y === 0 || x === 7 || y === 9 ? 0xe0b84e : variar(0xd8c4a0, x, y, 0, 0.03)));
  m.caixa(2, 1, 1, 4, 4, 1, f.cor).caixa(3, 5, 1, 2, 2, 1, f.pele).caixa(3, 7, 1, 2, 1, 1, f.corCabelo ?? 0x2a2018);
  m.ponto(3, 6, 2, 0x2a1c14).ponto(4, 6, 2, 0x2a1c14); // os olhos
  m.caixa(1, 1, 1, 1, 3, 1, f.cor2 ?? f.cor).caixa(6, 1, 1, 1, 3, 1, f.cor2 ?? f.cor);
  return m.malha(0.0625, [4, 0, 0]);
}

/** Uma carta presa na cortiça (voxel de 0,0625 m), dobrada, com as linhas da letra e o nome embaixo. */
function carta(semente: number) {
  const m = new Modelo();
  m.caixa(0, 0, 0, 5, 7, 1, 0xf6f0e0).caixa(0, 6, 0, 5, 1, 1, 0xe8dcc0);
  for (let y = 1; y < 6; y += 2) for (let x = 1; x < 4 + ((y + semente) % 2); x++) m.ponto(x, y, 1, 0x7a8aaa); // as linhas da letra
  m.ponto(2, 6, 1, 0xc8202a); // o alfinete
  return m.malha(0.0625, [2.5, 0, 0]);
}

export class SalaDosMilagres {
  readonly grupo = new THREE.Group();
  /** As fotos e as cartas de cada enfermo, e onde o peregrino fica para ler a carta (no mundo). */
  readonly lembrancas = new Map<string, { foto: THREE.Object3D; carta: THREE.Object3D; pos: THREE.Vector3 }>();
  private luz: THREE.PointLight;

  constructor(private readonly cap: CapelaRegional) {
    const rnd = aleatorio(1959);
    const por = (o: THREE.Object3D, x: number, y: number, z: number, rot = 0) => {
      o.position.set(x, y, z);
      o.rotation.y = rot;
      this.grupo.add(o);
      return o;
    };

    // a parede das fotografias (na parede de fora, de frente para a nave): de tamanhos variados, sem buraco
    const parede = new Modelo();
    const comp = Math.round((Z1 - Z0 - 0.3) * 16), alto = 24;
    const ocupado = new Set<string>();
    for (let tentativa = 0; tentativa < 900; tentativa++) {
      const w = 4 + Math.floor(rnd() * 6), h = 4 + Math.floor(rnd() * 6);
      const x = Math.floor(rnd() * (comp - w)), y = Math.floor(rnd() * (alto - h));
      let livre = true;
      for (let i = x - 1; i <= x + w && livre; i++) for (let j = y - 1; j <= y + h && livre; j++) if (ocupado.has(`${i},${j}`)) livre = false;
      if (!livre) continue;
      for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) ocupado.add(`${i},${j}`);
      foto(parede, x, y, w, h, rnd);
    }
    por(parede.malha(0.0625, [0, 0, 0]), X1 - 0.01, 1.85, Z0 + 0.15, -Math.PI / 2); // acima da barra de azulejo

    // o painel de cortiça (na parede da nave, antes da porta), com bilhetes; as cartas dos enfermos vão por cima
    const cort = new Modelo();
    const CL = 64, CH = 22;
    cort.caixa(0, 0, 0, CL, CH, 1, (x, y, z) => (x === 0 || y === 0 || x === CL - 1 || y === CH - 1 ? 0x5a3a22 : variar(0xb88a5a, x, y, z, 0.08)));
    for (let k = 0; k < 40; k++) {
      const x = 1 + Math.floor(rnd() * (CL - 6)), y = 1 + Math.floor(rnd() * (CH - 6));
      cort.caixa(x, y, 1, 3 + Math.floor(rnd() * 2), 4 + Math.floor(rnd() * 2), 1, [0xf6f0e0, 0xece4cc, 0xf8f2c8, 0xe8eef4][k % 4]);
    }
    // de 2,3 a -1,7 em z, de frente para +x (para dentro da sala)
    por(cort.malha(0.0625, [0, 0, 0]), X0 + 0.01, 0.95, 2.3, Math.PI / 2);

    // as fotos e as cartas de cada um
    ENFERMOS.forEach((def, k) => {
      const z = -1.4 + k * 0.62;
      const f = por(fotoDoEnfermo(def), X1 - 0.2, 1.55 + (k % 2) * 0.35, Z0 + 0.6 + k * 1.15, -Math.PI / 2);
      const c = por(carta(k), X0 + 0.14, 1.25 + (k % 2) * 0.32, z + 0.3, Math.PI / 2);
      this.lembrancas.set(def.id, { foto: f, carta: c, pos: this.noMundo(X0 + 0.7, z + 0.3) });
    });

    // o nicho das velas, no fundo da sala, com as flores
    const nicho = new Modelo();
    nicho.caixa(0, 0, 0, 18, 8, 4, (x, y, z) => variar(0xd8d0c0, x, y, z, 0.03));
    for (let x = 3; x < 15; x++) for (let z = 0; z < 3; z++) if ((x + z) % 2 === 0) nicho.ponto(x, 8, z, (x * 7 + z) % 5 ? 0xfaf6e8 : 0xc8202a).ponto(x, 9, z, (x + z) % 4 ? 0xffc04a : 0xffe08a);
    for (const x of [0, 15]) {
      nicho.caixa(x, 8, 0, 3, 4, 3, 0x6aa8d8).caixa(x + 1, 12, 1, 1, 3, 1, 0x3e8a3a);
      for (const [dx, dy, dz] of [[0, 15, 0], [2, 16, 1], [1, 17, 2], [0, 16, 2], [2, 15, 0]]) nicho.ponto(x + dx, dy, dz, [0xf2a0c8, 0xffffff, 0xf2d24a, 0xe84a5a][(dx + dz) % 4]);
    }
    por(nicho.malha(0.125, [9, 0, 0]), (X0 + X1) / 2, CHAO, Z0 + 0.02, 0);

    // a grade dos corações de prata, na outra ponta
    const grade = new Modelo();
    for (let x = 0; x < 28; x += 3) grade.caixa(x, 0, 0, 1, 34, 1, 0x2a2a30);
    for (let y = 4; y < 34; y += 6) grade.caixa(0, y, 0, 28, 1, 1, 0x2a2a30);
    for (let x = 1; x < 27; x += 3)
      for (let y = 6; y < 32; y += 6) {
        const prata = (x + y) % 4 ? 0xd8dce4 : 0xb8bcc8;
        grade.ponto(x, y - 1, 1, prata).ponto(x + 1, y - 1, 1, prata).ponto(x, y - 2, 1, prata).ponto(x + 1, y - 2, 1, prata).ponto(x, y - 3, 1, prata);
      }
    por(grade.malha(0.0625, [14, 0, 0]), (X0 + X1) / 2, CHAO + 0.6, Z1 - 0.02, Math.PI);

    // a cascata de fitinhas, descendo do alto no meio da sala, por onde se passa por baixo
    const fitas = new Modelo();
    const CORES = [0xd8283a, 0xf2d020, 0x2a9a4a, 0x2a5ad0, 0xf6f6f6, 0xe86aa8, 0x8a3ac8, 0xf08a20, 0x2ac8c8];
    for (let k = 0; k < 420; k++) {
      const x = Math.floor(rnd() * 16), z = Math.floor(rnd() * 72);
      const len = 8 + Math.floor(rnd() * 16);
      const cor = CORES[Math.floor(rnd() * CORES.length)];
      for (let y = 0; y < len; y++) fitas.ponto(x, -y, z, cor);
    }
    fitas.caixa(0, 1, 0, 16, 1, 72, 0x5a4a3a); // a trave de onde pendem
    por(fitas.malha(0.0625, [0, 0, 0]), X0 + 0.6, 3.45, -1.5);

    this.luz = new THREE.PointLight(0xffd8a0, 0, 7, 1.6);
    this.luz.position.set((X0 + X1) / 2, 2.6, 1);
    this.grupo.add(this.luz);
    this.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh) o.receiveShadow = true;
    });
    cap.capela.grupo.add(this.grupo);
  }

  private noMundo(x: number, z: number) {
    return new THREE.Vector3(this.cap.x + x, this.cap.chao + CHAO, this.cap.z + z);
  }

  /** A foto e a carta de quem foi levado ao hospital. */
  aplicar(flags: Set<string>) {
    const venceu = flags.has('bahia_coracao_vencido');
    for (const [id, l] of this.lembrancas) l.foto.visible = l.carta.visible = venceu && flags.has(`bahia_leito_${id}`);
  }

  /** A luz da sala só acende com o peregrino perto. */
  atualizar(jogador: THREE.Vector3) {
    this.luz.intensity = Math.hypot(jogador.x - this.cap.x, jogador.z - this.cap.z) < 30 ? 5 : 0;
  }
}
