import * as THREE from 'three';
import { Fauna } from '../fauna/Fauna';
import { anatomia } from '../fauna/Especies';
import { Area, IdArea } from '../mundo/Area';
import { NIVEL_MAR } from '../mundo/aberto/Geografia';
import { DURACAO_CARINHO } from '../entidades/Peregrino';
import { MARCA, type Interacao } from './Interacoes';
import { type Sistema, Parte } from './Sistema';

/** Os bichos de cada região e os do ermo, e o carinho nos mansos. */
export class SistemaFauna extends Parte implements Sistema {
  /** A fauna de cada região (só a da área atual aparece e se mexe). */
  faunas = new Map<IdArea, Fauna>();

  /** Cria a fauna de todas as regiões (a mesma distribuição em toda partida). */
  async povoarFauna() {
    const areas = [this.ctx.mundo, this.ctx.cripta, this.ctx.deserto, this.ctx.meiodia, this.ctx.cidade, this.ctx.bahiaBaixa, this.ctx.bahiaAlta, this.ctx.creta, this.ctx.navio, this.ctx.naufragio, this.ctx.malta] as Area[];
    await Promise.all(
      areas.map(async (a, i) => {
        const fauna = new Fauna(a);
        await fauna.povoar(a.povoamento?.() ?? [], 101 + i * 7919);
        this.faunas.set(a.id, fauna);
        this.ctx.cena.add(fauna.grupo);
      }),
    );
    // o ermo: a vegetação e os bichos da terra de ligação (que não entram no mar: o nível mínimo é o do mar)
    const ermo = this.ctx.ermo;
    const faunaDoErmo = new Fauna({ altura: (x, z) => ermo.altura(x, z), colidir: (q, r) => ermo.colidir(q, r), nivelMinimo: NIVEL_MAR + 0.2 });
    faunaDoErmo.definirSitios(ermo.recheio.povoamento(), 7177);
    await ermo.recheio.carregar();
    this.faunas.set('ermo', faunaDoErmo);
    this.ctx.cena.add(faunaDoErmo.grupo);
    this.ctx.interacoes.criarInteracoes();
    this.ctx.ambiente.aplicarAmbiente();
  }

  /** "F: fazer carinho" em cada bicho manso da área. */
  interacoesDaFauna(id: IdArea): Interacao[] {
    const fauna = this.faunas.get(id);
    if (!fauna) return [];
    // no ermo os bichos vêm e vão com o peregrino: uma interação só, com o bicho manso mais perto
    if (id === 'ermo') {
      const perto = () => {
        const p = this.ctx.peregrino.pos;
        let m: (typeof fauna.animais)[number] | null = null, dm = Infinity;
        for (const b of fauna.animais) {
          if (!b.ficha.carinho || !b.raiz.visible) continue;
          const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
          if (d < dm) [m, dm] = [b, d];
        }
        return m;
      };
      const longe = new THREE.Vector3(1e9, 0, 1e9);
      return [{
        pos: () => perto()?.pos ?? longe,
        raio: 1.8,
        rotulo: () => {
          const b = perto();
          return b ? `F: fazer carinho ${b.ficha.feminino ? 'na' : 'no'} ${b.ficha.nome}` : 'F: fazer carinho';
        },
        tipo: MARCA.nenhum,
        agir: () => {
          const b = perto();
          if (!b) return;
          const per = this.ctx.peregrino;
          per.rumo = Math.atan2(b.pos.x - per.pos.x, b.pos.z - per.pos.z);
          per.carinhoAlto = anatomia(b.especie).corpo === 'quadruped_medium';
          per.iniciar('carinho');
          b.carinho = DURACAO_CARINHO;
          if (b.ficha.voz) this.ctx.agenda.depois(0.7, () => this.ctx.som.voz(b.ficha.voz!));
        },
      }];
    }
    return fauna.animais
      .filter((b) => b.ficha.carinho)
      .map((b) => ({
        pos: () => b.pos,
        raio: 1.8,
        rotulo: `F: fazer carinho ${b.ficha.feminino ? 'na' : 'no'} ${b.ficha.nome}`,
        tipo: MARCA.nenhum,
        agir: () => {
          const per = this.ctx.peregrino;
          per.rumo = Math.atan2(b.pos.x - per.pos.x, b.pos.z - per.pos.z);
          per.carinhoAlto = anatomia(b.especie).corpo === 'quadruped_medium';
          per.iniciar('carinho');
          b.carinho = DURACAO_CARINHO;
          if (b.ficha.voz) this.ctx.agenda.depois(0.7, () => this.ctx.som.voz(b.ficha.voz!));
        },
      }));
  }

  /** A cada quadro: os bichos da área andam (e, no mundo aberto, os do ermo também). */
  atualizar(dt: number) {
    const per = this.ctx.peregrino;
    this.faunas.get(this.ctx.area.id)?.atualizar(dt, per.pos, (v, d) => this.ctx.som.voz(v, 1 - d / 16));
    if (this.ctx.regioes.aberto && this.ctx.area !== this.ctx.ermoDoMundo) this.faunas.get('ermo')?.atualizar(dt, per.pos, (v, d) => this.ctx.som.voz(v, 1 - d / 16));
  }
}
