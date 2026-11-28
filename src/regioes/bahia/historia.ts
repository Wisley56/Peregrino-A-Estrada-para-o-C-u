import * as THREE from 'three';
import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { Area, IdArea } from '../../mundo/Area';
import { SUJEIRAS } from '../../mundo/Hospital';
import { menino } from '../../entidades/Dulce';
import { ENFERMOS, corpoDoEnfermo, enfermo, registrarRetratosDosEnfermos } from '../../entidades/Enfermos';
import { BahiaAlta, BahiaBaixa } from '../../mundo/Bahia';
import { ID_CORACAO } from '../../mundo/LargoDoCruzeiro';
import { Sombra } from '../../entidades/Sombra';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao, BarraDoChefe } from '../Modulo';
import { Parte } from '../../sistemas/Sistema';

/**
 * As Ruas da Bahia (a Cidade Baixa e a Alta): Irmã Dulce e o menino, os esquecidos levados ao abrigo, o galinheiro
 * que vira hospital, o comerciante, o Bonfim e a Sala dos Milagres, e o Coração de Pedra no Largo do Cruzeiro.
 */
export class HistoriaDaBahia extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['bahiabaixa', 'bahiaalta'];
  /** O enfermo que se está socorrendo (o diálogo dele pede `carregar_enfermo` no fim). */
  enfermoAtual: string | null = null;

  carregar() {
    this.reiniciar();
    registrarRetratosDosEnfermos();
  }

  reiniciar() {
    const e = this.ctx.estado;
    this.ctx.bahiaBaixa.reiniciar(e.sombrasVencidas, e.flags);
    this.ctx.bahiaAlta.reiniciar(e.sombrasVencidas, e.flags);
  }

  interacoes() {
    return { bahiabaixa: this.interacoesDaBahiaBaixa(), bahiaalta: this.interacoesDaBahiaAlta() };
  }

  evento(nome: EventoInk) {
    return this.eventoDaBahia(nome);
  }

  atualizarDepois() {
    this.atualizarBahia();
  }

  cor() {
    return this.corDaBahia();
  }

  chefe() {
    return this.ctx.area === this.ctx.bahiaAlta ? this.ctx.bahiaAlta.largo.chefe : null;
  }

  barraDoChefe(): BarraDoChefe | null {
    const lg = this.ctx.area === this.ctx.bahiaAlta ? this.ctx.bahiaAlta.largo : null;
    if (!lg?.chefe || !lg.lutando || !lg.chefe.ativa) return null;
    return { nome: 'O CORAÇÃO DE PEDRA · A DUREZA DE CORAÇÃO', fracao: lg.chefe.vida / lg.chefe.vidaMax, protegido: !lg.chefe.exposto, alerta: lg.chefe.alerta };
  }

  lutando() {
    return this.ctx.bahiaAlta.largo.lutando;
  }

  aoMorrer() {
    this.ctx.bahiaAlta.largo.reiniciarLuta();
  }

  sombraVencida(s: Sombra) {
    if (s.id !== ID_CORACAO) return false;
    this.ctx.bahiaAlta.largo.chefeVencido();
    this.ctx.oracao.indiferenca = 0;
    this.ctx.marcar('bahia_coracao_vencido');
    this.ctx.agenda.depois(1.8, () => this.coracaoVencido());
    return true;
  }

  /** A viagem até a Bahia é longa: o peregrino chega adulto (os anos passam num escuro breve). */
  chegouAndando(a: Area, fala: () => void) {
    if (a !== this.ctx.bahiaBaixa && a !== this.ctx.bahiaAlta) return false;
    if (this.ctx.estado.flags.has('peregrino_adulto')) {
      fala();
      return true;
    }
    this.ctx.estado.flags.add('peregrino_adulto');
    this.ctx.transitando = true;
    this.ctx.hud.escurecer(true);
    this.ctx.agenda.depois(0.9, () => {
      if (this.ctx.regioes.idadeDaHistoria() !== this.ctx.regioes.idadeVestida) this.ctx.regioes.vestirPeregrino();
      this.ctx.hud.escurecer(false);
      this.ctx.transitando = false;
      this.ctx.hud.anunciar('Os anos passaram pelo caminho…', 2.6);
      fala();
    });
    return true;
  }

  /** No Bonfim: a primeira vez na nave e a primeira vez na Sala dos Milagres. */
  naCapela() {
    if (this.ctx.area !== this.ctx.bahiaBaixa) return;
    if (this.ctx.primeiraVez('bahia_bonfim_entrou')) this.ctx.dialogos.tocar('bahia_bonfim_entrada');
    else if (this.ctx.bahiaBaixa.capela.naSala(this.ctx.peregrino.pos) && this.ctx.primeiraVez('bahia_sala_milagres')) this.ctx.dialogos.tocar('bahia_sala_milagres');
  }

  oracaoDobrada(p: THREE.Vector3) {
    if (this.ctx.area !== this.ctx.bahiaBaixa) return false;
    const b = this.ctx.bahiaBaixa, h = b.hospital;
    if (b.capela.dentro(p) || h.naCapelinha(p)) return true;
    // Piedade 5: na enfermaria e no hospital, quem você carregou reza com você
    return this.ctx.estado.nivel('piedade') >= 5 && h.estagio >= 2 && h.dentro(p);
  }

  /**
   * A cor da Bahia: cada passo da provação devolve um pouco (no máximo a metade), e a vitória sobre o Coração de
   * Pedra devolve toda.
   */
  corDaBahia() {
    const f = this.ctx.estado.flags;
    if (f.has('bahia_coracao_vencido') || f.has('bahia_restaurada')) return 1;
    let c = ENFERMOS.filter((e) => f.has(`bahia_recolhido_${e.id}`)).length * 0.04;
    if (f.has('bahia_menino_abrigado')) c += 0.06;
    if (f.has('bahia_comerciante_doou')) c += 0.08;
    if (f.has('bahia_enfermaria')) c += 0.12;
    return c;
  }

  /** A cada quadro na Cidade Baixa: Irmã Dulce chama o peregrino quando ele passa perto dela pela primeira vez. */
  atualizarBahia() {
    const b = this.ctx.bahiaBaixa, a = this.ctx.bahiaAlta, f = this.ctx.estado.flags;
    // caiu das costas (troca de área, queda): o menino volta para os braços de Irmã Dulce, onde ela estava; um
    // enfermo volta para o lugar onde estava caído
    if (this.ctx.nasCostas && !this.ctx.peregrino.carregando) {
      if (this.ctx.nasCostas === 'menino') {
        b.colocarDulce(f.has('bahia_casa_expulsos') ? 'casaFora' : 'calcada', true);
        if (this.ctx.area === b) this.ctx.hud.anunciar('O menino voltou para os braços de Irmã Dulce.', 2.4);
      } else if (f.has(`bahia_recolhido_${this.ctx.nasCostas}`)) {
        b.mostrarAbrigado(this.ctx.nasCostas, true);
        if (this.ctx.area === b || this.ctx.area === a) this.ctx.hud.anunciar(`${enfermo(this.ctx.nasCostas)?.nome} voltou para a esteira do abrigo.`, 2.6);
      } else {
        b.mostrarEnfermo(this.ctx.nasCostas, true);
        a.mostrarEnfermo(this.ctx.nasCostas, true);
        if (this.ctx.area === b || this.ctx.area === a) this.ctx.hud.anunciar(`${enfermo(this.ctx.nasCostas)?.nome} ficou para trás, onde estava caído.`, 2.6);
      }
      this.ctx.nasCostas = null;
    }
    // os que passam abrem caminho para quem carrega um doente; na primeira vez que empurram, o jogo explica
    b.alguemNasCostas = a.alguemNasCostas = this.ctx.nasCostas !== null;
    // a arena do Coração de Pedra: a pedra para nos diálogos; com a Ciência, os enfermos brilham de leve
    a.largo.pausado = this.ctx.hud.dialogoAberto || this.ctx.morrendo || this.ctx.transitando;
    a.largo.ciencia = this.ctx.dons.tempoCiencia > 0;
    const empurrou = b.houveEmpurrao() || a.houveEmpurrao();
    if (empurrou && (this.ctx.area === b || this.ctx.area === a) && this.ctx.primeiraVez('bahia_passantes_empurram'))
      this.ctx.hud.anunciar('Os que passam não desviam: empurram quem está no caminho. Uma luz desfaz um deles por um tempo. Com um doente nas costas, a fila para e abre caminho.', 5);
    // o comerciante, depois de entregar a doação, volta para a loja quando o peregrino já não o vê
    if (f.has('bahia_comerciante_doou') && b.comercianteNoConvento && (this.ctx.area !== b || b.comerciante.pos.distanceTo(this.ctx.peregrino.pos) > 25))
      b.colocarComerciante('loja');
    if (this.ctx.area !== b || this.ctx.hud.dialogoAberto || this.ctx.dialogos.ocupado || this.ctx.transitando || this.ctx.regioes.dormente) return;
    // depois da resposta mansa, ele espera à porta do convento com a doação e fala assim que o peregrino chega
    if (f.has('bahia_comerciante_manso') && !f.has('bahia_comerciante_doou') && b.comercianteNoConvento && b.comerciante.pos.distanceTo(this.ctx.peregrino.pos) < 6.5) {
      this.ctx.interacoes.falarCom(b.comerciante).agir();
      return;
    }
    const d = b.dulceEmCena;
    if (b.hospital.estagio === 3 && !f.has('bahia_piedade_aperfeicoada') && b.hospital.dentro(this.ctx.peregrino.pos) && this.ctx.nasCostas === null) {
      if (this.ctx.primeiraVez('bahia_hospital_entrou')) this.ctx.interacoes.falarCom(d).agir();
      return;
    }
    if (f.has('bahia_dulce_conheceu') || d.pos.distanceTo(this.ctx.peregrino.pos) > 6.5) return;
    if (this.ctx.primeiraVez('bahia_dulce_chamou')) this.ctx.interacoes.falarCom(d).agir();
  }

  get meninoComPeregrino() {
    return this.ctx.nasCostas === 'menino';
  }

  /** Socorrer: o diálogo de cada um (antes de Dulce pedir, o Espírito Santo só aponta para ele). */
  interacoesDosEnfermos(area: BahiaBaixa | BahiaAlta): Interacao[] {
    return [...area.enfermos.values()].map(({ def, pos, corpo }) => ({
      pos: () => pos,
      raio: def.sobre === 'canoa' ? 3.6 : 2.3,
      ativa: () => corpo.visible && this.ctx.nasCostas === null && !this.ctx.dialogos.ocupado,
      rotulo: `F: socorrer ${def.nome}`,
      tipo: MARCA.lugar,
      agir: () => {
        if (!this.ctx.estado.flags.has('bahia_menino_abrigado')) {
          this.ctx.dialogos.tocar('bahia_enfermo_cedo');
          return;
        }
        this.enfermoAtual = def.id;
        this.ctx.dialogos.tocar(`bahia_enfermo_${def.id}`);
      },
    }));
  }

  /** O peregrino põe o enfermo nas costas. */
  pegarEnfermo(id: string) {
    const def = enfermo(id);
    if (!def) return;
    this.ctx.peregrino.carregar(corpoDoEnfermo(def, 'costas'), 'costas');
    this.ctx.nasCostas = id;
    this.ctx.bahiaBaixa.mostrarEnfermo(id, false);
    this.ctx.bahiaAlta.mostrarEnfermo(id, false);
    this.ctx.som.passo();
    this.ctx.hud.anunciar(`Leve ${def.nome} à porta do Convento de Santo Antônio, no Largo de Roma, onde Irmã Dulce espera.`, 3.2);
  }

  /** À porta do convento: o enfermo ganha a esteira dele no abrigo. */
  entregarEnfermo() {
    const id = this.ctx.nasCostas, def = id ? enfermo(id) : undefined;
    if (!id || !def) return;
    const b = this.ctx.bahiaBaixa;
    this.ctx.peregrino.carregar(null);
    this.ctx.nasCostas = null;
    b.mostrarAbrigado(id, true);
    this.atoDaBahia(`bahia_recolhido_${id}`, `${def.nome} tem uma esteira e um teto`);
    const d = b.dulceEmCena;
    d.falando = true;
    this.ctx.conversa.interlocutor = d;
    this.ctx.dialogos.tocar(`bahia_entrega_${id}`, () => {
      d.falando = false;
      const todos = ENFERMOS.every((e) => this.ctx.estado.flags.has(`bahia_recolhido_${e.id}`));
      if (todos && this.ctx.primeiraVez('bahia_esquecidos_todos')) this.ctx.agenda.depois(0.4, () => this.ctx.dialogos.tocar('bahia_esquecidos_todos'));
    });
  }

  /** O peregrino põe o menino nas costas; Dulce, de braços livres, vai a pé para a casa ou para o convento. */
  pegarMenino() {
    const paraConvento = this.ctx.estado.flags.has('bahia_casa_expulsos');
    this.ctx.peregrino.carregar(menino('costas'), 'costas');
    this.ctx.nasCostas = 'menino';
    this.ctx.bahiaBaixa.deitarMenino(null);
    this.ctx.bahiaBaixa.dulceIr(paraConvento ? 'convento' : 'casa');
    this.ctx.som.passo();
    this.ctx.hud.anunciar(
      paraConvento ? 'Leve o menino ao Convento de Santo Antônio, no Largo de Roma.' : 'Leve o menino à casa abandonada, junto ao cais. Devagar: sem pulo e sem o cajado.',
      3,
    );
  }

  /** Efeitos pedidos pelo roteiro da Bahia. Devolve true se o evento era daqui. */
  eventoDaBahia(nome: EventoInk) {
    if (nome === 'carregar_enfermo') {
      if (this.enfermoAtual) this.pegarEnfermo(this.enfermoAtual);
      this.enfermoAtual = null;
      return true;
    }
    if (nome === 'carregar_menino') {
      this.pegarMenino();
      return true;
    }
    if (nome === 'expulsos') {
      this.ctx.marcar('bahia_casa_expulsos');
      this.pegarMenino();
      return true;
    }
    // a resposta mansa: o comerciante fecha a loja e, sem dizer nada, vai levar a doação ao convento
    if (nome === 'comerciante_sai') {
      this.ctx.bahiaBaixa.colocarComerciante('convento');
      return true;
    }
    if (nome === 'dulce_galinheiro') {
      this.ctx.bahiaBaixa.dulceIr('galinheiro');
      return true;
    }
    if (nome === 'passagem') {
      this.passagemDoGalinheiro();
      return true;
    }
    if (nome === 'piedade_aperfeicoada') {
      this.piedadeAperfeicoada();
      return true;
    }
    if (nome === 'doacao') {
      this.ctx.bahiaBaixa.mostrarDoacao(true);
      this.atoDaBahia('bahia_comerciante_doou', 'Um coração de pedra se abriu');
      return true;
    }
    return false;
  }

  /** Uma fala de Irmã Dulce que o jogo começa (não o jogador): ela olha para o peregrino enquanto fala. */
  falaDeDulce(no: string, depois?: () => void) {
    const d = this.ctx.bahiaBaixa.dulceEmCena;
    d.falando = true;
    this.ctx.conversa.interlocutor = d;
    this.ctx.dialogos.tocar(no, () => {
      d.falando = false;
      depois?.();
    });
  }

  limparGalinheiro(id: string) {
    const b = this.ctx.bahiaBaixa, f = this.ctx.estado.flags;
    this.ctx.marcar(`bahia_galinheiro_${id}`);
    this.ctx.som.passo();
    b.hospital.aplicar(f);
    const feitas = b.hospital.limpas(f);
    if (feitas < SUJEIRAS.length) {
      this.ctx.hud.anunciar(`Galinheiro: ${feitas} de ${SUJEIRAS.length}`, 1.6);
      return;
    }
    this.ctx.marcar('bahia_galinheiro_limpo');
    b.hospital.aplicar(f);
    this.falaDeDulce('bahia_galinheiro_limpo');
  }

  estenderEsteira(id: string) {
    const b = this.ctx.bahiaBaixa, f = this.ctx.estado.flags;
    this.ctx.marcar(`bahia_esteira_${id}`);
    this.ctx.som.passo();
    b.hospital.aplicar(f);
    const feitas = ENFERMOS.filter((e) => f.has(`bahia_esteira_${e.id}`)).length;
    if (feitas < ENFERMOS.length) {
      this.ctx.hud.anunciar(`Esteiras: ${feitas} de ${ENFERMOS.length}`, 1.6);
      return;
    }
    if (this.ctx.primeiraVez('bahia_galinheiro_esteiras')) this.falaDeDulce('bahia_galinheiro_esteiras');
  }

  /** Do abrigo, à porta do convento, para as costas do peregrino (e daí para a esteira dele no galinheiro). */
  pegarDoAbrigo(id: string) {
    const def = enfermo(id);
    if (!def) return;
    this.ctx.peregrino.carregar(corpoDoEnfermo(def, 'costas'), 'costas');
    this.ctx.nasCostas = id;
    this.ctx.bahiaBaixa.mostrarAbrigado(id, false);
    this.ctx.som.passo();
    this.ctx.hud.anunciar(`Leve ${def.nome} até a esteira ${def.figurino.genero === 'f' ? 'dela' : 'dele'} no galinheiro.`, 2.8);
  }

  deitarNoGalinheiro() {
    const id = this.ctx.nasCostas, def = id ? enfermo(id) : undefined;
    if (!id || !def) return;
    const b = this.ctx.bahiaBaixa, f = this.ctx.estado.flags;
    this.ctx.peregrino.carregar(null);
    this.ctx.nasCostas = null;
    this.ctx.marcar(`bahia_leito_${id}`);
    this.ctx.som.passo();
    b.hospital.aplicar(f);
    const feitos = ENFERMOS.filter((e) => f.has(`bahia_leito_${e.id}`)).length;
    if (feitos < ENFERMOS.length) {
      this.ctx.hud.anunciar(`${def.nome} tem uma esteira debaixo de um telhado (${feitos} de ${ENFERMOS.length}).`, 2.4);
      return;
    }
    if (this.ctx.primeiraVez('bahia_galinheiro_todos')) this.ctx.agenda.depois(0.3, () => this.falaDeDulce('bahia_galinheiro_pronto'));
  }

  /** Semanas depois: o galinheiro virou enfermaria. Escurece, troca o estágio e Dulce mostra o que mudou. */
  passagemDoGalinheiro() {
    const b = this.ctx.bahiaBaixa, h = b.hospital;
    this.ctx.transitando = true;
    this.ctx.hud.escurecer(true);
    this.ctx.agenda.depois(0.9, () => {
      this.atoDaBahia('bahia_enfermaria', 'Semanas depois, o galinheiro virou enfermaria');
      b.reiniciar(this.ctx.estado.sombrasVencidas, this.ctx.estado.flags);
      // o peregrino entra pela porta, olhando os catres; Dulce está lá dentro
      this.ctx.peregrino.teleportar(h.entrada.x, this.ctx.area.altura(h.entrada.x, h.entrada.z), h.entrada.z);
      this.ctx.peregrino.rumo = Math.PI;
      this.ctx.camera.guinada = 0;
      this.ctx.camera.reposicionar();
    });
    this.ctx.agenda.depois(3.4, () => {
      this.ctx.hud.escurecer(false);
      this.ctx.transitando = false;
      this.ctx.agenda.depois(0.7, () => this.falaDeDulce('bahia_enfermaria'));
    });
  }

  /**
   * A cena no hospital (passo 9): Irmã Dulce aperfeiçoa a Piedade (os níveis 4 e 5 se abrem), o sino do Bonfim toca
   * e a região está restaurada.
   */
  piedadeAperfeicoada() {
    if (this.ctx.estado.flags.has('bahia_piedade_aperfeicoada')) return;
    this.ctx.estado.flags.add('bahia_piedade_aperfeicoada');
    this.atoDaBahia('bahia_restaurada', 'A Piedade foi aperfeiçoada: os níveis IV e V se abriram (G)');
    for (let i = 0; i < 3; i++) this.ctx.agenda.depois((900 + i * 1700) / 1000, () => this.ctx.som.sino());
    this.ctx.dialogos.tocar('bahia_restaurada');
  }

  /** Um ato de piedade da Bahia: graça, luz e, com Misericórdia (Piedade 3), um coração. */
  atoDaBahia(flag: Flag, aviso: string) {
    if (this.ctx.estado.flags.has(flag)) return;
    this.ctx.estado.flags.add(flag);
    this.ctx.estado.gracas += 1;
    if (this.ctx.estado.nivel('piedade') >= 3) this.ctx.estado.coracoes = Math.min(this.ctx.estado.coracoesMax, this.ctx.estado.coracoes + 1);
    this.ctx.estado.salvar();
    this.ctx.efeitos.ouro = 0.9;
    this.ctx.som.graca();
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar(`✦ ${aviso}`, 3);
  }

  interacoesDaBahiaBaixa(): Interacao[] {
    const b = this.ctx.bahiaBaixa, a = this.ctx.bahiaAlta;
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    return [
      { ...this.ctx.interacoes.conversaCom(() => b.dulceEmCena, 'dulce', 'F: falar com Irmã Dulce', 2.8), ativa: () => this.ctx.nasCostas === null },
      { ...this.ctx.interacoes.conversaCom(() => b.dono, 'bahia_dono_depois', 'F: falar com o dono da casa', 2.6), ativa: () => b.dono.raiz.visible && !this.ctx.dialogos.ocupado },
      { ...this.ctx.interacoes.conversaCom(() => b.comerciante, 'bahia_comerciante', 'F: falar com o dono do armazém', 2.6), ativa: () => this.ctx.nasCostas === null && !this.ctx.dialogos.ocupado },
      // a casa abandonada: forçar a porta pregada
      {
        pos: () => b.casaPorta,
        raio: 2.4,
        ativa: () => f('bahia_dulce_conheceu') && !f('bahia_casa_aberta'),
        rotulo: 'F: forçar a porta pregada',
        tipo: MARCA.lugar,
        agir: () => {
          b.abrirCasa(true);
          this.ctx.marcar('bahia_casa_aberta');
          this.ctx.som.bloqueio();
          this.ctx.dialogos.tocar('bahia_casa_aberta');
        },
      },
      // deitar o menino na esteira; o dono chega
      {
        pos: () => b.casaDentro,
        raio: 2.2,
        ativa: () => this.meninoComPeregrino && !f('bahia_casa_expulsos'),
        rotulo: 'F: deitar o menino na esteira',
        tipo: MARCA.lugar,
        agir: () => {
          this.ctx.peregrino.carregar(null);
          this.ctx.nasCostas = null;
          b.deitarMenino('casa');
          b.colocarDulce('casa', false);
          b.dono.raiz.visible = true;
          b.dono.falando = true;
          this.ctx.conversa.interlocutor = b.dono;
          this.ctx.dialogos.tocar('bahia_dono', () => (b.dono.falando = false));
        },
      },
      ...this.interacoesDosEnfermos(b),
      { ...this.ctx.interacoes.conversaCom(() => b.superiora, 'bahia_superiora', 'F: falar com a madre superiora', 2.4), ativa: () => this.ctx.nasCostas === null && !this.ctx.dialogos.ocupado },
      // o galinheiro: a sujeira, as esteiras, quem vem do abrigo
      ...b.hospital.sujeiras.map((s) => ({
        pos: () => s.pos,
        raio: 1.9,
        ativa: () => b.hospital.estagio === 1 && f('bahia_galinheiro_licenca') && !f(`bahia_galinheiro_${s.id}`) && this.ctx.nasCostas === null,
        rotulo: s.rotulo,
        tipo: MARCA.lugar,
        agir: () => this.limparGalinheiro(s.id),
      })),
      ...[...b.hospital.vagas].map(([id, vaga]) => ({
        pos: () => vaga.pos,
        raio: 1.3,
        ativa: () => b.hospital.estagio === 1 && f('bahia_galinheiro_limpo') && !f(`bahia_esteira_${id}`) && this.ctx.nasCostas === null,
        rotulo: 'F: estender uma esteira',
        tipo: MARCA.lugar,
        agir: () => this.estenderEsteira(id),
      })),
      ...ENFERMOS.map((e) => ({
        pos: () => b.posAbrigo(e.id),
        raio: 1.5,
        ativa: () => f('bahia_galinheiro_esteiras') && f(`bahia_recolhido_${e.id}`) && !f(`bahia_leito_${e.id}`) && this.ctx.nasCostas === null && !this.ctx.dialogos.ocupado,
        rotulo: `F: levar ${e.nome} para o galinheiro`,
        tipo: MARCA.lugar,
        agir: () => this.pegarDoAbrigo(e.id),
      })),
      {
        pos: () => b.hospital.vagas.get(this.ctx.nasCostas ?? '')?.pos ?? b.hospital.entrada,
        raio: 2.6,
        ativa: () => this.ctx.nasCostas !== null && this.ctx.nasCostas !== 'menino' && f(`bahia_recolhido_${this.ctx.nasCostas}`),
        rotulo: () => `F: deitar ${enfermo(this.ctx.nasCostas ?? '')?.nome ?? ''} na esteira`,
        tipo: MARCA.lugar,
        agir: () => this.deitarNoGalinheiro(),
      },
      // à porta do convento: os esquecidos, um por um
      {
        pos: () => b.conventoPorta,
        raio: 3.4,
        ativa: () => this.ctx.nasCostas !== null && this.ctx.nasCostas !== 'menino' && !f(`bahia_recolhido_${this.ctx.nasCostas}`),
        rotulo: () => `F: deitar ${enfermo(this.ctx.nasCostas ?? '')?.nome ?? ''} numa esteira`,
        tipo: MARCA.lugar,
        agir: () => this.entregarEnfermo(),
      },
      // à porta do convento: a primeira noite do menino sob um teto
      {
        pos: () => b.conventoPorta,
        raio: 3,
        ativa: () => this.meninoComPeregrino && f('bahia_casa_expulsos') && b.dulcePerto(b.conventoPorta, 4),
        rotulo: 'F: deitar o menino na esteira do convento',
        tipo: MARCA.lugar,
        agir: () => {
          this.ctx.peregrino.carregar(null);
          this.ctx.nasCostas = null;
          b.abrigarMenino();
          b.colocarDulce('convento', false);
          b.dono.raiz.visible = false;
          this.atoDaBahia('bahia_menino_abrigado', 'O menino tem um teto esta noite');
          const d = b.dulceEmCena;
          d.falando = true;
          this.ctx.conversa.interlocutor = d;
          this.ctx.dialogos.tocar('bahia_convento', () => (d.falando = false));
        },
      },
      // o saveiro: de volta à Cidade Dourada e, depois do Coração de Pedra, mar afora até Creta
      {
        pos: () => b.saveiro,
        raio: 3.2,
        rotulo: () => (f('bahia_coracao_vencido') ? 'F: embarcar no saveiro' : 'F: voltar de saveiro à Cidade Dourada'),
        tipo: MARCA.saida,
        agir: () => {
          if (!f('bahia_coracao_vencido')) return void this.ctx.viagem.viajarPara('cidade_estrada', { forcar: true });
          this.ctx.dialogos.tocar('bahia_saveiro', () => this.ctx.viagem.fazerViagem());
        },
      },
      {
        pos: () => b.elevador,
        raio: 2.6,
        rotulo: 'F: subir pelo Elevador Lacerda',
        tipo: MARCA.saida,
        agir: () => {
          this.ctx.hud.anunciar('O elevador sobe a escarpa…', 1.6);
          this.ctx.regioes.trocarArea(a, a.chegada, Math.PI / 2, () => {
            if (this.ctx.primeiraVez('bahia_alta_entrou')) this.ctx.dialogos.tocar('bahia_alta_chegada');
          }, this.ctx.nasCostas !== null && this.ctx.nasCostas !== 'menino');
        },
      },
      // antes da licença, o galinheiro é só um galinheiro
      { pos: () => b.galinheiro, raio: 3, ativa: () => !f('bahia_galinheiro_licenca'), rotulo: 'F: olhar o galinheiro', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('bahia_galinheiro') },
      // o Bonfim: a capela da região, e as cartas dos que o peregrino levou ao hospital, na Sala dos Milagres
      ...this.ctx.sacramentos.interacoesDaCapela(b.capela, 'bahia_altar'),
      ...[...b.salaDosMilagres.lembrancas].map(([id, l]): Interacao => ({
        pos: () => l.pos,
        raio: 0.6,
        ativa: () => l.carta.visible,
        rotulo: 'F: ler a carta',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar(`bahia_milagre_${id}`),
      })),
      { pos: () => b.alagados, raio: 2.6, rotulo: 'F: olhar os Alagados', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('bahia_alagados') },
      { ...this.ctx.interacoes.conversaCom(() => b.medico, 'bahia_medico', 'F: falar com o médico', 2), ativa: () => b.medico.raiz.visible && this.ctx.nasCostas === null },
      ...b.hospital.leitos.map((l): Interacao => ({
        pos: () => l.pos,
        raio: 0.9,
        ativa: () => b.hospital.estagio >= l.estagio && this.ctx.nasCostas === null && !this.ctx.dialogos.ocupado,
        rotulo: `F: falar com ${l.nome}`,
        tipo: MARCA.pessoa,
        agir: () => this.ctx.dialogos.tocar(l.no),
      })),
      { pos: () => b.hospital.cadeira, raio: 1.3, ativa: () => b.hospital.estagio === 3, rotulo: 'F: olhar a cadeira', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('bahia_cadeira') },
      { pos: () => b.hospital.altar, raio: 1.5, ativa: () => b.hospital.estagio === 3, rotulo: 'F: olhar a capelinha', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('bahia_capelinha') },
    ];
  }

  interacoesDaBahiaAlta(): Interacao[] {
    const b = this.ctx.bahiaBaixa, a = this.ctx.bahiaAlta;
    return [
      {
        pos: () => a.elevador,
        raio: 2.6,
        rotulo: 'F: descer pelo Elevador Lacerda',
        tipo: MARCA.saida,
        agir: () => {
          this.ctx.hud.anunciar('O elevador desce a escarpa…', 1.6);
          this.ctx.regioes.trocarArea(b, b.elevador.clone().add(new THREE.Vector3(-2.5, 0, 0)), -Math.PI / 2, undefined, this.ctx.nasCostas !== null);
        },
      },
      ...this.interacoesDosEnfermos(a),
      { pos: () => a.cruzeiro, raio: 2.8, ativa: () => !a.largo.lutando, rotulo: 'F: contemplar o cruzeiro', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('bahia_cruzeiro') },
      // os cinco do Largo do Cruzeiro, na luta contra o Coração de Pedra
      ...a.largo.enfermos.map((e, i): Interacao => ({
        pos: () => e.pos,
        raio: 1.7,
        ativa: () => a.largo.precisa(i),
        rotulo: () => (this.ctx.oracao.indiferenca > 0 ? 'Não é comigo… (a indiferença passa logo)' : e.situacao === 'petrificado' ? 'F: socorrer (desfazer a pedra)' : 'F: socorrer'),
        tipo: MARCA.lugar,
        agir: () => {
          if (this.ctx.oracao.indiferenca > 0) return this.ctx.hud.anunciar('A indiferença ainda pesa: você não consegue parar. Espere passar.', 1.8);
          a.largo.socorrer(i);
        },
      })),
    ];
  }

  lutaDoLargoComecou() {
    this.ctx.som.tensao();
    this.ctx.oracao.indiferenca = 0;
    this.ctx.hud.anunciar('O Coração de Pedra', 3);
    if (this.ctx.primeiraVez('bahia_coracao_dica')) this.ctx.dialogos.tocar('bahia_coracao');
  }

  enfermoDoLargoSocorrido(oracoes: number) {
    this.ctx.som.item();
    this.ctx.hud.acertou();
    if (oracoes > 0) this.ctx.hud.anunciar(oracoes < 3 ? `Ele se levanta e reza: a couraça racha (${oracoes} de 3)` : 'Três orações: a grade do peito cede!', 1.6);
    else this.ctx.hud.anunciar('Ele se levanta e reza com você.', 1.4);
  }

  enfermoDoLargoPetrificou() {
    this.ctx.som.dissolver();
    this.ctx.hud.anunciar('Alguém virou pedra: a couraça do colosso endureceu.', 2.2);
  }

  /** O colosso desmoronou: o coração de carne, e as portas do largo se abrem. */
  coracaoVencido() {
    this.ctx.efeitos.ouro = 1.4;
    this.ctx.som.graca();
    this.ctx.agenda.depois(0.6, () => this.ctx.som.item());
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar('✦ A pedra rachou: por dentro havia um coração de carne', 3.4);
    this.ctx.dialogos.tocar('bahia_coracao_vencido', () => {
      this.ctx.hud.escurecer(true);
      this.ctx.agenda.depois(0.9, () => {
        this.ctx.bahiaAlta.reiniciar(this.ctx.estado.sombrasVencidas, this.ctx.estado.flags);
        this.ctx.bahiaBaixa.reiniciar(this.ctx.estado.sombrasVencidas, this.ctx.estado.flags);
        this.ctx.hud.escurecer(false);
        this.ctx.hud.anunciar('As portas do largo se abriram: os moradores levaram os enfermos ao hospital.', 3.4);
      });
    });
  }
}
