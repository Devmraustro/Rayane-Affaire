import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { randomUUID } from 'node:crypto';
import type { SessionContext } from './session';

/** Append-only audit trail for privileged writes (who changed what, when). */
export function recordAudit(
  session: SessionContext,
  action: string,
  entityType: string,
  entityId: string | null,
  detail?: unknown,
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, actor_id, actor_email, action, entity_type, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      session.user.id,
      session.user.email,
      action,
      entityType,
      entityId,
      detail === undefined ? null : JSON.stringify(detail).slice(0, 4000),
      new Date().toISOString(),
    );
}

export function listAudit(limit = 50): {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}[] {
  return getDb()
    .prepare(
      `SELECT id, actor_email, action, entity_type, entity_id, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as unknown as {
    id: string;
    actor_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
  }[];
}
