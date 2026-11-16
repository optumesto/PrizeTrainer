# Italian (it): open questions for a native speaker

Reviewed in the 3.0.2 audit. "Tu" throughout. Card, attack and Ability names stay English.

## Settled (checked against official Italian card text and pokemon.com/it)
- Allenatore, Aiuto, Strumento, Oggetto Pokémon, Stadio, Energia base, Energia speciale, "assegnare" for attach, "rimischiare" for shuffling cards back into the deck (all as on current Italian cards).
- Pokémon-ex in sentences (the Italian rulebook's rule box: "Regola dei Pokémon-ex").
- Formats: "Standard" and "Esteso" (pokemon.com/it writes "formato standard" and "formato esteso").
- "posizione attiva" lowercase inside sentences, as printed on cards; "Posizione attiva" as a label. "panchina", "pila degli scarti", "segnalini danno", "carte Premio", PS, KO, ASSO TATTICO.

## Still open
- Regulation mark: the app says "simbolo di regolamento". The official Italian wording could not be read (the pokemon.com PDFs are not reachable from here); it may be "simbolo di regolamentazione".
- Prerelease product: "Build and Battle Box" kept in English. Italian shops sell it as "Build & Battle Kit"; check the name on the Italian box.
- Tournament log result buttons show W, L, T (raw letters from core, no translation hook). V, S, P would be the Italian letters; needs a core scoped entry if wanted.
- Session history date shows the browser's own locale format (11/12/2026 in an English browser). Fine in an Italian browser.
- Odds deck tab: "Probabilità" is cut off in the 52 px tab. The Italian file has a scoped "Odds": "Probab." ready; it takes effect once core adds an "Odds" entry to I18N_SCOPED for .rv-tab.
- Player jargon kept in English: goldfish, matchup, mirror, bye, toolbox, meta, top 16, Flex, round. Check that Italian players use these.
- "Costruttore di mazzi" for Deck builder: understandable but a calque; "Editor di mazzi" or "Crea mazzo" may read better.
- Grade tiers in masculine (agreeing with "mazzo"): Pronto per i tornei, Solido, Migliorabile, Va rivisto, Non funziona.
- Labels that still wrap at 360 px with no natural shorter wording: "Tempo medio" (Avg time), "Nuova mano" (New hand), "Parti da un mazzo del meta", "Tutte nei Premi".
