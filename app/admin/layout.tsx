import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
 *
 * The login route lives under this layout, so it must be excluded from the
 * redirect. Without that exception a signed-out visitor was sent to
 * /admin/login, which ran this layout again and redirected to /admin/login once
 * more — an endless 307 loop that made the back-office unreachable. The login
 * page performs its own (inverse) check: an authenticated visitor is sent to the
 * dashboard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Only the path forwarded by our own middleware is trusted. It is set with
  // `Headers.set` on the request copy, which overwrites anything the client sent,
  // so a forged `x-pathname` cannot reach this point.
  //
  // The comparison is deliberately exact: `startsWith` would treat a route such
  // as `/admin/login/export` as the login page and render it unguarded.
  //
  // Fail closed: if the header is missing the login page is simply treated as a
  // guarded page — an authenticated visitor sees a redundant shell, a
  // signed-out one is redirected to the login form. Neither leaks data, whereas
  // failing open would expose the back-office.
  const currentPath = (await headers()).get('x-pathname') ?? '';
  if (currentPath === '/admin/login') {
    // The login page renders standalone; it must not be wrapped in the shell and
    // must not be guarded, otherwise the redirect loops.
    return <>{children}</>;
  }

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
