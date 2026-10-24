let counter = 0;

/** Компактные id, устойчивые к коллизиям, без зависимости от нативного crypto. */
export function newId(): string {
  counter = (counter + 1) % 0xffff;
  const timePart = Date.now().toString(36);
  const randomPart = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${timePart}${randomPart}${counter.toString(36)}`;
}
