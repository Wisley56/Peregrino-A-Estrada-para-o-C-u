import { Modelo, variar } from '../../voxel/Modelo';
import type { Devocao } from './Geografia';

const v = (hex: number, k = 0.05) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);

/**
 * Capelinha de beira de estrada (voxel de 0,1 m), como os oratórios caiados das estradas do interior: plinto de
 * pedra, barrado azul, nicho em arco com a imagem, telhado de duas águas em telha de barro e a cruz na cumeeira.
 * A frente olha para +z. Ocupa 1,8 × 1,6 m no chão (`MEIO_CAPELINHA`).
 */
export function capelinha() {
  const m = new Modelo();
  const cal = v(0xeee8da, 0.03), pedra = v(0x9d968a, 0.07), cantaria = v(0xd8c8a0, 0.04);
  m.caixa(-9, 0, -8, 18, 3, 16, pedra); // o plinto
  m.caixa(-6, 0, 8, 12, 1, 3, pedra); // o degrau de quem reza
  m.caixa(-8, 3, -6, 16, 18, 12, cal); // o corpo caiado
  m.caixa(-8, 3, -6, 16, 3, 12, v(0x2f5a9a, 0.04)); // o barrado azul
  // o nicho: fundo azul-escuro, emoldurado de cantaria, fechado em arco
  for (let x = -5; x <= 5; x++)
    for (let y = 7; y <= 21; y++) {
      const arco = y <= 16 || Math.hypot(x, y - 16) <= 5.2;
      const dentro = Math.abs(x) <= 3 && (y <= 16 || Math.hypot(x, y - 16) <= 3.6) && y >= 8;
      if (dentro) for (let z = 2; z <= 5; z++) m.ponto(x, y, z, null);
      else if (arco && y >= 7) m.ponto(x, y, 6, cantaria(x, y, 6));
    }
  m.caixa(-3, 8, 1, 7, 12, 1, v(0x2a3f78, 0.03));
  m.caixa(-3, 7, 2, 7, 1, 4, cantaria); // o peitoril do nicho
  // as velas e as flores do peitoril
  m.ponto(-3, 8, 5, 0xf4efe0).ponto(-3, 9, 5, 0xffd25a).ponto(3, 8, 5, 0xf4efe0).ponto(3, 9, 5, 0xffd25a);
  m.ponto(-6, 3, 7, 0xe84a6a).ponto(6, 3, 7, 0xf2d24a).ponto(-5, 3, 7, 0xffffff).ponto(5, 3, 7, 0xe84a6a);
  // o telhado de duas águas (a cumeeira corre de frente para trás), em fiadas de telha
  for (let k = 0; k < 8; k++) m.caixa(-10 + k, 21 + k, -8, 20 - 2 * k, 1, 16, k % 2 ? v(0x8f4226, 0.06) : v(0xa8502e, 0.06));
  m.caixa(-1, 29, 6, 2, 1, 2, cantaria);
  // a cruz de ferro na cumeeira
  m.caixa(0, 30, 6, 1, 6, 1, 0x3a3a3e).caixa(-2, 33, 6, 5, 1, 1, 0x3a3a3e);
  return m.geometria(0.1, [0, 0, 0]);
}

/** Meia largura e meia profundidade (m) da capelinha no chão, para o choque. */
export const MEIO_CAPELINHA = { x: 0.95, z: 0.85 };

/**
 * A imagem do nicho (voxel de 0,035 m, uns 60 cm de altura), na iconografia de cada devoção:
 * - São Cristóvão: o gigante de túnica e manto vermelho que atravessa o rio apoiado num tronco, com o Menino Jesus
 *   no ombro;
 * - Nossa Senhora da Guia: de manto azul e véu branco, com o Menino no braço esquerdo;
 * - Nossa Senhora da Boa Viagem: de manto azul e coroa, o Menino num braço e o barquinho na outra mão.
 */
export function imagem(d: Devocao) {
  const m = new Modelo();
  const pele = 0xe8c8a4, ouro = 0xd8b04a;
  m.caixa(-4, 0, -3, 9, 2, 6, v(0x6e4a2a, 0.04)); // o pedestal
  if (d === 'cristovao') {
    m.caixa(-4, 2, -3, 9, 2, 6, v(0x3f7ab0, 0.08)); // a água do rio em volta dos pés
    m.caixa(-2, 4, -1, 2, 6, 2, 0x5a4a3a).caixa(1, 4, -1, 2, 6, 2, 0x5a4a3a); // as pernas
    m.caixa(-3, 10, -2, 7, 7, 4, v(0x3f6a3a, 0.04)); // a túnica verde
    m.caixa(-3, 10, -2, 1, 7, 4, v(0xa83228, 0.04)).caixa(-3, 16, -2, 7, 1, 4, v(0xa83228, 0.04)); // o manto vermelho
    m.caixa(-1, 17, -1, 3, 3, 3, pele).caixa(-1, 20, -1, 3, 1, 3, 0x4a3426).caixa(-1, 17, 1, 3, 1, 1, 0x4a3426); // cabeça e barba
    m.caixa(4, 4, 0, 1, 16, 1, v(0x6a7a3a, 0.06)).ponto(4, 20, 0, 0x5a8a3a).ponto(5, 20, 0, 0x5a8a3a); // o tronco que floresce
    m.caixa(4, 13, 0, 1, 1, 1, pele).caixa(3, 13, 0, 1, 1, 1, pele); // a mão no tronco
    // o Menino no ombro esquerdo, com o globo
    m.caixa(-3, 17, -1, 2, 2, 2, 0xf2f0ea).caixa(-3, 19, -1, 2, 2, 2, pele).ponto(-3, 21, -1, ouro).ponto(-4, 18, 0, 0x3a6ab0);
  } else {
    const manto = v(0x2e56b0, 0.04);
    // o manto azul, mais largo embaixo, com a túnica branca aparecendo na frente
    for (let y = 2; y < 15; y++) {
      const w = y < 6 ? 4 : y < 11 ? 3 : 2;
      m.caixa(-w, y, -2, 2 * w + 1, 1, 4, manto);
      m.caixa(-1, y, 2, 3, 1, 1, y < 13 ? 0xf2efe6 : manto(0, y, 2));
    }
    m.caixa(-1, 15, -1, 3, 3, 3, pele);
    if (d === 'guia') m.caixa(-2, 15, -2, 5, 4, 3, 0xf4f2ec).caixa(-1, 18, -1, 3, 1, 3, 0xf4f2ec); // o véu branco
    else m.caixa(-2, 18, -1, 5, 1, 3, ouro).ponto(-2, 19, -1, ouro).ponto(2, 19, -1, ouro).ponto(0, 19, 1, ouro); // a coroa
    m.caixa(-1, 15, -1, 3, 3, 1, 0x4a3426); // o cabelo atrás
    // o Menino no braço esquerdo
    m.caixa(-5, 7, 0, 3, 4, 3, 0xf2f0ea).caixa(-5, 11, 0, 3, 3, 3, pele).caixa(-5, 14, 0, 3, 1, 3, ouro);
    if (d === 'boaviagem') {
      // o barquinho na mão direita: o casco escuro e a vela branca
      m.caixa(2, 9, 1, 4, 1, 2, pele).caixa(3, 10, 0, 5, 1, 3, 0x6a4a2a).caixa(5, 11, 1, 1, 4, 1, 0x8a6a42).caixa(4, 12, 1, 1, 3, 1, 0xf4efe0);
    }
  }
  return m.geometria(0.035, [0.5, 0, 0]);
}
