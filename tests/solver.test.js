import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, verify, lowerBound } from '../js/solver.js';
import { applyTapInPlace } from '../js/engine.js';
import { dailyPuzzle, generate, dayNumber, dateKey, PAR_MIN, PAR_MAX } from '../js/daily.js';
import { recordWin, currentStreak, emptyStats, shareText, tapEmoji } from '../js/stats.js';

const LEVEL1 = [3,1,3,2,1, 1,2,3,3,2, 2,1,2,3,2, 3,3,3,1,2, 3,3,2,3,1];
const LEVEL2 = [3,3,2,2,3, 3,-1,3,3,1, 2,1,-1,3,3, 3,1,2,-1,3, 3,1,2,3,3];

test('nivel 1: par 6 y la solución vacía el tablero', () => {
  const r = solve(LEVEL1);
  assert.equal(r.par, 6);
  assert.ok(verify(LEVEL1, r.solution));
});

test('nivel 2: par 7 y la solución vacía el tablero', () => {
  const r = solve(LEVEL2);
  assert.equal(r.par, 7);
  assert.ok(verify(LEVEL2, r.solution));
});

// BFS exhaustiva como referencia para tableros pequeños
function bfs(board) {
  const key = (b) => b.join(',');
  let frontier = [board], seen = new Set([key(board)]), d = 0;
  while (frontier.length) {
    const next = [];
    for (const b of frontier) {
      if (b.every((v) => v <= 0)) return d;
      for (let i = 0; i < 25; i++) if (b[i] > 0) {
        const nb = b.slice(); applyTapInPlace(nb, i);
        const k = key(nb);
        if (!seen.has(k)) { seen.add(k); next.push(nb); }
      }
    }
    frontier = next; d++;
  }
  return Infinity;
}

test('el solver es óptimo (coincide con BFS) y la cota es admisible', () => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < 60; t++) {
    const b = Array.from({ length: 25 }, () => {
      const r = rnd();
      return r < 0.55 ? 0 : r < 0.62 ? -1 : 1 + Math.floor(rnd() * 3);
    });
    const opt = bfs(b);
    const r = solve(b);
    assert.equal(r.par, opt, `tablero ${b}`);
    assert.ok(lowerBound(b) <= opt);
    assert.ok(verify(b, r.solution));
  }
});

test('reto diario: misma fecha, mismo tablero; fechas distintas, tableros distintos', () => {
  const a = dailyPuzzle('2026-12-01');
  const b = dailyPuzzle('2026-12-01');
  const c = dailyPuzzle('2026-12-02');
  assert.deepEqual(a.board, b.board);
  assert.notDeepEqual(a.board, c.board);
});

test('los retos diarios tienen solución verificada y par en rango', () => {
  for (let d = 1; d <= 20; d++) {
    const key = `2027-01-${String(d).padStart(2, '0')}`;
    const p = dailyPuzzle(key);
    assert.ok(verify(p.board, p.solution));
    assert.equal(p.solution.length, p.par);
    assert.ok(p.par >= PAR_MIN && p.par <= PAR_MAX);
  }
});

test('numeración de retos y clave de fecha', () => {
  assert.equal(dayNumber('2026-11-26'), 1);
  assert.equal(dayNumber('2026-12-26'), 31);
  assert.equal(dayNumber('2027-03-29'), 124); // cruza el cambio de hora
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.ok(generate('x').board.length === 25);
});

test('racha: días seguidos suman, un hueco reinicia, repetir día no cuenta', () => {
  let s = emptyStats();
  s = recordWin(s, 10, 7, 6);
  s = recordWin(s, 11, 6, 6);
  assert.equal(s.streak, 2);
  assert.equal(s.perfect, 1);
  s = recordWin(s, 11, 5, 6);
  assert.equal(s.played, 2, 'el mismo día no se cuenta dos veces');
  s = recordWin(s, 13, 6, 6);
  assert.equal(s.streak, 1);
  assert.equal(s.best, 2);
  assert.equal(currentStreak(s, 14), 1);
  assert.equal(currentStreak(s, 15), 0, 'se pierde si ayer no se jugó');
});

test('texto para compartir', () => {
  const txt = shareText({ number: 3, taps: 6, par: 6, emojis: '🟧💥', streak: 4, url: 'https://x/' });
  assert.match(txt, /Fuse #3 · 6 toques \(¡objetivo cumplido! ⭐\)/);
  const txt2 = shareText({ number: 3, taps: 8, par: 6, emojis: '🟧', streak: 1 });
  assert.match(txt2, /8 toques \(objetivo 6\)/);
  assert.match(txt, /Racha: 4 días/);
  assert.equal(tapEmoji(0), '▫️');
  assert.equal(tapEmoji(9), '🔥');
});
