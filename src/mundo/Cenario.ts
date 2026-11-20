import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';

/** Cruzeiro de beira de estrada (0,2 m por voxel). */
export function construirCruzeiro() {
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0x9d968a, x, y, z, 0.06);
  m.caixa(0, 0, 0, 8, 2, 8, pedra).caixa(1, 2, 1, 6, 2, 6, pedra).caixa(2, 4, 2, 4, 2, 4, pedra);
  const madeira = (x: number, y: number, z: number) => variar(0x6e4a2a, x, y, z, 0.05);
  m.caixa(3, 6, 3, 2, 16, 2, madeira);
  m.caixa(0, 17, 3, 8, 2, 2, madeira);
  // flores no pé da cruz
  m.ponto(1, 4, 6, 0xe84a6a).ponto(6, 4, 1, 0xf2d24a).ponto(6, 4, 6, 0xffffff).ponto(1, 4, 1, 0x6a8ae8);
  return m.malha(0.2, [4, 0, 4]);
}

/** Coluna de luz da graça. */
export function colunaDeLuz() {
  const g = new THREE.CylinderGeometry(0.9, 1.3, 14, 20, 1, true);
  g.translate(0, 7, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe9a6,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(g, mat);
}

/** Céu em degradê (esfera invertida). */
export function construirCeu() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topo: { value: new THREE.Color(0x4a86d0) },
      horizonte: { value: new THREE.Color(0xf3d9b0) },
      sol: { value: new THREE.Vector3(0.4, 0.5, -0.75).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // sempre no fundo
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 topo; uniform vec3 horizonte; uniform vec3 sol;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizonte, topo, smoothstep(-0.05, 0.55, h));
        float s = max(dot(normalize(vDir), sol), 0.0);
        c += vec3(1.0, 0.92, 0.7) * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.25);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

/** Entrada da cripta: arco de pedra com escada descendo (0,25 m por voxel). Frente para +z. */
export function construirEntradaCripta() {
  const m = new Modelo();
  const pedra = (x: number, y: number, z: number) => variar(0x8d877c, x, y, z, 0.06);
  m.caixa(0, 0, 0, 14, 1, 12, pedra); // laje
  m.caixa(0, 1, 0, 3, 11, 10, pedra).caixa(11, 1, 0, 3, 11, 10, pedra); // laterais
  m.caixa(0, 1, 0, 14, 11, 2, pedra); // fundo
  m.caixa(0, 12, 0, 14, 2, 11, pedra); // lintel
  m.caixa(1, 14, 2, 12, 1, 8, pedra);
  // cruz sobre o arco
  m.caixa(6, 15, 7, 2, 6, 1, 0xc9a24a).caixa(4, 18, 7, 6, 1, 1, 0xc9a24a);
  // degraus descendo para a escuridão
  for (let k = 0; k < 6; k++) m.caixa(3, 0, 10 - k * 1.5 | 0, 8, 1, 2, k < 2 ? 0x6d685f : k < 4 ? 0x3a3732 : 0x1a1816);
  m.caixa(3, 1, 2, 8, 11, 6, 0x0c0b0a); // vão escuro
  return m.malha(0.25, [7, 1, 6]);
}

/** O espaço que o véu de trevas ocupa, em volta do ponto dele (m): a garganta do desfiladeiro e as bordas dela. */
export const VOLUME_VEU = { leste: 0.6, oeste: 5.4, meio: 10, teto: 15 };
/** O brilho violeta do véu parado (pulsa em volta dele). */
export const EMISSIVO_VEU = 0x1a0d33;

/**
 * Véu de trevas: um banco de névoa negra que só a Lamparina dissolve. Não é uma cortina (por cima e pelos lados
 * de uma cortina se passa escalando a encosta): enche a garganta do desfiladeiro e transborda pelas bordas, assentado
 * no chão (`chao`, em m acima do pé do véu) e subindo bem acima delas, com o alto e as pontas esgarçados.
 * O ponto do véu é a face leste, a que o peregrino vê chegando do Vale.
 *
 * O material é opaco: transparente, o fundo vaza pela névoa (o céu aparece através dela). Só fica transparente ao se
 * desfazer (`desfazendoVeu`, em `Mundo`).
 */
export function construirVeu(chao: (dx: number, dz: number) => number) {
  const m = new Modelo();
  const tons = [0x150f20, 0x21173a, 0x0d0a14, 0x2b1d4a];
  const V = VOLUME_VEU, s = 0.5;
  for (let ix = Math.round(-V.oeste / s); ix < Math.round(V.leste / s); ix++)
    for (let iz = Math.round(-V.meio / s); iz < Math.round(V.meio / s); iz++) {
      const dx = (ix + 0.5) * s, dz = (iz + 0.5) * s;
      const g = chao(dx, dz);
      // nas pontas e no fundo, a névoa rareia e baixa
      const borda = Math.min(1, (V.meio - Math.abs(dz)) / 2.5, (dx + V.oeste) / 2);
      const n = Math.sin(iz * 0.9 + ix * 1.7) + Math.cos(iz * 0.37 - ix * 0.8);
      const teto = Math.max(g + 3, V.teto * (0.6 + 0.4 * borda)) + n * 0.6;
      for (let iy = Math.floor((g - 0.5) / s); iy * s < teto; iy++) {
        const k = Math.sin(iz * 1.3 + iy * 0.7) + Math.cos(iy * 1.1 - iz * 0.4 + ix);
        if (iy * s > teto - 1.5 && k < 0.2) continue; // topo esgarçado
        if (borda < 1 && (k + 2) / 4 > borda + 0.25) continue; // pontas ralas
        m.ponto(ix, iy, iz, tons[Math.abs(Math.round(k * 2)) % tons.length]);
      }
    }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: EMISSIVO_VEU });
  const malha = m.malha(s, [0, 0, 0], mat);
  malha.castShadow = false;
  return malha;
}

/** Placa de madeira. */
export function construirPlaca() {
  const madeira = (x: number, y: number, z: number) => variar(0x7a5530, x, y, z, 0.05);
  return new Modelo()
    .caixa(3, 0, 0, 1, 8, 1, madeira)
    .caixa(0, 6, 0, 8, 4, 1, madeira)
    .caixa(1, 7, -1, 6, 1, 1, 0x3a2a1a).caixa(1, 9, -1, 4, 1, 1, 0x3a2a1a)
    .malha(0.15, [4, 0, 0.5]);
}

/** Lamparina da Fé (arte por código): armação de ferro, vidro dourado e alça. */
export function lamparinaModelo(escala: number) {
  const vidro = 0xffe08a;
  const m = new Modelo()
    .caixa(0, 0, 0, 5, 1, 5, 0x3a383e)
    .caixa(0, 1, 0, 1, 5, 1, 0x3a383e).caixa(4, 1, 0, 1, 5, 1, 0x3a383e)
    .caixa(0, 1, 4, 1, 5, 1, 0x3a383e).caixa(4, 1, 4, 1, 5, 1, 0x3a383e)
    .caixa(1, 1, 1, 3, 5, 3, vidro)
    .caixa(0, 6, 0, 5, 1, 5, 0x3a383e)
    .caixa(1, 7, 1, 3, 1, 3, 0x3a383e)
    .caixa(2, 8, 2, 1, 2, 1, 0x3a383e);
  const g = new THREE.Group();
  const corpo = m.malha(escala, [2.5, 0, 2.5], new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffc860, emissiveIntensity: 0.6 }));
  corpo.castShadow = false;
  g.add(corpo);
  return g;
}
