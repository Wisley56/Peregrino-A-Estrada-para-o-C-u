#!/usr/bin/env node
/**
 * Importa animais do Veloren (GPL-3.0) para o Peregrino.
 *
 *   npm run fauna
 *
 * Para cada espécie do CATÁLOGO abaixo:
 *  1. lê os manifestos do Veloren (`*_central_manifest.ron`, `*_lateral_manifest.ron`): qual .vox é cada osso
 *     e o deslocamento de cada peça;
 *  2. lê os atributos de esqueleto de `voxygen/anim/src/<corpo>/mod.rs` (posição dos ossos, escala, ritmo);
 *  3. baixa os .vox para `public/assets/veloren/fauna/<id>/`;
 *  4. grava tudo em `src/fauna/especies.gerado.json`, que o jogo lê.
 *
 * Os arquivos do Veloren são copiados sem alteração. Para trocar de versão do Veloren, mude REVISAO e rode de novo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REVISAO = 'master';
const RAIZ = `https://raw.githubusercontent.com/veloren/veloren/${REVISAO}`;
const PROJETO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO_VOX = path.join(PROJETO, 'public/assets/veloren/fauna');
const DESTINO_DADOS = path.join(PROJETO, 'src/fauna/especies.gerado.json');

/** id no jogo → [espécie no Veloren, tipo de corpo]. */
const CATALOGO = {
  // quadrúpedes pequenos
  ovelha: ['Sheep', 'quadruped_small'],
  cabra: ['Goat', 'quadruped_small'],
  coelho: ['Rabbit', 'quadruped_small'],
  lebre: ['Hare', 'quadruped_small'],
  esquilo: ['Squirrel', 'quadruped_small'],
  raposa: ['Fox', 'quadruped_small'],
  rato: ['Rat', 'quadruped_small'],
  sapo: ['Frog', 'quadruped_small'],
  lagartixa: ['Gecko', 'quadruped_small'],
  tartaruga: ['Turtle', 'quadruped_small'],
  hiena: ['Hyena', 'quadruped_small'],
  cao: ['Dog', 'quadruped_small'],
  gato: ['Cat', 'quadruped_small'],
  porco: ['Pig', 'quadruped_small'],
  // quadrúpedes médios
  cervo: ['Deer', 'quadruped_medium'],
  camelo: ['Camel', 'quadruped_medium'],
  antilope: ['Antelope', 'quadruped_medium'],
  jumento: ['Donkey', 'quadruped_medium'],
  cavalo: ['Horse', 'quadruped_medium'],
  boi: ['Cattle', 'quadruped_medium'],
  lobo: ['Wolf', 'quadruped_medium'],
  // aves
  galinha: ['Chicken', 'bird_medium'],
  pato: ['Duck', 'bird_medium'],
  ganso: ['Goose', 'bird_medium'],
  corvo: ['Crow', 'bird_medium'],
  aguia: ['Eagle', 'bird_medium'],
  coruja: ['HornedOwl', 'bird_medium'],
  pavao: ['Peacock', 'bird_medium'],
  morcego: ['Bat', 'bird_medium'],
};

/** Peças que o Veloren carrega espelhadas (o lado esquerdo é o direito invertido). */
const ESPELHADAS = new Set(['foot_fl', 'foot_bl', 'leg_fl', 'leg_bl', 'wing_in_l', 'wing_out_l', 'leg_l']);
/** No quadrúpede pequeno, o manifesto chama as patas de left_front etc.; o esqueleto chama de leg_fl. */
const NOMES_QS = { left_front: 'foot_fl', right_front: 'foot_fr', left_back: 'foot_bl', right_back: 'foot_br' };

const cacheTexto = new Map();
async function baixarTexto(caminho) {
  if (!cacheTexto.has(caminho)) {
    const r = await fetch(`${RAIZ}/${caminho}`);
    if (!r.ok) throw new Error(`${r.status} ao baixar ${caminho}`);
    cacheTexto.set(caminho, await r.text());
  }
  return cacheTexto.get(caminho);
}

/** Bloco `(Especie, Male): ( ... )` de um manifesto .ron. */
function blocoDoManifesto(ron, especie) {
  const ini = ron.search(new RegExp(`\\(${especie}, Male\\)\\s*:\\s*\\(`));
  if (ini < 0) throw new Error(`${especie} não está no manifesto`);
  let nivel = 0;
  for (let i = ron.indexOf('(', ron.indexOf(':', ini)); i < ron.length; i++) {
    if (ron[i] === '(') nivel++;
    else if (ron[i] === ')' && --nivel === 0) return ron.slice(ini, i + 1);
  }
  throw new Error(`bloco de ${especie} sem fim`);
}

function pecasDoManifesto(ron, especie) {
  const bloco = blocoDoManifesto(ron, especie);
  const re = /(\w+):\s*\(\s*offset:\s*\(([^)]*)\),\s*(?:central|lateral):\s*\("([^"]+)"/g;
  const pecas = {};
  for (const m of bloco.matchAll(re)) {
    pecas[m[1]] = { desloc: m[2].split(',').map((n) => Number(n.trim())), especificador: m[3] };
  }
  return pecas;
}

/** Converte um valor Rust simples (número, bool, tupla) em JSON. */
function valorRust(txt) {
  return JSON.parse(txt.trim().replace(/\(/g, '[').replace(/\)/g, ']').replace(/(\d)\.(?!\d)/g, '$1.0'));
}

/** Atributos do esqueleto (`SkeletonAttr::from`) de uma espécie. */
function atributos(rs, especie) {
  const campos = [...rs.matchAll(/^\s{12}(\w+): match \(body\.species, body\.body_type\) \{([\s\S]*?)^\s{12}\},/gm)];
  const saida = {};
  for (const [, campo, corpo] of campos) {
    let valor;
    for (const linha of corpo.split('\n')) {
      const m = linha.match(/^\s*(.+?)\s*=>\s*(.+?),?\s*$/);
      if (!m) continue;
      const casa = m[1]
        .split('|')
        .map((s) => s.trim())
        .some((p) => p === '_' || p === `(${especie}, _)` || p === `(${especie}, Male)`);
      if (casa && valor === undefined) valor = valorRust(m[2]);
    }
    if (valor !== undefined) saida[campo] = valor;
  }
  return saida;
}

async function main() {
  const dados = {};
  for (const [id, [especie, corpo]] of Object.entries(CATALOGO)) {
    const central = pecasDoManifesto(await baixarTexto(`assets/voxygen/voxel/${corpo}_central_manifest.ron`), especie);
    const lateral = pecasDoManifesto(await baixarTexto(`assets/voxygen/voxel/${corpo}_lateral_manifest.ron`), especie);
    const attr = atributos(await baixarTexto(`voxygen/anim/src/${corpo}/mod.rs`), especie);
    const pasta = path.join(DESTINO_VOX, id);
    fs.mkdirSync(pasta, { recursive: true });
    const pecas = {};
    for (const [nomeManifesto, p] of Object.entries({ ...central, ...lateral })) {
      const osso = corpo === 'quadruped_small' ? (NOMES_QS[nomeManifesto] ?? nomeManifesto) : nomeManifesto;
      const arquivo = p.especificador.split('.').slice(1).join('_') + '.vox'; // npc.wolf.male.head → wolf_male_head.vox
      const destino = path.join(pasta, arquivo);
      if (!fs.existsSync(destino)) {
        const caminho = `assets/voxygen/voxel/${p.especificador.replace(/\./g, '/')}.vox`;
        const r = await fetch(`${RAIZ}/${caminho}`);
        if (!r.ok) throw new Error(`${r.status} ao baixar ${caminho}`);
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      }
      pecas[osso] = { arquivo: `${id}/${arquivo}`, desloc: p.desloc, espelhar: ESPELHADAS.has(osso) };
    }
    dados[id] = { veloren: especie, corpo, pecas, attr };
    console.log(`✓ ${id.padEnd(10)} ${especie} (${corpo}): ${Object.keys(pecas).length} peças`);
  }
  fs.mkdirSync(path.dirname(DESTINO_DADOS), { recursive: true });
  fs.writeFileSync(DESTINO_DADOS, JSON.stringify({ revisao: REVISAO, especies: dados }, null, 1) + '\n');
  console.log(`\n${Object.keys(dados).length} espécies → ${path.relative(PROJETO, DESTINO_DADOS)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
