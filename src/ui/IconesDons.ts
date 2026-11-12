import type { IdDom } from '../core/Dons';

/**
 * Ícones dos sete dons, desenhados por código numa caixa 0..100 (centro 50,50), no estilo de vitral:
 * traço claro de "chumbo dourado" sobre o vidro colorido. Cada um vem da iconografia do dom.
 */
const T = 'fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

export const ICONES: Record<IdDom, string> = {
  // Sabedoria: o olho da Providência, "ver como Deus vê"
  sabedoria: `
    <path ${T} d="M50 16 L86 78 L14 78 Z"/>
    <path ${T} d="M30 60 Q50 42 70 60 Q50 74 30 60 Z"/>
    <circle ${F} cx="50" cy="59.5" r="6"/>
    <path ${T} stroke-width="4" d="M50 4 V9 M24 14 L28 19 M76 14 L72 19 M8 36 L14 38 M92 36 L86 38"/>`,
  // Entendimento: a chave que abre as portas antigas
  entendimento: `
    <circle ${T} cx="32" cy="32" r="15"/>
    <circle ${F} cx="32" cy="32" r="4.5"/>
    <path ${T} d="M43 43 L84 84 M66 66 L76 56 M76 76 L86 66"/>`,
  // Conselho: a rosa dos ventos, que orienta o caminho (São Paulo no mar)
  conselho: `
    <circle ${T} stroke-width="4" cx="50" cy="50" r="27"/>
    <path ${T} d="M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z"/>
    <path ${F} d="M50 8 L58 42 L50 50 Z M92 50 L58 58 L50 50 Z M50 92 L42 58 L50 50 Z M8 50 L42 42 L50 50 Z"/>`,
  // Fortaleza: o escudo da fé com a cruz
  fortaleza: `
    <path ${T} d="M50 10 L84 22 Q84 62 50 90 Q16 62 16 22 Z"/>
    <path ${T} stroke-width="7" d="M50 28 V72 M33 44 H67"/>`,
  // Ciência: a balança que pesa o verdadeiro e o falso
  ciencia: `
    <circle ${F} cx="50" cy="15" r="5"/>
    <path ${T} d="M50 20 V82 M34 84 H66 M18 30 H82"/>
    <path ${T} stroke-width="4" d="M20 30 L10 56 M20 30 L30 56 M80 30 L70 56 M80 30 L90 56"/>
    <path ${T} d="M8 56 Q20 70 32 56 Z M68 56 Q80 70 92 56 Z"/>`,
  // Piedade: o coração em chama, amor que cuida
  piedade: `
    <path ${T} d="M50 88 C20 66 12 46 24 35 C34 26 45 30 50 40 C55 30 66 26 76 35 C88 46 80 66 50 88 Z"/>
    <path ${F} d="M50 36 Q39 22 50 4 Q61 22 50 36 Z"/>
    <path ${T} stroke-width="4" d="M50 52 V72 M42 60 H58"/>`,
  // Temor de Deus: a porta estreita (Mt 7,13), por onde só passa quem se faz pequeno
  temor: `
    <path ${T} d="M34 86 V44 Q34 16 50 12 Q66 16 66 44 V86"/>
    <path ${T} d="M22 87 H78"/>
    <path ${T} stroke-width="4" d="M50 30 V50 M43 37 H57"/>
    <circle ${F} cx="59" cy="64" r="3"/>`,
};

/** A pomba do Espírito Santo, no medalhão central da rosácea. */
export const POMBA = `
  <path fill="currentColor" d="M14 52 Q30 40 46 46 Q54 24 82 12 Q72 36 60 48 Q76 50 86 60 Q66 62 56 58 Q48 74 28 76 Q38 66 40 60 Q24 62 14 52 Z"/>
  <circle fill="#2a1a10" cx="24" cy="50" r="2.2"/>
  <path fill="#f0a640" d="M14 52 L7 54 L14 56 Z"/>`;
