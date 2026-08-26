import React from 'react';
import type { ExtractedFieldCard, PlanPiece, DevisLine, PieceSansDevis } from '../types';

export interface FieldCardProps {
  field: ExtractedFieldCard;
  onChange: (val: any) => void;
  isHovered?: boolean;
  onHover?: (hovered: boolean) => void;
  onQuickAssignSurface?: (pieceNom: string, surfaceM2: number) => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({ field, onChange, isHovered, onHover }) => {
  const { label, value, confidence, type } = field;

  return (
    <div 
      className={`glass-card p-3 rounded-lg space-y-1 ${isHovered ? 'border-primary shadow-[0_0_10px_rgba(31,168,179,0.3)]' : ''}`}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-on-surface-variant font-medium">{label}</span>
        {confidence !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidence > 0.8 ? 'bg-success-emerald/20 text-success-emerald' : 'bg-warning-amber/20 text-warning-amber'}`}>
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <div className="text-sm text-on-surface font-medium">
        {(type === 'text' || type === 'number' || type === 'date') ? (
           <input 
             type={type === 'number' ? 'number' : 'text'} 
             value={(value as any) || ''} 
             onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
             className="w-full bg-surface-container border border-outline/30 rounded px-2.5 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary transition-colors"
           />
        ) : type === 'pieces' ? (
           <div className="overflow-x-auto border border-white/10 rounded-lg">
             <table className="w-full text-left text-xs border-collapse">
               <thead className="bg-surface">
                 <tr className="border-b border-white/10 text-on-surface-variant">
                   <th className="py-2 px-3 font-medium">Niveau</th>
                   <th className="py-2 px-3 font-medium">Nom / espace</th>
                   <th className="py-2 px-3 font-medium">Cotes</th>
                   <th className="py-2 px-3 font-medium">Dimensions</th>
                   <th className="py-2 px-3 font-medium">Surface</th>
                 </tr>
               </thead>
               <tbody className="bg-surface-container divide-y divide-white/5">
                 {(value as PlanPiece[] || []).map((p, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors">
                     <td className="py-2 px-3 whitespace-nowrap text-primary/70">{p.niveau || '-'}</td>
                     <td className="py-2 px-3 font-semibold text-on-surface">{p.nom}</td>
                     <td className="py-2 px-3 text-[10px] text-on-surface-variant max-w-[120px] truncate" title={(p.cotes_originales || p.cotes || []).join('; ')}>
                       {(p.cotes_originales || p.cotes || []).join('; ') || '-'}
                     </td>
                     <td className="py-2 px-3 text-on-surface-variant">
                       {(p.longueur_m && p.largeur_m) ? `${p.longueur_m}m x ${p.largeur_m}m` : '-'}
                     </td>
                     <td className="py-2 px-3">
                       <div className="flex items-center gap-1">
                         {p.surface_m2 !== null && p.surface_m2 !== undefined ? (
                           <>
                             <span className="font-mono text-primary font-bold">{p.surface_m2} m²</span>
                             {p.source_surface === 'calculee' && (
                               <span className="material-symbols-outlined text-[12px] text-success-emerald" title={`Calculé: ${p.methode_calcul || 'L x l'}`}>calculate</span>
                             )}
                           </>
                         ) : (
                           <span className="font-mono text-on-surface-variant/50">-</span>
                         )}
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        ) : type === 'devis_lines' ? (
           <ul className="space-y-1">
             {(value as DevisLine[] || []).map((l, i) => (
               <li key={i} className="text-xs bg-surface-container p-1 rounded truncate">
                 <span className="font-bold">{l.quantite}x</span> {l.designation}
               </li>
             ))}
           </ul>
        ) : type === 'pieces_sans_devis' ? (
           <ul className="space-y-1">
             {(value as PieceSansDevis[] || []).map((p, i) => (
               <li key={i} className="text-xs bg-surface-container p-1.5 rounded">
                 {p.nom}
               </li>
             ))}
           </ul>
        ) : type === 'list' ? (
           <div className="overflow-x-auto max-h-48 overflow-y-auto border border-white/10 rounded-lg">
             <table className="w-full text-left text-xs border-collapse">
               <thead className="bg-surface sticky top-0 z-10">
                 <tr className="border-b border-white/10 text-on-surface-variant">
                   <th className="py-2 px-3 font-medium">Références produits / Lignes</th>
                 </tr>
               </thead>
               <tbody className="bg-surface-container divide-y divide-white/5">
                 {(value as string[] || []).map((item, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors">
                     <td className="py-2 px-3 text-on-surface font-mono" title={item}>{item}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        ) : (
           <div className="truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
             {typeof value === 'object' ? JSON.stringify(value) : (value || '-')}
           </div>
        )}
      </div>
    </div>
  );
};
