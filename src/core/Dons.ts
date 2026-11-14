/**
 * Os sete dons do Espírito Santo (Is 11,2-3) e a árvore de cada um (GDD, seção 5):
 * 5 níveis por dom; o nível 1 é recebido na região do santo e os seguintes custam graças
 * na curva 1·2·3·5·8. "Graça não se conquista, se recebe": o jogador escolhe onde aplicá-las.
 */
export type IdDom = 'sabedoria' | 'entendimento' | 'conselho' | 'fortaleza' | 'ciencia' | 'piedade' | 'temor';

export interface NivelDom {
  nome: string;
  texto: string;
  /** Nível que só se abre mais adiante na história: a flag que o abre e o aviso na árvore enquanto está fechado. */
  trava?: { flag: string; texto: string };
}

/** A Piedade 4 e 5: Francisco planta, Irmã Dulce faz florescer (docs/regioes/01-ruas-da-bahia.md, seção 7). */
const PELA_DULCE = { flag: 'bahia_piedade_aperfeicoada', texto: 'Aperfeiçoado nas Ruas da Bahia, com Irmã Dulce.' };

export interface Dom {
  id: IdDom;
  nome: string;
  /** O que o dom é, em uma linha. */
  essencia: string;
  /** Quem dá o dom e onde. */
  origem: string;
  /** Cor da gema no vitral. */
  cor: string;
  /** Níveis 1 a 5. Vazio = dom ainda não feito no jogo (aparece selado). */
  niveis: NivelDom[];
}

/**
 * Custo, em graças, para chegar a cada nível (o nível 1 vem de graça, recebido do santo).
 * É a curva 1·2·3·5·8 do GDD em "graças maiores"; cada sombra dá uma graça pequena, então aqui vale o dobro.
 */
export const CUSTO_NIVEL = [0, 2, 4, 6, 10, 16];

export const DONS: Dom[] = [
  {
    id: 'sabedoria', nome: 'Sabedoria', cor: '#f2c94c',
    essencia: 'Ver como Deus vê: revela caminhos ocultos e o mapa real por trás das aparências.',
    origem: 'São João da Cruz, na Noite Escura', niveis: [],
  },
  {
    id: 'entendimento', nome: 'Entendimento', cor: '#e8e3d0',
    essencia: 'Decifrar enigmas, símbolos e parábolas; portas antigas só abrem quando o sentido é compreendido.',
    origem: "Santa Teresa d'Ávila, no Castelo Interior", niveis: [],
  },
  {
    id: 'conselho', nome: 'Conselho', cor: '#5b8def',
    essencia: 'Nas escolhas, mostra as consequências de cada caminho antes de decidir.',
    origem: 'São Paulo, no Mar da Tempestade', niveis: [],
  },
  {
    id: 'fortaleza', nome: 'Fortaleza', cor: '#d6453d',
    essencia: 'Escudo de luz contra ataques; resistir a ventos, correntezas e medo.',
    origem: 'Santas Perpétua e Felicidade, nas Catacumbas', niveis: [],
  },
  {
    id: 'ciencia', nome: 'Ciência', cor: '#4fc3c8',
    essencia: 'Distinguir o verdadeiro do falso: as tentações aparecem bonitas, mas com este dom se vê o que são.',
    origem: 'Santo Antão, no Deserto das Vozes',
    niveis: [
      { nome: 'Olhar da verdade', texto: 'E: por 8 s as miragens num raio de 30 m se desfazem e as vozes se calam (15 de energia).' },
      { nome: 'Olhar atento', texto: 'A Ciência dura 11 s.' },
      { nome: 'Discernir depressa', texto: 'Custa só 10 de energia.' },
      { nome: 'Ver de longe', texto: 'Alcance de 45 m.' },
      { nome: 'A verdade fere a mentira', texto: 'Com a Ciência ativa, o cajado e a luz tiram +1 de vida das sombras.' },
    ],
  },
  {
    id: 'piedade', nome: 'Piedade', cor: '#e57fb0',
    essencia: 'Curar, ajudar e rezar pelos outros; os ajudados voltam depois para retribuir.',
    origem: 'São Francisco de Assis, na Cidade Dourada',
    niveis: [
      { nome: 'Mãos que servem', texto: 'F junto a quem sofre: socorrer custa 20 de energia. Quem foi ajudado volta depois para retribuir.' },
      { nome: 'Partilha', texto: 'Socorrer custa só 12 de energia, e o ouro da Gula pesa a metade.' },
      { nome: 'Misericórdia', texto: 'Cada ato de piedade cura um coração inteiro.' },
      {
        nome: 'Carregar o fardo', trava: PELA_DULCE,
        texto: 'Quem você leva nas costas pesa a metade, e as sombras comuns hesitam diante de quem carrega um sofredor.',
      },
      {
        nome: 'Coração de carne', trava: PELA_DULCE,
        texto: 'Rezando perto de quem você ajudou, a oração rende o dobro: eles rezam com você. E o olhar da indiferença não o prende mais.',
      },
    ],
  },
  {
    id: 'temor', nome: 'Temor de Deus', cor: '#9b6ad6',
    essencia: 'A humildade: ajoelhar-se, fazer-se pequeno. Os soberbos não cabem pela porta estreita (Mt 7,13).',
    origem: 'Recebido no começo do caminho, no Vale',
    niveis: [
      { nome: 'Oração humilde', texto: 'Segurar R: ajoelhado, o peregrino recupera energia espiritual.' },
      { nome: 'Coração contrito', texto: 'A oração rende 30% mais energia.' },
      { nome: 'Pequenez', texto: 'As sombras comuns só notam o peregrino quando ele chega 30% mais perto.' },
      { nome: 'Repouso em Deus', texto: 'Depois de 4 s rezando, recupera meio coração a cada 4 s.' },
      { nome: 'Prostração', texto: 'Energia máxima 130, e a oração vence o torpor duas vezes mais depressa.' },
    ],
  },
];

export const domPorId = (id: IdDom) => DONS.find((d) => d.id === id)!;
