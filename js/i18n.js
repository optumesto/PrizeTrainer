// ═══════════ 3.0: Spanish and Portuguese ═══════════
// The app's text lives in template literals all over js/ and in index.html, so nothing
// here rewrites a template. Instead this file translates what is drawn: it walks the
// text nodes (and the placeholder, title and aria-label attributes) under <body>, looks
// each one up in a dictionary keyed on the exact English text, and a MutationObserver
// does the same for every screen, sheet and toast drawn later. Each node keeps its
// English, so switching language (English included) needs no reload.
//
// To add a string: add the English text, exactly as shown on screen (spaces inside are
// squeezed to one, ends trimmed), to I18N_ES and I18N_PT below. Text that holds a number
// or a name goes in I18N_PAT as [regex, Spanish, Portuguese]. A string missing from a
// language simply stays English. Text made of several sentences is translated sentence by
// sentence when every sentence is known, so a sentence needs adding only once.
//
// Never translated: card names, attack and Ability names, card text, deck and archetype
// names (official card data, or the player's own words). Elements that show them are
// skipped (I18N_SKIP below, or a data-no-tr attribute), and a text node whose whole text
// is a card name is never changed. tests/i18n-check.mjs fails if a dictionary key is a
// card name. Legal pages, deck guides and ads are not part of the app and stay English.

const I18N_LANGS = [['en', 'English'], ['es', 'Español'], ['pt', 'Português']];
const I18N_HTML_LANG = { en: 'en', es: 'es', pt: 'pt-BR' };
// 3.0.2: more languages, each in its own file (js/i18n-fr.js and so on), downloaded only when a
// player picks it. Each file sets I18N_MORE[code] = { name, html, dict, pat: [[regex, replacement]],
// scoped: { word: text }, mon, mon3, ord }. index.html lists the files in <template id="i18n-files">,
// so they carry file stamps and the service worker saves them for offline use.
const I18N_LAZY = { fr: ['Français', 'fr'], de: ['Deutsch', 'de'], it: ['Italiano', 'it'] };
for (const l in I18N_LAZY) { I18N_LANGS.push([l, I18N_LAZY[l][0]]); I18N_HTML_LANG[l] = I18N_LAZY[l][1]; }
/** A downloaded language's data, or undefined. */
function i18nMore(l) { return typeof I18N_MORE === 'object' && I18N_MORE ? I18N_MORE[l] : undefined; }
const I18N_KEY = 'rd_lang';

// Elements whose text is card data or the player's own words.
const I18N_SKIP = [
  '[data-no-tr]', 'script', 'style', 'textarea', 'input', 'code', 'pre', '[contenteditable="true"]',
  '#review-deck-name', '.review-card-name', '.gf-card', '.pz-card', '.pz-tx', '.mt-nm', '.mt-tool', '.t68-n',
].join(',');
const I18N_ATTRS = ['placeholder', 'title', 'aria-label'];

/* I18N_DICT_START */
const I18N_ES = {
  "Rules": "Reglas",
  // 3.1 What's new
  "Added: card details": "Nuevo: detalles de las cartas",
  "Added: card guides": "Nuevo: guías de cartas",
  "A web page for each card top decks play: its text, the decks that run it and its rules": "Una página web por cada carta que juegan las mejores barajas: su texto, las barajas que la usan y sus reglas",
  "Added: setup and mulligan rules": "Nuevo: reglas de preparación y mulligan",
  "Easier to find in Google and AI assistants": "Más fácil de encontrar en Google y en asistentes de IA",
  "Deck links fixed": "Enlaces de barajas corregidos",
  "Security headers added": "Encabezados de seguridad añadidos",
  "Rules page fix in the Play app": "Corrección de la página de reglas en la app de Google Play",
  "Added: page to delete your data": "Nuevo: página para borrar tus datos",
  "Grade fix: Kingdra ex and other discard pile decks": "Corrección de calificación: Kingdra ex y otras barajas de pila de descartes",
  "Prices now in dollars only": "Precios solo en dólares",
  "Starter decks work offline": "Las barajas iniciales funcionan sin conexión",
  "Added: swipe between cards": "Nuevo: desliza para pasar de una carta a otra",
  "Landscape layout fixed": "Vista horizontal corregida",
  "Added: in-app dialogs": "Nuevo: avisos propios de la app",
  "Added: fold sections": "Nuevo: secciones plegables",
  "Text follows your phone's text size": "El texto sigue el tamaño de letra de tu teléfono",
  "Fixed: naming a pasted deck": "Corregido: ponerle nombre a una baraja pegada",
  "Grade fix: discard pile revival": "Corrección de calificación: revivir desde la pila de descartes",
  "How it plays: Abilities explained": "Cómo juega: Habilidades explicadas",
  "Grade waits for all card data": "La calificación espera a todos los datos de las cartas",
  "Expanded: older revivers read": "Expandido: se leen cartas antiguas para revivir",
  "Shared deck from a link. Tap Import and save to see its grade.": "Baraja compartida por enlace. Toca Importar y guardar para ver su calificación.",
  "Tap a card on the Cards tab to see its full text, Weakness, Resistance and Retreat, the official rules that apply to it and how it fits the deck.": "Toca una carta en la pestaña Cartas para ver su texto completo, Debilidad, Resistencia y Retirada, las reglas oficiales que se le aplican y cómo encaja en la baraja.",
  "Added: official rules": "Nuevo: reglas oficiales",
  "Common rules questions answered from the official rulebook, each with its page. They are also on the new Rules page.": "Preguntas frecuentes sobre las reglas, respondidas según el reglamento oficial, cada una con su página. También están en la nueva página Reglas.",
  "Added: Creator kit": "Nuevo: Kit para creadores",
  "In Share grade: a grade card for OBS that follows the newest results, an embed for your site and a line for video descriptions.": "En Compartir calificación: una tarjeta de calificación para OBS que sigue los resultados más recientes, un código para insertar en tu web y una línea para descripciones de video.",
  "Future ads limited to the US": "Anuncios futuros solo en EE. UU.",
  "Privacy policy updated": "Política de privacidad actualizada",
  "Starter decks date fixed in Spanish, Portuguese, French and Italian": "Fecha de las barajas iniciales corregida en español, portugués, francés e italiano",
  // 3.1 creator kit
  "Creator kit: stream card and embed": "Kit para creadores: tarjeta para stream y código para insertar",
  "Creator kit": "Kit para creadores",
  "For your stream or videos. The card shows this list's grade with the RdyDeck name, and grades it again each time it loads, so it follows the newest tournament results.": "Para tu stream o tus videos. La tarjeta muestra la calificación de esta lista con el nombre de RdyDeck y la vuelve a calificar cada vez que se carga, así que sigue los resultados de torneo más recientes.",
  "OBS browser source": "Fuente de navegador de OBS",
  "In OBS, add a Browser source, paste this as its URL and set its size to 560 by 190. The card grades the list again every hour.": "En OBS, añade una fuente de Navegador, pega esto como su URL y ponle un tamaño de 560 por 190. La tarjeta vuelve a calificar la lista cada hora.",
  "Embed on a website": "Insertar en un sitio web",
  "Paste this where your site takes HTML. Tapping the card opens the full grade.": "Pega esto donde tu sitio acepte HTML. Al tocar la tarjeta se abre la calificación completa.",
  "Video description": "Descripción del video",
  "One line with the grade and a link that opens this list in RdyDeck.": "Una línea con la calificación y un enlace que abre esta lista en RdyDeck.",
  "Copied.": "Copiado.",
  "Could not copy. Press and hold the text to copy it.": "No se pudo copiar. Mantén pulsado el texto para copiarlo.",
  "This card needs a deck link. Make one from Share grade, Creator kit.": "Esta tarjeta necesita un enlace de baraja. Créalo desde Compartir calificación, Kit para creadores.",
  "The cards in this list could not be read just now. Try again later.": "No se pudieron leer las cartas de esta lista ahora. Inténtalo más tarde.",
  "This list could not be graded.": "No se pudo calificar esta lista.",
  "Some cards have not been read yet, so there is no final grade. Try again later.": "Algunas cartas aún no se han leído, así que no hay calificación final. Inténtalo más tarde.",
  "This list breaks a deck building rule, so it has no grade.": "Esta lista rompe una regla de construcción de barajas, así que no tiene calificación.",
  "Open this grade in RdyDeck": "Abrir esta calificación en RdyDeck",
  "{name} grades {grade} out of 10 on RdyDeck: {link}": "{name} obtiene {grade} de 10 en RdyDeck: {link}",
  "RdyDeck grade": "Calificación de RdyDeck",
  // The starter deck hint one sentence at a time, so a new "Lists as of" date still translates.
  "Top finishes for the most played decks at big online tournaments, not Regionals.": "Mejores resultados de las barajas más jugadas en torneos online grandes, no Regionales.",
  "Real Standard lists that placed at recent events.": "Listas reales de Estándar con buenos resultados en eventos recientes.",
  "Load one to start practicing right away, then edit it to match your own build.": "Carga una para practicar de inmediato y luego edítala para que coincida con tu versión.",
  // 3.1 card details
  "Type": "Tipo",
  "Evolves from": "Evoluciona de",
  "Ability": "Habilidad",
  "Rule Box": "Recuadro de regla",
  "Regulation mark": "Marca de regulación",
  "Printing": "Impresión",
  "Mega Evolution Pokémon": "Pokémon Megaevolución",
  "Tera": "Tera",
  "Ancient": "Pasado",
  "Future": "Futuro",
  "Reading the full card text…": "Leyendo el texto completo de la carta…",
  "The full card text shows once you open this card with a signal.": "El texto completo de la carta aparecerá cuando abras esta carta con conexión.",
  "Card text from TCGdex.": "Texto de la carta obtenido de TCGdex.",
  "Card text from TCGdex, read from another printing of this card.": "Texto de la carta obtenido de TCGdex, leído de otra impresión de esta carta.",
  "The full card text could not be read just now. Try again later.": "No se pudo leer el texto completo de la carta ahora. Inténtalo más tarde.",
  "How it fits this deck": "Cómo encaja en esta baraja",
  "Official rules": "Reglas oficiales",
  "All rules": "Todas las reglas",
  "Can Your Deck Win?": "¿Tu baraja puede ganar?",
  "Free Pokémon TCG Deck Grader": "Calificador de barajas de Pokémon TCG gratis",
  "Android app": "App para Android",
  "coming soon to Google Play": "muy pronto en Google Play",
  "Your decks": "Tus barajas",
  "Start by grading a deck": "Empieza calificando una baraja",
  "Add a deck to see its grade, what to fix first, its odds and which cards rotate. Then practice it with prize games, hands and drills.": "Agrega una baraja para ver su calificación, qué corregir primero, sus probabilidades y qué cartas rotan. Luego practícala con partidas de premios, manos y ejercicios.",
  "Try a sample deck": "Prueba una baraja de ejemplo",
  "Import a deck": "Importar baraja",
  "Starter decks": "Barajas iniciales",
  "Build a deck": "Armar una baraja",
  "Play": "Jugar",
  "More": "Más",
  "Tournament log": "Registro de torneos",
  "Share the app": "Compartir la app",
  "Help and feedback": "Ayuda y comentarios",
  "Save and open decks": "Guardar y abrir barajas",
  "About RdyDeck": "Acerca de RdyDeck",
  "RdyDeck is a free Pokémon TCG deck grader and prize trainer. Paste a list from Pokémon TCG Live or Limitless to see how well the cards work together, what to fix first, your opening odds and which cards rotate out of Standard next.": "RdyDeck es un calificador de barajas de Pokémon TCG y un entrenador de cartas de Premio, gratis. Pega una lista de Pokémon TCG Live o Limitless para ver qué tan bien funcionan las cartas juntas, qué corregir primero, tus probabilidades de apertura y qué cartas salen del formato Estándar en la próxima rotación.",
  "Then practice the deck: name your six prize cards, draw opening hands, run drills and keep notes on your matchups. Decks stay in your browser, it works offline and there is no account to make.": "Después practica la baraja: adivina tus seis cartas de Premio, roba manos iniciales, haz ejercicios y anota tus enfrentamientos. Las barajas se quedan en tu navegador, funciona sin conexión y no necesitas crear una cuenta.",
  "Questions about RdyDeck": "Preguntas sobre RdyDeck",
  "What is RdyDeck?": "¿Qué es RdyDeck?",
  "RdyDeck is a free web app for Pokémon Trading Card Game players. It grades a 60 card deck, shows its opening odds and which cards rotate out of Standard, and trains you to work out your prize cards.": "RdyDeck es una app web gratis para jugadores de Pokémon Trading Card Game. Califica una baraja de 60 cartas, muestra sus probabilidades de apertura y qué cartas salen del formato Estándar, y te entrena para deducir tus cartas de Premio.",
  "How does prize card training work?": "¿Cómo funciona el entrenamiento con cartas de Premio?",
  "RdyDeck sets some cards from your deck aside as prizes, 6 by default or 4 or 8, and you flip through the rest. Then you name the cards that are missing. You can add a time limit, and after a few games RdyDeck shows which cards you miss most.": "RdyDeck aparta algunas cartas de tu baraja como premios, 6 por defecto o 4 u 8, y tú revisas el resto. Luego nombras las cartas que faltan. Puedes agregar un límite de tiempo, y después de algunas partidas RdyDeck te muestra qué cartas fallas más.",
  "How does the deck grade work?": "¿Cómo funciona la calificación de la baraja?",
  "The grade is out of 10. Synergy checks that the cards support each other: attackers can pay for their attacks, evolutions have what they evolve from, and the deck can draw and search. Power checks that the plan can win: how hard it hits, how many prizes it gives up and how fast it sets up. The grade is Synergy times Power, divided by 10, so the weaker one pulls the grade down. One part of Synergy, how tightly the list fits together, lowers the grade only when the fit is loose, so a focused list can grade a little above Synergy times Power. When the deck matches an archetype from recent online tournaments, part of the grade, up to half once it has 500 games, comes from that archetype's results. Each grade shows its own math and comes with a short list of what to fix first.": "La calificación es sobre 10. Sinergia revisa que las cartas se apoyen entre sí: los atacantes pueden pagar sus ataques, las evoluciones tienen de qué evolucionar y la baraja puede robar y buscar. Poder revisa que el plan pueda ganar: qué tan fuerte pega, cuántos premios entrega y qué tan rápido se prepara. La calificación es Sinergia por Poder, dividido entre 10, así que la más débil baja la calificación. Una parte de Sinergia, qué tan compacta es la lista, baja la calificación solo cuando la lista está dispersa, así que una lista enfocada puede calificar un poco por encima de Sinergia por Poder. Cuando la baraja coincide con un arquetipo de torneos online recientes, parte de la calificación, hasta la mitad cuando tiene 500 partidas, viene de los resultados de ese arquetipo. Cada calificación muestra su cálculo y trae una lista corta de qué corregir primero.",
  "How does the rotation check work?": "¿Cómo funciona la revisión de rotación?",
  "RdyDeck reads each card's regulation mark and shows which cards are not Standard legal now, which may rotate next, and which are safe. A card counts as safe only when its mark is confirmed, and a deck with cards that are not legal now grades 4.9 at most. An older printing still counts when a reprint with the same name, attacks and Abilities is legal now, so old art is fine.": "RdyDeck lee la marca de regulación de cada carta y muestra cuáles no son legales en Estándar ahora, cuáles podrían rotar en la próxima rotación y cuáles están seguras. Una carta cuenta como segura solo cuando su marca está confirmada, y una baraja con cartas que no son legales ahora califica 4.9 como máximo. Una impresión anterior sigue contando si hay una reimpresión legal con el mismo nombre, ataques y Habilidades, así que el arte viejo sirve.",
  "Which deck lists can I import?": "¿Qué listas puedo importar?",
  "Paste an export from Pokémon TCG Live or a list from Limitless TCG, one card per line with the count, name, set code and number. Starter decks are built in if you want to try it first.": "Pega una exportación de Pokémon TCG Live o una lista de Limitless TCG, una carta por línea con la cantidad, el nombre, el código de expansión y el número. Hay barajas iniciales incluidas si quieres probar primero.",
  "Is RdyDeck free? Do I need an account?": "¿RdyDeck es gratis? ¿Necesito una cuenta?",
  "RdyDeck is free and has no account. Your decks stay in your browser on your own device, it works offline once it has loaded, and you can install it to your home screen.": "RdyDeck es gratis y no usa cuentas. Tus barajas se quedan en el navegador de tu propio dispositivo, funciona sin conexión una vez que cargó y puedes instalarlo en tu pantalla de inicio.",
  "Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company. Card names, text and images are © The Pokémon Company, Nintendo, Creatures and GAME FREAK.": "App no oficial hecha por fans. Sin afiliación con Nintendo, Creatures, GAME FREAK ni The Pokémon Company. Los nombres, textos e imágenes de las cartas son © The Pokémon Company, Nintendo, Creatures y GAME FREAK.",
  "Deck grader": "Calificador de barajas",
  "Opening odds": "Probabilidades de apertura",
  "Prize trainer": "Entrenador de premios",
  "Rotation checker": "Revisión de rotación",
  "Deck guides": "Guías de barajas",
  "Improve your deck": "Mejora tu baraja",
  "How grading works": "Cómo funciona la calificación",
  "FAQ": "Preguntas frecuentes",
  "About": "Acerca de",
  "Contact": "Contacto",
  "Credits": "Créditos",
  "prize game played": "partida de premios jugada",
  "prize games played": "partidas de premios jugadas",
  "scoring games in a row": "partidas seguidas con puntos",
  "Daily challenge": "Desafío diario",
  "Win this turn from a real tournament board": "Gana en este turno desde una mesa real de torneo",
  "No decks yet.": "Aún no hay barajas.",
  "Paste a list or grab a starter deck.": "Pega una lista o elige una baraja inicial.",
  "Not graded yet": "Sin calificar",
  "Grading…": "Calificando…",
  "Grading": "Calificando",
  "Reading card data…": "Leyendo los datos de las cartas…",
  "Reading card data for this deck…": "Leyendo los datos de las cartas de esta baraja…",
  "Not final.": "Provisional.",
  "Not final": "Provisional",
  "RdyDeck could not read every card in this list yet, so this grade may change.": "RdyDeck aún no pudo leer todas las cartas de esta lista, así que esta calificación puede cambiar.",
  "Read the cards again": "Leer las cartas de nuevo",
  "Not legal in Standard now": "No legal en Estándar ahora",
  "Expanded.": "Expandido.",
  "This deck is graded as an Expanded deck, so Standard rotation, tournament results and matchups are left out.": "Esta baraja se califica como Expandido, así que la rotación, los resultados de torneos y los enfrentamientos de Estándar quedan fuera.",
  "Reading the card data for this deck. The grade shows once it is done, so it will not change while you look at it.": "Leyendo los datos de las cartas de esta baraja. La calificación aparece cuando termina, así que no cambiará mientras la miras.",
  "Checking which cards are Standard legal now. The grade shows once it is done, so it will not change while you look at it.": "Comprobando qué cartas son legales en Estándar ahora. La calificación aparece cuando termina, así que no cambiará mientras la miras.",
  "Loading recent tournament results. The grade shows once it is done, so it will not change while you look at it.": "Cargando resultados recientes de torneos. La calificación aparece cuando termina, así que no cambiará mientras la miras.",
  "Prize avg": "Prom. premios",
  "Avg": "Prom.",
  "Prizes": "Premios",
  "Grade": "Calificación",
  "Modes": "Modos",
  "Edit": "Editar",
  "Progress": "Progreso",
  "Show hidden decks": "Mostrar barajas ocultas",
  "Hide hidden decks": "Ocultar barajas ocultas",
  "Standard, no prize games yet": "Estándar, sin partidas de premios aún",
  "Expanded, no prize games yet": "Expandido, sin partidas de premios aún",
  "Tapping a deck now opens its grade. Prizes on the deck starts a prize game.": "Ahora al tocar una baraja se abre su calificación. Premios en la baraja inicia una partida de premios.",
  "Hand, Drills and Notes each have their own tab on a deck. Help has a short tour.": "Mano, Entreno y Notas tienen cada uno su pestaña en la baraja. Ayuda tiene un recorrido corto.",
  "Start with a prize game": "Empieza con una partida de premios",
  "Add a deck, then tap play. Six cards go face down and you name them.": "Agrega una baraja y toca jugar. Seis cartas quedan boca abajo y tú las nombras.",
  "Your daily score": "Tu puntuación diaria",
  "See what's new": "Ver novedades",
  "Settings": "Ajustes",
  "Theme": "Tema",
  "Dark": "Oscuro",
  "Light": "Claro",
  "Language": "Idioma",
  "Cards per row": "Cartas por fila",
  "For the Cards tab and the daily list on this screen size.": "Para la pestaña Cartas y la lista diaria en este tamaño de pantalla.",
  "Move your decks to a new phone or web address": "Pasa tus barajas a otro teléfono o dirección web",
  "Age setting": "Ajuste de edad",
  "Sets which ads you see.": "Define qué anuncios ves.",
  "What's new": "Novedades",
  "Terms of Service": "Términos del servicio",
  "Privacy Policy": "Política de privacidad", "Delete your data": "Borra tus datos",
  "Clear all data": "Borrar todos los datos",
  "Deletes every deck and score saved in this browser": "Borra todas las barajas y puntuaciones guardadas en este navegador",
  "Close": "Cerrar",
  "Done": "Listo",
  "Cancel": "Cancelar",
  "Back": "Atrás",
  "Save": "Guardar",
  "Delete": "Eliminar",
  "Continue": "Continuar",
  "Next": "Siguiente",
  "Yes": "Sí",
  "No": "No",
  "Got it": "Entendido",
  "Not now": "Ahora no",
  "Start": "Empezar",
  "Clear": "Borrar",
  "Change": "Cambiar",
  "Share": "Compartir",
  "Load": "Cargar",
  "Paste": "Pegar",
  "Copy": "Copiar",
  "Copied": "Copiado",
  "Saved": "Guardado",
  "Restored": "Restaurado",
  "Exported!": "¡Exportado!",
  "Take the tour": "Hacer el recorrido",
  "A one minute walk through the app": "Un paseo de un minuto por la app",
  "How to play": "Cómo jugar",
  "Every step of a prize game": "Cada paso de una partida de premios",
  "Send feedback": "Enviar comentarios",
  "Report a bug or a missing card": "Reporta un error o una carta que falta",
  "Keyboard shortcuts": "Atajos de teclado",
  "For playing on a computer": "Para jugar con teclado",
  "Credits and legal": "Créditos y aviso legal",
  "Where the cards and lists come from": "De dónde salen las cartas y las listas",
  "Unofficial fan-made app. Not affiliated with Nintendo or The Pokémon Company.": "App no oficial hecha por fans. Sin afiliación con Nintendo ni The Pokémon Company.",
  "Focus guess input": "Ir al campo de respuesta",
  "Focus guess": "Ir a la respuesta",
  "Undo last guess": "Deshacer la última respuesta",
  "Close dialog or quit game": "Cerrar ventana o salir de la partida",
  "Show this help": "Mostrar esta ayuda",
  "Navigate cards": "Moverse entre cartas",
  "Submit guess": "Enviar respuesta",
  "Reveal prizes": "Revelar premios",
  "RdyDeck is an unofficial, fan-made app. It is not produced, endorsed, supported or affiliated with Nintendo, The Pokémon Company, Game Freak or Creatures. Pokémon, card names, card text and card images are trademarks and copyright of their respective owners.": "RdyDeck es una app no oficial hecha por fans. No está producida, respaldada, apoyada ni afiliada con Nintendo, The Pokémon Company, Game Freak ni Creatures. Pokémon, los nombres, textos e imágenes de las cartas son marcas registradas y derechos de autor de sus respectivos dueños.",
  "Card data": "Datos de cartas",
  ", free and open card database (MIT license)": ", base de datos de cartas libre y abierta (licencia MIT)",
  "Backup card data": "Datos de cartas de respaldo",
  "Decklists, meta and card images": "Listas, meta e imágenes de cartas",
  "More card images": "Más imágenes de cartas",
  "Pokémon TCG API and TCGdex": "Pokémon TCG API y TCGdex",
  "Fonts": "Tipografías",
  "and Saira Condensed by Omnibus-Type (SIL Open Font License 1.1)": "y Saira Condensed de Omnibus-Type (SIL Open Font License 1.1)",
  "Terms and privacy": "Términos y privacidad",
  "and": "y",
  "TCGdex license": "Licencia de TCGdex",
  "This opens an email to us in your own email app, with the details filled in. Nothing is sent until you press Send there. Under 13? Ask a parent to send it.": "Esto abre un correo para nosotros en tu propia app de correo, con los detalles ya puestos. No se envía nada hasta que presiones Enviar ahí. ¿Tienes menos de 13 años? Pídele a tu padre, madre o tutor que lo envíe.",
  "What is it about?": "¿De qué se trata?",
  "Bug": "Error",
  "Missing card": "Carta que falta",
  "Idea": "Idea",
  "Tell us what happened": "Cuéntanos qué pasó",
  "Open email": "Abrir correo",
  "Added: how each Trainer works in your deck": "Nuevo: cómo funciona cada Entrenador en tu baraja",
  "Every card now gets a label": "Ahora cada carta tiene una etiqueta",
  "Changed: easier to read Goldfish and puzzle boards": "Cambio: mesas de Goldfish y del puzzle más fáciles de leer",
  "Added: How to improve your deck guide": "Nuevo: guía Cómo mejorar tu baraja",
  "Search and AI assistant updates": "Mejoras para buscadores y asistentes de IA",
  "Deck guides refreshed": "Guías de barajas actualizadas",
  "Welcome to RdyDeck": "Te damos la bienvenida a RdyDeck",
  "Grade any Pokémon TCG deck: how well the cards work together, whether it can win, and what to fix first. Then practice it.": "Califica cualquier baraja de Pokémon TCG: qué tan bien funcionan las cartas juntas, si puede ganar y qué corregir primero. Después practícala.",
  "Add a deck": "Agrega una baraja",
  "Paste a list from Pokémon TCG Live or Limitless, or load one of the starter decks from recent Regionals in one tap.": "Pega una lista de Pokémon TCG Live o Limitless, o carga con un toque una de las barajas iniciales de Regionales recientes.",
  "Read the grade": "Lee la calificación",
  "Tap a deck to open its grade. Fix first lists what costs you the most, and Rotation shows which cards leave Standard next.": "Toca una baraja para abrir su calificación. Corrige primero muestra lo que más te cuesta, y Rotación muestra qué cartas salen del formato Estándar en la próxima rotación.",
  "Check the odds": "Revisa las probabilidades",
  "Odds answers your own question, like Arven and a Ball by turn 2, and shows your opening Basics.": "Probabilidades responde tu propia pregunta, como Arven y una Ball para el turno 2, y muestra tus Básicos de apertura.",
  "Practice": "Práctica",
  "Prizes on a deck starts a prize game: six cards go face down and you name them. The Hand, Drills and Notes tabs hold opening hands, goldfish turns, drills and matchup notes.": "Premios en una baraja inicia una partida de premios: seis cartas quedan boca abajo y tú las nombras. Las pestañas Mano, Entreno y Notas tienen manos iniciales, turnos de goldfish, ejercicios y notas de enfrentamientos.",
  "Come back daily": "Vuelve cada día",
  "The daily challenge is the same shuffle for everyone. Log your matches in the tournament log. Help on the home screen replays this tour.": "El desafío diario es la misma mezcla para todos. Anota tus partidas en el registro de torneos. Ayuda, en la pantalla de inicio, repite este recorrido.",
  "Paste my list": "Pegar mi lista",
  "Play a prize game": "Juega una partida de premios",
  "Study your deck": "Estudia tu baraja",
  "Import your deck": "Importa tu baraja",
  "Paste your Limitless TCG 60 card list and the app builds your card gallery automatically.": "Pega tu lista de 60 cartas de Limitless TCG y la app arma tu galería de cartas automáticamente.",
  "Flip through the visible cards": "Revisa las cartas visibles",
  "Swipe left and right. Some cards are secretly set aside as prizes before you start.": "Desliza a la izquierda y a la derecha. Antes de empezar, algunas cartas se apartan en secreto como premios.",
  "Guess every prize card": "Adivina cada carta de Premio",
  "Type your guesses with autocomplete, then tap Reveal prizes.": "Escribe tus respuestas con autocompletar y luego toca Revelar premios.",
  "Challenge modes": "Modos de desafío",
  "Tap Modes on a deck to change the prize count (4, 6 or 8), add a time limit, or both.": "Toca Modos en una baraja para cambiar la cantidad de premios (4, 6 u 8), agregar un límite de tiempo, o ambos.",
  "Track weak spots": "Sigue tus puntos débiles",
  "After 3 sessions the app shows which cards you miss most often, so you know what to focus on.": "Después de 3 sesiones la app te muestra qué cartas fallas más seguido, para que sepas en qué enfocarte.",
  "Practice openings and share lists": "Practica aperturas y comparte listas",
  "Open a deck and use the Hand tab to drill turn 1 lines. The link button at the top gives you a link that opens the list in RdyDeck.": "Abre una baraja y usa la pestaña Mano para practicar jugadas del turno 1. El botón de enlace arriba te da un enlace que abre la lista en RdyDeck.",
  "Goldfish, drills and notes": "Goldfish, ejercicios y notas",
  "Each has its own tab on a deck. Hand can goldfish your first three turns. Drills has resource counts and an opponent prize read. Notes keeps matchup plans, an edit log of every card change, and a compare view. Card art you have seen is saved for offline play.": "Cada uno tiene su pestaña en la baraja. Mano puede hacer goldfish de tus primeros tres turnos. Entreno tiene conteo de recursos y lectura de premios del rival. Notas guarda planes de enfrentamientos, un historial de cada cambio de cartas y una vista para comparar. El arte de las cartas que ya viste se guarda para jugar sin conexión.",
  "Top finishes for the most played decks at big online tournaments, not Regionals. Lists as of 15 Nov 2026. Load one to start practicing right away, then edit it to match your own build.": "Mejores resultados de las barajas más jugadas en torneos online grandes, no Regionales. Listas del 15 nov 2026. Carga una para practicar de inmediato y luego edítala para que coincida con tu versión.",
  "Most played right now": "Lo más jugado ahora",
  "Paste my own": "Pegar la mía",
  "Deck name (optional)": "Nombre de la baraja (opcional)",
  "Deck list": "Lista de la baraja",
  "Deck name": "Nombre de la baraja",
  "Paste the export from Limitless or Pokémon TCG Live, section headers included. A full list grades as soon as it is pasted.": "Pega la exportación de Limitless o Pokémon TCG Live, con los encabezados de sección. Una lista completa se califica apenas la pegas.",
  "No list handy? Load a starter deck": "¿Sin lista? Carga una baraja inicial",
  "Format": "Formato",
  "Standard": "Estándar",
  "Expanded": "Expandido",
  "Import and save": "Importar y guardar",
  "Open": "Abrir",
  "Nothing is saved in this browser yet. To bring decks here, open a file you saved before.": "Todavía no hay nada guardado en este navegador. Para traer barajas aquí, abre un archivo que guardaste antes.",
  "Open a saved file or paste the text. Decks are added to the ones here, nothing is removed.": "Abre un archivo guardado o pega el texto. Las barajas se suman a las que ya hay, no se borra nada.",
  "Open a file": "Abrir archivo",
  "Read pasted text": "Leer el texto pegado",
  "Save a file": "Guardar archivo",
  "Copy as text": "Copiar texto",
  "Add to my decks": "Agregar a mis barajas",
  "Replace everything": "Reemplazar todo",
  "Please enter a deck name.": "Escribe un nombre para la baraja.",
  "Deck list is empty.": "La lista de la baraja está vacía.",
  "No cards could be parsed.": "No se pudo leer ninguna carta.",
  "Please paste your deck list.": "Pega la lista de tu baraja.",
  "No cards could be parsed. Check the format.": "No se pudo leer ninguna carta. Revisa el formato.",
  "Pasted from clipboard!": "¡Pegado del portapapeles!",
  "Tap inside the text box and long-press to paste.": "Toca dentro del cuadro de texto y mantén presionado para pegar.",
  "Backup copied to clipboard!": "¡Respaldo copiado al portapapeles!",
  "Long-press the text box and select all, then copy.": "Mantén presionado el cuadro de texto, selecciona todo y copia.",
  "Nothing to restore.": "No hay nada que restaurar.",
  "Invalid backup data.": "Datos de respaldo no válidos.",
  "Could not parse backup. Make sure you pasted the full text.": "No se pudo leer el respaldo. Asegúrate de pegar el texto completo.",
  "That backup is damaged or incomplete. Nothing was changed.": "Ese respaldo está dañado o incompleto. No se cambió nada.",
  "Copied. Paste it somewhere safe, like a note to yourself.": "Copiado. Pégalo en un lugar seguro, como una nota para ti.",
  "Select the text in the box and copy it.": "Selecciona el texto del cuadro y cópialo.",
  "Too many decks for one link. Save a file here, then open it at rdydeck.com.": "Demasiadas barajas para un solo enlace. Guarda un archivo aquí y ábrelo en rdydeck.com.",
  "Your decks are here. Tap Add to my decks to keep them.": "Tus barajas están aquí. Toca Agregar a mis barajas para quedártelas.",
  "RdyDeck has moved to rdydeck.com.": "RdyDeck se mudó a rdydeck.com.",
  "Move my decks": "Mover mis barajas",
  "Go to rdydeck.com": "Ir a rdydeck.com",
  "Kept on this device only.": "Se guarda solo en este dispositivo.",
  "All data cleared.": "Se borraron todos los datos.",
  "Deck link copied.": "Enlace de la baraja copiado.",
  "Select the link and copy it.": "Selecciona el enlace y cópialo.",
  "That deck link could not be read.": "No se pudo leer ese enlace de baraja.",
  "This browser cannot open compressed deck links. Try an up to date browser.": "Este navegador no puede abrir enlaces de baraja comprimidos. Prueba con un navegador actualizado.",
  "Link copied. Send it to your friend.": "Enlace copiado. Envíaselo a tu amigo.",
  "Import a deck first.": "Primero importa una baraja.",
  "Thumbnail updated!": "¡Portada actualizada!",
  "Grade, odds and cards": "Calificación, probabilidades y cartas",
  "Prize game": "Partida de premios",
  "Game modes": "Modos de juego",
  "Edit the list": "Editar la lista",
  "Cover card": "Carta de portada",
  "Hide deck": "Ocultar baraja",
  "Show deck": "Mostrar baraja",
  "Delete deck": "Eliminar baraja",
  "Its prize games, drills and notes are deleted with it. This cannot be undone.": "Sus partidas de premios, ejercicios y notas se borran con ella. Esto no se puede deshacer.",
  "Choose a cover card": "Elige una carta de portada",
  "Edit deck": "Editar baraja",
  "Edit your full 60 card list, then save.": "Edita tu lista completa de 60 cartas y guarda.",
  "Duplicate": "Duplicar",
  "More for this deck": "Más para esta baraja",
  "Share deck link": "Compartir enlace",
  "Back to decks": "Volver a las barajas",
  "Deck": "Baraja",
  "Cards": "Cartas",
  "Odds": "Probabilidades",
  "Hand": "Mano",
  "Drills": "Ejercicios",
  "Notes": "Notas",
  "Edit list": "Editar lista",
  "Pokémon": "Pokémon",
  "Trainers": "Entrenadores",
  "Trainer": "Entrenador",
  "Energy": "Energía",
  "Supporter": "Partidario",
  "Supporters": "Partidarios",
  "Item": "Objeto",
  "Items": "Objetos",
  "Stadium": "Estadio",
  "Pokémon Tool": "Herramienta Pokémon",
  "Special Energy": "Energía Especial",
  "Basic Energy": "Energía Básica",
  "Basic": "Básico",
  "Stage 1": "Fase 1",
  "Stage 2": "Fase 2",
  "Fire": "Fuego",
  "Water": "Agua",
  "Grass": "Planta",
  "Lightning": "Rayo",
  "Fighting": "Lucha",
  "Darkness": "Oscura",
  "Metal": "Metálica",
  "Dragon": "Dragón",
  "Colorless": "Incolora",
  "Fairy": "Hada",
  "No Energy": "Sin Energía",
  "All": "Todo",
  "Tournament-ready": "Lista para torneo",
  "Strong": "Sólida",
  "Fixable": "Mejorable",
  "Needs work": "Necesita trabajo",
  "Does not function": "No funciona",
  "Not legal yet": "Aún no es legal",
  "Ready for an event as it is.": "Lista para un evento tal como está.",
  "A good list with a few things to tighten.": "Una buena lista con algunos detalles por ajustar.",
  "The plan works, but problems will cost you games.": "El plan funciona, pero los problemas te van a costar partidas.",
  "Several problems stop it from working reliably.": "Varios problemas impiden que funcione de forma confiable.",
  "It cannot carry out its plan yet.": "Todavía no puede llevar a cabo su plan.",
  "Fix first shows the one problem found.": "Corrige primero muestra el único problema encontrado.",
  "One problem stops this deck from working. Fix it first.": "Un problema impide que esta baraja funcione. Corrígelo primero.",
  "One problem also stops this deck from working.": "Además, un problema impide que esta baraja funcione.",
  "One other change would make it stronger.": "Otro cambio la haría más fuerte.",
  "No problems found.": "No se encontraron problemas.",
  "Top fix": "Arreglo principal",
  "Top three fixes": "Los tres arreglos principales",
  "Top fixes": "Arreglos principales",
  "Checking which changes help most.": "Revisando qué cambios ayudan más.",
  "How it plays": "Cómo juega",
  "Synergy": "Sinergia",
  "Power": "Poder",
  "Do the cards work together": "¿Las cartas funcionan juntas?",
  "Can it win a game": "¿Puede ganar una partida?",
  "Share grade": "Compartir calificación",
  "is what holds it back.": "es lo que la frena.",
  "Right now": "Ahora mismo",
  "Fix first": "Corrige primero",
  "The problem that costs you the most.": "El problema que más te cuesta.",
  "Stops the deck": "Frena la baraja",
  "Worth fixing": "Vale la pena corregir",
  "Minor": "Menor",
  "Nothing to fix": "Nada que corregir",
  "Nothing else to fix": "Nada más que corregir",
  "The grader found no problem in this list.": "El calificador no encontró problemas en esta lista.",
  "Apart from the deck rules above, the grader found no problem in this list.": "Aparte de las reglas de construcción de arriba, el calificador no encontró problemas en esta lista.",
  "Check the odds and the rotation below before an event.": "Revisa las probabilidades y la rotación abajo antes de un evento.",
  "Working well": "Funciona bien",
  "How the grade works": "Cómo funciona la calificación",
  "under 3": "menos de 3",
  "checks that your cards support each other: every attacker can pay for its attacks, evolutions have what they evolve from, and the deck can draw and search.": "revisa que tus cartas se apoyen entre sí: cada atacante puede pagar sus ataques, las evoluciones tienen de qué evolucionar y la baraja puede robar y buscar.",
  "checks that the plan can win: how hard it hits against the format's biggest Pokemon, how many prizes it gives up, and how fast it sets up.": "revisa que el plan pueda ganar: qué tan fuerte golpea a los Pokémon más grandes del formato, cuántos premios entrega y qué tan rápido se prepara.",
  "The card grade is Synergy times Power, divided by 10. How tightly the list fits together lowers Synergy in full, but lowers the grade only when the fit is loose. When your deck matches an archetype from recent online tournaments, part of the grade comes from that archetype's win rate and finishes: more of it the more games there are, up to half at 500 games, and none while cards are not Standard legal. The sentence under the grade shows how much. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "La calificación de las cartas es Sinergia por Poder, dividido entre 10. Qué tan compacta es la lista baja Sinergia por completo, pero baja la calificación solo cuando la lista está dispersa. Cuando tu baraja coincide con un arquetipo de torneos online recientes, parte de la calificación viene del porcentaje de victorias y los resultados de ese arquetipo: más mientras más partidas haya, hasta la mitad con 500 partidas, y nada mientras haya cartas que no son legales en Estándar. La frase bajo la calificación muestra cuánto. Los roles de las cartas se leen del texto de la carta, que casi siempre acierta y a veces no. Lee los hallazgos y no te preocupes por el decimal.",
  "No card data for this deck yet.": "Todavía no hay datos de cartas para esta baraja.",
  "These could not be looked up, so they count for nothing in the grade. Opening the deck again while online tries again.": "No se pudieron consultar, así que no cuentan en la calificación. Abrir la baraja otra vez con conexión vuelve a intentarlo.",
  "Grade history": "Historial de calificaciones",
  "Upgrades": "Mejoras",
  "Upgrades need a connection the first time, to read the cards to try.": "Las mejoras necesitan conexión la primera vez, para leer las cartas a probar.",
  "Checking which card swaps raise this grade.": "Revisando qué cambios de cartas suben esta calificación.",
  "Main attacker": "Atacante principal",
  "Toolbox: several attackers": "Toolbox: varios atacantes",
  "The Pokemon you set is no longer in the list, so the grade is back on Auto.": "El Pokémon que elegiste ya no está en la lista, así que la calificación volvió a Auto.",
  "Rotation": "Rotación",
  "Announced": "Anunciada",
  "Expected": "Esperada",
  "not legal now": "no legales ahora",
  "may rotate": "podrían rotar",
  "rotate next": "rotan en la próxima",
  "not confirmed": "sin confirmar",
  "safe": "seguras",
  "Rotation safe": "A salvo de la rotación",
  "Not Standard legal now": "No legal en Estándar ahora",
  "Not confirmed yet": "Sin confirmar todavía",
  "Could not be read from the card database": "No se pudo leer de la base de datos de cartas",
  "No reprint with a later mark found": "No se encontró una reimpresión con una marca posterior",
  "No mark on this printing in the card database": "Esta impresión no tiene marca en la base de datos de cartas",
  "Checking for reprints": "Buscando reimpresiones",
  "Reprints not checked yet": "Reimpresiones sin revisar todavía",
  "This printing is not in the card database yet, so its mark is not confirmed": "Esta impresión aún no está en la base de datos de cartas, así que su marca no está confirmada",
  "Mark read from another printing, so not confirmed": "Marca leída de otra impresión, así que no está confirmada",
  "No mark found in the card database": "No se encontró marca en la base de datos de cartas",
  "Mark read from another printing, so counted as legal": "Marca leída de otra impresión, así que cuenta como legal",
  "Mark not confirmed in the card database, so counted as legal": "Marca sin confirmar en la base de datos de cartas, así que cuenta como legal",
  "mark read from another printing": "marca leída de otra impresión",
  "Check reprints again": "Buscar reimpresiones otra vez",
  "Nothing here rotates next": "Nada aquí rota en la próxima rotación",
  "This may be out of date": "Esto podría estar desactualizado",
  "Pokémon usually announces rotation in January. If it has, update the app to see the official date.": "Pokémon suele anunciar la rotación en enero. Si ya lo hizo, actualiza la app para ver la fecha oficial.",
  "Rotation is a Standard format change. This deck is set to Expanded, so nothing here rotates next.": "La rotación es un cambio del formato Estándar. Esta baraja está en Expandido, así que nada aquí rota en la próxima.",
  ", not announced yet.": ", todavía sin anunciar.",
  "cards are expected to leave Standard in": "se espera que salgan de Estándar en",
  "cards leave Standard in": "salen de Estándar en",
  "). For a Pokémon, the reprint needs the same name, attacks and Abilities. The marks come from the card database, so check a card you are unsure of before an event.": "). Para un Pokémon, la reimpresión necesita el mismo nombre, ataques y Habilidades. Las marcas vienen de la base de datos de cartas, así que revisa cualquier carta de la que dudes antes de un evento.",
  "A card with an older mark stays legal while a reprint with a legal mark exists (": "Una carta con una marca anterior sigue siendo legal mientras exista una reimpresión con una marca legal (",
  "Pokémon has not announced it yet (": "Pokémon todavía no lo anunció (",
  "Source:": "Fuente:",
  "Grade vs win rate": "Calificación vs. % de victorias",
  "Cards alone:": "Solo las cartas:",
  "Win rate:": "Porcentaje de victorias:",
  "Results beat its cards.": "Los resultados superan a sus cartas.",
  "Cards and results agree.": "Las cartas y los resultados coinciden.",
  "Cards beat its results.": "Las cartas superan a sus resultados.",
  "The cards and the record rank this deck about the same.": "Las cartas y el historial ubican a esta baraja más o menos igual.",
  "Against the meta": "Contra el meta",
  "Strength:": "Fuerza:",
  "won": "ganó",
  "Data:": "Datos:",
  "Favored": "Favorable",
  "Unfavored": "Desfavorable",
  "Even": "Parejo",
  "Leans favored": "Algo favorable",
  "Leans unfavored": "Algo desfavorable",
  "Other popular decks": "Otras barajas populares",
  "Against": "Contra",
  "Win rate": "% de victorias",
  "Matches": "Partidas",
  "The line in each bar is 50%. The light band is the likely range from the games so far. Favored and Unfavored need the whole band on one side of 50%.": "La línea de cada barra es 50%. La franja clara es el rango probable según las partidas hasta ahora. Favorable y Desfavorable necesitan que toda la franja quede de un lado del 50%.",
  "All results": "Todos los resultados",
  "No deck in recent results plays the same Pokemon as this one. Pick the closest deck above to see its matchups.": "Ninguna baraja de los resultados recientes juega los mismos Pokémon que esta. Elige arriba la baraja más parecida para ver sus enfrentamientos.",
  "Trainers and Special Energy: nothing missing or dead.": "Entrenadores y Energía Especial: no falta nada ni sobra nada.",
  "No clear attacker, so the score is cut to 30%.": "Sin un atacante claro, así que la puntuación se reduce al 30%.",
  "No real draw engine, so the score is cut to 40%.": "Sin un motor de robo real, así que la puntuación se reduce al 40%.",
  "That one stops the deck, so it costs 1.2 more.": "Ese frena la baraja, así que cuesta 1.2 más.",
  "Damage": "Daño",
  "Prize trade": "Intercambio de premios",
  "Setup speed": "Velocidad de preparación",
  "No clear attacker": "Sin atacante claro",
  "Nothing can reliably attack": "Nada puede atacar de forma confiable",
  "No Supporter to draw with": "Sin Partidario para robar",
  "Two hits for the biggest threats": "Necesita dos golpes contra las mayores amenazas",
  "Damage ceiling is too low": "El daño máximo es demasiado bajo",
  "A three-prize Pokemon in a one-prize deck": "Un Pokémon de tres premios en una baraja de un premio",
  "Big attackers, but the power backs it up": "Atacantes grandes, pero el poder lo respalda",
  "Closes through spread, not one big hit": "Cierra con daño repartido, no con un solo golpe grande",
  "Draws every turn": "Roba en cada turno",
  "Efficient prize trade": "Intercambio de premios eficiente",
  "Evolves the long way": "Evoluciona por el camino largo",
  "Hard to disrupt": "Difícil de interrumpir",
  "Heavy on Energy": "Mucha Energía",
  "Hits hard enough to trade up": "Pega lo bastante fuerte para ganar el intercambio",
  "Hits several Pokemon at once": "Golpea a varios Pokémon a la vez",
  "Many ways to attack": "Muchas formas de atacar",
  "Might be slow off the line": "Podría arrancar lento",
  "Mostly two-prize Pokemon": "Casi todos son Pokémon de dos premios",
  "No ACE SPEC": "Sin AS TÁCTICO",
  "No ACE SPEC. Every deck may run 1, and nearly every top list does.": "Sin AS TÁCTICO. Cada baraja puede llevar 1, y casi todas las listas top lo llevan.",
  "No Basic Pokémon, so the game cannot start.": "Sin Pokémon Básico, así que la partida no puede empezar.",
  "No Pokémon yet.": "Todavía no hay Pokémon.",
  "No real draw engine": "Sin un motor de robo real",
  "No way to find your Pokemon": "Sin forma de buscar tus Pokémon",
  "Nothing to pull up a Benched Pokemon": "Nada para traer un Pokémon de la Banca",
  "Sets up on time": "Se prepara a tiempo",
  "Some damage is left out": "Queda algo de daño sin contar",
  "Three-prize attackers, two-prize punch": "Atacantes de tres premios, golpe de dos premios",
  "Two prizes per knockout": "Cada Fuera de Combate da dos premios",
  "Every Pokemon here gives up one prize, so the opponent has to take six knockouts.": "Cada Pokémon aquí entrega un premio, así que el rival tiene que dejar Fuera de Combate a seis Pokémon.",
  "No Pokemon here is set up to deal meaningful damage, so there is no win condition to build toward.": "Ningún Pokémon aquí está preparado para hacer daño real, así que no hay una condición de victoria hacia la cual armar.",
  "None of your attackers have the energy they need, so damage output is basically zero.": "Ninguno de tus atacantes tiene la Energía que necesita, así que el daño es prácticamente cero.",
  "Your only card that pulls up a Benched Pokemon, which is how you take the prizes you choose.": "Tu única carta que trae un Pokémon de la Banca, que es como tomas los premios que eliges.",
  "Switches your Active Pokemon.": "Cambia tu Pokémon Activo.",
  "Removes your opponent's Energy and gets rid of Pokemon Tools.": "Quita Energía del rival y descarta Herramientas Pokémon.",
  "Synergy: how the cards fit": "Sinergia: cómo encajan las cartas",
  "Good": "Buena",
  "Key": "Clave",
  "Weak": "Débil",
  "Dead": "Muerta",
  "Fine": "Bien",
  "In this deck:": "En esta baraja:",
  "RdyDeck hasn't read this card's text yet, so it has no label. Open the deck online to read it.": "RdyDeck todavía no leyó el texto de esta carta, así que no tiene etiqueta. Abre la baraja con conexión para leerla.",
  "Mulligan": "Mulligan",
  "Opening 7 with no Basic": "7 iniciales sin Básico",
  "Draw card T1": "Carta de robo T1",
  "A draw card you can use, in your first 8": "Una carta de robo que puedes usar, en tus primeras 8",
  "Attacker by T2, any hand": "Atacante para T2, cualquier mano",
  "No attacker line read": "No se leyó una línea de atacante",
  "Ask the odds": "Calcula tus probabilidades",
  "Pick the cards you need and the turn. Exact counting for this list: a hand with no Basic is redrawn, so only hands you keep count, and both players draw on their first turn.": "Elige las cartas que necesitas y el turno. Conteo exacto para esta lista: una mano sin Básico se vuelve a robar, así que solo cuentan las manos que te quedas, y ambos jugadores roban en su primer turno.",
  "At least": "Al menos",
  "of": "de",
  "or": "o",
  "And another card": "Y otra carta",
  "By": "Para",
  "Stuck in prizes: 0.0%": "Atascada en premios: 0.0%",
  "Games where the prizes hold so many copies that hand and deck cannot make this until you take the right prize. The same on every turn.": "Partidas donde los premios tienen tantas copias que la mano y la baraja no pueden lograrlo hasta que tomes el premio correcto. Igual en todos los turnos.",
  "No Basic Pokemon was read in this list, so every opening hand counts.": "No se leyó ningún Pokémon Básico en esta lista, así que cuentan todas las manos iniciales.",
  "Raw draws only: search and draw cards are not played out, so a real game lands at or above these numbers.": "Solo robos puros: no se juegan cartas de búsqueda ni de robo, así que una partida real queda en estos números o más arriba.",
  "No Basic Pokémon read": "No se leyó ningún Pokémon Básico",
  "No card in this list was read as a Basic Pokemon, so mulligan odds cannot be counted. If the list has Basics, re-saving the deck retries the lookup.": "Ninguna carta de esta lista se leyó como Pokémon Básico, así que no se pueden contar las probabilidades de mulligan. Si la lista tiene Básicos, guardar la baraja otra vez reintenta la consulta.",
  "Prize risk": "Riesgo en premios",
  "Exact chance a card lands in your six prizes, counting only opening hands you keep.": "Probabilidad exacta de que una carta caiga en tus seis premios, contando solo las manos iniciales que te quedas.",
  "All prized": "Todas en premios",
  "means every copy is stuck there, which is the case RdyDeck drills you to spot.": "significa que todas las copias quedaron ahí, que es justo el caso que RdyDeck te entrena a detectar.",
  "Card": "Carta",
  "Copies": "Copias",
  "Any prized": "Alguna",
  "What this does not do.": "Lo que esto no hace.",
  "Matchup win rates are not here. They are on the Grade tab, in Against the meta, from recent online tournaments. Everything on this tab comes from shuffling your own list.": "Los porcentajes de victoria por enfrentamiento no están aquí. Están en la pestaña Nota, en Contra el meta, a partir de torneos online recientes. Todo lo de esta pestaña sale de mezclar tu propia lista.",
  "Opening Basics": "Básicos de apertura",
  "In opening hand": "En mano inicial",
  "Attacker": "Atacante",
  "This list is too short to simulate.": "Esta lista es demasiado corta para simular.",
  "Odds need at least 15 cards: an opening hand, six prizes and two draws.": "Las probabilidades necesitan al menos 15 cartas: una mano inicial, seis premios y dos robos.",
  "Games where every copy of a piece the attacker needs is prized, so it cannot come online until you take that prize.": "Partidas donde todas las copias de una pieza que el atacante necesita están en premios, así que no puede funcionar hasta que tomes ese premio.",
  "Pick cards": "Elegir cartas",
  "Pick a card to see how often you have it.": "Elige una carta para ver qué tan seguido la tienes.",
  "No card data yet, so mulligans are not taken out. Open Edit deck and save it to read the cards.": "Todavía no hay datos de cartas, así que no se descuentan los mulligans. Abre Editar baraja y guárdala para leer las cartas.",
  "Tick one card, or several. With several, pick how they count.": "Marca una carta, o varias. Con varias, elige cómo cuentan.",
  "Any of them (or)": "Cualquiera de ellas (o)",
  "Every one (and)": "Todas (y)",
  "Core": "Núcleo",
  "Flex": "Flexibles",
  "Turn 1 line": "Jugada del turno 1",
  "Goldfish 3 turns": "Goldfish 3 turnos",
  "Opening hand": "Mano inicial",
  "A random 7 from this list. Pick the line you would build on turn 1, lock it in, then see how often it comes together.": "7 cartas al azar de esta lista. Elige la jugada que prepararías en el turno 1, confírmala y luego mira qué tan seguido te sale.",
  "Kept the first 7": "Te quedaste con las primeras 7",
  "No Basic read, mulligan rule off": "Sin Básico leído, regla de mulligan apagada",
  "Set up": "Preparar",
  "Tap a Basic to put it in play and carry on in Goldfish with this same hand.": "Toca un Básico para ponerlo en juego y seguir en Goldfish con esta misma mano.",
  "No Pokémon line read": "No se leyó una línea de Pokémon",
  "No complete evolution line or attacker was read in this list, so there is nothing to compare. Re-saving the deck retries the lookup.": "No se leyó ninguna línea de evolución completa ni atacante en esta lista, así que no hay nada que comparar. Guardar la baraja otra vez reintenta la consulta.",
  "New hand": "Otra mano",
  "Your turn 1 line": "Tu jugada del turno 1",
  "Which Pokémon would you set up first with this hand?": "¿Qué Pokémon prepararías primero con esta mano?",
  "Lock in line": "Confirmar",
  "Play this hand in Goldfish": "Jugar esta mano en Goldfish",
  "This hand by T2": "Esta mano para T2",
  "This hand by T3": "Esta mano para T3",
  "This opening hand only, with search": "Solo esta mano inicial, con búsqueda",
  "Locked in prizes": "Atascada en premios",
  "A piece fully prized": "Una pieza toda en premios",
  "Every line from this hand": "Todas las jugadas con esta mano",
  "Line": "Jugada",
  "T2 raw": "T2 solo robo",
  "T2 search": "T2 + búsqueda",
  "Your pick": "Tu elección",
  "Best": "Mejor",
  "How this deal fell": "Cómo salió este reparto",
  "The prizes and draws this shuffle actually gave you. Highlighted cards are pieces of your line.": "Los premios y robos que te dio esta mezcla. Las cartas resaltadas son piezas de tu jugada.",
  "Turn 1 and 2 draws": "Robos de los turnos 1 y 2",
  "Turn 3 draw": "Robo del turno 3",
  "What this counts.": "Lo que esto cuenta.",
  "Search cards each fetch one missing piece if a copy is still in the deck. Draw Supporters, abilities, discard costs and the one Supporter per turn rule are not played out, the same as the Odds tab. Play this hand in Goldfish plays them out turn by turn, with the same prizes and draws.": "Cada carta de búsqueda trae una pieza que falta si queda una copia en la baraja. No se juegan Partidarios de robo, habilidades, costes de descarte ni la regla de un Partidario por turno, igual que en la pestaña Probab. Jugar esta mano en Goldfish los juega turno por turno, con los mismos premios y robos.",
  "Going first": "Vas primero",
  "Going second": "Vas segundo",
  "Empty": "Vacío",
  "Discard": "Descartar",
  "New deal going second": "Nuevo reparto yendo segundo",
  "New deal going first": "Nuevo reparto yendo primero",
  "New deal": "Nuevo reparto",
  "Start turn 1": "Jugar turno 1",
  "Goldfish rules.": "Reglas del Goldfish.",
  "You draw every turn, one Energy and one Supporter a turn, no Supporter on turn 1 going first, and no evolving on your first turn or onto a Pokémon that came in this turn. Abilities, Items, Supporters and Stadiums do what their card text says, with each card's own limits. Effects on your opponent do nothing here. When the app cannot follow a card yet, it shows the text and you use Draw, Search and Discard.": "Robas en cada turno, una Energía y un Partidario por turno, sin Partidario en el turno 1 si vas primero, y sin evolucionar en tu primer turno ni sobre un Pokémon que entró este turno. Habilidades, Objetos, Partidarios y Estadios hacen lo que dice su texto, con los límites de cada carta. Los efectos sobre tu rival no hacen nada aquí. Cuando la app todavía no puede seguir una carta, muestra el texto y tú usas Robar, Buscar y Descartar.",
  "Draw": "Robar",
  "Search": "Buscar",
  "Draw 1": "Robar 1",
  "Shuffle hand in": "Barajar la mano",
  "To Bench": "A la Banca",
  "To hand": "A la mano",
  "No cards here.": "No hay cartas aquí.",
  "Nothing in the deck fits.": "Nada en la baraja cumple.",
  "The app cannot follow this card's text yet. Do it with Draw, Search and Discard below, then tap Done.": "La app todavía no puede seguir el texto de esta carta. Hazlo con Robar, Buscar y Descartar abajo y luego toca Listo.",
  "Both went to your hand. Attach one of them to a Pokémon.": "Las dos fueron a tu mano. Une una de ellas a un Pokémon.",
  "Switch it into the Active Spot": "Cámbialo al Puesto Activo",
  "Stop here": "Parar aquí",
  "This list is too short to goldfish.": "Esta lista es demasiado corta para el Goldfish.",
  "This list is too short for hand practice.": "Esta lista es demasiado corta para practicar manos.",
  "It needs an opening hand, six prizes and three draws.": "Necesita una mano inicial, seis premios y tres robos.",
  "No card data yet": "Todavía no hay datos de cartas",
  "Goldfish needs each card's stage to know your Basics. Open this deck while online, or open Edit deck and save it, to read them.": "Goldfish necesita la fase de cada carta para saber cuáles son tus Básicos. Abre esta baraja con conexión, o abre Editar baraja y guárdala, para leerlas.",
  "Turn over": "Fin del turno",
  "Pick a new Active Pokémon": "Elige un nuevo Pokémon Activo",
  "No Ability to use.": "No hay Habilidad para usar.",
  "Empty hand.": "Mano vacía.",
  "Shuffles from this opening hand, with search": "Mezclas desde esta mano inicial, con búsqueda",
  "Your prizes were": "Tus premios eran",
  "No Active Pokémon": "Sin Pokémon Activo",
  "This turn": "Este turno",
  "Choose your new Active Pokémon": "Elige tu nuevo Pokémon Activo",
  "Pick a new Active Pokémon first.": "Primero elige un nuevo Pokémon Activo.",
  "Put a Basic in the Active Spot first.": "Primero pon un Básico en el Puesto Activo.",
  "Set up a Basic first": "Primero prepara un Básico",
  "In play from the start": "En juego desde el inicio",
  "Came in this turn": "Entró este turno",
  "Active": "Activo",
  "Bench": "Banca",
  "Active Spot": "Puesto Activo",
  "Attach": "Unir",
  "Evolve": "Evolucionar",
  "Retreat": "Retirar",
  "Attack": "Atacar",
  "End turn": "Terminar turno",
  "Undo": "Deshacer",
  "Log": "Registro",
  "Resource count": "Conteo de recursos",
  "Your list stays hidden. Here is what you have used so far this game. Say how many of each card you have not used yet, the way you would before a big turn.": "Tu lista queda oculta. Esto es lo que usaste hasta ahora en esta partida. Di cuántas de cada carta todavía no usaste, como lo harías antes de un turno grande.",
  "Start a round": "Empezar una ronda",
  "Opponent prize read": "Lectura de premios del rival",
  "Load your opponent's list. You see everything they have shown. Six of the rest are prized and the others are still in their deck or hand. Name the six.": "Carga la lista de tu rival. Ves todo lo que ya mostró. Seis del resto están en premios y las otras siguen en su baraja o su mano. Nombra las seis.",
  "Their list": "Su lista",
  "Paste their list": "Pegar su lista",
  "Late game": "Final de partida",
  "Mid game": "Mitad de partida",
  "Deal their game": "Repartir su partida",
  "How many": "Cuántas",
  "have you not used yet?": "todavía no usaste?",
  "New pile": "Nueva pila",
  "Check": "Revisar",
  "Next round": "Siguiente ronda",
  "List": "Lista",
  "Shown": "Mostradas",
  "Deal again": "Otro reparto",
  "Matchup notes": "Notas de enfrentamientos",
  "Your prize plan against each deck you expect to face. Saved on this device only.": "Tu plan de premios contra cada baraja que esperas enfrentar. Se guarda solo en este dispositivo.",
  "No notes yet. Add one for the decks you see most at your locals.": "Todavía no hay notas. Agrega una para las barajas que más ves en tu tienda.",
  "Add matchup note": "Agregar nota",
  "Edit log": "Historial de cambios",
  "No changes yet. Save a change in Edit deck and it shows here with the date.": "Todavía no hay cambios. Guarda un cambio en Editar baraja y aparece aquí con la fecha.",
  "Compare lists": "Comparar listas",
  "This list against an earlier version or another deck: card changes and how the odds move.": "Esta lista contra una versión anterior u otra baraja: cambios de cartas y cómo se mueven las probabilidades.",
  "Nothing to compare yet. Save a change in Edit deck, or import a second deck.": "Todavía no hay nada que comparar. Guarda un cambio en Editar baraja, o importa una segunda baraja.",
  "New matchup note": "Nueva nota",
  "Opposing deck": "Baraja rival",
  "Prize plan": "Plan de premios",
  "Matchup note saved.": "Nota de enfrentamiento guardada.",
  "No plan written yet.": "Todavía no hay plan escrito.",
  "Compare with": "Comparar con",
  "This list": "Esta lista",
  "Same cards and counts as this list.": "Las mismas cartas y cantidades que esta lista.",
  "Back to the starting list.": "De vuelta a la lista inicial.",
  "Odds, counted like the Odds tab": "Probabilidades, contadas como en la pestaña Probab.",
  "Prize plan for this matchup": "Plan de premios para este enfrentamiento",
  "Your prize plan:": "Tu plan de premios:",
  "Game mode": "Modo de juego",
  "These settings carry over to every deck.": "Estos ajustes se aplican a todas las barajas.",
  "Prize cards": "Cartas de Premio",
  "standard": "estándar",
  "Time limit": "Límite de tiempo",
  "Off": "No",
  "On": "Sí",
  "Deck view": "Vista de la baraja",
  "table check holds out a hand of 7": "revisión en mesa aparta una mano de 7",
  "Full deck": "Baraja completa",
  "Table check": "Revisión en mesa",
  "Reach check": "Revisión de alcance",
  "can you still get it? before the reveal": "¿todavía puedes conseguirla? antes de revelar",
  "Tournament": "Torneo",
  "back to back games": "partidas seguidas",
  "Games": "Partidas",
  "Start game": "Empezar partida",
  "Prize guesses": "Respuestas de premios",
  "Guess": "Adivinar",
  "Back to menu": "Volver al menú",
  "Quit game": "Salir de la partida",
  "Quit": "Salir",
  "Finish": "Terminar",
  "Tournament complete": "Torneo terminado",
  "PERFECT!": "¡PERFECTO!",
  "Prize cards found": "Cartas de Premio encontradas",
  "Your guesses vs the prizes": "Tus respuestas vs. los premios",
  "Add a note about this game": "Agregar una nota sobre esta partida",
  "Notes on missed prizes": "Notas sobre premios fallados",
  "No guess": "Sin respuesta",
  "Session history": "Historial de sesiones",
  "Score": "Puntuación",
  "Time": "Tiempo",
  "Date": "Fecha",
  "View prize cards": "Ver cartas de Premio",
  "All decks": "Todas las barajas",
  "Export history (CSV)": "Exportar historial (CSV)",
  "Play again": "Jugar otra vez",
  "Personal bests": "Mejores marcas",
  "No history yet.": "Todavía no hay historial.",
  "Drill your missed cards": "Practica las cartas que fallaste",
  "Insights": "Análisis",
  "Guessed but not prized:": "Adivinadas pero no en premios:",
  "Drill mode: prizes biased toward your weak spots.": "Modo ejercicio: premios inclinados hacia tus puntos débiles.",
  "No history to export.": "No hay historial para exportar.",
  "This game was saved before prize cards were kept.": "Esta partida se guardó antes de que se guardaran las cartas de Premio.",
  "Can you still get it?": "¿Todavía puedes conseguirla?",
  "Score copied. Paste it anywhere.": "Puntuación copiada. Pégala donde quieras.",
  "Result copied. Paste it anywhere.": "Resultado copiado. Pégalo donde quieras.",
  "Progress and weak spots": "Progreso y puntos débiles",
  "Sessions played": "Sesiones jugadas",
  "Average score": "Puntuación promedio",
  "Perfect runs": "Partidas perfectas",
  "Progress over time": "Progreso en el tiempo",
  "Accuracy": "Precisión",
  "Avg time": "Tiempo prom.",
  "Days": "Días",
  "Play on another day to see a trend line.": "Juega otro día para ver una línea de tendencia.",
  "Day": "Día",
  "Score trend": "Tendencia de puntuación",
  "Miss rate by card": "Fallos por carta",
  "Play more sessions to build miss rate data.": "Juega más sesiones para juntar datos de fallos.",
  "Event": "Evento",
  "Round": "Ronda",
  "Your deck": "Tu baraja",
  "Opponent's deck": "Baraja del rival",
  "Match": "Partida",
  "One game": "Una partida",
  "Best of three": "Al mejor de tres",
  "You went": "Fuiste",
  "First": "Primero",
  "Second": "Segundo",
  "Not sure": "No sé",
  "Result": "Resultado",
  "Prizes you took": "Premios que tomaste",
  "Prizes they took": "Premios que tomó el rival",
  "Win": "Victoria",
  "Loss": "Derrota",
  "Tie": "Empate",
  "Match saved.": "Partida guardada.",
  "Add the result of at least one game.": "Agrega el resultado de al menos una partida.",
  "Log a match": "Anotar una partida",
  "Match record": "Historial de partidas",
  "List changes": "Cambios en la lista",
  "Matches, list and drills": "Partidas, lista y ejercicios",
  "By opponent": "Por rival",
  "Opponent": "Rival",
  "Prizes a game": "Premios por partida",
  "Your record here:": "Tu récord aquí:",
  "First or second": "Primero o segundo",
  "All games": "Todas las partidas",
  "Mark who went first when you log a match, and this splits your record so you know what to pick when you win the coin flip.": "Marca quién fue primero cuando anotes una partida, y esto separa tu récord para que sepas qué elegir cuando ganes el lanzamiento de moneda.",
  "Last 10 matches:": "Últimas 10 partidas:",
  "Going 1st": "Yendo 1.º",
  "Going 2nd": "Yendo 2.º",
  "By list version": "Por versión de la lista",
  "Version": "Versión",
  "Better going first": "Mejor yendo primero",
  "Better going second": "Mejor yendo segundo",
  "No clear edge": "Sin ventaja clara",
  "No prizes logged": "Sin premios anotados",
  "No games yet": "Todavía sin partidas",
  "Unknown": "Desconocido",
  "Review all 60 cards, then tap Start. The clock starts with the game. Your first try is your score.": "Revisa las 60 cartas y toca Empezar. El reloj arranca con la partida. Tu primer intento es tu puntuación.",
  "Daily puzzle": "Puzzle diario",
  "A real board from two top tournament lists, the same for everyone today. You can win this turn if you find the line. Your first try is your score.": "Una mesa real de dos listas top de torneo, la misma para todos hoy. Puedes ganar en este turno si encuentras la jugada. Tu primer intento es tu puntuación.",
  "Any line that wins with no luck counts, not only this one.": "Cuenta cualquier jugada que gane sin suerte, no solo esta.",
  "Your puzzle result": "Tu resultado del puzzle",
  "Win this turn": "Gana en este turno",
  "Win this turn.": "Gana en este turno.",
  "Your opponent": "Tu rival",
  "You": "Tú",
  "No Stadium in play": "Sin Estadio en juego",
  "Your move": "Tu jugada",
  "From your hand": "Desde tu mano",
  "Attach Energy": "Unir Energía",
  "Abilities": "Habilidades",
  "End your turn": "Terminar tu turno",
  "Only while it is in the Active Spot.": "Solo mientras está en el Puesto Activo.",
  "Not enough Energy to retreat.": "No hay suficiente Energía para retirarse.",
  "Not enough Energy.": "No hay suficiente Energía.",
  "Start over": "Empezar de nuevo",
  "Show the answer": "Mostrar la respuesta",
  "No win this time": "Esta vez no ganaste",
  "Practice replay": "Repetición de práctica",
  "The puzzle needs a connection the first time. Try again in a moment.": "El puzzle necesita conexión la primera vez. Intenta de nuevo en un momento.",
  "Your Active Pokémon": "Tu Pokémon Activo",
  "Weakness": "Debilidad",
  "Resistance": "Resistencia",
  "none": "ninguna",
  "Deck builder": "Constructor de barajas",
  "New deck": "Nueva baraja",
  "Start from": "Empezar desde",
  "A meta deck": "Una baraja del meta",
  "The cards most of its top lists run. You fill the rest.": "Las cartas que llevan la mayoría de sus listas top. Tú completas el resto.",
  "A Pokémon": "Un Pokémon",
  "Pick one and its evolution line goes in.": "Elige uno y entra su línea de evolución.",
  "One of your decks": "Una de tus barajas",
  "Change a saved list and grade it again.": "Cambia una lista guardada y califícala otra vez.",
  "A list you paste": "Una lista que pegues",
  "From Limitless or Pokémon TCG Live.": "De Limitless o Pokémon TCG Live.",
  "Add cards": "Agregar cartas",
  "Most run in top lists": "Lo más usado en listas top",
  "Copy list": "Copiar lista",
  "Save and grade": "Guardar y calificar",
  "Your list": "Tu lista",
  "Checks": "Revisiones",
  "Suggestions": "Sugerencias",
  "Nothing to add from the top lists.": "Nada que agregar de las listas top.",
  "Start a new list?": "¿Empezar una lista nueva?",
  "Start new": "Empezar nueva",
  "Start from a meta deck": "Usar una baraja del meta",
  "Start from one of your decks": "Usar una de tus barajas",
  "No saved decks yet.": "Todavía no hay barajas guardadas.",
  "Paste a list": "Pegar una lista",
  "Use this list": "Usar esta lista",
  "Clear the list": "Vaciar la lista",
  "Save as new": "Guardar como nueva",
  "The meta decks did not load. Check your connection.": "Las barajas del meta no cargaron. Revisa tu conexión.",
  "No cards could be read. One card per line: count, name, set, number.": "No se pudo leer ninguna carta. Una carta por línea: cantidad, nombre, expansión, número.",
  "The list is empty.": "La lista está vacía.",
  "List copied.": "Lista copiada.",
  "The grade is still loading. Try again in a moment.": "La calificación todavía está cargando. Intenta de nuevo en un momento.",
  "No meta deck matches these Pokémon yet, so these are what top lists run whatever the deck.": "Ninguna baraja del meta coincide todavía con estos Pokémon, así que esto es lo que llevan las listas top sin importar la baraja.",
  "Loading the card list…": "Cargando la lista de cartas…",
  "The card list did not load. Check your connection and open the builder again.": "La lista de cartas no cargó. Revisa tu conexión y abre el constructor otra vez.",
  "The card list has not loaded yet. Try again in a moment.": "La lista de cartas todavía no cargó. Intenta de nuevo en un momento.",
  "No card matches that name.": "Ninguna carta coincide con ese nombre.",
  "No deck by that name.": "No hay una baraja con ese nombre.",
  "Which deck is this now?": "¿Qué baraja es esta ahora?",
  "Or pick another deck from the list below.": "O elige otra baraja de la lista de abajo.",
  "This list looks like a different deck now. Its Grade tab asks which one.": "Esta lista ahora parece otra baraja. Su pestaña Nota pregunta cuál.",
  "No card is in that many lists.": "Ninguna carta está en tantas listas.",
  "No card moved by 10 points or more.": "Ninguna carta se movió 10 puntos o más.",
  "These are for decks like yours, not your exact list.": "Esto es para barajas como la tuya, no para tu lista exacta.",
  "Share your grade": "Comparte tu calificación",
  "Making your card": "Creando tu tarjeta",
  "The link opens this list in RdyDeck, so anyone can see its grade and odds for themselves.": "El enlace abre esta lista en RdyDeck, así cualquiera puede ver su calificación y probabilidades por su cuenta.",
  "The picture could not be made on this device. The link still works.": "No se pudo crear la imagen en este dispositivo. El enlace sigue funcionando.",
  "This deck has no card data yet, so there is no grade to share.": "Esta baraja todavía no tiene datos de cartas, así que no hay calificación para compartir.",
  "Some cards have not been read yet, so this grade is not final. Open the deck again while online, then share.": "Algunas cartas todavía no se leyeron, así que esta calificación no es final. Abre la baraja otra vez con conexión y luego compártela.",
  "This list breaks a deck building rule. Fix it in Edit deck, then share the grade.": "Esta lista rompe una regla de construcción. Corrígela en Editar baraja y luego comparte la calificación.",
  "Grade and link copied. Paste it anywhere.": "Calificación y enlace copiados. Pégalos donde quieras.",
  "Include my list for": "Incluir mi lista para",
  "Prerelease": "Presentación",
  "What you get": "Lo que recibes",
  "Each player gets a Build and Battle Box:": "Cada jugador recibe una Caja de Combina y Combate:",
  "Deck rules": "Reglas de la baraja",
  "Exactly 40 cards.": "Exactamente 40 cartas.",
  "Any number of copies of a card.": "Cualquier cantidad de copias de una carta.",
  "Each player takes 4 prize cards, not 6.": "Cada jugador toma 4 cartas de Premio, no 6.",
  "The store has extra Basic Energy to add.": "La tienda tiene Energía Básica extra para agregar.",
  "Build a practice 40": "Arma una baraja de 40 para practicar",
  "Tap a card to add a copy. Save it, then practice it like any deck. Prize games use 4 prizes.": "Toca una carta para agregar una copia. Guárdala y practícala como cualquier baraja. Las partidas de premios usan 4 premios.",
  "Secret rares": "Raras secretas",
  "Loading the set…": "Cargando la expansión…",
  "Prerelease check": "Revisión de presentación",
  "What is in it": "Qué tiene",
  "Evolutions": "Evoluciones",
  "The 0 to 10 grade is built for 60 card Standard decks, so prerelease decks get this check instead.": "La calificación de 0 a 10 está hecha para barajas Estándar de 60 cartas, así que las barajas de presentación reciben esta revisión en su lugar.",
  "Prize games work with 4 prizes. Tap Play to start one.": "Las partidas de premios funcionan con 4 premios. Toca Jugar para empezar una.",
  "Prerelease deck": "Baraja de presentación",
  "Add some cards first.": "Primero agrega algunas cartas.",
  "Prerelease decks have a build check, not a grade to share.": "Las barajas de presentación tienen una revisión de construcción, no una calificación para compartir.",
  "Install": "Instalar",
  "✓ App installed!": "✓ ¡App instalada!",
  "✓ Installing...": "✓ Instalando...",
  "Right-click the page and choose": "Haz clic derecho en la página y elige",
  "Couldn": "No se pudo",
  "Search cards": "Buscar cartas",
  "Name": "Nombre",
  "Count": "Cantidad",
  "Set": "Expansión",
  "Total": "Total",
  "Wins": "Victorias",
  "Losses": "Derrotas",
  "Ties": "Empates",
  "Average": "Promedio",
  "Show more": "Ver más",
  "Show less": "Ver menos",
  "Open the deck": "Abrir la baraja",
  "Loading…": "Cargando…",
  "Offline": "Sin conexión",
  "to fix": "por corregir",
  "working well": "funcionan bien",
  "The grade is Synergy times Power, divided by 10.": "La calificación es Sinergia por Poder, dividido entre 10.",
  "Synergy under 0.6 counts as 0.6.": "Sinergia por debajo de 0.6 cuenta como 0.6.",
  "Power under 1.2 counts as 1.2.": "Poder por debajo de 1.2 cuenta como 1.2.",
  "If that is the wrong deck, pick the right one under Against the meta.": "Si esa no es la baraja correcta, elige la correcta en Contra el meta.",
  "There are few games so far, so results count for little.": "Todavía hay pocas partidas, así que los resultados cuentan poco.",
  "The Pokemon the plan, upgrades and draw odds are built around. Auto reads it from the cards; set it if your deck attacks with something else, or picks its attacker each turn.": "El Pokémon en torno al cual giran el plan, las mejoras y las probabilidades de robo. Auto lo lee de las cartas; elígelo tú si tu baraja ataca con otro, o si elige su atacante en cada turno.",
  "Each time you change this list, its new grade is kept here, so you can see it climb.": "Cada vez que cambias esta lista, su nueva calificación se guarda aquí, para que la veas subir.",
  "Ties count as matches, not wins.": "Los empates cuentan como partidas, no como victorias.",
  "Mirror matches, byes and no-shows are left out.": "Se excluyen las partidas espejo, los byes y las ausencias.",
  "The main attacker and the combos the grader found between your own cards. This is what the deck is trying to do.": "El atacante principal y los combos que el calificador encontró entre tus propias cartas. Esto es lo que la baraja intenta hacer.",
  "Combos the grader found between your own cards. This is what the deck is trying to do.": "Combos que el calificador encontró entre tus propias cartas. Esto es lo que la baraja intenta hacer.",
  "It works with this list.": "Funciona con esta lista.",
  "This explains Synergy and does not change the grade.": "Esto explica Sinergia y no cambia la calificación.",
  "How each Trainer and Special Energy fits this list, ACE SPEC first.": "Cómo encaja cada Entrenador y Energía Especial en esta lista, primero el AS TÁCTICO.",
  "Every Trainer and Special Energy here works with the list.": "Cada Entrenador y Energía especial aquí funciona con la lista.",
  "It does nothing in this list.": "En esta lista no hace nada.",
  "One card does little here, with a swap idea for each.": "Una carta aporta poco aquí, con una idea de cambio para cada una.",
  "The attacker its meta deck is named for, and how often you can have it ready by your second turn.": "El atacante que le da nombre a su baraja del meta, y qué tan seguido puedes tenerlo listo para tu segundo turno.",
  "Draw Supporters and abilities are not played out.": "No se juegan los Partidarios de robo ni las habilidades.",
  "Real games land in between.": "Las partidas reales quedan en medio.",
  "Basic, main attacker.": "Básico, atacante principal.",
  "Put a Basic in the Active Spot and any others on your Bench, then start turn 1. You draw at the start of every turn.": "Pon un Básico en el Puesto Activo y los demás en tu Banca, luego empieza el turno 1. Robas al inicio de cada turno.",
  "Every card change saved from Edit deck, so you can see how the list grew.": "Cada cambio de cartas guardado desde Editar baraja, para que veas cómo creció la lista.",
  "Share this deck": "Compartir esta baraja",
  "Deck link": "Enlace de la baraja",
  "Put it in a video description or send it to a friend. Opening it fills Import with this list, and nothing saves until they tap Import. The list lives in the link itself, not on a server.": "Ponlo en la descripción de un video o envíaselo a un amigo. Al abrirlo se llena Importar con esta lista, y nada se guarda hasta que toque Importar. La lista vive en el propio enlace, no en un servidor.",
  "Copy link": "Copiar enlace",
  "You miss": "Fallas",
  "Record": "Récord",
  "Ties count as not won": "Los empates cuentan como no ganadas",
  "Taken a game": "Tomados por partida",
  "No matches logged yet. Log each round at your next event: who you played, the result and how many prizes each of you took.": "Todavía no hay partidas anotadas. Anota cada ronda en tu próximo evento: contra quién jugaste, el resultado y cuántos premios tomó cada uno.",
  "The format changes with every new set, so check a list before an event.": "El formato cambia con cada expansión nueva, así que revisa una lista antes de un evento.",
  "Lists as posted on Limitless (play.limitlesstcg.com).": "Listas tal como se publicaron en Limitless (play.limitlesstcg.com).",
  "Or write to support@rdydeck.com": "O escribe a support@rdydeck.com",
  "Same list, same numbers.": "Misma lista, mismos números.",
  "Tab": "Tab",
  "Enter": "Enter",
  "Esc": "Esc",
  "No card moves your opponent's Benched Pokemon into the Active Spot, like Boss's Orders or Prime Catcher, so you can only Knock Out what they choose to put there. Some decks skip it on purpose, but most run 2 to 4.": "Ninguna carta mueve un Pokémon en Banca de tu rival al Puesto Activo, como Boss's Orders o Prime Catcher, así que solo puedes dejar Fuera de Combate lo que tu rival decida poner ahí. Algunas barajas lo omiten a propósito, pero la mayoría lleva de 2 a 4.",
  "Nothing in the list searches your deck for a Pokemon, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin, so getting your attackers into play rests on drawing them.": "Nada en la lista busca un Pokémon en tu baraja, como Ultra Ball, Poké Pad o Buddy-Buddy Poffin, así que poner a tus atacantes en juego depende de robarlos.",
  "Enough Rare Candy to land your Stage 2 Pokemon before the game runs away.": "Suficientes Rare Candy para jugar tus Pokémon de Fase 2 antes de que la partida se escape.",
  "Nothing reliably refills your hand. The deck stalls as soon as your opening cards run dry.": "Nada rellena tu mano de forma confiable. La baraja se atasca en cuanto se acaban tus cartas iniciales.",
  "Every Pokemon here gives up two prizes, so the opponent needs only three knockouts. That is normal for a deck built on Pokemon ex, so each one has to take more than one knockout of its own.": "Cada Pokémon aquí entrega dos premios, así que el rival solo necesita dejar Fuera de Combate a tres. Eso es normal en una baraja de Pokémon ex, así que cada uno tiene que dejar Fuera de Combate a más de un Pokémon rival.",
  "The list runs one copy of its main attacker. It is in your prizes in about 1 game in 10, and once it is Knocked Out the deck has no one to carry the plan. Most lists run 2 to 4.": "La lista lleva una sola copia de su atacante principal. Queda en tus premios en más o menos 1 de cada 10 partidas, y una vez que queda Fuera de Combate la baraja no tiene quién lleve el plan. La mayoría de las listas lleva de 2 a 4.",
  "How hard the best attacker hits the format's biggest threats.": "Qué tan fuerte pega el mejor atacante contra las mayores amenazas del formato.",
  "Fine if you can take the return hit.": "Está bien si puedes aguantar el golpe de vuelta.",
  "Read the card for what that needs.": "Lee la carta para ver qué necesita.",
  "ACE SPEC": "AS TÁCTICO",
  "Built from": "Basada en",
  "Matchups": "Enfrentamientos",
  "Trends": "Tendencias",
  "The grade checks the rest when you save.": "La calificación revisa el resto cuando guardas.",
};
const I18N_PT = {
  "Rules": "Regras",
  // 3.1 What's new
  "Added: card details": "Novo: detalhes das cartas",
  "Added: card guides": "Novo: guias de cartas",
  "A web page for each card top decks play: its text, the decks that run it and its rules": "Uma página para cada carta que os melhores decks jogam: o texto, os decks que a usam e as regras",
  "Added: setup and mulligan rules": "Novo: regras de preparação e mulligan",
  "Easier to find in Google and AI assistants": "Mais fácil de encontrar no Google e em assistentes de IA",
  "Deck links fixed": "Links de decks corrigidos",
  "Security headers added": "Cabeçalhos de segurança adicionados",
  "Rules page fix in the Play app": "Correção da página de regras no app do Google Play",
  "Added: page to delete your data": "Novo: página para apagar seus dados",
  "Grade fix: Kingdra ex and other discard pile decks": "Correção de nota: Kingdra ex e outros decks de pilha de descarte",
  "Prices now in dollars only": "Preços agora só em dólares",
  "Starter decks work offline": "Decks iniciais funcionam offline",
  "Added: swipe between cards": "Novo: deslize para passar de uma carta a outra",
  "Landscape layout fixed": "Modo paisagem corrigido",
  "Added: in-app dialogs": "Novo: avisos próprios do app",
  "Added: fold sections": "Novo: seções recolhíveis",
  "Text follows your phone's text size": "O texto segue o tamanho da fonte do seu celular",
  "Fixed: naming a pasted deck": "Corrigido: dar nome a um deck colado",
  "Grade fix: discard pile revival": "Correção de nota: reviver da pilha de descarte",
  "How it plays: Abilities explained": "Como joga: Habilidades explicadas",
  "Grade waits for all card data": "A nota espera todos os dados das cartas",
  "Expanded: older revivers read": "Expandido: cartas antigas para reviver agora lidas",
  "Shared deck from a link. Tap Import and save to see its grade.": "Deck compartilhado por link. Toque em Importar e salvar para ver a nota.",
  "Tap a card on the Cards tab to see its full text, Weakness, Resistance and Retreat, the official rules that apply to it and how it fits the deck.": "Toque em uma carta na aba Cartas para ver o texto completo, Fraqueza, Resistência e Recuo, as regras oficiais que se aplicam a ela e como se encaixa no deck.",
  "Added: official rules": "Novo: regras oficiais",
  "Common rules questions answered from the official rulebook, each with its page. They are also on the new Rules page.": "Perguntas comuns sobre as regras respondidas com o livro de regras oficial, cada uma com sua página. Elas também estão na nova página Regras.",
  "Added: Creator kit": "Novo: Kit para criadores",
  "In Share grade: a grade card for OBS that follows the newest results, an embed for your site and a line for video descriptions.": "Em Compartilhar nota: um card de nota para o OBS que acompanha os resultados mais recentes, um código de incorporação para o seu site e uma linha para descrições de vídeo.",
  "Future ads limited to the US": "Anúncios futuros só nos EUA",
  "Privacy policy updated": "Política de privacidade atualizada",
  "Starter decks date fixed in Spanish, Portuguese, French and Italian": "Data dos decks iniciais corrigida em espanhol, português, francês e italiano",
  // 3.1 creator kit
  "Creator kit: stream card and embed": "Kit para criadores: card para live e código para site",
  "Creator kit": "Kit para criadores",
  "For your stream or videos. The card shows this list's grade with the RdyDeck name, and grades it again each time it loads, so it follows the newest tournament results.": "Para sua live ou seus vídeos. O card mostra a nota desta lista com o nome RdyDeck e refaz a nota sempre que é carregado, então acompanha os resultados de torneio mais recentes.",
  "OBS browser source": "Fonte de navegador do OBS",
  "In OBS, add a Browser source, paste this as its URL and set its size to 560 by 190. The card grades the list again every hour.": "No OBS, adicione uma fonte de Navegador, cole isto como URL e defina o tamanho como 560 por 190. O card refaz a nota da lista a cada hora.",
  "Embed on a website": "Incorporar em um site",
  "Paste this where your site takes HTML. Tapping the card opens the full grade.": "Cole isto onde seu site aceita HTML. Tocar no card abre a nota completa.",
  "Video description": "Descrição do vídeo",
  "One line with the grade and a link that opens this list in RdyDeck.": "Uma linha com a nota e um link que abre esta lista no RdyDeck.",
  "Copied.": "Copiado.",
  "Could not copy. Press and hold the text to copy it.": "Não deu para copiar. Toque e segure o texto para copiar.",
  "This card needs a deck link. Make one from Share grade, Creator kit.": "Este card precisa de um link de deck. Crie um em Compartilhar nota, Kit para criadores.",
  "The cards in this list could not be read just now. Try again later.": "Não deu para ler as cartas desta lista agora. Tente de novo mais tarde.",
  "This list could not be graded.": "Não deu para dar nota a esta lista.",
  "Some cards have not been read yet, so there is no final grade. Try again later.": "Algumas cartas ainda não foram lidas, então não há nota final. Tente de novo mais tarde.",
  "This list breaks a deck building rule, so it has no grade.": "Esta lista quebra uma regra de montagem de deck, então não tem nota.",
  "Open this grade in RdyDeck": "Abrir esta nota no RdyDeck",
  "{name} grades {grade} out of 10 on RdyDeck: {link}": "{name} tira nota {grade} de 10 no RdyDeck: {link}",
  "RdyDeck grade": "Nota do RdyDeck",
  // The starter deck hint one sentence at a time, so a new "Lists as of" date still translates.
  "Top finishes for the most played decks at big online tournaments, not Regionals.": "Melhores resultados dos decks mais jogados em grandes torneios online, não Regionais.",
  "Real Standard lists that placed at recent events.": "Listas reais do Padrão que tiveram boas colocações em eventos recentes.",
  "Load one to start practicing right away, then edit it to match your own build.": "Carregue uma para treinar na hora e depois edite para ficar igual à sua versão.",
  // 3.1 card details
  "Type": "Tipo",
  "Evolves from": "Evolui de",
  "Ability": "Habilidade",
  "Rule Box": "Caixa de Regras",
  "Regulation mark": "Marca de regulamentação",
  "Printing": "Impressão",
  "Mega Evolution Pokémon": "Pokémon de Megaevolução",
  "Tera": "Tera",
  "Ancient": "Ancestral",
  "Future": "Futurista",
  "Reading the full card text…": "Lendo o texto completo da carta…",
  "The full card text shows once you open this card with a signal.": "O texto completo da carta vai aparecer quando você abrir esta carta com conexão.",
  "Card text from TCGdex.": "Texto da carta do TCGdex.",
  "Card text from TCGdex, read from another printing of this card.": "Texto da carta do TCGdex, lido de outra impressão desta carta.",
  "The full card text could not be read just now. Try again later.": "Não foi possível ler o texto completo da carta agora. Tente de novo mais tarde.",
  "How it fits this deck": "Como se encaixa neste deck",
  "Official rules": "Regras oficiais",
  "All rules": "Todas as regras",
  "Can Your Deck Win?": "Seu deck pode vencer?",
  "Free Pokémon TCG Deck Grader": "Avaliador de decks de Pokémon TCG grátis",
  "Android app": "App para Android",
  "coming soon to Google Play": "em breve no Google Play",
  "Your decks": "Seus decks",
  "Start by grading a deck": "Comece avaliando um deck",
  "Add a deck to see its grade, what to fix first, its odds and which cards rotate. Then practice it with prize games, hands and drills.": "Adicione um deck para ver a nota, o que corrigir primeiro, as chances e quais cartas rotacionam. Depois treine com jogos de prêmios, mãos e treinos.",
  "Try a sample deck": "Testar deck de exemplo",
  "Import a deck": "Importar deck",
  "Starter decks": "Decks iniciais",
  "Build a deck": "Montar um deck",
  "Play": "Jogar",
  "More": "Mais",
  "Tournament log": "Registro de torneios",
  "Share the app": "Compartilhar o app",
  "Help and feedback": "Ajuda e feedback",
  "Save and open decks": "Salvar e abrir decks",
  "About RdyDeck": "Sobre o RdyDeck",
  "RdyDeck is a free Pokémon TCG deck grader and prize trainer. Paste a list from Pokémon TCG Live or Limitless to see how well the cards work together, what to fix first, your opening odds and which cards rotate out of Standard next.": "O RdyDeck é um avaliador de decks de Pokémon TCG e treinador de cartas de Prêmio, grátis. Cole uma lista do Pokémon TCG Live ou do Limitless para ver se as cartas funcionam bem juntas, o que corrigir primeiro, suas chances de abertura e quais cartas saem do Padrão na próxima rotação.",
  "Then practice the deck: name your six prize cards, draw opening hands, run drills and keep notes on your matchups. Decks stay in your browser, it works offline and there is no account to make.": "Depois treine o deck: descubra suas seis cartas de Prêmio, compre mãos iniciais, faça treinos e anote seus confrontos. Os decks ficam no seu navegador, funciona offline e não é preciso criar conta.",
  "Questions about RdyDeck": "Perguntas sobre o RdyDeck",
  "What is RdyDeck?": "O que é o RdyDeck?",
  "RdyDeck is a free web app for Pokémon Trading Card Game players. It grades a 60 card deck, shows its opening odds and which cards rotate out of Standard, and trains you to work out your prize cards.": "O RdyDeck é um app web grátis para jogadores de Pokémon Estampas Ilustradas. Ele avalia um deck de 60 cartas, mostra as chances de abertura e quais cartas saem do Padrão, e treina você a descobrir suas cartas de Prêmio.",
  "How does prize card training work?": "Como funciona o treino de cartas de Prêmio?",
  "RdyDeck sets some cards from your deck aside as prizes, 6 by default or 4 or 8, and you flip through the rest. Then you name the cards that are missing. You can add a time limit, and after a few games RdyDeck shows which cards you miss most.": "O RdyDeck separa algumas cartas do seu deck como prêmios, 6 por padrão ou 4 ou 8, e você passa pelo resto. Depois você diz quais cartas estão faltando. Dá para colocar limite de tempo, e depois de alguns jogos o RdyDeck mostra quais cartas você mais erra.",
  "How does the deck grade work?": "Como funciona a nota do deck?",
  "The grade is out of 10. Synergy checks that the cards support each other: attackers can pay for their attacks, evolutions have what they evolve from, and the deck can draw and search. Power checks that the plan can win: how hard it hits, how many prizes it gives up and how fast it sets up. The grade is Synergy times Power, divided by 10, so the weaker one pulls the grade down. One part of Synergy, how tightly the list fits together, lowers the grade only when the fit is loose, so a focused list can grade a little above Synergy times Power. When the deck matches an archetype from recent online tournaments, part of the grade, up to half once it has 500 games, comes from that archetype's results. Each grade shows its own math and comes with a short list of what to fix first.": "A nota vai de 0 a 10. Sinergia verifica se as cartas se apoiam: os atacantes conseguem pagar os ataques, as evoluções têm de onde evoluir e o deck consegue comprar e buscar. Poder verifica se o plano consegue vencer: quanto dano causa, quantos prêmios entrega e quão rápido monta o jogo. A nota é Sinergia vezes Poder, dividido por 10, então a mais fraca puxa a nota para baixo. Uma parte da Sinergia, o quanto a lista é coesa, só baixa a nota quando a lista está espalhada, então uma lista focada pode ficar um pouco acima de Sinergia vezes Poder. Quando o deck corresponde a um arquétipo de torneios online recentes, parte da nota, até a metade quando há 500 partidas, vem dos resultados desse arquétipo. Cada nota mostra o próprio cálculo e traz uma lista curta do que corrigir primeiro.",
  "How does the rotation check work?": "Como funciona a verificação de rotação?",
  "RdyDeck reads each card's regulation mark and shows which cards are not Standard legal now, which may rotate next, and which are safe. A card counts as safe only when its mark is confirmed, and a deck with cards that are not legal now grades 4.9 at most. An older printing still counts when a reprint with the same name, attacks and Abilities is legal now, so old art is fine.": "O RdyDeck lê a marca de regulamentação de cada carta e mostra quais não são legais no Padrão agora, quais podem rotacionar na próxima e quais estão seguras. Uma carta só conta como segura quando a marca está confirmada, e um deck com cartas que não são legais agora fica com nota 4.9 no máximo. Uma impressão antiga ainda vale quando existe uma reimpressão legal com o mesmo nome, ataques e Habilidades, então a arte antiga também vale.",
  "Which deck lists can I import?": "Quais listas posso importar?",
  "Paste an export from Pokémon TCG Live or a list from Limitless TCG, one card per line with the count, name, set code and number. Starter decks are built in if you want to try it first.": "Cole uma exportação do Pokémon TCG Live ou uma lista do Limitless TCG, uma carta por linha com a quantidade, o nome, o código da coleção e o número. Há decks iniciais prontos se quiser testar primeiro.",
  "Is RdyDeck free? Do I need an account?": "O RdyDeck é grátis? Preciso de conta?",
  "RdyDeck is free and has no account. Your decks stay in your browser on your own device, it works offline once it has loaded, and you can install it to your home screen.": "O RdyDeck é grátis e não tem conta. Seus decks ficam no navegador do seu próprio aparelho, funciona offline depois de carregado e você pode instalar na tela inicial.",
  "Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company. Card names, text and images are © The Pokémon Company, Nintendo, Creatures and GAME FREAK.": "App não oficial feito por fãs. Sem afiliação com Nintendo, Creatures, GAME FREAK ou The Pokémon Company. Nomes, textos e imagens das cartas são © The Pokémon Company, Nintendo, Creatures e GAME FREAK.",
  "Deck grader": "Avaliador de decks",
  "Opening odds": "Chances de abertura",
  "Prize trainer": "Treino de prêmios",
  "Rotation checker": "Verificador de rotação",
  "Deck guides": "Guias de decks",
  "Improve your deck": "Melhore seu deck",
  "How grading works": "Como funciona a nota",
  "FAQ": "Perguntas frequentes",
  "About": "Sobre",
  "Contact": "Contato",
  "Credits": "Créditos",
  "prize game played": "jogo de prêmios jogado",
  "prize games played": "jogos de prêmios jogados",
  "scoring games in a row": "jogos seguidos pontuando",
  "Daily challenge": "Desafio diário",
  "Win this turn from a real tournament board": "Vença neste turno numa mesa real de torneio",
  "No decks yet.": "Ainda não há decks.",
  "Paste a list or grab a starter deck.": "Cole uma lista ou pegue um deck inicial.",
  "Not graded yet": "Ainda sem nota",
  "Grading…": "Avaliando…",
  "Grading": "Avaliando",
  "Reading card data…": "Lendo os dados das cartas…",
  "Reading card data for this deck…": "Lendo os dados das cartas deste deck…",
  "Not final.": "Provisória.",
  "Not final": "Provisória",
  "RdyDeck could not read every card in this list yet, so this grade may change.": "O RdyDeck ainda não conseguiu ler todas as cartas desta lista, então esta nota pode mudar.",
  "Read the cards again": "Ler as cartas de novo",
  "Not legal in Standard now": "Não é legal no Padrão agora",
  "Expanded.": "Expandido.",
  "This deck is graded as an Expanded deck, so Standard rotation, tournament results and matchups are left out.": "Este deck recebe nota como Expandido, então a rotação, os resultados de torneios e os confrontos do Padrão ficam de fora.",
  "Reading the card data for this deck. The grade shows once it is done, so it will not change while you look at it.": "Lendo os dados das cartas deste deck. A nota aparece quando terminar, então ela não vai mudar enquanto você olha.",
  "Checking which cards are Standard legal now. The grade shows once it is done, so it will not change while you look at it.": "Verificando quais cartas são legais no Padrão agora. A nota aparece quando terminar, então ela não vai mudar enquanto você olha.",
  "Loading recent tournament results. The grade shows once it is done, so it will not change while you look at it.": "Carregando resultados recentes de torneios. A nota aparece quando terminar, então ela não vai mudar enquanto você olha.",
  "Prize avg": "Média de prêmios",
  "Avg": "Média",
  "Prizes": "Prêmios",
  "Grade": "Nota",
  "Modes": "Modos",
  "Edit": "Editar",
  "Progress": "Progresso",
  "Show hidden decks": "Mostrar decks ocultos",
  "Hide hidden decks": "Esconder decks ocultos",
  "Standard, no prize games yet": "Padrão, ainda sem jogos de prêmios",
  "Expanded, no prize games yet": "Expandido, ainda sem jogos de prêmios",
  "Tapping a deck now opens its grade. Prizes on the deck starts a prize game.": "Agora tocar em um deck abre a nota dele. O botão Prêmios do deck inicia um jogo de prêmios.",
  "Hand, Drills and Notes each have their own tab on a deck. Help has a short tour.": "Mão, Treinos e Notas têm cada um a sua aba no deck. A Ajuda tem um tour curto.",
  "Start with a prize game": "Comece com um jogo de prêmios",
  "Add a deck, then tap play. Six cards go face down and you name them.": "Adicione um deck e toque em Jogar. Seis cartas ficam viradas para baixo e você diz quais são.",
  "Your daily score": "Sua pontuação diária",
  "See what's new": "Ver novidades",
  "Settings": "Configurações",
  "Theme": "Tema",
  "Dark": "Escuro",
  "Light": "Claro",
  "Language": "Idioma",
  "Cards per row": "Cartas por linha",
  "For the Cards tab and the daily list on this screen size.": "Para a aba Cartas e a lista diária neste tamanho de tela.",
  "Move your decks to a new phone or web address": "Leve seus decks para outro celular ou endereço web",
  "Age setting": "Configuração de idade",
  "Sets which ads you see.": "Define quais anúncios você vê.",
  "What's new": "Novidades",
  "Terms of Service": "Termos de Serviço",
  "Privacy Policy": "Política de Privacidade", "Delete your data": "Apague seus dados",
  "Clear all data": "Apagar todos os dados",
  "Deletes every deck and score saved in this browser": "Apaga todos os decks e pontuações salvos neste navegador",
  "Close": "Fechar",
  "Done": "Pronto",
  "Cancel": "Cancelar",
  "Back": "Voltar",
  "Save": "Salvar",
  "Delete": "Excluir",
  "Continue": "Continuar",
  "Next": "Próximo",
  "Yes": "Sim",
  "No": "Não",
  "Got it": "Entendi",
  "Not now": "Agora não",
  "Start": "Começar",
  "Clear": "Limpar",
  "Change": "Alterar",
  "Share": "Compartilhar",
  "Load": "Carregar",
  "Paste": "Colar",
  "Copy": "Copiar",
  "Copied": "Copiado",
  "Saved": "Salvo",
  "Restored": "Restaurado",
  "Exported!": "Exportado!",
  "Take the tour": "Fazer o tour",
  "A one minute walk through the app": "Um passeio de um minuto pelo app",
  "How to play": "Como jogar",
  "Every step of a prize game": "Cada passo de um jogo de prêmios",
  "Send feedback": "Enviar feedback",
  "Report a bug or a missing card": "Relate um erro ou uma carta que falta",
  "Keyboard shortcuts": "Atalhos de teclado",
  "For playing on a computer": "Para jogar no computador",
  "Credits and legal": "Créditos e avisos legais",
  "Where the cards and lists come from": "De onde vêm as cartas e as listas",
  "Unofficial fan-made app. Not affiliated with Nintendo or The Pokémon Company.": "App não oficial feito por fãs. Sem afiliação com a Nintendo ou The Pokémon Company.",
  "Focus guess input": "Ir para o campo de palpite",
  "Focus guess": "Ir para o palpite",
  "Undo last guess": "Desfazer o último palpite",
  "Close dialog or quit game": "Fechar janela ou sair do jogo",
  "Show this help": "Mostrar esta ajuda",
  "Navigate cards": "Navegar pelas cartas",
  "Submit guess": "Enviar palpite",
  "Reveal prizes": "Revelar prêmios",
  "RdyDeck is an unofficial, fan-made app. It is not produced, endorsed, supported or affiliated with Nintendo, The Pokémon Company, Game Freak or Creatures. Pokémon, card names, card text and card images are trademarks and copyright of their respective owners.": "O RdyDeck é um app não oficial feito por fãs. Não é produzido, endossado, apoiado ou afiliado à Nintendo, The Pokémon Company, Game Freak ou Creatures. Pokémon, nomes, textos e imagens das cartas são marcas registradas e direitos autorais de seus respectivos donos.",
  "Card data": "Dados das cartas",
  ", free and open card database (MIT license)": ", banco de dados de cartas livre e aberto (licença MIT)",
  "Backup card data": "Dados das cartas (reserva)",
  "Decklists, meta and card images": "Listas, meta e imagens das cartas",
  "More card images": "Mais imagens das cartas",
  "Pokémon TCG API and TCGdex": "Pokémon TCG API e TCGdex",
  "Fonts": "Fontes",
  "and Saira Condensed by Omnibus-Type (SIL Open Font License 1.1)": "e Saira Condensed da Omnibus-Type (SIL Open Font License 1.1)",
  "Terms and privacy": "Termos e privacidade",
  "and": "e",
  "TCGdex license": "Licença do TCGdex",
  "This opens an email to us in your own email app, with the details filled in. Nothing is sent until you press Send there. Under 13? Ask a parent to send it.": "Isso abre um e-mail para nós no seu próprio app de e-mail, com os detalhes preenchidos. Nada é enviado até você tocar em Enviar lá. Tem menos de 13 anos? Peça para um responsável enviar.",
  "What is it about?": "Sobre o que é?",
  "Bug": "Erro",
  "Missing card": "Carta faltando",
  "Idea": "Ideia",
  "Tell us what happened": "Conte o que aconteceu",
  "Open email": "Abrir e-mail",
  "Added: how each Trainer works in your deck": "Novo: como cada Treinador funciona no seu deck",
  "Every card now gets a label": "Agora toda carta recebe um rótulo",
  "Changed: easier to read Goldfish and puzzle boards": "Mudança: mesas do Goldfish e do puzzle mais fáceis de ler",
  "Added: How to improve your deck guide": "Novo: guia Como melhorar seu deck",
  "Search and AI assistant updates": "Melhorias para buscadores e assistentes de IA",
  "Deck guides refreshed": "Guias de decks atualizados",
  "Welcome to RdyDeck": "Boas-vindas ao RdyDeck",
  "Grade any Pokémon TCG deck: how well the cards work together, whether it can win, and what to fix first. Then practice it.": "Avalie qualquer deck de Pokémon TCG: se as cartas funcionam bem juntas, se ele pode vencer e o que corrigir primeiro. Depois treine com ele.",
  "Add a deck": "Adicione um deck",
  "Paste a list from Pokémon TCG Live or Limitless, or load one of the starter decks from recent Regionals in one tap.": "Cole uma lista do Pokémon TCG Live ou do Limitless, ou carregue com um toque um dos decks iniciais de Regionais recentes.",
  "Read the grade": "Leia a nota",
  "Tap a deck to open its grade. Fix first lists what costs you the most, and Rotation shows which cards leave Standard next.": "Toque em um deck para abrir a nota. Corrija primeiro mostra o que mais custa, e Rotação mostra quais cartas saem do Padrão na próxima rotação.",
  "Check the odds": "Veja as chances",
  "Odds answers your own question, like Arven and a Ball by turn 2, and shows your opening Basics.": "A aba Chances responde à sua pergunta, como Arven e uma Ball até o turno 2, e mostra seus Básicos de abertura.",
  "Practice": "Prática",
  "Prizes on a deck starts a prize game: six cards go face down and you name them. The Hand, Drills and Notes tabs hold opening hands, goldfish turns, drills and matchup notes.": "O botão Prêmios de um deck inicia um jogo de prêmios: seis cartas ficam viradas para baixo e você diz quais são. As abas Mão, Treinos e Notas têm mãos iniciais, turnos de goldfish, treinos e notas de confrontos.",
  "Come back daily": "Volte todo dia",
  "The daily challenge is the same shuffle for everyone. Log your matches in the tournament log. Help on the home screen replays this tour.": "O desafio diário é o mesmo embaralhamento para todos. Registre suas partidas no registro de torneios. A Ajuda, na tela inicial, repete este tour.",
  "Paste my list": "Colar minha lista",
  "Play a prize game": "Jogue um jogo de prêmios",
  "Study your deck": "Estude seu deck",
  "Import your deck": "Importe seu deck",
  "Paste your Limitless TCG 60 card list and the app builds your card gallery automatically.": "Cole sua lista de 60 cartas do Limitless TCG e o app monta sua galeria de cartas automaticamente.",
  "Flip through the visible cards": "Passe pelas cartas visíveis",
  "Swipe left and right. Some cards are secretly set aside as prizes before you start.": "Deslize para a esquerda e para a direita. Antes de começar, algumas cartas são separadas em segredo como prêmios.",
  "Guess every prize card": "Adivinhe todas as cartas de Prêmio",
  "Type your guesses with autocomplete, then tap Reveal prizes.": "Digite seus palpites com o autocompletar e toque em Revelar prêmios.",
  "Challenge modes": "Modos de desafio",
  "Tap Modes on a deck to change the prize count (4, 6 or 8), add a time limit, or both.": "Toque em Modos em um deck para mudar a quantidade de prêmios (4, 6 ou 8), colocar limite de tempo, ou os dois.",
  "Track weak spots": "Acompanhe seus pontos fracos",
  "After 3 sessions the app shows which cards you miss most often, so you know what to focus on.": "Depois de 3 sessões o app mostra quais cartas você mais erra, para saber no que focar.",
  "Practice openings and share lists": "Treine aberturas e compartilhe listas",
  "Open a deck and use the Hand tab to drill turn 1 lines. The link button at the top gives you a link that opens the list in RdyDeck.": "Abra um deck e use a aba Mão para treinar jogadas do turno 1. O botão de link no topo dá um link que abre a lista no RdyDeck.",
  "Goldfish, drills and notes": "Goldfish, treinos e notas",
  "Each has its own tab on a deck. Hand can goldfish your first three turns. Drills has resource counts and an opponent prize read. Notes keeps matchup plans, an edit log of every card change, and a compare view. Card art you have seen is saved for offline play.": "Cada um tem sua aba no deck. Mão faz goldfish dos seus três primeiros turnos. Treinos tem contagem de recursos e leitura dos prêmios do oponente. Notas guarda planos de confronto, um histórico de cada mudança de cartas e uma comparação. A arte das cartas que você já viu fica salva para jogar offline.",
  "Top finishes for the most played decks at big online tournaments, not Regionals. Lists as of 15 Nov 2026. Load one to start practicing right away, then edit it to match your own build.": "Melhores resultados dos decks mais jogados em grandes torneios online, não Regionais. Listas de 15 nov 2026. Carregue uma para treinar na hora e depois edite para ficar igual à sua versão.",
  "Most played right now": "Mais jogados agora",
  "Paste my own": "Colar a minha",
  "Deck name (optional)": "Nome do deck (opcional)",
  "Deck list": "Lista do deck",
  "Deck name": "Nome do deck",
  "Paste the export from Limitless or Pokémon TCG Live, section headers included. A full list grades as soon as it is pasted.": "Cole a exportação do Limitless ou do Pokémon TCG Live, com os cabeçalhos das seções. Uma lista completa recebe nota assim que é colada.",
  "No list handy? Load a starter deck": "Sem lista à mão? Carregue um deck inicial",
  "Format": "Formato",
  "Standard": "Padrão",
  "Expanded": "Expandido",
  "Import and save": "Importar e salvar",
  "Open": "Abrir",
  "Nothing is saved in this browser yet. To bring decks here, open a file you saved before.": "Ainda não há nada salvo neste navegador. Para trazer decks para cá, abra um arquivo que você salvou antes.",
  "Open a saved file or paste the text. Decks are added to the ones here, nothing is removed.": "Abra um arquivo salvo ou cole o texto. Os decks são somados aos que já estão aqui, nada é apagado.",
  "Open a file": "Abrir arquivo",
  "Read pasted text": "Ler o texto colado",
  "Save a file": "Salvar arquivo",
  "Copy as text": "Copiar texto",
  "Add to my decks": "Adicionar aos meus decks",
  "Replace everything": "Substituir tudo",
  "Please enter a deck name.": "Digite um nome para o deck.",
  "Deck list is empty.": "A lista do deck está vazia.",
  "No cards could be parsed.": "Nenhuma carta pôde ser lida.",
  "Please paste your deck list.": "Cole a lista do seu deck.",
  "No cards could be parsed. Check the format.": "Nenhuma carta pôde ser lida. Confira o formato.",
  "Pasted from clipboard!": "Colado da área de transferência!",
  "Tap inside the text box and long-press to paste.": "Toque dentro da caixa de texto e segure para colar.",
  "Backup copied to clipboard!": "Backup copiado para a área de transferência!",
  "Long-press the text box and select all, then copy.": "Segure na caixa de texto, selecione tudo e copie.",
  "Nothing to restore.": "Nada para restaurar.",
  "Invalid backup data.": "Dados de backup inválidos.",
  "Could not parse backup. Make sure you pasted the full text.": "Não deu para ler o backup. Confira se colou o texto inteiro.",
  "That backup is damaged or incomplete. Nothing was changed.": "Esse backup está danificado ou incompleto. Nada foi alterado.",
  "Copied. Paste it somewhere safe, like a note to yourself.": "Copiado. Cole em algum lugar seguro, como uma nota para você mesmo.",
  "Select the text in the box and copy it.": "Selecione o texto da caixa e copie.",
  "Too many decks for one link. Save a file here, then open it at rdydeck.com.": "Decks demais para um link só. Salve um arquivo aqui e abra em rdydeck.com.",
  "Your decks are here. Tap Add to my decks to keep them.": "Seus decks estão aqui. Toque em Adicionar aos meus decks para ficar com eles.",
  "RdyDeck has moved to rdydeck.com.": "O RdyDeck mudou para rdydeck.com.",
  "Move my decks": "Mover meus decks",
  "Go to rdydeck.com": "Ir para rdydeck.com",
  "Kept on this device only.": "Fica salvo só neste aparelho.",
  "All data cleared.": "Todos os dados foram apagados.",
  "Deck link copied.": "Link do deck copiado.",
  "Select the link and copy it.": "Selecione o link e copie.",
  "That deck link could not be read.": "Não deu para ler esse link de deck.",
  "This browser cannot open compressed deck links. Try an up to date browser.": "Este navegador não abre links de deck comprimidos. Tente um navegador atualizado.",
  "Link copied. Send it to your friend.": "Link copiado. Mande para seu amigo.",
  "Import a deck first.": "Importe um deck primeiro.",
  "Thumbnail updated!": "Capa atualizada!",
  "Grade, odds and cards": "Nota, chances e cartas",
  "Prize game": "Jogo de prêmios",
  "Game modes": "Modos de jogo",
  "Edit the list": "Editar a lista",
  "Cover card": "Carta de capa",
  "Hide deck": "Esconder deck",
  "Show deck": "Mostrar deck",
  "Delete deck": "Excluir deck",
  "Its prize games, drills and notes are deleted with it. This cannot be undone.": "Os jogos de prêmios, treinos e notas dele são apagados junto. Isso não pode ser desfeito.",
  "Choose a cover card": "Escolha uma carta de capa",
  "Edit deck": "Editar deck",
  "Edit your full 60 card list, then save.": "Edite sua lista completa de 60 cartas e salve.",
  "Duplicate": "Duplicar",
  "More for this deck": "Mais para este deck",
  "Share deck link": "Compartilhar link do deck",
  "Back to decks": "Voltar aos decks",
  "Deck": "Deck",
  "Cards": "Cartas",
  "Odds": "Chances",
  "Hand": "Mão",
  "Drills": "Treinos",
  "Notes": "Notas",
  "Edit list": "Editar lista",
  "Pokémon": "Pokémon",
  "Trainers": "Treinadores",
  "Trainer": "Treinador",
  "Energy": "Energia",
  "Supporter": "Apoiador",
  "Supporters": "Apoiadores",
  "Item": "Item",
  "Items": "Itens",
  "Stadium": "Estádio",
  "Pokémon Tool": "Ferramenta Pokémon",
  "Special Energy": "Energia Especial",
  "Basic Energy": "Energia Básica",
  "Basic": "Básico",
  "Stage 1": "Estágio 1",
  "Stage 2": "Estágio 2",
  "Fire": "Fogo",
  "Water": "Água",
  "Grass": "Planta",
  "Lightning": "Raio",
  "Fighting": "Luta",
  "Darkness": "Escuridão",
  "Metal": "Metal",
  "Dragon": "Dragão",
  "Colorless": "Incolor",
  "Fairy": "Fada",
  "No Energy": "Sem Energia",
  "All": "Tudo",
  "Tournament-ready": "Pronto para torneio",
  "Strong": "Forte",
  "Fixable": "Ajustável",
  "Needs work": "Precisa de ajustes",
  "Does not function": "Não funciona",
  "Not legal yet": "Ainda não é legal",
  "Ready for an event as it is.": "Pronto para um evento do jeito que está.",
  "A good list with a few things to tighten.": "Uma boa lista com alguns detalhes para ajustar.",
  "The plan works, but problems will cost you games.": "O plano funciona, mas os problemas vão custar partidas.",
  "Several problems stop it from working reliably.": "Vários problemas impedem que ele funcione de forma confiável.",
  "It cannot carry out its plan yet.": "Ele ainda não consegue executar o plano.",
  "Fix first shows the one problem found.": "Corrija primeiro mostra o único problema encontrado.",
  "One problem stops this deck from working. Fix it first.": "Um problema impede este deck de funcionar. Corrija isso primeiro.",
  "One problem also stops this deck from working.": "Além disso, um problema impede este deck de funcionar.",
  "One other change would make it stronger.": "Outra mudança o deixaria mais forte.",
  "No problems found.": "Nenhum problema encontrado.",
  "Top fix": "A principal correção",
  "Top three fixes": "As três principais correções",
  "Top fixes": "Principais correções",
  "Checking which changes help most.": "Verificando quais mudanças ajudam mais.",
  "How it plays": "Como joga",
  "Synergy": "Sinergia",
  "Power": "Poder",
  "Do the cards work together": "As cartas funcionam juntas?",
  "Can it win a game": "Ele pode vencer uma partida?",
  "Share grade": "Compartilhar nota",
  "is what holds it back.": "é o que segura a nota.",
  "Right now": "No momento",
  "Fix first": "Corrija primeiro",
  "The problem that costs you the most.": "O problema que mais custa.",
  "Stops the deck": "Trava o deck",
  "Worth fixing": "Vale corrigir",
  "Minor": "Leve",
  "Nothing to fix": "Nada para corrigir",
  "Nothing else to fix": "Nada mais para corrigir",
  "The grader found no problem in this list.": "O avaliador não encontrou problemas nesta lista.",
  "Apart from the deck rules above, the grader found no problem in this list.": "Fora as regras de montagem acima, o avaliador não encontrou problemas nesta lista.",
  "Check the odds and the rotation below before an event.": "Confira as chances e a rotação abaixo antes de um evento.",
  "Working well": "Funcionando bem",
  "How the grade works": "Como funciona a nota",
  "under 3": "abaixo de 3",
  "checks that your cards support each other: every attacker can pay for its attacks, evolutions have what they evolve from, and the deck can draw and search.": "verifica se suas cartas se apoiam: todo atacante consegue pagar os ataques, as evoluções têm de onde evoluir e o deck consegue comprar e buscar.",
  "checks that the plan can win: how hard it hits against the format's biggest Pokemon, how many prizes it gives up, and how fast it sets up.": "verifica se o plano consegue vencer: quanto dano causa contra os maiores Pokémon do formato, quantos prêmios entrega e quão rápido monta o jogo.",
  "The card grade is Synergy times Power, divided by 10. How tightly the list fits together lowers Synergy in full, but lowers the grade only when the fit is loose. When your deck matches an archetype from recent online tournaments, part of the grade comes from that archetype's win rate and finishes: more of it the more games there are, up to half at 500 games, and none while cards are not Standard legal. The sentence under the grade shows how much. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "A nota das cartas é Sinergia vezes Poder, dividido por 10. O quanto a lista é coesa baixa a Sinergia por inteiro, mas só baixa a nota quando a lista está espalhada. Quando seu deck corresponde a um arquétipo de torneios online recentes, parte da nota vem da taxa de vitória e dos resultados desse arquétipo: mais quanto mais partidas houver, até a metade com 500 partidas, e nada enquanto houver cartas que não são legais no Padrão. A frase abaixo da nota mostra quanto. Os papéis das cartas são lidos do texto da carta, que quase sempre acerta e às vezes não. Leia os achados e não se preocupe com a casa decimal.",
  "No card data for this deck yet.": "Ainda não há dados das cartas deste deck.",
  "These could not be looked up, so they count for nothing in the grade. Opening the deck again while online tries again.": "Não deu para consultar essas cartas, então elas não contam na nota. Abrir o deck de novo com internet tenta outra vez.",
  "Grade history": "Histórico de notas",
  "Upgrades": "Melhorias",
  "Upgrades need a connection the first time, to read the cards to try.": "As melhorias precisam de internet na primeira vez, para ler as cartas a testar.",
  "Checking which card swaps raise this grade.": "Verificando quais trocas de cartas sobem esta nota.",
  "Main attacker": "Atacante principal",
  "Toolbox: several attackers": "Toolbox: vários atacantes",
  "The Pokemon you set is no longer in the list, so the grade is back on Auto.": "O Pokémon que você escolheu não está mais na lista, então a nota voltou para Auto.",
  "Rotation": "Rotação",
  "Announced": "Anunciada",
  "Expected": "Esperada",
  "not legal now": "não legais agora",
  "may rotate": "podem rotacionar",
  "rotate next": "rotacionam na próxima",
  "not confirmed": "não confirmadas",
  "safe": "seguras",
  "Rotation safe": "Livre da rotação",
  "Not Standard legal now": "Não legal no Padrão agora",
  "Not confirmed yet": "Ainda não confirmada",
  "Could not be read from the card database": "Não deu para ler no banco de dados de cartas",
  "No reprint with a later mark found": "Nenhuma reimpressão com marca mais nova encontrada",
  "No mark on this printing in the card database": "Esta impressão não tem marca no banco de dados de cartas",
  "Checking for reprints": "Procurando reimpressões",
  "Reprints not checked yet": "Reimpressões ainda não verificadas",
  "This printing is not in the card database yet, so its mark is not confirmed": "Esta impressão ainda não está no banco de dados de cartas, então a marca não está confirmada",
  "Mark read from another printing, so not confirmed": "Marca lida de outra impressão, então não confirmada",
  "No mark found in the card database": "Nenhuma marca encontrada no banco de dados de cartas",
  "Mark read from another printing, so counted as legal": "Marca lida de outra impressão, então conta como legal",
  "Mark not confirmed in the card database, so counted as legal": "Marca não confirmada no banco de dados de cartas, então conta como legal",
  "mark read from another printing": "marca lida de outra impressão",
  "Check reprints again": "Procurar de novo",
  "Nothing here rotates next": "Nada aqui rotaciona na próxima",
  "This may be out of date": "Isso pode estar desatualizado",
  "Pokémon usually announces rotation in January. If it has, update the app to see the official date.": "A Pokémon costuma anunciar a rotação em janeiro. Se já anunciou, atualize o app para ver a data oficial.",
  "Rotation is a Standard format change. This deck is set to Expanded, so nothing here rotates next.": "A rotação é uma mudança do formato Padrão. Este deck está no Expandido, então nada aqui rotaciona na próxima.",
  ", not announced yet.": ", data ainda não anunciada.",
  "cards are expected to leave Standard in": "devem sair do Padrão em",
  "cards leave Standard in": "saem do Padrão em",
  "). For a Pokémon, the reprint needs the same name, attacks and Abilities. The marks come from the card database, so check a card you are unsure of before an event.": "). Para um Pokémon, a reimpressão precisa ter o mesmo nome, ataques e Habilidades. As marcas vêm do banco de dados de cartas, então confira qualquer carta de que tiver dúvida antes de um evento.",
  "A card with an older mark stays legal while a reprint with a legal mark exists (": "Uma carta com marca antiga continua legal enquanto existir uma reimpressão com marca legal (",
  "Pokémon has not announced it yet (": "A Pokémon ainda não anunciou (",
  "Source:": "Fonte:",
  "Grade vs win rate": "Nota x taxa de vitória",
  "Cards alone:": "Só as cartas:",
  "Win rate:": "Taxa de vitória:",
  "Results beat its cards.": "Os resultados superam as cartas.",
  "Cards and results agree.": "As cartas e os resultados concordam.",
  "Cards beat its results.": "As cartas superam os resultados.",
  "The cards and the record rank this deck about the same.": "As cartas e o retrospecto colocam este deck mais ou menos no mesmo lugar.",
  "Against the meta": "Contra o meta",
  "Strength:": "Força:",
  "won": "venceu",
  "Data:": "Dados:",
  "Favored": "Favorecido",
  "Unfavored": "Desfavorecido",
  "Even": "Equilibrado",
  "Leans favored": "Levemente favorecido",
  "Leans unfavored": "Levemente desfavorecido",
  "Other popular decks": "Outros decks populares",
  "Against": "Contra",
  "Win rate": "Taxa de vitória",
  "Matches": "Partidas",
  "The line in each bar is 50%. The light band is the likely range from the games so far. Favored and Unfavored need the whole band on one side of 50%.": "A linha de cada barra é 50%. A faixa clara é o intervalo provável pelas partidas até agora. Favorecido e Desfavorecido precisam da faixa inteira de um lado dos 50%.",
  "All results": "Todos os resultados",
  "No deck in recent results plays the same Pokemon as this one. Pick the closest deck above to see its matchups.": "Nenhum deck dos resultados recentes joga os mesmos Pokémon que este. Escolha acima o deck mais parecido para ver os confrontos.",
  "Trainers and Special Energy: nothing missing or dead.": "Treinadores e Energia Especial: nada faltando nem carta morta.",
  "No clear attacker, so the score is cut to 30%.": "Sem atacante claro, então a pontuação cai para 30%.",
  "No real draw engine, so the score is cut to 40%.": "Sem motor de compra de verdade, então a pontuação cai para 40%.",
  "That one stops the deck, so it costs 1.2 more.": "Esse trava o deck, então custa 1.2 a mais.",
  "Damage": "Dano",
  "Prize trade": "Troca de prêmios",
  "Setup speed": "Velocidade de montagem",
  "No clear attacker": "Sem atacante claro",
  "Nothing can reliably attack": "Nada consegue atacar com confiança",
  "No Supporter to draw with": "Sem Apoiador para comprar",
  "Two hits for the biggest threats": "Dois golpes para derrubar as maiores ameaças",
  "Damage ceiling is too low": "O dano máximo é baixo demais",
  "A three-prize Pokemon in a one-prize deck": "Um Pokémon de três prêmios em um deck de um prêmio",
  "Big attackers, but the power backs it up": "Atacantes grandes, mas o poder compensa",
  "Closes through spread, not one big hit": "Fecha com dano espalhado, não com um golpe grande",
  "Draws every turn": "Compra todo turno",
  "Efficient prize trade": "Troca de prêmios eficiente",
  "Evolves the long way": "Evolui pelo caminho longo",
  "Hard to disrupt": "Difícil de atrapalhar",
  "Heavy on Energy": "Muita Energia",
  "Hits hard enough to trade up": "Bate forte o bastante para ganhar a troca",
  "Hits several Pokemon at once": "Acerta vários Pokémon ao mesmo tempo",
  "Many ways to attack": "Muitas formas de atacar",
  "Might be slow off the line": "Pode começar devagar",
  "Mostly two-prize Pokemon": "Quase só Pokémon de dois prêmios",
  "No ACE SPEC": "Sem ÁS TÁTICO",
  "No ACE SPEC. Every deck may run 1, and nearly every top list does.": "Sem ÁS TÁTICO. Todo deck pode ter 1, e quase todas as listas do topo têm.",
  "No Basic Pokémon, so the game cannot start.": "Sem Pokémon Básico, então a partida não pode começar.",
  "No Pokémon yet.": "Ainda não há Pokémon.",
  "No real draw engine": "Sem motor de compra de verdade",
  "No way to find your Pokemon": "Sem como buscar seus Pokémon",
  "Nothing to pull up a Benched Pokemon": "Nada para puxar um Pokémon do Banco",
  "Sets up on time": "Monta a tempo",
  "Some damage is left out": "Parte do dano fica de fora",
  "Three-prize attackers, two-prize punch": "Atacantes de três prêmios, golpe de dois prêmios",
  "Two prizes per knockout": "Dois prêmios por nocaute",
  "Every Pokemon here gives up one prize, so the opponent has to take six knockouts.": "Cada Pokémon aqui entrega um prêmio, então o oponente precisa fazer seis nocautes.",
  "No Pokemon here is set up to deal meaningful damage, so there is no win condition to build toward.": "Nenhum Pokémon aqui está preparado para causar dano de verdade, então não há condição de vitória para montar.",
  "None of your attackers have the energy they need, so damage output is basically zero.": "Nenhum dos seus atacantes tem a Energia de que precisa, então o dano é praticamente zero.",
  "Your only card that pulls up a Benched Pokemon, which is how you take the prizes you choose.": "Sua única carta que puxa um Pokémon do Banco, que é como você pega os prêmios que escolhe.",
  "Switches your Active Pokemon.": "Troca seu Pokémon Ativo.",
  "Removes your opponent's Energy and gets rid of Pokemon Tools.": "Remove Energia do oponente e descarta Ferramentas Pokémon.",
  "Synergy: how the cards fit": "Sinergia: como as cartas se encaixam",
  "Good": "Boa",
  "Key": "Chave",
  "Weak": "Fraca",
  "Dead": "Morta",
  "Fine": "OK",
  "In this deck:": "Neste deck:",
  "RdyDeck hasn't read this card's text yet, so it has no label. Open the deck online to read it.": "O RdyDeck ainda não leu o texto desta carta, então ela não tem rótulo. Abra o deck com internet para ler.",
  "Mulligan": "Mulligan",
  "Opening 7 with no Basic": "7 iniciais sem Básico",
  "Draw card T1": "Carta de compra T1",
  "A draw card you can use, in your first 8": "Uma carta de compra que dá para usar, nas suas 8 primeiras",
  "Attacker by T2, any hand": "Atacante até T2, qualquer mão",
  "No attacker line read": "Nenhuma linha de atacante lida",
  "Ask the odds": "Consulte as chances",
  "Pick the cards you need and the turn. Exact counting for this list: a hand with no Basic is redrawn, so only hands you keep count, and both players draw on their first turn.": "Escolha as cartas de que precisa e o turno. Contagem exata para esta lista: uma mão sem Básico é comprada de novo, então só contam as mãos que você mantém, e os dois jogadores compram no primeiro turno.",
  "At least": "Pelo menos",
  "of": "de",
  "or": "ou",
  "And another card": "E outra carta",
  "By": "Até",
  "Stuck in prizes: 0.0%": "Presa nos prêmios: 0.0%",
  "Games where the prizes hold so many copies that hand and deck cannot make this until you take the right prize. The same on every turn.": "Partidas em que os prêmios têm tantas cópias que mão e deck não conseguem até você pegar o prêmio certo. Igual em todos os turnos.",
  "No Basic Pokemon was read in this list, so every opening hand counts.": "Nenhum Pokémon Básico foi lido nesta lista, então toda mão inicial conta.",
  "Raw draws only: search and draw cards are not played out, so a real game lands at or above these numbers.": "Só compras puras: cartas de busca e de compra não são jogadas, então uma partida real fica nesses números ou acima.",
  "No Basic Pokémon read": "Nenhum Pokémon Básico lido",
  "No card in this list was read as a Basic Pokemon, so mulligan odds cannot be counted. If the list has Basics, re-saving the deck retries the lookup.": "Nenhuma carta desta lista foi lida como Pokémon Básico, então as chances de mulligan não podem ser contadas. Se a lista tem Básicos, salvar o deck de novo tenta outra vez.",
  "Prize risk": "Risco nos prêmios",
  "Exact chance a card lands in your six prizes, counting only opening hands you keep.": "Chance exata de uma carta cair nos seus seis prêmios, contando só as mãos iniciais que você mantém.",
  "All prized": "Todas",
  "means every copy is stuck there, which is the case RdyDeck drills you to spot.": "significa que todas as cópias ficaram lá, que é o caso que o RdyDeck treina você a perceber.",
  "Card": "Carta",
  "Copies": "Cópias",
  "Any prized": "Alguma",
  "What this does not do.": "O que isso não faz.",
  "Matchup win rates are not here. They are on the Grade tab, in Against the meta, from recent online tournaments. Everything on this tab comes from shuffling your own list.": "As taxas de vitória por confronto não estão aqui. Elas ficam na aba Nota, em Contra o meta, a partir de torneios online recentes. Tudo nesta aba vem de embaralhar sua própria lista.",
  "Opening Basics": "Básicos de abertura",
  "In opening hand": "Na mão inicial",
  "Attacker": "Atacante",
  "This list is too short to simulate.": "Esta lista é curta demais para simular.",
  "Odds need at least 15 cards: an opening hand, six prizes and two draws.": "As chances precisam de pelo menos 15 cartas: uma mão inicial, seis prêmios e duas compras.",
  "Games where every copy of a piece the attacker needs is prized, so it cannot come online until you take that prize.": "Partidas em que todas as cópias de uma peça de que o atacante precisa estão nos prêmios, então ele não funciona até você pegar esse prêmio.",
  "Pick cards": "Escolher cartas",
  "Pick a card to see how often you have it.": "Escolha uma carta para ver com que frequência você a tem.",
  "No card data yet, so mulligans are not taken out. Open Edit deck and save it to read the cards.": "Ainda não há dados das cartas, então os mulligans não são descontados. Abra Editar deck e salve para ler as cartas.",
  "Tick one card, or several. With several, pick how they count.": "Marque uma carta, ou várias. Com várias, escolha como contam.",
  "Any of them (or)": "Qualquer uma (ou)",
  "Every one (and)": "Todas (e)",
  "Core": "Núcleo",
  "Flex": "Flex",
  "Turn 1 line": "Jogada do turno 1",
  "Goldfish 3 turns": "Goldfish 3 turnos",
  "Opening hand": "Mão inicial",
  "A random 7 from this list. Pick the line you would build on turn 1, lock it in, then see how often it comes together.": "7 cartas aleatórias desta lista. Escolha a jogada que você montaria no turno 1, confirme e veja com que frequência ela sai.",
  "Kept the first 7": "Ficou com as 7 primeiras",
  "No Basic read, mulligan rule off": "Nenhum Básico lido, regra de mulligan desligada",
  "Set up": "Montar",
  "Tap a Basic to put it in play and carry on in Goldfish with this same hand.": "Toque em um Básico para colocar em jogo e seguir no Goldfish com esta mesma mão.",
  "No Pokémon line read": "Nenhuma linha de Pokémon lida",
  "No complete evolution line or attacker was read in this list, so there is nothing to compare. Re-saving the deck retries the lookup.": "Nenhuma linha de evolução completa ou atacante foi lido nesta lista, então não há o que comparar. Salvar o deck de novo tenta outra vez.",
  "New hand": "Nova mão",
  "Your turn 1 line": "Sua jogada do turno 1",
  "Which Pokémon would you set up first with this hand?": "Qual Pokémon você montaria primeiro com esta mão?",
  "Lock in line": "Confirmar",
  "Play this hand in Goldfish": "Jogar esta mão no Goldfish",
  "This hand by T2": "Esta mão até T2",
  "This hand by T3": "Esta mão até T3",
  "This opening hand only, with search": "Só esta mão inicial, com busca",
  "Locked in prizes": "Presa nos prêmios",
  "A piece fully prized": "Uma peça toda nos prêmios",
  "Every line from this hand": "Todas as jogadas com esta mão",
  "Line": "Jogada",
  "T2 raw": "T2 sem busca",
  "T2 search": "T2 com busca",
  "Your pick": "Sua escolha",
  "Best": "Melhor",
  "How this deal fell": "Como saiu esta distribuição",
  "The prizes and draws this shuffle actually gave you. Highlighted cards are pieces of your line.": "Os prêmios e compras que este embaralhamento deu de verdade. As cartas destacadas são peças da sua jogada.",
  "Turn 1 and 2 draws": "Compras dos turnos 1 e 2",
  "Turn 3 draw": "Compra do turno 3",
  "What this counts.": "O que isso conta.",
  "Search cards each fetch one missing piece if a copy is still in the deck. Draw Supporters, abilities, discard costs and the one Supporter per turn rule are not played out, the same as the Odds tab. Play this hand in Goldfish plays them out turn by turn, with the same prizes and draws.": "Cada carta de busca pega uma peça que falta se ainda houver uma cópia no deck. Apoiadores de compra, Habilidades, custos de descarte e a regra de um Apoiador por turno não são jogados, igual à aba Chances. Jogar esta mão no Goldfish joga tudo turno a turno, com os mesmos prêmios e compras.",
  "Going first": "Jogando primeiro",
  "Going second": "Jogando em segundo",
  "Empty": "Vazio",
  "Discard": "Descartar",
  "New deal going second": "Nova mão, jogando em 2º",
  "New deal going first": "Nova mão, jogando em 1º",
  "New deal": "Embaralhar",
  "Start turn 1": "Começar turno 1",
  "Goldfish rules.": "Regras do Goldfish.",
  "You draw every turn, one Energy and one Supporter a turn, no Supporter on turn 1 going first, and no evolving on your first turn or onto a Pokémon that came in this turn. Abilities, Items, Supporters and Stadiums do what their card text says, with each card's own limits. Effects on your opponent do nothing here. When the app cannot follow a card yet, it shows the text and you use Draw, Search and Discard.": "Você compra todo turno, uma Energia e um Apoiador por turno, sem Apoiador no turno 1 para quem joga primeiro, e sem evoluir no seu primeiro turno ou em um Pokémon que entrou neste turno. Habilidades, Itens, Apoiadores e Estádios fazem o que diz o texto, com os limites de cada carta. Efeitos no oponente não fazem nada aqui. Quando o app ainda não consegue seguir uma carta, ele mostra o texto e você usa Comprar, Buscar e Descartar.",
  "Draw": "Comprar",
  "Search": "Buscar",
  "Draw 1": "Comprar 1",
  "Shuffle hand in": "Mão para o deck",
  "To Bench": "Para o Banco",
  "To hand": "Para a mão",
  "No cards here.": "Não há cartas aqui.",
  "Nothing in the deck fits.": "Nada no deck serve.",
  "The app cannot follow this card's text yet. Do it with Draw, Search and Discard below, then tap Done.": "O app ainda não consegue seguir o texto desta carta. Faça com Comprar, Buscar e Descartar abaixo e toque em Pronto.",
  "Both went to your hand. Attach one of them to a Pokémon.": "As duas foram para a sua mão. Ligue uma delas a um Pokémon.",
  "Switch it into the Active Spot": "Troque para o Campo Ativo",
  "Stop here": "Parar aqui",
  "This list is too short to goldfish.": "Esta lista é curta demais para goldfish.",
  "This list is too short for hand practice.": "Esta lista é curta demais para treinar mãos.",
  "It needs an opening hand, six prizes and three draws.": "Precisa de uma mão inicial, seis prêmios e três compras.",
  "No card data yet": "Ainda não há dados das cartas",
  "Goldfish needs each card's stage to know your Basics. Open this deck while online, or open Edit deck and save it, to read them.": "O Goldfish precisa do estágio de cada carta para saber quais são seus Básicos. Abra este deck com internet, ou abra Editar deck e salve, para ler as cartas.",
  "Turn over": "Fim do turno",
  "Pick a new Active Pokémon": "Escolha um novo Pokémon Ativo",
  "No Ability to use.": "Nenhuma Habilidade para usar.",
  "Empty hand.": "Mão vazia.",
  "Shuffles from this opening hand, with search": "Embaralhamentos a partir desta mão inicial, com busca",
  "Your prizes were": "Seus prêmios eram",
  "No Active Pokémon": "Sem Pokémon Ativo",
  "This turn": "Este turno",
  "Choose your new Active Pokémon": "Escolha seu novo Pokémon Ativo",
  "Pick a new Active Pokémon first.": "Escolha um novo Pokémon Ativo primeiro.",
  "Put a Basic in the Active Spot first.": "Coloque um Básico no Campo Ativo primeiro.",
  "Set up a Basic first": "Monte um Básico primeiro",
  "In play from the start": "Em jogo desde o início",
  "Came in this turn": "Entrou neste turno",
  "Active": "Ativo",
  "Bench": "Banco",
  "Active Spot": "Campo Ativo",
  "Attach": "Ligar",
  "Evolve": "Evoluir",
  "Retreat": "Recuar",
  "Attack": "Atacar",
  "End turn": "Encerrar turno",
  "Undo": "Desfazer",
  "Log": "Registro",
  "Resource count": "Contagem de recursos",
  "Your list stays hidden. Here is what you have used so far this game. Say how many of each card you have not used yet, the way you would before a big turn.": "Sua lista fica escondida. Isto é o que você usou até agora nesta partida. Diga quantas de cada carta você ainda não usou, como faria antes de um turno grande.",
  "Start a round": "Começar uma rodada",
  "Opponent prize read": "Leitura dos prêmios do oponente",
  "Load your opponent's list. You see everything they have shown. Six of the rest are prized and the others are still in their deck or hand. Name the six.": "Carregue a lista do oponente. Você vê tudo o que ele já mostrou. Seis do resto estão nos prêmios e as outras ainda estão no deck ou na mão dele. Diga quais são as seis.",
  "Their list": "A lista dele",
  "Paste their list": "Colar a lista dele",
  "Late game": "Fim de jogo",
  "Mid game": "Meio de jogo",
  "Deal their game": "Dar as cartas",
  "How many": "Quantas",
  "have you not used yet?": "você ainda não usou?",
  "New pile": "Nova pilha",
  "Check": "Conferir",
  "Next round": "Próxima rodada",
  "List": "Lista",
  "Shown": "Mostradas",
  "Deal again": "Dar de novo",
  "Matchup notes": "Notas de confrontos",
  "Your prize plan against each deck you expect to face. Saved on this device only.": "Seu plano de prêmios contra cada deck que espera enfrentar. Fica salvo só neste aparelho.",
  "No notes yet. Add one for the decks you see most at your locals.": "Ainda não há notas. Adicione uma para os decks que você mais vê na sua loja.",
  "Add matchup note": "Adicionar nota",
  "Edit log": "Histórico de edições",
  "No changes yet. Save a change in Edit deck and it shows here with the date.": "Ainda não há mudanças. Salve uma mudança em Editar deck e ela aparece aqui com a data.",
  "Compare lists": "Comparar listas",
  "This list against an earlier version or another deck: card changes and how the odds move.": "Esta lista contra uma versão anterior ou outro deck: mudanças de cartas e como as chances mudam.",
  "Nothing to compare yet. Save a change in Edit deck, or import a second deck.": "Ainda não há o que comparar. Salve uma mudança em Editar deck, ou importe um segundo deck.",
  "New matchup note": "Nova nota de confronto",
  "Opposing deck": "Deck adversário",
  "Prize plan": "Plano de prêmios",
  "Matchup note saved.": "Nota de confronto salva.",
  "No plan written yet.": "Ainda não há plano escrito.",
  "Compare with": "Comparar com",
  "This list": "Esta lista",
  "Same cards and counts as this list.": "As mesmas cartas e quantidades desta lista.",
  "Back to the starting list.": "De volta à lista inicial.",
  "Odds, counted like the Odds tab": "Chances, contadas como na aba Chances",
  "Prize plan for this matchup": "Plano de prêmios para este confronto",
  "Your prize plan:": "Seu plano de prêmios:",
  "Game mode": "Modo de jogo",
  "These settings carry over to every deck.": "Estas configurações valem para todos os decks.",
  "Prize cards": "Cartas de Prêmio",
  "standard": "padrão",
  "Time limit": "Limite de tempo",
  "Off": "Não",
  "On": "Sim",
  "Deck view": "Visão do deck",
  "table check holds out a hand of 7": "checar mesa separa uma mão de 7",
  "Full deck": "Deck completo",
  "Table check": "Checar mesa",
  "Reach check": "Verificação de alcance",
  "can you still get it? before the reveal": "ainda dá para pegar? antes de revelar",
  "Tournament": "Torneio",
  "back to back games": "partidas seguidas",
  "Games": "Partidas",
  "Start game": "Começar partida",
  "Prize guesses": "Palpites de prêmios",
  "Guess": "Palpite",
  "Back to menu": "Voltar ao menu",
  "Quit game": "Sair do jogo",
  "Quit": "Sair",
  "Finish": "Terminar",
  "Tournament complete": "Torneio concluído",
  "PERFECT!": "PERFEITO!",
  "Prize cards found": "Cartas de Prêmio encontradas",
  "Your guesses vs the prizes": "Seus palpites x os prêmios",
  "Add a note about this game": "Adicionar uma nota sobre esta partida",
  "Notes on missed prizes": "Notas sobre prêmios errados",
  "No guess": "Sem palpite",
  "Session history": "Histórico de sessões",
  "Score": "Pontuação",
  "Time": "Tempo",
  "Date": "Data",
  "View prize cards": "Ver cartas de Prêmio",
  "All decks": "Todos os decks",
  "Export history (CSV)": "Exportar histórico (CSV)",
  "Play again": "Jogar de novo",
  "Personal bests": "Recordes pessoais",
  "No history yet.": "Ainda não há histórico.",
  "Drill your missed cards": "Treine as cartas que você errou",
  "Insights": "Análises",
  "Guessed but not prized:": "Palpites que não estavam nos prêmios:",
  "Drill mode: prizes biased toward your weak spots.": "Modo treino: prêmios puxados para seus pontos fracos.",
  "No history to export.": "Não há histórico para exportar.",
  "This game was saved before prize cards were kept.": "Esta partida foi salva antes de as cartas de Prêmio serem guardadas.",
  "Can you still get it?": "Ainda dá para pegar?",
  "Score copied. Paste it anywhere.": "Pontuação copiada. Cole onde quiser.",
  "Result copied. Paste it anywhere.": "Resultado copiado. Cole onde quiser.",
  "Progress and weak spots": "Progresso e pontos fracos",
  "Sessions played": "Sessões jogadas",
  "Average score": "Pontuação média",
  "Perfect runs": "Jogos perfeitos",
  "Progress over time": "Progresso ao longo do tempo",
  "Accuracy": "Precisão",
  "Avg time": "Tempo médio",
  "Days": "Dias",
  "Play on another day to see a trend line.": "Jogue em outro dia para ver uma linha de tendência.",
  "Day": "Dia",
  "Score trend": "Tendência de pontuação",
  "Miss rate by card": "Erros por carta",
  "Play more sessions to build miss rate data.": "Jogue mais sessões para juntar dados de erros.",
  "Event": "Evento",
  "Round": "Rodada",
  "Your deck": "Seu deck",
  "Opponent's deck": "Deck do oponente",
  "Match": "Partida",
  "One game": "Uma partida",
  "Best of three": "Melhor de três",
  "You went": "Você jogou",
  "First": "Primeiro",
  "Second": "Segundo",
  "Not sure": "Não sei",
  "Result": "Resultado",
  "Prizes you took": "Prêmios que você pegou",
  "Prizes they took": "Prêmios que o oponente pegou",
  "Win": "Vitória",
  "Loss": "Derrota",
  "Tie": "Empate",
  "Match saved.": "Partida salva.",
  "Add the result of at least one game.": "Adicione o resultado de pelo menos uma partida.",
  "Log a match": "Registrar partida",
  "Match record": "Retrospecto",
  "List changes": "Mudanças na lista",
  "Matches, list and drills": "Partidas, lista e treinos",
  "By opponent": "Por oponente",
  "Opponent": "Oponente",
  "Prizes a game": "Prêmios por partida",
  "Your record here:": "Seu retrospecto aqui:",
  "First or second": "Primeiro ou segundo",
  "All games": "Todas as partidas",
  "Mark who went first when you log a match, and this splits your record so you know what to pick when you win the coin flip.": "Marque quem jogou primeiro ao registrar uma partida, e isso separa seu retrospecto para você saber o que escolher quando ganhar no cara ou coroa.",
  "Last 10 matches:": "Últimas 10 partidas:",
  "Going 1st": "Jogando em 1º",
  "Going 2nd": "Jogando em 2º",
  "By list version": "Por versão da lista",
  "Version": "Versão",
  "Better going first": "Melhor jogando primeiro",
  "Better going second": "Melhor jogando em segundo",
  "No clear edge": "Sem vantagem clara",
  "No prizes logged": "Sem prêmios registrados",
  "No games yet": "Ainda sem partidas",
  "Unknown": "Desconhecido",
  "Review all 60 cards, then tap Start. The clock starts with the game. Your first try is your score.": "Confira as 60 cartas e toque em Começar. O relógio começa com a partida. Sua primeira tentativa é sua pontuação.",
  "Daily puzzle": "Puzzle diário",
  "A real board from two top tournament lists, the same for everyone today. You can win this turn if you find the line. Your first try is your score.": "Uma mesa real de duas listas top de torneio, a mesma para todos hoje. Dá para vencer neste turno se você achar a jogada. Sua primeira tentativa é sua pontuação.",
  "Any line that wins with no luck counts, not only this one.": "Vale qualquer jogada que vença sem sorte, não só esta.",
  "Your puzzle result": "Seu resultado do puzzle",
  "Win this turn": "Vença neste turno",
  "Win this turn.": "Vença neste turno.",
  "Your opponent": "Seu oponente",
  "You": "Você",
  "No Stadium in play": "Sem Estádio em jogo",
  "Your move": "Sua jogada",
  "From your hand": "Da sua mão",
  "Attach Energy": "Ligar Energia",
  "Abilities": "Habilidades",
  "End your turn": "Encerrar seu turno",
  "Only while it is in the Active Spot.": "Só enquanto estiver no Campo Ativo.",
  "Not enough Energy to retreat.": "Energia insuficiente para recuar.",
  "Not enough Energy.": "Energia insuficiente.",
  "Start over": "Recomeçar",
  "Show the answer": "Mostrar a resposta",
  "No win this time": "Desta vez não deu",
  "Practice replay": "Repetição de treino",
  "The puzzle needs a connection the first time. Try again in a moment.": "O puzzle precisa de internet na primeira vez. Tente de novo daqui a pouco.",
  "Your Active Pokémon": "Seu Pokémon Ativo",
  "Weakness": "Fraqueza",
  "Resistance": "Resistência",
  "none": "nenhuma",
  "Deck builder": "Montador de decks",
  "New deck": "Novo deck",
  "Start from": "Começar de",
  "A meta deck": "Um deck do meta",
  "The cards most of its top lists run. You fill the rest.": "As cartas que a maioria das listas top usa. Você completa o resto.",
  "A Pokémon": "Um Pokémon",
  "Pick one and its evolution line goes in.": "Escolha um e a linha de evolução entra.",
  "One of your decks": "Um dos seus decks",
  "Change a saved list and grade it again.": "Mude uma lista salva e avalie de novo.",
  "A list you paste": "Uma lista que você colar",
  "From Limitless or Pokémon TCG Live.": "Do Limitless ou do Pokémon TCG Live.",
  "Add cards": "Adicionar cartas",
  "Most run in top lists": "Mais usadas nas listas top",
  "Copy list": "Copiar lista",
  "Save and grade": "Salvar e avaliar",
  "Your list": "Sua lista",
  "Checks": "Verificações",
  "Suggestions": "Sugestões",
  "Nothing to add from the top lists.": "Nada para adicionar das listas top.",
  "Start a new list?": "Começar uma lista nova?",
  "Start new": "Começar nova",
  "Start from a meta deck": "Começar de um deck do meta",
  "Start from one of your decks": "Começar de um dos seus decks",
  "No saved decks yet.": "Ainda não há decks salvos.",
  "Paste a list": "Colar uma lista",
  "Use this list": "Usar esta lista",
  "Clear the list": "Limpar a lista",
  "Save as new": "Salvar como novo",
  "The meta decks did not load. Check your connection.": "Os decks do meta não carregaram. Confira sua conexão.",
  "No cards could be read. One card per line: count, name, set, number.": "Nenhuma carta pôde ser lida. Uma carta por linha: quantidade, nome, coleção, número.",
  "The list is empty.": "A lista está vazia.",
  "List copied.": "Lista copiada.",
  "The grade is still loading. Try again in a moment.": "A nota ainda está carregando. Tente de novo daqui a pouco.",
  "No meta deck matches these Pokémon yet, so these are what top lists run whatever the deck.": "Nenhum deck do meta corresponde a estes Pokémon ainda, então isto é o que as listas top usam em qualquer deck.",
  "Loading the card list…": "Carregando a lista de cartas…",
  "The card list did not load. Check your connection and open the builder again.": "A lista de cartas não carregou. Confira sua conexão e abra o montador de novo.",
  "The card list has not loaded yet. Try again in a moment.": "A lista de cartas ainda não carregou. Tente de novo daqui a pouco.",
  "No card matches that name.": "Nenhuma carta corresponde a esse nome.",
  "No deck by that name.": "Não há deck com esse nome.",
  "Which deck is this now?": "Que deck é este agora?",
  "Or pick another deck from the list below.": "Ou escolha outro deck da lista abaixo.",
  "This list looks like a different deck now. Its Grade tab asks which one.": "Esta lista agora parece outro deck. A aba Nota pergunta qual.",
  "No card is in that many lists.": "Nenhuma carta está em tantas listas.",
  "No card moved by 10 points or more.": "Nenhuma carta mudou 10 pontos ou mais.",
  "These are for decks like yours, not your exact list.": "Isto é para decks como o seu, não para a sua lista exata.",
  "Share your grade": "Compartilhe sua nota",
  "Making your card": "Criando sua imagem",
  "The link opens this list in RdyDeck, so anyone can see its grade and odds for themselves.": "O link abre esta lista no RdyDeck, então qualquer pessoa pode ver a nota e as chances.",
  "The picture could not be made on this device. The link still works.": "Não deu para criar a imagem neste aparelho. O link continua funcionando.",
  "This deck has no card data yet, so there is no grade to share.": "Este deck ainda não tem dados das cartas, então não há nota para compartilhar.",
  "Some cards have not been read yet, so this grade is not final. Open the deck again while online, then share.": "Algumas cartas ainda não foram lidas, então esta nota não é final. Abra o deck de novo com internet e depois compartilhe.",
  "This list breaks a deck building rule. Fix it in Edit deck, then share the grade.": "Esta lista quebra uma regra de montagem. Corrija em Editar deck e depois compartilhe a nota.",
  "Grade and link copied. Paste it anywhere.": "Nota e link copiados. Cole onde quiser.",
  "Include my list for": "Incluir minha lista para",
  "Prerelease": "Pré-lançamento",
  "What you get": "O que você recebe",
  "Each player gets a Build and Battle Box:": "Cada jogador recebe uma Build and Battle Box:",
  "Deck rules": "Regras de montagem",
  "Exactly 40 cards.": "Exatamente 40 cartas.",
  "Any number of copies of a card.": "Qualquer número de cópias de uma carta.",
  "Each player takes 4 prize cards, not 6.": "Cada jogador pega 4 cartas de Prêmio, não 6.",
  "The store has extra Basic Energy to add.": "A loja tem Energia Básica extra para adicionar.",
  "Build a practice 40": "Monte um deck de treino",
  "Tap a card to add a copy. Save it, then practice it like any deck. Prize games use 4 prizes.": "Toque em uma carta para adicionar uma cópia. Salve e treine como qualquer deck. Os jogos de prêmios usam 4 prêmios.",
  "Secret rares": "Raras secretas",
  "Loading the set…": "Carregando a coleção…",
  "Prerelease check": "Verificação de pré-lançamento",
  "What is in it": "O que tem",
  "Evolutions": "Evoluções",
  "The 0 to 10 grade is built for 60 card Standard decks, so prerelease decks get this check instead.": "A nota de 0 a 10 é feita para decks Padrão de 60 cartas, então decks de pré-lançamento recebem esta verificação no lugar.",
  "Prize games work with 4 prizes. Tap Play to start one.": "Os jogos de prêmios usam 4 prêmios. Toque em Jogar para começar um.",
  "Prerelease deck": "Deck de pré-lançamento",
  "Add some cards first.": "Adicione algumas cartas primeiro.",
  "Prerelease decks have a build check, not a grade to share.": "Decks de pré-lançamento têm verificação de montagem, não uma nota para compartilhar.",
  "Install": "Instalar",
  "✓ App installed!": "✓ App instalado!",
  "✓ Installing...": "✓ Instalando...",
  "Right-click the page and choose": "Clique com o botão direito na página e escolha",
  "Couldn": "Não deu",
  "Search cards": "Buscar cartas",
  "Name": "Nome",
  "Count": "Quantidade",
  "Set": "Coleção",
  "Total": "Total",
  "Wins": "Vitórias",
  "Losses": "Derrotas",
  "Ties": "Empates",
  "Average": "Média",
  "Show more": "Ver mais",
  "Show less": "Ver menos",
  "Open the deck": "Abrir o deck",
  "Loading…": "Carregando…",
  "Offline": "Offline",
  "to fix": "para corrigir",
  "working well": "funcionando bem",
  "The grade is Synergy times Power, divided by 10.": "A nota é Sinergia vezes Poder, dividido por 10.",
  "Synergy under 0.6 counts as 0.6.": "Sinergia abaixo de 0.6 conta como 0.6.",
  "Power under 1.2 counts as 1.2.": "Poder abaixo de 1.2 conta como 1.2.",
  "If that is the wrong deck, pick the right one under Against the meta.": "Se esse não for o deck certo, escolha o certo em Contra o meta.",
  "There are few games so far, so results count for little.": "Ainda há poucas partidas, então os resultados contam pouco.",
  "The Pokemon the plan, upgrades and draw odds are built around. Auto reads it from the cards; set it if your deck attacks with something else, or picks its attacker each turn.": "O Pokémon em torno do qual o plano, as melhorias e as chances de compra são montados. Auto lê isso das cartas; escolha você se o seu deck ataca com outro, ou se escolhe o atacante a cada turno.",
  "Each time you change this list, its new grade is kept here, so you can see it climb.": "Cada vez que você muda esta lista, a nova nota fica guardada aqui, para você ver a nota subir.",
  "Ties count as matches, not wins.": "Empates contam como partidas, não como vitórias.",
  "Mirror matches, byes and no-shows are left out.": "Ficam de fora os espelhos, os byes e as ausências.",
  "The main attacker and the combos the grader found between your own cards. This is what the deck is trying to do.": "O atacante principal e os combos que o avaliador encontrou entre suas próprias cartas. Isto é o que o deck tenta fazer.",
  "Combos the grader found between your own cards. This is what the deck is trying to do.": "Combos que o avaliador encontrou entre suas próprias cartas. Isto é o que o deck tenta fazer.",
  "It works with this list.": "Funciona com esta lista.",
  "This explains Synergy and does not change the grade.": "Isto explica a Sinergia e não muda a nota.",
  "How each Trainer and Special Energy fits this list, ACE SPEC first.": "Como cada Treinador e Energia Especial se encaixa nesta lista, primeiro o ÁS TÁTICO.",
  "Every Trainer and Special Energy here works with the list.": "Cada Treinador e Energia especial aqui funciona com a lista.",
  "It does nothing in this list.": "Nesta lista ela não faz nada.",
  "One card does little here, with a swap idea for each.": "Uma carta faz pouco aqui, com uma ideia de troca para cada.",
  "The attacker its meta deck is named for, and how often you can have it ready by your second turn.": "O atacante que dá nome ao deck do meta, e com que frequência você consegue deixá-lo pronto até o seu segundo turno.",
  "Draw Supporters and abilities are not played out.": "Apoiadores de compra e Habilidades não são jogados.",
  "Real games land in between.": "As partidas reais ficam no meio.",
  "Basic, main attacker.": "Básico, atacante principal.",
  "Put a Basic in the Active Spot and any others on your Bench, then start turn 1. You draw at the start of every turn.": "Coloque um Básico no Campo Ativo e os outros no seu Banco, depois comece o turno 1. Você compra no início de cada turno.",
  "Every card change saved from Edit deck, so you can see how the list grew.": "Cada mudança de cartas salva em Editar deck, para você ver como a lista cresceu.",
  "Share this deck": "Compartilhar este deck",
  "Deck link": "Link do deck",
  "Put it in a video description or send it to a friend. Opening it fills Import with this list, and nothing saves until they tap Import. The list lives in the link itself, not on a server.": "Coloque na descrição de um vídeo ou mande para um amigo. Ao abrir, o Importar é preenchido com esta lista, e nada é salvo até tocarem em Importar. A lista fica no próprio link, não em um servidor.",
  "Copy link": "Copiar link",
  "You miss": "Você erra",
  "Record": "Retrospecto",
  "Ties count as not won": "Empates contam como não vencidas",
  "Taken a game": "Pegos por partida",
  "No matches logged yet. Log each round at your next event: who you played, the result and how many prizes each of you took.": "Ainda não há partidas registradas. Registre cada rodada no seu próximo evento: contra quem jogou, o resultado e quantos prêmios cada um pegou.",
  "The format changes with every new set, so check a list before an event.": "O formato muda a cada coleção nova, então confira uma lista antes de um evento.",
  "Lists as posted on Limitless (play.limitlesstcg.com).": "Listas como foram publicadas no Limitless (play.limitlesstcg.com).",
  "Or write to support@rdydeck.com": "Ou escreva para support@rdydeck.com",
  "Same list, same numbers.": "Mesma lista, mesmos números.",
  "Tab": "Tab",
  "Enter": "Enter",
  "Esc": "Esc",
  "No card moves your opponent's Benched Pokemon into the Active Spot, like Boss's Orders or Prime Catcher, so you can only Knock Out what they choose to put there. Some decks skip it on purpose, but most run 2 to 4.": "Nenhuma carta move um Pokémon no Banco do oponente para o Campo Ativo, como Boss's Orders ou Prime Catcher, então você só consegue Nocautear o que ele escolher colocar lá. Alguns decks deixam de fora de propósito, mas a maioria usa de 2 a 4.",
  "Nothing in the list searches your deck for a Pokemon, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin, so getting your attackers into play rests on drawing them.": "Nada na lista busca um Pokémon no seu deck, como Ultra Ball, Poké Pad ou Buddy-Buddy Poffin, então colocar seus atacantes em jogo depende de comprá-los.",
  "Enough Rare Candy to land your Stage 2 Pokemon before the game runs away.": "Rare Candy suficiente para colocar seus Pokémon de Estágio 2 antes de o jogo fugir do controle.",
  "Nothing reliably refills your hand. The deck stalls as soon as your opening cards run dry.": "Nada reabastece sua mão com confiança. O deck trava assim que as cartas iniciais acabam.",
  "Every Pokemon here gives up two prizes, so the opponent needs only three knockouts. That is normal for a deck built on Pokemon ex, so each one has to take more than one knockout of its own.": "Cada Pokémon aqui entrega dois prêmios, então o oponente só precisa de três nocautes. Isso é normal em um deck de Pokémon ex, então cada um precisa fazer mais de um nocaute por conta própria.",
  "The list runs one copy of its main attacker. It is in your prizes in about 1 game in 10, and once it is Knocked Out the deck has no one to carry the plan. Most lists run 2 to 4.": "A lista usa uma cópia só do atacante principal. Ele fica nos seus prêmios em cerca de 1 a cada 10 partidas, e depois de Nocauteado o deck não tem quem leve o plano. A maioria das listas usa de 2 a 4.",
  "How hard the best attacker hits the format's biggest threats.": "Quanto dano o melhor atacante causa nas maiores ameaças do formato.",
  "Fine if you can take the return hit.": "Tudo bem se você aguentar o contra-ataque.",
  "Read the card for what that needs.": "Leia a carta para ver o que isso exige.",
  "ACE SPEC": "ÁS TÁTICO",
  "Built from": "Montado a partir de",
  "Matchups": "Confrontos",
  "Trends": "Tendências",
  "The grade checks the rest when you save.": "A nota confere o resto quando você salva.",
};
/* I18N_DICT_END */

// Text that holds numbers or names: [regex on the whole squeezed string, Spanish, Portuguese].
// A replacement is a string with $1, $2 or a function (match, ...groups). Dates (13 Nov 2026,
// April 2027, Nov 12) and ordinals (1st, 2nd) in the result are put into the language after.
// i18nTr(s) translates a captured part when it is UI text (it returns s unchanged otherwise).
const I18N_PAT = [
  [/^(\d+) of (\d+)$/, '$1 de $2', '$1 de $2'],
  [/^Card (\d+) of (\d+)$/, 'Carta $1 de $2', 'Carta $1 de $2'],
  [/^Prize guesses \((\d+)\/(\d+)\)$/, 'Respuestas de premios ($1/$2)', 'Palpites de prêmios ($1/$2)'],
  [/^Prize (\d+)$/, 'Premio $1', 'Prêmio $1'],
  [/^Daily challenge #(\d+)$/, 'Desafío diario #$1', 'Desafio diário #$1'],
  [/^Your puzzle #(\d+)$/, 'Tu puzzle #$1', 'Seu puzzle #$1'],
  [/^Today's deck: (.+?)\. Same shuffle for everyone$/, 'Baraja de hoy: $1. La misma mezcla para todos', 'Deck de hoje: $1. O mesmo embaralhamento para todos'],
  [/^Today's deck: (.+)$/, 'Baraja de hoy: $1', 'Deck de hoje: $1'],
  [/^(.+), (\d+(?:st|nd|rd|th)) place on (.+), graded in one tap$/, '$1, $2 lugar el $3, calificada con un toque', '$1, $2 lugar em $3, avaliado com um toque'],
  [/^(\d+(?:st|nd|rd|th)), (.+) \((\d+) players, online\), (.+)\. Played by (.+)$/, '$1, $2 ($3 jugadores, online), $4. Jugado por $5', '$1, $2 ($3 jogadores, online), $4. Jogado por $5'],
  [/^(\d+(?:st|nd|rd|th)) of (\d+)$/, '$1 de $2', '$1 de $2'],
  [/^(\d+) to fix$/, '$1 por corregir', '$1 para corrigir'],
  [/^(\d+) cards? not read$/, (m, n) => n === '1' ? '1 carta sin leer' : n + ' cartas sin leer', (m, n) => n === '1' ? '1 carta não lida' : n + ' cartas não lidas'],
  [/^(\d+) more$/, '$1 más', 'Mais $1'],
  [/^(\d+) more to fix$/, '$1 más por corregir', 'Mais $1 para corrigir'],
  [/^(\d+) safe card names?$/, (m, n) => n + (n === '1' ? ' carta segura' : ' cartas seguras'), (m, n) => n + (n === '1' ? ' carta segura' : ' cartas seguras')],
  [/^Show all (\d+) cards$/, 'Mostrar las $1 cartas', 'Mostrar todas as $1 cartas'],
  [/^(\d+) in list$/, '$1 en la lista', '$1 na lista'],
  [/^(\d+) unseen$/, '$1 sin ver', '$1 não vistas'],
  [/^Hand \((\d+)\)$/, 'Mano ($1)', 'Mão ($1)'],
  [/^Your hand \((\d+)\)$/, 'Tu mano ($1)', 'Sua mão ($1)'],
  [/^(\d+) open$/, '$1 libres', '$1 livres'],
  [/^(\d+) mulligans? before this hand$/, (m, n) => n === '1' ? '1 mulligan antes de esta mano' : n + ' mulligans antes de esta mano', (m, n) => n === '1' ? '1 mulligan antes desta mão' : n + ' mulligans antes desta mão'],
  [/^Used so far \((\d+) cards, in play or discarded\)$/, 'Usadas hasta ahora ($1 cartas, en juego o descartadas)', 'Usadas até agora ($1 cartas, em jogo ou descartadas)'],
  [/^Time: (.+)$/, 'Tiempo: $1', 'Tempo: $1'],
  [/^Last (\d+) games?$/, (m, n) => n === '1' ? 'Última partida' : 'Últimas ' + n + ' partidas', (m, n) => n === '1' ? 'Última partida' : 'Últimas ' + n + ' partidas'],
  [/^Per game, last (\d+)$/, (m, n) => n === '1' ? 'Por partida, la última' : 'Por partida, últimas ' + n, (m, n) => n === '1' ? 'Por partida, a última' : 'Por partida, últimas ' + n],
  [/^(\d+) games? tracked$/, (m, n) => n === '1' ? '1 partida registrada' : n + ' partidas registradas', (m, n) => n === '1' ? '1 partida registrada' : n + ' partidas registradas'],
  [/^(\d+) prize games?$/, (m, n) => n === '1' ? '1 partida de premios' : n + ' partidas de premios', (m, n) => n === '1' ? '1 jogo de prêmios' : n + ' jogos de prêmios'],
  [/^(\d+) prize games? played$/, (m, n) => n === '1' ? '1 partida de premios jugada' : n + ' partidas de premios jugadas', (m, n) => n === '1' ? '1 jogo de prêmios jogado' : n + ' jogos de prêmios jogados'],
  [/^Graded (.+)$/, 'Calificada $1', 'Avaliado $1'],
  [/^(\d+) days? ago$/, (m, n) => n === '1' ? 'hace 1 día' : 'hace ' + n + ' días', (m, n) => n === '1' ? 'há 1 dia' : 'há ' + n + ' dias'],
  [/^(\d+) cards? may rotate in ([A-Z][a-z]+ \d{4})$/, (m, n, w) => n + (n === '1' ? ' carta podría rotar en ' : ' cartas podrían rotar en ') + w, (m, n, w) => n + (n === '1' ? ' carta pode rotacionar em ' : ' cartas podem rotacionar em ') + w],
  [/^(\d+) cards? (?:rotate|rotates) in ([A-Z][a-z]+ \d{4})$/, (m, n, w) => n + (n === '1' ? ' carta rota en ' : ' cartas rotan en ') + w, (m, n, w) => n + (n === '1' ? ' carta rotaciona em ' : ' cartas rotacionam em ') + w],
  [/^(\d+) cards? may rotate in ([A-Z][a-z]+ \d{4}) \(not announced yet\)\.$/, (m, n, w) => n + (n === '1' ? ' carta podría rotar en ' : ' cartas podrían rotar en ') + w + ' (todavía sin anunciar).', (m, n, w) => n + (n === '1' ? ' carta pode rotacionar em ' : ' cartas podem rotacionar em ') + w + ' (rotação ainda não anunciada).'],
  [/^(\d+) cards? not confirmed Standard legal$/, (m, n) => n + (n === '1' ? ' carta sin confirmar como legal en Estándar' : ' cartas sin confirmar como legales en Estándar'), (m, n) => n + (n === '1' ? ' carta sem confirmação de legalidade no Padrão' : ' cartas sem confirmação de legalidade no Padrão')],
  [/^(\d+) cards? (?:are|is) not Standard legal now$/, (m, n) => n + (n === '1' ? ' carta no es legal en Estándar ahora' : ' cartas no son legales en Estándar ahora'), (m, n) => n + (n === '1' ? ' carta não é legal no Padrão agora' : ' cartas não são legais no Padrão agora')],
  [/^(\d+) cards? not legal now$/, (m, n) => n + (n === '1' ? ' carta no legal ahora' : ' cartas no legales ahora'), (m, n) => n + (n === '1' ? ' carta não legal agora' : ' cartas não legais agora')],
  [/^(\d+) (?:are|is) safe\.?$/, (m, n) => n + (n === '1' ? ' está segura' : ' están seguras') + (m.endsWith('.') ? '.' : ''), (m, n) => n + (n === '1' ? ' está segura' : ' estão seguras') + (m.endsWith('.') ? '.' : '')],
  [/^(\d+) not confirmed\.?$/, (m, n) => n + ' sin confirmar' + (m.endsWith('.') ? '.' : ''), (m, n) => n + (n === '1' ? ' não confirmada' : ' não confirmadas') + (m.endsWith('.') ? '.' : '')],
  [/^Plus (\d+) Basic Energy\.?$/, (m, n) => 'Más ' + n + (n === '1' ? ' Energía Básica' : ' Energías Básicas') + (m.endsWith('.') ? '.' : ''), (m, n) => 'Mais ' + n + (n === '1' ? ' Energia Básica' : ' Energias Básicas') + (m.endsWith('.') ? '.' : '')],
  [/^Plus (\d+) Basic Energy, which never rotates?\. (\d+) cards in all\.$/, (m, n, t) => 'Más ' + n + (n === '1' ? ' Energía Básica, que nunca rota. ' : ' Energías Básicas, que nunca rotan. ') + t + ' cartas en total.', (m, n, t) => 'Mais ' + n + (n === '1' ? ' Energia Básica, que nunca rotaciona. ' : ' Energias Básicas, que nunca rotacionam. ') + t + ' cartas no total.'],
  [/^Nothing here rotates next\. All (\d+) cards with a mark are safe\.?$/, 'Nada aquí rota en la próxima. Las $1 cartas con marca están seguras.', 'Nada aqui rotaciona na próxima. Todas as $1 cartas com marca estão seguras.'],
  [/^(\d+) cards? (may rotate|rotate) in ([A-Z][a-z]+ \d{4})\.$/, (m, n, how, w) => n + (how === 'rotate' ? (n === '1' ? ' carta rota en ' : ' cartas rotan en ') : n === '1' ? ' carta podría rotar en ' : ' cartas podrían rotar en ') + w + '.', (m, n, how, w) => n + (how === 'rotate' ? (n === '1' ? ' carta rotaciona em ' : ' cartas rotacionam em ') : n === '1' ? ' carta pode rotacionar em ' : ' cartas podem rotacionar em ') + w + '.'],
  [/^May rotate in (.+)$/, 'Podrían rotar en $1', 'Podem rotacionar em $1'],
  [/^Rotate in (.+)$/, 'Rotan en $1', 'Rotacionam em $1'],
  [/^([A-J](?: and [A-J])*) mark$/, (m, a) => 'Marca ' + a.replace(' and ', ' y '), (m, a) => 'Marca ' + a.replace(' and ', ' e ')],
  [/^Checked (.+)\.$/, 'Revisado el $1.', 'Verificado em $1.'],
  [/^\)\. Checked (.+)\.$/, '). Revisado el $1.', '). Verificado em $1.'],
  [/^Kept legal by a reprint with the (\w+) mark$/, 'Sigue legal por una reimpresión con marca $1', 'Continua legal por uma reimpressão com marca $1'],
  [/^Newest reprint has the (\w+) mark$/, 'La reimpresión más reciente tiene marca $1', 'A reimpressão mais nova tem marca $1'],
  [/^A card counts as safe only when its mark is confirmed, so check the (\d+) not confirmed before an event\.$/, 'Una carta cuenta como segura solo cuando su marca está confirmada, así que revisa las $1 sin confirmar antes de un evento.', 'Uma carta só conta como segura quando a marca está confirmada, então confira as $1 não confirmadas antes de um evento.'],
  [/^(\d+) cards? (?:was|were) read from pokemontcg\.io, the backup card database, because TCGdex could not read (?:it|them)\.$/, (m, n) => n === '1' ? '1 carta se leyó de pokemontcg.io, la base de datos de respaldo, porque TCGdex no pudo leerla.' : n + ' cartas se leyeron de pokemontcg.io, la base de datos de respaldo, porque TCGdex no pudo leerlas.', (m, n) => n === '1' ? '1 carta foi lida no pokemontcg.io, o banco de dados de reserva, porque o TCGdex não conseguiu lê-la.' : n + ' cartas foram lidas no pokemontcg.io, o banco de dados de reserva, porque o TCGdex não conseguiu lê-las.'],
  [/^"(.+)" imported! (\d+) cards\.$/, 'Se importó "$1": $2 cartas.', '"$1" importado. $2 cartas.'],
  [/^"(.+)" imported \((\d+) cards\)\. Card data read for (\d+)\/(\d+) entries\.$/, 'Se importó "$1" ($2 cartas). Datos de cartas leídos para $3/$4 entradas.', '"$1" importado ($2 cartas). Dados das cartas lidos para $3/$4 entradas.'],
  [/^You already have this list as "(.+)"\.$/, 'Ya tienes esta lista como "$1".', 'Você já tem esta lista como "$1".'],
  [/^The (\d+) problems that cost you the most, worst first\.$/, 'Los $1 problemas que más te cuestan, del peor al menor.', 'Os $1 problemas que mais custam, do mais grave para o menos grave.'],
  [/^(\d+) problems stop this deck from working\. Fix those first\.$/, '$1 problemas impiden que esta baraja funcione. Corrígelos primero.', '$1 problemas impedem este deck de funcionar. Corrija esses primeiro.'],
  [/^Fix first shows the (\d+) problems found\.$/, 'Corrige primero muestra los $1 problemas encontrados.', 'Corrija primeiro mostra os $1 problemas encontrados.'],
  [/^(\d+) problems also stop this deck from working\.$/, 'Además, $1 problemas impiden que esta baraja funcione.', 'Além disso, $1 problemas impedem este deck de funcionar.'],
  [/^(\d+) other changes would make it stronger\.$/, 'Otros $1 cambios la harían más fuerte.', 'Outras $1 mudanças o deixariam mais forte.'],
  [/^Fix the deck (rule|rules) above before an event\.$/, 'Corrige las reglas de construcción de arriba antes de un evento.', 'Corrija as regras de montagem acima antes de um evento.'],
  [/^The cards themselves grade ([\d.]+)\.$/, 'Las cartas por sí solas califican $1.', 'As cartas sozinhas tiram nota $1.'],
  [/^Why Synergy is ([\d.]+)$/, 'Por qué Sinergia es $1', 'Por que a Sinergia é $1'],
  [/^Why Power is ([\d.]+)$/, 'Por qué Poder es $1', 'Por que o Poder é $1'],
  [/^Synergy starts at 10\. These took it to ([\d.]+)\.$/, 'Sinergia empieza en 10. Esto la llevó a $1.', 'A Sinergia começa em 10. Estes itens a levaram a $1.'],
  [/^Power is damage \(half\), the prize trade \(30%\) and setup speed \(20%\), each out of 10\.$/, 'Poder es daño (la mitad), el intercambio de premios (30%) y la velocidad de preparación (20%), cada uno sobre 10.', 'Poder é dano (metade), a troca de prêmios (30%) e a velocidade de montagem (20%), cada um de 0 a 10.'],
  [/^All (\d+) card needs are met: every attacker has its Energy and every evolution has what it evolves from\.$/, 'Las $1 necesidades de cartas están cubiertas: cada atacante tiene su Energía y cada evolución tiene de qué evolucionar.', 'As $1 necessidades de cartas estão atendidas: todo atacante tem sua Energia e toda evolução tem de onde evoluir.'],
  [/^The one card need is met: every attacker has its Energy and every evolution has what it evolves from\.$/, 'La única necesidad de cartas está cubierta: cada atacante tiene su Energía y cada evolución tiene de qué evolucionar.', 'A única necessidade de cartas está atendida: todo atacante tem sua Energia e toda evolução tem de onde evoluir.'],
  [/^How tightly the list fits: your Pokemon are spread over (\d+) lines\.$/, 'Qué tan compacta es la lista: tus Pokémon están repartidos en $1 líneas.', 'O quanto a lista é coesa: seus Pokémon estão espalhados em $1 linhas.'],
  [/^Fewer of your cards pull the same way: your Pokemon are spread over (\d+) lines\.$/, 'Menos de tus cartas tiran para el mismo lado: tus Pokémon están repartidos en $1 líneas.', 'Menos cartas suas puxam para o mesmo lado: seus Pokémon estão espalhados em $1 linhas.'],
  [/^(A problem that stops the deck|(\d+) problems that stop the deck) \(1\.2 each\): (.+)\.$/, (m, a, n, l) => (n ? n + ' problemas que frenan la baraja' : 'Un problema que frena la baraja') + ' (1.2 cada uno): ' + l.split('; ').map(i18nTr).join('; ') + '.', (m, a, n, l) => (n ? n + ' problemas que travam o deck' : 'Um problema que trava o deck') + ' (1.2 cada): ' + l.split('; ').map(i18nTr).join('; ') + '.'],
  [/^Those (\d+) stop the deck, so each costs 1\.2 more\.$/, 'Esos $1 frenan la baraja, así que cada uno cuesta 1.2 más.', 'Esses $1 travam o deck, então cada um custa 1.2 a mais.'],
  [/^\((\d+)%\)\. (.+)$/, (m, p, r) => { const t = i18nSentences(r); return t == null ? null : '(' + p + '%). ' + t; }, (m, p, r) => { const t = i18nSentences(r); return t == null ? null : '(' + p + '%). ' + t; }],
  [/^Every Pokemon gives up one prize\.$/, 'Cada Pokémon entrega un premio.', 'Cada Pokémon entrega um prêmio.'],
  [/^All (\d+) Pokemon give up 2 or more prizes\.$/, 'Los $1 Pokémon entregan 2 premios o más.', 'Os $1 Pokémon entregam 2 prêmios ou mais.'],
  [/^No Stage 2 line to wait on, which is the usual mark for a deck of Basics and Stage 1s\.$/, 'No hay una línea de Fase 2 que esperar, lo normal en una baraja de Básicos y Fase 1.', 'Não há linha de Estágio 2 para esperar, o normal em um deck de Básicos e Estágio 1.'],
  [/^([^;()]+?) grows into its damage$/, '$1 va subiendo su daño', '$1 vai aumentando o dano'],
  [/^Main attacker: (.+)$/, 'Atacante principal: $1', 'Atacante principal: $1'],
  [/^Support: (.+)$/, 'Apoyo: $1', 'Suporte: $1'],
  [/^Abilities: (.+)$/, 'Habilidades: $1', 'Habilidades: $1'],
  [/^Auto: (.+)$/, 'Auto: $1', 'Auto: $1'],
  [/^Closest match: (.+)$/, 'Más parecida: $1', 'Mais parecido: $1'],
  [/^(.+) \(missed\)$/, '$1 (fallada)', '$1 (errada)'],
  [/^Play ([^.]+)$/, 'Jugar $1', 'Jogar $1'],
  [/^(\d+) Prize cards? left$/, (m, n) => n === '1' ? 'Queda 1 carta de Premio' : 'Quedan ' + n + ' cartas de Premio', (m, n) => n === '1' ? 'Falta 1 carta de Prêmio' : 'Faltam ' + n + ' cartas de Prêmio'],
  [/^of (\d+) HP$/, 'de $1 PS', 'de $1 PS'],
  [/^of (\d+) HP, (\d+) damage counters?$/, 'de $1 PS, $2 contadores de daño', 'de $1 PS, $2 contadores de dano'],
  [/^(\d+) HP$/, '$1 PS', '$1 PS'],
  [/^Evolved from (.+)$/, 'Evoluciona de $1', 'Evoluiu de $1'],
  [/^Deck: (\d+) cards, (\d+) you know are there$/, 'Baraja: $1 cartas, $2 que sabes que están', 'Deck: $1 cartas, $2 que você sabe que estão lá'],
  [/^(\d+) face down$/, '$1 boca abajo', '$1 viradas para baixo'],
  [/^Discard pile: (\d+)$/, 'Pila de descartes: $1', 'Pilha de descarte: $1'],
  [/^Can't do right now \((\d+)\)$/, 'No se puede ahora ($1)', 'Não dá agora ($1)'],
  [/^Lists: (.+) against (.+), from (.+)\.$/, 'Listas: $1 contra $2, de $3.', 'Listas: $1 contra $2, de $3.'],
  [/^Take your last (\d+) Prize cards? before your turn ends\. Tap any card to read it\.$/, (m, n) => (n === '1' ? 'Toma tu última carta de Premio' : 'Toma tus últimas ' + n + ' cartas de Premio') + ' antes de que termine tu turno. Toca cualquier carta para leerla.', (m, n) => (n === '1' ? 'Pegue sua última carta de Prêmio' : 'Pegue suas últimas ' + n + ' cartas de Prêmio') + ' antes do seu turno acabar. Toque em qualquer carta para ler.'],
  [/^You won in (\d+) plays?\.?$/, (m, n) => 'Ganaste en ' + n + (n === '1' ? ' jugada.' : ' jugadas.'), (m, n) => 'Você venceu em ' + n + (n === '1' ? ' jogada' : ' jogadas') + (m.endsWith('.') ? '.' : '')],
  [/^over ([\d,]+) games, against ([\d.]+%) for all decks in these results\.$/, 'en $1 partidas, contra $2 de todas las barajas en estos resultados.', 'em $1 partidas, contra $2 de todos os decks nestes resultados.'],
  [/^, against ([\d.]+) for a typical top tournament list\.$/, ', contra $1 de una lista típica top de torneo.', ', contra $1 de uma lista típica top de torneio.'],
  [/^Since the newest set came out \((.+)\):$/, 'Desde que salió la expansión más reciente ($1):', 'Desde que saiu a coleção mais nova ($1):'],
  [/^Since the newest set came out \((.+)\): all ([\d,]+) games, so there is no earlier win rate to compare\.$/, 'Desde que salió la expansión más reciente ($1): las $2 partidas, así que no hay un porcentaje anterior para comparar.', 'Desde que saiu a coleção mais nova ($1): todas as $2 partidas, então não há taxa anterior para comparar.'],
  [/^over ([\d,]+) games, (up|down) from ([\d.]+%) before\.$/, (m, g, d, p) => 'en ' + g + ' partidas, ' + (d === 'up' ? 'sube' : 'baja') + ' desde ' + p + ' antes.', (m, g, d, p) => 'em ' + g + ' partidas, ' + (d === 'up' ? 'acima dos ' : 'abaixo dos ') + p + ' de antes.'],
  [/^([^;()]+?) decks win more than their cards suggest\.$/, 'Las barajas de $1 ganan más de lo que sugieren sus cartas.', 'Os decks de $1 vencem mais do que as cartas sugerem.'],
  [/^([^;()]+?) decks win less than their cards suggest\.$/, 'Las barajas de $1 ganan menos de lo que sugieren sus cartas.', 'Os decks de $1 vencem menos do que as cartas sugerem.'],
  [/^Win rates are for all (.+) lists, not your exact list\.$/, 'Los porcentajes de victoria son de todas las listas de $1, no de tu lista exacta.', 'As taxas de vitória são de todas as listas de $1, não da sua lista exata.'],
  [/^This list's cards next to how (.+) decks do in Limitless online tournaments\.$/, 'Las cartas de esta lista junto a cómo les va a las barajas de $1 en los torneos online de Limitless.', 'As cartas desta lista ao lado de como os decks de $1 se saem nos torneios online do Limitless.'],
  [/^How decks like this one did in (\d+) Limitless online tournaments, since (.+) came out \((.+) to (.+)\)\.$/, 'Cómo les fue a barajas como esta en $1 torneos online de Limitless, desde que salió $2 ($3 a $4).', 'Como decks como este se saíram em $1 torneios online do Limitless, desde que saiu $2 ($3 a $4).'],
  [/^of (\d+) matches against other decks \((\d+) wins, (\d+) losses, (\d+) ties\)\.$/, 'de $1 partidas contra otras barajas ($2 victorias, $3 derrotas, $4 empates).', 'de $1 partidas contra outros decks ($2 vitórias, $3 derrotas, $4 empates).'],
  [/^decks, counting wins and how high lists finish\. Its (\d+) lists finished in the top (\d+)% of the field on average, and (\d+) made the top 16, where an average deck with as many lists places (\d+)\.$/, 'barajas, contando victorias y qué tan alto terminan las listas. Sus $1 listas terminaron en promedio en el $2% superior, y $3 llegaron al top 16, donde una baraja promedio con la misma cantidad de listas coloca $4.', 'decks, contando vitórias e quão alto as listas terminam. As $1 listas dele terminaram em média entre os $2% melhores, e $3 chegaram ao top 16, onde um deck médio com o mesmo número de listas coloca $4.'],
  [/^This is the same list, card for card, that finished (\d+(?:st|nd|rd|th)) at (.+) on (\d+ \w+ \d{4})\.( That list was played as (.+)\.)?$/, (m, p, e, d, x, n) => 'Es la misma lista, carta por carta, que terminó ' + p + ' en ' + e + ' el ' + d + '.' + (x ? ' Esa lista se jugó como ' + n + '.' : ''), (m, p, e, d, x, n) => 'É a mesma lista, carta por carta, que terminou em ' + p + ' no ' + e + ' em ' + d + '.' + (x ? ' Essa lista foi jogada como ' + n + '.' : '')],
  [/^Favored against (.+), unfavored against (.+)\.$/, (m, a, b) => 'Favorable contra ' + a.replace(/ and /g, ' y ') + ', desfavorable contra ' + b.replace(/ and /g, ' y ') + '.', (m, a, b) => 'Favorecido contra ' + a.replace(/ and /g, ' e ') + ', desfavorecido contra ' + b.replace(/ and /g, ' e ') + '.'],
  [/^(Favored|Unfavored) against (.+)\.$/, (m, f, a) => (f === 'Favored' ? 'Favorable' : 'Desfavorable') + ' contra ' + a.replace(/ and /g, ' y ') + '.', (m, f, a) => (f === 'Favored' ? 'Favorecido' : 'Desfavorecido') + ' contra ' + a.replace(/ and /g, ' e ') + '.'],
  [/^([\d.]+%), (\d+) matches?$/, '$1, $2 partidas', '$1, $2 partidas'],
  [/^Top (\d+) decks right now$/, 'Las $1 mejores barajas ahora', 'Os $1 melhores decks agora'],
  [/^Limitless online tournaments, (\d+) events and (\d+) players in the last (\d+) days, as of (.+)\.$/, 'Torneos online de Limitless, $1 eventos y $2 jugadores en los últimos $3 días, hasta el $4.', 'Torneios online do Limitless, $1 eventos e $2 jogadores nos últimos $3 dias, em $4.'],
  [/^Data as of (.+), updated weekly\.$/, 'Datos del $1, actualizados cada semana.', 'Dados de $1, atualizados toda semana.'],
  [/^Lists as of (.+)\.$/, 'Listas del $1.', 'Listas de $1.'],
  [/^RdyDeck v[\d.]+\.?$/, m => m, m => m],
  [/^RdyDeck [\d.]+$/, m => m, m => m],
  [/^Imported (.+)\.$/, 'Importado el $1.', 'Importado em $1.'],
  [/^Finds cards in your deck: (\d+) of the (\d+) cards that do\.$/, 'Busca cartas en tu baraja: $1 de las $2 cartas que lo hacen.', 'Busca cartas no seu deck: $1 das $2 cartas que fazem isso.'],
  [/^Finds cards in your deck, one of (\d+) cards that do\.$/, 'Busca cartas en tu baraja, una de las $1 cartas que lo hacen.', 'Busca cartas no seu deck, uma das $1 cartas que fazem isso.'],
  [/^Draws you cards: (\d+) of the (\d+) cards that do\.$/, 'Te hace robar cartas: $1 de las $2 cartas que lo hacen.', 'Faz você comprar cartas: $1 das $2 cartas que fazem isso.'],
  [/^Draws you cards, one of (\d+) cards that do\.$/, 'Te hace robar cartas, una de las $1 cartas que lo hacen.', 'Faz você comprar cartas, uma das $1 cartas que fazem isso.'],
  [/^Disrupts your opponent, one of (\d+) cards that do\.$/, 'Entorpece a tu rival, una de las $1 cartas que lo hacen.', 'Atrapalha o oponente, uma das $1 cartas que fazem isso.'],
  [/^Disrupts your opponent: (\d+) of the (\d+) cards that do\.$/, 'Entorpece a tu rival: $1 de las $2 cartas que lo hacen.', 'Atrapalha o oponente: $1 das $2 cartas que fazem isso.'],
  [/^Helps pay Energy costs for (.+)\.$/, 'Ayuda a pagar los costes de Energía de $1.', 'Ajuda a pagar os custos de Energia de $1.'],
  [/^Key targets: (.+)\.$/, (m, a) => 'Objetivos clave: ' + a.replace(/ and ([^,]+)$/, ' y $1') + '.', (m, l) => 'Alvos principais: ' + l.replace(/ and ([^,]+)$/, ' e $1') + '.'],
  [/^ACE SPEC: (.+)$/, 'AS TÁCTICO: $1', 'ÁS TÁTICO: $1'],
  [/^Ready by turn 2: (.+)$/, 'Listo para el turno 2: $1', 'Pronto até o turno 2: $1'],
  [/^(.+) ready by turn 2: (\d+)% to (\d+)%$/, '$1 listo para el turno 2: $2% a $3%', '$1 pronto até o turno 2: $2% a $3%'],
  [/^Line locked in prizes: ([\d.]+%)$/, 'Línea atascada en premios: $1', 'Linha presa nos prêmios: $1'],
  [/^Stuck in prizes: ([\d.]+%)$/, 'Atascada en premios: $1', 'Presa nos prêmios: $1'],
  [/^How many Basic Pokemon your kept opening hand holds \((\d+) in the list\), and how often each one is there for the Active Spot\.$/, 'Cuántos Pokémon Básicos tiene tu mano inicial (hay $1 en la lista), y qué tan seguido está cada uno para el Puesto Activo.', 'Quantos Pokémon Básicos tem a mão inicial que você mantém ($1 na lista), e com que frequência cada um está lá para o Campo Ativo.'],
  [/^([\d.]+) to ([\d.]+)$/, '$1 a $2', '$1 a $2'],
  [/^((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}|\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2})$/, m => m, m => m],
  [/^Synergy shows ([\d.]+) after a cut for how tightly the list fits, but that cut lowers the grade only when the fit is loose, so the grade uses Synergy before the cut, ([\d.]+): ([\d.]+) times ([\d.]+), divided by 10, is ([\d.]+)\.$/, 'Sinergia muestra $1 después de un recorte por qué tan compacta es la lista, pero ese recorte baja la calificación solo cuando la lista está dispersa, así que la calificación usa Sinergia antes del recorte, $2: $3 por $4, dividido entre 10, da $5.', 'A Sinergia mostra $1 depois de um corte pelo quanto a lista é coesa, mas esse corte só baixa a nota quando a lista está espalhada, então a nota usa a Sinergia antes do corte, $2: $3 vezes $4, dividido por 10, dá $5.'],
  [/^The grade is Synergy times Power, divided by 10, so the weaker one pulls the whole grade down: ([\d.]+) times ([\d.]+), divided by 10, is ([\d.]+)\.$/, 'La calificación es Sinergia por Poder, dividido entre 10, así que la más débil baja toda la calificación: $1 por $2, dividido entre 10, da $3.', 'A nota é Sinergia vezes Poder, dividido por 10, então a mais fraca puxa a nota toda para baixo: $1 vezes $2, dividido por 10, dá $3.'],
  [/^(\d+)% of the grade comes from (.+)'s online tournament results(?: since (.+?))?(?: \(as of (.+?)\))?: ([\d.]+%) wins over ([\d,]+) games(, with games since the newest set counted three times)?\.$/, (m, p, n, s, a, w, g, x) => p + '% de la calificación viene de los resultados de ' + n + ' en torneos online' + (s ? ' desde ' + s : '') + (a ? ' (hasta el ' + a + ')' : '') + ': ' + w + ' de victorias en ' + g + ' partidas' + (x ? ', con las partidas desde la expansión más reciente contadas tres veces' : '') + '.', (m, p, n, s, a, w, g, x) => p + '% da nota vem dos resultados de ' + n + ' em torneios online' + (s ? ' desde ' + s : '') + (a ? ' (em ' + a + ')' : '') + ': ' + w + ' de vitórias em ' + g + ' partidas' + (x ? ', com as partidas desde a coleção mais nova contando três vezes' : '') + '.'],
  [/^Those results alone score ([\d.]+), so the list's ([\d.]+) becomes ([\d.]+)\.$/, 'Esos resultados por sí solos califican $1, así que el $2 de la lista pasa a $3.', 'Esses resultados sozinhos dão nota $1, então o $2 da lista vira $3.'],
  [/^It is held at ([\d.]+) because some cards are not Standard legal now\.$/, 'Se queda en $1 porque algunas cartas no son legales en Estándar ahora.', 'Fica em $1 porque algumas cartas não são legais no Padrão agora.'],
  [/^The first saved grade is ([\d.]+)\.$/, 'La primera calificación guardada es $1.', 'A primeira nota salva é $1.'],
  [/^Updated (.+)\.$/, 'Actualizado el $1.', 'Atualizado em $1.'],
  [/^(\w) is next by the yearly pattern: (.+?), each announced in January and gone from events in April\.$/, (m, k, p) => k + ' es la siguiente según el patrón anual: ' + p.replace(/(\w) left in (\d{4})/g, '$1 salió en $2').replace(/, (\w) in (\d{4})/g, ', $1 en $2').replace(/ and (\w) in (\d{4})/, ' y $1 en $2') + ', cada una anunciada en enero y fuera de los eventos en abril.', (m, k, p) => k + ' é a próxima pelo padrão anual: ' + p.replace(/(\w) left in (\d{4})/g, '$1 saiu em $2').replace(/, (\w) in (\d{4})/g, ', $1 em $2').replace(/ and (\w) in (\d{4})/, ' e $1 em $2') + ', cada uma anunciada em janeiro e fora dos eventos em abril.'],
  [/^Legal now: (\w) mark and later\.$/, 'Legal ahora: marca $1 en adelante.', 'Legal agora: marca $1 em diante.'],
  [/^The (\w(?: and \w)*) mark left on (.+?) at events and (.+?) on Live \($/, (m, k, a, b) => 'La marca ' + k.replace(' and ', ' y ') + ' salió el ' + a + ' en los eventos y el ' + b + ' en Live (', (m, k, a, b) => 'A marca ' + k.replace(' and ', ' e ') + ' saiu em ' + a + ' nos eventos e em ' + b + ' no Live ('],
  [/^(.+), any opening hand, from raw draws alone to with your search cards$/, '$1, cualquier mano inicial, de solo robos puros a con tus cartas de búsqueda', '$1, qualquer mão inicial, de só compras puras a com suas cartas de busca'],
  [/^([\d,]+) simulated shuffles of this exact (\d+) card list\.$/, '$1 mezclas simuladas de esta lista exacta de $2 cartas.', '$1 embaralhamentos simulados desta lista exata de $2 cartas.'],
  [/^Chance of at least (\d+) of (.+) by your turn (\d+) \(your first (\d+) cards\)\.$/, (m, a, l, t, f) => 'Probabilidad de al menos ' + a + ' de ' + l.replace(/ or ([^,]+)$/, ' o $1') + ' para tu turno ' + t + ' (tus primeras ' + f + ' cartas).', (m, a, l, t, f) => 'Chance de pelo menos ' + a + ' de ' + l.replace(/ or ([^,]+)$/, ' ou $1') + ' até o seu turno ' + t + ' (suas primeiras ' + f + ' cartas).'],
  [/^No Basic was read, so mulligans are not taken out\.$/, 'No se leyó ningún Básico, así que no se descuentan los mulligans.', 'Nenhum Básico foi lido, então os mulligans não são descontados.'],
  [/^Needs (.+) among your first (\d+) cards\.$/, 'Necesita $1 entre tus primeras $2 cartas.', 'Precisa de $1 entre suas primeiras $2 cartas.'],
  [/^(\d+)% is raw draws alone, the floor\.$/, '$1% es solo con robos puros, el mínimo.', '$1% é só com compras puras, o piso.'],
  [/^(\d+)% lets every search card you have in time fetch one missing piece, ignoring discard costs and the one Supporter per turn rule, so it is closer to a ceiling\.$/, '$1% deja que cada carta de búsqueda que tengas a tiempo traiga una pieza que falta, sin contar costes de descarte ni la regla de un Partidario por turno, así que está más cerca del máximo.', '$1% deixa cada carta de busca que você tiver a tempo pegar uma peça que falta, ignorando custos de descarte e a regra de um Apoiador por turno, então está mais perto de um teto.'],
  [/^By turn (\d+): (\d+)% to (\d+)%\.$/, 'Para el turno $1: $2% a $3%.', 'Até o turno $1: $2% a $3%.'],
  [/^Still need: (.+)\.$/, 'Falta: $1.', 'Falta: $1.'],
  [/^(\d+) mulligans?$/, (m, n) => n + (n === '1' ? ' mulligan' : ' mulligans'), (m, n) => n + (n === '1' ? ' mulligan' : ' mulligans')],
  [/^(\d+) cards, (Standard|Expanded)$/, (m, n, f) => n + ' cartas, ' + (f === 'Standard' ? 'Estándar' : 'Expandido'), (m, n, f) => n + ' cartas, ' + (f === 'Standard' ? 'Padrão' : 'Expandido')],
  [/^when it's prized (\d+)% of the time\. That is your biggest blind spot\.$/, 'el $1% de las veces que está en premios. Ese es tu mayor punto ciego.', 'em $1% das vezes que está nos prêmios. Esse é seu maior ponto cego.'],
  [/^Prized (\d+) times?, missed (\d+)$/, (m, a, b) => 'En premios ' + (a === '1' ? '1 vez' : a + ' veces') + ', fallada ' + (b === '1' ? '1 vez' : b + ' veces'), (m, a, b) => 'Nos prêmios ' + a + (a === '1' ? ' vez' : ' vezes') + ', errada ' + b],
  [/^(\d+)% missed$/, '$1% fallada', '$1% errada'],
  [/^(\d+) matches?$/, (m, n) => n + (n === '1' ? ' partida' : ' partidas'), (m, n) => n + (n === '1' ? ' partida' : ' partidas')],
  [/^Swap idea: (one more )?(.+), since nothing returns cards from your discard pile to your hand or deck\.$/, (m, o, n) => 'Idea de cambio: ' + (o ? 'una más de ' : '') + n + ', ya que nada devuelve cartas de tu pila de descartes a tu mano o a tu baraja.', (m, o, n) => 'Ideia de troca: ' + (o ? 'mais uma ' : '') + n + ', já que nada devolve cartas da sua pilha de descarte para a sua mão ou o seu deck.'],
  [/^([^;()]+?) draws you cards and disrupts your opponent\.$/, '$1 te hace robar cartas y entorpece a tu rival.', '$1 faz você comprar cartas e atrapalha o oponente.'],
  [/^Disrupts your opponent, but (\d+) other cards in the list already do that, more than most winning lists run, so this one adds little\.$/, 'Entorpece a tu rival, pero otras $1 cartas de la lista ya lo hacen, más de lo que llevan la mayoría de las listas ganadoras, así que esta aporta poco.', 'Atrapalha o oponente, mas outras $1 cartas da lista já fazem isso, mais do que a maioria das listas vencedoras usa, então esta acrescenta pouco.'],
  [/^Finds any of your (\d+) Pokemon ex, like (.+) or (.+)\.$/, 'Busca cualquiera de tus $1 Pokémon ex, como $2 o $3.', 'Busca qualquer um dos seus $1 Pokémon ex, como $2 ou $3.'],
  [/^Gets one (\w+) and one (\w+) Energy, one to your hand and one attached\.$/, (m, a, b) => 'Consigue una ' + i18nEnergy(a, 'es') + ' y una ' + i18nEnergy(b, 'es') + ', una a tu mano y otra unida.', (m, a, b) => 'Pega uma ' + i18nEnergy(a, 'pt') + ' e uma ' + i18nEnergy(b, 'pt') + ', uma para a mão e outra ligada.'],
  [/^([^;()]+?) is here for its Ability, so its attack needing (\w+(?: and \w+)?) Energy does not matter\.$/, (m, n, t) => n + ' está aquí por su Habilidad, así que no importa que su ataque necesite ' + i18nEnergy(t, 'es') + '.', (m, n, t) => n + ' está aqui pela Habilidade, então não importa o ataque precisar de ' + i18nEnergy(t, 'pt') + '.'],
  [/^([^;()]+?) is in play with the (\d+) Energy (.+?) needs(?:, with (\d+) Pokemon in play,)? by your second turn in (\d+%) of games and by your third in (\d+%), from shuffles of this list, so it is (as quick to set up as any list|quick to set up)\.$/, (m, n, e, a, b, t2, t3, q) => n + ' está en juego con ' + (e === '1' ? 'la 1 Energía' : 'las ' + e + ' Energías') + ' que necesita ' + a + (b ? ', con ' + b + ' Pokémon en juego,' : '') + ' para tu segundo turno en el ' + t2 + ' de las partidas y para el tercero en el ' + t3 + ', según mezclas de esta lista, así que ' + (q === 'quick to set up' ? 'se prepara rápido' : 'se prepara tan rápido como cualquier lista') + '.', (m, n, e, a, b, t2, t3, q) => n + ' está em jogo com ' + (e === '1' ? 'a 1 Energia' : 'as ' + e + ' Energias') + ' de que ' + a + ' precisa' + (b ? ', com ' + b + ' Pokémon em jogo,' : '') + ' até o seu segundo turno em ' + t2 + ' das partidas e até o terceiro em ' + t3 + ', por embaralhamentos desta lista, então ' + (q === 'quick to set up' ? 'monta rápido' : 'monta tão rápido quanto qualquer lista') + '.'],
  [/^(\d+) of your (\d+) Pokemon give up 2 or more prizes\.$/, '$1 de tus $2 Pokémon entregan 2 premios o más.', '$1 dos seus $2 Pokémon entregam 2 prêmios ou mais.'],
  [/^Only (\d+) Supporters?$/, (m, n) => 'Solo ' + n + (n === '1' ? ' Partidario' : ' Partidarios'), (m, n) => 'Só ' + n + (n === '1' ? ' Apoiador' : ' Apoiadores')],
  [/^Only (\d+) ways? to find your Pokemon$/, (m, n) => 'Solo ' + n + (n === '1' ? ' forma' : ' formas') + ' de buscar tus Pokémon', (m, n) => 'Só ' + n + (n === '1' ? ' forma de buscar seus Pokémon' : ' formas de buscar seus Pokémon')],
  [/^(\d+) cards? no winning list runs$/, (m, n) => n + (n === '1' ? ' carta que ninguna lista ganadora lleva' : ' cartas que ninguna lista ganadora lleva'), (m, n) => n + (n === '1' ? ' carta que nenhuma lista vencedora usa' : ' cartas que nenhuma lista vencedora usa')],
  [/^([^;()]+?) can never attack$/, '$1 nunca puede atacar', '$1 nunca consegue atacar'],
  [/^([^;()]+?) has nothing to evolve$/, '$1 no tiene nada que evolucionar', '$1 não tem nada para evoluir'],
  [/^([^;()]+?) has nothing to work with$/, '$1 no tiene con qué funcionar', '$1 não tem com o que funcionar'],
  [/^([^;()]+?) is missing a piece$/, 'A $1 le falta una pieza', 'Falta uma peça para $1'],
  [/^([^;()]+?) walls Pokemon ex$/, '$1 bloquea a los Pokémon ex', '$1 bloqueia Pokémon ex'],
  [/^([^;()]+?) is not a big hitter here$/, '$1 no pega fuerte aquí', '$1 não bate forte aqui'],
  [/^Check (.+)'s attack cost$/, 'Revisa el coste de ataque de $1', 'Confira o custo de ataque de $1'],
  [/^Keep (.+) Active$/, 'Mantén a $1 en el Puesto Activo', 'Mantenha $1 no Campo Ativo'],
  [/^Hard to get (.+) into play$/, 'Cuesta poner a $1 en juego', 'Difícil colocar $1 em jogo'],
  [/^Few Energy for (.+)$/, 'Poca Energía para $1', 'Pouca Energia para $1'],
  [/^Heavy on Energy for (.+)$/, 'Mucha Energía para $1', 'Muita Energia para $1'],
  [/^Light on Energy for (.+)$/, 'Poca Energía para $1', 'Pouca Energia para $1'],
  [/^Missing (.+) staples$/, 'Faltan cartas imprescindibles de $1', 'Faltam cartas essenciais de $1'],
  [/^Swap 1 (.+) for 1 (.+)$/, 'Cambia 1 $1 por 1 $2', 'Troque 1 $1 por 1 $2'],
  // 3.2.8: Pocket printings, cards whose job needs Energy the list lacks, Abilities that need Energy or Evolution Pokemon,
  // too little or too much Energy, Rare Candy with no Stage 2, the import preview's rule checks, and Hilda's "In this deck" line.
  [/^This printing is from Pokemon TCG Pocket, not the card game$/, 'Esta impresión es de Pokémon TCG Pocket, no del juego de cartas', 'Esta impressão é do Pokémon TCG Pocket, não do jogo de cartas'],
  [/^Its only job is Energy, and the list runs no Energy\.$/, 'Solo sirve para la Energía, y la lista no lleva Energía.', 'Só serve para Energia, e a lista não usa Energia.'],
  [/^Helps pay Energy costs, but (.+?)'s attacks cost no Energy\.$/, 'Ayuda a pagar costes de Energía, pero los ataques de $1 no cuestan Energía.', 'Ajuda a pagar custos de Energia, mas os ataques de $1 não custam Energia.'],
  [/^The list has no Stage 2 Pokemon, so it cannot be played\.$/, 'La lista no tiene Pokémon de Fase 2, así que esta carta no se puede jugar.', 'A lista não tem Pokémon de Estágio 2, então esta carta não pode ser jogada.'],
  [/^([^;()]+?)'s (.+?) never turns on$/, 'La Habilidad $2 de $1 nunca se activa', 'A Habilidade $2 de $1 nunca é ativada'],
  [/^([^;()]+?)'s (.+?) finds nothing$/, 'La Habilidad $2 de $1 no encuentra nada', 'A Habilidade $2 de $1 não encontra nada'],
  [/^([^;()]+?) does nothing as built$/, '$1 no hace nada con la lista tal como está', '$1 não faz nada com a lista como está'],
  [/^(.+?) only works while (.+?) has (?:(\w+) )?Energy attached, but the list runs no (?:\w+ )?Energy, so the Ability does nothing as built\.$/,
    (m, a, n, t) => a + ' solo funciona mientras ' + n + ' tiene ' + (t ? i18nEnergy(t, 'es') : 'Energía') + ' unida, pero la lista no lleva ' + (t ? i18nEnergy(t, 'es') : 'Energía') + ', así que la Habilidad no hace nada con la lista tal como está.',
    (m, a, n, t) => a + ' só funciona enquanto ' + n + ' tem ' + (t ? i18nEnergy(t, 'pt') : 'Energia') + ' ligada, mas a lista não usa ' + (t ? i18nEnergy(t, 'pt') : 'Energia') + ', então a Habilidade não faz nada com a lista como está.'],
  [/^(.+?) attaches Basic (\w+) Energy from your hand, but the list runs no \w+ Energy, so the Ability does nothing as built\.$/,
    (m, a, t) => a + ' une ' + i18nEnergy(t, 'es') + ' básica de tu mano, pero la lista no lleva ' + i18nEnergy(t, 'es') + ', así que la Habilidad no hace nada con la lista tal como está.',
    (m, a, t) => a + ' liga ' + i18nEnergy(t, 'pt') + ' básica da sua mão, mas a lista não usa ' + i18nEnergy(t, 'pt') + ', então a Habilidade não faz nada com a lista como está.'],
  [/^Its attacks (?:cannot be paid either|need (\w+) Energy too), so the (\d+) (?:copies are dead cards|copy is a dead card)\.$/,
    (m, t, n) => (t ? 'Sus ataques también necesitan ' + i18nEnergy(t, 'es') : 'Tampoco puede pagar sus ataques') + (n === '1' ? ', así que la 1 copia es una carta muerta.' : ', así que las ' + n + ' copias son cartas muertas.'),
    (m, t, n) => (t ? 'Seus ataques também precisam de ' + i18nEnergy(t, 'pt') : 'Também não consegue pagar seus ataques') + (n === '1' ? ', então a 1 cópia é uma carta morta.' : ', então as ' + n + ' cópias são cartas mortas.')],
  [/^Cut (them|it) or add (?:(\w+) )?Energy\.$/, (m, w, t) => (w === 'it' ? 'Quítala' : 'Quítalas') + ' o añade ' + (t ? i18nEnergy(t, 'es') : 'Energía') + '.', (m, w, t) => (w === 'it' ? 'Tire-a' : 'Tire-as') + ' ou adicione ' + (t ? i18nEnergy(t, 'pt') : 'Energia') + '.'],
  [/^(.+?) searches your deck for (?:(\w+) )?Evolution Pokemon, but the list runs none, so the Ability does nothing as built\.$/,
    (m, a, t) => a + ' busca en tu baraja Pokémon Evolución' + (t ? ' de tipo ' + ({ Psychic: 'Psíquico', Darkness: 'Oscuridad', Colorless: 'Incoloro' }[t] || I18N_TYPES.es[t] || t) : '') + ', pero la lista no lleva ninguno, así que la Habilidad no hace nada con la lista tal como está.',
    (m, a, t) => a + ' procura no seu deck Pokémon de Evolução' + (t ? ' do tipo ' + ({ Psychic: 'Psíquico' }[t] || I18N_TYPES.pt[t] || t) : '') + ', mas a lista não tem nenhum, então a Habilidade não faz nada com a lista como está.'],
  [/^The list runs (\d+) Energy\.$/, 'La lista lleva $1 Energías.', 'A lista usa $1 Energias.'],
  [/^Even decks whose attacks use up Energy rarely run more than 20, so a lot of your draws are Energy you cannot use that turn\.$/, 'Incluso las barajas cuyos ataques gastan Energía rara vez llevan más de 20, así que muchos de tus robos son Energía que no puedes usar ese turno.', 'Mesmo decks cujos ataques gastam Energia raramente usam mais de 20, então muitas das suas compras são Energia que você não consegue usar naquele turno.'],
  [/^Trade some for draw or search cards\.$/, 'Cambia algunas por cartas de robo o de búsqueda.', 'Troque algumas por cartas de compra ou de busca.'],
  [/^Only 1 Energy$/, 'Solo 1 Energía', 'Só 1 Energia'],
  [/^No Energy in the list$/, 'La lista no lleva Energía', 'A lista não usa Energia'],
  [/^The list runs 1 Energy card, so it is rarely in your hand when you need it, and attacks that cost Energy will almost never be used\.$/, 'La lista lleva 1 carta de Energía, así que rara vez la tendrás en la mano cuando la necesites, y los ataques que cuestan Energía casi nunca se podrán usar.', 'A lista usa 1 carta de Energia, então ela raramente está na sua mão quando você precisa, e ataques que custam Energia quase nunca serão usados.'],
  [/^The list runs no Energy cards, so no attack that costs Energy can ever be used\.$/, 'La lista no lleva cartas de Energía, así que ningún ataque que cueste Energía se puede usar nunca.', 'A lista não usa cartas de Energia, então nenhum ataque que custe Energia pode ser usado.'],
  [/^Most decks run 8 to 16\.$/, 'La mayoría de las barajas lleva de 8 a 16.', 'A maioria dos decks usa de 8 a 16.'],
  [/^Too little Energy for the main attacker$/, 'Muy poca Energía para el atacante principal', 'Pouca Energia para o atacante principal'],
  [/^(.+?)'s cheapest attack needs (\d+) Energy, but the list runs only (\d+) Energy cards, so it can never attack\.$/, 'El ataque más barato de $1 necesita $2 Energías, pero la lista solo lleva $3 cartas de Energía, así que nunca puede atacar.', 'O ataque mais barato de $1 precisa de $2 Energias, mas a lista só usa $3 cartas de Energia, então ele nunca pode atacar.'],
  [/^Add Energy or pick another main attacker\.$/, 'Añade Energía o elige otro atacante principal.', 'Adicione Energia ou escolha outro atacante principal.'],
  [/^There are (\d+) (.+), and the most allowed is 4\.$/, 'Hay $1 $2, y el máximo permitido es 4.', 'Há $1 $2, e o máximo permitido é 4.'],
  [/^(\d+) cards? (?:is|are) from a set that is not Standard legal now\.$/, (m, n) => n === '1' ? '1 carta es de una expansión que no es legal en Estándar ahora.' : n + ' cartas son de expansiones que no son legales en Estándar ahora.', (m, n) => n === '1' ? '1 carta é de uma coleção que não é legal no Padrão agora.' : n + ' cartas são de coleções que não são legais no Padrão agora.'],
  [/^Finds (.+?)( and an Energy)? together\.$/, (m, a, e) => 'Busca ' + a.replace(/ or /g, ' o ') + (e ? ' y una Energía' : '') + ' a la vez.', (m, a, e) => 'Busca ' + a.replace(/ or /g, ' ou ') + (e ? ' e uma Energia' : '') + ' de uma vez.'],
  [/^Gets your (.+?)( and an Energy)? together\.$/, (m, a, e) => 'Consigue ' + a.replace(/ and /g, ' y ') + (e ? ' y una Energía' : '') + ' a la vez.', (m, a, e) => 'Pega ' + a.replace(/ and /g, ' e ') + (e ? ' e uma Energia' : '') + ' de uma vez.'],
  [/^Only 1 (.+)$/, 'Solo 1 $1', 'Só 1 $1'],
  [/^Your ACE SPEC, (.+), has nothing to work with$/, 'Tu AS TÁCTICO, $1, no tiene con qué funcionar', 'Seu ÁS TÁTICO, $1, não tem com o que funcionar'],
  [/^The list runs (\d+) Energy\. Most decks run 8 to 16, so a lot of your draws are Energy you cannot use that turn\. Trade some for draw or search cards\.$/, 'La lista lleva $1 Energías. La mayoría de las barajas lleva de 8 a 16, así que muchos de tus robos son Energía que no puedes usar ese turno. Cambia algunas por cartas de robo o de búsqueda.', 'A lista usa $1 Energias. A maioria dos decks usa de 8 a 16, então muitas das suas compras são Energia que você não consegue usar naquele turno. Troque algumas por cartas de compra ou de busca.'],
  [/^None of your Supporters draws cards or searches your deck, so once your opening hand is spent your only draw is (.+)\. Most decks run 4 or more Supporters that draw, like Lillie's Determination\.$/, (m, a) => 'Ninguno de tus Partidarios roba cartas ni busca en tu baraja, así que cuando se acaba tu mano inicial tu único robo es ' + a.replace(/ and /g, ' y ') + ". La mayoría de las barajas lleva 4 o más Partidarios que roban, como Lillie's Determination.", (m, a) => 'Nenhum dos seus Apoiadores compra cartas ou busca no deck, então quando sua mão inicial acaba sua única compra é ' + a.replace(/ and /g, ' e ') + ". A maioria dos decks usa 4 ou mais Apoiadores que compram, como Lillie's Determination."],
  [/^([^;()]+?) hits for (\d+) with (\d+) (.+) attached and (\d+) once (\d+) are in play\. Your list runs (\d+), so the full hit is a mid game plan, not a turn 2 one\.$/, (m, n, a, e, w, b, t, h) => n + ' hace ' + a + ' de daño con ' + e + ' ' + i18nEnergy(w, 'es', e) + (e === '1' ? ' unida y ' : ' unidas y ') + b + ' cuando tiene ' + t + ' en juego. Tu lista lleva ' + h + ', así que el golpe completo es un plan de mitad de partida, no del turno 2.', (m, n, a, e, w, b, t, h) => n + ' causa ' + a + ' com ' + e + ' ' + i18nEnergy(w, 'pt', e) + (e === '1' ? ' ligada e ' : ' ligadas e ') + b + ' quando tem ' + t + ' em jogo. Sua lista usa ' + h + ', então o golpe completo é um plano de meio de jogo, não do turno 2.'],
  [/^([^;()]+?) (is|are) risky at 3 prizes( each)?, yet you hit hard enough to justify the trade\.$/, (m, n, v, e) => n + (v === 'are' ? ' son arriesgados porque dan 3 premios' : ' es arriesgado porque da 3 premios') + (e ? ' cada uno' : '') + ', pero golpeas lo bastante fuerte para justificar el intercambio.', (m, n, v, e) => n + (v === 'are' ? ' são arriscados por valerem 3 prêmios' : ' é arriscado por valer 3 prêmios') + (e ? ' cada' : '') + ', mas você bate forte o bastante para justificar a troca.'],
  [/^(\d+) of your (\d+) Pokemon give up two prizes, so most knockouts cost you two\. Send in your one-prize Pokemon when you can\.$/, '$1 de tus $2 Pokémon entregan dos premios, así que casi siempre que uno queda Fuera de Combate el rival toma dos. Usa como atacantes a tus Pokémon de un premio cuando puedas.', '$1 dos seus $2 Pokémon entregam dois prêmios, então a maioria dos nocautes custa dois. Mande seus Pokémon de um prêmio quando puder.'],
  [/^([^;()]+?) evolves from (.+), which is not in the list, so it can never reach the board\.$/, '$1 evoluciona de $2, que no está en la lista, así que nunca puede llegar a la mesa.', '$1 evolui de $2, que não está na lista, então nunca consegue chegar à mesa.'],
  // 3.2.5: Pokemon put onto the Bench from the discard pile (Kingdra ex's King's Order).
  [/^([^;()]+?) puts (.+) onto your Bench from your discard pile(?: with (.+?))?, so (it needs|they need) nothing to evolve from\.$/, (m, r, l, v, n) => r + ' pone a ' + l.replace(/ and /g, ' y ') + ' en tu Banca desde tu pila de descartes' + (v ? ' con ' + v : '') + ', así que no hace falta su línea evolutiva.', (m, r, l, v, n) => r + ' coloca ' + l.replace(/ and /g, ' e ') + ' no seu Banco a partir da sua pilha de descarte' + (v ? ' com ' + v : '') + ', então a linha evolutiva não é necessária.'],
  [/^(.+?) (gets|get) (it|them) into your discard pile\.$/, (m, o, g, p) => o.replace(/ and /g, ' y ') + (p === 'it' ? ' lo ' : ' los ') + (g === 'get' ? 'ponen' : 'pone') + ' en tu pila de descartes.', (m, o, g, p) => o.replace(/ and /g, ' e ') + (p === 'it' ? ' o ' : ' os ') + (g === 'get' ? 'colocam' : 'coloca') + ' na sua pilha de descarte.'],
  [/^Nothing puts (.+) in your discard pile$/, (m, l) => 'Nada pone a ' + l.replace(/ and /g, ' y ') + ' en tu pila de descartes', (m, l) => 'Nada coloca ' + l.replace(/ and /g, ' e ') + ' na sua pilha de descarte'],
  [/^(.+?) can only reach the board when (.+?) brings (it|them) back from your discard pile(?: with (.+?))?, but nothing in the list discards cards from your hand or deck, like Ultra Ball or Brilliant Blender\.$/, (m, l, r, p, v) => l.replace(/ and /g, ' y ') + (p === 'it' ? ' solo puede' : ' solo pueden') + ' llegar a la mesa si ' + r + (p === 'it' ? ' lo' : ' los') + ' trae de vuelta de tu pila de descartes' + (v ? ' con ' + v : '') + ', pero nada en la lista descarta cartas de tu mano o de tu baraja, como Ultra Ball o Brilliant Blender.', (m, l, r, p, v) => l.replace(/ and /g, ' e ') + (p === 'it' ? ' só consegue' : ' só conseguem') + ' chegar à mesa quando ' + r + (p === 'it' ? ' o' : ' os') + ' traz de volta da sua pilha de descarte' + (v ? ' com ' + v : '') + ', mas nada na lista descarta cartas da sua mão ou do deck, como Ultra Ball ou Brilliant Blender.'],
  // 3.2.7: the card data note above a grade read from part of the list.
  [/^(\d+) cards? (?:are|is) not legal in Standard now\. (?:They stay|It stays) in the list, and the grade counts (?:them|it) as not legal\.$/, (m, n) => n + (n === '1' ? ' carta no es legal en Estándar ahora. Se queda en la lista, y la calificación la cuenta como no legal.' : ' cartas no son legales en Estándar ahora. Se quedan en la lista, y la calificación las cuenta como no legales.'), (m, n) => n + (n === '1' ? ' carta não é legal no Padrão agora. Ela fica na lista, e a nota a conta como não legal.' : ' cartas não são legais no Padrão agora. Elas ficam na lista, e a nota as conta como não legais.')],
  [/^⚠ Card data read for (\d+)\/(\d+) entries\. (Cards are grouped by your list's sections|Grouping for the rest is based on card names)\.$/, (m, a, b, k) => '\u26A0 Datos de cartas leídos para ' + a + '/' + b + ' entradas. ' + (k[0] === 'C' ? 'Las cartas se agrupan por las secciones de tu lista.' : 'El resto se agrupa por el nombre de la carta.'), (m, a, b, k) => '\u26A0 Dados das cartas lidos para ' + a + '/' + b + ' entradas. ' + (k[0] === 'C' ? 'As cartas são agrupadas pelas seções da sua lista.' : 'O restante é agrupado pelo nome da carta.')],
  [/^⚠ RdyDeck could not find (.+)\. Check the spelling in Edit deck, because the grade cannot read what (these cards do|this card does)\.$/, (m, n, k) => '\u26A0 RdyDeck no encontró ' + n + '. Revisa la ortografía en Editar baraja, porque la calificación no puede leer lo que ' + (k === 'these cards do' ? 'hacen estas cartas.' : 'hace esta carta.'), (m, n, k) => '\u26A0 O RdyDeck não encontrou ' + n + '. Confira a grafia em Editar deck, porque a nota não consegue ler o que ' + (k === 'these cards do' ? 'essas cartas fazem.' : 'essa carta faz.')],
  // 3.2.7: a discard pile revival line that rarely comes together, and the cap on lists with cards not Standard legal now.
  [/^(.+?) rarely reaches the board$/, (m, x) => x + ' casi nunca llega a la mesa', (m, x) => x + ' quase nunca chega à mesa'],
  [/^(.+?) can only reach the board when (.+?) brings it back from your discard pile(?: with (.+?))?, and that comes together in only about 1 game in (\d+)\.$/, (m, x, r, v, n) => x + ' solo puede llegar a la mesa si ' + r + ' lo trae de vuelta de tu pila de descartes' + (v ? ' con ' + v : '') + ', y eso ocurre solo en aproximadamente 1 de cada ' + n + ' partidas.', (m, x, r, v, n) => x + ' só consegue chegar à mesa quando ' + r + ' o traz de volta da sua pilha de descarte' + (v ? ' com ' + v : '') + ', e isso acontece em apenas cerca de 1 a cada ' + n + ' partidas.'],
  // 3.2.8: what fills the discard pile, how often the whole revival line comes together, and a card read from another printing.
  [/^(.+?) (is what puts|are what put) it in your discard pile\.$/, (m, o, v) => o.replace(/ and /g, ' y ') + (v[0] === 'a' ? ' son los que lo ponen' : ' es lo que lo pone') + ' en tu pila de descartes.', (m, o, v) => o.replace(/ and /g, ' e ') + (v[0] === 'a' ? ' são os que o colocam' : ' é o que o coloca') + ' na sua pilha de descarte.'],
  [/^The whole line comes together in about (\d+) games in 10\.$/, 'Toda la línea se completa en aproximadamente $1 de cada 10 partidas.', 'A linha inteira se completa em cerca de $1 a cada 10 partidas.'],
  [/^The whole line comes together in only about 1 game in (\d+)\.$/, 'Toda la línea se completa solo en aproximadamente 1 de cada $1 partidas.', 'A linha inteira se completa em apenas cerca de 1 a cada $1 partidas.'],
  [/^The card text for (.+?) was read from another printing, (.+)\.$/, 'El texto de $1 se leyó de otra impresión, $2.', 'O texto de $1 foi lido de outra impressão, $2.'],
  [/^(\d+) more cards were read from other printings\.$/, 'Otras $1 cartas se leyeron de otras impresiones.', 'Mais $1 cartas foram lidas de outras impressões.'],
  [/^(.+?)\. (These|It) cannot be played in Standard, so the grade (is held at|can go no higher than) ([\d.]+) until (?:they are|it is) swapped for legal cards\.(?: The list alone would score ([\d.]+)\.)?$/, (m, l, p, h, c, a) => l + '. ' + (p === 'These' ? 'No se pueden' : 'No se puede') + ' jugar en Estándar, así que la calificación ' + (h === 'is held at' ? 'se queda en ' : 'no puede pasar de ') + c + ' hasta que ' + (p === 'These' ? 'se cambien' : 'se cambie') + ' por cartas legales.' + (a ? ' La lista sola obtendría ' + a + '.' : ''), (m, l, p, h, c, a) => l + '. ' + (p === 'These' ? 'Não podem ser jogadas' : 'Não pode ser jogada') + ' no Padrão, então a nota ' + (h === 'is held at' ? 'fica em ' : 'não pode passar de ') + c + ' até que ' + (p === 'These' ? 'sejam trocadas' : 'seja trocada') + ' por cartas legais.' + (a ? ' Só pela lista, a nota seria ' + a + '.' : '')],
  [/^Its attack needs (\w+) Energy, but there is none in the deck\. As built it cannot actually fire\.$/, (m, t) => 'Su ataque necesita ' + i18nEnergy(t, 'es') + ', pero no hay en la baraja. Tal como está, no puede atacar.', (m, t) => 'O ataque precisa de ' + i18nEnergy(t, 'pt') + ', mas não há no deck. Do jeito que está, não consegue atacar.'],
  [/^(\d+) top lists$/, '$1 listas top', '$1 listas top'],
  [/^(\d+) cards?$/, (m, n) => n + (n === '1' ? ' carta' : ' cartas'), (m, n) => n + (n === '1' ? ' carta' : ' cartas')],
  [/^Top lists from Limitless online tournaments since (.+) came out \((.+) to (.+)\)\.$/, (m, s, a, b) => 'Listas top de torneos online de Limitless desde que salió ' + s + ' (' + i18nEsDay(a) + ' a ' + i18nEsDay(b) + ').', (m, s, a, b) => 'Listas top de torneios online do Limitless desde que saiu ' + s + ' (' + i18nDayMonPt(a) + ' a ' + i18nDayMonPt(b) + ').'],
  [/^(\d+) top lists since (.+) came out \((.+)\)\. Core is what (\d+)% or more of them run\.$/, (m, n, s, d, p) => n + ' listas top desde que salió ' + s + ' (' + i18nEsDay(d) + '). Núcleo es lo que lleva el ' + p + '% o más de ellas.', (m, n, s, d, p) => n + ' listas top desde que saiu ' + s + ' (' + i18nDayMonPt(d) + '). Núcleo é o que ' + p + '% ou mais delas usam.'],
  [/^Most run in (.+) lists$/, 'Lo más usado en listas de $1', 'Mais usadas nas listas de $1'],
  [/^(\d+)% of (.+) lists$/, '$1% de las listas de $2', '$1% das listas de $2'],
  [/^(\d+)% of (.+) top lists run it, most with (\d+)\.$/, 'El $1% de las listas top de $2 la lleva, casi siempre $3.', '$1% das listas top de $2 usam, a maioria com $3.'],
  [/^What (.+) top lists run$/, 'Lo que llevan las listas top de $1', 'O que as listas top de $1 usam'],
  [/^Every count is one (.+) top lists run\.$/, 'Cada cantidad es una que llevan las listas top de $1.', 'Cada quantidade é uma que as listas top de $1 usam.'],
  [/^(\d+)% run (\d+)(?:, (\d+)% run (\d+))?\.$/, (m, a, b, c, d) => a + '% lleva ' + b + (c ? ', ' + c + '% lleva ' + d : '') + '.', (m, a, b, c, d) => a + '% usam ' + b + (c ? ', ' + c + '% usam ' + d : '') + '.'],
  [/^You (\d+)$/, 'Tú $1', 'Você $1'],
  [/^Add (\d+)$/, 'Agregar $1', 'Adicionar $1'],
  [/^(\d+) cards?\. A Standard deck is exactly 60, so (\d+) to go\.$/, (m, n, f) => n + (n === '1' ? ' carta' : ' cartas') + '. Una baraja Estándar tiene exactamente 60, así que ' + (f === '1' ? 'falta 1.' : 'faltan ' + f + '.'), (m, n, k) => n + (n === '1' ? ' carta' : ' cartas') + '. Um deck Padrão tem exatamente 60, então ' + (k === '1' ? 'falta 1.' : 'faltam ' + k + '.')],
  [/^(\d+) cards\. A Standard deck is exactly 60, so cut (\d+)\.$/, '$1 cartas. Una baraja Estándar tiene exactamente 60, así que quita $2.', '$1 cartas. Um deck Padrão tem exatamente 60, então corte $2.'],
  [/^Pokémon (\d+), Trainer (\d+) \(Supporter (\d+)\), Energy (\d+)\.$/, 'Pokémon $1, Entrenador $2 (Partidario $3), Energía $4.', 'Pokémon $1, Treinador $2 (Apoiador $3), Energia $4.'],
  [/^Most (.+) lists: Pokémon (\d+), Trainer (\d+) \(Supporter (\d+)\), Energy (\d+)\.$/, 'La mayoría de las listas de $1: Pokémon $2, Entrenador $3 (Partidario $4), Energía $5.', 'A maioria das listas de $1: Pokémon $2, Treinador $3 (Apoiador $4), Energia $5.'],
  [/^, (\d+) top lists\.$/, ', $1 listas top.', ', $1 listas top.'],
  [/^(.+): the (\d+) cards most top lists run\. Fill the other (\d+) from Suggestions\.$/, (m, d, n, f) => d + ': las ' + n + ' cartas que llevan la mayoría de las listas top. ' + (f === '1' ? 'Completa la que falta desde Sugerencias.' : 'Completa las otras ' + f + ' desde Sugerencias.'), (m, d, n, k) => d + ': as ' + n + ' cartas que a maioria das listas top usa. ' + (k === '1' ? 'Complete a que falta em Sugestões.' : 'Complete as outras ' + k + ' em Sugestões.')],
  [/^(.+): the cards most top lists run, at their usual counts\.$/, '$1: las cartas que llevan la mayoría de las listas top, en sus cantidades habituales.', '$1: as cartas que a maioria das listas top usa, nas quantidades de sempre.'],
  [/^Updated to RdyDeck (.+)$/, 'Actualizado a RdyDeck $1', 'Atualizado para RdyDeck $1'],
  [/^and (\d+) more in What's new$/, 'y $1 más en Novedades', 'e mais $1 em Novidades'],
  [/^Standard, (\d+) prize games? played$/, (m, n) => n === '1' ? 'Estándar, 1 partida de premios jugada' : 'Estándar, ' + n + ' partidas de premios jugadas', (m, n) => n === '1' ? 'Padrão, 1 jogo de prêmios jogado' : 'Padrão, ' + n + ' jogos de prêmios jogados'],
  [/^Session (\d+) of (\d+)$/, 'Sesión $1 de $2', 'Sessão $1 de $2'],
  [/^Game (\d+) of (\d+)$/, 'Partida $1 de $2', 'Partida $1 de $2'],
  [/^(\d+) min$/, '$1 min', '$1 min'],
  [/^(\d+) sec$/, '$1 s', '$1 s'],
];

// ── 3.0 additions: grade flags, error reports, owned cards and prices, What's next, scoreboard ──
Object.assign(I18N_ES, {
  "Added: Spanish and Portuguese": "Nuevo: español y portugués",
  "Pick your language in Settings. Card names stay in English.": "Elige tu idioma en Ajustes. Los nombres de las cartas siguen en inglés.",
  "Added: cards you own": "Nuevo: cartas que tienes",
  "Tick the cards you have, and Upgrades can suggest them first. Saved on your device only.": "Marca las cartas que tienes y Mejoras puede sugerirlas primero. Se guarda solo en tu dispositivo.",
  "Added: card prices": "Nuevo: precios de cartas",
  "Each card's price and your list's total, from TCGdex, with a cheapest first option.": "El precio de cada carta y el total de tu lista, de TCGdex, con la opción de ver primero las más baratas.",
  "Added: how accurate the grades are": "Nuevo: qué tan precisas son las calificaciones",
  "Each week, how closely grades rank decks against their real online win rates, per set.": "Cada semana, qué tan bien las calificaciones ordenan las barajas frente a sus porcentajes de victoria online reales, por expansión.",
  "Added: This grade looks off?": "Nuevo: ¿Calificación dudosa?",
  "Tell us when a grade seems wrong, with one tap and no typing.": "Avísanos cuando una calificación parezca incorrecta, con un toque y sin escribir.",
  "Added: Against the field now": "Nuevo: Contra el meta actual",
  "Your deck's expected win rate against the decks people play most right now.": "El porcentaje de victorias esperado de tu baraja contra las barajas más jugadas ahora.",
  "Added: How did it do?": "Nuevo: ¿Cómo le fue?",
  "Save your record from an event next to the grade your list had then.": "Guarda tu resultado de un evento junto a la calificación que tenía tu lista entonces.",
  "Added: What's next": "Nuevo: Lo que viene",
  "See what is planned and send us your ideas, from Settings or Help.": "Mira lo que está planeado y envíanos tus ideas, desde Ajustes o Ayuda.",
  "Added: new set week": "Nuevo: semana de expansión nueva",
  "Home tells you when a new set is out and which decks have cards to check.": "Inicio te avisa cuando sale una expansión nueva y qué barajas tienen cartas que revisar.",
  "Changed: clearer win rates and one tap share": "Cambio: porcentajes de victoria más claros y compartir con un toque",
  "Both win rates are labeled, and Share grade sends the picture in one tap.": "Los dos porcentajes de victoria tienen etiqueta, y Compartir calificación envía la imagen con un toque.",
  "Added: error reports": "Nuevo: informes de errores",
  "When something breaks, a short report with nothing personal in it helps fix it. You can turn it off in Settings.": "Cuando algo falla, un informe breve sin nada personal ayuda a arreglarlo. Puedes desactivarlo en Ajustes.",
  "This grade looks off?": "¿Calificación dudosa?",
  "This grade looks off": "Calificación dudosa",
  "Pick the closest reason. It is sent without your name or your deck list, and helps make grades match real results.": "Elige la razón más cercana. Se envía sin tu nombre ni tu lista, y ayuda a que las calificaciones coincidan con los resultados reales.",
  "The grade is too high": "La calificación es demasiado alta",
  "The grade is too low": "La calificación es demasiado baja",
  "It thinks my deck is a different deck": "Cree que mi baraja es otra baraja",
  "A card is read wrong": "Una carta se lee mal",
  "Something else": "Otra cosa",
  "Thanks, you already flagged this grade.": "Gracias, ya marcaste esta calificación.",
  "You are offline. Try again when you are online.": "No tienes conexión. Inténtalo de nuevo cuando estés en línea.",
  "Thanks. This helps make grades match real results.": "Gracias. Esto ayuda a que las calificaciones coincidan con los resultados reales.",
  "Reports are off in Settings, so nothing was sent.": "Los informes están desactivados en Ajustes, así que no se envió nada.",
  "Could not send it just now. Try again later.": "No se pudo enviar ahora. Inténtalo más tarde.",
  "Error reports": "Informes de errores",
  "When something breaks, RdyDeck sends a short report with no name, deck or address in it, so it can be fixed.": "Cuando algo falla, RdyDeck envía un informe breve sin nombre, baraja ni dirección, para poder arreglarlo.",
  "What's next": "Lo que viene",
  "Planned features": "Funciones planeadas",
  "Planned features, and a place to ask for yours": "Funciones planeadas, y un lugar para pedir las tuyas",
  "Planned, in no fixed order. Plans can change.": "Planeado, sin un orden fijo. Los planes pueden cambiar.",
  "Want something else? Tell us. Ideas from players decide what comes first.": "¿Quieres algo más? Cuéntanos. Las ideas de los jugadores deciden qué va primero.",
  "Join the Discord": "Únete al Discord",
  "Google Play app": "App en Google Play",
  "RdyDeck as an Android app.": "RdyDeck como app de Android.",
  "Spanish and Portuguese deck guides": "Guías de barajas en español y portugués",
  "The deck guides in two more languages.": "Las guías de barajas en dos idiomas más.",
  "In-person tournament results": "Resultados de torneos presenciales",
  "Results from events at stores and Regionals next to online ones, once a data source allows it.": "Resultados de eventos en tiendas y Regionales junto a los online, cuando una fuente de datos lo permita.",
  "Puzzle mode": "Modo puzzle",
  "More win this turn puzzles to play whenever you like.": "Más puzzles de ganar en este turno para jugar cuando quieras.",
  "Mark cards you own": "Marcar las cartas que tienes",
  "Done marking": "Terminar de marcar",
  "You own this card": "Tienes esta carta",
  "Tap each card you own. Tap it again to unmark it. Saved on this device only.": "Toca cada carta que tienes. Tócala otra vez para desmarcarla. Se guarda solo en este dispositivo.",
  "List total:": "Total de la lista:",
  "Cards you do not own:": "Cartas que no tienes:",
  "You own every card with a price.": "Tienes todas las cartas con precio.",
  "1 card has no price and is not counted.": "1 carta no tiene precio y no se cuenta.",
  "The price of 1 card could not be read yet, so it is not counted.": "Todavía no se pudo leer el precio de 1 carta, así que no se cuenta.",
  "Prices are read when you are back online.": "Los precios se leen cuando vuelvas a tener conexión.",
  "Reading prices…": "Leyendo precios…",
  "Previous card": "Carta anterior",
  "Next card": "Carta siguiente",
  "You're offline. This starter deck loads once you're back online.": "No tienes conexión. Esta baraja inicial se carga cuando vuelvas a tener conexión.",
  "Quit this game?": "¿Salir de esta partida?",
  "Keep playing": "Seguir jugando",
  '1 line was not read.': 'No se leyó 1 línea.',
  'Check it against the list.': 'Revísala con la lista.',
  'Check them against the list.': 'Revísalas con la lista.',
  'Grading it in a moment.': 'La calificamos en un momento.',
  'Tap the name box to name it first.': 'Para ponerle nombre antes, toca la casilla del nombre.',
  "Delete all decks and history?": "¿Eliminar todas las barajas y el historial?",
  "This cannot be undone.": "Esto no se puede deshacer.",
  "Delete all": "Eliminar todo",
  "Delete this matchup note?": "¿Eliminar esta nota de enfrentamiento?",
  "Delete this match from the log?": "¿Eliminar esta partida del registro?",
  "Reveal the prizes?": "¿Revelar los premios?",
  "Reveal": "Revelar",
  "Keep guessing": "Seguir respondiendo",
  "Replace all your data?": "¿Reemplazar todos tus datos?",
  "This backup replaces all decks and history on this device.": "Esta copia de seguridad reemplaza todas las barajas y el historial de este dispositivo.",
  "Replace": "Reemplazar",
  "You already have a note for this matchup.": "Ya tienes una nota para este enfrentamiento.",
  "Clear this prerelease deck?": "¿Borrar esta baraja de presentación?",
  "Save this prerelease deck anyway?": "¿Guardar esta baraja de presentación de todos modos?",
  "Save anyway": "Guardar de todos modos",
  "OK": "Aceptar",
  "You're offline. Card data loads once you're back online, so your list stays here until then.": "No tienes conexión. Los datos de las cartas se cargan cuando vuelvas a tener conexión, así que tu lista se queda aquí hasta entonces.",
  "no price": "sin precio",
  "No price": "Sin precio",
  "Order of upgrades": "Orden de las mejoras",
  "Suggest cards I own first": "Sugerir primero cartas que tengo",
  "Cheapest first": "Más baratas primero",
  "I own this card": "Tengo esta carta",
  "Marked as a card you own.": "Marcada como carta que tienes.",
  "No longer marked as yours.": "Ya no está marcada como tuya.",
  "How accurate the grades are.": "Qué tan precisas son las calificaciones.",
  "How accurate the grades are": "Qué tan precisas son las calificaciones",
  "1.0 means exactly the order of their results.": "1.0 significa exactamente el orden de sus resultados.",
  "See every set": "Ver todas las expansiones",
  "Against the field now:": "Contra el meta actual:",
  "about": "alrededor de",
  "Save and copy link": "Guardar y copiar enlace",
  "Picture saved and link copied. Post the picture and paste the link with it.": "Imagen guardada y enlace copiado. Publica la imagen y pega el enlace con ella.",
  "Picture saved. Copy the link with Copy link.": "Imagen guardada. Copia el enlace con Copiar enlace.",
  "Grade and link copied. Paste it anywhere.": "Calificación y enlace copiados. Pégalos donde quieras.",
  "The picture could not be made on this device. The link still works.": "No se pudo crear la imagen en este dispositivo. El enlace sigue funcionando.",
  "How did it do?": "¿Cómo le fue?",
  "At the event:": "En el evento:",
  "At an event you played:": "En un evento que jugaste:",
  "(wins, losses, ties)": "(victorias, derrotas, empates)",
  "It stays on this device and is never sent anywhere.": "Se queda en este dispositivo y nunca se envía a ningún lado.",
  "Placing": "Posición",
  "Optional": "Opcional",
  "Remove": "Quitar",
  "The deck says which.": "La baraja indica cuáles.",
});
Object.assign(I18N_PT, {
  "Added: Spanish and Portuguese": "Novo: espanhol e português",
  "Pick your language in Settings. Card names stay in English.": "Escolha seu idioma nas Configurações. Os nomes das cartas continuam em inglês.",
  "Added: cards you own": "Novo: cartas que você tem",
  "Tick the cards you have, and Upgrades can suggest them first. Saved on your device only.": "Marque as cartas que você tem, e Melhorias pode sugeri-las primeiro. Fica salvo só no seu aparelho.",
  "Added: card prices": "Novo: preços das cartas",
  "Each card's price and your list's total, from TCGdex, with a cheapest first option.": "O preço de cada carta e o total da sua lista, do TCGdex, com a opção de ver as mais baratas primeiro.",
  "Added: how accurate the grades are": "Novo: quão precisas são as notas",
  "Each week, how closely grades rank decks against their real online win rates, per set.": "Toda semana, o quanto as notas ordenam os decks de acordo com as taxas de vitória online reais, por coleção.",
  "Added: This grade looks off?": "Novo: Essa nota parece errada?",
  "Tell us when a grade seems wrong, with one tap and no typing.": "Avise quando uma nota parecer errada, com um toque e sem digitar.",
  "Added: Against the field now": "Novo: Contra o meta atual",
  "Your deck's expected win rate against the decks people play most right now.": "A taxa de vitória esperada do seu deck contra os decks mais jogados agora.",
  "Added: How did it do?": "Novo: Como foi?",
  "Save your record from an event next to the grade your list had then.": "Salve seu resultado de um evento ao lado da nota que sua lista tinha na época.",
  "Added: What's next": "Novo: O que vem aí",
  "See what is planned and send us your ideas, from Settings or Help.": "Veja o que está planejado e mande suas ideias, pelas Configurações ou Ajuda.",
  "Added: new set week": "Novo: semana de coleção nova",
  "Home tells you when a new set is out and which decks have cards to check.": "O Início avisa quando sai uma coleção nova e quais decks têm cartas para conferir.",
  "Changed: clearer win rates and one tap share": "Mudança: taxas de vitória mais claras e compartilhar com um toque",
  "Both win rates are labeled, and Share grade sends the picture in one tap.": "As duas taxas de vitória têm rótulo, e Compartilhar nota envia a imagem com um toque.",
  "Added: error reports": "Novo: relatórios de erros",
  "When something breaks, a short report with nothing personal in it helps fix it. You can turn it off in Settings.": "Quando algo quebra, um relatório curto sem nada pessoal ajuda a corrigir. Você pode desligar nas Configurações.",
  "This grade looks off?": "Essa nota parece errada?",
  "This grade looks off": "Essa nota parece errada",
  "Pick the closest reason. It is sent without your name or your deck list, and helps make grades match real results.": "Escolha o motivo mais próximo. Ele é enviado sem seu nome nem sua lista, e ajuda as notas a refletirem os resultados reais.",
  "The grade is too high": "A nota está alta demais",
  "The grade is too low": "A nota está baixa demais",
  "It thinks my deck is a different deck": "Acha que meu deck é outro deck",
  "A card is read wrong": "Uma carta foi lida errado",
  "Something else": "Outra coisa",
  "Thanks, you already flagged this grade.": "Obrigado, você já marcou essa nota.",
  "You are offline. Try again when you are online.": "Você está offline. Tente de novo quando estiver online.",
  "Thanks. This helps make grades match real results.": "Obrigado. Isso ajuda as notas a refletirem os resultados reais.",
  "Reports are off in Settings, so nothing was sent.": "Os relatórios estão desligados nas Configurações, então nada foi enviado.",
  "Could not send it just now. Try again later.": "Não foi possível enviar agora. Tente mais tarde.",
  "Error reports": "Relatórios de erros",
  "When something breaks, RdyDeck sends a short report with no name, deck or address in it, so it can be fixed.": "Quando algo quebra, o RdyDeck envia um relatório curto sem nome, deck ou endereço, para que possa ser corrigido.",
  "What's next": "O que vem aí",
  "Planned features": "Recursos planejados",
  "Planned features, and a place to ask for yours": "Recursos planejados, e um lugar para pedir os seus",
  "Planned, in no fixed order. Plans can change.": "Planejado, sem ordem fixa. Os planos podem mudar.",
  "Want something else? Tell us. Ideas from players decide what comes first.": "Quer outra coisa? Conte para a gente. As ideias dos jogadores decidem o que vem primeiro.",
  "Join the Discord": "Entre no Discord",
  "Google Play app": "App no Google Play",
  "RdyDeck as an Android app.": "RdyDeck como app para Android.",
  "Spanish and Portuguese deck guides": "Guias de decks em espanhol e português",
  "The deck guides in two more languages.": "Os guias de decks em mais dois idiomas.",
  "In-person tournament results": "Resultados de torneios presenciais",
  "Results from events at stores and Regionals next to online ones, once a data source allows it.": "Resultados de eventos em lojas e Regionais ao lado dos online, quando uma fonte de dados permitir.",
  "Puzzle mode": "Modo puzzle",
  "More win this turn puzzles to play whenever you like.": "Mais puzzles de vencer neste turno para jogar quando quiser.",
  "Mark cards you own": "Marcar minhas cartas",
  "Done marking": "Concluir marcação",
  "You own this card": "Você tem esta carta",
  "Tap each card you own. Tap it again to unmark it. Saved on this device only.": "Toque em cada carta que você tem. Toque de novo para desmarcar. Fica salvo só neste aparelho.",
  "List total:": "Total da lista:",
  "Cards you do not own:": "Cartas que você não tem:",
  "You own every card with a price.": "Você tem todas as cartas com preço.",
  "1 card has no price and is not counted.": "1 carta não tem preço e não é contada.",
  "The price of 1 card could not be read yet, so it is not counted.": "Ainda não foi possível ler o preço de 1 carta, então ela não é contada.",
  "Prices are read when you are back online.": "Os preços são lidos quando você voltar a ficar online.",
  "Reading prices…": "Lendo preços…",
  "Previous card": "Carta anterior",
  "Next card": "Próxima carta",
  "You're offline. This starter deck loads once you're back online.": "Você está offline. Este deck inicial carrega quando você voltar a ficar online.",
  "Quit this game?": "Sair desta partida?",
  "Keep playing": "Continuar jogando",
  '1 line was not read.': '1 linha não foi lida.',
  'Check it against the list.': 'Confira com a lista.',
  'Check them against the list.': 'Confira-as com a lista.',
  'Grading it in a moment.': 'Vamos avaliá-lo em um instante.',
  'Tap the name box to name it first.': 'Para dar um nome antes, toque na caixa do nome.',
  "Delete all decks and history?": "Excluir todos os decks e o histórico?",
  "This cannot be undone.": "Isso não pode ser desfeito.",
  "Delete all": "Excluir tudo",
  "Delete this matchup note?": "Excluir esta nota de confronto?",
  "Delete this match from the log?": "Excluir esta partida do registro?",
  "Reveal the prizes?": "Revelar os prêmios?",
  "Reveal": "Revelar",
  "Keep guessing": "Continuar respondendo",
  "Replace all your data?": "Substituir todos os seus dados?",
  "This backup replaces all decks and history on this device.": "Este backup substitui todos os decks e o histórico deste dispositivo.",
  "Replace": "Substituir",
  "You already have a note for this matchup.": "Você já tem uma nota para este confronto.",
  "Clear this prerelease deck?": "Limpar este deck de pré-lançamento?",
  "Save this prerelease deck anyway?": "Salvar este deck de pré-lançamento mesmo assim?",
  "Save anyway": "Salvar mesmo assim",
  "OK": "OK",
  "You're offline. Card data loads once you're back online, so your list stays here until then.": "Você está offline. Os dados das cartas carregam quando você voltar a ficar online, então sua lista fica aqui até lá.",
  "no price": "sem preço",
  "No price": "Sem preço",
  "Order of upgrades": "Ordem das melhorias",
  "Suggest cards I own first": "Sugerir primeiro cartas que eu tenho",
  "Cheapest first": "Mais baratas primeiro",
  "I own this card": "Eu tenho esta carta",
  "Marked as a card you own.": "Marcada como carta que você tem.",
  "No longer marked as yours.": "Não está mais marcada como sua.",
  "How accurate the grades are.": "Quão precisas são as notas.",
  "How accurate the grades are": "Quão precisas são as notas",
  "1.0 means exactly the order of their results.": "1.0 significa exatamente a ordem dos resultados.",
  "See every set": "Ver todas as coleções",
  "Against the field now:": "Contra o meta atual:",
  "about": "cerca de",
  "Save and copy link": "Salvar e copiar link",
  "Picture saved and link copied. Post the picture and paste the link with it.": "Imagem salva e link copiado. Poste a imagem e cole o link junto.",
  "Picture saved. Copy the link with Copy link.": "Imagem salva. Copie o link com Copiar link.",
  "Grade and link copied. Paste it anywhere.": "Nota e link copiados. Cole onde quiser.",
  "The picture could not be made on this device. The link still works.": "Não foi possível criar a imagem neste aparelho. O link continua funcionando.",
  "How did it do?": "Como foi?",
  "At the event:": "No evento:",
  "At an event you played:": "Num evento que você jogou:",
  "(wins, losses, ties)": "(vitórias, derrotas, empates)",
  "It stays on this device and is never sent anywhere.": "Fica neste aparelho e nunca é enviado a lugar nenhum.",
  "Placing": "Colocação",
  "Optional": "Opcional",
  "Remove": "Remover",
  "The deck says which.": "O deck diz quais.",
});
I18N_PAT.unshift(
  [/^(\d+)% of the grade comes from (.+)'s online tournament results(?: since (.+?))?(?: \(as of (.+?)\))?: ([\d.]+%) wins (?:with games since the newest set counted three times \(([\d.]+%) over all ([\d,]+) games\)|over all ([\d,]+) games)\.$/,
    (m, p, n, s, a, w, raw, g1, g2) => p + '% de la calificación viene de los resultados de ' + n + ' en torneos online' + (s ? ' desde ' + s : '') + (a ? ' (hasta el ' + a + ')' : '') + ': ' + w + ' de victorias' + (raw ? ' con las partidas desde la expansión más reciente contadas tres veces (' + raw + ' en las ' + g1 + ' partidas)' : ' en las ' + g2 + ' partidas') + '.',
    (m, p, n, s, a, w, raw, g1, g2) => p + '% da nota vem dos resultados de ' + n + ' em torneios online' + (s ? ' desde ' + s : '') + (a ? ' (em ' + a + ')' : '') + ': ' + w + ' de vitórias' + (raw ? ' com as partidas desde a coleção mais nova contando três vezes (' + raw + ' em todas as ' + g1 + ' partidas)' : ' em todas as ' + g2 + ' partidas') + '.'],
  [/^over all ([\d,]+) games, against ([\d.]+%) for all decks in these results\.$/, 'en las $1 partidas, contra $2 de todas las barajas en estos resultados.', 'em todas as $1 partidas, contra $2 de todos os decks nestes resultados.'],
  [/^The grade counts games since the newest set three times, which makes it ([\d.]+%)\.$/, 'La calificación cuenta tres veces las partidas desde la expansión más reciente, lo que la deja en $1.', 'A nota conta três vezes as partidas desde a coleção mais nova, o que deixa em $1.'],
  [/^of all ([\d,]+) matches against other decks \((\d+) wins, (\d+) losses, (\d+) ties\)\.$/, 'de las $1 partidas contra otras barajas ($2 victorias, $3 derrotas, $4 empates).', 'de todas as $1 partidas contra outros decks ($2 vitórias, $3 derrotas, $4 empates).'],
  [/^expected\. That is its record against the (\d+) most played decks \((\d+)% of play (?:since (.+)|in these results)\), each counted by how often that deck is played, over ([\d,]+) matches\.$/,
    (m, n, c, s, g) => 'esperado. Es su récord contra las ' + n + ' barajas más jugadas (' + c + '% del juego ' + (s ? 'desde ' + s : 'en estos resultados') + '), cada una contada según cuánto se juega esa baraja, en ' + g + ' partidas.',
    (m, n, c, s, g) => 'esperado. É o retrospecto dele contra os ' + n + ' decks mais jogados (' + c + '% do jogo ' + (s ? 'desde ' + s : 'nestes resultados') + '), cada um contado por quanto esse deck é jogado, em ' + g + ' partidas.'],
  [/^On (.+) results, grades put (\d+) decks in an order that matches their online win rates at ([\d.]+)(?: \(([\d.]+) from the cards alone\))?\.$/,
    (m, s, n, x, y) => 'Con los resultados de ' + s + ', las calificaciones ponen ' + n + ' barajas en un orden que coincide con sus porcentajes de victoria online en ' + x + (y ? ' (' + y + ' solo con las cartas)' : '') + '.',
    (m, s, n, x, y) => 'Nos resultados de ' + s + ', as notas colocam ' + n + ' decks numa ordem que bate com as taxas de vitória online em ' + x + (y ? ' (' + y + ' só com as cartas)' : '') + '.'],
  [/^On (.+) results, grades put (\d+) decks in an order that matches their online win rates at ([\d.]+)(?: \(([\d.]+) from the cards alone\))?\. 1\.0 means exactly the order of their results\.$/,
    (m, s, n, x, y) => 'Con los resultados de ' + s + ', las calificaciones ponen ' + n + ' barajas en un orden que coincide con sus porcentajes de victoria online en ' + x + (y ? ' (' + y + ' solo con las cartas)' : '') + '. 1.0 significa exactamente el orden de sus resultados.',
    (m, s, n, x, y) => 'Nos resultados de ' + s + ', as notas colocam ' + n + ' decks numa ordem que bate com as taxas de vitória online em ' + x + (y ? ' (' + y + ' só com as cartas)' : '') + '. 1.0 significa exatamente a ordem dos resultados.'],
  [/^You own (\d+) of the (\d+) different cards in this list\.$/, 'Tienes $1 de las $2 cartas distintas de esta lista.', 'Você tem $1 das $2 cartas diferentes desta lista.'],
  [/^(\d+) cards have no price and are not counted\.$/, '$1 cartas no tienen precio y no se cuentan.', '$1 cartas não têm preço e não são contadas.'],
  [/^The prices of (\d+) cards could not be read yet, so they are not counted\.$/, 'Todavía no se pudieron leer los precios de $1 cartas, así que no se cuentan.', 'Ainda não foi possível ler os preços de $1 cartas, então elas não são contadas.'],
  [/^You have guessed (\d+) of (\d+)\.$/, 'Respuestas dadas: $1 de $2.', 'Palpites dados: $1 de $2.'],
  [/^Parsed (\d+) unique cards, (\d+) total\.$/, 'Se leyeron $1 cartas distintas, $2 en total.', 'Foram lidas $1 cartas diferentes, $2 no total.'],
  [/^(\d+) cards, ready\.$/, '$1 cartas, todo listo.', '$1 cartas, tudo pronto.'],
  [/^Expected (\d+)\.$/, 'Se esperaban $1.', 'Eram esperadas $1.'],
  [/^(\d+) lines were not read\.$/, 'No se leyeron $1 líneas.', '$1 linhas não foram lidas.'],
  [/^(\d+) cards read\.$/, 'Se leyeron $1 cartas.', '$1 cartas lidas.'],
  [/^Added "(.+)"\. Rename it any time in Edit deck\.$/, 'Se añadió "$1". Puedes cambiarle el nombre cuando quieras en Editar baraja.', '"$1" adicionado. Você pode renomeá-lo quando quiser em Editar deck.'],
  [/^Replace your note for (.+)\?$/, '¿Reemplazar tu nota para $1?', 'Substituir sua nota para $1?'],
  [/^It has (\d+) cards\. A prerelease deck is exactly 40\.$/, 'Tiene $1 cartas. Una baraja de presentación tiene exactamente 40.', 'Ele tem $1 cartas. Um deck de pré-lançamento tem exatamente 40.'],
  [/^TCGplayer market prices in US dollars, from TCGdex, as of (.+?)\.$/,
    (m, d) => 'Precios de mercado de TCGplayer en dólares estadounidenses, de TCGdex, del ' + d + '.',
    (m, d) => 'Preços de mercado do TCGplayer em dólares americanos, do TCGdex, em ' + d + '.'],
  [/^(\$[\d.,]+) each$/, '$1 cada una', '$1 cada'],
  [/^You own (.+)$/, 'Tienes $1', 'Você tem $1'],
  [/^I own (.+)$/, 'Tengo $1', 'Eu tenho $1'],
  [/^(\d+-\d+-\d+), (\d+)(?:st|nd|rd|th) place$/, '$1, $2.º lugar', '$1, $2º lugar'],
  [/^(\d+)(?:st|nd|rd|th) place$/, '$1.º lugar', '$1º lugar'],
  [/^The record from an event you played with this version, graded ([\d.]+)\.$/, 'El récord de un evento que jugaste con esta versión, calificada con $1.', 'O resultado de um evento que você jogou com esta versão, com nota $1.'],
  [/^The record from an event you played with this version, graded ([\d.]+)\. It stays on this device and is never sent anywhere\.$/, 'El récord de un evento que jugaste con esta versión, calificada con $1. Se queda en este dispositivo y nunca se envía a ningún lado.', 'O resultado de um evento que você jogou com esta versão, com nota $1. Fica neste aparelho e nunca é enviado a lugar nenhum.'],
  [/^(Wins|Losses|Ties|Placing): one (less|more)$/,
    (m, l, d) => ({ Wins: 'Victorias', Losses: 'Derrotas', Ties: 'Empates', Placing: 'Posición' })[l] + ': uno ' + (d === 'less' ? 'menos' : 'más'),
    (m, l, d) => ({ Wins: 'Vitórias', Losses: 'Derrotas', Ties: 'Empates', Placing: 'Colocação' })[l] + ': um a ' + (d === 'less' ? 'menos' : 'mais')],
  [/^(.+) is out$/, 'Ya salió $1', '$1 já saiu'],
  [/^In stores since (.+?)\. Results since then count three times in grades, so yours may move this week\.$/, 'En tiendas desde el $1. Los resultados desde entonces cuentan tres veces en las calificaciones, así que la tuya puede moverse esta semana.', 'Nas lojas desde $1. Os resultados desde então contam três vezes nas notas, então a sua pode mudar esta semana.'],
  [/^In stores since (.+?)\.$/, 'En tiendas desde el $1.', 'Nas lojas desde $1.'],
  [/^Results since then count three times in grades, so yours may move this week\.$/, 'Los resultados desde entonces cuentan tres veces en las calificaciones, así que la tuya puede moverse esta semana.', 'Os resultados desde então contam três vezes nas notas, então a sua pode mudar esta semana.'],
  [/^(\d+) of your decks (has|have) cards that are not legal or may rotate\.$/, (m, n, h) => n + ' de tus barajas ' + (h === 'has' ? 'tiene' : 'tienen') + ' cartas que no son legales o pueden rotar.', (m, n, h) => n + ' dos seus decks ' + (h === 'has' ? 'tem' : 'têm') + ' cartas que não são legais ou podem rotacionar.'],
);

// ── 3.0.1: grade history, puzzle line on Home, Odds tab questions, drills, Notes compare ──
Object.assign(I18N_ES, {
  // Grade history
  "Open dots are changes you did not make, like new tournament results.": "Los puntos huecos son cambios que no hiciste tú, como nuevos resultados de torneos.",
  "Where your history starts.": "Aquí empieza tu historial.",
  "You changed card printings or set codes.": "Cambiaste impresiones de cartas o códigos de expansión.",
  "Tournament results also updated.": "También se actualizaron los resultados de torneos.",
  "Your list did not change.": "Tu lista no cambió.",
  "You cleared the deck picked under Against the meta.": "Quitaste la baraja elegida en Contra el meta.",
  "You changed the format.": "Cambiaste el formato.",
  "You set it as a toolbox deck under Main attacker.": "La marcaste como baraja toolbox en Atacante principal.",
  "You set the main attacker back to Auto.": "Volviste a poner el atacante principal en Auto.",
  "A RdyDeck update changed how grades are worked out.": "Una actualización de RdyDeck cambió cómo se calculan las calificaciones.",
  "Some cards are no longer Standard legal.": "Algunas cartas ya no son legales en Estándar.",
  "Every card is Standard legal again.": "Todas las cartas vuelven a ser legales en Estándar.",
  "The card data was read again.": "Se volvieron a leer los datos de las cartas.",
  "Held at this grade until the list is legal.": "Se queda en esta calificación hasta que la lista sea legal.",
  // Puzzle line on Home and the puzzle result
  "Today:": "Hoy:",
  "Today: you looked at the answer": "Hoy: miraste la respuesta",
  "no win": "sin victoria",
  "on your first try": "en tu primer intento",
  "Replay": "Repetir",
  "Your first try is the one that counts.": "Tu primer intento es el que cuenta.",
  "That is the shortest win.": "Es la victoria más corta.",
  "Practice replay: you looked at the answer today.": "Repetición de práctica: hoy miraste la respuesta.",
  "Practice replay: today's result stays no win.": "Repetición de práctica: hoy sigues sin victoria.",
  "You both took your last Prize card at the same time.": "Ambos jugadores tomaron su última carta de Premio a la vez.",
  "That goes to Sudden Death, so it is not a win.": "Eso va a Muerte Súbita, así que no es una victoria.",
  "You have no Pokémon left in play, so your opponent wins.": "No te quedan Pokémon en juego, así que gana tu rival.",
  "Your opponent took their last Prize card first, so they win.": "Tu rival tomó primero su última carta de Premio, así que gana.",
  "The line used a draw, a flip or a card you couldn't see, so it can't count as a sure win.": "La jugada usó un robo, un lanzamiento de moneda o una carta que no podías ver, así que no cuenta como victoria segura.",
  "The line used something RdyDeck can't read yet.": "La jugada usó algo que RdyDeck todavía no sabe leer.",
  "Your turn ended before you took your last Prize card.": "Tu turno terminó antes de que tomaras tu última carta de Premio.",
  // Odds tab: Ask the odds
  "and at least": "y al menos",
  "of each": "de cada una",
  "Games where the prizes hold so many copies that hand and deck cannot make this until you take the right prize.": "Partidas donde los premios tienen tantas copias que la mano y la baraja no pueden cumplir esto hasta que tomes el premio correcto.",
  "Games where the prizes hold so many copies that hand and deck cannot make every line of this question until you take the right prize.": "Partidas donde los premios tienen tantas copias que la mano y la baraja no pueden cumplir cada línea de esta pregunta hasta que tomes el premio correcto.",
  "The same on every turn.": "Es igual en cada turno.",
  "Now": "Ahora",
  "Change cards": "Cambiar cartas",
  "By when": "Para cuándo",
  "Remove this row": "Quitar esta fila",
  "Pick a card": "Elige una carta",
  // Drills
  "Right.": "Correcto.",
  "Prized": "En premios",
  "Prized?": "¿En premios?",
  "all shown": "todas mostradas",
  "No cards read from that list.": "No se leyó ninguna carta de esa lista.",
  "Fewer": "Menos",
  "Goldfish on time": "Goldfish a tiempo",
  // Hand tab: the turn 1 line
  "In hand:": "En la mano:",
  "Every piece is in your hand.": "Tienes todas las piezas en la mano.",
  // Notes: Edit log and Compare lists
  "Line locked in prizes": "Línea atascada en premios",
  "any opening hand": "cualquier mano inicial",
  "same": "igual",
  "printing": "impresión",
  "new printing": "nueva impresión",
  "Since import": "Desde la importación",
  "Since the log started": "Desde que empezó el registro",
  "Since duplicating": "Desde que se duplicó",
  "Compare with the original": "Comparar con la original",
  "Compare with the start": "Comparar con el inicio",
  "Changes made before then were not recorded.": "Los cambios hechos antes no se registraron.",
  "Some cards in this list have no card data on this device yet, so those odds may show a question mark.": "Algunas cartas de esta lista todavía no tienen datos en este dispositivo, así que esas probabilidades pueden mostrar un signo de interrogación.",
  "Some cards in the other list have no card data on this device yet, so those odds may show a question mark.": "Algunas cartas de la otra lista todavía no tienen datos en este dispositivo, así que esas probabilidades pueden mostrar un signo de interrogación.",
});
Object.assign(I18N_PT, {
  // Grade history
  "Open dots are changes you did not make, like new tournament results.": "Os pontos vazados são mudanças que você não fez, como novos resultados de torneios.",
  "Where your history starts.": "Aqui começa seu histórico.",
  "You changed card printings or set codes.": "Você mudou impressões de cartas ou códigos de coleção.",
  "Tournament results also updated.": "Os resultados de torneios também foram atualizados.",
  "Your list did not change.": "Sua lista não mudou.",
  "You cleared the deck picked under Against the meta.": "Você tirou o deck escolhido em Contra o meta.",
  "You changed the format.": "Você mudou o formato.",
  "You set it as a toolbox deck under Main attacker.": "Você marcou como deck toolbox em Atacante principal.",
  "You set the main attacker back to Auto.": "Você voltou o atacante principal para Auto.",
  "A RdyDeck update changed how grades are worked out.": "Uma atualização do RdyDeck mudou como as notas são calculadas.",
  "Some cards are no longer Standard legal.": "Algumas cartas não são mais legais no Padrão.",
  "Every card is Standard legal again.": "Todas as cartas voltaram a ser legais no Padrão.",
  "The card data was read again.": "Os dados das cartas foram lidos de novo.",
  "Held at this grade until the list is legal.": "Fica nesta nota até a lista ser legal.",
  // Puzzle line on Home and the puzzle result
  "Today:": "Hoje:",
  "Today: you looked at the answer": "Hoje: você olhou a resposta",
  "no win": "sem vitória",
  "on your first try": "na primeira tentativa",
  "Replay": "Repetir",
  "Your first try is the one that counts.": "Sua primeira tentativa é a que conta.",
  "That is the shortest win.": "É a vitória mais curta.",
  "Practice replay: you looked at the answer today.": "Repetição de treino: hoje você olhou a resposta.",
  "Practice replay: today's result stays no win.": "Repetição de treino: o resultado de hoje continua sem vitória.",
  "You both took your last Prize card at the same time.": "Vocês dois pegaram a última carta de Prêmio ao mesmo tempo.",
  "That goes to Sudden Death, so it is not a win.": "Isso vai para Morte Súbita, então não é vitória.",
  "You have no Pokémon left in play, so your opponent wins.": "Você não tem mais Pokémon em jogo, então o oponente vence.",
  "Your opponent took their last Prize card first, so they win.": "O oponente pegou a última carta de Prêmio primeiro, então ele vence.",
  "The line used a draw, a flip or a card you couldn't see, so it can't count as a sure win.": "A jogada usou uma compra, uma moeda ou uma carta que você não podia ver, então não conta como vitória certa.",
  "The line used something RdyDeck can't read yet.": "A jogada usou algo que o RdyDeck ainda não sabe ler.",
  "Your turn ended before you took your last Prize card.": "Seu turno acabou antes de você pegar a última carta de Prêmio.",
  // Odds tab: Ask the odds
  "and at least": "e pelo menos",
  "of each": "de cada uma",
  "Games where the prizes hold so many copies that hand and deck cannot make this until you take the right prize.": "Partidas em que os prêmios têm tantas cópias que a mão e o deck não conseguem cumprir isto até você pegar o prêmio certo.",
  "Games where the prizes hold so many copies that hand and deck cannot make every line of this question until you take the right prize.": "Partidas em que os prêmios têm tantas cópias que a mão e o deck não conseguem cumprir cada linha desta pergunta até você pegar o prêmio certo.",
  "The same on every turn.": "É igual em todo turno.",
  "Now": "Agora",
  "Change cards": "Trocar cartas",
  "By when": "Até quando",
  "Remove this row": "Remover esta linha",
  "Pick a card": "Escolha uma carta",
  // Drills
  "Right.": "Certo.",
  "Prized": "Nos prêmios",
  "Prized?": "Nos prêmios?",
  "all shown": "todas mostradas",
  "No cards read from that list.": "Nenhuma carta foi lida dessa lista.",
  "Fewer": "Menos",
  "Goldfish on time": "Goldfish no tempo",
  // Hand tab: the turn 1 line
  "In hand:": "Na mão:",
  "Every piece is in your hand.": "Todas as peças estão na sua mão.",
  // Notes: Edit log and Compare lists
  "Line locked in prizes": "Linha presa nos prêmios",
  "any opening hand": "qualquer mão inicial",
  "same": "igual",
  "printing": "impressão",
  "new printing": "nova impressão",
  "Since import": "Desde a importação",
  "Since the log started": "Desde o início do registro",
  "Since duplicating": "Desde a duplicação",
  "Compare with the original": "Comparar com a original",
  "Compare with the start": "Comparar com o início",
  "Changes made before then were not recorded.": "As mudanças feitas antes disso não foram registradas.",
  "Some cards in this list have no card data on this device yet, so those odds may show a question mark.": "Algumas cartas desta lista ainda não têm dados neste aparelho, então essas chances podem mostrar um ponto de interrogação.",
  "Some cards in the other list have no card data on this device yet, so those odds may show a question mark.": "Algumas cartas da outra lista ainda não têm dados neste aparelho, então essas chances podem mostrar um ponto de interrogação.",
});
// ── 3.0.1: Prices switch, event name and delete, offline grade flags, What's new ──
Object.assign(I18N_ES, {
  "Added: French, German and Italian": "Nuevo: francés, alemán e italiano",
  "Spanish and Portuguese: new set line fixed": "Español y portugués: línea de expansión nueva corregida",
  "Time per guess": "Tiempo por respuesta",
  "Prices": "Precios",
  "Card prices on a deck's Cards tab and in Upgrades. Off hides them and reads none.": "Precios de las cartas en la pestaña Cartas de una baraja y en Mejoras. Si eliges No, se ocultan y no se consulta ningún precio.",
  "Event name": "Nombre del evento",
  "Delete this event record?": "¿Eliminar este resultado del evento?",
  "You are offline. It will be sent when you are back online.": "No tienes conexión. Se enviará cuando vuelvas a estar en línea.",
  "Added: a Prices switch in Settings": "Nuevo: un interruptor de Precios en Ajustes",
  "Added: event name and delete for How did it do?": "Nuevo: nombre del evento y eliminar en ¿Cómo le fue?",
  "Spanish and Portuguese: more of the app translated": "Español y portugués: más partes de la app traducidas",
  "Home grade bug fixed": "Corregido un error de la calificación en Inicio",
  "Changed: a grade flag sent offline goes when you are back online": "Cambio: un aviso de calificación enviado sin conexión se envía al volver a estar en línea",
  // 3.0.2 es audit: English strings with no translation yet.
  "Top two fixes": "Los dos arreglos principales",
  "Looks like": "Se parece a",
  "Closest meta deck:": "Baraja del meta más parecida:",
});
Object.assign(I18N_PT, {
  "Added: French, German and Italian": "Novo: francês, alemão e italiano",
  "Spanish and Portuguese: new set line fixed": "Espanhol e português: linha de coleção nova corrigida",
  "Time per guess": "Tempo por palpite",
  "Prices": "Preços",
  "Card prices on a deck's Cards tab and in Upgrades. Off hides them and reads none.": "Preços das cartas na aba Cartas de um deck e em Melhorias. Em Não, os preços ficam ocultos e nenhum é consultado.",
  "Event name": "Nome do evento",
  "Delete this event record?": "Excluir este resultado do evento?",
  "You are offline. It will be sent when you are back online.": "Você está sem conexão. Será enviado quando você voltar a ficar online.",
  "Added: a Prices switch in Settings": "Novo: uma opção de Preços nas Configurações",
  "Added: event name and delete for How did it do?": "Novo: nome do evento e excluir em Como foi?",
  "Spanish and Portuguese: more of the app translated": "Espanhol e português: mais partes do app traduzidas",
  "Home grade bug fixed": "Erro da nota no Início corrigido",
  "Changed: a grade flag sent offline goes when you are back online": "Mudança: um aviso de nota feito sem conexão é enviado quando você voltar a ficar online",
  // Tournament log text the screen check does not open (Portuguese only for now)
  "Export CSV": "Exportar CSV",
  "Edit match": "Editar partida",
  "No matches logged for this deck yet. Log each round at your next event: who you played, the result and how many prizes each of you took.": "Ainda não há partidas registradas para este deck. Registre cada rodada no seu próximo evento: contra quem jogou, o resultado e quantos prêmios cada um pegou.",
});
I18N_PAT.push(
  [/^(: )?(\d+-\d+-\d+)(?:, (\d+)(?:st|nd|rd|th) place)?\. The grade history stays\.$/,
    (m, c, r, p) => (c || '') + r + (p ? ', ' + p + '.º lugar' : '') + '. El historial de calificaciones se conserva.',
    (m, c, r, p) => (c || '') + r + (p ? ', ' + p + 'º lugar' : '') + '. O histórico de notas continua.'],
);
// A date the app writes with toLocaleDateString in English ("Nov 12", "Oct 8, 2025"), or null.
const I18N_DATE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}(?:, \\d{4})?';
/** "Today, 3:00 PM", "Yesterday, ..." or a date, as the grade history writes them; null for anything else. */
function i18nWhen(w, l) {
  let m = /^(Today|Yesterday), (.+)$/.exec(w);
  if (m) return (m[1] === 'Today' ? (l === 'es' ? 'Hoy, ' : 'Hoje, ') : (l === 'es' ? 'Ayer, ' : 'Ontem, ')) + m[2];
  return new RegExp('^' + I18N_DATE + '$').test(w) ? w : null;
}
/** The puzzle streak words: "3 wins in a row, 4 days in a row". */
function i18nRuns(s, l) {
  return s.replace(/(\d+) wins in a row/g, l === 'es' ? '$1 victorias seguidas' : '$1 vitórias seguidas')
    .replace(/(\d+) days in a row/g, l === 'es' ? '$1 días seguidos' : '$1 dias seguidos');
}
/** True when every name in "A, B and C" (or "A or B") is a card name the app knows. */
function i18nAllCards(s) {
  const c = rdI18n.cardNames;
  return s.split(/, | and | or /).every(x => c.has(rdI18n.norm(x).toLowerCase()));
}
/** "3 solved of 5 played", with the words in the singular for 1. */
function i18nSolved(a, b, l) {
  return l === 'es' ? a + (a === '1' ? ' resuelto de ' : ' resueltos de ') + b + (b === '1' ? ' jugado' : ' jugados')
    : a + (a === '1' ? ' resolvido de ' : ' resolvidos de ') + b + (b === '1' ? ' jogado' : ' jogados');
}
/** A row of Ask the odds: "2 Crispin", "1 of Arven or Iono", "1 each of Arven and Iono". */
function i18nAsk(s, l) {
  const es = l === 'es';
  return s.split(/, and (?=\d)/).map(r => {
    const m = /^(\d+) (each of |of )?(.+)$/.exec(r);
    if (!m) return r;
    const list = m[3].replace(/ or ([^,]+)$/, es ? ' o $1' : ' ou $1').replace(/ and ([^,]+)$/, es ? ' y $1' : ' e $1');
    return m[2] === 'each of ' ? m[1] + (es ? ' de cada una (' : ' de cada uma (') + list + ')' : m[2] ? m[1] + ' de ' + list : m[1] + ' ' + list;
  }).join(es ? ', y ' : ', e ');
}
/** A card group name in the compare table: a Basic Energy says its type in the language, any other name stays. */
function i18nCardOrEnergy(n, l) {
  const m = /^(Basic )?(\w+) Energy$/.exec(n);
  if (!m || !I18N_TYPES[l][m[2]]) return n;
  return i18nEnergy(m[2], l) + (m[1] ? (l === 'es' ? ' Básica' : ' básica') : '');
}
/** pt: a day and short English month with no year ("16 Sep", as the deck builder writes them) as "16 set". */
function i18nDayMonPt(s) {
  return String(s).replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m, d, mo) => d + ' ' + I18N_MON3.pt[I18N_MONTHS.findIndex(x => x.startsWith(mo))]);
}
I18N_PAT.unshift(
  // Home: the puzzle card and the deck tile
  [/^(\d+) solved of (\d+) played(?:, (.+)\.)?$/, (m, a, b, r) => i18nSolved(a, b, 'es') + (r ? ', ' + i18nRuns(r, 'es') + '.' : ''), (m, a, b, r) => i18nSolved(a, b, 'pt') + (r ? ', ' + i18nRuns(r, 'pt') + '.' : '')],
  [/^(\d+) (wins|days) in a row(?:, (\d+) days in a row)?$/, (m, ...x) => i18nRuns(m, 'es'), (m, ...x) => i18nRuns(m, 'pt')],
  [/^in (\d+) plays?$/, (m, n) => 'en ' + n + (n === '1' ? ' jugada' : ' jugadas'), (m, n) => 'em ' + n + (n === '1' ? ' jogada' : ' jogadas')],
  [/^in (\d+) plays?\. (.+)$/, (m, n, r) => 'en ' + n + (n === '1' ? ' jugada' : ' jugadas') + '. ' + i18nRuns(r, 'es'), (m, n, r) => 'em ' + n + (n === '1' ? ' jogada' : ' jogadas') + '. ' + i18nRuns(r, 'pt')],
  [/^(\d+) cards? missing art$/, (m, n) => n + (n === '1' ? ' carta sin imagen' : ' cartas sin imagen'), (m, n) => n + (n === '1' ? ' carta sem imagem' : ' cartas sem imagem')],
  [/^The shortest win takes (\d+)\.$/, 'La victoria más corta toma $1.', 'A vitória mais curta leva $1.'],
  [/^Today's result stays a win in (\d+) plays?\.$/, (m, n) => 'El resultado de hoy sigue siendo una victoria en ' + n + (n === '1' ? ' jugada.' : ' jugadas.'), (m, n) => 'O resultado de hoje continua uma vitória em ' + n + (n === '1' ? ' jogada.' : ' jogadas.')],
  // Grade history
  [/^(Up|Down) ([\d.]+), from ([\d.]+) to ([\d.]+) over (\d+) versions(?:, (\d+) of them your edits)?\.$/,
    (m, d, x, a, b, n, e) => (d === 'Up' ? 'Sube ' : 'Baja ') + x + ', de ' + a + ' a ' + b + ' en ' + n + ' versiones' + (e ? ', ' + e + (e === '1' ? ' de ellas es una edición tuya' : ' de ellas son ediciones tuyas') : '') + '.',
    (m, d, x, a, b, n, e) => (d === 'Up' ? 'Subiu ' : 'Caiu ') + x + ', de ' + a + ' para ' + b + ' em ' + n + ' versões' + (e ? ', ' + e + (e === '1' ? ' delas é edição sua' : ' delas são edições suas') : '') + '.'],
  [/^Holding at ([\d.]+) over (\d+) versions(?:, (\d+) of them your edits)?\.$/,
    (m, g, n, e) => 'Se mantiene en ' + g + ' en ' + n + ' versiones' + (e ? ', ' + e + (e === '1' ? ' de ellas es una edición tuya' : ' de ellas son ediciones tuyas') : '') + '.',
    (m, g, n, e) => 'Estável em ' + g + ' em ' + n + ' versões' + (e ? ', ' + e + (e === '1' ? ' delas é edição sua' : ' delas são edições suas') : '') + '.'],
  [/^Grade over (\d+) versions, from ([\d.]+) to ([\d.]+)$/, 'Calificación en $1 versiones, de $2 a $3', 'Nota em $1 versões, de $2 para $3'],
  [/^You changed the list: (.+?)\.( Tournament results also updated\.)?$/, (m, d, r) => 'Cambiaste la lista: ' + d + '.' + (r ? ' También se actualizaron los resultados de torneos.' : ''), (m, d, r) => 'Você mudou a lista: ' + d + '.' + (r ? ' Os resultados de torneios também foram atualizados.' : '')],
  [/^You set it to compare as (.+) under Against the meta\.$/, (m, n) => 'Elegiste compararla como ' + (n === 'another deck' ? 'otra baraja' : n) + ' en Contra el meta.', (m, n) => 'Você escolheu comparar como ' + (n === 'another deck' ? 'outro deck' : n) + ' em Contra o meta.'],
  [/^You set the main attacker to (.+)\.$/, (m, n) => 'Pusiste como atacante principal a ' + (n === 'another Pokemon' ? 'otro Pokémon' : n) + '.', (m, n) => 'Você definiu o atacante principal como ' + (n === 'another Pokemon' ? 'outro Pokémon' : n) + '.'],
  [/^Tournament results updated(?: \(as of (.+)\))?\.$/, (m, a) => 'Se actualizaron los resultados de torneos' + (a ? ' (hasta el ' + a + ')' : '') + '.', (m, a) => 'Os resultados de torneios foram atualizados' + (a ? ' (em ' + a + ')' : '') + '.'],
  [/^The first version and the newest (\d+) are kept\.$/, 'Se guardan la primera versión y las $1 más recientes.', 'Ficam guardadas a primeira versão e as $1 mais novas.'],
  [/^(.+): (\d+\.\d)$/, (m, w, g) => { const r = i18nWhen(w, 'es'); return r == null ? null : r + ': ' + g; }, (m, w, g) => { const r = i18nWhen(w, 'pt'); return r == null ? null : r + ': ' + g; }],
  [/^((?:Today|Yesterday), .+)$/, (m, w) => i18nWhen(w, 'es'), (m, w) => i18nWhen(w, 'pt')],
  [new RegExp('^(' + I18N_DATE + ')$'), m => m, m => m],
  // Odds tab: Ask the odds
  [/^Chance of at least (.+) (?:by your turn (\d+) \(your first (\d+) cards\)|(in your opening hand))\.$/,
    (m, a, t, f, o) => 'Probabilidad de al menos ' + i18nAsk(a, 'es') + (o ? ' en tu mano inicial.' : ' para tu turno ' + t + ' (tus primeras ' + f + ' cartas).'),
    (m, a, t, f, o) => 'Chance de pelo menos ' + i18nAsk(a, 'pt') + (o ? ' na sua mão inicial.' : ' até o seu turno ' + t + ' (suas primeiras ' + f + ' cartas).')],
  [/^How many (.+)\?$/, '¿Cuántas copias de $1?', 'Quantas cópias de $1?'],
  [/^The same question by (?:turn (\d+)|(opening hand)), with more or fewer copies\.$/,
    (m, t, o) => 'La misma pregunta ' + (o ? 'en la mano inicial' : 'para el turno ' + t) + ', con más o menos copias.',
    (m, t, o) => 'A mesma pergunta ' + (o ? 'na mão inicial' : 'até o turno ' + t) + ', com mais ou menos cópias.'],
  [/^Each copy added replaces a card that is not in the question, so the list stays at (\d+)\.$/, 'Cada copia que agregas reemplaza una carta que no está en la pregunta, así que la lista se queda en $1.', 'Cada cópia adicionada substitui uma carta que não está na pergunta, então a lista continua com $1.'],
  [/^([+−-]?\d+\.\d) pts$/, '$1 pts', '$1 pts'],
  // Drills
  [/^(\d+) rounds?, (\d+)% right$/, (m, n, p) => n + (n === '1' ? ' ronda, ' : ' rondas, ') + p + '% de aciertos', (m, n, p) => n + (n === '1' ? ' rodada, ' : ' rodadas, ') + p + '% de acertos'],
  [/^It is (\d+)\.$/, 'La respuesta es $1.', 'A resposta é $1.'],
  [/^You run (\d+) and have used (\d+)\.$/, 'Llevas $1 en la lista y usaste $2.', 'Você tem $1 na lista e já usou $2.'],
  [/^(\d+) shown$/, '$1 mostradas', '$1 mostradas'],
  [/^(\d+) in deck or hand$/, '$1 en la baraja o la mano', '$1 no deck ou na mão'],
  [/^(\d+) of 6 named$/, '$1 de 6 nombradas', '$1 de 6 escolhidas'],
  [/^you said (\d+)$/, 'dijiste $1', 'você disse $1'],
  [/^(\d+) of 6 prizes read$/, '$1 de 6 premios acertados', '$1 de 6 prêmios acertados'],
  [/^The (\d+) cards still in their deck or hand were (.+)\.$/, 'Las $1 cartas que seguían en su baraja o su mano eran $2.', 'As $1 cartas que ainda estavam no deck ou na mão dele eram $2.'],
  [/^Only (\d+) cards read from that list\.$/, 'Solo se leyeron $1 cartas de esa lista.', 'Só $1 cartas foram lidas dessa lista.'],
  // Hand tab: the turn 1 line ("Stage 2, main attacker, from Dreepy with Rare Candy.")
  [/^(Basic|Stage 1|Stage 2)(?:, (?:(main attacker)|one of (\d+) attackers))?(?:, from (.+) with Rare Candy)?\.$/,
    (m, st, ma, n, f) => ({ Basic: 'Básico', 'Stage 1': 'Fase 1', 'Stage 2': 'Fase 2' })[st] + (ma ? ', atacante principal' : n ? ', uno de ' + n + ' atacantes' : '') + (f ? ', desde ' + f + ' con Rare Candy' : '') + '.',
    (m, st, ma, n, f) => ({ Basic: 'Básico', 'Stage 1': 'Estágio 1', 'Stage 2': 'Estágio 2' })[st] + (ma ? ', atacante principal' : n ? ', um de ' + n + ' atacantes' : '') + (f ? ', a partir de ' + f + ' com Rare Candy' : '') + '.'],
  [/^Still need: (.+)\.$/, (m, x) => 'Falta: ' + x.replace(/ or /g, ' o ') + '.', (m, x) => 'Falta: ' + x.replace(/ or /g, ' ou ') + '.'],
  // Notes: Compare lists and Edit log
  [/^Attacker by T(\d)$/, 'Atacante para T$1', 'Atacante até T$1'],
  [/^All (.+) prized$/, (m, n) => i18nCardOrEnergy(n, 'es') + ': todas en premios', (m, n) => i18nCardOrEnergy(n, 'pt') + ': todas nos prêmios'],
  [/^Version (\d+)$/, 'Versión $1', 'Versão $1'],
  [/^Version (\d+), (.+)$/, 'Versión $1, $2', 'Versão $1, $2'],
  [/^As imported, (.+)$/, 'Al importar, $1', 'Ao importar, $1'],
  [/^When the log started, (.+)$/, 'Al empezar el registro, $1', 'No início do registro, $1'],
  [/^When duplicated, (.+)$/, 'Al duplicar, $1', 'Ao duplicar, $1'],
  [/^The log started (.+)\.$/, 'El registro empezó el $1.', 'O registro começou em $1.'],
  [/^Duplicated(?: from (.+))? (\S+ \S+)\.$/, (m, f, d) => 'Duplicado' + (f ? ' de ' + f : '') + ' el ' + d + '.', (m, f, d) => 'Duplicado' + (f ? ' de ' + f : '') + ' em ' + d + '.'],
  [new RegExp('^(' + I18N_DATE + '), (\\d+) games?$'), (m, d, n) => d + ', ' + n + (n === '1' ? ' partida' : ' partidas'), (m, d, n) => d + ', ' + n + (n === '1' ? ' partida' : ' partidas')],
);
// Pushed last, so every string the patterns above already know keeps its own translation.
I18N_PAT.push(
  [/^Deck: (.+)$/, 'Baraja: $1', 'Deck: $1'],
  // The remove buttons that name cards (Ask the odds rows, prize game guesses), read out by screen readers.
  // Only when every name in it is a known card, so no other "Remove ..." text is half translated.
  [/^Remove (?!a )(.+)$/, (m, n) => i18nAllCards(n) ? 'Quitar ' + n.replace(/ and ([^,]+)$/, ' y $1').replace(/ or ([^,]+)$/, ' o $1') : null,
    (m, n) => i18nAllCards(n) ? 'Remover ' + n.replace(/ and ([^,]+)$/, ' e $1').replace(/ or ([^,]+)$/, ' ou $1') : null],
  // Progress: the List changes and Drills tiles
  [new RegExp('^Last (' + I18N_DATE + '|\\d{1,2}[ ./-]\\S+)(?:, (\\d+)% since vs (\\d+)% before)?$'),
    (m, d, a, b) => 'Último: ' + d + (a ? ', ' + a + '% desde entonces vs ' + b + '% antes' : ''),
    (m, d, a, b) => 'Última: ' + d + (a ? ', ' + a + '% desde então vs ' + b + '% antes' : '')],
  [/^(?:(?:Resource count|Goldfish on time|Reach check) \d+%(?:, |$))+$/,
    m => m.replace(/(Resource count|Goldfish on time|Reach check) (\d+%)/g, (x, n, p) => I18N_ES[n] + ' ' + p),
    m => m.replace(/(Resource count|Goldfish on time|Reach check) (\d+%)/g, (x, n, p) => I18N_PT[n] + ' ' + p)],
);

// Words that are also attack or Ability names on real cards ("Skip", "Psychic"). They are
// translated only inside the elements named here, which never show card data.
const I18N_SCOPED = {
  'Skip': ['.tour-skip, button[onclick^="gfSkip"]', 'Saltar', 'Pular'],
  // 3.1: the card details label is the noun (Retreat Cost), not the practice button's verb.
  'Retreat': ['.cd31-l', 'Retirada', 'Recuo'],
  'Psychic': ['.energy-quick-btn, .mt-en', 'Psíquica', 'Psíquico'],
  // 3.0.1: short words that are also deck or card names ("Other" is an archetype in the results), or
  // too short to be safe everywhere. Compare lists headers and the Edit log chip notes only.
  'This': ['.cmp-t th', 'Esta', 'Esta'],
  'Other': ['.cmp-t th', 'Otra', 'Outra'],
  'new': ['.el-chip small', 'nueva', 'nova'],
  'cut': ['.el-chip small', 'fuera', 'removida'],
  // Ask the odds By selector and its table: Open means the opening hand, not the verb.
  'Open': ['.ol-turn .mode-opt, .ol-tt th', 'Mano', 'Mão'],
  // 3.0.2: rotation counts. The dictionary has the plural; a count of 1 is marked "one" and gets the singular.
  'not legal now': ['.r29-c.one span, .r29-one', 'no legal ahora', 'não legal agora'],
  'may rotate': ['.r29-c.one span, .r29-one', 'podría rotar', 'pode rotacionar'],
  'rotate next': ['.r29-c.one span, .r29-one', 'rota en la próxima', 'rotaciona na próxima'],
  'not confirmed': ['.r29-c.one span, .r29-one', null, 'não confirmada'],
  'safe': ['.r29-c.one span', 'segura', 'segura'],
  // Matchups: "Deck won 48% of all 1,597 matches" needs the past tense in German, not the participle.
  'won': ['.mu60-p', null, null],
  // 3.0.2 es audit: deck tabs are about 52 px wide at 360 px, so the Spanish tab labels are short words.
  // Elsewhere the long words stay. A null column falls back to the dictionary.
  'Grade': ['.rv-tab', 'Nota', null],
  'Odds': ['.rv-tab', 'Probab.', null],
  'Drills': ['.rv-tab', 'Entreno', null],
  // 3.0.2 audit: the win, loss and tie buttons when logging a match show one letter each.
  'W': ['.tl-seg .mode-opt', 'V', 'V'],
  'L': ['.tl-seg .mode-opt', 'D', 'D'],
  'T': ['.tl-seg .mode-opt', 'E', 'E'],
  // Discard is a button (the verb) and, under the play mat, the pile (the noun).
  'Discard': ['.mt-pile span', 'Descarte', 'Descarte'],
};

const I18N_TYPES = {
  es: { Grass: 'Planta', Fire: 'Fuego', Water: 'Agua', Lightning: 'Rayo', Psychic: 'Psíquica', Fighting: 'Lucha', Darkness: 'Oscura', Metal: 'Metálica', Dragon: 'Dragón', Colorless: 'Incolora', Fairy: 'Hada' },
  pt: { Grass: 'Planta', Fire: 'Fogo', Water: 'Água', Lightning: 'Raio', Psychic: 'Psíquica', Fighting: 'Luta', Darkness: 'Escuridão', Metal: 'Metal', Dragon: 'Dragão', Colorless: 'Incolor', Fairy: 'Fada' },
};
/** "Fire and Lightning Energy" (n of them) as "Energía Fuego y Rayo". */
function i18nEnergy(w, l, n) {
  const many = n != null && +n !== 1;
  // The types that are adjectives agree with "Energías": Energías Psíquicas, Energias Incolores.
  const ts = String(w).replace(/ Energy$/, '').split(/ and |, /).map(t => I18N_TYPES[l][t] || t).map(t => !many ? t : l === 'es' ? t.replace(/^(Psíquica|Oscura|Metálica|Incolora)$/, '$1s') : t.replace(/^Psíquica$/, 'Psíquicas').replace(/^Incolor$/, 'Incolores'));
  const and = l === 'es' ? ' y ' : ' e ';
  return (l === 'es' ? (many ? 'Energías ' : 'Energía ') : (many ? 'Energias ' : 'Energia ')) + (ts.length > 1 ? ts.slice(0, -1).join(', ') + and + ts[ts.length - 1] : ts[0]);
}

// 3.2.7: the Abilities part of How it plays ("Ludicolo's Vibrant Dance: gives each of your Pokemon in play
// 40 more HP."). gAbilRead builds each phrase from a small set of English shapes, so it is read back
// into parts here and said again in each language from that language's own words (I18N_ABIL.es and .pt
// below, I18N_MORE[lang].abil in the other files). A phrase with any part this cannot read gives null,
// and the paragraph stays in English as before rather than coming out half translated.
const I18N_AB_TY = 'Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy';
const I18N_AB_WHEN = { 'when you play it onto your Bench': 'bench', 'when you evolve into it from your hand': 'evolve', 'on your first turn': 'first',
  'as often as you like': 'many', 'once a turn while it is Active': 'onceActive', 'once a turn': 'once', 'while it is Active': 'active', 'when it is Knocked Out': 'ko' };
/** "a Basic Water Energy", "up to 3 Flamigo cards", "an Erika's Pokemon" as parts: q (one, n, upto, anyNum, any), n, k (kind) and its words. */
function i18nAbNp(w) {
  w = String(w).trim();
  let m;
  if (/^any card$/.test(w)) return { q: 'any', n: 1, k: 'card' };
  if ((m = w.match(/^(an? .+?), (an? .+?),? or 1 of each$/))) { const a = i18nAbNp(m[1]), b = i18nAbNp(m[2]); return a && b ? { q: 'one', n: 1, k: 'each', a, b } : null; }
  if ((m = w.match(/^(an? .+?) or (an? .+)$/))) { const a = i18nAbNp(m[1]), b = i18nAbNp(m[2]); return a && b ? { q: 'one', n: 1, k: 'or', a, b } : null; }
  let q = 'one', n = 1;
  if ((m = w.match(/^(an?|\d+|up to \d+|any number of) (.+)$/))) {
    w = m[2];
    if (/^an?$/.test(m[1])) q = 'one';
    else if (/^up to /.test(m[1])) { q = 'upto'; n = +m[1].slice(6); }
    else if (m[1] === 'any number of') { q = 'anyNum'; n = 99; }
    else { n = +m[1]; q = n === 1 ? 'one' : 'n'; }
  } else q = 'bare';
  return Object.assign({ q, n }, i18nAbHead(w));
}
/** The noun of a phrase part: Energy, a card kind, a kind of Pokemon, or a card name. */
function i18nAbHead(w) {
  let m;
  if ((m = w.match(new RegExp('^(?:(Basic) )?(?:(' + I18N_AB_TY + ') )?Energy$')))) return { k: 'energy', basic: !!m[1], ty: m[2] || '' };
  if (/^cards?$/.test(w)) return { k: 'card' };
  if ((m = w.match(/^(Supporter|Trainer|Stadium|Pokemon Tool|Item)s?$/))) return { k: m[1] === 'Pokemon Tool' ? 'tool' : m[1].toLowerCase() };
  if ((m = w.match(/^Pokemon that have "([^"]+)" in their name$/))) return { k: 'named', name: m[1] };
  if ((m = w.match(new RegExp("^(?:(Evolution|Basic|Future|Ancient) )?(?:((?:Team Rocket|[A-Z][a-z]+)'s) )?(?:(" + I18N_AB_TY + ') )?Pokemon$'))))
    return { k: 'pk', stage: m[1] || '', owner: m[2] ? m[2].replace(/'s$/, '') : '', ty: m[3] || '' };
  if ((m = w.match(/^([A-Z][\w'.:-]*(?: [\w'.:-]+)*) cards?$/)) && !/ (?:and|or|then|your|the) /.test(m[1])) return { k: 'cardName', name: m[1] };
  if (/^[A-Z][\w'.:-]*(?: [\w'.:-]+)*$/.test(w) && !/ (?:and|or|of|then|your|the) /.test(w)) return { k: 'name', name: w };
  return { k: '?' };
}
/** "Grass Pokemon and Fire Pokemon", "Cynthia's Pokemon" or "Marowak": whose attacks or HP an Ability changes. */
function i18nAbGroup(w) {
  const m = w.match(/^(.+?) and (.+)$/);
  if (m) { const a = i18nAbGroup(m[1]), b = i18nAbGroup(m[2]); return a && b ? { k: 'and', a, b } : null; }
  const h = i18nAbHead(w);
  return h.k === 'pk' || h.k === 'name' ? Object.assign({ q: 'all', n: 2 }, h) : null;
}
function i18nAbOk(x) {
  if (!x || x.k === '?') return false;
  return ['a', 'b', 'np', 'to', 'grp'].every(f => x[f] == null || typeof x[f] !== 'object' || i18nAbOk(x[f]));
}
/** One act of a phrase: what the Ability does, with its parts. */
function i18nAbAct(s) {
  let m;
  s = s.replace(/^(draw|put|discard|search|attach|move)\b/, '$1s').replace(/^make your /, 'your ');
  if ((m = s.match(/^draws (a card|\d+ cards?)$/))) return { t: 'draw', n: m[1] === 'a card' ? 1 : parseInt(m[1], 10) };
  if ((m = s.match(/^draws until you have (\d+) cards in hand$/))) return { t: 'drawTo', n: +m[1] };
  if ((m = s.match(/^discards your hand and draws (\d+) cards$/))) return { t: 'handDraw', n: +m[1] };
  if (s === 'searches your deck for a Pokemon Tool and attaches it to itself') return { t: 'search', np: i18nAbNp('a Pokemon Tool'), to: 'self' };
  if ((m = s.match(/^searches your deck for (.+?)(?: and attaches (?:it|them) to (itself|your Pokemon))?$/))) {
    let w = m[1], bench = false;
    if (/ for your Bench$/.test(w)) { bench = true; w = w.slice(0, -14); }
    return { t: 'search', np: i18nAbNp(w), bench, to: m[2] ? (m[2] === 'itself' ? 'self' : 'pk') : '' }; }
  if ((m = s.match(/^looks at the top (\d+) cards(?: of your deck)? and puts (\d+) into your hand$/))) return { t: 'lookPut', n: +m[1], k: +m[2] };
  if ((m = s.match(/^looks at the top (\d+) cards(?: of your deck)? for (.+)$/))) return { t: 'lookFor', n: +m[1], np: i18nAbNp(m[2]) };
  if (s === 'attaches extra Energy') return { t: 'extraEnergy' };
  if ((m = s.match(/^attaches (.+?) from (your hand|your discard pile|the top (\d+) cards of your deck)(?: to (.+))?$/)) || (m = s.match(/^attaches (.+?)()()(?: to (.+))?$/))) {
    const to = !m[4] ? '' : m[4] === 'itself' ? 'self' : m[4] === 'your Pokemon' ? 'pk' : i18nAbNp(m[4]);
    return { t: 'attach', np: i18nAbNp(m[1]), from: !m[2] ? '' : m[3] ? 'top' : m[2] === 'your hand' ? 'hand' : 'discard', top: m[3] ? +m[3] : 0, to }; }
  if (s === "pulls 1 of your opponent's Benched Pokemon into the Active Spot") return { t: 'gust' };
  if (s === 'switches itself into the Active Spot') return { t: 'switchIn' };
  if (s === 'switches itself into or out of the Active Spot') return { t: 'switchInOut' };
  if (s === 'switches itself out to your Bench') return { t: 'switchOut' };
  // 3.2.8: an Ability that puts the Pokemon itself onto your Bench from your discard pile (Empoleon's Emergency Surfacing).
  if (s === 'puts itself onto your Bench from your discard pile') return { t: 'selfBench' };
  if (s === 'switches in a Benched Pokemon') return { t: 'switchBench', np: null };
  if ((m = s.match(/^switches an? Benched (.+) into the Active Spot$/))) return { t: 'switchBench', np: i18nAbNp('a ' + m[1]) };
  if (s === 'moves any amount of Energy from your other Pokemon onto it') return { t: 'moveToSelf' };
  if (s === 'moves Energy from your Bench to your Active Pokemon') return { t: 'moveBench' };
  if ((m = s.match(/^moves (up to )?(\d+) damage counters from your Pokemon to your opponent's$/))) return { t: 'moveCounters', n: +m[2], upto: !!m[1] };
  if (s === 'moves damage counters') return { t: 'moveCounters', n: 0 };
  if (s === 'discards a Stadium in play') return { t: 'discardStadium' };
  if (s === "discards Energy from your opponent's Pokemon") return { t: 'energyDenial' };
  if (s === "disrupts your opponent's hand") return { t: 'disrupt' };
  if (s === 'puts any card from your deck on top of it') return { t: 'stack' };
  if ((m = s.match(/^puts (\d+) damage counters? on (1 of|each of (\d+) of|each of) your opponent's (Benched )?Pokemon$/))) return { t: 'counters', n: +m[1], on: m[2] === '1 of' ? 'one' : m[3] ? 'eachOf' : 'each', k: m[3] ? +m[3] : 0, bench: !!m[4] };
  if ((m = s.match(/^puts (\d+) damage counters? on your opponent's (Benched )?Pokemon in any way you like$/))) return { t: 'counters', n: +m[1], on: 'any', bench: !!m[2] };
  if ((m = s.match(/^puts (?:a damage counter|(\d+) damage counters?) on each Pokemon (with an Ability|in play)( every Pokemon Checkup)?$/))) return { t: 'countersAll', n: m[1] ? +m[1] : 1, abil: /Ability/.test(m[2]), checkup: !!m[3] };
  if ((m = s.match(/^your (.+) do (\d+) more damage$/))) return { t: 'boost', grp: i18nAbGroup(m[1]), n: +m[2] };
  if ((m = s.match(/^gives each of your (.+?) in play (\d+) more HP$/))) return { t: 'hp', grp: i18nAbGroup(m[1]), n: +m[2] };
  if ((m = s.match(new RegExp("^makes each of your (.+?)(?: with (" + I18N_AB_TY + ") Energy attached)? take (\\d+) less damage from your opponent's attacks$"))))
    return { t: 'reduce', grp: i18nAbGroup(m[1]), ty: m[2] || '', n: +m[3] };
  if (s === 'turns off the Abilities of every Pokemon with a Rule Box on both sides') return { t: 'lockRule' };
  if (s === "turns off your opponent's Abilities") return { t: 'lockOpp' };
  if (s === 'turns off Abilities for both players') return { t: 'lockAll' };
  if (s === 'stops your opponent playing Items') return { t: 'itemLock' };
  if (s === 'stops your opponent playing ACE SPEC cards') return { t: 'aceLock' };
  if (s === 'your Basic Pokemon have no Retreat Cost, so you can switch attackers for free') return { t: 'noRetreat' };
  if ((m = s.match(new RegExp("^your opponent's (" + I18N_AB_TY + ") Pokemon become weak to (" + I18N_AB_TY + '), so your \\2 attackers do double damage to them$'))))
    return { t: 'weak', vs: m[1], ty: m[2] };
  if (s === 'evolves a Pokemon straight from your deck') return { t: 'evolveDeck' };
  return null;
}
/** A condition in brackets, as gAbilRead and geEffects write them. */
function i18nAbCond(c) {
  let m;
  if ((m = c.match(/^needs (.+) in play$/))) return { k: 'needPlay', names: m[1] };
  if ((m = c.match(new RegExp('^needs (' + I18N_AB_TY + ') Energy attached to it$')))) return { k: 'needEnergy', ty: m[1] };
  if (c === 'needs a Pokemon Tool attached to it') return { k: 'needTool' };
  if (c === 'only after one of your Pokemon was Knocked Out' || c === "only if any of your Pokemon were Knocked Out during your opponent's last turn") return { k: 'afterKo' };
  if (c === 'only when it is damaged while Active') return { k: 'hurtActive' };
  if (c === 'only if it has any Energy attached') return { k: 'hasEnergy' };
  if (c === 'only if it is on your Bench') return { k: 'onBench' };
  if (c === 'only if you have no cards in your hand') return { k: 'emptyHand' };
  if ((m = c.match(/^only if you played (.+) from your hand this turn$/))) return { k: 'played', names: m[1] };
  if ((m = c.match(/^only if you have (.+) in play$/))) return { k: 'havePlay', names: m[1] };
  if ((m = c.match(/^only if your opponent has (\d+) or fewer Prize cards remaining$/))) return { k: 'prizes', n: +m[1] };
  if ((m = c.match(/^only if its remaining HP is (\d+) or less$/))) return { k: 'lowHp', n: +m[1] };
  if ((m = c.match(/^only if your Active Pokemon has the (.+) Ability$/))) return { k: 'activeHas', name: m[1] };
  return null;
}
/** A whole phrase as { cost, acts, when, cond }, or null when any part of it is not one of the known shapes. */
function i18nAbParse(p) {
  let s = String(p).trim(), m, cond = null, when = '', cost = null;
  if ((m = s.match(/ \(((?:needs|only) [^()]+)\)$/))) { cond = i18nAbCond(m[1]); if (!cond) return null; s = s.slice(0, m.index); }
  for (const w of Object.keys(I18N_AB_WHEN)) if (s.endsWith(' ' + w)) { when = I18N_AB_WHEN[w]; s = s.slice(0, -w.length - 1); break; }
  if (cond && cond.k === 'hurtActive' && !when) when = '';
  if ((m = s.match(/^discards (.+?) from (your hand|itself) to (.+)$/))) { cost = { np: i18nAbNp(m[1]), from: m[2] === 'itself' ? 'self' : 'hand' }; s = m[3]; if (!i18nAbOk(cost.np)) return null; }
  let acts = null;
  const one = /, then | and (?:then )?(?:draws|moves) /.test(s) ? null : i18nAbAct(s);
  if (one && i18nAbOk(one)) acts = [one];
  else {
    // Two acts: "attaches ... to itself, then draws a card", "attaches ... and draws 2 cards", "switches itself ... and moves ...".
    const cut = s.match(/^(.+?)(, then | and )((?:draws|moves|then draws) .+)$/) || s.match(/^(.+?)(, and )(.+)$/);
    if (cut) { const a = i18nAbAct(cut[1]), b = i18nAbAct(cut[3].replace(/^then /, '')); if (a && b) acts = [a, Object.assign(b, { then: cut[2] === ', then ' })]; }
  }
  if (!acts || !acts.every(i18nAbOk)) return null;
  return { cost, acts, when, cond };
}
/** One Abilities sentence ("Owner's Abil: phrase." with the weakness tail) in a language; null when it cannot be read. */
function i18nAbilSent(s, l) {
  const L = l === 'es' || l === 'pt' ? I18N_ABIL[l] : (i18nMore(l) || {}).abil;
  if (!L) return null;
  const m0 = String(s).match(/^(.+?'s .+?): (.+?)\.?$/);
  // 3.2.8: one sentence only; a sentence after it ("It does nothing in this list.") is translated on its own.
  if (!m0 || /[a-z0-9)][.!?] [A-Z]/.test(m0[2])) return null;
  // Owner and Ability: the owner is a card name the app knows when there is one ("Team Rocket's Spidops"), else the text up to the first "'s ".
  const head = m0[1], cuts = [];
  for (let i = head.indexOf("'s "); i > 0; i = head.indexOf("'s ", i + 1)) cuts.push(i);
  if (!cuts.length) return null;
  let at = cuts[0];
  const names = typeof rdI18n === 'object' && rdI18n.cardNames;
  if (names) { const k = cuts.find(i => names.has(head.slice(0, i).toLowerCase())); if (k != null) at = k; }
  const owner = head.slice(0, at), abil = head.slice(at + 3);
  let p = m0[2], tail = null, m;
  if ((m = p.match(/ \(([^()]+) in this list\)$/))) { tail = { k: 'in', names: m[1] }; p = p.slice(0, m.index); }
  else if ((m = p.match(new RegExp(', though no (' + I18N_AB_TY + ') attacker is in this list$')))) { tail = { k: 'none', ty: m[1] }; p = p.slice(0, m.index); }
  const parts = [];
  for (const q of p.split(/, and (?=your |makes |gives |turns |stops )/)) { const x = i18nAbParse(q); if (!x) return null; parts.push(x); }
  let body;
  try { body = parts.map(x => i18nAbSay(x, L)).join(L.and2); } catch (e) { return null; }
  if (body == null || /\b(?:undefined|null|NaN)\b/.test(body)) return null;
  if (tail) body += tail.k === 'in' ? L.tailIn(tail.names) : L.tailNone(tail.ty);
  const out = L.sent(owner, abil, body);
  return /\.$/.test(out) ? out : out + '.';
}
/** A read phrase said in a language: its cost, acts, when and condition. */
function i18nAbSay(x, L) {
  const acts = x.acts.map((a, i) => { const f = L.act[a.t]; if (!f) throw 0; return f(a, x.cost ? 'inf' : 'fin', i, x); });
  return L.say(x, acts);
}
// The Spanish and Portuguese words for the Abilities part. Each act gives the verb as said by the card
// ('fin', "roba 2 cartas") or after a cost ('inf', "descarta ... para robar 2 cartas").
const I18N_AB_TYP = {
  es: { Grass: 'Planta', Fire: 'Fuego', Water: 'Agua', Lightning: 'Rayo', Psychic: 'Psíquico', Fighting: 'Lucha', Darkness: 'Oscuridad', Metal: 'Metal', Dragon: 'Dragón', Colorless: 'Incoloro', Fairy: 'Hada' },
  pt: { Grass: 'Planta', Fire: 'Fogo', Water: 'Água', Lightning: 'Raio', Psychic: 'Psíquico', Fighting: 'Luta', Darkness: 'Escuridão', Metal: 'Metal', Dragon: 'Dragão', Colorless: 'Incolor', Fairy: 'Fada' },
};
/** "Solrock", "Articuno and Zapdos" with the language's own "and". */
function i18nAbNames(s, and) { return String(s).replace(/,? and (?=[^,]+$)/, and); }
function i18nAbRom(l) {
  const es = l === 'es', T = I18N_AB_TYP[l];
  const V = (mood, fin, inf) => mood === 'fin' ? fin : inf;
  // A noun with its gender: g 'f' or 'm'.
  const noun = (x, pl) => {
    const E = (ty, many) => ty ? i18nEnergy(ty, l, many ? 2 : 1) : es ? (many ? 'Energías' : 'Energía') : (many ? 'Energias' : 'Energia');
    switch (x.k) {
      case 'energy': return { g: 'f', w: E(x.ty, pl) + (x.basic ? (pl ? ' Básicas' : ' Básica') : '') };
      case 'card': return { g: 'f', w: pl ? 'cartas' : 'carta' };
      case 'supporter': return es ? { g: 'm', w: pl ? 'Partidarios' : 'Partidario' } : { g: 'm', w: pl ? 'Apoiadores' : 'Apoiador' };
      case 'trainer': return { g: 'f', w: (pl ? 'cartas' : 'carta') + (es ? ' de Entrenador' : ' de Treinador') };
      case 'stadium': return { g: 'm', w: (es ? 'Estadio' : 'Estádio') + (pl ? 's' : '') };
      case 'tool': return { g: 'f', w: es ? (pl ? 'Herramientas Pokémon' : 'Herramienta Pokémon') : (pl ? 'Ferramentas Pokémon' : 'Ferramenta Pokémon') };
      case 'item': return es ? { g: 'm', w: pl ? 'Objetos' : 'Objeto' } : { g: 'm', w: pl ? 'Itens' : 'Item' };
      case 'named': return { g: 'm', w: `Pokémon ${es ? 'con' : 'com'} "${x.name}" ${es ? 'en su nombre' : 'no nome'}` };
      case 'cardName': return { g: 'f', w: (pl ? 'cartas ' : 'carta ') + x.name };
      case 'name': return { g: 'm', w: x.name };
      case 'pk': {
        const st = { Basic: es ? (pl ? 'Básicos' : 'Básico') : (pl ? 'Básicos' : 'Básico'), Evolution: es ? 'Evolución' : 'de Evolução', Future: 'Futuro', Ancient: es ? 'Antiguo' : 'Antigo' }[x.stage];
        const own = !x.owner ? '' : x.owner === 'Team Rocket' ? (es ? ' del Team Rocket' : ' do Team Rocket') : ' de ' + x.owner;
        return { g: 'm', w: 'Pokémon' + (st ? ' ' + st : '') + (x.ty ? (es ? ' de tipo ' : ' do tipo ') + T[x.ty] : '') + own };
      }
    }
    throw 0;
  };
  const art = g => es ? (g === 'f' ? 'una' : 'un') : (g === 'f' ? 'uma' : 'um');
  const np = x => {
    if (x.k === 'or') return np(x.a) + (es ? ' o ' : ' ou ') + np(x.b);
    if (x.k === 'each') return np(x.a) + ', ' + np(x.b) + (es ? ' o una de cada' : ' ou uma de cada');
    if (x.q === 'any') return es ? 'cualquier carta' : 'qualquer carta';
    if (x.q === 'one') { const z = noun(x, false); return art(z.g) + ' ' + z.w; }
    if (x.q === 'n') return x.n + ' ' + noun(x, true).w;
    if (x.q === 'upto') return (es ? 'hasta ' : 'até ') + x.n + ' ' + noun(x, x.n > 1).w;
    if (x.q === 'anyNum') return (es ? 'cualquier cantidad de ' : 'qualquer quantidade de ') + noun(x, false).w;
    return noun(x, false).w;
  };
  // "it" or "them" for what was just found: lo, la, los, las.
  const pro = x => { const g = x.k === 'each' || x.k === 'or' ? noun(x.a, false).g : noun(x, false).g, pl = x.k === 'each' || (x.q !== 'one' && x.q !== 'any');
    return es ? (g === 'f' ? 'la' : 'lo') + (pl ? 's' : '') : (g === 'f' ? 'a' : 'o') + (pl ? 's' : ''); };
  // pt: "colocá-lo", "ligá-las".
  const ptInf = (v, p) => v.replace(/ar$/, 'á').replace(/er$/, 'ê').replace(/ir$/, 'i') + '-l' + p;
  const cl = (mood, x, fin, inf, rest) => mood === 'fin' ? `${pro(x)} ${fin}${rest}` : es ? `${inf}${pro(x)}${rest}` : ptInf(inf, pro(x)) + rest;
  const grp = (x, pl) => {
    if (x.k === 'and') { const a = grp(x.a), b = grp(x.b);
      return x.a.k === 'pk' && x.b.k === 'pk' && !x.a.stage && !x.b.stage && !x.a.owner && !x.b.owner && x.a.ty && x.b.ty ? a + (es ? ' y de tipo ' : ' e do tipo ') + T[x.b.ty] : a + (es ? ' y ' : ' e ') + b; }
    return noun(x, true).w;
  };
  const tus = es ? 'tus ' : 'seus ', opp = es ? 'de tu rival' : 'do oponente';
  const dc = n => es ? (n === 1 ? '1 contador de daño' : n + ' contadores de daño') : (n === 1 ? '1 contador de dano' : n + ' contadores de dano');
  const self = es ? ' a este Pokémon' : ' a este Pokémon';
  const act = {
    draw: (a, m) => V(m, es ? 'roba' : 'compra', es ? 'robar' : 'comprar') + ' ' + (a.n === 1 ? (es ? 'una carta' : 'uma carta') : a.n + ' cartas'),
    drawTo: (a, m) => V(m, es ? 'roba' : 'compra', es ? 'robar' : 'comprar') + (es ? ` hasta tener ${a.n} cartas en la mano` : ` até ter ${a.n} cartas na mão`),
    handDraw: (a, m) => V(m, es ? 'descarta tu mano y roba' : 'descarta a sua mão e compra', es ? 'descartar tu mano y robar' : 'descartar a sua mão e comprar') + ` ${a.n} cartas`,
    search: (a, m) => (es ? V(m, 'busca', 'buscar') + ' en tu baraja ' + np(a.np) : V(m, 'procura', 'procurar') + (np(a.np).length > 32 ? ' no seu deck ' + np(a.np) : ' ' + np(a.np) + ' no seu deck'))
      + (a.bench ? (es ? ' y ' : ' e ') + cl(m, a.np, es ? 'pone' : 'coloca', es ? 'poner' : 'colocar', es ? ' en tu Banca' : ' no seu Banco') : '')
      + (a.to ? (es ? ' y ' : ' e ') + cl(m, a.np, es ? 'une' : 'liga', es ? 'unir' : 'ligar', a.to === 'self' ? self : es ? ' a tus Pokémon' : ' aos seus Pokémon') : ''),
    lookPut: (a, m) => es ? V(m, 'mira', 'mirar') + ` las ${a.n} primeras cartas de tu baraja y ` + V(m, 'pone', 'poner') + ` ${a.k === 1 ? 'una' : a.k} en tu mano`
      : V(m, 'olha', 'olhar') + ` as ${a.n} cartas de cima do seu deck e ` + V(m, 'coloca', 'colocar') + ` ${a.k === 1 ? 'uma' : a.k} na mão`,
    lookFor: (a, m) => es ? V(m, 'mira', 'mirar') + ` las ${a.n} primeras cartas de tu baraja en busca de ${np(a.np)}` : V(m, 'olha', 'olhar') + ` as ${a.n} cartas de cima do seu deck em busca de ${np(a.np)}`,
    attach: (a, m) => V(m, es ? 'une' : 'liga', es ? 'unir' : 'ligar') + ' ' + np(a.np)
      + (a.from === 'hand' ? (es ? ' de tu mano' : ' da sua mão') : a.from === 'discard' ? (es ? ' de tu pila de descartes' : ' da sua pilha de descarte') : a.from === 'top' ? (es ? ` de entre las ${a.top} primeras cartas de tu baraja` : ` das ${a.top} cartas de cima do seu deck`) : '')
      + (a.to === 'self' ? self : a.to === 'pk' ? (es ? ' a tus Pokémon' : ' aos seus Pokémon') : a.to ? ' a ' + np(a.to) : ''),
    extraEnergy: (a, m) => V(m, es ? 'une' : 'liga', es ? 'unir' : 'ligar') + (es ? ' Energía adicional' : ' Energia extra'),
    gust: (a, m) => es ? V(m, 'lleva', 'llevar') + ' al Puesto Activo 1 de los Pokémon en Banca de tu rival' : V(m, 'traz', 'trazer') + ' 1 dos Pokémon no Banco do oponente para o Campo Ativo',
    switchIn: (a, m) => es ? V(m, 'pasa', 'pasar') + ' al Puesto Activo' : V(m, 'vai', 'ir') + ' para o Campo Ativo',
    switchInOut: (a, m) => es ? V(m, 'entra o sale', 'entrar o salir') + ' del Puesto Activo' : V(m, 'entra ou sai', 'entrar ou sair') + ' do Campo Ativo',
    switchOut: (a, m) => es ? V(m, 'vuelve', 'volver') + ' a tu Banca' : V(m, 'volta', 'voltar') + ' para o seu Banco',
    selfBench: (a, m) => es ? V(m, 'se pone', 'ponerse') + ' en tu Banca desde tu pila de descartes' : V(m, 'se coloca', 'se colocar') + ' no seu Banco a partir da sua pilha de descarte',
    switchBench: (a, m) => es ? V(m, 'pasa', 'pasar') + ' ' + (a.np ? np(a.np) : 'un Pokémon') + ' de tu Banca al Puesto Activo' : V(m, 'coloca', 'colocar') + ' ' + (a.np ? np(a.np) : 'um Pokémon') + ' do seu Banco no Campo Ativo',
    moveToSelf: (a, m) => es ? V(m, 'mueve', 'mover') + ' a este Pokémon cualquier cantidad de Energía de tus otros Pokémon' : V(m, 'move', 'mover') + ' para este Pokémon qualquer quantidade de Energia dos seus outros Pokémon',
    moveBench: (a, m) => es ? V(m, 'mueve', 'mover') + ' Energía de tu Banca a tu Pokémon Activo' : V(m, 'move', 'mover') + ' Energia do seu Banco para o seu Pokémon Ativo',
    moveCounters: (a, m) => V(m, es ? 'mueve' : 'move', 'mover') + (a.n ? (es ? ` ${a.upto ? 'hasta ' : ''}${dc(a.n)} de tus Pokémon a los de tu rival` : ` ${a.upto ? 'até ' : ''}${dc(a.n)} dos seus Pokémon para os do oponente`) : es ? ' contadores de daño' : ' contadores de dano'),
    discardStadium: (a, m) => V(m, 'descarta', 'descartar') + (es ? ' un Estadio en juego' : ' um Estádio em jogo'),
    energyDenial: (a, m) => V(m, 'descarta', 'descartar') + (es ? ' Energía de los Pokémon de tu rival' : ' Energia dos Pokémon do oponente'),
    disrupt: (a, m) => es ? V(m, 'interfiere con', 'interferir con') + ' la mano de tu rival' : V(m, 'atrapalha', 'atrapalhar') + ' a mão do oponente',
    stack: (a, m) => es ? V(m, 'pone', 'poner') + ' cualquier carta de tu baraja encima de tu baraja' : V(m, 'coloca', 'colocar') + ' qualquer carta do seu deck no topo do deck',
    counters: (a, m) => {
      const who = 'Pokémon ' + (a.bench ? (es ? 'en Banca ' : 'no Banco ') : '') + opp;
      const on = a.on === 'one' ? (es ? 'en 1 de los ' : 'em 1 dos ') + who : a.on === 'eachOf' ? (es ? `en cada uno de ${a.k} de los ` : `em cada um de ${a.k} dos `) + who
        : a.on === 'each' ? (es ? 'en cada uno de los ' : 'em cada um dos ') + who : (es ? 'entre los ' : 'entre os ') + who + (es ? ' como quieras' : ' como quiser');
      return V(m, es ? 'pone' : 'coloca', es ? 'poner' : 'colocar') + ' ' + dc(a.n) + ' ' + on; },
    countersAll: (a, m) => V(m, es ? 'pone' : 'coloca', es ? 'poner' : 'colocar') + ' ' + (a.n === 1 ? (es ? 'un contador de daño' : 'um contador de dano') : dc(a.n))
      + (es ? ' en cada Pokémon ' + (a.abil ? 'con una Habilidad' : 'en juego') + (a.checkup ? ' entre turnos' : '') : ' em cada Pokémon ' + (a.abil ? 'com uma Habilidade' : 'em jogo') + (a.checkup ? ' entre os turnos' : '')),
    boost: (a, m) => es ? (m === 'fin' ? `tus ${grp(a.grp)} hacen ${a.n} puntos de daño más` : `hacer que tus ${grp(a.grp)} hagan ${a.n} puntos de daño más`)
      : (m === 'fin' ? `seus ${grp(a.grp)} causam ${a.n} pontos de dano a mais` : `fazer seus ${grp(a.grp)} causarem ${a.n} pontos de dano a mais`),
    hp: (a, m) => es ? V(m, 'da', 'dar') + ` ${a.n} PS más a cada uno de tus ${grp(a.grp)} en juego` : V(m, 'dá', 'dar') + ` ${a.n} PS a mais a cada um dos seus ${grp(a.grp)} em jogo`,
    reduce: (a, m) => es ? V(m, 'hace', 'hacer') + ` que cada uno de tus ${grp(a.grp)}${a.ty ? ' con ' + i18nEnergy(a.ty, l) + ' unida' : ''} reciba ${a.n} puntos de daño menos de los ataques de tu rival`
      : V(m, 'faz', 'fazer') + ` com que cada um dos seus ${grp(a.grp)}${a.ty ? ' com ' + i18nEnergy(a.ty, l) + ' ligada' : ''} receba ${a.n} pontos de dano a menos dos ataques do oponente`,
    lockRule: (a, m) => V(m, 'anula', 'anular') + (es ? ' las Habilidades de todos los Pokémon con Recuadro de regla de ambos jugadores' : ' as Habilidades de todos os Pokémon com Caixa de Regras dos dois jogadores'),
    lockOpp: (a, m) => V(m, 'anula', 'anular') + (es ? ' las Habilidades de tu rival' : ' as Habilidades do oponente'),
    lockAll: (a, m) => V(m, 'anula', 'anular') + (es ? ' las Habilidades de ambos jugadores' : ' as Habilidades dos dois jogadores'),
    itemLock: (a, m) => es ? V(m, 'impide', 'impedir') + ' que tu rival juegue Objetos' : V(m, 'impede', 'impedir') + ' o oponente de jogar Itens',
    aceLock: (a, m) => es ? V(m, 'impide', 'impedir') + ' que tu rival juegue cartas AS TÁCTICO' : V(m, 'impede', 'impedir') + ' o oponente de jogar cartas ÁS TÁTICO',
    noRetreat: () => es ? 'tus Pokémon Básicos no tienen Coste de Retirada, así que puedes cambiar de atacante gratis' : 'seus Pokémon Básicos não têm Custo de Recuo, então você pode trocar de atacante de graça',
    weak: a => es ? `los Pokémon de tipo ${T[a.vs]} de tu rival pasan a tener Debilidad a ${T[a.ty]}, así que tus atacantes de tipo ${T[a.ty]} les hacen el doble de daño`
      : `os Pokémon do tipo ${T[a.vs]} do oponente passam a ter Fraqueza a ${T[a.ty]}, então seus atacantes do tipo ${T[a.ty]} causam o dobro de dano neles`,
    evolveDeck: (a, m) => es ? V(m, 'hace evolucionar', 'hacer evolucionar') + ' un Pokémon directamente desde tu baraja' : V(m, 'evolui', 'evoluir') + ' um Pokémon direto do seu deck',
  };
  const when = es ? { bench: 'cuando lo juegas en tu Banca', evolve: 'cuando lo juegas desde tu mano para evolucionar', first: 'en tu primer turno', many: 'tantas veces como quieras',
    once: 'una vez por turno', onceActive: 'una vez por turno mientras está en el Puesto Activo', active: 'mientras está en el Puesto Activo', ko: 'cuando queda Fuera de Combate' }
    : { bench: 'quando você o coloca no seu Banco', evolve: 'quando você o joga da mão para evoluir', first: 'no seu primeiro turno', many: 'quantas vezes quiser',
    once: 'uma vez por turno', onceActive: 'uma vez por turno enquanto está no Campo Ativo', active: 'enquanto está no Campo Ativo', ko: 'quando é Nocauteado' };
  const and = es ? ' y ' : ' e ';
  const cond = c => {
    switch (c.k) {
      case 'needPlay': return (es ? 'necesita a ' : 'precisa de ') + i18nAbNames(c.names, and) + (es ? ' en juego' : ' em jogo');
      case 'needEnergy': return es ? `necesita ${i18nEnergy(c.ty, l)} unida` : `precisa de ${i18nEnergy(c.ty, l)} ligada`;
      case 'needTool': return es ? 'necesita una Herramienta Pokémon unida' : 'precisa de uma Ferramenta Pokémon ligada';
      case 'afterKo': return es ? 'solo si uno de tus Pokémon quedó Fuera de Combate en el último turno de tu rival' : 'só se um dos seus Pokémon foi Nocauteado no último turno do oponente';
      case 'hurtActive': return es ? 'solo cuando recibe daño de un ataque en el Puesto Activo' : 'só quando recebe dano de um ataque no Campo Ativo';
      case 'hasEnergy': return es ? 'solo si tiene alguna Energía unida' : 'só se tiver alguma Energia ligada';
      case 'onBench': return es ? 'solo si está en tu Banca' : 'só se estiver no seu Banco';
      case 'emptyHand': return es ? 'solo si no tienes cartas en la mano' : 'só se você não tiver cartas na mão';
      case 'played': return es ? `solo si jugaste ${i18nAbNames(c.names, and)} desde tu mano en este turno` : `só se você jogou ${i18nAbNames(c.names, and)} da mão neste turno`;
      case 'havePlay': return es ? `solo si tienes a ${i18nAbNames(c.names, and)} en juego` : `só se você tiver ${i18nAbNames(c.names, and)} em jogo`;
      case 'prizes': return es ? `solo si a tu rival le quedan ${c.n} cartas de Premio o menos` : `só se o oponente tiver ${c.n} cartas de Prêmio ou menos restantes`;
      case 'lowHp': return es ? `solo si le quedan ${c.n} PS o menos` : `só se tiver ${c.n} PS ou menos restantes`;
      case 'activeHas': return es ? `solo si tu Pokémon Activo tiene la Habilidad ${c.name}` : `só se o seu Pokémon Ativo tiver a Habilidade ${c.name}`;
    }
    throw 0;
  };
  return {
    act, and2: es ? ', y ' : ', e ',
    say: (x, acts) => {
      const b = acts.map((s, i) => i ? (x.acts[i].then ? (es ? ' y luego ' : ' e depois ') : and) + s : s).join('');
      return (x.cost ? (es ? 'descarta ' : 'descarta ') + np(x.cost.np) + (x.cost.from === 'self' ? (es ? ' de este Pokémon' : ' deste Pokémon') : (es ? ' de tu mano' : ' da sua mão')) + ' para ' : '')
        + b + (x.when ? ' ' + when[x.when] : '') + (x.cond ? ' (' + cond(x.cond) + ')' : ''); },
    tailIn: names => ` (${names} ${es ? 'en esta lista' : 'nesta lista'})`,
    tailNone: ty => es ? `, aunque no hay ningún atacante de tipo ${T[ty]} en esta lista` : `, mas não há nenhum atacante do tipo ${T[ty]} nesta lista`,
    sent: (owner, abil, body) => `${abil} de ${owner}: ${body}`,
  };
}
const I18N_ABIL = { es: i18nAbRom('es'), pt: i18nAbRom('pt') };
// Every Abilities sentence of How it plays, read and said again in Spanish and Portuguese; null leaves it to the next pattern.
I18N_PAT.push([/^.+?'s .+?: .+$/, m => i18nAbilSent(m, 'es'), m => i18nAbilSent(m, 'pt')]);

function i18nTr(s) { const r = rdI18n.lookup(s); return r == null ? s : r; }
function i18nSentences(s) { return rdI18n.lookup(s); }

const I18N_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const I18N_MON = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
};
const I18N_MON3 = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] };
/** Spanish only: a day and short month with no year ("16 Sep"), which i18nPost leaves as it is, as "16 sep". */
function i18nEsDay(d) {
  return String(d).replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (x, n, mo) => n + ' ' + I18N_MON3.es[I18N_MONTHS.findIndex(y => y.startsWith(mo))]);
}
/** Dates and ordinals inside a translated string, put into the language. */
function i18nPost(s, l) {
  if (l !== 'es' && l !== 'pt') return i18nPostMore(s, l);
  const M = I18N_MONTHS.join('|'), S = I18N_MONTHS.map(m => m.slice(0, 3)).join('|');
  const full = m => I18N_MON[l][I18N_MONTHS.indexOf(m)], short = m => I18N_MON3[l][I18N_MONTHS.findIndex(x => x.startsWith(m))];
  return s
    .replace(new RegExp(`\\b(${S}) (\\d{1,2}), (\\d{4})\\b`, 'g'), (m, mo, d, y) => `${d} ${short(mo)} ${y}`)
    .replace(new RegExp(`\\b(\\d{1,2}) (${M}) (\\d{4})\\b`, 'g'), (m, d, mo, y) => `${d} de ${full(mo)} de ${y}`)
    .replace(new RegExp(`\\b(${M}) (\\d{4})\\b`, 'g'), (m, mo, y) => `${full(mo)} de ${y}`)
    .replace(new RegExp(`\\b(\\d{1,2}) (${S}) (\\d{4})\\b`, 'g'), (m, d, mo, y) => `${d} ${short(mo)} ${y}`)
    .replace(new RegExp(`\\b(${S}) (\\d{1,2})\\b`, 'g'), (m, mo, d) => `${d} ${short(mo)}`)
    // 1st place, 2nd of 57; never a name like 30th Celebration.
    .replace(/\b(\d+)(?:st|nd|rd|th)\b(?! [A-Z])/g, (m, n) => n + (l === 'es' ? '.º' : 'º'));
}

/** Dates and ordinals for a language from I18N_MORE: day month year, and its ordinal mark. */
function i18nPostMore(s, l) {
  const x = i18nMore(l);
  if (!x || !Array.isArray(x.mon) || !Array.isArray(x.mon3)) return s;
  const M = I18N_MONTHS.join('|'), S = I18N_MONTHS.map(m => m.slice(0, 3)).join('|');
  const full = m => x.mon[I18N_MONTHS.indexOf(m)], short = m => x.mon3[I18N_MONTHS.findIndex(y => y.startsWith(m))];
  const ord = typeof x.ord === 'function' ? x.ord : n => n + '.';
  return s
    .replace(new RegExp(`\\b(${S}) (\\d{1,2}), (\\d{4})\\b`, 'g'), (m, mo, d, y) => `${d} ${short(mo)} ${y}`)
    .replace(new RegExp(`\\b(\\d{1,2}) (${M}) (\\d{4})\\b`, 'g'), (m, d, mo, y) => `${d} ${full(mo)} ${y}`)
    .replace(new RegExp(`\\b(${M}) (\\d{4})\\b`, 'g'), (m, mo, y) => `${full(mo)} ${y}`)
    .replace(new RegExp(`\\b(\\d{1,2}) (${S}) (\\d{4})\\b`, 'g'), (m, d, mo, y) => `${d} ${short(mo)} ${y}`)
    .replace(new RegExp(`\\b(${S}) (\\d{1,2})\\b`, 'g'), (m, mo, d) => `${d} ${short(mo)}`)
    .replace(/\b(\d+)(?:st|nd|rd|th)\b(?! [A-Z])/g, (m, n) => ord(n));
}

const rdI18n = (function () {
  const DICT = { es: I18N_ES, pt: I18N_PT };
  const PAT = { es: I18N_PAT.map(p => [p[0], p[1]]), pt: I18N_PAT.map(p => [p[0], p[2]]) };
  const norm = s => String(s).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  // Keys are matched after the same squeeze, so a key written with a curly quote still hits.
  for (const l in DICT) {
    const d = DICT[l], n = {};
    for (const k in d) n[norm(k)] = d[k];
    DICT[l] = n;
  }
  const textMap = new WeakMap();   // text node -> { o: English, t: what we wrote }
  const attrMap = new WeakMap();   // element -> { attr: { o, t } }
  const cache = {};
  for (const l in DICT) cache[l] = new Map();
  /** Take in a downloaded language file's data. */
  function add(l) {
    const x = i18nMore(l);
    if (!I18N_LAZY[l] || !x || !x.dict) return false;
    const n = {};
    for (const k in x.dict) n[norm(k)] = x.dict[k];
    DICT[l] = n;
    PAT[l] = (x.pat || []).filter(p => p && p[0] instanceof RegExp);
    cache[l] = new Map();
    return true;
  }
  let want = null, ready = Promise.resolve();
  /** Download a language file once; resolves true when its data is in. */
  const loading = {};
  function fetchLang(l) {
    if (DICT[l]) return Promise.resolve(true);
    if (loading[l]) return loading[l];
    return (loading[l] = new Promise(res => {
      const t = document.querySelector(`#i18n-files`), tag = t && t.content && t.content.querySelector(`script[src*="i18n-${l}.js"]`);
      const sc = document.createElement('script');
      sc.src = tag ? tag.getAttribute('src') : `js/i18n-${l}.js`;
      sc.onload = () => res(add(l));
      sc.onerror = () => { delete loading[l]; res(false); };
      document.head.appendChild(sc);
    }));
  }
  const cardNames = new Set();
  let cur = 'en', obs = null, cardsTried = false;

  function pick() {
    // 3.1: a Creator kit card carries its language in the link, since OBS has its own storage.
    try { const q = new URLSearchParams(location.search).get('lang'); if (q && I18N_HTML_LANG[q]) return q; } catch (_) {}
    try { const s = localStorage.getItem(I18N_KEY); if (s && I18N_HTML_LANG[s]) return s; } catch (_) {}
    try {
      const n = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
      if (n.startsWith('es')) return 'es';
      if (n.startsWith('pt')) return 'pt';
      for (const l in I18N_LAZY) if (n.startsWith(l)) return l;
    } catch (_) {}
    return 'en';
  }

  function isCard(n) { return cardNames.has(n.toLowerCase()); }
  function addCardNames(list) { for (const x of list || []) if (x) cardNames.add(norm(x).toLowerCase()); }
  function loadCards() {
    if (cardsTried) return;
    cardsTried = true;
    try {
      if (typeof state !== 'undefined' && state && Array.isArray(state.decks)) {
        state.decks.forEach(d => { addCardNames((d.cards || []).map(c => c && c.name)); addCardNames([d.name]); });
      }
    } catch (_) {}
    if (typeof fetch !== 'function') return;
    fetch('cards.json').then(r => r.ok ? r.json() : null).then(j => {
      if (j && Array.isArray(j.cards)) addCardNames(j.cards.map(c => c && c.n));
    }).catch(() => {});
  }

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function one(n, lang, inner) {
    const d = DICT[lang];
    if (has(d, n)) return d[n];
    for (const p of PAT[lang]) {
      const m = n.match(p[0]);
      if (!m) continue;
      // 3.0.2: a capture that runs on into another sentence ("Nov 6. Results since then...") would
      // leave that sentence in English; skip the pattern so the sentences are translated one by one.
      if (!inner && m.length > 1 && m.slice(1).some(g => typeof g === 'string' && /[a-z0-9)][.!?] [A-Z¿¡]/.test(g))) continue;
      const r = typeof p[1] === 'function' ? p[1](...m) : n.replace(p[0], p[1]);
      if (r != null) return i18nPost(r, lang);
    }
    // A title used as a sentence: "No clear attacker." is "No clear attacker" plus the stop.
    const end = n.slice(-1);
    // 3.2.8: not for several sentences, which lookup translates one by one.
    if (!inner && (end === '.' || end === ':') && !/[a-z0-9)][.!?] [A-Z¿¡]/.test(n.slice(0, -1))) { const r = one(n.slice(0, -1), lang, true); if (r != null) return r + end; }
    return null;
  }
  // "A; B." where A and B are each known (finding titles joined in one line).
  function semi(p, lang) {
    const r = one(p, lang);
    if (r != null || p.indexOf('; ') < 0) return r;
    const out = p.split('; ').map(x => isCard(x) ? null : one(x, lang));
    return out.every(x => x != null) ? out.join('; ') : null;
  }
  /** The translation of one English string in the given language (default: the current one), or null. */
  function lookup(s, lang) {
    lang = lang || cur;
    if (lang === 'en') return null;
    const n = norm(s);
    if (!n || !/[A-Za-z]/.test(n)) return null;
    const c = cache[lang];
    if (c.has(n)) return c.get(n);
    let r = null;
    if (!isCard(n)) {
      r = one(n, lang);
      // Several sentences: translate them one by one, and only when every one is known.
      if (r == null && n.indexOf('; ') > 0) r = semi(n, lang);
      if (r == null) {
        const parts = n.split(/(?<=[.!?])\s+(?=[A-Z0-9"(¿¡])/);
        if (parts.length > 1) {
          const out = parts.map(p => /[A-Za-z]/.test(p) && !isCard(p) ? semi(p, lang) : p);
          if (out.every(x => x != null)) r = out.join(' ');
        }
      }
    }
    c.set(n, r);
    return r;
  }
  /** Translate a whole string, keeping its leading and trailing spaces. */
  function t(s) {
    if (cur === 'en' || s == null) return s;
    const r = lookup(s);
    if (r == null) return s;
    const m = String(s).match(/^(\s*)[\s\S]*?(\s*)$/);
    return m[1] + r + m[2];
  }

  function scoped(v, el) {
    const k = I18N_SCOPED[norm(v)];
    if (!k || !el || !el.matches || !el.matches(k[0])) return v;
    const w = cur === 'es' ? k[1] : cur === 'pt' ? k[2] : ((i18nMore(cur) || {}).scoped || {})[norm(v)];
    if (!w) return v;
    const m = String(v).match(/^(\s*)[\s\S]*?(\s*)$/);
    return m[1] + w + m[2];
  }
  function doText(node) {
    const e = textMap.get(node), v = node.nodeValue;
    if (e && v === e.t) {
      if (cur === 'en') { node.nodeValue = e.o; textMap.delete(node); return; }
      let r = scoped(e.o, node.parentElement);
      if (r === e.o) r = t(e.o);
      if (r === e.o) { node.nodeValue = e.o; textMap.delete(node); return; }
      if (r !== v) { e.t = r; node.nodeValue = r; }
      return;
    }
    if (e) textMap.delete(node);   // the app wrote new text
    if (cur === 'en') return;
    let r = scoped(v, node.parentElement);
    if (r === v) r = t(v);
    if (r !== v) { textMap.set(node, { o: v, t: r }); node.nodeValue = r; }
  }
  function doAttrs(el) {
    if (!el.hasAttribute) return;
    let m = attrMap.get(el);
    for (const a of I18N_ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), e = m && m[a];
      let o = v;
      if (e && v === e.t) o = e.o;
      const r = cur === 'en' ? o : t(o);
      if (r !== o) {
        if (!m) { m = {}; attrMap.set(el, m); }
        m[a] = { o, t: r };
        if (r !== v) el.setAttribute(a, r);
      } else {
        if (e) delete m[a];
        if (v !== o) el.setAttribute(a, o);
      }
    }
  }
  function skipped(el) {
    try { return !!(el && el.closest && el.closest(I18N_SKIP)); } catch (_) { return false; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (skipped(root)) return;
      doAttrs(root);
    }
    const doc = root.ownerDocument || document;
    const tw = doc.createTreeWalker(root, 5 /* SHOW_ELEMENT | SHOW_TEXT */, {
      acceptNode(n) {
        if (n.nodeType === 1) {
          if (n.matches(I18N_SKIP)) return 2;   // FILTER_REJECT: skip the whole subtree
          doAttrs(n);
          return 3;                              // FILTER_SKIP: look inside
        }
        return 1;
      },
    });
    const texts = [];
    while (tw.nextNode()) texts.push(tw.currentNode);
    texts.forEach(doText);
  }
  function onMut(recs) {
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach(n => { if (n.isConnected) walk(n); });
      else if (r.type === 'characterData') {
        const n = r.target, e = textMap.get(n);
        if (e && n.nodeValue === e.t) continue;
        if (n.isConnected && !skipped(n.parentElement)) doText(n);
      } else if (r.type === 'attributes') {
        const el = r.target, m = attrMap.get(el), e = m && m[r.attributeName];
        if (e && el.getAttribute(r.attributeName) === e.t) continue;
        if (!skipped(el)) doAttrs(el);
      }
    }
  }
  function watch(on) {
    if (on && !obs && typeof MutationObserver === 'function' && document.body) {
      obs = new MutationObserver(onMut);
      obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
    } else if (!on && obs) { obs.disconnect(); obs = null; }
  }
  function refit() { try { if (typeof rd38Fit === 'function') rd38Fit(); } catch (_) {} }

  /** Switch language; save marks it as the player's own choice. */
  function set(lang, save) {
    if (!I18N_HTML_LANG[lang]) lang = 'en';
    if (save) { try { localStorage.setItem(I18N_KEY, lang); } catch (_) {} }
    want = lang;
    if (lang !== 'en' && !DICT[lang]) {
      // Not downloaded yet: keep the current language until it is, then switch if still wanted.
      ready = fetchLang(lang).then(ok => { if (ok && want === lang) set(lang, false); else if (!ok && want === lang) { want = cur; paintPick(); } return ok; });
      return;
    }
    const was = cur;
    cur = lang;
    document.documentElement.lang = I18N_HTML_LANG[lang];
    if (lang !== 'en') loadCards();
    if (was !== lang || lang !== 'en') walk(document.body);
    watch(lang !== 'en');
    if (was !== lang) refit();
    paintPick();
  }
  function paintPick() {
    try { document.querySelectorAll('#i18n-lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === cur))); } catch (_) {}
  }

  /** The English a node or element showed before translation (for code that reads text back). */
  function orig(el) {
    if (!el) return '';
    if (el.nodeType === 3) { const e = textMap.get(el); return e && el.nodeValue === e.t ? e.o : el.nodeValue; }
    let s = '';
    el.childNodes.forEach(c => { s += c.nodeType === 3 || c.nodeType === 1 ? orig(c) : ''; });
    return s;
  }

  return { set, t, lookup, orig, walk, get lang() { return cur; }, get ready() { return ready; }, add, pick, norm, dict: DICT, pat: PAT, scoped: I18N_SCOPED, cardNames, addCardNames, skip: I18N_SKIP };
})();

// Dialogs the app opens with confirm() and alert() say the same in the player's language.
(function () {
  const c = window.confirm, a = window.alert;
  if (typeof c === 'function') window.confirm = function (m) { return c.call(window, rdI18n.t(m)); };
  if (typeof a === 'function') window.alert = function (m) { return a.call(window, rdI18n.t(m)); };
})();

// ── Settings: a Language row under Theme ──
function i18nPick(lang) {
  rdI18n.set(lang, true);
  document.querySelectorAll('#i18n-lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === rdI18n.lang)));
}
(function () {
  if (typeof openSettings !== 'function') return;
  const _o = openSettings;
  openSettings = function () {
    const out = _o.apply(this, arguments);
    const th = document.getElementById('st38-theme'), sec = th && th.closest('.st38-sec');
    if (sec && !document.getElementById('i18n-lang')) {
      sec.insertAdjacentHTML('afterend', `<div class="st38-sec">
      <div class="st38-h">Language</div>
      <div class="st38-seg" id="i18n-lang" role="group" aria-label="Language">
        ${I18N_LANGS.map(([l, n]) => `<button type="button" data-no-tr data-l="${l}" lang="${I18N_HTML_LANG[l]}" aria-pressed="${l === rdI18n.lang}" onclick="i18nPick('${l}')">${n}</button>`).join('')}
      </div>
    </div>`);
      // The heading is outside the data-no-tr group, so it is translated like the rest.
      rdI18n.walk(sec.nextElementSibling);
    }
    return out;
  };
})();

window.rdI18n = rdI18n;
rdI18n.set(rdI18n.pick(), false);
