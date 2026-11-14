import * as THREE from 'three';
import { aleatorio } from '../core/Ruido';
import { Modelo, variar } from '../voxel/Modelo';
import { ENFERMOS, corpoDoEnfermo, deitado } from '../entidades/Enfermos';
import { menino } from '../entidades/Dulce';
import { figurinoDoPovo, montarHumano } from '../voxel/Humano';
import { esteira } from './BahiaModelos';
import {
  D3, H3, altarzinho, bancoCapelinha, cadeira, crucifixo, entradaFachada, entradaVidro, hospitalAndar, hospitalPiso, hospitalTerreo,
  letreiro, mangueira, materialVidro, mesinhaDoQuarto, patio,
} from './HospitalModelos';

/**
 * O galinheiro do Convento de Santo Antônio, que cresce com a provação até virar o Hospital Irmã Dulce
 * (docs/regioes/01-ruas-da-bahia.md, seção 5, "O Hospital Irmã Dulce"; seção 6, passo 6):
 *
 * 1. **Galinheiro**: chão de terra, a tela, o telhado de zinco velho; dentro, os poleiros, o cocho e a palha suja.
 *    O peregrino limpa, estende as esteiras e traz os doentes do abrigo, um por um.
 * 2. **Enfermaria**: depois de uma passagem de tempo, paredes caiadas com barra azul, telha, catres de ferro,
 *    lamparinas e a bacia. Os seis e o menino, cada um no seu catre.
 * 3. **Hospital Irmã Dulce**: depois da vitória sobre o Coração de Pedra, o prédio de alvenaria (modelos em
 *    `HospitalModelos.ts`): a enfermaria grande com os seis, o menino e, na fileira da frente, os cinco do Largo
 *    do Cruzeiro; a capelinha a oeste, o quarto de Irmã Dulce (a cadeira) a leste e o pátio com a mangueira.
 *
 * Tudo vem das flags do save (`aplicar`), como o resto da Bahia. As posições são relativas ao centro do galinheiro
 * (a porta fica em +z).
 */

/** O que se tira do galinheiro antes de estender as esteiras: a flag é `bahia_galinheiro_<id>`. */
export const SUJEIRAS = [
  { id: 'poleiros', rotulo: 'F: desmontar os poleiros velhos', lugar: [0, -1.4] },
  { id: 'cocho', rotulo: 'F: arrastar o cocho para fora', lugar: [2.5, 1.0] },
  { id: 'palha1', rotulo: 'F: varrer a palha e o esterco', lugar: [-3.2, 0.9] },
  { id: 'palha2', rotulo: 'F: varrer a palha e o esterco', lugar: [-0.6, 1.7] },
] as const;

/** As esteiras do galinheiro, ao longo da parede do fundo: uma por enfermo, na ordem de ENFERMOS. */
const VAGA = (k: number): [number, number] => [-3.75 + k * 1.5, -2.2];
/** Os catres da enfermaria: os seis e, no fim, o do menino. */
const CATRE = (k: number): [number, number] => [-3.9 + k * 1.3, -2.15];
/** A altura do colchão do catre (onde o corpo deita). */
const COLCHAO = 0.625;

const v = (hex: number, k = 0.04) => (x: number, y: number, z: number) => variar(hex, x, y, z, k);
const MADEIRA = 0x6a5440, FERRO = 0x2a2a30, CAL = 0xf2eee4, BARRA = 0x4a7ab0, VERDE = 0x2e6a5a;
const W = 40, D = 28, H = 11; // o galinheiro e a enfermaria têm a mesma planta (voxel de 0,25 m)

/** O galinheiro: os esteios, a mureta de tijolo, a tela por cima e a porta aberta em +z. Sem o telhado. */
function galinheiro() {
  const m = new Modelo();
  const madeira = v(MADEIRA, 0.07), tela = 0x8a8a80;
  for (const [x, z] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1], [W >> 1, 0], [W >> 1, D - 1]]) m.caixa(x, 0, z, 1, H, 1, madeira);
  for (let x = 0; x < W; x++) for (const z of [0, D - 1]) {
    m.caixa(x, 0, z, 1, 3, 1, v(0xa8583a, 0.06)(x, 0, z));
    for (let y = 3; y < H - 1; y++) if ((x + y) % 2 === 0) m.ponto(x, y, z, tela);
  }
  for (let z = 0; z < D; z++) for (const x of [0, W - 1]) {
    m.caixa(x, 0, z, 1, 3, 1, v(0xa8583a, 0.06)(x, 0, z));
    for (let y = 3; y < H - 1; y++) if ((z + y) % 2 === 0) m.ponto(x, y, z, tela);
  }
  m.caixa(16, 0, D - 1, 6, 9, 1, null); // a porta, aberta
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** O telhado de uma água (zinco velho no galinheiro, telha na enfermaria): some com o peregrino dentro. */
function telhado(telha: boolean) {
  const m = new Modelo();
  const cor = telha
    ? (x: number, y: number, z: number) => variar([0xb0583a, 0x9e4c32, 0xc0663e][(x + z * 2) % 3], x, y, z, 0.03)
    : (x: number, _y: number, z: number) => ((x * 7 + z * 3) % 23 === 0 ? 0x6a4a32 : x & 1 ? 0x8a9094 : 0x707478);
  for (let z = -1; z <= D; z++) m.caixa(-1, H + Math.floor((D - z) / 6), z, W + 2, 1, 1, cor);
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** Os poleiros velhos, em degraus, com os pés (na mesma planta do galinheiro). */
function poleiros() {
  const m = new Modelo();
  for (let k = 0; k < 3; k++) {
    const y = 3 + k * 2, z = 4 + k * 3;
    m.caixa(4, y, z, W - 8, 1, 1, v(0x5a4632, 0.08));
    for (const x of [4, W >> 1, W - 5]) m.caixa(x, 0, z, 1, y, 1, v(MADEIRA, 0.06));
  }
  // titica nos poleiros
  for (let x = 5; x < W - 5; x += 3) m.ponto(x, 4, 4, 0xd8d4c8).ponto(x + 1, 6, 7, 0xd8d4c8);
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** O cocho de madeira, rachado, com resto de milho. */
function cocho() {
  const m = new Modelo();
  m.caixa(26, 0, 17, 8, 2, 3, v(0x7a6040, 0.08)).caixa(27, 1, 18, 6, 1, 1, v(0xd8b040, 0.1));
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** Um monte de palha velha e esterco, com penas (voxel de 0,125 m), centrado. */
function palha(semente: number) {
  const rnd = aleatorio(semente);
  const m = new Modelo();
  const R = 6;
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z * 1.3);
      if (d > R) continue;
      const h = Math.max(1, Math.round((R - d) * 0.5 + rnd() * 1.5));
      for (let y = 0; y < h; y++) {
        const r = rnd();
        m.ponto(x, y, z, r < 0.12 ? 0x4a3a22 : r < 0.18 ? 0x2a2418 : variar(r < 0.6 ? 0xb8a060 : 0x9a8048, x, y, z, 0.08));
      }
    }
  for (let k = 0; k < 4; k++) m.ponto(Math.round(rnd() * 8 - 4), 3, Math.round(rnd() * 8 - 4), 0xf0ece4); // penas
  return m.malha(0.125, [0, 0, 0]);
}

/** Uma esteira enrolada, deitada ao longo de x (voxel de 0,125 m). */
function esteiraEnrolada() {
  const m = new Modelo();
  m.caixa(-4, 0, -1, 8, 3, 3, (x, y, z) => ((x + y + z) % 2 ? 0xc8a860 : 0xb89850));
  m.caixa(-2, 0, -1, 1, 3, 3, 0x6a5236).caixa(2, 0, -1, 1, 3, 3, 0x6a5236); // as amarras
  return m.malha(0.125, [0, 0, 0]);
}

/**
 * A enfermaria: o galinheiro com as paredes fechadas e caiadas, a barra azul embaixo, janelas de folhas verdes,
 * a porta com batente e o telhado de telha. Na parede do fundo, o crucifixo.
 */
function enfermaria() {
  const m = new Modelo();
  const parede = (x: number, y: number, z: number) => (y < 3 ? variar(BARRA, x, y, z, 0.04) : variar(CAL, x, y, z, 0.015));
  m.caixa(0, 0, 0, W, H, 1, parede).caixa(0, 0, D - 1, W, H, 1, parede).caixa(0, 0, 0, 1, H, D, parede).caixa(W - 1, 0, 0, 1, H, D, parede);
  // a parede sob o telhado de uma água, nos dois lados
  for (let z = 0; z < D; z++) {
    const h = Math.floor((D - z) / 6);
    if (h > 0) m.caixa(0, H, z, 1, h, 1, parede).caixa(W - 1, H, z, 1, h, 1, parede);
  }
  // a porta (aberta) com o batente de madeira
  m.caixa(16, 0, D - 1, 6, 9, 1, null);
  m.caixa(15, 0, D - 1, 1, 10, 1, v(MADEIRA)).caixa(22, 0, D - 1, 1, 10, 1, v(MADEIRA)).caixa(15, 9, D - 1, 8, 1, 1, v(MADEIRA));
  m.caixa(22, 0, D, 1, 9, 5, v(VERDE, 0.03)); // a folha da porta, aberta para fora
  // as janelas: vão, peitoril e as folhas verdes abertas
  const janela = (x: number, z: number, eixo: 'x' | 'z', fora: number) => {
    if (eixo === 'z') {
      m.caixa(x, 4, z, 4, 4, 1, null).caixa(x, 3, z + fora, 4, 1, 1, v(CAL));
      m.caixa(x - 2, 4, z + fora, 2, 4, 1, v(VERDE, 0.03)).caixa(x + 4, 4, z + fora, 2, 4, 1, v(VERDE, 0.03));
    } else {
      m.caixa(x, 4, z, 1, 4, 4, null).caixa(x + fora, 3, z, 1, 1, 4, v(CAL));
      m.caixa(x + fora, 4, z - 2, 1, 4, 2, v(VERDE, 0.03)).caixa(x + fora, 4, z + 4, 1, 4, 2, v(VERDE, 0.03));
    }
  };
  janela(5, D - 1, 'z', 1);
  janela(30, D - 1, 'z', 1);
  for (const z of [7, 17]) {
    janela(0, z, 'x', -1);
    janela(W - 1, z, 'x', 1);
  }
  // o crucifixo na parede do fundo
  m.caixa(19, 5, 1, 1, 5, 1, v(0x3e2616)).caixa(18, 8, 1, 3, 1, 1, v(0x3e2616));
  return m.malha(0.25, [W / 2, 0, D / 2]);
}

/** O catre de ferro (voxel de 0,125 m): estrado, colchão, lençol e travesseiro na cabeceira (-z). */
function catre() {
  const m = new Modelo();
  for (const x of [-4, 3]) for (const z of [-8, 7]) m.caixa(x, 0, z, 1, z < 0 ? 7 : 5, 1, FERRO);
  m.caixa(-4, 3, -8, 8, 1, 1, FERRO).caixa(-4, 3, 7, 8, 1, 1, FERRO).caixa(-4, 3, -8, 1, 1, 16, FERRO).caixa(3, 3, -8, 1, 1, 16, FERRO);
  m.caixa(-4, 6, -8, 8, 1, 1, FERRO); // a cabeceira
  m.caixa(-3, 4, -7, 6, 1, 14, v(0xe8e4d8, 0.02)); // o colchão com o lençol
  m.caixa(-2, 5, -7, 4, 1, 2, v(0xf8f6f0, 0.01)); // o travesseiro
  return m.malha(0.125, [0, 0, 0]);
}

/** A mesinha com a bacia esmaltada e a jarra (voxel de 0,125 m). */
function mesaComBacia() {
  const m = new Modelo();
  for (const x of [-3, 2]) for (const z of [-2, 1]) m.caixa(x, 0, z, 1, 6, 1, v(MADEIRA));
  m.caixa(-3, 6, -2, 6, 1, 4, v(MADEIRA, 0.06));
  m.caixa(-2, 7, -1, 3, 1, 3, 0xf0f0ec).caixa(-2, 8, -1, 3, 1, 1, 0x2a4a8a).caixa(-2, 8, 1, 3, 1, 1, 0x2a4a8a).ponto(-2, 8, 0, 0x2a4a8a).ponto(0, 8, 0, 0x2a4a8a);
  m.caixa(1, 7, -1, 1, 3, 1, 0xf0f0ec).ponto(1, 10, -1, 0x2a4a8a);
  return m.malha(0.125, [0, 0, 0]);
}

/** Uma lamparina de parede (voxel de 0,125 m), com a chama acesa. A frente (+z) fica longe da parede. */
function lamparina() {
  const m = new Modelo();
  m.caixa(0, 0, 0, 1, 1, 2, FERRO).caixa(0, 1, 1, 1, 2, 1, 0xd8c8a0).ponto(0, 3, 1, 0xffc040).ponto(0, 4, 1, FERRO);
  return m.malha(0.125, [0.5, 0, 0]);
}

/** Os catres da fileira da frente do hospital (a cabeceira junto à fachada): os cinco do Largo do Cruzeiro. */
const CATRE_FRENTE = [-3.9, -2.6, 1.6, 2.9, 4.2];
/** Quantos vieram do Largo (os mesmos figurinos da luta, em `LargoDoCruzeiro`). */
export const DO_LARGO = 5;

/** Quem está num catre e pode conversar: o nó do roteiro, o nome para o rótulo e desde que estágio está lá. */
export interface Leito {
  pos: THREE.Vector3;
  nome: string;
  no: string;
  estagio: 2 | 3;
}

interface Vaga {
  pos: THREE.Vector3;
  /** A esteira ainda enrolada, a esteira estendida (vazia) e a esteira com o enfermo deitado. */
  enrolada: THREE.Object3D;
  estendida: THREE.Object3D;
  ocupada: THREE.Object3D;
}

export class Hospital {
  readonly grupo = new THREE.Group();
  readonly sujeiras: { id: string; rotulo: string; obj: THREE.Object3D; pos: THREE.Vector3 }[] = [];
  readonly vagas = new Map<string, Vaga>();
  /** Um ponto dentro, junto à porta (para onde o peregrino vai na passagem de tempo). */
  readonly entrada: THREE.Vector3;
  /** Os catres com gente (enfermaria e hospital), para conversar. */
  readonly leitos: Leito[] = [];
  /** No hospital: junto à cadeira de Irmã Dulce e diante do altar da capelinha. */
  readonly cadeira: THREE.Vector3;
  readonly altar: THREE.Vector3;
  /** 1 galinheiro, 2 enfermaria, 3 hospital. */
  estagio: 1 | 2 | 3 = 1;
  private galinheiro = new THREE.Group();
  private enfermaria = new THREE.Group();
  private predio = new THREE.Group();
  /** O que some com o peregrino dentro do hospital: o andar de cima, o letreiro, a marquise. */
  private alto = new THREE.Group();
  private telhados: THREE.Object3D[] = [];

  constructor(readonly centro: THREE.Vector3) {
    this.grupo.position.copy(centro);
    const ponto = (x: number, z: number) => new THREE.Vector3(centro.x + x, centro.y, centro.z + z);
    this.entrada = ponto(0, 1.6);
    const pos = (o: THREE.Object3D, x: number, z: number, y = 0, rot = 0) => {
      o.position.set(x, y, z);
      o.rotation.y = rot;
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) c.castShadow = c.receiveShadow = true;
      });
      return o;
    };

    // 1. o galinheiro e a sujeira
    const tz = telhado(false), tt = telhado(true);
    this.telhados.push(tz, tt);
    this.galinheiro.add(pos(galinheiro(), 0, 0), pos(tz, 0, 0));
    this.grupo.add(this.galinheiro);
    const objetos: Record<string, THREE.Object3D> = { poleiros: poleiros(), cocho: cocho(), palha1: pos(palha(1), -3.2, 0.9), palha2: pos(palha(2), -0.6, 1.7) };
    for (const s of SUJEIRAS) {
      const obj = objetos[s.id];
      this.grupo.add(obj);
      this.sujeiras.push({ id: s.id, rotulo: s.rotulo, obj, pos: ponto(s.lugar[0], s.lugar[1]) });
    }
    // as esteiras: enroladas, estendidas e com cada um deitado
    ENFERMOS.forEach((def, k) => {
      const [x, z] = VAGA(k);
      const enrolada = pos(esteiraEnrolada(), x, z + 0.6);
      const estendida = pos(esteira(), x, z);
      const ocupada = pos(new THREE.Group().add(esteira(), corpoDoEnfermo(def, 'deitado')), x, z);
      this.grupo.add(enrolada, estendida, ocupada);
      this.vagas.set(def.id, { pos: ponto(x, z + 1.4), enrolada, estendida, ocupada });
    });

    // 2. a enfermaria, com os catres ocupados (os seis e o menino), a mesinha e as lamparinas
    this.enfermaria.add(pos(enfermaria(), 0, 0), pos(tt, 0, 0));
    ENFERMOS.forEach((def, k) => {
      const [x, z] = CATRE(k);
      this.enfermaria.add(pos(new THREE.Group().add(catre(), corpoDoEnfermo(def, 'deitado', COLCHAO)), x, z));
    });
    const [mx, mz] = CATRE(6);
    this.enfermaria.add(pos(new THREE.Group().add(catre(), menino('deitado', COLCHAO)), mx, mz));
    this.enfermaria.add(pos(mesaComBacia(), 4.3, 0.1, 0, -Math.PI / 2));
    for (const z of [-1, 1.6]) {
      this.enfermaria.add(pos(lamparina(), -4.75, z, 1.6, Math.PI / 2));
      this.enfermaria.add(pos(lamparina(), 4.75, z, 1.6, -Math.PI / 2));
    }
    // a luz quente das lamparinas, para o interior fechado não ficar escuro
    const luz = new THREE.PointLight(0xffc880, 6, 9, 1.6);
    luz.position.set(0, 2.2, -0.5);
    this.enfermaria.add(luz);
    this.grupo.add(this.enfermaria);
    // quem está nos catres (os mesmos lugares na enfermaria e no hospital)
    ENFERMOS.forEach((def, k) => {
      const [x, z] = CATRE(k);
      this.leitos.push({ pos: ponto(x, z + 1.05), nome: def.nome, no: `bahia_leito_${def.id}`, estagio: 2 });
    });
    this.leitos.push({ pos: ponto(mx, mz + 1.05), nome: 'o menino', no: 'bahia_leito_menino', estagio: 2 });

    // 3. o Hospital Irmã Dulce
    this.cadeira = ponto(7.2, -1.6);
    this.altar = ponto(-7.2, 0.1);
    const frente = (D3 / 2) * 0.25; // a face da fachada
    const piso = hospitalPiso();
    piso.position.y = -0.24;
    this.predio.add(pos(hospitalTerreo(), 0, 0), piso);
    // o que fica no alto (some com o peregrino dentro)
    const letras = letreiro();
    letras.position.set(0, H3 * 0.25 + 0.55, frente);
    this.alto.add(pos(hospitalAndar(), 0, 0), letras);
    // a marquise fica abaixo do topo das paredes: não atrapalha a câmera, então fica sempre à vista
    this.predio.add(this.alto, pos(entradaFachada(), 0, frente));
    const vidro = entradaVidro();
    vidro.material = materialVidro;
    vidro.position.set(0, 0, frente);
    this.predio.add(vidro);
    // a enfermaria grande: os seis e o menino no fundo, os cinco do Largo na frente
    ENFERMOS.forEach((def, k) => {
      const [x, z] = CATRE(k);
      this.predio.add(pos(new THREE.Group().add(catre(), corpoDoEnfermo(def, 'deitado', COLCHAO)), x, z));
    });
    this.predio.add(pos(new THREE.Group().add(catre(), menino('deitado', COLCHAO)), mx, mz));
    CATRE_FRENTE.forEach((x, i) => {
      const fig = figurinoDoPovo(700 + i * 13, 'pobre');
      this.predio.add(pos(new THREE.Group().add(catre(), deitado(montarHumano(fig), fig, COLCHAO)), x, 1.95, 0, Math.PI));
      this.leitos.push({ pos: ponto(x, 1.95 - 1.05), nome: 'quem veio do Largo', no: 'bahia_leito_largo', estagio: 3 });
    });
    for (const z of [-1.7, 2.1]) {
      this.predio.add(pos(lamparina(), -4.7, z, 1.7, Math.PI / 2));
      this.predio.add(pos(lamparina(), 4.95, z, 1.7, -Math.PI / 2));
    }
    // a capelinha (a oeste): o altar na parede, o crucifixo, os dois bancos com o corredor no meio
    this.predio.add(pos(altarzinho(), -8.25, 0.1));
    const cruz = pos(crucifixo(), -8.2, 0.1, 1.45, Math.PI / 2);
    this.predio.add(cruz);
    for (const x of [-6.7, -5.75]) for (const z of [-1.75, 1.95]) this.predio.add(pos(bancoCapelinha(), x, z));
    // o quarto de Irmã Dulce (a leste): a cadeira no canto, a mesinha e o crucifixo
    this.predio.add(pos(cadeira(), 7.6, -2.6, 0, -0.6), pos(mesinhaDoQuarto(), 7.85, -1.1, 0, -Math.PI / 2));
    this.predio.add(pos(crucifixo(), 8.2, -1.1, 1.5, -Math.PI / 2));
    // o pátio com a mangueira, a leste do prédio
    const pt = pos(patio(), 8.5, -D3 / 8);
    pt.position.y = 0.01;
    this.predio.add(pt, pos(mangueira(), 11, 0.2));
    // luz: a enfermaria, a capelinha (vela) e o quarto (lamparina)
    for (const [x, cor, forca] of [[0, 0xfff0d8, 7], [-7, 0xffc880, 3], [7, 0xffc880, 3]] as const) {
      const l = new THREE.PointLight(cor, forca, 8, 1.6);
      l.position.set(x, 2.3, 0);
      this.predio.add(l);
    }
    vidro.castShadow = false;
    this.grupo.add(this.predio);
  }

  /** O peregrino está na capelinha do hospital? */
  naCapelinha(p: THREE.Vector3) {
    if (this.estagio !== 3) return false;
    const x = p.x - this.centro.x, z = p.z - this.centro.z;
    return x > -8.4 && x < -5 && Math.abs(z) < 3.4;
  }

  /** O estágio, a sujeira, as esteiras e quem está deitado, a partir das flags. */
  aplicar(flags: Set<string>) {
    const enfermaria = flags.has('bahia_enfermaria');
    const hospital = flags.has('bahia_coracao_vencido');
    this.estagio = hospital ? 3 : enfermaria ? 2 : 1;
    this.galinheiro.visible = !enfermaria && !hospital;
    this.enfermaria.visible = this.estagio === 2;
    this.predio.visible = hospital;
    for (const s of this.sujeiras) s.obj.visible = this.estagio === 1 && !flags.has(`bahia_galinheiro_${s.id}`);
    const limpo = flags.has('bahia_galinheiro_limpo');
    for (const [id, v] of this.vagas) {
      const estendida = flags.has(`bahia_esteira_${id}`), deitado = flags.has(`bahia_leito_${id}`);
      v.enrolada.visible = this.estagio === 1 && limpo && !estendida;
      v.estendida.visible = this.estagio === 1 && estendida && !deitado;
      v.ocupada.visible = this.estagio === 1 && deitado;
    }
  }

  /** O peregrino está dentro (entre as paredes)? Então o telhado some e a câmera passa por cima das paredes. */
  dentro(p: THREE.Vector3) {
    const x = p.x - this.centro.x, z = p.z - this.centro.z;
    const meia = this.estagio === 3 ? 8.3 : 4.8;
    return Math.abs(x) < meia && z > -3.3 && z < 3.4;
  }

  mostrarTelhado(v: boolean) {
    for (const t of this.telhados) t.visible = v;
    this.alto.visible = v;
  }

  /** Chão visto pela câmera com o peregrino dentro: as paredes (e o que fica fora delas) contam como chão alto. */
  alturaCamera(x: number, z: number, base: (x: number, z: number) => number) {
    const lx = x - this.centro.x, lz = z - this.centro.z;
    const meia = this.estagio === 3 ? 8.2 : 4.65;
    if (Math.abs(lx) > meia || lz < -3.15 || lz > 3.15) return this.centro.y + 3.4;
    return base(x, z);
  }

  /** Quantas sujeiras já saíram. */
  limpas(flags: Set<string>) {
    return SUJEIRAS.filter((s) => flags.has(`bahia_galinheiro_${s.id}`)).length;
  }
}
