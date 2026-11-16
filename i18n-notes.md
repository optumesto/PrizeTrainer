# Spanish and Portuguese (3.0)

The app text can show in English, Spanish (es) or Brazilian Portuguese (pt-BR). Pick it in Settings, Language. The choice is saved on the device as `rd_lang`. Card names, attack names and ability names always stay in English, as printed on the cards players use.

## How it works

- `js/i18n.js` loads last. It reads the English on screen and swaps in the translation. New screens are translated as they appear.
- `I18N_ES` and `I18N_PT` are plain objects keyed on the exact English.
- `I18N_PAT` holds strings with numbers or names in them, as `[regex, es, pt]`.
- Anything marked `data-no-tr`, and card elements listed in `I18N_SKIP`, are never translated.
- A guard reads cards.json and the saved decks, and never changes a card name.
- `tests/i18n-check.mjs` opens 60 screens in each language (Spanish, then Portuguese) and fails on a changed card name, a dictionary key that is also a card name, a string left behind after switching back to English, a script error, or English app text still showing on any screen.

## The leftover English check

After each screen the check walks the text on it (the active screen, open sheets and the toast). Text that is translated, is a card or deck name, is a set code and number, or sits inside `data-no-tr` or an `I18N_SKIP` element is fine. Any other English fails the check, unless the allowlist at the top of the test says it is card data:

- **Card names only.** Text that is nothing but card, attack and Ability names once counts, `x2`, `vs` and punctuation are taken out ("+2 Mega Kangaskhan ex", "Latias ex: Skyliner", "Surf (50)").
- **`KEEP_NAMES`**: proper names that stay as they are: Limitless TCG, TCGdex, Pokémon TCG API, (pokemontcg.io), Saira.
- **`CARD_TEXT`**: blocks built from card text. Text there stays English only when it names a card, attack or Ability. A sentence in these blocks with no card name in it still fails.
  - Grade tab findings and How it plays paragraphs (`#grade-body p`, `.gt`, `.t68-here`)
  - Deck builder sub-lines (`.bld-sub`): "Basic, 210 HP, Flip the Script, Cruel Arrow"
  - Puzzle actions (`#pz-act`, `.pz-btns`): "Basic Darkness Energy to Yveltal"

The test seeds `Math.random`, so every run deals the same hands and shows the same text. `--dump` lists every English string per screen, marked `LEFT` (fails) or `kept` (with the reason).

To exercise the 3.0.1 strings it also draws: grade history with 3 entries going up (one a results update), 17 entries going down with every kind of note (so the "first version and the newest 15" note shows), and 2 entries holding; Ask the odds with an "each" row and a one-card row (copies tuner), by turn 1 and in the opening hand; a finished resource drill (1 and 2 rounds) and a finished opponent prize read; Notes with an earlier version, so Edit log and Compare lists show card changes and "All ... prized" rows; Home with puzzles played on earlier days, won today and lost today, and a deck with 22 and then 1 card missing art.

## Adding a string

Add the English and its translation to both `I18N_ES` and `I18N_PT`. For a string with a number, add a pattern to `I18N_PAT`. Then run `node tests/i18n-check.mjs`.

## Wording to check with a native speaker

- Prerelease: Presentación / Pré-lançamento
- ACE SPEC: AS TÁCTICO / ÁS TÁTICO
- Strong and Fixable: Sólido and Mejorable / Forte and Ajustável
- Supporter: Partidario / Apoiador
- Lightning: Rayo / Elétrico (Elétrica as the energy adjective)
- Darkness: Oscuridad / Escuridão
- Prize game: Partida de premios / Jogo de prêmios
- Prize trainer: Entrenador de premios / Treino de prêmios
- Daily list: Mazo de hoy
- Welcome: Te damos la bienvenida
- Under 13 note: mamá o papá / responsável
- The date style after "Data as of"
- Kept in English: Goldfish, Build and Battle Box, Toolbox
- Grade history (3.0.1): Sube / Baja / Se mantiene en; Subiu / Caiu / Estável em. "Open dots": puntos huecos / pontos vazados
- Puzzle count: resueltos de ... jugados / resolvidos de ... jogados
- Ask the odds: "1 de cada una (Cyrano y Judge)" / "1 de cada uma (Cyrano e Judge)", and "¿Cuántas copias de X?" / "Quantas cópias de X?"
- "pts" (percentage points in Compare lists and the copies tuner) is kept as pts in both languages
- "All Fire Energy prized" in Compare lists: the Basic Energy type is translated with the same words as elsewhere (Energía Fuego / Energia Fogo, Energía Oscura / Energia Escuridão), with básica for "Basic ... Energy". Other card names stay English: "Rare Candy: todas en premios"
- Edit log chip notes: new and cut as nueva / fuera and nova / removida
- Drills: "It is 3." as La respuesta es 3. / A resposta é 3.
- Missing art: sin imagen / sem imagem
- Prices switch (3.0.1): "Con No se ocultan y no se consulta ninguno" / "Com Não eles ficam ocultos e nenhum é consultado" (Off shows as No / Não)
- Offline grade flag: "aviso de calificación" / "aviso de nota" for a grade flag
- Event record delete: "El historial de calificaciones se queda" / "O histórico de notas continua"

"Skip" and "Psychic" are also attack names, so they translate only inside named buttons.

## Still in English

These are the only English strings the check lets through (see The leftover English check above).

- Grader paragraphs built from card data ("How it plays", attack-specific findings)
- Puzzle action labels and builder lines that name cards or attacks
- Legal pages, the static HTML pages, deck guides, ads and the page title
