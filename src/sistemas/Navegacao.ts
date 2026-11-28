import * as THREE from 'three';
import { Barco } from '../entidades/Barco';
import { MARCA, type Interacao } from './Interacoes';
import { Parte } from './Sistema';

/** O barco do peregrino: ancorar nos cais, chamar, embarcar, conduzir pelo mar e desembarcar. */
export class SistemaNavegacao extends Parte {
  /** Os cais em que se pode chamar o barco (pontos de viagem). */
  static readonly CAIS_DO_BARCO = ['bahia_cais', 'creta_praia', 'malta_porto'];
  ancoradouros = new Map<string, { x: number; z: number; rumo: number } | null>();

  /**
   * Onde o barco fica ancorado junto a um cais: o ponto de água funda mais perto do cais onde o casco inteiro cabe,
   * com a proa para o mar (longe do cais). Longe dos barcos grandes que já estão lá.
   */
  ancoradouro(id: string) {
    if (this.ancoradouros.has(id)) return this.ancoradouros.get(id)!;
    const l = this.ctx.viagem.lugarDoPonto(id);
    let achou: { x: number; z: number; rumo: number } | null = null;
    if (l) {
      const evitar = [{ x: this.ctx.bahiaBaixa.saveiro.x - 7, z: this.ctx.bahiaBaixa.saveiro.z, r: 9 }];
      for (let r = 5; r <= 60 && !achou; r += 1.5)
        for (let k = 0; k < 32 && !achou; k++) {
          const a = (k / 32) * Math.PI * 2;
          const x = l.pos.x + Math.sin(a) * r, z = l.pos.z + Math.cos(a) * r;
          if (evitar.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
          if (this.ctx.barco.cabe(this.ctx.ermo, x, z, a) && Barco.profundidade(this.ctx.ermo, x, z) > 0.9) achou = { x, z, rumo: a };
        }
    }
    this.ancoradouros.set(id, achou);
    return achou;
  }

  /** Põe o barco onde o save diz, ou ancorado no cais da Bahia. */
  porBarco() {
    this.ctx.barco.aBordo = false;
    const b = this.ctx.estado.barco;
    const a = b ? { x: b[0], z: b[1], rumo: b[2] } : this.ancoradouro('bahia_cais');
    if (a) this.ctx.barco.colocar(a.x, a.z, a.rumo, this.ctx.ermo);
  }

  guardarBarco() {
    const b = this.ctx.barco;
    this.ctx.estado.barco = [Math.round(b.pos.x * 10) / 10, Math.round(b.pos.z * 10) / 10, Math.round(b.rumo * 100) / 100];
  }

  _interacoesDoBarco: Interacao[] | null = null;
  /** [desembarcar, embarcar, chamar no cais…]. */
  get interacoesDoBarco(): Interacao[] {
    if (this._interacoesDoBarco) return this._interacoesDoBarco;
    const b = this.ctx.barco;
    const lista: Interacao[] = [
      {
        pos: () => b.pos,
        raio: 99,
        rotulo: () => (this.lugarDeDesembarque() ? 'F: desembarcar' : 'F: pular na água'),
        tipo: MARCA.lugar,
        agir: () => this.desembarcar(),
      },
      {
        pos: () => b.pos,
        raio: 4.6,
        ativa: () => this.ctx.regioes.aberto && b.grupo.visible,
        rotulo: 'F: embarcar no barco',
        tipo: MARCA.lugar,
        agir: () => this.embarcar_(),
      },
      ...SistemaNavegacao.CAIS_DO_BARCO.map((id): Interacao => ({
        pos: () => this.ctx.viagem.lugarDoPonto(id)!.pos,
        raio: 12,
        ativa: () => {
          const a = this.ctx.regioes.aberto ? this.ancoradouro(id) : null;
          return !!a && Math.hypot(b.pos.x - a.x, b.pos.z - a.z) > 20;
        },
        rotulo: 'F: chamar o barco',
        tipo: MARCA.lugar,
        agir: () => this.chamarBarco(id),
      })),
    ];
    return (this._interacoesDoBarco = lista);
  }

  embarcar_() {
    if (this.ctx.nasCostas || this.ctx.peregrino.carregando) return this.ctx.hud.anunciar('Com alguém (ou algo) nas costas não dá para subir a bordo.', 2);
    this.ctx.barco.aBordo = true;
    this.ctx.combate.travado = null;
    this.ctx.peregrino.acao = 'livre';
    this.ctx.som.respingo();
    if (this.ctx.primeiraVez('barco_conduziu')) this.ctx.hud.anunciar('A bordo. W A S D levam o barco para onde a câmera olha; Shift solta a vela toda; F desembarca.', 4.5);
    else this.ctx.hud.anunciar('A bordo.', 1.2);
  }

  /** Um lugar de terra firme (ou água rasa) junto ao barco para descer, ou null em mar aberto. */
  lugarDeDesembarque() {
    const b = this.ctx.barco, f = this.ctx.ermo;
    const conves = b.lugarDoPeregrino().y;
    for (const r of [3, 4, 5.5, 7, 9])
      for (let k = 0; k < 16; k++) {
        const a = b.rumo + Math.PI / 2 + (k / 16) * Math.PI * 2;
        const x = b.pos.x + Math.sin(a) * r, z = b.pos.z + Math.cos(a) * r;
        const h = f.altura(x, z);
        if (Barco.profundidade(f, x, z) < 0.8 && h < conves + 1.6) return new THREE.Vector3(x, h, z);
      }
    return null;
  }

  desembarcar() {
    const b = this.ctx.barco, per = this.ctx.peregrino;
    const terra = this.lugarDeDesembarque();
    b.aBordo = false;
    b.velocidade = 0;
    if (terra) per.teleportar(terra.x, terra.y, terra.z);
    else {
      // em mar aberto: pula do bordo para a água e nada
      const lado = b.ponto(0, 2.8);
      per.teleportar(lado.x, (this.ctx.ermo.nivelAgua?.(lado.x, lado.z) ?? lado.y) - 0.6, lado.z);
      this.ctx.som.respingo();
    }
    this.guardarBarco();
    this.ctx.estado.salvar();
  }

  chamarBarco(id: string) {
    const a = this.ancoradouro(id);
    if (!a) return;
    this.ctx.barco.colocar(a.x, a.z, a.rumo, this.ctx.ermo);
    this.guardarBarco();
    this.ctx.estado.salvar();
    this.ctx.som.respingo();
    this.ctx.hud.anunciar('O barco vem até o cais.', 2);
  }

  /**
   * A bordo: o barco anda, e o peregrino vai junto, sentado ao leme no banco da popa, preso ao casco (arfa e aderna
   * com ele). O som: a água correndo no costado, a vela batendo quando paneja, o tranco do jaibe e o casco rangendo.
   */
  conduzirBarco(dt: number, desejo: THREE.Vector3, cheia: boolean) {
    const b = this.ctx.barco, per = this.ctx.peregrino;
    b.conduzir(dt, desejo, cheia, this.ctx.ermo);
    if (b.encalhou && this.avisoEncalhe <= 0) {
      this.ctx.hud.anunciar('O casco raspou no fundo: aqui a água é rasa demais para o barco.', 2);
      this.ctx.combate.tremer(0.3, 0.2, 150);
      this.avisoEncalhe = 3;
    }
    this.avisoEncalhe = Math.max(0, this.avisoEncalhe - dt);
    const l = b.lugarDoPeregrino();
    per.teleportar(l.x, l.y, l.z);
    per.rumo = b.rumo;
    per.timoneiro = b.timoneiro;
    per.atualizar(dt, { altura: () => l.y, colidir: () => {} }, new THREE.Vector3(), 0, false, null);
    b.prenderAoAssento(per.raiz);
    this.ctx.som.navegar(b.somDaAgua);
    if (b.jaibe) this.ctx.som.jaibe();
    this.somVela -= dt;
    if (b.panejo > 0.35 && this.somVela <= 0) {
      this.somVela = 0.18 + Math.random() * 0.25;
      this.ctx.som.panejar(b.panejo);
    }
    this.somCasco -= dt;
    if (this.somCasco <= 0) {
      this.somCasco = 3 + Math.random() * 5;
      this.ctx.som.rangido();
    }
    this.guardarBarco();
  }
  avisoEncalhe = 0;
  somVela = 0;
  somCasco = 2;
}
