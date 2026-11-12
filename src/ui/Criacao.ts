import {
  CABELOS_POR_GENERO, CORES_CABELO, CORES_ROUPA, Genero, Identidade, Idade, NOMES_CABELO, NOMES_IDADE,
  NOMES_SUGERIDOS, ROUPAS, TAMANHO_NOME, TONS_PELE, normalizar,
} from '../core/Aparencia';
import { rubiSVG } from './Vitral';

type Linha =
  | { tipo: 'nome' }
  | { tipo: 'seletor'; rotulo: string; valor: () => string; mudar: (d: number) => void }
  | { tipo: 'cores'; rotulo: string; cores: number[]; nomes?: string[]; atual: () => number; escolher: (i: number) => void };

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const ciclo = (i: number, d: number, n: number) => (i + d + n) % n;

/**
 * Criação do peregrino (painel em HTML sobre a cena 3D).
 * Cada mudança chama `aoMudar` para o boneco ser remontado na hora.
 */
export class Criacao {
  private raiz: HTMLDivElement;
  private linhas: Linha[];
  private elementos: HTMLElement[] = [];
  private foco = 0;
  private id: Identidade;
  idadePrevia: Idade = 'jovem';
  private teclado = (e: KeyboardEvent) => this.tecla(e);

  constructor(
    inicial: Identidade | null,
    private aoMudar: (id: Identidade, idadePrevia: Idade) => void,
    private aoConfirmar: (id: Identidade) => void,
    private aoVoltar: () => void,
  ) {
    this.id = normalizar(inicial ?? undefined);
    this.idadePrevia = this.id.idade;
    const idades: Idade[] = ['jovem', 'adulto', 'idoso'];
    this.linhas = [
      { tipo: 'nome' },
      {
        tipo: 'seletor', rotulo: 'Corpo',
        valor: () => (this.id.genero === 'm' ? 'Masculino' : 'Feminino'),
        mudar: () => this.trocarGenero(this.id.genero === 'm' ? 'f' : 'm'),
      },
      {
        tipo: 'cores', rotulo: 'Pele', cores: TONS_PELE,
        atual: () => this.id.pele, escolher: (i) => (this.id.pele = i),
      },
      {
        tipo: 'seletor', rotulo: 'Cabelo',
        valor: () => NOMES_CABELO[this.id.cabelo],
        mudar: (d) => {
          const l = CABELOS_POR_GENERO[this.id.genero];
          this.id.cabelo = l[ciclo(l.indexOf(this.id.cabelo), d, l.length)];
        },
      },
      {
        tipo: 'cores', rotulo: 'Cor do cabelo', cores: CORES_CABELO.map((c) => c.valor), nomes: CORES_CABELO.map((c) => c.nome),
        atual: () => this.id.corCabelo, escolher: (i) => (this.id.corCabelo = i),
      },
      {
        tipo: 'seletor', rotulo: 'Roupa',
        valor: () => ROUPAS.find((r) => r.valor === this.id.roupa)!.nome,
        mudar: (d) => {
          const i = ROUPAS.findIndex((r) => r.valor === this.id.roupa);
          this.id.roupa = ROUPAS[ciclo(i, d, ROUPAS.length)].valor;
        },
      },
      {
        tipo: 'cores', rotulo: 'Cor da roupa', cores: CORES_ROUPA.map((c) => c.valor), nomes: CORES_ROUPA.map((c) => c.nome),
        atual: () => this.id.corRoupa, escolher: (i) => (this.id.corRoupa = i),
      },
      {
        tipo: 'seletor', rotulo: 'Chapéu de peregrino',
        valor: () => (this.id.chapeu ? 'Com chapéu' : 'Sem chapéu'),
        mudar: () => (this.id.chapeu = !this.id.chapeu),
      },
      {
        tipo: 'seletor', rotulo: 'Prévia do caminho',
        valor: () => NOMES_IDADE[this.idadePrevia],
        mudar: (d) => (this.idadePrevia = idades[ciclo(idades.indexOf(this.idadePrevia), d, 3)]),
      },
    ];

    this.raiz = document.createElement('div');
    this.raiz.id = 'criacao';
    this.raiz.innerHTML = `
      <div class="rubi">${rubiSVG(15)}</div>
      <div class="painel">
        <h2>Quem é você, peregrin${this.id.genero === 'f' ? 'a' : 'o'}?</h2>
        <div class="linhas"></div>
        <p class="nota">A idade não se escolhe: ela vem com o caminho. A prévia mostra como você ficará.</p>
        <button class="confirmar vb rubi">Começar a peregrinação</button>
        <button class="voltar">‹ Voltar ao início</button>
        <div class="ajuda">↑↓ escolher · ←→ mudar · Enter confirmar · Esc voltar · arraste a cena para girar</div>
      </div>`;
    document.body.appendChild(this.raiz);
    this.montar();
    this.raiz.querySelector<HTMLButtonElement>('.confirmar')!.addEventListener('click', () => this.confirmar());
    this.raiz.querySelector<HTMLButtonElement>('.voltar')!.addEventListener('click', () => this.voltar());
    window.addEventListener('keydown', this.teclado);
    this.atualizar();
  }

  private montar() {
    const caixa = this.raiz.querySelector('.linhas')!;
    caixa.innerHTML = '';
    this.elementos = this.linhas.map((l, i) => {
      const el = document.createElement('div');
      el.className = 'linha';
      el.addEventListener('mouseenter', () => this.focar(i));
      if (l.tipo === 'nome') {
        el.innerHTML = `<label>Nome</label>
          <div class="campo-nome"><input maxlength="${TAMANHO_NOME}" spellcheck="false" /><button class="sortear vb" title="Sortear um nome de santo">Sortear</button></div>`;
        const input = el.querySelector('input')!;
        input.value = this.id.nome;
        input.addEventListener('input', () => {
          this.id.nome = input.value;
          this.atualizar(false);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') input.blur();
          e.stopPropagation();
          if (e.key === 'ArrowDown') this.focar(1);
        });
        el.querySelector('.sortear')!.addEventListener('click', () => this.sortear());
      } else if (l.tipo === 'seletor') {
        el.innerHTML = `<label>${l.rotulo}</label>
          <div class="seletor"><button data-d="-1">‹</button><span></span><button data-d="1">›</button></div>`;
        el.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
          b.addEventListener('click', () => {
            l.mudar(Number(b.dataset.d));
            this.atualizar();
          }),
        );
      } else {
        el.innerHTML = `<label>${l.rotulo}</label><div class="cores">${l.cores
          .map((c, k) => `<button style="background:${hex(c)}" title="${l.nomes?.[k] ?? ''}" data-i="${k}"></button>`)
          .join('')}</div>`;
        el.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
          b.addEventListener('click', () => {
            l.escolher(Number(b.dataset.i));
            this.atualizar();
          }),
        );
      }
      caixa.appendChild(el);
      return el;
    });
  }

  private focar(i: number) {
    this.foco = Math.max(0, Math.min(this.linhas.length - 1, i));
    this.elementos.forEach((el, k) => el.classList.toggle('foco', k === this.foco));
  }

  private trocarGenero(g: Genero) {
    const nomeEraSugestao = NOMES_SUGERIDOS[this.id.genero].includes(this.id.nome);
    this.id.genero = g;
    if (!CABELOS_POR_GENERO[g].includes(this.id.cabelo)) this.id.cabelo = CABELOS_POR_GENERO[g][0];
    if (nomeEraSugestao) {
      this.id.nome = NOMES_SUGERIDOS[g][Math.floor(Math.random() * NOMES_SUGERIDOS[g].length)];
      this.raiz.querySelector('input')!.value = this.id.nome;
    }
    this.raiz.querySelector('h2')!.textContent = `Quem é você, peregrin${g === 'f' ? 'a' : 'o'}?`;
  }

  private sortear() {
    const l = NOMES_SUGERIDOS[this.id.genero].filter((n) => n !== this.id.nome);
    this.id.nome = l[Math.floor(Math.random() * l.length)];
    this.raiz.querySelector('input')!.value = this.id.nome;
    this.atualizar(false);
  }

  private atualizar(remontar = true) {
    this.linhas.forEach((l, i) => {
      const el = this.elementos[i];
      if (l.tipo === 'seletor') el.querySelector('span')!.textContent = l.valor();
      if (l.tipo === 'cores') el.querySelectorAll('button').forEach((b, k) => b.classList.toggle('ativa', k === l.atual()));
    });
    const valido = this.id.nome.trim().length > 0;
    this.raiz.querySelector<HTMLButtonElement>('.confirmar')!.disabled = !valido;
    this.focar(this.foco);
    if (remontar) this.aoMudar({ ...this.id }, this.idadePrevia);
  }

  private tecla(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // no campo do nome, o primeiro Esc só sai do campo
      if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
      else this.voltar();
      e.preventDefault();
      return;
    }
    if (document.activeElement instanceof HTMLInputElement) return;
    const l = this.linhas[this.foco];
    if (e.key === 'ArrowDown') this.focar(this.foco + 1);
    else if (e.key === 'ArrowUp') this.focar(this.foco - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const d = e.key === 'ArrowLeft' ? -1 : 1;
      if (l.tipo === 'seletor') l.mudar(d);
      else if (l.tipo === 'cores') l.escolher(ciclo(l.atual(), d, l.cores.length));
      else return;
      this.atualizar();
    } else if (e.key === 'Enter') {
      if (l.tipo === 'nome') this.raiz.querySelector('input')!.focus();
      else this.confirmar();
    } else return;
    e.preventDefault();
  }

  /** Desiste da criação e volta à tela inicial (nada é salvo). */
  private voltar() {
    window.removeEventListener('keydown', this.teclado);
    this.raiz.remove();
    this.aoVoltar();
  }

  private confirmar() {
    if (!this.id.nome.trim()) return;
    window.removeEventListener('keydown', this.teclado);
    this.raiz.remove();
    this.aoConfirmar(normalizar({ ...this.id })); // a idade real continua a do save
  }
}
