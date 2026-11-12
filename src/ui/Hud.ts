import * as THREE from 'three';
import { Estado } from '../core/Estado';

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

export interface Fala {
  quem: 'espirito' | string;
  texto: string;
}

/** Interface em HTML sobre o canvas: corações, barras, dica, mira e diálogo. */
export class Hud {
  private coracoes = $('#coracoes');
  private energia = $('#energia > div');
  private cor = $('#cor > div');
  private gracas = $('#gracas');
  private dica = $('#dica');
  private aviso = $('#aviso');
  private mira = $('#mira');
  private caixa = $('#dialogo');
  private caixaQuem = $('#dialogo .quem');
  private caixaTexto = $('#dialogo .texto');
  private veu = $('#veu');

  private fila: Fala[] = [];
  private atual: Fala | null = null;
  private letras = 0;
  private aoTerminar: (() => void) | null = null;
  private tempoAviso = 0;
  private ultimoCoracoes = -1;

  get dialogoAberto() {
    return this.atual !== null;
  }

  atualizar(dt: number, e: Estado, cor = e.cor, rotuloCor = 'Cor do Vale') {
    if (this.rotuloCor.textContent !== rotuloCor) this.rotuloCor.textContent = rotuloCor;
    if (this.tempoSussurro > 0) {
      this.tempoSussurro -= dt;
      if (this.tempoSussurro <= 0) this.sussurroEl.classList.remove('ativa');
    }
    const chaveCoracoes = e.coracoes * 100 + e.coracoesMax;
    if (this.ultimoCoracoes !== chaveCoracoes) {
      this.ultimoCoracoes = chaveCoracoes;
      // cada coração: cheio, meio (só a metade esquerda acesa) ou vazio
      this.coracoes.innerHTML = Array.from({ length: e.coracoesMax }, (_, i) => {
        const resto = e.coracoes - i;
        if (resto >= 1) return '<span>❤️</span>';
        if (resto >= 0.5) return '<span class="meio"><b>❤️</b><i>❤️</i></span>';
        return '<span class="vazio">❤️</span>';
      }).join('');
    }
    this.energia.style.width = `${(e.energia / e.energiaMax) * 100}%`;
    this.cor.style.width = `${cor * 100}%`;
    const livres = e.gracasLivres;
    this.gracas.textContent = e.gracas > 0 ? `✦ ${livres} ${livres === 1 ? 'graça' : 'graças'} · G` : '';

    if (this.tempoAviso > 0) {
      this.tempoAviso -= dt;
      if (this.tempoAviso <= 0) this.aviso.classList.remove('ativa');
    }

    if (this.atual) {
      this.letras = Math.min(this.atual.texto.length, this.letras + dt * 48);
      this.caixaTexto.textContent = this.atual.texto.slice(0, Math.floor(this.letras));
    }
  }

  private item = $('#item');
  private dom = $('#dom');
  private rotuloCor = $('#rotulo-cor');
  private torporEl = $('#torpor');

  /** Véu cinza do torpor (0..1). */
  mostrarTorpor(k: number) {
    this.torporEl.style.opacity = String(k);
  }

  /** Fecha diálogo, avisos e dicas (ao voltar à tela inicial). */
  encerrar() {
    this.fila = [];
    this.atual = null;
    this.aoTerminar = null;
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
    this.item.style.display = texto ? 'block' : 'none';
    if (texto) this.item.textContent = texto;
    this.item.classList.toggle('acesa', aceso);
  }

  mostrarDica(texto: string | null) {
    if (texto) {
      this.dica.textContent = texto;
      this.dica.classList.add('ativa');
    } else this.dica.classList.remove('ativa');
  }

  anunciar(texto: string, segundos = 3) {
    this.aviso.textContent = texto;
    this.aviso.classList.add('ativa');
    this.tempoAviso = segundos;
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

  falar(falas: Fala[], aoTerminar?: () => void) {
    this.fila.push(...falas);
    if (aoTerminar) this.aoTerminar = aoTerminar;
    if (!this.atual) this.proxima();
  }

  /** Avança o diálogo (F / Enter / clique). Completa o texto antes de passar. */
  avancar() {
    if (!this.atual) return;
    if (this.letras < this.atual.texto.length) {
      this.letras = this.atual.texto.length;
      return;
    }
    this.proxima();
  }

  private proxima() {
    this.atual = this.fila.shift() ?? null;
    if (!this.atual) {
      this.caixa.style.display = 'none';
      const f = this.aoTerminar;
      this.aoTerminar = null;
      f?.();
      return;
    }
    this.letras = 0;
    const espirito = this.atual.quem === 'espirito';
    this.caixa.classList.toggle('espirito', espirito);
    this.caixaQuem.textContent = espirito ? 'Espírito Santo' : this.atual.quem;
    this.caixaTexto.textContent = '';
    this.caixa.style.display = 'block';
  }

  escurecer(ativo: boolean) {
    this.veu.style.opacity = ativo ? '1' : '0';
  }
}
