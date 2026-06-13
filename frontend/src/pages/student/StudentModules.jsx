// frontend/src/pages/student/StudentModules.jsx (NEW v3)
// Lists modules of an unlocked subject with progress bar per module.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronRight, Layers } from 'lucide-react';
import api from '../../services/api';

export default function StudentModules() {
  const { id } = useParams();
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/student/subjects/${id}/modules`)
      .then(r => setModules(r.data))
      .catch(err => setError(err.response?.data?.message || 'Erreur'));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="alert-error"><span>{error}</span></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/student" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-600" />
          Modules de la matière
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cliquez sur un module pour accéder à son contenu.
        </p>
      </div>

      {modules.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          Aucun module disponible pour cette matière pour l'instant.
        </p>
      ) : (
        <div className="space-y-4">
          {modules.map((m, i) => {
            const totalItems = (m.resources_count || 0) + (m.quizzes_count || 0) + (m.projects_count || 0);
            // Defensive cap : completed cannot exceed totalItems even if backend returns stale data
            const completed  = Math.min(m.completed_count || 0, totalItems);
            const pct = totalItems > 0 ? Math.min(100, Math.round((completed / totalItems) * 100)) : 0;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/student/modules/${m.id}`}
                  className="card-hover block"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                      {m.order_index || i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{m.title}</h3>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                      {m.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{m.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-3">
                        <span>📚 {m.resources_count || 0} ressources</span>
                        <span>·</span>
                        <span>❓ {m.quizzes_count || 0} quiz</span>
                        <span>·</span>
                        <span>📁 {m.projects_count || 0} projets</span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 shrink-0">
                          {completed}/{totalItems} ({pct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
