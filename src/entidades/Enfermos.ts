import * as THREE from 'three';
import type { IdFalante } from '../dialogo/Falantes';
import { registrarRetrato } from '../dialogo/Retratos';
import { ESCALA_HUMANO, montarHumano, type Figurino, type Humano } from '../voxel/Humano';

/**
 * Os esquecidos das Ruas da Bahia: os doentes que a cidade deixou cair e que o peregrino recolhe, um por um,
 * para a porta do Convento de Santo Antônio (a provação da região; docs/regioes/01-ruas-da-bahia.md, seção 6).
 * Cada um tem um nome, uma pequena história (o nó `bahia_enfermo_<id>` em bahia.ink) e um obstáculo: a maré, a
 * fila dos que passam, o beco fechado.
 */
export interface DefEnfermo {
  id: string;
  falante: IdFalante;
  /** Como o jogo o chama nos avisos ("Dona Zefa"). */
  nome: string;
  area: 'bahiabaixa' | 'bahiaalta';
  /** Onde está caído (local da área) e para onde aponta a cabeça (0: a cabeça para -z). */
  lugar: [number, number, number];
  /** Deitado numa esteira (na rua, numa varanda) ou no fundo de uma canoa. */
  sobre: 'esteira' | 'canoa';
  figurino: Figurino;
}

export const ENFERMOS: DefEnfermo[] = [
  {
    id: 'zefa', falante: 'zefa', nome: 'Dona Zefa', area: 'bahiabaixa', lugar: [-33, -41.7, Math.PI / 2], sobre: 'esteira',
    figurino: { genero: 'f', idade: 'idoso', pele: 0x8a5a3a, penteado: 'coque', corCabelo: 0x2a2018, traje: 'vestido', cor: 0x8a8a6a, cor2: 0x6a6a50 },
  },
  {
    id: 'lucia', falante: 'lucia', nome: 'Lúcia', area: 'bahiabaixa', lugar: [-32, -66.7, Math.PI / 2], sobre: 'esteira',
    figurino: { genero: 'f', idade: 'jovem', pele: 0x7a4a2e, penteado: 'tranca', corCabelo: 0x1a1410, traje: 'avental', cor: 0xd8d0c0, cor2: 0x6a8aa0 },
  },
  {
    id: 'bento', falante: 'bento', nome: 'Seu Bento', area: 'bahiabaixa', lugar: [-62, -14, 0.4], sobre: 'canoa',
    figurino: { genero: 'm', idade: 'idoso', pele: 0x6a4028, penteado: 'calvo', corCabelo: 0x3a3028, barba: 'curta', traje: 'trapos', cor: 0x5a6a7a, cor2: 0x8a7a5a },
  },
  {
    id: 'raimundo', falante: 'raimundo', nome: 'Raimundo', area: 'bahiabaixa', lugar: [-31, 24.4, Math.PI / 2], sobre: 'esteira',
    figurino: { genero: 'm', idade: 'adulto', pele: 0x5a3622, penteado: 'curto', corCabelo: 0x1a1410, traje: 'trapos', cor: 0x8a7050, cor2: 0x5a4a3a },
  },
  {
    id: 'ana', falante: 'ana', nome: 'Dona Ana', area: 'bahiaalta', lugar: [9, -51.1, Math.PI / 2], sobre: 'esteira',
    figurino: { genero: 'f', idade: 'idoso', pele: 0x4a2c1c, penteado: 'veu', corCabelo: 0xcfcac2, traje: 'vestido', cor: 0x4a5a8a, cor2: 0xe8e2d6 },
  },
  {
    id: 'joao', falante: 'joao', nome: 'João', area: 'bahiaalta', lugar: [4, -59.6, 0], sobre: 'esteira',
    figurino: { genero: 'm', idade: 'jovem', pele: 0xa87a58, penteado: 'curto', corCabelo: 0x2a1a10, traje: 'trapos', cor: 0xc8c0b0, cor2: 0x7a6a50 },
  },
];

export const enfermo = (id: string) => ENFERMOS.find((e) => e.id === id);

/** Os retratos da caixa de diálogo (o rosto de pé de cada um). */
export function registrarRetratosDosEnfermos() {
  for (const e of ENFERMOS) registrarRetrato(e.falante, () => montarHumano(e.figurino));
}

/** O voxel efetivo (m) de um humano montado com a ficha, já com a escala extra `f`. */
const voxelDe = (f: Figurino, extra = 1) => ESCALA_HUMANO * (f.idade === 'crianca' ? 0.7 : 1) * extra;

/**
 * Nas costas de quem carrega (o peregrino): de pé atrás dele, os braços por cima dos ombros e a cabeça caída de
 * lado. O pivô do humano é nos pés, então ele não se inclina (o tronco entraria no peregrino); a altura põe os
 * ombros de quem é carregado logo acima dos do peregrino (1,56 m) e as costas dele a 6 cm do tronco (0,21 m).
 * Adultos vão um pouco menores (0,8): magros da doença, e sem isso a cabeça passaria muito do chapéu.
 * O grupo devolvido vai na origem do corpo do peregrino.
 */
export function nasCostas(h: Humano, f: Figurino): THREE.Group {
  const extra = f.idade === 'crianca' ? 1 : 0.8;
  const s = voxelDe(f, extra);
  h.raiz.scale.setScalar(extra);
  h.raiz.position.set(0, 1.56 - 17 * s, -(0.2125 + 2.5 * s + 0.06));
  h.raiz.rotation.x = -0.04;
  h.bracoD?.rotation.set(-1.45, 0, 0.22);
  h.bracoE?.rotation.set(-1.45, 0, -0.22);
  h.cabeca.rotation.set(0.04, 0.35, 0.22);
  h.corpo.castShadow = true;
  const g = new THREE.Group();
  g.add(h.raiz);
  return g;
}

/**
 * Deitado de costas sobre algo de altura `base` (a esteira tem 0,25 m), centrado no grupo e ao longo de z, com a
 * cabeça para -z. O corpo mede 23 voxels (pés ao alto da cabeça).
 */
export function deitado(h: Humano, f: Figurino, base = 0.25): THREE.Group {
  const s = voxelDe(f);
  h.raiz.rotation.x = -Math.PI / 2;
  h.raiz.position.set(0, base + 2.5 * s, 11.5 * s);
  h.cabeca.rotation.y = 0.5;
  h.bracoD?.rotation.set(0, 0, 0.12);
  h.bracoE?.rotation.set(0, 0, -0.12);
  h.corpo.castShadow = true;
  const g = new THREE.Group();
  g.add(h.raiz);
  return g;
}

/** O corpo de um enfermo numa pose. */
export function corpoDoEnfermo(e: DefEnfermo, pose: 'costas' | 'deitado', base = 0.25) {
  const h = montarHumano(e.figurino);
  return pose === 'costas' ? nasCostas(h, e.figurino) : deitado(h, e.figurino, base);
}
