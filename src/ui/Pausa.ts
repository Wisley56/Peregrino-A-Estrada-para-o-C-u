import { rubiSVG } from './Vitral';

export interface AcoesPausa {
  continuar(): void;
  sair(): void;
  dons(): void;
  /** Abre o mapa do mundo (o caminho do controle até ele). */
  mapa(): void;
  /** Abre as Configurações (sensibilidade, controles, gráficos). */
  config(): void;
}

/**
 * Menu de pausa (Esc ou P durante o jogo), no mesmo pergaminho com moldura de vitral da tela inicial.
 * Quem abre e fecha pelo teclado é o jogo; aqui ficam só os botões.
 */
export class Pausa {
  private raiz: HTMLElement;
  private info: HTMLElement;
  private confirmar: HTMLElement;
  aberta = false;

  constructor(private acoes: AcoesPausa) {
    this.raiz = document.createElement('section');
    this.raiz.id = 'pausa';
    this.raiz.innerHTML = `
      <div class="janela"><div class="rubi">${rubiSVG(16)}</div><div class="rolo">
        <h2>Pausa</h2>
        <p class="nota"></p>
        <nav>
          <button class="vb rubi" data-a="continuar">Continuar</button>
          <button class="vb" data-a="mapa">Mapa do mundo</button>
          <button class="vb" data-a="dons">Os Sete Dons</button>
          <button class="vb" data-a="config">Configurações</button>
          <button class="vb" data-a="sair">Voltar à tela inicial</button>
        </nav>
        <div class="confirmar" hidden>
          <p>O caminho fica salvo no último lugar de descanso. Voltar à tela inicial?</p>
          <nav class="lado"><button class="vb rubi" data-a="sim">Sim, voltar</button><button class="vb" data-a="nao">Ficar</button></nav>
        </div>
        <p class="rodape" data-controle="{B} ou {MENU} para continuar">Esc ou P para continuar</p>
      </div></div>`;
    document.body.appendChild(this.raiz);
    this.info = this.raiz.querySelector('.nota')!;
    this.confirmar = this.raiz.querySelector('.confirmar')!;
    this.raiz.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('button')?.dataset.a;
      if (a === 'continuar') this.acoes.continuar();
      else if (a === 'dons') this.acoes.dons();
      else if (a === 'mapa') this.acoes.mapa();
      else if (a === 'config') this.acoes.config();
      else if (a === 'sair') this.confirmar.hidden = false;
      else if (a === 'sim') this.acoes.sair();
      else if (a === 'nao') this.confirmar.hidden = true;
    });
  }

  abrir(info: string) {
    this.aberta = true;
    this.info.textContent = info;
    this.confirmar.hidden = true;
    this.raiz.classList.add('aberto');
    (this.raiz.querySelector('[data-a="continuar"]') as HTMLButtonElement).focus();
  }

  /** Devolve o foco ao menu (ao voltar das Configurações). */
  focar() {
    this.raiz.querySelector<HTMLButtonElement>('[data-a="config"]')?.focus();
  }

  fechar() {
    this.aberta = false;
    this.raiz.classList.remove('aberto');
    (document.activeElement as HTMLElement | null)?.blur();
  }
}
