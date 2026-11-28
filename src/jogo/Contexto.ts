import * as THREE from 'three';
import { CameraTerceira } from '../core/Camera';
import { Entrada } from '../core/Entrada';
import { Estado } from '../core/Estado';
import type { Flag } from '../historia/Flags';
import type { EventoInk } from '../historia/EventosInk';
import { Agenda } from '../core/Agenda';
import { Eventos } from '../core/Eventos';
import { Som } from '../core/Som';
import { identidadePadrao, visualDe } from '../core/Aparencia';
import { Efeitos } from '../fx/Efeitos';
import { Hud } from '../ui/Hud';
import { Dialogos } from '../dialogo/Dialogos';
import { Mundo } from '../mundo/Mundo';
import { Cripta } from '../mundo/Cripta';
import { Area } from '../mundo/Area';
import { Ermo } from '../mundo/aberto/MundoAberto';
import { TerrenoMundo } from '../mundo/aberto/TerrenoMundo';
import { Deserto } from '../mundo/Deserto';
import { PocoMeioDia } from '../mundo/PocoMeioDia';
import { Cidade } from '../mundo/Cidade';
import { BahiaAlta, BahiaBaixa } from '../mundo/Bahia';
import { Creta } from '../mundo/Creta';
import { Tempestade } from '../mundo/Tempestade';
import { Naufragio } from '../mundo/Naufragio';
import { Malta } from '../mundo/Malta';
import { Banquete } from '../mundo/Banquete';
import { Barco } from '../entidades/Barco';
import { Peregrino } from '../entidades/Peregrino';
import { Pomba } from '../entidades/Pomba';
import { Preferencias } from '../core/Preferencias';
import type { OpcoesDev } from '../dev/tipos';
import type { ModuloRegiao } from '../regioes/Modulo';
import type { Sistema } from '../sistemas/Sistema';
import { SistemaRegioes } from '../sistemas/Regioes';
import { SistemaAmbiente } from '../sistemas/Ambiente';
import { SistemaInteracoes } from '../sistemas/Interacoes';
import { SistemaConversa } from '../sistemas/Conversa';
import { SistemaViagem } from '../sistemas/Viagem';
import { SistemaNavegacao } from '../sistemas/Navegacao';
import { SistemaOracao } from '../sistemas/Oracao';
import { SistemaGraca } from '../sistemas/Graca';
import { SistemaSacramentos } from '../sistemas/Sacramentos';
import { SistemaDons } from '../sistemas/Dons';
import { SistemaCombate } from '../sistemas/Combate';
import { SistemaMapas } from '../sistemas/Mapas';
import { SistemaFauna } from '../sistemas/Fauna';
import { SistemaMenus } from '../sistemas/Menus';
import { SistemaControle } from '../sistemas/Controle';
import { SistemaCameras } from '../sistemas/Cameras';
import { HistoriaDoVale } from '../regioes/vale/historia';
import { HistoriaDoDeserto } from '../regioes/deserto/historia';
import { HistoriaDaCidade } from '../regioes/cidade/historia';
import { HistoriaDaBahia } from '../regioes/bahia/historia';
import { HistoriaDeCreta } from '../regioes/creta/historia';
import { HistoriaDoNavio } from '../regioes/navio/historia';
import { HistoriaDoNaufragio } from '../regioes/naufragio/historia';
import { HistoriaDeMalta } from '../regioes/malta/historia';

/** O que o `Jogo` faz quando um sistema pede (a tela de Gráficos mudou; o jogador saiu para o título). */
export interface AcoesDoJogo {
  graficos(): void;
  sair(): void;
}

/**
 * O que os sistemas e os módulos de região compartilham: os serviços (estado, HUD, som, diálogos, câmera), as áreas
 * do mundo, o estado do momento (a área atual, uma passagem ou uma queda em curso) e os próprios sistemas. O `Jogo`
 * cria um só e o entrega a todos; ninguém precisa conhecer o `Jogo`.
 */
export class Contexto {
  readonly cena = new THREE.Scene();
  readonly estado = new Estado();
  readonly hud = new Hud();
  /** Conversas e falas, escritas em Ink (src/dialogos/*.ink). */
  readonly dialogos: Dialogos = new Dialogos(this.hud, {
    // o build confere as flags dos roteiros contra o registro (tools/vite-plugin-ink.ts)
    tem: (f) => this.estado.flags.has(f as Flag),
    marcar: (f) => this.marcar(f as Flag),
    nivel: (d) => this.estado.nivel(d as Parameters<Estado['nivel']>[0]),
    valor: (k) => this.conversa.valorDialogo(k),
    nome: () => (this.estado.identidade ?? identidadePadrao()).nome,
    feminino: () => (this.estado.identidade ?? identidadePadrao()).genero === 'f',
    evento: (e) => this.conversa.eventoDialogo(e as EventoInk),
    descobriu: (p) => this.estado.pontos.has(p),
  });
  readonly som = new Som();
  readonly mundo = new Mundo();
  cripta!: Cripta;
  /** Área onde o peregrino está agora. */
  area: Area = this.mundo;
  readonly peregrino = new Peregrino(visualDe(identidadePadrao()));
  /** Opções do painel de desenvolvedor (`src/dev`). Só existe no modo dev; em produção fica sempre null. */
  dev: OpcoesDev | null = null;
  readonly pomba = new Pomba();
  /** Cenas com atraso ("daqui a 0,9 s, toque a fala"): contam o tempo do jogo, param na pausa e somem ao sair. */
  agenda = new Agenda();
  /** Os acontecimentos do jogo, para quem quiser ouvir (ver `MapaDeEventos`). */
  readonly eventos = new Eventos();
  readonly prefs = new Preferencias();
  /** Quadros por segundo (média suave), mostrados na aba Gráficos. */
  qps = 60;
  readonly relogio = new THREE.Clock();
  /** O barco do peregrino (o saveiro pequeno que ele mesmo conduz pelo mar). */
  readonly barco = new Barco();
  /** O Mar da Tempestade, primeira parte: a costa sul de Creta, em Bons Portos (At 27,8). */
  readonly creta = new Creta();
  readonly navio = new Tempestade();
  readonly naufragio = new Naufragio({ lutaComecou: () => this.historias.naufragio.lutaDaIraComecou() });
  readonly malta = new Malta();
  readonly cidade = new Cidade();
  /** As Ruas da Bahia: a Cidade Baixa (com Itapagipe) e a Cidade Alta, ligadas pelo Elevador Lacerda. */
  readonly bahiaBaixa = new BahiaBaixa();
  readonly bahiaAlta = new BahiaAlta({
    lutaComecou: () => this.historias.bahia.lutaDoLargoComecou(),
    socorrido: (n) => this.historias.bahia.enfermoDoLargoSocorrido(n),
    petrificou: () => this.historias.bahia.enfermoDoLargoPetrificou(),
  });
  /** O Salão do Banquete, dentro do palácio: a arena da Gula. Os pobres da cidade vêm com o peregrino. */
  readonly banquete = new Banquete(
    {
      lutaComecou: () => this.historias.cidade.lutaBanqueteComecou(),
      banqueteServido: (primeira) => this.historias.cidade.banqueteServido(primeira),
      travessaCaiu: (restantes) => this.historias.cidade.travessaCaiu(restantes),
    },
    (() => {
      const def = (id: string) => this.cidade.pobres.find((p) => p.id === id)!.npc.def;
      return { tomas: def('tomas'), rita: def('rita'), beppo: def('beppo'), leproso: this.cidade.leprosoCurado.def };
    })(),
  );
  readonly meiodia = new PocoMeioDia({ lutaComecou: () => this.historias.deserto.lutaMeioDiaComecou() });
  readonly deserto = new Deserto({
    sussurro: (t) => this.historias.deserto.aoSussurro(t),
    miragemDesfeita: (porCiencia) => this.historias.deserto.aoDesfazerMiragem(porCiencia),
  });
  /** O chão do mundo inteiro (as regiões e a terra entre elas). */
  terrenoDoMundo: TerrenoMundo | null = null;
  get terrenoMundo() {
    return (this.terrenoDoMundo ??= this.regioes.criarTerrenoMundo());
  }

  ermoDoMundo: Ermo | null = null;
  /** A terra de ligação e o mar aberto, e a física de todo o mundo aberto. */
  get ermo() {
    if (!this.ermoDoMundo) {
      this.ermoDoMundo = new Ermo(this.terrenoMundo, new Map(this.regioes.regioesAbertas().map((a) => [a.id, a])));
      this.cena.add(this.ermoDoMundo.grupo);
    }
    return this.ermoDoMundo;
  }

  /** A peregrinação começou (fora da tela inicial e da criação do personagem). */
  comecou = false;
  /** A criação do personagem está aberta. */
  modoCriacao = false;
  /** Uma passagem (o véu escuro entre duas áreas, uma cena) está em curso: o peregrino não anda. */
  transitando = false;
  /** O peregrino caiu e está voltando ao último descanso. */
  morrendo = false;
  /** Neste quadro o peregrino não age (conversa, passagem ou queda): calculado no começo do quadro. */
  parado = false;
  /** Havia uma conversa aberta no começo do quadro. */
  emDialogo = false;
  /**
   * Quem vai nas costas do peregrino: o menino ('menino'), um dos enfermos (o id) ou ninguém. Não vai para o save:
   * ao recarregar, o menino volta para Dulce e o enfermo para onde estava caído.
   */
  nasCostas: string | null = null;
  /** O que fazer quando a conversa do naufrágio fechar (os presos salvos: todos ao mar). */
  aposDialogo: (() => void) | null = null;

  readonly efeitos: Efeitos;
  readonly regioes: SistemaRegioes;
  readonly ambiente: SistemaAmbiente;
  readonly interacoes: SistemaInteracoes;
  readonly conversa: SistemaConversa;
  readonly viagem: SistemaViagem;
  readonly navegacao: SistemaNavegacao;
  readonly oracao: SistemaOracao;
  readonly graca: SistemaGraca;
  readonly sacramentos: SistemaSacramentos;
  readonly dons: SistemaDons;
  readonly combate: SistemaCombate;
  readonly mapas: SistemaMapas;
  readonly fauna: SistemaFauna;
  readonly menus: SistemaMenus;
  readonly controle: SistemaControle;
  readonly cameras: SistemaCameras;
  /** A história de cada região (`src/regioes/<id>/historia.ts`). */
  readonly historias: {
    vale: HistoriaDoVale; deserto: HistoriaDoDeserto; cidade: HistoriaDaCidade; bahia: HistoriaDaBahia;
    creta: HistoriaDeCreta; navio: HistoriaDoNavio; naufragio: HistoriaDoNaufragio; malta: HistoriaDeMalta;
  };
  /** As mesmas, na ordem em que o jogo as consulta. */
  readonly modulos: ModuloRegiao[];
  /** Os sistemas com o que fazer numa queda ou na volta ao título. */
  readonly sistemas: Sistema[];

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    readonly camera: CameraTerceira,
    readonly entrada: Entrada,
    acoes: AcoesDoJogo,
  ) {
    this.efeitos = new Efeitos(renderer, this.cena, camera.cam);
    this.ambiente = new SistemaAmbiente(this);
    this.cena.add(this.barco.grupo, this.barco.efeitos);
    this.regioes = new SistemaRegioes(this);
    this.interacoes = new SistemaInteracoes(this);
    this.conversa = new SistemaConversa(this);
    this.viagem = new SistemaViagem(this);
    this.navegacao = new SistemaNavegacao(this);
    this.oracao = new SistemaOracao(this);
    this.graca = new SistemaGraca(this);
    this.sacramentos = new SistemaSacramentos(this);
    this.dons = new SistemaDons(this);
    this.combate = new SistemaCombate(this);
    this.mapas = new SistemaMapas(this);
    this.fauna = new SistemaFauna(this);
    this.menus = new SistemaMenus(this, acoes);
    this.controle = new SistemaControle(this);
    this.cameras = new SistemaCameras(this);
    this.historias = {
      vale: new HistoriaDoVale(this), deserto: new HistoriaDoDeserto(this), cidade: new HistoriaDaCidade(this),
      bahia: new HistoriaDaBahia(this), creta: new HistoriaDeCreta(this), navio: new HistoriaDoNavio(this),
      naufragio: new HistoriaDoNaufragio(this), malta: new HistoriaDeMalta(this),
    };
    const h = this.historias;
    this.modulos = [h.vale, h.deserto, h.cidade, h.bahia, h.creta, h.navio, h.naufragio, h.malta];
    this.sistemas = [this.oracao, this.dons, this.combate];
    this.cena.add(this.mundo.grupo, this.deserto.grupo, this.meiodia.grupo, this.cidade.grupo, this.banquete.grupo, this.bahiaBaixa.grupo, this.bahiaAlta.grupo, this.creta.grupo, this.navio.grupo, this.naufragio.grupo, this.malta.grupo, this.peregrino.raiz, this.pomba.raiz);
    this.graca.coluna.visible = false;
    this.cena.add(this.graca.coluna, this.combate.flashLuz);
  }

  marcar(flag: Flag) {
    this.estado.flags.add(flag);
    this.estado.salvar();
    this.eventos.emitir('flagMarcada', { flag });
  }

  primeiraVez(flag: Flag) {
    if (this.estado.flags.has(flag)) return false;
    this.marcar(flag);
    return true;
  }
}
