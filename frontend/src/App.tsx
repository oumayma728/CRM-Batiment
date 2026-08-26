import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { UploadPage } from './pages/UploadPage';
import { ValidationPage } from './pages/ValidationPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { MetricsPage } from './pages/MetricsPage';

/**
 * TopAppBar — Exact Stitch layout:
 * Left: mobile brand / desktop spacer
 * Right: search bar, sensors icon, account_circle icon
 */
const TopAppBar: React.FC = () => {
  return (
    <header className="flex justify-between items-center h-16 px-margin bg-surface/60 backdrop-blur-md border-b border-white/5 z-30 sticky top-0">
      <div className="md:hidden">
        <span className="font-headline-lg-mobile text-headline-lg-mobile font-semibold text-on-surface">ArchAI</span>
      </div>
      <div className="hidden md:block" /> {/* Spacer for flex-between on desktop */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input
            className="bg-[#09090b] border border-white/10 rounded-md pl-10 pr-4 py-1.5 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-0 focus:outline-none focus:shadow-[0_0_4px_rgba(192,193,255,0.2)] w-64 transition-all"
            placeholder="Rechercher..."
            type="text"
          />
        </div>
        {/* Sensors */}
        <button className="text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer p-2">
          <span className="material-symbols-outlined">sensors</span>
        </button>
        {/* Account */}
        <button className="text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer p-2">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="text-on-surface antialiased min-h-screen flex">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen ml-0 md:ml-64 w-full relative">
        {/* Ambient Background Glow — exact Stitch */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        {/* TopAppBar */}
        <TopAppBar />

        {/* Main Canvas */}
        <main className="flex-1 p-6 md:p-8 z-10 w-full relative">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/validation/:id" element={<ValidationPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
