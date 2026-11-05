import { notFound } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { emailDeliveryConfigured } from '@/lib/server/email';
import { NotificationPreferences } from '@/components/admin/notification-preferences';
export const dynamic = 'force-dynamic';
export default async function NotificationsPage() { const session = await getSession(); if (!session) notFound(); return <div><h1 className="text-2xl">Notifications · الإشعارات</h1><p className="mb-5 mt-1 text-sm text-ink-500">Préférences individuelles, sans secrets stockés dans la base.</p><NotificationPreferences user={session.user} emailConfigured={emailDeliveryConfigured()} /></div>; }
