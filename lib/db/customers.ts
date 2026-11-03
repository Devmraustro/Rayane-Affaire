import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { randomUUID } from 'node:crypto';
import type { Customer } from '@/types';

interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  type: Customer['type'];
  notes: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

function toCustomer(row: CustomerRow): Customer {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    type: row.type,
    notes: row.notes,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCustomers(query = ''): Customer[] {
  const db = getDb();
  if (query.trim()) {
    const like = `%${query.trim().toLowerCase()}%`;
    return (
      db
        .prepare(
          `SELECT * FROM customers WHERE LOWER(full_name) LIKE ? OR phone LIKE ?
           ORDER BY created_at DESC LIMIT 200`,
        )
        .all(like, like) as unknown as CustomerRow[]
    ).map(toCustomer);
  }
  return (
    db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT 200').all() as unknown as CustomerRow[]
  ).map(toCustomer);
}

export function getCustomer(id: string): Customer | null {
  const row = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as
    | CustomerRow
    | undefined;
  return row ? toCustomer(row) : null;
}

/** Finds an existing customer by phone or creates one (used by the CRM). */
export function upsertCustomerByPhone(input: {
  fullName: string;
  phone: string;
  email?: string;
}): Customer {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(input.phone) as
    | CustomerRow
    | undefined;
  const now = new Date().toISOString();
  if (existing) {
    db.prepare('UPDATE customers SET full_name = ?, email = COALESCE(?, email), updated_at = ? WHERE id = ?').run(
      input.fullName,
      input.email || null,
      now,
      existing.id,
    );
    return getCustomer(existing.id) as Customer;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO customers (id, full_name, phone, email, type, notes, tags, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'individual', NULL, '[]', 0, ?, ?)`,
  ).run(id, input.fullName, input.phone, input.email || null, now, now);
  return getCustomer(id) as Customer;
}

export function createCustomer(input: {
  fullName: string;
  phone: string;
  email?: string;
  type?: Customer['type'];
  notes?: string;
  tags?: string[];
}): Customer {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO customers (id, full_name, phone, email, type, notes, tags, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    id,
    input.fullName,
    input.phone,
    input.email || null,
    input.type ?? 'individual',
    input.notes ?? null,
    JSON.stringify(input.tags ?? []),
    now,
    now,
  );
  return getCustomer(id) as Customer;
}

export function deleteCustomer(id: string): boolean {
  // Reservations reference customers with ON DELETE RESTRICT; refuse instead of
  // silently orphaning financial history.
  try {
    const result = getDb().prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  } catch {
    return false;
  }
}
