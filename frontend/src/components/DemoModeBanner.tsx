import { ShieldCheck } from 'lucide-react';
import { isDemoSession } from '@/lib/demoMode';

export default function DemoModeBanner() {
  if (!isDemoSession()) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck size={16} className="shrink-0" />
        <strong>Mode demo securise</strong>
        <span>Donnees fictives, lecture seule, aucune modification n'est envoyee au backend.</span>
      </div>
    </div>
  );
}
