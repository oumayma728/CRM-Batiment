import { useDemo } from '@/contexts/DemoContext';
import { Sparkles, X } from 'lucide-react';

export default function DemoModeIndicator() {
  const { isDemoMode, setDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
      <Sparkles size={16} />
      <span className="font-semibold text-sm">Mode Démo</span>
      <button
        onClick={() => setDemoMode(false)}
        className="ml-2 hover:bg-white/20 rounded-full p-1 transition"
        aria-label="Désactiver le mode démo"
      >
        <X size={14} />
      </button>
    </div>
  );
}
