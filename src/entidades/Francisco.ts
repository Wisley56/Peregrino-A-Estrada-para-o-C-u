import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import type { Humano } from '../voxel/Humano';
import type { DefNpc } from './Npc';

const S = 0.085; // mesma escala de voxel do peregrino

/**
 * São Francisco de Assis (arte por código), a partir da imagem de referência do projeto e da iconografia
 * tradicional: frade de rosto sereno, com a tonsura (coroa de cabelo castanho em volta da cabeça raspada) e a
 * barba castanha cheia; hábito castanho de lã, longo até os pés, de mangas largas, com a gola larga do capuz
 * caída sobre os ombros; na cintura, o cordão claro com os nós (pobreza, castidade e obediência) pendendo na
 * frente, e o terço de contas de madeira com a cruz; os dois braços erguidos, mãos abertas, com as pombas
 * brancas pousadas (a pregação às aves). O halo claro fica atrás da cabeça.
 */
function modeloFrancisco() {
  const m = new Modelo();
  const habito = (x: number, y: number, z: number) => variar(0x8e5a32, x, y, z, 0.05);
  const sombra = (x: number, y: number, z: number) => variar(0x744626, x, y, z, 0.05);
  const luz = (x: number, y: number, z: number) => variar(0xa06a3c, x, y, z, 0.04);
  const pele = (x: number, y: number, z: number) => variar(0xe0aa82, x, y, z, 0.03);
  const cabelo = (x: number, y: number, z: number) => variar(0x5a3620, x, y, z, 0.05);
  const barba = (x: number, y: number, z: number) => variar(0x4a2c18, x, y, z, 0.05);
  const CORDAO = 0xd8c8a0, NO = 0xc4b08a, CONTA = 0x5a3a22, POMBA = 0xf4f2ec, ASA = 0xc8ccd4, BICO = 0x8a6a6a;

  // hábito longo até os pés, mais largo embaixo, com pregas fundas
  m.caixa(-4, 0, -2, 9, 5, 5, habito);
  m.caixa(-3, 5, -2, 7, 10, 5, habito);
  for (const x of [-3, -1, 2, 4]) m.caixa(x, 0, 3, 1, 7, 1, sombra);
  m.caixa(-1, 0, 3, 1, 1, 1, pele).caixa(1, 0, 3, 1, 1, 1, pele); // pontas dos pés descalços
  m.caixa(0, 5, 3, 1, 9, 1, luz); // luz no meio do peito
  // cordão claro na cintura, caindo na frente com os nós
  m.caixa(-4, 8, -2, 9, 1, 6, CORDAO);
  m.caixa(-1, 1, 4, 1, 7, 1, CORDAO);
  m.ponto(-1, 5, 5, NO).ponto(-1, 3, 5, NO).ponto(-1, 1, 5, NO);
  // terço de contas de madeira com a cruz, do lado esquerdo dele (+x)
  for (let y = 2; y < 8; y++) m.ponto(1 + (y % 2), y, 4, CONTA);
  m.caixa(1, 0, 4, 1, 2, 1, 0x8a6a3a).ponto(0, 1, 4, 0x8a6a3a).ponto(2, 1, 4, 0x8a6a3a);
  // gola larga do capuz sobre os ombros, na frente e nas costas
  m.caixa(-5, 14, -3, 11, 3, 7, sombra);
  m.caixa(-4, 13, 3, 9, 2, 1, sombra).caixa(-2, 12, 3, 5, 1, 1, sombra);
  m.caixa(-3, 12, -4, 7, 4, 1, sombra); // o capuz nas costas
  // braço direito (-x) erguido de lado, manga larga, mão aberta com uma pomba
  m.caixa(-7, 12, -1, 3, 4, 4, habito).caixa(-9, 13, -1, 2, 3, 4, sombra);
  m.caixa(-9, 16, 0, 2, 2, 3, habito);
  m.caixa(-9, 18, 0, 2, 1, 3, pele).ponto(-10, 18, 1, pele(-10, 18, 1));
  m.caixa(-9, 19, 0, 2, 1, 3, POMBA).caixa(-9, 20, 1, 1, 1, 2, POMBA).ponto(-9, 21, 2, POMBA);
  m.ponto(-9, 21, 3, BICO).ponto(-10, 21, 2, 0x1a1a1a);
  m.caixa(-11, 20, 0, 2, 1, 2, POMBA).ponto(-12, 21, 0, ASA).ponto(-12, 21, 1, ASA); // asa aberta
  m.ponto(-9, 19, -1, ASA); // cauda
  // braço esquerdo (+x) erguido, mão aberta, palma para a frente; outra pomba pousada na manga
  m.caixa(5, 12, -1, 3, 4, 4, habito).caixa(8, 13, -1, 2, 3, 4, sombra);
  m.caixa(8, 16, 0, 2, 2, 3, habito);
  m.caixa(8, 18, 1, 2, 3, 1, pele).ponto(8, 21, 1, pele(8, 21, 1)).ponto(9, 21, 1, pele(9, 21, 1)).ponto(10, 19, 1, pele(10, 19, 1));
  m.caixa(6, 16, 0, 1, 1, 3, POMBA).ponto(7, 16, 1, ASA).ponto(6, 17, 2, POMBA).ponto(6, 17, 3, BICO).ponto(5, 17, 2, 0x1a1a1a).ponto(6, 16, -1, ASA);
  // cabeça
  m.caixa(-2, 17, -2, 5, 6, 5, pele);
  // tonsura: coroa de cabelo castanho em volta, alto da cabeça raspado
  m.caixa(-3, 19, -2, 1, 4, 5, cabelo).caixa(3, 19, -2, 1, 4, 5, cabelo).caixa(-2, 19, -3, 5, 4, 1, cabelo);
  m.caixa(-2, 22, -2, 5, 1, 1, cabelo).caixa(-2, 22, 2, 5, 1, 1, cabelo).caixa(-2, 22, -1, 1, 1, 3, cabelo).caixa(2, 22, -1, 1, 1, 3, cabelo);
  m.caixa(-1, 23, -1, 3, 1, 3, (x, y, z) => variar(0xe6b48c, x, y, z, 0.02)); // o alto raspado
  // rosto sereno: olhos, sobrancelhas, nariz, faces rosadas
  m.ponto(-1, 20, 3, 0x2a1a10).ponto(1, 20, 3, 0x2a1a10);
  m.ponto(-1, 21, 3, 0x8a5a3a).ponto(1, 21, 3, 0x8a5a3a);
  m.ponto(0, 19, 3, 0xd09a72).ponto(0, 19, 4, 0xc8926a);
  m.ponto(-2, 19, 3, 0xe89a8a).ponto(2, 19, 3, 0xe89a8a);
  // barba castanha cheia, com bigode
  m.caixa(-2, 17, 3, 5, 2, 1, barba).ponto(0, 18, 3, 0xa86a52); // a boca no meio do bigode
  m.ponto(-1, 18, 3, barba(-1, 18, 3)).ponto(1, 18, 3, barba(1, 18, 3));
  m.caixa(-3, 16, 1, 1, 4, 3, barba).caixa(3, 16, 1, 1, 4, 3, barba);
  m.caixa(-2, 15, 2, 5, 2, 2, barba).caixa(-1, 14, 3, 3, 1, 1, barba);
  // halo claro atrás da cabeça
  for (let x = -6; x <= 6; x++)
    for (let y = -6; y <= 6; y++) {
      const r = Math.hypot(x, y);
      if (r > 4.4 && r < 5.5) m.ponto(x, 20 + y, -4, (x + y) % 2 ? 0xf6e08a : 0xfaf0c0);
    }
  return m.malha(S, [0.5, 0, 0.5]);
}

/** São Francisco de Assis, guia da Cidade Dourada (dom da Piedade). */
export const FRANCISCO: DefNpc = {
  id: 'francisco',
  falante: 'francisco',
  no: 'francisco',
  rotulo: 'F: falar com São Francisco',
  visual: (): Humano => {
    // modelo inteiro (a barba liga cabeça e peito): a cabeça não gira sozinha, o corpo vira
    const corpo = modeloFrancisco();
    const raiz = new THREE.Group();
    const cabeca = new THREE.Group();
    raiz.add(corpo, cabeca);
    return { raiz, corpo, cabeca, alturaOlhos: 20 * S };
  },
};
