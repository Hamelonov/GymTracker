import { asc, desc, eq } from 'drizzle-orm';
import { database } from '../client';
import { measurements, type MeasurementRow } from '../schema';
import { notifyDatabaseChanged } from '../version';
import { newId } from '@/domain/ids';
import type { MeasurementType } from '@/domain/types';

export function listMeasurements(type: MeasurementType): MeasurementRow[] {
  return database
    .select()
    .from(measurements)
    .where(eq(measurements.type, type))
    .orderBy(desc(measurements.measuredAt))
    .all();
}

export function listMeasurementsOldestFirst(type: MeasurementType): MeasurementRow[] {
  return database
    .select()
    .from(measurements)
    .where(eq(measurements.type, type))
    .orderBy(asc(measurements.measuredAt))
    .all();
}

export function latestMeasurements(): Map<MeasurementType, MeasurementRow> {
  const newestFirstRows = database.select().from(measurements).orderBy(desc(measurements.measuredAt)).all();
  const latestByType = new Map<MeasurementType, MeasurementRow>();
  for (const row of newestFirstRows) {
    if (!latestByType.has(row.type)) latestByType.set(row.type, row);
  }
  return latestByType;
}

export function addMeasurement(
  type: MeasurementType,
  value: number,
  measuredAt: number,
  note = '',
): MeasurementRow {
  const row: MeasurementRow = { id: newId(), type, value, measuredAt, note };
  database.insert(measurements).values(row).run();
  notifyDatabaseChanged();
  return row;
}

export function updateMeasurement(
  id: string,
  patch: Partial<Pick<MeasurementRow, 'value' | 'measuredAt' | 'note'>>,
): void {
  database.update(measurements).set(patch).where(eq(measurements.id, id)).run();
  notifyDatabaseChanged();
}

export function deleteMeasurement(id: string): void {
  database.delete(measurements).where(eq(measurements.id, id)).run();
  notifyDatabaseChanged();
}
