import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { IdArea } from '../../mundo/Area';
import { etapaDoNaufragio, ID_IRA } from '../../mundo/Naufragio';
import { BRASA_MANSA } from '../../entidades/Ira';
import { Sombra } from '../../entidades/Sombra';
import type { Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao, BarraDoChefe } from '../Modulo';
import type { Impacto, InfoJogador } from '../../entidades/Guardiao';
import { Parte } from '../../sistemas/Sistema';

/** O naufrágio e a Ira (At 27,39-44): o encalhe, os presos, a brasa da ira no peito e a resposta branda. */
export class HistoriaDoNaufragio extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['naufragio'];
  naufragioArrumado = false;
  /** A brasa da ira no peito do peregrino (0 a 100): sobe quando ele revida ou é provocado, esfria rezando. */
  brasa = 0;
  /** A brasa encheu: até esfriar abaixo da metade, os golpes dele alimentam a Ira. */
  irado = false;

  carregar() {
    this.reiniciar();
  }

  reiniciar() {
    const e = this.ctx.estado;
    this.ctx.naufragio.reiniciar(e.sombrasVencidas, (x) => e.flags.has(x));
    this.naufragioArrumado = false;
    this.brasa = 0;
    this.irado = false;
  }

  interacoes() {
    return { naufragio: this.interacoesDoNaufragio() };
  }

  evento(nome: EventoInk) {
    return this.eventoDoNaufragio(nome);
  }

  atualizarAntes(dt: number) {
    if (this.ctx.area === this.ctx.naufragio && !this.ctx.regioes.dormente) this.atualizarNaufragio(dt);
    else this.ctx.hud.mostrarBrasa(null);
  }

  cor() {
    return this.ctx.estado.flags.has('mar_restaurado') ? 1 : 0;
  }

  chefe() {
    return this.ctx.area === this.ctx.naufragio ? this.ctx.naufragio.chefe : null;
  }

  barraDoChefe(): BarraDoChefe | null {
    const ir = this.ctx.area === this.ctx.naufragio ? this.ctx.naufragio.chefe : null;
    if (!ir || !this.ctx.naufragio.lutando || !ir.ativa) return null;
    return { nome: 'A IRA · A TEMPESTADE DO CORAÇÃO', fracao: ir.vida / ir.vidaMax, protegido: !ir.exposta, alerta: ir.alerta };
  }

  lutando() {
    return this.ctx.naufragio.lutando;
  }

  aoMorrer() {
    this.ctx.naufragio.reiniciarLuta();
    this.brasa = 0;
    this.irado = false;
  }

  sombraVencida(s: Sombra) {
    if (s.id !== ID_IRA) return false;
    this.ctx.naufragio.chefeVencido();
    this.brasa = 0;
    this.irado = false;
    this.ctx.marcar('naufragio_ira_vencida');
    this.ctx.agenda.depois(1.8, () => this.iraVencida());
    return true;
  }

  /** A Ira sente a brasa no peito do peregrino. */
  sentidos(): Partial<InfoJogador> {
    return { brasa: this.brasa, irado: this.irado };
  }

  impacto(imp: Impacto) {
    if (imp.brasa) this.acenderBrasa(imp.brasa);
  }

  rumo() {
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    const k = this.ctx.naufragio, e = etapaDoNaufragio(tem);
    if (e === 'presos') return k.proa;
    if (e === 'ira') return k.lutando && k.chefe ? k.chefe.pos : k.arenaEntrada;
    return k.praia;
  }

  /** Até a Ira cair, a cena do naufrágio não deixa viajar. */
  bloqueiaViagem() {
    return this.ctx.area === this.ctx.naufragio && !this.ctx.estado.flags.has('naufragio_ira_vencida') ? 'Agora não: a história daqui ainda não terminou.' : null;
  }

  /** O dia raiou: cortam as âncoras, içam a vela da proa, e o navio encalha no banco de areia (At 27,40-41). */
  encalhar() {
    this.ctx.marcar('naufragio_encalhou');
    this.ctx.hud.anunciar('Cortam as âncoras, soltam os lemes e içam a vela da proa…', 2.6);
    this.ctx.som.vagalhao();
    this.ctx.regioes.trocarArea(this.ctx.naufragio, this.ctx.naufragio.chegada, Math.PI, () => {
      this.naufragioArrumado = false;
      this.ctx.som.trovao();
      this.ctx.som.vagalhao();
      this.ctx.combate.tremer(1, 1, 700);
      this.ctx.dialogos.tocar('naufragio_encalhe');
    });
  }

  /** O que o roteiro do naufrágio pede. Devolve true se o evento era daqui. */
  eventoDoNaufragio(nome: EventoInk) {
    if (nome !== 'presos') return false;
    this.ctx.marcar('naufragio_presos');
    // quando a conversa fechar: todos se lançam ao mar (At 27,43-44)
    this.ctx.aposDialogo = () => {
      this.ctx.hud.escurecer(true);
      this.ctx.agenda.depois(0.9, () => {
        this.naufragioArrumado = false;
        this.ctx.som.respingo();
        this.ctx.hud.escurecer(false);
        this.ctx.hud.anunciar('Todos se lançam ao mar. Desça pela brecha da borda e vá até a praia.', 3.6);
      });
    };
    return true;
  }

  /** A cada quadro no naufrágio: arruma a etapa, cuida da brasa e mostra a barra dela na luta. */
  atualizarNaufragio(dt: number) {
    const k = this.ctx.naufragio, per = this.ctx.peregrino;
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    if (!this.naufragioArrumado && !this.ctx.hud.dialogoAberto && !this.ctx.transitando) {
      this.naufragioArrumado = true;
      k.arrumar(tem);
    }
    if (this.ctx.aposDialogo && !this.ctx.hud.dialogoAberto) {
      const f = this.ctx.aposDialogo;
      this.ctx.aposDialogo = null;
      f();
    }
    k.pausa = this.ctx.hud.dialogoAberto || this.ctx.transitando || this.ctx.morrendo;
    // a brasa esfria sozinha devagar, e depressa na oração ("não se ponha o sol sobre a vossa ira")
    if (!k.pausa) {
      const esfria = per.acao === 'rezando' ? 22 : 2.5;
      this.brasa = Math.max(0, this.brasa - esfria * dt);
      if (this.irado && this.brasa < 50) {
        this.irado = false;
        this.ctx.hud.anunciar('A brasa esfriou. Agora, mansidão.', 1.8);
      }
    }
    this.ctx.hud.mostrarBrasa(k.lutando ? this.brasa / 100 : null, this.irado);
  }

  /** A brasa sobe (ou desce): com ela cheia, o peregrino fica irado. */
  acenderBrasa(quanto: number) {
    if (this.ctx.area !== this.ctx.naufragio || !this.ctx.naufragio.lutando) return;
    this.brasa = Math.max(0, Math.min(100, this.brasa + quanto));
    if (quanto > 0 && this.brasa >= 100 && !this.irado) {
      this.irado = true;
      this.ctx.som.tensao();
      this.ctx.hud.anunciar('Você está irado: cada golpe seu alimenta a Ira. Pare e reze (R) para esfriar.', 3);
    } else if (quanto > 0 && this.brasa >= BRASA_MANSA && !this.irado && this.ctx.primeiraVez('naufragio_dica_brasa'))
      this.ctx.hud.sussurrar('Sinto o sangue subir...', 2.4);
  }

  /** A Ira subiu da água. */
  lutaDaIraComecou() {
    this.ctx.som.tensao();
    const f = this.ctx.estado.flags;
    // quem já respondeu à raiva com raiva começa com a brasa acesa
    this.brasa = (f.has('creta_conselho_ira') ? 15 : 0) + (f.has('navio_gritou') ? 15 : 0) + (f.has('naufragio_presos_ira') ? 15 : 0);
    this.irado = false;
    this.ctx.hud.anunciar('A Ira', 3);
    if (this.ctx.primeiraVez('naufragio_ira_dica')) this.ctx.dialogos.tocar('naufragio_ira');
  }

  /** A Ira se desfez: o mar se acalma e todos chegam salvos à praia (At 27,44). */
  iraVencida() {
    this.ctx.efeitos.ouro = 1.4;
    this.ctx.som.graca();
    this.ctx.agenda.depois(0.6, () => this.ctx.som.item());
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar('✦ A tempestade se desfez: a resposta branda aplacou o furor', 3.4);
    this.ctx.dialogos.tocar('naufragio_ira_vencida', () => {
      this.ctx.hud.escurecer(true);
      this.ctx.agenda.depois(1, () => {
        this.ctx.naufragio.arrumar((x) => this.ctx.estado.flags.has(x));
        const p = this.ctx.naufragio.praia.clone();
        p.z += 2;
        this.ctx.peregrino.teleportar(p.x, this.ctx.naufragio.altura(p.x, p.z), p.z);
        this.ctx.peregrino.rumo = Math.PI;
        this.ctx.camera.guinada = 0;
        this.ctx.camera.reposicionar();
        this.ctx.estado.checkpoint = [p.x, this.ctx.naufragio.altura(p.x, p.z), p.z];
        this.ctx.estado.checkpointArea = 'naufragio';
        this.ctx.estado.salvar();
        this.ctx.hud.escurecer(false);
        const paulo = this.ctx.naufragio.paulo;
        paulo.falando = true;
        this.ctx.conversa.interlocutor = paulo;
        this.ctx.dialogos.tocar('naufragio_praia', () => {
          paulo.falando = false;
          this.ctx.historias.malta.irParaMalta();
        });
      });
    });
  }

  /** Interações no naufrágio: a gente (os soldados, Júlio e os presos abrem a cena da proa). */
  interacoesDoNaufragio(): Interacao[] {
    const k = this.ctx.naufragio;
    k.aoTrovejar = () => this.ctx.som.trovao();
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.ctx.interacoes.falarCom(n), ativa: () => n.raiz.visible && !k.lutando })),
    ];
  }
}
