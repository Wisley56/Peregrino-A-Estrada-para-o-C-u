import { Identidade, normalizar } from './Aparencia';
import { AREAS, IdArea } from '../mundo/Area';
import { pontoDaV1 } from '../mundo/aberto/Geografia';
import { CUSTO_NIVEL, DONS, IdDom, domPorId } from './Dons';

const areaValida = (a: unknown): IdArea => (AREAS.includes(a as IdArea) ? (a as IdArea) : 'vale');

/** Save antigo (de antes dos espaços de jogo): vira o espaço 1 na primeira vez. */
const CHAVE_ANTIGA = 'peregrino3d.save.v1';
const CHAVE_SLOT = (n: number) => `peregrino3d.slot.${n}`;
const CHAVE_ULTIMO = 'peregrino3d.ultimoSlot';
/** Cópia de um espaço de jogo de antes do mapa único (versão 1), guardada na hora de trazê-lo para o mundo novo. */
const CHAVE_COPIA_V1 = (n: number) => `peregrino3d.slot.${n}.v1`;
/**
 * Versão do formato do save. 1 (ou ausente): cada área num canto do mundo, com o mar de Creta e Malta no nível 8.
 * 2: o mapa único (as áreas têm lugar certo e o mar tem um nível só).
 */
const VERSAO = 2;
export const TOTAL_SLOTS = 3;

export interface DadosSalvos {
  versao?: number;
  checkpoint: [number, number, number];
  checkpointArea?: IdArea;
  cor: number;
  gracas: number;
  sombrasVencidas: string[];
  flags: string[];
  /** Nível escolhido de cada dom (com graças). */
  dons?: Partial<Record<IdDom, number>>;
  identidade?: Identidade;
  /** Data/hora do último salvamento (ms). */
  salvoEm?: number;
  /** Tempo de jogo acumulado (s). */
  tempo?: number;
  /** Sacramentos recebidos desde a última queda. */
  confessado?: boolean;
  comungou?: boolean;
  /** Iscas da Gula carregadas (o ouro que pesa). */
  peso?: number;
}

/** O que a tela inicial mostra de cada espaço de jogo. */
export interface ResumoSave {
  slot: number;
  nome: string;
  area: IdArea;
  gracas: number;
  cor: number;
  salvoEm: number;
  tempo: number;
  flags: Set<string>;
}

function ler(chave: string): DadosSalvos | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as DadosSalvos) : null;
  } catch {
    return null;
  }
}

/** Sombras-chefão: cada uma vencida dá um coração a mais. */
export const CHEFOES = ['cripta_guardiao', 'meiodia_acedia', 'palacio_gula', 'bahiaalta_coracao', 'naufragio_ira'];

/** Estado do peregrino e do mundo. O que importa entre sessões vai para o espaço de jogo atual. */
export class Estado {
  /** Corações: 5 no começo e +1 por chefão vencido (vale também para saves antigos). O dano vem em meios. */
  get coracoesBase() {
    return 5 + CHEFOES.filter((id) => this.sombrasVencidas.has(id)).length;
  }
  /** Com a Eucaristia, um coração dourado a mais até a próxima queda. */
  get coracoesMax() {
    return this.coracoesBase + (this.comungou ? 1 : 0);
  }
  /** Confessou-se desde a última queda (estado de graça): pode comungar. */
  confessado = false;
  /** Comungou desde a última queda. */
  comungou = false;
  coracoes = 5;
  /** Temor de Deus 5 (Prostração) aumenta a energia máxima. */
  get energiaMax() {
    return this.nivel('temor') >= 5 ? 130 : 100;
  }
  /** Níveis comprados com graças (o nível 1 de cada dom vem do santo). */
  dons: Partial<Record<IdDom, number>> = {};
  energia = 60;
  cor = 0; // 0 = cinza, 1 = cores restauradas
  gracas = 0;
  checkpoint: [number, number, number] = [0, 0, 0];
  checkpointArea: IdArea = 'vale';
  sombrasVencidas = new Set<string>();
  flags = new Set<string>();
  /** null até o jogador passar pela criação do personagem. */
  identidade: Identidade | null = null;
  /** Espaço de jogo (1..3). Sem espaço (null), nada é salvo. */
  slot: number | null = null;
  tempo = 0;
  /** Iscas da Gula que o peregrino pegou e ainda não deu aos pobres: cada uma pesa. */
  peso = 0;
  /**
   * Trava de salvamento do modo dev: depois de usar o painel de desenvolvedor, nada vai para o espaço de jogo até
   * alguém liberar de propósito. Assim um teste não estraga o progresso de verdade. Em produção fica sempre falso.
   */
  semSalvar = false;

  static {
    // migra o save antigo para o espaço 1
    try {
      const antigo = localStorage.getItem(CHAVE_ANTIGA);
      if (antigo && !localStorage.getItem(CHAVE_SLOT(1))) {
        localStorage.setItem(CHAVE_SLOT(1), antigo);
        localStorage.setItem(CHAVE_ULTIMO, '1');
      }
      if (antigo) localStorage.removeItem(CHAVE_ANTIGA);
    } catch {
      /* sem armazenamento */
    }
  }

  static resumo(slot: number): ResumoSave | null {
    const d = ler(CHAVE_SLOT(slot));
    if (!d || !d.identidade) return null;
    return {
      slot,
      nome: d.identidade.nome,
      area: areaValida(d.checkpointArea),
      gracas: d.gracas ?? 0,
      cor: d.cor ?? 0,
      salvoEm: d.salvoEm ?? 0,
      tempo: d.tempo ?? 0,
      flags: new Set(d.flags ?? []),
    };
  }

  static resumos() {
    return Array.from({ length: TOTAL_SLOTS }, (_, i) => Estado.resumo(i + 1));
  }

  /** Último espaço jogado, se ainda existir. */
  static ultimoSlot(): number | null {
    try {
      const n = Number(localStorage.getItem(CHAVE_ULTIMO));
      return n >= 1 && n <= TOTAL_SLOTS && Estado.resumo(n) ? n : null;
    } catch {
      return null;
    }
  }

  static apagar(slot: number) {
    try {
      localStorage.removeItem(CHAVE_SLOT(slot));
      if (localStorage.getItem(CHAVE_ULTIMO) === String(slot)) localStorage.removeItem(CHAVE_ULTIMO);
    } catch {
      /* sem armazenamento */
    }
  }

  /** Lê um espaço de jogo. Devolve false se estiver vazio (o estado fica zerado, pronto para um jogo novo). */
  carregarSlot(slot: number): boolean {
    this.zerar();
    this.slot = slot;
    const d = ler(CHAVE_SLOT(slot));
    if (!d || !d.identidade) return false; // sem peregrino criado: é um jogo novo
    this.checkpointArea = areaValida(d.checkpointArea);
    this.checkpoint = d.checkpoint;
    if ((d.versao ?? 1) < 2) {
      // save de antes do mapa único: guarda uma cópia e traz o ponto de retorno para o lugar novo da área
      try {
        if (!localStorage.getItem(CHAVE_COPIA_V1(slot))) localStorage.setItem(CHAVE_COPIA_V1(slot), JSON.stringify(d));
      } catch {
        /* sem armazenamento */
      }
      this.checkpoint = pontoDaV1(this.checkpointArea, d.checkpoint);
    }
    this.cor = d.cor;
    this.gracas = d.gracas;
    this.sombrasVencidas = new Set(d.sombrasVencidas);
    this.flags = new Set(d.flags);
    this.dons = { ...(d.dons ?? {}) };
    // chefões vencidos antes da "graça grande" (3 em vez de 1) recebem a diferença
    for (const id of CHEFOES)
      if (this.sombrasVencidas.has(id) && !this.flags.has(`graca_grande_${id}`)) {
        this.gracas += 2;
        this.flags.add(`graca_grande_${id}`);
      }
    this.identidade = d.identidade ? normalizar(d.identidade) : null;
    this.tempo = d.tempo ?? 0;
    this.confessado = !!d.confessado;
    this.comungou = !!d.comungou;
    this.peso = Math.max(0, Math.floor(d.peso ?? 0));
    // o zerar() encheu os corações antes de saber dos chefões e da Eucaristia
    this.coracoes = this.coracoesMax;
    return true;
  }

  /** Volta tudo ao começo (jogo novo). */
  zerar() {
    this.confessado = false;
    this.comungou = false;
    this.coracoes = this.coracoesMax;
    this.energia = 60;
    this.cor = 0;
    this.gracas = 0;
    this.checkpoint = [0, 0, 0];
    this.checkpointArea = 'vale';
    this.sombrasVencidas = new Set();
    this.flags = new Set();
    this.dons = {};
    this.identidade = null;
    this.tempo = 0;
    this.peso = 0;
  }

  salvar() {
    if (this.slot === null || this.semSalvar) return;
    const d: DadosSalvos = {
      versao: VERSAO,
      checkpoint: this.checkpoint,
      checkpointArea: this.checkpointArea,
      cor: this.cor,
      gracas: this.gracas,
      sombrasVencidas: [...this.sombrasVencidas],
      flags: [...this.flags],
      dons: this.dons,
      identidade: this.identidade ?? undefined,
      salvoEm: Date.now(),
      tempo: Math.round(this.tempo),
      confessado: this.confessado || undefined,
      comungou: this.comungou || undefined,
      peso: this.peso || undefined,
    };
    try {
      localStorage.setItem(CHAVE_SLOT(this.slot), JSON.stringify(d));
      localStorage.setItem(CHAVE_ULTIMO, String(this.slot));
    } catch {
      /* sem armazenamento: o jogo segue sem salvar */
    }
  }

  /** Nível de um dom: 0 = ainda não recebido. */
  nivel(id: IdDom) {
    const recebido = id === 'temor' || this.flags.has(`dom_${id}`);
    if (!recebido) return 0;
    return Math.max(1, Math.min(5, this.dons[id] ?? 1));
  }

  /** Graças já aplicadas nos dons. */
  get gracasGastas() {
    let t = 0;
    for (const d of DONS) for (let n = 2; n <= (this.dons[d.id] ?? 1); n++) t += CUSTO_NIVEL[n];
    return t;
  }

  /** Graças que ainda podem ser aplicadas. */
  get gracasLivres() {
    return Math.max(0, this.gracas - this.gracasGastas);
  }

  /** Sobe um dom um nível, se houver graças. */
  fortalecer(id: IdDom) {
    const n = this.nivel(id);
    if (n < 1 || n >= 5 || this.gracasLivres < CUSTO_NIVEL[n + 1] || this.travado(id)) return false;
    this.dons[id] = n + 1;
    this.salvar();
    return true;
  }

  /** O próximo nível do dom ainda está fechado pela história (devolve a trava, ou null). */
  travado(id: IdDom) {
    const n = this.nivel(id);
    const t = n >= 1 && n < 5 ? domPorId(id).niveis[n]?.trava : undefined;
    return t && !this.flags.has(t.flag) ? t : null;
  }

  /** A queda tira o estado de graça e o coração da Eucaristia. */
  cair() {
    this.confessado = false;
    this.comungou = false;
  }

  restaurar() {
    this.coracoes = this.coracoesMax;
    this.energia = this.energiaMax;
  }
}
