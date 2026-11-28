import * as THREE from 'three';
import type { CapelaRegional } from '../mundo/Capela';
import { MARCA, type Interacao } from './Interacoes';
import { Parte } from './Sistema';

/** Os sacramentos e o descanso: a confissão, a Eucaristia, o sacrário e os lugares que guardam o caminho. */
export class SistemaSacramentos extends Parte {
  /** Ajoelhado no confessionário, conversando com o padre. */
  emConfissao = false;

  /** Confessionário, sacrário e altar de uma capela de região. `noAltar`: o que o Espírito diz no altar. */
  interacoesDaCapela(cap: CapelaRegional, noAltar: string): Interacao[] {
    return [
      {
        pos: () => cap.confessionario,
        raio: 1.5,
        rotulo: 'F: entrar no confessionário',
        tipo: MARCA.lugar,
        agir: () => this.entrarNoConfessionario(cap),
      },
      {
        pos: () => cap.sacrario,
        raio: 1.9,
        rotulo: 'F: ajoelhar-se diante do sacrário',
        tipo: MARCA.descanso,
        agir: () => this.ctx.dialogos.tocar('capela_sacrario'),
      },
      {
        pos: () => cap.altar,
        raio: 1.6,
        rotulo: () => (this.ctx.estado.confessado && !this.ctx.estado.comungou ? 'F: comungar' : 'F: ajoelhar-se diante do altar'),
        tipo: MARCA.descanso,
        agir: () => {
          this.comungar();
          this.ctx.dialogos.tocar(noAltar);
        },
      },
    ];
  }

  /**
   * Confessionário: guarda o caminho como um descanso e põe o peregrino em estado de graça,
   * o que o deixa comungar no altar. Cada capela de região tem um.
   */
  confessar(lugar: THREE.Vector3) {
    this.ctx.estado.confessado = true;
    this.descansar(lugar, 'Absolvição: os pecados foram perdoados e o caminho foi guardado aqui.');
  }

  /**
   * Cena de confissão: o peregrino entra no lado do penitente, ajoelha-se diante da grade e conversa com o
   * padre. A absolvição (~ evento("absolvicao") no roteiro) é que o põe em estado de graça; sair no meio não vale.
   */
  entrarNoConfessionario(cap: CapelaRegional) {
    const per = this.ctx.peregrino;
    const j = cap.joelhoConfissao, g = cap.gradeConfissao;
    this.emConfissao = true;
    per.teleportar(j.x, this.ctx.area.altura(j.x, j.z), j.z);
    per.rumo = Math.atan2(g.x - j.x, g.z - j.z);
    per.iniciar('rezando');
    cap.padre.falando = true;
    // o roteiro da confissão é um só; quem fala por "padre" é o confessor desta capela
    this.ctx.dialogos.apelidos = { padre: cap.padre.def.falante };
    this.ctx.dialogos.tocar('capela_confissao', () => {
      this.emConfissao = false;
      cap.padre.falando = false;
      this.ctx.dialogos.apelidos = {};
      per.acao = 'livre';
    });
  }

  /**
   * Eucaristia: em estado de graça, o altar dá um coração dourado a mais até a próxima queda e
   * restaura tudo. Sem confissão, o Espírito lembra (uma vez) que ela vem antes.
   */
  comungar() {
    const e = this.ctx.estado;
    if (!e.confessado) {
      if (!e.comungou && this.ctx.primeiraVez('capela_sem_confissao')) this.ctx.dialogos.tocar('capela_sem_confissao');
      return;
    }
    if (e.comungou) {
      e.restaurar();
      return;
    }
    e.comungou = true;
    e.restaurar();
    e.salvar();
    this.ctx.efeitos.ouro = 1.1;
    this.ctx.som.graca();
    this.ctx.hud.anunciar('💛 Eucaristia: um coração a mais até a próxima queda.', 3.2);
    if (this.ctx.primeiraVez('capela_comunhao')) this.ctx.dialogos.tocar('capela_comunhao');
  }

  descansar(lugar: THREE.Vector3, msg: string) {
    lugar.y = this.ctx.area.altura(lugar.x, lugar.z);
    this.ctx.estado.checkpoint = lugar.toArray() as [number, number, number];
    this.ctx.estado.checkpointArea = this.ctx.area.id;
    this.ctx.estado.restaurar();
    this.ctx.estado.salvar();
    this.ctx.efeitos.ouro = 0.6;
    this.ctx.som.graca();
    this.ctx.hud.anunciar(msg, 3);
  }
}
