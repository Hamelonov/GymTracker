/** У каждого токена есть `start` — индекс первого символа в исходной строке. */
export type Token = { start: number } & (
  | { kind: 'word'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'clock'; seconds: number }
  | { kind: 'times' }
  | { kind: 'slash' }
  | { kind: 'comma' }
  | { kind: 'sign'; sign: 'plus' | 'minus' }
  | { kind: 'weightUnit'; unit: 'kg' | 'lb' }
  | { kind: 'distanceUnit'; unit: 'km' | 'mi' | 'm' }
  | { kind: 'timeUnit'; unit: 'sec' | 'min' | 'hour' }
  | { kind: 'setType'; type: 'warmup' | 'failure' | 'drop' }
  | { kind: 'per' }
);

type UnitToken = Extract<Token, { kind: 'weightUnit' | 'distanceUnit' | 'timeUnit' }>;
type UnitWithoutStart = Omit<UnitToken, 'start'>;

const CLOCK_PATTERN = /(\d{1,2}):(\d{2})(?::(\d{2}))?/y;
const DOT_NUMBER_PATTERN = /\d+(?:\.\d+)?/y;
// Запятая — десятичный разделитель только у веса: перед единицей веса или знаком умножения.
const COMMA_NUMBER_PATTERN = /\d+,\d{1,2}(?=\s*(?:кг|kg|кило|lbs?|фунт|[хx×*]))/y;
const WORD_PATTERN = /\p{L}[\p{L}\d]*(?:-[\p{L}\d]+)*/uy;
const PER_BEFORE_DIGIT_PATTERN = /по(?=\d)/y;
const LETTER_OR_DIGIT = /[\p{L}\d]/u;
const LETTER = /\p{L}/u;

/** Единицы из нескольких букв узнаются где угодно; длинные варианты стоят раньше коротких. */
const MULTI_LETTER_UNITS: { pattern: RegExp; token: UnitWithoutStart }[] = [
  { pattern: /кило\p{L}*|кг|kg/uy, token: { kind: 'weightUnit', unit: 'kg' } },
  { pattern: /фунт\p{L}*|lbs?/uy, token: { kind: 'weightUnit', unit: 'lb' } },
  { pattern: /км|km/uy, token: { kind: 'distanceUnit', unit: 'km' } },
  { pattern: /мил\p{L}*|mi/uy, token: { kind: 'distanceUnit', unit: 'mi' } },
  { pattern: /мин\p{L}*|min\p{L}*/uy, token: { kind: 'timeUnit', unit: 'min' } },
  { pattern: /сек\p{L}*|sec\p{L}*/uy, token: { kind: 'timeUnit', unit: 'sec' } },
  { pattern: /час\p{L}*|hours?|hrs?/uy, token: { kind: 'timeUnit', unit: 'hour' } },
];

/** Единицы из одной буквы считаются единицами только сразу после числа, иначе это слово. */
const SINGLE_LETTER_UNITS: Record<string, UnitWithoutStart> = {
  с: { kind: 'timeUnit', unit: 'sec' },
  c: { kind: 'timeUnit', unit: 'sec' },
  s: { kind: 'timeUnit', unit: 'sec' },
  ч: { kind: 'timeUnit', unit: 'hour' },
  h: { kind: 'timeUnit', unit: 'hour' },
  м: { kind: 'distanceUnit', unit: 'm' },
  m: { kind: 'distanceUnit', unit: 'm' },
};

const SET_TYPE_LETTERS: Record<string, 'warmup' | 'failure' | 'drop'> = {
  р: 'warmup',
  w: 'warmup',
  о: 'failure',
  f: 'failure',
  д: 'drop',
  d: 'drop',
};

const TIMES_CHARACTERS = new Set(['х', 'x', '×', '*']);
const SLASH_CHARACTERS = new Set(['/', '\\', '|']);
const COMMA_CHARACTERS = new Set([',', ';']);

function matchAt(pattern: RegExp, text: string, position: number): RegExpExecArray | null {
  pattern.lastIndex = position;
  return pattern.exec(text);
}

/** TypeScript теряет связь kind↔unit при spread объединения типов, поэтому здесь явное приведение. */
function withStart(token: UnitWithoutStart, start: number): Token {
  return { ...token, start } as Token;
}

function isLetter(character: string | undefined): boolean {
  return character != null && LETTER.test(character);
}

function isLetterOrDigit(character: string | undefined): boolean {
  return character != null && LETTER_OR_DIGIT.test(character);
}

/** Разбивает строку быстрой записи на токены. Регистр не важен, «ё» = «е». */
export function tokenize(line: string): Token[] {
  const text = line.toLowerCase().replace(/ё/g, 'е');
  const tokens: Token[] = [];
  let position = 0;
  let hasSeenHour = false;

  const lastToken = () => tokens[tokens.length - 1];
  const isRightAfterNumber = (gluedOnly: boolean) => {
    const previous = lastToken();
    if (!previous || previous.kind !== 'number') return false;
    if (!gluedOnly) return true;
    return !/\s/.test(text[position - 1] ?? '');
  };

  const tryReadUnit = (): boolean => {
    for (const { pattern, token } of MULTI_LETTER_UNITS) {
      const match = matchAt(pattern, text, position);
      if (!match) continue;
      const nextCharacter = text[position + match[0].length] ?? '';
      // После единицы может сразу идти следующее число («1ч20м») или знак умножения («70кгх7»), но не буква («кгс»).
      const isTimesAfterWeightUnit = token.kind === 'weightUnit' && TIMES_CHARACTERS.has(nextCharacter);
      if (!isLetter(nextCharacter) || isTimesAfterWeightUnit) {
        tokens.push(withStart(token, position));
        if (token.kind === 'timeUnit' && token.unit === 'hour') hasSeenHour = true;
        position += match[0].length;
        return true;
      }
    }
    const character = text[position] ?? '';
    const singleLetterUnit = SINGLE_LETTER_UNITS[character];
    if (singleLetterUnit && isRightAfterNumber(false) && !isLetter(text[position + 1])) {
      // «1ч20м» — минуты, «500м» — метры: одна буква читается по контексту строки.
      const isMinuteAfterHour = singleLetterUnit.kind === 'distanceUnit' && hasSeenHour;
      const token: UnitWithoutStart = isMinuteAfterHour
        ? { kind: 'timeUnit', unit: 'min' }
        : singleLetterUnit;
      tokens.push(withStart(token, position));
      if (token.kind === 'timeUnit' && token.unit === 'hour') hasSeenHour = true;
      position += 1;
      return true;
    }
    return false;
  };

  const tryReadSetTypeSuffix = (): boolean => {
    const setType = SET_TYPE_LETTERS[text[position] ?? ''];
    if (!setType || !isRightAfterNumber(true) || isLetterOrDigit(text[position + 1])) return false;
    tokens.push({ kind: 'setType', type: setType, start: position });
    position += 1;
    return true;
  };

  const tryReadTimes = (): boolean => {
    const character = text[position] ?? '';
    if (!TIMES_CHARACTERS.has(character)) return false;
    // Буква «х» — знак умножения, только если не стоит внутри слова: «70х7», «70 х 7», «70кгх7», но не «хват».
    const isTimesLetter = character === 'х' || character === 'x';
    const isGluedToWeightUnit = lastToken()?.kind === 'weightUnit';
    const isInsideWordBefore = isLetter(text[position - 1]) && !isGluedToWeightUnit;
    if (isTimesLetter && (isInsideWordBefore || isLetter(text[position + 1]))) return false;
    tokens.push({ kind: 'times', start: position });
    position += 1;
    return true;
  };

  while (position < text.length) {
    const character = text[position] ?? '';
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    const clock = matchAt(CLOCK_PATTERN, text, position);
    if (clock) {
      const [whole, first, second, third] = clock;
      const seconds =
        third == null
          ? Number(first) * 60 + Number(second)
          : Number(first) * 3600 + Number(second) * 60 + Number(third);
      tokens.push({ kind: 'clock', seconds, start: position });
      position += whole.length;
      continue;
    }

    // «72,5» — дробь только в начале группы; после «/», «х» или числа запятая разделяет группы («70х7/6,80х5»).
    const previousKind = lastToken()?.kind;
    const canBeDecimalComma =
      previousKind == null || previousKind === 'word' || previousKind === 'comma' || previousKind === 'sign';
    const commaNumber = canBeDecimalComma ? matchAt(COMMA_NUMBER_PATTERN, text, position) : null;
    const number = commaNumber ?? matchAt(DOT_NUMBER_PATTERN, text, position);
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0].replace(',', '.')), start: position });
      position += number[0].length;
      continue;
    }

    if ((character === '+' || character === '-') && /\d/.test(text[position + 1] ?? '')) {
      tokens.push({ kind: 'sign', sign: character === '+' ? 'plus' : 'minus', start: position });
      position += 1;
      continue;
    }

    if (SLASH_CHARACTERS.has(character)) {
      tokens.push({ kind: 'slash', start: position });
      position += 1;
      continue;
    }
    if (COMMA_CHARACTERS.has(character)) {
      tokens.push({ kind: 'comma', start: position });
      position += 1;
      continue;
    }

    if (tryReadTimes() || tryReadSetTypeSuffix() || tryReadUnit()) continue;

    // «3по7» без пробелов: «по» перед цифрой — не слово, а множитель подходов.
    if (matchAt(PER_BEFORE_DIGIT_PATTERN, text, position)) {
      tokens.push({ kind: 'per', start: position });
      position += 2;
      continue;
    }

    const word = matchAt(WORD_PATTERN, text, position);
    if (word) {
      const wordText = word[0];
      tokens.push(
        wordText === 'по'
          ? { kind: 'per', start: position }
          : { kind: 'word', text: wordText, start: position },
      );
      position += wordText.length;
      continue;
    }

    // Прочие знаки препинания просто пропускаем.
    position += 1;
  }

  return tokens;
}
