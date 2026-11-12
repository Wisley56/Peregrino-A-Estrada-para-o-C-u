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
npm run build      # tsc + vite build: gera dist/ (site estático)
npm run preview    # serve o dist/ para conferir o build
```

O `dist/` é um site estático e pode ser publicado em qualquer hospedagem de arquivos.

Parâmetros de URL para testes:

- `?idade=jovem|adulto|idoso` força a idade do peregrino (teste do envelhecimento).

O protótipo 2D anterior (Phaser) continua em `../jogo`, como referência de sistemas e de narrativa.

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
  voxel/     Malha (greedy meshing e AO embutido), Vox (leitor .vox do MagicaVoxel/Veloren), Modelo (voxels por código)
  mundo/     Area (interface comum), Terreno, Mundo (o Vale), Cripta, Deserto, PocoMeioDia,
             Cenario (capela, cruzeiro, céu, entrada da cripta, véu, lamparina)
  entidades/ Peregrino, Ovelha (Veloren), Sombra, Guardiao (Mamom e a interface Chefe), Acedia, Antao, Pomba
  core/      Aparencia (identidade e paletas), Camera, Entrada, Estado (save), Dons, Preferencias, Ruido, Som
  fx/        Efeitos (pós-processamento)
  ui/        Hud, Criacao, Menu, Minimapa, Pausa, Configuracoes, Dons (rosácea), IconesDons, Vitral, creditos
  Jogo.ts    laço principal e regras
public/assets/veloren/   modelos .vox do Veloren (GPL-3.0)
docs/FONTES-DE-ASSETS.md sites com assets livres e regras de licença
docs/imagens/            banner e capturas de tela do README (1920×1080, gráficos no Ultra)
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
`{ sensibilidade, graficos }`. Os valores lidos são validados; o que vier inválido volta ao padrão.

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

**Oração**

- Rende 5, depois 8, depois 12 de energia por segundo (depois de 3 s e de 6 s).
- Rende o dobro junto ao cruzeiro, na capela e nos outros lugares santos.

## Áreas e chefões

| Área | Arquivo | Destaques técnicos |
|---|---|---|
| O Vale | `mundo/Mundo.ts` | Terreno gerado, capela, cruzeiro, ovelhas do Veloren; a névoa a oeste exige a lamparina acesa |
| Cripta dos Primeiros Peregrinos | `mundo/Cripta.ts` | Braseiros com chama de 14 s; arena de Mamom (`entidades/Guardiao.ts`) |
| Deserto das Vozes | `mundo/Deserto.ts` | Miragens que viram sombras, vozes, rocha falsa revelada pela Ciência |
| Poço do Meio-Dia | `mundo/PocoMeioDia.ts` | A Acídia (`entidades/Acedia.ts`), reflexos que só a Ciência desfaz, torpor |

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

## Interface

Toda a interface é HTML e SVG desenhados por código, sem imagens.

- **`Vitral.ts`**: moldura de vitral, rubi e arabescos.
- **`Menu.ts`**: tela inicial, 3 espaços de save, créditos.
- **`Criacao.ts`**: criação do personagem.
- **`Hud.ts`**: corações inteiros e meios, barras, mira, diálogo, barra do chefão.
- **`Minimapa.ts`**: minimapa redondo que gira com a câmera.
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

1. Portar do protótipo 2D o diálogo em JSON, as condições (`dom:x>=n`) e os gatilhos.
2. Usar os humanoides do Veloren (`figure/` e `armor/`) para os NPCs da vila e os santos.
3. Criar cenas para as conversas com os NPCs: câmera de diálogo, gestos e animações.
4. Montar a trilha sonora a partir de gravações de domínio público (Musopen).
