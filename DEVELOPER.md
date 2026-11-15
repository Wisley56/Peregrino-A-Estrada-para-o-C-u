# Peregrino: guia do desenvolvedor

Este documento reúne a parte técnica do projeto: como rodar, como o código está organizado e como cada sistema
funciona. Para a apresentação do jogo, veja o [README](README.md).

- [Requisitos e comandos](#requisitos-e-comandos)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Saves e preferências](#saves-e-preferências)
- [Voxels e malhas](#voxels-e-malhas)
- [Render e gráficos](#render-e-gráficos)
- [Regras do jogo](#regras-do-jogo)
- [Áreas e chefões](#áreas-e-chefões)
- [Diálogos](#diálogos)
- [NPCs e retratos](#npcs-e-retratos)
- [Interface](#interface)
- [Assets e licenças](#assets-e-licenças)
- [Próximos passos](#próximos-passos)

## Requisitos e comandos

- Node.js 18 ou mais novo.
- Pilha: **Three.js 0.180**, **TypeScript 5.9** (modo `strict`) e **Vite 6**.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5180
npm run typecheck  # só checa os tipos
npm run build      # tsc + vite build + verificação de que o modo dev não vazou: gera dist/ (site estático)
npm run preview    # serve o dist/ para conferir o build
npm run fauna      # baixa do Veloren os .vox dos bichos e regenera src/fauna/especies.gerado.json
```

O `dist/` é um site estático e pode ser publicado em qualquer hospedagem de arquivos.

Parâmetros de URL para testes:

- `?idade=jovem|adulto|idoso` força a idade do peregrino (teste do envelhecimento).
- `?teste` abre uma sessão de teste sem save, pulando o menu; `?teste=palacio` (ou `cripta`, `deserto`, `meiodia`,
  `cidade`, `bahiabaixa`, `bahiaalta`, `creta`) já começa na área. Só no modo dev.

O protótipo 2D anterior (Phaser) continua em `../jogo`, como referência de sistemas e de narrativa.

## Modo desenvolvedor

Com `npm run dev`, o jogo carrega `src/dev/`: um painel para testar regiões, chefões e progresso sem jogar
até lá.

| Tecla | O que faz |
|---|---|
| F9 | Abre e fecha o painel (Esc também fecha). Aberto, o ponteiro fica solto e o jogo não pausa. |
| F3 | Overlay de depuração: qps, draw calls e triângulos por quadro, posição, câmera, mira, chefão da área. |
| F6 | Teleporta para onde a mira aponta (1 m antes do ponto). |
| F7 | Congela e solta o tempo (a câmera continua livre). |
| F8 | Avança um quadro com o tempo congelado. |

Abas do painel:

- **Ir**: os pontos de cada área (chegadas, arenas, NPCs), a posição atual (copia como `THREE.Vector3`), pular o
  diálogo aberto e começar uma sessão de teste numa área.
- **Chefões**: lutar agora (desfaz a vitória, cumpre o que a arena pede e põe o peregrino na entrada), reiniciar a
  luta, ir para a fase 2 e vencer. Vencer passa pelo mesmo caminho de uma vitória de verdade (`Sombra.derrotar()`
  e `Jogo.sombraVencida`): graças, coração e diálogo. Também vence as sombras comuns da área.
- **Peregrino**: invencível, energia infinita, velocidade, curar, +10 graças e o nível de cada dom.
- **Progresso**: etapas da história (`src/dev/Progresso.ts`, cumulativas: do começo à Gula vencida), cor do
  Vale, flags (lidas do próprio código e dos `.ink`, com filtro) e sombras vencidas (clique para reviver).
- **Tempo**: câmera lenta (×0,1 a ×4), tempo parado e avanço de 1, 10 ou 60 quadros.

As opções de trapaça, a aba aberta e o overlay ficam lembrados em `localStorage` (`peregrino.dev`).

**Segurança**

- Só existe no modo dev. O `main.ts` importa `src/dev/Dev.ts` dentro de `if (import.meta.env.DEV)`; o Vite troca
  isso por `false` no build e o módulo some. `Jogo.ganchosDev()` vira só um `throw` em produção.
- O `npm run build` termina com `tools/verificar-build.mjs`, que falha se achar algum texto do painel em `dist/`.
- O save fica protegido. A primeira ação do painel num espaço de jogo liga `Estado.semSalvar`: nada mais é gravado
  até alguém clicar em "liberar" no selo DEV (canto inferior direito), com confirmação. A sessão de teste (`?teste`
  ou o botão do painel) não tem espaço de jogo e nunca salva.
- O painel não mexe em campos privados do `Jogo`. Ele usa `Jogo.ganchosDev()`, um contrato pequeno descrito em
  `src/dev/tipos.ts`. Para um chefão ou área nova, acrescente-o em `ganchosDev()` (pontos em `areas`, luta em
  `chefes`) e, se mudar a história, a etapa em `Progresso.ts`.

## Arquitetura

- **`src/main.ts`** cria o `Jogo` e o `Menu` da tela inicial.
- **`src/Jogo.ts`** é o laço principal. Ele guarda a área atual, o peregrino, a câmera, o HUD, os efeitos e as
  regras: dano, cura, graças, dons, checkpoints e troca de área.
- Toda região implementa a interface **`Area`** (`src/mundo/Area.ts`): terreno, colisão, pontos de descanso,
  sombras, saídas e `fonteMapa()`, que alimenta o minimapa.
- Todo chefão implementa **`Chefe`** (`src/entidades/Guardiao.ts`). O jogo só conversa com essa interface:
  vida, fase, ataques ativos e a dica mostrada na barra do chefão.
- Os ataques devolvem um **`Impacto`** com `dano` medido em corações (`0.5` = meio coração).

## Estrutura de pastas

```
src/
  voxel/     Malha (greedy meshing e AO embutido), Vox (leitor .vox do MagicaVoxel/Veloren), Modelo (voxels por código),
             Humano (gente do povo montada a partir de um figurino)
  dialogos/  roteiros Ink (.ink): peregrino.ink inclui um arquivo por região
  dialogo/   Dialogos (executa o Ink), Falantes (quem fala e com que estilo), Retratos (rostos da caixa de diálogo)
  mundo/     Area (interface comum), Terreno, Oceano, Mundo (o Vale), Creta (com CretaModelos e NavioModelos), Cripta, Deserto, PocoMeioDia, Cidade (a Cidade Dourada),
             CidadeModelos (casas, palácio, São Damião, iscas), Capela (capela de região com interior, confessionário
             e CapelaRegional), Cenario (cruzeiro, céu, entrada da cripta, véu, lamparina)
  fauna/     Especies (fichas), Corpo (esqueletos do Veloren), Animal (comportamento), Fauna (povoamento por área)
  entidades/ Peregrino, Npc (base de quem conversa), Sombra, Guardiao (Mamom e a interface Chefe),
             Acedia, Antao e Francisco (fichas de NPC com modelo próprio), Romanos, Companheiros e GenteDeCreta, Pomba
  core/      Aparencia (identidade e paletas), Camera, Entrada (teclado, mouse e controle), Controle (gamepad),
             Estado (save), Dons, Preferencias, Ruido, Som
  fx/        Efeitos (pós-processamento)
  ui/        Hud, Criacao, Menu, Minimapa, Pausa, Configuracoes, Dons (rosácea), IconesDons, Vitral, creditos,
             NavegacaoControle (menus pelo controle), Rotulos (nomes dos botões e troca das dicas)
  dev/       modo desenvolvedor (só no npm run dev): Dev (painel F9, overlay F3), Progresso (etapas), tipos
  Jogo.ts    laço principal e regras
public/assets/veloren/   modelos .vox do Veloren (GPL-3.0)
docs/FONTES-DE-ASSETS.md sites com assets livres e regras de licença
docs/imagens/            banner e capturas de tela do README (1920×1080, gráficos no Ultra)
tools/vite-plugin-ink.ts compila os roteiros Ink no build
tools/fauna-veloren.mjs  importa a fauna do Veloren (modelos e montagem)
tools/verificar-build.mjs confere que o modo dev não foi para o build
```

## Saves e preferências

**Jogos salvos** (`src/core/Estado.ts`) ficam no `localStorage`:

- Chaves: `peregrino3d.slot.1`, `peregrino3d.slot.2` e `peregrino3d.slot.3`. O save antigo
  (`peregrino3d.save.v1`) é migrado automaticamente para o espaço 1.
- O save guarda a identidade do peregrino, a área e o checkpoint, as graças, os níveis dos dons (`dons`), as
  sombras vencidas (`sombrasVencidas`) e as flags da história (`cripta_portao`, `lamparina`, `veu_oeste`,
  `dom_ciencia`, `deserto_parede`, `meiodia_vencido` e outras).
- `coracoesMax` é calculado: 5, mais 1 por chefão vencido (lista `CHEFOES`).
- `energiaMax` é calculada: 100, ou 130 com o Temor de Deus no nível 5.
- Migração: um save com chefão vencido e sem a flag `graca_grande_<id>` recebe a diferença da graça grande.

**Preferências** (`src/core/Preferencias.ts`) valem para todos os saves e ficam em `peregrino-preferencias`:
`{ sensibilidade, mira, graficos, sensibilidadeControle, inverterY, vibracao }`. Os valores lidos são validados; o que vier inválido volta ao padrão.

## Voxels e malhas

- **`Vox.ts`** lê arquivos `.vox` (MagicaVoxel e Veloren), inclusive a paleta.
- **`Modelo.ts`** monta modelos voxel por código: o peregrino, a pomba, as sombras, os santos, os chefões e os
  prédios. As células ficam num `Map` de chave numérica, e o `Volume` que ele entrega tem `cada()`, que percorre só
  as células cheias: a malha não varre a caixa inteira (as igrejas são quase todas vazio por dentro).
- **`Malha.ts`** gera a geometria com **greedy meshing**: faces vizinhas da mesma cor viram um só quadrilátero.
- **Oclusão de ambiente embutida**, no estilo Minecraft:
  - `ocluir()` calcula, para cada vértice, um nível de 0 a 3 a partir dos três vizinhos do canto.
  - A luz do canto vem de `LUZ_DO_CANTO = [0.56, 0.73, 0.87, 1]` e é gravada na cor do vértice.
  - O quadrilátero escolhe a diagonal que não passa pelo canto escuro, para o degradê não "quebrar".
  - A chave do greedy inclui o AO (`cor*256 + ao0 + ao1*4 + ao2*16 + ao3*64`). Por isso só se juntam faces com
    a mesma sombra nos cantos, o que dá cerca de 23% a mais de triângulos.
  - Não custa nada no shader e fica sempre ligado.
- **Terreno** (`Terreno.ts`): colunas de altura geradas por ruído. O AO usa `cheio(i, y, j)`
  (`y < altura(i, j)`; fora do mapa, só abaixo de 0).
  - `malhaDeColunas` faz uma malha única (as áreas pequenas). `blocosDeColunas` faz o mesmo terreno partido em
    blocos de 48 × 48 colunas, com material compartilhado e esfera envolvente própria: o renderizador descarta os
    blocos fora da câmera. É o padrão das regiões grandes (cerca de 3× a Bahia). Em Creta (320 × 320 m), cerca de
    60% dos triângulos do terreno ficam visíveis por quadro.
- **Oceano** (`Oceano.ts`): uma grade de 640 m que segue o jogador (presa a passos de 4 m), com as ondas no vertex
  shader (quatro senoides) e sombreamento facetado (`flatShading`). As cristas clareiam em espuma conforme a
  amplitude. `Oceano.altura(x, z)` repete a conta em TypeScript, para quem nada boiar na onda certa. `intensidade`
  vai de 0 (calmaria) a 1 (tempestade).
- **Física das árvores**: troncos e raízes dos pinheiros grandes têm pegada sólida em células de 0,5 m.

## Render e gráficos

O pós-processamento fica em `src/fx/Efeitos.ts`. `configurar(cfg)` remonta toda a cadeia de passes quando um ajuste
muda e descarta os passes antigos.

Ordem dos passes:

1. `RenderPass`, num alvo `HalfFloat`. O MSAA vem das `samples` do próprio alvo.
2. `GTAOPass` (opcional): raio 0,7, 8 amostras, `blendIntensity` 0,85.
3. `UnrealBloomPass` (opcional): força 0,32, raio 0,55, limiar 0,92.
4. `ShaderCor`: a saturação da região ("do cinza às cores"), o véu dourado das graças, o véu do dano e o frio do dom
   da Ciência. Com a **cor de cinema**, soma tons divididos, curva em S, aberração cromática nas bordas e grão de filme.
5. `OutputPass` (tone mapping e sRGB).
6. `FXAAPass` ou `SMAAPass` (opcional), sobre a imagem final.

Predefinições (`PREDEFINICOES`):

| | Resolução | Sombras | Antisserrilhado | Bloom | GTAO | Cinema |
|---|---|---|---|---|---|---|
| Baixa | 75% | simples | FXAA | não | não | não |
| **Média** (padrão) | 100% | suaves | FXAA | sim | não | sim |
| Alta | 100% | suaves | MSAA 4× | sim | não | sim |
| Ultra | 150% | detalhadas (4096) | MSAA 4× | sim | sim | sim |

Notas:

- `Jogo.aplicarGraficos()` acerta o pixel ratio, o tipo e o tamanho do mapa de sombra (1024, 2048 ou 4096; PCF ou
  PCFSoft) e marca os materiais com `needsUpdate` quando o tipo de sombra muda.
- O GTAO renderiza a cena de novo para tirar as normais. Por isso o custo acompanha a geometria, não os pixels:
  numa GPU integrada (Iris Xe), passa de 60 ms por quadro. Fica só na Ultra.

## Regras do jogo

**Corações e dano**

- Começa com 5. Um golpe comum tira meio coração; a Corrente da Cobiça tira um inteiro.
- Cada chefão vencido dá +1 coração e cura tudo.

**Sacramentos** (cada capela de região tem os dois)

- **Confissão** (confessionário): o peregrino entra no lado do penitente, ajoelha-se diante da grade e conversa
  com o padre (nó `capela_confissao`, com escolhas). A absolvição (`~ evento("absolvicao")`) guarda o caminho como
  um descanso, restaura tudo e põe o peregrino em estado de graça (`Estado.confessado`). Desistir no meio não vale.
- **Eucaristia** (altar): só em estado de graça. Dá um coração dourado a mais (`Estado.comungou`, somado em
  `coracoesMax`) e restaura tudo. Sem confissão, o Espírito Santo lembra, uma vez, que ela vem antes.
- A queda (`Estado.cair()`) tira os dois, e o save é gravado na hora.

**Graças**

- Uma sombra comum dá 1 graça e um chefão dá 3. As ajudantes do Mamom (`cripta_ajudante*`) não dão nenhuma.
- O custo dos dons segue a curva do GDD (1·2·3·5·8) dobrada: `CUSTO_NIVEL = [0, 2, 4, 6, 10, 16]`.

**Os Sete Dons** (`src/core/Dons.ts`)

Os dons seguem a ordem de Is 11,2. O nível 1 vem do santo da região. Por enquanto, só dois têm níveis:

| Nível | Temor de Deus | Ciência (Santo Antão) |
|---|---|---|
| 2 | +30% de energia na oração | dura 11 s |
| 3 | sombras notam o peregrino a 70% da distância (`Sombra.percepcao`) | custa 10 de energia |
| 4 | rezando, meio coração a cada 4 s (depois de 4 s) | alcance de 45 m |
| 5 | energia 130; torpor some duas vezes mais rápido | com a Ciência ativa, cajado e luz tiram +1 |

| Nível | Piedade (São Francisco planta, Irmã Dulce faz florescer) |
|---|---|
| 1 | Mãos que servem: socorrer alguém custa 20 de energia |
| 2 | Partilha: socorrer custa 12, e o ouro da Gula pesa a metade |
| 3 | Misericórdia: cada ato de piedade devolve um coração |
| 4 | Carregar o fardo: quem vai nas costas pesa a metade, e as sombras comuns hesitam (`Sombra.percepcao` × 0,5) |
| 5 | Coração de carne: a oração rende o dobro junto de quem você ajudou; o olhar da indiferença não prende mais |

Os níveis 4 e 5 da Piedade têm `trava` (`NivelDom.trava`, `Estado.travado`): só se compram depois da cena com Irmã
Dulce no hospital (`bahia_piedade_aperfeicoada`). Na árvore aparecem com cadeado. Quem já os tinha num save antigo
os mantém (o save guarda o número do nível, não o nome).

**Peso** (`Estado.peso`, gravado no save)

- Cada isca da Gula pega soma 1. A pedra de São Damião no ombro soma 2 (`Jogo.pesoEfetivo`).
- A velocidade cai 10% por ponto (até 45%) e o pulo, 12% (até 55%). Com a pedra, não há pulo.
- O peso aparece num saco de ouro na cintura (`Peregrino.mostrarPeso`) e no HUD (`#peso`).
- Dar o ouro a um pobre (`~ evento("doar_x")`) tira 1 de peso.

**Oração**

- Rende 5, depois 8, depois 12 de energia por segundo (depois de 3 s e de 6 s).
- Rende o dobro junto ao cruzeiro, na capela e nos outros lugares santos.

## Áreas e chefões

| Área | Arquivo | Destaques técnicos |
|---|---|---|
| O Vale | `mundo/Mundo.ts` | Terreno gerado, capela com interior, cruzeiro, fauna pastoril, jardim de Agostinho (`mundo/Jardim.ts`); a névoa a oeste exige a lamparina acesa |
| Cripta dos Primeiros Peregrinos | `mundo/Cripta.ts` | Braseiros com chama de 14 s; arena de Mamom (`entidades/Guardiao.ts`) |
| Deserto das Vozes | `mundo/Deserto.ts` | Miragens que viram sombras, vozes, rocha falsa revelada pela Ciência, capela de cúpulas |
| Poço do Meio-Dia | `mundo/PocoMeioDia.ts` | A Acídia (`entidades/Acedia.ts`), reflexos que só a Ciência desfaz, torpor |
| Cidade Dourada | `mundo/Cidade.ts` | Cidade murada na Úmbria, peso, atos de piedade, São Damião reconstruída pedra a pedra, o lobo de Gubbio |
| Palácio da Gula | `mundo/Banquete.ts` | Salão do Banquete; a Gula (`entidades/Gula.ts`), travessas como alvos, peso repartido com os pobres |
| Bahia: Cidade Baixa | `mundo/Bahia.ts` (`BahiaBaixa`) | Comércio, Mercado Modelo, Elevador Lacerda, Largo de Roma (convento e galinheiro), o Bonfim, os Alagados |
| Bahia: Cidade Alta | `mundo/Bahia.ts` (`BahiaAlta`) | Praça Tomé de Sousa, Terreiro de Jesus, Largo do Cruzeiro (arena), ladeira e Largo do Pelourinho |
| Creta: Bons Portos | `mundo/Creta.ts` | Mar da Tempestade, 1ª parte (em construção): costa sul de Creta em blocos, enseada com ilhotas, mar aberto com o `Oceano`; o cais com o navio de Alexandria atracado, a vila de Bons Portos, a estrada das colinas até Laseia (murada, com praça, fonte e pórtico), o farol e a cabana do pastor |
| O Mar da Tempestade | `mundo/Tempestade.ts` | Mar da Tempestade, 2ª parte: o convés do navio de Alexandria no Euroaquilão, de noite e sob chuva, com mar alto, relâmpagos e ondas que varrem o convés (At 27,14-38) |

**A natação** (`entidades/Peregrino.ts`)

- A física da área diz onde há água: `Fisica.nivelAgua(x, z)` devolve a superfície com as ondas (ou `null`); sem
  ela, vale `nivelMinimo`. A Bahia devolve o nível da baía (lá o fundo do vau deixa a água pela cintura).
- Vadeando (o corpo abaixo da superfície), a velocidade cai para 55%. Onde a água passa de `PROFUNDIDADE_NADO`
  (1,3 m), o peregrino nada (`nadando`): boia com a onda (uma mola amortecida puxa os pés para 1,3 m abaixo da
  superfície parado e 0,95 m nadando), anda a 50%, não pula e não usa o cajado, que fica preso ao corpo.
- Nadando, ele sobe na margem que fique até 0,6 m acima da água. Parado, fica de pé na água, pedalando e remando;
  andando, deita em nado de peito. As duas poses se misturam por `nadoK`. Os sons são `respingo` ao cair na água
  funda e `bracada` no ritmo do nado.
- Não há afogamento nem parede invisível no mar: fora do mapa de Creta é mar aberto e se nada para onde quiser.
  O lago do Vale também deixa nadar no meio.

**Creta: Bons Portos e Laseia** (Mar da Tempestade, At 27,8-12)

- Chega-se pelo saveiro da Bahia depois do Coração de Pedra (`bahia_coracao_vencido`): o nó `bahia_saveiro` oferece
  Creta ou a Cidade Dourada. O roteiro marca a escolha com `~ evento("viajar_creta")` (ou `viajar_cidade`,
  `viajar_bahia`), e `Jogo.fazerViagem` troca de área quando a conversa fecha. A primeira chegada (`creta_entrou`)
  toca `creta_chegada`. O barco de pesca no fim da praia leva de volta à Bahia.
- Todo o desenho fica em constantes no topo de `Creta.ts` (coordenadas locais; x para leste, +z para o mar):
  `CAIS`, `BACIA`, `NAVIO`, `CASAS`, `ESTRADA`, `LASEIA`, `CASAS_LASEIA`, `FAROL`, `CABANA`. O chão (`gerar`) aplaina
  as plataformas das casas e de Laseia, pinta a estrada de terra, draga a bacia e levanta o cais.
- Os objetos de voxel vão para um `Juntador` (blocos de 40 m). As casas são física por `altura`: o terraço é um
  piso com a mureta em volta, e a escada de fora é uma rampa de degraus de 0,25 m. Muralhas e muros são caixas;
  árvores, postes e gente são círculos.
- **O navio** (`mundo/NavioModelos.ts`): o cargueiro de trigo de Alexandria (30 × 8,5 m), com casco de olhos pintados,
  pescoço de cisne na popa, cabine, escotilha, mastro e verga, artemão, cordame e os dois remos de governo.
  `navioAlexandrino(aberta)` serve ao porto (vela recolhida) e à tempestade (vela aberta). Para a física,
  `convesEm`, `meiaLarguraConves`, `bordaEm`, `MASTRO` e `CABINE`; `Creta.alturaNavio` faz do convés um chão, da
  borda falsa uma parede (aberta onde chega a prancha) e da cabine um bloco.
- **A gente** (`Creta.npcs`, interações em `Jogo.interacoesDeCreta`): Júlio, o centurião, e os soldados
  (`entidades/Romanos.ts`, modelo próprio: crista transversa, fáleras, grevas, vara de videira; pilo e escudo);
  São Lucas e Santo Aristarco (`entidades/Companheiros.ts`, `montarApostolico`, que também servirá a São Paulo);
  o piloto, o dono do navio, marinheiros, presos, o pescador, a mulher do forno, a gente de Laseia e o pastor
  (`entidades/GenteDeCreta.ts`). Os diálogos estão em `dialogos/creta.ink`; a tripulação e o dono do navio já
  mostram a impaciência que vira Ira na tempestade.
- **São Paulo** (`PAULO` em `entidades/Companheiros.ts`): calvo na frente, com a ruga da testa, barba comprida
  castanha, túnica clara e himácio vermelho-terra, descalço, espada na direita e livro na esquerda, auréola e a
  corrente do preso no pulso (as opções `descalco`, `rugas` e `corrente` da `FichaApostolica`).
- **A história em Creta** (At 27,9-13), guardada em flags, com cada um posto no lugar por `Creta.arrumar` ao entrar
  na área e depois do conselho:
  1. Paulo reza na casa da praia. Quem bate à porta (`creta_casa_paulo`) o faz sair; o encontro (`creta_paulo`)
     marca `creta_paulo_conheceu` e o evento `paulo_ao_cais` o faz descer andando (`Creta.levarPauloAoCais`).
  2. Ao chegar à prancha, `creta_paulo_no_cais`. Falar com ele abre o conselho (`creta_conselho`): o aviso de
     Paulo (At 27,10), e o peregrino escolhe apoiá-lo com mansidão, responder ao dono do navio no mesmo tom (a Ira)
     ou calar (`creta_conselho_manso`, `_ira`, `_calado`, para usar adiante). O desfecho é o de Atos: o centurião
     confia no piloto e no dono, e partem com o vento sul brando.
  3. O evento `conselho` marca `creta_conselho`; Paulo, Lucas e Aristarco passam para o convés, e a prancha
     oferece "embarcar com Paulo" (`creta_embarcar`), e `Jogo.embarcar` leva à área `navio`.

**O navio na tempestade** (Mar da Tempestade, At 27,14-38; `mundo/Tempestade.ts`, `dialogos/navio.ink`)

- **A ilusão do mar**: o navio fica parado no mundo (`ORIGEM_NAVIO`, longe de tudo) e o mar passa por ele.
  `Oceano.deriva` (m/s) acumula um deslocamento que o shader soma às ondas (`uDesloc`) e que `Oceano.altura`
  repete, para a física e a natação baterem com o que se vê. A câmera joga e arfa com o mar
  (`Tempestade.balancar(cam)`, chamado depois de `atualizarConversa`).
- **O céu**: `Tempestade.escuridao` (0 a 1, por etapa) e `relampago` (o clarão que decai) entram no ramo
  `noNavio` de `Jogo.aplicarAmbiente`, que mistura névoa, luz e céu. A chuva é um `LineSegments` de 1400 gotas
  que segue o jogador. Som: `Som.ambienteDe('tempestade')` (drones graves e vento com rajadas), `trovao()` e
  `vagalhao()`.
- **As ondas no convés**: de 16 a 28 s, com aviso 2,2 s antes (`aoAvisarOnda`), uma onda quebra de um bordo
  (`aoQuebrarOnda(lado)`) e empurra o peregrino por `Peregrino.empurrao`, uma velocidade de fora que se desfaz
  sozinha e passa pela colisão normal (a borda falsa o segura). Agarrado ao mastro (até 2,4 m) não é empurrado.
  Quem cai no mar é tirado da água depois de 1,6 s (`Jogo.atualizarNavio`). Nada disso corre durante conversa
  ou transição (`Tempestade.pausa`).
- **As etapas** (`EtapaNavio`, `etapaDoNavio(tem)` lê as flags em ordem), e `Tempestade.arrumar` põe cada um no
  lugar quando `Jogo.navioArrumado` cai para `false`:
  1. `bote`: puxar o bote que vem a reboque (`navio_bote`, At 27,16).
  2. `cintar`: passar os três cabos por baixo do casco (`navio_cintado`, At 27,17).
  3. `carga`: levar os cinco sacos de trigo (`CARGAS`) até a borda e lançá-los (`navio_carga`, At 27,18-19).
  4. `brigas`: três pares de marinheiros brigam pelo medo. A resposta mansa apazigua; a ríspida (`navio_gritou`)
     não resolve. Os três apaziguados marcam `navio_brigas`; é o primeiro contato com a Ira.
  5. `anjo`: Paulo de pé no meio deles conta a visão do anjo (`navio_anjo`, At 27,21-26), tocado sozinho.
  6. `sonda`: lançar a sonda duas vezes, 20 e 15 braças (`navio_sonda`, At 27,27-28).
  7. `ancoras`: soltar as quatro âncoras da popa (`navio_ancoras`, At 27,29).
  8. `fuga`: os marinheiros descem o bote para fugir; falar com Paulo leva ao aviso a Júlio e aos soldados que
     cortam os cabos (`Tempestade.soltarBote`, `navio_fuga`, At 27,30-32).
  9. `pao`: todos em roda do mastro; Paulo dá graças e parte o pão (`navio_pao`, At 27,33-38), que restaura a vida.
  10. `amanhecer`: o fim por enquanto; o naufrágio e a Ira vêm na próxima parte.
- Os nós que tocam sozinhos (`navio_anjo`, `navio_fuga_vista`, `navio_pao`) tocam uma vez cada
  (`primeiraVez(no + '_tocou')`). Os eventos do roteiro chegam a `Jogo.eventoDoNavio`.

**O jardim de Santo Agostinho e a porta estreita** (Vale; o dom do Temor de Deus)

- `JARDIM` em `mundo/Terreno.ts` aplaina o chão do jardim (12 × 12 m, à direita da estrada) e abre uma trilha até a
  porta. Os modelos ficam em `mundo/JardimModelos.ts` (muro com hera e roseiras, canteiros, figueira, banco de pedra,
  livro aberto); a montagem, a colisão e o santo, em `mundo/Jardim.ts` (`JardimDeAgostinho`).
- A porta estreita (1 m × 1,75 m) só se atravessa de joelhos: segurar Z (↓ no direcional) liga
  `Peregrino.ajoelhado`, que anda devagar, com as mãos postas e sem pulo nem ataque. O jogo copia isso em
  `Mundo.pequeno`, e a colisão ignora as caixas `baixa` quando ele está pequeno. Debaixo da verga
  (`JardimDeAgostinho.tetoBaixo`) ninguém se levanta; a margem é menor que o raio do peregrino, para que ele não
  fique de joelhos sem querer.
- Ao entrar pela primeira vez (`vale_porta_estreita`), recebe uma graça (`Jogo.receberGraca`) e ouve o "Toma e lê".
- **Santo Agostinho** (`entidades/Agostinho.ts`): bispo, de hábito agostiniano preto, capa pluvial dourada, mitra,
  báculo e o coração em chamas trespassado por uma seta. As falas (`dialogos/vale.ink`, nós `agostinho*` e
  `vale_livro`) são traduções nossas das Confissões e de Rm 13,13-14.

**A idade do peregrino**: `Jogo.idadeDaHistoria` decide pela história. O peregrino é jovem até embarcar na estrada do
mar para a Bahia (flag `peregrino_adulto`, ou `bahia_entrou` em saves antigos), e adulto daí em diante. A troca é
feita em `trocarArea`. O idoso fica para o final. `?idade=` continua forçando a idade em teste.

**A Cidade Dourada** (fase 2)

- Fica em (500, 0, 0). A estrada velha ao sul do Deserto (`Deserto.estradaSul`) só abre com `meiodia_vencido`.
- Dentro dos muros: praça dourada com fonte (descanso), 21 casas, o mercado, a capela da cidade (Frei Leão) e o
  palácio da Gula (o Salão do Banquete, abaixo). Fora: olivais, trigo, São Damião em ruínas, a pedreira, o casebre do
  leproso e a toca do lobo.
- A cor da cidade volta com as 4 sombras (`cidade_sombra_N`) e os 6 atos de piedade (`ATOS_CIDADE` em `Jogo.ts`):
  - curar o leproso;
  - ajudar Tomás, Rita e Beppo (socorrer ou dar o ouro);
  - fazer as pazes com o lobo;
  - reconstruir São Damião.
- Quem foi ajudado volta a falar com o peregrino uma vez e retribui (`evento("retribuir_x")`), restaurando tudo.
- São Damião: depois do leproso, Francisco pede as pedras. São 4 viagens da pedreira (`cidade_pedra_1..4`), e
  `Cidade.definirEstagioDamiao` troca a malha e a colisão a cada pedra.
- O lobo (`Animal` com `semFuga` e `seguir`) segue o peregrino depois do pacto. Quando os dois estão dentro dos
  muros, ele passa a morar na praça (`mudarCasa`).
- As iscas da Gula (cálice, prato, moedas, taça e coroa) dão um alívio na hora (coração ou energia) e 1 de peso.
- Os nós Ink ficam em `dialogos/cidade.ink`, e os efeitos em `Jogo.eventoDaCidade`.

**Mamom, o Guardião da Avareza**

- 30 de vida. A couraça só deixa o cajado ferir quando ele está atordoado pela luz.
- Ataques:
  - investida em série;
  - golpe sísmico com onda;
  - Corrente da Cobiça: o aviso trava em 0,85 s e o disparo sai em 1,3 s;
  - na fase 2, chuva de moedas, que caem em 1,45 s.
- Na metade da vida ele se enfurece e chama duas ajudantes.

**Acídia, o demônio do meio-dia**

- Cria 2 reflexos (3 na fase 2).
- Raios de sol caem 1,35 s depois da marca no chão.
- A névoa do torpor só se desfaz com oração.
- Também ataca com o mormaço em anel.

**Gula, o Banquete sem fim** (`entidades/Gula.ts`, arena `mundo/Banquete.ts`)

- O Salão do Banquete fica em (500, 0, -330), área `'palacio'`. As portas de ouro da cidade abrem com
  `cidade_damiao` e `cidade_lobo`. Quem o peregrino ajudou na cidade vem com ele (`Banquete.ajudantes`,
  `valor("ajudantes")` no Ink).
- 32 de vida. Enquanto há travessas na mesa (`Travessa`, alvos da mira), ela está saciada e nada a fere.
  Derrubadas todas (luz ou cajado, via `Area.atingirLuz`/`Area.golpear`), ela fica faminta por 7,5 s
  (estado `atordoada`) e aí o cajado fere. Depois o banquete volta; na fase 2 entra uma quarta travessa.
- Ataques:
  - iguarias: pratos caem 1,3 s depois da marca. Não ferem, mas dão peso (`Impacto.peso`, até 8);
  - devorar: aspira o peregrino para a boca por 2,6 s (`Impacto.arrasto`, mais forte quanto mais peso), e morde de perto;
  - barrigada: salta e solta um anel de vinho que se pula.
- O peso (`Jogo.pesoBanquete`) some ao repartir com um pobre (F perto dele; com Piedade 3, cada um devolve um
  coração uma vez por luta) ou rezando (jejum: −1 a cada 2,2 s).
- Vencida: as travessas viram pão, os pobres sentam à mesa (descanso) e conta como mais um passo na cor da cidade.
- Os nós Ink ficam em `dialogos/palacio.ink`.

**As Ruas da Bahia** (região 1; design completo em `docs/regioes/01-ruas-da-bahia.md`)

- Duas áreas ligadas pelo Elevador Lacerda: a Cidade Baixa em (0, 0, 700), `'bahiabaixa'`, e a Cidade Alta em
  (0, 0, 1000), `'bahiaalta'`. Chega-se pela estrada do mar da Cidade Dourada (`Cidade.estradaDoMar`), que só abre
  com a Gula vencida; volta-se de saveiro.
- O mapa é uma grade de colunas de 1 m por tipo de chão (`MapaDaBahia`, enum `T`). Nada de parede invisível:
  na água (e no mar aberto, fora do mapa da Cidade Baixa) o peregrino vadeia, com o fundo em `FUNDO_VAU` (a água
  pela cintura) até haver natação. Só a faixa da Cidade Baixa vista do alto devolve `PAREDE`; pinguelas, varandas das palafitas, a ladeira e a
  escadaria do Bonfim são `pisos` com altura própria.
- Os prédios ficam em `mundo/BahiaModelos.ts`: casario colonial em fileiras (`fileira`, com casa de esquina),
  palafitas, as igrejas parametrizadas por `EstiloIgreja` (Bonfim, São Francisco, Rosário, Catedral), o elevador,
  o Mercado Modelo, o convento e o galinheiro. A colina do Bonfim tem o gradil de fitas em toda a volta e o paredão
  coberto de fitas (`muroDeFitas`). Tudo é juntado em blocos de 40 m (`Juntador`). Paredes de cor lisa,
  para o greedy juntar as faces (cerca de 470 mil triângulos na Baixa).
- **Irmã Dulce** (`entidades/Dulce.ts`): `montarDulce(comMenino)` monta um `Humano` com a cabeça própria (touca branca,
  véu azul-marinho, rosto com as rugas finas e o sorriso) e o corpo menor (pescoço em 14 voxels, contra 17). Sem o
  menino, os braços são articulados e a mão direita segura o crucifixo; com ele, a pose do colo vai no corpo e só a
  cabeça gesticula. São dois `Npc` no mesmo lugar (`DULCE` e `DULCE_COM_MENINO`); `BahiaBaixa.dulceEmCena` diz
  qual está visível (o menino sai do colo com `bahia_menino_abrigado`).
- A primeira cena: na calçada da avenida, diante de uma porta fechada. Ela chama o peregrino quando ele chega a
  6,5 m (`Jogo.atualizarBahia`, flag `bahia_dulce_chamou`); o nó `dulce` marca `bahia_dulce_conheceu`.
- Os diálogos ficam em `dialogos/bahia.ink`. A cor volta com a flag `bahia_restaurada`.
- **A procura do abrigo** (o primeiro ato de piedade). As flags, na ordem: `bahia_casa_aberta` (o peregrino força a
  porta pregada da casa abandonada junto ao cais, `casaAbandonada(aberta)` em `BahiaModelos.ts`; a porta é a caixa
  `portaCasa`, aberta com `topo = -PAREDE`), `bahia_casa_expulsos` (ele deita o menino na esteira, o dono chega,
  nó `bahia_dono`, e os põe para fora) e `bahia_menino_abrigado` (o menino dorme na esteira à porta do Convento de
  Santo Antônio, nó `bahia_convento`; dá uma graça via `Jogo.atoDaBahia`). `BahiaBaixa.reiniciar(flags)` põe
  Dulce, o menino, o dono e a porta no lugar de cada etapa ao carregar o jogo.
- **Carregar alguém**: `Peregrino.carregar(obj, 'costas')` (a pedra de São Damião usa `'ombro'`). Com carga o
  peregrino fica mais lento e não pula; com o menino (`Jogo.meninoComPeregrino`) também não usa o cajado, mas reza.
  O menino não vai para o save: se a carga cai (troca de área, recarga), ele volta para os braços de Dulce.
  `menino('costas' | 'deitado')` em `Dulce.ts` monta o menino em cada pose. Os eventos Ink são
  `carregar_menino` e `expulsos` (`Jogo.eventoDaBahia`).
- **NPCs que andam**: `Npc.andarPara(destino, dt, chao, vel)` anda em linha reta (quem chama escolhe um caminho livre)
  e `Npc.colocar(p, rumo)` teletransporta. Dulce segue `CAMINHOS_DULCE` (`BahiaBaixa.dulceIr`), mais depressa
  quando está longe do peregrino, para nunca deixar o jogador esperando.
- **Os esquecidos** (`entidades/Enfermos.ts`): seis enfermos com nome e história (`ENFERMOS`): Dona Zefa e Lúcia nas
  varandas das palafitas, Seu Bento numa canoa que a maré levou (vai-se vadeando), Raimundo junto ao Mercado, Dona
  Ana nos degraus do Rosário dos Pretos e João no beco ao lado (Cidade Alta). Cada área põe os seus com
  `porEnfermos()`. F socorre (nó `bahia_enfermo_<id>`, que termina em `~ evento("carregar_enfermo")`) e põe a
  pessoa nas costas; à porta do convento, F a deita numa esteira (`bahia_entrega_<id>`, flag
  `bahia_recolhido_<id>`, uma graça). As esteiras do abrigo ficam ao longo da parede do convento (`ABRIGO`). Com os
  seis, `bahia_esquecidos_todos` (Dulce fala do galinheiro). Antes de `bahia_menino_abrigado`, o Espírito Santo só
  aponta para eles. O elevador leva junto quem vai nas costas (`trocarArea(..., manterCarga)`); qualquer outra troca de
  área devolve o enfermo ao lugar dele. `nasCostas(h, f)` e `deitado(h, f)` são as poses de qualquer humano (o menino
  também usa); adultos vão nas costas a 0,8 da escala.
- **Os que passam** (`entidades/Passantes.ts`): vultos de pedra de chapéu e guarda-chuva, em `FilaDePassantes`. Com
  velocidade, andam em fila por um caminho (aberto: vão e voltam como uma corrente, a volta 0,6 m ao lado; fechado: em
  laço); sem velocidade, ficam parados fechando uma passagem (a boca do beco de João). São sólidos e empurram
  (`colidir`); a luz desfaz um por 30 s (`atingirLuz`, e a mira trava neles por `alvos()`); com alguém nas costas do
  peregrino (`alguemNasCostas`, que o Jogo avisa a cada quadro), a fila a menos de 7 m para, dá um passo para o lado e
  levanta a cabeça. Somem com `bahia_coracao_vencido` (a flag virá com o chefão). Filas: em volta do Mercado e na
  avenida (Baixa), em volta do Terreiro e no beco (Alta).
- **O comerciante** (pedir pelos pobres): com os seis no abrigo, Dulce manda o peregrino ao armazém da avenida
  (`ARMAZEM`, modelo `armazem()`; flag `bahia_comerciante_pedido`). No nó `bahia_comerciante` ele cospe na mão
  estendida, e há três respostas: a mansa (`bahia_comerciante_manso`, evento `comerciante_sai`: ele vai para a porta do
  convento), a raiva (`bahia_comerciante_raiva`: a porta bate; pode-se voltar, e no `de_novo` ele não cospe mais) e ir
  embora. No convento, ele fala sozinho quando o peregrino chega a 6,5 m (`bahia_comerciante_doacao`, evento `doacao`:
  flag `bahia_comerciante_doou`, uma graça, os `mantimentos()` à porta) e, longe dos olhos, volta para a loja. As falas
  do episódio são do roteiro, não citações de Dulce.
- **O galinheiro** (`mundo/Hospital.ts`): o galinheiro do convento cresce em estágios, todos vindos das flags
  (`Hospital.aplicar`). Depois da doação, Dulce pede à madre superiora (`SUPERIORA` em `entidades/Dulce.ts`, à porta
  do convento) e ganha a licença (`bahia_galinheiro_licenca`; evento `dulce_galinheiro`: ela vai a pé para lá). O
  peregrino tira as quatro sujeiras (`SUJEIRAS`, flags `bahia_galinheiro_<id>`, e no fim `bahia_galinheiro_limpo`),
  estende as seis esteiras (`bahia_esteira_<id>`, e `bahia_galinheiro_esteiras`) e leva cada um do abrigo para a sua
  (`bahia_leito_<id>`). Com os seis, `bahia_galinheiro_pronto` pede o evento `passagem`: a tela escurece e,
  "semanas depois", vem a enfermaria (`bahia_enfermaria`, uma graça): paredes caiadas com barra azul, catres de
  ferro (os seis e o menino), lamparinas com luz e a bacia. Com o peregrino dentro, o telhado some e a câmera
  passa por cima das paredes, como na capela (`dentro`, `alturaCamera`). O Hospital Irmã Dulce (o terceiro
  estágio) vem com a vitória sobre o Coração de Pedra (abaixo, "A cor volta").
- **O Bonfim por dentro** (`mundo/Capela.ts`, `mundo/SalaDosMilagres.ts`): a fachada (`igreja(IGREJA_BONFIM, true)`,
  com a porta central aberta) é um objeto à parte que some com o peregrino dentro; a nave é uma `CapelaRegional`
  com `ESTILO_BONFIM` (`embutida`: sem adro, campanário nem telhado; `interiorBonfim`: barra de azulejo, retábulo e
  altares laterais de talha dourada com colunas torsas, tribunas, lustres e o teto pintado, visto só de baixo). O
  `CAPELAO` confessa (o roteiro `capela_confissao` de sempre: confissão, comunhão, descanso e *checkpoint*). Na parede
  direita, a porta da Sala dos Milagres (`Capela.anexos`, `CapelaRegional.naSala`): a parede de fotos, a cortiça com
  bilhetes, a cascata de fitinhas, o nicho das velas e a grade dos corações de prata. Com `bahia_coracao_vencido`,
  cada `bahia_leito_<id>` deixa ali uma foto e uma carta que se lê (`bahia_milagre_<id>`). Primeira entrada:
  `bahia_bonfim_entrada`; primeira vez na sala: `bahia_sala_milagres`; no altar: `bahia_altar`.
- **O Coração de Pedra** (`entidades/CoracaoDePedra.ts`, `mundo/LargoDoCruzeiro.ts`; id `bahiaalta_coracao`): o
  chefão da Bahia, no Largo do Cruzeiro, só depois da enfermaria (`bahia_enfermaria`). Um colosso de calçamento de
  sobrecasaca e cartola, máscara lisa sem boca, que não olha para ninguém; o coração de pedra fica atrás de uma
  grade de ferro colonial no peito. Ele não sente golpe (`ferir` devolve `bloqueado`) enquanto a grade estiver
  fechada. Cinco enfermos no largo viram pedra aos poucos (`TEMPO_PEDRA`); socorrer um (F) o põe de pé, rezando,
  com um raio de oração no peito do colosso. Com três orações a grade cai e o coração fica exposto por 8 s (o
  estado `atordoada`); depois todos voltam ao chão. Um enfermo que petrifica cura o chefe (+3). Ataques: o
  **olhar cinzento** (um cone; quem é pego fica *indiferente* por 4 s: anda devagar e não socorre, salvo se estiver
  atrás de alguém que socorreu), as **pedras rolando** (fileiras com vãos) e as **portas batendo** (uma onda que se
  pula). Na segunda fase ele leva a mão ao ouvido ("Não é comigo."): fica surdo, os olhos aparecem e tudo acelera.
  Vencido: a pedra desmorona, sobra um coração de carne batendo, `bahia_coracao_vencido`, o diálogo
  `bahia_coracao_vencido` (Ez 36,26) e o largo se esvazia. Diálogo de entrada: `bahia_coracao`.
- **A cor volta** (passo 9; `mundo/HospitalModelos.ts`): com `bahia_coracao_vencido`, o galinheiro vira o Hospital
  Irmã Dulce (`Hospital.estagio` 3; as paredes que colidem trocam em `BahiaBaixa.reiniciar`). Por fora: dois
  andares caiados com barra verde-água, a entrada curva de vidro (`materialVidro`) sob a marquise em arco, as
  colunas, os vasos com palmeirinhas, o letreiro em letras verdes (só as letras, sem o logotipo) e o pátio com a
  mangueira. Por dentro: a enfermaria com os seis, o menino e, na frente, os cinco do Largo; a capelinha a oeste
  (altar, sacrário, bancos; a oração rende em dobro, `naCapelinha`) e o quarto de Irmã Dulce a leste, com a
  cadeira (`bahia_cadeira`). Cada catre conversa (`Hospital.leitos`, nós `bahia_leito_<id>`, `bahia_leito_menino`,
  `bahia_leito_largo`), e há o médico voluntário (`bahia_medico`). Na primeira entrada, Irmã Dulce chama
  (`bahia_hospital_entrou`; o nó `dulce` vai para `no_hospital` e `o_dom`): o evento `piedade_aperfeicoada` abre a
  Piedade 4 e 5, marca `bahia_restaurada` (uma graça), o sino do Bonfim toca três vezes (`Som.sino`) e vem
  `bahia_restaurada`. A **cor da Bahia** (`Jogo.corDaBahia`) volta aos poucos com a provação (até a metade: os
  recolhidos, o menino, a doação, a enfermaria) e toda com a vitória; a cor na tela segue o alvo devagar
  (`Jogo.corVisivel`). As galinhas foram para o quintal, a oeste. Com a vitória a cidade também se enfeita:
  as mesinhas com guarda-sol vermelho nos dois lados do Largo do Pelourinho (`mesaComGuardaSol`) e, nas
  palafitas dos Alagados, os varais de roupa e os vasos de flor (`enfeitesDaPalafita`). O que só aparece depois
  da cor fica em `MapaDaBahia.depoisDaCor`, e as caixas que vêm com ele em `caixasDaCor` (desligadas antes, com
  `topo = -PAREDE`); as duas listas são acertadas em `reiniciar`.

## Diálogos

As conversas são escritas em **[Ink](https://github.com/inkle/ink)** (MIT), a linguagem de roteiro da inkle,
usada em jogos comerciais. JSON escrito à mão não serve aqui: não tem desvio, condição nem escolha, e o erro só
aparece quando a fala toca.

**Como funciona**

- `tools/vite-plugin-ink.ts` compila `src/dialogos/peregrino.ink` (e os `INCLUDE`) no build, como o inklecate.
  Um erro de roteiro (nó inexistente, desvio quebrado, função não declarada) derruba o build com arquivo e linha.
  No servidor de desenvolvimento, editar uma fala recarrega o jogo.
- O jogo carrega só o runtime do inkjs (cerca de 34 KB com gzip). O compilador fica no build.
- Uma única história para o jogo todo. Cada conversa é um nó, tocado com `jogo.dialogos.tocar('no', fim?)`.
  Pedidos feitos durante outra conversa entram na fila.
- O `Estado` (save) é a fonte da verdade. O Ink não guarda variáveis persistentes; ele consulta o jogo pelas
  funções externas.

**Convenções do roteiro**

| Escrita | Efeito |
|---|---|
| `antao: texto` | fala de um falante de `dialogo/Falantes.ts` (o id define nome, estilo e retrato) |
| `* [opção]` | escolha; o jogador escolhe com 1–9, setas ou clique |
| `#pausa:1.4` | fecha a caixa por 1,4 s antes da fala |
| `#gesto:sim` | gesto de quem fala (`#gesto:rita=acolher` para outro personagem em cena) |
| `#plano:perto` | pede um enquadramento à câmera de conversa (`geral`, `perto`, `ombro`) |
| `~ evento("dom_ciencia")` | efeito de jogo tratado em `Jogo.eventoDialogo` |
| `~ marcar("flag")` | grava uma flag no save |

Funções externas: `tem(flag)`, `primeira(flag)` (verdadeiro só na primeira vez, e já marca), `nivel(dom)`,
`valor(chave)` (números do jogo, em `Jogo.valorDialogo`), `nome()` e `g(masculino, feminino)` para o gênero
do peregrino. As consultas puras são registradas como seguras para a leitura antecipada do Ink; as que mudam o
jogo, não.

**Estilos da caixa**: `espirito` (dourado), `inscricao` (itálico), `vicio` (violeta). Falantes sem estilo usam
a caixa comum.

### Cenas de conversa

Numa conversa com um NPC, a câmera e os corpos encenam o diálogo. Quando cada fala aparece, o Hud chama
`Jogo.aoFalar`, e o jogo acha o corpo de quem fala com `Npc.doFalante(id, perto)` (o NPC visível mais perto com
aquele falante).

**Câmera de conversa** (`core/CameraConversa.ts`)

- É uma camada sobre a câmera de terceira pessoa: a de jogo continua calculando por baixo, e a de conversa mistura
  posição, direção e lente (60° → 44°) por um peso que sobe em 0,6 s ao começar e desce ao terminar.
- Planos:

  | Plano | Quando | Enquadramento |
  |---|---|---|
  | `npc` | o NPC fala | por cima do ombro do peregrino; o rosto do NPC num terço da tela |
  | `peregrino` | as escolhas aparecem | o contraplano, por cima do ombro do NPC |
  | `geral` | abertura e `#plano:geral` | os dois de lado |
  | `perto` | `#plano:perto`, ou quando o ombro tapa o rosto | o rosto de quem fala |

- Segue a regra dos 180 graus: o lado da linha entre os dois é escolhido no começo (o mesmo da câmera de jogo) e
  mantido nos planos e contraplanos. Trocar de plano é corte seco; o plano se aproxima devagar enquanto dura.
- Se a parede ou o corpo do outro tapar o rosto enquadrado (um raio contra o corpo de quem está em primeiro plano;
  o Francisco, por exemplo, tem os braços erguidos), tenta abrir mais para o lado, depois o plano de perto, o outro
  lado da linha e, por fim, o plano geral. Se nada couber, fica a câmera de jogo.
- Falas sem corpo (o Espírito Santo, as placas) mantêm o plano atual. O peregrino se vira para quem fala.
- Só entra fora de luta, confissão, queda e troca de área, com o NPC a menos de 8 m, e se a opção **Câmera nas
  conversas** (Configurações → Geral, `Preferencias.cameraConversa`) estiver ligada. Faixas de cinema (`#cinema`)
  descem e o painel de status e a mira somem (`body.em-conversa`).

**Gestos** (`entidades/Gestos.ts`)

- Cada `Npc` tem um `Gesticulador`. Os gestos são procedurais: curvas curtas que somam uma pose (tronco, cabeça
  e braços) por cima do olhar e da respiração do NPC.
- Gestos: `sim`, `nao`, `inclinar`, `ceu` (olhar o alto, braços de orante), `explicar`, `abencoar` (a mão traça
  a cruz), `acolher`, `triste`, `surpresa`, `rezar` (mãos postas), `pensar` e `peito` (a mão no peito).
- Enquanto a caixa escreve a fala, a cabeça acompanha as sílabas; numa fala longa sem gesto pedido, a mão livre
  acompanha a frase (`explicar`).
- Os braços do `Humano` são grupos com a articulação no ombro (`bracoD` em -x, `bracoE` em +x), e o objeto da
  mão vai junto. `maoOcupada` diz qual mão segura algo, e os gestos de uma mão usam a outra.
- Os santos de modelo inteiro (Antão, Francisco) guardam a pose da iconografia: neles o gesto vira uma inclinação
  contida do corpo todo.

## Capelas

`CapelaRegional` junta a capela, o padre, as caixas de colisão e os pisos em coordenadas do mundo. Uma área expõe a
sua em `Area.capela`, e o `Jogo` liga sozinho a confissão, o sacrário, o altar e a câmera de interior
(`interacoesDaCapela`). No confessionário, `Dialogos.apelidos` faz o nó comum `capela_confissao` falar com a voz
do padre da região (padre no Vale, Frei Leão na cidade).

`mundo/Capela.ts` monta a capela de uma região. A planta é sempre a mesma; o `EstiloCapela` muda as cores
(reboco, pedra, telha, madeira, piso, vitrais, flores), e cada região passa o seu.

| Região | Estilo | Confessor |
|---|---|---|
| Vale | `ESTILO_VALE`: reboco claro, telha vermelha | o padre (`padre`) |
| Cidade Dourada | `ESTILO_UMBRIA`: pedra rosada do Subásio, vitrais no azul de Giotto | Frei Leão (`frei_leao`) |
| Deserto das Vozes | `ESTILO_DESERTO`: adobe caiado, terraço com cúpulas, piso de terracota | o monge do deserto (`monge`) |

`EstiloCapela.cobertura` escolhe o alto do prédio:

- `telhado` (padrão): duas águas de telha, empenas em degraus e campanário em pirâmide;
- `cupulas`: o terraço caiado com parapeito e ameias, gárgulas de madeira e três cúpulas com tambor e cruz (a maior
  sobre o altar). O campanário ganha uma cupulazinha. É o estilo dos mosteiros que nasceram em volta de Antão (o de
  Santo Antão, no Mar Vermelho). `cal` é a cor das cúpulas.

A capela do deserto fica ao norte do poço, com a porta para o rastro (`CAPELA_DESERTO`). `gerarAlturas` aplana o
chão em volta e abre uma trilha até o rastro. A primeira entrada toca `deserto_capela`, e o altar fala por
`deserto_altar`, que aponta o próximo passo da região.

- **Casca** em voxel de 0,25 m (9 × 14 m, paredes de 5 m): paredes com rodapé de pedra e lambri, vitrais em arco,
  porta em arco com rosácea, piso em xadrez com tapete no corredor, presbitério um degrau acima.
- **Parte de cima** (empenas, telhado em degraus, campanário com sino e cruz) é uma malha só, `telhado`, que some
  quando o peregrino entra. Dentro, a câmera usa `subirAoBater`, como na cripta, com braço de 4,3 m, e enxerga as
  paredes como chão alto (`Mundo.alturaCamera`).
- **Mobília** em voxel de 0,125 m: bancos com genuflexório, grade de comunhão aberta no centro, altar com toalha,
  velas e missal, sacrário com conopeu e a lâmpada do Santíssimo (luz vermelha que tremula), crucifixo (1/22 m),
  ambão, sede, imagens de Nossa Senhora e de São José, velas votivas, pias de água benta, Via Sacra e arandelas.
- **Confessionário** (0,1 m): lado do penitente aberto, com genuflexório e grade; o padre fica atrás da porta de
  treliça. O peregrino cabe lá dentro.
- `construirCapela()` devolve, em coordenadas locais, as caixas de colisão, os pisos elevados (que a `altura()` da
  área soma ao terreno), o retângulo do interior, as luzes (apagadas longe, sem mudar o número de luzes) e os pontos
  de interação: porta, comunhão, sacrário, entrada do confessionário, onde ajoelhar, a grade e o lugar do padre.

## Fauna

Os bichos vêm do Veloren. `npm run fauna` (`tools/fauna-veloren.mjs`) baixa os `.vox` de cada espécie do
`CATALOGO` e lê, nos manifestos `.ron` e nos `mod.rs` de animação, onde cada peça encaixa. O resultado fica em
`src/fauna/especies.gerado.json`, que não se edita à mão.

Alguns `.vox` do Veloren guardam várias peças num arquivo só (o rato: peito, cabeça, cauda e patas). O manifesto
escolhe a peça por `model_index`, que o importador grava como `indice` e `carregarVox(url, indice)` respeita. Sem
isso, todas as peças viram o primeiro modelo do arquivo.

- **`Especies.ts`**: a ficha de cada espécie (nome, comportamento, velocidade, distância de fuga, se aceita
  carinho, voz, se nada, altitude de voo).
- **`Corpo.ts`**: três esqueletos, `QuadrupedePequeno`, `QuadrupedeMedio` e `Ave`, com as animações do Veloren
  traduzidas (`idle`, `run`, `feed`, `fly`). Os ossos ficam no espaço do Veloren (z para cima). A cada quadro,
  `calcular()` escreve a pose-alvo e `posar()` aproxima os ossos dela (lerp/slerp com `k = min(1, 15·dt)`, como o
  `interpolate` do Veloren). A animação recebe uma `Pose` (`vel`, `giro`, `subida`, `comer`, `voar`,
  `bater`, `olhar`), que o `Animal` mede pelo deslocamento real. Assim, o passo acompanha a velocidade de verdade
  e a curva inclina o corpo. A geometria é compartilhada entre os bichos da mesma espécie.
- **`Animal.ts`**: comportamentos `pasto`, `arisco` (foge), `manso` (segue o peregrino), `ave_chao`, `ave_voo`
  (levanta voo quando assustada) e `voo_continuo` (águia e morcego).
- **`Fauna.ts`**: cada área declara `povoamento()`, ou seja, quem vive onde, quantos e em que raio. A Fauna sorteia
  lugares válidos com semente fixa, só atualiza quem está a menos de 55 m e esconde quem passa de 95 m. De vez em
  quando, o bicho mais perto faz a sua voz (sintetizada em `Som.voz`).
- **Nova espécie**: acrescente-a no `CATALOGO` e em `FICHAS`, rode `npm run fauna` e coloque-a no `povoamento()`
  da região. Registre o arquivo em `CREDITOS.md`.

### Animação do peregrino

`src/entidades/Peregrino.ts` é procedural. A fase do passo acompanha a velocidade, com o tronco inclinado à
frente, o quadril girando e a cabeça compensando. Parado, ele respira, troca o peso de perna e às vezes olha em
volta. Ao pousar de um salto, agacha conforme a velocidade de queda, e inclina o corpo nas curvas. O chapéu, o
cajado e a lamparina usam molas amortecidas (`Mola`, integrada em passos de 1/120 s), o que dá movimento
secundário. Ações como `golpe`, `rezar` e `carinho` sobrepõem a pose. No `carinho`, ele se ajoelha para os
bichos pequenos ou fica de pé para os grandes (`carinhoAlto`).

## NPCs e retratos

- **`entidades/Npc.ts`**: base de todo personagem com quem se conversa. A ficha (`DefNpc`) diz o id, o falante,
  o nó do roteiro e a aparência. O NPC respira, vira o corpo para o peregrino a menos de 9 m, acompanha com a
  cabeça (até ±1 rad) e gesticula conforme o roteiro (veja [Cenas de conversa](#cenas-de-conversa)).
- **`Jogo.falarCom(npc)`** cria a interação padrão ("F: falar com …") e liga `npc.falando` durante a conversa.
- **`voxel/Humano.ts`**: monta gente do povo a partir de um `Figurino` (gênero, idade, pele, penteado, traje,
  barba, acessório, auréola). A cabeça é 6³, como a do peregrino, e fica num grupo próprio para poder girar.
  `figurinoDoPovo(semente, 'pobre' | 'povo' | 'rico')` sorteia multidões variadas e sempre iguais para a mesma
  semente.
- **Santos** não usam o figurino genérico. Cada um tem modelo próprio, com a iconografia clássica (o Santo Antão,
  por exemplo, tem o bastão em tau e a barba longa). A ficha recebe uma função que devolve o modelo.
- **`dialogo/Retratos.ts`**: na primeira fala de cada personagem, o rosto é renderizado uma vez com o próprio
  renderer num alvo de 160×160, guardado como imagem e reaproveitado. O NPC registra o retrato ao nascer.
  Falantes sem corpo (Espírito Santo, inscrições) ficam sem retrato.

## Controle (gamepad)

O jogo lê o controle pela Gamepad API, quadro a quadro, só no "mapeamento padrão" (Chrome, Edge e Firefox o
entregam para Xbox, PlayStation, Switch Pro, 8BitDo e a maioria dos genéricos). O navegador só mostra o controle
ao jogo depois que o jogador aperta um botão nele.

- **`core/Controle.ts`**:
  - lê o controle em uso; se outro controle tiver um botão apertado, ele assume;
  - zona morta radial de 0,16 com reescala;
  - os gatilhos contam como apertados a partir de 0,5 e soltam abaixo de 0,35;
  - descobre a família (`xbox`/`playstation`) pelo id: vendor `054c`, ou o nome "Wireless Controller" sem marca;
  - vibra com `vibrationActuator.playEffect('dual-rumble')`.
- **`core/Entrada.ts`**: `lerControle(menu)` roda no começo de `Jogo.quadro`. No jogo, cada botão vira a tecla
  que o jogo já lê (`MAPA_CONTROLE`), num conjunto à parte (`virtuais`) para o keyup do teclado não soltá-lo.
  O jogo não sabe de onde veio o comando. Além disso:
  - `eixo()` é analógico: o analógico meio inclinado anda devagar;
  - L3 liga a corrida até o analógico voltar ao centro;
  - o analógico direito tem curva 1,8 e vira giro de câmera em `giroControle`, com sensibilidade e inversão
    próprias;
  - `PadCima`/`PadBaixo` (direcional, ou um toque no analógico) só servem às escolhas de diálogo, para não
    andar como as setas;
  - `dispositivo` guarda o último aparelho usado (teclado, mouse ou controle). Trocar de aparelho põe a classe
    `no-controle` no body (esconde o cursor e mostra o contorno dourado do foco) e troca as dicas.
- **`ui/NavegacaoControle.ts`**: roda nos menus (tela inicial, criação, pausa, dons, configurações):
  - o direcional dispara setas sintéticas (com repetição). Se a tela não as consumir (`preventDefault`), o foco
    anda para o elemento mais próximo naquela direção: primeiro a fileira mais próxima, nela o mais alinhado;
  - só contam elementos visíveis na camada de cima (teste com `elementFromPoint`);
  - A clica o foco (ou manda Enter, se não há foco), B e Menu mandam Esc, View manda G;
  - LB e RB trocam as abas (`[data-aba]`), ←/→ ajustam um controle deslizante e o analógico direito rola;
  - uma tela nova não precisa de código de controle: basta usar botões, ou tratar as setas e o Enter.
- **`ui/Rotulos.ts`**: os textos continuam escritos com as teclas ("F: falar", "segure R", "(Espaço)").
  `rotularTeclas` os troca na hora de mostrar (`Hud.rotular`: dicas, avisos, diálogos e chips). Os textos fixos
  das telas usam `data-controle="Voltar · {B}"`, preenchido por `trocarRotulosDaTela`. Ao mudar o mapa em
  `MAPA_CONTROLE`, ajuste também `rotularTeclas` e o `MAPA` de `Configuracoes.ts`.
- **Vibração** (`Jogo.tremer`): ao levar dano, ao acertar com o cajado e ao cair. Desliga em Configurações.
- **Testar sem controle**: no console, troque `navigator.getGamepads` por uma função que devolve um objeto
  `{ id, index: 0, connected: true, mapping: 'standard', axes: [0,0,0,0], buttons: [{ pressed, value }...] }`
  e mude `buttons`/`axes` entre os quadros.

## Interface

Toda a interface é HTML e SVG desenhados por código, sem imagens.

- **`Vitral.ts`**: moldura de vitral, rubi e arabescos.
- **`Menu.ts`**: tela inicial, 3 espaços de save, créditos.
- **`Criacao.ts`**: criação do personagem.
- **`Hud.ts`**: corações inteiros e meios (o da Eucaristia em dourado), barras, mira, barra do chefão e a
  caixa de diálogo (retrato, texto que corre, escolhas numeradas).
- **`Minimapa.ts`**: minimapa redondo que gira com a câmera.
- **Mira livre** (`Jogo.atualizarMiraLivre`, `Hud.mostrarRetic`), inspirada no Veloren e no Minecraft:
  - a câmera olha 1,05 m acima da cabeça (`CameraTerceira.elevacaoMira`; 0,5 m na capela). O peregrino fica um
    pouco abaixo do centro e a mira fica livre por cima dele, como no Veloren;
  - para mirar no alto, a câmera desce até `ARFAGEM_LIVRE` (−0,8): o braço encolhe rente ao chão e passa para
    cima do ombro direito. A direção do olhar é sempre a do braço inteiro, então a mira não salta quando o braço
    encosta no chão ou numa parede. Na cripta e na capela, sem teto, o limite continua alto;
  - um raio sai da câmera pelo centro da tela, até 45 m. Ele para na primeira sombra ou alvo, ou no que é maciço
    (`Area.alturaCamera`, que na cidade inclui casas, palácio e o arco da porta). O trecho até o peregrino não conta;
  - sem alvo travado, a luz vai para esse ponto, e o golpe e a luz viram o corpo para a mira;
  - estilos (Configurações › Geral, `Preferencias.mira`):
    - `cruz`: a do Minecraft, branca em `mix-blend-mode: difference`. Fica fora do `#hud` para inverter a cor
      do próprio jogo atrás dela;
    - `anel`: a do Veloren, círculo com contorno escuro e ponto central;
    - `ponto`;
    - `desligada`;
  - sobre um inimigo, a mira cresce ou fica vermelha;
  - ao alcance do cajado, aparece embaixo um pequeno cajado dourado (o indicador de ataque do Minecraft);
  - um acerto pisca um X (`Hud.acertou`);
  - sem energia ou com torpor, a mira fica fraca;
  - ela some com a mira travada (aí vale o losango sobre o alvo), em diálogos, na oração, na confissão e nos menus.
- **`Pausa.ts`**: menu de pausa.
- **`Configuracoes.ts`**: abas Geral, Controles e Gráficos. Enquanto a janela está aberta, ela captura as teclas.
- **`Dons.ts`** e **`IconesDons.ts`**: a rosácea dos sete dons, com ícones SVG.
- **`creditos.ts`**: os créditos que rolam na tela.

## Assets e licenças

- O projeto é **GPL-3.0-or-later**. Só entram assets com licença compatível: CC0, CC-BY, CC-BY-SA, GPL ou OFL.
- Antes de buscar assets, veja [docs/FONTES-DE-ASSETS.md](docs/FONTES-DE-ASSETS.md).
- Ao incluir um asset novo:
  - registre em [CREDITOS.md](CREDITOS.md) o arquivo, a origem e a licença;
  - acrescente o autor em `src/ui/creditos.ts`.
- A arte original é feita por código; o som é sintetizado em tempo real (`core/Som.ts`).

## Próximos passos

O roteiro segue o Documento base e o GDD complementar (na pasta acima do projeto). Já estão prontos o Vale, o
Deserto e a Cidade Dourada, com Mamom, a Acídia e a Gula. Das Ruas da Bahia, já estão prontos o mapa (Cidade
Baixa e Cidade Alta), Irmã Dulce, a casa abandonada, a mecânica de carregar, os esquecidos, o comerciante e o galinheiro que vira
enfermaria, o interior do Bonfim com a Sala dos Milagres, o Coração de Pedra e "a cor volta": o Hospital Irmã
Dulce e a Piedade aperfeiçoada (níveis 4 e 5). A provação da Bahia está completa. No Vale, Santo Agostinho e a
porta estreita fecham o Temor de Deus, e o peregrino envelhece com a história.

### A base do jogo

1. **As 7 regiões que faltam**, cada uma com santo guia, provação, chefão-vício com mecânica própria, capela no
   estilo da região e a passagem do mundo cinza para a cor:

   | Região | Santo guia | Provação | Dom |
   |---|---|---|---|
   | Mar da Tempestade | São Paulo | Naufrágio, perseverar na missão | Conselho |
   | Catacumbas e Arena | Santas Perpétua e Felicidade, São Lourenço | Fidelidade sob ameaça | Fortaleza |
   | O Castelo Interior | Santa Teresa d'Ávila | Atravessar as 7 moradas da alma | Entendimento |
   | A Noite Escura | São João da Cruz | Seguir quando Deus parece em silêncio | Sabedoria |
   | Campo de Auschwitz (capítulo sério) | São Maximiliano Kolbe | Dar a vida pelo outro | Todos |
   | Mundo Digital (bônus) | São Carlo Acutis | Usar a tecnologia para o bem | Conselho |
   | A Passagem (final) | Todos os santos | Travessia do rio de luz | — |

   Os vícios que ainda não viraram chefão são a Soberba, a Inveja, a Ira e a Ilusão. Como há mais regiões do que
   vícios, falta decidir o chefão de cada região.
2. **Árvore de dons**: os níveis 1 a 5 de Conselho, Fortaleza, Entendimento e Sabedoria, as combinações de dons
   (por exemplo, Fortaleza + Piedade protege os NPCs) e o ajuste do equilíbrio dos dons que já existem.
3. **O final, A Passagem e a Morada Celeste**: o peregrino idoso, o rio de luz, os santos e as pessoas que ele
   ajudou à espera, e Jesus chamando-o pelo nome. O final deve refletir a jornada de cada jogador e ter um
   significado especial.
4. **Trilha sonora** a partir de gravações de domínio público (Musopen), com tema cinza e restaurado por região.

### Depois da base

- Missões secundárias: 2 a 4 por região, com os NPCs locais.
- As expansões planejadas.
