import * as THREE from 'three';
import type { EventoInk } from '../historia/EventosInk';
import type { Passo } from '../dialogo/Dialogos';
import { CameraConversa, type PlanoConversa } from '../core/CameraConversa';
import { Npc } from '../entidades/Npc';
import { pontoDeViagem } from '../mundo/aberto/Geografia';
import { Parte } from './Sistema';

/**
 * As conversas: a ponte com o Ink (os `valor` e os `evento` que os roteiros pedem) e a câmera de conversa, com quem
 * fala, os gestos e os planos.
 */
export class SistemaConversa extends Parte {
  /** Câmera de conversa: planos e contraplanos durante os diálogos com NPCs. */
  cameraConversa = new CameraConversa();
  /** Com quem o peregrino está conversando (o corpo do NPC que fala), ou null. */
  interlocutor: Npc | null = null;
  /** NPCs que a conversa virou para o peregrino (e que voltam ao que faziam quando ela acaba). */
  viradosNaConversa = new Set<Npc>();
  /** Quem está com a palavra no plano de perto. */
  vezDe: 'npc' | 'peregrino' = 'npc';

  /** Números que o roteiro pede com `valor("chave")`: os gerais aqui, os de cada região no módulo dela. */
  valorDialogo(chave: string): number {
    if (chave === 'peso') return this.ctx.estado.peso;
    if (chave === 'energia') return Math.floor(this.ctx.estado.energia);
    for (const m of this.ctx.modulos) {
      const v = m.valor?.(chave);
      if (v !== undefined) return v;
    }
    if (import.meta.env.DEV) console.warn(`[ink] valor desconhecido: ${chave}`);
    return 0;
  }

  /** Um `~ evento("nome")` do Ink (o build só deixa passar os de `src/historia/EventosInk.ts`). */
  eventoDialogo(nome: EventoInk) {
    this.ctx.eventos.emitir('eventoInk', { nome });
    if (nome === 'absolvicao') {
      const cap = this.ctx.area.capela;
      if (cap) this.ctx.sacramentos.confessar(cap.confessionario.clone());
      return;
    }
    if (nome === 'dom_ciencia') {
      this.ctx.marcar('dom_ciencia');
      this.ctx.som.item();
      this.ctx.efeitos.ouro = 1.2;
      this.ctx.graca.tempoColuna = 0;
      this.ctx.hud.anunciar('Você recebeu o dom da Ciência!', 3.5);
      return;
    }
    // a viagem escolhida na conversa do barco: parte quando a caixa fechar (`fazerViagem`)
    if (nome.startsWith('viajar_') && pontoDeViagem(nome.slice(7))) {
      this.ctx.viagem.proxima = nome.slice(7);
      return;
    }
    for (const m of this.ctx.modulos) if (m.evento?.(nome)) return;
    if (import.meta.env.DEV) console.warn(`[ink] evento desconhecido: ${nome}`);
  }

  /**
   * Uma fala apareceu: acha o corpo de quem fala, passa a palavra (gestos, boca) e escolhe o plano da câmera de
   * conversa.
   */
  aoFalar(p: Passo, segundos: number) {
    const per = this.ctx.peregrino.pos;
    const corpo = p.id ? Npc.doFalante(p.id, per) : null;
    if (corpo && corpo !== this.interlocutor) {
      this.interlocutor?.calar();
      this.interlocutor = corpo;
    } else if (!corpo) this.interlocutor?.calar();
    if (corpo) {
      if (!corpo.falando) {
        corpo.falando = true;
        this.viradosNaConversa.add(corpo);
      }
      corpo.fala(segundos, p.gestos.find((g) => g.quem === null)?.gesto);
    }
    for (const g of p.gestos) if (g.quem) Npc.doFalante(g.quem, per)?.gestos.tocar(g.gesto);

    const i = this.interlocutor;
    if (!i || !this.conversaPermitida()) return;
    this.vezDe = 'npc';
    // sem corpo (o Espírito Santo, uma placa): fica no plano em que está, ou abre no geral
    const plano: PlanoConversa | null =
      p.plano === 'geral' ? 'geral' : p.plano === 'perto' ? (corpo ? 'perto' : null) : corpo ? 'npc' : null;
    // uma conversa nova pode começar enquanto a anterior ainda sai de cena: recomeça do plano dela
    if (!this.cameraConversa.emConversa) this.cameraConversa.comecar(this.ctx.camera.cam.position, this.olhosPeregrino(), i.olhos(), plano ?? 'geral');
    else if (plano) this.cameraConversa.mudar(plano);
  }

  /** As escolhas apareceram: o contraplano, no peregrino. */
  aoEscolhasDaConversa() {
    this.interlocutor?.calar();
    this.vezDe = 'peregrino';
    if (this.cameraConversa.emConversa) this.cameraConversa.mudar('peregrino');
  }

  /** A câmera de conversa só entra fora de luta, de confissão e de queda, e se o jogador a quiser. */
  conversaPermitida() {
    const i = this.interlocutor;
    return (
      this.ctx.prefs.cameraConversa && !!i && !this.ctx.sacramentos.emConfissao && !this.ctx.combate.travado && !this.ctx.morrendo && !this.ctx.transitando &&
      i.pos.distanceTo(this.ctx.peregrino.pos) < 8
    );
  }

  olhosPeregrino() {
    return this.ctx.peregrino.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
  }

  /** Atualiza a câmera de conversa por cima da de jogo (depois que ela se posicionou neste quadro). */
  atualizarConversa(dt: number, altura: (x: number, z: number) => number) {
    if (!this.ctx.hud.dialogoAberto && (this.interlocutor || this.viradosNaConversa.size)) {
      this.interlocutor?.calar();
      this.interlocutor = null;
      for (const n of this.viradosNaConversa) n.falando = false;
      this.viradosNaConversa.clear();
    }
    if (this.cameraConversa.emUso && !(this.ctx.hud.dialogoAberto && this.conversaPermitida())) this.cameraConversa.terminar();
    const livre = (de: THREE.Vector3, para: THREE.Vector3) => {
      for (let k = 0; k <= 12; k++) {
        const x = de.x + (para.x - de.x) * (k / 12) * 0.85;
        const y = de.y + (para.y - de.y) * (k / 12) * 0.85;
        const z = de.z + (para.z - de.z) * (k / 12) * 0.85;
        if (altura(x, z) + 0.12 > y) return false;
      }
      return true;
    };
    const i = this.interlocutor;
    const elenco = i ? { peregrino: this.olhosPeregrino(), corpoPeregrino: this.ctx.peregrino.raiz, npc: i.olhos(), corpoNpc: i.raiz } : null;
    this.cameraConversa.atualizar(dt, this.ctx.camera.cam, elenco, livre, this.vezDe);
    document.body.classList.toggle('em-conversa', this.cameraConversa.peso > 0.02);
  }
}
