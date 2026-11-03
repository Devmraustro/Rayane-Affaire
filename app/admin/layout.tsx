import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Espace de gestion RAYANE AFFAIRE.',
  robots: { index: false, follow: false, nocache: true },
};

/** Never cache an authenticated area. */
export const dynamic = 'force-dynamic';

/**
 * Server-side authorisation.
 *
 * The middleware only checks that a session *cookie* is present; this layout is
 * where the session is actually validated against the database on every request.
 * A revoked or expired session therefore cannot reach any admin page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  const db = getDb();
  const newInquiries = (
    db.prepare(`SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'`).get() as { n: number }
  ).n;
  const drafts = (
    db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM properties WHERE status='draft')
              + (SELECT COUNT(*) FROM vehicles   WHERE status='draft') AS n`,
      )
      .get() as { n: number }
  ).n;

  return (
    <AdminShell user={session.user} counts={{ inquiries: newInquiries, drafts }}>
      {children}
    </AdminShell>
  );
}
