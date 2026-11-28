import * as THREE from 'three';
import { PassoFixo } from '../core/PassoFixo';
import { enfermo } from '../entidades/Enfermos';
import { Sombra } from '../entidades/Sombra';
import { AJUSTES } from '../config/ajustes';
import { type Sistema, Parte } from './Sistema';

/** O controle do peregrino: a câmera pelo mouse e pelo controle, o movimento, o pulo, os ataques, a oração e o F. */
export class SistemaControle extends Parte implements Sistema {
  /** A física do peregrino anda em passos fixos de 1/60 s (o resto do jogo segue o quadro): ver `PassoFixo`. */
  fisicaFixa = new PassoFixo();
  /** O pulo pedido num quadro em que a física não deu passo espera o passo seguinte, para não se perder. */
  puloPendente = false;
  somPasso = 0;
  /** Debaixo da verga da porta estreita do jardim (de joelhos à força), neste quadro. */
  sobVerga = false;

  /** O primeiro passo de cada quadro de jogo: lê a entrada e move o peregrino (ou o barco). */
  atualizar(dt: number) {
    const e = this.ctx.entrada;
    const borda = e.giroDeBorda();
    if (borda && !this.ctx.combate.travado && !this.ctx.conversa.cameraConversa.emUso) this.ctx.camera.girar(borda * 520 * dt * this.ctx.prefs.sensibilidade, 0);
    // Temor de Deus 3 (Pequenez): as sombras comuns custam mais a notar o peregrino
    // Piedade 4 (Carregar o fardo): diante de quem carrega um sofredor, as sombras comuns hesitam
    Sombra.percepcao = (this.ctx.estado.nivel('temor') >= 3 ? 0.7 : 1) * (this.ctx.nasCostas && this.ctx.estado.nivel('piedade') >= 4 ? 0.5 : 1);
    const per = this.ctx.peregrino;
    const dialogo = this.ctx.hud.dialogoAberto;
    const parado = dialogo || this.ctx.morrendo || this.ctx.transitando;
    this.ctx.parado = parado;
    this.ctx.emDialogo = dialogo;
    this.ctx.estado.tempo += dt;
    if (this.ctx.dev?.energiaInfinita) this.ctx.estado.energia = this.ctx.estado.energiaMax;

    if ((e.travado || e.mouseDx || e.mouseDy) && !this.ctx.conversa.cameraConversa.emUso) {
      const k = this.ctx.prefs.sensibilidade;
      this.ctx.camera.girar(this.ctx.combate.travado ? 0 : e.mouseDx * k, e.mouseDy * k);
    }
    if ((e.camX || e.camY) && !this.ctx.conversa.cameraConversa.emUso) {
      const [gx, gy] = e.giroControle(dt, this.ctx.prefs.sensibilidadeControle, this.ctx.prefs.inverterY);
      this.ctx.camera.girar(this.ctx.combate.travado ? 0 : gx, gy);
    }

    if (dialogo) {
      if (this.ctx.hud.escolhendo) {
        if (e.apertou('ArrowUp', 'KeyW', 'PadCima')) this.ctx.hud.moverEscolha(-1);
        if (e.apertou('ArrowDown', 'KeyS', 'PadBaixo')) this.ctx.hud.moverEscolha(1);
        for (let i = 0; i < 9; i++) if (e.apertou(`Digit${i + 1}`, `Numpad${i + 1}`)) this.ctx.hud.escolher(i);
      }
      if (e.apertou('KeyF', 'Enter', 'Space', 'Mouse0')) this.ctx.hud.avancar();
    }

    // mira travada
    if (!parado && e.apertou('KeyQ', 'Mouse1', 'Tab')) {
      this.ctx.combate.travado = this.ctx.combate.travado ? null : this.ctx.combate.alvoMaisProximo();
      if (!this.ctx.combate.travado) this.ctx.hud.anunciar('Nada para mirar por perto', 1.2);
    }
    if (this.ctx.combate.travado && (!this.ctx.combate.travado.ativa || this.ctx.combate.travado.pos.distanceTo(per.pos) > 24)) this.ctx.combate.travado = null;

    // lamparina
    if (!parado && e.apertou('KeyE')) this.ctx.dons.usarCiencia();
    this.ctx.dons.atualizarCiencia(dt);
    if (!parado && e.apertou('KeyL') && this.ctx.estado.flags.has('lamparina')) {
      this.ctx.dons.lamparinaAcesa = !this.ctx.dons.lamparinaAcesa;
      this.ctx.dons.atualizarLamparina();
    }

    // direção desejada
    const [ix, iy] = parado || this.ctx.combate.puxao ? [0, 0] : e.eixo();
    const desejo = this.ctx.camera.frente().multiplyScalar(iy).add(this.ctx.camera.direita().multiplyScalar(ix));
    if (desejo.lengthSq() > 1) desejo.normalize();
    // de joelhos (Z segurado): fazer-se pequeno. Debaixo da verga da porta estreita ninguém se levanta.
    const sobVerga = this.ctx.area === this.ctx.mundo && this.ctx.mundo.jardim.tetoBaixo(per.pos.x, per.pos.z);
    per.ajoelhado = sobVerga || (!parado && per.noChao && !per.carregando && e.segurando('KeyZ'));
    this.ctx.mundo.pequeno = per.ajoelhado;
    const correndo = e.segurando('ShiftLeft', 'ShiftRight') && !this.ctx.combate.travado && !per.ajoelhado;
    // o ouro da Gula e a pedra no ombro pesam: mais devagar e com menos pulo
    const carga = this.pesoEfetivo();
    const P = AJUSTES.peregrino;
    const velocidade = (per.ajoelhado ? P.ajoelhado : this.ctx.combate.travado ? P.mirando : correndo ? P.correr : P.andar) * per.fatorVelocidade * (this.ctx.oracao.torpor > 0 ? 0.5 : 1) * (this.ctx.oracao.indiferenca > 0 ? 0.55 : 1) * Math.max(0.45, 1 - carga * 0.1) * (this.ctx.dev?.velocidade ?? 1);
    per.forcaPulo = per.carregando ? 0 : Math.max(0.55, 1 - carga * 0.12);

    const aBordo = this.ctx.barco.aBordo;
    const livre = !parado && per.acao === 'livre' && !aBordo;
    if (aBordo && !parado && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK', 'KeyC', 'KeyR')) {
      this.ctx.hud.anunciar('A bordo, as mãos estão no leme e na vela. Desembarque (F) para lutar ou rezar.', 1.8);
    } else if (livre && per.ajoelhado && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK', 'KeyC')) {
      this.ctx.hud.anunciar('De joelhos, as mãos estão postas. Solte Z para se levantar.', 1.8);
    } else if (livre && per.nadando && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK', 'KeyC')) {
      this.ctx.hud.anunciar('Nadando, o cajado vai preso ao corpo. Chegue à terra para lutar.', 1.8);
    } else if (livre && this.ctx.nasCostas && e.apertou('Mouse0', 'KeyJ', 'Mouse2', 'KeyK')) {
      const quem = this.ctx.nasCostas === 'menino' ? 'o menino' : enfermo(this.ctx.nasCostas)?.nome;
      this.ctx.hud.anunciar(`Com ${quem} nas costas, as mãos não largam: sem o cajado. Ainda se pode rezar (R).`, 2);
    } else if (livre && e.apertou('Mouse0', 'KeyJ')) {
      // como no Veloren: sem alvo travado, o peregrino golpeia para onde a câmera olha
      if (!this.ctx.combate.travado) this.ctx.combate.virarParaMira();
      per.iniciar('golpe');
      this.ctx.combate.golpePendente = 0.13;
      this.ctx.som.golpe();
    } else if (livre && e.apertou('Mouse2', 'KeyK')) {
      if (this.ctx.oracao.torpor > 0) this.ctx.hud.anunciar('O torpor pesa demais. Segure R para rezar.', 1.6);
      else if (this.ctx.estado.energia >= AJUSTES.combate.luzCusto) this.ctx.combate.lancarLuz();
      else this.ctx.hud.anunciar('Sem energia. Segure R para rezar.', 1.6);
    } else if (livre && e.apertou('KeyC')) {
      per.iniciar('esquiva', desejo.lengthSq() > 0.01 ? desejo.clone() : undefined);
    } else if (livre && e.segurando('KeyR') && per.noChao && desejo.lengthSq() < 0.01) {
      per.iniciar('rezando');
      this.ctx.oracao.tempoOracao = 0;
      this.ctx.oracao.curaOracao = 0;
    }

    if (per.acao === 'rezando') {
      if (this.ctx.sacramentos.emConfissao) {
        /* ajoelhado no confessionário até o fim da conversa */
      } else if (!e.segurando('KeyR') || desejo.lengthSq() > 0.01 || dialogo) per.acao = 'livre';
      else this.ctx.oracao.rezar(dt);
    }

    if (e.apertou('KeyF') && !parado && per.acao === 'livre') this.ctx.interacoes.interacaoPerto()?.agir();

    const pular = !parado && e.apertou('Space') && per.acao === 'livre' && !aBordo;
    if (pular && per.noChao) this.ctx.som.pulo();
    // na conversa, o peregrino se vira para quem fala com ele
    const olharPara = this.ctx.combate.travado ? this.ctx.combate.travado.pos : dialogo && this.ctx.conversa.interlocutor ? this.ctx.conversa.interlocutor.pos : null;
    if (this.ctx.barco.aBordo) this.ctx.navegacao.conduzirBarco(dt, parado ? new THREE.Vector3() : desejo, correndo);
    else {
      per.timoneiro = null;
      this.puloPendente ||= pular;
      const k = this.fisicaFixa.avancar(dt, (passo) => {
        per.atualizar(passo, this.ctx.regioes.fisica, desejo, velocidade, this.puloPendente, olharPara);
        this.puloPendente = false;
        if (per.queda > 0) this.ctx.combate.cairDeAltura(per.queda);
      });
      per.interpolar(k);
      if (this.ctx.barco.grupo.visible) this.ctx.barco.deriva(dt, this.ctx.ermo);
      this.ctx.som.navegar(0);
    }
    if (!parado) this.ctx.combate.atualizarPuxao(dt);

    if (per.velocidadeHoriz > 0.5 && (per.noChao || per.nadando)) {
      this.somPasso -= dt * per.velocidadeHoriz;
      if (this.somPasso <= 0) {
        this.somPasso = per.nadando ? 2.4 : 1.7;
        if (per.nadando) this.ctx.som.bracada();
        else this.ctx.som.passo();
      }
    }
    if (per.mergulhou) {
      per.mergulhou = false;
      this.ctx.som.respingo();
    }
    this.sobVerga = sobVerga;
  }

  /** O que pesa no peregrino: o ouro da Gula (Piedade 4 o deixa pela metade) e a pedra no ombro. */
  pesoEfetivo() {
    const ouro = this.ctx.estado.peso * (this.ctx.estado.nivel('piedade') >= 2 ? 0.5 : 1);
    const fardo = this.ctx.peregrino.carregando ? (this.ctx.nasCostas && this.ctx.estado.nivel('piedade') >= 4 ? 1 : 2) : 0;
    let extra = 0;
    for (const m of this.ctx.modulos) extra += m.pesoExtra?.() ?? 0;
    return ouro + extra + fardo;
  }
}
