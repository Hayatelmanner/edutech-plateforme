// frontend/src/pages/student/StudentProgress.jsx (NEW v3)
// Overview of student's progression across all unlocked subjects.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, BookOpen, Trophy } from 'lucide-react';
import api from '../../services/api';
import { LEVEL_LABEL } from '../../utils/constants';

export default function StudentProgress() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get('/student/progress').then(r => setData(r.data)).catch(() => {});
  }, []);

  // Global stats — cap completed at total to never exceed 100%
  const totalItems = data.reduce((s, x) => s + (x.total_items || 0), 0);
  const completedItems = data.reduce(
    (s, x) => s + Math.min(x.completed_items || 0, x.total_items || 0),
    0
  );
  const globalPct = totalItems > 0
    ? Math.min(100, Math.round((completedItems / totalItems) * 100))
    : 0;
  const completedSubjects = data.filter(x =>
    x.total_items > 0 && x.completed_items >= x.total_items
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/student" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" /> Ma progression
        </h1>
        <p className="text-slate-500 text-sm mt-1">Suivez votre avancement dans toutes vos matières</p>
      </div>

      {/* Global stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <BookOpen className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">{data.length}</p>
          <p className="text-sm text-slate-500">Matières débloquées</p>
        </div>
        <div className="card text-center">
          <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">{completedSubjects}</p>
          <p className="text-sm text-slate-500">Matières complétées</p>
        </div>
        <div className="card text-center">
          <BarChart3 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-slate-800">{globalPct}%</p>
          <p className="text-sm text-slate-500">Progression globale</p>
        </div>
      </div>

      {/* Per-subject progress */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Détail par matière</h2>
        {data.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-400 text-sm">Vous n'avez débloqué aucune matière pour l'instant.</p>
            <Link to="/student" className="btn-primary mt-3 inline-flex">Retour au tableau de bord</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((s, idx) => {
              // Cap completed_items at total_items so % never exceeds 100
              const completed = Math.min(s.completed_items || 0, s.total_items || 0);
              const pct = s.total_items > 0
                ? Math.min(100, Math.round((completed / s.total_items) * 100))
                : 0;
              const done = pct === 100 && s.total_items > 0;

              return (
                <motion.div key={s.subject_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card-hover">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-800 flex-1">{s.subject_title}</h3>
                    <span className="badge-purple">{LEVEL_LABEL[s.level]}</span>
                    {done && <span className="badge-green">✓ Complété</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                    <span>📚 {s.total_modules} modules</span>
                    <span>·</span>
                    <span>{completed} / {s.total_items} items complétés</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${
                        done
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                    />
                  </div>
                  <div className="text-right text-xs text-slate-500 mt-1 font-medium">{pct}%</div>
                  <Link to={`/student/subjects/${s.subject_id}/modules`}
                    className="btn-sm btn-secondary mt-3">
                    Continuer →
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
