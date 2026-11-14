# Ruas da Bahia — documento de design da região

> Status: **aprovado**, ainda não implementado. O autor decidiu:
> - O chefão é o **Coração de Pedra**.
> - A igreja é a **Basílica do Senhor do Bonfim**.
> - Dulce **aperfeiçoa a Piedade**. "Carregar o fardo" e os níveis 4 e 5 abrem ao vencer a região.
> - A história de Santa Dulce está conferida.
> - A Sala dos Milagres **não tem ex-votos de cera**.

## 1. Ideia central

**Provação:** cuidar dos doentes e dos esquecidos. **Santa guia:** Santa Dulce dos Pobres. **Dom:** Piedade.
**Chefão:** *O Coração de Pedra*, a Dureza de Coração (a Indiferença).

A região é uma Salvador sem tempo exato, com o clima das décadas de 1940 e 1950, quando Irmã Dulce recolhia os
doentes das ruas. O peregrino chega por mar, atravessa a cidade cinzenta, recolhe quem foi deixado para trás e
ajuda a transformar um **galinheiro** no **Hospital Santo Antônio**, que hoje é o Hospital Irmã Dulce. No fim
enfrenta o vício de quem *passa ao largo* (Lc 10,31-32).

Versículos que guiam a região:

- Ez 36,26: "Tirarei do vosso peito o coração de pedra e vos darei um coração de carne." É a vitória sobre o chefão.
- Mt 25,36: "Estive doente e me visitastes." É a provação.
- Gl 6,2: "Carregai os fardos uns dos outros." É a mecânica nova.

## 2. Santa Dulce dos Pobres

### Quem foi (base para os diálogos)

- Maria Rita de Souza Brito Lopes Pontes, nascida em Salvador (1914–1992). Foi irmã da Congregação das Irmãs
  Missionárias da Imaculada Conceição da Mãe de Deus, que tem raiz franciscana. Isso liga a região a São Francisco,
  que ensinou a Piedade na Cidade Dourada.
- Foi canonizada em 2019 e é a primeira santa nascida no Brasil. É chamada de "o Anjo Bom da Bahia".
- Trabalhou nos **Alagados**, as palafitas sobre a maré, e com os operários (o Círculo Operário da Bahia).
- Ocupou casas abandonadas para abrigar doentes e foi expulsa várias vezes. Em 1949, com licença da superiora,
  transformou o **galinheiro do Convento Santo Antônio** em enfermaria. Dali nasceu o hospital.
- Tinha a saúde frágil (os pulmões) e era muito pequena. Por cerca de 30 anos dormiu sentada numa cadeira.
- Episódio da tradição, para uma cena: um comerciante cospe na mão estendida dela. Ela responde: "Isso foi para
  mim. Agora, o que o senhor vai dar para os meus pobres?"
- Não vamos inventar citações e atribuí-las a ela. As falas do jogo são do roteiro. Frases reais só entram
  quando conferidas.

### Visual (a partir da imagem de referência)

O modelo é voxel e segue a iconografia, com rosto detalhado no padrão de Antão e Francisco.

| Parte | Como fica |
|---|---|
| Corpo | Baixa e franzina, menor que o peregrino adulto. Ombros estreitos e postura um pouco curvada pelo cansaço. |
| Véu | Azul-marinho, caindo até os ombros, sobre a touca branca que emoldura o rosto. |
| Gola | Gola branca larga e arredondada sobre os ombros, a parte mais clara da silhueta. |
| Hábito | Túnica branca. Na frente, o escapulário ou avental azul-marinho até os pés. |
| Peito | Medalha de Nossa Senhora, redonda, verde e prata, presa ao escapulário. |
| Mãos | Unidas na frente, segurando o crucifixo de madeira escura preso a um cordão. |
| Rosto | Pele clara e um sorriso pequeno e cansado. Olhos vivos e rugas finas nos cantos dos olhos. |
| Luz | Auréola dourada suave, como na imagem. Dentro da região ela quase não brilha: "é só uma freira". A auréola aparece por inteiro só na cena final. |

Gestos: `acolher`, `abencoar`, `rezar` e, novo, `carregar`. Na primeira aparição ela carrega um menino doente
nos braços, então o rig de braços separados do `Humano` precisa de uma pose de colo.

## 3. O chefão: O Coração de Pedra

### Por que este vício

Na tradição (São Gregório Magno, *Moralia*), o vício oposto ao dom da Piedade é a **dureza de coração**. Ele não
está entre os quatro vícios capitais que sobram (Soberba, Inveja, Ira e Ilusão), e isso ajuda: as 8 regiões
precisam de mais chefões do que há vícios. Os quatro ficam para as próximas regiões. O chefão representa a
**indiferença**: quem vê o doente na calçada e atravessa a rua.

### Aparência

- Um colosso de cerca de 5 m feito dos **paralelepípedos** da ladeira, com juntas de musgo escuro. Ele se
  levanta do próprio chão do Pelourinho.
- Veste uma sobrecasaca de pedra polida, de "gente de bem", com botões de ferro.
- **Nunca olha para ninguém.** A cabeça é uma máscara lisa, sem boca, sempre virada para o lado oposto ao dos
  doentes. Uma das mãos tapa o ouvido.
- No peito, atrás de uma **grade de sacada colonial** de ferro batido (uma porta fechada), bate um coração de
  pedra escura. Uma brasa vermelha e fraca aparece pelas fendas.
- Olhos (quando a máscara racha): cinza-gelo, sem cor nenhuma, o contrário da região quando é restaurada.

### Arena

O **Largo do Cruzeiro de São Francisco**, ao entardecer: o largo de pedra diante da fachada de São Francisco,
com o **cruzeiro de pedra** no meio. Os casarios estão cinzentos e fechados. A ladeira que desce para o Pelourinho
serve de corredor para as pedras rolando e para as portas que batem. **5 enfermos** estão deitados nos degraus do
cruzeiro e nas soleiras.

A escolha é simbólica. O chefão é um coração de pedra que se levanta do chão do largo. Ao lado dele está a cruz
de pedra, que é pedra também, mas é amor que se doa. Na vitória o colosso desmorona e o cruzeiro continua de pé,
aceso como na foto noturna de referência.

### Mecânicas (no mesmo formato da Gula)

- **A pedra que se espalha (o vício dele).** Uma crosta cinza sobe devagar em cada enfermo, mostrada por uma
  barra de pedra sobre ele. Quando um enfermo petrifica de todo, a pedra vai para a couraça do chefão: ele fica
  mais duro e o enfermo some da luta. Socorrer (F, Piedade) desfaz a pedra. O enfermo se levanta, reza, e a
  oração **racha a couraça**.
- **Coração exposto.** Com 3 enfermos socorridos a couraça abre, a grade cai e o coração fica à mostra por uns
  segundos. Só então a luz e o cajado ferem. Depois a pedra se fecha de novo.
- **Passar ao largo.** Ele caminha pela ladeira lançando um olhar em cone cinzento. Quem é pego fica
  *indiferente* por 4 s: não consegue socorrer e anda mais devagar. É o contrário exato do dom. Os enfermos já
  socorridos fazem sombra: ficar atrás deles protege. É o "quem foi ajudado volta para retribuir" virando defesa.
- **Portas que batem.** As portas e janelas dos casarios batem em sequência, e uma onda de choque desce a
  ladeira, avisada pelo pó das soleiras. É preciso pular.
- **Pedras rolando.** Paralelepípedos soltos descem a ladeira em linhas, com brechas para passar.
- **Na metade da vida: "Não é comigo."** Ele tapa os dois ouvidos. O som da cena abafa, os gemidos dos enfermos
  somem e os **marcadores de quem precisa de ajuda desaparecem do HUD**. A petrificação fica 2× mais rápida. Para
  achar quem precisa, é preciso olhar e escutar: uma tosse, uma mão erguida. Quem tem o dom da Ciência vê o brilho
  fraco deles.

### Vitória

O coração racha e **por dentro há um coração de carne**, vermelho e batendo (Ez 36,26). O colosso desmorona em
paralelepípedos que voltam para o chão da ladeira, já com as cores restauradas. As portas dos casarios se abrem
e os moradores saem para levar os enfermos ao hospital. Ninguém mais passa ao largo.

### Sombras comuns da região: "os que passam"

Vultos de pedra de chapéu e guarda-chuva que andam em fila pelas ruas. Não atacam: **empurram** e **fecham
passagens** (becos e portas). Uma luz desfaz cada um, mas a solução da região é outra. Carregando um doente, o
peregrino faz a fila parar e abrir caminho: a presença do sofredor quebra a indiferença.

## 4. Mecânica nova: carregar o fardo

- Junto a um enfermo socorrido, F põe a pessoa nas costas do peregrino.
- Carregando, ele anda mais devagar, não pula alto e não usa o cajado. Ainda pode rezar.
- É a mecânica central da provação: levar os doentes da cidade até o abrigo.
- No peregrino idoso o peso é maior. Isso conversa com o envelhecimento que já existe.
- **Durante a região**, carregar é uma ação da provação: só funciona com os enfermos da Bahia, e Dulce ensina
  na cena da casa abandonada. **Depois da vitória**, vira o nível da Piedade "Carregar o fardo" e passa a valer
  em todas as regiões. Veja a seção 7.

## 5. Mapa e cenários

A região tem duas áreas ligadas pelo **Elevador Lacerda**. A viagem de elevador é a transição de área, como
uma cena curta com a baía pela janela.

### Cidade Baixa e Península de Itapagipe

- **Chegada por mar.** Um saveiro de vela atravessa a Baía de Todos os Santos ao amanhecer e chega à **Rampa do
  Mercado Modelo**.
- **Mercado Modelo** e o cais, com saveiros, balaios e a feira.
- **Alagados**: palafitas de madeira sobre a maré, passarelas estreitas e redes. É onde estão vários dos doentes.
  Tem plataforma, equilíbrio e maré subindo.
  - **Estrutura**, tirada da referência do autor (casas de madeira sobre estacas, à beira d'água): estacas finas
    e escuras sob cada casa, fachada de tábuas verticais, telhado de duas águas, janelas em grade de caixilhos e
    reflexo na água.
  - **Escala e material da Bahia:** os Alagados eram barracos pobres, não sobrados. Cada casa tem um andar,
    é pequena e torta, feita de tábuas desencontradas, com telha de zinco ou de barro remendada e lona. As
    estacas ficam sobre a lama do mangue, e as casas se ligam por pinguelas de tábua.
  - **A cor como na referência:** na fase cinza a madeira está crua e desbotada. Quando a cor volta, as tábuas
    ganham as cores vivas da foto (vermelho, ocre, verde-escuro, azul), e aparecem roupas no varal, vasos de
    planta e canoas. É a dignidade restaurada, sem esconder a pobreza.
  - Canoas amarradas às estacas e o mangue ao fundo.
- **Convento Santo Antônio e o galinheiro.** O galinheiro vira o hospital (seção 6).
- **Colina Sagrada e Igreja do Senhor do Bonfim**, a capela da região (abaixo).

### Cidade Alta

- **Pelourinho** (pelas fotos de referência):
  - casarios coloniais de dois e três andares, colados uns aos outros, em verde-água, amarelo, rosa, azul-claro,
    laranja e branco;
  - janelas em arco com **bandeiras** (meia-lua de vidro), portas altas verdes ou azuis e molduras brancas;
  - **sacadas de ferro** batido e beirais;
  - chão de **paralelepípedo** cinza com uma faixa de calçada lisa junto às casas;
  - guarda-sóis vermelhos e mesinhas, só depois que a cor volta.
- **Igreja do Rosário dos Pretos**, de fachada azul, na ladeira do Pelourinho.
- **Largo do Cruzeiro de São Francisco**, a arena do chefão: a fachada cor de areia da igreja, com duas torres de
  pontas piramidais e um frontão recortado, e o **cruzeiro de pedra** no meio do largo. O interior de São
  Francisco não é visitável, porque a talha toda dourada repetiria a Cidade Dourada.
- **Terreiro de Jesus**:
  - praça com o **chafariz de ferro fundido** em camadas, com estátua no topo, cercado por um gradil de ferro;
  - **postes de ferro** com lampiões e **palmeiras-imperiais**;
  - de fundo, a Catedral e os sobrados brancos. É o ponto de encontro e a "praça central" da área.
- **Plano Inclinado** como atalho de volta, depois de destravado.

### A igreja da região: Basílica do Senhor do Bonfim

É a capela da região, decisão do autor. Fica perto, de verdade, do Santuário de Santa Dulce e das Obras Sociais,
no Largo de Roma.

**Fora** (pela foto de referência):

- Fachada **branca** com pilastras, cornijas e molduras de janela em **pedra cor de areia**.
- Duas torres com cúpulas bulbosas e sinos nos vãos. Frontão recortado com a cruz no alto e um óculo.
- Três portas na base, janelas em arco com caixilhos brancos e azulejo azul.
- Diante dela, o adro em escadaria. O **gradil fica coberto de fitinhas** de todas as cores, uma massa densa que
  vira a "parede de cor" mais forte da região quando a cor volta. Na fase cinza, as fitas estão cinzentas e
  imóveis; restauradas, balançam ao vento.

**Dentro** (pela foto de referência):

- Nave alta com **teto em abóbada de berço pintado**: uma moldura verde e dourada e uma cena central. No voxel, a
  pintura vira um painel de cores em mosaico, sem figuras detalhadas.
- Paredes brancas com uma **faixa de azulejo azul e branco** embaixo.
- **Altares laterais em talha dourada**, com colunas torsas e um quadro em cada.
- **Tribunas**: pequenos balcões dourados com grade, no alto das paredes laterais.
- **Lustres de cristal** pendendo do centro, bancos de madeira escura e o altar-mor dourado no fundo.
- Tem o confessionário em que se entra, o sacrário e os bancos, seguindo a regra das capelas detalhadas.
- A região guarda o único **sino** que toca de verdade: depois da vitória, o sino do Bonfim toca.

**Sala dos Milagres** (sem membros de cera, decisão do autor). Deve lembrar os milagres pela gratidão, não pela
doença:

- **Fotografias emolduradas** de famílias, crianças, casamentos e formaturas, em molduras de tamanhos variados que
  cobrem uma parede. No voxel, cada foto é um retângulo de cor com moldura, e algumas brilham de leve.
- **Cartas e bilhetes de agradecimento** presos num painel de cortiça, papéis claros sobrepostos.
- **Cascata de fitinhas** descendo do teto, como um véu colorido em que se passa por baixo.
- **Velas** acesas num nicho e flores frescas em jarras.
- **Pequenos corações de prata** pendurados numa grade, a forma mais sutil do ex-voto tradicional, e que conversa
  com a vitória sobre o Coração de Pedra.
- **Ligação com o jogo:** cada enfermo que o peregrino levou ao hospital deixa ali **uma foto e uma carta com o
  nome dele**. Ao ler, aparece uma frase de agradecimento. Quanto mais o jogador ajudou, mais cheia fica a
  parede. A sala vira o registro da sua provação, e isso prepara o final (os ajudados à espera em A Passagem).

### O Hospital Irmã Dulce

O hospital **cresce com a provação**:

1. **Galinheiro**: chão de terra, poleiros, telha vã e meia dúzia de esteiras.
2. **Enfermaria**: paredes caiadas, catres de ferro, lamparinas e uma bacia.
3. **Hospital Irmã Dulce**: o prédio de alvenaria, alas com leitos, a capelinha interna e o pátio com árvore.
   A fachada segue a foto de referência:
   - entrada **curva de vidro** com caixilhos brancos e uma marquise branca em arco;
   - o letreiro "HOSPITAL IRMÃ DULCE" em **letras verdes**;
   - colunas brancas e dois vasos brancos com palmeirinhas na porta.
   O logotipo do hospital (o perfil dela) **não** é reproduzido, porque é marca registrada; só entram as letras.
   A fachada moderna é anacrônica para os anos 1950 de propósito: é o "agora" do que o galinheiro virou, e só
   aparece depois da vitória.

Cada enfermo trazido ocupa um leito e fica lá, com nome e diálogo. É o mesmo princípio do Tomás, da Rita e do
Beppo na Cidade Dourada. **A cadeira dela** fica num canto do quarto simples, no último estágio.

### Pessoas da cidade (NPCs)

Pescador de saveiro, baiana do tabuleiro de acarajé, engraxate menino, a superiora do convento, o comerciante
da cena do cuspe, operários do Círculo Operário e, para a cena final, o médico voluntário.
Cuidado cultural: as baianas e a capoeira entram como vida da cidade, com respeito. A região não representa
ritos do candomblé, para não tratá-los de forma superficial num jogo de tema católico.

## 6. Sequência da provação

1. **Chegada** pelo mar à Cidade Baixa, toda cinzenta. As portas estão fechadas e "os que passam" andam em fila.
2. **O menino na calçada.** O peregrino encontra Irmã Dulce carregando um menino doente que ninguém quis receber.
   Primeira conversa encenada. Ela pede ajuda.
3. **Onde abrigar?** Uma casa abandonada serve de abrigo, mas o dono os expulsa (eco da história real). Ensina a
   mecânica de carregar.
4. **Recolher os esquecidos**: nos Alagados, no Mercado e no Pelourinho (depois do elevador). São 5 a 7 doentes,
   cada um com uma pequena história e um obstáculo: maré, fila de "passantes", beco fechado.
5. **Pedir pelos pobres**: a cena do comerciante, com uma escolha. Responder com raiva quebra a cena. Responder
   como ela, com mansidão, faz o comerciante voltar depois com uma doação: a cura de outro coração de pedra,
   em pequeno.
6. **O galinheiro**: a superiora dá licença. O peregrino limpa, monta as esteiras e traz os doentes. Uma passagem
   de tempo transforma o galinheiro em hospital.
7. **Bonfim**: capela, confissão, descanso, *checkpoint* e a Sala dos Milagres.
8. **O Coração de Pedra** no Largo do Cruzeiro de São Francisco.
9. **A cor volta.** O hospital ganha a fachada do Hospital Irmã Dulce. Ali, diante dos leitos ocupados, Dulce
   aperfeiçoa o dom. A Sala dos Milagres do Bonfim se enche com as fotos e as cartas dos ajudados. Eles
   aparecem de novo em A Passagem, o final.

## 7. O dom: Dulce aperfeiçoa a Piedade

Decisão do autor: a Piedade continua sendo recebida de São Francisco na Cidade Dourada. Francisco planta, Dulce
faz florescer.

- **Antes da Bahia**, a Piedade só vai até o nível 3. Os níveis 4 e 5 aparecem na tela de dons com cadeado e o
  texto "Aperfeiçoado nas Ruas da Bahia".
- **Ao vencer a região**, numa cena no hospital, Dulce abre os níveis 4 e 5 e o peregrino ganha **Carregar o
  fardo** de vez.
- Proposta dos níveis, a fechar na revisão da árvore (item 2 do roteiro):

  | Nível | Nome | Efeito |
  |---|---|---|
  | 1 | Mãos que servem | Como hoje. |
  | 2 | Partilha | Como hoje. |
  | 3 | Misericórdia | Como hoje. |
  | 4 | **Carregar o fardo** | F leva nas costas quem foi socorrido. O peso diminui, e carregar alguém faz as sombras comuns hesitarem (a presença do sofredor quebra a indiferença). |
  | 5 | **Coração de carne** | Rezar perto de quem você ajudou rende o dobro: eles rezam com você (o antigo "Instrumento da paz"). Além disso, o olhar de indiferença dos chefões não o prende mais. |

- "Pobreza alegre" (o ouro da Gula pesa a metade) só serve na Cidade Dourada, que vem antes. Vira um efeito do
  nível 2 ou sai da árvore.
- **Save existente:** quem já tinha a Piedade 4 ou 5 comprada mantém o nível e as graças gastas, e os efeitos
  novos passam a valer. Os nomes antigos são migrados no carregamento do `Estado`.

## 8. Plano técnico

| Peça | Arquivo | Observação |
|---|---|---|
| Áreas `bahiabaixa` e `bahiaalta` | `src/mundo/Bahia.ts`, `BahiaModelos.ts` | Casarios gerados por parâmetros (andares, cor, sacadas) e mesclados em poucas malhas, como `CidadeModelos`. |
| Elevador Lacerda | `src/mundo/Bahia.ts` | Transição de área com cena. |
| Hospital em 3 estágios | `src/mundo/Hospital.ts` | O estágio vem de uma flag e reconstrói a malha. |
| Capela do Bonfim | `src/mundo/Capela.ts` | Novo estilo: azulejo, talha dourada, tribunas, teto pintado e a Sala dos Milagres, que se enche conforme as flags `bahia_levou_*`. |
| Santa Dulce | `src/entidades/Dulce.ts` | `Humano` com rosto detalhado e pose de colo. |
| Coração de Pedra | `src/entidades/CoracaoDePedra.ts` | Implementa `Chefe` como a Gula. Petrificação nos enfermos. |
| "Os que passam" | `src/entidades/Sombra.ts` | Variante que empurra e bloqueia. |
| Carregar | `src/entidades/Peregrino.ts`, `src/Jogo.ts` | Estado `carregando` com física própria. |
| Diálogos | `src/dialogos/bahia.ink` | Com `#gesto` e `#plano`. |
| Dev | `src/dev/Progresso.ts` | Etapas da Bahia e `?teste=bahia`. |

Ordem sugerida: blocos do mapa e o elevador → Dulce e a primeira cena → carregar e os enfermos → hospital em
estágios → Bonfim → chefão → passagem para a cor e o dom.

## 9. Referências

A arte é feita por código. As fotos servem só de referência visual e não entram no jogo.

O autor enviou seis referências:

- a imagem de Santa Dulce;
- o Terreiro de Jesus com o chafariz;
- a fachada do Hospital Irmã Dulce;
- o Bonfim por fora, com as fitinhas;
- o Bonfim por dentro;
- o Largo do Cruzeiro de São Francisco, de dia e à noite.

O que cada uma define está descrito nas seções 2, 3 e 5.

Ainda seria útil, sem bloquear o início:

- o Santuário de Santa Dulce no Largo de Roma;
- os Alagados (palafitas);
- o Elevador Lacerda visto da Cidade Baixa.
