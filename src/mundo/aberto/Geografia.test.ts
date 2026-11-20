import { describe, expect, it } from 'vitest';
import { BEIRAS, ESTRADAS, ORIGENS, ORIGENS_V1, PONTOS_DE_VIAGEM, lugarDaBeira, pontoDaV1, pontoNaEstrada } from './Geografia';
import { TerrenoMundo, type Carimbo } from './TerrenoMundo';

describe('Geografia', () => {
  it('pontoNaEstrada vai da primeira à última ponta', () => {
    ESTRADAS.forEach((e, i) => {
      const a = pontoNaEstrada(i, 0), b = pontoNaEstrada(i, 1);
      expect([a.x, a.z]).toEqual([e[0][0], e[0][1]]);
      expect(b.x).toBeCloseTo(e[e.length - 1][0]);
      expect(b.z).toBeCloseTo(e[e.length - 1][1]);
      expect(Math.hypot(a.dx, a.dz)).toBeCloseTo(1);
    });
  });

  it('cada beira fica a 4,5 m do traçado e virada para ele', () => {
    for (const b of BEIRAS) {
      const p = pontoNaEstrada(b.estrada, b.t), l = lugarDaBeira(b);
      expect(Math.hypot(l.x - p.x, l.z - p.z)).toBeCloseTo(4.5);
      // o rumo aponta da beira para a estrada
      const fx = Math.sin(l.rumo), fz = Math.cos(l.rumo);
      expect(fx * (p.x - l.x) + fz * (p.z - l.z)).toBeGreaterThan(4.4);
    }
  });

  it('cada beira é um ponto de viagem, e os ids dos pontos são únicos', () => {
    const ids = PONTOS_DE_VIAGEM.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BEIRAS) expect(ids).toContain(b.id);
  });

  it('pontoDaV1 desloca pela diferença de origem e ignora áreas sem origem', () => {
    const p = pontoDaV1('deserto', [ORIGENS_V1.deserto[0] + 3, 1, ORIGENS_V1.deserto[1] - 2]);
    expect(p).toEqual([ORIGENS.deserto.x + 3, 1, ORIGENS.deserto.z - 2]);
    expect(pontoDaV1('vale', [1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('TerrenoMundo', () => {
  // uma região de mentira: um platô plano de 20 m de altura entre 0 e 100
  const plato: Carimbo = { id: 'vale', x0: 0, z0: 0, x1: 100, z1: 100, faixa: 90, altura: () => 20, cor: () => 0x00ff00 };
  const t = new TerrenoMundo([plato]);

  it('regiaoEm acha a região só dentro do retângulo', () => {
    expect(t.regiaoEm(50, 50)?.id).toBe('vale');
    expect(t.regiaoEm(100, 50)).toBeNull();
    expect(t.regiaoEm(-1, 50)).toBeNull();
  });

  it('dentro da região vale o chão dela', () => {
    expect(t.altura(50, 50)).toBe(20);
    expect(t.cor(50, 50)).toBe(0x00ff00);
  });

  it('o chão é contínuo ao sair da região: sem degrau maior que uma encosta', () => {
    for (const z of [10, 50, 90])
      for (let x = 98; x < 200; x++) {
        const d = Math.abs(t.altura(x + 1, z) - t.altura(x, z));
        expect(d, `degrau em x=${x}, z=${z}`).toBeLessThanOrEqual(3);
      }
  });

  it('é determinístico (a mesma semente dá o mesmo chão)', () => {
    const u = new TerrenoMundo([plato]);
    for (const [x, z] of [[-300, 40], [500, 900], [-1200, 10]]) expect(u.altura(x, z)).toBe(t.altura(x, z));
  });
});
