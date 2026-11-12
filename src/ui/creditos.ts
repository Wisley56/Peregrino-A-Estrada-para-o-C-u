/**
 * Créditos do jogo, no formato de rolagem (função → nomes), como nos créditos finais dos jogos.
 * O detalhe legal (arquivos, caminhos e licenças de cada asset) fica em CREDITOS.md: ao incluir um asset
 * novo, registre lá e acrescente aqui quem o fez.
 */
export interface BlocoCreditos {
  /** Função, em versalete dourado. Ausente = só os nomes (um título, uma frase). */
  funcao?: string;
  nomes: string[];
  /** Linha pequena abaixo dos nomes (licença, origem). */
  nota?: string;
  /** Espaço maior antes do bloco: separa as partes. */
  parte?: boolean;
}

export const CREDITOS: BlocoCreditos[] = [
  { funcao: 'Criação, roteiro e direção', nomes: ['Wisley Santos'] },
  { funcao: 'Programação', nomes: ['Wisley Santos'] },
  { funcao: 'Arte voxel original', nomes: ['Wisley Santos'], nota: 'o peregrino, a pomba, as sombras, Mamom, Santo Antão, a Acídia, a capela, a cripta, o deserto, o Poço do Meio-Dia, a Cidade Dourada, São Francisco, o Salão do Banquete e a Gula' },

  { funcao: 'Modelos voxel adicionais', nomes: ['Os contribuidores do Veloren'], nota: 'bichos (29 espécies) e suas animações, pinheiros, álamos, flores, grama, pedras e fogueira · GPL 3.0', parte: true },
  { funcao: 'Som', nomes: ['Sintetizado em tempo real pelo próprio jogo'] },
  { funcao: 'Tipografia', nomes: ['Cinzel, de Natanael Gama', 'EB Garamond, de Georg Duffner e Octavio Pardo'], nota: 'SIL Open Font License' },

  { funcao: 'Feito com', nomes: ['three.js', 'Ink (inkle) e inkjs', 'TypeScript', 'Vite', 'Fontsource'], parte: true },

  { funcao: 'Agradecimentos especiais', nomes: ['À comunidade do software livre', 'Aos peregrinos de todos os caminhos'], parte: true },

  { nomes: ['“Eu sou o Caminho, a Verdade e a Vida.”'], nota: 'João 14,6', parte: true },

  { nomes: ['Peregrino é software livre'], nota: 'GPL-3.0-or-later · as licenças de cada obra estão em CREDITOS.md', parte: true },
  { nomes: ['Obrigado por caminhar conosco.'], parte: true },
];
