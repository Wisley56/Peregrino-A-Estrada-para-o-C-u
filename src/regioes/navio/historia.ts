import * as THREE from 'three';
import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { IdArea } from '../../mundo/Area';
import { etapaDoNavio, CARGAS } from '../../mundo/Tempestade';
import { sacoDeTrigo } from '../../mundo/NavioModelos';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao } from '../Modulo';
import { Parte } from '../../sistemas/Sistema';

/** O navio na tempestade (At 27,14-38): o Euraquilão, o bote, os cabos, a carga ao mar, as brigas, a sonda e as âncoras. */
export class HistoriaDoNavio extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['navio'];
  /** O navio já pôs cada um no seu lugar para a etapa? (Refeito ao entrar e a cada etapa.) */
  navioArrumado = false;
  /** A etapa cuja fala de abertura já tocou nesta sessão (para não repetir). */
  etapaAnunciada = '';
  /** Há quanto tempo o peregrino está no mar, fora do navio (os marinheiros o puxam de volta). */
  noMarHa = 0;
  /** O peregrino leva uma carga para lançar ao mar. */
  levandoCarga = false;

  interacoes() {
    return { navio: this.interacoesDoNavio() };
  }

  evento(nome: EventoInk) {
    return this.eventoDoNavio(nome);
  }

  atualizarAntes(dt: number) {
    if (this.ctx.area === this.ctx.navio) this.atualizarNavio(dt);
  }

  cor() {
    return this.ctx.estado.flags.has('mar_restaurado') ? 1 : 0;
  }

  rumo() {
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    const per = this.ctx.peregrino.pos;
  const perto = (lista: THREE.Vector3[]) => lista.reduce<THREE.Vector3 | null>((a, p) => (!a || p.distanceToSquared(per) < a.distanceToSquared(per) ? p : a), null);
    const k = this.ctx.navio;
    switch (etapaDoNavio(tem)) {
      case 'bote': return k.cabosDoBote;
      case 'cintar': return perto([0, 1, 2].filter((i) => !tem(`navio_cabo_${i + 1}`)).map((i) => k.pontoDoCabo(i)));
      case 'carga': return this.levandoCarga ? k.bordaPerto(per) : k.pilha;
      case 'brigas': return perto([0, 1, 2].filter((i) => !tem(`navio_briga_${i + 1}`)).map((i) => k.centroDaBriga(i)));
      case 'sonda': return k.proa;
      case 'ancoras': return perto([0, 1, 2, 3].filter((i) => !tem(`navio_ancora_${i + 1}`)).map((i) => k.pontoDaAncora(i)));
      default: return k.paulo.pos;
    }
  }

  /** A cena roteirizada do navio não deixa viajar no meio. */
  bloqueiaViagem() {
    return this.ctx.area === this.ctx.navio ? 'Agora não: a história daqui ainda não terminou.' : null;
  }

  /** Sobe a bordo: o navio parte de Creta com o vento sul brando, e logo vem o Euraquilão. */
  embarcar() {
    this.ctx.regioes.trocarArea(this.ctx.navio, this.ctx.navio.chegada, 0, () => {
      this.navioArrumado = false;
      this.etapaAnunciada = '';
      if (this.ctx.primeiraVez('navio_entrou')) this.ctx.dialogos.tocar('navio_inicio');
    });
  }

  /** O que o roteiro do navio pede. Devolve true se o evento era daqui. */
  eventoDoNavio(nome: EventoInk) {
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    const avancar = (flag: Flag) => {
      this.ctx.marcar(flag);
      this.navioArrumado = false;
    };
    if (nome === 'bote') avancar('navio_bote');
    else if (nome === 'briga') {
      if ([1, 2, 3].every((n) => f(`navio_briga_${n}`))) this.ctx.marcar('navio_brigas');
      this.navioArrumado = false;
    } else if (nome === 'anjo') avancar('navio_anjo');
    else if (nome === 'sonda') avancar('navio_sonda');
    else if (nome === 'cortar_bote') {
      this.ctx.navio.soltarBote();
      this.ctx.marcar('navio_fuga');
      this.navioArrumado = false;
    } else if (nome === 'pao') {
      this.ctx.estado.restaurar();
      this.ctx.som.graca();
      this.ctx.efeitos.ouro = 0.8;
      this.ctx.hud.anunciar('O pão partido: as forças voltam.', 2.5);
    } else if (nome === 'amanhecer') avancar('navio_pao');
    else return false;
    return true;
  }

  /** A cada quadro no navio: arruma a etapa, toca a fala de abertura dela, e puxa de volta quem caiu no mar. */
  atualizarNavio(dt: number) {
    const k = this.ctx.navio, per = this.ctx.peregrino;
    const tem = (x: Flag) => this.ctx.estado.flags.has(x);
    if (!this.navioArrumado && !this.ctx.hud.dialogoAberto && !this.ctx.transitando) {
      this.navioArrumado = true;
      k.arrumar(tem);
    }
    // a fala que abre cada etapa (as que não abrem com uma conversa do próprio peregrino)
    const etapa = etapaDoNavio(tem);
    if (etapa !== this.etapaAnunciada && !this.ctx.hud.dialogoAberto && !this.ctx.transitando && tem('navio_entrou')) {
      this.etapaAnunciada = etapa;
      const abre = ({ anjo: ['navio_anjo', 'navio_anjo_tocou'], fuga: ['navio_fuga_vista', 'navio_fuga_vista_tocou'], pao: ['navio_pao', 'navio_pao_tocou'] } as const satisfies Record<string, readonly [string, Flag]>)[etapa as 'anjo' | 'fuga' | 'pao'] as readonly [string, Flag] | undefined;
      const no = abre?.[0] ?? '';
      if (abre && this.ctx.primeiraVez(abre[1])) {
        if (etapa === 'anjo' || etapa === 'pao') {
          const p = k.paulo;
          p.falando = true;
          this.ctx.conversa.interlocutor = p;
          this.ctx.dialogos.tocar(no, () => (p.falando = false));
        } else this.ctx.dialogos.tocar(no);
      }
    }
    // o dia raiou: o navio corre para a praia e encalha (At 27,39-41)
    if (tem('navio_pao') && !tem('naufragio_encalhou') && !this.ctx.hud.dialogoAberto && !this.ctx.transitando) return this.ctx.historias.naufragio.encalhar();
    // caiu no mar: os marinheiros jogam um cabo e o puxam de volta
    if (per.nadando && !this.ctx.transitando) {
      this.noMarHa += dt;
      if (this.noMarHa > 1.6) {
        this.noMarHa = 0;
        this.levandoCarga = false;
        per.carregar(null);
        this.ctx.hud.anunciar('Os marinheiros jogam um cabo e puxam você de volta a bordo.', 3);
        this.ctx.regioes.trocarArea(k, k.chegada, 0);
      }
    } else this.noMarHa = 0;
    k.pausa = this.ctx.hud.dialogoAberto || this.ctx.transitando;
  }

  /** Interações a bordo: a gente, o bote, os cabos, a carga, as brigas, a sonda e as âncoras. */
  interacoesDoNavio(): Interacao[] {
    const k = this.ctx.navio, per = this.ctx.peregrino;
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    const etapa = () => etapaDoNavio(f);
    k.aoTrovejar = () => this.ctx.som.trovao();
    k.aoAvisarOnda = () => this.ctx.hud.anunciar('Uma onda vem pelo través! Segure-se junto ao mastro!', 2);
    k.aoQuebrarOnda = (lado) => {
      this.ctx.som.vagalhao();
      if (this.ctx.area !== k || k.pertoDoMastro(per.pos) < 2.4) return;
      per.empurrao.set(lado * 7.5, 0, -2);
    };
    const cabos = [0, 1, 2].map((i): Interacao => ({
      pos: () => k.pontoDoCabo(i),
      raio: 1.8,
      ativa: () => etapa() === 'cintar' && !f(`navio_cabo_${i + 1}`),
      rotulo: 'F: passar o cabo por baixo do casco',
      tipo: MARCA.lugar,
      agir: () => {
        this.ctx.marcar(`navio_cabo_${i + 1}`);
        this.ctx.som.corrente();
        this.navioArrumado = false;
        if ([1, 2, 3].every((n) => f(`navio_cabo_${n}`))) {
          this.ctx.marcar('navio_cintado');
          this.ctx.dialogos.tocar('navio_cintado');
        } else this.ctx.hud.anunciar('O cabo passa por baixo do casco e é esticado de borda a borda.', 2);
      },
    }));
    const brigas = [0, 1, 2].map((i): Interacao => ({
      pos: () => k.centroDaBriga(i),
      raio: 2.2,
      ativa: () => etapa() === 'brigas' && !f(`navio_briga_${i + 1}`),
      rotulo: 'F: separar a briga',
      tipo: MARCA.lugar,
      agir: () => {
        const [a, b] = k.brigas[i];
        a.falando = b.falando = true;
        this.ctx.conversa.interlocutor = a;
        this.ctx.dialogos.tocar(`navio_briga_${i + 1}`, () => (a.falando = b.falando = false));
      },
    }));
    const ancoras = [0, 1, 2, 3].map((i): Interacao => ({
      pos: () => k.pontoDaAncora(i),
      raio: 1.3,
      ativa: () => etapa() === 'ancoras' && !f(`navio_ancora_${i + 1}`),
      rotulo: 'F: lançar a âncora da popa',
      tipo: MARCA.lugar,
      agir: () => {
        this.ctx.marcar(`navio_ancora_${i + 1}`);
        this.ctx.som.corrente();
        this.ctx.som.respingo();
        this.navioArrumado = false;
        if ([1, 2, 3, 4].every((n) => f(`navio_ancora_${n}`))) {
          this.ctx.marcar('navio_ancoras');
          this.ctx.dialogos.tocar('navio_ancoras_feitas');
        } else this.ctx.hud.anunciar(`A âncora desce para o fundo. (${[1, 2, 3, 4].filter((n) => f(`navio_ancora_${n}`)).length} de 4)`, 2);
      },
    }));
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.ctx.interacoes.falarCom(n), ativa: () => n.raiz.visible && !(etapa() === 'brigas' && k.brigas.flat().includes(n)) })),
      {
        pos: () => k.cabosDoBote,
        raio: 2,
        ativa: () => etapa() === 'bote',
        rotulo: 'F: puxar o cabo do bote',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('navio_bote'),
      },
      ...cabos,
      // a carga: pegar na pilha e lançar pela borda
      {
        pos: () => k.pilha,
        raio: 1.6,
        ativa: () => etapa() === 'carga' && !this.levandoCarga,
        rotulo: 'F: pegar a carga',
        tipo: MARCA.lugar,
        agir: () => {
          this.levandoCarga = true;
          per.carregar(sacoDeTrigo(7));
        },
      },
      {
        pos: () => k.bordaPerto(per.pos),
        raio: 1.4,
        ativa: () => this.levandoCarga,
        rotulo: 'F: lançar a carga ao mar',
        tipo: MARCA.lugar,
        agir: () => {
          this.levandoCarga = false;
          per.carregar(null);
          this.ctx.som.respingo();
          const n = [1, 2, 3, 4, 5].filter((x) => f(`navio_lancou_${x}`)).length + 1;
          this.ctx.marcar(`navio_lancou_${n}`);
          this.navioArrumado = false;
          if (n >= CARGAS) {
            this.ctx.marcar('navio_carga');
            this.ctx.dialogos.tocar('navio_carga_feita');
          } else this.ctx.hud.anunciar(`A carga some nas ondas. (${n} de ${CARGAS})`, 2);
        },
      },
      ...brigas,
      {
        pos: () => k.proa,
        raio: 2,
        ativa: () => etapa() === 'sonda',
        rotulo: 'F: lançar a sonda',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar(f('navio_sonda_1') ? 'navio_sonda' : 'navio_sonda_1'),
      },
      ...ancoras,
    ];
  }
}
