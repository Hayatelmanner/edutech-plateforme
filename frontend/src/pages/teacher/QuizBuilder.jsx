// frontend/src/pages/teacher/QuizBuilder.jsx (v4)
// Création / édition d'un quiz avancé :
//   - Paramètres : durée, tentatives, seuil, correction visible, actif, display_mode
//   - 4 types de questions : QCM 1 bonne, QCM N bonnes, Vrai/Faux, réponse courte
//   - Image par question (URL ou upload)
//   - Réordonner les questions
//
// Usage :
//   /teacher/modules/:moduleId/quiz/new      -> mode création
//   /teacher/quizzes/:quizId/edit            -> mode édition
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, ArrowLeft, ArrowUp, ArrowDown,
  Image as ImgIcon, Upload, Save, AlertCircle, CheckCircle2,
  HelpCircle, ListChecks, ToggleLeft, Type,
} from 'lucide-react';
import api, { FILES_URL } from '../../services/api';

// --- Question type metadata ---
const Q_TYPES = {
  mcq_single:   { label: 'QCM — 1 bonne réponse',         icon: HelpCircle,  hint: 'Choix unique parmi plusieurs options' },
  mcq_multi:    { label: 'QCM — plusieurs bonnes',        icon: ListChecks,  hint: 'Plusieurs réponses correctes possibles' },
  true_false:   { label: 'Vrai / Faux',                   icon: ToggleLeft,  hint: 'Question binaire (vrai ou faux)' },
  short_answer: { label: 'Réponse courte',                icon: Type,        hint: 'L\'apprenant tape sa réponse (comparée au texte exact, insensible à la casse)' },
};

// Builders for empty data structures
function emptyOption(order) {
  return { text: '', is_correct: false, order_index: order };
}
function emptyQuestion(type = 'mcq_single', order = 0) {
  const base = {
    type,
    text: '',
    image_url: '',
    points: 1,
    feedback: '',
    order_index: order,
    options: [],
    correct_text: '',
  };
  if (type === 'mcq_single' || type === 'mcq_multi') {
    base.options = [emptyOption(0), emptyOption(1), emptyOption(2), emptyOption(3)];
  } else if (type === 'true_false') {
    base.options = [
      { text: 'Vrai', is_correct: false, order_index: 0 },
      { text: 'Faux', is_correct: false, order_index: 1 },
    ];
  }
  return base;
}

export default function QuizBuilder() {
  const { moduleId, quizId } = useParams(); // /teacher/modules/:moduleId/quiz/new OR /teacher/quizzes/:quizId/edit
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit');

  // Quiz-level settings
  const [settings, setSettings] = useState({
    title: '',
    description: '',
    part_id: '',
    duration_minutes: '',  // empty string = no limit
    max_attempts: '',      // empty string = unlimited
    pass_score: 50,
    show_correction: true,
    is_active: true,
    display_mode: 'one_by_one',
  });

  const [parts, setParts] = useState([]);
  const [questions, setQuestions] = useState([emptyQuestion('mcq_single', 0)]);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resolvedModuleId, setResolvedModuleId] = useState(moduleId || null);

  // Load parts (creation mode) or full quiz (edit mode)
  useEffect(() => {
    async function load() {
      try {
        if (isEditMode && quizId) {
          // Load existing quiz
          const r = await api.get(`/quiz/teacher/quizzes/${quizId}`);
          const q = r.data;
          setResolvedModuleId(q.module_id);
          setSettings({
            title: q.title || '',
            description: q.description || '',
            part_id: q.part_id || '',
            duration_minutes: q.duration_minutes ?? '',
            max_attempts: q.max_attempts ?? '',
            pass_score: q.pass_score ?? 50,
            show_correction: !!q.show_correction,
            is_active: !!q.is_active,
            display_mode: q.display_mode || 'one_by_one',
          });
          // Convert questions: ensure correct_text + options exist
          setQuestions((q.questions || []).map((qq, idx) => ({
            type: qq.type,
            text: qq.question || qq.text || '',
            image_url: qq.image_url || '',
            points: qq.points || 1,
            feedback: qq.feedback || '',
            order_index: qq.order_index ?? idx,
            options: (qq.options || []).map((o, i) => ({
              text: o.text, is_correct: !!o.is_correct, order_index: o.order_index ?? i,
            })),
            correct_text: qq.correct_text || '',
          })));
          // Load module's parts
          const m = await api.get(`/teacher/modules/${q.module_id}`);
          setParts(m.data.parts || []);
        } else if (moduleId) {
          const m = await api.get(`/teacher/modules/${moduleId}`);
          setParts(m.data.parts || []);
        }
      } catch (err) {
        setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur de chargement' });
      }
    }
    load();
  }, [isEditMode, quizId, moduleId]);

  // ============== Question handlers ==============
  function changeQuestionType(idx, newType) {
    const next = [...questions];
    next[idx] = { ...emptyQuestion(newType, next[idx].order_index), text: next[idx].text };
    setQuestions(next);
  }
  function updateQuestion(idx, patch) {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    setQuestions(next);
  }
  function updateOption(qIdx, oIdx, patch) {
    const next = [...questions];
    const opts = [...next[qIdx].options];
    opts[oIdx] = { ...opts[oIdx], ...patch };
    next[qIdx] = { ...next[qIdx], options: opts };
    setQuestions(next);
  }
  function addOption(qIdx) {
    const next = [...questions];
    next[qIdx].options.push(emptyOption(next[qIdx].options.length));
    setQuestions(next);
  }
  function removeOption(qIdx, oIdx) {
    const next = [...questions];
    if (next[qIdx].options.length <= 2) return; // need at least 2 options
    next[qIdx].options = next[qIdx].options.filter((_, i) => i !== oIdx);
    setQuestions(next);
  }
  function toggleSingleCorrect(qIdx, oIdx) {
    // For mcq_single + true_false : only one option can be correct
    const next = [...questions];
    next[qIdx].options = next[qIdx].options.map((o, i) => ({
      ...o, is_correct: i === oIdx,
    }));
    setQuestions(next);
  }
  function addQuestion() {
    setQuestions([...questions, emptyQuestion('mcq_single', questions.length)]);
  }
  function removeQuestion(idx) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  }
  function moveQuestion(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setQuestions(next.map((q, i) => ({ ...q, order_index: i })));
  }

  // ============== Image upload helper ==============
  // We piggy-back on the resource upload endpoint to store the file,
  // then keep the URL as a normal image_url field.
  async function handleImageUpload(qIdx, file) {
    if (!file) return;
    try {
      const fd = new FormData();
      // Upload via a generic endpoint is preferable, but we don't have one — so
      // we use a data URL fallback if the file is small, else error out.
      // (To keep things simple, we just read as data URL for now.)
      if (file.size > 500_000) {
        setMsg({ type: 'error', text: 'Image trop volumineuse (max ~500 Ko). Préférez une URL externe.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        updateQuestion(qIdx, { image_url: e.target.result });
      };
      reader.readAsDataURL(file);
    } catch {
      setMsg({ type: 'error', text: 'Erreur d\'upload' });
    }
  }

  // ============== Validation ==============
  function validate() {
    if (!settings.title.trim()) return 'Titre du quiz requis';
    if (!settings.part_id) return 'Partie requise';
    if (settings.pass_score < 0 || settings.pass_score > 100) return 'Seuil de réussite invalide (0-100)';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `Question ${i + 1} : énoncé manquant`;
      if (q.points < 1) return `Question ${i + 1} : points invalides`;
      if (q.type === 'short_answer') {
        if (!q.correct_text.trim()) return `Question ${i + 1} : réponse attendue manquante`;
      } else {
        if (!q.options || q.options.length < 2) return `Question ${i + 1} : au moins 2 options requises`;
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) return `Question ${i + 1}, option ${j + 1} : texte manquant`;
        }
        const correctCount = q.options.filter(o => o.is_correct).length;
        if (correctCount === 0) return `Question ${i + 1} : aucune bonne réponse sélectionnée`;
        if (q.type === 'mcq_single' || q.type === 'true_false') {
          if (correctCount > 1) return `Question ${i + 1} : une seule bonne réponse autorisée`;
        }
      }
    }
    return null;
  }

  // ============== Save ==============
  async function handleSave(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const error = validate();
    if (error) { setMsg({ type: 'error', text: error }); return; }

    setLoading(true);
    try {
      const payload = {
        module_id: resolvedModuleId,
        part_id: Number(settings.part_id),
        title: settings.title.trim(),
        description: settings.description.trim() || null,
        duration_minutes: settings.duration_minutes === '' ? null : Number(settings.duration_minutes),
        max_attempts: settings.max_attempts === '' ? null : Number(settings.max_attempts),
        pass_score: Number(settings.pass_score),
        show_correction: settings.show_correction,
        is_active: settings.is_active,
        display_mode: settings.display_mode,
        questions: questions.map((q, idx) => ({
          type: q.type,
          text: q.text.trim(),
          image_url: q.image_url || null,
          points: Number(q.points) || 1,
          feedback: q.feedback || null,
          order_index: idx,
          options: q.type !== 'short_answer'
            ? q.options.map((o, i) => ({
                text: o.text.trim(),
                is_correct: o.is_correct,
                order_index: i,
              }))
            : null,
          correct_text: q.type === 'short_answer' ? q.correct_text.trim() : null,
        })),
      };

      if (isEditMode) {
        await api.put(`/quiz/teacher/quizzes/${quizId}`, payload);
        setMsg({ type: 'success', text: 'Quiz mis à jour' });
      } else {
        const r = await api.post('/quiz/teacher/quizzes', payload);
        setMsg({ type: 'success', text: 'Quiz créé' });
        setTimeout(() => navigate(`/teacher/modules/${resolvedModuleId}`), 600);
        return;
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    } finally {
      setLoading(false);
    }
  }

  const backLink = resolvedModuleId
    ? `/teacher/modules/${resolvedModuleId}`
    : '/teacher';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={backLink}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour au module
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditMode ? 'Modifier le quiz' : 'Nouveau quiz'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Créez un quiz interactif avec plusieurs types de questions
        </p>
      </div>

      {msg.text && (
        <div className={`alert-${msg.type}`}>
          {msg.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ================ SETTINGS CARD ================ */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Paramètres du quiz</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre <span className="text-red-500">*</span></label>
              <input className="input" required
                value={settings.title}
                onChange={e => setSettings({ ...settings, title: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2}
                placeholder="Décrivez le but ou les consignes du quiz..."
                value={settings.description}
                onChange={e => setSettings({ ...settings, description: e.target.value })} />
            </div>

            <div>
              <label className="label">Partie <span className="text-red-500">*</span></label>
              <select className="input" required value={settings.part_id}
                onChange={e => setSettings({ ...settings, part_id: e.target.value })}>
                <option value="">— Choisir une partie —</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              {parts.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Créez d'abord une partie dans le module</p>
              )}
            </div>

            <div>
              <label className="label">Mode d'affichage</label>
              <select className="input" value={settings.display_mode}
                onChange={e => setSettings({ ...settings, display_mode: e.target.value })}>
                <option value="one_by_one">Une question à la fois</option>
                <option value="all_at_once">Toutes en même temps</option>
              </select>
            </div>

            <div>
              <label className="label">Durée limite (minutes)</label>
              <input type="number" min="1" className="input"
                placeholder="Pas de limite"
                value={settings.duration_minutes}
                onChange={e => setSettings({ ...settings, duration_minutes: e.target.value })} />
            </div>

            <div>
              <label className="label">Tentatives autorisées</label>
              <input type="number" min="1" className="input"
                placeholder="Illimité"
                value={settings.max_attempts}
                onChange={e => setSettings({ ...settings, max_attempts: e.target.value })} />
            </div>

            <div>
              <label className="label">Seuil de réussite (%)</label>
              <input type="number" min="0" max="100" className="input" required
                value={settings.pass_score}
                onChange={e => setSettings({ ...settings, pass_score: e.target.value })} />
            </div>

            <div className="flex items-center sm:items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={settings.show_correction}
                  onChange={e => setSettings({ ...settings, show_correction: e.target.checked })}
                  className="w-4 h-4" />
                <span className="text-sm">Afficher la correction</span>
              </label>
            </div>

            <div className="flex items-center sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={settings.is_active}
                  onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
                  className="w-4 h-4" />
                <span className="text-sm">Quiz actif (visible et passable par les apprenants)</span>
              </label>
            </div>
          </div>
        </div>

        {/* ================ QUESTIONS ================ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              Questions <span className="text-slate-400 text-sm">({questions.length})</span>
            </h2>
          </div>

          {questions.map((q, qIdx) => (
            <QuestionCard
              key={qIdx}
              q={q}
              index={qIdx}
              total={questions.length}
              onChangeType={(type) => changeQuestionType(qIdx, type)}
              onUpdate={(patch) => updateQuestion(qIdx, patch)}
              onUpdateOption={(oIdx, patch) => updateOption(qIdx, oIdx, patch)}
              onToggleSingle={(oIdx) => toggleSingleCorrect(qIdx, oIdx)}
              onAddOption={() => addOption(qIdx)}
              onRemoveOption={(oIdx) => removeOption(qIdx, oIdx)}
              onRemove={() => removeQuestion(qIdx)}
              onMoveUp={() => moveQuestion(qIdx, -1)}
              onMoveDown={() => moveQuestion(qIdx, 1)}
              onImageUpload={(file) => handleImageUpload(qIdx, file)}
            />
          ))}

          <button type="button" onClick={addQuestion} className="btn-secondary w-full">
            <Plus className="w-4 h-4" /> Ajouter une question
          </button>
        </div>

        {/* ================ SAVE ================ */}
        <div className="card flex justify-between items-center sticky bottom-4 shadow-lg">
          <p className="text-sm text-slate-500">
            {questions.length} question{questions.length > 1 ? 's' : ''} —
            {' '}{questions.reduce((s, q) => s + (Number(q.points) || 1), 0)} pts au total
          </p>
          <div className="flex gap-2">
            <Link to={backLink} className="btn-secondary">Annuler</Link>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" /> {loading ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer le quiz')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================
//  Sub-component : a single question card
// ============================================================
function QuestionCard({
  q, index, total,
  onChangeType, onUpdate, onUpdateOption, onToggleSingle,
  onAddOption, onRemoveOption, onRemove,
  onMoveUp, onMoveDown, onImageUpload,
}) {
  const TypeMeta = Q_TYPES[q.type];
  const isSingleCorrect = q.type === 'mcq_single' || q.type === 'true_false';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold">
            {index + 1}
          </span>
          <h3 className="font-medium text-slate-800">Question {index + 1}</h3>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="btn-sm btn-secondary disabled:opacity-30" title="Monter">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="btn-sm btn-secondary disabled:opacity-30" title="Descendre">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onRemove} disabled={total <= 1}
            className="btn-sm btn-danger disabled:opacity-30" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Type picker */}
      <div>
        <label className="label">Type de question</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(Q_TYPES).map(([key, t]) => (
            <button key={key} type="button"
              onClick={() => onChangeType(key)}
              className={`p-2 rounded-lg border-2 text-left transition-all ${
                q.type === key
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
              <t.icon className={`w-4 h-4 mb-1 ${
                q.type === key ? 'text-indigo-600' : 'text-slate-500'
              }`} />
              <p className="text-xs font-medium leading-tight">{t.label}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">{TypeMeta.hint}</p>
      </div>

      {/* Question text */}
      <div>
        <label className="label">Énoncé <span className="text-red-500">*</span></label>
        <textarea className="input" rows={2} required
          placeholder="Posez votre question..."
          value={q.text}
          onChange={e => onUpdate({ text: e.target.value })} />
      </div>

      {/* Image (URL or upload) */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="label flex items-center gap-1 text-xs">
            <ImgIcon className="w-3.5 h-3.5" /> Image (optionnelle)
          </label>
          <input type="text" className="input"
            placeholder="https://... (ou uploader ci-contre)"
            value={q.image_url}
            onChange={e => onUpdate({ image_url: e.target.value })} />
        </div>
        <div>
          <label className="label text-xs invisible">.</label>
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="text-xs">Upload</span>
            <input type="file" accept="image/*" hidden
              onChange={e => onImageUpload(e.target.files[0])} />
          </label>
        </div>
      </div>
      {q.image_url && (
        <div className="relative">
          <img src={q.image_url} alt="Aperçu" className="max-h-32 rounded-lg border" />
          <button type="button" onClick={() => onUpdate({ image_url: '' })}
            className="absolute top-1 right-1 btn-sm btn-danger">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Options (for non-short_answer types) */}
      {q.type !== 'short_answer' ? (
        <div>
          <label className="label">Réponses possibles</label>
          <div className="space-y-2">
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                {/* Correct toggle : radio for single, checkbox for multi */}
                {isSingleCorrect ? (
                  <input
                    type="radio"
                    name={`q-${index}-correct`}
                    checked={opt.is_correct}
                    onChange={() => onToggleSingle(oIdx)}
                    className="w-4 h-4 cursor-pointer"
                    title="Bonne réponse"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={opt.is_correct}
                    onChange={e => onUpdateOption(oIdx, { is_correct: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                    title="Bonne réponse"
                  />
                )}
                <input className="input flex-1"
                  placeholder={`Option ${oIdx + 1}`}
                  value={opt.text}
                  disabled={q.type === 'true_false'} /* labels fixed */
                  onChange={e => onUpdateOption(oIdx, { text: e.target.value })} />
                {q.type !== 'true_false' && q.options.length > 2 && (
                  <button type="button" onClick={() => onRemoveOption(oIdx)}
                    className="btn-sm btn-danger" title="Retirer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {q.type !== 'true_false' && (
            <button type="button" onClick={onAddOption} className="btn-sm btn-secondary mt-2">
              <Plus className="w-3.5 h-3.5" /> Ajouter une option
            </button>
          )}
        </div>
      ) : (
        /* short_answer */
        <div>
          <label className="label">
            Réponse attendue <span className="text-red-500">*</span>
          </label>
          <input className="input" required
            placeholder="Texte exact attendu (insensible à la casse)"
            value={q.correct_text}
            onChange={e => onUpdate({ correct_text: e.target.value })} />
          <p className="text-xs text-slate-500 mt-1">
            La réponse de l'apprenant doit correspondre exactement (les espaces et majuscules sont ignorés)
          </p>
        </div>
      )}

      {/* Points + Feedback */}
      <div className="grid sm:grid-cols-[120px_1fr] gap-3">
        <div>
          <label className="label">Points</label>
          <input type="number" min="1" className="input"
            value={q.points}
            onChange={e => onUpdate({ points: e.target.value })} />
        </div>
        <div>
          <label className="label">
            Feedback / explication <span className="text-slate-400 text-xs">(affiché après correction)</span>
          </label>
          <input className="input"
            placeholder="Pourquoi cette réponse est correcte..."
            value={q.feedback}
            onChange={e => onUpdate({ feedback: e.target.value })} />
        </div>
      </div>
    </motion.div>
  );
}
