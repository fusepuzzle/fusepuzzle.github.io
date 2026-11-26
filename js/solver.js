// Solver óptimo (IDA* + tabla de transposición).
//
// Cota inferior admisible. Cada bomba necesita recibir (4 - carga + blindaje)
// unidades para explotar. Una unidad llega por un toque, por un tic de
// temporizador o por la explosión de otra bomba que la alcance (vecina, diagonal
// del barril o línea de la flecha). Entre cada par de bombas solo puede viajar
// una unidad: la primera que explota alcanza a la otra y luego ya está vacía.
// Agrupando las bombas que pueden alcanzarse (componentes), en cada una:
//   toques >= Déficit - Pares   (y al menos 1 si no tiene temporizador).
// Los temporizadores regalan como mucho una unidad cada 3 toques cada uno.
// Si queda un muro frágil al que ninguna bomba puede alcanzar, no hay solución.
// Un muro frágil deja pasar una unidad a la casilla de detrás: cuenta como un par más.
import {
  CELLS, LIMIT, WALL, FRAGILE, K, NEIGHBORS, NEIGHBORS8, RAYS, TIMER_EVERY,
  chargeOf, armorOf, kindOf, isArrow, hasTimers, isCleared, applyTapInPlace, beyond,
} from './engine.js';

// Alcance potencial (ignora muros frágiles: pueden romperse y alargar la línea).
function reach(kind, i, b) {
  if (kind === K.BARREL) return NEIGHBORS8[i];
  if (isArrow(kind)) {
    const out = [];
    for (const j of RAYS[kind][i]) { if (b[j] === WALL) break; out.push(j); }
    return out;
  }
  return NEIGHBORS[i];
}

const parent = new Int8Array(CELLS);
const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };

// Atajo para tableros solo con bombas normales y muros (el reto diario): misma
// cota, calculada con un recorrido simple y sin estructuras auxiliares.
const queue = new Int8Array(CELLS);
const seen = new Uint8Array(CELLS);
function simpleBound(b) {
  seen.fill(0);
  let total = 0;
  for (let s = 0; s < CELLS; s++) {
    if (b[s] <= 0 || seen[s]) continue;
    let head = 0, tail = 0, deficit = 0, edges2 = 0;
    queue[tail++] = s; seen[s] = 1;
    while (head < tail) {
      const c = queue[head++];
      deficit += LIMIT - b[c];
      const nb = NEIGHBORS[c];
      for (let k = 0; k < nb.length; k++) {
        const n = nb[k];
        if (b[n] > 0) { edges2++; if (!seen[n]) { seen[n] = 1; queue[tail++] = n; } }
      }
    }
    total += Math.max(1, deficit - edges2 / 2);
  }
  return total;
}
const isSimple = (b) => { for (let i = 0; i < CELLS; i++) if (b[i] > 3 || b[i] === FRAGILE) return false; return true; };

export function lowerBound(b, phase = 0) {
  if (isSimple(b)) return simpleBound(b);
  let occupied = 0, timers = 0;
  const fragileHit = new Uint8Array(CELLS);
  const pairs = new Set();
  for (let i = 0; i < CELLS; i++) parent[i] = i;
  for (let u = 0; u < CELLS; u++) {
    const v = b[u];
    if (v <= 0) continue;
    occupied++;
    const k = kindOf(v);
    if (k === K.TIMER) timers++;
    const link = (w) => {
      pairs.add(u < w ? u * CELLS + w : w * CELLS + u);
      const a = find(u), z = find(w);
      if (a !== z) parent[a] = z;
    };
    for (const w of reach(k, u, b)) {
      if (b[w] > 0) link(w);
      else if (b[w] === FRAGILE) {
        fragileHit[w] = 1;
        // la chispa atraviesa el muro frágil y alcanza lo que hay detrás
        let s = u, f = w, m = beyond(s, f);
        while (m >= 0 && b[m] === FRAGILE) { fragileHit[m] = 1; s = f; f = m; m = beyond(s, f); }
        if (m >= 0 && b[m] > 0 && m !== u) link(m);
      }
    }
  }
  for (let i = 0; i < CELLS; i++) if (b[i] === FRAGILE && !fragileHit[i]) return Infinity;
  if (!occupied) return 0;

  const deficit = new Map(), edges = new Map(), timed = new Set();
  for (let u = 0; u < CELLS; u++) {
    const v = b[u];
    if (v <= 0) continue;
    const r = find(u);
    deficit.set(r, (deficit.get(r) || 0) + LIMIT - chargeOf(v) + armorOf(v));
    if (kindOf(v) === K.TIMER) timed.add(r);
  }
  for (const p of pairs) {
    const r = find(Math.floor(p / CELLS));
    edges.set(r, (edges.get(r) || 0) + 1);
  }
  let A = 0, B = 0;
  for (const [r, d] of deficit) {
    const need = d - (edges.get(r) || 0);
    if (timed.has(r)) B += Math.max(0, need);
    else A += Math.max(1, need);
  }
  if (!timers) return A;
  let t = A;
  while (t - A + timers * Math.floor((phase + t) / TIMER_EVERY) < B) t++;
  return Math.max(1, t);
}

const keyOf = (b) => String.fromCharCode.apply(null, b.map((v) => v + 66));

/**
 * @returns {{par:number, solution:number[], nodes:number}|null}
 *   null si se supera el presupuesto de nodos (determinista, no por tiempo)
 *   o si no hay solución dentro de maxDepth.
 */
export function solve(board, { maxNodes = 3_000_000, maxDepth = 25, phase = 0 } = {}) {
  const start = board.slice();
  if (isCleared(start)) return { par: 0, solution: [], nodes: 0 };
  const timed = hasTimers(start);
  let nodes = 0;
  let bound = lowerBound(start, phase);
  if (bound === Infinity) return null;
  const path = [];
  let aborted = false;
  // tt: clave -> [g, last]. Se poda si ya se exploró con g' <= g y last' <= last.
  // "last": índice del último toque sin explosión. Los toques sin explosión
  // conmutan, así que se fuerzan en orden creciente (no con temporizadores).
  let tt;

  function dfs(b, g, last, ph) {
    if (++nodes > maxNodes) { aborted = true; return false; }
    if (isCleared(b)) return true;
    const h = lowerBound(b, ph);
    if (g + h > bound) return false;
    const key = timed ? keyOf(b) + ph : keyOf(b);
    const prev = tt.get(key);
    if (prev && prev[0] <= g && prev[1] <= last) return false;
    tt.set(key, [g, last]);

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < CELLS; i++) {
        const v = b[i];
        if (v <= 0) continue;
        const explodes = timed || (armorOf(v) === 0 && chargeOf(v) === LIMIT - 1);
        if ((pass === 0) !== explodes) continue;
        if (!explodes && i < last) continue;
        const nb = b.slice();
        applyTapInPlace(nb, i, ph);
        path.push(i);
        if (dfs(nb, g + 1, explodes ? -1 : i, (ph + 1) % TIMER_EVERY)) return true;
        path.pop();
        if (aborted) return false;
      }
    }
    return false;
  }

  while (bound <= maxDepth) {
    tt = new Map();
    if (dfs(start, 0, -1, phase % TIMER_EVERY)) return { par: path.length, solution: path.slice(), nodes };
    if (aborted) return null;
    bound++;
  }
  return null;
}

/** Aplica una secuencia y dice si deja el tablero vacío. */
export function verify(board, moves) {
  const b = board.slice();
  for (let t = 0; t < moves.length; t++) {
    if (b[moves[t]] <= 0) return false;
    applyTapInPlace(b, moves[t], t);
  }
  return isCleared(b);
}
