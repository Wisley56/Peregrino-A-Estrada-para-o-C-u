import { describe, expect, it } from 'vitest';
import { danoDeQueda } from './Peregrino';
import { AJUSTES } from '../config/ajustes';

const { segura: QUEDA_SEGURA, porMeio: QUEDA_POR_MEIO, fatal: QUEDA_FATAL } = AJUSTES.queda;

describe('danoDeQueda', () => {
  it('não fere até a queda segura', () => {
    expect(danoDeQueda(0, 5)).toBe(0);
    expect(danoDeQueda(QUEDA_SEGURA, 5)).toBe(0);
  });

  it('meio coração a cada trecho acima da segura, arredondando para cima', () => {
    expect(danoDeQueda(QUEDA_SEGURA + 0.1, 5)).toBe(0.5);
    expect(danoDeQueda(QUEDA_SEGURA + QUEDA_POR_MEIO, 5)).toBe(0.5);
    expect(danoDeQueda(QUEDA_SEGURA + QUEDA_POR_MEIO + 0.1, 5)).toBe(1);
    expect(danoDeQueda(20, 5)).toBe(3);
  });

  it('a partir da fatal tira todos os corações', () => {
    expect(danoDeQueda(QUEDA_FATAL, 7)).toBe(7);
    expect(danoDeQueda(100, 5)).toBe(5);
  });
});
