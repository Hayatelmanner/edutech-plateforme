// frontend/src/pages/super/SubjectsAdmin.jsx
// Admin: full subject CRUD + reassign teacher + view resources count.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Search, Eye } from 'lucide-react';
import api from '../../services/api';

const LEVEL_LABEL = { tronc_commun: 'Tronc Commun', '1bac': '1ère Bac', '2bac': '2ème Bac' };
const empty = { title: '', description: '', level: 'tronc_commun', teacher_id: '' };

export default function SubjectsAdmin() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [viewing, setViewing] = useState(null); // resources view
  const [msg, setMsg] = useState({ type: '', text: '' });

  async function load() {
    try {
      const [s, t] = await Promise.all([api.get('/super/subjects'), api.get('/super/teachers')]);
      setSubjects(s.data);
      setTeachers(t.data);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  function startCreate() { setEditId(null); setForm(empty); setShowForm(true); }
  function startEdit(s) {
    setEditId(s.id);
    setForm({
      title: s.title, description: s.description || '',
      level: s.level, teacher_id: s.teacher_id,
    });
    setShowForm(true);
  }
  function cancel() { setShowForm(false); setEditId(null); setForm(empty); }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editId) {
        await api.put(`/super/subjects/${editId}`, form);
        setMsg({ type: 'success', text: 'Matière mise à jour' });
      } else {
        await api.post('/super/subjects', form);
        setMsg({ type: 'success', text: 'Matière créée' });
      }
      cancel(); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette matière et tout son contenu ?')) return;
    await api.delete(`/super/subjects/${id}`);
    load();
  }

  async function viewResources(s) {
    try {
      const r = await api.get(`/super/subjects/${s.id}/resources`);
      setViewing({ subject: s, resources: r.data });
    } catch { /* silent */ }
  }

  const filtered = subjects.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matières</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion globale des matières et de leurs enseignants</p>
        </div>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle matière
        </button>
      </div>

      {msg.text && <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-10" placeholder="Rechercher une matière..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editId ? 'Modifier' : 'Créer'} une matière</h2>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre</label>
              <input className="input" required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Niveau</label>
              <select className="input" value={form.level}
                onChange={e => setForm({ ...form, level: e.target.value })}>
                <option value="tronc_commun">Tronc Commun</option>
                <option value="1bac">1ère Bac</option>
                <option value="2bac">2ème Bac</option>
              </select>
            </div>
            <div>
              <label className="label">Enseignant responsable</label>
              <select className="input" required value={form.teacher_id}
                onChange={e => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary">{editId ? 'Mettre à jour' : 'Créer'}</button>
              <button type="button" onClick={cancel} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <p className="text-slate-400 text-sm col-span-full text-center py-8">Aucune matière</p>
        ) : filtered.map(s => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-hover">
            <div className="flex items-start justify-between mb-2">
              <span className="badge-purple">{LEVEL_LABEL[s.level]}</span>
              <span className="badge-blue">👥 {s.students_count || 0} apprenants</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{s.title}</h3>
            <p className="text-xs text-slate-500 mb-2">Enseignant : {s.teacher_name}</p>
            {s.description && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{s.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <span>📄 {s.resources_count} ressources</span>
              <span>·</span>
              <span>❓ {s.quizzes_count} quiz</span>
            </div>
            <div className="font-mono text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded inline-block mb-3">
              {s.access_code}
            </div>
            <div className="flex gap-1 pt-2 border-t border-slate-100">
              <button onClick={() => viewResources(s)} className="btn-sm btn-secondary flex-1">
                <Eye className="w-3.5 h-3.5" /> Voir
              </button>
              <button onClick={() => startEdit(s)} className="btn-sm btn-secondary">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="btn-sm btn-danger">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Resources modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Ressources</h3>
                <p className="text-sm text-slate-500">{viewing.subject.title}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {viewing.resources.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">Aucune ressource</p>
            ) : (
              <div className="space-y-2">
                {viewing.resources.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        r.type === 'course' ? 'badge-blue' :
                        r.type === 'tp' ? 'badge-yellow' : 'badge-green'
                      }`}>
                        {r.type === 'course' ? 'Cours' : r.type === 'tp' ? 'TP' : 'Interactif'}
                      </span>
                      <span className="font-medium">{r.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
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
