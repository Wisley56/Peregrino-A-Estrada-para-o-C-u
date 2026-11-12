/**
 * Vitrais da interface, desenhados por código em SVG (sem arquivos de imagem), seguindo o Guia de arte:
 * moldura de vidro em cores de joia (safira, rubi, esmeralda, âmbar, violeta) presa por linhas de chumbo,
 * rubi lapidado no alto, quadrados de canto com cruz dourada e interior de pergaminho. O medalhão do alto
 * traz a pomba do Espírito Santo num círculo de safira.
 */

const CHUMBO = '#17100b';
const OURO = '#e2bd5c';
const JOIAS = ['#2156b5', '#a8202f', '#1f7d4b', '#d49a26', '#5a2f8f'];

/** Sorteio repetível, para o vitral sair sempre igual. */
function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Clareia (k > 0) ou escurece (k < 0) uma cor #rrggbb. */
function tom(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

const pt = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const poligono = (pts: number[][], fill: string, extra = '') =>
  `<polygon points="${pts.map(pt).join(' ')}" fill="${fill}" ${extra}/>`;

/** Filtros: brilho irregular do vidro (luz atravessando) e manchas do pergaminho. */
function filtros(id: string) {
  return `<defs>
    <filter id="${id}-vidro" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.92  0.85 0 0 0 -0.32" result="luz"/>
      <feComposite in="luz" in2="SourceGraphic" operator="in" result="l2"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="l2"/></feMerge>
    </filter>
    <filter id="${id}-papel" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.27  0 0 0 0 0.1  1.1 0 0 0 -0.48" result="m"/>
      <feComposite in="m" in2="SourceGraphic" operator="in" result="m2"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0 0.1  0.35 0 0 0 -0.1" result="grao"/>
      <feComposite in="grao" in2="SourceGraphic" operator="in" result="g2"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m2"/><feMergeNode in="g2"/></feMerge>
    </filter>
    <radialGradient id="${id}-perg" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#f6ead0"/><stop offset="0.65" stop-color="#ead8b0"/><stop offset="1" stop-color="#cdb07a"/>
    </radialGradient>
    <filter id="${id}-borrar" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
    <linearGradient id="${id}-pedra" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9ad98"/><stop offset="0.5" stop-color="#857864"/><stop offset="1" stop-color="#574b3c"/>
    </linearGradient>
    <linearGradient id="${id}-ouro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff1b5"/><stop offset="0.45" stop-color="#e2bd5c"/><stop offset="1" stop-color="#94681e"/>
    </linearGradient>
    <linearGradient id="${id}-timpano" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f8fe8"/><stop offset="1" stop-color="#173f8f"/>
    </linearGradient>
    <radialGradient id="${id}-safira" cx="50%" cy="38%" r="62%">
      <stop offset="0" stop-color="#5d8fe6"/><stop offset="0.6" stop-color="#2156b5"/><stop offset="1" stop-color="#122f72"/>
    </radialGradient>
  </defs>`;
}

/** Joia lapidada: mesa central clara, oito facetas em dois tons e um reflexo. */
function gema(cx: number, cy: number, r: number, cor: string) {
  const oct = (rr: number, rot = Math.PI / 8) =>
    Array.from({ length: 8 }, (_, i) => [cx + rr * Math.cos(rot + (i * Math.PI) / 4), cy + rr * Math.sin(rot + (i * Math.PI) / 4)]);
  const fora = oct(r), mesa = oct(r * 0.5);
  let s = poligono(fora, tom(cor, -0.35), `stroke="${CHUMBO}" stroke-width="${Math.max(1.5, r * 0.18)}" stroke-linejoin="round"`);
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    s += poligono([fora[i], fora[j], mesa[j], mesa[i]], tom(cor, i % 2 ? -0.15 : i < 4 ? 0.12 : -0.02));
  }
  s += poligono(mesa, tom(cor, 0.3));
  s += `<ellipse cx="${cx - r * 0.25}" cy="${cy - r * 0.28}" rx="${r * 0.2}" ry="${r * 0.11}" fill="#fff" opacity="0.75" transform="rotate(-30 ${cx - r * 0.25} ${cy - r * 0.28})"/>`;
  // garras douradas
  for (const a of [0.25, 0.75, 1.25, 1.75]) {
    const x = cx + r * 1.02 * Math.cos(a * Math.PI), y = cy + r * 1.02 * Math.sin(a * Math.PI);
    s += `<circle cx="${x}" cy="${y}" r="${r * 0.14}" fill="${OURO}" stroke="${CHUMBO}" stroke-width="1"/>`;
  }
  return s;
}

/** Quadrado de canto: vidro de safira com cruz dourada. */
function quadradoCruz(x: number, y: number, t: number) {
  const m = t / 2, a = t * 0.13, l = t * 0.36;
  return `<rect x="${x}" y="${y}" width="${t}" height="${t}" fill="#1d4ca3" stroke="${CHUMBO}" stroke-width="3"/>
    <path d="M${x + m - a} ${y + m - l}h${2 * a}v${l - a}h${l - a}v${2 * a}h${-(l - a)}v${l + a * 0.6}h${-2 * a}v${-(l + a * 0.6)}h${-(l - a)}v${-2 * a}h${l - a}z"
      fill="${OURO}" stroke="${CHUMBO}" stroke-width="1.4" stroke-linejoin="round"/>`;
}

/** A pomba do Espírito Santo, de asas abertas, descendo (num quadro 100×100). */
const POMBA = `
  <g stroke="${CHUMBO}" stroke-width="1.6" stroke-linejoin="round" fill="#f7f2e6">
    <path d="M47 46 C38 33 22 25 5 26 L13 31 L6 35 L17 38 L10 43 L22 44 L17 49 L31 48 C38 48 43 49 47 52 Z"/>
    <path d="M53 46 C62 33 78 25 95 26 L87 31 L94 35 L83 38 L90 43 L78 44 L83 49 L69 48 C62 48 57 49 53 52 Z"/>
    <path d="M43 64 L50 84 L57 64 Z"/>
    <ellipse cx="50" cy="53" rx="8" ry="14"/>
    <circle cx="50" cy="36" r="6.5"/>
  </g>
  <path d="M47.6 30.5 L50 25.5 L52.4 30.5 Z" fill="${OURO}" stroke="${CHUMBO}" stroke-width="1"/>
  <g stroke="#b9ad96" stroke-width="1" fill="none"><path d="M50 70 L50 82"/><path d="M47 68 L46 78"/><path d="M53 68 L54 78"/>
  <path d="M20 35 L40 42"/><path d="M80 35 L60 42"/></g>`;

/** Medalhão redondo: anel de vidro em rubi e âmbar, safira no centro, raios dourados e a pomba. */
function medalhao(cx: number, cy: number, R: number, id: string) {
  const rnd = sorteio(5);
  let s = '';
  const n = 16, ri = R * 0.78;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    s += poligono([p(R, a0), p(R, a1), p(ri, a1), p(ri, a0)], tom(i % 2 ? '#a8202f' : '#d49a26', (rnd() - 0.5) * 0.25));
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="url(#${id}-safira)"/>`;
  // raios de luz atrás da pomba
  let raios = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    raios += `<path d="M${cx} ${cy} L${cx + ri * Math.cos(a - 0.09)} ${cy + ri * Math.sin(a - 0.09)} L${cx + ri * Math.cos(a + 0.09)} ${cy + ri * Math.sin(a + 0.09)} Z"/>`;
  }
  s += `<g fill="#f7dd8a" opacity="0.32">${raios}</g>`;
  s = `<g filter="url(#${id}-vidro)">${s}</g>`;
  // chumbo do anel
  let chumbo = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${CHUMBO}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${CHUMBO}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${ri - 3}" fill="none" stroke="${OURO}" stroke-width="1.2" opacity="0.8"/>`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    chumbo += `<line x1="${cx + ri * Math.cos(a)}" y1="${cy + ri * Math.sin(a)}" x2="${cx + R * Math.cos(a)}" y2="${cy + R * Math.sin(a)}" stroke="${CHUMBO}" stroke-width="2.6"/>`;
  }
  const k = (ri * 1.85) / 100;
  return `${s}${chumbo}<g transform="translate(${cx - 50 * k} ${cy - 52 * k}) scale(${k})">${POMBA}</g>`;
}

export interface GeometriaArco {
  /** Altura até a base do medalhão: o conteúdo começa abaixo disso. */
  topo: number;
  /** Espessura da moldura (vidro + pedra): o conteúdo fica para dentro dela. */
  borda: number;
}

function medidas(w: number) {
  const b = Math.round(Math.min(26, Math.max(18, w * 0.058)));
  const r = w * 0.62; // raio dos arcos do arco ogival
  const subida = Math.sqrt(r * r - (r - w / 2) ** 2);
  const s = subida + 10; // linha de nascença (onde o arco encontra os lados retos)
  const m = Math.round(b * 0.42); // moldura de pedra entre o vidro e o pergaminho
  const o = b + m;
  const subidaIn = Math.sqrt((r - o) ** 2 - (r - w / 2) ** 2);
  const apiceIn = s - subidaIn;
  const R = Math.min(w * 0.165, 72);
  const cy = apiceIn + R + w * 0.05 + 8;
  return { b, m, o, r, s, R, cy, topo: cy + R + 16 };
}

/** Placa de pedra (octógono alongado) com cruz dourada, por cima da moldura. */
function placa(cx: number, cy: number, t: number, id: string) {
  const a = t * 0.34, l = t * 0.56, v = t * 0.3, u = t * 0.64;
  const pts = [[cx - a, cy - u], [cx + a, cy - u], [cx + l, cy - v], [cx + l, cy + v], [cx + a, cy + u], [cx - a, cy + u], [cx - l, cy + v], [cx - l, cy - v]];
  const k = 0.8;
  const dentro = pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  const c = t * 0.11, h = t * 0.42, bx = t * 0.3;
  return poligono(pts, `url(#${id}-pedra)`, `stroke="${CHUMBO}" stroke-width="2.5" stroke-linejoin="round"`) +
    poligono(dentro, '#6e6150', `stroke="#c9bca4" stroke-width="1" stroke-opacity="0.6"`) +
    `<path d="M${cx - c} ${cy - h}h${2 * c}v${h - c - h * 0.2}h${bx}v${2 * c}h${-bx}v${h + h * 0.2 - c}h${-2 * c}v${-(h + h * 0.2 - c)}h${-bx}v${-2 * c}h${bx}z"
      fill="url(#${id}-ouro)" stroke="${CHUMBO}" stroke-width="1.3" stroke-linejoin="round"/>`;
}

/** Arabesco dourado (num quadro 100×60), com contorno escuro por baixo. */
const ARABESCO = [
  'M100 32 C82 34 74 8 50 9 C24 10 16 38 32 45 C44 50 52 36 44 28 C37 22 29 30 34 36',
  'M72 20 C74 9 88 4 96 12',
  'M86 36 C78 52 56 58 42 52',
  'M60 24 C62 30 70 32 74 27',
];
function arabesco(x: number, y: number, larg: number, alt: number, espelhar: boolean, id: string) {
  const sx = larg / 100, sy = alt / 60;
  const tr = espelhar ? `translate(${x + larg} ${y}) scale(${-sx} ${sy})` : `translate(${x} ${y}) scale(${sx} ${sy})`;
  const traco = (cor: string, lw: number) =>
    ARABESCO.map((d) => `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('');
  return `<g transform="${tr}">${traco(CHUMBO, 5.5)}${traco(`url(#${id}-ouro)`, 2.8)}
    <circle cx="96" cy="12" r="3" fill="${OURO}" stroke="${CHUMBO}" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`;
}

export function geometriaArco(w: number): GeometriaArco {
  const m = medidas(w);
  return { topo: m.topo, borda: m.o };
}

/** O vitral da tela inicial: arco ogival de largura w e altura h. */
export function arcoSVG(w: number, h: number, id = 'arco') {
  const { b, o, r, s, R, cy } = medidas(w);
  const rnd = sorteio(23);
  h = Math.max(h, s + b * 3);
  const cxE = r; // centro do arco da esquerda (fica à direita do meio, por isso o arco é ogival)

  // contorno com recuo `o`: lados retos, dois arcos que se encontram no ápice
  const contorno = (o: number) => {
    const rr = r - o;
    const dy = Math.sqrt(rr * rr - (r - w / 2) ** 2);
    return `M${o} ${h - o} L${o} ${s} A${rr} ${rr} 0 0 1 ${w / 2} ${s - dy} A${rr} ${rr} 0 0 1 ${w - o} ${s} L${w - o} ${h - o} Z`;
  };

  // vidros da metade esquerda; a direita é espelhada, como num vitral de verdade
  const meia: { pts: number[][]; cor: string }[] = [];
  const corDe = (i: number) => tom(JOIAS[(i * 3 + (rnd() < 0.3 ? 1 : 0)) % JOIAS.length], (rnd() - 0.5) * 0.3);
  let k = 0;
  // lado reto: da base (acima do quadrado de canto) até o quadrado da nascença
  const yBase = h - b, yTopo = s + b;
  const nLado = Math.max(1, Math.round((yBase - yTopo) / 46));
  for (let i = 0; i < nLado; i++) {
    const y0 = yBase - ((yBase - yTopo) * i) / nLado, y1 = yBase - ((yBase - yTopo) * (i + 1)) / nLado;
    meia.push({ pts: [[0, y0], [b, y0], [b, y1], [0, y1]], cor: corDe(k++) });
  }
  // arco: da nascença ao ápice, dividido em ângulos iguais por fora e por dentro
  const tFora = Math.acos((w / 2 - r) / r), tDentro = Math.acos((w / 2 - r) / (r - b));
  const nArco = Math.max(4, Math.round((r * (Math.PI - tFora)) / 44));
  const pArco = (rr: number, t: number) => [cxE + rr * Math.cos(t), s - rr * Math.sin(t)];
  for (let i = 0; i < nArco; i++) {
    const a0 = Math.PI - ((Math.PI - tFora) * i) / nArco, a1 = Math.PI - ((Math.PI - tFora) * (i + 1)) / nArco;
    const d0 = Math.PI - ((Math.PI - tDentro) * i) / nArco, d1 = Math.PI - ((Math.PI - tDentro) * (i + 1)) / nArco;
    meia.push({ pts: [pArco(r, a0), pArco(r, a1), pArco(r - b, d1), pArco(r - b, d0)], cor: corDe(k++) });
  }
  // base: do canto até o meio
  const nBase = Math.max(1, Math.round((w / 2 - b) / 48));
  const base: { pts: number[][]; cor: string }[] = [];
  for (let i = 0; i < nBase; i++) {
    const x0 = b + ((w / 2 - b) * i) / nBase, x1 = b + ((w / 2 - b) * (i + 1)) / nBase;
    base.push({ pts: [[x0, h - b], [x1, h - b], [x1, h], [x0, h]], cor: corDe(k++) });
  }
  const espelho = (p: number[][]) => p.map(([x, y]) => [w - x, y]);
  const vidros = [...meia, ...base].flatMap((v) => [v, { pts: espelho(v.pts), cor: v.cor }]);

  const linha = `stroke="${CHUMBO}" stroke-width="3" stroke-linejoin="round"`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${filtros(id)}`;
  // pergaminho, com a borda queimada e algumas rachaduras
  svg += `<clipPath id="${id}-cp"><path d="${contorno(o - 1)}"/></clipPath>`;
  svg += `<path d="${contorno(o - 1)}" fill="url(#${id}-perg)" filter="url(#${id}-papel)"/>`;
  svg += `<g clip-path="url(#${id}-cp)"><path d="${contorno(o - 2)}" fill="none" stroke="#6b4520" stroke-width="26" opacity="0.5" filter="url(#${id}-borrar)"/>`;
  const rnd2 = sorteio(77);
  for (let i = 0; i < 7; i++) {
    const lado = rnd2() < 0.5 ? o : w - o;
    let x = lado, y = cy + R + 30 + rnd2() * (h - cy - R - 60);
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let j = 0; j < 4; j++) {
      x += (lado === o ? 1 : -1) * (6 + rnd2() * 12);
      y += (rnd2() - 0.5) * 14;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    svg += `<path d="${d}" fill="none" stroke="#6b4a26" stroke-width="0.9" opacity="0.45"/>`;
  }
  svg += '</g>';

  // tímpano: vidro azul no alto do arco, com arabescos dourados dos dois lados do medalhão
  const yLado = cy + R * 0.18, yMeio = cy + R * 1.15;
  const rrO = r - o;
  const xL = r - Math.sqrt(rrO * rrO - (s - yLado) ** 2);
  const dyO = Math.sqrt(rrO * rrO - (r - w / 2) ** 2);
  const curva = `M${xL} ${yLado} Q${w / 2} ${2 * yMeio - yLado} ${w - xL} ${yLado}`;
  const timpano = `M${xL} ${yLado} A${rrO} ${rrO} 0 0 1 ${w / 2} ${s - dyO} A${rrO} ${rrO} 0 0 1 ${w - xL} ${yLado} Q${w / 2} ${2 * yMeio - yLado} ${xL} ${yLado} Z`;
  svg += `<clipPath id="${id}-tp"><path d="${timpano}"/></clipPath>`;
  let raiosT = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    raiosT += `<line x1="${w / 2}" y1="${cy}" x2="${w / 2 + w * Math.cos(a)}" y2="${cy + w * Math.sin(a)}"/>`;
  }
  svg += `<g clip-path="url(#${id}-tp)"><g filter="url(#${id}-vidro)"><path d="${timpano}" fill="url(#${id}-timpano)"/></g>
    <g stroke="${CHUMBO}" stroke-width="2.4">${raiosT}</g>
    <circle cx="${w / 2}" cy="${cy}" r="${R * 1.55}" fill="none" stroke="${CHUMBO}" stroke-width="2.4"/></g>`;
  const larA = w / 2 - R - 10 - (o + 4);
  svg += arabesco(o + 4, cy - R * 0.55, larA, R * 1.05, false, id) + arabesco(w / 2 + R + 10, cy - R * 0.55, larA, R * 1.05, true, id);
  // friso de pedra embaixo do tímpano
  svg += `<path d="${curva}" fill="none" stroke="${CHUMBO}" stroke-width="12" stroke-linecap="round"/>
    <path d="${curva}" fill="none" stroke="url(#${id}-pedra)" stroke-width="8" stroke-linecap="round"/>`;

  // vidro da moldura
  svg += `<g filter="url(#${id}-vidro)">${vidros.map((v) => poligono(v.pts, v.cor)).join('')}</g>`;
  svg += `<g fill="none" ${linha}>${vidros.map((v) => `<polygon points="${v.pts.map(pt).join(' ')}"/>`).join('')}</g>`;
  // moldura de pedra por dentro do vidro, com filete dourado
  svg += `<path d="${contorno(b)} ${contorno(o)}" fill="url(#${id}-pedra)" fill-rule="evenodd"/>`;
  svg += `<path d="${contorno(b + 2)}" fill="none" stroke="#d6cab2" stroke-width="1" opacity="0.6"/>`;
  svg += `<path d="${contorno(1.5)}" fill="none" stroke="${CHUMBO}" stroke-width="4"/>`;
  svg += `<path d="${contorno(b)}" fill="none" stroke="${CHUMBO}" stroke-width="3"/>`;
  svg += `<path d="${contorno(o)}" fill="none" stroke="${CHUMBO}" stroke-width="2.5"/>`;
  svg += `<path d="${contorno(o + 4)}" fill="none" stroke="#a5802f" stroke-width="1.5" opacity="0.8"/>`;

  // medalhão da pomba, num anel de pedra
  svg += `<circle cx="${w / 2}" cy="${cy}" r="${R + 8}" fill="url(#${id}-pedra)" stroke="${CHUMBO}" stroke-width="3"/>`;
  svg += `<circle cx="${w / 2}" cy="${cy}" r="${R + 4}" fill="none" stroke="#d6cab2" stroke-width="1" opacity="0.6"/>`;
  svg += medalhao(w / 2, cy, R, id);

  // placas com cruz: na nascença e nos cantos de baixo
  const t = b * 1.6;
  for (const [x, y] of [[b / 2, s + b / 2], [w - b / 2, s + b / 2], [b / 2, h - b / 2], [w - b / 2, h - b / 2]]) svg += placa(x, y, t, id);

  // rubi no ápice, num engaste dourado em losango, e dois menores ao lado
  const ap = pArco(r - b / 2, (tFora + tDentro) / 2);
  const ay = ap[1] + 3, e = b * 1.05;
  svg += arabesco(w / 2 - e * 2.6, ay - e * 0.5, e * 1.8, e * 1.0, false, id) + arabesco(w / 2 + e * 0.8, ay - e * 0.5, e * 1.8, e * 1.0, true, id);
  svg += poligono([[w / 2, ay - e], [w / 2 + e, ay], [w / 2, ay + e], [w / 2 - e, ay]], `url(#${id}-ouro)`, `stroke="${CHUMBO}" stroke-width="2.5" stroke-linejoin="round"`);
  svg += gema(w / 2, ay, b * 0.5, '#c0182f');
  const tl = tFora + (Math.PI - tFora) * 0.34, lado = pArco(r - b / 2, tl);
  for (const x of [lado[0], w - lado[0]]) {
    svg += `<circle cx="${x}" cy="${lado[1]}" r="${b * 0.5}" fill="url(#${id}-ouro)" stroke="${CHUMBO}" stroke-width="2"/>`;
    svg += gema(x, lado[1], b * 0.32, '#c0182f');
  }
  return svg + '</svg>';
}

/**
 * Moldura retangular para os painéis (border-image): quadrados com cruz nos cantos e vidros nas bordas.
 * Devolve a URL de dados e a espessura da borda.
 */
export function molduraPainel(b = 26) {
  const L = 240, meio = L - 2 * b;
  const rnd = sorteio(41);
  const n = 4, passo = meio / n;
  let vid = '';
  const borda = (pts: (i: number) => number[][]) => {
    for (let i = 0; i < n; i++) vid += poligono(pts(i), tom(JOIAS[(i * 2 + 1) % JOIAS.length], (rnd() - 0.5) * 0.28), `stroke="${CHUMBO}" stroke-width="3"`);
  };
  borda((i) => [[b + i * passo, 0], [b + (i + 1) * passo, 0], [b + (i + 1) * passo, b], [b + i * passo, b]]);
  borda((i) => [[b + i * passo, L - b], [b + (i + 1) * passo, L - b], [b + (i + 1) * passo, L], [b + i * passo, L]]);
  borda((i) => [[0, b + i * passo], [b, b + i * passo], [b, b + (i + 1) * passo], [0, b + (i + 1) * passo]]);
  borda((i) => [[L - b, b + i * passo], [L, b + i * passo], [L, b + (i + 1) * passo], [L - b, b + (i + 1) * passo]]);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}" width="${L}" height="${L}">${filtros('m')}`;
  svg += `<g filter="url(#m-vidro)">${vid}</g>`;
  svg += `<rect x="1.5" y="1.5" width="${L - 3}" height="${L - 3}" fill="none" stroke="${CHUMBO}" stroke-width="4"/>`;
  svg += `<rect x="${b}" y="${b}" width="${meio}" height="${meio}" fill="none" stroke="${CHUMBO}" stroke-width="3.5"/>`;
  for (const [x, y] of [[0, 0], [L - b, 0], [0, L - b], [L - b, L - b]]) svg += quadradoCruz(x, y, b);
  svg += '</svg>';
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, borda: b };
}

/** O rubi lapidado sozinho (para o alto dos painéis). */
export function rubiSVG(r = 15) {
  const t = r * 2 + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${t}" height="${t}">${gema(t / 2, t / 2, r, '#c0182f')}</svg>`;
}

/** A pomba no medalhão, sozinha (para o começo dos créditos). */
export function medalhaoSVG(R = 46) {
  const t = R * 2 + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${t}" height="${t}">${filtros('md')}${medalhao(t / 2, t / 2, R, 'md')}</svg>`;
}

/** Ponteira dourada dos botões (arabesco em volta da gema), como URL de dados; `direita` espelha. */
export function ornatoBotao(direita = false) {
  const g = direita ? 'transform="translate(40 0) scale(-1 1)"' : '';
  const d = 'M30 5 C18 5 12 10 12 20 C12 30 18 35 30 35 M22 9 C16 12 16 17 20 17 M22 31 C16 28 16 23 20 23';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b5"/><stop offset="0.5" stop-color="#e2bd5c"/><stop offset="1" stop-color="#94681e"/></linearGradient></defs>
    <g ${g}><path d="${d}" fill="none" stroke="${CHUMBO}" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="url(#o)" stroke-width="2.6" stroke-linecap="round"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
