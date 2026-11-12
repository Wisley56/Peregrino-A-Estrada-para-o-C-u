import * as THREE from 'three';
import type { Humano } from '../voxel/Humano';

/**
 * Retratos da caixa de diálogo: o rosto de cada falante, renderizado uma vez com o próprio
 * renderer do jogo num alvo pequeno fora da tela e guardado como imagem. Custa um quadro de
 * 160×160 na primeira fala de cada personagem e nada depois.
 *
 * Quem tem corpo no mundo (NPCs) registra a própria fábrica de modelo; falantes sem corpo
 * (Espírito Santo, inscrições) simplesmente não têm retrato.
 */
const LADO = 160;

const fabricas = new Map<string, () => Humano>();
const cache = new Map<string, string | null>();
let renderer: THREE.WebGLRenderer | null = null;

export function iniciarRetratos(r: THREE.WebGLRenderer) {
  renderer = r;
}

/** Associa um falante ao modelo que o desenha. O primeiro registro vale. */
export function registrarRetrato(id: string, fabrica: () => Humano) {
  if (!fabricas.has(id)) fabricas.set(id, fabrica);
}

/** Imagem (data URL) do rosto do falante, ou null se ele não tem corpo. */
export function retratoDe(id: string | null): string | null {
  if (!id) return null;
  if (cache.has(id)) return cache.get(id)!;
  const fabrica = fabricas.get(id);
  const url = fabrica && renderer ? desenhar(renderer, fabrica()) : null;
  cache.set(id, url);
  return url;
}

function desenhar(r: THREE.WebGLRenderer, h: Humano): string | null {
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xfff4e0, 0x403528, 1.3));
  const sol = new THREE.DirectionalLight(0xffe8c8, 2.2);
  sol.position.set(-1.2, 1.6, 2.2);
  cena.add(sol);
  const recorte = new THREE.DirectionalLight(0xc8d8ff, 0.8);
  recorte.position.set(1.5, 0.6, -1);
  cena.add(recorte);
  cena.add(h.raiz);
  h.raiz.updateMatrixWorld(true);

  // enquadra o busto: um pouco abaixo dos olhos, rosto levemente em três quartos
  const alvo = new THREE.Vector3(0, h.alturaOlhos - 0.03, 0);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 10);
  camera.position.set(0.6, h.alturaOlhos + 0.08, 1.85);
  camera.lookAt(alvo);

  const destino = new THREE.WebGLRenderTarget(LADO, LADO, { samples: 4 });
  destino.texture.colorSpace = THREE.SRGBColorSpace;
  const anterior = r.getRenderTarget();
  const corFundo = r.getClearColor(new THREE.Color());
  const alfaFundo = r.getClearAlpha();
  const sombras = r.shadowMap.enabled;
  let url: string | null = null;
  try {
    r.shadowMap.enabled = false;
    r.setRenderTarget(destino);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(cena, camera);
    const px = new Uint8Array(LADO * LADO * 4);
    r.readRenderTargetPixels(destino, 0, 0, LADO, LADO, px);
    const tela = document.createElement('canvas');
    tela.width = tela.height = LADO;
    const ctx = tela.getContext('2d')!;
    const img = ctx.createImageData(LADO, LADO);
    // o WebGL lê de baixo para cima
    for (let y = 0; y < LADO; y++) img.data.set(px.subarray((LADO - 1 - y) * LADO * 4, (LADO - y) * LADO * 4), y * LADO * 4);
    ctx.putImageData(img, 0, 0);
    url = tela.toDataURL('image/png');
  } catch (e) {
    console.warn('[retratos] não foi possível desenhar o retrato', e);
  } finally {
    r.setRenderTarget(anterior);
    r.setClearColor(corFundo, alfaFundo);
    r.shadowMap.enabled = sombras;
    destino.dispose();
    h.raiz.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  }
  return url;
}
