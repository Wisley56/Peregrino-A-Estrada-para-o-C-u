import { NIVEL_MAR } from './Geografia';
import type { TerrenoMundo } from './TerrenoMundo';

const RASO = [0x4a, 0xa8, 0xc0], FUNDO = [0x1d, 0x5f, 0x86];

/**
 * Pinta o chão do mundo visto de cima num canvas: `passo` metros por pixel, o relevo sombreado (luz do noroeste) e o
 * mar mais escuro quanto mais fundo. É a base do mapa-múndi (e serve para conferir a geografia no modo dev).
 */
export function pintarMapa(terreno: TerrenoMundo, x0: number, z0: number, x1: number, z1: number, passo: number) {
  const larg = Math.ceil((x1 - x0) / passo), alt = Math.ceil((z1 - z0) / passo);
  const tela = document.createElement('canvas');
  tela.width = larg;
  tela.height = alt;
  const ctx = tela.getContext('2d')!;
  const img = ctx.createImageData(larg, alt);
  // uma linha e uma coluna a mais de alturas, para a sombra do relevo
  const h = new Float32Array((larg + 1) * (alt + 1));
  for (let j = 0; j <= alt; j++) for (let i = 0; i <= larg; i++) h[j * (larg + 1) + i] = terreno.altura(x0 + i * passo, z0 + j * passo);
  for (let j = 0; j < alt; j++)
    for (let i = 0; i < larg; i++) {
      const a = h[j * (larg + 1) + i];
      const k = (j * larg + i) * 4;
      let r: number, g: number, b: number;
      if (a < NIVEL_MAR) {
        const t = Math.min(1, (NIVEL_MAR - a) / 9);
        r = RASO[0] + (FUNDO[0] - RASO[0]) * t;
        g = RASO[1] + (FUNDO[1] - RASO[1]) * t;
        b = RASO[2] + (FUNDO[2] - RASO[2]) * t;
      } else {
        const cor = terreno.cor(x0 + i * passo, z0 + j * passo);
        // quanto o chão sobe para o sudeste (de costas para a luz): escurece; para o noroeste: clareia
        const queda = (h[(j + 1) * (larg + 1) + i + 1] - a) / passo;
        const luz = Math.max(0.55, Math.min(1.3, 1 - queda * 0.9));
        r = Math.min(255, ((cor >> 16) & 255) * luz);
        g = Math.min(255, ((cor >> 8) & 255) * luz);
        b = Math.min(255, (cor & 255) * luz);
      }
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return tela;
}
