import {
  CELLS, WALL, FRAGILE, K, TIMER_EVERY, tap, isCleared, explosionsOf,
  chargeOf, armorOf, kindOf, hasShield, isArrow,
} from './engine.js';
import { dateKey, dayNumber } from './daily.js';
import { loadStats, saveStats, recordWin, currentStreak, tapEmoji, shareText } from './stats.js';
import { CHAPTERS } from './levels.js';
import {
  starsFor, levelStars, totalStars, chapterStars, chapterUnlocked, levelUnlocked, flatLevels, newlyUnlocked,
} from './progress.js';

const GEN_VERSION = 1; // cambiar si cambia el generador (invalida la caché)
const FLAT = flatLevels(CHAPTERS);
const MAX_STARS = FLAT.length * 3;
// best: { idNivel: mejor nº de toques }, cur: último nivel jugado (índice en FLAT)
const LEVELS_KEY = 'mecha:levels:v1';
const loadLevels = () => {
  try { const p = JSON.parse(localStorage.getItem(LEVELS_KEY)); if (p?.best) return p; } catch {}
  return { best: {}, cur: 0 };
};
const saveLevels = (p) => { try { localStorage.setItem(LEVELS_KEY, JSON.stringify(p)); } catch {} };
const isOpen = (i) => i >= 0 && i < FLAT.length && levelUnlocked(CHAPTERS, loadLevels().best, FLAT[i].c, FLAT[i].n);

const $ = (id) => document.getElementById(id);
const els = {
  board: $('board'), taps: $('taps'), par: $('par'), combo: $('combo'), loading: $('loading'),
  eyebrow: $('label-eyebrow'), title: $('label-title'), prev: $('prev'), next: $('next'),
  share: $('btn-share'), share2: $('btn-share2'), reset: $('btn-reset'),
  tabDaily: $('tab-daily'), tabPractice: $('tab-practice'),
  dlgHelp: $('dlg-help'), dlgStats: $('dlg-stats'), dlgLevel: $('dlg-level'), toast: $('toast'), tip: $('tip'),
  app: document.querySelector('.app'), map: $('level-map'),
};

const state = {
  mode: 'daily',     // 'daily' | 'levels'
  cur: Math.min(loadLevels().cur || 0, FLAT.length - 1),
  puzzle: null,      // { board, par, number?, key?, name }
  board: [],
  burnt: new Set(),
  taps: 0,
  log: [],           // explosiones por toque
  busy: false,
  won: false,
  daily: null,
  stats: loadStats(),
};

/* ---------- Dibujo de casillas ---------- */
// La mecha se consume con la carga: verde larga, ámbar media, roja casi en la bomba.
// La bengala va siempre centrada en la punta (x, y = final del trazo).
const FUSES = {
  1: { d: 'M56 38 C 60 27, 72 31, 78 14', x: 78, y: 14 },
  2: { d: 'M56 38 C 59 31, 66 32, 68 25', x: 68, y: 25 },
  3: { d: 'M56 38 C 57 35, 60 34, 61 31', x: 61, y: 31 },
  4: { d: '', x: 56, y: 37 },
};
const LABELS = { 1: 'carga 1', 2: 'carga 2', 3: 'carga 3, a punto', 4: 'explotando' };

// Bengala: un punto de luz fijo que suelta chispitas en todas direcciones.
// Color según la carga: blanquecino (1), naranja (2), rojizo (3).
const SPARK_COLORS = {
  1: { core: '#ffffff', a: '#ffffff', b: '#fff3cf', glow: '#ffe9a8' },
  2: { core: '#fff6e0', a: '#ffd27a', b: '#ff9a1f', glow: '#ffae3b' },
  3: { core: '#ffe9e2', a: '#ff9a80', b: '#ff3b1f', glow: '#ff5233' },
  4: { core: '#ffffff', a: '#ffd23f', b: '#ff3b1f', glow: '#ff7a1a' },
};
const SPARK_RAYS = { 1: 12, 2: 14, 3: 16, 4: 18 };  // rayos de la bengala
const SPARKS = { 1: 4, 2: 6, 3: 8, 4: 10 };   // chispitas sueltas

// Se animan atributos con SMIL (no transformaciones CSS): el punto no se mueve en
// ningún navegador, Safari incluido.
function sparkSVG(v, x, y) {
  const lvl = Math.min(v, 4);
  const c = SPARK_COLORS[lvl];
  const f = (n) => n.toFixed(1);
  const pt = (ang, r) => [f(x + Math.cos(ang) * r), f(y + Math.sin(ang) * r)];
  let out = `<g class="sparkler">` +
    `<circle cx="${x}" cy="${y}" r="13" fill="${c.glow}" opacity=".22"/>` +
    `<circle cx="${x}" cy="${y}" r="7" fill="${c.glow}" opacity=".45"/>`;

  // Rayos que salen del punto y chisporrotean (cambian de largo sin parar), como 🎇
  const rays = SPARK_RAYS[lvl];
  for (let k = 0; k < rays; k++) {
    const ang = (k / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const [x1, y1] = pt(ang, 3.5);
    const lens = [0, 1, 2].map(() => 8 + Math.random() * 11);
    const ends = lens.map((L) => pt(ang, L));
    const col = k % 2 ? c.a : c.b;
    out += `<line x1="${x1}" y1="${y1}" x2="${ends[0][0]}" y2="${ends[0][1]}" stroke="${col}" stroke-width="1.7" stroke-linecap="round">`;
    if (!reduceMotion) {
      const dur = (0.28 + Math.random() * 0.3).toFixed(2);
      const t = `dur="${dur}s" begin="-${(Math.random() * dur).toFixed(2)}s" repeatCount="indefinite"`;
      const seq = (i) => `${ends[0][i]};${ends[1][i]};${ends[2][i]};${ends[0][i]}`;
      out += `<animate attributeName="x2" values="${seq(0)}" ${t}/><animate attributeName="y2" values="${seq(1)}" ${t}/>`;
    }
    out += `</line>`;
  }

  // Chispitas que salen disparadas y se apagan
  if (!reduceMotion) {
    const n = SPARKS[lvl];
    for (let k = 0; k < n; k++) {
      const ang = Math.random() * Math.PI * 2;
      const [ex, ey] = pt(ang, 16 + Math.random() * 12);
      const dur = (0.5 + Math.random() * 0.4).toFixed(2);
      const t = `dur="${dur}s" begin="-${(Math.random() * dur).toFixed(2)}s" repeatCount="indefinite"`;
      out += `<circle cx="${x}" cy="${y}" r="1.8" fill="${c.a}">` +
        `<animate attributeName="cx" values="${x};${ex}" ${t}/>` +
        `<animate attributeName="cy" values="${y};${f(+ey + 4)}" ${t}/>` +
        `<animate attributeName="opacity" values="1;0" ${t}/></circle>`;
    }
  }
  out += `<circle cx="${x}" cy="${y}" r="3.6" fill="${c.core}"/></g>`;
  return out;
}

const ARROW_ROT = { [K.UP]: 0, [K.RIGHT]: 90, [K.DOWN]: 180, [K.LEFT]: 270 };
const KIND_NAME = {
  [K.BOMB]: 'Bomba', [K.BARREL]: 'Barril', [K.UP]: 'Flecha hacia arriba', [K.RIGHT]: 'Flecha a la derecha',
  [K.DOWN]: 'Flecha hacia abajo', [K.LEFT]: 'Flecha a la izquierda', [K.TIMER]: 'Temporizador',
};

// La bomba se dibuja algo más pequeña y abajo a la izquierda para dejar sitio a la bengala.
function bombSVG(v) {
  const charge = Math.min(chargeOf(v), 4);
  const kind = kindOf(v);
  const armor = armorOf(v);
  const f = FUSES[charge];
  let s = `<svg class="art" viewBox="0 0 100 100" aria-hidden="true">` +
    `<use href="#${kind === K.BARREL ? 'barrel' : 'bomb'}" x="-4" y="14" width="88" height="88"/>`;
  if (kind === K.BARREL) s += `<path class="fuse" d="M53 44 L56 38"/>`;
  if (f.d) s += `<path class="fuse" d="${f.d}"/>`;
  // Con hielo o escudo la mecha está apagada; si no, arde la bengala.
  if (armor === 0) s += sparkSVG(charge, f.x, f.y);
  else s += `<circle cx="${f.x}" cy="${f.y}" r="2.6" fill="#6b6559"/>`;
  return s + `</svg>`;
}

// Capas a tamaño de casilla, centradas: detrás de la bomba (flecha, reloj)
// y delante (hielo, escudo, número del temporizador).
const layer = (cls, inner) => `<svg class="layer ${cls}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
function underLayer(v) {
  const kind = kindOf(v);
  if (isArrow(kind)) {
    return layer('under', `<use href="#arrow-bg" transform="rotate(${ARROW_ROT[kind]} 50 50)"/>`);
  }
  if (kind === K.TIMER) {
    // esfera de reloj: 3 tramos, se iluminan según los toques ya hechos
    const done = state.taps % TIMER_EVERY;
    let arcs = '';
    for (let k = 0; k < TIMER_EVERY; k++) {
      const a0 = -90 + k * 120 + 6, a1 = a0 + 108, r = 44;
      const p = (a) => `${(50 + r * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(50 + r * Math.sin(a * Math.PI / 180)).toFixed(1)}`;
      arcs += `<path d="M${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="${k < done ? 0.95 : 0.25}"/>`;
    }
    return layer('under', arcs);
  }
  return '';
}
function overLayer(v) {
  const armor = armorOf(v);
  let s = '';
  if (armor > 0) s += `<use href="#${hasShield(v) ? (armor === 2 ? 'shield' : 'shield-cracked') : 'ice'}"/>`;
  if (kindOf(v) === K.TIMER) {
    const left = TIMER_EVERY - (state.taps % TIMER_EVERY);
    s += `<circle cx="20" cy="20" r="13" fill="#fff" stroke="var(--accent)" stroke-width="3"/>` +
      `<text x="20" y="25.5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#232733">${left}</text>`;
  }
  return s ? layer('over', s) : '';
}
function pips(v) {
  return `<span class="pips">${[1, 2, 3].map((k) => `<i class="${k <= v ? 'on' : ''}"></i>`).join('')}</span>`;
}
function describe(v) {
  const charge = Math.min(chargeOf(v), 4);
  let s = `${KIND_NAME[kindOf(v)]}, ${LABELS[charge]}`;
  const armor = armorOf(v);
  if (armor) s += hasShield(v) ? (armor === 2 ? ', con escudo' : ', escudo agrietado') : ', congelada';
  if (kindOf(v) === K.TIMER) s += `, suma 1 en ${TIMER_EVERY - (state.taps % TIMER_EVERY)} toques`;
  return s;
}
function paintCell(el, v, i) {
  const charge = v > 0 ? Math.min(chargeOf(v), 4) : 0;
  const cls = v === WALL ? 'wall' : v === FRAGILE ? 'wall fragile' : v <= 0 ? 'empty' : `v${charge}`;
  el.className = `cell ${cls}${v === 0 && state.burnt.has(i) ? ' burnt' : ''}${armorOf(v) && v > 0 ? ' armored' : ''}`;
  el.dataset.v = v;
  if (v === WALL || v === FRAGILE) {
    el.innerHTML = `<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#${v === WALL ? 'wall' : 'fragile'}"/></svg>`;
    el.setAttribute('aria-label', v === WALL ? 'Muro' : 'Muro frágil');
  } else if (v <= 0) {
    el.innerHTML = '<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#scorch"/></svg>';
    el.setAttribute('aria-label', 'Vacía');
  } else {
    el.innerHTML = underLayer(v) + bombSVG(v) + overLayer(v) + (charge < 4 ? pips(charge) : '');
    el.setAttribute('aria-label', describe(v));
  }
  el.disabled = !(v > 0);
}

function buildBoard() {
  els.board.innerHTML = '';
  for (let i = 0; i < CELLS; i++) {
    const b = document.createElement('button');
    b.dataset.i = i;
    b.setAttribute('role', 'gridcell');
    els.board.appendChild(b);
  }
}
const cellEl = (i) => els.board.children[i];

function render(board, prev = null) {
  for (let i = 0; i < CELLS; i++) {
    // los temporizadores se repintan siempre: su número depende de los toques
    const timer = board[i] > 0 && kindOf(board[i]) === K.TIMER;
    if (!prev || prev[i] !== board[i] || timer) paintCell(cellEl(i), board[i], i);
  }
}

function renderHud() {
  els.taps.textContent = state.taps;
  els.par.textContent = state.puzzle ? state.puzzle.par : '–';
  els.taps.parentElement.classList.toggle('over', state.puzzle && state.taps > state.puzzle.par);
  const shareable = state.mode === 'daily' && dailyResult();
  els.share.hidden = !shareable;
}

function flashClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* ---------- Juego ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = reduceMotion ? { pre: 40, boom: 60, after: 40 } : { pre: 170, boom: 190, after: 110 };

async function onTap(i) {
  if (state.busy || state.won || !(state.board[i] > 0)) return;
  const result = tap(state.board, i, state.taps);
  state.busy = true;
  state.taps += 1;
  flashClass(els.taps, 'tick');
  renderHud();

  // 1) la bomba tocada sube de carga (o pierde una capa de hielo/escudo)
  const before = state.board;
  const bumped = before.slice();
  bumped[i] = armorOf(bumped[i]) > 0 ? bumped[i] - 32 : bumped[i] + 1;
  render(bumped, before);
  flashClass(cellEl(i), 'bump');
  let shown = bumped;

  // 2) oleadas (y el tic de los temporizadores)
  const total = explosionsOf(result);
  if (result.waves.length) await sleep(T.pre);
  const boomAt = (c, small) => {
    const boom = document.createElement('div');
    boom.className = small ? 'boom small' : 'boom';
    boom.innerHTML = '<svg viewBox="0 0 100 100"><use href="#burst"/></svg>';
    cellEl(c).appendChild(boom);
  };
  for (const [k, wave] of result.waves.entries()) {
    const speed = Math.max(0.45, 1 - k * 0.07); // las cadenas largas se aceleran
    if (wave.tick) {
      els.combo.textContent = '⏱️ +1';
      flashClass(els.combo, 'show');
      await sleep(T.after);
    }
    for (const c of wave.exploded) { state.burnt.add(c); boomAt(c, false); }
    for (const c of wave.broken) { state.burnt.add(c); boomAt(c, true); }
    if (wave.exploded.length && navigator.userActivation?.hasBeenActive) {
      navigator.vibrate?.(wave.exploded.length > 2 ? 30 : 15);
    }
    if (!wave.tick) await sleep(T.boom * speed);
    render(wave.board, shown);
    shown = wave.board;
    for (const c of wave.received) flashClass(cellEl(c), 'hit');
    await sleep(T.after * speed);
  }
  if (total >= 6) flashClass(els.board, 'shake');
  if (total >= 3) {
    els.combo.textContent = `¡Cadena ×${total}!`;
    flashClass(els.combo, 'show');
  }

  state.board = result.board;
  state.log.push(total);
  render(state.board, shown);
  state.busy = false;
  saveProgress();
  if (isCleared(state.board)) onWin();
}

function onWin() {
  state.won = true;
  if (state.mode === 'daily' && !dailyResult()) {
    const emojis = state.log.map(tapEmoji).join('');
    state.stats = recordWin(state.stats, state.daily.number, state.taps, state.puzzle.par, emojis);
    saveStats(state.stats);
  }
  if (state.mode === 'levels') {
    const p = loadLevels();
    const { level } = FLAT[state.cur];
    const before = totalStars(CHAPTERS, p.best);
    const prevBest = p.best[level.id];
    p.best[level.id] = prevBest == null ? state.taps : Math.min(prevBest, state.taps);
    saveLevels(p);
    const after = totalStars(CHAPTERS, p.best);
    renderHud();
    setLevelLabels();
    setTimeout(() => openLevelWin(before, after, prevBest), reduceMotion ? 100 : 650);
    return;
  }
  renderHud();
  setTimeout(() => openStats(true), reduceMotion ? 100 : 650);
}

/* ---------- Victoria en un nivel: estrellas y desbloqueos ---------- */
const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
const starSVG = (on) => `<svg class="star ${on ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
const starsRow = (n) => [0, 1, 2].map((k) => starSVG(k < n)).join('');
const WIN_TITLES = ['¡Tablero limpio!', '¡Conseguido!', '¡Muy bien!', '¡Perfecto!'];

function openLevelWin(before, after, prevBest) {
  const { level } = FLAT[state.cur];
  const got = starsFor(state.taps, level.par);
  $('lv-stars').innerHTML = starsRow(got);
  $('lv-stars').setAttribute('aria-label', `${got} de 3 estrellas`);
  $('lv-title').textContent = WIN_TITLES[got];
  let sub = `${state.taps} toques · objetivo ${level.par}`;
  if (got < 3) sub += ` · con ${level.par} toques: 3 estrellas`;
  $('lv-sub').textContent = sub;
  const opened = newlyUnlocked(CHAPTERS, before, after);
  const unlock = $('lv-unlock');
  unlock.hidden = !opened.length;
  if (opened.length) unlock.textContent = `🔓 ¡Desbloqueado: ${opened.map((c) => c.name).join(', ')}!`;
  const better = prevBest != null && state.taps < prevBest;
  $('lv-record').hidden = !better;
  const next = $('lv-next');
  const hasNext = state.cur + 1 < FLAT.length;
  next.hidden = !hasNext;
  next.disabled = !isOpen(state.cur + 1);
  if (hasNext && next.disabled) {
    const need = FLAT[state.cur + 1].chapter.need;
    $('lv-lock').hidden = false;
    $('lv-lock').textContent = `🔒 Para el siguiente capítulo: ${after}/${need} ⭐`;
  } else $('lv-lock').hidden = true;
  if (!els.dlgLevel.open) els.dlgLevel.showModal();
}

function reset() {
  if (state.busy || !state.puzzle) return;
  state.board = state.puzzle.board.slice();
  state.burnt = new Set();
  state.taps = 0;
  state.log = [];
  state.won = false;
  render(state.board);
  renderHud();
  saveProgress();
}

/* ---------- Progreso del día (por si se cierra la app a medias) ---------- */
const progressKey = () => `mecha:progress:${state.daily?.key}`;
function saveProgress() {
  if (state.mode !== 'daily' || !state.daily) return;
  try {
    localStorage.setItem(progressKey(), JSON.stringify({
      board: state.board, taps: state.taps, log: state.log, burnt: [...state.burnt],
    }));
  } catch {}
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(progressKey())); } catch { return null; }
}

/* ---------- Modos ---------- */
function dailyResult() {
  return state.daily && state.stats.history[state.daily.number];
}

function setPuzzle(puzzle, { eyebrow, title, tip = '' }) {
  state.puzzle = puzzle;
  els.eyebrow.textContent = eyebrow;
  els.title.textContent = title;
  els.tip.textContent = tip;
  els.tip.hidden = !tip;
  els.loading.hidden = true;
  state.busy = false;
  reset();
}

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(',', '').replace(/\.$/, '');
}

async function showDaily() {
  state.mode = 'daily';
  setTabs();
  setMap(false);
  els.prev.hidden = els.next.hidden = true;
  if (!state.daily) {
    els.loading.hidden = false;
    state.busy = true;
    state.daily = await getDaily(dateKey());
  }
  setPuzzle(state.daily, { eyebrow: `Reto #${state.daily.number}`, title: formatDay(state.daily.key) });
  const saved = loadProgress();
  if (dailyResult()) {
    // ya resuelto hoy: tablero limpio y resultado
    state.board = state.board.map((v) => (v === WALL ? WALL : 0));
    state.burnt = new Set(state.board.map((_, i) => i));
    state.taps = dailyResult().taps;
    state.won = true;
    render(state.board);
    renderHud();
  } else if (saved && saved.board?.length === CELLS) {
    Object.assign(state, { board: saved.board, taps: saved.taps, log: saved.log, burnt: new Set(saved.burnt) });
    render(state.board);
    renderHud();
  }
}

/* ---------- Modo Niveles: mapa de capítulos y partida ---------- */
function setMap(on) {
  els.app.classList.toggle('on-map', on);
  els.map.hidden = !on;
}

function showLevels() {
  state.mode = 'levels';
  state.busy = false;
  setTabs();
  renderMap();
  setMap(true);
  // arriba del todo; solo se desplaza si el nivel actual queda fuera de la pantalla
  window.scrollTo(0, 0);
  els.map.querySelector('.lvl.current')?.scrollIntoView({ block: 'nearest' });
}

function renderMap() {
  const { best } = loadLevels();
  const total = totalStars(CHAPTERS, best);
  let html = `<div class="map-head"><span class="map-total">${starSVG(true)}<b>${total}</b> / ${MAX_STARS}</span>` +
    `<span class="map-hint">` +
    [[3, 'objetivo'], [2, 'objetivo +1'], [1, 'objetivo +2']]
      .map(([n, t]) => `<span class="hint-item"><span class="hint-stars">${starSVG(true).repeat(n)}</span>${t}</span>`)
      .join('<span class="hint-dot">·</span>') +
    `</span></div>`;
  let flat = 0;
  CHAPTERS.forEach((ch, c) => {
    const open = chapterUnlocked(ch, CHAPTERS, best);
    const sub = open
      ? `${chapterStars(ch, best)} / ${ch.levels.length * 3} estrellas`
      : `🔒 Consigue ${ch.need} ⭐ · te faltan ${ch.need - total}`;
    html += `<section class="chapter${open ? '' : ' locked'}">` +
      `<div class="ch-head"><span class="mini" data-v="${ch.icon}"></span>` +
      `<div><div class="ch-name">${ch.name}</div><div class="ch-sub">${sub}</div></div></div><div class="ch-levels">`;
    ch.levels.forEach((l, n) => {
      const i = flat++;
      const unlocked = levelUnlocked(CHAPTERS, best, c, n);
      const done = best[l.id] != null;
      const cls = `lvl${unlocked ? '' : ' locked'}${done ? ' done' : ''}${i === state.cur && unlocked ? ' current' : ''}`;
      html += `<button class="${cls}" data-i="${i}" ${unlocked ? '' : 'disabled'} aria-label="${l.name}${done ? `, ${levelStars(l, best)} estrellas` : ''}${unlocked ? '' : ', bloqueado'}">` +
        `<span class="lvl-n">${unlocked ? i + 1 : '🔒'}</span>` +
        `<span class="lvl-name">${l.name}</span>` +
        `<span class="lvl-stars">${starsRow(levelStars(l, best))}</span></button>`;
    });
    html += `</div></section>`;
  });
  els.map.innerHTML = html;
  for (const m of els.map.querySelectorAll('.mini')) {
    paintCell(m, Number(m.dataset.v), -1);
    m.classList.add('mini');
    m.removeAttribute('aria-label');
  }
}

function setLevelLabels() {
  const { level } = FLAT[state.cur];
  const s = levelStars(level, loadLevels().best);
  els.eyebrow.innerHTML = `Nivel ${state.cur + 1} <span class="eb-stars">${starsRow(s)}</span>`;
  els.title.textContent = level.name;
  els.prev.disabled = state.cur === 0;
  els.next.disabled = !isOpen(state.cur + 1);
}

function playLevel(i) {
  if (!isOpen(i)) return;
  state.mode = 'levels';
  state.cur = i;
  const p = loadLevels(); p.cur = i; saveLevels(p);
  setTabs();
  setMap(false);
  els.prev.hidden = els.next.hidden = false;
  const { level } = FLAT[i];
  setPuzzle({ board: level.board, par: level.par }, { eyebrow: '', title: level.name, tip: level.tip });
  setLevelLabels();
}

function setTabs() {
  els.tabDaily.setAttribute('aria-selected', state.mode === 'daily');
  els.tabPractice.setAttribute('aria-selected', state.mode === 'levels');
}

/* ---------- Generación (en un worker para no bloquear) ---------- */
let worker = null;
function runWorker(msg) {
  return new Promise((resolve, reject) => {
    try {
      worker ??= new Worker(new URL('./worker.js?v=20', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => (e.data.ok ? resolve(e.data.puzzle) : reject(e.data.error));
      worker.onerror = (e) => { worker = null; reject(e); };
      worker.postMessage(msg);
    } catch (err) { reject(err); }
  });
}
async function runInline(msg) {
  const m = await import('./daily.js');
  return msg.key ? m.dailyPuzzle(msg.key) : m.randomPractice(msg.seed);
}
const gen = (msg) => runWorker(msg).catch(() => runInline(msg));

async function getDaily(key) {
  const cacheKey = `mecha:puzzle:v${GEN_VERSION}:${key}`;
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey));
    if (c?.board) return c;
  } catch {}
  const p = await gen({ key });
  try { localStorage.setItem(cacheKey, JSON.stringify(p)); } catch {}
  return p;
}

/* ---------- Estadísticas, compartir ---------- */
function openStats(fromWin = false) {
  const s = state.stats;
  const today = state.daily ? state.daily.number : dayNumber(dateKey());
  $('st-played').textContent = s.played;
  $('st-streak').textContent = currentStreak(s, today);
  $('st-best').textContent = s.best;
  $('st-perfect').textContent = s.perfect;

  const res = dailyResult();
  const showWin = (fromWin && state.won) || (state.mode === 'daily' && res);
  $('win-block').hidden = !showWin;
  els.share2.hidden = !res;
  if (showWin) {
    const taps = state.mode === 'daily' && res ? res.taps : state.taps;
    const par = state.puzzle.par;
    $('win-title').textContent = taps <= par ? '¡Objetivo cumplido!' : '¡Tablero limpio!';
    $('win-sub').textContent = `${taps} toques · objetivo ${par}`;
    $('win-emojis').textContent = state.mode === 'daily' && res ? res.emojis : state.log.map(tapEmoji).join('');
  }
  if (!els.dlgStats.open) els.dlgStats.showModal();
  tickCountdown();
}

function tickCountdown() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  const p = (n) => String(n).padStart(2, '0');
  $('countdown').textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
setInterval(() => {
  if (els.dlgStats.open) tickCountdown();
  // si cambia el día con la app abierta, recarga el reto
  if (state.daily && dateKey() !== state.daily.key && !state.busy) {
    state.daily = null;
    if (state.mode === 'daily') showDaily();
  }
}, 1000);

async function share() {
  const res = dailyResult();
  if (!res) return;
  const text = shareText({
    number: state.daily.number, taps: res.taps, par: res.par, emojis: res.emojis,
    streak: currentStreak(state.stats, state.daily.number),
    url: location.href.split('#')[0].split('?')[0],
  });
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Resultado copiado');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('No se pudo compartir');
  }
}

let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

/* ---------- Ayuda: mini casillas ilustradas ---------- */
function fillHelp() {
  for (const m of document.querySelectorAll('.mini')) {
    if (m.classList.contains('burst')) {
      m.className = 'mini cell v3';
      m.innerHTML = '<svg class="art" viewBox="0 0 100 100"><use href="#burst"/></svg>';
      continue;
    }
    const v = Number(m.dataset.v);
    paintCell(m, v, -1);
    m.classList.add('mini');
    m.removeAttribute('aria-label');
  }
}

/* ---------- Arranque ---------- */
buildBoard();
fillHelp();
for (const g of document.querySelectorAll('.logo-spark')) g.innerHTML = sparkSVG(2, 54, 14);
els.board.addEventListener('click', (e) => {
  const c = e.target.closest('.cell');
  if (c) onTap(Number(c.dataset.i));
});
els.reset.addEventListener('click', () => {
  if (state.mode === 'daily' && dailyResult()) {
    // rejugar el reto de hoy (no cuenta para las estadísticas)
    state.won = false;
  }
  reset();
});
els.share.addEventListener('click', share);
els.share2.addEventListener('click', share);
els.tabDaily.addEventListener('click', () => state.mode !== 'daily' && showDaily());
// La pestaña Niveles lleva siempre al mapa (también desde una partida)
els.tabPractice.addEventListener('click', () => { if (!state.busy) showLevels(); });
els.map.addEventListener('click', (e) => {
  const b = e.target.closest('.lvl');
  if (b && !b.disabled) playLevel(Number(b.dataset.i));
});
els.prev.addEventListener('click', () => playLevel(state.cur - 1));
els.next.addEventListener('click', () => playLevel(state.cur + 1));
$('lv-retry').addEventListener('click', () => { els.dlgLevel.close(); reset(); });
$('lv-next').addEventListener('click', () => { els.dlgLevel.close(); playLevel(state.cur + 1); });
$('lv-map').addEventListener('click', () => { els.dlgLevel.close(); showLevels(); });
$('btn-help').addEventListener('click', () => els.dlgHelp.showModal());
$('btn-stats').addEventListener('click', () => openStats(false));
for (const d of [els.dlgHelp, els.dlgStats, els.dlgLevel]) {
  d.addEventListener('click', (e) => {
    const r = d.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if ((e.target === d && outside) || e.target.closest('[data-close]')) d.close();
  });
}

try {
  if (!localStorage.getItem('mecha:seen-help')) {
    els.dlgHelp.showModal();
    localStorage.setItem('mecha:seen-help', '1');
  }
} catch {}

showDaily();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Si llega una versión nueva mientras la app está abierta, se recarga sola
  // (salvo a mitad de una partida: entonces se aplica la próxima vez que se abra).
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !state.busy && (state.taps === 0 || state.won)) location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      // al volver a la app desde segundo plano, busca actualizaciones
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    })
    .catch(() => {});
}
