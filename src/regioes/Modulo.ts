import type * as THREE from 'three';
import type { Chefe, Impacto, InfoJogador } from '../entidades/Guardiao';
import type { Sombra } from '../entidades/Sombra';
import type { EventoInk } from '../historia/EventosInk';
import type { NomeAmbiente } from '../historia/Regioes';
import type { Area, IdArea } from '../mundo/Area';
import type { Interacao } from '../sistemas/Interacoes';

/** O que a barra do chefão mostra. */
export interface BarraDoChefe {
  nome: string;
  /** A vida que resta (0 a 1). */
  fracao: number;
  /** A couraça está fechada (o golpe não entra). */
  protegido: boolean;
  alerta: string;
}

/**
 * A história de uma região (`src/regioes/<id>/historia.ts`): as interações, os eventos e os valores do Ink, a cena
 * de cada etapa, o chefão e o que muda quando ele cai. Os sistemas percorrem os módulos e perguntam; tudo é opcional.
 * Os ganchos que dependem da área atual só são chamados quando ela é uma das `areas` do módulo (`cor`, `chefe`,
 * `rumo`, `oracaoDobrada`); os outros, sempre, e o módulo confere o que precisar.
 */
export interface ModuloRegiao {
  /** As áreas da região (a primeira é a principal). */
  readonly areas: readonly IdArea[];
  /** Na largada: povoa e arruma as áreas a partir do estado (o mundo limpo da tela inicial). */
  carregar?(): Promise<void> | void;
  /** Refaz o que depende do progresso (ao abrir um espaço de jogo, ao voltar ao título, pelo painel do modo dev). */
  reiniciar?(): void;
  /** As interações de cada área da região (o que F faz perto de cada coisa). */
  interacoes?(): Partial<Record<IdArea, Interacao[]>>;
  /** Um `~ evento("nome")` do Ink; devolve true se era daqui. */
  evento?(nome: EventoInk): boolean;
  /** Um `valor("chave")` do Ink; undefined se não é daqui. */
  valor?(chave: string): number | undefined;
  /** A cada quadro, antes de a área andar (as etapas, as cenas). */
  atualizarAntes?(dt: number): void;
  /** A cada quadro, depois das sombras e do chefão. */
  atualizarDepois?(dt: number): void;
  /** A cor da região (0 a 1). */
  cor?(id: IdArea): number;
  /** Outro ambiente para o momento da história (chamado sempre que o ambiente é aplicado), ou null. */
  ambiente?(): NomeAmbiente | null;
  /** O chefão da área atual. */
  chefe?(): Chefe | null;
  /** A barra do chefão em luta, ou null. */
  barraDoChefe?(): BarraDoChefe | null;
  /** A luta com o chefão da região está em andamento. */
  lutando?(): boolean;
  /** O que o chefão sente do peregrino além do comum (a brasa da Ira). */
  sentidos?(): Partial<InfoJogador>;
  /** A parte do que o chefão acertou que é desta região (o peso do banquete, a brasa). */
  impacto?(imp: Impacto): void;
  /** O peso que a região põe no peregrino além do ouro e do fardo. */
  pesoExtra?(): number;
  /** Tira esse peso (troca de área, cura do modo dev). */
  tirarPeso?(): void;
  /** O peregrino está rezando neste quadro (o jejum do banquete). */
  aoRezar?(dt: number): void;
  /** Rezar aqui vale em dobro? */
  oracaoDobrada?(p: THREE.Vector3): boolean;
  /** Uma sombra caiu: conta para a região (antes de salvar). */
  contarVitoria?(s: Sombra): void;
  /** O desfecho próprio de uma vitória (o do chefão); devolve true se tratou dela toda. */
  sombraVencida?(s: Sombra): boolean;
  /** Depois da graça de uma vitória: a região pode estar restaurada. */
  aposVencerSombra?(s: Sombra): void;
  /** O peregrino caiu: a luta da região recomeça. */
  aoMorrer?(): void;
  /** Chegou a pé à região acordada; devolve true se a região faz a chegada do jeito dela (`fala` toca a de sempre). */
  chegouAndando?(a: Area, fala: () => void): boolean;
  /** O peregrino está dentro da capela da área atual (a primeira vez, o Espírito conta de quem ela é). */
  naCapela?(): void;
  /** A cada quadro, com o dom da Ciência: `ligada` se ele estava ligado no começo do quadro. */
  ciencia?(ligada: boolean): void;
  /** O próximo passo do caminho na área, para a rosa dos ventos do Conselho. */
  rumo?(): THREE.Vector3 | null;
  /** Por que não dá para viajar daqui agora, ou null. */
  bloqueiaViagem?(): string | null;
}
