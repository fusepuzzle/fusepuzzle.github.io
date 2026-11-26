// Genera js/levels.js: capítulos de 3 niveles. El primero solo con bombas y muros;
// cada capítulo siguiente presenta un elemento nuevo y el último los mezcla.
// Para abrir un capítulo hacen falta estrellas (STARS_PER_CHAPTER por cada
// capítulo anterior). Uso: node tools/make-levels.mjs
import { writeFileSync } from 'node:fs';
import { generate } from '../js/daily.js';
import { verify } from '../js/solver.js';

const STARS_PER_CHAPTER = 6; // de 9 posibles: media de 2 estrellas por nivel

// icon: valor de casilla que se dibuja en la tarjeta del capítulo
const CHAPTERS = [
  { id: 'basico', name: 'Primeras chispas', icon: 2, levels: [
    { name: 'Primer toque', els: null, par: [3, 4], tip: 'Toca las bombas rojas: con 4 de carga explotan y cargan a sus vecinas.' },
    { name: 'Cadenas', els: null, par: [4, 5], tip: 'Prepara varias bombas y deja que una cadena haga el trabajo.' },
    { name: 'Muros', els: null, par: [5, 6], walls: true, tip: 'Los muros cortan las cadenas: cada lado necesita su chispa.' },
  ] },
  { id: 'hielo', name: 'Hielo', icon: 34, levels: [
    { name: 'Hielo', els: { ice: 2 }, par: [4, 6], tip: '🧊 Hielo: el primer impacto solo rompe el hielo; después es una bomba normal.' },
    { name: 'Escarcha', els: { ice: 3 }, par: [5, 7], tip: '🧊 Rompe el hielo antes de que la cadena llegue a él.' },
    { name: 'Glaciar', els: { ice: 5 }, par: [6, 8], tip: '🧊 Mucho hielo: cada impacto cuenta.' },
  ] },
  { id: 'escudo', name: 'Escudo', icon: 1090, levels: [
    { name: 'Escudo', els: { shield: 1 }, par: [4, 7], tip: '🛡️ Escudo: aguanta dos impactos antes de empezar a cargarse.' },
    { name: 'Doble escudo', els: { shield: 2 }, par: [5, 8], tip: '🛡️ Deja los escudos para el final… o no.' },
    { name: 'Blindados', els: { shield: 2, ice: 2 }, par: [6, 9], tip: '🛡️🧊 Escudo y hielo juntos.' },
  ] },
  { id: 'barril', name: 'Barril', icon: 130, levels: [
    { name: 'Barril', els: { barrel: 1 }, par: [4, 7], tip: '🛢️ Barril: al explotar alcanza también las diagonales (8 casillas).' },
    { name: 'Polvorín', els: { barrel: 2 }, par: [5, 8], tip: '🛢️ Dos barriles: busca dónde se cruzan.' },
    { name: 'Barril y hielo', els: { barrel: 2, ice: 2 }, par: [5, 8], tip: '🛢️🧊 Un barril puede romper varios hielos de golpe.' },
  ] },
  { id: 'flechas', name: 'Flechas', icon: 386, levels: [
    { name: 'Flechas', els: { arrow: 2 }, par: [4, 7], tip: '➡️ Flecha: su explosión recorre toda la línea hasta un muro, cargando cada bomba del camino.' },
    { name: 'Lluvia de flechas', els: { arrow: 3 }, par: [5, 8], tip: '➡️ Las flechas no cargan a sus vecinas de los lados, solo hacia donde apuntan.' },
    { name: 'Diana', els: { arrow: 2, barrel: 1 }, par: [5, 8], tip: '➡️🛢️ Apunta bien: una flecha puede despertar a un barril.' },
  ] },
  { id: 'fragil', name: 'Muro frágil', icon: -2, levels: [
    { name: 'Muro frágil', els: { fragile: 1 }, par: [5, 7], tip: '🧱 Corta las cadenas hasta que una explosión lo rompe: entonces la chispa lo atraviesa y carga la bomba de detrás.' },
    { name: 'Grietas', els: { fragile: 3 }, par: [5, 8], tip: '🧱 Cada muro frágil es un puente de un solo uso: rómpelo desde el lado que te convenga.' },
    { name: 'Derribo', els: { fragile: 2, arrow: 2 }, par: [5, 8], tip: '🧱➡️ Una flecha rompe el primer muro frágil que encuentra y su chispa carga la bomba de justo detrás.' },
  ] },
  { id: 'reloj', name: 'Temporizador', icon: 770, levels: [
    { name: 'Tic tac', els: { timer: 1 }, par: [5, 8], tip: '⏱️ Suma 1 de carga sola cada 3 toques tuyos, toques donde toques.' },
    { name: 'Cuenta atrás', els: { timer: 1, ice: 2 }, par: [5, 8], tip: '⏱️🧊 El tic también rompe el hielo del temporizador.' },
    { name: 'Contrarreloj', els: { timer: 2, ice: 2 }, par: [5, 9], tip: '⏱️ Cuadra los tics para que exploten cuando te convenga.' },
  ] },
  { id: 'final', name: 'Gran final', icon: 3, levels: [
    { name: 'Todo junto', els: { ice: 1, shield: 1, barrel: 1, arrow: 1, fragile: 1, timer: 1 }, par: [6, 9], tip: '🎇 Un poco de todo. Piensa el orden.' },
    { name: 'Caos', els: { ice: 2, shield: 1, barrel: 2, arrow: 2, fragile: 1 }, par: [6, 9], tip: '💥 Mucho que romper y poco margen.' },
    { name: 'Traca final', els: { ice: 2, shield: 1, barrel: 2, arrow: 2, fragile: 2, timer: 1 }, par: [6, 10], tip: '💣 El nivel más duro del juego.' },
  ] },
];

const hasWall = (b) => b.includes(-1);
const out = [];
for (const [c, ch] of CHAPTERS.entries()) {
  const levels = [];
  for (const [n, l] of ch.levels.entries()) {
    const t = performance.now();
    // los básicos: el 1 y el 2 sin muros, el 3 con muros
    let g, k = 0;
    do {
      g = generate(`nivel-${ch.id}-${n}-${k++}`, { parMin: l.par[0], parMax: l.par[1], elements: l.els, nodes: 3_000_000 });
    } while (!l.els && hasWall(g.board) !== !!l.walls);
    if (!verify(g.board, g.solution)) throw new Error('solución inválida en ' + l.name);
    levels.push({ id: `${ch.id}-${n + 1}`, name: l.name, tip: l.tip, board: g.board, par: g.par });
    console.log(ch.name.padEnd(14), l.name.padEnd(18), 'objetivo', g.par, `${Math.round(performance.now() - t)}ms`);
  }
  out.push({ id: ch.id, name: ch.name, icon: ch.icon, need: c * STARS_PER_CHAPTER, levels });
}

const body = out.map((ch) => {
  const lv = ch.levels.map((l) => `    ${JSON.stringify(l)},`).join('\n');
  return `  { id: ${JSON.stringify(ch.id)}, name: ${JSON.stringify(ch.name)}, icon: ${ch.icon}, need: ${ch.need}, levels: [\n${lv}\n  ] },`;
}).join('\n');
writeFileSync(new URL('../js/levels.js', import.meta.url),
  `// Generado por tools/make-levels.mjs — no editar a mano.\n` +
  `// Capítulos de 3 niveles; "need" = estrellas necesarias para abrir el capítulo.\n` +
  `export const CHAPTERS = [\n${body}\n];\n`);
console.log(out.length, 'capítulos');
