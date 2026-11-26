import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsFor, totalStars, chapterUnlocked, levelUnlocked, newlyUnlocked } from '../js/progress.js';
import { CHAPTERS } from '../js/levels.js';

test('estrellas: objetivo 3, +1 → 2, +2 → 1, más → 0', () => {
  assert.equal(starsFor(4, 5), 3);
  assert.equal(starsFor(5, 5), 3);
  assert.equal(starsFor(6, 5), 2);
  assert.equal(starsFor(7, 5), 1);
  assert.equal(starsFor(8, 5), 0);
});

const ch = (id, need, pars) => ({ id, need, levels: pars.map((par, n) => ({ id: `${id}-${n}`, par })) });
const TOY = [ch('a', 0, [3, 4, 5]), ch('b', 6, [5, 5, 5]), ch('c', 12, [5, 5, 5])];

test('desbloqueo: el primer capítulo y su primer nivel están abiertos desde el principio', () => {
  assert.ok(levelUnlocked(TOY, {}, 0, 0));
  assert.ok(!levelUnlocked(TOY, {}, 0, 1), 'el 2.º se abre al completar el 1.º');
  assert.ok(!levelUnlocked(TOY, {}, 1, 0), 'el capítulo 2 necesita estrellas');
});

test('desbloqueo: dentro del capítulo basta con completar el anterior (aunque sea sin estrellas)', () => {
  assert.ok(levelUnlocked(TOY, { 'a-0': 99 }, 0, 1));
});

test('desbloqueo: un capítulo se abre al reunir sus estrellas', () => {
  const best = { 'a-0': 3, 'a-1': 5, 'a-2': 8 }; // 3 + 2 + 0 = 5
  assert.equal(totalStars(TOY, best), 5);
  assert.ok(!chapterUnlocked(TOY[1], TOY, best));
  best['a-2'] = 7; // ahora 3 + 2 + 1 = 6
  assert.ok(chapterUnlocked(TOY[1], TOY, best));
  assert.ok(levelUnlocked(TOY, best, 1, 0));
  assert.deepEqual(newlyUnlocked(TOY, 5, 6).map((c) => c.id), ['b']);
});

test('niveles reales: capítulos de 3 con requisitos crecientes y alcanzables', () => {
  assert.equal(CHAPTERS[0].need, 0);
  for (let c = 1; c < CHAPTERS.length; c++) {
    assert.ok(CHAPTERS[c].need > CHAPTERS[c - 1].need);
    // con 3 estrellas en todo lo anterior se puede abrir
    const before = CHAPTERS.slice(0, c).reduce((s, x) => s + x.levels.length * 3, 0);
    assert.ok(CHAPTERS[c].need <= before, CHAPTERS[c].name);
  }
});
