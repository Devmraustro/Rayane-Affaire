import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { isVehiclePublicVisible } from './settings';
import { randomUUID } from 'node:crypto';
import type { Inquiry, InquiryStatus, InquiryType, Locale, ContactChannel } from '@/types';
import type { InquiryPayload } from '@/lib/validation';

/** Inquiry (lead) repository — the conversion funnel's source of truth. */

interface InquiryRow {
  id: string;
  locale: Locale;
  type: InquiryType;
  status: InquiryStatus;
  full_name: string;
  phone: string;
  email: string | null;
  message: string;
  property_id: string | null;
  vehicle_id: string | null;
  property_reference: string | null;
  vehicle_reference: string | null;
  preferred_channel: ContactChannel;
  preferred_date: string | null;
  source_ip_hash: string | null;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    locale: row.locale,
    type: row.type,
    status: row.status,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    propertyId: row.property_id,
    vehicleId: row.vehicle_id,
    propertyReference: row.property_reference,
    vehicleReference: row.vehicle_reference,
    preferredChannel: row.preferred_channel,
    preferredDate: row.preferred_date,
    sourceIpHash: row.source_ip_hash,
    userAgent: row.user_agent,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_SQL = `
  SELECT i.*,
    (SELECT p.reference FROM properties p WHERE p.id = i.property_id) AS property_reference,
    (SELECT v.reference FROM vehicles   v WHERE v.id = i.vehicle_id)   AS vehicle_reference
  FROM inquiries i`;

export function createInquiry(
  payload: InquiryPayload,
  meta: { ipHash: string | null; userAgent: string | null },
): Inquiry {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  // A listing id supplied by the browser must exist and be published, otherwise
  // it is dropped rather than stored as a dangling reference.
  let propertyId: string | null = null;
  if (payload.propertyId) {
    const row = db
      .prepare(`SELECT id FROM properties WHERE id = ? AND status = 'published'`)
      .get(payload.propertyId) as { id: string } | undefined;
    propertyId = row?.id ?? null;
  }
  // Public endpoint: a vehicle may only be referenced while the section is
  // public. Without this guard, posting a vehicle id and observing whether the
  // stored row carries it would let anyone enumerate hidden inventory, and the
  // back-office would accumulate enquiries about listings nobody can see. The
  // id is dropped silently, exactly as an unknown id is — no oracle either way.
  let vehicleId: string | null = null;
  if (payload.vehicleId && isVehiclePublicVisible()) {
    const row = db
      .prepare(`SELECT id FROM vehicles WHERE id = ? AND status = 'published'`)
      .get(payload.vehicleId) as { id: string } | undefined;
    vehicleId = row?.id ?? null;
  }

  // A vehicle-linked submission typed as 'vehicle' or 'reservation' degrades to
  // 'general' when the reference was dropped: the public site does not accept
  // vehicle enquiries while the section is hidden.
  const requestedType: InquiryType =
    payload.type === 'vehicle' || payload.type === 'reservation' ? 'general' : payload.type;

  const type: InquiryType = propertyId
    ? 'property'
    : vehicleId
      ? 'vehicle'
      : requestedType;

  db.prepare(
    `INSERT INTO inquiries (
       id, locale, type, status, full_name, phone, email, message,
       property_id, vehicle_id, preferred_channel, preferred_date,
       source_ip_hash, user_agent, admin_notes, created_at, updated_at)
     VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    id,
    payload.locale,
    type,
    payload.fullName,
    payload.phone,
    payload.email || null,
    payload.message,
    propertyId,
    vehicleId,
    payload.preferredChannel,
    payload.preferredDate || null,
    meta.ipHash,
    meta.userAgent,
    now,
    now,
  );

  const row = db.prepare(`${SELECT_SQL} WHERE i.id = ?`).get(id) as unknown as InquiryRow;
  return rowToInquiry(row);
}

export interface InquiryListFilters {
  status?: InquiryStatus | 'all';
  type?: InquiryType | 'all';
  query?: string;
  page?: number;
  pageSize?: number;
}

export function listInquiries(filters: InquiryListFilters = {}): {
  items: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status && filters.status !== 'all') {
    clauses.push('i.status = ?');
    params.push(filters.status);
  } else if (!filters.status) {
    // Default view hides spam from the working queue.
    clauses.push(`i.status <> 'spam'`);
  }
  if (filters.type && filters.type !== 'all') {
    clauses.push('i.type = ?');
    params.push(filters.type);
  }
  if (filters.query?.trim()) {
    const like = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push('(LOWER(i.full_name) LIKE ? OR LOWER(i.phone) LIKE ? OR LOWER(i.message) LIKE ?)');
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM inquiries i ${where}`).get(...params) as { n: number }
  ).n;

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const rows = db
    .prepare(`${SELECT_SQL} ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as unknown as InquiryRow[];

  return {
    items: rows.map(rowToInquiry),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function getInquiry(id: string): Inquiry | null {
  const row = getDb().prepare(`${SELECT_SQL} WHERE i.id = ?`).get(id) as unknown as
    | InquiryRow
    | undefined;
  return row ? rowToInquiry(row) : null;
}

export function updateInquiry(
  id: string,
  patch: { status?: InquiryStatus; adminNotes?: string },
): Inquiry | null {
  const db = getDb();
  const fields: string[] = [];
  const params: (string | null)[] = [];
  if (patch.status) {
    fields.push('status = ?');
    params.push(patch.status);
  }
  if (patch.adminNotes !== undefined) {
    fields.push('admin_notes = ?');
    params.push(patch.adminNotes);
  }
  if (!fields.length) return getInquiry(id);
  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  db.prepare(`UPDATE inquiries SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getInquiry(id);
}
