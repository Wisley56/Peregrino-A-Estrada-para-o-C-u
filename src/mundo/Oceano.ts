import * as THREE from 'three';

/**
 * As ondas: quatro trens de senoides em direções diferentes (comprimento de onda, direção, fase por segundo, peso).
 * O mesmo cálculo roda no shader (a superfície que se vê) e em `Oceano.altura` (onde quem nada boia), para o
 * peregrino subir e descer com a onda que está debaixo dele.
 */
const ONDAS: [number, number, number, number][] = [
  // comprimento (m), direção (rad), velocidade (rad/s), peso
  [34, 0.35, 0.9, 1.0],
  [21, 1.9, 1.15, 0.55],
  [13, -0.8, 1.6, 0.32],
  [7.5, 2.7, 2.3, 0.16],
];
const PESO_TOTAL = ONDAS.reduce((s, o) => s + o[3], 0);

/** Lado do plano que segue o jogador (m) e o espaçamento da grade (m). Além disso, a névoa esconde o mar. */
const LADO = 640;
const PASSO = 4;

/**
 * O mar aberto: uma grade que acompanha o jogador (presa a múltiplos do passo, para os vértices não "nadarem"),
 * com as ondas deslocadas no vertex shader e sombreamento facetado, no estilo dos voxels. As cristas clareiam em
 * espuma. `intensidade` vai de 0 (espelho) a 1 (a tempestade): a fase da tempestade só a sobe.
 */
export class Oceano {
  readonly malha: THREE.Mesh;
  /** Altura média da água (m do mundo). */
  readonly nivel: number;
  /** Altura das ondas, em metros, da crista ao nível médio (com intensidade 1). */
  amplitude = 1.6;
  /** 0 calmaria … 1 tempestade. */
  intensidade = 0.18;
  /** O mar correndo (m/s): o navio fica parado e a água passa por ele, como se ele navegasse. */
  readonly deriva = new THREE.Vector2();
  private t = 0;
  private readonly desloc = new THREE.Vector2();
  private readonly uniforms = {
    uTempo: { value: 0 },
    uAmplitude: { value: 0 },
    uDesloc: { value: new THREE.Vector2() },
    uEspuma: { value: new THREE.Color(0xeef4f2) },
  };

  constructor(nivel: number, cor = 0x1f6f8a) {
    this.nivel = nivel;
    const g = new THREE.PlaneGeometry(LADO, LADO, LADO / PASSO, LADO / PASSO);
    g.rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({ color: cor, emissive: 0x03202a, transparent: true, opacity: 0.88, flatShading: true });
    const u = this.uniforms;
    material.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u);
      const ondas = ONDAS.map(([l, d, w, p]) => {
        const k = ((Math.PI * 2) / l).toFixed(5);
        const dx = Math.sin(d).toFixed(5), dz = Math.cos(d).toFixed(5);
        return `${(p / PESO_TOTAL).toFixed(5)} * sin(dot(p, vec2(${dx}, ${dz})) * ${k} - uTempo * ${w.toFixed(5)})`;
      });
      s.vertexShader = s.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTempo;
          uniform float uAmplitude;
          uniform vec2 uDesloc;
          varying float vOnda;
          float onda(vec2 p) { return ${ondas.join(' + ')}; }`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec2 pMundo = (modelMatrix * vec4(transformed, 1.0)).xz;
          vOnda = onda(pMundo + uDesloc);
          transformed.y += vOnda * uAmplitude;`,
        );
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uEspuma;
          uniform float uAmplitude;
          varying float vOnda;`)
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // espuma nas cristas: mais branca quanto mais alto o mar
          float crista = smoothstep(0.42, 0.75, vOnda) * smoothstep(0.15, 1.2, uAmplitude);
          diffuseColor.rgb = mix(diffuseColor.rgb, uEspuma, crista * 0.8);`,
        );
    };
    this.malha = new THREE.Mesh(g, material);
    this.malha.position.y = nivel;
    this.malha.receiveShadow = true;
    // a grade muda de lugar com o jogador: a esfera envolvente da origem não vale
    this.malha.frustumCulled = false;
  }

  /** A altura da superfície em (x, z) agora, com as ondas. */
  altura(x: number, z: number) {
    x += this.desloc.x;
    z += this.desloc.y;
    let s = 0;
    for (const [l, d, w, p] of ONDAS) s += (p / PESO_TOTAL) * Math.sin((x * Math.sin(d) + z * Math.cos(d)) * ((Math.PI * 2) / l) - this.t * w);
    return this.nivel + s * this.amplitudeAtual;
  }

  get amplitudeAtual() {
    return this.amplitude * this.intensidade;
  }

  /** Avança as ondas e traz a grade para perto de quem olha. */
  atualizar(dt: number, centro: THREE.Vector3) {
    this.t += dt;
    this.desloc.addScaledVector(this.deriva, dt);
    this.uniforms.uDesloc.value.copy(this.desloc);
    this.uniforms.uTempo.value = this.t;
    this.uniforms.uAmplitude.value = this.amplitudeAtual;
    this.malha.position.x = Math.round(centro.x / PASSO) * PASSO;
    this.malha.position.z = Math.round(centro.z / PASSO) * PASSO;
  }
}
