// frontend/src/pages/student/StudentQuizHistory.jsx (v4)
// Liste de toutes les tentatives de l'apprenant sur un quiz.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Trophy,
  AlertCircle, Eye, History,
} from 'lucide-react';
import api from '../../services/api';

export default function StudentQuizHistory() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [q, h] = await Promise.all([
          api.get(`/quiz/student/quizzes/${quizId}`),
          api.get(`/quiz/student/quizzes/${quizId}/history`),
        ]);
        setQuiz(q.data);
        setAttempts(h.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur');
      }
    }
    load();
  }, [quizId]);

  if (error) return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
    </div>
  );
  if (!quiz) return (
    <div className="max-w-3xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>
  );

  const bestPct = attempts.length > 0
    ? Math.max(...attempts.map(a => Number(a.percentage)))
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to={`/student/quizzes/${quizId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour au quiz
      </Link>

      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
        <p className="text-sm text-indigo-700">Historique des tentatives</p>
        <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 uppercase">Tentatives</p>
            <p className="text-xl font-bold text-slate-800">{attempts.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 uppercase">Meilleur</p>
            <p className="text-xl font-bold text-indigo-700">{bestPct.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 uppercase">Seuil</p>
            <p className="text-xl font-bold text-slate-800">{quiz.pass_score}%</p>
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="card text-center text-slate-400 py-8">
          <History className="w-8 h-8 mx-auto mb-2" />
          <p>Aucune tentative pour ce quiz</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attempts.map((a, idx) => {
            const passed = !!a.passed;
            const isBest = Number(a.percentage) === bestPct;
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`card !py-3 !px-4 ${isBest ? 'border-2 border-amber-400' : ''}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 text-sm">
                      #{attempts.length - idx}
                    </span>
                    {passed
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <XCircle className="w-5 h-5 text-red-500" />}
                    {isBest && <Trophy className="w-4 h-4 text-amber-500" />}
                    <div>
                      <p className="text-sm text-slate-700">
                        {new Date(a.submitted_at).toLocaleString()}
                      </p>
                      {a.time_spent_seconds && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(a.time_spent_seconds)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{a.score} / {a.max_score}</p>
                      <p className={`font-bold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Number(a.percentage).toFixed(1)}%
                      </p>
                    </div>
                    <Link to={`/student/quizzes/${quizId}/attempts/${a.id}`}
                      className="btn-sm btn-secondary">
                      <Eye className="w-3.5 h-3.5" /> Détails
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}
