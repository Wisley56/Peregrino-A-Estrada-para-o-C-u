import * as THREE from 'three';
import { Modelo } from '../voxel/Modelo';

const S = 0.032;
const BRANCO = 0xffffff, CREME = 0xf6f2e6, PENA = 0xe9e4d6, PONTA = 0xd8d2c2;

/**
 * Corpo da pomba (voxels finos): peito cheio, pescoço, cabeça redonda com olhos e bico,
 * e a cauda em leque. Olha para +z.
 */
function corpoPomba() {
  const m = new Modelo();
  // corpo: elipsoide, mais cheio no peito
  for (let x = -4; x <= 4; x++)
    for (let y = -4; y <= 4; y++)
      for (let z = -8; z <= 7; z++) {
        const rz = z > 0 ? 7 : 8.5;
        const e = (x * x) / 12 + ((y + (z > 2 ? -0.5 : 0)) ** 2) / 11 + (z * z) / (rz * rz);
        if (e <= 1) m.ponto(x, y, z, y < -1 ? CREME : BRANCO);
      }
  // pescoço e cabeça redonda, um pouco acima e à frente do peito
  for (let x = -3; x <= 3; x++)
    for (let y = 0; y <= 9; y++)
      for (let z = 3; z <= 12; z++) {
        const cab = x * x + (y - 6) ** 2 + (z - 9) ** 2 <= 9.6;
        const pescoco = x * x + ((z - 6.5) * 1.3) ** 2 <= 7 && y <= 6 && y >= 1;
        if (cab || pescoco) m.ponto(x, y, z, BRANCO);
      }
  // olhos escuros, com um brilho, dos dois lados da cabeça
  for (const lado of [-1, 1]) {
    m.ponto(lado * 3, 7, 10, 0x1a1410).ponto(lado * 3, 7, 9, 0x2a2018).ponto(lado * 3, 8, 10, 0xfff6dc);
  }
  // bico curto, cor de laranja, com a ponta mais escura e a cera clara na base
  m.caixa(-1, 5, 12, 2, 1, 2, 0xf0a640).ponto(-1, 5, 14, 0xc77a28).ponto(0, 5, 14, 0xc77a28);
  m.caixa(-1, 6, 12, 2, 1, 1, 0xf6e4c8);
  // cauda em leque
  for (let z = -9; z >= -15; z--) {
    const larg = 2 + Math.floor((-9 - z) * 0.7);
    for (let x = -larg; x <= larg; x++) m.ponto(x, 0, z, z < -13 ? PONTA : (x & 1 ? PENA : CREME));
  }
  // patinhas recolhidas
  m.ponto(-1, -5, 1, 0xd88a7a).ponto(1, -5, 1, 0xd88a7a);
  return m;
}

/** Asa com penas em camadas: cobertura branca perto do corpo e rêmiges mais longas na ponta. `lado` = +1 ou -1. */
function asa(lado: number) {
  const m = new Modelo();
  for (let i = 0; i < 16; i++) {
    const x = lado * i;
    // a asa afina para a ponta e as penas de voo se abrem para trás
    const frente = 4 - Math.floor(i * 0.18);
    const tras = -5 - Math.floor(i * 0.45);
    for (let z = tras; z <= frente; z++) {
      const cobertura = z > tras + 4;
      m.ponto(x, 0, z, cobertura ? (i < 6 ? BRANCO : CREME) : (z === tras ? PONTA : ((i + z) & 1 ? PENA : CREME)));
    }
    if (i < 9) m.ponto(x, 1, frente - 1, BRANCO); // a borda de ataque, mais grossa
  }
  return m;
}

/** O Espírito Santo: uma pomba de luz, com auréola, que acompanha o peregrino. */
export class Pomba {
  readonly raiz = new THREE.Group();
  private asaE: THREE.Mesh;
  private asaD: THREE.Mesh;
  private aureola: THREE.Mesh;
  private fase = 0;
  private alvo = new THREE.Vector3();
  readonly luz = new THREE.PointLight(0xffe7a8, 6, 9, 1.6);

  constructor() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xfff1c4, emissiveIntensity: 0.32 });
    const corpo = corpoPomba().malha(S, [0, 0, 0], mat);
    this.asaE = asa(1).malha(S, [0, 0, 0], mat);
    this.asaE.position.set(3 * S, 2 * S, 0);
    this.asaD = asa(-1).malha(S, [0, 0, 0], mat);
    this.asaD.position.set(-3 * S, 2 * S, 0);
    // auréola: um anel de luz dourada atrás da cabeça (o nimbo dos ícones)
    this.aureola = new THREE.Mesh(
      new THREE.TorusGeometry(5.2 * S, 0.55 * S, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.aureola.position.set(0, 7 * S, 7 * S);
    corpo.add(this.asaE, this.asaD, this.aureola);
    corpo.position.y = 0.12;
    this.raiz.add(corpo, this.luz);
    this.raiz.traverse((o) => (o.castShadow = false));
  }

  atualizar(dt: number, seguir: THREE.Vector3, rumo: number) {
    this.fase += dt;
    // fica um pouco atrás e acima do ombro esquerdo, contornando devagar
    const a = rumo + Math.PI * 0.75 + Math.sin(this.fase * 0.4) * 0.5;
    this.alvo.set(seguir.x + Math.sin(a) * 1.6, seguir.y + 2.3 + Math.sin(this.fase * 1.3) * 0.25, seguir.z + Math.cos(a) * 1.6);
    const antes = this.raiz.position.clone();
    this.raiz.position.lerp(this.alvo, Math.min(1, dt * 2.2));
    const mov = this.raiz.position.clone().sub(antes);
    if (mov.lengthSq() > 1e-6) this.raiz.rotation.y = Math.atan2(mov.x, mov.z);
    // batida de asa: desce rápido, sobe devagar
    const ciclo = (this.fase * 1.7) % 1;
    const bater = ciclo < 0.4 ? 0.8 - (ciclo / 0.4) * 1.5 : -0.7 + ((ciclo - 0.4) / 0.6) * 1.5;
    this.asaE.rotation.z = bater;
    this.asaD.rotation.z = -bater;
    this.aureola.rotation.z += dt * 0.6;
    (this.aureola.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(this.fase * 2.4) * 0.15;
  }
}
