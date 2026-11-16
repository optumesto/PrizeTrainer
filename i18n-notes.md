# Spanish and Portuguese (3.0)

The app text can show in English, Spanish (es) or Brazilian Portuguese (pt-BR). Pick it in Settings, Language. The choice is saved on the device as `rd_lang`. Card names, attack names and ability names always stay in English, as printed on the cards players use.

## How it works

- `js/i18n.js` loads last. It reads the English on screen and swaps in the translation. New screens are translated as they appear.
- `I18N_ES` and `I18N_PT` are plain objects keyed on the exact English.
- `I18N_PAT` holds strings with numbers or names in them, as `[regex, es, pt]`.
- Anything marked `data-no-tr`, and card elements listed in `I18N_SKIP`, are never translated.
- A guard reads cards.json and the saved decks, and never changes a card name.
- `tests/i18n-check.mjs` opens 42 screens in each language and fails on a changed card name, a dictionary key that is also a card name, or a script error.

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

"Skip" and "Psychic" are also attack names, so they translate only inside named buttons.

## Still in English

- Grader paragraphs built from card data ("How it plays", attack-specific findings)
- Puzzle action labels and builder lines that name cards or attacks
- Legal pages, the static HTML pages, deck guides, ads and the page title
