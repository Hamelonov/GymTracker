import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { measurements, type MeasurementRow } from '../schema';
import { bumpDb } from '../version';
import { newId } from '@/domain/ids';
import type { MeasurementType } from '@/domain/types';

export function listMeasurements(type: MeasurementType): MeasurementRow[] {
  return db.select().from(measurements).where(eq(measurements.type, type)).orderBy(desc(measurements.measuredAt)).all();
}

export function listMeasurementsAsc(type: MeasurementType): MeasurementRow[] {
  return db.select().from(measurements).where(eq(measurements.type, type)).orderBy(asc(measurements.measuredAt)).all();
}

export function latestMeasurements(): Map<MeasurementType, MeasurementRow> {
  const rows = db.select().from(measurements).orderBy(desc(measurements.measuredAt)).all();
  const map = new Map<MeasurementType, MeasurementRow>();
  for (const r of rows) if (!map.has(r.type)) map.set(r.type, r);
  return map;
}

export function addMeasurement(type: MeasurementType, value: number, measuredAt: number, note = ''): MeasurementRow {
  const row: MeasurementRow = { id: newId(), type, value, measuredAt, note };
  db.insert(measurements).values(row).run();
  bumpDb();
  return row;
}

export function updateMeasurement(id: string, patch: Partial<Pick<MeasurementRow, 'value' | 'measuredAt' | 'note'>>): void {
  db.update(measurements).set(patch).where(eq(measurements.id, id)).run();
  bumpDb();
}

export function deleteMeasurement(id: string): void {
  db.delete(measurements).where(eq(measurements.id, id)).run();
  bumpDb();
}
