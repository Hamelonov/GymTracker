/** Compute plates per side for a target weight on a bar. All values in the same unit. */
export function platesPerSide(
  target: number,
  bar: number,
  available: number[],
): { plates: number[]; remainder: number } {
  let perSide = (target - bar) / 2;
  if (perSide <= 0) return { plates: [], remainder: perSide < 0 ? perSide * 2 : 0 };
  const sorted = [...available].sort((a, b) => b - a);
  const plates: number[] = [];
  for (const p of sorted) {
    while (perSide + 1e-9 >= p) {
      plates.push(p);
      perSide -= p;
    }
  }
  return { plates, remainder: Math.round(perSide * 2 * 1000) / 1000 };
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const DEFAULT_BAR_KG = 20;
export const DEFAULT_BAR_LB = 45;
