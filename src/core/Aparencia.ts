/**
 * Identidade visual do peregrino (Documento base seção 2; GDD seção 10), portada do protótipo 2D:
 * gênero, pele, cabelo, cor do cabelo, roupa, cor da roupa e chapéu, sobre o mesmo esqueleto voxel.
 * A idade não é escolhida: o jogo envelhece o peregrino ao longo da história.
 */
export type Genero = 'm' | 'f';
export type Idade = 'jovem' | 'adulto' | 'idoso';
export type EstiloCabelo = 'curto' | 'raspado' | 'cacheado' | 'crespo' | 'longo' | 'tranca' | 'coque';
export type VarianteRoupa = 'tunica' | 'capa' | 'veste' | 'faixa';

export interface Identidade {
  nome: string;
  genero: Genero;
  idade: Idade;
  /** Índices nas listas abaixo. */
  pele: number;
  corCabelo: number;
  corRoupa: number;
  cabelo: EstiloCabelo;
  roupa: VarianteRoupa;
  chapeu: boolean;
}

export interface Opcao<T> {
  valor: T;
  nome: string;
}

/** 8 tons, do mais claro ao mais escuro. */
export const TONS_PELE: number[] = [0xf4d6c0, 0xe8bc9c, 0xd6a47e, 0xc28a62, 0x9a6a46, 0x7e5236, 0x603e2a, 0x45291c];

export const CORES_CABELO: Opcao<number>[] = [
  { valor: 0x231a17, nome: 'Preto' },
  { valor: 0x3b2618, nome: 'Castanho-escuro' },
  { valor: 0x6e4628, nome: 'Castanho' },
  { valor: 0x9c4822, nome: 'Ruivo' },
  { valor: 0xd0a865, nome: 'Loiro' },
];

export const CORES_ROUPA: Opcao<number>[] = [
  { valor: 0xd8cdb4, nome: 'Linho cru' },
  { valor: 0x6a84b4, nome: 'Azul do manto' },
  { valor: 0xa65448, nome: 'Barro' },
  { valor: 0x83905a, nome: 'Oliveira' },
  { valor: 0x8a74a8, nome: 'Violeta' },
  { valor: 0xa4805a, nome: 'Couro' },
];

export const ROUPAS: Opcao<VarianteRoupa>[] = [
  { valor: 'tunica', nome: 'Túnica com galão' },
  { valor: 'capa', nome: 'Capa de Santiago' },
  { valor: 'veste', nome: 'Veste com capuz' },
  { valor: 'faixa', nome: 'Túnica com estola' },
];

export const NOMES_CABELO: Record<EstiloCabelo, string> = {
  curto: 'Curto',
  raspado: 'Raspado',
  cacheado: 'Cacheado',
  crespo: 'Crespo',
  longo: 'Longo',
  tranca: 'Trança',
  coque: 'Coque',
};

export const CABELOS_POR_GENERO: Record<Genero, EstiloCabelo[]> = {
  m: ['curto', 'raspado', 'cacheado', 'crespo', 'longo'],
  f: ['longo', 'tranca', 'coque', 'cacheado', 'crespo', 'curto'],
};

export const NOMES_IDADE: Record<Idade, string> = { jovem: 'Jovem', adulto: 'Adulto', idoso: 'Idoso' };

/** Sugestões de nomes bíblicos e de santos. */
export const NOMES_SUGERIDOS: Record<Genero, string[]> = {
  m: ['Tiago', 'Bento', 'Francisco', 'Tomé', 'Elias', 'Davi', 'Inácio', 'Estêvão', 'Agostinho', 'André', 'Lucas', 'Domingos', 'Jerônimo', 'Antônio', 'Simão', 'Bartolomeu'],
  f: ['Maria', 'Clara', 'Teresa', 'Rute', 'Ana', 'Mônica', 'Catarina', 'Rita', 'Isabel', 'Inês', 'Cecília', 'Lúcia', 'Ester', 'Marta', 'Joana', 'Bernadete'],
};

export const TAMANHO_NOME = 14;

export function identidadePadrao(genero: Genero = 'm'): Identidade {
  return {
    nome: genero === 'm' ? 'Tiago' : 'Clara',
    genero,
    idade: 'jovem',
    pele: 3,
    corCabelo: 1,
    corRoupa: 5,
    cabelo: CABELOS_POR_GENERO[genero][0],
    roupa: 'capa',
    chapeu: true,
  };
}

/** Garante que um save antigo ou mexido à mão vire uma identidade válida. */
export function normalizar(id: Partial<Identidade> | undefined): Identidade {
  const g: Genero = id?.genero === 'f' ? 'f' : 'm';
  const base = identidadePadrao(g);
  const lim = (i: unknown, n: number, padrao: number) =>
    typeof i === 'number' && Number.isFinite(i) ? Math.min(Math.max(0, Math.round(i)), n - 1) : padrao;
  const nome = typeof id?.nome === 'string' && id.nome.trim() ? id.nome.trim().slice(0, TAMANHO_NOME) : base.nome;
  return {
    nome,
    genero: g,
    idade: id?.idade === 'adulto' || id?.idade === 'idoso' ? id.idade : 'jovem',
    pele: lim(id?.pele, TONS_PELE.length, base.pele),
    corCabelo: lim(id?.corCabelo, CORES_CABELO.length, base.corCabelo),
    corRoupa: lim(id?.corRoupa, CORES_ROUPA.length, base.corRoupa),
    cabelo: id?.cabelo && CABELOS_POR_GENERO[g].includes(id.cabelo) ? id.cabelo : base.cabelo,
    roupa: ROUPAS.some((r) => r.valor === id?.roupa) ? (id!.roupa as VarianteRoupa) : base.roupa,
    chapeu: id?.chapeu !== false,
  };
}

/** Cores e formas já resolvidas, prontas para o boneco (serve também para NPCs). */
export interface Visual {
  genero: Genero;
  idade: Idade;
  cabelo: EstiloCabelo;
  roupa: VarianteRoupa;
  chapeu: boolean;
  corPele: number;
  corCabelo: number;
  corRoupa: number;
}

export function misturar(a: number, b: number, t: number) {
  const ca = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
  const cb = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return (c[0] << 16) | (c[1] << 8) | c[2];
}

const GRISALHO = 0xc9c5bd;

/** O cabelo fica grisalho com a idade (Documento base). */
export function corCabeloNaIdade(cor: number, idade: Idade): number {
  if (idade === 'idoso') return misturar(cor, GRISALHO, 0.78);
  if (idade === 'adulto') return misturar(cor, GRISALHO, 0.12);
  return cor;
}

export function visualDe(id: Identidade, idade: Idade = id.idade): Visual {
  return {
    genero: id.genero,
    idade,
    cabelo: id.cabelo,
    roupa: id.roupa,
    chapeu: id.chapeu,
    corPele: TONS_PELE[id.pele],
    corCabelo: corCabeloNaIdade(CORES_CABELO[id.corCabelo].valor, idade),
    corRoupa: CORES_ROUPA[id.corRoupa].valor,
  };
}

/** Substitui {nome} e {o|a} (gênero) nos textos. */
export function texto(t: string, id: Identidade) {
  return t
    .replace(/\{nome\}/g, id.nome)
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) => (id.genero === 'f' ? f : m));
}
