import { parseWorkoutsCsv } from '../workoutsCsv';

// Так выглядит файл из «Профиль → Данные → Экспорт тренировок (CSV)».
const GYMTRACKER_CSV = [
  'date,workout,duration,exercise,set,type,weight_kg,reps,duration_sec,distance_m,rpe,rir,note',
  '2026-10-25T15:00:00.000Z,Ноги,1:05:30,Приседания со штангой,1,warmup,20,12,,,,,',
  '2026-10-25T15:00:00.000Z,Ноги,1:05:30,Приседания со штангой,2,normal,70,9,,,,0,"Было тяжело, колено"',
  '2026-10-25T15:00:00.000Z,Ноги,1:05:30,Приседания со штангой,3,failure,67.5,8,,,9,1,"Было тяжело, колено"',
  '2026-10-25T15:00:00.000Z,Ноги,1:05:30,Планка,1,normal,,,60,,,,',
  '2026-10-27T15:00:00.000Z,Ноги,—,Приседания со штангой,1,normal,72.5,8,,,,,',
  '',
].join('\n');

test('наш CSV: тренировки, упражнения, подходы с RIR, RPE и заметкой', () => {
  const result = parseWorkoutsCsv(GYMTRACKER_CSV);
  expect(result?.format).toBe('gymtracker');
  expect(result?.skippedRowCount).toBe(0);
  expect(result?.workouts).toHaveLength(2);

  const firstWorkout = result?.workouts[0];
  expect(firstWorkout?.title).toBe('Ноги');
  expect(firstWorkout?.startedAt).toBe(Date.parse('2026-10-25T15:00:00.000Z'));
  expect((firstWorkout?.finishedAt ?? 0) - (firstWorkout?.startedAt ?? 0)).toBe((65 * 60 + 30) * 1000);
  expect(firstWorkout?.exercises.map((exercise) => exercise.title)).toEqual([
    'Приседания со штангой',
    'Планка',
  ]);
  expect(firstWorkout?.exercises[0]?.note).toBe('Было тяжело, колено');
  expect(firstWorkout?.exercises[0]?.sets).toEqual([
    { type: 'warmup', weightKg: 20, reps: 12, durationSec: null, distanceM: null, rpe: null, rir: null },
    { type: 'normal', weightKg: 70, reps: 9, durationSec: null, distanceM: null, rpe: null, rir: 0 },
    { type: 'failure', weightKg: 67.5, reps: 8, durationSec: null, distanceM: null, rpe: 9, rir: 1 },
  ]);
  expect(firstWorkout?.exercises[1]?.sets[0]?.durationSec).toBe(60);

  // Без длительности тренировка считается часовой.
  const secondWorkout = result?.workouts[1];
  expect((secondWorkout?.finishedAt ?? 0) - (secondWorkout?.startedAt ?? 0)).toBe(60 * 60 * 1000);
});

test('вес в фунтах переводится в килограммы', () => {
  const result = parseWorkoutsCsv(
    'date,workout,duration,exercise,set,type,weight_lb,reps,duration_sec,distance_m,rpe,rir,note\n' +
      '2026-10-25T15:00:00.000Z,Ноги,1:00:00,Присед,1,normal,100,5,,,,,',
  );
  expect(result?.workouts[0]?.exercises[0]?.sets[0]?.weightKg).toBeCloseTo(45.359, 2);
});

test('CSV из Hevy узнаётся по своим колонкам', () => {
  const result = parseWorkoutsCsv(
    '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"\n' +
      '"Ноги","25 Oct 2026, 18:00","25 Oct 2026, 19:00","","Squat (Barbell)","","","0","normal","70","9","","",""',
  );
  expect(result?.format).toBe('hevy');
  expect(result?.workouts[0]?.exercises[0]?.sets[0]).toMatchObject({ weightKg: 70, reps: 9, rir: null });
});

test('незнакомый CSV не импортируется', () => {
  expect(parseWorkoutsCsv('name,price\nхлеб,50')).toBeNull();
  expect(parseWorkoutsCsv('')).toBeNull();
});
