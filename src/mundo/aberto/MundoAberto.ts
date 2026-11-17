import * as THREE from 'three';
import type { FonteMapa } from '../../ui/Minimapa';
import type { Area, IdArea } from '../Area';
import { Oceano } from '../Oceano';
import type { Sombra } from '../../entidades/Sombra';
import { Chunks } from './Chunks';
import { NIVEL_MAR } from './Geografia';
import type { TerrenoMundo } from './TerrenoMundo';

/** Raio (m) do buraco do mar ao longe: dentro dele o mar é a grade com ondas do `Oceano`. */
const RAIO_ONDAS = 300;
const COR_MAR = 0x1d7f98;
/** Lado (m) do quadrado do minimapa do ermo. */
const LADO_MAPA = 192;

/**
 * O ermo: tudo o que no mundo aberto não é uma região feita à mão (a terra de ligação entre elas e o mar aberto).
 * É também a **física do mundo aberto inteiro**: pergunta-se a ele a altura do chão, a água e os obstáculos em
 * qualquer ponto, e ele responde pela região que manda ali ou pelo terreno procedural. Assim o peregrino atravessa
 * de uma região para a terra de ligação, e dali para outra, sem trocar de chão no meio do passo.
 */
export class Ermo implements Area {
  readonly id = 'ermo' as const;
  readonly grupo = new THREE.Group();
  readonly sombras: Sombra[] = [];
  readonly chunks: Chunks;
  readonly oceano = new Oceano(NIVEL_MAR, COR_MAR);
  /** O mar ao longe: um anel liso e opaco em volta da grade de ondas, até o horizonte. */
  private readonly marLonge: THREE.Mesh;
  private readonly centroMapa = new THREE.Vector2();

  constructor(readonly terreno: TerrenoMundo, private readonly regioes: Map<IdArea, Area>) {
    this.chunks = new Chunks(terreno);
    const anel = new THREE.RingGeometry(RAIO_ONDAS, 9000, 48, 1);
    anel.rotateX(-Math.PI / 2);
    this.marLonge = new THREE.Mesh(anel, new THREE.MeshLambertMaterial({ color: COR_MAR, emissive: 0x03202a }));
    this.marLonge.position.y = NIVEL_MAR - 0.15;
    this.marLonge.frustumCulled = false;
    this.grupo.add(this.chunks.grupo, this.marLonge, this.oceano.malha);
  }

  /** A região que manda em (x, z), se houver. */
  regiaoEm(x: number, z: number): Area | null {
    const c = this.terreno.regiaoEm(x, z);
    return c ? this.regioes.get(c.id) ?? null : null;
  }

  altura(x: number, z: number) {
    return this.terreno.altura(x, z);
  }

  alturaCamera(x: number, z: number) {
    const r = this.regiaoEm(x, z);
    return r?.alturaCamera ? r.alturaCamera(x, z) : this.terreno.altura(x, z);
  }

  colidir(pos: THREE.Vector3, raio: number) {
    this.regiaoEm(pos.x, pos.z)?.colidir(pos, raio);
  }

  nivelAgua(x: number, z: number) {
    const r = this.regiaoEm(x, z);
    if (r) return r.nivelAgua ? r.nivelAgua(x, z) : r.nivelMinimo ?? null;
    return this.oceano.altura(x, z);
  }

  /** Só o mar (as ondas e o anel do horizonte) acompanha quem está numa região; os chunks acompanham sempre. */
  atualizar(dt: number, jogador: THREE.Vector3) {
    this.chunks.atualizar(jogador.x, jogador.z);
    this.oceano.atualizar(dt, jogador);
    this.marLonge.position.x = this.oceano.malha.position.x;
    this.marLonge.position.z = this.oceano.malha.position.z;
    this.centroMapa.set(jogador.x, jogador.z);
  }

  /** Mostra ou esconde o mar do ermo (dentro de uma região de mar, quem aparece é o mar dela). */
  mostrarMar(sim: boolean) {
    this.oceano.malha.visible = sim;
    this.marLonge.visible = sim;
  }

  /** Pede à obra o minimapa do quadrado em volta de (x, z); `pronto` recebe o retângulo e os pixels (1 por metro). */
  pedirMapa(x: number, z: number, pronto: (f: { x0: number; z0: number; largura: number; profundidade: number }, px: Uint8ClampedArray) => void) {
    const lado = LADO_MAPA, x0 = Math.round(x) - lado / 2, z0 = Math.round(z) - lado / 2;
    this.chunks.obra.mapa(x0, z0, lado, (px) => pronto({ x0, z0, largura: lado, profundidade: lado }, px));
  }

  /** O minimapa do ermo é um quadrado em volta de onde o peregrino está (refeito quando ele se afasta). */
  fonteMapa(): FonteMapa {
    const lado = LADO_MAPA, x0 = Math.round(this.centroMapa.x) - lado / 2, z0 = Math.round(this.centroMapa.y) - lado / 2;
    return {
      x0, z0, largura: lado, profundidade: lado,
      cor: (x, z) => (this.terreno.altura(x, z) < NIVEL_MAR ? 0x2f86a8 : this.terreno.cor(x, z)),
    };
  }
}
