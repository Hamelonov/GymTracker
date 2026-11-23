import { getStopwatchElapsedMs, useStopwatch } from '../stopwatch';

afterEach(() => {
  useStopwatch.getState().reset();
  jest.restoreAllMocks();
});

function setNow(milliseconds: number) {
  jest.spyOn(Date, 'now').mockReturnValue(milliseconds);
}

test('идёт от запуска, а пауза сохраняет набежавшее время', () => {
  setNow(1_000);
  useStopwatch.getState().start();
  setNow(6_000);
  expect(getStopwatchElapsedMs(useStopwatch.getState(), Date.now())).toBe(5_000);

  useStopwatch.getState().pause();
  setNow(60_000);
  expect(getStopwatchElapsedMs(useStopwatch.getState(), Date.now())).toBe(5_000);
});

test('после паузы продолжает считать с накопленного', () => {
  setNow(0);
  useStopwatch.getState().start();
  setNow(2_000);
  useStopwatch.getState().pause();
  setNow(10_000);
  useStopwatch.getState().start();
  setNow(13_000);
  expect(getStopwatchElapsedMs(useStopwatch.getState(), Date.now())).toBe(5_000);
});

test('повторный запуск идущего секундомера ничего не сбрасывает', () => {
  setNow(0);
  useStopwatch.getState().start();
  setNow(4_000);
  useStopwatch.getState().start();
  expect(getStopwatchElapsedMs(useStopwatch.getState(), 4_000)).toBe(4_000);
});

test('сброс обнуляет и останавливает', () => {
  setNow(0);
  useStopwatch.getState().start();
  setNow(3_000);
  useStopwatch.getState().reset();
  expect(useStopwatch.getState().runningSince).toBeNull();
  expect(getStopwatchElapsedMs(useStopwatch.getState(), 9_000)).toBe(0);
});
