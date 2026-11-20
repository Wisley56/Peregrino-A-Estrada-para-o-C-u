/**
 * Modo desenvolvedor: painel (F9), overlay de depuração (F3) e atalhos de teste.
 *
 * Só existe com `npm run dev`. O `main.ts` importa este módulo dentro de `if (import.meta.env.DEV)`, e o Vite troca
 * essa condição por `false` no build: o painel inteiro some do jogo publicado (o `npm run build` confere isso).
 *
 * Proteção do save: a primeira ação do painel liga `Estado.semSalvar`. Daí em diante nada vai para o espaço de
 * jogo até alguém liberar de propósito (botão no selo "DEV"). Para testar do zero sem tocar em nenhum save, use a
 * sessão de teste: `?teste` (ou `?teste=palacio`, `?teste=cripta`...) na URL, ou o botão no painel.
 */
import * as THREE from 'three';
import type { Jogo } from '../Jogo';
import { DONS, type IdDom } from '../core/Dons';
import { CHEFOES } from '../core/Estado';
import { AREAS, type IdArea } from '../mundo/Area';
import type { ChefeDev, GanchosDev, OpcoesDev } from './tipos';
import { ETAPAS, aplicarEtapa } from './Progresso';

const CHAVE = 'peregrino.dev';
type Aba = 'ir' | 'chefoes' | 'peregrino' | 'progresso' | 'tempo';
const ABAS: [Aba, string][] = [['ir', 'Ir'], ['chefoes', 'Chefões'], ['peregrino', 'Peregrino'], ['progresso', 'Progresso'], ['tempo', 'Tempo']];
const ESCALAS = [0, 0.1, 0.25, 0.5, 1, 2, 4];
const VELOCIDADES = [1, 1.5, 2, 3];

interface Lembrado {
  invencivel: boolean;
  energiaInfinita: boolean;
  velocidade: number;
  aba: Aba;
  overlay: boolean;
}

function lembrar(): Lembrado {
  const padrao: Lembrado = { invencivel: false, energiaInfinita: false, velocidade: 1, aba: 'ir', overlay: false };
  try {
    return { ...padrao, ...(JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Lembrado>) };
  } catch {
    return padrao;
  }
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (v: THREE.Vector3) => `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;

/** Todas as flags que o código e os diálogos usam, lidas do próprio fonte (só no modo dev). */
async function flagsConhecidas(): Promise<string[]> {
  const fontes = import.meta.glob(['/src/**/*.ts', '/src/**/*.ink', '!/src/dev/**'], { query: '?raw', import: 'default' });
  const achadas = new Set<string>();
  const re = /(?:marcar|primeiraVez|primeira|tem|atoDePiedade|flags\.(?:has|add|delete))\(\s*['"`]([a-z][a-z0-9_]*)['"`]/g;
  for (const carregar of Object.values(fontes)) {
    const texto = (await carregar()) as string;
    for (const m of texto.matchAll(re)) achadas.add(m[1]);
  }
  return [...achadas].sort();
}

export function instalarDev(jogo: Jogo) {
  const g = jogo.ganchosDev();
  const lemb = lembrar();
  const op: OpcoesDev = { painelAberto: false, invencivel: lemb.invencivel, energiaInfinita: lemb.energiaInfinita, velocidade: lemb.velocidade, escalaTempo: 1, passos: 0 };
  jogo.dev = op;
  const painel = new PainelDev(g, op, lemb);
  (window as unknown as { dev: unknown }).dev = { g, op, painel, etapa: (id: string) => painel.etapa(id) };

  const teste = new URLSearchParams(location.search).get('teste');
  if (teste !== null) {
    document.getElementById('inicio')!.style.display = 'none';
    g.iniciarTeste(AREAS.includes(teste as IdArea) ? (teste as IdArea) : undefined);
    painel.selo();
  }
  console.info('%c[dev] modo desenvolvedor: F9 painel · F3 depuração · F6 ir para a mira · F7 congelar · F8 um quadro', 'color:#c9a24a');
}

class PainelDev {
  private raiz = document.createElement('div');
  private overlay = document.createElement('pre');
  private seloEl = document.createElement('div');
  private conteudo!: HTMLElement;
  private flags: string[] | null = null;
  private filtro = '';
  private ultimaRenderizacao = '';
  /** Botão do mouse apertado no painel: não redesenhar agora, senão o clique se perde. */
  private apertando = false;

  constructor(private g: GanchosDev, private op: OpcoesDev, private lemb: Lembrado) {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    this.raiz.id = 'dev-painel';
    this.raiz.innerHTML = `
      <header><b>Peregrino · DEV</b><button data-acao="fechar" title="Fechar (F9)">✕</button></header>
      <nav>${ABAS.map(([id, nome]) => `<button data-aba="${id}">${nome}</button>`).join('')}</nav>
      <main></main>
      <footer>F9 painel · F3 depuração · F6 ir para a mira · F7 congelar · F8 um quadro</footer>`;
    this.conteudo = this.raiz.querySelector('main')!;
    this.overlay.id = 'dev-overlay';
    this.seloEl.id = 'dev-selo';
    document.body.append(this.raiz, this.overlay, this.seloEl);
    this.raiz.addEventListener('click', (e) => this.clique(e));
    this.raiz.addEventListener('pointerdown', () => (this.apertando = true));
    addEventListener('pointerup', () => (this.apertando = false));
    this.raiz.addEventListener('input', (e) => this.entrada(e));
    this.raiz.addEventListener('change', (e) => this.entrada(e));
    this.seloEl.addEventListener('click', (e) => this.clique(e));
    addEventListener('keydown', (e) => this.tecla(e), true);
    this.mostrarOverlay(lemb.overlay);
    this.selo();
    // o pós-processamento renderiza em várias passadas: soma as do quadro em vez de mostrar só a última
    g.renderer.info.autoReset = false;
    const laco = () => {
      if (this.lemb.overlay) this.atualizarOverlay();
      g.renderer.info.reset();
      requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
    setInterval(() => this.op.painelAberto && this.renderizar(), 300);
  }

  // ───────────── abrir, fechar, teclas ─────────────

  private tecla(e: KeyboardEvent) {
    const atalho = ['F9', 'F3', 'F6', 'F7', 'F8'].includes(e.code);
    if (!atalho && !(e.code === 'Escape' && this.op.painelAberto)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.code === 'F9') this.alternar();
    else if (e.code === 'Escape') this.alternar(false);
    else if (e.code === 'F3') this.mostrarOverlay(!this.lemb.overlay);
    else if (e.code === 'F6') this.acao(() => this.irParaMira());
    else if (e.code === 'F7') this.acao(() => (this.op.escalaTempo = this.op.escalaTempo === 0 ? 1 : 0));
    else if (e.code === 'F8') this.acao(() => {
      this.op.escalaTempo = 0;
      this.op.passos++;
    });
    this.renderizar(true);
  }

  private alternar(abrir = !this.op.painelAberto) {
    this.op.painelAberto = abrir;
    this.raiz.classList.toggle('aberto', abrir);
    if (abrir) {
      document.exitPointerLock?.();
      this.renderizar(true);
    }
  }

  private mostrarOverlay(sim: boolean) {
    this.lemb.overlay = sim;
    this.overlay.style.display = sim ? '' : 'none';
    this.guardar();
  }

  private guardar() {
    const { invencivel, energiaInfinita, velocidade } = this.op;
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ ...this.lemb, invencivel, energiaInfinita, velocidade }));
    } catch {
      /* sem armazenamento */
    }
  }

  /** Toda ação do painel passa por aqui: a partir dela, o progresso de um espaço de jogo não é mais salvo. */
  private acao(f: () => void) {
    const e = this.g.estado;
    if (e.slot !== null && !e.semSalvar) {
      e.semSalvar = true;
      console.warn(`[dev] salvamento travado no espaço ${e.slot}: o teste não altera o save. Libere pelo selo DEV.`);
    }
    f();
    this.selo();
    this.guardar();
  }

  /** Selo no canto: lembra que é o modo dev e se o progresso está sendo salvo. */
  selo() {
    const e = this.g.estado;
    const estado = e.slot === null ? 'sessão de teste · nada é salvo' : e.semSalvar ? `espaço ${e.slot} · salvamento travado` : `espaço ${e.slot} · salvando`;
    const botao = e.slot !== null && e.semSalvar ? ' <button data-acao="liberar">liberar</button>' : '';
    const congelado = this.op.escalaTempo !== 1 ? ` · tempo ×${this.op.escalaTempo}` : '';
    this.seloEl.innerHTML = `<b>DEV</b> ${estado}${congelado}${botao}`;
    this.seloEl.classList.toggle('alerta', e.slot !== null && !e.semSalvar);
  }

  // ───────────── cliques e campos ─────────────

  private clique(ev: Event) {
    const alvo = (ev.target as HTMLElement).closest<HTMLElement>('[data-acao],[data-aba]');
    if (!alvo) return;
    if (alvo.dataset.aba) {
      this.lemb.aba = alvo.dataset.aba as Aba;
      this.guardar();
      return this.renderizar(true);
    }
    const d = alvo.dataset;
    const g = this.g;
    switch (d.acao) {
      case 'fechar':
        return this.alternar(false);
      case 'liberar':
        if (confirm(`Voltar a salvar no espaço ${g.estado.slot}? O que foi feito no painel (flags, vitórias, teleportes) entra no save.`)) {
          g.estado.semSalvar = false;
          g.estado.salvar();
        }
        return this.selo();
      case 'ir': {
        const a = g.areas().find((x) => x.id === d.area)!;
        const p = a.pontos[Number(d.ponto)];
        return this.acao(() => g.irPara(a.id, p.pos, p.rumo));
      }
      case 'mira':
        return this.acao(() => this.irParaMira());
      case 'copiar': {
        const p = g.peregrino.pos;
        void navigator.clipboard?.writeText(`new THREE.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
        return;
      }
      case 'teste':
        if (!confirm('Começar uma sessão de teste? O jogo atual sai da tela (o que já estava salvo continua salvo).')) return;
        this.g.iniciarTeste(d.area as IdArea | undefined);
        return this.selo();
      case 'chefe': {
        const c = this.chefe(d.id!);
        return this.acao(() => {
          if (d.op === 'lutar') c.lutar();
          else if (d.op === 'reiniciar') c.reiniciar();
          else if (d.op === 'fase2') c.fase2();
          else if (d.op === 'vencer') c.vencer();
        });
      }
      case 'sombras':
        return this.acao(() => {
          for (const s of g.sombrasDaArea()) if (!CHEFOES.includes(s.id)) g.vencerSombra(s);
        });
      case 'curar':
        return this.acao(() => g.curar());
      case 'gracas':
        return this.acao(() => (g.estado.gracas += 10));
      case 'dialogo':
        return this.acao(() => g.pularDialogo());
      case 'dom':
        return this.acao(() => this.definirDom(d.dom as IdDom, Number(d.nivel)));
      case 'etapa':
        return this.etapa(d.etapa!);
      case 'flag':
        return this.acao(() => {
          const f = d.flag!;
          if (g.estado.flags.has(f)) g.estado.flags.delete(f);
          else g.estado.flags.add(f);
          g.recarregarProgresso();
        });
      case 'vencida':
        return this.acao(() => {
          g.estado.sombrasVencidas.delete(d.id!);
          g.recarregarProgresso();
        });
      case 'escala':
        return this.acao(() => (this.op.escalaTempo = Number(d.valor)));
      case 'passo':
        return this.acao(() => {
          this.op.escalaTempo = 0;
          this.op.passos += Number(d.n);
        });
    }
  }

  private entrada(ev: Event) {
    const el = ev.target as HTMLInputElement | HTMLSelectElement;
    const g = this.g;
    switch (el.dataset.campo) {
      case 'invencivel':
        return this.acao(() => (this.op.invencivel = (el as HTMLInputElement).checked));
      case 'energia':
        return this.acao(() => (this.op.energiaInfinita = (el as HTMLInputElement).checked));
      case 'velocidade':
        return this.acao(() => (this.op.velocidade = Number(el.value)));
      case 'cor':
        if (ev.type === 'change') this.acao(() => (g.estado.cor = Number(el.value)));
        return;
      case 'filtro':
        this.filtro = el.value.trim().toLowerCase();
        return this.renderizar(true);
      case 'nova-flag':
        if (ev.type !== 'change' || !el.value.trim()) return;
        this.acao(() => {
          g.estado.flags.add(el.value.trim());
          g.recarregarProgresso();
        });
        el.value = '';
        return this.renderizar(true);
    }
  }

  // ───────────── operações ─────────────

  private chefe(id: string): ChefeDev {
    return this.g.chefes().find((c) => c.id === id)!;
  }

  /** Teleporta para o ponto sob a mira (no chão), sem sair da área. */
  private irParaMira() {
    const i = this.g.info();
    const p = this.g.peregrino.pos;
    const destino = i.mira.clone();
    // não cai dentro do que está mirado: para 1 m antes, na direção de quem olha
    destino.sub(new THREE.Vector3().subVectors(destino, p).setY(0).normalize());
    this.g.irPara(i.area, destino, this.g.peregrino.rumo);
  }

  private definirDom(id: IdDom, nivel: number) {
    const e = this.g.estado;
    if (nivel <= 0 && id !== 'temor') e.flags.delete(`dom_${id}`);
    else {
      if (id !== 'temor') e.flags.add(`dom_${id}`);
      e.dons[id] = Math.max(1, nivel);
    }
  }

  /** Aplica uma etapa de progresso e leva o peregrino para onde ela começa. */
  etapa(id: string) {
    this.acao(() => {
      const etapa = aplicarEtapa(this.g.estado, id);
      this.g.recarregarProgresso();
      const area = this.g.areas().find((a) => a.id === etapa.area)!;
      const p = area.pontos[etapa.ponto] ?? area.pontos[0];
      this.g.irPara(area.id, p.pos, p.rumo);
    });
    this.renderizar(true);
  }

  // ───────────── desenho ─────────────

  private renderizar(forcar = false) {
    if (!this.op.painelAberto) return;
    for (const b of this.raiz.querySelectorAll<HTMLElement>('nav button')) b.classList.toggle('on', b.dataset.aba === this.lemb.aba);
    const html = this.html();
    if (!forcar && (html === this.ultimaRenderizacao || this.apertando)) return;
    // não redesenha por cima de um campo em uso (perderia o foco e o que está sendo digitado)
    const ativo = document.activeElement as HTMLElement | null;
    if (!forcar && ativo && this.conteudo.contains(ativo) && ativo.matches('input,select')) return;
    const foco = ativo && this.conteudo.contains(ativo) ? ativo.dataset.campo : undefined;
    this.ultimaRenderizacao = html;
    this.conteudo.innerHTML = html;
    if (foco) {
      const el = this.conteudo.querySelector<HTMLInputElement>(`[data-campo="${foco}"]`);
      el?.focus();
      if (el && 'setSelectionRange' in el && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  private html(): string {
    switch (this.lemb.aba) {
      case 'ir':
        return this.htmlIr();
      case 'chefoes':
        return this.htmlChefoes();
      case 'peregrino':
        return this.htmlPeregrino();
      case 'progresso':
        return this.htmlProgresso();
      case 'tempo':
        return this.htmlTempo();
    }
  }

  private htmlIr() {
    const g = this.g;
    const atual = g.info().area;
    const areas = g.areas().map((a) => `
      <section class="${a.id === atual ? 'atual' : ''}"><h3>${esc(a.nome)}</h3><div class="chips">${a.pontos
        .map((p, i) => `<button data-acao="ir" data-area="${a.id}" data-ponto="${i}">${esc(p.nome)}</button>`)
        .join('')}</div></section>`).join('');
    return `
      <section><div class="linha"><span>Posição <code>${fmt(g.peregrino.pos)}</code></span><button data-acao="copiar" title="Copia como THREE.Vector3">copiar</button></div>
      <div class="chips"><button data-acao="mira">Ir para a mira (F6)</button><button data-acao="dialogo">Pular diálogo</button></div></section>
      ${areas}
      <section><h3>Sessão de teste (nada é salvo)</h3><div class="chips">${g
        .areas().map((a) => `<button data-acao="teste" data-area="${a.id}">${esc(a.nome)}</button>`).join('')}</div>
      <small>Também pela URL: <code>?teste</code> ou <code>?teste=palacio</code>.</small></section>`;
  }

  private htmlChefoes() {
    return this.g.chefes().map((c) => {
      const s = c.entidade();
      const vida = s ? `${s.vida.toFixed(1)} / ${s.vidaMax}` : '—';
      const situacao = c.vencido() ? 'vencido' : c.lutando() ? `lutando · ${s?.estado ?? ''}` : s ? `aguardando · ${s.estado}` : 'fora de cena';
      const pct = s ? Math.max(0, s.vida / s.vidaMax) * 100 : 0;
      return `<section><h3>${esc(c.nome)}</h3>
        <div class="barra"><i style="width:${pct.toFixed(0)}%"></i></div>
        <div class="linha"><span>${vida}</span><span class="${c.lutando() ? 'quente' : ''}">${situacao}</span></div>
        <div class="chips">
          <button data-acao="chefe" data-id="${c.id}" data-op="lutar" class="forte">Lutar agora</button>
          <button data-acao="chefe" data-id="${c.id}" data-op="reiniciar" ${c.lutando() ? '' : 'disabled'}>Reiniciar luta</button>
          <button data-acao="chefe" data-id="${c.id}" data-op="fase2" ${c.lutando() ? '' : 'disabled'}>Fase 2</button>
          <button data-acao="chefe" data-id="${c.id}" data-op="vencer" ${s?.ativa ? '' : 'disabled'}>Vencer</button>
        </div></section>`;
    }).join('') + `<section><h3>Sombras comuns</h3><div class="chips"><button data-acao="sombras">Vencer as sombras desta área (${
      this.g.sombrasDaArea().filter((s) => !CHEFOES.includes(s.id)).length
    })</button></div></section>`;
  }

  private htmlPeregrino() {
    const e = this.g.estado;
    const i = this.g.info();
    const dons = DONS.map((d) => {
      const n = e.nivel(d.id);
      // dom ainda não feito no jogo (sem níveis): aparece selado, como na tela de dons
      if (!d.niveis.length) return `<div class="linha dom"><span style="color:${d.cor}">${esc(d.nome)}</span><small>selado (ainda não existe no jogo)</small></div>`;
      return `<div class="linha dom"><span style="color:${d.cor}">${esc(d.nome)}</span><span class="niveis">${[0, 1, 2, 3, 4, 5]
        .map((k) => `<button data-acao="dom" data-dom="${d.id}" data-nivel="${k}" class="${k === n ? 'on' : ''}" ${d.id === 'temor' && k === 0 ? 'disabled' : ''}>${k}</button>`)
        .join('')}</span></div>`;
    }).join('');
    return `
      <section><h3>Trapaças</h3>
        <label><input type="checkbox" data-campo="invencivel" ${this.op.invencivel ? 'checked' : ''}> Invencível</label>
        <label><input type="checkbox" data-campo="energia" ${this.op.energiaInfinita ? 'checked' : ''}> Energia infinita</label>
        <label>Velocidade <select data-campo="velocidade">${VELOCIDADES.map((v) => `<option value="${v}" ${v === this.op.velocidade ? 'selected' : ''}>×${v}</option>`).join('')}</select></label>
        <div class="chips"><button data-acao="curar">Curar tudo</button><button data-acao="gracas">+10 graças</button></div>
      </section>
      <section><h3>Agora</h3>
        <div class="linha"><span>Corações</span><code>${e.coracoes} / ${e.coracoesMax}</code></div>
        <div class="linha"><span>Energia</span><code>${e.energia.toFixed(0)} / ${e.energiaMax}</code></div>
        <div class="linha"><span>Graças</span><code>${e.gracas} (${e.gracasLivres} livres)</code></div>
        <div class="linha"><span>Peso · torpor</span><code>${i.peso} · ${i.torpor.toFixed(1)}</code></div>
      </section>
      <section><h3>Dons (nível)</h3>${dons}</section>`;
  }

  private htmlProgresso() {
    const e = this.g.estado;
    if (!this.flags) {
      this.flags = [];
      void flagsConhecidas().then((f) => {
        this.flags = f;
        this.renderizar(true);
      });
    }
    const todas = [...new Set([...this.flags, ...e.flags])].sort();
    const visiveis = todas.filter((f) => !this.filtro || f.includes(this.filtro));
    const etapas = ETAPAS.map((x) => `<button data-acao="etapa" data-etapa="${x.id}">${esc(x.nome)}</button>`).join('');
    const vencidas = [...e.sombrasVencidas].sort().map((id) => `<button data-acao="vencida" data-id="${id}" title="Reviver">${id} ✕</button>`).join('');
    return `
      <section><h3>Ir para a etapa</h3><div class="chips col">${etapas}</div>
        <small>Começa a etapa do zero (mantém o peregrino e os dons) e leva você para onde ela começa.</small></section>
      <section><h3>Cor do Vale</h3><input type="range" min="0" max="1" step="0.05" value="${e.cor}" data-campo="cor"> <code>${e.cor.toFixed(2)}</code></section>
      <section><h3>Flags (${e.flags.size} ligadas)</h3>
        <input type="text" placeholder="filtrar…" value="${esc(this.filtro)}" data-campo="filtro">
        <div class="flags">${visiveis.map((f) => `<button data-acao="flag" data-flag="${f}" class="${e.flags.has(f) ? 'on' : ''}">${f}</button>`).join('')}</div>
        <input type="text" placeholder="nova flag + Enter" data-campo="nova-flag" list="dev-flags">
        <datalist id="dev-flags">${todas.map((f) => `<option value="${f}">`).join('')}</datalist>
      </section>
      <section><h3>Sombras vencidas (clique para reviver)</h3><div class="flags">${vencidas || '<small>nenhuma</small>'}</div></section>`;
  }

  private htmlTempo() {
    const op = this.op;
    return `
      <section><h3>Escala do tempo</h3><div class="chips">${ESCALAS.map(
        (v) => `<button data-acao="escala" data-valor="${v}" class="${v === op.escalaTempo ? 'on' : ''}">${v === 0 ? 'parado' : `×${v}`}</button>`,
      ).join('')}</div>
      <small>Parado, a câmera continua livre. F7 congela e solta; F8 avança um quadro.</small></section>
      <section><h3>Avançar</h3><div class="chips">
        <button data-acao="passo" data-n="1">1 quadro</button><button data-acao="passo" data-n="10">10 quadros</button><button data-acao="passo" data-n="60">1 segundo</button>
      </div></section>`;
  }

  private atualizarOverlay() {
    const g = this.g;
    const i = g.info();
    const p = g.peregrino.pos;
    const r = g.renderer.info.render;
    const m = g.renderer.info.memory;
    this.overlay.textContent = [
      `${i.qps.toFixed(0)} qps · ${r.calls} draw calls · ${(r.triangles / 1000).toFixed(0)}k triângulos por quadro · ${m.geometries} geometrias · ${m.textures} texturas`,
      `área ${i.area} · pos ${fmt(p)} · rumo ${g.peregrino.rumo.toFixed(2)}`,
      `câmera guinada ${i.guinada.toFixed(2)} · arfagem ${i.arfagem.toFixed(2)} · mira ${fmt(i.mira)}`,
      `ação ${g.peregrino.acao} · chão ${g.peregrino.noChao ? 'sim' : 'não'} · travado ${i.travado ?? '—'}`,
      `chefe ${i.chefe ?? '—'}`,
      ...(i.mundo ? [i.mundo] : []),
      `tempo ×${this.op.escalaTempo}${this.op.invencivel ? ' · invencível' : ''}${this.op.energiaInfinita ? ' · energia ∞' : ''}${this.op.velocidade !== 1 ? ` · vel ×${this.op.velocidade}` : ''}`,
    ].join('\n');
  }
}

const CSS = `
#dev-painel{position:fixed;top:0;right:0;bottom:0;width:min(380px,100vw);z-index:9000;display:flex;flex-direction:column;
  background:rgba(14,12,18,.94);color:#e8e2d4;font:12px/1.4 ui-monospace,Consolas,monospace;border-left:1px solid #c9a24a55;
  transform:translateX(105%);transition:transform .18s ease;box-shadow:-8px 0 24px #0008}
#dev-painel.aberto{transform:none}
#dev-painel header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #ffffff14;color:#c9a24a}
#dev-painel nav{display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid #ffffff14;flex-wrap:wrap}
#dev-painel main{flex:1;overflow:auto;padding:4px 12px 12px}
#dev-painel footer{padding:6px 12px;border-top:1px solid #ffffff14;color:#8a8478;font-size:11px}
#dev-painel section{padding:8px 0;border-bottom:1px solid #ffffff10}
#dev-painel section.atual h3{color:#c9a24a}
#dev-painel h3{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#a49c8c}
#dev-painel button{font:inherit;color:#e8e2d4;background:#ffffff10;border:1px solid #ffffff22;border-radius:4px;padding:3px 7px;cursor:pointer}
#dev-painel button:hover:not(:disabled){background:#c9a24a33;border-color:#c9a24a88}
#dev-painel button:disabled{opacity:.35;cursor:default}
#dev-painel button.on{background:#c9a24a;color:#1a1408;border-color:#c9a24a}
#dev-painel button.forte{border-color:#c9a24a88}
#dev-painel .chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
#dev-painel .chips.col{flex-direction:column;align-items:stretch}
#dev-painel .linha{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0}
#dev-painel .niveis{display:flex;gap:2px}
#dev-painel .niveis button{padding:1px 6px}
#dev-painel .flags{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;max-height:240px;overflow:auto}
#dev-painel .flags button{font-size:11px;padding:1px 5px}
#dev-painel label{display:flex;align-items:center;gap:6px;margin:4px 0}
#dev-painel input[type=text],#dev-painel select{font:inherit;color:inherit;background:#0006;border:1px solid #ffffff22;border-radius:4px;padding:3px 6px;width:100%;box-sizing:border-box}
#dev-painel select{width:auto}
#dev-painel input[type=range]{width:70%;vertical-align:middle}
#dev-painel code{color:#d8c79a}
#dev-painel small{color:#8a8478;display:block;margin-top:4px}
#dev-painel .barra{height:5px;background:#ffffff14;border-radius:3px;overflow:hidden;margin:4px 0}
#dev-painel .barra i{display:block;height:100%;background:#c9a24a}
#dev-painel .quente{color:#ff9a6a}
#dev-overlay{position:fixed;left:10px;bottom:10px;z-index:8999;margin:0;padding:6px 8px;pointer-events:none;
  font:11px/1.45 ui-monospace,Consolas,monospace;color:#e8e2d4;background:rgba(10,8,14,.72);border-radius:4px;white-space:pre}
#dev-selo{position:fixed;right:10px;bottom:10px;z-index:8998;padding:3px 8px;border-radius:4px;
  font:11px ui-monospace,Consolas,monospace;color:#e8e2d4;background:rgba(10,8,14,.72);border:1px solid #c9a24a66}
#dev-selo b{color:#c9a24a}
#dev-selo.alerta{border-color:#ff9a6a}
#dev-selo button{font:inherit;margin-left:6px;color:#1a1408;background:#c9a24a;border:0;border-radius:3px;padding:1px 6px;cursor:pointer}
#dev-painel.aberto ~ #dev-selo{right:min(390px,100vw)}
`;
