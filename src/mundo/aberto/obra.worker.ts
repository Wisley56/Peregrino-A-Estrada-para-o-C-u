/**
 * A obra: um Web Worker que faz os ladrilhos do chão e os quadrados do minimapa longe do thread do jogo, para o
 * peregrino andar sem engasgar enquanto o mundo em volta é montado. Recebe as regiões assadas uma vez e depois
 * pedidos numerados; devolve os vetores transferidos (sem cópia).
 */
import { desassar, type CarimboCru } from './Assado';
import { construirLadrilho, pintarQuadrado } from './Ladrilho';
import { TerrenoMundo } from './TerrenoMundo';

export type PedidoObra =
  | { tipo: 'iniciar'; carimbos: CarimboCru[] }
  | { tipo: 'ladrilho'; id: number; x0: number; z0: number; celula: number; fino: boolean }
  | { tipo: 'mapa'; id: number; x0: number; z0: number; lado: number };

export type RespostaObra =
  | { tipo: 'ladrilho'; id: number; malha: import('./Ladrilho').MalhaCrua | null }
  | { tipo: 'mapa'; id: number; px: Uint8ClampedArray };

// (sem a lib "webworker" do TypeScript, que brigaria com a do DOM no resto do projeto)
const eu = self as unknown as {
  onmessage: ((e: MessageEvent<PedidoObra>) => void) | null;
  postMessage(m: RespostaObra, transferir: Transferable[]): void;
};
let terreno: TerrenoMundo | null = null;

eu.onmessage = (e: MessageEvent<PedidoObra>) => {
  const p = e.data;
  if (p.tipo === 'iniciar') {
    terreno = new TerrenoMundo(p.carimbos.map(desassar));
    return;
  }
  if (!terreno) return;
  if (p.tipo === 'ladrilho') {
    const malha = construirLadrilho(terreno, p.x0, p.z0, p.celula, p.fino);
    const r: RespostaObra = { tipo: 'ladrilho', id: p.id, malha };
    eu.postMessage(r, malha ? [malha.pos.buffer, malha.nor.buffer, malha.cor.buffer, malha.idx.buffer] : []);
  } else {
    const px = pintarQuadrado(terreno, p.x0, p.z0, p.lado);
    const r: RespostaObra = { tipo: 'mapa', id: p.id, px };
    eu.postMessage(r, [px.buffer]);
  }
};
