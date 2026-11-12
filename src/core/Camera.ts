import * as THREE from 'three';

/** Inclinação máxima: quase de cima para baixo (usada encostado em paredes de interiores). */
const TETO_ARFAGEM = 1.48;

/**
 * Câmera em terceira pessoa. Livre: o mouse gira em volta do peregrino.
 * Com a mira travada, ela se posiciona atrás do peregrino, enquadrando o alvo.
 */
export class CameraTerceira {
  readonly cam: THREE.PerspectiveCamera;
  guinada = Math.PI; // ângulo horizontal
  arfagem = 0.32; // ângulo vertical
  distancia = 6.2;
  /** Inclinação mínima; em interiores sem teto, alta o bastante para passar por cima das paredes. */
  arfagemMin = -0.25;
  /** Interior sem teto: ao bater numa parede, a câmera sobe em vez de se aproximar. */
  subirAoBater = false;
  /**
   * Quanto (em metros) a câmera olha acima da cabeça do peregrino. Como no Veloren, isso o põe um pouco abaixo do
   * centro da tela, e a mira fica livre por cima dele, apontando para onde a câmera olha.
   */
  elevacaoMira = 0;
  private elev = 0;
  private extra = 0;
  private foco = new THREE.Vector3();
  private posAtual = new THREE.Vector3();
  private primeiro = true;

  constructor(aspecto: number) {
    this.cam = new THREE.PerspectiveCamera(60, aspecto, 0.1, 700);
  }

  /** Pula a suavização no próximo quadro (depois de teleportar). */
  reposicionar() {
    this.primeiro = true;
  }

  girar(dx: number, dy: number) {
    this.guinada -= dx * 0.0032;
    this.arfagem = Math.min(1.2, Math.max(this.arfagemMin, this.arfagem + dy * 0.0026));
  }

  /** Direção "para frente" no chão, a partir da câmera. */
  frente(destino = new THREE.Vector3()) {
    return destino.set(-Math.sin(this.guinada), 0, -Math.cos(this.guinada));
  }

  direita(destino = new THREE.Vector3()) {
    return destino.set(Math.cos(this.guinada), 0, -Math.sin(this.guinada));
  }

  atualizar(dt: number, alvoJogador: THREE.Vector3, alvoTravado: THREE.Vector3 | null, altura: (x: number, z: number) => number) {
    const focoDesejado = alvoJogador.clone().add(new THREE.Vector3(0, 1.55, 0));
    if (alvoTravado) {
      const dx = alvoJogador.x - alvoTravado.x, dz = alvoJogador.z - alvoTravado.z;
      const desejada = Math.atan2(dx, dz);
      let d = desejada - this.guinada;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.guinada += d * Math.min(1, dt * 6);
      this.arfagem += (0.28 - this.arfagem) * Math.min(1, dt * 3);
      focoDesejado.lerp(alvoTravado.clone().add(new THREE.Vector3(0, 0.6, 0)), 0.3);
    }
    this.arfagem += (Math.max(this.arfagem, this.arfagemMin) - this.arfagem) * Math.min(1, dt * 4);
    if (this.primeiro) this.foco.copy(focoDesejado);
    this.foco.lerp(focoDesejado, Math.min(1, dt * 10));

    // em interiores sem teto, a câmera sobe por cima da parede em vez de se aproximar
    let alvoExtra = 0;
    if (this.subirAoBater) {
      const folga = Math.max(0, TETO_ARFAGEM - this.arfagem);
      for (let i = 0; i <= 10; i++) {
        alvoExtra = (folga * i) / 10;
        if (this.bloqueio(this.braco(this.arfagem + alvoExtra), altura) < 0) break;
      }
    }
    this.extra += (alvoExtra - this.extra) * Math.min(1, dt * (alvoExtra > this.extra ? 8 : 2.5));
    if (this.primeiro) this.extra = alvoExtra;
    const desejo = this.braco(Math.min(TETO_ARFAGEM, this.arfagem + this.extra));
    // não entrar no terreno: aproxima a câmera ao longo do braço se houver morro no caminho
    const k = this.bloqueio(desejo, altura);
    if (k >= 0) {
      desejo.copy(this.foco.clone().lerp(desejo, Math.max(0.15, (k - 1) / 8)));
      desejo.y = Math.max(desejo.y, altura(desejo.x, desejo.z) + 0.5);
    }
    if (this.primeiro) {
      this.posAtual.copy(desejo);
      this.primeiro = false;
    }
    this.posAtual.lerp(desejo, Math.min(1, dt * 12));
    this.cam.position.copy(this.posAtual);
    const elevDesejada = alvoTravado ? 0 : this.elevacaoMira;
    this.elev = this.primeiro ? elevDesejada : this.elev + (elevDesejada - this.elev) * Math.min(1, dt * 5);
    this.cam.lookAt(this.foco.x, this.foco.y + this.elev, this.foco.z);
  }

  /** Posição da câmera na ponta do braço, para uma inclinação. */
  private braco(arfagem: number) {
    const cp = Math.cos(arfagem);
    return new THREE.Vector3(
      this.foco.x + Math.sin(this.guinada) * cp * this.distancia,
      this.foco.y + Math.sin(arfagem) * this.distancia,
      this.foco.z + Math.cos(this.guinada) * cp * this.distancia,
    );
  }

  /** Primeiro trecho (1..8) do braço que bate no chão ou na parede; -1 se está livre. */
  private bloqueio(desejo: THREE.Vector3, altura: (x: number, z: number) => number) {
    for (let k = 1; k <= 8; k++) {
      const p = this.foco.clone().lerp(desejo, k / 8);
      if (altura(p.x, p.z) + 0.4 > p.y) return k;
    }
    return -1;
  }
}
