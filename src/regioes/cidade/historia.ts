import * as THREE from 'three';
import type { Flag } from '../../historia/Flags';
import type { EventoInk } from '../../historia/EventosInk';
import { IdArea } from '../../mundo/Area';
import { NOME_ISCA, PEDRAS_DAMIAO, TOTAL_ATOS_CIDADE, TOTAL_SOMBRAS_CIDADE, type Isca, type Pobre } from '../../mundo/Cidade';
import { pedraDeCarregar } from '../../mundo/CidadeModelos';
import { enfermo } from '../../entidades/Enfermos';
import type { Ajudante, IdAjudante } from '../../mundo/Banquete';
import { DURACAO_CARINHO } from '../../entidades/Peregrino';
import { Sombra } from '../../entidades/Sombra';
import { AJUSTES } from '../../config/ajustes';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao, BarraDoChefe } from '../Modulo';
import type { Impacto } from '../../entidades/Guardiao';
import { Parte } from '../../sistemas/Sistema';

const NOME_AJUDANTE: Record<IdAjudante, string> = { tomas: 'Tomás', rita: 'Rita', beppo: 'Beppo', leproso: 'o homem curado' };
/** O que cada pobre diz quando o peregrino reparte com ele o peso do banquete. */
const FALA_REPARTIR: Record<IdAjudante, string> = {
  tomas: 'Tomás: "Você repartiu comigo. Agora eu reparto com você."',
  rita: 'Rita: "Me dê isso. Lá em casa tem três bocas."',
  beppo: 'Beppo: "Deixa que eu carrego! Eu sou forte!"',
  leproso: 'O homem curado: "Você me tocou quando ninguém tocava. Me dê o peso."',
};
/** Os atos de piedade da Cidade Dourada (flags do save). */
const ATOS_CIDADE: Flag[] = ['cidade_leproso', 'cidade_ajudou_tomas', 'cidade_ajudou_rita', 'cidade_ajudou_beppo', 'cidade_lobo', 'cidade_damiao'];
const NOME_POBRE: Record<Pobre['id'], string> = { tomas: 'Tomás', rita: 'Rita', beppo: 'Beppo' };
/** O que a Gula sussurra quando o peregrino pega uma isca. */
const SUSSURRO_ISCA: Record<Isca['tipo'], string> = {
  prato: 'Coma. Amanhã você jejua.',
  calice: 'Ouro puro. Ninguém vai sentir falta.',
  moedas: 'Guarde. Os pobres sempre vão existir.',
  taca: 'Só mais uma taça. Você merece.',
  coroa: 'Fica bem em você. Fique com ela.',
};

/**
 * A Cidade Dourada e o Palácio da Gula: as iscas de ouro e o peso, os pobres, o leproso, o lobo, São Damião pedra por
 * pedra, e o banquete sem fim, com quem o peregrino ajudou ao lado dele.
 */
export class HistoriaDaCidade extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['cidade', 'palacio'];
  /** Peso dos pratos da Gula, só durante a luta (some ao repartir, em jejum ou ao sair). */
  pesoBanquete = 0;
  jejum = 0;
  /** Com quem o peregrino já repartiu nesta luta (Piedade 3 devolve um coração uma vez por pessoa). */
  repartiu = new Set<IdAjudante>();

  async carregar() {
    await this.ctx.cidade.povoar();
    this.reiniciar();
  }

  reiniciar() {
    const e = this.ctx.estado;
    this.ctx.cidade.reiniciar(e.sombrasVencidas, e.flags);
    this.ctx.banquete.reiniciar(e.sombrasVencidas, e.flags);
    this.pesoBanquete = 0;
  }

  interacoes() {
    return { cidade: this.interacoesDaCidade(), palacio: this.interacoesDoBanquete() };
  }

  evento(nome: EventoInk) {
    return this.eventoDaCidade(nome);
  }

  valor(chave: string) {
    if (chave === 'ajudantes') return this.ctx.banquete.quantosVieram;
    if (chave === 'custo_piedade') return this.custoPiedade();
    if (chave === 'pedras') return this.ctx.cidade.pedrasAssentadas;
    if (chave === 'faltam_pobres') return this.ctx.cidade.pobres.filter((p) => !this.ctx.estado.flags.has(`cidade_ajudou_${p.id}`)).length;
    return undefined;
  }

  atualizarDepois() {
    this.atualizarCidade();
  }

  /** No palácio, o ouro falso da Gula brilha sempre. */
  cor(id: IdArea) {
    return id === 'palacio' ? 1 : this.corDaCidade();
  }

  chefe() {
    return this.ctx.area === this.ctx.banquete ? this.ctx.banquete.gula : null;
  }

  barraDoChefe(): BarraDoChefe | null {
    const gu = this.ctx.area === this.ctx.banquete ? this.ctx.banquete.gula : null;
    if (!gu || !this.ctx.banquete.lutando || !gu.ativa) return null;
    return { nome: 'GULA · O BANQUETE SEM FIM', fracao: gu.vida / gu.vidaMax, protegido: !gu.faminta, alerta: gu.alerta };
  }

  lutando() {
    return this.ctx.banquete.lutando;
  }

  aoMorrer() {
    this.ctx.banquete.reiniciarLuta();
    this.pesoBanquete = 0;
  }

  sombraVencida(s: Sombra) {
    if (s.id !== 'palacio_gula') return false;
    this.ctx.banquete.chefeVencido();
    this.pesoBanquete = 0;
    this.ctx.marcar('gula_vencida');
    this.ctx.agenda.depois(0.9, () => this.gulaVencida());
    return true;
  }

  aposVencerSombra(s: Sombra) {
    if (s.id.startsWith('cidade_')) this.verificarCidadeRestaurada();
  }

  pesoExtra() {
    return this.pesoBanquete;
  }

  tirarPeso() {
    this.pesoBanquete = 0;
  }

  aoRezar(dt: number) {
    // jejum: rezando, o peso do banquete vai embora aos poucos
    if (this.pesoBanquete > 0) {
      this.jejum += dt;
      if (this.jejum >= AJUSTES.oracao.jejum) {
        this.jejum = 0;
        this.pesoBanquete--;
        this.ctx.som.oracao();
        this.ctx.hud.anunciar(this.pesoBanquete > 0 ? `O jejum alivia: peso ${this.pesoBanquete}` : 'Leve de novo!', 1.4);
      }
    }
  }

  impacto(imp: Impacto) {
    if (imp.peso) {
      this.pesoBanquete = Math.min(8, this.pesoBanquete + imp.peso);
      this.ctx.som.moedas();
      this.ctx.peregrino.iniciar('ferido');
      this.ctx.hud.anunciar(`Um prato da Gula caiu em você. Pesa… (peso ${this.pesoBanquete})`, 1.6);
    }
  }

  oracaoDobrada(p: THREE.Vector3) {
    if (this.ctx.area !== this.ctx.cidade) return false;
    const c = this.ctx.cidade;
    if (p.distanceTo(c.cruzeiro) < 4 || p.distanceTo(c.francisco.pos) < 5 || c.capela.dentro(p)) return true;
    if (c.damiaoPronto && p.distanceTo(c.altarDamiao) < 4) return true;
    // Piedade 5 (Instrumento da paz): quem foi ajudado reza junto
    if (this.ctx.estado.nivel('piedade') >= 5)
      return c.pobres.some((q) => this.ctx.estado.flags.has(`cidade_ajudou_${q.id}`) && p.distanceTo(q.npc.pos) < 5) ||
        (this.ctx.estado.flags.has('cidade_leproso') && p.distanceTo(c.homemDaEstrada.pos) < 5);
    return false;
  }

  /** Atos de piedade já feitos na cidade. */
  atosDaCidade() {
    return ATOS_CIDADE.filter((f) => this.ctx.estado.flags.has(f)).length;
  }

  sombrasDaCidadeVencidas() {
    return [...this.ctx.estado.sombrasVencidas].filter((id) => id.startsWith('cidade_')).length;
  }

  /** A cor da cidade volta com as sombras vencidas e, sobretudo, com os atos de piedade. */
  corDaCidade() {
    const gula = this.ctx.estado.sombrasVencidas.has('palacio_gula') ? 1 : 0;
    return Math.min(1, (this.sombrasDaCidadeVencidas() + this.atosDaCidade() + gula) / (TOTAL_SOMBRAS_CIDADE + TOTAL_ATOS_CIDADE + 1));
  }

  verificarCidadeRestaurada() {
    if (this.corDaCidade() >= 0.999 && this.ctx.primeiraVez('cidade_restaurada')) this.ctx.dialogos.tocar('cidade_restaurada');
  }

  /** Energia que custa socorrer alguém (Piedade 2: Partilha). */
  custoPiedade() {
    return this.ctx.estado.nivel('piedade') >= 2 ? 12 : 20;
  }

  /** Um ato de piedade feito: graça, luz e, com Misericórdia (Piedade 3), um coração. */
  atoDePiedade(flag: Flag, aviso: string) {
    if (this.ctx.estado.flags.has(flag)) return;
    this.ctx.estado.flags.add(flag);
    this.ctx.estado.gracas += 1;
    if (this.ctx.estado.nivel('piedade') >= 3) this.ctx.estado.coracoes = Math.min(this.ctx.estado.coracoesMax, this.ctx.estado.coracoes + 1);
    this.ctx.estado.salvar();
    this.ctx.efeitos.ouro = 0.9;
    this.ctx.som.graca();
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar(`✦ ${aviso} · ato de piedade ${this.atosDaCidade()} de ${TOTAL_ATOS_CIDADE}`, 3);
    this.ctx.agenda.depois(2.5, () => this.verificarCidadeRestaurada());
  }

  /** Efeitos pedidos pelo roteiro da cidade. Devolve true se o evento era daqui. */
  eventoDaCidade(nome: EventoInk) {
    const c = this.ctx.cidade, e = this.ctx.estado;
    if (nome === 'dom_piedade') {
      this.ctx.marcar('dom_piedade');
      this.ctx.som.item();
      this.ctx.efeitos.ouro = 1.2;
      this.ctx.graca.tempoColuna = 0;
      this.ctx.hud.anunciar('Você recebeu o dom da Piedade!', 3.5);
      return true;
    }
    if (nome === 'curar_leproso') {
      e.energia = Math.max(0, e.energia - this.custoPiedade());
      c.mostrarLeproso(true);
      this.atoDePiedade('cidade_leproso', 'O leproso foi curado');
      return true;
    }
    if (nome === 'pacto_lobo') {
      c.pactoLobo();
      this.ctx.som.voz('uivo', 0.6);
      this.atoDePiedade('cidade_lobo', 'A paz com o irmão lobo');
      return true;
    }
    const m = /^(socorrer|doar|retribuir)_(\w+)$/.exec(nome);
    if (!m) return false;
    const [, acao, quem] = m;
    if (acao === 'retribuir') {
      e.restaurar();
      e.salvar();
      this.ctx.efeitos.ouro = 0.7;
      this.ctx.som.graca();
      const nome = quem === 'leproso' ? 'O homem curado' : NOME_POBRE[quem as Pobre['id']] ?? quem;
      this.ctx.hud.anunciar(`🍞 ${nome} retribuiu: suas forças voltaram`, 3);
      return true;
    }
    const pobre = c.pobres.find((p) => p.id === quem);
    if (!pobre) return false;
    if (acao === 'doar') {
      e.peso = Math.max(0, e.peso - 1);
      e.salvar();
      this.ctx.som.moedas();
      if (this.ctx.estado.flags.has(`cidade_ajudou_${quem}`)) this.ctx.hud.anunciar(e.peso > 0 ? `O ouro ficou mais leve (peso ${e.peso})` : 'Você está leve de novo', 2.2);
      else this.atoDePiedade(`cidade_ajudou_${quem}`, `${NOME_POBRE[pobre.id]} recebeu o ouro`);
      return true;
    }
    e.energia = Math.max(0, e.energia - this.custoPiedade());
    this.atoDePiedade(`cidade_ajudou_${quem}`, `Você socorreu ${NOME_POBRE[pobre.id]}`);
    return true;
  }

  /** Pegar uma isca da Gula: um alívio na hora, e peso depois. */
  pegarIsca(i: Isca) {
    const e = this.ctx.estado;
    i.pega = true;
    i.malha.visible = false;
    e.flags.add(i.id);
    e.peso += 1;
    if (i.tipo === 'prato') e.coracoes = Math.min(e.coracoesMax, e.coracoes + 1);
    else e.energia = Math.min(e.energiaMax, e.energia + (i.tipo === 'taca' ? 30 : 20));
    e.salvar();
    this.ctx.som.moedas();
    this.ctx.hud.sussurrar(SUSSURRO_ISCA[i.tipo], 3.2);
    this.ctx.hud.anunciar(`Você pegou ${NOME_ISCA[i.tipo]}. Pesa…`, 2.2);
    if (this.ctx.primeiraVez('cidade_dica_peso')) this.ctx.agenda.depois(1.2, () => this.ctx.dialogos.tocar('cidade_dica_peso'));
  }

  interacoesDaCidade(): Interacao[] {
    const c = this.ctx.cidade;
    const f = (x: Flag) => this.ctx.estado.flags.has(x);
    return [
      { pos: () => c.cruzeiro, raio: 2.6, rotulo: 'F: contemplar o cruzeiro', tipo: MARCA.lugar, agir: () => this.ctx.dialogos.tocar('cidade_cruzeiro') },
      {
        pos: () => c.fonte,
        raio: 3,
        rotulo: 'F: beber da fonte',
        tipo: MARCA.descanso,
        agir: () => {
          this.ctx.sacramentos.descansar(c.fonte.clone().add(new THREE.Vector3(0, 0, 3)), 'Você bebeu da fonte da praça. O caminho foi guardado aqui.');
          if (this.ctx.primeiraVez('cidade_fonte')) this.ctx.dialogos.tocar('cidade_fonte');
        },
      },
      {
        pos: () => c.portaPalacio,
        raio: 3,
        rotulo: () => (!this.portasDoPalacioAbertas() ? 'F: bater às portas de ouro' : f('gula_vencida') ? 'F: entrar no salão do banquete' : 'F: entrar no palácio'),
        tipo: MARCA.lugar,
        agir: () => {
          if (!this.portasDoPalacioAbertas()) {
            this.ctx.dialogos.tocar('cidade_palacio');
            return;
          }
          // quem o peregrino ajudou até agora vem com ele
          this.ctx.banquete.reiniciar(this.ctx.estado.sombrasVencidas, this.ctx.estado.flags);
          this.ctx.regioes.trocarArea(this.ctx.banquete, this.ctx.banquete.chegada, Math.PI, () => {
            if (this.ctx.primeiraVez('palacio_entrou')) this.ctx.dialogos.tocar('palacio_chegada');
          });
        },
      },
      this.ctx.interacoes.falarCom(c.francisco),
      this.ctx.interacoes.conversaCom(() => c.homemDaEstrada, 'leproso', () => (f('cidade_leproso') ? 'F: falar com o homem curado' : f('dom_piedade') ? 'F: socorrer o leproso' : 'F: falar com o leproso')),
      this.ctx.interacoes.falarCom(c.mercador),
      ...c.pobres.map((p) =>
        this.ctx.interacoes.conversaCom(() => p.npc, p.id, () =>
          f(`cidade_ajudou_${p.id}`) ? `F: falar com ${NOME_POBRE[p.id]}` : this.ctx.estado.peso > 0 ? `F: dar o ouro a ${NOME_POBRE[p.id]}` : f('dom_piedade') ? `F: socorrer ${NOME_POBRE[p.id]}` : `F: falar com ${NOME_POBRE[p.id]}`,
        ),
      ),
      // São Damião: pedra por pedra
      {
        pos: () => c.pedreira,
        raio: 2.8,
        ativa: () => f('cidade_leproso') && !c.damiaoPronto && !this.ctx.peregrino.carregando,
        rotulo: 'F: pegar uma pedra',
        tipo: MARCA.lugar,
        agir: () => {
          this.ctx.peregrino.carregar(pedraDeCarregar());
          this.ctx.som.passo();
          this.ctx.hud.anunciar('A pedra é pesada: sem pulo, e devagar. Leve-a a São Damião.', 2.6);
        },
      },
      {
        pos: () => c.damiao,
        raio: 3,
        ativa: () => this.ctx.peregrino.carregando,
        rotulo: 'F: assentar a pedra',
        tipo: MARCA.lugar,
        agir: () => {
          const n = c.pedrasAssentadas + 1;
          this.ctx.peregrino.carregar(null);
          this.ctx.marcar(`cidade_pedra_${n}`);
          c.definirEstagioDamiao(n);
          this.ctx.som.bloqueio();
          this.ctx.efeitos.ouro = 0.4;
          if (n >= PEDRAS_DAMIAO) {
            this.ctx.som.portao();
            this.atoDePiedade('cidade_damiao', 'São Damião foi reconstruída');
            this.ctx.agenda.depois(1.4, () => {
              c.francisco.falando = true;
              this.ctx.dialogos.tocar('francisco', () => (c.francisco.falando = false));
            });
          } else this.ctx.hud.anunciar(`Pedra assentada: ${n} de ${PEDRAS_DAMIAO}`, 2);
        },
      },
      {
        pos: () => c.altarDamiao,
        raio: 2.2,
        ativa: () => c.damiaoPronto,
        rotulo: 'F: rezar em São Damião',
        tipo: MARCA.lugar,
        agir: () => this.ctx.sacramentos.descansar(c.altarDamiao.clone().add(new THREE.Vector3(1.6, 0, 0)), 'Você rezou diante da cruz de São Damião. O caminho foi guardado aqui.'),
      },
      // o lobo
      {
        pos: () => c.lobo?.pos ?? c.toca,
        raio: 4.5,
        ativa: () => c.estadoLobo === 'toca',
        rotulo: () => (f('dom_piedade') ? 'F: aproximar-se do lobo' : 'F: olhar a toca do lobo'),
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('lobo_toca'),
      },
      {
        pos: () => c.lobo?.pos ?? c.fonte,
        raio: 1.9,
        ativa: () => c.estadoLobo === 'cidade',
        rotulo: 'F: fazer carinho no irmão lobo',
        tipo: MARCA.nenhum,
        agir: () => {
          const l = c.lobo!;
          const per = this.ctx.peregrino;
          per.rumo = Math.atan2(l.pos.x - per.pos.x, l.pos.z - per.pos.z);
          per.carinhoAlto = false;
          per.iniciar('carinho');
          l.carinho = DURACAO_CARINHO;
          this.ctx.agenda.depois(0.7, () => this.ctx.som.voz('uivo', 0.35));
        },
      },
      ...c.iscas.map((i) => ({
        pos: () => i.pos,
        raio: 1.6,
        ativa: () => !i.pega,
        rotulo: `F: pegar ${NOME_ISCA[i.tipo]}`,
        tipo: MARCA.lugar,
        agir: () => this.pegarIsca(i),
      })),
      ...this.ctx.sacramentos.interacoesDaCapela(c.capela, 'cidade_altar'),
    ];
  }

  /** A cada quadro: o peso na tela e no corpo, e o lobo chegando à praça. */
  atualizarCidade() {
    const peso = this.ctx.estado.peso + this.pesoBanquete;
    this.ctx.peregrino.mostrarPeso(peso);
    this.ctx.hud.mostrarPeso(
      this.pesoBanquete > 0 ? `⚖ Banquete da Gula · peso ${peso}` : peso > 0 ? `⚖ Ouro da Gula · peso ${peso}` : this.ctx.nasCostas ? `⚖ ${this.ctx.nasCostas === 'menino' ? 'O menino' : enfermo(this.ctx.nasCostas)?.nome} nas costas` : this.ctx.peregrino.carregando ? '⚖ Pedra para São Damião' : null,
    );
    if (this.ctx.area !== this.ctx.cidade || this.ctx.hud.dialogoAberto || this.ctx.regioes.dormente) return;
    const f = this.ctx.estado.flags;
    if (this.ctx.cidade.estadoLobo === 'cidade' && f.has('cidade_lobo') && !f.has('cidade_lobo_praca')) this.ctx.dialogos.tocar('lobo_cidade');
    else if (f.has('dom_piedade') && this.ctx.cidade.dentroDosMuros(this.ctx.peregrino.pos) && this.ctx.primeiraVez('cidade_dica_pobres')) this.ctx.dialogos.tocar('cidade_dica_pobres');
  }

  /** As portas de ouro abrem quando São Damião está de pé e o lobo está em paz. */
  portasDoPalacioAbertas() {
    const f = this.ctx.estado.flags;
    return f.has('cidade_portas_abertas') || (f.has('cidade_damiao') && f.has('cidade_lobo'));
  }

  interacoesDoBanquete(): Interacao[] {
    const b = this.ctx.banquete;
    const c = this.ctx.cidade;
    const repartir = (a: Ajudante): Interacao => ({
      pos: () => a.npc.pos,
      raio: 2.4,
      ativa: () => a.presente && b.lutando,
      rotulo: () => (this.pesoBanquete > 0 ? `F: repartir o banquete com ${NOME_AJUDANTE[a.id]}` : `F: falar com ${NOME_AJUDANTE[a.id]}`),
      tipo: MARCA.pessoa,
      agir: () => this.repartirCom(a),
    });
    return [
      {
        pos: () => b.saida,
        raio: 2.6,
        ativa: () => !b.lutando,
        rotulo: 'F: voltar à cidade',
        tipo: MARCA.saida,
        agir: () => this.ctx.regioes.trocarArea(c, c.portaPalacio.clone().add(new THREE.Vector3(0, 0, 2.4)), 0),
      },
      ...b.ajudantes.map(repartir),
      ...b.ajudantes.map((a) => ({ ...this.ctx.interacoes.conversaCom(() => a.npc, `palacio_${a.id}`, `F: falar com ${NOME_AJUDANTE[a.id]}`), ativa: () => a.presente && b.vencido })),
      {
        pos: () => b.centro,
        raio: 3,
        ativa: () => b.vencido,
        rotulo: 'F: sentar-se à mesa dos pobres',
        tipo: MARCA.lugar,
        agir: () => this.ctx.sacramentos.descansar(b.centro.clone().add(new THREE.Vector3(0, 0, 2)), 'Você comeu o pão com os pobres. O caminho foi guardado aqui.'),
      },
    ];
  }

  /** Reparte com um pobre o peso do banquete: ele leva tudo (Piedade 3: e devolve um coração, uma vez). */
  repartirCom(a: Ajudante) {
    if (this.pesoBanquete <= 0) {
      this.ctx.hud.anunciar(`${NOME_AJUDANTE[a.id][0].toUpperCase()}${NOME_AJUDANTE[a.id].slice(1)} está com você. Quando pesar, reparta (F).`, 2);
      return;
    }
    this.pesoBanquete = 0;
    this.jejum = 0;
    a.npc.falando = true;
    this.ctx.agenda.depois(1.6, () => (a.npc.falando = false));
    this.ctx.som.graca();
    this.ctx.efeitos.ouro = 0.5;
    let extra = '';
    if (this.ctx.estado.nivel('piedade') >= 3 && !this.repartiu.has(a.id) && this.ctx.estado.coracoes < this.ctx.estado.coracoesMax) {
      this.ctx.estado.coracoes = Math.min(this.ctx.estado.coracoesMax, this.ctx.estado.coracoes + 1);
      extra = ' ❤️';
    }
    this.repartiu.add(a.id);
    this.ctx.hud.anunciar(FALA_REPARTIR[a.id] + extra, 2.6);
  }

  lutaBanqueteComecou() {
    this.ctx.som.tensao();
    this.pesoBanquete = 0;
    this.repartiu.clear();
    this.ctx.hud.anunciar('Gula, o Banquete sem fim', 3);
    if (this.ctx.primeiraVez('palacio_dica')) this.ctx.dialogos.tocar('palacio_gula');
  }

  banqueteServido(primeira: boolean) {
    if (primeira) return;
    this.ctx.som.moedas();
    this.ctx.hud.anunciar('O banquete não acaba: as travessas voltaram!', 2);
  }

  travessaCaiu(restantes: number) {
    this.ctx.som.bloqueio();
    this.ctx.hud.acertou();
    if (restantes > 0) this.ctx.hud.anunciar(`Travessa derrubada · ${restantes === 1 ? 'falta 1' : `faltam ${restantes}`}`, 1.3);
  }

  gulaVencida() {
    this.ctx.efeitos.ouro = 1.4;
    this.ctx.som.graca();
    this.ctx.agenda.depois(0.6, () => this.ctx.som.item());
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar('✦ A Gula se desfez: a mesa é dos pobres', 3);
    this.ctx.dialogos.tocar('palacio_vencida', () => this.verificarCidadeRestaurada());
  }
}
