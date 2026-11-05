import { notFound } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { listAdminUsers } from '@/lib/db/admin-users';
import { UserManager } from '@/components/admin/user-manager';
export const dynamic = 'force-dynamic';
export default async function UsersPage() { const session = await getSession(); if (!session || session.user.role !== 'owner') notFound(); return <div><h1 className="text-2xl">Utilisateurs et rôles · المستخدمون والأدوار</h1><p className="mb-5 mt-1 text-sm text-ink-500">Création, désactivation, suppression sécurisée et révocation immédiate des sessions.</p><UserManager initialUsers={listAdminUsers()} currentUserId={session.user.id} /></div>; }
