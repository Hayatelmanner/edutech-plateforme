// frontend/src/components/Navbar.jsx
// Top navigation bar for public + non-admin pages.
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on admin pages (they use the sidebar layout)
  if (location.pathname.startsWith('/super')) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dashLink = user
    ? user.role === 'super' ? '/super' : user.role === 'teacher' ? '/teacher' : '/student'
    : null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">EduTech</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {!user && (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                  Connexion
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  Inscription
                </Link>
              </>
            )}
            {user && (
              <>
                <Link to={dashLink} className="hidden sm:block text-sm font-medium text-slate-600 hover:text-indigo-600">
                  Tableau de bord
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">
                    {user.full_name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
