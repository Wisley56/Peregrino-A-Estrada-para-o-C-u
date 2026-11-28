import * as THREE from 'three';
import { CHEFOES } from '../core/Estado';
import { Alvo } from '../mundo/Area';
import { Chefe, type InfoJogador } from '../entidades/Guardiao';
import { danoDeQueda } from '../entidades/Peregrino';
import { Sombra } from '../entidades/Sombra';
import { AJUSTES } from '../config/ajustes';
import { type Sistema, Parte } from './Sistema';

interface Projetil {
  malha: THREE.Mesh;
  vel: THREE.Vector3;
  vida: number;
  alvo: Alvo | null;
}

/**
 * O combate: a mira (livre e travada), o cajado, a luz, as sombras e o chefão da área (o de cada região vem do
 * módulo dela), as vitórias, as feridas, a queda de altura e a morte.
 */
export class SistemaCombate extends Parte implements Sistema {
  travado: Alvo | null = null;
  projeteis: Projetil[] = [];
  golpePendente = -1;
  /** Onde a mira livre aponta (raio da câmera pelo centro da tela) e o inimigo que está sob ela. */
  miraPonto = new THREE.Vector3();
  miraAlvo: Alvo | null = null;
  avisoCouraca = 0;
  puxao: { de: THREE.Vector3; para: THREE.Vector3; t: number } | null = null;
  flashLuz = new THREE.PointLight(0xfff0c0, 0, 12, 1.4);
  geoLuz = new THREE.SphereGeometry(0.22, 12, 8);
  matLuz = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });

  /** A cada quadro, logo depois do controle: o golpe que acerta e a luz que voa. */
  atualizarArmas(dt: number) {
    // golpe acerta um pouco depois de começar
    if (this.golpePendente > 0) {
      this.golpePendente -= dt;
      if (this.golpePendente <= 0) this.resolverGolpe();
    }
    this.avisoCouraca = Math.max(0, this.avisoCouraca - dt);

    this.atualizarProjeteis(dt);
  }

  /** A cada quadro, depois de a área andar: o chefão sente o peregrino, as sombras ferem quem encostam. */
  atualizarInimigos(dt: number) {
    const per = this.ctx.peregrino, parado = this.ctx.parado;
    const chefe = this.chefeDaArea();
    const info: InfoJogador = {
      pos: per.pos, noChao: per.noChao, esquivando: per.acao === 'esquiva', invulneravel: per.invulneravel > 0, peso: this.ctx.controle.pesoEfetivo(),
      rezando: per.acao === 'rezando',
    };
    for (const m of this.ctx.modulos) Object.assign(info, m.sentidos?.());
    chefe?.sentir(info);
    for (const s of this.ctx.regioes.dormente ? [] : this.ctx.area.sombras) {
      if (s.estado === 'vencida' || parado) continue;
      s.atualizar(dt, this.ctx.area, per.pos);
      if (!s.ativa) continue;
      const d = s.pos.distanceTo(per.pos);
      if ((s.perigosa && d < s.raioInvestida) || d < s.raioContato) this.ferir(s.pos);
    }
    if (!parado) this.aplicarImpactosDoChefe();
    this.atualizarBarraChefe();
  }

  /** O chefão da área atual (se houver): cada região diz o seu. */
  chefeDaArea(): Chefe | null {
    if (this.ctx.regioes.dormente) return null;
    for (const m of this.ctx.modulos) {
      const c = m.chefe && m.areas.includes(this.ctx.area.id) ? m.chefe() : null;
      if (c) return c;
    }
    return null;
  }

  atualizarBarraChefe() {
    for (const m of this.ctx.modulos) {
      const b = m.barraDoChefe?.();
      if (b) return this.ctx.hud.mostrarChefe(b.nome, b.fracao, b.protegido, b.alerta);
    }
    this.ctx.hud.mostrarChefe(null);
  }

  /** Aplica no peregrino o que o chefão acertou neste quadro (dano, roubo de energia, puxão). */
  aplicarImpactosDoChefe() {
    const g = this.chefeDaArea();
    if (!g) return;
    for (const imp of g.impactos.splice(0)) {
      if (imp.som === 'sol') this.ctx.som.sol();
      else if (imp.som === 'raio') this.ctx.som.raio();
      else if (imp.som === 'torpor') this.ctx.som.torpor();
      else if (imp.som === 'dissolver') this.ctx.som.dissolver();
      else if (imp.som === 'onda') this.ctx.som.onda();
      else if (imp.som === 'corrente') this.ctx.som.corrente();
      else if (imp.som === 'moedas') this.ctx.som.moedas();
      else if (imp.som === 'rugido') this.ctx.som.tensao();
      if (imp.aviso) this.ctx.hud.anunciar(imp.aviso, 2.2);
      if (imp.roubo) {
        this.ctx.estado.energia = Math.max(0, this.ctx.estado.energia - imp.roubo);
        this.ctx.som.roubo();
      }
      if (imp.torpor) {
        this.ctx.oracao.torpor = 9;
        this.ctx.hud.sussurrar('Para que continuar? Nada disso vale a pena…', 3.2);
        this.ctx.peregrino.iniciar('ferido');
      }
      if (imp.sussurro) this.ctx.hud.sussurrar(imp.sussurro, 2.8);
      if (imp.indiferenca && this.ctx.estado.nivel('piedade') >= 5) {
        // Piedade 5 (Coração de carne): o olhar da indiferença não prende mais
        if (this.ctx.oracao.indiferenca <= 0) this.ctx.hud.anunciar('O olhar cinzento passa: um coração de carne não se deixa prender.', 1.6);
      } else if (imp.indiferenca) {
        this.ctx.oracao.indiferenca = imp.indiferenca;
        this.ctx.som.torpor();
        this.ctx.peregrino.iniciar('ferido');
        this.ctx.hud.anunciar('O olhar cinzento pegou você: por uns segundos, você passa ao largo.', 2.2);
      }
      // o que é de cada região: o peso do banquete, a brasa da Ira
      for (const m of this.ctx.modulos) m.impacto?.(imp);
      if (imp.arrasto) {
        // o devorar da Gula arrasta o peregrino para a boca (sem atravessar paredes)
        const per = this.ctx.peregrino.pos;
        const antes = per.clone();
        per.add(imp.arrasto);
        this.ctx.regioes.fisica.colidir(per, 0.35);
        if (this.ctx.regioes.fisica.altura(per.x, per.z) > antes.y + 1.05) per.copy(antes);
      }
      if (imp.empurrao && this.ctx.peregrino.invulneravel <= 0) this.ctx.peregrino.empurrao.copy(imp.empurrao);
      if (imp.puxarPara) this.puxao = { de: this.ctx.peregrino.pos.clone(), para: imp.puxarPara.clone(), t: 0 };
      if (imp.dano > 0) this.ferir(imp.de, imp.dano, !!imp.roubo);
    }
  }

  /** O peregrino sendo arrastado pela corrente. */
  atualizarPuxao(dt: number) {
    const p = this.puxao;
    if (!p) return false;
    p.t = Math.min(1, p.t + dt / 0.4);
    const k = 1 - (1 - p.t) ** 3;
    const per = this.ctx.peregrino.pos;
    per.x = p.de.x + (p.para.x - p.de.x) * k;
    per.z = p.de.z + (p.para.z - p.de.z) * k;
    if (p.t >= 1) this.puxao = null;
    return true;
  }

  /** O peregrino vira o corpo para a direção da mira (só no plano do chão). */
  virarParaMira() {
    const per = this.ctx.peregrino;
    // com um inimigo sob a mira, vira para ele (o golpe pega mesmo de raspão); senão, para o ponto mirado
    const ponto = this.miraAlvo?.ativa ? this.miraAlvo.pos : this.miraPonto;
    const dx = ponto.x - per.pos.x, dz = ponto.z - per.pos.z;
    if (dx * dx + dz * dz > 0.25) per.rumo = Math.atan2(dx, dz);
    else {
      const f = this.ctx.camera.frente();
      per.rumo = Math.atan2(f.x, f.z);
    }
  }

  /**
   * A mira livre, como no Veloren: um raio sai da câmera pelo centro da tela e para no primeiro inimigo ou no chão
   * (até 45 m). O trecho entre a câmera e o peregrino não conta, para não mirar no que está atrás dele.
   */
  atualizarMiraLivre(dt: number) {
    const cam = this.ctx.camera.cam;
    const per = this.ctx.peregrino;
    const origem = cam.position;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const ate = origem.distanceTo(per.pos) - 0.6;
    const inicio = Math.max(0, ate);
    let fim = 45;
    let alvo: Alvo | null = null;
    const c = new THREE.Vector3();
    for (const s of [...this.ctx.area.sombras, ...(this.ctx.area.alvos?.() ?? [])] as Alvo[]) {
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
      if ((this.ctx.regioes.fisica.alturaCamera?.(p.x, p.z) ?? this.ctx.regioes.fisica.altura(p.x, p.z)) > p.y) {
        fim = t;
        alvo = null;
        break;
      }
    }
    this.miraPonto.copy(origem).addScaledVector(dir, fim);
    this.miraAlvo = alvo;

    const ver = this.ctx.comecou && !this.ctx.modoCriacao && !this.travado && !this.ctx.hud.dialogoAberto && !this.ctx.morrendo && !this.ctx.transitando &&
      !this.ctx.sacramentos.emConfissao && per.acao !== 'rezando';
    const perto = !!alvo && Math.hypot(alvo.pos.x - per.pos.x, alvo.pos.z - per.pos.z) < 1.8 + ((alvo as Partial<{ raioCorpo: number }>).raioCorpo ?? 0.8);
    this.ctx.hud.mostrarRetic(
      this.ctx.prefs.mira,
      ver ? { sobreAlvo: !!alvo, aoAlcance: perto, semEnergia: this.ctx.estado.energia < AJUSTES.combate.luzCusto || this.ctx.oracao.torpor > 0 } : null,
      dt,
    );
  }

  alvoMaisProximo() {
    const p = this.ctx.peregrino.pos;
    const frente = this.ctx.camera.frente();
    let melhor: Alvo | null = null;
    let nota = Infinity;
    const candidatos: Alvo[] = [...this.ctx.area.sombras, ...(this.ctx.area.alvos?.() ?? [])];
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

  resolverGolpe() {
    const per = this.ctx.peregrino;
    const frente = per.frente();
    this.ctx.area.golpear?.(per.pos, frente);
    for (const s of this.ctx.area.sombras) {
      if (!s.ativa) continue;
      const para = s.pos.clone().sub(per.pos).setY(0);
      const d = para.length();
      if (d < AJUSTES.combate.cajadoAlcance + s.raioCorpo && para.normalize().dot(frente) > 0.25) {
        const r = s.ferir(AJUSTES.combate.cajadoDano + this.ctx.dons.bonusDaVerdade(), per.pos, 'golpe');
        if (r === 'bloqueado') {
          this.ctx.som.bloqueio();
          if (this.avisoCouraca <= 0) this.ctx.hud.anunciar(s.mensagemBloqueio, 1.4);
          this.avisoCouraca = 3;
        } else {
          this.ctx.som.acerto();
          this.ctx.hud.acertou();
          this.tremer(0.15, 0.45, 70);
          if (r === 'morreu') this.sombraVencida(s);
        }
      }
    }
  }

  lancarLuz() {
    const per = this.ctx.peregrino;
    if (!this.travado) this.virarParaMira();
    per.iniciar('luz');
    this.ctx.estado.energia -= AJUSTES.combate.luzCusto;
    this.ctx.som.luz();
    const origem = per.pontaDoCajado();
    const malha = new THREE.Mesh(this.geoLuz, this.matLuz);
    malha.position.copy(origem);
    // travada, a luz persegue o alvo; livre, vai para o ponto sob a mira
    const destino = this.travado ? this.travado.centro() : this.miraPonto.clone();
    if (destino.distanceTo(origem) < 1.5) destino.copy(per.pos).add(per.frente().multiplyScalar(14)).setY(origem.y);
    const vel = destino.sub(origem).normalize().multiplyScalar(18);
    this.ctx.cena.add(malha);
    this.projeteis.push({ malha, vel, vida: 1.6, alvo: this.travado });
    this.flashLuz.position.copy(origem);
    this.flashLuz.intensity = 14;
  }

  atualizarProjeteis(dt: number) {
    for (const p of this.projeteis) {
      p.vida -= dt;
      if (p.alvo?.ativa) {
        const quer = p.alvo.centro().sub(p.malha.position).normalize().multiplyScalar(18);
        p.vel.lerp(quer, Math.min(1, dt * 8));
      }
      p.malha.position.addScaledVector(p.vel, dt);
      p.malha.scale.setScalar(1 + Math.sin(p.vida * 40) * 0.15);
      if (this.ctx.area.atingirLuz?.(p.malha.position)) {
        this.flashLuz.position.copy(p.malha.position);
        this.flashLuz.intensity = 16;
        p.vida = 0;
      }
      for (const s of this.ctx.area.sombras) {
        if (p.vida <= 0) break;
        if (!s.ativa) continue;
        if (s.centro().distanceTo(p.malha.position) < 0.55 + s.raioCorpo * 0.8) {
          this.ctx.som.acerto();
          this.flashLuz.position.copy(p.malha.position);
          this.flashLuz.intensity = 16;
          const r = s.ferir(AJUSTES.combate.luzDano + this.ctx.dons.bonusDaVerdade(), this.ctx.peregrino.pos, 'luz');
          if (r !== 'bloqueado') this.ctx.hud.acertou();
          if (r === 'morreu') this.sombraVencida(s);
          else if (r === 'atordoado') this.ctx.hud.anunciar('Atordoado! Golpeie agora!', 1.4);
          else if (r === 'bloqueado') {
            this.ctx.som.bloqueio();
            if (this.avisoCouraca <= 0 && this.ctx.area === this.ctx.meiodia) this.ctx.hud.anunciar(s.mensagemBloqueio, 1.4);
            this.avisoCouraca = 3;
          }
          p.vida = 0;
        }
      }
      if (p.vida > 0 && p.malha.position.y < this.ctx.regioes.fisica.altura(p.malha.position.x, p.malha.position.z)) {
        // bateu na pedra: a luz se espalha num clarão curto, para o jogador ver onde parou
        p.vida = 0;
        this.flashLuz.position.copy(p.malha.position).addScaledVector(p.vel, -0.03);
        this.flashLuz.intensity = 9;
        this.ctx.som.faisca();
      }
      if (p.vida <= 0) this.ctx.cena.remove(p.malha);
    }
    this.projeteis = this.projeteis.filter((p) => p.vida > 0);
  }

  /** Uma sombra caiu: a graça, a energia e o que a região faz com a vitória (o desfecho de cada chefão). */
  sombraVencida(s: Sombra) {
    this.ctx.som.dissolver();
    if (this.travado === s) this.travado = null;
    const ajudante = s.id.startsWith('cripta_ajudante');
    if (!ajudante) this.ctx.estado.sombrasVencidas.add(s.id);
    // vencer um chefão-vício é graça grande (3); as outras sombras, graça pequena (1)
    const chefao = CHEFOES.includes(s.id);
    // as ajudantes do Mamom voltam a cada luta: não dão graça (senão viraria fonte infinita)
    if (!ajudante) this.ctx.estado.gracas += chefao ? 3 : 1;
    if (chefao) this.ctx.estado.flags.add(`graca_grande_${s.id}`);
    for (const m of this.ctx.modulos) m.contarVitoria?.(s);
    this.ctx.estado.energia = Math.min(this.ctx.estado.energiaMax, this.ctx.estado.energia + AJUSTES.combate.energiaPorVitoria);
    this.ctx.estado.salvar();
    this.ctx.eventos.emitir('sombraVencida', { id: s.id, chefao });
    if (chefao) {
      // cada chefão vencido dá um coração a mais, e o peregrino sai da luta curado
      this.ctx.estado.coracoes = this.ctx.estado.coracoesMax;
      this.ctx.agenda.depois(3.4, () => this.ctx.hud.anunciar('❤️ Mais um coração!', 2.6));
    }
    for (const m of this.ctx.modulos) if (m.sombraVencida?.(s)) return;
    this.ctx.agenda.depois(0.7, () => {
      this.ctx.efeitos.ouro = 1;
      this.ctx.som.graca();
      this.ctx.graca.tempoColuna = 0;
      this.ctx.hud.anunciar('✦ Graça recebida', 2.6);
      for (const m of this.ctx.modulos) m.aposVencerSombra?.(s);
    });
  }

  /**
   * Dano de queda, pela altura caída (do alto do salto ao chão). Até `AJUSTES.queda.segura` não fere (um pulo de um
   * barranco de uns 3,5 m); daí, meio coração a cada `queda.porMeio` m; de `queda.fatal` para cima, cai morto.
   * Água funda freia a queda (não chega aqui). Fere mesmo no tempo de graça de um golpe: o chão não erra.
   */
  cairDeAltura(altura: number) {
    const per = this.ctx.peregrino;
    per.queda = 0;
    const dano = danoDeQueda(altura, this.ctx.estado.coracoesMax);
    if (dano <= 0 || this.ctx.morrendo || this.ctx.dev?.invencivel) return;
    per.invulneravel = 0;
    this.ferir(per.pos, dano, true);
  }

  /** `dano` em corações: 0,5 é meio coração (o padrão); golpes pesados tiram 1. */
  ferir(de: THREE.Vector3, dano = AJUSTES.combate.danoRecebido, semEmpurrao = false) {
    const per = this.ctx.peregrino;
    if (per.invulneravel > 0 || this.ctx.morrendo || this.ctx.dev?.invencivel) return;
    this.ctx.estado.coracoes = Math.max(0, this.ctx.estado.coracoes - dano);
    per.invulneravel = AJUSTES.peregrino.invulneravel;
    per.iniciar('ferido');
    this.ctx.efeitos.dano = 1;
    this.ctx.som.dano();
    this.tremer(dano >= 1 ? 0.8 : 0.5, 0.7, dano >= 1 ? 320 : 200);
    if (this.ctx.estado.coracoes <= 0) return this.morrer();
    if (semEmpurrao) return;
    const empurra = per.pos.clone().sub(de).setY(0).normalize().multiplyScalar(AJUSTES.peregrino.empurrao);
    const antes = per.pos.clone();
    per.pos.add(empurra);
    // não empurra para dentro de parede
    if (this.ctx.regioes.fisica.altura(per.pos.x, per.pos.z) > antes.y + AJUSTES.peregrino.degrau) per.pos.copy(antes);
  }

  /** Vibração do controle, se o jogador não a desligou nas Configurações. */
  tremer(forte: number, fraco: number, ms: number) {
    if (this.ctx.prefs.vibracao) this.ctx.entrada.vibrar(forte, fraco, ms);
  }

  /** Caiu sem corações: escurece, as lutas recomeçam, e o peregrino volta ao último descanso. */
  morrer() {
    this.ctx.eventos.emitir('morreu', {});
    this.ctx.morrendo = true;
    this.tremer(1, 1, 600);
    this.puxao = null;
    this.travado = null;
    this.ctx.hud.escurecer(true);
    this.ctx.agenda.depois(1.2, () => {
      for (const m of this.ctx.modulos) m.aoMorrer?.();
      for (const s of this.ctx.sistemas) s.aoMorrer?.();
      this.ctx.peregrino.carregar(null);
      this.ctx.barco.aBordo = false;
      const destino = this.ctx.regioes.areaPorId(this.ctx.estado.checkpointArea);
      if (destino !== this.ctx.area) {
        this.ctx.area = destino;
        this.ctx.ambiente.aplicarAmbiente();
      }
      const [x, y, z] = this.ctx.estado.checkpoint;
      this.ctx.peregrino.teleportar(x, y, z);
      this.ctx.peregrino.acao = 'livre';
      this.ctx.camera.reposicionar();
      this.ctx.estado.cair();
      this.ctx.estado.restaurar();
      this.ctx.estado.salvar(); // a queda vale mesmo se o jogo for fechado agora
      this.ctx.hud.escurecer(false);
      this.ctx.hud.anunciar('Você voltou ao último lugar de descanso.', 3);
      this.ctx.morrendo = false;
    });
  }

  aoVoltarAoTitulo() {
    this.travado = null;
    this.puxao = null;
    this.projeteis.forEach((p) => this.ctx.cena.remove(p.malha));
    this.projeteis = [];
  }
}
