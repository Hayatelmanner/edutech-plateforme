// frontend/src/pages/teacher/ModuleDetail.jsx (NEW v3)
// Manage all content of a module:
//   - Resources (8 types) — upload PDF or fill URL/HTML
//   - Quizzes (build + delete)
//   - Projects (statement + view submissions)
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, X, ArrowLeft, ExternalLink, FileText,
  HelpCircle, Briefcase, Eye, EyeOff, Download, Edit2, BarChart3, AlertCircle,
} from 'lucide-react';
import api, { FILES_URL } from '../../services/api';
import { RESOURCE_TYPES, badgeClassFor } from '../../utils/constants';

export default function ModuleDetail() {
  const { id } = useParams(); // module id
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Resource creation form state
  const [resOpen, setResOpen] = useState(false);
  const [resForm, setResForm] = useState({
    type: 'pdf_course', title: '', url: '', content_html: '', file: null, part_id: '',
  });
  // v6 : for summary type, user picks 'pdf' or 'html'
  const [summaryMode, setSummaryMode] = useState('html');

  // v3.3 : Part creation/edit
  const [partOpen, setPartOpen] = useState(false);
  const [partForm, setPartForm] = useState({ title: '', description: '' });
  const [partEditId, setPartEditId] = useState(null);

  // Project creation form state
  const [projOpen, setProjOpen] = useState(false);
  const [projForm, setProjForm] = useState({ title: '', description: '', deadline: '', part_id: '' });

  // Submissions modal
  const [viewingSubs, setViewingSubs] = useState(null);

  async function load() {
    try {
      const r = await api.get(`/teacher/modules/${id}`);
      setData(r.data);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, [id]);

  // ============== Resource form handlers ==============
  function resetResForm() {
    setResForm({ type: 'pdf_course', title: '', url: '', content_html: '', file: null, part_id: '' });
  }

  async function handleResSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (!resForm.part_id) { setMsg({ type: 'error', text: 'Choisissez une partie' }); return; }
    try {
      const meta = RESOURCE_TYPES[resForm.type];
      const fd = new FormData();
      fd.append('type', resForm.type);
      fd.append('title', resForm.title);
      if (resForm.part_id) fd.append('part_id', resForm.part_id);
      // Add the right field depending on type
      if (meta.needs === 'pdf') {
        if (!resForm.file) {
          setMsg({ type: 'error', text: 'Fichier PDF requis' });
          return;
        }
        fd.append('file', resForm.file);
      } else if (meta.needs === 'url') {
        fd.append('url', resForm.url);
      } else if (meta.needs === 'html') {
        fd.append('content_html', resForm.content_html);
      } else if (meta.needs === 'pdf_or_html') {
        // v6 : summary — picks one of two modes
        if (summaryMode === 'pdf') {
          if (!resForm.file) {
            setMsg({ type: 'error', text: 'Fichier PDF requis' });
            return;
          }
          fd.append('file', resForm.file);
        } else {
          if (!resForm.content_html) {
            setMsg({ type: 'error', text: 'Contenu requis' });
            return;
          }
          fd.append('content_html', resForm.content_html);
        }
      } else if (meta.needs === 'url_or_html') {
        if (resForm.url) fd.append('url', resForm.url);
        if (resForm.content_html) fd.append('content_html', resForm.content_html);
      }
      await api.post(`/teacher/modules/${id}/resources`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg({ type: 'success', text: 'Ressource ajoutée' });
      setResOpen(false);
      resetResForm();
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function deleteResource(rid) {
    if (!confirm('Supprimer cette ressource ?')) return;
    await api.delete(`/teacher/resources/${rid}`);
    load();
  }

  // v3.2 : show/hide a resource to students
  async function toggleResourceVisibility(r) {
    try {
      await api.patch(`/teacher/resources/${r.id}/visibility`, { visible: r.visible ? 0 : 1 });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  // ============== v3.3 : Parts handlers ==============
  function startCreatePart() {
    setPartEditId(null);
    setPartForm({ title: '', description: '' });
    setPartOpen(true);
  }
  function startEditPart(p) {
    setPartEditId(p.id);
    setPartForm({ title: p.title, description: p.description || '' });
    setPartOpen(true);
  }
  async function handlePartSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (partEditId) {
        await api.put(`/teacher/parts/${partEditId}`, partForm);
        setMsg({ type: 'success', text: 'Partie mise à jour' });
      } else {
        await api.post(`/teacher/modules/${id}/parts`, partForm);
        setMsg({ type: 'success', text: 'Partie créée' });
      }
      setPartOpen(false);
      setPartEditId(null);
      setPartForm({ title: '', description: '' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }
  async function deletePart(pid) {
    if (!confirm('Supprimer cette partie ? Les ressources resteront dans le module mais ne seront plus rattachées à une partie.')) return;
    try {
      await api.delete(`/teacher/parts/${pid}`);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }
  async function togglePartVisibility(p) {
    try {
      await api.patch(`/teacher/parts/${p.id}/visibility`, { visible: p.visible ? 0 : 1 });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  // ============== Project handlers ==============
  async function handleProjSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (!projForm.part_id) { setMsg({ type: 'error', text: 'Choisissez une partie' }); return; }
    try {
      await api.post(`/teacher/modules/${id}/projects`, projForm);
      setProjOpen(false);
      setProjForm({ title: '', description: '', deadline: '', part_id: '' });
      setMsg({ type: 'success', text: 'Projet créé' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function deleteProject(pid) {
    if (!confirm('Supprimer ce projet et tous les dépôts associés ?')) return;
    await api.delete(`/teacher/projects/${pid}`);
    load();
  }

  async function viewSubmissions(p) {
    try {
      const r = await api.get(`/teacher/projects/${p.id}/submissions`);
      setViewingSubs({ project: p, submissions: r.data });
    } catch { /* silent */ }
  }

  // ============== Quiz delete ==============
  async function deleteQuiz(qid) {
    if (!confirm('Supprimer ce quiz ?')) return;
    await api.delete(`/quiz/teacher/quizzes/${qid}`);
    load();
  }

  if (!data) {
    return <div className="max-w-7xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>;
  }

  const meta = RESOURCE_TYPES[resForm.type];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/teacher/subjects/${data.subject_id}/modules`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour aux modules
      </Link>

      <div>
        <p className="text-sm text-slate-500">Module {data.order_index}</p>
        <h1 className="text-2xl font-bold text-slate-800">{data.title}</h1>
        {data.description && <p className="text-slate-600 mt-1">{data.description}</p>}
      </div>

      {msg.text && <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>}

      {/* ========== PARTS MANAGEMENT (always visible) ========== */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-slate-800">Parties du module</h3>
            <p className="text-xs text-slate-500">Une partie regroupe ressources, quiz et projets autour d'un thème (ex : "Vocabulaire de base")</p>
          </div>
          {!partOpen && (
            <button onClick={startCreatePart} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Nouvelle partie
            </button>
          )}
        </div>

        {partOpen && (
          <form onSubmit={handlePartSubmit} className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
            <div>
              <label className="label text-xs">Titre de la partie</label>
              <input className="input" required
                placeholder="ex : Vocabulaire de base"
                value={partForm.title}
                onChange={e => setPartForm({ ...partForm, title: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">Description (optionnelle)</label>
              <textarea className="input" rows={2}
                value={partForm.description}
                onChange={e => setPartForm({ ...partForm, description: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary btn-sm">{partEditId ? 'Mettre à jour' : 'Créer'}</button>
              <button type="button" className="btn-secondary btn-sm"
                onClick={() => { setPartOpen(false); setPartEditId(null); setPartForm({ title: '', description: '' }); }}>
                Annuler
              </button>
            </div>
          </form>
        )}

        {(!data.parts || data.parts.length === 0) && !partOpen && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-1">
                  Créez d'abord une partie
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  Avant d'ajouter une ressource, un quiz ou un projet, vous devez créer
                  au moins une <strong>partie</strong>. Une partie est une section du module
                  qui regroupe le contenu autour d'un thème.
                </p>
                <button onClick={startCreatePart} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Créer ma première partie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== ADD CONTENT BUTTONS (require parts to exist) ========== */}
      {data.parts && data.parts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {!resOpen && (
            <button onClick={() => setResOpen(true)} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Ajouter une ressource
            </button>
          )}
          <Link to={`/teacher/modules/${id}/quiz/new`} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" /> Nouveau quiz
          </Link>
          {!projOpen && (
            <button onClick={() => setProjOpen(true)} className="btn-secondary btn-sm">
              <Plus className="w-4 h-4" /> Nouveau projet
            </button>
          )}
        </div>
      )}

      {/* ========== RESOURCE FORM ========== */}
      {resOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Nouvelle ressource</h3>
            <button onClick={() => { setResOpen(false); resetResForm(); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleResSubmit} className="space-y-4">
            {/* Type picker */}
            <div>
              <label className="label">Type de ressource</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(RESOURCE_TYPES).map(([key, t]) => (
                  <button key={key} type="button"
                    onClick={() => setResForm({ ...resForm, type: key })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      resForm.type === key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <t.icon className={`w-5 h-5 mb-1 ${
                      resForm.type === key ? 'text-indigo-600' : 'text-slate-500'
                    }`} />
                    <p className="text-xs font-medium">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Titre</label>
              <input className="input" required value={resForm.title}
                onChange={e => setResForm({ ...resForm, title: e.target.value })} />
            </div>

            {/* Mandatory part selector */}
            <div>
              <label className="label">Partie <span className="text-red-500">*</span></label>
              <select className="input" required value={resForm.part_id}
                onChange={e => setResForm({ ...resForm, part_id: e.target.value })}>
                <option value="">— Choisir une partie —</option>
                {data.parts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Dynamic fields based on type */}
            {meta.needs === 'pdf' && (
              <div>
                <label className="label">Fichier PDF</label>
                <input type="file" accept="application/pdf" required className="input"
                  onChange={e => setResForm({ ...resForm, file: e.target.files[0] })} />
              </div>
            )}
            {meta.needs === 'url' && (
              <div>
                <label className="label">URL (YouTube, Drive, etc.)</label>
                <input type="url" className="input" required placeholder="https://..."
                  value={resForm.url}
                  onChange={e => setResForm({ ...resForm, url: e.target.value })} />
              </div>
            )}
            {meta.needs === 'html' && (
              <div>
                <label className="label">Contenu du résumé</label>
                <textarea className="input" rows={6} required placeholder="Texte ou HTML..."
                  value={resForm.content_html}
                  onChange={e => setResForm({ ...resForm, content_html: e.target.value })} />
              </div>
            )}
            {meta.needs === 'pdf_or_html' && (
              <>
                <div>
                  <label className="label">Format du résumé</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => setSummaryMode('html')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        summaryMode === 'html'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <p className="text-sm font-medium">📝 Texte / HTML</p>
                      <p className="text-xs text-slate-500">Écrire directement le résumé</p>
                    </button>
                    <button type="button"
                      onClick={() => setSummaryMode('pdf')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        summaryMode === 'pdf'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <p className="text-sm font-medium">📄 Fichier PDF</p>
                      <p className="text-xs text-slate-500">Importer un résumé en PDF</p>
                    </button>
                  </div>
                </div>
                {summaryMode === 'html' ? (
                  <div>
                    <label className="label">Contenu du résumé</label>
                    <textarea className="input" rows={6} required placeholder="Texte ou HTML..."
                      value={resForm.content_html}
                      onChange={e => setResForm({ ...resForm, content_html: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <label className="label">Fichier PDF</label>
                    <input type="file" accept="application/pdf" required className="input"
                      onChange={e => setResForm({ ...resForm, file: e.target.files[0] })} />
                  </div>
                )}
              </>
            )}
            {meta.needs === 'url_or_html' && (
              <>
                <div>
                  <label className="label">URL (optionnelle)</label>
                  <input type="url" className="input" placeholder="https://www.geogebra.org/..."
                    value={resForm.url}
                    onChange={e => setResForm({ ...resForm, url: e.target.value })} />
                </div>
                <div>
                  <label className="label">OU contenu HTML (optionnel)</label>
                  <textarea className="input" rows={4} placeholder="<iframe ...></iframe>"
                    value={resForm.content_html}
                    onChange={e => setResForm({ ...resForm, content_html: e.target.value })} />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button className="btn-primary">Ajouter</button>
              <button type="button" onClick={() => { setResOpen(false); resetResForm(); }} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ========== PROJECT FORM ========== */}
      {projOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Nouveau mini-projet</h3>
            <button onClick={() => setProjOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleProjSubmit} className="space-y-4">
            <div>
              <label className="label">Partie <span className="text-red-500">*</span></label>
              <select className="input" required value={projForm.part_id}
                onChange={e => setProjForm({ ...projForm, part_id: e.target.value })}>
                <option value="">— Choisir une partie —</option>
                {data.parts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Titre</label>
              <input className="input" required value={projForm.title}
                onChange={e => setProjForm({ ...projForm, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Description / Énoncé</label>
              <textarea className="input" rows={4} value={projForm.description}
                onChange={e => setProjForm({ ...projForm, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Date limite (optionnelle)</label>
              <input type="date" className="input" value={projForm.deadline}
                onChange={e => setProjForm({ ...projForm, deadline: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary">Créer</button>
              <button type="button" onClick={() => setProjOpen(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ========== CONTENT GROUPED BY PART ========== */}
      {data.parts && data.parts.length > 0 && data.parts.map(part => {
        const partResources = data.resources.filter(r => r.part_id === part.id);
        const partQuizzes   = data.quizzes.filter(q => q.part_id === part.id);
        const partProjects  = data.projects.filter(p => p.part_id === part.id);
        const total = partResources.length + partQuizzes.length + partProjects.length;

        return (
          <div key={part.id}
            className={`card space-y-3 ${part.visible ? '' : 'opacity-60 border-l-4 border-amber-400'}`}>

            {/* Part header */}
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {part.order_index}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{part.title}</h3>
                    {!part.visible && (
                      <span className="badge-yellow flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Caché
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {total} item{total > 1 ? 's' : ''}
                    </span>
                  </div>
                  {part.description && (
                    <p className="text-xs text-slate-500 mt-1">{part.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => togglePartVisibility(part)} className="btn-sm btn-secondary"
                  title={part.visible ? 'Cacher la partie' : 'Rendre visible'}>
                  {part.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => startEditPart(part)} className="btn-sm btn-secondary" title="Modifier">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePart(part.id)} className="btn-sm btn-danger" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {total === 0 && (
              <p className="text-sm text-slate-400 italic py-2">
                Aucun contenu dans cette partie. Utilisez les boutons ci-dessus pour en ajouter.
              </p>
            )}

            {/* Resources */}
            {partResources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Ressources ({partResources.length})
                </h4>
                {partResources.map(r => {
                  const t = RESOURCE_TYPES[r.type] || RESOURCE_TYPES.pdf_course;
                  return (
                    <div key={r.id}
                      className={`bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-2 ${r.visible ? '' : 'opacity-60'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-7 h-7 rounded ${badgeClassFor(t.color)} flex items-center justify-center shrink-0`}>
                          <t.icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                            {!r.visible && <span className="badge-yellow text-xs">Caché</span>}
                          </div>
                          <p className="text-xs text-slate-500">{t.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {r.file_path && (
                          <a href={`${FILES_URL}/${r.file_path}`} target="_blank" rel="noreferrer"
                            className="btn-sm btn-secondary" title="Ouvrir le PDF">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noreferrer"
                            className="btn-sm btn-secondary" title="Ouvrir le lien">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => toggleResourceVisibility(r)} className="btn-sm btn-secondary"
                          title={r.visible ? 'Cacher' : 'Afficher'}>
                          {r.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteResource(r.id)} className="btn-sm btn-danger" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quizzes */}
            {partQuizzes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Quiz ({partQuizzes.length})
                </h4>
                {partQuizzes.map(q => (
                  <div key={q.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                      <p className="text-sm font-medium text-slate-800 truncate">{q.title}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Link to={`/teacher/quizzes/${q.id}/results`} className="btn-sm btn-secondary" title="Résultats">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Link>
                      <Link to={`/teacher/quizzes/${q.id}/edit`} className="btn-sm btn-secondary" title="Modifier">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => deleteQuiz(q.id)} className="btn-sm btn-danger" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {partProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Mini-projets ({partProjects.length})
                </h4>
                {partProjects.map(p => (
                  <div key={p.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Briefcase className="w-3.5 h-3.5" />
                        </span>
                        <p className="text-sm font-medium text-slate-800">{p.title}</p>
                        {p.deadline && (
                          <span className="badge-yellow text-xs">📅 {new Date(p.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => viewSubmissions(p)} className="btn-sm btn-secondary">
                          <Eye className="w-3.5 h-3.5" /> Dépôts
                        </button>
                        <button onClick={() => deleteProject(p.id)} className="btn-sm btn-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-600 ml-9 whitespace-pre-line">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ========== Submissions modal ========== */}
      {viewingSubs && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Dépôts d'apprenants</h3>
                <p className="text-sm text-slate-500">{viewingSubs.project.title}</p>
              </div>
              <button onClick={() => setViewingSubs(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {viewingSubs.submissions.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">Aucun dépôt pour l'instant</p>
            ) : (
              <div className="space-y-2">
                {viewingSubs.submissions.map(s => (
                  <div key={s.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{s.student_name}</p>
                        <p className="text-xs text-slate-500">{s.student_email}</p>
                      </div>
                      <a href={`${FILES_URL}/${s.file_path}`} target="_blank" rel="noreferrer"
                        className="btn-sm btn-primary">
                        <Download className="w-3.5 h-3.5" /> Télécharger
                      </a>
                    </div>
                    <p className="text-xs text-slate-400">
                      Déposé le {new Date(s.submitted_at).toLocaleString()}
                    </p>
                    {s.note && (
                      <p className="text-xs text-slate-600 mt-2 p-2 bg-white rounded">📝 {s.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
