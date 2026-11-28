import * as THREE from 'three';
import { CHEFOES } from '../core/Estado';
import { REGIOES } from '../historia/Regioes';
import { Minimapa, Marca } from '../ui/Minimapa';
import { type Sistema, Parte } from './Sistema';

/** O minimapa: o fundo do mundo aberto (pintado pela obra), a área, as marcas e a rosa dos ventos do Conselho. */
export class SistemaMapas extends Parte implements Sistema {
  minimapa = new Minimapa();
  /** Área cuja base o minimapa está mostrando. */
  areaNoMapa = '';
  readonly centroMapaErmo = new THREE.Vector2();
  /** Um mapa do ermo já foi pedido à obra e ainda não chegou. */
  mapaErmoPedido = false;
  /** O fundo do mundo aberto está (ou vai estar) no minimapa. */
  fundoNoMapa = false;

  atualizar() {
    this.atualizarMinimapa();
  }

  atualizarMinimapa() {
    const a = this.ctx.area;
    // o mapa do ermo é um quadrado em volta do peregrino, pintado pela obra (fora do thread do jogo): pede-se outro
    // quando ele se afasta do centro, e o antigo continua na tela até o novo chegar
    // no mundo aberto o fundo é o chão do mundo (terra e mar de fora da região), e a região vai por cima
    const pm = this.ctx.peregrino.pos;
    if (this.ctx.regioes.aberto) {
      const longe = Math.hypot(pm.x - this.centroMapaErmo.x, pm.z - this.centroMapaErmo.y) > 30;
      if (!this.mapaErmoPedido && (longe || this.areaNoMapa === '' || !this.fundoNoMapa)) {
        this.centroMapaErmo.set(pm.x, pm.z);
        this.mapaErmoPedido = true;
        this.fundoNoMapa = true;
        this.ctx.ermo.pedirMapa(pm.x, pm.z, (f, px) => {
          this.mapaErmoPedido = false;
          if (this.ctx.regioes.aberto) this.minimapa.definirFundo(f, px);
        });
      }
    } else if (this.fundoNoMapa) {
      this.fundoNoMapa = false;
      this.minimapa.definirFundo(null);
    }
    if (this.areaNoMapa !== a.id) {
      this.areaNoMapa = a.id;
      if (a === this.ctx.ermoDoMundo) this.minimapa.soFundo(REGIOES.ermo.nome);
      else this.minimapa.definirArea(a.id, REGIOES[a.id].nome, a.fonteMapa());
    }
    const marcas: Marca[] = [];
    for (const i of this.ctx.interacoes.lista[a.id]) {
      if (i.ativa && !i.ativa()) continue;
      const tipo = typeof i.tipo === 'function' ? i.tipo() : i.tipo;
      if (tipo === 'nenhum') continue;
      const p = i.pos();
      marcas.push({ x: p.x, z: p.z, tipo });
    }
    if (this.ctx.regioes.aberto && !this.ctx.barco.aBordo) marcas.push({ x: this.ctx.barco.pos.x, z: this.ctx.barco.pos.z, tipo: 'barco' });
    for (const s of a.sombras) if (s.ativa && !s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: CHEFOES.includes(s.id) ? 'chefe' : 'sombra' });
    for (const s of a.sombras) if (s.ativa && s.id.includes('reflexo')) marcas.push({ x: s.pos.x, z: s.pos.z, tipo: 'chefe' });
    const p = this.ctx.peregrino.pos;
    const conselho = this.ctx.estado.nivel('conselho');
    this.minimapa.desenhar(p.x, p.z, this.ctx.camera.guinada, this.ctx.peregrino.rumo, marcas, { alvo: conselho >= 2 ? this.rumoDoCaminho() : null, raio: conselho >= 3 ? 60 : undefined });
  }

  /** O próximo passo do caminho na região, para a rosa dos ventos do Conselho (nível 2): cada região diz o seu. */
  rumoDoCaminho(): THREE.Vector3 | null {
    for (const m of this.ctx.modulos) if (m.rumo && m.areas.includes(this.ctx.area.id)) return m.rumo();
    return null;
  }
}
