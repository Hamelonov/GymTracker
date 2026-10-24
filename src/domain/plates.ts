/** Считает блины на каждую сторону для целевого веса на грифе. Все значения в одних единицах. */
export function platesPerSide(
  target: number,
  bar: number,
  available: number[],
): { plates: number[]; remainder: number } {
  let weightLeftPerSide = (target - bar) / 2;
  if (weightLeftPerSide <= 0) {
    return { plates: [], remainder: weightLeftPerSide < 0 ? weightLeftPerSide * 2 : 0 };
  }
  const heaviestFirst = [...available].sort((first, second) => second - first);
  const plates: number[] = [];
  for (const plate of heaviestFirst) {
    // Маленький эпсилон не даёт округлению float (например, 2.5 + 1.25) пропустить подходящий блин.
    while (weightLeftPerSide + 1e-9 >= plate) {
      plates.push(plate);
      weightLeftPerSide -= plate;
    }
  }
  return { plates, remainder: Math.round(weightLeftPerSide * 2 * 1000) / 1000 };
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const DEFAULT_BAR_KG = 20;
export const DEFAULT_BAR_LB = 45;
