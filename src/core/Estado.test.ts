import { describe, expect, it, vi } from 'vitest';
import { CHEFOES, Estado, type DadosSalvos } from './Estado';
import { ORIGENS, ORIGENS_V1, pontoDaV1 } from '../mundo/aberto/Geografia';

const identidade = { nome: 'Teste', genero: 'm', idade: 'jovem', pele: 0, corCabelo: 0, corRoupa: 0, cabelo: 'curto', roupa: 'tunica', chapeu: false };

const gravar = (slot: number, d: Partial<DadosSalvos>) =>
  localStorage.setItem(`peregrino3d.slot.${slot}`, JSON.stringify({ cor: 0, gracas: 0, sombrasVencidas: [], flags: [], identidade, ...d }));

describe('Estado: espaços de jogo', () => {
  it('espaço vazio é jogo novo', () => {
    const e = new Estado();
    expect(e.carregarSlot(1)).toBe(false);
    expect(e.slot).toBe(1);
    expect(e.checkpointArea).toBe('vale');
  });

  it('salvar e carregar devolve o mesmo estado', () => {
    const e = new Estado();
    e.carregarSlot(2);
    e.identidade = identidade as never;
    e.checkpoint = [10, 3, -4];
    e.checkpointArea = 'deserto';
    e.gracas = 7;
    e.flags.add('veu_oeste');
    e.sombrasVencidas.add('vale_sombra_1');
    e.visitadas.add('deserto');
    e.pontos.add('deserto_capela');
    e.barco = [1, 2, 0.5];
    e.salvar();

    const f = new Estado();
    expect(f.carregarSlot(2)).toBe(true);
    expect(f.checkpoint).toEqual([10, 3, -4]);
    expect(f.checkpointArea).toBe('deserto');
    expect(f.gracas).toBe(7);
    expect(f.flags.has('veu_oeste')).toBe(true);
    expect(f.visitadas.has('deserto')).toBe(true);
    expect(f.pontos.has('deserto_capela')).toBe(true);
    expect(f.barco).toEqual([1, 2, 0.5]);
    expect(JSON.parse(localStorage.getItem('peregrino3d.slot.2')!).versao).toBe(2);
  });

  it('a trava do modo dev não deixa salvar', () => {
    const e = new Estado();
    e.carregarSlot(1);
    e.identidade = identidade as never;
    e.semSalvar = true;
    e.salvar();
    expect(localStorage.getItem('peregrino3d.slot.1')).toBeNull();
  });

  it('o save de antes dos espaços vira o espaço 1', async () => {
    localStorage.setItem('peregrino3d.save.v1', JSON.stringify({ cor: 0, gracas: 3, sombrasVencidas: [], flags: [], identidade, checkpoint: [0, 0, 0] }));
    vi.resetModules();
    const { Estado: EstadoNovo } = await import('./Estado');
    expect(localStorage.getItem('peregrino3d.save.v1')).toBeNull();
    const e = new EstadoNovo();
    expect(e.carregarSlot(1)).toBe(true);
    expect(e.gracas).toBe(3);
  });
});

describe('Estado: migração da versão 1 (antes do mapa único)', () => {
  it('traz o checkpoint para o lugar novo da área e guarda uma cópia', () => {
    const antigo: [number, number, number] = [ORIGENS_V1.malta[0] + 12, ORIGENS_V1.malta[2] + 1, ORIGENS_V1.malta[1] - 5];
    gravar(1, { checkpoint: antigo, checkpointArea: 'malta' });
    const e = new Estado();
    e.carregarSlot(1);
    expect(e.checkpoint).toEqual(pontoDaV1('malta', antigo));
    expect(e.checkpoint[0]).toBeCloseTo(ORIGENS.malta.x + 12);
    expect(e.checkpoint[2]).toBeCloseTo(ORIGENS.malta.z - 5);
    expect(localStorage.getItem('peregrino3d.slot.1.v1')).not.toBeNull();
  });

  it('save da versão 2 não é deslocado', () => {
    gravar(1, { versao: 2, checkpoint: [5, 6, 7], checkpointArea: 'malta' });
    const e = new Estado();
    e.carregarSlot(1);
    expect(e.checkpoint).toEqual([5, 6, 7]);
    expect(localStorage.getItem('peregrino3d.slot.1.v1')).toBeNull();
  });

  it('deduz as regiões visitadas e os pontos principais pelas flags', () => {
    gravar(1, { versao: 2, checkpoint: [0, 0, 0], checkpointArea: 'cidade', flags: ['deserto_entrou', 'cidade_entrou'] });
    const e = new Estado();
    e.carregarSlot(1);
    expect([...e.visitadas].sort()).toEqual(['cidade', 'deserto', 'vale']);
    expect(e.pontos.has('vale_cruzeiro')).toBe(true);
    expect(e.pontos.has('deserto_capela')).toBe(true);
    expect(e.pontos.has('cidade_capela')).toBe(true);
    expect(e.pontos.has('malta_praia')).toBe(false);
  });

  it('chefão vencido antes da graça grande recebe a diferença uma vez só', () => {
    gravar(1, { versao: 2, checkpoint: [0, 0, 0], gracas: 4, sombrasVencidas: [CHEFOES[0]] });
    const e = new Estado();
    e.carregarSlot(1);
    expect(e.gracas).toBe(6);
    e.salvar();
    const f = new Estado();
    f.carregarSlot(1);
    expect(f.gracas).toBe(6);
  });

  it('um chefão a mais é um coração a mais', () => {
    gravar(1, { versao: 2, checkpoint: [0, 0, 0], sombrasVencidas: [...CHEFOES.slice(0, 2)] });
    const e = new Estado();
    e.carregarSlot(1);
    expect(e.coracoesMax).toBe(7);
    expect(e.coracoes).toBe(7);
  });
});

describe('Estado: dons', () => {
  it('temor vem de graça; os outros só com a flag do santo', () => {
    const e = new Estado();
    expect(e.nivel('temor')).toBe(1);
    expect(e.nivel('ciencia')).toBe(0);
    e.flags.add('dom_ciencia');
    expect(e.nivel('ciencia')).toBe(1);
  });

  it('fortalecer gasta graças pela curva', () => {
    const e = new Estado();
    e.gracas = 10;
    expect(e.fortalecer('temor')).toBe(true); // nível 2 custa CUSTO_NIVEL[2] = 4
    expect(e.fortalecer('temor')).toBe(true); // nível 3 custa CUSTO_NIVEL[3] = 6
    expect(e.nivel('temor')).toBe(3);
    expect(e.gracasLivres).toBe(0);
    expect(e.fortalecer('temor')).toBe(false);
  });

  it('a energia máxima sobe com o temor no nível 5', () => {
    const e = new Estado();
    expect(e.energiaMax).toBe(100);
    e.dons.temor = 5;
    expect(e.energiaMax).toBe(130);
  });
});
