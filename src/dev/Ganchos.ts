import * as THREE from 'three';
import type { Flag } from '../historia/Flags';
import { REGIOES } from '../historia/Regioes';
import { identidadePadrao } from '../core/Aparencia';
import { IdArea } from '../mundo/Area';
import { pontoDeViagem } from '../mundo/aberto/Geografia';
import { pintarMapa } from '../mundo/aberto/MapaDoTerreno';
import { ID_IRA } from '../mundo/Naufragio';
import { ID_CORACAO } from '../mundo/LargoDoCruzeiro';
import { CAPELA } from '../mundo/Terreno';
import { Sombra } from '../entidades/Sombra';
import type { AreaDev, ChefeDev, GanchosDev } from './tipos';
import type { Contexto } from '../jogo/Contexto';
import type { Jogo } from '../Jogo';

/**
 * Os ganchos do painel de depuração (F9): pontos de teleporte de cada região, as etapas da história, as lutas, e o
 * que o painel lê do jogo. Só existe no modo dev (quem importa é `Dev.ts`, que o build de produção descarta).
 */
export function ganchosDoJogo(ctx: Contexto, jogo: Jogo): GanchosDev {
  /** Para o painel de depuração (F3): o que o mundo aberto tem carregado e quanto custou montar. */
  const medidaDoMundo = () => {
    const e = ctx.ermoDoMundo!, c = e.chunks, r = e.recheio.medida;
    const fe = ctx.fauna.faunas.get('ermo'), bichos = fe?.animais, bandos = fe?.contagemSitios;
    const vivos = bichos ? bichos.filter((b) => b.raiz.visible).length : 0;
    return `chão: ${c.total} ladrilhos (${c.pendentes} na fila; ${c.medida.feitos} feitos em ${c.medida.ms.toFixed(0)} ms)
` +
      `recheio: ${r.celulas} células montadas em ${r.ms.toFixed(0)} ms · ${r.pecas} peças em cena · bichos do ermo ${vivos} à vista, ${bichos?.length ?? 0} soltos (${bandos?.soltos ?? 0} de ${bandos?.total ?? 0} bandos)`;
  };
  const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  const m = ctx.mundo, d = ctx.deserto, md = ctx.meiodia, c = ctx.cidade, b = ctx.banquete;
  const e = ctx.estado;
  const norte = Math.PI, oeste = -Math.PI / 2, sul = 0;
  const ponto = (nome: string, pos: THREE.Vector3, rumo = norte) => ({ nome, pos: pos.clone(), rumo });
  const areas = (): AreaDev[] => [
    { id: 'vale', nome: REGIOES.vale.nome, pontos: [
      ponto('Início', m.inicio), ponto('Fogueira', m.fogueira.clone().add(v(2, 2))), ponto('Cruzeiro', m.cruzeiro.clone().add(v(0, 2.5))),
      ponto('Jardim de Agostinho (porta)', m.jardim.porta, Math.PI / 2), ponto('Jardim de Agostinho (dentro)', m.jardim.livro.clone().add(v(-2.5, -0.3)), Math.PI / 2),
      ponto('Capela', v(CAPELA.x, CAPELA.y + 14)), ponto('Escada da cripta', m.entradaCripta.clone().add(v(0, 2.4)), norte),
      ponto('Véu do oeste', m.veu.clone().add(v(4, 0)), oeste), ponto('Fim da passagem', m.fimPassagem.clone().add(v(3, 0)), oeste),
    ] },
    { id: 'cripta', nome: REGIOES.cripta.nome, pontos: [
      ponto('Chegada', ctx.cripta.chegada), ponto('Arena de Mamom', ctx.cripta.centroArena.clone().add(v(0, 9))),
      ponto('Relicário', ctx.cripta.relicario.clone().add(v(0, 2.5))),
    ] },
    { id: 'deserto', nome: REGIOES.deserto.nome, pontos: [
      ponto('Chegada', d.chegada, oeste), ponto('Poço', d.poco.clone().add(v(3, 0)), oeste), ponto('Caverna de Santo Antão', d.caverna.clone().add(v(0, 4))),
      ponto('Rocha falsa', d.parede.clone().add(v(3, 0)), oeste), ponto('Fim da fenda', d.fimFenda.clone().add(v(2.5, 0)), oeste),
      ponto('Estrada do sul', d.estradaSul.clone().add(v(0, -3)), sul), ponto('Capela', d.capela.porta.clone().add(v(0, 3))),
    ] },
    { id: 'meiodia', nome: REGIOES.meiodia.nome, pontos: [ponto('Chegada', md.chegada, oeste), ponto('Praça (luta)', md.centro.clone().add(v(7, 0)), oeste)] },
    { id: 'cidade', nome: REGIOES.cidade.nome, pontos: [
      ponto('Chegada', c.chegada), ponto('Fonte', c.fonte.clone().add(v(0, 3))), ponto('Portas do palácio', c.portaPalacio.clone().add(v(0, 2.4))),
      ponto('São Damião', c.damiao.clone().add(v(0, 6))), ponto('Pedreira', c.pedreira.clone().add(v(0, 3))), ponto('Toca do lobo', c.toca.clone().add(v(0, 4))),
    ] },
    { id: 'palacio', nome: REGIOES.palacio.nome, pontos: [ponto('Chegada', b.chegada), ponto('Salão (luta)', b.centro.clone().add(v(0, 6)))] },
    { id: 'bahiabaixa', nome: REGIOES.bahiabaixa.nome, pontos: [
      ponto('Chegada (rampa do mercado)', ctx.bahiaBaixa.chegada, Math.PI / 2), ponto('Irmã Dulce e o menino', ctx.bahiaBaixa.dulceEmCena.pos.clone().add(v(-7, 0)), Math.PI / 2), ponto('Elevador Lacerda', ctx.bahiaBaixa.elevador, -Math.PI / 2),
      ponto('Hospital (dentro)', ctx.bahiaBaixa.hospital.entrada, Math.PI),
      ponto('Mercado Modelo', ctx.bahiaBaixa.mercado.clone().add(v(4, 0)), -Math.PI / 2), ponto('Largo de Roma e o galinheiro', ctx.bahiaBaixa.galinheiro.clone().add(v(0, 6))),
      ponto('Bonfim', ctx.bahiaBaixa.bonfim.clone().add(v(0, 10))), ponto('Alagados', ctx.bahiaBaixa.alagados.clone().add(v(3, 0)), -Math.PI / 2),
      ponto('Armazém do comerciante', ctx.bahiaBaixa.armazemPorta, Math.PI / 2),
      ponto('Galinheiro (porta)', ctx.bahiaBaixa.galinheiro, Math.PI),
      ponto('Bonfim (dentro)', ctx.bahiaBaixa.capela.porta.clone().add(v(0, -4)), Math.PI),
      ponto('Abrigo (porta do convento)', ctx.bahiaBaixa.conventoPorta.clone().add(v(-3, 0)), Math.PI / 2),
    ] },
    { id: 'bahiaalta', nome: REGIOES.bahiaalta.nome, pontos: [
      ponto('Chegada (Praça Tomé de Sousa)', ctx.bahiaAlta.chegada, Math.PI / 2), ponto('Terreiro de Jesus', ctx.bahiaAlta.chafariz.clone().add(v(-8, 0)), Math.PI / 2),
      ponto('Largo do Cruzeiro (arena)', ctx.bahiaAlta.cruzeiro.clone().add(v(-8, 0)), Math.PI / 2), ponto('Pelourinho', ctx.bahiaAlta.pelourinho.clone().add(v(0, 6))),
    ] },
    { id: 'creta', nome: REGIOES.creta.nome, pontos: [
      ponto('Chegada (praia da enseada)', ctx.creta.chegada, sul), ponto('Ilhota (a nado)', ctx.creta.ilhota.clone().add(v(0, -10)), sul),
      ponto('Cais (prancha do navio)', ctx.creta.cais, -oeste), ponto('Convés do navio', ctx.creta.conves, sul),
      ponto('Casa de Paulo (Lucas e Aristarco)', ctx.creta.casaDePaulo.clone().add(v(0, 3))),
      ponto('Prancha (conselho e embarque)', ctx.creta.prancha.clone().add(v(-2, -2)), -oeste),
      ponto('Laseia (porta)', ctx.creta.portaLaseia, -oeste), ponto('Laseia (praça)', ctx.creta.praca),
      ponto('Farol', ctx.creta.farol, -oeste), ponto('Cabana do pastor', ctx.creta.cabana),
    ] },
    { id: 'malta', nome: REGIOES.malta.nome, pontos: [
      ponto('Praia (o fogo)', ctx.malta.chegada, norte), ponto('Casa de Públio (pátio)', ctx.malta.portaPublio.clone().add(v(0, -12)), norte),
      ponto('Povoado (o poço)', ctx.malta.povoado), ponto('Porto (o navio dos Dióscuros)', ctx.malta.cais, -oeste), ponto('Melite (a porta)', ctx.malta.portaMelite, oeste),
    ] },
    { id: 'naufragio', nome: REGIOES.naufragio.nome, pontos: [ponto('Proa do navio encalhado', ctx.naufragio.chegada, norte), ponto('Arena (água rasa)', ctx.naufragio.arenaEntrada, norte), ponto('Praia de Malta', ctx.naufragio.praia, sul)] },
    // as capelinhas e os cruzeiros das estradas do ermo
    { id: 'ermo', nome: REGIOES.ermo.nome, pontos: ctx.ermo.recheio.beiras.map((b) => ponto(pontoDeViagem(b.def.id)?.nome ?? b.def.id, b.diante, b.rumoDiante)) },
    { id: 'navio', nome: REGIOES.navio.nome, pontos: [ponto('Convés (junto ao mastro)', ctx.navio.chegada, sul), ponto('Popa (o bote)', ctx.navio.cabosDoBote.clone().add(v(0, 2)), norte), ponto('Proa (a sonda)', ctx.navio.proa.clone().add(v(0, -2)), sul)] },
  ];
  /** Desfaz uma vitória: tira a sombra das vencidas e as flags que ela deixou. */
  const desvencer = (id: string, ...flags: Flag[]) => {
    e.sombrasVencidas.delete(id);
    for (const f of flags) e.flags.delete(f);
  };
  const chefe = (o: {
    id: string; nome: string; area: IdArea;
    entidade: () => Sombra | null; lutando: () => boolean; reiniciarLuta: () => void;
    preparar: () => void; entrada: () => THREE.Vector3; rumo: number;
  }): ChefeDev => ({
    id: o.id,
    nome: o.nome,
    area: o.area,
    entidade: o.entidade,
    lutando: o.lutando,
    vencido: () => e.sombrasVencidas.has(o.id),
    lutar: () => {
      o.reiniciarLuta();
      o.preparar();
      jogo.reconstruirMundo();
      ctx.regioes.curar();
      ctx.regioes.irPara(o.area, o.entrada(), o.rumo);
    },
    reiniciar: () => {
      o.reiniciarLuta();
      ctx.regioes.curar();
      ctx.regioes.irPara(o.area, o.entrada(), o.rumo);
    },
    fase2: () => {
      const s = o.entidade();
      if (s?.ativa) s.vida = Math.min(s.vida, Math.floor(s.vidaMax / 2));
    },
    vencer: () => {
      const s = o.entidade();
      if (s && s.derrotar() === 'morreu') ctx.combate.sombraVencida(s);
    },
  });
  return {
    estado: e,
    peregrino: ctx.peregrino,
    renderer: ctx.renderer,
    areas,
    chefes: () => [
      chefe({
        id: 'cripta_guardiao', nome: 'Mamom, o Guardião da Avareza', area: 'cripta',
        entidade: () => ctx.cripta.guardiao, lutando: () => ctx.cripta.lutando, reiniciarLuta: () => ctx.cripta.reiniciarLuta(),
        preparar: () => {
          desvencer('cripta_guardiao', 'lamparina');
          e.cor = 1;
          for (const f of ['intro', 'cripta_laje', 'cripta_entrou', 'cripta_portao', 'cripta_dica_chama', 'cripta_dica_guardiao'] satisfies Flag[]) e.flags.add(f);
        },
        entrada: () => ctx.cripta.centroArena.clone().add(v(0, 4)), rumo: norte,
      }),
      chefe({
        id: 'meiodia_acedia', nome: 'Acídia, o demônio do meio-dia', area: 'meiodia',
        entidade: () => md.acedia, lutando: () => md.lutando, reiniciarLuta: () => md.reiniciarLuta(),
        preparar: () => {
          desvencer('meiodia_acedia', 'meiodia_vencido');
          for (const f of ['intro', 'meiodia_entrou', 'meiodia_dica'] satisfies Flag[]) e.flags.add(f);
        },
        entrada: () => md.centro.clone().add(v(8, 0)), rumo: oeste,
      }),
      chefe({
        id: 'palacio_gula', nome: 'Gula, o Banquete sem fim', area: 'palacio',
        entidade: () => b.gula, lutando: () => b.lutando, reiniciarLuta: () => b.reiniciarLuta(),
        preparar: () => {
          desvencer('palacio_gula', 'gula_vencida');
          for (const f of ['intro', 'cidade_damiao', 'cidade_lobo', 'palacio_entrou', 'palacio_dica'] satisfies Flag[]) e.flags.add(f);
        },
        entrada: () => b.centro.clone().add(v(0, 7)), rumo: norte,
      }),
      chefe({
        id: ID_CORACAO, nome: 'O Coração de Pedra', area: 'bahiaalta',
        entidade: () => ctx.bahiaAlta.largo.chefe, lutando: () => ctx.bahiaAlta.largo.lutando, reiniciarLuta: () => ctx.bahiaAlta.largo.reiniciarLuta(),
        preparar: () => {
          desvencer(ID_CORACAO, 'bahia_coracao_vencido');
          for (const f of ['intro', 'bahia_enfermaria', 'bahia_alta_entrou', 'bahia_coracao_dica'] satisfies Flag[]) e.flags.add(f);
        },
        entrada: () => ctx.bahiaAlta.cruzeiro.clone().add(v(-11, 0)), rumo: -oeste,
      }),
      chefe({
        id: ID_IRA, nome: 'A Ira', area: 'naufragio',
        entidade: () => ctx.naufragio.chefe, lutando: () => ctx.naufragio.lutando, reiniciarLuta: () => ctx.naufragio.reiniciarLuta(),
        preparar: () => {
          desvencer(ID_IRA, 'naufragio_ira_vencida');
          for (const f of ['intro', 'navio_entrou', 'navio_bote', 'navio_cintado', 'navio_carga', 'navio_brigas', 'navio_anjo', 'navio_sonda', 'navio_ancoras', 'navio_fuga', 'navio_pao', 'naufragio_encalhou', 'naufragio_presos', 'naufragio_ira_dica'] satisfies Flag[])
            e.flags.add(f);
          ctx.naufragio.reiniciar(e.sombrasVencidas, (x) => e.flags.has(x));
          ctx.historias.naufragio.naufragioArrumado = false;
        },
        entrada: () => ctx.naufragio.arenaEntrada.clone().add(v(0, -2)), rumo: norte,
      }),
    ],
    info: () => {
      const ch = ctx.combate.chefeDaArea() as unknown as Sombra | null;
      return {
        qps: ctx.qps,
        area: ctx.area.id,
        arfagem: ctx.camera.arfagem,
        guinada: ctx.camera.guinada,
        chefe: ch ? `${ch.id} · ${ch.vida.toFixed(1)}/${ch.vidaMax} · ${ch.estado}` : null,
        travado: ctx.combate.travado ? ((ctx.combate.travado as Partial<Sombra>).id ?? 'alvo') : null,
        mira: ctx.combate.miraPonto.clone(),
        peso: ctx.controle.pesoEfetivo(),
        torpor: ctx.oracao.torpor,
        mundo: ctx.ermoDoMundo ? medidaDoMundo() : null,
      };
    },
    irPara: (area, pos, rumo) => ctx.regioes.irPara(area, pos, rumo),
    mapaDoMundo: (x0, z0, x1, z1, passo) => pintarMapa(ctx.terrenoMundo, x0, z0, x1, z1, passo),
    recarregarProgresso: () => {
      jogo.reconstruirMundo();
      ctx.ambiente.aplicarAmbiente();
      e.coracoes = Math.min(e.coracoes, e.coracoesMax);
    },
    iniciarTeste: (area) => {
      e.zerar();
      e.slot = null;
      e.identidade = identidadePadrao();
      e.flags.add('intro');
      ctx.mapas.minimapa.esquecer('deserto');
      ctx.mapas.areaNoMapa = '';
      jogo.reconstruirMundo();
      e.checkpoint = ctx.mundo.inicio.toArray() as [number, number, number];
      ctx.regioes.posicionarNoCheckpoint();
      jogo.comecar();
      const destino = area && areas().find((a) => a.id === area);
      if (destino && destino.id !== 'vale') ctx.regioes.irPara(destino.id, destino.pontos[0].pos, destino.pontos[0].rumo);
    },
    curar: () => ctx.regioes.curar(),
    pularDialogo: () => {
      ctx.dialogos.encerrar();
      for (let i = 0; i < 80 && ctx.hud.dialogoAberto; i++) ctx.hud.avancar();
    },
    vencerSombra: (s) => {
      if (s.derrotar() === 'morreu') ctx.combate.sombraVencida(s);
    },
    sombrasDaArea: () => ctx.area.sombras.filter((s) => s.ativa),
  };
}
