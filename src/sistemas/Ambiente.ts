import * as THREE from 'three';
import { ARFAGEM_LIVRE } from '../core/Camera';
import { AMBIENTES, REGIOES, type Ambiente as AmbienteDaRegiao, type NomeAmbiente } from '../historia/Regioes';
import { construirCeu } from '../mundo/Cenario';
import type { Contexto } from '../jogo/Contexto';
import { Parte } from './Sistema';

/** A luz, a névoa e o céu de um lugar (para passar de um ambiente a outro aos poucos). */
interface Ambiente {
  nevoa: THREE.Color;
  perto: number;
  longe: number;
  hemi: THREE.Color;
  chao: THREE.Color;
  hemiI: number;
  sol: THREE.Color;
  solI: number;
  topo: THREE.Color;
  horizonte: THREE.Color;
}

/** A luz, a névoa e o céu de cada área, a passagem suave de um ambiente a outro e a cor da região na tela. */
export class SistemaAmbiente extends Parte {
  sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
  hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6b5a3a, 1.5);
  ceu = construirCeu();
  semSaltoDeCor = false;
  mistura: { de: Ambiente; para: Ambiente; t: number } | null = null;
  corSuave = -1;
  areaDaCor: unknown = null;

  constructor(ctx: Contexto) {
    super(ctx);
    this.ctx.cena.fog = new THREE.Fog(0xe8dcc4, 45, 150);
    this.ctx.cena.add(this.ceu, this.hemi);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const sc = this.sol.shadow.camera;
    sc.left = sc.bottom = -32;
    sc.right = sc.top = 32;
    sc.near = 1;
    sc.far = 140;
    this.sol.shadow.bias = -0.0006;
    this.sol.shadow.normalBias = 0.04;
    this.ctx.cena.add(this.sol, this.sol.target);
  }

  fotoDoAmbiente(): Ambiente {
    const fog = this.ctx.cena.fog as THREE.Fog, ceu = (this.ceu.material as THREE.ShaderMaterial).uniforms;
    return {
      nevoa: fog.color.clone(), perto: fog.near, longe: fog.far,
      hemi: this.hemi.color.clone(), chao: this.hemi.groundColor.clone(), hemiI: this.hemi.intensity,
      sol: this.sol.color.clone(), solI: this.sol.intensity,
      topo: (ceu.topo.value as THREE.Color).clone(), horizonte: (ceu.horizonte.value as THREE.Color).clone(),
    };
  }

  porAmbiente(a: Ambiente, b: Ambiente, t: number) {
    const fog = this.ctx.cena.fog as THREE.Fog, ceu = (this.ceu.material as THREE.ShaderMaterial).uniforms;
    const n = (x: number, y: number) => x + (y - x) * t;
    fog.color.lerpColors(a.nevoa, b.nevoa, t);
    fog.near = n(a.perto, b.perto);
    fog.far = n(a.longe, b.longe);
    this.hemi.color.lerpColors(a.hemi, b.hemi, t);
    this.hemi.groundColor.lerpColors(a.chao, b.chao, t);
    this.hemi.intensity = n(a.hemiI, b.hemiI);
    this.sol.color.lerpColors(a.sol, b.sol, t);
    this.sol.intensity = n(a.solI, b.solI);
    (ceu.topo.value as THREE.Color).lerpColors(a.topo, b.topo, t);
    (ceu.horizonte.value as THREE.Color).lerpColors(a.horizonte, b.horizonte, t);
  }

  /** Avança a passagem suave de um ambiente para o outro (3 s). */
  misturarAmbiente(dt: number) {
    const m = this.mistura;
    if (!m) return;
    m.t = Math.min(1, m.t + dt / 3);
    this.porAmbiente(m.de, m.para, m.t * m.t * (3 - 2 * m.t));
    if (m.t >= 1) this.mistura = null;
  }

  /** Luz, névoa e o que fica visível em cada área. */
  aplicarAmbiente() {
    const naCripta = this.ctx.area === this.ctx.cripta;
    const noPoco = this.ctx.area === this.ctx.meiodia;
    const noBanquete = this.ctx.area === this.ctx.banquete;
    this.mistura = null;
    this.ctx.cripta.grupo.visible = naCripta;
    this.ctx.meiodia.grupo.visible = noPoco;
    this.ctx.banquete.grupo.visible = noBanquete;
    const noNavio = this.ctx.area === this.ctx.navio;
    this.ctx.navio.grupo.visible = noNavio;
    // as regiões ao ar livre e o ermo ficam para o fim (verRegioes), depois de a névoa dizer até onde se vê
    // os bichos do ermo andam na terra de ligação, que se vê de dentro das regiões também
    for (const [id, fauna] of this.ctx.fauna.faunas) fauna.grupo.visible = id === this.ctx.area.id || (id === 'ermo' && this.ctx.regioes.aberto);
    this.ceu.visible = !naCripta;
    this.sol.visible = !naCripta;
    const fog = this.ctx.cena.fog as THREE.Fog;
    const ceu = (this.ceu.material as THREE.ShaderMaterial).uniforms;
    const def = REGIOES[this.ctx.area.id];
    // uma região pode pedir outro ambiente para o momento da história (Malta antes da cor: a garoa, o nublado)
    let proprio: NomeAmbiente | null = null;
    for (const m of this.ctx.modulos) proprio = m.ambiente?.() ?? proprio;
    if (def.tempestade === 'sempre' || (def.tempestade === 'acordada' && !this.ctx.regioes.dormente)) {
      // a tempestade: céu de chumbo, chuva que fecha o horizonte, e a noite de catorze dias; o relâmpago clareia tudo
      const k = noNavio ? this.ctx.navio : this.ctx.naufragio;
      const e = k.escuridao, r = k.relampago;
      fog.color.setHex(0x6a747c).lerp(new THREE.Color(0x10161c), e).lerp(new THREE.Color(0xd8e0ea), r * 0.6);
      fog.near = 18;
      fog.far = 110 - e * 30;
      this.hemi.color.setHex(0xb8c6d4);
      this.hemi.groundColor.setHex(0x2a3238);
      this.hemi.intensity = 1.05 - e * 0.62 + r * 1.4;
      this.sol.color.setHex(0xc8d4e0);
      this.sol.intensity = 0.7 - e * 0.55;
      ceu.topo.value.setHex(0x3a424a).lerp(new THREE.Color(0x05080c), e).lerp(new THREE.Color(0xc0c8d8), r * 0.5);
      ceu.horizonte.value.setHex(0x6a747c).lerp(new THREE.Color(0x141a20), e).lerp(new THREE.Color(0xd8e0ea), r * 0.5);
    } else {
      this.porAmbientePronto(AMBIENTES[proprio ?? def.ambiente]);
    }
    this.ctx.regioes.verRegioes();
    this.ctx.renderer.setClearColor(naCripta ? 0x050407 : 0x000000);
    // a cripta não tem teto: a câmera fica alta para enxergar por cima das paredes
    this.ctx.camera.arfagemMin = naCripta ? 0.5 : ARFAGEM_LIVRE;
    this.ctx.camera.subirAoBater = naCripta;
    this.ctx.som.ambienteDe(this.ctx.comecou ? this.tipoAmbiente() : null);
    if (naCripta) this.ctx.camera.arfagem = Math.max(this.ctx.camera.arfagem, 0.5);
  }

  /** Aplica uma predefinição de luz, névoa e céu (`AMBIENTES`, em Regioes.ts); o que ela não traz fica como estava. */
  porAmbientePronto(a: AmbienteDaRegiao) {
    const fog = this.ctx.cena.fog as THREE.Fog;
    const ceu = (this.ceu.material as THREE.ShaderMaterial).uniforms;
    fog.color.setHex(a.nevoa.cor);
    fog.near = a.nevoa.perto;
    fog.far = a.nevoa.longe;
    this.hemi.color.setHex(a.hemi.ceu);
    this.hemi.groundColor.setHex(a.hemi.chao);
    this.hemi.intensity = a.hemi.forca;
    if (a.sol) {
      this.sol.color.setHex(a.sol.cor);
      this.sol.intensity = a.sol.forca;
    }
    if (a.ceu) {
      ceu.topo.value.setHex(a.ceu.topo);
      ceu.horizonte.value.setHex(a.ceu.horizonte);
    }
  }

  tipoAmbiente() {
    const som = REGIOES[this.ctx.area.id].som;
    return som && !(som.ate && this.ctx.estado.flags.has(som.ate)) ? som.tipo : null;
  }

  /** A cor da região onde o peregrino está: a de cada região vem do módulo dela; a cripta e o ermo usam a do Vale. */
  corAtual() {
    const a = this.ctx.regioes.areaDaRegiao();
    for (const m of this.ctx.modulos) if (m.cor && m.areas.includes(a.id)) return m.cor(a.id);
    return this.ctx.estado.cor;
  }

  /** A cor que se vê: segue a da região devagar (a cor volta aos poucos), e salta ao trocar de área. */
  corVisivel(dt: number) {
    const alvo = this.corAtual();
    // andando de uma região a outra a cor muda aos poucos; só salta ao trocar de área pelo véu
    if (this.semSaltoDeCor && this.corSuave >= 0) {
      this.semSaltoDeCor = false;
      this.areaDaCor = this.ctx.area;
    }
    if (this.areaDaCor !== this.ctx.area || this.corSuave < 0) {
      this.areaDaCor = this.ctx.area;
      this.corSuave = alvo;
    } else this.corSuave += Math.sign(alvo - this.corSuave) * Math.min(Math.abs(alvo - this.corSuave), dt * 0.3);
    return this.corSuave;
  }
}
