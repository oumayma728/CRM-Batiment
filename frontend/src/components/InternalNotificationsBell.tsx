import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Clock3, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { InternalNotification, InternalNotificationsResponse, Role } from '@/types';

const allowedRoles: Role[] = ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER', 'TECHNICO', 'SOUS_TRAITANT'];

type NotificationFilter = 'ALL' | 'ALERTS' | 'SAV' | 'DEMOS' | 'SIGNATURES' | 'PRICES';
type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

const levelStyles = {
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
} as const;

const activeLevelStyles = {
  info: 'border-sky-300 bg-sky-100 text-sky-800 ring-2 ring-sky-100',
  success: 'border-emerald-300 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-100',
  warning: 'border-amber-300 bg-amber-100 text-amber-800 ring-2 ring-amber-100',
  danger: 'border-red-300 bg-red-100 text-red-800 ring-2 ring-red-100',
} as const;

const dotStyles = {
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
} as const;

const categoryLabels: Record<string, string> = {
  FACTURES_IMPAYEES: 'Factures',
  CHANTIERS_RETARD: 'Chantiers',
  COMMANDES_ATTENTE: 'Commandes',
  SIGNATURE_DEVIS: 'Signature',
  MODIFICATION_PRIX: 'Prix',
  SUPPLIER_STATUS: 'Fournisseur',
  RECEPTION_PARTIELLE: 'Reception',
  RECEPTION_COMPLETE: 'Reception',
  SAV_TICKET: 'SAV',
  SAV_URGENT: 'SAV urgent',
  SAV_NOTE: 'Note SAV',
  DEMO_REQUEST: 'Démo',
  DEMO_SCHEDULED: 'Démo',
  CHANTIER_DOCUMENT: 'Document chantier',
  STOCK_BAS: 'Stock',
  AUDIT_RECENT: 'Audit',
};

const filterLabels: Record<NotificationFilter, string> = {
  ALL: 'Toutes',
  ALERTS: 'Alertes',
  SAV: 'SAV',
  DEMOS: 'Démos',
  SIGNATURES: 'Signatures',
  PRICES: 'Prix',
};

function getNotificationFilter(category: string): NotificationFilter {
  if (category.startsWith('SAV')) return 'SAV';
  if (category.startsWith('DEMO')) return 'DEMOS';
  if (category === 'SIGNATURE_DEVIS') return 'SIGNATURES';
  if (category === 'MODIFICATION_PRIX') return 'PRICES';

  if (
    category === 'FACTURES_IMPAYEES' ||
    category === 'CHANTIERS_RETARD' ||
    category === 'COMMANDES_ATTENTE' ||
    category === 'SUPPLIER_STATUS' ||
    category === 'RECEPTION_PARTIELLE' ||
    category === 'RECEPTION_COMPLETE' ||
    category === 'CHANTIER_DOCUMENT'
    || category === 'STOCK_BAS'
  ) {
    return 'ALERTS';
  }

  return 'ALERTS';
}

function matchesFilter(item: InternalNotification, activeFilter: NotificationFilter) {
  if (activeFilter === 'ALL') return true;
  return getNotificationFilter(item.category) === activeFilter;
}

export default function InternalNotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('ALL');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const storageKey = user ? `internal-notifications-last-seen-${user.id}` : null;
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() =>
    storageKey ? localStorage.getItem(storageKey) : null,
  );
  const canUseNotifications = Boolean(user && allowedRoles.includes(user.role));

  const notificationsQuery = useQuery({
    queryKey: ['internal-notifications', user?.id],
    enabled: canUseNotifications,
    refetchInterval: 60000, // secours si le WebSocket est indisponible
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<InternalNotificationsResponse>(
        '/notifications/internal',
        { params: { limit: 20 } },
      );
      return response.data;
    },
  });

  const items = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, activeFilter)),
    [items, activeFilter],
  );

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return items.length;
    const lastSeenTime = new Date(lastSeenAt).getTime();
    return items.filter((item) => new Date(item.createdAt).getTime() > lastSeenTime).length;
  }, [items, lastSeenAt]);

  const summary = notificationsQuery.data?.summary;

  const countsByFilter = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      ALL: items.length,
      ALERTS: 0,
      SAV: 0,
      DEMOS: 0,
      SIGNATURES: 0,
      PRICES: 0,
    };

    for (const item of items) {
      const filter = getNotificationFilter(item.category);
      counts[filter] += 1;
    }

    return counts;
  }, [items]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, []);

  const markAsSeen = () => {
    if (!storageKey) return;

    const seenAt = new Date().toISOString();
    localStorage.setItem(storageKey, seenAt);
    setLastSeenAt(seenAt);
  };

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      markAsSeen();
    }
  };

  const getRoleHome = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'ASSISTANTE') return '/assistante';
    if (user?.role === 'TECHNICO') return '/technico';
    if (user?.role === 'CHEF_CHANTIER') return '/chef-chantier';
    if (user?.role === 'SOUS_TRAITANT') return '/sous-traitant';
    return '/login';
  };

  const getNotificationTarget = (category: string) => {
    if (category.startsWith('SAV')) {
      if (user?.role === 'TECHNICO') return '/technico/sav';
      if (user?.role === 'CHEF_CHANTIER') return '/chef-chantier/sav';
      if (user?.role === 'ASSISTANTE') return '/assistante/sav';
      if (user?.role === 'ADMIN') return '/admin/sav';
      return getRoleHome();
    }

    if (category.startsWith('DEMO')) {
      if (user?.role === 'TECHNICO') return '/technico/demo-requests';
      if (user?.role === 'ASSISTANTE') return '/assistante/demo-requests';
      if (user?.role === 'ADMIN') return '/admin/demo-requests';
      return getRoleHome();
    }

    if (category === 'CHANTIER_DOCUMENT' || category === 'CHANTIERS_RETARD') {
      if (user?.role === 'CHEF_CHANTIER') return '/chef-chantier/chantiers';
      if (user?.role === 'ASSISTANTE') return '/assistante/chantiers';
      if (user?.role === 'ADMIN') return '/admin/chantiers';
      return getRoleHome();
    }

    if (category === 'STOCK_BAS') {
      if (user?.role === 'ADMIN') return '/admin/stock';
      return getRoleHome();
    }

    if (category === 'SIGNATURE_DEVIS' || category === 'MODIFICATION_PRIX') {
      if (user?.role === 'TECHNICO') return '/technico/devis';
      if (user?.role === 'ASSISTANTE') return '/assistante/devis';
      if (user?.role === 'ADMIN') return '/admin/devis';
      return getRoleHome();
    }

    return user?.role === 'ADMIN' ? '/admin/audit' : getRoleHome();
  };

  const handleGoToList = () => {
    markAsSeen();
    setOpen(false);

    const category =
      activeFilter === 'SAV'
        ? 'SAV_TICKET'
        : activeFilter === 'DEMOS'
          ? 'DEMO_REQUEST'
          : activeFilter === 'SIGNATURES'
            ? 'SIGNATURE_DEVIS'
            : activeFilter === 'PRICES'
              ? 'MODIFICATION_PRIX'
              : 'AUDIT_RECENT';

    navigate(getNotificationTarget(category));
  };

  const handleNotificationClick = (category: string) => {
    markAsSeen();
    setOpen(false);
    navigate(getNotificationTarget(category));
  };

  if (!canUseNotifications) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
        aria-label="Notifications internes"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-2 top-16 z-[120] max-h-[75vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[420px] sm:overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Notifications internes</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cliquez sur un compteur pour filtrer les notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={() => notificationsQuery.refetch()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Actualiser les notifications"
              >
                {notificationsQuery.isFetching ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
              </button>
            </div>

            {summary ? (
              <div className="mt-4 grid grid-cols-5 gap-2">
                <NotificationMetric
                  label="Alertes"
                  value={summary.alerts ?? countsByFilter.ALERTS}
                  tone="danger"
                  active={activeFilter === 'ALERTS'}
                  onClick={() => setActiveFilter((current) => (current === 'ALERTS' ? 'ALL' : 'ALERTS'))}
                />
                <NotificationMetric
                  label="SAV"
                  value={summary.savNotifications ?? countsByFilter.SAV}
                  tone="danger"
                  active={activeFilter === 'SAV'}
                  onClick={() => setActiveFilter((current) => (current === 'SAV' ? 'ALL' : 'SAV'))}
                />
                <NotificationMetric
                  label="Démos"
                  value={summary.demoNotifications ?? summary.demoPending ?? countsByFilter.DEMOS}
                  tone="warning"
                  active={activeFilter === 'DEMOS'}
                  onClick={() => setActiveFilter((current) => (current === 'DEMOS' ? 'ALL' : 'DEMOS'))}
                />
                <NotificationMetric
                  label="Signatures"
                  value={summary.signatures ?? countsByFilter.SIGNATURES}
                  tone="success"
                  active={activeFilter === 'SIGNATURES'}
                  onClick={() => setActiveFilter((current) => (current === 'SIGNATURES' ? 'ALL' : 'SIGNATURES'))}
                />
                <NotificationMetric
                  label="Prix"
                  value={summary.modificationsPrix ?? countsByFilter.PRICES}
                  tone="warning"
                  active={activeFilter === 'PRICES'}
                  onClick={() => setActiveFilter((current) => (current === 'PRICES' ? 'ALL' : 'PRICES'))}
                />
              </div>
            ) : null}

            {activeFilter !== 'ALL' ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="text-xs font-medium text-blue-700">
                  Filtre actif : {filterLabels[activeFilter]}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className="text-xs font-semibold text-blue-700 transition hover:text-blue-900"
                >
                  Tout afficher
                </button>
              </div>
            ) : null}
          </div>

          <div className="max-h-[440px] overflow-y-auto bg-slate-50/50">
            {notificationsQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Bell size={20} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Aucune notification récente
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Les alertes importantes apparaîtront ici.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Bell size={20} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Aucune notification pour {filterLabels[activeFilter].toLowerCase()}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className="mt-2 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Voir toutes les notifications
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {filteredItems.map((item) => (
                  <button
                    type="button"
                    key={`${item.action}-${item.id}`}
                    onClick={() => handleNotificationClick(item.category)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'mt-0.5 h-2.5 w-2.5 rounded-full',
                            dotStyles[item.level] ?? dotStyles.info,
                          )}
                        />
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            levelStyles[item.level] ?? levelStyles.info,
                          )}
                        >
                          {categoryLabels[item.category] ?? item.category}
                        </span>
                      </div>

                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                        <Clock3 size={12} />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      {item.actor ? (
                        <p className="truncate text-xs text-slate-400">
                          Par {item.actor.prenom} {item.actor.nom}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Alerte automatique</p>
                      )}

                      <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                        {item.category.startsWith('SAV')
                          ? 'Voir SAV'
                          : item.category.startsWith('DEMO')
                            ? 'Voir démos'
                            : item.category === 'CHANTIER_DOCUMENT'
                              ? 'Voir chantier'
                              : 'Ouvrir'}
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">
              {filteredItems.length} / {summary?.total ?? items.length} notification(s) affichée(s)
            </p>
            <button
              type="button"
              onClick={handleGoToList}
              className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              {activeFilter === 'SAV'
                ? 'Ouvrir SAV'
                : activeFilter === 'DEMOS'
                  ? 'Ouvrir les démos'
                  : 'Ouvrir l’historique'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationMetric({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: NotificationTone;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm',
        active ? activeLevelStyles[tone] : levelStyles[tone],
      )}
    >
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="mt-0.5 text-base font-bold leading-none">{value}</p>
    </button>
  );
}
