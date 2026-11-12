# Onde buscar assets livres para o Peregrino

O jogo é **GPL-3.0**. Um asset só entra se a licença dele for compatível:

| Licença | Pode usar? | O que exige |
|---|---|---|
| **CC0** (domínio público) | Sim | Nada (registramos a origem mesmo assim) |
| **CC-BY 3.0/4.0** | Sim | Crédito ao autor no CREDITOS.md e na tela de créditos |
| **CC-BY-SA 4.0** | Sim (compatível com GPL-3.0) | Crédito, e versões modificadas do asset ficam na mesma licença |
| **GPL-2.0+/GPL-3.0** | Sim | Crédito e manter a licença |
| OFL (fontes) | Sim | Manter o aviso da licença junto da fonte |
| **CC-BY-NC**, **CC-BY-ND**, "grátis para uso pessoal", "royalty-free" | **Não** | Não são licenças livres |
| Ripados de jogos comerciais (Zelda, etc.) | **Nunca** | São protegidos |

Antes de baixar, confira a licença **na página de cada asset**: sites como OpenGameArt, Poly Pizza e Sketchfab misturam licenças.

## Modelos 3D: personagens, animais, objetos e cenário

| Site | Licença | O que tem | Combina com o estilo voxel? |
|---|---|---|---|
| [Veloren (GitHub)](https://github.com/veloren/veloren/tree/master/assets/voxygen/voxel) | GPL-3.0 | Mais de 200 espécies de animais e monstros em `npc/`, humanoides em peças (`figure/`, `armor/`), árvores em `assets/world/tree/`, móveis, plantações, baús, portas e janelas em `sprite/`, objetos em `object/` | **Sim, é a base atual** |
| [Kenney](https://kenney.nl/assets) | CC0 | Nature Kit, Castle Kit, Survival Kit, Furniture Kit, personagens animados, cartas e UI | Low-poly, mas combina com o filtro do jogo |
| [Quaternius](https://quaternius.com) | CC0 | Animais low-poly animados, personagens com rig, natureza, vilas medievais, *Universal Animation Library* | Low-poly com animações |
| [KayKit (Kay Lousberg)](https://kaylousberg.itch.io) | CC0 (packs gratuitos) | Adventurers, Dungeon Remastered, Forest Nature Pack, Medieval Builder | Low-poly, estilo coeso |
| [Poly Pizza](https://poly.pizza) | CC0 ou CC-BY (varia) | Milhares de modelos low-poly com busca | Variado, conferir licença |
| [OpenGameArt: 3D](https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=10) | Varia (filtrar CC0, CC-BY, CC-BY-SA, GPL) | Modelos, inclusive voxel | Variado |
| [Sketchfab](https://sketchfab.com/search?features=downloadable&type=models) (usar o filtro "License") | Filtrar por CC0/CC-BY | Modelos detalhados | Usar com cuidado (estilos diferentes) |

**Ferramenta para editar e criar voxels:** [MagicaVoxel](https://ephtracy.github.io) (gratuita). Abre e salva o mesmo `.vox` que o jogo lê, então dá para editar os modelos do Veloren ou desenhar os nossos (santos, igrejas, peregrinos).

## Texturas, céu e materiais

| Site | Licença | O que tem |
|---|---|---|
| [Poly Haven](https://polyhaven.com) | CC0 | Texturas PBR, HDRIs de céu, alguns modelos |
| [ambientCG](https://ambientcg.com) | CC0 | Texturas PBR (pedra, madeira, tecido, terra) |

## Mapas e terreno

O jogo **gera o terreno por código** (`src/mundo/Terreno.ts`), como o Veloren, então não é preciso baixar mapas. Para relevos reais:

- **[Veloren worldgen](https://github.com/veloren/veloren/tree/master/world)** (GPL-3.0): erosão, rios, biomas e vilas. Dá para estudar e portar ideias, ou trechos de código (a licença é a mesma).
- **Dados de relevo SRTM / Copernicus DEM** (domínio público / uso livre): mapas de altura de lugares reais, por exemplo para recriar o Caminho de Santiago ou o monte Tabor. Busca em [OpenTopography](https://opentopography.org).

## Sons e música

| Site | Licença | O que tem |
|---|---|---|
| [Freesound](https://freesound.org/search/?f=license:%22Creative+Commons+0%22) | Filtrar CC0 | Passos, sinos, vento, água, animais, coral |
| [Kenney: áudio](https://kenney.nl/assets) (categoria Audio) | CC0 | Efeitos de UI, impacto e RPG |
| [OpenGameArt: Música](https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12) | Varia | Trilhas orquestrais e ambientes |
| [Musopen](https://musopen.org) | Domínio público (conferir cada gravação) | Gravações de música clássica e sacra: Bach, Palestrina, canto gregoriano |
| [Veloren: áudio](https://github.com/veloren/veloren/tree/master/assets/voxygen/audio) | GPL-3.0 | Efeitos e trilhas do Veloren |

Hoje os sons do jogo são sintetizados por código (`src/core/Som.ts`).

## Fontes

- [Google Fonts](https://fonts.google.com) (OFL). Sugestões para o tom do jogo: *Cinzel* (títulos de inscrição), *EB Garamond* ou *Cormorant* (texto).

## Como registrar um asset novo

1. Baixe para `public/assets/<origem>/<categoria>/`.
2. Acrescente uma linha no [CREDITOS.md](../CREDITOS.md): arquivo no jogo, nome original, autor, link e licença.
3. Se for CC-BY ou CC-BY-SA, o nome do autor também precisa aparecer na tela de créditos do jogo.
