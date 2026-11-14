import * as THREE from 'three';
import { Ruido } from '../core/Ruido';
import type { Povoamento } from '../fauna/Fauna';
import { Sombra } from '../entidades/Sombra';
import type { FonteMapa } from '../ui/Minimapa';
import { variar } from '../voxel/Modelo';
import type { Area } from './Area';
import { Oceano } from './Oceano';
import { blocosDeColunas } from './Terreno';

/** Canto do mapa de Creta no mundo (longe das outras áreas). */
export const ORIGEM_CRETA = new THREE.Vector3(1600, 0, 0);
/** Colunas de 1 m de cada lado. */
const TAM = 320;
const META = TAM / 2;
/** O nível do mar (m). Abaixo dele, o fundo; a terra começa logo acima. */
export const NIVEL_MAR = 8;
/** Fundo do mar aberto, fora do mapa (m): fundo demais para se ficar de pé; nada-se para onde quiser. */
const FUNDO_ABERTO = NIVEL_MAR - 8;

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A linha da costa (z local) em cada x: a terra fica ao norte (z menor), o mar ao sul. No meio, a enseada de Bons
 * Portos entra pela terra (At 27,8); a leste a costa sobe em falésias.
 */
function costa(x: number) {
  return 34 + 14 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.063 + 1.1) - 40 * Math.exp(-((x + 5) ** 2) / (2 * 38 * 38));
}

/** As ilhotas na boca da enseada (x, z locais e raio). */
const ILHOTAS: [number, number, number][] = [
  [-22, 44, 9],
  [20, 58, 6],
];

/**
 * Creta: a costa sul, em Bons Portos, perto da cidade de Laseia (At 27,8), onde o navio de Paulo esperou o tempo
 * firmar. É a primeira das três partes do Mar da Tempestade (Creta, o navio, Malta). O mapa (320 × 320 m) é feito de
 * blocos (`blocosDeColunas`); o mar é o `Oceano`, que segue o jogador até o horizonte. Fora do mapa é mar aberto:
 * nada-se até onde se quiser.
 */
export class Creta implements Area {
  readonly id = 'creta' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  /** Os bichos não entram no mar; as sombras boiam nele. */
  readonly nivelMinimo = NIVEL_MAR;
  readonly oceano = new Oceano(NIVEL_MAR, 0x1d7f98);
  /** Na praia da enseada, olhando o mar. */
  readonly chegada: THREE.Vector3;
  /** Na ponta da ilhota maior (para testar a travessia a nado). */
  readonly ilhota: THREE.Vector3;
  private readonly alturas = new Int16Array(TAM * TAM);
  private readonly ruido = new Ruido(4127);
  private readonly ruidoCor = new Ruido(311);

  constructor() {
    for (let i = 0; i < TAM; i++)
      for (let j = 0; j < TAM; j++) this.alturas[i * TAM + j] = Math.max(0, Math.round(this.gerar(i - META + 0.5, j - META + 0.5)));
    const terreno = blocosDeColunas(TAM, (i, j) => this.alturas[i * TAM + j], (i, j, h) => this.corTopo(i, j, h),
      (i, y, j, prof, topo) => this.corLado(i, y, j, prof, topo), 12);
    terreno.position.copy(ORIGEM_CRETA);
    this.grupo.add(terreno, this.oceano.malha);
    this.chegada = this.w(-5, costa(-5) - 7);
    this.ilhota = this.w(ILHOTAS[0][0], ILHOTAS[0][1]);
  }

  /** A altura (contínua) do chão no ponto local. */
  private gerar(x: number, z: number) {
    const d = costa(x) - z; // quanto se está terra adentro (negativo: no mar)
    const falesia = suave(60, 105, x) + suave(-70, -115, x) * 0.6;
    let h: number;
    if (d >= 0) {
      // a praia sobe devagar; atrás dela, colinas de mato baixo; ao norte, as montanhas (o Ida, ao longe)
      const praia = NIVEL_MAR + 0.4 + Math.min(d, 14) * 0.12;
      const colinas = suave(10, 70, d) * this.ruido.fbm(x * 0.012 + 3, z * 0.012 + 3, 4) * 24;
      const montanhas = suave(70, 160, -z) * (0.55 + 0.45 * this.ruido.fbm(x * 0.02, z * 0.02, 3)) * 36;
      const rocha = falesia * 9 * suave(-0.5, 3.5, d);
      h = praia + colinas + montanhas + rocha + (this.ruido.fbm(x * 0.15, z * 0.15, 2) - 0.5) * 1.2 * suave(8, 20, d);
    } else {
      // o fundo desce da praia para o mar aberto (mais depressa ao pé das falésias), com dunas de areia
      const fundura = Math.min(8, 0.8 + -d * 0.2 * (1 + falesia * 1.5));
      h = NIVEL_MAR - fundura + (this.ruido.fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.4;
    }
    // as ilhotas: rochedos de contorno irregular, com paredões e um topo ondulado, e uma prainha no pé
    for (const [ix, iz, r] of ILHOTAS) {
      const ang = Math.atan2(z - iz, x - ix);
      const ri = r * (0.7 + 0.6 * this.ruido.fbm(Math.cos(ang) * 1.3 + ix, Math.sin(ang) * 1.3 + iz, 3));
      const di = Math.hypot(x - ix, z - iz);
      if (di < ri + 7) {
        // a prainha em volta desce para o fundo; dentro do contorno, o rochedo sobe num paredão
        const praia = NIVEL_MAR + 0.5 - suave(ri + 1, ri + 7, di) * 4;
        const rocha = di < ri
          ? NIVEL_MAR + 2.5 + r * 0.55 * suave(0, ri * 0.6, ri - di) + this.ruido.fbm(x * 0.12 + 7, z * 0.12, 3) * 4
          : -99;
        h = Math.max(h, praia, rocha);
      }
    }
    return h;
  }

  private h(i: number, j: number) {
    if (i < 0 || j < 0 || i >= TAM || j >= TAM) return Math.round(FUNDO_ABERTO);
    return this.alturas[i * TAM + j];
  }

  private corTopo(i: number, j: number, h: number) {
    const x = i - META, z = j - META;
    const n = this.ruidoCor.fbm(x * 0.07, z * 0.07, 3);
    if (h < NIVEL_MAR) {
      const fundura = NIVEL_MAR - h;
      if (fundura <= 1) return variar(0xdccb94, i, h, j, 0.04);
      if (fundura <= 3) return variar(n > 0.55 ? 0x9aa07a : 0xc4b282, i, h, j, 0.05);
      return variar(n > 0.5 ? 0x5a7a50 : 0x7d8e72, i, h, j, 0.05); // a posidônia, a erva do fundo do Mediterrâneo
    }
    const inclinacao = Math.max(
      Math.abs(this.h(i + 1, j) - h), Math.abs(this.h(i - 1, j) - h), Math.abs(this.h(i, j + 1) - h), Math.abs(this.h(i, j - 1) - h),
    );
    if (inclinacao >= 3 || h >= NIVEL_MAR + 34) return variar(n > 0.5 ? 0xd2c9b2 : 0xc2b89e, i, h, j, 0.05); // calcário
    if (h <= NIVEL_MAR + 1 && costa(x) - z < 16) return variar(n > 0.5 ? 0xe8d8a6 : 0xdecb94, i, h, j, 0.04); // areia
    // o mato seco de Creta: tomilho, lentisco e terra clara entre eles
    const mato = n < 0.35 ? 0x8f9a4e : n < 0.55 ? 0xa6a660 : n < 0.68 ? 0x7c8a46 : 0xbcae78;
    return variar(mato, i, h, j, 0.05);
  }

  private corLado(i: number, y: number, j: number, prof: number, topo: number) {
    if (prof === 0) return topo;
    if (y < NIVEL_MAR + 1) return variar(0xc9b888, i, y, j, 0.05);
    return variar(y % 3 === 0 ? 0xb8ad94 : 0xc6bba0, i, y, j, 0.04); // camadas de calcário
  }

  /** Ponto do mundo a partir do local, no chão. */
  private w(lx: number, lz: number) {
    const p = new THREE.Vector3(lx + ORIGEM_CRETA.x, 0, lz + ORIGEM_CRETA.z);
    p.y = this.altura(p.x, p.z);
    return p;
  }

  // ───────────── física ─────────────

  altura(x: number, z: number) {
    const i = Math.floor(x - ORIGEM_CRETA.x + META), j = Math.floor(z - ORIGEM_CRETA.z + META);
    return this.h(i, j);
  }

  colidir() {
    /* ainda sem construções: a fase do porto as traz */
  }

  /** O mar, com as ondas (na terra seca a água fica abaixo do chão e não conta). */
  nivelAgua(x: number, z: number) {
    return this.oceano.altura(x, z);
  }

  atualizar(dt: number, jogador: THREE.Vector3) {
    this.oceano.atualizar(dt, jogador);
  }

  povoamento(): Povoamento[] {
    const c = (lx: number, lz: number): [number, number] => [lx + ORIGEM_CRETA.x, lz + ORIGEM_CRETA.z];
    return [
      { especie: 'cabra', quantidade: 5, centro: c(-60, -40), raio: 22 },
      { especie: 'lagartixa', quantidade: 6, centro: c(0, -20), raio: 40 },
      { especie: 'gato', quantidade: 2, centro: c(-5, costa(-5) - 14), raio: 8 },
      { especie: 'aguia', quantidade: 1, centro: c(0, -60), raio: 60 },
    ];
  }

  fonteMapa(): FonteMapa {
    return {
      x0: ORIGEM_CRETA.x - META, z0: ORIGEM_CRETA.z - META, largura: TAM, profundidade: TAM,
      cor: (x, z) => {
        const i = Math.floor(x - ORIGEM_CRETA.x + META), j = Math.floor(z - ORIGEM_CRETA.z + META);
        const h = this.h(i, j);
        if (h < NIVEL_MAR) return NIVEL_MAR - h <= 1.5 ? 0x6fc4cc : NIVEL_MAR - h <= 4 ? 0x3c9cb0 : 0x1f6f8a;
        return this.corTopo(i, j, h);
      },
    };
  }
}
