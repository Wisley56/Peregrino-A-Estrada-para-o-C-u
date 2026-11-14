import { B, Controle } from './Controle';

export type Dispositivo = 'teclado' | 'controle';

/**
 * Botões do controle → as mesmas teclas que o jogo já lê (o jogo não precisa saber de onde veio o comando).
 * `PadCima`/`PadBaixo` não são teclas: só as escolhas de diálogo os leem (as setas do teclado andam).
 * As dicas da tela seguem este mapa em ui/Rotulos.ts.
 */
const MAPA_CONTROLE: [number, string][] = [
  [B.A, 'Space'], // pular · avançar diálogo
  [B.B, 'KeyC'], // esquiva
  [B.X, 'KeyJ'], // golpe do cajado
  [B.Y, 'KeyF'], // interagir · avançar diálogo
  [B.LB, 'KeyR'], // rezar (segurado)
  [B.RB, 'KeyQ'], // travar a mira
  [B.R3, 'KeyQ'],
  [B.LT, 'KeyE'], // Ciência
  [B.RT, 'KeyK'], // lançar luz
  [B.VOLTAR, 'KeyG'], // os Sete Dons
  [B.MENU, 'Escape'], // pausa
  [B.ESQUERDA, 'KeyL'], // lamparina
  [B.DIREITA, 'KeyE'], // Ciência
  [B.CIMA, 'PadCima'],
  [B.BAIXO, 'PadBaixo'],
  [B.BAIXO, 'KeyZ'], // ajoelhar-se (segurado): a porta estreita
];

/** Giro da câmera com o analógico direito no máximo, em "pixels de mouse" por segundo (sensibilidade 1). */
const GIRO_X = 950;
const GIRO_Y = 560;

/**
 * Teclado, mouse e controle. `apertou()` vale só no quadro em que a tecla desceu. O controle entra pelas
 * mesmas teclas (MAPA_CONTROLE), mais o andar analógico em `eixo()` e o giro da câmera em `camX`/`camY`.
 */
export class Entrada {
  private seguradas = new Set<string>();
  private novas = new Set<string>();
  /** Teclas seguradas pelo controle neste quadro (à parte, para o keyup do teclado não soltá-las). */
  private virtuais = new Set<string>();
  readonly controle = new Controle();
  /** Último aparelho usado: troca as dicas da tela e esconde o cursor no controle. */
  dispositivo: Dispositivo = 'teclado';
  aoTrocarDispositivo: (() => void) | null = null;
  /** Analógico direito com curva, -1..1 (y para cima). Já multiplicado pelo giro máximo e por dt em `giroControle`. */
  camX = 0;
  camY = 0;
  /** L3: corre até o analógico voltar ao centro (como nos jogos de ação em terceira pessoa). */
  private correndo = false;
  /** Analógico esquerdo usado como seta nas escolhas de diálogo (com histerese). */
  private toque = 0;
  private andarControle: [number, number] = [0, 0];
  mouseDx = 0;
  mouseDy = 0;
  travado = false;
  /** Na criação do personagem o clique só arrasta, sem prender o ponteiro. */
  permitirTrava = true;
  private arrastando = false;
  /**
   * Durante o jogo, a câmera segue o mouse sem precisar segurar botão nenhum (mesmo onde o navegador
   * recusa prender o ponteiro). Perto da borda esquerda/direita da tela, ela continua girando.
   */
  seguirMouse = false;
  /** O ponteiro saiu de preso para solto (o jogador apertou Esc): o jogo abre a pausa. */
  soltouPonteiro = false;
  private mouseX = -1;
  private dentro = false;

  constructor(private alvo: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (digitando(e.target)) return; // escrevendo num campo (ex.: o painel de desenvolvedor): não é comando do jogo
      if (e.isTrusted) this.usar('teclado');
      if (e.code === 'Tab') e.preventDefault();
      if (!e.repeat) this.novas.add(e.code);
      this.seguradas.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.seguradas.delete(e.code));
    window.addEventListener('blur', () => this.seguradas.clear());

    alvo.addEventListener('contextmenu', (e) => e.preventDefault());
    alvo.addEventListener('mousedown', (e) => {
      const nome = ['Mouse0', 'Mouse1', 'Mouse2'][e.button];
      this.usar('teclado');
      if (nome) {
        this.novas.add(nome);
        this.seguradas.add(nome);
      }
      if (e.button === 1) e.preventDefault();
      if (!this.travado) {
        this.arrastando = true;
        if (this.permitirTrava) travarPonteiro(alvo);
      }
    });
    window.addEventListener('mouseup', (e) => {
      this.seguradas.delete(['Mouse0', 'Mouse1', 'Mouse2'][e.button]);
      this.arrastando = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) this.usar('teclado');
      this.dentro = e.target === this.alvo;
      if (this.travado || this.arrastando || (this.seguirMouse && this.dentro)) {
        this.mouseDx += e.movementX;
        this.mouseDy += e.movementY;
      }
    });
    document.addEventListener('mouseleave', () => (this.dentro = false));
    document.addEventListener('pointerlockchange', () => {
      const antes = this.travado;
      this.travado = document.pointerLockElement === this.alvo;
      if (antes && !this.travado) this.soltouPonteiro = true;
    });
  }

  /** -1..1: quanto o ponteiro solto está encostado na borda esquerda (-) ou direita (+) da tela. */
  giroDeBorda() {
    if (this.travado || this.dispositivo === 'controle' || !this.seguirMouse || !this.dentro || this.mouseX < 0) return 0;
    const faixa = Math.max(40, innerWidth * 0.07);
    if (this.mouseX < faixa) return -(1 - this.mouseX / faixa);
    if (this.mouseX > innerWidth - faixa) return 1 - (innerWidth - this.mouseX) / faixa;
    return 0;
  }

  segurando(...codigos: string[]) {
    return codigos.some((c) => this.seguradas.has(c) || this.virtuais.has(c));
  }

  apertou(...codigos: string[]) {
    return codigos.some((c) => this.novas.has(c));
  }

  /** Chamar no fim de cada quadro. */
  fimDoQuadro() {
    this.novas.clear();
    this.mouseDx = 0;
    this.mouseDy = 0;
  }

  /** Direção de andar: teclado (sempre inteira) ou analógico esquerdo (meio inclinado = devagar). */
  eixo(): [number, number] {
    const x = (this.segurando('KeyD', 'ArrowRight') ? 1 : 0) - (this.segurando('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.segurando('KeyW', 'ArrowUp') ? 1 : 0) - (this.segurando('KeyS', 'ArrowDown') ? 1 : 0);
    if (!x && !y) return [...this.andarControle];
    const n = Math.hypot(x, y) || 1;
    return [x / n, y / n];
  }

  /**
   * Lê o controle (uma vez por quadro, antes do jogo consultar as teclas). Com `menu` verdadeiro (tela inicial,
   * pausa, dons, configurações) o controle não vira teclas do jogo: quem o usa é a NavegacaoControle.
   */
  lerControle(menu: boolean) {
    const c = this.controle;
    c.ler();
    if (c.usado) this.usar('controle');
    this.virtuais.clear();
    this.camX = this.camY = 0;
    this.andarControle = [0, 0];
    if (!c.conectado || menu) {
      this.correndo = false;
      return;
    }
    for (const [b, cod] of MAPA_CONTROLE) {
      if (c.segurando(b)) this.virtuais.add(cod);
      if (c.apertou(b)) this.novas.add(cod);
    }
    const [lx, ly] = c.esquerdo;
    const m = Math.hypot(lx, ly);
    this.andarControle = [lx, ly];
    if (c.apertou(B.L3)) this.correndo = true;
    if (m < 0.25) this.correndo = false;
    if (this.correndo) this.virtuais.add('ShiftLeft');
    // o analógico também escolhe nas perguntas: um toque para cima/baixo vale um aperto do direcional
    if (this.toque === 0 && Math.abs(ly) > 0.65) {
      this.toque = Math.sign(ly);
      this.novas.add(ly > 0 ? 'PadCima' : 'PadBaixo');
    } else if (Math.abs(ly) < 0.3) this.toque = 0;
    // curva quadrática: precisão na mira com pouco giro, volta rápida com o analógico no fundo
    const [rx, ry] = c.direito;
    const r = Math.hypot(rx, ry);
    if (r > 0) {
      const k = Math.pow(r, 1.8) / r;
      this.camX = rx * k;
      this.camY = ry * k;
    }
  }

  /** Giro da câmera pelo analógico direito neste quadro, em "pixels de mouse" (o mesmo que `Camera.girar`). */
  giroControle(dt: number, sensibilidade: number, inverterY: boolean): [number, number] {
    return [this.camX * GIRO_X * dt * sensibilidade, this.camY * GIRO_Y * dt * sensibilidade * (inverterY ? 1 : -1)];
  }

  /** Tremor do controle (só se o jogador está jogando nele). */
  vibrar(forte: number, fraco: number, ms: number) {
    if (this.dispositivo === 'controle') this.controle.vibrar(forte, fraco, ms);
  }

  private usar(d: Dispositivo) {
    if (d === this.dispositivo) return;
    this.dispositivo = d;
    document.body.classList.toggle('no-controle', d === 'controle');
    this.aoTrocarDispositivo?.();
  }
}

function digitando(alvo: EventTarget | null) {
  return alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement || alvo instanceof HTMLSelectElement || (alvo instanceof HTMLElement && alvo.isContentEditable);
}

/** Pede o ponteiro travado; alguns ambientes (iframes, prévias) recusam e tudo segue com arrastar. */
export function travarPonteiro(el: HTMLElement) {
  try {
    const r = el.requestPointerLock?.() as unknown as Promise<void> | undefined;
    r?.catch?.(() => {});
  } catch {
    /* sem pointer lock */
  }
}
