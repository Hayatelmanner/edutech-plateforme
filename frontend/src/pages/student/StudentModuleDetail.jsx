// frontend/src/pages/student/StudentModuleDetail.jsx (NEW v3)
// Student opens a module: sees all resources/quizzes/projects + can submit project.
// Marks resources as completed when opened.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, Download, CheckCircle2, Circle,
  HelpCircle, Briefcase, Upload, FileCheck2, X,
} from 'lucide-react';
import api, { FILES_URL } from '../../services/api';
import { RESOURCE_TYPES, badgeClassFor } from '../../utils/constants';

export default function StudentModuleDetail() {
  const { id } = useParams(); // module id
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Project submission modal state
  const [submittingFor, setSubmittingFor] = useState(null);
  const [subFile, setSubFile] = useState(null);
  const [subNote, setSubNote] = useState('');
  const [subMsg, setSubMsg] = useState({ type: '', text: '' });

  async function load() {
    try {
      const r = await api.get(`/student/modules/${id}`);
      setData(r.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    }
  }
  useEffect(() => { load(); }, [id]);

  // Mark a resource as completed (opened)
  async function markResourceOpened(r) {
    if (r.completed) return;
    try {
      await api.post('/student/progress', {
        item_type: 'resource', item_id: r.id, module_id: Number(id),
      });
      load();
    } catch { /* silent */ }
  }

  // Submit project
  async function handleSubmitProject(e) {
    e.preventDefault();
    if (!subFile) { setSubMsg({ type: 'error', text: 'Fichier requis' }); return; }
    try {
      const fd = new FormData();
      fd.append('file', subFile);
      if (subNote) fd.append('note', subNote);
      await api.post(`/student/projects/${submittingFor.id}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmittingFor(null); setSubFile(null); setSubNote('');
      setSubMsg({ type: '', text: '' });
      load();
    } catch (err) {
      setSubMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  if (error) return <div className="max-w-7xl mx-auto p-8"><div className="alert-error">{error}</div></div>;
  if (!data) return <div className="max-w-7xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>;

  // Compute global progress (all visible items in this module)
  const totalItems = data.resources.length + data.quizzes.length + data.projects.length;
  const completedItems =
    data.resources.filter(r => r.completed).length +
    data.quizzes.filter(q => q.completed).length +
    data.projects.filter(p => p.completed).length;
  const pct = totalItems > 0 ? Math.min(100, Math.round((Math.min(completedItems, totalItems) / totalItems) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/student/subjects/${data.subject_id}/modules`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour aux modules
      </Link>

      {/* Module header + progress */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
        <p className="text-sm text-indigo-700 font-medium">Module {data.order_index}</p>
        <h1 className="text-2xl font-bold text-slate-800">{data.title}</h1>
        {data.description && <p className="text-slate-600 mt-1">{data.description}</p>}

        {totalItems > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-600">Progression du module</span>
              <span className="text-xs font-semibold text-indigo-700">
                {Math.min(completedItems, totalItems)} / {totalItems} ({pct}%)
              </span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ========== CONTENT GROUPED BY PART ========== */}
      {(!data.parts || data.parts.length === 0) && (
        <p className="text-slate-400 text-sm py-8 text-center">
          Ce module n'a pas encore de contenu.
        </p>
      )}

      {data.parts && data.parts.map(part => {
        const partResources = data.resources.filter(r => r.part_id === part.id);
        const partQuizzes   = data.quizzes.filter(q => q.part_id === part.id);
        const partProjects  = data.projects.filter(p => p.part_id === part.id);
        const total = partResources.length + partQuizzes.length + partProjects.length;
        if (total === 0) return null; // hide empty parts from students

        return (
          <motion.div key={part.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card space-y-4">

            {/* Part header */}
            <div className="flex items-start gap-3 pb-2 border-b border-slate-100">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {part.order_index}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800">{part.title}</h3>
                {part.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{part.description}</p>
                )}
              </div>
            </div>

            {/* Resources */}
            {partResources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  📚 Ressources
                </h4>
                {partResources.map(r => {
                  const t = RESOURCE_TYPES[r.type] || RESOURCE_TYPES.pdf_course;
                  return (
                    <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-lg ${badgeClassFor(t.color)} flex items-center justify-center shrink-0`}>
                          <t.icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{r.title}</p>
                          <p className="text-xs text-slate-500">{t.label}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.completed
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" title="Vu" />
                            : <Circle className="w-5 h-5 text-slate-300" />}
                          {r.file_path && (
                            <a href={`${FILES_URL}/${r.file_path}`} target="_blank" rel="noreferrer"
                              onClick={() => markResourceOpened(r)}
                              className="btn-sm btn-primary">
                              <Download className="w-3.5 h-3.5" /> Ouvrir
                            </a>
                          )}
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noreferrer"
                              onClick={() => markResourceOpened(r)}
                              className="btn-sm btn-primary">
                              <ExternalLink className="w-3.5 h-3.5" /> Voir
                            </a>
                          )}
                          {!r.file_path && !r.url && r.content_html && (
                            <button
                              onClick={() => {
                                markResourceOpened(r);
                                const win = window.open('', '_blank');
                                if (win) {
                                  win.document.write(`<!DOCTYPE html><html><head><title>${r.title}</title>
                                    <style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:1rem;}</style>
                                    </head><body><h1>${r.title}</h1>${r.content_html}</body></html>`);
                                }
                              }}
                              className="btn-sm btn-primary">
                              <ExternalLink className="w-3.5 h-3.5" /> Lire
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Inline content for summaries / interactive HTML */}
                      {(r.type === 'summary' || (r.type === 'interactive' && r.content_html && !r.url)) && r.content_html && (
                        <div className="ml-12 mt-3 p-3 rounded-lg bg-white text-sm text-slate-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: r.content_html }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quizzes */}
            {partQuizzes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  ❓ Quiz
                </h4>
                {partQuizzes.map(q => (
                  <div key={q.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{q.title}</p>
                        {q.completed && q.score !== null && (
                          <p className="text-xs text-emerald-600">
                            ✓ Score : {q.score} / {q.total}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link to={`/student/quizzes/${q.id}`} className="btn-sm btn-primary shrink-0">
                      {q.completed ? 'Refaire' : 'Démarrer'}
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {partProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  💼 Mini-projets
                </h4>
                {partProjects.map(p => (
                  <div key={p.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{p.title}</p>
                          {p.deadline && (
                            <p className="text-xs text-amber-700">📅 Échéance : {new Date(p.deadline).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSubmittingFor(p)}
                        className={p.completed ? 'btn-sm btn-secondary shrink-0' : 'btn-sm btn-primary shrink-0'}>
                        <Upload className="w-3.5 h-3.5" />
                        {p.completed ? 'Re-déposer' : 'Déposer'}
                      </button>
                    </div>
                    {p.description && (
                      <p className="text-sm text-slate-600 mt-2 ml-12 whitespace-pre-line">{p.description}</p>
                    )}
                    {p.submission && (
                      <div className="mt-2 ml-12 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded">
                        <FileCheck2 className="w-4 h-4" />
                        Déposé le {new Date(p.submission.submitted_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* ========== Submit project modal ========== */}
      {submittingFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Déposer mon travail</h3>
                <p className="text-sm text-slate-500">{submittingFor.title}</p>
              </div>
              <button onClick={() => { setSubmittingFor(null); setSubFile(null); setSubNote(''); }}
                className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {subMsg.text && <div className={`alert-${subMsg.type} mb-3`}><span>{subMsg.text}</span></div>}
            <form onSubmit={handleSubmitProject} className="space-y-3">
              <div>
                <label className="label">Fichier (PDF, ZIP, image)</label>
                <input type="file" required className="input"
                  onChange={e => setSubFile(e.target.files[0])} />
                <p className="text-xs text-slate-500 mt-1">Max 50 Mo</p>
              </div>
              <div>
                <label className="label">Note (optionnelle)</label>
                <textarea className="input" rows={3} value={subNote}
                  placeholder="Une remarque pour votre enseignant..."
                  onChange={e => setSubNote(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary">
                  <Upload className="w-4 h-4" /> Envoyer
                </button>
                <button type="button" className="btn-secondary"
                  onClick={() => { setSubmittingFor(null); setSubFile(null); setSubNote(''); }}>
                  Annuler
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
