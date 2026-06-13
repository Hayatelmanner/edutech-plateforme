// frontend/src/components/AdminSidebar.jsx
// Sidebar : position fixed à gauche, toujours visible sur desktop.
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  KeyRound, Activity, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/super',              label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/super/teachers',     label: 'Enseignants',     icon: Users },
  { to: '/super/students',     label: 'Apprenants',      icon: GraduationCap },
  { to: '/super/subjects',     label: 'Matières',        icon: BookOpen },
  { to: '/super/access-codes', label: 'Codes d\'accès',  icon: KeyRound },
  { to: '/super/logs',         label: 'Activités',       icon: Activity },
];

export default function AdminSidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar : fixe à gauche, full height, always visible on md+ */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64
          bg-gradient-to-b from-indigo-900 to-purple-900 text-white
          flex flex-col
          transition-transform duration-200
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header / logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
            🎓
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">EduTech</h1>
            <p className="text-xs text-indigo-200">Admin Panel</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/super'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                    ? 'bg-white/15 text-white'
                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`
              }
            >
              <l.icon className="w-5 h-5 shrink-0" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* User card + logout */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-semibold shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-indigo-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                       bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
