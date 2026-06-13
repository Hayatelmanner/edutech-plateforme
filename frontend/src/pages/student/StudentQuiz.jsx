// frontend/src/pages/student/StudentQuiz.jsx (v4)
// L'apprenant passe un quiz.
// Comportement :
//   - Charge le quiz (sans bonnes réponses)
//   - Crée une tentative au démarrage (startAttempt)
//   - Affiche les questions selon display_mode :
//     * one_by_one : une à la fois, Next / Prev, timer global
//     * all_at_once : toutes en scroll vertical
//   - Timer auto-soumet à 0
//   - Soumet via submitAttempt et redirige vers /attempts/:attemptId
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock, Send,
  AlertCircle, CheckCircle2, History, Play,
} from 'lucide-react';
import api from '../../services/api';

export default function StudentQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});         // { questionId: { selected_option_ids: [], text_answer: '' } }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);     // seconds (null = no limit)
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);                  // prevent double-submit when timer hits 0

  // -------- Load quiz metadata --------
  useEffect(() => {
    async function load() {
      try {
        const r = await api.get(`/quiz/student/quizzes/${quizId}`);
        setQuiz(r.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur');
      }
    }
    load();
  }, [quizId]);

  // -------- Timer ticking --------
  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) {
      // Time's up : auto-submit
      if (!submittedRef.current) handleSubmit(true);
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [started, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Start the attempt --------
  async function handleStart() {
    setError('');
    try {
      const r = await api.post(`/quiz/student/quizzes/${quizId}/start`);
      setAttemptId(r.data.attempt_id);
      setStarted(true);
      // Initialize empty answers
      const init = {};
      for (const q of quiz.questions) {
        init[q.id] = { selected_option_ids: [], text_answer: '' };
      }
      setAnswers(init);
      // Start the timer if duration is set
      if (quiz.duration_minutes) {
        setTimeLeft(quiz.duration_minutes * 60);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    }
  }

  // -------- Answer updates --------
  function setSelectedOption(questionId, optionId, isMulti) {
    setAnswers(prev => {
      const cur = prev[questionId] || { selected_option_ids: [], text_answer: '' };
      if (isMulti) {
        // Toggle in/out of array
        const selected = cur.selected_option_ids.includes(optionId)
          ? cur.selected_option_ids.filter(id => id !== optionId)
          : [...cur.selected_option_ids, optionId];
        return { ...prev, [questionId]: { ...cur, selected_option_ids: selected } };
      } else {
        // Replace with single value
        return { ...prev, [questionId]: { ...cur, selected_option_ids: [optionId] } };
      }
    });
  }
  function setTextAnswer(questionId, text) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { selected_option_ids: [] }), text_answer: text },
    }));
  }

  // -------- Submit --------
  async function handleSubmit(isAuto = false) {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);

    // Build payload
    const payload = {
      answers: quiz.questions.map(q => ({
        question_id: q.id,
        selected_option_ids: answers[q.id]?.selected_option_ids || [],
        text_answer: answers[q.id]?.text_answer || '',
      })),
    };
    try {
      const r = await api.post(`/quiz/student/attempts/${attemptId}/submit`, payload);
      // Redirect to result page
      navigate(`/student/quizzes/${quizId}/attempts/${r.data.attempt_id}`,
        { state: { autoSubmitted: isAuto } });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(err.response?.data?.message || 'Erreur de soumission');
    }
  }

  // ============== RENDERS ==============
  if (error && !quiz) return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
    </div>
  );
  if (!quiz) return (
    <div className="max-w-3xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>
  );

  // ============== PRE-START SCREEN ==============
  if (!started) {
    const canStart = quiz.is_active !== 0 &&
      (quiz.max_attempts === null || quiz.attempts_left === null || quiz.attempts_left > 0);
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link to={`/student/modules/${quiz.module_id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="w-4 h-4" /> Retour au module
        </Link>

        <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
          <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>
          {quiz.description && <p className="text-slate-600 mt-2">{quiz.description}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <InfoTile label="Questions" value={quiz.questions.length} />
            <InfoTile label="Durée"
              value={quiz.duration_minutes ? `${quiz.duration_minutes} min` : '∞'} />
            <InfoTile label="Tentatives"
              value={quiz.max_attempts ? `${quiz.attempts_left}/${quiz.max_attempts}` : '∞'} />
            <InfoTile label="Seuil" value={`${quiz.pass_score}%`} />
          </div>

          {quiz.best_percentage !== null && (
            <div className="mt-4 p-3 bg-white rounded-lg flex items-center justify-between">
              <span className="text-sm text-slate-600">Votre meilleur score</span>
              <span className="font-bold text-indigo-700">{Number(quiz.best_percentage).toFixed(1)}%</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={handleStart} disabled={!canStart}
              className="btn-primary disabled:opacity-50">
              <Play className="w-4 h-4" />
              {quiz.attempts_count > 0 ? 'Nouvelle tentative' : 'Démarrer le quiz'}
            </button>
            {quiz.attempts_count > 0 && (
              <Link to={`/student/quizzes/${quizId}/history`} className="btn-secondary">
                <History className="w-4 h-4" /> Historique ({quiz.attempts_count})
              </Link>
            )}
          </div>

          {!canStart && (
            <p className="text-sm text-red-600 mt-3">
              {quiz.is_active === 0
                ? 'Ce quiz n\'est plus actif'
                : 'Vous avez atteint le nombre maximum de tentatives'}
            </p>
          )}
          {error && (
            <div className="alert-error mt-3">
              <AlertCircle className="w-5 h-5" /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="card bg-amber-50 border-amber-200 text-sm text-amber-900">
          <p className="font-semibold mb-1">ℹ️ Avant de commencer</p>
          <ul className="text-amber-800 space-y-1 list-disc list-inside">
            {quiz.duration_minutes && (
              <li>Le quiz est chronométré ({quiz.duration_minutes} min). Le temps démarre dès "Démarrer".</li>
            )}
            <li>
              Affichage : <strong>{quiz.display_mode === 'one_by_one' ? 'une question à la fois' : 'toutes les questions en même temps'}</strong>
            </li>
            <li>Votre tentative sera soumise automatiquement à la fin du temps.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ============== QUIZ IN PROGRESS ==============
  const answeredCount = quiz.questions.filter(q => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === 'short_answer') return !!(a.text_answer || '').trim();
    return (a.selected_option_ids || []).length > 0;
  }).length;
  const pct = Math.round((answeredCount / quiz.questions.length) * 100);

  const isOneByOne = quiz.display_mode === 'one_by_one';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Sticky header with timer + progress */}
      <div className="sticky top-2 z-10 card !p-3 bg-white/95 backdrop-blur shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Quiz en cours</p>
            <h2 className="font-semibold text-slate-800 truncate">{quiz.title}</h2>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${
              timeLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
            }`}>
              <Clock className="w-4 h-4" />
              {formatCountdown(timeLeft)}
            </div>
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">
              {isOneByOne
                ? `Question ${currentIdx + 1} / ${quiz.questions.length}`
                : `${answeredCount} / ${quiz.questions.length} répondues`}
            </span>
            <span className="text-xs font-semibold text-indigo-700">{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
      )}

      {/* Question(s) */}
      {isOneByOne ? (
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}>
            <QuestionView
              question={quiz.questions[currentIdx]}
              answer={answers[quiz.questions[currentIdx].id]}
              onSelectOption={setSelectedOption}
              onTextChange={setTextAnswer}
              index={currentIdx}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <QuestionView
              key={q.id}
              question={q}
              answer={answers[q.id]}
              onSelectOption={setSelectedOption}
              onTextChange={setTextAnswer}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Navigation / Submit */}
      <div className="card flex flex-wrap items-center justify-between gap-2">
        {isOneByOne ? (
          <>
            <button
              type="button"
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="btn-secondary disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {currentIdx < quiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(i => Math.min(quiz.questions.length - 1, i + 1))}
                className="btn-primary">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4" /> {submitting ? 'Envoi...' : 'Soumettre'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {answeredCount === quiz.questions.length
                ? '✓ Toutes les questions sont répondues'
                : `${quiz.questions.length - answeredCount} question(s) sans réponse`}
            </p>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-4 h-4" /> {submitting ? 'Envoi...' : 'Soumettre'}
            </button>
          </>
        )}
      </div>

      {/* Question pager (one_by_one only) */}
      {isOneByOne && quiz.questions.length > 1 && (
        <div className="card !p-2">
          <div className="flex flex-wrap gap-1">
            {quiz.questions.map((q, idx) => {
              const isAnswered = (() => {
                const a = answers[q.id];
                if (!a) return false;
                if (q.type === 'short_answer') return !!(a.text_answer || '').trim();
                return (a.selected_option_ids || []).length > 0;
              })();
              return (
                <button key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-8 h-8 rounded text-xs font-semibold transition-all ${
                    idx === currentIdx
                      ? 'bg-indigo-600 text-white'
                      : isAnswered
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  QuestionView : renders one question + its input(s)
// ============================================================
function QuestionView({ question, answer, onSelectOption, onTextChange, index }) {
  const isMulti = question.type === 'mcq_multi';
  const selectedIds = answer?.selected_option_ids || [];

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 whitespace-pre-wrap">{question.question || question.text}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {question.points} pt{question.points > 1 ? 's' : ''}
            {isMulti && ' · plusieurs réponses possibles'}
          </p>
        </div>
      </div>

      {question.image_url && (
        <img src={question.image_url} alt="Illustration"
          className="max-h-64 rounded-lg border mx-auto" />
      )}

      {/* Answer input depending on type */}
      {question.type === 'short_answer' ? (
        <input className="input" placeholder="Votre réponse..."
          value={answer?.text_answer || ''}
          onChange={e => onTextChange(question.id, e.target.value)} />
      ) : (
        <div className="space-y-2">
          {(question.options || []).map(opt => {
            const selected = selectedIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectOption(question.id, opt.id, isMulti)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <span className={`w-5 h-5 rounded ${isMulti ? '' : 'rounded-full'} border-2 flex items-center justify-center shrink-0 ${
                  selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}>
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className="flex-1 text-slate-800">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helpers
function InfoTile({ label, value }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
function formatCountdown(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
