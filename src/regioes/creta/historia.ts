import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { IdArea } from '../../mundo/Area';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao } from '../Modulo';
import { Parte } from '../../sistemas/Sistema';

/** Creta, nos Bons Portos: a casa de Paulo, Laseia, o conselho no cais e o embarque (At 27,7-13). */
export class HistoriaDeCreta extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['creta'];
  /** Creta já pôs cada um no seu lugar conforme as flags? (Refeito ao entrar e depois do conselho.) */
  cretaArrumada = false;

  interacoes() {
    return { creta: this.interacoesDeCreta() };
  }

  evento(nome: EventoInk) {
    return this.eventoDeCreta(nome);
  }

  /** Ao entrar (e depois do conselho), cada um vai para o seu lugar conforme as flags. */
  atualizarAntes() {
    if (this.ctx.area === this.ctx.creta && !this.ctx.regioes.dormente && !this.cretaArrumada && !this.ctx.hud.dialogoAberto) {
    this.cretaArrumada = true;
    this.ctx.creta.arrumar((x) => this.ctx.estado.flags.has(x));
    }
  }

  /** O Mar da Tempestade só recupera a cor em Malta, depois do naufrágio. */
  cor() {
    return this.ctx.estado.flags.has('mar_restaurado') ? 1 : 0;
  }

  rumo() {
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    const k = this.ctx.creta;
    if (!tem('creta_paulo_conheceu')) return k.casaDePaulo;
    if (!tem('creta_conselho')) return k.paulo.pos;
    return k.prancha;
  }

  /** Efeitos pedidos pelo roteiro de Creta. Devolve true se o evento era daqui. */
  eventoDeCreta(nome: EventoInk) {
    if (nome === 'paulo_ao_cais') {
      this.ctx.creta.levarPauloAoCais();
      return true;
    }
    // decidida a partida (At 27,12-13): Paulo e os companheiros embarcam quando a conversa acabar
    if (nome === 'conselho') {
      this.ctx.marcar('creta_conselho');
      this.cretaArrumada = false;
      return true;
    }
    return false;
  }

  /** Creta: a gente do porto e de Laseia, a porta da casa onde Paulo reza e o barco de volta à Bahia. */
  interacoesDeCreta(): Interacao[] {
    const k = this.ctx.creta;
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    k.aoChegarPaulo = () => this.ctx.marcar('creta_paulo_no_cais');
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.ctx.interacoes.falarCom(n), ativa: () => n.raiz.visible })),
      // Paulo reza lá dentro; quem bate o faz abrir a porta
      {
        pos: () => k.casaDePaulo,
        raio: 2.2,
        ativa: () => !f('creta_paulo_conheceu'),
        rotulo: 'F: bater à porta',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('creta_casa_paulo', () => {
          k.pauloNaPorta();
          this.ctx.interacoes.falarCom(k.paulo).agir();
        }),
      },
      {
        pos: () => k.prancha,
        raio: 2.2,
        ativa: () => f('creta_conselho'),
        rotulo: 'F: embarcar com Paulo',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('creta_embarcar', () => this.ctx.historias.navio.embarcar()),
      },
      { pos: () => k.barcoDeVolta, raio: 3, rotulo: 'F: voltar de barco à Bahia', tipo: MARCA.saida, agir: () => this.ctx.dialogos.tocar('creta_barco_volta', () => this.ctx.viagem.fazerViagem()) },
    ];
  }
}
