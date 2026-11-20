import { expect, test } from '@playwright/test';

/** As regiões e cenas que a sessão de teste sabe abrir (`?teste=<id>`). */
const AREAS = ['vale', 'cripta', 'deserto', 'meiodia', 'cidade', 'palacio', 'bahiabaixa', 'bahiaalta', 'creta', 'navio', 'naufragio', 'malta'];

/** Erros do console que não são do jogo (o navegador sem GPU reclamando de desempenho, por exemplo). */
const IGNORAR = [/GPU stall due to ReadPixels/i, /swiftshader/i, /Automatic fallback to software WebGL/i];

for (const area of AREAS)
  test(`a região ${area} abre e roda`, async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`exceção: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !IGNORAR.some((r) => r.test(m.text()))) erros.push(`console: ${m.text()}`);
    });

    await page.goto(`/?teste=${area}`);
    await page.evaluate(() => {
      const w = window as unknown as { perdeuWebgl?: boolean };
      document.querySelector('canvas')?.addEventListener('webglcontextlost', () => (w.perdeuWebgl = true));
    });

    // o jogo começa e chega à região pedida
    await page.waitForFunction(
      (id) => {
        const j = (window as unknown as { jogo?: { estado?: { tempo: number }; area?: { id: string } } }).jogo;
        return !!j?.estado && j.estado.tempo > 0.5 && j.area?.id === id;
      },
      area,
      { timeout: 90_000 },
    );

    // e continua rodando: o tempo de jogo anda
    const tempo = () => page.evaluate(() => (window as unknown as { jogo: { estado: { tempo: number } } }).jogo.estado.tempo);
    const antes = await tempo();
    await page.waitForTimeout(3000);
    expect(await tempo(), 'o tempo de jogo parou').toBeGreaterThan(antes);

    expect(await page.evaluate(() => !!(window as unknown as { perdeuWebgl?: boolean }).perdeuWebgl), 'o contexto WebGL foi perdido').toBe(false);
    expect(erros, erros.join('\n')).toEqual([]);
  });
