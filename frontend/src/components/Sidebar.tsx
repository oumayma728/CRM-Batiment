import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * SideNavBar — Exact Stitch markup from hub_d_upload_archai/code.html
 * - Fixed left, h-full, w-64
 * - backdrop-blur-xl, bg-surface-container/30
 * - Nav items with active:bg-primary/10 border-r-2 border-primary
 * - User card at bottom with border-t
 */
export const Sidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 h-full flex-col w-64 border-r border-on-surface/10 backdrop-blur-xl bg-surface-container/30 shadow-xl shadow-primary/5 z-40 hidden md:flex">
      {/* Brand Header */}
      <div className="p-margin flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-on-surface/10">
          <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            view_in_ar
          </span>
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">ArchAI</h1>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">Precision OCR</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 mt-md">
        <ul className="flex flex-col gap-1">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`
              }
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>upload_file</span>
              <span className="font-body-md text-body-md font-medium">Hub d'Upload</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/documents"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`
              }
            >
              <span className="material-symbols-outlined">description</span>
              <span className="font-body-md text-body-md">Documents</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/metrics"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`
              }
            >
              <span className="material-symbols-outlined">insert_chart</span>
              <span className="font-body-md text-body-md">Statistiques</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/validation"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`
              }
            >
              <span className="material-symbols-outlined">rule</span>
              <span className="font-body-md text-body-md">Validation</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* User Card (bottom) — from Stitch */}
      <div className="p-6 border-t border-on-surface/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-on-surface/10 text-primary font-bold text-sm">
          AD
        </div>
        <div>
          <p className="font-body-md text-body-md text-on-surface">Admin</p>
          <p className="font-label-mono text-label-mono text-on-surface-variant">Système</p>
        </div>
      </div>
    </aside>
  );
};
