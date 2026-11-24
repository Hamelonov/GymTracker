/** Символ между повторами подходов по умолчанию: «9/8/8». */
export const DEFAULT_SET_SEPARATOR = '/';

/**
 * Разделитель из введённого текста: первый символ, который не пробел. Цифра не подходит:
 * с ней повторы слиплись бы в одно число. Если подходящего символа нет, возвращает null.
 */
export function parseSetSeparator(input: string): string | null {
  // Array.from разбирает строку по символам, а не по кодовым единицам, поэтому эмодзи остаётся целым.
  for (const character of Array.from(input)) {
    if (character.trim() === '') continue;
    return /\d/.test(character) ? null : character;
  }
  return null;
}
