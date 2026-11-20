
  // Global error guard: surface silent crashes on iOS
  window.addEventListener('error', function(e) {
    console.error('PT error:', e.message, e.filename, e.lineno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    console.error('PT unhandled promise:', e.reason);
    e.preventDefault(); // don't crash on IndexedDB failures etc
  });// ═══════════ STATE ═══════════
const STORAGE_KEY = 'ptcg_prize_trainer_v2';
function safeLocalGet(key) { try { return localStorage.getItem(key); } catch(e) { return null; } }
function safeLocalSet(key, val) { try { localStorage.setItem(key, val); } catch(e) {} }

let state = {
  decks: [],       // { id, name, cards: [{name, set, num, count, imageUrl}], history: [{score,time,date}] }
  activeDeckId: null,
};

let game = {
  deckCards: [],
  prizes: [],
  visible: [],
  currentIdx: 0,
  guesses: [],
  timerStart: null,
  timerEl: null,
  timerInterval: null,
  elapsed: 0,
  // mode settings
  prizeCount: 6,
  timeLimit: 0,      // seconds, 0 = off
  timeLimitInterval: null,
};

let modeSettings = { prizes: 6, timelimit: 0, tournament: 0, tournamentN: 5, view: 'full', reach: 'off' };

// Tournament block: N back-to-back games with aggregated stats.
let tournament = { active: false, total: 0, current: 0, scores: [], deckId: null };

function setTournamentN(v) {
  const n = Math.max(1, Math.min(20, parseInt(v) || 5));
  modeSettings.tournamentN = n;
  const input = document.getElementById('mode-tournament-n');
  if (input) input.value = n;
  // If user changes N, treat as enabling tournament
  setModeOpt('tournament', 'n');
}
let modeDeckId = null;
let importFormat = 'standard';

// ═══════════ STORAGE ═══════════
// iOS Safari blocks IndexedDB on file://: localStorage is primary, IDB is secondary

function idbOpen() {
  return new Promise((res) => {
    try {
      const req = indexedDB.open('ptcg_db', 1);
      req.onupgradeneeded = e => { try { e.target.result.createObjectStore('kv'); } catch(_){} };
      req.onsuccess = e => res(e.target.result);
      req.onerror   = () => res(null);
      req.onblocked = () => res(null);
      setTimeout(() => res(null), 1000); // iOS file:// may never fire
    } catch(_) { res(null); }
  });
}
async function idbSet(key, val) {
  try {
    const db = await idbOpen();
    if (!db) return;
    await new Promise((res) => {
      try {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = res;
        tx.onerror = res;
      } catch(_) { res(); }
    });
  } catch(_) {}
}
async function idbGet(key) {
  try {
    const db = await idbOpen();
    if (!db) return null;
    return await new Promise((res) => {
      try {
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = e => res(e.target.result || null);
        req.onerror   = () => res(null);
      } catch(_) { res(null); }
    });
  } catch(_) { return null; }
}

async function saveState() {
  const data = JSON.stringify(state);
  // Artifact storage (Claude env)
  if (typeof window.storage !== 'undefined' && window.storage) {
    try { await window.storage.set('ptcg_state', data); } catch(_) {}
  }
  // localStorage: works everywhere including iOS file://
  safeLocalSet(STORAGE_KEY, data);
  // IndexedDB: bonus persistence, fire and forget
  idbSet(STORAGE_KEY, data);
}

async function loadState() {
  let parsed = null;

  // 1. Artifact storage (Claude env)
  if (typeof window.storage !== 'undefined' && window.storage) {
    try {
      const result = await window.storage.get('ptcg_state');
      if (result && result.value) {
        const p = JSON.parse(result.value);
        if (p && p.decks && ptCleanState(p)) { state = p; renderHome(); return; }
      }
    } catch(_) {}
  }

  // 2. localStorage: primary for iOS Safari file://
  try {
    const raw = safeLocalGet(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch(_) {}

  // 3. IndexedDB fallback (may time out on iOS file://)
  if (!parsed || !parsed.decks) {
    try {
      const raw = await idbGet(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch(_) {}
  }

  if (parsed && parsed.decks && ptCleanState(parsed)) state = parsed;
  renderHome();
}
/** 2.5.1: saved data in a bad shape would stop home from drawing, so drop what cannot be read.
 *  Returns false when there is nothing usable (decks is not a list). */
function ptCleanState(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.decks)) return false;
  p.decks = p.decks.filter(d => d && typeof d === 'object' && Array.isArray(d.cards));
  try { ptCanonDecks(p.decks); } catch (_) {}   // 2.5.3: one spelling for card names
  ['daily', 'puzzle'].forEach(k => {
    if (p[k] != null && (typeof p[k] !== 'object' || !p[k].results || typeof p[k].results !== 'object')) delete p[k];
  });
  return true;
}


async function clearAllStorage() {
  if (typeof window.storage !== 'undefined' && window.storage) {
    try { await window.storage.delete('ptcg_state'); } catch(e) {}
  }
  try { await idbSet(STORAGE_KEY, null); } catch(e) {}
  safeLocalSet(STORAGE_KEY, null);
  // 2.5.1: the deck builder draft and the Against the meta picks go too.
  try { ['rd_builder_draft_v1', 'pt_mu60_pick', 'pt_mu71_ask'].forEach(k => localStorage.removeItem(k)); } catch (_) {}
  try { if (typeof bld !== 'undefined') bld = { rows: [], arch: null, from: null, name: '' }; } catch (_) {}
  state = { decks: [], activeDeckId: null };
  renderHome();
  showToast('All data cleared.');
}


// Review screen image fallback (avoids escaped quotes in onerror attribute)
function reviewImgError(img) {
  var fbs = JSON.parse(img.dataset.fallbacks || '[]');
  var idx = parseInt(img.dataset.fallbackIdx) || 0;
  if (idx < fbs.length) {
    img.dataset.fallbackIdx = idx + 1;
    img.src = fbs[idx];
  } else {
    img.parentElement.innerHTML = '<div class="review-placeholder"><i class=ph-card></i></div>';
  }
}

// ═══════════ CARD CATEGORY ═══════════
/*
 * One place decides whether a card is a Pokémon, Trainer or Energy,
 * in this order:
 *   1. The list's own section header ("Pokémon: 20", "Trainer: 32",
 *      "Energy: 8"), saved on the card at import.
 *   2. Card data from the lookup, but only when it was verified against
 *      the card's name (resolved), never an unchecked read that may
 *      describe a different card with the same set number.
 *   3. The card's name. Every Pokémon card names a species, so a name
 *      with a species in it (or an ex, V, VSTAR suffix) is a Pokémon,
 *      a name with "Energy" is an Energy unless it is an Energy Trainer,
 *      and everything else is a Trainer. Checked against every English
 *      card name since Black & White.
 * The old fallback did the reverse (unknown name means Pokémon), which
 * is how newer Supporters such as Dawn ended up in the Pokémon group.
 */
const CAT_SPECIES = (
  'abomasnow|abra|absol|accelgor|aegislash|aerodactyl|aggron|aipom|alakazam|alcremie|alomomola|altaria|amaura|' +
  'ambipom|amoonguss|ampharos|annihilape|anorith|appletun|applin|araquanid|arbok|arboliva|arcanine|arceus|' +
  'archaludon|archen|archeops|arctibax|arctovish|arctozolt|ariados|armaldo|armarouge|aromatisse|aron|arrokuda|' +
  'articuno|audino|aurorus|avalugg|axew|azelf|azumarill|azurill|bagon|baltoy|banette|barbaracle|barboach|' +
  'barraskewda|basculegion|basculin|bastiodon|baxcalibur|bayleef|beartic|beautifly|beedrill|beheeyem|beldum|' +
  'bellibolt|bellossom|bellsprout|bergmite|bewear|bibarel|bidoof|binacle|bisharp|blacephalon|blastoise|blaziken|' +
  'blipbug|blissey|blitzle|boldore|boltund|bombirdier|bonsly|bouffalant|bounsweet|braixen|brambleghast|bramblin|' +
  'braviary|breloom|brionne|bronzong|bronzor|brute bonnet|bruxish|budew|buizel|bulbasaur|buneary|bunnelby|burmy|' +
  'butterfree|buzzwole|cacnea|cacturne|calyrex|camerupt|capsakid|carbink|carkol|carnivine|carracosta|carvanha|' +
  'cascoon|castform|caterpie|celebi|celesteela|centiskorch|ceruledge|cetitan|cetoddle|chandelure|chansey|' +
  'charcadet|charizard|charjabug|charmander|charmeleon|chatot|cherrim|cherubi|chesnaught|chespin|chewtle|chi-yu|' +
  'chien-pao|chikorita|chimchar|chimecho|chinchou|chingling|cinccino|cinderace|clamperl|clauncher|clawitzer|' +
  'claydol|clefable|clefairy|cleffa|clobbopus|clodsire|cloyster|coalossal|cobalion|cofagrigus|combee|combusken|' +
  'comfey|conkeldurr|copperajah|corphish|corsola|corviknight|corvisquire|cosmoem|cosmog|cottonee|crabominable|' +
  'crabrawler|cradily|cramorant|cranidos|crawdaunt|cresselia|croagunk|crobat|crocalor|croconaw|crustle|cryogonal|' +
  'cubchoo|cubone|cufant|cursola|cutiefly|cyclizar|cyndaquil|dachsbun|darkrai|darmanitan|dartrix|darumaka|' +
  'decidueye|dedenne|deerling|deino|delcatty|delibird|delphox|deoxys|dewgong|dewott|dewpider|dhelmise|dialga|' +
  'diancie|diggersby|diglett|dipplin|ditto|dodrio|doduo|dolliv|dondozo|donphan|dottler|doublade|dracovish|' +
  'dracozolt|dragalge|dragapult|dragonair|dragonite|drakloak|drampa|drapion|dratini|drednaw|dreepy|drifblim|' +
  'drifloon|drilbur|drizzile|drowzee|druddigon|dubwool|ducklett|dudunsparce|dugtrio|dunsparce|duosion|duraludon|' +
  'durant|dusclops|dusknoir|duskull|dustox|dwebble|eelektrik|eelektross|eevee|eiscue|ekans|eldegoss|electabuzz|' +
  'electivire|electrike|electrode|elekid|elgyem|emboar|emolga|empoleon|enamorus|entei|escavalier|espathra|espeon|' +
  'espurr|eternatus|excadrill|exeggcute|exeggutor|exploud|falinks|farfetch\'d|farigiraf|fearow|feebas|fennekin|' +
  'feraligatr|ferroseed|ferrothorn|fezandipiti|fidough|finizen|finneon|flaaffy|flabebe|flamigo|flapple|flareon|' +
  'fletchinder|fletchling|flittle|floatzel|floette|floragato|florges|flutter mane|flygon|fomantis|foongus|' +
  'forretress|fraxure|frigibax|frillish|froakie|frogadier|froslass|frosmoth|fuecoco|furfrou|furret|gabite|gallade|' +
  'galvantula|garbodor|garchomp|gardevoir|garganacl|gastly|gastrodon|genesect|gengar|geodude|gholdengo|gible|' +
  'gigalith|gimmighoul|girafarig|giratina|glaceon|glalie|glameow|glastrier|gligar|glimmet|glimmora|gliscor|gloom|' +
  'gogoat|golbat|goldeen|golduck|golem|golett|golisopod|golurk|goodra|goomy|gorebyss|gossifleur|gothita|' +
  'gothitelle|gothorita|gouging fire|gourgeist|grafaiai|granbull|grapploct|graveler|great tusk|greavard|greedent|' +
  'greninja|grimer|grimmsnarl|grookey|grotle|groudon|grovyle|growlithe|grubbin|grumpig|gulpin|gumshoos|gurdurr|' +
  'guzzlord|gyarados|hakamo-o|happiny|hariyama|hatenna|hatterene|hattrem|haunter|hawlucha|haxorus|heatmor|heatran|' +
  'heliolisk|helioptile|heracross|herdier|hippopotas|hippowdon|hitmonchan|hitmonlee|hitmontop|ho-oh|honchkrow|' +
  'honedge|hoopa|hoothoot|hoppip|horsea|houndoom|houndour|houndstone|huntail|hydrapple|hydreigon|hypno|igglybuff|' +
  'illumise|impidimp|incineroar|indeedee|infernape|inkay|inteleon|iron boulder|iron bundle|iron crown|iron hands|' +
  'iron jugulis|iron leaves|iron moth|iron thorns|iron treads|iron valiant|ivysaur|jangmo-o|jellicent|jigglypuff|' +
  'jirachi|jolteon|joltik|jumpluff|jynx|kabuto|kabutops|kadabra|kakuna|kangaskhan|karrablast|kartana|kecleon|' +
  'keldeo|kilowattrel|kingambit|kingdra|kingler|kirlia|klang|klawf|kleavor|klefki|klink|klinklang|koffing|komala|' +
  'kommo-o|koraidon|krabby|kricketot|kricketune|krokorok|krookodile|kubfu|kyogre|kyurem|lairon|lampent|landorus|' +
  'lanturn|lapras|larvesta|larvitar|latias|latios|leafeon|leavanny|lechonk|ledian|ledyba|lickilicky|lickitung|' +
  'liepard|lileep|lilligant|lillipup|linoone|litleo|litten|litwick|lokix|lombre|lopunny|lotad|loudred|lucario|' +
  'ludicolo|lugia|lumineon|lunala|lunatone|lurantis|luvdisc|luxio|luxray|lycanroc|mabosstiff|machamp|machoke|' +
  'machop|magby|magcargo|magearna|magikarp|magmar|magmortar|magnemite|magneton|magnezone|makuhita|malamar|' +
  'mamoswine|manaphy|mandibuzz|manectric|mankey|mantine|mantyke|maractus|mareanie|mareep|marill|marowak|marshadow|' +
  'marshtomp|maschiff|masquerain|maushold|mawile|medicham|meditite|meganium|melmetal|meloetta|meltan|meowscarada|' +
  'meowstic|meowth|mesprit|metagross|metang|metapod|mew|mewtwo|mienfoo|mienshao|mightyena|milcery|milotic|miltank|' +
  'mime jr.|mimikyu|minccino|minior|minun|miraidon|misdreavus|mismagius|moltres|monferno|morelull|morgrem|morpeko|' +
  'mothim|mr. mime|mr. rime|mudbray|mudkip|mudsdale|muk|munchlax|munkidori|munna|murkrow|musharna|nacli|naclstack|' +
  'naganadel|natu|necrozma|nickit|nidoking|nidoqueen|nidoran♀|nidoran♂|nidorina|nidorino|nihilego|nincada|' +
  'ninetales|ninjask|noctowl|noibat|noivern|nosepass|numel|nuzleaf|nymble|obstagoon|octillery|oddish|ogerpon|' +
  'oinkologne|okidogi|omanyte|omastar|onix|oranguru|orbeetle|oricorio|orthworm|oshawott|overqwil|pachirisu|' +
  'palafin|palkia|palossand|palpitoad|pancham|pangoro|panpour|pansage|pansear|paras|parasect|passimian|patrat|' +
  'pawmi|pawmo|pawmot|pawniard|pecharunt|pelipper|perrserker|persian|petilil|phanpy|phantump|pheromosa|phione|' +
  'pichu|pidgeot|pidgeotto|pidgey|pidove|pignite|pikachu|pikipek|piloswine|pincurchin|pineco|pinsir|piplup|plusle|' +
  'poipole|politoed|poliwag|poliwhirl|poliwrath|poltchageist|polteageist|ponyta|poochyena|popplio|porygon|' +
  'porygon-z|porygon2|primarina|primeape|prinplup|probopass|psyduck|pumpkaboo|pupitar|purrloin|purugly|pyroar|' +
  'pyukumuku|quagsire|quaquaval|quaxly|quaxwell|quilava|quilladin|qwilfish|raboot|rabsca|raging bolt|raichu|' +
  'raikou|ralts|rampardos|rapidash|raticate|rattata|rayquaza|regice|regidrago|regieleki|regigigas|regirock|' +
  'registeel|relicanth|rellor|remoraid|reshiram|reuniclus|revavroom|rhydon|rhyhorn|rhyperior|ribombee|rillaboom|' +
  'riolu|roaring moon|rockruff|roggenrola|rolycoly|rookidee|roselia|roserade|rotom|rowlet|rufflet|runerigus|' +
  'sableye|salamence|salandit|salazzle|samurott|sandaconda|sandile|sandshrew|sandslash|sandy shocks|sandygast|' +
  'sawk|sawsbuck|scatterbug|sceptile|scizor|scolipede|scorbunny|scovillain|scrafty|scraggy|scream tail|scyther|' +
  'seadra|seaking|sealeo|seedot|seel|seismitoad|sentret|serperior|servine|seviper|sewaddle|sharpedo|shaymin|' +
  'shedinja|shelgon|shellder|shellos|shelmet|shieldon|shiftry|shiinotic|shinx|shroodle|shroomish|shuckle|shuppet|' +
  'sigilyph|silcoon|silicobra|silvally|simipour|simisage|simisear|sinistcha|sinistea|sirfetch\'d|sizzlipede|' +
  'skarmory|skeledirge|skiddo|skiploom|skitty|skorupi|skrelp|skuntank|skwovet|slaking|slakoth|sliggoo|' +
  'slither wing|slowbro|slowking|slowpoke|slugma|slurpuff|smeargle|smoliv|smoochum|sneasel|sneasler|snivy|snom|' +
  'snorlax|snorunt|snover|snubbull|sobble|solgaleo|solosis|solrock|spearow|spectrier|spewpa|spheal|spidops|' +
  'spinarak|spinda|spiritomb|spoink|sprigatito|spritzee|squawkabilly|squirtle|stakataka|stantler|staraptor|' +
  'staravia|starly|starmie|staryu|steelix|steenee|stonjourner|stoutland|stufful|stunfisk|stunky|sudowoodo|suicune|' +
  'sunflora|sunkern|surskit|swablu|swadloon|swalot|swampert|swanna|swellow|swinub|swirlix|swoobat|sylveon|tadbulb|' +
  'taillow|talonflame|tandemaus|tangela|tangrowth|tapu bulu|tapu fini|tapu koko|tapu lele|tarountula|tatsugiri|' +
  'tauros|teddiursa|tentacool|tentacruel|tepig|terapagos|terrakion|thievul|throh|thundurus|thwackey|timburr|' +
  'ting-lu|tinkatink|tinkaton|tinkatuff|tirtouga|toedscool|toedscruel|togedemaru|togekiss|togepi|togetic|torchic|' +
  'torkoal|tornadus|torracat|torterra|totodile|toucannon|toxapex|toxel|toxicroak|toxtricity|tranquill|trapinch|' +
  'treecko|trevenant|tropius|trubbish|trumbeak|tsareena|turtonator|turtwig|tympole|tynamo|type: null|typhlosion|' +
  'tyranitar|tyrantrum|tyrogue|tyrunt|umbreon|unfezant|unown|ursaluna|ursaring|urshifu|uxie|vanillish|vanillite|' +
  'vanilluxe|vaporeon|varoom|veluza|venipede|venomoth|venonat|venusaur|vespiquen|vibrava|victini|victreebel|' +
  'vigoroth|vikavolt|vileplume|virizion|vivillon|volbeat|volcanion|volcarona|voltorb|vullaby|vulpix|wailmer|' +
  'wailord|walking wake|walrein|wartortle|watchog|wattrel|weavile|weedle|weepinbell|weezing|whimsicott|whirlipede|' +
  'whiscash|whismur|wigglytuff|wiglett|wimpod|wingull|wishiwashi|wo-chien|wobbuffet|woobat|wooloo|wooper|wormadam|' +
  'wugtrio|wurmple|wynaut|wyrdeer|xatu|xerneas|xurkitree|yamask|yamper|yanma|yanmega|yungoos|yveltal|zacian|' +
  'zamazenta|zangoose|zapdos|zarude|zebstrika|zekrom|zeraora|zigzagoon|zoroark|zorua|zubat|zweilous|zygarde'
).split('|');

// Trainers whose names contain a species. Spirit Links and Fossils follow a pattern.
const CAT_TRAINER_NAMES = new Set([
  'Root Fossil Lileep',
  'Old Amber Aerodactyl',
  'Rotom Bike',
  'Rotom Phone',
  'Rotom Dex Poké Finder Mode',
  'Rotom Dex',
  'Drone Rotom',
  'Dome Fossil Kabuto',
  'Helix Fossil Omanyte',
  'Snorlax Doll',
  'Armor Fossil Shieldon',
  'Claw Fossil Anorith',
  'Ange Floette'
].map(n => catNorm(n)));

function catNorm(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[‘’]/g, "'")
    .replace(/\{[a-z]\}/g, ' ').replace(/\s+([♀♂])/g, '$1')
    .replace(/\s+/g, ' ').trim();
}

let _catSpeciesRe = null;
function catSpeciesRe() {
  if (!_catSpeciesRe) {
    const alt = CAT_SPECIES.slice().sort((a, b) => b.length - a.length)
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    _catSpeciesRe = new RegExp('(?:^|[^a-z0-9])(?:' + alt + ')(?=$|[^a-z0-9])');
  }
  return _catSpeciesRe;
}

/** Category from the name alone: 'pokemon', 'trainer' or 'energy'. */
function categoryFromName(name) {
  const n = catNorm(name);
  if (!n) return 'trainer';
  if (CAT_TRAINER_NAMES.has(n) || /\bspirit link$/.test(n) || /\bfossil\b/.test(n)) return 'trainer';
  if (/\benergy\b/.test(n)) {
    if (/\b(retrieval|switch|search|recycler|system|loto|lotto|coin|sticker|swatter|capsule|pouch|reset|spinner|pick)\b/.test(n)) return 'trainer';
    return 'energy';
  }
  if (catSpeciesRe().test(n)) return 'pokemon';
  if (/(?:^|\s)(ex|gx|v|vmax|vstar|v-union|break|lv\.x|prime|legend|star|δ)$/.test(n)) return 'pokemon';
  return 'trainer';
}

/** Map a card data supertype to a category, or null when unknown. */
function categoryFromSupertype(sup) {
  const s = catNorm(sup);
  if (s.startsWith('pok')) return 'pokemon';
  if (s === 'trainer') return 'trainer';
  if (s === 'energy') return 'energy';
  return null;
}

/** The category shown for a card. See the order above. */
function cardCategory(card) {
  if (!card) return 'trainer';
  if (card.section === 'pokemon' || card.section === 'trainer' || card.section === 'energy') return card.section;
  if (card.resolved === true || card.dataSource === 'name') {
    const c = categoryFromSupertype(card.supertype);
    if (c) return c;
  }
  return categoryFromName(card.apiName || card.name);
}

/** Section header lines: "Pokémon: 20", "Trainer (32)", "## Energy - 8". */
function sectionFromHeader(line) {
  const t = catNorm(line).replace(/^[#*=\-\s\[]+/, '');
  if (/^\d/.test(t)) return null;
  const m = t.match(/^(pokemon|trainers?|energy|energies)\s*(?:[:(\-\]*#=]|\d|$)/);
  if (!m) return null;
  return m[1].startsWith('pok') ? 'pokemon' : m[1].startsWith('trainer') ? 'trainer' : 'energy';
}

/** Parse a whole list, keeping the section each card was listed under. */
const PT_SYM_WORD = { g: 'Grass', r: 'Fire', w: 'Water', l: 'Lightning', p: 'Psychic', f: 'Fighting', d: 'Darkness', m: 'Metal', y: 'Fairy', n: 'Dragon', c: 'Colorless' };
/** 2.5.3: one spelling for a card name, whatever list it came from. Pokemon TCG Live writes Energy types
 *  as symbols ("Basic {G} Energy", "Telepathic {P} Energy"), phones type curly apostrophes ("Boss’s Orders"),
 *  and the card tables and winning lists spell both out ("Grass Energy", "Telepathic Psychic Energy",
 *  "Boss's Orders"). A name that read differently missed those tables and graded lower, so every list is
 *  read into the plain spelling at import, and saved decks are moved to it when they load. */
function ptCanonName(name) {
  let s = String(name || '')
    .replace(/[\u2018\u2019\u02bc\u0060\u00b4\u2032]/g, "'")
    .replace(/\{([a-z])\}/gi, (m, ch) => PT_SYM_WORD[ch.toLowerCase()] || m)
    // 3.2.8: markup pasted around a name ("<b>Fezandipiti ex</b>") is not part of it either.
    .replace(/<\/?[a-z][^<>]*>/gi, '')
    // 3.2.8: emoji ("\ud83d\udd25 Fezandipiti ex") are not part of a card's name, but the female and male signs are.
    .replace(/(?![\u2640\u2642])\p{Extended_Pictographic}|[\ufe0f\u200d\u20e3]|\p{Regional_Indicator}|[\u{1f3fb}-\u{1f3ff}]/gu, '')
    .replace(/\s+/g, ' ').replace(/ ([\u2640\u2642])/g, '$1').trim();   // 2.5.5: "Nidoran \u2640" is "Nidoran\u2640"
  const b = s.match(/^basic (grass|fire|water|lightning|psychic|fighting|darkness|metal) energy$/i);
  if (b) s = b[1].charAt(0).toUpperCase() + b[1].slice(1).toLowerCase() + ' Energy';
  return s;
}
/** 2.5.3: saved decks (and decks opened from a backup) to the plain spelling. Card data stays as read. */
// 2.5.4: Tera, Ancient and Future, by printing, from pokemon-tcg-data (every Scarlet and Violet and
// Mega Evolution set). The second card source (TCGdex, used when pokemontcg.io can't be reached)
// has no such marks, so a Tera Pokemon read from it lost its Tera tag, and Glass Trumpet or Area
// Zero Underdepths said the list ran no Tera Pokemon. A printing in a set this table covers goes by
// the table alone; a card from a set it doesn't cover goes by its name, where every printing agrees.
const PT_TAGS = {"ids":{"tera":"ASC 121|ASC 160|ASC 179|ASC 277|ASC 38|ASC 57|ASC 73|OBF 125|OBF 159|OBF 179|OBF 210|OBF 211|OBF 212|OBF 215|OBF 222|OBF 223|OBF 228|OBF 42|OBF 66|OBF 96|PAF 2|PAF 212|PAF 214|PAF 234|PAF 54|PAF 6|PAL 230|PAL 238|PAL 239|PAL 5|PAL 86|PAL 93|PAR 100|PAR 137|PAR 217|PAR 219|PAR 220|PAR 226|PAR 227|PAR 245|PAR 260|PAR 3|PAR 38|PAR 46|PAR 58|PAR 98|PRE 12|PRE 14|PRE 144|PRE 145|PRE 146|PRE 147|PRE 148|PRE 149|PRE 150|PRE 152|PRE 153|PRE 155|PRE 156|PRE 160|PRE 161|PRE 165|PRE 167|PRE 169|PRE 17|PRE 177|PRE 179|PRE 180|PRE 23|PRE 26|PRE 27|PRE 28|PRE 30|PRE 34|PRE 41|PRE 58|PRE 6|PRE 60|PRE 73|PRE 75|SCR 128|SCR 157|SCR 158|SCR 159|SCR 168|SCR 170|SCR 173|SCR 28|SCR 32|SCR 51|SFA 15|SFA 81|SSP 106|SSP 119|SSP 133|SSP 142|SSP 159|SSP 219|SSP 221|SSP 222|SSP 223|SSP 225|SSP 226|SSP 228|SSP 238|SSP 240|SSP 242|SSP 247|SSP 248|SSP 36|SSP 57|SSP 86|SSP 91|SVI 224|SVI 225|SVI 32|SVI 45|SVP 163|SVP 164|SVP 165|SVP 56|SVP 74|TEF 108|TEF 190|TEF 194|TEF 60|TWM 106|TWM 112|TWM 130|TWM 190|TWM 191|TWM 192|TWM 194|TWM 198|TWM 199|TWM 200|TWM 211|TWM 212|TWM 213|TWM 214|TWM 215|TWM 221|TWM 25|TWM 29|TWM 40|TWM 64","ancient":"PAF 53|PAR 107|PAR 108|PAR 123|PAR 124|PAR 159|PAR 163|PAR 170|PAR 203|PAR 207|PAR 228|PAR 229|PAR 239|PAR 250|PAR 251|PAR 256|PAR 262|PAR 86|PRE 106|PRE 107|PRE 120|PRE 159|PRE 162|PRE 166|PRE 178|PRE 42|PRE 43|PRE 55|PRE 56|PRE 65|SCR 111|SFA 26|SFA 96|SSP 116|SSP 38|SSP 96|SVP 127|SVP 144|SVP 145|SVP 151|SVP 65|SVP 67|SVP 72|SVP 91|SVP 97|TEF 109|TEF 119|TEF 120|TEF 123|TEF 140|TEF 141|TEF 147|TEF 188|TEF 189|TEF 196|TEF 200|TEF 204|TEF 205|TEF 208|TEF 214|TEF 215|TEF 218|TEF 38|TEF 50|TEF 77|TEF 78|TEF 96|TEF 97|TEF 98|TWM 118|TWM 197|TWM 63|TWM 94","future":"PAF 66|PAR 158|PAR 164|PAR 171|PAR 180|PAR 187|PAR 216|PAR 223|PAR 225|PAR 240|PAR 248|PAR 249|PAR 257|PAR 261|PAR 28|PAR 56|PAR 70|PAR 89|PRE 104|PRE 121|PRE 130|PRE 154|PRE 157|PRE 158|PRE 176|PRE 31|PRE 32|PRE 46|SCR 71|SFA 9|SSP 132|SSP 55|SSP 69|SVP 128|SVP 146|SVP 147|SVP 58|SVP 66|SVP 68|SVP 73|SVP 92|SVP 98|TEF 118|TEF 121|TEF 122|TEF 139|TEF 145|TEF 149|TEF 158|TEF 186|TEF 191|TEF 192|TEF 198|TEF 203|TEF 206|TEF 207|TEF 213|TEF 216|TEF 217|TEF 25|TEF 61|TEF 62|TEF 79|TEF 80|TEF 81|TEF 99|TWM 19|TWM 196|TWM 62|TWM 77"},"names":{"tera":["Alolan Exeggutor ex","Arcanine ex","Ceruledge ex","Cinderace ex","Cornerstone Mask Ogerpon ex","Dedenne ex","Dragapult ex","Dragonite ex","Eevee ex","Eiscue ex","Espathra ex","Farigiraf ex","Flareon ex","Flygon ex","Forretress ex","Froslass ex","Galvantula ex","Garchomp ex","Glaceon ex","Greedent ex","Gyarados ex","Hearthflame Mask Ogerpon ex","Hoopa ex","Jolteon ex","Leafeon ex","Magcargo ex","Palossand ex","Slowking ex","Tatsugiri ex","Teal Mask Ogerpon ex","Toxtricity ex","Tsareena ex","Vaporeon ex","Vespiquen ex","Wellspring Mask Ogerpon ex","Wugtrio ex"],"ancient":["Ancient Booster Energy Capsule","Awakening Drum","Brute Bonnet","Earthen Vessel","Explorer's Guidance","Flutter Mane","Gouging Fire","Gouging Fire ex","Great Tusk","Professor Sada's Vitality","Raging Bolt","Raging Bolt ex","Roaring Moon","Roaring Moon ex","Sandy Shocks","Sandy Shocks ex","Scream Tail","Scream Tail ex","Slither Wing","Walking Wake","Walking Wake ex"],"future":["Ciphermaniac's Codebreaking","Future Booster Energy Capsule","Iron Boulder","Iron Boulder ex","Iron Bundle","Iron Crown","Iron Crown ex","Iron Hands","Iron Hands ex","Iron Jugulis","Iron Leaves","Iron Leaves ex","Iron Moth","Iron Thorns","Iron Thorns ex","Iron Treads","Iron Valiant","Iron Valiant ex","Professor Turo's Scenario","Reboot Pod","Techno Radar"]},"sets":"30C ASC BLK CRI DLR DRI JTG MEG MEW OBF PAF PAL PAR PBL PFL POR PRE SCR SFA SSP SVE SVI SVP TEF TWM WHT"};
let _ptTagSets = null;
function ptTagsFor(name, set, num) {
  if (!_ptTagSets) _ptTagSets = { sets: new Set(PT_TAGS.sets.split(' ')), ids: {} };
  const code = String(set || '').trim().toUpperCase().replace(/^PR-SV$/, 'SVP');
  const id = code + ' ' + String(num || '').trim().toUpperCase().replace(/^0+(?=\d)/, '');
  const known = _ptTagSets.sets.has(code) && !!String(num || '').trim();
  const nm = ptCanonName(name);
  return Object.keys(PT_TAGS.ids).filter(t => {
    if (!_ptTagSets.ids[t]) _ptTagSets.ids[t] = new Set(PT_TAGS.ids[t].split('|'));
    return known ? _ptTagSets.ids[t].has(id) : PT_TAGS.names[t].includes(nm);
  });
}
/** Add a Pokemon's or Trainer's missing Tera, Ancient or Future mark to its card data. */
function ptTagCard(c) {
  if (!c || !/^(pok[e\u00e9]mon|trainer)$/i.test(String(c.supertype || ''))) return;
  const sub = Array.isArray(c.sub) ? c.sub : [];
  const add = ptTagsFor(c.name, c.set, c.num).filter(t => !sub.includes(t));
  if (add.length) c.sub = sub.concat(add);
}
/** 2.5.5: the promo codes Pokemon TCG Live writes (PR-SV, PR-ME) to the ones Limitless and the card sources use. */
function ptCanonSet(set) {
  const s = String(set || '').trim().toUpperCase();
  return ({ 'PR-SV': 'SVP', 'PR-ME': 'MEP', 'PR-MEP': 'MEP' })[s] || ptSetAlias(set) || set;
}
/** 3.2.8: a card database set id (swsh9, sv3pt5, or TCGdex's sv03.5) as the set code lists use (BRS, MEW), or null. */
function ptSetAlias(id) {
  const raw = String(id || '').trim();
  if (!raw || typeof TCGEnrich === 'undefined' || !TCGEnrich.SET_MAP) return null;
  if (TCGEnrich.SET_MAP[raw.toUpperCase()]) return null;   // already a set code
  const k = raw.toLowerCase().replace(/^(sv|me)0+(?=\d)/, '$1').replace(/\.5$/, 'pt5');
  if (!/^[a-z]+\d*(?:pt5)?$/.test(k)) return null;
  for (const code in TCGEnrich.SET_MAP) if (TCGEnrich.SET_MAP[code] === k) return code;
  return null;
}
function ptCanonDecks(decks) {
  (decks || []).forEach(d => (d && Array.isArray(d.cards) ? d.cards : []).forEach(c => {
    if (c && typeof c.name === 'string') { const n = ptCanonName(c.name); if (n && n !== c.name) c.name = n; }
    if (c && typeof c.set === 'string') { const k = ptCanonSet(c.set); if (k !== c.set) c.set = k; }
    try { ptTagCard(c); } catch (_) {}   // 2.5.4
  }));
}

function parseDeckList(raw) {
  let section = null, skipped = 0;
  const cards = [];
  String(raw || '').split('\n').forEach(line => {
    if (!line.trim()) return;
    const sec = sectionFromHeader(line);
    if (sec) { section = sec; return; }
    if (/^\s*total\b/i.test(line)) return;
    const c = parseLine(line);
    // 2.5.1: count the lines that could not be read (and "0 Card" lines), so the import box can say so.
    // 3.2.8: and lines with more copies than a whole deck holds ("999 Zzz"), which no list means.
    if (!c || !(c.count > 0) || c.count > 60) { if (!/^\s*(\/\/|#)/.test(line)) skipped++; return; }
    c.name = ptCanonName(c.name);   // 2.5.3
    if (!c.name) { skipped++; return; }
    if (c.set) c.set = ptCanonSet(c.set);   // 2.5.5
    if (section) c.section = section;
    // 3.2.8: the same card on two lines is one entry ("1 Poké Pad POR 81" twice reads as 2).
    const same = cards.find(x => x.name.toLowerCase() === c.name.toLowerCase() && x.set === c.set && x.num === c.num && x.section === c.section);
    if (same) { same.count += c.count; return; }
    cards.push(c);
  });
  Object.defineProperty(cards, 'skipped', { value: skipped });
  return cards;
}
/** 2.5.1: the import and edit box line under the list: card count, and any lines not read. */
function parsePreviewText(parsed, want) {
  const total = parsed.reduce((a, c) => a + c.count, 0), n = parsed.skipped || 0;
  const skip = n ? ` ${n} line${n === 1 ? ' was' : 's were'} not read. Check ${n === 1 ? 'it' : 'them'} against the list.` : '';
  // 3.2.8: unique cards by name, and what the rules flag before any card is read: more than 4 with one name,
  // and cards from sets that are no longer legal (Sword and Shield or earlier, or TCG Pocket).
  const key = c => (typeof rules34Key === 'function' ? rules34Key(c.name) : String(c.name).toLowerCase());
  const byName = new Map();
  parsed.forEach(c => { const k = key(c), r = byName.get(k) || { name: c.name, n: 0, be: false }; r.n += c.count;
    if (typeof rules34IsBasicEnergy === 'function' && rules34IsBasicEnergy(c)) r.be = true; byName.set(k, r); });
  const over = [...byName.values()].filter(r => !r.be && r.n > 4);
  const overT = over.slice(0, 2).map(r => ` There are ${r.n} ${r.name}, and the most allowed is 4.`).join('');
  const old = parsed.filter(c => c.set && ((typeof r29OldSet === 'function' && r29OldSet(c.set)) || (typeof r29PocketSet === 'function' && r29PocketSet(c.set))))
    .reduce((a, c) => a + c.count, 0);
  const oldT = old ? ` ${old} card${old === 1 ? ' is' : 's are'} from a set that is not Standard legal now.` : '';
  return { warn: !!n || total !== want || !!over.length || !!old,
    t: `Parsed ${byName.size} unique cards, ${total} total.${total !== want ? ' Expected ' + want + '.' : ' ' + want + ' cards, ready.'}${overT}${oldT}${skip}` };
}

/** Deck list text grouped under section headers, for the edit box. */
function deckListText(cards) {
  const groups = { pokemon: [], trainer: [], energy: [] };
  (cards || []).forEach(c => groups[cardCategory(c)].push(c));
  const label = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
  return Object.keys(groups).filter(k => groups[k].length).map(k => {
    const n = groups[k].reduce((a, c) => a + c.count, 0);
    return label[k] + ': ' + n + '\n' + groups[k].map(c => {
      const parts = [c.count, c.name];
      if (c.set) parts.push(c.set);
      if (c.num) parts.push(c.num);
      return parts.join(' ');
    }).join('\n');
  }).join('\n\n');
}

// ═══════════ DECK REVIEW ═══════════
function openReview(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  state.activeDeckId = deckId;
  renderReview(deck);
  showScreen('review');
  if (deckNeedsData(deck)) refreshDeckData(deck);
}

// Bump when the card lookup changes in a way that makes old reads wrong.
const ENRICH_VER = 22;  // 3.4: re-read to store each attack's text and printed damage, so Goldfish can play attacks. 3.2.7: re-read to store attacks that discard cards from your hand or deck (outlets for discard pile revival). 3.2.5: re-read to store attacks that put Pokemon onto your Bench from your discard pile (Kingdra ex's King's Order). 2.5.6: re-read so two different cards with one name (Greninja ex from TWM and 30C) each get their own data. v67: re-read so TCGdex card text spells Energy symbols as words (Munkidori's "{D} Energy"). v67: re-read to store each Pokemon's Retreat Cost for Goldfish. v66: re-read to store the Basic behind a Stage 2 whose Stage 1 is not in the list. v65: re-read to store Special Energy text for the Trainer check. v63: re-read for attacks that lock, mill or wall (control decks). v62: re-read for conditions on fixed damage bonuses and Abilities that place counters after a cost. v61: re-read for attacks that count the cards in your hand. v60: re-read for Ability and attack effects read sentence by sentence. v58: re-read to store card text for Goldfish (v56: attacks that count Pokemon in play or cards milled)
const _dataTried = new Set();
const _dataBusy = new Set();
const _dataRetry = new Map();   // 3.3.3: reads this visit that could not ask for every card

function deckNeedsData(deck) {
  if ((deck.enrichVer || 0) < ENRICH_VER) return true;
  // 3.3.1 (Muse 3.3 retest, H4/H5): a card read from another printing is read again once a session, so a deck
  // saved while the lookup missed its printing (Lost Origin Gengar under 3.2.7) gets its own card text once it can.
  if ((deck.cards || []).some(c => c && c.byName) && !_dataTried.has(deck.id)) return true;
  const cov = deck.coverage;
  return !!(cov && cov.unresolved > 0 && !_dataTried.has(deck.id));
}

/** Read card data again in the background, then redraw whatever tab is open. */
async function refreshDeckData(deck) {
  if (_dataBusy.has(deck.id)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  _dataBusy.add(deck.id);
  _dataTried.add(deck.id);
  const note = document.getElementById('review-coverage');
  if (note && state.activeDeckId === deck.id) {
    note.textContent = 'Reading card data for this deck\u2026';
    note.style.display = 'block';
    note.dataset.reading = String(deck.id);
  }
  let cov = null;
  try { cov = await enrichDeckCards(deck.cards); } catch (_) {}
  _dataBusy.delete(deck.id);
  // 3.3.3 (Muse 3.3.2 retest): a saved deck kept Gastly's text from another printing when pokemontcg.io did not
  // answer the one read a visit, while a fresh import of the same list read its own. A read that could not ask is
  // tried again when the deck is opened next, up to three reads a visit.
  if ((!cov || cov.partial || cov.otherLeft) && (deck.cards || []).some(c => c && c.byName)) {
    const n = (_dataRetry.get(deck.id) || 0) + 1;
    _dataRetry.set(deck.id, n);
    if (n < 3) _dataTried.delete(deck.id);
  }
  // 3.3.2 (Muse 3.3.1 retest): the reading note always ends with the read, whatever screen is open now.
  const done = () => {
    const n = document.getElementById('review-coverage');
    if (!n || n.dataset.reading !== String(deck.id)) return;
    delete n.dataset.reading;
    const open = state.decks.find(d => String(d.id) === String(state.activeDeckId));
    if (open) renderCoverageNote(open); else n.style.display = 'none';
  };
  if (cov && cov.total) {
    // A partial read keeps the old version mark, so it is tried again next time.
    if (!cov.partial) deck.enrichVer = ENRICH_VER;
    if (!cov.partial || !deck.coverage || cov.resolved >= (deck.coverage.resolved || 0)) deck.coverage = cov;
    try { await saveState(); } catch (_) {}
  }
  done();
  const screen = document.getElementById('screen-review');
  if (state.activeDeckId !== deck.id || !screen || !screen.classList.contains('active')) return;
  const active = ['grade', 'odds', 'hand', 'drills', 'notes'].find(k => {
    const b = document.getElementById('rv-tab-' + k);
    return b && b.classList.contains('active');
  }) || 'cards';
  renderReview(deck);
  if (active !== 'cards') showReviewTab(active);
}


/* ============================================================
   DECK GRADER (ported from MetaForge v0.5)
   Coherence x Viability only. The matchup verdicts and win-rate
   simulation are deliberately NOT ported: they score against a
   researched snapshot of the metagame, and without a live
   tournament feed that number goes stale silently. Both halves
   below run entirely on the user's own 60 cards.
   ============================================================ */

const FMT = { threatHP:[280,340], ohkoTarget:320, fastSetup:2 };

const gClamp = (x,a,b) => Math.max(a, Math.min(b,x));
// Capitalise words, but keep the lower case "ex" the cards print ("Latias ex").
// v60: small words inside a card name stay lower case (Academy at Night, Path to the Peak).
const gCap   = s => String(s||'').replace(/(^|[\s\-(\/])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bEx\b/g, 'ex')
  .replace(/(?<=\S )(At|Of|The|To|And|In|On|For)(?= )/g, b => b.toLowerCase());
const gR1    = x => Math.round(x*10)/10;

function gHuman(req) {
  const m = { spread_counters:'spread damage', move_counters:'a way to move damage counters',
              energy_accel:'energy acceleration', search_pokemon:'a way to find Pokemon',
              hand_disruption:'hand disruption', damage_boost:'a damage booster',
              recovery:'a way to recycle resources', switch_own:'a way to switch out' };
  return m[req] || String(req).replace(/_/g,' ');
}
function gSynText(req,a,b) {
  if (req==='spread_counters') return `${gCap(a)} sprinkles damage across the board, then ${gCap(b)} slides those counters where they finish off the most Pokemon.`;
  if (req==='move_counters')   return `${gCap(a)} and ${gCap(b)} reposition damage together for precise knockouts.`;
  if (req==='evolution_access')return `${gCap(a)} skips the middle stage to get ${gCap(b)} into play fast.`;
  return `${gCap(a)} provides what ${gCap(b)} needs to work.`;
}

/**
 * Every type an Energy card can pay for. Basic and typed Energy give one type.
 * A few Special Energy give more: Team Rocket's Energy gives Psychic and
 * Darkness, and Luminous, Legacy, Prism and Neo Upper Energy give any type.
 */
function gEnergyTypes(c) {
  const n = normalizeCardName(c.name);
  if (/team rocket's energy/.test(n)) return ['psychic', 'darkness'];
  if (/^(luminous|legacy|prism|neo upper) energy\b/.test(n)) return ['any'];
  const t = gEnergyType(c);
  return t ? [t] : [];
}
/** Basic energy type, from API types or the card name. */
function gEnergyType(c) {
  if (c.types && c.types.length) return String(c.types[0]).toLowerCase();
  const m = normalizeCardName(c.name)
    .match(/\b(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon)\b/);
  return m ? m[1] : null;
}

/**
 * Adapt a PrizeTrainer deck into the entry shape the grader expects.
 * Cards with no supertype (never enriched, or API unreachable) come
 * through with card:null and are reported as unread rather than guessed at.
 */
/**
 * v59: what each Ability does, read from card text with the same parser Goldfish plays from
 * (gfAbilities). Returns { tags, say } per card: role tags the grade counts, and short
 * phrases the plan shows. Only what the text says is used; an Ability it cannot read is left out.
 */
/**
 * Muse s6 M2: a short phrase for an Ability gAbilRead cannot follow step by step (walls, boosts, rules
 * changes), so the How it plays Abilities list can still say what it does. Text only: these phrases go to
 * card.abx, never card.ab, so no grade reads them. null when the text is not one of these shapes.
 */
const G_ABFB_TY = 'grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless|fairy';
function gAbilFb(text) {
  const t = gfNorm(text).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  let m;
  if (/prevent all effects of your opponent's pokemon's attacks and abilities done to this pokemon/.test(t)) return "blocks the effects of your opponent's attacks and Abilities on it";
  if (/prevent all effects of attacks used by your opponent's pokemon done to your basic team rocket's pokemon/.test(t)) return "blocks the effects of your opponent's attacks on your Basic Team Rocket's Pokemon";
  if (/prevent all effects of attacks used by your opponent's pokemon done to this pokemon/.test(t)) return "blocks the effects of your opponent's attacks on it";
  if (/prevent all damage done to this pokemon by attacks from your opponent's pokemon ex/.test(t)) return "takes no damage from attacks by your opponent's Pokemon ex";
  if (/prevent all damage done to your benched pokemon that don't have a rule box by attacks/.test(t)) return 'keeps your Benched Pokemon without a Rule Box from taking damage from attacks';
  if (/prevent all damage from and effects of attacks from your opponent's pokemon done to your benched pokemon/.test(t)) return "keeps your Benched Pokemon safe from your opponent's attacks";
  if ((m = t.match(/^this pokemon takes (\d+) less damage from attacks/))) return `takes ${m[1]} less damage from attacks`;
  if ((m = t.match(new RegExp('^if this pokemon has any (' + G_ABFB_TY + ') energy attached, it gets \\+(\\d+) hp, and the attacks it uses do (\\d+) more damage')))) return `gets ${m[2]} more HP and does ${m[3]} more damage while it has ${gCap(m[1])} Energy attached`;
  if ((m = t.match(/^if this pokemon has (\d+) or more damage counters on it, attacks used by this pokemon do (\d+) more damage/))) return `does ${m[2]} more damage once it has ${m[1]} or more damage counters on it`;
  if (/^if this pokemon has no energy attached, it has no retreat cost/.test(t)) return 'has no Retreat Cost while it has no Energy attached';
  if (/^your opponent's active pokemon's retreat cost is colorless more/.test(t)) return "makes your opponent's Active Pokemon's Retreat Cost 1 more";
  if (/if this pokemon is in the active spot, you may shuffle it and all attached cards into your deck/.test(t)) return 'shuffles itself and its attached cards into your deck once a turn while it is Active';
  if (/^once during your turn, you may have each player draw a card/.test(t)) return 'has each player draw a card once a turn';
  if ((m = t.match(new RegExp('as often as you like during your turn, you may use this ability\\. move a basic (' + G_ABFB_TY + ') energy from 1 of your pokemon to another of your pokemon')))) return `moves Basic ${gCap(m[1])} Energy between your Pokemon as often as you like`;
  if ((m = t.match(new RegExp('^once during your turn, if this pokemon is in your hand, and if you have any (' + G_ABFB_TY + ') mega evolution pokemon ex in play, you may use this ability\\. put this pokemon onto your bench')))) return `puts itself onto your Bench from your hand while you have a ${gCap(m[1])} Mega Evolution Pokemon ex in play`;
  if (/^this pokemon can use the attacks of any of your benched pokemon/.test(t)) return 'can use the attacks of your Benched Pokemon';
  if (/^each of your evolved pokemon can use any attack from its previous evolutions/.test(t)) return 'lets your evolved Pokemon use the attacks of their earlier stages';
  if ((m = t.match(/^this pokemon can evolve into any pokemon ex that evolves from ([a-z' -]+?) if you play it/))) return `can evolve into any Pokemon ex that evolves from ${gCap(m[1])}`;
  if ((m = t.match(new RegExp('^each basic (' + G_ABFB_TY + ') energy attached to all of your pokemon provides (?:' + G_ABFB_TY + '){2} energy')))) return `makes each Basic ${gCap(m[1])} Energy on your Pokemon count as 2`;
  if ((m = t.match(/^if ([a-z' -]+?) is in play, this pokemon may use an attack it has twice/))) return `can attack twice in a turn while ${gCap(m[1])} is in play`;
  if ((m = t.match(/^([a-z' -]+?) used by this pokemon costs colorless less for each prize card your opponent has taken/))) return `makes its ${gCap(m[1])} cost 1 Colorless less for each Prize card your opponent has taken`;
  if ((m = t.match(/^this pokemon can't use attacks unless you have (\d+) or more cards in your hand/))) return `cannot attack unless you have ${m[1]} or more cards in your hand`;
  if (/^if this pokemon would be knocked out by damage from an attack, flip a coin\. if heads, this pokemon is not knocked out, and its remaining hp becomes 10/.test(t)) return 'survives a knockout from an attack with 10 HP left if you flip heads';
  if ((m = t.match(/^if this pokemon is in the active spot and is knocked out by damage from an attack from your opponent's pokemon, put (\d+) damage counters on the attacking pokemon/))) return `puts ${m[1]} damage counters on the attacker when it is Knocked Out in the Active Spot`;
  if ((m = t.match(/^as long as this pokemon is in the active spot, put (\d+) more damage counters on your opponent's poisoned pokemon during pokemon checkup/))) return `puts ${m[1]} more damage counters on your opponent's Poisoned Pokemon between turns while it is Active`;
  if ((m = t.match(new RegExp("^(" + G_ABFB_TY + ") pokemon in play (?:both yours and your opponent's )?have no weakness")))) return `takes away the Weakness of every ${gCap(m[1])} Pokemon in play`;
  if (/^pokemon in play .*lose any ability that requires the pokemon using it to knock out itself/.test(t)) return 'stops every Ability that Knocks Out the Pokemon using it';
  if (/^damage counters on each pokemon .*can't be moved to other pokemon/.test(t)) return 'stops damage counters from being moved';
  if ((m = t.match(/^this pokemon can't be (asleep|confused|paralyzed|poisoned|burned)\.?$/))) return `cannot be ${gCap(m[1])}`;
  return null;
}
function gAbilRead(c) {
  let list = [];
  try { list = gfAbilities({ card: c }); } catch (_) { return { tags: [], say: [] }; }
  const tags = new Set(), say = [];
  const cnt = (n, one, many) => n === 1 ? (/^[AEIOU]/i.test(one) ? 'an ' : 'a ') + one : (n >= 99 ? 'any number of ' : n + ' ') + many;
  const pl = w => /(?:Pokemon|Energy)$/.test(w) ? w : w + 's';
  const what = F => !F ? 'a card' : F.any ? 'card' : F.cat === 'trainer' ? (F.tk ? (F.tk === 'tool' ? 'Pokemon Tool' : gCap(F.tk)) : 'Trainer')
    : F.cat === 'energy' ? (F.basic ? 'Basic ' : '') + (F.type ? gCap(F.type) + ' ' : '') + 'Energy'
    : F.cat === 'pokemon' ? [F.stage === 'evolution' ? 'Evolution' : F.stage ? gCap(F.stage) : '', F.owner ? gCap(F.owner) : '', F.type ? gCap(F.type) : ''].filter(Boolean).concat('Pokemon').join(' ') : 'card';
  list.forEach(A => {
    const t = gfNorm(A.text || '').toLowerCase().replace(/\([^)]*\)/g, ' ');
    const bits = [];
    if (A.when === 'passive') {
      let m;
      if (/your basic pokemon in play have no retreat cost/.test(t)) { tags.add('switch_own'); bits.push('your Basic Pokemon have no Retreat Cost, so you can switch attackers for free'); }
      else if ((m = t.match(new RegExp("weakness of each of your opponent's (" + GF_TY + ") pokemon in play is now (" + GF_TY + ")")))) {
        tags.add('weak_' + m[2]); bits.push(`your opponent's ${gCap(m[1])} Pokemon become weak to ${gCap(m[2])}, so your ${gCap(m[2])} attackers do double damage to them`); }
      // v60: other always-on Abilities read sentence by sentence (Cynthia's Roserade's boost, Flutter Mane's lock).
      if (!bits.length) { const ge = geEffects(A.text); ge.tags.forEach(x => tags.add(x)); if (ge.say.length) bits.push(ge.say.join(', and ') + (ge.need === 'only while it is Active' ? ' while it is Active' : ge.need === 'only when it is Knocked Out' ? ' when it is Knocked Out' : ge.need ? ` (${ge.need})` : '')); }
      else if (/active spot/.test(t) && !/while it is Active/.test(bits[0])) bits[0] += ' while it is Active';
      if (bits.length) say.push({ abil: A.name, p: bits.join(', and '), passive: true, x: m && m[1] ? { vs: m[1], ty: m[2] } : null });
      return;
    }
    (A.steps || []).forEach(st => {
      const F = st.spec && st.spec.alts && st.spec.alts[0] && st.spec.alts[0][0];
      if (st.t === 'draw' && !st.ifAttached) bits.push(`draws ${cnt(st.n, 'card', 'cards')}`);
      else if (st.t === 'draw' && st.ifAttached) bits.push(`then draws ${cnt(st.n, 'card', 'cards')}`);
      else if (st.t === 'drawTo') bits.push(`draws until you have ${st.n} cards in hand`);
      else if (st.t === 'search' && F) { bits.push(`searches your deck for ${cnt(F.n, what(F.F), pl(what(F.F)))}`);
        tags.add(F.F && F.F.cat === 'pokemon' ? 'search_pokemon' : F.F && F.F.cat === 'trainer' ? (F.F.tk === 'supporter' ? 'search_supporter' : F.F.tk === 'item' ? 'search_item' : 'search_trainer') : 'search_card'); }
      else if (st.t === 'look' && F && st.dest === 'hand') { bits.push(F.F && F.F.any ? `looks at the top ${st.n} cards and puts ${F.n} into your hand` : `looks at the top ${st.n} cards for ${cnt(F.n, what(F.F), pl(what(F.F)))}`);
        if (F.F && F.F.cat === 'trainer' && F.F.tk === 'supporter') tags.add('search_supporter'); }
      else if (st.t === 'look' && F && st.dest === 'self') { bits.push(`attaches ${cnt(F.n, what(F.F), what(F.F))} from the top ${st.n} cards of your deck to itself`); tags.add('energy_accel'); }
      else if (st.t === 'attach') { const bE = /\bbasic (?:[a-z]+ )?energy/.test(t); bits.push(`attaches ${st.n === 1 ? (st.etype || bE ? 'a' : 'an') : st.n} ${st.etype ? 'Basic ' + gCap(st.etype) + ' ' : bE ? 'Basic ' : ''}Energy from your ${st.from === 'discard' ? 'discard pile' : 'hand'}${st.to === 'self' ? ' to itself' : ''}`); tags.add('energy_accel'); }
      else if (st.t === 'switchSelf') { bits.push('switches itself into the Active Spot'); tags.add('switch_own'); }
      else if (st.t === 'moveToSelf') bits.push('moves any amount of Energy from your other Pokemon onto it');
      else if (st.t === 'discardStadium') bits.push('discards a Stadium in play');
    });
    // v60: what the Goldfish steps cannot follow is read sentence by sentence (Munkidori, Iono's Bellibolt ex, Lunatone).
    let pre = '', post = '';
    // 3.2.8: an Ability that puts the Pokemon itself onto your Bench from your discard pile (Empoleon's
    // Emergency Surfacing, Gengar's Netherworld Gate) says so first, before what it does after.
    const selfRev = /if this pokemon is in your discard pile[^.]*?,? you may put (?:it|this pokemon) onto your bench/.test(t.replace(/pok[e\u00e9]mon/g, 'pokemon'));
    if (!bits.length) { const ge = geEffects(A.text); ge.tags.forEach(x => tags.add(x)); if (!ge.say.length && !selfRev) return;
      const base = v => v.replace(/^(\w+?)(?:(ch|sh|x)es|s)\b/, (q, w, e) => w + (e || ''));
      bits.push(...ge.say);
      if (ge.cost) { pre = ge.cost + ' to '; bits[0] = /^your /.test(bits[0]) ? 'make ' + bits[0] : base(bits[0]); }
      if (ge.need && ge.need !== 'only while it is Active') post = ` (${ge.need})`; }
    // v62: a condition printed at the start of the Ability (Thwackey's Boom Boom Groove needs Festival Lead in the Active Spot).
    if (!post) { const cm = gfNorm(A.text).match(/^once during your turn, if ([^,]+), you may/i);
      // 3.2.8: being in your discard pile is said by "from your discard pile" already.
      if (cm && selfRev) cm[1] = cm[1].replace(/^this pok[e\u00e9]mon is in your discard pile(?: and )?/i, '');
      if (cm && cm[1] && !/^this pokemon is in the active spot$/i.test(cm[1].replace(/\u00e9/g, 'e')))
        post = ` (only if ${cm[1].replace(/\bthis Pok[e\u00e9]mon('s)?/gi, (q, x) => x ? 'its' : 'it').replace(/Pok\u00e9mon/g, 'Pokemon')})`; }
    if (selfRev) { if (bits.length && /^draws /.test(bits[0])) bits[0] = 'then ' + bits[0];
      bits.unshift('puts itself onto your Bench from your discard pile'); }
    const when = A.when === 'bench' ? 'when you play it onto your Bench' : A.when === 'evolve' ? 'when you evolve into it from your hand'
      : A.first ? 'on your first turn' : A.many || / as often as you like$/.test(bits[bits.length - 1]) ? (bits[bits.length - 1] = bits[bits.length - 1].replace(/, as often as you like$/, ''), 'as often as you like') : A.active ? 'once a turn while it is Active' : 'once a turn';
    // Decidueye ex's Total Freedom switches it in from the Bench or out from the Active Spot, not only in.
    if (bits.length === 1 && bits[0] === 'switches itself into the Active Spot' && /switch it with 1 of your benched pokemon/.test(t) && /switch it with your active pokemon/.test(t)) {
      say.push({ abil: A.name, p: 'switches itself into or out of the Active Spot once a turn' }); return; }
    say.push({ abil: A.name, p: `${pre}${bits.join(' and ').replace(/ and then /, ', then ')} ${when}${post}` });
  });
  // Muse s6 M2: an Ability the steps above cannot follow still gets a phrase, for the plan text only.
  list.forEach(A => { if (say.some(x => x.abil === A.name)) return; const p = gAbilFb(A.text); if (p) say.push({ abil: A.name, p, fb: true }); });
  return { tags: [...tags], say };
}

/** 2.6.1: the name of the meta deck these cards match, for picking the main attacker. Never the player's own name. */
function gArchName(deck, ctx) {
  try {
    if (!deck || deck.format === 'expanded' || deck.format === 'prerelease') return '';
    if (typeof mu60Data === 'undefined' || !mu60Data || typeof g68Arch !== 'function') return '';
    if (!(deck.cards || []).some(c => c.supertype)) return '';
    // 3.2.8: a list built around another Pokemon than the archetype's (g68Own) picks its main card from the list.
    const m = g68Arch(deck, mu60Data, ctx);
    return m && m.deck && m.deck.name && !m.own ? m.deck.name : '';
  } catch (_) { return ''; }
}
function toGradeDeck(deck) {
  return gMergeRows(toGradeRows(deck));
}
// 2.6.1: the same card on two lines (2 Iono PAL 185 and 2 Iono PAL 269, as TCG Live exports split
// printings) is one card to the grade, so its copies add up. Rows merge only when everything the
// grade reads is the same for a Pokemon; two different Pokemon with one name stay apart.
function gMergeRows(rows) {
  const out = [], at = new Map();
  rows.forEach(e => {
    // A Trainer or Energy is one card by its name alone (the four-copy rule counts them that way, and a
    // reprint may word its text a little differently); a Pokemon only when everything the grade reads matches.
    const k = String(e.name || '').toLowerCase() + '\u0000' + (!e.card ? '' : e.card.t === 'pkmn' ? JSON.stringify(e.card) : e.card.t);
    const i = at.get(k);
    if (i == null) { at.set(k, out.length); out.push(Object.assign({}, e)); }
    else out[i].qty = (out[i].qty || 0) + (e.qty || 0);
  });
  return out;
}
function toGradeRows(deck) {
  return (deck.cards||[]).map(c => {
    const sup = String(c.supertype||'').toLowerCase();
    const t = sup.startsWith('pok') ? 'pkmn'
            : sup === 'trainer'     ? 'trainer'
            : sup === 'energy'      ? 'energy' : null;
    if (!t) return { qty:c.count, name:c.name, card:null };
    // Note: attacks must be null (not []) when absent. The engine tests
    // truthiness of .attacks to decide whether a deck has an attacker,
    // and an empty array is truthy.
    const atks = (c.attacks && c.attacks.length)
      ? c.attacks.map(a => ({ name:a.name||'', cost:a.cost||[], dmg:a.dmg||0,
          early: a.early != null ? a.early : (a.dmg||0), max: a.dmgMax || a.dmg || 0, cond: a.cond || null,
          conf: a.conf || 'high', flip: a.flip || null, copy: a.copy || null, escale: a.escale || null, lock: a.lock || null, edisc: a.edisc || null, pile: a.pile || null, group: a.group || null, mill: a.mill || null, fx: a.fx || null, kox: a.kox || null, hand: a.hand || null, need: a.need || null, ctl: a.ctl || null, rev: a.rev || null, disc: a.disc || null }))
      : null;
    const ar = t==='pkmn' ? gAbilRead(c) : { tags: [], say: [] };
    return { qty:c.count, name:c.name, card:{
      key: String(c.name||'').toLowerCase(), ab: ar.say.filter(x => !x.fb), abx: ar.say,
      t, stage: c.stage||null,
      // 3.2.8 (Muse H3): a printing whose record leaves out what it evolves from (TCGdex's 30th Classic
      // Collection Gengar) takes it from the saved list of Standard cards, read by name.
      from: c.evolvesFrom ? String(c.evolvesFrom).toLowerCase()
        : (c.stage === 'stage1' || c.stage === 'stage2') && typeof r273From === 'function' ? (String(r273From(c.name) || '').toLowerCase() || null) : null,
      base: c.base ? String(c.base).toLowerCase() : null,
      p: c.prizeValue||1, hp: c.hp||0,
      etype: t==='energy' ? gEnergyType(c) : null, etypes: t==='energy' ? gEnergyTypes(c) : [],
      attacks: atks, provides: [...new Set((c.provides||[]).concat(ar.tags))], requires: c.requires||[],
      // v62: what a fixed damage bonus can lean on: Stadiums, and Abilities that switch, retreat for free or leave the Active Spot.
      // v62: an Ability that lets it attack twice a turn while a Stadium is in play (Dipplin's Festival Lead with Festival Grounds).
      atk2: (x => x ? { abil: x[0], stadium: ((String(x[1]).match(/if ([a-z0-9' \u00e9-]+?) is in play/i) || [])[1] || null) } : null)((c.atext||[]).find(x => /may use an attack it has twice/i.test(String(x[1]||'')))),
      sub: c.sub || [], swab: (c.atext||[]).some(x => /switch (?:it|this pok[e\u00e9]mon|your active pok[e\u00e9]mon) with|no retreat cost|shuffle this pok[e\u00e9]mon and all attached cards into your deck/i.test(String(x[1]||''))),
      abil: (c.abilities||[]).map(x => x.name), protect: (c.abilities||[]).some(x => x.protect),
      pk: (c.abilities||[]).filter(x => x.protect).map(x => x.pkind || null), types: c.types || [],
      selfBench: (c.abilities||[]).some(x => x.bench),
      // 3.2.8: an Ability that lets it start the game face down in the Active Spot (Cinderace's Explosiveness).
      setupPut: ((c.atext||[]).find(x => /in your hand when you are setting up to play, you may put it face down/i.test(String(x[1]||''))) || [])[0] || null,
      bmega: ((c.abilities||[]).find(x => x.bench && x.bmega) || {}).bmega || null,
      bmAbil: ((c.abilities||[]).find(x => x.bench && x.bmega) || {}).name || null,
      edbl: (c.abilities||[]).filter(x => x.edouble).map(x => ({ type: x.edouble, abil: x.name })),
      abDmg: (c.abilities||[]).filter(x => x.cdmg).map(x => Object.assign({ abil: x.name }, x.cdmg)),
      // v60: an Ability that lets it use the attacks of your Benched Pokemon (Mew ex's Memory Helix).
      bcopy: ((c.atext||[]).find(x => /can use the attacks of (?:any of )?your benched pok/i.test(String(x[1]||''))) || [])[0] || null,
      pex: (c.abilities||[]).filter(x => x.pex).map(x => x.name),
      aneed: (c.abilities||[]).filter(x => x.aneed).map(x => ({ abil: x.name, type: x.aneed })),
      ahas: (c.abilities||[]).filter(x => x.ahas).map(x => ({ abil: x.name, type: x.ahas })),
      // 3.2.8: an Ability that searches for Evolution Pokemon of one type (Genesect ex's Metallic Signal).
      evoSeek: (x => x ? { abil: x[0], type: ((String(x[1]||'').match(/search your deck for (?:up to \d+ |an? )?evolution (grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless) pok/i) || [])[1] || '').toLowerCase() } : null)(
        (c.atext||[]).find(x => /search your deck for (?:up to \d+ |an? )?evolution (?:[a-z]+ )?pok[e\u00e9]mon/i.test(String(x[1]||'')))),
      abBoost: (c.abilities||[]).filter(x => x.boost).map(x => Object.assign({ abil: x.name }, x.boost)),
      sboost: (x => x ? Object.assign({ abil: x.name }, x.sboost) : null)((c.abilities||[]).find(x => x.sboost)),
      gate: ((c.abilities||[]).filter(x => x.gate).map(x => Object.assign({ abil: x.name }, x.gate)))[0] || null,
      // v65: an Ability like Eevee ex's Rainbow DNA lets it stand in for the Basic that a Pokemon ex evolves from.
      standIn: (((c.atext||[]).map(x => String(x[1]||'')).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
        .match(/can evolve into any pokemon ex that evolves from ([a-z0-9' ]+?)(?= if|[.,]|$)/)) || [])[1] || null,
      byName: !!c.byName, tt: c.ttype || null, isEx: /\bex$/i.test(String(c.name||'').trim()),
      // v63: lock, mill, wall and other control pieces from its Abilities or Trainer rules (ctl63).
      ctl: [].concat(...(c.atext||[]).map(x => TCGEnrich.ctl63(x[1]).map(p => Object.assign(p, { src:'ability', via:x[0] }))),
        t==='trainer' ? TCGEnrich.ctl63(c.rtext).map(p => Object.assign(p, { src:c.ttype||'item', via:null })) : []),
      ace: !!c.ace,
      // v65: printed text the Trainer check reads (Trainer rules, Special Energy text).
      rt: t==='trainer' ? (c.rtext || '') : '', et: t==='energy' ? (c.etext || '') : '',
      atx: (c.atext||[]).map(x => String(x[1]||'')).join(' '),
      // 3.2.5: what it can put onto your Bench straight from your discard pile (Kingdra ex's King's Order).
      rev: g115Rev(c, t)
    }};
  });
}

/**
 * 3.2.5: the ways a card puts Pokemon from your discard pile straight onto your Bench, from its
 * attack, Ability or Trainer text (TCGEnrich.revive115). A Pokemon one of them can bring back
 * reaches the board without evolving, so the list need not run its Basic or Stage 1.
 */
function g115Rev(c, t) {
  if (typeof TCGEnrich === 'undefined' || typeof TCGEnrich.revive115 !== 'function' || !c) return null;
  const out = [];
  if (t === 'pkmn') {
    (c.attacks || []).forEach(a => { const r = a.rev || TCGEnrich.revive115(a.text); if (r) out.push(Object.assign({}, r, { via: a.name || '', src: 'attack', cost: a.cost || [] })); });
    (c.atext || []).forEach(x => { const r = TCGEnrich.revive115(x[1]); if (r) out.push(Object.assign({}, r, { via: x[0] || '', src: 'ability' })); });
  } else if (t === 'trainer') { const r = TCGEnrich.revive115(c.rtext); if (r) out.push(Object.assign(r, { via: '', src: 'trainer' })); }
  return out.length ? out : null;
}
/** 3.2.5: does this way back fit the Pokemon (its type, stage, HP, name and what it leaves out)? */
function g115Fits(r, c, name) {
  if (r.self) return false;
  const k = String(name || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if ((r.not || []).some(x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === k)) return false;
  if (r.name) return r.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === k;
  // 3.2.7: older wordings, for Expanded: a kind (Pokemon-GX, Rapid Strike, Baby), "that doesn't have a Rule Box",
  // "that evolves from Unidentified Fossil", "(excluding Baby Pokemon)", and a choice of kinds ("a Baby Pokemon or a Basic Pokemon").
  const sub = (c.sub || []).map(x => String(x).toLowerCase());
  if ((r.notKind || []).some(x => sub.includes(x))) return false;
  if (r.noRule && (c.p > 1 || c.isEx || sub.some(x => G115_RULE.has(x)))) return false;
  if (r.from && c.from !== r.from) return false;
  if (r.hp && !(c.hp && c.hp <= r.hp)) return false;
  const one = a => {
    if (a.type && !(c.types || []).map(x => String(x).toLowerCase()).includes(a.type)) return false;
    if (a.stage && (a.stage === 'evolution' ? !['stage1', 'stage2'].includes(c.stage) : c.stage !== a.stage)) return false;
    if (a.kind && !sub.includes(a.kind)) return false;
    return true;
  };
  return r.alts ? r.alts.some(one) : one(r);
}
const G115_RULE = new Set(['ex', 'gx', 'v', 'vmax', 'vstar', 'v-union', 'mega', 'break', 'legend', 'prism star', 'radiant', 'tag team', 'lv.x', 'level-up']);
/** 3.2.5: the card in the list that can put this Pokemon onto your Bench from your discard pile, and how. */
function g115Reviver(deck, e, energyTypes) {
  const c = e.card;
  if (!c || c.t !== 'pkmn') return null;
  // 3.2.7: one that puts itself onto your Bench from your discard pile (Gengar's Netherworld Gate).
  const own = (c.rev || []).find(r => r.self);
  if (own) return { e, r: own, self: true };
  for (const x of deck) {
    const xc = x.card;
    if (!xc || xc === c || !xc.rev) continue;
    // 3.2.7: and only one that can reach the board itself (a Stage 2 with no way to evolve brings nothing back).
    if (!g115Can(deck, x)) continue;
    // An attack counts only when the list's Energy can pay for it.
    const r = xc.rev.find(r => g115Fits(r, c, e.name) && (r.src !== 'attack' || (r.cost || []).every(t => t === 'colorless' || energyTypes[t] || energyTypes.any)));
    if (r) return { e: x, r };
  }
  return null;
}
/** 3.3.2 (Muse 3.3.1 retest): an Ability in the list that puts this Pokemon back from your discard pile
 *  (Gengar's own Netherworld Gate, or another Pokemon's Ability that fits it). Attacks and Trainers are left out:
 *  the Trainer side has its own recovery count. Returns the Ability and its Pokemon, or null. */
function g332Back(deck, e) {
  const c = e && e.card;
  if (!c || c.t !== 'pkmn') return null;
  const own = (c.rev || []).find(r => r.self && r.src === 'ability');
  if (own) return { abil: own.via || '', by: e.name, self: true };
  for (const x of deck || []) {
    const xc = x.card;
    if (!xc || xc === c || xc.t !== 'pkmn' || !xc.rev) continue;
    const r = xc.rev.find(r => r.src === 'ability' && g115Fits(r, c, e.name));
    if (r && g115Can(deck, x)) return { abil: r.via || '', by: x.name, self: false };
  }
  return null;
}
/** 3.3.3 (Muse 3.3.2 retest, Mason's Nov 17 call that revival credit follows the odds): how often a single
 *  copy that an Ability puts back from your discard pile (Gengar's Netherworld Gate) gets its second life.
 *  It has to reach play first (or your discard pile, by the revival line's own odds), it must not be in your
 *  prizes (about 1 game in 10 for one copy), and a reviver that is another Pokemon has to be found too.
 *  Power counts that share of a second copy. Returns { p, abil, by, self } or null. */
function g333BackOdds(deck, e, energyTypes) {
  const b = g332Back(deck, e);
  if (!b) return null;
  const c = e.card, qty = deck.reduce((a, y) => a + (y.card && y.card.key === c.key ? y.qty : 0), 0);
  if (qty !== 1) return null;
  const pBoard = g115See(g115Reach(deck, c, qty));
  let pDisc = 0;
  try { pDisc = g115Odds(deck, { self: true, e, r: { via: b.abil } }, e, g115Outlets(deck, energyTypes || {})).p; } catch (_) {}
  let p = (1 - (1 - pBoard) * (1 - pDisc)) * (1 - 6 / 60);
  if (!b.self) { const x = deck.find(y => y.card && y.name === b.by); p *= x ? g115See(g115Reach(deck, x.card, x.qty)) : 0; }
  return Object.assign({ p: Math.max(0, Math.min(1, p)) }, b);
}
/** 3.2.8: the Basic a Stage 2 starts from: read with the card, else from its Stage 1 in the list,
 *  else from the saved list of Standard cards. Rare Candy needs it in play. */
function g116Base(deck, c) {
  if (!c || c.stage !== 'stage2' || !c.from) return null;
  if (c.base) return c.base;
  const nk = s => normalizeCardName(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mid = (deck || []).find(y => y.card && nk(y.name) === nk(c.from));
  if (mid && mid.card.from) return mid.card.from;
  try { if (typeof r273From === 'function') { const b = r273From(c.from); if (b) return String(b).toLowerCase(); } } catch (_) {}
  return null;
}
/** 3.2.7: can this card reach the board in this list? Trainers and Basics can; an evolution needs its line
 *  (Rare Candy may skip the Stage 1), an Ability that benches it, or a way back from the discard pile of its own. */
function g115Can(deck, x) {
  const c = x.card;
  if (!c || c.t !== 'pkmn' || c.stage === 'basic' || !c.from || c.selfBench || c.byName) return true;
  if ((c.rev || []).some(r => r.self) || c.setupPut) return true;
  const nk = s => normalizeCardName(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const has = n => deck.some(y => y.card && nk(y.name) === nk(n));
  if (has(c.from)) { const mid = deck.find(y => y.card && nk(y.name) === nk(c.from));
    return c.stage !== 'stage2' || !mid || !mid.card.from || has(mid.card.from) || !!(mid.card.rev || []).some(r => r.self) || mid.card.selfBench; }
  if (c.isEx && deck.some(y => y.card && y.card.standIn && nk(y.card.standIn) === nk(c.from))) return true;
  const candy = deck.some(y => y.card && (y.card.provides || []).includes('evolution_access'));
  const base = g116Base(deck, c);
  return c.stage === 'stage2' && candy && !!base && has(base);
}
/** 3.2.8: a Pokemon that can only start the game face down in the Active Spot (Cinderace's Explosiveness)
 *  reaches the board when a copy is in the opening 7 cards. It earns credit by those odds, like a revived
 *  line (4 copies, about 40% of games, earn about two thirds). Set G_SETUP_FULL to give it full credit. */
const G_SETUP_FULL = false;
function gSetupOdds(qty) {
  const p = g115See(qty, 7);
  return { p, cr: G_SETUP_FULL ? 1 : Math.min(1, p / 0.6) };
}
// 3.2.7: how many cards you have seen by the time the line has to come together (your opening 7,
// a few draws for turn, and what your Supporters and Abilities draw on the way).
const G115_SEEN = 18;
/** 3.2.7: the chance of seeing at least one of k cards among the first n of a 60 card deck. */
function g115See(k, n) {
  k = Math.min(60, Math.max(0, k)); n = n || G115_SEEN;
  if (k <= 0) return 0;
  let p = 1; for (let i = 0; i < n; i++) p *= Math.max(0, 60 - k - i) / (60 - i);
  return 1 - p;
}
/** 3.2.7: copies of a card plus the cards that can fetch it from your deck. */
function g115Reach(deck, card, qty) {
  const q = (f) => deck.reduce((a, y) => a + (y.card && y.card !== card && f(y.card) ? y.qty : 0), 0);
  const has = (c, p) => (c.provides || []).includes(p);
  let k = qty;
  // A card that finds only Basics (Nest Ball) tags search_pokemon too, so it counts for Basics alone.
  if (card.t === 'pkmn') k += q(c => has(c, 'search_card') || (has(c, 'search_basic') ? card.stage === 'basic' : has(c, 'search_pokemon')));
  else if (card.t === 'trainer') k += q(c => has(c, 'search_card') || (card.tt === 'supporter' ? has(c, 'search_supporter') : has(c, 'search_item') || has(c, 'search_trainer')));
  return k;
}
/**
 * 3.2.7: the chance a revival line comes together in time: the card that brings the Pokemon back
 * (with its own line if it evolves), and the Pokemon already in your discard pile, put there by a card
 * that picks it from your deck (Brilliant Blender) or by drawing it and an outlet that discards it.
 */
function g115Odds(deck, v, e, outs) {
  const qtyOf = n => deck.reduce((a, y) => a + (y.card && normalizeCardName(y.name || '') === normalizeCardName(n || '') ? y.qty : 0), 0);
  const findE = n => deck.find(y => y.card && normalizeCardName(y.name || '') === normalizeCardName(n || ''));
  let pRev = 1;
  if (!v.self) {
    const rc = v.e.card;
    pRev = g115See(g115Reach(deck, rc, qtyOf(v.e.name)));
    if (rc.t === 'pkmn' && rc.stage !== 'basic' && rc.from && !rc.selfBench) {
      const mid = findE(rc.from), base = rc.stage === 'stage2' ? (mid && mid.card.from ? findE(mid.card.from) : g116Base(deck, rc) ? findE(g116Base(deck, rc)) : null) : mid;
      if (base) pRev *= g115See(g115Reach(deck, base.card, qtyOf(base.name)));
      if (rc.stage === 'stage2') {
        const candy = deck.reduce((a, y) => a + (y.card && (y.card.provides || []).includes('evolution_access') ? y.qty : 0), 0);
        pRev *= g115See((mid ? g115Reach(deck, mid.card, qtyOf(mid.name)) : 0) + candy);
      }
    }
  }
  const reachAll = list => list.reduce((a, o) => a + g115Reach(deck, o.card, o.qty), 0);
  const pDeck = g115See(reachAll(outs.filter(o => o.okind === 'deck')));
  const pHand = g115See(reachAll(outs.filter(o => o.okind === 'hand')));
  const pMill = g115See(reachAll(outs.filter(o => o.okind === 'mill')));
  const cp = v.self ? e.qty : qtyOf(e.name);
  const pSee = g115See(g115Reach(deck, e.card, cp));
  // Milling picks no card: it lands only when a copy is among the few cards it turns over.
  const pHit = g115See(cp, 6);
  const p = pRev * (pDeck + (1 - pDeck) * (1 - (1 - pHand * pSee) * (1 - pMill * pHit)));
  // 3.2.8: the credit follows the odds all the way up: a line that comes together about 1 game in 3
  // earns about a third, and one that nearly always does earns nearly all of it.
  return { p, cr: Math.max(0, Math.min(1, p)) };
}
/** 3.2.5: cards that put Pokemon into your discard pile: a cost of discarding from your hand
 *  (Ultra Ball), discarding your hand, or discarding from your deck (Brilliant Blender). */
function g115Outlets(deck, energyTypes) {
  const read = t => typeof TCGEnrich !== 'undefined' && typeof TCGEnrich.outlet115 === 'function' ? TCGEnrich.outlet115(t) : null;
  const out = [];
  deck.forEach(e => { const c = e.card; if (!c || (c.t !== 'trainer' && c.t !== 'pkmn')) return;
    let k = read(c.t === 'trainer' ? c.rt : c.atx || '');
    // 3.2.7: an attack that discards from your hand or deck counts too, when the list can pay for it and play the Pokemon.
    if (!k && c.t === 'pkmn' && energyTypes && g115Can(deck, e)) {
      const a = (c.attacks || []).find(a => a.disc && (a.cost || []).every(t => t === 'colorless' || energyTypes[t] || energyTypes.any));
      if (a) k = a.disc; }
    if (k) out.push(Object.assign({}, e, { okind: k })); });
  return out;
}

function gCoherence(deck) {
  const provided={}, energyTypes={}, present={};
  deck.forEach(e => { const c=e.card; if(!c) return;
    (c.provides||[]).forEach(p => provided[p]=(provided[p]||0)+e.qty);
    if (c.t==='energy') (c.etypes||(c.etype?[c.etype]:[])).forEach(ty => energyTypes[ty]=(energyTypes[ty]||0)+e.qty);
    present[c.key]=(present[c.key]||0)+e.qty; });
  const synergies=[], flaws=[], unmet=[]; let reqTotal=0, reqMet=0;
  // 3.2.5: Pokemon that reach the board from your discard pile (Kingdra ex's King's Order), by the card that brings them back.
  const rv115=new Map(), out115=g115Outlets(deck, energyTypes), revived=new Set();
  // 3.2.7: one that brings itself back is named by its Ability (Gengar's Netherworld Gate).
  const rvBy=v=>v.self ? { name:v.r.via||gCap(v.e.name), via:'' } : { name:gCap(v.e.name), via:v.r.via };
  const rvKeep=(v,e,o)=>{ if (!o || o.p>=RV_THIN) revived.add(e.card.key); const k=v.e.card.key+'\u0000'+v.r.via; if(!rv115.has(k)) rv115.set(k,{ by:v.e, r:v.r, self:!!v.self, to:[], p:1 }); const g=rv115.get(k); if(!g.to.includes(e.name)) g.to.push(e.name); if (o) g.p=Math.min(g.p,o.p); };
  // 3.2.8: the cards that put the Pokemon in your discard pile, the ones the list runs most of first.
  const rvOuts=()=>{ const m=new Map(); out115.forEach(x=>{ const k=gCap(x.name); m.set(k,(m.get(k)||0)+g115Reach(deck,x.card,x.qty)); });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,2); };
  // 3.2.8: how often the line comes together, said under full strength: "about 6 games in 10", "only about 1 game in 4".
  const rvOdds=p=>p>=0.9 ? '' : p>=0.45 ? `about ${Math.max(5,Math.min(9,Math.round(p*10)))} games in 10` : `only about 1 game in ${Math.max(2,Math.round(1/Math.max(p,0.01)))}`;
  const RV_THIN=0.3;
  const rvNone=(v,e)=>{ const b=rvBy(v); return {sev:'warn', who:e.card.key, rvn:{ by:b.name, via:b.via, to:e.name }, t:`Nothing puts ${gCap(e.name)} in your discard pile`,
    d:`${gCap(e.name)} can only reach the board when ${b.name} brings it back from your discard pile${b.via ? ` with ${b.via}` : ''}, but nothing in the list discards cards from your hand or deck, like Ultra Ball or Brilliant Blender.`}; };
  // 3.2.7: a line that rarely comes together in time (a 1-of reviver with little to fetch it) earns little credit.
  const rvThin=(v,e,o)=>{ const b=rvBy(v), n=Math.max(2, Math.round(1/Math.max(o.p,0.01))), outs=rvOuts();
    return {sev:'warn', who:e.card.key, t:`${gCap(e.name)} rarely reaches the board`,
    d:`${gCap(e.name)} can only reach the board when ${b.name} brings it back from your discard pile${b.via ? ` with ${b.via}` : ''}, and that comes together in only about 1 game in ${n}.` +
      (outs.length ? ` ${outs.join(' and ')} ${outs.length>1 ? 'are what put' : 'is what puts'} it in your discard pile.` : '')}; };
  // v54: an Ability that attaches Basic Energy of a type the list does not run does nothing.
  deck.forEach(e => { const c=e.card; if(!c) return;
    (c.aneed||[]).filter(x => !energyTypes[x.type]).forEach(x => { if (flaws.some(f=>f.who===c.key)) return;
      // v57: when its attacks cannot be paid either, the card does nothing at all, so say so.
      const payable = !(c.attacks||[]).length || (c.attacks||[]).some(a=>(a.cost||[]).every(t=>t==='colorless'||energyTypes[t]||energyTypes.any));
      flaws.push({sev:'warn', who:c.key, deadAb:x.abil, t: payable ? `${gCap(e.name)}'s ${x.abil} has nothing to attach` : `${gCap(e.name)} does nothing as built`,
        d:`${x.abil} attaches Basic ${gCap(x.type)} Energy from your hand, but the list runs no ${gCap(x.type)} Energy, so the Ability does nothing as built.` +
          (payable ? '' : ` Its attacks need ${gCap(x.type)} Energy too, so the ${e.qty} ${e.qty > 1 ? 'copies are dead cards' : 'copy is a dead card'}. Cut ${e.qty > 1 ? 'them' : 'it'} or add ${gCap(x.type)} Energy.`)}); }); });
  // 3.2.8: an Ability that only works with some Energy attached (Munkidori's Adrena-Brain) does nothing when the list runs none of it.
  const anyE = Object.keys(energyTypes).some(k => energyTypes[k]);
  deck.forEach(e => { const c=e.card; if(!c) return;
    (c.ahas||[]).filter(x => x.type === 'any' ? !anyE : !energyTypes[x.type] && !energyTypes.any).forEach(x => { if (flaws.some(f=>f.who===c.key)) return;
      const payable = !(c.attacks||[]).length || (c.attacks||[]).some(a=>(a.cost||[]).every(t=>t==='colorless'||energyTypes[t]||energyTypes.any)) && (anyE || (c.attacks||[]).some(a=>!(a.cost||[]).length));
      const ty = x.type === 'any' ? '' : gCap(x.type) + ' ';
      flaws.push({sev:'warn', who:c.key, deadAb:x.abil, t: payable ? `${gCap(e.name)}'s ${x.abil} never turns on` : `${gCap(e.name)} does nothing as built`,
        d:`${x.abil} only works while ${gCap(e.name)} has ${ty}Energy attached, but the list runs no ${ty}Energy, so the Ability does nothing as built.` +
          (payable ? '' : ` Its attacks cannot be paid either, so the ${e.qty} ${e.qty > 1 ? 'copies are dead cards' : 'copy is a dead card'}. Cut ${e.qty > 1 ? 'them' : 'it'} or add ${ty}Energy.`)}); }); });
  // 3.2.8: an Ability that searches for Evolution Pokemon finds nothing when the list runs none it can find.
  deck.forEach(e => { const c=e.card; if(!c||!c.evoSeek||flaws.some(f=>f.who===c.key)) return;
    const ty=c.evoSeek.type, hit=deck.some(x=>x.card&&x.card.t==='pkmn'&&x.card.stage&&x.card.stage!=='basic'&&(!ty||(x.card.types||[]).some(t=>String(t).toLowerCase()===ty)));
    if (!hit) flaws.push({sev:'warn', who:c.key, deadAb:c.evoSeek.abil, t:`${gCap(e.name)}'s ${c.evoSeek.abil} finds nothing`,
      d:`${c.evoSeek.abil} searches your deck for ${ty ? gCap(ty) + ' ' : ''}Evolution Pokemon, but the list runs none, so the Ability does nothing as built.`}); });
  // v55: an attacker that cannot attack until enough of a group is in play (Team Rocket's Mewtwo ex's Power Saver).
  deck.forEach(e => { const c=e.card; if(!c||!c.gate) return;
    const g=c.gate, n=deck.filter(x=>x.card&&x.card.t==='pkmn'&&x.card.key.startsWith(g.pre)).reduce((k,x)=>k+x.qty,0);
    if (n<g.n && !flaws.some(f=>f.who===c.key)) flaws.push({sev:'crit', who:c.key, t:`${gCap(e.name)} can never attack`,
      d:`Its ${g.abil} stops it attacking unless you have ${g.n} or more ${g.pre?gCap(g.pre).replace(/'S\b/g,"'s"):''}Pokemon in play, and the list runs only ${n}.`}); });
  deck.forEach(e => { const c=e.card; if(!c||!c.requires) return;
    c.requires.forEach(req => { reqTotal++; const m0=reqMet, f0=flaws.length;
      if (req.startsWith('energy:')) {
        const ty=req.split(':')[1];
        const payable=(c.attacks||[]).some(a=>(a.cost||[]).every(t=>t==='colorless'||energyTypes[t]||energyTypes.any));
        const cp = (energyTypes[ty] || energyTypes.any || payable) ? null : g37Copier(deck, c);
        if (energyTypes[ty] || energyTypes.any || payable) reqMet++;
        else if (cp) { reqMet++;
          const ca = cp.card.attacks.find(a => a.copy) || {}, via = ca.name || 'its attack';
          if (!synergies.some(s => s.who === c.key)) synergies.push({ link: gCap(cp.name) + ' > ' + gCap(e.name), who: c.key,
            p: ca.copy && ca.copy.mill
              ? `${gCap(cp.name)} can use ${gCap(e.name)}'s attacks with ${via} when it comes off the top of your deck, so ${gCap(e.name)} needs no ${gCap(ty)} Energy of its own.`
              : `${gCap(cp.name)} copies ${gCap(e.name)}'s attacks with ${via}, paying only its own cost, so ${gCap(e.name)} needs no ${gCap(ty)} Energy of its own.` }); }
        // v55: a Pokemon the list evolves (Dreepy into Drakloak) is there to evolve, not to attack.
        else if (deck.some(x => x.card && x.card.t==='pkmn' && x.card.from===c.key)) reqMet++;
        // 3.2.8: nor is an Ability that needs Energy the list does not run (Munkidori without Darkness).
        else if (c.abil && c.abil.length && !(c.aneed||[]).some(x => !energyTypes[x.type]) && !(c.ahas||[]).some(x => x.type === 'any' ? !Object.keys(energyTypes).some(k => energyTypes[k]) : !energyTypes[x.type] && !energyTypes.any)) { reqMet++;
          // 3.2.8: one line per card, naming each type its attack needs (Tatsugiri's Surf needs Fire and Water).
          const was = synergies.find(s=>s.who===c.key&&s.abx);
          if (was) { was.abx.push(gCap(ty)); was.p = `${gCap(e.name)} is here for its Ability, so its attack needing ${was.abx.join(' and ')} Energy does not matter.`; }
          else if (!flaws.some(f=>f.who===c.key)) synergies.push({link:gCap(e.name)+': '+c.abil.join(', '), abx:[gCap(ty)],
            p:`${gCap(e.name)} is here for its Ability, so its attack needing ${gCap(ty)} Energy does not matter.`, who:c.key}); }
        else if (c.byName) { reqMet++;
          flaws.push({sev:'warn', who:c.key, t:`Check ${gCap(e.name)}'s attack cost`,
            d:`The card data for ${gCap(e.name)} came from another printing, which needs ${gCap(ty)} Energy. If your printing costs something else, ignore this.`}); }
        else if (!flaws.some(f=>f.who===c.key)) flaws.push({sev:'crit', who:c.key, t:`${gCap(e.name)} has no ${gCap(ty)} Energy`,
          d:`Its attack needs ${gCap(ty)} Energy, but there is none in the deck. As built it cannot actually fire.`});
      } else if (req.startsWith('partner:')) {
        const who=req.split(':')[1];
        if (present[who]) { reqMet++; synergies.push({link:gCap(who)+' > '+gCap(e.name),
          p:gCap(who)+' is what turns '+gCap(e.name)+' on. Without it that engine does nothing.'}); }
        else flaws.push({sev:'warn', t:`${gCap(e.name)} needs ${gCap(who)} to work`,
          d:`${gCap(e.name)} only does its job when ${gCap(who)} is in play, and there is no ${gCap(who)} in the deck. The engine is half-built.`});
      } else if (req==='evolution_access') {
        // v66: Rare Candy skips the Stage 1, not the Basic, so with no Stage 1 in the list the Basic has to be.
        const bk=s=>normalizeCardName(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const pre=c.from&&present[c.from]>0;
        const cb=g116Base(deck,c), noBase=!pre&&cb&&!deck.some(x=>x.card&&bk(x.name)===bk(cb));
        const candy=provided['evolution_access']>0&&!noBase;
        const own=c.selfBench, copied=!own&&!candy&&!pre&&g37Copier(deck,c);
        const su=!own&&!candy&&!pre&&!copied&&c.setupPut;
        const rv=!own&&!candy&&!pre&&!copied&&!su&&g115Reviver(deck,e,energyTypes);
        if (su) { const o=gSetupOdds(e.qty), pc=Math.round(o.p*100); reqMet+=o.cr;
          if (o.cr>=0.5) { revived.add(c.key); synergies.push({link:gCap(e.name)+': '+c.setupPut, who:c.key,
            p:`${gCap(e.name)} can start the game face down in the Active Spot with ${c.setupPut} when it is in your opening hand, which happens in about ${pc}% of games, so it does not need to evolve.`}); }
          else flaws.push({sev:'warn', who:c.key, t:`${gCap(e.name)} rarely reaches the board`,
            d:`${gCap(e.name)} can only reach the board by starting the game in the Active Spot with ${c.setupPut}, and it is in your opening hand in only about ${pc}% of games.`}); }
        else if (candy||pre||own||copied) { reqMet++;
          if (own) synergies.push({link:gCap(e.name)+': '+(c.abil[0]||'Ability'), who:c.key,
            p:`${gCap(e.name)} can put itself onto your Bench from your hand with ${c.abil[0]||'its Ability'}, so it does not need to evolve. Read the card for what that needs.`});
          else if (candy) synergies.push({link:'Rare Candy > '+gCap(e.name), p:gSynText('evolution_access','Rare Candy',e.name)}); }
        // 3.2.5: brought back from the discard pile, with something in the list to put it there.
        // 3.2.8: the line is always shown, with how often it comes together, and a warning when that is rare.
        else if (rv) { if (out115.length) { const o=g115Odds(deck,rv,e,out115); reqMet+=o.cr;
            rvKeep(rv,e,o); if (o.p<RV_THIN) flaws.push(rvThin(rv,e,o)); } else flaws.push(rvNone(rv,e)); }
        else if (noBase&&provided['evolution_access']>0) flaws.push({sev:'crit', who:c.key, t:`No ${gCap(cb)} for ${gCap(e.name)}`,
          d:`${gCap(e.name)} evolves from ${gCap(c.from)}, which evolves from ${gCap(cb)}. Neither is in the list, and Rare Candy needs the Basic ${gCap(cb)} in play, so ${gCap(e.name)} can never reach the board.`});
        else flaws.push({sev:'crit', t:`Hard to get ${gCap(e.name)} into play`,
          d:`It is a Stage 2 with no Rare Candy and no ${gCap(c.from||'pre-evolution')} in the deck, so there is no realistic way to evolve into it.`});
      } else {
        if (provided[req]) { reqMet++;
          const prov=deck.find(x=>x.card&&(x.card.provides||[]).includes(req));
          if (prov) synergies.push({link:gCap(prov.name)+' > '+gCap(e.name), p:gSynText(req,prov.name,e.name)});
        } else flaws.push({sev:'warn', t:`${gCap(e.name)} wants ${gHuman(req)} that is not here`,
          d:`${gCap(e.name)} needs ${gHuman(req)} to do its job, and nothing in the deck provides it. A missing piece, or maybe intentional.`});
      }
      // v67: what each unmet need was, for the note on why Synergy is what it is.
      if (reqMet-m0<0.5) unmet.push(flaws.length>f0?flaws[f0].t:`${gCap(e.name)} is missing a piece`); });});
  // A Stage 1 whose Basic is not in the list can never reach the board.
  const nk = s => normalizeCardName(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const presentN = new Set(deck.filter(e=>e.card).map(e=>nk(e.name)));
  deck.forEach(e => { const c=e.card; if (!c || c.t!=='pkmn' || c.stage!=='stage1' || !c.from) return;
    if (presentN.has(nk(c.from))) return;
    // v65: a Pokemon ex can also evolve from a card that stands in for its Basic (Eevee ex for Jolteon ex).
    const sub = c.isEx && deck.find(x => x.card && x.card.standIn && nk(x.card.standIn) === nk(c.from));
    if (sub) { synergies.push({link:gCap(sub.name)+' > '+gCap(e.name), p:`${gCap(e.name)} evolves from ${gCap(c.from)}, and ${gCap(sub.name)} can evolve into it, so the line works without a plain ${gCap(c.from)}.`}); return; }
    // 3.2.5: a Stage 1 brought back from the discard pile needs no Basic either.
    const rv = g115Reviver(deck, e, energyTypes);
    if (rv && out115.length) { const o = g115Odds(deck, rv, e, out115);
      // 3.2.8: credit as often as the line comes together, and a warning when that is rare.
      if (o.cr < 1) { reqTotal++; reqMet += o.cr; }
      rvKeep(rv, e, o); if (o.p < RV_THIN) { const f = rvThin(rv, e, o); unmet.push(f.t); flaws.push(f); }
      return; }
    if (rv) { const f = rvNone(rv, e); reqTotal++; unmet.push(f.t); flaws.push(f); return; }
    reqTotal++; unmet.push(`No ${gCap(c.from)} for ${gCap(e.name)}`);
    flaws.push({sev:'crit', who:c.key, t:`No ${gCap(c.from)} for ${gCap(e.name)}`,
      d:`${gCap(e.name)} evolves from ${gCap(c.from)}, which is not in the list, so it can never reach the board.`}); });
  // 3.2.5: with nothing to fill the discard pile, one warning names every Pokemon left waiting there.
  const rvn=flaws.filter(f=>f.rvn);
  if (rvn.length>1) { const to=rvn.map(f=>gCap(f.rvn.to)), list=to.slice(0,-1).join(', ')+' and '+to[to.length-1], r0=rvn[0].rvn;
    const at=flaws.indexOf(rvn[0]);
    flaws.splice(at,1,{sev:'warn', who:rvn[0].who, t:`Nothing puts ${list} in your discard pile`,
      d:`${list} can only reach the board when ${gCap(r0.by)} brings them back from your discard pile${r0.via ? ` with ${r0.via}` : ''}, but nothing in the list discards cards from your hand or deck, like Ultra Ball or Brilliant Blender.`});
    rvn.slice(1).forEach(f=>flaws.splice(flaws.indexOf(f),1)); }
  // 3.2.5: one line for each card that brings Pokemon back, naming them and what fills the discard pile.
  rv115.forEach(g => { const nm=g.self ? (g.r.via||gCap(g.by.name)) : gCap(g.by.name), via=g.self ? '' : g.r.via, to=g.to.map(gCap), one=to.length===1;
    const list=one ? to[0] : to.slice(0,-1).join(', ')+' and '+to[to.length-1];
    const outs=rvOuts(), odds=rvOdds(g.p);
    synergies.push({ link:(g.self ? gCap(g.by.name)+': '+nm : nm+' > '+to.join(', ')), who:g.by.card.key, rev:true,
      p:`${nm} puts ${list} onto your Bench from your discard pile${via ? ` with ${via}` : ''}, so ${one ? 'it needs' : 'they need'} nothing to evolve from. ${outs.join(' and ')} ${outs.length>1 ? 'get' : 'gets'} ${one ? 'it' : 'them'} into your discard pile.` +
        (odds ? ` The whole line comes together in ${odds}.` : '') }); });
  const draw=provided['draw']||0, hasAtk=deck.some(e=>e.card&&e.card.attacks);
  // 3.4.14: with no draw, the cut depends on how much the list searches. A Supporter that searches the
  // deck counts 1 and any other search card half; 10 of those (8 searching Supporters and 4 Ultra Ball,
  // say) halve the cut, from 40% kept to 75% kept. A list with that much search still finds its pieces,
  // so it is no longer a problem that stops the deck, only a weakness. Before, every list with no draw
  // fell to about a 2 (a Mega Abomasnow list that placed 11th of 85 graded 2.2).
  const srchN = draw ? 0 : deck.reduce((a,e)=>a+(e.card&&(e.card.provides||[]).some(p=>p.startsWith('search'))
    ? e.qty*(e.card.t==='trainer'&&e.card.tt==='supporter' ? 1 : 0.5) : 0),0);
  const srchF = Math.min(1, srchN/10), drawKeep = draw ? 1 : 0.4+0.35*srchF;
  if (!draw) flaws.push({sev: srchF>=0.5 ? 'warn' : 'crit', t:'No real draw engine',
    d: srchF>=0.5 ? 'Nothing in the list draws cards. It can search the deck for what it needs, but a hand that misses still stays bad, so the deck stalls more often than one with draw.'
      : 'Nothing reliably refills your hand. The deck stalls as soon as your opening cards run dry.'});
  // v57: a list with draw only from Pokemon (Fezandipiti ex after a Knock Out, Squawkabilly ex on turn 1)
  // and no Supporter that draws or searches runs out of cards once the opening hand is spent.
  const supQ = deck.filter(e=>e.card&&e.card.t==='trainer'&&e.card.tt==='supporter'&&(e.card.provides||[]).some(p=>p==='draw'||p.startsWith('search')))
    .reduce((a,e)=>a+e.qty,0);
  // 3.2.7: not while some Trainers' card data has not loaded, since they may be the Supporters.
  const supUnk = deck.some(e=>!e.card||(e.card.t==='trainer'&&!e.card.tt));
  if (draw && !supQ && !supUnk) {
    const via = [...new Set(deck.filter(e=>e.card&&(e.card.provides||[]).includes('draw')).map(e=>gCap(e.name)))];
    flaws.push({sev:'warn', t:'No Supporter to draw with',
      d:`None of your Supporters draws cards or searches your deck, so once your opening hand is spent your only draw is ${via.slice(0,3).join(' and ')}. Most decks run 4 or more Supporters that draw, like Lillie's Determination.`}); }
  // v57: far more Energy than the attacks use means many draws are Energy you cannot use that turn.
  // Decks whose attacks count Energy (attached, discarded or in the discard pile) are left alone.
  const eQ = deck.reduce((a,e)=>a+(e.card&&e.card.t==='energy'?e.qty:0),0);
  const eScale = deck.some(e=>e.card&&(e.card.attacks||[]).some(a=>a.escale||a.edisc||(a.pile&&a.pile.kind==='energy')||(a.mill&&a.mill.kind==='energy')));
  // 3.4.14: an attack that does damage for each Energy it discards from the top of the deck (Mega Abomasnow
  // ex's Hammer-lanche) wants Energy in the deck, not attached, so every Energy is damage and none is excess.
  const eMill = deck.some(e=>e.card&&(e.card.attacks||[]).some(a=>a.mill&&a.mill.kind==='energy'&&a.mill.per>0));
  if (eQ >= 22 && !eScale) flaws.push({sev:'warn', t:'Heavy on Energy',
    d:`The list runs ${eQ} Energy. Most decks run 8 to 16, so a lot of your draws are Energy you cannot use that turn. Trade some for draw or search cards.`});
  // 3.2.8: attacks that use Energy still want it attached, not stuck in hand: past 24 even those lists draw too much of it.
  else if (eQ >= 24 && !eMill) flaws.push({sev:'warn', t:'Heavy on Energy',
    d:`The list runs ${eQ} Energy. Even decks whose attacks use up Energy rarely run more than 20, so a lot of your draws are Energy you cannot use that turn. Trade some for draw or search cards.`});
  // 3.2.8: too little Energy to attack with. Text only: the attacks it cannot pay already count for nothing in the grade.
  const eAtk = deck.filter(e=>e.card&&e.card.t==='pkmn'&&(e.card.attacks||[]).some(a=>(a.cost||[]).length));
  if (hasAtk && eAtk.length && eQ <= 1) flaws.push({sev:'warn', t: eQ ? 'Only 1 Energy' : 'No Energy in the list',
    d: eQ ? 'The list runs 1 Energy card, so it is rarely in your hand when you need it, and attacks that cost Energy will almost never be used. Most decks run 8 to 16.'
      : 'The list runs no Energy cards, so no attack that costs Energy can ever be used. Most decks run 8 to 16.'});
  // v59: Rare Candy with no Stage 2 in the list can never be played.
  const hasS2 = deck.some(e=>e.card&&e.card.t==='pkmn'&&e.card.stage==='stage2');
  const candyQ = deck.filter(e=>e.card&&e.card.t==='trainer'&&(e.card.provides||[]).includes('evolution_access'));
  if (!hasS2 && candyQ.length) {
    const n = candyQ.reduce((a,e)=>a+e.qty,0), nm = [...new Set(candyQ.map(e=>gCap(e.name)))].join(' and ');
    flaws.push({sev:'warn', t:`${nm} has nothing to evolve`,
      d:`The list has no Stage 2 Pokemon, so the ${n} ${nm} ${n>1?'cards':'card'} cannot be played. Cut ${n>1?'them':'it'} for cards the deck uses.`}); }
  // v59: one copy of the Basic under 2 or more evolutions: prize it or lose it and the line is gone.
  const qN = new Map(), cN = new Map(), nN = new Map();
  deck.forEach(e=>{ if(!e.card||e.card.t!=='pkmn') return; const k=nk(e.name); qN.set(k,(qN.get(k)||0)+e.qty); if(!cN.has(k)) { cN.set(k,e.card); nN.set(k,e.name); } });
  const thin = new Set();
  deck.forEach(e=>{ const c=e.card; if(!c||c.t!=='pkmn'||!c.from||(c.stage!=='stage1'&&c.stage!=='stage2')) return;
    let root=nk(c.from), up=cN.get(root);
    if (c.stage==='stage2' && up && up.from) root=nk(up.from);
    const rc=cN.get(root), rq=qN.get(root)||0, eq=qN.get(nk(e.name))||0;
    if (!rc || rc.stage!=='basic' || rq!==1 || eq<2 || thin.has(root)) return;
    thin.add(root);
    const rn=gCap(nN.get(root));
    flaws.push({sev:'warn', t:`Only 1 ${rn}`, cl:{ n:nN.get(root), q:1 },
      d:`${eq} ${gCap(e.name)} evolve from ${rn}, and the list has 1. If it is prized or Knocked Out, they have nothing to evolve from.`}); });
  // v59: nothing that finds a Pokemon in the deck means every line rests on drawing it.
  const anyMon = deck.some(e=>e.card&&e.card.t==='pkmn');
  if (anyMon && !provided['search_pokemon'] && !provided['search_basic']) flaws.push({sev:'warn', t:'No way to find your Pokemon',
    d:"Nothing in the list searches your deck for a Pokemon, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin, so getting your attackers into play rests on drawing them."});
  // v59: no Boss's Orders or the like means you cannot pick which Pokemon to Knock Out.
  if (anyMon && hasAtk && !provided['gust']) flaws.push({sev:'warn', t:'Nothing to pull up a Benched Pokemon',
    d:"No card moves your opponent's Benched Pokemon into the Active Spot, like Boss's Orders or Prime Catcher, so you can only Knock Out what they choose to put there. Some decks skip it on purpose, but most run 2 to 4."});
  if (!hasAtk) flaws.push({sev:'crit', t:'No clear attacker',
    d:'No Pokemon here is set up to deal meaningful damage, so there is no win condition to build toward.'});
  // Nothing to check is not a fault: with card data read and no needs, nothing is missing.
  let base = reqTotal ? reqMet/reqTotal : (deck.some(e=>e.card&&e.card.t==='pkmn') ? 1 : 0.6);
  // v67: the parts of the score, kept for the note on why Synergy is what it is.
  const parts = { met:reqMet, total:reqTotal, unmet, base0:base, noDraw:!draw, drawKeep, noAtk:!hasAtk,
    crits:flaws.filter(f=>f.sev==='crit').map(f=>f.t) };
  if (!draw) base*=drawKeep;
  if (!hasAtk) base*=0.3;
  base -= 0.12*flaws.filter(f=>f.sev==='crit').length;
  return { score:gClamp(base,0,1), synergies, flaws, provided, energyTypes, present, parts, revived };
}


/**
 * What one attack reaches. A bonus that waits on the discard pile counts
 * only when the deck holds enough of those cards to ever meet it.
 */
// v61: an attack that counts the cards in your hand. The card reader assumes 7. Each Pokemon in the list
// with a draw Ability (Kadabra's and Alakazam's Psychic Draw, Dudunsparce's Run Away Draw) adds to the hand
// you attack with, up to 11 cards with 3 or more of them.
function gHandReach(a, deck) {
  const per = Math.round((a.dmg || 0) / 7), drawers = new Set();
  deck.forEach(e => { const c = e.card; if (c && c.t === 'pkmn' && (c.ab || []).some(x => /\bdraws? (?:\d+|a) cards?\b|draws until/.test(x.p || ''))) drawers.add(c.key); });
  const hand = 7 + Math.min(4, Math.round(drawers.size * 1.5));
  return { now: a.dmg || 0, top: per * hand, cond: null, hand };
}
// v62: a fixed damage bonus with a condition. The full hit counts only when the list can meet the
// condition every turn it needs to; otherwise the grade counts the printed base. A bonus that waits
// on a nearly empty deck never counts.
function gNeedReach(a, deck) {
  const n = a.need, full = a.dmg || 0, base = n.base || 0;
  const qty = f => deck.reduce((s, e) => s + (e.card && f(e.card) ? e.qty : 0), 0);
  let have = null, met = true;
  if (n.k === 'moved') { have = qty(c => c.t === 'trainer' ? (c.provides || []).includes('switch_own') : c.t === 'pkmn' && c.swab); met = have >= 4; }
  // v62: moving counters onto the Active counts too (Munkidori's Adrena-Brain for Mega Golisopod's Finishing Blow).
  else if (n.k === 'oppdmg') { have = qty(c => (c.t === 'pkmn' && (c.abDmg || []).length) || ['spread_counters', 'move_counters'].some(x => (c.provides || []).includes(x))); met = have >= 1; }
  else if (n.k === 'energy') { const ty = /^(?:grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon)$/.test(n.what);
    have = qty(c => c.t === 'energy' && (ty ? (c.etypes || [c.etype]).map(x => String(x || '').toLowerCase()).some(x => x === n.what || x === 'any') : String(c.key || '').includes(n.what + ' energy'))); met = have >= 2; }
  else if (n.k === 'supname') { have = qty(c => c.t === 'trainer' && (c.sub || []).includes('supporter') && String(c.key || '').includes(n.name.toLowerCase())); met = have >= 4; }
  else if (n.k === 'discab') { have = qty(c => c.t === 'pkmn' && (c.abil || []).some(x => String(x).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\u00e9/g, 'e') === n.abil)); met = have >= n.n; }
  else if (n.k === 'deck' || n.k === 'prize6') met = false;
  else if (n.k === 'inplay') { have = qty(c => c.t === 'energy' && (c.etypes || [c.etype]).map(x => String(x || '').toLowerCase()).some(x => x === n.type || x === 'any')); met = have >= 2 * n.n; }
  else if (n.k === 'xenergy') { have = qty(c => (c.provides || []).includes('energy_accel')); met = have >= 3; }
  else if (n.k === 'stadium') { have = qty(c => c.t === 'trainer' && (c.sub || []).includes('stadium')); met = have >= 2; }
  else if (n.k === 'btype') { have = qty(c => c.t === 'pkmn' && (c.types || []).includes(n.type)); met = have >= 2; }
  else if (n.k === 'bnames') met = n.names.every(x => deck.some(e => e.card && e.card.key === x));
  const top = met ? full : base;
  // Damage on itself comes from taking a hit first, so the full hit is a later turn's.
  return { now: ['selfdmg', 'ko', 'next'].includes(n.k) ? base : top, top, cond: null, need: Object.assign({}, n, { have, met, full }) };
}
function gAtkReach(a, deck) {
  const now = a.early != null ? a.early : (a.dmg || 0);
  if (a.escale && !a.cond) return gEnergyReach(a, deck);
  if (a.pile && !a.cond) return gPileReach(a, deck);
  if (a.group && !a.cond) return gGroupReach(a, deck);
  if (a.mill && !a.cond) return gMillReach(a, deck);
  if (a.kox) return gKoReach(a, deck);
  if (a.hand && !a.cond) return gHandReach(a, deck);
  if (a.need && !a.cond) return gNeedReach(a, deck);
  if (!a.cond) return { now: a.dmg || 0, top: a.dmg || 0, cond: null };
  const ab = a.cond.ability ? a.cond.ability.toLowerCase() : null;
  let have = 0;
  deck.forEach(e => { const c = e.card; if (!c) return;
    if (ab) { if ((c.abil || []).some(x => x.toLowerCase() === ab)) have += e.qty; }
    else if (a.cond.kind === 'pokemon') { if (c.t === 'pkmn') have += e.qty; }
    else if (a.cond.kind === 'energy') { if (c.t === 'energy') have += e.qty; }
    else if (a.cond.kind === 'trainer') { if (c.t === 'trainer') have += e.qty; }
    else have += e.qty; });
  const top = have >= a.cond.n ? Math.max(a.max || 0, now) : now;
  return { now, top, cond: top > now ? a.cond : null, have };
}

/**
 * v55: damage that counts cards in your discard pile (Ethan's Typhlosion's Buddy Blast,
 * Ceruledge ex's Abyssal Flames). Early is 2 of them in the pile. The full hit is as many
 * as it takes to one-shot the format's biggest threat, never more than the list runs.
 */
// v56: does this list entry fit what an attack counts (spec56, group56)?
function g56Match(p, e) {
  const c = e.card; if (!c) return false;
  if (p.kind === 'name') return g35Key(e.name) === g35Key(p.what);
  if (p.kind === 'energy') { if (c.t !== 'energy') return false;
    const ty = c.etypes && c.etypes.length ? c.etypes : (c.etype ? [c.etype] : []);
    if (p.basic && !/^(basic )?\w+ energy$/i.test(String(e.name || '').trim())) return false;
    return !p.type || ty.includes(p.type); }
  if (p.kind === 'pokemon') return c.t === 'pkmn';
  if (p.kind === 'pre') return c.t === 'pkmn' && g35Key(e.name).startsWith(g35Key(p.pre));
  if (p.kind === 'trainer' || p.kind === 'supporter' || p.kind === 'item')
    return c.t === 'trainer' && (p.kind === 'trainer' || c.tt === p.kind) && (!p.has || g35Key(e.name).includes(g35Key(p.has)));
  // group56: names, a name start, a stage or an attack name.
  if (c.t !== 'pkmn') return false;
  if (p.names) return p.names.includes(g35Key(e.name));
  if (p.pre) return g35Key(e.name).startsWith(g35Key(p.pre));
  if (p.stage) return p.stage === 'evolution' ? c.stage === 'stage1' || c.stage === 'stage2' : c.stage === p.stage.replace(' ', '');
  if (p.atk) return (c.attacks || []).some(x => g35Key(x.name) === g35Key(p.atk));
  return false;
}
// v56: one of what an attack counts, in plain words, for the grade's sentences.
function g56One(p) {
  if (p.kind === 'name') return `${gCap(p.what).replace(/'S\b/g, "'s")} card`;
  if (p.kind === 'energy') return `${p.basic ? 'Basic ' : ''}${p.type ? gCap(p.type) + ' ' : ''}Energy card`;
  if (p.kind === 'pokemon') return 'Pokemon';
  if (p.kind === 'pre') return `${gCap(p.pre.trim()).replace(/'S\b/g, "'s")} Pokemon`;
  if (p.kind) return p.has ? `${gCap(p.kind)} card with ${gCap(p.has).replace(/'S\b/g, "'s")} in its name` : `${gCap(p.kind)} card`;
  if (p.names) return p.names.map(n => gCap(n)).join(' or ');
  if (p.pre) return `${gCap(p.pre.trim()).replace(/'S\b/g, "'s")} Pokemon`;
  if (p.stage) return `${gCap(p.stage)} Pokemon`;
  return `Pokemon with ${p.atk}`;
}
function g56Many(p, n) {
  const one = g56One(p);
  if (n === 1 || /Pokemon$/.test(one) || p.names) return one;
  return one.replace(/ card( with|$)/, ' cards$1');
}
function gPileReach(a, deck) {
  const p = a.pile;
  let have = 0;
  deck.forEach(e => { if (g56Match(p, e)) have += e.qty; });
  const need = Math.max(1, Math.ceil((FMT.threatHP[1] - p.base) / p.per));
  const nNow = Math.min(have, 2), nTop = Math.min(have, Math.max(2, need));
  const now = p.base + p.per * nNow, top = p.base + p.per * nTop;
  return { now, top, cond: top > now ? { n: nTop, what: g56Many(p, nTop) } : null, have, conf: 'est', pile: p,
    sc: { per: p.per, one: g56One(p), where: 'in your discard pile', fill: 'Filling the discard pile' }, late: nTop > 6 };
}
/**
 * v56: an attack that counts some of your Pokemon in play (group56). Early is 2 of them.
 * The full hit is as many as the list runs, at most 5 in play or 4 on the Bench, since
 * the rest of the board holds other Pokemon.
 */
function gGroupReach(a, deck) {
  const g = a.group;
  // Each evolution line is one Pokemon in play, so Tympole, Palpitoad and Seismitoad with
  // Round count once per Tympole. When the attacker evolves from what it counts (Vikavolt
  // from Charjabug), the line it sits on is not on the Bench.
  const qK = k => deck.reduce((n, e) => n + (e.card && e.card.key === k ? e.qty : 0), 0);
  const chain = k => { const out = [k]; let f = k;
    for (;;) { const x = deck.find(y => y.card && y.card.key === f); f = x && x.card.from; if (!f || out.includes(f)) return out; out.push(f); } };
  const fam = new Map();
  deck.forEach(e => { if (!g56Match(g, e)) return;
    const ch = chain(e.card.key), root = ch[ch.length - 1], cap = qK(root) || e.qty;
    const f = fam.get(root) || { n: 0, cap, keys: new Set() }; f.n += e.qty; f.keys.add(e.card.key); fam.set(root, f); });
  const self = deck.find(e => e.card && (e.card.attacks || []).includes(a));
  let have = 0;
  fam.forEach((f, root) => { let n = Math.min(f.n, f.cap);
    if (self && !f.keys.has(self.card.key) && chain(self.card.key).some(k => f.keys.has(k))) n = Math.min(n, f.cap - 1);
    have += Math.max(0, n); });
  const nNow = Math.min(have, 2), nTop = Math.min(have, g.bench ? 4 : 5);
  const now = g.base + g.per * nNow, top = g.base + g.per * nTop;
  const where = g.bench ? 'on your Bench' : 'in play';
  return { now, top, cond: top > now ? { n: nTop, what: g56Many(g, nTop) } : null, have, conf: 'est', pile: g,
    sc: { per: g.per, one: g56One(g), where, fill: g.bench ? 'Filling your Bench' : 'Getting them all into play' }, late: false };
}
/**
 * v60: an attack that Knocks Out the opponent's Active Pokemon (kox60). A Knock Out is worth a
 * one-shot of the format's biggest threat. A coin flip counts at its chance. One that needs
 * exactly N damage counters on the target counts only when the list can put counters on the
 * opponent's Pokemon (Munkidori's Adrena-Brain, Dusknoir); one that needs N cards discarded from
 * hand counts as a late game finisher when the list runs twice that many. Only a Basic target
 * counts at 7 in 10, since most of the format's big threats are Basic Pokemon ex.
 */
function gKoReach(a, deck) {
  const k = a.kox, ko = FMT.threatHP[1], b = k.basic ? 0.7 : 1;
  const cnt = deck.some(e => e.card && ((e.card.provides || []).some(p => p === 'move_counters' || p === 'spread_counters') || (e.card.abDmg || []).length));
  let v = 0, late = false, flip = null, conf = 'high';
  if (k.how === 'always') v = ko;
  else if (k.how === 'flip') { v = ko * k.p; flip = 1; conf = 'medium'; }
  else if (k.how === 'counters') { v = cnt ? ko : 0; conf = 'est'; }
  else if (k.how === 'discard') {
    const w = String(k.what || '').replace(/ cards?$/, '');
    const have = deck.reduce((n, e) => n + (e.card && (String(e.name || '').toLowerCase() === w || (w === 'basic ' + String(e.name || '').toLowerCase())) ? e.qty : 0), 0);
    v = have >= k.n * 2 ? ko : 0; late = true; conf = 'est';
  }
  v = Math.round(v * b / 10) * 10;
  return { now: late ? 0 : v, top: v, cond: null, conf, flip, late, kox: Object.assign({}, k, { cnt }) };
}

/**
 * v56: an attack that counts what comes off the top of your deck (mill56). The grade counts
 * the average for this list: the cards turned over times the share of the list that counts.
 * With "each player's deck" the opponent's card counts too, at 1 in 5 as the app's estimate.
 */
function gMillReach(a, deck) {
  const m = a.mill;
  let have = 0, total = 0;
  deck.forEach(e => { if (!e.card && !e.qty) return; total += e.qty || 0; if (g56Match(m, e)) have += e.qty; });
  total = total || 60;
  const avg = m.n * have / total + (m.both ? m.n * 0.2 : 0);
  const v = m.base + Math.round(m.per * avg / 10) * 10;
  return { now: v, top: v, cond: null, have, conf: 'est', flip: 'mill', mill: Object.assign({}, m, { have, avg }) };
}

/**
 * v53: damage that counts Energy in play. The per Energy number and the
 * Energy types come from the card; the count is an estimate the text says
 * out loud: 5 across all your Pokemon, 3 on one Pokemon or on both Active
 * Pokemon, never more than the list holds. need() is how many it takes to
 * reach a given HP, which is plain arithmetic on the printed numbers.
 */
const G53_ESCALE_N = { all: 5, self: 3, both: 3 };
function gEnergyReach(a, deck) {
  const e = a.escale;
  // An Ability like Wild Growth makes each Basic Energy of a type count twice.
  const dbl = [];
  deck.forEach(x => (x.card && x.card.edbl || []).forEach(d => {
    if ((!e.types.length || e.types.includes(d.type)) && !dbl.some(y => y.type === d.type)) dbl.push({ type: d.type, abil: d.abil, who: x.name }); }));
  let have = 0, haveDbl = 0;
  deck.forEach(x => { const c = x.card; if (!c || c.t !== 'energy') return;
    const ty = c.etypes && c.etypes.length ? c.etypes : (c.etype ? [c.etype] : []);
    if (!e.types.length || ty.includes('any') || e.types.some(t => ty.includes(t))) {
      have += x.qty;
      if (/^(basic )?\w+ energy$/i.test(String(x.name || '').trim()) && dbl.some(d => ty.includes(d.type))) haveDbl += x.qty; } });
  // Doubling counts only when most of the counted Energy is Basic Energy it doubles.
  const x2 = dbl.length && haveDbl * 2 >= have ? dbl[0] : null;
  const k = x2 ? 2 : 1;
  // v60: both Active Pokemon. The attacker carries at least its own cost, one more when the
  // list can attach extra Energy (Teal Mask Ogerpon ex's Teal Dance), each doubled by an Ability
  // like Wild Growth; the opponent's Active is counted at 2. Before, this was a flat 3 between
  // them, so Myriad Leaf Shower read 120 in a deck built to hit 300 and more.
  let own = 0, opp = 0;
  if (e.scope === 'both') {
    const accel = deck.some(x => x.card && (x.card.provides || []).includes('energy_accel'));
    own = Math.max(1, (a.cost || []).length) + (accel ? 1 : 0); opp = 2;
  }
  const n = e.scope === 'both' ? own * k + opp : Math.min(have, G53_ESCALE_N[e.scope] || 3);
  // Like a discard pile bonus, the full hit counts when the list holds enough
  // Energy to one-shot the format's biggest threat; the grade calls it a mid game plan.
  const need = Math.max(1, Math.ceil((FMT.threatHP[1] - e.base) / (e.per * k)));
  const nTop = e.scope === 'both' ? n : Math.min(have, Math.max(n, need));
  const kk = e.scope === 'both' ? 1 : k;
  const now = e.base + e.per * n * kk, top = e.base + e.per * nTop * kk;
  return { now, top, cond: null, conf: 'est', escale: Object.assign({}, e, { n, nTop, have, x2, own, opp }) };
}

// v37: damage boosters, each number and limit read from the printed card text.
// A booster the app does not know adds nothing, so no number is invented.
// vsEx: only against the opponent's Active Pokemon ex. noRuleBox: only for an
// attacker without a Rule Box. only / pre / type: which attackers it helps.
// poison: only while the attacker is Poisoned. last: the Supporter must be the
// last card in your hand. behind: only while you have more prizes left.
const G35_BOOST = {
  'brave bangle':             { n:30, cat:'tool', vsEx:true, noRuleBox:true },
  'maximum belt':             { n:50, cat:'tool', vsEx:true },
  'light ball':               { n:50, cat:'tool', vsEx:true, only:['pikachu ex'] },
  "hop's choice band":        { n:30, cat:'tool', pre:"hop's " },
  'binding mochi':            { n:40, cat:'tool', poison:true },
  'defiance band':            { n:30, cat:'tool', behind:true },
  'vitality band':            { n:10, cat:'tool' },
  "black belt's training":    { n:40, cat:'supporter', vsEx:true },
  'kieran':                   { n:30, cat:'supporter', vsEx:true },
  "gladion's final battle":   { n:80, cat:'supporter', noRuleBox:true, last:true },
  'premium power pro':        { n:30, cat:'item', type:'fighting' },
  'postwick':                 { n:30, cat:'stadium', pre:"hop's " },
  'voltaic lightning energy': { n:20, cat:'energy', type:'lightning' },
};
function g35Key(n) { return String(n||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim(); }
/** The most one attacker can add: one card of each kind (Tool, Supporter, Item, Stadium, Energy) that helps it. */
function g35Boost(deck, atk) {
  const a = typeof atk === 'object' && atk ? atk : { isEx: !!atk };
  const key = g35Key(a.key || '');
  const ruleBox = a.isEx || (a.p || 1) >= 2;
  const best = {};
  deck.forEach(e => { const b = G35_BOOST[g35Key(e.name)];
    if (!b) return;
    if (b.noRuleBox && ruleBox) return;
    if (b.only && !b.only.includes(key)) return;
    if (b.pre && !key.startsWith(b.pre)) return;
    if (b.type && !(a.types || []).includes(b.type)) return;
    if (!best[b.cat] || b.n > best[b.cat].n) best[b.cat] = { ...b, name: gCap(e.name).replace(/'S\b/g, "'s") }; });
  // v54: an Ability that puts damage counters on the opponent's Pokemon in the same turn
  // (Dusknoir's Cursed Blast). One a turn is counted. One that works only while its own
  // Pokemon is Active helps only that Pokemon.
  deck.forEach(e => (e.card && e.card.abDmg || []).forEach(x => {
    if (x.active && e.card.key !== key) return;
    // 3.2.8: an Ability that Knocks Out its own Pokemon (Cursed Blast) is not added to that Pokemon's own attack:
    // Dusknoir cannot use Cursed Blast and then attack. Another Pokemon's attack still counts it (Fezandipiti ex).
    if (x.selfKO && e.card.key === key) return;
    if (!best.ability || x.n > best.ability.n)
      best.ability = { n: x.n, cat: 'ability', name: `${gCap(e.name)}'s ${x.abil}`, who: gCap(e.name), selfKO: !!x.selfKO }; }));
  // v55: an Ability that boosts the attacks of a group of your Pokemon (Cynthia's Roserade's
  // Cheer On to Glory). Each copy in play adds its number unless the card says it does not
  // stack. Two in play is the estimate, never more than the list runs.
  deck.forEach(e => (e.card && e.card.abBoost || []).forEach(x => {
    if (x.pre && !key.startsWith(x.pre)) return;
    if (x.type && !(a.types || []).includes(x.type)) return;
    const k = x.one ? 1 : Math.min(2, deck.filter(y => y.card && y.card.key === e.card.key).reduce((n, y) => n + y.qty, 0));
    if (!best.aboost || x.n * k > best.aboost.n)
      best.aboost = { n: x.n * k, cat: 'aboost', name: `${x.abil} from ${k > 1 ? k + ' ' : ''}${gCap(e.name).replace(/'S\b/g, "'s")}` }; }));
  // v62: its own Ability adds damage with one type of Energy attached, when the list runs Energy that gives that type.
  if (a.sboost && deck.some(e => e.card && e.card.t === 'energy' && (e.card.etypes || []).some(x => x === a.sboost.type || x === 'any')))
    best.self = { n: a.sboost.n, cat: 'self', name: `its ${a.sboost.abil} with ${gCap(a.sboost.type)} Energy attached` };
  const list = Object.values(best);
  return { n: list.reduce((s, b) => s + b.n, 0), names: list.map(b => b.name),
    vsEx: list.some(b => b.vsEx), behind: list.some(b => b.behind), poison: list.some(b => b.poison), last: list.some(b => b.last),
    ko: list.filter(b => b.selfKO).map(b => b.who) };
}
/** v62: what a fixed damage bonus waits on, and whether the list can meet it. Starts with the attack's name. */
function g62Need(r, name) {
  const n = r.need, nm = gCap(name || r.name || 'it');
  const and = l => l.length > 1 ? l.slice(0, -1).map(gCap).join(', ') + ' and ' + gCap(l[l.length - 1]) : gCap(l[0]);
  const when = { moved: `on a turn ${nm} moves up from your Bench to the Active Spot`, selfdmg: `once ${nm} has damage counters on it`,
    oppdmg: 'against an Active Pokemon that already has damage counters on it', deck: `once your deck is down to ${n.n} cards or fewer`,
    xenergy: `with ${n.n} extra Energy attached to it`, stadium: 'while you have a Stadium in play',
    btype: `with a ${gCap(n.type)} Pokemon on your Bench`, bnames: `with ${and(n.names || [])} on your Bench`,
    ko: 'on the turn after one of your Pokemon was Knocked Out', next: 'when it used the same attack the turn before', energy: `with ${gCap(n.what || '')} Energy attached to ${nm}`,
    supname: `on a turn you play a ${gCap(n.name || '')} Supporter`, prize6: 'while you still have all 6 Prize cards left',
    evolved: `on the turn it evolves from ${gCap(n.from || '')}`, inplay: `with ${n.n} ${gCap(n.type || '')} Energy in play`, discab: `with ${n.n} Pokemon with ${gCap(n.abil || '')} in your discard pile` }[n.k];
  const head = `${r.atk} does ${n.full} only ${when}, ${n.base} otherwise.`;
  // 2.6.6: one card reads "1 card that does", not "1 cards that do".
  const cs = (k, does) => `${k} card${k === 1 ? '' : 's'} that ${k === 1 ? does.replace(/^switch (.*) or let /, 'switches $1 or lets ').replace(/^(put|attach) /, (m, w) => w + (w === 'attach' ? 'es ' : 's ')) : does}`;
  if (n.met) return head + (n.k === 'moved' ? ` Your list has ${cs(n.have, 'switch it in or let you retreat for free')}, so the grade counts ${n.full}.`
    : n.k === 'selfdmg' ? ' The full hit comes after it has taken a hit, not on its first attack.'
    : n.k === 'ko' ? ' The full hit comes after you lose a Pokemon, not on your first attack.'
    : n.k === 'evolved' ? ` The grade counts ${n.full}, since you attack the turn it evolves.`
    : n.k === 'next' ? ` The grade counts ${n.full}, since it can keep attacking turn after turn, but its first use does ${n.base}.`
    : n.k === 'oppdmg' ? ` Your list has ${cs(n.have, 'put damage counters on it first')}, so the grade counts ${n.full}.`
    : n.k === 'xenergy' ? ` Your list has ${cs(n.have, 'attach extra Energy')}, so the grade counts ${n.full}.`
    : ` Your list can set that up, so the grade counts ${n.full}.`);
  const why = { moved: `your list has only ${cs(n.have, 'switch it in or let you retreat for free')}`,
    oppdmg: 'nothing in your list puts damage counters on it before you attack', deck: 'that is only at the very end of a game',
    xenergy: `your list has only ${cs(n.have, 'attach extra Energy')}`, stadium: `your list has only ${n.have} Stadium${n.have === 1 ? '' : 's'}`,
    btype: `your list has only ${n.have} ${gCap(n.type)} Pokemon`, bnames: 'your list does not run all of them',
    energy: `your list has only ${n.have} ${gCap(n.what || '')} Energy`, supname: `your list has only ${n.have} ${gCap(n.name || '')} Supporter${n.have === 1 ? '' : 's'}`,
    discab: `your list has only ${n.have} Pokemon with ${gCap(n.abil || '')}`, prize6: 'that is only before you take your first prize',
    inplay: `your list has only ${n.have} ${gCap(n.type || '')} Energy` }[n.k];
  return head + ` The grade counts ${n.base}, since ${why}.`;
}
/** v62: attacking twice a turn, in one sentence. */
function g62Twice(r) { const t = r.twice;
  return `Its ${t.abil} lets it attack twice a turn${t.stadium ? ' while ' + gCap(t.stadium) + ' is in play' : ''}, so the grade counts two hits of ${t.one}, ${t.one * 2} in all` +
    (r.boost ? `, or ${r.eff} with ${r.bNames.join(' and ')} on both.` : '.'); }
/** One sentence on one attacker: the printed number, how it gets there and what each booster adds. */
function g35Hit(r) {
  const nm = gCap(r.name);
  if (r.escale && !r.copy) {
    const e = r.escale, ty = e.types.map(gCap);
    const what = (ty.length ? ty.join(' and ') + ' ' : '') + 'Energy';
    if (e.scope === 'both') return `${nm}'s ${r.atk} does ${e.base ? e.base + ' plus ' : ''}${e.per} for each Energy attached to both Active Pokemon. ` +
      `The app counts ${e.own} on it${e.x2 ? `, each counting twice with ${gCap(e.x2.who)}'s ${e.x2.abil}` : ''}, and 2 on your opponent's Active, so ${r.top} is its estimate, not a printed number.`;
    const [lo, hi] = FMT.threatHP;
    const k = e.x2 ? 2 : 1;
    const need = hp => Math.max(1, Math.ceil((hp - e.base) / (e.per * k)));
    const card = e.x2 ? ` Basic ${gCap(e.x2.type)} Energy cards` : '';
    return (e.discard ? `${nm}'s ${r.atk} discards ${what} from your Pokemon and does ${e.per} for each one discarded. `
      : `${nm}'s ${r.atk} does ${e.base ? e.base + ' plus ' : ''}${e.per} for each ${what} attached to ${e.scope === 'all' ? 'all your Pokemon' : 'it'}. `) +
      (e.x2 ? `${gCap(e.x2.who)}'s ${e.x2.abil} makes each Basic ${gCap(e.x2.type)} Energy count twice. ` : '') +
      `It takes ${need(lo)}${card} to one-shot ${lo} HP and ${need(hi)} for ${hi} HP, before Weakness. Your list runs ${e.have}.` +
      (r.boost ? ` ${r.bNames.join(' and ')} ${r.bNames.length > 1 ? 'add' : 'adds'} ${r.boost} more${r.vsEx ? ' against a Pokemon ex' : ''}.` : '') +
      (r.ko && r.ko.length ? ` Using it Knocks Out ${r.ko.join(' and ')}, which gives up a prize.` : '');
  }
  if (r.kox && !r.copy) { const k = r.kox, tgt = `your opponent's Active ${k.basic ? 'Basic ' : ''}Pokemon`;
    return k.how === 'counters' ? `${nm}'s ${r.atk} Knocks Out ${tgt} when it has exactly ${k.n} damage counters on it, and this list can put counters on it to set that up, so the grade counts it as a one-shot of anything.`
      : k.how === 'discard' ? `${nm}'s ${r.atk} Knocks Out ${tgt} when you discard ${k.n} ${k.what} from your hand, so the grade counts it as a late game one-shot.`
      : k.how === 'flip' ? `${nm}'s ${r.atk} Knocks Out ${tgt} on a coin flip, ${k.p === 0.5 ? 'half the time' : 'one time in ' + Math.round(1 / k.p)}, so the grade counts it at ${r.top}.`
      : `${nm}'s ${r.atk} Knocks Out ${tgt} outright, so the grade counts it as a one-shot of anything.`; }
  // v62: two attacks a turn: one hit's sentence, then the two together.
  if (r.twice) { const one = Object.assign({}, r, { twice: null, top: r.twice.one, now: r.now / 2, boost: r.boost / 2, eff: r.twice.one + r.boost / 2 });
    return g35Hit(one, nm) + ` ${g62Twice(r)}`; }
  const how = r.copy ? ` copying ${gCap(r.copy.who)}'s ${r.copy.atk} with ${r.copy.via}` : '';
  const verb = r.flip ? 'averages' : 'hits for at most';
  let t;
  if (r.boost) {
    const when = [r.vsEx && 'against a Pokemon ex', r.poison && 'while it is Poisoned', r.behind && 'while you are behind on prizes',
      r.last && 'when that Supporter is the last card in your hand'].filter(Boolean).join(' and ');
    t = `${nm}${how} ${verb} ${r.eff} with ${r.bNames.join(' and ')}${when ? ' ' + when : ''} (${r.top} without), before Weakness.`;
  } else t = `${nm}${how} ${verb} ${r.top} before Weakness.`;
  if (r.ko && r.ko.length) t += ` Using it Knocks Out ${r.ko.join(' and ')}, which gives up a prize.`;
  if (r.need && !r.copy && r.atk) t += ` Its ${g62Need(r, r.name)}`;
  if (r.flip === 'mill') t += ` That is the average for cards off the top of the deck: your list runs ${r.mill.have} ${g56Many(r.mill, r.mill.have)}, so a bigger or smaller hit is down to luck.`;
  else if (r.flip === 'tails') t += ' It flips coins until tails, so a bigger hit can happen but is not something to count on.';
  else if (r.flip) t += ' That counts coin flips at their average.';
  else if (r.hand && !r.copy) t += ` It counts the cards in your hand, so ${r.top} is the app's estimate for about ${r.hand} cards${r.hand > 7 ? ", with the list's draw Abilities filling the hand" : ''}, not a printed number.`;
  else if (r.conf === 'low') t += ` Its damage depends on the board, so ${r.top} is the app's estimate, not a printed number.`;
  return t;
}
/** How many hits the format's smallest and biggest threats take at this damage. */
function g37Hits(eff, tw) {
  const [lo, hi] = FMT.threatHP;
  if (!(eff > 0)) return '';
  const a = Math.ceil(lo / eff), b = Math.ceil(hi / eff);
  // v62: with two attacks a turn the count is in turns, not hits.
  const u = tw ? 'turn' : 'hit';
  const w = n => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : n) + ' ' + u + (n === 1 ? '' : 's');
  if (a === b) return a === 1 ? (tw ? `That knocks out the format's ${lo} to ${hi} HP threats in one turn.` : `That one-shots the format's ${lo} to ${hi} HP threats.`) : `The format's ${lo} to ${hi} HP threats take ${w(a)} each.`;
  return `${lo} HP threats take ${w(a)} and ${hi} HP threats take ${w(b)}.`;
}
/**
 * v60: how many of the opponent's Pokemon one attack hits, read from the effect line the card
 * text gave it ("hits 3 of your opponent's Pokemon for 110 each", Kyurem's Trifrost). Attacks
 * that hit only the Bench, or one Pokemon, count 1. "Each" is counted as 4 Pokemon.
 */
function gMultiK(a) {
  for (const x of (a && a.fx) || []) {
    const m = String(x).match(/^(?:also )?(?:hits|puts \d+ damage counters on each of) (\d+|each) of your opponent's Pokemon/);
    if (m) return m[1] === 'each' ? 4 : +m[1];
  }
  return 1;
}
/** What one attack reaches, weighted for comparing attacks: hitting 3 Pokemon at once counts half again. */
function gVal(r, a) { const k = gMultiK(a); return (r.top || 0) * (k >= 3 ? 1.5 : k === 2 ? 1.25 : 1); }
/** What one attack reaches, following a copy attack to the attacks it can copy. */
function g37Reach(a, deck, self) {
  // A random attack off the top of the deck is not counted (the grade says so), unless the
  // list runs cards that put the card it wants there first (v60: Ciphermaniac's Codebreaking,
  // Academy at Night). Then the best attack of a Pokemon without a Rule Box counts. A bonus for
  // discarding Energy from the attacker counts only when the list runs that Energy, since the
  // Energy is on the copier, not on the card it copies.
  if (a.copy && a.copy.mill) {
    const setters = deck.filter(e => e.card && (e.card.provides || []).includes('top_set'));
    if (!setters.length) return { now: 0, top: 0, cond: null, conf: 'high', flip: null };
    const et = new Set(); deck.forEach(e => { const c = e.card; if (c && c.t === 'energy') (c.etypes && c.etypes.length ? c.etypes : [c.etype]).forEach(t => t && et.add(t)); });
    let best = null;
    deck.forEach(e => { const c = e.card;
      if (!c || c.t !== 'pkmn' || c.isEx || (c.p || 1) >= 2 || !c.attacks || c.key === (self && self.card && self.card.key)) return;
      if (c.attacks.some(x => x.copy)) return;
      c.attacks.forEach(x => { const r0 = gAtkReach(x, deck);
        const d = x.edisc;
        if (d && d.more && d.type && !et.has(d.type.replace(/^basic /, '')) && !et.has('any')) { r0.now = Math.max(0, r0.now - d.more); r0.top = Math.max(0, r0.top - d.more); }
        const r = Object.assign(r0, { conf: 'est', flip: r0.flip || x.flip || null, atk: x.name, multi: gMultiK(x), fx: x.fx || null,
          copy: { who: e.name, atk: x.name, via: a.name, top: setters.map(y => y.name) } });
        r.val = gVal(r, x);
        if (!best || r.val > best.val) best = r; }); });
    return best || { now: 0, top: 0, cond: null, conf: 'high', flip: null };
  }
  if (!a.copy) { const r0 = gAtkReach(a, deck);
    return Object.assign(r0, { conf: r0.escale || r0.pile || r0.mill ? 'est' : (a.conf || 'high'), flip: r0.flip || a.flip || null, atk: a.name, multi: gMultiK(a), fx: a.fx || null }); }
  const pre = String(a.copy.pre || '').toLowerCase();
  let best = null;
  deck.forEach(e => { const c = e.card;
    if (!c || c.t !== 'pkmn' || e === self || c.key === (self && self.card && self.card.key) || !c.attacks) return;
    if (pre && !c.key.startsWith(pre)) return;
    c.attacks.forEach(x => { if (x.copy) return;
      const r0 = gAtkReach(x, deck);
      const r = Object.assign(r0, { conf: r0.escale || r0.pile || r0.mill ? 'est' : (x.conf || 'high'), flip: r0.flip || x.flip || null, atk: x.name, multi: gMultiK(x), fx: x.fx || null, copy: { who: e.name, atk: x.name, via: a.name } });
      r.val = gVal(r, x);
      const sf = g273SrcF(deck, c); if (sf.f < 1) { r.srcF = sf.f; r.srcN = sf.n; r.val *= sf.f; }
      if (!best || r.val > best.val) best = r; }); });
  return best || { now: 0, top: 0, cond: null, conf: 'high', flip: null };
}
/**
 * 2.7.3: how much a copied attack can be counted on, from how thin the line of the Pokemon it
 * copies is. The copy only works while that Pokemon is in play, so a 1-of (or a 1-1 line) is
 * there far less often than a 2-of or more. The thinnest step of its line counts: 2 or more copies
 * is full credit, 1 is 70%. (2 copies at 85% lowered N's Zoroark, which wins 55.6% since the newest
 * set, and made grades track results worse.) Returns { f, n } with n the thinnest count.
 */
function g273SrcF(deck, c) {
  const nk = k => gtNorm(normalizeCardName(k || ''));
  const cnt = k => deck.filter(x => x.card && nk(x.card.key) === nk(k)).reduce((a, x) => a + x.qty, 0);
  let n = cnt(c.key), cur = c, g = 0;
  while (cur && cur.from && cur.stage !== 'basic' && !cur.selfBench && g++ < 3) {
    const m = cnt(cur.from); if (!m) break;
    n = Math.min(n, m);
    const nx = deck.find(x => x.card && nk(x.card.key) === nk(cur.from)); cur = nx && nx.card;
  }
  return { f: n >= 2 ? 1 : 0.7, n };
}
/**
 * v60: every attack this Pokemon can use. With an Ability like Mew ex's Memory Helix that is also
 * each attack of the other Pokemon in the list (they sit on the Bench), paid with Energy the list runs.
 * Returns [{ a, r }] with r the reach of each, marked as a copy for the borrowed ones.
 */
function gAtkOpts(e, deck, pay, ok) {
  const out = [];
  (e.card.attacks || []).forEach(a => { if (!pay(a, e.card)) return; const r = g37Reach(a, deck, e); if (r.val == null) r.val = gVal(r, a); out.push({ a, r }); });
  if (e.card.bcopy) deck.forEach(o => { const c = o.card;
    // v65: only a Pokemon that can reach the Bench can lend its attacks.
    if (!c || c.t !== 'pkmn' || c.key === e.card.key || !c.attacks || c.bcopy || (ok && !ok(c))) return;
    // The Energy sits on the copier, so it is the copier that has to be able to use it.
    c.attacks.forEach(x => { if (x.copy || !pay(x, e.card)) return;
      const r = g37Reach(x, deck, o); if (r.val == null) r.val = gVal(r, x);
      r.copy = { who: o.name, atk: x.name, via: e.card.bcopy, bench: true }; r.atk = x.name;
      const sf = g273SrcF(deck, c); if (sf.f < 1) { r.srcF = sf.f; r.srcN = sf.n; r.val *= sf.f; }
      out.push({ a: x, r }); }); });
  return out;
}
/** A Pokemon in the deck whose copy attack can use this one's attacks. */
function g37Copier(deck, c) {
  if (!c || c.t !== 'pkmn') return null;
  const ruleBox = c.isEx || (c.p || 1) >= 2;
  return deck.find(e => e.card && e.card !== c && e.card.key !== c.key && (e.card.attacks || []).some(a => a.copy &&
    (a.copy.mill ? !ruleBox : (!a.copy.pre || c.key.startsWith(String(a.copy.pre).toLowerCase())))));
}

/**
 * v53: the deck's main attacker, the Pokemon the game plan is built around.
 * 1. The name of the meta deck the cards match (2.6.1: never the player's own deck name, so renaming
 *    a deck cannot move its grade). Tournament lists are named for their attacker
 *    ("Mega Rayquaza", "Alakazam Dudunsparce"). When the name calls out
 *    Pokemon that can attack with the list's Energy, the pick is made among
 *    those only, by the weighing in 2.
 * 2. Otherwise the whole list: realistic damage times how much of the deck
 *    is spent on that Pokemon (its copies, plus half the copies of what it
 *    evolves from), doubled in step with how much of the list's typed Energy
 *    its attack cost asks for. A Pokemon that draws or searches with an
 *    attack the deck's Energy does not shape (all Colorless) counts half,
 *    since lists play those for the Ability (Mega Kangaskhan ex, Dudunsparce).
 * Returns { key, name, why: 'name' | 'list' } or null.
 */
// v54: the Mega Pokemon ex in the list that let this card put itself onto the Bench.
function gEnablers(deck, c) {
  if (!c || !c.bmega) return [];
  return deck.filter(e => e.card && e.card.t === 'pkmn' && e.card !== c && e.card.isEx && /^mega /.test(e.card.key) &&
    (c.bmega === 'any' || (e.card.types || []).some(t => String(t).toLowerCase() === c.bmega)));
}

/**
 * 3.2.8: a Pokemon in a support role: it is in the list for an engine Ability (draws, searches or
 * attaches Energy) and its own attacks are not the plan, either because they cost only Colorless
 * Energy (Mega Kangaskhan ex's Rapid-Fire Combo, Fezandipiti ex's Cruel Arrow) or because they hit for
 * under half the format's biggest threats (Metang). Its hit does not set the deck's damage ceiling and
 * it is not picked as the main attacker over a real one. A deck whose main attacker is itself such a
 * Pokemon (Kangaskhan Bouffalant) keeps it, since then the attack is the plan.
 */
/** 3.2.8: the share of a support Pokemon's harder hit that the damage ceiling counts (see gViability).
 *  3.3.1 (Muse 3.3 retest, H2): none. While the list has an attacker that is not a support Pokemon, the support
 *  Pokemon's own hit is left out of the ceiling; the finding still names it. A copier (Mew ex using its
 *  Rapid-Fire Combo) is the deck's own attack and still counts in full. */
const G_SUP_SHARE = 0;
// Muse s2 M2: how much of the games its damage does not close a deck that also mills, walls or locks closes by that.
const G_CTL_MIX = 0.5;
function gSupportMon(c, top) {
  if (!c || c.t !== 'pkmn' || !(c.ab || []).some(x => !/\bitself\b/.test(x.p || ''))) return false;
  if (!(c.provides || []).some(t => /^(draw|search(_[a-z]+)?|energy_accel)$/.test(t))) return false;
  const atks = (c.attacks || []).filter(a => (a.dmg || a.max || 0) > 0 || a.copy);
  const plain = atks.every(a => (a.cost || []).every(t => t === 'colorless'));
  return plain || (top || 0) * 2 < FMT.threatHP[1];
}
/** 3.2.8: a Basic Pokemon the list runs for an Ability that helps the rest of the team draw, search or switch
 *  (Latias ex's Skyliner, Fezandipiti ex's Flip the Script). Energy acceleration is left out on purpose,
 *  since Pokemon like Charizard ex attack as well, and so are evolved Pokemon (Alakazam draws as it evolves
 *  and still attacks). */
function gHelperMon(c) {
  return !!c && c.t === 'pkmn' && c.stage === 'basic' && (c.ab || []).some(x => !/\bitself\b/.test(x.p || ''))
    && (c.provides || []).some(t => /^(draw|search(_[a-z]+)?|switch_own)$/.test(t));
}
/** 3.3.2: a Pokemon the list runs to set up with a cheap attack: its cheapest attack does no damage and
 *  searches the deck, attaches Energy, draws or puts Pokemon from the discard pile onto the Bench, and every
 *  attack that does damage costs more (Kingdra ex's King's Order for 1 Energy, with Hydro Pump behind it).
 *  Returns that attack, or null. Like a support Pokemon, its own hit does not set the damage ceiling and it
 *  counts half when the main attacker is picked, while the deck has a main attacker that is not one itself. */
function gSetupAtk(c) {
  if (!c || c.t !== 'pkmn' || !(c.attacks || []).length) return null;
  const n = a => (a.cost || []).length;
  const hits = c.attacks.filter(a => (a.dmg || a.max || 0) > 0 || a.copy);
  const su = c.attacks.filter(a => !((a.dmg || a.max || 0) > 0) && !a.copy &&
    (a.rev || (a.fx || []).some(x => /^(?:searches your deck|attaches|draws|evolves a Pokemon|looks at the top)\b/.test(x))));
  if (!hits.length || !su.length) return null;
  const cheap = su.reduce((b, a) => !b || n(a) < n(b) ? a : b, null);
  return n(cheap) < Math.min(...hits.map(n)) ? cheap : null;
}
/** 3.2.8: how much the list commits to a Pokemon: every copy of it and of the same stage that evolves
 *  from the same Pokemon (3 Flygon and 2 Flygon ex are one line; a drawing Dudunsparce is not part of
 *  the Dudunsparce ex line), plus the earlier stages, which count half and at most two per copy
 *  (4 Metang for 1 Metagross are there for Metal Maker). */
function gLineWeight(deck, c, extra) {
  const qtyOf = k => deck.filter(e => e.card && e.card.key === k).reduce((n, e) => n + e.qty, 0);
  const sib = c.from ? deck.filter(e => e.card && e.card.t === 'pkmn' && e.card.from === c.from && e.card.stage === c.stage
    && (e.card.key === c.key || !gSupportMon(e.card))).reduce((n, e) => n + e.qty, 0) : qtyOf(c.key);
  const pre1 = c.from ? qtyOf(c.from) : 0;
  const pre2 = c.from ? deck.filter(x => x.card && x.card.key === c.from && x.card.from).reduce((n, x) => n + qtyOf(x.card.from), 0) : 0;
  return sib + 0.5 * Math.min(pre1 + pre2 + (extra || 0), 2 * sib);
}
function gMainAttacker(deck, coh, deckName) {
  const et = coh.energyTypes || {};
  const pay = a => (a.cost || []).every(ty => ty === 'colorless' || et[ty] || et.any);
  const reachOf = e => { let best = null;
    gAtkOpts(e, deck, pay).forEach(({ a, r }) => {
      if (r.top > 0 || (a.copy && a.copy.mill)) { if (!best || r.val > best.r.val) best = { r, a }; } });
    return best; };
  // v54: a Pokemon whose Ability does damage and Knocks it Out (Dusknoir's Cursed Blast)
  // is played for the Ability, not to attack.
  const mons = deck.filter(e => e.card && e.card.t === 'pkmn' && e.card.attacks && !(e.card.abDmg || []).some(x => x.selfKO));
  const nk = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const dn = ' ' + nk(deckName) + ' ';
  // Every Pokemon the name calls out, by full name, without ex or Mega, or by species alone.
  const named = dn.trim() ? mons.filter(e => {
    const full = nk(e.name), bare = full.replace(/ ex$/, ''), noMega = bare.replace(/^mega /, '');
    return [full, bare, noMega, noMega.split(' ').pop()].some(v => v && dn.includes(' ' + v + ' '));
  }) : [];
  // v59: a name that calls out a Basic ("Riolu") means its line, so what evolves from it counts as named too.
  for (let i = 0; i < 2; i++) {
    const keys = new Set(named.map(e => e.card.key));
    mons.forEach(e => { if (e.card.from && keys.has(e.card.from) && !named.includes(e)) named.push(e); });
  }
  const typedTotal = Object.keys(et).filter(k => k !== 'any' && k !== 'colorless').reduce((n, k) => n + et[k], 0);
  const qtyOf = k => deck.filter(e => e.card && e.card.key === k).reduce((n, e) => n + e.qty, 0);
  const enablersOf = c => gEnablers(deck, c);
  const pickFrom = list => {
    let best = null;
    list.forEach(e => {
      const b = reachOf(e); if (!b) return;
      const c = e.card;
      // v54: a line that runs more of the earlier stages than two per copy is playing them
      // for their own Abilities (4 Metang for 1 Metagross), so the extra copies do not count.
      // v54: Mega Pokemon ex that let it onto the Bench (Talonflame ex's Excited Dive) count the same way,
      // since the list runs them to put it into play.
      // 3.2.8: the whole line counts (gLineWeight), so 3 Palafin ex, 2 Palafin and 1 more Palafin are one
      // plan, not three small ones.
      const en = enablersOf(c).reduce((n, x) => n + x.qty, 0);
      const weight = gLineWeight(deck, c, en);
      const typed = [...new Set((b.a.cost || []).filter(t => t !== 'colorless'))];
      const share = typedTotal ? Math.min(1, typed.reduce((n, t) => n + (et[t] || 0), 0) / typedTotal) : 0;
      // v60: only an Ability counts here. Since v60 attacks add search tags too (Talonflame ex's Talon Hunt),
      // and an attacker that searches with its attack is still the attacker.
      // 3.2.8: and a Pokemon in a support role (gSupportMon) counts half the same way.
      const support = (!typed.length && (c.ab || []).some(x => /\b(?:draws?|search(?:es)?|looks at the top)\b/.test(x.p || ''))) || gSupportMon(c, b.r.top) || gSetupAtk(c) ? 0.5 : 1;
      // A named attacker whose damage the grade cannot count (Slowking's Seek Inspiration) still counts as one.
      // v62: its own Ability's boost counts too (Okidogi's Adrena-Power with Darkness Energy).
      const sb = c.sboost && deck.some(x => x.card && x.card.t === 'energy' && (x.card.etypes || []).some(y => y === c.sboost.type || y === 'any')) ? c.sboost.n : 0;
      // 3.2.8: the list's commitment leads and damage past a two-hit Knock Out on the biggest threats
      // counts a quarter, so a thick line that hits for 130 (Flygon) is the plan over a 2-copy
      // Mamoswine ex that hits for 300, while a real one-shot attacker still beats a weak hitter.
      const T = FMT.threatHP[1] / 2, d = Math.max(b.r.top + sb, 1), dmg = d <= T ? d : T + 0.25 * (d - T);
      const score = weight * dmg * (1 + share) * support;
      if (!best || score > best.score) best = { score, e, weight: weight * support };
    });
    return best;
  };
  const byName = pickFrom(named);
  if (byName) {
    // v60: a deck named for its engine (Toxtricity Box, Tera Box (Noctowl), Joltik Box): when every
    // named Pokemon is played for an Ability and hits for under half the format's smallest threat,
    // and 2 or more other Pokemon in the list each reach a two-hit Knock Out on the biggest ones,
    // those attackers are the plan and the named Pokemon is the engine behind them.
    const nb = reachOf(byName.e), lo = FMT.threatHP[0], hi = FMT.threatHP[1];
    const weak = named.every(e => { const b = reachOf(e); return !b || b.r.top * 2 < lo; });
    // v61: an engine can work through an attack too (Joltik's Jolting Charge attaches Energy from the deck).
    const engAtk = e => (e.card.attacks || []).find(a => (a.fx || []).some(x => /^(?:searches|attaches|draws)\b/.test(x)));
    const eng = named.find(e => (e.card.ab || []).length) || named.find(engAtk);
    if (weak && eng && nb) {
      const others = mons.filter(e => !named.includes(e) && (b => b && b.r.top * 2 >= hi)(reachOf(e)));
      if (new Set(others.map(e => e.card.key)).size >= 2) {
        const best = pickFrom(others);
        const ea = (eng.card.ab || []).length ? null : engAtk(eng);
        const engine = ea ? { name: eng.name, abil: ea.name, p: ea.fx.find(x => /^(?:searches|attaches|draws)\b/.test(x)), atk: true } : { name: eng.name, abil: eng.card.ab[0].abil, p: eng.card.ab[0].p };
        if (best) return { key: best.e.card.key, name: best.e.name, why: 'list', named: String(deckName), engine };
      }
    }
    return { key: byName.e.card.key, name: byName.e.name, why: 'name', named: String(deckName), among: new Set(named.map(e => e.card.key)).size };
  }
  // 3.2.8: a support Pokemon (Latias ex for Skyliner, Fezandipiti ex for draws) is never the main card
  // while the list has any other Pokemon that attacks. A control deck that attacks with nothing else has
  // no main attacker, so the grade does not frame it around a support Pokemon.
  const hitters = mons.filter(e => { const b = reachOf(e); return b && b.r.top > 0; });
  const side = e => gHelperMon(e.card) || gSupportMon(e.card, reachOf(e).r.top);
  const real = hitters.filter(e => !side(e));
  if (!real.length && hitters.length) return null;
  const best = pickFrom(real);
  return best ? { key: best.e.card.key, name: best.e.name, why: 'list' } : null;
}

/**
 * v63: control decks (lock, mill and stall) win by stopping the opponent, not by trading knockouts.
 * Reads the pieces ctl63 found in card text (Abilities, attacks and Trainer rules) and weighs each one:
 *   how much it stops (an Item lock more than a Tool lock), how often it is on (an Ability on the
 *   Pokemon that sits Active, an attack the deck uses every turn, a coin flip half the time) and
 *   how many copies the list runs. The deck counts as control only when its lock, mill and wall
 *   pieces together reach 0.35, so one tech card in an attacking deck changes nothing.
 * Returns null for a deck that is not control.
 */
function gControl(deck, coh, main) {
  const mk = main ? main.key : null;
  const pay = a => (a.cost || []).every(ty => ty === 'colorless' || coh.energyTypes[ty] || coh.energyTypes.any);
  const byKey = new Map();
  deck.forEach(e => { const c = e.card; if (!c) return;
    const x = byKey.get(c.key) || { e, qty: 0 }; x.qty += e.qty; byKey.set(c.key, x); });
  const LOCK = { item: 0.55, supporter: 0.5, tool: 0.05, stadium: 0.05, retreat: 0.05 };
  const ABIL = { rulebox: 0.45, all: 0.45, evolution: 0.3, basic: 0.25, colorless: 0.15, active: 0.15 };
  const WALL = { ex: 0.4, basicex: 0.25, ability: 0.2, big: 0.2, low: 0.3, nonrule: 0.3, all: 0.3, basic: 0.2, bench: 0.03 };
  const cat = p => p.k === 'mill' ? 'mill' : p.k === 'wall' || p.k === 'heal' ? 'stall' : p.k === 'energy' || p.k === 'hand' ? 'denial' : 'lock';
  const out = [], perCopy = {};
  byKey.forEach(({ e, qty }, key) => { const c = e.card;
    const isMain = key === mk, cf = Math.min(1, qty / 3) * (c.t === 'pkmn' && c.stage === 'stage2' ? 0.85 : 1);
    let atkCost = 9;
    const add = (p, how, src, atk) => {
      // Trainers that do a little each time they are played (Crushing Hammer, Judge, a heal) count per copy.
      if (p.k === 'energy' || p.k === 'hand' || (p.k === 'heal' && p.when === 'now')) {
        if (c.t === 'trainer') { const k = p.k; const per = k === 'energy' ? 0.06 : 0.04;
          perCopy[k] = perCopy[k] || { v: 0, who: [] };
          perCopy[k].v += per * qty * (p.flip ? 0.5 : 1); perCopy[k].who.push({ name: e.name, qty, p, src }); return; }
      }
      let v = p.k === 'ability' ? ABIL[p.sc] || 0 : p.k === 'attack' ? (p.sc === 'low' ? 0.35 : 0.45)
        : p.k === 'mill' ? Math.min(0.5, 0.15 * (p.n || 1)) : p.k === 'wall' ? WALL[p.sc] || 0
        : p.k === 'energy' ? 0.3 : p.k === 'heal' ? 0.15 : p.k === 'hand' ? 0.1 : LOCK[p.k] || 0;
      if (!v) return;
      let m = 1;
      // A free or 1 Energy attack on a Basic (Budew's Itchy Pollen) can be used every turn from the first, main attacker or not.
      if (src === 'attack') m = isMain ? 0.85 : c.t === 'pkmn' && c.stage === 'basic' && atkCost <= 1 ? 0.75 : 0.4;
      else if (src === 'ability') m = p.k === 'wall' && !p.team ? (isMain ? 1 : 0.5) : p.when === 'active' ? (isMain ? 1 : 0.8) : 1;
      if (p.flip) m *= 0.5;
      if (p.when === 'once') m *= 0.2;
      const copies = c.t === 'trainer' && c.ace ? 0.6 : cf;
      out.push({ name: e.name, key, qty, p, v: v * m * copies, raw: v, src, how, atk, cat: cat(p), main: isMain });
    };
    const seen = new Set();
    (c.ctl || []).forEach(p => { const id = JSON.stringify([p.k, p.sc, p.when, p.via]); if (seen.has(id)) return; seen.add(id);
      add(p, p.via, p.src === 'ability' ? 'ability' : 'trainer', null); });
    (c.attacks || []).forEach(a => { if (!pay(a)) return; atkCost = (a.cost || []).length; (a.ctl || []).forEach(p => add(p, a.name, 'attack', a.name)); });
  });
  Object.entries(perCopy).forEach(([k, x]) => {
    const cap = k === 'energy' ? 0.3 : k === 'hand' ? 0.25 : 0.2;
    out.push({ name: x.who.map(w => w.name).join(', '), who: x.who, key: null, qty: x.who.reduce((n, w) => n + w.qty, 0),
      p: { k }, v: Math.min(cap, x.v), raw: cap, src: 'trainer', cat: cat({ k, when: 'now' }) });
  });
  const comb = l => 1 - l.reduce((a, x) => a * (1 - Math.min(0.95, x.v)), 1);
  // Muse s1/s2: heals count toward stall when the list also walls (Cornerstone Mask Ogerpon ex with
  // Shuckle and Pokemon Center Lady), and a full hammer suite (energy denial at its cap, about 6
  // Hammers) counts as control at three quarters, so Hammer Control is graded on what it stops.
  const wall = out.some(x => x.p.k === 'wall' && x.v >= 0.15);
  const ham = out.some(x => x.p.k === 'energy' && !x.key && x.v >= 0.24);
  const core = comb(out.filter(x => (x.cat !== 'denial' || ham) && !(x.cat === 'stall' && x.p.k === 'heal' && !wall))
    .map(x => x.cat === 'denial' ? Object.assign({}, x, { v: x.v * 0.75 }) : x));
  if (core < 0.35) return null;
  const P = comb(out);
  const by = {}; out.forEach(x => { by[x.cat] = comb(out.filter(y => y.cat === x.cat)); });
  const kinds = ['lock', 'mill', 'stall', 'denial'].filter(k => (by[k] || 0) >= 0.25 && (k !== 'denial' || ham)).sort((a, b) => by[b] - by[a]);
  if (!kinds.length) kinds.push(['lock', 'mill', 'stall'].sort((a, b) => (by[b] || 0) - (by[a] || 0))[0]);
  return { pieces: out.sort((a, b) => b.v - a.v), core, P, by, kinds, close: 0.45 + 0.4 * P };
}

/** v63: one control piece in plain words, from what ctl63 read off the card. */
function gCtlSay(x, lead) {
  const p = x.p, opp = "your opponent";
  if (x.who) {
    const w = x.who.map(y => `${y.qty} ${gCap(y.name)}`).join(', ') + (lead ? ', which' : '');
    return p.k === 'energy' ? `${w} discard Energy from ${opp}'s Pokemon${x.who.every(y => y.p.flip) ? ' on a coin flip' : ''}`
      : p.k === 'hand' ? `${w} cut down ${opp}'s hand` : `${w} heal your Pokemon`;
  }
  const by = x.src === 'attack' ? `${gCap(x.name)}'s ${x.atk}` : x.src === 'ability' ? `${gCap(x.name)}'s ${x.how}` : gCap(x.name);
  const when = p.when === 'active' ? ' while it is in the Active Spot' : p.when === 'next' ? ` during their next turn` : p.when === 'once' ? ' on your first turn' : '';
  const flip = p.flip ? ' (on a coin flip)' : '';
  let t;
  if (p.k === 'item' || p.k === 'supporter' || p.k === 'tool' || p.k === 'stadium') t = `${opp} can't play ${p.k === 'item' ? 'Item' : p.k === 'supporter' ? 'Supporter' : p.k === 'tool' ? 'Pokemon Tool' : 'Stadium'} cards`;
  else if (p.k === 'ability') t = ({ rulebox: 'Pokemon with a Rule Box have no Abilities', all: "Pokemon in play have no Abilities", evolution: 'Evolution Pokemon have no Abilities',
    basic: 'Basic Pokemon have no Abilities', colorless: 'Colorless Pokemon have no Abilities', active: "the Active Pokemon has no Abilities" })[p.sc];
  else if (p.k === 'attack') t = p.sc === 'low' ? `Pokemon with ${p.n || 'a few'} or less Energy attached can't attack` : "the Defending Pokemon can't attack";
  else if (p.k === 'retreat') t = "the Defending Pokemon can't retreat";
  else if (p.k === 'mill') t = `discards the top ${p.n === 1 ? 'card' : p.n + ' cards'} of ${opp}'s deck`;
  else if (p.k === 'energy') t = `discards ${p.special ? 'Special ' : ''}Energy from ${opp}'s Pokemon`;
  else if (p.k === 'hand') t = `cuts down ${opp}'s hand`;
  else if (p.k === 'heal') t = `heals ${p.n >= 200 ? 'all' : p.n} damage`;
  else if (p.k === 'wall') { const who = p.team ? (p.sc === 'nonrule' ? 'Pokemon without a Rule Box take' : p.sc === 'bench' ? 'your Benched Pokemon take' : 'your Pokemon take') : 'it takes';
    t = ({ ex: `${who} no damage from attacks by Pokemon ex`, basicex: `${who} no damage from attacks by Basic Pokemon ex`, nonrule: `${who} no damage from attacks by Pokemon ex`,
      ability: `${who} no damage from attacks by Pokemon with an Ability`, big: `${who} no damage from an attack that does ${p.n || 'a lot'} or more`,
      low: `${who} no damage from Pokemon with ${p.n || 'a few'} or less Energy attached`, basic: `${who} no damage from attacks by Basic Pokemon`,
      bench: 'your Benched Pokemon take no damage from attacks', all: `${who} no damage from attacks` })[p.sc] || `${who} less damage`; }
  // lead: the piece inside a sentence ("The biggest piece is X's Attack, which discards...").
  return t ? `${by}${lead ? (/^(?:discards|cuts|heals)\b/.test(t) ? ', which ' : ', where ') : ': '}${t}${when}${flip}` : '';
}

function gViability(deck, coh, main) {
  // v65: a Pokemon counts as an attacker only when it can reach the board: every Pokemon it evolves
  // from is in the list (Rare Candy may skip the middle of a Stage 2), or it puts itself in play.
  const gk=k=>gtNorm(normalizeCardName(k||''));
  // Muse section 4 S2: card data read from another printing (byName) no longer counts as playable by itself.
  // Every printing of a Pokemon evolves from the same Pokemon, so its line is checked like any other, and a
  // Stage 2 with no way onto the board stops adding to Power.
  const canPlay=(c,g=0)=>{ if(!c.from||c.stage==='basic'||c.selfBench||(g===0&&c.setupPut)||g>3) return true;
    const mid=deck.find(x=>x.card&&gk(x.card.key)===gk(c.from));
    if (mid) return canPlay(mid.card,g+1);
    if (c.isEx&&deck.some(x=>x.card&&x.card.standIn&&gk(x.card.standIn)===gk(c.from))) return true;
    // With the Stage 1 missing, Rare Candy has to carry the whole line, so it takes 2 or more.
    return c.stage==='stage2'&&(coh.provided['evolution_access']||0)>=2&&(b=>!b||deck.some(x=>x.card&&gk(x.card.key)===gk(b)))(g116Base(deck,c)); };
  const attackers=deck.filter(e=>e.card&&e.card.attacks&&canPlay(e.card)), findings=[];
  // v65: and an attack counts only when the list runs as many Energy of each type as it asks for
  // (2 Grass in the cost needs 2 or more Grass Energy cards, not just one).
  // A Special Energy that works only on some Pokemon ("if this card is attached to a Basic Pokemon",
  // "can only be attached to a Team Rocket's Pokemon") counts only for those.
  const stg={'basic':'basic','stage 1':'stage1','stage 2':'stage2'};
  const fits=(ec,c)=>{ const m=gtNorm(ec.et||'').match(/(?:only be attached to|if this card is attached to) an? ([a-z0-9' ]+?) pokemon/);
    if (!m||!c) return true; const x=m[1].trim();
    return stg[x] ? String(c.stage||'').toLowerCase().replace(/\s+/g,'')===stg[x] : gtNorm(c.key||'').startsWith(x); };
  const EN=deck.filter(x=>x.card&&x.card.t==='energy');
  // 3.2.8: and the list runs enough Energy cards in all to cover the whole cost, Colorless included
  // (a Special Energy may count for two), so a list with no Energy has no paid attack.
  const eUnits=EN.reduce((n,x)=>n+x.qty*((x.card.sub||[]).some(s=>/special/i.test(s))?2:1),0);
  const pay=(a,who)=>{ const need={}; (a.cost||[]).forEach(ty=>{ if(ty!=='colorless') need[ty]=(need[ty]||0)+1; });
    if ((a.cost||[]).length>eUnits) return false;
    return Object.keys(need).every(ty=>EN.reduce((n,x)=>{ const ts=x.card.etypes&&x.card.etypes.length?x.card.etypes:[x.card.etype];
      return n+((ts.includes(ty)||ts.includes('any'))&&fits(x.card,who)?x.qty:0); },0)>=need[ty]); };
  // Best payable hit per attacker: its ceiling, and what it does early.
  const reach=[];
  attackers.forEach(e => { let r0=null;
    // v60: compared by gVal, so an attack that hits 3 Pokemon at once can win over a slightly bigger single hit.
    gAtkOpts(e, deck, pay, c => canPlay(c)).forEach(({ r }) => {
      if (!r0 || r.val>r0.val || (r.val===r0.val && r.now>r0.now)) r0=r; });
    // v62: attacking twice a turn doubles what it does to the Active, when the list runs the Stadium it needs (2 or more).
    const t2 = e.card.atk2, t2n = t2 && t2.stadium ? deck.filter(x => x.card && x.card.key === t2.stadium.toLowerCase()).reduce((n, x) => n + x.qty, 0) : 0;
    if (r0 && r0.top > 0 && t2 && (!t2.stadium || t2n >= 2)) r0 = Object.assign({}, r0, { now: r0.now * 2, top: r0.top * 2, twice: { abil: t2.abil, stadium: t2.stadium, one: r0.top } });
    if (r0 && r0.top>0) { const b=g35Boost(deck, e.card);
      // v62: a booster for the turn or a Tool counts on each of the two attacks.
      if (r0.twice) b.n *= 2;
      // 2.7.3: in a deck built around copying attacks (its main attacker is Mew ex, with Memory Helix), a thin
      // line is there as something to copy, and attacking with it directly is just as thin, so its own hit is
      // counted the same way.
      if (!r0.srcF && main && main.key !== e.card.key && deck.some(x => x.card && x.card.bcopy && x.card.key === main.key)) { const sf=g273SrcF(deck, e.card); if (sf.f<1) r0=Object.assign({}, r0, { srcF: sf.f, srcN: sf.n, thinSelf: true }); }
      reach.push({ name:e.name, qty:e.qty, p:e.card.p||1, ...r0, boost:b.n, bNames:b.names, vsEx:b.vsEx, behind:b.behind, poison:b.poison, last:b.last, ko:b.ko, eff:r0.top+b.n }); } });
  // 3.2.8: a main attacker whose every attack costs more Energy than the list runs in all.
  const mainK = main && (deck.find(x=>x.card&&x.card.key===main.key)||{}).card;
  const eQv = EN.reduce((n,x)=>n+x.qty,0);
  if (mainK && eQv > 1 && (mainK.attacks||[]).length && mainK.attacks.every(a=>(a.cost||[]).length>eUnits)) {
    const least = Math.min(...mainK.attacks.map(a=>(a.cost||[]).length));
    findings.push({sev:'warn', t:'Too little Energy for the main attacker',
      d:`${gCap(main.name)}'s cheapest attack needs ${least} Energy, but the list runs only ${eQv} Energy cards, so it can never attack. Add Energy or pick another main attacker.`}); }
  // 2.7.3: a copied hit from a thin line is compared at what the grade counts of it.
  const effC = r => r.eff * (r.srcF || 1);
  // 3.2.8: a Pokemon in a support role (gSupportMon: Mega Kangaskhan ex drawing, Fezandipiti ex) does not set
  // the damage ceiling when the deck has a main attacker that is not one itself. A copied attack (Mew ex
  // using Rapid-Fire Combo through Memory Helix) is the copier's own hit and still counts.
  const cardOf = r => (deck.find(e => e.card && e.name === r.name) || {}).card;
  const mainCard = main ? (deck.find(e => e.card && e.card.key === main.key) || {}).card : null;
  const mainRr = main ? reach.find(r => r.name.toLowerCase() === main.key) : null;
  // A side piece counts as support only while the list runs it thin: a support Pokemon on a line of 3 or
  // less (gLineWeight), or a Basic run 1 or 2 deep for an engine or switching Ability (Latias ex's Skyliner).
  // 4 Mega Kangaskhan ex in Crustle are a second attacker as much as a draw engine, so they still count.
  // An Ability that only helps the Pokemon itself (Bloodmoon Ursaluna attaching to itself) is not an engine.
  const sideEng = c => !!c && (c.ab || []).some(x => !/\bitself\b/.test(x.p || '')) && (c.provides || []).some(t => /^(draw|search(_[a-z]+)?|energy_accel|switch_own)$/.test(t));
  // A box (Basic Box: four or more other Pokemon that each hit for half the biggest threats) attacks
  // with whatever fits, so nothing there is left out.
  const sidePre = r => { const c = cardOf(r); return !!c && (gSupportMon(c, r.top) || sideEng(c)); };
  const boxy = reach.filter(r => !sidePre(r) && effC(r) * 2 >= FMT.threatHP[1]).length >= 4;
  const sideSup = r => { const c = cardOf(r);
    if (boxy) return false;
    if (!(main && mainCard && mainRr && c && r !== mainRr && !gSupportMon(mainCard, mainRr.top))) return false;
    const lw = gLineWeight(deck, c);
    // 3.3.2: a setup piece (gSetupAtk) counts as one while the list commits no more to it than to the main attacker.
    if (gSetupAtk(c) && !gSetupAtk(mainCard) && lw <= Math.max(c.stage === 'basic' ? 4 : 3, gLineWeight(deck, mainCard))) return true;
    return ((gSupportMon(c, r.top) || gHelperMon(c)) && lw <= (c.stage === 'basic' ? 4 : 3)) || (sideEng(c) && lw <= 2); };
  const plan = reach.some(r => !sideSup(r)) ? reach.filter(r => !sideSup(r)) : reach;
  let bestR=null; plan.forEach(r => { if (!bestR || effC(r)>effC(bestR) || (effC(r)===effC(bestR) && r.top>bestR.top)) bestR=r; });
  // v53: the main attacker leads when it hits at least as hard. When something
  // else hits harder, the finding says which is which.
  const mainR = main ? reach.find(r => r.name.toLowerCase() === main.key) : null;
  if (mainR && bestR && effC(mainR) >= effC(bestR)) bestR = mainR;
  const lead = main && bestR && bestR !== mainR && main.key !== bestR.name.toLowerCase()
    // Muse section 4 L3: say why it is the main attacker, so a 4 copy Shelgon line is not read as the hardest hitter.
    ? `${gCap(main.name)} is ${main.why === 'pick' ? 'the main attacker you set' : "this deck's main attacker" + (main.why === 'list' ? ', since the list plays the most of its line' : main.why === 'name' ? ', since the deck is named for it' : '')}, but the hardest hit the grade can count comes from another Pokemon. ` : '';
  const hitsTxt = bestR && ((bestR.escale && bestR.escale.scope !== 'both') || (bestR.kox && !bestR.copy)) ? '' : ' ' + g37Hits(bestR ? bestR.eff : 0, !!(bestR && bestR.twice));
  const best=bestR?bestR.top:0, bestName=bestR?bestR.name:'';
  // v65: the spread engine counts only from cards that can reach the board.
  const prov=k=>deck.some(e=>e.card&&canPlay(e.card)&&(e.card.provides||[]).includes(k));
  const spreadEngine = coh.provided['spread_counters']>0 && coh.provided['move_counters']>0 && prov('spread_counters') && prov('move_counters');
  const boost = bestR ? bestR.boost : 0;
  const [lo, hi] = FMT.threatHP;
  let eff=best+boost, closeScore, strat;
  // v68: the hit the grade counts is the one a list can lean on by mid game. A hit that grows
  // (Energy or discard pile scaling) counts halfway between its early and full numbers, and
  // boosts from other cards (a Tool, a Supporter, a partner's Ability) count at half, since a
  // game rarely lines them all up. The full ceiling still shows in the text.
  // 2.7.3: a copied hit counts only as often as the Pokemon it copies is in play (g273SrcF).
  const ceOf = r => !r ? 0 : Math.round((((r.cond || (r.escale && r.top > r.now)) ? (r.now + r.top) / 2 : r.top) + (r.boost || 0) / 2) * (r.srcF || 1));
  const ce = ceOf(bestR);
  const thinTxt = r => r.thinSelf ? `the list runs only ${r.srcN === 1 ? '1 copy of' : r.srcN + ' copies of'} ${gCap(r.name)}${r.srcN === 1 ? '' : ' or its line'}, so it is not always in play`
    : `${r.srcN === 1 ? 'there is only 1' : 'there are only ' + r.srcN} ${gCap(r.copy.who)}${r.srcN === 1 ? '' : ' or its line'} to copy from, so it is not always in play`;
  const ceTxt = bestR && ce < eff ? (bestR.srcF && !bestR.boost && !bestR.cond && !bestR.escale ? ` The grade counts ${ce}, since ${thinTxt(bestR)}.`
    : ` The grade counts ${ce}, since the full hit needs ${bestR.boost && bestR.bNames && bestR.bNames.length ? bestR.bNames.join(' and ') : 'time to grow'}${bestR.boost && (bestR.cond || bestR.escale) ? ' and time to grow' : ''}${bestR.srcF ? ' and ' + thinTxt(bestR) : ''}.`) : '';
  const condTxt = r => `you have ${r.cond.n} ${r.cond.what} in your discard pile`;
  // 3.2.8: a support Pokemon left out of the ceiling can still attack in a pinch, so a harder hit of its
  // own counts for part of the gap (G_SUP_SHARE; 0 leaves it out, 1 counts it in full as before).
  let supR = null; reach.forEach(r => { if (r !== bestR && sideSup(r) && (!supR || effC(r) > effC(supR))) supR = r; });
  const ceS = supR && bestR && ceOf(supR) > ce ? Math.round(ce + G_SUP_SHARE * (ceOf(supR) - ce)) : ce;
  // 3.3.1: with G_SUP_SHARE 0 the support Pokemon's hit is named and left out; any share above 0 counts part of it.
  // 3.3.2: a setup piece names the attack the list plays it for.
  const supWhy = r => { const a = gSetupAtk(cardOf(r)); return a ? `the list plays it to set up with ${a.name}` : 'it is in the list for its Ability'; };
  const supTxt = ceS > ce ? ` ${gCap(supR.name)} can also hit for ${ceOf(supR)}, but ${supWhy(supR)}, so the grade counts ${ceS}.${ceS >= FMT.ohkoTarget ? '' : ' ' + g37Hits(ceS, false)}` : '';
  const supOut = !supTxt && supR && bestR && ceOf(supR) > ce ? ` ${gCap(supR.name)} can also hit for ${ceOf(supR)}, but ${supWhy(supR)}, so the grade leaves that hit out.` : '';
  const hitsT = supTxt ? '' : hitsTxt;
  // 3.2.8: under a one-shot, the hit count follows what the grade counts, after the reason it counts less,
  // so a "Two hits" finding never says the deck one-shots.
  // A Pokemon that attacks twice a turn (Festival Lead) keeps the full count: its two hits land in one turn,
  // which is what the "Two hits" heading means, so that sentence stays where it was, before the counted hit.
  const twC = !!(bestR && bestR.twice);
  const hitsP = twC && !supTxt ? hitsTxt : '';
  const hitsC = twC || supTxt || !hitsTxt ? '' : ' ' + g37Hits(ce, false);
  if (best===0) { closeScore=0.12; findings.push({sev:'crit', t:'Nothing can reliably attack',
    d:'None of your attackers have the energy they need, so damage output is basically zero.'}); }
  else if (spreadEngine) { strat='spread'; eff=Math.round(best*1.5)+boost; closeScore=0.9;
    findings.push({sev:'ok', t:'Closes through spread, not one big hit',
    d:`This deck wins on spread math: ${gCap(bestName)} chips the whole board and your counter-movers concentrate it. The single-hit number (${best}) undersells its reach against ${lo} to ${hi} HP threats.`}); }
  // v55: a one-shot that needs a full discard pile (Ceruledge ex) comes late, so it counts for less.
  // v68: a one-shot on the format's biggest threats (340) is full marks; one that stops short of them a bit less.
  else if (ceS>=FMT.ohkoTarget) { strat='ohko'; closeScore=(bestR&&bestR.late?0.85:1)*(ceS>=hi?1:0.95);
    findings.push({sev:'ok', t:'Hits hard enough to trade up',
    d:`${lead}${g35Hit(bestR)}${hitsT}${supTxt}${supOut}`}); }
  else if (ceS*2>=hi) { strat='2hko';
    // Linear between a bare two-hit knockout (170) and a one-shot (320).
    closeScore=0.6+0.3*(ceS-hi/2)/(FMT.ohkoTarget-hi/2);
    // 3.2.8: only a one-prize Pokemon that attacks counts, not an engine (Metagross for Metal Maker).
    // 3.2.8 (Muse L3): the main attacker is named first, so a Cinccino deck is not summed up by its Metagross.
    const one=[...new Set(reach.filter(r=>r.p===1 && r.eff*2>=hi && (r===bestR || r===mainR || !sidePre(r))).sort((a,b)=>(b===mainR)-(a===mainR)).map(r=>gCap(r.name)))];
    if (one.length) closeScore+=0.06;
    // Muse section 4 L1: the closing sentence names only the Pokemon this finding is about (the hardest hitter
    // or the main attacker) when it gives up one prize, or no Pokemon at all, so a Greninja deck is never
    // summed up by its Frogadier. The score above still counts every one-prize attacker, as before.
    const oneT=[...new Set([mainR, bestR].filter(r=>r && r.p===1 && r.eff*2>=hi).map(r=>gCap(r.name)))];
    findings.push({sev:'warn', t:'Two hits for the biggest threats',
    d:`${lead}${g35Hit(bestR)}${hitsP}${ceTxt}${hitsC}${supTxt}${supOut}${oneT.length?` ${oneT.join(' and ')} ${oneT.length>1?'give':'gives'} up one prize per knockout, so needing two hits for a two-prize threat still keeps the prize race even.`:' Fine if you can take the return hit.'}`}); }
  else { strat='weak'; closeScore=0.15+0.45*ceS/(hi/2);
    findings.push({sev:'crit', t:'Damage ceiling is too low',
    d:`${lead}${g35Hit(bestR)}${hitsP}${ceTxt}${hitsC}${supTxt}${supOut} You cannot trade up, which usually loses the prize race.`}); }
  if (bestR && bestR.escale && bestR.top > bestR.now) { const e = bestR.escale;
    const what = e.x2 ? `Basic ${gCap(e.x2.type)} Energy cards` : (e.types.length ? e.types.map(gCap).join(' and ') + ' ' : '') + 'Energy';
    findings.push({sev:'ok', t:`${gCap(bestName)} grows into its damage`,
    d:`${gCap(bestName)} hits for ${bestR.now} with ${e.n} ${what} attached and ${bestR.top} once ${e.nTop} are in play. Your list runs ${e.have}, so the full hit is a mid game plan, not a turn 2 one.`}); }
  if (bestR && bestR.cond) findings.push({sev:'ok', t:`${gCap(bestName)} grows into its damage`,
    d:`${gCap(bestName)} hits for ${bestR.now} ${bestR.sc ? `with 2 ${g56Many(bestR.pile, 2)} ${bestR.sc.where} and ${bestR.top} once you have ${bestR.cond.n}` : `early and ${bestR.top} once ${condTxt(bestR)}`}. ${bestR.sc && bestR.sc.where !== 'in your discard pile' ? `Your list can have ${bestR.have} there at once` : `Your list has ${bestR.have} of those cards`}, so the full hit is a ${bestR.late ? 'late game plan that needs a lot of them in the pile' : 'mid game plan, not a turn 2 one'}.`});
  // Abilities that stop attack effects or damage make the deck hard to disrupt.
  const prot=deck.filter(e=>e.card&&e.card.protect);
  const protN=prot.reduce((a,e)=>a+e.qty,0);
  if (protN>=8) { closeScore+=0.05;
    const kinds=new Set(prot.flatMap(e=>e.card.pk&&e.card.pk.length?e.card.pk:[null]));
    const who=prot.slice(0,3).map(e=>gCap(e.name)).join(', ');
    findings.push({sev:'ok', t:'Hard to disrupt',
    d: kinds.size===1&&kinds.has('effects')
      ? `${protN} of your Pokemon have Abilities that block the effects of your opponent's attacks or Abilities (${who}). Damage still goes through, so this stops lock and disruption, not knockouts.`
      : kinds.size===1&&kinds.has('damage')
      ? `${protN} of your Pokemon have Abilities that prevent damage from some of your opponent's attacks (${who}). Read each card for when it applies.`
      : `${protN} of your Pokemon have Abilities that block damage or effects from some of your opponent's attacks (${who}). Read each card for when it applies.`}); }
  // v54: a main attacker that takes no damage from Pokemon ex attacks (Crustle's Mysterious Rock Inn).
  const mainC = main ? deck.find(e=>e.card&&e.card.key===main.key) : null;
  // 2.6.2: a main attacker the player set counts here only with 2 or more copies, so naming a single tech copy is not a free bonus.
  if (mainC && (mainC.card.pex||[]).length && (main.why!=='pick' || deck.filter(x=>x.card&&x.card.key===main.key).reduce((n,x)=>n+x.qty,0)>=2)) { closeScore+=0.1;
    findings.push({sev:'ok', t:`${gCap(mainC.name)} walls Pokemon ex`,
    d:`${gCap(mainC.name)}'s ${mainC.card.pex[0]} prevents all damage done to it by attacks from your opponent's Pokemon ex, so an ex deck has to find another way to knock it out. Pokemon without a Rule Box still hit it normally.`}); }
  // 2.7.3: the main attacker's biggest attack has to be payable with the list's Energy. When it is not and a
  // smaller attack on the same card is, the grade has quietly fallen back to the smaller one, so say which.
  if (main) { const me=deck.find(x=>x.card&&x.card.key===main.key&&x.card.attacks), mc=me&&me.card;
    if (mc) { const all=mc.attacks.filter(a=>!a.copy).map(a=>({ a, top:(gAtkReach(a, deck)||{}).top||0 })).sort((x,y)=>y.top-x.top);
      const big=all[0], fb=all.find(x=>pay(x.a, mc));
      if (big && big.top>0 && !pay(big.a, mc) && fb && fb.top<big.top) {
        const need={}; (big.a.cost||[]).forEach(ty=>{ if(ty!=='colorless') need[ty]=(need[ty]||0)+1; });
        const haveOf=ty=>EN.reduce((n,x)=>{ const ts=x.card.etypes&&x.card.etypes.length?x.card.etypes:[x.card.etype]; return n+((ts.includes(ty)||ts.includes('any'))&&fits(x.card,mc)?x.qty:0); },0);
        const lack=Object.keys(need).filter(ty=>haveOf(ty)<need[ty]);
        const none=lack.filter(ty=>!haveOf(ty)), few=lack.filter(ty=>haveOf(ty));
        const why=[none.length?`${none.map(gCap).join(' and ')} Energy, which this list doesn't run`:'',
          ...few.map(ty=>`${need[ty]} ${gCap(ty)} Energy, and this list runs only ${haveOf(ty)}`)].filter(Boolean).join('; it also needs ');
        findings.push({sev:'warn', t:`${gCap(me.name)} can't pay for ${big.a.name}`,
          d:`${gCap(me.name)}'s ${big.a.name} needs ${why}. The grade counts ${fb.a.name} (${fb.top}) for it instead.`}); } } }
  const mill=attackers.map(e=>({e, a:(e.card.attacks||[]).find(a=>a.copy&&a.copy.mill)})).find(x=>x.a);
  const millR=mill?reach.find(r=>r.name===mill.e.name&&r.copy&&r.copy.top):null;
  if (mill && !millR) findings.push({sev:'warn', t:'Some damage is left out',
    d:`${gCap(mill.e.name)}'s ${mill.a.name} uses an attack from whatever comes off the top of your deck, so the grade does not count its damage.`});
  // v60: an attack that hits several of the opponent's Pokemon at once (Kyurem's Trifrost) takes
  // more than one knockout over two turns, so the single-hit number undersells it.
  const multiR=strat!=='spread'?(mainR&&mainR.multi>=2?mainR:reach.filter(r=>r.multi>=2&&r.top*2>=hi/2).sort((a,b)=>b.top*b.multi-a.top*a.multi)[0]):null;
  if (multiR) { closeScore+=multiR.multi>=3?0.08:0.04;
    const how=multiR.copy?`${gCap(multiR.name)}'s ${multiR.copy.via}, copying ${gCap(multiR.copy.who)}'s ${multiR.copy.atk},`:`${gCap(multiR.name)}'s ${multiR.atk}`;
    const n=multiR.multi>=4?'every one':multiR.multi;
    findings.push({sev:'ok', t:'Hits several Pokemon at once',
    d:`${how} hits ${multiR.multi>=4?'each':multiR.multi} of your opponent's Pokemon for ${multiR.top}${multiR.multi>=4?'':' each'}, so two uses can Knock Out ${n === 'every one' ? 'a whole board' : n} of their Pokemon with ${multiR.top*2} HP or less. The single-hit number undersells it.`}); }
  // v65: Energy the top hit can count on. A list wants about 3 Energy cards it can use for each Energy of a type
  // the attack asks for (cards that attach Energy from the deck or discard stand in for some). Fewer than that
  // and the attack is often not ready, so the hit counts for less.
  if (bestR && strat !== 'spread' && best > 0) {
    const ce=deck.find(x=>x.card&&x.name===bestR.name), cw=ce&&ce.card;
    // A copy attack is paid with its own cost; an Ability that borrows a Benched Pokemon's attack pays that attack's cost.
    const bench=bestR.copy&&bestR.copy.bench, src=bench?(deck.find(x=>x.card&&x.name===bestR.copy.who)||{}).card:cw;
    const at=src&&(src.attacks||[]).find(x=>x.name===(bestR.copy&&!bench?bestR.copy.via:bestR.atk));
    if (at&&cw) { const need={}; (at.cost||[]).forEach(ty=>{ if(ty!=='colorless') need[ty]=(need[ty]||0)+1; });
      const acc=(coh.provided['energy_accel']||0)>=4?3:0;
      const sup=Math.min(1,...Object.keys(need).map(ty=>(EN.reduce((n,x)=>{ const ts=x.card.etypes&&x.card.etypes.length?x.card.etypes:[x.card.etype];
        return n+((ts.includes(ty)||ts.includes('any'))&&fits(x.card,cw)?x.qty:0); },0)+acc)/(need[ty]*3)));
      if (sup<0.7) { closeScore*=0.55+0.45*sup/0.7;
        findings.push({sev:'warn', t:`Few Energy for ${gCap(bestName)}`, d:`${gCap(bestR.atk)} needs ${Object.keys(need).map(ty=>need[ty]+' '+gCap(ty)).join(' and ')} Energy, and the list runs few Energy that ${gCap(bestName)} can use for it, so it is often not ready to attack.`}); } } }
  // v65: a big hit from a single copy with nothing close behind it shows up in few games. Count the copies
  // that can reach the board (an evolution line is only as deep as its thinnest stage, Rare Candy filling in
  // for the Stage 1) across attackers that hit nearly as hard, and trust the hit less when there are few.
  let back333=null;
  if (bestR && strat !== 'spread' && best > 0) {
    const cand=coh.provided['evolution_access']||0;
    // 3.3.3: a single copy an Ability brings back (Gengar's Netherworld Gate) counts as part of a second copy,
    // by the odds its second life comes together (g333BackOdds). nb leaves that out, for the breakdown's credit line.
    const backOf=new Map();
    const lineQ=(r,nb)=>{ const e2=deck.find(x=>x.card&&x.name===r.name); let q=r.qty, c2=e2&&e2.card, g=0;
      const bk=!nb&&e2?(backOf.has(r.name)?backOf.get(r.name):(backOf.set(r.name,g333BackOdds(deck,e2,coh.energyTypes)),backOf.get(r.name))):null;
      while (c2 && c2.from && g++<3) { const m=deck.find(x=>x.card&&gk(x.card.key)===gk(c2.from));
        if (!m) { if (c2.stage==='stage2') { q=Math.min(q,cand/2); // v67: 1 Rare Candy is half a line here, not none, so Power agrees with Synergy that it can be played
            const b2=g116Base(deck,c2); if (b2) q=Math.min(q,deck.filter(x=>x.card&&gk(x.card.key)===gk(b2)).reduce((n,x)=>n+x.qty,0)); } break; }
        q=Math.min(q, deck.filter(x=>x.card&&x.card.key===m.card.key).reduce((n,x)=>n+x.qty,0)+(c2.stage==='stage2'?cand:0)); c2=m.card; }
      return bk&&q>0 ? q+Math.min(1,bk.p) : q; };
    const av=n=>n>=3?1:n>=2?0.97+0.03*(n-2):n>=1?0.75+0.22*(n-1):0.5+0.25*n;
    // Attackers within 85% of the hit count in full, weaker ones down to half of it count in part.
    const relOf=(r,nb)=>av(reach.filter(o=>o.eff>=0.5*r.eff).reduce((n,o)=>n+lineQ(o,nb)*Math.min(1,(o.eff/r.eff)/0.85)**2,0));
    const relAll=nb=>Math.max(...reach.map(r=>Math.min(1,r.eff/Math.max(1,bestR.eff))*relOf(r,nb)));
    const rel=relAll(false), mult=x=>x<0.999?0.4+0.6*x:1;
    const bk=[...backOf.entries()].find(([n,v])=>v&&n===bestR.name);
    if (bk) back333={ name:bk[0], abil:bk[1].abil, by:bk[1].self?'':bk[1].by, p:bk[1].p, d:Math.max(0, closeScore*(mult(rel)-mult(relAll(true)))) };
    if (rel<0.999) { closeScore*=0.4+0.6*rel;
      // A deck with 3 or more other attackers near the top hit covers the loss, so it gets no warning.
      if (relOf(bestR)<0.8 && reach.filter(o=>o!==bestR&&o.eff>=0.6*bestR.eff).length<3) findings.push({sev:'warn', t:`Only ${lineQ(bestR,true)||'no'} ${gCap(bestName)} to hit with`,
        d:`Your hardest hit comes from ${gCap(bestName)}, and the list can put ${lineQ(bestR,true)<=1?'only one':'few'} into play, with no other attacker close to it. When it is prized or Knocked Out, your damage drops a lot.`}); } }
  closeScore=gClamp(closeScore,0,1);
  // v63: a lock, mill or stall deck closes games by stopping the opponent. When that counts for more
  // than its damage, the grade uses it and the damage finding says why low damage is fine here.
  let ctl=null, ctlMix=null; try { ctl=gControl(deck, coh, main); } catch (_) {}
  if (ctl && ctl.close>closeScore) { closeScore=ctl.close;
    const word={ lock:'locking', mill:'milling', stall:'stalling', denial:'stripping Energy and cards' };
    const how=ctl.kinds.map(k=>word[k]).join(' and ');
    const dmg=findings.find(f=>f.t==='Damage ceiling is too low'||f.t==='Two hits for the biggest threats'||f.t==='Nothing can reliably attack');
    if (dmg && dmg.t!=='Nothing can reliably attack') { dmg.sev='ok'; dmg.t='Low damage, by design';
      dmg.d=dmg.d.replace(/ You cannot trade up, which usually loses the prize race\.$/, '').replace(/ Fine if you can take the return hit\.$/, '')+` This deck wins by ${how}, not by trading knockouts, so its damage counts for less.`; }
    const big=ctl.pieces.filter(x=>x.v>=0.04&&gCtlSay(x)), top=big.map(x=>gCtlSay(x));
    findings.push({sev:'ok', t:`Wins by ${how}`,
      d:`The grade counts what this deck stops more than its damage.${big.length?` The biggest piece is ${gCtlSay(big[0],true)}.`:''}${top.length>1?` The game plan lists ${Math.min(5,top.length)-1} more.`:''}`});
    // The piece the plan rests on, when it is one Pokemon: keep it Active, and run enough of it.
    const k=ctl.pieces.find(x=>x.key&&x.src!=='trainer'&&x.cat!=='denial'&&x.p.k!=='heal');
    if (k && k.p.when==='active') findings.push({sev:'ok', t:`Keep ${gCap(k.name)} Active`,
      d:`${gCap(k.name)}'s ${k.how} only works while it is in the Active Spot. Switching it out or losing it turns the ${k.cat} off, so plan your retreats around it.`});
    if (k && k.qty<=2 && !(main && k.key===main.key && k.qty===1)) findings.push({sev:'warn', t:`Only ${k.qty} ${gCap(k.name)}`, cl:{ n:k.name, q:k.qty },
      d:`The ${k.cat} rests on ${gCap(k.name)}${k.how ? `'s ${k.how}` : ''}, and the list runs ${k.qty}. With so few copies it is often prized or gone after one knockout.`}); }
  else if (ctl) {
    // Muse s2 M2: a deck that attacks and also mills, walls or locks (Hydreigon ex mill, Crustle). Its damage
    // still leads, and what it stops closes some of the games its hits do not (G_CTL_MIX of the rest).
    ctlMix=ctl; ctl=null;
    closeScore=gClamp(closeScore+(1-closeScore)*G_CTL_MIX*ctlMix.P,0,1);
    const word={ lock:'locks', mill:'mills', stall:'walls', denial:'strips Energy and cards' };
    const big=ctlMix.pieces.find(x=>x.v>=0.04&&gCtlSay(x));
    // Crustle already has its own "walls Pokemon ex" finding, so it is not said twice.
    if (big && !findings.some(f=>/ walls /.test(f.t||'')&&f.t.startsWith(gCap(big.name)))) findings.push({sev:'ok', t:`Also ${ctlMix.kinds.map(k=>word[k]).join(' and ')}`,
      d:`Besides attacking, this deck ${ctlMix.kinds.map(k=>word[k]).join(' and ')}, which wins some games its hits alone would not. The biggest piece is ${gCtlSay(big,true)}.`}); }
  const pk=deck.filter(e=>e.card&&e.card.t==='pkmn');
  const pkN=pk.reduce((a,e)=>a+e.qty,0)||1;
  const multiN=pk.filter(e=>(e.card.p||1)>=2).reduce((a,e)=>a+e.qty,0);
  const bigLiabs=deck.filter(e=>e.card&&e.card.p>=3);
  // Fewer multi-prize Pokemon, fewer easy prizes for the opponent.
  let prizeScore=0.9-0.25*multiN/pkN;
  if (bigLiabs.length) { const list=bigLiabs.map(e=>gCap(e.name)).join(', ');
    // v61: when the main attacker gives up one prize and the 3-prize Pokemon are not it (Mega Kangaskhan ex
    // drawing for Slowking), the plan does not lean on them, so the risk is real but smaller.
    const sideBig=mainC&&(mainC.card.p||1)===1&&!bigLiabs.some(e=>e.card.key===mainC.card.key);
    // v67: a 3-prize Pokemon that is there for an engine Ability (Mega Kangaskhan ex's Run Errand draws)
    // is a support piece, not a mistake. Ways to move it out of harm (free retreat, switching) cut the risk.
    const engine=e=>(e.card.abil||[]).length&&(e.card.provides||[]).some(t=>/^(draw|search(_[a-z]+)?|energy_accel)$/.test(t));
    // 3.2.8: next to a three-prize main attacker (Mega Froslass ex), an engine that is not the deck's hit
    // (Mega Kangaskhan ex drawing) is named apart, not as an attacker.
    const engB=bigLiabs.filter(e=>engine(e)&&(!mainC||e.card.key!==mainC.card.key)&&!(bestR&&bestR.name===e.name));
    const atkB=bigLiabs.filter(e=>!engB.includes(e));
    const supportBig=(sideBig||!atkB.length)&&bigLiabs.every(engine);
    if (eff<FMT.ohkoTarget && strat!=='spread' && supportBig) {
      const esc=deck.filter(e=>e.card&&!bigLiabs.includes(e)&&((e.card.t==='pkmn'&&e.card.swab)||(e.card.t!=='pkmn'&&(e.card.provides||[]).some(t=>/^switch/.test(t)))));
      const escN=esc.reduce((a,e)=>a+e.qty,0), escP=esc.find(e=>e.card.t==='pkmn');
      prizeScore=Math.max(0.5,prizeScore-(escN>=2?0.03:0.08));
      const what=bigLiabs.length>1?bigLiabs.map(e=>`${gCap(e.name)}'s ${(e.card.abil||[])[0]}`).join(' and '):`its ${(bigLiabs[0].card.abil||[])[0]} Ability`;
      findings.push({sev:'ok', t:`${list}: a three-prize engine`,
      d:`${list} ${bigLiabs.length>1?'give':'gives'} up 3 prizes when ${bigLiabs.length>1?'they fall':'it falls'}, but ${bigLiabs.length>1?'they are':'it is'} here for ${what}, not to trade hits. `+
        (escN>=2?`Your ${escN} ways to switch or retreat${escP?`, like ${gCap(escP.name)},`:''} let you use it, then move it out before your opponent can Knock it out.`
          :`Use it, then retreat or switch it out before your opponent's turn, and keep it off the Bench when they can hit the Bench.`)}); }
    else if (eff<FMT.ohkoTarget && strat!=='spread' && sideBig) { prizeScore=0.65;
      findings.push({sev:'warn', t:'A three-prize Pokemon in a one-prize deck',
      d:`${list} ${bigLiabs.length>1?'give':'gives'} up 3 prizes when ${bigLiabs.length>1?'they fall':'it falls'}, half the game in one knockout, while ${gCap(mainC.name)} gives up one. Put ${bigLiabs.length>1?'them':'it'} in play only when you need ${bigLiabs.length>1?'them':'it'}.`}); }
    else if (eff<FMT.ohkoTarget && strat!=='spread') {
      const listA=atkB.length?atkB.map(e=>gCap(e.name)).join(', '):list, nA=atkB.length||bigLiabs.length;
      const engTxt=atkB.length&&engB.length?` ${engB.map(e=>gCap(e.name)).join(' and ')} ${engB.length>1?'are':'is'} here for ${engB.length>1?'their Abilities':`its ${(engB[0].card.abil||[])[0]} Ability`}, not to trade hits, so use ${engB.length>1?'them':'it'}, then move ${engB.length>1?'them':'it'} out before your opponent can Knock ${engB.length>1?'them':'it'} out.`:'';
      // v64: no cliff at the one-shot line. A 3-prize attacker that hits for 300 (Mega Lucario ex with
      // Premium Power Pro) already one-shots the format's smaller threats, so it loses less than one that
      // hits for 200. The penalty fades as the hit nears a one-shot on the biggest threats.
      const near=gClamp((eff-hi/2)/(FMT.ohkoTarget-hi/2),0,1);
      prizeScore=0.5+(prizeScore-0.5)*near*near;
      findings.push({sev:'warn', t:'Three-prize attackers, two-prize punch',
      d: eff>=lo
        ? `${listA} ${nA>1?'give':'gives'} up 3 prizes when ${nA>1?'they fall':'it falls'}. Your best hit (${eff}) one-shots Pokemon with ${eff} HP or less, but the biggest threats take two hits, so those trades cost you more than they cost your opponent.${engTxt}`
        : `${listA} ${nA>1?'give':'gives'} up 3 prizes when ${nA>1?'they fall':'it falls'}, but you cannot reliably one-shot back. That is a losing exchange unless you tighten the damage.${engTxt}`}); }
    else findings.push({sev:'ok', t:'Big attackers, but the power backs it up',
      d:`${list} ${bigLiabs.length>1?'are':'is'} risky at 3 prizes ${bigLiabs.length>1?'each':''}, yet you hit hard enough to justify the trade.`.replace(' ,', ',')}); }
  // v54: say it plainly when most or all of the Pokemon give up two prizes.
  else if (multiN && multiN>=pkN) findings.push({sev:'ok', t:'Two prizes per knockout',
    d:`Every Pokemon here gives up two prizes, so the opponent needs only three knockouts. That is normal for a deck built on Pokemon ex, so each one has to take more than one knockout of its own.`});
  else if (multiN*2>pkN) findings.push({sev:'ok', t:'Mostly two-prize Pokemon',
    d:`${multiN} of your ${pkN} Pokemon give up two prizes, so most knockouts cost you two. Send in your one-prize Pokemon when you can.`});
  else findings.push({sev:'ok', t:'Efficient prize trade',
    d:multiN?`${multiN} of your ${pkN} Pokemon ${multiN>1?'give':'gives'} up two prizes and the rest give up one, so you are not handing over easy multi-prize turns.`:'Every Pokemon here gives up one prize, so the opponent has to take six knockouts.'});
  // v54: only Stage 2 Pokemon the deck leans on: the main attacker, or a line of 2 or more.
  // A single Stage 2 tech (Metagross in Mega Excadrill) does not make the deck slow.
  // 3.2.7: nor a Stage 2 that comes back from the discard pile (Kingdra ex's King's Order), which skips evolving.
  const s2=deck.filter(e=>e.card&&e.card.stage==='stage2'&&!e.card.selfBench&&!g37Copier(deck,e.card)&&!(coh.revived&&coh.revived.has(e.card.key))&&(e.qty>=2||(main&&e.card.key===main.key)));
  const stage2=s2.reduce((a,e)=>a+e.qty,0);
  const s2Names=[...new Set(s2.map(e=>gCap(e.name)))];
  const candy=coh.provided['evolution_access']||0;
  let clockScore=0.82;
  // v55: a Stage 2 line that runs as many Stage 1 Pokemon as Stage 2 (Cynthia's Garchomp ex 4-4-3)
  // evolves the long way on purpose. It is on time for a third turn attack, not a second turn one.
  const qtyK=k=>deck.filter(x=>x.card&&x.card.key===k).reduce((n,x)=>n+x.qty,0);
  const longWay=s2.length&&s2.every(e=>{ if(!e.card.from) return false;
    const mid=qtyK(e.card.from), lineQ=qtyK(e.card.key), midC=deck.find(x=>x.card&&x.card.key===e.card.from);
    const bas=midC&&midC.card.from?qtyK(midC.card.from):0;
    return mid>=2&&mid>=lineQ&&bas>=mid;});
  if (stage2>0 && candy<2 && longWay) { clockScore=0.7;
    const mids=[...new Set(s2.map(e=>e.card.from))].map(k=>`${qtyK(k)} ${gCap(deck.find(x=>x.card&&x.card.key===k).name)}`);
    findings.push({sev:'ok', t:'Evolves the long way',
    d:`Your Stage 2 Pokemon (${s2Names.join(', ')}) evolve through ${mids.join(' and ')}${candy?' with 1 Rare Candy as a shortcut':' without Rare Candy'}, so plan on attacking with them from your third turn. Faster decks start swinging by turn ${FMT.fastSetup}, so your early Pokemon have to hold the line until then.`}); }
  else if (stage2>0 && candy<2) { clockScore=0.5;
    findings.push({sev:'warn', t:'Might be slow off the line',
    d:`You lean on Stage 2 Pokemon (${s2Names.join(', ')}) with ${candy ? 'only ' + candy : 'no'} Rare Candy. In a format that starts swinging by turn ${FMT.fastSetup}, a slow setup can lose the game before you are online.`}); }
  else if (stage2>0) findings.push({sev:'ok', t:'Sets up on time',
    d:'Enough Rare Candy to land your Stage 2 Pokemon before the game runs away.'});
  // v68: draw and search Abilities used once a turn keep a deck moving every turn, which is what
  // separates the decks that win from the ones that only hit hard. A Stage 1 that draws (Drakloak's
  // Recon Directive) makes the long way up to a Stage 2 pay for itself, so that line is on time.
  // Each engine copy adds a little to Setup speed, up to 4 of them; one that works only some turns counts half.
  // 3.2.8: not one Fix first calls dead as built (Metallic Signal with no Evolution Pokemon to find).
  const abDead=(e,a)=>((coh&&coh.flaws)||[]).some(f=>f.who===e.card.key&&f.deadAb===a.abil);
  const engAb=e=>e.card&&e.card.t==='pkmn'&&canPlay(e.card)&&(e.card.ab||[]).some(a=>/once a turn/.test(a.p||'')&&/^(?:draws|searches|looks at the top)/.test(a.p||'')&&!abDead(e,a));
  const engHalf=e=>(e.card.ab||[]).every(a=>!/once a turn/.test(a.p||'')||/\(only if|only when|if you have|coin/.test(a.p||''));
  const engs=deck.filter(engAb);
  const engQ=engs.reduce((n,e)=>n+e.qty*(engHalf(e)?0.5:1),0);
  const midEng=clockScore===0.7&&s2.some(e=>engs.some(x=>x.card.key===e.card.from&&!engHalf(x)&&qtyK(x.card.key)>=3));
  if (midEng) { clockScore=0.82; const f=findings.find(f=>f.t==='Evolves the long way');
    const mid=engs.find(x=>s2.some(e=>e.card.from===x.card.key)), ab=mid&&(mid.card.ab||[]).find(a=>/once a turn/.test(a.p||''));
    if (f && ab) { f.t='Evolves the long way, drawing as it goes';
      f.d=`Your Stage 2 Pokemon (${s2Names.join(', ')}) evolve through ${qtyK(mid.card.key)} ${gCap(mid.name)}, and ${gCap(mid.name)}'s ${ab.abil} ${ab.p.replace(/ once a turn$/, '')} every turn on the way up, so the slow line still sets up on time.`; } }
  if (engQ>0) { const add=Math.min(0.1,0.025*engQ); clockScore=Math.min(0.95,clockScore+add);
    if (engQ>=2) findings.push({sev:'ok', t:'Draws every turn',
      d:`${engs.slice(0,3).map(e=>`${e.qty} ${gCap(e.name)}`).join(', ')} ${engs.length>1?'give':'gives'} you a draw or search Ability once a turn, so the deck finds its pieces without spending a Supporter on it.`}); }
  // v59: a toolbox deck (Basic Box) runs many different attackers and picks the one each turn needs,
  // so its power is more than its single best hit. Counts distinct Pokemon whose payable attack
  // (read from card text, as above) reaches a two-hit Knock Out on the format's biggest threats on its
  // own, without help from other cards (a Dusknoir's Cursed Blast is not a reason to count Meowth ex).
  const tb=[...new Map(reach.filter(r=>r.top*2>=hi).map(r=>[r.name.toLowerCase(), r])).values()].sort((a,b)=>b.eff-a.eff);
  const toolbox = tb.length>=4 ? tb.map(r=>r.name.toLowerCase()) : [];
  if (tb.length>=4) {
    // No single main attacker in a toolbox deck, so drop the "is this deck's main attacker" lead.
    if (lead) findings.forEach(f => { if (f.d && f.d.startsWith(lead)) f.d = f.d.slice(lead.length); });
    closeScore=gClamp(closeScore+Math.min(0.12,0.04*(tb.length-3)),0,1);
    prizeScore=Math.min(0.9, prizeScore+0.1);
    const one=tb.filter(r=>(r.p||1)===1).length;
    findings.push({sev:'ok', t:'Many ways to attack',
    d:`${tb.length} different Pokemon in the list hit for ${hi/2} or more: ${tb.slice(0,4).map(r=>gCap(r.name)).join(', ')}${tb.length>4?` and ${tb.length-4} more`:''}. You pick the attacker that fits each turn${one?`, including ${one} that ${one>1?'give':'gives'} up one prize`:''}, so your opponent cannot plan around one threat.`}); }
  // v59: a single copy of the main attacker is gone for the game when it is prized or Knocked Out.
  // 3.2.8 (Muse s5 M3): what top lists run comes from the archetype's own top lists (g88Claims in gradeDeck).
  // 3.3.2 (Muse 3.3.1 retest): a main attacker an Ability puts back from the discard pile (Gengar's Netherworld
  // Gate) comes back after a knockout, so one copy is not a single life and the grade does not ask for a second.
  // 3.3.3 (Muse 3.3.2 retest): it says how often that second life comes together, and what Power counts for it.
  const back332 = main && qtyK(main.key)===1 ? g333BackOdds(deck, deck.find(x=>x.card&&x.card.key===main.key), coh.energyTypes) : null;
  if (back332) { const pc=Math.round(100*back332.p), cr=back333&&back333.name===main.name;
    findings.push({sev:'ok', t:`${gCap(main.name)} comes back`,
    d:`The list runs one copy of its main attacker, and ${back332.self ? `its ${back332.abil}` : `${gCap(back332.by)}'s ${back332.abil}`} puts it back onto your Bench from your discard pile, so a Knock Out does not end the plan. That second life comes together in about ${pc}% of games, since ${gCap(main.name)} has to reach play or your discard pile first and is in your prizes in about 1 game in 10.${cr ? ` Power counts it as ${pc}% of a second copy.` : ''}`}); }
  else if (main && qtyK(main.key)===1) findings.push({sev:'warn', t:`Only 1 ${gCap(main.name)}`, cl:{ n:main.name, q:1 },
    d:`The list runs one copy of its main attacker. It is in your prizes in about 1 game in 10, and once it is Knocked Out the deck has no one to carry the plan.`});
  // 2.6.6: setup speed also reads how often the attacker is in play with the Energy its attack needs, from
  // shuffles of the list (g80Speed), by your second turn. A quarter of games is about the usual 8.2, half is 9.5,
  // and 2.6.7 lets the fastest lists go on to a 10 (g80Clock). When that reads faster than the rules above, it
  // sets the score; it never lowers it. The rules alone still top out at 9.5: only a measured fast setup gets a 10.
  let speed=null;
  if (bestR && best > 0) { try {
    const sw=deck.find(x=>x.card&&x.name===bestR.name), cw=sw&&sw.card;
    const bench=bestR.copy&&bestR.copy.bench, src=bench?(deck.find(x=>x.card&&x.name===bestR.copy.who)||{}).card:cw;
    const at=src&&(src.attacks||[]).find(x=>x.name===(bestR.copy&&!bench?bestR.copy.via:bestR.atk));
    // 2.6.7: a toolbox deck is set up with a board, one Pokemon in play for each attacker it picks from (5 or 6).
    const board=tb.length>=4 ? Math.min(6, 1+tb.length) : 1;
    const sp=at&&!at.need?g80Speed(deck, cw, at, board):null;
    if (sp) { const v=g80Clock(sp.t2);
      speed={ ...sp, name:bestR.name, atk:at.name, n:(at.cost||[]).length, v, board, used:v>clockScore+0.005 };
      if (speed.used) clockScore=Math.min(1, v); } } catch (_) {} }
  const score=gClamp(0.5*closeScore+0.3*prizeScore+0.2*clockScore,0,1);
  // v67: the three parts, kept for the note on why Power is what it is.
  const parts = { close:closeScore, prize:prizeScore, clock:clockScore, stage2, eff, ce:ceS, strat, multiN, pkN, engQ, speed, back:ctl?null:back333 };
  // 3.3.2: setup pieces left out of the ceiling, for How it plays.
  const setupOut = []; reach.forEach(r => { const a = gSetupAtk(cardOf(r)); if (a && sideSup(r) && ceOf(r) > ce && !setupOut.some(x => x.name === r.name)) setupOut.push({ name: r.name, atk: a.name, cost: (a.cost || []).length, hit: r.atk }); });
  return { score, findings, best, eff, bestName, reach, main, toolbox, ctl, ctlMix, parts, setupOut };
}

/**
 * v53: how the deck is played, for the top of How it plays. Two items, each
 * read from the list and the card text only:
 *   Main attacker: who attacks and what its attack counts on.
 *   Support: Pokemon with a draw or search Ability whose attack cost is all
 *   Colorless (the Energy is not chosen for them), so they are mainly there
 *   for the Ability.
 */
function gPlan(entries, coh, via) {
  const out = [];
  let m = via && via.main;
  // 2.6.2: a deck the player set as a toolbox has no single main attacker, so the plan leads with its hardest hitter and names the rest.
  if (!m && via && (via.boxPick || []).length) { const x = entries.find(y => y.card && y.card.key === via.boxPick[0]); if (x) m = { key: x.card.key, name: x.name, why: 'box' }; }
  if (!m) return out;
  const nm = gCap(m.name), e = entries.find(x => x.card && x.card.key === m.key);
  if (!e) return out;
  const rTw = (via.reach || []).find(x => x.name.toLowerCase() === m.key);
  // v62: one hit's numbers for the sentences below; attacking twice is its own sentence.
  const r = rTw && rTw.twice ? Object.assign({}, rTw, { top: rTw.twice.one, now: rTw.now / 2 }) : rTw;
  const mill = (e.card.attacks || []).find(a => a.copy && a.copy.mill);
  const pre = new Set(); let f = e.card.from;
  while (f && !pre.has(f)) { pre.add(f); const x = entries.find(y => y.card && y.card.key === f); f = x && x.card.from; }
  let how = '';
  if (mill) {
    const fodder = entries.filter(x => x.card && x.card.t === 'pkmn' && x.card.key !== m.key && !pre.has(x.card.key) &&
      !x.card.isEx && (x.card.p || 1) < 2 && (x.card.attacks || []).some(a => !a.copy)).map(x => gCap(x.name));
    how = `Its ${mill.name} uses an attack from a Pokemon without a Rule Box that comes off the top of your deck` +
      (fodder.length ? `. In this list that is ${fodder.length > 1 ? fodder.slice(0, -1).join(', ') + ' and ' + fodder[fodder.length - 1] : fodder[0]}.` : '.') +
      (r && r.copy && r.copy.top ? ` ${(l => l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l[0])(r.copy.top.map(x => gCap(x).replace(/'S\b/g, "'s")))} put the one you want there first.` : '');
  } else if (r && r.escale) {
    const x = r.escale, ty = x.types.map(gCap), what = (ty.length ? ty.join(' and ') + ' ' : '') + 'Energy';
    how = x.discard
      ? `Its ${r.atk} discards ${what} from your Pokemon and does ${x.per} for each one, so every one you attach anywhere on your board adds ${x.per} to its next big hit.`
      : x.scope === 'all'
      ? `Its ${r.atk} counts ${what} attached to all your Pokemon, so every one you attach anywhere on your board adds ${x.per}${x.x2 ? ` (${x.per * 2} for a Basic ${gCap(x.x2.type)} Energy with ${gCap(x.x2.who)}'s ${x.x2.abil} in play)` : ''}.`
      : x.scope === 'self' ? `Its ${r.atk} counts ${what} attached to it, so every one you attach to it adds ${x.per}.`
      : `Its ${r.atk} counts the Energy attached to both Active Pokemon, so every one you attach to it adds ${x.per}${x.x2 ? ` (${x.per * 2} for a Basic ${gCap(x.x2.type)} Energy with ${gCap(x.x2.who)}'s ${x.x2.abil} in play)` : ''}, and your opponent's Energy adds to it too.`;
  } else if (r && r.cond) {
    how = r.sc
      ? `Its ${r.atk} does ${r.sc.per} ${r.pile.base ? 'more ' : ''}for each ${r.sc.one} ${r.sc.where}: ${r.now} with 2 there, ${r.top} once you have ${r.cond.n}.`
      : `Its ${r.atk} grows as your discard pile fills: ${r.now} early, ${r.top} once you have ${r.cond.n} ${r.cond.what} there.`;
  } else if (r && r.kox && !r.copy) {
    // v60: an attack that Knocks Out the opponent's Active (Terminal Period). The sentence names who sets it up.
    how = g35Hit(r).replace(/^.*?'s /, 'Its ');
    if (r.kox.how === 'counters') { const who = entries.filter(x => x.card && ((x.card.provides || []).includes('move_counters') || (x.card.abDmg || []).length)).map(x => gCap(x.name));
      if (who.length) how = how.replace('this list can put counters on it to set that up', `${[...new Set(who)].slice(0, 2).join(' and ')} can put them there`); }
  } else if (r && r.need && !r.copy) {
    how = `Its ${g62Need(r, m.name)}`;
  } else if (r && r.copy && r.copy.bench) {
    how = `Its ${r.copy.via} lets it use the attacks of your Benched Pokemon, paid with its own Energy. The best one here is ${gCap(r.copy.who)}'s ${r.copy.atk}, which ${r.flip ? 'averages' : 'hits for'} ${r.top}.`;
  } else if (r && r.copy) {
    how = `It copies ${gCap(r.copy.who)}'s ${r.copy.atk} with ${r.copy.via}.`;
  } else if (r && r.conf === 'low') {
    how = r.hand ? `Its ${r.atk} counts the cards in your hand: about ${r.top} with ${r.hand} cards, the app's estimate, not a printed number.` : `Its ${r.atk} depends on the board, so ${r.top} is the app's estimate, not a printed number.`;
  } else if (r && r.flip === 'mill') {
    how = `Its ${r.atk} discards ${r.mill.n === 1 ? 'the top card' : 'the top ' + r.mill.n + ' cards'} of ${r.mill.both ? 'each deck' : 'your deck'} and does ${r.mill.per} ${r.mill.base ? 'more ' : ''}for each ${g56One(r.mill)} among them, about ${r.top} on average since your list runs ${r.mill.have}.`;
  } else if (r) {
    how = `Its ${r.atk} ${r.flip ? 'averages' : 'hits for'} ${r.top}${r.flip === 'tails' ? ' with its coin flips' : ''}.`;
  }
  // v62: a bigger attack on the same card that waits on a condition the list cannot meet (Mega Golisopod ex's
  // Finishing Blow needs damage already on the target), named so the plan does not leave it out.
  if (r && !r.copy && !mill) { const na = (e.card.attacks || []).find(a => a.name !== r.atk && a.need && (a.dmg || 0) > r.top);
    const nr = na && gAtkReach(na, entries);
    if (nr && nr.need && !nr.need.met) how += ` Its ${g62Need(Object.assign(nr, { atk: na.name }), m.name)}`; }
  if (rTw && rTw.twice) how += ` ${g62Twice(rTw)}`;
  let why;
  // 2.6.1: the name is the meta deck the cards match, never the player's own name for the deck.
  if (m.why === 'name') why = m.among > 1 ? `The list plays as ${m.named}, and of the Pokemon that deck is named for, it is the one the list is built to attack with.` : `The list plays as ${m.named}, a deck named for it.`;
  else {
    const preN = [...pre].map(k => entries.filter(y => y.card && y.card.key === k).reduce((n, y) => n + y.qty, 0));
    const en = gEnablers(entries, e.card), enN = en.reduce((n, x) => n + x.qty, 0);
    const enTxt = enN ? ` Its ${e.card.bmAbil} puts it onto your Bench when you have ${[...new Set(en.map(x => gCap(x.name)))].join(' or ')} in play, so the ${enN} ${enN === 1 ? 'copy' : 'copies'} of ${en.length > 1 ? 'those' : 'that'} in the list are there to bring it in.` : '';
    why = `${m.why === 'pick' ? 'You set it as the main attacker' : 'It is the attacker this list is built around'}: ${e.qty} ${e.qty === 1 ? 'copy' : 'copies'}${preN.some(n => n) ? ' plus ' + preN.reduce((a, b) => a + b, 0) + ' Pokemon it evolves from' : ''}.${enTxt}`;
    // v60: the deck is named for the Pokemon that powers it, not for the one that attacks.
    if (m.engine) why = `The list plays as ${m.named}, a deck named for ${gCap(m.engine.name)}, ${m.engine.atk ? 'which sets up the attackers' : 'which powers the attackers rather than attacking'}: its ${m.engine.abil}${m.engine.atk ? ' attack' : ''} ${m.engine.p}.`;
  }
  // v59: a toolbox deck (Basic Box) has no single plan, so name the other attackers too.
  const tbx = ((m.why === 'box' ? via.boxPick : via.toolbox) || []).filter(k => k !== m.key);
  const isBox = m.why === 'box' ? tbx.length >= 1 : tbx.length >= 3 && m.why !== 'name' && m.why !== 'pick';
  const tn = tbx.map(k => gCap((entries.find(y => y.card && y.card.key === k) || { name: k }).name));
  if (isBox) {
    const q = k => entries.filter(y => y.card && y.card.key === k).reduce((n, y) => n + y.qty, 0);
    const most = tbx.every(k => q(k) <= e.qty);
    why = most ? `${nm} is the one the list runs most copies of (${e.qty}).` : '';
    if (m.engine) why = `The list plays as ${m.named}, a deck named for ${gCap(m.engine.name)}, ${m.engine.atk ? 'which sets them up' : 'which powers them rather than attacking'}: its ${m.engine.abil}${m.engine.atk ? ' attack' : ''} ${m.engine.p}.${why ? ' ' + why : ''}`;
  }
  // v59: what the main attacker's own Ability adds, read from its text (Mega Kangaskhan ex's Run Errand).
  const mAb = (e.card.ab || []).filter(x => !x.passive).map(x => `Its ${x.abil} ${x.p}.`).join(' ');
  // v54: what the main attacker's own Abilities add, from the card text.
  const wall = (e.card.pex || []).length ? ` Its ${e.card.pex[0]} prevents all damage done to it by attacks from your opponent's Pokemon ex, so ex attackers cannot knock it out.` : '';
  const own = (e.card.abDmg || []).filter(x => !x.selfKO)[0];
  // v62: said once. The Ability reader may already describe it, with its cost.
  const ownTxt = own && !(e.card.ab || []).some(x => !x.passive && x.abil === own.abil) ? ` Its ${own.abil} puts ${own.n / 10} damage counters on 1 of your opponent's Pokemon each turn${own.active ? ' while it is Active' : ''}.` : '';
  // v54: an attack it cannot use two turns in a row.
  const la = r && (e.card.attacks || []).find(a => a.name === r.atk && a.lock);
  const other = la && (e.card.attacks || []).filter(a => a !== la && (a.max || a.dmg) > 0).sort((a, b) => (b.max || b.dmg) - (a.max || a.dmg))[0];
  const lockTxt = !la ? '' : la.lock === 'self'
    ? ` It cannot use ${la.name} two turns in a row, so ${other ? `use ${other.name} or ` : ''}bring in another attacker on the turn between.`
    : ` It cannot attack at all on its next turn after ${la.name}, so switch in another attacker on the turn between.`;
  // v54: Energy its attack discards from itself, which it has to get back before the next big hit.
  const da = r && !r.escale && (e.card.attacks || []).find(a => a.name === r.atk && a.edisc && (!a.edisc.opt || a.edisc.more));
  let discTxt = '';
  if (da) { const d = da.edisc, ty = d.type ? gCap(d.type) + ' ' : '';
    const what = d.n === 'all' ? 'all its Energy' : d.n === 1 ? `${/^[aeiou]/i.test(ty || 'e') ? 'an' : 'a'} ${ty}Energy` : `${d.n} ${ty}Energy`;
    const back = d.n === 'all' ? 'it has to be powered up again' : `it needs ${d.n === 1 ? 'another' : d.n + ' more'} attached`;
    discTxt = d.opt
      ? ` That counts the ${d.more} more it does when it discards ${what} from itself, so ${back} before the next big hit.`
      : ` It discards ${what} from itself each time, so ${back} before it can hit that hard again.`; }
  // v60: what its attack does besides damage, read from the attack's text (Dragapult ex's Phantom Dive).
  const fa = r && (e.card.attacks || []).find(a => a.name === r.atk && (a.fx || []).length);
  const fxTxt = fa ? ` ${fa.name} ${fa.fx.map((x, i) => /^(?:can|hits|flips) /.test(x) ? x : (i ? '' : 'also ') + x.replace(/^also /, '')).join(' and ')}.` : '';
  // v55: an attack gate on its own Ability (Team Rocket's Mewtwo ex's Power Saver).
  const g = e.card.gate;
  const gN = g ? entries.filter(x => x.card && x.card.t === 'pkmn' && x.card.key.startsWith(g.pre)).reduce((k, x) => k + x.qty, 0) : 0;
  const gateTxt = g && gN >= g.n ? ` Its ${g.abil} means it cannot attack until you have ${g.n} or more ${g.pre ? gCap(g.pre).replace(/'S\b/g, "'s") : ''}Pokemon in play, so fill your Bench with them first. The list runs ${gN}.` : '';
  // v62: the main attacker's always-on Abilities too (Iron Thorns ex's Initialization), unless a sentence above already covers one.
  const sb = e.card.sboost && entries.some(x => x.card && x.card.t === 'energy' && (x.card.etypes || []).some(y => y === e.card.sboost.type || y === 'any')) ? e.card.sboost : null;
  const sbTxt = sb ? ` Its ${sb.abil} adds ${sb.n} to its attacks while it has ${gCap(sb.type)} Energy attached${r && r.top ? `, so it hits for ${r.top + sb.n}` : ''}${sb.hp ? `, and gives it ${sb.hp} more HP` : ''}.` : '';
  const pAb = (e.card.ab || []).filter(x => x.passive && !(e.card.pex || []).includes(x.abil) && !(g && g.abil === x.abil) && !(own && own.abil === x.abil))
    .map(x => /^[a-z]+s\b/.test(x.p) ? ` Its ${x.abil} ${x.p}.` : ` With its ${x.abil}, ${x.p}.`).join('');
  out.push({ link: isBox ? `Attackers: ${[nm].concat(tn).join(', ')}` : `Main attacker: ${nm}`, p: `${isBox ? `${tbx.length + 1} different Pokemon here can carry the attack, and you pick the one that fits each turn.${why ? ' ' + why : ''}${how ? ' ' + how.replace(/^Its /, nm + "'s ") : ''}` : `${nm} does the attacking. ${why}${how ? ' ' + how : ''}`}${fxTxt}${discTxt}${lockTxt}${gateTxt}${wall}${ownTxt}${sbTxt}${pAb}${mAb ? ' ' + mAb : ''}` });
  // v54: Pokemon played for an Ability that does damage on its own (Dusknoir's Cursed Blast).
  const dmgAb = [], seenAb = new Set();
  entries.forEach(x => { const c = x.card; if (!c || c.key === m.key || seenAb.has(c.key)) return;
    (c.abDmg || []).forEach(a => { if (a.active) return; seenAb.add(c.key); dmgAb.push({ who: gCap(x.name), a }); }); });
  if (dmgAb.length) {
    const ko = dmgAb.filter(x => x.a.selfKO).map(x => x.who);
    const one = x => `${x.who}'s ${x.a.abil} puts ${x.a.n / 10} damage counters on 1 of your opponent's Pokemon`;
    out.push({ link: `Damage from ${dmgAb.length > 1 ? 'Abilities' : 'an Ability'}: ${dmgAb.map(x => x.who).join(', ')}`,
      p: `${dmgAb.map(one).join(', and ')}, on top of your attack that turn.` +
         (ko.length ? ` Using it Knocks Out ${ko.join(' or ')}, which gives up a prize, so it finishes a knockout rather than starting one.` : '') });
  }
  const sup = entries.filter(x => { const c = x.card;
    if (!c || c.t !== 'pkmn' || c.key === m.key || pre.has(c.key) || !(c.abil || []).length) return false;
    // v60: the Ability itself has to draw or search; attacks add search tags too since v60.
    // 3.2.8: and work in this list (Fix first has not called it dead as built).
    if (!(c.ab || []).some(a => /\b(?:draws?|search(?:es)?|looks at the top)\b/.test(a.p || '') && !((coh && coh.flaws) || []).some(f => f.who === c.key && f.deadAb === a.abil))) return false;
    return (c.attacks || []).every(a => (a.cost || []).every(t => t === 'colorless')); });
  const seen = new Set(), names = [];
  sup.forEach(x => { if (seen.has(x.card.key)) return; seen.add(x.card.key); names.push(`${gCap(x.name)} (${x.card.abil.join(', ')})`); });
  if (names.length) {
    const draws = sup.some(x => (x.card.ab || []).some(a => /\b(?:draws?|looks at the top)\b/.test(a.p || ''))), finds = sup.some(x => (x.card.ab || []).some(a => /\bsearch(?:es)?\b/.test(a.p || '')));
    out.push({ link: `Support: ${[...seen].map(k => gCap(sup.find(x => x.card.key === k).name)).join(', ')}`,
      p: `Played mainly for ${names.length > 1 ? 'their Abilities' : 'its Ability'}, to ${draws && finds ? 'draw and search' : draws ? 'draw cards' : 'search your deck'}: ` +
         `${names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]}. ` +
         (names.length > 1 ? `Their attacks cost only Colorless Energy, so the list's Energy is not picked for them.` : `Its attack costs only Colorless Energy, so the list's Energy is not picked for it.`) });
  }
  // 3.3.2: Pokemon the list runs to set up with a cheap attack (Kingdra ex's King's Order), not to attack.
  const su = ((via && via.setupOut) || []).filter(x => x.name.toLowerCase() !== m.key);
  if (su.length) out.push({ link: `Setup: ${su.map(x => gCap(x.name)).join(', ')}`,
    p: su.map(x => `${gCap(x.name)} is in the list to set up with ${x.atk}, which costs ${x.cost} Energy, so the grade leaves ${x.hit} out of the damage it counts.`).join(' ') });
  // v59: every other Ability the grade can read from card text, so the plan shows what each card adds.
  // Muse s6 M2: the support Pokemon above are listed too, so what their Ability does is said (Fezandipiti ex's Flip the Script).
  const abSeen = new Set([m.key, ...seenAb]), abOut = [];
  entries.forEach(x => { const c = x.card; if (!c || c.t !== 'pkmn' || abSeen.has(c.key) || !(c.abx || c.ab || []).length) return; abSeen.add(c.key);
    (c.abx || c.ab).forEach(a => { let p = `${gCap(x.name)}'s ${a.abil}: ${a.p}`;
      if (a.x) { const hit = [...new Set(entries.filter(y => y.card && y.card.t === 'pkmn' && (y.card.types || []).map(String).map(z => z.toLowerCase()).includes(a.x.ty) && (y.card.attacks || []).some(k => (k.max || k.dmg) > 0)).map(y => gCap(y.name)))];
        p += hit.length ? ` (${hit.slice(0, 3).join(', ')} in this list)` : `, though no ${gCap(a.x.ty)} attacker is in this list`; }
      // 3.2.8: an Ability Fix first calls dead as built (Teal Dance with no Grass Energy) is not shown as working.
      if (((coh && coh.flaws) || []).some(f => f.who === c.key && f.deadAb === a.abil)) p += '. It does nothing in this list';
      abOut.push({ who: gCap(x.name), p }); }); });
  if (abOut.length) out.push({ link: `Abilities: ${[...new Set(abOut.map(z => z.who))].slice(0, 4).join(', ')}${new Set(abOut.map(z => z.who)).size > 4 ? ' and more' : ''}`,
    p: abOut.map(z => z.p).join('. ') + '.' });
  // v63: a lock, mill or stall deck's plan comes first: what it stops, from the card text.
  if (via.ctl || via.ctlMix) { const C = via.ctl || via.ctlMix, word = { lock: 'Lock', mill: 'Mill', stall: 'Stall', denial: 'Disruption' },
    verb = { lock: 'locking', mill: 'milling', stall: 'stalling', denial: 'stripping Energy and cards' };
    const top = C.pieces.filter(x => x.v >= 0.04).slice(0, 5).map(x => gCtlSay(x)).filter(Boolean);
    const also = { lock: 'locks', mill: 'mills', stall: 'walls', denial: 'strips Energy and cards' };
    if (top.length) out.unshift(via.ctl ? { link: `Game plan: ${C.kinds.map(k => word[k]).join(' and ')}`,
      p: `This deck wins by ${C.kinds.map(k => verb[k]).join(' and ')} rather than by trading big hits. ${top.join('. ')}.` }
      : { link: `Also ${C.kinds.map(k => also[k]).join(' and ')}`, p: `Besides attacking, this deck ${C.kinds.map(k => also[k]).join(' and ')}. ${top.join('. ')}.` }); }
  return out;
}

/**
 * v65: the Trainers and Special Energy, judged from their own text.
 * Before this, a Trainer counted only when it carried a role tag (draw, search, gust) and a
 * Special Energy only for the type it gives. Now the grade also asks:
 *   Does each Trainer and Special Energy have something to work on in this list? A card
 *     that needs a Tera Pokemon, a Lillie's Pokemon, a Stage 2 or Basic Fire Energy the list
 *     does not run does nothing. The need is read from the card's words ("only if you have
 *     any Tera Pokemon in play", "to 1 of your Benched Psychic Pokemon", "search your deck
 *     for up to 3 Stage 1 Pokemon"), never from a list of card names.
 *   Is the engine deep enough: Supporters, ways to find Pokemon, to switch, to get cards back?
 *   The ACE SPEC: is there one, is there only one, does it work here, and does it cover the
 *     list's thinnest spot or would another ACE SPEC cover a bigger gap?
 * The result is a Trainer score from 0 to 1 that scales Synergy (a full suite leaves it as it
 * was), problems under Fix first, and one ACE SPEC line under How it plays.
 */
// ACE SPEC cards legal in Standard, with their text (pokemon-tcg-data, regulation mark H and
// later), so the grade can name an ACE SPEC that would fit better. Roles are read from this
// text by the same reader as the list's own cards. A new ACE SPEC still grades from its own
// text in a list; it is only missing as a suggestion until it is added here.
const GT_ACE = {"Awakening Drum":["item","Draw a card for each of your Ancient Pokémon in play."],"Hero's Cape":["tool","The Pokémon this card is attached to gets +100 HP."],"Master Ball":["item","Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck."],"Maximum Belt":["tool","Attacks used by the Pokémon this card is attached to do 50 more damage to your opponent's Active Pokémon ex (before applying Weakness and Resistance)."],"Prime Catcher":["item","Switch in 1 of your opponent's Benched Pokémon to the Active Spot. If you do, switch your Active Pokémon with 1 of your Benched Pokémon."],"Reboot Pod":["item","Attach a Basic Energy card from your discard pile to each of your Future Pokémon."],"Neo Upper Energy":["energy","As long as this card is attached to a Pokémon, it provides Colorless Energy. If this card is attached to a Stage 2 Pokémon, this card provides every type of Energy but provides only 2 Energy at a time."],"Hyper Aroma":["item","Search your deck for up to 3 Stage 1 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck."],"Scoop Up Cyclone":["item","Put 1 of your Pokémon and all attached cards into your hand."],"Secret Box":["item","You can use this card only if you discard 3 other cards from your hand. Search your deck for an Item card, a Pokémon Tool card, a Supporter card, and a Stadium card, reveal them, and put them into your hand. Then, shuffle your deck."],"Survival Brace":["tool","If the Pokémon this card is attached to has full HP and would be Knocked Out by damage from an attack from your opponent's Pokémon, it is not Knocked Out, and its remaining HP becomes 10. Then, discard this card."],"Unfair Stamp":["item","You can use this card only if any of your Pokémon were Knocked Out during your opponent's last turn. Each player shuffles their hand into their deck. Then, you draw 5 cards, and your opponent draws 2 cards."],"Legacy Energy":["energy","As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time. If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, that player takes 1 fewer Prize card. This effect of your Legacy Energy can't be applied more than once per game."],"Dangerous Laser":["item","Your opponent's Active Pokémon is now Burned and Confused."],"Neutralization Zone":["stadium","Prevent all damage done to Pokémon that don't have a Rule Box (both yours and your opponent's) by attacks from the opponent's Pokémon ex and Pokémon V. (Pokémon ex, Pokémon V, etc. have Rule Boxes.) This card can't be put into your hand or deck from the discard pile."],"Poké Vital A":["item","Heal 150 damage from 1 of your Pokémon. This card can't be put into your hand or deck from the discard pile."],"Deluxe Bomb":["tool","If the Pokémon this card is attached to is in the Active Spot and is damaged by an attack from your opponent's Pokémon (even if this Pokémon is Knocked Out), put 12 damage counters on the Attacking Pokémon. If you put any damage counters in this way, discard this card."],"Grand Tree":["stadium","Once during each player's turn, that player may search their deck for a Stage 1 Pokémon that evolves from 1 of their Basic Pokémon and put it onto that Pokémon to evolve it. If that Pokémon was evolved in this way, that player may search their deck for a Stage 2 Pokémon that evolves from that Pokémon and put it onto that Pokémon to evolve it. Then, that player shuffles their deck. (Players can't evolve a Basic Pokémon during their first turn or a Basic Pokémon that was put into play this turn.)"],"Max Rod":["item","Put up to 5 in any combination of Pokémon and Basic Energy cards from your discard pile into your hand."],"Sparkling Crystal":["tool","When the Tera Pokémon this card is attached to uses an attack, that attack costs 1 Energy less. (The Energy can be of any type.)"],"Treasure Tracker":["item","Search your deck for up to 5 Pokémon Tool cards, reveal them, and put them into your hand. Then, shuffle your deck."],"Amulet of Hope":["tool","If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, search your deck for up to 3 cards and put them into your hand. Then, shuffle your deck."],"Brilliant Blender":["item","Search your deck for up to 5 cards and discard them. Then, shuffle your deck."],"Energy Search Pro":["item","Search your deck for any number of Basic Energy cards of different types, reveal them, and put them into your hand. Then, shuffle your deck."],"Megaton Blower":["item","Discard all Pokémon Tools and Special Energy from all of your opponent's Pokémon, and discard a Stadium in play."],"Miracle Headset":["item","Put up to 2 Supporter cards from your discard pile into your hand."],"Precious Trolley":["item","Search your deck for any number of Basic Pokémon and put them onto your Bench. Then, shuffle your deck."],"Scramble Switch":["item","Switch your Active Pokémon with 1 of your Benched Pokémon. If you do, you may move any amount of Energy from the Pokémon you moved to your Bench to the new Active Pokémon."]};

const GT_TY = 'grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless|fairy';
/** Title case for a name read from text ("team rocket's" to "Team Rocket's"). */
function gtCap(s) { return String(s || '').replace(/(^|[\s(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/'S\b/g, "'s"); }
/** Card text, lower case, accents and curly quotes plain. */
function gtNorm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').toLowerCase().replace(/\s+/g, ' ').trim(); }

/**
 * Who a phrase like "Basic Psychic Pokemon", "Lillie's Pokemon", "Stage 2 Pokemon",
 * "Pokemon ex", "Basic Fire Energy" or "Supporter card that has "Team Rocket" in its name"
 * asks for. Returns null when the phrase asks for nothing in particular ("a Pokemon",
 * "Basic Energy cards", "a card"), so only real needs are tested.
 */
function gtSubject(s) {
  s = gtNorm(s).replace(/^(?:up to \d+ |any number of |a |an |\d+ |1 of each |in any combination of )+/, '').replace(/\bcards?\b/g, '').replace(/\s+/g, ' ').trim();
  if (!s || /^(?:other|another)\b/.test(s)) return null;
  if (/pokemon tool/.test(s)) return { k: 'tool' };
  if (/\bstadium\b/.test(s)) return { k: 'stadium' };
  if (/\bsupporter\b/.test(s)) { const m = s.match(/that has "([^"]+)" in its name/); return { k: 'supporter', name: m ? m[1] : null }; }
  if (/\bitem\b/.test(s)) return { k: 'item' };
  if (/\benergy\b/.test(s)) {
    const m = s.match(new RegExp('basic (' + GT_TY + ') energy')); return m ? { k: 'energy', type: m[1] } : null;
  }
  if (!/\bpokemon\b/.test(s)) return null;
  const q = { k: 'pkmn' };
  if (/opponent/.test(s)) return null;
  const pre = s.slice(0, s.indexOf('pokemon'));
  const own = pre.match(/(?:^|\s)((?:team rocket|[a-z]+)'s) /); if (own) q.owner = own[1];
  if (/mega evolution/.test(pre)) q.mega = true;
  else if (/\bstage 2\b/.test(pre)) q.stage = 'stage2';
  else if (/\bstage 1\b/.test(pre)) q.stage = 'stage1';
  else if (/\bevolution\b/.test(pre)) q.evo = true;
  else if (/\bbasic\b/.test(pre)) q.stage = 'basic';
  const ty = pre.match(new RegExp('\\b(' + GT_TY + ')\\b')); if (ty) q.type = ty[1];
  const tag = pre.match(/\b(tera|ancient|future)\b/); if (tag) q.tag = tag[1];
  const post = s.slice(s.indexOf('pokemon') + 7);
  if (/^ ex\b/.test(post)) q.ex = true;
  if (/(?:doesn't|don't|do not|does not) have a rule box/.test(post)) q.noRule = true;
  const hp = post.match(/with (\d+) hp or less/); if (hp) q.hp = +hp[1];
  // "a Pokemon", "your Benched Pokemon": nothing in particular.
  return Object.keys(q).length > 1 ? q : null;
}

/** Does the list hold something a subject asks for? */
function gtHas(entries, q, coh) {
  const cs = entries.filter(e => e.card).map(e => e.card);
  if (q.k === 'energy') return !!(coh.energyTypes[q.type] || coh.energyTypes.any) || cs.some(c => c.t === 'energy' && (c.etypes || []).includes(q.type));
  if (q.k === 'tool' || q.k === 'stadium' || q.k === 'item') return cs.some(c => c.t === 'trainer' && c.tt === q.k);
  if (q.k === 'supporter') return cs.some(c => c.t === 'trainer' && c.tt === 'supporter' && (!q.name || c.key.includes(q.name.toLowerCase())));
  return cs.some(c => {
    if (c.t !== 'pkmn') return false;
    const sub = (c.sub || []).map(x => String(x).toLowerCase()), key = gtNorm(c.key);
    const rule = c.isEx || (c.p || 1) >= 2 || sub.some(x => /\b(ex|mega|radiant|v|vstar|vmax)\b/.test(x));
    if (q.owner && !key.startsWith(q.owner)) return false;
    if (q.mega && !(sub.includes('mega') || /^mega /.test(key))) return false;
    if (q.stage && c.stage !== q.stage) return false;
    if (q.evo && !(c.stage === 'stage1' || c.stage === 'stage2')) return false;
    if (q.type && !(c.types || []).map(t => String(t).toLowerCase()).includes(q.type)) return false;
    if (q.tag && !sub.includes(q.tag)) return false;
    if (q.ex && !c.isEx) return false;
    if (q.noRule && rule) return false;
    if (q.hp && !(c.hp && c.hp <= q.hp)) return false;
    return true;
  });
}
function gtSay(q) {
  if (q.k === 'energy') return `Basic ${gCap(q.type)} Energy`;
  if (q.k === 'tool') return 'Pokemon Tools'; if (q.k === 'stadium') return 'Stadiums'; if (q.k === 'item') return 'Items';
  if (q.k === 'supporter') return q.name ? `a Supporter with "${gtCap(q.name)}" in its name` : 'Supporters';
  const w = [];
  if (q.mega) w.push('Mega Evolution'); else if (q.stage) w.push(q.stage === 'stage2' ? 'Stage 2' : q.stage === 'stage1' ? 'Stage 1' : 'Basic'); else if (q.evo) w.push('Evolution');
  if (q.owner) w.push(gtCap(q.owner)); if (q.type) w.push(gCap(q.type)); if (q.tag) w.push(gCap(q.tag));
  w.push('Pokemon'); if (q.ex) w.push('ex');
  let s = w.join(' '); if (q.noRule) s += ' without a Rule Box'; if (q.hp) s += ` with ${q.hp} HP or less`;
  return s;
}

/**
 * What a Trainer or Special Energy needs from the list, from its text, in three kinds:
 *   gate: "only if you have any X in play", "only if you discard a Basic X Energy" (all must hold)
 *   target: "to 1 of your Benched X Pokemon", "the X Pokemon this card is attached to" (any one)
 *   find: what "search your deck for" or "reveal ... you find there" can find (any one)
 * Returns { gate, target, find } as lists of subjects; empty lists mean no need.
 */
function gtNeeds(text) {
  const t = gtNorm(text).replace(/\([^)]*rule box[^)]*\)/g, '');
  const out = { gate: [], target: [], find: [] };
  const add = (k, s) => { const q = gtSubject(s); if (q) out[k].push(q); };
  const alts = s => s.split(/,? (?:or|and) |, (?:a|an) |, /);
  let m;
  const g1 = /only if you have (?:any )?([^.,]+?) in play/g; while ((m = g1.exec(t))) add('gate', m[1]);
  const g3 = /each player who has (?:any )?([^.,]+?) in play/g; while ((m = g3.exec(t))) add('gate', m[1]);
  const g2 = /only if you discard (?:a|an|\d+) ((?:basic )?[a-z]+ energy)(?: card)? from your hand/g; while ((m = g2.exec(t))) add('gate', m[1]);
  const t1 = /(?:to|on|from) (?:1|one|each|up to \d+|any|2) of your (?:benched )?((?:[a-z'0-9]+ ){0,4}pokemon(?: ex)?)/g; while ((m = t1.exec(t))) add('target', m[1]);
  const t2 = /each of your (?:benched )?((?:[a-z'0-9]+ ){0,4}pokemon(?: ex)?) in play/g; while ((m = t2.exec(t))) add('target', m[1]);
  const t3 = /the ((?:[a-z'0-9]+ ){1,4}pokemon(?: ex)?) this card is attached to/g; while ((m = t3.exec(t))) add('target', m[1]);
  const t4 = /attach this card from your hand to (?:a|an|1 of your) ((?:[a-z'0-9]+ ){0,4}pokemon(?: ex)?)/g; while ((m = t4.exec(t))) add('target', m[1]);
  const t5 = /can only be attached to (?:a|an) ((?:[a-z'0-9]+ ){0,4}pokemon(?: ex)?)/g; while ((m = t5.exec(t))) add('target', m[1]);
  const f1 = /search your deck for ([^.]+?)(?:,? reveal|,? and put|\.|, (?:shuffle|then))/g;
  while ((m = f1.exec(t))) { const all = alts(m[1]).map(gtSubject); if (all.every(Boolean)) out.find.push(...all); }
  const f2 = /you may reveal (?:up to \d+ in any combination of |a |an )?([^.]+?) you find there/g;
  while ((m = f2.exec(t))) { const all = alts(m[1]).map(gtSubject); if (all.every(Boolean)) out.find.push(...all); }
  return out;
}

/** Which needs the list cannot meet. [] when the card has something to work on. */
function gtUnmet(entries, coh, text) {
  const n = gtNeeds(text), miss = [];
  n.gate.forEach(q => { if (!gtHas(entries, q, coh)) miss.push(q); });
  if (n.target.length && !n.target.some(q => gtHas(entries, q, coh))) miss.push(n.target[0]);
  if (n.find.length && !n.find.some(q => gtHas(entries, q, coh))) miss.push(n.find[0]);
  return miss;
}

/**
 * The jobs a Trainer or Special Energy does, from its text: what the grade weighs it for.
 * 2.8.2: reads every legal Trainer. Energy removal, hand disruption, Tool removal, damage cuts,
 * attack Tools, Fossils, extra Prizes and the rest each have a job of their own, and Stadium text
 * ("their deck", "their Bench") reads like your own. A cost in symbols reads as "Colorless" words.
 */
function gtRoles(text, kind) {
  const t = gtNorm(text), r = new Set();
  const C = '(?:\\{c\\}|colorless)+';   // "{C}{C}" and "ColorlessColorless" both read as Colorless symbols
  if (/switch(?: in)? 1 of your opponent's benched (?:[a-z]+ ){0,2}pokemon/.test(t)) r.add('gust');
  if (/switch (?:your|their) active (?:[a-z]+ )?pokemon with 1 of (?:your|their) benched|switch that pokemon with your active pokemon|(?:has|have) no retreat cost|put 1 of your pokemon and all attached cards into your hand/.test(t)
    || new RegExp(`retreat cost[^.]{0,90}? is (?:\\d+|c+|${C}) less`).test(t)) r.add('switch');
  if (/\bdraws? (?:\d+ |a )?cards?\b|draws? a card for each|draws? cards until|look at the top \d+ cards of your deck and put (?:up to )?\d+ (?:of them )?into your hand/.test(t.replace(/(?:your opponent|they) draws? (?:\d+ cards?|that many cards)/g, ''))) r.add('draw');
  if (/search (?:your|their) deck for (?!up to \d+ cards and discard)/.test(t) || /you may reveal [^.]+ you find there/.test(t)) r.add('search');
  if (/from (?:your|their) discard pile into (?:your|their) (?:hand|deck)|shuffle [^.]+ from your discard pile into your deck/.test(t)) r.add('recovery');
  if (/attach [^.]{0,60}energy[^.]{0,40}from your (?:deck|discard pile)|search your deck for [^.]{0,60}energy[^.]{0,40} and attach (?:it|them)\b|look at the top \d+ cards of your deck and attach [^.]{0,80}energy[^.]{0,30} you find there|provides every type of energy|costs \d+ energy less/.test(t)
    || new RegExp(`cost (?:\\d+ energy|${C}) less`).test(t)) r.add('energy');
  // Moving Energy between your own Pokemon (Energy Switch, N's Plan, Heavy Baton). Moving it off the Attacking Pokemon is disruption.
  const mv = t.match(/move (?:a|an|\d+|any amount of|up to \d+) [^.]{0,40}?energy(?: cards?)? from ([^.]{0,30})/);
  if (mv && !/^(?:the attacking|your opponent's)/.test(mv[1])) r.add('energy');
  if (/gets \+\d+ hp|is not knocked out|takes 1 fewer prize/.test(t)) r.add('survive');
  if (/takes? \d+ less damage/.test(t)) r.add('reduce');
  if (/do \d+ more damage|put \d+ damage counters on 1 of your opponent's|put \d+ more damage counters on each poisoned/.test(t)) r.add('damage');
  if (/take \d+ more prize cards?/.test(t)) r.add('prize');
  if (/can use the attack on this card/.test(t)) r.add('attack');
  if (/ignore all results of those coin flips/.test(t)) r.add('coins');
  if (/heal (?:\d+|all) damage/.test(t)) r.add('heal');
  if (/double the amount of damage healed/.test(t)) r.add('healup');
  if (/discard (?:a|an|\d+) (?:special |basic )?energy from (?:1 of )?your opponent's|discard [^.]{0,30}special energy(?: card)? from 1 of your opponent's|put an energy attached to 1 of your opponent's pokemon into their hand/.test(t)) r.add('denial');
  if (/your opponent reveals their hand, and you (?:discard|choose)|(?:your opponent|each player) discards cards from their hand|your opponent counts the cards in their hand|card from your opponent's hand/.test(t)) r.add('hand');
  if (/pokemon tools? attached to [^.]{0,80}(?:discard them|have no effect)|discard a pokemon tool [^.]{0,40}from 1 of your opponent's/.test(t)) r.add('tools');
  if (/your opponent shuffles|each player shuffles their hand|opponent's active pokemon is now|discard all pokemon tools and special energy|discard a stadium in play|(?:put|place) \d+ damage counters on (?:the attacking|that pokemon)|the attacking pokemon is now|pokemon in play \((?:both yours and your opponent's|yours and your opponent's)\) have no abilities/.test(t)
    || /both active [^.]{0,30}pokemon are now|switch out your opponent's active pokemon|opponent's face-down prize|from the attacking pokemon to 1 of your opponent's|(?:opponent's|their) [^.]{0,30}pokemon can't retreat|gets -\d+ hp|don't recover from that special condition/.test(t)
    || new RegExp(`retreat cost of both active pokemon is ${C} more|cost ${C} more`).test(t)) r.add('disrupt');
  if (/onto your bench|and put (?:it|them) onto their bench|up to \d+ pokemon on their bench/.test(t)) r.add('bench');
  if (/evolve it|skipping the stage 1|can evolve into [^.]{0,40} during the turn they play/.test(t)) r.add('evolve');
  if (/play this card as if it were a \d+-hp basic/.test(t)) r.add('fossil');
  if (/in your discard pile[^.]{0,40} and switch it with 1 of your/.test(t)) r.add('swapin');
  if (/devolve 1 of your/.test(t)) r.add('devolve');
  if (/search your deck for up to \d+ cards and discard them|discard the top \d+ cards of your deck|look at the top \d+ cards of your deck and discard any number/.test(t)) r.add('discard');
  if (/put a card from their hand on top of their deck|look at the top \d+ cards of your deck and put them back|look at the top \d+ cards of your deck and discard any number/.test(t)) r.add('order');
  if (/count your prize cards, shuffle them/.test(t)) r.add('prizes');
  if (/prevent all damage/.test(t)) r.add('protect');
  if (kind !== 'energy' && /recovers from all special conditions/.test(t)) r.add('cure');
  if (kind === 'energy' && !r.size) r.add('energy');
  return r;
}
const GT_ROLE_SAY = { gust: 'pulls up a Benched Pokemon', switch: 'switches your Active Pokemon', draw: 'draws you cards', search: 'finds cards in your deck',
  recovery: 'gets cards back from your discard pile', energy: 'helps pay Energy costs', survive: 'keeps an attacker alive longer', damage: 'adds damage',
  heal: 'heals', disrupt: 'disrupts your opponent', bench: 'fills your Bench', evolve: 'speeds up evolving', discard: 'fills your discard pile', protect: 'blocks damage',
  reduce: 'cuts the damage your Pokemon take', prize: 'takes extra Prize cards', attack: 'gives a Pokemon another attack', coins: "lets an attack's coins be flipped again",
  denial: "removes your opponent's Energy", hand: "disrupts your opponent's hand", tools: 'gets rid of Pokemon Tools', fossil: 'plays as a Basic Pokemon to evolve from',
  swapin: 'swaps in a Pokemon from your discard pile', devolve: 'devolves your Pokemon to use them again', order: 'sets up the top of your deck',
  prizes: 'swaps out your Prize cards', cure: 'stops Special Conditions', healup: 'makes healing stronger' };
const GT_ROLE_DO = { gust: 'pull up a Benched Pokemon', switch: 'switch your Active Pokemon', draw: 'draw you cards', search: 'find your Pokemon',
  recovery: 'get cards back from your discard pile', energy: 'help pay Energy costs', survive: 'keep an attacker alive longer', damage: 'add damage',
  heal: 'heal', disrupt: 'disrupt your opponent', bench: 'fill your Bench', evolve: 'speed up evolving', discard: 'fill your discard pile', protect: 'block damage',
  reduce: 'cut the damage your Pokemon take', prize: 'take extra Prize cards', attack: 'give a Pokemon another attack', coins: "let an attack's coins be flipped again",
  denial: "remove your opponent's Energy", hand: "disrupt your opponent's hand", tools: 'get rid of Pokemon Tools', fossil: 'play as a Basic Pokemon to evolve from',
  swapin: 'swap in a Pokemon from your discard pile', devolve: 'devolve your Pokemon to use them again', order: 'set up the top of your deck',
  prizes: 'swap out your Prize cards', cure: 'stop Special Conditions', healup: 'make healing stronger' };

function gtQ(entries, f) { return entries.reduce((a, e) => a + (e.card && f(e.card) ? e.qty : 0), 0); }

// v76 (2.5): Trainer quality. builder.json lists every Trainer and Energy that the top quarter of recent
// events ran. A Trainer or Special Energy that none of those winning lists runs is a slot they spend on
// something else, so each copy costs the Trainer score a little (capped). The grade waits for this list
// the way it waits for tournament results; offline with no saved copy, this part is left out.
const G76_KEY = 'pt_played', G76_COPY = 0.035, G76_CAP = 0.3, G76_DRAW = 6, G76_DRAW_CUT = 0.04;
let g76Played = null, g76Busy = false, g76Tried = false, g76N = 0;
// 2.5.2: Pokemon TCG Live writes Energy types as symbols ("Telepathic {P} Energy"); the played list
// spells them out ("Telepathic Psychic Energy"), so a symbol reads as its type word before the match.
const G76_SYM = { g: 'grass', r: 'fire', w: 'water', l: 'lightning', p: 'psychic', f: 'fighting', d: 'darkness', m: 'metal', y: 'fairy', n: 'dragon', c: 'colorless' };
const g76Key = n => rules34Key(String(n || '')).replace(/\{([a-z])\}/g, (m, k) => G76_SYM[k] || ' ').replace(/[^a-z0-9]+/g, ' ').trim();
/** Read builder.json's played list into a set of card names; false when it is missing or malformed. */
function g76Set(j) {
  const rows = j && Array.isArray(j.played) ? j.played.filter(r => Array.isArray(r) && typeof r[0] === 'string' && r[1] > 0) : [];
  if (rows.length < 30 || !(j.lists >= 40)) return false;
  g76Played = new Set(rows.map(r => g76Key(r[0]))); g76N = j.lists;
  return true;
}
/** The saved copy at once, the newest copy from the site once per page load. */
function g76Load() {
  if (!g76Played) { try { g76Set(JSON.parse(safeLocalGet(G76_KEY) || 'null')); } catch (_) {} }
  if (g76Busy || g76Tried) return;
  g76Busy = true;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
  fetch('builder.json', { cache: 'no-cache', signal: ctl ? ctl.signal : undefined })
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j && g76Set(j)) safeLocalSet(G76_KEY, JSON.stringify({ lists: j.lists, asOf: j.asOf, played: j.played })); })
    .catch(() => {})
    .finally(() => { clearTimeout(t); g76Busy = false; g76Tried = true; if (typeof g71Redraw === 'function') g71Redraw(); });
}
// Read the saved list at once, so grades in the deck list match the grade screen.
try { g76Load(); } catch (_) {}

function gTrainers(entries, coh, via, main, fmt) {
  const flaws = [], cut = [];
  const cards = entries.filter(e => e.card);
  const trn = cards.filter(e => e.card.t === 'trainer');
  const spE = cards.filter(e => e.card.t === 'energy' && (e.card.sub || []).map(String).map(x => x.toLowerCase()).includes('special'));
  const has = (c, p) => (c.provides || []).includes(p);
  const text = c => c.t === 'energy' ? (c.et || '') : (c.rt || '');
  const roleOf = new Map();
  [...trn, ...spE].forEach(e => roleOf.set(e.card.key, gtRoles(text(e.card), e.card.t === 'energy' ? 'energy' : e.card.tt)));
  const notAce = c => !c.ace;

  // 1. Cards with nothing to work on in this list.
  const dead = [];
  [...trn, ...spE].forEach(e => { const tx = text(e.card); if (!tx) return;
    const miss = gtUnmet(entries, coh, tx);
    if (miss.length) dead.push({ e, miss }); });
  dead.filter(d => !d.e.card.ace).forEach(d => {
    const what = [...new Set(d.miss.map(gtSay))].join(' or ');
    const isE = d.e.card.t === 'energy', only = isE && /can only be attached to/.test(gtNorm(text(d.e.card)));
    flaws.push({ sev: 'warn', t: `${gCap(d.e.name)} has nothing to work with`,
      d: `${gCap(d.e.name)} needs ${what}, and the list runs none, so ${d.e.qty > 1 ? `the ${d.e.qty} copies do` : 'it does'} nothing${only ? ', since it can only be attached to them' : isE ? ' beyond giving Energy' : ''}. Cut ${d.e.qty > 1 ? 'them' : 'it'} or add ${what}.` });
    cut.push(isE ? 0.06 : 0.12); });

  // 2. The engine: Supporters, finding Pokemon, switching and getting cards back.
  const sup = gtQ(entries, c => c.t === 'trainer' && c.tt === 'supporter');
  const anyMon = cards.some(e => e.card.t === 'pkmn');
  // 3.2.7: Trainers whose card data has not loaded yet may be Supporters, so they are not counted as missing.
  const supUnk = gtQ(entries, c => c.t === 'trainer' && !c.tt) + entries.reduce((a, e) => a + (e.card ? 0 : e.qty), 0);
  if (anyMon && sup < 7 && sup + supUnk < 7) {
    flaws.push({ sev: 'warn', t: `Only ${sup} Supporter${sup === 1 ? '' : 's'}`,
      d: `You can play one Supporter a turn, and most of your draw and your Boss's Orders style plays come from them. With ${sup}, many turns open with none in hand. Most lists run 9 to 14.` });
    cut.push(sup < 5 ? 0.2 : 0.1); }
  const find = gtQ(entries, c => (c.t === 'trainer' || (c.t === 'energy')) && (has(c, 'search_pokemon') || has(c, 'search_basic')))
    + gtQ(entries, c => c.t === 'pkmn' && (has(c, 'search_pokemon') || has(c, 'search_basic')));
  const evo = cards.some(e => e.card.t === 'pkmn' && (e.card.stage === 'stage1' || e.card.stage === 'stage2'));
  if (evo && find > 0 && find <= 3) {
    flaws.push({ sev: 'warn', t: `Only ${find} way${find === 1 ? '' : 's'} to find your Pokemon`,
      d: `${find} card${find === 1 ? '' : 's'} in the list search${find === 1 ? 'es' : ''} your deck for a Pokemon, so setting up your attackers leans on drawing them. Most lists that evolve run 6 or more, like Ultra Ball, Poké Pad or Buddy-Buddy Poffin.` });
    cut.push(0.1); }
  const swT = cards.filter(e => e.card.t !== 'pkmn' && notAce(e.card) && (roleOf.get(e.card.key) || new Set()).has('switch'));
  const swQ = swT.reduce((a, e) => a + e.qty, 0) + gtQ(entries, c => c.t === 'pkmn' && c.swab);
  const gustQ = gtQ(entries, c => notAce(c) && has(c, 'gust'));
  // 3.3.2: a Pokemon whose Ability puts a Pokemon back from your discard pile (Gengar's Netherworld Gate) is recovery too.
  const recQ = gtQ(entries, c => notAce(c) && c.t !== 'pkmn' && ((roleOf.get(c.key) || new Set()).has('recovery') || has(c, 'recovery')))
    + gtQ(entries, c => c.t === 'pkmn' && (c.rev || []).some(r => r.src === 'ability'));
  const drawQ = gtQ(entries, c => notAce(c) && has(c, 'draw'));
  const abil = cards.filter(e => e.card.t === 'pkmn' && (e.card.abil || []).length && (has(e.card, 'draw') || has(e.card, 'search_pokemon') || has(e.card, 'search_basic') || has(e.card, 'energy_accel')));
  const abilQ = abil.reduce((a, e) => a + e.qty, 0);
  const stadQ = gtQ(entries, c => c.t === 'trainer' && c.tt === 'stadium');
  // Switching and a Stadium of your own are left alone: about a third of winning lists run no switch card,
  // and the ones with no Stadium still place, so neither is a flaw on its own.

  // 3. The ACE SPEC.
  const aces = cards.filter(e => e.card.ace);
  const aceN = aces.reduce((a, e) => a + e.qty, 0);
  // What the rest of the list is thinnest on, measured the same way for every deck.
  const gap = [];
  if (gustQ === 0 && !via.ctl) gap.push({ role: 'gust', say: 'nothing else in the list pulls up a Benched Pokemon' });
  if (evo && find <= 3) gap.push({ role: 'search', say: find ? `only ${find} other cards find Pokemon` : 'nothing else finds Pokemon' });
  if (drawQ + abilQ <= 3 && !via.ctl) gap.push({ role: 'draw', say: `only ${drawQ + abilQ} other cards draw` });
  let ace = null;
  if (anyMon && aceN === 0) {
    const alt = gtAceFor(entries, coh, gap);
    flaws.push({ sev: 'warn', t: 'No ACE SPEC',
      d: `Every deck may run one ACE SPEC card, and nearly every winning list does. It is a free upgrade.${alt ? ` ${alt.name} would suit this list: ${alt.why}.` : ''}` });
    cut.push(0.2);
    ace = { link: 'ACE SPEC: none', p: `The list runs no ACE SPEC.${alt ? ` ${alt.name} would ${GT_ROLE_DO[alt.role]}, and ${alt.why}.` : ''}`, alt: alt && alt.name };
  } else if (aceN === 1) {
    const e = aces[0], c = e.card, tx = text(c) || (GT_ACE[gCap(e.name)] || GT_ACE[e.name] || [])[1] || '';
    const roles = gtRoles(tx, c.t === 'energy' ? 'energy' : c.tt);
    const miss = tx ? gtUnmet(entries, coh, tx) : [];
    const nm = gCap(e.name);
    const does = [...roles].slice(0, 2).map(r => GT_ROLE_SAY[r]).join(' and ') || 'does its own job';
    if (miss.length) {
      const what = [...new Set(miss.map(gtSay))].join(' or ');
      const alt = gtAceFor(entries, coh, gap, e.name);
      flaws.push({ sev: 'warn', t: `Your ACE SPEC, ${nm}, has nothing to work with`,
        d: `${nm} needs ${what}, and the list runs none, so your one ACE SPEC slot does nothing.${alt ? ` ${alt.name} would ${GT_ROLE_DO[alt.role]} instead.` : ''}` });
      cut.push(0.2);
      ace = { link: `ACE SPEC: ${nm}`, p: `Needs ${what}, which this list does not run.`, fit: 'dead', alt: alt && alt.name };
    } else {
      const covers = gap.find(g => roles.has(g.role));
      const alt = covers ? null : gtAceFor(entries, coh, gap, e.name);
      if (covers) ace = { link: `ACE SPEC: ${nm}`, p: `${nm} ${does}, and that fills a hole: ${covers.say}.`, fit: 'covers' };
      else if (alt) {
        ace = { link: `ACE SPEC: ${nm}`, p: `${nm} ${does}. ${alt.name} might fit better, since ${alt.why}.`, fit: 'weak', alt: alt.name };
        // A suggestion, not a flaw: winning lists pick their ACE SPEC for reasons a count of cards cannot see.
      } else ace = { link: `ACE SPEC: ${nm}`, p: `${nm} ${does}. It works with this list.`, fit: 'fine' };
    }
  }
  // Two or more ACE SPEC cards break a deck building rule. The rules box above the grade marks the list
  // not legal; this line says which cards, so the fix is plain.
  if (aceN > 1) ace = { link: `ACE SPEC: ${aceN} cards`, p: `The list runs ${aces.map(e => `${e.qty > 1 ? e.qty + ' ' : ''}${gCap(e.name)}`).join(' and ')}. A deck can hold only one ACE SPEC card, so cut down to one before you play it.`, fit: 'over' };

  // 4. v76: too little draw. Every one of the 128 top lists runs 6 or more cards or Abilities that draw.
  // 2.5.1: the played list below is from Standard top lists, so it applies to Standard decks only.
  const g76Std = !fmt || fmt === 'standard';
  if (anyMon && !via.ctl && drawQ + abilQ < G76_DRAW) {
    const n = drawQ + abilQ;
    flaws.push({ sev: 'warn', t: n ? `Only ${n} card${n === 1 ? '' : 's'} that draw` : 'Nothing in the list draws cards',
      d: `Winning lists run 6 or more cards or Abilities that draw, most of them 10 or more, so a slow hand turns around. With ${n || 'none'}, a bad opening hand stays bad.` });
    cut.push(Math.min(0.2, G76_DRAW_CUT * (G76_DRAW - n))); }
  // 5. v76: Trainers and Special Energy no winning list runs.
  const unplayed = [];
  if (g76Std && g76Played) {
    const deadN = new Set(dead.map(d => d.e.name)), seen = new Map();
    [...trn, ...spE].forEach(e => { if (deadN.has(e.name) || g76Played.has(g76Key(e.name))) return;
      const k = g76Key(e.name), o = seen.get(k); if (o) o.qty += e.qty; else seen.set(k, { name: gCap(e.name), qty: e.qty }); });
    unplayed.push(...seen.values());
    const n = unplayed.reduce((a, x) => a + x.qty, 0);
    if (n) {
      const nm = unplayed.map(x => `${x.qty > 1 ? x.qty + ' ' : ''}${x.name}`), say = nm.length > 3 ? nm.slice(0, 3).join(', ') + `, and ${nm.length - 3} more` : nm.join(' and ');
      flaws.push({ sev: 'warn', t: `${n} card${n === 1 ? '' : 's'} no winning list runs`,
        d: `None of the ${g76N} top lists from recent events runs ${say}. Each copy is a slot those lists spend on a card that wins more.` });
      cut.push(Math.min(G76_CAP, G76_COPY * n)); }
  }

  const score = gClamp(1 - cut.reduce((a, x) => a + x, 0), 0, 1);
  const counts = { sup, find, swQ, gustQ, recQ, drawQ, abilQ, stadQ, aceN };
  // v70: a fit label for each card. Explain only: nothing here changes score.
  let fit = [];
  try { fit = gtFit(entries, coh, via, main, { dead: dead.map(d => d.e.name), counts, unplayed: unplayed.map(x => x.name) }); } catch (_) {}
  return { score, flaws, ace, dead: dead.map(d => d.e.name), unplayed: unplayed.map(x => x.name), counts, fit };
}

/** An ACE SPEC from the table that covers one of the list's gaps and works with the list. */
function gtAceFor(entries, coh, gap, except) {
  for (const g of gap) for (const [name, [kind, tx]] of Object.entries(GT_ACE)) {
    if (except && gtNorm(name) === gtNorm(except)) continue;
    const roles = gtRoles(tx, kind);
    if (!roles.has(g.role)) continue;
    if (gtUnmet(entries, coh, tx).length) continue;
    // A card that also needs a condition on the opponent or a turn (Unfair Stamp after a Knock Out) still works, so it stays.
    return { name, role: g.role, why: g.say };
  }
  return null;
}

/**
 * v70: a fit label for each Trainer and Special Energy, explain only (it does not move a grade).
 *   Does nothing: the list runs nothing the card needs.
 *   Key: does a core job (draw, finding Pokemon, pulling up a Benched Pokemon, evolving, Energy)
 *        and is the list's main card for it, or Rare Candy into a Stage 2 line.
 *   Weak: every job it does is already covered by more cards than most winning lists run.
 *   Good: anything else that works.
 * Weak and Does nothing cards get a swap idea: what the list is thinnest on, from a card it already
 * runs or a staple that works with it. The counts that set "thin" and "crowded" are what the
 * 128 top lists run (Nov 2026): most run 2 or more ways to pull up a Benched Pokemon, 7 or more
 * ways to find Pokemon in a deck that evolves, 8 or more draw cards and 1 or more recovery cards,
 * and few run more than 4 switch cards or 3 recovery cards.
 */
const GT_POOL = {
  "Boss's Orders": ['supporter', "Switch in 1 of your opponent's Benched Pokémon to the Active Spot."],
  "Lillie's Determination": ['supporter', 'Shuffle your hand into your deck. Then, draw 6 cards. If you have exactly 6 Prize cards remaining, draw 8 cards instead.'],
  'Ultra Ball': ['item', 'You can use this card only if you discard 2 other cards from your hand. Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.'],
  'Poké Pad': ['item', "Search your deck for a Pokémon that doesn't have a Rule Box, reveal it, and put it into your hand. Then, shuffle your deck."],
  'Night Stretcher': ['item', 'Put a Pokémon or a Basic Energy card from your discard pile into your hand.'],
  'Switch': ['item', 'Switch your Active Pokémon with 1 of your Benched Pokémon.'],
};
const GT_CORE = ['gust', 'draw', 'search', 'evolve', 'energy'];
// Copies of a job past which another card doing it adds little.
// Healing, blocking damage and staying alive are left out: a wall deck runs many on purpose.
// v71: switch and recovery match the counts above (few lists run more than 4 and 3).
const GT_CROWD = { switch: 4, gust: 5, recovery: 3, disrupt: 6, discard: 3, bench: 6 };
const GT_LABEL = { key: 'Key', good: 'Good', weak: 'Weak', dead: 'Does nothing' };

function gtFit(entries, coh, via, main, ctx) {
  const cards = entries.filter(e => e.card);
  const isSpE = c => c.t === 'energy' && (c.sub || []).map(x => String(x).toLowerCase()).includes('special');
  const pool = cards.filter(e => (e.card.t === 'trainer' || isSpE(e.card)));
  if (!pool.length) return [];
  const text = c => c.t === 'energy' ? (c.et || '') : (c.rt || '');
  const kind = c => c.t === 'energy' ? 'energy' : c.tt;
  const roleOf = new Map(pool.map(e => [e.card.key, gtRoles(text(e.card), kind(e.card))]));
  // One row per card name, however many printings the list names.
  const one = new Map(); pool.forEach(e => { const o = one.get(e.card.key); if (o) o.qty += e.qty; else one.set(e.card.key, { name: e.name, qty: e.qty, card: e.card }); });
  // Pokemon search counts cards that search for Pokemon, Trainers or Abilities alike, as the grade does.
  const has = (c, p) => (c.provides || []).includes(p);
  const copies = {};
  pool.forEach(e => { if (e.card.ace) return; roleOf.get(e.card.key).forEach(r => { copies[r] = (copies[r] || 0) + e.qty; }); });
  const P = cards.filter(e => e.card.t === 'pkmn');
  const st2 = P.filter(e => e.card.stage === 'stage2');
  const mainSt2 = main && st2.find(e => e.card.key === main.key);
  const s2 = mainSt2 || st2.sort((a, b) => b.qty - a.qty)[0];
  const nm = gCap, up = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  const deadSet = new Set(ctx.dead || []);
  // 3.2.8: how much Energy the list runs, and whether the main attacker's attacks all cost nothing (Igglybuff).
  const eCards = entries.filter(e => e.card && e.card.t === 'energy').reduce((a, e) => a + e.qty, 0);
  const mainC = main && (entries.find(e => e.card && e.card.key === main.key) || {}).card;
  const mainFree = !!(mainC && (mainC.attacks || []).length && mainC.attacks.every(a => !(a.cost || []).length));
  const out = [];
  one.forEach(e => {
    const c = e.card, roles = roleOf.get(c.key), tx = text(c);
    if (c.ace) return;   // the ACE SPEC has its own line
    const row = { name: nm(e.name), qty: e.qty, kind: c.t === 'energy' ? 'Special Energy' : gCap(c.tt || 'item'), roles: [...roles] };
    if (deadSet.has(e.name)) {
      const miss = gtUnmet(entries, coh, tx);
      row.fit = 'dead';
      row.why = `Needs ${[...new Set(miss.map(gtSay))].join(' or ')}, and the list runs none.`;
    } else if (!st2.length && roles.has('evolve') && /skipping the stage 1/.test(gtNorm(tx))) {
      // 3.2.8: as Fix first says, Rare Candy with no Stage 2 in the list cannot be played.
      row.fit = 'dead';
      row.why = 'The list has no Stage 2 Pokemon, so it cannot be played.';
    } else if (roles.size && [...roles].every(r => r === 'energy') && !eCards) {
      // 3.2.8: a card whose only job is Energy does nothing in a list with no Energy.
      row.fit = 'dead';
      row.why = 'Its only job is Energy, and the list runs no Energy.';
    } else if (roles.size && [...roles].every(r => r === 'energy') && mainFree) {
      row.fit = 'weak';
      row.why = `Helps pay Energy costs, but ${nm(main.name)}'s attacks cost no Energy.`;
    } else if (roles.has('evolve') && s2 && /skipping the stage 1/.test(gtNorm(tx)) && (() => {
      // v71: Rare Candy needs the line's Basic in the list, or it has nothing to go on.
      const s1 = P.find(x => x.card.key === s2.card.from);
      return !(s1 && s1.card.from && !P.some(x => x.card.key === s1.card.from));
    })()) {
      row.fit = 'key';
      const s1 = P.find(x => x.card.key === s2.card.from);
      row.why = `Skips ${s1 ? nm(s1.name) : 'the Stage 1'} to get ${nm(s2.name)} out a turn sooner.`;
    } else if (roles.has('evolve') && s2 && /skipping the stage 1/.test(gtNorm(tx))) {
      const s1 = P.find(x => x.card.key === s2.card.from);
      row.fit = 'dead';
      row.why = `Needs ${nm(s1.card.from)} in the list to put ${nm(s2.name)} on, and the list runs none.`;
    } else {
      const core = [...roles].filter(r => GT_CORE.includes(r));
      const lead = core.find(r => { const n = copies[r] || 0;
        const most = Math.max(...[...one.values()].filter(x => !x.card.ace && roleOf.get(x.card.key).has(r)).map(x => x.qty));
        return n && (e.qty === most) && (e.qty >= 2 || n === e.qty) && e.qty / n >= 0.3; });
      const crowded = roles.size && [...roles].every(r => GT_CROWD[r] && (copies[r] || 0) - e.qty >= GT_CROWD[r]);
      if (lead) {
        row.fit = 'key';
        const n = copies[lead];
        row.why = lead === 'gust' && n === e.qty ? `Your only card that pulls up a Benched Pokemon, which is how you take the prizes you choose.`
          : lead === 'energy' && main ? `${up(GT_ROLE_SAY.energy)} for ${nm(main.name)}${n > e.qty ? `, ${e.qty} of the ${n} cards that do` : ''}.`
          : `${up(GT_ROLE_SAY[lead])}: ${n === e.qty ? `your only ${c.t === 'energy' ? 'card' : 'Trainer'} that does` : `${e.qty} of the ${n} cards that do`}.`;
      } else if ((ctx.unplayed || []).includes(nm(e.name))) {
        // v76: no winning list runs it.
        row.fit = 'weak';
        row.why = `${roles.size ? up(GT_ROLE_SAY[[...roles][0]]) + ', but no' : 'No'} winning list from recent events runs it.`;
      } else if (crowded) {
        row.fit = 'weak';
        const r = [...roles][0];
        row.why = `${up(GT_ROLE_SAY[r])}, but ${copies[r] - e.qty} other cards in the list already do that, more than most winning lists run, so this one adds little.`;
      } else {
        row.fit = 'good';
        const r = [...roles][0];
        row.why = r ? `${up(GT_ROLE_SAY[r])}${roles.size > 1 ? ` and ${GT_ROLE_SAY[[...roles][1]]}` : ''}${(copies[r] || 0) > e.qty ? `, one of ${copies[r]} cards that do` : ''}.` : '';
        // v71: a card whose job RdyDeck doesn't read gets no label, not Good on its say-so.
        // 2.8.2: RdyDeck reads every legal card now (tests/grade-check.mjs checks), so this is left for a card whose text was not read.
        if (!r && !tx) { row.fit = null; row.why = "RdyDeck hasn't read this card's text yet, so it has no label. Open the deck online to read it."; }
        else if (!r) { row.fit = null; row.why = c.tt === 'stadium' ? "RdyDeck can't read what this Stadium does for this list, so it has no label. Playing it does remove a Stadium your opponent has in play." : "RdyDeck can't read what this card does for this list, so it has no label."; }
      }
    }
    out.push(row);
  });
  // Swap ideas for Weak and Does nothing: the job the list is thinnest on.
  const k = ctx.counts || {}, evo = P.some(e => e.card.stage === 'stage1' || e.card.stage === 'stage2');
  const thin = [];
  if (!via.ctl && (k.gustQ || 0) < 2) thin.push({ role: 'gust', v: 2 - (k.gustQ || 0), say: (k.gustQ ? `only ${k.gustQ} card pulls` : 'nothing pulls') + ' up a Benched Pokemon' });
  if (evo && (k.find || 0) < 7) thin.push({ role: 'search', v: (7 - (k.find || 0)) / 3.5, say: k.find ? `only ${k.find} ${k.find === 1 ? 'card finds' : 'cards find'} Pokemon` : 'nothing in the list finds Pokemon' });
  if (!via.ctl && (k.drawQ || 0) + (k.abilQ || 0) < 8) thin.push({ role: 'draw', v: (8 - (k.drawQ || 0) - (k.abilQ || 0)) / 4, say: (k.drawQ || 0) + (k.abilQ || 0) ? `only ${(k.drawQ || 0) + (k.abilQ || 0)} ${(k.drawQ || 0) + (k.abilQ || 0) === 1 ? 'card draws' : 'cards draw'}` : 'nothing in the list draws cards' });
  if ((k.recQ || 0) < 1) thin.push({ role: 'recovery', v: 0.5, say: 'nothing returns cards from your discard pile to your hand or deck' });
  thin.sort((a, b) => b.v - a.v);
  const inList = new Set(cards.map(e => e.card.key));
  // Each card to swap takes the next job the list is short on, so the ideas do not all name one card.
  const swapFor = (self, start) => {
    for (let i = 0; i < thin.length; i++) { const g = thin[(start + i) % thin.length];
      // One more of a card the list already runs for that job, if there is room.
      const own = [...one.values()].filter(x => !x.card.ace && x.card.key !== self && x.qty < 4 && roleOf.get(x.card.key).has(g.role) && !gtUnmet(entries, coh, text(x.card)).length)
        .sort((a, b) => b.qty - a.qty)[0];
      if (own) return { name: nm(own.name), more: true, why: g.say };
      for (const [name, [kd, tx]] of Object.entries(GT_POOL)) {
        if (inList.has(name.toLowerCase())) continue;
        if (!gtRoles(tx, kd).has(g.role) || gtUnmet(entries, coh, tx).length) continue;
        // Poke Pad finds only Pokemon with no Rule Box.
        if (/rule box/.test(gtNorm(tx)) && !P.some(x => !x.card.isEx && !(x.card.p >= 2) && !/^radiant /i.test(x.name))) continue;
        return { name, more: false, why: g.say };
      }
    }
    return null;
  };
  let n = 0;
  out.forEach(r => { if (r.fit === 'weak' || r.fit === 'dead') { const s = thin.length ? swapFor(r.name.toLowerCase(), n++) : null; if (s) r.swap = s; } });
  const order = { key: 0, good: 1, weak: 2, dead: 3 };
  out.sort((a, b) => (order[a.fit] ?? 1.5) - (order[b.fit] ?? 1.5) || b.qty - a.qty);
  return out;
}

/**
 * 2.8.3: how each Trainer and Special Energy works in this deck in particular. One short line read
 * from the card's own text and the list's own Pokemon, attackers and Energy: which Pokemon a Tool
 * or Special Energy goes on and what it changes there (HP, the damage that Knocks it Out, an
 * attack's damage, free retreat), which of the list's Pokemon a search card finds, which of your
 * own Abilities or Tools a Stadium turns off, and what a card can't do in this list. A card whose
 * text has nothing to say about this list (Boss's Orders, Judge) gets no line rather than filler.
 * Explain only: nothing here changes a grade or a label.
 */
function gtPkFits(c, q) {
  if (!c || c.t !== 'pkmn') return false;
  if (!q) return true;
  const sub = (c.sub || []).map(x => String(x).toLowerCase()), key = gtNorm(c.key);
  const rule = c.isEx || (c.p || 1) >= 2 || sub.some(x => /\b(ex|mega|radiant|v|vstar|vmax)\b/.test(x));
  if (q.owner && !key.startsWith(q.owner)) return false;
  if (q.mega && !(sub.includes('mega') || /^mega /.test(key))) return false;
  if (q.stage && c.stage !== q.stage) return false;
  if (q.evo && !(c.stage === 'stage1' || c.stage === 'stage2')) return false;
  if (q.type && !(c.types || []).map(t => String(t).toLowerCase()).includes(q.type)) return false;
  if (q.tag && !sub.includes(q.tag)) return false;
  if (q.ex && !c.isEx) return false;
  if (q.noRule && rule) return false;
  if (q.hp && !(c.hp && c.hp <= q.hp)) return false;
  return true;
}

function gtHereCtx(entries, coh, via, main, deck) {
  const raw = new Map();
  ((deck && deck.cards) || []).forEach(c => { const k = String(c.name || '').toLowerCase(); if (!raw.has(k)) raw.set(k, c); });
  const reach = (via && via.reach) || [], top = Math.max(0, ...reach.map(r => r.eff || 0));
  const effOf = new Map(); reach.forEach(r => { const k = String(r.name).toLowerCase(); effOf.set(k, Math.max(effOf.get(k) || 0, r.eff || 0)); });
  const mainKey = main ? String(main.key || main.name || '').toLowerCase() : '';
  // One row per Pokemon name, its best attack read from the grade's own attack data.
  const byName = new Map();
  entries.forEach(e => {
    const c = e.card; if (!c || c.t !== 'pkmn') return;
    const o = byName.get(c.key);
    if (o) { o.qty += e.qty; return; }
    const best = (c.attacks || []).filter(a => (a.dmg || 0) > 0).sort((a, b) => (b.dmg || 0) - (a.dmg || 0))[0] || null;
    const r = raw.get(c.key) || {};
    byName.set(c.key, { name: e.name, qty: e.qty, c, best, rc: r.retreat != null ? +r.retreat : null,
      eff: effOf.get(c.key) || 0, atk: top > 0 && (effOf.get(c.key) || 0) * 2 >= top, main: c.key === mainKey,
      text: [].concat((r.attacks || []).map(a => a.text || ''), (r.atext || []).map(x => x[1] || '')).join(' ') });
  });
  // Main attacker first, then the other attackers by damage, then the rest by copies.
  const P = [...byName.values()].sort((a, b) => (b.main - a.main) || (b.atk - a.atk) || (b.eff - a.eff) || (b.qty - a.qty));
  const basicE = {};
  entries.forEach(e => { const c = e.card; if (!c || c.t !== 'energy') return;
    if ((c.sub || []).map(x => String(x).toLowerCase()).includes('special')) return;
    (c.etypes && c.etypes.length ? c.etypes : c.etype ? [c.etype] : []).forEach(t => { basicE[t] = (basicE[t] || 0) + e.qty; }); });
  const T = entries.filter(e => e.card && e.card.t === 'trainer');
  const total = entries.reduce((a, e) => a + (e.qty || 0), 0);
  return { P, basicE, T, total, entries, coh, main: P.find(x => x.main) || null };
}

/** "A", "A or B", "A, B or C", "A, B and 2 more". */
function gtHereNames(list, conj, max) {
  const n = [...new Set(list.map(x => x.name))], m = max || 3;
  if (n.length > m) return n.slice(0, m - 1).join(', ') + (conj === 'or' ? ` or ${n.length - m + 1} others` : ` and ${n.length - m + 1} more`);
  return n.length < 2 ? (n[0] || '') : n.slice(0, -1).join(', ') + ` ${conj || 'or'} ` + n[n.length - 1];
}
const gtHereTy = t => gCap(t);
const gtHereOne = q => q.k === 'tool' ? 'Pokemon Tool' : q.k === 'stadium' ? 'Stadium' : q.k === 'item' ? 'Item' : q.k === 'supporter' ? (q.name ? `${gtCap(q.name)} Supporter` : 'Supporter') : q.k === 'energy' ? `Basic ${gCap(q.type)} Energy` : gtSay(q);
/** The chance the top (or bottom) n of a deck of size d holds at least one of k cards. */
function gtHereOdds(d, k, n) {
  if (k <= 0 || d <= 0) return 0;
  let p = 1; for (let i = 0; i < n; i++) p *= Math.max(0, d - k - i) / (d - i);
  return Math.round(100 * (1 - p));
}

function gtHere(trn, entries, coh, via, main, deck) {
  if (!trn) return;
  let X; try { X = gtHereCtx(entries, coh, via, main, deck); } catch (_) { return; }
  const cardOf = new Map(entries.filter(e => e.card).map(e => [gtNorm(e.name), e.card]));
  (trn.fit || []).forEach(r => {
    const c = cardOf.get(gtNorm(r.name)); if (!c) return;
    try { const s = gtHereLine(c, X); if (s) r.here = s; } catch (_) {}
  });
  if (trn.ace) {
    const nm = String(trn.ace.link || '').replace(/^ACE SPEC: /, '');
    const c = cardOf.get(gtNorm(nm));
    if (c && trn.ace.fit !== 'over') { try { const s = gtHereLine(c, X); if (s) trn.ace.here = s; } catch (_) {} }
  }
}

function gtHereLine(card, X) {
  const raw = card.t === 'energy' ? (card.et || '') : (card.rt || '');
  if (!raw) return null;
  const t = gtNorm(raw).replace(/\([^)]*rule box[^)]*\)/g, '').replace(/\((?:existing effects|damage from attacks is still|this includes|that pokemon can't|players can't)[^)]*\)/g, '').replace(/\s+/g, ' ');
  const both = /\((?:both yours and your opponent's|yours and your opponent's)\)/;
  const tb = t.replace(/ \((?:both yours and your opponent's|yours and your opponent's)\)/g, '');
  const P = X.P, A = P.filter(p => p.atk), self = gtNorm(card.key);
  const fits = q => P.filter(p => gtPkFits(p.c, q));
  const atkFirst = L => { const a = L.filter(p => p.atk); return a.length ? a : L; };
  const sayQ = q => q ? gtSay(q) : 'Pokemon';
  let m;

  // Stadiums and other cards that work on both players
  if ((m = t.match(/(?:^|\. )([^.]*?)pokemon in play \((?:both yours and your opponent's|yours and your opponent's)\) have no abilities/))) {
    const q = gtSubject(m[1] + 'pokemon');
    const own = fits(q).filter(p => (p.c.abil || []).length);
    if (own.length) return `Also turns off your own ${own.slice(0, 2).map(p => `${p.name}'s ${p.c.abil[0]}`).join(' and ')}${own.length > 2 ? ` and ${own.length - 2} more` : ''}.`;
    return `None of your own Pokemon lose an Ability to it.`;
  }
  if (/prevent all damage counters from being placed on benched pokemon \(both yours/.test(t)) {
    const own = P.filter(p => /(?:put|place) (?:\d+|that many) damage counters on (?:1 of )?your opponent's (?:benched )?pokemon|damage counters on [^.]*?your opponent's benched/.test(gtNorm(p.text)));
    return own.length ? `Also stops your own ${gtHereNames(own, 'and', 2)} from placing damage counters on the Bench.` : null;
  }
  if (/pokemon tools attached to each pokemon \(both yours/.test(t)) {
    const own = X.T.filter(e => e.card.tt === 'tool' && gtNorm(e.card.key) !== self);
    return own.length ? `Also turns off your own ${gtHereNames(own, 'and')}.` : `You run no Pokemon Tools, so it only turns off your opponent's.`;
  }
  if ((m = t.match(/each ([^.]*?pokemon) in play \(both yours and your opponent's\) gets -(\d+) hp/))) {
    const q = gtSubject(m[1]), own = atkFirst(fits(q));
    if (own.length) return `Your own ${own[0].name} drops to ${own[0].c.hp - +m[2]} HP too.`;
    return `You run no ${sayQ(q)}, so only your opponent's lose HP.`;
  }
  if ((m = t.match(/puts a basic non-(\w+) pokemon onto their bench[^.]*?place (\d+) damage counters/))) {
    const own = P.filter(p => p.c.stage === 'basic' && !(p.c.types || []).includes(m[1]));
    return own.length ? `Your own ${gtHereNames(own, 'and')} take ${+m[2] * 10} damage when you Bench them.` : `Your Basic Pokemon are all ${gtHereTy(m[1])}, so it never hits your side.`;
  }
  if ((m = t.match(/^([^.]*?pokemon) \(both yours and your opponent's\) take (\d+) less damage/))) {
    const q = gtSubject(m[1]), own = atkFirst(fits(q));
    return own.length ? `Your ${gtHereNames(own, 'and')} take ${m[2]} less damage too.` : `You run no ${sayQ(q)}, so it only helps your opponent's.`;
  }
  if ((m = t.match(/attacks used by each ([^.]*?pokemon) in play \(both yours and your opponent's\) cost/))) {
    const q = gtSubject(m[1]), own = atkFirst(fits(q));
    return own.length ? `Your own ${gtHereNames(own, 'and')} pay more for attacks too.` : `You run no ${sayQ(q)}, so only your opponent pays more.`;
  }
  if ((m = t.match(/^([^.]*?pokemon) in play \(both yours and your opponent's\) have no retreat cost/))) {
    const own = fits(gtSubject(m[1])).filter(p => p.rc > 0);
    return own.length ? `Lets ${gtHereNames(own, 'and')} retreat for free.` : null;
  }
  if ((m = t.match(/switch their active (\w+) pokemon with 1 of their benched \1 pokemon/))) {
    const own = fits({ k: 'pkmn', type: m[1] });
    return own.length >= 2 ? `Switches between your ${gtHereNames(own, 'and')} once a turn.` : null;
  }
  if ((m = t.match(/each player's (\w+) pokemon can evolve into \1 pokemon during the turn they play/))) {
    const by = new Map(P.map(p => [p.c.key, p]));
    const s1 = atkFirst(P.filter(p => p.c.stage === 'stage1' && (p.c.types || []).includes(m[1]) && by.has(p.c.from)))[0];
    return s1 ? `Lets ${by.get(s1.c.from).name} evolve into ${s1.name} the turn you play it.` : null;
  }
  if (/double the amount of damage healed/.test(t)) {
    const src = [];
    X.T.forEach(e => { if (gtNorm(e.card.key) === self) return; const h = gtNorm(e.card.rt || '').match(/heal (\d+|all) damage/); if (h) src.push({ name: e.name, n: h[1] }); });
    P.forEach(p => { const h = gtNorm(p.text).match(/heal (\d+) damage from (?:this pokemon|1 of your|each of your|your)/); if (h) src.push({ name: p.name, n: h[1] }); });
    if (!src.length) return `Nothing else in your list heals, so only your opponent gets the bonus.`;
    const s = src[0];
    return s.n === 'all' ? `Your ${gtHereNames(src, 'and', 2)} heal${src.length > 1 ? '' : 's'} all damage anyway, so it adds little here.`
      : `Doubles ${s.name}'s healing from ${s.n} to ${+s.n * 2}${src.length > 1 ? `, and ${src[1].name}'s too` : ''}.`;
  }
  if ((m = t.match(/if they played a supporter card that has "([^"]+)" in its name/))) {
    const own = X.T.filter(e => e.card.tt === 'supporter' && e.card.key.includes(m[1].toLowerCase()));
    const n = own.reduce((a, e) => a + e.qty, 0);
    const who = own.length && own.every(e => gtNorm(e.name).startsWith(m[1].toLowerCase() + "'s")) ? `${gtCap(m[1])}'s` : `"${gtCap(m[1])}"`;
    return n ? `Draws 2 after any of your ${n} ${who} Supporter${n === 1 ? '' : 's'}.` : null;
  }
  if ((m = t.match(/each player who has any ([^.]*?pokemon) in play can have up to (\d+) pokemon on their bench/))) {
    const own = fits(gtSubject(m[1]));
    return own.length ? `Gives you ${m[2]} Bench spots while ${gtHereNames(own, 'or')} is in play.` : null;
  }

  // Team and count conditions
  if ((m = t.match(/if all of your pokemon in play are ([^.]*?pokemon), draw cards until you have (\d+)/))) {
    const q = gtSubject(m[1]), not = P.filter(p => !gtPkFits(p.c, q));
    return not.length ? `Draws to ${m[2]} only while ${gtHereNames(not, 'and', 2)} stay${not.length === 1 && P.filter(p => !gtPkFits(p.c, q)).length === 1 ? 's' : ''} out of play.` : `Every Pokemon in your list is ${gtSay(q).replace(/ Pokemon$/, '')}, so it draws to ${m[2]}.`;
  }
  if ((m = t.match(/discard up to (\d+) ([^.]*?pokemon[^.]*?) from your hand, and draw (\d+) cards for each/))) {
    const own = fits(gtSubject(m[2])).filter(p => !p.main);
    return own.length ? `Turns spare Pokemon like ${gtHereNames(own.slice(0, 2), 'or')} into ${m[3]} cards each.` : null;
  }
  if ((m = t.match(/attack used by your ([^.]*?pokemon), take 1 more prize/))) {
    const q = gtSubject(m[1]), own = fits(q).filter(p => p.best);
    return own.length ? `Works when ${gtHereNames(atkFirst(own), 'or')} takes the Knock Out.` : `None of your attackers is a ${sayQ(q).replace(/ Pokemon$/, '')} Pokemon, so it never adds a Prize.`;
  }

  // Special Energy
  if (card.t === 'energy') {
    if ((m = t.match(/when you attach this card from your hand to a (\w+) pokemon, search your deck for up to (\d+) ([^.]*?pokemon) and put them onto your bench/))) {
      const to = atkFirst(fits({ k: 'pkmn', type: m[1] })), find = fits(gtSubject(m[3]));
      if (!to.length || !find.length) return null;
      return `On a ${gtHereTy(m[1])} Pokemon like ${to[0].name}, it Benches up to ${m[2]} of ${gtHereNames(find, 'and')}.`;
    }
    if (/if this card is discarded by an effect of an attack used by the pokemon/.test(t)) {
      const own = P.filter(p => (p.c.attacks || []).some(a => a.edisc));
      if (!own.length) return `None of your attacks discards Energy, so it won't come back.`;
      const a = own[0].c.attacks.find(x => x.edisc);
      return `Comes back after ${own[0].name}'s ${a.name} discards it.`;
    }
    if ((m = t.match(/if this card is attached to (?:a|an) ([^,]*?pokemon), (?:this card )?(?:it |this card )?provides (every type of energy|(?:colorless){2,} energy)(?: instead)?(?! but)|if this card is attached to (?:a|an) ([^,]*?pokemon), (?:it |this card )?provides (every type of energy) but provides only (\d+) energy at a time/))) {
      const subj = m[1] || m[3], q = gtSubject(subj), own = A.filter(p => gtPkFits(p.c, q) && p.best);
      if (!own.length) return `None of your attackers is a ${sayQ(q).replace(/ Pokemon$/, '')} Pokemon, so it only gives Colorless.`;
      const p = own[0], cost = p.best.cost || [];
      if (m[2] && /colorless/.test(m[2])) {
        const k = cost.filter(x => x === 'colorless').length;
        if (!k) return null;
        return `On ${p.name}, it pays ${k === 1 ? 'the' : Math.min(3, k) + ' of the'} Colorless for ${p.best.name}${/discard it at the end of your turn/.test(t) ? ', for one turn' : ''}.`;
      }
      const n = +(m[5] || 1);
      return n === 1 ? `On a ${sayQ(q).replace(/ Pokemon$/, '')} like ${p.name}, it counts as any type for ${p.best.name}.` : `On ${p.name}, it pays ${n} of the Energy for ${p.best.name}.`;
    }
    if ((m = t.match(/can only be attached to an? ([^.]*?pokemon)[^]*?provides (\d+) in any combination of (\w+) energy and (\w+) energy/))) {
      const q = gtSubject(m[1]), ok = [m[3], m[4], 'colorless'];
      const own = A.filter(p => gtPkFits(p.c, q) && p.best && (p.best.cost || []).filter(x => ok.includes(x)).length >= 2);
      return own.length ? `Pays 2 of the Energy for ${own[0].name}'s ${own[0].best.name}.` : null;
    }
    const prov = (t.match(/provides (colorless|grass|fire|water|lightning|psychic|fighting|darkness|metal|every type of) energy/) || [])[1];
    const held = (t.match(/the ((?:[a-z]+ ){0,3}?pokemon) this card is attached to/) || [])[1];
    const q = held ? gtSubject(held) : null;
    const fx = /prevent all effects of attacks/.test(t) ? 'Shields' : /recovers from all special conditions/.test(t) ? 'Keeps' : null;
    if (fx && prov) {
      let own = A.filter(p => p.best && gtPkFits(p.c, q));
      if (prov === 'colorless') own = own.filter(p => (p.best.cost || []).includes('colorless'));
      else if (prov !== 'every type of') own = own.filter(p => (p.best.cost || []).some(x => x === prov || x === 'colorless'));
      if (!own.length) return prov === 'colorless' ? `None of your attacks has a Colorless in its cost, so it only pays Retreat Costs.` : null;
      const nm = gtHereNames(own.slice(0, 2), fx === 'Shields' ? 'or' : 'and');
      return fx === 'Shields' ? `Shields ${nm} from attack effects, like Special Conditions.`
        : `Keeps ${nm} free of Special Conditions.`;
    }
    if (prov === 'colorless' && !/takes? 1 fewer prize|more damage|\+\d+ hp|no retreat cost/.test(t)) {
      const own = A.filter(p => p.best && (p.best.cost || []).includes('colorless'));
      return own.length ? `Can pay the Colorless in ${own[0].name}'s ${own[0].best.name}${own[1] ? ` or ${own[1].name}'s ${own[1].best.name}` : ''}.`
        : `None of your attacks has a Colorless in its cost, so it only pays Retreat Costs.`;
    }
  }

  // What a Tool or Special Energy does to the Pokemon it is on
  if ((m = t.match(/the ((?:[a-z']+ ){0,3}?)pokemon this card is attached to gets \+(\d+) hp/))) {
    const q = m[1] ? gtSubject(m[1] + 'pokemon') : null, own = atkFirst(fits(q).filter(p => p.c.hp));
    if (!own.length) return null;
    const n = +m[2];
    return `Takes ${own[0].name} from ${own[0].c.hp} to ${own[0].c.hp + n} HP${own[1] ? `, or ${own[1].name} to ${own[1].c.hp + n}` : ''}.`;
  }
  if ((m = t.match(/(?:if the pokemon this card is attached to (isn't|is) (?:a |an )?([^,]+?), )?it takes (\d+) less damage from attacks from your opponent's ([^.(]+?pokemon(?: ex)?)/))
      || (m = t.match(/()()is damaged by an attack from your opponent's ([^.,]*?pokemon(?: ex)?), it takes (\d+) less damage/))) {
    let n, from, notQ = null;
    if (m[3] && /^\d+$/.test(m[3])) { n = +m[3]; from = m[4]; if (m[1] === "isn't") notQ = gtSubject(m[2]); }
    else { from = m[3]; n = +m[4]; }
    const own = atkFirst(P.filter(p => p.c.hp && !(notQ && gtPkFits(p.c, notQ))));
    if (!own.length) return notQ ? `Your Pokemon are all ${gtSay(notQ)}, which it doesn't work on.` : null;
    const p = own[0], tm = from.match(new RegExp('^(' + GT_TY + ') pokemon$'));
    const who = tm ? `${gtHereTy(tm[1])} attackers` : /^mega evolution pokemon ex$/.test(from) ? 'Mega ex attackers' : gtCap(from).replace(/\bEx\b/g, 'ex');
    return `On ${p.name}, ${who} need ${p.c.hp + n} damage to Knock it Out, not ${p.c.hp}.`;
  }
  if ((m = t.match(/all of your ([^.]*?pokemon) take (\d+) less damage/))) {
    const own = atkFirst(fits(gtSubject(m[1])));
    return own.length ? `Your ${gtHereNames(own, 'and')} take ${m[2]} less damage that turn.` : null;
  }
  if ((m = t.match(/if the ((?:[a-z']+ ){0,3}?)pokemon this card is attached to is knocked out[^.]*?takes 1 fewer prize/))) {
    const q = m[1] ? gtSubject(m[1] + 'pokemon') : null, own = atkFirst(fits(q)).filter(p => (p.c.p || 1) >= 2);
    if (!own.length) return q && !fits(q).length ? null : null;
    const p = own[0];
    return `On ${p.name}, your opponent takes ${p.c.p - 1} Prize${p.c.p - 1 === 1 ? '' : 's'} for it, not ${p.c.p}${/once per game/.test(t) ? ', once a game' : ''}.`;
  }
  if ((m = t.match(/retreat cost of the pokemon this card is attached to is ((?:colorless)+|\d+) less/))) {
    const n = /^\d+$/.test(m[1]) ? +m[1] : m[1].length / 9;
    const free = P.filter(p => p.rc > 0 && p.rc <= n), still = P.filter(p => p.rc > n && (p.atk || p.qty >= 2));
    if (!free.length) return null;
    return `Lets ${gtHereNames(free, 'and')} retreat for free${still.length ? `; ${still[0].name} still pays ${still[0].rc - n}` : ''}.`;
  }
  if ((m = t.match(/the ((?:[a-z]+ ){0,3}?)pokemon this card is attached to has no retreat cost/))) {
    const own = fits(m[1] ? gtSubject(m[1] + 'pokemon') : null).filter(p => p.rc > 0).sort((a, b) => b.rc - a.rc);
    return own.length ? `Lets ${own[0].name} retreat for free (it costs ${own[0].rc} now).` : null;
  }
  if ((m = t.match(/has a retreat cost of exactly (\d+)/))) {
    const own = P.filter(p => p.rc === +m[1]);
    if (!own.length) return `None of your Pokemon has a Retreat Cost of exactly ${m[1]}, so it never triggers.`;
    const mv = t.match(/move up to (\d+) basic energy/);
    return `${mv ? `Saves up to ${mv[1]} Energy when ${gtHereNames(own, 'or')} is Knocked Out` : `Works on ${gtHereNames(own, 'or')}`}, ${own.length > 1 ? 'your Pokemon' : 'the only Pokemon here'} with a Retreat Cost of ${m[1]}.`;
  }

  // More damage
  {
    let q = null, n = 0, vsEx = false, ok = false, poison = false;
    if ((m = tb.match(/attacks used by (?:the |your |each )?([^.]*?pokemon(?: ex)?(?: that (?:don't|doesn't) have a rule box)?)(?: this card is attached to)?(?: cost [^.]*? and)? do (\d+) more damage(?! for each)( to your opponent's active pokemon ex)?/))) {
      ok = true; n = +m[2]; vsEx = !!m[3]; poison = /poisoned/.test(m[1]);
      q = poison ? null : gtSubject(m[1].replace(/^(?:the |your )/, ''));
      if (/active pokemon ex and active pokemon v/.test(tb)) vsEx = true;
    } else if ((m = tb.match(/if the pokemon this card is attached to (doesn't have a rule box)[^.]*?the attacks it uses do (\d+) more damage( to your opponent's active pokemon ex)?/))) {
      ok = true; n = +m[2]; vsEx = !!m[3]; q = { k: 'pkmn', noRule: true };
    }
    if (ok) {
      if (poison) {
        const src = [].concat(X.T.filter(e => /(?:it|your active pokemon|the new active pokemon) is now poisoned/.test(gtNorm(e.card.rt || '')) && !/opponent's active pokemon is now/.test(gtNorm(e.card.rt || ''))).map(e => e.name),
          P.filter(p => /(?:the new active pokemon|your active pokemon) is now poisoned/.test(gtNorm(p.text))).map(p => p.name));
        return src.length ? `Turns on once your own Pokemon is Poisoned, which ${src[0]} does here.` : `Nothing in your list Poisons your own Pokemon, so it never turns on.`;
      }
      const own = A.filter(p => p.best && gtPkFits(p.c, q));
      if (!own.length) return q ? `None of your attackers is ${gtSay(q).replace(/^Pokemon without/, 'without').replace(/ Pokemon$/, '')}, so it adds nothing here.`.replace('is without', 'is free of a Rule Box').replace(/ a Rule Box, so/, ', so') : null;
      const p = own[0];
      return `${p.name}'s ${p.best.name} goes from ${p.best.dmg} to ${p.best.dmg + n}${vsEx ? ' against Pokemon ex' : ''}.`;
    }
  }

  // Energy onto your Pokemon
  if (/\battach\b/.test(t) && /energy/.test(t) && !/when you attach this card/.test(t)) {
    const sm = t.match(/(?:1|one|each|up to \d+|any|2) of your (?:benched )?((?:[a-z'0-9]+ ){0,4}?pokemon(?: ex)?)/);
    const q = sm ? gtSubject(sm[1]) : null;
    if (q && q.k === 'pkmn') {
      const own = fits(q);
      if (!own.length) return null;
      const g = gtNeeds(t).gate.filter(x => x.k === 'pkmn'), gn = g.length ? fits(g[0]) : [];
      const n = +((t.match(/attach up to (\d+) basic/) || [])[1] || 0);
      const gs = !gn.length ? '' : gn.length > 2 ? `, once a ${gtSay(g[0]).replace(/ Pokemon$/, '')} Pokemon like ${gn[0].name} is in play` : `, once ${gtHereNames(gn, 'or')} is in play`;
      return `Puts ${n > 1 ? n + ' ' : ''}Energy on ${gtHereNames(atkFirst(own), 'or', 2)}${n > 1 ? ' at once' : ''}${gs}.`;
    }
  }

  // Odds for a look at the top or bottom of the deck
  if ((m = t.match(/look at the (top|bottom) (\d+) cards of your deck\. you may reveal (?:a |an |any number of |up to \d+ in any combination of |up to \d+ )?([^.]+?) you find there/))) {
    const subs = m[3].split(/ and | or /);
    let k = 0, say = [];
    subs.forEach(s => {
      const q = gtSubject(s), n = gtNorm(s);
      if (/supporter/.test(n)) { k += X.T.filter(e => e.card.tt === 'supporter').reduce((a, e) => a + e.qty, 0); say.push('Supporters'); }
      else if (q && q.k === 'energy') { k += X.basicE[q.type] || 0; say.push(`Basic ${gCap(q.type)} Energy`); }
      else if (/pokemon/.test(n)) { const own = fits(q); k += own.reduce((a, p) => a + p.qty, 0); say.push(q ? gtSay(q) : 'Pokemon'); }
    });
    if (!k) return null;
    const pct = gtHereOdds(X.total || 60, k, +m[2]);
    return `With ${k} ${say.join(' and ')} in your ${X.total || 60} cards, ${pct >= 99 ? 'it almost always finds one' : `it finds one about ${pct}% of the time`}.`;
  }

  // Evolving
  if (/search their deck for a stage 1 pokemon that evolves from 1 of their basic pokemon/.test(t)) {
    const by = new Map(P.map(p => [p.c.key, p]));
    const s2 = atkFirst(P.filter(p => p.c.stage === 'stage2')).find(h => { const s1 = by.get(h.c.from); return s1 && by.get(s1.c.from); });
    if (s2) { const s1 = by.get(s2.c.from), b = by.get(s1.c.from); return `Can turn ${b.name} into ${s2.name} in one go.`; }
    return null;
  }
  if (/search your deck for a card that has no abilities and evolves from 1 of your pokemon/.test(t)) {
    const own = P.filter(p => (p.c.stage === 'stage1' || p.c.stage === 'stage2') && !(p.c.abil || []).length);
    return own.length ? `Can evolve straight into ${gtHereNames(atkFirst(own), 'or')}.` : `All your Evolution Pokemon have Abilities, so it finds nothing.`;
  }
  if ((m = t.match(/devolve 1 of your evolved ([^.]*?pokemon)/))) {
    const own = P.filter(p => (p.c.stage === 'stage1' || p.c.stage === 'stage2') && gtPkFits(p.c, gtSubject(m[1])));
    return own.length ? `Works on ${gtHereNames(own, 'or')}.` : null;
  }

  // Searching the deck
  if ((m = t.match(/search (?:your|their) deck for ([^.]+?)(?:,? reveal|,? and put|\.|, (?:shuffle|then)| and attach)/))) {
    const ph = m[1], combo = /any combination/.test(ph), parts = ph.replace(/^(?:up to \d+ |any number of )?in any combination of /, '').split(/,? and |, or | or (?!less|more)|, (?=a |an )/).map(s => s.trim()).filter(Boolean);
    const all = !combo && / and /.test(ph) && parts.length >= 2;
    const bench = /onto (?:your|their) bench/.test(t);
    const PK = [], E = [], miss = [];
    let genPk = false, genE = false, diffTypes = /of different types/.test(ph);
    parts.forEach(s => {
      const q = gtSubject(s), n = gtNorm(s);
      if (q && q.k === 'pkmn') { const own = fits(q); PK.push({ q, own }); if (!own.length) miss.push(q); }
      else if (q && q.k === 'energy') { E.push(q); if (!X.basicE[q.type]) miss.push(q); }
      else if (q) { if (!X.T.some(e => e.card.tt === q.k && (!q.name || e.card.key.includes(q.name.toLowerCase())))) miss.push(q); else PK.push({ q, own: [] }); }
      else if (/pokemon/.test(n)) genPk = true;
      else if (/energy/.test(n)) genE = true;
    });
    const types = Object.keys(X.basicE).filter(k => X.basicE[k] > 0);
    if (all && miss.length && miss.length < parts.length)
      return `Your list has no ${miss.map(gtHereOne).join(' or ')}, so it finds ${parts.length - miss.length} card${parts.length - miss.length === 1 ? '' : 's'}, not ${parts.length}.`;
    if (all && !miss.length) {
      const st2 = PK.find(x => x.q.stage === 'stage2');
      if (st2 && PK.some(x => x.q.stage === 'basic') && PK.some(x => x.q.stage === 'stage1')) {
        const by = new Map(P.map(p => [p.c.key, p])), heads = atkFirst(st2.own);
        for (const h of heads) { const s1 = by.get(h.c.from), b = s1 && by.get(s1.c.from); if (s1 && b) return `Gets a whole ${b.name}, ${s1.name} and ${h.name} line at once.`; }
        return null;
      }
      const tr = [];
      ['stadium', 'tool'].forEach(k => { if (PK.some(x => x.q.k === k)) { const own = X.T.filter(e => e.card.tt === k && gtNorm(e.card.key) !== self).sort((a, b) => b.qty - a.qty); if (own.length) tr.push(own[0].name); } });
      const evo = PK.find(x => x.q.k === 'pkmn');
      // 3.2.8: only name what can reach the board, so the note never sells a Pokemon the list cannot evolve into.
      const evoOk = evo ? evo.own.filter(p => g115Can(X.entries, { card: p.c })) : [];
      if (evo && evo.own.length && !evoOk.length && !tr.length) return null;
      // 3.2.8: and no Energy is named when the list runs none to find.
      const andE = (E.length || genE) && X.entries.some(x => x.card && x.card.t === 'energy') ? ' and an Energy' : '';
      if (evo && evoOk.length && !tr.length) return `Finds ${gtHereNames(atkFirst(evoOk), 'or')}${andE} together.`;
      return tr.length ? `Gets your ${tr.join(' and ')}${andE} together.` : null;
    }
    if (!PK.length && !genPk && (E.length || genE)) {
      if (diffTypes) {
        if (types.length === 1) return `Your only Basic Energy is ${gtHereTy(types[0])}, so it finds just 1 card.`;
        if (types.length === 2) return /attach the other/.test(t) ? `Gets one ${gtHereTy(types[0])} and one ${gtHereTy(types[1])} Energy, one to your hand and one attached.` : `Gets one ${gtHereTy(types[0])} and one ${gtHereTy(types[1])} Energy.`;
        return types.length === 3 ? `Picks 2 of your ${types.map(gtHereTy).join(', ').replace(/, (\w+)$/, ' and $1')} Energy.` : null;
      }
      if (all && miss.length) return null;
      if (E.length && miss.length && miss.length < E.length) return `Your list runs no Basic ${miss.map(x => gCap(x.type)).join(' or ')} Energy, so it finds only ${E.filter(x => X.basicE[x.type]).map(x => gCap(x.type)).join(' and ')}.`;
      const up = +((ph.match(/up to (\d+)/) || [])[1] || 0);
      if (E.length === 1 && up >= 4) { const n = X.basicE[E[0].type] || 0; return n ? `${n <= up ? (n === 1 ? 'Gets your only' : `Can take all ${n}`) : `Takes ${up} of your ${n}`} Basic ${gCap(E[0].type)} Energy at once.` : null; }
      return null;
    }
    const pk = PK.filter(x => x.q.k === 'pkmn');
    if (pk.length) {
      const own = [...new Set(pk.flatMap(x => x.own))];
      if (!own.length) return null;
      const L = atkFirst(own).concat(own.filter(p => !p.atk)), uniq = [...new Set(L)];
      const upN = +((ph.match(/^up to (\d+)/) || [])[1] || 0);
      if (uniq.length === 1 && upN > 1 && !E.length) return `${bench ? 'Benches' : 'Gets'} up to ${Math.min(upN, uniq[0].qty)} ${uniq[0].name} at once.`;
      if (bench && /^any number of /.test(ph)) return uniq.length >= 2 ? `Can Bench every Basic you run at once, like ${gtHereNames(uniq.slice(0, 2), 'and')}.` : null;
      if (pk.length >= 2 && uniq.length === P.length && P.length > 3) {
        const key = [...new Set([X.main, ...P.filter(p => p.atk && !p.main), ...P.filter(p => (p.c.ab || []).some(a => !a.passive))].filter(Boolean))].slice(0, 3);
        return key.length >= 2 ? `Key targets: ${gtHereNames(key, 'and')}.` : null;
      }
      const eS = E.length ? [{ name: `a Basic ${E.map(x => gCap(x.type)).join(' or ')} Energy` }] : [];
      let s = uniq.length > 3 ? `${bench ? 'Can Bench' : 'Finds'} any of your ${uniq.length} ${pk.length === 1 ? gtSay(pk[0].q) : 'matching Pokemon'}, like ${gtHereNames(uniq.slice(0, 2), 'or')}${eS.length ? `, or ${eS[0].name}` : ''}.`
        : `${bench ? 'Can Bench' : 'Finds'} ${gtHereNames(uniq.slice(0, eS.length ? 2 : 3).concat(eS), 'or', 4)}.`;
      const hq = pk.find(x => x.q.hp);
      if (hq) { const big = P.filter(p => p.c.stage === hq.q.stage && !gtPkFits(p.c, hq.q) && (!hq.q.type || (p.c.types || []).includes(hq.q.type)) && !p.c.isEx && p.qty >= 2);
        if (big.length) s += ` ${big[0].name} is too big for it (${big[0].c.hp} HP).`; }
      return s;
    }
    const sup = PK.find(x => x.q.k === 'supporter' && x.q.name);
    if (sup) { const own = X.T.filter(e => e.card.tt === 'supporter' && e.card.key.includes(sup.q.name.toLowerCase())); return own.length ? `Finds ${gtHereNames(own, 'or')}.` : null; }
    if (combo && PK.some(x => x.q.k === 'stadium')) { const st = X.T.filter(e => e.card.tt === 'stadium').sort((a, b) => b.qty - a.qty); return st.length ? `Can grab your ${st[0].name} along with Supporters.` : null; }
    if (genPk && /search (?:your|their) deck for (?:a|an|1) pokemon\b/.test(t)) {
      const key = [];
      if (X.main) key.push(X.main);
      P.filter(p => !p.main && (p.c.ab || []).length && !(p.c.ab || []).every(a => a.passive)).sort((a, b) => b.qty - a.qty).forEach(p => key.push(p));
      P.filter(p => !p.main && p.atk).forEach(p => key.push(p));
      const k = [...new Set(key)].slice(0, 3);
      return k.length >= 2 ? `Key targets: ${gtHereNames(k, 'and')}.` : null;
    }
    if (/search your deck for a trainer card/.test(t)) {
      const one = X.T.filter(e => e.qty === 1 && gtNorm(e.card.key) !== self).sort((a, b) => (b.card.ace - a.card.ace) || ((b.card.tt === 'stadium') - (a.card.tt === 'stadium')));
      return one.length ? `Can fetch a single copy like your ${gtHereNames(one.slice(0, 2), 'or')}.` : null;
    }
    return null;
  }

  // Back from the discard pile
  if ((m = t.match(/(?:put|shuffle) (?:up to \d+ |a |an )?(?:in any combination of )?([^.]+?) from your discard pile into your (hand|deck)/))) {
    const parts = m[1].split(/ and | or /), pk = [], E = [];
    let sup = false;
    parts.forEach(s => { const n = gtNorm(s), q = gtSubject(s);
      if (/supporter/.test(n)) sup = true;
      else if (/energy/.test(n)) E.push(q && q.k === 'energy' ? [q.type] : Object.keys(X.basicE));
      else if (/pokemon/.test(n)) pk.push(...atkFirst(fits(q && q.k === 'pkmn' ? q : null))); });
    let et = [...new Set(E.flat())].filter(k => X.basicE[k]);
    const used = et.filter(k => A.some(p => p.best && (p.best.cost || []).includes(k)));
    if (used.length) et = used;
    const eS = !et.length ? '' : et.length > 2 ? 'Basic Energy' : `Basic ${et.map(gtHereTy).join(' or ')} Energy`;
    const back = m[2] === 'deck' ? 'Shuffles' : 'Gets back', tail = m[2] === 'deck' ? ' back into your deck' : '';
    if (sup) { const g = X.T.filter(e => e.card.tt === 'supporter' && e.qty <= 2 && gtNorm(e.card.key) !== self).sort((a, b) => a.qty - b.qty); return g.length ? `Can bring back a used ${gtHereNames(g.slice(0, 2), 'or')}.` : null; }
    const pkL = [...new Set(pk)], pkS = !pkL.length ? '' : (pkL.length > 2 || m[2] === 'deck' || /any combination/.test(m[0]) ? 'Pokemon like ' : '') + gtHereNames(pkL.slice(0, 2), 'or');
    if (pkS && eS) return /any combination/.test(m[0]) ? `${back} any mix of ${pkS}, and ${eS}${tail}.` : `${back} ${pkS}, or a ${eS}${tail}.`;
    if (pkS) return `${back} Knocked Out ${pkS.replace(/^Pokemon like /, 'Pokemon like ')}${tail}.`.replace('Knocked Out Pokemon like', 'Knocked Out Pokemon like').replace(/Knocked Out (?!Pokemon like)/, '');
    if (et.length && X.main && X.main.best && (X.main.best.cost || []).some(x => et.includes(x))) return `${back} ${eS}${tail} for ${X.main.name}'s ${X.main.best.name}.`;
    return null;
  }

  // Healing
  if ((m = t.match(/heal (\d+|all) damage from (?:each of |1 of )?your ([^.]*?pokemon(?: ex)?)(?: that has (\d+) or more energy attached)?/))) {
    const what = m[2].replace(/^(?:active |benched )/, ''), q = gtSubject(what), need = +(m[3] || 0);
    const trench = X.T.some(e => /double the amount of damage healed/.test(gtNorm(e.card.rt || ''))) && m[1] !== 'all';
    let own = atkFirst(fits(q));
    if (need) {
      own = A.filter(p => p.best && (p.best.cost || []).length >= need);
      if (!own.length) return `None of your attackers uses ${need} or more Energy, so it rarely has a target.`;
      return `Fits ${gtHereNames(own, 'and', 2)}, which ${own.length > 1 ? 'attack' : 'attacks'} with ${need} or more Energy${trench ? `; Legendary Trench makes it ${+m[1] * 2}` : ''}.`;
    }
    if (!q) return trench ? `Legendary Trench in your list doubles it to ${+m[1] * 2}.` : null;
    if (!own.length) return null;
    return `${m[1] === 'all' ? 'Fully heals' : `Heals ${trench ? +m[1] * 2 : m[1]} from`} ${/each of/.test(m[0]) ? (own.length > 1 ? 'each of ' : 'every ') : ''}${gtHereNames(own, /each of/.test(m[0]) ? 'and' : 'or')}${/each of/.test(m[0]) && own.length === 1 ? ' in play' : ''}${trench ? ' with Legendary Trench' : ''}.`;
  }
  if ((m = t.match(/if you moved a ([^.]*?pokemon(?: ex)?) to your bench in this way, heal (\d+) damage/))) {
    const own = atkFirst(fits(gtSubject(m[1])));
    return own.length ? `Heals ${m[2]} when it moves ${gtHereNames(own, 'or', 2)} to your Bench.` : null;
  }

  return null;
}

/**
 * v65: how tightly the list fits together, for Synergy.
 * Before this, Synergy only asked whether each card's needs were met, so nearly every
 * working list scored a full 10. Now it also asks how much of the list pulls the same way,
 * measured the same way for every deck:
 *   Energy types: how many types the attacks and Abilities need (one or two is tight).
 *   Pokemon lines: how much of the Pokemon count sits in the two biggest lines.
 *   Shared Energy: how much of the list's Energy each attacker can use.
 *   Off-plan Energy: Basic Energy no attack, Ability or Trainer in the list uses.
 *   Single copies: Trainers and Pokemon run as one copy, which the deck sees less often.
 *   Links: pairs the grade found that work together (Rare Candy into a Stage 2, a copier).
 * A toolbox deck (4 or more attackers that each hit hard) spreads on purpose, so the spread
 * counts half. The result is a fit score from 0 to 1 that scales Synergy.
 */
function gFocus(entries, coh, via) {
  const cards = entries.filter(e => e.card), P = cards.filter(e => e.card.t === 'pkmn');
  const pq = P.reduce((a, e) => a + e.qty, 0);
  if (!pq) return null;
  // v67: a type named in words or as a symbol ("Basic Fire Energy" or "Basic {R} Energy").
  const TY = /(?:\b(grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|fairy)|\{([grwlpfdmy])\}) energy\b/g;
  const tyOf = m => m[1] || { g: 'grass', r: 'fire', w: 'water', l: 'lightning', p: 'psychic', f: 'fighting', d: 'darkness', m: 'metal', y: 'fairy' }[m[2]];
  // Pokemon lines: follow each card down to its Basic.
  const byKey = new Map(P.map(e => [e.card.key, e.card]));
  const root = c => { let r = c, g = 0; while (r.from && byKey.has(r.from) && g++ < 3) r = byKey.get(r.from); return r.from && !byKey.has(r.from) ? r.from : r.key; };
  const fam = new Map(); P.forEach(e => { const k = root(e.card); fam.set(k, (fam.get(k) || 0) + e.qty); });
  const fs = [...fam.values()].sort((a, b) => b - a), conc = (fs[0] + (fs[1] || 0)) / pq;
  // Energy types the list asks for: attack costs, Abilities, and Trainers that name a type.
  // The real attackers: Pokemon whose best hit is at least half the list's best, so a support
  // Pokemon's own small attack does not count as a type the deck needs.
  const reach = (via && via.reach) || [], topEff = Math.max(0, ...reach.map(r => r.eff || 0));
  const real = new Set(reach.filter(r => (r.eff || 0) >= topEff / 2).map(r => String(r.name).toLowerCase()));
  const isAtk = e => !real.size || real.has(String(e.name).toLowerCase());
  const need = new Set(), atkNeed = new Set();
  P.forEach(e => { (e.card.attacks || []).forEach(a => (a.cost || []).forEach(t => { if (t !== 'colorless') { need.add(t); if (isAtk(e) && (a.max || a.dmg) > 0) atkNeed.add(t); } }));
    (e.card.aneed || []).forEach(x => need.add(x.type));
    let m; const tx = gtNorm(e.card.atx || ''); TY.lastIndex = 0; while ((m = TY.exec(tx))) need.add(tyOf(m)); });
  let mix = false;
  cards.filter(e => e.card.t !== 'pkmn').forEach(e => { let m; const tx = gtNorm(e.card.rt || e.card.et || ''); TY.lastIndex = 0; while ((m = TY.exec(tx))) need.add(tyOf(m));
    // v67: a card that fetches or attaches Energy of different types (Crispin) puts a second type to work.
    if (/energy cards? of different types|different types of (?:basic )?energy/.test(tx)) mix = true; });
  // Pokemon text that asks for different types works the same way.
  P.forEach(e => { if (/energy cards? of different types|different types of (?:basic )?energy/.test(gtNorm(e.card.atx || ''))) mix = true; });
  const EN = cards.filter(e => e.card.t === 'energy'), eq = EN.reduce((a, e) => a + e.qty, 0);
  const BE = EN.filter(e => (e.card.sub || []).map(x => String(x).toLowerCase()).includes('basic'));
  const beq = BE.reduce((a, e) => a + e.qty, 0);
  if (mix && new Set(BE.flatMap(e => e.card.etypes || [])).size >= 2) BE.forEach(e => (e.card.etypes || []).forEach(t => need.add(t)));
  const offE = BE.filter(e => !(e.card.etypes || []).some(t => need.has(t)));
  // v67: Energy of an off type still pays the Colorless part of an attacker's cost, so it counts half.
  const anyC = P.some(e => isAtk(e) && (e.card.attacks || []).some(a => (a.max || a.dmg) > 0 && (a.cost || []).includes('colorless')));
  const off = offE.reduce((a, e) => a + e.qty, 0) * (anyC ? 0.5 : 1);
  const offN = offE.reduce((a, e) => a + e.qty, 0);
  const offT = [...new Set(offE.flatMap(e => (e.card.etypes || []).map(gCap)))];
  // Shared Energy: for each attacker, the share of the list's Energy its best attack can use.
  let ws = 0, wq = 0;
  P.forEach(e => { const atk = (e.card.attacks || []).filter(a => (a.max || a.dmg) > 0); if (!atk.length || !isAtk(e)) return;
    // v67: any Energy pays a Colorless slot, so only the typed share of the cost narrows what it can use.
    const best = Math.max(...atk.map(a => { const ty = (a.cost || []).filter(t => t !== 'colorless'); if (!ty.length || !eq) return 1;
      const share = EN.filter(x => (x.card.etypes || []).some(t => ty.includes(t) || t === 'any')).reduce((s, x) => s + x.qty, 0) / eq;
      const n = (a.cost || []).length || ty.length; return (ty.length * share + (n - ty.length)) / n; }));
    ws += best * e.qty; wq += e.qty; });
  const esh = wq ? ws / wq : 1;
  const T = cards.filter(e => e.card.t === 'trainer'), tq = T.reduce((a, e) => a + e.qty, 0);
  const t1 = tq ? T.filter(e => e.qty === 1).reduce((a, e) => a + e.qty, 0) / tq : 0;
  const p1n = P.filter(e => e.qty === 1).reduce((a, e) => a + e.qty, 0), p1 = p1n / pq;
  const box = !!(via && via.toolbox && via.toolbox.length);
  const ty = 0.06 * Math.max(0, atkNeed.size - 2), fm = 0.45 * Math.max(0, 0.8 - conc), pp = 0.375 * Math.max(0, p1 - 0.1), es = 0.525 * Math.max(0, 0.85 - esh);
  const spread = Math.min(0.35, ty + fm + pp + es) * (box ? 0.5 : 1);
  const single = 0.6 * Math.max(0, t1 - 0.06), offP = beq ? 0.4 * off / beq : 0;
  const links = Math.min(0.05, 0.02 * (coh.synergies || []).length);
  const score = gClamp(1 - spread - single - offP + links, 0, 1);
  // The plain reasons, biggest first, for the Synergy line under How it plays.
  const why = [];
  if (offP > 0.02) why.push({ v: offP, s: `${offN} Basic ${offT.join(' and ')} Energy ${offN === 1 ? 'is' : 'are'} a type nothing in the list asks for${anyC ? ', though they still pay Colorless costs' : ''}` });
  if (ty > 0.02) why.push({ v: ty * (box ? 0.5 : 1), s: `your attacks need ${atkNeed.size} Energy types` });
  if (es > 0.03) why.push({ v: es * (box ? 0.5 : 1), s: `each attacker can use only about ${Math.round(esh * 100)}% of your Energy` });
  if (fm > 0.03) why.push({ v: fm * (box ? 0.5 : 1), s: `your Pokemon are spread over ${fam.size} lines` });
  if (pp > 0.03) why.push({ v: pp * (box ? 0.5 : 1), s: `${p1n} of your ${pq} Pokemon ${p1n === 1 ? 'is a single copy' : 'are single copies'}` });
  if (single > 0.03) why.push({ v: single, s: `${Math.round(t1 * tq)} of your ${tq} Trainers ${Math.round(t1 * tq) === 1 ? 'is a single copy' : 'are single copies'}` });
  why.sort((a, b) => b.v - a.v);
  return { score, box, why: why.map(x => x.s), m: { conc: +conc.toFixed(2), need: atkNeed.size, esh: +esh.toFixed(2), off, t1: +t1.toFixed(2), p1: +p1.toFixed(2), links: (coh.synergies || []).length } };
}

/** 2.6.2: the main attacker the player set for this deck: 'toolbox', a Pokemon in the list that has attacks, or '' for Auto. */
function gAtkPick(deck, entries) {
  const v = deck && typeof deck.atk === 'string' ? deck.atk : '';
  if (!v) return '';
  if (v === 'toolbox') return 'toolbox';
  const e = (entries || []).find(x => x.card && x.card.t === 'pkmn' && x.card.key === v && (x.card.attacks || []).length);
  return e ? { key: e.card.key, name: e.name } : '';
}
/** 2.6.2: the Pokemon the Main attacker pick offers: each one in the list with an attack that nothing
 *  else in the list evolves from (Dragapult ex, not Dreepy), hardest hitters first, by key. */
function gAtkOptions(entries, reach) {
  const P = (entries || []).filter(e => e.card && e.card.t === 'pkmn');
  const from = new Set(P.map(e => e.card.from).filter(Boolean));
  const eff = new Map();
  (reach || []).forEach(r => { const k = String(r.name).toLowerCase(); eff.set(k, Math.max(eff.get(k) || 0, r.eff || 0)); });
  const m = new Map();
  P.forEach(e => { if ((e.card.attacks || []).length && !from.has(e.card.key) && !m.has(e.card.key)) m.set(e.card.key, e.name); });
  return [...m].map(([key, name]) => ({ key, name })).sort((a, b) => (eff.get(b.key) || 0) - (eff.get(a.key) || 0));
}

function gradeDeck(deck) {
  const entries=toGradeDeck(deck);
  const coh=gCoherence(entries);
  // 2.6.1: the grade reads the cards only. The player's own deck name used to pick the main attacker, so
  // renaming a deck could move its grade (a viewer's deck went from Synergy 7.2 as "Bolt" to 7.7 as "Slop").
  // The name now comes from the meta deck the cards match (or the one picked under Against the meta),
  // so an Archaludon list still leads with Archaludon ex and not the Metagross that powers it.
  let main=null; try { main=gMainAttacker(entries, coh, gArchName(deck, { entries, coh })); } catch (_) {}
  // 2.6.2: the player can set the main attacker, or mark the deck as a toolbox, under Main attacker.
  // Auto is the grade's own pick above. The plan, upgrades and draw odds follow the pick. The grade
  // follows it only when the pick is a real attacker: a Pokemon that hits for at least half of what the
  // list's hardest hitter does, or for Toolbox, 3 or more of those. A weaker pick leaves the grade on Auto,
  // so naming a tech or a Pokemon played for its Ability cannot move the grade either way.
  const auto=main, pick=gAtkPick(deck, entries);
  let via=gViability(entries, coh, main);
  if (pick) {
    const top=Math.max(0, ...(via.reach||[]).map(r=>r.eff||0));
    const effOf=k=>Math.max(0, ...(via.reach||[]).filter(r=>r.name.toLowerCase()===k).map(r=>r.eff||0));
    const box=pick==='toolbox' ? [...new Map((via.reach||[]).filter(r=>r.top>0 && (r.eff||0)*2>=top).sort((a,b)=>b.eff-a.eff).map(r=>[r.name.toLowerCase(), r])).keys()] : null;
    const pm=box ? null : { key:pick.key, name:pick.name, why:'pick' };
    const same=!box && auto && pick.key===auto.key;
    const real=box ? box.length>=3 : effOf(pick.key)*2>=top;
    if (!same && real) { main=pm; via=gViability(entries, coh, main); }
    else if (!same) {
      const lead=auto ? gCap(auto.name) : 'the cards alone';
      via.findings.push(box
        ? { sev:'warn', t:box.length>1 ? `${box.length} attackers for a toolbox` : 'One attacker for a toolbox',
            d:`You set this as a toolbox deck, but ${box.length>1 ? `only ${box.length} Pokemon in the list hit` : 'only one Pokemon in the list hits'} for half of what the best one does or more (${box.map(gCap).join(', ')}). Toolbox decks usually have 4 or more, so the grade and the plan still read it as built around ${lead}.` }
        : { sev:'warn', t:`${gCap(pick.name)} is not a big hitter here`,
            d:`You set ${gCap(pick.name)} as the main attacker, but it hits for less than half of what the list's hardest hitter does, so the grade still reads the deck as built around ${lead}. The plan, upgrades and draw odds follow your pick.` });
      // Too few attackers for a toolbox: the plan stays on Auto too, with the finding above saying why.
      via.main=box ? auto : pm;
    }
    if (box && real) via.boxPick=box;
  }
  via.auto=auto; via.pick=pick==='toolbox' ? 'toolbox' : pick ? pick.key : '';
  try { if (typeof g88Claims === 'function') g88Claims(deck, { entries, coh }, [coh.flaws, via.findings]); } catch (_) {}
  [coh.flaws, via.findings].forEach(fs => (fs || []).forEach(f => { if (f && f.cl) delete f.cl; }));
  // v65: the Trainers and Special Energy scale Synergy; a full suite leaves it as it was.
  let trn=null; try { trn=gTrainers(entries, coh, via, main, deck && deck.format); } catch (_) {}
  const steps={ s0:coh.score };
  if (trn) { coh.score=gClamp(coh.score*(1-0.35*(1-trn.score)),0,1); coh.flaws=(coh.flaws||[]).concat(trn.flaws); coh.trainers=trn; }
  // 2.8.3: how each Trainer and Special Energy works in this list. Explain only: no grade reads it.
  if (trn) { try { gtHere(trn, entries, coh, via, main, deck); } catch (_) {} }
  // v65: how tightly the list fits together. Synergy shows the full effect; the overall grade only
  // drops once the fit falls below what most winning lists reach, so a focused list is not punished.
  steps.s1=coh.score;
  let foc=null; try { foc=gFocus(entries, coh, via); } catch (_) {}
  let fitF=1;
  if (foc) { coh.works=coh.score; coh.score=gClamp(coh.score*foc.score,0,1); coh.focus=foc; fitF=gClamp(1-1.5*Math.max(0,0.7-foc.score),0.3,1); }
  const cohF=Math.max((coh.works!=null?coh.works:coh.score)*fitF,0.06), viaF=Math.max(via.score,0.12);
  const overall=gR1(cohF*viaF*10);
  Object.assign(steps, { s2:coh.score, fitF, cohF, viaF });
  const unread=entries.filter(e=>!e.card).reduce((a,e)=>a+e.qty,0);
  let plan=[]; try { plan=gPlan(entries, coh, via); } catch (_) {}
  if (trn && trn.ace) plan.push({ link: trn.ace.link, p: trn.ace.p });
  if (foc && foc.score < 0.88 && foc.why.length) plan.push({ link: 'Synergy: how the cards fit',
    p: `Fewer of your cards pull the same way: ${foc.why.slice(0, 2).join(', and ')}.${foc.box ? ' A toolbox deck spreads on purpose, so this counts half.' : ''}` });
  return { overall, coh, via, unread, entries, plan, steps };
}

/** 3.2.8: noRes is true when no tournament results match the deck (R.noRes): its grade reads the cards
 *  alone, so it is never called Tournament-ready, however high the number. */
function gBand(v, noRes) {
  if (v>=8.5&&!noRes) return ['Tournament-ready','var(--green)'];
  if (v>=7)   return ['Strong','var(--water)'];
  if (v>=5)   return ['Fixable','var(--electric)'];
  if (v>=3)   return ['Needs work','var(--fire)'];
  return ['Does not function','var(--red)'];
}

function showReviewTab(which) {
  const panes = { cards:'review-body', grade:'grade-body', odds:'odds-body', hand:'hand-body', drills:'drills-body', notes:'notes-body' };
  Object.keys(panes).forEach(k => {
    const btn=document.getElementById('rv-tab-'+k);
    const pane=document.getElementById(panes[k]);
    if (btn)  btn.classList.toggle('active', k===which);
    if (pane) pane.style.display = k===which ? '' : 'none';
  });
  // With large text the tabs scroll sideways: keep the open one in view.
  try {
    const on = document.getElementById('rv-tab-' + which), bar = on && on.parentElement;
    if (bar && bar.scrollWidth > bar.clientWidth + 1) {
      const l = on.offsetLeft - bar.offsetLeft, r = l + on.offsetWidth;
      if (l < bar.scrollLeft) bar.scrollLeft = l - 8;
      else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth + 8;
    }
  } catch (_) {}
  if (which==='grade') renderGrade();
  if (which==='odds')  renderOdds();
  if (which==='hand')  renderHand();
  if (which==='drills') renderDrills();
  if (which==='notes') renderNotes();
}

// renderGrade: the Grade tab is drawn by the version set further down (2.2 and later).
var renderGrade;

/* ============================================================
   OPENING ODDS (the Monte Carlo half of MetaForge)
   Shuffles the user's own list thousands of times and counts what
   happens: mulligans, which cards land in the prizes, and how often
   the main attacker is on the board by your second turn.
   No metagame data is involved, so none of this goes stale.
   Raw draws only: search cards, draw Supporters and abilities are
   not played out, so the setup odds are floors, not forecasts.
   The shuffle is seeded from the list itself, so the same list
   always shows the same numbers.
   ============================================================ */

const SIM_TRIALS = 20000;
const SIM_SEEN_T1 = 8;   // opening 7 plus the first draw
const SIM_SEEN_T2 = 9;   // opening 7 plus two draws (both players draw on turn 1)

/** mulberry32: small, fast, seedable PRNG. */
function simRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over the list, so a given list always simulates identically. */
function simSeed(cards) {
  const s = cards.map(c => c.count + 'x' + String(c.name||'').toLowerCase()).join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Collapse printings that share a name (two different Dreepy cards are
 * still "Dreepy" for prize and evolution purposes) into one group.
 */
function simGroups(cards) {
  const groups = [], byKey = {};
  cards.forEach(c => {
    const key = String(c.name||'').toLowerCase();
    const sup = String(c.supertype||'').toLowerCase();
    let g = byKey[key];
    if (!g) {
      g = byKey[key] = { key, name:c.name, qty:0, read:false, basic:false,
                         draw:false, drawT1:false, candy:false, sBasic:false, sAny:false, sItem:false,
                         stage:null, from:null, base:null };
      groups.push(g);
    }
    g.qty += c.count;
    if (sup) g.read = true;
    if (sup.startsWith('pok') && c.stage === 'basic') g.basic = true;
    if ((c.provides||[]).includes('draw')) {
      g.draw = true;
      // An Evolution Pokemon's draw Ability cannot be in play on turn 1.
      if (!(sup.startsWith('pok') && (c.stage === 'stage1' || c.stage === 'stage2'))) g.drawT1 = true;
    }
    if ((c.provides||[]).includes('evolution_access')) g.candy = true;
    // Search cards. A card tagged search_basic (Nest Ball, Poffin) only
    // finds Basics, even when it also carries search_pokemon.
    if ((c.provides||[]).includes('search_basic')) g.sBasic = true;
    else if ((c.provides||[]).includes('search_pokemon')) g.sAny = true;
    if ((c.provides||[]).includes('search_item')) g.sItem = true;
    if (c.stage && !g.stage) g.stage = c.stage;
    if (c.evolvesFrom && !g.from) g.from = String(c.evolvesFrom).toLowerCase();
    // 3.3.7: the Basic a Stage 2 starts from, read with the card, so Rare Candy knows it with no Stage 1 in the list.
    if (c.base && !g.base) g.base = String(c.base).toLowerCase();
  });
  return groups;
}

/**
 * The evolution line behind the main attacker, as group indexes.
 * Main attacker is the grade's pick (gMainAttacker): the Pokemon the deck is
 * named for, or else the one the list is built around. Damage alone is not
 * enough: 4 Mega Kangaskhan ex in a Mega Rayquaza list are there to draw.
 * Returns null when there is no attacker, or a line with missing:true when
 * a piece the attacker needs is not in the list at all.
 */
function simAttackerLine(deck, groups) {
  let R;
  try { R = gradeDeck(deck); } catch (_) { return null; }
  if (!R || !R.via) return null;
  // 2.6.2: a deck set as a toolbox leads with its hardest hitter and offers the others.
  const box = !R.via.main && (R.via.boxPick || []).length ? R.via.boxPick : null;
  if (!R.via.main && !box) return null;
  const et = (R.coh && R.coh.energyTypes) || {};
  const idx = k => groups.findIndex(g => g.key === k);
  const top = idx(box ? box[0] : R.via.main.key);
  if (top < 0) return null;
  const g = groups[top];
  // Realistic damage: a discard pile bonus counts only when the list can meet it.
  let r = null;
  R.entries.forEach(e => {
    if (!e.card || e.card.key !== g.key || !e.card.attacks) return;
    e.card.attacks.forEach(a => {
      if (!(a.cost||[]).every(ty => ty==='colorless' || et[ty] || et.any)) return;
      const x = gAtkReach(a, R.entries);
      if (!r || x.top > r.top) r = x;
    });
  });
  // v59: a toolbox deck (Basic Box) has several attackers, so Hand practice offers each of them.
  const toolbox = ((box || R.via.toolbox) || []).map(idx).filter(i => i >= 0);
  // v60: a deck named for its engine (Tera Box (Noctowl)) offers that engine's line too.
  const engine = !box && R.via.main.engine ? idx(String(R.via.main.engine.name || '').toLowerCase()) : -1;
  const line = { name:g.name, stage:g.stage, top, s1:-1, basic:-1, missing:false, why:box ? 'box' : R.via.main.why, toolbox, engine,
    cond: r && r.cond ? r.cond : null, pile: !!(r && r.pile), sc: r && r.sc ? r.sc : null, two: r && r.pile ? g56Many(r.pile, 2) : '', now: r ? r.now : 0, full: r ? r.top : 0 };
  if (g.stage === 'basic' || !g.stage) { line.basic = top; line.top = -1; return line; }
  if (g.stage === 'stage1') {
    line.basic = g.from ? idx(g.from) : -1;
    line.missing = line.basic < 0;
    return line;
  }
  // stage2: same pieces as Hand practice, including a Rare Candy only line
  const hl = handLineFor(groups, top);
  line.s1 = hl.s1; line.basic = hl.basic; line.guessed = !!hl.guessed;
  line.missing = line.basic < 0;
  return line;
}

/**
 * Run the simulation. Every trial: shuffle, draw 7, mulligan while the
 * hand has no Basic, set 6 prizes, then draw for two turns.
 * Only the first 15 positions matter, so each shuffle is a partial
 * Fisher-Yates (uniform for the prefix whatever order the array is in).
 */
/**
 * Can a line be on the board by turn T? Nothing evolves on a player's first
 * turn or on the turn it was played, so an evolution needs its Basic in hand
 * a turn earlier, and a Stage 2 by turn 2 needs Rare Candy: the Stage 1 route
 * (Basic, then Stage 1, then Stage 2) lands on turn 3 at the earliest.
 *   by(k, t)  copies of group k in hand by turn t (opening 7 plus t draws)
 *   left(k)   copies of group k still in the deck, for search
 *   srch(t)   { b, a, i }: Basic search, any Pokemon search and Item search
 *             cards in hand by turn t; null means raw draws only
 * Each search card fetches one missing piece, and only once it is in hand
 * by the turn that piece is needed.
 */
function lineReadyBy(line, T, candy, by, left, srch) {
  const has = (k, t) => k >= 0 && t >= 1 && by(k, t) > 0;
  const evo = line.stage === 'stage1' || line.stage === 'stage2';
  const routes = line.stage === 'stage2' ? (T >= 3 && line.s1 >= 0 ? ['candy', 's1'] : ['candy']) : ['plain'];
  for (const rt of routes) {
    const tb = rt === 's1' ? T - 2 : evo ? T - 1 : T;
    const needs = [];
    if (!has(line.basic, tb)) needs.push({ k: line.basic, d: tb, ty: 'b' });
    if (line.top >= 0 && !has(line.top, T)) needs.push({ k: line.top, d: T, ty: 'a' });
    if (rt === 'candy' && !candy.some(k => has(k, T))) needs.push({ k: -2, d: T, ty: 'i' });
    if (rt === 's1' && !has(line.s1, T - 1)) needs.push({ k: line.s1, d: T - 1, ty: 'a' });
    if (!needs.length) return true;
    if (!srch) continue;
    if (needs.some(n => n.d < 1 || (n.k === -2 ? !candy.some(k => left(k) > 0) : left(n.k) <= 0))) continue;
    const tok = { b: [], a: [], i: [] };
    let prev = { b: 0, a: 0, i: 0 };
    for (let t = 1; t <= T; t++) { const s = srch(t); ['b', 'a', 'i'].forEach(y => tok[y][t] = s[y] - prev[y]); prev = s; }
    needs.sort((x, y) => x.d - y.d);
    const take = (y, d) => { for (let t = 1; t <= d; t++) if (tok[y][t] > 0) { tok[y][t]--; return true; } return false; };
    if (needs.every(n => n.ty === 'b' ? (take('b', n.d) || take('a', n.d)) : take(n.ty, n.d))) return true;
  }
  return false;
}

/** The turn a line can first be on the board by the rules: 3 for a Stage 2 with no Rare Candy in the list. */
function lineFirstTurn(line, groups) {
  return line && line.stage === 'stage2' && !groups.some(g => g.candy) ? 3 : 2;
}

function simulateOdds(deck, trials) {
  const cards = (deck.cards||[]).filter(c => c.count > 0);
  const groups = simGroups(cards);
  const G = groups.length;
  const gid = {}; groups.forEach((g,i) => gid[g.key] = i);
  const pool = [];
  cards.forEach(c => { const i = gid[String(c.name||'').toLowerCase()]; for (let k=0;k<c.count;k++) pool.push(i); });
  const N = pool.length;
  const DEPTH = 7 + 6 + (SIM_SEEN_T2 - 7);
  if (N < DEPTH) return null;

  const isBasic = groups.map(g => g.basic);
  const isDraw  = groups.map(g => g.draw);
  const isDrawT1 = groups.map(g => g.drawT1);
  const candyIdx = groups.map((g,i) => g.candy ? i : -1).filter(i => i >= 0);
  const anyBasic = isBasic.some(Boolean);
  const anyRead  = groups.some(g => g.read);
  const line = simAttackerLine(deck, groups);
  const lineOk = line && !line.missing;

  const rng = simRng(simSeed(cards));
  // The turn 3 draw comes from its own stream, so adding it leaves every
  // turn 1 and 2 number exactly as before.
  const rng3 = simRng(simSeed(cards) ^ 0x9E3779B9);
  const has3 = N > DEPTH;
  const arr = Int32Array.from(pool);
  const prized = new Int32Array(G);
  const seenT = [null, new Int32Array(G), new Int32Array(G), new Int32Array(G)];
  const anyPrized = new Float64Array(G), allPrized = new Float64Array(G);
  const isSB = groups.map(g => g.sBasic), isSA = groups.map(g => g.sAny), isSI = groups.map(g => g.sItem);
  const srchT = [null, { b: 0, a: 0, i: 0 }, { b: 0, a: 0, i: 0 }, { b: 0, a: 0, i: 0 }];
  let mullGames = 0, mullTotal = 0, drawT1 = 0, locked = 0, capped = 0;
  let on2 = 0, on2S = 0, on3 = 0, on3S = 0;

  for (let t = 0; t < trials; t++) {
    let mulls = 0;
    for (;;) {
      for (let i = 0; i < DEPTH; i++) {
        const j = i + Math.floor(rng() * (N - i));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      if (!anyBasic) break;
      let ok = false;
      for (let i = 0; i < 7; i++) if (isBasic[arr[i]]) { ok = true; break; }
      if (ok) break;
      if (++mulls >= 50) { capped++; break; }
    }
    if (mulls) mullGames++;
    mullTotal += mulls;
    // Read, not swapped, so the deck order for later shuffles is untouched.
    const c3 = has3 ? arr[DEPTH + Math.floor(rng3() * (N - DEPTH))] : -1;

    prized.fill(0);
    for (let i = 7; i < 13; i++) prized[arr[i]]++;
    // In hand by turn 1, 2 and 3: the opening 7 plus one draw a turn.
    const s1 = seenT[1], s2 = seenT[2], s3 = seenT[3];
    s1.fill(0);
    for (let i = 0; i < 7; i++) s1[arr[i]]++;
    s1[arr[13]]++;
    s2.set(s1); s2[arr[14]]++;
    s3.set(s2); if (has3) s3[c3]++;
    let d1 = false;
    for (let i = 0; i < 7; i++) if (isDrawT1[arr[i]]) { d1 = true; break; }
    if (!d1 && isDrawT1[arr[13]]) d1 = true;
    if (d1) drawT1++;

    for (let g = 0; g < G; g++) {
      if (prized[g] > 0) anyPrized[g]++;
      if (prized[g] === groups[g].qty) allPrized[g]++;
    }

    if (lineOk) {
      for (let tt = 1; tt <= 3; tt++) {
        const s = seenT[tt], o = srchT[tt]; o.b = 0; o.a = 0; o.i = 0;
        for (let g = 0; g < G; g++) if (s[g]) {
          if (isSB[g]) o.b += s[g]; else if (isSA[g]) o.a += s[g];
          if (isSI[g]) o.i += s[g];
        }
      }
      const by = (k, tt) => seenT[Math.min(tt, 3)][k];
      const left2 = k => groups[k].qty - prized[k] - seenT[2][k];
      const left3 = k => groups[k].qty - prized[k] - seenT[3][k];
      const srch = tt => srchT[Math.min(tt, 3)];
      if (lineReadyBy(line, 2, candyIdx, by, left2, null)) on2++;
      if (lineReadyBy(line, 2, candyIdx, by, left2, srch)) on2S++;
      if (has3) {
        if (lineReadyBy(line, 3, candyIdx, by, left3, null)) on3++;
        if (lineReadyBy(line, 3, candyIdx, by, left3, srch)) on3S++;
      }
      const gone = k => k >= 0 && prized[k] === groups[k].qty;
      let lock = gone(line.basic) || gone(line.top);
      if (line.stage === 'stage2') {
        const s1Gone = line.s1 < 0 || gone(line.s1);
        const candyGone = candyIdx.every(gone);
        if (s1Gone && candyGone) lock = true;
      }
      if (lock) locked++;
    }
  }

  const B = groups.reduce((a, g) => a + (g.basic ? g.qty : 0), 0);
  return {
    trials, N, groups, line, anyBasic, anyRead,
    anyDraw: isDraw.some(Boolean),
    anyDrawT1: isDrawT1.some(Boolean),
    // Exact: chance an opening 7 holds no Basic.
    mulligan: B ? oChoose(N - B, 7) / oChoose(N, 7) : mullGames / trials,
    mullAvg: mullTotal / trials,
    capped: capped / trials,
    drawT1: drawT1 / trials,
    online: lineOk ? on2 / trials : null,
    onlineS: lineOk ? on2S / trials : null,
    online3: lineOk && has3 ? on3 / trials : null,
    onlineS3: lineOk && has3 ? on3S / trials : null,
    atkTurn: lineOk ? lineFirstTurn(line, groups) : 2,
    anySearch: isSB.some(Boolean) || isSA.some(Boolean),
    locked: lineOk ? locked / trials : null,
    prize: groups.map((g,i) => ({ name:g.name, qty:g.qty, idx:i,
      ...exactPrizeOdds(N, g.qty, B, g.basic) }))
  };
}

/** The attacker numbers to show: by turn 2, or by turn 3 when the line cannot be up sooner. */
function oddsAttacker(S) {
  if (!S || !S.line || S.line.missing) return null;
  const t3 = S.atkTurn === 3;
  return { turn: t3 ? 3 : 2, raw: t3 ? S.online3 : S.online, search: t3 ? S.onlineS3 : S.onlineS };
}

/**
 * 2.6.6: setup speed from the cards. How often the main attacker is in play with the Energy its attack
 * needs by your second turn and by your third, averaged over going first and going second.
 * Dealt like the Odds tab: a hand with no Basic is redrawn, six prizes come off, and both players draw on
 * their first turn. Then each turn plays out simply: put the attacker's Basic down (or fetch it with a
 * search card), evolve when the rules allow (not on your first turn or the turn it was played; Rare Candy
 * skips the Stage 1), attach one Energy from your hand, and play cards that attach more when their text
 * says the Energy comes from your hand or deck (the discard pile is empty this early). One Supporter a turn,
 * none on the first turn of the player going first: one that attaches Energy when the attacker needs it,
 * else one that draws (counted as 4 new cards). Seeded by the list, so a list always gets the same numbers.
 */
const G80_TRIALS = 2000, G80_DRAW = 4;
/**
 * 2.6.7: setup speed score from how often the deck is ready by its second turn (t2, going first and second
 * averaged). 25% of games is 8.2, 50% is 9.5, and 70% is a 10: that is where the fastest real tournament
 * lists sit (Mega Rayquaza ex lists, ready by turn 2 in about 70 to 73% of games). Bad hands still happen
 * to a 10 deck; a 10 means the deck is ready on time about as often as any list can be.
 */
const G80_TOP = 0.7;
function g80Clock(t2) {
  const t = Math.max(0, t2 || 0);
  return t <= 0.5 ? 0.7 + 0.25 * t / 0.5 : Math.min(1, 0.95 + 0.05 * (t - 0.5) / (G80_TOP - 0.5));
}
const _g80Cache = new Map();
function g80Speed(deck, att, at, board) {
  if (!att || !at) return null;
  board = Math.max(1, Math.min(6, board || 1));
  const cost = at.cost || [];
  const sig = deck.filter(e => e.card).map(e => e.qty + 'x' + e.card.key).join('|') + '#' + att.key + '#' + at.name + (board > 1 ? '#b' + board : '');
  if (_g80Cache.has(sig)) return _g80Cache.get(sig);
  const gk = k => gtNorm(normalizeCardName(k || ''));
  // The attacker's line, Basic first. A missing Stage 1 leaves Basic to Stage 2 by Rare Candy.
  const line = [att.key];
  for (let c = att, g = 0; c && c.from && c.stage !== 'basic' && g < 3; g++) {
    const m = deck.find(x => x.card && gk(x.card.key) === gk(c.from)); if (!m) break; line.unshift(m.card.key); c = m.card; }
  const stage = att.stage === 'stage2' ? 2 : att.stage === 'stage1' ? 1 : 0;
  const ty = cost.filter(t => t !== 'colorless');
  const stg = { 'basic': 'basic', 'stage 1': 'stage1', 'stage 2': 'stage2' };
  // Who an Energy names: "Basic", "Stage 2", "Evolution", or an owner like "Team Rocket's".
  const isX = x => x === 'evolution' ? stage > 0 : stg[x] ? String(att.stage || '').toLowerCase().replace(/\s+/g, '') === stg[x] : gtNorm(att.key || '').startsWith(x);
  // 2.6.8: only "can only be attached to" keeps an Energy off the attacker (Team Rocket's Energy). "If this card is
  // attached to an Evolution Pokemon, it provides ... instead" is an upgrade, so without it the card is still Colorless
  // (Ignition, Prism and Neo Upper Energy were left out of the setup count before).
  const fits = ec => { const m = gtNorm(ec.et || '').match(/only be attached to an? ([a-z0-9' ]+?) pokemon/); return !m || isX(m[1].trim()); };
  const up = ec => { const m = gtNorm(ec.et || '').match(/if this card is attached to an? ([a-z0-9' ]+?) pokemon/); return m ? isX(m[1].trim()) : null; };
  // What each card does here.
  const K = [], ids = [];
  deck.forEach(e => { if (!e.card) return;
    const c = e.card, pv = c.provides || [], li = line.findIndex(k => gk(k) === gk(c.key));
    const o = { line: li, basic: c.t === 'pkmn' && (c.stage === 'basic' || !c.from), sup: c.tt === 'supporter' };
    if (c.t === 'energy' && fits(c)) {
      const ts = c.etypes && c.etypes.length ? c.etypes : (c.etype ? [c.etype] : ['colorless']), et = gtNorm(c.et || ''), u = up(c);
      // 2.6.8: Neo Upper Energy gives 2 on a Stage 2, Ignition Energy 3 Colorless on an Evolution Pokemon, and
      // Ignition is discarded at the end of the turn, so it only counts on the turn the attack is used.
      o.en = u === false ? { n: 1, ts: ['colorless'] }
        : { n: /provides 2\b|provides only 2 energy/.test(et) ? 2 : u && /provides (?:colorless){3} energy instead/.test(et) ? 3 : 1, ts,
            once: /discard it at the end of your turn/.test(et) || undefined }; }
    if (c.t === 'trainer') {
      if (pv.includes('search_pokemon')) o.find = 'any'; else if (pv.includes('search_basic')) o.find = 'basic';
      // 2.6.7: how many Basics a search card puts down at once (Buddy-Buddy Poffin finds 2), for the bench of a toolbox deck.
      if (o.find) { const fm = gtNorm(c.rt || '').match(/up to (\d+) basic pokemon/); o.findN = fm ? +fm[1] : 1; o.findB = pv.includes('search_basic'); }
      if (pv.includes('evolution_access')) o.candy = true;
      if (pv.includes('draw') && o.sup) o.draw = true;
      const rt = gtNorm(c.rt || '');
      if (pv.includes('energy_accel') && !/discard pile|only if|only during/.test(rt)) {
        const m = rt.match(/attach (?:up to )?(\d+)/);
        if (/\battach/.test(rt)) o.acc = { n: m ? +m[1] : 1, hand: /your hand/.test(rt) && !/your deck/.test(rt) };
        else if (/energy/.test(rt) && /into your hand/.test(rt)) o.fetch = +((rt.match(/up to (\d+)/) || [0, 1])[1]); } }
    if (c.t === 'pkmn' && pv.includes('energy_accel')) (c.ab || []).forEach(a => { const p = gtNorm(a.p || '');
      if (!/^attaches/.test(p) || /discard pile/.test(p) || o.ab) return;
      const m = p.match(/^attaches (any number of|up to \d+|\d+|an?)\b/);
      o.ab = { n: /as often as you like/.test(p) ? 4 : !m ? 1 : /\d/.test(m[1]) ? +m[1].match(/\d+/)[0] : /any number/.test(m[1]) ? 2 : 1,
        self: /to itself/.test(p), hand: /your hand/.test(p), when: /when you evolve/.test(p) ? 'evolve' : /when you play/.test(p) ? 'play' : 'turn' }; });
    const i = K.length; K.push(o); for (let q = 0; q < e.qty; q++) ids.push(i); });
  const N = ids.length;
  if (N < 20 || !K.some(k => k.line === 0)) { _g80Cache.set(sig, null); return null; }
  const top = line.length - 1;
  const deckTy = [...new Set(K.filter(k => k.en && k.en.n === 1 && !/^(?:colorless)$/.test(k.en.ts[0])).flatMap(k => k.en.ts))];
  const fromDeck = deckTy.length ? deckTy : ['colorless'];
  let h = 2166136261; for (let i = 0; i < sig.length; i++) { h ^= sig.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rng = simRng(h >>> 0);
  const arr = Int32Array.from(ids), DEPTH = Math.min(N, 13 + 3 + 3 * G80_DRAW);
  // One game: true when the attack can be paid on turn T.
  const play = (T, first) => {
    const hand = Array.from(arr.slice(0, 7)), inPrize = Array.from(arr.slice(7, 13));
    let pos = 13; const draw = n => { for (let q = 0; q < n && pos < DEPTH; q++) hand.push(arr[pos++]); };
    const take = pred => { const j = hand.findIndex(i => pred(K[i])); return j < 0 ? -1 : hand.splice(j, 1)[0]; };
    const has = pred => hand.some(i => pred(K[i]));
    const left = s => { const inDeck = N - hand.length - 6; return inDeck > 0 && ids.filter(i => K[i].line === s).length > hand.filter(i => K[i].line === s).length + inPrize.filter(i => K[i].line === s).length; };
    // Fetch a line piece: from hand, else with a search card (Basic search finds only Basics).
    const get = s => { if (take(k => k.line === s) >= 0) return true;
      if (!left(s)) return false;
      const isB = s === 0;
      return take(k => k.find === 'any' || (isB && k.find === 'basic')) >= 0; };
    let placed = [0, 0, 0].map(() => 0), units = [], abUsed = new Set(), others = 0;
    // 2.6.7: a toolbox deck is set up once it has its board, not one attacker: other Basics go to the Bench
    // from hand, or come from the deck with a search card, until board Pokemon are in play.
    const boardShort = () => board > 1 && (placed[0] ? 1 : 0) + others < board;
    const bb = k => k.basic && k.line <= 0 && !(k.ab && !k.ab.self);
    const benchUp = () => { if (!placed[0]) return;
      while (boardShort()) {
        if (take(bb) >= 0) { others++; continue; }
        const pool = ids.filter(i => bb(K[i])).length - inPrize.filter(i => bb(K[i])).length - hand.filter(i => bb(K[i])).length - others - (K.some(k => k.line === 0 && bb(k)) ? 1 : 0);
        const j = pool > 0 ? take(k => k.find) : -1; if (j < 0) break;
        // The search card brings Basics straight to the Bench (Nest Ball, Poffin) or to hand and down the same turn.
        const n = Math.min(pool, K[j].findN || 1, board - 1 - others); others += n; } };
    let curT = 0;
    const payable = us => { if (us.length < cost.length) return false; const pool = us.slice();
      for (const x of ty) { const j = pool.findIndex(u => u.includes(x) || u.includes('any')); if (j < 0) return false; pool.splice(j, 1); } return true; };
    const attachHand = () => { let best = -1, bv = -1;
      hand.forEach((i, j) => { const e = K[i].en; if (!e || (e.once && curT < T)) return;
        // Energy that leaves at the end of the turn goes on only when it pays for the attack this turn.
        const v = e.once ? (payable(units.concat(Array(e.n).fill(e.ts))) ? 100 : -1) : e.n * 2 + (e.ts.some(x => ty.includes(x) || x === 'any') ? 1 : 0); if (v > bv) { bv = v; best = j; } });
      if (best < 0) return false; const e = K[hand.splice(best, 1)[0]].en; for (let q = 0; q < e.n; q++) units.push(e.ts); return true; };
    const short = () => units.length < cost.length;
    for (let t = 1; t <= T; t++) {
      curT = t;
      draw(1);
      // Energy fetched to hand (Earthen Vessel and the like) comes as soon as it is drawn.
      for (let j; (j = take(k => k.fetch)) >= 0;) for (let q = 0; q < K[j].fetch; q++) hand.push(-1);
      // The line: Basic down, then evolve when the rules allow.
      if (!placed[0] && get(0)) placed[0] = t;
      const can = s => placed[s] && placed[s] < t && t >= 2;
      if (top === 1 && placed[0] && !placed[1] && can(0) && get(1)) placed[1] = t;
      if (top === 2 && placed[0] && !placed[2]) {
        if (can(1) && get(2)) placed[2] = t;
        else if (can(0) && has(k => k.candy) && get(2)) { take(k => k.candy); placed[2] = t; }
        else if (can(0) && !placed[1] && line.length === 3 && get(1)) placed[1] = t; }
      const supOk = !(first && t === 1);
      let supUsed = !supOk;
      // A Supporter that attaches Energy, when the attacker's Basic is down and still short.
      if (!supUsed && placed[0] && short() && has(k => k.acc && k.sup)) { const j = take(k => k.acc && k.sup); supUsed = true;
        for (let q = 0; q < K[j].acc.n; q++) { if (K[j].acc.hand) attachHand(); else units.push(fromDeck); } }
      // Else a Supporter that draws, when anything is still missing; then try the line again.
      if (!supUsed && (short() || !placed[top] || boardShort()) && has(k => k.draw)) { take(k => k.draw); supUsed = true; draw(G80_DRAW);
        if (!placed[0] && get(0)) placed[0] = t;
        if (top === 1 && placed[0] && !placed[1] && can(0) && get(1)) placed[1] = t;
        if (top === 2 && placed[0] && !placed[2] && ((can(1) && get(2)) || (can(0) && has(k => k.candy) && get(2) && take(k => k.candy) >= 0))) placed[2] = t; }
      if (!placed[0]) continue;
      if (board > 1) benchUp();
      attachHand();
      // Items that attach Energy.
      for (let j; short() && (j = take(k => k.acc && !k.sup)) >= 0;) for (let q = 0; q < K[j].acc.n; q++) { if (K[j].acc.hand) attachHand(); else units.push(fromDeck); }
      // Pokemon whose Ability attaches Energy: a Basic one in hand goes down; the attacker's own line counts once it is in play.
      K.forEach((k, i) => { if (!k.ab || !short()) return;
        let on = false;
        if (k.line >= 0) on = !!placed[k.line] && (k.ab.when !== 'evolve' || placed[k.line] === t) && (k.ab.when !== 'play' || placed[k.line] === t);
        else if (!k.ab.self && k.basic && hand.includes(i)) { hand.splice(hand.indexOf(i), 1); abUsed.add(i); on = true; if (board > 1) others++; }
        else if (!k.ab.self && k.basic && abUsed.has(i)) on = k.ab.when === 'turn';
        if (!on || (k.ab.when !== 'turn' && abUsed.has('o' + i))) return;
        if (k.ab.when !== 'turn') abUsed.add('o' + i);
        for (let q = 0; q < k.ab.n && short(); q++) { if (k.ab.hand) { if (!attachHand()) break; } else units.push(fromDeck); } });
      // Ability Pokemon left in hand go to the Bench too once the attacker has its Energy.
      if (board > 1) { benchUp(); for (let j; boardShort() && (j = take(k => k.basic && k.line <= 0)) >= 0;) others++; }
    }
    if (!placed[top] || short() || boardShort()) return false;
    const pool = units.slice();
    for (const x of ty) { const j = pool.findIndex(u => u.includes(x) || u.includes('any')); if (j < 0) return false; pool.splice(j, 1); }
    return true; };
  const isB = K.map(k => k.basic);
  let f2 = 0, s2 = 0, f3 = 0, s3 = 0;
  for (let tr = 0; tr < G80_TRIALS; tr++) {
    for (let m = 0; m < 50; m++) {
      for (let i = 0; i < DEPTH; i++) { const j = i + Math.floor(rng() * (N - i)); const x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
      let ok = false; for (let i = 0; i < 7; i++) if (isB[arr[i]]) { ok = true; break; }
      if (ok) break; }
    if (play(2, true)) f2++; if (play(2, false)) s2++;
    if (play(3, true)) f3++; if (play(3, false)) s3++;
  }
  const r = { t2: (f2 + s2) / 2 / G80_TRIALS, t3: (f3 + s3) / 2 / G80_TRIALS, first2: f2 / G80_TRIALS, second2: s2 / G80_TRIALS };
  _g80Cache.set(sig, r);
  return r;
}

/** n choose k, as a float (fine for a 60 card deck). */
function oChoose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
  return r;
}

/**
 * Exact prize odds for one card, dealt the way a real game deals: a hand
 * with no Basic is reshuffled, so only hands holding a Basic count. Then
 * six prizes come off the remaining cards.
 * N cards, k copies of this card, B Basics in the deck (this card included
 * when it is a Basic). With B = 0 no hand is thrown back.
 */
function exactPrizeOdds(N, k, B, isBasic) {
  const other = isBasic ? B - k : B;
  const rest = N - k - other;
  const total = oChoose(N - 7, 6);
  let legal = 0, any = 0, all = 0;
  for (let h = 0; h <= Math.min(k, 7); h++) {
    for (let j = 0; j <= Math.min(other, 7 - h); j++) {
      const r = 7 - h - j;
      if (r > rest) continue;
      if (B > 0 && !(j > 0 || (isBasic && h > 0))) continue;
      const p = oChoose(k, h) * oChoose(other, j) * oChoose(rest, r);
      legal += p;
      const left = k - h;
      any += p * (1 - oChoose(N - 7 - left, 6) / total);
      if (h === 0 && k <= 6) all += p * oChoose(N - 7 - k, 6 - k) / total;
    }
  }
  return legal ? { any: any / legal, all: all / legal } : { any: 0, all: 0 };
}

/** Percent with one decimal, for tables where rows are compared. */
function oPct1(x) {
  if (x == null) return '?';
  const p = x * 100;
  if (p > 0 && p < 0.1) return '<0.1%';
  return p.toFixed(1) + '%';
}

function oPct(x) {
  if (x == null) return '?';
  const p = x * 100;
  if (p > 0 && p < 0.1) return '<0.1%';
  return (p < 10 ? p.toFixed(1) : Math.round(p)) + '%';
}

function renderOdds() {
  const el=document.getElementById('odds-body');
  const deck=state.decks.find(d=>d.id===state.activeDeckId);
  if (!el||!deck) return;

  const S = simulateOdds(deck, SIM_TRIALS);
  if (!S) {
    el.innerHTML = `<div class="g-empty">This list is too short to simulate.<br><br>
      Odds need at least 15 cards: an opening hand, six prizes and two draws.</div>`;
    return;
  }

  // Colour: green when the odds favour you, fire when they do not.
  const good = (x, hi, lo) => x == null ? 'var(--text-dim)'
    : x >= hi ? 'var(--green)' : x >= lo ? 'var(--electric)' : 'var(--fire)';
  const bad = (x, lo, hi) => x == null ? 'var(--text-dim)'
    : x <= lo ? 'var(--green)' : x <= hi ? 'var(--electric)' : 'var(--fire)';

  const line = S.line;
  const lineOk = line && !line.missing;
  const AT = oddsAttacker(S);
  const onl = AT ? (S.anySearch ? AT.search : AT.raw) : null;
  const stageTxt = s => s==='stage2' ? 'Stage 2' : s==='stage1' ? 'Stage 1' : 'Basic';

  const tMul = S.anyBasic ? bad(S.mulligan,0.15,0.25) : 'var(--text-3)';
  const tDraw = S.anyDrawT1 ? good(S.drawT1,0.85,0.7) : 'var(--text-3)';
  const tAtk = lineOk ? good(onl,0.6,0.4) : 'var(--text-3)';
  let h = `<div class="o-tiles">
    <div class="o-tile" style="--tone:${tMul}">
      <div class="ol">Mulligan</div>
      <div class="ov">${S.anyBasic?oPct(S.mulligan):'?'}</div>
      <div class="os">Opening 7 with no Basic</div></div>
    <div class="o-tile" style="--tone:${tDraw}">
      <div class="ol">Draw card T1</div>
      <div class="ov">${S.anyDrawT1?oPct(S.drawT1):'?'}</div>
      <div class="os">A draw card you can use, in your first ${SIM_SEEN_T1}</div></div>
    <div class="o-tile" style="--tone:${tAtk}">
      <div class="ol">Attacker by T${AT ? AT.turn : 2}, any hand</div>
      <div class="ov">${!AT?'?':S.anySearch&&oPct(AT.raw)!==oPct(AT.search)?oPct(AT.raw).replace(/%$/,'')+'-'+oPct(AT.search):oPct(S.anySearch?AT.search:AT.raw)}</div>
      <div class="os">${lineOk?esc(line.name)+(line.cond?' in hand':'')+(S.anySearch?(AT&&oPct(AT.raw)===oPct(AT.search)?', any opening hand, the same from raw draws alone or with your search cards':', any opening hand, from raw draws alone to with your search cards'):', any opening hand, raw draws'):'No attacker line read'}</div></div>
  </div>
  <div class="o-meta">${S.trials.toLocaleString('en-US')} simulated shuffles of this exact ${S.N} card list. Same list, same numbers.</div>`;

  // Notes the user should see before trusting the tiles.
  const notes = [];
  if (!S.anyRead) notes.push(['warn','No card data yet',
    'Prize odds below only need card names, so they are exact. Mulligan, draw and attacker odds need card roles. Open Edit deck and save it to fetch them.']);
  else {
    if (!S.anyBasic) notes.push(['crit','No Basic Pokémon read',
      'No card in this list was read as a Basic Pokemon, so mulligan odds cannot be counted. If the list has Basics, re-saving the deck retries the lookup.']);
    if (!S.anyDraw) notes.push(['warn','No draw card read',
      'Nothing in the list was read as a draw card, so the turn 1 draw odds are blank. The Grade tab flags the same thing.']);
    if (line && line.missing) notes.push(['crit','Attacker line incomplete',
      `${esc(line.name)} is a ${stageTxt(line.stage)}, but a Pokemon it evolves from is not in the list, so it can only reach the board through other cards.`]);
  }
  if (S.N !== 60) notes.push(['warn',`${S.N} card list`,
    'Standard decks are 60 cards. These odds are for the list exactly as entered.']);
  if (S.capped > 0) notes.push(['crit','Almost no Basics',
    `In ${oPct(S.capped)} of games the deck still had no Basic after 50 mulligans.`]);
  if (notes.length) {
    h += `<div class="g-sec">`;
    notes.forEach(n => h += `<div class="g-item ${n[0]}"><div class="gt">${n[1]}</div><p>${n[2]}</p></div>`);
    h += `</div>`;
  }

  if (lineOk) {
    const parts = [];
    const T = AT.turn;
    if (line.stage === 'stage2') {
      const s1n = line.s1>=0 ? esc(S.groups[line.s1].name) : '';
      parts.push(T === 3
        ? `${esc(S.groups[line.basic].name)} by turn 1 and ${s1n} by turn 2, then ${esc(line.name)} on turn 3 (there is no Rare Candy in the list, and nothing evolves on its first turn in play)`
        : `${esc(S.groups[line.basic].name)} by turn 1, then ${esc(line.name)} and Rare Candy by turn 2${s1n ? ` (the ${s1n} route needs until turn 3)` : ''}`);
    } else if (line.stage === 'stage1') {
      parts.push(`${esc(S.groups[line.basic].name)} by turn 1, then ${esc(line.name)} by turn 2 (nothing evolves on its first turn in play)`);
    } else parts.push(`${esc(line.name)} among your first ${SIM_SEEN_T2} cards`);
    const tbN = line.toolbox && (line.why === 'box' ? line.toolbox.length >= 2 : line.why !== 'name' && line.why !== 'pick' && line.toolbox.length >= 4) ? line.toolbox.length : 0;
    h += `<div class="g-sec"><div class="g-sec-t">${tbN ? 'One of your attackers' : 'Main attacker'}</div>
      <div class="g-sec-i">${tbN ? `This list has ${tbN} attackers and picks the one each turn needs. Here is how often you can have ${esc(line.name)}, the one the grade leads with, ready by your ${S.atkTurn === 3 ? 'third' : 'second'} turn.` : `${line.why === 'name' ? 'The attacker its meta deck is named for' : line.why === 'pick' ? 'The main attacker you set' : 'The attacker this list is built around'}, and how often you can have it ready by your ${S.atkTurn === 3 ? 'third' : 'second'} turn.`}</div>
      <div class="g-item ${onl>=0.6?'ok':onl>=0.4?'warn':'crit'}">
        <div class="gt">${esc(line.name)} ${line.cond?'in hand':'ready'} by turn ${T}: ${oPct(AT.raw)}${S.anySearch&&oPct(AT.search)!==oPct(AT.raw)?' to '+oPct(AT.search):''}</div>
        <p>Needs ${parts[0]}. ${S.anySearch&&oPct(AT.search)===oPct(AT.raw)?`${oPct(AT.raw)} from raw draws alone, and your search cards do not raise it.`:`${oPct(AT.raw)} is raw draws alone, the floor.`}${S.anySearch&&oPct(AT.search)!==oPct(AT.raw)?` ${oPct(AT.search)} lets every search card you have in time fetch one missing piece, ignoring discard costs and the one Supporter per turn rule, so it is closer to a ceiling.`:''} Draw Supporters and abilities are not played out.${S.anySearch&&oPct(AT.search)!==oPct(AT.raw)?' Real games land in between.':''}${T === 2 && S.online3 != null ? ` By turn 3: ${oPct(S.online3)}${S.anySearch&&oPct(S.onlineS3)!==oPct(S.online3)?' to '+oPct(S.onlineS3):''}.` : ''}${line.cond?` This counts ${esc(line.name)} in hand, not at full power: it hits for ${line.now} ${line.sc ? 'with 2 ' + esc(line.two) + ' ' + line.sc.where + ' and ' + line.full + ' once you have ' + line.cond.n : 'until you have ' + line.cond.n + ' ' + esc(line.cond.what) + ' in your discard pile, then ' + line.full}. ${line.sc ? line.sc.fill : 'Filling the discard pile'} is not counted here, so the full hit this early is much less likely than this.`:''}</p></div>
      <div class="g-item ${S.locked<=0.02?'ok':S.locked<=0.06?'warn':'crit'}">
        <div class="gt">Line locked in prizes: ${S.locked===0 && [line.basic,line.s1,line.top].some(i=>i>=0&&S.groups[i].qty<=6) ? '<0.1%' : oPct(S.locked)}</div>
        <p>Games where every copy of a piece the attacker needs is prized, so it cannot come online until you take that prize.</p></div>
    </div>`;
  }

  // Prize risk: every card group that can be fully prized often enough to matter.
  const linePieces = lineOk ? [line.basic, line.s1, line.top].filter(i => i >= 0) : [];
  // Attacker pieces first, then the cards most likely to be prized.
  const rows = S.prize.slice().sort((a,b) =>
    (linePieces.includes(b.idx) - linePieces.includes(a.idx)) || b.any - a.any || a.name.localeCompare(b.name));
  const SHOW = 10;
  const rowHtml = p => {
    const tag = linePieces.includes(p.idx) ? ' <span class="o-tag">Attacker</span>' : '';
    return `<tr><td>${esc(p.name)}${tag}</td><td class="o-qty">${p.qty}</td><td><span class="o-any"><span class="o-bar"><i style="width:${Math.min(100, p.any * 100)}%"></i></span>${oPct1(p.any)}</span></td><td class="${p.all>=0.05?'hi':''}">${oPct1(p.all)}</td></tr>`;
  };
  const head = `<div class="o-table-wrap"><table class="o-table"><thead><tr><th>Card</th><th>Copies</th><th>Any prized</th><th>All prized</th></tr></thead><tbody>`;
  h += `<div class="g-sec"><div class="g-sec-t">Prize risk</div>
    <div class="g-sec-i">Exact chance a card lands in your six prizes, counting only opening hands you keep. <b>All prized</b> means every copy is stuck there, which is the case RdyDeck drills you to spot.</div>`;
  h += head + rows.slice(0, SHOW).map(rowHtml).join('') + `</tbody></table></div>`;
  if (rows.length > SHOW) {
    h += `<details class="o-more"><summary>Show all ${rows.length} cards</summary>` +
         head + rows.slice(SHOW).map(rowHtml).join('') + `</tbody></table></div></details>`;
  }
  h += `</div>`;

  h += `<div class="g-wip"><b>What this does not do.</b> Matchup win rates are not here.
    They are on the Grade tab, in Against the meta, from recent online and local in-person tournaments.
    Everything on this tab comes from shuffling your own list.</div>`;

  el.innerHTML = h;
}

function startGameFromReview() {
  game.prizeCount = 6;
  game.timeLimit = 0;
  game.tableCheck = false;
  game.reachCheck = false;
  tournament.active = false;
  startGame(state.activeDeckId);
}

/**
 * Show how much of the deck the card lookup could actually read.
 * Silence here would be worse than a warning: a partial read still
 * groups every card somewhere, so the screen looks complete either way.
 */
function renderCoverageNote(deck) {
  const el = document.getElementById('review-coverage');
  if (!el) return;
  // 3.3.2: while this deck's cards are being read, the reading note stays; any other note replaces it.
  if (el.dataset.reading) { if (_dataBusy.has(deck.id) && el.dataset.reading === String(deck.id)) return; delete el.dataset.reading; }
  const cov = deck.coverage;
  if (!cov || !cov.total || cov.unresolved === 0) { el.style.display = 'none'; return; }
  const fromList = deck.cards.some(c => c.section);
  // v59: when the read finished and cards were still not found, name them: usually a spelling slip.
  const miss = !cov.partial && Array.isArray(cov.missing) ? cov.missing : [];
  if (miss.length) {
    el.textContent = `\u26A0 RdyDeck could not find ${miss.join(', ')}. Check the spelling in Edit deck, because the grade cannot read what ${miss.length > 1 ? 'these cards do' : 'this card does'}.`;
    el.style.display = 'block';
    return;
  }
  el.textContent = `\u26A0 Card data read for ${cov.resolved}/${cov.total} entries. `
    + (fromList ? `Cards are grouped by your list's sections.`
                : `Grouping for the rest is based on card names.`);
  el.style.display = 'block';
}

function renderReview(deck) {
  document.getElementById('review-deck-name').textContent = deck.name;
  renderCoverageNote(deck);
  showReviewTab('cards');

  // Section from the list first, then verified card data, then the name.
  // See cardCategory.
  const pokemon = [], trainers = [], energies = [];
  deck.cards.forEach(card => {
    const cat = cardCategory(card);
    if (cat === 'energy') energies.push(card);
    else if (cat === 'pokemon') pokemon.push(card);
    else trainers.push(card);
  });

  // Sort each group alphabetically by "base name" so evolution families cluster.
  // "Mega Feraligatr ex" sorts near "Feraligatr", basic energies cluster by type.
  // Possessive trainers like "Iono's Bellibolt" cluster with Iono's other cards.
  function sortKey(card) {
    let n = (card.name || '').toLowerCase().trim();
    // Strip {X} energy symbols, collapse whitespace
    n = n.replace(/\{[a-z]\}/g, ' ').replace(/\s+/g, ' ').trim();
    // Strip "Mega " prefix so Mega evolutions cluster with their base
    n = n.replace(/^mega\s+/, '');
    return n;
  }

  function sortGroup(arr) {
    return [...arr].sort((a, b) => {
      const ka = sortKey(a), kb = sortKey(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      // Tiebreak: full raw name (so "Feraligatr" comes before "Mega Feraligatr ex")
      const na = (a.name || '').toLowerCase();
      const nb = (b.name || '').toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
  }

  // 2.7.3: two printings of the same Trainer or Energy show as one tile with their copies added up,
  // as the grade counts them. Pokemon printings stay apart, since their attacks can differ.
  function byName(arr) {
    const m = new Map();
    arr.forEach(c => { const k2 = (c.apiName || c.name || '').replace(/\{[a-zA-Z]\}/g, '').trim().toLowerCase();
      const o = m.get(k2); if (o) o.count += c.count; else m.set(k2, Object.assign({}, c)); });
    return [...m.values()];
  }
  // 3.2.8: the same Pokemon printing on two lines is still one tile, with its copies added up.
  function byPrint(arr) {
    const m = new Map();
    arr.forEach(c => { const k2 = [(c.apiName || c.name || '').trim().toLowerCase(), String(c.set || '').toUpperCase(), String(c.num || '')].join('|');
      const o = m.get(k2); if (o) o.count += c.count; else m.set(k2, Object.assign({}, c)); });
    return [...m.values()];
  }
  const groups = [
    { key: 'pokemon', label: 'Pokémon', cards: sortGroup(byPrint(pokemon)) },
    { key: 'trainer', label: 'Trainers', cards: sortGroup(byName(trainers)) },
    { key: 'energy', label: 'Energy', cards: sortGroup(byName(energies)) },
  ].filter(g => g.cards.length > 0);

  const total = deck.cards.reduce((a,c) => a + c.count, 0);
  const pkmnCount = pokemon.reduce((a,c) => a + c.count, 0);
  const trainerCount = trainers.reduce((a,c) => a + c.count, 0);
  const energyCount = energies.reduce((a,c) => a + c.count, 0);

  // Stats bar
  const statDefs = [
    { num: pkmnCount, label: 'Pokémon', cls: 'rs-pokemon' },
    { num: trainerCount, label: 'Trainers', cls: 'rs-trainer' },
    { num: energyCount, label: 'Energy', cls: 'rs-energy' },
  ];
  document.getElementById('review-stats').innerHTML =
    `<div class="comp-bar">${statDefs.filter(s => s.num).map(s => `<span class="${s.cls}" style="flex:${s.num}"></span>`).join('')}</div>
    <div class="comp-legend">${statDefs.map(s => `
      <div class="review-stat"><span class="rs-dot ${s.cls}"></span>
        <span class="review-stat-num">${s.num}</span>
        <span class="review-stat-label">${s.label}</span></div>`).join('')}</div>`;

  // Card grid grouped by type. v67: Edit list opens the same editor as the deck's Edit button.
  document.getElementById('review-body').innerHTML = `<div class="rv-edit-row"><button class="btn rv-edit" onclick="openEditModal('${esc(String(deck.id))}')"><svg class="ic"><use href="#i-edit"/></svg>Edit list</button></div>` + groups.map(group => `
    <div class="review-group">
      <div class="review-group-title ${group.key}"><span class="rg-dot"></span>${group.label}<span class="rg-count">${group.cards.reduce((a,c)=>a+c.count,0)}</span></div>
      <div class="review-cards">
        ${group.cards.map(card => {
          const rawName = card.apiName || card.name;
          const displayName = esc(rawName.replace(/\{[a-zA-Z]\}/g,'').trim());
          const fallbacks = JSON.stringify(card.fallbackUrls || []);
          const imgHtml = card.imageUrl
            ? `<img src="${esc(card.imageUrl)}" alt="${esc(rawName)}"
                data-fallbacks="${esc(fallbacks)}" data-fallback-idx="0"
                onerror="reviewImgError(this)">`
            : `<div class="review-placeholder"><i class=ph-card></i></div>`;
          return `
            <div class="review-card">
              <div class="review-card-img">
                ${imgHtml}
                <div class="review-card-qty">×${card.count}</div>
              </div>
              <div class="review-card-name">${displayName}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}


// ═══════════ OPENING HAND PRACTICE (v22) ═══════════
// Deal a legal opening 7, let the player pick which Pokemon line to build
// on turn 1, then shuffle the other 53 cards a few thousand times to show
// how often each line comes together. Reuses the Odds tab building blocks
// (simGroups, simRng, simSeed) and leaves simulateOdds itself untouched.
const HAND_TRIALS = 6000;
let handState = null;

/** One buildable line: the Pokemon on top plus the pieces under it, as group indexes. */
function handLineFor(groups, i) {
  const g = groups[i];
  const idx = k => groups.findIndex(x => x.key === k);
  const line = { name:g.name, stage:g.stage || 'basic', top:i, s1:-1, basic:-1, missing:false };
  if (line.stage === 'basic') { line.basic = i; line.top = -1; return line; }
  if (line.stage === 'stage1') {
    line.basic = g.from ? idx(g.from) : -1;
    line.missing = line.basic < 0;
    return line;
  }
  line.s1 = g.from ? idx(g.from) : -1;
  const s1g = line.s1 >= 0 ? groups[line.s1] : null;
  line.basic = s1g && s1g.from ? idx(s1g.from) : -1;
  // 3.3.7: no Stage 1 in the list (Blaziken ex with Rare Candy only): the Basic read with the card,
  // else the one the saved list of Standard cards gives for its Stage 1 (Combusken evolves from Torchic).
  if (line.s1 < 0 && line.basic < 0 && g.base) line.basic = idx(g.base);
  if (line.s1 < 0 && line.basic < 0 && g.from && typeof r273From === 'function') {
    const b = String(r273From(g.from) || '').toLowerCase();
    if (b) line.basic = idx(b);
  }
  if (line.s1 < 0 && line.basic < 0) {
    // No Stage 1 in the list (Pidgeot ex with Rare Candy only), so card data
    // cannot say which Basic it grows from. Take the one Basic whose name
    // shares the longest start with it, at least four letters.
    const stem = n => String(n || '').toLowerCase().replace(/^mega\s+/, '').replace(/\s+(ex|v|vmax|vstar|gx)$/, '');
    const t = stem(g.name);
    let best = -1, bestLen = 3, tie = false;
    groups.forEach((x, j) => {
      if (!x.basic) return;
      const b = stem(x.name);
      let k = 0; while (k < b.length && k < t.length && b[k] === t[k]) k++;
      if (k > bestLen) { best = j; bestLen = k; tie = false; } else if (k === bestLen && best >= 0) tie = true;
    });
    if (best >= 0 && !tie) { line.basic = best; line.guessed = true; }
  }
  line.missing = line.basic < 0;
  return line;
}

/**
 * The lines worth offering: the deck's main attacker first (same pick as the
 * Odds tab), then every other evolution line that is complete in the list,
 * Stage 2 before Stage 1, most copies first. At most four.
 */
function handLineOptions(deck, groups) {
  const out = [], tops = new Set();
  const main = simAttackerLine(deck, groups);
  const add = (i, isMain) => {
    if (i < 0 || tops.has(i)) return;
    const l = handLineFor(groups, i);
    if (l.missing || l.basic < 0) return;
    l.main = !!isMain;
    tops.add(i);
    out.push(l);
  };
  if (main && !main.missing) add(main.top >= 0 ? main.top : main.basic, true);
  // v59: in a toolbox deck no single Pokemon is the plan, so each big attacker is its own option.
  const tb = main && main.toolbox && (main.why === 'box' ? main.toolbox.length >= 2 : main.why !== 'name' && main.why !== 'pick' && main.toolbox.length >= 4) ? main.toolbox : [];
  if (main && main.engine >= 0) add(main.engine, false);
  tb.forEach(i => { if (out.length < 4) add(i, false); });
  out.forEach(l => { if (tb.length) { l.tool = tb.length; l.main = false; } });
  const evo = groups.map((g, i) => ({ g, i }))
    .filter(x => x.g.read && (x.g.stage === 'stage1' || x.g.stage === 'stage2'))
    .sort((a, b) => (b.g.stage === 'stage2') - (a.g.stage === 'stage2') || b.g.qty - a.g.qty);
  // A Stage 1 that another Stage 2 here grows from is part of that line, not its own.
  const bridges = new Set(evo.filter(x => x.g.stage === 'stage2').map(x => handLineFor(groups, x.i).s1).filter(i => i >= 0));
  evo.forEach(x => { if (out.length < 4 && !bridges.has(x.i)) add(x.i, false); });
  return out;
}

/**
 * Odds for one line given the known hand. Each trial shuffles the 53 other
 * cards, takes six prizes, then the draws for turns 1, 2 and 3 (you draw on
 * turn 1 whether you go first or second). "With search" lets each search
 * card seen fetch one missing piece, but only while a copy is still in the
 * deck, so a fully prized piece cannot be searched out.
 */
function handLineOdds(S, line, trials, seed, fixed) {
  const { groups, handCount, rest } = S;
  const G = groups.length;
  const candy = groups.map((g, i) => g.candy ? i : -1).filter(i => i >= 0);
  const isSB = groups.map(g => g.sBasic), isSA = groups.map(g => g.sAny), isSI = groups.map(g => g.sItem);
  const rng = simRng(seed);
  const arr = Int32Array.from(rest);
  const N = arr.length;
  const prized = new Int32Array(G);
  const dr = [null, -1, -1, -1];
  let r2 = 0, s2 = 0, s3 = 0, lock = 0;
  // Turn t draws are rest[6], rest[7], rest[8]: hand by turn t is the 7 plus t draws.
  const by = (k, t) => { let n = handCount[k]; for (let i = 1; i <= Math.min(t, 3); i++) if (dr[i] === k) n++; return n; };
  const srch = t => { const o = { b: 0, a: 0, i: 0 };
    for (let g = 0; g < G; g++) { const n = by(g, t); if (!n) continue; if (isSB[g]) o.b += n; else if (isSA[g]) o.a += n; if (isSI[g]) o.i += n; }
    return o; };

  for (let t = 0; t < trials; t++) {
    if (!fixed) for (let i = 0; i < 9; i++) {
      const j = i + Math.floor(rng() * (N - i));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    prized.fill(0);
    for (let i = 0; i < 6; i++) prized[arr[i]]++;
    dr[1] = arr[6]; dr[2] = arr[7]; dr[3] = arr[8];
    const left = T => k => groups[k].qty - prized[k] - by(k, T);
    if (lineReadyBy(line, 2, candy, by, left(2), null)) r2++;
    if (lineReadyBy(line, 2, candy, by, left(2), srch)) s2++;
    if (lineReadyBy(line, 3, candy, by, left(3), srch)) s3++;
    const gone = k => k >= 0 && handCount[k] === 0 && prized[k] === groups[k].qty;
    let lk = gone(line.basic) || (line.stage !== 'basic' && gone(line.top));
    if (line.stage === 'stage2' && (line.s1 < 0 || gone(line.s1)) && candy.every(gone)) lk = true;
    if (lk) lock++;
  }
  return { r2: r2 / trials, s2: s2 / trials, s3: s3 / trials, lock: lock / trials };
}

/** 3.2.8 (Muse s5 M4): true when the hand holds an Energy the attacker's attacks can use (a Special Energy,
 *  a Basic Energy of a type in a cost, or any when a cost is all Colorless), or a card that finds or attaches
 *  Energy. An attacker with a free attack, or with no attack read, needs none. */
function hpEnergyIn(deck, g, hand, cardsOnly) {
  if (!g) return true;
  const raw = (deck.cards || []).filter(c => String(c.name || '').toLowerCase() === g.key);
  const costs = raw.flatMap(c => (c.attacks || []).map(a => (a.cost || []).map(t => String(t).toLowerCase())));
  if (!costs.length || costs.some(c => !c.length || c[0] === 'free')) return true;
  const anyType = costs.some(c => c.every(t => t === 'colorless')), types = new Set(costs.flat());
  return (hand || []).some(x => {
    const c = x && x.card;
    if (!c) return false;
    if (String(c.supertype || '').toLowerCase() === 'energy') {
      const m = String(c.name || '').match(/^(?:Basic )?(\w+) Energy$/i), sp = (c.subtypes || []).some(t => /special/i.test(t));
      return sp || !m || anyType || types.has(m[1].toLowerCase());
    }
    if (cardsOnly) return false;
    if ((c.provides || []).includes('energy_accel')) return true;
    try { return typeof g273ESearch === 'function' && g273ESearch(c); } catch (_) { return false; }
  });
}
/** 3.3.1 (Muse 3.3 retest, section 5 M4): a hand with no Energy card says so on a line of its own, every
 *  time, with the cards in it that can get one. The line under each attacker counts Energy cards only, so a
 *  hand with none never reads as ready to attack. */
function hpNoEnergyLine(hand) {
  const isE = c => String((c && c.supertype) || '').toLowerCase() === 'energy';
  if ((hand || []).some(x => x && isE(x.card))) return '';
  const get = [];
  (hand || []).forEach(x => {
    const c = x && x.card;
    if (!c || get.includes(c.name)) return;
    let ok = (c.provides || []).includes('energy_accel');
    try { ok = ok || (typeof g273ESearch === 'function' && g273ESearch(c)); } catch (_) {}
    if (ok) get.push(c.name);
  });
  return `<div class="g-sec-i hp-noe"><b>No Energy card in this hand.</b> ${get.length ? esc(get.join(' or ')) + ' can get you one.' : 'Nothing in it gets you one either.'}</div>`;
}

function handIsBasic(groups, g) { return groups[g] && groups[g].basic; }

/** Deal a fresh opening hand, redealing hands with no Basic like a real game. */
function dealHand() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  const cards = (deck.cards || []).filter(c => c.count > 0);
  const groups = simGroups(cards);
  const gid = {}; groups.forEach((g, i) => gid[g.key] = i);
  const pool = [];
  cards.forEach(c => { const i = gid[String(c.name || '').toLowerCase()]; for (let k = 0; k < c.count; k++) pool.push({ card:c, g:i }); });
  const anyBasic = groups.some(g => g.basic);
  let mulls = 0;
  for (;;) {
    shuffle(pool);
    if (!anyBasic || pool.slice(0, 7).some(x => handIsBasic(groups, x.g)) || mulls >= 30) break;
    mulls++;
  }
  const hand = pool.slice(0, 7);
  const after = pool.slice(7);
  handState = {
    deckId: deck.id, groups, hand, mulls, anyBasic,
    restOrder: after,        // this deal as it actually fell: 6 prizes, then draws
    pick: null, locked: false,
  };
  renderHand();
}

function pickHandLine(i) {
  if (!handState || handState.locked) return;
  handState.pick = i;
  renderHand();
}

function lockHandLine() {
  if (!handState || handState.pick == null) return;
  handState.locked = true;
  renderHand();
}

function handCardHTML(card) {
  const rawName = card.apiName || card.name;
  const displayName = esc(String(rawName).replace(/\{[a-zA-Z]\}/g, '').trim());
  const fallbacks = esc(JSON.stringify(card.fallbackUrls || []));
  const img = card.imageUrl
    ? `<img src="${esc(card.imageUrl)}" alt="${esc(rawName)}" data-fallbacks="${fallbacks}" data-fallback-idx="0" onerror="reviewImgError(this)">`
    : `<div class="review-placeholder"><i class=ph-card></i></div>`;
  return `<div class="review-card"><div class="review-card-img">${img}</div><div class="review-card-name">${displayName}</div></div>`;
}

function renderHand() {
  const el = document.getElementById('hand-body');
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!el || !deck) return;
  const total = deck.cards.reduce((a, c) => a + c.count, 0);
  if (total < 16) {
    el.innerHTML = `<div class="g-empty">This list is too short for hand practice.<br><br>It needs an opening hand, six prizes and three draws.</div>`;
    return;
  }
  if (!handState || handState.deckId !== deck.id) { dealHand(); return; }

  const H = handState, groups = H.groups;
  const handCount = new Int32Array(groups.length);
  H.hand.forEach(x => handCount[x.g]++);
  const rest = H.restOrder.map(x => x.g);
  const opts = handLineOptions(deck, groups);
  const anyRead = groups.some(g => g.read);
  const nm = i => i >= 0 ? esc(groups[i].name) : '';

  let h = `<div class="hp-wrap"><div class="g-sec">
    <div class="g-sec-t">Opening hand</div>
    <div class="g-sec-i">A random 7 from this list. Pick the line you would build on turn 1, lock it in, then see how often it comes together.</div>
    <div class="hp-meta">
      ${H.mulls ? `<span class="hp-pill warn">${H.mulls} mulligan${H.mulls !== 1 ? 's' : ''} before this hand</span>` : '<span class="hp-pill">Kept the first 7</span>'}
      ${!H.anyBasic ? '<span class="hp-pill warn">No Basic read, mulligan rule off</span>' : ''}
    </div>
    <div class="hp-hand">${H.hand.map((x, i) => gfIsBasic(x)
      ? `<button type="button" class="hp-basic" onclick="hpCardSheet(${i})" title="Set up ${esc(x.card.name)} and play this hand in Goldfish" aria-label="Set up ${esc(x.card.name)} in Goldfish">${handCardHTML(x.card)}<span class="hp-basic-tag">Set up</span></button>`
      : `<button type="button" class="hp-card" onclick="hpCardSheet(${i})" aria-label="${esc(x.card.name)}">${handCardHTML(x.card)}</button>`).join('')}</div>
    ${hpNoEnergyLine(H.hand)}
    ${H.hand.some(gfIsBasic) ? '<div class="g-sec-i hp-basic-tip">Tap a Basic to put it in play and carry on in Goldfish with this same hand.</div>' : ''}`;

  if (!anyRead || !opts.length) {
    h += `<div class="g-item warn"><div class="gt">${!anyRead ? 'No card data yet' : 'No Pokémon line read'}</div>
      <p>${!anyRead ? 'Lines need each card\'s stage and role. Open Edit deck and save it to fetch them.' : 'No complete evolution line or attacker was read in this list, so there is nothing to compare. Re-saving the deck retries the lookup.'}</p></div>
      <div class="hp-actions"><button class="btn btn-primary" onclick="dealHand()"><svg class="ic"><use href="#i-hand"/></svg>New hand</button></div></div></div>`;
    el.innerHTML = h;
    return;
  }

  const stageTxt = s => s === 'stage2' ? 'Stage 2' : s === 'stage1' ? 'Stage 1' : 'Basic';
  const pieceList = l => [l.basic, l.s1, l.top].filter(i => i >= 0);
  const candyIdx = groups.map((g, i) => g.candy ? i : -1).filter(i => i >= 0);
  const describe = l => {
    const pieces = pieceList(l);
    const inHand = pieces.filter(i => handCount[i] > 0).map(nm);
    const need = [];
    if (!handCount[l.basic]) need.push(nm(l.basic));
    if (l.stage === 'stage2') {
      const bridgeIn = (l.s1 >= 0 && handCount[l.s1]) || candyIdx.some(i => handCount[i]);
      const br = [l.s1 >= 0 ? nm(l.s1) : '', candyIdx.length ? 'Rare Candy' : ''].filter(Boolean);
      if (!bridgeIn && br.length) need.push(br.join(' or '));
      else candyIdx.filter(i => handCount[i]).forEach(i => inHand.push(nm(i)));
    }
    if (l.top >= 0 && !handCount[l.top]) need.push(nm(l.top));
    // 3.2.8 (Muse s5 M4): an attacker is not ready without Energy for its attack, so the line counts an Energy
    // its attack can use, or a card that finds or attaches one, before it says every piece is in hand.
    const noE = (l.main || l.tool) && !hpEnergyIn(deck, groups[l.top >= 0 ? l.top : l.basic], H.hand, true);
    const eTxt = noE ? (need.length ? ' No Energy to attack with in hand either.' : 'Every Pokémon is in your hand, but no Energy to attack with yet.') : '';
    return `${stageTxt(l.stage)}${l.main ? ', main attacker' : l.tool ? `, one of ${l.tool} attackers` : ''}${l.guessed ? ', from ' + nm(l.basic) + ' with Rare Candy' : ''}. ` +
      (inHand.length ? `In hand: <b>${inHand.join(', ')}</b>. ` : '') +
      (need.length ? `Still need: ${need.join(', ')}.${eTxt}` : eTxt || 'Every piece is in your hand.');
  };

  h += `<div class="g-sec-t">Your turn 1 line</div>
    <div class="g-sec-i">Which Pokémon would you set up first with this hand?</div>
    <div class="hp-opts" role="radiogroup">`;
  opts.forEach((l, i) => {
    const active = H.pick === i;
    h += `<button class="hp-opt${active ? ' active' : ''}" role="radio" aria-checked="${active}" ${H.locked ? 'disabled' : ''} onclick="pickHandLine(${i})">
      <span class="hp-radio"></span>
      <span><span class="hp-n" style="display:block">${esc(l.name)}</span><span class="hp-s" style="display:block">${describe(l)}</span></span>
    </button>`;
  });
  h += `</div>`;

  if (!H.locked) {
    h += `<div class="hp-actions">
      <button class="btn" onclick="dealHand()"><svg class="ic"><use href="#i-hand"/></svg>New hand</button>
      <button class="btn btn-primary" id="hp-lock" onclick="lockHandLine()" ${H.pick == null ? 'disabled' : ''}>Lock in line</button>
      <button class="btn hp-play" onclick="gfFromHand()">Play this hand in Goldfish</button>
    </div></div></div>`;
    el.innerHTML = h;
    return;
  }

  // Locked in: odds for every line from this exact hand.
  const S = { groups, handCount, rest };
  const handSeed = simSeed(deck.cards) ^ H.hand.reduce((a, x) => Math.imul(a ^ (x.g + 1), 16777619), 2166136261);
  const res = opts.map((l, i) => ({ l, i, o: handLineOdds(S, l, HAND_TRIALS, (handSeed + i * 7919) >>> 0) }));
  const pick = res[H.pick];
  // A Stage 2 with no Rare Candy in the list cannot be up before turn 3, so compare on turn 3 then.
  const tH = lineFirstTurn(pick.l, groups);
  const sc = r => tH === 3 ? r.o.s3 : r.o.s2;
  const best = res.reduce((a, b) => sc(b) > sc(a) ? b : a, res[0]);
  const tone = (x, hi, lo) => x >= hi ? 'var(--green)' : x >= lo ? 'var(--electric)' : 'var(--fire)';
  const toneBad = (x, lo, hi) => x <= lo ? 'var(--green)' : x <= hi ? 'var(--electric)' : 'var(--fire)';

  h += `<div class="o-tiles">
    <div class="o-tile" style="--tone:${tone(pick.o.s2, 0.6, 0.4)}"><div class="ol">This hand by T2</div><div class="ov">${oPct(pick.o.s2)}</div><div class="os">${oPct(pick.o.r2)} on raw draws</div></div>
    <div class="o-tile" style="--tone:${tone(pick.o.s3, 0.7, 0.5)}"><div class="ol">This hand by T3</div><div class="ov">${oPct(pick.o.s3)}</div><div class="os">This opening hand only, with search</div></div>
    <div class="o-tile" style="--tone:${toneBad(pick.o.lock, 0.02, 0.06)}"><div class="ol">Locked in prizes</div><div class="ov">${oPct(pick.o.lock)}</div><div class="os">A piece fully prized</div></div>
  </div>
  <div class="o-meta">${HAND_TRIALS.toLocaleString('en-US')} shuffles of the other ${rest.length} cards for each line. Same hand, same numbers.</div>`;

  const gap = sc(best) - sc(pick);
  const turnW = tH === 3 ? 'third' : 'second';
  if (best.i === pick.i || gap < 0.02) {
    h += `<div class="g-item ok"><div class="gt">Good read: ${best.i === pick.i ? esc(pick.l.name) + ' is the best line from this hand' : esc(pick.l.name) + ' is level with the best line from this hand'}</div>
      <p>${oPct(sc(pick))} to be ready by your ${turnW} turn.${tH === 3 ? ' With no Rare Candy in the list, turn 3 is the earliest it can be in play.' : ''}${best.i !== pick.i ? ` ${esc(best.l.name)} edges it at ${oPct(sc(best))}.` : ''}</p></div>`;
  } else {
    h += `<div class="g-item ${gap >= 0.15 ? 'crit' : 'warn'}"><div class="gt">${esc(best.l.name)} had better odds from this hand</div>
      <p>${oPct(sc(best))} by turn ${tH} against ${oPct(sc(pick))} for ${esc(pick.l.name)}. Look at which pieces are already in your hand and which search cards can reach the rest.</p></div>`;
  }

  h += `<div class="g-sec" style="margin-top:1rem"><div class="g-sec-t">Every line from this hand</div>
    <div class="o-table-wrap"><table class="o-table"><thead><tr><th>Line</th><th>T2 raw</th><th>T2 search</th><th>T3</th></tr></thead><tbody>`;
  res.forEach(r => {
    const tags = (r.i === H.pick ? '<span class="o-tag">Your pick</span>' : '') + (r.i === best.i && r.i !== H.pick ? '<span class="o-tag">Best</span>' : '');
    h += `<tr class="${r.i === H.pick ? 'hp-row-pick' : ''}"><td>${esc(r.l.name)}${tags}</td><td>${oPct1(r.o.r2)}</td><td>${oPct1(r.o.s2)}</td><td>${oPct1(r.o.s3)}</td></tr>`;
  });
  h += `</tbody></table></div></div>`;

  // This deal as it actually fell.
  const pz = H.restOrder.slice(0, 6), dr = H.restOrder.slice(6, 8);
  const keyPieces = new Set(pieceList(pick.l).concat(pick.l.stage === 'stage2' ? candyIdx : []));
  const chip = x => `<span class="hp-chip${keyPieces.has(x.g) ? ' key' : ''}">${esc(String(x.card.apiName || x.card.name).replace(/\{[a-zA-Z]\}/g, '').trim())}</span>`;
  const prz = new Int32Array(groups.length), drw = new Int32Array(groups.length);
  pz.forEach(x => prz[x.g]++); dr.forEach(x => drw[x.g]++);
  const dealt = handLineOdds({ groups, handCount, rest: H.restOrder.map(x => x.g) }, pick.l, 1, 0, true);
  const dealMsg = dealt.r2 ? esc(pick.l.name) + ' was ready by turn 2 on draws alone'
    : dealt.s2 ? esc(pick.l.name) + ' was ready by turn 2 using your search cards'
    : tH === 3 && dealt.s3 ? esc(pick.l.name) + ' was ready by turn 3, the earliest it can be'
    : esc(pick.l.name) + ' was not ready by turn ' + tH + ' this time';
  h += `<div class="g-sec"><div class="g-sec-t">How this deal fell</div>
    <div class="g-sec-i">The prizes and draws this shuffle actually gave you. Highlighted cards are pieces of your line.</div>
    <div class="hp-lbl">Prizes</div><div class="hp-chips">${pz.map(chip).join('')}</div>
    <div class="hp-lbl">Turn 1 and 2 draws</div><div class="hp-chips">${dr.map(chip).join('')}</div>${tH === 3 ? `<div class="hp-lbl">Turn 3 draw</div><div class="hp-chips">${H.restOrder.slice(8, 9).map(chip).join('')}</div>` : ''}
    <div class="g-item ${dealt.s2 || (tH === 3 && dealt.s3) ? 'ok' : 'warn'}" style="margin-top:0.75rem"><div class="gt">${dealMsg}</div>
      <p>${[...keyPieces].filter(k => prz[k] > 0).length ? 'Prized: ' + [...keyPieces].filter(k => prz[k] > 0).map(nm).join(', ') + '.' : 'None of its pieces were prized.'}</p></div>
  </div>`;

  h += `<div class="hp-actions"><button class="btn btn-primary" onclick="dealHand()"><svg class="ic"><use href="#i-hand"/></svg>New hand</button><button class="btn hp-play" onclick="gfFromHand()">Play this hand in Goldfish</button></div>
    <div class="g-wip"><b>What this counts.</b> Search cards each fetch one missing piece if a copy is still in the deck. Draw Supporters, abilities, discard costs and the one Supporter per turn rule are not played out, the same as the Odds tab. Play this hand in Goldfish plays them out turn by turn, with the same prizes and draws.</div>
  </div></div>`;
  el.innerHTML = h;
}

// ═══════════ DECK LINKS (v22) ═══════════
// A deck rides in the link's hash (#deck=...), so it never reaches a server.
// Opening the link fills the normal Import sheet; nothing saves until the
// player taps Import, and the text goes through the same parser as a paste.
const SHARE_HOME = 'https://rdydeck.com/';
const SHARE_MAX_TEXT = 6000;

function shareBaseUrl() {
  if (/^https?:$/.test(location.protocol)) return location.origin + location.pathname;
  return SHARE_HOME;
}

function b64urlFromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function streamBytes(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/** Strip control, bidi and markup characters, and cap the length. */
function cleanSharedText(s, max) {
  return String(s || '').normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF<>]/g, '')
    .slice(0, max);
}

function deckShareText(deck) {
  return 'n:' + cleanSharedText(deck.name, 60).replace(/\n/g, ' ') + '\n'
    + (deck.format === 'expanded' || deck.format === 'prerelease' ? 'f:' + deck.format + '\n' : '')
    + deckListText(deck.cards);
}

/** Code for the link: '2' + deflated text when the browser can, else '1' + plain text. */
async function encodeDeckShare(deck) {
  const bytes = new TextEncoder().encode(deckShareText(deck));
  if (typeof CompressionStream !== 'undefined') {
    try { return '2' + b64urlFromBytes(await streamBytes(bytes, new CompressionStream('deflate-raw'))); } catch (_) {}
  }
  return '1' + b64urlFromBytes(bytes);
}

/** Returns { name, format, list } or null. Never throws. */
async function decodeDeckShare(code) {
  try {
    code = String(code || '').trim();
    if (code.length > 12000 || !/^[12][A-Za-z0-9_-]+$/.test(code)) return null;
    let bytes = bytesFromB64url(code.slice(1));
    if (code[0] === '2') {
      if (typeof DecompressionStream === 'undefined') return { unsupported: true };
      bytes = await streamBytes(bytes, new DecompressionStream('deflate-raw'));
    }
    if (bytes.length > SHARE_MAX_TEXT * 4) return null;
    const text = cleanSharedText(new TextDecoder().decode(bytes), SHARE_MAX_TEXT);
    let name = '', format = 'standard';
    const lines = [];
    text.split('\n').slice(0, 120).forEach(line => {
      if (line.startsWith('n:') && !name) { name = line.slice(2).trim().slice(0, 60); return; }
      if (line.startsWith('f:')) { const f = line.slice(2).trim(); format = f === 'expanded' || f === 'prerelease' ? f : 'standard'; return; }
      lines.push(line.slice(0, 120));
    });
    const list = lines.join('\n').trim();
    if (!parseDeckList(list).length) return null;
    return { name, format, list };
  } catch (_) { return null; }
}

let _deckShareUrl = '';
async function openDeckShare() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  if (!deck) return;
  const code = await encodeDeckShare(deck);
  _deckShareUrl = shareBaseUrl() + '#deck=' + code;
  document.getElementById('dl-name').textContent = deck.name;
  const total = deck.cards.reduce((a, c) => a + c.count, 0);
  document.getElementById('dl-sub').textContent = `${total} cards, ${deck.format === 'expanded' ? 'Expanded' : deck.format === 'prerelease' ? 'Prerelease' : 'Standard'}`;
  document.getElementById('dl-link').value = _deckShareUrl;
  document.getElementById('dl-native').style.display = navigator.share ? '' : 'none';
  document.getElementById('deck-share-modal').classList.add('active');
}
function closeDeckShare() { document.getElementById('deck-share-modal').classList.remove('active'); }

async function copyDeckLink() {
  const input = document.getElementById('dl-link');
  try { await navigator.clipboard.writeText(_deckShareUrl); showToast('Deck link copied.'); return; } catch (_) {}
  try { input.focus(); input.select(); document.execCommand('copy'); showToast('Deck link copied.'); }
  catch (_) { showToast('Select the link and copy it.'); }
}
async function nativeShareDeckLink() {
  const deck = state.decks.find(d => d.id === state.activeDeckId);
  try { await navigator.share({ title: (deck ? deck.name + ' in ' : '') + 'RdyDeck', url: _deckShareUrl }); } catch (_) {}
}

// v45: a link from Share grade ends in &g=1, so the grade opens once the list is imported.
let _v45GradeAfterImport = false;
// 2.7: a grade link also carries the deck's Main attacker pick (&a=), so whoever opens it sees the same grade.
let _gs261Atk = '';
/** Open a #deck= link: decode it and fill the Import sheet for the player to check.
 * 3.2.1: the deck stays in the address bar until the sheet is closed or the list is imported,
 * so "Open in browser" from a chat app's own browser, or a reload, still carries the deck.
 * Every deck link now opens the grade once the list is imported, not only Share grade links. */
let _shareHashOpen = false;
function clearShareHash() {
  if (!_shareHashOpen) return;
  _shareHashOpen = false;
  if (/^#deck=/.test(location.hash || '')) { try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {} }
}
async function handleShareHash() {
  const m = /^#deck=([^&]*)/.exec(location.hash || '');
  if (!m) return;
  const hash0 = location.hash || '';
  const fromGrade = /&g=1(&|$)/.test(hash0);
  _v45GradeAfterImport = false;
  _gs261Atk = '';
  let raw = '';
  try { raw = decodeURIComponent(m[1]); } catch (_) {}
  const shared = await decodeDeckShare(raw);
  _shareHashOpen = true;
  if (!shared || shared.unsupported) clearShareHash();
  if (!shared) { showToast('That deck link could not be read.'); return; }
  if (shared.unsupported) { showToast('This browser cannot open compressed deck links. Try an up to date browser.'); return; }
  showScreen('home');
  const have = state.decks.find(d => deckListText(d.cards) === deckListText(parseDeckList(shared.list)));
  if (have) { clearShareHash(); openReview(have.id); showToast(`You already have this list as "${have.name}".`); return; }
  openImportModal();
  document.getElementById('import-name').value = shared.name || 'Shared deck';
  const ta = document.getElementById('import-list');
  ta.value = shared.list;
  ta.dispatchEvent(new Event('input'));
  setImportFormat(shared.format);
  const note = document.getElementById('import-share-note');
  note.textContent = 'Shared deck from a link. Tap Import and save to see its grade.';
  _v45GradeAfterImport = true;
  if (fromGrade) { const a = /&a=([^&]*)/.exec(hash0); try { _gs261Atk = a ? decodeURIComponent(a[1]).slice(0, 80) : ''; } catch (_) {} }
  note.style.display = 'block';
}

// ═══════════ PROGRESS OVER TIME (v22) ═══════════
// History keeps the last 50 games per deck. Progress also keeps a small
// rollup per day, so the long view survives past that cap.
function pgDayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function pgAdd(deck, h, ts) {
  const k = pgDayKey(ts);
  const d = deck.daily[k] || (deck.daily[k] = { g: 0, s: 0, p: 0, t: 0 });
  d.g++; d.s += h.score || 0; d.p += h.prizeCount || 6; d.t += h.time || 0;
}
/** Build the daily rollup once from the history a deck already has. */
function ensureDaily(deck) {
  if (!deck || deck.dailyVer) return;
  deck.daily = {};
  (deck.history || []).forEach(h => {
    const ts = h.ts || Date.parse(h.date);
    if (ts && !isNaN(ts)) pgAdd(deck, h, ts);
  });
  deck.dailyVer = 1;
}

function pgShortDate(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** One single series line chart, 0 based, with hover targets. */
function pgChart(cls, title, pts, fmt, yMax) {
  const W = 320, Hh = 120, L = 34, R = 10, T = 8, B = 22;
  const iw = W - L - R, ih = Hh - T - B;
  const n = pts.length;
  const x = i => L + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const y = v => T + ih - (yMax ? Math.min(v, yMax) / yMax : 0) * ih;
  const ticks = [0, yMax / 2, yMax];
  let s = `<div class="pg-chart ${cls}"><div class="pg-ct">${title}</div>
    <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(title)}">`;
  ticks.forEach(tv => { s += `<line class="pg-grid" x1="${L}" x2="${W - R}" y1="${y(tv)}" y2="${y(tv)}"/><text class="pg-ax" x="${L - 6}" y="${y(tv) + 4}" text-anchor="end">${fmt(tv)}</text>`; });
  s += `<text class="pg-ax" x="${x(0)}" y="${Hh - 4}" text-anchor="${n === 1 ? 'middle' : 'start'}">${esc(pts[0].label)}</text>`;
  if (n > 1) s += `<text class="pg-ax" x="${x(n - 1)}" y="${Hh - 4}" text-anchor="end">${esc(pts[n - 1].label)}</text>`;
  if (n > 1) s += `<polyline class="pg-line" points="${pts.map((p, i) => x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ')}"/>`;
  pts.forEach((p, i) => {
    s += `<circle class="pg-dot" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4"/>`;
    s += `<rect class="pg-hit" x="${(x(i) - Math.max(10, iw / Math.max(1, n) / 2)).toFixed(1)}" y="${T}" width="${Math.max(20, iw / Math.max(1, n)).toFixed(1)}" height="${ih}" data-tip="${esc(p.tip)}" onmousemove="pgTip(event,this)" onmouseleave="pgTip(null)" ontouchstart="pgTip(event,this)"/>`;
  });
  return s + `</svg></div>`;
}
function pgTip(e, el) {
  let tip = document.getElementById('pg-tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'pg-tip'; tip.className = 'pg-tip'; document.body.appendChild(tip); }
  if (!e || !el) { tip.style.display = 'none'; return; }
  const pt = e.touches ? e.touches[0] : e;
  tip.textContent = el.dataset.tip;
  tip.style.display = 'block';
  tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, pt.clientX + 12) + 'px';
  tip.style.top = (pt.clientY - tip.offsetHeight - 10) + 'px';
}

/** Last 10 games against the 10 before them. */
function pgWindows(deck) {
  const hist = deck.history || [];
  const win = arr => arr.length ? {
    n: arr.length,
    acc: arr.reduce((a, h) => a + h.score, 0) / arr.reduce((a, h) => a + (h.prizeCount || 6), 0),
    time: arr.reduce((a, h) => a + (h.time || 0), 0) / arr.length,
  } : null;
  return { now: win(hist.slice(0, 10)), prev: win(hist.slice(10, 20)) };
}

function renderProgressSection(deck) {
  ensureDaily(deck);
  const days = Object.keys(deck.daily || {}).sort();
  const W = pgWindows(deck);
  if (!W.now) return '';
  const accTxt = Math.round(W.now.acc * 100) + '%';
  let accSub = `Last ${W.now.n} game${W.now.n !== 1 ? 's' : ''}`, accCls = '';
  let spdSub = 'Per game, last ' + W.now.n, spdCls = '';
  if (W.prev) {
    const dA = Math.round((W.now.acc - W.prev.acc) * 100);
    accSub = dA === 0 ? `Same as the ${W.prev.n} before` : `${dA > 0 ? 'Up' : 'Down'} ${Math.abs(dA)} pts on the ${W.prev.n} before`;
    accCls = dA > 0 ? 'up' : dA < 0 ? 'down' : '';
    const dT = Math.round(W.now.time - W.prev.time);
    spdSub = dT === 0 ? `Same as the ${W.prev.n} before` : `${Math.abs(dT)}s ${dT < 0 ? 'faster' : 'slower'} than before`;
    spdCls = dT < 0 ? 'up' : dT > 0 ? 'down' : '';
  }
  const totalGames = days.reduce((a, k) => a + deck.daily[k].g, 0);
  let h = `<div class="pg-wrap">
    <div class="section-title">Progress over time</div>
    <div class="pg-tiles">
      <div class="pg-tile"><div class="pl">Accuracy</div><div class="pv">${accTxt}</div><div class="ps ${accCls}">${accSub}</div></div>
      <div class="pg-tile"><div class="pl">Avg time</div><div class="pv">${formatTime(Math.round(W.now.time))}</div><div class="ps ${spdCls}">${spdSub}</div></div>
      <div class="pg-tile"><div class="pl">Days</div><div class="pv">${days.length}</div><div class="ps">${totalGames} game${totalGames !== 1 ? 's' : ''} tracked</div></div>
    </div>`;
  const recent = days.slice(-14);
  if (recent.length >= 2) {
    const accPts = recent.map(k => { const d = deck.daily[k]; const v = d.s / d.p; return { v, label: pgShortDate(k), tip: `${pgShortDate(k)}: ${Math.round(v * 100)}% over ${d.g} game${d.g !== 1 ? 's' : ''}` }; });
    const spdPts = recent.map(k => { const d = deck.daily[k]; const v = d.t / d.g; return { v, label: pgShortDate(k), tip: `${pgShortDate(k)}: ${formatTime(Math.round(v))} per game` }; });
    const maxT = Math.max(60, Math.ceil(Math.max(...spdPts.map(p => p.v)) / 60) * 60);
    h += pgChart('pg-acc', 'Accuracy by day', accPts, v => Math.round(v * 100) + '%', 1);
    h += pgChart('pg-spd', 'Time per game by day', spdPts, v => formatTime(Math.round(v)), maxT);
  } else {
    h += `<div class="ws-card-sub">Play on another day to see a trend line.</div>`;
  }
  const rowsHtml = ks => ks.map(k => { const d = deck.daily[k]; return `<tr><td>${pgShortDate(k)}</td><td>${d.g}</td><td>${Math.round(d.s / d.p * 100)}%</td><td>${formatTime(Math.round(d.t / d.g))}</td></tr>`; }).join('');
  const head = `<div class="o-table-wrap"><table class="o-table"><thead><tr><th>Day</th><th>Games</th><th>Accuracy</th><th>Avg time</th></tr></thead><tbody>`;
  const newest = days.slice().reverse();
  h += `<div class="pg-table">${head}${rowsHtml(newest.slice(0, 7))}</tbody></table></div></div>`;
  if (newest.length > 7) h += `<details class="o-more"><summary>Show all ${newest.length} days</summary>${head}${rowsHtml(newest.slice(7))}</tbody></table></div></details>`;
  return h + `</div>`;
}

/** One line on the results screen: how the last 10 games compare. */
function renderProgressLine(deck) {
  const el = document.getElementById('progress-line');
  if (!el) return;
  if (!deck || (deck.history || []).length < 2) { el.innerHTML = ''; return; }
  const W = pgWindows(deck);
  let s = `Last ${W.now.n} games: <b>${Math.round(W.now.acc * 100)}%</b> accuracy, <b>${formatTime(Math.round(W.now.time))}</b> a game.`;
  if (W.prev) {
    const dA = Math.round((W.now.acc - W.prev.acc) * 100);
    const dT = Math.round(W.now.time - W.prev.time);
    s += ` ${dA === 0 ? 'Accuracy level' : (dA > 0 ? 'Up ' : 'Down ') + Math.abs(dA) + ' pts'} and ${dT === 0 ? 'same pace' : Math.abs(dT) + 's ' + (dT < 0 ? 'faster' : 'slower')} than the ${W.prev.n} before.`;
  }
  el.innerHTML = s;
}

// ═══════════ TABLE CHECK (v22) ═══════════
// Prize check the way it happens at a table: a legal opening 7 sits in your
// hand, six prizes come off, and you flip through the other 47.
function dealTableCheck(expanded, pc) {
  const isB = c => cardCategory(c) === 'pokemon' && c.stage === 'basic';
  const anyB = expanded.some(isB);
  let tries = 0;
  do { shuffle(expanded); tries++; } while (anyB && !expanded.slice(0, 7).some(isB) && tries < 50);
  game.hand = expanded.slice(0, 7);
  game.prizes = expanded.slice(7, 7 + pc);
  game.visible = expanded.slice(7 + pc);
  shuffle(game.visible);
}

function renderHandStrip() {
  const el = document.getElementById('hand-strip');
  if (!el) return;
  const hand = game.hand || [];
  const viewer = el.parentElement;
  if (viewer) viewer.classList.toggle('has-hand', hand.length > 0);
  if (!hand.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `<div class="hand-strip-label">Your hand (${hand.length}), not in the deck below</div><div class="hand-row">` +
    hand.map((c, i) => {
      const nm = esc(String(c.apiName || c.name).replace(/\{[a-zA-Z]\}/g, '').trim());
      const fb = esc(JSON.stringify(c.fallbackUrls || []));
      return `<button class="hand-mini" onclick="showToast(this.title)" title="${nm}" aria-label="${nm}">` +
        (c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${nm}" data-name="${nm}" data-fallbacks="${fb}" data-fallback-idx="0" onerror="swapImgOrPlaceholder(this,'hm-n')">` : `<span class="hm-n">${nm}</span>`) +
        `</button>`;
    }).join('') + `</div>`;
}


// ═══════════ v23: shared helpers ═══════════
const DAILY_ID = '__daily';
// 3.3.3 (Muse 3.3.2 retest): deck.daily is two things. On the Daily challenge deck it is true; on a saved deck it is
// the per-day practice rollup (an object, see ensureDaily). Checks that mean the Daily challenge ask this, so a saved
// deck someone has practiced with keeps its Upgrades, grade history, results blend, legality cap and rotation read.
function isDailyChallenge(d) { return !!d && (d.daily === true || d.id === DAILY_ID); }
const ic23 = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
const EN23 = { g: 'Grass', r: 'Fire', w: 'Water', l: 'Lightning', p: 'Psychic', f: 'Fighting', d: 'Darkness', m: 'Metal', y: 'Fairy', n: 'Dragon', c: 'Colorless' };
const cn23 = n => String(n || '').replace(/\{([a-zA-Z])\}/g, (m, l) => EN23[l.toLowerCase()] || '').replace(/\s+/g, ' ').trim();
const lbl23 = c => cn23(c.apiName || c.name);
const clean23 = (s, max) => String(s == null ? '' : s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/[<>]/g, '')
  .slice(0, max || 200);
const one23 = (s, max) => clean23(s, max).replace(/[\r\n\t]+/g, ' ').trim();

function findDeck(id) {
  return state.decks.find(d => d.id === id) || (id === DAILY_ID ? dailyDeck() : null);
}
function shortDate23(ts) {
  try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (_) { return pgDayKey(ts); }
}
const shuf = a => shuffleWith(a, Math.random);
function shuffleWith(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// One sheet for the new pop ups. Its inner HTML is set per use.
function openSheet(html, wide) {
  const m = document.getElementById('x-modal');
  document.getElementById('x-modal-inner').innerHTML = html;
  m.querySelector('.modal').classList.toggle('x-wide', !!wide);
  m.classList.add('active');
}
function closeSheet() { document.getElementById('x-modal').classList.remove('active'); }

function drillStat(deck, key, correct, total) {
  const box = deck ? (deck.drills = deck.drills || {}) : (state.drillStats = state.drillStats || {});
  const s = box[key] = box[key] || { g: 0, c: 0, n: 0, last: 0 };
  s.g++; s.c += correct; s.n += total; s.last = Date.now();
  saveState();
}

// ═══════════ EDIT LOG (v23) ═══════════
// Every saved version of a list is kept as a small snapshot, so the log can
// show each change and the compare view can pick any earlier version.
const VER_MAX = 40;
function snapCards(cards) {
  return (cards || []).map(c => ({ name: c.name, set: c.set || '', num: c.num || '', count: c.count, section: c.section || undefined }));
}
function ensureVersions(deck) {
  if (!deck || deck.id === DAILY_ID) return [];
  if (!Array.isArray(deck.versions) || !deck.versions.length) {
    deck.versions = [{ ts: Date.now(), kind: 'start', cards: snapCards(deck.cards) }];
  }
  return deck.versions;
}
function startVersions(deck, kind, from) {
  deck.versions = [{ ts: Date.now(), kind: kind || 'import', from: from ? one23(from, 80) : undefined, cards: snapCards(deck.cards) }];
}
function cardTotals(cards) {
  const m = new Map();
  (cards || []).forEach(c => {
    const k = normalizeCardName(c.name);
    const e = m.get(k) || { name: cn23(c.name), n: 0, prints: [] };
    e.n += c.count;
    e.prints.push(((c.set || '') + ' ' + (c.num || '')).trim().toUpperCase());
    m.set(k, e);
  });
  return m;
}
/** Totals for a pile of single cards (one entry per copy). */
function pileTotals(arr) {
  const m = new Map();
  (arr || []).forEach(c => {
    const k = normalizeCardName(c.name);
    const e = m.get(k) || { name: cn23(c.name), n: 0 };
    e.n++;
    m.set(k, e);
  });
  return m;
}
function diffCards(a, b) {
  const A = cardTotals(a), B = cardTotals(b), out = [];
  new Set([...A.keys(), ...B.keys()]).forEach(k => {
    const x = A.get(k), y = B.get(k);
    const from = x ? x.n : 0, to = y ? y.n : 0;
    if (from !== to) out.push({ name: (y || x).name, from, to });
    else if (x && y && x.prints.slice().sort().join('|') !== y.prints.slice().sort().join('|')) out.push({ name: y.name, from, to, print: true });
  });
  return out.sort((p, q) => (q.to - q.from) - (p.to - p.from) || p.name.localeCompare(q.name));
}
function recordVersion(deck) {
  const v = ensureVersions(deck);
  const last = v[v.length - 1];
  if (!diffCards(last.cards, deck.cards).length) return false;
  v.push({ ts: Date.now(), kind: 'edit', cards: snapCards(deck.cards) });
  if (v.length > VER_MAX) deck.versions = [v[0]].concat(v.slice(v.length - VER_MAX + 1));
  return true;
}
function changeChip(c) {
  if (c.print) return `<span class="el-chip print">${esc(c.name)} <small>new printing</small></span>`;
  const d = c.to - c.from;
  const sub = c.from === 0 ? 'new' : c.to === 0 ? 'cut' : `${c.from} to ${c.to}`;
  return `<span class="el-chip ${d > 0 ? 'add' : 'cut'}">${d > 0 ? '+' : '−'}${Math.abs(d)} ${esc(c.name)} <small>${sub}</small></span>`;
}
function verLabel(deck, i) {
  const v = deck.versions[i];
  if (i === 0) return (v.kind === 'start' ? 'When the log started' : v.kind === 'copy' ? 'When duplicated' : 'As imported') + ', ' + shortDate23(v.ts);
  return 'Version ' + (i + 1) + ', ' + shortDate23(v.ts);
}

function renderEditLog(deck) {
  const v = ensureVersions(deck);
  const first = v[0];
  const net = diffCards(first.cards, deck.cards);
  const startTxt = first.kind === 'start'
    ? `The log started ${shortDate23(first.ts)}. Changes made before then were not recorded.`
    : first.kind === 'copy' ? `Duplicated${first.from ? ' from ' + esc(first.from) : ''} ${shortDate23(first.ts)}.`
    : `Imported ${shortDate23(first.ts)}.`;
  let h = `<div class="g-sec" id="el-sec"><div class="g-sec-t">Edit log</div>
    <div class="g-sec-i">Every card change saved from Edit deck, so you can see how the list grew. ${startTxt}</div>`;
  if (v.length === 1) {
    h += `<div class="nt-empty">No changes yet. Save a change in Edit deck and it shows here with the date.</div></div>`;
    return h;
  }
  h += `<div class="el-net"><div class="hp-lbl">Since ${first.kind === 'start' ? 'the log started' : first.kind === 'copy' ? 'duplicating' : 'import'}</div>
    <div class="hp-chips">${net.length ? net.map(changeChip).join('') : '<span class="nt-muted">Back to the starting list.</span>'}</div></div>
    <div class="el-list">`;
  for (let i = v.length - 1; i >= 1; i--) {
    const ch = diffCards(v[i - 1].cards, v[i].cards);
    const games = (deck.history || []).filter(g => g.ts >= v[i].ts && (i === v.length - 1 || g.ts < v[i + 1].ts)).length;
    h += `<div class="el-row"><div class="el-when"><b>Version ${i + 1}</b><span>${shortDate23(v[i].ts)}${games ? ', ' + games + ' game' + (games !== 1 ? 's' : '') : ''}</span></div>
      <div class="hp-chips">${ch.map(changeChip).join('')}</div></div>`;
  }
  h += `</div><div class="hp-actions" style="margin:0.75rem 0 0"><button class="btn" onclick="openCompare('v:0')">${ic23('compare')}Compare with ${first.kind === 'start' ? 'the start' : 'the original'}</button></div></div>`;
  return h;
}

// ═══════════ MATCHUP NOTES (v23) ═══════════
function matchupFor(deck, opp) {
  const k = String(opp || '').trim().toLowerCase();
  if (!deck || !k) return null;
  return (deck.matchups || []).find(m => m.opp.toLowerCase() === k) || null;
}
function renderMatchups(deck) {
  const list = (deck.matchups || []).slice().sort((a, b) => a.opp.localeCompare(b.opp));
  let h = `<div class="g-sec"><div class="g-sec-t">Matchup notes</div>
    <div class="g-sec-i">Your prize plan against each deck you expect to face. Saved on this device only.</div>`;
  if (!list.length) h += `<div class="nt-empty">No notes yet. Add one for the decks you see most at your locals.</div>`;
  list.forEach(m => {
    const rec = tlogRecord(state.tlog || [], x => x.deckId === deck.id && x.opp.toLowerCase() === m.opp.toLowerCase());
    h += `<div class="mu-card"><div class="mu-top"><div class="mu-opp">${esc(m.opp)}</div>
      ${rec.n ? `<span class="hp-pill">${rec.w}-${rec.l}-${rec.t}</span>` : ''}
      <button class="icon-btn sm" onclick="openMatchupForm('${m.id}')" aria-label="Edit note" title="Edit note">${ic23('edit')}</button></div>
      <div class="mu-plan">${esc(m.plan).replace(/\n/g, '<br>') || '<span class="nt-muted">No plan written yet.</span>'}</div>
      <div class="mu-date">Updated ${shortDate23(m.ts)}</div></div>`;
  });
  h += `<div class="hp-actions" style="margin:0.75rem 0 0"><button class="btn" onclick="openMatchupForm()">${ic23('plus')}Add matchup note</button></div></div>`;
  return h;
}
function openMatchupForm(id, presetOpp) {
  const deck = findDeck(state.activeDeckId);
  if (!deck) return;
  const m = id ? (deck.matchups || []).find(x => x.id === id) : null;
  const opps = [...new Set((state.tlog || []).map(x => x.opp).filter(Boolean))].slice(0, 30);
  openSheet(`<div class="modal-title">${m ? 'Edit matchup note' : 'New matchup note'}</div>
    <div class="mb"><label for="mu-opp">Opposing deck</label>
      <input type="text" id="mu-opp" maxlength="60" placeholder="e.g. Gardevoir ex" list="mu-opp-list" value="${esc(m ? m.opp : presetOpp || '')}">
      <datalist id="mu-opp-list">${opps.map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>
    <div class="mb"><label for="mu-plan">Prize plan</label>
      <textarea id="mu-plan" class="nt-area" maxlength="2000" placeholder="Take a 2 then a 2 then a 2. Bench only two Basics. Save Boss's Orders for the Kirlia.">${esc(m ? m.plan : '')}</textarea></div>
    <div class="modal-actions">
      ${m ? `<button class="btn btn-ghost danger-txt" onclick="deleteMatchup('${m.id}')">Delete</button>` : `<button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>`}
      <button class="btn btn-primary" onclick="saveMatchup('${m ? m.id : ''}')">Save</button>
    </div>`);
}
async function saveMatchup(id) {
  const deck = findDeck(state.activeDeckId);
  if (!deck) return;
  const opp = one23(document.getElementById('mu-opp').value, 60);
  const plan = clean23(document.getElementById('mu-plan').value, 2000).trim();
  if (!opp || !plan) { f40Invalid(!opp ? 'mu-opp' : 'mu-plan', !opp ? 'Name the opposing deck.' : 'Write a prize plan first.'); return; }
  deck.matchups = deck.matchups || [];
  let m = id ? deck.matchups.find(x => x.id === id) : matchupFor(deck, opp);
  if (!m) { m = { id: 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), opp, plan: '', ts: 0 }; deck.matchups.push(m); }
  m.opp = opp; m.plan = plan; m.ts = Date.now();
  await saveState();
  closeSheet();
  renderNotes();
  showToast('Matchup note saved.');
}
async function deleteMatchup(id) {
  const deck = findDeck(state.activeDeckId);
  if (!deck || !(await rdConfirm({ title: 'Delete this matchup note?', yes: 'Delete', danger: true }))) return;
  deck.matchups = (deck.matchups || []).filter(x => x.id !== id);
  await saveState();
  closeSheet();
  renderNotes();
}

// ═══════════ LIST COMPARE (v23) ═══════════
// Fill a bare snapshot with the card data this device already has, so the
// odds can be counted the same way the Odds tab counts them.
function enrichSnap(cards) {
  const known = new Map();
  state.decks.forEach(d => (d.cards || []).forEach(c => { const k = normalizeCardName(c.name); if (!known.has(k) || (c.supertype && !known.get(k).supertype)) known.set(k, c); }));
  return (cards || []).map(s => {
    const k = known.get(normalizeCardName(s.name));
    return Object.assign({}, k || {}, { name: s.name, set: s.set, num: s.num, count: s.count, section: s.section });
  });
}
let _cmpSel = '';
function compareOptions(deck) {
  const opts = [];
  const v = ensureVersions(deck);
  for (let i = v.length - 2; i >= 0; i--) opts.push({ val: 'v:' + i, label: verLabel(deck, i) });
  state.decks.filter(d => d.id !== deck.id).forEach(d => opts.push({ val: 'd:' + d.id, label: 'Deck: ' + d.name }));
  return opts;
}
function compareTarget(deck, val) {
  if (!val) return null;
  if (val.startsWith('v:')) {
    const i = +val.slice(2), v = deck.versions && deck.versions[i];
    return v ? { name: verLabel(deck, i), cards: enrichSnap(v.cards), format: deck.format } : null;
  }
  const d = state.decks.find(x => x.id === val.slice(2));
  return d ? { name: d.name, cards: d.cards, format: d.format } : null;
}
function renderCompare(deck) {
  const opts = compareOptions(deck);
  let h = `<div class="g-sec" id="cmp-sec"><div class="g-sec-t">Compare lists</div>
    <div class="g-sec-i">This list against an earlier version or another deck: card changes and how the odds move.</div>`;
  if (!opts.length) return h + `<div class="nt-empty">Nothing to compare yet. Save a change in Edit deck, or import a second deck.</div></div>`;
  if (!opts.some(o => o.val === _cmpSel)) _cmpSel = opts[0].val;
  h += `<label for="cmp-sel">Compare with</label><select id="cmp-sel" class="x-select" onchange="_cmpSel=this.value;renderCompareBody()">
    ${opts.map(o => `<option value="${esc(o.val)}"${o.val === _cmpSel ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
    <div id="cmp-body"></div></div>`;
  return h;
}
var openCompare;   // set further down
function compareOddsRow(label, a, b, higherIsGood) {
  const f = x => x == null ? '?' : oPct1(x);
  let cls = '';
  if (a != null && b != null) {
    const d = a - b;
    if (Math.abs(d) >= 0.01) cls = (d > 0) === higherIsGood ? 'up' : 'down';
  }
  const dTxt = a != null && b != null ? (Math.abs(a - b) < 0.0005 ? 'same' : (a > b ? '+' : '−') + (Math.abs(a - b) * 100).toFixed(1) + ' pts') : '';
  return `<tr><td>${label}</td><td>${f(a)}</td><td>${f(b)}</td><td class="cmp-d ${cls}">${dTxt}</td></tr>`;
}
function renderCompareBody() {
  const el = document.getElementById('cmp-body');
  const deck = findDeck(state.activeDeckId);
  if (!el || !deck) return;
  const other = compareTarget(deck, _cmpSel);
  if (!other) { el.innerHTML = ''; return; }
  const ch = diffCards(other.cards, deck.cards);
  const total = cs => cs.reduce((a, c) => a + c.count, 0);
  let h = `<div class="cmp-head"><span><b>This list</b> ${total(deck.cards)} cards</span><span><b>${esc(other.name)}</b> ${total(other.cards)} cards</span></div>`;
  if (!ch.length) h += `<div class="nt-empty">Same cards and counts as this list.</div>`;
  else {
    h += `<div class="o-table-wrap"><table class="o-table cmp-t"><thead><tr><th>Card</th><th>This</th><th>Other</th><th></th></tr></thead><tbody>`;
    ch.forEach(c => {
      const d = c.to - c.from;
      h += `<tr><td>${esc(c.name)}${c.print ? ' <small class="nt-muted">printing</small>' : ''}</td><td>${c.to}</td><td>${c.from}</td><td class="cmp-d ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? (d > 0 ? '+' : '−') + Math.abs(d) : '0'}</td></tr>`;
    });
    h += `</tbody></table></div>`;
  }
  const A = simulateOdds({ cards: deck.cards, format: deck.format }, SIM_TRIALS);
  const B = simulateOdds({ cards: other.cards, format: other.format }, SIM_TRIALS);
  if (A && B) {
    const aA = oddsAttacker(A), aB = oddsAttacker(B);
    const turnN = (aA && aA.turn === 3) || (aB && aB.turn === 3) ? 3 : 2;
    const atk = S => { const x = oddsAttacker(S); return x ? (S.anySearch ? (turnN === 3 ? S.onlineS3 : S.onlineS) : (turnN === 3 ? S.online3 : S.online)) : null; };
    const sameLine = A.line && B.line && A.line.name === B.line.name;
    h += `<div class="hp-lbl" style="margin-top:1rem">Odds, counted like the Odds tab</div>
      <div class="o-table-wrap"><table class="o-table cmp-t"><thead><tr><th></th><th>This</th><th>Other</th><th></th></tr></thead><tbody>
      ${compareOddsRow('Mulligan', A.anyBasic ? A.mulligan : null, B.anyBasic ? B.mulligan : null, false)}
      ${compareOddsRow('Draw card T1', A.anyDrawT1 ? A.drawT1 : null, B.anyDrawT1 ? B.drawT1 : null, true)}
      ${compareOddsRow('Attacker by T' + turnN + ' <small class="nt-muted">any opening hand</small>' + (A.line ? ' <small class="nt-muted">' + esc(A.line.name) + (sameLine || !B.line ? '' : ' vs ' + esc(B.line.name)) + '</small>' : ''), atk(A), atk(B), true)}
      ${compareOddsRow('Line locked in prizes', A.locked, B.locked, false)}
      </tbody></table></div>`;
    const lockRows = ch.filter(c => !c.print && c.from > 0 && c.to > 0).map(c => {
      const pa = A.prize.find(p => normalizeCardName(p.name) === normalizeCardName(c.name));
      const pb = B.prize.find(p => normalizeCardName(p.name) === normalizeCardName(c.name));
      return pa && pb && pa.all != null && pb.all != null ? compareOddsRow('All ' + esc(c.name) + ' prized', pa.all, pb.all, false) : '';
    }).join('');
    if (lockRows) h += `<div class="o-table-wrap" style="margin-top:0.5rem"><table class="o-table cmp-t"><tbody>${lockRows}</tbody></table></div>`;
    if (!A.anyRead || !B.anyRead) h += `<div class="g-wip">Some cards in ${!A.anyRead ? 'this list' : 'the other list'} have no card data on this device yet, so those odds may show a question mark.</div>`;
  }
  el.innerHTML = h;
}

function renderNotes() {
  const el = document.getElementById('notes-body');
  const deck = findDeck(state.activeDeckId);
  if (!el || !deck) return;
  el.innerHTML = `<div class="hp-wrap">${renderMatchups(deck)}${renderEditLog(deck)}${renderCompare(deck)}</div>`;
  renderCompareBody();
}

// ═══════════ GOLDFISH (v23, inside the Hand tab; v58 plays card text) ═══════════
// 3.4.6: the Hand tab's mode bar also links to Sparring (opponent/play.html), five turns against the AI opponent.
// Play your first three turns alone with real draws (3.4.5: back to three, as 3.4.0's five was a mistake). It deals the same way
// the Hand tab does (redeal hands with no Basic, six prizes), and the
// summary scores what you built against the Hand tab's odds count.
// v58: Abilities, Items, Supporters and Stadiums do what their own card text
// says. The text is read with the card data (or, for decks saved before v58,
// from GF_TEXT below, copied from the printed cards). A card whose text the
// app cannot follow yet shows that text, and Draw, Search and Discard do it.
let handMode = 'line';
let gf = null;
const GF_TURNS = 3;
const GF_SUPPORTERS = /^(arven|iono|professor's research|boss's orders|judge|irida|penny|carmine|crispin|lillie's determination|briar|eri|professor turo's scenario|professor sada's vitality|raihan|kieran|cyrano|jacq|clive|hilda|lacey|ciphermaniac's codebreaking|black belt's training|explorer's guidance|thorton|giacomo|atticus|ortega|perrin|caretaker|salvatore|colress's tenacity|marnie|cynthia(?!'s power weight)|n(?!')|guzma|team rocket's archer|melony|roxanne|serena|marnie's pride|lana's aid|janine's secret art|morty's conviction|ryme|dawn|larry's skill|jasmine's gaze|surfer|ethan's adventure|team rocket's petrel|team rocket's ariana|team rocket's proton|brock's scouting|lucian|emcee's hype|rosa|tarragon)\b/;
const GF_TOOLS = /\b(seal stone|belt|charm|band|board|cape|vest|helmet|glasses|gloves|amulet|bandana|sachet|stone|cushion|claw|spoon|scarf|mochi|pearl|power weight|technical machine|capsule)\b/;
const GF_STADIUMS = /\b(artazon|area zero underdepths|jamming tower|lost city|path to the peak|collapsed stadium|temple of sinnoh|town store|beach court|mesagoza|levincia|full metal lab|pok[eé]mon league headquarters|training court|pok[eé]stop|magma basin|gapejaw bog|prism tower|festival grounds|neutralization zone|team rocket's watchtower|postwick|perilous jungle|lively stadium|battle cage|nighttime mine|calamitous wasteland|mystery garden|grand tree|lumiose city|n's castle|team rocket's factory|legendary pyroduct|risky ruins|academy at night|forest of vitality)\b/;
/** 'supporter', 'tool', 'stadium' or 'item': the card data first, the name lists only when there is none. */
function gfKind(x) {
  if (x.card.ttype) return x.card.ttype;
  const st = (x.card.subtypes || x.card.sub || (GF_TEXT[gfKey(x)] || {}).s || []).map(s => String(s).toLowerCase());
  if (st.includes('supporter')) return 'supporter';
  if (st.includes('stadium')) return 'stadium';
  if (st.some(s => /tool/.test(s))) return 'tool';
  if (st.includes('item')) return 'item';
  const nm = gfKey(x);
  return GF_STADIUMS.test(nm) ? 'stadium' : GF_SUPPORTERS.test(nm) ? 'supporter' : GF_TOOLS.test(nm) ? 'tool' : 'item';
}
// Printed text of common cards, for decks read before v58 and for offline play.
// From the pokemon-tcg-data card files. r: Trainer text, a: Abilities, s: subtypes, ty: types.
const GF_TEXT = {"mega kangaskhan ex":{"a":[["Run Errand","Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Draw 2 cards. You can't use more than 1 Run Errand Ability each turn."]],"s":["Basic","MEGA","ex"],"ty":["colorless"]},"latias ex":{"a":[["Skyliner","Your Basic Pokémon in play have no Retreat Cost."]],"s":["Basic","ex"],"ty":["psychic"]},"talonflame ex":{"a":[["Excited Dive","Once during your turn, if this Pokémon is in your hand, and if you have any Colorless Mega Evolution Pokémon ex in play, you may use this Ability. Put this Pokémon onto your Bench."]],"s":["Stage 2","ex"],"ty":["colorless"]},"ethan's ho-oh ex":{"a":[["Golden Flame","Once during your turn, you may attach up to 2 Basic Fire Energy cards from your hand to 1 of your Benched Ethan's Pokémon."]],"s":["Basic","ex"],"ty":["fire"]},"meowth ex":{"a":[["Last-Ditch Catch","Once during your turn, when you play this Pokémon from your hand onto your Bench, you may use this Ability. Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck. You can't use more than 1 Ability that has \"Last-Ditch\" in its name each turn."]],"s":["Basic","ex"],"ty":["colorless"]},"mega rayquaza ex":{"a":[["Ruler's Roar","Once during your turn, when you play this Pokémon from your hand onto your Bench, you may use this Ability. Look at the top 4 cards of your deck and attach a Basic Energy card you find there to this Pokémon. Shuffle the other cards and put them on the bottom of your deck."]],"s":["Basic","MEGA","ex"],"ty":["colorless"]},"iron thorns ex":{"a":[["Initialization","As long as this Pokémon is in the Active Spot, Pokémon with a Rule Box in play (both yours and your opponent's) have no Abilities, except for Future Pokémon. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)"]],"s":["Basic","ex","Future"],"ty":["lightning"]},"fezandipiti ex":{"a":[["Flip the Script","Once during your turn, if any of your Pokémon were Knocked Out during your opponent's last turn, you may draw 3 cards. You can't use more than 1 Flip the Script Ability each turn."]],"s":["Basic","ex"],"ty":["darkness"]},"cyrano":{"r":"Search your deck for up to 3 Pokémon ex, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"judge":{"r":"Each player shuffles their hand into their deck and draws 4 cards.","s":["Supporter"]},"crispin":{"r":"Search your deck for up to 2 Basic Energy cards of different types, reveal them, and put 1 of them into your hand. Attach the other to 1 of your Pokémon. Then, shuffle your deck.","s":["Supporter"]},"lillie's determination":{"r":"Shuffle your hand into your deck. Then, draw 6 cards. If you have exactly 6 Prize cards remaining, draw 8 cards instead.","s":["Supporter"]},"boss's orders":{"r":"Switch in 1 of your opponent's Benched Pokémon to the Active Spot.","s":["Supporter"]},"ultra ball":{"r":"You can use this card only if you discard 2 other cards from your hand. Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"energy switch":{"r":"Move a Basic Energy from 1 of your Pokémon to another of your Pokémon.","s":["Item"]},"switch":{"r":"Switch your Active Pokémon with 1 of your Benched Pokémon.","s":["Item"]},"unfair stamp":{"r":"You can use this card only if any of your Pokémon were Knocked Out during your opponent's last turn. Each player shuffles their hand into their deck. Then, you draw 5 cards, and your opponent draws 2 cards.","s":["Item","ACE SPEC"]},"special red card":{"r":"You can use this card only if your opponent has 3 or fewer Prize cards remaining. Your opponent shuffles their hand and puts it on the bottom of their deck. If they put any cards on the bottom of their deck in this way, they draw 3 cards.","s":["Item"]},"blowtorch":{"r":"You can use this card only if you discard a Basic Fire Energy card from your hand. Discard a Pokémon Tool or Special Energy card from 1 of your opponent's Pokémon, or discard a Stadium in play.","s":["Item"]},"legendary pyroduct":{"r":"Evolution Pokémon in play (both yours and your opponent's) have no Abilities.","s":["Stadium"]},"drakloak":{"a":[["Recon Directive","Once during your turn, you may look at the top 2 cards of your deck and put 1 of them into your hand. Put the other card on the bottom of your deck."]],"s":["Stage 1"],"ty":["dragon"]},"munkidori":{"a":[["Adrena-Brain","Once during your turn, if this Pokémon has any Darkness Energy attached, you may move up to 3 damage counters from 1 of your Pokémon to 1 of your opponent's Pokémon."]],"s":["Basic"],"ty":["psychic"]},"dudunsparce":{"a":[["Run Away Draw","Once during your turn, you may draw 3 cards. If you drew any cards in this way, shuffle this Pokémon and all attached cards into your deck."]],"s":["Stage 1"],"ty":["colorless"]},"rosa's encouragement":{"r":"You can use this card only if you have more Prize cards remaining than your opponent. Attach up to 2 Basic Energy cards from your discard pile to 1 of your Stage 2 Pokémon.","s":["Supporter"]},"poké pad":{"r":"Search your deck for a Pokémon that doesn't have a Rule Box, reveal it, and put it into your hand. Then, shuffle your deck. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)","s":["Item"]},"buddy-buddy poffin":{"r":"Search your deck for up to 2 Basic Pokémon with 70 HP or less and put them onto your Bench. Then, shuffle your deck.","s":["Item"]},"crushing hammer":{"r":"Flip a coin. If heads, discard an Energy from 1 of your opponent's Pokémon.","s":["Item"]},"night stretcher":{"r":"Put a Pokémon or a Basic Energy card from your discard pile into your hand.","s":["Item"]},"risky ruins":{"r":"Whenever any player puts a Basic non-Darkness Pokémon onto their Bench during their turn, place 2 damage counters on that Pokémon.","s":["Stadium"]},"lillie's clefairy ex":{"a":[["Fairy Zone","The Weakness of each of your opponent's Dragon Pokémon in play is now Psychic. (Apply Weakness as ×2.)"]],"s":["Basic","ex"],"ty":["psychic"]},"teal mask ogerpon ex":{"a":[["Teal Dance","Once during your turn, you may attach a Basic Grass Energy card from your hand to this Pokémon. If you attached Energy to a Pokémon in this way, draw a card."]],"s":["Basic","Tera","ex"],"ty":["grass"]},"chien-pao":{"a":[["Snow Sink","When you play this Pokémon from your hand onto your Bench during your turn, you may discard a Stadium in play."]],"s":["Basic"],"ty":["water"]},"iron leaves ex":{"a":[["Rapid Vernier","When you play this Pokémon from your hand onto your Bench during your turn, you may switch it with your Active Pokémon. If you do, you may move any amount of Energy from your other Pokémon to this Pokémon."]],"s":["Basic","ex","Future"],"ty":["grass"]},"ciphermaniac's codebreaking":{"r":"Search your deck for 2 cards, shuffle your deck, then put those cards on top of it in any order.","s":["Supporter","Future"]},"tool scrapper":{"r":"Choose up to 2 Pokémon Tools attached to Pokémon (yours or your opponent's) and discard them.","s":["Item"]},"glass trumpet":{"r":"You can use this card only if you have any Tera Pokémon in play. Choose up to 2 of your Benched Colorless Pokémon and attach a Basic Energy card from your discard pile to each of them.","s":["Item"]},"hero's cape":{"r":"The Pokémon this card is attached to gets +100 HP.","s":["Pokémon Tool","ACE SPEC"]},"area zero underdepths":{"r":"Each player who has any Tera Pokémon in play can have up to 8 Pokémon on their Bench. If a player no longer has any Tera Pokémon in play, that player discards Pokémon from their Bench until they have 5. When this card leaves play, both players discard Pokémon from their Bench until they have 5, and the player who played this card discards first.","s":["Stadium"]},"kyurem":{"a":[["Plasma Bane","If your opponent has any cards in their discard pile that have \"Colress\" in the name, this Pokémon can use the Trifrost attack for Colorless."]],"s":["Basic"],"ty":["dragon"]},"mew ex":{"a":[["Restart","Once during your turn, you may draw cards until you have 3 cards in your hand."]],"s":["Basic","ex"],"ty":["psychic"]},"wondrous patch":{"r":"Attach a Basic Psychic Energy card from your discard pile to 1 of your Benched Psychic Pokémon.","s":["Item"]},"secret box":{"r":"You can use this card only if you discard 3 other cards from your hand. Search your deck for an Item card, a Pokémon Tool card, a Supporter card, and a Stadium card, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Item","ACE SPEC"]},"lucky helmet":{"r":"If the Pokémon this card is attached to is in the Active Spot and is damaged by an attack from your opponent's Pokémon (even if this Pokémon is Knocked Out), draw 2 cards.","s":["Pokémon Tool"]},"academy at night":{"r":"Once during each player's turn, that player may put a card from their hand on top of their deck.","s":["Stadium"]},"meganium":{"a":[["Wild Growth","Each Basic Grass Energy attached to all of your Pokémon provides GrassGrass Energy. The effect of Wild Growth doesn't stack."]],"s":["Stage 2"],"ty":["grass"]},"dipplin":{"a":[["Festival Lead","If Festival Grounds is in play, this Pokémon may use an attack it has twice. If the first attack Knocks Out your opponent's Active Pokémon, you may attack again after your opponent chooses a new Active Pokémon."]],"s":["Stage 1"],"ty":["grass"]},"hydrapple ex":{"a":[["Ripening Charge","Once during your turn, you may attach a Basic Grass Energy card from your hand to 1 of your Pokémon. If you attached Energy to a Pokémon in this way, heal 30 damage from that Pokémon."]],"s":["Stage 2","ex"],"ty":["grass"]},"dawn":{"r":"Search your deck for a Basic Pokémon, a Stage 1 Pokémon, and a Stage 2 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"lana's aid":{"r":"Put up to 3 in any combination of Pokémon that don't have a Rule Box and Basic Energy cards from your discard pile into your hand. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)","s":["Supporter"]},"bug catching set":{"r":"Look at the top 7 cards of your deck. You may reveal up to 2 in any combination of Grass Pokémon and Basic Grass Energy cards you find there and put them into your hand. Shuffle the other cards back into your deck.","s":["Item"]},"forest of vitality":{"r":"Each player's Grass Pokémon can evolve into Grass Pokémon during the turn they play those Pokémon, except during their first turn.","s":["Stadium"]},"kadabra":{"a":[["Psychic Draw","Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Draw 2 cards."]],"s":["Stage 1"],"ty":["psychic"]},"alakazam":{"a":[["Psychic Draw","Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Draw 3 cards."]],"s":["Stage 2"],"ty":["psychic"]},"shaymin":{"a":[["Flower Curtain","Prevent all damage done to your Benched Pokémon that don't have a Rule Box by attacks from your opponent's Pokémon. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)"]],"s":["Basic"],"ty":["grass"]},"genesect":{"a":[["ACE Nullifier","If this Pokémon has a Pokémon Tool attached, your opponent can't play any ACE SPEC cards from their hand."]],"s":["Basic"],"ty":["metal"]},"hilda":{"r":"Search your deck for an Evolution Pokémon and an Energy card, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"rare candy":{"r":"Choose 1 of your Basic Pokémon in play. If you have a Stage 2 card in your hand that evolves from that Pokémon, put that card onto the Basic Pokémon to evolve it, skipping the Stage 1. You can't use this card during your first turn or on a Basic Pokémon that was put into play this turn.","s":["Item"]},"sacred ash":{"r":"Shuffle up to 5 Pokémon from your discard pile into your deck.","s":["Item"]},"lillie's pearl":{"r":"If the Lillie's Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, that player takes 1 fewer Prize card.","s":["Pokémon Tool"]},"battle cage":{"r":"Prevent all damage counters from being placed on Benched Pokémon (both yours and your opponent's) by effects of attacks and Abilities from the opponent's Pokémon. (Damage from attacks is still taken.)","s":["Stadium"]},"flutter mane":{"a":[["Midnight Fluttering","As long as this Pokémon is in the Active Spot, your opponent's Active Pokémon has no Abilities, except for Midnight Fluttering."]],"s":["Basic","Ancient"],"ty":["psychic"]},"crustle":{"a":[["Mysterious Rock Inn","Prevent all damage done to this Pokémon by attacks from your opponent's Pokémon ex."]],"s":["Stage 1"],"ty":["grass"]},"team rocket's petrel":{"r":"Search your deck for a Trainer card, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Supporter"]},"eri":{"r":"Your opponent reveals their hand, and you discard up to 2 Item cards you find there.","s":["Supporter"]},"xerosic's machinations":{"r":"Your opponent discards cards from their hand until they have 3 cards in their hand.","s":["Supporter"]},"pokémon center lady":{"r":"Heal 60 damage from 1 of your Pokémon, and it recovers from all Special Conditions.","s":["Supporter"]},"jumbo ice cream":{"r":"Heal 80 damage from your Active Pokémon that has 3 or more Energy attached.","s":["Item"]},"pokégear 3.0":{"r":"Look at the top 7 cards of your deck. You may reveal a Supporter card you find there and put it into your hand. Shuffle the other cards back into your deck.","s":["Item"]},"lumiose city":{"r":"Once during each player's turn, that player may search their deck for a Basic Pokémon and put it onto their Bench. Then, that player shuffles their deck. If a player searches their deck in this way, their turn ends.","s":["Stadium"]},"festival grounds":{"r":"Each Pokémon that has any Energy attached (both yours and your opponent's) recovers from all Special Conditions and can't be affected by any Special Conditions.","s":["Stadium"]},"prism tower":{"r":"Once during each player's turn, that player may discard 2 cards from their hand in order to draw a card.","s":["Stadium"]},"nest ball":{"r":"Search your deck for a Basic Pokémon and put it onto your Bench. Then, shuffle your deck.","s":["Item"]},"earthen vessel":{"r":"You can use this card only if you discard another card from your hand. Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Item","Ancient"]},"arven":{"r":"Search your deck for an Item card and a Pokémon Tool card, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"iono":{"r":"Each player shuffles their hand and puts it on the bottom of their deck. If either player put any cards on the bottom of their deck in this way, each player draws a card for each of their remaining Prize cards.","s":["Supporter"]},"professor's research":{"r":"Discard your hand and draw 7 cards.","s":["Supporter"]},"carmine":{"r":"If you go first, you may use this card during your first turn. Discard your hand and draw 5 cards.","s":["Supporter"]},"super rod":{"r":"Shuffle up to 3 in any combination of Pokémon and Basic Energy cards from your discard pile into your deck.","s":["Item"]},"energy retrieval":{"r":"Put up to 2 Basic Energy cards from your discard pile into your hand.","s":["Item"]},"counter catcher":{"r":"You can use this card only if you have more Prize cards remaining than your opponent. Switch in 1 of your opponent's Benched Pokémon to the Active Spot.","s":["Item"]},"prime catcher":{"r":"Switch in 1 of your opponent's Benched Pokémon to the Active Spot. If you do, switch your Active Pokémon with 1 of your Benched Pokémon.","s":["Item","ACE SPEC"]},"fighting gong":{"r":"Search your deck for a Basic Fighting Energy card or a Basic Fighting Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"brock's scouting":{"r":"Search your deck for up to 2 Basic Pokémon or 1 Evolution Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"superior energy retrieval":{"r":"You can use this card only if you discard 2 other cards from your hand.Put up to 4 Basic Energy cards from your discard pile into your hand. (You can't choose a card you discarded with the effect of this card.)","s":["Item"]},"artazon":{"r":"Once during each player's turn, that player may search their deck for a Basic Pokémon that doesn't have a Rule Box and put it onto their Bench. Then, that player shuffles their deck. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)","s":["Stadium"]},"town store":{"r":"Once during each player's turn, that player may search their deck for a Pokémon Tool card, reveal it, and put it into their hand. Then, that player shuffles their deck.","s":["Stadium"]},"penny":{"r":"Put 1 of your Basic Pokémon and all attached cards into your hand.","s":["Supporter"]},"professor turo's scenario":{"r":"Put 1 of your Pokémon in play into your hand. (Discard all cards attached to that Pokémon.)","s":["Supporter","Future"]},"explorer's guidance":{"r":"Look at the top 6 cards of your deck and put 2 of them into your hand. Discard the other cards.","s":["Supporter","Ancient"]},"precious trolley":{"r":"Search your deck for any number of Basic Pokémon and put them onto your Bench. Then, shuffle your deck.","s":["Item","ACE SPEC"]},"pal pad":{"r":"Shuffle up to 2 Supporter cards from your discard pile into your deck.","s":["Item"]},"dusk ball":{"r":"Look at the bottom 7 cards of your deck. You may reveal a Pokémon you find there and put it into your hand. Shuffle the other cards back into your deck.","s":["Item"]},"great ball":{"r":"Look at the top 7 cards of your deck. You may reveal a Pokémon you find there and put it into your hand. Shuffle the other cards back into your deck.","s":["Item"]},"energy search":{"r":"Search your deck for a Basic Energy card, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"mesagoza":{"r":"Once during each player's turn, that player may flip a coin. If heads, that player searches their deck for a Pokémon, reveals it, and puts it into their hand. Then, that player shuffles their deck.","s":["Stadium"]},"hassel":{"r":"You can use this card only if any of your Pokémon were Knocked Out during your opponent's last turn. Look at the top 8 cards of your deck and put up to 3 of them into your hand. Shuffle the other cards back into your deck.","s":["Supporter"]},"black belt's training":{"r":"During this turn, attacks used by your Pokémon do 40 more damage to your opponent's Active Pokémon ex (before applying Weakness and Resistance).","s":["Supporter"]},"kieran":{"r":"Choose 1: • Switch your Active Pokémon with 1 of your Benched Pokémon. • During this turn, attacks used by your Pokémon do 30 more damage to your opponent's Active Pokémon ex and Active Pokémon V (before applying Weakness and Resistance).","s":["Supporter"]},"tatsugiri":{"a":[["Attract Customers","Once during your turn, if this Pokémon is in the Active Spot, you may look at the top 6 cards of your deck, reveal a Supporter card you find there, and put it into your hand. Shuffle the other cards back into your deck."]],"s":["Basic"],"ty":["dragon"]},"pidgeot ex":{"a":[["Quick Search","Once during your turn, you may search your deck for a card and put it into your hand. Then, shuffle your deck. You can't use more than 1 Quick Search Ability each turn."]],"s":["Stage 2","ex"],"ty":["colorless"]},"squawkabilly ex":{"a":[["Squawk and Seize","Once during your first turn, you may discard your hand and draw 6 cards. You can't use more than 1 Squawk and Seize Ability during your turn."]],"s":["Basic","ex"],"ty":["colorless"]},"genesect ex":{"a":[["Metallic Signal","Once during your turn, you may search your deck for up to 2 Evolution Metal Pokémon, reveal them, and put them into your hand. Then, shuffle your deck."]],"s":["Basic","ex"],"ty":["metal"]},"noctowl":{"a":[["Jewel Seeker","Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, if you have any Tera Pokémon in play, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck."]],"s":["Stage 1"],"ty":["colorless"]},"n's zoroark ex":{"a":[["Trade","You must discard a card from your hand in order to use this Ability. Once during your turn, you may draw 2 cards."]],"s":["Stage 1","ex"],"ty":["darkness"]},"team rocket's proton":{"r":"If you go first, you may use this card during your first turn. Search your deck for up to 3 Basic Team Rocket's Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"team rocket's transceiver":{"r":"Search your deck for a Supporter card that has \"Team Rocket\" in its name, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"morty's conviction":{"r":"You can use this card only if you discard another card from your hand. Draw a card for each of your opponent's Benched Pokémon.","s":["Supporter"]},"lacey":{"r":"Shuffle your hand into your deck. Then, draw 4 cards. If your opponent has 3 or fewer Prize cards remaining, draw 8 cards instead.","s":["Supporter"]},"poké ball":{"r":"Flip a coin. If heads, search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"mega signal":{"r":"Search your deck for a Mega Evolution Pokémon ex, reveal it, and put it into your hand. Then, shuffle your deck.","s":["Item"]},"energy sticker":{"r":"Flip a coin. If heads, attach a Basic Energy card from your discard pile to 1 of your Benched Pokémon.","s":["Item"]},"hop's bag":{"r":"Search your deck for up to 2 Basic Hop's Pokémon and put them onto your Bench. Then, shuffle your deck.","s":["Item"]},"n's pp up":{"r":"Attach a Basic Energy card from your discard pile to 1 of your Benched N's Pokémon.","s":["Item"]},"team rocket's ariana":{"r":"Draw cards until you have 5 cards in your hand. If all of your Pokémon in play are Team Rocket's Pokémon, draw cards until you have 8 cards in your hand instead.","s":["Supporter"]},"team rocket's archer":{"r":"You can use this card only if any of your Team Rocket's Pokémon were Knocked Out during your opponent's last turn. Each player shuffles their hand into their deck. Then, you draw 5 cards, and your opponent draws 3 cards.","s":["Supporter"]},"ethan's adventure":{"r":"Search your deck for up to 3 in any combination of Ethan's Pokémon and Basic Fire Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.","s":["Supporter"]},"dusknoir":{"a":[["Cursed Blast","Once during your turn, you may put 13 damage counters on 1 of your opponent's Pokémon. If you use this Ability, this Pokémon is Knocked Out."]],"s":["Stage 2"],"ty":["psychic"]},"dusclops":{"a":[["Cursed Blast","Once during your turn, you may put 5 damage counters on 1 of your opponent's Pokémon. If you use this Ability, this Pokémon is Knocked Out."]],"s":["Stage 1"],"ty":["psychic"]},"pokémon catcher":{"r":"Flip a coin. If heads, switch in 1 of your opponent's Benched Pokémon to the Active Spot.","s":["Item"]},"max rod":{"r":"Put up to 5 in any combination of Pokémon and Basic Energy cards from your discard pile into your hand.","s":["Item","ACE SPEC"]},"grand tree":{"r":"Once during each player's turn, that player may search their deck for a Stage 1 Pokémon that evolves from 1 of their Basic Pokémon and put it onto that Pokémon to evolve it. If that Pokémon was evolved in this way, that player may search their deck for a Stage 2 Pokémon that evolves from that Pokémon and put it onto that Pokémon to evolve it. Then, that player shuffles their deck. (Players can't evolve a Basic Pokémon during their first turn or a Basic Pokémon that was put into play this turn.)","s":["Stadium","ACE SPEC"]},"salvatore":{"r":"Search your deck for a card that has no Abilities and evolves from 1 of your Pokémon, and put it onto that Pokémon to evolve it. Then, shuffle your deck. You can use this card on a Pokémon you put down when you were setting up to play or on a Pokémon that was put into play this turn.","s":["Supporter"]},"gravity mountain":{"r":"Each Stage 2 Pokémon in play (both yours and your opponent's) gets -30 HP.","s":["Stadium"]},"jamming tower":{"r":"Pokémon Tools attached to each Pokémon (both yours and your opponent's) have no effect.","s":["Stadium"]},"gardevoir ex":{"a":[["Psychic Embrace","As often as you like during your turn, you may attach a Basic Psychic Energy card from your discard pile to 1 of your Psychic Pokémon. If you attached Energy to a Pokémon in this way, put 2 damage counters on that Pokémon. You can't use this Ability on a Pokémon that would be Knocked Out."]],"s":["Stage 2","ex"],"ty":["psychic"]}};

/* ---------- Card text ---------- */
const GF_TY = 'grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless|fairy';
const GF_ELET = { g: 'grass', r: 'fire', w: 'water', l: 'lightning', p: 'psychic', f: 'fighting', d: 'darkness', m: 'metal', y: 'fairy' };
function gfNorm(s) {
  return String(s || '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[éÉ]/g, 'e')
    .replace(/×/g, 'x').replace(/\s+/g, ' ').trim();
}
/** Text, subtypes and types for a deck card: what the card data stored, else the built-in table. */
function gfInfo(c) {
  if (c._gfi && c._gfi.tx === !!c.tx) return c._gfi;
  const T = GF_TEXT[String(c.name || '').toLowerCase()] || GF_TEXT[gfNorm(cn23(c.apiName || c.name)).toLowerCase()] || null;
  const own = !!c.tx;
  const abil = own ? (c.atext || []).map(a => ({ name: a[0], text: a[1] }))
    : T && T.a ? T.a.map(a => ({ name: a[0], text: a[1] })) : [];
  const info = {
    rtext: own ? (c.rtext || '') : T && T.r ? T.r : '',
    abil,
    sub: ((own ? c.sub : null) || (T && T.s) || []).map(s => String(s).toLowerCase()),
    types: ((c.types && c.types.length ? c.types : null) || (T && T.ty) || []).map(s => String(s).toLowerCase()),
    known: own || !!T,
    tx: own,
  };
  try { Object.defineProperty(c, '_gfi', { value: info, enumerable: false, configurable: true }); } catch (_) {}
  return info;
}
function gfSubs(x) { return gfInfo(x.card).sub; }
function gfIsEx(x) { return gfSubs(x).includes('ex') || / ex$/i.test(x.card.name || ''); }
function gfIsMega(x) { return gfSubs(x).includes('mega') || /^mega /i.test(x.card.name || ''); }
function gfRuleBox(x) { const n = String(x.card.name || ''); return gfSubs(x).some(s => /^(ex|v|vstar|vmax|v-union|radiant|gx)$/.test(s)) || / (ex|v|vstar|vmax|gx)$/i.test(n) || /^radiant /i.test(n); }
function gfTypes(x) { return gfInfo(x.card).types; }
/** The type of a Basic Energy card, or '' for anything else. */
function gfEType(x) {
  if (cardCategory(x.card) !== 'energy') return '';
  const n = gfNorm(x.card.apiName || x.card.name).toLowerCase();
  let m = n.match(new RegExp('^(?:basic )?(' + GF_TY + ') energy$'));
  if (m) return m[1];
  m = n.match(/^(?:basic )?\{([a-z])\} energy$/);
  return m && GF_ELET[m[1]] ? GF_ELET[m[1]] : '';
}

/** Does a card fit a filter read from card text? */
function gfFit(x, F) {
  if (!F) return false;
  if (F.any) return true;
  if (F.union) return F.union.some(f => gfFit(x, f));
  const c = x.card, cat = cardCategory(c);
  if (F.cat === 'energy') {
    if (cat !== 'energy') return false;
    const et = gfEType(x);
    if (F.basic && !et) return false;
    return !F.type || et === F.type;
  }
  if (F.cat === 'trainer') {
    if (cat !== 'trainer') return false;
    if (F.tk && gfKind(x) !== F.tk) return false;
    return !F.nameHas || gfKey(x).includes(F.nameHas);
  }
  if (F.cat === 'pokemon') {
    if (cat !== 'pokemon') return false;
    if (F.stage === 'basic' && !gfIsBasic(x)) return false;
    if (F.stage === 'stage1' && c.stage !== 'stage1') return false;
    if (F.stage === 'stage2' && c.stage !== 'stage2') return false;
    if (F.stage === 'evolution' && !gfIsEvo(x)) return false;
    if (F.ex && !gfIsEx(x)) return false;
    if (F.mega && !gfIsMega(x)) return false;
    if (F.tera && !gfSubs(x).includes('tera')) return false;
    if (F.owner && !gfKey(x).startsWith(F.owner)) return false;
    if (F.type && !gfTypes(x).includes(F.type)) return false;
    if (F.maxHp && (c.hp || 0) > F.maxHp) return false;
    return !(F.noRule && gfRuleBox(x));
  }
  return false;
}

/** One thing a card names: "a Basic Pokémon", "up to 2 Basic Energy cards". Null when the app cannot read it. */
function gfPhrase(p) {
  p = p.trim();
  if (/^cards?$/.test(p)) return { any: true };
  let m = p.match(new RegExp('^(basic )?(?:(' + GF_TY + ') )?energy cards?( of different types)?$'));
  if (m) return { cat: 'energy', basic: !!m[1], type: m[2] || '', diff: !!m[3] };
  m = p.match(/^(item|pokemon tool|supporter|stadium|trainer) cards?(?: that has "([^"]+)" in its name)?$/);
  if (m) return { cat: 'trainer', tk: m[1] === 'trainer' ? '' : m[1] === 'pokemon tool' ? 'tool' : m[1], nameHas: m[2] ? m[2].toLowerCase() : '' };
  m = p.match(new RegExp("^(basic |stage 1 |stage 2 |evolution )?(mega evolution |tera )?((?:[a-z]+ )?[a-z]+'s )?(?:(" + GF_TY + ") )?pokemon( ex)?(?: with (\\d+) hp or less)?( that (?:doesn't|don't) have a rule box)?$"));
  if (m) return { cat: 'pokemon', stage: m[1] ? m[1].trim().replace(' ', '') : '', mega: !!(m[2] && /mega/.test(m[2])), tera: !!(m[2] && /tera/.test(m[2])),
    owner: m[3] ? m[3].trim() : '', type: m[4] || '', ex: !!m[5], maxHp: m[6] ? +m[6] : 0, noRule: !!m[7] };
  return null;
}
/** A counted thing: { n, F }. */
function gfThing(s) {
  const m = s.trim().match(/^(up to (\d+)|any number of|an?|(\d+)) (.+)$/);
  if (!m) return null;
  const F = gfPhrase(m[4]);
  if (!F) return null;
  return { n: m[2] ? +m[2] : m[1] === 'any number of' ? 99 : m[3] ? +m[3] : 1, F };
}
/** A list of things, with "or" as other choices: { alts: [[{n,F}, ...], ...] }. */
function gfThings(s) {
  s = s.trim();
  const mix = s.match(/^up to (\d+) in any combination of (.+?) and (.+)$/);
  if (mix) {
    const a = gfPhrase(mix[2]), b = gfPhrase(mix[3]);
    return a && b ? { alts: [[{ n: +mix[1], F: { union: [a, b] } }]] } : null;
  }
  const alts = [];
  for (const part of s.split(/ or (?=(?:up to \d+|any number of|an?|\d+) )/)) {
    const slots = [];
    for (const one of part.split(/,? and (?=(?:up to \d+|any number of|an?|\d+) )|, (?=(?:up to \d+|any number of|an?|\d+) )/)) {
      const t = gfThing(one);
      if (!t) return null;
      slots.push(t);
    }
    alts.push(slots);
  }
  return alts.length ? { alts } : null;
}
function gfMaxOf(spec) { return Math.max.apply(null, spec.alts.map(a => a.reduce((s, x) => s + x.n, 0))); }
/** Can these picked cards fill one of the choices? Each slot takes up to its count. */
function gfSlotsOk(spec, picks) {
  return spec.alts.some(slots => {
    const left = slots.map(s => s.n);
    const go = i => {
      if (i >= picks.length) return true;
      for (let k = 0; k < slots.length; k++) {
        if (left[k] > 0 && gfFit(picks[i], slots[k].F)) { left[k]--; if (go(i + 1)) return true; left[k]++; }
      }
      return false;
    };
    if (!go(0)) return false;
    // "of different types" (Crispin)
    if (slots.some(s => s.F.diff)) { const ts = picks.map(gfEType); if (new Set(ts).size !== ts.length) return false; }
    return true;
  });
}
function gfSpecFits(spec, x) { return spec.alts.some(slots => slots.some(s => gfFit(x, s.F))); }

/** Card text to sentences: plain, lower case, no reminder text in brackets. */
function gfSentences(text) {
  return gfNorm(text).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/\.(?:\s+|$)|\.(?=[a-z])|\n+/)
    .map(s => s.replace(/\s+/g, ' ').replace(/^then,? /, '').trim()).filter(Boolean);
}
/** Stadium text speaks of "that player"; read it as a card you play. */
function gfStadiumText(t) {
  return gfNorm(t).replace(/Once during each player's turn, that player may /i, 'Once during your turn, you may ')
    .replace(/\btheir (deck|hand|bench)\b/gi, 'your $1').replace(/onto their Bench/gi, 'onto your Bench')
    .replace(/that player (searches|reveals|puts|shuffles|draws|discards)/gi, (m, v) => /ches$/i.test(v) ? v.slice(0, -2) : v.slice(0, -1))
    .replace(/\b(reveals|puts) it\b/gi, (m, v) => v.replace(/s$/, '') + ' it')
    .replace(/If a player searches your deck in this way, their turn ends/i, 'Your turn ends')
    .replace(/, that player /gi, ', ');
}

/**
 * Read play steps out of card text. Returns { steps, opp } or null when any
 * sentence is one the app cannot follow (then the card text is shown and the
 * player does it by hand). Nothing is guessed: every number is the card's.
 */
function gfParseBody(sents) {
  const steps = [];
  let opp = false, heads = false;
  const last = () => steps[steps.length - 1];
  for (let i = 0; i < sents.length; i++) {
    let s = sents[i], m;
    if (/^if heads, /.test(s) && steps.some(z => z.t === 'coin')) { heads = true; s = s.slice(10); }
    const push = st => { if (heads) st.ifHeads = true; steps.push(st); };
    if (/^(then, )?shuffle your deck$/.test(s) || /^reveal (it|them)$/.test(s)) continue;
    if ((m = s.match(/^(?:you may )?draw (a|an|\d+) cards?$/))) { push({ t: 'draw', n: /^an?$/.test(m[1]) ? 1 : +m[1] }); continue; }
    if ((m = s.match(/^(?:you may )?draw cards until you have (\d+) cards in your hand$/))) { push({ t: 'drawTo', n: +m[1] }); continue; }
    if ((m = s.match(/^discard your hand and draw (\d+) cards$/))) { push({ t: 'discardHand' }); push({ t: 'draw', n: +m[1] }); continue; }
    if ((m = s.match(/^(?:you may )?discard your hand and draw (\d+) cards$/))) { push({ t: 'discardHand' }); push({ t: 'draw', n: +m[1] }); continue; }
    if (/^shuffle your hand into your deck$/.test(s) || /^each player shuffles their hand into their deck$/.test(s)) { push({ t: 'shuffleHand' }); continue; }
    if ((m = s.match(/^each player shuffles their hand into their deck and draws (\d+) cards$/))) { push({ t: 'shuffleHand' }); push({ t: 'draw', n: +m[1] }); continue; }
    if ((m = s.match(/^you draw (\d+) cards, and your opponent draws \d+ cards$/))) { push({ t: 'draw', n: +m[1] }); continue; }
    if (/^each player shuffles their hand and puts it on the bottom of their deck$/.test(s)) { push({ t: 'bottomHand' }); continue; }
    if (/^if either player put any cards on the bottom of their deck in this way, each player draws a card for each of their remaining prize cards$/.test(s)) { push({ t: 'drawPrizes' }); continue; }
    if ((m = s.match(/^if you have exactly (\d+) prize cards remaining, draw (\d+) cards instead$/)) && last() && last().t === 'draw') { last().alt = { prizes: +m[1], n: +m[2] }; continue; }
    if ((m = s.match(/^if your opponent has (\d+) or fewer prize cards remaining, draw (\d+) cards instead$/)) && last() && last().t === 'draw') continue; // no opponent prizes taken in Goldfish
    if ((m = s.match(/^if all of your pokemon in play are (.+?) pokemon, draw cards until you have (\d+) cards in your hand instead$/)) && last() && last().t === 'drawTo') { last().alt = { owner: m[1], n: +m[2] }; continue; }
    // Search the deck.
    if ((m = s.match(/^(?:you may )?search your deck for (.+?)(?:, reveal (?:it|them),?)?,? and put (it|them|1 of them) (into your hand|onto your bench)$/))) {
      const spec = gfThings(m[1]);
      if (!spec) return null;
      const split = m[2] === '1 of them';
      if (split) {
        if (!/^attach the other to 1 of your pokemon$/.test(sents[i + 1] || '')) return null;
        i++;
      }
      push({ t: 'search', spec, dest: m[3] === 'onto your bench' ? 'bench' : 'hand', split });
      continue;
    }
    if ((m = s.match(/^search your deck for (\d+) cards, shuffle your deck, (?:then )?put those cards on top of it in any order$/))) {
      push({ t: 'search', spec: { alts: [[{ n: +m[1], F: { any: true } }]] }, dest: 'top' }); continue;
    }
    // Look at the top (or bottom) cards.
    if ((m = s.match(/^(?:you may )?look at the (top|bottom) (\d+) cards of your deck(?:(?:,| and) (.+))?$/))) {
      const st = { t: 'look', from: m[1], n: +m[2] };
      let take = m[3] || sents[++i] || '', k;
      if ((k = take.match(/^(?:you may )?reveal (.+?) you find there,? and put (?:it|them) into your hand$/))) { st.spec = gfThings(k[1]); st.dest = 'hand'; st.min = 0; }
      else if ((k = take.match(/^put (up to )?(\d+) of them into your hand$/))) { st.spec = { alts: [[{ n: +k[2], F: { any: true } }]] }; st.dest = 'hand'; st.min = k[1] ? 0 : +k[2]; }
      else if ((k = take.match(/^attach (.+?) you find there to this pokemon$/))) { st.spec = gfThings(k[1]); st.dest = 'self'; st.min = 0; }
      if (!st.spec) return null;
      const rest = sents[i + 1] || '';
      if (/^shuffle the other cards back into your deck$/.test(rest)) st.rest = 'shuffle';
      else if (/^put the other cards? on the bottom of your deck$/.test(rest)) st.rest = 'bottom';
      else if (/^shuffle the other cards and put them on the bottom of your deck$/.test(rest)) st.rest = 'shuffleBottom';
      else if (/^discard the other cards$/.test(rest)) st.rest = 'discard';
      else return null;
      i++;
      push(st);
      continue;
    }
    // From the discard pile.
    if ((m = s.match(/^put (.+?) from your discard pile into your hand$/))) { const spec = gfThings(m[1]); if (!spec) return null; push({ t: 'recover', spec, dest: 'hand' }); continue; }
    if ((m = s.match(/^shuffle (.+?) from your discard pile into your deck$/))) { const spec = gfThings(m[1]); if (!spec) return null; push({ t: 'recover', spec, dest: 'deck' }); continue; }
    // Attach Energy.
    if ((m = s.match(new RegExp("^(?:you may )?attach (up to \\d+|an?|\\d+) basic (?:(" + GF_TY + ") )?energy cards? from your hand to (this pokemon|1 of your pokemon|1 of your benched (.+?)pokemon)$")))) {
      push({ t: 'attach', from: 'hand', n: /^an?$/.test(m[1]) ? 1 : +m[1].replace('up to ', ''), etype: m[2] || '', to: m[3] === 'this pokemon' ? 'self' : m[4] != null ? 'bench' : 'any', owner: m[4] ? m[4].trim() : '' });
      continue;
    }
    if ((m = s.match(new RegExp("^attach (up to \\d+|an?|\\d+) basic (?:(" + GF_TY + ") )?energy cards? from your discard pile to 1 of your (benched )?(.*?)pokemon$")))) {
      const w = (m[4] || '').trim();
      const isTy = new RegExp('^(' + GF_TY + ')$').test(w), isSt = /^(basic|stage 1|stage 2|evolution)$/.test(w);
      push({ t: 'attach', from: 'discard', n: /^an?$/.test(m[1]) ? 1 : +m[1].replace('up to ', ''), etype: m[2] || '', to: m[3] ? 'bench' : 'any',
        owner: isTy || isSt ? '' : w, mtype: isTy ? w : '', mstage: isSt ? w.replace(' ', '') : '' });
      continue;
    }
    if ((m = s.match(new RegExp('^choose up to (\\d+) of your benched (?:(' + GF_TY + ') )?pokemon and attach a basic energy card from your discard pile to each of them$')))) {
      push({ t: 'attach', from: 'discard', n: +m[1], etype: '', to: 'bench', each: true, mtype: m[2] || '' }); continue;
    }
    if (/^attach the other to 1 of your pokemon$/.test(s)) return null;
    if (/^if you attached energy to a pokemon in this way, draw a card$/.test(s)) { push({ t: 'draw', n: 1, ifAttached: true }); continue; }
    // Move things around your board.
    if (/^(?:if you do, )?switch your active pokemon with 1 of your benched pokemon$/.test(s)) { push({ t: 'switch' }); continue; }
    if (/^move a basic energy from 1 of your pokemon to another of your pokemon$/.test(s)) { push({ t: 'moveEnergy' }); continue; }
    if (/^put 1 of your basic pokemon and all attached cards into your hand$/.test(s)) { push({ t: 'pickUp', basic: true, keep: true }); continue; }
    if (/^put 1 of your pokemon in play into your hand$/.test(s)) { push({ t: 'pickUp', basic: false, keep: false }); continue; }
    if (/^put this pokemon onto your bench$/.test(s)) { push({ t: 'benchSelf' }); continue; }
    if (/^put a card from your hand on top of your deck$/.test(s)) { push({ t: 'topFromHand' }); continue; }
    if ((m = s.match(/^(?:you may )?discard (\d+) cards from your hand in order to draw (a|\d+) cards?$/))) { push({ t: 'cost', n: +m[1] }); push({ t: 'draw', n: m[2] === 'a' ? 1 : +m[2] }); continue; }
    if (/^if you drew any cards in this way, shuffle this pokemon and all attached cards into your deck$/.test(s)) { push({ t: 'selfShuffle', ifDrew: true }); continue; }
    if (/^flip a coin$/.test(s)) { push({ t: 'coin' }); continue; }
    if (/your turn ends$/.test(s)) { push({ t: 'endTurn' }); continue; }
    if (/^(?:you may )?discard a stadium in play$/.test(s)) { push({ t: 'discardStadium' }); continue; }
    // 3.4: damage on your own Pokemon. Healing, damage counters you put on your own Pokemon, and
    // damage counters you move off them (Munkidori's Adrena-Brain moves them to your opponent).
    if ((m = s.match(/^(if you attached energy to a pokemon in this way, )?heal (\d+|all) damage from (this pokemon|that pokemon|your active pokemon(?: that has \d+ or more energy attached)?|1 of your pokemon|1 of your benched pokemon|1 of your mega evolution pokemon ex|each of your pokemon)(?:, and it recovers from all special conditions)?$/))) {
      const w = m[3], who = w === 'this pokemon' ? 'self' : w === 'that pokemon' ? 'target' : /^your active/.test(w) ? 'active' : w === '1 of your pokemon' ? 'one'
        : w === '1 of your benched pokemon' ? 'bench' : w === 'each of your pokemon' ? 'each' : 'mega';
      push({ t: 'heal', n: m[2] === 'all' ? 0 : +m[2], all: m[2] === 'all', who, ifAttached: !!m[1] || undefined }); continue;
    }
    if ((m = s.match(/^for each (.+?) card in your discard pile, heal (\d+) more damage$/)) && last() && last().t === 'heal') { last().per = { name: m[1], n: +m[2] }; continue; }
    if (/^if you healed any damage in this way, put all energy attached to that pokemon into your hand$/.test(s) && last() && last().t === 'heal') { push({ t: 'energyToHand', ifHealed: true }); continue; }
    if ((m = s.match(/^(if you attached energy to a pokemon in this way, )?(?:put|place) (\d+) damage counters? on (that|this) pokemon$/))) { push({ t: 'selfDmg', d: 10 * +m[2], who: m[3] === 'that' ? 'target' : 'self', ifAttached: !!m[1] || undefined }); continue; }
    if ((m = s.match(/^this pokemon also does (\d+) damage to itself$/))) { push({ t: 'selfDmg', d: +m[1], who: 'self' }); continue; }
    if (/^you can't use this ability on a pokemon that would be knocked out$/.test(s)) {
      const sd = last(), at = steps.slice().reverse().find(z => z.t === 'attach');
      if (sd && sd.t === 'selfDmg' && at) at.noKO = sd.d;
      continue;
    }
    if ((m = s.match(/^(?:you may )?move up to (\d+) damage counters? from 1 of your pokemon to 1 of your opponent's pokemon$/))) { push({ t: 'moveOff', n: +m[1] }); continue; }
    if ((m = s.match(new RegExp('^(you may )?discard (all|an?|\\d+) (?:(' + GF_TY + ') )?energy (?:cards? )?from this pokemon$')))) {
      push({ t: 'discardEnergy', n: m[2] === 'all' ? 99 : /^an?$/.test(m[2]) ? 1 : +m[2], etype: m[3] || '', may: !!m[1] || undefined }); continue;
    }
    // Things that only touch your opponent, or only matter in an attack.
    if (/opponent|during this turn, attacks used by|retreat cost|special condition/.test(s) && !/your deck|your hand|your discard/.test(s)) { opp = true; continue; }
    if (/^(?:if )?they /.test(s) && opp) continue;
    if (/^if you use this ability, this pokemon is knocked out$/.test(s)) { push({ t: 'koSelf' }); continue; }
    if ((m = s.match(/^choose 1: \u2022 (.+)$/))) {
      // "Choose 1:" with bullet options (Kieran).
      const opts = [m[1]];
      while (/^\u2022 /.test(sents[i + 1] || '')) opts.push(sents[++i].slice(2));
      const parsed = opts.map(o => ({ label: o, b: gfParseBody([o]) }));
      if (parsed.some(o => !o.b)) return null;
      push({ t: 'choose', opts: parsed.map(o => ({ label: o.label, steps: o.b.steps, opp: o.b.opp })) });
      continue;
    }
    if (/^shuffle this pokemon and all attached cards into your deck$/.test(s)) { push({ t: 'selfShuffle', ifDrew: true }); continue; }
    if (/^(?:you may )?switch (?:it|this pokemon) with your active pokemon$/.test(s)) { push({ t: 'switchSelf' }); continue; }
    if (/^(?:if you do, )?(?:you may )?move any amount of energy from your other pokemon to this pokemon$/.test(s)) { push({ t: 'moveToSelf', ifSwitched: true }); continue; }
    return null;
  }
  return { steps, opp };
}

/** A Trainer card's rules: what it costs, when it can be played, and its steps. */
const _gfTP = new Map();
function gfTrainerPlay(x) {
  const text = gfInfo(x.card).rtext;
  if (!text) return null;
  if (_gfTP.has(text)) return _gfTP.get(text);
  const kind = gfKind(x);
  const sents = gfSentences(kind === 'stadium' ? gfStadiumText(text) : text);
  const P = { cost: null, need: null, firstOK: false, firstOnly: false, noFirst: false, once: false };
  const body = [];
  for (const s of sents) {
    let m;
    if ((m = s.match(/^you can use this card only if you discard (another card|an? card|(\d+) other cards|(\d+) cards) from your hand$/))) { P.cost = { n: m[2] ? +m[2] : m[3] ? +m[3] : 1, F: { any: true } }; continue; }
    if ((m = s.match(new RegExp('^you can use this card only if you discard a basic (' + GF_TY + ') energy card from your hand$')))) { P.cost = { n: 1, F: { cat: 'energy', basic: true, type: m[1] } }; continue; }
    if ((m = s.match(/^you can use this card only if (.+)$/))) { P.need = m[1]; continue; }
    if (/^if you go first, you may use this card during your first turn$/.test(s)) { P.firstOK = true; continue; }
    if (/^you can use this card only during your first turn$/.test(s)) { P.firstOnly = true; continue; }
    if (/^you can't use this card during your first turn/.test(s)) { P.noFirst = true; continue; }
    if (kind === 'stadium' && /^once during your turn, you may /.test(s)) { P.once = true; body.push(s.replace(/^once during your turn, you may /, '')); continue; }
    body.push(s);
  }
  if (kind === 'tool' || (kind === 'stadium' && !P.once)) { P.steps = []; P.passive = true; }
  else { const b = gfParseBody(body); P.steps = b ? b.steps : null; P.opp = b ? b.opp : false; }
  _gfTP.set(text, P);
  return P;
}
/** Why a card's "only if" cannot be met in Goldfish, or '' when it can. */
function gfNeedWhy(need) {
  if (!need) return '';
  if (/knocked out during your opponent's last turn/.test(need)) return 'Needs a Pokémon Knocked Out last turn, and nothing gets Knocked Out in Goldfish.';
  if (/^you have any tera pokemon in play$/.test(need)) return gfMons().some(m => gfSubs(gfTop(m)).includes('tera')) ? '' : 'Needs a Tera Pokémon in play.';
  let m = need.match(/^your opponent has (exactly )?(\d+)( or fewer)? prize cards remaining$/);
  if (m) { const k = +m[2]; return (m[1] ? 6 === k : m[3] ? 6 <= k : 6 === k) ? '' : 'Needs your opponent at ' + k + ' Prize card' + (k !== 1 ? 's' : '') + (m[3] ? ' or fewer' : '') + ', and nobody takes Prizes in Goldfish.'; }
  if (/^you have more prize cards remaining than your opponent$/.test(need)) return 'Needs you behind on Prizes, and nobody takes Prizes in Goldfish.';
  // v67: the rest of the conditions printed on cards, checked against the board. A condition the app
  // cannot read keeps the card off, so nothing is played without its condition met.
  if ((m = need.match(/^you have (exactly )?(\d+)( or fewer)? prize cards remaining$/))) { const k = +m[2]; return (m[3] ? 6 <= k : 6 === k) ? '' : 'Needs you at ' + k + ' Prize card' + (k !== 1 ? 's' : '') + (m[3] ? ' or fewer' : '') + ', and nobody takes Prizes in Goldfish.'; }
  if ((m = need.match(/^your active pokemon has (\d+) or more energy attached(?: to it)?$/))) { const k = +m[1], a = gf.active;
    return a && a.energy.length >= k ? '' : `Needs ${k} or more Energy on your Active Pokémon${a ? ', which has ' + a.energy.length : ''}.`; }
  if ((m = need.match(/^your active pokemon has (?:any )?energy attached(?: to it)?$/))) return gf.active && gf.active.energy.length ? '' : 'Needs Energy on your Active Pokémon.';
  if (/^(?:there is a|a) stadium (?:is )?in play$/.test(need)) return gf.stadium ? '' : 'Needs a Stadium in play.';
  if ((m = need.match(/^you have (\d+) or more cards in your discard pile$/))) return gf.discard.length >= +m[1] ? '' : `Needs ${m[1]} or more cards in your discard pile, and you have ${gf.discard.length}.`;
  if ((m = need.match(/^you have (\d+) or fewer cards in your hand(?:, not counting this card| other than this card)?$/))) return gf.hand.length - 1 <= +m[1] ? '' : `Needs ${m[1]} or fewer other cards in your hand.`;
  if ((m = need.match(/^you have (\d+) or more cards in your hand(?:, not counting this card| other than this card)?$/))) return gf.hand.length - 1 >= +m[1] ? '' : `Needs ${m[1]} or more other cards in your hand.`;
  if ((m = need.match(/^you have (?:any |a |an )?(.+?) pokemon in play$/))) { const w = m[1].replace(/^any /, '');
    const ok = gfMons().some(z => { const t = gfTop(z); return gfKey(t).includes(w) || gfSubs(t).includes(w) || gfTypes(t).includes(w); });
    return ok ? '' : 'Needs ' + w.replace(/\b\w/g, c => c.toUpperCase()) + ' Pokémon in play.'; }
  if ((m = need.match(/^your bench has (\d+) or more pokemon$|^you have (\d+) or more benched pokemon$/))) { const k = +(m[1] || m[2]); return gf.bench.length >= k ? '' : `Needs ${k} or more Benched Pokémon.`; }
  return 'Needs ' + need + '. The app cannot check that yet, so it stays off.';
}
/** v67: a Trainer whose effect only works on a Pokémon that meets a condition needs one in play that does. */
function gfTargetWhy(x) {
  const t = gfSentences(gfInfo(x.card).rtext || '').join('. ');
  if (!t) return '';
  let m;
  const en = z => z.energy.length;
  if ((m = t.match(/your active pokemon that has (\d+) or more energy attached/))) { const k = +m[1], a = gf.active;
    if (!a || en(a) < k) return `Needs ${k} or more Energy on your Active Pokémon${a ? ', which has ' + en(a) : ''}.`; }
  else if ((m = t.match(/(?:1 of )?your (benched )?pokemon that (?:has|have) (\d+) or more energy attached/))) { const k = +m[2], pool = m[1] ? gf.bench : gfMons();
    if (!pool.some(z => en(z) >= k)) return `Needs a ${m[1] ? 'Benched ' : ''}Pokémon with ${k} or more Energy.`; }
  if (/your active pokemon that has (?:any )?energy attached/.test(t) && !(gf.active && en(gf.active))) return 'Needs Energy on your Active Pokémon.';
  if (/^(?:switch your active pokemon with 1 of your benched pokemon|switch in 1 of your benched pokemon to the active spot)/.test(t) && !gf.bench.length) return 'Needs a Benched Pokémon to switch in.';
  if (/^(?:attach|move) .* (?:from|to) 1 of your benched pokemon/.test(t) && !gf.bench.length) return 'Needs a Benched Pokémon.';
  if (/^search your deck/.test(t) && !gf.deck.length) return 'Your deck is empty.';
  return '';
}
/** v67: the Retreat Cost of a Pokémon in play, less what its Tool, a Stadium or an Ability takes off. */
function gfRetreatCost(m) {
  const top = gfTop(m), base = top.card.retreat;
  if (base == null) return null;
  const free = /(?:have|has) no retreat cost/;
  const basicFree = /your basic pokemon in play have no retreat cost/;
  const texts = [];
  if (gf.stadium) texts.push(gfInfo(gf.stadium.card).rtext || '');
  gfMons().forEach(z => gfInfo(gfTop(z).card).abil.forEach(a => texts.push(a.text || '')));
  const T = texts.map(x => gfNorm(x).toLowerCase());
  if (T.some(x => basicFree.test(x)) && gfIsBasic(top)) return 0;
  let n = base;
  if (m.tool) { const tt = gfNorm(gfInfo(m.tool.card).rtext || '').toLowerCase();
    if (/the pokemon this card is attached to has no retreat cost/.test(tt)) return 0;
    const r = tt.match(/the retreat cost of the pokemon this card is attached to is ((?:colorless|\{c\}|\s)+) less/);
    if (r) n -= (r[1].match(/colorless|\{c\}/g) || []).length; }
  gfInfo(top.card).abil.forEach(a => { if (free.test(gfNorm(a.text || '').toLowerCase()) && /this pokemon/.test(gfNorm(a.text || '').toLowerCase())) n = 0; });
  return Math.max(0, n);
}

/** A Pokémon's Abilities, read: when they can be used and what they do. */
const _gfAP = new Map();
// Conditions in front of an Ability's effect that gfAbilWhy checks itself.
const GF_PRE = /^(?:(?:and )?(?:if this pokemon is (?:in|on) (?:the active spot|your bench|your hand)|if you have any [^,]+ in play|if any of your pokemon were knocked out during your opponent's last turn|if this pokemon has any [^,]+ attached|when you play this pokemon from your hand [^,]+|during your turn|if you go first|if you go second),? )+/;
function gfAbilities(x) {
  return gfInfo(x.card).abil.map(a => {
    const key = a.name + '|' + a.text;
    if (_gfAP.has(key)) return _gfAP.get(key);
    const t = gfNorm(a.text).toLowerCase().replace(/\([^)]*\)/g, ' ');
    const A = { name: a.name, text: a.text };
    if (/when you play this pokemon from your hand onto your bench/.test(t)) A.when = 'bench';
    else if (/when you play this pokemon from your hand to evolve/.test(t)) A.when = 'evolve';
    else if (/if this pokemon is in your hand/.test(t)) A.when = 'hand';
    else if (/once during your (first )?turn|you may use this ability|as often as you like during your turn/.test(t)) A.when = 'turn';
    else A.when = 'passive';
    A.first = /once during your first turn/.test(t);
    A.many = /as often as you like during your turn/.test(t);
    A.active = /if this pokemon is in the active spot/.test(t);
    A.benchOnly = /if this pokemon is on your bench/.test(t);
    let m;
    if ((m = t.match(/you can't use more than 1 (.+?) ability (?:each|during your) turn/))) A.limit = m[1].trim();
    if ((m = t.match(/you can't use more than 1 ability that has "([^"]+)" in its name each turn/))) A.limitHas = m[1].trim();
    if (/if any of your pokemon were knocked out during your opponent's last turn/.test(t)) A.why = 'Needs a Pokémon Knocked Out last turn, and nothing gets Knocked Out in Goldfish.';
    if (/if you have any tera pokemon in play/.test(t)) A.tera = true;
    if ((m = t.match(new RegExp('if you have any (?:(' + GF_TY + ') )?mega evolution pokemon ex in play')))) A.mega = m[1] || 'any';
    if ((m = t.match(new RegExp('if this pokemon has any (' + GF_TY + ') energy attached')))) A.energy = m[1];
    if (/you must discard a card from your hand in order to use this ability/.test(t)) A.cost = 1;
    if (A.when !== 'passive') {
      const body = gfSentences(a.text).filter(s => !/you can't use more than 1 /.test(s) && !/you must discard a card from your hand in order to use this ability/.test(s) && !/^.*you may use this ability$/.test(s))
        .map(s => s.replace(/^(?:once|as often as you like) during your (first )?turn, /, '').replace(GF_PRE, '').replace(/^(?:once during your (first )?turn, )/, '').replace(/^you may /, '')
          .replace(/^if you use this ability, your turn ends$/, 'your turn ends'));
      const b = gfParseBody(body);
      A.steps = b ? b.steps : null;
      A.opp = b ? b.opp : false;
    }
    _gfAP.set(key, A);
    return A;
  });
}
/** Why this Pokémon's Abilities are off right now (Legendary Pyroduct, Iron Thorns ex), or ''. */
function gfAbilOff(m) {
  const top = gfTop(m);
  if (gf.stadium) {
    const st = gfNorm(gfInfo(gf.stadium.card).rtext).toLowerCase();
    if (/evolution pokemon in play .*have no abilities/.test(st) && gfIsEvo(top)) return gfNm(gf.stadium) + ' is in play, so Evolution Pokémon have no Abilities.';
  }
  const act = gf.active;
  if (act && act !== m) {
    const shut = gfAbilities(gfTop(act)).some(a => /as long as this pokemon is in the active spot, pokemon with a rule box in play .*have no abilities, except for future pokemon/.test(gfNorm(a.text).toLowerCase()));
    if (shut && gfRuleBox(top) && !gfSubs(top).includes('future')) return gfMonNm(act) + ' is Active, so Pokémon with a Rule Box have no Abilities.';
  }
  return '';
}
/** Can this Ability be used now? '' if so, or the reason it can't. */
function gfAbilWhy(m, A, x) {
  if (gf.turn === 0) return 'Abilities start on turn 1.';
  if (gf.turnOver) return 'Your turn has ended.';
  if (A.when === 'passive') return 'Always on. Nothing to tap.';
  if (!A.steps) return '';
  if (m) { const off = gfAbilOff(m); if (off) return off; }
  if (A.why) return A.why;
  if (A.first && gf.turn !== 1) return 'Only during your first turn.';
  if (A.when === 'bench' && !(m && m.trig && m.benchTurn === gf.turn)) return 'Only right after you play it from your hand onto your Bench.';
  if (A.when === 'evolve' && !(m && m.trig && m.evoHandTurn === gf.turn && m.evoUid === gfTop(m).uid)) return 'Only right after you evolve into it from your hand.';
  if (A.active && m && gf.active !== m) return 'Only while it is in the Active Spot.';
  if (A.benchOnly && m && gf.active === m) return 'Only while it is on your Bench.';
  const used = A.many ? false : m ? (m.ab || {})[A.name] === gf.turn : (gf.handAb || {})[A.name + ':' + x.uid] === gf.turn;
  if (used) return 'Already used this turn.';
  if (A.limit && (gf.lim || {})[A.limit] === gf.turn) return 'Only 1 ' + esc(A.name) + ' a turn.';
  if (A.limitHas && Object.keys(gf.limHas || {}).some(k => k.includes(A.limitHas.toLowerCase()) && gf.limHas[k] === gf.turn)) return 'Only 1 Ability with "' + esc(A.limitHas) + '" in its name a turn.';
  if (A.tera && !gfMons().some(z => gfSubs(gfTop(z)).includes('tera'))) return 'Needs a Tera Pokémon in play.';
  if (A.mega && !gfMons().some(z => gfIsMega(gfTop(z)) && gfIsEx(gfTop(z)) && (A.mega === 'any' || gfTypes(gfTop(z)).includes(A.mega)))) return 'Needs a ' + (A.mega === 'any' ? '' : A.mega[0].toUpperCase() + A.mega.slice(1) + ' ') + 'Mega Evolution Pokémon ex in play.';
  if (A.energy && m && !m.energy.some(e => gfEType(e) === A.energy)) return 'Needs ' + A.energy[0].toUpperCase() + A.energy.slice(1) + ' Energy attached.';
  if (A.cost && gf.hand.filter(y => !x || y.uid !== x.uid).length < A.cost) return 'Needs a card in hand to discard.';
  if (A.when === 'hand' && A.steps.some(s => s.t === 'benchSelf') && gf.bench.length >= 5) return 'Your Bench is full.';
  return '';
}

/* ---------- Basics ---------- */
function setHandMode(m) { handMode = m === 'gold' ? 'gold' : 'line'; renderHand(); }
function handModeBar() {
  return `<div class="seg hm-seg" role="group" aria-label="Hand practice mode">
    <div class="mode-opt${handMode === 'line' ? ' active' : ''}" onclick="setHandMode('line')">Turn 1 line</div>
    <div class="mode-opt${handMode === 'gold' ? ' active' : ''}" onclick="setHandMode('gold')">Goldfish (3 Turns)</div>
    <a class="mode-opt hm-spar" href="opponent/play.html">Sparring (5 Turns)</a>
  </div>`;
}
function gfIsBasic(x) { const c = x.card; return cardCategory(c) === 'pokemon' && (c.stage === 'basic' || (!c.stage && !c.evolvesFrom)); }
function gfIsEvo(x) { const c = x.card; return cardCategory(c) === 'pokemon' && (c.stage === 'stage1' || c.stage === 'stage2'); }
function gfKey(x) { return String(x.card.name || '').toLowerCase(); }
function gfNm(x) { return esc(lbl23(x.card)); }
function gfMons() { return gf ? [gf.active].concat(gf.bench).filter(Boolean) : []; }
// v67: copies in play that share a name are numbered in the order they came into play,
// so the one that came to the Bench later (and cannot evolve yet) is easy to pick out.
function gfDupN(m) {
  const k = gfKey(gfTop(m)), same = gfMons().filter(z => gfKey(gfTop(z)) === k).sort((a, b) => a.id - b.id);
  return same.length > 1 ? same.indexOf(m) + 1 : 0;
}
function gfMonNm(m) { if (!m) return ''; const n = gfDupN(m); return gfNm(gfTop(m)) + (n ? ' ' + n : ''); }
/** What sets this copy apart: its Energy, its Tool and when it came into play. */
function gfMonInfo(m) {
  const en = m.energy.length ? m.energy.length + ' Energy (' + [...new Set(m.energy.map(e => gfEType(e) ? gfEType(e)[0].toUpperCase() + gfEType(e).slice(1) : lbl23(e.card)))].join(', ') + ')' : 'no Energy';
  const when = m.turnIn === 0 ? 'in play from the start' : m.turnIn === gf.turn ? 'came into play this turn' : 'came into play turn ' + m.turnIn;
  return [en, m.tool ? esc(lbl23(m.tool.card)) : '', when].filter(Boolean).join(', ');
}
/** A button label for a copy: the name, and when another copy shares it, what sets this one apart. */
function gfMonPick(m) { return gfMonNm(m) + (gfDupN(m) ? ` <small>(${gfMonInfo(m)})</small>` : ''); }
function gfTop(m) { return m.stack[m.stack.length - 1]; }
function gfLog(s) { gf.log.push({ t: gf.turn, s }); }
function gfMon(id) { return gfMons().find(z => z.id === id); }

function gfNew(deck, groups, pool, mulls, first, anyBasic) {
  gf = {
    deckId: deck.id, groups, first: first !== false, turn: 0, mulls, anyBasic,
    hand: pool.slice(0, 7), prizes: pool.slice(7, 13), deck: pool.slice(13),
    startHand: pool.slice(0, 7), startRest: pool.slice(7).map(x => x.g),
    active: null, bench: [], discard: [], stadium: null,
    used: { energy: false, supporter: false, stadium: false, retreat: false }, log: [], sel: null, selMon: null,
    run: null, offer: null, lim: {}, limHas: {}, handAb: {}, stadUsed: -1, turnOver: false,
    ready: {}, done: false, monId: 0,
  };
}
function gfDeal(first) {
  const deck = findDeck(state.activeDeckId);
  if (!deck) return;
  const cards = (deck.cards || []).filter(c => c.count > 0);
  const groups = simGroups(cards);
  const gid = {}; groups.forEach((g, i) => gid[g.key] = i);
  const pool = []; let uid = 0;
  cards.forEach(c => { const i = gid[String(c.name || '').toLowerCase()]; for (let k = 0; k < c.count; k++) pool.push({ uid: ++uid, card: c, g: i }); });
  const anyBasic = groups.some(g => g.basic);
  let mulls = 0;
  for (;;) {
    shuffle(pool);
    if (!anyBasic || pool.slice(0, 7).some(gfIsBasic) || mulls >= 30) break;
    mulls++;
  }
  gfNew(deck, groups, pool, mulls, first, anyBasic);
  closeSheet();
  renderHand();
}
/** v67: tap a Basic in the Turn 1 line hand to set it up: Goldfish opens on this hand with it in play
 * (Active first, then the Bench), and the rest of the setup carries on there. */
function hpSetUp(i) {
  const H = handState;
  if (!H || !H.hand[i] || !gfIsBasic(H.hand[i])) return;
  gfFromHand();
  if (!gf) return;
  const x = gf.hand.find(y => y.uid === i + 1);
  if (x) gfPlayBasic(x.uid, gf.active ? 'bench' : 'active');
  renderHand();
}
/** v58: play out the hand the Turn 1 line tab dealt, with the same prizes and draws. */
function gfFromHand() {
  const H = handState, deck = findDeck(state.activeDeckId);
  if (!H || !deck || H.deckId !== deck.id) return;
  let uid = 0;
  const pool = H.hand.concat(H.restOrder).map(x => ({ uid: ++uid, card: x.card, g: x.g }));
  gfNew(deck, H.groups, pool, H.mulls, gf ? gf.first : true, H.anyBasic);
  // v71: the summary scores the line the player picked on this hand, so its odds match the Hand tab.
  gf.line = H.pick != null ? H.pick : 0;
  handMode = 'gold';
  renderHand();
  const el = document.getElementById('hand-body');
  if (el && el.scrollIntoView) try { el.scrollIntoView({ block: 'start' }); } catch (_) {}
}
function gfDraw(n, quiet) {
  const got = [];
  for (let i = 0; i < n && gf.deck.length; i++) { const x = gf.deck.shift(); gf.hand.push(x); got.push(x); }
  if (!quiet) gfLog(got.length ? 'Drew ' + got.map(gfNm).join(', ') : 'Deck is empty, no draw');
  return got;
}
function gfTake(uid) {
  const i = gf.hand.findIndex(x => x.uid === uid);
  return i < 0 ? null : gf.hand.splice(i, 1)[0];
}
function gfNewMon(x) { return { id: ++gf.monId, stack: [x], energy: [], tool: null, turnIn: gf.turn, evoTurn: -1, ab: {}, dmg: 0 }; }

/* ---------- 3.4: damage on your own Pokemon ---------- */
/** HP now: the top card's HP, plus what its Tool adds. 0 when the card data has no HP. */
function gfHp(m) {
  let hp = +gfTop(m).card.hp || 0;
  if (hp && m.tool) { const r = gfNorm(gfInfo(m.tool.card).rtext || '').toLowerCase().match(/the pokemon this card is attached to gets \+(\d+) hp/); if (r) hp += +r[1]; }
  return hp;
}
function gfCtr(d) { const n = Math.round(d / 10); return n + ' damage counter' + (n !== 1 ? 's' : ''); }
/** Prize cards your opponent would take for this Pokemon. */
function gfPrizeN(m) { const t = gfTop(m); return gfIsMega(t) && gfIsEx(t) ? 3 : gfRuleBox(t) ? 2 : 1; }
/** Put damage on one of your Pokemon, then Knock it Out when its damage reaches its HP. */
function gfAddDmg(m, d, why) {
  if (!m || d <= 0) return;
  m.dmg = (m.dmg || 0) + d;
  gfLog((why ? why + ' put ' : 'Put ') + gfCtr(d) + ' on ' + gfMonNm(m));
  gfCheckKO(m);
}
function gfHeal(m, d) {
  const h = Math.min(m.dmg || 0, d);
  m.dmg = (m.dmg || 0) - h;
  gfLog(h ? 'Healed ' + h + ' damage from ' + gfMonNm(m) : gfMonNm(m) + ' has no damage to heal');
  return h;
}
function gfCheckKO(m) {
  const hp = gfHp(m);
  if (!hp || (m.dmg || 0) < hp || !gfMons().includes(m)) return false;
  gfKnockOut(m);
  return true;
}
function gfKnockOut(m) {
  if (gf.active === m) { gf.active = null; if (gf.bench.length) gf.needActive = true; } else gf.bench = gf.bench.filter(z => z !== m);
  m.stack.concat(m.energy, m.tool ? [m.tool] : []).forEach(y => gf.discard.push(y));
  const p = gfPrizeN(m);
  gfLog(gfMonNm(m) + ' is Knocked Out. Your opponent would take ' + p + ' Prize card' + (p !== 1 ? 's' : '') + ' for it');
  if (gf.selMon === m.id) gf.selMon = null;
  if (!gfMons().length) gfLog('You have no Pokémon left in play, so this game would be lost');
}
/** Risky Ruins: a Basic put onto your Bench during your turn takes damage counters. */
function gfBenchStadium(m) {
  if (!gf.stadium || gf.turn === 0 || !gf.bench.includes(m)) return;
  const t = gfSentences(gfInfo(gf.stadium.card).rtext || '').join('. ');
  const r = t.match(new RegExp('whenever any player puts a basic non-(' + GF_TY + ') pokemon onto their bench during their turn, place (\\d+) damage counters? on that pokemon'));
  if (r && gfIsBasic(gfTop(m)) && !gfTypes(gfTop(m)).includes(r[1])) gfAddDmg(m, 10 * +r[2], gfNm(gf.stadium));
}
/** Add or take off one damage counter by hand, for card text the app cannot follow. */
function gfManDmg(id, d) {
  const m = gfMon(id); if (!m || gf.done || gf.turn === 0) return;
  if (d < 0 && !(m.dmg > 0)) return;
  if (d > 0) gfAddDmg(m, 10); else { m.dmg -= 10; gfLog('Took 1 damage counter off ' + gfMonNm(m)); }
  renderHand();
}
function gfCanEvolveOnto(m) { return gf.turn >= 2 && m.turnIn < gf.turn && m.evoTurn !== gf.turn; }
function gfBusy() { return !!(gf.run || gf.needActive); }
function gfManual() { return !!(gf.run && gf.run.wait && gf.run.wait.t === 'manual'); }

/** What a hand card can do right now: a list of { label, fn, off, why }. */
function gfActions(x) {
  const out = [], mons = gfMons(), t = gf.turn;
  const room = gf.bench.length < 5;
  const nm = gfKey(x);
  const cat = cardCategory(x.card);
  // A card text the app cannot follow is done by hand, so its discards are too.
  if (gfManual()) return [{ label: 'Discard', fn: `gfDiscard(${x.uid})`, ghost: true }];
  if (gf.turnOver) return [];
  if (gfIsBasic(x)) {
    if (!gf.active) out.push({ label: 'Make Active', fn: `gfPlayBasic(${x.uid},'active')` });
    else out.push({ label: 'Put on Bench', fn: `gfPlayBasic(${x.uid},'bench')`, off: !room, why: 'Your Bench is full.' });
  }
  if (t === 0) return out;
  if (cat === 'pokemon') {
    gfAbilities(x).filter(A => A.when === 'hand').forEach((A, i) => {
      const why = gfAbilWhy(null, A, x);
      out.push({ label: 'Use ' + esc(A.name), fn: `gfUseHandAbility(${x.uid},${i})`, off: !!why || !A.steps, why: why || (A.steps ? '' : 'The app cannot play this Ability yet.') });
    });
  }
  if (gfIsEvo(x)) {
    const from = String(x.card.evolvesFrom || '').toLowerCase();
    const targets = mons.filter(m => gfKey(gfTop(m)) === from);
    if (!targets.length) out.push({ label: 'Evolve', off: true, why: from ? `Needs ${esc(cn23(x.card.evolvesFrom))} in play.` : 'Its card data is missing, so the app cannot tell what it evolves from.' });
    targets.forEach(m => out.push({ label: 'Evolve ' + gfMonPick(m), fn: `gfEvolve(${x.uid},${m.id})`, off: !gfCanEvolveOnto(m),
      why: t < 2 ? 'No one can evolve on their first turn.' : m.turnIn >= t ? 'It came into play this turn.' : 'It already evolved this turn.' }));
  }
  if (cat === 'energy') {
    if (!mons.length) out.push({ label: 'Attach', off: true, why: 'Nothing in play to attach to.' });
    mons.forEach(m => out.push({ label: 'Attach to ' + gfMonPick(m), fn: `gfAttach(${x.uid},${m.id})`, off: gf.used.energy, why: 'You already attached an Energy this turn.' }));
  }
  if (cat === 'trainer') {
    const g = gf.groups[x.g];
    const kind = gfKind(x);
    if (g && g.candy) {
      const opts = [];
      gf.hand.filter(y => y.card.stage === 'stage2').forEach(s2 => {
        const line = handLineFor(gf.groups, s2.g);
        mons.filter(m => m.stack.length === 1 && gfTop(m).g === line.basic).forEach(m => opts.push({ s2, m }));
      });
      if (!opts.length) out.push({ label: 'Play Rare Candy', off: true, why: 'Needs a Stage 2 in hand and its Basic in play.' });
      opts.forEach(o => out.push({ label: `Candy: ${gfNm(o.s2)} onto ${gfMonPick(o.m)}`, fn: `gfCandy(${x.uid},${o.s2.uid},${o.m.id})`, off: !gfCanEvolveOnto(o.m),
        why: t < 2 ? 'No one can evolve on their first turn.' : 'That Pokémon came into play this turn.' }));
    } else if (kind === 'stadium') {
      const why = gf.used.stadium ? 'One Stadium a turn.' : gf.stadium && gfKey(gf.stadium) === nm ? 'That Stadium is already in play.' : '';
      out.push({ label: 'Put Stadium in play', fn: `gfStadium(${x.uid})`, off: !!why, why });
    } else if (kind === 'tool') {
      if (!mons.length) out.push({ label: 'Attach Tool', off: true, why: 'Nothing in play to attach to.' });
      mons.forEach(m => out.push({ label: 'Attach to ' + gfMonPick(m), fn: `gfTool(${x.uid},${m.id})`, off: !!m.tool, why: 'It already has a Tool.' }));
    } else {
      const sup = kind === 'supporter';
      const P = gfTrainerPlay(x) || {};
      let why = '';
      if (sup && gf.used.supporter) why = 'One Supporter a turn.';
      else if (sup && gf.first && t === 1 && !P.firstOK) why = 'The player going first cannot play a Supporter on turn 1.';
      else if (P.firstOnly && t !== 1) why = 'Only during your first turn.';
      else if (P.noFirst && t === 1) why = 'Not during your first turn.';
      else if (P.need && gfNeedWhy(P.need)) why = gfNeedWhy(P.need);
      else if (P.cost && gf.hand.filter(y => y.uid !== x.uid && gfFit(y, P.cost.F)).length < P.cost.n) why = P.cost.F.any ? `Needs ${P.cost.n} other card${P.cost.n !== 1 ? 's' : ''} in hand to discard.` : 'Needs the card it discards in your hand.';
      else why = gfTargetWhy(x);
      out.push({ label: sup ? 'Play Supporter' : 'Play', fn: `gfTrainer(${x.uid})`, off: !!why, why });
    }
  }
  // v67: no free discards. A card leaves your hand only by being played or by a card's effect.
  return out;
}

/** A "when you play this" Ability is offered once, right then; anything else you do passes on it. */
function gfClearOffer() { if (gf.offer) { const m = gfMon(gf.offer.id); if (m) m.trig = false; gf.offer = null; } }
// 3.4: tapping a card in your hand opens it with what it can do right now, so you play it from there.
function gfSelect(uid) { if (!gf.done && (!gfBusy() || gfManual())) { gfClearOffer(); gf.sel = uid; gf.selMon = null; renderHand(); gfHandSheet(uid); } }
function gfHandSheet(uid) {
  const sel = gf.hand.find(x => x.uid === uid); if (!sel) return;
  const acts = gfActions(sel), inf = gfInfo(sel.card), c = sel.card;
  const tr = cardCategory(c) === 'trainer' && !['tool', 'stadium'].includes(gfKind(sel)) && !(gf.groups[sel.g] || {}).candy;
  const P = tr ? gfTrainerPlay(sel) : null, manual = tr && (!P || !P.steps);
  const go = fn => `gfShut();${fn}`;
  openSheet(gfSheetHTML(sel, `<div class="gf-acts">${acts.map(a => a.off ? `<button class="btn btn-sm" disabled>${a.label}</button>`
      : `<button class="btn btn-sm${a.ghost ? ' btn-ghost' : ' btn-primary'}" onclick="${go(a.fn)}">${a.label}</button>`).join('') || `<span class="nt-muted">${gf.turn === 0 ? 'During setup only Basic Pokémon go into play.' : gf.turnOver ? 'Your turn has ended.' : 'Nothing to do with this card now.'}</span>`}</div>
    ${acts.filter(a => a.off && a.why).slice(0, 2).map(a => `<div class="nt-muted gf-why">${a.why}</div>`).join('')}
    ${manual ? `<div class="nt-muted gf-why">${inf.rtext ? 'The app cannot follow this card\'s text yet, so playing it lets you do it by hand.' : 'No card text read yet. Open this deck online to read it.'}</div>` : ''}`, 'gfShut()'));
}
/** A hand card opened in a sheet: its picture, what you can do with it (mid), then its text. */
function gfSheetHTML(x, mid, close) {
  const c = x.card, inf = gfInfo(c), cat = cardCategory(c);
  const txt = cat === 'trainer' ? gfTextHTML(inf.rtext) : cat === 'pokemon'
    ? gfAbilities(x).map(A => `<div class="gf-txt"><b>${esc(A.name)}.</b> ${esc(gfShow(A.text))}</div>`).join('') + (c.attacks || []).map(gfAtkLine).join('')
    : gfTextHTML(c.etext);
  const img = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${gfNm(x)}" data-fallbacks="${esc(JSON.stringify(c.fallbackUrls || []))}" data-fallback-idx="0" onerror="reviewImgError(this)">` : '';
  return `<div class="pz-card gf-sheet">${img}<div class="pz-ctx"><div class="modal-title">${gfNm(x)}</div>${mid}${txt}</div></div>
    <div class="modal-actions"><button class="btn" onclick="${close || 'closeSheet()'}">Close</button></div>`;
}
/** 3.4: Turn 1 line: tapping a card in the opening hand opens it; a Basic can go straight into play in Goldfish. */
function hpCardSheet(i) {
  const H = handState, x = H && H.hand[i]; if (!x) return;
  openSheet(gfSheetHTML(x, gfIsBasic(x)
    ? `<div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="closeSheet();hpSetUp(${i})">Make Active and play on in Goldfish</button></div>`
    : '<div class="nt-muted gf-why">Only Basic Pokémon go into play before turn 1. Tap a Basic to play this hand on in Goldfish.</div>'));
}
function gfShut() { closeSheet(); if (gf) gf.sel = null; }
function gfSelectMon(id) {
  if (gf.done) return;
  if (gf.needActive) { gfPromote(id); return; }
  if (gf.run && !gfManual()) return;
  if (!(gf.offer && gf.offer.id === id)) gfClearOffer();
  gf.selMon = gf.selMon === id ? null : id; gf.sel = null; renderHand();
}
function gfPlayBasic(uid, where) {
  const x = gfTake(uid); if (!x) return;
  const m = gfNewMon(x);
  if (where === 'active' && !gf.active) gf.active = m; else if (gf.bench.length < 5) gf.bench.push(m); else { gf.hand.push(x); return; }
  gfLog((gf.turn === 0 ? 'Set up ' : 'Played ') + gfNm(x) + (gf.active === m ? ' as your Active' : ' on the Bench'));
  gf.sel = null;
  gfBenchStadium(m);
  if (!gfMons().includes(m)) { renderHand(); return; }
  // "When you play this Pokémon from your hand onto your Bench" Abilities (Meowth ex, Mega Rayquaza ex).
  if (gf.turn > 0 && gf.active !== m) {
    m.benchTurn = gf.turn;
    const i = gfAbilities(x).findIndex(A => A.when === 'bench');
    if (i >= 0) { gf.offer = { id: m.id, i }; m.trig = true; }
  }
  renderHand();
}
function gfEvolve(uid, id) {
  const m = gfMon(id); if (!m || !gfCanEvolveOnto(m)) return;
  const x = gfTake(uid); if (!x) return;
  const under = gfTop(m);
  m.stack.push(x); m.evoTurn = gf.turn; m.evoHandTurn = gf.turn; m.evoUid = x.uid; m.lock = null;
  gfLog('Evolved ' + gfNm(under) + ' into ' + gfNm(x));
  gf.sel = null; gfOfferEvolve(m);
  renderHand();
}
function gfOfferEvolve(m) {
  const i = gfAbilities(gfTop(m)).findIndex(A => A.when === 'evolve');
  if (i >= 0) { gf.offer = { id: m.id, i }; m.trig = true; }
}
function gfCandy(candyUid, s2Uid, id) {
  const m = gfMon(id); if (!m || !gfCanEvolveOnto(m)) return;
  const c = gfTake(candyUid); if (!c) return;
  const s2 = gfTake(s2Uid); if (!s2) { gf.hand.push(c); return; }
  const under = gfTop(m);
  m.stack.push(s2); m.evoTurn = gf.turn; m.evoHandTurn = gf.turn; m.evoUid = s2.uid; gf.discard.push(c);
  gfLog('Rare Candy: ' + gfNm(under) + ' straight into ' + gfNm(s2));
  gf.sel = null; gfOfferEvolve(m);
  renderHand();
}
function gfAttach(uid, id) {
  if (gf.used.energy) return;
  const m = gfMon(id); const x = gfTake(uid); if (!m || !x) return;
  m.energy.push(x); gf.used.energy = true;
  gfLog('Attached ' + gfNm(x) + ' to ' + gfMonNm(m));
  gf.sel = null; renderHand();
}
function gfTool(uid, id) {
  const m = gfMon(id); if (!m || m.tool) return;
  const x = gfTake(uid); if (!x) return;
  m.tool = x; gfLog('Attached ' + gfNm(x) + ' to ' + gfMonNm(m));
  gf.sel = null; renderHand();
}
function gfStadium(uid) {
  if (gf.used.stadium) return;
  const x = gfTake(uid); if (!x) return;
  gf.used.stadium = true;
  if (gf.stadium) gf.discard.push(gf.stadium);
  gf.stadium = x; gf.stadUsed = -1; gfLog('Put ' + gfNm(x) + ' in play');
  gf.sel = null; renderHand();
}
function gfTrainer(uid) {
  const x = gfTake(uid); if (!x) return;
  const sup = gfKind(x) === 'supporter';
  if (sup) gf.used.supporter = true;
  gfLog('Played ' + gfNm(x));
  gf.sel = null;
  const P = gfTrainerPlay(x);
  const steps = P && P.steps ? (P.cost ? [{ t: 'cost', n: P.cost.n, F: P.cost.F }] : []).concat(P.steps) : null;
  gfStart({ name: lbl23(x.card), text: gfInfo(x.card).rtext, card: x, steps, opp: P && P.opp, sup });
}
function gfDiscard(uid) {
  if (!gfManual()) return;
  const x = gfTake(uid); if (!x) return;
  gf.discard.push(x); gfLog('Discarded ' + gfNm(x));
  gf.sel = null; renderHand();
}
/** v67: why the Active Pokémon cannot retreat now, or '' when it can. */
function gfRetreatWhy() {
  if (!gf.active) return 'Nothing is Active.';
  if (gf.turn === 0) return 'Retreating starts on turn 1.';
  if (gf.used.retreat) return 'You already retreated this turn.';
  const c = gfRetreatCost(gf.active);
  if (c != null && gf.active.energy.length < c) return `${gfMonNm(gf.active)} needs ${c} Energy attached to retreat, and has ${gf.active.energy.length}.`;
  return '';
}
function gfSwitch(id) {
  const i = gf.bench.findIndex(z => z.id === id); if (i < 0 || !gf.active || gfRetreatWhy()) return;
  const old = gf.active, c = gfRetreatCost(old) || 0;
  const paid = old.energy.splice(old.energy.length - c, c); paid.forEach(e => gf.discard.push(e));
  const m = gf.bench[i]; gf.bench[i] = old; gf.active = m; gf.used.retreat = true;
  gfLog('Retreated ' + gfMonNm(old) + (c ? ', discarding ' + paid.map(gfNm).join(', ') : ' for free') + '. ' + gfMonNm(m) + ' is now Active');
  gf.selMon = null; renderHand();
}
function gfPromote(id) {
  const i = gf.bench.findIndex(z => z.id === id); if (i < 0) return;
  gf.active = gf.bench.splice(i, 1)[0]; gf.needActive = false;
  gfLog('Moved ' + gfMonNm(gf.active) + ' into the Active Spot');
  gf.selMon = null; gfGo();
}
function gfAbility(id, i) {
  const m = gfMon(id); if (!m || gfBusy()) return;
  const A = gfAbilities(gfTop(m))[i]; if (!A) return;
  const why = gfAbilWhy(m, A);
  if (why) { showToast(why.replace(/<[^>]+>/g, '')); return; }
  gf.offer = null; gf.selMon = null; m.trig = false;
  m.ab = m.ab || {}; m.ab[A.name] = gf.turn;
  if (A.limit) gf.lim[A.limit] = gf.turn;
  if (A.limitHas) gf.limHas[A.name.toLowerCase()] = gf.turn;
  gfLog('Used ' + esc(A.name) + ' on ' + gfMonNm(m));
  gfStart({ name: A.name, text: A.text, mon: m.id, steps: A.steps ? (A.cost ? [{ t: 'cost', n: A.cost, F: { any: true } }] : []).concat(A.steps) : null, opp: A.opp, abil: true });
}
function gfUseHandAbility(uid, i) {
  const x = gf.hand.find(y => y.uid === uid); if (!x || gfBusy()) return;
  const A = gfAbilities(x).filter(B => B.when === 'hand')[i]; if (!A) return;
  const why = gfAbilWhy(null, A, x);
  if (why) { showToast(why.replace(/<[^>]+>/g, '')); return; }
  gf.handAb[A.name + ':' + x.uid] = gf.turn;
  if (A.limit) gf.lim[A.limit] = gf.turn;
  gf.sel = null;
  gfLog('Used ' + esc(A.name) + ' from your hand');
  gfStart({ name: A.name, text: A.text, handCard: x.uid, steps: A.steps, opp: A.opp, abil: true });
}
function gfUseStadium() {
  if (!gf.stadium || gfBusy() || gf.turnOver) return;
  const P = gfTrainerPlay(gf.stadium);
  if (!P || !P.once || gf.stadUsed === gf.turn) return;
  gf.stadUsed = gf.turn; gf.selMon = null; gf.sel = null;
  gfLog('Used ' + gfNm(gf.stadium));
  gfStart({ name: lbl23(gf.stadium.card), text: gfInfo(gf.stadium.card).rtext, steps: P.steps, opp: P.opp });
}

/* ---------- Running card text ---------- */
// gf.run = { name, text, steps, i, card, mon, ...counters }. Steps that need a
// choice stop the run (gf.run.wait) until the player picks, then gfGo() goes on.
function gfStart(R) {
  R.i = 0; R.drew = 0; R.attached = 0; R.heads = null;
  gfClearOffer(); gf.run = R;
  if (!R.steps) { gfLog(esc(R.name) + ': do what the card says with Draw, Search and Discard'); }
  else if (!R.steps.length && !R.atk) { gfLog(esc(R.name) + (R.opp ? ' only affects your opponent, so nothing happens here' : ' has no effect here')); }
  gfGo();
}
function gfFinish() {
  const R = gf.run; if (!R) return;
  if (R.card) gf.discard.push(R.card);
  gf.run = null; closeSheet();
  if (R.endTurn) { gf.turnOver = true; gfLog('Your turn ends'); }
  renderHand();
}
function gfStop() { if (gf.run) { gfLog('Stopped ' + esc(gf.run.name) + ' there'); gfFinish(); } }
function gfGo() {
  const R = gf.run;
  if (!R) { renderHand(); return; }
  if (!R.steps) { R.wait = { t: 'manual' }; renderHand(); return; }
  while (R.i < R.steps.length) {
    const s = R.steps[R.i];
    if ((s.ifHeads && !R.heads) || (s.ifAttached && !R.attached) || (s.ifDrew && !R.drew) || (s.ifSwitched && !R.switched) || (s.ifHealed && !R.healed)) { R.i++; continue; }
    R.i++;
    R.wait = null;
    switch (s.t) {
      case 'draw': {
        let n = s.n;
        if (s.alt && s.alt.prizes != null && gf.prizes.length === s.alt.prizes) n = s.alt.n;
        R.drew += gfDraw(n).length; break;
      }
      case 'drawTo': {
        let n = s.n;
        if (s.alt && s.alt.owner && gfMons().every(m => gfKey(gfTop(m)).startsWith(s.alt.owner + "'s") || gfKey(gfTop(m)).startsWith(s.alt.owner))) n = s.alt.n;
        R.drew += gfDraw(Math.max(0, n - gf.hand.length)).length; break;
      }
      case 'drawPrizes': R.drew += gfDraw(gf.prizes.length).length; break;
      case 'discardHand': { const n = gf.hand.length; gf.hand.forEach(y => gf.discard.push(y)); gf.hand = []; gfLog('Discarded your hand (' + n + ')'); break; }
      case 'shuffleHand': { const n = gf.hand.length; gf.deck = gf.deck.concat(gf.hand); gf.hand = []; shuffle(gf.deck); gfLog('Shuffled your hand (' + n + ') into the deck'); break; }
      case 'bottomHand': { const n = gf.hand.length; shuffle(gf.hand); gf.deck = gf.deck.concat(gf.hand); gf.hand = []; gfLog('Put your hand (' + n + ') on the bottom of the deck'); break; }
      case 'coin': R.heads = Math.random() < 0.5; gfLog('Coin flip: ' + (R.heads ? 'heads' : 'tails')); break;
      case 'endTurn': R.endTurn = true; break;
      case 'discardStadium':
        if (gf.stadium) { R.wait = s; renderHand(); return; }
        break;
      case 'selfShuffle': {
        const m = gfMon(R.mon); if (!m) break;
        const cards = m.stack.concat(m.energy, m.tool ? [m.tool] : []);
        if (gf.active === m) { gf.active = null; if (gf.bench.length) gf.needActive = true; }
        else gf.bench = gf.bench.filter(z => z !== m);
        gf.deck = gf.deck.concat(cards); shuffle(gf.deck);
        gfLog('Shuffled ' + gfNm(cards[cards.length - 1 - m.energy.length - (m.tool ? 1 : 0)]) + ' and its cards into the deck');
        if (gf.needActive) { renderHand(); return; }
        break;
      }
      case 'benchSelf': {
        const x = gfTake(R.handCard); if (!x) break;
        if (gf.bench.length >= 5) { gf.hand.push(x); break; }
        const nm = gfNewMon(x); gf.bench.push(nm); gfLog('Put ' + gfNm(x) + ' onto the Bench'); gfBenchStadium(nm); break;
      }
      case 'koSelf': {
        const m = gfMon(R.mon); if (!m) break;
        gfKnockOut(m);
        if (gf.needActive) { renderHand(); return; }
        break;
      }
      case 'choose': R.wait = s; renderHand(); return;
      // 3.4: damage on your own Pokemon.
      case 'heal': {
        if (s.who === 'each') { gfMons().forEach(m => gfHeal(m, s.all ? m.dmg : s.n)); break; }
        if (['self', 'target', 'active'].includes(s.who)) {
          const one = s.who === 'self' ? gfMon(R.mon) : s.who === 'target' ? gfMon(R.target) : gf.active;
          if (one && gfHeal(one, gfHealN(s, one))) R.healed = one.id;
          break;
        }
        if (!gfHealPool(s).length) { gfLog('None of your Pokémon have damage to heal'); break; }
        R.wait = s; renderHand(); return;
      }
      case 'energyToHand': {
        const m = gfMon(R.healed); if (!m || !m.energy.length) break;
        const en = m.energy.splice(0); en.forEach(e => gf.hand.push(e));
        gfLog('Put ' + en.map(gfNm).join(', ') + ' from ' + gfMonNm(m) + ' into your hand'); break;
      }
      case 'selfDmg': {
        const m = s.who === 'target' ? gfMon(R.target) : gfMon(R.mon); if (!m) break;
        gfAddDmg(m, s.d, esc(R.name));
        if (gf.needActive) { renderHand(); return; }
        break;
      }
      case 'moveOff':
        if (!gfMons().some(m => m.dmg > 0)) { gfLog('None of your Pokémon have damage counters to move'); break; }
        R.wait = s; renderHand(); return;
      case 'discardEnergy': {
        const m = gfMon(R.mon); if (!m) break;
        const pool = m.energy.filter(e => !s.etype || gfEProv(e).includes(s.etype));
        if (!pool.length) { gfLog('No Energy to discard from ' + gfMonNm(m)); break; }
        if (s.may || (pool.length > s.n && new Set(pool.map(gfKey)).size > 1)) { s.left = Math.min(s.n, pool.length); R.wait = s; renderHand(); return; }
        pool.slice(0, s.n).forEach(e => { m.energy.splice(m.energy.indexOf(e), 1); gf.discard.push(e); });
        gfLog('Discarded ' + pool.slice(0, s.n).map(gfNm).join(', ') + ' from ' + gfMonNm(m)); break;
      }
      case 'switchSelf': {
        const m = gfMon(R.mon);
        if (!m || !gf.active || gf.active === m) break;
        R.wait = s; renderHand(); return;
      }
      case 'moveToSelf': {
        const m = gfMon(R.mon);
        if (!m || !gfMons().some(z => z !== m && z.energy.length)) break;
        R.wait = s; renderHand(); return;
      }
      case 'switch':
        if (!gf.active || !gf.bench.length) { gfLog('No Benched Pokémon to switch with'); break; }
        R.wait = s; renderHand(); return;
      case 'moveEnergy':
        if (gfMons().length < 2 || !gfMons().some(m => m.energy.some(e => gfEType(e)))) { gfLog('No Basic Energy in play to move'); break; }
        R.wait = s; renderHand(); return;
      case 'pickUp':
        if (!gfMons().some(m => !s.basic || gfIsBasic(gfTop(m)))) break;
        R.wait = s; renderHand(); return;
      case 'attach': {
        s.left = s.n; s.target = null;
        if (!gfAttachChoices(s).length) { gfLog('Nothing to attach'); break; }
        R.wait = s; renderHand(); return;
      }
      case 'cost': {
        const pool = gf.hand.filter(y => gfFit(y, s.F || { any: true }));
        if (pool.length < s.n) { gfLog('Not enough cards to discard'); R.i = R.steps.length; break; }
        R.wait = s; renderHand(); gfSheetCost(s); return;
      }
      case 'search': R.wait = s; renderHand(); gfSheetSearch(s); return;
      case 'look': R.wait = s; renderHand(); gfSheetLook(s); return;
      case 'recover': R.wait = s; renderHand(); gfSheetRecover(s); return;
      case 'topFromHand':
        if (!gf.hand.length) break;
        R.wait = s; renderHand(); gfSheetTop(s); return;
    }
  }
  gfFinish();
}
/** Reopen the sheet a step is waiting on (after it was closed with the X). */
function gfResume() {
  const R = gf.run; if (!R || !R.wait) return;
  const s = R.wait;
  if (s.t === 'cost') gfSheetCost(s); else if (s.t === 'search') gfSheetSearch(s); else if (s.t === 'look') gfSheetLook(s);
  else if (s.t === 'recover') gfSheetRecover(s); else if (s.t === 'topFromHand') gfSheetTop(s);
}

// Board choices shown in the helper panel.
function gfAttachChoices(s) {
  const src = s.from === 'hand' ? gf.hand : gf.discard;
  const en = src.filter(y => gfEType(y) && (!s.etype || gfEType(y) === s.etype));
  const names = [...new Map(en.map(y => [gfKey(y), y])).values()];
  let targets = s.to === 'self' ? gfMons().filter(m => m.id === gf.run.mon) : s.to === 'bench' ? gf.bench.slice() : gfMons();
  if (s.owner) targets = targets.filter(m => gfKey(gfTop(m)).startsWith(s.owner));
  if (s.mtype) targets = targets.filter(m => gfTypes(gfTop(m)).includes(s.mtype));
  if (s.mstage) targets = targets.filter(m => s.mstage === 'evolution' ? gfIsEvo(gfTop(m)) : s.mstage === 'basic' ? gfIsBasic(gfTop(m)) : gfTop(m).card.stage === s.mstage);
  if (s.target) targets = targets.filter(m => m.id === s.target);
  if (s.each) targets = targets.filter(m => !(s.done || []).includes(m.id));
  // Gardevoir ex: "You can't use this Ability on a Pokemon that would be Knocked Out."
  if (s.noKO) targets = targets.filter(m => !gfHp(m) || gfHp(m) - (m.dmg || 0) > s.noKO);
  const out = [];
  names.forEach(y => targets.forEach(m => out.push({ uid: y.uid, id: m.id, label: 'Attach ' + gfNm(y) + ' to ' + gfMonNm(m) })));
  return out;
}
function gfDoAttach(uid, id) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'attach') return;
  const src = s.from === 'hand' ? gf.hand : gf.discard;
  const i = src.findIndex(y => y.uid === uid); const m = gfMon(id);
  if (i < 0 || !m) return;
  const x = src.splice(i, 1)[0];
  m.energy.push(x); R.attached++; R.target = id;
  gfLog('Attached ' + gfNm(x) + (s.from === 'discard' ? ' from the discard pile' : '') + ' to ' + gfMonNm(m));
  s.left--;
  if (s.each) { s.done = (s.done || []).concat(id); } else s.target = id;
  if (s.left > 0 && gfAttachChoices(s).length) { renderHand(); return; }
  gfGo();
}
function gfDoSwitch(id) {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'switch') return;
  const i = gf.bench.findIndex(z => z.id === id); if (i < 0) return;
  const m = gf.bench[i]; gf.bench[i] = gf.active; gf.active = m;
  gfLog('Switched ' + gfMonNm(m) + ' into the Active Spot');
  gfGo();
}
function gfDoChoose(k) {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'choose') return;
  const o = R.wait.opts[k]; if (!o) return;
  if (!o.steps.length) gfLog('Chose an effect that does nothing in Goldfish');
  R.steps.splice(R.i, 0, ...o.steps);
  gfGo();
}
function gfDoSwitchSelf(yes) {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'switchSelf') return;
  const m = gfMon(R.mon);
  if (yes && m && gf.active && gf.active !== m) {
    const i = gf.bench.indexOf(m); gf.bench[i] = gf.active; gf.active = m; R.switched = true;
    gfLog('Switched ' + gfMonNm(m) + ' into the Active Spot');
  }
  gfGo();
}
function gfDoMoveToSelf(fromId, uid) {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'moveToSelf') return;
  const a = gfMon(fromId), b = gfMon(R.mon); if (!a || !b) return;
  const i = a.energy.findIndex(e => e.uid === uid); if (i < 0) return;
  const e = a.energy.splice(i, 1)[0]; b.energy.push(e);
  gfLog('Moved ' + gfNm(e) + ' from ' + gfMonNm(a) + ' to ' + gfMonNm(b));
  if (gfMons().some(z => z !== b && z.energy.length)) { renderHand(); return; }
  gfGo();
}
function gfDoMove(fromId, uid, toId) {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'moveEnergy') return;
  const a = gfMon(fromId), b = gfMon(toId); if (!a || !b) return;
  const i = a.energy.findIndex(e => e.uid === uid); if (i < 0) return;
  const e = a.energy.splice(i, 1)[0]; b.energy.push(e);
  gfLog('Moved ' + gfNm(e) + ' from ' + gfMonNm(a) + ' to ' + gfMonNm(b));
  gfGo();
}
function gfDoPickUp(id) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'pickUp') return;
  const m = gfMon(id); if (!m) return;
  if (gf.active === m) { gf.active = null; if (gf.bench.length) gf.needActive = true; } else gf.bench = gf.bench.filter(z => z !== m);
  const att = m.energy.concat(m.tool ? [m.tool] : []);
  m.stack.forEach(y => gf.hand.push(y));
  if (s.keep) att.forEach(y => gf.hand.push(y)); else att.forEach(y => gf.discard.push(y));
  gfLog('Put ' + gfMonNm(m) + ' into your hand' + (att.length ? s.keep ? ' with its cards' : ', its cards to the discard pile' : ''));
  if (gf.needActive) { renderHand(); return; }
  gfGo();
}
/* ---------- 3.4: attacks ---------- */
/** The Energy types a card attached to a Pokemon provides. 'any' stands for every type, and a Special
 * Energy whose text the app cannot read counts as 'any' too, so it never wrongly blocks an attack. */
function gfEProv(e) {
  const t = gfEType(e); if (t) return [t];
  const x = gfNorm(e.card.etext || gfInfo(e.card).rtext || '').toLowerCase();
  if (/provides every type of energy/.test(x)) return ['any'];
  const m = x.match(new RegExp('provides (\\d+ )?(' + GF_TY + ') energy'));
  if (m) return Array(m[1] ? +m[1] : 1).fill(m[2]);
  return ['any'];
}
/** Can the Energy on this Pokemon pay this attack's cost? */
function gfCostMet(energy, cost) {
  const pool = [].concat(...energy.map(gfEProv));
  const need = (cost || []).map(c => String(c).toLowerCase());
  for (const c of need.filter(c => c !== 'colorless')) {
    let i = pool.indexOf(c); if (i < 0) i = pool.indexOf('any');
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return pool.length >= need.filter(c => c === 'colorless').length;
}
function gfCap(w) { w = String(w || ''); return w ? w[0].toUpperCase() + w.slice(1) : w; }
/** What an attack does to your own side, read from its text. Damage to your opponent is only counted. */
const _gfAtk = new Map();
function gfAttackPlan(a) {
  if (a.text == null) return { steps: null, lock: null, noText: true };
  const k = a.name + '|' + a.text;
  if (_gfAtk.has(k)) return _gfAtk.get(k);
  let lock = null;
  const dmgOnly = /this attack does|this attack's damage|^for each heads|^if (?:heads|tails|either of them is heads|both of them are heads), this attack does|^flip (?:\d+|a) coins?(?: until you get tails)?(?:, and)?(?: this attack does .*)?$/;
  let sents = gfSentences(a.text).filter(x => {
    let m;
    if ((m = x.match(/^during your next turn, this pokemon can't (?:use (.+)|attack|use attacks)$/))) { lock = m[1] ? m[1].trim() : 'all'; return false; }
    return !(dmgOnly.test(x) && !/^flip a coin$/.test(x));
  });
  // A coin flip that only changes the damage changes nothing here.
  if (!sents.some(x => /^if (?:heads|tails)/.test(x))) sents = sents.filter(x => !/^flip a coin$/.test(x));
  const b = gfParseBody(sents);
  const P = { steps: b ? b.steps : null, opp: b ? b.opp : false, lock };
  _gfAtk.set(k, P);
  return P;
}
/** Why the Active Pokemon cannot use this attack now, or ''. */
function gfAttackWhy(m, a) {
  if (gf.turn === 0) return 'Attacks start on turn 1.';
  if (gf.turnOver) return 'Your turn has ended.';
  if (gf.active !== m) return 'Only your Active Pokémon can attack.';
  if (gf.turn === 1 && gf.first) return 'The player going first cannot attack on turn 1.';
  if (m.lock && m.lock.turn === gf.turn && (m.lock.what === 'all' || m.lock.what === String(a.name || '').toLowerCase())) return 'It cannot use this attack this turn, because of the attack it used last turn.';
  if (!gfCostMet(m.energy, a.cost)) return 'Not enough Energy attached.';
  return '';
}
function gfAttack(i) {
  const m = gf.active; if (!m || gfBusy()) return;
  const a = (gfTop(m).card.attacks || [])[i]; if (!a) return;
  const why = gfAttackWhy(m, a);
  if (why) { showToast(why); return; }
  const P = gfAttackPlan(a);
  gf.sel = null; gf.selMon = null;
  const pd = String(a.pd || '').trim();
  gfLog(gfMonNm(m) + ' used ' + esc(a.name) + (pd ? ', ' + esc(pd) + " damage to your opponent's Active Pokémon" : ''));
  if (P.lock) m.lock = { turn: gf.turn + 1, what: P.lock };
  gf.attacked = gf.turn;
  gfStart({ name: a.name, text: a.text || (P.noText ? 'No attack text read yet. Open this deck online to read it.' : ''), mon: m.id, steps: P.steps, opp: P.opp, endTurn: true, atk: true });
}

/** How much a heal step heals from this Pokemon (Tasty Rice Ball heals more for each copy in your discard pile). */
function gfHealN(s, m) { return s.all ? m.dmg || 0 : s.n + (s.per ? s.per.n * gf.discard.filter(y => gfKey(y) === s.per.name).length : 0); }
function gfHealPool(s) {
  const pool = s.who === 'bench' ? gf.bench : s.who === 'mega' ? gfMons().filter(m => gfIsMega(gfTop(m)) && gfIsEx(gfTop(m))) : gfMons();
  return pool.filter(m => m.dmg > 0);
}
function gfDoHeal(id) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'heal') return;
  const m = gfMon(id); if (!m) return;
  if (gfHeal(m, gfHealN(s, m))) R.healed = m.id;
  gfGo();
}
/** Munkidori's Adrena-Brain: the counters leave your Pokemon. There is no opponent here to take them. */
function gfDoMoveOff(id, n) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'moveOff') return;
  const m = gfMon(id); if (!m || !(m.dmg > 0)) return;
  const k = Math.min(n, s.n, Math.round(m.dmg / 10));
  m.dmg -= 10 * k;
  gfLog('Moved ' + gfCtr(10 * k) + ' from ' + gfMonNm(m) + " to your opponent's Pokémon");
  gfGo();
}
function gfDoDiscardEnergy(uid) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'discardEnergy') return;
  const m = gfMon(R.mon); if (!m) return;
  const i = m.energy.findIndex(e => e.uid === uid); if (i < 0) return;
  const e = m.energy.splice(i, 1)[0]; gf.discard.push(e);
  gfLog('Discarded ' + gfNm(e) + ' from ' + gfMonNm(m));
  s.left--;
  if (s.left > 0 && m.energy.some(z => !s.etype || gfEProv(z).includes(s.etype))) { renderHand(); return; }
  gfGo();
}
function gfDoStadiumDiscard() {
  const R = gf.run; if (!R || !R.wait || R.wait.t !== 'discardStadium' || !gf.stadium) return;
  gf.discard.push(gf.stadium); gfLog('Discarded ' + gfNm(gf.stadium)); gf.stadium = null;
  gfGo();
}
function gfSkip() { if (gf.run) gfGo(); }

/* ---------- Sheets: pick cards ---------- */
let gfPickS = null;
function gfCountLbl(n) { return n >= 99 ? 'any number' : 'up to ' + n; }
/** A grid of real cards to tap (hand, top of the deck, discard pile). */
function gfSheetGrid(o) {
  gfPickS = Object.assign({ pick: [] }, o);
  gfRenderGrid();
}
function gfRenderGrid() {
  const S = gfPickS; if (!S) return;
  const picks = S.pick.map(u => S.cards.find(y => y.uid === u)).filter(Boolean);
  const ok = picks.length >= S.min && picks.length <= S.max && (!S.valid || S.valid(picks));
  const cell = y => {
    const on = S.pick.includes(y.uid), fit = S.fit(y);
    const can = on || (fit && picks.length < S.max && (!S.valid || S.valid(picks.concat(y))));
    return `<div class="gf-gcell${fit ? '' : ' no'}">${gfCardHTML(y, on, can ? `onclick="gfGridTap(${y.uid})"` : 'disabled')}</div>`;
  };
  openSheet(`<div class="modal-title">${esc(S.title)}</div>
    <div class="modal-hint" style="margin:-0.4rem 0 0.75rem">${S.hint}</div>
    ${S.cards.length ? `<div class="hp-hand gf-grid">${S.cards.map(cell).join('')}</div>` : '<div class="nt-empty">No cards here.</div>'}
    <div class="modal-actions">
      ${S.cancel ? `<button class="btn btn-ghost" onclick="gfGridDone(false)">${esc(S.cancel)}</button>` : ''}
      <button class="btn btn-primary" onclick="gfGridDone(true)" ${ok ? '' : 'disabled'}>${esc(picks.length || !S.none ? S.ok : S.none)}</button>
    </div>`, true);
}
function gfGridTap(uid) {
  const S = gfPickS; if (!S) return;
  const i = S.pick.indexOf(uid);
  if (i >= 0) S.pick.splice(i, 1);
  else {
    const y = S.cards.find(c => c.uid === uid);
    const picks = S.pick.map(u => S.cards.find(c => c.uid === u));
    if (!y || !S.fit(y) || picks.length >= S.max || (S.valid && !S.valid(picks.concat(y)))) return;
    S.pick.push(uid);
  }
  gfRenderGrid();
}
function gfGridDone(ok) {
  const S = gfPickS; gfPickS = null;
  if (!S) return;
  closeSheet();
  if (!ok) { S.onCancel && S.onCancel(); return; }
  S.onDone(S.pick.map(u => S.cards.find(y => y.uid === u)).filter(Boolean));
}

function gfSheetCost(s) {
  const R = gf.run;
  gfSheetGrid({
    title: R.name + ': discard first', hint: `Pick ${s.n} card${s.n !== 1 ? 's' : ''} from your hand to discard.`,
    cards: gf.hand.slice(), fit: y => gfFit(y, s.F || { any: true }), min: s.n, max: s.n, ok: 'Discard', cancel: R.abil ? 'Cancel' : 'Take it back',
    onDone: picks => { picks.forEach(y => { const i = gf.hand.indexOf(y); if (i >= 0) gf.hand.splice(i, 1); gf.discard.push(y); }); gfLog('Discarded ' + picks.map(gfNm).join(', ')); gfGo(); },
    onCancel: () => gfUndoStart(),
  });
}
/** Cancel before the cost is paid: the card goes back to your hand as if never played. */
function gfUndoStart() {
  const R = gf.run; if (!R) return;
  if (R.card) { gf.hand.push(R.card); if (R.sup) gf.used.supporter = false; }
  if (R.mon) { const m = gfMon(R.mon); if (m && m.ab) delete m.ab[R.name]; }
  gf.log.pop();
  gf.run = null; renderHand();
}
function gfSheetLook(s) {
  const R = gf.run;
  const n = Math.min(s.n, gf.deck.length);
  const cards = s.from === 'bottom' ? gf.deck.slice(gf.deck.length - n) : gf.deck.slice(0, n);
  const max = Math.min(gfMaxOf(s.spec), s.dest === 'self' ? 99 : 99);
  const min = Math.min(s.min || 0, cards.filter(y => gfSpecFits(s.spec, y)).length);
  const where = s.dest === 'self' ? 'attach to ' + gfNm(gfTop(gfMon(R.mon) || { stack: [{ card: { name: '' } }] })) : 'put into your hand';
  gfSheetGrid({
    title: R.name, hint: `The ${s.from} ${n} card${n !== 1 ? 's' : ''} of your deck. Pick ${min && min === max ? min : gfCountLbl(max)} to ${where}. Cards that do not fit are dimmed.`,
    cards, fit: y => gfSpecFits(s.spec, y), min, max, valid: p => gfSlotsOk(s.spec, p), ok: s.dest === 'self' ? 'Attach' : 'Take', none: 'Take nothing',
    onDone: picks => {
      const rest = cards.filter(y => !picks.includes(y));
      gf.deck = gf.deck.filter(y => !cards.includes(y));
      if (s.dest === 'self') { const m = gfMon(R.mon); picks.forEach(y => m && m.energy.push(y)); if (picks.length) gfLog('Attached ' + picks.map(gfNm).join(', ') + ' to ' + gfMonNm(m)); R.attached += picks.length; }
      else { picks.forEach(y => gf.hand.push(y)); gfLog(picks.length ? 'Took ' + picks.map(gfNm).join(', ') + ' into hand' : 'Looked and took nothing'); }
      if (s.rest === 'discard') { rest.forEach(y => gf.discard.push(y)); if (rest.length) gfLog('Discarded ' + rest.map(gfNm).join(', ')); }
      else if (s.rest === 'bottom') gf.deck = gf.deck.concat(rest);
      else if (s.rest === 'shuffleBottom') { const r = rest.slice(); shuffle(r); gf.deck = gf.deck.concat(r); }
      else { gf.deck = gf.deck.concat(rest); shuffle(gf.deck); }
      gfGo();
    },
  });
}
function gfSheetRecover(s) {
  const R = gf.run;
  gfSheetGrid({
    title: R.name, hint: `Your discard pile. Pick ${gfCountLbl(gfMaxOf(s.spec))} to ${s.dest === 'deck' ? 'shuffle into your deck' : 'put into your hand'}. Cards that do not fit are dimmed.`,
    cards: gf.discard.slice(), fit: y => gfSpecFits(s.spec, y), min: 0, max: gfMaxOf(s.spec), valid: p => gfSlotsOk(s.spec, p), ok: 'Take', none: 'Take nothing',
    onDone: picks => {
      gf.discard = gf.discard.filter(y => !picks.includes(y));
      if (s.dest === 'deck') { gf.deck = gf.deck.concat(picks); shuffle(gf.deck); if (picks.length) gfLog('Shuffled ' + picks.map(gfNm).join(', ') + ' into the deck'); }
      else { picks.forEach(y => gf.hand.push(y)); if (picks.length) gfLog('Put ' + picks.map(gfNm).join(', ') + ' into hand'); }
      gfGo();
    },
  });
}
function gfSheetTop(s) {
  const R = gf.run;
  gfSheetGrid({
    title: R.name, hint: 'Pick a card from your hand to put on top of your deck.',
    cards: gf.hand.slice(), fit: () => true, min: 0, max: 1, ok: 'Put on top', none: 'Skip',
    onDone: picks => { picks.forEach(y => { gf.hand.splice(gf.hand.indexOf(y), 1); gf.deck.unshift(y); gfLog('Put ' + gfNm(y) + ' on top of the deck'); }); gfGo(); },
  });
}

// Deck search: the deck as it stands, grouped by name. Manual search (s.manual) has filter chips.
let gfSearch = null;
function gfOpenSearch() { gfSearch = { manual: true, filter: 'all', pick: {}, max: 60, dest: 'hand' }; gfRenderSearch(); }
function gfSheetSearch(s) { gfSearch = { step: s, pick: {} }; gfRenderSearch(); }
function gfManFit(x, f) {
  const cat = cardCategory(x.card);
  return f === 'all' || (f === 'basic' ? gfIsBasic(x) : cat === f);
}
function gfRenderSearch() {
  const S = gfSearch, st = S.step;
  const fits = x => st ? gfSpecFits(st.spec, x) : gfManFit(x, S.filter);
  const byName = new Map();
  gf.deck.forEach(x => { const k = gfKey(x); if (!byName.has(k)) byName.set(k, { x, n: 0 }); byName.get(k).n++; });
  const rows = [...byName.entries()].filter(([, v]) => fits(v.x)).sort((a, b) => lbl23(a[1].x.card).localeCompare(lbl23(b[1].x.card)));
  S.keys = rows.map(r => r[0]);
  S.canAdd = null;
  const picks = [];
  Object.keys(S.pick).forEach(k => { for (let i = 0; i < S.pick[k]; i++) picks.push(byName.get(k).x); });
  const max = st ? Math.min(gfMaxOf(st.spec), st.dest === 'bench' ? 5 - gf.bench.length : 99) : S.max;
  const ok = !st || gfSlotsOk(st.spec, picks);
  const canAdd = x => picks.length < max && (!st || gfSlotsOk(st.spec, picks.concat(x)));
  const benchRoom = 5 - gf.bench.length;
  S.canAdd = rows.map(([k, v]) => (S.pick[k] || 0) < v.n && canAdd(v.x));
  const filt = ['all', 'pokemon', 'basic', 'trainer', 'energy'];
  const fl = { all: 'All', pokemon: 'Pokémon', basic: 'Basic', trainer: 'Trainer', energy: 'Energy' };
  const dest = st ? st.dest : 'hand';
  const R = gf.run;
  const hint = st ? `${gf.deck.length} cards in the deck. Pick ${gfCountLbl(max)} that fit${dest === 'bench' ? ', onto your Bench' : dest === 'top' ? ', to put on top of your deck' : ''}. The deck is shuffled after.`
    : `${gf.deck.length} cards in the deck. Pick any, then choose where they go. The deck is shuffled after.`;
  openSheet(`<div class="modal-title">${st ? esc(R.name) : 'Search your deck'}</div>
    <div class="modal-hint" style="margin:-0.4rem 0 0.75rem">${hint}</div>
    ${st ? '' : `<div class="seg gf-filt">${filt.map(f => `<div class="mode-opt${S.filter === f ? ' active' : ''}" onclick="gfSearch.filter='${f}';gfRenderSearch()">${fl[f]}</div>`).join('')}</div>`}
    <div class="gf-srch">${rows.length ? rows.map(([k, v], ri) => {
      const p = S.pick[k] || 0;
      return `<div class="gf-srow${p ? ' on' : ''}"><span class="gf-sn">${esc(lbl23(v.x.card))}</span><span class="gf-sc">${v.n} in deck</span>
        <span class="stp"><button class="stp-b" onclick="gfPick(${ri},-1)" ${p ? '' : 'disabled'} aria-label="Fewer">−</button><b>${p}</b><button class="stp-b" onclick="gfPick(${ri},1)" ${p < v.n && canAdd(v.x) ? '' : 'disabled'} aria-label="More">+</button></span></div>`;
    }).join('') : '<div class="nt-empty">Nothing in the deck fits.</div>'}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="gfSearchDone(null)">${picks.length ? 'Cancel' : 'Find nothing'}</button>
      ${st ? `<button class="btn btn-primary" onclick="gfSearchDone('${dest}')" ${picks.length && ok ? '' : 'disabled'}>${dest === 'bench' ? 'To Bench' : dest === 'top' ? 'On top' : 'To hand'}</button>`
        : `<button class="btn" onclick="gfSearchDone('bench')" ${picks.length && picks.every(gfIsBasic) && picks.length <= benchRoom ? '' : 'disabled'}>To Bench</button>
      <button class="btn btn-primary" onclick="gfSearchDone('hand')" ${picks.length ? '' : 'disabled'}>To hand</button>`}
    </div>`);
}
function gfPick(ri, d) {
  const S = gfSearch; if (!S) return;
  const k = S.keys[ri]; if (k == null) return;
  if (d > 0 && S.canAdd && !S.canAdd[ri]) return;
  S.pick[k] = Math.max(0, (S.pick[k] || 0) + d);
  gfRenderSearch();
}
function gfSearchDone(dest) {
  const S = gfSearch; gfSearch = null;
  closeSheet();
  if (!S) return;
  const got = [];
  if (dest) Object.keys(S.pick).forEach(k => {
    for (let n = 0; n < S.pick[k]; n++) {
      const i = gf.deck.findIndex(x => gfKey(x) === k);
      if (i >= 0) got.push(gf.deck.splice(i, 1)[0]);
    }
  });
  shuffle(gf.deck);
  const st = S.step;
  if (!got.length) gfLog('Searched and took nothing');
  else if (dest === 'bench') { const ms = got.map(x => { const m = gfNewMon(x); if (!gf.active) gf.active = m; else gf.bench.push(m); return m; }); gfLog('Searched ' + got.map(gfNm).join(', ') + ' onto the Bench'); ms.forEach(gfBenchStadium); }
  else if (dest === 'top') { got.reverse().forEach(x => gf.deck.unshift(x)); gfLog('Put ' + got.map(gfNm).join(', ') + ' on top of the deck'); }
  else { got.forEach(x => gf.hand.push(x)); gfLog('Searched ' + got.map(gfNm).join(', ') + ' into hand'); }
  if (st && st.split && got.length > 1) {
    // Crispin: 1 to hand, attach the other to 1 of your Pokémon.
    gf.run.splitUids = got.map(x => x.uid);
    gf.run.steps.splice(gf.run.i, 0, { t: 'attachOne', uids: got.map(x => x.uid) });
  }
  if (st && gf.run) { gfGo2(); return; }
  renderHand();
}
// attachOne is the second half of a "put 1 of them into your hand, attach the other" search.
function gfGo2() {
  const R = gf.run, s = R && R.steps[R.i];
  if (s && s.t === 'attachOne') { R.i++; R.wait = s; renderHand(); return; }
  gfGo();
}
function gfDoAttachOne(uid, id) {
  const R = gf.run, s = R && R.wait; if (!s || s.t !== 'attachOne') return;
  const x = gfTake(uid); const m = gfMon(id); if (!x || !m) return;
  m.energy.push(x); R.attached++;
  gfLog('Attached ' + gfNm(x) + ' to ' + gfMonNm(m));
  gfGo();
}

function gfTool2(act) {
  // v67: drawing, searching and shuffling by hand only stand in for card text the app cannot follow.
  if (!gfManual()) return;
  gfClearOffer();
  if (act === 'draw') gfDraw(1);
  if (act === 'search') { gfOpenSearch(); return; }
  if (act === 'shuffle') { const n = gf.hand.length; gf.deck = gf.deck.concat(gf.hand); gf.hand = []; shuffle(gf.deck); gfLog('Shuffled ' + n + ' card' + (n !== 1 ? 's' : '') + ' from hand into the deck'); }
  renderHand();
}

function gfLineReady(l) {
  return gfMons().some(m => l.top >= 0 ? gfTop(m).g === l.top : m.stack.some(x => x.g === l.basic));
}
function gfEndTurn() {
  const deck = findDeck(gf.deckId);
  if (gf.run) { if (gf.run.wait && gf.run.wait.t === 'manual') gfFinish(); else return; }
  if (gf.needActive) { showToast('Pick a new Active Pokémon first.'); return; }
  gfClearOffer();
  if (gf.turn === 0) {
    if (!gf.active) { showToast('Put a Basic in the Active Spot first.'); return; }
    gf.turn = 1;
    gfLog('Turn 1' + (gf.first ? ', going first' : ', going second'));
    gfDraw(1);
    renderHand();
    return;
  }
  const opts = handLineOptions(deck, gf.groups);
  opts.forEach((l, i) => { if (gf.ready[i] == null && gfLineReady(l)) gf.ready[i] = gf.turn; });
  if (gf.turn >= GF_TURNS) {
    gf.done = true; gf.sel = null; gf.selMon = null;
    drillStat(deck, 'gold', opts.length && gf.ready[0] != null && gf.ready[0] <= lineFirstTurn(opts[0], gf.groups) ? 1 : 0, 1);
    renderHand();
    return;
  }
  gf.turn++;
  gf.used = { energy: false, supporter: false, stadium: false, retreat: false };
  gf.sel = null; gf.selMon = null; gf.turnOver = false;
  gfLog('Turn ' + gf.turn);
  gfDraw(1);
  renderHand();
}

function gfCardHTML(x, on, extra) {
  const c = x.card;
  const img = c.imageUrl
    ? `<img src="${esc(c.imageUrl)}" alt="${gfNm(x)}" data-fallbacks="${esc(JSON.stringify(c.fallbackUrls || []))}" data-fallback-idx="0" onerror="reviewImgError(this)">`
    : `<div class="review-placeholder"><i class=ph-card></i></div>`;
  return `<button class="gf-card${on ? ' on' : ''}" ${extra || ''}><div class="review-card-img">${img}</div><div class="review-card-name">${gfNm(x)}</div></button>`;
}
function gfMonHTML(m, isActive) {
  const top = gfTop(m), on = gf.selMon === m.id, c = top.card;
  const st = c.stage === 'stage2' ? 'Stage 2' : c.stage === 'stage1' ? 'Stage 1' : 'Basic';
  const img = c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="" data-fallbacks="${esc(JSON.stringify(c.fallbackUrls || []))}" data-fallback-idx="0" onerror="reviewImgError(this)">` : '';
  const en = m.energy.map(e => { const t = gfEType(e); return t ? t[0].toUpperCase() + t.slice(1) : lbl23(e.card); });
  const when = m.turnIn === 0 ? 'In play from the start' : m.turnIn === gf.turn ? 'Came in this turn' : 'Came in turn ' + m.turnIn;
  return `<button class="mt-mon gf-mon${isActive ? ' act' : ''}${on ? ' on' : ''}" onclick="gfSelectMon(${m.id})">
    <span class="mt-art">${img}${m.dmg > 0 ? `<span class="mt-dmg">${m.dmg}</span>` : ''}</span>
    <span class="mt-tx"><span class="mt-nm">${gfMonNm(m)}</span>
      <span class="mt-sub">${st}${c.hp ? `, ${c.hp} HP` : ''}</span>
      ${m.dmg > 0 && gfHp(m) ? `<span class="mt-hp hurt"><b>${Math.max(0, gfHp(m) - m.dmg)}</b> of ${gfHp(m)} HP</span>` : ''}
      ${en.length ? `<span class="mt-ens">${mtEnergyHTML(en)}</span>` : '<span class="mt-sub">No Energy</span>'}
      ${m.tool ? `<span class="mt-tool">${esc(lbl23(m.tool.card))}</span>` : ''}
      <span class="mt-when">${when}</span>
    </span></button>`;
}
/* 2.8: the playmat look Goldfish and the daily puzzle share. Energy reads as a colored dot and its word. */
const MT_TYPE = { grass: 'grass', fire: 'fire', water: 'water', lightning: 'electric', psychic: 'psychic', fighting: 'fighting', darkness: 'dark', metal: 'metal', dragon: 'dragon', fairy: 'fairy', colorless: 'text-3' };
function mtEnergyHTML(words) {
  const g = new Map(); words.forEach(w => g.set(w, (g.get(w) || 0) + 1));
  return [...g].map(([w, n]) => { const t = MT_TYPE[String(w).toLowerCase()];
    return `<span class="mt-en${t ? '' : ' sp'}"${t ? ` style="--t:var(--${t})"` : ''}><i></i>${esc(w)}${n > 1 ? ` <b>×${n}</b>` : ''}</span>`; }).join('');
}
function mtPile(label, n) { return `<span class="mt-pile"><b>${n}</b><span>${label}</span></span>`; }
function mtPrizes(n) { return `<span class="mt-prz" aria-hidden="true">${'<i></i>'.repeat(Math.max(0, Math.min(6, n)))}</span>`; }
/** 3.4: an attack's line: name, printed damage, cost and text. */
function gfAtkLine(a) {
  const cost = (a.cost || []).length ? `<span class="mt-ens">${mtEnergyHTML(a.cost.map(gfCap))}</span>` : '';
  return `<div class="gf-txt"><b>${esc(a.name)}${a.pd ? ' ' + esc(a.pd) : ''}.</b> ${cost}${a.text ? ' ' + esc(gfShow(a.text)) : ''}</div>`;
}
/** The Active Pokemon's attacks, each with its button, or only their text for a Benched Pokemon. */
function gfAtkHTML(m) {
  const atks = gfTop(m).card.attacks || [];
  if (!atks.length) return '';
  const live = gf.active === m && gf.turn > 0 && !gf.turnOver;
  return atks.map((a, i) => {
    const why = live ? gfAttackWhy(m, a) : '', P = gfAttackPlan(a);
    return (live ? `<button class="btn btn-sm btn-primary" onclick="gfAttack(${i})" ${why ? 'disabled' : ''}>Attack with ${esc(a.name)}</button>${why ? `<div class="nt-muted gf-why">${why}</div>` : ''}` : '')
      + gfAtkLine(a) + (P.noText ? '<div class="nt-muted gf-why">No attack text read yet. Open this deck online to read it.</div>'
        : live && !P.steps ? '<div class="nt-muted gf-why">The app cannot follow all of this attack yet, so you finish it by hand.</div>' : '');
  }).join('');
}
/** Damage counter buttons, for card text the app cannot follow. */
function gfDmgBtns(m) {
  if (gf.turn === 0) return '';
  return `<div class="gf-acts gf-dmgb"><span class="nt-muted">${m.dmg > 0 ? gfCtr(m.dmg) + ' on it' : 'No damage on it'}</span>
    <button class="btn btn-sm" onclick="gfManDmg(${m.id},1)">Add a damage counter</button>
    <button class="btn btn-sm" onclick="gfManDmg(${m.id},-1)" ${m.dmg > 0 ? '' : 'disabled'}>Remove a damage counter</button></div>`;
}
/** The card's own text, plain, under its buttons. */
function gfShow(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
function gfTextHTML(t) { return t ? `<div class="gf-txt">${esc(gfShow(t))}</div>` : ''; }

/** The panel for a card or Ability being played: its text and the choice it waits on. */
function gfRunHTML() {
  const R = gf.run; if (!R) return '';
  const s = R.wait;
  let body = '';
  if (s && s.t === 'manual') {
    body = `<div class="nt-muted gf-why">The app cannot follow this card's text yet. Do it with Draw, Search and Discard below, then tap Done.</div>
      <div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="gfFinish()">Done</button></div>`;
  } else if (s && s.t === 'attach') {
    const ch = gfAttachChoices(s);
    body = `<div class="gf-acts">${ch.slice(0, 12).map(c => `<button class="btn btn-sm btn-primary" onclick="gfDoAttach(${c.uid},${c.id})">${c.label}</button>`).join('')}
      <button class="btn btn-sm" onclick="gfSkip()">${s.left < s.n ? 'Done' : 'Skip'}</button></div>`;
  } else if (s && s.t === 'attachOne') {
    const en = gf.hand.filter(y => s.uids.includes(y.uid));
    body = `<div class="nt-muted gf-why">Both went to your hand. Attach one of them to a Pokémon.</div><div class="gf-acts">${en.map(y => gfMons().map(m => `<button class="btn btn-sm btn-primary" onclick="gfDoAttachOne(${y.uid},${m.id})">Attach ${gfNm(y)} to ${gfMonPick(m)}</button>`).join('')).join('')}</div>`;
  } else if (s && s.t === 'choose') {
    body = `<div class="gf-acts">${s.opts.map((o, k) => `<button class="btn btn-sm${o.steps.length ? ' btn-primary' : ''}" onclick="gfDoChoose(${k})">${esc(o.label[0].toUpperCase() + o.label.slice(1))}</button>`).join('')}</div>`;
  } else if (s && s.t === 'switchSelf') {
    body = `<div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="gfDoSwitchSelf(true)">Switch it into the Active Spot</button><button class="btn btn-sm" onclick="gfDoSwitchSelf(false)">Skip</button></div>`;
  } else if (s && s.t === 'moveToSelf') {
    const me = gfMon(R.mon), opts = [];
    gfMons().filter(a => a !== me).forEach(a => { const seen = new Set(); a.energy.forEach(e => { if (seen.has(gfKey(e))) return; seen.add(gfKey(e));
      opts.push(`<button class="btn btn-sm btn-primary" onclick="gfDoMoveToSelf(${a.id},${e.uid})">Move ${gfNm(e)} from ${gfMonNm(a)}</button>`); }); });
    body = `<div class="gf-acts">${opts.slice(0, 12).join('')}<button class="btn btn-sm" onclick="gfSkip()">Done</button></div>`;
  } else if (s && s.t === 'switch') {
    body = `<div class="gf-acts">${gf.bench.map(m => `<button class="btn btn-sm btn-primary" onclick="gfDoSwitch(${m.id})">Switch in ${gfMonPick(m)}</button>`).join('')}</div>`;
  } else if (s && s.t === 'moveEnergy') {
    const opts = [];
    gfMons().forEach(a => { const seen = new Set(); a.energy.filter(e => gfEType(e)).forEach(e => { if (seen.has(gfKey(e))) return; seen.add(gfKey(e));
      gfMons().filter(b => b !== a).forEach(b => opts.push(`<button class="btn btn-sm btn-primary" onclick="gfDoMove(${a.id},${e.uid},${b.id})">Move ${gfNm(e)} from ${gfMonNm(a)} to ${gfMonNm(b)}</button>`)); }); });
    body = `<div class="gf-acts">${opts.slice(0, 12).join('')}<button class="btn btn-sm" onclick="gfSkip()">Skip</button></div>`;
  } else if (s && s.t === 'pickUp') {
    body = `<div class="gf-acts">${gfMons().filter(m => !s.basic || gfIsBasic(gfTop(m))).map(m => `<button class="btn btn-sm btn-primary" onclick="gfDoPickUp(${m.id})">Pick up ${gfMonPick(m)}</button>`).join('')}</div>`;
  } else if (s && s.t === 'heal') {
    body = `<div class="gf-acts">${gfHealPool(s).map(m => `<button class="btn btn-sm btn-primary" onclick="gfDoHeal(${m.id})">Heal ${gfMonPick(m)}</button>`).join('')}</div>`;
  } else if (s && s.t === 'moveOff') {
    const opts = [];
    gfMons().filter(m => m.dmg > 0).forEach(m => { for (let k = Math.min(s.n, Math.round(m.dmg / 10)); k >= 1; k--) opts.push(`<button class="btn btn-sm btn-primary" onclick="gfDoMoveOff(${m.id},${k})">Move ${gfCtr(10 * k)} from ${gfMonPick(m)}</button>`); });
    body = `<div class="gf-acts">${opts.slice(0, 12).join('')}<button class="btn btn-sm" onclick="gfSkip()">Skip</button></div>`;
  } else if (s && s.t === 'discardEnergy') {
    const me = gfMon(R.mon), seen = new Set();
    const opts = (me ? me.energy : []).filter(e => (!s.etype || gfEProv(e).includes(s.etype)) && !seen.has(gfKey(e)) && seen.add(gfKey(e)))
      .map(e => `<button class="btn btn-sm btn-primary" onclick="gfDoDiscardEnergy(${e.uid})">Discard ${gfNm(e)}</button>`);
    body = `<div class="gf-acts">${opts.join('')}${s.may ? `<button class="btn btn-sm" onclick="gfSkip()">${s.left < Math.min(s.n, 99) ? 'Done' : 'Skip'}</button>` : ''}</div>`;
  } else if (s && s.t === 'discardStadium') {
    body = `<div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="gfDoStadiumDiscard()">Discard ${gfNm(gf.stadium)}</button><button class="btn btn-sm" onclick="gfSkip()">Skip</button></div>`;
  } else if (s) {
    body = `<div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="gfResume()">Continue</button><button class="btn btn-sm" onclick="gfStop()">Stop here</button></div>`;
  }
  return `<div class="gf-helper"><div class="gf-ht">${esc(R.name)}</div>${gfTextHTML(R.text)}${body}</div>`;
}

function renderGoldfish() {
  const el = document.getElementById('hand-body');
  const deck = findDeck(state.activeDeckId);
  if (!el || !deck) return;
  const total = deck.cards.reduce((a, c) => a + c.count, 0);
  if (total < 20) { el.innerHTML = `<div class="hp-wrap">${handModeBar()}<div class="g-empty">This list is too short to goldfish.</div></div>`; return; }
  if (!gf || gf.deckId !== deck.id) { gfDeal(gf ? gf.first : true); return; }
  if (!gf.anyBasic) { el.innerHTML = `<div class="hp-wrap">${handModeBar()}<div class="g-item warn"><div class="gt">No card data yet</div><p>Goldfish needs each card's stage to know your Basics. Open this deck while online, or open Edit deck and save it, to read them.</p></div></div>`; return; }
  const t = gf.turn;
  let h = `<div class="hp-wrap">${handModeBar()}<div class="g-sec">
    <div class="g-sec-t">${gf.done ? 'How your ' + GF_TURNS + ' turns went' : t === 0 ? 'Set up' : 'Turn ' + t + ' of ' + GF_TURNS}</div>
    <div class="g-sec-i">${gf.done ? 'Your board after turn ' + GF_TURNS + ', what came together and when, and how that compares with the odds from this opening hand.'
      : t === 0 ? 'Put a Basic in the Active Spot and any others on your Bench, then start turn 1. You draw at the start of every turn.'
      : 'Tap a card in your hand to play it. Tap a Pokémon in play to retreat, use its Ability or attack. An attack ends your turn.'}</div>
    <div class="hp-meta">
      <span class="hp-pill">${gf.first ? 'Going first' : 'Going second'}</span>
      ${gf.mulls ? `<span class="hp-pill warn">${gf.mulls} mulligan${gf.mulls !== 1 ? 's' : ''}</span>` : ''}
      ${t > 0 && !gf.done ? `<span class="hp-pill${gf.used.energy ? ' done' : ''}">Energy ${gf.used.energy ? 'attached' : 'not yet'}</span><span class="hp-pill${gf.used.supporter ? ' done' : ''}">Supporter ${gf.used.supporter ? 'played' : gf.first && t === 1 ? 'not allowed' : 'not yet'}</span>` : ''}
      ${gf.turnOver && !gf.done ? '<span class="hp-pill warn">Turn over</span>' : ''}
    </div>`;

  // Board: a playmat with the Active Spot, the piles beside it and the Bench under it.
  const open = Math.max(0, 5 - gf.bench.length);
  h += `<div class="mt-mat gf-mat">
    <div class="mt-main">
      <div class="mt-zone mt-actz"><div class="mt-lbl">Active</div>
        ${gf.active ? gfMonHTML(gf.active, true) : `<div class="mt-empty">${gf.needActive ? 'Tap a Benched Pokémon to move it here' : 'Empty'}</div>`}</div>
      <div class="mt-piles">${mtPile('Prizes', gf.prizes.length)}${mtPile('Deck', gf.deck.length)}${mtPile('Discard', gf.discard.length)}</div>
    </div>
    <div class="mt-zone"><div class="mt-lbl">Bench <span>${gf.bench.length} of 5</span></div>
      <div class="mt-bench">${gf.bench.map(m => gfMonHTML(m, false)).join('')}${open ? `<div class="mt-open">${open} open</div>` : ''}</div></div>
    ${gf.stadium ? `<div class="mt-mid"><span class="mt-lbl">Stadium</span><button class="pz-chip mt-stad${gf.selMon === 'stad' ? ' on' : ''}" onclick="if(!gfBusy()){gfClearOffer();gf.selMon=gf.selMon==='stad'?null:'stad';gf.sel=null;renderHand()}">${gfNm(gf.stadium)}</button></div>` : ''}
  </div>`;
  if (gf.needActive) h += `<div class="gf-helper"><div class="gf-ht">Pick a new Active Pokémon</div><div class="gf-acts">${gf.bench.map(m => `<button class="btn btn-sm btn-primary" onclick="gfPromote(${m.id})">${gfMonPick(m)}</button>`).join('')}</div></div>`;

  if (!gf.done && gfManual()) {
    const selM = gfMons().find(m => m.id === gf.selMon);
    if (selM) h += `<div class="gf-acts gf-hand-acts"><div class="gf-ht">${gfMonNm(selM)}</div>${gfDmgBtns(selM)}</div>`;
  }
  if (!gf.done && !gfBusy()) {
    if (gf.selMon === 'stad' && gf.stadium) {
      const P = gfTrainerPlay(gf.stadium) || {};
      const why = gf.turn === 0 ? 'Starts on turn 1.' : gf.turnOver ? 'Your turn has ended.' : gf.stadUsed === t ? 'Already used this turn.' : '';
      h += `<div class="gf-acts gf-hand-acts"><div class="gf-ht">${gfNm(gf.stadium)}</div>${P.once ? `<button class="btn btn-sm btn-primary" onclick="gfUseStadium()" ${why ? 'disabled' : ''}>Use ${gfNm(gf.stadium)}</button>` : ''}
        ${why ? `<div class="nt-muted gf-why">${why}</div>` : ''}${gfTextHTML(gfInfo(gf.stadium.card).rtext)}</div>`;
    }
    const selM = gfMons().find(m => m.id === gf.selMon);
    if (selM) {
      const As = gfAbilities(gfTop(selM));
      const isBench = gf.bench.includes(selM);
      const btns = As.map((A, i) => {
        if (A.when === 'passive') return '';
        const why = gfAbilWhy(selM, A);
        return `<button class="btn btn-sm btn-primary" onclick="gfAbility(${selM.id},${i})" ${why ? 'disabled' : ''}>Use ${esc(A.name)}</button>${why ? `<div class="nt-muted gf-why">${why}</div>` : ''}`;
      }).join('');
      const txt = As.map(A => `<div class="gf-txt"><b>${esc(A.name)}.</b> ${esc(gfShow(A.text))}${A.when !== 'passive' && !A.steps ? ' The app cannot play this one yet, so use the deck buttons below.' : ''}</div>`).join('');
      h += `<div class="gf-acts gf-hand-acts"><div class="gf-ht">${gfMonNm(selM)}</div>${isBench && gf.active && !gf.turnOver ? (() => { const rw = gfRetreatWhy(), rc = gfRetreatCost(gf.active);
          return `<button class="btn btn-sm" onclick="gfSwitch(${selM.id})" ${rw ? 'disabled' : ''}>Retreat ${gfMonNm(gf.active)} for this one${rc ? ` (discard ${rc} Energy)` : rc === 0 ? ' (free)' : ''}</button>${rw ? `<div class="nt-muted gf-why">${rw}</div>` : ''}`; })() : ''}
        ${btns}${!As.length && !isBench && !(gfTop(selM).card.attacks || []).length ? '<span class="nt-muted">No Ability to use.</span>' : ''}${txt}${gfAtkHTML(selM)}${gfDmgBtns(selM)}</div>`;
    }
  }

  if (gf.offer && !gf.run && !gf.done) {
    const m = gfMon(gf.offer.id), A = m && gfAbilities(gfTop(m))[gf.offer.i];
    const why = A ? gfAbilWhy(m, A) : 'x';
    if (A && !why) h += `<div class="gf-helper"><div class="gf-ht">${esc(A.name)}</div>${gfTextHTML(A.text)}<div class="gf-acts"><button class="btn btn-sm btn-primary" onclick="gfAbility(${m.id},${gf.offer.i})">Use ${esc(A.name)}</button><button class="btn btn-sm" onclick="gfClearOffer();renderHand()">Skip</button></div></div>`;
    else gfClearOffer();
  }
  if (gf.run && !gf.done) h += gfRunHTML();

  // Hand
  h += `<div class="hp-lbl mt-handl">Hand (${gf.hand.length})</div><div class="hp-hand gf-hand">${gf.hand.map(x => gfCardHTML(x, gf.sel === x.uid, gf.done || (gfBusy() && !gfManual()) ? 'disabled' : `onclick="gfSelect(${x.uid})"`)).join('') || '<div class="nt-muted">Empty hand.</div>'}</div>`;
  if (!gf.done) {
    const manual = gf.run && gf.run.wait && gf.run.wait.t === 'manual';
    const lock = gfBusy() && !manual;
    h += `<div class="gf-tools">${t > 0 && manual ? `<button class="btn btn-sm" onclick="gfTool2('draw')" ${lock ? 'disabled' : ''}>Draw 1</button>
        <button class="btn btn-sm" onclick="gfTool2('search')" ${lock ? 'disabled' : ''}>${ic23('search')}Search deck</button>
        <button class="btn btn-sm" onclick="gfTool2('shuffle')" ${lock ? 'disabled' : ''}>Shuffle hand in</button>` : ''}</div>
      <div class="hp-actions"><button class="btn" onclick="gfDeal(${!gf.first})">New deal ${gf.first ? 'going second' : 'going first'}</button>
      <button class="btn btn-primary" id="gf-next" onclick="gfEndTurn()" ${lock || gf.needActive ? 'disabled' : ''}>${t === 0 ? 'Start turn 1' : t >= GF_TURNS ? 'Finish' : 'End turn ' + t}</button></div>`;
  } else {
    h += gfSummary(deck);
  }

  if (gf.log.length) {
    h += `<div class="g-sec"><div class="g-sec-t" style="font-size:var(--fs-md)">${gf.done ? 'Every move' : 'This game so far'}</div><ol class="gf-log">${
      (gf.done ? gf.log : gf.log.slice(-8)).map(l => `<li><span>${l.t ? 'T' + l.t : 'Setup'}</span>${l.s}</li>`).join('')}</ol></div>`;
  }
  h += `<div class="g-wip"><b>Goldfish rules.</b> You draw every turn, one Energy and one Supporter a turn, no Supporter and no attack on turn 1 going first, and no evolving on your first turn or onto a Pokémon that came in this turn. Abilities, attacks, Items, Supporters and Stadiums do what their card text says, with each card's own limits, and an attack ends your turn. Damage stays on your Pokémon, and a Pokémon is Knocked Out when its damage reaches its HP. There is no opponent, so effects on your opponent do nothing here. When the app cannot follow a card yet, it shows the text and you use Draw, Search, Discard and the damage counter buttons.</div>`;
  h += `</div></div>`;
  el.innerHTML = h;
}

/* ═══════════ v67: RdyRules, the play rules Goldfish runs on, for any board ═══════════
 * Goldfish and the Hand tab use these rules on the live board (gf). Another mode (Puzzle mode) can run
 * them on a board of its own in the same shape, without the Goldfish screen.
 *
 * Board: { turn, first, hand: [x], deck: [x], prizes: [x], discard: [x], active: mon | null, bench: [mon],
 *          stadium: x | null, used: { energy, supporter, stadium, retreat }, turnOver, monId, log: [] }
 *   x   = { uid, card, g }   a card, with card as the deck stores it (name, supertype, stage, attacks, atext, rtext...)
 *   mon = { id, stack: [x], energy: [x], tool: x | null, turnIn, evoTurn, ab: {} }   stack[last] is the top card
 * RdyRules.newBoard(cards, opts)      a board from a list of deck cards, unshuffled unless opts.shuffle
 * RdyRules.on(board, fn)              run fn with board as the live board; every call below uses this
 * RdyRules.moves(board, uid)          what a hand card can do now: [{ label, fn, off, why }], why when off
 * RdyRules.canPlay(board, uid)        { ok, why } for the card's first real move (play, attach, evolve, bench)
 * RdyRules.trainerPlan(card)          the parsed conditions and steps of a Trainer (need, steps, opp, noFirst...)
 * RdyRules.needWhy(need)              why a "you can play this only if" condition is not met, or ''
 * RdyRules.targetWhy(board, uid)      why a Trainer has nothing to act on (Jumbo Ice Cream with no 3 Energy), or ''
 * RdyRules.retreatCost(board, monId)  the cost now, after Tools, Stadiums and Abilities
 * RdyRules.retreatWhy(board)          why the Active cannot retreat now, or ''
 * RdyRules.canEvolveOnto(board, monId) whether something in hand can evolve that Pokemon this turn
 * RdyRules.abilities(board, monId)    [{ name, off, why }] for each Ability of a Pokemon in play
 * RdyRules.benchRoom(board)           free Bench spots
 * Acts (they change the board, as Goldfish does): play(board, uid, where), attach(board, uid, monId),
 * evolve(board, uid, monId), retreat(board, benchMonId), endTurn(board).
 */
const RdyRules = (() => {
  // The Goldfish acts redraw the Goldfish screen; on another board they stay quiet.
  const on = (board, fn) => { const keep = gf, keepR = renderHand; gf = board; if (board !== keep) renderHand = () => {};
    try { return fn(); } finally { gf = keep; renderHand = keepR; } };
  const find = (board, uid) => board.hand.find(x => x.uid === uid);
  const mon = (board, id) => [board.active].concat(board.bench).find(m => m && m.id === id);
  return {
    on,
    newBoard(cards, opts) {
      const o = opts || {}; let uid = 0;
      const pool = [];
      (cards || []).forEach(c => { for (let i = 0; i < (c.count || 1); i++) pool.push({ uid: ++uid, card: c, g: -1 }); });
      if (o.shuffle) for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      return { turn: o.turn || 0, first: o.first !== false, hand: pool.slice(0, 7), prizes: pool.slice(7, 13), deck: pool.slice(13), discard: [],
        active: null, bench: [], stadium: null, used: { energy: false, supporter: false, stadium: false, retreat: false }, turnOver: false,
        monId: 0, log: [], ready: [], groups: [], run: null, sel: null };
    },
    moves: (board, uid) => on(board, () => { const x = find(board, uid); return x ? gfActions(x) : []; }),
    canPlay(board, uid) {
      const m = this.moves(board, uid).filter(a => !/^Discard$/.test(a.label));
      const ok = m.find(a => !a.off);
      if (ok) return { ok: true, why: '' };
      const x = find(board, uid);
      if (board.turn === 0 && x && !gfIsBasic(x)) return { ok: false, why: 'During setup only Basic Pokémon go into play.' };
      return { ok: false, why: (m.find(a => a.why) || {}).why || 'Nothing to do with this card now.' };
    },
    trainerPlan: card => gfTrainerPlay({ card }),
    needWhy: need => gfNeedWhy(need),
    targetWhy: (board, uid) => on(board, () => { const x = find(board, uid); return x ? gfTargetWhy(x) : ''; }),
    retreatCost: (board, id) => on(board, () => { const m = mon(board, id); return m ? gfRetreatCost(m) : 0; }),
    retreatWhy: board => on(board, () => gfRetreatWhy()),
    canEvolveOnto: (board, id) => on(board, () => { const m = mon(board, id); return !!m && gfCanEvolveOnto(m); }),
    abilities: (board, id) => on(board, () => { const m = mon(board, id); if (!m) return [];
      return gfAbilities(gfTop(m)).map(A => { const why = gfAbilWhy(m, A, gfTop(m)); return { name: A.name, off: !!why, why: why || '' }; }); }),
    benchRoom: board => 5 - board.bench.length,
    play: (board, uid, where) => on(board, () => gfPlayBasic(uid, where === 'bench' ? 'bench' : 'active')),
    attach: (board, uid, id) => on(board, () => gfAttach(uid, id)),
    evolve: (board, uid, id) => on(board, () => gfEvolve(uid, id)),
    retreat: (board, id) => on(board, () => gfSwitch(id)),
    // The turn passes: the next turn's limits reset and you draw 1. Turn 0 is setup, so it needs an Active.
    endTurn: board => on(board, () => {
      if (board.turn === 0 && !board.active) return 'Put a Basic in the Active Spot first.';
      board.turn++; board.used = { energy: false, supporter: false, stadium: false, retreat: false };
      board.sel = null; board.selMon = null; board.turnOver = false;
      gfLog('Turn ' + board.turn); gfDraw(1); return ''; }),
  };
})();

function gfSummary(deck) {
  const opts = handLineOptions(deck, gf.groups);
  let h = '';
  if (opts.length) {
    const handCount = new Int32Array(gf.groups.length);
    gf.startHand.forEach(x => handCount[x.g]++);
    const S = { groups: gf.groups, handCount, rest: gf.startRest };
    // v71: the line the player picked on the Hand tab (else the main one), with the same seed the
    // Hand tab uses, so both show the same odds for the same hand. Both tiles are shares of shuffles.
    const li = gf.line && opts[gf.line] ? gf.line : 0;
    const seed = ((simSeed(deck.cards) ^ gf.startHand.reduce((a, x) => Math.imul(a ^ (x.g + 1), 16777619), 2166136261)) + li * 7919) >>> 0;
    const main = opts[li];
    const o = handLineOdds(S, main, HAND_TRIALS, seed);
    const when = gf.ready[li];
    const tG = lineFirstTurn(main, gf.groups);
    const good = when != null && when <= tG;
    h += `<div class="o-tiles">
      <div class="o-tile" style="--tone:${good ? 'var(--green)' : when ? 'var(--electric)' : 'var(--fire)'}"><div class="ol">${esc(main.name)}</div><div class="ov">${when ? 'T' + when : 'No'}</div><div class="os">${when ? 'In play on turn ' + when + ' this game' : 'Not in play by turn ' + GF_TURNS + ' this game'}</div></div>
      <div class="o-tile" style="--tone:var(--accent)"><div class="ol">This hand by T2</div><div class="ov">${oPct(o.s2)}</div><div class="os">${tG === 3 ? 'Turn 3 at the earliest without Rare Candy' : 'Shuffles from this opening hand, with search'}</div></div>
      <div class="o-tile" style="--tone:var(--accent)"><div class="ol">This hand by T3</div><div class="ov">${oPct(o.s3)}</div><div class="os">Shuffles from this opening hand, with search</div></div>
    </div>`;
    const verdict = good ? `You had ${esc(main.name)} up by turn ${when}. From this opening hand, the odds count gets it there by turn ${tG} in ${oPct(tG === 3 ? o.s3 : o.s2)} of shuffles.${tG === 3 ? ' With no Rare Candy in the list, turn 3 is the earliest it can be in play.' : ''}`
      : when ? `${esc(main.name)} came up on turn ${when}. The odds count has it ready by turn 2 in ${oPct(o.s2)} of shuffles from this hand, so look back at your first two turns.`
      : `${esc(main.name)} was not in play by turn ${GF_TURNS}. From this opening hand it is ready by turn 3 in ${oPct(o.s3)} of shuffles, so check the moves below for a search you could have made.`;
    h += `<div class="g-item ${good ? 'ok' : 'warn'}"><div class="gt">${good ? 'On schedule' : when ? (when - tG === 1 ? 'A turn behind' : (when - tG) + ' turns behind') : 'Line did not come together'}</div><p>${verdict}</p></div>`;
    if (opts.length > 1) {
      h += `<div class="hp-chips" style="margin:0.5rem 0 0.75rem">${opts.map((l, i) => i === li ? '' : `<span class="hp-chip">${esc(l.name)}: ${gf.ready[i] ? 'turn ' + gf.ready[i] : 'not in play'}</span>`).join('')}</div>`;
    }
  }
  const keys = new Set();
  if (opts.length) { const l = opts[0]; [l.basic, l.s1, l.top].filter(i => i >= 0).forEach(i => keys.add(i)); if (l.stage === 'stage2') gf.groups.forEach((g, i) => { if (g.candy) keys.add(i); }); }
  h += `<div class="hp-lbl">Your prizes were</div><div class="hp-chips">${gf.prizes.map(x => `<span class="hp-chip${keys.has(x.g) ? ' key' : ''}">${gfNm(x)}</span>`).join('')}</div>
    <div class="hp-actions" style="margin-top:1rem"><button class="btn" onclick="gfDeal(${!gf.first})">Again going ${gf.first ? 'second' : 'first'}</button>
    <button class="btn btn-primary" onclick="gfDeal(${gf.first})">New deal</button></div>`;
  return h;
}

// ═══════════ DRILLS TAB (v23): resource count and opponent prize read ═══════════
let resDrill = null, readDrill = null, _oppPaste = '', _oppSrc = '';

function renderDrills() {
  const el = document.getElementById('drills-body');
  const deck = findDeck(state.activeDeckId);
  if (!el || !deck) return;
  el.innerHTML = `<div class="hp-wrap">${renderPrizeGameSec(deck)}${renderResDrill(deck)}${renderReadDrill(deck)}</div>`;
}
// 3.3.6: the prize game lives here, as the first drill. It used to be a bar fixed to the bottom of
// every deck tab, which took a lot of room on a phone held sideways. Home's Prizes button still starts one.
function renderPrizeGameSec(deck) {
  const n = (deck.history || []).length, id = esc(String(deck.id)), daily = isDailyChallenge(deck);
  const four = typeof pre47Is === 'function' && pre47Is(deck);   // prerelease decks play 4 prizes
  return `<div class="g-sec" id="pg-sec"><div class="g-sec-t">Prize game</div>
    <div class="g-sec-i">${four ? 'Four' : 'Six'} cards go face down and you name them.</div>
    <div class="hp-meta">${n ? `<span class="hp-pill">${n} prize game${n !== 1 ? 's' : ''} played</span>` : ''}</div>
    <div class="hp-actions">${daily ? '' : `<button class="btn" onclick="openModeModal('${id}')">Game modes</button>`}${n && !daily ? `<button class="btn" onclick="openWeakSpots('${id}')">Progress</button>` : ''}<button class="btn btn-primary" onclick="startGameFromReview()" aria-label="Start a prize game with this deck">${ic23('play')}Play</button></div></div>`;
}
function statLine(s) {
  if (!s || !s.g) return '';
  return `<span class="hp-pill">${s.g} round${s.g !== 1 ? 's' : ''}, ${Math.round(s.c / Math.max(1, s.n) * 100)}% right</span>`;
}

// Resource count: a used pile from a real shuffle, the list hidden, and
// three questions on how many of a card you have not used yet.
function newResDrill() {
  const deck = findDeck(state.activeDeckId);
  if (!deck) return;
  const pool = [];
  deck.cards.filter(c => c.count > 0).forEach(c => { for (let k = 0; k < c.count; k++) pool.push(c); });
  shuf(pool);
  const prizes = pool.slice(0, 6), rest = pool.slice(6);
  const used = rest.slice(0, 10 + Math.floor(Math.random() * 11));
  const tot = cardTotals(deck.cards), usedT = pileTotals(used);
  let keys = [...tot.keys()].filter(k => tot.get(k).n >= 2);
  if (keys.length < 3) keys = [...tot.keys()];
  const inUsed = shuf(keys.filter(k => usedT.has(k)).slice());
  const notUsed = shuf(keys.filter(k => !usedT.has(k)).slice());
  const qs = inUsed.slice(0, 2).concat(notUsed.slice(0, 1));
  while (qs.length < 3 && inUsed.length > qs.length) qs.push(inUsed[qs.length]);
  const fill = shuf(keys.filter(k => !qs.includes(k)));
  while (qs.length < Math.min(3, keys.length)) qs.push(fill.shift());
  shuf(qs);
  resDrill = {
    deckId: deck.id, used: shuf(used.slice()), prizes,
    qs: qs.map(k => ({ k, name: tot.get(k).name, listed: tot.get(k).n, usedN: usedT.has(k) ? usedT.get(k).n : 0, ans: null })),
    checked: false,
  };
  renderDrills();
}
function resAns(i, d) {
  const q = resDrill && resDrill.qs[i]; if (!q || resDrill.checked) return;
  q.ans = Math.max(0, Math.min(q.listed + 4, (q.ans == null ? 0 : q.ans) + d));
  renderDrills();
}
function resCheck() {
  if (!resDrill || resDrill.checked) return;
  resDrill.qs.forEach(q => { if (q.ans == null) q.ans = 0; });
  resDrill.checked = true;
  const right = resDrill.qs.filter(q => q.ans === q.listed - q.usedN).length;
  drillStat(findDeck(resDrill.deckId), 'res', right, resDrill.qs.length);
  renderDrills();
}
function renderResDrill(deck) {
  const st = deck.drills && deck.drills.res;
  let h = `<div class="g-sec" id="res-sec"><div class="g-sec-t">Resource count</div>
    <div class="g-sec-i">Your list stays hidden. Here is what you have used so far this game. Say how many of each card you have not used yet, the way you would before a big turn.</div>
    <div class="hp-meta">${statLine(st)}</div>`;
  if (!resDrill || resDrill.deckId !== deck.id) {
    return h + `<div class="hp-actions"><button class="btn btn-primary" onclick="newResDrill()">${ic23('play')}Start a round</button></div></div>`;
  }
  const R = resDrill;
  h += `<div class="hp-lbl">Used so far (${R.used.length} cards, in play or discarded)</div>
    <div class="hp-chips">${R.used.map(c => `<span class="hp-chip">${esc(lbl23(c))}</span>`).join('')}</div>
    <div class="res-qs">`;
  R.qs.forEach((q, i) => {
    const left = q.listed - q.usedN;
    const ok = R.checked && q.ans === left;
    h += `<div class="res-q${R.checked ? (ok ? ' ok' : ' bad') : ''}"><div class="res-qt">How many <b>${esc(q.name)}</b> have you not used yet?</div>
      <span class="stp"><button class="stp-b" onclick="resAns(${i},-1)" ${R.checked ? 'disabled' : ''} aria-label="Fewer">−</button><b class="res-n">${q.ans == null ? '?' : q.ans}</b><button class="stp-b" onclick="resAns(${i},1)" ${R.checked ? 'disabled' : ''} aria-label="More">+</button></span>
      ${R.checked ? `<div class="res-fb">${ok ? 'Right.' : 'It is ' + left + '.'} You run ${q.listed} and have used ${q.usedN}.</div>` : ''}</div>`;
  });
  h += `</div><div class="hp-actions">${R.checked
    ? `<button class="btn btn-primary" onclick="newResDrill()">Next round</button>`
    : `<button class="btn" onclick="newResDrill()">New pile</button><button class="btn btn-primary" id="res-check" onclick="resCheck()">Check</button>`}</div></div>`;
  return h;
}

// Opponent prize read: their list, what they have shown, and six hidden prizes.
function oppSources() {
  return state.decks.map(d => ({ val: 'd:' + d.id, label: d.name, cards: d.cards })).concat([{ val: 'paste', label: 'Paste their list', cards: null }]);
}
function oppCards() {
  if (_oppSrc === 'paste') return parseDeckList(clean23(_oppPaste, 8000));
  const d = state.decks.find(x => 'd:' + x.id === _oppSrc);
  return d ? d.cards : [];
}
function setOppSrc(v) { _oppSrc = v; readDrill = null; renderDrills(); }
function newReadDrill() {
  if (_oppSrc === 'paste') { const t = document.getElementById('opp-paste'); if (t) _oppPaste = clean23(t.value, 8000); }
  const cards = oppCards().filter(c => c.count > 0);
  const n = cards.reduce((a, c) => a + c.count, 0);
  if (n < 30) { showToast(n ? `Only ${n} cards read from that list.` : 'No cards read from that list.'); return; }
  const stage = (readDrill && readDrill.stage) || 'late';
  const pool = [];
  cards.forEach(c => { for (let k = 0; k < c.count; k++) pool.push(c); });
  shuf(pool);
  const hidden = stage === 'late' ? 8 : 18;
  const prizes = pool.slice(0, 6), unseen = pool.slice(6, 6 + hidden), shown = pool.slice(6 + hidden);
  const tot = cardTotals(cards), sh = pileTotals(shown), pz = pileTotals(prizes), un = pileTotals(unseen);
  const rows = [...tot.keys()].map(k => ({ k, name: tot.get(k).name, listed: tot.get(k).n, shown: sh.has(k) ? sh.get(k).n : 0, prized: pz.has(k) ? pz.get(k).n : 0, unseen: un.has(k) ? un.get(k).n : 0, guess: 0 }))
    .sort((a, b) => (b.listed - b.shown) - (a.listed - a.shown) || a.name.localeCompare(b.name));
  readDrill = { src: _oppSrc, stage, hidden, rows, checked: false, total: n };
  renderDrills();
}
function setReadStage(s) { if (readDrill && !readDrill.checked) { readDrill.stage = s; newReadDrill(); } else { readDrill = readDrill || {}; readDrill.stage = s; if (readDrill.rows) newReadDrill(); else renderDrills(); } }
function readGuess(i, d) {
  const R = readDrill; if (!R || R.checked) return;
  const r = R.rows[i], used = R.rows.reduce((a, x) => a + x.guess, 0);
  if (d > 0 && (used >= 6 || r.guess >= r.listed - r.shown)) return;
  r.guess = Math.max(0, r.guess + d);
  renderDrills();
}
function readCheck() {
  const R = readDrill; if (!R || R.checked) return;
  R.checked = true;
  R.score = R.rows.reduce((a, r) => a + Math.min(r.guess, r.prized), 0);
  drillStat(null, 'read', R.score, 6);
  renderDrills();
}
function renderReadDrill(deck) {
  const srcs = oppSources();
  if (!srcs.some(s => s.val === _oppSrc)) _oppSrc = srcs.length > 1 ? srcs.find(s => s.val !== 'd:' + deck.id) ? srcs.find(s => s.val !== 'd:' + deck.id).val : srcs[0].val : 'paste';
  const st = state.drillStats && state.drillStats.read;
  const stage = (readDrill && readDrill.stage) || 'late';
  let h = `<div class="g-sec" id="read-sec"><div class="g-sec-t">Opponent prize read</div>
    <div class="g-sec-i">Load your opponent's list. You see everything they have shown. Six of the rest are prized and the others are still in their deck or hand. Name the six.</div>
    <div class="hp-meta">${statLine(st)}</div>
    <label for="opp-src">Their list</label>
    <select id="opp-src" class="x-select" onchange="setOppSrc(this.value)">${srcs.map(s => `<option value="${esc(s.val)}"${s.val === _oppSrc ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
    ${_oppSrc === 'paste' ? `<textarea id="opp-paste" class="nt-area" maxlength="8000" aria-label="Opponent's deck list" placeholder="Paste their 60 card list. It stays on this device and is not saved as a deck.">${esc(_oppPaste)}</textarea>` : ''}
    <div class="seg read-seg" style="margin:0.6rem 0">
      <div class="mode-opt${stage === 'late' ? ' active' : ''}" onclick="setReadStage('late')">Late game <small>8 still in deck or hand</small></div>
      <div class="mode-opt${stage === 'mid' ? ' active' : ''}" onclick="setReadStage('mid')">Mid game <small>18 still in deck or hand</small></div>
    </div>`;
  const R = readDrill;
  if (!R || !R.rows || R.src !== _oppSrc) {
    return h + `<div class="hp-actions"><button class="btn btn-primary" id="read-start" onclick="newReadDrill()">${ic23('play')}Deal their game</button></div></div>`;
  }
  const used = R.rows.reduce((a, r) => a + r.guess, 0);
  h += `<div class="hp-meta"><span class="hp-pill">${R.total - 6 - R.hidden} shown</span><span class="hp-pill">${R.hidden} in deck or hand</span><span class="hp-pill${used === 6 ? ' done' : ''}">${used} of 6 named</span></div>
    <div class="o-table-wrap"><table class="o-table rd-t"><thead><tr><th>Card</th><th>List</th><th>Shown</th><th>${R.checked ? 'Prized' : 'Prized?'}</th></tr></thead><tbody>`;
  R.rows.forEach((r, i) => {
    const open = r.listed - r.shown;
    let last;
    if (R.checked) {
      const cls = r.prized === r.guess ? (r.prized ? 'ok' : '') : 'bad';
      last = `<span class="rd-res ${cls}">${r.prized}${r.guess !== r.prized ? ` <small>you said ${r.guess}</small>` : r.prized ? ' ✓' : ''}</span>`;
    } else if (open > 0) {
      last = `<span class="stp sm"><button class="stp-b" onclick="readGuess(${i},-1)" ${r.guess ? '' : 'disabled'} aria-label="Fewer">−</button><b>${r.guess}</b><button class="stp-b" onclick="readGuess(${i},1)" ${used < 6 && r.guess < open ? '' : 'disabled'} aria-label="More">+</button></span>`;
    } else last = '<span class="nt-muted">all shown</span>';
    h += `<tr class="${open ? '' : 'rd-done'}"><td>${esc(r.name)}</td><td>${r.listed}</td><td>${r.shown}</td><td>${last}</td></tr>`;
  });
  h += `</tbody></table></div>`;
  if (R.checked) {
    h += `<div class="g-item ${R.score >= 5 ? 'ok' : R.score >= 3 ? 'warn' : 'crit'}" style="margin-top:0.75rem"><div class="gt">${R.score} of 6 prizes read</div>
      <p>The ${R.hidden} cards still in their deck or hand were ${R.rows.filter(r => r.unseen).map(r => esc(r.name) + (r.unseen > 1 ? ' x' + r.unseen : '')).join(', ')}.</p></div>
      <div class="hp-actions"><button class="btn btn-primary" onclick="newReadDrill()">Deal again</button></div>`;
  } else {
    h += `<div class="hp-actions" style="margin-top:0.75rem"><button class="btn" onclick="newReadDrill()">New deal</button><button class="btn btn-primary" id="read-check" onclick="readCheck()" ${used === 6 ? '' : 'disabled'}>Check</button></div>`;
  }
  return h + `</div>`;
}

// ═══════════ DAILY CHALLENGE (v23) ═══════════
// One built in list and a shuffle seeded from the date, so everyone on the
// same day gets the same prizes. No server: your first try is your score.
const DAILY_NAME = 'Charizard ex Pidgeot ex';
const DAILY_LIST = `Pokémon: 18
4 Charmander OBF 26
2 Charmeleon OBF 27
3 Charizard ex OBF 125
2 Pidgey OBF 162
2 Pidgeot ex OBF 164
2 Bidoof CRZ 111
1 Bibarel BRS 121
1 Rotom V LOR 58
1 Manaphy BRS 41

Trainer: 34
4 Rare Candy SVI 191
4 Ultra Ball SVI 196
3 Nest Ball SVI 181
4 Buddy-Buddy Poffin TEF 144
4 Arven SVI 166
3 Iono PAL 185
2 Professor's Research SVI 189
2 Boss's Orders PAL 172
2 Super Rod PAL 188
1 Counter Catcher PAR 160
2 Switch SVI 194
1 Forest Seal Stone SIL 156
2 Artazon PAL 171

Energy: 8
8 Basic {R} Energy SVE 2`;
// 2.5.2: the deck changes each day. Through #4 (12 Nov 2026) every day was the Charizard list
// above; from then on each day takes the next deck from DAILY_POOL, the best placed list of each
// archetype in the grade check's top lists (as of 11 Nov 2026), in a fixed mixed order.
const DAILY_POOL = [
  { name: "Froslass Munkidori", list: `Pokémon: 18
4 Snorunt ASC 46
3 Froslass TWM 53
2 Mega Froslass ex ASC 47
4 Munkidori TWM 95
3 Budew ASC 16
1 Yveltal MEG 88
1 Shaymin DRI 10

Trainer: 34
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
3 Team Rocket's Petrel DRI 176
3 Gwynn PBL 78
2 Hilda WHT 84
4 Poké Pad POR 81
4 Night Stretcher ASC 196
3 Buddy-Buddy Poffin TEF 144
2 Team Rocket's Transceiver DRI 178
1 Secret Box TWM 163
1 Special Red Card CRI 82
1 Air Balloon ASC 181
3 Team Rocket's Factory DRI 173

Energy: 8
5 Darkness Energy MEE 15
2 Water Energy MEE 11
1 Prism Energy ASC 216` },
  { name: "Starmie Dusknoir", list: `Pokémon: 21
2 Staryu POR 20
2 Mega Starmie ex POR 21
2 Duskull PRE 35
2 Dusclops PRE 36
1 Dusknoir PRE 37
2 Snorunt ASC 46
2 Mega Froslass ex ASC 47
2 Budew ASC 16
1 Dunsparce TEF 128
1 Dudunsparce TEF 129
1 Totodile TEF 39
1 Fezandipiti ex ASC 142
1 Meowth ex POR 62
1 Munkidori TWM 95

Trainer: 29
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Hilda WHT 84
1 Salvatore TEF 160
1 Xerosic's Machinations SFA 64
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
3 Night Stretcher ASC 196
3 Ultra Ball MEG 131
1 Special Red Card CRI 82
1 Prime Catcher TEF 157
2 Surfing Beach MEG 129

Energy: 10
6 Water Energy MEE 11
2 Ignition Energy WHT 86
2 Darkness Energy MEE 15` },
  { name: "Hop's Trevenant", list: `Pokémon: 14
4 Hop's Phantump ASC 95
3 Hop's Trevenant ASC 96
2 Hop's Snorlax JTG 117
1 Hop's Wooloo JTG 135
1 Hop's Dubwool JTG 136
1 Shaymin DRI 10
1 Lillie's Clefairy ex JTG 56
1 Hop's Cramorant JTG 138

Trainer: 38
4 Team Rocket's Petrel DRI 176
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
2 Kieran TWM 154
2 Hassel TWM 151
1 Eri TEF 146
1 Xerosic's Machinations SFA 64
4 Poké Pad POR 81
3 Pokégear 3.0 SVI 186
2 Hop's Bag JTG 147
2 Night Stretcher ASC 196
2 Switch MEG 130
1 Secret Box TWM 163
4 Hop's Choice Band JTG 148
4 Postwick JTG 154

Energy: 8
4 Mist Energy TEF 161
4 Telepathic Psychic Energy POR 88` },
  { name: "Alakazam Dudunsparce", list: `Pokémon: 21
4 Abra MEG 54
4 Kadabra MEG 55
3 Alakazam MEG 56
3 Dunsparce JTG 120
2 Dudunsparce TEF 129
2 Lillie's Clefairy ex JTG 56
1 Fezandipiti ex ASC 142
1 Shaymin DRI 10
1 Genesect SFA 40

Trainer: 31
4 Dawn PFL 87
4 Hilda WHT 84
2 Boss's Orders MEG 114
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
2 Rare Candy MEG 125
2 Wondrous Patch PFL 94
1 Special Red Card CRI 82
1 Sacred Ash DRI 168
3 Lillie's Pearl JTG 151
4 Battle Cage PFL 85

Energy: 8
4 Telepathic Psychic Energy POR 88
2 Psychic Energy MEE 13
1 Mist Energy TEF 161
1 Enriching Energy SSP 191` },
  { name: "Dragapult", list: `Pokémon: 19
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Munkidori TWM 95
2 Budew ASC 16
1 Dunsparce TEF 128
1 Dudunsparce TEF 129
1 Fezandipiti ex ASC 142
1 Meowth ex POR 62

Trainer: 32
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Crispin SCR 133
1 Rosa's Encouragement POR 84
1 Judge POR 76
4 Poké Pad POR 81
4 Buddy-Buddy Poffin TEF 144
4 Crushing Hammer POR 71
3 Night Stretcher ASC 196
3 Ultra Ball MEG 131
1 Unfair Stamp TWM 165
2 Risky Ruins MEG 127

Energy: 9
3 Darkness Energy MEE 15
3 Psychic Energy MEE 13
3 Fire Energy MEE 10` },
  { name: "Crustle", list: `Pokémon: 11
3 Dwebble DRI 11
3 Crustle DRI 12
3 Mega Kangaskhan ex MEG 104
2 Azurill DLR 80

Trainer: 37
4 Boss's Orders MEG 114
4 Team Rocket's Petrel DRI 176
4 Hilda WHT 84
3 Lillie's Determination MEG 119
2 Eri TEF 146
1 Xerosic's Machinations SFA 64
4 Tasty Rice Ball DLR 101
4 Jumbo Ice Cream PFL 91
3 Pokégear 3.0 SVI 186
2 Buddy-Buddy Poffin TEF 144
1 Switch MEG 130
1 Ultra Ball MEG 131
1 Hero's Cape TEF 152
1 Prism Tower CRI 80
1 Lumiose City POR 77
1 Festival Grounds TWM 149

Energy: 12
4 Mist Energy TEF 161
4 Growing Grass Energy POR 86
4 Spiky Energy JTG 159` },
  { name: "Lopunny Dudunsparce", list: `Pokémon: 18
3 Buneary PFL 83
2 Mega Lopunny ex PFL 84
2 Dunsparce JTG 120
1 Dunsparce TEF 128
2 Dudunsparce TEF 129
2 Snorunt ASC 46
2 Mega Froslass ex ASC 47
1 Meowth ex POR 62
1 Mew ex 30C 66
1 Fan Rotom SCR 118
1 Lillie's Clefairy ex JTG 56

Trainer: 34
4 Lillie's Determination MEG 119
4 Hilda WHT 84
3 Boss's Orders MEG 114
3 Wally's Compassion MEG 132
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
4 Ultra Ball MEG 131
2 Night Stretcher ASC 196
1 Special Red Card CRI 82
2 Air Balloon ASC 181
3 Battle Cage PFL 85

Energy: 8
4 Mist Energy TEF 161
3 Water Energy MEE 11
1 Enriching Energy SSP 191` },
  { name: "Basic Box", list: `Pokémon: 21
4 Mega Kangaskhan ex MEG 104
3 Meowth ex POR 62
2 Latias ex SSP 76
2 Teal Mask Ogerpon ex TWM 25
2 Lillie's Clefairy ex JTG 56
1 Chien-Pao SSP 56
1 Raging Bolt ex TEF 123
1 Talonflame ex DLR 88
1 Iron Leaves ex TEF 25
1 Koraidon ex ASC 121
1 Iron Crown ex TEF 81
1 Wellspring Mask Ogerpon ex TWM 64
1 Fezandipiti ex ASC 142

Trainer: 25
4 Crispin SCR 133
2 Cyrano SSP 170
2 Boss's Orders MEG 114
1 Judge POR 76
1 Ciphermaniac's Codebreaking TEF 145
4 Ultra Ball MEG 131
4 Energy Switch MEG 115
2 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
1 Glass Trumpet SCR 135
3 Area Zero Underdepths SCR 131

Energy: 14
6 Grass Energy MEE 9
3 Psychic Energy MEE 13
2 Fighting Energy MEE 14
2 Lightning Energy MEE 12
1 Water Energy MEE 11` },
  { name: "Mega Manectric", list: `Pokémon: 11
4 Electrike PBL 23
3 Manectric PBL 24
3 Mega Manectric ex MEG 50
1 Shaymin DRI 10

Trainer: 37
4 Lillie's Determination MEG 119
4 Hilda WHT 84
3 Boss's Orders MEG 114
2 Wally's Compassion MEG 132
2 Judge POR 76
4 Ultra Ball MEG 131
4 Dusk Ball SSP 175
4 Night Stretcher ASC 196
4 Poké Pad POR 81
3 Buddy-Buddy Poffin TEF 144
1 Redeemable Ticket JTG 156
1 Hero's Cape TEF 152
1 Gravity Mountain SSP 177

Energy: 12
8 Lightning Energy MEE 12
4 Voltaic Lightning Energy PBL 84` },
  { name: "Mega Charizard X", list: `Pokémon: 19
4 Charmander MEP 38
1 Charmeleon PFL 12
2 Mega Charizard X ex PFL 13
1 Mega Charizard Y ex ASC 22
4 Mega Kangaskhan ex MEG 104
2 Meowth ex POR 62
2 Talonflame ex DLR 88
2 Oricorio ex PFL 18
1 Latias ex SSP 76

Trainer: 28
3 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
2 Hilda WHT 84
2 Cyrano SSP 170
1 Dawn PFL 87
1 Firebreather PFL 89
3 Rare Candy MEG 125
3 Ultra Ball MEG 131
2 Switch MEG 130
2 Night Stretcher ASC 196
2 Poké Pad POR 81
1 Energy Retrieval SVI 171
1 Mega Signal MEG 121
1 Special Red Card CRI 82
1 Lucky Helmet TWM 158
1 Jamming Tower TWM 153

Energy: 13
8 Fire Energy MEE 10
4 Ignition Energy WHT 86
1 Neo Upper Energy TEF 162` },
  { name: "Mega Starmie", list: `Pokémon: 16
4 Staryu POR 20
3 Mega Starmie ex POR 21
3 Snorunt ASC 46
2 Mega Froslass ex ASC 47
1 Meowth ex POR 62
1 Mew ex 30C 66
1 Fezandipiti ex ASC 142
1 Budew ASC 16

Trainer: 34
4 Lillie's Determination MEG 119
3 Salvatore TEF 160
3 Boss's Orders MEG 114
3 Hilda WHT 84
2 Wally's Compassion MEG 132
4 Ultra Ball MEG 131
4 Buddy-Buddy Poffin TEF 144
3 Pokégear 3.0 SVI 186
2 Night Stretcher ASC 196
1 Switch MEG 130
1 Special Red Card CRI 82
1 Secret Box TWM 163
1 Air Balloon ASC 181
1 Battle Cage PFL 85
1 Surfing Beach MEG 129

Energy: 10
7 Water Energy MEE 11
3 Ignition Energy WHT 86` },
  { name: "Mega Venusaur", list: `Pokémon: 23
4 Teal Mask Ogerpon ex TWM 25
3 Chikorita ASC 8
3 Bayleef MEG 9
2 Meganium MEG 10
1 Mega Meganium ex ASC 10
2 Bulbasaur MEG 1
2 Ivysaur MEG 2
2 Mega Venusaur ex MEG 3
2 Meowth ex POR 62
1 Fezandipiti ex ASC 142
1 Celebi MEG 12

Trainer: 25
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Wally's Compassion MEG 132
1 Lana's Aid TWM 155
1 Judge POR 76
4 Ultra Ball MEG 131
4 Bug Catching Set TWM 143
2 Poké Pad POR 81
1 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
4 Forest of Vitality MEG 117

Energy: 12
12 Grass Energy MEE 9` },
  { name: "Festival Lead", list: `Pokémon: 21
4 Applin TWM 126
3 Dipplin TWM 18
4 Grookey TWM 14
4 Thwackey TWM 15
2 Goldeen TWM 44
1 Seaking PRE 21
1 Rellor TEF 23
1 Rabsca TEF 24
1 Shaymin DRI 10

Trainer: 34
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
2 Gladion's Final Battle PBL 77
1 Kieran TWM 154
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
3 Night Stretcher ASC 196
2 Ultra Ball MEG 131
1 Switch MEG 130
1 Tool Scrapper ASC 212
1 Secret Box TWM 163
1 Sacred Ash DRI 168
2 Brave Bangle WHT 80
2 Air Balloon ASC 181
4 Festival Grounds TWM 149

Energy: 5
5 Grass Energy MEE 9` },
  { name: "Mega Rayquaza", list: `Pokémon: 16
4 Mega Kangaskhan ex MEG 104
2 Latias ex SSP 76
2 Talonflame ex DLR 88
2 Ethan's Ho-Oh ex DRI 39
2 Meowth ex POR 62
2 Mega Rayquaza ex DLR 84
1 Iron Thorns ex TWM 77
1 Fezandipiti ex ASC 142

Trainer: 29
4 Cyrano SSP 170
2 Judge POR 76
2 Crispin SCR 133
2 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
4 Ultra Ball MEG 131
4 Energy Switch MEG 115
2 Switch MEG 130
1 Unfair Stamp TWM 165
1 Special Red Card CRI 82
1 Blowtorch PFL 86
2 Legendary Pyroduct DLR 94
2 Legendary Pyroduct DLR 95

Energy: 15
10 Fire Energy MEE 10
5 Lightning Energy MEE 12` },
  { name: "Cynthia's Garchomp", list: `Pokémon: 20
4 Cynthia's Gible DRI 102
4 Cynthia's Gabite DRI 103
3 Cynthia's Garchomp ex DRI 104
3 Cynthia's Roselia DRI 7
3 Cynthia's Roserade DRI 8
1 Cynthia's Spiritomb DRI 129
1 Relicanth TEF 84
1 Shaymin DRI 10

Trainer: 32
4 Lillie's Determination MEG 119
2 Larry's Skill PRE 115
2 Boss's Orders MEG 114
1 Judge POR 76
1 Team Rocket's Petrel DRI 176
4 Fighting Gong MEG 116
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
2 Premium Power Pro MEG 124
1 Night Stretcher ASC 196
1 Special Red Card CRI 82
1 Unfair Stamp TWM 165
1 Pokégear 3.0 SVI 186
3 Cynthia's Power Weight DRI 162
1 Team Rocket's Watchtower DRI 180

Energy: 8
4 Rocky Fighting Energy POR 87
4 Fighting Energy MEE 14` },
  { name: "Okidogi Barbaracle", list: `Pokémon: 16
3 Okidogi TWM 111
3 Solrock MEG 75
2 Binacle POR 42
2 Barbaracle POR 43
2 Lunatone MEG 74
1 Moltres PFL 14
1 Patrat CRI 70
1 Bloodmoon Ursaluna PRE 54
1 Shaymin DRI 10

Trainer: 31
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Tarragon POR 85
1 Hassel TWM 151
1 Morty's Conviction TEF 155
1 Gwynn PBL 78
4 Fighting Gong MEG 116
4 Poké Pad POR 81
2 Pokégear 3.0 SVI 186
2 Night Stretcher ASC 196
1 Energy Retrieval SVI 171
1 Premium Power Pro MEG 124
2 Air Balloon ASC 181
3 Battle Cage PFL 85

Energy: 13
8 Fighting Energy MEE 14
4 Prism Energy ASC 216
1 Legacy Energy TWM 167` },
  { name: "Rocket's Honchkrow", list: `Pokémon: 12
4 Team Rocket's Murkrow DRI 127
3 Team Rocket's Honchkrow ASC 127
2 Team Rocket's Porygon DRI 153
1 Team Rocket's Porygon2 DRI 154
2 Team Rocket's Articuno DRI 51

Trainer: 40
4 Team Rocket's Petrel DRI 176
4 Team Rocket's Archer DRI 170
4 Team Rocket's Proton DRI 177
4 Team Rocket's Ariana DRI 171
4 Team Rocket's Giovanni DRI 174
4 Roto-Stick PRE 127
4 Team Rocket's Transceiver DRI 178
3 Poké Pad POR 81
3 Night Stretcher ASC 196
1 Miracle Headset SSP 183
1 Pokégear 3.0 SVI 186
1 Lucky Helmet TWM 158
3 Team Rocket's Factory DRI 173

Energy: 8
4 Ignition Energy WHT 86
4 Team Rocket's Energy DRI 182` },
  { name: "Dhelmise", list: `Pokémon: 25
4 Poltchageist PBL 5
4 Sinistcha PBL 6
4 Shuppet PBL 33
4 Banette PBL 34
4 Dhelmise PBL 39
2 Lillie's Clefairy ex JTG 56
1 Latias ex SSP 76
1 Bloodmoon Ursaluna ex TWM 141
1 Spiritomb PBL 35

Trainer: 27
4 Lillie's Determination MEG 119
4 Gwynn PBL 78
3 Boss's Orders MEG 114
3 Explorer's Guidance TEF 147
2 Naveen POR 79
4 Ultra Ball MEG 131
3 Poké Pad POR 81
2 Night Stretcher ASC 196
2 Prism Tower CRI 80

Energy: 8
4 Telepathic Psychic Energy POR 88
3 Psychic Energy MEE 13
1 Legacy Energy TWM 167` },
  { name: "Sharpedo Toxtricity", list: `Pokémon: 19
3 Carvanha PFL 60
3 Mega Sharpedo ex PFL 61
3 Pecharunt ex SFA 39
2 Toxel PFL 67
2 Toxtricity PFL 68
2 Tatsugiri TWM 131
2 Munkidori TWM 95
1 Fezandipiti ex ASC 142
1 Yveltal MEG 88

Trainer: 32
4 Boss's Orders MEG 114
4 Lillie's Determination MEG 119
3 Judge POR 76
1 Brock's Scouting JTG 146
1 Team Rocket's Petrel DRI 176
4 Ultra Ball MEG 131
4 Buddy-Buddy Poffin TEF 144
3 Poké Pad POR 81
1 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
3 Binding Mochi PRE 95
2 Team Rocket's Watchtower DRI 180
1 Gravity Mountain SSP 177

Energy: 9
9 Darkness Energy MEE 15` },
  { name: "Mew Box", list: `Pokémon: 22
3 Mega Kangaskhan ex MEG 104
3 Mew ex 30C 66
2 Latias ex SSP 76
2 Lillie's Clefairy ex JTG 56
1 Golett DLR 46
1 Mega Golurk ex DLR 47
1 Stunfisk ASC 62
1 Psyduck ASC 39
1 Pincurchin DLR 36
1 Moltres PFL 14
1 Giratina DLR 45
1 Meowth ex POR 62
1 Flutter Mane TEF 78
1 Fezandipiti ex ASC 142
1 Mega Diancie ex PFL 41
1 Unown 30C 72

Trainer: 27
2 Boss's Orders MEG 114
2 Ciphermaniac's Codebreaking TEF 145
2 Lillie's Determination MEG 119
2 Crispin SCR 133
1 Cyrano SSP 170
1 Judge POR 76
4 Ultra Ball MEG 131
3 Dusk Ball SSP 175
3 Wondrous Patch PFL 94
1 Night Stretcher ASC 196
1 Switch MEG 130
1 Prime Catcher TEF 157
2 Prism Tower CRI 80
1 Gravity Mountain SSP 177
1 Team Rocket's Watchtower DRI 180

Energy: 11
4 Telepathic Psychic Energy POR 88
4 Psychic Energy MEE 13
2 Lightning Energy MEE 12
1 Fire Energy MEE 10` },
  { name: "Dragapult Blaziken", list: `Pokémon: 21
4 Dreepy TWM 128
4 Drakloak TWM 129
2 Dragapult ex TWM 130
2 Torchic DRI 40
1 Combusken DRI 41
2 Blaziken ex JTG 24
2 Munkidori TWM 95
1 Budew ASC 16
1 Fezandipiti ex ASC 142
1 Meowth ex POR 62
1 Chi-Yu TWM 39

Trainer: 31
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Crispin SCR 133
2 Judge POR 76
4 Poké Pad POR 81
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball MEG 131
2 Rare Candy MEG 125
2 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
3 Team Rocket's Watchtower DRI 180

Energy: 8
3 Psychic Energy MEE 13
3 Fire Energy MEE 10
2 Darkness Energy MEE 15` },
  { name: "Slowking", list: `Pokémon: 22
4 Slowpoke SCR 57
3 Slowking SCR 58
4 Mega Kangaskhan ex MEG 104
2 Latias ex SSP 76
2 Kyurem SFA 47
2 Metagross CRI 61
1 Meowth ex POR 62
1 Mew ex 30C 66
1 Fezandipiti ex ASC 142
1 Lillie's Clefairy ex JTG 56
1 Zeraora DRI 78

Trainer: 28
4 Lillie's Determination MEG 119
4 Ciphermaniac's Codebreaking TEF 145
4 Poké Pad POR 81
4 Ultra Ball MEG 131
3 Wondrous Patch PFL 94
2 Night Stretcher ASC 196
1 Switch MEG 130
1 Secret Box TWM 163
1 Lucky Helmet TWM 158
4 Academy at Night SFA 54

Energy: 10
4 Telepathic Psychic Energy POR 88
4 Psychic Energy MEE 13
2 Boomerang Energy TWM 166` },
  { name: "Ogerpon Meganium Arboliva", list: `Pokémon: 20
4 Teal Mask Ogerpon ex TWM 25
2 Chikorita ASC 8
2 Bayleef ASC 9
2 Meganium MEG 10
2 Smoliv DRI 21
2 Dolliv DRI 22
2 Arboliva ex DRI 23
2 Meowth ex POR 62
1 Fezandipiti ex ASC 142
1 Budew ASC 16

Trainer: 28
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
2 Dawn PFL 87
1 Judge POR 76
1 Briar SCR 132
1 Lana's Aid TWM 155
4 Ultra Ball MEG 131
4 Bug Catching Set TWM 143
1 Night Stretcher ASC 196
1 Energy Switch MEG 115
1 Special Red Card CRI 82
1 Unfair Stamp TWM 165
1 Poké Pad POR 81
4 Forest of Vitality MEG 117

Energy: 12
12 Grass Energy MEE 9` },
  { name: "Dragapult Dusknoir", list: `Pokémon: 22
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Duskull PRE 35
2 Dusclops PRE 36
1 Dusknoir PRE 37
2 Budew ASC 16
1 Fezandipiti ex ASC 142
1 Meowth ex POR 62
1 Munkidori TWM 95
1 Moltres PFL 14

Trainer: 30
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Crispin SCR 133
1 Rosa's Encouragement POR 84
4 Poké Pad POR 81
4 Buddy-Buddy Poffin TEF 144
3 Rare Candy MEG 125
3 Ultra Ball MEG 131
2 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
1 Special Red Card CRI 82
1 Team Rocket's Watchtower DRI 180
1 Jamming Tower TWM 153

Energy: 8
3 Psychic Energy MEE 13
3 Fire Energy MEE 10
2 Darkness Energy MEE 15` },
  { name: "Mega Absol Box", list: `Pokémon: 13
3 Munkidori TWM 95
2 Yveltal MEG 88
2 Mega Absol ex MEG 86
2 Mega Kangaskhan ex MEG 104
1 Bloodmoon Ursaluna ex TWM 141
1 Pecharunt ex SFA 39
1 Latias ex SSP 76
1 Fezandipiti ex ASC 142

Trainer: 38
4 Boss's Orders MEG 114
4 Team Rocket's Petrel DRI 176
3 Janine's Secret Art PRE 112
2 Judge POR 76
1 Aarune DLR 89
1 Eri TEF 146
4 Energy Switch MEG 115
4 Pokégear 3.0 SVI 186
2 Ultra Ball MEG 131
2 Team Rocket's Transceiver DRI 178
2 Night Stretcher ASC 196
2 Special Red Card CRI 82
1 Energy Search POR 72
1 Precious Trolley SSP 185
2 Legendary Pyroduct DLR 94
2 Legendary Pyroduct DLR 95
1 Team Rocket's Factory DRI 173

Energy: 9
9 Darkness Energy MEE 15` },
  { name: "N's Zoroark", list: `Pokémon: 17
4 N's Zorua JTG 97
4 N's Zoroark ex JTG 98
2 N's Zekrom ASC 155
2 Munkidori TWM 95
1 N's Purrloin JTG 96
1 N's Reshiram JTG 116
1 Pecharunt ex SFA 39
1 Fezandipiti ex ASC 142
1 Yveltal MEG 88

Trainer: 35
4 Lillie's Determination MEG 119
3 Cyrano SSP 170
3 Boss's Orders MEG 114
2 Black Belt's Training JTG 143
2 Judge POR 76
4 N's PP Up JTG 153
4 Buddy-Buddy Poffin TEF 144
2 Ultra Ball MEG 131
2 Poké Pad POR 81
2 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
2 Binding Mochi PRE 95
3 Team Rocket's Watchtower DRI 180
1 N's Castle JTG 152

Energy: 8
8 Darkness Energy MEE 15` },
  { name: "Ethan's Typhlosion", list: `Pokémon: 19
4 Ethan's Cyndaquil DRI 32
4 Ethan's Quilava DRI 33
3 Ethan's Typhlosion DRI 34
2 Dreepy TWM 128
2 Drakloak TWM 129
2 Victini SSP 21
1 Fezandipiti ex ASC 142
1 Shaymin DRI 10

Trainer: 36
4 Ethan's Adventure DRI 165
2 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Kieran TWM 154
1 Lana's Aid TWM 155
1 Ruffian JTG 157
4 Ultra Ball MEG 131
4 Poké Pad POR 81
3 Buddy-Buddy Poffin TEF 144
3 Rare Candy MEG 125
2 Night Stretcher ASC 196
1 Secret Box TWM 163
1 Redeemable Ticket JTG 156
1 Special Red Card CRI 82
1 Sacred Ash DRI 168
2 Brave Bangle WHT 80
2 Battle Cage PFL 85
1 Team Rocket's Watchtower DRI 180

Energy: 5
5 Fire Energy MEE 10` },
  { name: "Talonflame Dusknoir", list: `Pokémon: 22
4 Mega Kangaskhan ex MEG 104
3 Duskull PRE 35
2 Dusclops PRE 36
3 Dusknoir PRE 37
3 Talonflame ex DLR 88
2 Meowth ex POR 62
2 Latias ex SSP 76
1 Snorunt ASC 46
1 Mega Froslass ex ASC 47
1 Bloodmoon Ursaluna ex TWM 141

Trainer: 31
4 Hilda WHT 84
3 Cyrano SSP 170
2 Boss's Orders MEG 114
2 Dawn PFL 87
1 Lillie's Determination MEG 119
4 Ultra Ball MEG 131
4 Switch MEG 130
3 Buddy-Buddy Poffin TEF 144
3 Rare Candy MEG 125
3 Poké Pad POR 81
1 Special Red Card CRI 82
1 Jamming Tower TWM 153

Energy: 7
4 Ignition Energy WHT 86
2 Bubbly Water Energy CRI 84
1 Neo Upper Energy TEF 162` },
  { name: "Greninja", list: `Pokémon: 24
3 Froakie CRI 20
2 Frogadier CRI 21
2 Greninja ex TWM 106
1 Greninja ex 30C 21
2 Duskull PRE 35
2 Dusclops PRE 36
2 Dusknoir PRE 37
2 Snorunt ASC 46
2 Mega Froslass ex ASC 47
2 Meowth ex POR 62
1 Staryu POR 20
1 Mega Starmie ex POR 21
1 Fezandipiti ex ASC 142
1 Budew ASC 16

Trainer: 28
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
2 Hilda WHT 84
1 Wally's Compassion MEG 132
1 Judge POR 76
1 Colress's Tenacity SFA 57
1 Team Rocket's Petrel DRI 176
3 Buddy-Buddy Poffin TEF 144
3 Ultra Ball MEG 131
3 Poké Pad POR 81
2 Rare Candy MEG 125
1 Night Stretcher ASC 196
1 Special Red Card CRI 82
1 Switch MEG 130
1 Gravity Mountain SSP 177
1 Grand Tree SCR 136

Energy: 8
4 Water Energy MEE 11
3 Ignition Energy WHT 86
1 Bubbly Water Energy CRI 84` },
  { name: "Mega Lucario", list: `Pokémon: 13
4 Riolu MEG 76
3 Mega Lucario ex MEG 77
3 Solrock MEG 75
2 Lunatone MEG 74
1 Meowth ex POR 62

Trainer: 36
4 Lillie's Determination MEG 119
2 Judge POR 76
2 Boss's Orders MEG 114
1 Wally's Compassion MEG 132
1 Team Rocket's Petrel DRI 176
4 Fighting Gong MEG 116
4 Premium Power Pro MEG 124
4 Ultra Ball MEG 131
4 Poké Pad POR 81
2 Night Stretcher ASC 196
1 Secret Box TWM 163
1 Switch MEG 130
1 Special Red Card CRI 82
1 Air Balloon ASC 181
2 Legendary Pyroduct DLR 94
2 Legendary Pyroduct DLR 95

Energy: 11
9 Fighting Energy MEE 14
2 Rocky Fighting Energy POR 87` },
  { name: "Iron Thorns", list: `Pokémon: 4
4 Iron Thorns ex TWM 77

Trainer: 41
4 Boss's Orders MEG 114
4 Aarune DLR 89
3 Crispin SCR 133
3 Lillie's Determination MEG 119
3 Judge POR 76
1 Xerosic's Machinations SFA 64
1 Colress's Tenacity SFA 57
1 Team Rocket's Petrel DRI 176
4 Crushing Hammer POR 71
4 Pokégear 3.0 SVI 186
2 Adventure Lantern DLR 90
2 Jumbo Ice Cream PFL 91
1 Ultra Ball MEG 131
1 Hero's Cape TEF 152
2 Nighttime Mine ASC 197
2 Legendary Pyroduct DLR 94
2 Legendary Pyroduct DLR 95
1 Team Rocket's Watchtower DRI 180

Energy: 15
4 Lightning Energy MEE 12
4 Voltaic Lightning Energy PBL 84
4 Fire Energy MEE 10
3 Mist Energy TEF 161` },
  { name: "Lucario Hariyama", list: `Pokémon: 16
3 Riolu MEG 76
3 Mega Lucario ex MEG 77
3 Solrock MEG 75
2 Makuhita MEG 72
2 Hariyama MEG 73
2 Lunatone MEG 74
1 Meowth ex POR 62

Trainer: 33
4 Lillie's Determination MEG 119
2 Judge POR 76
2 Boss's Orders MEG 114
1 Ciphermaniac's Codebreaking TEF 145
1 Wally's Compassion MEG 132
4 Ultra Ball MEG 131
4 Premium Power Pro MEG 124
4 Fighting Gong MEG 116
4 Poké Pad POR 81
1 Switch MEG 130
1 Secret Box TWM 163
2 Air Balloon ASC 181
2 Gravity Mountain SSP 177
1 Team Rocket's Watchtower DRI 180

Energy: 11
11 Fighting Energy MEE 14` },
  { name: "Mega Chandelure", list: `Pokémon: 20
4 Litwick PBL 36
4 Lampent PBL 37
4 Chandelure TWM 38
2 Mega Chandelure ex PBL 38
2 Comfey SCR 63
1 Maractus JTG 8
1 Elgyem BLK 40
1 Psyduck ASC 39
1 Shaymin DRI 10

Trainer: 32
4 Hilda WHT 84
4 Lillie's Determination MEG 119
3 Xerosic's Machinations SFA 64
2 Boss's Orders MEG 114
1 Lana's Aid TWM 155
4 Poké Pad POR 81
2 Accompanying Flute TWM 142
2 Pokégear 3.0 SVI 186
2 Rare Candy MEG 125
2 Night Stretcher ASC 196
2 Buddy-Buddy Poffin TEF 144
1 Prime Catcher TEF 157
1 Sacred Ash DRI 168
2 Air Balloon ASC 181

Energy: 8
4 Telepathic Psychic Energy POR 88
2 Fire Energy MEE 10
2 Psychic Energy MEE 13` },
  { name: "Grimmsnarl Froslass", list: `Pokémon: 23
4 Marnie's Impidimp DRI 134
3 Marnie's Morgrem DRI 135
2 Marnie's Grimmsnarl ex DRI 136
4 Munkidori TWM 95
3 Snorunt ASC 46
3 Froslass TWM 53
2 Budew ASC 16
1 Shaymin DRI 10
1 Yveltal MEG 88

Trainer: 28
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
3 Judge POR 76
3 Gwynn PBL 78
4 Poké Pad POR 81
2 Night Stretcher ASC 196
2 Buddy-Buddy Poffin TEF 144
2 Rare Candy MEG 125
1 Unfair Stamp TWM 165
1 Air Balloon ASC 181
3 Spikemuth Gym DRI 169

Energy: 9
9 Darkness Energy MEE 15` },
  { name: "Archaludon", list: `Pokémon: 18
4 Beldum TEF 113
4 Metang TEF 114
2 Metagross CRI 61
2 Duraludon SCR 106
2 Archaludon ex SSP 130
2 Genesect ex BLK 67
1 Meowth ex POR 62
1 Mega Skarmory ex POR 55

Trainer: 23
4 Lillie's Determination MEG 119
3 Team Rocket's Petrel DRI 176
2 Boss's Orders MEG 114
2 Acerola's Mischief MEG 113
2 Philippe CRI 79
3 Poké Pad POR 81
2 Ultra Ball MEG 131
1 Special Red Card CRI 82
1 Precious Trolley SSP 185
3 Battle Cage PFL 85

Energy: 19
16 Metal Energy MEE 16
3 Magnetic Metal Energy CRI 85` },
  { name: "Raging Bolt Ogerpon", list: `Pokémon: 21
3 Mega Kangaskhan ex MEG 104
3 Meowth ex POR 62
2 Raging Bolt ex TEF 123
2 Latias ex SSP 76
2 Teal Mask Ogerpon ex TWM 25
2 Lillie's Clefairy ex JTG 56
1 Iron Crown ex TEF 81
1 Talonflame ex DLR 88
1 Fezandipiti ex ASC 142
1 Wellspring Mask Ogerpon ex TWM 64
1 Chien-Pao SSP 56
1 Enamorus TWM 93
1 Bloodmoon Ursaluna ex TWM 141

Trainer: 26
4 Crispin SCR 133
2 Boss's Orders MEG 114
2 Cyrano SSP 170
1 Ciphermaniac's Codebreaking TEF 145
4 Energy Switch MEG 115
4 Ultra Ball MEG 131
2 Night Stretcher ASC 196
2 Glass Trumpet SCR 135
1 Prime Catcher TEF 157
1 Special Red Card CRI 82
3 Area Zero Underdepths SCR 131

Energy: 13
6 Grass Energy MEE 9
2 Fighting Energy MEE 14
2 Lightning Energy MEE 12
2 Psychic Energy MEE 13
1 Water Energy MEE 11` },
  { name: "Alakazam Dusknoir", list: `Pokémon: 22
4 Duskull PRE 35
2 Dusclops PRE 36
2 Dusknoir PRE 37
2 Abra TWM 80
2 Abra MEG 54
4 Kadabra MEG 55
3 Alakazam MEG 56
2 Budew ASC 16
1 Fezandipiti ex ASC 142

Trainer: 32
4 Gwynn PBL 78
4 Hilda WHT 84
3 Dawn PFL 87
2 Boss's Orders MEG 114
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
4 Rare Candy MEG 125
2 Night Stretcher ASC 196
2 Special Red Card CRI 82
2 Strange Timepiece MEG 128
1 Sacred Ash DRI 168

Energy: 6
4 Telepathic Psychic Energy POR 88
1 Psychic Energy MEE 13
1 Legacy Energy TWM 167` },
  { name: "Mega Excadrill", list: `Pokémon: 18
4 Beldum CRI 59
4 Metang TEF 114
1 Metagross CRI 61
3 Drilbur PBL 46
2 Mega Excadrill ex PBL 65
2 Genesect ex BLK 67
1 Mega Skarmory ex POR 55
1 Fezandipiti ex ASC 142

Trainer: 26
4 Team Rocket's Petrel DRI 176
3 Brock's Scouting JTG 146
2 Judge POR 76
2 Lillie's Determination MEG 119
1 Kieran TWM 154
4 Buddy-Buddy Poffin TEF 144
3 Jumbo Ice Cream PFL 91
1 Energy Recycler DRI 164
1 Ultra Ball MEG 131
1 Special Red Card CRI 82
1 Switch MEG 130
1 Hero's Cape TEF 152
2 Lumiose City POR 77

Energy: 16
16 Metal Energy MEE 16` },
  { name: "Ogerpon Meganium Hydrapple", list: `Pokémon: 21
4 Teal Mask Ogerpon ex TWM 25
2 Chikorita ASC 8
2 Bayleef MEG 9
2 Meganium MEG 10
2 Applin TWM 17
2 Dipplin TWM 18
2 Hydrapple ex SCR 14
2 Meowth ex POR 62
1 Fezandipiti ex ASC 142
1 Celebi MEG 12
1 Tapu Bulu SFA 6

Trainer: 26
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Team Rocket's Petrel DRI 176
1 Briar SCR 132
1 Judge POR 76
1 Lana's Aid TWM 155
4 Bug Catching Set TWM 143
4 Ultra Ball MEG 131
2 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
1 Poké Pad POR 81
4 Forest of Vitality MEG 117

Energy: 13
13 Grass Energy MEE 9` },
  { name: "Dragapult Dudunsparce", list: `Pokémon: 22
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Dunsparce TEF 128
1 Dudunsparce TEF 129
1 Dudunsparce ex JTG 121
2 Munkidori TWM 95
2 Budew ASC 16
1 Fezandipiti ex ASC 142
1 Meowth ex POR 62
1 Shaymin DRI 10

Trainer: 29
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Crispin SCR 133
1 Judge POR 76
1 Rosa's Encouragement POR 84
1 Dawn PFL 87
4 Poké Pad POR 81
4 Buddy-Buddy Poffin TEF 144
3 Night Stretcher ASC 196
3 Ultra Ball MEG 131
1 Unfair Stamp TWM 165
2 Risky Ruins MEG 127

Energy: 9
3 Fire Energy MEE 10
3 Psychic Energy MEE 13
3 Darkness Energy MEE 15` }
];
const DAILY_POOL_FROM = 5;   // daily #5, 13 Nov 2026, is DAILY_POOL[0]
const _dailyDecks = {};
let _dailyViewKey = '';     // the day whose list was opened, so a game past midnight keeps that day's deck
function dailyKey(ts) { return pgDayKey(ts || Date.now()); }
function dailyPick(key) {
  const n = dailyNumber(key);
  if (n < DAILY_POOL_FROM || !DAILY_POOL.length) return { name: DAILY_NAME, list: DAILY_LIST };
  const i = (n - DAILY_POOL_FROM) % (DAILY_POOL.length + 1);
  return i === DAILY_POOL.length ? { name: DAILY_NAME, list: DAILY_LIST } : DAILY_POOL[i];
}
function dailyName(key) { return dailyPick(key || _dailyViewKey || dailyKey()).name; }
// v45: each day's challenge has a number, counted from 9 Nov 2026 as #1.
const DAILY_EPOCH = [2026, 10, 9];
function dailyNumber(key) {
  const p = String(key || dailyKey()).split('-').map(Number);
  const n = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(DAILY_EPOCH[0], DAILY_EPOCH[1], DAILY_EPOCH[2])) / 864e5) + 1;
  return isNaN(n) || n < 1 ? 1 : n;
}
function dailyDeck(key) {
  key = dailyOkKey(key) || dailyOkKey(_dailyViewKey) || dailyKey();
  if (!_dailyDecks[key]) _dailyDecks[key] = { id: DAILY_ID, name: 'Daily challenge', cards: parseDeckList(dailyPick(key).list), history: [], format: 'standard', daily: true };
  return _dailyDecks[key];
}
// 2.5.1: the day a daily game was dealt on, so a game that runs past midnight is scored to that day.
let _dailyPlayKey = '';
function dailyShuffle(arr, key) {
  if (!key) key = _dailyPlayKey = dailyOkKey(_dailyViewKey) || dailyKey();
  return shuffleWith(arr, simRng(strHash('prizetrainer-daily|' + key)));
}
function dailyOkKey(k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : ''; }
function dailyStore() { return (state.daily = state.daily || { results: {} }); }
function dailyStreak() {
  const R = dailyStore().results;
  let n = 0, d = new Date();
  if (!R[dailyKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (R[dailyKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
async function startDaily() {
  const d = dailyDeck();
  if (!d._img) { d.cards = await Promise.all(d.cards.map(c => fetchCardImage(c))); d._img = true; }
  closeSheet();
  game.prizeCount = 6; game.timeLimit = 0; game.tableCheck = false; game.reachCheck = false; game._drillMissWeights = null;
  tournament.active = false;
  startGame(DAILY_ID);
}
function dailyShareText(r, key) {
  const bar = Array.from({ length: 6 }, (_, i) => i < r.score ? '■' : '□').join('');
  return `RdyDeck Daily #${dailyNumber(key)}: ${r.score} of 6 prizes in ${formatTime(r.time)} ${bar}. Same deck and shuffle for everyone today.`;
}
async function shareDaily(k) {
  const key = dailyOkKey(k) || dailyKey(), r = dailyStore().results[key];
  if (!r) { showToast('Play today\'s challenge first.'); return; }
  const text = dailyShareText(r, key), url = shareBaseUrl() + '?ref=daily#daily';
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch (_) {} }
  try { await navigator.clipboard.writeText(text + ' ' + url); showToast('Score copied. Paste it anywhere.'); }
  catch (_) { openSheet(`<div class="modal-title">Your daily score</div><textarea class="nt-area" readonly onclick="this.select()">${esc(text + ' ' + url)}</textarea><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`); }
}
function renderDailyCard() {
  const el = document.getElementById('daily-card');
  if (!el) return;
  const key = dailyKey(), r = dailyStore().results[key], streak = dailyStreak();
  el.innerHTML = `<div class="dc-card">
    <div class="dc-ic">${ic23('calendar')}</div>
    <div class="dc-tx"><div class="dc-t">Daily challenge #${dailyNumber(key)}</div>
      <div class="dc-s">${r ? `Today: <b>${r.score} of 6</b> in ${formatTime(r.time)}` : `Today's deck: ${esc(dailyName(key))}. Same shuffle for everyone`}${streak > 1 ? `. ${streak} day streak` : ''}</div></div>
    ${r ? `<button class="btn btn-sm" onclick="shareDaily()">${ic23('share')}Share</button>` : ''}
    <button class="btn btn-sm btn-primary" onclick="startDaily()">${r ? 'Replay' : 'Play'}</button>
  </div>`;
  renderPuzzleCard();
  renderWhatsNewCard();
}
function dailyAfterReveal(score, elapsed) {
  const area = document.getElementById('prize-reveal-area');
  const old = document.getElementById('daily-banner'); if (old) old.remove();
  if (state.activeDeckId !== DAILY_ID || !area) return;
  const key = dailyOkKey(_dailyPlayKey) || dailyKey(), store = dailyStore();
  let first = false;
  if (!store.results[key]) { store.results[key] = { score, time: elapsed, ts: Date.now() }; first = true; saveState(); }
  const r = store.results[key];
  const b = document.createElement('div');
  b.id = 'daily-banner'; b.className = 'dc-banner';
  b.innerHTML = `<div><b>${first ? `Daily challenge #${dailyNumber(key)} scored` : 'Practice replay'}</b><span>${first ? `${score} of 6 in ${formatTime(elapsed)}. Your first try is the one that counts.` : `Today's score stays ${r.score} of 6 in ${formatTime(r.time)}.`}${dailyStreak() > 1 ? ' ' + dailyStreak() + ' day streak.' : ''}</span></div>
    <button class="btn btn-sm btn-primary" onclick="shareDaily('${key}')">${ic23('share')}Share score</button>`;
  area.parentElement.insertBefore(b, area);
}
function handleDailyHash() {
  if (!/^#daily\b/.test(location.hash || '')) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  showScreen('home');
  openSheet(`<div class="modal-title">Daily challenge #${dailyNumber()}</div>
    <div class="modal-hint" style="margin-bottom:1rem">Everyone gets the same ${esc(dailyName(dailyKey()))} list and the same shuffle today. Find the six prizes as fast as you can. Your first try is your score.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Not now</button><button class="btn btn-primary" onclick="startDaily()">${ic23('play')}Play</button></div>`);
}

// ═══════════ WHAT'S NEW (v2.5) ═══════════
// A short log of the latest update. Edit WHATS_NEW for each release. A
// generation release (2.x) lists what was added, changed or fixed ("Added:",
// "Changed:", "Fixed:"), each with a short description. A small release
// (2.x.y) lists short items like "MEP bug fixed" with no description. It shows in Settings, and once on home for someone who
// used an older version. A brand new user never sees the home card.
// Dates are the release day in US Eastern time (3.3 went live Nov 17 at 9:19 PM Eastern, which is Nov 18 in UTC).
const WHATS_NEW = {
  version: 'v3.4.18',
  date: 'Nov 20, 2026',
  kind: 'small',
  items: [
    { t: 'Guess the Grade added' }
  ]
};
// 3.3: What's new shows the two versions before the latest too, each with its date.
// At each release, move the old WHATS_NEW to the top of this list and keep two.
const WHATS_PREV = [
  { version: 'v3.4.17', date: 'Nov 20, 2026', kind: 'small', items: [
    { t: 'Share card art fixed for 30th Celebration' }
  ] },
  { version: 'v3.4.16', date: 'Nov 20, 2026', kind: 'small', items: [
    { t: 'Clearer grade text when showing local results' }
  ] },
];
const WN_KEY = 'rd_seen_version';
function wnName(w) { return (w || WHATS_NEW).version.replace(/^v/, 'RdyDeck '); }
function wnList(w) {
  w = w || WHATS_NEW;
  const full = w.kind === 'generation';
  return '<ul class="wn-list">' + w.items.map(i =>
    `<li><b>${esc(i.t)}</b>${full && i.d ? `<span>${esc(i.d)}</span>` : ''}</li>`).join('') + '</ul>';
}
/** One version's heading (name and date) and its list. */
function wnBlock(w, first) {
  return `<div class="wn-ver${first ? ' first' : ''}"><div class="wn-sub"><span>${esc(wnName(w))}</span>${w.date ? `<span class="wn-date">${esc(w.date)}</span>` : ''}</div>${wnList(w)}</div>`;
}
function wnMarkSeen() { try { localStorage.setItem(WN_KEY, PT_VERSION); } catch (_) {} }
function openWhatsNew() {
  wnMarkSeen(); renderWhatsNewCard();
  openSheet(`<div class="modal-title">What's new</div>
    ${[WHATS_NEW].concat(WHATS_PREV.slice(0, 2)).map((w, i) => wnBlock(w, i === 0)).join('')}
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Got it</button></div>`);
}
function wnShouldShow() {
  if (WHATS_NEW.version !== PT_VERSION) return false;
  let seen;
  try { seen = localStorage.getItem(WN_KEY); } catch (_) { return false; }
  if (seen === PT_VERSION) return false;
  if (seen === null) {
    // No version seen yet: someone who already has decks or scores used an
    // older version, so they get the card. Anyone else is new.
    const used = (state.decks && state.decks.length) ||
      (state.daily && state.daily.results && Object.keys(state.daily.results).length);
    if (!used) { wnMarkSeen(); return false; }
  }
  return true;
}
function wnDismiss() { wnMarkSeen(); renderWhatsNewCard(); }
function renderWhatsNewCard() {
  const el = document.getElementById('wn-card');
  if (!el) return;
  if (!wnShouldShow()) { el.innerHTML = ''; return; }
  // v72: each change on its own short line, as written, the first 3 here and the rest in What's new.
  const items = WHATS_NEW.items, top = items.slice(0, 3), more = items.length - top.length;
  const lines = top.map(i => `<li>${esc(i.t)}</li>`).join('') + (more ? `<li class="wn-more">and ${more} more in What's new</li>` : '');
  el.innerHTML = `<div class="dc-banner" role="status">
    <div><b>Updated to ${esc(wnName())}</b><ul class="wn-mini">${lines}</ul></div>
    <button class="btn btn-sm btn-primary" onclick="openWhatsNew()">See what's new</button>
    <button class="btn btn-sm" onclick="wnDismiss()">Close</button>
  </div>`;
}

// ═══════════ DAILY PUZZLE (v2.3) ═══════════
// One board a day, the same for everyone: a real turn from two top tournament lists where you
// can win right now if you find the line. Boards are made ahead of time by
// puzzle/tools/make-daily.mjs and checked by the solver, so every one has a sure win.
// The rules engine (puzzle/engine.js) and solver (puzzle/solver.js) load only when you open it.
//
// The five design calls, set to the safest choice until Mason picks (each is one line here):
const PUZZLE_RULES = {
  strict: true,          // 1. A line that draws, flips or looks at unknown cards never counts as a win.
  prizesFaceDown: true,  // 2. Prize cards taken during the turn go to your hand face down (the engine does this).
  goal: 'prizes',        // 4. Today's goal: take your last Prize cards this turn (the pack only has this kind).
  pack: 'puzzle/daily.json', // 5. A pack made ahead of time, not boards dealt live on the phone.
};                       // 3. Goldfish keeps its own rules for now and moves onto this engine after the deck builder.
// Which board a day gets: the pack is played in order from this date, the same board for everyone each day.
// The pack runs easy, easy, medium, medium, medium, hard, hard, so it starts on a Monday
// (9 Nov 2026, the same day as the Daily challenge) to keep the hard boards at the weekend.
const PUZZLE_EPOCH = [2026, 10, 9];
const PUZZLE_SCRIPTS = ['puzzle/text.js', 'puzzle/engine.js', 'puzzle/solver.js'];
let _pzKit = null, pzS = null;
function puzzleBoardDay(key) {
  const p = String(key || dailyKey()).split('-').map(Number);
  const n = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(PUZZLE_EPOCH[0], PUZZLE_EPOCH[1], PUZZLE_EPOCH[2])) / 864e5) + 1;
  return isNaN(n) || n < 1 ? 1 : n;
}
function puzzleStore() { return (state.puzzle = state.puzzle || { results: {} }); }
// Your own puzzle number: #1 is the first day you played, then one more each day you play.
// Kept on this device with the rest of your saved data.
function puzzleNumber(key) {
  key = key || dailyKey();
  const R = puzzleStore().results;
  if (R[key] && R[key].num) return R[key].num;
  return Object.keys(R).filter(k => k < key).length + 1;
}
// Days in a row, counted back from today (or yesterday, while today is still open).
function puzzleRun(test) {
  const R = puzzleStore().results;
  let n = 0, d = new Date();
  if (!R[dailyKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (R[dailyKey(d.getTime())] && test(R[dailyKey(d.getTime())])) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function puzzleStats() {
  const all = Object.values(puzzleStore().results);
  return { played: all.length, won: all.filter(r => r.won).length, playRun: puzzleRun(() => true), winRun: puzzleRun(r => r.won) };
}
function puzzleStreakText(st) {
  const bits = [];
  if (st.winRun > 1) bits.push(`${st.winRun} wins in a row`);
  if (st.playRun > 1 && st.playRun !== st.winRun) bits.push(`${st.playRun} days in a row`);
  return bits.join(', ');
}
function loadPuzzleKit() {
  if (_pzKit) return _pzKit;
  const add = src => new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(el); });
  _pzKit = PUZZLE_SCRIPTS.reduce((p, src) => p.then(() => add(src)), Promise.resolve())
    .then(() => fetch(PUZZLE_RULES.pack).then(r => { if (!r.ok) throw new Error('Could not load the puzzles'); return r.json(); }))
    .then(pack => ({ E: window.RdyPuzzle, pack }));
  _pzKit.catch(() => { _pzKit = null; });
  return _pzKit;
}
function renderPuzzleCard() {
  const el = document.getElementById('puzzle-card');
  if (!el) return;
  const key = dailyKey(), r = puzzleStore().results[key], st = puzzleStats(), runs = puzzleStreakText(st);
  const sub = r ? (r.won ? `Today: <b>won</b> in ${r.moves} play${r.moves === 1 ? '' : 's'}${r.best ? (r.moves <= r.best ? ', the shortest win' : `, best ${r.best}`) : ''}` : r.peek ? 'Today: you looked at the answer' : 'Today: <b>no win</b> on your first try')
    : st.played ? `${st.won} solved of ${st.played} played` : 'Win this turn from a real tournament board';
  el.innerHTML = `<div class="dc-card">
    <div class="dc-ic">${ic23('target')}</div>
    <div class="dc-tx"><div class="dc-t">Your puzzle #${puzzleNumber(key)}</div>
      <div class="dc-s">${sub}${runs ? '. ' + runs : ''}</div></div>
    ${r ? `<button class="btn btn-sm" onclick="sharePuzzle()">${ic23('share')}Share</button>` : ''}
    <button class="btn btn-sm btn-primary" onclick="openPuzzle()">${r ? 'Replay' : 'Play'}</button>
  </div>`;
}
async function openPuzzle() {
  closeSheet();
  showLoading('Loading today\'s puzzle…');
  let kit;
  try { kit = await loadPuzzleKit(); } catch (e) { hideLoading(); showToast('The puzzle needs a connection the first time. Try again in a moment.'); return; }
  hideLoading();
  const key = dailyKey(), n = puzzleNumber(key), list = kit.pack.puzzles;
  const p = list[(puzzleBoardDay(key) - 1) % list.length];
  const s0 = kit.E.fromPuzzle(Object.assign({ cards: kit.pack.cards }, p), { play: true }); // play: a search finds the real cards
  pzS = { E: kit.E, cards: kit.pack.cards, key, n, p, s0, s: s0, hist: [], plays: 0, over: false, showAns: false, opp: '' };
  showScreen('puzzle');
  renderPuzzle();
}
const pzEnergyWord = name => String(name).replace(/^Basic /, '').replace(/ Energy$/, '');
function pzEnergyText(list) {
  const g = new Map(); list.forEach(r => { const k = pzEnergyWord(r.card.name); g.set(k, (g.get(k) || 0) + 1); });
  return [...g].map(([k, n]) => n > 1 ? `${esc(k)} ×${n}` : esc(k)).join(', ');
}
function pzMonName(s, id) {
  const E = pzS.E;
  for (let k = 0; k < 2; k++) {
    const P = s.players[k], ms = E.mons(P), m = ms.find(z => z.id === id);
    if (!m) continue;
    const nm = E.topOf(m).card.name, whose = k === s.cur ? '' : 'their ';
    if (P.active === m) return whose + nm + ' (Active)';
    const same = P.bench.filter(z => E.topOf(z).card.name === nm);
    return whose + nm + (same.length > 1 || (P.active && E.topOf(P.active).card.name === nm) ? ` (Bench ${P.bench.indexOf(m) + 1})` : '');
  }
  return 'a Pokémon';
}
function pzRefName(s, uid) {
  for (const P of s.players) for (const z of [P.hand, P.deck, P.discard]) { const r = z.find(y => y.uid === uid); if (r) return r.card.name; }
  for (const P of s.players) for (const m of pzS.E.mons(P)) { const r = m.energy.find(y => y.uid === uid); if (r) return r.card.name; }
  return 'a card';
}
function pzNames(s, uids) {
  const g = new Map(); uids.forEach(u => { const n = pzRefName(s, u); g.set(n, (g.get(n) || 0) + 1); });
  return [...g].map(([k, n]) => n > 1 ? `${n} ${k}` : k).join(', ');
}
/** Words for an action, as the player would say it. */
function pzLabel(s, a) {
  const E = pzS.E, P = s.players[s.cur], card = uid => pzRefName(s, uid), mon = id => pzMonName(s, id);
  switch (a.t) {
    case 'bench': return 'Bench ' + card(a.uid);
    case 'evolve': return `Evolve ${mon(a.mon)} into ${card(a.uid)}`;
    case 'candy': return `Rare Candy: ${mon(a.mon)} into ${card(a.s2)}`;
    case 'energy': return `${card(a.uid)} to ${mon(a.mon)}`;
    case 'tool': return `Attach ${card(a.uid)} to ${mon(a.mon)}`;
    case 'stadium': case 'trainer': return 'Play ' + card(a.uid);
    case 'stadiumUse': return 'Use ' + s.stadium.ref.card.name;
    case 'ability': { const m = E.mons(P).find(z => z.id === a.mon); return `${mon(a.mon)}: ${E.readAbilities(E.topOf(m))[a.i].name}`; }
    case 'handAbility': { const r = P.hand.find(y => y.uid === a.uid); return `${r.card.name} from your hand: ${E.readAbilities(r)[a.i].name}`; }
    case 'retreat': return a.mon ? `Retreat into ${mon(a.mon)}${a.pay && a.pay.length ? ', discarding ' + pzNames(s, a.pay) : ''}` : 'Retreat';
    case 'attack': { const c = E.topOf(P.active).card.attacks[a.i]; return `${c.name}${c.dmg ? ' (' + c.dmg + ')' : ''}`; }
    case 'promote': return 'Make ' + mon(a.mon) + ' Active';
    case 'end': return 'End your turn';
  }
  return a.t;
}
function pzPickLabel(s, v) {
  const R = s.pending, A = R.ask, st = R.steps[A.step], mon = id => pzMonName(s, id);
  switch (A.kind) {
    case 'yesno': return v ? 'Yes' : 'No';
    case 'option': return st.opts[v].label;
    case 'benchMon': return 'Switch in ' + mon(v);
    case 'oppBench': return 'Bring up ' + mon(v);
    case 'oppMon': return mon(v);
    case 'benchHit': return mon(v);
    case 'moveCounters': return `${v.n} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveEnergy': return `${pzRefName(s, v.uid)} from ${mon(v.from)} to ${mon(v.to)}`;
    case 'moveToSelf': return v == null ? 'Done' : `${pzRefName(s, v.uid)} from ${mon(v.from)}`;
    case 'pickUp': return mon(v);
    case 'attach': return v == null ? 'Done' : `${pzRefName(s, v.uid)} to ${mon(v.mon)}`;
    case 'cost': case 'search': case 'recover': return v.length ? pzNames(s, v) : 'Take nothing';
    case 'topFromHand': return pzRefName(s, v);
    case 'splitAttach': return mon(v);
    case 'splitHand': return 'Put ' + pzRefName(s, v.uid) + ' into your hand';
  }
  return String(v);
}
function pzAskText(s) {
  const R = s.pending, A = R.ask, st = R.steps[A.step], who = R.ctx.name ? esc(R.ctx.name) + ': ' : '';
  const q = {
    yesno: A.q || (st.t === 'switchSelf' ? 'Switch it into the Active Spot?' : 'Do it?'),
    option: 'Choose one', benchMon: 'Choose your new Active Pokémon', oppBench: 'Choose which of their Benched Pokémon comes up',
    oppMon: `Put ${st.n} damage counters on which Pokémon?`, benchHit: `Put ${st.dmg} damage on which Benched Pokémon?`, moveCounters: 'Move damage counters', moveEnergy: 'Move an Energy',
    moveToSelf: 'Move Energy to this Pokémon', pickUp: 'Choose a Pokémon to pick up', attach: 'Attach Energy',
    cost: `Discard ${st.n} card${st.n === 1 ? '' : 's'} from your hand`, search: 'Choose cards from your deck', recover: 'Choose cards from your discard pile',
    topFromHand: 'Choose a card to put on top of your deck', splitHand: 'Which one goes to your hand? The other gets attached.', splitAttach: `Attach ${R.ctx.splitRef ? esc(R.ctx.splitRef.card.name) : 'the other card'} to which Pokémon?`,
  }[A.kind] || 'Choose';
  return who + q;
}
function pzMonTile(s, m, owner, isActive) {
  const E = pzS.E, top = E.topOf(m), c = top.card, hp = E.maxHp(s, m), left = Math.max(0, hp - m.dmg), pct = hp ? Math.round(left / hp * 100) : 0;
  return `<button class="mt-mon pz-mon${isActive ? ' act' : ''}" onclick="pzCardSheet('${owner}',${m.id})">
    <span class="mt-art">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : '<span class="pz-noimg"></span>'}${m.dmg ? `<span class="mt-dmg">${m.dmg}</span>` : ''}</span>
    <span class="mt-tx"><span class="mt-nm">${esc(c.name)}</span>
      <span class="mt-hp${m.dmg ? ' hurt' : ''}"><b>${left}</b> of ${hp} HP${m.dmg ? `, ${m.dmg / 10} damage counter${m.dmg === 10 ? '' : 's'}` : ''}</span>
      <span class="mt-bar${pct <= 34 ? ' low' : ''}"><i style="width:${pct}%"></i></span>
      ${m.energy.length ? `<span class="mt-ens">${mtEnergyHTML(m.energy.map(r => pzEnergyWord(r.card.name)))}</span>` : ''}
      ${m.tool ? `<span class="mt-tool">${esc(m.tool.card.name)}</span>` : ''}
      ${m.stack.length > 1 ? `<span class="pz-under">Evolved from ${esc(m.stack.slice(0, -1).map(r => r.card.name).join(', '))}</span>` : ''}
    </span></button>`;
}
/** Your hand as cards you can read, with a count on repeats. */
function pzHandHTML(list) {
  const g = new Map(); let hidden = 0;
  list.forEach(r => { if (r.card.cat === 'hidden') { hidden++; return; } const k = r.card.key; if (!g.has(k)) g.set(k, { c: r.card, n: 0 }); g.get(k).n++; });
  const tiles = [...g.values()].map(x => `<button class="mt-card" onclick="pzHandSheet('${esc(x.c.key)}')"><span class="mt-cimg">${x.c.img ? `<img src="${esc(x.c.img)}" alt="" loading="lazy">` : `<span class="mt-cph">${esc(x.c.name)}</span>`}${x.n > 1 ? `<span class="mt-cnt">×${x.n}</span>` : ''}</span><span class="mt-cnm">${esc(x.c.name)}</span></button>`);
  if (hidden) tiles.push(`<span class="mt-card off"><span class="mt-cimg mt-back"></span><span class="mt-cnm">${hidden} face down</span></span>`);
  return tiles.length ? `<div class="mt-hand">${tiles.join('')}</div>` : '<span class="pz-none">Empty</span>';
}
function pzCards(list, opts) {
  const g = new Map(); let hidden = 0;
  // r.unsure: a real deck card that could have been a Prize, so it stays face down until you search.
  list.forEach(r => { if (r.card.cat === 'hidden' || r.unsure) { hidden++; return; } const k = r.card.key; if (!g.has(k)) g.set(k, { c: r.card, n: 0 }); g.get(k).n++; });
  const chips = [...g.values()].map(x => `<button class="pz-chip" onclick="pzKeySheet('${esc(x.c.key)}')">${x.n > 1 ? `<b>${x.n}</b> ` : ''}${esc(x.c.name)}</button>`);
  if (hidden) chips.push(`<span class="pz-chip off">${hidden} face down</span>`);
  return chips.length ? chips.join('') : `<span class="pz-none">${opts && opts.empty || 'None'}</span>`;
}
function pzSide(s, k) {
  const P = s.players[k], mine = k === s.cur, who = mine ? 'me' : 'opp';
  const head = `<div class="mt-head"><span class="mt-who">${mine ? 'You' : 'Your opponent'}</span>
    <span class="mt-przw">${mtPrizes(P.prizes.length)}<span class="pz-pr">${P.prizes.length} Prize card${P.prizes.length === 1 ? '' : 's'} left</span></span></div>`;
  const main = `<div class="mt-main"><div class="mt-zone mt-actz"><div class="mt-lbl">Active</div>
      ${P.active ? pzMonTile(s, P.active, who, true) : '<div class="mt-empty">No Active Pokémon</div>'}</div>
    <div class="mt-piles">${mine ? '' : mtPile('Hand', P.hand.length)}${mtPile('Deck', P.deck.length)}${mtPile('Discard', P.discard.length)}</div></div>`;
  const bench = `<div class="mt-zone"><div class="mt-lbl">Bench <span>${P.bench.length} of 5</span></div>
    ${P.bench.length ? `<div class="mt-bench pz-bench">${P.bench.map(m => pzMonTile(s, m, who, false)).join('')}</div>` : '<div class="mt-open">Empty</div>'}</div>`;
  return `<div class="mt-half pz-side ${who}">${head}${mine ? main + bench : bench + main}</div>`;
}
/** Below the mat: your hand as cards, then what is in your deck and discard pile. */
function pzMine(s) {
  const P = s.players[s.cur];
  let h = `<div class="pz-zone mt-handw"><div class="pz-zt">Your hand (${P.hand.length})</div>${pzHandHTML(P.hand)}</div>`;
  h += `<details class="pz-zone"><summary>Deck: ${P.deck.length} cards, ${P.deck.filter(r => r.card.cat !== 'hidden' && !r.unsure).length} you know are there</summary><div>${pzCards(P.deck)}</div></details>`;
  h += `<details class="pz-zone"><summary>Discard pile: ${P.discard.length}</summary><div>${pzCards(P.discard, { empty: 'Empty' })}</div></details>`;
  return h;
}
function renderPuzzle() {
  const el = document.getElementById('pz-body');
  if (!el || !pzS) return;
  const { E, s, p } = pzS;
  document.getElementById('pz-title').textContent = `Your puzzle #${pzS.n}`;
  const R = puzzleStore().results[pzS.key];
  let h = `<div class="pz-wrap">`;
  // The goal names the Prize cards you started with, so it still reads right after you take them.
  const pzLeft = (pzS.s0 || s).players[0].prizes.length;
  h += `<div class="pz-goal"><b>Win this turn.</b> Take your last ${pzLeft === 1 ? 'Prize card' : pzLeft + ' Prize cards'} before your turn ends. Tap any card to read it.
    <span>Lists: ${esc(p.from.mine)} against ${esc(p.from.theirs)}${p.from.event ? `, from ${esc(p.from.event)}` : ''}.${R && !pzS.over ? ' Replay: today\'s result is already saved.' : ''}</span></div>`;
  h += `<div class="mt-mat pz-mat">${pzSide(s, 1)}
    <div class="mt-mid">${s.stadium ? `<span class="mt-lbl">Stadium</span><button class="pz-chip mt-stad" onclick="pzKeySheet('${esc(s.stadium.ref.card.key)}')">${esc(s.stadium.ref.card.name)}</button>` : '<span class="mt-lbl">No Stadium in play</span>'}</div>
    ${pzSide(s, 0)}</div>`;
  h += pzMine(s);
  h += `<div class="pz-act" id="pz-act">${pzActions()}</div>`;
  if (s.log.length) h += `<details class="pz-zone pz-logw" open><summary>This turn</summary><ol class="pz-log">${s.log.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>`;
  if (pzS.showAns) h += pzAnswer();
  el.innerHTML = h + `</div>`;
}
function pzActions() {
  const { E, s } = pzS;
  const tools = `<div class="pz-tools"><button class="btn btn-sm" onclick="pzUndo()" ${pzS.hist.length ? '' : 'disabled'}>${ic23('undo')}Undo</button>
    <button class="btn btn-sm" onclick="pzReset()" ${pzS.hist.length ? '' : 'disabled'}>Start over</button>
    ${pzS.showAns ? '' : `<button class="btn btn-sm btn-ghost" onclick="pzPeek()">${ic23('eye')}Show the answer</button>`}</div>`;
  if (pzS.over) return pzResult() + tools;
  let h = '';
  if (s.luck || s.unread.length) h += `<div class="pz-warn">${s.luck ? 'That play draws, flips or takes a card you can\'t see, so this line can\'t count as a sure win. Undo it and find a line with no luck.' : 'That play does something RdyDeck can\'t read yet, so it can\'t count. Undo it and try another line.'}</div>`;
  const acts = E.legalActions(s, { why: true });
  // A new Active comes first (the engine asks for it before any choice an effect is waiting on).
  if (s.promote && s.promote.length) {
    h += `<div class="pz-q">Choose your new Active Pokémon</div><div class="pz-btns">`;
    acts.forEach((a, i) => { h += `<button class="btn pz-b" onclick="pzDo(${i})">${esc(pzLabel(s, a))}</button>`; });
    return h + `</div>` + tools;
  }
  if (s.pending && s.pending.ask) {
    if (typeof pzPickWanted === 'function' && pzPickWanted(s, acts)) return h + pzPickHTML(s, acts, tools); // many answers: pick cards one at a time (puzzle-extras.js)
    h += `<div class="pz-q">${pzAskText(s)}</div><div class="pz-btns">`;
    acts.forEach((a, i) => { h += `<button class="btn pz-b" onclick="pzDo(${i})">${esc(pzPickLabel(s, a.v))}</button>`; });
    return h + `</div>` + tools;
  }
  const ok = [], no = [], seen = new Set();
  acts.forEach((a, i) => {
    const label = pzLabel(s, a);
    if (seen.has(label + (a.why || ''))) return; seen.add(label + (a.why || ''));
    (a.why ? no : ok).push({ a, i, label });
  });
  // Grouped in turn order, so a long list on a phone is easy to scan.
  const groups = [['hand', 'From your hand'], ['energy', 'Attach Energy'], ['ability', 'Abilities'], ['retreat', 'Retreat'], ['attack', 'Attack'], ['end', '']];
  const kind = a => a.t === 'attack' ? 'attack' : a.t === 'end' ? 'end' : a.t === 'energy' ? 'energy' : a.t === 'ability' ? 'ability' : a.t === 'retreat' ? 'retreat' : 'hand';
  h += `<div class="pz-q">Your move</div>`;
  groups.forEach(([g, title]) => {
    const list = ok.filter(x => kind(x.a) === g);
    if (!list.length) return;
    if (title) h += `<div class="pz-gt">${title}</div>`;
    h += `<div class="pz-btns">${list.map(x => `<button class="btn pz-b${g === 'attack' ? ' btn-primary' : g === 'end' ? ' btn-ghost' : ''}" onclick="pzDo(${x.i})">${esc(x.label)}</button>`).join('')}</div>`;
  });
  if (no.length) h += `<details class="pz-zone pz-no"><summary>Can't do right now (${no.length})</summary><ul>${no.map(x => `<li><b>${esc(x.label)}</b> ${esc(x.a.why)}</li>`).join('')}</ul></details>`;
  return h + tools;
}
function pzDo(i) {
  if (!pzS || pzS.over) return;
  const { E } = pzS;
  const a = E.legalActions(pzS.s, { why: true })[i];
  if (!a || a.why) return;
  pzS.hist.push({ s: pzS.s, plays: pzS.plays });
  if (!/^(pick|promote)$/.test(a.t)) pzS.plays++;
  let s = E.apply(pzS.s, a);
  // The opponent's own choices (a new Active after a Knock Out) are made for them: the one that is hardest for you.
  for (let guard = 0; guard < 6 && !E.goalMet(s) && pzOppTurn(s); guard++) s = pzOppPick(s);
  pzS.s = s;
  if (E.goalMet(s) || s.ended) pzFinish();
  renderPuzzle();
}
function pzOppTurn(s) {
  if (s.ended) return false;
  if (s.promote && s.promote.length) return s.promote[0] !== s.cur;
  return !!(s.pending && s.pending.who !== s.cur);
}
function pzOppPick(s) {
  const E = pzS.E;
  let best = null, bv = -1;
  for (const a of E.legalActions(s)) {
    const r = E.solve(E.apply(s, a), { maxNodes: 20000, maxMoves: 6 });
    const v = r.win ? r.moves : Infinity;
    if (v > bv) { bv = v; best = a; }
  }
  return E.apply(s, best || E.legalActions(s)[0]);
}
function pzUndo() { if (!pzS || !pzS.hist.length) return; const h = pzS.hist.pop(); pzS.s = h.s; pzS.plays = h.plays; pzS.over = false; renderPuzzle(); }
function pzReset() { if (!pzS) return; pzS.s = pzS.s0; pzS.hist = []; pzS.plays = 0; pzS.over = false; renderPuzzle(); }
function pzPeek() {
  if (!pzS) return;
  const store = puzzleStore();
  if (!store.results[pzS.key]) { store.results[pzS.key] = { won: false, peek: true, moves: 0, best: pzS.p.moves, num: pzS.n, ts: Date.now() }; saveState(); }
  pzS.showAns = true;
  renderPuzzle();
  const el = document.getElementById('pz-ans'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function pzAnswer() {
  const p = pzS.p;
  return `<div class="pz-ans" id="pz-ans"><div class="pz-zt">One winning line (${p.moves} play${p.moves === 1 ? '' : 's'})</div>
    <ol class="pz-log">${p.answer.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    <div class="pz-s">Any line that wins with no luck counts, not only this one.</div></div>`;
}
function pzFinish() {
  const { E, s } = pzS, won = E.goalMet(s);
  pzS.over = true;
  const store = puzzleStore();
  pzS.first = false;
  if (!store.results[pzS.key]) { store.results[pzS.key] = { won, moves: pzS.plays, best: pzS.p.moves, num: pzS.n, ts: Date.now() }; pzS.first = true; saveState(); }
  if (typeof renderPuzzleCard === 'function') renderPuzzleCard();
}
function pzResult() {
  const { E, s, p } = pzS, won = E.goalMet(s), r = puzzleStore().results[pzS.key];
  const why = won ? '' : s.gameOver === 'sudden' ? 'You both took your last Prize card at the same time. That goes to Sudden Death, so it is not a win.'
    : s.gameOver === 1 ? (s.players[1].prizes.length ? 'You have no Pokémon left in play, so your opponent wins.' : 'Your opponent took their last Prize card first, so they win.')
    : s.luck ? 'The line used a draw, a flip or a card you couldn\'t see, so it can\'t count as a sure win.'
    : s.unread.length ? 'The line used something RdyDeck can\'t read yet.' : 'Your turn ended before you took your last Prize card.';
  const saved = pzS.first ? 'Your first try is the one that counts.' : r ? (r.won ? `Today's result stays a win in ${r.moves} play${r.moves === 1 ? '' : 's'}.` : r.peek ? 'Practice replay: you looked at the answer today.' : 'Practice replay: today\'s result stays no win.') : '';
  return `<div class="dc-banner pz-res ${won ? 'win' : 'loss'}"><div><b>${won ? `You won in ${pzS.plays} play${pzS.plays === 1 ? '' : 's'}` : 'No win this time'}</b>
    <span>${won ? (pzS.plays <= p.moves ? 'That is the shortest win.' : `The shortest win takes ${p.moves}.`) : esc(why)} ${saved} ${pzTally()}</span></div>
    ${r ? `<button class="btn btn-sm btn-primary" onclick="sharePuzzle('${dailyOkKey(pzS.key)}')">${ic23('share')}Share</button>` : ''}</div>`;
}
function pzTally() {
  const st = puzzleStats(), runs = puzzleStreakText(st);
  return st.played ? `${st.won} solved of ${st.played} played${runs ? ', ' + runs : ''}.` : '';
}
function puzzleShareText(r, key) {
  const st = puzzleStats(), runs = puzzleStreakText(st);
  return `RdyDeck Daily Puzzle, my #${r.num || puzzleNumber(key)}: ${r.won ? `won this turn in ${r.moves} play${r.moves === 1 ? '' : 's'}` : r.peek ? 'I needed the answer today' : 'no win on my first try'}${runs ? '. ' + runs.charAt(0).toUpperCase() + runs.slice(1) : ''}. Same board for everyone today.`;
}
async function sharePuzzle(k) {
  if (typeof pzShareScore === 'function') return pzShareScore(k); // 3.3.9: picture of your score against the best (puzzle-extras.js)
  const key = dailyOkKey(k) || dailyKey(), r = puzzleStore().results[key];
  if (!r) { showToast('Play today\'s puzzle first.'); return; }
  const text = puzzleShareText(r, key), url = shareBaseUrl() + '?ref=puzzle#puzzle';
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch (_) {} }
  try { await navigator.clipboard.writeText(text + ' ' + url); showToast('Result copied. Paste it anywhere.'); }
  catch (_) { openSheet(`<div class="modal-title">Your puzzle result</div><textarea class="nt-area" readonly onclick="this.select()">${esc(text + ' ' + url)}</textarea><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`); }
}
function pzTypeWord(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
function pzCardHtml(c, extra, acts) {
  let h = `<div class="pz-card">${c.img ? `<img src="${esc(c.img.replace(/\.png$/, '_hires.png'))}" onerror="this.onerror=null;this.src='${esc(c.img)}'" alt="${esc(c.name)}">` : ''}<div class="pz-ctx">`;
  h += `<div class="modal-title">${esc(c.name)}</div>`;
  if (extra) h += `<div class="pz-s">${extra}</div>`;
  if (c.cat === 'pokemon') {
    h += `<div class="pz-s">${c.hp} HP${c.types && c.types.length ? ', ' + c.types.map(pzTypeWord).join(' and ') : ''}. ${c.stage === 'basic' ? 'Basic' : c.stage === 'stage1' ? 'Stage 1' : 'Stage 2'}${c.from ? ', evolves from ' + esc(c.from) : ''}. Gives up ${c.p} Prize card${c.p === 1 ? '' : 's'}.</div>`;
    (c.abil || []).forEach(([n, t]) => { h += `<div class="pz-tx"><b>Ability: ${esc(n)}</b> ${esc(t)}</div>`; });
    (c.attacks || []).forEach(a => { h += `<div class="pz-tx"><b>${esc(a.name)}${a.dmg ? ' ' + esc(a.dmg) : ''}</b> <span class="pz-cost">${a.cost.length ? a.cost.map(pzTypeWord).join(', ') : 'No Energy'}</span>${a.text ? ' ' + esc(a.text) : ''}</div>`; });
    h += `<div class="pz-s">Weakness: ${c.weak ? pzTypeWord(c.weak.type) + (c.weak.x ? ' ×' + c.weak.x : ' +' + c.weak.plus) : 'none'}. Resistance: ${c.res ? pzTypeWord(c.res.type) + ' -' + c.res.n : 'none'}. Retreat: ${c.retreat}.</div>`;
  } else {
    if (c.kind) h += `<div class="pz-s">${c.ace ? 'ACE SPEC ' : ''}${pzTypeWord(c.kind === 'tool' ? 'Pokémon Tool' : c.kind)}</div>`;
    if (c.rtext) h += `<div class="pz-tx">${esc(c.rtext)}</div>`;
  }
  return h + `${acts || ''}</div></div><div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Done</button></div>`;
}
function pzKeySheet(key) {
  if (!pzS) return;
  const card = pzS.cards[key] || findPuzzleCard(key);
  if (card) openSheet(pzCardHtml(card));
}
/** 3.4: the moves that use one card or one of your Pokemon, as buttons in its sheet, so you play it from there. */
function pzActsFor(test) {
  const { E, s } = pzS;
  if (pzS.over || (s.pending && s.pending.ask) || (s.promote && s.promote.length)) return '';
  const ok = [], no = [], seen = new Set();
  E.legalActions(s, { why: true }).forEach((a, i) => {
    if (!test(a)) return;
    const label = pzLabel(s, a), k = label + (a.why || '');
    if (seen.has(k)) return; seen.add(k);
    (a.why ? no : ok).push({ a, i, label });
  });
  if (!ok.length && !no.length) return '';
  return `<div class="pz-gt">Your move</div><div class="pz-btns">${ok.map(x => `<button class="btn pz-b${x.a.t === 'attack' ? ' btn-primary' : ''}" onclick="closeSheet();pzDo(${x.i})">${esc(x.label)}</button>`).join('')}</div>`
    + no.slice(0, 3).map(x => `<div class="pz-s"><b>${esc(x.label)}</b> ${esc(x.a.why)}</div>`).join('');
}
function pzHandSheet(key) {
  if (!pzS) return;
  const P = pzS.s.players[pzS.s.cur], uids = new Set(P.hand.filter(r => r.card.key === key).map(r => r.uid));
  const card = pzS.cards[key] || findPuzzleCard(key);
  if (card) openSheet(pzCardHtml(card, '', pzActsFor(a => uids.has(a.uid) || uids.has(a.s2))));
}
function findPuzzleCard(key) {
  const s = pzS.s;
  for (const P of s.players) {
    for (const z of [P.hand, P.deck, P.discard]) { const r = z.find(y => y.card.key === key); if (r) return r.card; }
    for (const m of pzS.E.mons(P)) { for (const r of m.stack.concat(m.energy, m.tool ? [m.tool] : [])) if (r.card.key === key) return r.card; }
  }
  if (s.stadium && s.stadium.ref.card.key === key) return s.stadium.ref.card;
  return null;
}
function pzCardSheet(who, id) {
  if (!pzS) return;
  const { E, s } = pzS, P = s.players[who === 'me' ? 0 : 1], m = E.mons(P).find(z => z.id === id);
  if (!m) return;
  const hp = E.maxHp(s, m);
  const extra = `${Math.max(0, hp - m.dmg)} of ${hp} HP left${m.energy.length ? '. Energy: ' + pzEnergyText(m.energy) : ''}${m.tool ? '. Tool: ' + esc(m.tool.card.name) + (m.tool.card.rtext ? ' (' + esc(m.tool.card.rtext) + ')' : '') : ''}.`;
  const mine = who === 'me' && P === s.players[s.cur];
  openSheet(pzCardHtml(E.topOf(m).card, extra, mine ? pzActsFor(a => a.mon === id || ((a.t === 'attack' || a.t === 'retreat') && P.active === m)) : ''));
}
function handlePuzzleHash() {
  if (!/^#puzzle\b/.test(location.hash || '')) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
  showScreen('home');
  openSheet(`<div class="modal-title">Daily puzzle</div>
    <div class="modal-hint" style="margin-bottom:1rem">A real board from two top tournament lists, the same for everyone today. You can win this turn if you find the line. Your first try is your score.</div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Not now</button><button class="btn btn-primary" onclick="openPuzzle()">${ic23('play')}Play</button></div>`);
}

// ═══════════ "CAN I STILL GET X?" (v23 reach check) ═══════════
// Turned on in Modes. Before the reveal, three yes or no questions on
// whether a card is still in the deck, scored with the game.
function buildReachQs() {
  const pz = pileTotals(game.prizes), vis = pileTotals(game.visible || []), hd = pileTotals(game.hand || []);
  const all = pileTotals(game.prizes.concat(game.visible || [], game.hand || []));
  const keys = [...all.keys()];
  const gone = shuf(keys.filter(k => !vis.has(k) && pz.has(k)));
  const some = shuf(keys.filter(k => vis.has(k) && pz.has(k)));
  const rest = shuf(keys.filter(k => vis.has(k) && !pz.has(k) && all.get(k).n >= 2));
  const pick = [];
  const add = arr => { for (const k of arr) if (!pick.includes(k)) { pick.push(k); return true; } return false; };
  add(gone); add(some); add(rest);
  const any = shuf(keys.slice());
  while (pick.length < 3 && add(any)) {}
  return shuf(pick.slice(0, 3)).map(k => ({ k, name: all.get(k).name, left: vis.has(k) ? vis.get(k).n : 0, prized: pz.has(k) ? pz.get(k).n : 0, inHand: hd.has(k) ? hd.get(k).n : 0, ans: null }));
}
function openReach() {
  const R = game._reach;
  const i = R.qs.findIndex(q => q.ans == null);
  const done = i < 0;
  const q = done ? null : R.qs[i];
  const fb = R.qs.filter(x => x.ans != null).map(x => {
    const ok = x.ans === (x.left > 0);
    return `<div class="rc-fb ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Right' : 'Not quite'}: ${esc(x.name)}</b> ${x.left > 0 ? `${x.left} still in the deck` : 'none left in the deck'}${x.prized ? `, ${x.prized} prized` : ''}${x.inHand ? `, ${x.inHand} in hand` : ''}.</div>`;
  }).join('');
  openSheet(`<div class="modal-title">Can you still get it?</div>
    <div class="modal-hint" style="margin-bottom:0.75rem">From what you saw in the deck. Question ${done ? R.qs.length : i + 1} of ${R.qs.length}.</div>
    ${fb}
    ${done ? `<div class="modal-actions"><button class="btn btn-primary" id="rc-go" onclick="finishReach()">${ic23('eye')}Reveal prizes</button></div>`
      : `<div class="rc-q">Can you still get <b>${esc(q.name)}</b> from your deck?</div>
      <div class="modal-actions"><button class="btn" id="rc-no" onclick="answerReach(false)">No</button><button class="btn btn-primary" id="rc-yes" onclick="answerReach(true)">Yes</button></div>`}`);
}
function answerReach(v) {
  const R = game._reach; if (!R) return;
  const q = R.qs.find(x => x.ans == null); if (!q) return;
  q.ans = v;
  openReach();
}
function finishReach() {
  const R = game._reach; if (!R) return;
  R.done = true;
  closeSheet();
  revealPrizes(true);
}

// ═══════════ PROGRESS EXTRAS (v23) ═══════════
function renderProgressExtras(deck) {
  const parts = [];
  const rec = tlogRecord(state.tlog || [], x => x.deckId === deck.id);
  if (rec.n) parts.push(`<div class="pg-tile"><div class="pl">Match record</div><div class="pv">${rec.w}-${rec.l}-${rec.t}</div><div class="ps">${rec.n} logged${rec.pgames ? ', ' + rec.avgTaken.toFixed(1) + ' prizes taken a game' : ''}</div></div>`);
  const v = ensureVersions(deck);
  if (v.length > 1) {
    const lastTs = v[v.length - 1].ts;
    const since = (deck.history || []).filter(h => h.ts >= lastTs), before = (deck.history || []).filter(h => h.ts < lastTs).slice(0, 20);
    const acc = a => a.length ? Math.round(a.reduce((s, h) => s + h.score, 0) / a.reduce((s, h) => s + (h.prizeCount || 6), 0) * 100) : null;
    const a1 = acc(since), a0 = acc(before);
    parts.push(`<div class="pg-tile"><div class="pl">List changes</div><div class="pv">${v.length - 1}</div><div class="ps">Last ${shortDate23(lastTs)}${a1 != null && a0 != null ? `, ${a1}% since vs ${a0}% before` : ''}</div></div>`);
  }
  const D = deck.drills || {};
  const dr = [['res', 'Resource count'], ['gold', 'Goldfish on time'], ['reach', 'Reach check']].filter(([k]) => D[k] && D[k].g);
  if (dr.length) parts.push(`<div class="pg-tile"><div class="pl">Drills</div><div class="pv">${dr.reduce((a, [k]) => a + D[k].g, 0)}</div><div class="ps">${dr.map(([k, n]) => `${n} ${Math.round(D[k].c / Math.max(1, D[k].n) * 100)}%`).join(', ')}</div></div>`);
  if (!parts.length) return '';
  return `<div class="pg-wrap pg-extra"><div class="section-title">Matches, list and drills</div><div class="pg-tiles">${parts.join('')}</div>
    <div class="hp-actions" style="margin:0.25rem 0 0">${rec.n ? `<button class="btn btn-sm" onclick="openTlog('${deck.id}')">${ic23('trophy')}Tournament log</button>` : ''}${v.length > 1 ? `<button class="btn btn-sm" onclick="openReview('${deck.id}');showReviewTab('notes')">${ic23('edit')}Edit log</button>` : ''}</div></div>`;
}

// ═══════════ TOURNAMENT LOG (v23) ═══════════
let _tlogDeck = '';
function tlogRecord(list, f) {
  const xs = (list || []).filter(f);
  // Prizes are an average per game: a best of three match adds each game it
  // has prizes for, so a 2-0 sweep counts as two games of 6, not one of 12.
  const r = { n: xs.length, w: 0, l: 0, t: 0, avgTaken: 0, avgGiven: 0, pgames: 0 };
  xs.forEach(x => {
    if (x.result === 'W') r.w++; else if (x.result === 'L') r.l++; else r.t++;
    tlPrizeGames(x).forEach(g => { r.pgames++; r.avgTaken += g.pt; r.avgGiven += g.pg; });
  });
  if (r.pgames) { r.avgTaken /= r.pgames; r.avgGiven /= r.pgames; }
  return r;
}
// Prizes for each game of a match that has them, as { pt, pg }. Best of
// three matches saved before per game prizes only kept the last game's.
const tlNum = v => v !== '' && v != null && Number.isFinite(+v) ? Math.max(0, Math.min(6, +v | 0)) : null;
function tlPrizeGames(x) {
  if (!x) return [];
  if (x.bo === 3 && Array.isArray(x.games) && x.games.some(g => g && (tlNum(g.pt) != null || tlNum(g.pg) != null))) {
    return x.games.filter(g => g && ['W', 'L', 'T'].includes(g.r) && (tlNum(g.pt) != null || tlNum(g.pg) != null))
      .map(g => ({ pt: tlNum(g.pt) || 0, pg: tlNum(g.pg) || 0 }));
  }
  if (tlNum(x.taken) == null && tlNum(x.given) == null) return [];
  return [{ pt: tlNum(x.taken) || 0, pg: tlNum(x.given) || 0 }];
}
function tlPrizeText(x) {
  const gs = tlPrizeGames(x);
  if (!gs.length) return 'prizes not logged';
  const t = gs.reduce((a, g) => a + g.pt, 0), g = gs.reduce((a, g) => a + g.pg, 0);
  if (x.bo !== 3) return `${t} taken, ${g} given`;
  const perGame = Array.isArray(x.games) && x.games.some(z => z && tlNum(z.pt) != null);
  return perGame ? `${t} taken, ${g} given in ${gs.length} game${gs.length === 1 ? '' : 's'}` : `${t} taken, ${g} given in the last game`;
}
function openTlog(deckId) {
  _tlogDeck = deckId || '';
  renderTlog();
  showScreen('tlog');
}
function renderTlog() {
  const el = document.getElementById('tlog-body');
  if (!el) return;
  const all = (state.tlog || []).slice().sort((a, b) => (b.day || '').localeCompare(a.day || '') || b.ts - a.ts);
  if (_tlogDeck && !state.decks.some(d => d.id === _tlogDeck)) _tlogDeck = '';
  const list = all.filter(x => !_tlogDeck || x.deckId === _tlogDeck);
  const rec = tlogRecord(list, () => true);
  const dk = _tlogDeck ? state.decks.find(d => d.id === _tlogDeck) : null;
  document.getElementById('tlog-title').textContent = dk ? dk.name : 'All decks';
  let h = `<div class="tl-wrap">
    <label for="tl-filter">Deck</label>
    <select id="tl-filter" class="x-select" onchange="_tlogDeck=this.value;renderTlog()"><option value="">All decks</option>${state.decks.map(d => `<option value="${esc(d.id)}"${d.id === _tlogDeck ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
    <div class="pg-tiles" style="margin-top:0.75rem">
      <div class="pg-tile"><div class="pl">Record</div><div class="pv">${rec.w}-${rec.l}-${rec.t}</div><div class="ps">${rec.n} match${rec.n !== 1 ? 'es' : ''}</div></div>
      <div class="pg-tile"><div class="pl">Win rate</div><div class="pv">${rec.n ? Math.round(rec.w / rec.n * 100) + '%' : '?'}</div><div class="ps">Ties count as not won</div></div>
      <div class="pg-tile"><div class="pl">Prizes</div><div class="pv">${rec.pgames ? rec.avgTaken.toFixed(1) : '?'}</div><div class="ps">${rec.pgames ? 'Taken a game, ' + rec.avgGiven.toFixed(1) + ' given' : 'Taken a game'}</div></div>
    </div>
    <div class="hp-actions"><button class="btn btn-primary" id="tl-add" onclick="openTlogForm()">${ic23('plus')}Log a match</button>${list.length ? `<button class="btn" onclick="exportTlog()">${ic23('file')}Export CSV</button>` : ''}</div>`;
  if (!list.length) h += `<div class="nt-empty">No matches logged${dk ? ' for this deck' : ''} yet. Log each round at your next event: who you played, the result and how many prizes each of you took.</div>`;
  // Opponents faced, most often first
  const byOpp = {};
  list.forEach(x => { const k = x.opp.toLowerCase(); (byOpp[k] = byOpp[k] || { name: x.opp, xs: [] }).xs.push(x); });
  const opps = Object.values(byOpp).sort((a, b) => b.xs.length - a.xs.length).slice(0, 8);
  if (opps.length > 1) {
    h += `<div class="hp-lbl">By opponent</div><div class="o-table-wrap"><table class="o-table"><thead><tr><th>Opponent</th><th>Record</th><th>Prizes a game</th></tr></thead><tbody>
      ${opps.map(o => { const r = tlogRecord(o.xs, () => true); return `<tr><td>${esc(o.name)}</td><td>${r.w}-${r.l}-${r.t}</td><td>${r.pgames ? r.avgTaken.toFixed(1) : '?'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  let lastGroup = '';
  list.forEach(x => {
    const grp = (x.day || '') + '|' + (x.event || '');
    if (grp !== lastGroup) {
      lastGroup = grp;
      const d = new Date((x.day || pgDayKey(x.ts)) + 'T12:00:00');
      h += `<div class="tl-group">${esc(x.event || 'Matches')}<span>${isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>`;
    }
    const deck = state.decks.find(d => d.id === x.deckId);
    const note = deck && matchupFor(deck, x.opp);
    h += `<div class="tl-row"><span class="tl-res ${x.result}">${x.result}</span>
      <div class="tl-mid"><div class="tl-opp">vs ${esc(x.opp || 'Unknown deck')}</div>
        <div class="tl-sub">${esc(deck ? deck.name : x.deckName || 'Deleted deck')}${x.deckVer ? ' v' + x.deckVer : ''}: ${tlPrizeText(x)}</div>
        ${x.notes ? `<div class="tl-notes">${esc(x.notes)}</div>` : ''}
        ${note ? `<button class="tl-plan" onclick="openReview('${deck.id}');showReviewTab('notes')">Prize plan for this matchup</button>` : ''}</div>
      <button class="icon-btn sm" onclick="openTlogForm('${x.id}')" aria-label="Edit match" title="Edit match">${ic23('edit')}</button></div>`;
  });
  el.innerHTML = h + `</div>`;
}
function tlSeg(name, vals, cur) {
  return `<div class="seg tl-seg" id="tl-${name}">${vals.map(v => `<div class="mode-opt${String(v) === String(cur) ? ' active' : ''}" data-val="${v}" onclick="tlSet('${name}','${v}')">${v}</div>`).join('')}</div>`;
}
let _tlForm = null;
function tlSet(name, v) {
  _tlForm[name] = name === 'result' ? v : +v;
  document.querySelectorAll('#tl-' + name + ' .mode-opt').forEach(e => e.classList.toggle('active', e.dataset.val === String(v)));
}
function tlPlanHint() {
  const el = document.getElementById('tl-hint'); if (!el) return;
  const deck = state.decks.find(d => d.id === document.getElementById('tl-deck').value);
  const m = deck && matchupFor(deck, document.getElementById('tl-opp').value);
  el.innerHTML = m && m.plan ? `<b>Your prize plan:</b> ${esc(m.plan).replace(/\n/g, '<br>')}` : '';
  el.style.display = m && m.plan ? '' : 'none';
}
function openTlogForm(id) {
  if (!state.decks.length) { showToast('Import a deck first.'); return; }
  const x = id ? (state.tlog || []).find(e => e.id === id) : null;
  const last = (state.tlog || []).slice().sort((a, b) => b.ts - a.ts)[0];
  const today = pgDayKey(Date.now());
  const sameDay = last && last.day === today;
  _tlForm = x ? { result: x.result, taken: x.taken, given: x.given } : { result: 'W', taken: 6, given: 0 };
  const deckId = x ? x.deckId : _tlogDeck || (sameDay ? last.deckId : state.decks[0].id);
  const opps = [...new Set((state.tlog || []).map(e => e.opp).concat(...state.decks.map(d => (d.matchups || []).map(m => m.opp))).filter(Boolean))].slice(0, 40);
  openSheet(`<div class="modal-title">${x ? 'Edit match' : 'Log a match'}</div>
    <div class="tl-two"><div class="mb"><label for="tl-day">Date</label><input type="date" id="tl-day" class="x-date" value="${esc(x ? x.day : today)}"></div>
    <div class="mb"><label for="tl-event">Event</label><input type="text" id="tl-event" maxlength="60" placeholder="League Challenge" value="${esc(x ? x.event : sameDay ? last.event : '')}"></div></div>
    <div class="mb"><label for="tl-deck">Your deck</label><select id="tl-deck" class="x-select" onchange="tlPlanHint()">${state.decks.map(d => `<option value="${esc(d.id)}"${d.id === deckId ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="mb"><label for="tl-opp">Opponent's deck</label><input type="text" id="tl-opp" maxlength="60" list="tl-opp-list" placeholder="e.g. Gardevoir ex" value="${esc(x ? x.opp : '')}" oninput="tlPlanHint()"><datalist id="tl-opp-list">${opps.map(o => `<option value="${esc(o)}">`).join('')}</datalist>
      <div class="tl-hint" id="tl-hint" style="display:none"></div></div>
    <div class="mb"><div class="field-label">Result</div>${tlSeg('result', ['W', 'L', 'T'], _tlForm.result)}</div>
    <div class="mb"><div class="field-label">Prizes you took</div>${tlSeg('taken', [0, 1, 2, 3, 4, 5, 6], _tlForm.taken)}</div>
    <div class="mb"><div class="field-label">Prizes they took</div>${tlSeg('given', [0, 1, 2, 3, 4, 5, 6], _tlForm.given)}</div>
    <div class="mb"><label for="tl-notes">Notes</label><textarea id="tl-notes" class="nt-area sm" maxlength="500" placeholder="For example: prized both Rare Candy in game 2">${esc(x ? x.notes : '')}</textarea></div>
    <div class="modal-actions">${x ? `<button class="btn btn-ghost danger-txt" onclick="deleteTlog('${x.id}')">Delete</button>` : `<button class="btn btn-ghost" onclick="closeSheet()">Cancel</button>`}
      <button class="btn btn-primary" id="tl-save" onclick="saveTlog('${x ? x.id : ''}')">Save</button></div>`);
  tlPlanHint();
}
async function saveTlog(id) {
  const deckId = document.getElementById('tl-deck').value;
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  const dayRaw = String(document.getElementById('tl-day').value || '');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : pgDayKey(Date.now());
  state.tlog = state.tlog || [];
  let x = id ? state.tlog.find(e => e.id === id) : null;
  if (!x) { x = { id: 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), ts: Date.now() }; state.tlog.push(x); }
  const verNow = ensureVersions(deck).length;
  Object.assign(x, {
    day, event: one23(document.getElementById('tl-event').value, 60),
    deckId, deckName: deck.name, deckVer: x.deckId === deckId && x.deckVer ? x.deckVer : verNow,
    opp: one23(document.getElementById('tl-opp').value, 60) || 'Unknown deck',
    result: ['W', 'L', 'T'].includes(_tlForm.result) ? _tlForm.result : 'W',
    taken: Math.max(0, Math.min(6, _tlForm.taken | 0)), given: Math.max(0, Math.min(6, _tlForm.given | 0)),
    notes: clean23(document.getElementById('tl-notes').value, 500).trim(),
  });
  await saveState();
  closeSheet();
  renderTlog();
  showToast('Match saved.');
}
async function deleteTlog(id) {
  if (!(await rdConfirm({ title: 'Delete this match from the log?', yes: 'Delete', danger: true }))) return;
  state.tlog = (state.tlog || []).filter(e => e.id !== id);
  await saveState();
  closeSheet();
  renderTlog();
}
var exportTlog;   // set further down (tournament log, v28)

// ═══════════ OFFLINE CARD ART (v23) ═══════════
// When a card picture loads from another site, tell the service worker so it
// keeps a copy. A loaded deck then shows its art at locals with no signal.
const _artSent = new Set();
document.addEventListener('load', e => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG') return;
  const src = t.currentSrc || t.src || '';
  if (!/^https?:\/\//.test(src) || src.startsWith(location.origin + '/') || _artSent.has(src)) return;
  if (t.closest && t.closest('ins.adsbygoogle, .ads32, [data-ad-slot]')) return;
  if (!/^https:\/\/([a-z0-9-]+\.)*(digitaloceanspaces\.com|pokemontcg\.io|tcgdex\.net)\//i.test(src)) return;
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!sw) return;
  _artSent.add(src);
  try { sw.postMessage({ type: 'art-ok', url: src }); } catch (_) {}
}, true);

// ═══════════ v23 HOOKS ═══════════
// Small wrappers so the v22 functions stay as they were.
(function () {
  const _renderHand = renderHand;
  renderHand = function () {
    const el = document.getElementById('hand-body');
    if (handMode === 'gold') { renderGoldfish(); return; }
    _renderHand();
    if (el && !el.querySelector('.hm-seg')) {
      const w = el.querySelector('.hp-wrap');
      if (w) w.insertAdjacentHTML('afterbegin', handModeBar());
      else el.insertAdjacentHTML('afterbegin', `<div class="hp-wrap">${handModeBar()}</div>`);
    }
  };
  const _renderHome = renderHome;
  renderHome = function () { _renderHome.apply(this, arguments); renderDailyCard(); };
  const _startGame = startGame;
  startGame = function (deckId) { game._reach = null; if (deckId !== DAILY_ID) game.daily = false; return _startGame.apply(this, arguments); };
  const _import = importDeck;
  importDeck = async function () {
    const before = new Set(state.decks.map(d => d.id));
    await _import.apply(this, arguments);
    const added = state.decks.filter(d => !before.has(d.id));
    if (added.length) { added.forEach(d => startVersions(d, 'import')); await saveState(); }
  };
  const _dup = duplicateDeckFromEdit;
  duplicateDeckFromEdit = async function () {
    const orig = state.decks.find(d => d.id === editDeckId);
    const before = new Set(state.decks.map(d => d.id));
    await _dup.apply(this, arguments);
    const added = state.decks.filter(d => !before.has(d.id));
    if (added.length) { added.forEach(d => startVersions(d, 'copy', orig && orig.name)); await saveState(); }
  };
  const _saveEdit = saveEditDeck;
  saveEditDeck = async function () {
    const deck = state.decks.find(d => d.id === editDeckId);
    if (deck) ensureVersions(deck);
    await _saveEdit.apply(this, arguments);
    if (deck && recordVersion(deck)) {
      const v = deck.versions, ch = diffCards(v[v.length - 2].cards, v[v.length - 1].cards);
      await saveState();
      showToast(`"${deck.name}" updated. ${ch.length} card change${ch.length !== 1 ? 's' : ''} added to the edit log.`);
    }
  };
  const _reveal = revealPrizes;
  revealPrizes = async function (force) {
    const onGame = document.getElementById('screen-game').classList.contains('active');
    if (game.reachCheck && onGame) {
      if (game._reach && !game._reach.done) { openReach(); return; }
      if (!game._reach) {
        const pc = game.prizeCount || 6;
        if (force !== true && game.guesses.length < pc) {
          // The clock keeps running while the question is open: if time runs out first, that reveal wins.
          const tok = game._rvTok = (game._rvTok || 0) + 1;
          if (!(await rdConfirm({ title: 'Reveal the prizes?', text: `You have guessed ${game.guesses.length} of ${pc}.`, yes: 'Reveal', no: 'Keep guessing' }))) return;
          if (game._rvTok !== tok || !document.getElementById('screen-game').classList.contains('active')) return;
        } else if (force === true) { game._rvTok = (game._rvTok || 0) + 1; if (typeof rdDlgClose === 'function') rdDlgClose(false); }
        stopTimer();
        game._reach = { qs: buildReachQs(), done: false, elapsed: game.elapsed };
        if (game._reach.qs.length) { openReach(); return; }
        game._reach.done = true;
      }
      game.timerStart = Date.now() - game._reach.elapsed * 1000;
      force = true;
    }
    await _reveal.call(this, force);
    const deck = findDeck(state.activeDeckId);
    const entry = deck && deck.history && deck.history[0];
    const line = document.getElementById('reach-line');
    if (line) line.innerHTML = '';
    if (game._reach && game._reach.done && game._reach.qs.length) {
      const R = game._reach, c = R.qs.filter(q => q.ans === (q.left > 0)).length;
      if (entry && !entry.reach) entry.reach = { c, n: R.qs.length };
      if (deck && deck.id !== DAILY_ID) drillStat(deck, 'reach', c, R.qs.length);
      if (line) line.innerHTML = `Reach check: <b>${c} of ${R.qs.length}</b> right. ${R.qs.map(q => esc(q.name) + (q.left > 0 ? ' was still in the deck' : ' was out of reach')).join('; ')}.`;
      game._reach = { done: true, qs: [], spent: true };
    }
    if (state.activeDeckId === DAILY_ID && entry) dailyAfterReveal(entry.score, entry.time);
    else { const b = document.getElementById('daily-banner'); if (b) b.remove(); }
  };
})();

// ═══════════ INIT ═══════════
document.addEventListener('DOMContentLoaded', () => {
  loadThemePref();
  initImportListener();
  initGuessInput();
  const _hashes = () => { mv41Init(); handleShareHash(); handleDailyHash(); handlePuzzleHash(); };
  loadState().then(_hashes, _hashes);
});
window.addEventListener('hashchange', handleShareHash);
window.addEventListener('hashchange', handleDailyHash);

// Re-render carousel on resize so slot count updates
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    const gameScreen = document.getElementById('screen-game');
    if (gameScreen && gameScreen.classList.contains('active')) renderCard();
  }, 120);
});




/**
 * Image error handler for spots where the placeholder must replace only the
 * image (not its parent): tries each data-fallbacks URL in turn, then swaps
 * in a placeholder showing data-name. Built with textContent, so card names
 * are never parsed as markup or script.
 */
function swapImgOrPlaceholder(img, cls) {
  let fbs = [];
  try { fbs = JSON.parse(img.dataset.fallbacks || '[]'); } catch (_) {}
  const idx = parseInt(img.dataset.fallbackIdx) || 0;
  if (idx < fbs.length) { img.dataset.fallbackIdx = idx + 1; img.src = fbs[idx]; return; }
  const ph = document.createElement('div');
  ph.className = cls;
  const a = document.createElement('span'); a.textContent = '\u{1F0CF}';
  ph.appendChild(a);
  if (img.dataset.name) { const b = document.createElement('span'); b.textContent = img.dataset.name; ph.appendChild(b); }
  img.replaceWith(ph);
}

// ═══════════════════════════════════════════════
// PRIZE BROWSER
// ═══════════════════════════════════════════════
let _pbIdx = 0;
let _pbResults = []; // [{card, correct}]

function openPrizeBrowser() {
  // Build from last game state
  // Same matches the score used, so the badges never disagree with it.
  const usedIdx = game._usedPrizeIdxs || new Set();
  _pbResults = game.prizes.map((card, i) => ({ card, correct: usedIdx.has(i) }));
  _pbIdx = 0;
  renderPrizeBrowser();
  document.getElementById('prize-browser-overlay').classList.add('active');
}

function closePrizeBrowser() {
  document.getElementById('prize-browser-overlay').classList.remove('active');
}

function browsePrize(dir) {
  _pbIdx = Math.max(0, Math.min(_pbResults.length - 1, _pbIdx + dir));
  renderPrizeBrowser();
}

function renderPrizeBrowser() {
  const total = _pbResults.length;
  const { card, correct } = _pbResults[_pbIdx];
  document.getElementById('pb-count').textContent = `${_pbIdx + 1} / ${total}`;
  document.getElementById('pb-name').textContent = cn23(card.apiName || card.name);
  const badge = document.getElementById('pb-badge');
  badge.textContent = correct ? '✓ Guessed' : '✗ Missed';
  badge.className = 'prize-browser-badge ' + (correct ? 'correct' : 'wrong');
  document.getElementById('pb-prev').disabled = _pbIdx === 0;
  document.getElementById('pb-next').disabled = _pbIdx === total - 1;

  const body = document.getElementById('pb-body');
  if (card.imageUrl) {
    const fallbacks = JSON.stringify(card.fallbackUrls || []);
    body.innerHTML = `<img class="prize-browser-card" src="${esc(card.imageUrl)}"
      alt="${esc(card.apiName || card.name)}"
      data-fallbacks="${esc(fallbacks)}" data-fallback-idx="0"
      data-name="${esc(card.name)}" onerror="swapImgOrPlaceholder(this,'prize-browser-placeholder')">`;
  } else {
    body.innerHTML = `<div class="prize-browser-placeholder"><span><i class=ph-card></i></span><span>${esc(cn23(card.apiName || card.name))}</span></div>`;
  }
}

// ═══════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  // Prize browser open
  if (document.getElementById('prize-browser-overlay').classList.contains('active')) {
    if (e.key === 'ArrowLeft')  { browsePrize(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { browsePrize(1);  e.preventDefault(); }
    if (e.key === 'Escape')     { closePrizeBrowser(); }
    return;
  }

  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen || !gameScreen.classList.contains('active')) return;

  const input = document.getElementById('guess-input');
  const inputFocused = document.activeElement === input;

  // Arrow keys: navigate carousel (only when input not focused)
  if (!inputFocused) {
    if (e.key === 'ArrowLeft')  { navigate(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { navigate(1); e.preventDefault(); }
  }

  // Tab: focus guess input
  if (e.key === 'Tab' && !inputFocused) { e.preventDefault(); input.focus(); }

  // R: reveal (only when not typing)
  if (e.key === 'r' && !inputFocused) { revealPrizes(); e.preventDefault(); }

  // U: undo last guess (only when not typing)
  if (e.key === 'u' && !inputFocused) { undoLastGuess(); e.preventDefault(); }

  // ?: show shortcuts (works anywhere)
  if (e.key === '?' && !inputFocused) { openShortcuts(); e.preventDefault(); }

  // Escape: quit confirm / close autocomplete
  if (e.key === 'Escape') {
    const shortcutsOpen = document.getElementById('shortcuts-modal').classList.contains('active');
    if (shortcutsOpen) { closeShortcuts(); e.preventDefault(); return; }
    if (document.getElementById('autocomplete-list').style.display !== 'none') {
      hideAutocomplete();
    } else {
      confirmQuit();
    }
    e.preventDefault();
  }
});

// Prize browser swipe support
(function() {
  let tx = 0;
  document.getElementById('prize-browser-overlay')?.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
  }, {passive:true});
  document.getElementById('prize-browser-overlay')?.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) browsePrize(dx < 0 ? 1 : -1);
  }, {passive:true});
})();

// ═══════════ HEADER STATS ═══════════
function updateHeaderStats() {
  const el = document.getElementById('header-stats');
  if (!el) return;
  const totalSessions = state.decks.reduce((a, d) => a + (d.history?.length || 0), 0);
  // Streak: consecutive sessions (any deck) ending in non-zero score, newest first
  // Newest first. Older entries have no ts; within a deck history is
  // already newest first, so keep that order as the tie breaker.
  const when = h => h.ts || new Date(h.date).getTime() || 0;
  const allSessions = state.decks.flatMap(d => (d.history || []).map((h, i) => ({ h, i })))
    .sort((a, b) => (when(b.h) - when(a.h)) || (a.i - b.i))
    .map(x => x.h);
  let streak = 0;
  for (const h of allSessions) {
    if (h.score > 0) streak++;
    else break;
  }
  const parts = [];
  if (totalSessions > 0) parts.push('<span class="header-stat"><b>' + totalSessions + '</b> session' + (totalSessions !== 1 ? 's' : '') + ' played</span>');
  if (streak >= 2) parts.push('<span class="header-stat"><svg class="ic ic-sm"><use href="#i-flame"/></svg><b>' + streak + '</b> scoring games in a row</span>');
  el.innerHTML = parts.join('');
}

// ═══════════ HOME ═══════════
let showHiddenDecks = false;

function buildDeckCard(deck) {
  const sessions = deck.history?.length || 0;
  // Best = highest score *percentage* across sessions; display as X/PC of that session
  let bestEntry = null;
  if (sessions) {
    bestEntry = deck.history.reduce((a, h) => {
      const apc = a ? (a.prizeCount || 6) : 0;
      const hpc = h.prizeCount || 6;
      return !a || (h.score / hpc) > (a.score / apc) ? h : a;
    }, null);
  }
  const thumbSrc = deck.thumbUrl || deck.cards?.find(c => c.imageUrl)?.imageUrl || '';
  const thumb = thumbSrc
    ? `<img src="${esc(thumbSrc)}" alt="" onerror="this.parentElement.innerHTML='<i class=ph-card></i>'">`
    : '<i class=ph-card></i>';
  const missingArt = deck.cards.filter(c => !c.imageUrl).length;
  const total = deck.cards.reduce((a,c)=>a+c.count,0);
  // Average shown as a percentage to stay meaningful across mixed prize counts
  const avgPct = sessions > 0
    ? Math.round(deck.history.reduce((a,h) => a + (h.score / (h.prizeCount || 6)), 0) / sessions * 100)
    : null;
  const recent5 = (deck.history || []).slice(0,5).reverse();
  const histPips = recent5.length ? '<div class="deck-history-row">' + recent5.map(h => {
    const hpc = h.prizeCount || 6;
    const pct = h.score / hpc;
    const cls = h.score === hpc ? 'perfect' : pct >= 0.66 ? 'good' : pct >= 0.33 ? 'mid' : 'bad';
    return '<div class="deck-hist-pip ' + cls + '">' + h.score + '/' + hpc + '</div>';
  }).join('') + '</div>' : '';
  const fmtBadge = deck.format === 'expanded'
    ? '<span class="fmt-badge fmt-expanded">Expanded</span>'
    : deck.format === 'prerelease' ? '<span class="fmt-badge fmt-prerelease">Prerelease</span>'
    : '<span class="fmt-badge fmt-standard">Standard</span>';
  const hiddenClass = deck.hidden ? ' deck-hidden' : '';
  const ic = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  return `
    <div class="deck-card${hiddenClass}" onclick="startGameDefault('${deck.id}')">
      <div class="deck-main">
        <div class="deck-thumb-wrap">
          <div class="deck-thumb">${thumb}</div>
          <button class="btn-thumb-edit" onclick="event.stopPropagation();openThumbPicker('${deck.id}')" title="Choose cover card" aria-label="Choose cover card">${ic('image')}</button>
        </div>
        <div class="deck-info">
          <div class="deck-name">${esc(deck.name)}</div>
          <div class="deck-meta">${fmtBadge}<span class="nw">${total} cards · ${sessions} session${sessions!==1?'s':''}</span></div>
          ${avgPct !== null ? `<div class="deck-avg"><span>Avg <b>${avgPct}%</b></span>${bestEntry ? `<span>Best <b>${bestEntry.score}/${bestEntry.prizeCount || 6}</b></span>` : ''}</div>` : ''}
          ${histPips}
        </div>
        <button class="deck-play" onclick="event.stopPropagation();startGameDefault('${deck.id}')" title="Start a prize game" aria-label="Start a prize game with ${esc(deck.name)}">${ic('play')}<span class="dp71">Prizes</span></button>
      </div>
      ${missingArt > 0 ? `<div class="deck-warn"><svg class="ic ic-sm"><use href="#i-alert"/></svg>${missingArt} card${missingArt!==1?'s':''} missing art</div>` : ''}
      <div class="deck-actions-col">
        <button class="deck-act" onclick="event.stopPropagation();openReview('${deck.id}')" title="Cards, grade and odds">${ic('grid')}<span>Deck</span></button>
        <button class="deck-act" onclick="event.stopPropagation();openModeModal('${deck.id}')" title="Game modes, hide or delete">${ic('sliders')}<span>Modes</span></button>
        <button class="deck-act" onclick="event.stopPropagation();openEditModal('${deck.id}')" title="Edit deck">${ic('edit')}<span>Edit</span></button>
        ${sessions >= 1 ? `<button class="deck-act btn-weakspot-link" onclick="event.stopPropagation();openWeakSpots('${deck.id}')" title="Progress and weak spots">${ic('trend')}<span>Progress</span></button>` : ''}
      </div>
    </div>`;
}

function renderHome() {
  const list = document.getElementById('deck-list');
  if (state.decks.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="icon"><i class=ph-card></i></span>No decks yet.<br>Paste a list or grab a starter deck.</div>`;
    updateHeaderStats();
    return;
  }
  const visible = state.decks.filter(d => !d.hidden);
  const hidden  = state.decks.filter(d => d.hidden);

  let html = visible.map(buildDeckCard).join('');

  if (hidden.length > 0) {
    const toggleLabel = showHiddenDecks
      ? '<svg class="ic ic-sm"><use href="#i-eye-off"/></svg>Hide ' + hidden.length + ' hidden deck' + (hidden.length !== 1 ? 's' : '')
      : '<svg class="ic ic-sm"><use href="#i-eye"/></svg>Show ' + hidden.length + ' hidden deck' + (hidden.length !== 1 ? 's' : '');
    html += '<div class="hidden-toggle-row" onclick="toggleShowHidden()">' + toggleLabel + '</div>';
    if (showHiddenDecks) {
      html += hidden.map(buildDeckCard).join('');
    }
  }

  list.innerHTML = html;
  updateHeaderStats();
}

async function toggleHideDeckFromModal() {
  closeModeModal();
  if (modeDeckId) await toggleHideDeck(modeDeckId);
}

async function toggleHideDeck(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  deck.hidden = !deck.hidden;
  if (deck.hidden) showHiddenDecks = false; // collapse hidden section when hiding
  await saveState();
  renderHome();
  showToast(deck.hidden ? '"' + deck.name + '" hidden.' : '"' + deck.name + '" visible again.');
}

function toggleShowHidden() {
  showHiddenDecks = !showHiddenDecks;
  renderHome();
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ═══════════ IMPORT ═══════════
function openImportModal() {
  document.getElementById('import-modal').classList.add('active');
  document.getElementById('import-name').value = '';
  document.getElementById('import-list').value = '';
  document.getElementById('parse-preview').textContent = '';
  const _sn = document.getElementById('import-share-note');
  if (_sn) { _sn.style.display = 'none'; _sn.textContent = ''; }
  setImportFormat('standard');
}
function closeImportModal() { document.getElementById('import-modal').classList.remove('active'); clearShareHash(); }

// ═══════════ PASTE FROM CLIPBOARD ═══════════
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const ta = document.getElementById('import-list');
    ta.value = text;
    ta.dispatchEvent(new Event('input')); // trigger preview
    showToast('Pasted from clipboard!');
  } catch(e) {
    showToast('Tap inside the text box and long-press to paste.');
  }
}

// ═══════════ EDIT / RENAME / DUPLICATE ═══════════
let editDeckId = null;
let editFormat = 'standard';

function openEditModal(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  editDeckId = deckId;
  editFormat = deck.format || 'standard';
  pre47FormatChoices(editFormat === 'prerelease');
  document.getElementById('edit-name').value = deck.name;
  // Reconstruct deck list text from cards, under section headers so a
  // save keeps each card in the group it is shown in.
  const listText = deckListText(deck.cards);
  document.getElementById('edit-list').value = listText;
  document.getElementById('edit-preview').textContent = '';
  setEditFormat(editFormat);
  // Init preview listener
  const el = document.getElementById('edit-list');
  el.oninput = function() {
    const parsed = parseDeckList(this.value);
    const total = parsed.reduce((a,c) => a+c.count, 0);
    const prev = document.getElementById('edit-preview');
    if (!parsed.length) { prev.textContent = ''; prev.classList.remove('warn'); return; }
    const want = editFormat === 'prerelease' ? 40 : 60;
    const pv = parsePreviewText(parsed, want);
    prev.textContent = pv.t; prev.classList.toggle('warn', pv.warn);
  };
  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  editDeckId = null;
}

function setEditFormat(fmt) {
  editFormat = fmt;
  document.getElementById('edit-fmt-standard').classList.toggle('active', fmt === 'standard');
  document.getElementById('edit-fmt-expanded').classList.toggle('active', fmt === 'expanded');
  document.getElementById('edit-fmt-prerelease').classList.toggle('active', fmt === 'prerelease');
}

async function saveEditDeck() {
  const deck = state.decks.find(d => d.id === editDeckId);
  if (!deck) return;
  const name = document.getElementById('edit-name').value.trim();
  const raw  = document.getElementById('edit-list').value.trim();
  if (!name) { showToast('Please enter a deck name.'); return; }
  if (!raw)  { showToast('Deck list is empty.'); return; }
  const cards = parseDeckList(raw);
  if (!cards.length) { showToast('No cards could be parsed.'); return; }
  deck.name   = name;
  deck.format = editFormat;
  closeEditModal();
  showLoading('Updating deck…');
  deck.cards = await Promise.all(cards.map(c => fetchCardImage(c)));
  deck.coverage = await enrichDeckCards(deck.cards);
  deck.enrichVer = ENRICH_VER;
  hideLoading();
  await saveState();
  renderHome();
  showToast(`"${name}" updated!`);
}

async function duplicateDeckFromEdit() {
  const orig = state.decks.find(d => d.id === editDeckId);
  if (!orig) return;
  const name = (document.getElementById('edit-name').value.trim() || orig.name) + ' (copy)';
  closeEditModal();
  showLoading('Duplicating…');
  const newCards = await Promise.all(orig.cards.map(c => fetchCardImage(c)));
  const cov = await enrichDeckCards(newCards);
  hideLoading();
  const newDeck = {
    id: Date.now().toString(),
    name,
    cards: newCards,
    history: [],
    format: orig.format || 'standard',
    coverage: cov,
    enrichVer: ENRICH_VER,
  };
  // 2.6.2: the copy keeps the Main attacker pick.
  if (typeof orig.atk === 'string' && orig.atk) newDeck.atk = orig.atk;
  state.decks.push(newDeck);
  await saveState();
  renderHome();
  showToast(`"${name}" created!`);
}

function initImportListener() {
  const el = document.getElementById('import-list');
  if (!el) return;
  el.addEventListener('input', function() {
    const parsed = parseDeckList(this.value);
    const total = parsed.reduce((a, c) => a + c.count, 0);
    const preview = document.getElementById('parse-preview');
    if (!preview) return;
    if (parsed.length === 0) { preview.textContent = ''; preview.classList.remove('warn'); return; }
    const want = importFormat === 'prerelease' ? 40 : 60;
    const pv = parsePreviewText(parsed, want);
    preview.textContent = pv.t; preview.classList.toggle('warn', pv.warn);
  });
}

function parseLine(line) {
  line = line.trim();
  if (!line || line.startsWith('//') || line.startsWith('#')) return null;
  // v59: "4x Ultra Ball", "4 x Ultra Ball" and a bullet "- 4 Ultra Ball" read as 4 Ultra Ball.
  // 3.2.8: but "2 X Speed" is 2 X Speed: a spaced capital X starts a card name.
  line = line.replace(/^[-*\u2022]\s+(?=[x\u00d7]?\d)/i, '').replace(/^(\d+)(?:[xX\u00d7]|\s+[x\u00d7])\s+/, '$1 ')
    .replace(/^[x\u00d7]\s*(\d+)\s+/i, '$1 ');  // 2.5.1: "x3 Ultra Ball" reads as 3 Ultra Ball
  // v59: "Ultra Ball (MEG) 131" and "Ultra Ball (MEG 131)" read as "Ultra Ball MEG 131".
  line = line.replace(/\s*\(\s*([A-Za-z0-9-]+)\s*\)\s*(\d+[a-zA-Z]*)$/, ' $1 $2')
             .replace(/\s*\(\s*([A-Za-z0-9-]+)\s+(\d+[a-zA-Z]*)\s*\)$/, ' $1 $2');

  // 3.2.8: a card database id in place of set and number ("2 Piplup swsh9-35") reads as "2 Piplup BRS 35".
  const id = line.match(/^(\d+\s+.+?)\s+([a-z]+\d*(?:pt5|\.5)?)-(\d+[a-zA-Z]*)$/i);
  if (id && ptSetAlias(id[2])) line = id[1] + ' ' + ptSetAlias(id[2]) + ' ' + id[3].replace(/^0+(?=\d)/, '');

  // Format 1: "4 Charizard ex OBF 125" (standard with set + number)
  const m = line.match(/^(\d+)\s+(.+?)\s+([A-Za-z0-9-]+)\s+(\d+[a-zA-Z]*)$/);
  if (m) return { count: parseInt(m[1]), name: m[2].trim(), set: m[3].toUpperCase(), num: m[4] };

  // Format 2: "3 Basic {P} Energy" or "3 Basic {D} Energy" (no set/number)
  const e = line.match(/^(\d+)\s+(.+Energy.*)$/i);
  if (e) return { count: parseInt(e[1]), name: e[2].trim(), set: '', num: '' };

  // Format 3: just "4 Cardname" with no set info
  const bare = line.match(/^(\d+)\s+(.+)$/);
  if (bare) return { count: parseInt(bare[1]), name: bare[2].trim(), set: '', num: '' };

  return null;
}

// Limitless set code to pokemontcg.io set ID mapping.
// Kept as an alias so existing image-URL code keeps working; the
// authoritative copy now lives in the inlined tcg-enrich module.
const LIMITLESS_TO_PTCGIO = TCGEnrich.SET_MAP;

/**
 * Pull enriched card data for a deck and merge it onto each card object.
 *
 * Replaces the old fetchSupertypes, which pulled an entire set (up to 250
 * cards) per set just to read a supertype off a handful of them. This
 * queries by card id instead, so a 60 card deck costs roughly 16 KB across
 * two or three requests rather than several hundred KB.
 *
 * Best effort by design. If the API is unreachable the cards simply keep
 * whatever they already had, and renderReview falls back to its heuristic.
 * Returns a coverage report so the UI can say how much it actually read.
 */
/** True when a card read by name is still the same printing as the list line. */
function sameCardNumber(c, e) {
  if (!(e.id && c.set && c.num)) return false;
  // 3.2.8: TCGdex ids pad the number (swsh11-066) and name sets their own way (sv08), so compare both styles.
  const norm = id => String(id || '').toLowerCase().replace(/-0+(?=[0-9])/, '-');
  const ids = [TCGEnrich.toCardId(c.set, c.num)];
  try { if (typeof td30CardId === 'function') ids.push(td30CardId(c.set, c.num)); } catch (_) {}
  return ids.some(id => id && norm(id) === norm(e.id));
}

async function enrichDeckCards(cards) {
  const blank = { total: (cards || []).length, resolved: 0, unresolved: (cards || []).length, pct: 0 };
  if (typeof TCGEnrich === 'undefined' || !cards || !cards.length) return blank;

  let map;
  try {
    map = await TCGEnrich.fetchDeckCards(
      cards.map(c => ({ name: c.name, set: c.set, num: c.num }))
    );
  } catch (_) {
    return blank;
  }

  let mismatched = 0, kept = 0;
  cards.forEach(c => {
    const e = map.get(String(c.name || '').toLowerCase());
    if (!e) return;
    // A lookup that failed (rate limit, no signal) is not a "not found":
    // keep what an earlier read stored rather than wiping a good card.
    if (!e.resolved && map.partial && c.resolved && c.supertype) { kept++; return; }
    c.resolved = e.resolved;
    if (!e.resolved) {
      // Drop anything an older lookup stored; it may describe another card.
      ['supertype','hp','stage','evolvesFrom','base','prizeValue','types','weak','provides',
       'requires','reg','ace','dataSource','attacks','abilities','byName','readPrint','pocket','atext','rtext','etext','sub','tx','retreat'].forEach(f => { delete c[f]; });
      const nm = normalizeCardName(c.name);
      if (e.provides && e.provides.length) {
        // Every override is a Trainer, and its role is known without the API.
        c.supertype = 'Trainer';
        c.provides = e.provides.slice();
        c.dataSource = 'name';
      } else if (/\benergy\b/.test(nm) && !TCGEnrich.findOverride(c.name)
                 && /^(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon) energy$/.test(nm)) {
        c.supertype = 'Energy';
        c.types = [nm.split(' ')[0]];
        c.dataSource = 'name';
      }
      return;
    }
    const dataCat = categoryFromSupertype(e.supertype);
    // 2.5.1: read by its own set and number (the name was checked too), so the
    // card data is right and the section header above it was misplaced.
    // 3.2.8: a read by name matched the name too, so it is the same card and the header is what was misplaced
    // (Energy Switch listed under Energy:). The same list grades the same in any format.
    if (c.section && dataCat && dataCat !== c.section && (sameCardNumber(c, e) || e.matchedBy === 'name')) delete c.section;
    if (c.section && dataCat && dataCat !== c.section) {
      // The list says one thing and the lookup read another: the read is
      // a different card (usually a same-number mismatch). Keep nothing.
      c.resolved = false;
      ['supertype','hp','stage','evolvesFrom','base','prizeValue','types','weak','provides',
       'requires','reg','ace','dataSource','attacks','abilities','byName','readPrint','pocket','atext','rtext','etext','sub','tx','retreat'].forEach(f => { delete c[f]; });
      mismatched++;
      return;
    }
    c.supertype   = e.supertype;
    c.hp          = e.hp;
    c.stage       = e.stage;
    c.evolvesFrom = e.from;
    // v66: the Basic a Stage 2 starts from, read when its Stage 1 is not in the list.
    if (e.base) c.base = e.base; else delete c.base;
    c.prizeValue  = e.p;
    c.types       = e.types;
    c.weak        = e.weak;
    if (e.retreat != null) c.retreat = e.retreat; else delete c.retreat;
    c.provides    = e.provides;
    c.requires    = e.requires;
    c.reg         = e.reg;
    c.ace         = e.ace;
    c.dataSource  = e.source;
    c.abilities   = e.abilities || [];
    // Trainer kind from the card's own subtypes, so Goldfish need not guess by name.
    const st = (e.subtypes || []).map(s => String(s).toLowerCase());
    c.ttype = e.t === 'trainer' ? (st.includes('supporter') ? 'supporter' : st.includes('stadium') ? 'stadium'
      : st.some(s => /tool/.test(s)) ? 'tool' : 'item') : undefined;
    // v58: card text for Goldfish (tx marks that this read stored it).
    c.atext = e.atext && e.atext.length ? e.atext : undefined;
    c.rtext = e.rtext || undefined;
    c.etext = e.etext || undefined;
    c.sub = st.length ? st : undefined;
    ptTagCard(c);   // 2.5.4: Tera, Ancient and Future the card source left out
    c.tx = 1;
    // Read by name from another printing: its costs may not match the card in the list.
    c.byName      = e.matchedBy === 'name' && !sameCardNumber(c, e) ? true : undefined;
    // 3.2.8: which printing the text was read from, so the Grade tab can name it.
    c.readPrint   = c.byName && e.printing ? e.printing : undefined;
    c.pocket      = e.pocket ? true : undefined;
    // Store parsed damage numbers only. The raw attack text is what makes
    // the payload big, and inference already ran, so it is dead weight in
    // IndexedDB once parsed.
    c.attacks = (e.attacks || []).map(a => ({
      name: a.name, cost: a.cost,
      dmg: a.dmg, dmgMax: a.dmgMax,
      // 3.4: the printed damage and the attack's text, so Goldfish can play the attack.
      pd: a.damage && a.damage.raw ? a.damage.raw : undefined, text: a.text || '',
      early: a.early, cond: a.cond || undefined,
      flip: a.flip || undefined, copy: a.copy || undefined, escale: a.escale || undefined, lock: a.lock || undefined, edisc: a.edisc || undefined, pile: a.pile || undefined, group: a.group || undefined, mill: a.mill || undefined, fx: a.fx || undefined, kox: a.kox || undefined, hand: a.hand || undefined, need: a.need || undefined, ctl: a.ctl || undefined, rev: a.rev || undefined, disc: a.disc || undefined,
      conf: a.damage ? a.damage.confidence : 'low'
    }));
  });

  const cov = TCGEnrich.coverage(map);
  if (kept && cov) {
    cov.resolved = Math.min(cov.total, (cov.resolved || 0) + kept);
    cov.unresolved = Math.max(0, cov.total - cov.resolved);
    cov.pct = cov.total ? Math.round(cov.resolved / cov.total * 100) : 0;
  }
  if (cov && map.partial) cov.partial = true;
  if (cov && map.otherLeft) cov.otherLeft = true;
  if (mismatched && cov) {
    cov.resolved = Math.max(0, (cov.resolved || 0) - mismatched);
    cov.unresolved = (cov.unresolved || 0) + mismatched;
    if (cov.total) cov.pct = Math.round(cov.resolved / cov.total * 100);
  }
  return cov;
}

async function importDeck() {
  const name = document.getElementById('import-name').value.trim();
  const raw = document.getElementById('import-list').value.trim();
  if (!name) { showToast('Please enter a deck name.'); return; }
  if (!raw) { showToast('Please paste your deck list.'); return; }
  const cards = parseDeckList(raw);
  if (cards.length === 0) { showToast('No cards could be parsed. Check the format.'); return; }
  const total = cards.reduce((a, c) => a + c.count, 0);
  if (total < 10) { showToast(`Only ${total} cards found. Check your list format.`); return; }

  closeImportModal();
  showLoading('Preparing deck…');

  const fetched = await Promise.all(cards.map(c => fetchCardImage(c)));
  showLoading('Reading card data\u2026');
  const cov = await enrichDeckCards(fetched);
  hideLoading();

  const deck = {
    id: Date.now().toString(),
    name,
    cards: fetched,
    history: [],
    format: importFormat,
    coverage: cov,
    enrichVer: ENRICH_VER,
  };
  state.decks.push(deck);
  await saveState();
  renderHome();
  // Say plainly when card data is incomplete rather than looking fully loaded.
  showToast(cov.unresolved > 0
    ? `"${name}" imported (${total} cards). Card data read for ${cov.resolved}/${cov.total} entries.`
    : `"${name}" imported! ${total} cards.`);
}

// Known Limitless code -> pokemontcg.io set ID
// Energy card images (hosted on pokemontcg.io, always available)
function getEnergyImageUrl(name) {
  const n = name.toLowerCase();
  if (!n.includes('energy')) return null;

  // SVE = Scarlet & Violet Energy set on pokemontcg.io (svenergie / SVE)
  // Cards 1-8: Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal
  // Use Limitless CDN for SVE energies: exact set code "SVE"
  const bySymbol = {g:1,r:2,w:3,l:4,p:5,f:6,d:7,m:8};
  const byName = {
    grass:1, fire:2, water:3, lightning:4,
    psychic:5, fighting:6, darkness:7, metal:8
  };

  let num = null;

  // Format: "Basic {P} Energy" or "{R} Energy"
  const sym = n.match(/\{([a-z])\}/);
  if (sym) num = bySymbol[sym[1]] || null;

  // Format: "Basic Psychic Energy" / "Basic Fire Energy" / "Darkness Energy"
  if (!num) {
    for (const [word, n2] of Object.entries(byName)) {
      if (n === word + ' energy' || n === 'basic ' + word + ' energy') { num = n2; break; }
    }
  }

  if (!num) return null;
  // Use Limitless CDN SVE set (always available, correct card images)
  return `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SVE/SVE_00${num}_R_EN_XS.png`;
}

function getImageCandidates(card) {
  const set = (card.set || '').toUpperCase();
  const numRaw = card.num || '';
  const numClean = numRaw.replace(/^0+(\d)/, '$1');
  const numPadded = numClean.padStart(3, '0');
  const urls = [];

  if (!set || !numRaw) return urls;

  // 1. Limitless CDN: exact set codes, includes newest sets (ASC, MEG, PRE, etc.)
  const lbase = `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${set}/${set}`;
  urls.push(`${lbase}_${numPadded}_R_EN_XS.png`);
  urls.push(`${lbase}_${numPadded}_R_EN.png`);
  urls.push(`${lbase}_${numClean}_R_EN_XS.png`);
  urls.push(`${lbase}_${numClean}_R_EN.png`);

  // 2. pokemontcg.io: ONLY when set+number are known, never by name (avoids wrong card art)
  const pid = LIMITLESS_TO_PTCGIO[set];
  if (pid) {
    urls.push(`https://images.pokemontcg.io/${pid}/${numClean}.png`);
    urls.push(`https://images.pokemontcg.io/${pid}/${numPadded}.png`);
  }

  return urls;
}

// No HEAD checks: CORS on file:// blocks them.
// Instead store all candidate URLs and let <img> onerror cascade through them.
async function fetchCardImage(card) {
  const energyUrl = getEnergyImageUrl(card.name);
  if (energyUrl) return { ...card, imageUrl: energyUrl, fallbackUrls: [], apiName: card.name };
  if (!card.set || !card.num) return { ...card, imageUrl: '', fallbackUrls: [], apiName: card.name };
  const candidates = getImageCandidates(card);
  // Primary = first candidate, rest = fallbacks tried by onerror chain in DOM
  return { ...card, imageUrl: candidates[0] || '', fallbackUrls: candidates.slice(1), apiName: card.name };
}

async function clearAllData() {
  if (!(await rdConfirm({ title: 'Delete all decks and history?', text: 'This cannot be undone.', yes: 'Delete all', danger: true }))) return;
  clearAllStorage();
}


// ═══════════ GAME ═══════════
async function startGame(deckId) {
  const deck = findDeck(deckId);
  if (!deck) return;
  state.activeDeckId = deckId;
  // If called directly (not from mode modal), use defaults
  if (!game.prizeCount) game.prizeCount = 6;

  // Expand deck to 60 individual cards
  const expanded = [];
  deck.cards.forEach(card => {
    for (let i = 0; i < card.count; i++) expanded.push({ ...card });
  });

  const pc = game.prizeCount || 6;

  // Drill mode: weighted pick for prizes, then uniform shuffle for the rest.
  // Regular mode: uniform shuffle.
  if (game._drillMissWeights) {
    game.prizes = weightedPickPrizes(expanded, pc, game._drillMissWeights);
    const prizeSet = new Set(game.prizes);
    game.visible = expanded.filter(c => !prizeSet.has(c));
    shuffle(game.visible);
    game._drillMissWeights = null; // consume: next replay uses normal shuffle
    game.hand = [];
  } else if (deckId === DAILY_ID) {
    dailyShuffle(expanded);
    game.prizes = expanded.slice(0, pc);
    game.visible = expanded.slice(pc);
    game.hand = [];
  } else if (game.tableCheck) {
    dealTableCheck(expanded, pc);
  } else {
    shuffle(expanded);
    game.prizes = expanded.slice(0, pc);
    game.visible = expanded.slice(pc);
    game.hand = [];
  }
  game.currentIdx = 0;
  game.guesses = [];
  game._guessTimes = [];
  game.elapsed = 0;

  // Mode badges
  const badgeWrap = document.getElementById('mode-badge-wrap');
  const badges = [];
  if (game.prizeCount !== 6) badges.push(`${game.prizeCount} prizes`);
  if (game.timeLimit) badges.push(game.timeLimit + 's timer');
  if (game.tableCheck && (game.hand || []).length) badges.push('Table check');
  if (game.reachCheck) badges.push('Reach check');
  if (deckId === DAILY_ID) badges.push('Daily ' + shortDate23(Date.now()));
  badgeWrap.innerHTML = badges.map(b => `<span class="mode-badge">${b}</span>`).join('');

  // Render game screen
  document.getElementById('game-deck-name').textContent = deck.name;
  renderHandStrip();
  renderCard();
  renderProgressDots();
  renderPrizeSlots();
  renderEnergyQuickButtons(deck);
  document.getElementById('guess-feedback').textContent = '';
  document.getElementById('guess-input').value = '';
  document.getElementById('autocomplete-list').style.display = 'none';

  // Timer bar
  const bar = document.getElementById('timer-bar');
  bar.style.width = '100%';
  bar.className = 'timer-bar-fill';
  if (!game.timeLimit) bar.parentElement.style.display = 'none';
  else bar.parentElement.style.display = 'block';

  showScreen('game');
  // Show large countdown timer display in timed mode
  const bigTimer = document.getElementById('game-countdown-big');
  if (game.timeLimit > 0) { bigTimer.classList.remove('hidden'); }
  else { bigTimer.classList.add('hidden'); }
  // 3-2-1 countdown then start
  startTimer();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Pick `n` prize cards from the expanded pool using weighted sampling without replacement.
// Each card's weight comes from `weights[baseName(card.name)]`, defaulting to 1.
// This is used by drill mode to bias prizes toward cards the user has historically missed.
function weightedPickPrizes(pool, n, weights) {
  const remaining = [...pool];
  const picked = [];
  for (let k = 0; k < n && remaining.length; k++) {
    const wts = remaining.map(c => Math.max(0.0001, weights[baseName(c.name)] || 1));
    const total = wts.reduce((a,b) => a+b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < wts.length; i++) {
      r -= wts[i];
      if (r <= 0) { idx = i; break; }
    }
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return picked;
}

// Build the inner HTML for one card slot
function buildCardHTML(card) {
  if (!card) return '<div class="card-placeholder"><span><i class=ph-card></i></span></div>';
  const rawName = card.apiName || card.name;
  const displayName = esc(rawName.replace(/\{[a-zA-Z]\}/g, '').trim());
  if (card.imageUrl) {
    const fallbacks = JSON.stringify(card.fallbackUrls || []);
    return `<img src="${esc(card.imageUrl)}" alt="${esc(rawName)}" loading="lazy" decoding="async"
        data-fallbacks="${esc(fallbacks)}" data-fallback-idx="0"
        onerror="var fbs=JSON.parse(this.dataset.fallbacks||'[]');var idx=parseInt(this.dataset.fallbackIdx)||0;if(idx<fbs.length){this.dataset.fallbackIdx=idx+1;this.src=fbs[idx];}else{this.style.display='none';this.nextElementSibling.style.display='flex';this.nextElementSibling.nextElementSibling.style.display='block';}">
      <div class="card-placeholder" style="display:none"><span><i class=ph-card></i></span><span>${displayName}</span></div>
      <div class="card-name-label" style="display:none">${displayName}</div>`;
  }
  return `<div class="card-placeholder"><span><i class=ph-card></i></span><span>${displayName}</span></div>
      <div class="card-name-label">${displayName}</div>`;
}

function getCarouselMetrics() {
  const stage = document.getElementById('card-stage');
  const stageW = stage ? stage.offsetWidth : 320;
  // Center card width matches CSS: 190px mobile, or overridden by breakpoints
  const testEl = stage ? stage.querySelector('.is-center') : null;
  const centerW = testEl ? testEl.offsetWidth : (stageW < 500 ? 190 : stageW < 900 ? 210 : 235);
  return { stageW, centerW };
}

function renderCard(direction = 0) {
  const idx = game.currentIdx;
  const cards = game.visible;
  const track = document.getElementById('carousel-track');
  document.getElementById('card-counter').textContent =
    `Card ${idx + 1} of ${cards.length}`;

  const { stageW, centerW } = getCarouselMetrics();

  // Side card display width (before scale) used for spacing calc
  const sideW = centerW * 0.72;
  // Gap between card centres: tighter on narrow, looser on wide
  const spacing = Math.round(sideW * 0.75);
  // How many side slots fit before clipping
  const maxRadius = stageW / 2 - sideW * 0.25;
  const sideCount = Math.min(6, Math.max(2, Math.floor(maxRadius / spacing)));

  // Build slots: center first, then pairs outward
  const slots = [{ offset: 0, x: 0, ry: 0, scale: 1.0, opacity: 1.0 }];
  for (let i = 1; i <= sideCount; i++) {
    const t = i / sideCount;                    // 0→1 as we go outward
    const scale   = Math.max(0.35, 1.0 - t * 0.55);
    const opacity = Math.max(0.12, 1.0 - t * 0.82);
    const ry      = Math.min(55, t * 55);
    const x       = spacing * i;
    slots.push({ offset:  i, x:  x, ry: -ry, scale, opacity });
    slots.push({ offset: -i, x: -x, ry:  ry, scale, opacity });
  }
  // Render back-to-front (highest abs offset first)
  slots.sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));

  track.innerHTML = '';
  slots.forEach(({ offset, x, ry, scale, opacity }) => {
    const cardIdx = idx + offset;
    const card = cards[cardIdx];
    if (!card && offset !== 0) return; // skip missing edge slots

    const div = document.createElement('div');
    div.className = 'card-display' + (offset === 0 ? ' is-center' : '');
    div.style.transform = `translateX(${x}px) translateZ(${offset ? -80 : 0}px) rotateY(${ry}deg) scale(${scale})`;
    div.style.opacity = card ? opacity : 0;
    div.style.zIndex = 10 - Math.abs(offset);

    if (card) {
      div.innerHTML = buildCardHTML(card);
      if (offset !== 0) {
        div.addEventListener('click', () => navigate(offset));
        div.style.cursor = 'pointer';
      }
    }
    track.appendChild(div);
  });

  updateProgressDots();
}

function navigate(dir) {
  const next = game.currentIdx + dir;
  if (next < 0 || next >= game.visible.length) return;
  game.currentIdx = next;
  renderCard(dir);
}

// Delegated click handler for progress dots: attached ONCE at module level,
// not per render, so repeated games don't stack duplicate listeners.
function handleProgressDotClick(e) {
  // The dots are thin, so the whole track is the target: the card under the tap.
  const box = document.getElementById('progress-dots');
  const n = (game.visible || []).length;
  if (!box || !n) return;
  const rc = box.getBoundingClientRect();
  const idx = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rc.left) / Math.max(1, rc.width) * n)));
  if (isNaN(idx) || idx === game.currentIdx) return;
  game.currentIdx = idx;
  renderCard();
}

function renderProgressDots() {
  const container = document.getElementById('progress-dots');
  const count = game.visible.length;
  const showCount = count;
  container.innerHTML = Array.from({length: showCount}, (_, i) =>
    `<div class="progress-dot" id="dot-${i}" data-idx="${i}" title="Jump to card ${i+1}"></div>`
  ).join('');
  // Remove-then-add guarantees exactly one listener regardless of call count
  container.removeEventListener('click', handleProgressDotClick);
  container.addEventListener('click', handleProgressDotClick);
  updateProgressDots();
}

function updateProgressDots() {
  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((d, i) => {
    d.classList.remove('seen', 'current');
    if (i === game.currentIdx) d.classList.add('current');
    else if (i < game.currentIdx) d.classList.add('seen');
  });
}

// Touch swipe support
let touchStartX = 0;
// Touch swipe: safe to attach to document
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive: true});
document.addEventListener('touchend', e => {
  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen || !gameScreen.classList.contains('active')) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
}, {passive: true});

// ═══════════ GUESSING ═══════════
function renderPrizeSlots() {
  const container = document.getElementById('prize-slots');
  const pc = game.prizeCount || 6;
  const placed = game.guesses.length;
  // Update label to show running count
  const lbl = document.getElementById('guess-label');
  if (lbl) lbl.textContent = `Prize guesses (${placed}/${pc})`;
  container.innerHTML = Array.from({length: pc}, (_, i) => {
    const guess = game.guesses[i];
    return guess
      ? `<div class="prize-slot filled" data-slot="${i}"><span class="ps40-t${/\S{9,}/.test(guess) ? ' ps67-long' : ''}">${esc(guess)}</span><button type="button" class="remove-btn" aria-label="Remove ${esc(guess)}" onclick="removeGuess(${i})">✕</button></div>`
      : `<div class="prize-slot" data-slot="${i}">Prize ${i+1}</div>`;
  }).join('');
}

function removeGuess(idx) {
  game.guesses.splice(idx, 1);
  // Also prune timing data for removed guess
  if (game._guessTimes) game._guessTimes.splice(idx, 1);
  renderPrizeSlots();
}

function undoLastGuess() {
  if (!game.guesses.length) return;
  game.guesses.pop();
  if (game._guessTimes) game._guessTimes.pop();
  renderPrizeSlots();
  const fb = document.getElementById('guess-feedback');
  if (fb) { fb.textContent = 'Last guess removed.'; fb.className = 'guess-feedback'; }
}

// Populate the energy quick-guess row with types actually in the deck
function renderEnergyQuickButtons(deck) {
  const row = document.getElementById('energy-quick-row');
  if (!row) return;
  const symToFull = {g:'Grass',r:'Fire',w:'Water',l:'Lightning',p:'Psychic',f:'Fighting',d:'Darkness',m:'Metal',y:'Fairy',n:'Dragon',c:'Colorless'};
  const typeKey = {Grass:'grass',Fire:'fire',Water:'water',Lightning:'lightning',Psychic:'psychic',Fighting:'fighting',Darkness:'darkness',Metal:'metal',Fairy:'fairy',Dragon:'dragon',Colorless:'colorless'};
  const found = new Set();
  // Scan deck for basic energies and note their types
  deck.cards.forEach(c => {
    const n = (c.name || '').toLowerCase();
    if (!/\benergy\b/.test(n)) return;
    // Ignore trainer items that have "energy" in the name
    if (/\b(search|retrieval|switch|recycler|sticker|lotto|loto|pick|spinner|recycle)\b/.test(n)) return;
    // Ignore special energies: they don't get quick buttons (too many, less common)
    // Detection: basic energies are named "Basic X Energy" or contain an energy symbol
    const sym = n.match(/\{([a-z])\}/);
    if (sym && symToFull[sym[1]]) { found.add(symToFull[sym[1]]); return; }
    // Match by word: "basic water energy" / "water energy"
    for (const [full, key] of Object.entries(typeKey)) {
      const lower = full.toLowerCase();
      if (n === `${lower} energy` || n === `basic ${lower} energy`) { found.add(full); break; }
    }
  });
  if (!found.size) { row.innerHTML = ''; return; }
  row.innerHTML = [...found].map(t => {
    const key = typeKey[t];
    return `<button class="energy-quick-btn" data-type="${key}" onclick="quickGuessEnergy('${t}')">${t}</button>`;
  }).join('');
}

// Submit an energy guess directly (full "Basic X Energy" form so normalizer matches)
function quickGuessEnergy(typeName) {
  const input = document.getElementById('guess-input');
  if (input) input.value = `Basic ${typeName} Energy`;
  submitGuess();
}

function initGuessInput() {
  const gi = document.getElementById('guess-input');
  if (!gi) return;
  gi.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const list = document.getElementById('autocomplete-list');
    const highlighted = list.querySelector('.highlighted');
    // Only auto-pick if they've highlighted one via arrow keys.
    // Otherwise submit exactly what they typed: let the normalizer match it.
    if (highlighted && list.style.display !== 'none') {
      document.getElementById('guess-input').value = highlighted.dataset.val;
    }
    hideAutocomplete();
    submitGuess();
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    cycleAutocomplete(1); e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    cycleAutocomplete(-1); e.preventDefault();
  }
});

  gi.addEventListener('input', function() {
  const val = this.value.trim().toLowerCase();
  if (!val || val.length < 1) { hideAutocomplete(); return; }
  const deck = findDeck(state.activeDeckId);
  if (!deck) return;
  // Unique base names in deck
  // Expand energy symbols to full names so the normalizer can match them
  const energySymMap = {g:'Grass',r:'Fire',w:'Water',l:'Lightning',p:'Psychic',f:'Fighting',d:'Darkness',m:'Metal',y:'Fairy',n:'Dragon',c:'Colorless'};
  const names = [...new Set(deck.cards.map(c => {
    return (c.name || '').replace(/\{([a-zA-Z])\}/g, (_, ch) => energySymMap[ch.toLowerCase()] || '').replace(/\s+/g,' ').trim();
  }).filter(Boolean))].filter(n => {
    const nl = n.toLowerCase();
    // Match if any word in the name starts with the typed value
    return nl.startsWith(val) || nl.split(' ').some(w => w.startsWith(val));
  }).sort((a, b) => {
    // Prioritise names that start with the typed value
    const al = a.toLowerCase(), bl = b.toLowerCase();
    if (al.startsWith(val) && !bl.startsWith(val)) return -1;
    if (!al.startsWith(val) && bl.startsWith(val)) return 1;
    return a.localeCompare(b);
  });
  const list = document.getElementById('autocomplete-list');
  if (!names.length) { hideAutocomplete(); return; }
  list.innerHTML = names.slice(0,6).map(n =>
    `<div class="autocomplete-item" data-val="${esc(n)}">${esc(n)}</div>`
  ).join('');
  list.style.display = 'block';
});

  gi.addEventListener('blur', () => {
    setTimeout(hideAutocomplete, 150);
  });

  // Use event delegation: avoids broken onclick with apostrophes in card names
  document.getElementById('autocomplete-list').addEventListener('mousedown', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) { e.preventDefault(); pickAutocomplete(item.dataset.val); }
  });
  document.getElementById('autocomplete-list').addEventListener('touchend', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) { e.preventDefault(); pickAutocomplete(item.dataset.val); }
  });
} // end initGuessInput

function hideAutocomplete() {
  document.getElementById('autocomplete-list').style.display = 'none';
}

function pickAutocomplete(val) {
  document.getElementById('guess-input').value = val;
  hideAutocomplete();
  submitGuess();
}

function cycleAutocomplete(dir) {
  const list = document.getElementById('autocomplete-list');
  const items = [...list.querySelectorAll('.autocomplete-item')];
  if (!items.length) return;
  const cur = list.querySelector('.highlighted');
  let idx = cur ? items.indexOf(cur) + dir : (dir > 0 ? 0 : items.length - 1);
  idx = (idx + items.length) % items.length;
  items.forEach(i => i.classList.remove('highlighted'));
  items[idx].classList.add('highlighted');
  document.getElementById('guess-input').value = items[idx].dataset.val;
}


// ═══════════ NAME NORMALIZATION ═══════════
// Canonical form for comparing a typed guess against a prize card name.
// Handles:
//   • Case / whitespace / punctuation differences
//   • Energy symbol tokens like "{W}" → "water"
//   • Optional "Basic" prefix on energies
//     ("Water Energy" ≡ "Basic Water Energy" ≡ "Basic {W} Energy")
//   • Curly quotes, em-dashes, trademark glyphs
function normalizeCardName(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();
  const symMap = {
    g:'grass', r:'fire', w:'water', l:'lightning',
    p:'psychic', f:'fighting', d:'darkness', m:'metal',
    y:'fairy', n:'dragon', c:'colorless'
  };
  s = s.replace(/\{([a-z])\}/g, (_, ch) => symMap[ch] || '');
  s = s.replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/[\u2013\u2014]/g, '-');
  s = s.replace(/[®™©★◆♪]/g, ' ');
  if (/\benergy\b/.test(s)) s = s.replace(/\bbasic\b/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function submitGuess() {
  const input = document.getElementById('guess-input');
  const fb = document.getElementById('guess-feedback');
  const val = input.value.trim();
  if (!val) return;

  const prizeCount = game.prizeCount || 6;
  if (game.guesses.length >= prizeCount) {
    fb.textContent = `All ${prizeCount} slots filled. Remove one to change.`;
    fb.className = 'guess-feedback bad';
    return;
  }

  const normalized = normalizeCardName(val);
  const isEnergy = /\benergy\b/.test(normalized);
  const maxCopies = isEnergy ? prizeCount : 4;
  const existingCount = game.guesses.filter(g => normalizeCardName(g) === normalized).length;
  if (existingCount >= maxCopies) {
    fb.textContent = `Already guessed that ${isEnergy ? 'energy' : 'card'} ${maxCopies} times (max).`;
    fb.className = 'guess-feedback bad';
    return;
  }

  game.guesses.push(val);
  // Track timestamp of this guess (ms since game start)
  if (!game._guessTimes) game._guessTimes = [];
  game._guessTimes.push(Date.now() - (game.timerStart || Date.now()));
  renderPrizeSlots();
  input.value = '';
  fb.textContent = `Guess ${game.guesses.length}/${prizeCount} recorded.`;
  fb.className = 'guess-feedback good';

  if (game.guesses.length === prizeCount) {
    fb.textContent = `All ${prizeCount} guesses in! Hit "Reveal Prizes" when ready.`;
  }
}

// ═══════════ TIMER ═══════════
function startTimer() {
  game.timerStart = Date.now();
  clearInterval(game.timerInterval);
  clearInterval(game.timeLimitInterval);
  game.timerInterval = setInterval(updateTimer, 500);
  updateTimer();
  if (game.timeLimit > 0) {
    game.timeLimitInterval = setInterval(updateTimerBar, 200);
  }
}

function stopTimer() {
  clearInterval(game.timerInterval);
  clearInterval(game.timeLimitInterval);
  game.elapsed = Math.floor((Date.now() - game.timerStart) / 1000);
}

function updateTimer() {
  const secs = Math.floor((Date.now() - game.timerStart) / 1000);
  const el = document.getElementById('game-timer');
  const big = document.getElementById('game-countdown-big');
  if (game.timeLimit > 0) {
    const remaining = Math.max(0, game.timeLimit - secs);
    const fmt = formatTime(remaining);
    el.textContent = fmt;
    if (big) { big.textContent = fmt; big.className = 'game-countdown-big' + (remaining <= 10 ? ' warning' : ''); }
    if (remaining <= 10) el.classList.add('warning');
    else el.classList.remove('warning');
    if (remaining <= 0) { stopTimer(); revealPrizes(true); }
  } else {
    const fmt = formatTime(secs);
    el.textContent = fmt;
    el.classList.remove('warning');
    if (big) { big.textContent = fmt; big.className = 'game-countdown-big'; }
  }
}

function updateTimerBar() {
  if (!game.timeLimit) return;
  const secs = (Date.now() - game.timerStart) / 1000;
  const pct = Math.max(0, ((game.timeLimit - secs) / game.timeLimit) * 100);
  const bar = document.getElementById('timer-bar');
  bar.style.width = pct + '%';
  bar.className = 'timer-bar-fill' + (pct < 20 ? ' crit' : pct < 40 ? ' warn' : '');
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ═══════════ REVEAL ═══════════
async function revealPrizes(force) {
  const pc = game.prizeCount || 6;
  if (force !== true && game.guesses.length < pc) {
    // The clock keeps running while the question is open: if time runs out first, that reveal wins.
    const tok = game._rvTok = (game._rvTok || 0) + 1;
    if (!(await rdConfirm({ title: 'Reveal the prizes?', text: `You have guessed ${game.guesses.length} of ${pc}.`, yes: 'Reveal', no: 'Keep guessing' }))) return;
    if (game._rvTok !== tok || !document.getElementById('screen-game').classList.contains('active')) return;
  } else if (force === true) { game._rvTok = (game._rvTok || 0) + 1; if (typeof rdDlgClose === 'function') rdDlgClose(false); }
  stopTimer();
  const elapsed = game.elapsed;

  // Score: strict normalized equality (handles case, whitespace, {W}→water,
  // optional "Basic" prefix on energies, curly quotes).
  // Rejects substring matches: "Quilava" does NOT match "Ethan's Quilava",
  // and "Charizard" does NOT match "Charizard ex".
  const prizePool = game.prizes.map(p => normalizeCardName(p.name));
  const usedPrizeIdxs = new Set();
  let score = 0;
  game._usedPrizeIdxs = usedPrizeIdxs;
  const guessResults = game.guesses.map(g => {
    const gn = normalizeCardName(g);
    const matchIdx = prizePool.findIndex((p, i) => {
      if (usedPrizeIdxs.has(i)) return false;
      return p === gn;
    });
    const correct = matchIdx !== -1;
    if (correct) { usedPrizeIdxs.add(matchIdx); score++; }
    return { guess: g, correct, matchedPrizeIdx: correct ? matchIdx : -1 };
  });

  // Save history: store prize card names + which were guessed for weak spot analysis
  const deck = findDeck(state.activeDeckId);
  if (deck) {
    if (!deck.history) deck.history = [];
    // Build per-card outcome count-aware: uses same usedPrizeIdxs from scoring above
    const prizeOutcomes = game.prizes.map((card, pi) => {
      return { name: card.name, missed: !usedPrizeIdxs.has(pi) };
    });
    ensureDaily(deck);
    const _entry = { score, time: elapsed, prizeCount: pc, date: new Date().toLocaleDateString(), ts: Date.now(), prizes: prizeOutcomes };
    if (game.tableCheck && (game.hand || []).length) _entry.view = 'table';
    deck.history.unshift(_entry);
    pgAdd(deck, _entry, _entry.ts);
    if (deck.history.length > 50) deck.history = deck.history.slice(0, 50);
    await saveState();
  }

  // Tournament tracking: record this game's score
  if (tournament.active) {
    tournament.current++;
    tournament.scores.push({ score, prizeCount: pc, time: elapsed });
  }

  // Results screen
  document.getElementById('results-score').textContent = `${score}/${pc}`;
  document.getElementById('results-time').textContent = `Time: ${formatTime(elapsed)}`;

  // Prize grid
  const grid = document.getElementById('prize-reveal-grid');
  grid.innerHTML = game.prizes.map((card, i) => {
    const wasGuessed = usedPrizeIdxs.has(i);
    return `
      <div class="prize-reveal-card" style="border-color:${wasGuessed ? 'var(--success)' : 'var(--danger)'}">
        ${card.imageUrl
          ? `<img src="${esc(card.imageUrl)}" alt="${esc(card.name)}" data-fallbacks="${esc(JSON.stringify(card.fallbackUrls || []))}" data-fallback-idx="0" onerror="swapImgOrPlaceholder(this,'card-placeholder result-ph')">`
          : `<div class="card-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;"><i class=ph-card></i></div>`
        }
        <div class="badge ${wasGuessed ? 'correct' : 'wrong'}">${wasGuessed ? '✓' : '✗'}</div>
        <div class="prize-card-name">${esc(cn23(card.apiName || card.name))}</div>
      </div>`;
  }).join('');

  // Notes on missed prizes: only if any were missed
  renderMissedNotes(game.prizes, usedPrizeIdxs, deck);

  // Session rating (score + time combined)
  const ratingEl = document.getElementById('session-rating');
  const rating = calcRating(score, elapsed, game.prizeCount || 6);
  ratingEl.textContent = rating.grade;
  ratingEl.className = 'session-rating rating-' + rating.grade.toLowerCase();

  // Personal bests
  const pbDiv = document.getElementById('pb-display');
  const newPBs = updatePersonalBests(deck, score, elapsed, game.prizeCount || 6);
  if (newPBs.length) await saveState();
  renderPersonalBests(deck, pbDiv, newPBs);

  // History table
  renderHistoryTable();
  renderProgressLine(deck);

  // Guess comparison grid
  buildGuessComparison(guessResults, game.prizes, game.prizeCount || 6);

  // Per-guess timing bar chart
  buildGuessTiming(guessResults, game._guessTimes || []);

  // Update streak on home header (will refresh when back)
  updateHeaderStats();
  // Confetti + PERFECT overlay on perfect score
  if (score === (game.prizeCount || 6)) {
    launchConfetti();
    showPerfectOverlay(score, game.prizeCount || 6);
  }

  renderTournamentBanner();

  showScreen('results');
}

function renderTournamentBanner() {
  const area = document.getElementById('prize-reveal-area');
  if (!area) return;
  // Remove any previous banner
  const old = document.getElementById('tournament-banner');
  if (old) old.remove();
  if (!tournament.active) return;

  const totalPoints = tournament.scores.reduce((a,s) => a + s.score, 0);
  const totalPossible = tournament.scores.reduce((a,s) => a + s.prizeCount, 0);
  const pct = totalPossible ? Math.round(totalPoints / totalPossible * 100) : 0;
  const isLast = tournament.current >= tournament.total;

  const banner = document.createElement('div');
  banner.id = 'tournament-banner';
  banner.className = 'tournament-banner';
  if (isLast) {
    banner.innerHTML = `
      <div class="tb-title">Tournament complete</div>
      <div class="tb-stat">${totalPoints} of ${totalPossible} prizes (${pct}%) over ${tournament.current} games</div>
      <div class="tb-actions"><button class="btn btn-primary" onclick="endTournament()">Finish</button></div>
    `;
  } else {
    banner.innerHTML = `
      <div class="tb-title">Tournament, game ${tournament.current} of ${tournament.total}</div>
      <div class="tb-stat">Running total: ${totalPoints} of ${totalPossible} prizes (${pct}%)</div>
      <div class="tb-actions">
        <button class="btn btn-primary" onclick="nextTournamentGame()"><svg class="ic"><use href="#i-play"/></svg>Next game (${tournament.total - tournament.current} left)</button>
        <button class="btn" onclick="endTournament()">Quit</button>
      </div>
    `;
  }
  area.insertBefore(banner, area.firstChild);
}

function nextTournamentGame() {
  if (!tournament.active) return;
  startGame(tournament.deckId);
}

function endTournament() {
  const scores = tournament.scores.slice();
  const deckId = tournament.deckId;
  tournament.active = false;
  tournament.scores = [];
  tournament.current = 0;
  if (scores.length) {
    const totalPts = scores.reduce((a,s) => a+s.score, 0);
    const totalPos = scores.reduce((a,s) => a+s.prizeCount, 0);
    const totalTime = scores.reduce((a,s) => a+s.time, 0);
    showToast(`Tournament: ${totalPts}/${totalPos} prizes (${Math.round(totalPts/totalPos*100)}%) in ${formatTime(totalTime)}`);
  }
  showScreen('home');
  renderHome();
}

function buildGuessTiming(guessResults, guessTimes) {
  const section = document.getElementById('guess-timing-section');
  const bars = document.getElementById('guess-timing-bars');
  if (!section || !bars) return;
  if (!guessTimes.length || guessTimes.length !== guessResults.length) {
    section.style.display = 'none';
    return;
  }
  // Compute deltas between consecutive guesses (ms → s). First delta is from game start.
  const deltas = guessTimes.map((t, i) => {
    const prev = i === 0 ? 0 : guessTimes[i - 1];
    return Math.max(0, (t - prev) / 1000);
  });
  const maxDelta = Math.max(...deltas, 1);
  bars.innerHTML = guessResults.map((gr, i) => {
    const secs = deltas[i];
    const pct = Math.min(100, (secs / maxDelta) * 100);
    const cls = gr.correct ? 'hit' : 'miss';
    return `<div class="gtb-row">
      <div class="gtb-label">${esc(gr.guess)}</div>
      <div class="gtb-bar-track"><div class="gtb-bar-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="gtb-time">${secs.toFixed(1)}s</div>
    </div>`;
  }).join('');
  section.style.display = 'block';
}

// Render one textarea per missed prize. Notes persist on deck.history[0].prizes[i].note.
// The most recent session is always index 0 (newest-first via unshift).
function renderMissedNotes(prizes, usedPrizeIdxs, deck) {
  const section = document.getElementById('missed-notes-section');
  const list = document.getElementById('missed-notes-list');
  if (!section || !list) return;

  const missedIdxs = prizes.map((_, i) => i).filter(i => !usedPrizeIdxs.has(i));
  if (!missedIdxs.length || !deck || !deck.history || !deck.history[0]) {
    section.style.display = 'none';
    return;
  }

  const session = deck.history[0];
  list.innerHTML = missedIdxs.map(i => {
    const card = prizes[i];
    const existing = session.prizes && session.prizes[i] ? (session.prizes[i].note || '') : '';
    return `<div class="mn-row">
      <div class="mn-card">${esc(cn23(card.apiName || card.name))}</div>
      <textarea class="mn-input" data-prize-idx="${i}" aria-label="Note on this missed card" placeholder="Why did I miss this? (e.g. 'didn't expect the tech')">${esc(existing)}</textarea>
    </div>`;
  }).join('');

  // Replace the node to drop any listener from a previous reveal, then attach once.
  // (This function runs after every game, so a plain addEventListener would stack.)
  const fresh = list.cloneNode(true);
  list.parentNode.replaceChild(fresh, list);

  let saveTimer = null;
  fresh.addEventListener('input', e => {
    const ta = e.target.closest('.mn-input');
    if (!ta) return;
    const idx = parseInt(ta.dataset.prizeIdx);
    if (isNaN(idx) || !session.prizes || !session.prizes[idx]) return;
    session.prizes[idx].note = ta.value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { Promise.resolve(saveState()).then(() => f40Saved(fresh)); }, 600);
  });

  section.style.display = 'block';
}

function showPerfectOverlay(score, pc) {
  // Remove any existing overlay so repeat perfects retrigger animation
  const existing = document.getElementById('perfect-overlay');
  if (existing) existing.remove();
  const o = document.createElement('div');
  o.id = 'perfect-overlay';
  o.className = 'perfect-overlay';
  o.innerHTML = `<div class="perfect-inner">PERFECT!<br><span class="perfect-score">${score}/${pc}</span></div>`;
  document.body.appendChild(o);
  // Auto-dismiss after 2.5s or on tap
  setTimeout(() => o.classList.add('fading'), 2200);
  setTimeout(() => o.remove(), 2600);
  o.addEventListener('click', () => o.remove());
}

function buildGuessComparison(guessResults, prizes, pc) {
  const grid = document.getElementById('guess-compare-grid');
  if (!grid) return;
  const rows = [];
  const matchedPrizes = new Set();

  // Each guess paired with the exact prize it matched (from the scorer)
  guessResults.forEach(gr => {
    let prizeName = '-';
    if (gr.correct && gr.matchedPrizeIdx >= 0) {
      const p = prizes[gr.matchedPrizeIdx];
      prizeName = cn23(p.apiName || p.name);
      matchedPrizes.add(gr.matchedPrizeIdx);
    }
    rows.push('<div class="guess-compare-row ' + (gr.correct ? 'hit' : 'miss') + '">' +
      '<div class="gcr-guess">' + esc(gr.guess) + '</div>' +
      '<div class="gcr-arrow">' + (gr.correct ? '✓' : '✗') + '</div>' +
      '<div class="gcr-prize ' + (gr.correct ? 'matched' : 'missed') + '">' + esc(prizeName) + '</div>' +
    '</div>');
  });

  // Unguessed prizes
  prizes.forEach((p, i) => {
    if (matchedPrizes.has(i)) return;
    const name = cn23(p.apiName || p.name);
    rows.push('<div class="guess-compare-row miss">' +
      '<div class="gcr-guess gcr-empty">No guess</div>' +
      '<div class="gcr-arrow">✗</div>' +
      '<div class="gcr-prize unguessed">' + esc(name) + ' (missed)</div>' +
    '</div>');
  });
  grid.innerHTML = rows.join('');
}

function calcRating(score, elapsed, prizeCount) {
  const pct = score / prizeCount;
  // time par: ~8s per card visible
  const par = (60 - prizeCount) * 8;
  const fast = elapsed < par * 0.7;
  if (pct === 1 && fast)   return { grade: 'S' };
  if (pct === 1)            return { grade: 'A' };
  if (pct >= 0.66 && fast) return { grade: 'A' };
  if (pct >= 0.66)          return { grade: 'B' };
  if (pct >= 0.33)          return { grade: 'C' };
  return { grade: 'D' };
}

function updatePersonalBests(deck, score, elapsed, prizeCount) {
  if (!deck.personalBests) deck.personalBests = {};
  const newPBs = [];
  // Fastest per score tier (only for default 6-prize mode)
  if (prizeCount === 6) {
    const key = 'fastest_' + score;
    if (!deck.personalBests[key] || elapsed < deck.personalBests[key]) {
      deck.personalBests[key] = elapsed;
      newPBs.push(key);
    }
  }
  return newPBs;
}

function renderPersonalBests(deck, container, newPBs) {
  if (!deck || !deck.personalBests) { container.innerHTML = ''; return; }
  const pb = deck.personalBests;
  const tiers = [6,5,4,3];
  const cells = tiers.filter(t => pb['fastest_' + t] !== undefined).map(t => {
    const isNew = newPBs.includes('fastest_' + t);
    return `<div class="pb-cell">
      <div class="pb-val ${isNew ? 'pb-new' : ''}">${formatTime(pb['fastest_' + t])}</div>
      <div class="pb-lbl">Fastest ${t}/6${isNew ? '<br>New best' : ''}</div>
    </div>`;
  });
  if (!cells.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="pb-box">
    <div class="pb-title">Personal bests</div>
    <div class="pb-grid">${cells.join('')}</div>
  </div>`;
}

function renderHistoryTable() {
  const deck = findDeck(state.activeDeckId);
  const tbody = document.getElementById('history-tbody');
  if (!deck || !deck.history?.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim);font-style:italic;">No history yet.</td></tr>';
    return;
  }
  tbody.innerHTML = deck.history.slice(0, 10).map((h, i) => {
    const hpc = h.prizeCount || 6;
    return `<tr>
      <td>${deck.history.length - i}</td>
      <td class="${h.score === hpc ? 'score-perfect' : ''}">${h.score}/${hpc}</td>
      <td>${formatTime(h.time)}</td>
      <td>${h.date}</td>
    </tr>`;
  }).join('');
}

function playAgain() {
  // Leaving the tournament flow via Play Again ends the block
  tournament.active = false;
  startGame(state.activeDeckId);
}
function goHome() {
  tournament.active = false;
  showScreen('home');
  renderHome();
}
var confirmQuit;   // set further down
// 2.7.3: Back to menu, a button on the game screen beside Reveal prizes. It leaves the game the
// way Quit does (the clock stops, nothing is scored), without the browser's confirm box.
function backToMenu() {
  try { stopTimer(); } catch (_) {}
  try { closeSheet(); } catch (_) {}
  if (typeof game === 'object' && game) game._reach = null;
  goHome();
}

// ═══════════ THUMBNAIL PICKER ═══════════

function openThumbPicker(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;

  // Get current thumb url
  const currentThumb = deck.thumbUrl || (deck.cards?.find(c => c.imageUrl)?.imageUrl || '');

  // Build grid of all unique cards that have images (deduplicated by imageUrl)
  const seen = new Set();
  const uniqueCards = deck.cards.filter(c => {
    if (!c.imageUrl || seen.has(c.imageUrl)) return false;
    seen.add(c.imageUrl);
    return true;
  });

  const grid = document.getElementById('picker-grid');
  grid.innerHTML = uniqueCards.map(card => {
    const rawName = card.apiName || card.name;
    const displayName = esc(rawName.replace(/\{[a-zA-Z]\}/g,'').trim());
    const isSelected = card.imageUrl === currentThumb || (card.fallbackUrls || []).includes(currentThumb);
    const fallbacks = JSON.stringify(card.fallbackUrls || []);
    return `
      <div class="picker-card ${isSelected ? 'selected' : ''}" data-deck="${esc(deckId)}" data-src="${esc(card.imageUrl)}" onclick="selectThumb(this.dataset.deck, this.querySelector('img') ? this.querySelector('img').src : this.dataset.src)">
        <div class="picker-card-img">
          <img src="${esc(card.imageUrl)}" alt="${displayName}"
            data-fallbacks="${esc(fallbacks)}" data-fallback-idx="0"
            onerror="reviewImgError(this)">
        </div>
        <div class="picker-card-name">${displayName}</div>
      </div>`;
  }).join('');

  document.getElementById('thumb-picker-modal').classList.add('active');
}

function closeThumbPicker() {
  document.getElementById('thumb-picker-modal').classList.remove('active');
}

async function selectThumb(deckId, imageUrl) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  deck.thumbUrl = imageUrl;
  await saveState();
  closeThumbPicker();
  renderHome();
  showToast('Thumbnail updated!');
}

// ═══════════ WEAK SPOTS ═══════════
function openWeakSpots(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || !deck.history?.length) return;

  document.getElementById('ws-title').textContent = deck.name;

  const sessions = deck.history.filter(h => h.prizes); // only sessions with card data
  const totalSessions = deck.history.length;
  const avgScore = (deck.history.reduce((a,h) => a + (h.score / (h.prizeCount || 6)), 0) / totalSessions * 100).toFixed(0);
  const perfectCount = deck.history.filter(h => h.score === (h.prizeCount || 6)).length;

  // Tally miss rates per card name (base name: strip set/variant)
  const cardStats = {}; // { baseName: { missed, prized, imageUrl } }

  sessions.forEach(h => {
    (h.prizes || []).forEach(p => {
      const base = baseName(p.name);
      if (!cardStats[base]) {
        // find image from deck cards
        const match = deck.cards.find(c => baseName(c.apiName || c.name) === base);
        cardStats[base] = { missed: 0, prized: 0, imageUrl: match?.imageUrl || '', label: cn23(match ? (match.apiName || match.name) : p.name) };
      }
      cardStats[base].prized++;
      if (p.missed) cardStats[base].missed++;
    });
  });

  // Sort by miss rate descending, then by times prized
  const sorted = Object.entries(cardStats)
    .map(([name, s]) => ({ name, ...s, rate: s.prized > 0 ? s.missed / s.prized : 0 }))
    .filter(c => c.prized >= 2) // need at least 2 appearances for meaningful data
    .sort((a, b) => b.rate - a.rate || b.prized - a.prized);

  // Trend bars (last 10 sessions newest-first → display oldest-first)
  const recentSessions = deck.history.slice(0, 10).reverse();

  // Build insights
  const worstCard = sorted[0];
  const mostPrized = [...sorted].sort((a,b) => b.prized - a.prized)[0];
  const insights = [];
  if (worstCard && worstCard.rate >= 0.5) {
    insights.push(`You miss <b>${esc(worstCard.label)}</b> when it's prized ${Math.round(worstCard.rate*100)}% of the time. That is your biggest blind spot.`);
  }
  if (mostPrized && mostPrized.prized >= 3) {
    insights.push(`<b>${esc(mostPrized.label)}</b> has been a prize card ${mostPrized.prized} times across ${sessions.length} tracked sessions. High variance card.`);
  }
  const improving = recentSessions.length >= 4 &&
    recentSessions.slice(-2).reduce((a,h)=>a+h.score/(h.prizeCount||6),0) / 2 >
    recentSessions.slice(0,2).reduce((a,h)=>a+h.score/(h.prizeCount||6),0) / 2;
  if (improving) insights.push(`Your recent scores are trending upward, keep going!`);

  const body = document.getElementById('ws-body');
  body.innerHTML = `<div class="ws-body-inner">

    <div class="ws-summary">
      <div class="ws-summary-grid">
        <div>
          <div class="ws-stat-val">${totalSessions}</div>
          <div class="ws-stat-lbl">Sessions played</div>
        </div>
        <div>
          <div class="ws-stat-val">${avgScore}%</div>
          <div class="ws-stat-lbl">Average score</div>
        </div>
        <div>
          <div class="ws-stat-val">${perfectCount}</div>
          <div class="ws-stat-lbl">Perfect runs</div>
        </div>
      </div>
    </div>

    ${sorted.filter(c => c.rate > 0).length >= 2 ? `
    <button class="btn btn-primary btn-block" onclick="startDrillMissed('${deck.id}')"><svg class="ic"><use href="#i-target"/></svg>Drill your missed cards</button>
    ` : ''}

    ${renderProgressSection(deck)}
    ${renderProgressExtras(deck)}

    ${insights.length ? `
    <div class="ws-insight">
      <div class="ws-insight-title">Insights</div>
      ${insights.map(i => `<div class="ws-insight-text">${i}</div>`).join('')}
    </div>` : ''}

    <div class="ws-trend-wrap">
      <div class="section-title">Score trend</div>
      <div class="ws-trend-bars">
        ${recentSessions.map(h => {
          const hpc = h.prizeCount || 6;
          const pct = Math.round((h.score / hpc) * 100);
          const cls = h.score === hpc ? 'perfect' : pct >= 66 ? 'good' : pct >= 33 ? 'mid' : 'bad';
          return `<div class="ws-trend-bar-col">
            <div class="ws-trend-bar ${cls}" style="height:${Math.max(pct*0.9,4)}px"></div>
            <div class="ws-trend-label">${h.score}/${hpc}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="ws-list">
    <div class="section-title">Miss rate by card</div>
    ${sorted.length === 0
      ? `<div class="ws-card-sub" style="padding:0.25rem 0 0.75rem;">Play more sessions to build miss rate data.</div>`
      : sorted.map(c => {
          const pct = Math.round(c.rate * 100);
          const cls = pct >= 60 ? 'danger' : pct >= 30 ? 'warning' : 'good';
          return `
          <div class="ws-card-row ${cls}">
            <div class="ws-card-thumb">
              ${c.imageUrl ? `<img src="${esc(c.imageUrl)}" alt="${esc(c.name)}">` : '<i class=ph-card></i>'}
            </div>
            <div class="ws-card-info">
              <div class="ws-card-name">${esc(c.label)}</div>
              <div class="ws-card-sub">Prized ${c.prized} times, missed ${c.missed}</div>
            </div>
            <div class="ws-bar-wrap">
              <div class="ws-bar-track">
                <div class="ws-bar-fill ${cls}" style="width:${pct}%"></div>
              </div>
              <div class="ws-bar-pct">${pct}% missed</div>
            </div>
          </div>`;
        }).join('')
    }
    </div>
  </div>`;

  showScreen('weakspots');
}

function baseName(name) {
  // Normalise card name for grouping: lowercase, strip set suffix, strip {X} energy symbols
  return (name || '').toLowerCase().replace(/\{([a-z])\}/g, (_, l) => (EN23[l] || '').toLowerCase()).replace(/\s+/g,' ').trim();
}

// ═══════════ MODE MODAL ═══════════
function openModeModal(deckId) {
  modeDeckId = deckId;
  // reset toggles to current modeSettings
  setModeOpt('prizes', modeSettings.prizes, true);
  setModeOpt('timelimit', modeSettings.timelimit, true);
  setModeOpt('view', modeSettings.view, true);
  setModeOpt('reach', modeSettings.reach, true);
  document.getElementById('mode-modal').classList.add('active');
  const _hDeck = state.decks.find(d => d.id === modeDeckId);
  const _hBtn = document.getElementById('mode-hide-btn');
  if (_hBtn && _hDeck) {
    _hBtn.innerHTML = _hDeck.hidden
      ? '<svg class="ic ic-sm"><use href="#i-eye"/></svg>Show deck'
      : '<svg class="ic ic-sm"><use href="#i-eye-off"/></svg>Hide deck';
  }
  const _mdn = document.getElementById('mode-deck-name');
  if (_mdn) _mdn.textContent = _hDeck ? _hDeck.name : '';
}

function closeModeModal() {
  document.getElementById('mode-modal').classList.remove('active');
}

var deleteDeckFromModal;   // set further down (behind the delete confirm)

function setModeOpt(group, val, silent) {
  if (!silent) modeSettings[group] = val;
  const container = document.getElementById('mode-' + group);
  if (!container) return;
  container.querySelectorAll('.mode-opt').forEach(el => {
    el.classList.toggle('active', String(el.dataset.val) === String(val));
  });
}

function startGameFromMode() {
  game.prizeCount  = modeSettings.prizes;
  game.timeLimit   = parseInt(modeSettings.timelimit) || 0;
  game.tableCheck  = modeSettings.view === 'table';
  game.reachCheck  = modeSettings.reach === 'on';
  // Tournament: if user selected 'n', start a block
  if (modeSettings.tournament === 'n') {
    tournament.active = true;
    tournament.total = modeSettings.tournamentN;
    tournament.current = 0;
    tournament.scores = [];
    tournament.deckId = modeDeckId;
  } else {
    tournament.active = false;
  }
  closeModeModal();
  startGame(modeDeckId);
}

// Called when tapping a deck card directly: always uses default 6 prizes, no time limit.
function startGameDefault(deckId) {
  game.prizeCount = 6;
  game.timeLimit = 0;
  game.tableCheck = false;
  game.reachCheck = false;
  game._drillMissWeights = null;
  tournament.active = false;
  startGame(deckId);
}

// Drill mode: weights prize selection toward cards you've missed historically.
// Weight formula: 1 + (missed * 3) + (prized > 0 ? missRate * 2 : 0)
// So never-missed cards get weight 1, frequently-missed cards get much higher weight.
function startDrillMissed(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || !deck.history?.length) return;
  const stats = {}; // baseName -> {missed, prized}
  deck.history.forEach(h => {
    (h.prizes || []).forEach(p => {
      const key = baseName(p.name);
      if (!stats[key]) stats[key] = { missed: 0, prized: 0 };
      stats[key].prized++;
      if (p.missed) stats[key].missed++;
    });
  });
  // Attach a weight to each deck card based on its base name's miss history
  const weights = {};
  Object.entries(stats).forEach(([key, s]) => {
    const rate = s.prized > 0 ? s.missed / s.prized : 0;
    weights[key] = 1 + (s.missed * 3) + (rate * 4);
  });
  game._drillMissWeights = weights;
  game.prizeCount = 6;
  game.timeLimit = 0;
  game.tableCheck = false;
  game.reachCheck = false;
  showScreen('home'); // dismiss weak spots
  startGame(deckId);
  showToast('Drill mode: prizes biased toward your weak spots.');
}




// ═══════════ FORMAT ═══════════
function setImportFormat(fmt) {
  importFormat = fmt;
  document.getElementById('fmt-standard').classList.toggle('active', fmt === 'standard');
  document.getElementById('fmt-expanded').classList.toggle('active', fmt === 'expanded');
  document.getElementById('fmt-prerelease').classList.toggle('active', fmt === 'prerelease');
}

// ═══════════ EXPORT CSV ═══════════
function exportHistory() {
  const deck = findDeck(state.activeDeckId);
  if (!deck || !deck.history?.length) { showToast('No history to export.'); return; }
  const rows = [['#','Score','Time (s)','Date','Prizes','Missed']];
  deck.history.forEach((h, i) => {
    const prizes = (h.prizes || []).map(p => p.name).join('; ');
    const missed = (h.prizes || []).filter(p => p.missed).map(p => p.name).join('; ');
    rows.push([i+1, h.score+'/'+(h.prizeCount || 6), h.time, h.date, prizes, missed]);
  });
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (deck.name || 'deck') + '_history.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported!');
}

// ═══════════ CONFETTI ═══════════
function launchConfetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    r: 5 + Math.random() * 6,
    d: 2 + Math.random() * 3,
    color: ['#f0c040','#60d060','#4090e0','#e04040','#c040c0','#40c0c0'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: 0.1 + Math.random() * 0.1,
  }));
  let frame = 0;
  const maxFrames = 160;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
      p.y += p.d;
      p.tiltAngle += p.tiltSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    frame++;
    if (frame < maxFrames) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}


// ═══════════ HOW TO PLAY ═══════════
function openHowToPlay() { document.getElementById('how-to-modal').classList.add('active'); }
function closeHowToPlay() { document.getElementById('how-to-modal').classList.remove('active'); }
function openShortcuts() { document.getElementById('shortcuts-modal').classList.add('active'); }
function closeShortcuts() { document.getElementById('shortcuts-modal').classList.remove('active'); }
function setTheme(t) {
  if (t === 'light') document.body.dataset.theme = 'light';
  else delete document.body.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f2eee5' : '#131210');
}
function loadThemePref() {
  try {
    const t = localStorage.getItem('ptcg_theme');
    if (t === 'light') setTheme('light');
    else setTheme('dark');
  } catch(e) { setTheme('dark'); }
}

// ═══════════ BACKUP / RESTORE ═══════════
var openBackupModal;   // set further down (backup sheet, v37)

function closeBackupModal() {
  document.getElementById('backup-modal').classList.remove('active');
}

async function copyBackup() {
  const text = document.getElementById('backup-textarea').value;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Backup copied to clipboard!');
  } catch(e) {
    showToast('Long-press the text box and select all, then copy.');
  }
}

async function restoreBackup() {
  const text = document.getElementById('backup-textarea').value.trim();
  if (!text) { showToast('Nothing to restore.'); return; }
  try {
    const parsed = JSON.parse(text);
    if (!parsed.decks) { showToast('Invalid backup data.'); return; }
    if (!(await rdConfirm({ title: 'Replace all your data?', text: 'This backup replaces all decks and history on this device.', yes: 'Replace', danger: true }))) return;
    state = parsed;
    await saveState();
    closeBackupModal();
    renderHome();
    showToast('Restored ' + state.decks.length + ' deck(s)!');
  } catch(e) {
    showToast('Could not parse backup. Make sure you pasted the full text.');
  }
}

// ═══════════ SCREENS ═══════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const map = { home: 'screen-home', review: 'screen-review', game: 'screen-game', results: 'screen-results', weakspots: 'screen-weakspots', tlog: 'screen-tlog', puzzle: 'screen-puzzle' };
  document.getElementById(map[name]).classList.add('active');
  window.scrollTo(0, 0);
}

// ═══════════ LOADING ═══════════
function showLoading(msg = 'Loading…') {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('loading-overlay').classList.add('active');
}
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

// ═══════════ TOAST ═══════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); toastTimer = setTimeout(() => { if (!t.classList.contains('show')) t.textContent = ''; }, 400); }, 2800);
}


// ── SHARE APP ──
let _rdAppFileP = null;
async function shareApp() {
  document.getElementById('share-modal-overlay').classList.add('active');
  // Build the one-file copy now, so Share the file answers the tap right away
  // (a phone only allows the share sheet shortly after a tap).
  _rdAppFileP = rdAppFile(); _rdAppFileP.catch(() => { _rdAppFileP = null; });

  // Detect capability
  const canNativeShare = !!(navigator.share);

  if (canNativeShare) {
    document.getElementById('share-native-wrap').style.display = 'block';
    document.getElementById('share-download-wrap').style.display = 'none';
  } else {
    document.getElementById('share-native-wrap').style.display = 'none';
    document.getElementById('share-download-wrap').style.display = 'block';
  }

  // Auto-select best tab based on platform
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) showShareTab('ios');
  else if (/Android/.test(ua)) showShareTab('android');
  else showShareTab('desktop');
}

// The app is index.html plus the scripts in js/. A friend opens the shared copy from their
// Downloads folder, where those files are not, so the copy carries them inside the page, in the
// same places (the same file app-file.mjs --single writes).
async function rdAppFile() {
  const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.text(); };
  const html = await get(location.href);
  const re = /<script([^>]*?) src="(js\/[\w.-]+\.js\?v=[0-9a-z]+)"><\/script>/g, files = new Map();
  for (const m of html.matchAll(re)) files.set(m[2], null);
  await Promise.all([...files.keys()].map(async u => files.set(u, await get(u))));
  return new Blob([html.replace(re, (_, a, u) => '<script' + a + '>' + files.get(u) + '<\/script>')], { type: 'text/html' });
}

async function doNativeShare() {
  try {
    const blob = await (_rdAppFileP || rdAppFile());
    const file = new File([blob], 'RdyDeck.html', { type: 'text/html' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'RdyDeck', text: 'Open in a browser to play!', files: [file] });
    } else {
      await navigator.share({ title: 'RdyDeck', text: 'Pokémon TCG deck grader and prize trainer: save RdyDeck.html and open it in a browser!' });
    }
  } catch(e) {
    if (e.name !== 'AbortError') {
      document.getElementById('share-native-wrap').style.display = 'none';
      document.getElementById('share-download-wrap').style.display = 'block';
    }
  }
}

async function downloadAppFile() {
  let href = location.href, blobUrl = '';
  try { blobUrl = href = URL.createObjectURL(await (_rdAppFileP || rdAppFile())); } catch (_) {}
  try {
    const a = document.createElement('a');
    a.href = href;
    a.download = 'RdyDeck.html';
    a.click();
  } catch(e) {
    showToast('Right-click the page and choose "Save As" to download.');
  }
  if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

function showShareTab(tab) {
  document.querySelectorAll('.share-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.share-tab-content').forEach(d => d.style.display = 'none');
  document.getElementById('share-tab-' + tab).style.display = 'block';
  const btn = document.querySelector(`.share-tab[onclick="showShareTab('${tab}')"]`);
  if (btn) btn.classList.add('active');
}

function closeShareModal() {
  document.getElementById('share-modal-overlay').classList.remove('active');
}



// ═══════════ PWA SERVICE WORKER + INSTALL ═══════════
let deferredInstallPrompt = null;

// 2.7.4: register once the page has loaded, so the offline copy downloads after the first screen.
if ('serviceWorker' in navigator) {
  const swGo = () => navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.warn('SW registration failed:', err));
  if (document.readyState === 'complete') swGo(); else window.addEventListener('load', swGo, { once: true });
}

// Capture the install prompt for use later
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallButton();
  showToast('✓ App installed!');
});

function showInstallButton() {
  if (PT_PLAY) return;  // already an installed app
  let btn = document.getElementById('pwa-install-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = 'btn btn-primary btn-block';
    btn.innerHTML = '<svg class="ic"><use href="#i-save"/></svg>Install app';
    btn.onclick = triggerInstall;
    // Insert before the import button
    const cta = document.querySelector('#screen-home .home-cta');
    if (cta) cta.parentNode.insertBefore(btn, cta);
  }
  btn.style.display = '';
}

function hideInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
}

async function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') {
    showToast('✓ Installing...');
  }
  deferredInstallPrompt = null;
  hideInstallButton();
}

// Check if already installed (standalone mode)
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  // Already installed: hide share/install related stuff
  console.log('Running as installed PWA');
}


// ═══════════ v24: tour, Practice tab, starter decks, help and feedback ═══════════
// v2.0: versions people see follow 2.0, 2.1 (feature releases), 2.1.1 (small fixes). 1.x was the PrizeTrainer era.
// PT_BUILD keeps counting every release and matches the sw.js cache name (prize-trainer-v plus PT_BUILD, so build 93 is prize-trainer-v93); it shows only in feedback mail.
const PT_VERSION = 'v3.4.18';
const PT_BUILD = 146;
const TOUR_KEY = 'pt_tour_v24';
// v42: feedback goes by email from the player's own mail app; no public GitHub issues.
// While this is empty, Send feedback is hidden.
const FEEDBACK_EMAIL = 'support@rdydeck.com';
// Captured before the share and daily handlers clear the address.
const _v24StartHash = String(location.hash || '');

// Text from people: drop control and direction marks, cap the length.
function v24Clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁩﻿]/g, '')
    .slice(0, max || 2000);
}

// ── Practice tab: Hand, Drills and Notes grouped under one tab ──
const PRACTICE_TABS = ['hand', 'drills', 'notes'];
let lastPracticeTab = 'hand';
const _v23ShowReviewTab = showReviewTab;
showReviewTab = function (which) {
  if (which === 'practice') which = lastPracticeTab;
  _v23ShowReviewTab(which);
  const inP = PRACTICE_TABS.includes(which);
  if (inP) { lastPracticeTab = which; safeLocalSet('pt_practice_tab', which); }
  const pb = document.getElementById('rv-tab-practice');
  if (pb) { pb.classList.toggle('active', inP); pb.setAttribute('aria-selected', inP ? 'true' : 'false'); }
  document.querySelectorAll('.review-tabs .rv-tab').forEach(b => { if (b.id !== 'rv-tab-practice') b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false'); });
  const sub = document.getElementById('rv-sub');
  if (sub) sub.style.display = inP ? '' : 'none';
  PRACTICE_TABS.forEach(k => { const b = document.getElementById('rv-tab-' + k); if (b) b.setAttribute('aria-pressed', k === which ? 'true' : 'false'); });
};
(function () { const t = safeLocalGet('pt_practice_tab'); if (PRACTICE_TABS.includes(t)) lastPracticeTab = t; })();

// ── Starter decks: real tournament lists, loaded through the normal import ──
const STARTER_AS_OF = '31 Oct 2026';
const STARTER_DECKS = [
  { id: 'dragapult', name: 'Dragapult ex', by: 'Andrew Hedrick', place: '1st', event: 'Regional Puebla', date: '24 Oct 2026', src: 'https://limitlesstcg.com/decks/list/29678', list:
`Pokémon: 19
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Munkidori TWM 95
2 Budew ASC 16
1 Dunsparce TEF 128
1 Dudunsparce TEF 129
1 Meowth ex POR 62
1 Fezandipiti ex ASC 142

Trainer: 32
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Crispin SCR 133
1 Rosa's Encouragement POR 84
1 Judge POR 76
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
4 Crushing Hammer POR 71
3 Ultra Ball MEG 131
3 Night Stretcher ASC 196
1 Unfair Stamp TWM 165
2 Risky Ruins MEG 127

Energy: 9
3 Fire Energy MEE 10
3 Psychic Energy MEE 13
3 Darkness Energy MEE 15` },
  { id: 'slowking', name: 'Slowking', by: 'Aarni Karjala', place: '1st', event: 'Regional Gdańsk', date: '31 Oct 2026', src: 'https://limitlesstcg.com/decks/list/30165', list:
`Pokémon: 22
4 Slowpoke SCR 57
3 Slowking SCR 58
4 Mega Kangaskhan ex MEG 104
2 Latias ex SSP 76
2 Metagross CRI 61
2 Kyurem SFA 47
1 Fezandipiti ex ASC 142
1 Zeraora DRI 78
1 Lillie's Clefairy ex JTG 56
1 Meowth ex POR 62
1 Mew ex 30C 66

Trainer: 28
4 Ciphermaniac's Codebreaking TEF 145
4 Lillie's Determination MEG 119
4 Ultra Ball MEG 131
4 Poké Pad POR 81
3 Wondrous Patch PFL 94
2 Night Stretcher ASC 196
1 Switch MEG 130
1 Secret Box TWM 163
1 Lucky Helmet TWM 158
4 Academy at Night SFA 54

Energy: 10
4 Psychic Energy MEE 13
4 Telepathic Psychic Energy POR 88
2 Boomerang Energy TWM 166` },
  { id: 'honchkrow', name: "Team Rocket's Honchkrow", by: 'Finn Lasse Fries', place: '2nd', event: 'Regional Gdańsk', date: '31 Oct 2026', src: 'https://limitlesstcg.com/decks/list/28372', list:
`Pokémon: 13
4 Team Rocket's Murkrow DRI 127
3 Team Rocket's Honchkrow ASC 127
2 Team Rocket's Porygon DRI 153
1 Team Rocket's Porygon2 DRI 154
2 Team Rocket's Articuno DRI 51
1 Team Rocket's Mimikyu DRI 87

Trainer: 39
4 Team Rocket's Archer DRI 170
4 Team Rocket's Ariana DRI 171
4 Team Rocket's Petrel DRI 176
4 Team Rocket's Proton DRI 177
4 Team Rocket's Giovanni DRI 174
4 Team Rocket's Transceiver DRI 178
4 Poké Pad POR 81
4 Roto-Stick PRE 127
2 Night Stretcher ASC 196
1 Pokégear 3.0 SVI 186
1 Miracle Headset SSP 183
3 Team Rocket's Factory DRI 173

Energy: 8
4 Ignition Energy WHT 86
4 Team Rocket's Energy DRI 182` },
  { id: 'alakazam', name: 'Alakazam Dudunsparce', by: 'Nathan Ginsburg', place: '3rd', event: 'Regional Puebla', date: '24 Oct 2026', src: 'https://limitlesstcg.com/decks/list/30794', list:
`Pokémon: 21
4 Abra MEG 54
4 Kadabra MEG 55
3 Alakazam MEG 56
3 Dunsparce JTG 120
2 Dudunsparce TEF 129
2 Lillie's Clefairy ex JTG 56
1 Fezandipiti ex ASC 142
1 Genesect SFA 40
1 Flutter Mane TEF 78

Trainer: 31
4 Dawn PFL 87
4 Hilda WHT 84
2 Boss's Orders MEG 114
4 Buddy-Buddy Poffin TEF 144
4 Poké Pad POR 81
3 Wondrous Patch PFL 94
2 Rare Candy MEG 125
1 Sacred Ash DRI 168
1 Special Red Card CRI 82
3 Lillie's Pearl JTG 151
3 Battle Cage PFL 85

Energy: 8
4 Telepathic Psychic Energy POR 88
2 Psychic Energy MEE 13
1 Mist Energy TEF 161
1 Enriching Energy SSP 191` },
  { id: 'crustle', name: 'Crustle Kangaskhan', by: 'Miloslav Posledni', place: '4th', event: 'Regional Gdańsk', date: '31 Oct 2026', src: 'https://limitlesstcg.com/decks/list/31082', list:
`Pokémon: 10
4 Mega Kangaskhan ex MEG 104
3 Dwebble DRI 11
3 Crustle DRI 12

Trainer: 35
4 Boss's Orders MEG 114
4 Team Rocket's Petrel DRI 176
3 Lillie's Determination MEG 119
3 Crispin SCR 133
2 Eri TEF 146
2 Hilda WHT 84
1 Xerosic's Machinations SFA 64
1 Pokémon Center Lady MEG 123
4 Jumbo Ice Cream PFL 91
3 Pokégear 3.0 SVI 186
2 Buddy-Buddy Poffin TEF 144
1 Switch MEG 130
1 Ultra Ball MEG 131
1 Hero's Cape TEF 152
1 Lumiose City POR 77
1 Festival Grounds TWM 149
1 Prism Tower CRI 80

Energy: 15
4 Mist Energy TEF 161
4 Growing Grass Energy POR 86
2 Spiky Energy JTG 159
1 Psychic Energy MEE 13
1 Darkness Energy MEE 15
1 Fighting Energy MEE 14
1 Fire Energy MEE 10
1 Grass Energy MEE 9` },
];

function starterLoaded(id) { return state.decks.some(d => d.starter === id); }
var openStarterPicker;   // set further down
async function loadStarterDeck(id) {
  const s = STARTER_DECKS.find(x => x.id === id);
  if (!s) return;
  closeSheet();
  openImportModal();
  document.getElementById('import-name').value = s.name;
  const t = document.getElementById('import-list');
  t.value = s.list;
  t.dispatchEvent(new Event('input'));
  setImportFormat('standard');
  const before = state.decks.length;
  await importDeck();
  if (state.decks.length > before) {
    const d = state.decks[state.decks.length - 1];
    d.starter = s.id;
    d.starterAsOf = s.date;
    await saveState();
    renderHome();
  }
}

// ── Help and feedback ──
function openHelpSheet() {
  const row = (fn, icon, t, s) => `<button class="hs-row" onclick="${fn}"><span class="ha-ic">${ic23(icon)}</span><span class="hs-tx"><b>${t}</b><span>${s}</span></span><svg class="ic hs-go"><use href="#i-next"/></svg></button>`;
  openSheet(`<div class="modal-title">Help and feedback</div>
    <div class="hs-list">
      ${row("closeSheet();startTour(true)", 'play', 'Take the tour', 'A one minute walk through the app')}
      ${row("closeSheet();openHowToPlay()", 'help', 'How to play', 'Every step of a prize game')}
      ${FEEDBACK_EMAIL ? row("closeSheet();openFeedback()", 'alert', 'Send feedback', 'Report a bug or a missing card') : ''}
      ${row("closeSheet();openShortcuts()", 'keyboard', 'Keyboard shortcuts', 'For playing on a computer')}
    </div>
    <div class="modal-hint" style="margin-top:0.9rem">RdyDeck ${PT_VERSION}${PT_PLAY ? ' (Google Play)' : ''}</div>
    <div class="modal-actions"><button class="btn" onclick="closeSheet()">Close</button></div>`);
}

let fbKind = 'Bug';
function openFeedback() {
  fbKind = 'Bug';
  const deck = state.decks.find(d => d.id === state.activeDeckId) || state.decks[0];
  openSheet(`<div class="modal-title">Send feedback</div>
    <div class="modal-hint" style="margin-bottom:0.9rem">This opens an email to us in your own email app, with the details filled in. Nothing is sent until you press Send there. Under 13? Ask a parent to send it.</div>
    <div class="field-label">What is it about?</div>
    <div class="seg fb-seg" role="group" aria-label="Feedback type">
      ${['Bug', 'Missing card', 'Idea'].map(k => `<button class="mode-opt${k === fbKind ? ' active' : ''}" data-k="${k}" onclick="setFbKind(this)">${k}</button>`).join('')}
    </div>
    <div class="mb" style="margin-top:0.9rem">
      <label for="fb-text">Tell us what happened</label>
      <textarea id="fb-text" maxlength="1500" placeholder="For a missing card, include its name, set code and number."></textarea>
    </div>
    ${deck ? `<label class="fb-check"><input type="checkbox" id="fb-deck"> <span>Include my list for <b>${esc(deck.name)}</b></span></label>` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button><button class="btn btn-primary" onclick="sendFeedback()">${ic23('share')}Open email</button></div>
    <div class="modal-hint" style="margin-top:0.6rem">Or write to ${esc(FEEDBACK_EMAIL)}</div>`);
}
function setFbKind(btn) {
  fbKind = btn.dataset.k;
  document.querySelectorAll('.fb-seg .mode-opt').forEach(b => b.classList.toggle('active', b === btn));
}
function feedbackUrl(kind, text, deck) {
  kind = ['Bug', 'Missing card', 'Idea'].includes(kind) ? kind : 'Bug';
  const body = v24Clean(text, 1500).trim();
  const first = (body.split('\n')[0] || '').trim().slice(0, 60);
  const subject = `RdyDeck ${kind}: ${first || (kind === 'Idea' ? 'Idea' : kind === 'Missing card' ? 'Missing card' : 'Bug report')}`;
  const scr = (document.querySelector('.screen.active') || {}).id || '';
  const ua = navigator.userAgent;
  const device = /iPhone|iPad|iPod/.test(ua) ? 'iPhone or iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other';
  const lines = [
    kind === 'Missing card' ? 'Which card is missing or wrong? (name, set code, number)' : kind === 'Idea' ? 'What would you like?' : 'What happened?',
    body || '',
    '',
    kind === 'Bug' ? 'What did you expect?\n\n' : '',
    '----',
    `App version: ${PT_VERSION} (build ${PT_BUILD})${PT_PLAY ? ' (Google Play)' : ''}`,
    `Screen: ${scr.replace('screen-', '')}`,
    `Device: ${device}, ${innerWidth} px wide`,
  ];
  if (deck) {
    // Long mail links fail in some email apps, so the list is kept short.
    let list = deckListText(deck.cards || []);
    if (list.length > 900) list = list.slice(0, 900) + '\n(cut short)';
    lines.push('', `Deck: ${v24Clean(deck.name, 80)}`, v24Clean(list, 1000));
  }
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(v24Clean(subject, 100))}&body=${encodeURIComponent(lines.filter(l => l !== '').join('\n'))}`;
}
function sendFeedback() {
  if (!FEEDBACK_EMAIL) { closeSheet(); return; }
  const t = document.getElementById('fb-text');
  const inc = document.getElementById('fb-deck');
  const deck = inc && inc.checked ? (state.decks.find(d => d.id === state.activeDeckId) || state.decks[0]) : null;
  const a = document.createElement('a');
  a.href = feedbackUrl(fbKind, t ? t.value : '', deck);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  closeSheet();
  showToast(`Opening your email app. If nothing opens, write to ${FEEDBACK_EMAIL}.`);
}

// ── First run tour ──
const TOUR_STEPS = [
  { ic: 'cards', t: 'Welcome to RdyDeck', s: 'Before each game, six cards from your deck go face down as prizes. Flip through the rest and name what is missing. It builds the memory you need at the table.' },
  { ic: 'plus', t: 'Add a deck', s: 'Paste a list from Pokémon TCG Live or Limitless, or load one of the starter decks from recent Regionals in one tap.' },
  { ic: 'play', t: 'Play a prize game', s: 'Tap Prizes on a deck to start. Modes changes the prize count, adds a timer, or runs a tournament block of games.' },
  { ic: 'grid', t: 'Study your deck', s: 'Open a deck to see Grade, Odds and Cards. Hand, Drills and Notes hold opening hands, goldfish turns, drills and your matchup notes.' },
  { ic: 'calendar', t: 'Come back daily', s: 'The daily challenge is the same shuffle for everyone. Log your matches in the tournament log. Help on the home screen replays this tour and sends feedback.' },
];
let tourStep = 0;
function tourOpen() { const m = document.getElementById('tour-modal'); return !!(m && m.classList.contains('active')); }
function startTour(force) {
  if (!force && safeLocalGet(TOUR_KEY)) return;
  tourStep = 0;
  renderTour();
  document.getElementById('tour-modal').classList.add('active');
  setTimeout(() => { const b = document.getElementById('tour-next'); if (b) b.focus(); }, 50);
}
function closeTour() {
  const m = document.getElementById('tour-modal');
  if (m) m.classList.remove('active');
  safeLocalSet(TOUR_KEY, 'done');
}
function tourGo(d) {
  tourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, tourStep + d));
  renderTour();
}
function renderTour() {
  const el = document.getElementById('tour-inner');
  if (!el) return;
  const st = TOUR_STEPS[tourStep], last = tourStep === TOUR_STEPS.length - 1;
  const noDecks = state.decks.length === 0;
  const dots = TOUR_STEPS.map((_, i) => `<span class="tour-dot${i === tourStep ? ' on' : ''}"></span>`).join('');
  const acts = last
    ? (noDecks
      ? `<button class="btn" onclick="closeTour();openStarterPicker()">${ic23('cards')}Starter decks</button><button class="btn btn-primary" id="tour-next" onclick="closeTour();openImportModal()">${ic23('plus')}Import a deck</button>`
      : `<button class="btn btn-primary" id="tour-next" onclick="closeTour()">Done</button>`)
    : `${tourStep ? `<button class="btn" onclick="tourGo(-1)">${ic23('back')}Back</button>` : ''}<button class="btn btn-primary" id="tour-next" onclick="tourGo(1)">Next${ic23('next')}</button>`;
  el.innerHTML = `<div class="tour-top"><span class="tour-count">${tourStep + 1} of ${TOUR_STEPS.length}</span><button class="btn btn-ghost btn-sm tour-skip" onclick="closeTour()">${last ? 'Close' : 'Skip'}</button></div>
    <div class="tour-ic">${ic23(st.ic)}</div>
    <div class="tour-t" id="tour-title">${st.t}</div>
    <div class="tour-s">${st.s}</div>
    <div class="tour-dots" aria-hidden="true">${dots}</div>
    <div class="tour-acts">${acts}</div>`;
}
document.addEventListener('keydown', e => {
  if (!tourOpen()) return;
  if (e.key === 'Escape') { closeTour(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { tourGo(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { tourGo(-1); e.preventDefault(); }
  else return;
  e.stopImmediatePropagation();
}, true);

// Anything else that takes over the screen closes the tour.
const _v24Wrap = (name, test) => {
  const f = window[name];
  if (typeof f !== 'function') return;
  window[name] = function () { if (tourOpen() && (!test || test.apply(null, arguments))) closeTour(); return f.apply(this, arguments); };
};
_v24Wrap('showScreen', n => n !== 'home');
['openImportModal', 'openModeModal', 'openSheet', 'openHowToPlay', 'openShortcuts', 'openBackupModal', 'openEditModal', 'shareApp'].forEach(n => _v24Wrap(n));

function v24AfterLoad() {
  renderHome();
  if (/^#(deck|daily)/.test(_v24StartHash)) return;
  if (safeLocalGet(TOUR_KEY)) return;
  if (!document.getElementById('screen-home').classList.contains('active') || document.querySelector('.modal-overlay.active')) return;
  if (state.decks.length === 0) { startTour(); return; }
  // People updating from v23 already know the app: point out the moved tabs once.
  safeLocalSet(TOUR_KEY, 'done');
  showToast('Hand, Drills and Notes each have their own tab on a deck. Help has a short tour.');
}
document.addEventListener('DOMContentLoaded', () => setTimeout(v24AfterLoad, 900));

// ── Home: empty state and the starter deck button ──
const _v23RenderHome = renderHome;
renderHome = function () {
  _v23RenderHome();
  if (state.decks.length === 0) {
    document.getElementById('deck-list').innerHTML = `<div class="empty-state st-empty">
      <div class="tour-ic">${ic23('cards')}</div>
      <b>Start with a prize game</b>
      <span>Add a deck, then tap play. Six cards go face down and you name them.</span></div>`;
  }
};

// Card pictures load as they scroll into view, which saves data on phones.
const _v24ImgObs = new MutationObserver(muts => {
  muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    (n.tagName === 'IMG' ? [n] : n.querySelectorAll('img')).forEach(img => {
      if (!img.closest('#review-body')) return;
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }));
});
document.addEventListener('DOMContentLoaded', () => {
  const rb = document.getElementById('review-body');
  if (rb) _v24ImgObs.observe(rb, { childList: true, subtree: true });
});

// ═══════════ v25: keep your place when moving around ═══════════
// Home and each deck tab remember how far down you were. Switching to a
// tab you have not opened yet starts it right under the sticky tabs.
const _v25Scroll = {};
let _v25Tab = 'cards';
const _v25Key = id => id === 'screen-review' ? `review:${state.activeDeckId}:${_v25Tab}` : id;
const _v25Restore = y => requestAnimationFrame(() => window.scrollTo(0, y));

const _v24ShowScreen = showScreen;
showScreen = function (name) {
  const cur = document.querySelector('.screen.active');
  if (cur) _v25Scroll[_v25Key(cur.id)] = window.scrollY;
  const r = _v24ShowScreen.apply(this, arguments);
  const id = name === 'home' ? 'screen-home' : name === 'review' ? 'screen-review' : null;
  if (id) _v25Restore(_v25Scroll[_v25Key(id)] || 0);
  return r;
};

const _v24ShowReviewTab = showReviewTab;
showReviewTab = function (which) {
  const onReview = document.getElementById('screen-review').classList.contains('active');
  if (onReview) _v25Scroll[_v25Key('screen-review')] = window.scrollY;
  const r = _v24ShowReviewTab.apply(this, arguments);
  _v25Tab = which === 'practice' ? lastPracticeTab : which;
  if (!onReview) return r;
  const saved = _v25Scroll[_v25Key('screen-review')];
  if (saved != null) { _v25Restore(saved); return r; }
  requestAnimationFrame(() => {
    const tabs = document.querySelector('.review-tabs');
    const sub = document.getElementById('rv-sub');
    const panes = { cards: 'review-body', grade: 'grade-body', odds: 'odds-body', hand: 'hand-body', drills: 'drills-body', notes: 'notes-body' };
    const el = sub && sub.style.display !== 'none' ? sub : document.getElementById(panes[_v25Tab]);
    if (!tabs || !el) return;
    const gap = el.getBoundingClientRect().top - tabs.getBoundingClientRect().bottom - 8;
    if (gap < 0) window.scrollBy(0, gap);
  });
  return r;
};

// ═══════════ v26: dialogs close the way you expect ═══════════
// Escape closes the top dialog on a computer, and tapping the dim area
// around a sheet closes it on a phone. A dialog where you have typed
// something stays open, so nothing you wrote is lost by a stray tap.
const _v26Close = {
  'x-modal': () => { if (game._reach && !game._reach.done && document.getElementById('screen-game').classList.contains('active')) return; closeSheet(); }, 'import-modal': () => closeImportModal(), 'edit-modal': () => closeEditModal(),
  'mode-modal': () => closeModeModal(), 'how-to-modal': () => closeHowToPlay(), 'shortcuts-modal': () => closeShortcuts(),
  'backup-modal': () => closeBackupModal(), 'thumb-picker-modal': () => closeThumbPicker(),
  'deck-share-modal': () => closeDeckShare(), 'share-modal-overlay': () => closeShareModal(),
};
// What each field held when its dialog opened, so only your own typing counts.
const _v26Seen = new WeakMap();
const _v26Fields = m => [...m.querySelectorAll('textarea, input:not([type]), input[type=text], input[type=search]')];
function _v26Snap(m) { _v26Fields(m).forEach(el => _v26Seen.set(el, el.value)); }
Object.keys(_v26Close).forEach(id => {
  const m = document.getElementById(id);
  if (m) new MutationObserver(() => { if (m.classList.contains('active')) _v26Snap(m); }).observe(m, { attributes: true, attributeFilter: ['class'] });
});
function _v26Dirty(m) {
  return _v26Fields(m).some(el => {
    if (el.readOnly || el.disabled || el.offsetParent === null) return false;
    const was = _v26Seen.has(el) ? _v26Seen.get(el) : el.defaultValue;
    return el.value !== was && el.value.trim() !== '';
  });
}
function _v26Top() {
  const open = [...document.querySelectorAll('.modal-overlay.active')].filter(m => _v26Close[m.id]);
  if (!open.length) return null;
  open.sort((a, b) => (+getComputedStyle(a).zIndex || 0) - (+getComputedStyle(b).zIndex || 0));
  return open[open.length - 1];
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || (typeof tourOpen === 'function' && tourOpen())) return;
  if (document.getElementById('prize-browser-overlay').classList.contains('active')) return;
  const ac = document.getElementById('autocomplete-list');
  if (ac && ac.style.display !== 'none' && ac.contains(document.activeElement)) return;
  const m = _v26Top();
  if (!m) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!_v26Dirty(m)) _v26Close[m.id]();
}, true);
let _v26DownOn = null;
document.addEventListener('pointerdown', e => { _v26DownOn = e.target; }, true);
document.addEventListener('click', e => {
  const m = e.target;
  if (!m.classList || !m.classList.contains('modal-overlay') || !m.classList.contains('active')) return;
  if (_v26DownOn !== m || !_v26Close[m.id] || _v26Dirty(m)) return;
  _v26Close[m.id]();
});

// Loading a starter deck you already have opens that deck instead of a second copy.
const _v25LoadStarter = loadStarterDeck;
loadStarterDeck = async function (id) {
  const s = STARTER_DECKS.find(x => x.id === id);
  const same = s && state.decks.find(d => d.starter === id && deckListText(d.cards || []) === deckListText(parseDeckList(s.list)));
  if (same) { closeSheet(); openReview(same.id); showToast(`You already have this list as "${same.name}".`); return; }
  return _v25LoadStarter.apply(this, arguments);
};
