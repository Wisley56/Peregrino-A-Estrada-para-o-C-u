/**
 * Preferências do jogador que valem para todos os jogos salvos (não entram no save do slot).
 * Ficam no localStorage; sem armazenamento, valem só nesta sessão.
 */
const CHAVE = 'peregrino-preferencias';

export const SENSIBILIDADE_MIN = 0.2;
export const SENSIBILIDADE_MAX = 2;
/** Um pouco abaixo do antigo 1,0, que era rápido demais para muita gente. */
export const SENSIBILIDADE_PADRAO = 0.7;
/** Giro da câmera pelo analógico direito (1 = cerca de meia volta por segundo com o analógico no fundo). */
export const SENS_CONTROLE_MIN = 0.3;
export const SENS_CONTROLE_MAX = 2;
export const SENS_CONTROLE_PADRAO = 1;

/**
 * Mira no centro da tela: `cruz` (a do Minecraft, que inverte a cor do fundo), `anel` (a redonda do Veloren),
 * `ponto` (discreta) ou `desligada`.
 */
export type EstiloMira = 'cruz' | 'anel' | 'ponto' | 'desligada';
export const ESTILOS_MIRA: readonly EstiloMira[] = ['cruz', 'anel', 'ponto', 'desligada'];

export type Sombras = 'desligadas' | 'simples' | 'suaves' | 'detalhadas';
export type Serrilhado = 'desligado' | 'fxaa' | 'smaa' | 'msaa';
export type Predefinicao = 'baixa' | 'media' | 'alta' | 'ultra' | 'personalizada';

/** O que a tela de Gráficos ajusta. */
export interface ConfigGraficos {
  predefinicao: Predefinicao;
  /** Pixels por pixel de CSS: 0,75 (mais leve) a 2 (mais nítido). */
  resolucao: number;
  sombras: Sombras;
  serrilhado: Serrilhado;
  /** Brilho das luzes (bloom): graças, lamparina, fogo, vitrais. */
  brilho: boolean;
  /** Oclusão de ambiente (GTAO): cantos e frestas dos blocos escurecem como na luz real. */
  oclusao: boolean;
  /** Cor de cinema: curva de contraste, sombras frias e luzes quentes, e um grão de filme bem leve. */
  cinema: boolean;
}

type Ajustes = Omit<ConfigGraficos, 'predefinicao'>;

export const PREDEFINICOES: Record<Exclude<Predefinicao, 'personalizada'>, Ajustes> = {
  baixa: { resolucao: 0.75, sombras: 'simples', serrilhado: 'fxaa', brilho: false, oclusao: false, cinema: false },
  media: { resolucao: 1, sombras: 'suaves', serrilhado: 'fxaa', brilho: true, oclusao: false, cinema: true },
  alta: { resolucao: 1, sombras: 'suaves', serrilhado: 'msaa', brilho: true, oclusao: false, cinema: true },
  ultra: { resolucao: 1.5, sombras: 'detalhadas', serrilhado: 'msaa', brilho: true, oclusao: true, cinema: true },
};

/** Média: perto do custo do render antigo, mas já com antisserrilhado, brilho e cor de cinema. */
export const GRAFICOS_PADRAO: ConfigGraficos = { predefinicao: 'media', ...PREDEFINICOES.media };

/** Qual predefinição bate com estes ajustes (ou "personalizada"). */
export function predefinicaoDe(c: Ajustes): Predefinicao {
  for (const [nome, p] of Object.entries(PREDEFINICOES) as [Predefinicao, Ajustes][])
    if ((Object.keys(p) as (keyof Ajustes)[]).every((k) => p[k] === c[k])) return nome;
  return 'personalizada';
}

interface Dados {
  sensibilidade: number;
  mira: EstiloMira;
  graficos: ConfigGraficos;
  sensibilidadeControle: number;
  inverterY: boolean;
  vibracao: boolean;
}

function ler(): Partial<Dados> {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Partial<Dados>) : {};
  } catch {
    return {};
  }
}

const um = <T extends string>(v: unknown, ok: readonly T[], padrao: T): T => (ok.includes(v as T) ? (v as T) : padrao);

export class Preferencias {
  /** Multiplica o giro da câmera pelo mouse (e pela borda da tela). */
  sensibilidade: number;
  mira: EstiloMira;
  graficos: ConfigGraficos;
  /** Multiplica o giro da câmera pelo analógico direito do controle. */
  sensibilidadeControle: number;
  /** Analógico direito para cima olha para baixo (como num avião). */
  inverterY: boolean;
  /** Tremor do controle ao levar dano, acertar e cair. */
  vibracao: boolean;

  constructor() {
    const d = ler();
    const s = Number(d.sensibilidade);
    this.sensibilidade = Number.isFinite(s) ? Math.min(SENSIBILIDADE_MAX, Math.max(SENSIBILIDADE_MIN, s)) : SENSIBILIDADE_PADRAO;
    const sc = Number(d.sensibilidadeControle);
    this.sensibilidadeControle = Number.isFinite(sc) ? Math.min(SENS_CONTROLE_MAX, Math.max(SENS_CONTROLE_MIN, sc)) : SENS_CONTROLE_PADRAO;
    this.inverterY = d.inverterY === true;
    this.vibracao = d.vibracao !== false;
    this.mira = um(d.mira, ESTILOS_MIRA, 'cruz');
    const g = (d.graficos ?? {}) as Partial<ConfigGraficos>;
    const p = GRAFICOS_PADRAO;
    const r = Number(g.resolucao);
    const ajustes: Ajustes = {
      resolucao: [0.75, 1, 1.5, 2].includes(r) ? r : p.resolucao,
      sombras: um(g.sombras, ['desligadas', 'simples', 'suaves', 'detalhadas'] as const, p.sombras),
      serrilhado: um(g.serrilhado, ['desligado', 'fxaa', 'smaa', 'msaa'] as const, p.serrilhado),
      brilho: typeof g.brilho === 'boolean' ? g.brilho : p.brilho,
      oclusao: typeof g.oclusao === 'boolean' ? g.oclusao : p.oclusao,
      cinema: typeof g.cinema === 'boolean' ? g.cinema : p.cinema,
    };
    this.graficos = { predefinicao: predefinicaoDe(ajustes), ...ajustes };
  }

  salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        sensibilidade: this.sensibilidade, mira: this.mira, graficos: this.graficos,
        sensibilidadeControle: this.sensibilidadeControle, inverterY: this.inverterY, vibracao: this.vibracao,
      } satisfies Dados));
    } catch {
      /* sem armazenamento */
    }
  }
}
