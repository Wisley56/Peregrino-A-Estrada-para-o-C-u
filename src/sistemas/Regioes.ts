import * as THREE from 'three';
import { REGIOES, cumpre } from '../historia/Regioes';
import { type Idade, identidadePadrao, visualDe } from '../core/Aparencia';
import { Npc } from '../entidades/Npc';
import { Area, IdArea } from '../mundo/Area';
import { ORIGENS } from '../mundo/aberto/Geografia';
import { Carimbo, TerrenoMundo } from '../mundo/aberto/TerrenoMundo';
import { type Sistema, Parte } from './Sistema';

/**
 * As áreas e as regiões: qual é a atual, a passagem de uma a outra (a pé ou pelo véu escuro), as regiões que dormem
 * até a hora da história delas, o que se vê do mundo aberto, o checkpoint de chegada e a idade do peregrino.
 */
export class SistemaRegioes extends Parte implements Sistema {
  /** As regiões ao ar livre, que têm lugar no mapa do mundo (as outras áreas são interiores e cenas à parte). */
  regioesAbertas(): Area[] {
    return [this.ctx.mundo, this.ctx.deserto, this.ctx.cidade, this.ctx.bahiaAlta, this.ctx.bahiaBaixa, this.ctx.creta, this.ctx.naufragio, this.ctx.malta];
  }

  /** O peregrino está no mundo aberto (numa região ao ar livre ou no ermo entre elas)? */
  get aberto() {
    return this.ctx.area === this.ctx.ermoDoMundo || this.regioesAbertas().includes(this.ctx.area);
  }

  /**
   * O chão em que o peregrino pisa: no mundo aberto é o do mundo inteiro (o ermo responde pela região que manda em
   * cada ponto), para ele atravessar de uma região a outra sem trocar de chão; num interior, é o da própria área.
   */
  get fisica(): Area {
    return this.aberto ? this.ctx.ermo : this.ctx.area;
  }

  /** A área que dá a cor e o nome da cor na tela: no ermo, a região mais próxima. */
  areaDaRegiao(): Area {
    if (this.ctx.area !== this.ctx.ermoDoMundo) return this.ctx.area;
    const p = this.ctx.peregrino.pos, t = this.ctx.terrenoMundo;
    let melhor = this.ctx.mundo as Area, d = Infinity;
    for (const a of this.regioesAbertas()) {
      const c = t.carimboDe(a.id);
      const dist = c ? t.distancia(c, p.x, p.z) : Infinity;
      if (dist < d) {
        d = dist;
        melhor = a;
      }
    }
    return melhor;
  }

  relogioRegiao = 0;
  /**
   * No mundo aberto, a área atual é a região em que o peregrino está (ou o ermo): muda sozinha quando ele cruza a
   * borda, sem véu. A folga de 3 m evita ficar trocando para lá e para cá em cima da linha.
   */
  reverRegiao(dt: number) {
    if (!this.aberto || this.ctx.transitando) return;
    const p = this.ctx.peregrino.pos, t = this.ctx.terrenoMundo;
    // a primeira região da lista que tem o ponto manda (a Cidade Alta vem antes da Baixa, que a abraça); a atual
    // segura até 3 m fora dela, as outras só tomam 3 m para dentro
    const atual = t.carimboDe(this.ctx.area.id);
    const c = t.carimbos.find((k) => t.distancia(k, p.x, p.z) < (k === atual ? 3 : -3)) ?? null;
    if (c !== atual && (c || !atual || t.distancia(atual, p.x, p.z) > 3)) {
      const nova = c ? this.areaPorId(c.id) : this.ctx.ermo;
      if (nova !== this.ctx.area) this.entrarEm(nova);
    }
    this.relogioRegiao -= dt;
    if (this.relogioRegiao <= 0) {
      this.relogioRegiao = 0.5;
      this.verRegioes();
    }
  }

  /** A cada quadro: a região muda sozinha na borda, a área anda e o chão do mundo acompanha o peregrino. */
  atualizar(dt: number) {
    const per = this.ctx.peregrino;
    this.reverRegiao(dt);
    this.ctx.area.atualizar?.(dt, per.pos);
    // os chunks e o mar do mundo acompanham o peregrino também dentro das regiões
    if (this.aberto && this.ctx.area !== this.ctx.ermoDoMundo) this.ctx.ermo.atualizar(dt, per.pos);
  }

  /** Entra numa região (ou no ermo) andando: a luz, a névoa e o céu mudam aos poucos, e a cor não salta. */
  entrarEm(nova: Area) {
    const de = this.ctx.ambiente.fotoDoAmbiente();
    const deArea = this.ctx.area.id;
    this.ctx.area = nova;
    this.visitar(nova);
    this.ctx.eventos.emitir('entrouNaArea', { de: deArea, para: nova.id });
    this.ctx.ambiente.aplicarAmbiente();
    this.ctx.ambiente.mistura = { de, para: this.ctx.ambiente.fotoDoAmbiente(), t: 0 };
    this.ctx.ambiente.porAmbiente(de, de, 0);
    this.ctx.ambiente.semSaltoDeCor = true;
    if (!this.regioesAbertas().includes(nova)) return;
    if (this.acordada(nova.id)) this.chegouAndando(nova);
    else this.ctx.hud.anunciar(`${REGIOES[nova.id].nome}: a história daqui ainda dorme. Ela espera a hora dela.`, 3.4);
  }

  /**
   * A história de uma região ao ar livre já chegou lá? Vai-se a qualquer lugar a qualquer hora (a pé, a nado), mas
   * a região alcançada antes do capítulo dela fica **adormecida**: sem cor, sem santos, sem chefão e sem cenas, até
   * a hora dela. As condições são as que antes abriam a passagem com F para ela.
   */
  acordada(id: IdArea) {
    const r = REGIOES[id].acorda;
    return !r || cumpre(r, { tem: (f) => this.ctx.estado.flags.has(f), venceu: (s) => this.ctx.estado.sombrasVencidas.has(s), veuAberto: this.ctx.mundo.veuAberto });
  }

  /** A área atual é uma região adormecida. */
  get dormente() {
    return this.ctx.area !== this.ctx.ermoDoMundo && this.regioesAbertas().includes(this.ctx.area) && !this.acordada(this.ctx.area.id);
  }

  /** Quais regiões dormiam da última vez que se olhou (para só mexer no que mudou). */
  readonly sono = new Map<IdArea, boolean>();
  /** Os santos escondidos de cada região adormecida, e se estavam visíveis antes. */
  readonly santosEscondidos = new Map<IdArea, Map<Npc, boolean>>();

  /**
   * Põe para dormir (ou acorda) cada região conforme a história: a região sabe o que não pode começar sozinha; os
   * santos dela (os de modelo próprio, com a iconografia) somem até a hora deles.
   */
  revisarSono() {
    const t = this.ctx.terrenoMundo;
    for (const a of this.regioesAbertas()) {
      const dorme = !this.acordada(a.id);
      const c = t.carimboDe(a.id);
      // enquanto dorme, um santo que a própria região tornar a mostrar (ao se rearrumar) volta a sumir
      const esconder = (vistos: Map<Npc, boolean>) => {
        for (const n of Npc.lista)
          if (typeof n.def.visual === 'function' && n.raiz.visible && c && t.distancia(c, n.pos.x, n.pos.z) <= 0) {
            vistos.set(n, true);
            n.raiz.visible = false;
          }
      };
      if (this.sono.get(a.id) === dorme) {
        if (dorme) esconder(this.santosEscondidos.get(a.id) ?? new Map());
        continue;
      }
      this.sono.set(a.id, dorme);
      if (dorme) {
        const vistos = new Map<Npc, boolean>();
        esconder(vistos);
        this.santosEscondidos.set(a.id, vistos);
        a.dormir?.(true);
      } else {
        for (const [n, v] of this.santosEscondidos.get(a.id) ?? []) n.raiz.visible = v;
        this.santosEscondidos.delete(a.id);
        a.dormir?.(false);
      }
      // o tempo de lá muda com o sono (o naufrágio: a enseada calma ou a tempestade)
      if (a === this.ctx.area) this.ctx.ambiente.aplicarAmbiente();
    }
  }

  /**
   * Chegou a pé (ou a nado) a uma região acordada: o que a passagem com F fazia na chegada. Na primeira vez, a fala
   * de chegada, e o lugar de chegada da região passa a ser o checkpoint.
   */
  chegouAndando(a: Area) {
    const def = REGIOES[a.id];
    const fala = () => {
      if (!def.chegada || !def.entrou || !this.ctx.primeiraVez(def.entrou)) return;
      this.guardarChegada(a);
      this.ctx.dialogos.tocar(def.chegada);
    };
    // uma região pode fazer a chegada do jeito dela (a Bahia: os anos passam no caminho)
    for (const m of this.ctx.modulos) if (m.chegouAndando?.(a, fala)) return;
    fala();
  }

  /** O lugar de chegada de uma região passa a ser o checkpoint (o peregrino volta para lá se cair). */
  guardarChegada(a: Area) {
    const c = (a as Area & { chegada?: THREE.Vector3 }).chegada;
    if (!c) return;
    this.ctx.estado.checkpoint = [c.x, a.altura(c.x, c.z), c.z];
    this.ctx.estado.checkpointArea = a.id;
    this.ctx.estado.salvar();
  }

  /**
   * O que do mundo aberto se vê agora: a região em que se está, as vizinhas que a névoa deixa ver, e o ermo. O mar
   * e a chuva próprios de uma região só aparecem com o peregrino dentro dela; fora, vê-se o mar do mundo.
   */
  verRegioes() {
    const ab = this.aberto;
    const p = this.ctx.peregrino.pos, t = this.ctx.terrenoMundo;
    const alcance = Math.max(400, (this.ctx.ambiente.mistura?.para.longe ?? (this.ctx.cena.fog as THREE.Fog).far) + 80);
    for (const a of this.regioesAbertas()) {
      const c = t.carimboDe(a.id);
      const perto = ab && !!c && t.distancia(c, p.x, p.z) < alcance;
      a.grupo.visible = a === this.ctx.area || perto;
      // a baía é a da Cidade Baixa, e é ela que se vê também do alto da escarpa
      a.presente?.(a === this.ctx.area || (a === this.ctx.bahiaBaixa && this.ctx.area === this.ctx.bahiaAlta));
    }
    this.revisarSono();
    this.ctx.barco.grupo.visible = ab && Math.hypot(this.ctx.barco.pos.x - p.x, this.ctx.barco.pos.z - p.z) < alcance;
    this.ctx.barco.efeitos.visible = this.ctx.barco.grupo.visible;
    if (ab) this.ctx.viagem.descobrirPelaVolta();
    this.ctx.ermo.grupo.visible = ab;
    const marProprio = this.ctx.area === this.ctx.creta || this.ctx.area === this.ctx.naufragio || this.ctx.area === this.ctx.malta || this.ctx.area === this.ctx.bahiaBaixa || this.ctx.area === this.ctx.bahiaAlta;
    this.ctx.ermo.mostrarMar(ab && !marProprio);
  }

  areaPorId(id: IdArea): Area {
    return id === 'cripta' ? this.ctx.cripta : id === 'deserto' ? this.ctx.deserto : id === 'meiodia' ? this.ctx.meiodia : id === 'cidade' ? this.ctx.cidade : id === 'palacio' ? this.ctx.banquete : id === 'bahiabaixa' ? this.ctx.bahiaBaixa : id === 'bahiaalta' ? this.ctx.bahiaAlta : id === 'creta' ? this.ctx.creta : id === 'navio' ? this.ctx.navio : id === 'naufragio' ? this.ctx.naufragio : id === 'malta' ? this.ctx.malta : id === 'ermo' ? this.ctx.ermo : this.ctx.mundo;
  }

  /** Marca a área como visitada (o mapa-múndi a revela). O ermo não conta: dele ficam as quadras pisadas. */
  visitar(a: Area) {
    if (a === this.ctx.ermoDoMundo || this.ctx.estado.visitadas.has(a.id)) return;
    this.ctx.estado.visitadas.add(a.id);
    this.ctx.estado.salvar();
  }

  /**
   * O chão do mundo inteiro: as regiões ao ar livre carimbadas no terreno procedural. A Cidade Alta fica a leste da
   * beira da escarpa e a Baixa a oeste dela (as duas dividem o mesmo pedaço do mapa).
   */
  criarTerrenoMundo() {
    const carimbo = (a: Area, faixa: number, corte: { xMin?: number; xMax?: number } = {}): Carimbo => {
      const f = a.fonteMapa();
      return {
        id: a.id, faixa,
        x0: Math.max(f.x0, corte.xMin ?? -Infinity), z0: f.z0, x1: Math.min(f.x0 + f.largura, corte.xMax ?? Infinity), z1: f.z0 + f.profundidade,
        altura: (x, z) => a.altura(x, z),
        cor: (x, z) => f.cor(x, z),
      };
    };
    const beira = ORIGENS.bahiaalta.x - 44;
    return new TerrenoMundo([
      carimbo(this.ctx.mundo, 90), carimbo(this.ctx.deserto, 90), carimbo(this.ctx.cidade, 90),
      // a Alta vem antes: onde as duas se sobrepõem (da beira para o leste) ela manda; ao norte e ao sul dela, a
      // escarpa continua sendo da Baixa
      carimbo(this.ctx.bahiaAlta, 80, { xMin: beira }), carimbo(this.ctx.bahiaBaixa, 80),
      carimbo(this.ctx.creta, 120), carimbo(this.ctx.naufragio, 100), carimbo(this.ctx.malta, 120),
    ]);
  }

  /** Escurece, troca de área, guarda o lugar de chegada como checkpoint e clareia. */
  trocarArea(destino: Area, pos: THREE.Vector3, rumo: number, depois?: () => void, manterCarga = false) {
    if (this.ctx.transitando) return;
    this.ctx.transitando = true;
    this.ctx.combate.travado = null;
    if (!manterCarga) this.ctx.peregrino.carregar(null);
    for (const m of this.ctx.modulos) m.tirarPeso?.();
    this.ctx.oracao.torpor = 0;
    this.ctx.hud.escurecer(true);
    this.ctx.agenda.depois(0.8, () => {
      this.ctx.combate.projeteis.forEach((p) => this.ctx.cena.remove(p.malha));
      this.ctx.combate.projeteis = [];
      this.ctx.barco.aBordo = false;
      const deArea = this.ctx.area.id;
      this.ctx.area = destino;
      this.visitar(destino);
      this.ctx.eventos.emitir('entrouNaArea', { de: deArea, para: destino.id });
      this.ctx.ambiente.aplicarAmbiente();
      const y = destino.altura(pos.x, pos.z);
      // um marco da história (a viagem para a Bahia): os anos passam no escuro da transição
      if (this.idadeDaHistoria() !== this.idadeVestida) this.vestirPeregrino();
      this.ctx.peregrino.teleportar(pos.x, y, pos.z);
      this.ctx.peregrino.rumo = rumo;
      this.ctx.camera.guinada = rumo + Math.PI;
      this.ctx.camera.reposicionar();
      this.ctx.pomba.raiz.position.set(pos.x, y + 3, pos.z);
      this.ctx.estado.checkpoint = [pos.x, y, pos.z];
      this.ctx.estado.checkpointArea = destino.id;
      this.ctx.estado.salvar();
      this.ctx.hud.escurecer(false);
      this.ctx.transitando = false;
      depois?.();
    });
  }

  posicionarNoCheckpoint() {
    this.ctx.navegacao.porBarco();
    this.ctx.area = this.areaPorId(this.ctx.estado.checkpointArea);
    this.ctx.ambiente.aplicarAmbiente();
    let [x, y, z] = this.ctx.estado.checkpoint;
    // um checkpoint fora da própria região (as regiões mudaram de lugar no mapa): volta à chegada dela
    const c = this.regioesAbertas().includes(this.ctx.area) ? this.ctx.terrenoMundo.carimboDe(this.ctx.area.id) : null;
    const chegada = (this.ctx.area as Area & { chegada?: THREE.Vector3 }).chegada;
    if (c && chegada && this.ctx.terrenoMundo.distancia(c, x, z) > 0) [x, y, z] = [chegada.x, this.ctx.area.altura(chegada.x, chegada.z), chegada.z];
    this.ctx.peregrino.teleportar(x, y, z);
    this.ctx.peregrino.rumo = Math.PI; // olhando para o norte
    this.ctx.camera.reposicionar();
    this.vestirPeregrino();
    this.ctx.dons.lamparinaAcesa = this.ctx.estado.flags.has('lamparina') && this.ctx.area === this.ctx.cripta;
    this.ctx.dons.atualizarLamparina();
    this.ctx.pomba.raiz.position.set(x, y + 3, z);
  }

  /**
   * A idade vem da história, não da criação (Documento base): jovem nas primeiras regiões (o Vale, o Deserto e a
   * Cidade Dourada), adulto da Bahia em diante (os anos passam na viagem por mar) e idoso no capítulo final.
   * `?idade=jovem|adulto|idoso` força uma idade para testar.
   */
  idadeDaHistoria(): Idade {
    const teste = new URLSearchParams(location.search).get('idade');
    if (teste === 'jovem' || teste === 'adulto' || teste === 'idoso') return teste;
    const f = this.ctx.estado.flags;
    return f.has('peregrino_adulto') || f.has('bahia_entrou') ? 'adulto' : 'jovem';
  }

  /** A idade com que o peregrino está vestido agora (para só remontar o boneco quando ela muda). */
  idadeVestida: Idade | null = null;

  /** Aplica a identidade salva (ou a padrão) com a idade em que a história está. */
  vestirPeregrino() {
    const id = this.ctx.estado.identidade ?? identidadePadrao();
    this.idadeVestida = this.idadeDaHistoria();
    this.ctx.peregrino.vestir(visualDe(id, this.idadeVestida));
  }

  /** Teleporta dentro da área ou troca de área (modo dev). */
  irPara(id: IdArea, pos: THREE.Vector3, rumo = Math.PI) {
    const destino = this.areaPorId(id);
    if (destino !== this.ctx.area) return this.trocarArea(destino, pos, rumo);
    const y = destino.altura(pos.x, pos.z);
    this.ctx.peregrino.teleportar(pos.x, y, pos.z);
    this.ctx.peregrino.rumo = rumo;
    this.ctx.camera.guinada = rumo + Math.PI;
    this.ctx.camera.reposicionar();
    this.ctx.pomba.raiz.position.set(pos.x, y + 3, pos.z);
    this.ctx.combate.travado = null;
  }

  /** Cura corações e energia e tira o peso, o torpor e o que vai nas costas (o painel do modo dev). */
  curar() {
    this.ctx.estado.restaurar();
    for (const m of this.ctx.modulos) m.tirarPeso?.();
    this.ctx.oracao.torpor = 0;
    this.ctx.peregrino.carregar(null);
  }
}
