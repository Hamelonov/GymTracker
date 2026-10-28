import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Storage from 'expo-sqlite/kv-store';

const EXPORT_SEQUENCE_KEY = 'export_sequence';

/** Порядковый номер экспорта: растёт с каждым файлом, чтобы имена не повторялись. */
export function nextExportSequence(): number {
  const next = Number(Storage.getItemSync(EXPORT_SEQUENCE_KEY) ?? '0') + 1;
  Storage.setItemSync(EXPORT_SEQUENCE_KEY, String(next));
  return next;
}

/** Записывает файл в выбранную пользователем папку устройства. */
export async function saveExportFile(
  directory: Directory,
  fileName: string,
  content: string | Uint8Array,
  mimeType: string,
) {
  const file = directory.createFile(fileName, mimeType);
  await file.write(content);
}

/** Записывает файл в кэш и открывает для него системное окно «Поделиться»: текст или байты (.xlsx). */
export async function shareExportFile(fileName: string, content: string | Uint8Array, mimeType: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}
