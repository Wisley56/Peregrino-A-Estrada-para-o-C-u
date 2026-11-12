import gerado from './especies.gerado.json';

/**
 * Catálogo da fauna. A anatomia (peças .vox, deslocamentos e esqueleto) vem do Veloren, importada por
 * `tools/fauna-veloren.mjs` para `especies.gerado.json`. Aqui fica só o que é decisão de jogo: como cada
 * bicho se comporta, a voz, se aceita carinho.
 */
export type TipoCorpo = 'quadruped_small' | 'quadruped_medium' | 'bird_medium';

export interface Peca {
  /** Caminho a partir de `assets/veloren/fauna/`. */
  arquivo: string;
  /** Deslocamento do Veloren, em voxels (coordenadas .vox). */
  desloc: [number, number, number];
  /** O Veloren carrega o lado esquerdo espelhado. */
  espelhar: boolean;
}

export interface Anatomia {
  veloren: string;
  corpo: TipoCorpo;
  pecas: Record<string, Peca>;
  /** `SkeletonAttr` do Veloren: posição de cada osso, escala e ritmo. */
  attr: Record<string, number | boolean | (number | boolean)[]>;
}

/**
 * - `pasto`: vaga devagar e pasta; só se afasta se for empurrado.
 * - `arisco`: foge quando o peregrino chega perto.
 * - `manso`: chega perto e segue o peregrino um pouco (cães, gatos).
 * - `ave_chao`: anda e cisca; corre batendo as asas quando assustada.
 * - `ave_voo`: pousa e cisca; levanta voo quando assustada e pousa em outro lugar.
 * - `voo_continuo`: está sempre no ar (águia planando, morcegos).
 */
export type Comportamento = 'pasto' | 'arisco' | 'manso' | 'ave_chao' | 'ave_voo' | 'voo_continuo';

export type VozAnimal =
  | 'balido' | 'balido_agudo' | 'latido' | 'miado' | 'grunhido' | 'mugido' | 'relincho' | 'zurro'
  | 'cacarejo' | 'grasnado' | 'crocito' | 'pio' | 'uivo' | 'guincho' | 'coaxo' | 'grito_aguia' | 'pavao' | 'gemido';

export interface Ficha {
  nome: string;
  /** Artigo para "fazer carinho no/na …". */
  feminino?: boolean;
  comportamento: Comportamento;
  /** Velocidade de passeio (m/s); fugindo, o dobro e meio. */
  velocidade: number;
  /** Distância (m) que assusta o bicho. */
  fuga?: number;
  /** Aceita carinho do peregrino (F). */
  carinho?: boolean;
  voz?: VozAnimal;
  /** Anda pela água (patos, gansos). */
  nada?: boolean;
  /** Altura de voo (m sobre o chão) para aves. */
  altitude?: number;
  /** Bicho pequeno: não projeta sombra (economia no mapa de sombras). */
  semSombra?: boolean;
}

export const FICHAS = {
  ovelha: { nome: 'ovelha', feminino: true, comportamento: 'pasto', velocidade: 1.1, carinho: true, voz: 'balido' },
  cabra: { nome: 'cabra', feminino: true, comportamento: 'pasto', velocidade: 1.3, fuga: 2, carinho: true, voz: 'balido_agudo' },
  coelho: { nome: 'coelho', comportamento: 'arisco', velocidade: 1.6, fuga: 6, semSombra: true },
  lebre: { nome: 'lebre', feminino: true, comportamento: 'arisco', velocidade: 2, fuga: 8, semSombra: true },
  esquilo: { nome: 'esquilo', comportamento: 'arisco', velocidade: 1.8, fuga: 5, semSombra: true },
  raposa: { nome: 'raposa', feminino: true, comportamento: 'arisco', velocidade: 1.8, fuga: 9 },
  rato: { nome: 'rato', comportamento: 'arisco', velocidade: 1.6, fuga: 3.5, voz: 'guincho', semSombra: true },
  sapo: { nome: 'sapo', comportamento: 'arisco', velocidade: 0.9, fuga: 2.5, voz: 'coaxo', semSombra: true },
  lagartixa: { nome: 'lagartixa', feminino: true, comportamento: 'arisco', velocidade: 1.8, fuga: 3.5, semSombra: true },
  tartaruga: { nome: 'tartaruga', feminino: true, comportamento: 'pasto', velocidade: 0.25, carinho: true, semSombra: true },
  hiena: { nome: 'hiena', feminino: true, comportamento: 'arisco', velocidade: 1.6, fuga: 14, voz: 'gemido' },
  cao: { nome: 'cão', comportamento: 'manso', velocidade: 1.8, carinho: true, voz: 'latido' },
  gato: { nome: 'gato', comportamento: 'manso', velocidade: 1.2, fuga: 1.5, carinho: true, voz: 'miado', semSombra: true },
  porco: { nome: 'porco', comportamento: 'pasto', velocidade: 0.9, carinho: true, voz: 'grunhido' },
  cervo: { nome: 'cervo', comportamento: 'arisco', velocidade: 1.5, fuga: 14 },
  camelo: { nome: 'camelo', comportamento: 'pasto', velocidade: 1.2, carinho: true, voz: 'gemido' },
  antilope: { nome: 'antílope', comportamento: 'arisco', velocidade: 1.6, fuga: 15 },
  jumento: { nome: 'jumento', comportamento: 'pasto', velocidade: 1.1, carinho: true, voz: 'zurro' },
  cavalo: { nome: 'cavalo', comportamento: 'pasto', velocidade: 1.4, carinho: true, voz: 'relincho' },
  boi: { nome: 'boi', comportamento: 'pasto', velocidade: 0.8, carinho: true, voz: 'mugido' },
  lobo: { nome: 'lobo', comportamento: 'arisco', velocidade: 1.6, fuga: 12, voz: 'uivo' },
  galinha: { nome: 'galinha', feminino: true, comportamento: 'ave_chao', velocidade: 0.9, fuga: 2.5, voz: 'cacarejo', semSombra: true },
  pato: { nome: 'pato', comportamento: 'ave_chao', velocidade: 0.8, fuga: 3, voz: 'grasnado', nada: true, semSombra: true },
  ganso: { nome: 'ganso', comportamento: 'ave_chao', velocidade: 0.9, fuga: 2.5, voz: 'grasnado', nada: true },
  pavao: { nome: 'pavão', comportamento: 'ave_chao', velocidade: 0.8, fuga: 3, voz: 'pavao' },
  corvo: { nome: 'corvo', comportamento: 'ave_voo', velocidade: 0.8, fuga: 5, voz: 'crocito', altitude: 9, semSombra: true },
  aguia: { nome: 'águia', feminino: true, comportamento: 'voo_continuo', velocidade: 6, voz: 'grito_aguia', altitude: 26 },
  coruja: { nome: 'coruja', feminino: true, comportamento: 'ave_voo', velocidade: 0.5, fuga: 4, voz: 'pio', altitude: 7, semSombra: true },
  morcego: { nome: 'morcego', comportamento: 'voo_continuo', velocidade: 4, voz: 'guincho', altitude: 2.3, semSombra: true },
} satisfies Record<string, Ficha>;

export type IdEspecie = keyof typeof FICHAS;

const ANATOMIAS = (gerado as unknown as { especies: Record<string, Anatomia> }).especies;

export function anatomia(id: IdEspecie): Anatomia {
  const a = ANATOMIAS[id];
  if (!a) throw new Error(`espécie "${id}" não importada: rode npm run fauna`);
  return a;
}

export function ficha(id: IdEspecie): Ficha {
  return FICHAS[id];
}
