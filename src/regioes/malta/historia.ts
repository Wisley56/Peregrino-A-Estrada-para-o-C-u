import * as THREE from 'three';
import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { Area, IdArea } from '../../mundo/Area';
import { BOATOS, FEIXES, etapaDeMalta } from '../../mundo/Malta';
import { feixeDeGravetos } from '../../mundo/MaltaModelos';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao } from '../Modulo';
import type { NomeAmbiente } from '../../historia/Regioes';
import { Parte } from '../../sistemas/Sistema';

/** Malta (At 28,1-11): o fogo na praia e a víbora, a casa de Públio e o pai curado, os enfermos da ilha e a partida. */
export class HistoriaDeMalta extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['malta'];
  /** Malta já pôs cada um no seu lugar? (Refeito ao entrar e depois de cada passo da história.) */
  maltaArrumada = false;
  /** O peregrino leva um feixe de gravetos para o fogo. */
  levandoFeixe = false;
  /** A oração com Paulo junto ao leito do pai de Públio (0 a 1). */
  oracaoPai = 0;
  /** O clima com que o ambiente de Malta foi aplicado (muda: refaz a luz e a névoa). */
  climaDeMalta = -1;

  reiniciar() {
    this.maltaArrumada = false;
    this.oracaoPai = 0;
    this.levandoFeixe = false;
  }

  interacoes() {
    return { malta: this.interacoesDeMalta() };
  }

  evento(nome: EventoInk) {
    return this.eventoDeMalta(nome);
  }

  valor(chave: string) {
    if (chave === 'malta_feixes') return this.ctx.malta.feixes;
    if (chave === 'malta_no_patio') return this.ctx.malta.enfermosNoPatio((x) => this.ctx.estado.flags.has(x)) ? 1 : 0;
    return undefined;
  }

  atualizarAntes(dt: number) {
    if (this.ctx.area === this.ctx.malta && !this.ctx.regioes.dormente) this.atualizarMalta(dt);
    else this.ctx.hud.mostrarOracao(null);
  }

  cor() {
    return this.ctx.estado.flags.has('mar_restaurado') ? 1 : 0;
  }

  /** Malta antes da cor: a garoa fria da praia (o fogo e a víbora), depois o céu nublado dos três dias com Públio. */
  ambiente(): NomeAmbiente | null {
    const k = this.ctx.malta;
    this.climaDeMalta = k.clima;
    if (this.ctx.area !== k || k.clima >= 2 || this.ctx.regioes.dormente) return null;
    return k.clima === 0 ? 'garoa' : 'nublado';
  }

  /** Chegando a pé, cada um vai para o seu lugar de novo. */
  chegouAndando(a: Area) {
    if (a === this.ctx.malta) this.maltaArrumada = false;
    return false;
  }

  rumo() {
    return this.ctx.malta.rumo((x: Flag) => this.ctx.estado.flags.has(x), this.ctx.peregrino.pos);
  }

  /** Da praia do naufrágio ao fogo que os moradores acenderam (At 28,2). */
  irParaMalta() {
    this.ctx.hud.anunciar('Os moradores da ilha descem até a praia com fogo…', 2.6);
    this.ctx.regioes.trocarArea(this.ctx.malta, this.ctx.malta.chegada, Math.PI, () => {
      this.maltaArrumada = false;
      if (this.ctx.primeiraVez('malta_entrou')) this.ctx.dialogos.tocar('malta_chegada');
    });
  }

  /** A cada quadro em Malta: arruma a etapa, refaz o clima, a oração junto ao leito e o que vem depois das conversas. */
  atualizarMalta(dt: number) {
    const k = this.ctx.malta, per = this.ctx.peregrino;
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    if (!this.maltaArrumada && !this.ctx.hud.dialogoAberto && !this.ctx.transitando) {
      this.maltaArrumada = true;
      k.arrumar(tem);
    }
    if (this.ctx.aposDialogo && !this.ctx.hud.dialogoAberto) {
      const f = this.ctx.aposDialogo;
      this.ctx.aposDialogo = null;
      f();
    }
    if (k.clima !== this.climaDeMalta) this.ctx.ambiente.aplicarAmbiente();
    k.levandoFeixe = this.levandoFeixe;
    k.pausa = this.ctx.hud.dialogoAberto || this.ctx.transitando;
    // rezar com Paulo junto ao leito: segurar R perto dele (At 28,8)
    const rezando = tem('malta_pai_rezar') && !tem('malta_pai_curado');
    k.pauloImpondo = rezando;
    if (rezando && !k.pausa) {
      const perto = per.pos.distanceTo(k.leito) < 3.4;
      if (perto && per.acao === 'rezando') this.oracaoPai = Math.min(1, this.oracaoPai + dt / 6);
      else this.oracaoPai = Math.max(0, this.oracaoPai - dt * 0.04);
      if (this.oracaoPai >= 1) this.paiCurado();
    }
    this.ctx.hud.mostrarOracao(rezando ? this.oracaoPai : null, 'Rezando com Paulo pelo pai de Públio');
  }

  /** O pai de Públio sarou: Paulo orou, impôs as mãos e o curou (At 28,8). */
  paiCurado() {
    this.ctx.marcar('malta_pai_curado');
    this.oracaoPai = 0;
    this.ctx.malta.levantarOPai();
    this.ctx.efeitos.ouro = 1.3;
    this.ctx.graca.tempoColuna = 0;
    this.ctx.som.graca();
    this.ctx.estado.gracas += 1;
    this.ctx.estado.salvar();
    this.ctx.hud.anunciar('✦ O pai de Públio está curado', 3);
    const paulo = this.ctx.malta.paulo;
    paulo.falando = true;
    this.ctx.conversa.interlocutor = paulo;
    this.ctx.dialogos.tocar('malta_pai_curado', () => {
      paulo.falando = false;
      this.maltaArrumada = false;
    });
  }

  /** O que o roteiro de Malta pede. Devolve true se o evento era daqui. */
  eventoDeMalta(nome: EventoInk) {
    const k = this.ctx.malta;
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    if (nome === 'vibora_lanca' || nome === 'vibora_prende' || nome === 'vibora_sacode') {
      k.cenaDaVibora(nome === 'vibora_lanca' ? 'lanca' : nome === 'vibora_prende' ? 'prende' : 'sacode');
      if (nome === 'vibora_lanca') this.ctx.som.fogo();
      else if (nome === 'vibora_prende') this.ctx.som.tensao();
      else this.ctx.agenda.depois(1.1, () => this.ctx.som.faisca());
      return true;
    }
    if (nome === 'dom_conselho') {
      this.ctx.marcar('dom_conselho');
      this.ctx.som.item();
      this.ctx.efeitos.ouro = 1.2;
      this.ctx.graca.tempoColuna = 0;
      this.ctx.hud.anunciar('Você recebeu o dom do Conselho!', 3.5);
      return true;
    }
    if (nome === 'vibora_fim') {
      this.ctx.marcar('malta_vibora');
      this.ctx.aposDialogo = () => (this.maltaArrumada = false);
      return true;
    }
    if (nome === 'boato') {
      // cada morador corrigido: quando são os quatro, Públio desce à praia
      const faltam = BOATOS.filter((b) => !tem(`malta_boato_${b}`)).length;
      if (faltam > 0) {
        this.ctx.hud.anunciar(`A palavra certa corre de boca em boca. (${BOATOS.length - faltam} de ${BOATOS.length})`, 2.4);
        return true;
      }
      this.ctx.marcar('malta_boatos');
      this.ctx.aposDialogo = () => {
        this.maltaArrumada = false;
        this.ctx.agenda.depois(0.4, () => {
          const p = this.ctx.malta.publio;
          p.falando = true;
          this.ctx.conversa.interlocutor = p;
          this.ctx.dialogos.tocar('malta_publio_chega', () => (p.falando = false));
        });
      };
      return true;
    }
    if (nome === 'hospedar') {
      this.ctx.marcar('malta_publio');
      k.subirParaACasa();
      this.ctx.hud.anunciar('Públio leva Paulo e os companheiros para a casa dele. Siga pela estrada que sobe.', 3.4);
      return true;
    }
    if (nome === 'rezar_pai') {
      this.ctx.marcar('malta_pai_rezar');
      this.ctx.hud.anunciar('Ajoelhe-se junto ao leito e segure R para rezar com Paulo.', 3.4);
      return true;
    }
    if (nome.startsWith('enfermo_')) {
      const id = nome.slice(8);
      this.ctx.marcar(`malta_enfermo_${id}`);
      k.mandarParaACasa(id as never);
      this.ctx.hud.anunciar('Vai para a casa de Públio, onde Paulo reza pelos enfermos.', 2.6);
      return true;
    }
    if (nome === 'curas') {
      // "os outros que tinham enfermidades na ilha vinham e eram curados" (At 28,9): e a cor volta ao mar
      this.ctx.marcar('malta_curas');
      this.ctx.marcar('mar_restaurado');
      this.ctx.estado.gracas += 2;
      this.ctx.estado.salvar();
      k.arrumar(tem);
      this.ctx.efeitos.ouro = 1.6;
      this.ctx.graca.tempoColuna = 0;
      this.ctx.som.graca();
      this.ctx.agenda.depois(0.7, () => this.ctx.som.item());
      this.ctx.hud.anunciar('✦ A cor voltou ao Mar da Tempestade', 3.6);
      return true;
    }
    if (nome === 'tres_meses') {
      this.ctx.aposDialogo = () => {
        this.ctx.transitando = true;
        this.ctx.hud.escurecer(true);
        this.ctx.agenda.depois(0.9, () => {
          this.ctx.marcar('malta_tres_meses');
          k.arrumar(tem);
          const p = k.cais.clone().add(new THREE.Vector3(-1.5, 0, -3));
          this.ctx.peregrino.teleportar(p.x, k.altura(p.x, p.z), p.z);
          this.ctx.peregrino.rumo = Math.PI / 2;
          this.ctx.camera.guinada = -Math.PI / 2;
          this.ctx.camera.reposicionar();
          this.ctx.estado.checkpoint = [p.x, k.altura(p.x, p.z), p.z];
          this.ctx.estado.checkpointArea = 'malta';
          this.ctx.estado.salvar();
          this.ctx.hud.anunciar('Três meses depois…', 3);
        });
        this.ctx.agenda.depois(3.2, () => {
          this.ctx.hud.escurecer(false);
          this.ctx.transitando = false;
          this.ctx.agenda.depois(0.9, () => this.ctx.dialogos.tocar('malta_partida'));
        });
      };
      return true;
    }
    return false;
  }

  /** Interações em Malta: a gente, os gravetos e o fogo, o leito, o barco, o cais e a volta à enseada. */
  interacoesDeMalta(): Interacao[] {
    const k = this.ctx.malta, per = this.ctx.peregrino;
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    const etapa = () => etapaDeMalta(f);
    k.aoChegar = () => {
      if (etapa() === 'enfermos' && k.enfermosNoPatio(f) && this.ctx.primeiraVez('malta_todos_no_patio'))
        this.ctx.hud.anunciar('Os enfermos já estão todos no pátio de Públio. Fale com Paulo.', 3);
    };
    const gravetos = k.gravetos.map((g, i): Interacao => ({
      pos: () => g.pos,
      raio: 1.8,
      ativa: () => etapa() === 'fogo' && !this.levandoFeixe && !f(`malta_feixe_${i}`),
      rotulo: 'F: apanhar o feixe de gravetos',
      tipo: MARCA.lugar,
      agir: () => {
        this.ctx.marcar(`malta_feixe_${i}`);
        g.malha.visible = false;
        this.levandoFeixe = true;
        per.carregar(feixeDeGravetos(i + 20));
        this.ctx.som.passo();
      },
    }));
    return [
      // o barqueiro tem a conversa própria (que termina na viagem), mais abaixo
      ...k.npcs.filter((n) => n !== k.barqueiro).map((n): Interacao => ({ ...this.ctx.interacoes.falarCom(n), ativa: () => n.raiz.visible && !(n === k.paulo && etapa() === 'vibora') })),
      // Paulo na etapa da víbora (se o jogo foi salvo antes da cena acabar): a cena recomeça falando com ele
      {
        pos: () => k.paulo.pos,
        raio: 2.8,
        ativa: () => etapa() === 'vibora',
        rotulo: 'F: falar com São Paulo',
        tipo: MARCA.pessoa,
        agir: () => this.cenaDaVibora(),
      },
      ...gravetos,
      {
        pos: () => k.fogo,
        raio: 2.6,
        ativa: () => this.levandoFeixe,
        rotulo: 'F: lançar os gravetos no fogo',
        tipo: MARCA.lugar,
        agir: () => {
          this.levandoFeixe = false;
          per.carregar(null);
          this.ctx.som.fogo();
          const n = [1, 2, 3, 4, 5].filter((x) => f(`malta_lancou_${x}`)).length + 1;
          this.ctx.marcar(`malta_lancou_${n}`);
          k.feixes = Math.min(FEIXES, n);
          if (n >= FEIXES) {
            this.ctx.marcar('malta_fogo');
            this.ctx.hud.anunciar('O fogo pega alto. Paulo vem com o feixe dele…', 2.4);
            this.ctx.agenda.depois(1.6, () => this.cenaDaVibora());
          } else this.ctx.hud.anunciar(`O fogo cresce. (${n} de ${FEIXES} feixes)`, 2);
        },
      },
      {
        pos: () => k.fogo,
        raio: 2.6,
        ativa: () => f('malta_fogo') && !this.levandoFeixe && etapa() !== 'vibora',
        rotulo: 'F: aquecer-se junto ao fogo',
        tipo: MARCA.lugar,
        agir: () => this.ctx.sacramentos.descansar(k.fogo.clone().add(new THREE.Vector3(1.8, 0, 1.2)), 'Você se aqueceu junto ao fogo. O caminho foi guardado aqui.'),
      },
      {
        pos: () => k.leito,
        raio: 2.6,
        ativa: () => f('malta_pai_rezar') && !f('malta_pai_curado') && per.acao !== 'rezando',
        rotulo: 'F: ajoelhar-se junto ao leito',
        tipo: MARCA.descanso,
        agir: () => this.ctx.hud.anunciar('Segure R para rezar com Paulo.', 2.4),
      },
      {
        pos: () => k.barqueiro.pos,
        raio: 2.8,
        rotulo: 'F: falar com o barqueiro',
        tipo: MARCA.pessoa,
        agir: () => {
          const b = k.barqueiro;
          b.falando = true;
          this.ctx.conversa.interlocutor = b;
          this.ctx.dialogos.tocar('malta_barco', () => {
            b.falando = false;
            this.ctx.viagem.fazerViagem();
          });
        },
      },
      {
        pos: () => k.prancha,
        raio: 2.2,
        ativa: () => etapa() === 'partida',
        rotulo: 'F: embarcar no navio dos Dióscuros',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('malta_embarque'),
      },
    ];
  }

  /** A cena do fogo: Paulo lança o feixe, a víbora se prende à mão dele e ele a sacode no fogo (At 28,3-6). */
  cenaDaVibora() {
    if (this.ctx.dialogos.ocupado) return;
    const p = this.ctx.malta.paulo;
    // o peregrino do outro lado do fogo, de frente para Paulo: a conversa enquadra os dois com a fogueira no meio,
    // e a roda de gente não tapa a víbora
    const fogo = this.ctx.malta.fogo, per = this.ctx.peregrino;
    const d = new THREE.Vector3(p.pos.x - fogo.x, 0, p.pos.z - fogo.z).normalize();
    const x = fogo.x - d.x * 2.6, z = fogo.z - d.z * 2.6;
    per.teleportar(x, this.ctx.area.altura(x, z), z);
    per.rumo = Math.atan2(p.pos.x - x, p.pos.z - z);
    p.falando = true;
    this.ctx.conversa.interlocutor = p;
    this.ctx.dialogos.tocar('malta_vibora', () => (p.falando = false));
  }
}
