import { defineConfig } from '@playwright/test';

/**
 * Teste de fumaça (`npm run test:fumaca`): abre o jogo no servidor de desenvolvimento, numa sessão de teste
 * (`?teste=<área>`, nada é salvo), em cada região, e falha com erro no console, perda do WebGL ou jogo parado.
 * Não testa jogabilidade: pega quebras grosseiras nas refatorações.
 *
 * Na máquina usa o Edge instalado; na CI, o Chromium que o Playwright baixa.
 */
const PORTA = 5190;

export default defineConfig({
  testDir: 'testes/fumaca',
  timeout: 120_000,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    channel: process.env.CI ? undefined : 'msedge',
    headless: true,
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] },
  },
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
