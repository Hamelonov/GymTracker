/** Предлоги и союзы не помогают отличить одно упражнение от другого. */
const STOP_WORDS = new Set([
  'с',
  'со',
  'на',
  'в',
  'во',
  'и',
  'из',
  'к',
  'у',
  'the',
  'with',
  'on',
  'a',
  'an',
  'of',
  'for',
]);

// Окончания отсекаются по одному, длинные раньше коротких, чтобы «приседания» и «присед» дали одну основу.
const RUSSIAN_ENDINGS = [
  'иями',
  'ями',
  'ами',
  'ения',
  'ение',
  'ания',
  'ание',
  'аний',
  'ений',
  'ость',
  'ости',
  'ого',
  'его',
  'ому',
  'ему',
  'ыми',
  'ими',
  'ых',
  'их',
  'ой',
  'ей',
  'ом',
  'ем',
  'ах',
  'ях',
  'ую',
  'юю',
  'ая',
  'яя',
  'ые',
  'ие',
  'ый',
  'ий',
  'ов',
  'ев',
  'ам',
  'ям',
  'а',
  'я',
  'ы',
  'и',
  'е',
  'у',
  'ю',
  'о',
  'ь',
];

const ENGLISH_ENDINGS = ['ing', 'es', 's'];

const MINIMUM_STEM_LENGTH = 3;

function isCyrillic(word: string): boolean {
  return /[а-я]/.test(word);
}

/** Срезает одно окончание, если после этого остаётся хотя бы три буквы. */
export function stemWord(word: string): string {
  const endings = isCyrillic(word) ? RUSSIAN_ENDINGS : ENGLISH_ENDINGS;
  for (const ending of endings) {
    if (word.length - ending.length >= MINIMUM_STEM_LENGTH && word.endsWith(ending)) {
      return word.slice(0, word.length - ending.length);
    }
  }
  return word;
}

/** Нижний регистр, ё→е, знаки препинания → пробелы, без стоп-слов, слова обрезаны до основ. */
export function nameToStems(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\d]+/gu, ' ')
    .split(' ')
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .map(stemWord);
}
