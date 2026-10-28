export async function stringifyBackupAsync(
  backup: object,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const entries = Object.entries(backup);
  const total = entries.reduce(
    (count, [, value]) => count + (Array.isArray(value) ? Math.max(value.length, 1) : 1),
    0,
  );
  let current = 0;
  const serializedEntries: string[] = [];

  for (const [key, value] of entries) {
    if (!Array.isArray(value)) {
      serializedEntries.push(`${JSON.stringify(key)}:${JSON.stringify(value)}`);
      current += 1;
      onProgress?.(current, total);
      continue;
    }

    const serializedChunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += 200) {
      const chunk = value
        .slice(offset, offset + 200)
        .map((item) => JSON.stringify(item))
        .join(',');
      serializedChunks.push(chunk);
      current += Math.min(200, value.length - offset);
      onProgress?.(current, total);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    if (value.length === 0) {
      current += 1;
      onProgress?.(current, total);
    }
    serializedEntries.push(`${JSON.stringify(key)}:[${serializedChunks.filter(Boolean).join(',')}]`);
  }

  return `{${serializedEntries.join(',')}}`;
}
