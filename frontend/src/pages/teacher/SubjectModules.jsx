// frontend/src/pages/teacher/SubjectModules.jsx (NEW v3)
// Lists modules of a subject + create/edit/delete + jump to module detail.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ArrowLeft, ChevronRight, Layers, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const empty = { title: '', description: '', order_index: '' };

export default function SubjectModules() {
  const { id } = useParams(); // subject id
  const [subject, setSubject] = useState(null);
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  async function load() {
    try {
      const [allSubjects, mods] = await Promise.all([
        api.get('/teacher/subjects'),
        api.get(`/teacher/subjects/${id}/modules`),
      ]);
      setSubject(allSubjects.data.find(s => s.id === Number(id)));
      setModules(mods.data);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, [id]);

  function startCreate() { setEditId(null); setForm(empty); setShowForm(true); }
  function startEdit(m) {
    setEditId(m.id);
    setForm({ title: m.title, description: m.description || '', order_index: m.order_index });
    setShowForm(true);
  }
  function cancel() { setShowForm(false); setEditId(null); setForm(empty); }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/teacher/modules/${editId}`, form);
        setMsg({ type: 'success', text: 'Module mis à jour' });
      } else {
        await api.post(`/teacher/subjects/${id}/modules`, form);
        setMsg({ type: 'success', text: 'Module créé' });
      }
      cancel(); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function handleDelete(mid) {
    if (!confirm('Supprimer ce module et tout son contenu (ressources, quiz, projets) ?')) return;
    await api.delete(`/teacher/modules/${mid}`);
    load();
  }

  // v3.2 : show/hide a module to students
  async function toggleVisibility(m) {
    try {
      await api.patch(`/teacher/modules/${m.id}/visibility`, { visible: m.visible ? 0 : 1 });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  if (!subject) {
    return <div className="max-w-7xl mx-auto p-8"><p className="text-slate-500">Chargement...</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/teacher" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour à mes matières
      </Link>

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <p className="text-sm text-slate-500">Matière</p>
          <h1 className="text-2xl font-bold text-slate-800">{subject.title}</h1>
        </div>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau module
        </button>
      </div>

      {msg.text && <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>}

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editId ? 'Modifier' : 'Créer'} un module</h2>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre</label>
              <input className="input" required placeholder="ex: Module 1 - Généralités sur les systèmes informatiques"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Ordre</label>
              <input type="number" className="input" placeholder="auto"
                value={form.order_index}
                onChange={e => setForm({ ...form, order_index: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Description (optionnelle)</label>
              <textarea className="input" rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button className="btn-primary">{editId ? 'Mettre à jour' : 'Créer'}</button>
              <button type="button" onClick={cancel} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Modules list */}
      {modules.length === 0 ? (
        <div className="card text-center py-12">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">Aucun module pour cette matière</p>
          <p className="text-xs text-slate-400">Créez votre premier module pour commencer à organiser le contenu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m, idx) => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`card-hover ${m.visible ? '' : 'opacity-60 border-l-4 border-amber-400'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                      {m.order_index || idx + 1}
                    </span>
                    <h3 className="font-semibold text-slate-800">{m.title}</h3>
                    {!m.visible && (
                      <span className="badge-yellow flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Caché
                      </span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-sm text-slate-600 ml-9 mt-1 line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 ml-9 mt-2 text-xs text-slate-500">
                    <span>📄 {m.resources_count} ressources</span>
                    <span>·</span>
                    <span>❓ {m.quizzes_count} quiz</span>
                    <span>·</span>
                    <span>💼 {m.projects_count} projets</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Link to={`/teacher/modules/${m.id}`} className="btn-sm btn-primary">
                    Ouvrir <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => toggleVisibility(m)} className="btn-sm btn-secondary"
                    title={m.visible ? 'Cacher aux apprenants' : 'Rendre visible'}>
                    {m.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => startEdit(m)} className="btn-sm btn-secondary" title="Modifier">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="btn-sm btn-danger" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
