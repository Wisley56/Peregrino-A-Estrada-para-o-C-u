/**
 * Confere que o modo desenvolvedor (src/dev) não foi parar no build de produção.
 * Roda no fim do `npm run build`; falha (código 1) se achar alguma marca do painel em dist/.
 *
 * Uso: node tools/verificar-build.mjs [pasta]   (padrão: dist)
 */
import fs from 'node:fs';
import path from 'node:path';

const pasta = process.argv[2] ?? 'dist';
/** Textos que só existem no painel de desenvolvedor. */
const MARCAS = ['dev-painel', 'dev-overlay', 'instalarDev', 'peregrino.dev', 'Lutar agora', 'Sessão de teste'];

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return arquivos(p);
    return /\.(js|css|html)$/.test(e.name) ? [p] : [];
  });
}

if (!fs.existsSync(pasta)) {
  console.error(`verificar-build: a pasta ${pasta} não existe (rode o vite build antes).`);
  process.exit(1);
}
const achados = [];
for (const arq of arquivos(pasta)) {
  const texto = fs.readFileSync(arq, 'utf8');
  for (const m of MARCAS) if (texto.includes(m)) achados.push(`${path.relative(pasta, arq)}: "${m}"`);
}
if (achados.length) {
  console.error('✗ O modo desenvolvedor vazou para o build de produção:\n  ' + achados.join('\n  '));
  console.error('  Confira se src/dev só é importado dentro de `if (import.meta.env.DEV)`.');
  process.exit(1);
}
console.log('✓ build sem o modo desenvolvedor');
