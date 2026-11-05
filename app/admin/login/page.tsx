import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { countAdminUsers } from '@/lib/db/admin-users';
import { LoginForm } from '@/components/admin/login-form';

export const metadata: Metadata = {
  title: 'Connexion administration',
  robots: { index: false, follow: false },
};

/** Login page. An already-authenticated visitor goes straight to the dashboard. */
export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect(session.user.mustChangePassword ? '/admin/password' : '/admin');

  const configured = countAdminUsers() > 0;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(217,166,34,0.22),transparent_60%)]"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10 font-display text-sm font-semibold text-gold-400 ring-1 ring-white/20">
              RA
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white">
              RAYANE AFFAIRE
            </span>
          </div>
          <div>
            <p className="font-display text-3xl leading-snug text-white">
              Espace d’administration
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">
              Gestion des biens, des véhicules, des demandes clients, des réservations et du suivi
              financier. Toutes les données affichées proviennent de la base de l’agence.
            </p>
          </div>
          <p className="text-2xs uppercase tracking-[0.16em] text-white/25">
            Accès réservé · Sessions chiffrées
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-sand-50 px-6 py-14">
        <LoginForm configured={configured} />
      </div>
    </div>
  );
}
