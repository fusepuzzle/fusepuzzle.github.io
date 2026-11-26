import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tap, applyTapInPlace, isCleared, cell, iced, shielded, K, WALL, FRAGILE, EMPTY,
  chargeOf, armorOf, hasTimers, TIMER_EVERY,
} from '../js/engine.js';
import { solve, verify, lowerBound } from '../js/solver.js';
import { CHAPTERS } from '../js/levels.js';
import { flatLevels } from '../js/progress.js';
import { dailyPuzzle, randomPractice } from '../js/daily.js';

const B = (cells = {}) => {
  const b = new Array(25).fill(0);
  for (const [i, v] of Object.entries(cells)) b[i] = v;
  return b;
};

test('hielo: el primer impacto solo rompe el hielo', () => {
  let r = tap(B({ 12: iced(2) }), 12);
  assert.equal(armorOf(r.board[12]), 0);
  assert.equal(chargeOf(r.board[12]), 2, 'no suma carga');
  r = tap(r.board, 12);
  assert.equal(chargeOf(r.board[12]), 3);
});

test('hielo: una explosión vecina también lo rompe sin cargarlo', () => {
  const r = tap(B({ 12: 3, 13: iced(3) }), 12);
  assert.equal(r.board[13], 3, 'queda como bomba normal de carga 3');
});

test('escudo: aguanta dos impactos', () => {
  let b = B({ 0: shielded(1) });
  b = tap(b, 0).board; assert.equal(armorOf(b[0]), 1);
  b = tap(b, 0).board; assert.equal(armorOf(b[0]), 0);
  assert.equal(chargeOf(b[0]), 1);
  b = tap(b, 0).board; assert.equal(chargeOf(b[0]), 2);
});

test('barril: alcanza las 8 casillas de alrededor', () => {
  const b = B({ 12: cell(K.BARREL, 3), 6: 1, 7: 1, 8: 1, 11: 1, 13: 1, 16: 1, 17: 1, 18: 1, 0: 1 });
  const r = tap(b, 12);
  for (const n of [6, 7, 8, 11, 13, 16, 17, 18]) assert.equal(r.board[n], 2, `casilla ${n}`);
  assert.equal(r.board[0], 1, 'lo que no es vecino no cambia');
});

test('flecha: recorre la línea cargando cada bomba hasta un muro', () => {
  // fila 2: [→3] [1] [vacía] [1] [muro]  y una bomba encima que no recibe
  const b = B({ 10: cell(K.RIGHT, 3), 11: 1, 13: 1, 14: WALL, 5: 1 });
  const r = tap(b, 10);
  assert.equal(r.board[11], 2);
  assert.equal(r.board[13], 2, 'pasa por encima de las vacías');
  assert.equal(r.board[14], WALL);
  assert.equal(r.board[5], 1, 'no carga hacia los lados');
});

test('flecha: un muro frágil se rompe, la chispa pasa a la casilla de detrás y la línea se para', () => {
  const b = B({ 10: cell(K.RIGHT, 3), 12: FRAGILE, 13: 1, 14: 1 });
  const r = tap(b, 10);
  assert.equal(r.board[12], EMPTY);
  assert.equal(r.board[13], 2, 'la de justo detrás recibe');
  assert.equal(r.board[14], 1, 'la línea no sigue más allá');
  assert.deepEqual(r.waves[0].broken, [12]);
});

test('muro frágil: se rompe con una explosión y hay que romperlo para ganar', () => {
  const b = B({ 0: 3, 1: FRAGILE });
  assert.ok(!isCleared(B({ 1: FRAGILE })), 'un muro frágil en pie impide ganar');
  const r = tap(b, 0);
  assert.equal(r.board[1], EMPTY);
  assert.ok(isCleared(r.board));
});

test('muro frágil: al romperse, la chispa lo atraviesa y sigue la cadena al otro lado', () => {
  // 3 · frágil · 3 · 3 en la fila de arriba
  const b = B({ 0: 3, 1: FRAGILE, 2: 3, 3: 3 });
  const r = tap(b, 0);
  assert.ok(isCleared(r.board), 'un solo toque vacía todo');
  assert.equal(r.explosions, 3);
  assert.deepEqual(r.waves[0].received, [2]);
});

test('muro frágil: puente de un solo uso (vacío detrás o desde la otra dirección)', () => {
  // desde abajo: la chispa va hacia arriba, fuera del tablero; la bomba de al lado no recibe
  const r = tap(B({ 6: 3, 1: FRAGILE, 2: 1 }), 6);
  assert.equal(r.board[1], EMPTY);
  assert.equal(r.board[2], 1);
  // barril en diagonal: la chispa sigue en diagonal
  const r2 = tap(B({ 0: cell(K.BARREL, 3), 6: FRAGILE, 12: 1 }), 0);
  assert.equal(r2.board[12], 2);
});

test('temporizador: suma 1 cada 3 toques, toques donde toques', () => {
  let b = B({ 0: cell(K.TIMER, 1), 24: 1 });
  b = tap(b, 24, 0).board; // toque 1
  assert.equal(chargeOf(b[0]), 1);
  b = tap(b, 24, 1).board; // toque 2
  assert.equal(chargeOf(b[0]), 1);
  const r = tap(b, 24, 2); // toque 3 -> tic
  assert.equal(chargeOf(r.board[0]), 2);
  assert.ok(r.waves.some((w) => w.tick));
  assert.equal(TIMER_EVERY, 3);
});

test('temporizador: el tic puede hacerlo explotar y provocar una cadena', () => {
  const b = B({ 0: cell(K.TIMER, 3), 1: 3, 24: 1 });
  const r = tap(b, 24, 2);
  assert.equal(r.board[0], EMPTY);
  assert.equal(r.board[1], EMPTY);
  assert.equal(r.explosions, 2);
});

// BFS exhaustiva de referencia (incluye la fase del temporizador en el estado)
function bfs(board, limit = 12) {
  const timed = hasTimers(board);
  const key = (b, p) => b.join(',') + (timed ? `|${p}` : '');
  let frontier = [[board, 0]];
  const seen = new Set([key(board, 0)]);
  for (let d = 0; d <= limit; d++) {
    const next = [];
    for (const [b, p] of frontier) {
      if (isCleared(b)) return d;
      for (let i = 0; i < 25; i++) if (b[i] > 0) {
        const nb = b.slice(); applyTapInPlace(nb, i, p);
        const np = (p + 1) % TIMER_EVERY, k = key(nb, np);
        if (!seen.has(k)) { seen.add(k); next.push([nb, np]); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

test('el solver sigue siendo óptimo con todos los elementos (contra BFS)', () => {
  let s = 99;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let checked = 0;
  for (let t = 0; t < 80; t++) {
    const b = Array.from({ length: 25 }, () => {
      const r = rnd();
      if (r < 0.6) return 0;
      if (r < 0.64) return WALL;
      if (r < 0.67) return FRAGILE;
      const kr = rnd();
      const kind = kr < 0.5 ? K.BOMB : kr < 0.62 ? K.BARREL : kr < 0.86 ? 2 + Math.floor(rnd() * 4) : K.TIMER;
      const armor = rnd() < 0.75 ? 0 : rnd() < 0.5 ? 1 : 2;
      return cell(kind, 1 + Math.floor(rnd() * 3), armor, armor === 2);
    });
    const opt = bfs(b);
    if (opt === Infinity) { assert.equal(solve(b, { maxDepth: 12 }), null); continue; }
    const r = solve(b, { maxDepth: 12, maxNodes: 2e7 });
    assert.equal(r.par, opt, `tablero ${JSON.stringify(b)}`);
    assert.ok(verify(b, r.solution));
    assert.ok(lowerBound(b) <= opt, 'la cota no se pasa');
    checked++;
  }
  assert.ok(checked > 20);
});

test('niveles: el objetivo guardado es el óptimo y se puede cumplir', () => {
  const LEVELS = flatLevels(CHAPTERS).map((x) => x.level);
  assert.equal(LEVELS.length, 24);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length, 'ids únicos');
  // el primer capítulo no tiene elementos nuevos
  for (const l of CHAPTERS[0].levels) assert.ok(l.board.every((v) => v === WALL || (v >= 0 && v <= 3)), l.name);
  for (const lvl of LEVELS) {
    const r = solve(lvl.board, { maxNodes: 2e7 });
    assert.equal(r.par, lvl.par, lvl.name);
    assert.ok(verify(lvl.board, r.solution), lvl.name);
  }
});

test('el reto diario no cambia con los elementos nuevos', () => {
  const p = dailyPuzzle('2026-11-26');
  assert.equal(p.par, 7);
  assert.deepEqual(p.solution, [1, 0, 2, 10, 3, 9, 24]);
  assert.ok(p.board.every((v) => v === WALL || (v >= 1 && v <= 3)), 'solo bombas normales y muros');
});

test('práctica aleatoria: mezcla elementos y tiene solución verificada', () => {
  const p = randomPractice('test-1');
  assert.ok(Object.keys(p.elements).length >= 2);
  assert.ok(verify(p.board, p.solution));
  assert.equal(p.solution.length, p.par);
});
