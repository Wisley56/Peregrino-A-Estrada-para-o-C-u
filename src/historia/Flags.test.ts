import { describe, expect, it } from 'vitest';
import { FLAGS_FIXAS, ehFlag } from './Flags';
import { foraDosRegistros } from './ConferirInk';
import { ehEventoInk } from './EventosInk';
import { ETAPAS } from '../dev/Progresso';

describe('registro de flags', () => {
  it('aceita as fixas e as famílias, e recusa erros de digitação', () => {
    expect(ehFlag('cripta_laje')).toBe(true);
    expect(ehFlag('dom_ciencia')).toBe(true);
    expect(ehFlag('navio_cabo_2')).toBe(true);
    expect(ehFlag('cripta_lage')).toBe(false);
    expect(ehFlag('navio_cabo_')).toBe(false);
    expect(ehFlag('')).toBe(false);
  });

  it('não repete uma flag fixa entre regiões', () => {
    const todas = Object.values(FLAGS_FIXAS).flat();
    expect(new Set(todas).size).toBe(todas.length);
  });

  it('as etapas do modo dev só usam flags registradas', () => {
    for (const e of ETAPAS) for (const f of e.flags) expect(ehFlag(f), `${e.id}: ${f}`).toBe(true);
  });

  it('os roteiros Ink só usam flags e eventos registrados', () => {
    const roteiros = import.meta.glob<string>('../dialogos/*.ink', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(roteiros).length).toBeGreaterThan(10);
    for (const [nome, texto] of Object.entries(roteiros)) expect(foraDosRegistros(texto), nome).toEqual([]);
  });

  it('o conferidor do Ink acha a flag ou o evento errado e a linha', () => {
    const ink = '// tem("comentario")\nOlá\n{tem("cripta_lage"): sim}\n~ marcar("cripta_laje")\n~ evento("vibora_lança")\n~ evento("viajar_bahia_cais")';
    expect(foraDosRegistros(ink)).toEqual([
      { tipo: 'flag', nome: 'cripta_lage', linha: 3 },
      { tipo: 'evento', nome: 'vibora_lança', linha: 5 },
    ]);
  });

  it('eventos: aceita fixos e famílias', () => {
    expect(ehEventoInk('absolvicao')).toBe(true);
    expect(ehEventoInk('retribuir_leproso')).toBe(true);
    expect(ehEventoInk('absolvição')).toBe(false);
  });
});
