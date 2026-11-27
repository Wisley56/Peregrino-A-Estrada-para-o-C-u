import * as THREE from 'three';
import { Modelo, variar } from '../voxel/Modelo';
import { Fisica } from './Peregrino';
import { ResultadoGolpe, Sombra } from './Sombra';
import { Chefe, Impacto, InfoJogador } from './Guardiao';
import { AJUSTES } from '../config/ajustes';

/**
 * Gula, "O Banquete sem fim": chefão da Cidade Dourada (Fl 3,19: "o deus deles é o ventre").
 * Na iconografia dos vícios, a Gula é uma figura obesa que come sem parar, coroada de parras e uvas, com a taça na
 * mão. Aqui ela é um demônio inchado de babador no pescoço, com uma coxa assada numa mão e um cálice na outra.
 *
 * - Fartura: enquanto houver travessas cheias nas mesas, ela se alimenta e nada a fere. A luz ou o cajado derrubam
 *   as travessas. Com as mesas vazias, ela fica faminta (cai sentada, procurando comida) e pode ser ferida.
 *   Depois o banquete se serve de novo: ele não acaba nunca.
 * - Chuva de iguarias (o vício dela): pratos caem nas marcas douradas. Não ferem: pesam. O peso deixa o peregrino
 *   mais lento e com menos pulo. Reparte-se com os pobres (F) ou se perde em jejum (segure R).
 * - Devorar: ela aspira o ar e puxa o peregrino para a boca; no fim, morde. Quanto mais peso, mais forte o puxão.
 * - Barrigada: salta e cai de barriga, e uma onda de vinho corre pelo chão. Pule.
 * Na metade da vida: "Mais! Tragam mais!": uma travessa a mais, ataques mais rápidos e chuva dobrada.
 */

const S = 0.1;
const OLHOS = 0xd8ff6a;

let geoCache: THREE.BufferGeometry | null = null;
function geometriaGula() {
  if (geoCache) return geoCache;
  const m = new Modelo();
  const manto = (x: number, y: number, z: number) => {
    // brocado: veludo vinho com flores de ouro miúdas
    if ((x * 3 + y * 5 + z * 7) % 11 === 0) return variar(0xd8b048, x, y, z, 0.04);
    return variar([0x6a1e3e, 0x5a1834, 0x7a2448][Math.abs(x + y * 2 + z) % 3], x, y, z, 0.04);
  };
  const pele = (x: number, y: number, z: number) => variar(0xb48a96, x, y, z, 0.04);
  const ouro = (x: number, y: number, z: number) => variar((x + y + z) & 1 ? 0xe0b84a : 0xc89a34, x, y, z, 0.03);

  // pernas curtas e grossas, quase escondidas pela barriga
  m.caixa(-5, 0, -2, 3, 3, 4, manto).caixa(3, 0, -2, 3, 3, 4, manto);
  m.caixa(-5, 0, 2, 3, 1, 2, 0x2a1a14).caixa(3, 0, 2, 3, 1, 2, 0x2a1a14); // sapatos

  // a barriga: um ovo enorme. Na frente, o manto não fecha e a pele aparece
  for (let y = 2; y < 16; y++)
    for (let x = -10; x <= 10; x++)
      for (let z = -8; z <= 10; z++) {
        const dy = (y - 8.5) / 7, dx = x / 9.2, dz = (z - 1) / 8;
        if (dx * dx + dy * dy + dz * dz > 1) continue;
        const frente = z > 4 && Math.abs(x) < 4.2 - Math.abs(y - 8) * 0.25 && y > 3 && y < 14;
        m.ponto(x, y, z, frente ? pele(x, y, z) : manto(x, y, z));
      }
  m.ponto(0, 7, 9, 0x6a4a52).ponto(0, 7, 10, null); // umbigo
  // o cinto de ouro, esticado ao máximo, com a fivela de rubi
  for (let x = -10; x <= 10; x++)
    for (let z = -8; z <= 10; z++) {
      const dx = x / 9.4, dz = (z - 1) / 8.3;
      const r = dx * dx + dz * dz;
      if (r <= 1 && r > 0.72) m.caixa(x, 10, z, 1, 1, 1, ouro);
    }
  m.caixa(-1, 9, 9, 3, 3, 1, ouro).ponto(0, 10, 10, 0xc0183a);

  // peito e ombros, estreitos perto da barriga
  m.caixa(-6, 15, -3, 13, 3, 8, manto);
  m.caixa(-8, 16, -2, 3, 2, 5, manto).caixa(6, 16, -2, 3, 2, 5, manto);
  // babador branco preso no pescoço, manchado de vinho e molho
  m.caixa(-3, 13, 5, 7, 5, 1, (x, y) => ((x * 7 + y * 3) % 9 === 0 ? 0x8a1a2a : (x + y) % 7 === 0 ? 0xa0703a : 0xf2ece0));
  m.caixa(-2, 12, 5, 5, 1, 1, 0xf2ece0);

  // braço esquerdo: a coxa assada (osso e carne)
  m.caixa(-11, 12, -1, 3, 5, 3, manto).caixa(-12, 10, 0, 3, 3, 3, pele);
  m.caixa(-12, 13, 2, 3, 3, 3, (x, y, z) => variar(0x9a5a2a, x, y, z, 0.08)).caixa(-11, 16, 3, 1, 2, 1, 0xf0e8d8).ponto(-11, 18, 3, 0xf0e8d8);
  // braço direito, erguido: o cálice de ouro transbordando de vinho
  m.caixa(9, 14, -1, 3, 5, 3, manto).caixa(10, 19, -1, 3, 2, 3, pele);
  m.caixa(10, 21, 0, 1, 2, 1, ouro).caixa(9, 23, -1, 3, 1, 3, ouro).caixa(9, 24, -1, 3, 2, 3, ouro).caixa(10, 25, 0, 1, 1, 1, 0x7a0a2a);
  m.ponto(12, 24, 0, 0x8a1030).ponto(12, 23, 0, 0x8a1030); // o vinho escorrendo

  // queixo duplo e a cabeça pequena para o corpo
  m.caixa(-3, 17, 0, 7, 2, 5, pele);
  m.caixa(-2, 18, -1, 5, 5, 5, pele);
  m.caixa(-3, 19, 1, 1, 2, 3, pele).caixa(3, 19, 1, 1, 2, 3, pele); // bochechas
  // a boca larga, sempre aberta, com dentes
  m.caixa(-1, 19, 4, 3, 1, 1, 0x3a0a14).ponto(-1, 20, 4, 0xf0e8d0).ponto(1, 20, 4, 0xf0e8d0).ponto(0, 18, 4, 0x8a2a3a);
  // coroa de parras e uvas
  m.caixa(-3, 23, -2, 7, 1, 7, (x, z) => ((x + z) & 1 ? 0x4a8a3a : 0x3a7030));
  for (const [x, z] of [[-3, 3], [3, 3], [-3, -1], [3, -1], [0, 4], [0, -2]]) {
    m.caixa(x, 24, z, 1, 1, 1, 0x4a8a3a);
    m.ponto(x, 22, z + (z > 0 ? 1 : -1), 0x5a2478).ponto(x, 21, z + (z > 0 ? 1 : -1), 0x6a2a8a); // cachos pendurados
  }
  m.ponto(-1, 24, 1, 0x6a2a8a).ponto(1, 24, 1, 0x5a2478).ponto(0, 25, 1, 0x7a3a9a);
  geoCache = m.geometria(S, [0, 0, 0]);
  return geoCache;
}

type Ataque =
  | { tipo: 'iguarias'; t: number; levas: { pontos: THREE.Vector3[]; inicio: number; caiu: boolean }[] }
  | { tipo: 'devorar'; t: number; mordeu: boolean }
  | { tipo: 'barrigada'; t: number; r: number; caiu: boolean; acertou: boolean }
  | { tipo: 'cansado'; t: number; duracao: number };

/** Quanto tempo ela fica faminta (vulnerável) depois de as mesas ficarem vazias. */
export const TEMPO_FAMINTA = 7.5;

export class Gula extends Sombra implements Chefe {
  readonly efeitos = new THREE.Group();
  readonly impactos: Impacto[] = [];
  alerta = '';
  readonly mensagemBloqueio: string = 'Ela está se fartando: derrube as travessas do banquete!';
  /** Há travessas cheias nas mesas: ela se alimenta e nada a fere. A arena atualiza. */
  saciada = true;
  private matOlhos = new THREE.MeshBasicMaterial({ color: OLHOS });
  private ataque: Ataque | null = null;
  private ultimo = '';
  private espera = 2.4;
  private enfurecido = false;
  private avisados = new Set<string>();
  private info: InfoJogador = { pos: new THREE.Vector3(), noChao: true, esquivando: false, invulneravel: false, peso: 0 };
  private fis: Fisica | null = null;
  private salto = 0;

  private marcas: THREE.Mesh[] = [];
  private pratos: THREE.Mesh[] = [];
  private onda: THREE.Mesh;
  private migalhas: THREE.Mesh[] = [];

  constructor(id: string, casa: THREE.Vector3) {
    super(id, casa, { escala: AJUSTES.chefoes.gula.escala, vida: AJUSTES.chefoes.gula.vida, adormecida: true, visao: 60 });
    this.corpo.geometry = geometriaGula();
    this.olhos[0].position.set(-1.2 * S, 21.4 * S, 4.6 * S);
    this.olhos[1].position.set(1.8 * S, 21.4 * S, 4.6 * S);
    for (const o of this.olhos) {
      o.material = this.matOlhos;
      o.scale.set(0.8, 0.6, 1);
    }
    this.duracaoAtordoada = TEMPO_FAMINTA;
    const geoMarca = new THREE.CircleGeometry(1.15, 28).rotateX(-Math.PI / 2);
    const geoPrato = pratoQueCai();
    for (let i = 0; i < 16; i++) {
      const marca = new THREE.Mesh(
        geoMarca,
        new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      const prato = new THREE.Mesh(geoPrato, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4a3008 }));
      marca.visible = prato.visible = false;
      this.marcas.push(marca);
      this.pratos.push(prato);
      this.efeitos.add(marca, prato);
    }
    this.onda = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9a1030, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.onda.visible = false;
    this.efeitos.add(this.onda);
    // o ar que ela aspira: migalhas e folhas de ouro voando para a boca
    const matMigalha = new THREE.MeshBasicMaterial({ color: 0xf0d890, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), matMigalha);
      b.visible = false;
      this.migalhas.push(b);
      this.efeitos.add(b);
    }
  }

  get fase2() {
    return this.vida <= this.vidaMax / 2;
  }

  /** Faminta: as mesas ficaram vazias. Ela cai sentada e pode ser ferida. */
  get faminta() {
    return this.estado === 'atordoada';
  }

  get raioCorpo() {
    return 0.62 * this.escala;
  }

  get raioContato() {
    return 0.8 * this.escala;
  }

  centro(destino = new THREE.Vector3()) {
    return destino.copy(this.pos).add(new THREE.Vector3(0, 1.0 * this.escala, 0));
  }

  sentir(info: InfoJogador) {
    this.info = info;
  }

  /** As mesas ficaram vazias: começa a fome. */
  esfomear() {
    if (!this.ativa || this.faminta) return;
    this.cancelar();
    this.estado = 'atordoada';
    this.t = 0;
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'A mesa está vazia: ela tem fome. Golpeie agora!', som: 'rugido' });
  }

  ferir(dano: number, de: THREE.Vector3, tipo: 'golpe' | 'luz' = 'golpe'): ResultadoGolpe {
    if (!this.ativa) return 'nada';
    if (!this.faminta) {
      this.flash = 0.12;
      this.corFlash.setRGB(0.9, 0.75, 0.3);
      return 'bloqueado';
    }
    const antes = this.estado;
    const r = super.ferir(dano, de, tipo);
    this.empurrao.multiplyScalar(0.25); // pesada demais para voar longe
    if (r === 'ferido') this.estado = antes; // continua faminta até o banquete voltar
    if (r === 'morreu') this.cancelar();
    return r;
  }

  atualizar(dt: number, fis: Fisica, jogador: THREE.Vector3) {
    this.fis = fis;
    super.atualizar(dt, fis, jogador);
    if (this.ativa && this.flash <= 0) {
      if (this.faminta) this.material.emissive.setRGB(0.18, 0.2, 0.32 + Math.sin(this.t * 6) * 0.06);
      else this.material.emissive.setRGB(0.14, 0.08, 0.02); // o brilho do ouro do banquete
    }
    this.matOlhos.color.setHex(this.faminta ? 0xffffff : this.fase2 ? 0xff7a3a : OLHOS);
    this.atualizarEfeitos(dt);
  }

  protected alturaExtra() {
    return this.salto;
  }

  protected posar(paraJogador: THREE.Vector3) {
    super.posar(paraJogador);
    if (!this.ativa) return;
    // faminta: afunda, de cabeça baixa; aspirando: incha o peito
    if (this.faminta) {
      this.corpo.scale.set(1.08, 0.86, 1.08);
      this.corpo.rotation.x = 0.18;
    } else {
      this.corpo.rotation.x = 0;
      if (this.ataque?.tipo === 'devorar' && !this.ataque.mordeu) {
        const k = Math.min(1, this.ataque.t / AJUSTES.chefoes.gula.duracaoAspirar);
        this.corpo.scale.set(1 + k * 0.12, 1 + k * 0.05, 1 + k * 0.12);
      }
    }
  }

  protected decidir(dt: number, paraJogador: THREE.Vector3, dist: number, jogador: THREE.Vector3) {
    if (this.estado === 'desfazendo' || this.estado === 'vencida' || this.adormecida) {
      this.alerta = '';
      this.salto = 0;
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.faminta) {
      this.alerta = 'Faminta: golpeie agora, antes que o banquete volte!';
      this.salto = 0;
      return super.decidir(dt, paraJogador, dist, jogador);
    }
    if (this.fase2 && !this.enfurecido) {
      this.enfurecido = true;
      this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: 'Mais! Tragam mais!', som: 'rugido', sussurro: 'Ainda estou com fome. Sempre estou com fome.' });
    }
    if (!this.ataque) {
      this.alerta = this.saciada ? 'Fartura: derrube as travessas das mesas (luz ou cajado)' : 'Faminta!';
      this.espera -= dt;
      if (this.espera <= 0 && (this.estado === 'perseguir' || this.estado === 'vagar' || this.estado === 'recuar')) this.escolher(dist);
      if (this.estado === 'vagar') this.estado = 'perseguir';
      // anda devagar atrás do peregrino; não investe como as sombras comuns
      const v = paraJogador.clone().multiplyScalar(dist > 5 ? (this.fase2 ? 1.9 : 1.5) : dist < 3.5 ? -0.8 : 0);
      this.estado = 'perseguir';
      return v;
    }
    return this.executar(dt, paraJogador, dist);
  }

  private escolher(dist: number) {
    const opcoes = dist > 7 ? ['iguarias', 'iguarias', 'devorar', 'devorar', 'barrigada'] : ['barrigada', 'barrigada', 'iguarias', 'devorar'];
    if (this.fase2) opcoes.push('iguarias', 'barrigada');
    const validas = opcoes.filter((o) => o !== this.ultimo);
    const tipo = validas[Math.floor(Math.random() * validas.length)];
    this.ultimo = tipo;
    this.t = 0;
    if (tipo === 'iguarias') {
      this.ataque = { tipo, t: 0, levas: [{ pontos: this.pontosDePrato(), inicio: 0, caiu: false }] };
      this.avisar('iguarias', 'Chuva de iguarias: não fique nas marcas, elas pesam!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'moedas', sussurro: this.avisados.size > 2 ? frase() : undefined });
    } else if (tipo === 'devorar') {
      this.ataque = { tipo, t: 0, mordeu: false };
      this.avisar('devorar', 'Ela vai devorar: corra para o lado, para longe da boca!');
      this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
    } else {
      this.ataque = { tipo: 'barrigada', t: 0, r: 0, caiu: false, acertou: false };
      this.avisar('barrigada', 'Barrigada: pule (Espaço) a onda de vinho!');
    }
  }

  private pontosDePrato() {
    const centro = this.info.pos.clone();
    const pontos: THREE.Vector3[] = [centro.clone()];
    const total = this.fase2 ? 8 : 6;
    for (let i = 0; pontos.length < total && i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * 5;
      const p = centro.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      if (this.fis && Math.abs(this.fis.altura(p.x, p.z) - this.fis.altura(centro.x, centro.z)) < 0.5 && pontos.every((q) => q.distanceTo(p) > 2))
        pontos.push(p);
    }
    return pontos;
  }

  private cansar(duracao: number) {
    this.ataque = { tipo: 'cansado', t: 0, duracao };
    this.espera = this.fase2 ? 1.2 : 2;
  }

  derrotar(): ResultadoGolpe {
    const r = super.derrotar();
    if (r === 'morreu') this.cancelar();
    return r;
  }

  private cancelar() {
    this.ataque = null;
    this.perigosa = false;
    this.salto = 0;
    this.espera = 1.6;
  }

  private executar(dt: number, paraJogador: THREE.Vector3, dist: number): THREE.Vector3 {
    const a = this.ataque!;
    a.t += dt;
    const vel = new THREE.Vector3();
    const rapido = this.fase2 ? 1.2 : 1;
    switch (a.tipo) {
      case 'iguarias':
        this.estado = 'preparar';
        this.alerta = 'Chuva de iguarias: saia das marcas!';
        if (this.fase2 && a.levas.length === 1 && a.t > 1) {
          a.levas.push({ pontos: this.pontosDePrato(), inicio: a.t, caiu: false });
          this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'moedas' });
        }
        for (const l of a.levas)
          if (!l.caiu && a.t - l.inicio > AJUSTES.chefoes.gula.esperaPrato) {
            l.caiu = true;
            this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'raio' });
            if (!this.info.invulneravel && !this.info.esquivando)
              for (const p of l.pontos)
                if (Math.hypot(p.x - this.info.pos.x, p.z - this.info.pos.z) < 1.25) {
                  this.impactos.push({ dano: 0, de: p.clone(), peso: 1, sussurro: frase() });
                  break;
                }
          }
        if (a.levas.every((l) => l.caiu) && a.t - a.levas[a.levas.length - 1].inicio > AJUSTES.chefoes.gula.esperaPrato + 0.6) this.cansar(0.9);
        break;

      case 'devorar': {
        this.estado = 'preparar';
        this.alerta = 'Devorar: corra para o lado!';
        if (!a.mordeu) {
          // aspira: puxa quem estiver à frente dela, mais forte quanto mais o peregrino pesa
          const para = this.pos.clone().sub(this.info.pos).setY(0);
          const d = para.length();
          const frente = new THREE.Vector3(Math.sin(this.raiz.rotation.y), 0, Math.cos(this.raiz.rotation.y));
          const naBoca = d > 0.01 && para.clone().normalize().negate().dot(frente) > 0.45;
          if (a.t > 0.5 && d < 16 && naBoca && !this.info.invulneravel) {
            const forca = (2.1 + (this.info.peso ?? 0) * 0.7) * rapido * Math.min(1, (a.t - 0.5) * 2);
            this.impactos.push({ dano: 0, de: this.pos.clone(), arrasto: para.normalize().multiplyScalar(forca * dt) });
          }
          if (a.t > AJUSTES.chefoes.gula.duracaoAspirar) {
            a.mordeu = true;
            this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'corrente' });
            if (d < 1.4 * this.escala && !this.info.invulneravel && !this.info.esquivando)
              this.impactos.push({ dano: 1, de: this.pos.clone(), sussurro: 'Que gosto bom você tem.' });
          }
        } else if (a.t > AJUSTES.chefoes.gula.duracaoAspirar + 0.8) this.cansar(1.1);
        vel.copy(paraJogador).multiplyScalar(dist > 3 ? 0.3 : 0);
        break;
      }

      case 'barrigada':
        this.estado = 'preparar';
        this.alerta = 'Barrigada: pule a onda de vinho!';
        if (!a.caiu) {
          // sobe pesada e cai de barriga
          const k = a.t / (0.9 / rapido);
          this.salto = Math.max(0, Math.sin(Math.min(1, k) * Math.PI) * 2.6);
          vel.copy(paraJogador).multiplyScalar(Math.min(dist, 6) * 0.9);
          if (k >= 1) {
            a.caiu = true;
            this.salto = 0;
            this.impactos.push({ dano: 0, de: this.pos.clone(), som: 'onda' });
            if (dist < this.raioContato + 0.6 && !this.info.invulneravel) this.impactos.push({ dano: 1, de: this.pos.clone() });
          }
        } else {
          a.r += dt * AJUSTES.chefoes.gula.velOnda * rapido;
          if (!a.acertou && !this.info.invulneravel && this.info.noChao) {
            const d = Math.hypot(this.info.pos.x - this.pos.x, this.info.pos.z - this.pos.z);
            if (Math.abs(d - a.r) < 0.6) {
              a.acertou = true;
              this.impactos.push({ dano: 0.5, de: this.pos.clone() });
            }
          }
          if (a.r > AJUSTES.chefoes.gula.raioMaxOnda) this.cansar(0.8);
        }
        break;

      case 'cansado':
        this.estado = 'perseguir';
        if (a.t > a.duracao) this.ataque = null;
        break;
    }
    return vel;
  }

  private avisar(chave: string, texto: string) {
    if (this.avisados.has(chave)) return;
    this.avisados.add(chave);
    this.impactos.push({ dano: 0, de: this.pos.clone(), aviso: texto });
  }

  private atualizarEfeitos(dt: number) {
    const a = this.ataque;
    const chao = (p: THREE.Vector3) => (this.fis ? this.fis.altura(p.x, p.z) : p.y);
    // chuva de iguarias: marcas no chão e os pratos caindo do alto
    let k = 0;
    if (a?.tipo === 'iguarias')
      for (const l of a.levas) {
        const t = a.t - l.inicio;
        for (const p of l.pontos) {
          if (k >= this.marcas.length) break;
          const marca = this.marcas[k], prato = this.pratos[k];
          k++;
          const y = chao(p);
          const c = Math.min(1, t / AJUSTES.chefoes.gula.esperaPrato);
          marca.visible = true;
          marca.position.set(p.x, y + 0.04, p.z);
          marca.scale.setScalar(0.5 + c * 0.5);
          (marca.material as THREE.MeshBasicMaterial).opacity = l.caiu ? Math.max(0, 0.6 - (t - AJUSTES.chefoes.gula.esperaPrato) * 1.2) : 0.12 + c * 0.4 + Math.sin(t * 18) * 0.07 * c;
          // o prato cai nos últimos 0,45 s e fica um instante no chão
          const q = t - (AJUSTES.chefoes.gula.esperaPrato - 0.45);
          prato.visible = q > 0 && t < AJUSTES.chefoes.gula.esperaPrato + 0.5;
          prato.position.set(p.x, y + Math.max(0, (1 - q / 0.45)) * 9, p.z);
          prato.rotation.y = p.x * 3.1;
        }
      }
    for (; k < this.marcas.length; k++) this.marcas[k].visible = this.pratos[k].visible = false;

    // a onda de vinho da barrigada
    const on = a?.tipo === 'barrigada' && a.caiu && a.r > 0 ? a : null;
    this.onda.visible = !!on;
    if (on) {
      this.onda.position.set(this.pos.x, chao(this.pos) + 0.05, this.pos.z);
      this.onda.scale.setScalar(Math.max(0.1, on.r));
      (this.onda.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.max(0, 1 - on.r / AJUSTES.chefoes.gula.raioMaxOnda);
    }

    // migalhas voando para a boca enquanto ela aspira
    const asp = a?.tipo === 'devorar' && !a.mordeu && a.t > 0.4 ? a : null;
    const boca = this.pos.clone().add(new THREE.Vector3(Math.sin(this.raiz.rotation.y) * 0.9, 1.95 * this.escala * 0.95, Math.cos(this.raiz.rotation.y) * 0.9));
    const frente = new THREE.Vector3(Math.sin(this.raiz.rotation.y), 0, Math.cos(this.raiz.rotation.y));
    this.migalhas.forEach((b, i) => {
      b.visible = !!asp;
      if (!asp) return;
      const fase = (asp.t * 0.9 + i * 0.137) % 1; // 0 = longe, 1 = na boca
      const lado = Math.sin(i * 12.9) * 3.2 * (1 - fase);
      const dist = (1 - fase) * 9;
      b.position.copy(boca).addScaledVector(frente, dist).add(new THREE.Vector3(frente.z * lado, -1.4 * (1 - fase) + Math.sin(i * 4.1) * 0.6 * (1 - fase), -frente.x * lado));
      b.rotation.set(asp.t * 6 + i, asp.t * 4, 0);
      b.scale.setScalar(0.6 + fase * 0.6);
    });
    void dt;
  }

  /** Remove o chefão e seus efeitos da cena (luta reiniciada). */
  descartar() {
    this.efeitos.parent?.remove(this.efeitos);
    this.raiz.parent?.remove(this.raiz);
  }
}

/** O prato que cai do alto na chuva de iguarias: travessa de ouro com um assado e uvas. */
function pratoQueCai() {
  const m = new Modelo();
  const ouro = (x: number, y: number, z: number) => variar((x + z) & 1 ? 0xe0b84a : 0xc89a34, x, y, z, 0.03);
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= 18) m.ponto(x, 0, z, ouro(x, 0, z));
  m.caixa(-2, 1, -2, 4, 2, 3, 0xa8602a).caixa(-1, 3, -1, 2, 1, 2, 0xc07a3a);
  m.ponto(2, 1, 2, 0x6a2a8a).ponto(3, 1, 1, 0x5a2478).ponto(-3, 1, 1, 0xe0c060);
  return m.geometria(0.12, [0, 0, 0]);
}

const FRASES = [
  'Só mais um pouco. Você merece.',
  'Por que repartir, se dá para guardar?',
  'Coma agora. Amanhã você jejua.',
  'Ninguém está vendo.',
  'O que é seu é seu.',
  'Cheio, você não sente nada. Não é bom?',
];
function frase() {
  return FRASES[Math.floor(Math.random() * FRASES.length)];
}
