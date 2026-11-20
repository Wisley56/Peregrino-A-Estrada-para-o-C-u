import { describe, expect, it } from 'vitest';
import { Agenda } from './Agenda';

describe('Agenda', () => {
  it('roda cada tarefa quando o tempo de jogo chega, na ordem', () => {
    const a = new Agenda(), feito: string[] = [];
    a.depois(0.5, () => feito.push('b'));
    a.depois(0.2, () => feito.push('a'));
    a.depois(0.5, () => feito.push('c'));
    a.atualizar(0.1);
    expect(feito).toEqual([]);
    a.atualizar(0.5);
    expect(feito).toEqual(['a', 'b', 'c']);
    expect(a.pendentes).toBe(0);
  });

  it('parada (sem atualizar, como na pausa) não roda nada', () => {
    const a = new Agenda();
    let feito = false;
    a.depois(0.1, () => (feito = true));
    expect(feito).toBe(false);
    a.atualizar(0);
    expect(feito).toBe(false);
  });

  it('uma tarefa pode agendar outra, que roda quando vencer', () => {
    const a = new Agenda(), feito: string[] = [];
    a.depois(0.1, () => {
      feito.push('1');
      a.depois(0, () => feito.push('2'));
      a.depois(1, () => feito.push('3'));
    });
    a.atualizar(0.2);
    expect(feito).toEqual(['1', '2']);
    a.atualizar(1);
    expect(feito).toEqual(['1', '2', '3']);
  });

  it('limpar cancela o que estava agendado', () => {
    const a = new Agenda();
    let feito = false;
    a.depois(0.1, () => (feito = true));
    a.limpar();
    a.atualizar(1);
    expect(feito).toBe(false);
  });
});
