# German (de): wording for a native speaker to check

The German strings live in `js/i18n-de.js` (same English keys as `I18N_ES`, patterns in the same order as `I18N_PAT`). The player is addressed as "du". Card, attack and Ability names stay English.

## Game terms (please confirm against current German cards and rules)

- ACE SPEC: `ASS-SPEC`
- Active Spot: `Aktive Position` (the brief suggested "Aktiver Bereich"; I went with the term I believe the current German rules use)
- Prize cards: `Preiskarten`. "Prizes" on buttons is also `Preiskarten`, never `Preise`, because `Preise` is the card prices feature
- Prize game: `Preiskartenspiel`; Prize trainer: `Preiskarten-Trainer`
- Stage 1 / Stage 2: `Phase 1` / `Phase 2`; Basic: `Basis` / `Basis-Pokémon`
- Pokémon Tool: `Pokémon-Ausrüstung`; Supporter: `Unterstützer`; Item: `Item`; Stadium: `Stadion`
- Attach: `Anlegen`; Retreat: `Rückzug`; Evolve: `Entwickeln`
- Discard (pile label and Goldfish button share one key): `Ablage`; "Discard pile: 4" is `Ablagestapel: 4`
- HP: `KP`; damage counters: `Schadensmarken`
- Energy types: Pflanze, Feuer, Wasser, Elektro, Psycho, Kampf, Finsternis, Metall, Drache, Farblos, Fee; in Energy names `Pflanzen-Energie`, `Feen-Energie`, `Drachen-...`
- Weakness / Resistance: `Schwäche` / `Resistenz`
- Expanded: `Erweitert`; regulation mark: `Regulierungszeichen`, short `Zeichen` ("Zeichen H")
- Knocked Out: `kampfunfähig`, and `K.O.` / `K.O.s` in counts
- Sudden Death: kept as `Sudden Death`
- Prerelease: kept as `Prerelease`; Build and Battle Box kept in English (as in Spanish and Portuguese)

## App words chosen (could read better)

- Grade: `Note` (school style, 0 to 10); grader: `Bewerter`; grade history: `Notenverlauf`
- Odds: `Chancen`; Opening odds: `Startchancen`; Ask the odds: `Frag die Chancen`
- Power: `Stärke`; Synergy: `Synergie`; Fix first: `Zuerst beheben`
- Win rate: `Siegquote`; record: `Bilanz`; Favored / Unfavored: `Favorisiert` / `Benachteiligt`
- Drills: `Übungen`; Notes: `Notizen`; Edit log: `Änderungslog`; Tournament log: `Turnier-Log`
- Kept in English: Goldfish, Toolbox, Matchup, Match, Flex, Checks, Upgrades, Credits, Regionals, Byes, Best of Three
- Score: `Wertung`; guess: `Tipp` / `Tippen` (a pun risk with tapping, "tippe auf"); please check the prize game screens
- Reach check: `Erreichbarkeit`; Table check: `Tischcheck`; Resource count: `Ressourcen zählen`
- Turn abbreviations: `Z1`, `Z2` (for T1, T2)
- Their list / their game (opponent drills): `Gegnerliste`, `Gegnerspiel austeilen` (avoids a gendered "seine")
- Scoped words: Skip `Überspringen`, This `Diese`, Other `Andere`, new `neu`, cut `raus`, Open (Ask the odds) `Hand`
- "Couldn" (a key that is half of "Couldn't"): `Konnte nicht`
- Staples: `Pflichtkarten` ("Es fehlen Pflichtkarten für X")

## Formatting

- Dates: patterns write "12. Nov. 2026", "6. Nov.", "April 2027"; times become 24 hour ("Heute, 15:00"). Strings the core dates without a pattern use the core form "12 Nov. 2026"
- Numbers keep the English dot and comma ("8.3", "1,597 Spiele"); German would write "8,3" and "1.597"
- Ordinals: "1. Platz"

## Possibly too long for small buttons

- `Preiskarten` (Prizes button on a deck tile), `Ø Preiskarten` (Prize avg)
- `Überspringen` (tour Skip), `Zurück zu den Decks`, `Deck verstecken`, `Versteckte Decks ausblenden`
- `Neu austeilen als Zweiter`, `Diese Hand im Goldfish spielen`, `Meine Karten zuerst vorschlagen`
- `Gegner-Preiskarten lesen`, `Preiskarten aufdecken`, `Speichern und Link kopieren`
