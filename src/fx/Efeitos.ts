import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import type { ConfigGraficos } from '../core/Preferencias';

/**
 * "Do cinza às cores": a saturação do mundo acompanha a cor da região (0..1).
 * Também aplica um véu dourado (graças), um véu escuro (dano), o frio da Ciência e, com a "cor de cinema",
 * uma curva de contraste com sombras frias e luzes quentes, um leve desvio de cor nas bordas e grão de filme.
 */
const ShaderCor = {
  uniforms: {
    tDiffuse: { value: null },
    saturacao: { value: 0.15 },
    ouro: { value: 0 },
    dano: { value: 0 },
    ciencia: { value: 0 },
    cinema: { value: 0 },
    tempo: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float saturacao; uniform float ouro; uniform float dano; uniform float ciencia;
    uniform float cinema; uniform float tempo;
    varying vec2 vUv;
    float ruido(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      float d = distance(vUv, vec2(0.5));
      vec4 t = texture2D(tDiffuse, vUv);
      // cinema: um fio de aberração cromática só nas bordas da tela
      if (cinema > 0.0) {
        vec2 desvio = (vUv - 0.5) * 0.0025 * cinema * smoothstep(0.25, 0.75, d);
        t.r = texture2D(tDiffuse, vUv + desvio).r;
        t.b = texture2D(tDiffuse, vUv - desvio).b;
      }
      float l = dot(t.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 cinza = vec3(l) * vec3(0.98, 0.98, 1.03);
      vec3 c = mix(cinza, t.rgb, saturacao);
      if (cinema > 0.0) {
        // tons divididos: sombras puxam para o azul, luzes para o âmbar (luz de vitral)
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 frio = vec3(0.92, 0.98, 1.08), quente = vec3(1.06, 1.0, 0.9);
        c *= mix(vec3(1.0), mix(frio, quente, smoothstep(0.05, 0.6, lum)), cinema);
        // curva em S suave (o tone mapping vem depois, então é sobre a luz linear)
        vec3 s = c / (c + 0.18);
        c = mix(c, c * (0.82 + 0.36 * s), cinema);
      }
      c += vec3(1.0, 0.85, 0.45) * ouro * (0.35 + 0.65 * (1.0 - d * 1.4));
      c = mix(c, c * vec3(0.55, 0.2, 0.3), dano * smoothstep(0.2, 0.75, d));
      // dom da Ciência: a vista fica clara e fria, com um halo azul nas bordas
      c = mix(c, (c - 0.5) * 1.15 + 0.5, ciencia * 0.6) * mix(vec3(1.0), vec3(0.9, 1.0, 1.15), ciencia);
      c += vec3(0.45, 0.65, 1.0) * ciencia * smoothstep(0.32, 0.8, d) * 0.35;
      c *= 1.0 - smoothstep(0.45, 0.95, d) * (0.35 + 0.1 * cinema);
      // grão de filme, muito leve
      c += (ruido(vUv * 913.0 + fract(tempo) * 61.0) - 0.5) * 0.025 * cinema * (0.4 + l);
      gl_FragColor = vec4(c, t.a);
    }`,
};

export class Efeitos {
  composer!: EffectComposer;
  private passeCor!: ShaderPass;
  private oclusao: GTAOPass | null = null;
  private brilho: UnrealBloomPass | null = null;
  private serrilhado: FXAAPass | SMAAPass | null = null;
  private cfg: ConfigGraficos | null = null;
  private saturacao = 0.15;
  private tempo = 0;
  ouro = 0;
  dano = 0;
  /** 0..1: o dom da Ciência ligado. */
  ciencia = 0;

  constructor(private renderer: THREE.WebGLRenderer, private cena: THREE.Scene, private cam: THREE.PerspectiveCamera) {}

  /** Monta (ou remonta) a cadeia de passes para estes ajustes gráficos. */
  configurar(cfg: ConfigGraficos) {
    this.cfg = cfg;
    this.composer?.renderTarget1.dispose();
    this.composer?.renderTarget2.dispose();
    this.oclusao?.dispose();
    this.brilho?.dispose();
    this.serrilhado?.dispose();

    const pr = this.renderer.getPixelRatio();
    const w = innerWidth, h = innerHeight;
    // HalfFloat guarda a luz acima de 1 para o bloom; MSAA vem das amostras do próprio alvo de render
    const alvo = new THREE.WebGLRenderTarget(Math.floor(w * pr), Math.floor(h * pr), {
      type: THREE.HalfFloatType,
      samples: cfg.serrilhado === 'msaa' ? 4 : 0,
    });
    this.composer = new EffectComposer(this.renderer, alvo);
    this.composer.addPass(new RenderPass(this.cena, this.cam));

    this.oclusao = null;
    if (cfg.oclusao) {
      this.oclusao = new GTAOPass(this.cena, this.cam, w, h);
      // os blocos são de 1 m: um raio curto marca cantos e frestas sem sujar as paredes abertas
      this.oclusao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 8 });
      this.oclusao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
      this.oclusao.blendIntensity = 0.85;
      this.composer.addPass(this.oclusao);
    }

    this.brilho = null;
    if (cfg.brilho) {
      // só o que passa bem do branco brilha: chamas, graças, lamparina, halos, vitrais acesos
      this.brilho = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.55, 0.92);
      this.composer.addPass(this.brilho);
    }

    this.passeCor = new ShaderPass(ShaderCor);
    this.passeCor.uniforms.saturacao.value = this.saturacao;
    this.passeCor.uniforms.cinema.value = cfg.cinema ? 1 : 0;
    this.composer.addPass(this.passeCor);
    this.composer.addPass(new OutputPass());

    // FXAA e SMAA trabalham na imagem final (já em sRGB)
    this.serrilhado = cfg.serrilhado === 'fxaa' ? new FXAAPass() : cfg.serrilhado === 'smaa' ? new SMAAPass() : null;
    if (this.serrilhado) this.composer.addPass(this.serrilhado);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
  }

  tamanho(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  renderizar(dt: number, cor: number) {
    if (!this.cfg) return;
    this.ouro = Math.max(0, this.ouro - dt * 0.8);
    this.dano = Math.max(0, this.dano - dt * 1.8);
    this.tempo += dt;
    const u = this.passeCor.uniforms;
    this.saturacao += (0.12 + cor * 0.95 - this.saturacao) * Math.min(1, dt * 1.5);
    u.saturacao.value = this.saturacao;
    u.ouro.value = this.ouro;
    u.dano.value = this.dano;
    u.tempo.value = this.tempo;
    u.ciencia.value += (this.ciencia - u.ciencia.value) * Math.min(1, dt * 4);
    this.composer.render(dt);
  }
}
