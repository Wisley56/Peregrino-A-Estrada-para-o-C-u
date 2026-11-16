import * as THREE from 'three';
import { ARFAGEM_LIVRE, CameraTerceira } from './core/Camera';
import { Entrada, travarPonteiro } from './core/Entrada';
import { CHEFOES, Estado } from './core/Estado';
import { Som } from './core/Som';
import { type Idade, identidadePadrao, visualDe } from './core/Aparencia';
import { Efeitos } from './fx/Efeitos';
import { Hud } from './ui/Hud';
import { Dialogos, type Passo } from './dialogo/Dialogos';
import { CameraConversa, type PlanoConversa } from './core/CameraConversa';
import { falante } from './dialogo/Falantes';
import { Npc } from './entidades/Npc';
import { Fauna } from './fauna/Fauna';
import { anatomia } from './fauna/Especies';
import { iniciarRetratos } from './dialogo/Retratos';
import { Criacao } from './ui/Criacao';
import { Mundo } from './mundo/Mundo';
import { Cripta } from './mundo/Cripta';
import { Alvo, Area, IdArea } from './mundo/Area';
import { ORIGENS } from './mundo/aberto/Geografia';
import { pintarMapa } from './mundo/aberto/MapaDoTerreno';
import { Carimbo, TerrenoMundo } from './mundo/aberto/TerrenoMundo';
import { SUJEIRAS } from './mundo/Hospital';
import { Deserto, TOTAL_SOMBRAS_DESERTO } from './mundo/Deserto';
import { PocoMeioDia } from './mundo/PocoMeioDia';
import { Cidade, NOME_ISCA, PEDRAS_DAMIAO, TOTAL_ATOS_CIDADE, TOTAL_SOMBRAS_CIDADE, type Isca, type Pobre } from './mundo/Cidade';
import { pedraDeCarregar } from './mundo/CidadeModelos';
import { menino } from './entidades/Dulce';
import { ENFERMOS, corpoDoEnfermo, enfermo, registrarRetratosDosEnfermos } from './entidades/Enfermos';
import { BahiaAlta, BahiaBaixa } from './mundo/Bahia';
import { Creta } from './mundo/Creta';
import { etapaDoNavio, Tempestade, CARGAS } from './mundo/Tempestade';
import { etapaDoNaufragio, ID_IRA, Naufragio } from './mundo/Naufragio';
import { BOATOS, FEIXES, Malta, etapaDeMalta } from './mundo/Malta';
import { feixeDeGravetos } from './mundo/MaltaModelos';
import { BRASA_MANSA } from './entidades/Ira';
import { sacoDeTrigo } from './mundo/NavioModelos';
import { ID_CORACAO } from './mundo/LargoDoCruzeiro';
import { Banquete, type Ajudante, type IdAjudante } from './mundo/Banquete';
import { Chefe } from './entidades/Guardiao';
import { Minimapa, Marca } from './ui/Minimapa';
import { Pausa } from './ui/Pausa';
import { CAPELA } from './mundo/Terreno';
import type { CapelaRegional } from './mundo/Capela';
import { colunaDeLuz, construirCeu } from './mundo/Cenario';
import { DURACAO_CARINHO, Peregrino } from './entidades/Peregrino';
import { Pomba } from './entidades/Pomba';
import { Sombra } from './entidades/Sombra';
import { Preferencias } from './core/Preferencias';
import { TelaDons } from './ui/Dons';
import { Configuracoes } from './ui/Configuracoes';
import { NavegacaoControle } from './ui/NavegacaoControle';
import { rotularTeclas, trocarRotulosDaTela } from './ui/Rotulos';
import type { AreaDev, ChefeDev, GanchosDev, OpcoesDev } from './dev/tipos';

const TOTAL_SOMBRAS_VALE = 5;

const NOMES_AREA: Record<IdArea, string> = { vale: 'O Vale', cripta: 'A Cripta', deserto: 'Deserto das Vozes', meiodia: 'Poço do Meio-Dia', cidade: 'Cidade Dourada', palacio: 'Palácio da Gula', bahiabaixa: 'Bahia: Cidade Baixa', bahiaalta: 'Bahia: Cidade Alta', creta: 'Creta: Bons Portos', navio: 'O Mar da Tempestade', naufragio: 'O Naufrágio', malta: 'Malta' };
const NOME_AJUDANTE: Record<IdAjudante, string> = { tomas: 'Tomás', rita: 'Rita', beppo: 'Beppo', leproso: 'o homem curado' };
/** O que cada pobre diz quando o peregrino reparte com ele o peso do banquete. */
const FALA_REPARTIR: Record<IdAjudante, string> = {
  tomas: 'Tomás: "Você repartiu comigo. Agora eu reparto com você."',
  rita: 'Rita: "Me dê isso. Lá em casa tem três bocas."',
  beppo: 'Beppo: "Deixa que eu carrego! Eu sou forte!"',
  leproso: 'O homem curado: "Você me tocou quando ninguém tocava. Me dê o peso."',
};
/** Os atos de piedade da Cidade Dourada (flags do save). */
const ATOS_CIDADE = ['cidade_leproso', 'cidade_ajudou_tomas', 'cidade_ajudou_rita', 'cidade_ajudou_beppo', 'cidade_lobo', 'cidade_damiao'];
const NOME_POBRE: Record<Pobre['id'], string> = { tomas: 'Tomás', rita: 'Rita', beppo: 'Beppo' };
/** O que a Gula sussurra quando o peregrino pega uma isca. */
const SUSSURRO_ISCA: Record<Isca['tipo'], string> = {
  prato: 'Coma. Amanhã você jejua.',
  calice: 'Ouro puro. Ninguém vai sentir falta.',
  moedas: 'Guarde. Os pobres sempre vão existir.',
  taca: 'Só mais uma taça. Você merece.',
  coroa: 'Fica bem em você. Fique com ela.',
};

interface Projetil {
  malha: THREE.Mesh;
  vel: THREE.Vector3;
  vida: number;
  alvo: Alvo | null;
}

interface Interacao {
  pos: () => THREE.Vector3;
  raio: number;
  rotulo: string | (() => string);
  agir: () => void;
  /** Só aparece quando isto for verdadeiro. */
  ativa?: () => boolean;
}

export class Jogo {
  readonly renderer: THREE.WebGLRenderer;
  readonly cena = new THREE.Scene();
  readonly camera: CameraTerceira;
  readonly entrada: Entrada;
  readonly estado = new Estado();
  readonly hud = new Hud();
  /** Conversas e falas, escritas em Ink (src/dialogos/*.ink). */
  readonly dialogos: Dialogos = new Dialogos(this.hud, {
    tem: (f) => this.estado.flags.has(f),
    marcar: (f) => this.marcar(f),
    nivel: (d) => this.estado.nivel(d as Parameters<Estado['nivel']>[0]),
    valor: (k) => this.valorDialogo(k),
    nome: () => (this.estado.identidade ?? identidadePadrao()).nome,
    feminino: () => (this.estado.identidade ?? identidadePadrao()).genero === 'f',
    evento: (e) => this.eventoDialogo(e),
  });
  readonly som = new Som();
  readonly mundo = new Mundo();
  cripta!: Cripta;
  /** Área onde o peregrino está agora. */
  area: Area = this.mundo;
  /** Ajoelhado no confessionário, conversando com o padre. */
  private emConfissao = false;
  readonly peregrino = new Peregrino(visualDe(identidadePadrao()));
  /** Opções do painel de desenvolvedor (`src/dev`). Só existe no modo dev; em produção fica sempre null. */
  dev: OpcoesDev | null = null;
  readonly pomba = new Pomba();
  private modoCriacao = false;
  private rumoCriacao = 0;
  private efeitos: Efeitos;
  private sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
  private hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6b5a3a, 1.5);
  private ceu = construirCeu();
  private relogio = new THREE.Clock();
  private travado: Alvo | null = null;
  private projeteis: Projetil[] = [];
  private golpePendente = -1;
  /** Onde a mira livre aponta (raio da câmera pelo centro da tela) e o inimigo que está sob ela. */
  private miraPonto = new THREE.Vector3();
  private miraAlvo: Alvo | null = null;
  private tempoOracao = 0;
  /** Tempo acumulado para a cura do Repouso em Deus (Temor de Deus 4). */
  private curaOracao = 0;
  private somOracao = 0;
  private somPasso = 0;
  private avisoCouraca = 0;
  private coluna = colunaDeLuz();
  private tempoColuna = -1;
  private morrendo = false;
  private transitando = false;
  private puxao: { de: THREE.Vector3; para: THREE.Vector3; t: number } | null = null;
  private comecou = false;
  private lamparinaAcesa = false;
  /** A fauna de cada região (só a da área atual aparece e se mexe). */
  private faunas = new Map<IdArea, Fauna>();
  private interacoes: Record<IdArea, Interacao[]> = { vale: [], cripta: [], deserto: [], meiodia: [], cidade: [], palacio: [], bahiabaixa: [], bahiaalta: [], creta: [], navio: [], naufragio: [], malta: [] };
  /** O Mar da Tempestade, primeira parte: a costa sul de Creta, em Bons Portos (At 27,8). */
  readonly creta = new Creta();
  readonly navio = new Tempestade();
  readonly naufragio = new Naufragio({ lutaComecou: () => this.lutaDaIraComecou() });
  readonly malta = new Malta();
  readonly cidade = new Cidade();
  /** As Ruas da Bahia: a Cidade Baixa (com Itapagipe) e a Cidade Alta, ligadas pelo Elevador Lacerda. */
  readonly bahiaBaixa = new BahiaBaixa();
  readonly bahiaAlta = new BahiaAlta({
    lutaComecou: () => this.lutaDoLargoComecou(),
    socorrido: (n) => this.enfermoDoLargoSocorrido(n),
    petrificou: () => this.enfermoDoLargoPetrificou(),
  });
  /** O Salão do Banquete, dentro do palácio: a arena da Gula. Os pobres da cidade vêm com o peregrino. */
  readonly banquete = new Banquete(
    {
      lutaComecou: () => this.lutaBanqueteComecou(),
      banqueteServido: (primeira) => this.banqueteServido(primeira),
      travessaCaiu: (restantes) => this.travessaCaiu(restantes),
    },
    (() => {
      const def = (id: string) => this.cidade.pobres.find((p) => p.id === id)!.npc.def;
      return { tomas: def('tomas'), rita: def('rita'), beppo: def('beppo'), leproso: this.cidade.leprosoCurado.def };
    })(),
  );
  /** Peso dos pratos da Gula, só durante a luta (some ao repartir, em jejum ou ao sair). */
  private pesoBanquete = 0;
  private jejum = 0;
  /** Com quem o peregrino já repartiu nesta luta (Piedade 3 devolve um coração uma vez por pessoa). */
  private repartiu = new Set<IdAjudante>();
  readonly meiodia = new PocoMeioDia({ lutaComecou: () => this.lutaMeioDiaComecou() });
  private minimapa = new Minimapa();
  /** Área cuja base o minimapa está mostrando. */
  private areaNoMapa = '';
  private prefs = new Preferencias();
  /** Quadros por segundo (média suave), mostrados na aba Gráficos. */
  private qps = 60;
  /** Configurações: abertas pela tela inicial (Menu) e pela pausa. */
  readonly config = new Configuracoes(this.prefs, {
    graficos: () => this.aplicarGraficos(),
    qps: () => this.qps,
    fechou: () => {
      if (this.pausa.aberta) this.pausa.focar();
    },
  });
  private pausa = new Pausa({
    continuar: () => this.retomar(),
    sair: () => this.sairParaTitulo(),
    dons: () => this.abrirDons(),
    config: () => this.config.abrir(),
  });
  private telaDons = new TelaDons(this.estado, {
    fechar: () => this.fecharDons(),
    // a própria rosácea mostra o nó acendendo; aqui só o som da graça
    fortaleceu: () => this.som.graca(),
  });
  private pausado = false;
  private navUi = new NavegacaoControle();
  private quadrosMenu = 0;
  /** Câmera de conversa: planos e contraplanos durante os diálogos com NPCs. */
  private conversa = new CameraConversa();
  /** Com quem o peregrino está conversando (o corpo do NPC que fala), ou null. */
  private interlocutor: Npc | null = null;
  /** NPCs que a conversa virou para o peregrino (e que voltam ao que faziam quando ela acaba). */
  private viradosNaConversa = new Set<Npc>();
  /** Quem está com a palavra no plano de perto. */
  private vezDe: 'npc' | 'peregrino' = 'npc';
  /** Segundos de torpor (o vício da acídia): o peregrino fica pesado até rezar. */
  private torpor = 0;
  /** O olhar do Coração de Pedra: por uns segundos o peregrino passa ao largo (não socorre, anda devagar). */
  private indiferenca = 0;
  private corSuave = -1;
  private areaDaCor: unknown = null;
  /** Segundos que ainda restam do dom da Ciência ligado. */
  private tempoCiencia = 0;
  /** O chão do mundo inteiro (as regiões e a terra entre elas). */
  private terrenoDoMundo: TerrenoMundo | null = null;
  get terrenoMundo() {
    return (this.terrenoDoMundo ??= this.criarTerrenoMundo());
  }

  readonly deserto = new Deserto({
    sussurro: (t) => this.aoSussurro(t),
    miragemDesfeita: (porCiencia) => this.aoDesfazerMiragem(porCiencia),
  });
  private flashLuz = new THREE.PointLight(0xfff0c0, 0, 12, 1.4);
  private geoLuz = new THREE.SphereGeometry(0.22, 12, 8);
  private matLuz = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });

  constructor(recipiente: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    recipiente.appendChild(this.renderer.domElement);
    iniciarRetratos(this.renderer);

    this.camera = new CameraTerceira(innerWidth / innerHeight);
    this.entrada = new Entrada(this.renderer.domElement);
    const ent = this.entrada;
    this.hud.rotular = (t) => (ent.dispositivo === 'controle' ? rotularTeclas(t, ent.controle.familia) : t);
    this.hud.aoExibir = (p, segundos) => this.aoFalar(p, segundos);
    this.hud.aoEscolher = () => this.aoEscolhasDaConversa();
    this.config.ligarControle(ent.controle);
    ent.aoTrocarDispositivo = () => {
      this.config.desenharControle();
      trocarRotulosDaTela(ent.dispositivo === 'controle', ent.controle.familia);
    };
    this.efeitos = new Efeitos(this.renderer, this.cena, this.camera.cam);

    this.cena.fog = new THREE.Fog(0xe8dcc4, 45, 150);
    this.cena.add(this.ceu, this.hemi);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const sc = this.sol.shadow.camera;
    sc.left = sc.bottom = -32;
    sc.right = sc.top = 32;
    sc.near = 1;
    sc.far = 140;
    this.sol.shadow.bias = -0.0006;
    this.sol.shadow.normalBias = 0.04;
    this.cena.add(this.sol, this.sol.target);
    this.cena.add(this.mundo.grupo, this.deserto.grupo, this.meiodia.grupo, this.cidade.grupo, this.banquete.grupo, this.bahiaBaixa.grupo, this.bahiaAlta.grupo, this.creta.grupo, this.navio.grupo, this.naufragio.grupo, this.malta.grupo, this.peregrino.raiz, this.pomba.raiz, this.coluna, this.flashLuz);
    this.coluna.visible = false;
    this.aplicarGraficos();

    addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.efeitos.tamanho(innerWidth, innerHeight);
      this.camera.cam.aspect = innerWidth / innerHeight;
      this.camera.cam.updateProjectionMatrix();
    });
  }

  /** Aplica a tela de Gráficos: resolução, sombras e a cadeia de pós-processamento. */
  aplicarGraficos() {
    const g = this.prefs.graficos;
    this.renderer.setPixelRatio(g.resolucao);
    this.renderer.setSize(innerWidth, innerHeight);
    const ligadas = g.sombras !== 'desligadas';
    const tipo = g.sombras === 'simples' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    const lado = g.sombras === 'detalhadas' ? 4096 : g.sombras === 'simples' ? 1024 : 2048;
    const sm = this.renderer.shadowMap;
    const mudou = sm.enabled !== ligadas || sm.type !== tipo;
    sm.enabled = ligadas;
    sm.type = tipo;
    if (this.sol.shadow.mapSize.x !== lado) {
      this.sol.shadow.mapSize.set(lado, lado);
      this.sol.shadow.map?.dispose();
      this.sol.shadow.map = null;
    }
    // ligar/desligar ou trocar o tipo de sombra pede recompilar os materiais
    if (mudou)
      this.cena.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
      });
    this.efeitos.configurar(g);
  }

  /** Carrega o mundo "limpo" (fundo da tela inicial). O progresso entra depois, em `iniciarSlot`. */
  async carregar() {
    await Promise.all([this.mundo.povoar(this.estado.sombrasVencidas), this.deserto.povoar(), this.cidade.povoar()]);
    this.deserto.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.cidade.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.banquete.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.bahiaBaixa.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.bahiaAlta.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.naufragio.reiniciar(this.estado.sombrasVencidas, (x) => this.estado.flags.has(x));
    registrarRetratosDosEnfermos();
    this.meiodia.reiniciar(this.estado.sombrasVencidas);
    this.montarCripta();
    await this.povoarFauna();
    this.estado.checkpoint = this.mundo.inicio.toArray() as [number, number, number];
    this.posicionarNoCheckpoint();
    this.renderer.setAnimationLoop(() => this.quadro());
  }

  /**
   * Abre um espaço de jogo: com save, continua de onde parou; vazio, começa um jogo novo
   * (passando pela criação do personagem).
   */
  iniciarSlot(slot: number) {
    const temSave = this.estado.carregarSlot(slot);
    this.minimapa.esquecer('deserto');
    this.areaNoMapa = '';
    this.reconstruirMundo();
    if (!temSave) this.estado.checkpoint = this.mundo.inicio.toArray() as [number, number, number];
    this.posicionarNoCheckpoint();
    if (this.estado.identidade === null) this.abrirCriacao();
    else this.comecar();
  }

  /** Recria o que depende do progresso (sombras, véu, arenas, NPCs, a cripta) a partir do estado atual. */
  private reconstruirMundo() {
    const e = this.estado;
    this.mundo.reporSombras(e.sombrasVencidas);
    if (e.flags.has('veu_oeste')) this.mundo.abrirVeu(true);
    else this.mundo.fecharVeu();
    this.deserto.reiniciar(e.sombrasVencidas, e.flags);
    this.meiodia.reiniciar(e.sombrasVencidas);
    this.cidade.reiniciar(e.sombrasVencidas, e.flags);
    this.banquete.reiniciar(e.sombrasVencidas, e.flags);
    this.bahiaBaixa.reiniciar(e.sombrasVencidas, e.flags);
    this.bahiaAlta.reiniciar(e.sombrasVencidas, e.flags);
    this.naufragio.reiniciar(e.sombrasVencidas, (x) => e.flags.has(x));
    this.naufragioArrumado = false;
    this.brasa = 0;
    this.irado = false;
    this.maltaArrumada = false;
    this.oracaoPai = 0;
    this.levandoFeixe = false;
    this.nasCostas = null;
    this.peregrino.carregar(null);
    this.pesoBanquete = 0;
    this.montarCripta();
  }

  /** Cria a fauna de todas as regiões (a mesma distribuição em toda partida). */
  private async povoarFauna() {
    const areas = [this.mundo, this.cripta, this.deserto, this.meiodia, this.cidade, this.bahiaBaixa, this.bahiaAlta, this.creta, this.navio, this.naufragio, this.malta] as Area[];
    await Promise.all(
      areas.map(async (a, i) => {
        const fauna = new Fauna(a);
        await fauna.povoar(a.povoamento?.() ?? [], 101 + i * 7919);
        this.faunas.set(a.id, fauna);
        this.cena.add(fauna.grupo);
      }),
    );
    this.criarInteracoes();
    this.aplicarAmbiente();
  }

  /** "F: fazer carinho" em cada bicho manso da área. */
  private interacoesDaFauna(id: IdArea): Interacao[] {
    const fauna = this.faunas.get(id);
    if (!fauna) return [];
    return fauna.animais
      .filter((b) => b.ficha.carinho)
      .map((b) => ({
        pos: () => b.pos,
        raio: 1.8,
        rotulo: `F: fazer carinho ${b.ficha.feminino ? 'na' : 'no'} ${b.ficha.nome}`,
        agir: () => {
          const per = this.peregrino;
          per.rumo = Math.atan2(b.pos.x - per.pos.x, b.pos.z - per.pos.z);
          per.carinhoAlto = anatomia(b.especie).corpo === 'quadruped_medium';
          per.iniciar('carinho');
          b.carinho = DURACAO_CARINHO;
          if (b.ficha.voz) setTimeout(() => this.som.voz(b.ficha.voz!), 700);
        },
      }));
  }

  /** (Re)cria a cripta a partir do progresso atual. */
  /**
   * O chão do mundo inteiro: as regiões ao ar livre carimbadas no terreno procedural. A Cidade Alta fica a leste da
   * beira da escarpa e a Baixa a oeste dela (as duas dividem o mesmo pedaço do mapa).
   */
  private criarTerrenoMundo() {
    const carimbo = (a: Area, faixa: number, corte: { xMin?: number; xMax?: number } = {}): Carimbo => {
      const f = a.fonteMapa();
      return {
        id: a.id, faixa,
        x0: Math.max(f.x0, corte.xMin ?? -Infinity), z0: f.z0, x1: Math.min(f.x0 + f.largura, corte.xMax ?? Infinity), z1: f.z0 + f.profundidade,
        altura: (x, z) => a.altura(x, z),
        cor: (x, z) => f.cor(x, z),
      };
    };
    const beira = ORIGENS.bahiaalta.x - 44;
    return new TerrenoMundo([
      carimbo(this.mundo, 90), carimbo(this.deserto, 90), carimbo(this.cidade, 90),
      carimbo(this.bahiaAlta, 80, { xMin: beira }), carimbo(this.bahiaBaixa, 80, { xMax: beira }),
      carimbo(this.creta, 120), carimbo(this.naufragio, 100), carimbo(this.malta, 120),
    ]);
  }

  private montarCripta() {
    if (this.cripta) this.cena.remove(this.cripta.grupo);
    this.cripta = new Cripta(this.estado.sombrasVencidas, this.estado.flags, {
      portaoAberto: () => this.portaoDaCriptaAberto(),
      braseiroAceso: (n) => this.braseiroAceso(n),
      braseirosApagaram: () => {
        this.som.apagou();
        this.hud.anunciar('As chamas se apagaram…', 2);
      },
      lutaComecou: () => this.lutaComecou(),
    });
    this.cena.add(this.cripta.grupo);
    this.faunas.get('cripta')?.trocarFisica(this.cripta);
    this.criarInteracoes();
  }

  private posicionarNoCheckpoint() {
    this.area = this.areaPorId(this.estado.checkpointArea);
    this.aplicarAmbiente();
    const [x, y, z] = this.estado.checkpoint;
    this.peregrino.teleportar(x, y, z);
    this.peregrino.rumo = Math.PI; // olhando para o norte
    this.camera.reposicionar();
    this.vestirPeregrino();
    this.lamparinaAcesa = this.estado.flags.has('lamparina') && this.area === this.cripta;
    this.atualizarLamparina();
    this.pomba.raiz.position.set(x, y + 3, z);
  }

  /**
   * A idade vem da história, não da criação (Documento base): jovem nas primeiras regiões (o Vale, o Deserto e a
   * Cidade Dourada), adulto da Bahia em diante (os anos passam na viagem por mar) e idoso no capítulo final.
   * `?idade=jovem|adulto|idoso` força uma idade para testar.
   */
  private idadeDaHistoria(): Idade {
    const teste = new URLSearchParams(location.search).get('idade');
    if (teste === 'jovem' || teste === 'adulto' || teste === 'idoso') return teste;
    const f = this.estado.flags;
    return f.has('peregrino_adulto') || f.has('bahia_entrou') ? 'adulto' : 'jovem';
  }

  /** A idade com que o peregrino está vestido agora (para só remontar o boneco quando ela muda). */
  private idadeVestida: Idade | null = null;

  /** Aplica a identidade salva (ou a padrão) com a idade em que a história está. */
  private vestirPeregrino() {
    const id = this.estado.identidade ?? identidadePadrao();
    this.idadeVestida = this.idadeDaHistoria();
    this.peregrino.vestir(visualDe(id, this.idadeVestida));
  }

  /** Mostra a criação do personagem; ao confirmar, salva e começa o jogo. */
  abrirCriacao() {
    this.som.ligar();
    this.modoCriacao = true;
    this.rumoCriacao = Math.PI; // de frente para a câmera
    this.entrada.permitirTrava = false;
    document.getElementById('hud')!.style.visibility = 'hidden';
    this.hud.escurecer(false);
    new Criacao(
      this.estado.identidade,
      (id, idade) => this.peregrino.vestir(visualDe(id, idade)),
      (id) => {
        this.estado.identidade = id;
        this.estado.salvar();
        this.vestirPeregrino();
        this.modoCriacao = false;
        this.entrada.permitirTrava = true;
        document.getElementById('hud')!.style.visibility = 'visible';
        this.peregrino.rumo = Math.PI;
        this.camera.guinada = 0;
        this.comecar();
      },
      () => this.voltarAoTitulo(),
    );
  }

  /** Chamado ao voltar da criação: a tela inicial reaparece. Definido em main.ts. */
  aoVoltarAoTitulo: () => void = () => {};

  /** Desfaz a abertura do espaço (nada foi salvo) e devolve o mundo limpo para o fundo da tela inicial. */
  private voltarAoTitulo() {
    this.modoCriacao = false;
    this.entrada.permitirTrava = true;
    this.estado.zerar();
    this.estado.slot = null;
    this.reconstruirMundo();
    this.estado.checkpoint = this.mundo.inicio.toArray() as [number, number, number];
    this.posicionarNoCheckpoint();
    this.aoVoltarAoTitulo();
  }

  comecar() {
    this.som.ligar();
    this.comecou = true;
    document.getElementById('hud')!.style.visibility = 'visible';
    this.som.ambienteDe(this.tipoAmbiente());
    this.hud.escurecer(false);
    travarPonteiro(this.renderer.domElement);
    if (!this.estado.flags.has('intro')) this.dialogos.tocar('vale_intro');
  }

  private marcar(flag: string) {
    this.estado.flags.add(flag);
    this.estado.salvar();
  }

  private primeiraVez(flag: string) {
    if (this.estado.flags.has(flag)) return false;
    this.marcar(flag);
    return true;
  }

  // ───────────────────────────── áreas ─────────────────────────────

  /** Luz, névoa e o que fica visível em cada área. */
  private aplicarAmbiente() {
    const naCripta = this.area === this.cripta;
    const noDeserto = this.area === this.deserto;
    const noPoco = this.area === this.meiodia;
    const naCidade = this.area === this.cidade;
    const noBanquete = this.area === this.banquete;
    const naBahia = this.area === this.bahiaBaixa || this.area === this.bahiaAlta;
    this.mundo.grupo.visible = this.area === this.mundo;
    this.cripta.grupo.visible = naCripta;
    this.deserto.grupo.visible = noDeserto;
    this.meiodia.grupo.visible = noPoco;
    this.cidade.grupo.visible = naCidade;
    this.banquete.grupo.visible = noBanquete;
    this.bahiaBaixa.grupo.visible = this.area === this.bahiaBaixa;
    this.bahiaAlta.grupo.visible = this.area === this.bahiaAlta;
    const emCreta = this.area === this.creta;
    this.creta.grupo.visible = emCreta;
    const noNavio = this.area === this.navio;
    this.navio.grupo.visible = noNavio;
    const noNaufragio = this.area === this.naufragio;
    this.naufragio.grupo.visible = noNaufragio;
    const emMalta = this.area === this.malta;
    this.malta.grupo.visible = emMalta;
    this.climaDeMalta = this.malta.clima;
    for (const [id, fauna] of this.faunas) fauna.grupo.visible = id === this.area.id;
    this.ceu.visible = !naCripta;
    this.sol.visible = !naCripta;
    const fog = this.cena.fog as THREE.Fog;
    const ceu = (this.ceu.material as THREE.ShaderMaterial).uniforms;
    if (naCripta) {
      fog.color.setHex(0x07060a);
      fog.near = 10;
      fog.far = 46;
      this.hemi.color.setHex(0xa49c9a);
      this.hemi.groundColor.setHex(0x3a2c20);
      this.hemi.intensity = 0.95;
    } else if (noPoco) {
      // meio-dia: sol a pino, luz branca e dura, ar tremendo de calor
      fog.color.setHex(0xfff0d4);
      fog.near = 28;
      fog.far = 110;
      this.hemi.color.setHex(0xfff8ec);
      this.hemi.groundColor.setHex(0xb08a58);
      this.hemi.intensity = 1.35;
      this.sol.color.setHex(0xfffaf0);
      this.sol.intensity = 2.9;
      ceu.topo.value.setHex(0x7aa8e0);
      ceu.horizonte.value.setHex(0xfff0d0);
    } else if (noBanquete) {
      // salão fechado à luz de velas: ouro quente, cantos escuros, ar pesado de comida
      fog.color.setHex(0x2a140e);
      fog.near = 26;
      fog.far = 70;
      this.hemi.color.setHex(0xffe0b0);
      this.hemi.groundColor.setHex(0x4a2a18);
      this.hemi.intensity = 0.95;
      this.sol.color.setHex(0xffd0a0);
      this.sol.intensity = 1.1;
      ceu.topo.value.setHex(0x1a0a10);
      ceu.horizonte.value.setHex(0x4a2018);
    } else if (naCidade) {
      // fim de tarde na Úmbria: luz dourada e baixa, névoa quente sobre os olivais
      fog.color.setHex(0xf2dcb4);
      fog.near = 48;
      fog.far = 160;
      this.hemi.color.setHex(0xdce8ff);
      this.hemi.groundColor.setHex(0x7a6040);
      this.hemi.intensity = 1.45;
      this.sol.color.setHex(0xffdca0);
      this.sol.intensity = 2.6;
      ceu.topo.value.setHex(0x4f8ad8);
      ceu.horizonte.value.setHex(0xf6d29a);
    } else if (noNavio || noNaufragio) {
      // a tempestade: céu de chumbo, chuva que fecha o horizonte, e a noite de catorze dias; o relâmpago clareia tudo
      const k = noNavio ? this.navio : this.naufragio;
      const e = k.escuridao, r = k.relampago;
      fog.color.setHex(0x6a747c).lerp(new THREE.Color(0x10161c), e).lerp(new THREE.Color(0xd8e0ea), r * 0.6);
      fog.near = 18;
      fog.far = 110 - e * 30;
      this.hemi.color.setHex(0xb8c6d4);
      this.hemi.groundColor.setHex(0x2a3238);
      this.hemi.intensity = 1.05 - e * 0.62 + r * 1.4;
      this.sol.color.setHex(0xc8d4e0);
      this.sol.intensity = 0.7 - e * 0.55;
      ceu.topo.value.setHex(0x3a424a).lerp(new THREE.Color(0x05080c), e).lerp(new THREE.Color(0xc0c8d8), r * 0.5);
      ceu.horizonte.value.setHex(0x6a747c).lerp(new THREE.Color(0x141a20), e).lerp(new THREE.Color(0xd8e0ea), r * 0.5);
    } else if (emMalta && this.malta.clima < 2) {
      // Malta antes da cor: a garoa fria da praia (o fogo e a víbora), depois o céu nublado dos três dias com Públio
      const chuva = this.malta.clima === 0;
      fog.color.setHex(chuva ? 0x7a848a : 0xaab4b8);
      fog.near = chuva ? 24 : 60;
      fog.far = chuva ? 130 : 230;
      this.hemi.color.setHex(0xc8d2dc);
      this.hemi.groundColor.setHex(0x4a4a44);
      this.hemi.intensity = chuva ? 0.95 : 1.2;
      this.sol.color.setHex(0xd8e0e8);
      this.sol.intensity = chuva ? 0.55 : 1.3;
      ceu.topo.value.setHex(chuva ? 0x4a545c : 0x7a8a98);
      ceu.horizonte.value.setHex(chuva ? 0x7a848a : 0xb8c4c8);
    } else if (emCreta || emMalta) {
      // o fim do verão no Mediterrâneo: luz clara e seca, mar de um azul fundo, e o horizonte longe
      fog.color.setHex(0xd9e6ec);
      fog.near = 90;
      fog.far = 300;
      this.hemi.color.setHex(0xd8ecff);
      this.hemi.groundColor.setHex(0x8a7c5a);
      this.hemi.intensity = 1.5;
      this.sol.color.setHex(0xfff0d8);
      this.sol.intensity = 2.7;
      ceu.topo.value.setHex(0x2a78d0);
      ceu.horizonte.value.setHex(0xe0ecf0);
    } else if (naBahia) {
      // o sol de Salvador: luz branca e quente, céu muito azul, e o ar limpo da brisa do mar
      fog.color.setHex(0xdde8ee);
      fog.near = 60;
      fog.far = 210;
      this.hemi.color.setHex(0xd6ecff);
      this.hemi.groundColor.setHex(0x8a7a5a);
      this.hemi.intensity = 1.5;
      this.sol.color.setHex(0xfff2dc);
      this.sol.intensity = 2.7;
      ceu.topo.value.setHex(0x2f84e0);
      ceu.horizonte.value.setHex(0xe4eef2);
    } else if (noDeserto) {
      // sol forte e ar quente: névoa clara, cor de areia
      fog.color.setHex(0xf0dcb4);
      fog.near = 50;
      fog.far = 165;
      this.hemi.color.setHex(0xe6eeff);
      this.hemi.groundColor.setHex(0x9a7448);
      this.hemi.intensity = 1.45;
      this.sol.color.setHex(0xffe6b8);
      this.sol.intensity = 2.8;
      ceu.topo.value.setHex(0x5a92d8);
      ceu.horizonte.value.setHex(0xf6dfb2);
    } else {
      fog.color.setHex(0xe8dcc4);
      fog.near = 45;
      fog.far = 150;
      this.hemi.color.setHex(0xcfe3ff);
      this.hemi.groundColor.setHex(0x6b5a3a);
      this.hemi.intensity = 1.5;
      this.sol.color.setHex(0xfff1d6);
      this.sol.intensity = 2.4;
      ceu.topo.value.setHex(0x4a86d0);
      ceu.horizonte.value.setHex(0xf3d9b0);
    }
    this.renderer.setClearColor(naCripta ? 0x050407 : 0x000000);
    // a cripta não tem teto: a câmera fica alta para enxergar por cima das paredes
    this.camera.arfagemMin = naCripta ? 0.5 : ARFAGEM_LIVRE;
    this.camera.subirAoBater = naCripta;
    this.som.ambienteDe(this.comecou ? this.tipoAmbiente() : null);
    if (naCripta) this.camera.arfagem = Math.max(this.camera.arfagem, 0.5);
  }

  private tipoAmbiente() {
    return this.area === this.cripta ? 'cripta' : this.area === this.deserto || this.area === this.meiodia ? 'deserto' : this.area === this.navio || (this.area === this.naufragio && !this.estado.flags.has('naufragio_ira_vencida')) ? 'tempestade' : null;
  }

  private areaPorId(id: IdArea): Area {
    return id === 'cripta' ? this.cripta : id === 'deserto' ? this.deserto : id === 'meiodia' ? this.meiodia : id === 'cidade' ? this.cidade : id === 'palacio' ? this.banquete : id === 'bahiabaixa' ? this.bahiaBaixa : id === 'bahiaalta' ? this.bahiaAlta : id === 'creta' ? this.creta : id === 'navio' ? this.navio : id === 'naufragio' ? this.naufragio : id === 'malta' ? this.malta : this.mundo;
  }

  private sombrasDoDesertoVencidas() {
    return [...this.estado.sombrasVencidas].filter((id) => id.startsWith('deserto_')).length;
  }

  /** A cor da região onde o peregrino está (a cripta usa a do Vale). */
  private corAtual() {
    if (this.area === this.cidade) return this.corDaCidade();
    if (this.area === this.banquete) return 1; // o ouro falso da Gula brilha sempre
    if (this.area === this.bahiaBaixa || this.area === this.bahiaAlta) return this.corDaBahia();
    // o Mar da Tempestade só recupera a cor em Malta, depois do naufrágio
    if (this.area === this.creta || this.area === this.navio || this.area === this.naufragio || this.area === this.malta) return this.estado.flags.has('mar_restaurado') ? 1 : 0;
    return this.area === this.deserto || this.area === this.meiodia ? this.sombrasDoDesertoVencidas() / TOTAL_SOMBRAS_DESERTO : this.estado.cor;
  }

  // ───────────────────────────── deserto ─────────────────────────────

  private aoSussurro(texto: string) {
    if (this.hud.dialogoAberto || this.tempoCiencia > 0) return; // com a Ciência, as vozes perdem a força
    this.hud.sussurrar(texto);
    this.som.sussurro();
    if (this.primeiraVez('deserto_dica_vozes'))
      setTimeout(
        () =>
          this.dialogos.tocar('deserto_dica_vozes'),
        1500,
      );
  }

  private aoDesfazerMiragem(porCiencia: boolean) {
    this.som.dissolver();
    this.hud.anunciar(porCiencia ? 'A Ciência mostrou a verdade: era uma miragem!' : 'Era uma miragem!', 2.4);
    if (!porCiencia && this.primeiraVez('deserto_dica_miragem'))
      setTimeout(
        () =>
          this.dialogos.tocar('deserto_dica_miragem'),
        900,
      );
  }

  /** Dom da Ciência (E): por alguns segundos, vê o que as coisas são de verdade. */
  private usarCiencia() {
    if (!this.estado.flags.has('dom_ciencia') || this.tempoCiencia > 0) return;
    if (this.torpor > 0) {
      this.hud.anunciar('O torpor pesa demais. Segure R para rezar.', 1.8);
      return;
    }
    const nivel = this.estado.nivel('ciencia');
    const custo = nivel >= 3 ? 10 : 15;
    if (this.estado.energia < custo) {
      this.hud.anunciar(`A Ciência precisa de ${custo} de energia. Segure R para rezar.`, 2);
      return;
    }
    this.estado.energia -= custo;
    this.tempoCiencia = nivel >= 2 ? 11 : 8;
    this.som.ciencia();
    this.hud.mostrarDica(null);
  }

  private atualizarCiencia(dt: number) {
    const tem = this.estado.flags.has('dom_ciencia');
    if (this.tempoCiencia > 0) {
      this.tempoCiencia = Math.max(0, this.tempoCiencia - dt);
      if (this.area === this.deserto) {
        const r = this.deserto.revelar(this.peregrino.pos, this.estado.nivel('ciencia') >= 4 ? 45 : 30);
        if (r.parede) {
          this.marcar('deserto_parede');
          this.minimapa.esquecer('deserto');
          this.areaNoMapa = '';
          this.som.dissolver();
          setTimeout(() => this.som.graca(), 500);
          this.efeitos.ouro = 0.8;
          this.dialogos.tocar('deserto_parede_revelada');
        }
      }
    }
    this.meiodia.ciencia = this.tempoCiencia > 0 && this.area === this.meiodia;
    this.efeitos.ciencia = this.tempoCiencia > 0 ? Math.min(1, this.tempoCiencia / 0.6) : 0;
    this.hud.mostrarDom(
      tem ? (this.tempoCiencia > 0 ? `✧ Ciência · ${Math.ceil(this.tempoCiencia)} s` : '✧ Ciência · E') : null,
      this.tempoCiencia > 0,
    );
  }

  /** Números que o roteiro pede com valor("chave"). */
  /** Interação padrão de um NPC: ele se vira e gesticula enquanto a conversa dura. */
  private falarCom(npc: Npc): Interacao {
    return {
      pos: () => npc.pos,
      raio: 2.8,
      rotulo: npc.def.rotulo ?? `F: falar com ${falante(npc.def.falante)?.nome ?? npc.def.id}`,
      agir: () => {
        npc.falando = true;
        this.interlocutor = npc;
        this.dialogos.tocar(npc.def.no, () => (npc.falando = false));
      },
    };
  }

  /**
   * Uma fala apareceu: acha o corpo de quem fala, passa a palavra (gestos, boca) e escolhe o plano da câmera de
   * conversa.
   */
  private aoFalar(p: Passo, segundos: number) {
    const per = this.peregrino.pos;
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
    if (!this.conversa.emConversa) this.conversa.comecar(this.camera.cam.position, this.olhosPeregrino(), i.olhos(), plano ?? 'geral');
    else if (plano) this.conversa.mudar(plano);
  }

  /** As escolhas apareceram: o contraplano, no peregrino. */
  private aoEscolhasDaConversa() {
    this.interlocutor?.calar();
    this.vezDe = 'peregrino';
    if (this.conversa.emConversa) this.conversa.mudar('peregrino');
  }

  /** A câmera de conversa só entra fora de luta, de confissão e de queda, e se o jogador a quiser. */
  private conversaPermitida() {
    const i = this.interlocutor;
    return (
      this.prefs.cameraConversa && !!i && !this.emConfissao && !this.travado && !this.morrendo && !this.transitando &&
      i.pos.distanceTo(this.peregrino.pos) < 8
    );
  }

  private olhosPeregrino() {
    return this.peregrino.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
  }

  /** Atualiza a câmera de conversa por cima da de jogo (depois que ela se posicionou neste quadro). */
  private atualizarConversa(dt: number, altura: (x: number, z: number) => number) {
    if (!this.hud.dialogoAberto && (this.interlocutor || this.viradosNaConversa.size)) {
      this.interlocutor?.calar();
      this.interlocutor = null;
      for (const n of this.viradosNaConversa) n.falando = false;
      this.viradosNaConversa.clear();
    }
    if (this.conversa.emUso && !(this.hud.dialogoAberto && this.conversaPermitida())) this.conversa.terminar();
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
    const elenco = i ? { peregrino: this.olhosPeregrino(), corpoPeregrino: this.peregrino.raiz, npc: i.olhos(), corpoNpc: i.raiz } : null;
    this.conversa.atualizar(dt, this.camera.cam, elenco, livre, this.vezDe);
    document.body.classList.toggle('em-conversa', this.conversa.peso > 0.02);
  }

  private valorDialogo(chave: string): number {
    if (chave === 'faltam_vale') return Math.max(0, TOTAL_SOMBRAS_VALE - this.sombrasDoValeVencidas());
    if (chave === 'miragens') return this.deserto.miragensRestantes;
    if (chave === 'peso') return this.estado.peso;
    if (chave === 'ajudantes') return this.banquete.quantosVieram;
    if (chave === 'energia') return Math.floor(this.estado.energia);
    if (chave === 'custo_piedade') return this.custoPiedade();
    if (chave === 'pedras') return this.cidade.pedrasAssentadas;
    if (chave === 'malta_feixes') return this.malta.feixes;
    if (chave === 'malta_no_patio') return this.malta.enfermosNoPatio((x) => this.estado.flags.has(x)) ? 1 : 0;
    if (chave === 'faltam_pobres') return this.cidade.pobres.filter((p) => !this.estado.flags.has(`cidade_ajudou_${p.id}`)).length;
    if (import.meta.env.DEV) console.warn(`[ink] valor desconhecido: ${chave}`);
    return 0;
  }

  /** Efeitos de jogo pedidos pelo roteiro com ~ evento("nome"). */
  private eventoDialogo(nome: string) {
    if (nome === 'absolvicao') {
      const cap = this.area.capela;
      if (cap) this.confessar(cap.confessionario.clone());
      return;
    }
    if (nome === 'dom_ciencia') {
      this.marcar('dom_ciencia');
      this.som.item();
      this.efeitos.ouro = 1.2;
      this.tempoColuna = 0;
      this.hud.anunciar('Você recebeu o dom da Ciência!', 3.5);
      return;
    }
    if (this.eventoDaCidade(nome)) return;
    if (this.eventoDaBahia(nome)) return;
    if (this.eventoDeCreta(nome)) return;
    if (this.eventoDoNavio(nome)) return;
    if (this.eventoDoNaufragio(nome)) return;
    if (this.eventoDeMalta(nome)) return;
    if (import.meta.env.DEV) console.warn(`[ink] evento desconhecido: ${nome}`);
  }

  /** Escurece, troca de área, guarda o lugar de chegada como checkpoint e clareia. */
  private trocarArea(destino: Area, pos: THREE.Vector3, rumo: number, depois?: () => void, manterCarga = false) {
    if (this.transitando) return;
    this.transitando = true;
    this.travado = null;
    if (!manterCarga) this.peregrino.carregar(null);
    this.pesoBanquete = 0;
    this.torpor = 0;
    this.hud.escurecer(true);
    setTimeout(() => {
      this.projeteis.forEach((p) => this.cena.remove(p.malha));
      this.projeteis = [];
      this.area = destino;
      this.aplicarAmbiente();
      const y = destino.altura(pos.x, pos.z);
      // um marco da história (a viagem para a Bahia): os anos passam no escuro da transição
      if (this.idadeDaHistoria() !== this.idadeVestida) this.vestirPeregrino();
      this.peregrino.teleportar(pos.x, y, pos.z);
      this.peregrino.rumo = rumo;
      this.camera.guinada = rumo + Math.PI;
      this.camera.reposicionar();
      this.pomba.raiz.position.set(pos.x, y + 3, pos.z);
      this.estado.checkpoint = [pos.x, y, pos.z];
      this.estado.checkpointArea = destino.id;
      this.estado.salvar();
      this.hud.escurecer(false);
      this.transitando = false;
      depois?.();
    }, 800);
  }

  private criarInteracoes() {
    const m = this.mundo;
    const c = this.cripta;
    const d = this.deserto;
    const md = this.meiodia;
    this.interacoes.vale = [
      {
        pos: () => m.fogueira,
        raio: 2.4,
        rotulo: 'F: descansar junto à fogueira',
        agir: () => this.descansar(m.fogueira.clone().add(new THREE.Vector3(-1.6, 0, 0)), 'Você descansou. O caminho foi guardado aqui.'),
      },
      {
        pos: () => m.cruzeiro,
        raio: 2.6,
        rotulo: 'F: contemplar o cruzeiro',
        agir: () => {
          this.dialogos.tocar('vale_cruzeiro');
        },
      },
      ...this.interacoesDaCapela(m.capela, 'vale_altar'),
      this.falarCom(m.jardim.agostinho),
      {
        pos: () => m.jardim.livro,
        raio: 1.5,
        rotulo: 'F: tomar e ler',
        agir: () => this.dialogos.tocar('vale_livro'),
      },
      {
        pos: () => m.entradaCripta,
        raio: 2.6,
        rotulo: () => (this.estado.cor >= 0.999 ? 'F: descer à cripta' : 'F: examinar a escada selada'),
        agir: () => {
          if (this.estado.cor < 0.999) {
            this.dialogos.tocar('vale_escada_selada');
            return;
          }
          const descer = () =>
            this.trocarArea(c, c.chegada, Math.PI, () => {
              if (this.primeiraVez('cripta_entrou')) this.dialogos.tocar('cripta_chegada');
            });
          if (!this.estado.flags.has('cripta_laje')) {
            this.marcar('cripta_laje');
            this.som.portao();
            this.hud.anunciar('A laje cedeu.', 1.6);
            setTimeout(descer, 900);
          } else descer();
        },
      },
      {
        pos: () => m.veu,
        raio: 3.4,
        ativa: () => !m.veuAberto,
        rotulo: () => (this.estado.flags.has('lamparina') ? 'F: erguer a lamparina' : 'F: tocar a névoa'),
        agir: () => {
          if (this.estado.flags.has('lamparina')) {
            this.lamparinaAcesa = true;
            this.atualizarLamparina();
          } else
            this.dialogos.tocar('vale_nevoa');
        },
      },
      {
        pos: () => m.fimPassagem,
        raio: 2.4,
        ativa: () => m.veuAberto,
        rotulo: 'F: seguir para o Deserto das Vozes',
        agir: () =>
          this.trocarArea(d, d.chegada, -Math.PI / 2, () => {
            if (this.primeiraVez('deserto_entrou')) this.dialogos.tocar('deserto_chegada');
          }),
      },
    ];
    this.interacoes.cripta = [
      {
        pos: () => c.escada,
        raio: 2.2,
        rotulo: 'F: subir para a capela',
        agir: () => this.trocarArea(m, m.entradaCripta.clone().add(new THREE.Vector3(0, 0, 2.4)), 0),
      },
      {
        pos: () => c.estela,
        raio: 1.9,
        rotulo: 'F: ler a inscrição',
        agir: () => this.dialogos.tocar('cripta_estela'),
      },
      {
        pos: () => c.relicario,
        raio: 2.3,
        ativa: () => c.lamparinaNoAltar,
        rotulo: 'F: tomar a Lamparina da Fé',
        agir: () => this.pegarLamparina(),
      },
    ];
    this.interacoes.deserto = [
      {
        pos: () => d.saida,
        raio: 2.6,
        rotulo: 'F: voltar ao Vale',
        agir: () => this.trocarArea(m, m.fimPassagem.clone().add(new THREE.Vector3(3, 0, 0)), Math.PI / 2),
      },
      {
        pos: () => d.poco,
        raio: 2.6,
        rotulo: 'F: descansar junto ao poço',
        agir: () => {
          this.descansar(d.poco.clone().add(new THREE.Vector3(2, 0, 0)), 'Você bebeu da água do poço. O caminho foi guardado aqui.');
          if (this.primeiraVez('deserto_poco')) this.dialogos.tocar('deserto_poco');
        },
      },
      {
        pos: () => d.cruz,
        raio: 2.6,
        rotulo: 'F: contemplar a cruz',
        agir: () => {
          this.dialogos.tocar('deserto_cruz');
        },
      },
      this.falarCom(d.antao),
      {
        pos: () => d.estradaSul,
        raio: 2.8,
        rotulo: () => (this.estado.flags.has('meiodia_vencido') ? 'F: seguir para a Cidade Dourada' : 'F: examinar a estrada velha'),
        agir: () => {
          if (!this.estado.flags.has('meiodia_vencido')) {
            this.dialogos.tocar('deserto_estrada_fechada');
            return;
          }
          this.trocarArea(this.cidade, this.cidade.chegada, Math.PI, () => {
            if (this.primeiraVez('cidade_entrou')) this.dialogos.tocar('cidade_chegada');
          });
        },
      },
      {
        pos: () => d.fogo,
        raio: 2.4,
        rotulo: 'F: descansar junto ao fogo',
        agir: () => this.descansar(d.fogo.clone().add(new THREE.Vector3(1.6, 0, 1.6)), 'Você descansou com Santo Antão. O caminho foi guardado aqui.'),
      },
      {
        pos: () => d.fimFenda,
        raio: 2.6,
        ativa: () => d.paredeAberta,
        rotulo: 'F: descer ao Poço do Meio-Dia',
        agir: () =>
          this.trocarArea(md, md.chegada, -Math.PI / 2, () => {
            if (this.primeiraVez('meiodia_entrou')) this.dialogos.tocar('meiodia_chegada');
          }),
      },
      ...this.interacoesDaCapela(d.capela, 'deserto_altar'),
    ];
    this.interacoes.meiodia = [
      {
        pos: () => md.saida,
        raio: 2.6,
        ativa: () => !md.lutando,
        rotulo: 'F: voltar ao deserto',
        agir: () => this.trocarArea(d, d.fimFenda.clone().add(new THREE.Vector3(2.5, 0, 0)), Math.PI / 2),
      },
      {
        pos: () => md.poco,
        raio: 3,
        ativa: () => !md.lutando,
        rotulo: () => (md.vencido ? 'F: beber da água viva' : 'F: olhar o poço seco'),
        agir: () => {
          if (!md.vencido) {
            this.dialogos.tocar('meiodia_poco_seco');
            return;
          }
          this.descansar(md.poco.clone().add(new THREE.Vector3(0, 0, 2.6)), 'Você bebeu da água viva. O caminho foi guardado aqui.');
        },
      },
      {
        pos: () => md.obelisco,
        raio: 2.2,
        ativa: () => !md.lutando,
        rotulo: 'F: ler o obelisco',
        agir: () => this.dialogos.tocar('meiodia_obelisco'),
      },
    ];
    this.interacoes.cidade = this.interacoesDaCidade();
    this.interacoes.palacio = this.interacoesDoBanquete();
    this.interacoes.bahiabaixa = this.interacoesDaBahiaBaixa();
    this.interacoes.bahiaalta = this.interacoesDaBahiaAlta();
    this.interacoes.creta = this.interacoesDeCreta();
    this.interacoes.navio = this.interacoesDoNavio();
    this.interacoes.naufragio = this.interacoesDoNaufragio();
    this.interacoes.malta = this.interacoesDeMalta();
    for (const id of Object.keys(this.interacoes) as IdArea[]) this.interacoes[id].push(...this.interacoesDaFauna(id));
  }

  /** Confessionário, sacrário e altar de uma capela de região. `noAltar`: o que o Espírito diz no altar. */
  private interacoesDaCapela(cap: CapelaRegional, noAltar: string): Interacao[] {
    return [
      {
        pos: () => cap.confessionario,
        raio: 1.5,
        rotulo: 'F: entrar no confessionário',
        agir: () => this.entrarNoConfessionario(cap),
      },
      {
        pos: () => cap.sacrario,
        raio: 1.9,
        rotulo: 'F: ajoelhar-se diante do sacrário',
        agir: () => this.dialogos.tocar('capela_sacrario'),
      },
      {
        pos: () => cap.altar,
        raio: 1.6,
        rotulo: () => (this.estado.confessado && !this.estado.comungou ? 'F: comungar' : 'F: ajoelhar-se diante do altar'),
        agir: () => {
          this.comungar();
          this.dialogos.tocar(noAltar);
        },
      },
    ];
  }

  /**
   * Confessionário: guarda o caminho como um descanso e põe o peregrino em estado de graça,
   * o que o deixa comungar no altar. Cada capela de região tem um.
   */
  private confessar(lugar: THREE.Vector3) {
    this.estado.confessado = true;
    this.descansar(lugar, 'Absolvição: os pecados foram perdoados e o caminho foi guardado aqui.');
  }

  /**
   * Cena de confissão: o peregrino entra no lado do penitente, ajoelha-se diante da grade e conversa com o
   * padre. A absolvição (~ evento("absolvicao") no roteiro) é que o põe em estado de graça; sair no meio não vale.
   */
  private entrarNoConfessionario(cap: CapelaRegional) {
    const per = this.peregrino;
    const j = cap.joelhoConfissao, g = cap.gradeConfissao;
    this.emConfissao = true;
    per.teleportar(j.x, this.area.altura(j.x, j.z), j.z);
    per.rumo = Math.atan2(g.x - j.x, g.z - j.z);
    per.iniciar('rezando');
    cap.padre.falando = true;
    // o roteiro da confissão é um só; quem fala por "padre" é o confessor desta capela
    this.dialogos.apelidos = { padre: cap.padre.def.falante };
    this.dialogos.tocar('capela_confissao', () => {
      this.emConfissao = false;
      cap.padre.falando = false;
      this.dialogos.apelidos = {};
      per.acao = 'livre';
    });
  }

  /**
   * Eucaristia: em estado de graça, o altar dá um coração dourado a mais até a próxima queda e
   * restaura tudo. Sem confissão, o Espírito lembra (uma vez) que ela vem antes.
   */
  private comungar() {
    const e = this.estado;
    if (!e.confessado) {
      if (!e.comungou && this.primeiraVez('capela_sem_confissao')) this.dialogos.tocar('capela_sem_confissao');
      return;
    }
    if (e.comungou) {
      e.restaurar();
      return;
    }
    e.comungou = true;
    e.restaurar();
    e.salvar();
    this.efeitos.ouro = 1.1;
    this.som.graca();
    this.hud.anunciar('💛 Eucaristia: um coração a mais até a próxima queda.', 3.2);
    if (this.primeiraVez('capela_comunhao')) this.dialogos.tocar('capela_comunhao');
  }

  private descansar(lugar: THREE.Vector3, msg: string) {
    lugar.y = this.area.altura(lugar.x, lugar.z);
    this.estado.checkpoint = lugar.toArray() as [number, number, number];
    this.estado.checkpointArea = this.area.id;
    this.estado.restaurar();
    this.estado.salvar();
    this.efeitos.ouro = 0.6;
    this.som.graca();
    this.hud.anunciar(msg, 3);
  }

  // ───────────────────────────── ruas da bahia ─────────────────────────────

  /**
   * A cor da Bahia: cada passo da provação devolve um pouco (no máximo a metade), e a vitória sobre o Coração de
   * Pedra devolve toda.
   */
  private corDaBahia() {
    const f = this.estado.flags;
    if (f.has('bahia_coracao_vencido') || f.has('bahia_restaurada')) return 1;
    let c = ENFERMOS.filter((e) => f.has(`bahia_recolhido_${e.id}`)).length * 0.04;
    if (f.has('bahia_menino_abrigado')) c += 0.06;
    if (f.has('bahia_comerciante_doou')) c += 0.08;
    if (f.has('bahia_enfermaria')) c += 0.12;
    return c;
  }

  /** A cor que se vê: segue a da região devagar (a cor volta aos poucos), e salta ao trocar de área. */
  private corVisivel(dt: number) {
    const alvo = this.corAtual();
    if (this.areaDaCor !== this.area || this.corSuave < 0) {
      this.areaDaCor = this.area;
      this.corSuave = alvo;
    } else this.corSuave += Math.sign(alvo - this.corSuave) * Math.min(Math.abs(alvo - this.corSuave), dt * 0.3);
    return this.corSuave;
  }

  /** A cada quadro na Cidade Baixa: Irmã Dulce chama o peregrino quando ele passa perto dela pela primeira vez. */
  private atualizarBahia() {
    const b = this.bahiaBaixa, a = this.bahiaAlta, f = this.estado.flags;
    // caiu das costas (troca de área, queda): o menino volta para os braços de Irmã Dulce, onde ela estava; um
    // enfermo volta para o lugar onde estava caído
    if (this.nasCostas && !this.peregrino.carregando) {
      if (this.nasCostas === 'menino') {
        b.colocarDulce(f.has('bahia_casa_expulsos') ? 'casaFora' : 'calcada', true);
        if (this.area === b) this.hud.anunciar('O menino voltou para os braços de Irmã Dulce.', 2.4);
      } else if (f.has(`bahia_recolhido_${this.nasCostas}`)) {
        b.mostrarAbrigado(this.nasCostas, true);
        if (this.area === b || this.area === a) this.hud.anunciar(`${enfermo(this.nasCostas)?.nome} voltou para a esteira do abrigo.`, 2.6);
      } else {
        b.mostrarEnfermo(this.nasCostas, true);
        a.mostrarEnfermo(this.nasCostas, true);
        if (this.area === b || this.area === a) this.hud.anunciar(`${enfermo(this.nasCostas)?.nome} ficou para trás, onde estava caído.`, 2.6);
      }
      this.nasCostas = null;
    }
    // os que passam abrem caminho para quem carrega um doente; na primeira vez que empurram, o jogo explica
    b.alguemNasCostas = a.alguemNasCostas = this.nasCostas !== null;
    // a arena do Coração de Pedra: a pedra para nos diálogos; com a Ciência, os enfermos brilham de leve
    a.largo.pausado = this.hud.dialogoAberto || this.morrendo || this.transitando;
    a.largo.ciencia = this.tempoCiencia > 0;
    const empurrou = b.houveEmpurrao() || a.houveEmpurrao();
    if (empurrou && (this.area === b || this.area === a) && this.primeiraVez('bahia_passantes_empurram'))
      this.hud.anunciar('Os que passam não desviam: empurram quem está no caminho. Uma luz desfaz um deles por um tempo. Com um doente nas costas, a fila para e abre caminho.', 5);
    // o comerciante, depois de entregar a doação, volta para a loja quando o peregrino já não o vê
    if (f.has('bahia_comerciante_doou') && b.comercianteNoConvento && (this.area !== b || b.comerciante.pos.distanceTo(this.peregrino.pos) > 25))
      b.colocarComerciante('loja');
    if (this.area !== b || this.hud.dialogoAberto || this.dialogos.ocupado || this.transitando) return;
    // depois da resposta mansa, ele espera à porta do convento com a doação e fala assim que o peregrino chega
    if (f.has('bahia_comerciante_manso') && !f.has('bahia_comerciante_doou') && b.comercianteNoConvento && b.comerciante.pos.distanceTo(this.peregrino.pos) < 6.5) {
      this.falarCom(b.comerciante).agir();
      return;
    }
    const d = b.dulceEmCena;
    if (b.hospital.estagio === 3 && !f.has('bahia_piedade_aperfeicoada') && b.hospital.dentro(this.peregrino.pos) && this.nasCostas === null) {
      if (this.primeiraVez('bahia_hospital_entrou')) this.falarCom(d).agir();
      return;
    }
    if (f.has('bahia_dulce_conheceu') || d.pos.distanceTo(this.peregrino.pos) > 6.5) return;
    if (this.primeiraVez('bahia_dulce_chamou')) this.falarCom(d).agir();
  }

  /**
   * Quem vai nas costas do peregrino: o menino ('menino'), um dos enfermos (o id) ou ninguém. Não vai para o save:
   * ao recarregar, o menino volta para Dulce e o enfermo para onde estava caído.
   */
  private nasCostas: string | null = null;
  private get meninoComPeregrino() {
    return this.nasCostas === 'menino';
  }
  /** O enfermo que se está socorrendo (o diálogo dele pede `carregar_enfermo` no fim). */
  private enfermoAtual: string | null = null;

  /** Socorrer: o diálogo de cada um (antes de Dulce pedir, o Espírito Santo só aponta para ele). */
  private interacoesDosEnfermos(area: BahiaBaixa | BahiaAlta): Interacao[] {
    return [...area.enfermos.values()].map(({ def, pos, corpo }) => ({
      pos: () => pos,
      raio: def.sobre === 'canoa' ? 3.6 : 2.3,
      ativa: () => corpo.visible && this.nasCostas === null && !this.dialogos.ocupado,
      rotulo: `F: socorrer ${def.nome}`,
      agir: () => {
        if (!this.estado.flags.has('bahia_menino_abrigado')) {
          this.dialogos.tocar('bahia_enfermo_cedo');
          return;
        }
        this.enfermoAtual = def.id;
        this.dialogos.tocar(`bahia_enfermo_${def.id}`);
      },
    }));
  }

  /** O peregrino põe o enfermo nas costas. */
  private pegarEnfermo(id: string) {
    const def = enfermo(id);
    if (!def) return;
    this.peregrino.carregar(corpoDoEnfermo(def, 'costas'), 'costas');
    this.nasCostas = id;
    this.bahiaBaixa.mostrarEnfermo(id, false);
    this.bahiaAlta.mostrarEnfermo(id, false);
    this.som.passo();
    this.hud.anunciar(`Leve ${def.nome} à porta do Convento de Santo Antônio, no Largo de Roma, onde Irmã Dulce espera.`, 3.2);
  }

  /** À porta do convento: o enfermo ganha a esteira dele no abrigo. */
  private entregarEnfermo() {
    const id = this.nasCostas, def = id ? enfermo(id) : undefined;
    if (!id || !def) return;
    const b = this.bahiaBaixa;
    this.peregrino.carregar(null);
    this.nasCostas = null;
    b.mostrarAbrigado(id, true);
    this.atoDaBahia(`bahia_recolhido_${id}`, `${def.nome} tem uma esteira e um teto`);
    const d = b.dulceEmCena;
    d.falando = true;
    this.interlocutor = d;
    this.dialogos.tocar(`bahia_entrega_${id}`, () => {
      d.falando = false;
      const todos = ENFERMOS.every((e) => this.estado.flags.has(`bahia_recolhido_${e.id}`));
      if (todos && this.primeiraVez('bahia_esquecidos_todos')) setTimeout(() => this.dialogos.tocar('bahia_esquecidos_todos'), 400);
    });
  }

  /** O peregrino põe o menino nas costas; Dulce, de braços livres, vai a pé para a casa ou para o convento. */
  private pegarMenino() {
    const paraConvento = this.estado.flags.has('bahia_casa_expulsos');
    this.peregrino.carregar(menino('costas'), 'costas');
    this.nasCostas = 'menino';
    this.bahiaBaixa.deitarMenino(null);
    this.bahiaBaixa.dulceIr(paraConvento ? 'convento' : 'casa');
    this.som.passo();
    this.hud.anunciar(
      paraConvento ? 'Leve o menino ao Convento de Santo Antônio, no Largo de Roma.' : 'Leve o menino à casa abandonada, junto ao cais. Devagar: sem pulo e sem o cajado.',
      3,
    );
  }

  /** Para onde o barco vai quando a conversa da partida acabar (`~ evento("viajar_…")`). */
  private viagem: 'cidade' | 'creta' | 'bahia' | 'malta' | null = null;

  /** Faz a viagem escolhida na conversa do barco (depois que a caixa fecha). */
  private fazerViagem() {
    const destino = this.viagem;
    this.viagem = null;
    if (destino === 'cidade') this.trocarArea(this.cidade, this.cidade.estradaDoMar.clone().add(new THREE.Vector3(0, 0, -3)), Math.PI);
    else if (destino === 'bahia') this.trocarArea(this.bahiaBaixa, this.bahiaBaixa.saveiro.clone().add(new THREE.Vector3(0, 0, -2.5)), Math.PI);
    else if (destino === 'creta') {
      this.hud.anunciar('O saveiro sai da baía, mar afora…', 2);
      this.trocarArea(this.creta, this.creta.chegada, 0, () => {
        if (this.primeiraVez('creta_entrou')) this.dialogos.tocar('creta_chegada');
      });
    } else if (destino === 'malta') {
      this.hud.anunciar('O barco vai mar afora, até a ilha de Malta…', 2);
      this.trocarArea(this.malta, this.malta.chegada, Math.PI);
    }
  }

  // ───────────── o navio na tempestade (At 27,14-38) ─────────────

  /** O navio já pôs cada um no seu lugar para a etapa? (Refeito ao entrar e a cada etapa.) */
  private navioArrumado = false;
  /** A etapa cuja fala de abertura já tocou nesta sessão (para não repetir). */
  private etapaAnunciada = '';
  /** Há quanto tempo o peregrino está no mar, fora do navio (os marinheiros o puxam de volta). */
  private noMarHa = 0;
  /** O peregrino leva uma carga para lançar ao mar. */
  private levandoCarga = false;

  /** Sobe a bordo: o navio parte de Creta com o vento sul brando, e logo vem o Euraquilão. */
  private embarcar() {
    this.trocarArea(this.navio, this.navio.chegada, 0, () => {
      this.navioArrumado = false;
      this.etapaAnunciada = '';
      if (this.primeiraVez('navio_entrou')) this.dialogos.tocar('navio_inicio');
    });
  }

  /** O que o roteiro do navio pede. Devolve true se o evento era daqui. */
  private eventoDoNavio(nome: string) {
    const f = (x: string) => this.estado.flags.has(x);
    const avancar = (flag: string) => {
      this.marcar(flag);
      this.navioArrumado = false;
    };
    if (nome === 'bote') avancar('navio_bote');
    else if (nome === 'briga') {
      if ([1, 2, 3].every((n) => f(`navio_briga_${n}`))) this.marcar('navio_brigas');
      this.navioArrumado = false;
    } else if (nome === 'anjo') avancar('navio_anjo');
    else if (nome === 'sonda') avancar('navio_sonda');
    else if (nome === 'cortar_bote') {
      this.navio.soltarBote();
      this.marcar('navio_fuga');
      this.navioArrumado = false;
    } else if (nome === 'pao') {
      this.estado.restaurar();
      this.som.graca();
      this.efeitos.ouro = 0.8;
      this.hud.anunciar('O pão partido: as forças voltam.', 2.5);
    } else if (nome === 'amanhecer') avancar('navio_pao');
    else return false;
    return true;
  }

  /** A cada quadro no navio: arruma a etapa, toca a fala de abertura dela, e puxa de volta quem caiu no mar. */
  private atualizarNavio(dt: number) {
    const k = this.navio, per = this.peregrino;
    const tem = (x: string) => this.estado.flags.has(x);
    if (!this.navioArrumado && !this.hud.dialogoAberto && !this.transitando) {
      this.navioArrumado = true;
      k.arrumar(tem);
    }
    // a fala que abre cada etapa (as que não abrem com uma conversa do próprio peregrino)
    const etapa = etapaDoNavio(tem);
    if (etapa !== this.etapaAnunciada && !this.hud.dialogoAberto && !this.transitando && tem('navio_entrou')) {
      this.etapaAnunciada = etapa;
      const no = { anjo: 'navio_anjo', fuga: 'navio_fuga_vista', pao: 'navio_pao' }[etapa as string];
      if (no && this.primeiraVez(`${no}_tocou`)) {
        if (etapa === 'anjo' || etapa === 'pao') {
          const p = k.paulo;
          p.falando = true;
          this.interlocutor = p;
          this.dialogos.tocar(no, () => (p.falando = false));
        } else this.dialogos.tocar(no);
      }
    }
    // o dia raiou: o navio corre para a praia e encalha (At 27,39-41)
    if (tem('navio_pao') && !tem('naufragio_encalhou') && !this.hud.dialogoAberto && !this.transitando) return this.encalhar();
    // caiu no mar: os marinheiros jogam um cabo e o puxam de volta
    if (per.nadando && !this.transitando) {
      this.noMarHa += dt;
      if (this.noMarHa > 1.6) {
        this.noMarHa = 0;
        this.levandoCarga = false;
        per.carregar(null);
        this.hud.anunciar('Os marinheiros jogam um cabo e puxam você de volta a bordo.', 3);
        this.trocarArea(k, k.chegada, 0);
      }
    } else this.noMarHa = 0;
    k.pausa = this.hud.dialogoAberto || this.transitando;
  }

  /** Interações a bordo: a gente, o bote, os cabos, a carga, as brigas, a sonda e as âncoras. */
  private interacoesDoNavio(): Interacao[] {
    const k = this.navio, per = this.peregrino;
    const f = (x: string) => this.estado.flags.has(x);
    const etapa = () => etapaDoNavio(f);
    k.aoTrovejar = () => this.som.trovao();
    k.aoAvisarOnda = () => this.hud.anunciar('Uma onda vem pelo través! Segure-se junto ao mastro!', 2);
    k.aoQuebrarOnda = (lado) => {
      this.som.vagalhao();
      if (this.area !== k || k.pertoDoMastro(per.pos) < 2.4) return;
      per.empurrao.set(lado * 7.5, 0, -2);
    };
    const cabos = [0, 1, 2].map((i): Interacao => ({
      pos: () => k.pontoDoCabo(i),
      raio: 1.8,
      ativa: () => etapa() === 'cintar' && !f(`navio_cabo_${i + 1}`),
      rotulo: 'F: passar o cabo por baixo do casco',
      agir: () => {
        this.marcar(`navio_cabo_${i + 1}`);
        this.som.corrente();
        this.navioArrumado = false;
        if ([1, 2, 3].every((n) => f(`navio_cabo_${n}`))) {
          this.marcar('navio_cintado');
          this.dialogos.tocar('navio_cintado');
        } else this.hud.anunciar('O cabo passa por baixo do casco e é esticado de borda a borda.', 2);
      },
    }));
    const brigas = [0, 1, 2].map((i): Interacao => ({
      pos: () => k.centroDaBriga(i),
      raio: 2.2,
      ativa: () => etapa() === 'brigas' && !f(`navio_briga_${i + 1}`),
      rotulo: 'F: separar a briga',
      agir: () => {
        const [a, b] = k.brigas[i];
        a.falando = b.falando = true;
        this.interlocutor = a;
        this.dialogos.tocar(`navio_briga_${i + 1}`, () => (a.falando = b.falando = false));
      },
    }));
    const ancoras = [0, 1, 2, 3].map((i): Interacao => ({
      pos: () => k.pontoDaAncora(i),
      raio: 1.3,
      ativa: () => etapa() === 'ancoras' && !f(`navio_ancora_${i + 1}`),
      rotulo: 'F: lançar a âncora da popa',
      agir: () => {
        this.marcar(`navio_ancora_${i + 1}`);
        this.som.corrente();
        this.som.respingo();
        this.navioArrumado = false;
        if ([1, 2, 3, 4].every((n) => f(`navio_ancora_${n}`))) {
          this.marcar('navio_ancoras');
          this.dialogos.tocar('navio_ancoras_feitas');
        } else this.hud.anunciar(`A âncora desce para o fundo. (${[1, 2, 3, 4].filter((n) => f(`navio_ancora_${n}`)).length} de 4)`, 2);
      },
    }));
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.falarCom(n), ativa: () => n.raiz.visible && !(etapa() === 'brigas' && k.brigas.flat().includes(n)) })),
      {
        pos: () => k.cabosDoBote,
        raio: 2,
        ativa: () => etapa() === 'bote',
        rotulo: 'F: puxar o cabo do bote',
        agir: () => this.dialogos.tocar('navio_bote'),
      },
      ...cabos,
      // a carga: pegar na pilha e lançar pela borda
      {
        pos: () => k.pilha,
        raio: 1.6,
        ativa: () => etapa() === 'carga' && !this.levandoCarga,
        rotulo: 'F: pegar a carga',
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
        agir: () => {
          this.levandoCarga = false;
          per.carregar(null);
          this.som.respingo();
          const n = [1, 2, 3, 4, 5].filter((x) => f(`navio_lancou_${x}`)).length + 1;
          this.marcar(`navio_lancou_${n}`);
          this.navioArrumado = false;
          if (n >= CARGAS) {
            this.marcar('navio_carga');
            this.dialogos.tocar('navio_carga_feita');
          } else this.hud.anunciar(`A carga some nas ondas. (${n} de ${CARGAS})`, 2);
        },
      },
      ...brigas,
      {
        pos: () => k.proa,
        raio: 2,
        ativa: () => etapa() === 'sonda',
        rotulo: 'F: lançar a sonda',
        agir: () => this.dialogos.tocar(f('navio_sonda_1') ? 'navio_sonda' : 'navio_sonda_1'),
      },
      ...ancoras,
    ];
  }

  /** Creta já pôs cada um no seu lugar conforme as flags? (Refeito ao entrar e depois do conselho.) */
  private cretaArrumada = false;

  /** Efeitos pedidos pelo roteiro de Creta. Devolve true se o evento era daqui. */
  private eventoDeCreta(nome: string) {
    if (nome === 'paulo_ao_cais') {
      this.creta.levarPauloAoCais();
      return true;
    }
    // decidida a partida (At 27,12-13): Paulo e os companheiros embarcam quando a conversa acabar
    if (nome === 'conselho') {
      this.marcar('creta_conselho');
      this.cretaArrumada = false;
      return true;
    }
    return false;
  }

  /** Efeitos pedidos pelo roteiro da Bahia. Devolve true se o evento era daqui. */
  private eventoDaBahia(nome: string) {
    if (nome === 'viajar_cidade' || nome === 'viajar_creta' || nome === 'viajar_bahia' || nome === 'viajar_malta') {
      this.viagem = nome === 'viajar_cidade' ? 'cidade' : nome === 'viajar_creta' ? 'creta' : nome === 'viajar_malta' ? 'malta' : 'bahia';
      return true;
    }
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
      this.marcar('bahia_casa_expulsos');
      this.pegarMenino();
      return true;
    }
    // a resposta mansa: o comerciante fecha a loja e, sem dizer nada, vai levar a doação ao convento
    if (nome === 'comerciante_sai') {
      this.bahiaBaixa.colocarComerciante('convento');
      return true;
    }
    if (nome === 'dulce_galinheiro') {
      this.bahiaBaixa.dulceIr('galinheiro');
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
      this.bahiaBaixa.mostrarDoacao(true);
      this.atoDaBahia('bahia_comerciante_doou', 'Um coração de pedra se abriu');
      return true;
    }
    return false;
  }

  /** Uma fala de Irmã Dulce que o jogo começa (não o jogador): ela olha para o peregrino enquanto fala. */
  private falaDeDulce(no: string, depois?: () => void) {
    const d = this.bahiaBaixa.dulceEmCena;
    d.falando = true;
    this.interlocutor = d;
    this.dialogos.tocar(no, () => {
      d.falando = false;
      depois?.();
    });
  }

  // ─── O galinheiro (passo 6 da provação): limpar, estender as esteiras, trazer os doentes, a passagem de tempo ───

  private limparGalinheiro(id: string) {
    const b = this.bahiaBaixa, f = this.estado.flags;
    this.marcar(`bahia_galinheiro_${id}`);
    this.som.passo();
    b.hospital.aplicar(f);
    const feitas = b.hospital.limpas(f);
    if (feitas < SUJEIRAS.length) {
      this.hud.anunciar(`Galinheiro: ${feitas} de ${SUJEIRAS.length}`, 1.6);
      return;
    }
    this.marcar('bahia_galinheiro_limpo');
    b.hospital.aplicar(f);
    this.falaDeDulce('bahia_galinheiro_limpo');
  }

  private estenderEsteira(id: string) {
    const b = this.bahiaBaixa, f = this.estado.flags;
    this.marcar(`bahia_esteira_${id}`);
    this.som.passo();
    b.hospital.aplicar(f);
    const feitas = ENFERMOS.filter((e) => f.has(`bahia_esteira_${e.id}`)).length;
    if (feitas < ENFERMOS.length) {
      this.hud.anunciar(`Esteiras: ${feitas} de ${ENFERMOS.length}`, 1.6);
      return;
    }
    if (this.primeiraVez('bahia_galinheiro_esteiras')) this.falaDeDulce('bahia_galinheiro_esteiras');
  }

  /** Do abrigo, à porta do convento, para as costas do peregrino (e daí para a esteira dele no galinheiro). */
  private pegarDoAbrigo(id: string) {
    const def = enfermo(id);
    if (!def) return;
    this.peregrino.carregar(corpoDoEnfermo(def, 'costas'), 'costas');
    this.nasCostas = id;
    this.bahiaBaixa.mostrarAbrigado(id, false);
    this.som.passo();
    this.hud.anunciar(`Leve ${def.nome} até a esteira ${def.figurino.genero === 'f' ? 'dela' : 'dele'} no galinheiro.`, 2.8);
  }

  private deitarNoGalinheiro() {
    const id = this.nasCostas, def = id ? enfermo(id) : undefined;
    if (!id || !def) return;
    const b = this.bahiaBaixa, f = this.estado.flags;
    this.peregrino.carregar(null);
    this.nasCostas = null;
    this.marcar(`bahia_leito_${id}`);
    this.som.passo();
    b.hospital.aplicar(f);
    const feitos = ENFERMOS.filter((e) => f.has(`bahia_leito_${e.id}`)).length;
    if (feitos < ENFERMOS.length) {
      this.hud.anunciar(`${def.nome} tem uma esteira debaixo de um telhado (${feitos} de ${ENFERMOS.length}).`, 2.4);
      return;
    }
    if (this.primeiraVez('bahia_galinheiro_todos')) setTimeout(() => this.falaDeDulce('bahia_galinheiro_pronto'), 300);
  }

  /** Semanas depois: o galinheiro virou enfermaria. Escurece, troca o estágio e Dulce mostra o que mudou. */
  private passagemDoGalinheiro() {
    const b = this.bahiaBaixa, h = b.hospital;
    this.transitando = true;
    this.hud.escurecer(true);
    setTimeout(() => {
      this.atoDaBahia('bahia_enfermaria', 'Semanas depois, o galinheiro virou enfermaria');
      b.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
      // o peregrino entra pela porta, olhando os catres; Dulce está lá dentro
      this.peregrino.teleportar(h.entrada.x, this.area.altura(h.entrada.x, h.entrada.z), h.entrada.z);
      this.peregrino.rumo = Math.PI;
      this.camera.guinada = 0;
      this.camera.reposicionar();
    }, 900);
    setTimeout(() => {
      this.hud.escurecer(false);
      this.transitando = false;
      setTimeout(() => this.falaDeDulce('bahia_enfermaria'), 700);
    }, 3400);
  }

  /**
   * A cena no hospital (passo 9): Irmã Dulce aperfeiçoa a Piedade (os níveis 4 e 5 se abrem), o sino do Bonfim toca
   * e a região está restaurada.
   */
  private piedadeAperfeicoada() {
    if (this.estado.flags.has('bahia_piedade_aperfeicoada')) return;
    this.estado.flags.add('bahia_piedade_aperfeicoada');
    this.atoDaBahia('bahia_restaurada', 'A Piedade foi aperfeiçoada: os níveis IV e V se abriram (G)');
    for (let i = 0; i < 3; i++) setTimeout(() => this.som.sino(), 900 + i * 1700);
    this.dialogos.tocar('bahia_restaurada');
  }

  /** Um ato de piedade da Bahia: graça, luz e, com Misericórdia (Piedade 3), um coração. */
  private atoDaBahia(flag: string, aviso: string) {
    if (this.estado.flags.has(flag)) return;
    this.estado.flags.add(flag);
    this.estado.gracas += 1;
    if (this.estado.nivel('piedade') >= 3) this.estado.coracoes = Math.min(this.estado.coracoesMax, this.estado.coracoes + 1);
    this.estado.salvar();
    this.efeitos.ouro = 0.9;
    this.som.graca();
    this.tempoColuna = 0;
    this.hud.anunciar(`✦ ${aviso}`, 3);
  }

  private interacoesDaBahiaBaixa(): Interacao[] {
    const b = this.bahiaBaixa, a = this.bahiaAlta, c = this.cidade;
    const f = (x: string) => this.estado.flags.has(x);
    return [
      { ...this.conversaCom(() => b.dulceEmCena, 'dulce', 'F: falar com Irmã Dulce', 2.8), ativa: () => this.nasCostas === null },
      { ...this.conversaCom(() => b.dono, 'bahia_dono_depois', 'F: falar com o dono da casa', 2.6), ativa: () => b.dono.raiz.visible && !this.dialogos.ocupado },
      { ...this.conversaCom(() => b.comerciante, 'bahia_comerciante', 'F: falar com o dono do armazém', 2.6), ativa: () => this.nasCostas === null && !this.dialogos.ocupado },
      // a casa abandonada: forçar a porta pregada
      {
        pos: () => b.casaPorta,
        raio: 2.4,
        ativa: () => f('bahia_dulce_conheceu') && !f('bahia_casa_aberta'),
        rotulo: 'F: forçar a porta pregada',
        agir: () => {
          b.abrirCasa(true);
          this.marcar('bahia_casa_aberta');
          this.som.bloqueio();
          this.dialogos.tocar('bahia_casa_aberta');
        },
      },
      // deitar o menino na esteira; o dono chega
      {
        pos: () => b.casaDentro,
        raio: 2.2,
        ativa: () => this.meninoComPeregrino && !f('bahia_casa_expulsos'),
        rotulo: 'F: deitar o menino na esteira',
        agir: () => {
          this.peregrino.carregar(null);
          this.nasCostas = null;
          b.deitarMenino('casa');
          b.colocarDulce('casa', false);
          b.dono.raiz.visible = true;
          b.dono.falando = true;
          this.interlocutor = b.dono;
          this.dialogos.tocar('bahia_dono', () => (b.dono.falando = false));
        },
      },
      ...this.interacoesDosEnfermos(b),
      { ...this.conversaCom(() => b.superiora, 'bahia_superiora', 'F: falar com a madre superiora', 2.4), ativa: () => this.nasCostas === null && !this.dialogos.ocupado },
      // o galinheiro: a sujeira, as esteiras, quem vem do abrigo
      ...b.hospital.sujeiras.map((s) => ({
        pos: () => s.pos,
        raio: 1.9,
        ativa: () => b.hospital.estagio === 1 && f('bahia_galinheiro_licenca') && !f(`bahia_galinheiro_${s.id}`) && this.nasCostas === null,
        rotulo: s.rotulo,
        agir: () => this.limparGalinheiro(s.id),
      })),
      ...[...b.hospital.vagas].map(([id, vaga]) => ({
        pos: () => vaga.pos,
        raio: 1.3,
        ativa: () => b.hospital.estagio === 1 && f('bahia_galinheiro_limpo') && !f(`bahia_esteira_${id}`) && this.nasCostas === null,
        rotulo: 'F: estender uma esteira',
        agir: () => this.estenderEsteira(id),
      })),
      ...ENFERMOS.map((e) => ({
        pos: () => b.posAbrigo(e.id),
        raio: 1.5,
        ativa: () => f('bahia_galinheiro_esteiras') && f(`bahia_recolhido_${e.id}`) && !f(`bahia_leito_${e.id}`) && this.nasCostas === null && !this.dialogos.ocupado,
        rotulo: `F: levar ${e.nome} para o galinheiro`,
        agir: () => this.pegarDoAbrigo(e.id),
      })),
      {
        pos: () => b.hospital.vagas.get(this.nasCostas ?? '')?.pos ?? b.hospital.entrada,
        raio: 2.6,
        ativa: () => this.nasCostas !== null && this.nasCostas !== 'menino' && f(`bahia_recolhido_${this.nasCostas}`),
        rotulo: () => `F: deitar ${enfermo(this.nasCostas ?? '')?.nome ?? ''} na esteira`,
        agir: () => this.deitarNoGalinheiro(),
      },
      // à porta do convento: os esquecidos, um por um
      {
        pos: () => b.conventoPorta,
        raio: 3.4,
        ativa: () => this.nasCostas !== null && this.nasCostas !== 'menino' && !f(`bahia_recolhido_${this.nasCostas}`),
        rotulo: () => `F: deitar ${enfermo(this.nasCostas ?? '')?.nome ?? ''} numa esteira`,
        agir: () => this.entregarEnfermo(),
      },
      // à porta do convento: a primeira noite do menino sob um teto
      {
        pos: () => b.conventoPorta,
        raio: 3,
        ativa: () => this.meninoComPeregrino && f('bahia_casa_expulsos') && b.dulcePerto(b.conventoPorta, 4),
        rotulo: 'F: deitar o menino na esteira do convento',
        agir: () => {
          this.peregrino.carregar(null);
          this.nasCostas = null;
          b.abrigarMenino();
          b.colocarDulce('convento', false);
          b.dono.raiz.visible = false;
          this.atoDaBahia('bahia_menino_abrigado', 'O menino tem um teto esta noite');
          const d = b.dulceEmCena;
          d.falando = true;
          this.interlocutor = d;
          this.dialogos.tocar('bahia_convento', () => (d.falando = false));
        },
      },
      // o saveiro: de volta à Cidade Dourada e, depois do Coração de Pedra, mar afora até Creta
      {
        pos: () => b.saveiro,
        raio: 3.2,
        rotulo: () => (f('bahia_coracao_vencido') ? 'F: embarcar no saveiro' : 'F: voltar de saveiro à Cidade Dourada'),
        agir: () => {
          if (!f('bahia_coracao_vencido')) return this.trocarArea(c, c.estradaDoMar.clone().add(new THREE.Vector3(0, 0, -3)), Math.PI);
          this.dialogos.tocar('bahia_saveiro', () => this.fazerViagem());
        },
      },
      {
        pos: () => b.elevador,
        raio: 2.6,
        rotulo: 'F: subir pelo Elevador Lacerda',
        agir: () => {
          this.hud.anunciar('O elevador sobe a escarpa…', 1.6);
          this.trocarArea(a, a.chegada, Math.PI / 2, () => {
            if (this.primeiraVez('bahia_alta_entrou')) this.dialogos.tocar('bahia_alta_chegada');
          }, this.nasCostas !== null && this.nasCostas !== 'menino');
        },
      },
      // antes da licença, o galinheiro é só um galinheiro
      { pos: () => b.galinheiro, raio: 3, ativa: () => !f('bahia_galinheiro_licenca'), rotulo: 'F: olhar o galinheiro', agir: () => this.dialogos.tocar('bahia_galinheiro') },
      // o Bonfim: a capela da região, e as cartas dos que o peregrino levou ao hospital, na Sala dos Milagres
      ...this.interacoesDaCapela(b.capela, 'bahia_altar'),
      ...[...b.salaDosMilagres.lembrancas].map(([id, l]): Interacao => ({
        pos: () => l.pos,
        raio: 0.6,
        ativa: () => l.carta.visible,
        rotulo: 'F: ler a carta',
        agir: () => this.dialogos.tocar(`bahia_milagre_${id}`),
      })),
      { pos: () => b.alagados, raio: 2.6, rotulo: 'F: olhar os Alagados', agir: () => this.dialogos.tocar('bahia_alagados') },
      { ...this.conversaCom(() => b.medico, 'bahia_medico', 'F: falar com o médico', 2), ativa: () => b.medico.raiz.visible && this.nasCostas === null },
      ...b.hospital.leitos.map((l): Interacao => ({
        pos: () => l.pos,
        raio: 0.9,
        ativa: () => b.hospital.estagio >= l.estagio && this.nasCostas === null && !this.dialogos.ocupado,
        rotulo: `F: falar com ${l.nome}`,
        agir: () => this.dialogos.tocar(l.no),
      })),
      { pos: () => b.hospital.cadeira, raio: 1.3, ativa: () => b.hospital.estagio === 3, rotulo: 'F: olhar a cadeira', agir: () => this.dialogos.tocar('bahia_cadeira') },
      { pos: () => b.hospital.altar, raio: 1.5, ativa: () => b.hospital.estagio === 3, rotulo: 'F: olhar a capelinha', agir: () => this.dialogos.tocar('bahia_capelinha') },
    ];
  }

  /** Creta: a gente do porto e de Laseia, a porta da casa onde Paulo reza e o barco de volta à Bahia. */
  private interacoesDeCreta(): Interacao[] {
    const k = this.creta;
    const f = (x: string) => this.estado.flags.has(x);
    k.aoChegarPaulo = () => this.marcar('creta_paulo_no_cais');
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.falarCom(n), ativa: () => n.raiz.visible })),
      // Paulo reza lá dentro; quem bate o faz abrir a porta
      {
        pos: () => k.casaDePaulo,
        raio: 2.2,
        ativa: () => !f('creta_paulo_conheceu'),
        rotulo: 'F: bater à porta',
        agir: () => this.dialogos.tocar('creta_casa_paulo', () => {
          k.pauloNaPorta();
          this.falarCom(k.paulo).agir();
        }),
      },
      {
        pos: () => k.prancha,
        raio: 2.2,
        ativa: () => f('creta_conselho'),
        rotulo: 'F: embarcar com Paulo',
        agir: () => this.dialogos.tocar('creta_embarcar', () => this.embarcar()),
      },
      { pos: () => k.barcoDeVolta, raio: 3, rotulo: 'F: voltar de barco à Bahia', agir: () => this.dialogos.tocar('creta_barco_volta', () => this.fazerViagem()) },
    ];
  }

  private interacoesDaBahiaAlta(): Interacao[] {
    const b = this.bahiaBaixa, a = this.bahiaAlta;
    return [
      {
        pos: () => a.elevador,
        raio: 2.6,
        rotulo: 'F: descer pelo Elevador Lacerda',
        agir: () => {
          this.hud.anunciar('O elevador desce a escarpa…', 1.6);
          this.trocarArea(b, b.elevador.clone().add(new THREE.Vector3(-2.5, 0, 0)), -Math.PI / 2, undefined, this.nasCostas !== null);
        },
      },
      ...this.interacoesDosEnfermos(a),
      { pos: () => a.cruzeiro, raio: 2.8, ativa: () => !a.largo.lutando, rotulo: 'F: contemplar o cruzeiro', agir: () => this.dialogos.tocar('bahia_cruzeiro') },
      // os cinco do Largo do Cruzeiro, na luta contra o Coração de Pedra
      ...a.largo.enfermos.map((e, i): Interacao => ({
        pos: () => e.pos,
        raio: 1.7,
        ativa: () => a.largo.precisa(i),
        rotulo: () => (this.indiferenca > 0 ? 'Não é comigo… (a indiferença passa logo)' : e.situacao === 'petrificado' ? 'F: socorrer (desfazer a pedra)' : 'F: socorrer'),
        agir: () => {
          if (this.indiferenca > 0) return this.hud.anunciar('A indiferença ainda pesa: você não consegue parar. Espere passar.', 1.8);
          a.largo.socorrer(i);
        },
      })),
    ];
  }

  // ───────────────────────────── cidade dourada ─────────────────────────────

  /** Atos de piedade já feitos na cidade. */
  private atosDaCidade() {
    return ATOS_CIDADE.filter((f) => this.estado.flags.has(f)).length;
  }

  private sombrasDaCidadeVencidas() {
    return [...this.estado.sombrasVencidas].filter((id) => id.startsWith('cidade_')).length;
  }

  /** A cor da cidade volta com as sombras vencidas e, sobretudo, com os atos de piedade. */
  private corDaCidade() {
    const gula = this.estado.sombrasVencidas.has('palacio_gula') ? 1 : 0;
    return Math.min(1, (this.sombrasDaCidadeVencidas() + this.atosDaCidade() + gula) / (TOTAL_SOMBRAS_CIDADE + TOTAL_ATOS_CIDADE + 1));
  }

  private verificarCidadeRestaurada() {
    if (this.corDaCidade() >= 0.999 && this.primeiraVez('cidade_restaurada')) this.dialogos.tocar('cidade_restaurada');
  }

  /** Energia que custa socorrer alguém (Piedade 2: Partilha). */
  private custoPiedade() {
    return this.estado.nivel('piedade') >= 2 ? 12 : 20;
  }

  /** O que pesa no peregrino: o ouro da Gula (Piedade 4 o deixa pela metade) e a pedra no ombro. */
  private pesoEfetivo() {
    const ouro = this.estado.peso * (this.estado.nivel('piedade') >= 2 ? 0.5 : 1);
    const fardo = this.peregrino.carregando ? (this.nasCostas && this.estado.nivel('piedade') >= 4 ? 1 : 2) : 0;
    return ouro + this.pesoBanquete + fardo;
  }

  /** Um ato de piedade feito: graça, luz e, com Misericórdia (Piedade 3), um coração. */
  private atoDePiedade(flag: string, aviso: string) {
    if (this.estado.flags.has(flag)) return;
    this.estado.flags.add(flag);
    this.estado.gracas += 1;
    if (this.estado.nivel('piedade') >= 3) this.estado.coracoes = Math.min(this.estado.coracoesMax, this.estado.coracoes + 1);
    this.estado.salvar();
    this.efeitos.ouro = 0.9;
    this.som.graca();
    this.tempoColuna = 0;
    this.hud.anunciar(`✦ ${aviso} · ato de piedade ${this.atosDaCidade()} de ${TOTAL_ATOS_CIDADE}`, 3);
    setTimeout(() => this.verificarCidadeRestaurada(), 2500);
  }

  /** Efeitos pedidos pelo roteiro da cidade. Devolve true se o evento era daqui. */
  private eventoDaCidade(nome: string) {
    const c = this.cidade, e = this.estado;
    if (nome === 'dom_piedade') {
      this.marcar('dom_piedade');
      this.som.item();
      this.efeitos.ouro = 1.2;
      this.tempoColuna = 0;
      this.hud.anunciar('Você recebeu o dom da Piedade!', 3.5);
      return true;
    }
    if (nome === 'curar_leproso') {
      e.energia = Math.max(0, e.energia - this.custoPiedade());
      c.mostrarLeproso(true);
      this.atoDePiedade('cidade_leproso', 'O leproso foi curado');
      return true;
    }
    if (nome === 'pacto_lobo') {
      c.pactoLobo();
      this.som.voz('uivo', 0.6);
      this.atoDePiedade('cidade_lobo', 'A paz com o irmão lobo');
      return true;
    }
    const m = /^(socorrer|doar|retribuir)_(\w+)$/.exec(nome);
    if (!m) return false;
    const [, acao, quem] = m;
    if (acao === 'retribuir') {
      e.restaurar();
      e.salvar();
      this.efeitos.ouro = 0.7;
      this.som.graca();
      const nome = quem === 'leproso' ? 'O homem curado' : NOME_POBRE[quem as Pobre['id']] ?? quem;
      this.hud.anunciar(`🍞 ${nome} retribuiu: suas forças voltaram`, 3);
      return true;
    }
    const pobre = c.pobres.find((p) => p.id === quem);
    if (!pobre) return false;
    if (acao === 'doar') {
      e.peso = Math.max(0, e.peso - 1);
      e.salvar();
      this.som.moedas();
      if (this.estado.flags.has(`cidade_ajudou_${quem}`)) this.hud.anunciar(e.peso > 0 ? `O ouro ficou mais leve (peso ${e.peso})` : 'Você está leve de novo', 2.2);
      else this.atoDePiedade(`cidade_ajudou_${quem}`, `${NOME_POBRE[pobre.id]} recebeu o ouro`);
      return true;
    }
    e.energia = Math.max(0, e.energia - this.custoPiedade());
    this.atoDePiedade(`cidade_ajudou_${quem}`, `Você socorreu ${NOME_POBRE[pobre.id]}`);
    return true;
  }

  /** Pegar uma isca da Gula: um alívio na hora, e peso depois. */
  private pegarIsca(i: Isca) {
    const e = this.estado;
    i.pega = true;
    i.malha.visible = false;
    e.flags.add(i.id);
    e.peso += 1;
    if (i.tipo === 'prato') e.coracoes = Math.min(e.coracoesMax, e.coracoes + 1);
    else e.energia = Math.min(e.energiaMax, e.energia + (i.tipo === 'taca' ? 30 : 20));
    e.salvar();
    this.som.moedas();
    this.hud.sussurrar(SUSSURRO_ISCA[i.tipo], 3.2);
    this.hud.anunciar(`Você pegou ${NOME_ISCA[i.tipo]}. Pesa…`, 2.2);
    if (this.primeiraVez('cidade_dica_peso')) setTimeout(() => this.dialogos.tocar('cidade_dica_peso'), 1200);
  }

  /** Falar com alguém da cidade (vira para o peregrino enquanto a conversa dura). */
  private conversaCom(npc: () => Npc, no: string, rotulo: string | (() => string), raio = 2.6): Interacao {
    return {
      pos: () => npc().pos,
      raio,
      rotulo,
      agir: () => {
        const n = npc();
        n.falando = true;
        this.interlocutor = n;
        this.dialogos.tocar(no, () => (n.falando = false));
      },
    };
  }

  private interacoesDaCidade(): Interacao[] {
    const c = this.cidade;
    const f = (x: string) => this.estado.flags.has(x);
    return [
      {
        pos: () => c.saida,
        raio: 2.6,
        rotulo: 'F: voltar ao Deserto das Vozes',
        agir: () => this.trocarArea(this.deserto, this.deserto.estradaSul.clone().add(new THREE.Vector3(0, 0, -3)), Math.PI),
      },
      {
        pos: () => c.estradaDoMar,
        raio: 2.6,
        rotulo: () => (this.estado.sombrasVencidas.has('palacio_gula') ? 'F: seguir viagem para a Bahia' : 'F: examinar a estrada do mar'),
        agir: () => {
          if (!this.estado.sombrasVencidas.has('palacio_gula')) {
            this.dialogos.tocar('cidade_estrada_mar');
            return;
          }
          // a viagem por mar é longa: o peregrino chega à Bahia adulto
          this.estado.flags.add('peregrino_adulto');
          this.trocarArea(this.bahiaBaixa, this.bahiaBaixa.chegada, Math.PI / 2, () => {
            if (this.primeiraVez('bahia_entrou')) this.dialogos.tocar('bahia_chegada');
          });
        },
      },
      { pos: () => c.cruzeiro, raio: 2.6, rotulo: 'F: contemplar o cruzeiro', agir: () => this.dialogos.tocar('cidade_cruzeiro') },
      {
        pos: () => c.fonte,
        raio: 3,
        rotulo: 'F: beber da fonte',
        agir: () => {
          this.descansar(c.fonte.clone().add(new THREE.Vector3(0, 0, 3)), 'Você bebeu da fonte da praça. O caminho foi guardado aqui.');
          if (this.primeiraVez('cidade_fonte')) this.dialogos.tocar('cidade_fonte');
        },
      },
      {
        pos: () => c.portaPalacio,
        raio: 3,
        rotulo: () => (!this.portasDoPalacioAbertas() ? 'F: bater às portas de ouro' : f('gula_vencida') ? 'F: entrar no salão do banquete' : 'F: entrar no palácio'),
        agir: () => {
          if (!this.portasDoPalacioAbertas()) {
            this.dialogos.tocar('cidade_palacio');
            return;
          }
          // quem o peregrino ajudou até agora vem com ele
          this.banquete.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
          this.trocarArea(this.banquete, this.banquete.chegada, Math.PI, () => {
            if (this.primeiraVez('palacio_entrou')) this.dialogos.tocar('palacio_chegada');
          });
        },
      },
      this.falarCom(c.francisco),
      this.conversaCom(() => c.homemDaEstrada, 'leproso', () => (f('cidade_leproso') ? 'F: falar com o homem curado' : f('dom_piedade') ? 'F: socorrer o leproso' : 'F: falar com o leproso')),
      this.falarCom(c.mercador),
      ...c.pobres.map((p) =>
        this.conversaCom(() => p.npc, p.id, () =>
          f(`cidade_ajudou_${p.id}`) ? `F: falar com ${NOME_POBRE[p.id]}` : this.estado.peso > 0 ? `F: dar o ouro a ${NOME_POBRE[p.id]}` : f('dom_piedade') ? `F: socorrer ${NOME_POBRE[p.id]}` : `F: falar com ${NOME_POBRE[p.id]}`,
        ),
      ),
      // São Damião: pedra por pedra
      {
        pos: () => c.pedreira,
        raio: 2.8,
        ativa: () => f('cidade_leproso') && !c.damiaoPronto && !this.peregrino.carregando,
        rotulo: 'F: pegar uma pedra',
        agir: () => {
          this.peregrino.carregar(pedraDeCarregar());
          this.som.passo();
          this.hud.anunciar('A pedra é pesada: sem pulo, e devagar. Leve-a a São Damião.', 2.6);
        },
      },
      {
        pos: () => c.damiao,
        raio: 3,
        ativa: () => this.peregrino.carregando,
        rotulo: 'F: assentar a pedra',
        agir: () => {
          const n = c.pedrasAssentadas + 1;
          this.peregrino.carregar(null);
          this.marcar(`cidade_pedra_${n}`);
          c.definirEstagioDamiao(n);
          this.som.bloqueio();
          this.efeitos.ouro = 0.4;
          if (n >= PEDRAS_DAMIAO) {
            this.som.portao();
            this.atoDePiedade('cidade_damiao', 'São Damião foi reconstruída');
            setTimeout(() => {
              c.francisco.falando = true;
              this.dialogos.tocar('francisco', () => (c.francisco.falando = false));
            }, 1400);
          } else this.hud.anunciar(`Pedra assentada: ${n} de ${PEDRAS_DAMIAO}`, 2);
        },
      },
      {
        pos: () => c.altarDamiao,
        raio: 2.2,
        ativa: () => c.damiaoPronto,
        rotulo: 'F: rezar em São Damião',
        agir: () => this.descansar(c.altarDamiao.clone().add(new THREE.Vector3(1.6, 0, 0)), 'Você rezou diante da cruz de São Damião. O caminho foi guardado aqui.'),
      },
      // o lobo
      {
        pos: () => c.lobo?.pos ?? c.toca,
        raio: 4.5,
        ativa: () => c.estadoLobo === 'toca',
        rotulo: () => (f('dom_piedade') ? 'F: aproximar-se do lobo' : 'F: olhar a toca do lobo'),
        agir: () => this.dialogos.tocar('lobo_toca'),
      },
      {
        pos: () => c.lobo?.pos ?? c.fonte,
        raio: 1.9,
        ativa: () => c.estadoLobo === 'cidade',
        rotulo: 'F: fazer carinho no irmão lobo',
        agir: () => {
          const l = c.lobo!;
          const per = this.peregrino;
          per.rumo = Math.atan2(l.pos.x - per.pos.x, l.pos.z - per.pos.z);
          per.carinhoAlto = false;
          per.iniciar('carinho');
          l.carinho = DURACAO_CARINHO;
          setTimeout(() => this.som.voz('uivo', 0.35), 700);
        },
      },
      ...c.iscas.map((i) => ({
        pos: () => i.pos,
        raio: 1.6,
        ativa: () => !i.pega,
        rotulo: `F: pegar ${NOME_ISCA[i.tipo]}`,
        agir: () => this.pegarIsca(i),
      })),
      ...this.interacoesDaCapela(c.capela, 'cidade_altar'),
    ];
  }

  /** A cada quadro: o peso na tela e no corpo, e o lobo chegando à praça. */
  private atualizarCidade() {
    const peso = this.estado.peso + this.pesoBanquete;
    this.peregrino.mostrarPeso(peso);
    this.hud.mostrarPeso(
      this.pesoBanquete > 0 ? `⚖ Banquete da Gula · peso ${peso}` : peso > 0 ? `⚖ Ouro da Gula · peso ${peso}` : this.nasCostas ? `⚖ ${this.nasCostas === 'menino' ? 'O menino' : enfermo(this.nasCostas)?.nome} nas costas` : this.peregrino.carregando ? '⚖ Pedra para São Damião' : null,
    );
    if (this.area !== this.cidade || this.hud.dialogoAberto) return;
    const f = this.estado.flags;
    if (this.cidade.estadoLobo === 'cidade' && f.has('cidade_lobo') && !f.has('cidade_lobo_praca')) this.dialogos.tocar('lobo_cidade');
    else if (f.has('dom_piedade') && this.cidade.dentroDosMuros(this.peregrino.pos) && this.primeiraVez('cidade_dica_pobres')) this.dialogos.tocar('cidade_dica_pobres');
  }


  // ───────────────────────────── palácio da gula ─────────────────────────────

  /** As portas de ouro abrem quando São Damião está de pé e o lobo está em paz. */
  private portasDoPalacioAbertas() {
    const f = this.estado.flags;
    return f.has('cidade_portas_abertas') || (f.has('cidade_damiao') && f.has('cidade_lobo'));
  }

  private interacoesDoBanquete(): Interacao[] {
    const b = this.banquete;
    const c = this.cidade;
    const repartir = (a: Ajudante): Interacao => ({
      pos: () => a.npc.pos,
      raio: 2.4,
      ativa: () => a.presente && b.lutando,
      rotulo: () => (this.pesoBanquete > 0 ? `F: repartir o banquete com ${NOME_AJUDANTE[a.id]}` : `F: falar com ${NOME_AJUDANTE[a.id]}`),
      agir: () => this.repartirCom(a),
    });
    return [
      {
        pos: () => b.saida,
        raio: 2.6,
        ativa: () => !b.lutando,
        rotulo: 'F: voltar à cidade',
        agir: () => this.trocarArea(c, c.portaPalacio.clone().add(new THREE.Vector3(0, 0, 2.4)), 0),
      },
      ...b.ajudantes.map(repartir),
      ...b.ajudantes.map((a) => ({ ...this.conversaCom(() => a.npc, `palacio_${a.id}`, `F: falar com ${NOME_AJUDANTE[a.id]}`), ativa: () => a.presente && b.vencido })),
      {
        pos: () => b.centro,
        raio: 3,
        ativa: () => b.vencido,
        rotulo: 'F: sentar-se à mesa dos pobres',
        agir: () => this.descansar(b.centro.clone().add(new THREE.Vector3(0, 0, 2)), 'Você comeu o pão com os pobres. O caminho foi guardado aqui.'),
      },
    ];
  }

  /** Reparte com um pobre o peso do banquete: ele leva tudo (Piedade 3: e devolve um coração, uma vez). */
  private repartirCom(a: Ajudante) {
    if (this.pesoBanquete <= 0) {
      this.hud.anunciar(`${NOME_AJUDANTE[a.id][0].toUpperCase()}${NOME_AJUDANTE[a.id].slice(1)} está com você. Quando pesar, reparta (F).`, 2);
      return;
    }
    this.pesoBanquete = 0;
    this.jejum = 0;
    a.npc.falando = true;
    setTimeout(() => (a.npc.falando = false), 1600);
    this.som.graca();
    this.efeitos.ouro = 0.5;
    let extra = '';
    if (this.estado.nivel('piedade') >= 3 && !this.repartiu.has(a.id) && this.estado.coracoes < this.estado.coracoesMax) {
      this.estado.coracoes = Math.min(this.estado.coracoesMax, this.estado.coracoes + 1);
      extra = ' ❤️';
    }
    this.repartiu.add(a.id);
    this.hud.anunciar(FALA_REPARTIR[a.id] + extra, 2.6);
  }

  private lutaBanqueteComecou() {
    this.som.tensao();
    this.pesoBanquete = 0;
    this.repartiu.clear();
    this.hud.anunciar('Gula, o Banquete sem fim', 3);
    if (this.primeiraVez('palacio_dica')) this.dialogos.tocar('palacio_gula');
  }

  private banqueteServido(primeira: boolean) {
    if (primeira) return;
    this.som.moedas();
    this.hud.anunciar('O banquete não acaba: as travessas voltaram!', 2);
  }

  private travessaCaiu(restantes: number) {
    this.som.bloqueio();
    this.hud.acertou();
    if (restantes > 0) this.hud.anunciar(`Travessa derrubada · ${restantes === 1 ? 'falta 1' : `faltam ${restantes}`}`, 1.3);
  }

  // ───────────────────────────── o naufrágio e a Ira ─────────────────────────────

  private naufragioArrumado = false;
  /** A brasa da ira no peito do peregrino (0 a 100): sobe quando ele revida ou é provocado, esfria rezando. */
  private brasa = 0;
  /** A brasa encheu: até esfriar abaixo da metade, os golpes dele alimentam a Ira. */
  private irado = false;
  /** O que fazer quando a conversa do naufrágio fechar (os presos salvos: todos ao mar). */
  private aposDialogo: (() => void) | null = null;

  /** O dia raiou: cortam as âncoras, içam a vela da proa, e o navio encalha no banco de areia (At 27,40-41). */
  private encalhar() {
    this.marcar('naufragio_encalhou');
    this.hud.anunciar('Cortam as âncoras, soltam os lemes e içam a vela da proa…', 2.6);
    this.som.vagalhao();
    this.trocarArea(this.naufragio, this.naufragio.chegada, Math.PI, () => {
      this.naufragioArrumado = false;
      this.som.trovao();
      this.som.vagalhao();
      this.tremer(1, 1, 700);
      this.dialogos.tocar('naufragio_encalhe');
    });
  }

  /** O que o roteiro do naufrágio pede. Devolve true se o evento era daqui. */
  private eventoDoNaufragio(nome: string) {
    if (nome !== 'presos') return false;
    this.marcar('naufragio_presos');
    // quando a conversa fechar: todos se lançam ao mar (At 27,43-44)
    this.aposDialogo = () => {
      this.hud.escurecer(true);
      setTimeout(() => {
        this.naufragioArrumado = false;
        this.som.respingo();
        this.hud.escurecer(false);
        this.hud.anunciar('Todos se lançam ao mar. Desça pela brecha da borda e vá até a praia.', 3.6);
      }, 900);
    };
    return true;
  }

  /** A cada quadro no naufrágio: arruma a etapa, cuida da brasa e mostra a barra dela na luta. */
  private atualizarNaufragio(dt: number) {
    const k = this.naufragio, per = this.peregrino;
    const tem = (x: string) => this.estado.flags.has(x);
    if (!this.naufragioArrumado && !this.hud.dialogoAberto && !this.transitando) {
      this.naufragioArrumado = true;
      k.arrumar(tem);
    }
    if (this.aposDialogo && !this.hud.dialogoAberto) {
      const f = this.aposDialogo;
      this.aposDialogo = null;
      f();
    }
    k.pausa = this.hud.dialogoAberto || this.transitando || this.morrendo;
    // a brasa esfria sozinha devagar, e depressa na oração ("não se ponha o sol sobre a vossa ira")
    if (!k.pausa) {
      const esfria = per.acao === 'rezando' ? 22 : 2.5;
      this.brasa = Math.max(0, this.brasa - esfria * dt);
      if (this.irado && this.brasa < 50) {
        this.irado = false;
        this.hud.anunciar('A brasa esfriou. Agora, mansidão.', 1.8);
      }
    }
    this.hud.mostrarBrasa(k.lutando ? this.brasa / 100 : null, this.irado);
  }

  /** A brasa sobe (ou desce): com ela cheia, o peregrino fica irado. */
  private acenderBrasa(quanto: number) {
    if (this.area !== this.naufragio || !this.naufragio.lutando) return;
    this.brasa = Math.max(0, Math.min(100, this.brasa + quanto));
    if (quanto > 0 && this.brasa >= 100 && !this.irado) {
      this.irado = true;
      this.som.tensao();
      this.hud.anunciar('Você está irado: cada golpe seu alimenta a Ira. Pare e reze (R) para esfriar.', 3);
    } else if (quanto > 0 && this.brasa >= BRASA_MANSA && !this.irado && this.primeiraVez('naufragio_dica_brasa'))
      this.hud.sussurrar('Sinto o sangue subir...', 2.4);
  }

  /** A Ira subiu da água. */
  private lutaDaIraComecou() {
    this.som.tensao();
    const f = this.estado.flags;
    // quem já respondeu à raiva com raiva começa com a brasa acesa
    this.brasa = (f.has('creta_conselho_ira') ? 15 : 0) + (f.has('navio_gritou') ? 15 : 0) + (f.has('naufragio_presos_ira') ? 15 : 0);
    this.irado = false;
    this.hud.anunciar('A Ira', 3);
    if (this.primeiraVez('naufragio_ira_dica')) this.dialogos.tocar('naufragio_ira');
  }

  /** A Ira se desfez: o mar se acalma e todos chegam salvos à praia (At 27,44). */
  private iraVencida() {
    this.efeitos.ouro = 1.4;
    this.som.graca();
    setTimeout(() => this.som.item(), 600);
    this.tempoColuna = 0;
    this.hud.anunciar('✦ A tempestade se desfez: a resposta branda aplacou o furor', 3.4);
    this.dialogos.tocar('naufragio_ira_vencida', () => {
      this.hud.escurecer(true);
      setTimeout(() => {
        this.naufragio.arrumar((x) => this.estado.flags.has(x));
        const p = this.naufragio.praia.clone();
        p.z += 2;
        this.peregrino.teleportar(p.x, this.naufragio.altura(p.x, p.z), p.z);
        this.peregrino.rumo = Math.PI;
        this.camera.guinada = 0;
        this.camera.reposicionar();
        this.estado.checkpoint = [p.x, this.naufragio.altura(p.x, p.z), p.z];
        this.estado.checkpointArea = 'naufragio';
        this.estado.salvar();
        this.hud.escurecer(false);
        const paulo = this.naufragio.paulo;
        paulo.falando = true;
        this.interlocutor = paulo;
        this.dialogos.tocar('naufragio_praia', () => {
          paulo.falando = false;
          this.irParaMalta();
        });
      }, 1000);
    });
  }

  /** Interações no naufrágio: a gente (os soldados, Júlio e os presos abrem a cena da proa). */
  private interacoesDoNaufragio(): Interacao[] {
    const k = this.naufragio;
    k.aoTrovejar = () => this.som.trovao();
    return [
      ...k.npcs.map((n): Interacao => ({ ...this.falarCom(n), ativa: () => n.raiz.visible && !k.lutando })),
      {
        pos: () => k.praia,
        raio: 3,
        ativa: () => this.estado.flags.has('naufragio_ira_vencida'),
        rotulo: 'F: subir ao fogo dos moradores',
        agir: () => this.irParaMalta(),
      },
    ];
  }

  // ───────────────────────────── Malta ─────────────────────────────

  /** Malta já pôs cada um no seu lugar? (Refeito ao entrar e depois de cada passo da história.) */
  private maltaArrumada = false;
  /** O peregrino leva um feixe de gravetos para o fogo. */
  private levandoFeixe = false;
  /** A oração com Paulo junto ao leito do pai de Públio (0 a 1). */
  private oracaoPai = 0;
  /** O clima com que o ambiente de Malta foi aplicado (muda: refaz a luz e a névoa). */
  private climaDeMalta = -1;

  /** Da praia do naufrágio ao fogo que os moradores acenderam (At 28,2). */
  private irParaMalta() {
    this.hud.anunciar('Os moradores da ilha descem até a praia com fogo…', 2.6);
    this.trocarArea(this.malta, this.malta.chegada, Math.PI, () => {
      this.maltaArrumada = false;
      if (this.primeiraVez('malta_entrou')) this.dialogos.tocar('malta_chegada');
    });
  }

  /** A cada quadro em Malta: arruma a etapa, refaz o clima, a oração junto ao leito e o que vem depois das conversas. */
  private atualizarMalta(dt: number) {
    const k = this.malta, per = this.peregrino;
    const tem = (x: string) => this.estado.flags.has(x);
    if (!this.maltaArrumada && !this.hud.dialogoAberto && !this.transitando) {
      this.maltaArrumada = true;
      k.arrumar(tem);
    }
    if (this.aposDialogo && !this.hud.dialogoAberto) {
      const f = this.aposDialogo;
      this.aposDialogo = null;
      f();
    }
    if (k.clima !== this.climaDeMalta) this.aplicarAmbiente();
    k.levandoFeixe = this.levandoFeixe;
    k.pausa = this.hud.dialogoAberto || this.transitando;
    // rezar com Paulo junto ao leito: segurar R perto dele (At 28,8)
    const rezando = tem('malta_pai_rezar') && !tem('malta_pai_curado');
    k.pauloImpondo = rezando;
    if (rezando && !k.pausa) {
      const perto = per.pos.distanceTo(k.leito) < 3.4;
      if (perto && per.acao === 'rezando') this.oracaoPai = Math.min(1, this.oracaoPai + dt / 6);
      else this.oracaoPai = Math.max(0, this.oracaoPai - dt * 0.04);
      if (this.oracaoPai >= 1) this.paiCurado();
    }
    this.hud.mostrarOracao(rezando ? this.oracaoPai : null, 'Rezando com Paulo pelo pai de Públio');
  }

  /** O pai de Públio sarou: Paulo orou, impôs as mãos e o curou (At 28,8). */
  private paiCurado() {
    this.marcar('malta_pai_curado');
    this.oracaoPai = 0;
    this.malta.levantarOPai();
    this.efeitos.ouro = 1.3;
    this.tempoColuna = 0;
    this.som.graca();
    this.estado.gracas += 1;
    this.estado.salvar();
    this.hud.anunciar('✦ O pai de Públio está curado', 3);
    const paulo = this.malta.paulo;
    paulo.falando = true;
    this.interlocutor = paulo;
    this.dialogos.tocar('malta_pai_curado', () => {
      paulo.falando = false;
      this.maltaArrumada = false;
    });
  }

  /** O que o roteiro de Malta pede. Devolve true se o evento era daqui. */
  private eventoDeMalta(nome: string) {
    const k = this.malta;
    const tem = (x: string) => this.estado.flags.has(x);
    if (nome === 'vibora_lanca' || nome === 'vibora_prende' || nome === 'vibora_sacode') {
      k.cenaDaVibora(nome === 'vibora_lanca' ? 'lanca' : nome === 'vibora_prende' ? 'prende' : 'sacode');
      if (nome === 'vibora_lanca') this.som.fogo();
      else if (nome === 'vibora_prende') this.som.tensao();
      else setTimeout(() => this.som.faisca(), 1100);
      return true;
    }
    if (nome === 'dom_conselho') {
      this.marcar('dom_conselho');
      this.som.item();
      this.efeitos.ouro = 1.2;
      this.tempoColuna = 0;
      this.hud.anunciar('Você recebeu o dom do Conselho!', 3.5);
      return true;
    }
    if (nome === 'vibora_fim') {
      this.marcar('malta_vibora');
      this.aposDialogo = () => (this.maltaArrumada = false);
      return true;
    }
    if (nome === 'boato') {
      // cada morador corrigido: quando são os quatro, Públio desce à praia
      const faltam = BOATOS.filter((b) => !tem(`malta_boato_${b}`)).length;
      if (faltam > 0) {
        this.hud.anunciar(`A palavra certa corre de boca em boca. (${BOATOS.length - faltam} de ${BOATOS.length})`, 2.4);
        return true;
      }
      this.marcar('malta_boatos');
      this.aposDialogo = () => {
        this.maltaArrumada = false;
        setTimeout(() => {
          const p = this.malta.publio;
          p.falando = true;
          this.interlocutor = p;
          this.dialogos.tocar('malta_publio_chega', () => (p.falando = false));
        }, 400);
      };
      return true;
    }
    if (nome === 'hospedar') {
      this.marcar('malta_publio');
      k.subirParaACasa();
      this.hud.anunciar('Públio leva Paulo e os companheiros para a casa dele. Siga pela estrada que sobe.', 3.4);
      return true;
    }
    if (nome === 'rezar_pai') {
      this.marcar('malta_pai_rezar');
      this.hud.anunciar('Ajoelhe-se junto ao leito e segure R para rezar com Paulo.', 3.4);
      return true;
    }
    if (nome.startsWith('enfermo_')) {
      const id = nome.slice(8);
      this.marcar(`malta_enfermo_${id}`);
      k.mandarParaACasa(id as never);
      this.hud.anunciar('Vai para a casa de Públio, onde Paulo reza pelos enfermos.', 2.6);
      return true;
    }
    if (nome === 'curas') {
      // "os outros que tinham enfermidades na ilha vinham e eram curados" (At 28,9): e a cor volta ao mar
      this.marcar('malta_curas');
      this.marcar('mar_restaurado');
      this.estado.gracas += 2;
      this.estado.salvar();
      k.arrumar(tem);
      this.efeitos.ouro = 1.6;
      this.tempoColuna = 0;
      this.som.graca();
      setTimeout(() => this.som.item(), 700);
      this.hud.anunciar('✦ A cor voltou ao Mar da Tempestade', 3.6);
      return true;
    }
    if (nome === 'tres_meses') {
      this.aposDialogo = () => {
        this.transitando = true;
        this.hud.escurecer(true);
        setTimeout(() => {
          this.marcar('malta_tres_meses');
          k.arrumar(tem);
          const p = k.cais.clone().add(new THREE.Vector3(-1.5, 0, -3));
          this.peregrino.teleportar(p.x, k.altura(p.x, p.z), p.z);
          this.peregrino.rumo = Math.PI / 2;
          this.camera.guinada = -Math.PI / 2;
          this.camera.reposicionar();
          this.estado.checkpoint = [p.x, k.altura(p.x, p.z), p.z];
          this.estado.checkpointArea = 'malta';
          this.estado.salvar();
          this.hud.anunciar('Três meses depois…', 3);
        }, 900);
        setTimeout(() => {
          this.hud.escurecer(false);
          this.transitando = false;
          setTimeout(() => this.dialogos.tocar('malta_partida'), 900);
        }, 3200);
      };
      return true;
    }
    return false;
  }

  /** Interações em Malta: a gente, os gravetos e o fogo, o leito, o barco, o cais e a volta à enseada. */
  private interacoesDeMalta(): Interacao[] {
    const k = this.malta, per = this.peregrino;
    const f = (x: string) => this.estado.flags.has(x);
    const etapa = () => etapaDeMalta(f);
    k.aoChegar = () => {
      if (etapa() === 'enfermos' && k.enfermosNoPatio(f) && this.primeiraVez('malta_todos_no_patio'))
        this.hud.anunciar('Os enfermos já estão todos no pátio de Públio. Fale com Paulo.', 3);
    };
    const gravetos = k.gravetos.map((g, i): Interacao => ({
      pos: () => g.pos,
      raio: 1.8,
      ativa: () => etapa() === 'fogo' && !this.levandoFeixe && !f(`malta_feixe_${i}`),
      rotulo: 'F: apanhar o feixe de gravetos',
      agir: () => {
        this.marcar(`malta_feixe_${i}`);
        g.malha.visible = false;
        this.levandoFeixe = true;
        per.carregar(feixeDeGravetos(i + 20));
        this.som.passo();
      },
    }));
    return [
      // o barqueiro tem a conversa própria (que termina na viagem), mais abaixo
      ...k.npcs.filter((n) => n !== k.barqueiro).map((n): Interacao => ({ ...this.falarCom(n), ativa: () => n.raiz.visible && !(n === k.paulo && etapa() === 'vibora') })),
      // Paulo na etapa da víbora (se o jogo foi salvo antes da cena acabar): a cena recomeça falando com ele
      {
        pos: () => k.paulo.pos,
        raio: 2.8,
        ativa: () => etapa() === 'vibora',
        rotulo: 'F: falar com São Paulo',
        agir: () => this.cenaDaVibora(),
      },
      ...gravetos,
      {
        pos: () => k.fogo,
        raio: 2.6,
        ativa: () => this.levandoFeixe,
        rotulo: 'F: lançar os gravetos no fogo',
        agir: () => {
          this.levandoFeixe = false;
          per.carregar(null);
          this.som.fogo();
          const n = [1, 2, 3, 4, 5].filter((x) => f(`malta_lancou_${x}`)).length + 1;
          this.marcar(`malta_lancou_${n}`);
          k.feixes = Math.min(FEIXES, n);
          if (n >= FEIXES) {
            this.marcar('malta_fogo');
            this.hud.anunciar('O fogo pega alto. Paulo vem com o feixe dele…', 2.4);
            setTimeout(() => this.cenaDaVibora(), 1600);
          } else this.hud.anunciar(`O fogo cresce. (${n} de ${FEIXES} feixes)`, 2);
        },
      },
      {
        pos: () => k.fogo,
        raio: 2.6,
        ativa: () => f('malta_fogo') && !this.levandoFeixe && etapa() !== 'vibora',
        rotulo: 'F: aquecer-se junto ao fogo',
        agir: () => this.descansar(k.fogo.clone().add(new THREE.Vector3(1.8, 0, 1.2)), 'Você se aqueceu junto ao fogo. O caminho foi guardado aqui.'),
      },
      {
        pos: () => k.leito,
        raio: 2.6,
        ativa: () => f('malta_pai_rezar') && !f('malta_pai_curado') && per.acao !== 'rezando',
        rotulo: 'F: ajoelhar-se junto ao leito',
        agir: () => this.hud.anunciar('Segure R para rezar com Paulo.', 2.4),
      },
      {
        pos: () => k.barqueiro.pos,
        raio: 2.8,
        rotulo: 'F: falar com o barqueiro',
        agir: () => {
          const b = k.barqueiro;
          b.falando = true;
          this.interlocutor = b;
          this.dialogos.tocar('malta_barco', () => {
            b.falando = false;
            this.fazerViagem();
          });
        },
      },
      {
        pos: () => k.prancha,
        raio: 2.2,
        ativa: () => etapa() === 'partida',
        rotulo: 'F: embarcar no navio dos Dióscuros',
        agir: () => this.dialogos.tocar('malta_embarque'),
      },
      {
        pos: () => k.voltaEnseada,
        raio: 3,
        rotulo: 'F: descer à enseada do naufrágio',
        agir: () => this.trocarArea(this.naufragio, this.naufragio.praia.clone().add(new THREE.Vector3(0, 0, 2)), Math.PI, () => (this.naufragioArrumado = false)),
      },
    ];
  }

  /** A cena do fogo: Paulo lança o feixe, a víbora se prende à mão dele e ele a sacode no fogo (At 28,3-6). */
  private cenaDaVibora() {
    if (this.dialogos.ocupado) return;
    const p = this.malta.paulo;
    // o peregrino do outro lado do fogo, de frente para Paulo: a conversa enquadra os dois com a fogueira no meio,
    // e a roda de gente não tapa a víbora
    const fogo = this.malta.fogo, per = this.peregrino;
    const d = new THREE.Vector3(p.pos.x - fogo.x, 0, p.pos.z - fogo.z).normalize();
    const x = fogo.x - d.x * 2.6, z = fogo.z - d.z * 2.6;
    per.teleportar(x, this.area.altura(x, z), z);
    per.rumo = Math.atan2(p.pos.x - x, p.pos.z - z);
    p.falando = true;
    this.interlocutor = p;
    this.dialogos.tocar('malta_vibora', () => (p.falando = false));
  }

  /** O próximo passo do caminho na região, para a rosa dos ventos do Conselho (nível 2). */
  private rumoDoCaminho(): THREE.Vector3 | null {
    const tem = (x: string) => this.estado.flags.has(x);
    const per = this.peregrino.pos;
    const perto = (lista: THREE.Vector3[]) => lista.reduce<THREE.Vector3 | null>((a, p) => (!a || p.distanceToSquared(per) < a.distanceToSquared(per) ? p : a), null);
    if (this.area === this.malta) return this.malta.rumo(tem, per);
    if (this.area === this.naufragio) {
      const k = this.naufragio, e = etapaDoNaufragio(tem);
      if (e === 'presos') return k.proa;
      if (e === 'ira') return k.lutando && k.chefe ? k.chefe.pos : k.arenaEntrada;
      return k.praia;
    }
    if (this.area === this.navio) {
      const k = this.navio;
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
    if (this.area === this.creta) {
      const k = this.creta;
      if (!tem('creta_paulo_conheceu')) return k.casaDePaulo;
      if (!tem('creta_conselho')) return k.paulo.pos;
      return k.prancha;
    }
    return null;
  }

  // ───────────────────────────── o Coração de Pedra ─────────────────────────────

  private lutaDoLargoComecou() {
    this.som.tensao();
    this.indiferenca = 0;
    this.hud.anunciar('O Coração de Pedra', 3);
    if (this.primeiraVez('bahia_coracao_dica')) this.dialogos.tocar('bahia_coracao');
  }

  private enfermoDoLargoSocorrido(oracoes: number) {
    this.som.item();
    this.hud.acertou();
    if (oracoes > 0) this.hud.anunciar(oracoes < 3 ? `Ele se levanta e reza: a couraça racha (${oracoes} de 3)` : 'Três orações: a grade do peito cede!', 1.6);
    else this.hud.anunciar('Ele se levanta e reza com você.', 1.4);
  }

  private enfermoDoLargoPetrificou() {
    this.som.dissolver();
    this.hud.anunciar('Alguém virou pedra: a couraça do colosso endureceu.', 2.2);
  }

  /** O colosso desmoronou: o coração de carne, e as portas do largo se abrem. */
  private coracaoVencido() {
    this.efeitos.ouro = 1.4;
    this.som.graca();
    setTimeout(() => this.som.item(), 600);
    this.tempoColuna = 0;
    this.hud.anunciar('✦ A pedra rachou: por dentro havia um coração de carne', 3.4);
    this.dialogos.tocar('bahia_coracao_vencido', () => {
      this.hud.escurecer(true);
      setTimeout(() => {
        this.bahiaAlta.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
        this.bahiaBaixa.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
        this.hud.escurecer(false);
        this.hud.anunciar('As portas do largo se abriram: os moradores levaram os enfermos ao hospital.', 3.4);
      }, 900);
    });
  }

  private gulaVencida() {
    this.efeitos.ouro = 1.4;
    this.som.graca();
    setTimeout(() => this.som.item(), 600);
    this.tempoColuna = 0;
    this.hud.anunciar('✦ A Gula se desfez: a mesa é dos pobres', 3);
    this.dialogos.tocar('palacio_vencida', () => this.verificarCidadeRestaurada());
  }

  // ───────────────────────────── cripta ─────────────────────────────

  private braseiroAceso(n: number) {
    this.som.fogo();
    this.hud.anunciar(`${n} de 3 braseiros acesos`, 1.6);
    if (this.primeiraVez('cripta_dica_chama'))
      this.dialogos.tocar('cripta_dica_chama');
  }

  private portaoDaCriptaAberto() {
    this.som.fogo();
    this.som.portao();
    this.marcar('cripta_portao');
    this.efeitos.ouro = 0.5;
    this.hud.anunciar('As três chamas ardem juntas. O portão se abriu!', 3);
  }

  private lutaComecou() {
    this.som.tensao();
    this.som.portao();
    this.hud.anunciar('Mamom, o Guardião da Avareza', 3);
    if (this.primeiraVez('cripta_dica_guardiao')) this.dialogos.tocar('cripta_mamom');
  }

  private pegarLamparina() {
    this.marcar('lamparina');
    this.cripta.retirarLamparina();
    this.som.item();
    this.efeitos.ouro = 1.2;
    this.tempoColuna = 0;
    this.hud.anunciar('Você recebeu a Lamparina da Fé!', 3.5);
    this.lamparinaAcesa = true;
    this.atualizarLamparina();
    setTimeout(() => this.dialogos.tocar('cripta_lamparina'), 1200);
  }

  private atualizarLamparina() {
    const tem = this.estado.flags.has('lamparina');
    this.peregrino.segurarLamparina(tem && this.lamparinaAcesa, this.lamparinaAcesa);
    this.hud.mostrarItem(tem ? (this.lamparinaAcesa ? '🏮 Lamparina acesa · L' : '🏮 Lamparina · L') : null, this.lamparinaAcesa);
  }

  // ───────────────────────────── laço ─────────────────────────────

  private quadro() {
    const bruto = this.relogio.getDelta();
    if (bruto > 0) this.qps += (1 / bruto - this.qps) * 0.05;
    let dt = Math.min(0.05, bruto);
    const dev = this.dev;
    if (dev) {
      // modo dev: câmera lenta, tempo congelado e avanço de um quadro por vez
      dt *= dev.escalaTempo;
      if (dev.escalaTempo === 0 && dev.passos > 0) {
        dt = 1 / 60;
        dev.passos--;
      }
    }
    const e = this.entrada;
    // controle: nos menus ele navega pelos botões; no jogo vira as mesmas teclas do teclado
    const menu = !this.comecou || this.pausado || this.telaDons.aberta || this.modoCriacao || this.config.aberta;
    e.lerControle(menu);
    if (menu) {
      this.navUi.atualizar(e.controle, Math.min(0.05, bruto));
      if ((this.quadrosMenu = (this.quadrosMenu + 1) % 30) === 0) trocarRotulosDaTela(e.dispositivo === 'controle', e.controle.familia);
    } else this.navUi.soltar();
    // pausa: Esc ou P, ou o ponteiro solto pelo Esc do navegador
    if (this.comecou && !this.modoCriacao && !this.transitando && !this.morrendo && !dev?.painelAberto) {
      if (this.telaDons.aberta) {
        if (e.apertou('Escape', 'KeyG')) this.fecharDons();
      } else if (this.pausado && e.apertou('Escape', 'KeyP')) this.retomar();
      else if (!this.pausado && !this.hud.dialogoAberto && e.apertou('KeyG')) this.abrirDons();
      else if (!this.pausado && (e.apertou('Escape', 'KeyP') || e.soltouPonteiro)) this.pausar();
    }
    e.soltouPonteiro = false;
    e.seguirMouse = this.comecou && !this.pausado && !this.modoCriacao;
    if (this.pausado) {
      this.efeitos.renderizar(0, this.corAtual());
      e.fimDoQuadro();
      return;
    }
    if (this.comecou) {
      const borda = e.giroDeBorda();
      if (borda && !this.travado && !this.conversa.emUso) this.camera.girar(borda * 520 * dt * this.prefs.sensibilidade, 0);
      // Temor de Deus 3 (Pequenez): as sombras comuns custam mais a notar o peregrino
      // Piedade 4 (Carregar o fardo): diante de quem carrega um sofredor, as sombras comuns hesitam
      Sombra.percepcao = (this.estado.nivel('temor') >= 3 ? 0.7 : 1) * (this.nasCostas && this.estado.nivel('piedade') >= 4 ? 0.5 : 1);
      this.atualizar(dt);
      this.atualizarTorpor(dt);
      this.atualizarMinimapa();
    }
    else if (!this.modoCriacao) this.camera.girar(dt * 40, 0);
    const alvoCam = this.travado ? this.travado.centro() : null;
    // dentro da capela o telhado some e a câmera passa por cima das paredes, como na cripta
    const cap = this.area.capela;
    const naCapela = !!cap && cap.dentro(this.peregrino.pos);
    // a primeira vez na capela do deserto, o Espírito conta de quem ela é
    if (naCapela && this.area === this.deserto && this.comecou && !this.hud.dialogoAberto && this.primeiraVez('deserto_capela'))
      this.dialogos.tocar('deserto_capela');
    // no Bonfim: a primeira vez na nave e a primeira vez na Sala dos Milagres
    if (naCapela && this.area === this.bahiaBaixa && this.comecou && !this.hud.dialogoAberto) {
      if (this.primeiraVez('bahia_bonfim_entrou')) this.dialogos.tocar('bahia_bonfim_entrada');
      else if (this.bahiaBaixa.capela.naSala(this.peregrino.pos) && this.primeiraVez('bahia_sala_milagres')) this.dialogos.tocar('bahia_sala_milagres');
    }
    // no galinheiro da Bahia (e na enfermaria), o mesmo: o telhado some e a câmera passa por cima das paredes
    const hosp = this.area === this.bahiaBaixa ? this.bahiaBaixa.hospital : null;
    const noHospital = !!hosp && hosp.dentro(this.peregrino.pos);
    hosp?.mostrarTelhado(!noHospital);
    const dentro = naCapela || noHospital;
    if (this.area !== this.cripta) {
      this.camera.subirAoBater = dentro && !this.emConfissao;
      this.camera.arfagemMin = dentro && !this.emConfissao ? 0.35 : ARFAGEM_LIVRE;
    }
    if (this.emConfissao) {
      // de fora da abertura do confessionário, de lado, à altura de quem está ajoelhado
      this.camera.guinada = Math.PI / 2 + 0.35;
      this.camera.arfagem = 0.12;
      this.camera.distancia = 2.9;
    } else {
      // braço mais curto dentro da capela, para não ter de subir tanto por cima das paredes
      const alvo = dentro ? 4.3 : 6.2;
      this.camera.elevacaoMira = this.comecou ? (dentro ? 0.5 : 1.05) : 0;
      this.camera.distancia += (alvo - this.camera.distancia) * Math.min(1, dt * 3);
    }
    const area = this.area;
    const solo = area.alturaCamera ? (x: number, z: number) => area.alturaCamera!(x, z) : (x: number, z: number) => area.altura(x, z);
    // a superfície da água também segura a câmera: ela nunca mergulha (debaixo do mar se veria o terreno por baixo)
    const chao = area.nivelAgua ? (x: number, z: number) => Math.max(solo(x, z), area.nivelAgua!(x, z) ?? -Infinity) : solo;
    const alturaCam = naCapela ? (x: number, z: number) => cap!.alturaCamera(x, z, chao) : noHospital ? (x: number, z: number) => hosp!.alturaCamera(x, z, chao) : chao;
    this.camera.atualizar(dt, this.peregrino.pos, alvoCam, alturaCam);
    if (this.comecou) this.atualizarConversa(dt, alturaCam);
    if (this.area === this.navio) this.navio.balancar(this.camera.cam);
    if (this.modoCriacao) this.quadroCriacao(dt);
    this.hud.posicionarMira(this.travado ? this.travado.centro().add(new THREE.Vector3(0, 0.9, 0)) : null, this.camera.cam);
    this.atualizarMiraLivre(dt);
    const cor = this.corVisivel(dt);
    this.hud.atualizar(dt, this.estado, cor, this.area === this.cidade || this.area === this.banquete ? 'Cor da Cidade' : this.area === this.bahiaBaixa || this.area === this.bahiaAlta ? 'Cor da Bahia' : this.area === this.creta || this.area === this.navio || this.area === this.naufragio || this.area === this.malta ? 'Cor do Mar' : this.area === this.deserto || this.area === this.meiodia ? 'Cor do Deserto' : 'Cor do Vale');

    // sol acompanha o peregrino para a sombra ficar nítida por perto
    const p = this.peregrino.pos;
    this.sol.position.set(p.x + 30, p.y + 45, p.z - 40);
    this.sol.target.position.copy(p);
    this.mundo.luzFogueira.intensity = 7 + Math.sin(performance.now() * 0.013) * 1.2 + Math.sin(performance.now() * 0.031) * 0.8;
    this.flashLuz.intensity = Math.max(0, this.flashLuz.intensity - dt * 40);

    this.ceu.position.copy(this.camera.cam.position); // o céu acompanha a câmera (o deserto fica longe da origem)
    // o torpor tira a cor do mundo
    const peso = Math.min(1, this.torpor / 2);
    this.efeitos.renderizar(dt, this.modoCriacao ? 1 : cor * (1 - peso * 0.8));
    this.entrada.fimDoQuadro();
  }

  /** Câmera de retrato: o peregrino fica de frente, à direita do painel (ou acima dele, em tela estreita). */
  private quadroCriacao(dt: number) {
    const per = this.peregrino;
    // girar o boneco: arrastando o mouse ou no analógico direito
    const giro = this.entrada.controle.direito[0];
    this.rumoCriacao -= this.entrada.mouseDx * 0.01 + giro * dt * 3;
    if (!this.entrada.segurando('Mouse0') && !giro) this.rumoCriacao += dt * 0.25;
    per.rumo = this.rumoCriacao;
    per.atualizar(dt, this.area, new THREE.Vector3(), 0, false, null);
    const estreita = innerWidth < 760;
    const alvo = per.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
    const cam = this.camera.cam;
    const dist = estreita ? 5.2 : 3.4;
    cam.position.set(alvo.x, alvo.y + 0.35, alvo.z - dist);
    const olhar = alvo.clone();
    if (estreita) olhar.y -= 1.05;
    else olhar.x += 0.95; // de -z olhando para +z, a direita da tela é -x: o boneco vai para a direita
    cam.lookAt(olhar);
  }

  private atualizar(dt: number) {
    const e = this.entrada;
    const per = this.peregrino;
    const dialogo = this.hud.dialogoAberto;
    const parado = dialogo || this.morrendo || this.transitando;
    this.estado.tempo += dt;
    if (this.dev?.energiaInfinita) this.estado.energia = this.estado.energiaMax;

    if ((e.travado || e.mouseDx || e.mouseDy) && !this.conversa.emUso) {
      const k = this.prefs.sensibilidade;
      this.camera.girar(this.travado ? 0 : e.mouseDx * k, e.mouseDy * k);
    }
    if ((e.camX || e.camY) && !this.conversa.emUso) {
      const [gx, gy] = e.giroControle(dt, this.prefs.sensibilidadeControle, this.prefs.inverterY);
      this.camera.girar(this.travado ? 0 : gx, gy);
    }

    if (dialogo) {
      if (this.hud.escolhendo) {
        if (e.apertou('ArrowUp', 'KeyW', 'PadCima')) this.hud.moverEscolha(-1);
        if (e.apertou('ArrowDown', 'KeyS', 'PadBaixo')) this.hud.moverEscolha(1);
        for (let i = 0; i < 9; i++) if (e.apertou(`Digit${i + 1}`, `Numpad${i + 1}`)) this.hud.escolher(i);
      }
      if (e.apertou('KeyF', 'Enter', 'Space', 'Mouse0')) this.hud.avancar();
    }

    // mira travada
    if (!parado && e.apertou('KeyQ', 'Mouse1', 'Tab')) {
      this.travado = this.travado ? null : this.alvoMaisProximo();
      if (!this.travado) this.hud.anunciar('Nada para mirar por perto', 1.2);
    }
    if (this.travado && (!this.travado.ativa || this.travado.pos.distanceTo(per.pos) > 24)) this.travado = null;

    // lamparina
    if (!parado && e.apertou('KeyE')) this.usarCiencia();
    this.atualizarCiencia(dt);
    if (!parado && e.apertou('KeyL') && this.estado.flags.has('lamparina')) {
      this.lamparinaAcesa = !this.lamparinaAcesa;
      this.atualizarLamparina();
    }

    // direção desejada
    const [ix, iy] = parado || this.puxao ? [0, 0] : e.eixo();
    const desejo = this.camera.frente().multiplyScalar(iy).add(this.camera.direita().multiplyScalar(ix));
    if (desejo.lengthSq() > 1) desejo.normalize();
    // de joelhos (Z segurado): fazer-se pequeno. Debaixo da verga da porta estreita ninguém se levanta.
    const sobVerga = this.area === this.mundo && this.mundo.jardim.tetoBaixo(per.pos.x, per.pos.z);
    per.ajoelhado = sobVerga || (!parado && per.noChao && !per.carregando && e.segurando('KeyZ'));
    this.mundo.pequeno = per.ajoelhado;
    const correndo = e.segurando('ShiftLeft', 'ShiftRight') && !this.travado && !per.ajoelhado;
    // o ouro da Gula e a pedra no ombro pesam: mais devagar e com menos pulo
    const carga = this.pesoEfetivo();
    const velocidade = (per.ajoelhado ? 1.5 : this.travado ? 3.8 : correndo ? 7.2 : 4.4) * per.fatorVelocidade * (this.torpor > 0 ? 0.5 : 1) * (this.indiferenca > 0 ? 0.55 : 1) * Math.max(0.45, 1 - carga * 0.1) * (this.dev?.velocidade ?? 1);
    per.forcaPulo = per.carregando ? 0 : Math.max(0.55, 1 - carga * 0.12);

    const livre = !parado && per.acao === 'livre';
    if (livre && per.ajoelhado && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK', 'KeyC')) {
      this.hud.anunciar('De joelhos, as mãos estão postas. Solte Z para se levantar.', 1.8);
    } else if (livre && per.nadando && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK', 'KeyC')) {
      this.hud.anunciar('Nadando, o cajado vai preso ao corpo. Chegue à terra para lutar.', 1.8);
    } else if (livre && this.nasCostas && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK')) {
      const quem = this.nasCostas === 'menino' ? 'o menino' : enfermo(this.nasCostas)?.nome;
      this.hud.anunciar(`Com ${quem} nas costas, as mãos não largam: sem o cajado. Ainda se pode rezar (R).`, 2);
    } else if (livre && e.apertou('Mouse0', 'KeyJ')) {
      // como no Veloren: sem alvo travado, o peregrino golpeia para onde a câmera olha
      if (!this.travado) this.virarParaMira();
      per.iniciar('golpe');
      this.golpePendente = 0.13;
      this.som.golpe();
    } else if (livre && e.apertou('Mouse2', 'KeyK')) {
      if (this.torpor > 0) this.hud.anunciar('O torpor pesa demais. Segure R para rezar.', 1.6);
      else if (this.estado.energia >= 10) this.lancarLuz();
      else this.hud.anunciar('Sem energia. Segure R para rezar.', 1.6);
    } else if (livre && e.apertou('KeyC')) {
      per.iniciar('esquiva', desejo.lengthSq() > 0.01 ? desejo.clone() : undefined);
    } else if (livre && e.segurando('KeyR') && per.noChao && desejo.lengthSq() < 0.01) {
      per.iniciar('rezando');
      this.tempoOracao = 0;
      this.curaOracao = 0;
    }

    if (per.acao === 'rezando') {
      if (this.emConfissao) {
        /* ajoelhado no confessionário até o fim da conversa */
      } else if (!e.segurando('KeyR') || desejo.lengthSq() > 0.01 || dialogo) per.acao = 'livre';
      else this.rezar(dt);
    }

    if (e.apertou('KeyF') && !parado && per.acao === 'livre') this.interacaoPerto()?.agir();

    const pular = !parado && e.apertou('Space') && per.acao === 'livre';
    if (pular && per.noChao) this.som.pulo();
    // na conversa, o peregrino se vira para quem fala com ele
    const olharPara = this.travado ? this.travado.pos : dialogo && this.interlocutor ? this.interlocutor.pos : null;
    per.atualizar(dt, this.area, desejo, velocidade, pular, olharPara);
    if (!parado) this.atualizarPuxao(dt);

    if (per.velocidadeHoriz > 0.5 && (per.noChao || per.nadando)) {
      this.somPasso -= dt * per.velocidadeHoriz;
      if (this.somPasso <= 0) {
        this.somPasso = per.nadando ? 2.4 : 1.7;
        if (per.nadando) this.som.bracada();
        else this.som.passo();
      }
    }
    if (per.mergulhou) {
      per.mergulhou = false;
      this.som.respingo();
    }

    // golpe acerta um pouco depois de começar
    if (this.golpePendente > 0) {
      this.golpePendente -= dt;
      if (this.golpePendente <= 0) this.resolverGolpe();
    }
    this.avisoCouraca = Math.max(0, this.avisoCouraca - dt);

    this.atualizarProjeteis(dt);
    if (this.area === this.navio) this.atualizarNavio(dt);
    if (this.area === this.naufragio) this.atualizarNaufragio(dt);
    else this.hud.mostrarBrasa(null);
    if (this.area === this.malta) this.atualizarMalta(dt);
    else this.hud.mostrarOracao(null);
    if (this.area === this.creta && !this.cretaArrumada && !this.hud.dialogoAberto) {
      this.cretaArrumada = true;
      this.creta.arrumar((x) => this.estado.flags.has(x));
    }
    this.area.atualizar?.(dt, per.pos);

    const chefe = this.chefeDaArea();
    chefe?.sentir({
      pos: per.pos, noChao: per.noChao, esquivando: per.acao === 'esquiva', invulneravel: per.invulneravel > 0, peso: this.pesoEfetivo(),
      rezando: per.acao === 'rezando', brasa: this.brasa, irado: this.irado,
    });
    for (const s of this.area.sombras) {
      if (s.estado === 'vencida' || parado) continue;
      s.atualizar(dt, this.area, per.pos);
      if (!s.ativa) continue;
      const d = s.pos.distanceTo(per.pos);
      if ((s.perigosa && d < s.raioInvestida) || d < s.raioContato) this.ferir(s.pos);
    }
    if (!parado) this.aplicarImpactosDoChefe();
    this.atualizarBarraChefe();
    if (this.area === this.mundo) {
      this.verificarVeu();
      this.atualizarJardim();
    }
    this.atualizarCidade();
    this.atualizarBahia();
    this.faunas.get(this.area.id)?.atualizar(dt, per.pos, (v, d) => this.som.voz(v, 1 - d / 16));
    this.pomba.atualizar(dt, per.pos, per.rumo);
    this.atualizarColuna(dt);

    // dica de interação
    const i = !parado && per.acao === 'livre' ? this.interacaoPerto() : null;
    if (i) this.hud.mostrarDica(typeof i.rotulo === 'function' ? i.rotulo() : i.rotulo);
    else if (sobVerga) this.hud.mostrarDica('De joelhos, pela porta estreita…');
    else if (!parado && !per.ajoelhado && this.area === this.mundo && per.pos.distanceTo(this.mundo.jardim.porta) < 2.6)
      this.hud.mostrarDica('Segure Z para se ajoelhar e passar pela porta estreita');
    else if (per.acao === 'rezando' && !this.emConfissao) this.hud.mostrarDica(this.oracaoDobrada() ? 'Rezando (junto à cruz: força em dobro)…' : 'Rezando…');
    else if (!dialogo && this.estado.energia < 10) this.hud.mostrarDica('Pouca energia: pare e segure R para rezar');
    else this.hud.mostrarDica(null);
  }

  private pausar() {
    this.pausado = true;
    this.hud.mostrarRetic(this.prefs.mira, null, 0);
    document.exitPointerLock?.();
    const nomes = NOMES_AREA;
    const min = Math.floor(this.estado.tempo / 60);
    const tempo = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    const id = this.estado.identidade ?? identidadePadrao();
    this.pausa.abrir(`${id.nome} · ${nomes[this.area.id]} · ${this.estado.gracas} ${this.estado.gracas === 1 ? 'graça' : 'graças'} · ${tempo}`);
  }

  /** A árvore dos dons (G): pausa o jogo enquanto está aberta. */
  private abrirDons() {
    this.pausado = true;
    this.hud.mostrarRetic(this.prefs.mira, null, 0);
    document.exitPointerLock?.();
    this.pausa.fechar();
    this.telaDons.abrir();
  }

  private fecharDons() {
    this.telaDons.fechar();
    this.retomar();
  }

  private retomar() {
    this.pausado = false;
    this.pausa.fechar();
    this.relogio.getDelta(); // o tempo parado não conta
    travarPonteiro(this.renderer.domElement);
  }

  /** Salva (o checkpoint já está no save) e volta à tela inicial. */
  private sairParaTitulo() {
    this.estado.salvar();
    this.pausado = false;
    this.pausa.fechar();
    this.telaDons.fechar();
    this.comecou = false;
    this.torpor = 0;
    this.tempoCiencia = 0;
    this.travado = null;
    this.puxao = null;
    this.projeteis.forEach((p) => this.cena.remove(p.malha));
    this.projeteis = [];
    this.lamparinaAcesa = false;
    this.hud.encerrar();
    this.dialogos.encerrar();
    this.hud.mostrarChefe(null);
    this.atualizarCiencia(0);
    this.som.ambienteDe(null);
    document.getElementById('hud')!.style.visibility = 'hidden';
    this.voltarAoTitulo();
  }

  /** Torpor: pesa, gasta energia e se desfaz sozinho bem devagar (rezando, depressa). */
  private atualizarTorpor(dt: number) {
    this.indiferenca = Math.max(0, this.indiferenca - dt);
    if (this.indiferenca > 0 && !this.hud.dialogoAberto) this.hud.mostrarDica('Indiferente: não é comigo… (passa logo)');
    if (this.torpor <= 0) {
      this.hud.mostrarTorpor(0);
      return;
    }
    this.torpor = Math.max(0, this.torpor - dt);
    this.estado.energia = Math.max(0, this.estado.energia - dt * 2);
    this.hud.mostrarTorpor(Math.min(1, this.torpor / 2));
    if (this.peregrino.acao !== 'rezando' && !this.hud.dialogoAberto) this.hud.mostrarDica('Torpor: segure R para rezar e se levantar');
  }

  private atualizarMinimapa() {
    const a = this.area;
    if (this.areaNoMapa !== a.id) {
      this.areaNoMapa = a.id;
      const nomes = NOMES_AREA;
      this.minimapa.definirArea(a.id, nomes[a.id], a.fonteMapa());
    }
    const marcas: Marca[] = [];
    for (const i of this.interacoes[a.id]) {
      if (i.ativa && !i.ativa()) continue;
      const rot = typeof i.rotulo === 'function' ? i.rotulo() : i.rotulo;
      if (rot.startsWith('F: fazer carinho')) continue;
      const tipo = /descansar|ajoelhar|beber|confessar/.test(rot) ? 'descanso' : /falar/.test(rot) ? 'pessoa' : /voltar|seguir|descer|subir/.test(rot) ? 'saida' : 'lugar';
      const p = i.pos();
      marcas.push({ x: p.x, z: p.z, tipo });
    }
    for (const s of a.sombras) if (s.ativa && !s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: CHEFOES.includes(s.id) ? 'chefe' : 'sombra' });
    for (const s of a.sombras) if (s.ativa && s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: 'chefe' });
    const p = this.peregrino.pos;
    const conselho = this.estado.nivel('conselho');
    this.minimapa.desenhar(p.x, p.z, this.camera.guinada, this.peregrino.rumo, marcas, { alvo: conselho >= 2 ? this.rumoDoCaminho() : null, raio: conselho >= 3 ? 60 : undefined });
  }

  private lutaMeioDiaComecou() {
    this.som.tensao();
    this.hud.anunciar('Acídia, o Demônio do Meio-Dia', 3);
    if (this.primeiraVez('meiodia_dica')) this.dialogos.tocar('meiodia_acedia');
  }

  private acediaVencida() {
    this.efeitos.ouro = 1.4;
    this.som.graca();
    setTimeout(() => this.som.item(), 600);
    this.tempoColuna = 0;
    this.hud.anunciar('✦ A acídia se desfez ao sol', 3);
    this.dialogos.tocar('meiodia_vencido');
  }

  /** O chefão da área atual (se houver). */
  private chefeDaArea(): Chefe | null {
    if (this.area === this.cripta) return this.cripta.guardiao;
    if (this.area === this.meiodia) return this.meiodia.acedia;
    if (this.area === this.banquete) return this.banquete.gula;
    if (this.area === this.bahiaAlta) return this.bahiaAlta.largo.chefe;
    if (this.area === this.naufragio) return this.naufragio.chefe;
    return null;
  }

  private atualizarBarraChefe() {
    const c = this.area === this.cripta ? this.cripta.guardiao : null;
    const a = this.area === this.meiodia ? this.meiodia.acedia : null;
    if (c && this.cripta.lutando && c.ativa)
      return this.hud.mostrarChefe('MAMOM · GUARDIÃO DA AVAREZA', c.vida / c.vidaMax, c.estado !== 'atordoada', c.alerta);
    if (a && this.meiodia.lutando && a.ativa)
      return this.hud.mostrarChefe('ACÍDIA · O DEMÔNIO DO MEIO-DIA', a.vida / a.vidaMax, !a.revelado, a.alerta);
    const gu = this.area === this.banquete ? this.banquete.gula : null;
    if (gu && this.banquete.lutando && gu.ativa) return this.hud.mostrarChefe('GULA · O BANQUETE SEM FIM', gu.vida / gu.vidaMax, !gu.faminta, gu.alerta);
    const lg = this.area === this.bahiaAlta ? this.bahiaAlta.largo : null;
    if (lg?.chefe && lg.lutando && lg.chefe.ativa)
      return this.hud.mostrarChefe('O CORAÇÃO DE PEDRA · A DUREZA DE CORAÇÃO', lg.chefe.vida / lg.chefe.vidaMax, !lg.chefe.exposto, lg.chefe.alerta);
    const ir = this.area === this.naufragio ? this.naufragio.chefe : null;
    if (ir && this.naufragio.lutando && ir.ativa) return this.hud.mostrarChefe('A IRA · A TEMPESTADE DO CORAÇÃO', ir.vida / ir.vidaMax, !ir.exposta, ir.alerta);
    this.hud.mostrarChefe(null);
  }

  /** Aplica no peregrino o que o chefão acertou neste quadro (dano, roubo de energia, puxão). */
  private aplicarImpactosDoChefe() {
    const g = this.chefeDaArea();
    if (!g) return;
    for (const imp of g.impactos.splice(0)) {
      if (imp.som === 'sol') this.som.sol();
      else if (imp.som === 'raio') this.som.raio();
      else if (imp.som === 'torpor') this.som.torpor();
      else if (imp.som === 'dissolver') this.som.dissolver();
      else if (imp.som === 'onda') this.som.onda();
      else if (imp.som === 'corrente') this.som.corrente();
      else if (imp.som === 'moedas') this.som.moedas();
      else if (imp.som === 'rugido') this.som.tensao();
      if (imp.aviso) this.hud.anunciar(imp.aviso, 2.2);
      if (imp.roubo) {
        this.estado.energia = Math.max(0, this.estado.energia - imp.roubo);
        this.som.roubo();
      }
      if (imp.torpor) {
        this.torpor = 9;
        this.hud.sussurrar('Para que continuar? Nada disso vale a pena…', 3.2);
        this.peregrino.iniciar('ferido');
      }
      if (imp.sussurro) this.hud.sussurrar(imp.sussurro, 2.8);
      if (imp.indiferenca && this.estado.nivel('piedade') >= 5) {
        // Piedade 5 (Coração de carne): o olhar da indiferença não prende mais
        if (this.indiferenca <= 0) this.hud.anunciar('O olhar cinzento passa: um coração de carne não se deixa prender.', 1.6);
      } else if (imp.indiferenca) {
        this.indiferenca = imp.indiferenca;
        this.som.torpor();
        this.peregrino.iniciar('ferido');
        this.hud.anunciar('O olhar cinzento pegou você: por uns segundos, você passa ao largo.', 2.2);
      }
      if (imp.peso) {
        this.pesoBanquete = Math.min(8, this.pesoBanquete + imp.peso);
        this.som.moedas();
        this.peregrino.iniciar('ferido');
        this.hud.anunciar(`Um prato da Gula caiu em você. Pesa… (peso ${this.pesoBanquete})`, 1.6);
      }
      if (imp.arrasto) {
        // o devorar da Gula arrasta o peregrino para a boca (sem atravessar paredes)
        const per = this.peregrino.pos;
        const antes = per.clone();
        per.add(imp.arrasto);
        this.area.colidir(per, 0.35);
        if (this.area.altura(per.x, per.z) > antes.y + 1.05) per.copy(antes);
      }
      if (imp.brasa) this.acenderBrasa(imp.brasa);
      if (imp.empurrao && this.peregrino.invulneravel <= 0) this.peregrino.empurrao.copy(imp.empurrao);
      if (imp.puxarPara) this.puxao = { de: this.peregrino.pos.clone(), para: imp.puxarPara.clone(), t: 0 };
      if (imp.dano > 0) this.ferir(imp.de, imp.dano, !!imp.roubo);
    }
  }

  /** O peregrino sendo arrastado pela corrente. */
  private atualizarPuxao(dt: number) {
    const p = this.puxao;
    if (!p) return false;
    p.t = Math.min(1, p.t + dt / 0.4);
    const k = 1 - (1 - p.t) ** 3;
    const per = this.peregrino.pos;
    per.x = p.de.x + (p.para.x - p.de.x) * k;
    per.z = p.de.z + (p.para.z - p.de.z) * k;
    if (p.t >= 1) this.puxao = null;
    return true;
  }

  /** Com a lamparina acesa perto do véu, a névoa se desfaz. */
  private verificarVeu() {
    const m = this.mundo;
    if (m.veuAberto || !this.lamparinaAcesa) return;
    if (this.peregrino.pos.distanceTo(m.veu) > 4.5) return;
    m.abrirVeu();
    this.marcar('veu_oeste');
    this.som.dissolver();
    setTimeout(() => this.som.graca(), 500);
    this.efeitos.ouro = 1;
    this.dialogos.tocar('vale_nevoa_desfeita');
  }

  /**
   * O jardim de Agostinho: diante da porta estreita, o Espírito Santo ensina a se ajoelhar; ao entrar de joelhos
   * pela primeira vez, a humildade abre o coração e vem a graça, com a voz de criança do outro lado do muro.
   */
  private atualizarJardim() {
    const j = this.mundo.jardim, p = this.peregrino.pos;
    if (this.hud.dialogoAberto || this.transitando) return;
    if (j.dentro(p.x, p.z)) {
      if (this.primeiraVez('vale_porta_estreita')) {
        this.receberGraca('A humildade abriu a porta estreita');
        this.dialogos.tocar('vale_jardim');
      }
    } else if (p.distanceTo(j.porta) < 2.6 && this.primeiraVez('vale_porta_vista')) this.dialogos.tocar('vale_jardim_porta');
  }

  /** Uma graça recebida (não conquistada): a luz desce, o som da graça e o aviso. */
  private receberGraca(aviso: string) {
    this.estado.gracas += 1;
    this.estado.salvar();
    this.efeitos.ouro = 0.9;
    this.som.graca();
    this.tempoColuna = 0;
    this.hud.anunciar(`✦ ${aviso} · uma graça (G)`, 3);
  }

  /** O peregrino vira o corpo para a direção da mira (só no plano do chão). */
  private virarParaMira() {
    const per = this.peregrino;
    // com um inimigo sob a mira, vira para ele (o golpe pega mesmo de raspão); senão, para o ponto mirado
    const ponto = this.miraAlvo?.ativa ? this.miraAlvo.pos : this.miraPonto;
    const dx = ponto.x - per.pos.x, dz = ponto.z - per.pos.z;
    if (dx * dx + dz * dz > 0.25) per.rumo = Math.atan2(dx, dz);
    else {
      const f = this.camera.frente();
      per.rumo = Math.atan2(f.x, f.z);
    }
  }

  /**
   * A mira livre, como no Veloren: um raio sai da câmera pelo centro da tela e para no primeiro inimigo ou no chão
   * (até 45 m). O trecho entre a câmera e o peregrino não conta, para não mirar no que está atrás dele.
   */
  private atualizarMiraLivre(dt: number) {
    const cam = this.camera.cam;
    const per = this.peregrino;
    const origem = cam.position;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const ate = origem.distanceTo(per.pos) - 0.6;
    const inicio = Math.max(0, ate);
    let fim = 45;
    let alvo: Alvo | null = null;
    const c = new THREE.Vector3();
    for (const s of [...this.area.sombras, ...(this.area.alvos?.() ?? [])] as Alvo[]) {
      if (!s.ativa) continue;
      s.centro(c).sub(origem);
      const t = c.dot(dir);
      if (t < inicio || t > fim) continue;
      const r = ((s as Partial<{ raioCorpo: number }>).raioCorpo ?? 0.8) + 0.35;
      if (c.lengthSq() - t * t < r * r) {
        fim = t;
        alvo = s;
      }
    }
    const p = new THREE.Vector3();
    for (let t = inicio; t < fim; t += 0.3) {
      p.copy(origem).addScaledVector(dir, t);
      if ((this.area.alturaCamera?.(p.x, p.z) ?? this.area.altura(p.x, p.z)) > p.y) {
        fim = t;
        alvo = null;
        break;
      }
    }
    this.miraPonto.copy(origem).addScaledVector(dir, fim);
    this.miraAlvo = alvo;

    const ver = this.comecou && !this.modoCriacao && !this.travado && !this.hud.dialogoAberto && !this.morrendo && !this.transitando &&
      !this.emConfissao && per.acao !== 'rezando';
    const perto = !!alvo && Math.hypot(alvo.pos.x - per.pos.x, alvo.pos.z - per.pos.z) < 1.8 + ((alvo as Partial<{ raioCorpo: number }>).raioCorpo ?? 0.8);
    this.hud.mostrarRetic(
      this.prefs.mira,
      ver ? { sobreAlvo: !!alvo, aoAlcance: perto, semEnergia: this.estado.energia < 10 || this.torpor > 0 } : null,
      dt,
    );
  }

  private alvoMaisProximo() {
    const p = this.peregrino.pos;
    const frente = this.camera.frente();
    let melhor: Alvo | null = null;
    let nota = Infinity;
    const candidatos: Alvo[] = [...this.area.sombras, ...(this.area.alvos?.() ?? [])];
    for (const s of candidatos) {
      if (!s.ativa) continue;
      const d = s.pos.distanceTo(p);
      if (d > 20) continue;
      const dir = s.pos.clone().sub(p).setY(0).normalize();
      const n = d - dir.dot(frente) * 6; // prefere o que está à frente da câmera
      if (n < nota) {
        nota = n;
        melhor = s;
      }
    }
    return melhor;
  }

  private resolverGolpe() {
    const per = this.peregrino;
    const frente = per.frente();
    this.area.golpear?.(per.pos, frente);
    for (const s of this.area.sombras) {
      if (!s.ativa) continue;
      const para = s.pos.clone().sub(per.pos).setY(0);
      const d = para.length();
      if (d < 1.8 + s.raioCorpo && para.normalize().dot(frente) > 0.25) {
        const r = s.ferir(2 + this.bonusDaVerdade(), per.pos, 'golpe');
        if (r === 'bloqueado') {
          this.som.bloqueio();
          if (this.avisoCouraca <= 0) this.hud.anunciar(s.mensagemBloqueio, 1.4);
          this.avisoCouraca = 3;
        } else {
          this.som.acerto();
          this.hud.acertou();
          this.tremer(0.15, 0.45, 70);
          if (r === 'morreu') this.sombraVencida(s);
        }
      }
    }
  }

  private lancarLuz() {
    const per = this.peregrino;
    if (!this.travado) this.virarParaMira();
    per.iniciar('luz');
    this.estado.energia -= 10;
    this.som.luz();
    const origem = per.pontaDoCajado();
    const malha = new THREE.Mesh(this.geoLuz, this.matLuz);
    malha.position.copy(origem);
    // travada, a luz persegue o alvo; livre, vai para o ponto sob a mira
    const destino = this.travado ? this.travado.centro() : this.miraPonto.clone();
    if (destino.distanceTo(origem) < 1.5) destino.copy(per.pos).add(per.frente().multiplyScalar(14)).setY(origem.y);
    const vel = destino.sub(origem).normalize().multiplyScalar(18);
    this.cena.add(malha);
    this.projeteis.push({ malha, vel, vida: 1.6, alvo: this.travado });
    this.flashLuz.position.copy(origem);
    this.flashLuz.intensity = 14;
  }

  private atualizarProjeteis(dt: number) {
    for (const p of this.projeteis) {
      p.vida -= dt;
      if (p.alvo?.ativa) {
        const quer = p.alvo.centro().sub(p.malha.position).normalize().multiplyScalar(18);
        p.vel.lerp(quer, Math.min(1, dt * 8));
      }
      p.malha.position.addScaledVector(p.vel, dt);
      p.malha.scale.setScalar(1 + Math.sin(p.vida * 40) * 0.15);
      if (this.area.atingirLuz?.(p.malha.position)) {
        this.flashLuz.position.copy(p.malha.position);
        this.flashLuz.intensity = 16;
        p.vida = 0;
      }
      for (const s of this.area.sombras) {
        if (p.vida <= 0) break;
        if (!s.ativa) continue;
        if (s.centro().distanceTo(p.malha.position) < 0.55 + s.raioCorpo * 0.8) {
          this.som.acerto();
          this.flashLuz.position.copy(p.malha.position);
          this.flashLuz.intensity = 16;
          const r = s.ferir(3 + this.bonusDaVerdade(), this.peregrino.pos, 'luz');
          if (r !== 'bloqueado') this.hud.acertou();
          if (r === 'morreu') this.sombraVencida(s);
          else if (r === 'atordoado') this.hud.anunciar('Atordoado! Golpeie agora!', 1.4);
          else if (r === 'bloqueado') {
            this.som.bloqueio();
            if (this.avisoCouraca <= 0 && this.area === this.meiodia) this.hud.anunciar(s.mensagemBloqueio, 1.4);
            this.avisoCouraca = 3;
          }
          p.vida = 0;
        }
      }
      if (p.vida > 0 && p.malha.position.y < this.area.altura(p.malha.position.x, p.malha.position.z)) {
        // bateu na pedra: a luz se espalha num clarão curto, para o jogador ver onde parou
        p.vida = 0;
        this.flashLuz.position.copy(p.malha.position).addScaledVector(p.vel, -0.03);
        this.flashLuz.intensity = 9;
        this.som.faisca();
      }
      if (p.vida <= 0) this.cena.remove(p.malha);
    }
    this.projeteis = this.projeteis.filter((p) => p.vida > 0);
  }

  private sombrasDoValeVencidas() {
    return [...this.estado.sombrasVencidas].filter((id) => id.startsWith('vale_')).length;
  }

  private sombraVencida(s: Sombra) {
    this.som.dissolver();
    if (this.travado === s) this.travado = null;
    const ajudante = s.id.startsWith('cripta_ajudante');
    if (!ajudante) this.estado.sombrasVencidas.add(s.id);
    // vencer um chefão-vício é graça grande (3); as outras sombras, graça pequena (1)
    const chefao = CHEFOES.includes(s.id);
    // as ajudantes do Mamom voltam a cada luta: não dão graça (senão viraria fonte infinita)
    if (!ajudante) this.estado.gracas += chefao ? 3 : 1;
    if (chefao) this.estado.flags.add(`graca_grande_${s.id}`);
    if (s.id.startsWith('vale_')) this.estado.cor = Math.min(1, this.sombrasDoValeVencidas() / TOTAL_SOMBRAS_VALE);
    this.estado.energia = Math.min(this.estado.energiaMax, this.estado.energia + 15);
    this.estado.salvar();
    const guardiao = s.id === 'cripta_guardiao';
    if (guardiao) this.cripta.guardiaoVencido();
    if (guardiao || s.id === 'meiodia_acedia' || s.id === 'palacio_gula' || s.id === ID_CORACAO || s.id === ID_IRA) {
      // cada chefão vencido dá um coração a mais, e o peregrino sai da luta curado
      this.estado.coracoes = this.estado.coracoesMax;
      setTimeout(() => this.hud.anunciar('❤️ Mais um coração!', 2.6), 3400);
    }
    if (s.id === 'palacio_gula') {
      this.banquete.chefeVencido();
      this.pesoBanquete = 0;
      this.marcar('gula_vencida');
      setTimeout(() => this.gulaVencida(), 900);
      return;
    }
    if (s.id === ID_IRA) {
      this.naufragio.chefeVencido();
      this.brasa = 0;
      this.irado = false;
      this.marcar('naufragio_ira_vencida');
      setTimeout(() => this.iraVencida(), 1800);
      return;
    }
    if (s.id === ID_CORACAO) {
      this.bahiaAlta.largo.chefeVencido();
      this.indiferenca = 0;
      this.marcar('bahia_coracao_vencido');
      setTimeout(() => this.coracaoVencido(), 1800);
      return;
    }
    if (s.id === 'meiodia_acedia') {
      this.meiodia.chefeVencido();
      this.torpor = 0;
      this.marcar('meiodia_vencido');
      setTimeout(() => this.acediaVencida(), 900);
      return;
    }
    setTimeout(() => {
      this.efeitos.ouro = guardiao ? 1.4 : 1;
      this.som.graca();
      this.tempoColuna = 0;
      this.hud.anunciar(guardiao ? '✦ Mamom se desfez em luz' : '✦ Graça recebida', 2.6);
      if (guardiao) {
        this.som.portao();
        this.dialogos.tocar('cripta_mamom_vencido');
      }
      if (this.estado.cor >= 0.999 && this.primeiraVez('vale_restaurado')) {
        this.dialogos.tocar('vale_restaurado');
      }
      if (s.id.startsWith('deserto_') && this.sombrasDoDesertoVencidas() >= TOTAL_SOMBRAS_DESERTO && this.primeiraVez('deserto_restaurado'))
        this.dialogos.tocar('deserto_restaurado');
      if (s.id.startsWith('cidade_')) this.verificarCidadeRestaurada();
    }, 700);
  }

  private atualizarColuna(dt: number) {
    if (this.tempoColuna < 0) return;
    this.tempoColuna += dt;
    const t = this.tempoColuna;
    this.coluna.visible = true;
    this.coluna.position.copy(this.peregrino.pos);
    (this.coluna.material as THREE.MeshBasicMaterial).opacity = Math.min(1, t * 3) * Math.max(0, 1 - (t - 1) / 1.2) * 0.55;
    this.coluna.scale.set(1 + t * 0.1, 1, 1 + t * 0.1);
    if (t > 2.2) {
      this.tempoColuna = -1;
      this.coluna.visible = false;
    }
  }

  private oracaoDobrada() {
    const p = this.peregrino.pos;
    if (this.area === this.deserto) {
      const d = this.deserto;
      return p.distanceTo(d.cruz) < 4 || p.distanceTo(d.antao.pos) < 5 || d.capela.dentro(p);
    }
    if (this.area === this.cidade) {
      const c = this.cidade;
      if (p.distanceTo(c.cruzeiro) < 4 || p.distanceTo(c.francisco.pos) < 5 || c.capela.dentro(p)) return true;
      if (c.damiaoPronto && p.distanceTo(c.altarDamiao) < 4) return true;
      // Piedade 5 (Instrumento da paz): quem foi ajudado reza junto
      if (this.estado.nivel('piedade') >= 5)
        return c.pobres.some((q) => this.estado.flags.has(`cidade_ajudou_${q.id}`) && p.distanceTo(q.npc.pos) < 5) ||
          (this.estado.flags.has('cidade_leproso') && p.distanceTo(c.homemDaEstrada.pos) < 5);
      return false;
    }
    if (this.area === this.bahiaBaixa) {
      const b = this.bahiaBaixa, h = b.hospital;
      if (b.capela.dentro(p) || h.naCapelinha(p)) return true;
      // Piedade 5: na enfermaria e no hospital, quem você carregou reza com você
      return this.estado.nivel('piedade') >= 5 && h.estagio >= 2 && h.dentro(p);
    }
    if (this.area !== this.mundo) return false;
    return p.distanceTo(this.mundo.cruzeiro) < 4 || Math.hypot(p.x - CAPELA.x, p.z - CAPELA.y) < 5;
  }

  private rezar(dt: number) {
    this.tempoOracao += dt;
    // "não pare de rezar": a oração desfaz o torpor depressa
    if (this.torpor > 0) {
      this.torpor = Math.max(0, this.torpor - dt * (this.estado.nivel('temor') >= 5 ? 12 : 6));
      if (this.torpor === 0) {
        this.hud.anunciar('A oração venceu o torpor!', 2);
        this.som.graca();
        this.efeitos.ouro = 0.5;
      }
    }
    // jejum: rezando, o peso do banquete vai embora aos poucos
    if (this.pesoBanquete > 0) {
      this.jejum += dt;
      if (this.jejum >= 2.2) {
        this.jejum = 0;
        this.pesoBanquete--;
        this.som.oracao();
        this.hud.anunciar(this.pesoBanquete > 0 ? `O jejum alivia: peso ${this.pesoBanquete}` : 'Leve de novo!', 1.4);
      }
    }
    const taxa = this.tempoOracao < 3 ? 5 : this.tempoOracao < 6 ? 8 : 12;
    const contrito = this.estado.nivel('temor') >= 2 ? 1.3 : 1;
    this.estado.energia = Math.min(this.estado.energiaMax, this.estado.energia + taxa * contrito * (this.oracaoDobrada() ? 2 : 1) * dt);
    // Temor de Deus 4 (Repouso em Deus): depois de 4 s rezando, meio coração a cada 4 s
    if (this.estado.nivel('temor') >= 4 && this.tempoOracao > 4 && this.estado.coracoes < this.estado.coracoesMax) {
      this.curaOracao += dt;
      if (this.curaOracao >= 4) {
        this.curaOracao = 0;
        this.estado.coracoes = Math.min(this.estado.coracoesMax, this.estado.coracoes + 0.5);
        this.efeitos.ouro = 0.35;
        this.som.graca();
      }
    }
    this.somOracao -= dt;
    if (this.somOracao <= 0) {
      this.somOracao = 1.2;
      this.som.oracao();
    }
  }

  /** `dano` em corações: 0,5 é meio coração (o padrão); golpes pesados tiram 1. */
  /** Ciência 5 (a verdade fere a mentira): +1 de dano com a Ciência ativa. */
  private bonusDaVerdade() {
    return this.tempoCiencia > 0 && this.estado.nivel('ciencia') >= 5 ? 1 : 0;
  }

  private ferir(de: THREE.Vector3, dano = 0.5, semEmpurrao = false) {
    const per = this.peregrino;
    if (per.invulneravel > 0 || this.morrendo || this.dev?.invencivel) return;
    this.estado.coracoes = Math.max(0, this.estado.coracoes - dano);
    per.invulneravel = 1.2;
    per.iniciar('ferido');
    this.efeitos.dano = 1;
    this.som.dano();
    this.tremer(dano >= 1 ? 0.8 : 0.5, 0.7, dano >= 1 ? 320 : 200);
    if (this.estado.coracoes <= 0) return this.morrer();
    if (semEmpurrao) return;
    const empurra = per.pos.clone().sub(de).setY(0).normalize().multiplyScalar(1.2);
    const antes = per.pos.clone();
    per.pos.add(empurra);
    // não empurra para dentro de parede
    if (this.area.altura(per.pos.x, per.pos.z) > antes.y + 1.05) per.pos.copy(antes);
  }

  /** Vibração do controle, se o jogador não a desligou nas Configurações. */
  private tremer(forte: number, fraco: number, ms: number) {
    if (this.prefs.vibracao) this.entrada.vibrar(forte, fraco, ms);
  }

  private morrer() {
    this.morrendo = true;
    this.tremer(1, 1, 600);
    this.puxao = null;
    this.travado = null;
    this.hud.escurecer(true);
    setTimeout(() => {
      this.cripta.reiniciarLuta();
      this.meiodia.reiniciarLuta();
      this.banquete.reiniciarLuta();
      this.bahiaAlta.largo.reiniciarLuta();
      this.naufragio.reiniciarLuta();
      this.brasa = 0;
      this.irado = false;
      this.indiferenca = 0;
      this.pesoBanquete = 0;
      this.peregrino.carregar(null);
      this.torpor = 0;
      this.tempoCiencia = 0;
      const destino = this.areaPorId(this.estado.checkpointArea);
      if (destino !== this.area) {
        this.area = destino;
        this.aplicarAmbiente();
      }
      const [x, y, z] = this.estado.checkpoint;
      this.peregrino.teleportar(x, y, z);
      this.peregrino.acao = 'livre';
      this.camera.reposicionar();
      this.estado.cair();
      this.estado.restaurar();
      this.estado.salvar(); // a queda vale mesmo se o jogo for fechado agora
      this.hud.escurecer(false);
      this.hud.anunciar('Você voltou ao último lugar de descanso.', 3);
      this.morrendo = false;
    }, 1200);
  }

  private interacaoPerto() {
    const p = this.peregrino.pos;
    let melhor: Interacao | null = null;
    let dm = Infinity;
    const lista = this.interacoes[this.area.id];
    for (const i of lista) {
      if (i.ativa && !i.ativa()) continue;
      const d = Math.hypot(i.pos().x - p.x, i.pos().z - p.z);
      if (d < i.raio && d < dm) {
        dm = d;
        melhor = i;
      }
    }
    return melhor;
  }

  // ───────────────────────────── modo dev ─────────────────────────────

  /**
   * As operações que o painel de desenvolvedor pode usar (`src/dev`). Só o modo dev chama isto; o painel não
   * mexe em campos privados, e as regras continuam aqui.
   */
  ganchosDev(): GanchosDev {
    // fora do modo dev não existe painel: o build troca DEV por false e descarta o resto desta função
    if (!import.meta.env.DEV) throw new Error('ganchosDev só existe no modo dev');
    const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);
    const m = this.mundo, d = this.deserto, md = this.meiodia, c = this.cidade, b = this.banquete;
    const e = this.estado;
    const norte = Math.PI, oeste = -Math.PI / 2, sul = 0;
    const ponto = (nome: string, pos: THREE.Vector3, rumo = norte) => ({ nome, pos: pos.clone(), rumo });
    const areas = (): AreaDev[] => [
      { id: 'vale', nome: NOMES_AREA.vale, pontos: [
        ponto('Início', m.inicio), ponto('Fogueira', m.fogueira.clone().add(v(2, 2))), ponto('Cruzeiro', m.cruzeiro.clone().add(v(0, 2.5))),
        ponto('Jardim de Agostinho (porta)', m.jardim.porta, Math.PI / 2), ponto('Jardim de Agostinho (dentro)', m.jardim.livro.clone().add(v(-2.5, -0.3)), Math.PI / 2),
        ponto('Capela', v(CAPELA.x, CAPELA.y + 14)), ponto('Escada da cripta', m.entradaCripta.clone().add(v(0, 2.4)), norte),
        ponto('Véu do oeste', m.veu.clone().add(v(4, 0)), oeste), ponto('Fim da passagem', m.fimPassagem.clone().add(v(3, 0)), oeste),
      ] },
      { id: 'cripta', nome: NOMES_AREA.cripta, pontos: [
        ponto('Chegada', this.cripta.chegada), ponto('Arena de Mamom', this.cripta.centroArena.clone().add(v(0, 9))),
        ponto('Relicário', this.cripta.relicario.clone().add(v(0, 2.5))),
      ] },
      { id: 'deserto', nome: NOMES_AREA.deserto, pontos: [
        ponto('Chegada', d.chegada, oeste), ponto('Poço', d.poco.clone().add(v(3, 0)), oeste), ponto('Caverna de Santo Antão', d.caverna.clone().add(v(0, 4))),
        ponto('Rocha falsa', d.parede.clone().add(v(3, 0)), oeste), ponto('Fim da fenda', d.fimFenda.clone().add(v(2.5, 0)), oeste),
        ponto('Estrada do sul', d.estradaSul.clone().add(v(0, -3)), sul), ponto('Capela', d.capela.porta.clone().add(v(0, 3))),
      ] },
      { id: 'meiodia', nome: NOMES_AREA.meiodia, pontos: [ponto('Chegada', md.chegada, oeste), ponto('Praça (luta)', md.centro.clone().add(v(7, 0)), oeste)] },
      { id: 'cidade', nome: NOMES_AREA.cidade, pontos: [
        ponto('Chegada', c.chegada), ponto('Fonte', c.fonte.clone().add(v(0, 3))), ponto('Portas do palácio', c.portaPalacio.clone().add(v(0, 2.4))),
        ponto('São Damião', c.damiao.clone().add(v(0, 6))), ponto('Pedreira', c.pedreira.clone().add(v(0, 3))), ponto('Toca do lobo', c.toca.clone().add(v(0, 4))),
      ] },
      { id: 'palacio', nome: NOMES_AREA.palacio, pontos: [ponto('Chegada', b.chegada), ponto('Salão (luta)', b.centro.clone().add(v(0, 6)))] },
      { id: 'bahiabaixa', nome: NOMES_AREA.bahiabaixa, pontos: [
        ponto('Chegada (rampa do mercado)', this.bahiaBaixa.chegada, Math.PI / 2), ponto('Irmã Dulce e o menino', this.bahiaBaixa.dulceEmCena.pos.clone().add(v(-7, 0)), Math.PI / 2), ponto('Elevador Lacerda', this.bahiaBaixa.elevador, -Math.PI / 2),
        ponto('Hospital (dentro)', this.bahiaBaixa.hospital.entrada, Math.PI),
        ponto('Mercado Modelo', this.bahiaBaixa.mercado.clone().add(v(4, 0)), -Math.PI / 2), ponto('Largo de Roma e o galinheiro', this.bahiaBaixa.galinheiro.clone().add(v(0, 6))),
        ponto('Bonfim', this.bahiaBaixa.bonfim.clone().add(v(0, 10))), ponto('Alagados', this.bahiaBaixa.alagados.clone().add(v(3, 0)), -Math.PI / 2),
        ponto('Armazém do comerciante', this.bahiaBaixa.armazemPorta, Math.PI / 2),
        ponto('Galinheiro (porta)', this.bahiaBaixa.galinheiro, Math.PI),
        ponto('Bonfim (dentro)', this.bahiaBaixa.capela.porta.clone().add(v(0, -4)), Math.PI),
        ponto('Abrigo (porta do convento)', this.bahiaBaixa.conventoPorta.clone().add(v(-3, 0)), Math.PI / 2),
      ] },
      { id: 'bahiaalta', nome: NOMES_AREA.bahiaalta, pontos: [
        ponto('Chegada (Praça Tomé de Sousa)', this.bahiaAlta.chegada, Math.PI / 2), ponto('Terreiro de Jesus', this.bahiaAlta.chafariz.clone().add(v(-8, 0)), Math.PI / 2),
        ponto('Largo do Cruzeiro (arena)', this.bahiaAlta.cruzeiro.clone().add(v(-8, 0)), Math.PI / 2), ponto('Pelourinho', this.bahiaAlta.pelourinho.clone().add(v(0, 6))),
      ] },
      { id: 'creta', nome: NOMES_AREA.creta, pontos: [
        ponto('Chegada (praia da enseada)', this.creta.chegada, sul), ponto('Ilhota (a nado)', this.creta.ilhota.clone().add(v(0, -10)), sul),
        ponto('Cais (prancha do navio)', this.creta.cais, -oeste), ponto('Convés do navio', this.creta.conves, sul),
        ponto('Casa de Paulo (Lucas e Aristarco)', this.creta.casaDePaulo.clone().add(v(0, 3))),
        ponto('Prancha (conselho e embarque)', this.creta.prancha.clone().add(v(-2, -2)), -oeste),
        ponto('Laseia (porta)', this.creta.portaLaseia, -oeste), ponto('Laseia (praça)', this.creta.praca),
        ponto('Farol', this.creta.farol, -oeste), ponto('Cabana do pastor', this.creta.cabana),
      ] },
      { id: 'malta', nome: NOMES_AREA.malta, pontos: [
        ponto('Praia (o fogo)', this.malta.chegada, norte), ponto('Casa de Públio (pátio)', this.malta.portaPublio.clone().add(v(0, -12)), norte),
        ponto('Povoado (o poço)', this.malta.povoado), ponto('Porto (o navio dos Dióscuros)', this.malta.cais, -oeste), ponto('Melite (a porta)', this.malta.portaMelite, oeste),
      ] },
      { id: 'naufragio', nome: NOMES_AREA.naufragio, pontos: [ponto('Proa do navio encalhado', this.naufragio.chegada, norte), ponto('Arena (água rasa)', this.naufragio.arenaEntrada, norte), ponto('Praia de Malta', this.naufragio.praia, sul)] },
      { id: 'navio', nome: NOMES_AREA.navio, pontos: [ponto('Convés (junto ao mastro)', this.navio.chegada, sul), ponto('Popa (o bote)', this.navio.cabosDoBote.clone().add(v(0, 2)), norte), ponto('Proa (a sonda)', this.navio.proa.clone().add(v(0, -2)), sul)] },
    ];
    /** Desfaz uma vitória: tira a sombra das vencidas e as flags que ela deixou. */
    const desvencer = (id: string, ...flags: string[]) => {
      e.sombrasVencidas.delete(id);
      for (const f of flags) e.flags.delete(f);
    };
    const chefe = (o: {
      id: string; nome: string; area: IdArea;
      entidade: () => Sombra | null; lutando: () => boolean; reiniciarLuta: () => void;
      preparar: () => void; entrada: () => THREE.Vector3; rumo: number;
    }): ChefeDev => ({
      id: o.id,
      nome: o.nome,
      area: o.area,
      entidade: o.entidade,
      lutando: o.lutando,
      vencido: () => e.sombrasVencidas.has(o.id),
      lutar: () => {
        o.reiniciarLuta();
        o.preparar();
        this.reconstruirMundo();
        this.curar();
        this.irPara(o.area, o.entrada(), o.rumo);
      },
      reiniciar: () => {
        o.reiniciarLuta();
        this.curar();
        this.irPara(o.area, o.entrada(), o.rumo);
      },
      fase2: () => {
        const s = o.entidade();
        if (s?.ativa) s.vida = Math.min(s.vida, Math.floor(s.vidaMax / 2));
      },
      vencer: () => {
        const s = o.entidade();
        if (s && s.derrotar() === 'morreu') this.sombraVencida(s);
      },
    });
    return {
      estado: e,
      peregrino: this.peregrino,
      renderer: this.renderer,
      areas,
      chefes: () => [
        chefe({
          id: 'cripta_guardiao', nome: 'Mamom, o Guardião da Avareza', area: 'cripta',
          entidade: () => this.cripta.guardiao, lutando: () => this.cripta.lutando, reiniciarLuta: () => this.cripta.reiniciarLuta(),
          preparar: () => {
            desvencer('cripta_guardiao', 'lamparina');
            e.cor = 1;
            for (const f of ['intro', 'cripta_laje', 'cripta_entrou', 'cripta_portao', 'cripta_dica_chama', 'cripta_dica_guardiao']) e.flags.add(f);
          },
          entrada: () => this.cripta.centroArena.clone().add(v(0, 4)), rumo: norte,
        }),
        chefe({
          id: 'meiodia_acedia', nome: 'Acídia, o demônio do meio-dia', area: 'meiodia',
          entidade: () => md.acedia, lutando: () => md.lutando, reiniciarLuta: () => md.reiniciarLuta(),
          preparar: () => {
            desvencer('meiodia_acedia', 'meiodia_vencido');
            for (const f of ['intro', 'meiodia_entrou', 'meiodia_dica']) e.flags.add(f);
          },
          entrada: () => md.centro.clone().add(v(8, 0)), rumo: oeste,
        }),
        chefe({
          id: 'palacio_gula', nome: 'Gula, o Banquete sem fim', area: 'palacio',
          entidade: () => b.gula, lutando: () => b.lutando, reiniciarLuta: () => b.reiniciarLuta(),
          preparar: () => {
            desvencer('palacio_gula', 'gula_vencida');
            for (const f of ['intro', 'cidade_damiao', 'cidade_lobo', 'palacio_entrou', 'palacio_dica']) e.flags.add(f);
          },
          entrada: () => b.centro.clone().add(v(0, 7)), rumo: norte,
        }),
        chefe({
          id: ID_CORACAO, nome: 'O Coração de Pedra', area: 'bahiaalta',
          entidade: () => this.bahiaAlta.largo.chefe, lutando: () => this.bahiaAlta.largo.lutando, reiniciarLuta: () => this.bahiaAlta.largo.reiniciarLuta(),
          preparar: () => {
            desvencer(ID_CORACAO, 'bahia_coracao_vencido');
            for (const f of ['intro', 'bahia_enfermaria', 'bahia_alta_entrou', 'bahia_coracao_dica']) e.flags.add(f);
          },
          entrada: () => this.bahiaAlta.cruzeiro.clone().add(v(-11, 0)), rumo: -oeste,
        }),
        chefe({
          id: ID_IRA, nome: 'A Ira', area: 'naufragio',
          entidade: () => this.naufragio.chefe, lutando: () => this.naufragio.lutando, reiniciarLuta: () => this.naufragio.reiniciarLuta(),
          preparar: () => {
            desvencer(ID_IRA, 'naufragio_ira_vencida');
            for (const f of ['intro', 'navio_entrou', 'navio_bote', 'navio_cintado', 'navio_carga', 'navio_brigas', 'navio_anjo', 'navio_sonda', 'navio_ancoras', 'navio_fuga', 'navio_pao', 'naufragio_encalhou', 'naufragio_presos', 'naufragio_ira_dica'])
              e.flags.add(f);
            this.naufragio.reiniciar(e.sombrasVencidas, (x) => e.flags.has(x));
            this.naufragioArrumado = false;
          },
          entrada: () => this.naufragio.arenaEntrada.clone().add(v(0, -2)), rumo: norte,
        }),
      ],
      info: () => {
        const ch = this.chefeDaArea() as unknown as Sombra | null;
        return {
          qps: this.qps,
          area: this.area.id,
          arfagem: this.camera.arfagem,
          guinada: this.camera.guinada,
          chefe: ch ? `${ch.id} · ${ch.vida.toFixed(1)}/${ch.vidaMax} · ${ch.estado}` : null,
          travado: this.travado ? ((this.travado as Partial<Sombra>).id ?? 'alvo') : null,
          mira: this.miraPonto.clone(),
          peso: this.pesoEfetivo(),
          torpor: this.torpor,
        };
      },
      irPara: (area, pos, rumo) => this.irPara(area, pos, rumo),
      mapaDoMundo: (x0, z0, x1, z1, passo) => pintarMapa(this.terrenoMundo, x0, z0, x1, z1, passo),
      recarregarProgresso: () => {
        this.reconstruirMundo();
        this.aplicarAmbiente();
        e.coracoes = Math.min(e.coracoes, e.coracoesMax);
      },
      iniciarTeste: (area) => {
        e.zerar();
        e.slot = null;
        e.identidade = identidadePadrao();
        e.flags.add('intro');
        this.minimapa.esquecer('deserto');
        this.areaNoMapa = '';
        this.reconstruirMundo();
        e.checkpoint = this.mundo.inicio.toArray() as [number, number, number];
        this.posicionarNoCheckpoint();
        this.comecar();
        const destino = area && areas().find((a) => a.id === area);
        if (destino && destino.id !== 'vale') this.irPara(destino.id, destino.pontos[0].pos, destino.pontos[0].rumo);
      },
      curar: () => this.curar(),
      pularDialogo: () => {
        this.dialogos.encerrar();
        for (let i = 0; i < 80 && this.hud.dialogoAberto; i++) this.hud.avancar();
      },
      vencerSombra: (s) => {
        if (s.derrotar() === 'morreu') this.sombraVencida(s);
      },
      sombrasDaArea: () => this.area.sombras.filter((s) => s.ativa),
    };
  }

  /** Teleporta dentro da área ou troca de área (modo dev). */
  private irPara(id: IdArea, pos: THREE.Vector3, rumo = Math.PI) {
    const destino = this.areaPorId(id);
    if (destino !== this.area) return this.trocarArea(destino, pos, rumo);
    const y = destino.altura(pos.x, pos.z);
    this.peregrino.teleportar(pos.x, y, pos.z);
    this.peregrino.rumo = rumo;
    this.camera.guinada = rumo + Math.PI;
    this.camera.reposicionar();
    this.pomba.raiz.position.set(pos.x, y + 3, pos.z);
    this.travado = null;
  }

  private curar() {
    this.estado.restaurar();
    this.pesoBanquete = 0;
    this.torpor = 0;
    this.peregrino.carregar(null);
  }

}
