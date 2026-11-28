import * as THREE from 'three';
import { QUADRA_MAPA, quadraDoMapa } from '../core/Estado';
import { REGIOES } from '../historia/Regioes';
import { Area } from '../mundo/Area';
import { PONTOS_DE_VIAGEM, pontoDeViagem } from '../mundo/aberto/Geografia';
import { MapaMundi } from '../ui/MapaMundi';
import type { CapelaRegional } from '../mundo/Capela';
import { Parte } from './Sistema';

/** O mapa-múndi, a descoberta dos pontos de viagem e a viagem rápida (a do mapa e a dos barcos da história). */
export class SistemaViagem extends Parte {
  mapaDoMundo: MapaMundi | null = null;
  /** O mapa-múndi (feito na primeira vez que se pede: precisa do terreno do mundo). */
  get mapaMundi() {
    return (this.mapaDoMundo ??= new MapaMundi({
      terreno: this.ctx.terrenoMundo,
      regioes: () => this.ctx.regioes.regioesAbertas().flatMap((a) => {
        const c = this.ctx.terrenoMundo.carimboDe(a.id);
        if (!c) return [];
        const flag = REGIOES[a.id].restauracao;
        return [{ id: a.id, nome: REGIOES[a.id].nome, x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, visitada: this.ctx.estado.visitadas.has(a.id), restaurada: !!flag && this.ctx.estado.flags.has(flag) }];
      }),
      pontos: () => PONTOS_DE_VIAGEM.flatMap((def) => {
        const l = this.ctx.estado.pontos.has(def.id) ? this.lugarDoPonto(def.id) : null;
        return l ? [{ id: def.id, nome: def.nome, tipo: def.tipo, regiao: REGIOES[def.area].nome, x: l.pos.x, z: l.pos.z }] : [];
      }),
      quadras: () => this.ctx.estado.mapaVisto,
      barco: () => ({ x: this.ctx.barco.pos.x, z: this.ctx.barco.pos.z }),
      peregrino: () => (this.ctx.regioes.aberto ? { x: this.ctx.peregrino.pos.x, z: this.ctx.peregrino.pos.z, rumo: this.ctx.peregrino.rumo } : null),
      ondeEsta: () => (this.ctx.regioes.aberto ? `Você está em: ${REGIOES[this.ctx.regioes.areaDaRegiao().id].nome}` : `Você está em: ${REGIOES[this.ctx.area.id].nome} (um lugar à parte, fora do mapa)`),
      estrela: () => {
        if (this.ctx.estado.nivel('conselho') < 2) return null;
        const r = this.ctx.mapas.rumoDoCaminho();
        return r ? { x: r.x, z: r.z } : null;
      },
      viajar: (id) => {
        const motivo = this.motivoParaNaoViajar();
        if (motivo) return motivo;
        this.ctx.menus.fecharMapa();
        this.viajarPara(id);
        return null;
      },
      fechar: () => this.ctx.menus.fecharMapa(),
    }));
  }

  /** O ponto de viagem para onde o barco vai quando a conversa da partida acabar (`~ evento("viajar_<ponto>")`). */
  proxima: string | null = null;

  /** Faz a viagem escolhida na conversa do barco (depois que a caixa fecha). O Ink só oferece os portos permitidos. */
  fazerViagem() {
    const destino = this.proxima;
    this.proxima = null;
    if (!destino) return;
    const area = pontoDeViagem(destino)?.area;
    const anuncio = area === 'creta' ? 'O saveiro sai da baía, mar afora…' : area === 'malta' ? 'O barco vai mar afora, até a ilha de Malta…' : undefined;
    this.viajarPara(destino, { forcar: true, anuncio });
  }

  /**
   * Onde cada ponto de viagem fica no chão e para onde o peregrino olha ao chegar. As capelas: diante da porta, de
   * frente para ela; os cais: no lugar de embarcar.
   */
  lugarDoPonto(id: string): { area: Area; pos: THREE.Vector3; rumo: number } | null {
    const def = pontoDeViagem(id);
    if (!def) return null;
    if (!def.lugar) {
      // as capelinhas e os cruzeiros de beira de estrada: diante deles, de frente para a imagem
      const b = this.ctx.ermo.recheio.beiras.find((q) => q.def.id === id);
      return b ? { area: this.ctx.ermo, pos: b.diante.clone(), rumo: b.rumoDiante } : null;
    }
    const { marco, desvio = [0, 0], rumo } = def.lugar;
    const area = this.ctx.regioes.areaPorId(def.area);
    // o marco é uma posição que a área expõe com esse nome; "capela" é diante da porta da capela da região
    const base = marco === 'capela'
      ? (area as Area & { capela: CapelaRegional }).capela.porta.clone().add(new THREE.Vector3(0, 0, 5))
      : (area as unknown as Record<string, THREE.Vector3 | undefined>)[marco]?.clone();
    if (!base) throw new Error(`ponto de viagem ${id}: a área ${def.area} não tem o marco "${marco}"`);
    const RUMO = { norte: Math.PI, sul: 0, leste: Math.PI / 2, oeste: -Math.PI / 2 };
    return { area, pos: base.add(new THREE.Vector3(desvio[0], 0, desvio[1])), rumo: RUMO[rumo] };
  }

  /**
   * A cada meio segundo no mundo aberto: a quadra em que se pisa fica vista no mapa, e o ponto de viagem a menos de
   * 14 m fica descoberto (com aviso). Vale também numa região adormecida: conhecer o lugar não depende da história.
   */
  descobrirPelaVolta() {
    const p = this.ctx.peregrino.pos, e = this.ctx.estado;
    for (let di = -2; di <= 2; di++)
      for (let dj = -2; dj <= 2; dj++) if (di * di + dj * dj <= 5) e.mapaVisto.add(quadraDoMapa(p.x + di * QUADRA_MAPA, p.z + dj * QUADRA_MAPA));
    for (const def of PONTOS_DE_VIAGEM) {
      if (e.pontos.has(def.id)) continue;
      const l = this.lugarDoPonto(def.id);
      if (!l || Math.hypot(l.pos.x - p.x, l.pos.z - p.z) > 14) continue;
      e.pontos.add(def.id);
      e.salvar();
      this.ctx.som.graca();
      this.ctx.hud.anunciar(`Lugar de viagem: ${def.nome}. Pelo mapa, o Espírito leva até aqui.`, 3);
    }
  }

  /** Alguma luta com chefão em andamento. */
  get emLuta() {
    return this.ctx.modulos.some((m) => m.lutando?.());
  }

  /** Por que não dá para viajar agora (ou null, se dá). */
  motivoParaNaoViajar(): string | null {
    if (this.ctx.transitando) return 'Espere a passagem terminar.';
    if (this.ctx.dialogos.ocupado || this.ctx.hud.dialogoAberto) return 'Termine a conversa primeiro.';
    if (this.emLuta) return 'Não no meio da luta.';
    if (this.ctx.peregrino.carregando || this.ctx.nasCostas) return 'Não com alguém (ou algo) nas costas: o caminho daqui é a pé.';
    // as cenas roteirizadas (o navio na tempestade, o naufrágio até a Ira cair): cada região diz as suas
    for (const m of this.ctx.modulos) {
      const motivo = m.bloqueiaViagem?.();
      if (motivo) return motivo;
    }
    return null;
  }

  /**
   * A viagem rápida: escurece e leva a um ponto de viagem descoberto. `forcar` (a viagem da história e a dos barcos,
   * que o Ink já filtrou) dispensa a descoberta e as recusas. Chegando a uma região acordada pela primeira vez, a
   * fala de chegada toca como se tivesse vindo a pé. Devolve se a viagem começou.
   */
  viajarPara(id: string, o: { forcar?: boolean; anuncio?: string } = {}) {
    const lugar = this.lugarDoPonto(id);
    if (!lugar) return false;
    const motivo = o.forcar ? (this.ctx.transitando ? 'ocupado' : null) : !this.ctx.estado.pontos.has(id) ? 'Esse lugar ainda não foi descoberto.' : this.motivoParaNaoViajar();
    if (motivo) {
      if (!o.forcar) this.ctx.hud.anunciar(motivo, 2.4);
      return false;
    }
    if (o.anuncio) this.ctx.hud.anunciar(o.anuncio, 2);
    this.ctx.regioes.trocarArea(lugar.area, lugar.pos, lugar.rumo, () => {
      this.ctx.estado.pontos.add(id);
      this.ctx.estado.salvar();
      if (this.ctx.regioes.regioesAbertas().includes(lugar.area) && this.ctx.regioes.acordada(lugar.area.id)) this.ctx.regioes.chegouAndando(lugar.area);
    });
    return true;
  }
}
