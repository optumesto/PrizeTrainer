// 3.0.2: Italiano. App text only; card, attack and Ability names stay English, as in Spanish and Portuguese.
// Read by js/i18n.js, which loads after this file. Same keys as I18N_ES (the English text), and
// patterns as [regex, replacement], with the replacement a string or a function returning a string or null.
var I18N_MORE = typeof I18N_MORE === 'object' && I18N_MORE ? I18N_MORE : {};
I18N_MORE.it = {
  name: 'Italiano',
  html: 'it',
  mon: [],    // January to December, as written after a day number
  mon3: [],   // short forms
  ord: n => n + '.',
  scoped: {},
  dict: {},
  pat: [],
};
