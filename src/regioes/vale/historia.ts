import * as THREE from 'three';
import { Cripta } from '../../mundo/Cripta';
import { IdArea } from '../../mundo/Area';
import { CAPELA } from '../../mundo/Terreno';
import { Sombra } from '../../entidades/Sombra';
import { MARCA, type Interacao } from '../../sistemas/Interacoes';
import type { ModuloRegiao, BarraDoChefe } from '../Modulo';
import { Parte } from '../../sistemas/Sistema';

const TOTAL_SOMBRAS_VALE = 5;

/**
 * O Vale e a Cripta: as cinco sombras que roubaram a cor, a escada selada, os braseiros e Mamom, a Lamparina da Fé,
 * o véu do oeste e o jardim de Agostinho com a porta estreita.
 */
export class HistoriaDoVale extends Parte implements ModuloRegiao {
  readonly areas: readonly IdArea[] = ['vale', 'cripta'];

  async carregar() {
    await this.ctx.mundo.povoar(this.ctx.estado.sombrasVencidas);
    this.montarCripta();
  }

  reiniciar() {
    const e = this.ctx.estado;
    this.ctx.mundo.reporSombras(e.sombrasVencidas);
    if (e.flags.has('veu_oeste')) this.ctx.mundo.abrirVeu(true);
    else this.ctx.mundo.fecharVeu();
    this.montarCripta();
  }

  /** (Re)cria a cripta a partir do progresso atual. */
  montarCripta() {
    if (this.ctx.cripta) this.ctx.cena.remove(this.ctx.cripta.grupo);
    this.ctx.cripta = new Cripta(this.ctx.estado.sombrasVencidas, this.ctx.estado.flags, {
      portaoAberto: () => this.portaoDaCriptaAberto(),
      braseiroAceso: (n) => this.braseiroAceso(n),
      braseirosApagaram: () => {
        this.ctx.som.apagou();
        this.ctx.hud.anunciar('As chamas se apagaram…', 2);
      },
      lutaComecou: () => this.lutaComecou(),
    });
    this.ctx.cena.add(this.ctx.cripta.grupo);
    this.ctx.fauna.faunas.get('cripta')?.trocarFisica(this.ctx.cripta);
  }

  interacoes() {
    const m = this.ctx.mundo;
    const c = this.ctx.cripta;
    const r: Partial<Record<IdArea, Interacao[]>> = {};
    r.vale = [
      {
        pos: () => m.fogueira,
        raio: 2.4,
        rotulo: 'F: descansar junto à fogueira',
        tipo: MARCA.descanso,
        agir: () => this.ctx.sacramentos.descansar(m.fogueira.clone().add(new THREE.Vector3(-1.6, 0, 0)), 'Você descansou. O caminho foi guardado aqui.'),
      },
      {
        pos: () => m.cruzeiro,
        raio: 2.6,
        rotulo: 'F: contemplar o cruzeiro',
        tipo: MARCA.lugar,
        agir: () => {
          this.ctx.dialogos.tocar('vale_cruzeiro');
        },
      },
      ...this.ctx.sacramentos.interacoesDaCapela(m.capela, 'vale_altar'),
      this.ctx.interacoes.falarCom(m.jardim.agostinho),
      {
        pos: () => m.jardim.livro,
        raio: 1.5,
        rotulo: 'F: tomar e ler',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('vale_livro'),
      },
      {
        pos: () => m.entradaCripta,
        raio: 2.6,
        rotulo: () => (this.ctx.estado.cor >= 0.999 ? 'F: descer à cripta' : 'F: examinar a escada selada'),
        tipo: MARCA.saida,
        agir: () => {
          if (this.ctx.estado.cor < 0.999) {
            this.ctx.dialogos.tocar('vale_escada_selada');
            return;
          }
          const descer = () =>
            this.ctx.regioes.trocarArea(c, c.chegada, Math.PI, () => {
              if (this.ctx.primeiraVez('cripta_entrou')) this.ctx.dialogos.tocar('cripta_chegada');
            });
          if (!this.ctx.estado.flags.has('cripta_laje')) {
            this.ctx.marcar('cripta_laje');
            this.ctx.som.portao();
            this.ctx.hud.anunciar('A laje cedeu.', 1.6);
            this.ctx.agenda.depois(0.9, descer);
          } else descer();
        },
      },
      {
        pos: () => m.veu,
        raio: 3.4,
        ativa: () => !m.veuAberto,
        rotulo: () => (this.ctx.estado.flags.has('lamparina') ? 'F: erguer a lamparina' : 'F: tocar a névoa'),
        tipo: MARCA.lugar,
        agir: () => {
          if (this.ctx.estado.flags.has('lamparina')) {
            this.ctx.dons.lamparinaAcesa = true;
            this.ctx.dons.atualizarLamparina();
          } else
            this.ctx.dialogos.tocar('vale_nevoa');
        },
      },
    ];
    r.cripta = [
      {
        pos: () => c.escada,
        raio: 2.2,
        rotulo: 'F: subir para a capela',
        tipo: MARCA.saida,
        agir: () => this.ctx.regioes.trocarArea(m, m.entradaCripta.clone().add(new THREE.Vector3(0, 0, 2.4)), 0),
      },
      {
        pos: () => c.estela,
        raio: 1.9,
        rotulo: 'F: ler a inscrição',
        tipo: MARCA.lugar,
        agir: () => this.ctx.dialogos.tocar('cripta_estela'),
      },
      {
        pos: () => c.relicario,
        raio: 2.3,
        ativa: () => c.lamparinaNoAltar,
        rotulo: 'F: tomar a Lamparina da Fé',
        tipo: MARCA.lugar,
        agir: () => this.pegarLamparina(),
      },
    ];
    return r;
  }

  valor(chave: string) {
    return chave === 'faltam_vale' ? Math.max(0, TOTAL_SOMBRAS_VALE - this.sombrasDoValeVencidas()) : undefined;
  }

  atualizarDepois() {
    if (this.ctx.area !== this.ctx.mundo) return;
    this.verificarVeu();
    this.atualizarJardim();
  }

  chefe() {
    return this.ctx.area === this.ctx.cripta ? this.ctx.cripta.guardiao : null;
  }

  barraDoChefe(): BarraDoChefe | null {
    const c = this.ctx.area === this.ctx.cripta ? this.ctx.cripta.guardiao : null;
    if (!c || !this.ctx.cripta.lutando || !c.ativa) return null;
    return { nome: 'MAMOM · GUARDIÃO DA AVAREZA', fracao: c.vida / c.vidaMax, protegido: c.estado !== 'atordoada', alerta: c.alerta };
  }

  lutando() {
    return this.ctx.cripta.lutando;
  }

  aoMorrer() {
    this.ctx.cripta.reiniciarLuta();
  }

  /** Cada sombra do Vale vencida devolve um quinto da cor. */
  contarVitoria(s: Sombra) {
    if (s.id.startsWith('vale_')) this.ctx.estado.cor = Math.min(1, this.sombrasDoValeVencidas() / TOTAL_SOMBRAS_VALE);
  }

  /** Mamom se desfez: a luz maior, o portão, e o Espírito fala. */
  sombraVencida(s: Sombra) {
    if (s.id !== 'cripta_guardiao') return false;
    this.ctx.cripta.guardiaoVencido();
    this.ctx.agenda.depois(0.7, () => {
      this.ctx.efeitos.ouro = 1.4;
      this.ctx.som.graca();
      this.ctx.graca.tempoColuna = 0;
      this.ctx.hud.anunciar('✦ Mamom se desfez em luz', 2.6);
      this.ctx.som.portao();
      this.ctx.dialogos.tocar('cripta_mamom_vencido');
      for (const m of this.ctx.modulos) m.aposVencerSombra?.(s);
    });
    return true;
  }

  aposVencerSombra() {
    if (this.ctx.estado.cor >= 0.999 && this.ctx.primeiraVez('vale_restaurado')) this.ctx.dialogos.tocar('vale_restaurado');
  }

  oracaoDobrada(p: THREE.Vector3) {
    if (this.ctx.area !== this.ctx.mundo) return false;
    return p.distanceTo(this.ctx.mundo.cruzeiro) < 4 || Math.hypot(p.x - CAPELA.x, p.z - CAPELA.y) < 5;
  }

  braseiroAceso(n: number) {
    this.ctx.som.fogo();
    this.ctx.hud.anunciar(`${n} de 3 braseiros acesos`, 1.6);
    if (this.ctx.primeiraVez('cripta_dica_chama'))
      this.ctx.dialogos.tocar('cripta_dica_chama');
  }

  portaoDaCriptaAberto() {
    this.ctx.som.fogo();
    this.ctx.som.portao();
    this.ctx.marcar('cripta_portao');
    this.ctx.efeitos.ouro = 0.5;
    this.ctx.hud.anunciar('As três chamas ardem juntas. O portão se abriu!', 3);
  }

  lutaComecou() {
    this.ctx.som.tensao();
    this.ctx.som.portao();
    this.ctx.hud.anunciar('Mamom, o Guardião da Avareza', 3);
    if (this.ctx.primeiraVez('cripta_dica_guardiao')) this.ctx.dialogos.tocar('cripta_mamom');
  }

  pegarLamparina() {
    this.ctx.marcar('lamparina');
    this.ctx.cripta.retirarLamparina();
    this.ctx.som.item();
    this.ctx.efeitos.ouro = 1.2;
    this.ctx.graca.tempoColuna = 0;
    this.ctx.hud.anunciar('Você recebeu a Lamparina da Fé!', 3.5);
    this.ctx.dons.lamparinaAcesa = true;
    this.ctx.dons.atualizarLamparina();
    this.ctx.agenda.depois(1.2, () => this.ctx.dialogos.tocar('cripta_lamparina'));
  }

  /** Com a lamparina acesa perto do véu, a névoa se desfaz. */
  verificarVeu() {
    const m = this.ctx.mundo;
    if (m.veuAberto || !this.ctx.dons.lamparinaAcesa) return;
    if (this.ctx.peregrino.pos.distanceTo(m.veu) > 4.5) return;
    m.abrirVeu();
    this.ctx.marcar('veu_oeste');
    this.ctx.som.dissolver();
    this.ctx.agenda.depois(0.5, () => this.ctx.som.graca());
    this.ctx.efeitos.ouro = 1;
    this.ctx.dialogos.tocar('vale_nevoa_desfeita');
  }

  /**
   * O jardim de Agostinho: diante da porta estreita, o Espírito Santo ensina a se ajoelhar; ao entrar de joelhos
   * pela primeira vez, a humildade abre o coração e vem a graça, com a voz de criança do outro lado do muro.
   */
  atualizarJardim() {
    const j = this.ctx.mundo.jardim, p = this.ctx.peregrino.pos;
    if (this.ctx.hud.dialogoAberto || this.ctx.transitando) return;
    if (j.dentro(p.x, p.z)) {
      if (this.ctx.primeiraVez('vale_porta_estreita')) {
        this.ctx.graca.receberGraca('A humildade abriu a porta estreita');
        this.ctx.dialogos.tocar('vale_jardim');
      }
    } else if (p.distanceTo(j.porta) < 2.6 && this.ctx.primeiraVez('vale_porta_vista')) this.ctx.dialogos.tocar('vale_jardim_porta');
  }

  sombrasDoValeVencidas() {
    return [...this.ctx.estado.sombrasVencidas].filter((id) => id.startsWith('vale_')).length;
  }
}
