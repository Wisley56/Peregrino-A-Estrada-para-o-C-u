import { defineConfig } from 'vitest/config';

/**
 * Testes unitários do código puro (sem WebGL): `npm test`. Ficam ao lado do código, em `*.test.ts`.
 * O `localStorage` é simulado em memória (`tools/testes/armazenamento.ts`): os testes nunca tocam um save de verdade.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tools/testes/armazenamento.ts'],
  },
});
