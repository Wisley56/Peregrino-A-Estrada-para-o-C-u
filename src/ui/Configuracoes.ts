import { rubiSVG } from './Vitral';
import {
  ConfigGraficos, type EstiloMira, Preferencias, PREDEFINICOES, Predefinicao, predefinicaoDe,
  SENSIBILIDADE_MAX, SENSIBILIDADE_MIN, SENSIBILIDADE_PADRAO,
} from '../core/Preferencias';

export interface AcoesConfig {
  /** Os ajustes gráficos mudaram: o jogo remonta o render. */
  graficos(): void;
  /** Quadros por segundo agora (para o jogador ver o custo de cada ajuste). */
  qps(): number;
  /** A janela fechou. */
  fechou?(): void;
}

type Aba = 'geral' | 'controles' | 'graficos';

/** Uma linha de escolhas da aba Gráficos. */
interface Opcao<K extends keyof ConfigGraficos> {
  chave: K;
  rotulo: string;
  ajuda: string;
  valores: [ConfigGraficos[K], string][];
}

const OPCOES: Opcao<keyof ConfigGraficos>[] = [
  { chave: 'resolucao', rotulo: 'Resolução', ajuda: 'Mais pixels deixam tudo mais nítido, mas pesam mais.',
    valores: [[0.75, '75%'], [1, '100%'], [1.5, '150%'], [2, '200%']] },
  { chave: 'sombras', rotulo: 'Sombras', ajuda: 'Detalhadas usam um mapa de sombra 4 vezes maior.',
    valores: [['desligadas', 'Sem'], ['simples', 'Simples'], ['suaves', 'Suaves'], ['detalhadas', 'Detalhadas']] },
  { chave: 'serrilhado', rotulo: 'Antisserrilhado', ajuda: 'Suaviza as bordas dos blocos. MSAA é o mais limpo; FXAA, o mais leve.',
    valores: [['desligado', 'Sem'], ['fxaa', 'FXAA'], ['smaa', 'SMAA'], ['msaa', 'MSAA 4×']] },
  { chave: 'oclusao', rotulo: 'Oclusão de ambiente', ajuda: 'Cantos, frestas e o pé das paredes escurecem como na luz real. Pesada: para placas de vídeo dedicadas.',
    valores: [[false, 'Desligada'], [true, 'Ligada']] },
  { chave: 'brilho', rotulo: 'Brilho das luzes', ajuda: 'Chamas, graças, a lamparina e os halos irradiam luz (bloom).',
    valores: [[false, 'Desligado'], [true, 'Ligado']] },
  { chave: 'cinema', rotulo: 'Cor de cinema', ajuda: 'Sombras frias, luzes quentes, contraste suave e um grão de filme leve.',
    valores: [[false, 'Desligada'], [true, 'Ligada']] },
] as Opcao<keyof ConfigGraficos>[];

const NOMES_MIRA: [EstiloMira, string][] = [['cruz', 'Cruz'], ['anel', 'Anel'], ['ponto', 'Ponto'], ['desligada', 'Sem']];

const NOMES_PRE: [Exclude<Predefinicao, 'personalizada'>, string][] = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['ultra', 'Ultra']];

/**
 * Configurações (tela inicial e pausa), no pergaminho com moldura de vitral:
 * Geral (sensibilidade do mouse), Controles e Gráficos (predefinições e cada efeito).
 * Tudo vale na hora e fica salvo para todos os jogos.
 */
export class Configuracoes {
  private raiz: HTMLElement;
  private aba: Aba = 'geral';
  private medidor = 0;
  aberta = false;

  constructor(private prefs: Preferencias, private acoes: AcoesConfig) {
    this.raiz = document.createElement('section');
    this.raiz.id = 'config';
    this.raiz.innerHTML = `
      <div class="janela"><div class="rubi">${rubiSVG(16)}</div><div class="rolo">
        <h2>Configurações</h2>
        <nav class="abas">
          <button type="button" class="vb" data-aba="geral">Geral</button>
          <button type="button" class="vb" data-aba="controles">Controles</button>
          <button type="button" class="vb" data-aba="graficos">Gráficos</button>
        </nav>
        <div class="pagina" data-pag="geral">
          <label class="ajuste">
            <span>Sensibilidade do mouse <b class="valor"></b></span>
            <input type="range" min="${SENSIBILIDADE_MIN}" max="${SENSIBILIDADE_MAX}" step="0.05" />
            <button class="padrao" type="button" data-a="padrao">padrão</button>
          </label>
          <p class="ajuda">Gira a câmera ao mover o mouse e ao encostar o cursor na borda da tela.</p>
          <div class="opcoes mira"><div class="linha"><div><b>Mira</b><small>A luz do cajado vai para onde a mira aponta. A cruz troca de cor com o fundo para nunca sumir.</small></div><div class="seg" data-mira></div></div></div>
        </div>
        <div class="pagina" data-pag="controles">
          <p class="ajuda">O mouse gira a câmera (clique na tela para prendê-lo). Esc ou P pausa.</p>
        </div>
        <div class="pagina" data-pag="graficos">
          <div class="pre"><span>Predefinição</span><div class="seg" data-pre></div></div>
          <div class="opcoes"></div>
          <p class="qps"></p>
        </div>
        <button type="button" class="vb rubi voltar" data-a="voltar">Voltar · Esc</button>
      </div></div>`;
    document.body.appendChild(this.raiz);

    // a lista de teclas sai do antigo painel de controles da tela inicial e passa a morar aqui
    const antigo = document.getElementById('painel-controles');
    const teclas = antigo?.querySelector('.teclas');
    if (teclas) this.raiz.querySelector('[data-pag="controles"]')!.appendChild(teclas);
    antigo?.remove();

    // sensibilidade
    const faixa = this.raiz.querySelector<HTMLInputElement>('.ajuste input')!;
    const valor = this.raiz.querySelector<HTMLElement>('.ajuste .valor')!;
    const mostrarSens = () => {
      faixa.value = String(this.prefs.sensibilidade);
      valor.textContent = `${Math.round(this.prefs.sensibilidade * 100)}%`;
    };
    faixa.addEventListener('input', () => {
      this.prefs.sensibilidade = Number(faixa.value);
      valor.textContent = `${Math.round(this.prefs.sensibilidade * 100)}%`;
    });
    faixa.addEventListener('change', () => this.prefs.salvar());
    mostrarSens();
    const mostrarMira = () => {
      this.raiz.querySelector('[data-mira]')!.innerHTML = NOMES_MIRA.map(
        ([id, nome]) => `<button type="button" data-estilo="${id}" class="${this.prefs.mira === id ? 'on' : ''}">${nome}</button>`,
      ).join('');
    };
    mostrarMira();

    this.raiz.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!b) return;
      if (b.dataset.aba) return this.mostrarAba(b.dataset.aba as Aba);
      if (b.dataset.estilo) {
        this.prefs.mira = b.dataset.estilo as EstiloMira;
        this.prefs.salvar();
        return mostrarMira();
      }
      if (b.dataset.a === 'voltar') return this.fechar();
      if (b.dataset.a === 'padrao') {
        this.prefs.sensibilidade = SENSIBILIDADE_PADRAO;
        this.prefs.salvar();
        return mostrarSens();
      }
      if (b.dataset.pre) {
        const p = b.dataset.pre as Exclude<Predefinicao, 'personalizada'>;
        return this.mudarGraficos({ predefinicao: p, ...PREDEFINICOES[p] });
      }
      if (b.dataset.chave) {
        const op = OPCOES.find((o) => o.chave === b.dataset.chave)!;
        const v = op.valores[Number(b.dataset.i)][0];
        const novo = { ...this.prefs.graficos, [op.chave]: v } as ConfigGraficos;
        novo.predefinicao = predefinicaoDe(novo);
        this.mudarGraficos(novo);
      }
    });

    // com a janela aberta, as teclas são dela (Esc fecha; nada vaza para o jogo nem para a tela inicial)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.aberta) return;
        e.stopImmediatePropagation();
        if (e.code === 'Escape') {
          e.preventDefault();
          this.fechar();
        }
      },
      { capture: true },
    );
  }

  abrir(aba: Aba = 'geral') {
    this.aberta = true;
    this.raiz.classList.add('aberto');
    this.mostrarAba(aba);
    this.medidor = window.setInterval(() => this.mostrarQps(), 500);
  }

  fechar() {
    if (!this.aberta) return;
    this.aberta = false;
    this.raiz.classList.remove('aberto');
    clearInterval(this.medidor);
    (document.activeElement as HTMLElement | null)?.blur();
    this.acoes.fechou?.();
  }

  private mostrarAba(aba: Aba) {
    this.aba = aba;
    this.raiz.querySelectorAll<HTMLElement>('[data-aba]').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
    this.raiz.querySelectorAll<HTMLElement>('[data-pag]').forEach((p) => (p.hidden = p.dataset.pag !== aba));
    if (aba === 'graficos') this.desenharGraficos();
    this.raiz.querySelector<HTMLElement>(`[data-aba="${aba}"]`)?.focus();
  }

  private mudarGraficos(c: ConfigGraficos) {
    this.prefs.graficos = c;
    this.prefs.salvar();
    this.acoes.graficos();
    this.desenharGraficos();
  }

  private desenharGraficos() {
    const g = this.prefs.graficos;
    this.raiz.querySelector('[data-pre]')!.innerHTML =
      NOMES_PRE.map(([id, nome]) => `<button type="button" data-pre="${id}" class="${g.predefinicao === id ? 'on' : ''}">${nome}</button>`).join('') +
      (g.predefinicao === 'personalizada' ? '<em>personalizada</em>' : '');
    this.raiz.querySelector('.opcoes')!.innerHTML = OPCOES.map((o) => {
      const botoes = o.valores
        .map(([v, nome], i) => `<button type="button" data-chave="${o.chave}" data-i="${i}" class="${g[o.chave] === v ? 'on' : ''}">${nome}</button>`)
        .join('');
      return `<div class="linha"><div><b>${o.rotulo}</b><small>${o.ajuda}</small></div><div class="seg">${botoes}</div></div>`;
    }).join('');
    this.mostrarQps();
  }

  private mostrarQps() {
    if (this.aba !== 'graficos') return;
    const q = Math.round(this.acoes.qps());
    this.raiz.querySelector('.qps')!.textContent = q ? `Agora: ${q} quadros por segundo${q < 40 ? ' · tente uma predefinição mais leve' : ''}` : '';
  }
}
