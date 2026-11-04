import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { randomUUID } from 'node:crypto';
import type { Reservation, ReservationStatus } from '@/types';

interface ReservationRow {
  id: string;
  reference: string;
  kind: Reservation['kind'];
  property_id: string | null;
  vehicle_id: string | null;
  customer_id: string;
  item_title_fr: string;
  item_title_ar: string;
  item_reference: string;
  start_date: string;
  end_date: string;
  amount: number;
  deposit: number;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
}

const SELECT_SQL = `
  SELECT r.*, c.full_name AS customer_name, c.phone AS customer_phone
  FROM reservations r JOIN customers c ON c.id = r.customer_id`;

function toReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    propertyId: row.property_id,
    vehicleId: row.vehicle_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    itemTitle: { fr: row.item_title_fr, ar: row.item_title_ar },
    itemReference: row.item_reference,
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    deposit: row.deposit,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nextReference(): string {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM reservations`)
    .get() as { n: number };
  let seq = row.n + 1;
  for (;;) {
    const candidate = `RA-RES-${String(seq).padStart(4, '0')}`;
    const exists = db.prepare('SELECT 1 FROM reservations WHERE reference = ?').get(candidate);
    if (!exists) return candidate;
    seq += 1;
  }
}

export function listReservations(filters: {
  status?: ReservationStatus | 'all';
  from?: string;
  to?: string;
  includeDemo?: boolean;
} = {}): Reservation[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== 'all') {
    clauses.push('r.status = ?');
    params.push(filters.status);
  }
  if (filters.from) {
    clauses.push('r.end_date >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('r.start_date <= ?');
    params.push(filters.to);
  }
  if (filters.includeDemo === false) clauses.push('r.is_demo = 0');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`${SELECT_SQL} ${where} ORDER BY r.start_date ASC LIMIT 500`)
    .all(...params) as unknown as ReservationRow[];
  return rows.map(toReservation);
}

export function getReservation(id: string): Reservation | null {
  const row = getDb().prepare(`${SELECT_SQL} WHERE r.id = ?`).get(id) as unknown as
    | ReservationRow
    | undefined;
  return row ? toReservation(row) : null;
}

export function createReservation(input: {
  kind: Reservation['kind'];
  propertyId?: string | null;
  vehicleId?: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
  amount: number;
  deposit: number;
  status?: ReservationStatus;
  notes?: string | null;
  isDemo?: boolean;
}): Reservation {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  let titleFr = '';
  let titleAr = '';
  let itemReference = '';
  if (input.kind === 'property' && input.propertyId) {
    const row = db
      .prepare('SELECT title_fr, title_ar, reference FROM properties WHERE id = ?')
      .get(input.propertyId) as
      | { title_fr: string; title_ar: string; reference: string }
      | undefined;
    if (!row) throw new Error('Property not found');
    titleFr = row.title_fr;
    titleAr = row.title_ar;
    itemReference = row.reference;
  } else if (input.kind === 'vehicle' && input.vehicleId) {
    const row = db
      .prepare('SELECT title_fr, title_ar, reference FROM vehicles WHERE id = ?')
      .get(input.vehicleId) as
      | { title_fr: string; title_ar: string; reference: string }
      | undefined;
    if (!row) throw new Error('Vehicle not found');
    titleFr = row.title_fr;
    titleAr = row.title_ar;
    itemReference = row.reference;
  } else {
    throw new Error('A reservation must reference a listing');
  }

  db.prepare(
    `INSERT INTO reservations (
       id, reference, kind, property_id, vehicle_id, customer_id,
       item_title_fr, item_title_ar, item_reference, start_date, end_date,
       amount, deposit, status, notes, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    nextReference(),
    input.kind,
    input.propertyId ?? null,
    input.vehicleId ?? null,
    input.customerId,
    titleFr,
    titleAr,
    itemReference,
    input.startDate,
    input.endDate,
    input.amount,
    input.deposit,
    input.status ?? 'pending',
    input.notes ?? null,
    input.isDemo ? 1 : 0,
    now,
    now,
  );

  return getReservation(id) as Reservation;
}

export function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Reservation | null {
  getDb()
    .prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
  return getReservation(id);
}

/** Overlap check used before confirming a short-term rental. */
export function hasOverlap(
  kind: Reservation['kind'],
  itemId: string,
  startDate: string,
  endDate: string,
): boolean {
  const column = kind === 'property' ? 'property_id' : 'vehicle_id';
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM reservations
       WHERE ${column} = ? AND status IN ('pending','confirmed','active')
         AND NOT (end_date < ? OR start_date > ?)`,
    )
    .get(itemId, startDate, endDate) as { n: number };
  return row.n > 0;
}
