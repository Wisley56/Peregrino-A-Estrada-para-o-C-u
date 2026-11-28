import * as THREE from 'three';
import { IdArea } from '../../mundo/Area';
import { TOTAL_SOMBRAS_DESERTO } from '../../mundo/Deserto';
import { Sombra } from '../../entidades/Sombra';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao, BarraDoChefe } from '../Modulo';
import { Parte } from '../../sistemas/Sistema';

/** O Deserto das Vozes e o Poço do Meio-Dia: as vozes e as miragens, Santo Antão, a rocha falsa e a Acídia. */
export class HistoriaDoDeserto extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['deserto', 'meiodia'];

  async carregar() {
    await this.ctx.deserto.povoar();
    this.reiniciar();
  }

  reiniciar() {
    const e = this.ctx.estado;
    this.ctx.deserto.reiniciar(e.sombrasVencidas, e.flags);
    this.ctx.meiodia.reiniciar(e.sombrasVencidas);
  }

  interacoes() {
    const d = this.ctx.deserto, md = this.ctx.meiodia;
    const r: Partial<Record<IdArea, Interacao[]>> = {};
    r.deserto = [
      {
        pos: () => d.poco,
        raio: 2.6,
        rotulo: 'F: descansar junto ao poço',
        tipo: MARCA.descanso,
        agir: () => {
          this.ctx.sacramentos.descansar(d.poco.clone().add(new THREE.Vector3(2, 0, 0)), 'Você bebeu da água do poço. O caminho foi guardado aqui.');
          if (this.ctx.primeiraVez('deserto_poco')) this.ctx.dialogos.tocar('deserto_poco');
        },
      },
      {
        pos: () => d.cruz,
        raio: 2.6,
        rotulo: 'F: contemplar a cruz',
        tipo: MARCA.lugar,
        agir: () => {
          this.ctx.dialogos.tocar('deserto_cruz');
        },
      },
      this.ctx.interacoes.falarCom(d.antao),
      {
        pos: () => d.fogo,
        raio: 2.4,
        rotulo: 'F: descansar junto ao fogo',
        tipo: MARCA.descanso,
        agir: () => this.ctx.sacramentos.descansar(d.fogo.clone().add(new THREE.Vector3(1.6, 0, 1.6)), 'Você descansou com Santo Antão. O caminho foi guardado aqui.'),
      },
      {
        pos: () => d.fimFenda,
        raio: 2.6,
        ativa: () => d.paredeAberta,
        rotulo: 'F: descer ao Poço do Meio-Dia',
        tipo: MARCA.saida,
        agir: () =>
          this.ctx.regioes.trocarArea(md, md.chegada, -Math.PI / 2, () => {
            if (this.ctx.primeiraVez('meiodia_entrou')) this.ctx.dialogos.tocar('meiodia_chegada');
          }),
      },
      ...this.ctx.sacramentos.interacoesDaCapela(d.capela, 'deserto_altar'),
    ];
    r.meiodia = [
      {
        pos: () => md.saida,
        raio: 2.6,
        ativa: () => !md.lutando,
        rotulo: 'F: voltar ao deserto',
        tipo: MARCA.saida,
        agir: () => this.ctx.regioes.trocarArea(d, d.fimFenda.clone().add(new THREE.Vector3(2.5, 0, 0)), Math.PI / 2),
      },
      {
        pos: () => md.poco,
        raio: 3,
        ativa: () => !md.lutando,
        rotulo: () => (md.vencido ? 'F: beber da água viva' : 'F: olhar o poço seco'),
        tipo: () => (md.vencido ? MARCA.descanso : MARCA.lugar),
        agir: () => {
          if (!md.vencido) {
            this.ctx.dialogos.tocar('meiodia_poco_seco');
            return;
          }
          this.ctx.sacramentos.descansar(md.poco.clone().add(new THREE.Vector3(0, 0, 2.6)), 'Você bebeu da água viva. O caminho foi guardado aqui.');
        },
      },
      {
        pos: () => md.obelisco,
        raio: 2.2,
        ativa: () => !md.lutando,
        rotulo: 'F: ler o obelisco',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('meiodia_obelisco'),
      },
    ];
    return r;
  }

  valor(chave: string) {
    return chave === 'miragens' ? this.ctx.deserto.miragensRestantes : undefined;
  }

  cor() {
    return this.sombrasDoDesertoVencidas() / TOTAL_SOMBRAS_DESERTO;
  }

  chefe() {
    return this.ctx.area === this.ctx.meiodia ? this.ctx.meiodia.acedia : null;
  }

  barraDoChefe(): BarraDoChefe | null {
    const a = this.ctx.area === this.ctx.meiodia ? this.ctx.meiodia.acedia : null;
    if (!a || !this.ctx.meiodia.lutando || !a.ativa) return null;
    return { nome: 'ACÍDIA · O DEMÔNIO DO MEIO-DIA', fracao: a.vida / a.vidaMax, protegido: !a.revelado, alerta: a.alerta };
  }

  lutando() {
    return this.ctx.meiodia.lutando;
  }

  aoMorrer() {
    this.ctx.meiodia.reiniciarLuta();
  }

  sombraVencida(s: Sombra) {
    if (s.id !== 'meiodia_acedia') return false;
    this.ctx.meiodia.chefeVencido();
    this.ctx.oracao.torpor = 0;
    this.ctx.marcar('meiodia_vencido');
    this.ctx.agenda.depois(0.9, () => this.acediaVencida());
    return true;
  }

  aposVencerSombra(s: Sombra) {
    if (s.id.startsWith('deserto_') && this.sombrasDoDesertoVencidas() >= TOTAL_SOMBRAS_DESERTO && this.ctx.primeiraVez('deserto_restaurado'))
      this.ctx.dialogos.tocar('deserto_restaurado');
  }

  /** Com a Ciência ligada, a rocha falsa do deserto se revela; no Poço, a Acídia se deixa ver. */
  ciencia(ligada: boolean) {
    if (ligada && this.ctx.area === this.ctx.deserto) {
      const r = this.ctx.deserto.revelar(this.ctx.peregrino.pos, this.ctx.estado.nivel('ciencia') >= 4 ? 45 : 30);
      if (r.parede) {
        this.ctx.marcar('deserto_parede');
        this.ctx.mapas.minimapa.esquecer('deserto');
        this.ctx.mapas.areaNoMapa = '';
        this.ctx.som.dissolver();
        this.ctx.agenda.depois(0.5, () => this.ctx.som.graca());
        this.ctx.efeitos.ouro = 0.8;
        this.ctx.dialogos.tocar('deserto_parede_revelada');
      }
    }
    this.ctx.meiodia.ciencia = this.ctx.dons.tempoCiencia > 0 && this.ctx.area === this.ctx.meiodia;
  }

  naCapela() {
    if (this.ctx.area === this.ctx.deserto && this.ctx.primeiraVez('deserto_capela')) this.ctx.dialogos.tocar('deserto_capela');
  }

  oracaoDobrada(p: THREE.Vector3) {
    if (this.ctx.area !== this.ctx.deserto) return false;
    const d = this.ctx.deserto;
    return p.distanceTo(d.cruz) < 4 || p.distanceTo(d.antao.pos) < 5 || d.capela.dentro(p);
  }

  aoSussurro(texto: string) {
    if (this.ctx.hud.dialogoAberto || this.ctx.dons.tempoCiencia > 0) return; // com a Ciência, as vozes perdem a força
    this.ctx.hud.sussurrar(texto);
    this.ctx.som.sussurro();
    if (this.ctx.primeiraVez('deserto_dica_vozes'))
      this.ctx.agenda.depois(1.5, () => this.ctx.dialogos.tocar('deserto_dica_vozes'));
  }

  aoDesfazerMiragem(porCiencia: boolean) {
    this.ctx.som.dissolver();
    this.ctx.hud.anunciar(porCiencia ? 'A Ciência mostrou a verdade: era uma miragem!' : 'Era uma miragem!', 2.4);
    if (!porCiencia && this.ctx.primeiraVez('deserto_dica_miragem'))
      this.ctx.agenda.depois(0.9, () => this.ctx.dialogos.tocar('deserto_dica_miragem'));
  }

  sombrasDoDesertoVencidas() {
    return [...this.ctx.estado.sombrasVencidas].filter((id) => id.startsWith('deserto_')).length;
  }

  lutaMeioDiaComecou() {
    this.ctx.som.tensao();
    this.ctx.hud.anunciar('Acídia, o Demônio do Meio-Dia', 3);
    if (this.ctx.primeiraVez('meiodia_dica')) this.ctx.dialogos.tocar('meiodia_acedia');
  }

  acediaVencida() {
    this.ctx.efeitos.ouro = 1.4;
    this.ctx.som.graca();
    this.ctx.agenda.depois(0.6, () => this.ctx.som.item());
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar('✦ A acídia se desfez ao sol', 3);
    this.ctx.dialogos.tocar('meiodia_vencido');
  }
}
