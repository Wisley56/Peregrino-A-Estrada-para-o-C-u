/**
 * Menus pelo controle (tela inicial, criação, pausa, dons, configurações), sem cada tela precisar saber de
 * controle: o direcional e o analógico esquerdo viram setas do teclado; se a tela não usar a seta
 * (`preventDefault`), o foco anda para o botão mais próximo naquela direção, como nos consoles.
 *
 *   A/✕ confirma (clica o botão em foco) · B/○ e Menu/Options voltam (Esc) · View/Create = G (dons)
 *   LB/RB trocam de aba · analógico direito rola a lista · ←/→ num controle deslizante ajustam o valor
 */
import { B, type Controle } from '../core/Controle';

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
type Seta = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
const VETOR: Record<Seta, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/** Espera antes de repetir a seta segurada, e o intervalo das repetições (s). */
const ATRASO = 0.38;
const REPETE = 0.11;

export class NavegacaoControle {
  private seta: Seta | null = null;
  private espera = 0;

  /** Chamar a cada quadro enquanto alguma tela de menu estiver aberta. */
  atualizar(c: Controle, dt: number) {
    if (!c.conectado) return;
    const seta = direcao(c);
    if (seta !== this.seta) {
      if (this.seta) tecla('keyup', this.seta);
      this.seta = seta;
      if (seta) {
        this.mover(seta, false);
        this.espera = ATRASO;
      }
    } else if (seta) {
      this.espera -= dt;
      if (this.espera <= 0) {
        this.mover(seta, true);
        this.espera = REPETE;
      }
    }
    if (c.apertou(B.A)) this.confirmar();
    if (c.apertou(B.B) || c.apertou(B.MENU)) aperto('Escape', 'Escape');
    if (c.apertou(B.VOLTAR)) aperto('g', 'KeyG');
    if (c.apertou(B.LB)) this.trocarAba(-1);
    if (c.apertou(B.RB)) this.trocarAba(1);
    const ry = c.direito[1];
    if (ry) rolar(focoValido() ?? document.elementFromPoint(innerWidth / 2, innerHeight / 2), -ry * 900 * dt);
  }

  /** Esquece a seta segurada (ao sair dos menus), para não repetir nem soltar fora de hora. */
  soltar() {
    if (this.seta) tecla('keyup', this.seta);
    this.seta = null;
  }

  private mover(seta: Seta, repetindo: boolean) {
    // a tela pode tratar a seta por conta própria (a rosácea dos dons, a lista da tela inicial, os créditos)
    if (!tecla('keydown', seta, repetindo)) return;
    const foco = focoValido();
    if (foco instanceof HTMLInputElement && foco.type === 'range' && (seta === 'ArrowLeft' || seta === 'ArrowRight')) {
      const passo = Number(foco.step) || 1;
      const antes = foco.value;
      foco.value = String(Number(foco.value) + (seta === 'ArrowRight' ? passo : -passo) * 2);
      if (foco.value !== antes) {
        foco.dispatchEvent(new Event('input', { bubbles: true }));
        foco.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    const alvos = focaveis();
    if (!alvos.length) return;
    if (!foco) return focar(primeiro(alvos));
    const proximo = maisPerto(foco, alvos, seta);
    if (proximo) focar(proximo);
  }

  private confirmar() {
    const foco = focoValido();
    if (foco instanceof HTMLInputElement && foco.type !== 'checkbox' && foco.type !== 'radio' && foco.type !== 'button') return;
    if (foco) {
      // telas que redesenham os botões ao clicar (as escolhas das Configurações) tiram o foco: devolve ao novo
      // botão que ficou no mesmo lugar
      const r = foco.getBoundingClientRect();
      foco.click();
      if (!focoValido()) {
        const novo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest<HTMLElement>(FOCAVEIS);
        if (novo && noTopo(novo)) novo.focus();
      }
      return;
    }
    // sem foco: a tela pode tratar o Enter (os dons fortalecem); senão o A só acorda o foco no primeiro botão
    if (!aperto('Enter', 'Enter')) return;
    const alvos = focaveis();
    if (alvos.length) focar(primeiro(alvos));
  }

  private trocarAba(lado: number) {
    const abas = [...document.querySelectorAll<HTMLElement>('[data-aba]')].filter(noTopo);
    if (abas.length < 2) return;
    const i = Math.max(0, abas.findIndex((a) => a.classList.contains('ativa')));
    const prox = abas[(i + lado + abas.length) % abas.length];
    prox.click();
    focar(prox);
  }
}

function direcao(c: Controle): Seta | null {
  if (c.segurando(B.CIMA)) return 'ArrowUp';
  if (c.segurando(B.BAIXO)) return 'ArrowDown';
  if (c.segurando(B.ESQUERDA)) return 'ArrowLeft';
  if (c.segurando(B.DIREITA)) return 'ArrowRight';
  const [x, y] = c.esquerdo;
  if (Math.hypot(x, y) < 0.55) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'ArrowRight' : 'ArrowLeft') : y > 0 ? 'ArrowUp' : 'ArrowDown';
}

/** Dispara uma tecla sintética no elemento em foco (sobe até a janela). Devolve falso se a tela a consumiu. */
function tecla(tipo: 'keydown' | 'keyup', codigo: string, repetindo = false, chave = codigo) {
  const alvo = document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
  return alvo.dispatchEvent(new KeyboardEvent(tipo, { key: chave, code: codigo, repeat: repetindo, bubbles: true, cancelable: true }));
}

function aperto(chave: string, codigo: string) {
  const livre = tecla('keydown', codigo, false, chave);
  tecla('keyup', codigo, false, chave);
  return livre;
}

/** O elemento em foco, se ele está na camada de cima (não escondido atrás de outra janela). */
function focoValido(): HTMLElement | null {
  const a = document.activeElement;
  return a instanceof HTMLElement && a !== document.body && noTopo(a) ? a : null;
}

function focaveis() {
  return [...document.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(noTopo);
}

/**
 * Visível e não coberto por outra janela: o ponto do meio dele (ou da lista rolável que o contém, se ele
 * estiver fora da tela) acerta ele mesmo.
 */
function noTopo(el: HTMLElement) {
  if (el.hidden || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  if (st.visibility === 'hidden' || st.pointerEvents === 'none') return false;
  let x = r.left + r.width / 2;
  let y = r.top + r.height / 2;
  let alvo: Element = el;
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
    const rol = rolavel(el);
    if (!rol) return false;
    const rr = rol.getBoundingClientRect();
    alvo = rol;
    x = Math.min(innerWidth - 1, Math.max(1, rr.left + rr.width / 2));
    y = Math.min(innerHeight - 1, Math.max(1, rr.top + rr.height / 2));
  }
  const h = document.elementFromPoint(x, y);
  return !!h && alvo.contains(h);
}

function rolavel(el: Element | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 2) return p;
  }
  return null;
}

function rolar(el: Element | null, dy: number) {
  const r = el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 2 ? el : rolavel(el);
  r?.scrollBy({ top: dy });
}

function focar(el: HTMLElement) {
  el.focus();
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** O botão principal da janela (o de rubi), senão o mais alto e à esquerda. */
function primeiro(alvos: HTMLElement[]) {
  const rubi = alvos.find((a) => a.classList.contains('rubi') && !a.classList.contains('voltar'));
  if (rubi) return rubi;
  return [...alvos].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  })[0];
}

/**
 * O próximo alvo na direção da seta, como nos consoles: primeiro a fileira mais próxima naquela direção, e
 * nela o alvo mais alinhado com o atual.
 */
function maisPerto(de: HTMLElement, alvos: HTMLElement[], seta: Seta) {
  const [vx, vy] = VETOR[seta];
  const o = de.getBoundingClientRect();
  const ox = o.left + o.width / 2;
  const oy = o.top + o.height / 2;
  const medidos = alvos
    .filter((a) => a !== de && !de.contains(a))
    .map((a) => {
      const r = a.getBoundingClientRect();
      // quanto o alvo começa adiante da borda do atual, no sentido da seta
      const frente = vx ? (vx > 0 ? r.left - o.right : o.left - r.right) : vy > 0 ? r.top - o.bottom : o.top - r.bottom;
      // desalinhamento no outro eixo: 0 se as faixas se sobrepõem, mais a distância entre os centros
      const lado = vx ? Math.max(0, r.top - o.bottom, o.top - r.bottom) : Math.max(0, r.left - o.right, o.left - r.right);
      const centro = vx ? Math.abs(r.top + r.height / 2 - oy) : Math.abs(r.left + r.width / 2 - ox);
      return { a, frente, nota: lado * 2 + centro };
    })
    .filter((m) => m.frente > -4);
  if (!medidos.length) return null;
  const fileira = Math.min(...medidos.map((m) => m.frente)) + 12;
  return medidos.filter((m) => m.frente <= fileira).sort((x, y) => x.nota - y.nota)[0].a;
}
