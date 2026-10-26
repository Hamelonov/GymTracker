import { parseHevyCsv } from '../hevyCsv';

const HEADER =
  'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe';

const TWO_WORKOUTS_CSV = [
  HEADER,
  // Подходы одного упражнения идут не по порядку: проверяем сортировку по set_index.
  '"Push Day","25 Oct 2026, 18:30","25 Oct 2026, 19:45","Felt ""strong"", tired after",Bench Press,7,"Grip wide, elbows in",1,normal,220.46,5,,,8',
  '"Push Day","25 Oct 2026, 18:30","25 Oct 2026, 19:45","Felt ""strong"", tired after",Bench Press,7,,0,warmup,132.28,10,,,',
  '"Push Day","25 Oct 2026, 18:30","25 Oct 2026, 19:45","Felt ""strong"", tired after",Dips,7,,0,failure,,12,,,9.5',
  '"Leg Day","26 Oct 2026, 09:00","26 Oct 2026, 10:00",,Squat,,,0,normal,225,5,,,',
  '"Leg Day","26 Oct 2026, 09:00","26 Oct 2026, 10:00",,Squat,,,1,dropset,185,8,,,',
  '"Leg Day","26 Oct 2026, 09:00","26 Oct 2026, 10:00",,Lunges,3,,0,weird,,20,,,',
].join('\n');

// В проекте включён noUncheckedIndexedAccess: элемент массива надо явно проверить перед использованием.
function requireDefined<Value>(value: Value | undefined): Value {
  if (value === undefined) throw new Error('Ожидалось значение, получили undefined');
  return value;
}

test('группирует строки в тренировки и упражнения, сортирует подходы, переводит фунты в кг', () => {
  const result = parseHevyCsv(TWO_WORKOUTS_CSV);

  expect(result.skippedRowCount).toBe(0);
  expect(result.workouts).toHaveLength(2);

  const pushDay = requireDefined(result.workouts[0]);
  const legDay = requireDefined(result.workouts[1]);

  expect(pushDay.title).toBe('Push Day');
  expect(pushDay.startedAt).toBe(new Date(2026, 9, 25, 18, 30).getTime());
  expect(pushDay.finishedAt).toBe(new Date(2026, 9, 25, 19, 45).getTime());
  expect(pushDay.notes).toBe('Felt "strong", tired after');
  expect(pushDay.exercises.map((exercise) => exercise.title)).toEqual(['Bench Press', 'Dips']);

  const benchPress = requireDefined(pushDay.exercises[0]);
  const dips = requireDefined(pushDay.exercises[1]);
  expect(benchPress.note).toBe('Grip wide, elbows in');
  expect(benchPress.supersetGroup).toBe(1);
  expect(dips.supersetGroup).toBe(1);
  expect(benchPress.sets.map((set) => set.type)).toEqual(['warmup', 'normal']);
  expect(benchPress.sets[0]?.weightKg).toBeCloseTo(60, 2);
  expect(benchPress.sets[1]?.weightKg).toBeCloseTo(100, 2);
  expect(benchPress.sets[1]?.rpe).toBe(8);
  expect(benchPress.sets[0]?.rpe).toBeNull();
  expect(dips.sets[0]).toEqual({
    type: 'failure',
    weightKg: null,
    reps: 12,
    distanceM: null,
    durationSec: null,
    rpe: 9.5,
    rir: null,
  });

  expect(legDay.title).toBe('Leg Day');
  expect(legDay.notes).toBe('');
  const squat = requireDefined(legDay.exercises[0]);
  const lunges = requireDefined(legDay.exercises[1]);
  expect(squat.supersetGroup).toBeNull();
  // Номер суперсета пересчитывается с единицы внутри каждой тренировки.
  expect(lunges.supersetGroup).toBe(1);
  expect(squat.sets.map((set) => set.type)).toEqual(['normal', 'drop']);
  expect(lunges.sets[0]?.type).toBe('normal');
});

test('weight_kg берётся как есть, distance_km переводится в метры, порядок колонок произвольный', () => {
  const csv = [
    'distance_km,title,start_time,exercise_title,weight_kg,reps,duration_seconds,set_type,unknown_column',
    '2.5,Cardio,"25 Oct 2026, 07:00",Run,,,900,normal,ignored',
    ',Cardio,"25 Oct 2026, 07:00",Curl,12.5,10,,normal,ignored',
  ].join('\n');

  const result = parseHevyCsv(csv);

  expect(result.workouts).toHaveLength(1);
  const workout = requireDefined(result.workouts[0]);
  const run = requireDefined(workout.exercises[0]);
  const curl = requireDefined(workout.exercises[1]);
  expect(run.sets[0]?.distanceM).toBe(2500);
  expect(run.sets[0]?.durationSec).toBe(900);
  expect(curl.sets[0]?.weightKg).toBe(12.5);
  expect(curl.sets[0]?.reps).toBe(10);
});

test('end_time отсутствует — finishedAt равен началу плюс час', () => {
  const csv = ['title,start_time,exercise_title', 'Quick,"25 Oct 2026, 18:30",Plank'].join('\n');

  const workout = requireDefined(parseHevyCsv(csv).workouts[0]);

  expect(workout.finishedAt).toBe(workout.startedAt + 60 * 60 * 1000);
});

test('строки без даты или названия считаются пропущенными', () => {
  const csv = [
    'title,start_time,exercise_title,reps',
    'Push Day,"25 Oct 2026, 18:30",Bench Press,5',
    'Push Day,not a date,Bench Press,5',
    ',"25 Oct 2026, 18:30",Bench Press,5',
  ].join('\n');

  const result = parseHevyCsv(csv);

  expect(result.skippedRowCount).toBe(2);
  expect(result.workouts).toHaveLength(1);
  expect(result.workouts[0]?.exercises[0]?.sets).toHaveLength(1);
});

test('перевод строки внутри кавычек не разрывает запись', () => {
  const csv = [
    'title,start_time,description,exercise_title,exercise_notes,reps',
    'Push Day,"25 Oct 2026, 18:30","line one\nline two",Bench Press,"note\nsecond",5',
  ].join('\n');

  const result = parseHevyCsv(csv);

  expect(result.skippedRowCount).toBe(0);
  expect(result.workouts[0]?.notes).toBe('line one\nline two');
  expect(result.workouts[0]?.exercises[0]?.note).toBe('note\nsecond');
});

test('BOM в начале и переводы строк \r\n', () => {
  const byteOrderMark = String.fromCharCode(0xfeff);
  const csv = `${byteOrderMark}title,start_time,exercise_title,reps\r\nPush Day,"25 Oct 2026, 18:30",Bench Press,5\r\n`;

  const result = parseHevyCsv(csv);

  expect(result.skippedRowCount).toBe(0);
  expect(result.workouts[0]?.title).toBe('Push Day');
  expect(result.workouts[0]?.exercises[0]?.sets[0]?.reps).toBe(5);
});

test('даты в ISO и в формате с пробелом', () => {
  const csv = [
    'title,start_time,end_time,exercise_title',
    'Iso,2026-10-25T18:30:00,2026-10-25 19:00:00,Bench Press',
  ].join('\n');

  const workout = requireDefined(parseHevyCsv(csv).workouts[0]);

  expect(workout.startedAt).toBe(new Date(2026, 9, 25, 18, 30).getTime());
  expect(workout.finishedAt).toBe(new Date(2026, 9, 25, 19, 0).getTime());
});
