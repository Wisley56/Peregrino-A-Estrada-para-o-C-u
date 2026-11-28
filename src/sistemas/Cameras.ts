import * as THREE from 'three';
import { ARFAGEM_LIVRE } from '../core/Camera';
import { REGIOES } from '../historia/Regioes';
import { Parte } from './Sistema';

/** A câmera de jogo (dentro das capelas, no barco, na confissão), a de conversa, a da criação, a mira e o quadro. */
export class SistemaCameras extends Parte {
  rumoCriacao = 0;

  /** Depois do jogo andar: posiciona as câmeras, a mira e a luz, atualiza a tela e desenha o quadro. */
  atualizar(dt: number) {
    const alvoCam = this.ctx.combate.travado ? this.ctx.combate.travado.centro() : null;
    // dentro da capela o telhado some e a câmera passa por cima das paredes, como na cripta
    const cap = this.ctx.area.capela;
    const naCapela = !!cap && cap.dentro(this.ctx.peregrino.pos);
    // a primeira vez em certas capelas (a do deserto, o Bonfim), o Espírito conta de quem elas são
    const historia = !this.ctx.regioes.dormente;
    if (naCapela && historia && this.ctx.comecou && !this.ctx.hud.dialogoAberto) for (const m of this.ctx.modulos) m.naCapela?.();
    // no galinheiro da Bahia (e na enfermaria), o mesmo: o telhado some e a câmera passa por cima das paredes
    const hosp = this.ctx.area === this.ctx.bahiaBaixa ? this.ctx.bahiaBaixa.hospital : null;
    const noHospital = !!hosp && hosp.dentro(this.ctx.peregrino.pos);
    hosp?.mostrarTelhado(!noHospital);
    const dentro = naCapela || noHospital;
    if (this.ctx.area !== this.ctx.cripta) {
      this.ctx.camera.subirAoBater = dentro && !this.ctx.sacramentos.emConfissao;
      this.ctx.camera.arfagemMin = dentro && !this.ctx.sacramentos.emConfissao ? 0.35 : ARFAGEM_LIVRE;
    }
    if (this.ctx.sacramentos.emConfissao) {
      // de fora da abertura do confessionário, de lado, à altura de quem está ajoelhado
      this.ctx.camera.guinada = Math.PI / 2 + 0.35;
      this.ctx.camera.arfagem = 0.12;
      this.ctx.camera.distancia = 2.9;
    } else {
      // braço mais curto dentro da capela, para não ter de subir tanto por cima das paredes
      const alvo = this.ctx.barco.aBordo ? 10.5 : dentro ? 4.3 : 6.2;
      this.ctx.camera.elevacaoMira = this.ctx.comecou ? (dentro ? 0.5 : 1.05) : 0;
      this.ctx.camera.distancia += (alvo - this.ctx.camera.distancia) * Math.min(1, dt * 3);
    }
    const area = this.ctx.regioes.fisica;
    const solo = area.alturaCamera ? (x: number, z: number) => area.alturaCamera!(x, z) : (x: number, z: number) => area.altura(x, z);
    // a superfície da água também segura a câmera: ela nunca mergulha (debaixo do mar se veria o terreno por baixo)
    const chao = area.nivelAgua ? (x: number, z: number) => Math.max(solo(x, z), area.nivelAgua!(x, z) ?? -Infinity) : solo;
    const alturaCam = naCapela ? (x: number, z: number) => cap!.alturaCamera(x, z, chao) : noHospital ? (x: number, z: number) => hosp!.alturaCamera(x, z, chao) : chao;
    this.ctx.camera.atualizar(dt, this.ctx.peregrino.posVisual, alvoCam, alturaCam);
    if (this.ctx.comecou) this.ctx.conversa.atualizarConversa(dt, alturaCam);
    if (this.ctx.area === this.ctx.navio) this.ctx.navio.balancar(this.ctx.camera.cam);
    if (this.ctx.modoCriacao) this.quadroCriacao(dt);
    this.ctx.hud.posicionarMira(this.ctx.combate.travado ? this.ctx.combate.travado.centro().add(new THREE.Vector3(0, 0.9, 0)) : null, this.ctx.camera.cam);
    this.ctx.combate.atualizarMiraLivre(dt);
    const cor = this.ctx.ambiente.corVisivel(dt);
    const ar = this.ctx.regioes.areaDaRegiao();
    this.ctx.hud.atualizar(dt, this.ctx.estado, cor, REGIOES[ar.id].barraDeCor);
    this.ctx.ambiente.misturarAmbiente(dt);

    // sol acompanha o peregrino para a sombra ficar nítida por perto
    const p = this.ctx.peregrino.pos;
    this.ctx.ambiente.sol.position.set(p.x + 30, p.y + 45, p.z - 40);
    this.ctx.ambiente.sol.target.position.copy(p);
    this.ctx.mundo.luzFogueira.intensity = 7 + Math.sin(performance.now() * 0.013) * 1.2 + Math.sin(performance.now() * 0.031) * 0.8;
    this.ctx.combate.flashLuz.intensity = Math.max(0, this.ctx.combate.flashLuz.intensity - dt * 40);

    this.ctx.ambiente.ceu.position.copy(this.ctx.camera.cam.position); // o céu acompanha a câmera (o deserto fica longe da origem)
    // o torpor tira a cor do mundo
    const peso = Math.min(1, this.ctx.oracao.torpor / 2);
    this.ctx.efeitos.renderizar(dt, this.ctx.modoCriacao ? 1 : cor * (1 - peso * 0.8));
  }

  /** Câmera de retrato: o peregrino fica de frente, à direita do painel (ou acima dele, em tela estreita). */
  quadroCriacao(dt: number) {
    const per = this.ctx.peregrino;
    // girar o boneco: arrastando o mouse ou no analógico direito
    const giro = this.ctx.entrada.controle.direito[0];
    this.rumoCriacao -= this.ctx.entrada.mouseDx * 0.01 + giro * dt * 3;
    if (!this.ctx.entrada.segurando('Mouse0') && !giro) this.rumoCriacao += dt * 0.25;
    per.rumo = this.rumoCriacao;
    per.atualizar(dt, this.ctx.regioes.fisica, new THREE.Vector3(), 0, false, null);
    const estreita = innerWidth < 760;
    const alvo = per.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
    const cam = this.ctx.camera.cam;
    const dist = estreita ? 5.2 : 3.4;
    cam.position.set(alvo.x, alvo.y + 0.35, alvo.z - dist);
    const olhar = alvo.clone();
    if (estreita) olhar.y -= 1.05;
    else olhar.x += 0.95; // de -z olhando para +z, a direita da tela é -x: o boneco vai para a direita
    cam.lookAt(olhar);
  }
}
