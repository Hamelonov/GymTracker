function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** «01:00», «25:30» — таймер: минуты и секунды всегда двумя цифрами. */
export function formatMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${padToTwoDigits(minutes)}:${padToTwoDigits(seconds)}`;
}

/** «00:00:00», «01:02:03» — секундомер: часы, минуты и секунды. */
export function formatHoursMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${padToTwoDigits(hours)}:${padToTwoDigits(minutes)}:${padToTwoDigits(seconds)}`;
}
