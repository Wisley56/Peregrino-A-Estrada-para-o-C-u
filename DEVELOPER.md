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
  `cidade`) já começa na área. Só no modo dev.

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
  mundo/     Area (interface comum), Terreno, Mundo (o Vale), Cripta, Deserto, PocoMeioDia, Cidade (a Cidade Dourada),
             CidadeModelos (casas, palácio, São Damião, iscas), Capela (capela de região com interior, confessionário
             e CapelaRegional), Cenario (cruzeiro, céu, entrada da cripta, véu, lamparina)
  fauna/     Especies (fichas), Corpo (esqueletos do Veloren), Animal (comportamento), Fauna (povoamento por área)
  entidades/ Peregrino, Npc (base de quem conversa), Sombra, Guardiao (Mamom e a interface Chefe),
             Acedia, Antao e Francisco (fichas de NPC com modelo próprio), Pomba
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
- **`Modelo.ts`** monta modelos voxel por código: o peregrino, a pomba, as sombras, os santos e os chefões.
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

| Nível | Piedade (São Francisco) |
|---|---|
| 1 | Mãos que servem: socorrer alguém custa 20 de energia |
| 2 | Partilha: socorrer custa 12 |
| 3 | Misericórdia: cada ato de piedade devolve um coração |
| 4 | Pobreza alegre: o ouro da Gula pesa a metade |
| 5 | Instrumento da paz: a oração rende o dobro junto de quem você ajudou |

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
| O Vale | `mundo/Mundo.ts` | Terreno gerado, capela com interior, cruzeiro, fauna pastoril; a névoa a oeste exige a lamparina acesa |
| Cripta dos Primeiros Peregrinos | `mundo/Cripta.ts` | Braseiros com chama de 14 s; arena de Mamom (`entidades/Guardiao.ts`) |
| Deserto das Vozes | `mundo/Deserto.ts` | Miragens que viram sombras, vozes, rocha falsa revelada pela Ciência |
| Poço do Meio-Dia | `mundo/PocoMeioDia.ts` | A Acídia (`entidades/Acedia.ts`), reflexos que só a Ciência desfaz, torpor |
| Cidade Dourada | `mundo/Cidade.ts` | Cidade murada na Úmbria, peso, atos de piedade, São Damião reconstruída pedra a pedra, o lobo de Gubbio |
| Palácio da Gula | `mundo/Banquete.ts` | Salão do Banquete; a Gula (`entidades/Gula.ts`), travessas como alvos, peso repartido com os pobres |

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
| `~ evento("dom_ciencia")` | efeito de jogo tratado em `Jogo.eventoDialogo` |
| `~ marcar("flag")` | grava uma flag no save |

Funções externas: `tem(flag)`, `primeira(flag)` (verdadeiro só na primeira vez, e já marca), `nivel(dom)`,
`valor(chave)` (números do jogo, em `Jogo.valorDialogo`), `nome()` e `g(masculino, feminino)` para o gênero
do peregrino. As consultas puras são registradas como seguras para a leitura antecipada do Ink; as que mudam o
jogo, não.

**Estilos da caixa**: `espirito` (dourado), `inscricao` (itálico), `vicio` (violeta). Falantes sem estilo usam
a caixa comum.

## Capelas

`CapelaRegional` junta a capela, o padre, as caixas de colisão e os pisos em coordenadas do mundo. Uma área expõe a
sua em `Area.capela`, e o `Jogo` liga sozinho a confissão, o sacrário, o altar e a câmera de interior
(`interacoesDaCapela`). No confessionário, `Dialogos.apelidos` faz o nó comum `capela_confissao` falar com a voz
do padre da região (padre no Vale, Frei Leão na cidade).

`mundo/Capela.ts` monta a capela de uma região. A planta é sempre a mesma; o `EstiloCapela` muda as cores
(reboco, pedra, telha, madeira, piso, vitrais, flores), e cada região passa o seu.

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
  cabeça (até ±1 rad) e acena enquanto fala.
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

1. O chefão da Gula, "O Banquete sem fim", no palácio da Cidade Dourada (as portas já estão lá, trancadas).
2. Uma capela por região com `CapelaRegional` (o Vale e a cidade já têm a sua; falta o Deserto).
3. Criar cenas para as conversas com os NPCs: câmera de diálogo, gestos e animações.
4. Montar a trilha sonora a partir de gravações de domínio público (Musopen).
