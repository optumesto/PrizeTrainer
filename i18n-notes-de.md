# German (de): open questions for a native speaker

The German strings live in `js/i18n-de.js`. The player is addressed as "du". Card, attack and Ability names stay English.

Settled in the 3.0.2 audit (checked against German card text on Limitless TCG's German card pages, pokewiki.de and pokezentrum.de): Preiskarten, Aktive Position, Aktives Pokémon, Bank, Ablagestapel, Basis-Pokémon, Phase 1 / Phase 2, Unterstützer, Item, Pokémon-Ausrüstung, Stadion, Basis-Energie / Spezial-Energie, Fähigkeit, Attacke, KP, Schadensmarken, kampfunfähig, Schwäche / Resistenz, Standardformat / Erweitert, energy types (Feuer-Energie and so on). ACE SPEC is now `ASS-KLASSE` (was `ASS-SPEC`), regulation mark is `Regelzeichen` (was `Regulierungszeichen`).

## Still open

- Regelzeichen: pokewiki.de and fan sites use it; the official German rulebook PDF on pokemon.com could not be opened to confirm.
- Sudden Death, Prerelease and Build and Battle Box are kept in English. Does the German Play! Pokémon material translate any of them?
- "Erster" / "Zweiter" (going first or second) use the generic masculine, as German game texts usually do. Fine, or should it be neutral?
- Loan words kept in English: Goldfish, Toolbox, Matchup, Match, Flex, Checks, Upgrades, Credits, Regionals, Byes, Best of Three. Is "Checks" (deck builder tab) better as "Prüfung"?
- Guess is `Tipp` (noun) and `Raten` (the button); a tap is `Fingertipp`. Puzzle "plays" are `Aktionen`. Turn abbreviations are `Z1` to `Z4`.
- Numbers keep the English dot and comma ("8.3", "1,597 Spiele"); German would write "8,3" and "1.597". This is an app wide convention.

## Needs a change outside js/i18n-de.js

- The W / L / T buttons in Log a match stay English (single letters are not translated; German would be S / N / U).
- Explanation sentences inside card blocks on the Grade tab (for example "... give you a draw or search Ability once a turn ...") and builder rows ("Basic, 120 HP, ... 19% of Dragapult lists") stay English in every language, because the check treats them as card data.
- The prize game history date ("11/12/2026") and the deck tile dates come from the browser's own locale, so a German browser already shows German dates.

## Labels still longer than the English

- `Preiskarten` (Prizes button on a deck tile), `Ø Preiskarten` (Prize avg): no shorter word, since `Preise` means card prices here
- `Überspringen` (tour Skip), `Speichern und Link kopieren`, `Speichern und bewerten`, `Gegnerliste einfügen`, `Gegner-Preiskarten lesen`, `Alle in Preiskarten` / `Eine in Preiskarten`
