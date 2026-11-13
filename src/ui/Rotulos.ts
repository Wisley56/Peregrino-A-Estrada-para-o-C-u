/**
 * Nomes dos botões do controle e a troca das teclas citadas nas dicas da tela ("F: falar", "segure R"...) pelos
 * botões do controle em uso. Os textos do jogo e dos diálogos continuam escritos com as teclas; a troca é
 * feita na hora de mostrar, só quando o jogador está no controle.
 */
import type { Familia } from '../core/Controle';

export type NomeBotao =
  | 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'VOLTAR' | 'MENU' | 'L3' | 'R3'
  | 'CIMA' | 'BAIXO' | 'ESQ' | 'DIR' | 'ESQUERDO' | 'DIREITO';

const DIRECIONAL = { CIMA: '↑', BAIXO: '↓', ESQ: '←', DIR: '→', ESQUERDO: 'analógico esquerdo', DIREITO: 'analógico direito' };

const NOMES: Record<Familia, Record<NomeBotao, string>> = {
  xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', VOLTAR: 'View', MENU: 'Menu', L3: 'L3', R3: 'R3', ...DIRECIONAL },
  playstation: {
    A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', VOLTAR: 'Create', MENU: 'Options', L3: 'L3', R3: 'R3', ...DIRECIONAL,
  },
};

export function botao(b: NomeBotao, f: Familia) {
  return NOMES[f][b];
}

/** Troca `{A}`, `{MENU}`... de um modelo pelos nomes dos botões. */
export function preencher(modelo: string, f: Familia) {
  return modelo.replace(/\{(\w+)\}/g, (todo, k: string) => (k in NOMES[f] ? NOMES[f][k as NomeBotao] : todo));
}

/** As teclas que os textos citam, trocadas pelos botões do controle (o mapa é o de Entrada.MAPA_CONTROLE). */
export function rotularTeclas(t: string, f: Familia) {
  const n = NOMES[f];
  return t
    .replace(/^F: /, `${n.Y}: `)
    .replace(/\(F\)/g, `(${n.Y})`)
    .replace(/\(Espaço\)/g, `(${n.A})`)
    .replace(/\b([Aa]perte) F\b/g, `$1 ${n.Y}`)
    .replace(/\b([Aa]perte) L\b/g, `$1 ${n.ESQ} no direcional`)
    .replace(/\b([Aa]perte) E\b/g, `$1 ${n.DIR} no direcional (ou ${n.LT})`)
    .replace(/\b([Ss]egure) R\b/g, `$1 ${n.LB}`)
    .replace(/ · G$/, ` · ${n.VOLTAR}`)
    .replace(/ · L$/, ` · ${n.ESQ}`)
    .replace(/ · E$/, ` · ${n.DIR}`);
}

/**
 * Textos fixos das telas (rodapés, "Voltar · Esc"): quem tem `data-controle="Voltar · {B}"` mostra esse modelo
 * no controle e volta ao texto original no teclado. Barato: o jogo chama de novo de tempos em tempos nos menus,
 * para pegar telas montadas depois (a criação do peregrino).
 */
export function trocarRotulosDaTela(noControle: boolean, f: Familia) {
  document.querySelectorAll<HTMLElement>('[data-controle]').forEach((el) => {
    el.dataset.teclado ??= el.textContent ?? '';
    const texto = noControle ? preencher(el.dataset.controle!, f) : el.dataset.teclado;
    if (el.textContent !== texto) el.textContent = texto;
  });
}
