import { describe, expect, it } from 'vitest';
import { Eventos } from './Eventos';

describe('Eventos', () => {
  it('entrega os dados a quem ouve, na ordem em que passaram a ouvir', () => {
    const ev = new Eventos(), recebido: string[] = [];
    ev.ouvir('flagMarcada', ({ flag }) => recebido.push(`a:${flag}`));
    ev.ouvir('flagMarcada', ({ flag }) => recebido.push(`b:${flag}`));
    ev.emitir('flagMarcada', { flag: 'cripta_laje' });
    expect(recebido).toEqual(['a:cripta_laje', 'b:cripta_laje']);
  });

  it('para de entregar a quem deixou de ouvir, mesmo no meio de uma entrega', () => {
    const ev = new Eventos();
    let n = 0;
    const parar = ev.ouvir('morreu', () => {
      n++;
      parar();
    });
    ev.ouvir('morreu', () => n++);
    ev.emitir('morreu', {});
    ev.emitir('morreu', {});
    expect(n).toBe(3);
  });

  it('eventos diferentes não se misturam', () => {
    const ev = new Eventos();
    let vencidas = 0;
    ev.ouvir('sombraVencida', () => vencidas++);
    ev.emitir('voltouAoTitulo', {});
    expect(vencidas).toBe(0);
  });
});
