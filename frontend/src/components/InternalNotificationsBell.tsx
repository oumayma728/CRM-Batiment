import { useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Données mock pour les notifications
const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Nouveau devis', message: 'Devis #2024-001 créé par Jean Dupont', time: 'Il y a 5 min', read: false, type: 'success' },
  { id: 2, title: 'Rappel', message: 'Réunion client dans 30 minutes', time: 'Il y a 15 min', read: false, type: 'warning' },
  { id: 3, title: 'Chantier terminé', message: 'Le chantier "Résidence Bellevue" est terminé', time: 'Il y a 1 heure', read: true, type: 'info' },
  { id: 4, title: 'Facture impayée', message: 'Facture #F-2024-042 en retard', time: 'Il y a 2 heures', read: true, type: 'error' },
  { id: 5, title: 'Nouveau message', message: 'Message de Mme Martin concernant le devis', time: 'Il y a 3 heures', read: false, type: 'info' },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success': return <CheckCircle size={14} className="text-green-500" />;
    case 'warning': return <AlertTriangle size={14} className="text-orange-500" />;
    case 'error': return <X size={14} className="text-red-500" />;
    default: return <Bell size={14} className="text-blue-500" />;
  }
};

export default function InternalNotificationsBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: any) => {
    // Marquer comme lu
    setNotifications(prev => prev.map(n => 
      n.id === notif.id ? { ...n, read: true } : n
    ));
    
    // Rediriger en fonction du type de notification
    if (notif.title === 'Nouveau devis') {
      navigate('/admin/devis');
    } else if (notif.title === 'Rappel') {
      navigate('/admin/chantiers');
    } else if (notif.title === 'Facture impayée') {
      navigate('/admin/factures');
    }
    
    setShowNotifications(false);
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
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h4>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-[#185FA5] transition-colors hover:text-[#0F4780] dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  <Bell size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`cursor-pointer border-b border-slate-100 p-3 transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80 ${
                      !notif.read ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/45' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notif.type)}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notif.title}</div>
                        <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{notif.message}</div>
                        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{notif.time}</div>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-100 p-2 dark:border-slate-800">
              <button 
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/admin/notifications');
                }}
                className="w-full rounded-xl py-1.5 text-center text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Voir toutes les notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
