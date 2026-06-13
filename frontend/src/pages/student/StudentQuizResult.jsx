// frontend/src/pages/student/StudentQuizResult.jsx (v4)
// Affiche le résultat détaillé d'une tentative.
// Si show_correction = 1 → affiche les bonnes réponses + feedback de chaque question
// Sinon → affiche juste le score global
import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Trophy,
  AlertCircle, History, Eye, EyeOff, MessageCircle,
} from 'lucide-react';
import api from '../../services/api';

export default function StudentQuizResult() {
  const { quizId, attemptId } = useParams();
  const location = useLocation();
  const autoSubmitted = location.state?.autoSubmitted;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get(`/quiz/student/attempts/${attemptId}`);
        setData(r.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur');
      }
    }
    load();
  }, [attemptId]);

  if (error) return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
    </div>
  );
  if (!data) return (
    <div className="max-w-3xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>
  );

  const { attempt, quiz, questions, show_correction } = data;
  const passed = !!attempt.passed;
  const pct = Number(attempt.percentage);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to={`/student/quizzes/${quizId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour au quiz
      </Link>

      {autoSubmitted && (
        <div className="alert-info">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <span>Tentative soumise automatiquement (temps écoulé)</span>
        </div>
      )}

      {/* ============== RESULT HEADER ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`card text-center ${
          passed
            ? 'bg-gradient-to-br from-emerald-50 to-green-50'
            : 'bg-gradient-to-br from-red-50 to-orange-50'
        }`}>
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
          passed ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {passed ? <Trophy className="w-8 h-8 text-white" /> : <XCircle className="w-8 h-8 text-white" />}
        </div>
        <h1 className={`text-3xl font-bold mt-3 ${passed ? 'text-emerald-700' : 'text-red-700'}`}>
          {passed ? 'Bravo !' : 'Pas encore...'}
        </h1>
        <p className="text-slate-600 mt-1">
          {passed ? 'Vous avez réussi le quiz' : `Seuil requis : ${quiz.pass_score}%`}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">Score</p>
            <p className="text-xl font-bold text-slate-800">
              {attempt.score} / {attempt.max_score}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">Pourcentage</p>
            <p className={`text-xl font-bold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
              {pct.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">Temps</p>
            <p className="text-xl font-bold text-slate-800">
              {attempt.time_spent_seconds ? formatTime(attempt.time_spent_seconds) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={`/student/quizzes/${quizId}`} className="btn-primary">
            Refaire le quiz
          </Link>
          <Link to={`/student/quizzes/${quizId}/history`} className="btn-secondary">
            <History className="w-4 h-4" /> Historique
          </Link>
        </div>
      </motion.div>

      {/* ============== CORRECTION (if allowed) ============== */}
      {show_correction ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Eye className="w-5 h-5" /> Correction détaillée
          </h2>
          {questions.map((q, idx) => (
            <QuestionReview key={q.id} question={q} index={idx} />
          ))}
        </div>
      ) : (
        <div className="card text-center text-slate-500">
          <EyeOff className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">
            La correction n'est pas affichée pour ce quiz.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  QuestionReview : show one question with student answer + correction
// ============================================================
function QuestionReview({ question, index }) {
  const a = question.student_answer || {};
  const isCorrect = !!a.is_correct;
  const isShortAnswer = question.type === 'short_answer';

  return (
    <div className={`card border-l-4 ${
      isCorrect ? 'border-emerald-500' : 'border-red-400'
    }`}>
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 whitespace-pre-wrap">{question.question}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>{question.points} pt{question.points > 1 ? 's' : ''}</span>
            <span>•</span>
            <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCorrect
                ? `✓ ${a.points_earned} pt${a.points_earned > 1 ? 's' : ''}`
                : '✗ 0 pt'}
            </span>
          </div>
        </div>
        {isCorrect
          ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          : <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
      </div>

      {question.image_url && (
        <img src={question.image_url} alt="Illustration"
          className="max-h-48 rounded-lg border mt-3 mx-auto" />
      )}

      {/* Answer review */}
      <div className="mt-3 space-y-2">
        {isShortAnswer ? (
          <>
            <div className={`p-2.5 rounded-lg ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-xs font-medium text-slate-600 mb-0.5">Votre réponse</p>
              <p className="font-medium text-slate-800">{a.text_answer || '(vide)'}</p>
            </div>
            {!isCorrect && question.correct_text && (
              <div className="p-2.5 rounded-lg bg-emerald-50">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Réponse attendue</p>
                <p className="font-medium text-emerald-800">{question.correct_text}</p>
              </div>
            )}
          </>
        ) : (
          (question.options || []).map(opt => {
            const selected = (a.selected_option_ids || []).includes(opt.id);
            const correct = !!opt.is_correct;
            let cls = 'border-slate-200 bg-white';
            let label = '';
            if (correct && selected) { cls = 'border-emerald-500 bg-emerald-50'; label = '✓ Bonne réponse choisie'; }
            else if (correct && !selected) { cls = 'border-emerald-500 bg-emerald-50'; label = 'Bonne réponse (non sélectionnée)'; }
            else if (!correct && selected) { cls = 'border-red-400 bg-red-50'; label = '✗ Mauvaise réponse'; }
            return (
              <div key={opt.id}
                className={`p-2.5 rounded-lg border-2 flex items-center justify-between gap-2 ${cls}`}>
                <span className="text-sm text-slate-800">{opt.text}</span>
                {label && (
                  <span className={`text-xs font-semibold shrink-0 ${
                    correct ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Feedback */}
      {question.feedback && (
        <div className="mt-3 p-3 bg-indigo-50 rounded-lg flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-900">{question.feedback}</p>
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
