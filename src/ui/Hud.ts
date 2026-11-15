import * as THREE from 'three';
import { Estado } from '../core/Estado';
import type { Palco, Passo } from '../dialogo/Dialogos';
import { retratoDe } from '../dialogo/Retratos';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

/** Interface em HTML sobre o canvas: corações, barras, dica, mira e diálogo. */
/** Letras por segundo na caixa de diálogo. */
const VELOCIDADE_TEXTO = 48;

export class Hud implements Palco {
  /** Troca as teclas citadas nos textos pelos botões do controle, quando é ele que está em uso (ui/Rotulos). */
  rotular: (texto: string) => string = (t) => t;
  private coracoes = $('#coracoes');
  private energia = $('#energia > div');
  private cor = $('#cor > div');
  private gracas = $('#gracas');
  private dica = $('#dica');
  private aviso = $('#aviso');
  private mira = $('#mira');
  /** Mira livre no centro da tela (fora do #hud, para a cruz poder inverter a cor do jogo atrás dela). */
  private retic = $('#retic');
  private reticCruz = $('#retic-cruz');
  private tempoAcerto = 0;
  private caixa = $('#dialogo');
  private caixaQuem = $('#dialogo .quem');
  private caixaRetrato = $<HTMLImageElement>('#dialogo .retrato');
  private caixaTexto = $('#dialogo .texto');
  private caixaEscolhas = $('#dialogo .escolhas');
  private caixaSeguir = $('#dialogo .seguir');
  private veu = $('#veu');

  /** A conversa em andamento: devolve a próxima fala (ou null no fim). */
  private fonte: ((escolha?: number) => Passo | null) | null = null;
  private atual: Passo | null = null;
  /** Fala à espera do fim de uma pausa (tag #pausa). */
  private pendente: Passo | null = null;
  private espera = 0;
  private letras = 0;
  private escolhaSel = 0;
  private escolhasVisiveis = false;
  private aoTerminar: (() => void) | null = null;
  private tempoAviso = 0;
  private ultimoCoracoes = -1;

  /** Uma fala apareceu na caixa (`segundos`: quanto leva para ser escrita). A câmera e os gestos seguem isso. */
  aoExibir: ((p: Passo, segundos: number) => void) | null = null;
  /** As escolhas apareceram: é a vez do peregrino. */
  aoEscolher: (() => void) | null = null;

  get dialogoAberto() {
    return this.fonte !== null;
  }

  /** Há escolhas na tela esperando o jogador. */
  get escolhendo() {
    return this.escolhasVisiveis;
  }

  atualizar(dt: number, e: Estado, cor = e.cor, rotuloCor = 'Cor do Vale') {
    if (this.rotuloCor.textContent !== rotuloCor) this.rotuloCor.textContent = rotuloCor;
    if (this.tempoSussurro > 0) {
      this.tempoSussurro -= dt;
      if (this.tempoSussurro <= 0) this.sussurroEl.classList.remove('ativa');
    }
    const chaveCoracoes = e.coracoes * 100 + e.coracoesMax * 2 + (e.comungou ? 1 : 0);
    if (this.ultimoCoracoes !== chaveCoracoes) {
      this.ultimoCoracoes = chaveCoracoes;
      // cada coração: cheio, meio (só a metade esquerda acesa) ou vazio
      // o coração da Eucaristia (o último) é dourado
      this.coracoes.innerHTML = Array.from({ length: e.coracoesMax }, (_, i) => {
        const c = i >= e.coracoesBase ? '💛' : '❤️';
        const ouro = i >= e.coracoesBase ? ' eucaristia' : '';
        const resto = e.coracoes - i;
        if (resto >= 1) return `<span class="cheio${ouro}">${c}</span>`;
        if (resto >= 0.5) return `<span class="meio${ouro}"><b>${c}</b><i>${c}</i></span>`;
        return `<span class="vazio${ouro}">${c}</span>`;
      }).join('');
    }
    this.energia.style.width = `${(e.energia / e.energiaMax) * 100}%`;
    this.cor.style.width = `${cor * 100}%`;
    const livres = e.gracasLivres;
    this.gracas.textContent = e.gracas > 0 ? this.rotular(`✦ ${livres} ${livres === 1 ? 'graça' : 'graças'} · G`) : '';

    if (this.tempoAviso > 0) {
      this.tempoAviso -= dt;
      if (this.tempoAviso <= 0) this.aviso.classList.remove('ativa');
    }

    if (this.espera > 0) {
      this.espera -= dt;
      if (this.espera <= 0 && this.pendente) {
        const p = this.pendente;
        this.pendente = null;
        this.exibir(p);
      }
    }
    if (this.atual) {
      this.letras = Math.min(this.atual.texto.length, this.letras + dt * VELOCIDADE_TEXTO);
      this.caixaTexto.textContent = this.atual.texto.slice(0, Math.floor(this.letras));
      if (this.letras >= this.atual.texto.length && this.atual.escolhas.length && !this.escolhasVisiveis) this.mostrarEscolhas();
    }
  }

  private item = $('#item');
  private dom = $('#dom');
  private peso = $('#peso');

  /** O peso do ouro da Gula (ou da pedra levada): `null` esconde. */
  mostrarPeso(texto: string | null) {
    this.peso.style.display = texto ? 'block' : 'none';
    if (texto && this.peso.textContent !== texto) this.peso.textContent = texto;
  }
  private brasa = $('#brasa');
  private brasaBarra = $('#brasa .barra > div');
  private brasaRotulo = $('#brasa .rotulo');

  /** A brasa da ira (0 a 1) na luta contra a Ira; `null` esconde. Irado: a barra pulsa em vermelho. */
  mostrarBrasa(k: number | null, irado = false) {
    this.brasa.style.display = k === null ? 'none' : 'block';
    if (k === null) return;
    this.brasaBarra.style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
    this.brasa.classList.toggle('irado', irado);
    const r = irado ? 'Irado: reze (R) para esfriar' : 'Brasa da ira';
    if (this.brasaRotulo.textContent !== r) this.brasaRotulo.textContent = r;
  }
  private rotuloCor = $('#rotulo-cor');
  private torporEl = $('#torpor');

  /** Véu cinza do torpor (0..1). */
  mostrarTorpor(k: number) {
    this.torporEl.style.opacity = String(k);
  }

  /** Fecha diálogo, avisos e dicas (ao voltar à tela inicial). */
  encerrar() {
    this.fonte = null;
    this.atual = null;
    this.pendente = null;
    this.espera = 0;
    this.aoTerminar = null;
    this.esconderEscolhas();
    this.caixa.style.display = 'none';
    this.mostrarDica(null);
    this.aviso.classList.remove('ativa');
    this.tempoAviso = 0;
    this.mostrarTorpor(0);
  }
  private sussurroEl = $('#sussurro');
  private tempoSussurro = 0;

  /** Voz de tentação (as miragens do deserto): itálico violeta, some sozinha. */
  sussurrar(texto: string, segundos = 3.8) {
    this.sussurroEl.textContent = `“${texto}”`;
    this.sussurroEl.classList.add('ativa');
    this.tempoSussurro = segundos;
  }

  /** Dom do Espírito Santo disponível (hoje só a Ciência). */
  mostrarDom(texto: string | null, ativo = false) {
    if (texto) texto = this.rotular(texto);
    this.dom.style.display = texto ? 'block' : 'none';
    if (texto && this.dom.textContent !== texto) this.dom.textContent = texto;
    this.dom.classList.toggle('ativo', ativo);
  }
  private chefe = $('#chefe');

  /** Barra do chefão no alto da tela. `null` esconde. */
  mostrarChefe(nome: string | null, fracao = 1, couraca = false, estado = '') {
    this.chefe.classList.toggle('ativa', nome !== null);
    if (nome === null) return;
    ($('#chefe .nome') as HTMLElement).textContent = nome;
    ($('#chefe .barra > div') as HTMLElement).style.width = `${Math.max(0, fracao) * 100}%`;
    ($('#chefe .estado') as HTMLElement).textContent = estado;
    this.chefe.classList.toggle('couraca', couraca);
  }

  /** Item equipado (hoje só a Lamparina da Fé). */
  mostrarItem(texto: string | null, aceso = false) {
    if (texto) texto = this.rotular(texto);
    this.item.style.display = texto ? 'block' : 'none';
    if (texto) this.item.textContent = texto;
    this.item.classList.toggle('acesa', aceso);
  }

  mostrarDica(texto: string | null) {
    if (texto) {
      this.dica.textContent = this.rotular(texto);
      this.dica.classList.add('ativa');
    } else this.dica.classList.remove('ativa');
  }

  anunciar(texto: string, segundos = 3) {
    this.aviso.textContent = this.rotular(texto);
    this.aviso.classList.add('ativa');
    this.tempoAviso = segundos;
  }

  /**
   * A mira livre. `null` esconde. `sobreAlvo`: há um inimigo sob a mira; `aoAlcance`: ele está perto o bastante
   * para o cajado (o indicador de ataque do Minecraft); `semEnergia`: a luz não sai agora.
   */
  mostrarRetic(estilo: string, e: { sobreAlvo: boolean; aoAlcance: boolean; semEnergia: boolean } | null, dt: number) {
    this.tempoAcerto = Math.max(0, this.tempoAcerto - dt);
    const ver = !!e && estilo !== 'desligada';
    const classe = ver
      ? `on ${estilo}${e!.sobreAlvo ? ' alvo' : ''}${e!.aoAlcance ? ' alcance' : ''}${e!.semEnergia ? ' fraca' : ''}${this.tempoAcerto > 0 ? ' acerto' : ''}`
      : '';
    if (this.retic.className !== classe) this.retic.className = classe;
    const cruz = ver && estilo === 'cruz' ? (e!.sobreAlvo ? 'on alvo' : 'on') + (e!.semEnergia ? ' fraca' : '') : '';
    if (this.reticCruz.className !== cruz) this.reticCruz.className = cruz;
  }

  /** O golpe ou a luz acertou: a mira pisca um X (marcador de acerto). */
  acertou() {
    this.tempoAcerto = 0.2;
  }

  posicionarMira(alvo: THREE.Vector3 | null, cam: THREE.Camera) {
    if (!alvo) {
      this.mira.style.display = 'none';
      return;
    }
    const p = alvo.clone().project(cam);
    if (p.z > 1) {
      this.mira.style.display = 'none';
      return;
    }
    this.mira.style.display = 'block';
    this.mira.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
    this.mira.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
  }

  /** Conduz uma conversa (Palco dos Dialogos): pede cada fala à fonte até ela acabar. */
  conduzir(fonte: (escolha?: number) => Passo | null, aoTerminar: () => void) {
    this.fonte = fonte;
    this.aoTerminar = aoTerminar;
    this.seguir(fonte());
  }

  /** Avança o diálogo (F / Enter / clique). Completa o texto antes de passar; com escolhas, confirma a marcada. */
  avancar() {
    if (!this.atual || this.espera > 0) return;
    if (this.letras < this.atual.texto.length) {
      this.letras = this.atual.texto.length;
      return;
    }
    if (this.atual.escolhas.length) this.escolher(this.escolhaSel);
    else this.seguir(this.fonte?.() ?? null);
  }

  /** Move a escolha marcada (setas / W S). */
  moverEscolha(d: number) {
    if (!this.escolhasVisiveis || !this.atual) return;
    const n = this.atual.escolhas.length;
    this.escolhaSel = (this.escolhaSel + d + n) % n;
    this.marcarEscolha();
  }

  /** Escolhe a opção i (tecla 1..9, clique ou confirmação). */
  escolher(i: number) {
    if (!this.atual || !this.escolhasVisiveis || i < 0 || i >= this.atual.escolhas.length) return;
    this.esconderEscolhas();
    this.seguir(this.fonte?.(i) ?? null);
  }

  private seguir(p: Passo | null) {
    if (!p) {
      this.fonte = null;
      this.atual = null;
      this.esconderEscolhas();
      this.caixa.style.display = 'none';
      const f = this.aoTerminar;
      this.aoTerminar = null;
      f?.();
      return;
    }
    if (p.pausa > 0) {
      // um respiro na conversa: a caixa fecha (o anúncio ou o efeito aparecem) e a fala vem depois
      this.atual = null;
      this.caixa.style.display = 'none';
      this.pendente = p;
      this.espera = p.pausa;
      return;
    }
    this.exibir(p);
  }

  private exibir(p: Passo) {
    this.atual = { ...p, texto: this.rotular(p.texto) };
    this.letras = 0;
    this.escolhaSel = 0;
    this.esconderEscolhas();
    const estilo = p.falante?.estilo ?? '';
    for (const c of ['espirito', 'inscricao', 'vicio']) this.caixa.classList.toggle(c, c === estilo);
    this.caixaQuem.textContent = p.falante?.nome ?? '';
    this.caixaQuem.style.display = p.falante ? '' : 'none';
    const retrato = retratoDe(p.id);
    if (retrato && this.caixaRetrato.src !== retrato) this.caixaRetrato.src = retrato;
    this.caixa.classList.toggle('com-retrato', !!retrato);
    this.caixaTexto.textContent = '';
    this.caixa.style.display = 'block';
    this.aoExibir?.(p, this.atual.texto.length / VELOCIDADE_TEXTO);
  }

  private mostrarEscolhas() {
    if (!this.atual) return;
    this.escolhasVisiveis = true;
    this.caixaEscolhas.innerHTML = this.atual.escolhas
      .map((t, i) => `<button type="button" data-i="${i}"><b>${i + 1}</b>${t.replace(/</g, '&lt;')}</button>`)
      .join('');
    this.caixaEscolhas.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.escolher(Number(b.dataset.i));
      }),
    );
    this.caixaEscolhas.style.display = '';
    this.caixaSeguir.style.display = 'none';
    this.marcarEscolha();
    this.aoEscolher?.();
  }

  private marcarEscolha() {
    this.caixaEscolhas.querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i === this.escolhaSel));
  }

  private esconderEscolhas() {
    this.escolhasVisiveis = false;
    this.caixaEscolhas.innerHTML = '';
    this.caixaEscolhas.style.display = 'none';
    this.caixaSeguir.style.display = '';
  }

  escurecer(ativo: boolean) {
    this.veu.style.opacity = ativo ? '1' : '0';
  }
}
