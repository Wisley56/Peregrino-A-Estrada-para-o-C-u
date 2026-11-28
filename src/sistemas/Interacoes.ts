import * as THREE from 'three';
import { falante } from '../dialogo/Falantes';
import { Npc } from '../entidades/Npc';
import { IdArea } from '../mundo/Area';
import type { TipoMarca } from '../ui/Minimapa';
import { AJUSTES } from '../config/ajustes';
import { type Sistema, Parte } from './Sistema';

/** As marcas do minimapa, como constantes (para o tipo literal não virar `string` dentro dos `map`). */
export const MARCA = { lugar: 'lugar', pessoa: 'pessoa', saida: 'saida', descanso: 'descanso', nenhum: 'nenhum' } as const;

export interface Interacao {
  pos: () => THREE.Vector3;
  raio: number;
  rotulo: string | (() => string);
  /** A marca no minimapa (`MARCA.nenhum`: não marca). */
  tipo: TipoMarca | 'nenhum' | (() => TipoMarca | 'nenhum');
  agir: () => void;
  /** Só aparece quando isto for verdadeiro. */
  ativa?: () => boolean;
}

/**
 * O que F faz perto de cada coisa: as interações de todas as áreas (as de cada região vêm do módulo dela), a mais
 * próxima do peregrino e a dica na tela.
 */
export class SistemaInteracoes extends Parte implements Sistema {
  /** As interações de cada área. */
  lista: Record<IdArea, Interacao[]> = { vale: [], cripta: [], deserto: [], meiodia: [], cidade: [], palacio: [], bahiabaixa: [], bahiaalta: [], creta: [], navio: [], naufragio: [], malta: [], ermo: [] };

  /** (Re)cria as interações de todas as áreas: as das regiões, as do ermo e o carinho nos bichos mansos. */
  criarInteracoes() {
    for (const id of Object.keys(this.lista) as IdArea[]) this.lista[id] = [];
    for (const m of this.ctx.modulos) Object.assign(this.lista, m.interacoes?.() ?? {});
    this.lista.ermo = this.interacoesDoErmo();
    for (const id of Object.keys(this.lista) as IdArea[]) this.lista[id].push(...this.ctx.fauna.interacoesDaFauna(id));
  }

  /** Diante das capelinhas e dos cruzeiros de beira de estrada: contemplar (o Ink diz o que cada um é). */
  interacoesDoErmo(): Interacao[] {
    return this.ctx.ermo.recheio.beiras.map((b): Interacao => ({
      pos: () => b.pos,
      raio: 3,
      rotulo: b.def.tipo === 'capela' ? 'F: rezar diante da imagem' : 'F: contemplar o cruzeiro',
      tipo: MARCA.lugar,
      agir: () => this.ctx.dialogos.tocar(b.def.id),
    }));
  }

  /** Interação padrão de um NPC: ele se vira e gesticula enquanto a conversa dura. */
  falarCom(npc: Npc): Interacao {
    return {
      pos: () => npc.pos,
      raio: 2.8,
      rotulo: npc.def.rotulo ?? `F: falar com ${falante(npc.def.falante)?.nome ?? npc.def.id}`,
      tipo: MARCA.pessoa,
      agir: () => {
        npc.falando = true;
        this.ctx.conversa.interlocutor = npc;
        this.ctx.dialogos.tocar(npc.def.no, () => (npc.falando = false));
      },
    };
  }

  /** Falar com alguém da cidade (vira para o peregrino enquanto a conversa dura). */
  conversaCom(npc: () => Npc, no: string, rotulo: string | (() => string), raio = 2.6): Interacao {
    return {
      pos: () => npc().pos,
      raio,
      rotulo,
      tipo: MARCA.pessoa,
      agir: () => {
        const n = npc();
        n.falando = true;
        this.ctx.conversa.interlocutor = n;
        this.ctx.dialogos.tocar(no, () => (n.falando = false));
      },
    };
  }

  /** Numa região adormecida, a gente só cumprimenta: a conversa dela é para a hora dela. */
  interacaoDormente(): Interacao | null {
    const p = this.ctx.peregrino.pos;
    let perto: Npc | null = null, dm = 2.2;
    for (const n of Npc.lista) {
      if (!n.visivel) continue;
      const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
      if (d < dm) {
        dm = d;
        perto = n;
      }
    }
    const n = perto;
    if (!n) return null;
    return {
      pos: () => n.pos, raio: 2.2, rotulo: 'F: cumprimentar', tipo: MARCA.lugar,
      agir: () => this.ctx.hud.anunciar('Um aceno, e cada um segue o seu caminho. A história daqui ainda espera a hora dela.', 3),
    };
  }

  interacaoPerto() {
    const p = this.ctx.peregrino.pos;
    const doBarco = this.ctx.navegacao.interacoesDoBarco;
    const perto = (i: Interacao) => (!i.ativa || i.ativa()) && Math.hypot(i.pos().x - p.x, i.pos().z - p.z) < i.raio;
    // a bordo, F só desembarca; junto ao barco, F embarca (antes de tudo o que houver no cais)
    if (this.ctx.barco.aBordo) return doBarco[0];
    if (perto(doBarco[1])) return doBarco[1];
    const daArea = this.interacaoDaArea();
    return daArea ?? doBarco.slice(2).find(perto) ?? null;
  }

  interacaoDaArea() {
    if (this.ctx.regioes.dormente) return this.interacaoDormente();
    const p = this.ctx.peregrino.pos;
    let melhor: Interacao | null = null;
    let dm = Infinity;
    const lista = this.lista[this.ctx.area.id];
    for (const i of lista) {
      if (i.ativa && !i.ativa()) continue;
      const d = Math.hypot(i.pos().x - p.x, i.pos().z - p.z);
      if (d < i.raio && d < dm) {
        dm = d;
        melhor = i;
      }
    }
    return melhor;
  }

  /** A dica na tela: a interação mais próxima, ou o que o peregrino pode fazer ali. */
  atualizar() {
    const per = this.ctx.peregrino, parado = this.ctx.parado, dialogo = this.ctx.emDialogo, sobVerga = this.ctx.controle.sobVerga;
    const i = !parado && per.acao === 'livre' ? this.interacaoPerto() : null;
    if (i) this.ctx.hud.mostrarDica(typeof i.rotulo === 'function' ? i.rotulo() : i.rotulo);
    else if (sobVerga) this.ctx.hud.mostrarDica('De joelhos, pela porta estreita…');
    else if (!parado && !per.ajoelhado && this.ctx.area === this.ctx.mundo && per.pos.distanceTo(this.ctx.mundo.jardim.porta) < 2.6)
      this.ctx.hud.mostrarDica('Segure Z para se ajoelhar e passar pela porta estreita');
    else if (per.acao === 'rezando' && !this.ctx.sacramentos.emConfissao) this.ctx.hud.mostrarDica(this.ctx.oracao.oracaoDobrada() ? 'Rezando (junto à cruz: força em dobro)…' : 'Rezando…');
    else if (!dialogo && this.ctx.estado.energia < AJUSTES.combate.luzCusto) this.ctx.hud.mostrarDica('Pouca energia: pare e segure R para rezar');
    else this.ctx.hud.mostrarDica(null);
  }
}
