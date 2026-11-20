/**
 * `localStorage` em memória para os testes (o Node não tem um). Cada teste começa com ele vazio.
 */
import { beforeEach } from 'vitest';

class Memoria implements Storage {
  private dados = new Map<string, string>();
  get length() {
    return this.dados.size;
  }
  clear() {
    this.dados.clear();
  }
  getItem(chave: string) {
    return this.dados.has(chave) ? this.dados.get(chave)! : null;
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null;
  }
  removeItem(chave: string) {
    this.dados.delete(chave);
  }
  setItem(chave: string, valor: string) {
    this.dados.set(chave, String(valor));
  }
}

const memoria = new Memoria();
Object.defineProperty(globalThis, 'localStorage', { value: memoria, configurable: true });

beforeEach(() => memoria.clear());
