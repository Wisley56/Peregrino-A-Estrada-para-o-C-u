/**
 * Minimapa no canto superior direito: um medalhão redondo com moldura de vitral.
 * O chão de cada área é desenhado uma vez (vista de cima, 2 px por metro) e depois só recortado
 * e girado em volta do peregrino. O mapa gira com a câmera: para cima é para onde ela olha.
 */

export interface FonteMapa {
  /** Canto e tamanho (m) do retângulo coberto. */
  x0: number;
  z0: number;
  largura: number;
  profundidade: number;
  /** Cor (0xRRGGBB) do chão visto de cima. */
  cor(x: number, z: number): number;
}

export type TipoMarca = 'lugar' | 'descanso' | 'pessoa' | 'sombra' | 'chefe' | 'saida';
export interface Marca {
  x: number;
  z: number;
  tipo: TipoMarca;
}

const PX = 2; // pixels da imagem base por metro
const RAIO_VISTA = 34; // metros do centro até a borda do medalhão (a Prudência, Conselho 3, alarga para 60)

export class Minimapa {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nome: HTMLElement;
  private bases = new Map<string, { img: HTMLCanvasElement; f: FonteMapa }>();
  private atual: { img: HTMLCanvasElement; f: FonteMapa } | null = null;
  private tam = 0;

  constructor() {
    const raiz = document.createElement('div');
    raiz.id = 'minimapa';
    raiz.innerHTML = '<canvas></canvas><div class="nome"></div>';
    document.getElementById('hud')!.appendChild(raiz);
    this.canvas = raiz.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.nome = raiz.querySelector('.nome')!;
  }

  /** Troca a área mostrada (a base é gerada só na primeira vez). */
  definirArea(chave: string, nome: string, fonte: FonteMapa) {
    this.nome.textContent = nome;
    let b = this.bases.get(chave);
    if (!b) {
      const img = document.createElement('canvas');
      img.width = Math.ceil(fonte.largura * PX);
      img.height = Math.ceil(fonte.profundidade * PX);
      const c = img.getContext('2d')!;
      const dados = c.createImageData(img.width, img.height);
      for (let j = 0; j < img.height; j++)
        for (let i = 0; i < img.width; i++) {
          const cor = fonte.cor(fonte.x0 + (i + 0.5) / PX, fonte.z0 + (j + 0.5) / PX);
          const k = (j * img.width + i) * 4;
          dados.data[k] = (cor >> 16) & 255;
          dados.data[k + 1] = (cor >> 8) & 255;
          dados.data[k + 2] = cor & 255;
          dados.data[k + 3] = 255;
        }
      c.putImageData(dados, 0, 0);
      b = { img, f: fonte };
      this.bases.set(chave, b);
    }
    this.atual = b;
  }

  /** Troca só o nome mostrado (a imagem fica a mesma até chegar outra). */
  nomear(nome: string) {
    this.nome.textContent = nome;
  }

  /**
   * Usa como base uma imagem já pintada (RGBA, 1 pixel por metro) do retângulo `f`: é como chega o mapa do ermo,
   * feito fora do thread do jogo.
   */
  definirImagem(chave: string, nome: string, f: Omit<FonteMapa, 'cor'>, px: Uint8ClampedArray) {
    this.nome.textContent = nome;
    const img = document.createElement('canvas');
    img.width = Math.round(f.largura);
    img.height = Math.round(f.profundidade);
    img.getContext('2d')!.putImageData(new ImageData(px as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    const b = { img, f: { ...f, cor: () => 0 } };
    this.bases.set(chave, b);
    this.atual = b;
  }

  /** Esquece a base de uma área (quando o chão dela muda, como a parede falsa que se abre). */
  esquecer(chave: string) {
    this.bases.delete(chave);
  }

  mostrar(visivel: boolean) {
    (this.canvas.parentElement as HTMLElement).style.display = visivel ? '' : 'none';
  }

  /**
   * @param guinada ângulo da câmera (a mesma convenção de `CameraTerceira.guinada`)
   * @param rumo para onde o peregrino está virado
   * @param conselho o dom do Conselho: o próximo passo do caminho (a rosa dos ventos) e o raio da vista
   */
  desenhar(px: number, pz: number, guinada: number, rumo: number, marcas: Marca[], conselho: { alvo?: { x: number; z: number } | null; raio?: number } = {}) {
    const RAIO = conselho.raio ?? RAIO_VISTA;
    const b = this.atual;
    if (!b) return;
    const css = this.canvas.clientWidth || 160;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const tam = Math.round(css * dpr);
    if (tam !== this.tam) {
      this.tam = this.canvas.width = this.canvas.height = tam;
    }
    const c = this.ctx;
    const r = tam / 2;
    const escala = r / RAIO; // pixels de tela por metro
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, tam, tam);
    c.save();
    c.beginPath();
    c.arc(r, r, r - 2 * dpr, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#16120c';
    c.fillRect(0, 0, tam, tam);

    // a câmera olha para (-sin g, -cos g); girando o mundo por (g) essa direção fica para cima
    c.translate(r, r);
    c.rotate(guinada);
    c.scale(escala, escala);
    c.translate(-px, -pz);
    c.imageSmoothingEnabled = false;
    c.drawImage(b.img, b.f.x0, b.f.z0, b.f.largura, b.f.profundidade);

    // marcas (desenhadas em pixels, sem girar o formato)
    for (const m of marcas) {
      const dx = m.x - px, dz = m.z - pz;
      if (dx * dx + dz * dz > (RAIO + 4) ** 2) continue;
      c.save();
      c.translate(m.x, m.z);
      c.rotate(-guinada);
      c.scale(1 / escala, 1 / escala);
      this.marca(c, m.tipo, dpr);
      c.restore();
    }
    c.restore();

    // a rosa dos ventos do Conselho: a estrela azul no próximo passo, ou na borda, apontando para ele
    if (conselho.alvo) {
      const dx = conselho.alvo.x - px, dz = conselho.alvo.z - pz;
      const d = Math.hypot(dx, dz);
      // o mundo gira por (guinada): (dx, dz) vai para a tela como (dx cos g - dz sin g, dx sin g + dz cos g)
      const sx = dx * Math.cos(guinada) - dz * Math.sin(guinada), sy = dx * Math.sin(guinada) + dz * Math.cos(guinada);
      const borda = r - 14 * dpr;
      const k = d * escala > borda ? borda / (d * escala) : 1;
      const ex = r + sx * escala * k, ey = r + sy * escala * k;
      c.save();
      c.translate(ex, ey);
      if (k < 1) c.rotate(Math.atan2(sy, sx) + Math.PI / 2);
      const pulso = 1 + Math.sin(performance.now() / 260) * 0.12;
      c.scale(pulso, pulso);
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, raio = (i % 2 ? 2.4 : k < 1 && i === 0 ? 7.5 : 5.5) * dpr;
        c.lineTo(Math.cos(a) * raio, Math.sin(a) * raio);
      }
      c.closePath();
      c.fillStyle = '#5b8def';
      c.strokeStyle = '#eaf2ff';
      c.lineWidth = 1.3 * dpr;
      c.fill();
      c.stroke();
      c.restore();
    }

    // o peregrino: seta no centro, apontando para o rumo dele em relação à câmera
    c.save();
    c.translate(r, r);
    c.rotate(guinada - rumo + Math.PI);
    c.beginPath();
    c.moveTo(0, -7 * dpr);
    c.lineTo(5 * dpr, 5 * dpr);
    c.lineTo(0, 2.5 * dpr);
    c.lineTo(-5 * dpr, 5 * dpr);
    c.closePath();
    c.fillStyle = '#fff6dc';
    c.strokeStyle = '#3a2410';
    c.lineWidth = 1.5 * dpr;
    c.fill();
    c.stroke();
    c.restore();

    // o norte, na borda
    // girado por `guinada`, o -z do mundo vai para (sin g, -cos g) na tela
    const nx = r + Math.sin(guinada) * (r - 11 * dpr), ny = r - Math.cos(guinada) * (r - 11 * dpr);
    c.font = `700 ${10 * dpr}px Cinzel, Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 3 * dpr;
    c.strokeStyle = 'rgba(20,12,6,0.9)';
    c.strokeText('N', nx, ny);
    c.fillStyle = '#f4d77a';
    c.fillText('N', nx, ny);

    // moldura: chumbo, anel de vidro colorido e filete de ouro
    const anel = (raio: number, cor: string, w: number) => {
      c.beginPath();
      c.arc(r, r, raio, 0, Math.PI * 2);
      c.strokeStyle = cor;
      c.lineWidth = w;
      c.stroke();
    };
    const vidros = ['#2a5aa8', '#a8202f', '#d49a26', '#1f7d4b', '#5a2f8f', '#2a5aa8', '#a8202f', '#d49a26'];
    const seg = (Math.PI * 2) / 16;
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.arc(r, r, r - 4.5 * dpr, i * seg + 0.03, (i + 1) * seg - 0.03);
      c.strokeStyle = vidros[i % vidros.length];
      c.lineWidth = 5 * dpr;
      c.stroke();
    }
    anel(r - 1.2 * dpr, '#1a120a', 2.4 * dpr);
    anel(r - 7.5 * dpr, '#e2bd5c', 1.3 * dpr);
    anel(r - 8.6 * dpr, 'rgba(10,8,4,0.8)', 1 * dpr);
  }

  private marca(c: CanvasRenderingContext2D, tipo: TipoMarca, d: number) {
    c.lineWidth = 1.2 * d;
    c.strokeStyle = '#1a120a';
    c.beginPath();
    switch (tipo) {
      case 'sombra':
        c.arc(0, 0, 3.2 * d, 0, Math.PI * 2);
        c.fillStyle = '#6a3aa8';
        break;
      case 'chefe':
        c.arc(0, 0, 5 * d, 0, Math.PI * 2);
        c.fillStyle = '#d8203a';
        break;
      case 'pessoa':
        c.arc(0, 0, 3.6 * d, 0, Math.PI * 2);
        c.fillStyle = '#f6f0e0';
        break;
      case 'descanso':
        c.moveTo(0, -4.5 * d);
        c.lineTo(3.4 * d, 3 * d);
        c.lineTo(-3.4 * d, 3 * d);
        c.closePath();
        c.fillStyle = '#ff9a40';
        break;
      case 'saida':
        c.rect(-3 * d, -3 * d, 6 * d, 6 * d);
        c.fillStyle = '#7ac0f0';
        break;
      default:
        c.moveTo(0, -4 * d);
        c.lineTo(4 * d, 0);
        c.lineTo(0, 4 * d);
        c.lineTo(-4 * d, 0);
        c.closePath();
        c.fillStyle = '#f4d77a';
    }
    c.fill();
    c.stroke();
  }
}
