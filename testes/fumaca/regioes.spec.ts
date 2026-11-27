import { expect, test } from '@playwright/test';

/** As regiões e cenas que a sessão de teste sabe abrir (`?teste=<id>`). */
const AREAS = ['vale', 'cripta', 'deserto', 'meiodia', 'cidade', 'palacio', 'bahiabaixa', 'bahiaalta', 'creta', 'navio', 'naufragio', 'malta'];

/** Erros do console que não são do jogo (o navegador sem GPU reclamando de desempenho, por exemplo). */
const IGNORAR = [/GPU stall due to ReadPixels/i, /swiftshader/i, /Automatic fallback to software WebGL/i];

/** As etapas de progresso do modo dev (src/dev/Progresso.ts), do começo a Malta. */
const ETAPAS = ['comeco', 'vale', 'mamom', 'deserto', 'acidia', 'cidade', 'tudo', 'coracao', 'ira', 'malta'];

type Janela = {
  jogo: { estado: { tempo: number }; area: { id: string }; lugarDoPonto(id: string): unknown };
  dev: { etapa(id: string): void };
  perdeuWebgl?: boolean;
};

/** Junta os erros da página (exceções e console.error que não sejam do navegador). */
function vigiarErros(page: import('@playwright/test').Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`exceção: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORAR.some((r) => r.test(m.text()))) erros.push(`console: ${m.text()}`);
  });
  return erros;
}

/** O tempo de jogo continua andando por 3 s. */
async function continuaRodando(page: import('@playwright/test').Page) {
  const tempo = () => page.evaluate(() => (window as unknown as Janela).jogo.estado.tempo);
  const antes = await tempo();
  await page.waitForTimeout(3000);
  expect(await tempo(), 'o tempo de jogo parou').toBeGreaterThan(antes);
}

test('as etapas de progresso aplicam e o jogo segue rodando', async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto('/?teste=vale');
  await page.waitForFunction(() => ((window as unknown as Partial<Janela>).jogo?.estado?.tempo ?? 0) > 0.5, undefined, { timeout: 90_000 });
  // todo ponto de viagem tem lugar de chegada (o marco existe na área)
  const semLugar = await page.evaluate(async () => {
    const { PONTOS_DE_VIAGEM } = await import('/src/mundo/aberto/Geografia.ts');
    const j = (window as unknown as Janela).jogo;
    return PONTOS_DE_VIAGEM.filter((p: { id: string }) => !j.lugarDoPonto(p.id)).map((p: { id: string }) => p.id);
  });
  expect(semLugar, 'pontos de viagem sem lugar').toEqual([]);
  for (const etapa of ETAPAS) {
    await page.evaluate((id) => (window as unknown as Janela).dev.etapa(id), etapa);
    await continuaRodando(page);
    expect(erros, `etapa ${etapa}:\n${erros.join('\n')}`).toEqual([]);
  }
});

for (const area of AREAS)
  test(`a região ${area} abre e roda`, async ({ page }) => {
    const erros = vigiarErros(page);

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
    await continuaRodando(page);

    expect(await page.evaluate(() => !!(window as unknown as { perdeuWebgl?: boolean }).perdeuWebgl), 'o contexto WebGL foi perdido').toBe(false);
    expect(erros, erros.join('\n')).toEqual([]);
  });
