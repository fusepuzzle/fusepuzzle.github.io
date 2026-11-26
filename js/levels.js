// Generado por tools/make-levels.mjs — no editar a mano.
// Capítulos de 3 niveles; "need" = estrellas necesarias para abrir el capítulo.
export const CHAPTERS = [
  { id: "basico", name: "Primeras chispas", icon: 2, need: 0, levels: [
    {"id":"basico-1","name":"Primer toque","tip":"Toca las bombas rojas: con 4 de carga explotan y cargan a sus vecinas.","board":[1,1,3,1,3,3,2,3,3,3,2,2,2,1,1,2,3,3,2,3,3,2,2,3,3],"par":4},
    {"id":"basico-2","name":"Cadenas","tip":"Prepara varias bombas y deja que una cadena haga el trabajo.","board":[1,3,2,1,3,3,3,3,1,3,1,3,1,3,3,3,1,3,3,2,1,2,3,3,3],"par":5},
    {"id":"basico-3","name":"Muros","tip":"Los muros cortan las cadenas: cada lado necesita su chispa.","board":[3,1,1,3,3,3,2,2,2,1,3,3,-1,2,3,2,3,1,3,1,3,1,3,3,2],"par":6},
  ] },
  { id: "hielo", name: "Hielo", icon: 34, need: 6, levels: [
    {"id":"hielo-1","name":"Hielo","tip":"🧊 Hielo: el primer impacto solo rompe el hielo; después es una bomba normal.","board":[-1,3,2,2,3,3,3,2,1,3,3,3,-1,2,3,34,3,3,2,3,3,1,3,34,-1],"par":5},
    {"id":"hielo-2","name":"Escarcha","tip":"🧊 Rompe el hielo antes de que la cadena llegue a él.","board":[34,3,1,-1,35,3,3,35,3,3,1,1,3,1,3,3,2,3,2,3,2,-1,3,3,2],"par":6},
    {"id":"hielo-3","name":"Glaciar","tip":"🧊 Mucho hielo: cada impacto cuenta.","board":[3,35,35,3,3,3,34,35,-1,-1,3,2,34,2,2,-1,-1,3,3,2,3,3,2,3,2],"par":6},
  ] },
  { id: "escudo", name: "Escudo", icon: 1090, need: 12, levels: [
    {"id":"escudo-1","name":"Escudo","tip":"🛡️ Escudo: aguanta dos impactos antes de empezar a cargarse.","board":[3,2,3,3,1,3,3,2,1,3,3,2,-1,1,3,3,3,3,3,1,3,2,1089,1,3],"par":7},
    {"id":"escudo-2","name":"Doble escudo","tip":"🛡️ Deja los escudos para el final… o no.","board":[3,2,2,3,2,2,3,1,3,1,3,2,3,1,1091,3,1091,2,3,3,2,2,3,3,3],"par":5},
    {"id":"escudo-3","name":"Blindados","tip":"🛡️🧊 Escudo y hielo juntos.","board":[3,3,3,3,3,-1,1,3,1,3,2,2,3,34,3,1091,3,2,34,-1,2,3,1,2,1091],"par":8},
  ] },
  { id: "barril", name: "Barril", icon: 130, need: 18, levels: [
    {"id":"barril-1","name":"Barril","tip":"🛢️ Barril: al explotar alcanza también las diagonales (8 casillas).","board":[2,3,2,1,2,2,2,3,2,3,3,3,3,2,2,3,3,3,129,1,1,1,3,3,1],"par":6},
    {"id":"barril-2","name":"Polvorín","tip":"🛢️ Dos barriles: busca dónde se cruzan.","board":[129,3,-1,1,3,2,3,3,3,2,1,3,-1,1,3,1,3,130,2,1,2,3,-1,3,2],"par":8},
    {"id":"barril-3","name":"Barril y hielo","tip":"🛢️🧊 Un barril puede romper varios hielos de golpe.","board":[2,2,2,3,3,3,2,-1,33,131,2,35,-1,3,2,131,3,-1,3,2,2,3,1,3,2],"par":5},
  ] },
  { id: "flechas", name: "Flechas", icon: 386, need: 24, levels: [
    {"id":"flechas-1","name":"Flechas","tip":"➡️ Flecha: su explosión recorre toda la línea hasta un muro, cargando cada bomba del camino.","board":[3,3,3,-1,2,3,3,3,3,1,3,1,2,3,3,3,513,3,2,514,1,-1,1,2,3],"par":6},
    {"id":"flechas-2","name":"Lluvia de flechas","tip":"➡️ Las flechas no cargan a sus vecinas de los lados, solo hacia donde apuntan.","board":[3,3,2,1,3,3,3,2,-1,2,2,3,2,1,3,2,-1,259,2,2,259,2,387,3,2],"par":5},
    {"id":"flechas-3","name":"Diana","tip":"➡️🛢️ Apunta bien: una flecha puede despertar a un barril.","board":[129,3,1,2,1,3,3,3,386,2,3,2,3,3,515,1,2,2,2,2,2,3,3,3,1],"par":8},
  ] },
  { id: "fragil", name: "Muro frágil", icon: -2, need: 30, levels: [
    {"id":"fragil-1","name":"Muro frágil","tip":"🧱 Corta cadenas, pero hay que romperlo con una explosión al lado para ganar.","board":[-1,2,-1,-2,3,2,3,3,2,3,3,3,1,3,3,2,1,2,3,3,2,3,-1,1,-1],"par":5},
    {"id":"fragil-2","name":"Grietas","tip":"🧱 Rómpelo pronto para abrir paso… y no dejes que se quede solo.","board":[3,1,-2,3,3,3,3,2,2,2,3,2,-1,-2,2,3,3,2,2,2,1,2,3,3,3],"par":6},
    {"id":"fragil-3","name":"Derribo","tip":"🧱➡️ Una flecha rompe el primer muro frágil que encuentra y se para ahí.","board":[1,513,2,3,3,2,2,3,2,515,3,3,-2,1,1,1,2,-2,2,2,1,2,2,3,3],"par":8},
  ] },
  { id: "reloj", name: "Temporizador", icon: 770, need: 36, levels: [
    {"id":"reloj-1","name":"Tic tac","tip":"⏱️ Suma 1 de carga sola cada 3 toques tuyos, toques donde toques.","board":[-1,2,3,2,769,3,1,3,2,2,2,2,-1,2,3,1,2,1,3,3,3,3,3,1,-1],"par":7},
    {"id":"reloj-2","name":"Cuenta atrás","tip":"⏱️🧊 El tic también rompe el hielo del temporizador.","board":[-1,3,770,3,1,2,3,2,1,2,2,3,3,2,1,33,3,3,2,33,3,3,3,3,-1],"par":7},
    {"id":"reloj-3","name":"Contrarreloj","tip":"⏱️ Cuadra los tics para que exploten cuando te convenga.","board":[33,1,-1,3,3,3,770,3,3,3,3,-1,-1,-1,1,3,1,3,2,3,2,3,-1,34,769],"par":9},
  ] },
  { id: "final", name: "Gran final", icon: 3, need: 42, levels: [
    {"id":"final-1","name":"Todo junto","tip":"🎇 Un poco de todo. Piensa el orden.","board":[1089,3,2,3,3,1,769,3,1,3,1,3,641,-2,1,3,2,3,130,2,3,35,3,2,2],"par":7},
    {"id":"final-2","name":"Caos","tip":"💥 Mucho que romper y poco margen.","board":[35,3,2,2,3,3,2,3,1,3,131,1,1,259,-2,1090,3,2,2,129,643,3,34,3,2],"par":6},
    {"id":"final-3","name":"Traca final","tip":"💣 El nivel más duro del juego.","board":[2,3,2,2,641,3,770,34,131,1090,-1,-2,1,-2,-1,2,3,3,33,3,514,3,3,2,130],"par":8},
  ] },
];
