import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';

/** Capela no alto do monte (arte por código, 0,5 m por voxel). Porta voltada para +z. */
export function construirCapela() {
  const m = new Modelo();
  const W = 14, D = 20, H = 10;
  const reboco = (x: number, y: number, z: number) => variar(0xe8dfcc, x, y, z, 0.03);
  const pedra = (x: number, y: number, z: number) => variar(0x9b9284, x, y, z, 0.06);
  const telha = (x: number, y: number, z: number) => ((x + z) % 3 === 0 ? 0x9a4030 : variar(0xa84a32, x, y, z, 0.04));
  // paredes
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const parede = x === 0 || x === W - 1 || z === 0 || z === D - 1;
        if (!parede) continue;
        const porta = z === D - 1 && x >= 5 && x < 9 && y < 6;
        const arcoPorta = z === D - 1 && x >= 6 && x < 8 && y === 6;
        const janela = (x === 0 || x === W - 1) && (z === 5 || z === 10 || z === 15) && y >= 4 && y <= 6;
        if (porta || arcoPorta) continue;
        if (janela) {
          const vitral = [0x3a6fd8, 0xd83a4a, 0xe8c45a, 0x3ab86a][(y + z) % 4];
          m.ponto(x, y, z, vitral);
          continue;
        }
        m.ponto(x, y, z, y < 2 ? pedra(x, y, z) : reboco(x, y, z));
      }
  // rosácea sobre a porta
  [[6, 8], [7, 8], [6, 9], [7, 9]].forEach(([x, y], i) => m.ponto(x, y, D - 1, [0xd83a4a, 0x3a6fd8, 0xe8c45a, 0x9a4ad8][i]));
  // empena e telhado (duas águas ao longo de z)
  for (let k = 0; k < 8; k++) {
    const y = H + k;
    for (let z = -1; z <= D; z++) {
      for (const x of [k - 1, W - k]) m.ponto(x, y, z, telha(x, y, z));
      if (k > 0) for (const x of [k, W - k - 1]) if (z === -1 || z === D) m.ponto(x, y, z, telha(x, y, z));
    }
    for (let x = k; x < W - k; x++) {
      m.ponto(x, y, 0, reboco(x, y, 0));
      m.ponto(x, y, D - 1, reboco(x, y, D - 1));
    }
  }
  for (let z = -1; z <= D; z++) for (let x = 6; x < 8; x++) m.ponto(x, H + 7, z, 0x8a3a2a);
  // campanário e cruz
  m.caixa(5, H + 6, D - 4, 4, 5, 3, reboco);
  m.caixa(5, H + 6, D - 4, 4, 2, 3, null);
  m.caixa(6, H + 6, D - 3, 2, 2, 1, 0xc9a24a); // sino
  m.caixa(5, H + 6, D - 4, 1, 2, 1, reboco).caixa(8, H + 6, D - 4, 1, 2, 1, reboco);
  m.caixa(5, H + 6, D - 2, 1, 2, 1, reboco).caixa(8, H + 6, D - 2, 1, 2, 1, reboco);
  m.caixa(5, H + 11, D - 4, 4, 1, 3, telha);
  m.caixa(7, H + 12, D - 3, 1, 5, 1, 0xe8c45a);
  m.caixa(6, H + 15, D - 3, 3, 1, 1, 0xe8c45a);
  // piso e altar
  m.caixa(1, 0, 1, W - 2, 1, D - 2, (x, _y, z) => ((x + z) % 2 ? 0xb8b0a0 : 0xa8a090));
  m.caixa(5, 1, 2, 4, 2, 2, 0xeae4d6);
  m.caixa(5, 3, 2, 4, 1, 2, 0xd8c79a);
  m.ponto(5, 4, 2, 0xfff1b0).ponto(8, 4, 2, 0xfff1b0);
  m.caixa(6, 4, 1, 2, 5, 1, 0x7a5a36).caixa(5, 7, 1, 4, 1, 1, 0x7a5a36);
  // degraus da entrada
  m.caixa(4, 0, D, 6, 1, 2, pedra);
  return m.malha(0.5, [7, 1, 10]);
}

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

/** Véu de trevas: muralha de névoa negra que só a Lamparina dissolve. */
export function construirVeu(largura: number, altura: number) {
  const m = new Modelo();
  const tons = [0x150f20, 0x21173a, 0x0d0a14, 0x2b1d4a];
  for (let z = 0; z < largura * 2; z++)
    for (let y = 0; y < altura * 2; y++)
      for (let x = 0; x < 2; x++) {
        const n = Math.sin(z * 1.3 + y * 0.7) + Math.cos(y * 1.1 - z * 0.4 + x);
        if (y > altura * 2 - 3 && n < 0.2) continue; // topo esgarçado
        m.ponto(x, y, z, tons[Math.abs(Math.round(n * 2)) % tons.length]);
      }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.88, emissive: 0x1a0d33, depthWrite: false });
  return m.malha(0.5, [1, 0, largura], mat);
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
