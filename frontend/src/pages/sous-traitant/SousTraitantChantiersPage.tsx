import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, Loader2, MapPin, Search } from 'lucide-react';
import api from '@/lib/api';
import type {
  PaginatedResponse,
  SousTraitantChantier,
} from './types';

function formatDate(value?: string | null) {
  if (!value) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export default function SousTraitantChantiersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['sous-traitant-chantiers', search],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<SousTraitantChantier>>(
        '/sous-traitant/chantiers',
        { params: { search: search.trim() || undefined, limit: 50 } },
      );
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">Mes chantiers</h2>
        <p className="mt-1 text-sm text-slate-500">
          Seuls les chantiers contenant au moins une tâche qui vous est affectée sont visibles.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par référence, client ou adresse..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          Impossible de charger vos chantiers.
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : !data?.data.length ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white text-center shadow-sm">
          <Building2 size={32} className="text-slate-300" />
          <h3 className="mt-4 font-semibold text-slate-800">Aucun chantier affecté</h3>
          <p className="mt-1 text-sm text-slate-400">
            Un chantier apparaîtra dès qu’une tâche vous sera attribuée.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.data.map((chantier) => {
            const done = chantier.taches.filter(
              (task) => task.statut === 'TERMINEE' || task.avancement >= 100,
            ).length;
            const progress = chantier.taches.length
              ? Math.round((done / chantier.taches.length) * 100)
              : 0;
            const clientName = `${chantier.client.prenom ?? ''} ${chantier.client.nom}`.trim();

            return (
              <article
                key={chantier.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {chantier.reference}
                    </p>
                    <h3 className="mt-1 truncate text-lg font-semibold text-slate-950">
                      {clientName || `Client #${chantier.client.id}`}
                    </h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {chantier.statut.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <MapPin size={15} className="text-slate-400" />
                    {chantier.adresse}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-slate-400" />
                    {formatDate(chantier.dateDebut)} → {formatDate(chantier.dateFin)}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{chantier.taches.length} tâche(s) affectée(s)</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Tâches terminées</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {done}/{chantier.taches.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Documents</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {chantier.documents.length}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
