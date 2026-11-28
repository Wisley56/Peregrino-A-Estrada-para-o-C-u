import * as THREE from 'three';
import { CameraTerceira } from './core/Camera';
import { Entrada, travarPonteiro } from './core/Entrada';
import { visualDe } from './core/Aparencia';
import { iniciarRetratos } from './dialogo/Retratos';
import { Criacao } from './ui/Criacao';
import { rotularTeclas, trocarRotulosDaTela } from './ui/Rotulos';
import type { OpcoesDev } from './dev/tipos';
import { Contexto } from './jogo/Contexto';

/**
 * O orquestrador: cria o renderizador e o `Contexto` (os serviços, as áreas, os sistemas e a história de cada região),
 * liga a tela e o controle, e a cada quadro roda os sistemas numa ordem explícita. Não conhece nenhuma região: quem
 * sabe de cada uma é o módulo dela (`src/regioes/<id>/historia.ts`).
 */
export class Jogo {
  readonly ctx: Contexto;
  /** O que anda a cada quadro de jogo, na ordem (o peregrino primeiro; o minimapa por último). */
  private readonly ordem: ((dt: number) => void)[];

  constructor(recipiente: HTMLElement) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    recipiente.appendChild(renderer.domElement);
    iniciarRetratos(renderer);

    const camera = new CameraTerceira(innerWidth / innerHeight);
    const ent = new Entrada(renderer.domElement);
    const ctx = (this.ctx = new Contexto(renderer, camera, ent, { graficos: () => this.aplicarGraficos(), sair: () => this.sairParaTitulo() }));
    ctx.hud.rotular = (t) => (ent.dispositivo === 'controle' ? rotularTeclas(t, ent.controle.familia) : t);
    ctx.hud.aoExibir = (p, segundos) => ctx.conversa.aoFalar(p, segundos);
    ctx.hud.aoEscolher = () => ctx.conversa.aoEscolhasDaConversa();
    ctx.menus.config.ligarControle(ent.controle);
    ent.aoTrocarDispositivo = () => {
      ctx.menus.config.desenharControle();
      trocarRotulosDaTela(ent.dispositivo === 'controle', ent.controle.familia);
    };
    this.aplicarGraficos();

    const { controle, combate, regioes, fauna, graca, interacoes, oracao, mapas, modulos, pomba, peregrino } = ctx;
    this.ordem = [
      (dt) => controle.atualizar(dt),
      (dt) => combate.atualizarArmas(dt),
      (dt) => modulos.forEach((m) => m.atualizarAntes?.(dt)),
      (dt) => regioes.atualizar(dt),
      (dt) => combate.atualizarInimigos(dt),
      (dt) => modulos.forEach((m) => m.atualizarDepois?.(dt)),
      (dt) => fauna.atualizar(dt),
      (dt) => pomba.atualizar(dt, peregrino.pos, peregrino.rumo),
      (dt) => graca.atualizarColuna(dt),
      () => interacoes.atualizar(),
      (dt) => oracao.atualizarTorpor(dt),
      () => mapas.atualizarMinimapa(),
    ];

    addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight);
      ctx.efeitos.tamanho(innerWidth, innerHeight);
      camera.cam.aspect = innerWidth / innerHeight;
      camera.cam.updateProjectionMatrix();
    });
  }

  get estado() {
    return this.ctx.estado;
  }

  get area() {
    return this.ctx.area;
  }

  get dev() {
    return this.ctx.dev;
  }

  set dev(op: OpcoesDev | null) {
    this.ctx.dev = op;
  }

  get config() {
    return this.ctx.menus.config;
  }

  get terrenoMundo() {
    return this.ctx.terrenoMundo;
  }

  get ermo() {
    return this.ctx.ermo;
  }

  lugarDoPonto(id: string) {
    return this.ctx.viagem.lugarDoPonto(id);
  }

  viajarPara(id: string, o: { forcar?: boolean; anuncio?: string } = {}) {
    return this.ctx.viagem.viajarPara(id, o);
  }

  motivoParaNaoViajar() {
    return this.ctx.viagem.motivoParaNaoViajar();
  }

  /** Aplica a tela de Gráficos: resolução, sombras e a cadeia de pós-processamento. */
  aplicarGraficos() {
    const g = this.ctx.prefs.graficos;
    this.ctx.renderer.setPixelRatio(g.resolucao);
    this.ctx.renderer.setSize(innerWidth, innerHeight);
    const ligadas = g.sombras !== 'desligadas';
    const tipo = g.sombras === 'simples' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    const lado = g.sombras === 'detalhadas' ? 4096 : g.sombras === 'simples' ? 1024 : 2048;
    const sm = this.ctx.renderer.shadowMap;
    const mudou = sm.enabled !== ligadas || sm.type !== tipo;
    sm.enabled = ligadas;
    sm.type = tipo;
    if (this.ctx.ambiente.sol.shadow.mapSize.x !== lado) {
      this.ctx.ambiente.sol.shadow.mapSize.set(lado, lado);
      this.ctx.ambiente.sol.shadow.map?.dispose();
      this.ctx.ambiente.sol.shadow.map = null;
    }
    // ligar/desligar ou trocar o tipo de sombra pede recompilar os materiais
    if (mudou)
      this.ctx.cena.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
      });
    this.ctx.efeitos.configurar(g);
  }

  /** Carrega o mundo "limpo" (fundo da tela inicial). O progresso entra depois, em `iniciarSlot`. */
  async carregar() {
    const ctx = this.ctx;
    await Promise.all(ctx.modulos.map((m) => m.carregar?.()));
    await ctx.fauna.povoarFauna();
    ctx.estado.checkpoint = ctx.mundo.inicio.toArray() as [number, number, number];
    ctx.regioes.posicionarNoCheckpoint();
    ctx.renderer.setAnimationLoop(() => this.quadro());
  }

  /**
   * Abre um espaço de jogo: com save, continua de onde parou; vazio, começa um jogo novo
   * (passando pela criação do personagem).
   */
  iniciarSlot(slot: number) {
    this.ctx.agenda.limpar();
    const temSave = this.ctx.estado.carregarSlot(slot);
    this.ctx.mapas.minimapa.esquecer('deserto');
    this.ctx.mapas.areaNoMapa = '';
    this.reconstruirMundo();
    if (!temSave) this.ctx.estado.checkpoint = this.ctx.mundo.inicio.toArray() as [number, number, number];
    this.ctx.regioes.posicionarNoCheckpoint();
    if (this.ctx.estado.identidade === null) this.abrirCriacao();
    else this.comecar();
  }

  /** Recria o que depende do progresso (sombras, véu, arenas, NPCs, a cripta) a partir do estado atual. */
  reconstruirMundo() {
    const ctx = this.ctx;
    for (const m of ctx.modulos) m.reiniciar?.();
    ctx.nasCostas = null;
    ctx.peregrino.carregar(null);
    // as interações guardam as áreas de agora (a cripta acabou de ser refeita)
    ctx.interacoes.criarInteracoes();
  }

  /** Mostra a criação do personagem; ao confirmar, salva e começa o jogo. */
  abrirCriacao() {
    this.ctx.som.ligar();
    this.ctx.modoCriacao = true;
    this.ctx.cameras.rumoCriacao = Math.PI; // de frente para a câmera
    this.ctx.entrada.permitirTrava = false;
    document.getElementById('hud')!.style.visibility = 'hidden';
    this.ctx.hud.escurecer(false);
    new Criacao(
      this.ctx.estado.identidade,
      (id, idade) => this.ctx.peregrino.vestir(visualDe(id, idade)),
      (id) => {
        this.ctx.estado.identidade = id;
        this.ctx.estado.salvar();
        this.ctx.regioes.vestirPeregrino();
        this.ctx.modoCriacao = false;
        this.ctx.entrada.permitirTrava = true;
        document.getElementById('hud')!.style.visibility = 'visible';
        this.ctx.peregrino.rumo = Math.PI;
        this.ctx.camera.guinada = 0;
        this.comecar();
      },
      () => this.voltarAoTitulo(),
    );
  }

  /** Chamado ao voltar da criação: a tela inicial reaparece. Definido em main.ts. */
  aoVoltarAoTitulo: () => void = () => {};

  /** Desfaz a abertura do espaço (nada foi salvo) e devolve o mundo limpo para o fundo da tela inicial. */
  voltarAoTitulo() {
    this.ctx.modoCriacao = false;
    this.ctx.entrada.permitirTrava = true;
    this.ctx.estado.zerar();
    this.ctx.estado.slot = null;
    this.reconstruirMundo();
    this.ctx.estado.checkpoint = this.ctx.mundo.inicio.toArray() as [number, number, number];
    this.ctx.regioes.posicionarNoCheckpoint();
    this.aoVoltarAoTitulo();
  }

  comecar() {
    this.ctx.som.ligar();
    this.ctx.comecou = true;
    document.getElementById('hud')!.style.visibility = 'visible';
    this.ctx.som.ambienteDe(this.ctx.ambiente.tipoAmbiente());
    this.ctx.hud.escurecer(false);
    travarPonteiro(this.ctx.renderer.domElement);
    if (!this.ctx.estado.flags.has('intro')) this.ctx.dialogos.tocar('vale_intro');
  }

  /** Salva (o checkpoint já está no save) e volta à tela inicial. */
  private sairParaTitulo() {
    const ctx = this.ctx;
    ctx.estado.salvar();
    ctx.agenda.limpar();
    ctx.eventos.emitir('voltouAoTitulo', {});
    ctx.menus.pausado = false;
    ctx.menus.pausa.fechar();
    ctx.menus.telaDons.fechar();
    ctx.viagem.mapaDoMundo?.fechar();
    ctx.comecou = false;
    ctx.hud.encerrar();
    ctx.dialogos.encerrar();
    ctx.hud.mostrarChefe(null);
    for (const s of ctx.sistemas) s.aoVoltarAoTitulo?.();
    ctx.som.ambienteDe(null);
    document.getElementById('hud')!.style.visibility = 'hidden';
    this.voltarAoTitulo();
  }

  /** Um quadro: o tempo, os menus e a pausa, as cenas da agenda, o jogo (se começou), as câmeras e o desenho. */
  private quadro() {
    const ctx = this.ctx;
    const bruto = this.ctx.relogio.getDelta();
    if (bruto > 0) this.ctx.qps += (1 / bruto - this.ctx.qps) * 0.05;
    let dt = Math.min(0.05, bruto);
    const dev = this.ctx.dev;
    if (dev) {
      // modo dev: câmera lenta, tempo congelado e avanço de um quadro por vez
      dt *= dev.escalaTempo;
      if (dev.escalaTempo === 0 && dev.passos > 0) {
        dt = 1 / 60;
        dev.passos--;
      }
    }
    if (ctx.menus.quadro(bruto)) return;
    ctx.agenda.atualizar(dt);
    if (ctx.comecou) this.atualizar(dt);
    else if (!ctx.modoCriacao) ctx.camera.girar(dt * 40, 0);
    ctx.cameras.atualizar(dt);
    ctx.entrada.fimDoQuadro();
  }

  /** Um quadro de jogo: cada sistema na ordem. */
  private atualizar(dt: number) {
    for (const f of this.ordem) f(dt);
  }
}
