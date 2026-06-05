import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { InternalNotificationsResponse, Role } from '@/types';

const allowedRoles: Role[] = ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER', 'TECHNICO'];

const levelStyles = {
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
} as const;

export default function InternalNotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const storageKey = user ? `internal-notifications-last-seen-${user.id}` : null;
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() =>
    storageKey ? localStorage.getItem(storageKey) : null,
  );
  const canUseNotifications = Boolean(user && allowedRoles.includes(user.role));

  const notificationsQuery = useQuery({
    queryKey: ['internal-notifications', user?.id],
    enabled: canUseNotifications,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await api.get<InternalNotificationsResponse>(
        '/notifications/internal',
        { params: { limit: 8 } },
      );
      return response.data;
    },
  });

  const items = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );
  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return items.length;
    const lastSeenTime = new Date(lastSeenAt).getTime();
    return items.filter((item) => new Date(item.createdAt).getTime() > lastSeenTime).length;
  }, [items, lastSeenAt]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && storageKey) {
      const seenAt = new Date().toISOString();
      localStorage.setItem(storageKey, seenAt);
      setLastSeenAt(seenAt);
    }
  };

  if (!canUseNotifications) return null;

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-500 transition-colors hover:bg-gray-200/80 hover:text-gray-700"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
          <div className="border-b border-stone-200 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Notifications internes</p>
                <p className="text-xs text-slate-500">
                  Mises a jour fournisseur et receptions chantier
                </p>
              </div>
              {notificationsQuery.isFetching ? (
                <Loader2 size={16} className="animate-spin text-slate-400" />
              ) : null}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl bg-stone-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Aucune notification recente.
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                          levelStyles[item.level],
                        )}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                    {item.actor ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Par {item.actor.prenom} {item.actor.nom}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notificationsQuery.data ? (
            <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-slate-500">
              {notificationsQuery.data.summary.total} notification(s) chargee(s)
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
