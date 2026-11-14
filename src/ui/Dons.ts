import { CUSTO_NIVEL, DONS, Dom, IdDom, domPorId } from '../core/Dons';
import type { Estado } from '../core/Estado';
import { ICONES, POMBA } from './IconesDons';

export interface AcoesDons {
  fechar(): void;
  /** Um dom subiu de nível (som e luz ficam por conta do jogo). */
  fortaleceu(id: IdDom, nivel: number): void;
}

// ── geometria da rosácea (unidades do viewBox, centro em 0,0) ──
const N = DONS.length;
const LARGURA = 360 / N;
const R_CENTRO = 72;
const R_NOS = [104, 146, 188, 230, 272];
const RAIO_NO = 19;
const R_EMBLEMA = 340;
const RAIO_EMBLEMA = 44;
/** Anéis de chumbo entre os nós: separam os vidros de cada pétala. */
const R_ANEIS = R_NOS.map((r) => r + 21);
const R_ARO = 392;
const R_NOME = 428;
const ROMANOS = ['I', 'II', 'III', 'IV', 'V'];

const rad = (g: number) => (g * Math.PI) / 180;
const pol = (r: number, g: number): [number, number] => [r * Math.cos(rad(g)), r * Math.sin(rad(g))];
const f = (n: number) => n.toFixed(1);
/** Ângulo do meio da pétala do dom `i` (o primeiro fica no alto). */
const anguloDe = (i: number) => -90 + i * LARGURA;

/** Fatia de anel entre os raios r0 e r1, de g0 a g1 graus. */
function fatia(r0: number, r1: number, g0: number, g1: number) {
  const [a, b] = pol(r1, g0), [c, d] = pol(r1, g1), [e, h] = pol(r0, g1), [k, l] = pol(r0, g0);
  return `M${f(a)} ${f(b)} A${r1} ${r1} 0 0 1 ${f(c)} ${f(d)} L${f(e)} ${f(h)} A${r0} ${r0} 0 0 0 ${f(k)} ${f(l)} Z`;
}

/**
 * A árvore dos sete dons (G, ou pelo menu de pausa), como a rosácea de uma catedral: a pomba do Espírito Santo
 * no centro, uma pétala de vitral por dom (Is 11,2) com 5 nós de vidro e o medalhão do dom na borda.
 * A luz só atravessa o vidro dos dons já recebidos; as graças acendem os nós.
 */
export class TelaDons {
  private raiz: HTMLElement;
  private rosa: HTMLElement;
  private detalhe: HTMLElement;
  private saldo: HTMLElement;
  private sel: IdDom = 'temor';
  aberta = false;

  constructor(private estado: Estado, private acoes: AcoesDons) {
    this.raiz = document.createElement('section');
    this.raiz.id = 'dons';
    this.raiz.innerHTML = `
      <div class="palco">
        <header><h2>Os Sete Dons</h2><p>"Sobre ele repousará o Espírito do Senhor" (Is 11,2)</p></header>
        <div class="corpo"><div class="rosa"></div><aside class="detalhe"></aside></div>
        <footer><p class="saldo"></p><p class="rodape" data-controle="← → escolhe o dom · {A} fortalece · {B} ou {VOLTAR} para voltar">← → escolhe o dom · Enter fortalece · G ou Esc para voltar</p></footer>
        <button type="button" class="fechar" data-a="voltar" aria-label="Voltar">✕</button>
      </div>`;
    document.body.appendChild(this.raiz);
    this.rosa = this.raiz.querySelector('.rosa')!;
    this.detalhe = this.raiz.querySelector('.detalhe')!;
    this.saldo = this.raiz.querySelector('.saldo')!;
    this.raiz.addEventListener('click', (e) => {
      const alvo = e.target as Element;
      if (alvo.closest('[data-a="fortalecer"]')) return this.fortalecer();
      if (alvo.closest('[data-a="voltar"]')) return this.acoes.fechar();
      const dom = alvo.closest('[data-dom]')?.getAttribute('data-dom') as IdDom | undefined;
      if (dom && dom !== this.sel) {
        this.sel = dom;
        this.desenhar();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.aberta) return;
      const i = DONS.findIndex((d) => d.id === this.sel);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.sel = DONS[(i + N - 1) % N].id;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.sel = DONS[(i + 1) % N].id;
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        return this.fortalecer();
      } else return;
      e.preventDefault();
      this.desenhar();
    });
  }

  abrir() {
    this.aberta = true;
    // começa no dom que pode ser fortalecido agora; senão, no último escolhido (se recebido) ou no Temor de Deus
    const pode = DONS.find((d) => {
      const c = this.proximoCusto(d.id);
      return c !== null && c <= this.estado.gracasLivres;
    });
    this.sel = pode?.id ?? (this.estado.nivel(this.sel) > 0 ? this.sel : 'temor');
    this.desenhar();
    this.raiz.classList.add('aberto');
  }

  fechar() {
    this.aberta = false;
    this.raiz.classList.remove('aberto');
    (document.activeElement as HTMLElement | null)?.blur();
  }

  /** Custo do próximo nível, ou null se o dom não foi recebido, está completo ou ainda não existe no jogo. */
  private proximoCusto(id: IdDom) {
    const n = this.estado.nivel(id);
    if (n < 1 || n >= 5 || !domPorId(id).niveis.length || this.estado.travado(id)) return null;
    return CUSTO_NIVEL[n + 1];
  }

  private fortalecer() {
    if (!this.estado.fortalecer(this.sel)) return;
    const n = this.estado.nivel(this.sel);
    this.acoes.fortaleceu(this.sel, n);
    this.desenhar(n);
  }

  // ───────────────────────────── desenho ─────────────────────────────

  /** `acendeu`: nível que acabou de acender no dom escolhido (anima a gema). */
  private desenhar(acendeu = 0) {
    const livres = this.estado.gracasLivres;
    this.saldo.innerHTML = `<span>✦</span> <b>${livres}</b> ${livres === 1 ? 'graça para aplicar' : 'graças para aplicar'}`;
    this.rosa.innerHTML = this.svgRosa(livres, acendeu);
    this.detalhe.innerHTML = this.htmlDetalhe(domPorId(this.sel), livres);
  }

  private svgRosa(livres: number, acendeu: number) {
    const defs: string[] = [];
    const petalas: string[] = [];
    const chumbo: string[] = [];
    const ramos: string[] = [];

    DONS.forEach((d, i) => {
      const g = anguloDe(i);
      const n = this.estado.nivel(d.id);
      const sel = d.id === this.sel;
      const custo = this.proximoCusto(d.id);
      const pode = custo !== null && custo <= livres;
      const cor = d.cor;

      defs.push(`<radialGradient id="vidro-${d.id}" cx="0" cy="0" r="${R_ARO}" gradientUnits="userSpaceOnUse">
          <stop offset="0.18" stop-color="${cor}" stop-opacity="0.08"/>
          <stop offset="0.72" stop-color="${cor}" stop-opacity="${n ? 0.5 : 0.3}"/>
          <stop offset="1" stop-color="${cor}" stop-opacity="${n ? 0.28 : 0.16}"/></radialGradient>
        <radialGradient id="gema-${d.id}" cx="35%" cy="30%" r="75%">
          <stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${cor}"/>
          <stop offset="1" stop-color="${cor}" stop-opacity="0.55"/></radialGradient>`);

      // o vidro da pétala, com os painéis entre os anéis de chumbo
      // cada faixa entre anéis vira dois vidros (um de cada lado da haste), com tons um pouco diferentes
      const faixas = [R_CENTRO, ...R_ANEIS, R_ARO];
      const vidros: string[] = [];
      for (let k = 0; k < faixas.length - 1; k++)
        for (const lado of [0, 1]) {
          const tom = 0.62 + 0.38 * Math.abs(Math.sin((i + 1) * 12.9898 + k * 78.233 + lado * 37.719));
          const g0 = lado ? g : g - LARGURA / 2, g1 = lado ? g + LARGURA / 2 : g;
          vidros.push(`<path d="${fatia(faixas[k], faixas[k + 1], g0, g1)}" fill="url(#vidro-${d.id})" fill-opacity="${tom.toFixed(2)}"/>`);
        }
      petalas.push(`<g class="petala${sel ? ' sel' : ''}${n ? '' : ' selada'}" data-dom="${d.id}">${vidros.join('')}</g>`);
      // chumbo: divisória entre pétalas e um meio-traço que corta cada painel em dois vidros
      const [x0, y0] = pol(R_CENTRO, g - LARGURA / 2), [x1, y1] = pol(R_ARO, g - LARGURA / 2);
      chumbo.push(`<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" class="divisa"/>`);

      // o ramo: do centro ao medalhão, aceso até o nível atual
      const [rx0, ry0] = pol(R_CENTRO, g), [rx1, ry1] = pol(R_EMBLEMA - RAIO_EMBLEMA, g);
      const partes = [`<line class="haste" x1="${f(rx0)}" y1="${f(ry0)}" x2="${f(rx1)}" y2="${f(ry1)}"/>`];
      if (n) {
        const [lx, ly] = pol(R_NOS[n - 1], g);
        partes.push(`<line class="haste-acesa" stroke="${d.cor}" x1="${f(rx0)}" y1="${f(ry0)}" x2="${f(lx)}" y2="${f(ly)}"/>`);
        if (n === 5) partes.push(`<line class="haste-acesa" stroke="${d.cor}" x1="${f(lx)}" y1="${f(ly)}" x2="${f(rx1)}" y2="${f(ry1)}"/>`);
      }
      R_NOS.forEach((r, k) => {
        const [x, y] = pol(r, g);
        const nivel = k + 1;
        const aceso = nivel <= n;
        const classe = aceso ? 'aceso' : nivel === n + 1 && pode ? 'pode' : n ? 'futuro' : 'selado';
        const brilho = aceso ? `<circle class="halo" cx="${f(x)}" cy="${f(y)}" r="${RAIO_NO + 7}" fill="${d.cor}"/>` : '';
        const anima = sel && nivel === acendeu ? ' acendeu' : '';
        partes.push(`${brilho}<g class="no ${classe}${anima}" style="--cor:${d.cor}">
            <circle cx="${f(x)}" cy="${f(y)}" r="${RAIO_NO}" fill="${aceso ? `url(#gema-${d.id})` : '#17131d'}"/>
            <text x="${f(x)}" y="${f(y + 5.2)}">${ROMANOS[k]}</text></g>`);
      });
      // o medalhão do dom, com o ícone
      const [ex, ey] = pol(R_EMBLEMA, g);
      partes.push(`<g class="emblema${sel ? ' sel' : ''}${n ? '' : ' selado'}">
          ${n ? `<circle class="halo" cx="${f(ex)}" cy="${f(ey)}" r="${RAIO_EMBLEMA + 12}" fill="${d.cor}"/>` : ''}
          <circle cx="${f(ex)}" cy="${f(ey)}" r="${RAIO_EMBLEMA}" fill="${n ? `url(#gema-${d.id})` : '#211c28'}"/>
          <circle class="aro" cx="${f(ex)}" cy="${f(ey)}" r="${RAIO_EMBLEMA}"/>
          <g transform="translate(${f(ex - 31)} ${f(ey - 31)}) scale(0.62)" class="icone">${ICONES[d.id]}</g></g>`);
      // nome por fora do aro
      const [nx, ny] = pol(R_NOME, g);
      const ancora = Math.abs(nx) < 60 ? 'middle' : nx > 0 ? 'start' : 'end';
      const sobe = ny < -200 ? -8 : ny > 200 ? 16 : 6;
      partes.push(`<text class="nome${n ? '' : ' selado'}${sel ? ' sel' : ''}" text-anchor="${ancora}" x="${f(nx)}" y="${f(ny + sobe)}">${d.nome}</text>
        <text class="sub" text-anchor="${ancora}" x="${f(nx)}" y="${f(ny + sobe + 19)}">${n ? `${ROMANOS[n - 1]} de V` : 'selado'}</text>`);
      ramos.push(`<g class="ramo" data-dom="${d.id}">${partes.join('')}</g>`);
    });

    // anéis de chumbo, raios do centro e o aro de pedra
    const aneis = R_ANEIS.map((r) => `<circle class="anel" r="${r}"/>`).join('');
    const raios = Array.from({ length: 21 }, (_, k) => {
      const [a, b] = pol(R_CENTRO + 2, k * (360 / 21)), [c, e] = pol(R_CENTRO + 18, k * (360 / 21));
      return `<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}"/>`;
    }).join('');
    const contas = DONS.map((_, i) => {
      const [x, y] = pol(R_ARO, anguloDe(i) - LARGURA / 2);
      return `<circle cx="${f(x)}" cy="${f(y)}" r="9"/>`;
    }).join('');

    return `<svg viewBox="-520 -490 1040 990" role="img" aria-label="Rosácea dos sete dons">
      <defs>${defs.join('')}
        <filter id="desfoque" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
        <radialGradient id="ouro-centro" cx="40%" cy="35%" r="70%">
          <stop offset="0" stop-color="#fff6d2"/><stop offset="0.5" stop-color="#e7b955"/><stop offset="1" stop-color="#8a5d1c"/></radialGradient>
      </defs>
      <circle r="${R_ARO + 30}" class="aureola-rosa"/>
      <circle r="${R_ARO}" fill="#0b0912"/>
      ${petalas.join('')}
      <g class="chumbo">${aneis}${chumbo.join('')}</g>
      ${ramos.join('')}
      <circle r="${R_ARO}" class="aro-pedra"/><circle r="${R_ARO + 9}" class="aro-ouro"/>
      <g class="contas">${contas}</g>
      <g class="centro">
        <circle r="${R_CENTRO + 20}" class="halo-centro"/>
        <g class="raios">${raios}</g>
        <circle r="${R_CENTRO - 6}" fill="url(#ouro-centro)" class="medalhao"/>
        <g transform="translate(-40 -42) scale(0.8)" class="pomba">${POMBA}</g>
      </g>
    </svg>`;
  }

  private htmlDetalhe(d: Dom, livres: number) {
    const n = this.estado.nivel(d.id);
    const custo = this.proximoCusto(d.id);
    let corpo: string;
    if (!n) {
      corpo = `<p class="origem">Ainda não recebido.<br>Será dado por <b>${d.origem}</b>.</p>`;
    } else {
      const itens = d.niveis
        .map((v, i) => {
          const k = i + 1;
          const classe = k <= n ? 'feito' : k === n + 1 ? 'proximo' : '';
          const fechado = k > n && v.trava && !this.estado.flags.has(v.trava.flag);
          const preco = k === 1 ? 'recebido' : k <= n ? '✓' : fechado ? '🔒' : `${CUSTO_NIVEL[k]} ✦`;
          return `<li class="${classe}"><span class="num">${ROMANOS[i]}</span><div><b>${v.nome}</b><em>${preco}</em><p>${v.texto}</p></div></li>`;
        })
        .join('');
      const trava = this.estado.travado(d.id);
      const botao = trava
        ? `<p class="falta">🔒 ${trava.texto}</p>`
        : custo === null
        ? `<p class="completo">✦ Dom completo. Glória ao Pai, ao Filho e ao Espírito Santo.</p>`
        : `<button type="button" class="vb rubi" data-a="fortalecer" ${custo > livres ? 'disabled' : ''}>
             Fortalecer · ${custo} ${custo === 1 ? 'graça' : 'graças'}</button>
           ${custo > livres ? `<p class="falta">Faltam ${custo - livres} ✦. Vencer sombras e chefões traz novas graças.</p>` : ''}`;
      corpo = `<ol>${itens}</ol>${botao}`;
    }
    return `<div class="cabeca" style="--cor:${n ? d.cor : '#5a5468'}">
        <svg viewBox="0 0 100 100" class="${n ? '' : 'selado'}"><circle cx="50" cy="50" r="48"/><g transform="translate(14 14) scale(0.72)">${ICONES[d.id]}</g></svg>
        <div><h3>${d.nome}</h3><small>${n ? `nível ${n} de 5` : 'selado'}</small></div></div>
      <p class="essencia">${d.essencia}</p>${corpo}`;
  }
}
