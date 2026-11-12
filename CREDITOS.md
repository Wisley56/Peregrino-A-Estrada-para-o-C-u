# Créditos

**Peregrino: A Estrada para o Céu** é software livre, sob a licença **GPL-3.0-or-later** (ver [LICENSE](LICENSE)).

## Modelos voxel do Veloren (GPL-3.0)

Os modelos abaixo vêm do projeto **[Veloren](https://veloren.net)**, um RPG voxel livre feito pela comunidade
([código-fonte](https://github.com/veloren/veloren)), licenciado sob a **GNU GPL 3.0**.
Copyright © os contribuidores do Veloren. Os arquivos foram copiados sem alteração. Só as folhas das árvores
são recoloridas na hora em que o jogo carrega, porque o Veloren usa índices de paleta especiais para elas.

| No jogo (`public/assets/veloren/`) | Original no repositório do Veloren |
|---|---|
| `fauna/<bicho>/*.vox` (29 espécies, 888 KB): ovelha, cabra, coelho, lebre, esquilo, raposa, rato, sapo, lagartixa, tartaruga, hiena, cão, gato, porco, cervo, camelo, antílope, jumento, cavalo, boi, lobo, galinha, pato, ganso, corvo, águia, coruja, pavão, morcego | `assets/voxygen/voxel/npc/<espécie>/male/` (lista exata em `tools/fauna-veloren.mjs` e `src/fauna/especies.gerado.json`) |
| `arvores/pinheiro_1..4.vox` | `assets/world/tree/pine_green/1..4.vox` |
| `arvores/pequena_1..4.vox` | `assets/world/tree/temperate_small/1..4.vox` |
| `arvores/alamo_1..3.vox` | `assets/world/tree/poplar/1..3.vox` |
| `flores/*.vox` (7 modelos) | `assets/voxygen/voxel/sprite/flowers/` |
| `grama/*.vox` (5 modelos) | `assets/voxygen/voxel/sprite/grass/` |
| `pedras/rock-0..2.vox` | `assets/voxygen/voxel/sprite/rocks/` |
| `objetos/fogueira.vox` | `assets/voxygen/voxel/object/campfire_lit.vox` |

A montagem dos bichos (posição de cada peça e do esqueleto) usa os valores dos manifestos
`assets/voxygen/voxel/{quadruped_small,quadruped_medium,bird_medium}_{central,lateral}_manifest.ron`
e de `voxygen/anim/src/{quadruped_small,quadruped_medium,bird_medium}/mod.rs` do Veloren. As animações dos bichos (`src/fauna/Corpo.ts`: parado, andar/galope, pastar e voo) são
uma tradução para TypeScript de `voxygen/anim/src/{quadruped_small,quadruped_medium,bird_medium}/{idle,run,feed,fly}.rs`
do Veloren (GPL-3.0), com as mesmas fórmulas e a mesma interpolação de pose. O comportamento é deste projeto.

## Arte original deste projeto

Feitos em voxel, por código, em `src/`: o peregrino (chapéu com vieira, manto, cajado e cabaça), a pomba do
Espírito Santo, as sombras, a capela (nave com bancos, vitrais, presbitério, altar, sacrário, crucifixo, imagens de
Nossa Senhora e São José, Via Sacra, confessionário e campanário), o padre, o cruzeiro, o terreno, o céu e os efeitos de luz.
A cripta inteira também: paredes, pilares, portões, braseiros, candelabros, altar, a Lamparina da Fé, o Guardião
com couraça, a entrada em arco e a névoa de trevas da passagem oeste. O Deserto das Vozes (`src/mundo/Deserto.ts`):
dunas, mesas, palmeiras, marcos de pedra, o poço, as miragens, a rocha falsa e Santo Antão com o bastão em tau
(`src/entidades/Antao.ts`), feito a partir da iconografia tradicional (hábito e capa de eremita, tau no peito, sino, livro, barba branca, auréola). O Poço do Meio-Dia (`src/mundo/PocoMeioDia.ts`) e a Acídia, o demônio do meio-dia (`src/entidades/Acedia.ts`). A Cidade Dourada (`src/mundo/Cidade.ts` e `src/mundo/CidadeModelos.ts`): muralha, casas da Úmbria, praça, fonte, palácio, São Damião em cinco estágios com a cruz pintada, olivais, ciprestes, casebre, toca do lobo e as iscas da Gula. O Salão do Banquete (`src/mundo/Banquete.ts`: mesas, travessas, trono, colunas, tapeçarias, portas de ouro) e a Gula, o Banquete sem fim (`src/entidades/Gula.ts`). São Francisco de Assis (`src/entidades/Francisco.ts`) segue a iconografia tradicional e a imagem de referência do autor: hábito marrom com capuz, cordão de três nós, terço de madeira, tonsura, barba, mãos erguidas com pombas e auréola. O minimapa e o menu de pausa também são desenhados por código. A fogueira da caverna é a do Veloren, como a do Vale. Os vitrais da interface (moldura, gemas,
medalhão da pomba, botões) são SVG gerado por código em `src/ui/Vitral.ts`.

Os créditos que rolam dentro do jogo ficam em `src/ui/creditos.ts`: ao registrar um asset novo aqui, acrescente lá
quem o fez.

## Som

Todos os sons são sintetizados em tempo real pelo próprio jogo (Web Audio, `src/core/Som.ts`). Nenhum arquivo externo.

## Bibliotecas

- [three.js](https://threejs.org) (MIT)
- [inkjs](https://github.com/y-lohse/inkjs), runtime da linguagem [Ink](https://github.com/inkle/ink) da inkle (MIT)
- [Vite](https://vite.dev) (MIT) e [TypeScript](https://www.typescriptlang.org) (Apache-2.0), só no desenvolvimento

## Fontes

Empacotadas com o jogo (via [Fontsource](https://fontsource.org)), sob a **SIL Open Font License 1.1**:

- [Cinzel](https://github.com/NDISCOVER/Cinzel), de Natanael Gama: títulos
- [EB Garamond](https://github.com/octaviopardo/EBGaramond12), de Georg Duffner e Octavio Pardo: textos da tela inicial

## Inspiração de jogabilidade

A mira travada, a câmera em terceira pessoa e a estrutura de exploração seguem convenções do gênero
ação e aventura 3D. Nenhum código, gráfico, som ou texto de jogo comercial foi usado.
