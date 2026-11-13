import * as THREE from 'three';
import { Modelo, variar } from './Modelo';
import { TONS_PELE } from '../core/Aparencia';

/** Mesma escala de voxel do peregrino e dos santos. */
export const ESCALA_HUMANO = 0.085;
/** Altura do pescoço, em voxels: a cabeça gira em torno deste ponto. */
/** Topo do tronco: a cabeça (6³, como a do peregrino) começa aqui. */
const PESCOCO = 17;

export type Penteado = 'curto' | 'longo' | 'coque' | 'tranca' | 'calvo' | 'tonsura' | 'veu' | 'capuz';
export type Traje = 'tunica' | 'vestido' | 'trapos' | 'manto_rico' | 'habito' | 'avental';
export type Acessorio = 'cajado' | 'cesto' | 'muleta' | 'bolsa' | 'pao' | 'livro';

/** Ficha visual de uma pessoa do jogo. Tudo é desenhado por código a partir dela. */
export interface Figurino {
  genero: 'm' | 'f';
  idade: 'crianca' | 'jovem' | 'adulto' | 'idoso';
  pele: number;
  penteado: Penteado;
  corCabelo: number;
  barba?: 'curta' | 'longa';
  traje: Traje;
  /** Cor principal da roupa. */
  cor: number;
  /** Cor de detalhe: cinto, barra, véu, galão. */
  cor2?: number;
  acessorio?: Acessorio;
  /** Auréola dourada (santos). */
  halo?: boolean;
}

/** Um humano montado: corpo e cabeça separados, para a cabeça acompanhar quem fala. */
export interface Humano {
  raiz: THREE.Group;
  corpo: THREE.Mesh;
  /** Grupo no pescoço: girar em Y vira a cabeça. */
  cabeca: THREE.Group;
  /** Altura dos olhos em metros (para enquadrar o retrato). */
  alturaOlhos: number;
  /**
   * Braços articulados no ombro (para os gestos), com o que a mão segura. O direito do personagem fica em -x.
   * Modelos inteiros (os santos com a iconografia fixa) não têm.
   */
  bracoD?: THREE.Group;
  bracoE?: THREE.Group;
  /** Qual mão está ocupada com um objeto (os gestos de uma mão usam a outra). */
  maoOcupada?: 'd' | 'e';
}

const CABELO_GRISALHO = 0xcfcac2;
const OURO = 0xd9b24a;
const OLHO = 0x2a1a12;

/** Monta um humano voxel a partir da ficha. Corpo e cabeça são duas malhas (dois draw calls). */
export function montarHumano(f: Figurino): Humano {
  const crianca = f.idade === 'crianca';
  const idoso = f.idade === 'idoso';
  const cabelo = idoso && f.penteado !== 'veu' && f.penteado !== 'capuz' ? CABELO_GRISALHO : f.corCabelo;
  const pele = (x: number, y: number, z: number) => variar(f.pele, x, y, z, 0.03);
  const pano = (hex: number, k = 0.06) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
  const roupa = pano(f.cor);
  const detalhe = f.cor2 ?? escurecer(f.cor, 0.35);

  // ── corpo ──
  const c = new Modelo();
  const largo = f.traje === 'vestido' || f.traje === 'habito' || f.traje === 'manto_rico';
  // pés e pernas (as roupas longas cobrem as pernas)
  c.caixa(-2, 0, 0, 2, 1, 3, 0x3a2616).caixa(1, 0, 0, 2, 1, 3, 0x3a2616);
  if (!largo) c.caixa(-2, 1, 0, 2, 4, 2, pele).caixa(1, 1, 0, 2, 4, 2, pele);
  // tronco e saia
  const base = largo ? 1 : 5;
  c.caixa(-3, base, -2, 7, 17 - base, 5, roupa);
  if (largo) c.caixa(-4, 1, -3, 9, 5, 7, roupa); // barra mais larga embaixo
  // trajes
  switch (f.traje) {
    case 'tunica':
      c.caixa(-3, 9, -2, 7, 1, 5, detalhe); // cinto
      break;
    case 'avental':
      c.caixa(-3, 9, -2, 7, 1, 5, detalhe);
      c.caixa(-2, 4, 3, 5, 9, 1, pano(0xe8dfcc, 0.04)); // avental claro
      break;
    case 'vestido':
      c.caixa(-3, 11, -2, 7, 1, 5, detalhe);
      c.caixa(-4, 1, -3, 9, 1, 7, detalhe); // barra
      break;
    case 'habito': {
      const corda = 0xe6dcc2;
      c.caixa(-3, 10, -2, 7, 1, 5, corda);
      // os três nós do cordão franciscano (pobreza, castidade, obediência)
      c.caixa(1, 4, 3, 1, 6, 1, corda).ponto(1, 8, 4, corda).ponto(1, 6, 4, corda).ponto(1, 4, 4, corda);
      c.caixa(-3, 15, -4, 7, 3, 2, pano(escurecer(f.cor, 0.12))); // capuz caído nas costas
      break;
    }
    case 'manto_rico':
      c.caixa(-4, 2, -4, 9, 16, 1, pano(f.cor2 ?? 0x7a1a2a)); // capa
      c.caixa(-3, 1, 3, 1, 16, 1, OURO).caixa(3, 1, 3, 1, 16, 1, OURO); // galões dourados
      c.caixa(-1, 13, 3, 3, 2, 1, OURO); // broche
      break;
    case 'trapos': {
      // pano gasto, remendado, com a barra rasgada
      const gasto = (x: number, y: number, z: number) => {
        const h = Math.sin(x * 7.1 + y * 3.7 + z * 5.3) * 999;
        const r = h - Math.floor(h);
        if (y <= base && r < 0.35) return null;
        return variar(r < 0.08 ? escurecer(f.cor, 0.2) : f.cor, x, y, z, 0.06);
      };
      c.caixa(-3, base, -2, 7, 17 - base, 5, gasto);
      c.caixa(1, 7, 3, 2, 2, 1, pano(f.cor2 ?? 0x8a7a5a)).caixa(-3, 12, 3, 2, 2, 1, pano(f.cor2 ?? 0x6a5a3a)); // remendos
      break;
    }
  }
  // braços com as mãos, cada um num modelo próprio (giram no ombro); o objeto da mão vai junto com o braço
  const bd = new Modelo().caixa(-5, 11, -1, 2, 6, 3, roupa).caixa(-5, 10, -1, 2, 1, 3, pele);
  const be = new Modelo().caixa(4, 11, -1, 2, 6, 3, roupa).caixa(4, 10, -1, 2, 1, 3, pele);
  if (f.genero === 'f' && !crianca) c.caixa(-2, 13, 3, 5, 2, 1, roupa); // busto discreto
  const maoOcupada = f.acessorio === 'cajado' || f.acessorio === 'muleta' ? 'd' : f.acessorio ? 'e' : undefined;
  acessorio(maoOcupada === 'd' ? bd : be, f.acessorio, pele);

  // ── cabeça: 6×6×6 como a do peregrino, rosto em z = 5, base no pescoço ──
  const h = new Modelo();
  const sombraPele = escurecer(f.pele, 0.2);
  h.caixa(0, 0, 0, 6, 6, 6, pele);
  if (idoso) h.caixa(1, 4, 5, 4, 1, 1, sombraPele).ponto(0, 2, 5, sombraPele).ponto(5, 2, 5, sombraPele); // rugas
  penteado(h, f.penteado, cabelo, f.cor2 ?? f.cor);
  h.ponto(1, 2, 5, OLHO).ponto(4, 2, 5, OLHO);
  if (f.genero === 'f' && !crianca) h.ponto(1, 3, 5, OLHO).ponto(4, 3, 5, OLHO).caixa(2, 0, 5, 2, 1, 1, new THREE.Color(f.pele).lerp(new THREE.Color(0xb84a4a), 0.35).getHex()); // lábios
  h.caixa(2, 1, 6, 2, 1, 1, sombraPele); // nariz
  if (f.barba) {
    const b = pano(cabelo, 0.05);
    h.caixa(0, 0, 5, 6, 1, 1, b).caixa(0, 1, 5, 1, 1, 1, b).caixa(5, 1, 5, 1, 1, 1, b);
    h.caixa(0, 0, 3, 1, 2, 2, b).caixa(5, 0, 3, 1, 2, 2, b).caixa(1, -1, 4, 4, 1, 2, b);
    if (f.barba === 'longa') h.caixa(1, -3, 5, 4, 2, 1, b).caixa(2, -5, 5, 2, 2, 1, b);
  }
  if (f.halo)
    for (let x = -3; x <= 8; x++)
      for (let y = -3; y <= 9; y++) {
        const r = Math.hypot(x - 2.5, y - 3);
        if (r > 4 && r < 5.4) h.ponto(x, y, -2, (x + y) % 2 ? OURO : 0xeccb6a);
      }

  const k = crianca ? 0.7 : 1;
  const S = ESCALA_HUMANO * k;
  const corpo = c.malha(S, [0.5, 0, 0.5]);
  const malhaCabeca = h.malha(S, [3, 0, 3]);
  const cabeca = new THREE.Group();
  cabeca.position.y = PESCOCO * S;
  cabeca.add(malhaCabeca);
  // ombros: o meio do braço em x e z, no alto da manga
  const bracoD = new THREE.Group();
  bracoD.position.set((-4 - 0.5) * S, PESCOCO * S, 0);
  bracoD.add(bd.malha(S, [-4, PESCOCO, 0.5]));
  const bracoE = new THREE.Group();
  bracoE.position.set((5 - 0.5) * S, PESCOCO * S, 0);
  bracoE.add(be.malha(S, [5, PESCOCO, 0.5]));
  const raiz = new THREE.Group();
  raiz.add(corpo, cabeca, bracoD, bracoE);
  if (idoso) {
    // os anos pesam: a cabeça e os ombros vêm um pouco para a frente
    cabeca.position.z = 0.6 * S;
    cabeca.rotation.x = 0.12;
  }
  return { raiz, corpo, cabeca, alturaOlhos: (PESCOCO + 2.5) * S, bracoD, bracoE, maoOcupada };
}

function penteado(h: Modelo, p: Penteado, cor: number, pano: number) {
  const c = (x: number, y: number, z: number) => variar(cor, x, y, z, 0.05);
  const v = (x: number, y: number, z: number) => variar(pano, x, y, z, 0.05);
  // topo, nuca e as laterais acima das orelhas (deixa o rosto livre)
  const capa = () => {
    h.caixa(0, 5, 0, 6, 1, 6, c).caixa(0, 4, 0, 6, 1, 5, c).caixa(0, 1, 0, 6, 4, 2, c);
    h.caixa(0, 2, 2, 1, 3, 2, c).caixa(5, 2, 2, 1, 3, 2, c);
  };
  // pano envolvendo a cabeça, com a frente aberta (véu e capuz)
  const manto = (baixo: number) => {
    h.caixa(-1, 6, -1, 8, 1, 7, v).caixa(-1, baixo, -1, 1, 6 - baixo, 7, v).caixa(6, baixo, -1, 1, 6 - baixo, 7, v);
    h.caixa(0, baixo, -1, 6, 6 - baixo, 1, v).caixa(0, 5, 5, 6, 1, 1, v);
  };
  switch (p) {
    case 'calvo':
      h.caixa(0, 1, 0, 6, 3, 1, c).caixa(0, 1, 1, 1, 3, 3, c).caixa(5, 1, 1, 1, 3, 3, c);
      break;
    case 'tonsura':
      // a coroa franciscana: um anel de cabelo em volta e o alto raspado
      h.caixa(0, 3, 0, 6, 2, 1, c).caixa(0, 3, 1, 1, 2, 4, c).caixa(5, 3, 1, 1, 2, 4, c).caixa(0, 4, 5, 6, 1, 1, c);
      break;
    case 'curto':
      capa();
      break;
    case 'longo':
      capa();
      h.caixa(0, -4, -1, 6, 9, 1, c).caixa(-1, -2, -1, 1, 7, 4, c).caixa(6, -2, -1, 1, 7, 4, c);
      break;
    case 'tranca':
      capa();
      for (let y = -7; y < 3; y++) h.caixa(2, y, -1, 2, 1, 1, (y % 2 ? escurecer(cor, 0.2) : cor));
      h.caixa(2, -8, -1, 2, 1, 1, 0xb8333a);
      break;
    case 'coque':
      capa();
      h.caixa(1, 3, -3, 4, 4, 2, c);
      break;
    case 'veu':
      manto(-3);
      h.caixa(0, -4, -1, 6, 1, 1, v);
      break;
    case 'capuz':
      manto(0);
      break;
  }
}

function acessorio(c: Modelo, a: Acessorio | undefined, pele: (x: number, y: number, z: number) => number) {
  const madeira = (x: number, y: number, z: number) => variar(0x6e4a2a, x, y, z, 0.06);
  switch (a) {
    case 'cajado':
      c.caixa(-6, 0, 3, 1, 22, 1, madeira).caixa(-6, 10, 2, 1, 2, 1, pele);
      break;
    case 'muleta':
      c.caixa(-7, 0, 1, 1, 13, 1, madeira).caixa(-8, 12, 1, 3, 1, 1, madeira);
      break;
    case 'cesto':
      c.caixa(4, 7, 2, 4, 3, 3, (x, y, z) => variar(0xb08a4a, x, y, z, 0.12)).caixa(5, 10, 3, 2, 1, 1, 0x8a6a3a);
      c.caixa(5, 9, 3, 2, 1, 1, 0xd8a050); // pães
      break;
    case 'bolsa':
      c.caixa(4, 7, 2, 3, 3, 2, 0x6a3a20).caixa(5, 10, 2, 1, 1, 2, OURO);
      break;
    case 'pao':
      c.caixa(3, 10, 3, 3, 2, 2, 0xd8a050);
      break;
    case 'livro':
      c.caixa(3, 9, 3, 3, 4, 1, 0x8e1b2a).caixa(3, 12, 3, 3, 1, 1, 0xefe4c8);
      break;
  }
}

function escurecer(hex: number, k: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -k * 0.5);
  return c.getHex();
}

/** Gerador simples e determinístico (mulberry32): a mesma semente dá sempre a mesma pessoa. */
function sorteador(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PANOS_SIMPLES = [0x8a7a5a, 0x6a5a48, 0x7a6248, 0x5a6a72, 0x8a6a5a, 0x5e6a4a, 0x9a8a6a];
const PANOS_RICOS = [0x7a1a2a, 0x2a3a7a, 0x1e5a4a, 0x5a2a6a];
const CABELOS = [0x231a17, 0x3b2618, 0x6e4628, 0x9c4822, 0xd0a865];

/** Uma pessoa do povo, sorteada a partir da semente (variedade de multidão sem arte extra). */
export function figurinoDoPovo(semente: number, tipo: 'pobre' | 'povo' | 'rico' = 'povo'): Figurino {
  const r = sorteador(semente);
  const um = <T,>(lista: readonly T[]) => lista[Math.floor(r() * lista.length)];
  const genero = r() < 0.5 ? 'm' : 'f';
  const idade = um(['jovem', 'adulto', 'adulto', 'idoso'] as const);
  const pano = tipo === 'rico' ? um(PANOS_RICOS) : um(PANOS_SIMPLES);
  return {
    genero,
    idade,
    pele: um(TONS_PELE),
    penteado: genero === 'm' ? um(['curto', 'curto', 'calvo', 'capuz'] as const) : um(['longo', 'coque', 'tranca', 'veu'] as const),
    corCabelo: um(CABELOS),
    barba: genero === 'm' && idade !== 'jovem' && r() < 0.6 ? (r() < 0.3 ? 'longa' : 'curta') : undefined,
    traje: tipo === 'pobre' ? 'trapos' : tipo === 'rico' ? 'manto_rico' : genero === 'f' ? um(['vestido', 'avental'] as const) : um(['tunica', 'avental'] as const),
    cor: pano,
    cor2: tipo === 'rico' ? OURO : undefined,
    acessorio: tipo === 'pobre' ? um(['muleta', undefined, undefined] as const) : tipo === 'rico' ? 'bolsa' : um(['cesto', 'pao', undefined, undefined] as const),
  };
}
