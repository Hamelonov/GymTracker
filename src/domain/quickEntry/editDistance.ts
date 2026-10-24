/**
 * Расстояние Дамерау–Левенштейна: сколько вставок, удалений, замен и перестановок соседних букв
 * нужно, чтобы превратить одну строку в другую. Перестановка («штнага») считается одной правкой,
 * потому что это самая частая опечатка при быстром наборе.
 */
export function damerauLevenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  // Матрица (left.length + 1) × (right.length + 1); previousRow и rowBeforePrevious нужны для перестановок.
  let rowBeforePrevious: number[] = [];
  let previousRow = Array.from({ length: right.length + 1 }, (_, column) => column);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      let best = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (currentRow[rightIndex - 1] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + substitutionCost,
      );
      const isTransposition =
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1];
      if (isTransposition) best = Math.min(best, (rowBeforePrevious[rightIndex - 2] ?? 0) + 1);
      currentRow.push(best);
    }
    rowBeforePrevious = previousRow;
    previousRow = currentRow;
  }
  return previousRow[right.length] ?? 0;
}
