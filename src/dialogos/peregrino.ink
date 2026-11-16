// ─────────────────────────────────────────────────────────────────────────────
// Peregrino: roteiro principal (Ink). Compilado no build por tools/vite-plugin-ink.ts.
//
// Convenções (ver DEVELOPER.md › Diálogos):
//   falante: texto          cada fala começa com o id de quem fala (src/dialogo/Falantes.ts)
//   #pausa:1.4              antes de mostrar esta fala, fecha a caixa por 1,4 s
//   * [Opção]               escolhas do jogador
//   ~ evento("nome")        efeito de jogo (som, item, dom), tratado em Jogo.ts
//   {nome()} {g("o","a")}   nome do peregrino e concordância de gênero
//
// O save do jogo (Estado) é a fonte da verdade: o roteiro lê e grava flags pelas
// funções abaixo, e não guarda variáveis próprias entre conversas.
// ─────────────────────────────────────────────────────────────────────────────

/// A flag está marcada no save?
EXTERNAL tem(flag)
/// Marca a flag no save (e salva).
EXTERNAL marcar(flag)
/// Verdadeiro só na primeira vez: marca a flag e devolve se ela ainda não existia.
EXTERNAL primeira(flag)
/// Nível do dom (0 a 5): "temor", "ciencia", "piedade"…
EXTERNAL nivel(dom)
/// Número calculado pelo jogo (ver Jogo.valorDialogo): "faltam_vale", "miragens"…
EXTERNAL valor(chave)
/// Nome do peregrino.
EXTERNAL nome()
/// Concordância: devolve o masculino ou o feminino conforme o peregrino.
EXTERNAL g(masculino, feminino)
/// Efeito de jogo no meio da conversa (ver Jogo.eventoDialogo).
EXTERNAL evento(nome)

INCLUDE vale.ink
INCLUDE cripta.ink
INCLUDE deserto.ink
INCLUDE meiodia.ink
INCLUDE cidade.ink
INCLUDE palacio.ink
INCLUDE bahia.ink
INCLUDE creta.ink
INCLUDE navio.ink
INCLUDE naufragio.ink
INCLUDE malta.ink

-> END
