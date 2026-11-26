import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tap, applyTapInPlace, isCleared, NEIGHBORS, WALL } from '../js/engine.js';

// Tablero vacío salvo lo que se indique: {índice: valor}
const B = (cells = {}) => {
  const b = new Array(25).fill(0);
  for (const [i, v] of Object.entries(cells)) b[i] = v;
  return b;
};

test('las vecinas son ortogonales y respetan bordes', () => {
  assert.deepEqual(NEIGHBORS[0].sort((a, b) => a - b), [1, 5]);
  assert.deepEqual(NEIGHBORS[12].sort((a, b) => a - b), [7, 11, 13, 17]);
  assert.deepEqual(NEIGHBORS[24].sort((a, b) => a - b), [19, 23]);
  assert.ok(!NEIGHBORS[4].includes(5), 'no da la vuelta de fila');
});

test('tocar una casilla ocupada suma 1', () => {
  const r = tap(B({ 12: 1 }), 12);
  assert.equal(r.board[12], 2);
  assert.equal(r.waves.length, 0);
});

test('tocar vacía o muro no hace nada', () => {
  assert.equal(tap(B({ 3: WALL }), 3), null);
  assert.equal(tap(B(), 7), null);
});

test('al llegar a 4 explota, queda vacía y suma 1 a vecinas ocupadas', () => {
  const r = tap(B({ 12: 3, 7: 1, 11: 2, 13: 1 }), 12);
  assert.equal(r.board[12], 0);
  assert.equal(r.board[7], 2);
  assert.equal(r.board[11], 3);
  assert.equal(r.board[13], 2);
  assert.equal(r.board[17], 0, 'una vacía no recibe carga');
  assert.deepEqual(r.waves.map((w) => w.exploded), [[12]]);
});

test('muros y vacías no reciben carga', () => {
  const r = tap(B({ 12: 3, 7: WALL }), 12);
  assert.equal(r.board[7], WALL);
  assert.equal(r.board[11], 0);
  assert.deepEqual(r.waves[0].received, []);
});

test('las cadenas se resuelven por oleadas', () => {
  // fila 0: 3 3 3 . .  -> tocar 0 explota 0, luego 1, luego 2
  const r = tap(B({ 0: 3, 1: 3, 2: 3 }), 0);
  assert.deepEqual(r.waves.map((w) => w.exploded), [[0], [1], [2]]);
  assert.ok(isCleared(r.board));
});

test('dos casillas que explotan en la misma oleada no se cargan entre sí', () => {
  // 12 explota -> 11 y 13 (a 3) llegan a 4 y explotan juntas; 12 ya está vacía y no recibe.
  const r = tap(B({ 12: 3, 11: 3, 13: 3, 10: 1, 14: 1 }), 12);
  assert.deepEqual(r.waves.map((w) => w.exploded), [[12], [11, 13]]);
  assert.equal(r.board[10], 2);
  assert.equal(r.board[14], 2);
});

test('una casilla que recibe 2 en una oleada explota una sola vez', () => {
  // tocar 2 -> explotan 1 y 3 -> explotan 6 y 8 a la vez -> 7 (a 2) recibe 2 y explota una vez
  const b = B({ 2: 3, 1: 3, 3: 3, 6: 3, 8: 3, 7: 2 });
  const r = tap(b, 2);
  const waves = r.waves.map((w) => w.exploded);
  assert.deepEqual(waves[0], [2]);
  assert.deepEqual(waves[1], [1, 3]);
  // 7: recibe de 2? no (no es vecina). Recibe de 6 y 8 -> 2+2 = 4 -> explota
  assert.deepEqual(waves[2], [6, 8]);
  assert.deepEqual(waves[3], [7]);
  assert.equal(waves.flat().filter((x) => x === 7).length, 1);
  assert.ok(isCleared(r.board));
});

test('isCleared ignora muros', () => {
  assert.ok(isCleared(B({ 0: WALL, 24: WALL })));
  assert.ok(!isCleared(B({ 5: 1 })));
});

test('applyTapInPlace coincide con tap en tableros aleatorios', () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let t = 0; t < 2000; t++) {
    const b = Array.from({ length: 25 }, () => { const r = rnd(); return r < 0.1 ? -1 : r < 0.2 ? 0 : 1 + Math.floor(rnd() * 3); });
    const occ = b.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    if (!occ.length) continue;
    const i = occ[Math.floor(rnd() * occ.length)];
    const fast = b.slice();
    const n = applyTapInPlace(fast, i);
    const slow = tap(b, i);
    assert.deepEqual(fast, slow.board);
    assert.equal(n, slow.waves.reduce((s, w) => s + w.exploded.length, 0));
    assert.ok(slow.board.every((v) => v <= 3), 'tras resolver no queda nada a 4+');
  }
});
