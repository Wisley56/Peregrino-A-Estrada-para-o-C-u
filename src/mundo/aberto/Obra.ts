import { assar, transferiveis } from './Assado';
import { construirLadrilho, pintarQuadrado, type MalhaCrua } from './Ladrilho';
import type { PedidoObra, RespostaObra } from './obra.worker';
import type { TerrenoMundo } from './TerrenoMundo';

/** Quantos operários (Web Workers): metade dos núcleos, entre 1 e 3 (o jogo e o navegador precisam dos outros). */
const OPERARIOS = Math.max(1, Math.min(3, Math.floor((navigator.hardwareConcurrency || 2) / 2)));

/**
 * Quem faz o chão do mundo aberto fora do thread do jogo: uma pequena equipe de Web Workers (a obra), cada um com
 * uma cópia assada das regiões. Os pedidos são distribuídos ao operário com menos trabalho. Se o navegador não
 * deixar criar workers, tudo é feito ali mesmo, no thread principal, como antes.
 */
export class Obra {
  private readonly operarios: { w: Worker; ocupados: number }[] = [];
  private readonly esperando = new Map<number, (r: RespostaObra) => void>();
  private proximo = 1;

  constructor(private readonly terreno: TerrenoMundo) {
    try {
      const carimbos = terreno.carimbos.map(assar);
      for (let i = 0; i < OPERARIOS; i++) {
        const w = new Worker(new URL('./obra.worker.ts', import.meta.url), { type: 'module' });
        const o = { w, ocupados: 0 };
        w.onmessage = (e: MessageEvent<RespostaObra>) => {
          o.ocupados--;
          const f = this.esperando.get(e.data.id);
          this.esperando.delete(e.data.id);
          f?.(e.data);
        };
        // cada operário recebe sua cópia (a transferência esvazia os vetores, então cópias novas para cada um)
        const copia = carimbos.map((c) => ({
          ...c,
          borda: { alt: c.borda.alt.slice(), cor: c.borda.cor.slice() },
          miolo: { ...c.miolo, alt: c.miolo.alt.slice(), cor: c.miolo.cor.slice() },
        }));
        const p: PedidoObra = { tipo: 'iniciar', carimbos: copia };
        w.postMessage(p, transferiveis(copia));
        this.operarios.push(o);
      }
    } catch (e) {
      console.warn('Obra: sem Web Workers, o chão será feito no thread principal.', e);
      for (const o of this.operarios) o.w.terminate();
      this.operarios.length = 0;
    }
  }

  /** Quantos pedidos estão na obra agora. */
  get emAndamento() {
    return this.esperando.size;
  }

  /** Há operários? (Sem eles, `ladrilho` e `mapa` respondem na hora.) */
  get paralela() {
    return this.operarios.length > 0;
  }

  private pedir(p: PedidoObra & { id: number }, f: (r: RespostaObra) => void) {
    let o = this.operarios[0];
    for (const k of this.operarios) if (k.ocupados < o.ocupados) o = k;
    o.ocupados++;
    this.esperando.set(p.id, f);
    o.w.postMessage(p);
  }

  /** Pede a malha de um ladrilho; `pronta` é chamada quando ela chega (`null`: nada a desenhar). */
  ladrilho(x0: number, z0: number, celula: number, fino: boolean, pronta: (m: MalhaCrua | null) => void) {
    if (!this.paralela) return pronta(construirLadrilho(this.terreno, x0, z0, celula, fino));
    this.pedir({ tipo: 'ladrilho', id: this.proximo++, x0, z0, celula, fino }, (r) => r.tipo === 'ladrilho' && pronta(r.malha));
  }

  /** Pede o minimapa de um quadrado (1 px por metro, RGBA). */
  mapa(x0: number, z0: number, lado: number, pronto: (px: Uint8ClampedArray) => void) {
    if (!this.paralela) return pronto(pintarQuadrado(this.terreno, x0, z0, lado));
    this.pedir({ tipo: 'mapa', id: this.proximo++, x0, z0, lado }, (r) => r.tipo === 'mapa' && pronto(r.px));
  }
}
