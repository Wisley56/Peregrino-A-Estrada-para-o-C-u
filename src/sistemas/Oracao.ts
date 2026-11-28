import { AJUSTES } from '../config/ajustes';
import { type Sistema, Parte } from './Sistema';

/** A oração (a energia, o Repouso em Deus, os lugares onde vale em dobro), o torpor da acídia e a indiferença. */
export class SistemaOracao extends Parte implements Sistema {
  tempoOracao = 0;
  /** Tempo acumulado para a cura do Repouso em Deus (Temor de Deus 4). */
  curaOracao = 0;
  somOracao = 0;
  /** Segundos de torpor (o vício da acídia): o peregrino fica pesado até rezar. */
  torpor = 0;
  /** O olhar do Coração de Pedra: por uns segundos o peregrino passa ao largo (não socorre, anda devagar). */
  indiferenca = 0;

  /** Torpor: pesa, gasta energia e se desfaz sozinho bem devagar (rezando, depressa). */
  atualizarTorpor(dt: number) {
    this.indiferenca = Math.max(0, this.indiferenca - dt);
    if (this.indiferenca > 0 && !this.ctx.hud.dialogoAberto) this.ctx.hud.mostrarDica('Indiferente: não é comigo… (passa logo)');
    if (this.torpor <= 0) {
      this.ctx.hud.mostrarTorpor(0);
      return;
    }
    this.torpor = Math.max(0, this.torpor - dt);
    this.ctx.estado.energia = Math.max(0, this.ctx.estado.energia - dt * AJUSTES.oracao.torporGasto);
    this.ctx.hud.mostrarTorpor(Math.min(1, this.torpor / 2));
    if (this.ctx.peregrino.acao !== 'rezando' && !this.ctx.hud.dialogoAberto) this.ctx.hud.mostrarDica('Torpor: segure R para rezar e se levantar');
  }

  /** Rezar aqui vale em dobro? Diante das capelinhas e dos cruzeiros das estradas, e nos lugares santos de cada região. */
  oracaoDobrada() {
    const p = this.ctx.peregrino.pos;
    // diante das capelinhas e dos cruzeiros das estradas
    if (this.ctx.regioes.aberto && this.ctx.ermoDoMundo?.recheio.beiras.some((b) => Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < 4)) return true;
    for (const m of this.ctx.modulos) if (m.oracaoDobrada && m.areas.includes(this.ctx.area.id)) return m.oracaoDobrada(p);
    return false;
  }

  rezar(dt: number) {
    this.tempoOracao += dt;
    // "não pare de rezar": a oração desfaz o torpor depressa
    if (this.torpor > 0) {
      this.torpor = Math.max(0, this.torpor - dt * AJUSTES.oracao.torporRezando * (this.ctx.estado.nivel('temor') >= 5 ? 2 : 1));
      if (this.torpor === 0) {
        this.ctx.hud.anunciar('A oração venceu o torpor!', 2);
        this.ctx.som.graca();
        this.ctx.efeitos.ouro = 0.5;
      }
    }
    // o que a oração faz em cada região (o jejum desfaz o peso do banquete)
    for (const m of this.ctx.modulos) m.aoRezar?.(dt);
    const O = AJUSTES.oracao;
    const taxa = this.tempoOracao < 3 ? O.taxaInicio : this.tempoOracao < 6 ? O.taxaMeio : O.taxaPlena;
    const contrito = this.ctx.estado.nivel('temor') >= 2 ? 1.3 : 1;
    this.ctx.estado.energia = Math.min(this.ctx.estado.energiaMax, this.ctx.estado.energia + taxa * contrito * (this.oracaoDobrada() ? 2 : 1) * dt);
    // Temor de Deus 4 (Repouso em Deus): depois de 4 s rezando, meio coração a cada 4 s
    if (this.ctx.estado.nivel('temor') >= 4 && this.tempoOracao > 4 && this.ctx.estado.coracoes < this.ctx.estado.coracoesMax) {
      this.curaOracao += dt;
      if (this.curaOracao >= 4) {
        this.curaOracao = 0;
        this.ctx.estado.coracoes = Math.min(this.ctx.estado.coracoesMax, this.ctx.estado.coracoes + 0.5);
        this.ctx.efeitos.ouro = 0.35;
        this.ctx.som.graca();
      }
    }
    this.somOracao -= dt;
    if (this.somOracao <= 0) {
      this.somOracao = 1.2;
      this.ctx.som.oracao();
    }
  }

  aoMorrer() {
    this.indiferenca = 0;
    this.torpor = 0;
  }

  aoVoltarAoTitulo() {
    this.torpor = 0;
  }
}
