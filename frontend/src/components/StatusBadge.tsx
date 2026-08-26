import React from 'react';

export const StatusBadge: React.FC<{ status?: string; statut?: string }> = ({ status, statut }) => {
  const actualStatus = statut || status;
  if (actualStatus === 'valide') {
    return <span className="px-2 py-1 rounded text-xs font-semibold bg-success-emerald/20 text-success-emerald border border-success-emerald/30">Validé</span>;
  }
  if (status === 'rejete') {
    return <span className="px-2 py-1 rounded text-xs font-semibold bg-error-crimson/20 text-error-crimson border border-error-crimson/30">Rejeté</span>;
  }
  return <span className="px-2 py-1 rounded text-xs font-semibold bg-warning-amber/20 text-warning-amber border border-warning-amber/30">En attente</span>;
};
