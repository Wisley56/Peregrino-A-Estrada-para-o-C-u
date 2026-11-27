/**
 * Os números de jogabilidade num lugar só: movimento do peregrino, combate, oração e energia, câmera, fauna e a
 * ficha dos chefões. O código lê daqui na hora de usar (não copia o valor ao carregar), então o painel do modo dev
 * (F9, aba Ajustes) pode mexer neles com o jogo rodando e copiar o resultado para colar de volta aqui.
 *
 * - Unidades: metros, segundos e corações (`0.5` = meio coração). A energia vai de 0 a `energiaMax` (100 de início).
 * - A vida e a escala de um chefão valem quando ele é criado: mudar no painel só pega ao recarregar a região.
 */
export const AJUSTES = {
  peregrino: {
    /** Velocidade (m/s) andando, correndo, mirando (travado num alvo) e de joelhos. */
    andar: 4.4,
    correr: 7.2,
    mirando: 3.8,
    ajoelhado: 1.5,
    /** Velocidade inicial do pulo (m/s) e a gravidade (m/s²): o pulo sobe ~1,5 m. */
    pulo: 8.6,
    gravidade: 25,
    /** O degrau mais alto (m) que se sobe andando; acima disso é parede. */
    degrau: 1.05,
    /** Raio do corpo (m) na colisão com o cenário. */
    raio: 0.32,
    /** Esquiva: velocidade (m/s) no começo do impulso e quanto dura (s). */
    esquivaVelocidade: 10,
    esquivaDuracao: 0.45,
    /** Quanto duram (s) o golpe do cajado, o lançar da luz e o recuo de quem foi ferido. */
    golpeDuracao: 0.38,
    luzDuracao: 0.35,
    feridoDuracao: 0.3,
    /** Fração da velocidade enquanto o golpe acontece. */
    lentidaoNoGolpe: 0.35,
    /** Segundos sem levar dano depois de ser ferido, e o empurrão (m) do golpe recebido. */
    invulneravel: 1.2,
    empurrao: 1.2,
  },
  nado: {
    /** A partir desta profundidade (m) o peregrino deixa de vadear e nada (a água bate no peito). */
    profundidade: 1.3,
    /** A altura dos pés abaixo da superfície: boiando parado (de pé na água) e nadando (deitado). */
    afundaParado: 1.3,
    afundaNadando: 0.95,
  },
  queda: {
    /** Queda (m) que não fere: um pulo de um barranco de uns 3,5 m (o pulo sobe ~1,5 m). */
    segura: 5,
    /** Acima da segura, meio coração a cada tantos metros (arredondando para cima). */
    porMeio: 2.5,
    /** Daqui para cima a queda mata, com quantos corações houver. */
    fatal: 30,
  },
  combate: {
    /** Dano padrão de um golpe recebido (corações). */
    danoRecebido: 0.5,
    /** O golpe do cajado: dano e alcance (m, além do corpo da sombra). */
    cajadoDano: 2,
    cajadoAlcance: 1.8,
    /** A luz lançada: dano e custo de energia. */
    luzDano: 3,
    luzCusto: 10,
    /** Energia devolvida ao vencer uma sombra. */
    energiaPorVitoria: 15,
  },
  oracao: {
    /** Energia por segundo rezando: nos 3 primeiros segundos, até os 6, e daí em diante. */
    taxaInicio: 5,
    taxaMeio: 8,
    taxaPlena: 12,
    /** O torpor gasta tanta energia por segundo; rezando, ele se desfaz a tantos segundos por segundo (12 com Temor 5). */
    torporGasto: 2,
    torporRezando: 6,
    /** Rezando, cada tanto de segundos de jejum tira um do peso do banquete. */
    jejum: 2.2,
    /** Custo de energia do dom da Ciência (E): até o nível 2 e do nível 3 em diante. */
    cienciaCusto: 15,
    cienciaCustoNivel3: 10,
  },
  camera: {
    /** Inclinação máxima: quase de cima para baixo (usada encostado em paredes de interiores). */
    tetoArfagem: 1.48,
    /** Quanto a câmera vai para o lado (por cima do ombro direito) quando o braço encolhe, para o corpo não tapar a mira. */
    ombro: 0.75,
    /** Folga da câmera acima do chão quando o braço encosta nele. */
    folgaChao: 0.35,
  },
  fauna: {
    /** A partir desta distância o bicho some e para de pensar; entre ATIVO e VISIVEL ele só fica parado. */
    distAtivo: 55,
    distVisivel: 95,
    /** Bandos sob demanda: nascem quando o peregrino chega a esta distância do território e somem além da de saída. */
    sitioEntra: 170,
    sitioSai: 260,
  },
  /** A ficha de cada chefão (vida e escala valem na criação). */
  chefoes: {
    guardiao: { vida: 30, escala: 2, alcanceCorrente: 15, velOnda: 8.5, raioMaxOnda: 13 },
    acedia: { esperaRaio: 1.35, velAnel: 7.5, raioMaxAnel: 15 },
    gula: { vida: 32, escala: 2.1, esperaPrato: 1.3, duracaoAspirar: 2.6, velOnda: 7, raioMaxOnda: 16 },
    coracao: { vida: 30, escala: 2.3, tempoExposto: 8, raioOlhar: 14, aberturaOlhar: 0.5, velPedras: 6.5, velOnda: 7.5 },
    ira: { vida: 60, escala: 2.6, tempoCansada: 5, raioPunho: 2.1, velAnel: 7.5, anelMax: 17 },
  },
};

/** Os valores de fábrica, para o painel poder voltar a eles. */
export const AJUSTES_PADRAO: typeof AJUSTES = structuredClone(AJUSTES);
