import type { VozAnimal } from '../fauna/Especies';

/** Efeitos sonoros sintetizados (Web Audio). Nenhum arquivo externo. */
export class Som {
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;

  /** Precisa ser chamado num gesto do usuário (clique). */
  ligar() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = 0.35;
      this.mestre.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private tom(freq: number, dur: number, tipo: OscillatorType, vol: number, ate?: number, atraso = 0) {
    if (!this.ctx || !this.mestre) return;
    const t = this.ctx.currentTime + atraso;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.mestre);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private ruido(dur: number, vol: number, filtro: number) {
    if (!this.ctx || !this.mestre) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filtro;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.mestre);
    src.start();
  }

  golpe() { this.ruido(0.18, 0.5, 900); }
  acerto() { this.tom(180, 0.15, 'square', 0.15, 90); this.ruido(0.08, 0.4, 2400); }
  luz() { this.tom(880, 0.4, 'sine', 0.2, 1320); this.tom(1320, 0.5, 'sine', 0.1, 1760, 0.05); }
  dano() { this.tom(140, 0.3, 'sawtooth', 0.18, 60); }
  passo() { this.ruido(0.05, 0.08, 400); }
  pulo() { this.tom(300, 0.12, 'triangle', 0.08, 480); }
  balido() { this.tom(420, 0.45, 'sawtooth', 0.05, 380); this.tom(426, 0.45, 'square', 0.03, 384); }

  /** Voz de um bicho da fauna; mais baixa quanto mais longe (k = 0…1). */
  voz(v: VozAnimal, k = 1) {
    const g = Math.max(0.15, Math.min(1, k));
    const t = (f: number, d: number, tipo: OscillatorType, vol: number, ate?: number, atraso = 0) => this.tom(f, d, tipo, vol * g, ate, atraso);
    switch (v) {
      case 'balido': t(420, 0.45, 'sawtooth', 0.05, 380); t(426, 0.45, 'square', 0.03, 384); break;
      case 'balido_agudo': t(560, 0.35, 'sawtooth', 0.045, 500); t(566, 0.35, 'square', 0.025, 505); break;
      case 'latido': [0, 0.22].forEach((d) => { t(300, 0.12, 'square', 0.06, 180, d); this.ruido(0.08, 0.08 * g, 900); }); break;
      case 'miado': t(600, 0.5, 'triangle', 0.05, 900); t(900, 0.3, 'triangle', 0.04, 500, 0.35); break;
      case 'grunhido': t(110, 0.3, 'sawtooth', 0.06, 80); this.ruido(0.25, 0.1 * g, 300); break;
      case 'mugido': t(130, 1.1, 'sawtooth', 0.05, 100); t(132, 1.1, 'triangle', 0.04, 98); break;
      case 'relincho': for (let i = 0; i < 6; i++) t(700 - i * 40, 0.1, 'sawtooth', 0.04, 620 - i * 40, i * 0.08); break;
      case 'zurro': [0, 0.5, 1].forEach((d, i) => t(i % 2 ? 260 : 520, 0.45, 'sawtooth', 0.05, i % 2 ? 230 : 460, d)); break;
      case 'cacarejo': for (let i = 0; i < 4; i++) t(650 + (i % 2) * 150, 0.08, 'square', 0.035, 500, i * 0.11); break;
      case 'grasnado': [0, 0.2].forEach((d) => t(320, 0.15, 'sawtooth', 0.05, 260, d)); break;
      case 'crocito': [0, 0.35].forEach((d) => { t(420, 0.22, 'sawtooth', 0.05, 300, d); }); this.ruido(0.2, 0.06 * g, 1500); break;
      case 'pio': t(420, 0.35, 'sine', 0.06, 400); t(380, 0.6, 'sine', 0.05, 360, 0.45); break;
      case 'uivo': t(300, 2.2, 'sine', 0.06, 520); t(600, 2.2, 'triangle', 0.015, 1040); break;
      case 'guincho': for (let i = 0; i < 3; i++) t(3200, 0.05, 'square', 0.02, 2600, i * 0.07); break;
      case 'coaxo': [0, 0.3].forEach((d) => t(160, 0.18, 'square', 0.05, 120, d)); break;
      case 'grito_aguia': t(1800, 0.7, 'sawtooth', 0.025, 1200); t(1900, 0.5, 'sine', 0.02, 1300, 0.1); break;
      case 'pavao': t(800, 0.6, 'sawtooth', 0.04, 1300); t(1300, 0.4, 'sawtooth', 0.03, 900, 0.5); break;
      case 'gemido': t(220, 0.7, 'sawtooth', 0.04, 170); this.ruido(0.5, 0.05 * g, 400); break;
    }
  }
  dissolver() { this.tom(660, 0.9, 'sine', 0.15, 220); this.ruido(0.6, 0.2, 3000); }
  graca() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tom(f, 1.6, 'sine', 0.12, undefined, i * 0.12));
  }
  oracao() { this.tom(392, 0.6, 'sine', 0.04); }
  bloqueio() { this.tom(1250, 0.25, 'square', 0.08, 900); this.ruido(0.1, 0.35, 5000); }
  portao() { this.ruido(1.4, 0.35, 160); this.tom(70, 1.4, 'sawtooth', 0.06, 50); }
  fogo() { this.ruido(0.5, 0.3, 700); this.tom(220, 0.3, 'triangle', 0.06, 330); }
  private ambiente: { tipo: string; para: () => void } | null = null;

  /** Som de fundo contínuo da área: a cripta (zumbido grave e vento) ou o deserto (vento em rajadas). */
  ambienteDe(tipo: 'cripta' | 'deserto' | null) {
    if (!this.ctx || !this.mestre) return;
    if ((this.ambiente?.tipo ?? null) === tipo) return;
    this.ambiente?.para();
    this.ambiente = null;
    if (!tipo) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5);
    g.connect(this.mestre);
    const fontes: AudioScheduledSourceNode[] = [];
    const drones: [number, number][] = tipo === 'cripta' ? [[55, 0.05], [82.4, 0.025], [110.3, 0.012]] : [[98, 0.012], [147, 0.006]];
    for (const [f, v] of drones) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + f * 0.0005;
      const prof = ctx.createGain();
      prof.gain.value = v * 0.6;
      const og = ctx.createGain();
      og.gain.value = v;
      lfo.connect(prof).connect(og.gain);
      o.connect(og).connect(g);
      o.start();
      lfo.start();
      fontes.push(o, lfo);
    }
    // vento: ruído em loop por um filtro passa-faixa (no deserto, mais agudo e em rajadas)
    const n = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const vento = ctx.createBufferSource();
    vento.buffer = buf;
    vento.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = tipo === 'cripta' ? 240 : 520;
    filtro.Q.value = tipo === 'cripta' ? 0.8 : 0.6;
    const vg = ctx.createGain();
    vg.gain.value = tipo === 'cripta' ? 0.05 : 0.07;
    if (tipo === 'deserto') {
      const rajada = ctx.createOscillator();
      rajada.frequency.value = 0.11;
      const rp = ctx.createGain();
      rp.gain.value = 0.045;
      rajada.connect(rp).connect(vg.gain);
      const assobio = ctx.createOscillator();
      assobio.frequency.value = 0.05;
      const ap = ctx.createGain();
      ap.gain.value = 180;
      assobio.connect(ap).connect(filtro.frequency);
      rajada.start();
      assobio.start();
      fontes.push(rajada, assobio);
    }
    vento.connect(filtro).connect(vg).connect(g);
    vento.start();
    fontes.push(vento);
    this.ambiente = {
      tipo,
      para: () => {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        fontes.forEach((s) => s.stop(t + 1.3));
      },
    };
  }

  /** Voz de miragem: sopro com um tom baixo e desafinado. */
  sussurro() {
    this.ruido(1.1, 0.05, 1800);
    this.tom(196, 1.2, 'sine', 0.025, 185);
    this.tom(207, 1.2, 'sine', 0.018, 196, 0.15);
  }

  /** Dom da Ciência: acorde claro que sobe. */
  ciencia() {
    [523, 659, 784, 1047].forEach((f, i) => this.tom(f, 0.9, 'sine', 0.07, f * 1.01, i * 0.07));
    this.ruido(0.5, 0.06, 7000);
  }


  /** Golpe sísmico do chefão. */
  onda() { this.tom(55, 0.9, 'sawtooth', 0.14, 30); this.ruido(0.7, 0.45, 120); }
  /** Corrente sendo preparada: tilintar metálico. */
  corrente() { for (let i = 0; i < 5; i++) this.tom(1400 + i * 170, 0.09, 'square', 0.035, 900, i * 0.08); }
  /** Chuva de moedas. */
  moedas() { for (let i = 0; i < 9; i++) this.tom(2200 + ((i * 337) % 900), 0.12, 'triangle', 0.05, 1600, i * 0.045); }
  /** Energia roubada: notas descendo. */
  roubo() { [880, 740, 587, 440, 330].forEach((f, i) => this.tom(f, 0.22, 'sine', 0.1, f * 0.8, i * 0.07)); }
  faisca() { this.tom(1800, 0.18, 'sine', 0.05, 900); this.ruido(0.08, 0.15, 6000); }
  apagou() { this.ruido(0.6, 0.2, 300); }
  /** Marcas de sol no chão: um zumbido agudo que sobe. */
  sol() { this.tom(1200, 1.1, 'sine', 0.05, 2400); this.tom(1800, 1.1, 'sine', 0.03, 3000, 0.1); }
  /** Os raios caem. */
  raio() { this.ruido(0.4, 0.4, 2600); this.tom(900, 0.35, 'triangle', 0.08, 300); }
  /** O bocejo do demônio: um suspiro grave que desce. */
  torpor() { this.tom(196, 1.6, 'sine', 0.12, 98); this.tom(147, 1.6, 'triangle', 0.06, 73, 0.2); this.ruido(1.2, 0.12, 250); }
  tensao() { [110, 103.8].forEach((f, i) => this.tom(f, 2.2, 'sawtooth', 0.07, f * 0.98, i * 0.3)); }
  /** Fanfarra ao receber um item. */
  item() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tom(f, i === 4 ? 1.8 : 0.35, 'triangle', 0.13, undefined, i * 0.14));
    [261.6, 329.6, 392].forEach((f) => this.tom(f, 2.2, 'sine', 0.07, undefined, 0.56));
  }
}
