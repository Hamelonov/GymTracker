let counter = 0;

/** Compact, collision-resistant ids without a native crypto dependency. */
export function newId(): string {
  counter = (counter + 1) % 0xffff;
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${time}${rand}${counter.toString(36)}`;
}
