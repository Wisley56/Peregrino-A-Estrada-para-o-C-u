import { Estado, ResumoSave, TOTAL_SLOTS } from '../core/Estado';
import { CREDITOS } from './creditos';
import { arcoSVG, geometriaArco, medalhaoSVG, molduraPainel, ornatoBotao, rubiSVG } from './Vitral';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Textura em ruído (SVG) para dar grão ao vidro dos botões e ao pergaminho dos painéis. */
function grao(freq: number, cor: string, alfa: number, semente: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="f"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${semente}"/>
    <feColorMatrix values="0 0 0 0 ${cor}  0 0 0 0 ${cor}  0 0 0 0 ${cor}  ${alfa} 0 0 0 ${-alfa * 0.45}"/></filter><rect width="160" height="160" filter="url(#f)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const nomeArea = (r: ResumoSave) =>
  r.area === 'creta' ? 'Creta: Bons Portos' : r.area === 'navio' ? 'O Mar da Tempestade' : r.area === 'naufragio' ? 'O Naufrágio' : r.area === 'bahiabaixa' || r.area === 'bahiaalta' ? 'Ruas da Bahia' : r.area === 'palacio' ? 'Palácio da Gula' : r.area === 'cidade' ? 'Cidade Dourada' : r.area === 'meiodia' ? 'Poço do Meio-Dia' : r.area === 'deserto' ? 'Deserto das Vozes' : r.area === 'cripta' ? 'A Cripta' : r.flags.has('veu_oeste') ? 'Passagem oeste' : r.flags.has('lamparina') ? 'O Vale · com a Lamparina' : 'O Vale';

function tempoDeJogo(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
}

function quando(ms: number) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Velocidade da rolagem dos créditos (px/s) e o fator ao segurar Espaço. */
const VEL_CREDITOS = 42;
const ACELERADO = 6;

/**
 * Tela inicial: continuar o último jogo, começar um novo num espaço livre, gerenciar os jogos salvos,
 * abrir as Configurações e os créditos. Chama `aoJogar(slot)` quando o jogador escolhe um espaço.
 */
export class Menu {
  private raiz = $('#inicio');
  private arco = $('#inicio .arco');
  private continuar = $<HTMLButtonElement>('#bt-continuar');
  private novo = $<HTMLButtonElement>('#bt-novo');
  private salvos = $<HTMLButtonElement>('#bt-salvos');
  private painelAberto: HTMLElement | null = null;
  private confirmarApagar = -1;
  private larguraArco = 0;
  private alturaArco = 0;
  // rolagem dos créditos
  private fita = $('#painel-creditos .fita');
  private rolagemY = 0;
  private acelerar = false;
  private quadro = 0;

  constructor(private aoJogar: (slot: number) => void, private aoConfig: () => void) {
    document.documentElement.style.setProperty('--grao-vidro', grao(0.06, '1', 0.5, 3));
    document.documentElement.style.setProperty('--grao-papel', grao(0.5, '0.3', 0.35, 8));
    document.documentElement.style.setProperty('--moldura', molduraPainel().url);
    document.documentElement.style.setProperty('--orn-e', ornatoBotao());
    document.documentElement.style.setProperty('--orn-d', ornatoBotao(true));
    document.querySelectorAll('#inicio .janela .rubi').forEach((r) => (r.innerHTML = rubiSVG(16)));
    this.montarCreditos();
    new ResizeObserver(() => this.desenharArco()).observe(this.arco);
    this.desenharArco();

    $('#bt-config').addEventListener('click', () => {
      this.fechar();
      this.aoConfig();
    });
    $('#bt-creditos').addEventListener('click', () => this.abrirCreditos());
    this.salvos.addEventListener('click', () => this.abrirSalvos());
    this.novo.addEventListener('click', () => {
      const livre = Estado.resumos().findIndex((r) => r === null);
      if (livre >= 0) this.jogar(livre + 1);
      else this.abrirSalvos('Todos os espaços estão ocupados: apague um para começar de novo.');
    });
    this.continuar.addEventListener('click', () => {
      const n = Estado.ultimoSlot();
      if (n) this.jogar(n);
    });
    for (const p of document.querySelectorAll<HTMLElement>('#inicio .painel')) {
      p.querySelector('.fechar')!.addEventListener('click', () => this.fechar());
      p.addEventListener('click', (e) => {
        if (e.target === p) this.fechar();
      });
    }
    $('#painel-creditos').addEventListener('wheel', (e) => (this.rolagemY -= e.deltaY * 0.6), { passive: true });
    addEventListener('keydown', (e) => this.tecla(e));
    addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.key === 'ArrowDown') this.acelerar = false;
    });
  }

  /** Volta a exibir a tela inicial (ao desistir da criação do personagem). */
  mostrar() {
    this.raiz.style.display = '';
    this.pronto();
  }

  /** Mundo carregado: libera os botões e mostra o que há salvo. */
  pronto() {
    this.novo.disabled = false;
    this.atualizarBotoes();
    (this.continuar.hidden ? this.novo : this.continuar).focus();
  }

  /** Redesenha o vitral do tamanho exato do arco (o desenho não estica: o arco ogival continua redondo). */
  private desenharArco() {
    const w = Math.round(this.arco.clientWidth);
    if (!w) return;
    const g = geometriaArco(w);
    this.arco.style.setProperty('--borda', `${g.borda}px`);
    $('#inicio .cabeca').style.height = `${Math.round(g.topo)}px`;
    const h = Math.round(this.arco.offsetHeight);
    if (w === this.larguraArco && h === this.alturaArco) return;
    this.larguraArco = w;
    this.alturaArco = h;
    this.arco.querySelector(':scope > svg')?.remove();
    this.arco.insertAdjacentHTML('afterbegin', arcoSVG(w, h));
  }

  private atualizarBotoes() {
    const resumos = Estado.resumos();
    const ultimo = Estado.ultimoSlot();
    const r = ultimo ? resumos[ultimo - 1] : null;
    this.continuar.hidden = !r;
    if (r) this.continuar.querySelector('small')!.textContent = `${r.nome} · ${nomeArea(r)} · ✦ ${r.gracas}`;
    const algum = resumos.some((x) => x);
    this.novo.textContent = algum ? 'Nova peregrinação' : 'Começar a peregrinação';
    this.novo.classList.toggle('principal', !r);
    this.salvos.hidden = !algum;
  }

  private abrir(sel: string) {
    this.fechar();
    this.painelAberto = $(sel);
    this.painelAberto.classList.add('aberto');
    this.painelAberto.querySelector<HTMLElement>('button')?.focus();
  }

  private fechar() {
    this.painelAberto?.classList.remove('aberto');
    this.painelAberto = null;
    this.confirmarApagar = -1;
    this.acelerar = false;
    cancelAnimationFrame(this.quadro);
    this.atualizarBotoes();
  }

  private abrirSalvos(nota?: string) {
    this.abrir('#painel-salvos');
    const p = $('#painel-salvos .nota');
    p.textContent = nota ?? 'Cada espaço guarda um peregrino e o caminho que ele já percorreu.';
    this.desenharSlots();
  }

  private desenharSlots() {
    const grade = $('#painel-salvos .slots');
    grade.innerHTML = '';
    for (let n = 1; n <= TOTAL_SLOTS; n++) {
      const r = Estado.resumo(n);
      const c = document.createElement('div');
      c.className = 'slot' + (r ? '' : ' vazio');
      if (!r) {
        c.innerHTML = `<div class="num">Espaço ${n}</div><div class="info">Espaço livre</div>
          <div class="acoes"><button class="vb" data-jogar="${n}">Nova peregrinação</button></div>`;
      } else if (this.confirmarApagar === n) {
        c.innerHTML = `<div class="num">Espaço ${n}</div><div class="nome">${escapar(r.nome)}</div>
          <div class="info">Apagar este peregrino? Todo o caminho percorrido se perde.</div>
          <div class="acoes"><button class="vb" data-cancelar>Manter</button><button class="apagar" data-apagar-sim="${n}">Sim, apagar</button></div>`;
      } else {
        c.innerHTML = `<div class="num">Espaço ${n}</div><div class="nome">${escapar(r.nome)}</div>
          <div class="info">${nomeArea(r)}<br>✦ ${r.gracas} ${r.gracas === 1 ? 'graça' : 'graças'} · ${tempoDeJogo(r.tempo)}<br>
          <span style="opacity:.7">${quando(r.salvoEm)}</span></div>
          <div class="cor" title="Cor do Vale"><div style="width:${Math.round(r.cor * 100)}%"></div></div>
          <div class="acoes"><button class="vb" data-jogar="${n}">Continuar</button><button class="apagar" data-apagar="${n}">Apagar</button></div>`;
      }
      grade.appendChild(c);
    }
    grade.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const d = b.dataset;
        if (d.jogar) this.jogar(Number(d.jogar));
        else if (d.apagar) this.confirmarApagar = Number(d.apagar);
        else if (d.apagarSim) {
          Estado.apagar(Number(d.apagarSim));
          this.confirmarApagar = -1;
          if (!Estado.resumos().some((x) => x)) return this.fechar();
        } else if ('cancelar' in d) this.confirmarApagar = -1;
        this.desenharSlots();
        grade.querySelector<HTMLButtonElement>('button')?.focus();
      }),
    );
  }

  /** A fita dos créditos: medalhão, título e os blocos (função → nomes). */
  private montarCreditos() {
    let html = `<div class="medalhao">${medalhaoSVG(50)}</div><div class="titulo">PEREGRINO</div><div class="subtitulo">A Estrada para o Céu</div>`;
    for (const b of CREDITOS) {
      html += `<div class="bloco${b.parte ? ' parte' : ''}">`;
      if (b.funcao) html += `<div class="funcao">${escapar(b.funcao)}</div>`;
      html += b.nomes.map((n) => `<div class="nome">${escapar(n)}</div>`).join('');
      if (b.nota) html += `<div class="notaC">${escapar(b.nota)}</div>`;
      html += '</div>';
    }
    this.fita.innerHTML = html;
  }

  private abrirCreditos() {
    this.abrir('#painel-creditos');
    (document.activeElement as HTMLElement | null)?.blur(); // Espaço acelera; não pode "clicar" em Voltar
    const altura = $('#painel-creditos').clientHeight;
    this.rolagemY = altura * 0.72;
    let antes = performance.now();
    let fimEm = 0;
    const passo = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000);
      antes = agora;
      this.rolagemY -= VEL_CREDITOS * (this.acelerar ? ACELERADO : 1) * dt;
      const fim = altura * 0.42 - this.fita.offsetHeight; // a última linha para no meio da tela
      this.rolagemY = Math.min(altura, Math.max(fim, this.rolagemY));
      this.fita.style.transform = `translateY(${this.rolagemY}px)`;
      if (this.rolagemY <= fim) {
        fimEm ||= agora;
        if (agora - fimEm > 4000) return this.fechar(); // descansa na última frase e volta ao menu
      } else fimEm = 0;
      this.quadro = requestAnimationFrame(passo);
    };
    this.fita.style.transform = `translateY(${this.rolagemY}px)`;
    cancelAnimationFrame(this.quadro);
    this.quadro = requestAnimationFrame(passo);
  }

  private jogar(slot: number) {
    this.fechar();
    this.raiz.style.display = 'none';
    this.aoJogar(slot);
  }

  /** Setas navegam entre os botões visíveis; Esc fecha o painel; nos créditos, Espaço/↓ acelera. */
  private tecla(e: KeyboardEvent) {
    if (this.raiz.style.display === 'none') return;
    if (e.key === 'Escape' && this.painelAberto) {
      this.fechar();
      this.novo.focus();
      return;
    }
    if (this.painelAberto?.id === 'painel-creditos') {
      if (e.code === 'Space' || e.key === 'ArrowDown') {
        this.acelerar = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        this.rolagemY += 60;
        e.preventDefault();
      }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const escopo = this.painelAberto ?? this.raiz.querySelector('nav')!;
    const botoes = [...escopo.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.hidden && !b.disabled && b.offsetParent);
    if (!botoes.length) return;
    e.preventDefault();
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
    const prox = e.key === 'ArrowDown' ? (i + 1) % botoes.length : (i - 1 + botoes.length) % botoes.length;
    botoes[prox].focus();
  }
}
