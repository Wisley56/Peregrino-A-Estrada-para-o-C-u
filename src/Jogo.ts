import * as THREE from 'three';
import { CameraTerceira } from './core/Camera';
import { Entrada, travarPonteiro } from './core/Entrada';
import { CHEFOES, Estado } from './core/Estado';
import { Som } from './core/Som';
import { identidadePadrao, texto, visualDe } from './core/Aparencia';
import { Efeitos } from './fx/Efeitos';
import { Hud, Fala } from './ui/Hud';
import { Criacao } from './ui/Criacao';
import { Mundo } from './mundo/Mundo';
import { Cripta } from './mundo/Cripta';
import { Alvo, Area, IdArea } from './mundo/Area';
import { Deserto, TOTAL_SOMBRAS_DESERTO } from './mundo/Deserto';
import { PocoMeioDia } from './mundo/PocoMeioDia';
import { Chefe } from './entidades/Guardiao';
import { Minimapa, Marca } from './ui/Minimapa';
import { Pausa } from './ui/Pausa';
import { CAPELA } from './mundo/Terreno';
import { colunaDeLuz, construirCeu } from './mundo/Cenario';
import { Peregrino } from './entidades/Peregrino';
import { Pomba } from './entidades/Pomba';
import { Sombra } from './entidades/Sombra';
import { Preferencias } from './core/Preferencias';
import { TelaDons } from './ui/Dons';
import { Configuracoes } from './ui/Configuracoes';

const TOTAL_SOMBRAS_VALE = 5;

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
  readonly som = new Som();
  readonly mundo = new Mundo();
  cripta!: Cripta;
  /** Área onde o peregrino está agora. */
  area: Area = this.mundo;
  readonly peregrino = new Peregrino(visualDe(identidadePadrao()));
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
  private interacoes: Record<IdArea, Interacao[]> = { vale: [], cripta: [], deserto: [], meiodia: [] };
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
  /** Segundos de torpor (o vício da acídia): o peregrino fica pesado até rezar. */
  private torpor = 0;
  /** Segundos que ainda restam do dom da Ciência ligado. */
  private tempoCiencia = 0;
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

    this.camera = new CameraTerceira(innerWidth / innerHeight);
    this.entrada = new Entrada(this.renderer.domElement);
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
    this.cena.add(this.mundo.grupo, this.deserto.grupo, this.meiodia.grupo, this.peregrino.raiz, this.pomba.raiz, this.coluna, this.flashLuz);
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
    await Promise.all([this.mundo.povoar(this.estado.sombrasVencidas), this.deserto.povoar()]);
    this.deserto.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.meiodia.reiniciar(this.estado.sombrasVencidas);
    this.montarCripta();
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
    this.mundo.reporSombras(this.estado.sombrasVencidas);
    if (this.estado.flags.has('veu_oeste')) this.mundo.abrirVeu(true);
    else this.mundo.fecharVeu();
    this.minimapa.esquecer('deserto');
    this.areaNoMapa = '';
    this.deserto.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.meiodia.reiniciar(this.estado.sombrasVencidas);
    this.montarCripta();
    if (!temSave) this.estado.checkpoint = this.mundo.inicio.toArray() as [number, number, number];
    this.posicionarNoCheckpoint();
    if (this.estado.identidade === null) this.abrirCriacao();
    else this.comecar();
  }

  /** (Re)cria a cripta a partir do progresso atual. */
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

  /** Aplica a identidade salva (ou a padrão). `?idade=jovem|adulto|idoso` testa o envelhecimento. */
  private vestirPeregrino() {
    const id = this.estado.identidade ?? identidadePadrao();
    const teste = new URLSearchParams(location.search).get('idade');
    const idade = teste === 'jovem' || teste === 'adulto' || teste === 'idoso' ? teste : id.idade;
    this.peregrino.vestir(visualDe(id, idade));
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
    this.mundo.reporSombras(this.estado.sombrasVencidas);
    this.mundo.fecharVeu();
    this.deserto.reiniciar(this.estado.sombrasVencidas, this.estado.flags);
    this.meiodia.reiniciar(this.estado.sombrasVencidas);
    this.montarCripta();
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
    if (!this.estado.flags.has('intro')) {
      const id = this.estado.identidade ?? identidadePadrao();
      this.hud.falar(
        [
          { quem: 'espirito', texto: texto('{nome}, a estrada para o Céu começa aqui, junto a esta fogueira.', id) },
          { quem: 'espirito', texto: 'Sombras roubaram as cores do Vale. Chegue perto delas, trave a mira com Q e dissipe-as com o cajado ou com a luz.' },
          { quem: 'espirito', texto: 'A luz gasta energia espiritual. Quando faltar, pare e reze: segure R.' },
          { quem: 'espirito', texto: 'Siga a estrada até a capela no alto do monte. Eu estarei com você.' },
        ],
        () => this.marcar('intro'),
      );
    }
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
    this.mundo.grupo.visible = this.area === this.mundo;
    this.cripta.grupo.visible = naCripta;
    this.deserto.grupo.visible = noDeserto;
    this.meiodia.grupo.visible = noPoco;
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
    this.camera.arfagemMin = naCripta ? 0.5 : -0.25;
    this.camera.subirAoBater = naCripta;
    this.som.ambienteDe(this.comecou ? this.tipoAmbiente() : null);
    if (naCripta) this.camera.arfagem = Math.max(this.camera.arfagem, 0.5);
  }

  private tipoAmbiente() {
    return this.area === this.cripta ? 'cripta' : this.area === this.deserto || this.area === this.meiodia ? 'deserto' : null;
  }

  private areaPorId(id: IdArea): Area {
    return id === 'cripta' ? this.cripta : id === 'deserto' ? this.deserto : id === 'meiodia' ? this.meiodia : this.mundo;
  }

  private sombrasDoDesertoVencidas() {
    return [...this.estado.sombrasVencidas].filter((id) => id.startsWith('deserto_')).length;
  }

  /** A cor da região onde o peregrino está (a cripta usa a do Vale). */
  private corAtual() {
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
          this.hud.falar([
            { quem: 'espirito', texto: 'Ouviu? São as vozes do deserto. Elas falam bonito, mas não falam a verdade.' },
            { quem: 'espirito', texto: 'Quando alguma coisa parecer boa demais, desconfie. Não saia do rastro dos marcos.' },
          ]),
        1500,
      );
  }

  private aoDesfazerMiragem(porCiencia: boolean) {
    this.som.dissolver();
    this.hud.anunciar(porCiencia ? 'A Ciência mostrou a verdade: era uma miragem!' : 'Era uma miragem!', 2.4);
    if (!porCiencia && this.primeiraVez('deserto_dica_miragem'))
      setTimeout(
        () =>
          this.hud.falar([
            { quem: 'espirito', texto: 'A tentação se veste de coisa boa. Por trás da miragem havia uma sombra.' },
            { quem: 'espirito', texto: 'Vença-a, e o deserto vai recuperando a cor.' },
          ]),
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
          this.hud.falar([
            { quem: 'espirito', texto: 'A rocha era falsa! O penhasco não estava fechado: o medo é que fazia parecer.' },
            { quem: 'espirito', texto: 'A fenda segue para oeste.' },
          ]);
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

  private falarComAntao() {
    const id = this.estado.identidade ?? identidadePadrao();
    if (!this.estado.flags.has('dom_ciencia')) {
      this.hud.falar(
        [
          { quem: 'Santo Antão', texto: texto('Paz a você, {nome}. Eu sou Antão. Você atravessou as vozes e chegou até aqui.', id) },
          { quem: 'Santo Antão', texto: 'Quando eu era jovem, ouvi na igreja: "Se queres ser perfeito, vai, vende o que tens, dá aos pobres, e depois vem e segue-me." Vendi tudo e vim para o deserto.' },
          { quem: 'Santo Antão', texto: 'Aqui as vozes me mostraram ouro no caminho, banquetes, a saudade de casa. Tudo parecia bom. Tudo era armadilha.' },
          { quem: 'Santo Antão', texto: 'Um dia vi as armadilhas do inimigo espalhadas pela terra inteira e perguntei: "Quem pode escapar delas?" E ouvi uma voz: "A humildade."' },
          { quem: 'espirito', texto: 'Antão aprendeu a distinguir o verdadeiro do falso. Isso é o dom da Ciência.' },
          { quem: 'Santo Antão', texto: 'Receba-o. Quando alguma coisa parecer bonita demais, olhe de novo, com os olhos de Deus.' },
        ],
        () => {
          this.marcar('dom_ciencia');
          this.som.item();
          this.efeitos.ouro = 1.2;
          this.tempoColuna = 0;
          this.hud.anunciar('Você recebeu o dom da Ciência!', 3.5);
          setTimeout(
            () =>
              this.hud.falar([
                { quem: 'espirito', texto: 'Aperte E para usar a Ciência. Ela gasta 15 de energia e, por alguns segundos, mostra o que as coisas são de verdade.' },
                { quem: 'Santo Antão', texto: 'A oeste, onde o penhasco parece fechado, há uma fenda. Olhe para ela com a Ciência.' },
              ]),
            1400,
          );
        },
      );
      return;
    }
    if (!this.deserto.paredeAberta) {
      const n = this.deserto.miragensRestantes;
      this.hud.falar([
        { quem: 'Santo Antão', texto: 'O penhasco a oeste esconde uma fenda. Chegue perto dele e use a Ciência (E).' },
        ...(n > 0 ? [{ quem: 'Santo Antão', texto: `Ainda ${n === 1 ? 'resta uma miragem' : `restam ${n} miragens`} no deserto. Cada uma esconde uma sombra.` }] : []),
      ]);
      return;
    }
    if (this.estado.flags.has('meiodia_vencido')) {
      this.hud.falar([
        { quem: 'Santo Antão', texto: texto('Você voltou, {nome}. Eu vi a água subir no poço: o demônio do meio-dia foi vencido.', this.estado.identidade ?? identidadePadrao()) },
        { quem: 'Santo Antão', texto: 'Ele vai voltar outras vezes, em outros dias quentes. Quando voltar, faça o que fez hoje: reze, e continue a caminhar.' },
      ]);
      return;
    }
    this.hud.falar([
      { quem: 'Santo Antão', texto: 'Depois da fenda mora o demônio do meio-dia. Ele não grita: ele cansa. Faz a alma achar que nada vale a pena.' },
      { quem: 'Santo Antão', texto: 'Quando o cansaço chegar, não pare de rezar. Vá com Deus.' },
    ]);
  }

  /** Escurece, troca de área, guarda o lugar de chegada como checkpoint e clareia. */
  private trocarArea(destino: Area, pos: THREE.Vector3, rumo: number, depois?: () => void) {
    if (this.transitando) return;
    this.transitando = true;
    this.travado = null;
    this.torpor = 0;
    this.hud.escurecer(true);
    setTimeout(() => {
      this.projeteis.forEach((p) => this.cena.remove(p.malha));
      this.projeteis = [];
      this.area = destino;
      this.aplicarAmbiente();
      const y = destino.altura(pos.x, pos.z);
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
          if (this.primeiraVez('cruzeiro'))
            this.hud.falar([{ quem: 'espirito', texto: 'Junto à cruz, a oração tem o dobro de força. Ajoelhe-se aqui quando estiver cansado.' }]);
          else this.hud.falar([{ quem: 'Inscrição', texto: '"Eu sou o caminho, a verdade e a vida." (Jo 14,6)' }]);
        },
      },
      {
        pos: () => m.altar,
        raio: 2.4,
        rotulo: 'F: ajoelhar-se diante do altar',
        agir: () => {
          this.descansar(m.altar.clone().add(new THREE.Vector3(0, 0, 2)), 'Confissão: o caminho foi guardado na capela.');
          if (this.estado.flags.has('veu_oeste'))
            this.hud.falar([{ quem: 'espirito', texto: 'O caminho a oeste está aberto. Depois das montanhas fica o Deserto das Vozes, onde Santo Antão espera por você.' }]);
          else if (this.estado.flags.has('lamparina'))
            this.hud.falar([{ quem: 'espirito', texto: 'Leve a Lamparina até a névoa de trevas, a oeste do Vale.' }]);
          else if (this.estado.cor >= 0.999)
            this.hud.falar([
              { quem: 'espirito', texto: 'O Vale voltou a ter cor. Mas a estrada continua: sob esta capela fica a cripta dos primeiros peregrinos.' },
              { quem: 'espirito', texto: 'Lá embaixo há uma lamparina que nenhuma treva apaga. Desça pela escada ao lado da capela.' },
            ]);
          else {
            const faltam = TOTAL_SOMBRAS_VALE - this.sombrasDoValeVencidas();
            this.hud.falar([{ quem: 'espirito', texto: `Ainda há ${faltam} ${faltam === 1 ? 'sombra' : 'sombras'} no Vale. Volte quando ele tiver recuperado as cores.` }]);
          }
        },
      },
      {
        pos: () => m.entradaCripta,
        raio: 2.6,
        rotulo: () => (this.estado.cor >= 0.999 ? 'F: descer à cripta' : 'F: examinar a escada selada'),
        agir: () => {
          if (this.estado.cor < 0.999) {
            this.hud.falar([{ quem: 'espirito', texto: 'Uma laje pesada sela a escada. Ela só vai ceder quando o Vale tiver recuperado as cores.' }]);
            return;
          }
          const descer = () =>
            this.trocarArea(c, c.chegada, Math.PI, () => {
              if (this.primeiraVez('cripta_entrou'))
                this.hud.falar([
                  { quem: 'espirito', texto: 'Esta é a cripta dos primeiros peregrinos. Aqui embaixo, é a luz que abre os caminhos.' },
                  { quem: 'espirito', texto: 'Fique atento: as sombras também se escondem no escuro.' },
                ]);
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
            this.hud.falar([{ quem: 'espirito', texto: 'Uma névoa de trevas fecha a passagem. Nem o cajado nem a sua luz a atravessam: é preciso uma luz que não se apague.' }]);
        },
      },
      {
        pos: () => m.fimPassagem,
        raio: 2.4,
        ativa: () => m.veuAberto,
        rotulo: 'F: seguir para o Deserto das Vozes',
        agir: () =>
          this.trocarArea(d, d.chegada, -Math.PI / 2, () => {
            if (this.primeiraVez('deserto_entrou'))
              this.hud.falar([
                { quem: 'espirito', texto: 'Este é o Deserto das Vozes. Aqui o silêncio é grande, e por isso as vozes falsas parecem altas.' },
                { quem: 'espirito', texto: 'Siga os marcos de pedra até a caverna de Santo Antão. Ele já venceu este deserto antes de você.' },
              ]);
          }),
      },
      ...m.ovelhas.map<Interacao>((o) => ({
        pos: () => o.pos,
        raio: 1.8,
        rotulo: 'F: fazer carinho na ovelha',
        agir: () => {
          o.balindo = 0.6;
          this.som.balido();
        },
      })),
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
        agir: () =>
          this.hud.falar([
            { quem: 'Inscrição', texto: 'Aqui repousam os primeiros peregrinos, que caminharam de noite levando a luz.' },
            { quem: 'Inscrição', texto: '"A tua palavra é lâmpada para os meus pés e luz para o meu caminho." (Sl 119,105)' },
          ]),
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
          if (this.primeiraVez('deserto_poco'))
            this.hud.falar([{ quem: 'espirito', texto: 'Água de verdade, não de miragem. "Quem beber da água que eu lhe der nunca mais terá sede." (Jo 4,14)' }]);
        },
      },
      {
        pos: () => d.cruz,
        raio: 2.6,
        rotulo: 'F: contemplar a cruz',
        agir: () => {
          if (this.primeiraVez('deserto_cruz'))
            this.hud.falar([{ quem: 'espirito', texto: 'Também aqui, junto à cruz, a oração tem o dobro de força.' }]);
          else this.hud.falar([{ quem: 'Inscrição', texto: '"Não só de pão vive o homem, mas de toda palavra que sai da boca de Deus." (Mt 4,4)' }]);
        },
      },
      {
        pos: () => d.antao.pos,
        raio: 2.8,
        rotulo: 'F: falar com Santo Antão',
        agir: () => this.falarComAntao(),
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
            if (this.primeiraVez('meiodia_entrou'))
              this.hud.falar([
                { quem: 'Placa', texto: 'Poço do Meio-Dia. "Não temerás… o mal que devasta ao meio-dia." (Sl 91,6)' },
                { quem: 'espirito', texto: 'O sol está a pino. Lá na frente, onde a praça se abre, ele espera.' },
              ]);
          }),
      },
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
            this.hud.falar([{ quem: 'espirito', texto: 'Seco. Faz muito tempo que ninguém tira água daqui.' }]);
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
        agir: () =>
          this.hud.falar([
            { quem: 'Inscrição', texto: '"Ensina-nos a contar os nossos dias, para que alcancemos um coração sábio." (Sl 90,12)' },
          ]),
      },
    ];
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

  // ───────────────────────────── cripta ─────────────────────────────

  private braseiroAceso(n: number) {
    this.som.fogo();
    this.hud.anunciar(`${n} de 3 braseiros acesos`, 1.6);
    if (this.primeiraVez('cripta_dica_chama'))
      this.hud.falar([{ quem: 'espirito', texto: 'A chama não dura muito sozinha. Acenda os três braseiros antes que ela se apague.' }]);
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
    if (this.primeiraVez('cripta_dica_guardiao'))
      this.hud.falar([
        { quem: 'Mamom', texto: 'A lamparina é MINHA. Tudo o que desce até aqui fica comigo.' },
        { quem: 'espirito', texto: 'É Mamom, o espírito da avareza. "Ninguém pode servir a dois senhores." Ele guarda a luz como se fosse ouro.' },
        { quem: 'espirito', texto: 'Uma couraça de trevas o protege: o cajado não a atravessa. Trave a mira e lance a luz para atordoá-lo, e então golpeie.' },
        { quem: 'espirito', texto: 'Cuidado com as correntes douradas: elas roubam a sua energia. Se ela acabar, reze, mas longe dele.' },
      ]);
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
    setTimeout(
      () =>
        this.hud.falar([
          { quem: 'espirito', texto: 'Esta lamparina guiou os primeiros peregrinos pela noite. Nenhuma treva consegue apagá-la.' },
          { quem: 'espirito', texto: 'Aperte L para acendê-la ou guardá-la.' },
          { quem: 'espirito', texto: 'A oeste do Vale, uma névoa de trevas fecha a passagem pelas montanhas. Leve esta luz até lá.' },
        ]),
      1200,
    );
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
    const dt = Math.min(0.05, bruto);
    const e = this.entrada;
    // pausa: Esc ou P, ou o ponteiro solto pelo Esc do navegador
    if (this.comecou && !this.modoCriacao && !this.transitando && !this.morrendo) {
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
      if (borda && !this.travado) this.camera.girar(borda * 520 * dt * this.prefs.sensibilidade, 0);
      // Temor de Deus 3 (Pequenez): as sombras comuns custam mais a notar o peregrino
      Sombra.percepcao = this.estado.nivel('temor') >= 3 ? 0.7 : 1;
      this.atualizar(dt);
      this.atualizarTorpor(dt);
      this.atualizarMinimapa();
    }
    else if (!this.modoCriacao) this.camera.girar(dt * 40, 0);
    const alvoCam = this.travado ? this.travado.centro() : null;
    this.camera.atualizar(dt, this.peregrino.pos, alvoCam, (x, z) => this.area.altura(x, z));
    if (this.modoCriacao) this.quadroCriacao(dt);
    this.hud.posicionarMira(this.travado ? this.travado.centro().add(new THREE.Vector3(0, 0.9, 0)) : null, this.camera.cam);
    this.hud.atualizar(dt, this.estado, this.corAtual(), this.area === this.deserto || this.area === this.meiodia ? 'Cor do Deserto' : 'Cor do Vale');

    // sol acompanha o peregrino para a sombra ficar nítida por perto
    const p = this.peregrino.pos;
    this.sol.position.set(p.x + 30, p.y + 45, p.z - 40);
    this.sol.target.position.copy(p);
    this.mundo.luzFogueira.intensity = 7 + Math.sin(performance.now() * 0.013) * 1.2 + Math.sin(performance.now() * 0.031) * 0.8;
    this.flashLuz.intensity = Math.max(0, this.flashLuz.intensity - dt * 40);

    this.ceu.position.copy(this.camera.cam.position); // o céu acompanha a câmera (o deserto fica longe da origem)
    // o torpor tira a cor do mundo
    const peso = Math.min(1, this.torpor / 2);
    this.efeitos.renderizar(dt, this.modoCriacao ? 1 : this.corAtual() * (1 - peso * 0.8));
    this.entrada.fimDoQuadro();
  }

  /** Câmera de retrato: o peregrino fica de frente, à direita do painel (ou acima dele, em tela estreita). */
  private quadroCriacao(dt: number) {
    const per = this.peregrino;
    this.rumoCriacao -= this.entrada.mouseDx * 0.01;
    if (!this.entrada.segurando('Mouse0')) this.rumoCriacao += dt * 0.25;
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

    if (e.travado || e.mouseDx || e.mouseDy) {
      const k = this.prefs.sensibilidade;
      this.camera.girar(this.travado ? 0 : e.mouseDx * k, e.mouseDy * k);
    }

    if (dialogo && e.apertou('KeyF', 'Enter', 'Space', 'Mouse0')) this.hud.avancar();

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
    const correndo = e.segurando('ShiftLeft', 'ShiftRight') && !this.travado;
    const velocidade = (this.travado ? 3.8 : correndo ? 7.2 : 4.4) * per.fatorVelocidade * (this.torpor > 0 ? 0.5 : 1);

    const livre = !parado && per.acao === 'livre';
    if (livre && e.apertou('Mouse0', 'KeyJ')) {
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
      if (!e.segurando('KeyR') || desejo.lengthSq() > 0.01 || dialogo) per.acao = 'livre';
      else this.rezar(dt);
    }

    if (e.apertou('KeyF') && !parado && per.acao === 'livre') this.interacaoPerto()?.agir();

    const pular = !parado && e.apertou('Space') && per.acao === 'livre';
    if (pular && per.noChao) this.som.pulo();
    per.atualizar(dt, this.area, desejo, velocidade, pular, this.travado ? this.travado.pos : null);
    if (!parado) this.atualizarPuxao(dt);

    if (per.velocidadeHoriz > 0.5 && per.noChao) {
      this.somPasso -= dt * per.velocidadeHoriz;
      if (this.somPasso <= 0) {
        this.somPasso = 1.7;
        this.som.passo();
      }
    }

    // golpe acerta um pouco depois de começar
    if (this.golpePendente > 0) {
      this.golpePendente -= dt;
      if (this.golpePendente <= 0) this.resolverGolpe();
    }
    this.avisoCouraca = Math.max(0, this.avisoCouraca - dt);

    this.atualizarProjeteis(dt);
    this.area.atualizar?.(dt, per.pos);

    const chefe = this.chefeDaArea();
    chefe?.sentir({ pos: per.pos, noChao: per.noChao, esquivando: per.acao === 'esquiva', invulneravel: per.invulneravel > 0 });
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
      for (const o of this.mundo.ovelhas) o.atualizar(dt, this.mundo, per.pos);
      this.verificarVeu();
    }
    this.pomba.atualizar(dt, per.pos, per.rumo);
    this.atualizarColuna(dt);

    // dica de interação
    const i = !parado && per.acao === 'livre' ? this.interacaoPerto() : null;
    if (i) this.hud.mostrarDica(typeof i.rotulo === 'function' ? i.rotulo() : i.rotulo);
    else if (per.acao === 'rezando') this.hud.mostrarDica(this.oracaoDobrada() ? 'Rezando (junto à cruz: força em dobro)…' : 'Rezando…');
    else if (!dialogo && this.estado.energia < 10) this.hud.mostrarDica('Pouca energia: pare e segure R para rezar');
    else this.hud.mostrarDica(null);
  }

  private pausar() {
    this.pausado = true;
    document.exitPointerLock?.();
    const nomes: Record<IdArea, string> = { vale: 'O Vale', cripta: 'A Cripta', deserto: 'Deserto das Vozes', meiodia: 'Poço do Meio-Dia' };
    const min = Math.floor(this.estado.tempo / 60);
    const tempo = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    const id = this.estado.identidade ?? identidadePadrao();
    this.pausa.abrir(`${id.nome} · ${nomes[this.area.id]} · ${this.estado.gracas} ${this.estado.gracas === 1 ? 'graça' : 'graças'} · ${tempo}`);
  }

  /** A árvore dos dons (G): pausa o jogo enquanto está aberta. */
  private abrirDons() {
    this.pausado = true;
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
    this.hud.mostrarChefe(null);
    this.atualizarCiencia(0);
    this.som.ambienteDe(null);
    document.getElementById('hud')!.style.visibility = 'hidden';
    this.voltarAoTitulo();
  }

  /** Torpor: pesa, gasta energia e se desfaz sozinho bem devagar (rezando, depressa). */
  private atualizarTorpor(dt: number) {
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
      const nomes: Record<IdArea, string> = { vale: 'O Vale', cripta: 'A Cripta', deserto: 'Deserto das Vozes', meiodia: 'Poço do Meio-Dia' };
      this.minimapa.definirArea(a.id, nomes[a.id], a.fonteMapa());
    }
    const marcas: Marca[] = [];
    for (const i of this.interacoes[a.id]) {
      if (i.ativa && !i.ativa()) continue;
      const rot = typeof i.rotulo === 'function' ? i.rotulo() : i.rotulo;
      if (rot.includes('ovelha')) continue;
      const tipo = /descansar|ajoelhar|beber/.test(rot) ? 'descanso' : /falar/.test(rot) ? 'pessoa' : /voltar|seguir|descer|subir/.test(rot) ? 'saida' : 'lugar';
      const p = i.pos();
      marcas.push({ x: p.x, z: p.z, tipo });
    }
    for (const s of a.sombras) if (s.ativa && !s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: s.id === 'cripta_guardiao' || s.id === 'meiodia_acedia' ? 'chefe' : 'sombra' });
    for (const s of a.sombras) if (s.ativa && s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: 'chefe' });
    const p = this.peregrino.pos;
    this.minimapa.desenhar(p.x, p.z, this.camera.guinada, this.peregrino.rumo, marcas);
  }

  private lutaMeioDiaComecou() {
    this.som.tensao();
    this.hud.anunciar('Acídia, o Demônio do Meio-Dia', 3);
    if (this.primeiraVez('meiodia_dica'))
      this.hud.falar([
        { quem: 'Acídia', texto: 'Tão quente… Para que andar tanto? Sente-se. Amanhã você continua. Ou depois.' },
        { quem: 'espirito', texto: 'É o demônio do meio-dia, a acídia: o cansaço da alma que faz tudo parecer sem sentido.' },
        { quem: 'espirito', texto: 'Ele se esconde em miragens iguais a ele. Nada o fere enquanto estiver escondido: use a Ciência (E) para ver qual é o verdadeiro.' },
        { quem: 'espirito', texto: 'Se o torpor dele te alcançar, não desista: segure R e reze. A oração levanta o caído.' },
      ]);
  }

  private acediaVencida() {
    this.efeitos.ouro = 1.4;
    this.som.graca();
    setTimeout(() => this.som.item(), 600);
    this.tempoColuna = 0;
    this.hud.anunciar('✦ A acídia se desfez ao sol', 3);
    this.hud.falar([
      { quem: 'espirito', texto: 'Você continuou. Era só isso que ele não queria: que você continuasse.' },
      { quem: 'espirito', texto: 'Olhe o poço: a água voltou. "Quem crê em mim, do seu interior correrão rios de água viva." (Jo 7,38)' },
      { quem: 'espirito', texto: 'Volte a Santo Antão quando quiser. O Deserto das Vozes está vencido; a estrada para o Céu continua além dele.' },
    ]);
  }

  /** O chefão da área atual (se houver). */
  private chefeDaArea(): Chefe | null {
    if (this.area === this.cripta) return this.cripta.guardiao;
    if (this.area === this.meiodia) return this.meiodia.acedia;
    return null;
  }

  private atualizarBarraChefe() {
    const c = this.area === this.cripta ? this.cripta.guardiao : null;
    const a = this.area === this.meiodia ? this.meiodia.acedia : null;
    if (c && this.cripta.lutando && c.ativa)
      return this.hud.mostrarChefe('MAMOM · GUARDIÃO DA AVAREZA', c.vida / c.vidaMax, c.estado !== 'atordoada', c.alerta);
    if (a && this.meiodia.lutando && a.ativa)
      return this.hud.mostrarChefe('ACÍDIA · O DEMÔNIO DO MEIO-DIA', a.vida / a.vidaMax, !a.revelado, a.alerta);
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
    this.hud.falar([{ quem: 'espirito', texto: 'A névoa se desfez diante da luz. O caminho a oeste está aberto.' }]);
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
          if (r === 'morreu') this.sombraVencida(s);
        }
      }
    }
  }

  private lancarLuz() {
    const per = this.peregrino;
    per.iniciar('luz');
    this.estado.energia -= 10;
    this.som.luz();
    const origem = per.pontaDoCajado();
    const malha = new THREE.Mesh(this.geoLuz, this.matLuz);
    malha.position.copy(origem);
    const destino = this.travado ? this.travado.centro() : per.pos.clone().add(per.frente().multiplyScalar(14)).setY(origem.y);
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
    if (guardiao || s.id === 'meiodia_acedia') {
      // cada chefão vencido dá um coração a mais, e o peregrino sai da luta curado
      this.estado.coracoes = this.estado.coracoesMax;
      setTimeout(() => this.hud.anunciar('❤️ Mais um coração!', 2.6), 3400);
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
        this.hud.falar([
          { quem: 'espirito', texto: 'A avareza se desfez. O que ele prendia não era dele: a luz não se guarda, se partilha.' },
          { quem: 'espirito', texto: 'O relicário a oeste da arena está aberto.' },
        ]);
      }
      if (this.estado.cor >= 0.999 && this.primeiraVez('vale_restaurado')) {
        this.hud.falar([
          { quem: 'espirito', texto: 'Veja: o Vale recuperou suas cores! A luz venceu as sombras.' },
          { quem: 'espirito', texto: 'Agora suba a estrada até a capela no alto do monte.' },
        ] as Fala[]);
      }
      if (s.id.startsWith('deserto_') && this.sombrasDoDesertoVencidas() >= TOTAL_SOMBRAS_DESERTO && this.primeiraVez('deserto_restaurado'))
        this.hud.falar([
          { quem: 'espirito', texto: 'O deserto também tem cor! Nenhuma voz falsa sobrou entre as dunas.' },
          { quem: 'espirito', texto: 'Agora só resta o que mora depois da fenda.' },
        ] as Fala[]);
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
    if (this.area === this.deserto) return p.distanceTo(this.deserto.cruz) < 4 || p.distanceTo(this.deserto.antao.pos) < 5;
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
    if (per.invulneravel > 0 || this.morrendo) return;
    this.estado.coracoes = Math.max(0, this.estado.coracoes - dano);
    per.invulneravel = 1.2;
    per.iniciar('ferido');
    this.efeitos.dano = 1;
    this.som.dano();
    if (this.estado.coracoes <= 0) return this.morrer();
    if (semEmpurrao) return;
    const empurra = per.pos.clone().sub(de).setY(0).normalize().multiplyScalar(1.2);
    const antes = per.pos.clone();
    per.pos.add(empurra);
    // não empurra para dentro de parede
    if (this.area.altura(per.pos.x, per.pos.z) > antes.y + 1.05) per.pos.copy(antes);
  }

  private morrer() {
    this.morrendo = true;
    this.puxao = null;
    this.travado = null;
    this.hud.escurecer(true);
    setTimeout(() => {
      this.cripta.reiniciarLuta();
      this.meiodia.reiniciarLuta();
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
      this.estado.restaurar();
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
}
