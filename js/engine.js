// Reglas de Fuse. Tablero = array de 25 enteros.
//   -1 muro, -2 muro frágil, 0 vacía, >0 bomba (código de bits):
//   bits 0-4  carga (1..3; 4+ solo de paso, mientras explota)
//   bits 5-6  blindaje (0 nada, 1 hielo / escudo agrietado, 2 escudo)
//   bits 7-9  tipo (bomba, barril, flechas ↑→↓←, temporizador)
//   bit  10   el blindaje es un escudo (si no, es hielo)
// Una bomba normal de carga 1..3 vale simplemente 1..3.
export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const WALL = -1;
export const FRAGILE = -2;
export const EMPTY = 0;
export const LIMIT = 4;
export const TIMER_EVERY = 3; // el temporizador suma 1 cada 3 toques

export const K = { BOMB: 0, BARREL: 1, UP: 2, RIGHT: 3, DOWN: 4, LEFT: 5, TIMER: 6 };
export const ARROWS = [K.UP, K.RIGHT, K.DOWN, K.LEFT];

export const chargeOf = (c) => c & 31;
export const armorOf = (c) => (c >> 5) & 3;
export const kindOf = (c) => (c >> 7) & 7;
export const hasShield = (c) => ((c >> 10) & 1) === 1;
export const isArrow = (k) => k >= K.UP && k <= K.LEFT;

export function cell(kind = K.BOMB, charge = 1, armor = 0, shield = false) {
  return charge | (armor << 5) | (kind << 7) | (shield ? 1024 : 0);
}
export const iced = (charge, kind = K.BOMB) => cell(kind, charge, 1, false);
export const shielded = (charge, kind = K.BOMB) => cell(kind, charge, 2, true);

const rc = (i) => [Math.floor(i / SIZE), i % SIZE];
const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

// Vecinas ortogonales (bomba normal) y en las 8 direcciones (barril).
export const NEIGHBORS = Array.from({ length: CELLS }, (_, i) => {
  const [r, c] = rc(i);
  return [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dr, dc]) => inside(r + dr, c + dc))
    .map(([dr, dc]) => (r + dr) * SIZE + c + dc);
});
export const NEIGHBORS8 = Array.from({ length: CELLS }, (_, i) => {
  const [r, c] = rc(i), out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if ((dr || dc) && inside(r + dr, c + dc)) out.push((r + dr) * SIZE + c + dc);
  }
  return out;
});
// Rayos de las flechas: casillas en línea recta desde i, de cerca a lejos.
const DIR = { [K.UP]: [-1, 0], [K.RIGHT]: [0, 1], [K.DOWN]: [1, 0], [K.LEFT]: [0, -1] };
export const RAYS = {};
for (const k of ARROWS) {
  RAYS[k] = Array.from({ length: CELLS }, (_, i) => {
    let [r, c] = rc(i); const out = [];
    for (;;) { r += DIR[k][0]; c += DIR[k][1]; if (!inside(r, c)) break; out.push(r * SIZE + c); }
    return out;
  });
}

/** Casillas a las que llega la explosión de una bomba de tipo `kind` en `i`. */
export function targets(kind, i, b, out = []) {
  if (kind === K.BARREL) { for (const n of NEIGHBORS8[i]) out.push(n); }
  else if (isArrow(kind)) {
    // la flecha recorre toda la línea; un muro la para y un muro frágil se rompe y la para
    for (const j of RAYS[kind][i]) {
      if (b[j] === WALL) break;
      out.push(j);
      if (b[j] === FRAGILE) break;
    }
  } else { for (const n of NEIGHBORS[i]) out.push(n); }
  return out;
}

// Un impacto (toque, explosión vecina o tic del temporizador).
// Devuelve 0 nada, 1 recibido, 2 muro roto, 3 recibido y llega a 4 (explota).
function hit(b, n) {
  const v = b[n];
  if (v === FRAGILE) { b[n] = EMPTY; return 2; }
  if (v <= 0) return 0;
  if (armorOf(v) > 0) { b[n] = v - 32; return 1; } // rompe una capa de hielo/escudo
  b[n] = v + 1;
  return chargeOf(v + 1) === LIMIT ? 3 : 1;
}

const num = (a, z) => a - z;

// Resuelve las oleadas a partir de `frontier`. Si `rec` es un array, guarda cada oleada.
function resolve(b, frontier, rec) {
  let count = 0;
  while (frontier.length) {
    const kinds = frontier.map((c) => kindOf(b[c]));
    for (const c of frontier) b[c] = EMPTY;
    const hits = [];
    frontier.forEach((c, k) => targets(kinds[k], c, b, hits));
    const next = [];
    const received = rec ? new Set() : null;
    const broken = rec ? [] : null;
    for (const n of hits) {
      const r = hit(b, n);
      if (r === 3) next.push(n);
      if (rec) { if (r === 2) broken.push(n); else if (r) received.add(n); }
    }
    count += frontier.length;
    if (rec) {
      rec.push({
        exploded: frontier.slice().sort(num), received: [...received].sort(num),
        broken: broken.sort(num), board: b.slice(),
      });
    }
    frontier = next.sort(num);
  }
  return count;
}

export const hasTimers = (b) => b.some((v) => v > 0 && kindOf(v) === K.TIMER);

// Tras el toque nº `tapsAfter`, si toca, los temporizadores suman 1.
function tick(b, tapsAfter, rec) {
  if (tapsAfter % TIMER_EVERY !== 0) return 0;
  const timers = [];
  for (let i = 0; i < CELLS; i++) if (b[i] > 0 && kindOf(b[i]) === K.TIMER) timers.push(i);
  if (!timers.length) return 0;
  const start = [];
  for (const t of timers) if (hit(b, t) === 3) start.push(t);
  if (rec) rec.push({ tick: true, exploded: [], received: timers, broken: [], board: b.slice() });
  return resolve(b, start, rec);
}

export const isOccupied = (v) => v > 0;
/** Gana quien deja el tablero sin bombas ni muros frágiles. */
export const isCleared = (board) => board.every((v) => v === EMPTY || v === WALL);

/**
 * Toca la casilla i. `taps` = toques hechos antes (para el temporizador).
 * Devuelve null si no hay bomba; si no { board, waves, explosions }.
 * waves: [{ exploded, received, broken, board, tick? }]
 */
export function tap(board, i, taps = 0) {
  if (!isOccupied(board[i])) return null;
  const b = board.slice();
  const waves = [];
  let explosions = 0;
  if (hit(b, i) === 3) explosions += resolve(b, [i], waves);
  explosions += tick(b, taps + 1, waves);
  return { board: b, waves, explosions };
}

/** Versión rápida (para el solver): muta el tablero y devuelve nº de explosiones. */
export function applyTapInPlace(b, i, taps = 0) {
  let n = 0;
  if (hit(b, i) === 3) n += resolve(b, [i], null);
  return n + tick(b, taps + 1, null);
}

export function explosionsOf(result) {
  return result.waves.reduce((s, w) => s + w.exploded.length, 0);
}
