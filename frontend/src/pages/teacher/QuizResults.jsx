// frontend/src/pages/teacher/QuizResults.jsx (v4)
// Page de résultats d'un quiz :
//   - Stats globales (apprenants uniques, tentatives, moyenne, taux de réussite)
//   - Tableau des apprenants ayant passé le quiz
//   - Lien vers l'historique d'un apprenant en particulier
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Target, TrendingUp, CheckCircle2,
  ChevronRight, Edit2, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

export default function QuizResults() {
  const { quizId } = useParams();
  const [data, setData] = useState(null);     // { stats, students }
  const [quiz, setQuiz] = useState(null);     // full quiz metadata
  const [error, setError] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [attempts, setAttempts] = useState({});  // studentId -> attempts[]

  useEffect(() => {
    async function load() {
      try {
        const [r1, r2] = await Promise.all([
          api.get(`/quiz/teacher/quizzes/${quizId}/results`),
          api.get(`/quiz/teacher/quizzes/${quizId}`),
        ]);
        setData(r1.data);
        setQuiz(r2.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur');
      }
    }
    load();
  }, [quizId]);

  async function toggleStudent(studentId) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      return;
    }
    setExpandedStudent(studentId);
    if (!attempts[studentId]) {
      try {
        const r = await api.get(`/quiz/teacher/quizzes/${quizId}/students/${studentId}/attempts`);
        setAttempts(prev => ({ ...prev, [studentId]: r.data }));
      } catch { /* silent */ }
    }
  }

  if (error) return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
    </div>
  );
  if (!data || !quiz) return (
    <div className="max-w-7xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>
  );

  const stats = data.stats;
  const students = data.students || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/teacher/modules/${quiz.module_id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour au module
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-slate-500">Résultats du quiz</p>
          <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-slate-600 text-sm mt-1">{quiz.description}</p>
          )}
        </div>
        <Link to={`/teacher/quizzes/${quizId}/edit`} className="btn-secondary">
          <Edit2 className="w-4 h-4" /> Modifier
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users} color="indigo"
          label="Apprenants"
          value={stats.unique_students}
          sub="ont passé le quiz" />
        <StatCard
          icon={Target} color="purple"
          label="Tentatives"
          value={stats.total_attempts}
          sub="au total" />
        <StatCard
          icon={TrendingUp} color="amber"
          label="Score moyen"
          value={`${stats.average_percentage}%`}
          sub={`seuil : ${quiz.pass_score}%`} />
        <StatCard
          icon={CheckCircle2} color="emerald"
          label="Taux de réussite"
          value={`${stats.success_rate}%`}
          sub={`${stats.passed_count} apprenants validés`} />
      </div>

      {/* Students table */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-3">Apprenants</h2>
        {students.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">
            Aucun apprenant n'a encore passé ce quiz
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Apprenant</th>
                  <th className="text-center px-2 py-2 font-medium">Tentatives</th>
                  <th className="text-center px-2 py-2 font-medium">Dernier score</th>
                  <th className="text-center px-2 py-2 font-medium">Meilleur score</th>
                  <th className="text-center px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => {
                  const expanded = expandedStudent === s.student_id;
                  const sa = attempts[s.student_id] || [];
                  const lastPct = s.latest_percentage != null ? Number(s.latest_percentage) : 0;
                  const bestPct = s.best_percentage != null ? Number(s.best_percentage) : 0;
                  return (
                    <>
                      <tr key={s.student_id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleStudent(s.student_id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{s.full_name}</p>
                          <p className="text-xs text-slate-500">{s.email}</p>
                          {s.level && <p className="text-xs text-slate-400">{s.level}</p>}
                        </td>
                        <td className="text-center px-2 py-3">
                          <span className="badge-indigo">{s.attempts_count}</span>
                        </td>
                        <td className="text-center px-2 py-3 font-medium">
                          {lastPct.toFixed(1)}%
                        </td>
                        <td className="text-center px-2 py-3 font-medium text-indigo-700">
                          {bestPct.toFixed(1)}%
                        </td>
                        <td className="text-center px-2 py-3">
                          {s.latest_passed
                            ? <span className="badge-green">Réussi</span>
                            : <span className="badge-red">Échec</span>}
                        </td>
                        <td className="text-right px-2 py-3">
                          <ChevronRight className={`w-4 h-4 text-slate-400 inline-block transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {expanded && (
                        <motion.tr
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          key={`${s.student_id}-detail`}>
                          <td colSpan={6} className="bg-slate-50 px-4 py-3">
                            {sa.length === 0 ? (
                              <p className="text-xs text-slate-500">Chargement...</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-600 uppercase">
                                  Historique des tentatives
                                </p>
                                {sa.map((a, idx) => (
                                  <div key={a.id} className="bg-white rounded-lg p-2 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-slate-400">#{sa.length - idx}</span>
                                      <span className="text-slate-700">
                                        {new Date(a.submitted_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium">
                                        {a.score}/{a.max_score}
                                      </span>
                                      <span className={`font-semibold ${
                                        a.passed ? 'text-emerald-600' : 'text-red-600'
                                      }`}>
                                        {Number(a.percentage).toFixed(1)}%
                                      </span>
                                      {a.time_spent_seconds && (
                                        <span className="text-slate-400">
                                          ⏱ {formatTime(a.time_spent_seconds)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }) {
  const colors = {
    indigo:  'from-indigo-500 to-indigo-600 text-indigo-600 bg-indigo-50',
    purple:  'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
    amber:   'from-amber-500 to-amber-600 text-amber-600 bg-amber-50',
    emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50',
  }[color];
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <span className={`w-8 h-8 rounded-lg ${colors.split(' ').slice(2).join(' ')} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}
