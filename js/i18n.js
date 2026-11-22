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
// Inputs keep the player's own words, but their placeholder and labels are ours to translate.
const I18N_SKIP_ATTRS = I18N_SKIP.split(',').filter(s => s !== 'input' && s !== 'textarea').join(',');
const I18N_ATTRS = ['placeholder', 'title', 'aria-label', 'aria-valuetext'];

/* I18N_DICT_START */
const I18N_ES = {
  // Rare Pull (daily card game)
  "Daily game": "Juego diario",
  "Name cards from top lists. The rarer the pick, the higher it scores": "Nombra cartas de listas top. Cuanto más rara la elección, más puntos",
  "Loading today's prompts…": "Cargando las preguntas de hoy…",
  "Rare Pull needs a connection the first time. Try again in a moment.": "Rare Pull necesita conexión la primera vez. Inténtalo de nuevo en un momento.",
  "Today's prompts could not be made. Try again later.": "No se pudieron preparar las preguntas de hoy. Inténtalo más tarde.",
  "Seven prompts, the same for everyone today. Each asks for a kind of card from a group of top tournament lists.": "Siete preguntas, las mismas para todos hoy. Cada una pide un tipo de carta de un grupo de listas top de torneo.",
  "Pick a card that fits. The fewer of those top lists run it, the higher it scores, up to 100.": "Elige una carta que encaje. Cuantas menos de esas listas top la lleven, más puntos vale, hasta 100.",
  "You have 30 seconds for each prompt. Pass skips it.": "Tienes 30 segundos por pregunta. Con Pasar te la saltas.",
  "Pass": "Pasar",
  "This replay is practice. Your score for today is already in.": "Esta repetición es de práctica. Tu puntuación de hoy ya está guardada.",
  "Your first try is your score.": "Tu primer intento es tu puntuación.",
  "A card counts when at least 1 in 20 of those top lists run it.": "Una carta cuenta si la lleva al menos 1 de cada 20 de esas listas top.",
  "Secret Rare": "Rara Secreta",
  "Ultra Rare": "Ultra Rara",
  "Rare": "Rara",
  "Uncommon": "Poco común",
  "Common": "Común",
  "No pull": "Sin carta",
  "Name a Supporter": "Nombra un Partidario",
  "Name an Item": "Nombra un Objeto",
  "Name a Pokémon Tool": "Nombra una Herramienta Pokémon",
  "Name a Stadium": "Nombra un Estadio",
  "Name an ACE SPEC card": "Nombra una carta AS TÁCTICO",
  "Name a Trainer card": "Nombra una carta de Entrenador",
  "Name a Basic Pokémon": "Nombra un Pokémon Básico",
  "Name a Basic Pokémon that is not a Pokémon ex": "Nombra un Pokémon Básico que no sea Pokémon ex",
  "Name a Stage 1 Pokémon": "Nombra un Pokémon de Fase 1",
  "Name a Stage 2 Pokémon": "Nombra un Pokémon de Fase 2",
  "Name a Pokémon ex": "Nombra un Pokémon ex",
  "Name a Pokémon": "Nombra un Pokémon",
  "Name a Pokémon with 70 HP or less": "Nombra un Pokémon con 70 PS o menos",
  "Name a Special Energy": "Nombra una Energía Especial",
  "Name any card": "Nombra cualquier carta",
  "Name a Grass Pokémon": "Nombra un Pokémon de tipo Planta",
  "Name a Fire Pokémon": "Nombra un Pokémon de tipo Fuego",
  "Name a Water Pokémon": "Nombra un Pokémon de tipo Agua",
  "Name a Lightning Pokémon": "Nombra un Pokémon de tipo Rayo",
  "Name a Psychic Pokémon": "Nombra un Pokémon de tipo Psíquico",
  "Name a Fighting Pokémon": "Nombra un Pokémon de tipo Lucha",
  "Name a Darkness Pokémon": "Nombra un Pokémon de tipo Oscuridad",
  "Name a Metal Pokémon": "Nombra un Pokémon de tipo Metálico",
  "Name a Dragon Pokémon": "Nombra un Pokémon de tipo Dragón",
  "Name a Colorless Pokémon": "Nombra un Pokémon de tipo Incoloro",
  "From top lists of any deck": "De listas top de cualquier baraja",
  "From top lists of": "De listas top de",
  "Search card names": "Busca nombres de cartas",
  "Seconds left": "Segundos restantes",
  "Card names": "Nombres de cartas",
  "Type a few letters, then tap a card.": "Escribe unas letras y toca una carta.",
  "No card by that name.": "No hay ninguna carta con ese nombre.",
  "Passed.": "Pasaste.",
  "Time ran out.": "Se acabó el tiempo.",
  "Not that kind of card.": "No es ese tipo de carta.",
  "Fits, but fewer than 1 in 20 of those top lists run it.": "Encaja, pero la lleva menos de 1 de cada 20 de esas listas top.",
  "Top lists that run it": "Listas top que la llevan",
  "Rarest fit": "La más rara que encaja",
  "Most common fit": "La más común que encaja",
  "See your score": "Ver tu puntuación",
  "Next prompt": "Siguiente pregunta",
  "Your score": "Tu puntuación",
  "Today's score stays": "Tu puntuación de hoy sigue siendo",
  "Best pull:": "Mejor carta:",
  "Best pull": "Mejor carta",
  "New prompts tomorrow.": "Mañana hay preguntas nuevas.",
  "Share score": "Compartir puntuación",
  "Play today's Rare Pull first.": "Primero juega el Rare Pull de hoy.",
  // Photo deck import (test branch photo-import)
  "From a photo": "Desde una foto",
  "Read a deck from a picture": "Leer una baraja desde una imagen",
  "Reading your picture…": "Leyendo tu imagen…",
  "Your picture stays on this device. It is never uploaded.": "Tu imagen se queda en este dispositivo. Nunca se sube.",
  "Pick another picture": "Elegir otra imagen",
  "Check each card against your picture. Tap Change to fix a card, or use the buttons to fix a count.": "Compara cada carta con tu imagen. Toca Cambiar para corregir una carta, o usa los botones para corregir una cantidad.",
  "Add another picture": "Añadir otra imagen",
  "For a deck that does not fit on one screen. A card in both pictures counts once.": "Para una baraja que no cabe en una sola pantalla. Una carta que sale en las dos imágenes cuenta una vez.",
  "Which card is this?": "¿Qué carta es esta?",
  "This card is right": "Esta carta es correcta",
  "Close matches": "Coincidencias cercanas",
  "Card name": "Nombre de la carta",
  "Not a card, remove it": "No es una carta, quitarla",
  "Check the card": "Revisa la carta",
  "Check the count": "Revisa la cantidad",
  "To check:": "Por revisar:",
  "Every card read clearly": "Todas las cartas se leyeron bien",
  "of 60 cards": "de 60 cartas",
  "No Standard card by that name.": "No hay ninguna carta Estándar con ese nombre.",
  "Photo import needs a connection the first time you use it.": "La importación desde foto necesita conexión la primera vez que la usas.",
  "This picture could not be opened. Try a screenshot saved as PNG or JPEG.": "No se pudo abrir esta imagen. Prueba con una captura de pantalla guardada como PNG o JPEG.",
  "No cards found in this picture. Try a screenshot of the whole deck screen, with every card and its count showing.": "No se encontraron cartas en esta imagen. Prueba con una captura de toda la pantalla de la baraja, donde se vea cada carta y su cantidad.",
  "No cards found in this picture.": "No se encontraron cartas en esta imagen.",
  "List added. Check it, then tap Import and save.": "Lista añadida. Revísala y luego toca Importar y guardar.",
  "One fewer": "Una menos",
  "One more": "Una más",
  "Added: photo deck import": "Nuevo: importar barajas desde una foto",
  "Added: copy for TCG Live": "Nuevo: copiar para TCG Live",
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
  "Large text layout fixed": "Diseño con texto grande corregido",
  "Added: in-app dialogs": "Nuevo: avisos propios de la app",
  "Added: fold sections": "Nuevo: secciones plegables",
  "Added: 6 deck guides": "Nuevo: 6 guías de barajas",
  "Added: 5 deck guides": "Nuevo: 5 guías de barajas",
  "Added: creator kit guide": "Nuevo: guía del kit para creadores",
  "Added: first deck guide": "Nuevo: guía para tu primera baraja",
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
  "Read the guide": "Leer la guía",
  "Can Your Deck Win?": "¿Tu baraja puede ganar?",
  "Free Pokémon TCG Deck Checker": "Calificador de barajas de Pokémon TCG gratis",
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
  "RdyDeck is a free Pokémon TCG deck checker and prize trainer. Paste a list from Pokémon TCG Live or Limitless to see how well the cards work together, what to fix first, your opening odds and which cards rotate out of Standard next. Grades are based on your cards and, for known decks, results from online and local in-person events.": "RdyDeck es un calificador de barajas de Pokémon TCG y un entrenador de cartas de Premio, gratis. Pega una lista de Pokémon TCG Live o Limitless para ver qué tan bien funcionan las cartas juntas, qué corregir primero, tus probabilidades de apertura y qué cartas salen del formato Estándar en la próxima rotación. La calificación se basa en tus cartas y, en barajas conocidas, en los resultados de torneos online y presenciales locales.",
  "Then practice the deck: name your six prize cards, draw opening hands, run drills and keep notes on your matchups. Decks stay in your browser, it works offline and there is no account to make.": "Después practica la baraja: adivina tus seis cartas de Premio, roba manos iniciales, haz ejercicios y anota tus enfrentamientos. Las barajas se quedan en tu navegador, funciona sin conexión y no necesitas crear una cuenta.",
  "Questions about RdyDeck": "Preguntas sobre RdyDeck",
  "What is RdyDeck?": "¿Qué es RdyDeck?",
  "RdyDeck is a free web app for Pokémon Trading Card Game players. It grades a 60 card deck, shows its opening odds and which cards rotate out of Standard, and trains you to work out your prize cards.": "RdyDeck es una app web gratis para jugadores de Pokémon Trading Card Game. Califica una baraja de 60 cartas, muestra sus probabilidades de apertura y qué cartas salen del formato Estándar, y te entrena para deducir tus cartas de Premio.",
  "How does prize card training work?": "¿Cómo funciona el entrenamiento con cartas de Premio?",
  "RdyDeck sets some cards from your deck aside as prizes, 6 by default or 4 or 8, and you flip through the rest. Then you name the cards that are missing. You can add a time limit, and after a few games RdyDeck shows which cards you miss most.": "RdyDeck aparta algunas cartas de tu baraja como premios, 6 por defecto o 4 u 8, y tú revisas el resto. Luego nombras las cartas que faltan. Puedes agregar un límite de tiempo, y después de algunas partidas RdyDeck te muestra qué cartas fallas más.",
  "How does the deck grade work?": "¿Cómo funciona la calificación de la baraja?",
  "The grade is out of 10. Synergy checks that the cards support each other: attackers can pay for their attacks, evolutions have what they evolve from, and the deck can draw and search. Power checks that the plan can win: how hard it hits, how many prizes it gives up and how fast it sets up. The grade is Synergy times Power, divided by 10, so the weaker one pulls the grade down. One part of Synergy, how tightly the list fits together, lowers the grade only when the fit is loose, so a focused list can grade a little above Synergy times Power. When the deck matches an archetype from recent online and local in-person tournaments, part of the grade, up to half once it has 250 games, comes from that archetype's results. Each grade shows its own math and comes with a short list of what to fix first.": "La calificación es sobre 10. Sinergia revisa que las cartas se apoyen entre sí: los atacantes pueden pagar sus ataques, las evoluciones tienen de qué evolucionar y la baraja puede robar y buscar. Poder revisa que el plan pueda ganar: qué tan fuerte pega, cuántos premios entrega y qué tan rápido se prepara. La calificación es el producto de Sinergia y Poder, dividido entre 10, así que el valor más bajo de los dos arrastra la calificación hacia abajo. Una parte de Sinergia, qué tan compacta es la lista, baja la calificación solo cuando la lista está dispersa, así que una lista enfocada puede calificar un poco por encima del producto de Sinergia y Poder. Cuando la baraja coincide con un arquetipo de torneos online y presenciales locales recientes, parte de la calificación, hasta la mitad cuando tiene 250 partidas, viene de los resultados de ese arquetipo. Cada calificación muestra su cálculo y trae una lista corta de qué corregir primero.",
  "How does the rotation check work?": "¿Cómo funciona la revisión de rotación?",
  "RdyDeck reads each card's regulation mark and shows which cards are not Standard legal now, which may rotate next, and which are safe. A card counts as safe only when its mark is confirmed, and a deck with cards that are not legal now grades 4.9 at most. An older printing still counts when a reprint with the same name, attacks and Abilities is legal now, so old art is fine.": "RdyDeck lee la marca de regulación de cada carta y muestra cuáles no son legales en Estándar ahora, cuáles podrían rotar en la próxima rotación y cuáles están seguras. Una carta cuenta como segura solo cuando su marca está confirmada, y una baraja con cartas que no son legales ahora califica 4.9 como máximo. Una impresión anterior sigue contando si hay una reimpresión legal con el mismo nombre, ataques y Habilidades, así que el arte viejo sirve.",
  "Which deck lists can I import?": "¿Qué listas puedo importar?",
  "Paste an export from Pokémon TCG Live or a list from Limitless TCG, one card per line with the count, name, set code and number. Starter decks are built in if you want to try it first.": "Pega una exportación de Pokémon TCG Live o una lista de Limitless TCG, una carta por línea con la cantidad, el nombre, el código de expansión y el número. Hay barajas iniciales incluidas si quieres probar primero.",
  "Is RdyDeck free? Do I need an account?": "¿RdyDeck es gratis? ¿Necesito una cuenta?",
  "RdyDeck is free and has no account. Your decks stay in your browser on your own device, it works offline once it has loaded, and you can install it to your home screen.": "RdyDeck es gratis y no usa cuentas. Tus barajas se quedan en el navegador de tu propio dispositivo, funciona sin conexión una vez que cargó y puedes instalarlo en tu pantalla de inicio.",
  "Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company. Card names, text and images are © The Pokémon Company, Nintendo, Creatures and GAME FREAK.": "App no oficial hecha por fans. Sin afiliación con Nintendo, Creatures, GAME FREAK ni The Pokémon Company. Los nombres, textos e imágenes de las cartas son © The Pokémon Company, Nintendo, Creatures y GAME FREAK.",
  "Deck checker": "Calificador de barajas",
  "Opening odds": "Probabilidades de apertura",
  "Prize trainer": "Entrenador de premios",
  "Goldfish guide": "Guía de Goldfish",
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
  "This sends your message straight to us. Please leave out your name and contact details. Under 13? Ask a parent to send it.": "Esto nos envía tu mensaje directamente. No incluyas tu nombre ni tus datos de contacto. ¿Tienes menos de 13 años? Pídele a tu padre, madre o tutor que lo envíe.",
  "Send by email": "Enviar por correo",
  "Copy message": "Copiar mensaje",
  "Send": "Enviar",
  "Send it by email, or copy it and write to us.": "Envíalo por correo, o cópialo y escríbenos.",
  "Try again": "Intentar de nuevo",
  "Sending": "Enviando",
  "Write a few words first.": "Escribe algo primero.",
  "You're offline. Try again when you're connected, or send it by email.": "No tienes conexión. Inténtalo de nuevo cuando tengas conexión, o envíalo por correo.",
  "Thanks, it's sent": "Gracias, ya se envió",
  "We read every message.": "Leemos todos los mensajes.",
  "Too many messages right now. Wait a minute and try again, or send it by email.": "Hay demasiados mensajes ahora. Espera un minuto e inténtalo de nuevo, o envíalo por correo.",
  "It didn't send. Try again, or send it by email.": "No se envió. Inténtalo de nuevo, o envíalo por correo.",
  "Copied. Paste it into an email to support@rdydeck.com.": "Copiado. Pégalo en un correo a support@rdydeck.com.",
  "Could not copy. Write to support@rdydeck.com.": "No se pudo copiar. Escribe a support@rdydeck.com.",
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
  "Each has its own tab on a deck. Hand can goldfish your first three turns, and Sparring plays five turns against a computer opponent with a tournament deck or your own. Drills has resource counts and an opponent prize read. Notes keeps matchup plans, an edit log of every card change, and a compare view. Card art you have seen is saved for offline play.": "Cada uno tiene su pestaña en la baraja. Mano puede hacer goldfish de tus primeros tres turnos, y Sparring juega cinco turnos contra un rival de la computadora con una baraja de torneo o la tuya. Entreno tiene conteo de recursos y lectura de premios del rival. Notas guarda planes de enfrentamientos, un historial de cada cambio de cartas y una vista para comparar. El arte de las cartas que ya viste se guarda para jugar sin conexión.",
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
  "Copy list for TCG Live": "Copiar lista para TCG Live",
  "List copied. Paste it into TCG Live's deck import.": "Lista copiada. Pégala al importar una baraja en TCG Live.",
  "Your browser blocked the copy. Press and hold the list, choose Select all, then Copy.": "Tu navegador bloqueó la copia. Mantén pulsada la lista, elige Seleccionar todo y luego Copiar.",
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
  "7 and up": "7 o más",
  "No tournament results match this deck yet, so a grade of 7 and up is called Strong.": "Ningún resultado de torneo coincide con este mazo todavía, así que una calificación de 7 o más se llama Sólida.",
  "Fixable": "Mejorable",
  "Needs work": "Necesita trabajo",
  "Does not function": "No funciona",
  "Not legal yet": "Aún no es legal",
  "Ready for an event as it is.": "Lista para un evento tal como está.",
  "A good list with a few things to tighten.": "Una buena lista con algunos detalles por ajustar.",
  "The plan works, but problems will cost you games.": "El plan funciona, pero los problemas te van a costar partidas.",
  "Several problems stop it from working reliably.": "Varios problemas impiden que funcione de forma confiable.",
  "It cannot carry out its plan yet.": "Todavía no puede llevar a cabo su plan.",
  "Fix first shows the one problem found.": "En Corrige primero verás el único problema encontrado.",
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
  "Right now Synergy is what holds it back.": "Ahora mismo, la Sinergia es lo que la frena.",
  "Right now Power is what holds it back.": "Ahora mismo, el Poder es lo que la frena.",
  "Fix first": "Corrige primero",
  "The problem that costs you the most.": "El problema que más te perjudica.",
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
  "The card grade is Synergy times Power, divided by 10. How tightly the list fits together lowers Synergy in full, but lowers the grade only when the fit is loose. When your deck matches an archetype from recent online and local in-person tournaments, part of the grade comes from that archetype's win rate and finishes: more of it the more games there are, up to half at 250 games, and none while cards are not Standard legal. The sentence under the grade shows how much. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "La calificación de las cartas es el producto de Sinergia y Poder, dividido entre 10. Qué tan compacta es la lista baja Sinergia por completo, pero baja la calificación solo cuando la lista está dispersa. Cuando tu baraja coincide con un arquetipo de torneos online y presenciales locales recientes, parte de la calificación viene del porcentaje de victorias y los resultados de ese arquetipo: más mientras más partidas haya, hasta la mitad con 250 partidas, y nada mientras haya cartas que no son legales en Estándar. La frase bajo la calificación muestra qué parte viene de ahí. Los roles de las cartas se leen del texto de la carta, que casi siempre acierta y a veces no. Lee los hallazgos y no te preocupes por el decimal.",
  "No card data for this deck yet.": "Todavía no hay datos de cartas para esta baraja.",
  "These could not be looked up, so they count for nothing in the grade. Opening the deck again while online tries again.": "No se pudieron consultar, así que no cuentan en la calificación. Abrir la baraja otra vez con conexión vuelve a intentarlo.",
  "Grade history": "Historial de calificaciones",
  "Upgrades": "Mejoras",
  "Upgrades show once the list follows the deck rules. Fix first says what to change.": "Las mejoras aparecen cuando la lista cumple las reglas de la baraja. «Corrige primero» dice qué cambiar.",
  "Upgrades show once every card in the list is Standard legal.": "Las mejoras aparecen cuando todas las cartas de la lista son legales en Estándar.",
  "Upgrades show once the card data for this list has loaded.": "Las mejoras aparecen cuando terminan de cargarse los datos de las cartas de esta lista.",
  "Upgrades could not be worked out for this list just now. Open the deck again to retry.": "Ahora mismo no se pudieron calcular las mejoras de esta lista. Vuelve a abrir la baraja para intentarlo de nuevo.",
  "Upgrades need a connection the first time, to read the cards to try.": "Las mejoras necesitan conexión la primera vez, para leer las cartas a probar.",
  "Checking which card swaps raise this grade.": "Revisando qué cambios de cartas suben esta calificación.",
  "No single swap raises this grade, its Synergy or its Power.": "Ningún cambio de una sola carta sube esta calificación, ni su Sinergia ni su Poder.",
  "What Fix first lists needs more than one card changed.": "Lo que indica «Corrige primero» necesita cambiar más de una carta.",
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
  ", not announced yet.": ", aunque aún no se ha anunciado.",
  "cards are expected to leave Standard in": "se espera que salgan de Estándar en",
  "cards leave Standard in": "salen de Estándar en",
  "are expected to leave Standard in": "deberían salir de Estándar en",
  "leave Standard in": "salen de Estándar en",
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
  "Opening 7 with no Basic": "Mano inicial de 7 sin Básico",
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
  "Stuck in prizes: 0.0%": "Bloqueo por premios: 0.0%",
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
  "Matchup win rates are not here. They are on the Grade tab, in Against the meta, from recent online and local in-person tournaments. Everything on this tab comes from shuffling your own list.": "Los porcentajes de victoria por enfrentamiento no están aquí. Están en la pestaña Nota, en Contra el meta, a partir de torneos online y presenciales locales recientes. Todo lo de esta pestaña sale de mezclar tu propia lista.",
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
  "Goldfish (3 Turns)": "Goldfish (3 turnos)",
  "Sparring (5 Turns)": "Sparring (5 turnos)",
  "Sparring": "Sparring",
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
  "Tap a card in your hand to play it. Tap a Pokémon in play to retreat, use its Ability or attack. An attack ends your turn.": "Toca una carta de tu mano para jugarla. Toca un Pokémon en juego para retirarlo, usar su Habilidad o atacar. Un ataque termina tu turno.",
  "Add a damage counter": "Añadir un contador de daño",
  "Remove a damage counter": "Quitar un contador de daño",
  "No damage on it": "Sin daño",
  "Attacks start on turn 1.": "Los ataques empiezan en el turno 1.",
  "Your turn has ended.": "Tu turno terminó.",
  "Only your Active Pokémon can attack.": "Solo tu Pokémon Activo puede atacar.",
  "The player going first cannot attack on turn 1.": "Quien empieza no puede atacar en el turno 1.",
  "Not enough Energy attached.": "No tiene suficiente Energía unida.",
  "It cannot use this attack this turn, because of the attack it used last turn.": "No puede usar este ataque este turno por el ataque que usó el turno pasado.",
  "No attack text read yet. Open this deck online to read it.": "Todavía no se leyó el texto del ataque. Abre esta baraja con conexión para leerlo.",
  "No card text read yet. Open this deck online to read it.": "Todavía no se leyó el texto de la carta. Abre esta baraja con conexión para leerlo.",
  "The app cannot follow all of this attack yet, so you finish it by hand.": "La app todavía no puede seguir todo este ataque, así que lo terminas a mano.",
  "The app cannot follow this card's text yet, so playing it lets you do it by hand.": "La app todavía no puede seguir el texto de esta carta, así que al jugarla la haces a mano.",
  "During setup only Basic Pokémon go into play.": "Durante la preparación solo entran en juego Pokémon Básicos.",
  "Nothing to do with this card now.": "Ahora no hay nada que hacer con esta carta.",
  "Make Active and play on in Goldfish": "Ponerlo de Activo y seguir en Goldfish",
  "Only Basic Pokémon go into play before turn 1. Tap a Basic to play this hand on in Goldfish.": "Antes del turno 1 solo entran en juego Pokémon Básicos. Toca un Básico para seguir con esta mano en Goldfish.",
  "On schedule": "A tiempo",
  "A turn behind": "Un turno tarde",
  "You draw every turn, one Energy and one Supporter a turn, no Supporter and no attack on turn 1 going first, and no evolving on your first turn or onto a Pokémon that came in this turn. Abilities, attacks, Items, Supporters and Stadiums do what their card text says, with each card's own limits, and an attack ends your turn. Damage stays on your Pokémon, and a Pokémon is Knocked Out when its damage reaches its HP. There is no opponent, so effects on your opponent do nothing here. When the app cannot follow a card yet, it shows the text and you use Draw, Search, Discard and the damage counter buttons.": "Robas en cada turno, una Energía y un Partidario por turno, sin Partidario ni ataque en el turno 1 si vas primero, y sin evolucionar en tu primer turno ni sobre un Pokémon que entró este turno. Habilidades, ataques, Objetos, Partidarios y Estadios hacen lo que dice su texto, con los límites de cada carta, y un ataque termina tu turno. El daño se queda en tus Pokémon, y un Pokémon queda Fuera de Combate cuando su daño llega a sus PS. No hay rival, así que los efectos sobre tu rival no hacen nada aquí. Cuando la app todavía no puede seguir una carta, muestra el texto y tú usas Robar, Buscar, Descartar y los botones de contadores de daño.",
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
  "Six cards go face down and you name them.": "Seis cartas quedan boca abajo y tú las nombras.",
  "Four cards go face down and you name them.": "Cuatro cartas quedan boca abajo y tú las nombras.",
  "No part of it comes from results while cards are not Standard legal. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "Ninguna parte viene de los resultados mientras haya cartas que no son legales en Estándar. Los roles de las cartas se leen del texto de la carta, que casi siempre acierta y a veces no. Lee los hallazgos y no te preocupes por el decimal.",
  "Prize game moved to Drills": "Partida de premios movida a Entreno",
  "Grade explainer moved to Questions": "Explicación de la calificación movida a Preguntas",
  "Desktop layout improved": "Diseño de escritorio mejorado",
  "Deck tabs reordered": "Pestañas de la baraja reordenadas",
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
  "Find a deck": "Buscar una baraja",
  "TCGplayer market prices in US dollars, from TCGdex.": "Precios de mercado de TCGplayer en dólares estadounidenses, de TCGdex.",
  "Clear search": "Borrar búsqueda",
  "Sort decks": "Ordenar barajas",
  "Your order": "Tu orden",
  "Best grade": "Mejor calificación",
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
  "The grade is Synergy times Power, divided by 10.": "La calificación es el producto de Sinergia y Poder, dividido entre 10.",
  "Synergy under 0.6 counts as 0.6.": "Sinergia por debajo de 0.6 cuenta como 0.6.",
  "Power under 1.2 counts as 1.2.": "Poder por debajo de 1.2 cuenta como 1.2.",
  "If that is the wrong deck, pick the right one under Against the meta.": "Si esa no es la baraja correcta, elige la correcta en Contra el meta.",
  "There are few games so far, so results count for little.": "Todavía hay pocas partidas, así que los resultados cuentan poco.",
  "No online tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Todavía no hay resultados de torneos online que coincidan con esta baraja, así que la calificación lee solo las cartas y no puede ver cómo le va a la lista en partidas reales.",
  "No online or local in-person tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Todavía no hay resultados de torneos online ni presenciales locales que coincidan con esta baraja, así que la calificación lee solo las cartas y no puede ver cómo le va a la lista en partidas reales.",
  "No local in-person tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Todavía no hay resultados de torneos presenciales locales que coincidan con esta baraja, así que la calificación lee solo las cartas y no puede ver cómo le va a la lista en partidas reales.",
  "Until it has results, it is not called Tournament-ready.": "Hasta que tenga resultados, no se le llama Lista para torneo.",
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
  "Lists as posted on Limitless (limitlesstcg.com).": "Listas tal como se publicaron en Limitless (limitlesstcg.com).",
  "Or write to support@rdydeck.com": "O escribe a support@rdydeck.com",
  "Same list, same numbers.": "Misma lista, mismos números.",
  "Tab": "Tab",
  "Enter": "Enter",
  "Esc": "Esc",
  "No card moves your opponent's Benched Pokemon into the Active Spot, like Boss's Orders or Prime Catcher, so you can only Knock Out what they choose to put there. Some decks skip it on purpose, but most run 2 to 4.": "Ninguna carta mueve un Pokémon en Banca de tu rival al Puesto Activo, como Boss's Orders o Prime Catcher, así que solo puedes dejar Fuera de Combate lo que tu rival decida poner ahí. Algunas barajas lo omiten a propósito, pero la mayoría lleva de 2 a 4.",
  "Nothing in the list searches your deck for a Pokemon, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin, so getting your attackers into play rests on drawing them.": "Nada en la lista busca un Pokémon en tu baraja, como Ultra Ball, Poké Pad o Buddy-Buddy Poffin, así que poner a tus atacantes en juego depende de robarlos.",
  "Enough Rare Candy to land your Stage 2 Pokemon before the game runs away.": "Suficientes Rare Candy para jugar tus Pokémon de Fase 2 antes de que la partida se escape.",
  "Nothing reliably refills your hand. The deck stalls as soon as your opening cards run dry.": "Nada rellena tu mano de forma confiable. La baraja se atasca en cuanto se acaban tus cartas iniciales.",
  "Nothing in the list draws cards. It can search the deck for what it needs, but a hand that misses still stays bad, so the deck stalls more often than one with draw.": "Nada en la lista roba cartas. Puede buscar en la baraja lo que necesita, pero una mano que falla sigue siendo mala, así que la baraja se atasca más a menudo que una que roba.",
  "Every Pokemon here gives up two prizes, so the opponent needs only three knockouts. That is normal for a deck built on Pokemon ex, so each one has to take more than one knockout of its own.": "Cada Pokémon aquí entrega dos premios, así que el rival solo necesita dejar Fuera de Combate a tres. Eso es normal en una baraja de Pokémon ex, así que cada uno tiene que dejar Fuera de Combate a más de un Pokémon rival.",
  "The list runs one copy of its main attacker. It is in your prizes in about 1 game in 10, and once it is Knocked Out the deck has no one to carry the plan. Most lists run 2 to 4.": "La lista lleva una sola copia de su atacante principal. Queda en tus premios en más o menos 1 de cada 10 partidas, y una vez que queda Fuera de Combate la baraja se queda sin nadie que lleve adelante el plan. La mayoría de las listas lleva de 2 a 4.",
  "How hard the best attacker hits the format's biggest threats.": "Qué tan fuerte pega el mejor atacante contra las mayores amenazas del formato.",
  "Fine if you can take the return hit.": "Está bien si puedes aguantar el golpe de vuelta.",
  "Read the card for what that needs.": "Lee la carta para ver qué necesita.",
  "ACE SPEC": "AS TÁCTICO",
  "Built from": "Basada en",
  "Matchups": "Enfrentamientos",
  "Trends": "Tendencias",
  "The grade checks the rest when you save.": "La calificación revisa el resto cuando guardas.",
  // 3.3.6: De-bling.
  "Added: De-bling button": "Nuevo: botón Abaratar",
  "Rare Candy bug fixed": "Error de Rare Candy corregido",
  "Added: Goldfish damage and attacks": "Nuevo: daño y ataques en Goldfish",
  "Added: tap a card to play it": "Nuevo: toca una carta para jugarla",
  "Goldfish is now 5 turns": "Goldfish ahora dura 5 turnos",
  "Goldfish is back to 3 turns": "Goldfish vuelve a 3 turnos",
  "De-bling": "Abaratar",
  "Undo de-bling": "Deshacer Abaratar",
  "Swap each card to its cheapest printing that plays the same": "Cambia cada carta por su impresión más barata que juega igual",
  "Put back the printings the list had before": "Vuelve a poner las impresiones que tenía la lista",
  "Finding the cheapest printings…": "Buscando las impresiones más baratas…",
  "These cards now use their cheapest printing that plays the same. Each line shows what it saves.": "Estas cartas ahora usan su impresión más barata que juega igual. Cada línea muestra lo que ahorras.",
  "Estimated savings:": "Ahorro estimado:",
  "1 card has no price to compare, so it stays as it is.": "1 carta no tiene precio para comparar, así que se queda como está.",
  "Turn prices on in Settings to use De-bling.": "Activa los precios en Ajustes para usar Abaratar.",
  "De-bling could not load its card list. Try again when you are online.": "Abaratar no pudo cargar su lista de cartas. Inténtalo de nuevo cuando tengas conexión.",
  "Prices could not be read. Try again when you are online.": "No se pudieron leer los precios. Inténtalo de nuevo cuando tengas conexión.",
  "No cheaper printing with a price was found.": "No se encontró ninguna impresión más barata con precio.",
  "Every card is already its cheapest printing.": "Todas las cartas ya están en su impresión más barata.",
  "The list changed since, so there is nothing to undo.": "La lista cambió desde entonces, así que no hay nada que deshacer.",
  "De-bling undone.": "Se deshizo Abaratar.",
  // 3.3.9: puzzle score share.
  "Puzzle deck search fixed": "Búsqueda en la baraja del puzzle corregida",
  "Added: share your puzzle score": "Nuevo: comparte tu resultado del puzzle",
  "Added: goldfish guide": "Nuevo: guía de Goldfish",
  "Added: Sparring": "Nuevo: Sparring",
  "Sparring plays your saved decks": "Sparring juega con tus barajas guardadas",
  "Sparring bugs fixed": "Errores de Sparring corregidos",
  "Sparring shows cards and both boards": "Sparring muestra las cartas y ambos tableros",
  "Brilliant Blender fixed": "Brilliant Blender corregido",
  "Sparring: discard piles and deck search": "Sparring: pilas de descartes y búsqueda en la baraja",
  "Sparring Tool and Energy fixes": "Sparring: arreglos de Herramientas y Energías",
  "Sparring shows Energy on matching Pokémon": "Sparring muestra la Energía de Pokémon iguales",
  "Sparring search opens with cards you can take": "La búsqueda de Sparring muestra primero las cartas que puedes tomar",
  "Sparring Energy and game log fixes": "Arreglos de Energía y del registro de partida en Sparring",
  "Fairer grades for decks with no draw cards": "Calificaciones más justas para barajas sin cartas de robo",
  "Grades now count local store events": "Las calificaciones ahora cuentan eventos locales en tiendas",
  "Sparring game log fixes": "Correcciones en el registro de partida de Sparring",
  "Clearer grade text when showing local results": "Texto de la calificación más claro al ver resultados locales",
  "Share card art fixed for 30th Celebration": "Imagen de la carta arreglada en la tarjeta para compartir de 30th Celebration",
  "New daily game: Rare Pull": "Nuevo juego diario: Rare Pull",
  "Added: watch out for box": "Nuevo: recuadro Ojo con",
  "Share your puzzle score": "Comparte tu resultado del puzzle",
  "The link opens today's puzzle, so friends play the same board.": "El enlace abre el puzzle de hoy, así tus amigos juegan el mismo tablero.",
  "Play today's puzzle first.": "Juega primero el puzzle de hoy.",
  "Score and link copied. Paste it anywhere.": "Resultado y enlace copiados. Pégalos donde quieras.",
  "Could not copy. Try Share instead.": "No se pudo copiar. Prueba con Compartir.",
  "Save image": "Guardar imagen",
  "Wide": "Ancha",
  "Square": "Cuadrada",
  "Picture size": "Tamaño de la imagen",
};
const I18N_PT = {
  // Rare Pull (daily card game)
  "Daily game": "Jogo diário",
  "Name cards from top lists. The rarer the pick, the higher it scores": "Diga cartas de listas top. Quanto mais rara a escolha, mais pontos",
  "Loading today's prompts…": "Carregando as perguntas de hoje…",
  "Rare Pull needs a connection the first time. Try again in a moment.": "O Rare Pull precisa de conexão na primeira vez. Tente de novo em instantes.",
  "Today's prompts could not be made. Try again later.": "Não foi possível montar as perguntas de hoje. Tente mais tarde.",
  "Seven prompts, the same for everyone today. Each asks for a kind of card from a group of top tournament lists.": "Sete perguntas, as mesmas para todos hoje. Cada uma pede um tipo de carta de um grupo de listas top de torneio.",
  "Pick a card that fits. The fewer of those top lists run it, the higher it scores, up to 100.": "Escolha uma carta que se encaixe. Quanto menos dessas listas top a usarem, mais pontos ela vale, até 100.",
  "You have 30 seconds for each prompt. Pass skips it.": "Você tem 30 segundos por pergunta. Com Passar, você pula a pergunta.",
  "Pass": "Passar",
  "This replay is practice. Your score for today is already in.": "Esta repetição é de treino. Sua pontuação de hoje já está registrada.",
  "Your first try is your score.": "Sua primeira tentativa é sua pontuação.",
  "A card counts when at least 1 in 20 of those top lists run it.": "Uma carta conta quando pelo menos 1 em cada 20 dessas listas top a usa.",
  "Secret Rare": "Rara Secreta",
  "Ultra Rare": "Ultra Rara",
  "Rare": "Rara",
  "Uncommon": "Incomum",
  "Common": "Comum",
  "No pull": "Sem carta",
  "Name a Supporter": "Diga um Apoiador",
  "Name an Item": "Diga um Item",
  "Name a Pokémon Tool": "Diga uma Ferramenta Pokémon",
  "Name a Stadium": "Diga um Estádio",
  "Name an ACE SPEC card": "Diga uma carta ÁS TÁTICO",
  "Name a Trainer card": "Diga uma carta de Treinador",
  "Name a Basic Pokémon": "Diga um Pokémon Básico",
  "Name a Basic Pokémon that is not a Pokémon ex": "Diga um Pokémon Básico que não seja Pokémon ex",
  "Name a Stage 1 Pokémon": "Diga um Pokémon de Estágio 1",
  "Name a Stage 2 Pokémon": "Diga um Pokémon de Estágio 2",
  "Name a Pokémon ex": "Diga um Pokémon ex",
  "Name a Pokémon": "Diga um Pokémon",
  "Name a Pokémon with 70 HP or less": "Diga um Pokémon com 70 PS ou menos",
  "Name a Special Energy": "Diga uma Energia Especial",
  "Name any card": "Diga qualquer carta",
  "Name a Grass Pokémon": "Diga um Pokémon do tipo Planta",
  "Name a Fire Pokémon": "Diga um Pokémon do tipo Fogo",
  "Name a Water Pokémon": "Diga um Pokémon do tipo Água",
  "Name a Lightning Pokémon": "Diga um Pokémon do tipo Raio",
  "Name a Psychic Pokémon": "Diga um Pokémon do tipo Psíquico",
  "Name a Fighting Pokémon": "Diga um Pokémon do tipo Luta",
  "Name a Darkness Pokémon": "Diga um Pokémon do tipo Escuridão",
  "Name a Metal Pokémon": "Diga um Pokémon do tipo Metal",
  "Name a Dragon Pokémon": "Diga um Pokémon do tipo Dragão",
  "Name a Colorless Pokémon": "Diga um Pokémon do tipo Incolor",
  "From top lists of any deck": "De listas top de qualquer deck",
  "From top lists of": "De listas top de",
  "Search card names": "Buscar nomes de cartas",
  "Seconds left": "Segundos restantes",
  "Card names": "Nomes de cartas",
  "Type a few letters, then tap a card.": "Digite algumas letras e toque em uma carta.",
  "No card by that name.": "Nenhuma carta com esse nome.",
  "Passed.": "Você passou.",
  "Time ran out.": "O tempo acabou.",
  "Not that kind of card.": "Não é esse tipo de carta.",
  "Fits, but fewer than 1 in 20 of those top lists run it.": "Se encaixa, mas menos de 1 em cada 20 dessas listas top a usa.",
  "Top lists that run it": "Listas top que a usam",
  "Rarest fit": "A mais rara que se encaixa",
  "Most common fit": "A mais comum que se encaixa",
  "See your score": "Ver sua pontuação",
  "Next prompt": "Próxima pergunta",
  "Your score": "Sua pontuação",
  "Today's score stays": "A pontuação de hoje continua",
  "Best pull:": "Melhor carta:",
  "Best pull": "Melhor carta",
  "New prompts tomorrow.": "Amanhã tem perguntas novas.",
  "Share score": "Compartilhar pontuação",
  "Play today's Rare Pull first.": "Jogue o Rare Pull de hoje primeiro.",
  // Photo deck import (test branch photo-import)
  "From a photo": "De uma foto",
  "Read a deck from a picture": "Ler um deck de uma imagem",
  "Reading your picture…": "Lendo sua imagem…",
  "Your picture stays on this device. It is never uploaded.": "Sua imagem fica neste dispositivo. Ela nunca é enviada.",
  "Pick another picture": "Escolher outra imagem",
  "Check each card against your picture. Tap Change to fix a card, or use the buttons to fix a count.": "Compare cada carta com a sua imagem. Toque em Alterar para corrigir uma carta ou use os botões para corrigir uma quantidade.",
  "Add another picture": "Adicionar outra imagem",
  "For a deck that does not fit on one screen. A card in both pictures counts once.": "Para um deck que não cabe em uma só tela. Uma carta que aparece nas duas imagens conta uma vez.",
  "Which card is this?": "Que carta é esta?",
  "This card is right": "Esta carta está certa",
  "Close matches": "Correspondências próximas",
  "Card name": "Nome da carta",
  "Not a card, remove it": "Não é uma carta, remover",
  "Check the card": "Confira a carta",
  "Check the count": "Confira a quantidade",
  "To check:": "A conferir:",
  "Every card read clearly": "Todas as cartas foram lidas com clareza",
  "of 60 cards": "de 60 cartas",
  "No Standard card by that name.": "Nenhuma carta do Padrão com esse nome.",
  "Photo import needs a connection the first time you use it.": "A importação por foto precisa de conexão na primeira vez que você a usa.",
  "This picture could not be opened. Try a screenshot saved as PNG or JPEG.": "Não foi possível abrir esta imagem. Tente uma captura de tela salva como PNG ou JPEG.",
  "No cards found in this picture. Try a screenshot of the whole deck screen, with every card and its count showing.": "Nenhuma carta encontrada nesta imagem. Tente uma captura da tela inteira do deck, com cada carta e sua quantidade à vista.",
  "No cards found in this picture.": "Nenhuma carta encontrada nesta imagem.",
  "List added. Check it, then tap Import and save.": "Lista adicionada. Confira e depois toque em Importar e salvar.",
  "One fewer": "Uma a menos",
  "One more": "Uma a mais",
  "Added: photo deck import": "Novo: importar deck por foto",
  "Added: copy for TCG Live": "Novo: copiar para o TCG Live",
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
  "Large text layout fixed": "Layout com texto grande corrigido",
  "Added: in-app dialogs": "Novo: avisos próprios do app",
  "Added: fold sections": "Novo: seções recolhíveis",
  "Added: 6 deck guides": "Novo: 6 guias de decks",
  "Added: 5 deck guides": "Novo: 5 guias de decks",
  "Added: creator kit guide": "Novo: guia do kit para criadores",
  "Added: first deck guide": "Novo: guia para montar seu primeiro deck",
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
  "Read the guide": "Ler o guia",
  "Can Your Deck Win?": "Seu deck pode vencer?",
  "Free Pokémon TCG Deck Checker": "Avaliador de decks de Pokémon TCG grátis",
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
  "RdyDeck is a free Pokémon TCG deck checker and prize trainer. Paste a list from Pokémon TCG Live or Limitless to see how well the cards work together, what to fix first, your opening odds and which cards rotate out of Standard next. Grades are based on your cards and, for known decks, results from online and local in-person events.": "O RdyDeck é um avaliador de decks de Pokémon TCG e treinador de cartas de Prêmio, grátis. Cole uma lista do Pokémon TCG Live ou do Limitless para ver se as cartas funcionam bem juntas, o que corrigir primeiro, suas chances de abertura e quais cartas saem do Padrão na próxima rotação. A nota se baseia nas suas cartas e, em decks conhecidos, nos resultados de torneios online e presenciais locais.",
  "Then practice the deck: name your six prize cards, draw opening hands, run drills and keep notes on your matchups. Decks stay in your browser, it works offline and there is no account to make.": "Depois treine o deck: descubra suas seis cartas de Prêmio, compre mãos iniciais, faça treinos e anote seus confrontos. Os decks ficam no seu navegador, funciona offline e não é preciso criar conta.",
  "Questions about RdyDeck": "Perguntas sobre o RdyDeck",
  "What is RdyDeck?": "O que é o RdyDeck?",
  "RdyDeck is a free web app for Pokémon Trading Card Game players. It grades a 60 card deck, shows its opening odds and which cards rotate out of Standard, and trains you to work out your prize cards.": "O RdyDeck é um app web grátis para jogadores de Pokémon Estampas Ilustradas. Ele avalia um deck de 60 cartas, mostra as chances de abertura e quais cartas saem do Padrão, e treina você a descobrir suas cartas de Prêmio.",
  "How does prize card training work?": "Como funciona o treino de cartas de Prêmio?",
  "RdyDeck sets some cards from your deck aside as prizes, 6 by default or 4 or 8, and you flip through the rest. Then you name the cards that are missing. You can add a time limit, and after a few games RdyDeck shows which cards you miss most.": "O RdyDeck separa algumas cartas do seu deck como prêmios, 6 por padrão ou 4 ou 8, e você passa pelo resto. Depois você diz quais cartas estão faltando. Dá para colocar limite de tempo, e depois de alguns jogos o RdyDeck mostra quais cartas você mais erra.",
  "How does the deck grade work?": "Como funciona a nota do deck?",
  "The grade is out of 10. Synergy checks that the cards support each other: attackers can pay for their attacks, evolutions have what they evolve from, and the deck can draw and search. Power checks that the plan can win: how hard it hits, how many prizes it gives up and how fast it sets up. The grade is Synergy times Power, divided by 10, so the weaker one pulls the grade down. One part of Synergy, how tightly the list fits together, lowers the grade only when the fit is loose, so a focused list can grade a little above Synergy times Power. When the deck matches an archetype from recent online and local in-person tournaments, part of the grade, up to half once it has 250 games, comes from that archetype's results. Each grade shows its own math and comes with a short list of what to fix first.": "A nota vai de 0 a 10. Sinergia verifica se as cartas se apoiam: os atacantes conseguem pagar os ataques, as evoluções têm de onde evoluir e o deck consegue comprar e buscar. Poder verifica se o plano consegue vencer: quanto dano causa, quantos prêmios entrega e quão rápido monta o jogo. A nota é o produto de Sinergia e Poder, dividido por 10, então o valor mais baixo dos dois puxa a nota para baixo. Uma parte da Sinergia, o quanto a lista é coesa, só baixa a nota quando a lista está espalhada, então uma lista focada pode ficar um pouco acima do produto de Sinergia e Poder. Quando o deck corresponde a um arquétipo de torneios online e presenciais locais recentes, parte da nota, até a metade quando há 250 partidas, vem dos resultados desse arquétipo. Cada nota mostra o próprio cálculo e traz uma lista curta do que corrigir primeiro.",
  "How does the rotation check work?": "Como funciona a verificação de rotação?",
  "RdyDeck reads each card's regulation mark and shows which cards are not Standard legal now, which may rotate next, and which are safe. A card counts as safe only when its mark is confirmed, and a deck with cards that are not legal now grades 4.9 at most. An older printing still counts when a reprint with the same name, attacks and Abilities is legal now, so old art is fine.": "O RdyDeck lê a marca de regulamentação de cada carta e mostra quais não são legais no Padrão agora, quais podem rotacionar na próxima e quais estão seguras. Uma carta só conta como segura quando a marca está confirmada, e um deck com cartas que não são legais agora fica com nota 4.9 no máximo. Uma impressão antiga ainda vale quando existe uma reimpressão legal com o mesmo nome, ataques e Habilidades, então a arte antiga também vale.",
  "Which deck lists can I import?": "Quais listas posso importar?",
  "Paste an export from Pokémon TCG Live or a list from Limitless TCG, one card per line with the count, name, set code and number. Starter decks are built in if you want to try it first.": "Cole uma exportação do Pokémon TCG Live ou uma lista do Limitless TCG, uma carta por linha com a quantidade, o nome, o código da coleção e o número. Há decks iniciais prontos se quiser testar primeiro.",
  "Is RdyDeck free? Do I need an account?": "O RdyDeck é grátis? Preciso de conta?",
  "RdyDeck is free and has no account. Your decks stay in your browser on your own device, it works offline once it has loaded, and you can install it to your home screen.": "O RdyDeck é grátis e não tem conta. Seus decks ficam no navegador do seu próprio aparelho, funciona offline depois de carregado e você pode instalar na tela inicial.",
  "Unofficial fan-made app. Not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company. Card names, text and images are © The Pokémon Company, Nintendo, Creatures and GAME FREAK.": "App não oficial feito por fãs. Sem afiliação com Nintendo, Creatures, GAME FREAK ou The Pokémon Company. Nomes, textos e imagens das cartas são © The Pokémon Company, Nintendo, Creatures e GAME FREAK.",
  "Deck checker": "Avaliador de decks",
  "Opening odds": "Chances de abertura",
  "Prize trainer": "Treino de prêmios",
  "Goldfish guide": "Guia de Goldfish",
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
  "This sends your message straight to us. Please leave out your name and contact details. Under 13? Ask a parent to send it.": "Isso envia sua mensagem direto para nós. Não inclua seu nome nem seus dados de contato. Tem menos de 13 anos? Peça para um responsável enviar.",
  "Send by email": "Enviar por e-mail",
  "Copy message": "Copiar mensagem",
  "Send": "Enviar",
  "Send it by email, or copy it and write to us.": "Envie por e-mail, ou copie e escreva para nós.",
  "Try again": "Tentar de novo",
  "Sending": "Enviando",
  "Write a few words first.": "Escreva algo primeiro.",
  "You're offline. Try again when you're connected, or send it by email.": "Você está sem conexão. Tente de novo quando tiver conexão, ou envie por e-mail.",
  "Thanks, it's sent": "Obrigado, foi enviado",
  "We read every message.": "Lemos todas as mensagens.",
  "Too many messages right now. Wait a minute and try again, or send it by email.": "Mensagens demais agora. Espere um minuto e tente de novo, ou envie por e-mail.",
  "It didn't send. Try again, or send it by email.": "Não foi enviado. Tente de novo, ou envie por e-mail.",
  "Copied. Paste it into an email to support@rdydeck.com.": "Copiado. Cole em um e-mail para support@rdydeck.com.",
  "Could not copy. Write to support@rdydeck.com.": "Não foi possível copiar. Escreva para support@rdydeck.com.",
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
  "Each has its own tab on a deck. Hand can goldfish your first three turns, and Sparring plays five turns against a computer opponent with a tournament deck or your own. Drills has resource counts and an opponent prize read. Notes keeps matchup plans, an edit log of every card change, and a compare view. Card art you have seen is saved for offline play.": "Cada um tem sua aba no deck. Mão faz goldfish dos seus três primeiros turnos, e Sparring joga cinco turnos contra um oponente do computador com um deck de torneio ou o seu. Treinos tem contagem de recursos e leitura dos prêmios do oponente. Notas guarda planos de confronto, um histórico de cada mudança de cartas e uma comparação. A arte das cartas que você já viu fica salva para jogar offline.",
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
  "Copy list for TCG Live": "Copiar lista para o TCG Live",
  "List copied. Paste it into TCG Live's deck import.": "Lista copiada. Cole-a ao importar um deck no TCG Live.",
  "Your browser blocked the copy. Press and hold the list, choose Select all, then Copy.": "Seu navegador bloqueou a cópia. Toque e segure a lista, escolha Selecionar tudo e depois Copiar.",
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
  "7 and up": "7 ou mais",
  "No tournament results match this deck yet, so a grade of 7 and up is called Strong.": "Nenhum resultado de torneio corresponde a este deck ainda, então uma nota de 7 ou mais é chamada de Forte.",
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
  "Right now Synergy is what holds it back.": "No momento, a Sinergia é o que segura a nota.",
  "Right now Power is what holds it back.": "No momento, o Poder é o que segura a nota.",
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
  "The card grade is Synergy times Power, divided by 10. How tightly the list fits together lowers Synergy in full, but lowers the grade only when the fit is loose. When your deck matches an archetype from recent online and local in-person tournaments, part of the grade comes from that archetype's win rate and finishes: more of it the more games there are, up to half at 250 games, and none while cards are not Standard legal. The sentence under the grade shows how much. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "A nota das cartas é o produto de Sinergia e Poder, dividido por 10. O quanto a lista é coesa baixa a Sinergia por inteiro, mas só baixa a nota quando a lista está espalhada. Quando seu deck corresponde a um arquétipo de torneios online e presenciais locais recentes, parte da nota vem da taxa de vitória e dos resultados desse arquétipo: mais quanto mais partidas houver, até a metade com 250 partidas, e nada enquanto houver cartas que não são legais no Padrão. A frase abaixo da nota mostra quanto vem daí. Os papéis das cartas são lidos do texto da carta, que quase sempre acerta e às vezes não. Leia os achados e não se preocupe com a casa decimal.",
  "No card data for this deck yet.": "Ainda não há dados das cartas deste deck.",
  "These could not be looked up, so they count for nothing in the grade. Opening the deck again while online tries again.": "Não deu para consultar essas cartas, então elas não contam na nota. Abrir o deck de novo com internet tenta outra vez.",
  "Grade history": "Histórico de notas",
  "Upgrades": "Melhorias",
  "Upgrades show once the list follows the deck rules. Fix first says what to change.": "As melhorias aparecem quando a lista segue as regras do deck. “Corrija primeiro” diz o que mudar.",
  "Upgrades show once every card in the list is Standard legal.": "As melhorias aparecem quando todas as cartas da lista são legais no Padrão.",
  "Upgrades show once the card data for this list has loaded.": "As melhorias aparecem quando os dados das cartas desta lista terminam de carregar.",
  "Upgrades could not be worked out for this list just now. Open the deck again to retry.": "Não foi possível calcular as melhorias desta lista agora. Abra o deck de novo para tentar outra vez.",
  "Upgrades need a connection the first time, to read the cards to try.": "As melhorias precisam de internet na primeira vez, para ler as cartas a testar.",
  "Checking which card swaps raise this grade.": "Verificando quais trocas de cartas sobem esta nota.",
  "No single swap raises this grade, its Synergy or its Power.": "Nenhuma troca de uma só carta aumenta esta nota, nem a Sinergia nem o Poder.",
  "What Fix first lists needs more than one card changed.": "O que «Corrija primeiro» indica precisa de mais de uma carta trocada.",
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
  "are expected to leave Standard in": "devem sair do Padrão em",
  "leave Standard in": "saem do Padrão em",
  "). For a Pokémon, the reprint needs the same name, attacks and Abilities. The marks come from the card database, so check a card you are unsure of before an event.": "). Para um Pokémon, a reimpressão precisa ter o mesmo nome, ataques e Habilidades. As marcas vêm do banco de dados de cartas, então confira qualquer carta de que tiver dúvida antes de um evento.",
  "A card with an older mark stays legal while a reprint with a legal mark exists (": "Uma carta com marca antiga continua legal enquanto existir uma reimpressão com marca legal (",
  "Pokémon has not announced it yet (": "A Pokémon Company ainda não anunciou (",
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
  "Opening 7 with no Basic": "Mão inicial de 7 sem Básico",
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
  "Matchup win rates are not here. They are on the Grade tab, in Against the meta, from recent online and local in-person tournaments. Everything on this tab comes from shuffling your own list.": "As taxas de vitória por confronto não estão aqui. Elas ficam na aba Nota, em Contra o meta, a partir de torneios online e presenciais locais recentes. Tudo nesta aba vem de embaralhar sua própria lista.",
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
  "Goldfish (3 Turns)": "Goldfish (3 turnos)",
  "Sparring (5 Turns)": "Sparring (5 turnos)",
  "Sparring": "Sparring",
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
  "Tap a card in your hand to play it. Tap a Pokémon in play to retreat, use its Ability or attack. An attack ends your turn.": "Toque em uma carta da sua mão para jogá-la. Toque em um Pokémon em jogo para recuar, usar a Habilidade dele ou atacar. Um ataque encerra o seu turno.",
  "Add a damage counter": "Adicionar um contador de dano",
  "Remove a damage counter": "Remover um contador de dano",
  "No damage on it": "Sem dano",
  "Attacks start on turn 1.": "Os ataques começam no turno 1.",
  "Your turn has ended.": "Seu turno terminou.",
  "Only your Active Pokémon can attack.": "Só o seu Pokémon Ativo pode atacar.",
  "The player going first cannot attack on turn 1.": "Quem joga primeiro não pode atacar no turno 1.",
  "Not enough Energy attached.": "Não há Energia ligada suficiente.",
  "It cannot use this attack this turn, because of the attack it used last turn.": "Ele não pode usar este ataque neste turno, por causa do ataque que usou no turno passado.",
  "No attack text read yet. Open this deck online to read it.": "O texto do ataque ainda não foi lido. Abra este deck online para ler.",
  "No card text read yet. Open this deck online to read it.": "O texto da carta ainda não foi lido. Abra este deck online para ler.",
  "The app cannot follow all of this attack yet, so you finish it by hand.": "O app ainda não consegue seguir este ataque inteiro, então você termina à mão.",
  "The app cannot follow this card's text yet, so playing it lets you do it by hand.": "O app ainda não consegue seguir o texto desta carta, então ao jogá-la você faz à mão.",
  "During setup only Basic Pokémon go into play.": "Na preparação só entram em jogo Pokémon Básicos.",
  "Nothing to do with this card now.": "Nada a fazer com esta carta agora.",
  "Make Active and play on in Goldfish": "Colocar como Ativo e seguir no Goldfish",
  "Only Basic Pokémon go into play before turn 1. Tap a Basic to play this hand on in Goldfish.": "Antes do turno 1 só entram em jogo Pokémon Básicos. Toque em um Básico para seguir com esta mão no Goldfish.",
  "On schedule": "No prazo",
  "A turn behind": "Um turno atrasado",
  "You draw every turn, one Energy and one Supporter a turn, no Supporter and no attack on turn 1 going first, and no evolving on your first turn or onto a Pokémon that came in this turn. Abilities, attacks, Items, Supporters and Stadiums do what their card text says, with each card's own limits, and an attack ends your turn. Damage stays on your Pokémon, and a Pokémon is Knocked Out when its damage reaches its HP. There is no opponent, so effects on your opponent do nothing here. When the app cannot follow a card yet, it shows the text and you use Draw, Search, Discard and the damage counter buttons.": "Você compra todo turno, uma Energia e um Apoiador por turno, sem Apoiador e sem ataque no turno 1 para quem joga primeiro, e sem evoluir no seu primeiro turno ou em um Pokémon que entrou neste turno. Habilidades, ataques, Itens, Apoiadores e Estádios fazem o que diz o texto, com os limites de cada carta, e um ataque encerra o seu turno. O dano fica nos seus Pokémon, e um Pokémon é Nocauteado quando o dano chega aos PS dele. Não há oponente, então efeitos no oponente não fazem nada aqui. Quando o app ainda não consegue seguir uma carta, ele mostra o texto e você usa Comprar, Buscar, Descartar e os botões de contadores de dano.",
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
  "Six cards go face down and you name them.": "Seis cartas ficam viradas para baixo e você diz quais são.",
  "Four cards go face down and you name them.": "Quatro cartas ficam viradas para baixo e você diz quais são.",
  "No part of it comes from results while cards are not Standard legal. Card roles are read from card text, which is usually right and sometimes not. Read the findings and do not worry about the decimal place.": "Nenhuma parte vem dos resultados enquanto houver cartas que não são legais no Padrão. Os papéis das cartas são lidos do texto da carta, que quase sempre acerta e às vezes não. Leia os achados e não se preocupe com a casa decimal.",
  "Prize game moved to Drills": "Jogo de prêmios movido para Treinos",
  "Grade explainer moved to Questions": "Explicação da nota movida para Perguntas",
  "Desktop layout improved": "Layout para computador melhorado",
  "Deck tabs reordered": "Abas do deck reordenadas",
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
  "Find a deck": "Procurar um deck",
  "TCGplayer market prices in US dollars, from TCGdex.": "Preços de mercado do TCGplayer em dólares americanos, do TCGdex.",
  "Clear search": "Limpar busca",
  "Sort decks": "Ordenar decks",
  "Your order": "Sua ordem",
  "Best grade": "Melhor nota",
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
  "The grade is Synergy times Power, divided by 10.": "A nota é o produto de Sinergia e Poder, dividido por 10.",
  "Synergy under 0.6 counts as 0.6.": "Sinergia abaixo de 0.6 conta como 0.6.",
  "Power under 1.2 counts as 1.2.": "Poder abaixo de 1.2 conta como 1.2.",
  "If that is the wrong deck, pick the right one under Against the meta.": "Se esse não for o deck certo, escolha o certo em Contra o meta.",
  "There are few games so far, so results count for little.": "Ainda há poucas partidas, então os resultados contam pouco.",
  "No online tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Ainda não há resultados de torneios online que correspondam a este deck, então a nota lê só as cartas e não consegue ver como a lista se sai em partidas reais.",
  "No online or local in-person tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Ainda não há resultados de torneios online nem presenciais locais que correspondam a este deck, então a nota lê só as cartas e não consegue ver como a lista se sai em partidas reais.",
  "No local in-person tournament results match this deck yet, so the grade reads the cards alone and cannot see how the list does in real games.": "Ainda não há resultados de torneios presenciais locais que correspondam a este deck, então a nota lê só as cartas e não consegue ver como a lista se sai em partidas reais.",
  "Until it has results, it is not called Tournament-ready.": "Até ter resultados, ele não é chamado de Pronto para torneio.",
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
  "Lists as posted on Limitless (limitlesstcg.com).": "Listas como foram publicadas no Limitless (limitlesstcg.com).",
  "Or write to support@rdydeck.com": "Ou escreva para support@rdydeck.com",
  "Same list, same numbers.": "Mesma lista, mesmos números.",
  "Tab": "Tab",
  "Enter": "Enter",
  "Esc": "Esc",
  "No card moves your opponent's Benched Pokemon into the Active Spot, like Boss's Orders or Prime Catcher, so you can only Knock Out what they choose to put there. Some decks skip it on purpose, but most run 2 to 4.": "Nenhuma carta move um Pokémon no Banco do oponente para o Campo Ativo, como Boss's Orders ou Prime Catcher, então você só consegue Nocautear o que ele escolher colocar lá. Alguns decks deixam de fora de propósito, mas a maioria usa de 2 a 4.",
  "Nothing in the list searches your deck for a Pokemon, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin, so getting your attackers into play rests on drawing them.": "Nada na lista busca um Pokémon no seu deck, como Ultra Ball, Poké Pad ou Buddy-Buddy Poffin, então colocar seus atacantes em jogo depende de comprá-los.",
  "Enough Rare Candy to land your Stage 2 Pokemon before the game runs away.": "Rare Candy suficiente para colocar seus Pokémon de Estágio 2 antes de o jogo fugir do controle.",
  "Nothing reliably refills your hand. The deck stalls as soon as your opening cards run dry.": "Nada reabastece sua mão com confiança. O deck trava assim que as cartas iniciais acabam.",
  "Nothing in the list draws cards. It can search the deck for what it needs, but a hand that misses still stays bad, so the deck stalls more often than one with draw.": "Nada na lista compra cartas. Ela pode procurar no deck o que precisa, mas uma mão ruim continua ruim, então o deck trava mais vezes do que um que compra cartas.",
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
  // 3.3.6: De-bling.
  "Added: De-bling button": "Novo: botão Baratear",
  "Rare Candy bug fixed": "Erro do Rare Candy corrigido",
  "Added: Goldfish damage and attacks": "Novo: dano e ataques no Goldfish",
  "Added: tap a card to play it": "Novo: toque em uma carta para jogá-la",
  "Goldfish is now 5 turns": "Goldfish agora tem 5 turnos",
  "Goldfish is back to 3 turns": "Goldfish volta a ter 3 turnos",
  "De-bling": "Baratear",
  "Undo de-bling": "Desfazer Baratear",
  "Swap each card to its cheapest printing that plays the same": "Troca cada carta pela impressão mais barata que joga igual",
  "Put back the printings the list had before": "Volta às impressões que a lista tinha antes",
  "Finding the cheapest printings…": "Buscando as impressões mais baratas…",
  "These cards now use their cheapest printing that plays the same. Each line shows what it saves.": "Estas cartas agora usam a impressão mais barata que joga igual. Cada linha mostra quanto você economiza.",
  "Estimated savings:": "Economia estimada:",
  "1 card has no price to compare, so it stays as it is.": "1 carta não tem preço para comparar, então fica como está.",
  "Turn prices on in Settings to use De-bling.": "Ative os preços nas Configurações para usar Baratear.",
  "De-bling could not load its card list. Try again when you are online.": "Baratear não conseguiu carregar a lista de cartas. Tente de novo quando estiver online.",
  "Prices could not be read. Try again when you are online.": "Não foi possível ler os preços. Tente de novo quando estiver online.",
  "No cheaper printing with a price was found.": "Nenhuma impressão mais barata com preço foi encontrada.",
  "Every card is already its cheapest printing.": "Todas as cartas já estão na impressão mais barata.",
  "The list changed since, so there is nothing to undo.": "A lista mudou depois disso, então não há nada para desfazer.",
  "De-bling undone.": "Baratear desfeito.",
  // 3.3.9: puzzle score share.
  "Puzzle deck search fixed": "Busca no deck do puzzle corrigida",
  "Added: share your puzzle score": "Novo: compartilhe seu resultado do puzzle",
  "Added: goldfish guide": "Novo: guia de Goldfish",
  "Added: Sparring": "Novo: Sparring",
  "Sparring plays your saved decks": "Sparring joga com seus decks salvos",
  "Sparring bugs fixed": "Erros do Sparring corrigidos",
  "Sparring shows cards and both boards": "O Sparring mostra as cartas e os dois tabuleiros",
  "Brilliant Blender fixed": "Brilliant Blender corrigido",
  "Sparring: discard piles and deck search": "Sparring: pilhas de descarte e busca no deck",
  "Sparring Tool and Energy fixes": "Sparring: correções de Ferramentas e Energias",
  "Sparring shows Energy on matching Pokémon": "Sparring mostra a Energia de Pokémon iguais",
  "Sparring search opens with cards you can take": "A busca do Sparring mostra primeiro as cartas que você pode pegar",
  "Sparring Energy and game log fixes": "Correções de Energia e do registro da partida no Sparring",
  "Fairer grades for decks with no draw cards": "Notas mais justas para decks sem cartas de compra",
  "Grades now count local store events": "As notas agora contam eventos locais em lojas",
  "Sparring game log fixes": "Correções no registro da partida do Sparring",
  "Clearer grade text when showing local results": "Texto da nota mais claro ao ver resultados locais",
  "Share card art fixed for 30th Celebration": "Imagem da carta corrigida no cartão de compartilhar da 30th Celebration",
  "New daily game: Rare Pull": "Novo jogo diário: Rare Pull",
  "Added: watch out for box": "Novo: quadro Cuidado com",
  "Share your puzzle score": "Compartilhe seu resultado do puzzle",
  "The link opens today's puzzle, so friends play the same board.": "O link abre o puzzle de hoje, então seus amigos jogam o mesmo tabuleiro.",
  "Play today's puzzle first.": "Jogue primeiro o puzzle de hoje.",
  "Score and link copied. Paste it anywhere.": "Resultado e link copiados. Cole onde quiser.",
  "Could not copy. Try Share instead.": "Não deu para copiar. Tente Compartilhar.",
  "Save image": "Salvar imagem",
  "Wide": "Larga",
  "Square": "Quadrada",
  "Picture size": "Tamanho da imagem",
};
/* I18N_DICT_END */

// Text that holds numbers or names: [regex on the whole squeezed string, Spanish, Portuguese].
// A replacement is a string with $1, $2 or a function (match, ...groups). Dates (13 Nov 2026,
// April 2027, Nov 12) and ordinals (1st, 2nd) in the result are put into the language after.
// i18nTr(s) translates a captured part when it is UI text (it returns s unchanged otherwise).
const I18N_PAT = [
  // Rare Pull
  [/^(\d+) cards fit$/, "Valen $1 cartas", "Valem $1 cartas"],
  [/^(\d+) day streak$/, "Racha de $1 días", "Sequência de $1 dias"],
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
  [/^(\d+(?:st|nd|rd|th)), ([^,]+), ([^,]+(?:, \d{4})?)\. Played by (.+?)(?:, (\d+) cards)?$/, (m, p, e, d, b, n) => `${p}, ${e}, ${d}. Jugado por ${b}` + (n ? `, ${n} cartas` : ''), (m, p, e, d, b, n) => `${p}, ${e}, ${d}. Jogado por ${b}` + (n ? `, ${n} cartas` : '')],
  [/^(\d+(?:st|nd|rd|th)) of (\d+)$/, '$1 de $2', '$1 de $2'],
  [/^(\d+) to fix$/, '$1 por corregir', '$1 para corrigir'],
  [/^(\d+) cards? not read$/, (m, n) => n === '1' ? '1 carta sin leer' : n + ' cartas sin leer', (m, n) => n === '1' ? '1 carta não lida' : n + ' cartas não lidas'],
  [/^(\d+) more$/, '$1 más', 'Mais $1'],
  [/^(\d+) more to fix$/, '$1 más por corregir', 'Mais $1 para corrigir'],
  [/^(\d+) safe card names?$/, (m, n) => n + (n === '1' ? ' nombre de carta seguro' : ' nombres de carta seguros'), (m, n) => n + (n === '1' ? ' nome de carta seguro' : ' nomes de carta seguros')],
  [/^Show all (\d+) cards$/, 'Mostrar las $1 cartas', 'Mostrar todas as $1 cartas'],
  [/^(\d+) in list$/, '$1 en la lista', '$1 na lista'],
  [/^(\d+) still in deck or hand$/, '$1 aún en la baraja o la mano', '$1 ainda no deck ou na mão'],
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
  [/^(\d+) cards? not confirmed as Standard legal$/, (m, n) => n + (n === '1' ? ' carta sin confirmar como legal en Estándar' : ' cartas sin confirmar como legales en Estándar'), (m, n) => n + (n === '1' ? ' carta não confirmada como legal no Padrão' : ' cartas não confirmadas como legais no Padrão')],
  [/^Check the regulation mark on (.+) before an event\. The card database could not confirm (it|them), so the grade counts (?:it|them) as legal for now\.$/, (m, l, o) => 'Revisa la marca de regulación de ' + l.replace(/ and (\d+) more$/, ' y $1 más') + ' antes de un evento. La base de datos de cartas no pudo ' + (o === 'it' ? 'confirmarla, así que la calificación la cuenta como legal por ahora.' : 'confirmarlas, así que la calificación las cuenta como legales por ahora.'), (m, l, o) => 'Confira a marca de regulamento de ' + l.replace(/ and (\d+) more$/, ' e mais $1') + ' antes de um evento. O banco de dados de cartas não conseguiu ' + (o === 'it' ? 'confirmá-la, então a nota a conta como legal por enquanto.' : 'confirmá-las, então a nota as conta como legais por enquanto.')],
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
  [/^Fix first shows the (\d+) problems found\.$/, 'En Corrige primero verás los $1 problemas encontrados.', 'Corrija primeiro mostra os $1 problemas encontrados.'],
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
  [/^Setup: (.+)$/, 'Preparación: $1', 'Preparação: $1'],
  [/^Abilities: (.+)$/, (m, x) => 'Habilidades: ' + x.replace(/ and more$/, ' y más'), (m, x) => 'Habilidades: ' + x.replace(/ and more$/, ' e mais')],
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
  [/^This list's cards next to how (.+) decks do in Limitless (online|online and local in-person|local in-person) tournaments\.$/, (m, d, k) => 'Las cartas de esta lista junto a cómo les va a las barajas de ' + d + ' en los torneos ' + ({'online': 'online', 'online and local in-person': 'online y presenciales locales', 'local in-person': 'presenciales locales'})[k] + ' de Limitless.', (m, d, k) => 'As cartas desta lista ao lado de como os decks de ' + d + ' se saem nos torneios ' + ({'online': 'online', 'online and local in-person': 'online e presenciais locais', 'local in-person': 'presenciais locais'})[k] + ' do Limitless.'],
  [/^How decks like this one did in (\d+) Limitless (online|online and local in-person|local in-person) tournaments, since (.+) came out \((.+) to (.+)\)\.$/, (m, n, k, s, a, b) => 'Cómo les fue a barajas como esta en ' + n + ' torneos ' + ({'online': 'online', 'online and local in-person': 'online y presenciales locales', 'local in-person': 'presenciales locales'})[k] + ' de Limitless, desde que salió ' + s + ' (' + a + ' a ' + b + ').', (m, n, k, s, a, b) => 'Como decks como este se saíram em ' + n + ' torneios ' + ({'online': 'online', 'online and local in-person': 'online e presenciais locais', 'local in-person': 'presenciais locais'})[k] + ' do Limitless, desde que saiu ' + s + ' (' + a + ' a ' + b + ').'],
  [/^of (\d+) matches against other decks \((\d+) wins, (\d+) losses, (\d+) ties\)\.$/, 'de $1 partidas contra otras barajas ($2 victorias, $3 derrotas, $4 empates).', 'de $1 partidas contra outros decks ($2 vitórias, $3 derrotas, $4 empates).'],
  [/^decks, counting wins and how high lists finish\. Its (\d+) lists finished in the top (\d+)% of the field on average, and (\d+) made the top 16, where an average deck with as many lists places (\d+)\.$/, 'barajas, contando victorias y qué tan alto terminan las listas. Sus $1 listas terminaron en promedio en el $2% superior, y $3 llegaron al top 16, mientras que una baraja promedio con tantas listas metería $4.', 'decks, contando vitórias e quão alto as listas terminam. As $1 listas dele terminaram em média entre os $2% melhores, e $3 chegaram ao top 16, enquanto um deck médio com tantas listas emplacaria $4.'],
  [/^This is the same list, card for card, that finished (\d+(?:st|nd|rd|th)) at (.+) on (\d+ \w+ \d{4})\.( That list was played as (.+)\.)?$/, (m, p, e, d, x, n) => 'Es la misma lista, carta por carta, que terminó ' + p + ' en ' + e + ' el ' + d + '.' + (x ? ' Esa lista se jugó como ' + n + '.' : ''), (m, p, e, d, x, n) => 'É a mesma lista, carta por carta, que terminou em ' + p + ' no ' + e + ' em ' + d + '.' + (x ? ' Essa lista foi jogada como ' + n + '.' : '')],
  [/^Favored against (.+), unfavored against (.+)\.$/, (m, a, b) => 'Favorable contra ' + a.replace(/ and /g, ' y ') + ', desfavorable contra ' + b.replace(/ and /g, ' y ') + '.', (m, a, b) => 'Favorecido contra ' + a.replace(/ and /g, ' e ') + ', desfavorecido contra ' + b.replace(/ and /g, ' e ') + '.'],
  [/^(Favored|Unfavored) against (.+)\.$/, (m, f, a) => (f === 'Favored' ? 'Favorable' : 'Desfavorable') + ' contra ' + a.replace(/ and /g, ' y ') + '.', (m, f, a) => (f === 'Favored' ? 'Favorecido' : 'Desfavorecido') + ' contra ' + a.replace(/ and /g, ' e ') + '.'],
  [/^([\d.]+%), (\d+) matches?$/, '$1, $2 partidas', '$1, $2 partidas'],
  [/^Top (\d+) decks right now$/, 'Las $1 mejores barajas ahora', 'Os $1 melhores decks agora'],
  [/^Limitless online tournaments, (\d+) events and (\d+) players in the last (\d+) days, as of (.+)\.$/, 'Torneos online de Limitless, $1 eventos y $2 jugadores en los últimos $3 días, hasta el $4.', 'Torneios online do Limitless, $1 eventos e $2 jogadores nos últimos $3 dias, em $4.'],
  [/^Data as of (.+), updated weekly\.$/, 'Datos del $1, actualizados cada semana.', 'Dados de $1, atualizados toda semana.'],
  [/^Data as of (.+), built into this version\.$/, 'Datos del $1, incluidos en esta versión.', 'Dados de $1, incluídos nesta versão.'],
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
  [/^Helps pay Energy costs for (?!.*, \d+ of the \d+ cards that do\.$)(.+)\.$/, 'Ayuda a pagar los costes de Energía de $1.', 'Ajuda a pagar os custos de Energia de $1.'],
  [/^Key targets: (.+)\.$/, (m, a) => 'Objetivos clave: ' + a.replace(/ and ([^,]+)$/, ' y $1') + '.', (m, l) => 'Alvos principais: ' + l.replace(/ and ([^,]+)$/, ' e $1') + '.'],
  [/^ACE SPEC: (.+)$/, 'AS TÁCTICO: $1', 'ÁS TÁTICO: $1'],
  [/^Ready by turn 2: (.+)$/, 'Listo para el turno 2: $1', 'Pronto até o turno 2: $1'],
  [/^(.+) ready by turn 2: (\d+)% to (\d+)%$/, '$1 listo para el turno 2: $2% a $3%', '$1 pronto até o turno 2: $2% a $3%'],
  [/^Line locked in prizes: (<?[\d.]+%)$/, 'Línea atascada en premios: $1', 'Linha presa nos prêmios: $1'],
  [/^Stuck in prizes: (<?[\d.]+%)$/, 'Bloqueo por premios: $1', 'Presa nos prêmios: $1'],
  [/^How many Basic Pokemon your kept opening hand holds \((\d+) in the list\), and how often each one is there for the Active Spot\.$/, 'Cuántos Pokémon Básicos tiene tu mano inicial (hay $1 en la lista), y qué tan seguido está cada uno para el Puesto Activo.', 'Quantos Pokémon Básicos tem a mão inicial que você mantém ($1 na lista), e com que frequência cada um está lá para o Campo Ativo.'],
  [/^([\d.]+) to ([\d.]+)$/, '$1 a $2', '$1 a $2'],
  [/^((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}|\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2})$/, m => i18nGtDate(m, 'es') || m, m => i18nGtDate(m, 'pt') || m],
  [/^Synergy shows ([\d.]+) after a cut for how tightly the list fits, but that cut lowers the grade only when the fit is loose, so the grade uses Synergy before the cut, ([\d.]+): ([\d.]+) times ([\d.]+), divided by 10, is ([\d.]+)\.$/, 'Sinergia muestra $1 tras un recorte por lo compacta que es la lista, pero ese recorte solo baja la calificación cuando la lista está dispersa, así que la calificación usa Sinergia antes del recorte, que es $2: $3 por $4 entre 10 da $5.', 'A Sinergia mostra $1 depois de um corte pela coesão da lista, mas esse corte só baixa a nota quando a lista está espalhada, então a nota usa a Sinergia antes do corte, que é $2: $3 vezes $4 dividido por 10 dá $5.'],
  [/^The grade is Synergy times Power, divided by 10, so the weaker one pulls the whole grade down: ([\d.]+) times ([\d.]+), divided by 10, is ([\d.]+)\.$/, 'La calificación es el producto de Sinergia y Poder, dividido entre 10, así que el valor más bajo de los dos arrastra toda la calificación hacia abajo: $1 por $2 entre 10 da $3.', 'A nota é o produto de Sinergia e Poder, dividido por 10, então o valor mais baixo dos dois puxa a nota toda para baixo: $1 vezes $2 dividido por 10 dá $3.'],
  [/^(\d+)% of the grade comes from (.+)'s online tournament results(?: since (.+?))?(?: \(as of (.+?)\))?: ([\d.]+%) wins over ([\d,]+) games(, with games since the newest set counted three times)?\.$/, (m, p, n, s, a, w, g, x) => p + '% de la calificación viene de los resultados de ' + n + ' en torneos online' + (s ? ' desde ' + s : '') + (a ? ' (hasta el ' + a + ')' : '') + ': ' + w + ' de victorias en ' + g + ' partidas' + (x ? ', con las partidas desde la expansión más reciente contadas tres veces' : '') + '.', (m, p, n, s, a, w, g, x) => p + '% da nota vem dos resultados de ' + n + ' em torneios online' + (s ? ' desde ' + s : '') + (a ? ' (em ' + a + ')' : '') + ': ' + w + ' de vitórias em ' + g + ' partidas' + (x ? ', com as partidas desde a coleção mais nova contando três vezes' : '') + '.'],
  [/^Those results alone score ([\d.]+), so the list's ([\d.]+) becomes ([\d.]+)\.$/, 'Esos resultados por sí solos califican $1, así que el $2 de la lista pasa a $3.', 'Esses resultados sozinhos dão nota $1, então o $2 da lista vira $3.'],
  [/^It is held at ([\d.]+) because some cards are not Standard legal now\.$/, 'Se queda en $1 porque algunas cartas no son legales en Estándar ahora.', 'Fica em $1 porque algumas cartas não são legais no Padrão agora.'],
  [/^The first saved grade is ([\d.]+)\.$/, 'La primera calificación guardada es $1.', 'A primeira nota salva é $1.'],
  [/^Updated (.+)\.$/, 'Actualizado el $1.', 'Atualizado em $1.'],
  [/^(\w) is next by the yearly pattern: (.+?), each announced in January and gone from events in April\.$/, (m, k, p) => k + ' es la siguiente según el patrón anual: ' + p.replace(/(\w) left in (\d{4})/g, '$1 salió en $2').replace(/, (\w) in (\d{4})/g, ', $1 en $2').replace(/ and (\w) in (\d{4})/, ' y $1 en $2') + ', cada una anunciada en enero y fuera de los eventos en abril.', (m, k, p) => k + ' é a próxima pelo padrão anual: ' + p.replace(/(\w) left in (\d{4})/g, '$1 saiu em $2').replace(/, (\w) in (\d{4})/g, ', $1 em $2').replace(/ and (\w) in (\d{4})/, ' e $1 em $2') + ', cada uma anunciada em janeiro e fora dos eventos em abril.'],
  [/^Legal now: (\w) mark and later\.$/, 'Legal ahora: marca $1 en adelante.', 'Legal agora: marca $1 em diante.'],
  [/^The (\w(?: and \w)*) mark left on (.+?) at events and (.+?) on Live \($/, (m, k, a, b) => 'La marca ' + k.replace(' and ', ' y ') + ' salió el ' + a + ' en los eventos y el ' + b + ' en Live (', (m, k, a, b) => 'A marca ' + k.replace(' and ', ' e ') + ' saiu em ' + a + ' nos eventos e em ' + b + ' no Live ('],
  [/^(.+), any opening hand, from raw draws alone to with your search cards$/, '$1, cualquier mano inicial, de solo robos puros a con tus cartas de búsqueda', '$1, qualquer mão inicial, de só compras puras a com suas cartas de busca'],
  [/^([\d,]+) simulated shuffles of this exact (\d+) card list\.$/, (m, a, b) => a + ' mezclas simuladas de esta lista exacta de ' + b + ' cartas.', (m, a, b) => a + ' embaralhamentos simulados desta lista exata de ' + b + ' cartas.'],
  [/^Chance of at least (\d+) of (.+) by your turn (\d+) \(your first (\d+) cards\)\.$/, (m, a, l, t, f) => 'Probabilidad de al menos ' + a + ' de ' + l.replace(/ or ([^,]+)$/, ' o $1') + ' para tu turno ' + t + ' (tus primeras ' + f + ' cartas).', (m, a, l, t, f) => 'Chance de pelo menos ' + a + ' de ' + l.replace(/ or ([^,]+)$/, ' ou $1') + ' até o seu turno ' + t + ' (suas primeiras ' + f + ' cartas).'],
  [/^No Basic was read, so mulligans are not taken out\.$/, 'No se leyó ningún Básico, así que no se descuentan los mulligans.', 'Nenhum Básico foi lido, então os mulligans não são descontados.'],
  [/^Needs (.+) among your first (\d+) cards\.$/, 'Necesita $1 entre tus primeras $2 cartas.', 'Precisa de $1 entre suas primeiras $2 cartas.'],
  [/^(\d+)% is raw draws alone, the floor\.$/, '$1% es solo con robos puros, el mínimo.', '$1% é só com compras puras, o piso.'],
  [/^(\d+)% lets every search card you have in time fetch one missing piece, ignoring discard costs and the one Supporter per turn rule, so it is closer to a ceiling\.$/, '$1% supone que cada carta de búsqueda que robes a tiempo trae una pieza que falta, sin contar los costes de descarte ni la regla de un Partidario por turno, así que se acerca más a un máximo.', '$1% supõe que cada carta de busca que você comprar a tempo pega uma peça que falta, sem contar custos de descarte nem a regra de um Apoiador por turno, então fica mais perto de um teto.'],
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
  [/^No real draw engine, so the score is cut to (\d+)%\. Cards that search the deck soften the cut\.$/, 'Sin un motor de robo real, así que la puntuación se reduce al $1%. Las cartas que buscan en la baraja suavizan el recorte.', 'Sem motor de compra de verdade, então a pontuação cai para $1%. Cartas que procuram no deck suavizam o corte.'],
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
  [/^(.+) comes back$/, '$1 vuelve', '$1 volta'],
  [/^Your ACE SPEC, (.+), has nothing to work with$/, 'Tu AS TÁCTICO, $1, no tiene con qué funcionar', 'Seu ÁS TÁTICO, $1, não tem com o que funcionar'],
  [/^The list runs (\d+) Energy\. Most decks run 8 to 16, so a lot of your draws are Energy you cannot use that turn\. Trade some for draw or search cards\.$/, 'La lista lleva $1 Energías. La mayoría de las barajas lleva de 8 a 16, así que muchos de tus robos son Energía que no puedes usar ese turno. Cambia algunas por cartas de robo o de búsqueda.', 'A lista usa $1 Energias. A maioria dos decks usa de 8 a 16, então muitas das suas compras são Energia que você não consegue usar naquele turno. Troque algumas por cartas de compra ou de busca.'],
  [/^None of your Supporters draws cards or searches your deck, so once your opening hand is spent your only draw is (.+)\. Most decks run 4 or more Supporters that draw, like Lillie's Determination\.$/, (m, a) => 'Ninguno de tus Partidarios roba cartas ni busca en tu baraja, así que cuando se acaba tu mano inicial tu único robo es ' + a.replace(/ and /g, ' y ') + ". La mayoría de las barajas lleva 4 o más Partidarios que roban, como Lillie's Determination.", (m, a) => 'Nenhum dos seus Apoiadores compra cartas ou busca no deck, então quando sua mão inicial acaba sua única compra é ' + a.replace(/ and /g, ' e ') + ". A maioria dos decks usa 4 ou mais Apoiadores que compram, como Lillie's Determination."],
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
  [/^(.+?) can start the game face down in the Active Spot with (.+?) when it is in your opening hand, which happens in about (\d+)% of games, so it does not need to evolve\.$/, (m, x, a, p) => x + ' puede empezar la partida boca abajo en el Puesto Activo con ' + a + ' cuando está en tu mano inicial, lo que pasa en cerca del ' + p + '% de las partidas, así que no necesita evolucionar.', (m, x, a, p) => x + ' pode começar a partida virado para baixo no Campo Ativo com ' + a + ' quando está na sua mão inicial, o que acontece em cerca de ' + p + '% das partidas, então não precisa evoluir.'],
  [/^(.+?) can only reach the board by starting the game in the Active Spot with (.+?), and it is in your opening hand in only about (\d+)% of games\.$/, (m, x, a, p) => x + ' solo puede llegar a la mesa empezando la partida en el Puesto Activo con ' + a + ', y está en tu mano inicial en solo cerca del ' + p + '% de las partidas.', (m, x, a, p) => x + ' só consegue chegar à mesa começando a partida no Campo Ativo com ' + a + ', e está na sua mão inicial em só cerca de ' + p + '% das partidas.'],
  [/^(.+?) can also hit for (\d+), but it is in the list for its Ability, so the grade counts (\d+)\.$/, (m, x, n, c) => x + ' también puede golpear por ' + n + ', pero está en la lista por su Habilidad, así que la calificación cuenta ' + c + '.', (m, x, n, c) => x + ' também pode causar ' + n + ' de dano, mas está na lista pela Habilidade, então a nota conta ' + c + '.'],
  [/^(.+?) can also hit for (\d+), but it is in the list for its Ability, so the grade leaves that hit out\.$/, (m, x, n) => x + ' también puede golpear por ' + n + ', pero está en la lista por su Habilidad, así que la calificación no cuenta ese golpe.', (m, x, n) => x + ' também pode causar ' + n + ' de dano, mas está na lista pela Habilidade, então a nota não conta esse golpe.'],
  [/^(.+?) can also hit for (\d+), but the list plays it to set up with (.+?), so the grade counts (\d+)\.$/, (m, x, n, a, c) => x + ' también puede golpear por ' + n + ', pero en esta lista se usa para preparar la partida con ' + a + ', así que la calificación cuenta ' + c + '.', (m, x, n, a, c) => x + ' também pode causar ' + n + ' de dano, mas nesta lista ele é usado para preparar a partida com ' + a + ', então a nota conta ' + c + '.'],
  [/^(.+?) can also hit for (\d+), but the list plays it to set up with (.+?), so the grade leaves that hit out\.$/, (m, x, n, a) => x + ' también puede golpear por ' + n + ', pero en esta lista se usa para preparar la partida con ' + a + ', así que la calificación no cuenta ese golpe.', (m, x, n, a) => x + ' também pode causar ' + n + ' de dano, mas nesta lista ele é usado para preparar a partida com ' + a + ', então a nota não conta esse golpe.'],
  [/^(.+?) is in the list to set up with (.+?), which costs (\d+) Energy, so the grade leaves (.+?) out of the damage it counts\.$/, (m, x, a, n, h) => x + ' está en la lista para preparar la partida con ' + a + ', que cuesta ' + n + (n === '1' ? ' Energía' : ' Energías') + ', así que la calificación no cuenta el daño de ' + h + '.', (m, x, a, n, h) => x + ' está na lista para preparar a partida com ' + a + ', que custa ' + n + (n === '1' ? ' Energia' : ' Energias') + ', então a nota não conta o dano de ' + h + '.'],
  [/^(.+) can get you one\.$/, (m, x) => x.split(' or ').join(' o ') + (/ or /.test(x) ? ' pueden conseguirte una.' : ' puede conseguirte una.'), (m, x) => x.split(' or ').join(' ou ') + (/ or /.test(x) ? ' podem conseguir uma para você.' : ' pode conseguir uma para você.')],
  [/^No single swap raises this grade, its Synergy or its Power with the cards (.+) top lists run\.$/, (m, d) => 'Ningún cambio de una sola carta sube esta calificación, ni su Sinergia ni su Poder con las cartas que juegan las mejores listas de ' + d + '.', (m, d) => 'Nenhuma troca de uma só carta aumenta esta nota, nem a Sinergia nem o Poder com as cartas que as melhores listas de ' + d + ' usam.'],
  [/^(.+?) is here for its (.+?) Ability, not to trade hits, so use it, then move it out before your opponent can Knock it out\.$/, (m, x, a) => x + ' está aquí por su Habilidad ' + a + ', no para intercambiar golpes, así que usa la Habilidad y luego retíralo antes de que tu rival pueda dejarlo Fuera de Combate.', (m, x, a) => x + ' está aqui pela Habilidade ' + a + ', não para trocar golpes, então use a Habilidade e depois tire ele do Campo Ativo antes que o oponente consiga Nocauteá-lo.'],
  [/^(.+?) are here for their Abilities, not to trade hits, so use them, then move them out before your opponent can Knock them out\.$/, (m, x) => x.replace(/ and /g, ' y ') + ' están aquí por sus Habilidades, no para intercambiar golpes, así que usa las Habilidades y luego retíralos antes de que tu rival pueda dejarlos Fuera de Combate.', (m, x) => x.replace(/ and /g, ' e ') + ' estão aqui pelas Habilidades, não para trocar golpes, então use as Habilidades e depois tire eles do Campo Ativo antes que o oponente consiga Nocauteá-los.'],
  [/^This list is built around (.+?), which has no tournament results of its own yet, so these results are borrowed from (.+?), the closest deck that has them\.$/, (m, a, b) => 'Esta lista se arma alrededor de ' + a + ', que todavía no tiene resultados de torneo propios, así que estos resultados se toman prestados de ' + b + ', la baraja más parecida que sí los tiene.', (m, a, b) => 'Esta lista é montada em torno de ' + a + ', que ainda não tem resultados de torneio próprios, então estes resultados são emprestados de ' + b + ', o deck mais parecido que tem.'],
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
  [/^(\d+) cards have no price to compare, so they stay as they are\.$/, "$1 cartas no tienen precio para comparar, así que se quedan como están.", "$1 cartas não têm preço para comparar, então ficam como estão."],
  // 3.4: Goldfish damage counters and attacks.
  [/^Attack with (.+)$/, "Atacar con $1", "Atacar com $1"],
  [/^(\d+) damage counters? on it$/, (m, n) => n === '1' ? '1 contador de daño' : n + ' contadores de daño', (m, n) => n === '1' ? '1 contador de dano' : n + ' contadores de dano'],
  [/^of (\d+) HP$/, "de $1 PS", "de $1 PS"],
  [/^Heal (?!all )([^.\d][^.]*)$/, "Curar a $1", "Curar $1"],
  [/^Move (\d+) damage counters? from ([^.]+)$/, (m, n, x) => 'Mover ' + (n === '1' ? '1 contador' : n + ' contadores') + ' de daño de ' + x, (m, n, x) => 'Mover ' + (n === '1' ? '1 contador' : n + ' contadores') + ' de dano de ' + x],
  [/^(\d+) turns behind$/, "$1 turnos tarde", "$1 turnos atrasado"],
];

// ── 3.0 additions: grade flags, error reports, owned cards and prices, What's next, scoreboard ──
Object.assign(I18N_ES, {
  "Added: Spanish and Portuguese": "Nuevo: español y portugués",
  "Pick your language in Settings. Card names stay in English.": "Elige tu idioma en Ajustes. Los nombres de las cartas siguen en inglés.",
  "Added: cards you own": "Nuevo: cartas que tienes",
  "Tick the cards you have, and Upgrades can suggest them first. Saved on your device only.": "Marca las cartas que tienes y Mejoras puede sugerirlas primero. Se guarda solo en tu dispositivo.",
  "Added: card prices": "Nuevo: precios de cartas",
  "Grade fixes from a full audit": "Correcciones de calificación tras una revisión completa",
  "Cards not legal now always flagged": "Siempre se señalan las cartas que ahora no son legales",
  "Grade history shows results updates": "El historial de calificaciones muestra las actualizaciones de resultados",
  "Added: card price in card view": "Nuevo: precio en la vista de carta",
  "Added: notice before leaving RdyDeck": "Nuevo: aviso antes de salir de RdyDeck",
  "Bigger buttons on phones": "Botones más grandes en el teléfono",
  "Light theme easier to read": "Tema claro más fácil de leer",
  "Added: no Energy note on hands": "Nuevo: aviso de manos sin Energía",
  "Grade history bug fixed": "Error del historial de calificaciones corregido",
  "Upgrades always says why": "Mejoras siempre explica por qué",
  "Light theme contrast fixed": "Contraste del tema claro corregido",
  "Gengar card text fixed": "Texto de la carta Gengar corregido",
  "Power counts attackers only": "Poder solo cuenta a los atacantes",
  "Translations improved": "Traducciones mejoradas",
  "Gengar revival credited": "Se cuenta la recuperación de Gengar",
  "Setup attack grading fixed": "Calificación de ataques de preparación corregida",
  "Added: Setup in How it plays": "Nuevo: Preparación en Cómo juega",
  "Upgrades bug fixed": "Error de Mejoras corregido",
  "Card data bug fixed": "Error de datos de cartas corregido",
  "Send feedback fixed": "Enviar comentarios corregido",
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
  "Regionals results": "Resultados de Regionales",
  "Results from Regionals and other big in-person events, once a data source allows it.": "Resultados de Regionales y otros eventos presenciales grandes, cuando una fuente de datos lo permita.",
  "Online": "Online",
  "Local in person": "Presencial local",
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
  "These raise Synergy or Power. The grade itself stays the same, because Synergy lowers the grade only when a list fits loosely. Each number comes from grading the list with that swap made.": "Estos cambios suben la Sinergia o el Poder. La calificación no cambia, porque la Sinergia solo baja la calificación cuando la lista está dispersa. Cada número sale de calificar la lista con ese cambio hecho.",
  "Each number comes from grading the list with that swap made.": "Cada número sale de calificar la lista con ese cambio hecho.",
  "I own this card": "Tengo esta carta",
  "Marked as a card you own.": "Marcada como carta que tienes.",
  "No longer marked as yours.": "Ya no está marcada como tuya.",
  "How accurate the grades are.": "Qué tan precisas son las calificaciones.",
  "How accurate the grades are": "Qué tan precisas son las calificaciones",
  "1.0 means exactly the order of their results.": "1.0 significa exactamente el orden de sus resultados.",
  "See every set": "Ver todas las expansiones",
  "Against the field now:": "Contra el meta actual:",
  "about": "se espera ganar alrededor del",
  "Save and copy link": "Guardar y copiar enlace",
  "Picture saved and link copied. Post the picture and paste the link with it.": "Imagen guardada y enlace copiado. Publica la imagen y pega el enlace con ella.",
  "Picture saved. Copy the link with Copy link.": "Imagen guardada. Copia el enlace con Copiar enlace.",
  "Grade and link copied. Paste it anywhere.": "Calificación y enlace copiados. Pégalos donde quieras.",
  "The picture could not be made on this device. The link still works.": "No se pudo crear la imagen en este dispositivo. El enlace sigue funcionando.",
  "How did it do?": "¿Cómo le fue?",
  "At the event:": "En el evento:",
  "At an event you played:": "En un evento que jugaste:",
  "Your record there:": "Tu resultado allí:",
  "Your record at an event:": "Tu resultado en un evento:",
  "Your last unsaved list.": "Tu última lista sin guardar.",
  "Mark not confirmed": "Marca sin confirmar",
  "Price": "Precio",
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
  "Grade fixes from a full audit": "Correções de nota após uma revisão completa",
  "Cards not legal now always flagged": "Cartas que não são legais agora sempre sinalizadas",
  "Grade history shows results updates": "O histórico de notas mostra as atualizações de resultados",
  "Added: card price in card view": "Novo: preço na visualização da carta",
  "Added: notice before leaving RdyDeck": "Novo: aviso antes de sair do RdyDeck",
  "Bigger buttons on phones": "Botões maiores no celular",
  "Light theme easier to read": "Tema claro mais fácil de ler",
  "Added: no Energy note on hands": "Novo: aviso de mãos sem Energia",
  "Grade history bug fixed": "Erro do histórico de notas corrigido",
  "Upgrades always says why": "Melhorias sempre explica o porquê",
  "Light theme contrast fixed": "Contraste do tema claro corrigido",
  "Gengar card text fixed": "Texto da carta Gengar corrigido",
  "Power counts attackers only": "Poder conta só os atacantes",
  "Translations improved": "Traduções melhoradas",
  "Gengar revival credited": "Recuperação do Gengar agora conta",
  "Setup attack grading fixed": "Nota de ataques de preparação corrigida",
  "Added: Setup in How it plays": "Novo: Preparação em Como joga",
  "Upgrades bug fixed": "Erro de Melhorias corrigido",
  "Card data bug fixed": "Erro dos dados das cartas corrigido",
  "Send feedback fixed": "Enviar feedback corrigido",
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
  "Regionals results": "Resultados de Regionais",
  "Results from Regionals and other big in-person events, once a data source allows it.": "Resultados de Regionais e outros eventos presenciais grandes, quando uma fonte de dados permitir.",
  "Online": "Online",
  "Local in person": "Presencial local",
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
  "These raise Synergy or Power. The grade itself stays the same, because Synergy lowers the grade only when a list fits loosely. Each number comes from grading the list with that swap made.": "Estas trocas aumentam a Sinergia ou o Poder. A nota não muda, porque a Sinergia só baixa a nota quando a lista está espalhada. Cada número vem de avaliar a lista com essa troca feita.",
  "Each number comes from grading the list with that swap made.": "Cada número vem de avaliar a lista com essa troca feita.",
  "I own this card": "Eu tenho esta carta",
  "Marked as a card you own.": "Marcada como carta que você tem.",
  "No longer marked as yours.": "Não está mais marcada como sua.",
  "How accurate the grades are.": "Quão precisas são as notas.",
  "How accurate the grades are": "Quão precisas são as notas",
  "1.0 means exactly the order of their results.": "1.0 significa exatamente a ordem dos resultados.",
  "See every set": "Ver todas as coleções",
  "Against the field now:": "Contra o meta atual:",
  "about": "espera-se vencer cerca de",
  "Save and copy link": "Salvar e copiar link",
  "Picture saved and link copied. Post the picture and paste the link with it.": "Imagem salva e link copiado. Poste a imagem e cole o link junto.",
  "Picture saved. Copy the link with Copy link.": "Imagem salva. Copie o link com Copiar link.",
  "Grade and link copied. Paste it anywhere.": "Nota e link copiados. Cole onde quiser.",
  "The picture could not be made on this device. The link still works.": "Não foi possível criar a imagem neste aparelho. O link continua funcionando.",
  "How did it do?": "Como foi?",
  "At the event:": "No evento:",
  "At an event you played:": "Num evento que você jogou:",
  "Your record there:": "Seu resultado lá:",
  "Your record at an event:": "Seu resultado em um evento:",
  "Your last unsaved list.": "Sua última lista não salva.",
  "Mark not confirmed": "Marca não confirmada",
  "Price": "Preço",
  "(wins, losses, ties)": "(vitórias, derrotas, empates)",
  "It stays on this device and is never sent anywhere.": "Fica neste aparelho e nunca é enviado a lugar nenhum.",
  "Placing": "Colocação",
  "Optional": "Opcional",
  "Remove": "Remover",
  "The deck says which.": "O deck diz quais.",
});
I18N_PAT.unshift(
  [/^(\d+)% of the grade comes from (.+)'s (online|online and local in-person|local in-person) tournament results(?: since (.+?))?(?: \(as of (.+?)\))?: ([\d.]+%) wins (?:with games since the newest set counted three times \(([\d.]+%) over all ([\d,]+) games\)|over all ([\d,]+) games)\.$/,
    (m, p, n, k, s, a, w, raw, g1, g2) => p + '% de la calificación viene de los resultados de ' + n + ' en torneos ' + ({'online': 'online', 'online and local in-person': 'online y presenciales locales', 'local in-person': 'presenciales locales'})[k] + (s ? ' desde ' + s : '') + (a ? ' (hasta el ' + a + ')' : '') + ': ' + w + ' de victorias' + (raw ? ' con las partidas desde la expansión más reciente contadas tres veces (' + raw + ' en las ' + g1 + ' partidas)' : ' en las ' + g2 + ' partidas') + '.',
    (m, p, n, k, s, a, w, raw, g1, g2) => p + '% da nota vem dos resultados de ' + n + ' em torneios ' + ({'online': 'online', 'online and local in-person': 'online e presenciais locais', 'local in-person': 'presenciais locais'})[k] + (s ? ' desde ' + s : '') + (a ? ' (em ' + a + ')' : '') + ': ' + w + ' de vitórias' + (raw ? ' com as partidas desde a coleção mais nova contando três vezes (' + raw + ' em todas as ' + g1 + ' partidas)' : ' em todas as ' + g2 + ' partidas') + '.'],
  [/^over all ([\d,]+) games, against ([\d.]+%) for all decks in these results\.$/, 'en las $1 partidas, contra $2 de todas las barajas en estos resultados.', 'em todas as $1 partidas, contra $2 de todos os decks nestes resultados.'],
  [/^The grade counts games since the newest set three times, which makes it ([\d.]+%)\.$/, 'La calificación cuenta tres veces las partidas desde la expansión más reciente, lo que la deja en $1.', 'A nota conta três vezes as partidas desde a coleção mais nova, o que deixa em $1.'],
  [/^of all ([\d,]+) matches against other decks \((\d+) wins, (\d+) losses, (\d+) ties\)\.$/, 'de las $1 partidas contra otras barajas ($2 victorias, $3 derrotas, $4 empates).', 'de todas as $1 partidas contra outros decks ($2 vitórias, $3 derrotas, $4 empates).'],
  [/^expected\. That is its record against the (\d+) most played decks \((\d+)% of play (?:since (.+)|in these results)\), each counted by how often that deck is played, over ([\d,]+) matches\.$/,
    (m, n, c, s, g) => 'de las partidas. Es su récord contra las ' + n + ' barajas más jugadas (' + c + '% del juego ' + (s ? 'desde ' + s : 'en estos resultados') + '), cada una contada según cuánto se juega esa baraja, en ' + g + ' partidas.',
    (m, n, c, s, g) => 'das partidas. É o retrospecto dele contra os ' + n + ' decks mais jogados (' + c + '% do jogo ' + (s ? 'desde ' + s : 'nestes resultados') + '), cada um contado por quanto esse deck é jogado, em ' + g + ' partidas.'],
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
  "Every Pokémon is in your hand, but no Energy to attack with yet.": "Tienes todos los Pokémon en la mano, pero todavía ninguna Energía para atacar.",
  "No Energy to attack with in hand either.": "Tampoco tienes Energía en la mano para atacar.",
  "No Energy card in this hand.": "No hay cartas de Energía en esta mano.",
  "Nothing in it gets you one either.": "Y nada en ella te consigue una.",
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
  "Every Pokémon is in your hand, but no Energy to attack with yet.": "Todos os Pokémon estão na sua mão, mas ainda não há Energia para atacar.",
  "No Energy to attack with in hand either.": "Também não há Energia na mão para atacar.",
  "No Energy card in this hand.": "Não há cartas de Energia nesta mão.",
  "Nothing in it gets you one either.": "E nada nela consegue uma para você.",
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
/** 3.3.9: the puzzle line's ", the shortest win" or ", best 3" (plays in the best line) in language l. */
function i18nPzBest(b, l) {
  if (!b) return '';
  if (b === ', the shortest win') return { es: ', la victoria más corta', pt: ', a vitória mais curta', fr: ', la victoire la plus courte', de: ', der kürzeste Sieg', it: ', la vittoria più breve' }[l] || b;
  const n = b.replace(/\D/g, '');
  return ({ es: ', lo mejor posible: ', pt: ', o melhor possível: ', fr: ', le meilleur possible : ', de: ', bestmöglich: ', it: ', il meglio possibile: ' }[l] || ', best ') + n;
}
function i18nRuns(s, l) {
  return s.replace(/(\d+) wins in a row/g, l === 'es' ? '$1 victorias seguidas' : '$1 vitórias seguidas')
    .replace(/(\d+) days in a row/g, l === 'es' ? '$1 días seguidos' : '$1 dias seguidos');
}
/** True when every name in "A, B and C" (or "A or B") is a card name the app knows. */
function i18nAllCards(s) {
  const c = rdI18n.cardNames;
  return s.split(/, | and | or /).every(x => c.has(rdI18n.norm(x).toLowerCase()));
}
/** "3 solved of 5 played", as a label: "Resueltos: 3 de 5". */
function i18nSolved(a, b, l) {
  return l === 'es' ? 'Resueltos: ' + a + ' de ' + b : 'Resolvidos: ' + a + ' de ' + b;
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
  [/^in (\d+) plays?(, the shortest win|, best \d+)?$/, (m, n, b) => 'en ' + n + (n === '1' ? ' jugada' : ' jugadas') + i18nPzBest(b, 'es'), (m, n, b) => 'em ' + n + (n === '1' ? ' jogada' : ' jogadas') + i18nPzBest(b, 'pt')],
  [/^in (\d+) plays?(, the shortest win|, best \d+)?\. (.+)$/, (m, n, b, r) => 'en ' + n + (n === '1' ? ' jugada' : ' jugadas') + i18nPzBest(b, 'es') + '. ' + i18nRuns(r, 'es'), (m, n, b, r) => 'em ' + n + (n === '1' ? ' jogada' : ' jogadas') + i18nPzBest(b, 'pt') + '. ' + i18nRuns(r, 'pt')],
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
/** Muse s6 M2: the phrases gAbilFb in core.js writes for an Ability its steps cannot follow, each a key into L.fix. */
const I18N_AB_FIX = [
  [/^blocks the effects of your opponent's attacks and Abilities on it$/, 'fxAll'],
  [/^blocks the effects of your opponent's attacks on your Basic Team Rocket's Pokemon$/, 'fxRocket'],
  [/^blocks the effects of your opponent's attacks on it$/, 'fx'],
  [/^takes no damage from attacks by your opponent's Pokemon ex$/, 'noEx'],
  [/^keeps your Benched Pokemon without a Rule Box from taking damage from attacks$/, 'benchNoRule'],
  [/^keeps your Benched Pokemon safe from your opponent's attacks$/, 'benchSafe'],
  [/^takes (\d+) less damage from attacks$/, 'less'],
  [new RegExp(`^gets (\\d+) more HP and does (\\d+) more damage while it has (${I18N_AB_TY}) Energy attached$`), 'hpDmg'],
  [/^does (\d+) more damage once it has (\d+) or more damage counters on it$/, 'hurtDmg'],
  [/^has no Retreat Cost while it has no Energy attached$/, 'freeRetreat'],
  [/^makes your opponent's Active Pokemon's Retreat Cost 1 more$/, 'oppRetreat'],
  [/^shuffles itself and its attached cards into your deck once a turn while it is Active$/, 'shuffleSelf'],
  [/^has each player draw a card once a turn$/, 'eachDraw'],
  [new RegExp(`^moves Basic (${I18N_AB_TY}) Energy between your Pokemon as often as you like$`), 'moveE'],
  [new RegExp(`^puts itself onto your Bench from your hand while you have a (${I18N_AB_TY}) Mega Evolution Pokemon ex in play$`), 'benchMega'],
  [/^can use the attacks of your Benched Pokemon$/, 'copyBench'],
  [/^lets your evolved Pokemon use the attacks of their earlier stages$/, 'copyPrev'],
  [/^can evolve into any Pokemon ex that evolves from (.+)$/, 'evoAny'],
  [new RegExp(`^makes each Basic (${I18N_AB_TY}) Energy on your Pokemon count as 2$`), 'double'],
  [/^can attack twice in a turn while (.+) is in play$/, 'twice'],
  [/^makes its (.+) cost 1 Colorless less for each Prize card your opponent has taken$/, 'cheaper'],
  [/^cannot attack unless you have (\d+) or more cards in your hand$/, 'handGate'],
  [/^survives a knockout from an attack with 10 HP left if you flip heads$/, 'survive'],
  [/^puts (\d+) damage counters on the attacker when it is Knocked Out in the Active Spot$/, 'revenge'],
  [/^puts (\d+) more damage counters on your opponent's Poisoned Pokemon between turns while it is Active$/, 'poison'],
  [new RegExp(`^takes away the Weakness of every (${I18N_AB_TY}) Pokemon in play$`), 'noWeak'],
  [/^stops every Ability that Knocks Out the Pokemon using it$/, 'damp'],
  [/^stops damage counters from being moved$/, 'noMove'],
  [/^cannot be (Asleep|Confused|Paralyzed|Poisoned|Burned)$/, 'immune'],
];
function i18nAbFix(p, L) {
  if (!L || !L.fix) return null;
  for (const [re, k] of I18N_AB_FIX) { const m = String(p).match(re); if (m) { const f = L.fix[k]; if (!f) return null; try { return f(...m.slice(1)); } catch (e) { return null; } } }
  return null;
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
  let body = i18nAbFix(p, L);
  if (body == null) {
    const parts = [];
    for (const q of p.split(/, and (?=your |makes |gives |turns |stops )/)) { const x = i18nAbParse(q); if (!x) return null; parts.push(x); }
    try { body = parts.map(x => i18nAbSay(x, L)).join(L.and2); } catch (e) { return null; }
  }
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
// Muse s6 M2: the Abilities read as a whole phrase (I18N_AB_FIX), said in Spanish and Portuguese.
I18N_ABIL.es.fix = (function () {
  const E = t => 'Energía ' + I18N_TYPES.es[t], Y = t => I18N_AB_TYP.es[t];
  const SC = { Asleep: 'Dormido', Confused: 'Confundido', Paralyzed: 'Paralizado', Poisoned: 'Envenenado', Burned: 'Quemado' };
  return {
    fxAll: () => 'bloquea los efectos de los ataques y las Habilidades de tu rival sobre él',
    fxRocket: () => 'bloquea los efectos de los ataques de tu rival sobre tus Pokémon Básicos del Team Rocket',
    fx: () => 'bloquea los efectos de los ataques de tu rival sobre él',
    noEx: () => 'no recibe daño de los ataques de los Pokémon ex de tu rival',
    benchNoRule: () => 'evita que tus Pokémon en Banca sin Recuadro de regla reciban daño de ataques',
    benchSafe: () => 'protege a tus Pokémon en Banca de los ataques de tu rival',
    less: n => `recibe ${n} de daño menos de los ataques`,
    hpDmg: (h, n, t) => `tiene ${h} PS más y hace ${n} más de daño mientras tiene ${E(t)} unida`,
    hurtDmg: (n, k) => `hace ${n} más de daño cuando tiene ${k} contadores de daño o más`,
    freeRetreat: () => 'no tiene Coste de Retirada mientras no tiene Energía unida',
    oppRetreat: () => 'sube en 1 el Coste de Retirada del Pokémon Activo de tu rival',
    shuffleSelf: () => 'se baraja en tu baraja con todas sus cartas unidas una vez por turno mientras está en el Puesto Activo',
    eachDraw: () => 'hace que cada jugador robe una carta una vez por turno',
    moveE: t => `mueve ${E(t)} Básica entre tus Pokémon tantas veces como quieras`,
    benchMega: t => `se pone en tu Banca desde tu mano mientras tienes en juego un Pokémon Megaevolución ex de tipo ${Y(t)}`,
    copyBench: () => 'puede usar los ataques de tus Pokémon en Banca',
    copyPrev: () => 'permite que tus Pokémon evolucionados usen los ataques de sus fases anteriores',
    evoAny: x => `puede evolucionar a cualquier Pokémon ex que evolucione de ${x}`,
    double: t => `hace que cada ${E(t)} Básica en tus Pokémon cuente como 2`,
    twice: x => `puede atacar dos veces por turno mientras ${x} está en juego`,
    cheaper: x => `hace que ${x} cueste 1 Energía Incolora menos por cada carta de Premio que haya tomado tu rival`,
    handGate: n => `no puede atacar a menos que tengas ${n} cartas o más en la mano`,
    survive: () => 'si sale cara, sobrevive con 10 PS a un ataque que lo dejaría Fuera de Combate',
    revenge: n => `pone ${n} contadores de daño en el Pokémon atacante cuando queda Fuera de Combate en el Puesto Activo`,
    poison: n => `pone ${n} contadores de daño más en los Pokémon Envenenados de tu rival entre turnos mientras está en el Puesto Activo`,
    noWeak: t => `quita la Debilidad a todos los Pokémon de tipo ${Y(t)} en juego`,
    damp: () => 'anula toda Habilidad que deje Fuera de Combate al Pokémon que la usa',
    noMove: () => 'impide que se muevan contadores de daño',
    immune: k => `no puede quedar ${SC[k]}`,
  };
})();
I18N_ABIL.pt.fix = (function () {
  const E = t => 'Energia ' + I18N_TYPES.pt[t], Y = t => I18N_AB_TYP.pt[t];
  const SC = { Asleep: 'Adormecido', Confused: 'Confuso', Paralyzed: 'Paralisado', Poisoned: 'Envenenado', Burned: 'Queimado' };
  return {
    fxAll: () => 'bloqueia os efeitos dos ataques e das Habilidades do oponente nele',
    fxRocket: () => 'bloqueia os efeitos dos ataques do oponente nos seus Pokémon Básicos da Equipe Rocket',
    fx: () => 'bloqueia os efeitos dos ataques do oponente nele',
    noEx: () => 'não recebe dano de ataques dos Pokémon ex do oponente',
    benchNoRule: () => 'impede que seus Pokémon no Banco sem Caixa de Regras recebam dano de ataques',
    benchSafe: () => 'protege seus Pokémon no Banco dos ataques do oponente',
    less: n => `recebe ${n} a menos de dano de ataques`,
    hpDmg: (h, n, t) => `ganha ${h} PS a mais e causa ${n} a mais de dano enquanto tem ${E(t)} ligada`,
    hurtDmg: (n, k) => `causa ${n} a mais de dano quando tem ${k} ou mais contadores de dano`,
    freeRetreat: () => 'não tem Custo de Recuo enquanto não tem Energia ligada',
    oppRetreat: () => 'aumenta em 1 o Custo de Recuo do Pokémon Ativo do oponente',
    shuffleSelf: () => 'se embaralha no seu deck com todas as cartas ligadas uma vez por turno enquanto está no Campo Ativo',
    eachDraw: () => 'faz cada jogador comprar uma carta uma vez por turno',
    moveE: t => `move ${E(t)} Básica entre seus Pokémon quantas vezes quiser`,
    benchMega: t => `vai da sua mão para o seu Banco enquanto você tem em jogo um Pokémon Megaevolução ex do tipo ${Y(t)}`,
    copyBench: () => 'pode usar os ataques dos seus Pokémon no Banco',
    copyPrev: () => 'deixa seus Pokémon evoluídos usarem os ataques dos estágios anteriores',
    evoAny: x => `pode evoluir para qualquer Pokémon ex que evolua de ${x}`,
    double: t => `faz cada ${E(t)} Básica nos seus Pokémon contar como 2`,
    twice: x => `pode atacar duas vezes por turno enquanto ${x} está em jogo`,
    cheaper: x => `faz ${x} custar 1 Energia Incolor a menos para cada carta de Prêmio que o oponente pegou`,
    handGate: n => `não pode atacar a menos que você tenha ${n} ou mais cartas na mão`,
    survive: () => 'se sair cara, sobrevive com 10 PS a um ataque que o Nocautearia',
    revenge: n => `coloca ${n} contadores de dano no Pokémon atacante quando é Nocauteado no Campo Ativo`,
    poison: n => `coloca ${n} contadores de dano a mais nos Pokémon Envenenados do oponente entre os turnos enquanto está no Campo Ativo`,
    noWeak: t => `tira a Fraqueza de todos os Pokémon do tipo ${Y(t)} em jogo`,
    damp: () => 'anula toda Habilidade que Nocauteia o próprio Pokémon que a usa',
    noMove: () => 'impede que contadores de dano sejam movidos',
    immune: k => `não pode ficar ${SC[k]}`,
  };
})();
// Every Abilities sentence of How it plays, read and said again in Spanish and Portuguese; null leaves it to the next pattern.
I18N_PAT.push([/^.+?'s .+?: .+$/, m => i18nAbilSent(m, 'es'), m => i18nAbilSent(m, 'pt')]);

// Muse s1/s2: the control (lock, mill, wall, disruption) findings and How it plays lines that gCtlSay and
// gViability in core.js write, read back into parts and said again from each language's table
// (I18N_CTL.es and .pt below, I18N_MORE[lang].ctl in the other files). A phrase this cannot read gives
// null, so the sentence stays English rather than half translated.
/** True for a card's own name, so a title that only shares a shape ("Only 2 ...") is left to its own pattern. */
function i18nCtlCard(x) { const c = typeof rdI18n === 'object' && rdI18n.cardNames; return !c || c.has(String(x).toLowerCase()); }
function i18nCtlTab(l) { return l === 'es' || l === 'pt' ? I18N_CTL[l] : (i18nMore(l) || {}).ctl; }
/** "Budew's Itchy Pollen" as the language's "Itchy Pollen of Budew"; a Trainer name ("Team Rocket's Watchtower") stays whole. */
function i18nCtlBy(by, T) {
  const names = typeof rdI18n === 'object' && rdI18n.cardNames;
  if (names && names.has(by.toLowerCase())) return by;
  const cuts = [];
  for (let i = by.indexOf("'s "); i > 0; i = by.indexOf("'s ", i + 1)) cuts.push(i);
  if (!cuts.length) return by;
  let at = cuts[cuts.length - 1];
  if (names) { const k = cuts.find(i => names.has(by.slice(0, i).toLowerCase())); if (k != null) at = k; }
  return T.of(by.slice(0, at), by.slice(at + 3));
}
/** What one piece does ("your opponent can't play Item cards during their next turn"), or null. */
function i18nCtlT(t, T) {
  let m, flip = '', when = '', r = null;
  if (/ \(on a coin flip\)$/.test(t)) { flip = T.flip; t = t.replace(/ \(on a coin flip\)$/, ''); }
  if ((m = t.match(/ (while it is in the Active Spot|during their next turn|on your first turn)$/))) { when = m[1]; t = t.slice(0, m.index); }
  const n = x => x === 'a few' || x === 'a lot' ? null : x;
  if ((m = t.match(/^your opponent can't play (Item|Supporter|Pokemon Tool|Stadium) cards$/))) r = T.cantPlay(m[1]);
  else if ((m = t.match(/^(Pokemon with a Rule Box|Pokemon in play|Evolution Pokemon|Basic Pokemon|Colorless Pokemon|the Active Pokemon) ha(?:s|ve) no Abilities$/))) r = T.noAb[m[1]];
  else if ((m = t.match(/^Pokemon with (\d+|a few) or less Energy attached can't attack$/))) r = T.lowAtk(n(m[1]));
  else if (t === "the Defending Pokemon can't attack") r = T.noAtk;
  else if (t === "the Defending Pokemon can't retreat") r = T.noRet;
  else if ((m = t.match(/^discards the top (card|\d+ cards) of your opponent's deck$/))) r = T.mill(m[1] === 'card' ? 1 : parseInt(m[1], 10));
  else if ((m = t.match(/^discards (Special )?Energy from your opponent's Pokemon$/))) r = T.energy(!!m[1]);
  else if (t === "cuts down your opponent's hand") r = T.hand;
  else if ((m = t.match(/^heals (all|\d+) damage$/))) r = T.heal(m[1]);
  else if (t === 'your Benched Pokemon take no damage from attacks') r = T.wall('bench', 'all');
  else if ((m = t.match(/^(it takes|your Pokemon take|Pokemon without a Rule Box take|your Benched Pokemon take) (no|less) damage(?: from (.+))?$/))) {
    const who = { 'it takes': 'it', 'your Pokemon take': 'team', 'Pokemon without a Rule Box take': 'nonrule', 'your Benched Pokemon take': 'bench' }[m[1]];
    if (m[2] === 'less') r = m[3] ? null : T.less(who);
    else if (m[3]) { const f = m[3]; let k = null, x = null, q;
      if (f === 'attacks by Pokemon ex') k = 'ex'; else if (f === 'attacks by Basic Pokemon ex') k = 'basicex';
      else if (f === 'attacks by Pokemon with an Ability') k = 'ability'; else if (f === 'attacks by Basic Pokemon') k = 'basic';
      else if (f === 'attacks') k = 'all';
      else if ((q = f.match(/^an attack that does (\d+|a lot) or more$/))) { k = 'big'; x = n(q[1]); }
      else if ((q = f.match(/^Pokemon with (\d+|a few) or less Energy attached$/))) { k = 'low'; x = n(q[1]); }
      r = k ? T.wall(who, k, x) : null; } }
  if (r == null) return null;
  // German puts "during their next turn" after the verb ("kann während ... keine Item-Karten spielen").
  return (when ? (T.place ? T.place(r, T.when[when]) : r + T.when[when]) : r) + flip;
}
/** "4 Crushing Hammer, 3 Enhanced Hammer discard Energy from your opponent's Pokemon", with ", which" inside a sentence. */
function i18nCtlWho(s, T) {
  const m = s.match(/^(\d+ .+?)(, which)? (discard Energy from your opponent's Pokemon|cut down your opponent's hand|heal your Pokemon)( on a coin flip)?$/);
  if (!m || !/^\d+ [^,]+(?:, \d+ [^,]+)*$/.test(m[1])) return null;
  const k = /^discard/.test(m[3]) ? 'energy' : /^cut/.test(m[3]) ? 'hand' : 'heal';
  return T.who(m[1], k, !!m[4], !!m[2]);
}
/** One piece sentence of the game plan ("Budew's Itchy Pollen: your opponent can't play Item cards."), or null. */
function i18nCtlPiece(s, l) {
  const T = i18nCtlTab(l); if (!T) return null;
  s = String(s).replace(/\.$/, '');
  const w = i18nCtlWho(s, T); if (w != null) return w + '.';
  const m = s.match(/^(.+?): (.+)$/); if (!m) return null;
  const t = i18nCtlT(m[2], T);
  return t == null ? null : T.piece(i18nCtlBy(m[1], T), t) + '.';
}
/** "The biggest piece is Budew's Itchy Pollen, where your opponent can't play Item cards ..." */
function i18nCtlBig(inner, l) {
  const T = i18nCtlTab(l); if (!T) return null;
  let x = i18nCtlWho(inner, T);
  if (x == null) { const m = inner.match(/^(.+?), (?:where|which) (.+)$/); if (!m) return null;
    const t = i18nCtlT(m[2], T); if (t == null) return null; x = T.piece(i18nCtlBy(m[1], T), t); }
  return T.big(x);
}
/** "locking and stripping Energy and cards" (or the "locks", "Lock" forms) as the language's words, or null. */
function i18nCtlList(s, words, T) {
  const keys = Object.keys(words), re = new RegExp(keys.map(k => k.replace(/ /g, ' ')).sort((a, b) => b.length - a.length).join('|'), 'g');
  const got = s.match(re) || [];
  if (!got.length || got.join(' and ') !== s) return null;
  return got.map(k => words[k]).join(T.and);
}
const I18N_CTL_HOW = { 'locking': 'lock', 'milling': 'mill', 'stalling': 'stall', 'stripping Energy and cards': 'denial' };
const I18N_CTL_ALSO = { 'locks': 'lock', 'mills': 'mill', 'walls': 'stall', 'strips Energy and cards': 'denial' };
const I18N_CTL_KIND = { 'Lock': 'lock', 'Mill': 'mill', 'Stall': 'stall', 'Disruption': 'denial' };
/** The control sentences and titles, as [regex, (m, ...) => text in l] pairs; each language gets them through its own pattern list. */
function i18nCtlPats(l) {
  const T = () => i18nCtlTab(l);
  const map = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
  const how = s => { const t = T(); return t && i18nCtlList(s, map(I18N_CTL_HOW, k => t.how[k]), t); };
  const also = s => { const t = T(); return t && i18nCtlList(s, map(I18N_CTL_ALSO, k => t.also[k]), t); };
  const alsoN = s => { const t = T(); return t && i18nCtlList(s, map(I18N_CTL_ALSO, k => (t.alsoN || t.also)[k]), t); };
  const kind = s => { const t = T(); return t && i18nCtlList(s, map(I18N_CTL_KIND, k => t.kind[k]), t); };
  const ok = (...a) => a.every(x => x != null);
  return [
    [/^Wins by (.+)$/, (m, h) => { const x = how(h); return ok(x) ? T().winsBy(x) : null; }],
    [/^This deck wins by (.+?), not by trading knockouts, so its damage counts for less\.$/, (m, h) => { const x = how(h); return ok(x) ? T().winsNot(x) : null; }],
    [/^This deck wins by (.+?) rather than by trading big hits\.$/, (m, h) => { const x = how(h); return ok(x) ? T().winsRather(x) : null; }],
    [/^Game plan: (.+)$/, (m, h) => { const x = kind(h); return ok(x) ? T().plan(x) : null; }],
    [/^Also (.+)$/, (m, h) => { const x = alsoN(h); return ok(x) ? T().alsoT(x) : null; }],
    [/^Besides attacking, this deck (.+?), which wins some games its hits alone would not\.$/, (m, h) => { const x = also(h); return ok(x) ? T().besidesWins(x) : null; }],
    [/^Besides attacking, this deck (.+?)\.$/, (m, h) => { const x = also(h); return ok(x) ? T().besides(x) : null; }],
    [/^The biggest piece is (.+)\.$/, (m, x) => i18nCtlBig(x, l)],
    [/^The game plan lists (\d+) more\.$/, (m, n) => T() && T().lists(n)],
    [/^Keep (.+) Active$/, (m, x) => T() && i18nCtlCard(x) ? T().keep(x) : null],
    [/^(.+?'s .+?) only works while it is in the Active Spot\.$/, (m, x) => T() && T().onlyActive(i18nCtlBy(x, T()))],
    [/^Switching it out or losing it turns the (lock|mill|stall|denial) off, so plan your retreats around it\.$/, (m, k) => T() && T().switchOff(k)],
    [/^The (lock|mill|stall|denial) rests on (.+?), and the list runs (\d+)\.$/, (m, k, x, n) => T() && T().rests(k, i18nCtlBy(x, T()), n)],
    [/^Only (\d+) (.+)$/, (m, n, x) => T() && i18nCtlCard(x) ? T().only(n, x) : null],
    [/^.+$/, m => i18nCtlPiece(m, l)],
  ];
}
const I18N_CTL = {
  es: {
    and: ' y ', flip: ' (si sale cara)',
    when: { 'while it is in the Active Spot': ' mientras está en el Puesto Activo', 'during their next turn': ' durante su próximo turno', 'on your first turn': ' en tu primer turno' },
    cantPlay: k => 'tu rival no puede jugar cartas de ' + { Item: 'Objeto', Supporter: 'Partidario', 'Pokemon Tool': 'Herramienta Pokémon', Stadium: 'Estadio' }[k],
    noAb: { 'Pokemon with a Rule Box': 'los Pokémon con Recuadro de regla no tienen Habilidades', 'Pokemon in play': 'los Pokémon en juego no tienen Habilidades',
      'Evolution Pokemon': 'los Pokémon Evolución no tienen Habilidades', 'Basic Pokemon': 'los Pokémon Básicos no tienen Habilidades',
      'Colorless Pokemon': 'los Pokémon de tipo Incoloro no tienen Habilidades', 'the Active Pokemon': 'el Pokémon Activo no tiene Habilidades' },
    lowAtk: n => n ? `los Pokémon con ${n} o menos Energías unidas no pueden atacar` : 'los Pokémon con pocas Energías unidas no pueden atacar',
    noAtk: 'el Pokémon Defensor no puede atacar', noRet: 'el Pokémon Defensor no puede retirarse',
    mill: n => n === 1 ? 'descarta la primera carta de la baraja de tu rival' : `descarta las ${n} primeras cartas de la baraja de tu rival`,
    energy: sp => `descarta Energía${sp ? ' Especial' : ''} de los Pokémon de tu rival`,
    hand: 'reduce la mano de tu rival',
    heal: v => v === 'all' ? 'cura todo el daño' : `cura ${v} puntos de daño`,
    wall: (who, k, n) => ({ it: 'no recibe daño', team: 'tus Pokémon no reciben daño', nonrule: 'los Pokémon sin Recuadro de regla no reciben daño', bench: 'tus Pokémon en Banca no reciben daño' })[who] + ' '
      + ({ ex: 'de ataques de Pokémon ex', basicex: 'de ataques de Pokémon ex Básicos', ability: 'de ataques de Pokémon con Habilidad', basic: 'de ataques de Pokémon Básicos', all: 'de ataques',
        big: n ? `de un ataque que hace ${n} o más de daño` : 'de un ataque que hace mucho daño', low: n ? `de Pokémon con ${n} o menos Energías unidas` : 'de Pokémon con pocas Energías unidas' })[k],
    less: who => ({ it: 'recibe menos daño', team: 'tus Pokémon reciben menos daño', nonrule: 'los Pokémon sin Recuadro de regla reciben menos daño', bench: 'tus Pokémon en Banca reciben menos daño' })[who],
    who: (list, k, flip, lead) => list + (lead ? ', que ' : ' ') + ({ energy: 'descartan Energía de los Pokémon de tu rival', hand: 'reducen la mano de tu rival', heal: 'curan a tus Pokémon' })[k] + (flip ? ' si sale cara' : ''),
    of: (owner, what) => `${what} de ${owner}`, piece: (by, t) => `${by}: ${t}`, big: x => `La pieza más importante es ${x}.`,
    how: { lock: 'bloqueando', mill: 'descartando la baraja rival', stall: 'aguantando', denial: 'quitando Energía y cartas' },
    also: { lock: 'bloquea', mill: 'descarta la baraja rival', stall: 'hace de muro', denial: 'quita Energía y cartas' },
    kind: { lock: 'Bloqueo', mill: 'Descarte de baraja', stall: 'Muro', denial: 'Disrupción' },
    winsBy: x => 'Gana ' + x, winsNot: x => `Esta baraja gana ${x}, no intercambiando Fuera de Combate, así que su daño cuenta menos.`,
    winsRather: x => `Esta baraja gana ${x} en vez de intercambiar golpes fuertes.`, plan: x => 'Plan de juego: ' + x,
    alsoT: x => 'También ' + x, besidesWins: x => `Además de atacar, esta baraja ${x}, y así gana partidas que sus golpes solos no ganarían.`,
    besides: x => `Además de atacar, esta baraja ${x}.`, lists: n => `El plan de juego enumera ${n} más.`, keep: x => `Mantén ${x} en el Puesto Activo`,
    onlyActive: x => `${x} solo funciona mientras está en el Puesto Activo.`,
    switchOff: k => `Cambiarlo o perderlo apaga ${({ lock: 'el bloqueo', mill: 'el descarte', stall: 'el muro', denial: 'la disrupción' })[k]}, así que planea tus retiradas en torno a él.`,
    rests: (k, x, n) => `${({ lock: 'El bloqueo', mill: 'El descarte', stall: 'El muro', denial: 'La disrupción' })[k]} depende de ${x}, y la lista lleva ${n}.`,
    only: (n, x) => `Solo ${n} ${x}`,
  },
  pt: {
    and: ' e ', flip: ' (se sair cara)',
    when: { 'while it is in the Active Spot': ' enquanto está no Campo Ativo', 'during their next turn': ' durante o próximo turno dele', 'on your first turn': ' no seu primeiro turno' },
    cantPlay: k => 'o oponente não pode jogar cartas de ' + { Item: 'Item', Supporter: 'Apoiador', 'Pokemon Tool': 'Ferramenta Pokémon', Stadium: 'Estádio' }[k],
    noAb: { 'Pokemon with a Rule Box': 'os Pokémon com Caixa de Regras não têm Habilidades', 'Pokemon in play': 'os Pokémon em jogo não têm Habilidades',
      'Evolution Pokemon': 'os Pokémon de Evolução não têm Habilidades', 'Basic Pokemon': 'os Pokémon Básicos não têm Habilidades',
      'Colorless Pokemon': 'os Pokémon do tipo Incolor não têm Habilidades', 'the Active Pokemon': 'o Pokémon Ativo não tem Habilidades' },
    lowAtk: n => n ? `os Pokémon com ${n} ou menos Energias ligadas não podem atacar` : 'os Pokémon com poucas Energias ligadas não podem atacar',
    noAtk: 'o Pokémon Defensor não pode atacar', noRet: 'o Pokémon Defensor não pode recuar',
    mill: n => n === 1 ? 'descarta a carta de cima do deck do oponente' : `descarta as ${n} cartas de cima do deck do oponente`,
    energy: sp => `descarta Energia${sp ? ' Especial' : ''} dos Pokémon do oponente`,
    hand: 'diminui a mão do oponente',
    heal: v => v === 'all' ? 'cura todo o dano' : `cura ${v} pontos de dano`,
    wall: (who, k, n) => ({ it: 'não recebe dano', team: 'seus Pokémon não recebem dano', nonrule: 'os Pokémon sem Caixa de Regras não recebem dano', bench: 'seus Pokémon no Banco não recebem dano' })[who] + ' '
      + ({ ex: 'de ataques de Pokémon ex', basicex: 'de ataques de Pokémon ex Básicos', ability: 'de ataques de Pokémon com Habilidade', basic: 'de ataques de Pokémon Básicos', all: 'de ataques',
        big: n ? `de um ataque que causa ${n} ou mais de dano` : 'de um ataque que causa muito dano', low: n ? `de Pokémon com ${n} ou menos Energias ligadas` : 'de Pokémon com poucas Energias ligadas' })[k],
    less: who => ({ it: 'recebe menos dano', team: 'seus Pokémon recebem menos dano', nonrule: 'os Pokémon sem Caixa de Regras recebem menos dano', bench: 'seus Pokémon no Banco recebem menos dano' })[who],
    who: (list, k, flip, lead) => list + (lead ? ', que ' : ' ') + ({ energy: 'descartam Energia dos Pokémon do oponente', hand: 'diminuem a mão do oponente', heal: 'curam seus Pokémon' })[k] + (flip ? ' se sair cara' : ''),
    of: (owner, what) => `${what} de ${owner}`, piece: (by, t) => `${by}: ${t}`, big: x => `A peça mais importante é ${x}.`,
    how: { lock: 'travando', mill: 'descartando o deck do oponente', stall: 'aguentando', denial: 'tirando Energia e cartas' },
    also: { lock: 'trava', mill: 'descarta o deck do oponente', stall: 'serve de muralha', denial: 'tira Energia e cartas' },
    kind: { lock: 'Trava', mill: 'Descarte de deck', stall: 'Muralha', denial: 'Disrupção' },
    winsBy: x => 'Vence ' + x, winsNot: x => `Este deck vence ${x}, não trocando Nocautes, então o dano dele conta menos.`,
    winsRather: x => `Este deck vence ${x} em vez de trocar golpes fortes.`, plan: x => 'Plano de jogo: ' + x,
    alsoT: x => 'Também ' + x, besidesWins: x => `Além de atacar, este deck ${x}, e assim vence partidas que só os golpes não venceriam.`,
    besides: x => `Além de atacar, este deck ${x}.`, lists: n => `O plano de jogo lista mais ${n}.`, keep: x => `Mantenha ${x} no Campo Ativo`,
    onlyActive: x => `${x} só funciona enquanto está no Campo Ativo.`,
    switchOff: k => `Trocá-lo ou perdê-lo desliga ${({ lock: 'a trava', mill: 'o descarte', stall: 'a muralha', denial: 'a disrupção' })[k]}, então planeje seus recuos em torno dele.`,
    rests: (k, x, n) => `${({ lock: 'A trava', mill: 'O descarte', stall: 'A muralha', denial: 'A disrupção' })[k]} depende de ${x}, e a lista usa ${n}.`,
    only: (n, x) => `Só ${n} ${x}`,
  },
};
Object.assign(I18N_ES, {
  'Low damage, by design': 'Poco daño, a propósito',
  'The grade counts what this deck stops more than its damage.': 'La calificación da más peso a lo que esta baraja frena que a su daño.',
  'With so few copies it is often prized or gone after one knockout.': 'Con tan pocas copias suele quedar en los premios o perderse tras un solo Fuera de Combate.',
  'Most lists run 3 or 4.': 'La mayoría de las listas lleva 3 o 4.',
});
Object.assign(I18N_PT, {
  'Low damage, by design': 'Pouco dano, de propósito',
  'The grade counts what this deck stops more than its damage.': 'A nota dá mais peso ao que este deck impede do que ao dano dele.',
  'With so few copies it is often prized or gone after one knockout.': 'Com tão poucas cópias, ele costuma ficar nos prêmios ou sumir depois de um só Nocaute.',
  'Most lists run 3 or 4.': 'A maioria das listas usa 3 ou 4.',
});
const I18N_CTL_PATS = {};
/** One sentence or title of the control path in language l, or null. Built on first use, so a language file can load before this one. */
function i18nCtlSent(s, l) {
  const ps = I18N_CTL_PATS[l] || (I18N_CTL_PATS[l] = i18nCtlPats(l));
  // A sentence that runs on into another ("Besides attacking, this deck locks. Budew's ...") is read one sentence at a time.
  if (/[a-z0-9)][.!?] [A-Z0-9¿¡]/.test(s)) return null;
  for (const p of ps) { const m = s.match(p[0]); if (m) { const r = p[1](...m); if (r != null) return r; } }
  return null;
}
// After the Abilities pattern, which gives null for these and leaves them here.
I18N_PAT.push([/^[\s\S]+$/, m => i18nCtlSent(m, 'es'), m => i18nCtlSent(m, 'pt')]);
// The Power findings' damage text (core.js), translated sentence by sentence.

// 3.2.8 (Muse section 4): the Power findings (damage, prizes and setup speed) in every language. core.js builds
// each finding from a small set of English sentences (g35Hit, g62Need, g37Hits and the findings in gViability,
// and the build check in v69-grade-blend.js), so each sentence is read back into its parts here and said again
// from the language's own words: I18N_DMG.es and .pt below, I18N_MORE[lang].dmg in the other files. Card, attack
// and Ability names stay English. A sentence with any part this cannot read gives null, so the finding stays in
// English rather than coming out half translated.
const I18N_DMG_TY = 'Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy';
function i18nDmgTab(l) { return l === 'es' || l === 'pt' ? I18N_DMG[l] : (i18nMore(l) || {}).dmg; }
/** A list of names with the language's own "and": "A, B and C". */
function i18nDmgJoin(a, T) { return a.length > 1 ? a.slice(0, -1).join(', ') + T.and + a[a.length - 1] : a[0]; }
/** "A, B and C" or "A and B" (card names) with the language's own "and". */
function i18nDmgNames(s, T) { return i18nDmgJoin(String(s).split(/, | and /), T); }
/** "Fire and Lightning Energy", "Basic Grass Energy cards", "Energy" as parts for T.en; null for anything else. */
/** "Fire Energy" or "Energy" as an Energy's name in Spanish or Portuguese ("Energía Fuego"). */
function i18nEnName(e, l) {
  const m = String(e).match(/^(?:Basic )?(\w+) Energy$/), w = l === 'es' ? 'Energía' : 'Energia';
  return m && I18N_TYPES[l][m[1]] ? w + ' ' + I18N_TYPES[l][m[1]] : w;
}
function i18nDmgE(w, T, n) {
  const m = String(w).match(new RegExp(`^(Basic )?((?:${I18N_DMG_TY})(?:(?:, | and )(?:${I18N_DMG_TY}))*)? ?Energy( cards?)?$`));
  if (!m) return null;
  return T.en(m[2] ? m[2].split(/, | and /) : [], !!m[1], n == null ? 1 : +n, !!m[3]);
}
/** The cards a pile attack counts (g56One, g56Many): "Ethan's Adventure cards", "Supporter cards with Team Rocket in its name". */
function i18nDmgPile(s, T, n) {
  let m;
  const many = n != null && +n !== 1;
  if ((m = s.match(/^(Item|Supporter|Trainer|Stadium|Pokemon Tool) cards? with (.+) in its name$/))) return T.pile({ k: 'kindHas', kind: m[1], has: m[2] }, many);
  if ((m = s.match(/^(Item|Supporter|Trainer|Stadium|Pokemon Tool) cards?$/))) return T.pile({ k: 'kind', kind: m[1] }, many);
  if (/Energy( cards?)?$/.test(s)) return i18nDmgE(s, T, n);
  if (s === 'Pokemon') return T.pile({ k: 'pokemon' }, many);
  if ((m = s.match(/^(Basic|Stage 1|Stage 2) Pokemon$/))) return T.pile({ k: 'stage', stage: m[1] }, many);
  if ((m = s.match(/^(.+) Pokemon$/))) return T.pile({ k: 'pre', pre: m[1] }, many);
  if ((m = s.match(/^Pokemon with (.+)$/)) || (m = s.match(/^Pokémon that have the (.+) ability$/))) return T.pile({ k: 'atk', atk: m[1] }, many);
  if ((m = s.match(/^(.+?) cards?$/)) && i18nCtlCard(m[1])) return T.pile({ k: 'name', name: m[1] }, many);
  if (/ or /.test(s) && s.split(' or ').every(i18nCtlCard)) return T.pile({ k: 'or', names: s.split(' or ') }, many);
  return null;
}
/** The boosts a hit counts ("Kieran and Dusknoir's Cursed Blast", "its Fighting Fist with Fighting Energy attached"). */
function i18nDmgBoost(s, T) {
  const parts = []; let cur = null;
  for (const p of String(s).split(' and ')) {
    if (cur != null) { cur += ' and ' + p; if (/ attached$/.test(cur)) { parts.push(cur); cur = null; } continue; }
    if (/^its /.test(p) && !/ attached$/.test(p)) { cur = p; continue; }
    parts.push(p);
  }
  if (cur != null || !parts.length) return null;
  const out = parts.map(p => { let m;
    if ((m = p.match(/^its (.+?) with (.+ Energy) attached$/))) { const e = i18nDmgE(m[2], T, 1); return e && T.selfB(m[1], e); }
    if ((m = p.match(/^(.+?) from (\d+) (.+)$/))) return T.from(m[1], m[3], m[2]);
    if ((m = p.match(/^(.+?) from (.+)$/))) return T.from(m[1], m[2]);
    return /'s /.test(p) ? i18nCtlBy(p, T) : p;
  });
  return out.every(x => x) ? i18nDmgJoin(out, T) : null;
}
/** "Mew ex copying Mega Kangaskhan ex's Rapid-Fire Combo with Memory Helix" as its parts. */
function i18nDmgWho(h, T) {
  const m = h.match(/^(.+?) copying (.+?'s .+) with (.+)$/);
  return m ? { nm: m[1], cp: i18nCtlBy(m[2], T), via: m[3] } : { nm: h };
}
const I18N_DMG_COND = { 'against a Pokemon ex': 'ex', 'while it is Poisoned': 'poison', 'while you are behind on prizes': 'behind', 'when that Supporter is the last card in your hand': 'last' };
/** What a fixed bonus waits on (g62Need's "when"), as parts for T.when; null when it cannot be read. */
function i18nDmgWhen(s) {
  let m;
  const TY = `(?:${I18N_DMG_TY})`;
  if ((m = s.match(/^on a turn (.+) moves up from your Bench to the Active Spot$/))) return { k: 'moved', nm: m[1] };
  if ((m = s.match(/^once (.+) has damage counters on it$/))) return { k: 'selfdmg', nm: m[1] };
  if (s === 'against an Active Pokemon that already has damage counters on it') return { k: 'oppdmg' };
  if ((m = s.match(/^once your deck is down to (\d+) cards or fewer$/))) return { k: 'deck', n: m[1] };
  if ((m = s.match(/^with (\d+) extra Energy attached to it$/))) return { k: 'xenergy', n: m[1] };
  if (s === 'while you have a Stadium in play') return { k: 'stadium' };
  if ((m = s.match(new RegExp(`^with a (${TY}) Pokemon on your Bench$`)))) return { k: 'btype', t: m[1] };
  if ((m = s.match(new RegExp(`^with (?:(${TY}(?: and ${TY})*) )?Energy attached to (.+)$`)))) return { k: 'energy', t: m[1] || '', nm: m[2] };
  if ((m = s.match(/^with (.+) on your Bench$/))) return { k: 'bnames', names: m[1] };
  if (s === 'on the turn after one of your Pokemon was Knocked Out') return { k: 'ko' };
  if (s === 'when it used the same attack the turn before') return { k: 'next' };
  if ((m = s.match(/^on a turn you play a (.+) Supporter$/))) return { k: 'supname', x: m[1] };
  if (s === 'while you still have all 6 Prize cards left') return { k: 'prize6' };
  if ((m = s.match(/^on the turn it evolves from (.+)$/))) return { k: 'evolved', x: m[1] };
  if ((m = s.match(new RegExp(`^with (\\d+) (?:(${TY}) )?Energy in play$`)))) return { k: 'inplay', n: m[1], t: m[2] || '' };
  if ((m = s.match(/^with (\d+) Pokemon with (.+) in your discard pile$/))) return { k: 'discab', n: m[1], a: m[2] };
  return null;
}
const I18N_DMG_CS = /^(\d+) cards? that (switch(?:es)? it in or lets? you retreat for free|puts? damage counters on it first|attach(?:es)? extra Energy)$/;
const i18nDmgCsK = w => /^switch/.test(w) ? 'moved' : /^put/.test(w) ? 'oppdmg' : 'xenergy';
/** Why the grade counts less than the full hit ("since ..."), as the language's words; null when it cannot be read. */
function i18nDmgWhy(s, T) {
  let m;
  const W = T.why;
  if (s === 'you attack the turn it evolves') return W.evolved();
  if ((m = s.match(/^it can keep attacking turn after turn, but its first use does (\d+)$/))) return W.next(m[1]);
  if ((m = s.match(/^your list has only (.+)$/)) && (m = m[1].match(I18N_DMG_CS))) return W.only(m[1], i18nDmgCsK(m[2]));
  if (s === 'nothing in your list puts damage counters on it before you attack') return W.noCounters();
  if (s === 'that is only at the very end of a game') return W.endGame();
  if (s === 'that is only before you take your first prize') return W.prize6();
  if (s === 'your list does not run all of them') return W.notAll();
  if ((m = s.match(/^your list has only (\d+) Stadiums?$/))) return W.stadiums(m[1]);
  if ((m = s.match(new RegExp(`^your list has only (\\d+) (${I18N_DMG_TY}) Pokemon$`)))) return W.typeMon(m[1], m[2]);
  if ((m = s.match(new RegExp(`^your list has only (\\d+) ((?:(?:${I18N_DMG_TY}) )?Energy)$`)))) { const e = i18nDmgE(m[2], T, m[1]); return e && W.energy(m[1], e); }
  if ((m = s.match(/^your list has only (\d+) (.+?) Supporters?$/))) return W.supname(m[1], m[2]);
  if ((m = s.match(/^your list has only (\d+) Pokemon with (.+)$/))) return W.discab(m[1], m[2]);
  const thin = x => { let k;
    if ((k = x.match(/^the list runs only (?:1 copy of|(\d+) copies of) (.+?)( or its line)?, so it is not always in play$/))) return W.thinSelf(k[1] || '1', k[2], !!k[3]);
    if ((k = x.match(/^there (?:is only 1|are only (\d+)) (.+?)( or its line)? to copy from, so it is not always in play$/))) return W.thinCopy(k[1] || '1', k[2], !!k[3]);
    return null; };
  if ((m = s.match(/^the full hit needs (.+)$/))) {
    let x = m[1], th = null, grow = false, k;
    if ((k = x.match(/^(.+?) and ((?:the list runs only|there (?:is|are) only) .+)$/))) { th = thin(k[2]); if (!th) return null; x = k[1]; }
    if (x === 'time to grow') return W.needs(null, true, th);
    if ((k = x.match(/^(.+) and time to grow$/))) { grow = true; x = k[1]; }
    const b = i18nDmgBoost(x, T);
    return b && W.needs(b, grow, th);
  }
  return thin(s);
}
/** The words of a hit sentence's "with ..." part: boosts, then the conditions. */
function i18nDmgWith(s, T) {
  let at = -1;
  for (const c of Object.keys(I18N_DMG_COND)) { const i = s.indexOf(' ' + c); if (i > 0 && (at < 0 || i < at)) at = i; }
  const b = i18nDmgBoost(at < 0 ? s : s.slice(0, at), T);
  if (!b) return null;
  const conds = at < 0 ? [] : s.slice(at + 1).split(' and ').map(c => I18N_DMG_COND[c]);
  return conds.every(Boolean) ? { b, conds } : null;
}
/** "its Run Errand Ability" or "Mega Kangaskhan ex's Run Errand and Mega Lucario ex's Aura Jab" (a three-prize engine). */
function i18nDmgFor(s, T) {
  let m;
  if ((m = s.match(/^its (.+) Ability$/))) return T.itsAb(m[1]);
  const parts = s.split(' and ').map(p => /'s /.test(p) ? i18nCtlBy(p, T) : null);
  return parts.every(Boolean) ? T.theirAb(i18nDmgJoin(parts, T)) : null;
}
/** One Ability phrase from the card reader ("looks at the top 2 cards and puts 1 into your hand"), said in language l. */
function i18nDmgAbil(p, l) {
  const L = l === 'es' || l === 'pt' ? I18N_ABIL[l] : (i18nMore(l) || {}).abil;
  const x = L && i18nAbParse(p);
  if (!x) return null;
  try { const r = i18nAbSay(x, L); return r && !/\b(?:undefined|null|NaN)\b/.test(r) ? r : null; } catch (e) { return null; }
}
function i18nDmgPats(l) {
  const T = () => i18nDmgTab(l);
  const by = x => i18nCtlBy(x, T());
  const nm = x => i18nDmgNames(x, T());
  const many = v => v === 'give' || v === 'are' || v === 'they fall';
  const TY = `(?:${I18N_DMG_TY})`;
  return [
    // g35Hit: the hit itself.
    [/^(.+?) (hits for at most|averages) (\d+) before Weakness\.$/, (m, h, v, top) => T().hit(i18nDmgWho(h, T()), v === 'averages', top, null)],
    [/^(.+?) (hits for at most|averages) (\d+) with (.+) \((\d+) without\), before Weakness\.$/, (m, h, v, eff, w, top) => {
      const x = i18nDmgWith(w, T()); return x && T().hit(i18nDmgWho(h, T()), v === 'averages', top, Object.assign(x, { eff })); }],
    [/^Using it Knocks Out (.+), which gives up a prize\.$/, (m, x) => T().koUse(nm(x))],
    [/^Using it Knocks Out (.+), which gives up a prize, so it finishes a knockout rather than starting one\.$/, () => null],
    [/^Its (.+?) does (\d+) only (.+), (\d+) otherwise\.$/, (m, a, full, w, base) => { const x = i18nDmgWhen(w); return x && T().need(a, full, x, base); }],
    [/^Your list has (.+), so the grade counts (\d+)\.$/, (m, w, n) => { const k = w.match(I18N_DMG_CS); return k && T().hasCards(k[1], i18nDmgCsK(k[2]), n); }],
    [/^The full hit comes after it has taken a hit, not on its first attack\.$/, () => T().afterHit],
    [/^The full hit comes after you lose a Pokemon, not on your first attack\.$/, () => T().afterKo],
    [/^Your list can set that up, so the grade counts (\d+)\.$/, (m, n) => T().canSet(n)],
    [/^The grade counts (\d+), since (.+)\.$/, (m, n, w) => { const x = i18nDmgWhy(w, T()); return x && T().since(n, x); }],
    [/^Its (.+?) lets it attack twice a turn(?: while (.+?) is in play)?, so the grade counts two hits of (\d+), (\d+) in all(?:, or (\d+) with (.+) on both)?\.$/,
      (m, a, st, one, all, eff, b) => { const x = b ? i18nDmgBoost(b, T()) : ''; return x == null ? null : T().twice(a, st || '', one, all, eff || '', x); }],
    [/^It flips coins until tails, so a bigger hit can happen but is not something to count on\.$/, () => T().tails],
    [/^That counts coin flips at their average\.$/, () => T().flipAvg],
    [/^That is the average for cards off the top of the deck: your list runs (\d+) (.+), so a bigger or smaller hit is down to luck\.$/, (m, n, w) => { const p = i18nDmgPile(w, T(), n); return p && T().millAvg(n, p); }],
    [/^It counts the cards in your hand, so (\d+) is the app's estimate for about (\d+) cards(, with the list's draw Abilities filling the hand)?, not a printed number\.$/, (m, t, n, f) => T().hand(t, n, !!f)],
    [/^Its damage depends on the board, so (\d+) is the app's estimate, not a printed number\.$/, (m, t) => T().lowConf(t)],
    // Energy scaling.
    [/^(.+?) does (?:(\d+) plus )?(\d+) for each Energy attached to both Active Pokemon\.$/, (m, x, b, p) => T().escBoth(by(x), b || '', p)],
    [/^The app counts (\d+) on it(?:, each counting twice with (.+?))?, and 2 on your opponent's Active, so (\d+) is its estimate, not a printed number\.$/, (m, n, w, t) => T().appCounts(n, w ? by(w) : '', t)],
    [/^(.+?) discards (.*Energy) from your Pokemon and does (\d+) for each one discarded\.$/, (m, x, w, p) => { const e = i18nDmgE(w, T(), 2); return e && T().escDisc(by(x), e, p); }],
    [/^(.+?) does (?:(\d+) plus )?(\d+) for each (.*Energy) attached to (all your Pokemon|it)\.$/, (m, x, b, p, w, sc) => { const e = i18nDmgE(w, T(), 1); return e && T().escPer(by(x), b || '', p, e, sc === 'it' ? 'it' : 'all'); }],
    [new RegExp(`^(.+?) makes each Basic (${TY}) Energy count twice\\.$`), (m, x, t) => T().x2(by(x), t)],
    [new RegExp(`^It takes (\\d+)(?: Basic (${TY}) Energy cards)? to one-shot (\\d+) HP and (\\d+) for (\\d+) HP, before Weakness\\.$`), (m, a, t, lo, b, hi) => T().takes(a, t || '', lo, b, hi)],
    [/^Your list runs (\d+)\.$/, (m, n) => T().listRuns(n)],
    [/^(.+) (adds?) (\d+) more( against a Pokemon ex)?\.$/, (m, w, v, n, ex) => { const b = i18nDmgBoost(w, T()); return b && T().adds(b, v === 'add', n, !!ex); }],
    // Attacks that Knock Out outright.
    [/^(.+?) Knocks Out your opponent's Active (Basic )?Pokemon when it has exactly (\d+) damage counters on it, and this list can put counters on it to set that up, so the grade counts it as a one-shot of anything\.$/, (m, x, b, n) => T().koxCounters(by(x), !!b, n)],
    [/^(.+?) Knocks Out your opponent's Active (Basic )?Pokemon on a coin flip, (?:half the time|one time in (\d+)), so the grade counts it at (\d+)\.$/, (m, x, b, n, t) => T().koxFlip(by(x), !!b, n || '2', t)],
    [/^(.+?) Knocks Out your opponent's Active (Basic )?Pokemon outright, so the grade counts it as a one-shot of anything\.$/, (m, x, b) => T().koxOut(by(x), !!b)],
    // g37Hits: how many hits the format's threats take.
    [/^That knocks out the format's (\d+) to (\d+) HP threats in one turn\.$/, (m, lo, hi) => T().oneTurn(lo, hi)],
    [/^That one-shots the format's (\d+) to (\d+) HP threats\.$/, (m, lo, hi) => T().oneShots(lo, hi)],
    [/^The format's (\d+) to (\d+) HP threats take (two|three|four|\d+) (hits|turns) each\.$/, (m, lo, hi, w, u) => T().takeEach(lo, hi, I18N_DMG_W[w] || w, u === 'turns')],
    [/^(\d+) HP threats take (one|two|three|four|\d+) (hits?|turns?) and (\d+) HP threats take (one|two|three|four|\d+) (?:hits?|turns?)\.$/, (m, lo, a, u, hi, b) => T().takeTwo(lo, I18N_DMG_W[a] || a, hi, I18N_DMG_W[b] || b, /^turn/.test(u))],
    // The finding's lead, its closing sentences, and the spread deck.
    [/^(.+?) is (the main attacker you set|this deck's main attacker(?:, since the list plays the most of its line|, since the deck is named for it)?), but the hardest hit the grade can count comes from another Pokemon\.$/,
      (m, x, w) => T().lead(x, /you set/.test(w) ? 'pick' : /most of its line/.test(w) ? 'list' : /named for it/.test(w) ? 'name' : 'main')],
    [/^(.+?) (give|gives) up one prize per knockout, so needing two hits for a two-prize threat still keeps the prize race even\.$/, (m, x, v) => T().oneTail(nm(x), many(v))],
    [/^You cannot trade up, which usually loses the prize race\.$/, () => T().cantTrade],
    [/^This deck wins on spread math: (.+?) chips the whole board and your counter-movers concentrate it\.$/, (m, x) => T().spread(x)],
    [/^The single-hit number \((\d+)\) undersells its reach against (\d+) to (\d+) HP threats\.$/, (m, n, lo, hi) => T().undersells(n, lo, hi)],
    [/^The single-hit number undersells it\.$/, () => T().undersellsIt],
    // Hits that grow.
    [/^(.+?) hits for (\d+) with (\d+) (.+) attached and (\d+) once (\d+) are in play\.$/, (m, x, now, n, w, top, nt) => { const e = i18nDmgE(w, T(), n); return e && T().grows(x, now, n, e, top, nt); }],
    [/^Your list runs (\d+), so the full hit is a mid game plan, not a turn 2 one\.$/, (m, n) => T().growsMid(n)],
    [/^(.+?) hits for (\d+) with 2 (.+?) (in your discard pile|on your Bench|in play) and (\d+) once you have (\d+)\.$/, (m, x, now, w, where, top, n) => { const p = i18nDmgPile(w, T(), 2); return p && T().growsPile(x, now, p, where, top, n); }],
    [/^(.+?) hits for (\d+) early and (\d+) once you have (\d+) (.+) in your discard pile\.$/, (m, x, now, top, n, w) => { const p = i18nDmgPile(w, T(), n); return p && T().growsEarly(x, now, top, n, p); }],
    [/^Your list (can have (\d+) there at once|has (\d+) of those cards), so the full hit is a (late game plan that needs a lot of them in the pile|mid game plan, not a turn 2 one)\.$/,
      (m, w, a, b, k) => T().growsHave(a || b, !!a, /^late/.test(k))],
    // Hard to disrupt, and Pokemon that wall Pokemon ex.
    [/^(\d+) of your Pokemon have Abilities that (block the effects of your opponent's attacks or Abilities|prevent damage from some of your opponent's attacks|block damage or effects from some of your opponent's attacks) \((.+)\)\.$/,
      (m, n, w, x) => T().protect(n, /^block the/.test(w) ? 'effects' : /^prevent/.test(w) ? 'damage' : 'both', x)],
    [/^Damage still goes through, so this stops lock and disruption, not knockouts\.$/, () => T().dmgThrough],
    [/^Read each card for when it applies\.$/, () => T().readEach],
    [/^(.+?) prevents all damage done to it by attacks from your opponent's Pokemon ex, so an ex deck has to find another way to knock it out\.$/, (m, x) => T().wallsEx(by(x))],
    [/^Pokemon without a Rule Box still hit it normally\.$/, () => T().noRuleBox],
    // An attack the list's Energy cannot pay for, and damage the grade leaves out.
    [/^(.+?) needs (.+)\.$/, (m, x, w) => {
      if (!/'s /.test(x)) return null;
      const parts = w.split('; it also needs ').map(p => { let k;
        if ((k = p.match(new RegExp(`^((?:${TY})(?: and ${TY})*) Energy, which this list doesn't run$`)))) { const e = i18nDmgE(k[1] + ' Energy', T(), 2); return e && T().payNone(e); }
        if ((k = p.match(new RegExp(`^(\\d+) (${TY}) Energy, and this list runs only (\\d+)$`)))) { const e = i18nDmgE(k[2] + ' Energy', T(), k[1]); return e && T().payFew(k[1], e, k[3]); }
        return null; });
      return parts.every(Boolean) ? T().cantPay(by(x), parts) : null; }],
    [/^The grade counts (.+?) \((\d+)\) for it instead\.$/, (m, a, n) => T().instead(a, n)],
    [/^(.+?) uses an attack from whatever comes off the top of your deck, so the grade does not count its damage\.$/, (m, x) => T().millCopy(by(x))],
    [/^(.+?) hits (each|\d+) of your opponent's Pokemon for (\d+)( each)?, so two uses can Knock Out (a whole board|\d+) of their Pokemon with (\d+) HP or less\.$/, (m, h, k, top, e, n, hp) => {
      const c = h.match(/^(.+?), copying (.+?),$/); const how = c ? T().copyHow(by(c[1]), by(c[2])) : by(h);
      return T().multi(how, k === 'each' ? 0 : k, top, n === 'a whole board' ? 0 : n, hp); }],
    [/^(.+?) needs ((?:\d+ \w+)(?: and \d+ \w+)*) Energy, and the list runs few Energy that (.+?) can use for it, so it is often not ready to attack\.$/, (m, a, w, x) => {
      const ps = w.split(' and ').map(p => p.split(' ')); if (!ps.every(p => new RegExp(`^${TY}$`).test(p[1]))) return null;
      return T().fewE(a, ps.map(p => T().en([p[1]], false, +p[0], false)).map((e, i) => ps[i][0] + ' ' + e), x); }],
    [/^Your hardest hit comes from (.+?), and the list can put (only one|few) into play, with no other attacker close to it\.$/, (m, x, k) => T().hardest(x, k === 'only one')],
    [/^When it is prized or Knocked Out, your damage drops a lot\.$/, () => T().drops],
    // Three-prize Pokemon.
    [/^(.+?) (give|gives) up 3 prizes when (they fall|it falls), but (they are|it is) here for (.+), not to trade hits\.$/, (m, x, v, f, w, a) => { const r = i18nDmgFor(a, T()); return r && T().engine3(nm(x), many(v), r); }],
    [/^Your (\d+) ways to switch or retreat(?:, like (.+?),)? let you use it, then move it out before your opponent can Knock it out\.$/, (m, n, x) => T().ways(n, x || '')],
    [/^Use it, then retreat or switch it out before your opponent's turn, and keep it off the Bench when they can hit the Bench\.$/, () => T().useRetreat],
    [/^(.+?) (give|gives) up 3 prizes when (they fall|it falls), half the game in one knockout, while (.+?) gives up one\.$/, (m, x, v, f, y) => T().side3(nm(x), many(v), y)],
    [/^Put (them|it) in play only when you need (?:them|it)\.$/, (m, p) => T().putOnly(p === 'them')],
    [/^(.+?) (give|gives) up 3 prizes when (they fall|it falls)\.$/, (m, x, v) => T().give3(nm(x), many(v))],
    [/^(.+?) (give|gives) up 3 prizes when (they fall|it falls), but you cannot reliably one-shot back\.$/, (m, x, v) => T().cantBack(nm(x), many(v))],
    [/^Your best hit \((\d+)\) one-shots Pokemon with (\d+) HP or less, but the biggest threats take two hits, so those trades cost you more than they cost your opponent\.$/, (m, n) => T().bestHit(n)],
    [/^That is a losing exchange unless you tighten the damage\.$/, () => T().losing],
    // Two-prize Pokemon.
    [/^Every Pokemon here gives up two prizes, so the opponent needs only three knockouts\.$/, () => T().allTwo],
    [/^That is normal for a deck built on Pokemon ex, so each one has to take more than one knockout of its own\.$/, () => T().normalEx],
    [/^(\d+) of your (\d+) Pokemon give up two prizes, so most knockouts cost you two\.$/, (m, a, b) => T().mostTwo(a, b)],
    [/^Send in your one-prize Pokemon when you can\.$/, () => T().sendOne],
    [/^(\d+) of your (\d+) Pokemon (?:give|gives) up two prizes and the rest give up one, so you are not handing over easy multi-prize turns\.$/, (m, a, b) => T().restOne(a, b)],
    // Setup speed.
    [/^Your Stage 2 Pokemon \((.+?)\) evolve through (.+?)( with 1 Rare Candy as a shortcut| without Rare Candy), so plan on attacking with them from your third turn\.$/,
      (m, x, mids, c) => T().longWay(x, nm(mids), /with 1/.test(c))],
    [/^Faster decks start swinging by turn (\d+), so your early Pokemon have to hold the line until then\.$/, (m, n) => T().faster(n)],
    [/^Your Stage 2 Pokemon \((.+?)\) evolve through (\d+) (.+?), and (.+?'s .+?) (looks at .+|searches .+|draws .+|puts .+|attaches .+|discards .+) every turn on the way up, so the slow line still sets up on time\.$/,
      (m, x, n, mid, a, p) => { const ab = i18nDmgAbil(p, l); return ab && T().midEng(x, n, mid, by(a), ab); }],
    [/^You lean on Stage 2 Pokemon \((.+?)\) with (?:only (\d+)|no) Rare Candy\.$/, (m, x, n) => T().lean(x, n || '')],
    [/^In a format that starts swinging by turn (\d+), a slow setup can lose the game before you are online\.$/, (m, n) => T().slow(n)],
    [/^((?:\d+ .+?)(?:, \d+ .+?)*) (give|gives) you a draw or search Ability once a turn, so the deck finds its pieces without spending a Supporter on it\.$/, (m, x) => T().engs(x, !/^1 [^,]+$/.test(x))],
    [/^(\d+) different Pokemon in the list hit for (\d+) or more: (.+?)(?: and (\d+) more)?\.$/, (m, n, hp, x, more) => T().toolbox(n, hp, x, more || '')],
    [/^You pick the attacker that fits each turn(?:, including (\d+) that (?:give|gives) up one prize)?, so your opponent cannot plan around one threat\.$/, (m, n) => T().pick(n || '')],
    [/^The list runs one copy of its main attacker\.$/, () => T().oneCopy],
    [/^It is in your prizes in about 1 game in 10, and once it is Knocked Out the deck has no one to carry the plan\.$/, () => T().prizedIn],
    // 3.3.2: a single main attacker an Ability puts back from the discard pile (Gengar's Netherworld Gate).
    [/^The list runs one copy of its main attacker, and (?:its (.+?)|(.+?)'s (.+?)) puts it back onto your Bench from your discard pile, so a Knock Out does not end the plan\.$/, (m, a, by, b) => T().oneBack && T().oneBack(a || b, by || '')],
    [/^It is still in your prizes in about 1 game in 10\.$/, () => T().stillPrized],
    // 3.3.3: how often that second life comes together, and the Power credit for it (finding and Why Power is).
    [/^That second life comes together in about (\d+)% of games, since (.+?) has to reach play or your discard pile first and is in your prizes in about 1 game in 10\.$/, (m, p, x) => T().backOdds && T().backOdds(p, x)],
    [/^Power counts it as (\d+)% of a second copy\.$/, (m, p) => T().backCr && T().backCr(p)],
    [/^(.+?) coming back with (?:(.+?)'s )?(.+?), in about (\d+)% of games, adds ([\d.]+) to Damage\.$/, (m, x, b, a, p, d) => T().backDmg && T().backDmg(x, a, b || '', p, d)],
    [/^(.+?) coming back with (?:(.+?)'s )?(.+?), in about (\d+)% of games, adds less than 0\.1 to Damage, since other attackers in the list already cover a Knock Out\.$/, (m, x, b, a, p) => T().backLow && T().backLow(x, a, b || '', p)],
    [/^Most lists run (\d+) to (\d+)\.$/, (m, a, b) => T().mostRun(a, b)],
    [/^(\d+) (.+?) evolve from (.+?), and the list has 1\.$/, (m, n, x, y) => T().thinRoot && T().thinRoot(n, x, y)],
    [/^If it is prized or Knocked Out, they have nothing to evolve from\.$/, () => T().thinKO],
    [/^Most top (.+?) lists run (\d+)(?: (or|to) (\d+))?\.$/, (m, x, a, w, b) => T().mostTop && T().mostTop(x, a, w || '', b || '')],
    // The build check (v69-grade-blend.js).
    [/^(.+?) lists that finished in the top quarter of recent online tournaments run about (\d+) Energy\.$/, (m, a, n) => T().archE(a, n)],
    [/^This list runs (\d+)(?:, and its (\d+) Energy search Items? counts? as (\d+) more, so (\d+))?, outside the (\d+) to (\d+) the grade allows\.$/, (m, raw, s, plus, n, lo, hi) => T().outside(raw, s || '', plus || '', n || '', lo, hi)],
    [/^The extra Energy takes the place of draw and search, so many turns open with Energy you cannot use\.$/, () => T().extraE],
    [/^Trade some for draw or search cards\.$/, () => T().tradeSome],
    [/^With fewer, attackers often miss an attachment and fall behind\.$/, () => T().fewerE],
    [/^Add Energy back\.$/, () => T().addBack],
    [/^Nearly every (.+?) list that finished in the top quarter of recent online tournaments runs these, and this one is (\d+) copies short: (.+?)(?: and (\d+) more)?\.$/, (m, a, n, x, more) => {
      const items = x.split(/(?<=\)), /).map(p => { const k = p.match(/^(.+) \((?:(\d+) of (\d+)|none of (\d+))\)$/); return k && T().coreItem(k[1], k[2] || '0', k[3] || k[4]); });
      return items.every(Boolean) ? T().core(a, n, items.join(', '), more || '') : null; }],
    [/^A few swaps are normal, so the first (\d+) copies cost nothing\.$/, (m, n) => T().swaps(n)],
    [/^Add the rest back unless you have a reason not to\.$/, () => T().restBack],
    // Under the grade (g68Line): the blend archetype differs from the one built around the main attacker.
    [/^This list's cards sit closest to (.+?), so the grade uses its results, not those of (.+?), the deck built around (.+?)\.$/, (m, a, b, x) => T().blend(a, b, x)],
    // Titles.
    [/^Evolves the long way, drawing as it goes$/, () => T().tLongDraw],
    [/^(.+?): a three-prize engine$/, (m, x) => T().tEngine(x)],
    [/^(.+?) can't pay for (.+)$/, (m, x, a) => T().tCantPay(x, a)],
    [/^Only (\d+(?:\.\d+)?|no) (.+?) to hit with$/, (m, n, x) => T().tOnlyHit(n === 'no' ? '0' : n, x)],
  ];
}
const I18N_DMG_W = { one: '1', two: '2', three: '3', four: '4' };
const I18N_DMG_PATS = {};
/** One sentence or title of the Power findings in language l, or null. Built on first use, so a language file can load before this one. */
function i18nDmgSent(s, l) {
  const T = i18nDmgTab(l);
  if (!T) return null;
  const ps = I18N_DMG_PATS[l] || (I18N_DMG_PATS[l] = i18nDmgPats(l));
  // A sentence that runs on into another is read one sentence at a time.
  if (/[a-z0-9)][.!?] [A-Z0-9¿¡]/.test(s)) return null;
  for (const p of ps) { const m = s.match(p[0]); if (m) { let r = null; try { r = p[1](...m); } catch (e) { r = null; } if (r != null && !/\b(?:undefined|null|NaN)\b/.test(r)) return r; } }
  return null;
}
const I18N_DMG = {
  es: (function () {
    const Y = I18N_AB_TYP.es, n1 = n => +n === 1;
    const deX = x => /'s$/.test(x) ? 'de ' + x.slice(0, -2) : x;
    const cs = (n, k) => ({ moved: n1(n) ? 'carta que lo cambia al Puesto Activo o te deja retirarte gratis' : 'cartas que lo cambian al Puesto Activo o te dejan retirarte gratis',
      oppdmg: n1(n) ? 'carta que le pone contadores de daño antes' : 'cartas que le ponen contadores de daño antes',
      xenergy: n1(n) ? 'carta que une Energía extra' : 'cartas que unen Energía extra' })[k];
    const KIND = { Item: 'Objeto', Supporter: 'Partidario', Trainer: 'Entrenador', Stadium: 'Estadio', 'Pokemon Tool': 'Herramienta Pokémon' };
    const STG = { Basic: ['Pokémon Básico', 'Pokémon Básicos'], 'Stage 1': ['Pokémon de Fase 1', 'Pokémon de Fase 1'], 'Stage 2': ['Pokémon de Fase 2', 'Pokémon de Fase 2'] };
    const AT = 'Fuera de Combate';
    const pl = (p, a, b) => p ? b : a;
    return {
      and: ' y ', of: (o, w) => `${w} de ${o}`,
      en: (ts, basic, n, cards) => { const k = cards ? 1 : n;
        let e = ts.length ? i18nEnergy(ts.join(' and ') + ' Energy', 'es', k) : (n1(k) ? 'Energía' : 'Energías');
        if (basic) e += n1(k) ? ' Básica' : ' Básicas';
        return cards ? (n1(n) ? 'carta de ' : 'cartas de ') + e : e; },
      pile: (p, m) => p.k === 'kindHas' ? `${m ? 'cartas' : 'carta'} de ${KIND[p.kind]} con ${p.has} en el nombre`
        : p.k === 'kind' ? `${m ? 'cartas' : 'carta'} de ${KIND[p.kind]}` : p.k === 'pokemon' ? 'Pokémon' : p.k === 'stage' ? STG[p.stage][m ? 1 : 0]
        : p.k === 'pre' ? `Pokémon ${deX(p.pre)}` : p.k === 'atk' ? `Pokémon con ${p.atk}` : p.k === 'name' ? `${m ? 'cartas' : 'carta'} ${p.name}` : p.names.join(' o '),
      selfB: (a, e) => `${a} con ${e} unida`, from: (a, w, n) => `${a} de ${n ? n + ' ' : ''}${w}`,
      hit: (x, avg, top, b) => { const s = x.nm + (x.cp ? `, copiando ${x.cp} con ${x.via},` : ''), v = avg ? 'hace de media' : 'hace como máximo';
        const C = { ex: 'contra un Pokémon ex', poison: 'mientras está Envenenado', behind: 'cuando vas por detrás en premios', last: 'cuando ese Partidario es la última carta de tu mano' };
        return b ? `${s} ${v} ${b.eff} de daño con ${b.b}${b.conds.length ? ' ' + b.conds.map(c => C[c]).join(' y ') : ''} (${top} sin eso), sin contar la Debilidad.` : `${s} ${v} ${top} de daño sin contar la Debilidad.`; },
      koUse: x => `Usarlo deja ${AT} a ${x}, lo que le da un premio a tu rival.`,
      need: (a, full, w, base) => { const E = (t, n) => t ? i18nEnergy(t + ' Energy', 'es', n) : (n1(n) ? 'Energía' : 'Energías');
        const W = { moved: `en un turno en que ${w.nm} pasa de tu Banca al Puesto Activo`, selfdmg: `cuando ${w.nm} tiene contadores de daño`,
          oppdmg: 'contra un Pokémon Activo que ya tiene contadores de daño', deck: `cuando a tu baraja le quedan ${w.n} cartas o menos`,
          xenergy: `con ${w.n} ${n1(w.n) ? 'Energía extra unida' : 'Energías extra unidas'} a él`, stadium: 'mientras tienes un Estadio en juego',
          btype: `con un Pokémon de tipo ${Y[w.t]} en tu Banca`, bnames: `con ${i18nDmgNames(w.names, I18N_DMG.es)} en tu Banca`,
          ko: `en el turno después de que uno de tus Pokémon quedara ${AT}`, next: 'si usó el mismo ataque el turno anterior',
          energy: `con ${E(w.t, 1)} unida a ${w.nm}`, supname: `en un turno en que juegas un Partidario ${deX(w.x)}`,
          prize6: 'mientras aún te quedan las 6 cartas de Premio', evolved: `en el turno en que evoluciona de ${w.x}`,
          inplay: `con ${w.n} ${E(w.t, w.n)} en juego`, discab: `con ${w.n} Pokémon con ${w.a} en tu pila de descartes` }[w.k];
        return W && `${a} solo hace ${full} de daño ${W}; si no, hace ${base}.`; },
      hasCards: (n, k, full) => `Tu lista tiene ${n} ${cs(n, k)}, así que la calificación cuenta ${full}.`,
      afterHit: 'El golpe completo llega después de que haya recibido un golpe, no en su primer ataque.',
      afterKo: 'El golpe completo llega después de que pierdas un Pokémon, no en tu primer ataque.',
      canSet: n => `Tu lista puede preparar eso, así que la calificación cuenta ${n}.`,
      since: (n, w) => `La calificación cuenta ${n}, ya que ${w}.`,
      why: {
        evolved: () => 'atacas en el turno en que evoluciona', next: b => `puede seguir atacando turno tras turno, pero su primer uso hace ${b}`,
        only: (n, k) => `tu lista solo tiene ${n} ${cs(n, k)}`, noCounters: () => 'nada en tu lista le pone contadores de daño antes de que ataques',
        endGame: () => 'eso solo pasa al final de la partida', prize6: () => 'eso solo vale antes de que tomes tu primer premio', notAll: () => 'tu lista no los lleva todos',
        stadiums: n => `tu lista solo tiene ${n} ${n1(n) ? 'Estadio' : 'Estadios'}`, typeMon: (n, t) => `tu lista solo tiene ${n} Pokémon de tipo ${Y[t]}`,
        energy: (n, e) => `tu lista solo tiene ${n} ${e}`, supname: (n, x) => `tu lista solo tiene ${n} ${n1(n) ? 'Partidario' : 'Partidarios'} ${deX(x)}`,
        discab: (n, a) => `tu lista solo tiene ${n} Pokémon con ${a}`,
        thinSelf: (n, x, line) => `la lista solo lleva ${n1(n) ? '1 copia' : n + ' copias'} de ${x}${line ? ' o de su línea' : ''}, así que no siempre está en juego`,
        thinCopy: (n, x, line) => `solo hay ${n} ${x}${line ? ' o Pokémon de su línea' : ''} de los que copiar, así que no siempre está en juego`,
        needs: (b, grow, th) => 'el golpe completo necesita ' + [b, grow && 'tiempo para crecer'].filter(Boolean).join(' y ') + (th ? ', y ' + th : ''),
      },
      twice: (a, st, one, all, eff, b) => `${a} le deja atacar dos veces por turno${st ? ` mientras ${st} está en juego` : ''}, así que la calificación cuenta dos golpes de ${one}, ${all} en total${eff ? `, o ${eff} con ${b} en los dos` : ''}.`,
      tails: 'Lanza monedas hasta que sale cruz, así que puede salir un golpe mayor, pero no conviene contar con ello.',
      flipAvg: 'Eso cuenta las monedas por su media.',
      millAvg: (n, p) => `Es la media según las cartas que salen de la parte superior de la baraja: tu lista lleva ${n} ${p}, así que un golpe mayor o menor depende de la suerte.`,
      hand: (t, n, f) => `Cuenta las cartas de tu mano, así que ${t} es la estimación de la app para unas ${n} cartas${f ? ', con las Habilidades de robo de la lista llenando la mano' : ''}, no un número impreso.`,
      lowConf: t => `Su daño depende de la mesa, así que ${t} es la estimación de la app, no un número impreso.`,
      escBoth: (x, b, p) => `${x} hace ${b ? b + ' más ' : ''}${p} por cada Energía unida a los dos Pokémon Activos.`,
      appCounts: (n, w, t) => `La app cuenta ${n} en él${w ? `, y cada una cuenta doble con ${w}` : ''}, y 2 en el Pokémon Activo de tu rival, así que ${t} es su estimación, no un número impreso.`,
      escDisc: (x, e, p) => `${x} descarta ${e} de tus Pokémon y hace ${p} por cada una que descarta.`,
      escPer: (x, b, p, e, sc) => `${x} hace ${b ? b + ' más ' : ''}${p} por cada ${e} unida a ${sc === 'it' ? 'él' : 'todos tus Pokémon'}.`,
      x2: (x, t) => `${x} hace que cada ${i18nEnergy(t + ' Energy', 'es', 1)} Básica cuente doble.`,
      takes: (a, t, lo, b, hi) => `Hacen falta ${a}${t ? ' cartas de ' + i18nEnergy(t + ' Energy', 'es', 1) + ' Básica' : ''} para dejar ${AT} de un golpe a un Pokémon de ${lo} PS y ${b} para uno de ${hi} PS, sin contar la Debilidad.`,
      listRuns: n => `Tu lista lleva ${n}.`,
      adds: (b, p, n, ex) => `${b} ${pl(p, 'suma', 'suman')} ${n} más${ex ? ' contra un Pokémon ex' : ''}.`,
      koxCounters: (x, b, n) => `${x} deja ${AT} al Pokémon Activo${b ? ' Básico' : ''} de tu rival cuando tiene exactamente ${n} contadores de daño, y esta lista puede ponérselos para prepararlo, así que la calificación lo cuenta como un golpe que deja ${AT} a cualquiera.`,
      koxFlip: (x, b, n, t) => `${x} deja ${AT} al Pokémon Activo${b ? ' Básico' : ''} de tu rival si sale bien una moneda, ${n === '2' ? 'la mitad de las veces' : 'una vez de cada ' + n}, así que la calificación lo cuenta como ${t}.`,
      koxOut: (x, b) => `${x} deja ${AT} directamente al Pokémon Activo${b ? ' Básico' : ''} de tu rival, así que la calificación lo cuenta como un golpe que deja ${AT} a cualquiera.`,
      oneTurn: (lo, hi) => `Eso deja ${AT} en un solo turno a las amenazas de ${lo} a ${hi} PS del formato.`,
      oneShots: (lo, hi) => `Eso deja ${AT} de un golpe a las amenazas de ${lo} a ${hi} PS del formato.`,
      takeEach: (lo, hi, n, t) => `Las amenazas de ${lo} a ${hi} PS del formato necesitan ${n} ${t ? 'turnos' : 'golpes'} cada una.`,
      takeTwo: (lo, a, hi, b, t) => { const u = n => n1(n) ? (t ? 'un turno' : 'un golpe') : `${n} ${t ? 'turnos' : 'golpes'}`;
        return `Las amenazas de ${lo} PS necesitan ${u(a)} y las de ${hi} PS, ${u(b)}.`; },
      lead: (x, w) => `${x} es ${w === 'pick' ? 'el atacante principal que elegiste' : 'el atacante principal de esta baraja' + (w === 'list' ? ', ya que la lista lleva más cartas de su línea' : w === 'name' ? ', ya que la baraja lleva su nombre' : '')}, pero el golpe más fuerte que la calificación puede contar viene de otro Pokémon.`,
      oneTail: (x, p) => `${x} ${pl(p, 'entrega', 'entregan')} un solo premio por cada ${AT}, así que necesitar dos golpes contra una amenaza de dos premios mantiene igualada la carrera de premios.`,
      cantTrade: 'No puedes ganar el intercambio, y eso suele hacerte perder la carrera de premios.',
      spread: x => `Esta baraja gana repartiendo daño: ${x} daña toda la mesa y tus Pokémon que mueven contadores lo concentran.`,
      undersells: (n, lo, hi) => `El número de un solo golpe (${n}) se queda corto para lo que alcanza contra amenazas de ${lo} a ${hi} PS.`,
      undersellsIt: 'El número de un solo golpe se queda corto.',
      grows: (x, now, n, e, top, nt) => `${x} hace ${now} de daño con ${n} ${e} ${n1(n) ? 'unida' : 'unidas'} y ${top} cuando hay ${nt} en juego.`,
      growsMid: n => `Tu lista lleva ${n}, así que el golpe completo es un plan de mitad de partida, no del turno 2.`,
      growsPile: (x, now, p, w, top, n) => `${x} hace ${now} de daño con 2 ${p} ${({ 'in your discard pile': 'en tu pila de descartes', 'on your Bench': 'en tu Banca', 'in play': 'en juego' })[w]} y ${top} cuando tienes ${n}.`,
      growsEarly: (x, now, top, n, p) => `${x} hace ${now} de daño al principio y ${top} cuando tienes ${n} ${p} en tu pila de descartes.`,
      growsHave: (n, there, late) => `${there ? `Tu lista puede tener ${n} ahí a la vez` : `Tu lista tiene ${n} de esas cartas`}, así que el golpe completo es ${late ? 'un plan de final de partida que necesita muchas en la pila' : 'un plan de mitad de partida, no del turno 2'}.`,
      protect: (n, k, x) => `${n} de tus Pokémon tienen Habilidades que ${({ effects: 'bloquean los efectos de los ataques o Habilidades de tu rival', damage: 'evitan el daño de algunos ataques de tu rival', both: 'bloquean el daño o los efectos de algunos ataques de tu rival' })[k]} (${x}).`,
      dmgThrough: `El daño sigue entrando, así que esto frena bloqueos y disrupción, no los ${AT}.`,
      readEach: 'Lee cada carta para saber cuándo se aplica.',
      wallsEx: x => `${x} evita todo el daño que le hacen los ataques de los Pokémon ex de tu rival, así que una baraja de ex tiene que buscar otra forma de dejarlo ${AT}.`,
      noRuleBox: 'Los Pokémon sin Recuadro de regla le siguen haciendo daño con normalidad.',
      payNone: e => `${e}, que esta lista no lleva`, payFew: (n, e, h) => `${n} ${e}, y esta lista solo lleva ${h}`,
      cantPay: (x, ps) => `${x} necesita ${ps.join('; también necesita ')}.`,
      instead: (a, n) => `La calificación cuenta ${a} (${n}) en su lugar.`,
      millCopy: x => `${x} usa un ataque de la carta que salga de la parte superior de tu baraja, así que la calificación no cuenta su daño.`,
      copyHow: (a, b) => `${a}, copiando ${b},`,
      multi: (how, k, top, n, hp) => `${how} golpea a ${k ? k + ' de los Pokémon de tu rival por ' + top + ' cada uno' : 'cada Pokémon de tu rival por ' + top}, así que dos usos pueden dejar ${AT} a ${n ? n + ' de sus Pokémon' : 'todos sus Pokémon'} con ${hp} PS o menos.`,
      fewE: (a, need, x) => `${a} necesita ${i18nDmgJoin(need, I18N_DMG.es)}, y la lista lleva pocas Energías que ${x} pueda usar para él, así que a menudo no está listo para atacar.`,
      hardest: (x, one) => `Tu golpe más fuerte viene de ${x}, y la lista ${one ? 'solo puede poner uno' : 'puede poner pocos'} en juego, sin otro atacante que se le acerque.`,
      drops: `Cuando está en los premios o queda ${AT}, tu daño cae mucho.`,
      itsAb: a => `su Habilidad ${a}`, theirAb: x => x,
      engine3: (x, p, r) => `${x} ${pl(p, 'entrega', 'entregan')} 3 premios cuando ${pl(p, 'cae', 'caen')}, pero ${pl(p, 'está', 'están')} aquí por ${r}, no para intercambiar golpes.`,
      ways: (n, x) => `Tus ${n} formas de cambiar o retirarte${x ? `, como ${x},` : ''} te permiten usarlo y luego sacarlo antes de que tu rival pueda dejarlo ${AT}.`,
      useRetreat: 'Úsalo y luego retíralo o cámbialo antes del turno de tu rival, y no lo dejes en la Banca cuando pueda golpear a la Banca.',
      side3: (x, p, y) => `${x} ${pl(p, 'entrega', 'entregan')} 3 premios cuando ${pl(p, 'cae', 'caen')}, la mitad de la partida en un solo ${AT}, mientras que ${y} entrega uno.`,
      putOnly: p => p ? 'Ponlos en juego solo cuando los necesites.' : 'Ponlo en juego solo cuando lo necesites.',
      give3: (x, p) => `${x} ${pl(p, 'entrega', 'entregan')} 3 premios cuando ${pl(p, 'cae', 'caen')}.`,
      cantBack: (x, p) => `${x} ${pl(p, 'entrega', 'entregan')} 3 premios cuando ${pl(p, 'cae', 'caen')}, pero no puedes responder dejando ${AT} de un golpe con fiabilidad.`,
      bestHit: n => `Tu mejor golpe (${n}) deja ${AT} de un golpe a Pokémon con ${n} PS o menos, pero las mayores amenazas necesitan dos golpes, así que esos intercambios te cuestan más a ti que a tu rival.`,
      losing: 'Es un intercambio perdedor, salvo que ajustes el daño.',
      allTwo: `Cada Pokémon aquí entrega dos premios, así que al rival le bastan tres ${AT}.`,
      normalEx: `Es lo normal en una baraja basada en Pokémon ex, así que cada uno tiene que conseguir más de un ${AT} por su cuenta.`,
      mostTwo: (a, b) => `${a} de tus ${b} Pokémon entregan dos premios, así que casi siempre que uno queda ${AT} el rival toma dos.`,
      sendOne: 'Usa como atacantes a tus Pokémon de un premio cuando puedas.',
      restOne: (a, b) => `${a} de tus ${b} Pokémon ${n1(a) ? 'entrega' : 'entregan'} dos premios y el resto entrega uno, así que no le regalas a tu rival turnos de varios premios.`,
      longWay: (x, mids, c) => `Tus Pokémon de Fase 2 (${x}) evolucionan a través de ${mids}${c ? ', con 1 Rare Candy como atajo' : ' sin Rare Candy'}, así que cuenta con atacar con ellos desde tu tercer turno.`,
      faster: n => `Las barajas más rápidas empiezan a golpear en el turno ${n}, así que tus primeros Pokémon tienen que aguantar hasta entonces.`,
      midEng: (x, n, mid, a, ab) => `Tus Pokémon de Fase 2 (${x}) evolucionan a través de ${n} ${mid}, y en cada turno de la subida ${a} ${ab}, así que la línea lenta llega a tiempo.`,
      lean: (x, n) => `Dependes de Pokémon de Fase 2 (${x}) ${n ? 'con solo ' + n + ' Rare Candy' : 'sin Rare Candy'}.`,
      slow: n => `En un formato que empieza a golpear en el turno ${n}, un arranque lento puede perder la partida antes de que estés listo.`,
      engs: (x, p) => `${x} te ${pl(p, 'da', 'dan')} una Habilidad de robo o búsqueda una vez por turno, así que la baraja encuentra sus piezas sin gastar un Partidario en ello.`,
      toolbox: (n, hp, x, more) => `${n} Pokémon distintos de la lista golpean por ${hp} o más: ${x}${more ? ` y ${more} más` : ''}.`,
      pick: n => `Eliges el atacante que encaja en cada turno${n ? `, ${n1(n) ? 'incluido 1 que entrega' : `incluidos ${n} que entregan`} un solo premio` : ''}, así que tu rival no puede planear contra una sola amenaza.`,
      oneCopy: 'La lista lleva una sola copia de su atacante principal.',
      prizedIn: `Queda en tus premios en más o menos 1 de cada 10 partidas, y una vez que queda ${AT} la baraja se queda sin nadie que lleve adelante el plan.`,
      oneBack: (a, by) => `La lista lleva una sola copia de su atacante principal, y ${by ? `la Habilidad ${a} de ${by}` : `su Habilidad ${a}`} lo devuelve a tu Banca desde tu pila de descartes, así que quedar ${AT} no acaba con el plan.`,
      stillPrized: 'Aun así, queda en tus premios en más o menos 1 de cada 10 partidas.',
      backOdds: (p, x) => `Esa segunda vida se da en más o menos el ${p}% de las partidas, porque ${x} tiene que entrar en juego o llegar a tu pila de descartes primero, y queda en tus premios en más o menos 1 de cada 10 partidas.`,
      backCr: p => `Poder lo cuenta como el ${p}% de una segunda copia.`,
      backDmg: (x, a, b, p, d) => `Que ${x} vuelva con ${b ? `la Habilidad ${a} de ${b}` : a}, en más o menos el ${p}% de las partidas, suma ${d} al Daño.`,
      backLow: (x, a, b, p) => `Que ${x} vuelva con ${b ? `la Habilidad ${a} de ${b}` : a}, en más o menos el ${p}% de las partidas, suma menos de 0.1 al Daño, porque otros atacantes de la lista ya cubren que quede ${AT}.`,
      mostRun: (a, b) => `La mayoría de las listas lleva de ${a} a ${b}.`,
      thinRoot: (n, x, y) => `${n} ${x} evolucionan de ${y}, y la lista lleva 1.`,
      thinKO: 'Si queda en los premios o Fuera de Combate, no tienen de qué evolucionar.',
      mostTop: (x, a, w, b) => `La mayoría de las mejores listas de ${x} lleva ${w === 'to' ? `de ${a} a ${b}` : w ? `${a} ${/^8/.test(b) ? 'u' : 'o'} ${b}` : a}.`,
      archE: (a, n) => `Las listas de ${a} que quedaron en el cuarto superior de torneos online recientes llevan unas ${n} Energías.`,
      outside: (raw, s, plus, n, lo, hi) => `Esta lista lleva ${raw}${s ? `, y ${n1(s) ? 'su Objeto de búsqueda de Energía cuenta' : `sus ${s} Objetos de búsqueda de Energía cuentan`} como ${plus} más, así que ${n}` : ''}, fuera del rango de ${lo} a ${hi} que permite la calificación.`,
      extraE: 'La Energía de más ocupa el lugar del robo y la búsqueda, así que muchos turnos empiezan con Energía que no puedes usar.',
      tradeSome: 'Cambia algunas por cartas de robo o de búsqueda.',
      fewerE: 'Con menos, los atacantes a menudo se quedan sin unir Energía y se quedan atrás.',
      addBack: 'Vuelve a añadir Energía.',
      coreItem: (x, h, w) => h === '0' ? `${x} (ninguna de ${w})` : `${x} (${h} de ${w})`,
      core: (a, n, items, more) => `Casi todas las listas de ${a} que quedaron en el cuarto superior de torneos online recientes llevan estas cartas, y a esta le faltan ${n} copias: ${items}${more ? ` y ${more} más` : ''}.`,
      swaps: n => `Unos pocos cambios son normales, así que las primeras ${n} copias no cuestan nada.`,
      restBack: 'Vuelve a añadir el resto, salvo que tengas un motivo para no hacerlo.',
      blend: (a, b, x) => `Las cartas de esta lista se parecen más a ${a}, así que la calificación usa sus resultados, no los de ${b}, la baraja construida alrededor de ${x}.`,
      tLongDraw: 'Evoluciona por el camino largo, robando por el camino',
      tEngine: x => `${x}: un motor de tres premios`,
      tCantPay: (x, a) => `${x} no puede pagar ${a}`,
      tOnlyHit: (n, x) => n === '0' ? `Ningún ${x} con el que golpear` : `Solo ${n} ${x} con ${n1(n) ? 'el' : 'los'} que golpear`,
    };
  })(),
  pt: (function () {
    const Y = I18N_AB_TYP.pt, n1 = n => +n === 1;
    const deX = x => /'s$/.test(x) ? 'de ' + x.slice(0, -2) : x;
    const cs = (n, k) => ({ moved: n1(n) ? 'carta que o coloca no Campo Ativo ou deixa você recuar de graça' : 'cartas que o colocam no Campo Ativo ou deixam você recuar de graça',
      oppdmg: n1(n) ? 'carta que coloca contadores de dano nele antes' : 'cartas que colocam contadores de dano nele antes',
      xenergy: n1(n) ? 'carta que liga Energia extra' : 'cartas que ligam Energia extra' })[k];
    const KIND = { Item: 'Item', Supporter: 'Apoiador', Trainer: 'Treinador', Stadium: 'Estádio', 'Pokemon Tool': 'Ferramenta Pokémon' };
    const STG = { Basic: ['Pokémon Básico', 'Pokémon Básicos'], 'Stage 1': ['Pokémon de Estágio 1', 'Pokémon de Estágio 1'], 'Stage 2': ['Pokémon de Estágio 2', 'Pokémon de Estágio 2'] };
    const pl = (p, a, b) => p ? b : a;
    return {
      and: ' e ', of: (o, w) => `${w} de ${o}`,
      en: (ts, basic, n, cards) => { const k = cards ? 1 : n;
        let e = ts.length ? i18nEnergy(ts.join(' and ') + ' Energy', 'pt', k) : (n1(k) ? 'Energia' : 'Energias');
        if (basic) e += n1(k) ? ' Básica' : ' Básicas';
        return cards ? (n1(n) ? 'carta de ' : 'cartas de ') + e : e; },
      pile: (p, m) => p.k === 'kindHas' ? `${m ? 'cartas' : 'carta'} de ${KIND[p.kind]} com ${p.has} no nome`
        : p.k === 'kind' ? `${m ? 'cartas' : 'carta'} de ${KIND[p.kind]}` : p.k === 'pokemon' ? 'Pokémon' : p.k === 'stage' ? STG[p.stage][m ? 1 : 0]
        : p.k === 'pre' ? `Pokémon ${deX(p.pre)}` : p.k === 'atk' ? `Pokémon com ${p.atk}` : p.k === 'name' ? `${m ? 'cartas' : 'carta'} ${p.name}` : p.names.join(' ou '),
      selfB: (a, e) => `${a} com ${e} ligada`, from: (a, w, n) => `${a} de ${n ? n + ' ' : ''}${w}`,
      hit: (x, avg, top, b) => { const s = x.nm + (x.cp ? `, copiando ${x.cp} com ${x.via},` : ''), v = avg ? 'causa em média' : 'causa no máximo';
        const C = { ex: 'contra um Pokémon ex', poison: 'enquanto está Envenenado', behind: 'quando você está atrás nos prêmios', last: 'quando esse Apoiador é a última carta da sua mão' };
        return b ? `${s} ${v} ${b.eff} de dano com ${b.b}${b.conds.length ? ' ' + b.conds.map(c => C[c]).join(' e ') : ''} (${top} sem isso), sem contar a Fraqueza.` : `${s} ${v} ${top} de dano sem contar a Fraqueza.`; },
      koUse: x => `Usar isso Nocauteia ${x}, o que dá um prêmio ao oponente.`,
      need: (a, full, w, base) => { const E = (t, n) => t ? i18nEnergy(t + ' Energy', 'pt', n) : (n1(n) ? 'Energia' : 'Energias');
        const W = { moved: `em um turno em que ${w.nm} sobe do seu Banco para o Campo Ativo`, selfdmg: `quando ${w.nm} tem contadores de dano`,
          oppdmg: 'contra um Pokémon Ativo que já tem contadores de dano', deck: `quando seu deck tem ${w.n} cartas ou menos`,
          xenergy: `com ${w.n} ${n1(w.n) ? 'Energia extra ligada' : 'Energias extras ligadas'} a ele`, stadium: 'enquanto você tem um Estádio em jogo',
          btype: `com um Pokémon do tipo ${Y[w.t]} no seu Banco`, bnames: `com ${i18nDmgNames(w.names, I18N_DMG.pt)} no seu Banco`,
          ko: 'no turno depois de um dos seus Pokémon ser Nocauteado', next: 'se usou o mesmo ataque no turno anterior',
          energy: `com ${E(w.t, 1)} ligada a ${w.nm}`, supname: `em um turno em que você joga um Apoiador ${deX(w.x)}`,
          prize6: 'enquanto você ainda tem as 6 cartas de Prêmio', evolved: `no turno em que evolui de ${w.x}`,
          inplay: `com ${w.n} ${E(w.t, w.n)} em jogo`, discab: `com ${w.n} Pokémon com ${w.a} na sua pilha de descarte` }[w.k];
        return W && `${a} só causa ${full} de dano ${W}; caso contrário, causa ${base}.`; },
      hasCards: (n, k, full) => `Sua lista tem ${n} ${cs(n, k)}, então a nota conta ${full}.`,
      afterHit: 'O golpe completo vem depois de ele levar um golpe, não no primeiro ataque.',
      afterKo: 'O golpe completo vem depois de você perder um Pokémon, não no seu primeiro ataque.',
      canSet: n => `Sua lista consegue preparar isso, então a nota conta ${n}.`,
      since: (n, w) => `A nota conta ${n}, já que ${w}.`,
      why: {
        evolved: () => 'você ataca no turno em que ele evolui', next: b => `ele pode continuar atacando turno após turno, mas o primeiro uso causa ${b}`,
        only: (n, k) => `sua lista só tem ${n} ${cs(n, k)}`, noCounters: () => 'nada na sua lista coloca contadores de dano nele antes de você atacar',
        endGame: () => 'isso só acontece no fim da partida', prize6: () => 'isso só vale antes de você pegar seu primeiro prêmio', notAll: () => 'sua lista não usa todos eles',
        stadiums: n => `sua lista só tem ${n} ${n1(n) ? 'Estádio' : 'Estádios'}`, typeMon: (n, t) => `sua lista só tem ${n} Pokémon do tipo ${Y[t]}`,
        energy: (n, e) => `sua lista só tem ${n} ${e}`, supname: (n, x) => `sua lista só tem ${n} ${n1(n) ? 'Apoiador' : 'Apoiadores'} ${deX(x)}`,
        discab: (n, a) => `sua lista só tem ${n} Pokémon com ${a}`,
        thinSelf: (n, x, line) => `a lista só usa ${n1(n) ? '1 cópia' : n + ' cópias'} de ${x}${line ? ' ou da linha dele' : ''}, então ele nem sempre está em jogo`,
        thinCopy: (n, x, line) => `só há ${n} ${x}${line ? ' ou Pokémon da linha dele' : ''} para copiar, então ele nem sempre está em jogo`,
        needs: (b, grow, th) => 'o golpe completo precisa de ' + [b, grow && 'tempo para crescer'].filter(Boolean).join(' e ') + (th ? ', e ' + th : ''),
      },
      twice: (a, st, one, all, eff, b) => `${a} deixa ele atacar duas vezes por turno${st ? ` enquanto ${st} está em jogo` : ''}, então a nota conta dois golpes de ${one}, ${all} no total${eff ? `, ou ${eff} com ${b} nos dois` : ''}.`,
      tails: 'Ele joga moedas até sair coroa, então um golpe maior pode acontecer, mas não é algo com que contar.',
      flipAvg: 'Isso conta as moedas pela média.',
      millAvg: (n, p) => `Essa é a média das cartas que saem do topo do deck: sua lista usa ${n} ${p}, então um golpe maior ou menor depende da sorte.`,
      hand: (t, n, f) => `Ele conta as cartas da sua mão, então ${t} é a estimativa do app para cerca de ${n} cartas${f ? ', com as Habilidades de compra da lista enchendo a mão' : ''}, não um número impresso.`,
      lowConf: t => `O dano depende da mesa, então ${t} é a estimativa do app, não um número impresso.`,
      escBoth: (x, b, p) => `${x} causa ${b ? b + ' mais ' : ''}${p} para cada Energia ligada aos dois Pokémon Ativos.`,
      appCounts: (n, w, t) => `O app conta ${n} nele${w ? `, cada uma contando em dobro com ${w}` : ''}, e 2 no Pokémon Ativo do oponente, então ${t} é a estimativa dele, não um número impresso.`,
      escDisc: (x, e, p) => `${x} descarta ${e} dos seus Pokémon e causa ${p} para cada uma descartada.`,
      escPer: (x, b, p, e, sc) => `${x} causa ${b ? b + ' mais ' : ''}${p} para cada ${e} ligada ${sc === 'it' ? 'a ele' : 'a todos os seus Pokémon'}.`,
      x2: (x, t) => `${x} faz cada ${i18nEnergy(t + ' Energy', 'pt', 1)} Básica contar em dobro.`,
      takes: (a, t, lo, b, hi) => `São necessárias ${a}${t ? ' cartas de ' + i18nEnergy(t + ' Energy', 'pt', 1) + ' Básica' : ''} para Nocautear de um golpe um Pokémon de ${lo} PS e ${b} para um de ${hi} PS, sem contar a Fraqueza.`,
      listRuns: n => `Sua lista usa ${n}.`,
      adds: (b, p, n, ex) => `${b} ${pl(p, 'soma', 'somam')} mais ${n}${ex ? ' contra um Pokémon ex' : ''}.`,
      koxCounters: (x, b, n) => `${x} Nocauteia o Pokémon Ativo${b ? ' Básico' : ''} do oponente quando ele tem exatamente ${n} contadores de dano, e esta lista consegue colocar esses contadores para preparar isso, então a nota conta isso como um Nocaute de um golpe em qualquer um.`,
      koxFlip: (x, b, n, t) => `${x} Nocauteia o Pokémon Ativo${b ? ' Básico' : ''} do oponente se uma moeda ajudar, ${n === '2' ? 'metade das vezes' : 'uma vez a cada ' + n}, então a nota conta isso como ${t}.`,
      koxOut: (x, b) => `${x} Nocauteia direto o Pokémon Ativo${b ? ' Básico' : ''} do oponente, então a nota conta isso como um Nocaute de um golpe em qualquer um.`,
      oneTurn: (lo, hi) => `Isso Nocauteia em um só turno as ameaças de ${lo} a ${hi} PS do formato.`,
      oneShots: (lo, hi) => `Isso Nocauteia de um golpe as ameaças de ${lo} a ${hi} PS do formato.`,
      takeEach: (lo, hi, n, t) => `As ameaças de ${lo} a ${hi} PS do formato precisam de ${n} ${t ? 'turnos' : 'golpes'} cada uma.`,
      takeTwo: (lo, a, hi, b, t) => { const u = n => n1(n) ? (t ? 'um turno' : 'um golpe') : `${n} ${t ? 'turnos' : 'golpes'}`;
        return `As ameaças de ${lo} PS precisam de ${u(a)} e as de ${hi} PS, de ${u(b)}.`; },
      lead: (x, w) => `${x} é ${w === 'pick' ? 'o atacante principal que você escolheu' : 'o atacante principal deste deck' + (w === 'list' ? ', já que a lista usa mais cartas da linha dele' : w === 'name' ? ', já que o deck leva o nome dele' : '')}, mas o golpe mais forte que a nota consegue contar vem de outro Pokémon.`,
      oneTail: (x, p) => `${x} ${pl(p, 'entrega', 'entregam')} só um prêmio por nocaute, então precisar de dois golpes contra uma ameaça de dois prêmios ainda deixa a corrida de prêmios equilibrada.`,
      cantTrade: 'Você não consegue ganhar a troca, e isso costuma fazer você perder a corrida de prêmios.',
      spread: x => `Este deck vence espalhando dano: ${x} acerta a mesa toda e seus Pokémon que movem contadores concentram esse dano.`,
      undersells: (n, lo, hi) => `O número de um golpe só (${n}) não mostra todo o alcance contra ameaças de ${lo} a ${hi} PS.`,
      undersellsIt: 'O número de um golpe só não mostra todo o alcance dele.',
      grows: (x, now, n, e, top, nt) => `${x} causa ${now} com ${n} ${e} ${n1(n) ? 'ligada' : 'ligadas'} e ${top} quando há ${nt} em jogo.`,
      growsMid: n => `Sua lista usa ${n}, então o golpe completo é um plano de meio de jogo, não do turno 2.`,
      growsPile: (x, now, p, w, top, n) => `${x} causa ${now} com 2 ${p} ${({ 'in your discard pile': 'na sua pilha de descarte', 'on your Bench': 'no seu Banco', 'in play': 'em jogo' })[w]} e ${top} quando você tem ${n}.`,
      growsEarly: (x, now, top, n, p) => `${x} causa ${now} no começo e ${top} quando você tem ${n} ${p} na sua pilha de descarte.`,
      growsHave: (n, there, late) => `${there ? `Sua lista pode ter ${n} ali ao mesmo tempo` : `Sua lista tem ${n} dessas cartas`}, então o golpe completo é ${late ? 'um plano de fim de jogo que precisa de muitas delas na pilha' : 'um plano de meio de jogo, não do turno 2'}.`,
      protect: (n, k, x) => `${n} dos seus Pokémon têm Habilidades que ${({ effects: 'bloqueiam os efeitos dos ataques ou Habilidades do oponente', damage: 'evitam o dano de alguns ataques do oponente', both: 'bloqueiam o dano ou os efeitos de alguns ataques do oponente' })[k]} (${x}).`,
      dmgThrough: 'O dano continua passando, então isso segura travas e disrupção, não nocautes.',
      readEach: 'Leia cada carta para ver quando ela se aplica.',
      wallsEx: x => `${x} evita todo o dano causado a ele por ataques dos Pokémon ex do oponente, então um deck de ex precisa achar outro jeito de Nocauteá-lo.`,
      noRuleBox: 'Pokémon sem Caixa de Regras continuam causando dano normal nele.',
      payNone: e => `${e}, que esta lista não usa`, payFew: (n, e, h) => `${n} ${e}, e esta lista só usa ${h}`,
      cantPay: (x, ps) => `${x} precisa de ${ps.join('; também precisa de ')}.`,
      instead: (a, n) => `A nota conta ${a} (${n}) no lugar.`,
      millCopy: x => `${x} usa um ataque da carta que sair do topo do seu deck, então a nota não conta o dano dele.`,
      copyHow: (a, b) => `${a}, copiando ${b},`,
      multi: (how, k, top, n, hp) => `${how} acerta ${k ? k + ' dos Pokémon do oponente com ' + top + ' cada' : 'cada Pokémon do oponente com ' + top}, então dois usos podem Nocautear ${n ? n + ' dos Pokémon dele' : 'todos os Pokémon dele'} com ${hp} PS ou menos.`,
      fewE: (a, need, x) => `${a} precisa de ${i18nDmgJoin(need, I18N_DMG.pt)}, e a lista usa poucas Energias que ${x} pode usar para isso, então ele muitas vezes não está pronto para atacar.`,
      hardest: (x, one) => `Seu golpe mais forte vem de ${x}, e a lista ${one ? 'só consegue colocar um' : 'consegue colocar poucos'} em jogo, sem outro atacante perto dele.`,
      drops: 'Quando ele está nos prêmios ou é Nocauteado, seu dano cai muito.',
      itsAb: a => `a Habilidade ${a}`, theirAb: x => x,
      engine3: (x, p, r) => `${x} ${pl(p, 'entrega', 'entregam')} 3 prêmios quando ${pl(p, 'cai', 'caem')}, mas ${pl(p, 'está', 'estão')} aqui ${/^a /.test(r) ? 'pel' + r : 'por ' + r}, não para trocar golpes.`,
      ways: (n, x) => `Suas ${n} formas de trocar ou recuar${x ? `, como ${x},` : ''} deixam você usá-lo e depois tirá-lo antes que o oponente possa Nocauteá-lo.`,
      useRetreat: 'Use-o e depois recue ou troque antes do turno do oponente, e deixe-o fora do Banco quando ele puder acertar o Banco.',
      side3: (x, p, y) => `${x} ${pl(p, 'entrega', 'entregam')} 3 prêmios quando ${pl(p, 'cai', 'caem')}, metade da partida em um só nocaute, enquanto ${y} entrega um.`,
      putOnly: p => p ? 'Coloque-os em jogo só quando precisar deles.' : 'Coloque-o em jogo só quando precisar dele.',
      give3: (x, p) => `${x} ${pl(p, 'entrega', 'entregam')} 3 prêmios quando ${pl(p, 'cai', 'caem')}.`,
      cantBack: (x, p) => `${x} ${pl(p, 'entrega', 'entregam')} 3 prêmios quando ${pl(p, 'cai', 'caem')}, mas você não consegue responder com um Nocaute de um golpe de forma confiável.`,
      bestHit: n => `Seu melhor golpe (${n}) Nocauteia de um golpe Pokémon com ${n} PS ou menos, mas as maiores ameaças precisam de dois golpes, então essas trocas custam mais para você do que para o oponente.`,
      losing: 'É uma troca perdedora, a menos que você ajuste o dano.',
      allTwo: 'Cada Pokémon aqui entrega dois prêmios, então o oponente só precisa de três nocautes.',
      normalEx: 'Isso é normal em um deck baseado em Pokémon ex, então cada um precisa conseguir mais de um nocaute por conta própria.',
      mostTwo: (a, b) => `${a} dos seus ${b} Pokémon entregam dois prêmios, então a maioria dos nocautes custa dois.`,
      sendOne: 'Use seus Pokémon de um prêmio como atacantes quando puder.',
      restOne: (a, b) => `${a} dos seus ${b} Pokémon ${n1(a) ? 'entrega' : 'entregam'} dois prêmios e o resto entrega um, então você não entrega turnos fáceis de vários prêmios.`,
      longWay: (x, mids, c) => `Seus Pokémon de Estágio 2 (${x}) evoluem através de ${mids}${c ? ', com 1 Rare Candy como atalho' : ' sem Rare Candy'}, então conte com atacar com eles a partir do seu terceiro turno.`,
      faster: n => `Os decks mais rápidos começam a bater no turno ${n}, então seus primeiros Pokémon precisam segurar até lá.`,
      midEng: (x, n, mid, a, ab) => `Seus Pokémon de Estágio 2 (${x}) evoluem através de ${n} ${mid}, e em cada turno da subida ${a} ${ab}, então a linha lenta ainda fica pronta a tempo.`,
      lean: (x, n) => `Você depende de Pokémon de Estágio 2 (${x}) ${n ? 'com só ' + n + ' Rare Candy' : 'sem Rare Candy'}.`,
      slow: n => `Em um formato que começa a bater no turno ${n}, uma preparação lenta pode perder a partida antes de você estar pronto.`,
      engs: (x, p) => `${x} ${pl(p, 'dá', 'dão')} a você uma Habilidade de compra ou busca uma vez por turno, então o deck acha suas peças sem gastar um Apoiador com isso.`,
      toolbox: (n, hp, x, more) => `${n} Pokémon diferentes da lista causam ${hp} ou mais: ${x}${more ? ` e mais ${more}` : ''}.`,
      pick: n => `Você escolhe o atacante que encaixa em cada turno${n ? `, ${n1(n) ? 'incluindo 1 que entrega' : `incluindo ${n} que entregam`} só um prêmio` : ''}, então o oponente não consegue se planejar contra uma só ameaça.`,
      oneCopy: 'A lista usa uma cópia só do atacante principal.',
      prizedIn: 'Ele fica nos seus prêmios em cerca de 1 a cada 10 partidas, e depois de Nocauteado o deck não tem quem leve o plano.',
      oneBack: (a, by) => `A lista usa uma cópia só do atacante principal, e ${by ? `a Habilidade ${a} de ${by}` : `sua Habilidade ${a}`} o devolve ao seu Banco a partir da sua pilha de descarte, então um Nocaute não acaba com o plano.`,
      stillPrized: 'Ainda assim, ele fica nos seus prêmios em cerca de 1 a cada 10 partidas.',
      backOdds: (p, x) => `Essa segunda vida acontece em cerca de ${p}% das partidas, porque ${x} precisa entrar em jogo ou chegar à sua pilha de descarte primeiro, e fica nos seus prêmios em cerca de 1 a cada 10 partidas.`,
      backCr: p => `O Poder conta isso como ${p}% de uma segunda cópia.`,
      backDmg: (x, a, b, p, d) => `O retorno de ${x} com ${b ? `a Habilidade ${a} de ${b}` : a}, em cerca de ${p}% das partidas, soma ${d} ao Dano.`,
      backLow: (x, a, b, p) => `O retorno de ${x} com ${b ? `a Habilidade ${a} de ${b}` : a}, em cerca de ${p}% das partidas, soma menos de 0.1 ao Dano, porque outros atacantes da lista já cobrem um Nocaute.`,
      mostRun: (a, b) => `A maioria das listas usa de ${a} a ${b}.`,
      thinRoot: (n, x, y) => `${n} ${x} evoluem de ${y}, e a lista usa 1.`,
      thinKO: 'Se ele ficar nos prêmios ou for Nocauteado, eles não têm de onde evoluir.',
      mostTop: (x, a, w, b) => `A maioria das melhores listas de ${x} usa ${w === 'to' ? `de ${a} a ${b}` : w ? `${a} ou ${b}` : a}.`,
      archE: (a, n) => `As listas de ${a} que ficaram no quarto de cima de torneios online recentes usam cerca de ${n} Energias.`,
      outside: (raw, s, plus, n, lo, hi) => `Esta lista usa ${raw}${s ? `, e ${n1(s) ? 'seu Item de busca de Energia conta' : `seus ${s} Itens de busca de Energia contam`} como mais ${plus}, então ${n}` : ''}, fora da faixa de ${lo} a ${hi} que a nota permite.`,
      extraE: 'A Energia a mais ocupa o lugar de compra e busca, então muitos turnos começam com Energia que você não pode usar.',
      tradeSome: 'Troque algumas por cartas de compra ou busca.',
      fewerE: 'Com menos, os atacantes muitas vezes ficam sem ligar Energia e ficam para trás.',
      addBack: 'Coloque Energia de volta.',
      coreItem: (x, h, w) => h === '0' ? `${x} (nenhuma de ${w})` : `${x} (${h} de ${w})`,
      core: (a, n, items, more) => `Quase todas as listas de ${a} que ficaram no quarto de cima de torneios online recentes usam estas cartas, e esta está ${n} cópias abaixo: ${items}${more ? ` e mais ${more}` : ''}.`,
      swaps: n => `Algumas trocas são normais, então as primeiras ${n} cópias não custam nada.`,
      restBack: 'Coloque o resto de volta, a menos que você tenha um motivo para não fazer isso.',
      blend: (a, b, x) => `As cartas desta lista estão mais perto de ${a}, então a nota usa os resultados dele, não os de ${b}, o deck montado em torno de ${x}.`,
      tLongDraw: 'Evolui pelo caminho longo, comprando no caminho',
      tEngine: x => `${x}: um motor de três prêmios`,
      tCantPay: (x, a) => `${x} não consegue pagar ${a}`,
      tOnlyHit: (n, x) => n === '0' ? `Nenhum ${x} para atacar` : `Só ${n} ${x} para atacar`,
    };
  })(),
};
// After the ctl catch-all, which gives null for these and leaves them here.
I18N_PAT.push([/^[\s\S]+$/, m => i18nDmgSent(m, 'es'), m => i18nDmgSent(m, 'pt')]);
// Ahead of the "Only 1 X" pattern, which would read "Only 1 X to hit with" word for word.
I18N_PAT.unshift([/^Only (?:\d+(?:\.\d+)?|no) .+? to hit with$/, m => i18nDmgSent(m, 'es'), m => i18nDmgSent(m, 'pt')]);

// Muse s6 M1: the Grade tab sentences (Trainer fit lines, "In this deck:" notes, How it plays, the attacker
// odds and the matchup notes) are built in core.js, v29-rotation.js and v69-grade-blend.js from a few English
// shapes. They are read back into parts here and said again from each language's own words: I18N_GT.es and
// .pt below, I18N_MORE[lang].gt in the other files. Card, attack, Ability and deck names stay English. A
// sentence with any part this cannot read gives null, so it stays English rather than half translated.
/** Muse s6 M4: an English date ("25 Oct 2026", "Nov 17", "March 2026") with the language's month names. */
const I18N_GT_MON = {
  es: [['enero', 'ene'], ['febrero', 'feb'], ['marzo', 'mar'], ['abril', 'abr'], ['mayo', 'may'], ['junio', 'jun'], ['julio', 'jul'], ['agosto', 'ago'], ['septiembre', 'sep'], ['octubre', 'oct'], ['noviembre', 'nov'], ['diciembre', 'dic']],
  pt: [['janeiro', 'jan'], ['fevereiro', 'fev'], ['março', 'mar'], ['abril', 'abr'], ['maio', 'mai'], ['junho', 'jun'], ['julho', 'jul'], ['agosto', 'ago'], ['setembro', 'set'], ['outubro', 'out'], ['novembro', 'nov'], ['dezembro', 'dez']],
  fr: [['janvier', 'janv.'], ['février', 'févr.'], ['mars', 'mars'], ['avril', 'avr.'], ['mai', 'mai'], ['juin', 'juin'], ['juillet', 'juil.'], ['août', 'août'], ['septembre', 'sept.'], ['octobre', 'oct.'], ['novembre', 'nov.'], ['décembre', 'déc.']],
  de: [['Januar', 'Jan.'], ['Februar', 'Feb.'], ['März', 'März'], ['April', 'Apr.'], ['Mai', 'Mai'], ['Juni', 'Juni'], ['Juli', 'Juli'], ['August', 'Aug.'], ['September', 'Sept.'], ['Oktober', 'Okt.'], ['November', 'Nov.'], ['Dezember', 'Dez.']],
  it: [['gennaio', 'gen'], ['febbraio', 'feb'], ['marzo', 'mar'], ['aprile', 'apr'], ['maggio', 'mag'], ['giugno', 'giu'], ['luglio', 'lug'], ['agosto', 'ago'], ['settembre', 'set'], ['ottobre', 'ott'], ['novembre', 'nov'], ['dicembre', 'dic']],
};
const I18N_GT_MEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function i18nGtDate(s, l) {
  if (l === 'fr' && typeof frI18nDate === 'function') { const x = frI18nDate(s); return x !== s ? x : null; }
  const M = I18N_GT_MON[l];
  if (!M) return null;
  let m;
  const day = d => l === 'de' ? d + '.' : d;
  if ((m = String(s).match(/^(\d{1,2}) ([A-Z][a-z]{2})[a-z]*\.? (\d{4})$/)) && I18N_GT_MEN.includes(m[2])) return `${day(m[1])} ${M[I18N_GT_MEN.indexOf(m[2])][1]} ${m[3]}`;
  if ((m = String(s).match(/^([A-Z][a-z]{2})[a-z]*\.? (\d{1,2})$/)) && I18N_GT_MEN.includes(m[1])) return `${day(m[2])} ${M[I18N_GT_MEN.indexOf(m[1])][1]}`;
  if ((m = String(s).match(/^([A-Z][a-z]{2})[a-z]* (\d{4})$/)) && I18N_GT_MEN.includes(m[1])) return `${M[I18N_GT_MEN.indexOf(m[1])][0]}${l === 'es' || l === 'pt' ? ' de' : ''} ${m[2]}`;
  return null;
}
const I18N_GT_PATS = {};
function i18nGtTab(l) { return l === 'es' || l === 'pt' ? I18N_GT[l] : (i18nMore(l) || {}).gt; }
const i18nGtN = n => +String(n).replace(/,/g, '');
/** True for a name the list can hold: a card the app knows, or, before the card list loads, a capitalized name. */
function i18nGtName(x) {
  x = String(x);
  if (!x || /[!?:;()]|\.$|\. /.test(x) || /^(?:a|an|the|your|any|and|or|one|it|its|every|each|this|that|Pokemon)\b/i.test(x)) return false;
  const c = typeof rdI18n === 'object' && rdI18n.cardNames;
  return c ? c.has(x.toLowerCase()) : /^[A-Z0-9]/.test(x);
}
/** "Basic Fire or Lightning Energy" (with "a" or not) in language l, or null. */
function i18nGtEn(s, T, D) {
  const m = String(s).match(new RegExp(`^(an? )?(Basic )?((?:${I18N_DMG_TY})(?:(?:, | or | and )(?:${I18N_DMG_TY}))*)? ?Energy$`));
  if (!m) return null;
  const ts = m[3] ? m[3].split(/, | or | and /) : [];
  const or = m[3] && / or /.test(m[3]);
  const e = or ? T.list(ts.map(t => D.en([t], !!m[2], 1, false)), 'or') : D.en(ts, !!m[2], 1, false);
  return m[1] ? T.a(e) : e;
}
/** One item of a name list: a card name, "X's Attack" or an Energy phrase. */
function i18nGtItem(x, T, D) {
  x = String(x).trim();
  if (/Energy$/.test(x) && !i18nGtName(x)) return i18nGtEn(x, T, D);
  if (i18nGtName(x)) return x;
  if (/'s /.test(x)) { const by = i18nCtlBy(x, D); return by !== x ? by : null; }
  return null;
}
/** "A, B or C", "A, B and 2 more", "A or 3 others" with the language's joiners; null when an item is unknown. */
function i18nGtList(s, T, D, f) {
  s = String(s);
  let m, more = null, conj = 'and', items;
  if ((m = s.match(/^(.+?),? (and|or) (\d+) (more|others?)$/))) { more = { n: +m[3], k: m[4] === 'more' ? 'more' : 'others' }; conj = m[2]; items = m[1].split(', '); }
  else if ((m = s.match(/^(.+?),? (and|or) ([^,]+)$/)) && !(f == null && i18nGtName(s))) { conj = m[2]; items = m[1].split(', ').concat(m[3]); }
  else items = [s];
  const out = items.map(x => (f || i18nGtItem)(x, T, D));
  if (out.some(x => x == null)) return null;
  return T.list(out, conj, more);
}
/** A gtSay subject ("Basic Fighting Pokemon", "Pokemon without a Rule Box") as parts, or null. */
function i18nGtQ(s) {
  const m = String(s).match(new RegExp(`^(?:(Mega Evolution|Stage 2|Stage 1|Basic|Evolution) )?(?:(.+?)'s )?(?:(${I18N_DMG_TY}) )?(?:(Tera|Ancient|Future) )?Pokemon( ex)?( without a Rule Box)?(?: with (\\d+) HP or less)?$`));
  return m && { stage: m[1] || '', owner: m[2] || '', type: m[3] || '', tag: m[4] || '', ex: !!m[5], noRule: !!m[6], hp: m[7] || '' };
}
/** "Supporters", "Pokemon Tools", "Basic Fire Energy", or a Pokemon subject, as the language says it. */
function i18nGtWhat(s, T, D, many) {
  let m;
  if ((m = String(s).match(/^(Supporters?|Pokemon Tools?|Stadiums?|Items?)$/))) return T.kind(m[1].replace(/s$/, ''), many);
  if ((m = String(s).match(/^a Supporter with "(.+)" in its name$/))) return T.supName(m[1]);
  if ((m = String(s).match(/^(.+) Supporters?$/))) return T.supOf(m[1], many);
  if (/Energy$/.test(s)) return i18nGtEn(s, T, D);
  const q = i18nGtQ(s);
  return q ? T.q(q, many) : null;
}
/** The jobs gTrainers names ("draws you cards and disrupts your opponent") as GT_ROLE_SAY keys, or null. */
function i18nGtRoles(s) {
  if (typeof GT_ROLE_SAY !== 'object') return null;
  let t = String(s);
  t = t.charAt(0).toLowerCase() + t.slice(1);
  const ks = Object.keys(GT_ROLE_SAY).sort((a, b) => GT_ROLE_SAY[b].length - GT_ROLE_SAY[a].length), out = [];
  while (t) {
    const k = ks.find(k => t.startsWith(GT_ROLE_SAY[k]) && (t.length === GT_ROLE_SAY[k].length || t.startsWith(' and ', GT_ROLE_SAY[k].length)));
    if (!k) return null;
    out.push(k); t = t.slice(GT_ROLE_SAY[k].length); if (t) t = t.slice(5);
  }
  return out.length ? out : null;
}
/** The thin spots an ACE SPEC or a swap idea answers ("only 3 other cards draw"), as parts, or null. */
function i18nGtGap(s) {
  let m;
  if (s === 'nothing else in the list pulls up a Benched Pokemon') return { k: 'gust', n: 0, other: true };
  if (s === 'nothing pulls up a Benched Pokemon') return { k: 'gust', n: 0 };
  if ((m = s.match(/^only (\d+) cards? pulls? up a Benched Pokemon$/))) return { k: 'gust', n: +m[1] };
  if ((m = s.match(/^only (\d+) other cards find Pokemon$/))) return { k: 'find', n: +m[1], other: true };
  if (s === 'nothing else finds Pokemon') return { k: 'find', n: 0, other: true };
  if ((m = s.match(/^only (\d+) cards? finds? Pokemon$/))) return { k: 'find', n: +m[1] };
  if (s === 'nothing in the list finds Pokemon') return { k: 'find', n: 0 };
  if ((m = s.match(/^only (\d+) other cards draw$/))) return { k: 'draw', n: +m[1], other: true };
  if ((m = s.match(/^only (\d+) cards? draws?$/))) return { k: 'draw', n: +m[1] };
  if (/^nothing in the list draws/.test(s)) return { k: 'draw', n: 0 };
  if (s === 'nothing gets cards back from your discard pile') return { k: 'rec', n: 0 };
  return null;
}
/** "Its Trade", "Dusclops's Cursed Blast": the subject of a How it plays line. */
function i18nGtIts(s, T, D) { return /^Its /.test(s) ? T.its(s.slice(4)) : i18nCtlBy(s, D); }
/** An Ability or attack effect phrase ("draws 2 cards once a turn") in language l, or null. */
function i18nGtAb(p, l) {
  const L = l === 'es' || l === 'pt' ? I18N_ABIL[l] : (i18nMore(l) || {}).abil;
  const x = L && i18nAbParse(p);
  if (!x) return null;
  try { return i18nAbSay(x, L); } catch (e) { return null; }
}
/** "Its Trade draws 2 cards once a turn": the Ability name is the shortest head whose rest reads. */
function i18nGtAbSplit(s, l) {
  const w = String(s).split(' ');
  for (let i = 1; i < w.length - 1; i++) { const p = i18nGtAb(w.slice(i).join(' '), l); if (p) return [w.slice(0, i).join(' '), p]; }
  return null;
}
function i18nGtPats(l) {
  const T = () => i18nGtTab(l), D = () => i18nDmgTab(l);
  const L = (s, f) => i18nGtList(s, T(), D(), f), E = s => i18nGtEn(s, T(), D()), Q = (s, many) => i18nGtWhat(s, T(), D(), many);
  const R = s => i18nGtRoles(s), G = s => i18nGtGap(s), N = i18nGtN, by = s => i18nCtlBy(s, D());
  const nm = x => i18nGtName(x) ? x : null, its = s => i18nGtIts(s, T(), D());
  // "Precious Trolley finds cards in your deck and fills your Bench": a card name, then its jobs.
  const NR = s => { for (let i = s.indexOf(' '); i > 0; i = s.indexOf(' ', i + 1)) { const x = s.slice(0, i), k = nm(x) && R(s.slice(i + 1)); if (k) return [x, k]; } return null; };
  const TY = I18N_DMG_TY, PCT = '(<?[\\d.]+%)';
  // 3.3.3 (Muse 3.3.2 retest): the Upgrades notes and the Top fixes line. Card and deck names stay English.
  const UP = {
    es: { syn: 'Sinergia', pow: 'Poder', grade: 'Calificación', ft: (a, b) => `de ${a} a ${b}`, run: (p, d, x) => `El ${p}% de las listas top${d ? ' de ' + d : ''} lleva ${x}.`, now: g => `Ahora mismo, ${g}.`, best: n => `Los ${n} mejores cambios juntos`, by: 'por' },
    pt: { syn: 'Sinergia', pow: 'Poder', grade: 'Nota', ft: (a, b) => `de ${a} para ${b}`, run: (p, d, x) => `${p}% das listas top${d ? ' de ' + d : ''} usam ${x}.`, now: g => `No momento, ${g}.`, best: n => `As ${n} melhores trocas juntas`, by: 'por' },
    fr: { syn: 'Synergie', pow: 'Puissance', grade: 'Note', ft: (a, b) => `de ${a} à ${b}`, run: (p, d, x) => `${p}% des meilleures listes${d ? ' ' + d : ''} jouent ${x}.`, now: g => `En ce moment, ${g}.`, best: n => `Les ${n} meilleurs échanges ensemble`, by: 'par' },
    de: { syn: 'Synergie', pow: 'Stärke', grade: 'Note', ft: (a, b) => `von ${a} auf ${b}`, run: (p, d, x) => `${p}% der Top-Listen${d ? ' mit ' + d : ''} spielen ${x}.`, now: g => `Grund: ${g}.`, best: n => `Die besten ${n} Tausche zusammen`, by: 'gegen' },
    it: { syn: 'Sinergia', pow: 'Potenza', grade: 'Voto', ft: (a, b) => `da ${a} a ${b}`, run: (p, d, x) => `Il ${p}% delle migliori liste${d ? ' di ' + d : ''} gioca ${x}.`, now: g => `Al momento ${g}.`, best: n => `I ${n} migliori scambi insieme`, by: 'con' },
  }[l];
  const upLab = k => UP && (k === 'Synergy' ? UP.syn : k === 'Power' ? UP.pow : /^grade$/i.test(k) ? (k === 'grade' && l !== 'de' ? UP.grade.toLowerCase() : UP.grade) : null);
  const upMove = (k, a, b) => { const w = upLab(k); return w && `${w} ${UP.ft(a, b)}`; };
  return [
    // Labels and screen reader labels (M3, M8, M9) and dates (M4).
    // 3.3.3: Upgrades and Top fixes ("Synergy 8.4 to 8.9.", "74% of top lists run Night Stretcher.").
    [/^(Synergy|Power|Grade|grade) ([\d.]+) to ([\d.]+)(?:, (Synergy|Power) ([\d.]+) to ([\d.]+))?(\.?)$/, (m, k, a, b, k2, c, d, dot) => {
      const x = upMove(k, a, b), y = k2 ? upMove(k2, c, d) : '';
      return x && (!k2 || y) && x + (y ? ', ' + y : '') + dot; }],
    [/^(\d+)% of (?:(.+) )?top lists run (?!it, )(.+)\.$/, (m, p, d, x) => UP && UP.run(p, d || '', x)],
    [/^Right now (.+)\.$/, (m, g) => { const gp = G(g); return UP && gp && UP.now(T().gap(gp)); }],
    [/^Best (\d+) swaps together$/, (m, n) => UP && UP.best(n)],
    [/^(.+? for .+?)\.$/, (m, s) => { if (!UP) return null; const ps = s.split(', ').map(x => x.split(' for '));
      return ps.every(p => p.length === 2 && nm(p[0]) && nm(p[1])) ? ps.map(p => p[0] + ' ' + UP.by + ' ' + p[1]).join(', ') + '.' : null; }],
    [/^(\d+) cards per row$/, (m, n) => T().perRow(n)],
    [/^Show all (\d+) (decks|days)$/, (m, n, k) => T().showAll(n, k)],
    [/^Updated ((?:\d{1,2} )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?: \d{1,2})?(?: \d{4})?)$/, (m, d) => { const x = i18nGtDate(d, l); return x && T().updated(x); }],
    [/^CardJinx, ((?:\d{1,2} )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?: \d{1,2})?(?: \d{4})?)$/, (m, d) => { const x = i18nGtDate(d, l); return x && 'CardJinx, ' + x; }],
    [/^Pokémon TCG Live letter to the community, ((?:\d{1,2} )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?: \d{1,2})?(?: \d{4})?)$/, (m, d) => { const x = i18nGtDate(d, l); return x && T().letter(x); }],
    [/^Start a prize game with (.+)$/, (m, x) => x !== 'this deck' && T().startWith(x)],
    [/^More for (.+)$/, (m, x) => x !== 'this deck' && T().moreFor(x)],
    [/^([A-J](?: and [A-J])*) mark cards$/, (m, k) => T().markCards(T().list(k.split(' and '), 'and'))],
    // Matchups and the meta notes.
    [/^(.+): (Even|Favored|Unfavored|Leans favored|Leans unfavored|Too few games), ([\d.]+)% over ([\d,]+) matches$/, (m, x, k, p, n) => T().mu(x, k, p, n)],
    [/^These are results for all (.+) lists, not your exact list\.$/, (m, x) => T().allLists(x)],
    [/^over ([\d,]+) games, about the same as before \(([\d.]+%)\)\.$/, (m, n, p) => T().overSame(n, p)],
    [/^Since the newest set came out \((.+)\): ([\d,]+) games? so far, too few to show a trend\.$/, (m, d, n) => T().sinceFew(i18nGtDate(d, l) || d, n)],
    [/^Win rate: ([\d,]+) games? so far, too few to judge\.$/, (m, n) => T().wrFew(n)],
    [/^Matchups against the (\d+) decks played most since (.+)$/, (m, n, d) => T().muSince(n, i18nGtDate(d, l) || d)],
    [/^Gray rows have fewer than (\d+) matches, too few to trust\.$/, (m, n) => T().gray(n)],
    // Attacker odds.
    [new RegExp(`^(.+) (ready|in hand) by turn (\\d+): ${PCT}(?: to ${PCT})?$`), (m, x, k, t, a, b) => nm(x) && T().readyBy(x, k === 'in hand', t, a, b)],
    [new RegExp(`^${PCT} is raw draws alone, the floor\\.$`), (m, p) => T().floor(p)],
    [new RegExp(`^${PCT} from raw draws alone, and your search cards do not raise it\\.$`), (m, p) => T().noRaise(p)],
    [new RegExp(`^By turn (\\d+): ${PCT}(?: to ${PCT})?\\.$`), (m, t, a, b) => T().byTurn(t, a, b)],
    [/^This list has (\d+) attackers and picks the one each turn needs\.$/, (m, n) => T().nAtk(n)],
    [/^Here is how often you can have (.+), the one the grade leads with, ready by your (second|third) turn\.$/, (m, x, t) => nm(x) && T().howLead(x, t === 'second' ? 2 : 3)],
    [/^(The attacker its meta deck is named for|The main attacker you set|The attacker this list is built around), and how often you can have it ready by your (second|third) turn\.$/,
      (m, w, t) => T().howWhy(w === 'The main attacker you set' ? 'pick' : /meta deck/.test(w) ? 'name' : 'core', t === 'second' ? 2 : 3)],
    [/^Attacker by T(\d), any hand$/, (m, t) => T().atkBy(t)],
    [/^(.+?)( in hand)?, any opening hand, (the same from raw draws alone or with your search cards|from raw draws alone to with your search cards|raw draws)$/,
      (m, x, h, k) => nm(x) && T().anyHand(x, !!h, /^the same/.test(k) ? 'same' : /^from/.test(k) ? 'range' : 'raw')],
    [/^This counts (.+?) in hand, not at full power: it hits for (\d+) until you have (\d+) (.+?) in your discard pile, then (\d+)\.$/, (m, x, a, k, w, b) => { const p = i18nDmgPile(w, D(), k); return nm(x) && p && T().inHand(x, a, k, p, b); }],
    [/^This counts (.+?) in hand, not at full power: it hits for (\d+) with 2 (.+?) in your discard pile and (\d+) once you have (\d+)\.$/, (m, x, a, w, b, k) => { const p = i18nDmgPile(w, D(), 2); return nm(x) && p && T().inHand2(x, a, p, b, k); }],
    [/^(.+) is a Stage (1|2), but a Pokemon it evolves from is not in the list, so it can only reach the board through other cards\.$/, (m, x, s) => nm(x) && T().noFrom(x, s)],
    [/^Needs (.+?) by turn 1, then (.+?) by turn 2 \(nothing evolves on its first turn in play\)\.$/, (m, a, b) => nm(a) && nm(b) && T().need1(a, b)],
    [/^Needs (.+?) by turn 1, then (.+?) and Rare Candy by turn 2(?: \(the (.+?) route needs until turn 3\))?\.$/, (m, a, b, c) => nm(a) && nm(b) && T().needCandy(a, b, c)],
    [/^Needs (.+?) by turn 1 and (.+?) by turn 2, then (.+?) on turn 3 \(there is no Rare Candy in the list, and nothing evolves on its first turn in play\)\.$/, (m, a, b, c) => nm(a) && nm(b) && nm(c) && T().need3(a, b, c)],
    [/^Needs (.+?) among your first (\d+) cards\.$/, (m, a, n) => nm(a) && T().needSeen(a, n)],
    // How tightly the list fits.
    [/^(How tightly the list fits|Fewer of your cards pull the same way)(?:: (.+))?\.$/, (m, h, c) => {
      const cs = c ? c.split(', and ').map(x => { let k;
        if ((k = x.match(/^your Pokemon are spread over (\d+) lines$/))) return T().fitLines(k[1]);
        if ((k = x.match(/^(\d+) of your (\d+) (Pokemon|Trainers) (?:is a single copy|are single copies)$/))) return T().fitSingles(k[1], k[2], k[3] === 'Pokemon');
        if ((k = x.match(/^your attacks need (\d+) Energy types$/))) return T().fitTypes(k[1]);
        if ((k = x.match(/^each attacker can use only about (\d+)% of your Energy$/))) return T().fitUse(k[1]);
        return null; }) : [];
      return cs.every(x => x != null) ? T().fit(/^How/.test(h), cs) : null; }],
    // Trainer fit lines.
    [/^(One card does|(\d+) cards do) little here(, with a swap idea for each|, with swap ideas below)?\.$/, (m, a, n, sw) => T().little(n ? +n : 1, sw ? (/each/.test(sw) ? 'each' : 'below') : '')],
    [/^(.+?)(?:, one of (\d+) cards that do)?\.$/, (m, r, n) => { const k = R(r); return k && T().role1(k, n); }],
    [/^(.+?): your only (Trainer|card) that does\.$/, (m, r, w) => { const k = R(r); return k && T().roleOnly(k, w === 'card'); }],
    [/^(.+?): (\d+) of the (\d+) cards that do\.$/, (m, r, a, b) => { const k = R(r); return k && T().roleOf(k, a, b); }],
    [/^(.+?), but (\d+) other cards in the list already do that, more than most winning lists run, so this one adds little\.$/, (m, r, n) => { const k = R(r); return k && T().crowded(k, n); }],
    [/^(.+?), but no winning list from recent events runs it\.$/, (m, r) => { const k = R(r); return k && T().unplayed(k); }],
    [/^Helps pay Energy costs for (.+?)(?:, (\d+) of the (\d+) cards that do)?\.$/, (m, x, a, b) => nm(x) && T().payFor(x, a, b)],
    [/^Skips (the Stage 1|.+?) to get (.+?) out a turn sooner\.$/, (m, a, b) => nm(b) && T().skips(a === 'the Stage 1' ? null : nm(a), b)],
    [/^(.+?) skips the middle stage to get (.+?) into play fast\.$/, (m, a, b) => nm(a) && nm(b) && T().skipsMid(a, b)],
    [/^Needs (.+?) in the list to put (.+?) on, and the list runs none\.$/, (m, a, b) => nm(a) && nm(b) && T().needsOn(a, b)],
    [/^Needs (.+?), and the list runs none\.$/, (m, w) => { const q = w.split(' or ').map(x => Q(x, true)); return q.every(Boolean) && T().needsNone(T().list(q, 'or')); }],
    [/^Needs (.+?), which this list does not run\.$/, (m, w) => { const q = w.split(' or ').map(x => Q(x, true)); return q.every(Boolean) && T().needsAce(T().list(q, 'or')); }],
    // ACE SPEC lines: "X does R. Y might fit better, since GAP." are read one sentence at a time.
    [/^(.+), and that fills a hole: (.+)\.$/, (m, s, g) => { const xr = NR(s), gp = G(g); return xr && gp && T().aceFills(xr[0], xr[1], gp); }],
    [/^(.+?) might fit better, since (.+)\.$/, (m, x, g) => { const gp = G(g); return nm(x) && gp && T().aceBetter(x, gp); }],
    [/^(.+?) would (.+?), and (.+)\.$/, (m, x, d, g) => { const k = typeof GT_ROLE_DO === 'object' && Object.keys(GT_ROLE_DO).find(k => GT_ROLE_DO[k] === d), gp = G(g); return nm(x) && k && gp && T().aceWould(x, k, gp); }],
    [/^Swap idea: (one more )?(.+?), since (.+)\.$/, (m, more, x, g) => { const gp = G(g); return nm(x) && gp && T().swap(x, !!more, gp); }],
    [/^(.+)\.$/, (m, s) => { const xr = NR(s); return xr && T().aceDoes(xr[0], xr[1]); }],
    // In this deck: notes.
    [/^(Finds|Can Bench) any of your (\d+) (.+?), like (.+?)(?:, or (an? Basic (?:.+ )?Energy))?\.$/, (m, v, n, q, l, e) => { const w = Q(q, +n !== 1), li = L(l), en = e ? E(e) : ''; return w && li && en != null && T().anyLike(v === 'Finds', n, w, li, en); }],
    [/^Can Bench every Basic you run at once, like (.+)\.$/, (m, l) => { const li = L(l); return li && T().benchAll(li); }],
    [/^(?!Gets back (?:any mix of |Knocked Out )?Pokemon like |Gets back Basic .+Energy for )(Finds|Can Bench|Gets back|Works on|Can evolve straight into|Fully heals|Shields|Keeps|Can fetch a single copy like your) (.+?)( from attack effects, like Special Conditions| free of Special Conditions)?\.$/, (m, v, l, tail) => {
      const k = v === 'Shields' ? (/attack effects/.test(tail || '') ? 'shields' : null) : v === 'Keeps' ? (/Special/.test(tail || '') ? 'keeps' : null) : tail ? null : v;
      if (!k) return null;
      let x = l, e = '', mm;
      if ((mm = l.match(/^(.+?), (or|and) (an? Basic (?:.+ )?Energy|Basic (?:.+ )?Energy)$/))) { x = mm[1]; e = E(mm[3]); if (e == null) return null; e = { e, or: mm[2] === 'or' }; }
      const li = L(x); return li && T().verbList(k, li, e); }],
    [/^Gets back (any mix of )?(Knocked Out )?Pokemon like (.+?)(?:, (or|and) (an? Basic (?:.+ )?Energy|Basic (?:.+ )?Energy))?\.$/, (m, mix, ko, l, c, e) => {
      const li = L(l), en = e ? E(e) : ''; return li && en != null && T().backLike(!!mix, !!ko, li, en ? { e: en, or: c === 'or' } : ''); }],
    [/^Shuffles Knocked Out Pokemon like (.+?) back into your deck\.$/, (m, l) => { const li = L(l); return li && T().shuffleKo(li); }],
    [/^(Gets back|Shuffles) (Basic .+Energy)(?: back into your deck)? for (.+?)\.$/, (m, v, e, x) => { const en = E(e); return en && T().energyFor(v === 'Gets back', en, by(x)); }],
    [/^With (\d+) (.+?) in your (\d+) cards, it (almost always finds one|finds one about (\d+)% of the time)\.$/, (m, n, k, d, f, p) => {
      const w = k.split(' and ').map(x => Q(x, true)); return w.every(Boolean) && T().withOdds(n, T().list(w, 'and'), d, p || null); }],
    [/^Takes (.+?) from (\d+) to (\d+) HP(?:, or (.+?) to (\d+))?\.$/, (m, x, a, b, y, c) => nm(x) && (!y || nm(y)) && T().takesHp(x, a, b, y, c)],
    [/^(.+?'s .+?) goes from (\d+) to (\d+)( against Pokemon ex)?\.$/, (m, x, a, b, ex) => T().goesFrom(by(x), a, b, !!ex)],
    [/^On (.+?), your opponent takes (\d+) Prizes? for it, not (\d+)(,? once a game)?\.$/, (m, x, a, b, o) => nm(x) && T().prizeFor(x, a, b, !!o)],
    [new RegExp(`^On (.+?), (${TY}) attackers need (\\d+) damage to Knock it Out, not (\\d+)\\.$`), (m, x, t, a, b) => nm(x) && T().koNeed(x, t, a, b)],
    [/^Puts (?:(\d+) )?Energy on (.+?)( at once)?(?:, once (.+?) (?:is|are) in play)?\.$/, (m, n, l, once, w) => {
      const li = L(l); let wh = '';
      if (w) { const mm = w.match(/^an? (.+?) like (.+)$/); wh = mm ? (Q(mm[1]) && T().aLike(Q(mm[1]), mm[2])) : L(w); if (!wh || (mm && !nm(mm[2]))) return null; }
      return li && T().putsE(n, li, !!once, wh); }],
    [/^Turns spare Pokemon like (.+?) into (\d+) cards each\.$/, (m, l, n) => { const li = L(l); return li && T().spare(li, n); }],
    [new RegExp(`^On a (${TY}) Pokemon like (.+?), it Benches up to (\\d+) of (.+)\\.$`), (m, t, x, n, l) => { const li = L(l); return nm(x) && li && T().onTypeBench(t, x, n, li); }],
    [new RegExp(`^Picks (\\d+) of your ((?:${TY})(?:, (?:${TY}))* and (?:${TY})) Energy\\.$`), (m, n, ts) => T().picks(n, D().en(ts.split(/, | and /), false, 2, false))],
    [/^Can pay the Colorless in (.+)\.$/, (m, l) => { const li = L(l); return li && T().payColorless(li); }],
    [/^On (.+?), it pays (the|\d+ of the) (Colorless|Energy) for (.+?)(, for one turn)?\.$/, (m, x, h, w, a, t) => nm(x) && T().onPays(x, h === 'the' ? null : parseInt(h, 10), w === 'Colorless', a, !!t)],
    [/^Pays (\d+) of the Energy for (.+?'s .+?)\.$/, (m, n, x) => T().paysFor(n, by(x))],
    [/^On a (.+?) like (.+?), it counts as any type for (.+)\.$/, (m, q, x, a) => { const w = Q(q + ' Pokemon'); return w && nm(x) && T().anyType(w, x, a); }],
    [/^Gets a whole (.+?) line at once\.$/, (m, l) => { const li = L(l); return li && T().wholeLine(li); }],
    [/^Finds (.+?) and an Energy together\.$/, (m, l) => { const li = L(l); return li && T().withEnergy(li, false); }],
    [/^Gets your (.+?) and an Energy together\.$/, (m, l) => { const li = L(l); return li && T().withEnergy(li, true); }],
    [/^Gets your (.+?) together\.$/, (m, l) => { const li = L(l); return li && T().together(li); }],
    [/^Your list has no (.+?), so it finds (\d+) cards?, not (\d+)\.$/, (m, q, a, b) => { const w = Q(q, true); return w && T().findsFewer(w, a, b); }],
    [/^Can turn (.+?) into (.+?) in one go\.$/, (m, a, b) => nm(a) && nm(b) && T().oneGo(a, b)],
    [/^Gives you (\d+) Bench spots while (.+?) is in play\.$/, (m, n, l) => { const li = L(l); return li && T().benchSpots(n, li); }],
    [/^Draws (\d+) after any of your (\d+) (.+?) Supporters?\.$/, (m, n, k, w) => T().drawsAfter(n, k, w)],
    [/^Every Pokemon in your list is (.+?), so it draws to (\d+)\.$/, (m, q, n) => { const w = Q(q + ' Pokemon', true); return w && T().everyIs(w, n); }],
    [/^Works when (.+?) takes the Knock Out\.$/, (m, l) => { const li = L(l); return li && T().worksKo(li); }],
    [/^Your (own )?(.+?) (?:take|takes) (\d+) (less )?damage( too| that turn| when you Bench them)?\.$/, (m, own, l, n, less, w) => {
      const li = L(l); return li && T().takeDmg(li, n, !!less, (w || '').trim()); }],
    [/^Your own (.+?) drops to (\d+) HP too\.$/, (m, x, n) => nm(x) && T().dropsTo(x, n)],
    [/^Fits (.+?), which (attacks?) with (\d+) or more Energy(?:; (.+?) makes it (\d+))?\.$/, (m, l, a, n, s, k) => { const li = L(l); return li && (!s || nm(s)) && T().fits(li, a === 'attacks', n, s, k); }],
    [/^Heals (\d+) when it moves (.+?) to your Bench\.$/, (m, n, l) => { const li = L(l); return li && T().healsMove(n, li); }],
    [/^Can grab your (.+?) along with Supporters\.$/, (m, x) => nm(x) && T().grabWith(x)],
    [/^(.+?) is too big for it \((\d+) HP\)\.$/, (m, x, n) => nm(x) && T().tooBig(x, n)],
    [/^Lets (.+?) retreat for free(?:; (.+?) still pays (\d+)| \(it costs (\d+) now\))?\.$/, (m, l, x, n, c) => { const li = L(l); return li && (!x || nm(x)) && T().retreat(li, x, n, c); }],
    [/^Lets (.+?) evolve into (.+?) the turn you play it\.$/, (m, a, b) => nm(a) && nm(b) && T().evolveNow(a, b)],
    [/^Also turns off your own (.+?)(?: and (\d+) more)?\.$/, (m, l, n) => { const it = l.split(/ and (?=[^,]*'s )|, | and (?=[^,]+$)/).map(x => i18nGtItem(x, T(), D()));
      return it.every(x => x != null) && T().offOwn(T().list(it, 'and', n ? { n: +n, k: 'more' } : null)); }],
    [/^You run no (.+?), so (only your opponent's lose HP|it only turns off your opponent's|only your opponent pays more|it only helps your opponent's)\.$/, (m, q, w) => {
      const x = Q(q, true); return x && T().runNo(x, { "only your opponent's lose HP": 'hp', "it only turns off your opponent's": 'off', 'only your opponent pays more': 'pays', "it only helps your opponent's": 'helps' }[w]); }],
    [/^Comes back after (.+?'s .+?) discards it\.$/, (m, x) => T().comesBack(by(x))],
    [/^Turns on once your own Pokemon is Poisoned, which (.+?) does here\.$/, (m, x) => nm(x) && T().poisoned(x)],
    [new RegExp(`^Takes (\\d+) of your (\\d+) Basic (${TY}) Energy at once\\.$`), (m, a, b, t) => T().takesE(a, b, D().en([t], true, +b, false))],
    [/^Benches up to (\d+) (.+?) at once\.$/, (m, n, q) => { const w = Q(q, +n !== 1) || nm(q); return w && T().benchesUp(n, w); }],
    [/^Switches between your (.+?) once a turn\.$/, (m, l) => { const li = L(l); return li && T().switchBetween(li); }],
    // How it plays.
    [/^(.+) does the attacking\.$/, (m, x) => nm(x) && T().doesAtk(x)],
    [/^The list plays as (.+), a deck named for it\.$/, (m, x) => T().playsAs(x)],
    // 3.3.1 (Muse 3.3 retest, M29): a deck named for its engine (Toxtricity Box), with the engine's Ability.
    [/^The list plays as (.+?), a deck named for (.+?), which (sets up the attackers|powers the attackers rather than attacking|sets them up|powers them rather than attacking): its (.+)\.$/, (m, x, e, k, rest) => {
      if (!nm(e) || !T().playsEng) return null;
      let atk = false, sp = i18nGtAbSplit(rest, l);
      if (sp && / attack$/.test(sp[0])) { atk = true; sp = [sp[0].replace(/ attack$/, ''), sp[1]]; }
      return sp && T().playsEng(x, e, { 'sets up the attackers': 'setsA', 'powers the attackers rather than attacking': 'powA', 'sets them up': 'setsT', 'powers them rather than attacking': 'powT' }[k], atk, sp[0], String(sp[1]).replace(/\.$/, '')); }],
    [/^The list plays as (.+), and of the Pokemon that deck is named for, it is the one the list is built to attack with\.$/, (m, x) => T().playsAsOne(x)],
    [/^(You set it as the main attacker|It is the attacker this list is built around): (\d+) cop(?:y|ies)(?: plus (\d+) Pokemon it evolves from)?\.$/, (m, w, n, f) => T().copies(/^You/.test(w), n, f)],
    [/^(.+) is the one the list runs most copies of \((\d+)\)\.$/, (m, x, n) => nm(x) && T().most(x, n)],
    [/^(\d+) different Pokemon here can carry the attack, and you pick the one that fits each turn\.$/, (m, n) => T().box(n)],
    [/^(?!The best one here is )(Its .+?|.+?'s .+?) (hits for|averages) (\d+)( with its coin flips)?\.$/, (m, s, k, n, c) => T().hits(its(s), k === 'averages', n, !!c)],
    [/^(Its .+?|.+?'s .+?) counts the cards in your hand: about (\d+) with (\d+) cards, the app's estimate, not a printed number\.$/, (m, a, n, k) => T().handEst(its(a), n, k)],
    [/^(Its .+?|.+?'s .+?) depends on the board, so (\d+) is the app's estimate, not a printed number\.$/, (m, a, n) => T().boardEst(its(a), n)],
    [/^(Its .+?|.+?'s .+?) prevents all damage done to it by attacks from your opponent's Pokemon ex, so ex attackers cannot knock it out\.$/, (m, a) => T().wall(its(a))],
    [new RegExp(`^(Its .+?|.+?'s .+?) adds (\\d+) to its attacks while it has (${TY}) Energy attached(?:, so it hits for (\\d+))?(?:, and gives it (\\d+) more HP)?\\.$`), (m, a, n, t, h, hp) => T().boost(its(a), n, E(t + ' Energy'), h, hp)],
    [/^(Its .+?|.+?'s .+?) puts (\d+) damage counters on 1 of your opponent's Pokemon each turn( while it is Active)?\.$/, (m, a, n, act) => T().ownDmg(its(a), n, !!act)],
    [/^(Its .+?|.+?'s .+?) Knocks Out your opponent's Active Pokemon when it has exactly (\d+) damage counters on it(?:, and (.+?) can put them there)?, so the grade counts it as a one-shot of anything\.$/, (m, a, n, x) => (!x || nm(x)) && T().kox(its(a), n, x)],
    [/^(Its .+?|.+?'s .+?) does (\d+) more for each (.+?) in your discard pile: (\d+) with 2 there, (\d+) once you have (\d+)\.$/, (m, a, n, w, b, c, k) => { const p = i18nDmgPile(w, D(), 1); return p && T().pileDmg(its(a), n, p, b, c, k); }],
    [/^(Its .+?|.+?'s .+?) counts (the Energy|.+? Energy) attached to (both Active Pokemon|all your Pokemon|itself), so every one you attach (to it|anywhere on your board) adds (\d+)(?: \((\d+) for (an? .+? Energy) with (.+?) in play\))?(, and your opponent's Energy adds to it too)?\.$/,
      (m, a, e, on, wh, n, n2, e2, x, opp) => { const en = e === 'the Energy' ? '' : E(e); const en2 = e2 ? E(e2) : ''; return en != null && en2 != null && T().eScale(its(a), en, on, n, n2 ? { n: n2, e: en2, by: by(x) } : null, !!opp); }],
    [/^(Its .+?|.+?'s .+?) discards (.+?) from your Pokemon and does (\d+) for each one, so every one you attach anywhere on your board adds (\d+) to its next big hit\.$/, (m, a, e, n) => { const en = E(e); return en && T().discEach(its(a), en, n); }],
    [/^That counts the (\d+) more it does when it discards (all its Energy|\d+ .*Energy) from itself, so (it has to be powered up again|it needs another attached|it needs (\d+) more attached) before the next big hit\.$/,
      (m, n, w, k, k2) => { const c = +(w.match(/^\d+/) || [0])[0], e = /^all/.test(w) ? 'all' : i18nDmgE(w.replace(/^\d+ /, ''), D(), c); return e && T().discNext(n, w.match(/^\d+/) ? +w.match(/^\d+/)[0] : 0, e, /powered/.test(k) ? 'all' : k2 ? +k2 : 1); }],
    [/^It discards (all its Energy|\d+ .*Energy) from itself each time, so (it has to be powered up again|it needs another attached|it needs (\d+) more attached) before it can hit that hard again\.$/,
      (m, w, k, k2) => { const c = +(w.match(/^\d+/) || [0])[0], e = /^all/.test(w) ? 'all' : i18nDmgE(w.replace(/^\d+ /, ''), D(), c); return e && T().discEach2(w.match(/^\d+/) ? +w.match(/^\d+/)[0] : 0, e, /powered/.test(k) ? 'all' : k2 ? +k2 : 1); }],
    [/^(Its .+?|.+?'s .+?) grows as your discard pile fills: (\d+) early, (\d+) once you have (\d+) (.+?) there\.$/, (m, a, b, c, k, w) => { const p = i18nDmgPile(w, D(), k); return p && T().grows(its(a), b, c, k, p); }],
    [/^(.+?) also does (\d+) damage to (\d+) of your opponent's Benched Pokemon\.$/, (m, a, n, k) => T().alsoBench(a, n, k)],
    [/^It cannot use (.+?) two turns in a row, so (?:use (.+?) or )?bring in another attacker on the turn between\.$/, (m, a, b) => T().lock(a, b)],
    [/^It cannot attack at all on its next turn after (.+?), so switch in another attacker on the turn between\.$/, (m, a) => T().lockAll(a)],
    [/^(Its .+?|.+?'s .+?) lets it use the attacks of your Benched Pokemon, paid with its own Energy\.$/, (m, a) => T().copyBench(its(a))],
    [/^The best one here is (.+?'s .+?), which (averages|hits for) (\d+)\.$/, (m, x, k, n) => T().bestHere(by(x), k === 'averages', n)],
    [/^It copies (.+?'s .+?) with (.+?)\.$/, (m, x, a) => T().copiesWith(by(x), a)],
    [/^(Its .+?|.+?'s .+?) uses an attack from a Pokemon without a Rule Box that comes off the top of your deck\.$/, (m, a) => T().mill(its(a))],
    [/^In this list that is (.+)\.$/, (m, l) => { const li = L(l); return li && T().inList(li); }],
    [/^(.+?) put the one you want there first\.$/, (m, l) => { const li = L(l); return li && T().putFirst(li); }],
    [/^(.+?) can use (.+?)'s attacks with (.+?) when it comes off the top of your deck, so (.+?) needs no (.+?) of its own\.$/, (m, x, y, a, y2, e) => nm(x) && nm(y) && T().useOff(x, y, a, e)],
    [/^(.+?) copies (.+?)'s attacks with (.+?), paying only its own cost, so (.+?) needs no (.+?) of its own\.$/, (m, x, y, a, y2, e) => { const en = E(e); return nm(x) && nm(y) && en && T().copyPay(x, y, a, en); }],
    [/^(.+?) evolves from (.+?), and (.+?) can evolve into it, so the line works without a plain (.+?)\.$/, (m, x, f, y) => nm(x) && nm(f) && nm(y) && T().evoWithout(x, f, y)],
    [/^(.+?) can put itself onto your Bench from your hand with (.+?), so it does not need to evolve\.$/, (m, x, a) => nm(x) && T().benchSelf(x, a)],
    [/^Played mainly for (their Abilities|its Ability), to (draw and search|draw cards|search your deck): (.+)\.$/, (m, w, k, l) => {
      const li = L(l, x => /^(.+) \((.+)\)$/.test(x) && i18nGtName(x.replace(/ \(.+\)$/, '')) ? x : null);
      return li && T().forAbil(/^their/.test(w), k === 'draw and search' ? 'both' : k === 'draw cards' ? 'draw' : 'search', li); }],
    [/^(Their attacks cost|Its attack costs) only Colorless Energy, so the list's Energy is not picked for (?:them|it)\.$/, (m, w) => T().colorless(/^Their/.test(w))],
    [/^Damage from (Abilities|an Ability): (.+)$/, (m, w, l) => { const a = l.split(', '); return a.every(nm) && T().dmgFrom(w === 'Abilities', a.join(', ')); }],
    [/^(.+), on top of your attack that turn\.$/, (m, s) => { const ps = s.split(/, and (?=.+?'s )/).map(p => { const k = p.match(/^(.+?'s .+?) puts (\d+) damage counters? on 1 of your opponent's Pokemon$/); return k && T().abPuts(by(k[1]), k[2]); });
      return ps.every(Boolean) && T().onTop(ps); }],
    [/^Using it Knocks Out (.+?), which gives up a prize, so it finishes a knockout rather than starting one\.$/, (m, l) => { const li = L(l); return li && T().koSelf(li); }],
    [/^Attackers: (.+)$/, (m, l) => l.split(', ').every(nm) && T().attackers(l)],
    [/^(.+?) can hit any (\d+) of your opponent's Pokemon for (\d+), Benched ones too\.$/, (m, a, n, d) => T().hitAny(a, n, d)],
    // Ability and attack effect phrases, read with the Abilities table.
    [/^Its (.+)\.$/, (m, s) => { const x = i18nGtAbSplit(s, l); return x && T().itsAb(x[0], x[1]); }],
    [/^With its (.+?), (.+)\.$/, (m, a, p) => { const x = i18nGtAb(p, l); return x && T().withAb(a, x); }],
    [/^(.+?) also (.+)\.$/, (m, a, p) => { const x = i18nGtAb(p, l); return x && T().alsoAtk(a, x); }],
  ];
}
/** One generated Grade tab sentence or label in language l, or null. Built on first use, so a language file can load before this one. */
function i18nGtSent(s, l) {
  const T = i18nGtTab(l);
  if (!T || !i18nDmgTab(l)) return null;
  const ps = I18N_GT_PATS[l] || (I18N_GT_PATS[l] = i18nGtPats(l));
  if (/[a-z0-9)][.!?] [A-Z0-9¿¡]/.test(s)) return null;
  for (const p of ps) { const m = s.match(p[0]); if (m) { let r = null; try { r = p[1](...m); } catch (e) { r = null; } if (typeof r === 'string' && r && !/\b(?:undefined|null|NaN)\b/.test(r)) return r; } }
  return null;
}
// Puzzle buttons and the builder's card facts line: card, attack and Ability names stay English.
const I18N_PZ_PRE = /^(?=(?:Bench [A-Z]|Evolve |Rare Candy: |Attach |Use [A-Z]|Retreat into |Make |Switch in |Bring up |Take nothing$|Basic(?:, |$)|Stage [12](?:, |$)|.+ Energy (?:to|from) |\d+ from |.+ \((?:Active|Bench \d+)\): |.+ from your hand: |(?:Item|Supporter|Stadium|Pokémon Tool|Trainer|Special Energy), ACE SPEC$))[\s\S]+$/;
const I18N_PZ = {
  es: { act: 'Activo', bench: 'Banca', their: n => n + ' del rival', aMon: 'un Pokémon', aCard: 'una carta', hp: 'PS',
    benchX: x => `Poner a ${x} en la Banca`, evolve: (m, x) => `Evolucionar a ${m} en ${x}`, candy: (m, x) => `Rare Candy: ${m} en ${x}`,
    to: (x, m) => `${x} a ${m}`, attach: (x, m) => `Unir ${x} a ${m}`, use: x => `Usar ${x}`, retreat: (m, p) => `Retirarse y subir a ${m}` + (p ? `, descartando ${p}` : ''),
    make: m => `Poner a ${m} como Activo`, swIn: m => `Cambiar a ${m}`, bring: m => `Traer a ${m}`, move: (x, a, b) => `${x} de ${a} a ${b}`, from: (x, a) => `${x} de ${a}`,
    none: 'No tomar nada', hand: (x, a) => `${x} desde tu mano: ${a}` },
  pt: { act: 'Ativo', bench: 'Banco', their: n => n + ' do oponente', aMon: 'um Pokémon', aCard: 'uma carta', hp: 'PS',
    benchX: x => `Colocar ${x} no Banco`, evolve: (m, x) => `Evoluir ${m} para ${x}`, candy: (m, x) => `Rare Candy: ${m} para ${x}`,
    to: (x, m) => `${x} para ${m}`, attach: (x, m) => `Ligar ${x} a ${m}`, use: x => `Usar ${x}`, retreat: (m, p) => `Recuar e trazer ${m}` + (p ? `, descartando ${p}` : ''),
    make: m => `Tornar ${m} Ativo`, swIn: m => `Trocar por ${m}`, bring: m => `Trazer ${m}`, move: (x, a, b) => `${x} de ${a} para ${b}`, from: (x, a) => `${x} de ${a}`,
    none: 'Não pegar nada', hand: (x, a) => `${x} da sua mão: ${a}` },
  de: { act: 'Aktiv', bench: 'Bank', their: n => n + ' des Gegners', aMon: 'ein Pokémon', aCard: 'eine Karte', hp: 'KP',
    benchX: x => `${x} auf die Bank legen`, evolve: (m, x) => `${m} zu ${x} entwickeln`, candy: (m, x) => `Rare Candy: ${m} zu ${x}`,
    to: (x, m) => `${x} an ${m}`, attach: (x, m) => `${x} an ${m} anlegen`, use: x => `${x} einsetzen`, retreat: (m, p) => `Rückzug zu ${m}` + (p ? `, dabei ${p} ablegen` : ''),
    make: m => `${m} aktiv machen`, swIn: m => `${m} einwechseln`, bring: m => `${m} nach vorne holen`, move: (x, a, b) => `${x} von ${a} auf ${b}`, from: (x, a) => `${x} von ${a}`,
    none: 'Nichts nehmen', hand: (x, a) => `${x} aus deiner Hand: ${a}` },
  fr: { act: 'Actif', bench: 'Banc', their: n => n + ' adverse', aMon: 'un Pokémon', aCard: 'une carte', hp: 'PV',
    benchX: x => `Placer ${x} sur le Banc`, evolve: (m, x) => `Faire évoluer ${m} en ${x}`, candy: (m, x) => `Rare Candy : ${m} en ${x}`,
    to: (x, m) => `${x} sur ${m}`, attach: (x, m) => `Attacher ${x} à ${m}`, use: x => `Utiliser ${x}`, retreat: (m, p) => `Battre en retraite vers ${m}` + (p ? `, en défaussant ${p}` : ''),
    make: m => `Rendre ${m} Actif`, swIn: m => `Faire entrer ${m}`, bring: m => `Faire venir ${m}`, move: (x, a, b) => `${x} de ${a} sur ${b}`, from: (x, a) => `${x} de ${a}`,
    none: 'Ne rien prendre', hand: (x, a) => `${x} depuis votre main : ${a}` },
  it: { act: 'Attivo', bench: 'Panchina', their: n => n + ' avversario', aMon: 'un Pokémon', aCard: 'una carta', hp: 'PS',
    benchX: x => `Mettere ${x} in Panchina`, evolve: (m, x) => `Far evolvere ${m} in ${x}`, candy: (m, x) => `Rare Candy: ${m} in ${x}`,
    to: (x, m) => `${x} a ${m}`, attach: (x, m) => `Assegnare ${x} a ${m}`, use: x => `Usare ${x}`, retreat: (m, p) => `Ritirarsi su ${m}` + (p ? `, scartando ${p}` : ''),
    make: m => `Rendere Attivo ${m}`, swIn: m => `Far entrare ${m}`, bring: m => `Far avanzare ${m}`, move: (x, a, b) => `${x} da ${a} a ${b}`, from: (x, a) => `${x} da ${a}`,
    none: 'Non prendere nulla', hand: (x, a) => `${x} dalla tua mano: ${a}` },
};
function i18nPzSent(s, l) {
  const P = I18N_PZ[l]; if (!P) return null;
  const dict = l === 'es' ? I18N_ES : l === 'pt' ? I18N_PT : ((i18nMore(l) || {}).dict || {});
  const w = k => dict[k] || null;
  // A Pokémon in play: "their Tatsugiri (Bench 2)"; a bare name with no spot is a card name and stays.
  const mon = t => {
    if (t === 'a Pokémon') return P.aMon;
    const m = /^(their )?(.+?)(?: \((Active|Bench (\d+))\))?$/.exec(t); if (!m) return null;
    const n = m[1] ? P.their(m[2]) : m[2];
    return m[3] ? `${n} (${m[4] ? P.bench + ' ' + m[4] : P.act})` : n;
  };
  const card = t => t === 'a card' ? P.aCard : t;
  let m;
  if (s === 'Take nothing') return P.none;
  if ((m = /^(Basic|Stage 1|Stage 2)(?:, (\d+) HP)?((?:, [^,.]+)*)$/.exec(s))) return w(m[1]) && (w(m[1]) + (m[2] ? `, ${m[2]} ${P.hp}` : '') + m[3]);
  if ((m = /^(Item|Supporter|Stadium|Pokémon Tool|Trainer|Special Energy), ACE SPEC$/.exec(s))) return w(m[1]) && w('ACE SPEC') && `${w(m[1])}, ${w('ACE SPEC')}`;
  if ((m = /^Bench ([A-Z][^.]*)$/.exec(s))) return P.benchX(m[1]);
  if ((m = /^Evolve (.+?) into ([^.]+)$/.exec(s))) return mon(m[1]) && P.evolve(mon(m[1]), m[2]);
  if ((m = /^Rare Candy: (.+?) into ([^.]+)$/.exec(s))) return mon(m[1]) && P.candy(mon(m[1]), m[2]);
  if ((m = /^Attach (.+?) to ([^.]+)$/.exec(s))) return mon(m[2]) && P.attach(card(m[1]), mon(m[2]));
  if ((m = /^Use ([A-Z][^.]*)$/.exec(s))) return P.use(m[1]);
  if ((m = /^Retreat into (.+?)(?:, discarding (.+))?$/.exec(s))) return mon(m[1]) && P.retreat(mon(m[1]), m[2] || '');
  if ((m = /^Make (.+) Active$/.exec(s))) return mon(m[1]) && P.make(mon(m[1]));
  if ((m = /^Switch in (.+)$/.exec(s))) return mon(m[1]) && P.swIn(mon(m[1]));
  if ((m = /^Bring up (.+)$/.exec(s))) return mon(m[1]) && P.bring(mon(m[1]));
  if ((m = /^(\d+|.+? Energy|a card) from (?!your )(.+?) to (.+)$/.exec(s))) return mon(m[2]) && mon(m[3]) && P.move(card(m[1]), mon(m[2]), mon(m[3]));
  if ((m = /^(.+? Energy|a card) from (?!your )(?=their |.+ \((?:Active|Bench \d+)\)$)(.+)$/.exec(s))) return mon(m[2]) && P.from(card(m[1]), mon(m[2]));
  if ((m = /^(.+? Energy|a card) to (.+)$/.exec(s))) return mon(m[2]) && P.to(card(m[1]), mon(m[2]));
  if ((m = /^(.+) from your hand: (.+)$/.exec(s))) return P.hand(m[1], m[2]);
  if ((m = /^((?:their )?.+? \((?:Active|Bench \d+)\)): (.+)$/.exec(s))) return mon(m[1]) && `${mon(m[1])}${l === 'fr' ? ' :' : ':'} ${m[2]}`;
  return null;
}
I18N_PAT.unshift([I18N_PZ_PRE, m => i18nPzSent(m, 'es'), m => i18nPzSent(m, 'pt')]);

// ═══════════ Sparring (opponent/play.html): the AI opponent page ═══════════
// Its screens, game log and reasons, in every language. Each row is the English (an exact string, or a
// regex whose captures are card names or numbers) and then Spanish, Portuguese, French, German and
// Italian, with $1, $2 for the captures. Card, attack and Ability names stay English, as everywhere.
// The rows are read by i18nFtSent below, which I18N_PAT (Spanish, Portuguese) and each language file
// (I18N_MORE[lang].pat) call. The log speaks for whoever played, so it has no subject: "Played Ultra Ball".
const I18N_FT_LANGS = ['es', 'pt', 'fr', 'de', 'it'];
const I18N_FT_ROWS = [
  // Menu and setup
  // 3.4.7 (hidden behind OWN_ON): your own saved decks
  ['Your decks', 'Tus barajas', 'Seus decks', 'Vos decks', 'Deine Decks', 'I tuoi mazzi'],
  ['Tournament decks', 'Barajas de torneo', 'Decks de torneio', 'Decks de tournoi', 'Turnierdecks', 'Mazzi da torneo'],
  ['Your deck:', 'Tu baraja:', 'Seu deck:', 'Votre deck :', 'Dein Deck:', 'Il tuo mazzo:'],
  [/^This deck has (\d+) cards\. Sparring needs 60\.$/, 'Esta baraja tiene $1 cartas. Sparring necesita 60.', 'Este deck tem $1 cartas. O Sparring precisa de 60.',
    'Ce deck contient $1 cartes. Sparring en demande 60.', 'Dieses Deck hat $1 Karten. Sparring braucht 60.', 'Questo mazzo ha $1 carte. Sparring ne richiede 60.'],
  ['RdyDeck has no card data for these cards yet:', 'RdyDeck todavía no tiene datos de estas cartas:', 'O RdyDeck ainda não tem dados destas cartas:',
    'RdyDeck n\'a pas encore les données de ces cartes :', 'RdyDeck hat noch keine Kartendaten für diese Karten:', 'RdyDeck non ha ancora i dati di queste carte:'],
  ['Open the deck in RdyDeck while online, then come back.', 'Abre la baraja en RdyDeck con conexión y luego vuelve.', 'Abra o deck no RdyDeck com internet e depois volte.',
    'Ouvrez le deck dans RdyDeck avec une connexion, puis revenez.', 'Öffne das Deck in RdyDeck, während du online bist, und komm dann zurück.', 'Apri il mazzo in RdyDeck mentre sei online, poi torna qui.'],
  ['This deck has no Basic Pokémon.', 'Esta baraja no tiene Pokémon Básicos.', 'Este deck não tem Pokémon Básicos.',
    'Ce deck n\'a aucun Pokémon de base.', 'Dieses Deck hat keine Basis-Pokémon.', 'Questo mazzo non ha Pokémon Base.'],
  ['Not every card does all of its text yet:', 'No todas las cartas hacen todo lo que dice su texto todavía:', 'Nem todas as cartas fazem tudo o que o texto diz ainda:',
    'Toutes les cartes ne font pas encore tout ce que dit leur texte :', 'Noch nicht jede Karte macht alles, was ihr Text sagt:', 'Non tutte le carte fanno ancora tutto ciò che dice il loro testo:'],
  ["They still play, and the parts Sparring can't do yet are skipped.", 'Se pueden jugar igual, y Sparring se salta lo que todavía no sabe hacer.', 'Elas podem ser jogadas mesmo assim, e o Sparring pula o que ainda não sabe fazer.',
    'Elles se jouent quand même, et Sparring passe ce qu\'il ne sait pas encore faire.', 'Sie lassen sich trotzdem spielen, und Sparring überspringt, was es noch nicht kann.', 'Si possono giocare lo stesso, e Sparring salta ciò che non sa ancora fare.'],
  ["Sparring can't read this Energy yet, so each one counts as 1 Colorless Energy:", 'Sparring todavía no puede leer esta Energía, así que cada una cuenta como 1 Energía Incolora:',
    'O Sparring ainda não consegue ler esta Energia, então cada uma conta como 1 Energia Incolor:', 'Sparring ne sait pas encore lire cette Énergie, donc chacune compte comme 1 Énergie Incolore :',
    'Sparring kann diese Energie noch nicht lesen, daher zählt jede als 1 Farblos-Energie:', 'Sparring non sa ancora leggere questa Energia, quindi ognuna conta come 1 Energia Incolore:'],
  ['Every card in this deck plays in full.', 'Todas las cartas de esta baraja se juegan completas.', 'Todas as cartas deste deck são jogadas por completo.',
    'Toutes les cartes de ce deck se jouent entièrement.', 'Jede Karte in diesem Deck wird vollständig gespielt.', 'Tutte le carte di questo mazzo si giocano per intero.'],
  [/^You play (\d+) turns against the opponent\. Tournament decks play from their tournament lists, and your decks from the cards RdyDeck saved with them\.$/,
    'Juegas $1 turnos contra el rival. Las barajas de torneo se juegan con sus listas de torneo, y tus barajas con las cartas que RdyDeck guardó con ellas.',
    'Você joga $1 turnos contra o oponente. Os decks de torneio usam as listas de torneio, e os seus decks usam as cartas que o RdyDeck salvou com eles.',
    'Vous jouez $1 tours contre l\'adversaire. Les decks de tournoi se jouent avec leurs listes de tournoi, et vos decks avec les cartes que RdyDeck a enregistrées avec eux.',
    'Du spielst $1 Züge gegen den Gegner. Turnierdecks spielen mit ihren Turnierlisten, deine Decks mit den Karten, die RdyDeck mit ihnen gespeichert hat.',
    'Giochi $1 turni contro l\'avversario. I mazzi da torneo si giocano con le loro liste di torneo, e i tuoi mazzi con le carte che RdyDeck ha salvato con loro.'],
  ['You have no saved decks here yet. Save a deck in RdyDeck to spar with it.', 'Todavía no tienes barajas guardadas aquí. Guarda una baraja en RdyDeck para usarla en Sparring.',
    'Você ainda não tem decks salvos aqui. Salve um deck no RdyDeck para usá-lo no Sparring.', 'Vous n\'avez pas encore de deck enregistré ici. Enregistrez un deck dans RdyDeck pour l\'utiliser dans Sparring.',
    'Du hast hier noch keine gespeicherten Decks. Speichere ein Deck in RdyDeck, um damit Sparring zu spielen.', 'Non hai ancora mazzi salvati qui. Salva un mazzo in RdyDeck per usarlo in Sparring.'],
  ['Easy', 'Fácil', 'Fácil', 'Facile', 'Leicht', 'Facile'],
  ['Contested', 'Reñido', 'Disputado', 'Disputé', 'Umkämpft', 'Combattuto'],
  ['Aggressive', 'Agresivo', 'Agressivo', 'Agressif', 'Aggressiv', 'Aggressivo'],
  ['Easy: only places cards', 'Fácil: solo pone cartas en juego', 'Fácil: só coloca cartas em jogo', 'Facile : pose seulement des cartes', 'Leicht: legt nur Karten aus', 'Facile: mette solo carte in gioco'],
  ['Contested: attacks and messes with you', 'Reñido: ataca y te complica la partida', 'Disputado: ataca e atrapalha você', 'Disputé : attaque et vous met des bâtons dans les roues', 'Umkämpft: greift an und stört dich', 'Combattuto: attacca e ti mette i bastoni tra le ruote'],
  ['Aggressive: plays the best line it finds', 'Agresivo: juega la mejor línea que encuentra', 'Agressivo: joga a melhor linha que encontra', 'Agressif : joue la meilleure ligne qu\'il trouve', 'Aggressiv: spielt den besten Zug, den es findet', 'Aggressivo: gioca la linea migliore che trova'],
  ['Private preview. Not on rdydeck.com.', 'Vista previa privada. No está en rdydeck.com.', 'Prévia privada. Não está no rdydeck.com.', 'Aperçu privé. Pas sur rdydeck.com.', 'Private Vorschau. Nicht auf rdydeck.com.', 'Anteprima privata. Non è su rdydeck.com.'],
  ['Back to RdyDeck', 'Volver a RdyDeck', 'Voltar ao RdyDeck', 'Retour à RdyDeck', 'Zurück zu RdyDeck', 'Torna a RdyDeck'],
  ['Way to play', 'Modo de juego', 'Modo de jogo', 'Mode de jeu', 'Spielmodus', 'Modalità di gioco'],
  ['Full game', 'Partida completa', 'Partida completa', 'Partie complète', 'Ganzes Spiel', 'Partita completa'],
  ['Opponent level', 'Nivel del rival', 'Nível do oponente', 'Niveau de l\'adversaire', 'Stufe des Gegners', 'Livello dell\'avversario'],
  ['Opponent level:', 'Nivel del rival:', 'Nível do oponente:', 'Niveau de l\'adversaire :', 'Stufe des Gegners:', 'Livello dell\'avversario:'],
  ["Opponent's deck", 'Baraja del rival', 'Deck do oponente', 'Deck de l\'adversaire', 'Deck des Gegners', 'Mazzo dell\'avversario'],
  ["Opponent's deck:", 'Baraja del rival:', 'Deck do oponente:', 'Deck de l\'adversaire :', 'Deck des Gegners:', 'Mazzo dell\'avversario:'],
  [/^You play (\d+) turns against the opponent\. Card names and text come from the decks' tournament lists\.$/,
    'Juegas $1 turnos contra el rival. Los nombres y textos de las cartas vienen de las listas de torneo de las barajas.',
    'Você joga $1 turnos contra o oponente. Os nomes e textos das cartas vêm das listas de torneio dos decks.',
    'Vous jouez $1 tours contre l\'adversaire. Les noms et textes des cartes viennent des listes de tournoi des decks.',
    'Du spielst $1 Züge gegen den Gegner. Kartennamen und Kartentexte stammen aus den Turnierlisten der Decks.',
    'Giochi $1 turni contro l\'avversario. Nomi e testi delle carte vengono dalle liste dei tornei dei mazzi.'],
  ['Choose your Active Pokémon', 'Elige tu Pokémon Activo', 'Escolha seu Pokémon Ativo', 'Choisissez votre Pokémon Actif', 'Wähle dein Aktives Pokémon', 'Scegli il tuo Pokémon Attivo'],
  ['Set up', 'Preparación', 'Preparação', 'Mise en place', 'Vorbereitung', 'Preparazione'],
  ['You go first', 'Empiezas tú', 'Você começa', 'Vous commencez', 'Du fängst an', 'Inizi tu'],
  ['You go first.', 'Empiezas tú.', 'Você começa.', 'Vous commencez.', 'Du fängst an.', 'Inizi tu.'],
  ['Your opponent goes first', 'Empieza el rival', 'O oponente começa', 'L\'adversaire commence', 'Der Gegner fängt an', 'Inizia l\'avversario'],
  ['Your opponent goes first.', 'Empieza el rival.', 'O oponente começa.', 'L\'adversaire commence.', 'Der Gegner fängt an.', 'Inizia l\'avversario.'],
  [/^You took 1 mulligan\.$/, 'Hiciste 1 mulligan.', 'Você fez 1 mulligan.', 'Vous avez fait 1 mulligan.', 'Du hattest 1 Mulligan.', 'Hai fatto 1 mulligan.'],
  [/^You took (\d+) mulligans\.$/, 'Hiciste $1 mulligans.', 'Você fez $1 mulligans.', 'Vous avez fait $1 mulligans.', 'Du hattest $1 Mulligans.', 'Hai fatto $1 mulligan.'],
  [/^Your opponent took 1 mulligan, so you draw 1 more card after setup\.$/,
    'El rival hizo 1 mulligan, así que robas 1 carta más después de la preparación.',
    'O oponente fez 1 mulligan, então você compra 1 carta a mais depois da preparação.',
    'L\'adversaire a fait 1 mulligan, donc vous piochez 1 carte de plus après la mise en place.',
    'Der Gegner hatte 1 Mulligan, also ziehst du nach der Vorbereitung 1 Karte mehr.',
    'L\'avversario ha fatto 1 mulligan, quindi peschi 1 carta in più dopo la preparazione.'],
  [/^Your opponent took (\d+) mulligans, so you draw (\d+) more cards after setup\.$/,
    'El rival hizo $1 mulligans, así que robas $2 cartas más después de la preparación.',
    'O oponente fez $1 mulligans, então você compra $2 cartas a mais depois da preparação.',
    'L\'adversaire a fait $1 mulligans, donc vous piochez $2 cartes de plus après la mise en place.',
    'Der Gegner hatte $1 Mulligans, also ziehst du nach der Vorbereitung $2 Karten mehr.',
    'L\'avversario ha fatto $1 mulligan, quindi peschi $2 carte in più dopo la preparazione.'],
  ['Your Bench', 'Tu Banca', 'Seu Banco', 'Votre Banc', 'Deine Bank', 'La tua Panchina'],
  ['Tap a Pokémon to put it on your Bench. Tap it again to take it off.',
    'Toca un Pokémon para ponerlo en tu Banca. Tócalo otra vez para quitarlo.',
    'Toque em um Pokémon para colocá-lo no seu Banco. Toque de novo para tirá-lo.',
    'Touchez un Pokémon pour le placer sur votre Banc. Touchez-le à nouveau pour le retirer.',
    'Tippe auf ein Pokémon, um es auf deine Bank zu legen. Tippe noch einmal, um es wieder wegzunehmen.',
    'Tocca un Pokémon per metterlo in Panchina. Toccalo di nuovo per toglierlo.'],
  ['No other Basic Pokémon in your hand for your Bench.', 'No tienes otros Pokémon Básicos en la mano para tu Banca.', 'Não há outros Pokémon Básicos na sua mão para o seu Banco.', 'Aucun autre Pokémon de base dans votre main pour votre Banc.', 'Keine weiteren Basis-Pokémon auf deiner Hand für deine Bank.', 'Nessun altro Pokémon Base in mano da mettere in Panchina.'],
  ['Start the game', 'Empezar la partida', 'Começar a partida', 'Commencer la partie', 'Spiel starten', 'Inizia la partita'],
  // The board
  [/^(\d+) of (\d+) HP$/, '$1 de $2 PS', '$1 de $2 PS', '$1 PV sur $2', '$1 von $2 KP', '$1 di $2 PS'],
  [/^1 Energy$/, '1 Energía', '1 Energia', '1 Énergie', '1 Energie', '1 Energia'],
  [/^(\d+) Energy$/, '$1 Energías', '$1 Energias', '$1 Énergies', '$1 Energien', '$1 Energie'],
  [/^(\d+) Prizes$/, '$1 Premios', '$1 Prêmios', '$1 Récompenses', '$1 Preiskarten', '$1 Premi'],
  ['Energy:', 'Energía:', 'Energia:', 'Énergie :', 'Energie:', 'Energia:'],
  ['Tool:', 'Herramienta:', 'Ferramenta:', 'Outil :', 'Ausrüstung:', 'Oggetto:'],
  ['Active:', 'Activo:', 'Ativo:', 'Actif :', 'Aktiv:', 'Attivo:'],
  ['Bench:', 'Banca:', 'Banco:', 'Banc :', 'Bank:', 'Panchina:'],
  ['Hand:', 'Mano:', 'Mão:', 'Main :', 'Hand:', 'Mano:'],
  ['Stadium:', 'Estadio:', 'Estádio:', 'Stade :', 'Stadion:', 'Stadio:'],
  ['No Energy', 'Sin Energía', 'Sem Energia', 'Aucune Énergie', 'Keine Energie', 'Nessuna Energia'],
  ['No Stadium', 'Sin Estadio', 'Sem Estádio', 'Aucun Stade', 'Kein Stadion', 'Nessuno Stadio'],
  ['No Active Pokémon', 'Sin Pokémon Activo', 'Sem Pokémon Ativo', 'Aucun Pokémon Actif', 'Kein Aktives Pokémon', 'Nessun Pokémon Attivo'],
  ['Discard pile', 'Pila de descartes', 'Pilha de descarte', 'Pile de défausse', 'Ablagestapel', 'Pila degli scarti'],
  ['In play', 'En juego', 'Em jogo', 'En jeu', 'Im Spiel', 'In gioco'],
  ['Your hand', 'Tu mano', 'Sua mão', 'Votre main', 'Deine Hand', 'La tua mano'],
  ['Click Here for Full Deck', 'Toca aquí para ver toda la baraja', 'Toque aqui para ver o deck inteiro', 'Cliquez ici pour voir tout le deck', 'Hier tippen für das ganze Deck', 'Tocca qui per vedere tutto il mazzo'],
  ['No card in your deck fits this.', 'Ninguna carta de tu baraja sirve para esto.', 'Nenhuma carta do seu deck serve para isso.', 'Aucune carte de votre deck ne convient.', 'Keine Karte in deinem Deck passt dazu.', 'Nessuna carta del tuo mazzo va bene.'],
  ['Hide Full Deck', 'Ocultar la baraja completa', 'Ocultar o deck inteiro', 'Masquer le deck complet', 'Ganzes Deck ausblenden', 'Nascondi il mazzo completo'],
  ['Cards this can take from your deck. Tap one to choose it.', 'Las cartas que puedes tomar de tu baraja. Toca una para elegirla.', 'As cartas que você pode pegar do seu deck. Toque em uma para escolhê-la.', 'Les cartes que vous pouvez prendre dans votre deck. Touchez-en une pour la choisir.', 'Karten, die du aus deinem Deck nehmen kannst. Tippe auf eine, um sie zu wählen.', 'Le carte che puoi prendere dal tuo mazzo. Toccane una per sceglierla.'],
  [/^Your whole deck \((\d+) cards\)\. Cards this can take are bright; tap one to choose it\.$/, 'Toda tu baraja ($1 cartas). Las cartas que puedes tomar están iluminadas; toca una para elegirla.', 'Seu deck inteiro ($1 cartas). As cartas que você pode pegar estão em destaque; toque em uma para escolhê-la.', 'Tout votre deck ($1 cartes). Les cartes que vous pouvez prendre sont mises en avant ; touchez-en une pour la choisir.', 'Dein ganzes Deck ($1 Karten). Karten, die du nehmen kannst, sind hell; tippe auf eine, um sie zu wählen.', 'Tutto il tuo mazzo ($1 carte). Le carte che puoi prendere sono illuminate; toccane una per sceglierla.'],
  ["Sparring can't do all of this card's text yet. It still counts as Energy.", 'Sparring todavía no puede aplicar todo el texto de esta carta. Igual cuenta como Energía.', 'O Sparring ainda não consegue aplicar todo o texto desta carta. Ela continua contando como Energia.', 'Sparring ne sait pas encore appliquer tout le texte de cette carte. Elle compte quand même comme une Énergie.', 'Sparring kann den Text dieser Karte noch nicht ganz umsetzen. Sie zählt trotzdem als Energie.', 'Sparring non sa ancora applicare tutto il testo di questa carta. Conta comunque come Energia.'],
  ['Your discard pile', 'Tu pila de descartes', 'Sua pilha de descarte', 'Votre pile de défausse', 'Dein Ablagestapel', 'La tua pila degli scarti'],
  ['Opponent\'s discard pile', 'Pila de descartes del rival', 'Pilha de descarte do oponente', 'Pile de défausse de l\'adversaire', 'Ablagestapel des Gegners', 'Pila degli scarti dell\'avversario'],
  ['No cards yet.', 'Todavía no hay cartas.', 'Ainda não há cartas.', 'Aucune carte pour l\'instant.', 'Noch keine Karten.', 'Ancora nessuna carta.'],
  ['Newest first. Tap a card to read it.', 'Las más recientes primero. Toca una carta para leerla.', 'As mais recentes primeiro. Toque em uma carta para lê-la.', 'Les plus récentes d\'abord. Touchez une carte pour la lire.', 'Neueste zuerst. Tippe auf eine Karte, um sie zu lesen.', 'Prima le più recenti. Tocca una carta per leggerla.'],
  ['Back', 'Atrás', 'Voltar', 'Retour', 'Zurück', 'Indietro'],
  // 3.4.8: attacks on every Pokémon in play, and the card sheet
  ['Needs 1 more Energy', 'Necesita 1 Energía más', 'Precisa de mais 1 Energia', 'Il manque 1 Énergie', 'Braucht 1 weitere Energie', 'Serve 1 Energia in più'],
  [/^Needs (\d+) more Energy$/, 'Necesita $1 Energías más', 'Precisa de mais $1 Energias', 'Il manque $1 Énergies', 'Braucht $1 weitere Energien', 'Servono $1 Energie in più'],
  ['Needs other Energy', 'Necesita otra Energía', 'Precisa de outra Energia', 'Il faut une autre Énergie', 'Braucht andere Energie', 'Serve un\'altra Energia'],
  ['Does nothing in Sparring yet', 'Aún no hace nada en Sparring', 'Ainda não faz nada no Sparring', 'Ne fait encore rien dans Sparring', 'Bewirkt in Sparring noch nichts', 'Non fa ancora nulla in Sparring'],
  ["Sparring can't do this card's text yet. You can still play it, and nothing happens.",
    'Sparring todavía no puede hacer el texto de esta carta. Puedes jugarla igual, pero no pasa nada.',
    'O Sparring ainda não consegue fazer o texto desta carta. Você pode jogá-la mesmo assim, mas nada acontece.',
    'Sparring ne sait pas encore appliquer le texte de cette carte. Vous pouvez quand même la jouer, mais il ne se passe rien.',
    'Sparring kann den Text dieser Karte noch nicht ausführen. Du kannst sie trotzdem spielen, aber es passiert nichts.',
    'Sparring non sa ancora applicare il testo di questa carta. Puoi giocarla lo stesso, ma non succede nulla.'],
  [/^Sparring can't do (.+?)'s text yet, so nothing happened$/, 'Sparring todavía no puede hacer el texto de $1, así que no pasó nada', 'O Sparring ainda não consegue fazer o texto de $1, então nada aconteceu', 'Sparring ne sait pas encore appliquer le texte de $1, donc rien ne s\'est passé', 'Sparring kann den Text von $1 noch nicht ausführen, daher ist nichts passiert', 'Sparring non sa ancora applicare il testo di $1, quindi non è successo nulla'],
  [/^Choose a card from your deck to discard \((\d+) of (\d+)\)$/, 'Elige una carta de tu baraja para descartar ($1 de $2)', 'Escolha uma carta do seu deck para descartar ($1 de $2)', 'Choisissez une carte de votre deck à défausser ($1 sur $2)', 'Wähle eine Karte aus deinem Deck zum Ablegen ($1 von $2)', 'Scegli una carta dal tuo mazzo da scartare ($1 di $2)'],
  ['Poisoned', 'Envenenado', 'Envenenado', 'Empoisonné', 'Vergiftet', 'Avvelenato'],
  ['Burned', 'Quemado', 'Queimado', 'Brûlé', 'Verbrannt', 'Bruciato'],
  ['Asleep', 'Dormido', 'Adormecido', 'Endormi', 'Schläft', 'Addormentato'],
  ['Paralyzed', 'Paralizado', 'Paralisado', 'Paralysé', 'Paralysiert', 'Paralizzato'],
  ['Confused', 'Confundido', 'Confuso', 'Confus', 'Verwirrt', 'Confuso'],
  [/^Your turn (\d+) of (\d+)$/, 'Tu turno $1 de $2', 'Seu turno $1 de $2', 'Votre tour $1 sur $2', 'Dein Zug $1 von $2', 'Il tuo turno $1 di $2'],
  [/^Turn (\d+)$/, 'Turno $1', 'Turno $1', 'Tour $1', 'Zug $1', 'Turno $1'],
  ['Game log', 'Registro de la partida', 'Registro da partida', 'Journal de la partie', 'Spielprotokoll', 'Registro della partita'],
  ['Opponent is playing…', 'El rival está jugando…', 'O oponente está jogando…', 'L\'adversaire joue…', 'Der Gegner ist am Zug…', 'L\'avversario sta giocando…'],
  ["Opponent's turn", 'Turno del rival', 'Turno do oponente', 'Tour de l\'adversaire', 'Zug des Gegners', 'Turno dell\'avversario'],
  ['It passed.', 'Pasó sin hacer nada.', 'Passou sem fazer nada.', 'Il n\'a rien fait.', 'Er hat nichts gemacht.', 'Non ha fatto nulla.'],
  ['Your turn', 'Tu turno', 'Seu turno', 'Votre tour', 'Dein Zug', 'Il tuo turno'],
  // Questions and choices
  ['Do it?', '¿Hacerlo?', 'Fazer isso?', 'Le faire ?', 'Ausführen?', 'Farlo?'],
  ['Choose', 'Elige', 'Escolha', 'Choisissez', 'Wähle', 'Scegli'],
  ['Choose one', 'Elige una opción', 'Escolha uma opção', 'Choisissez une option', 'Wähle eine Option', 'Scegli un\'opzione'],
  ['Choose which of their Benched Pokémon comes up', 'Elige cuál de sus Pokémon en Banca pasa al Puesto Activo', 'Escolha qual dos Pokémon no Banco dele vai para o Campo Ativo', 'Choisissez lequel de ses Pokémon de Banc devient Actif', 'Wähle, welches Pokémon auf seiner Bank aktiv wird', 'Scegli quale dei suoi Pokémon in Panchina diventa Attivo'],
  ['Choose cards from your deck', 'Elige cartas de tu baraja', 'Escolha cartas do seu deck', 'Choisissez des cartes de votre deck', 'Wähle Karten aus deinem Deck', 'Scegli carte dal tuo mazzo'],
  ['Choose cards from your discard pile', 'Elige cartas de tu pila de descartes', 'Escolha cartas da sua pilha de descarte', 'Choisissez des cartes de votre pile de défausse', 'Wähle Karten aus deinem Ablagestapel', 'Scegli carte dalla tua pila degli scarti'],
  ['Choose from the cards you looked at', 'Elige entre las cartas que miraste', 'Escolha entre as cartas que você olhou', 'Choisissez parmi les cartes que vous avez regardées', 'Wähle aus den Karten, die du angesehen hast', 'Scegli tra le carte che hai guardato'],
  ['Choose cards to discard', 'Elige cartas para descartar', 'Escolha cartas para descartar', 'Choisissez des cartes à défausser', 'Wähle Karten zum Ablegen', 'Scegli le carte da scartare'],
  ['Choose a card to put on top of your deck', 'Elige una carta para ponerla encima de tu baraja', 'Escolha uma carta para colocar no topo do seu deck', 'Choisissez une carte à placer sur le dessus de votre deck', 'Wähle eine Karte, die du oben auf dein Deck legst', 'Scegli una carta da mettere in cima al tuo mazzo'],
  ['Choose the card that goes into your hand. The other one gets attached.', 'Elige la carta que va a tu mano. La otra se une.', 'Escolha a carta que vai para a sua mão. A outra é ligada.', 'Choisissez la carte qui va dans votre main. L\'autre est attachée.', 'Wähle die Karte, die auf deine Hand kommt. Die andere wird angelegt.', 'Scegli la carta che va nella tua mano. L\'altra viene assegnata.'],
  ['Choose the Pokémon to attach the other card to', 'Elige el Pokémon al que unir la otra carta', 'Escolha o Pokémon em que ligar a outra carta', 'Choisissez le Pokémon auquel attacher l\'autre carte', 'Wähle das Pokémon, an das die andere Karte angelegt wird', 'Scegli il Pokémon a cui assegnare l\'altra carta'],
  [/^(?!Put )(.+?) into your hand$/, '$1 a tu mano', '$1 para a sua mão', '$1 dans votre main', '$1 auf deine Hand', '$1 nella tua mano'],
  ['Discard none', 'No descartar ninguna', 'Não descartar nenhuma', 'Ne rien défausser', 'Nichts ablegen', 'Non scartare nulla'],
  ['Discard nothing', 'No descartar nada', 'Não descartar nada', 'Ne rien défausser', 'Nichts ablegen', 'Non scartare nulla'],
  ['Discard the Stadium', 'Descartar el Estadio', 'Descartar o Estádio', 'Défausser le Stade', 'Das Stadion ablegen', 'Scartare lo Stadio'],
  [/^Discard 1 Energy$/, 'Descartar 1 Energía', 'Descartar 1 Energia', 'Défausser 1 Énergie', '1 Energie ablegen', 'Scartare 1 Energia'],
  [/^Discard (\d+) Energy$/, 'Descartar $1 Energías', 'Descartar $1 Energias', 'Défausser $1 Énergies', '$1 Energien ablegen', 'Scartare $1 Energie'],
  [/^The Tool on (.+)$/, 'La Herramienta {de:$1}', 'A Ferramenta {de:$1}', 'L\'Outil {de:$1}', 'Die Ausrüstung {von:$1}', 'L\'Oggetto {di:$1}'],
  [/^1 damage counter on (.+)$/, '1 contador de daño {en:$1}', '1 contador de dano {em:$1}', '1 marqueur de dégâts {sur:$1}', '1 Schadensmarke {auf:$1}', '1 segnalino danno {su:$1}'],
  [/^(\d+) damage counters on (.+)$/, '$1 contadores de daño {en:$2}', '$1 contadores de dano {em:$2}', '$1 marqueurs de dégâts {sur:$2}', '$1 Schadensmarken {auf:$2}', '$1 segnalini danno {su:$2}'],
  [/^Take (?!nothing$)(.+)$/, 'Tomar $1', 'Pegar $1', 'Prendre $1', '$1 nehmen', 'Prendere $1'],
  [/^Discard (?!nothing$|none$|the Stadium$|\d+ Energy$)(.+)$/, 'Descartar $1', 'Descartar $1', 'Défausser $1', '$1 ablegen', 'Scartare $1'],
  ["That mix isn't allowed. Tap a card again to drop it.", 'Esa combinación no está permitida. Toca una carta otra vez para quitarla.', 'Essa combinação não é permitida. Toque em uma carta de novo para tirá-la.', 'Cette combinaison n\'est pas permise. Touchez à nouveau une carte pour la retirer.', 'Diese Kombination ist nicht erlaubt. Tippe eine Karte noch einmal an, um sie abzuwählen.', 'Questa combinazione non è consentita. Tocca di nuovo una carta per toglierla.'],
  // The end
  [/^Five turns done\. You took 1 Prize card; your opponent took (\d+)\.$/,
    'Cinco turnos terminados. Tomaste 1 carta de Premio; el rival tomó $1.',
    'Cinco turnos concluídos. Você pegou 1 carta de Prêmio; o oponente pegou $1.',
    'Cinq tours joués. Vous avez pris 1 carte Récompense ; l\'adversaire en a pris $1.',
    'Fünf Züge vorbei. Du hast 1 Preiskarte genommen, der Gegner $1.',
    'Cinque turni finiti. Hai preso 1 carta Premio; l\'avversario ne ha prese $1.'],
  [/^Five turns done\. You took (\d+) Prize cards; your opponent took (\d+)\.$/,
    'Cinco turnos terminados. Tomaste $1 cartas de Premio; el rival tomó $2.',
    'Cinco turnos concluídos. Você pegou $1 cartas de Prêmio; o oponente pegou $2.',
    'Cinq tours joués. Vous avez pris $1 cartes Récompense ; l\'adversaire en a pris $2.',
    'Fünf Züge vorbei. Du hast $1 Preiskarten genommen, der Gegner $2.',
    'Cinque turni finiti. Hai preso $1 carte Premio; l\'avversario ne ha prese $2.'],
  ['You win.', 'Ganaste.', 'Você venceu.', 'Vous avez gagné.', 'Du hast gewonnen.', 'Hai vinto.'],
  ['You win', 'Ganaste', 'Você venceu', 'Vous avez gagné', 'Du hast gewonnen', 'Hai vinto'],
  ['Your opponent wins.', 'Ganó el rival.', 'O oponente venceu.', 'L\'adversaire a gagné.', 'Der Gegner hat gewonnen.', 'Ha vinto l\'avversario.'],
  ['Your opponent wins', 'Ganó el rival', 'O oponente venceu', 'L\'adversaire a gagné', 'Der Gegner hat gewonnen', 'Ha vinto l\'avversario'],
  ['Game over.', 'Fin de la partida.', 'Fim da partida.', 'Partie terminée.', 'Spiel vorbei.', 'Partita finita.'],
  ['Both players won at once: that goes to Sudden Death', 'Los dos jugadores ganaron a la vez: se va a Muerte Súbita', 'Os dois jogadores venceram ao mesmo tempo: vai para Morte Súbita', 'Les deux joueurs ont gagné en même temps : place à la Mort subite', 'Beide Spieler haben gleichzeitig gewonnen: es geht in den Sudden Death', 'Entrambi i giocatori hanno vinto insieme: si va alla Morte improvvisa'],
  ['Change decks', 'Cambiar de baraja', 'Trocar de deck', 'Changer de deck', 'Decks wechseln', 'Cambia mazzi'],
  // Why something can't be done right now
  ['Already used this turn.', 'Ya se usó este turno.', 'Já foi usado neste turno.', 'Déjà utilisé ce tour-ci.', 'In diesem Zug schon eingesetzt.', 'Già usato in questo turno.'],
  ['Always on.', 'Siempre activo.', 'Sempre ativo.', 'Toujours actif.', 'Wirkt immer.', 'Sempre attivo.'],
  ['It already has a Tool.', 'Ya tiene una Herramienta.', 'Já tem uma Ferramenta.', 'Il a déjà un Outil.', 'Es hat schon eine Ausrüstung.', 'Ha già un Oggetto.'],
  ['It cannot evolve this turn.', 'No puede evolucionar este turno.', 'Não pode evoluir neste turno.', 'Il ne peut pas évoluer ce tour-ci.', 'Es kann sich in diesem Zug nicht entwickeln.', 'Non può evolversi in questo turno.'],
  ['It has to be the last card in your hand.', 'Tiene que ser la última carta de tu mano.', 'Tem que ser a última carta da sua mão.', 'Ce doit être la dernière carte de votre main.', 'Es muss die letzte Karte auf deiner Hand sein.', 'Deve essere l\'ultima carta nella tua mano.'],
  ['It was used last turn.', 'Se usó el turno pasado.', 'Foi usado no turno passado.', 'Il a été utilisé au tour précédent.', 'Es wurde im letzten Zug eingesetzt.', 'È stato usato nel turno scorso.'],
  ['Needs Energy on your Active Pokémon.', 'Necesita Energía en tu Pokémon Activo.', 'Precisa de Energia no seu Pokémon Ativo.', 'Il faut de l\'Énergie sur votre Pokémon Actif.', 'Braucht Energie an deinem Aktiven Pokémon.', 'Serve Energia sul tuo Pokémon Attivo.'],
  ['Needs a Benched Pokémon to switch in.', 'Necesita un Pokémon en Banca para cambiar.', 'Precisa de um Pokémon no Banco para trocar.', 'Il faut un Pokémon de Banc à faire entrer.', 'Braucht ein Pokémon auf der Bank zum Austauschen.', 'Serve un Pokémon in Panchina da far entrare.'],
  ['Needs a Benched Pokémon.', 'Necesita un Pokémon en Banca.', 'Precisa de um Pokémon no Banco.', 'Il faut un Pokémon de Banc.', 'Braucht ein Pokémon auf der Bank.', 'Serve un Pokémon in Panchina.'],
  ['Needs a Mega Evolution Pokémon ex in play.', 'Necesita un Pokémon Megaevolución ex en juego.', 'Precisa de um Pokémon Megaevolução ex em jogo.', 'Il faut un Pokémon-ex Méga-Évolution en jeu.', 'Braucht ein Mega-Entwicklungs-Pokémon-ex im Spiel.', 'Serve un Pokémon-ex Megaevoluzione in gioco.'],
  ['Needs a Stadium in play.', 'Necesita un Estadio en juego.', 'Precisa de um Estádio em jogo.', 'Il faut un Stade en jeu.', 'Braucht ein Stadion im Spiel.', 'Serve uno Stadio in gioco.'],
  ['Needs a Tera Pokémon in play.', 'Necesita un Pokémon Teracristal en juego.', 'Precisa de um Pokémon Terastal em jogo.', 'Il faut un Pokémon Téracristal en jeu.', 'Braucht ein Terakristall-Pokémon im Spiel.', 'Serve un Pokémon Teracristal in gioco.'],
  ['Needs a card in hand to discard.', 'Necesita una carta en la mano para descartar.', 'Precisa de uma carta na mão para descartar.', 'Il faut une carte en main à défausser.', 'Braucht eine Karte auf der Hand zum Ablegen.', 'Serve una carta in mano da scartare.'],
  ['Needs cards in hand to discard.', 'Necesita cartas en la mano para descartar.', 'Precisa de cartas na mão para descartar.', 'Il faut des cartes en main à défausser.', 'Braucht Karten auf der Hand zum Ablegen.', 'Servono carte in mano da scartare.'],
  ['Needs you behind on Prizes.', 'Necesita que vayas por detrás en Premios.', 'Precisa que você esteja atrás nos Prêmios.', 'Il faut que vous soyez en retard aux Récompenses.', 'Du musst bei den Preiskarten hinten liegen.', 'Devi essere indietro con i Premi.'],
  ['No Supporter on the first turn of the game.', 'No se puede jugar un Partidario en el primer turno de la partida.', 'Não pode jogar Apoiador no primeiro turno da partida.', 'Pas de Supporter au premier tour de la partie.', 'Kein Unterstützer im ersten Zug des Spiels.', 'Niente Aiuto nel primo turno della partita.'],
  ['No attacking on the first turn of the game.', 'No se puede atacar en el primer turno de la partida.', 'Não pode atacar no primeiro turno da partida.', 'Pas d\'attaque au premier tour de la partie.', 'Kein Angriff im ersten Zug des Spiels.', 'Niente attacchi nel primo turno della partita.'],
  ['None of your Pokémon were Knocked Out last turn.', 'Ninguno de tus Pokémon quedó Fuera de Combate el turno pasado.', 'Nenhum dos seus Pokémon foi Nocauteado no turno passado.', 'Aucun de vos Pokémon n\'a été mis K.O. au tour précédent.', 'Keines deiner Pokémon wurde im letzten Zug kampfunfähig.', 'Nessuno dei tuoi Pokémon è stato messo KO nel turno scorso.'],
  [/^None of your (.+)'s Pokémon were Knocked Out last turn\.$/, 'Ninguno de tus Pokémon de $1 quedó Fuera de Combate el turno pasado.', 'Nenhum dos seus Pokémon de $1 foi Nocauteado no turno passado.', 'Aucun de vos Pokémon de $1 n\'a été mis K.O. au tour précédent.', 'Keines deiner Pokémon von $1 wurde im letzten Zug kampfunfähig.', 'Nessuno dei tuoi Pokémon di $1 è stato messo KO nel turno scorso.'],
  ['Not during your first turn.', 'No durante tu primer turno.', 'Não durante o seu primeiro turno.', 'Pas pendant votre premier tour.', 'Nicht in deinem ersten Zug.', 'Non durante il tuo primo turno.'],
  ['Not enough Energy to retreat.', 'No hay Energía suficiente para retirarse.', 'Não há Energia suficiente para recuar.', 'Pas assez d\'Énergie pour battre en retraite.', 'Nicht genug Energie für den Rückzug.', 'Energia insufficiente per la ritirata.'],
  ['Not enough Energy.', 'No hay Energía suficiente.', 'Não há Energia suficiente.', 'Pas assez d\'Énergie.', 'Nicht genug Energie.', 'Energia insufficiente.'],
  ['Only 1 of those a turn.', 'Solo 1 de esas por turno.', 'Só 1 dessas por turno.', 'Seulement 1 de ce type par tour.', 'Nur 1 davon pro Zug.', 'Solo 1 di queste per turno.'],
  ['One Stadium a turn.', 'Un Estadio por turno.', 'Um Estádio por turno.', 'Un Stade par tour.', 'Ein Stadion pro Zug.', 'Uno Stadio per turno.'],
  ['Only during your first turn.', 'Solo durante tu primer turno.', 'Só durante o seu primeiro turno.', 'Seulement pendant votre premier tour.', 'Nur in deinem ersten Zug.', 'Solo durante il tuo primo turno.'],
  ['Only right after you evolve into it from your hand.', 'Solo justo después de evolucionar a él desde tu mano.', 'Só logo depois de evoluir para ele da sua mão.', 'Seulement juste après l\'avoir fait évoluer depuis votre main.', 'Nur direkt nachdem du es aus deiner Hand entwickelt hast.', 'Solo subito dopo averlo fatto evolvere dalla tua mano.'],
  ['Only right after you play it from your hand onto your Bench.', 'Solo justo después de jugarlo desde tu mano a tu Banca.', 'Só logo depois de jogá-lo da sua mão no seu Banco.', 'Seulement juste après l\'avoir posé de votre main sur votre Banc.', 'Nur direkt nachdem du es aus deiner Hand auf deine Bank gelegt hast.', 'Solo subito dopo averlo messo dalla tua mano in Panchina.'],
  ['Only while it is in the Active Spot.', 'Solo mientras está en el Puesto Activo.', 'Só enquanto estiver no Campo Ativo.', 'Seulement tant qu\'il est au Poste Actif.', 'Nur solange es in der Aktiven Position ist.', 'Solo mentre è in Posizione Attiva.'],
  ['Only while it is on your Bench.', 'Solo mientras está en tu Banca.', 'Só enquanto estiver no seu Banco.', 'Seulement tant qu\'il est sur votre Banc.', 'Nur solange es auf deiner Bank ist.', 'Solo mentre è nella tua Panchina.'],
  ['Retreat Cost unknown.', 'Coste de Retirada desconocido.', 'Custo de Recuo desconhecido.', 'Coût de Retraite inconnu.', 'Rückzugskosten unbekannt.', 'Costo di ritirata sconosciuto.'],
  ['That Stadium is already in play.', 'Ese Estadio ya está en juego.', 'Esse Estádio já está em jogo.', 'Ce Stade est déjà en jeu.', 'Dieses Stadion ist schon im Spiel.', 'Quello Stadio è già in gioco.'],
  ['The engine cannot read its condition.', 'No se puede leer su condición.', 'Não dá para ler a condição.', 'Sa condition ne peut pas être lue.', 'Die Bedingung kann nicht gelesen werden.', 'La sua condizione non si può leggere.'],
  ['You already attached an Energy this turn.', 'Ya uniste una Energía este turno.', 'Você já ligou uma Energia neste turno.', 'Vous avez déjà attaché une Énergie ce tour-ci.', 'Du hast in diesem Zug schon eine Energie angelegt.', 'Hai già assegnato un\'Energia in questo turno.'],
  ['You already played a Supporter this turn.', 'Ya jugaste un Partidario este turno.', 'Você já jogou um Apoiador neste turno.', 'Vous avez déjà joué un Supporter ce tour-ci.', 'Du hast in diesem Zug schon einen Unterstützer gespielt.', 'Hai già giocato un Aiuto in questo turno.'],
  ['You already retreated this turn.', 'Ya te retiraste este turno.', 'Você já recuou neste turno.', 'Vous avez déjà battu en retraite ce tour-ci.', 'Du hast dich in diesem Zug schon zurückgezogen.', 'Ti sei già ritirato in questo turno.'],
  ['Your Bench is full.', 'Tu Banca está llena.', 'Seu Banco está cheio.', 'Votre Banc est plein.', 'Deine Bank ist voll.', 'La tua Panchina è piena.'],
  ['Your deck is empty.', 'Tu baraja está vacía.', 'Seu deck está vazio.', 'Votre deck est vide.', 'Dein Deck ist leer.', 'Il tuo mazzo è vuoto.'],
  ["Your opponent has no Benched Pokémon.", 'El rival no tiene Pokémon en Banca.', 'O oponente não tem Pokémon no Banco.', 'L\'adversaire n\'a aucun Pokémon sur son Banc.', 'Der Gegner hat keine Pokémon auf der Bank.', 'L\'avversario non ha Pokémon in Panchina.'],
  [/^Your opponent's (.+) stops ACE SPEC cards\.$/, 'El $1 del rival bloquea las cartas AS TÁCTICO.', 'O $1 do oponente bloqueia as cartas ÁS TÁTICO.', 'Le $1 adverse bloque les cartes HIGH-TECH.', 'Das gegnerische $1 sperrt ASS-KLASSE-Karten.', 'Il $1 avversario blocca le carte ASSO TATTICO.'],
  [/^(.+)['’]s Damp stops this Ability\.$/, 'Damp de $1 bloquea esta Habilidad.', 'Damp de $1 bloqueia esta Habilidade.', 'Damp de $1 bloque ce Talent.', 'Damp von $1 blockiert diese Fähigkeit.', 'Damp di $1 blocca questa Abilità.'],
  [/^Only 1 (.+) a turn\.$/, 'Solo 1 $1 por turno.', 'Só 1 $1 por turno.', 'Seulement 1 $1 par tour.', 'Nur 1 $1 pro Zug.', 'Solo 1 $1 per turno.'],
  [/^Needs (\d+) or more Benched Pokémon\.$/, 'Necesita $1 o más Pokémon en Banca.', 'Precisa de $1 ou mais Pokémon no Banco.', 'Il faut $1 Pokémon de Banc ou plus.', 'Braucht $1 oder mehr Pokémon auf der Bank.', 'Servono $1 o più Pokémon in Panchina.'],
  [/^Needs (\d+) or fewer other cards in your hand\.$/, 'Necesita $1 o menos cartas más en tu mano.', 'Precisa de $1 ou menos outras cartas na sua mão.', 'Il faut $1 autres cartes ou moins dans votre main.', 'Höchstens $1 andere Karten auf deiner Hand.', 'Servono $1 o meno altre carte nella tua mano.'],
  [/^Needs (\d+) or more other cards in your hand\.$/, 'Necesita $1 o más cartas más en tu mano.', 'Precisa de $1 ou mais outras cartas na sua mão.', 'Il faut $1 autres cartes ou plus dans votre main.', 'Braucht $1 oder mehr andere Karten auf deiner Hand.', 'Servono $1 o più altre carte nella tua mano.'],
  [/^Needs (\d+) or more cards in your hand\.$/, 'Necesita $1 o más cartas en tu mano.', 'Precisa de $1 ou mais cartas na sua mão.', 'Il faut $1 cartes ou plus dans votre main.', 'Braucht $1 oder mehr Karten auf deiner Hand.', 'Servono $1 o più carte nella tua mano.'],
  [/^Needs (\d+) or more Energy on your Active Pokémon\.$/, 'Necesita $1 o más Energías en tu Pokémon Activo.', 'Precisa de $1 ou mais Energias no seu Pokémon Ativo.', 'Il faut $1 Énergies ou plus sur votre Pokémon Actif.', 'Braucht $1 oder mehr Energie an deinem Aktiven Pokémon.', 'Servono $1 o più Energie sul tuo Pokémon Attivo.'],
  [/^Needs (\d+) or more Energy on your Active Pokémon, which has (\d+)\.$/, 'Necesita $1 o más Energías en tu Pokémon Activo, y tiene $2.', 'Precisa de $1 ou mais Energias no seu Pokémon Ativo, e ele tem $2.', 'Il faut $1 Énergies ou plus sur votre Pokémon Actif, et il en a $2.', 'Braucht $1 oder mehr Energie an deinem Aktiven Pokémon, und es hat $2.', 'Servono $1 o più Energie sul tuo Pokémon Attivo, e ne ha $2.'],
  [/^Needs (\d+) or more cards in your discard pile, and you have (\d+)\.$/, 'Necesita $1 o más cartas en tu pila de descartes, y tienes $2.', 'Precisa de $1 ou mais cartas na sua pilha de descarte, e você tem $2.', 'Il faut $1 cartes ou plus dans votre pile de défausse, et vous en avez $2.', 'Braucht $1 oder mehr Karten in deinem Ablagestapel, und du hast $2.', 'Servono $1 o più carte nella tua pila degli scarti, e ne hai $2.'],
  [/^Needs a Pokémon with (\d+) or more Energy\.$/, 'Necesita un Pokémon con $1 o más Energías.', 'Precisa de um Pokémon com $1 ou mais Energias.', 'Il faut un Pokémon avec $1 Énergies ou plus.', 'Braucht ein Pokémon mit $1 oder mehr Energie.', 'Serve un Pokémon con $1 o più Energie.'],
  [/^Needs a Benched Pokémon with (\d+) or more Energy\.$/, 'Necesita un Pokémon en Banca con $1 o más Energías.', 'Precisa de um Pokémon no Banco com $1 ou mais Energias.', 'Il faut un Pokémon de Banc avec $1 Énergies ou plus.', 'Braucht ein Pokémon auf der Bank mit $1 oder mehr Energie.', 'Serve un Pokémon in Panchina con $1 o più Energie.'],
  [/^Needs your opponent at 1 Prize card( or fewer)?\.$/, 'Necesita que al rival le quede 1 carta de Premio.', 'Precisa que o oponente esteja com 1 carta de Prêmio.', 'Il faut que l\'adversaire ait 1 carte Récompense.', 'Der Gegner darf nur noch 1 Preiskarte haben.', 'L\'avversario deve avere 1 carta Premio.'],
  [/^Needs your opponent at (\d+) Prize cards or fewer\.$/, 'Necesita que al rival le queden $1 cartas de Premio o menos.', 'Precisa que o oponente esteja com $1 cartas de Prêmio ou menos.', 'Il faut que l\'adversaire ait $1 cartes Récompense ou moins.', 'Der Gegner darf höchstens $1 Preiskarten haben.', 'L\'avversario deve avere $1 o meno carte Premio.'],
  [/^Needs your opponent at (\d+) Prize cards\.$/, 'Necesita que al rival le queden $1 cartas de Premio.', 'Precisa que o oponente esteja com $1 cartas de Prêmio.', 'Il faut que l\'adversaire ait $1 cartes Récompense.', 'Der Gegner muss genau $1 Preiskarten haben.', 'L\'avversario deve avere $1 carte Premio.'],
  [/^Needs you at 1 Prize card( or fewer)?\.$/, 'Necesita que te quede 1 carta de Premio.', 'Precisa que você esteja com 1 carta de Prêmio.', 'Il faut que vous ayez 1 carte Récompense.', 'Du darfst nur noch 1 Preiskarte haben.', 'Devi avere 1 carta Premio.'],
  [/^Needs you at (\d+) Prize cards or fewer\.$/, 'Necesita que te queden $1 cartas de Premio o menos.', 'Precisa que você esteja com $1 cartas de Prêmio ou menos.', 'Il faut que vous ayez $1 cartes Récompense ou moins.', 'Du darfst höchstens $1 Preiskarten haben.', 'Devi avere $1 o meno carte Premio.'],
  [/^Needs you at (\d+) Prize cards\.$/, 'Necesita que te queden $1 cartas de Premio.', 'Precisa que você esteja com $1 cartas de Prêmio.', 'Il faut que vous ayez $1 cartes Récompense.', 'Du musst genau $1 Preiskarten haben.', 'Devi avere $1 carte Premio.'],
  [/^Needs (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy) Energy attached\.$/, t => ['Necesita Energía $T unida.', 'Precisa de Energia $T ligada.', 'Il faut une Énergie $T attachée.', 'Braucht angelegte $T-Energie.', 'Serve Energia $T assegnata.']],
  // The game log
  // 3.4.12 log lines (before the general "Discarded ..." and "You drew ..." rows, so these match first)
  [/^You took (.+) as a Prize card$/, 'Tomaste como carta de Premio: $1', 'Você pegou como carta de Prêmio: $1', 'Vous avez pris comme carte Récompense : $1', 'Als Preiskarte genommen: $1', 'Hai preso come carta Premio: $1'],
  [/^You took (.+) as Prize cards$/, 'Tomaste como cartas de Premio: $1', 'Você pegou como cartas de Prêmio: $1', 'Vous avez pris comme cartes Récompense : $1', 'Als Preiskarten genommen: $1', 'Hai preso come carte Premio: $1'],
  [/^(.+?) on (.+?) was discarded at the end of the turn$/, '$1 en $2 se descartó al final del turno', '$1 em $2 foi descartada no fim do turno', '$1 sur $2 a été défaussée à la fin du tour', '$1 an $2 wurde am Ende des Zuges abgelegt', '$1 su $2 è stata scartata alla fine del turno'],
  [/^Discarded (.+?) from your hand to use (.+)$/, 'Descartó $1 de tu mano para usar $2', 'Descartou $1 da sua mão para usar $2', 'A défaussé $1 de votre main pour utiliser $2', '$1 aus deiner Hand abgelegt, um $2 einzusetzen', 'Ha scartato $1 dalla tua mano per usare $2'],
  [/^Discarded (.+?) from their hand to use (.+)$/, 'Descartó $1 de la mano del rival para usar $2', 'Descartou $1 da mão do oponente para usar $2', 'A défaussé $1 de la main adverse pour utiliser $2', '$1 aus der Hand des Gegners abgelegt, um $2 einzusetzen', 'Ha scartato $1 dalla mano dell\'avversario per usare $2'],
  [/^You discarded (.+?) from your hand$/, 'Descartaste $1 de tu mano', 'Você descartou $1 da sua mão', 'Vous avez défaussé $1 de votre main', 'Du hast $1 aus deiner Hand abgelegt', 'Hai scartato $1 dalla tua mano'],
  [/^Your opponent discarded (.+?) from their hand$/, 'El rival descartó $1 de su mano', 'O oponente descartou $1 da mão dele', 'L\'adversaire a défaussé $1 de sa main', 'Der Gegner hat $1 aus seiner Hand abgelegt', 'L\'avversario ha scartato $1 dalla sua mano'],
  [/^Discarded (.+?) from their hand$/, 'Descartó $1 de la mano del rival', 'Descartou $1 da mão do oponente', 'A défaussé $1 de la main adverse', '$1 aus der Hand des Gegners abgelegt', 'Ha scartato $1 dalla mano dell\'avversario'],
  ['Shuffled 1 card from your hand into your deck', 'Barajó 1 carta de tu mano en tu baraja', 'Embaralhou 1 carta da sua mão no seu deck', 'A mélangé 1 carte de votre main avec votre deck', '1 Karte aus deiner Hand in dein Deck gemischt', 'Ha rimescolato 1 carta dalla tua mano nel tuo mazzo'],
  [/^Shuffled (\d+) cards from your hand into your deck$/, 'Barajó $1 cartas de tu mano en tu baraja', 'Embaralhou $1 cartas da sua mão no seu deck', 'A mélangé $1 cartes de votre main avec votre deck', '$1 Karten aus deiner Hand in dein Deck gemischt', 'Ha rimescolato $1 carte dalla tua mano nel tuo mazzo'],
  ['Shuffled 1 card from their hand into their deck', 'Barajó 1 carta de la mano del rival en su baraja', 'Embaralhou 1 carta da mão do oponente no deck dele', 'A mélangé 1 carte de la main adverse avec son deck', '1 Karte aus der Hand des Gegners in sein Deck gemischt', 'Ha rimescolato 1 carta dalla mano dell\'avversario nel suo mazzo'],
  [/^Shuffled (\d+) cards from their hand into their deck$/, 'Barajó $1 cartas de la mano del rival en su baraja', 'Embaralhou $1 cartas da mão do oponente no deck dele', 'A mélangé $1 cartes de la main adverse avec son deck', '$1 Karten aus der Hand des Gegners in sein Deck gemischt', 'Ha rimescolato $1 carte dalla mano dell\'avversario nel suo mazzo'],
  [/^(.+?) and all attached cards were shuffled into your deck$/, '$1 y todas las cartas unidas se barajaron en tu baraja', '$1 e todas as cartas ligadas foram embaralhados no seu deck', '$1 et toutes les cartes attachées ont été mélangés dans votre deck', '$1 und alle angelegten Karten wurden in dein Deck gemischt', '$1 e tutte le carte assegnate sono stati rimescolati nel tuo mazzo'],
  [/^(.+?) and all attached cards were shuffled into their deck$/, '$1 y todas las cartas unidas se barajaron en la baraja del rival', '$1 e todas as cartas ligadas foram embaralhados no deck do oponente', '$1 et toutes les cartes attachées ont été mélangés dans le deck adverse', '$1 und alle angelegten Karten wurden in das Deck des Gegners gemischt', '$1 e tutte le carte assegnate sono stati rimescolati nel mazzo dell\'avversario'],
  [/^Put (.+?) into your hand and (.+?) on the bottom of your deck$/, 'Pusiste $1 en tu mano y $2 debajo de tu baraja', 'Você colocou $1 na sua mão e $2 embaixo do seu deck', 'Vous avez mis $1 dans votre main et $2 sous votre deck', '$1 auf deine Hand genommen und $2 unter dein Deck gelegt', 'Hai messo $1 nella tua mano e $2 in fondo al tuo mazzo'],
  [/^Put (.+?) into your hand and (.+?) in the Lost Zone$/, 'Pusiste $1 en tu mano y $2 en la Zona Perdida', 'Você colocou $1 na sua mão e $2 na Zona Perdida', 'Vous avez mis $1 dans votre main et $2 dans la Zone Perdue', '$1 auf deine Hand genommen und $2 in die Verlorene Zone gelegt', 'Hai messo $1 nella tua mano e $2 nella Zona Perduta'],
  [/^Put (.+?) into your hand$/, 'Pusiste $1 en tu mano', 'Você colocou $1 na sua mão', 'Vous avez mis $1 dans votre main', '$1 auf deine Hand genommen', 'Hai messo $1 nella tua mano'],
  ['Your opponent put 1 card into their hand and 1 card on the bottom of their deck', 'El rival puso 1 carta en su mano y 1 carta debajo de su baraja', 'O oponente colocou 1 carta na mão dele e 1 carta embaixo do deck dele', 'L\'adversaire a mis 1 carte dans sa main et 1 carte sous son deck', 'Der Gegner hat 1 Karte auf seine Hand genommen und 1 Karte unter sein Deck gelegt', 'L\'avversario ha messo 1 carta nella sua mano e 1 carta in fondo al suo mazzo'],
  [/^Your opponent put 1 card into their hand and (\d+) cards on the bottom of their deck$/, 'El rival puso 1 carta en su mano y $1 cartas debajo de su baraja', 'O oponente colocou 1 carta na mão dele e $1 cartas embaixo do deck dele', 'L\'adversaire a mis 1 carte dans sa main et $1 cartes sous son deck', 'Der Gegner hat 1 Karte auf seine Hand genommen und $1 Karten unter sein Deck gelegt', 'L\'avversario ha messo 1 carta nella sua mano e $1 carte in fondo al suo mazzo'],
  [/^Your opponent put 1 card into their hand and (.+?) in the Lost Zone$/, 'El rival puso 1 carta en su mano y $1 en la Zona Perdida', 'O oponente colocou 1 carta na mão dele e $1 na Zona Perdida', 'L\'adversaire a mis 1 carte dans sa main et $1 dans la Zone Perdue', 'Der Gegner hat 1 Karte auf seine Hand genommen und $1 in die Verlorene Zone gelegt', 'L\'avversario ha messo 1 carta nella sua mano e $1 nella Zona Perduta'],
  ['Your opponent put 1 card into their hand', 'El rival puso 1 carta en su mano', 'O oponente colocou 1 carta na mão dele', 'L\'adversaire a mis 1 carte dans sa main', 'Der Gegner hat 1 Karte auf seine Hand genommen', 'L\'avversario ha messo 1 carta nella sua mano'],
  [/^Needs (.+?) in play\.$/, 'Necesita a $1 en juego.', 'Precisa de $1 em jogo.', 'Il faut $1 en jeu.', 'Braucht $1 im Spiel.', 'Serve $1 in gioco.'],
  [/^Needs a Basic (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy) Energy card in your hand to discard\.$/, t => ['Necesita una carta de Energía $T Básica en tu mano para descartarla.', 'Precisa de uma carta de Energia $T Básica na sua mão para descartar.', 'Il faut une carte Énergie $T de base dans votre main à défausser.', 'Braucht eine Basis-$T-Energiekarte auf deiner Hand zum Ablegen.', 'Serve una carta Energia $T base nella tua mano da scartare.']],
  ['Choose 1 more card.', 'Elige 1 carta más.', 'Escolha mais 1 carta.', 'Choisissez 1 carte de plus.', 'Wähle 1 weitere Karte.', 'Scegli 1 altra carta.'],
  [/^Choose (\d+) more cards\.$/, 'Elige $1 cartas más.', 'Escolha mais $1 cartas.', 'Choisissez $1 cartes de plus.', 'Wähle $1 weitere Karten.', 'Scegli altre $1 carte.'],
  ['Ended the turn', 'Terminó el turno', 'Terminou o turno', 'A terminé le tour', 'Zug beendet', 'Ha finito il turno'],
  ['Your turn ends', 'Tu turno termina', 'Seu turno termina', 'Votre tour se termine', 'Dein Zug endet', 'Il tuo turno finisce'],
  [/^Your turn (\d+)$/, 'Tu turno $1', 'Seu turno $1', 'Votre tour $1', 'Dein Zug $1', 'Il tuo turno $1'],
  [/^Your opponent's turn (\d+)$/, 'Turno del rival $1', 'Turno do oponente $1', 'Tour de l\'adversaire $1', 'Zug des Gegners $1', 'Turno dell\'avversario $1'],
  ['You drew 1 for mulligans', 'Robaste 1 carta por los mulligans', 'Você comprou 1 carta pelos mulligans', 'Vous avez pioché 1 carte pour les mulligans', 'Du hast 1 Karte für die Mulligans gezogen', 'Hai pescato 1 carta per i mulligan'],
  [/^You drew (\d+) for mulligans$/, 'Robaste $1 cartas por los mulligans', 'Você comprou $1 cartas pelos mulligans', 'Vous avez pioché $1 cartes pour les mulligans', 'Du hast $1 Karten für die Mulligans gezogen', 'Hai pescato $1 carte per i mulligan'],
  ['Your opponent drew 1 for mulligans', 'El rival robó 1 carta por los mulligans', 'O oponente comprou 1 carta pelos mulligans', 'L\'adversaire a pioché 1 carte pour les mulligans', 'Der Gegner hat 1 Karte für die Mulligans gezogen', 'L\'avversario ha pescato 1 carta per i mulligan'],
  [/^Your opponent drew (\d+) for mulligans$/, 'El rival robó $1 cartas por los mulligans', 'O oponente comprou $1 cartas pelos mulligans', 'L\'adversaire a pioché $1 cartes pour les mulligans', 'Der Gegner hat $1 Karten für die Mulligans gezogen', 'L\'avversario ha pescato $1 carte per i mulligan'],
  // 3.4.7: the full game log. Damage says why, draws and searches say what and where, and
  // the opponent's turn reads from your side ("Put Iono into their hand").
  [/^(\d+) damage to (.+?)( on the Bench)?(?: \((base \d+, .+)\))?$/, { fn: (m, l) => i18nFtDmg(l, m[1], m[2], !!m[3], m[4], false) }],
  [/^(\d+) more damage to (.+)$/, { fn: (m, l) => i18nFtDmg(l, m[1], m[2], false, null, true) }],
  ['Drew nothing, the deck is empty', 'No robó nada, la baraja está vacía', 'Não comprou nada, o deck está vazio', 'N\'a rien pioché, le deck est vide', 'Nichts gezogen, das Deck ist leer', 'Non ha pescato nulla, il mazzo è vuoto'],
  ['Your opponent drew nothing, the deck is empty', 'El rival no robó nada, su baraja está vacía', 'O oponente não comprou nada, o deck dele está vazio', 'L\'adversaire n\'a rien pioché, son deck est vide', 'Der Gegner hat nichts gezogen, sein Deck ist leer', 'L\'avversario non ha pescato nulla, il suo mazzo è vuoto'],
  ['You drew nothing, the deck is empty', 'No robaste nada, tu baraja está vacía', 'Você não comprou nada, seu deck está vazio', 'Vous n\'avez rien pioché, votre deck est vide', 'Du hast nichts gezogen, dein Deck ist leer', 'Non hai pescato nulla, il tuo mazzo è vuoto'],
  ['Drew 1 card', 'Robó 1 carta', 'Comprou 1 carta', 'A pioché 1 carte', '1 Karte gezogen', 'Ha pescato 1 carta'],
  [/^Drew (\d+) cards$/, 'Robó $1 cartas', 'Comprou $1 cartas', 'A pioché $1 cartes', '$1 Karten gezogen', 'Ha pescato $1 carte'],
  [/^Drew (.+)$/, 'Robó $1', 'Comprou $1', 'A pioché $1', '$1 gezogen', 'Ha pescato $1'],
  ['Your opponent drew a card', 'El rival robó una carta', 'O oponente comprou uma carta', 'L\'adversaire a pioché une carte', 'Der Gegner hat eine Karte gezogen', 'L\'avversario ha pescato una carta'],
  ['Your opponent drew 1 card', 'El rival robó 1 carta', 'O oponente comprou 1 carta', 'L\'adversaire a pioché 1 carte', 'Der Gegner hat 1 Karte gezogen', 'L\'avversario ha pescato 1 carta'],
  [/^Your opponent drew (\d+) cards$/, 'El rival robó $1 cartas', 'O oponente comprou $1 cartas', 'L\'adversaire a pioché $1 cartes', 'Der Gegner hat $1 Karten gezogen', 'L\'avversario ha pescato $1 carte'],
  [/^You drew (.+)$/, 'Robaste $1', 'Você comprou $1', 'Vous avez pioché $1', 'Du hast $1 gezogen', 'Hai pescato $1'],
  [/^Evolved (.+?) into (.+)$/, 'Evolucionó a $1 en $2', 'Evoluiu $1 para $2', 'A fait évoluer $1 en $2', '$1 zu $2 entwickelt', 'Ha fatto evolvere $1 in $2'],
  [/^Rare Candy: (.+?) into (.+)$/, 'Rare Candy: $1 evolucionó a $2', 'Rare Candy: $1 evoluiu para $2', 'Rare Candy : $1 a évolué en $2', 'Rare Candy: $1 zu $2 entwickelt', 'Rare Candy: $1 si è evoluto in $2'],
  [/^Retreated (.+?) for the other (.+?), discarding (.+)$/, 'Retiró a $1 y entró el otro $2, descartando $3', 'Recuou $1 e entrou o outro $2, descartando $3', 'A fait battre en retraite $1 pour l\'autre $2, en défaussant $3', '$1 zurückgezogen, das andere $2 kommt, $3 abgelegt', 'Ha ritirato $1 per l\'altro $2, scartando $3'],
  [/^Retreated (.+?) for (.+?), discarding (.+)$/, 'Retiró a $1 y entró $2, descartando $3', 'Recuou $1 e entrou $2, descartando $3', 'A fait battre en retraite $1 pour $2, en défaussant $3', '$1 zurückgezogen, $2 kommt, $3 abgelegt', 'Ha ritirato $1 per $2, scartando $3'],
  [/^Retreated (.+?) for the other (.+?), with no Energy to pay$/, 'Retiró a $1 y entró el otro $2, sin Energía que pagar', 'Recuou $1 e entrou o outro $2, sem Energia para pagar', 'A fait battre en retraite $1 pour l\'autre $2, sans Énergie à payer', '$1 zurückgezogen, das andere $2 kommt, ohne Energie zu bezahlen', 'Ha ritirato $1 per l\'altro $2, senza Energia da pagare'],
  [/^Retreated (.+?) for (.+?), with no Energy to pay$/, 'Retiró a $1 y entró $2, sin Energía que pagar', 'Recuou $1 e entrou $2, sem Energia para pagar', 'A fait battre en retraite $1 pour $2, sans Énergie à payer', '$1 zurückgezogen, $2 kommt, ohne Energie zu bezahlen', 'Ha ritirato $1 per $2, senza Energia da pagare'],
  [/^Searched for (.+?) into your hand$/, 'Buscó en la baraja y puso en tu mano: $1', 'Buscou no deck e colocou na sua mão: $1', 'A cherché dans le deck et mis dans votre main : $1', 'Im Deck gesucht und auf deine Hand genommen: $1', 'Ha cercato nel mazzo e messo nella tua mano: $1'],
  [/^Searched for (.+?) into their hand$/, 'Buscó en la baraja y puso en la mano del rival: $1', 'Buscou no deck e colocou na mão do oponente: $1', 'A cherché dans le deck et mis dans la main adverse : $1', 'Im Deck gesucht und auf die Hand des Gegners genommen: $1', 'Ha cercato nel mazzo e messo nella mano dell\'avversario: $1'],
  [/^Searched for (.+?) onto your Bench$/, 'Buscó en la baraja y puso en tu Banca: $1', 'Buscou no deck e colocou no seu Banco: $1', 'A cherché dans le deck et placé sur votre Banc : $1', 'Im Deck gesucht und auf deine Bank gelegt: $1', 'Ha cercato nel mazzo e messo nella tua Panchina: $1'],
  [/^Searched for (.+?) onto their Bench$/, 'Buscó en la baraja y puso en la Banca del rival: $1', 'Buscou no deck e colocou no Banco do oponente: $1', 'A cherché dans le deck et placé sur le Banc adverse : $1', 'Im Deck gesucht und auf die Bank des Gegners gelegt: $1', 'Ha cercato nel mazzo e messo nella Panchina dell\'avversario: $1'],
  [/^Searched for (.+?) on top of your deck$/, 'Buscó en la baraja y puso encima de tu baraja: $1', 'Buscou no deck e colocou no topo do seu deck: $1', 'A cherché dans le deck et placé sur le dessus de votre deck : $1', 'Im Deck gesucht und oben auf dein Deck gelegt: $1', 'Ha cercato nel mazzo e messo in cima al tuo mazzo: $1'],
  [/^Searched for (.+?) on top of their deck$/, 'Buscó en la baraja y puso encima de la baraja del rival: $1', 'Buscou no deck e colocou no topo do deck do oponente: $1', 'A cherché dans le deck et placé sur le dessus du deck adverse : $1', 'Im Deck gesucht und oben auf das Deck des Gegners gelegt: $1', 'Ha cercato nel mazzo e messo in cima al mazzo dell\'avversario: $1'],
  ['Took back nothing, no card fit', 'No recuperó nada, ninguna carta cumplía', 'Não recuperou nada, nenhuma carta servia', 'N\'a rien récupéré, aucune carte ne convenait', 'Nichts zurückgeholt, keine Karte passte', 'Non ha recuperato nulla, nessuna carta andava bene'],
  [/^Took back (.+?) into your hand$/, 'Recuperó para tu mano: $1', 'Recuperou para a sua mão: $1', 'A récupéré dans votre main : $1', 'Zurück auf deine Hand geholt: $1', 'Ha recuperato nella tua mano: $1'],
  [/^Took back (.+?) into their hand$/, 'Recuperó para la mano del rival: $1', 'Recuperou para a mão do oponente: $1', 'A récupéré dans la main adverse : $1', 'Zurück auf die Hand des Gegners geholt: $1', 'Ha recuperato nella mano dell\'avversario: $1'],
  [/^Took back (.+) into their deck$/, 'Devolvió $1 a la baraja', 'Devolveu $1 ao deck', 'A remis $1 dans le deck', '$1 zurück ins Deck gemischt', 'Ha rimesso $1 nel mazzo'],
  [/^Took (.+?) into your hand$/, 'Puso en tu mano: $1', 'Colocou na sua mão: $1', 'A mis dans votre main : $1', 'Auf deine Hand genommen: $1', 'Ha messo nella tua mano: $1'],
  [/^Took (.+?) into their hand$/, 'Puso en la mano del rival: $1', 'Colocou na mão do oponente: $1', 'A mis dans la main adverse : $1', 'Auf die Hand des Gegners genommen: $1', 'Ha messo nella mano dell\'avversario: $1'],
  [/^Took (.+?) and attached (?:it|them) to (.+)$/, 'Tomó y unió a $2: $1', 'Pegou e ligou a $2: $1', 'A pris et attaché à $2 : $1', 'Genommen und an $2 angelegt: $1', 'Ha preso e assegnato a $2: $1'],
  [/^Took (.+?) and discarded (?:it|them)$/, 'Tomó y descartó: $1', 'Pegou e descartou: $1', 'A pris et défaussé : $1', 'Genommen und abgelegt: $1', 'Ha preso e scartato: $1'],
  [/^Discarded the rest: (.+)$/, 'Descartó el resto: $1', 'Descartou o resto: $1', 'A défaussé le reste : $1', 'Den Rest abgelegt: $1', 'Ha scartato il resto: $1'],
  ['Shuffled the rest into your deck', 'Barajó el resto en tu baraja', 'Embaralhou o resto no seu deck', 'A mélangé le reste dans votre deck', 'Den Rest in dein Deck gemischt', 'Ha rimescolato il resto nel tuo mazzo'],
  ['Shuffled the rest into their deck', 'Barajó el resto en la baraja del rival', 'Embaralhou o resto no deck do oponente', 'A mélangé le reste dans le deck adverse', 'Den Rest in das Deck des Gegners gemischt', 'Ha rimescolato il resto nel mazzo dell\'avversario'],
  ['Put the rest on the bottom of your deck', 'Puso el resto debajo de tu baraja', 'Colocou o resto embaixo do seu deck', 'A placé le reste sous votre deck', 'Den Rest unter dein Deck gelegt', 'Ha messo il resto in fondo al tuo mazzo'],
  ['Put the rest on the bottom of their deck', 'Puso el resto debajo de la baraja del rival', 'Colocou o resto embaixo do deck do oponente', 'A placé le reste sous le deck adverse', 'Den Rest unter das Deck des Gegners gelegt', 'Ha messo il resto in fondo al mazzo dell\'avversario'],
  ["Your opponent's hand went to the bottom of the deck", 'La mano del rival fue al fondo de su baraja', 'A mão do oponente foi para o fundo do deck dele', 'La main adverse est allée sous son deck', 'Die Hand des Gegners kam unter sein Deck', 'La mano dell\'avversario è finita in fondo al suo mazzo'],
  ['Your hand went to the bottom of the deck', 'Tu mano fue al fondo de tu baraja', 'Sua mão foi para o fundo do seu deck', 'Votre main est allée sous votre deck', 'Deine Hand kam unter dein Deck', 'La tua mano è finita in fondo al tuo mazzo'],
  [/^Your opponent discarded (.+)$/, 'El rival descartó $1', 'O oponente descartou $1', 'L\'adversaire a défaussé $1', 'Der Gegner hat $1 abgelegt', 'L\'avversario ha scartato $1'],
  [/^You discarded (.+)$/, 'Descartaste $1', 'Você descartou $1', 'Vous avez défaussé $1', 'Du hast $1 abgelegt', 'Hai scartato $1'],
  [/^Put (.+?) from your opponent's hand on the bottom of your opponent's deck$/, 'Puso $1 de la mano del rival debajo de su baraja', 'Colocou $1 da mão do oponente embaixo do deck dele', 'A placé $1 de la main adverse sous son deck', '$1 aus der Hand des Gegners unter sein Deck gelegt', 'Ha messo $1 della mano dell\'avversario in fondo al suo mazzo'],
  [/^Put (.+?) from your hand on the bottom of your deck$/, 'Puso $1 de tu mano debajo de tu baraja', 'Colocou $1 da sua mão embaixo do seu deck', 'A placé $1 de votre main sous votre deck', '$1 aus deiner Hand unter dein Deck gelegt', 'Ha messo $1 della tua mano in fondo al tuo mazzo'],
  [/^(.+?) from your hand: (.+)$/, '$1 desde tu mano: $2', '$1 da sua mão: $2', '$1 depuis votre main : $2', '$1 aus deiner Hand: $2', '$1 dalla tua mano: $2'],
  [/^Discarded (.+?) from your hand$/, 'Descartó $1 de tu mano', 'Descartou $1 da sua mão', 'A défaussé $1 de votre main', '$1 aus deiner Hand abgelegt', 'Ha scartato $1 dalla tua mano'],
  [/^Put (.+?) into their hand$/, 'Puso $1 en la mano del rival', 'Colocou $1 na mão do oponente', 'A mis $1 dans la main adverse', '$1 auf die Hand des Gegners genommen', 'Ha messo $1 nella mano dell\'avversario'],
  [/^Put (.+?) back into their hand$/, 'Devolvió $1 a la mano del rival', 'Devolveu $1 para a mão do oponente', 'A remis $1 dans la main adverse', '$1 zurück auf die Hand des Gegners genommen', 'Ha rimesso $1 nella mano dell\'avversario'],
  [/^Put (.+?) on top of their deck$/, 'Puso $1 encima de la baraja del rival', 'Colocou $1 no topo do deck do oponente', 'A placé $1 sur le dessus du deck adverse', '$1 oben auf das Deck des Gegners gelegt', 'Ha messo $1 in cima al mazzo dell\'avversario'],
  [/^Put (.+?) on your Bench$/, 'Puso a $1 en tu Banca', 'Colocou $1 no seu Banco', 'A placé $1 sur votre Banc', '$1 auf deine Bank gelegt', 'Ha messo $1 nella tua Panchina'],
  [/^Put (.+?) on their Bench$/, 'Puso a $1 en la Banca del rival', 'Colocou $1 no Banco do oponente', 'A placé $1 sur le Banc adverse', '$1 auf die Bank des Gegners gelegt', 'Ha messo $1 nella Panchina dell\'avversario'],
  ['Only while it is in your hand.', 'Solo mientras está en tu mano.', 'Só enquanto estiver na sua mão.', 'Seulement tant qu\'il est dans votre main.', 'Nur solange es auf deiner Hand ist.', 'Solo mentre è nella tua mano.'],
  ['Their turn ends', 'El turno del rival termina', 'O turno do oponente termina', 'Le tour de l\'adversaire se termine', 'Der Zug des Gegners endet', 'Il turno dell\'avversario finisce'],
  ['Chose not to switch', 'Decidió no cambiar', 'Decidiu não trocar', 'A choisi de ne pas échanger', 'Hat sich gegen einen Wechsel entschieden', 'Ha scelto di non scambiare'],
  // Effects that would do nothing now are not offered, with the reason.
  [/^No Basic (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy in your hand\.$/, { fn: (m, l) => ({ es: `No tienes Energía ${I18N_FT_TYPES.es[m[1]]} Básica en la mano.`, pt: `Você não tem Energia ${I18N_FT_TYPES.pt[m[1]]} Básica na mão.`, fr: `Aucune Énergie ${I18N_FT_TYPES.fr[m[1]]} de base dans votre main.`, de: `Keine Basis-${I18N_FT_TYPES.de[m[1]]}-Energie auf deiner Hand.`, it: `Nessuna Energia ${I18N_FT_TYPES.it[m[1]]} base in mano.` })[l] }],
  [/^No Basic (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy in your discard pile\.$/, { fn: (m, l) => ({ es: `No hay Energía ${I18N_FT_TYPES.es[m[1]]} Básica en tu pila de descartes.`, pt: `Não há Energia ${I18N_FT_TYPES.pt[m[1]]} Básica na sua pilha de descarte.`, fr: `Aucune Énergie ${I18N_FT_TYPES.fr[m[1]]} de base dans votre pile de défausse.`, de: `Keine Basis-${I18N_FT_TYPES.de[m[1]]}-Energie auf deinem Ablagestapel.`, it: `Nessuna Energia ${I18N_FT_TYPES.it[m[1]]} base nella tua pila degli scarti.` })[l] }],
  ['No Basic Energy in your hand.', 'No tienes Energía Básica en la mano.', 'Você não tem Energia Básica na mão.', 'Aucune Énergie de base dans votre main.', 'Keine Basis-Energie auf deiner Hand.', 'Nessuna Energia base in mano.'],
  ['No Basic Energy in your discard pile.', 'No hay Energía Básica en tu pila de descartes.', 'Não há Energia Básica na sua pilha de descarte.', 'Aucune Énergie de base dans votre pile de défausse.', 'Keine Basis-Energie auf deinem Ablagestapel.', 'Nessuna Energia base nella tua pila degli scarti.'],
  ['No Benched Pokémon it can attach to.', 'No hay Pokémon en tu Banca a los que pueda unirse.', 'Não há Pokémon no seu Banco a que possa ser ligada.', 'Aucun Pokémon de votre Banc ne peut la recevoir.', 'Kein Pokémon auf deiner Bank kann sie erhalten.', 'Nessun Pokémon in Panchina a cui assegnarla.'],
  ['No Pokémon in play it can attach to.', 'No hay Pokémon en juego a los que pueda unirse.', 'Não há Pokémon em jogo a que possa ser ligada.', 'Aucun Pokémon en jeu ne peut la recevoir.', 'Kein Pokémon im Spiel kann sie erhalten.', 'Nessun Pokémon in gioco a cui assegnarla.'],
  ['Nothing in your discard pile it can take back.', 'No hay nada en tu pila de descartes que pueda recuperar.', 'Não há nada na sua pilha de descarte que possa recuperar.', 'Rien dans votre pile de défausse qu\'elle puisse récupérer.', 'Nichts auf deinem Ablagestapel, das sie zurückholen kann.', 'Niente nella tua pila degli scarti da poter recuperare.'],
  // The screens around a game
  ['Game setup', 'Preparación de la partida', 'Preparação da partida', 'Mise en place de la partie', 'Spielaufbau', 'Preparazione della partita'],
  ['Start a game', 'Empezar una partida', 'Começar uma partida', 'Commencer une partie', 'Ein Spiel starten', 'Inizia una partita'],
  ['You won the coin flip, so you go first.', 'Ganaste el lanzamiento de moneda, así que empiezas tú.', 'Você ganhou no cara ou coroa, então começa você.', 'Vous avez gagné à pile ou face, vous commencez donc.', 'Du hast den Münzwurf gewonnen, also fängst du an.', 'Hai vinto il lancio della moneta, quindi inizi tu.'],
  ['Your opponent won the coin flip, so they go first.', 'El rival ganó el lanzamiento de moneda, así que empieza primero.', 'O oponente ganhou no cara ou coroa, então começa primeiro.', 'L\'adversaire a gagné à pile ou face, il commence donc.', 'Der Gegner hat den Münzwurf gewonnen, also fängt er an.', 'L\'avversario ha vinto il lancio della moneta, quindi inizia per primo.'],
  ['A card', 'Una carta', 'Uma carta', 'Une carte', 'Eine Karte', 'Una carta'],
  ['a card', 'una carta', 'uma carta', 'une carte', 'eine Karte', 'una carta'],
  ['Take your turn', 'Juega tu turno', 'Jogue seu turno', 'Jouez votre tour', 'Spiel deinen Zug', 'Gioca il tuo turno'],
  ['Full game log', 'Registro completo de la partida', 'Registro completo da partida', 'Journal complet de la partie', 'Vollständiges Spielprotokoll', 'Registro completo della partita'],
  [/^Opponent's turn (\d+) of (\d+)$/, 'Turno del rival $1 de $2', 'Turno do oponente $1 de $2', 'Tour de l\'adversaire $1 sur $2', 'Zug des Gegners $1 von $2', 'Turno dell\'avversario $1 di $2'],
  ['You win on Prize cards.', 'Ganaste por cartas de Premio.', 'Você venceu por cartas de Prêmio.', 'Vous avez gagné aux cartes Récompense.', 'Du hast nach Preiskarten gewonnen.', 'Hai vinto per carte Premio.'],
  ['Your opponent wins on Prize cards.', 'Ganó el rival por cartas de Premio.', 'O oponente venceu por cartas de Prêmio.', 'L\'adversaire a gagné aux cartes Récompense.', 'Der Gegner hat nach Preiskarten gewonnen.', 'Ha vinto l\'avversario per carte Premio.'],
  ["It's a draw.", 'Es un empate.', 'Deu empate.', 'Match nul.', 'Unentschieden.', 'È un pareggio.'],
  [/^After (\d+) turns each, you took (\d+) Prize cards? and your opponent took (\d+)\.$/, { fn: (m, l) => I18N_FT_AFTER[l](+m[1], +m[2], +m[3]) }],
  ['You could not draw a card and lose', 'No pudiste robar una carta y pierdes', 'Você não pôde comprar uma carta e perde', 'Vous n\'avez pas pu piocher de carte et vous perdez', 'Du konntest keine Karte ziehen und verlierst', 'Non hai potuto pescare una carta e perdi'],
  ['Your opponent could not draw a card and lose', 'El rival no pudo robar una carta y pierde', 'O oponente não pôde comprar uma carta e perde', 'L\'adversaire n\'a pas pu piocher de carte et perd', 'Der Gegner konnte keine Karte ziehen und verliert', 'L\'avversario non ha potuto pescare una carta e perde'],
  ['Each player shuffled their hand into their deck', 'Cada jugador barajó su mano en su baraja', 'Cada jogador embaralhou a mão no próprio deck', 'Chaque joueur a mélangé sa main avec son deck', 'Jeder Spieler hat seine Hand in sein Deck gemischt', 'Ogni giocatore ha rimescolato la mano nel proprio mazzo'],
  ['Opponent put their hand on the bottom of their deck', 'El rival puso su mano debajo de su baraja', 'O oponente colocou a mão embaixo do deck', 'L\'adversaire a placé sa main sous son deck', 'Der Gegner hat seine Hand unter sein Deck gelegt', 'L\'avversario ha messo la mano in fondo al mazzo'],
  ["Moved an Energy on your opponent's side", 'Movió una Energía en el lado del rival', 'Moveu uma Energia no lado do oponente', 'A déplacé une Énergie du côté adverse', 'Eine Energie auf der Seite des Gegners verschoben', 'Ha spostato un\'Energia nel campo avversario'],
  ['Searched and took nothing', 'Buscó y no tomó nada', 'Buscou e não pegou nada', 'A cherché sans rien prendre', 'Gesucht und nichts genommen', 'Ha cercato senza prendere nulla'],
  ['Took nothing', 'No tomó nada', 'Não pegou nada', 'N\'a rien pris', 'Nichts genommen', 'Non ha preso nulla'],
  ['Took back nothing', 'No recuperó nada', 'Não recuperou nada', 'N\'a rien récupéré', 'Nichts zurückgeholt', 'Non ha recuperato nulla'],
  ['Heads', 'Cara', 'Cara', 'Face', 'Kopf', 'Testa'],
  ['Tails', 'Cruz', 'Coroa', 'Pile', 'Zahl', 'Croce'],
  ['Confused: heads', 'Confundido: cara', 'Confuso: cara', 'Confus : face', 'Verwirrt: Kopf', 'Confuso: testa'],
  ['Confused: tails', 'Confundido: cruz', 'Confuso: coroa', 'Confus : pile', 'Verwirrt: Zahl', 'Confuso: croce'],
  [/^1 heads$/, '1 cara', '1 cara', '1 face', '1-mal Kopf', '1 testa'],
  [/^(\d+) heads$/, '$1 caras', '$1 caras', '$1 faces', '$1-mal Kopf', '$1 teste'],
  ['It can attack again', 'Puede atacar otra vez', 'Pode atacar de novo', 'Il peut attaquer à nouveau', 'Es kann noch einmal angreifen', 'Può attaccare di nuovo'],
  [/^Played (.+)$/, 'Jugó $1', 'Jogou $1', 'A joué $1', '$1 gespielt', 'Ha giocato $1'],
  [/^Used (.+)$/, 'Usó $1', 'Usou $1', 'A utilisé $1', '$1 eingesetzt', 'Ha usato $1'],
  [/^Benched (.+)$/, 'Puso a $1 en la Banca', 'Colocou $1 no Banco', 'A placé $1 sur le Banc', '$1 auf die Bank gelegt', 'Ha messo $1 in Panchina'],
  [/^Evolved into (.+)$/, 'Evolucionó a $1', 'Evoluiu para $1', 'A fait évoluer en $1', 'Zu $1 entwickelt', 'Si è evoluto in $1'],
  [/^Attached (.+?) to (.+)$/, 'Unió $1 a $2', 'Ligou $1 a $2', 'A attaché $1 à $2', '$1 an $2 angelegt', 'Ha assegnato $1 a $2'],
  [/^Retreated (.+?) for the other (.+)$/, 'Retiró a $1 y entró el otro $2', 'Recuou $1 e entrou o outro $2', 'A fait battre en retraite $1 pour l\'autre $2', '$1 zurückgezogen, das andere $2 kommt', 'Ha ritirato $1 per l\'altro $2'],
  [/^Retreated (.+?) for (.+)$/, 'Retiró a $1 y entró $2', 'Recuou $1 e entrou $2', 'A fait battre en retraite $1 pour $2', '$1 zurückgezogen, $2 kommt', 'Ha ritirato $1 per $2'],
  [/^Searched for (.+)$/, 'Buscó $1', 'Buscou $1', 'A cherché $1', '$1 gesucht', 'Ha cercato $1'],
  [/^Took back (.+) into your deck$/, 'Devolvió $1 a la baraja', 'Devolveu $1 ao deck', 'A remis $1 dans le deck', '$1 zurück ins Deck gemischt', 'Ha rimesso $1 nel mazzo'],
  [/^Took back (.+)$/, 'Recuperó $1', 'Recuperou $1', 'A récupéré $1', '$1 zurückgeholt', 'Ha recuperato $1'],
  [/^Took (.+)$/, 'Tomó $1', 'Pegou $1', 'A pris $1', '$1 genommen', 'Ha preso $1'],
  [/^Discarded (.+?) from your opponent's hand$/, 'Descartó $1 de la mano del rival', 'Descartou $1 da mão do oponente', 'A défaussé $1 de la main adverse', '$1 aus der Hand des Gegners abgelegt', 'Ha scartato $1 dalla mano dell\'avversario'],
  [/^Put (.+?) from your opponent's hand$/, 'Puso $1 de la mano del rival debajo de su baraja', 'Colocou $1 da mão do oponente embaixo do deck dele', 'A placé $1 de la main adverse sous son deck', '$1 aus der Hand des Gegners unter sein Deck gelegt', 'Ha messo $1 dalla mano dell\'avversario in fondo al suo mazzo'],
  [/^Discarded (.+?) from your deck$/, 'Descartó $1 de tu baraja', 'Descartou $1 do seu deck', 'A défaussé $1 de votre deck', '$1 aus deinem Deck abgelegt', 'Ha scartato $1 dal tuo mazzo'],
  [/^Discarded (.+?) from their deck$/, 'Descartó $1 de la baraja del rival', 'Descartou $1 do deck do oponente', 'A défaussé $1 du deck adverse', '$1 aus dem Deck des Gegners abgelegt', 'Ha scartato $1 dal mazzo dell\'avversario'],
  [/^Discarded (.+?) from the top of the deck$/, 'Descartó $1 de la parte superior de la baraja', 'Descartou $1 do topo do deck', 'A défaussé $1 du dessus du deck', '$1 oben vom Deck abgelegt', 'Ha scartato $1 dalla cima del mazzo'],
  [/^Discarded from (.+)$/, 'Descartó de $1', 'Descartou de $1', 'A défaussé de $1', 'Von $1 abgelegt', 'Ha scartato da $1'],
  [/^Discarded (.+?) from (.+)$/, 'Descartó $1 de $2', 'Descartou $1 de $2', 'A défaussé $1 de $2', '$1 von $2 abgelegt', 'Ha scartato $1 da $2'],
  [/^Discarded (.+)$/, 'Descartó $1', 'Descartou $1', 'A défaussé $1', '$1 abgelegt', 'Ha scartato $1'],
  [/^Opponent discarded (.+)$/, 'El rival descartó $1', 'O oponente descartou $1', 'L\'adversaire a défaussé $1', 'Der Gegner hat $1 abgelegt', 'L\'avversario ha scartato $1'],
  [/^Put (.+?) on top of your deck$/, 'Puso $1 encima de tu baraja', 'Colocou $1 no topo do seu deck', 'A placé $1 sur le dessus de votre deck', '$1 oben auf dein Deck gelegt', 'Ha messo $1 in cima al tuo mazzo'],
  [/^Put (.+?) back into your hand$/, 'Devolvió $1 a tu mano', 'Devolveu $1 para a sua mão', 'A remis $1 dans votre main', '$1 zurück auf deine Hand genommen', 'Ha rimesso $1 nella tua mano'],
  [/^Put the Energy from (.+?) into the hand$/, 'Puso la Energía de $1 en la mano', 'Colocou a Energia de $1 na mão', 'A mis l\'Énergie de $1 dans la main', 'Die Energie von $1 auf die Hand genommen', 'Ha messo l\'Energia di $1 in mano'],
  [/^Put (.+?) into your hand$/, 'Puso $1 en tu mano', 'Colocou $1 na sua mão', 'A mis $1 dans votre main', '$1 auf deine Hand genommen', 'Ha messo $1 nella tua mano'],
  [/^Put (.+?) on your opponent's Bench$/, 'Puso a $1 en la Banca del rival', 'Colocou $1 no Banco do oponente', 'A placé $1 sur le Banc adverse', '$1 auf die Bank des Gegners gelegt', 'Ha messo $1 nella Panchina dell\'avversario'],
  [/^Put 1 damage counters? on (.+)$/, 'Puso 1 contador de daño en $1', 'Colocou 1 contador de dano em $1', 'A placé 1 marqueur de dégâts sur $1', '1 Schadensmarke auf $1 gelegt', 'Ha messo 1 segnalino danno su $1'],
  [/^Put (\d+) damage counters on (.+)$/, 'Puso $1 contadores de daño en $2', 'Colocou $1 contadores de dano em $2', 'A placé $1 marqueurs de dégâts sur $2', '$1 Schadensmarken auf $2 gelegt', 'Ha messo $1 segnalini danno su $2'],
  [/^Moved 1 damage counters? from (.+?) to (.+)$/, 'Movió 1 contador de daño de $1 a $2', 'Moveu 1 contador de dano de $1 para $2', 'A déplacé 1 marqueur de dégâts de $1 sur $2', '1 Schadensmarke von $1 auf $2 verschoben', 'Ha spostato 1 segnalino danno da $1 a $2'],
  [/^Moved (\d+) damage counters from (.+?) to (.+)$/, 'Movió $1 contadores de daño de $2 a $3', 'Moveu $1 contadores de dano de $2 para $3', 'A déplacé $1 marqueurs de dégâts de $2 sur $3', '$1 Schadensmarken von $2 auf $3 verschoben', 'Ha spostato $1 segnalini danno da $2 a $3'],
  [/^Moved Energy from (.+?) to (.+)$/, 'Movió Energía de $1 a $2', 'Moveu Energia de $1 para $2', 'A déplacé de l\'Énergie de $1 sur $2', 'Energie von $1 auf $2 verschoben', 'Ha spostato Energia da $1 a $2'],
  [/^Moved (.+?) from (.+?) to (.+)$/, 'Movió $1 de $2 a $3', 'Moveu $1 de $2 para $3', 'A déplacé $1 de $2 sur $3', '$1 von $2 auf $3 verschoben', 'Ha spostato $1 da $2 a $3'],
  [/^Switched in (.+)$/, 'Cambió a $1', 'Trocou por $1', 'A fait entrer $1', '$1 eingewechselt', 'Ha fatto entrare $1'],
  [/^Healed all damage from (.+)$/, 'Curó todo el daño de $1', 'Curou todo o dano de $1', 'A soigné tous les dégâts de $1', 'Allen Schaden von $1 geheilt', 'Ha curato tutti i danni di $1'],
  [/^Healed (\d+) from (.+)$/, 'Curó $1 de daño a $2', 'Curou $1 de dano de $2', 'A soigné $1 dégâts à $2', '$1 Schaden von $2 geheilt', 'Ha curato $1 danni a $2'],
  [/^(\d+) damage to (.+?) on the Bench$/, '$1 de daño a $2 en la Banca', '$1 de dano em $2 no Banco', '$1 dégâts à $2 sur le Banc', '$1 Schaden an $2 auf der Bank', '$1 danni a $2 in Panchina'],
  [/^(\d+) damage to (.+)$/, '$1 de daño a $2', '$1 de dano em $2', '$1 dégâts à $2', '$1 Schaden an $2', '$1 danni a $2'],
  [/^The attack failed, and (.+?) took 3 damage counters$/, 'El ataque falló y $1 recibió 3 contadores de daño', 'O ataque falhou e $1 recebeu 3 contadores de dano', 'L\'attaque a échoué et $1 a reçu 3 marqueurs de dégâts', 'Der Angriff ist fehlgeschlagen, und $1 hat 3 Schadensmarken erhalten', 'L\'attacco è fallito e $1 ha ricevuto 3 segnalini danno'],
  [/^(.+?) is Knocked Out \(1 Prize card taken\)$/, '$1 queda Fuera de Combate (se tomó 1 carta de Premio)', '$1 foi Nocauteado (1 carta de Prêmio pega)', '$1 est K.O. (1 carte Récompense prise)', '$1 ist kampfunfähig (1 Preiskarte genommen)', '$1 è KO (presa 1 carta Premio)'],
  [/^(.+?) is Knocked Out \((\d+) Prize cards taken\)$/, '$1 queda Fuera de Combate (se tomaron $2 cartas de Premio)', '$1 foi Nocauteado ($2 cartas de Prêmio pegas)', '$1 est K.O. ($2 cartes Récompense prises)', '$1 ist kampfunfähig ($2 Preiskarten genommen)', '$1 è KO (prese $2 carte Premio)'],
  [/^(.+?) is Knocked Out by the effect$/, '$1 queda Fuera de Combate por el efecto', '$1 foi Nocauteado pelo efeito', '$1 est K.O. à cause de l\'effet', '$1 ist durch den Effekt kampfunfähig', '$1 è KO per l\'effetto'],
  [/^(.+?) is now Active$/, '$1 ahora es el Pokémon Activo', '$1 agora é o Pokémon Ativo', '$1 est maintenant le Pokémon Actif', '$1 ist jetzt das Aktive Pokémon', '$1 ora è il Pokémon Attivo'],
  [/^(.+?) is now Poisoned$/, '$1 ahora está Envenenado', '$1 agora está Envenenado', '$1 est maintenant Empoisonné', '$1 ist jetzt vergiftet', '$1 ora è Avvelenato'],
  [/^(.+?) is now Burned$/, '$1 ahora está Quemado', '$1 agora está Queimado', '$1 est maintenant Brûlé', '$1 ist jetzt verbrannt', '$1 ora è Bruciato'],
  [/^(.+?) is now Asleep$/, '$1 ahora está Dormido', '$1 agora está Adormecido', '$1 est maintenant Endormi', '$1 schläft jetzt', '$1 ora è Addormentato'],
  [/^(.+?) is now Paralyzed$/, '$1 ahora está Paralizado', '$1 agora está Paralisado', '$1 est maintenant Paralysé', '$1 ist jetzt paralysiert', '$1 ora è Paralizzato'],
  [/^(.+?) is now Confused$/, '$1 ahora está Confundido', '$1 agora está Confuso', '$1 est maintenant Confus', '$1 ist jetzt verwirrt', '$1 ora è Confuso'],
  [/^(.+?) is no longer Burned$/, '$1 ya no está Quemado', '$1 não está mais Queimado', '$1 n\'est plus Brûlé', '$1 ist nicht mehr verbrannt', '$1 non è più Bruciato'],
  [/^(.+?) is no longer Paralyzed$/, '$1 ya no está Paralizado', '$1 não está mais Paralisado', '$1 n\'est plus Paralysé', '$1 ist nicht mehr paralysiert', '$1 non è più Paralizzato'],
  [/^(.+?) woke up$/, '$1 se despertó', '$1 acordou', '$1 s\'est réveillé', '$1 ist aufgewacht', '$1 si è svegliato'],
  [/^(.+?) took 1 damage counter from Poison$/, '$1 recibió 1 contador de daño por Veneno', '$1 recebeu 1 contador de dano por Veneno', '$1 a reçu 1 marqueur de dégâts dû au Poison', '$1 hat 1 Schadensmarke durch Gift erhalten', '$1 ha ricevuto 1 segnalino danno per il Veleno'],
  [/^(.+?) took 5 more damage counters from Poison$/, '$1 recibió 5 contadores de daño más por Veneno', '$1 recebeu mais 5 contadores de dano por Veneno', '$1 a reçu 5 marqueurs de dégâts de plus dus au Poison', '$1 hat 5 weitere Schadensmarken durch Gift erhalten', '$1 ha ricevuto altri 5 segnalini danno per il Veleno'],
  [/^(.+?) took 2 damage counters from Burn$/, '$1 recibió 2 contadores de daño por Quemadura', '$1 recebeu 2 contadores de dano por Queimadura', '$1 a reçu 2 marqueurs de dégâts dus à la Brûlure', '$1 hat 2 Schadensmarken durch Verbrennung erhalten', '$1 ha ricevuto 2 segnalini danno per la Bruciatura'],
  [/^(.+?) took (\d+) damage counters$/, '$1 recibió $2 contadores de daño', '$1 recebeu $2 contadores de dano', '$1 a reçu $2 marqueurs de dégâts', '$1 hat $2 Schadensmarken erhalten', '$1 ha ricevuto $2 segnalini danno'],
  [/^(.+?) was devolved$/, '$1 involucionó', '$1 involuiu', '$1 a régressé', '$1 wurde zurückentwickelt', '$1 è regredito'],
  [/^(.+?) was shuffled into the deck$/, '$1 se barajó en la baraja', '$1 foi embaralhado no deck', '$1 a été mélangé dans le deck', '$1 wurde ins Deck gemischt', '$1 è stato rimescolato nel mazzo'],
  [/^(.+?) went back to the hand$/, '$1 volvió a la mano', '$1 voltou para a mão', '$1 est retourné dans la main', '$1 ist auf die Hand zurückgekehrt', '$1 è tornato in mano'],
  [/^(.+?) was discarded$/, '$1 se descartó', '$1 foi descartado', '$1 a été défaussé', '$1 wurde abgelegt', '$1 è stato scartato'],
  [/^(.+?) can attack again$/, '$1 puede atacar otra vez', '$1 pode atacar de novo', '$1 peut attaquer à nouveau', '$1 kann noch einmal angreifen', '$1 può attaccare di nuovo'],
  [/^(.+?) can't use (.+?) next turn$/, '$1 no puede usar $2 el próximo turno', '$1 não pode usar $2 no próximo turno', '$1 ne peut pas utiliser $2 au prochain tour', '$1 kann $2 im nächsten Zug nicht einsetzen', '$1 non può usare $2 nel prossimo turno'],
  [/^(.+?) put (\d+) damage counters on (.+)$/, '$1 puso $2 contadores de daño en $3', '$1 colocou $2 contadores de dano em $3', '$1 a placé $2 marqueurs de dégâts sur $3', '$1 hat $2 Schadensmarken auf $3 gelegt', '$1 ha messo $2 segnalini danno su $3'],
  ['Legacy Energy: 1 fewer Prize card', 'Legacy Energy: 1 carta de Premio menos', 'Legacy Energy: 1 carta de Prêmio a menos', 'Legacy Energy : 1 carte Récompense de moins', 'Legacy Energy: 1 Preiskarte weniger', 'Legacy Energy: 1 carta Premio in meno'],
  [/^Boomerang Energy was attached to (.+?) again$/, 'Boomerang Energy se unió de nuevo a $1', 'Boomerang Energy foi ligada a $1 de novo', 'Boomerang Energy a été attachée de nouveau à $1', 'Boomerang Energy wurde wieder an $1 angelegt', 'Boomerang Energy è stata assegnata di nuovo a $1'],
  [/^(.+?) on (.+?) took effect$/, '$1 en $2 surtió efecto', '$1 em $2 fez efeito', '$1 sur $2 a pris effet', '$1 an $2 hat gewirkt', '$1 su $2 ha fatto effetto'],
  [/^(.+?) moved an Energy to (.+)$/, '$1 movió una Energía a $2', '$1 moveu uma Energia para $2', '$1 a déplacé une Énergie sur $2', '$1 hat eine Energie auf $2 verschoben', '$1 ha spostato un\'Energia su $2'],
  [/^(.+?) used (.+)$/, '$1 usó $2', '$1 usou $2', '$1 a utilisé $2', '$1 hat $2 eingesetzt', '$1 ha usato $2'],
  ['Face-down card', 'Carta boca abajo', 'Carta virada para baixo', 'Carte face cachée', 'Verdeckte Karte', 'Carta coperta'],
  [/^(.+) is in play, so Evolution Pokémon have no Abilities\.$/, '$1 está en juego, así que los Pokémon Evolución no tienen Habilidades.', '$1 está em jogo, então os Pokémon de Evolução não têm Habilidades.', '$1 est en jeu, donc les Pokémon Évolution n\'ont pas de Talent.', '$1 ist im Spiel, also haben Entwicklungs-Pokémon keine Fähigkeiten.', '$1 è in gioco, quindi i Pokémon Evoluzione non hanno Abilità.'],
  [/^(.+) is in play, so Colorless Pokémon have no Abilities\.$/, '$1 está en juego, así que los Pokémon Incoloros no tienen Habilidades.', '$1 está em jogo, então os Pokémon Incolores não têm Habilidades.', '$1 est en jeu, donc les Pokémon Incolore n\'ont pas de Talent.', '$1 ist im Spiel, also haben farblose Pokémon keine Fähigkeiten.', '$1 è in gioco, quindi i Pokémon Incolore non hanno Abilità.'],
  [/^(.+) is Active, so Pokémon with a Rule Box have no Abilities\.$/, '$1 está en el Puesto Activo, así que los Pokémon con Recuadro de regla no tienen Habilidades.', '$1 está no Campo Ativo, então os Pokémon com Caixa de Regras não têm Habilidades.', '$1 est au Poste Actif, donc les Pokémon avec un Encadré Règle n\'ont pas de Talent.', '$1 ist aktiv, also haben Pokémon mit Regelfeld keine Fähigkeiten.', '$1 è in Posizione Attiva, quindi i Pokémon con Regola speciale non hanno Abilità.'],
  [/^(.+) is Active, so your Active Pokémon has no Abilities\.$/, '$1 está en el Puesto Activo, así que tu Pokémon Activo no tiene Habilidades.', '$1 está no Campo Ativo, então seu Pokémon Ativo não tem Habilidades.', '$1 est au Poste Actif, donc votre Pokémon Actif n\'a pas de Talent.', '$1 ist aktiv, also hat dein Aktives Pokémon keine Fähigkeiten.', '$1 è in Posizione Attiva, quindi il tuo Pokémon Attivo non ha Abilità.'],
  ["Your opponent's attack stops Item cards this turn.", 'El ataque del rival bloquea las cartas de Objeto este turno.', 'O ataque do oponente bloqueia as cartas de Item neste turno.', 'L\'attaque adverse bloque les cartes Objet ce tour-ci.', 'Die Attacke des Gegners sperrt in diesem Zug Item-Karten.', 'L\'attacco avversario blocca le carte Strumento in questo turno.'],
  ["Your opponent's attack stops this attack this turn.", 'El ataque del rival bloquea este ataque este turno.', 'O ataque do oponente bloqueia este ataque neste turno.', 'L\'attaque adverse bloque cette attaque ce tour-ci.', 'Die Attacke des Gegners sperrt diese Attacke in diesem Zug.', 'L\'attacco avversario blocca questo attacco in questo turno.'],
  [/^Switch in ((?:your|their) .+)$/, 'Cambiar a $1', 'Trocar por $1', 'Faire entrer $1', '$1 einwechseln', 'Far entrare $1'],
  [/^Bring up ((?:your|their) .+)$/, 'Traer a $1 al Puesto Activo', 'Trazer $1 para o Campo Ativo', 'Faire venir $1 au Poste Actif', '$1 in die Aktive Position holen', 'Portare $1 in Posizione Attiva'],
  [/^(\d+) from ((?:your|their) .+?) to ((?:your|their) .+)$/, '$1 {de:$2} {a:$3}', '$1 {de:$2} para $3', '$1 {de:$2} {sur:$3}', '$1 {von:$2} {auf:$3}', '$1 {di:$2} {su:$3}'],
  [/^(.+?) from ((?:your|their) .+?) to ((?:your|their) .+)$/, '$1 {de:$2} {a:$3}', '$1 {de:$2} para $3', '$1 {de:$2} {sur:$3}', '$1 {von:$2} {an:$3}', '$1 {di:$2} {a:$3}'],
  [/^(.+?) from ((?:your|their) .+)$/, '$1 {de:$2}', '$1 {de:$2}', '$1 {de:$2}', '$1 {von:$2}', '$1 {di:$2}'],
  [/^(.+?) to ((?:your|their) .+)$/, '$1 {a:$2}', '$1 {a:$2}', '$1 {à:$2}', '$1 {an:$2}', '$1 {a:$2}'],
  [/^((?:your|their|Their) .+)$/, '$1', '$1', '$1', '$1', '$1'],
  // Last, so every longer row that starts with Your wins first
  [/^(Your .+)$/, '$1', '$1', '$1', '$1', '$1'],
];
const I18N_FT_TYPES = {
  es: { Grass: 'Planta', Fire: 'Fuego', Water: 'Agua', Lightning: 'Rayo', Psychic: 'Psíquica', Fighting: 'Lucha', Darkness: 'Oscura', Metal: 'Metálica', Dragon: 'Dragón', Colorless: 'Incolora', Fairy: 'Hada' },
  pt: { Grass: 'Planta', Fire: 'Fogo', Water: 'Água', Lightning: 'Elétrica', Psychic: 'Psíquica', Fighting: 'Lutadora', Darkness: 'Escuridão', Metal: 'Metal', Dragon: 'Dragão', Colorless: 'Incolor', Fairy: 'Fada' },
  fr: { Grass: 'Plante', Fire: 'Feu', Water: 'Eau', Lightning: 'Électrique', Psychic: 'Psy', Fighting: 'Combat', Darkness: 'Obscurité', Metal: 'Métal', Dragon: 'Dragon', Colorless: 'Incolore', Fairy: 'Fée' },
  de: { Grass: 'Pflanzen', Fire: 'Feuer', Water: 'Wasser', Lightning: 'Elektro', Psychic: 'Psycho', Fighting: 'Kampf', Darkness: 'Finsternis', Metal: 'Metall', Dragon: 'Drachen', Colorless: 'Farblos', Fairy: 'Feen' },
  it: { Grass: 'Erba', Fire: 'Fuoco', Water: 'Acqua', Lightning: 'Lampo', Psychic: 'Psico', Fighting: 'Lotta', Darkness: 'Oscurità', Metal: 'Metallo', Dragon: 'Drago', Colorless: 'Incolore', Fairy: 'Folletto' },
};
const I18N_FT_EXACT = {};
I18N_FT_ROWS.forEach(r => { if (typeof r[0] === 'string') I18N_FT_EXACT[r[0]] = r; });
const I18N_FT_RE = I18N_FT_ROWS.filter(r => r[0] instanceof RegExp);
const I18N_FT_PRE = new RegExp('^(?:' + Object.keys(I18N_FT_EXACT).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).concat(I18N_FT_RE.map(r => r[0].source.replace(/^\^|\$$/g, ''))).join('|') + ')$');
// "your Dragapult ex" and "their Dragapult ex" from the page's choice labels, with the preposition the row
// puts in front ({de:$1} in a row), so each language can join them the way it does: "de tu", "do seu",
// "de votre", "von deinem", "del tuo". Every Pokémon is "das Pokémon" in German, so the endings never change.
const I18N_FT_OWN = {
  es: { mine: { '': 'tu $', de: 'de tu $', en: 'en tu $', a: 'a tu $' }, theirs: { '': '$ del rival', de: 'de $ del rival', en: 'en $ del rival', a: 'a $ del rival' } },
  pt: { mine: { '': 'seu $', de: 'do seu $', em: 'no seu $', a: 'ao seu $' }, theirs: { '': '$ do oponente', de: 'de $ do oponente', em: 'em $ do oponente', a: 'a $ do oponente' } },
  fr: { mine: { '': 'votre $', de: 'de votre $', sur: 'sur votre $', 'à': 'à votre $' }, theirs: { '': 'le $ adverse', de: 'du $ adverse', sur: 'sur le $ adverse', 'à': 'au $ adverse' } },
  de: { mine: { '': 'dein $', von: 'von deinem $', auf: 'auf deinem $', an: 'an dein $' }, theirs: { '': 'das gegnerische $', von: 'vom gegnerischen $', auf: 'auf dem gegnerischen $', an: 'an das gegnerische $' } },
  it: { mine: { '': 'il tuo $', di: 'del tuo $', su: 'sul tuo $', a: 'al tuo $' }, theirs: { '': '$ avversario', di: 'di $ avversario', su: 'su $ avversario', a: 'a $ avversario' } },
};
function i18nFtOwn(x, l, prep) {
  const m = /^(your|their) (.+?)( \((?:Active|Bench \d+)\))?$/i.exec(x);
  if (!m) {
    // 3.4.18: a log line's Pokémon with its spot and no "your" or "their": "Mega Rayquaza ex (Bench 2)".
    const t = /^(.+?) \((?:Active|Bench (\d+))\)$/.exec(x), Z = I18N_PZ[l];
    if (t && Z) x = t[1] + (t[2] ? ` (${Z.bench} ${t[2]})` : ` (${Z.act})`);
    return (prep ? prep + ' ' : '') + x;
  }
  const T = I18N_FT_OWN[l][/^y/i.test(m[1]) ? 'mine' : 'theirs'], w = T[prep || ''] || T[''];
  // Its spot when two of that name are in play: "(Bench 2)" reads "(Banca 2)".
  const Z = I18N_PZ[l], spot = !m[3] ? '' : / \(Active\)/.test(m[3]) ? ` (${Z.act})` : ` (${Z.bench} ${m[3].replace(/\D/g, '')})`;
  return w.replace('$', m[2]) + spot;
}
// The damage line, with its reasons in brackets: "120 damage to Gible (base 20, plus 100 from the attack's text)".
const I18N_FT_HIT = {
  es: { to: (n, x) => `${n} de daño a ${x}`, more: (n, x) => `${n} de daño más a ${x}`, bench: ' en la Banca', plus: 'más', minus: 'menos', base: 'base',
    text: 'por el texto del ataque', weak: 'por Debilidad', res: 'por Resistencia', fx: 'por otros efectos', double: 'el doble por Debilidad', times: n => `multiplicado por ${n} por Debilidad`, off: 'evitado por un efecto' },
  pt: { to: (n, x) => `${n} de dano em ${x}`, more: (n, x) => `mais ${n} de dano em ${x}`, bench: ' no Banco', plus: 'mais', minus: 'menos', base: 'base',
    text: 'pelo texto do ataque', weak: 'pela Fraqueza', res: 'pela Resistência', fx: 'por outros efeitos', double: 'dobrado pela Fraqueza', times: n => `multiplicado por ${n} pela Fraqueza`, off: 'evitado por um efeito' },
  fr: { to: (n, x) => `${n} dégâts à ${x}`, more: (n, x) => `${n} dégâts de plus à ${x}`, bench: ' sur le Banc', plus: 'plus', minus: 'moins', base: 'base',
    text: 'par le texte de l\'attaque', weak: 'par la Faiblesse', res: 'par la Résistance', fx: 'par d\'autres effets', double: 'doublés par la Faiblesse', times: n => `multipliés par ${n} par la Faiblesse`, off: 'empêchés par un effet' },
  de: { to: (n, x) => `${n} Schaden an ${x}`, more: (n, x) => `${n} zusätzlicher Schaden an ${x}`, bench: ' auf der Bank', plus: 'plus', minus: 'minus', base: 'Basis',
    text: 'durch den Angriffstext', weak: 'durch Schwäche', res: 'durch Resistenz', fx: 'durch andere Effekte', double: 'verdoppelt durch Schwäche', times: n => `mal ${n} durch Schwäche`, off: 'durch einen Effekt verhindert' },
  it: { to: (n, x) => `${n} danni a ${x}`, more: (n, x) => `altri ${n} danni a ${x}`, bench: ' in Panchina', plus: 'più', minus: 'meno', base: 'base',
    text: 'dal testo dell\'attacco', weak: 'dalla Debolezza', res: 'dalla Resistenza', fx: 'da altri effetti', double: 'raddoppiati dalla Debolezza', times: n => `moltiplicati per ${n} dalla Debolezza`, off: 'impediti da un effetto' },
};
function i18nFtDmg(l, n, x, bench, why, more) {
  const H = I18N_FT_HIT[l], who = i18nFtOwn(x, l, '');
  let out = (more ? H.more : H.to)(n, who) + (bench ? H.bench : '');
  if (!why) return out;
  const part = p => { let m;
    if ((m = /^base (\d+)$/.exec(p))) return H.base + ' ' + m[1];
    if (p === 'prevented by an effect') return H.off;
    if (p === 'doubled by Weakness') return H.double;
    if ((m = /^times (\d+) from Weakness$/.exec(p))) return H.times(m[1]);
    if ((m = /^(plus|minus) (\d+) from (the attack's text|Weakness|Resistance|other effects)$/.exec(p)))
      return H[m[1]] + ' ' + m[2] + ' ' + H[{ "the attack's text": 'text', Weakness: 'weak', Resistance: 'res', 'other effects': 'fx' }[m[3]]];
    return null; };
  const parts = why.split(', ').map(part);
  return parts.every(Boolean) ? out + ' (' + parts.join(', ') + ')' : null;
}
// The note under the result: Italian agrees the past participle with the cards taken ("ne ha presa 1").
const I18N_FT_AFTER = {
  es: (t, a, b) => `Tras ${t} turnos cada uno, tomaste ${a} ${a === 1 ? 'carta' : 'cartas'} de Premio y el rival tomó ${b}.`,
  pt: (t, a, b) => `Depois de ${t} turnos cada um, você pegou ${a} ${a === 1 ? 'carta' : 'cartas'} de Prêmio e o oponente pegou ${b}.`,
  fr: (t, a, b) => `Après ${t} tours chacun, vous avez pris ${a} ${a === 1 ? 'carte' : 'cartes'} Récompense et l'adversaire en a pris ${b}.`,
  de: (t, a, b) => `Nach je ${t} Zügen hast du ${a} ${a === 1 ? 'Preiskarte' : 'Preiskarten'} genommen und der Gegner ${b}.`,
  it: (t, a, b) => `Dopo ${t} turni a testa, hai preso ${a} ${a === 1 ? 'carta' : 'carte'} Premio e l'avversario ${b === 0 ? 'nessuna' : b === 1 ? 'ne ha presa 1' : 'ne ha prese ' + b}.`,
};
/** One Sparring text in language l, or null. A card name in it stays as it is. */
function i18nFtSent(s, l) {
  const i = I18N_FT_LANGS.indexOf(l) + 1; if (!i) return null;
  if (Object.prototype.hasOwnProperty.call(I18N_FT_EXACT, s)) return I18N_FT_EXACT[s][i];
  for (const r of I18N_FT_RE) {
    const m = r[0].exec(s); if (!m) continue;
    if (r[1] && r[1].fn) { const out = r[1].fn(m, l); return out && out.charAt(0).toUpperCase() + out.slice(1); }
    if (typeof r[1] === 'function') { const T = I18N_FT_TYPES[l][m[1]]; return T ? r[1]()[i - 1].replace('$T', T) : null; }
    const out = r[i].replace(/\{([^:}]+):\$(\d)\}/g, (x, p, n) => i18nFtOwn(m[+n] || '', l, p)).replace(/\$(\d)/g, (x, n) => m[+n] == null ? '' : i18nFtOwn(m[+n], l, ''));
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  return null;
}
// Only on the Sparring page (opponent/play.js sets RD_FT), so these broad rows never touch the app's own text.
const I18N_FT_ON = typeof window !== 'undefined' && !!window.RD_FT;
if (I18N_FT_ON) I18N_PAT.unshift([I18N_FT_PRE, m => i18nFtSent(m, 'es'), m => i18nFtSent(m, 'pt')]);

const I18N_GT = {
  es: (function () {
    const Y = I18N_AB_TYP.es, n1 = n => +n === 1, cap = s => s.charAt(0).toUpperCase() + s.slice(1), pl = s => / y | o |, | más$/.test(s);
    const ROLE = { gust: 'trae un Pokémon de la Banca', switch: 'cambia tu Pokémon Activo', draw: 'te hace robar cartas', search: 'busca cartas en tu baraja',
      recovery: 'recupera cartas de tu pila de descartes', energy: 'ayuda a pagar los costes de Energía', survive: 'mantiene vivo más tiempo a un atacante', damage: 'suma daño',
      heal: 'cura', disrupt: 'entorpece a tu rival', bench: 'llena tu Banca', evolve: 'acelera la evolución', discard: 'llena tu pila de descartes', protect: 'bloquea daño',
      reduce: 'reduce el daño que reciben tus Pokémon', prize: 'toma cartas de Premio extra', attack: 'le da otro ataque a un Pokémon', coins: 'permite volver a lanzar las monedas de un ataque',
      denial: 'quita Energía a tu rival', hand: 'entorpece la mano de tu rival', tools: 'descarta Herramientas Pokémon', fossil: 'se juega como un Pokémon Básico del que evolucionar',
      swapin: 'saca a jugar un Pokémon de tu pila de descartes', devolve: 'involuciona tus Pokémon para volver a usarlos', order: 'prepara la parte de arriba de tu baraja',
      prizes: 'cambia tus cartas de Premio', cure: 'quita Condiciones Especiales', healup: 'hace más fuerte la curación' };
    const DO = { gust: 'traer un Pokémon de la Banca', switch: 'cambiar tu Pokémon Activo', draw: 'hacerte robar cartas', search: 'buscar tus Pokémon',
      recovery: 'recuperar cartas de tu pila de descartes', energy: 'ayudar a pagar los costes de Energía', survive: 'mantener vivo más tiempo a un atacante', damage: 'sumar daño',
      heal: 'curar', disrupt: 'entorpecer a tu rival', bench: 'llenar tu Banca', evolve: 'acelerar la evolución', discard: 'llenar tu pila de descartes', protect: 'bloquear daño',
      reduce: 'reducir el daño que reciben tus Pokémon', prize: 'tomar cartas de Premio extra', attack: 'darle otro ataque a un Pokémon', coins: 'volver a lanzar las monedas de un ataque',
      denial: 'quitarle Energía a tu rival', hand: 'entorpecer la mano de tu rival', tools: 'descartar Herramientas Pokémon', fossil: 'jugarse como un Pokémon Básico del que evolucionar',
      swapin: 'sacar a jugar un Pokémon de tu pila de descartes', devolve: 'involucionar tus Pokémon para volver a usarlos', order: 'preparar la parte de arriba de tu baraja',
      prizes: 'cambiar tus cartas de Premio', cure: 'quitar Condiciones Especiales', healup: 'hacer más fuerte la curación' };
    const roles = k => k.map(r => ROLE[r]).join(' y ');
    const KIND = { Supporter: ['Partidario', 'Partidarios'], 'Pokemon Tool': ['Herramienta Pokémon', 'Herramientas Pokémon'], Stadium: ['Estadio', 'Estadios'], Item: ['Objeto', 'Objetos'] };
    const STG = { Basic: ['Básico', 'Básicos'], 'Stage 1': ['de Fase 1', 'de Fase 1'], 'Stage 2': ['de Fase 2', 'de Fase 2'], Evolution: ['Evolución', 'Evolución'], 'Mega Evolution': ['Megaevolución', 'Megaevolución'] };
    const TAG = { Tera: ['Teracristal', 'Teracristal'], Ancient: ['Antiguo', 'Antiguos'], Future: ['Futuro', 'Futuros'] };
    const own = w => String(w).replace(/'s$/, '');
    const KO = 'Fuera de Combate';
    const MU = { Even: 'Parejo', Favored: 'Favorable', Unfavored: 'Desfavorable', 'Leans favored': 'Algo favorable', 'Leans unfavored': 'Algo desfavorable', 'Too few games': 'Pocas partidas' };
    const RAW = 'solo con lo que robas';
    const T = {
      a: e => 'una ' + e,
      list: (a, c, more) => { const j = c === 'or' ? ' o ' : ' y ';
        if (more) return a.join(', ') + j + more.n + ' más';
        return a.length > 1 ? a.slice(0, -1).join(', ') + j + a[a.length - 1] : a[0]; },
      kind: (k, m) => KIND[k][m ? 1 : 0], supName: x => `un Partidario con "${x}" en el nombre`, supOf: (w, m) => `${m ? 'Partidarios' : 'Partidario'} de ${own(w)}`,
      q: (q, m) => { let s = 'Pokémon' + (q.ex ? ' ex' : '');
        if (q.stage) s += ' ' + STG[q.stage][m ? 1 : 0];
        if (q.tag) s += ' ' + TAG[q.tag][m ? 1 : 0];
        if (q.owner) s += ' de ' + q.owner;
        if (q.type) s += ' de tipo ' + Y[q.type];
        if (q.noRule) s += ' sin Recuadro de regla';
        if (q.hp) s += ` con ${q.hp} PS o menos`;
        return s; },
      its: a => 'Su ' + a,
      gap: g => g.k === 'gust' ? (g.n ? `solo ${g.n} ${n1(g.n) ? 'carta trae' : 'cartas traen'} un Pokémon de la Banca` : g.other ? 'nada más en la lista trae un Pokémon de la Banca' : 'nada trae un Pokémon de la Banca')
        : g.k === 'find' ? (g.n ? `solo ${g.other ? 'otras ' : ''}${g.n} ${n1(g.n) ? 'carta busca' : 'cartas buscan'} Pokémon` : g.other ? 'nada más busca Pokémon' : 'nada en la lista busca Pokémon')
        : g.k === 'draw' ? (g.n ? `solo ${g.other ? 'otras ' : ''}${g.n} ${n1(g.n) ? 'carta roba' : 'cartas roban'}` : 'nada en la lista roba cartas')
        : 'nada recupera cartas de tu pila de descartes',
      // Matchups and meta.
      mu: (x, k, p, n) => `${x}: ${MU[k]}, ${p}% en ${n} partidas`,
      allLists: x => `Estos son resultados de todas las listas de ${x}, no de tu lista exacta.`,
      overSame: (n, p) => `en ${n} partidas, más o menos igual que antes (${p}).`,
      sinceFew: (d, n) => `Desde que salió la expansión más reciente (${d}): ${n} ${n1(n) ? 'partida' : 'partidas'} hasta ahora, muy pocas para ver una tendencia.`,
      wrFew: n => `Porcentaje de victorias: ${n} ${n1(n) ? 'partida' : 'partidas'} hasta ahora, muy pocas para juzgar.`,
      muSince: (n, d) => `Enfrentamientos contra las ${n} barajas más jugadas desde el ${d}`,
      gray: n => `Las filas grises tienen menos de ${n} partidas, muy pocas para fiarse.`,
      perRow: n => `${n} ${n1(n) ? 'carta' : 'cartas'} por fila`,
      showAll: (n, k) => k === 'days' ? `Mostrar los ${n} días` : `Mostrar las ${n} barajas`,
      updated: d => `Actualizada el ${d}`,
      letter: d => `Carta de Pokémon TCG Live a la comunidad, ${d}`,
      startWith: x => `Empezar una partida de premios con ${x}`,
      moreFor: x => `Más opciones para ${x}`,
      markCards: k => `Las cartas con marca ${k}`,
      inHand: (x, a, k, p, b) => `Esto cuenta a ${x} en la mano, no con toda su fuerza: hace ${a} hasta que tienes ${k} ${p} en tu pila de descartes, y luego ${b}.`,
      inHand2: (x, a, p, b, k) => `Esto cuenta a ${x} en la mano, no con toda su fuerza: hace ${a} con 2 ${p} en tu pila de descartes y ${b} cuando tienes ${k}.`,
      // Attacker odds.
      readyBy: (x, h, t, a, b) => `${x} ${h ? 'en la mano' : 'listo'} para el turno ${t}: ${a}${b ? ' a ' + b : ''}`,
      floor: p => `${p} es ${RAW}, el mínimo.`,
      noRaise: p => `${p} ${RAW}, y tus cartas de búsqueda no lo suben.`,
      byTurn: (t, a, b) => `Para el turno ${t}: ${a}${b ? ' a ' + b : ''}.`,
      nAtk: n => `Esta lista tiene ${n} atacantes y elige el que necesita cada turno.`,
      howLead: (x, t) => `Aquí ves qué tan seguido puedes tener a ${x}, el que encabeza la calificación, listo para tu ${t === 2 ? 'segundo' : 'tercer'} turno.`,
      howWhy: (w, t) => `${{ name: 'El atacante que da nombre a su baraja del meta', pick: 'El atacante principal que elegiste', core: 'El atacante en torno al que se construye esta lista' }[w]}, y qué tan seguido puedes tenerlo listo para tu ${t === 2 ? 'segundo' : 'tercer'} turno.`,
      atkBy: t => `Atacante para T${t}, cualquier mano`,
      anyHand: (x, h, k) => `${x}${h ? ' en la mano' : ''}, cualquier mano inicial, ${{ same: `igual ${RAW} o con tus cartas de búsqueda`, range: `desde ${RAW} hasta con tus cartas de búsqueda`, raw: RAW }[k]}`,
      noFrom: (x, s) => `${x} es de Fase ${s}, pero un Pokémon del que evoluciona no está en la lista, así que solo puede llegar al juego con otras cartas.`,
      need1: (a, b) => `Necesita a ${a} para el turno 1 y luego a ${b} para el turno 2 (nada evoluciona en su primer turno en juego).`,
      needCandy: (a, b, c) => `Necesita a ${a} para el turno 1 y luego a ${b} y Rare Candy para el turno 2${c ? ` (la ruta de ${c} necesita hasta el turno 3)` : ''}.`,
      need3: (a, b, c) => `Necesita a ${a} para el turno 1 y a ${b} para el turno 2, y luego a ${c} en el turno 3 (no hay Rare Candy en la lista, y nada evoluciona en su primer turno en juego).`,
      needSeen: (a, n) => `Necesita a ${a} entre tus primeras ${n} cartas.`,
      // How tightly the list fits.
      fitLines: n => `tus Pokémon están repartidos en ${n} líneas`,
      fitSingles: (a, b, pk) => `${a} de tus ${b} ${pk ? 'Pokémon' : 'Entrenadores'} ${n1(a) ? 'es una sola copia' : 'son copias únicas'}`,
      fitTypes: n => `tus ataques necesitan ${n} tipos de Energía`,
      fitUse: p => `cada atacante solo puede usar cerca del ${p}% de tu Energía`,
      fit: (how, cs) => (how ? 'Qué tan compacta es la lista' : 'Menos de tus cartas tiran para el mismo lado') + (cs.length ? ': ' + cs.join(' y ') : '') + '.',
      // Trainer fit lines.
      little: (n, sw) => `${n1(n) ? 'Una carta aporta' : n + ' cartas aportan'} poco aquí${sw === 'each' ? (n1(n) ? ', con una idea de cambio' : ', con una idea de cambio para cada una') : sw === 'below' ? ', con ideas de cambio abajo' : ''}.`,
      role1: (k, n) => cap(roles(k)) + (n ? `, una de las ${n} cartas que lo hacen` : '') + '.',
      roleOnly: (k, c) => `${cap(roles(k))}: tu ${c ? 'única carta' : 'único Entrenador'} que lo hace.`,
      roleOf: (k, a, b) => `${cap(roles(k))}: ${a} de las ${b} cartas que lo hacen.`,
      crowded: (k, n) => `${cap(roles(k))}, pero otras ${n} cartas de la lista ya lo hacen, más de las que lleva la mayoría de las listas ganadoras, así que esta aporta poco.`,
      unplayed: k => `${cap(roles(k))}, pero ninguna lista ganadora de eventos recientes la lleva.`,
      payFor: (x, a, b) => `Ayuda a pagar los costes de Energía de ${x}${a ? `, ${a} de las ${b} cartas que lo hacen` : ''}.`,
      skips: (a, b) => `Se salta ${a ? 'a ' + a : 'la Fase 1'} para sacar a ${b} un turno antes.`,
      skipsMid: (a, b) => `${a} se salta la fase intermedia para poner en juego a ${b} rápido.`,
      needsOn: (a, b) => `Necesita a ${a} en la lista para poner encima a ${b}, y no hay en la lista.`,
      needsNone: w => `Necesita ${w}, y no hay en la lista.`,
      needsAce: w => `Necesita ${w}, que esta lista no lleva.`,
      aceFills: (x, k, g) => `${x} ${roles(k)}, y eso cubre un hueco: ${T.gap(g)}.`,
      aceBetter: (x, g) => `${x} podría encajar mejor, ya que ${T.gap(g)}.`,
      aceWould: (x, k, g) => `${x} serviría para ${DO[k]}, y ${T.gap(g)}.`,
      swap: (x, more, g) => `Idea de cambio: ${more ? 'una copia más de ' : ''}${x}, ya que ${T.gap(g)}.`,
      aceDoes: (x, k) => `${x} ${roles(k)}.`,
      // In this deck: notes.
      anyLike: (find, n, w, li, en) => `${find ? 'Busca' : 'Puede poner en la Banca'} cualquiera de tus ${n} ${w}, como ${li}${en ? ', o ' + en : ''}.`,
      benchAll: li => `Puede poner en la Banca a la vez todos los Básicos que llevas, como ${li}.`,
      verbList: (k, li, e) => ({ Finds: `Busca ${li}`, 'Can Bench': `Puede poner en la Banca a ${li}`, 'Gets back': `Recupera ${li}`, 'Works on': `Funciona con ${li}`,
        'Can evolve straight into': `Puede evolucionar directamente a ${li}`, 'Fully heals': `Cura todo el daño de ${li}`, shields: `Protege a ${li} de los efectos de ataques, como las Condiciones Especiales`,
        keeps: `Mantiene a ${li} libre de Condiciones Especiales`, 'Can fetch a single copy like your': `Puede buscar una copia única, como ${li}` })[k] + (e ? `, ${e.or ? 'o' : 'y'} ${e.e}` : '') + '.',
      backLike: (mix, ko, li, e) => `Recupera ${mix ? 'cualquier combinación de ' : ''}Pokémon${ko ? ` que quedaron ${KO}` : ''}, como ${li}${e ? `, ${e.or ? 'o' : 'y'} ${e.e}` : ''}.`,
      shuffleKo: li => `Devuelve a tu baraja Pokémon que quedaron ${KO}, como ${li}.`,
      energyFor: (back, en, x) => back ? `Recupera ${en} para ${x}.` : `Devuelve ${en} a tu baraja para ${x}.`,
      withOdds: (n, w, d, p) => `Con ${n} ${w} en tus ${d} cartas, ${p ? `encuentra uno cerca del ${p}% de las veces` : 'casi siempre encuentra uno'}.`,
      takesHp: (x, a, b, y, c) => `Lleva a ${x} de ${a} a ${b} PS${y ? `, o a ${y} a ${c}` : ''}.`,
      goesFrom: (xa, a, b, ex) => `${cap(xa)} pasa de ${a} a ${b}${ex ? ' contra Pokémon ex' : ''}.`,
      prizeFor: (x, a, b, once) => `Con ${x}, tu rival toma ${a} ${n1(a) ? 'carta de Premio' : 'cartas de Premio'} por él, no ${b}${once ? ', una vez por partida' : ''}.`,
      koNeed: (x, t, a, b) => `Con ${x}, los atacantes de tipo ${Y[t]} necesitan ${a} de daño para dejarlo ${KO}, no ${b}.`,
      aLike: (w, x) => `un ${w} como ${x}`,
      putsE: (n, li, once, wh) => `Une ${n ? n + ' ' : ''}${n && !n1(n) ? 'Energías' : 'Energía'} a ${li}${once ? ' a la vez' : ''}${wh ? `, una vez que ${wh} está en juego` : ''}.`,
      spare: (li, n) => `Convierte Pokémon sobrantes, como ${li}, en ${n} cartas cada uno.`,
      onTypeBench: (t, x, n, li) => `Con un Pokémon de tipo ${Y[t]} como ${x}, pone en la Banca hasta ${n} de estos: ${li}.`,
      picks: (n, e) => `Elige ${n} de tus ${e}.`,
      payColorless: li => `Puede pagar la Energía Incolora de ${li}.`,
      onPays: (x, n, c, a, turn) => `Con ${x}, paga ${n ? n + ' de las Energías' + (c ? ' Incoloras' : '') : 'la Energía' + (c ? ' Incolora' : '')} de ${a}${turn ? ', durante un turno' : ''}.`,
      paysFor: (n, xa) => `Paga ${n} de las Energías de ${xa}.`,
      anyType: (w, x, a) => `Con un ${w} como ${x}, cuenta como de cualquier tipo para ${a}.`,
      wholeLine: li => `Consigue toda la línea de ${li} a la vez.`,
      withEnergy: (li, your) => `${your ? 'Consigue' : 'Busca'} a la vez ${li} y una Energía.`,
      together: li => `Consigue a la vez ${li}.`,
      findsFewer: (w, a, b) => `Tu lista no tiene ${w}, así que encuentra ${a} ${n1(a) ? 'carta' : 'cartas'}, no ${b}.`,
      oneGo: (a, b) => `Puede convertir a ${a} en ${b} de una vez.`,
      benchSpots: (n, li) => `Te da ${n} espacios en la Banca mientras ${li} está en juego.`,
      drawsAfter: (n, k, w) => `Roba ${n} después de ${n1(k) ? 'tu Partidario' : `cualquiera de tus ${k} Partidarios`} de ${own(w)}.`,
      everyIs: (w, n) => `Todos los Pokémon de tu lista son ${w}, así que roba hasta tener ${n}.`,
      worksKo: li => `Funciona cuando ${li} queda ${KO}.`,
      takeDmg: (li, n, less, w) => less ? `Tus ${li} reciben ${n} de daño menos${w === 'too' ? ' también' : w === 'that turn' ? ' ese turno' : ''}.`
        : `Tus propios ${li} reciben ${n} de daño${w === 'when you Bench them' ? ' cuando los pones en la Banca' : w === 'too' ? ' también' : ''}.`,
      dropsTo: (x, n) => `Tu propio ${x} también baja a ${n} PS.`,
      fits: (li, one, n, s, k) => `Encaja con ${li}, que ${one ? 'ataca' : 'atacan'} con ${n} Energías o más${s ? `; ${s} lo deja en ${k}` : ''}.`,
      healsMove: (n, li) => `Cura ${n} cuando mueve a ${li} a tu Banca.`,
      grabWith: x => `Puede buscar tu ${x} junto con Partidarios.`,
      tooBig: (x, n) => `${x} es demasiado grande para esta carta (${n} PS).`,
      retreat: (li, x, n, c) => `Permite que ${li} ${pl(li) ? 'se retiren' : 'se retire'} gratis${x ? `; ${x} sigue pagando ${n}` : c ? ` (ahora le cuesta ${c})` : ''}.`,
      evolveNow: (a, b) => `Permite que ${a} evolucione a ${b} el turno en que lo juegas.`,
      offOwn: li => `También anula ${li} de tu lado.`,
      runNo: (x, k) => `No llevas ${x}, así que ${{ hp: 'solo pierden PS los de tu rival', off: 'solo anula las de tu rival', pays: 'solo tu rival paga más', helps: 'solo ayuda a los de tu rival' }[k]}.`,
      comesBack: xa => `Vuelve después de que ${xa} la descarte.`,
      poisoned: x => `Se activa una vez que tu propio Pokémon está Envenenado, cosa que hace ${x} aquí.`,
      takesE: (a, b, e) => `Toma ${a} de tus ${b} ${e} a la vez.`,
      benchesUp: (n, w) => `Pone en la Banca hasta ${n} ${w} a la vez.`,
      switchBetween: li => `Intercambia entre tus ${li} una vez por turno.`,
      // How it plays.
      doesAtk: x => `${x} es quien ataca.`,
      playsAs: x => `La lista juega como ${x}, una baraja que lleva su nombre.`,
      playsEng: (x, e, k, atk, a, p) => `La lista juega como ${x}, una baraja con el nombre de ${e}, un Pokémon ${{ setsA: 'que prepara a los atacantes', powA: 'que impulsa a los atacantes en lugar de atacar', setsT: 'que los prepara', powT: 'que los impulsa en lugar de atacar' }[k]}: ${atk ? 'su ataque' : 'su Habilidad'} ${a} ${p}.`,
      playsAsOne: x => `La lista juega como ${x}, y de los Pokémon que dan nombre a esa baraja, este es con el que la lista está hecha para atacar.`,
      copies: (you, n, f) => `${you ? 'Lo elegiste como atacante principal' : 'Es el atacante en torno al que se construye esta lista'}: ${n} ${n1(n) ? 'copia' : 'copias'}${f ? ` más ${f} Pokémon de los que evoluciona` : ''}.`,
      most: (x, n) => `${x} es el que la lista lleva en más copias (${n}).`,
      box: n => `${n} Pokémon distintos pueden cargar con el ataque, y eliges el que encaja en cada turno.`,
      hits: (s, avg, n, coins) => `${cap(s)} ${avg ? 'hace de media' : 'hace'} ${n} de daño${coins ? ' con sus lanzamientos de moneda' : ''}.`,
      handEst: (s, n, k) => `${s} cuenta las cartas de tu mano: unos ${n} con ${k} cartas, una estimación de la app, no un número impreso.`,
      boardEst: (s, n) => `${s} depende de la mesa, así que ${n} es una estimación de la app, no un número impreso.`,
      wall: s => `${s} evita todo el daño que le hacen los ataques de los Pokémon ex de tu rival, así que los atacantes ex no pueden dejarlo ${KO}.`,
      boost: (s, n, e, h, hp) => `${s} suma ${n} a sus ataques mientras tiene ${e} unida${h ? `, así que hace ${h}` : ''}${hp ? `, y le da ${hp} PS más` : ''}.`,
      ownDmg: (s, n, act) => `${s} pone ${n} contadores de daño en 1 de los Pokémon de tu rival cada turno${act ? ' mientras está en el Puesto Activo' : ''}.`,
      kox: (s, n, x) => `${s} deja ${KO} al Pokémon Activo de tu rival cuando tiene exactamente ${n} contadores de daño${x ? `, y ${x} puede ponérselos` : ''}, así que la calificación lo cuenta como un golpe que derriba a cualquiera.`,
      pileDmg: (s, n, p, b, c, k) => `${s} hace ${n} más por cada ${p} en tu pila de descartes: ${b} con 2 ahí, ${c} cuando tienes ${k}.`,
      eScale: (s, en, on, n, alt, opp) => `${s} cuenta la ${en || 'Energía'} unida ${{ 'both Active Pokemon': 'a ambos Pokémon Activos', 'all your Pokemon': 'a todos tus Pokémon', itself: 'a sí mismo' }[on]}, así que cada una que unes ${on === 'all your Pokemon' ? 'en cualquier parte de tu lado' : 'a él'} suma ${n}${alt ? ` (${alt.n} por ${alt.e} con ${alt.by} en juego)` : ''}${opp ? ', y la Energía de tu rival también le suma' : ''}.`,
      discEach: (s, en, n) => `${s} descarta ${en} de tus Pokémon y hace ${n} por cada una, así que cada una que unes en cualquier parte de tu lado suma ${n} a su siguiente gran golpe.`,
      discNext: (n, k, e, need) => `Eso cuenta los ${n} más que hace cuando descarta ${e === 'all' ? 'toda su Energía' : k + ' ' + e} de sí mismo, así que ${need === 'all' ? 'hay que volver a cargarlo' : need === 1 ? 'necesita otra unida' : `necesita ${need} más unidas`} antes del siguiente gran golpe.`,
      discEach2: (k, e, need) => `Descarta ${e === 'all' ? 'toda su Energía' : k + ' ' + e} de sí mismo cada vez, así que ${need === 'all' ? 'hay que volver a cargarlo' : need === 1 ? 'necesita otra unida' : `necesita ${need} más unidas`} antes de poder golpear tan fuerte otra vez.`,
      lock: (a, b) => `No puede usar ${a} dos turnos seguidos, así que ${b ? `usa ${b} o ` : ''}saca a otro atacante en el turno intermedio.`,
      lockAll: a => `No puede atacar en su siguiente turno después de ${a}, así que cambia a otro atacante en el turno intermedio.`,
      copyBench: s => `${s} le permite usar los ataques de tus Pokémon en Banca, pagados con su propia Energía.`,
      bestHere: (xa, avg, n) => `El mejor aquí es ${xa}, que ${avg ? 'hace de media' : 'hace'} ${n}.`,
      copiesWith: (xa, a) => `Copia ${xa} con ${a}.`,
      mill: s => `${s} usa un ataque de un Pokémon sin Recuadro de regla que sale de la parte de arriba de tu baraja.`,
      inList: li => `En esta lista son ${li}.`,
      putFirst: li => `${li} ${pl(li) ? 'ponen' : 'pone'} ahí primero el que quieres.`,
      useOff: (x, y, a, e) => `${x} puede usar los ataques de ${y} con ${a} cuando sale de la parte de arriba de tu baraja, así que ${y} no necesita ${i18nEnName(e, 'es')} propia.`,
      copyPay: (x, y, a, en) => `${x} copia los ataques de ${y} con ${a}, pagando solo su propio coste, así que ${y} no necesita su propia ${en}.`,
      evoWithout: (x, f, y) => `${x} evoluciona de ${f}, y ${y} puede evolucionar a él, así que la línea funciona sin un ${f} normal.`,
      benchSelf: (x, a) => `${x} puede ponerse en tu Banca desde tu mano con ${a}, así que no necesita evolucionar.`,
      forAbil: (their, k, li) => `Se ${their ? 'juegan' : 'juega'} sobre todo por ${their ? 'sus Habilidades' : 'su Habilidad'}, para ${{ both: 'robar y buscar', draw: 'robar cartas', search: 'buscar en tu baraja' }[k]}: ${li}.`,
      colorless: their => their ? 'Sus ataques solo cuestan Energía Incolora, así que la Energía de la lista no se elige para ellos.' : 'Su ataque solo cuesta Energía Incolora, así que la Energía de la lista no se elige para él.',
      dmgFrom: (pl2, names) => `Daño de ${pl2 ? 'Habilidades' : 'una Habilidad'}: ${names}`,
      abPuts: (xa, n) => `${xa} pone ${n} contadores de daño en 1 de los Pokémon de tu rival`,
      onTop: ps => `${cap(ps.join(', y '))}, además de tu ataque de ese turno.`,
      koSelf: li => `Usarla deja ${KO} a ${li}, lo que le da un premio a tu rival, así que sirve para rematar, no para empezar.`,
      attackers: l => `Atacantes: ${l}`,
      hitAny: (a, n, d) => n1(n) ? `${a} puede hacer ${d} de daño a cualquier Pokémon de tu rival, también a los de la Banca.` : null,
      itsAb: (a, p) => `Su ${a} ${p.replace(/\.$/, '')}.`,
      withAb: (a, p) => `Con su ${a}, ${p.replace(/\.$/, '')}.`,
      alsoAtk: (a, p) => `${a} también ${p.replace(/\.$/, '')}.`,
      grows: (s, b, c, k, p) => `${s} crece a medida que se llena tu pila de descartes: ${b} al principio, ${c} cuando tienes ${k} ${p} ahí.`,
      alsoBench: (a, n, k) => `${a} también hace ${n} de daño a ${k} de los Pokémon en Banca de tu rival.`,
    };
    return T;
  })(),
  pt: (function () {
    const Y = I18N_AB_TYP.pt || I18N_AB_TYP.es, n1 = n => +n === 1, cap = s => s.charAt(0).toUpperCase() + s.slice(1), pl = s => / e | ou |, | mais$/.test(s);
    const ROLE = { gust: 'puxa um Pokémon do Banco', switch: 'troca seu Pokémon Ativo', draw: 'faz você comprar cartas', search: 'busca cartas no seu deck',
      recovery: 'recupera cartas da sua pilha de descarte', energy: 'ajuda a pagar os custos de Energia', survive: 'mantém um atacante vivo por mais tempo', damage: 'aumenta o dano',
      heal: 'cura', disrupt: 'atrapalha o oponente', bench: 'enche seu Banco', evolve: 'acelera a evolução', discard: 'enche sua pilha de descarte', protect: 'bloqueia dano',
      reduce: 'reduz o dano que seus Pokémon recebem', prize: 'pega cartas de Prêmio extras', attack: 'dá outro ataque a um Pokémon', coins: 'permite jogar de novo as moedas de um ataque',
      denial: 'tira Energia do oponente', hand: 'atrapalha a mão do oponente', tools: 'descarta Ferramentas Pokémon', fossil: 'é jogado como um Pokémon Básico para evoluir',
      swapin: 'coloca em jogo um Pokémon da sua pilha de descarte', devolve: 'faz seus Pokémon involuírem para usá-los de novo', order: 'prepara o topo do seu deck',
      prizes: 'troca suas cartas de Prêmio', cure: 'remove Condições Especiais', healup: 'deixa a cura mais forte' };
    const DO = { gust: 'puxar um Pokémon do Banco', switch: 'trocar seu Pokémon Ativo', draw: 'fazer você comprar cartas', search: 'buscar seus Pokémon',
      recovery: 'recuperar cartas da sua pilha de descarte', energy: 'ajudar a pagar os custos de Energia', survive: 'manter um atacante vivo por mais tempo', damage: 'aumentar o dano',
      heal: 'curar', disrupt: 'atrapalhar o oponente', bench: 'encher seu Banco', evolve: 'acelerar a evolução', discard: 'encher sua pilha de descarte', protect: 'bloquear dano',
      reduce: 'reduzir o dano que seus Pokémon recebem', prize: 'pegar cartas de Prêmio extras', attack: 'dar outro ataque a um Pokémon', coins: 'jogar de novo as moedas de um ataque',
      denial: 'tirar Energia do oponente', hand: 'atrapalhar a mão do oponente', tools: 'descartar Ferramentas Pokémon', fossil: 'ser jogado como um Pokémon Básico para evoluir',
      swapin: 'colocar em jogo um Pokémon da sua pilha de descarte', devolve: 'fazer seus Pokémon involuírem para usá-los de novo', order: 'preparar o topo do seu deck',
      prizes: 'trocar suas cartas de Prêmio', cure: 'remover Condições Especiais', healup: 'deixar a cura mais forte' };
    const roles = k => k.map(r => ROLE[r]).join(' e ');
    const KIND = { Supporter: ['Apoiador', 'Apoiadores'], 'Pokemon Tool': ['Ferramenta Pokémon', 'Ferramentas Pokémon'], Stadium: ['Estádio', 'Estádios'], Item: ['Item', 'Itens'] };
    const STG = { Basic: ['Básico', 'Básicos'], 'Stage 1': ['de Estágio 1', 'de Estágio 1'], 'Stage 2': ['de Estágio 2', 'de Estágio 2'], Evolution: ['de Evolução', 'de Evolução'], 'Mega Evolution': ['Megaevolução', 'Megaevolução'] };
    const TAG = { Tera: ['Teracristal', 'Teracristal'], Ancient: ['Antigo', 'Antigos'], Future: ['Futuro', 'Futuros'] };
    const own = w => String(w).replace(/'s$/, '');
    const MU = { Even: 'Equilibrado', Favored: 'Favorecido', Unfavored: 'Desfavorecido', 'Leans favored': 'Levemente favorecido', 'Leans unfavored': 'Levemente desfavorecido', 'Too few games': 'Poucas partidas' };
    const RAW = 'só com o que você compra';
    const T = {
      a: e => 'uma ' + e,
      list: (a, c, more) => { const j = c === 'or' ? ' ou ' : ' e ';
        if (more) return a.join(', ') + j + more.n + ' mais';
        return a.length > 1 ? a.slice(0, -1).join(', ') + j + a[a.length - 1] : a[0]; },
      kind: (k, m) => KIND[k][m ? 1 : 0], supName: x => `um Apoiador com "${x}" no nome`, supOf: (w, m) => `${m ? 'Apoiadores' : 'Apoiador'} de ${own(w)}`,
      q: (q, m) => { let s = 'Pokémon' + (q.ex ? ' ex' : '');
        if (q.stage) s += ' ' + STG[q.stage][m ? 1 : 0];
        if (q.tag) s += ' ' + TAG[q.tag][m ? 1 : 0];
        if (q.owner) s += ' de ' + q.owner;
        if (q.type) s += ' do tipo ' + Y[q.type];
        if (q.noRule) s += ' sem Caixa de Regras';
        if (q.hp) s += ` com ${q.hp} PS ou menos`;
        return s; },
      its: a => 'Seu ' + a,
      gap: g => g.k === 'gust' ? (g.n ? `só ${g.n} ${n1(g.n) ? 'carta puxa' : 'cartas puxam'} um Pokémon do Banco` : g.other ? 'nada mais na lista puxa um Pokémon do Banco' : 'nada puxa um Pokémon do Banco')
        : g.k === 'find' ? (g.n ? `só ${g.n} ${g.other ? (n1(g.n) ? 'outra carta busca' : 'outras cartas buscam') : (n1(g.n) ? 'carta busca' : 'cartas buscam')} Pokémon` : g.other ? 'nada mais busca Pokémon' : 'nada na lista busca Pokémon')
        : g.k === 'draw' ? (g.n ? `só ${g.n} ${g.other ? (n1(g.n) ? 'outra carta compra' : 'outras cartas compram') : (n1(g.n) ? 'carta compra' : 'cartas compram')}` : 'nada na lista compra cartas')
        : 'nada recupera cartas da sua pilha de descarte',
      // Matchups and meta.
      mu: (x, k, p, n) => `${x}: ${MU[k]}, ${p}% em ${n} partidas`,
      allLists: x => `Estes são resultados de todas as listas de ${x}, não da sua lista exata.`,
      overSame: (n, p) => `em ${n} partidas, mais ou menos o mesmo de antes (${p}).`,
      sinceFew: (d, n) => `Desde que saiu a coleção mais nova (${d}): ${n} ${n1(n) ? 'partida' : 'partidas'} até agora, poucas demais para ver uma tendência.`,
      wrFew: n => `Taxa de vitória: ${n} ${n1(n) ? 'partida' : 'partidas'} até agora, poucas demais para avaliar.`,
      muSince: (n, d) => `Confrontos contra os ${n} decks mais jogados desde ${d}`,
      gray: n => `As linhas cinza têm menos de ${n} partidas, poucas demais para confiar.`,
      perRow: n => `${n} ${n1(n) ? 'carta' : 'cartas'} por linha`,
      showAll: (n, k) => k === 'days' ? `Mostrar os ${n} dias` : `Mostrar os ${n} decks`,
      updated: d => `Atualizada em ${d}`,
      letter: d => `Carta do Pokémon TCG Live à comunidade, ${d}`,
      startWith: x => `Começar um jogo de prêmios com ${x}`,
      moreFor: x => `Mais opções para ${x}`,
      markCards: k => `As cartas com marca ${k}`,
      inHand: (x, a, k, p, b) => `Isto conta ${x} na mão, não com força total: causa ${a} até você ter ${k} ${p} na sua pilha de descarte, e depois ${b}.`,
      inHand2: (x, a, p, b, k) => `Isto conta ${x} na mão, não com força total: causa ${a} com 2 ${p} na sua pilha de descarte e ${b} quando você tem ${k}.`,
      // Attacker odds.
      readyBy: (x, h, t, a, b) => `${x} ${h ? 'na mão' : 'pronto'} até o turno ${t}: ${a}${b ? ' a ' + b : ''}`,
      floor: p => `${p} é ${RAW}, o mínimo.`,
      noRaise: p => `${p} ${RAW}, e suas cartas de busca não aumentam isso.`,
      byTurn: (t, a, b) => `Até o turno ${t}: ${a}${b ? ' a ' + b : ''}.`,
      nAtk: n => `Esta lista tem ${n} atacantes e escolhe o que precisa a cada turno.`,
      howLead: (x, t) => `Aqui você vê com que frequência pode ter ${x}, que lidera a nota, pronto para o seu ${t === 2 ? 'segundo' : 'terceiro'} turno.`,
      howWhy: (w, t) => `${{ name: 'O atacante que dá nome ao deck dele no meta', pick: 'O atacante principal que você escolheu', core: 'O atacante em torno do qual esta lista é montada' }[w]}, e com que frequência você pode tê-lo pronto para o seu ${t === 2 ? 'segundo' : 'terceiro'} turno.`,
      atkBy: t => `Atacante até o T${t}, qualquer mão`,
      anyHand: (x, h, k) => `${x}${h ? ' na mão' : ''}, qualquer mão inicial, ${{ same: `igual ${RAW} ou com suas cartas de busca`, range: `de ${RAW} até com suas cartas de busca`, raw: RAW }[k]}`,
      noFrom: (x, s) => `${x} é de Estágio ${s}, mas um Pokémon do qual ele evolui não está na lista, então ele só entra em jogo com outras cartas.`,
      need1: (a, b) => `Precisa de ${a} até o turno 1 e depois de ${b} até o turno 2 (nada evolui no primeiro turno em jogo).`,
      needCandy: (a, b, c) => `Precisa de ${a} até o turno 1 e depois de ${b} e Rare Candy até o turno 2${c ? ` (a rota por ${c} precisa até o turno 3)` : ''}.`,
      need3: (a, b, c) => `Precisa de ${a} até o turno 1 e de ${b} até o turno 2, e depois de ${c} no turno 3 (não há Rare Candy na lista, e nada evolui no primeiro turno em jogo).`,
      needSeen: (a, n) => `Precisa de ${a} entre as suas primeiras ${n} cartas.`,
      // How tightly the list fits.
      fitLines: n => `seus Pokémon estão espalhados em ${n} linhas`,
      fitSingles: (a, b, pk) => `${a} dos seus ${b} ${pk ? 'Pokémon' : 'Treinadores'} ${n1(a) ? 'é cópia única' : 'são cópias únicas'}`,
      fitTypes: n => `seus ataques precisam de ${n} tipos de Energia`,
      fitUse: p => `cada atacante só pode usar cerca de ${p}% da sua Energia`,
      fit: (how, cs) => (how ? 'O quanto a lista é coesa' : 'Menos cartas suas puxam para o mesmo lado') + (cs.length ? ': ' + cs.join(' e ') : '') + '.',
      // Trainer fit lines.
      little: (n, sw) => `${n1(n) ? 'Uma carta acrescenta' : n + ' cartas acrescentam'} pouco aqui${sw === 'each' ? (n1(n) ? ', com uma ideia de troca' : ', com uma ideia de troca para cada uma') : sw === 'below' ? ', com ideias de troca abaixo' : ''}.`,
      role1: (k, n) => cap(roles(k)) + (n ? `, uma das ${n} cartas que fazem isso` : '') + '.',
      roleOnly: (k, c) => `${cap(roles(k))}: sua ${c ? 'única carta' : 'única carta de Treinador'} que faz isso.`,
      roleOf: (k, a, b) => `${cap(roles(k))}: ${a} das ${b} cartas que fazem isso.`,
      crowded: (k, n) => `${cap(roles(k))}, mas outras ${n} cartas da lista já fazem isso, mais do que a maioria das listas vencedoras usa, então esta acrescenta pouco.`,
      unplayed: k => `${cap(roles(k))}, mas nenhuma lista vencedora de eventos recentes usa esta carta.`,
      payFor: (x, a, b) => `Ajuda a pagar os custos de Energia de ${x}${a ? `, ${a} das ${b} cartas que fazem isso` : ''}.`,
      skips: (a, b) => `Pula ${a ? a : 'o Estágio 1'} para colocar ${b} em jogo um turno antes.`,
      skipsMid: (a, b) => `${a} pula o estágio do meio para colocar ${b} em jogo rápido.`,
      needsOn: (a, b) => `Precisa de ${a} na lista para colocar ${b} em cima, e não há nenhum na lista.`,
      needsNone: w => `Precisa de ${w}, e não há nenhum na lista.`,
      needsAce: w => `Precisa de ${w}, que esta lista não usa.`,
      aceFills: (x, k, g) => `${x} ${roles(k)}, e isso cobre uma lacuna: ${T.gap(g)}.`,
      aceBetter: (x, g) => `${x} poderia encaixar melhor, já que ${T.gap(g)}.`,
      aceWould: (x, k, g) => `${x} serviria para ${DO[k]}, e ${T.gap(g)}.`,
      swap: (x, more, g) => `Ideia de troca: ${more ? 'mais uma cópia de ' : ''}${x}, já que ${T.gap(g)}.`,
      aceDoes: (x, k) => `${x} ${roles(k)}.`,
      // In this deck: notes.
      anyLike: (find, n, w, li, en) => `${find ? 'Busca' : 'Pode colocar no Banco'} qualquer um dos seus ${n} ${w}, como ${li}${en ? ', ou ' + en : ''}.`,
      benchAll: li => `Pode colocar no Banco de uma vez todos os Básicos da lista, como ${li}.`,
      verbList: (k, li, e) => ({ Finds: `Busca ${li}`, 'Can Bench': `Pode colocar ${li} no Banco`, 'Gets back': `Recupera ${li}`, 'Works on': `Funciona com ${li}`,
        'Can evolve straight into': `Pode evoluir direto para ${li}`, 'Fully heals': `Cura todo o dano de ${li}`, shields: `Protege ${li} dos efeitos de ataques, como as Condições Especiais`,
        keeps: `Mantém ${li} livre de Condições Especiais`, 'Can fetch a single copy like your': `Pode buscar uma cópia única, como ${li}` })[k] + (e ? `, ${e.or ? 'ou' : 'e'} ${e.e}` : '') + '.',
      backLike: (mix, ko, li, e) => `Recupera ${mix ? 'qualquer combinação de ' : ''}Pokémon${ko ? ' que foram Nocauteados' : ''}, como ${li}${e ? `, ${e.or ? 'ou' : 'e'} ${e.e}` : ''}.`,
      shuffleKo: li => `Devolve ao seu deck Pokémon que foram Nocauteados, como ${li}.`,
      energyFor: (back, en, x) => back ? `Recupera ${en} para ${x}.` : `Devolve ${en} ao seu deck para ${x}.`,
      withOdds: (n, w, d, p) => `Com ${n} ${w} nas suas ${d} cartas, ${p ? `encontra um em cerca de ${p}% das vezes` : 'quase sempre encontra um'}.`,
      takesHp: (x, a, b, y, c) => `Leva ${x} de ${a} para ${b} PS${y ? `, ou ${y} para ${c}` : ''}.`,
      goesFrom: (xa, a, b, ex) => `${cap(xa)} vai de ${a} para ${b}${ex ? ' contra Pokémon ex' : ''}.`,
      prizeFor: (x, a, b, once) => `Com ${x}, o oponente pega ${a} ${n1(a) ? 'carta de Prêmio' : 'cartas de Prêmio'} por ele, não ${b}${once ? ', uma vez por partida' : ''}.`,
      koNeed: (x, t, a, b) => `Com ${x}, os atacantes do tipo ${Y[t]} precisam causar ${a} de dano para Nocauteá-lo, não ${b}.`,
      aLike: (w, x) => `um ${w} como ${x}`,
      putsE: (n, li, once, wh) => `Liga ${n ? n + ' ' : ''}${n && !n1(n) ? 'Energias' : 'Energia'} a ${li}${once ? ' de uma vez' : ''}${wh ? `, uma vez que ${wh} está em jogo` : ''}.`,
      spare: (li, n) => `Transforma Pokémon sobrando, como ${li}, em ${n} cartas cada.`,
      onTypeBench: (t, x, n, li) => `Com um Pokémon do tipo ${Y[t]} como ${x}, coloca no Banco até ${n} destes: ${li}.`,
      picks: (n, e) => `Escolhe ${n} das suas ${e}.`,
      payColorless: li => `Pode pagar a Energia Incolor de ${li}.`,
      onPays: (x, n, c, a, turn) => `Com ${x}, paga ${n ? n + ' das Energias' + (c ? ' Incolores' : '') : 'a Energia' + (c ? ' Incolor' : '')} de ${a}${turn ? ', durante um turno' : ''}.`,
      paysFor: (n, xa) => `Paga ${n} das Energias de ${xa}.`,
      anyType: (w, x, a) => `Com um ${w} como ${x}, conta como de qualquer tipo para ${a}.`,
      wholeLine: li => `Pega toda a linha de ${li} de uma vez.`,
      withEnergy: (li, your) => `${your ? 'Pega' : 'Busca'} de uma vez ${li} e uma Energia.`,
      together: li => `Pega de uma vez ${li}.`,
      findsFewer: (w, a, b) => `Sua lista não tem ${w}, então encontra ${a} ${n1(a) ? 'carta' : 'cartas'}, não ${b}.`,
      oneGo: (a, b) => `Pode transformar ${a} em ${b} de uma vez.`,
      benchSpots: (n, li) => `Dá a você ${n} espaços no Banco enquanto ${li} está em jogo.`,
      drawsAfter: (n, k, w) => `Compra ${n} depois ${n1(k) ? 'do seu Apoiador' : `de qualquer um dos seus ${k} Apoiadores`} de ${own(w)}.`,
      everyIs: (w, n) => `Todos os Pokémon da sua lista são ${w}, então compra até ter ${n}.`,
      worksKo: li => `Funciona quando ${li} é Nocauteado.`,
      takeDmg: (li, n, less, w) => less ? `Seus ${li} recebem ${n} a menos de dano${w === 'too' ? ' também' : w === 'that turn' ? ' naquele turno' : ''}.`
        : `Seus próprios ${li} recebem ${n} de dano${w === 'when you Bench them' ? ' quando você os coloca no Banco' : w === 'too' ? ' também' : ''}.`,
      dropsTo: (x, n) => `Seu próprio ${x} também cai para ${n} PS.`,
      fits: (li, one, n, s, k) => `Combina com ${li}, que ${one ? 'ataca' : 'atacam'} com ${n} Energias ou mais${s ? `; ${s} deixa isso em ${k}` : ''}.`,
      healsMove: (n, li) => `Cura ${n} quando move ${li} para o seu Banco.`,
      grabWith: x => `Pode buscar seu ${x} junto com Apoiadores.`,
      tooBig: (x, n) => `${x} é grande demais para esta carta (${n} PS).`,
      retreat: (li, x, n, c) => `Deixa ${li} ${pl(li) ? 'recuarem' : 'recuar'} de graça${x ? `; ${x} ainda paga ${n}` : c ? ` (agora custa ${c})` : ''}.`,
      evolveNow: (a, b) => `Deixa ${a} evoluir para ${b} no turno em que você o joga.`,
      offOwn: li => `Também desliga ${li} do seu lado.`,
      runNo: (x, k) => `Você não usa ${x}, então ${{ hp: 'só os do oponente perdem PS', off: 'só desliga as do oponente', pays: 'só o oponente paga mais', helps: 'só ajuda os do oponente' }[k]}.`,
      comesBack: xa => `Volta depois que ${xa} a descarta.`,
      poisoned: x => `Ativa quando seu próprio Pokémon está Envenenado, o que ${x} faz aqui.`,
      takesE: (a, b, e) => `Pega ${a} das suas ${b} ${e} de uma vez.`,
      benchesUp: (n, w) => `Coloca no Banco até ${n} ${w} de uma vez.`,
      switchBetween: li => `Troca entre seus ${li} uma vez por turno.`,
      // How it plays.
      doesAtk: x => `${x} é quem ataca.`,
      playsAs: x => `A lista joga como ${x}, um deck com o nome dele.`,
      playsEng: (x, e, k, atk, a, p) => `A lista joga como ${x}, um deck com o nome de ${e}, um Pokémon ${{ setsA: 'que prepara os atacantes', powA: 'que impulsiona os atacantes em vez de atacar', setsT: 'que os prepara', powT: 'que os impulsiona em vez de atacar' }[k]}: ${atk ? 'seu ataque' : 'sua Habilidade'} ${a} ${p}.`,
      playsAsOne: x => `A lista joga como ${x}, e dos Pokémon que dão nome a esse deck, este é o que a lista foi montada para usar no ataque.`,
      copies: (you, n, f) => `${you ? 'Você o escolheu como atacante principal' : 'É o atacante em torno do qual esta lista é montada'}: ${n} ${n1(n) ? 'cópia' : 'cópias'}${f ? ` mais ${f} Pokémon dos quais ele evolui` : ''}.`,
      most: (x, n) => `${x} é o que a lista usa em mais cópias (${n}).`,
      box: n => `${n} Pokémon diferentes podem levar o ataque, e você escolhe o que encaixa a cada turno.`,
      hits: (s, avg, n, coins) => `${cap(s)} ${avg ? 'causa em média' : 'causa'} ${n} de dano${coins ? ' com as moedas' : ''}.`,
      handEst: (s, n, k) => `${s} conta as cartas da sua mão: cerca de ${n} com ${k} cartas, uma estimativa do app, não um número impresso.`,
      boardEst: (s, n) => `${s} depende da mesa, então ${n} é uma estimativa do app, não um número impresso.`,
      wall: s => `${s} evita todo o dano dos ataques dos Pokémon ex do oponente, então atacantes ex não conseguem Nocauteá-lo.`,
      boost: (s, n, e, h, hp) => `${s} soma ${n} aos ataques dele enquanto tem ${e} ligada${h ? `, então causa ${h}` : ''}${hp ? `, e dá ${hp} PS a mais` : ''}.`,
      ownDmg: (s, n, act) => `${s} coloca ${n} contadores de dano em 1 dos Pokémon do oponente a cada turno${act ? ' enquanto está no Campo Ativo' : ''}.`,
      kox: (s, n, x) => `${s} Nocauteia o Pokémon Ativo do oponente quando ele tem exatamente ${n} contadores de dano${x ? `, e ${x} pode colocá-los` : ''}, então a nota conta isso como um golpe que derruba qualquer um.`,
      pileDmg: (s, n, p, b, c, k) => `${s} causa ${n} a mais para cada ${p} na sua pilha de descarte: ${b} com 2 lá, ${c} quando você tem ${k}.`,
      eScale: (s, en, on, n, alt, opp) => `${s} conta a ${en || 'Energia'} ligada ${{ 'both Active Pokemon': 'aos dois Pokémon Ativos', 'all your Pokemon': 'a todos os seus Pokémon', itself: 'a ele mesmo' }[on]}, então cada uma que você liga ${on === 'all your Pokemon' ? 'em qualquer lugar do seu lado' : 'a ele'} soma ${n}${alt ? ` (${alt.n} por ${alt.e} com ${alt.by} em jogo)` : ''}${opp ? ', e a Energia do oponente também soma' : ''}.`,
      discEach: (s, en, n) => `${s} descarta ${en} dos seus Pokémon e causa ${n} para cada uma, então cada uma que você liga em qualquer lugar do seu lado soma ${n} ao próximo golpe forte.`,
      discNext: (n, k, e, need) => `Isso conta os ${n} a mais que ele causa quando descarta ${e === 'all' ? 'toda a Energia dele' : k + ' ' + e} de si mesmo, então ${need === 'all' ? 'é preciso carregá-lo de novo' : need === 1 ? 'precisa de outra ligada' : `precisa de mais ${need} ligadas`} antes do próximo golpe forte.`,
      discEach2: (k, e, need) => `Descarta ${e === 'all' ? 'toda a Energia dele' : k + ' ' + e} de si mesmo a cada vez, então ${need === 'all' ? 'é preciso carregá-lo de novo' : need === 1 ? 'precisa de outra ligada' : `precisa de mais ${need} ligadas`} antes de poder golpear tão forte de novo.`,
      lock: (a, b) => `Não pode usar ${a} dois turnos seguidos, então ${b ? `use ${b} ou ` : ''}coloque outro atacante no turno entre eles.`,
      lockAll: a => `Não pode atacar no próximo turno depois de ${a}, então troque para outro atacante no turno entre eles.`,
      copyBench: s => `${s} deixa ele usar os ataques dos seus Pokémon no Banco, pagos com a própria Energia.`,
      bestHere: (xa, avg, n) => `O melhor aqui é ${xa}, que ${avg ? 'causa em média' : 'causa'} ${n}.`,
      copiesWith: (xa, a) => `Copia ${xa} com ${a}.`,
      mill: s => `${s} usa um ataque de um Pokémon sem Caixa de Regras que sai do topo do seu deck.`,
      inList: li => `Nesta lista são ${li}.`,
      putFirst: li => `${li} ${pl(li) ? 'colocam' : 'coloca'} lá primeiro o que você quer.`,
      useOff: (x, y, a, e) => `${x} pode usar os ataques de ${y} com ${a} quando ele sai do topo do seu deck, então ${y} não precisa de ${i18nEnName(e, 'pt')} própria.`,
      copyPay: (x, y, a, en) => `${x} copia os ataques de ${y} com ${a}, pagando só o próprio custo, então ${y} não precisa da própria ${en}.`,
      evoWithout: (x, f, y) => `${x} evolui de ${f}, e ${y} pode evoluir para ele, então a linha funciona sem um ${f} comum.`,
      benchSelf: (x, a) => `${x} pode ir da sua mão para o seu Banco com ${a}, então não precisa evoluir.`,
      forAbil: (their, k, li) => `${their ? 'São usados' : 'É usado'} principalmente pela${their ? 's Habilidades' : ' Habilidade'}, para ${{ both: 'comprar e buscar', draw: 'comprar cartas', search: 'buscar no seu deck' }[k]}: ${li}.`,
      colorless: their => their ? 'Os ataques deles só custam Energia Incolor, então a Energia da lista não é escolhida para eles.' : 'O ataque dele só custa Energia Incolor, então a Energia da lista não é escolhida para ele.',
      dmgFrom: (pl2, names) => `Dano de ${pl2 ? 'Habilidades' : 'uma Habilidade'}: ${names}`,
      abPuts: (xa, n) => `${xa} coloca ${n} contadores de dano em 1 dos Pokémon do oponente`,
      onTop: ps => `${cap(ps.join(', e '))}, além do seu ataque naquele turno.`,
      koSelf: li => `Usá-la Nocauteia ${li}, o que dá um prêmio ao oponente, então serve para finalizar, não para abrir.`,
      attackers: l => `Atacantes: ${l}`,
      hitAny: (a, n, d) => n1(n) ? `${a} pode causar ${d} de dano a qualquer Pokémon do oponente, inclusive os do Banco.` : null,
      itsAb: (a, p) => `Sua Habilidade ${a} ${p.replace(/\.$/, '')}.`,
      withAb: (a, p) => `Com sua Habilidade ${a}, ${p.replace(/\.$/, '')}.`,
      alsoAtk: (a, p) => `${a} também ${p.replace(/\.$/, '')}.`,
      grows: (s, b, c, k, p) => `${s} cresce conforme sua pilha de descarte enche: ${b} no começo, ${c} quando você tem ${k} ${p} lá.`,
      alsoBench: (a, n, k) => `${a} também causa ${n} de dano a ${k} dos Pokémon no Banco do oponente.`,
    };
    return T;
  })(),
};
// Last of the catch-alls: the Grade tab sentences the patterns above leave.
I18N_PAT.push([/^[\s\S]+$/, m => i18nGtSent(m, 'es'), m => i18nGtSent(m, 'pt')]);
// The damage sentences above would take "...: it hits for" alone, so the in-hand odds note goes first.
I18N_PAT.unshift([/^This counts .+ in hand, not at full power: [\s\S]+$/, m => i18nGtSent(m, 'es'), m => i18nGtSent(m, 'pt')]);

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

// Muse s6 M3, M8, M9: labels, placeholders and screen reader labels the lists above missed.
Object.assign(I18N_ES, {
  "A toolbox deck spreads on purpose, so this counts half.": "Una baraja de caja de herramientas se reparte a propósito, así que esto cuenta la mitad.",
  "Attacker line incomplete": "Línea del atacante incompleta",
  "Deck to compare": "Baraja para comparar",
  "No clear edge either way against these decks yet.": "Aún no hay una ventaja clara para ningún lado contra estas barajas.",
  "None": "Nada",
  "None of your own Pokemon lose an Ability to it.": "Ninguno de tus propios Pokémon pierde una Habilidad por ella.",
  "One of your attackers": "Uno de tus atacantes",
  "Start a prize game with this deck": "Empezar una partida de premios con esta baraja",
  "Too few games": "Pocas partidas",
  "Too few games against these decks to call yet.": "Aún hay muy pocas partidas contra estas barajas para juzgar.",
  "Win rate against other popular decks": "Porcentaje de victorias contra otras barajas populares",
  "Filling the discard pile is not counted here, so the full hit this early is much less likely than this.": "Llenar la pila de descartes no se cuenta aquí, así que el golpe completo tan pronto es mucho menos probable que esto.",
  "Tool": "Herramienta",
  "ACE SPEC: none": "AS TÁCTICO: ninguna",
  "It works with this list.": "Funciona con esta lista.",
  "The list runs no ACE SPEC.": "La lista no lleva ninguna carta AS TÁCTICO.",
  "Find a deck": "Buscar una baraja",
  "Your order": "Tu orden",
  "Best grade": "Mejor calificación",
  "Show fewer decks": "Mostrar menos barajas",
  "Sort decks": "Ordenar barajas",
  "Edit matchup note": "Editar nota de enfrentamiento",
  "Edit note": "Editar nota",
  "e.g. Gardevoir ex": "p. ej., Gardevoir ex",
  "Take a 2 then a 2 then a 2. Bench only two Basics. Save Boss's Orders for the Kirlia.": "Toma 2, luego 2, luego 2. Pon solo dos Básicos en la Banca. Guarda Boss's Orders para el Kirlia.",
  "Results from": "Resultados desde",
  "All results": "Todos los resultados",
  "More for this deck": "Más opciones para esta baraja",
});
Object.assign(I18N_PT, {
  "A toolbox deck spreads on purpose, so this counts half.": "Um deck de caixa de ferramentas se espalha de propósito, então isto conta pela metade.",
  "Attacker line incomplete": "Linha do atacante incompleta",
  "Deck to compare": "Deck para comparar",
  "No clear edge either way against these decks yet.": "Ainda não há vantagem clara para nenhum lado contra esses decks.",
  "None": "Nada",
  "None of your own Pokemon lose an Ability to it.": "Nenhum dos seus próprios Pokémon perde uma Habilidade por causa dela.",
  "One of your attackers": "Um dos seus atacantes",
  "Start a prize game with this deck": "Começar um jogo de prêmios com este deck",
  "Too few games": "Poucas partidas",
  "Too few games against these decks to call yet.": "Ainda há poucas partidas contra esses decks para avaliar.",
  "Win rate against other popular decks": "Taxa de vitória contra outros decks populares",
  "Filling the discard pile is not counted here, so the full hit this early is much less likely than this.": "Encher a pilha de descarte não conta aqui, então o golpe completo tão cedo é bem menos provável do que isto.",
  "Tool": "Ferramenta",
  "ACE SPEC: none": "ÁS TÁTICO: nenhuma",
  "It works with this list.": "Funciona com esta lista.",
  "The list runs no ACE SPEC.": "A lista não usa nenhuma carta ÁS TÁTICO.",
  "Find a deck": "Encontrar um deck",
  "Your order": "Sua ordem",
  "Best grade": "Melhor nota",
  "Show fewer decks": "Mostrar menos decks",
  "Sort decks": "Ordenar decks",
  "Edit matchup note": "Editar nota de confronto",
  "Edit note": "Editar nota",
  "e.g. Gardevoir ex": "ex.: Gardevoir ex",
  "Take a 2 then a 2 then a 2. Bench only two Basics. Save Boss's Orders for the Kirlia.": "Pegue 2, depois 2, depois 2. Coloque só dois Básicos no Banco. Guarde Boss's Orders para o Kirlia.",
  "Results from": "Resultados desde",
  "All results": "Todos os resultados",
  "More for this deck": "Mais opções para este deck",
  "Top two fixes": "As duas principais correções",
});

// 3.3.2: numbers in the language's own form, from Intl (51,8 % in French, 5.885 in German).
// Only what reads as an English number is touched: a decimal (8.4), a count with commas (5,885),
// a share (52%), a count of 1000 or more (3023, 3.3.3) or a dollar price ($78.46). Versions (v3.3, License 1.1), dates and card numbers stay.
const I18N_NUM_FMT = {};
function i18nNumFmt(loc, o) {
  const k = loc + JSON.stringify(o);
  return I18N_NUM_FMT[k] || (I18N_NUM_FMT[k] = new Intl.NumberFormat(loc, o));
}
const I18N_NUM_RE = /(?<![\w.,$])(\$)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+(?=\s?%)|[1-9]\d{3,})(?![0-9A-Za-wyz_]|[.,:]\d)(\s?%)?/g;
const I18N_NUM_VER = /(?:\bv|License |[Vv]ersion |RdyDeck |Trainer |Muse |Android |iOS |Chrome )$/;
/** Whether a four digit number, with the text before and after it, is a year rather than a count. */
const I18N_YEAR_MON = {};
function i18nIsYear(n, before, after, l) {
  if (!/^\d{4}$/.test(n) || +n < 1900 || +n > 2199) return false;
  let mon = I18N_YEAR_MON[l];
  if (!mon) {
    const x = i18nMore(l) || {}, words = [].concat(I18N_MONTHS, I18N_MONTHS.map(m => m.slice(0, 3)), I18N_MON[l] || [], I18N_MON3[l] || [], x.mon || [], x.mon3 || []);
    const alt = [...new Set(words.filter(Boolean).map(w => String(w).replace(/\.$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))].sort((a, b) => b.length - a.length).join('|');
    mon = I18N_YEAR_MON[l] = new RegExp(`(?:^|[^\\p{L}])(?:${alt})\\.?,?\\s+(?:(?:de|of)\\s+|\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?$`, 'iu');
  }
  if (mon.test(before)) return true;                                    // 16 nov. 2026, April 2027, noviembre de 2026, Nov 16, 2026
  if (/(?:^|[^\p{L}])[A-I]\s+(?:(?:en|in|em|nel|im)\s+)?$/u.test(before)) return true;   // regulation mark E 2024, E en 2024
  if (/[©(]\s*$/.test(before)) return true;                             // (2025), © 2026
  // in 2026, depuis 2025, seit 2024: a year when nothing it counts follows.
  return /(?:^|[^\p{L}])(?:in|en|em|im|nel|dal|desde|depuis|since|seit|ab|from|du|until|bis|au|hasta|até|al|fino al)\s+$/iu.test(before)
    && /^(?:\s*(?:[,.;:)!?]|$)|\s+(?:and|et|und|y|e|o|or|ou|oder)\b)/u.test(after);
}
function i18nNums(s, l) {
  const loc = I18N_HTML_LANG[l];
  if (!s || l === 'en' || !loc || !/\d/.test(s) || typeof Intl !== 'object') return s;
  try {
    return String(s).replace(I18N_NUM_RE, (m, usd, n, pct, at, all) => {
      if (I18N_NUM_VER.test(all.slice(Math.max(0, at - 9), at))) return m;
      if (usd && pct) return m;
      // 3.3.3: a count the English writes with no comma (3023 wins, 2045 games) is grouped too,
      // as 3 023 in French. What the number is decides, not its size: a year (after a month, a
      // regulation mark or "in", "since" and the like), a build or a puzzle number stays.
      if (!usd && !pct && /^\d+$/.test(n) && (/[\/-]$/.test(all.slice(0, at)) || /^[\/-]\d/.test(all.slice(at + m.length)) || /(?:build |#|n°|nº|No\. |Nr\. )$/i.test(all.slice(Math.max(0, at - 7), at)) || i18nIsYear(n, all.slice(0, at), all.slice(at + m.length), l))) return m;
      const dot = n.indexOf('.'), dec = dot < 0 ? 0 : n.length - dot - 1, v = +n.replace(/,/g, '');
      if (!isFinite(v)) return m;
      const o = { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: n.indexOf(',') > 0 || (n.indexOf('.') < 0 && n.length > 3) ? 'auto' : false };   // auto: the language's own rule (Spanish leaves 2045 as is)
      if (usd) return dec === 2 ? i18nNumFmt(loc, Object.assign(o, { style: 'currency', currency: 'USD' })).format(v) : m;
      if (pct) return i18nNumFmt(loc, Object.assign(o, { style: 'percent' })).format(v / 100);
      return i18nNumFmt(loc, o).format(v);
    });
  } catch (_) { return s; }
}

// Watch out for (hidden box on the Grade tab, js/v83-watch-out.js).
Object.assign(I18N_ES, {
  "Watch out for": "Ojo con",
  "What the current meta can use against this deck's plan. It does not change the grade.": "Lo que el meta actual puede usar contra el plan de esta baraja. No cambia la calificación.",
  "Nothing popular right now targets this deck's plan.": "Ahora mismo nada popular ataca el plan de esta baraja.",
  "Hand disruption": "Disrupción de mano",
  "Item lock": "Bloqueo de Objetos",
  "Ability lock": "Bloqueo de Habilidades",
  "Tool lock": "Bloqueo de Herramientas",
  "Blocked Abilities": "Habilidades bloqueadas",
  "Bench damage": "Daño a la Banca",
  "Your attacker does more damage the more cards you hold.": "Tu atacante hace más daño cuantas más cartas tengas en la mano.",
  "These cards shrink your hand.": "Estas cartas reducen tu mano.",
  "Your Stage 2 Pokemon lean on Item cards to evolve.": "Tus Pokémon de Fase 2 dependen de cartas de Objeto para evolucionar.",
  "This Pokemon stops you playing Items for a turn.": "Este Pokémon te impide jugar Objetos durante un turno.",
  "This Stadium turns those Abilities off.": "Este Estadio anula esas Habilidades.",
  "These cards turn them off or discard them.": "Estas cartas las anulan o las descartan.",
  "Your plan uses an Ability that Knocks Out its own Pokemon.": "Tu plan usa una Habilidad que deja Fuera de Combate a su propio Pokémon.",
  "This Pokemon stops those Abilities while it is in play.": "Este Pokémon bloquea esas Habilidades mientras está en juego.",
  "These decks damage the Bench.": "Estas barajas hacen daño a la Banca.",
  "Share of top lists that play each card.": "Porcentaje de listas top que llevan cada carta.",
  "Pick the closest deck under Against the meta to see how it did against these.": "Elige la baraja más parecida en Contra el meta para ver cómo le fue contra estas.",
  "Decks that do this most": "Barajas que más lo hacen",
  "Most played in these decks.": "Se juega sobre todo en estas barajas.",
});
Object.assign(I18N_PT, {
  "Watch out for": "Cuidado com",
  "What the current meta can use against this deck's plan. It does not change the grade.": "O que o meta atual pode usar contra o plano deste deck. Não muda a nota.",
  "Nothing popular right now targets this deck's plan.": "No momento, nada popular mira o plano deste deck.",
  "Hand disruption": "Disrupção de mão",
  "Item lock": "Bloqueio de Itens",
  "Ability lock": "Bloqueio de Habilidades",
  "Tool lock": "Bloqueio de Ferramentas",
  "Blocked Abilities": "Habilidades bloqueadas",
  "Bench damage": "Dano ao Banco",
  "Your attacker does more damage the more cards you hold.": "Seu atacante causa mais dano quanto mais cartas você tiver na mão.",
  "These cards shrink your hand.": "Estas cartas diminuem a sua mão.",
  "Your Stage 2 Pokemon lean on Item cards to evolve.": "Seus Pokémon de Estágio 2 dependem de cartas de Item para evoluir.",
  "This Pokemon stops you playing Items for a turn.": "Este Pokémon impede você de jogar Itens por um turno.",
  "This Stadium turns those Abilities off.": "Este Estádio anula essas Habilidades.",
  "These cards turn them off or discard them.": "Estas cartas as anulam ou as descartam.",
  "Your plan uses an Ability that Knocks Out its own Pokemon.": "Seu plano usa uma Habilidade que Nocauteia o próprio Pokémon.",
  "This Pokemon stops those Abilities while it is in play.": "Este Pokémon bloqueia essas Habilidades enquanto está em jogo.",
  "These decks damage the Bench.": "Estes decks causam dano no Banco.",
  "Share of top lists that play each card.": "Porcentagem de listas top que usam cada carta.",
  "Pick the closest deck under Against the meta to see how it did against these.": "Escolha o deck mais parecido em Contra o meta para ver como ele se saiu contra estes.",
  "Decks that do this most": "Decks que mais fazem isso",
  "Most played in these decks.": "É mais jogado nestes decks.",
});
I18N_PAT.unshift(
  [/^Weak to (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy)$/, (m, t) => 'Débil al tipo ' + I18N_AB_TYP.es[t], (m, t) => 'Fraco contra o tipo ' + I18N_AB_TYP.pt[t]],
  [/^Your main attacker takes double damage from (Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Colorless|Fairy) attacks\.$/, (m, t) => 'Tu atacante principal recibe el doble de daño de los ataques de tipo ' + I18N_AB_TYP.es[t] + '.', (m, t) => 'Seu atacante principal recebe o dobro de dano de ataques do tipo ' + I18N_AB_TYP.pt[t] + '.'],
  [/^Decks that attack with them are about (\d+)% of the meta\.$/, 'Las barajas que atacan con ese tipo son más o menos el $1% del meta.', 'Os decks que atacam com esse tipo são cerca de $1% do meta.'],
  [/^This deck plays (\d+) Colorless Pokemon with Abilities\.$/, 'Esta baraja lleva $1 Pokémon de tipo Incoloro con Habilidades.', 'Este deck usa $1 Pokémon do tipo Incolor com Habilidades.'],
  [/^This deck plays (\d+) Pokemon Tools\.$/, 'Esta baraja lleva $1 Herramientas Pokémon.', 'Este deck usa $1 Ferramentas Pokémon.'],
  [/^(\d+) of your Pokemon have 70 HP or less\.$/, '$1 de tus Pokémon tienen 70 PS o menos.', '$1 dos seus Pokémon têm 70 PS ou menos.'],
  [/^Win rates are for all (.+) lists, as in Against the meta\.$/, 'Los porcentajes de victoria son de todas las listas de $1, como en Contra el meta.', 'As taxas de vitória são de todas as listas de $1, como em Contra o meta.'],
);

// 3.4.20: Guess the Grade (js/gtg.js).
Object.assign(I18N_ES, {
  "Guess the Grade": "Adivina la calificación",
  "Guess the Grade added": "Nuevo: Adivina la calificación",
  "Reading today's list…": "Leyendo la lista de hoy…",
  "Guess the Grade needs a connection to read today's list. Try again in a moment.": "Adivina la calificación necesita conexión para leer la lista de hoy. Vuelve a intentarlo en un momento.",
  "A real tournament list, the same for everyone today. Study it, then guess the grade RdyDeck gives it out of 10. You get 4 guesses. Each one says higher or lower, and Hot (within 0.2), Warm (within 0.5) or Cold.": "Una lista real de torneo, la misma para todos hoy. Estúdiala y adivina la calificación sobre 10 que le da RdyDeck. Tienes 4 intentos. Cada uno te dice si es más alta o más baja, y si estás Caliente (a 0.2 o menos), Tibio (a 0.5 o menos) o Frío.",
  "Today's list": "Lista de hoy",
  "Right": "Exacto",
  "Hot": "Caliente",
  "Warm": "Tibio",
  "Cold": "Frío",
  "Not this time": "Esta vez no",
  "A new list tomorrow.": "Mañana, una lista nueva.",
  "Lower guess": "Bajar el número",
  "Higher guess": "Subir el número",
  "Your guess": "Tu intento",
  "Guess the grade of a real tournament list": "Adivina la calificación de una lista real de torneo",
  "Your result": "Tu resultado",
  "Finish today's Guess the Grade first.": "Primero termina el Adivina la calificación de hoy.",
  "Everyone gets the same real tournament list today. Study it, then guess the grade RdyDeck gives it. You get 4 guesses.": "Hoy todos reciben la misma lista real de torneo. Estúdiala y adivina la calificación que le da RdyDeck. Tienes 4 intentos.",
});
Object.assign(I18N_PT, {
  "Guess the Grade": "Adivinhe a nota",
  "Guess the Grade added": "Novo: Adivinhe a nota",
  "Reading today's list…": "Lendo a lista de hoje…",
  "Guess the Grade needs a connection to read today's list. Try again in a moment.": "O Adivinhe a nota precisa de conexão para ler a lista de hoje. Tente de novo daqui a pouco.",
  "A real tournament list, the same for everyone today. Study it, then guess the grade RdyDeck gives it out of 10. You get 4 guesses. Each one says higher or lower, and Hot (within 0.2), Warm (within 0.5) or Cold.": "Uma lista real de torneio, a mesma para todos hoje. Estude a lista e adivinhe a nota de 0 a 10 que o RdyDeck dá a ela. Você tem 4 palpites. Cada um diz se a nota é mais alta ou mais baixa, e se você está Quente (até 0.2), Morno (até 0.5) ou Frio.",
  "Today's list": "Lista de hoje",
  "Right": "Acertou",
  "Hot": "Quente",
  "Warm": "Morno",
  "Cold": "Frio",
  "Not this time": "Não foi desta vez",
  "A new list tomorrow.": "Amanhã tem lista nova.",
  "Lower guess": "Diminuir o número",
  "Higher guess": "Aumentar o número",
  "Your guess": "Seu palpite",
  "Guess the grade of a real tournament list": "Adivinhe a nota de uma lista real de torneio",
  "Your result": "Seu resultado",
  "Finish today's Guess the Grade first.": "Termine primeiro o Adivinhe a nota de hoje.",
  "Everyone gets the same real tournament list today. Study it, then guess the grade RdyDeck gives it. You get 4 guesses.": "Hoje todos recebem a mesma lista real de torneio. Estude a lista e adivinhe a nota que o RdyDeck dá a ela. Você tem 4 palpites.",
});
I18N_PAT.unshift(
  [/^Guess the Grade #(\d+)$/, "Adivina la calificación #$1", "Adivinhe a nota #$1"],
  [/^RdyDeck Guess the Grade #(\d+): got it in (\d+) of (\d+)$/, "RdyDeck Adivina la calificación #$1: acerté en $2 de $3", "RdyDeck Adivinhe a nota #$1: acertei em $2 de $3"],
  [/^RdyDeck Guess the Grade #(\d+): not solved in (\d+)$/, "RdyDeck Adivina la calificación #$1: no acerté en $2", "RdyDeck Adivinhe a nota #$1: não acertei em $2"],
  [/^(Higher|Lower)\. (Hot: within 0\.2|Warm: within 0\.5|Cold: more than 0\.5 off)\.$/, (m, w, h) => (w === 'Higher' ? 'Más alta' : 'Más baja') + '. ' + { H: 'Caliente: a 0.2 o menos.', W: 'Tibio: a 0.5 o menos.', C: 'Frío: a más de 0.5.' }[h[0]], (m, w, h) => (w === 'Higher' ? 'Mais alta' : 'Mais baixa') + '. ' + { H: 'Quente: até 0.2.', W: 'Morno: até 0.5.', C: 'Frio: mais de 0.5 de diferença.' }[h[0]]],
  [/^Got it in (\d+) of (\d+)$/, "Acertaste en $1 de $2", "Acertou em $1 de $2"],
  [/^The grade is ([\d.]+)\.$/, "La calificación es $1.", "A nota é $1."],
  [/^Guess (\d+) of (\d+)$/, "Intento $1 de $2", "Palpite $1 de $2"],
  [/^Guess (\d+\.\d)$/, "Adivinar $1", "Chutar $1"],
  [/^Between (\d+\.\d) and (\d+\.\d)$/, "Entre $1 y $2", "Entre $1 e $2"],
  [/^Today: got it in (\d+) of (\d+)$/, "Hoy: acertaste en $1 de $2", "Hoje: acertou em $1 de $2"],
  [/^Today: the grade was (\d+\.\d)$/, "Hoy: la calificación era $1", "Hoje: a nota era $1"],
  [/^Today: (\d+) of (\d+) guesses used$/, "Hoy: $1 de $2 intentos usados", "Hoje: $1 de $2 palpites usados"],
);

// 3.4.21: Daily games section on home (js/daily-games.js).
Object.assign(I18N_ES, {
  "Daily games": "Juegos diarios",
  "Daily games section": "Sección de juegos diarios",
  "New today": "Nuevos hoy",
});
Object.assign(I18N_PT, {
  "Daily games": "Jogos diários",
  "Daily games section": "Seção de jogos diários",
  "New today": "Novos hoje",
});
I18N_PAT.unshift(
  [/^All (\d+) played$/, "Los $1 jugados", "Os $1 jogados"],
  [/^(\d+) of (\d+) played$/, "$1 de $2 jugados", "$1 de $2 jogados"],  // the Daily challenge's time on home ("Today: 5 of 6 in 0:42")
  [/^in (\d+:\d\d)$/, "en $1", "em $1"],
);

// 3.4.23: Daily games new look (js/dg-look.js): share sheets and pictures, face-down prizes, winning line,
// and the results screen's line on your last games.
Object.assign(I18N_ES, {
  "A real tournament list, the same for everyone today.": "Una lista real de torneo, la misma para todos hoy.",
  "Found": "Encontrada",
  "Missed": "Fallada",
  "Play today's challenge first.": "Juega primero el desafío de hoy.",
  "Same deck and shuffle for everyone today. Can you find them all?": "La misma baraja y el mismo barajado para todos hoy. ¿Puedes encontrarlas todas?",
  "Show all": "Ver todas",
  "Unofficial fan tool, not affiliated with The Pokémon Company or Nintendo.": "Herramienta no oficial hecha por fans, sin afiliación con The Pokémon Company ni Nintendo.",
  "Tap to see": "Toca para verla",
  "Your winning line": "Tu jugada ganadora",
  "Missed. Tap to see it": "Fallada. Toca para verla",
  "The link opens today's challenge, so friends get the same deck and shuffle. The picture shows no cards.": "El enlace abre el desafío de hoy, así tus amigos tienen la misma baraja y el mismo barajado. La imagen no muestra cartas.",
  "The picture shows how close each guess got, with no grade and no deck. The link opens today's game.": "La imagen muestra qué tan cerca quedó cada intento, sin la calificación ni la baraja. El enlace abre el juego de hoy.",
  "Share your daily score": "Comparte tu puntuación diaria",
  "Share your result": "Comparte tu resultado",
  "of 6 prizes": "de 6 premios",
  "Guess the grade of today's list. Can you get it?": "Adivina la calificación de la lista de hoy. ¿Lo logras?",
  "The picture shows how rare each pull was, with no card names, so today's prompts stay a surprise.": "La imagen muestra qué tan rara fue cada carta, sin nombres de cartas, así las preguntas de hoy siguen siendo una sorpresa.",
  "Same prompts for everyone. How rare can you go?": "Las mismas preguntas para todos. ¿Qué tan rara puede ser tu carta?",
  "DECK": "BARAJA",
  "accuracy,": "de acierto,",
  "a game.": "por partida.",
});
Object.assign(I18N_PT, {
  "A real tournament list, the same for everyone today.": "Uma lista real de torneio, a mesma para todos hoje.",
  "Found": "Encontrada",
  "Missed": "Perdida",
  "Play today's challenge first.": "Jogue o desafio de hoje primeiro.",
  "Same deck and shuffle for everyone today. Can you find them all?": "O mesmo deck e o mesmo embaralhamento para todos hoje. Você consegue achar todas?",
  "Show all": "Ver todas",
  "Unofficial fan tool, not affiliated with The Pokémon Company or Nintendo.": "Ferramenta não oficial feita por fãs, sem afiliação com The Pokémon Company ou Nintendo.",
  "Tap to see": "Toque para ver",
  "Your winning line": "Sua jogada vencedora",
  "Missed. Tap to see it": "Perdida. Toque para ver",
  "The link opens today's challenge, so friends get the same deck and shuffle. The picture shows no cards.": "O link abre o desafio de hoje, assim seus amigos recebem o mesmo deck e o mesmo embaralhamento. A imagem não mostra cartas.",
  "The picture shows how close each guess got, with no grade and no deck. The link opens today's game.": "A imagem mostra o quão perto cada palpite chegou, sem a nota e sem o deck. O link abre o jogo de hoje.",
  "Share your daily score": "Compartilhe sua pontuação diária",
  "Share your result": "Compartilhe seu resultado",
  "of 6 prizes": "de 6 prêmios",
  "Guess the grade of today's list. Can you get it?": "Adivinhe a nota da lista de hoje. Você consegue?",
  "The picture shows how rare each pull was, with no card names, so today's prompts stay a surprise.": "A imagem mostra o quão rara foi cada carta, sem nomes de cartas, assim as perguntas de hoje continuam uma surpresa.",
  "Same prompts for everyone. How rare can you go?": "As mesmas perguntas para todos. Até onde vai a sua raridade?",
  "DECK": "DECK",
  "accuracy,": "de acerto,",
  "a game.": "por partida.",
});
I18N_PAT.unshift(
  [/^Last (\d+) games:$/, "Últimas $1 partidas:", "Últimas $1 partidas:"],
  [/^Daily challenge #(\d+) scored$/, "Desafío diario #$1 registrado", "Desafio diário #$1 registrado"],
  [/^(\d+) of 6 in (\d+:\d\d)\. Your first try is the one that counts\.$/, "$1 de 6 en $2. Solo cuenta tu primer intento.", "$1 de 6 em $2. Só a sua primeira tentativa conta."],
  [/^Today's score stays (\d+) of 6 in (\d+:\d\d)\.$/, "Tu puntuación de hoy sigue siendo $1 de 6 en $2.", "A pontuação de hoje continua $1 de 6 em $2."],
);

// 3.4.22: Daily games fixes (js/daily-games.js, js/core.js, js/rare-pull.js, js/gtg.js).
Object.assign(I18N_ES, {
  "Grade source in About": "Origen de la calificación en Acerca de RdyDeck",
  "Rare Pull colors and score picture": "Colores y foto de puntuación en Rare Pull",
  "Photo import fixed": "Importación desde foto arreglada",
  "Card guides kept out of search": "Guías de cartas fuera de los buscadores",
  "Card guides: pictures, odds and win records": "Guías de cartas: imágenes, probabilidades y récords de victorias",
  "Card guide link and rulebook notes on cards": "Enlace a la guía y notas del reglamento en las cartas",
  "Card pictures in the deck guides": "Imágenes de las cartas en las guías de barajas",
  "Deck guides and How grading works in More": "Guías de barajas y Cómo funciona la calificación en Más",
  "Grade source on home page": "Origen de la calificación en Inicio",
  "Grades are based on your cards and, for known decks, results from online and local in-person events.": "La calificación se basa en tus cartas y, en barajas conocidas, en los resultados de torneos online y presenciales locales.",
  "What's new card fixed": "Tarjeta de Novedades arreglada",
  "Rare Pull card art fixed": "Imagen de carta de Rare Pull arreglada",
  "Daily games fixes": "Arreglos en los juegos diarios",
  "Daily games new look": "Nuevo aspecto de los juegos diarios",
  "Losing decks grade lower": "Las barajas que pierden califican más bajo",
  "1 day streak": "Racha de 1 día",
  "Card position": "Posición de la carta",
  "Did you mean this card?": "¿Querías decir esta carta?",
  "No card by that name fits.": "No hay ninguna carta con ese nombre que encaje.",
  "is not that kind of card.": "no es ese tipo de carta.",
  "is that kind of card, but fewer than 1 in 20 of those top lists run it.": "es de ese tipo, pero la llevan menos de 1 de cada 20 de esas listas top.",
  "Passing or running out of time scores 0.": "Pasar o quedarte sin tiempo da 0 puntos.",
  "Replay: today's result is already saved.": "Repetición: el resultado de hoy ya está guardado.",
  "1 Prize card taken": "1 carta de Premio tomada",
  "Share Daily challenge result": "Compartir el resultado del Desafío diario",
  "Play Daily challenge": "Jugar el Desafío diario",
  "Replay Daily challenge": "Repetir el Desafío diario",
  "Share Daily puzzle result": "Compartir el resultado del Puzzle diario",
  "Play Daily puzzle": "Jugar el Puzzle diario",
  "Replay Daily puzzle": "Repetir el Puzzle diario",
  "Share Rare Pull result": "Compartir el resultado de Rare Pull",
  "Play Rare Pull": "Jugar a Rare Pull",
  "Replay Rare Pull": "Repetir Rare Pull",
  "Share Guess the Grade result": "Compartir el resultado de Adivina la calificación",
  "Play Guess the Grade": "Jugar a Adivina la calificación",
  "Continue Guess the Grade": "Continuar Adivina la calificación",
  "Result of Guess the Grade": "Resultado de Adivina la calificación",
});
Object.assign(I18N_PT, {
  "Grade source in About": "Origem da nota em Sobre o RdyDeck",
  "Rare Pull colors and score picture": "Cores e imagem da pontuação no Rare Pull",
  "Photo import fixed": "Importação por foto corrigida",
  "Card guides kept out of search": "Guias de cartas fora dos buscadores",
  "Card guides: pictures, odds and win records": "Guias de cartas: imagens, probabilidades e histórico de vitórias",
  "Card guide link and rulebook notes on cards": "Link para o guia e notas do livro de regras nas cartas",
  "Card pictures in the deck guides": "Imagens das cartas nos guias de decks",
  "Deck guides and How grading works in More": "Guias de decks e Como funciona a nota em Mais",
  "Grade source on home page": "Origem da nota no Início",
  "Grades are based on your cards and, for known decks, results from online and local in-person events.": "A nota se baseia nas suas cartas e, em decks conhecidos, nos resultados de torneios online e presenciais locais.",
  "What's new card fixed": "Cartão de Novidades corrigido",
  "Rare Pull card art fixed": "Imagem da carta do Rare Pull corrigida",
  "Daily games fixes": "Correções nos jogos diários",
  "Daily games new look": "Novo visual dos jogos diários",
  "Losing decks grade lower": "Decks que perdem recebem notas mais baixas",
  "1 day streak": "Sequência de 1 dia",
  "Card position": "Posição da carta",
  "Did you mean this card?": "Você quis dizer esta carta?",
  "No card by that name fits.": "Nenhuma carta com esse nome se encaixa.",
  "is not that kind of card.": "não é esse tipo de carta.",
  "is that kind of card, but fewer than 1 in 20 of those top lists run it.": "é desse tipo, mas menos de 1 em cada 20 dessas listas top a usam.",
  "Passing or running out of time scores 0.": "Passar ou ficar sem tempo vale 0 pontos.",
  "Replay: today's result is already saved.": "Repetição: o resultado de hoje já está salvo.",
  "1 Prize card taken": "1 carta de Prêmio pega",
  "Share Daily challenge result": "Compartilhar o resultado do Desafio diário",
  "Play Daily challenge": "Jogar o Desafio diário",
  "Replay Daily challenge": "Repetir o Desafio diário",
  "Share Daily puzzle result": "Compartilhar o resultado do Puzzle diário",
  "Play Daily puzzle": "Jogar o Puzzle diário",
  "Replay Daily puzzle": "Repetir o Puzzle diário",
  "Share Rare Pull result": "Compartilhar o resultado do Rare Pull",
  "Play Rare Pull": "Jogar Rare Pull",
  "Replay Rare Pull": "Repetir Rare Pull",
  "Share Guess the Grade result": "Compartilhar o resultado de Adivinhe a nota",
  "Play Guess the Grade": "Jogar Adivinhe a nota",
  "Continue Guess the Grade": "Continuar Adivinhe a nota",
  "Result of Guess the Grade": "Resultado de Adivinhe a nota",
});
I18N_PAT.unshift(
  [/^Daily puzzle #(\d+)$/, "Puzzle diario #$1", "Puzzle diário #$1"],
  [/^(\d+) Prize cards taken$/, "$1 cartas de Premio tomadas", "$1 cartas de Prêmio pegas"],
  [/^Cards from top lists\. Yours: (.+)\. Theirs: (.+)\.$/, "Cartas de listas top. La tuya: $1. La del rival: $2.", "Cartas de listas top. A sua: $1. A do oponente: $2."],
  [/^Today: not solved in (\d+)$/, "Hoy: sin acertar en $1", "Hoje: não acertou em $1"],
);

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
    // 3.3.2: a card or deck name keeps its own numbers.
    if (r == null) return isCard(norm(s)) ? s : i18nNums(s, cur);
    const m = String(s).match(/^(\s*)[\s\S]*?(\s*)$/);
    return m[1] + i18nNums(r, cur) + m[2];
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
  function attrSkipped(el) {
    try { return !!(el && el.closest && el.closest(I18N_SKIP_ATTRS)); } catch (_) { return false; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (skipped(root)) { if (!attrSkipped(root)) doAttrs(root); return; }
      doAttrs(root);
    }
    const doc = root.ownerDocument || document;
    const tw = doc.createTreeWalker(root, 5 /* SHOW_ELEMENT | SHOW_TEXT */, {
      acceptNode(n) {
        if (n.nodeType === 1) {
          if (n.matches(I18N_SKIP)) {            // FILTER_REJECT: skip the whole subtree
            if (!n.matches(I18N_SKIP_ATTRS)) doAttrs(n);   // an input still gets its placeholder and labels
            return 2;
          }
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
        if (!attrSkipped(el)) doAttrs(el);
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

  return { set, t, lookup, orig, nums: s => i18nNums(s, cur), walk, get lang() { return cur; }, get ready() { return ready; }, add, pick, norm, dict: DICT, pat: PAT, scoped: I18N_SCOPED, cardNames, addCardNames, skip: I18N_SKIP };
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
