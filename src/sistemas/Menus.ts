import { travarPonteiro } from '../core/Entrada';
import { REGIOES } from '../historia/Regioes';
import { identidadePadrao } from '../core/Aparencia';
import { Pausa } from '../ui/Pausa';
import { TelaDons } from '../ui/Dons';
import { Configuracoes } from '../ui/Configuracoes';
import { NavegacaoControle } from '../ui/NavegacaoControle';
import { trocarRotulosDaTela } from '../ui/Rotulos';
import type { Contexto, AcoesDoJogo } from '../jogo/Contexto';
import { Parte } from './Sistema';

/** As telas por cima do jogo: a pausa, as Configurações, a árvore dos dons e o mapa-múndi (e o controle nelas). */
export class SistemaMenus extends Parte {
  /** Configurações: abertas pela tela inicial (Menu) e pela pausa. */
  readonly config = new Configuracoes(this.ctx.prefs, {
    graficos: () => this.acoes.graficos(),
    qps: () => this.ctx.qps,
    fechou: () => {
      if (this.pausa.aberta) this.pausa.focar();
    },
  });
  pausa = new Pausa({
    continuar: () => this.retomar(),
    sair: () => this.acoes.sair(),
    dons: () => this.abrirDons(),
    mapa: () => this.abrirMapa(),
    config: () => this.config.abrir(),
  });
  telaDons = new TelaDons(this.ctx.estado, {
    fechar: () => this.fecharDons(),
    // a própria rosácea mostra o nó acendendo; aqui só o som da graça
    fortaleceu: () => this.ctx.som.graca(),
  });
  pausado = false;
  navUi = new NavegacaoControle();
  quadrosMenu = 0;

  constructor(ctx: Contexto, private readonly acoes: AcoesDoJogo) {
    super(ctx);
  }

  /**
   * O começo de cada quadro: o controle navega pelos menus abertos, e as teclas abrem e fecham a pausa, os dons e o
   * mapa. Devolve true se o jogo está pausado (o quadro já foi desenhado e não há mais nada a fazer).
   */
  quadro(bruto: number): boolean {
    const dev = this.ctx.dev;
    const e = this.ctx.entrada;
    // controle: nos menus ele navega pelos botões; no jogo vira as mesmas teclas do teclado
    const menu = !this.ctx.comecou || this.pausado || this.telaDons.aberta || this.ctx.modoCriacao || this.config.aberta || !!this.ctx.viagem.mapaDoMundo?.aberta;
    e.lerControle(menu);
    if (menu) {
      this.navUi.atualizar(e.controle, Math.min(0.05, bruto));
      if ((this.quadrosMenu = (this.quadrosMenu + 1) % 30) === 0) trocarRotulosDaTela(e.dispositivo === 'controle', e.controle.familia);
    } else this.navUi.soltar();
    // pausa: Esc ou P, ou o ponteiro solto pelo Esc do navegador
    if (this.ctx.comecou && !this.ctx.modoCriacao && !this.ctx.transitando && !this.ctx.morrendo && !dev?.painelAberto) {
      if (this.telaDons.aberta) {
        if (e.apertou('Escape', 'KeyG')) this.fecharDons();
      } else if (this.ctx.viagem.mapaDoMundo?.aberta) {
        if (e.apertou('Escape', 'KeyM')) this.fecharMapa();
      } else if (this.pausado && e.apertou('Escape', 'KeyP')) this.retomar();
      else if (!this.pausado && !this.ctx.hud.dialogoAberto && e.apertou('KeyG')) this.abrirDons();
      else if (!this.pausado && !this.ctx.hud.dialogoAberto && e.apertou('KeyM')) this.abrirMapa();
      else if (!this.pausado && (e.apertou('Escape', 'KeyP') || e.soltouPonteiro)) this.pausar();
    }
    e.soltouPonteiro = false;
    e.seguirMouse = this.ctx.comecou && !this.pausado && !this.ctx.modoCriacao;
    // a imagem do mapa-múndi vai sendo pintada aos poucos desde o começo (pronta quando ele for aberto)
    if (this.ctx.comecou && !this.ctx.viagem.mapaMundi.pronto) this.ctx.viagem.mapaMundi.trabalhar(2);
    if (this.pausado) {
      this.ctx.viagem.mapaDoMundo?.atualizar();
      this.ctx.efeitos.renderizar(0, this.ctx.ambiente.corAtual());
      e.fimDoQuadro();
      return true;
    }
    return false;
  }

  pausar() {
    this.pausado = true;
    this.ctx.hud.mostrarRetic(this.ctx.prefs.mira, null, 0);
    document.exitPointerLock?.();
    const min = Math.floor(this.ctx.estado.tempo / 60);
    const tempo = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    const id = this.ctx.estado.identidade ?? identidadePadrao();
    this.pausa.abrir(`${id.nome} · ${REGIOES[this.ctx.area.id].nome} · ${this.ctx.estado.gracas} ${this.ctx.estado.gracas === 1 ? 'graça' : 'graças'} · ${tempo}`);
  }

  /** A árvore dos dons (G): pausa o jogo enquanto está aberta. */
  abrirDons() {
    this.pausado = true;
    this.ctx.hud.mostrarRetic(this.ctx.prefs.mira, null, 0);
    document.exitPointerLock?.();
    this.pausa.fechar();
    this.telaDons.abrir();
  }

  fecharDons() {
    this.telaDons.fechar();
    this.retomar();
  }

  /** O mapa-múndi (M, ou pela pausa): pausa o jogo enquanto está aberto; dele sai a viagem rápida. */
  abrirMapa() {
    this.pausado = true;
    this.ctx.hud.mostrarRetic(this.ctx.prefs.mira, null, 0);
    document.exitPointerLock?.();
    this.pausa.fechar();
    this.ctx.viagem.mapaMundi.abrir();
  }

  fecharMapa() {
    this.ctx.viagem.mapaDoMundo?.fechar();
    this.retomar();
  }

  retomar() {
    this.pausado = false;
    this.pausa.fechar();
    this.ctx.relogio.getDelta(); // o tempo parado não conta
    travarPonteiro(this.ctx.renderer.domElement);
  }
}
