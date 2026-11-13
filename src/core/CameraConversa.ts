import * as THREE from 'three';

/**
 * Câmera de conversa: durante um diálogo com um NPC, a câmera deixa o braço da terceira pessoa e passa a
 * enquadrar a conversa com a gramática do cinema. É uma camada por cima da câmera de jogo: a de terceira pessoa
 * continua calculando por baixo, e esta mistura posição, direção e abertura por um peso que sobe ao começar e
 * desce ao terminar (a volta ao jogo é suave, sem salto).
 *
 * Planos:
 *  - `npc`: o NPC fala; por cima do ombro do peregrino, o rosto dele quase no centro.
 *  - `peregrino`: as escolhas estão na tela; o contraplano, por cima do ombro do NPC.
 *  - `geral`: os dois de lado, para abrir a conversa e para quem fala sem corpo (o Espírito Santo, as placas).
 *  - `perto`: o rosto de quem fala, mais de perto (pedido pelo roteiro com `#plano:perto`).
 *
 * Regra dos 180 graus: o lado da câmera em relação à linha entre os dois é escolhido no começo (o mesmo da
 * câmera de jogo, para a entrada ser natural) e mantido nos planos e contraplanos; só troca se uma parede
 * tapar o lado escolhido. A troca de plano é corte seco, como no cinema; a entrada e a saída são mistura.
 */
export type PlanoConversa = 'npc' | 'peregrino' | 'geral' | 'perto';

/** Testa se o segmento de `de` até `para` está livre (sem terreno nem parede no meio). */
export type Livre = (de: THREE.Vector3, para: THREE.Vector3) => boolean;

/** Os dois em cena: onde estão os olhos e o corpo (para ver se um tapa o rosto do outro). */
export interface Elenco {
  peregrino: THREE.Vector3;
  corpoPeregrino: THREE.Object3D;
  npc: THREE.Vector3;
  corpoNpc: THREE.Object3D;
}

/** Abertura da lente nos planos de conversa (mais fechada que a do jogo, como uma lente de retrato). */
const FOV_CONVERSA = 44;
/** Tempo da entrada e da saída (s). */
const MISTURA = 0.6;
/** O plano se aproxima devagar enquanto dura (m/s, até o limite), para a imagem não ficar parada. */
const APROXIMA = 0.05;
const APROXIMA_MAX = 0.3;

const CIMA = new THREE.Vector3(0, 1, 0);
/**
 * Plano por cima do ombro: quanto atrás, para o lado e acima dos olhos de quem fica de costas (m). Bem aberto para
 * o lado: a cabeça voxel é grande, e só assim ela fica na borda da tela, longe do rosto de quem fala.
 */
const OMBRO_ATRAS = 1.0;
const OMBRO_LADO_BASE = 1.4;
const OMBRO_ALTO = 0.2;
/**
 * Desvio do olhar, por metro de distância até quem fala: o rosto sai do centro para o terço do outro lado, e o
 * ombro em primeiro plano vai para a borda.
 */
const TERCO = 0.2;

export class CameraConversa {
  /** 0 = câmera de jogo, 1 = câmera de conversa (já suavizado). */
  get peso() {
    return suave(this.k);
  }
  /** Há conversa enquadrada (a entrada começou e a saída ainda não terminou). */
  get emUso() {
    return this.k > 0;
  }
  /** Uma conversa está em curso (pode estar entrando ou, sem plano que caiba, ainda na câmera de jogo). */
  get emConversa() {
    return this.ativa;
  }

  private k = 0;
  private ativa = false;
  private lado = 1;
  private plano: PlanoConversa = 'geral';
  /** Plano válido calculado (null: nenhum enquadramento cabe ali, a câmera de jogo assume). */
  private valido = false;
  private pos = new THREE.Vector3();
  private olhar = new THREE.Vector3();
  private aproximacao = 0;
  private cortar = true;
  private fovJogo = 0;
  private q = new THREE.Quaternion();
  private m = new THREE.Matrix4();
  private raio = new THREE.Raycaster();

  /** O plano pedido agora (para o modo dev e os testes). */
  get planoAtual() {
    return this.plano;
  }

  /** Começa uma conversa: escolhe o lado da linha pelo lado em que a câmera de jogo já está. */
  comecar(camJogo: THREE.Vector3, peregrino: THREE.Vector3, npc: THREE.Vector3, plano: PlanoConversa) {
    const { r } = eixos(peregrino, npc);
    this.lado = camJogo.clone().sub(peregrino).dot(r) >= 0 ? 1 : -1;
    this.ativa = true;
    this.plano = plano;
    this.cortar = true;
    this.aproximacao = 0;
  }

  /** Troca de plano (corte seco). */
  mudar(plano: PlanoConversa) {
    if (plano === this.plano) return;
    this.plano = plano;
    this.cortar = true;
    this.aproximacao = 0;
  }

  terminar() {
    this.ativa = false;
  }

  /**
   * Calcula o plano e mistura com a câmera de jogo (que já foi posicionada neste quadro). `falando` é quem tem a
   * palavra no plano `perto` (o NPC ou o peregrino).
   */
  atualizar(dt: number, cam: THREE.PerspectiveCamera, elenco: Elenco | null, livre: Livre, falando: 'npc' | 'peregrino' = 'npc') {
    if (!this.fovJogo) this.fovJogo = cam.fov;
    this.raio.camera = cam; // o raio pode cruzar sprites (a chama da lamparina)
    if (this.ativa && elenco) {
      const ok = this.enquadrar(elenco, livre, falando);
      if (ok) {
        this.valido = true;
        this.aproximacao = Math.min(APROXIMA_MAX, this.aproximacao + APROXIMA * dt);
      } else this.valido = false;
    }
    const alvo = this.ativa && this.valido ? 1 : 0;
    this.k = THREE.MathUtils.clamp(this.k + Math.sign(alvo - this.k) * (dt / MISTURA), 0, 1);
    if (this.k <= 0) {
      if (cam.fov !== this.fovJogo) {
        cam.fov = this.fovJogo;
        cam.updateProjectionMatrix();
      }
      return;
    }
    const w = this.peso;
    // aproxima ao longo da direção do olhar
    const dir = this.olhar.clone().sub(this.pos).normalize();
    const pos = this.pos.clone().addScaledVector(dir, this.aproximacao);
    this.m.lookAt(pos, this.olhar, CIMA);
    this.q.setFromRotationMatrix(this.m);
    cam.position.lerp(pos, w);
    cam.quaternion.slerp(this.q, w);
    cam.fov = THREE.MathUtils.lerp(this.fovJogo, FOV_CONVERSA, w);
    cam.updateProjectionMatrix();
  }

  /**
   * Posição e alvo do plano atual. Se uma parede ou o corpo de quem está em primeiro plano (um braço erguido, um
   * cajado) tapar o rosto enquadrado, tenta abrir mais para o lado, depois o plano de perto, o outro lado da linha
   * e, por fim, o plano geral.
   */
  private enquadrar(el: Elenco, livre: Livre, falando: 'npc' | 'peregrino') {
    const p = el.peregrino, a = el.npc;
    const ombro = this.plano === 'npc' || this.plano === 'peregrino';
    const vez = this.plano === 'peregrino' ? 'peregrino' : this.plano === 'npc' ? 'npc' : falando;
    const tentativas: [PlanoConversa, number, number][] = [
      [this.plano, this.lado, 1],
      ...(ombro ? ([[this.plano, this.lado, 1.5], ['perto', this.lado, 1]] as [PlanoConversa, number, number][]) : []),
      [this.plano, -this.lado, 1],
      ['geral', this.lado, 1],
      ['geral', -this.lado, 1],
    ];
    for (const [plano, lado, abrir] of tentativas) {
      const [pos, olhar] = plano_(plano, lado, p, a, plano === 'perto' ? vez : falando, abrir);
      if (!livre(pos, olhar)) continue;
      // o rosto de quem o plano mostra não pode estar atrás do outro
      if (plano === 'geral') {
        if (this.tapa(pos, a, el.corpoPeregrino) || this.tapa(pos, p, el.corpoNpc)) continue;
      } else {
        const mostra = plano === 'npc' || (plano === 'perto' && vez === 'npc') ? a : p;
        if (!livre(pos, mostra) || this.tapa(pos, mostra, mostra === a ? el.corpoPeregrino : el.corpoNpc)) continue;
      }
      if (lado !== this.lado) this.lado = lado; // a parede obrigou a trocar de lado: fica do lado novo
      // longe do plano atual (outro plano, outro lado): corte; perto (os dois terminando de se virar): segue
      // sem tremer
      if (this.cortar || this.k <= 0 || pos.distanceToSquared(this.pos) > 0.25) {
        if (!this.cortar && this.k > 0) this.aproximacao = 0;
        this.pos.copy(pos);
        this.olhar.copy(olhar);
        this.cortar = false;
      } else {
        this.pos.lerp(pos, 0.2);
        this.olhar.lerp(olhar, 0.2);
      }
      return true;
    }
    return false;
  }

  /** O corpo `quem` fica entre a câmera e o rosto `rosto`? */
  private tapa(cam: THREE.Vector3, rosto: THREE.Vector3, quem: THREE.Object3D) {
    const dir = rosto.clone().sub(cam);
    const dist = dir.length();
    this.raio.set(cam, dir.divideScalar(dist));
    this.raio.far = dist - 0.25;
    return this.raio.intersectObject(quem, true).length > 0;
  }
}

/** Direção do peregrino para o NPC no chão (`d`) e a perpendicular à direita dela (`r`). */
function eixos(p: THREE.Vector3, a: THREE.Vector3) {
  const d = new THREE.Vector3(a.x - p.x, 0, a.z - p.z);
  if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
  d.normalize();
  const r = new THREE.Vector3(-d.z, 0, d.x);
  return { d, r };
}

function plano_(plano: PlanoConversa, lado: number, p: THREE.Vector3, a: THREE.Vector3, falando: 'npc' | 'peregrino', abrir = 1): [THREE.Vector3, THREE.Vector3] {
  const { d, r } = eixos(p, a);
  const OMBRO_LADO = OMBRO_LADO_BASE * abrir;
  const dist = Math.hypot(a.x - p.x, a.z - p.z);
  switch (plano) {
    case 'npc': {
      // por cima do ombro do peregrino, um pouco acima dos olhos dele; o olhar desvia para o lado oposto ao da
      // câmera, e assim o ombro fica numa borda da tela e o rosto do NPC no terço do outro lado
      const pos = p.clone().addScaledVector(d, -OMBRO_ATRAS).addScaledVector(r, lado * OMBRO_LADO).add(new THREE.Vector3(0, OMBRO_ALTO, 0));
      const olhar = a.clone().addScaledVector(r, -lado * TERCO * (dist + OMBRO_ATRAS));
      return [pos, olhar];
    }
    case 'peregrino': {
      const pos = a.clone().addScaledVector(d, OMBRO_ATRAS).addScaledVector(r, lado * OMBRO_LADO).add(new THREE.Vector3(0, OMBRO_ALTO, 0));
      const olhar = p.clone().addScaledVector(r, -lado * TERCO * (dist + OMBRO_ATRAS));
      return [pos, olhar];
    }
    case 'perto': {
      const [quem, outro] = falando === 'npc' ? [a, p] : [p, a];
      const ao = outro.clone().sub(quem).setY(0).normalize();
      const pos = quem.clone().addScaledVector(ao, 1.15).addScaledVector(r, lado * 0.35).add(new THREE.Vector3(0, 0.05, 0));
      return [pos, quem.clone()];
    }
    case 'geral': {
      const meio = p.clone().add(a).multiplyScalar(0.5);
      const pos = meio.clone().addScaledVector(r, lado * (dist * 0.75 + 1.9)).add(new THREE.Vector3(0, 0.35, 0));
      return [pos, meio.add(new THREE.Vector3(0, -0.1, 0))];
    }
  }
}

function suave(x: number) {
  return x * x * (3 - 2 * x);
}
