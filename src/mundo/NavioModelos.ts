import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';

/**
 * O navio de Paulo: um cargueiro de trigo de Alexandria (At 27,6), como os que levavam o grão do Egito para Roma.
 * Arte por código, em voxels de 0,25 m. O comprimento corre ao longo de z, com a proa em +z; a origem fica na linha
 * d'água, no meio do navio. Servem ao porto de Creta (atracado, vela recolhida) e à tempestade (vela aberta).
 *
 * Do navio antigo: o casco largo e bojudo, pintado de piche abaixo da água; os olhos pintados na proa; o pescoço de
 * cisne dourado na popa; o mastro grande com a vela quadrada de linho e a verga; o artemão inclinado na proa; os
 * dois remos-leme da popa; a cabine do piloto; o bote rebocado (At 27,16.30) e as âncoras (At 27,29).
 */

export const V = 0.25;
/** Comprimento e boca (largura máxima) em voxels: 30 m × 8,5 m. */
const L = 120;
const B = 34;
/** A quilha fica 6 voxels abaixo da água (1,5 m de calado); o convés, no meio, 6 voxels acima. */
const QUILHA = -6;
const CONVES = 6;
/** A borda falsa sobe 3 voxels acima do convés (0,75 m). */
const BORDA = 3;

/** Meia-largura do casco (voxels) na altura `y` e na posição `u` (-1 popa … 1 proa). */
function meiaLargura(y: number, u: number) {
  const p = u > 0 ? 2.2 : 3.2; // a proa afina, a popa é cheia
  const comprimento = Math.sqrt(Math.max(0, 1 - Math.abs(u) ** p));
  const fundo = 0.32 + 0.68 * Math.sqrt(Math.max(0, (y - QUILHA) / (CONVES + BORDA - QUILHA)));
  return (B / 2) * comprimento * Math.min(1, fundo);
}

/** Altura do convés (voxels) em `u`: as pontas sobem (o tosado). */
function alturaConves(u: number) {
  return CONVES + Math.round(4 * Math.abs(u) ** 3);
}

// ───────────── para a física (em metros, coordenadas locais do navio) ─────────────

/** Altura do convés (m acima da água) no z local. */
export function convesEm(z: number) {
  return (alturaConves(z / V / (L / 2)) + 1) * V;
}

/** Meia-largura do convés (m) no z local, por dentro da borda. */
export function meiaLarguraConves(z: number) {
  const u = z / V / (L / 2);
  if (Math.abs(u) >= 1) return 0;
  return Math.max(0, meiaLargura(alturaConves(u), u) - 1) * V;
}

/** Altura do alto da borda falsa (m acima da água) no z local. */
export function bordaEm(z: number) {
  return convesEm(z) + BORDA * V;
}

/** Meio comprimento do navio (m). */
export const MEIO_COMPRIMENTO = (L / 2) * V;
/** O mastro grande (m, local) e a cabine da popa (retângulo local, m). */
export const MASTRO = { x: 0, z: 2 };
export const CABINE = { x0: -2.25, x1: 2.25, z0: -12.5, z1: -8.5, altura: 2.25 };

const CORES = {
  piche: 0x2c2622,
  casco: 0x6a4a30,
  cascoClaro: 0x7c5838,
  faixa: 0x9a4426,
  conves: 0xb8915e,
  convesJunta: 0x9a7448,
  ouro: 0xd2a640,
  cisne: 0xece4d0,
  linho: 0xe8dcc0,
  linhoEscuro: 0xcabb98,
  madeira: 0x8a6a42,
  corda: 0xb9a57a,
  olhoBranco: 0xf2eee4,
  olhoNegro: 0x1a1414,
};

/** O casco, o convés, a borda, os olhos da proa, o cisne da popa, a cabine e a escotilha (uma malha). */
function casco() {
  const m = new Modelo();
  const meio = L / 2;
  for (let z = -meio; z < meio; z++) {
    const u = (z + 0.5) / meio;
    const conves = alturaConves(u);
    const topo = conves + BORDA;
    for (let y = QUILHA; y <= topo; y++) {
      const w = meiaLargura(Math.min(y, conves), u);
      if (w < 0.6) continue;
      const wi = Math.floor(w);
      for (let x = -wi; x < wi; x++) {
        const casca = Math.abs(x + 0.5) > w - 1.6 || y === QUILHA;
        if (y > conves) {
          if (Math.abs(x + 0.5) <= w - 1) continue; // por cima do convés, só a borda
        } else if (y === conves) {
          if (!casca) {
            m.ponto(x, y, z, variar(x % 3 === 0 ? CORES.convesJunta : CORES.conves, x, y, z, 0.04));
            continue;
          }
        } else if (!casca) continue; // o porão fica oco
        let cor: number;
        if (y < 0) cor = CORES.piche;
        else if (y === conves - 2 || y === conves - 1) cor = CORES.faixa;
        else if (y > conves) cor = y === topo ? CORES.madeira : CORES.cascoClaro;
        else cor = y % 2 === 0 ? CORES.casco : CORES.cascoClaro;
        m.ponto(x, y, z, variar(cor, x, y, z, 0.05));
      }
    }
  }
  // os olhos pintados dos dois lados da proa (a tradição mediterrânea: o navio vê o caminho)
  const zOlho = Math.round(meio * 0.82);
  const uO = (zOlho + 0.5) / meio;
  const yO = alturaConves(uO) - 4;
  const wO = Math.floor(meiaLargura(yO, uO));
  for (const lado of [-1, 1]) {
    const x = lado > 0 ? wO : -wO - 1;
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 1; dy++) {
        if (Math.abs(dz) === 2 && dy !== 0) continue;
        m.ponto(x, yO + dy, zOlho + dz, Math.abs(dz) <= 1 && dy === 0 ? CORES.olhoNegro : CORES.olhoBranco);
      }
  }
  // a roda de proa, que sobe e avança
  for (let i = 0; i < 10; i++) m.caixa(-1, alturaConves(1) + i - 2, meio - 1 + Math.floor(i * 0.5), 2, 1, 2, variar(CORES.madeira, 0, i, 0, 0.04));
  // o pescoço de cisne da popa: sobe atrás e se curva para a frente, com a cabeça dourada
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const zz = -meio - 2 + Math.round(Math.sin(t * Math.PI * 0.9) * 5 - t * t * 2 + t * 6);
    const yy = alturaConves(-1) + Math.round(t * 14);
    m.caixa(-1, yy, zz, 2, 1, 2, t > 0.85 ? CORES.ouro : CORES.cisne);
  }
  const yCab = alturaConves(-1) + 14, zCab = -meio + 4;
  m.caixa(-1, yCab, zCab, 2, 2, 3, CORES.cisne).caixa(-1, yCab, zCab + 3, 2, 1, 2, CORES.ouro);
  m.ponto(-1, yCab + 1, zCab + 1, CORES.olhoNegro).ponto(0, yCab + 1, zCab + 1, CORES.olhoNegro);
  // a cabine do piloto, na popa: paredes de tábua, telhado de duas águas e a porta para a proa
  const c = { x0: CABINE.x0 / V, x1: CABINE.x1 / V, z0: CABINE.z0 / V, z1: CABINE.z1 / V, y: alturaConves(CABINE.z0 / V / meio) + 1 };
  const alt = CABINE.altura / V;
  m.caixa(c.x0, c.y, c.z0, c.x1 - c.x0, alt, c.z1 - c.z0, (x, y, z) => variar((x + z) % 2 === 0 ? CORES.cascoClaro : CORES.madeira, x, y, z, 0.04));
  m.caixa(c.x0 + 1, c.y, c.z0 + 1, c.x1 - c.x0 - 2, alt, c.z1 - c.z0 - 2, null);
  m.caixa(-2, c.y, c.z1 - 1, 4, 6, 1, 0x3a2a1c); // a porta
  for (let i = 0; i <= (c.x1 - c.x0) / 2; i++)
    m.caixa(c.x0 + i - 1, c.y + alt + Math.min(i, 3), c.z0 - 1, 1, 1, c.z1 - c.z0 + 2, CORES.faixa).caixa(c.x1 - i, c.y + alt + Math.min(i, 3), c.z0 - 1, 1, 1, c.z1 - c.z0 + 2, CORES.faixa);
  // a escotilha do porão, fechada com tábuas, à frente do mastro
  m.caixa(-6, CONVES + 1, 14, 12, 1, 12, (x, y, z) => variar((x + 6) % 4 === 0 ? CORES.madeira : CORES.convesJunta, x, y, z, 0.04));
  // os paus de amarração no convés
  for (const [x, z] of [[-11, 30], [10, 30], [-12, -24], [11, -24], [-12, 0], [11, 0]]) m.caixa(x, CONVES + 1, z, 1, 3, 1, CORES.madeira);
  return m.malha(V, [0, 0, 0]);
}

/** O mastro grande, a verga e a vela (recolhida na verga, ou aberta e cheia de vento). */
function mastroEVela(aberta: boolean) {
  const g = new THREE.Group();
  const m = new Modelo();
  const altura = 58;
  const mz = MASTRO.z / V;
  m.caixa(-1, CONVES + 1, mz - 1, 2, altura, 2, (x, y, z) => variar(CORES.madeira, x, y, z, 0.04));
  // o cesto da gávea e a verga, de lado a lado
  const yVerga = CONVES + altura - 6;
  m.caixa(-42, yVerga, mz - 2, 84, 1, 1, CORES.madeira);
  m.caixa(-2, CONVES + altura - 2, mz - 2, 4, 2, 3, CORES.madeira);
  const malhaMastro = m.malha(V, [0, 0, 0]);
  g.add(malhaMastro);

  const vela = new Modelo();
  if (aberta) {
    // a vela quadrada de linho, bojuda, com as faixas de reforço e a barra escura embaixo
    const alto = 38;
    for (let x = -38; x < 38; x++)
      for (let y = 0; y < alto; y++) {
        const bojo = Math.round(6 * (1 - (x / 38) ** 2) * Math.sin((Math.PI * (y + 2)) / (alto + 4)));
        const faixa = (x + 38) % 8 === 0 || y === 0 || y === alto - 1;
        vela.ponto(x, yVerga - 1 - y, mz - 2 + bojo + 1, variar(faixa ? CORES.linhoEscuro : CORES.linho, x, y, 0, 0.03));
      }
  } else {
    // recolhida: o linho enrolado debaixo da verga, preso pelas cordas
    for (let x = -38; x < 38; x++) {
      const gordo = 2 + Math.round(Math.abs(Math.sin(x * 0.4)) * 0.8);
      vela.caixa(x, yVerga - gordo, mz - 2, 1, gordo, 2, variar(x % 6 === 0 ? CORES.corda : CORES.linho, x, 0, 0, 0.03));
    }
  }
  g.add(vela.malha(V, [0, 0, 0]));
  return g;
}

/** O artemão: o mastro pequeno da proa, inclinado para a frente, com a vela pequena (aberta) ou enrolada. */
function artemao(aberta: boolean) {
  const m = new Modelo();
  m.caixa(-1, 0, -1, 2, 30, 2, CORES.madeira);
  m.caixa(-12, 26, -1, 24, 1, 1, CORES.madeira);
  if (aberta) for (let x = -11; x < 11; x++) for (let y = 12; y < 26; y++) m.ponto(x, y, 1, variar(CORES.linho, x, y, 0, 0.03));
  else m.caixa(-11, 24, 0, 22, 2, 2, CORES.linho);
  const malha = m.malha(V, [0, 0, 0]);
  malha.position.set(0, (alturaConves(0.85) + 1) * V, (L / 2) * 0.86 * V);
  malha.rotation.x = 0.55; // inclinado sobre a proa
  return malha;
}

/** Um remo-leme: a haste comprida e a pá larga. */
function remoLeme() {
  const m = new Modelo();
  m.caixa(0, 0, 0, 1, 26, 1, CORES.madeira);
  m.caixa(-1, -10, 0, 3, 10, 1, (x, y, z) => variar(CORES.casco, x, y, z, 0.05));
  return m.malha(V, [0.5, 0, 0.5]);
}

/** O bote (escaler) que o navio leva a reboque: At 27,16 (içado na tempestade) e 27,30-32 (os marinheiros fogem nele). */
export function bote() {
  const m = new Modelo();
  const comp = 20, larg = 7;
  for (let z = -comp / 2; z < comp / 2; z++) {
    const u = (z + 0.5) / (comp / 2);
    const w = (larg / 2) * Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 2.4));
    for (let y = -2; y <= 2; y++) {
      const wy = w * (0.5 + 0.5 * ((y + 2) / 4));
      for (let x = -Math.ceil(wy); x < Math.ceil(wy); x++) {
        const casca = Math.abs(x + 0.5) > wy - 1.2 || y === -2;
        if (!casca) continue;
        m.ponto(x, y, z, variar(y < 0 ? CORES.piche : y === 2 ? CORES.madeira : CORES.cascoClaro, x, y, z, 0.05));
      }
    }
  }
  m.caixa(-3, 0, -2, 6, 1, 1, CORES.madeira).caixa(-3, 0, 3, 6, 1, 1, CORES.madeira); // os bancos
  m.caixa(-4, 1, -1, 8, 1, 1, CORES.madeira); // um remo atravessado
  return m.malha(V, [0, 0, 0]);
}

/** Uma ânfora de vinho ou de azeite (voxel de 0,125 m). */
export function anfora(semente = 0) {
  const m = new Modelo();
  const cor = [0xb86a3c, 0xc47a48, 0xa85e34][semente % 3];
  const perfil = [1, 2, 3, 3, 3, 3, 2, 2, 1, 1, 1, 2];
  perfil.forEach((r, y) => {
    for (let x = -r; x < r; x++) for (let z = -r; z < r; z++) if (x * x + z * z <= r * r + 1) m.ponto(x, y, z, variar(cor, x, y, z, 0.05));
  });
  m.caixa(-3, 9, 0, 1, 2, 1, cor).caixa(2, 9, -1, 1, 2, 1, cor); // as asas
  return m.malha(0.125, [0, 0, 0]);
}

/** Um saco de trigo (o navio vai cheio do grão do Egito: At 27,38). */
export function sacoDeTrigo(semente = 0) {
  const m = new Modelo();
  const cor = semente % 2 ? 0xd8c8a0 : 0xcab98e;
  m.caixa(-3, 0, -2, 6, 3, 4, (x, y, z) => variar(cor, x, y, z, 0.05));
  m.caixa(-2, 3, -1, 4, 1, 2, cor).caixa(-1, 4, -1, 2, 1, 2, 0x9a8458);
  return m.malha(0.125, [0, 0, 0]);
}

/** Uma âncora de ferro com o cepo de chumbo, deitada. */
export function ancora() {
  const m = new Modelo();
  m.caixa(0, 0, -6, 1, 1, 12, 0x4a4a4e);
  m.caixa(-3, 0, -6, 7, 1, 1, 0x4a4a4e).caixa(-3, 0, -6, 1, 1, 3, 0x4a4a4e).caixa(3, 0, -6, 1, 1, 3, 0x4a4a4e);
  m.caixa(-4, 0, 4, 9, 1, 1, 0x6a6a72);
  m.caixa(0, 0, 6, 1, 1, 2, 0x4a4a4e);
  return m.malha(0.125, [0, 0, 0]);
}

/** As cordas do mastro (estais e ovéns), em linhas finas. */
function cordame() {
  const pts: number[] = [];
  const topo = (CONVES + 56) * V, mz = MASTRO.z;
  const meio = (L / 2) * V;
  const linha = (a: number[], b: number[]) => pts.push(...a, ...b);
  linha([0, topo, mz], [0, (alturaConves(1) + 2) * V, meio - 0.5]); // o estai da proa
  linha([0, topo, mz], [0, (alturaConves(-1) + 3) * V, -meio + 1.5]); // o estai da popa
  for (const lado of [-1, 1]) for (const dz of [-1.5, 0, 1.5]) linha([0, topo - 0.5, mz], [lado * meiaLarguraConves(mz + dz) + lado * 0.2, convesEm(mz + dz) + BORDA * V, mz + dz]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x4a3a28 }));
}

/** O navio inteiro. `aberta`: as velas soltas (no mar); recolhidas, no porto. O bote vem à parte (`bote`). */
export function navioAlexandrino(aberta: boolean) {
  const g = new THREE.Group();
  g.add(casco(), mastroEVela(aberta), artemao(aberta), cordame());
  for (const lado of [-1, 1]) {
    const remo = remoLeme();
    const z = -MEIO_COMPRIMENTO + 2.6;
    remo.position.set(lado * (meiaLarguraConves(z) + 0.35), bordaEm(z), z);
    remo.rotation.set(-0.45, 0, lado * 0.32);
    g.add(remo);
  }
  // a carga no convés: ânforas amarradas junto à borda e sacos de trigo sobre a escotilha
  const carga = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = anfora(i);
    a.position.set(-3.2 + (i % 2) * 0.45, convesEm(9 + Math.floor(i / 2) * 0.5), 9 + Math.floor(i / 2) * 0.5);
    carga.add(a);
  }
  for (let i = 0; i < 6; i++) {
    const s = sacoDeTrigo(i);
    s.position.set(-0.8 + (i % 3) * 0.8, convesEm(4.5) + 0.25 + Math.floor(i / 3) * 0.4, 4.5 + (i % 2) * 0.6);
    s.rotation.y = i * 0.7;
    carga.add(s);
  }
  for (let i = 0; i < 2; i++) {
    const a = ancora();
    a.position.set(-1.5 + i * 3, convesEm(-6) + 0.02, -6);
    a.rotation.y = 0.3 - i * 0.6;
    carga.add(a);
  }
  g.add(carga);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
