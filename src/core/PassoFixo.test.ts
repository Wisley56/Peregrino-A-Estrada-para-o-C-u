import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PassoFixo } from './PassoFixo';
import { identidadePadrao, visualDe } from './Aparencia';
import { Peregrino, type Fisica } from '../entidades/Peregrino';

describe('PassoFixo', () => {
  it('roda um passo por 1/60 s, qualquer que seja o quadro', () => {
    for (const fps of [30, 60, 144]) {
      const p = new PassoFixo();
      let passos = 0;
      for (let i = 0; i < fps; i++) p.avancar(1 / fps, () => passos++);
      expect(passos, `${fps} qps`).toBe(60);
    }
  });

  it('num quadro longo roda no máximo maxPassos e descarta o resto do atraso', () => {
    const p = new PassoFixo(1 / 60, 5);
    let passos = 0;
    const k = p.avancar(2, () => passos++);
    expect(passos).toBe(5);
    expect(k).toBeCloseTo(0);
  });

  it('devolve a fração do passo seguinte para interpolar', () => {
    const p = new PassoFixo(0.1);
    expect(p.avancar(0.25, () => {})).toBeCloseTo(0.5);
  });
});

/** Chão plano em y = 0, sem obstáculos. */
const plano: Fisica = { altura: () => 0, colidir: () => {} };

/** Pula parado e anda para a frente por 2 s a `fps` quadros por segundo; devolve a altura máxima e onde parou. */
function simular(fps: number) {
  const per = new Peregrino(visualDe(identidadePadrao()));
  per.teleportar(0, 0, 0);
  const fixo = new PassoFixo();
  const frente = new THREE.Vector3(0, 0, 1);
  let alto = 0, pulo = true;
  for (let i = 0; i < fps * 2; i++) {
    fixo.avancar(1 / fps, (h) => {
      per.atualizar(h, plano, frente, 4.4, pulo, null);
      pulo = false;
      alto = Math.max(alto, per.pos.y);
    });
  }
  return { alto, z: per.pos.z };
}

describe('física do peregrino em passo fixo', () => {
  it('o pulo e o caminho são os mesmos a 30, 60 e 144 qps', () => {
    const base = simular(60);
    expect(base.alto).toBeGreaterThan(1.3);
    for (const fps of [30, 144]) {
      const r = simular(fps);
      expect(r.alto, `altura a ${fps} qps`).toBeCloseTo(base.alto, 6);
      expect(r.z, `distância a ${fps} qps`).toBeCloseTo(base.z, 6);
    }
  });
});
