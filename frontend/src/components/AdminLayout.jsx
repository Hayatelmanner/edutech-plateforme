// frontend/src/components/AdminLayout.jsx
// Layout : sidebar fixe à gauche, contenu décalé sur desktop.
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar.jsx';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile top bar (hamburger) */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-indigo-700">EduTech Admin</span>
        <div className="w-8" />
      </header>

      {/* Main content : décalé de la largeur sidebar (w-64 = 16rem) sur desktop */}
      <main className="md:ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
