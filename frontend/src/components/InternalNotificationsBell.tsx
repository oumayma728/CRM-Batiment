import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  FileSpreadsheet,
  Mail,
  Receipt,
  RefreshCw,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import type {
  DemandeDevis,
  Devis,
  Facture,
  InternalNotification,
  InternalNotificationsResponse,
} from '@/types';

const READ_STORAGE_KEY = 'baticrm_read_notifications';

interface ProspectItem {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  besoin?: string | null;
  notes?: string | null;
  createdAt: string;
  latestDemandeDevis?: {
    id: number;
    statut: string;
    createdAt: string;
  } | null;
  latestDevis?: {
    id: number;
    reference: string;
    statut: string;
    createdAt: string;
  } | null;
}

interface ProspectsResponse {
  total: number;
  items: ProspectItem[];
}

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface UiNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: NotificationType;
  route: string;
  read: boolean;
}

function readStoredIds() {
  try {
    const stored = localStorage.getItem(READ_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]) {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids)).slice(-250)));
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'success':
      return <CheckCircle size={14} className="text-green-500" />;
    case 'warning':
      return <AlertTriangle size={14} className="text-orange-500" />;
    case 'error':
      return <X size={14} className="text-red-500" />;
    default:
      return <Bell size={14} className="text-blue-500" />;
  }
}

function getBasePath(pathname: string) {
  return pathname.startsWith('/technico') ? '/technico' : '/admin';
}

function getClientName(client?: { nom?: string; prenom?: string }) {
  if (!client) return 'Client';
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client';
}

function timeAgo(dateValue: string) {
  const date = new Date(dateValue).getTime();
  const diffMs = Date.now() - date;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateValue));
}

function isRecent(dateValue: string, maxDays: number) {
  const createdAt = new Date(dateValue).getTime();
  const maxAge = maxDays * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= maxAge;
}

function isInvoiceOverdue(facture: Facture) {
  if (facture.statut !== 'ENVOYEE' || !facture.dateEcheance) return false;
  const dueDate = new Date(facture.dateEcheance);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < Date.now();
}

function internalToUi(
  item: InternalNotification,
  basePath: string,
  readIds: string[],
): UiNotification {
  const type: NotificationType =
    item.level === 'success' ? 'success' : item.level === 'warning' ? 'warning' : 'info';
  const route = item.entite === 'CommandeFournisseur'
    ? `${basePath}/commandes-fournisseur`
    : item.entite === 'Facture'
      ? `${basePath}/factures`
      : item.entite === 'Devis'
        ? `${basePath}/devis`
        : `${basePath}`;
  const id = `internal-${item.id}`;

  return {
    id,
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    type,
    route,
    read: readIds.includes(id),
  };
}

function buildNotifications({
  basePath,
  readIds,
  devis,
  factures,
  demandes,
  prospects,
  internals,
}: {
  basePath: string;
  readIds: string[];
  devis: Devis[];
  factures: Facture[];
  demandes: DemandeDevis[];
  prospects: ProspectItem[];
  internals: InternalNotification[];
}) {
  const notifications: UiNotification[] = [];

  notifications.push(...internals.map((item) => internalToUi(item, basePath, readIds)));

  factures
    .filter(isInvoiceOverdue)
    .slice(0, 6)
    .forEach((facture) => {
      const id = `facture-overdue-${facture.id}`;
      notifications.push({
        id,
        title: 'Facture impayee',
        message: `${facture.reference} est en retard de paiement (${facture.emailClient ?? 'client sans email'}).`,
        createdAt: facture.dateEcheance ?? facture.createdAt ?? facture.date,
        type: 'error',
        route: `${basePath}/factures`,
        read: readIds.includes(id),
      });
    });

  factures
    .filter((facture) => facture.statut === 'ENVOYEE' && !isInvoiceOverdue(facture))
    .slice(0, 4)
    .forEach((facture) => {
      const id = `facture-sent-${facture.id}`;
      notifications.push({
        id,
        title: 'Facture en attente',
        message: `${facture.reference} est envoyee mais pas encore payee.`,
        createdAt: facture.dateEnvoiClient ?? facture.createdAt ?? facture.date,
        type: 'warning',
        route: `${basePath}/factures`,
        read: readIds.includes(id),
      });
    });

  devis
    .filter((item) => isRecent(item.createdAt, 14))
    .slice(0, 6)
    .forEach((item) => {
      const id = `devis-created-${item.id}`;
      notifications.push({
        id,
        title: item.statut === 'BROUILLON' ? 'Nouveau devis brouillon' : 'Devis mis a jour',
        message: `${item.reference} - ${getClientName(item.client)} - ${item.statut}`,
        createdAt: item.updatedAt ?? item.createdAt,
        type: item.statut === 'ACCEPTE' || item.statut === 'SIGNE' ? 'success' : 'info',
        route: `${basePath}/devis`,
        read: readIds.includes(id),
      });
    });

  demandes
    .filter((item) => ['NOUVEAU', 'EN_COURS', 'QUALIFIE'].includes(item.statut as string))
    .slice(0, 6)
    .forEach((demande) => {
      const id = `demande-${demande.id}`;
      notifications.push({
        id,
        title: 'Message client / demande devis',
        message: `${getClientName(demande.client)}: ${demande.description}`,
        createdAt: demande.createdAt,
        type: demande.statut === 'NOUVEAU' ? 'warning' : 'info',
        route: basePath === '/technico' ? '/technico/demandes' : '/admin/demandes-devis',
        read: readIds.includes(id),
      });
    });

  prospects
    .filter((prospect) => !prospect.latestDevis)
    .slice(0, 5)
    .forEach((prospect) => {
      const id = `prospect-${prospect.id}`;
      notifications.push({
        id,
        title: 'Prospect recu via assistant',
        message: `${[prospect.prenom, prospect.nom].filter(Boolean).join(' ') || 'Prospect'}${prospect.email ? ` - ${prospect.email}` : ''}: ${prospect.besoin ?? 'Besoin a qualifier'}`,
        createdAt: prospect.createdAt,
        type: 'info',
        route: basePath === '/technico' ? '/technico/assistant-ia' : '/admin/checklist',
        read: readIds.includes(id),
      });
    });

  return notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 18);
}

export default function InternalNotificationsBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => readStoredIds());
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);

  const internalQuery = useQuery({
    queryKey: ['internal-notifications-bell'],
    queryFn: async () => {
      const res = await api.get('/notifications/internal', { params: { limit: 8 } });
      return res.data as InternalNotificationsResponse;
    },
    refetchInterval: 60000,
  });

  const devisQuery = useQuery({
    queryKey: ['notifications-devis'],
    queryFn: async () => {
      const res = await api.get('/devis', { params: { page: 1, limit: 20 } });
      return (res.data?.data ?? []) as Devis[];
    },
    refetchInterval: 60000,
  });

  const facturesQuery = useQuery({
    queryKey: ['notifications-factures'],
    queryFn: async () => {
      const res = await api.get('/factures', { params: { page: 1, limit: 30 } });
      return (res.data?.data ?? []) as Facture[];
    },
    refetchInterval: 60000,
  });

  const demandesQuery = useQuery({
    queryKey: ['notifications-demandes'],
    queryFn: async () => {
      const res = await api.get('/demandes-devis', { params: { page: 1, limit: 20 } });
      return (res.data?.data ?? []) as DemandeDevis[];
    },
    refetchInterval: 60000,
  });

  const prospectsQuery = useQuery({
    queryKey: ['notifications-assistant-prospects'],
    queryFn: async () => {
      const res = await api.get('/assistant/admin/prospects');
      return res.data as ProspectsResponse;
    },
    refetchInterval: 60000,
  });

  const notifications = useMemo(
    () =>
      buildNotifications({
        basePath,
        readIds,
        devis: devisQuery.data ?? [],
        factures: facturesQuery.data ?? [],
        demandes: demandesQuery.data ?? [],
        prospects: prospectsQuery.data?.items ?? [],
        internals: internalQuery.data?.items ?? [],
      }),
    [
      basePath,
      readIds,
      devisQuery.data,
      facturesQuery.data,
      demandesQuery.data,
      prospectsQuery.data?.items,
      internalQuery.data?.items,
    ],
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const isLoading =
    internalQuery.isLoading ||
    devisQuery.isLoading ||
    facturesQuery.isLoading ||
    demandesQuery.isLoading ||
    prospectsQuery.isLoading;

  const persistReadIds = (nextIds: string[]) => {
    setReadIds(nextIds);
    writeStoredIds(nextIds);
  };

  const markAllAsRead = () => {
    persistReadIds([...readIds, ...notifications.map((notification) => notification.id)]);
  };

  const handleNotificationClick = (notification: UiNotification) => {
    persistReadIds([...readIds, notification.id]);
    navigate(notification.route);
    setShowNotifications(false);
  };

  const refreshAll = () => {
    void internalQuery.refetch();
    void devisQuery.refetch();
    void facturesQuery.refetch();
    void demandesQuery.refetch();
    void prospectsQuery.refetch();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Liees aux devis, factures et demandes</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshAll}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Actualiser"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#185FA5] transition-colors hover:text-[#0F4780] dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    Tout lu
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  <Bell size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">
                    {isLoading ? 'Chargement des notifications...' : 'Aucune notification reelle'}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`block w-full cursor-pointer border-b border-slate-100 p-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80 ${
                      !notification.read
                        ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/45'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {notification.title.includes('Facture') && <Receipt size={12} className="text-slate-400" />}
                          {notification.title.includes('devis') && <FileSpreadsheet size={12} className="text-slate-400" />}
                          {notification.title.includes('Message') && <Mail size={12} className="text-slate-400" />}
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {notification.title}
                          </div>
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                          {notification.message}
                        </div>
                        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {timeAgo(notification.createdAt)}
                        </div>
                      </div>
                      {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 p-2 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  navigate(basePath === '/technico' ? '/technico/demandes' : '/admin/demandes-devis');
                }}
                className="w-full rounded-xl py-1.5 text-center text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Voir les demandes clients
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
