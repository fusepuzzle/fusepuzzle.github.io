// Reto diario: misma fecha -> mismo tablero para todo el mundo.
import { CELLS, WALL, FRAGILE, K, ARROWS, cell } from './engine.js';
import { solve } from './solver.js';

export const EPOCH = Date.UTC(2026, 10, 26); // reto #1 = 26/11/2026
export const PAR_MIN = 6;
export const PAR_MAX = 9;
const NODE_BUDGET = 400_000;

// cyrb53: hash de cadena -> entero de 53 bits (estable en cualquier motor JS)
export function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fecha local -> 'AAAA-MM-DD' */
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

export function randomBoard(rng) {
  const b = new Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    const r = rng();
    b[i] = r < 0.2 ? 1 : r < 0.55 ? 2 : 3;
  }
  // 0-4 muros, colocados con simetría central para que el tablero sea bonito
  const walls = Math.floor(rng() * 3) * 2; // 0, 2 o 4 (más el centro a veces)
  for (let k = 0; k < walls / 2; k++) {
    const i = Math.floor(rng() * CELLS);
    b[i] = WALL;
    b[CELLS - 1 - i] = WALL;
  }
  if (rng() < 0.25) b[12] = WALL;
  return b;
}

/**
 * Coloca elementos especiales sobre un tablero normal.
 * elements: { ice, shield, barrel, arrow, fragile, timer } (cuántos de cada).
 * Solo consume números aleatorios si hay elementos (el reto diario no cambia).
 */
export function addElements(b, rng, elements) {
  const pick = (pred) => {
    const options = [];
    for (let i = 0; i < CELLS; i++) if (pred(b[i])) options.push(i);
    return options.length ? options[Math.floor(rng() * options.length)] : -1;
  };
  const plain = (v) => v > 0 && v <= 3; // bomba normal sin nada
  const put = (n, make) => { for (let k = 0; k < (n || 0); k++) { const i = pick(plain); if (i >= 0) b[i] = make(b[i]); } };
  put(elements.barrel, (v) => cell(K.BARREL, v));
  put(elements.arrow, (v) => cell(ARROWS[Math.floor(rng() * 4)], v));
  put(elements.timer, (v) => cell(K.TIMER, Math.min(v, 2)));
  put(elements.ice, (v) => v | (1 << 5));
  put(elements.shield, (v) => v | (2 << 5) | 1024);
  for (let k = 0; k < (elements.fragile || 0); k++) {
    const i = pick((v) => v > 0 && v <= 3);
    if (i >= 0) b[i] = FRAGILE;
  }
  return b;
}

/** Genera un tablero con solución verificada y par dentro del rango. */
export function generate(seedStr, { parMin = PAR_MIN, parMax = PAR_MAX, elements = null, nodes = NODE_BUDGET } = {}) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = mulberry32(hashString(`${seedStr}#${attempt}`));
    const board = randomBoard(rng);
    if (elements) addElements(board, rng, elements);
    if (board.filter((v) => v > 0).length < 12) continue;
    const res = solve(board, { maxNodes: nodes, maxDepth: parMax });
    if (res && res.par >= parMin && res.par <= parMax) {
      return { board, par: res.par, solution: res.solution, attempt };
    }
  }
  throw new Error('No se pudo generar un tablero');
}

/** Tablero aleatorio de práctica con una mezcla de 2-3 elementos. */
export function randomPractice(seedStr) {
  const rng = mulberry32(hashString(`mix-${seedStr}`));
  const all = ['ice', 'shield', 'barrel', 'arrow', 'fragile', 'timer'];
  const chosen = all.filter(() => rng() < 0.45).slice(0, 3);
  while (chosen.length < 2) {
    const e = all[Math.floor(rng() * all.length)];
    if (!chosen.includes(e)) chosen.push(e);
  }
  const elements = {};
  for (const e of chosen) elements[e] = 1 + Math.floor(rng() * 2);
  // presupuesto bajo por intento: los tableros caros se descartan rápido (va en el móvil)
  return { ...generate(seedStr, { parMin: 5, parMax: 9, elements, nodes: 60_000 }), elements };
}

export function dailyPuzzle(key = dateKey()) {
  // Semilla con el nombre original del juego: no cambiarla o cambiarían todos los retos.
  const p = generate(`mecha-${key}`);
  return { ...p, key, number: dayNumber(key) };
}
