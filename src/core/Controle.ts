/**
 * Controle (gamepad) pela Gamepad API do navegador. Só lê o "mapeamento padrão" (Xbox, PlayStation, 8BitDo,
 * Switch Pro e a maioria dos genéricos via XInput/DirectInput no Chrome/Edge/Firefox), que fixa os índices:
 *
 *   0 A/✕ · 1 B/○ · 2 X/□ · 3 Y/△ · 4 LB/L1 · 5 RB/R1 · 6 LT/L2 · 7 RT/R2 · 8 View/Share · 9 Menu/Options
 *   10 L3 · 11 R3 · 12 ↑ · 13 ↓ · 14 ← · 15 → · eixos 0,1 analógico esquerdo · 2,3 analógico direito
 *
 * O navegador só entrega o controle depois que o jogador aperta algum botão nele (regra de privacidade).
 * A leitura é por quadro (polling): não há eventos de botão na API.
 */

export const B = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VOLTAR: 8, MENU: 9, L3: 10, R3: 11,
  CIMA: 12, BAIXO: 13, ESQUERDA: 14, DIREITA: 15,
} as const;

export type Familia = 'xbox' | 'playstation';

/** Gatilhos analógicos contam como apertados a partir daqui (com folga para soltar, contra tremida). */
const GATILHO_LIGA = 0.5;
const GATILHO_SOLTA = 0.35;
/** Zona morta radial dos analógicos: abaixo disso é ruído do sensor (controles gastos passam de 0,1). */
const ZONA_MORTA = 0.16;
const ZONA_CHEIA = 0.95;

/** Analógico com zona morta radial e reescala (sai 0..1 sem degrau na borda da zona morta). */
export function zonaMorta(x: number, y: number, morta = ZONA_MORTA): [number, number] {
  const m = Math.hypot(x, y);
  if (m <= morta) return [0, 0];
  const k = Math.min(1, (m - morta) / (ZONA_CHEIA - morta)) / m;
  return [x * k, y * k];
}

/**
 * Família pelo id que o navegador informa: vendor 054c = Sony (o DualShock 4 aparece só como "Wireless
 * Controller", sem marca; o do Xbox é "Xbox Wireless Controller"). O resto usa os nomes do Xbox.
 */
export function familiaDe(id: string): Familia {
  return /054c|dualsense|dualshock|playstation|^wireless controller/i.test(id) ? 'playstation' : 'xbox';
}

/** Nome legível do controle (o id vem como "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e ...)"). */
export function nomeDe(id: string) {
  const limpo = id.replace(/\(.*?\)/g, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim();
  return limpo || 'Controle';
}

export class Controle {
  /** Índice do controle em uso em `navigator.getGamepads()` (o último que teve botão apertado). */
  private indice: number | null = null;
  private agora: boolean[] = [];
  private antes: boolean[] = [];
  /** Analógicos já com zona morta: x para a direita, y para cima (o navegador manda y para baixo). */
  esquerdo: [number, number] = [0, 0];
  direito: [number, number] = [0, 0];
  familia: Familia = 'xbox';
  nome = '';
  /** Houve qualquer ação no controle neste quadro (para trocar as dicas da tela para os botões dele). */
  usado = false;
  private pad: Gamepad | null = null;

  constructor() {
    addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.indice) this.indice = null;
    });
  }

  get conectado() {
    return this.pad !== null;
  }

  /** Lê o estado do controle; chamar uma vez por quadro, antes de consultar botões. */
  ler() {
    this.antes = this.agora;
    this.agora = [];
    this.usado = false;
    const pads = lista();
    // escolhe o controle: o atual, senão o primeiro com botão apertado, senão o primeiro conectado
    let pad = this.indice !== null ? pads[this.indice] ?? null : null;
    if (!pad || !pad.connected) {
      pad = pads.find((p) => p?.connected && p.buttons.some((b) => b.pressed)) ?? pads.find((p) => p?.connected) ?? null;
      this.indice = pad ? pad.index : null;
      this.antes = [];
    }
    // outro controle com botão apertado assume (dois controles ligados, troca de mão)
    if (pad) {
      const outro = pads.find((p) => p && p.connected && p.index !== pad!.index && p.buttons.some((b) => b.pressed));
      if (outro) {
        pad = outro;
        this.indice = outro.index;
      }
    }
    this.pad = pad;
    if (!pad) {
      this.esquerdo = [0, 0];
      this.direito = [0, 0];
      return;
    }
    if (pad.id !== this.nome) {
      this.familia = familiaDe(pad.id);
      this.nome = pad.id;
    }
    pad.buttons.forEach((b, i) => {
      const gatilho = i === B.LT || i === B.RT;
      this.agora[i] = gatilho ? b.value >= (this.antes[i] ? GATILHO_SOLTA : GATILHO_LIGA) || (b.pressed && b.value === 0) : b.pressed;
    });
    const ax = pad.axes;
    this.esquerdo = zonaMorta(ax[0] ?? 0, -(ax[1] ?? 0));
    this.direito = zonaMorta(ax[2] ?? 0, -(ax[3] ?? 0));
    this.usado =
      this.agora.some(Boolean) || Math.hypot(...this.esquerdo) > 0.25 || Math.hypot(...this.direito) > 0.25;
  }

  segurando(b: number) {
    return !!this.agora[b];
  }

  apertou(b: number) {
    return !!this.agora[b] && !this.antes[b];
  }

  soltou(b: number) {
    return !this.agora[b] && !!this.antes[b];
  }

  /** Tremor (quando o controle e o navegador suportam). Forte = motor grave, fraco = motor agudo, 0..1. */
  vibrar(forte: number, fraco: number, ms: number) {
    const atuador = (this.pad as (Gamepad & { vibrationActuator?: GamepadHapticActuator }) | null)?.vibrationActuator;
    try {
      void atuador?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: forte, weakMagnitude: fraco })?.catch?.(() => {});
    } catch {
      /* sem vibração */
    }
  }
}

function lista(): (Gamepad | null)[] {
  try {
    return navigator.getGamepads?.() ? [...navigator.getGamepads()] : [];
  } catch {
    return []; // bloqueado por política de permissões (iframes)
  }
}
