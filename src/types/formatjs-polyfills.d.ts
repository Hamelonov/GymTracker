// Полифиллы formatjs подключаются только ради побочного эффекта; TypeScript 6 требует для таких
// импортов объявленных модулей, а пакеты описывают подпути через exports, которые tsc не находит.
declare module '@formatjs/intl-getcanonicallocales/polyfill.js';
declare module '@formatjs/intl-locale/polyfill.js';
declare module '@formatjs/intl-pluralrules/polyfill-force.js';
declare module '@formatjs/intl-pluralrules/locale-data/en.js';
declare module '@formatjs/intl-pluralrules/locale-data/ru.js';
