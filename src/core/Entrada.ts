/** Teclado e mouse. `apertou()` vale só no quadro em que a tecla desceu. */
export class Entrada {
  private seguradas = new Set<string>();
  private novas = new Set<string>();
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
      if (e.code === 'Tab') e.preventDefault();
      if (!e.repeat) this.novas.add(e.code);
      this.seguradas.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.seguradas.delete(e.code));
    window.addEventListener('blur', () => this.seguradas.clear());

    alvo.addEventListener('contextmenu', (e) => e.preventDefault());
    alvo.addEventListener('mousedown', (e) => {
      const nome = ['Mouse0', 'Mouse1', 'Mouse2'][e.button];
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
    if (this.travado || !this.seguirMouse || !this.dentro || this.mouseX < 0) return 0;
    const faixa = Math.max(40, innerWidth * 0.07);
    if (this.mouseX < faixa) return -(1 - this.mouseX / faixa);
    if (this.mouseX > innerWidth - faixa) return 1 - (innerWidth - this.mouseX) / faixa;
    return 0;
  }

  segurando(...codigos: string[]) {
    return codigos.some((c) => this.seguradas.has(c));
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

  eixo(): [number, number] {
    const x = (this.segurando('KeyD', 'ArrowRight') ? 1 : 0) - (this.segurando('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.segurando('KeyW', 'ArrowUp') ? 1 : 0) - (this.segurando('KeyS', 'ArrowDown') ? 1 : 0);
    const n = Math.hypot(x, y) || 1;
    return [x / n, y / n];
  }
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
