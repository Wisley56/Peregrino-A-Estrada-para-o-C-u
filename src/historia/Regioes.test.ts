import { describe, expect, it } from 'vitest';
import { AREAS } from '../mundo/Area';
import { REGIOES, cumpre, type ConsultaRequisito } from './Regioes';

const roteiros = Object.values(import.meta.glob<string>('../dialogos/*.ink', { query: '?raw', import: 'default', eager: true })).join('\n');
const nos = new Set([...roteiros.matchAll(/^\s*===\s*(\w+)\s*===/gm)].map((m) => m[1]));

describe('fichas das regiões', () => {
  it('toda área tem ficha', () => {
    for (const id of AREAS) expect(REGIOES[id], id).toBeDefined();
  });

  it('a fala de chegada existe no Ink e vem com a flag de entrada', () => {
    for (const [id, r] of Object.entries(REGIOES)) {
      if (!r.chegada) continue;
      expect(nos.has(r.chegada), `${id}: nó ${r.chegada}`).toBe(true);
      expect(r.entrou, `${id}: chegada sem flag de entrada`).toBeDefined();
    }
  });

  it('os requisitos acordam na hora certa', () => {
    const consulta = (flags: string[], vencidas: string[] = [], veuAberto = false): ConsultaRequisito => ({
      tem: (f) => flags.includes(f),
      venceu: (s) => vencidas.includes(s),
      veuAberto,
    });
    const deserto = REGIOES.deserto.acorda!;
    expect(cumpre(deserto, consulta([]))).toBe(false);
    expect(cumpre(deserto, consulta([], [], true))).toBe(true);
    expect(cumpre(deserto, consulta(['deserto_entrou']))).toBe(true);
    expect(cumpre(REGIOES.bahiabaixa.acorda!, consulta([], ['palacio_gula']))).toBe(true);
    expect(cumpre(REGIOES.malta.acorda!, consulta(['naufragio_encalhou']))).toBe(false);
    expect(REGIOES.vale.acorda).toBeUndefined();
  });
});
