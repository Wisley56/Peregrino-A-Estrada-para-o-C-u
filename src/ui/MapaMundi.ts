import type { IdArea } from '../mundo/Area';
import { NIVEL_MAR, type TipoPontoDeViagem } from '../mundo/aberto/Geografia';
import type { TerrenoMundo } from '../mundo/aberto/TerrenoMundo';
import { QUADRA_MAPA } from '../core/Estado';

/** Uma região ao ar livre no mapa: o retângulo dela no mundo e quanto o peregrino já a conhece. */
export interface RegiaoNoMapa {
  id: IdArea;
  nome: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  visitada: boolean;
  /** A cor dela já voltou (a flag `*_restaurad*` da região). */
  restaurada: boolean;
}

/** Um ponto de viagem já descoberto. */
export interface PontoNoMapa {
  id: string;
  nome: string;
  tipo: TipoPontoDeViagem;
  regiao: string;
  x: number;
  z: number;
}

/** O que o mapa pergunta ao jogo (o save continua sendo a fonte da verdade). */
export interface FonteMapaMundi {
  terreno: TerrenoMundo;
  regioes(): RegiaoNoMapa[];
  pontos(): PontoNoMapa[];
  /** Quadras de `QUADRA_MAPA` m já pisadas ("i,j"). */
  quadras(): Iterable<string>;
  /** Onde o peregrino está, se estiver no mundo aberto (num interior, null), e onde ele está em palavras. */
  peregrino(): { x: number; z: number; rumo: number } | null;
  ondeEsta(): string;
  /** A estrela do Conselho: o próximo passo do caminho, ou null. */
  estrela(): { x: number; z: number } | null;
  /** Pede a viagem: devolve o motivo da recusa, ou null se ela começou (o jogo fecha o mapa). */
  viajar(id: string): string | null;
  fechar(): void;
}

/** Metros por pixel da imagem base do mapa. */
const PASSO = 10;
/** Folga em volta das regiões (m). */
const MARGEM = 700;
const ZOOM_MIN = 0.06, ZOOM_MAX = 1.6;
const RASO = [0x4a, 0xa8, 0xc0], FUNDO = [0x1d, 0x5f, 0x86];
const PERGAMINHO = '#e4cf9f';
const TINTA = '#3a2614';
/** O pergaminho além da borda do mapa (o mesmo tom do pergaminho já tingido em `compor`). */
const FORA = '#d2b476';
const ZOOM_INICIAL = 0.5;

const ICONE: Record<TipoPontoDeViagem, string> = { capela: '⛪', cruzeiro: '✝', cais: '⚓', lugar: '◆' };

/**
 * O mapa-múndi (M, ou "Mapa" na pausa): o mundo num pergaminho. O chão de verdade só aparece onde o peregrino já
 * esteve: uma região não visitada fica encoberta (só o contorno e "?"); visitada, aparece em sépia, como o mundo
 * sem cor; restaurada, em cor. O ermo se revela pelas quadras pisadas. Os pontos de viagem descobertos ficam numa
 * lista ao lado (o caminho do teclado e do controle) e no mapa: escolher um pede confirmação e leva até lá.
 *
 * A imagem base (cor e sépia) é pintada aos poucos desde o começo do jogo (`trabalhar`), alguns milissegundos por
 * quadro; se o mapa abrir antes, termina-se de uma vez.
 */
export class MapaMundi {
  private raiz: HTMLElement;
  private tela: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lista: HTMLElement;
  private confirma: HTMLElement;
  private onde: HTMLElement;
  aberta = false;

  // a imagem base
  private x0 = 0;
  private z0 = 0;
  private larg = 0;
  private alt = 0;
  private cor: ImageData | null = null;
  private sepia: ImageData | null = null;
  private linha = 0;
  private composta: HTMLCanvasElement | null = null;

  // a vista: o centro (m do mundo) e o zoom (pixels de tela por metro)
  private cx = 0;
  private cz = 0;
  private zoom = 0.3;
  private alvo: { x: number; z: number } | null = null;
  private sel: string | null = null;
  private arrasto: { x: number; y: number; cx: number; cz: number; moveu: boolean } | null = null;
  private pontos: PontoNoMapa[] = [];
  private regioes: RegiaoNoMapa[] = [];
  private teclas = new Set<string>();
  private ultimo = 0;

  constructor(private fonte: FonteMapaMundi) {
    this.raiz = document.createElement('section');
    this.raiz.id = 'mapa-mundi';
    this.raiz.innerHTML = `
      <div class="palco">
        <div class="moldura"><canvas></canvas>
          <div class="zoom"><button type="button" data-a="mais" aria-label="Aproximar">+</button><button type="button" data-a="menos" aria-label="Afastar">−</button><button type="button" data-a="eu">Onde estou</button></div>
        </div>
        <aside>
          <h2>O Caminho</h2>
          <p class="onde"></p>
          <h3>Lugares de viagem</h3>
          <nav class="lista"></nav>
          <div class="confirma" hidden></div>
          <p class="rodape" data-controle="{A} escolhe · {B} volta">Arraste e role para ver · W A S D movem · + − aproximam · M ou Esc para voltar</p>
        </aside>
        <button type="button" class="fechar" data-a="voltar" aria-label="Voltar">✕</button>
      </div>`;
    document.body.appendChild(this.raiz);
    this.tela = this.raiz.querySelector('canvas')!;
    this.ctx = this.tela.getContext('2d')!;
    this.lista = this.raiz.querySelector('.lista')!;
    this.confirma = this.raiz.querySelector('.confirma')!;
    this.onde = this.raiz.querySelector('.onde')!;

    const t = fonte.terreno.carimbos;
    const minX = Math.min(...t.map((c) => c.x0)) - MARGEM, maxX = Math.max(...t.map((c) => c.x1)) + MARGEM;
    const minZ = Math.min(...t.map((c) => c.z0)) - MARGEM, maxZ = Math.max(...t.map((c) => c.z1)) + MARGEM;
    this.x0 = minX;
    this.z0 = minZ;
    this.larg = Math.ceil((maxX - minX) / PASSO);
    this.alt = Math.ceil((maxZ - minZ) / PASSO);

    this.raiz.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'voltar') this.fonte.fechar();
      else if (a === 'mais') this.aproximar(1.5);
      else if (a === 'menos') this.aproximar(1 / 1.5);
      else if (a === 'eu') this.irAoPeregrino();
      else if (a === 'viajar' && this.sel) this.viajar(this.sel);
      else if (a === 'cancelar') this.escolher(null);
      else if (b.dataset.ponto) this.escolher(b.dataset.ponto);
    });
    this.lista.addEventListener('focusin', (e) => {
      const id = (e.target as HTMLElement).dataset?.ponto;
      const p = id && this.pontos.find((q) => q.id === id);
      if (p) this.alvo = { x: p.x, z: p.z };
    });
    this.tela.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.aproximar(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.offsetX, e.offsetY);
    }, { passive: false });
    this.tela.addEventListener('pointerdown', (e) => {
      this.tela.setPointerCapture(e.pointerId);
      this.arrasto = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moveu: false };
    });
    this.tela.addEventListener('pointermove', (e) => {
      const a = this.arrasto;
      if (!a) return;
      const dx = e.clientX - a.x, dy = e.clientY - a.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) a.moveu = true;
      const k = (devicePixelRatio || 1) / this.zoom;
      this.cx = a.cx - dx * k;
      this.cz = a.cz - dy * k;
      this.alvo = null;
    });
    this.tela.addEventListener('pointerup', (e) => {
      const a = this.arrasto;
      this.arrasto = null;
      if (a && !a.moveu) this.clicar(e.offsetX, e.offsetY);
    });
    window.addEventListener('keydown', (e) => {
      if (!this.aberta) return;
      if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'KeyE') this.aproximar(1.25);
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'KeyQ') this.aproximar(1 / 1.25);
      else this.teclas.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
  }

  get pronto() {
    return this.linha >= this.alt;
  }

  /**
   * Pinta mais um pedaço da imagem base, até `ms` milissegundos. A cor é a do chão visto de cima com o relevo
   * sombreado (luz do noroeste); a sépia é a mesma imagem sem cor, puxada para o tom do pergaminho.
   */
  trabalhar(ms: number) {
    if (this.pronto) return;
    const { larg, alt } = this;
    this.cor ??= new ImageData(larg, alt);
    this.sepia ??= new ImageData(larg, alt);
    const t = this.fonte.terreno;
    const fim = performance.now() + ms;
    while (this.linha < alt && performance.now() < fim) {
      const j = this.linha++;
      const z = this.z0 + j * PASSO;
      for (let i = 0; i < larg; i++) {
        const x = this.x0 + i * PASSO;
        const a = t.altura(x, z);
        let r: number, g: number, b: number;
        if (a < NIVEL_MAR) {
          const k = Math.min(1, (NIVEL_MAR - a) / 9);
          r = RASO[0] + (FUNDO[0] - RASO[0]) * k;
          g = RASO[1] + (FUNDO[1] - RASO[1]) * k;
          b = RASO[2] + (FUNDO[2] - RASO[2]) * k;
        } else {
          const c = t.cor(x, z);
          const queda = (t.altura(x + PASSO, z + PASSO) - a) / PASSO;
          const luz = Math.max(0.55, Math.min(1.3, 1 - queda * 0.9));
          r = Math.min(255, ((c >> 16) & 255) * luz);
          g = Math.min(255, ((c >> 8) & 255) * luz);
          b = Math.min(255, (c & 255) * luz);
        }
        const k = (j * larg + i) * 4;
        const d = this.cor.data, s = this.sepia.data;
        d[k] = r;
        d[k + 1] = g;
        d[k + 2] = b;
        d[k + 3] = 255;
        const l = r * 0.3 + g * 0.59 + b * 0.11;
        s[k] = Math.min(255, l * 0.82 + 52);
        s[k + 1] = Math.min(255, l * 0.74 + 42);
        s[k + 2] = Math.min(255, l * 0.56 + 26);
        s[k + 3] = 255;
      }
    }
  }

  abrir() {
    this.aberta = true;
    while (!this.pronto) this.trabalhar(50);
    this.regioes = this.fonte.regioes();
    this.pontos = this.fonte.pontos();
    this.compor();
    this.montarLista();
    this.onde.textContent = this.fonte.ondeEsta();
    this.escolher(null);
    this.raiz.classList.add('aberto');
    this.irAoPeregrino(true);
    if (!this.fonte.peregrino()) this.zoom = 0.18;
    this.ultimo = performance.now();
    this.lista.querySelector<HTMLButtonElement>('button')?.focus();
  }

  fechar() {
    this.aberta = false;
    this.teclas.clear();
    this.raiz.classList.remove('aberto');
    (document.activeElement as HTMLElement | null)?.blur();
  }

  /** Chamado a cada quadro com o mapa aberto: anda a vista e redesenha. */
  atualizar() {
    if (!this.aberta) return;
    const agora = performance.now();
    const dt = Math.min(0.05, (agora - this.ultimo) / 1000);
    this.ultimo = agora;
    const vel = 700 / this.zoom * dt;
    const k = this.teclas;
    const dx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0), dz = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
    if (dx || dz) {
      this.cx += dx * vel;
      this.cz += dz * vel;
      this.alvo = null;
    }
    if (this.alvo) {
      const s = 1 - Math.exp(-dt * 8);
      this.cx += (this.alvo.x - this.cx) * s;
      this.cz += (this.alvo.z - this.cz) * s;
      if (Math.hypot(this.alvo.x - this.cx, this.alvo.z - this.cz) < 1) this.alvo = null;
    }
    this.desenhar();
  }

  // ───────────────────────────── escolha e viagem ─────────────────────────────

  private montarLista() {
    const grupos = new Map<string, PontoNoMapa[]>();
    for (const p of this.pontos) grupos.set(p.regiao, [...(grupos.get(p.regiao) ?? []), p]);
    if (!this.pontos.length) {
      this.lista.innerHTML = '<p class="vazio">Nenhum ainda. Capelas, cruzeiros e cais ficam aqui quando você chega perto deles.</p>';
      return;
    }
    this.lista.innerHTML = [...grupos].map(([regiao, ps]) => `<h4>${regiao}</h4>` +
      ps.map((p) => `<button type="button" class="ponto" data-ponto="${p.id}"><span class="ic">${ICONE[p.tipo]}</span>${p.nome}</button>`).join('')).join('');
  }

  private escolher(id: string | null) {
    this.sel = id;
    const p = id ? this.pontos.find((q) => q.id === id) : null;
    this.lista.querySelectorAll<HTMLElement>('[data-ponto]').forEach((b) => b.classList.toggle('sel', b.dataset.ponto === id));
    if (!p) {
      this.confirma.hidden = true;
      return;
    }
    this.alvo = { x: p.x, z: p.z };
    this.confirma.hidden = false;
    this.confirma.innerHTML = `<p>Seguir até <b>${p.nome}</b>?</p><p class="motivo"></p>
      <nav><button type="button" class="vb rubi" data-a="viajar">Viajar</button><button type="button" class="vb" data-a="cancelar">Ficar</button></nav>`;
    this.confirma.querySelector<HTMLButtonElement>('[data-a="viajar"]')!.focus();
  }

  private viajar(id: string) {
    const motivo = this.fonte.viajar(id);
    if (motivo) this.confirma.querySelector('.motivo')!.textContent = motivo;
  }

  private clicar(sx: number, sy: number) {
    const d = devicePixelRatio || 1;
    let melhor: PontoNoMapa | null = null, dm = 16 * d;
    for (const p of this.pontos) {
      const [x, y] = this.naTela(p.x, p.z);
      const dist = Math.hypot(x - sx * d, y - sy * d);
      if (dist < dm) {
        dm = dist;
        melhor = p;
      }
    }
    if (melhor) this.escolher(melhor.id);
  }

  // ───────────────────────────── vista ─────────────────────────────

  private aproximar(f: number, sx?: number, sy?: number) {
    const d = devicePixelRatio || 1;
    const w = this.tela.width, h = this.tela.height;
    // o ponto sob o cursor fica parado
    const px = sx !== undefined ? sx * d : w / 2, py = sy !== undefined ? sy * d : h / 2;
    const mx = this.cx + (px - w / 2) / this.zoom, mz = this.cz + (py - h / 2) / this.zoom;
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * f));
    this.cx = mx - (px - w / 2) / this.zoom;
    this.cz = mz - (py - h / 2) / this.zoom;
  }

  private irAoPeregrino(ja = false) {
    const p = this.fonte.peregrino();
    const c = p ?? { x: this.x0 + (this.larg * PASSO) / 2, z: this.z0 + (this.alt * PASSO) / 2 };
    if (ja) {
      this.cx = c.x;
      this.cz = c.z;
      this.zoom = ZOOM_INICIAL;
    } else this.alvo = { x: c.x, z: c.z };
  }

  private naTela(x: number, z: number): [number, number] {
    return [(x - this.cx) * this.zoom + this.tela.width / 2, (z - this.cz) * this.zoom + this.tela.height / 2];
  }

  // ───────────────────────────── desenho ─────────────────────────────

  /**
   * Monta a imagem do que o peregrino conhece: o pergaminho, por cima a sépia onde ele esteve (quadras do ermo,
   * regiões visitadas) e a cor nas regiões restauradas, com as beiradas esfumadas.
   */
  private compor() {
    const { larg, alt } = this;
    const nova = () => {
      const c = document.createElement('canvas');
      c.width = larg;
      c.height = alt;
      return c;
    };
    const comp = this.composta ?? nova();
    this.composta = comp;
    const g = comp.getContext('2d')!;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = PERGAMINHO;
    g.fillRect(0, 0, larg, alt);
    // a fibra do pergaminho
    for (let k = 0; k < (larg * alt) / 40; k++) {
      const x = (k * 7919) % larg, y = ((k * 104729) >> 3) % alt;
      g.fillStyle = k % 3 ? 'rgba(120,80,30,0.05)' : 'rgba(255,250,230,0.08)';
      g.fillRect(x, y, 2 + (k % 5), 1);
    }
    const camada = (pintarMascara: (m: CanvasRenderingContext2D) => void, img: ImageData) => {
      const c = nova();
      const m = c.getContext('2d')!;
      m.filter = 'blur(3px)';
      m.fillStyle = '#fff';
      pintarMascara(m);
      m.filter = 'none';
      const base = nova();
      base.getContext('2d')!.putImageData(img, 0, 0);
      m.globalCompositeOperation = 'source-in';
      m.drawImage(base, 0, 0);
      g.drawImage(c, 0, 0);
    };
    const ret = (m: CanvasRenderingContext2D, r: RegiaoNoMapa) =>
      m.fillRect((r.x0 - this.x0) / PASSO, (r.z0 - this.z0) / PASSO, (r.x1 - r.x0) / PASSO, (r.z1 - r.z0) / PASSO);
    const q = QUADRA_MAPA / PASSO;
    camada((m) => {
      for (const s of this.fonte.quadras()) {
        const [i, j] = s.split(',').map(Number);
        const x = (i * QUADRA_MAPA - this.x0) / PASSO, y = (j * QUADRA_MAPA - this.z0) / PASSO;
        m.beginPath();
        m.arc(x + q / 2, y + q / 2, q * 0.85, 0, Math.PI * 2);
        m.fill();
      }
      for (const r of this.regioes) if (r.visitada && !r.restaurada) ret(m, r);
    }, this.sepia!);
    camada((m) => {
      for (const r of this.regioes) if (r.visitada && r.restaurada) ret(m, r);
    }, this.cor!);
    // as bordas da tinta: o que se conhece escurece um pouco onde encontra o pergaminho
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(236,222,190,1)';
    g.fillRect(0, 0, larg, alt);
    g.globalCompositeOperation = 'source-over';
  }

  private desenhar() {
    const tela = this.tela, d = devicePixelRatio || 1;
    const w = Math.round(tela.clientWidth * d), h = Math.round(tela.clientHeight * d);
    if (!w || !h) return;
    if (tela.width !== w || tela.height !== h) {
      tela.width = w;
      tela.height = h;
    }
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = FORA;
    c.fillRect(0, 0, w, h);
    const [ox, oy] = this.naTela(this.x0, this.z0);
    c.imageSmoothingEnabled = this.zoom < 1 / PASSO * 2;
    if (this.composta) c.drawImage(this.composta, ox, oy, this.larg * PASSO * this.zoom, this.alt * PASSO * this.zoom);

    // as regiões: o contorno e o nome; as não visitadas, tracejadas e com "?"
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const r of this.regioes) {
      const [x0, y0] = this.naTela(r.x0, r.z0), [x1, y1] = this.naTela(r.x1, r.z1);
      if (r.id === 'bahiaalta' && this.regioes.some((o) => o.id === 'bahiabaixa' && !o.visitada) && !r.visitada) continue;
      c.save();
      c.strokeStyle = r.visitada ? 'rgba(58,38,20,0.55)' : 'rgba(58,38,20,0.7)';
      c.lineWidth = (r.visitada ? 1.2 : 1.6) * d;
      if (!r.visitada) c.setLineDash([6 * d, 5 * d]);
      if (!r.visitada || this.zoom < 0.5) c.strokeRect(x0, y0, x1 - x0, y1 - y0);
      c.restore();
      const cx = (x0 + x1) / 2, cy = r.id === 'bahiaalta' ? y1 + 12 * d : y0 - 12 * d;
      const texto = r.visitada ? r.nome : '?';
      c.font = r.visitada ? `600 ${14 * d}px Cinzel, Georgia, serif` : `700 ${Math.max(18, Math.min(60, (x1 - x0) / 4 / d)) * d}px Cinzel, Georgia, serif`;
      c.lineWidth = 4 * d;
      c.strokeStyle = 'rgba(240,226,190,0.9)';
      const ty = r.visitada ? cy : (y0 + y1) / 2;
      c.strokeText(texto, cx, ty);
      c.fillStyle = TINTA;
      c.fillText(texto, cx, ty);
    }

    // os pontos de viagem
    c.font = `${16 * d}px 'Segoe UI Symbol', 'Noto Sans Symbols', serif`;
    for (const p of this.pontos) {
      const [x, y] = this.naTela(p.x, p.z);
      const sel = p.id === this.sel;
      c.beginPath();
      c.arc(x, y, (sel ? 13 : 10) * d, 0, Math.PI * 2);
      c.fillStyle = sel ? '#8e1b2a' : 'rgba(250,240,214,0.95)';
      c.strokeStyle = sel ? '#f4d77a' : TINTA;
      c.lineWidth = 1.6 * d;
      c.fill();
      c.stroke();
      c.fillStyle = sel ? '#f8ecd0' : TINTA;
      c.fillText(ICONE[p.tipo], x, y + 1 * d);
    }

    // a estrela do Conselho
    const e = this.fonte.estrela();
    if (e) {
      const [x, y] = this.naTela(e.x, e.z);
      const pulso = 1 + Math.sin(performance.now() / 260) * 0.12;
      c.save();
      c.translate(x, y);
      c.scale(pulso * d, pulso * d);
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, raio = i % 2 ? 3.2 : 8;
        c.lineTo(Math.cos(a) * raio, Math.sin(a) * raio);
      }
      c.closePath();
      c.fillStyle = '#5b8def';
      c.strokeStyle = '#eaf2ff';
      c.lineWidth = 1.4;
      c.fill();
      c.stroke();
      c.restore();
    }

    // o peregrino
    const p = this.fonte.peregrino();
    if (p) {
      const [x, y] = this.naTela(p.x, p.z);
      c.save();
      c.translate(x, y);
      // rumo 0 olha para +z (o sul, para baixo na tela)
      c.rotate(-p.rumo + Math.PI);
      c.scale(d, d);
      c.beginPath();
      c.moveTo(0, -10);
      c.lineTo(7, 7);
      c.lineTo(0, 3.5);
      c.lineTo(-7, 7);
      c.closePath();
      c.fillStyle = '#fff6dc';
      c.strokeStyle = '#8e1b2a';
      c.lineWidth = 2;
      c.fill();
      c.stroke();
      c.restore();
    }

    // a rosa dos ventos
    c.save();
    c.translate(46 * d, 52 * d);
    c.scale(d, d);
    c.fillStyle = TINTA;
    c.beginPath();
    c.moveTo(0, -26);
    c.lineTo(6, 0);
    c.lineTo(0, 26);
    c.lineTo(-6, 0);
    c.closePath();
    c.globalAlpha = 0.75;
    c.fill();
    c.beginPath();
    c.moveTo(-22, 0);
    c.lineTo(0, 5);
    c.lineTo(22, 0);
    c.lineTo(0, -5);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.font = `700 13px Cinzel, Georgia, serif`;
    c.fillText('N', 0, -36);
    c.restore();
  }
}
