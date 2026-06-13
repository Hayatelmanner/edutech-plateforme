// frontend/src/pages/teacher/TeacherDashboard.jsx (v3)
// List teacher's subjects, each leading to its modules page.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Edit2, Trash2, RefreshCw, BookOpen, User, X, Layers, Key, AlertTriangle, Users,
} from 'lucide-react';
import api from '../../services/api';
import { LEVEL_LABEL } from '../../utils/constants';

const empty = { title: '', description: '', level: 'tronc_commun' };

export default function TeacherDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // v5 : modal for editing access code
  const [codeModal, setCodeModal] = useState(null);
  // shape: { subject, mode: 'regenerate' | 'custom', customCode: '', revokeExisting: false, loading: false, error: '' }

  async function load() {
    try {
      const r = await api.get('/teacher/subjects');
      setSubjects(r.data);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  function startCreate() { setEditId(null); setForm(empty); setShowForm(true); }
  function startEdit(s) {
    setEditId(s.id);
    setForm({ title: s.title, description: s.description || '', level: s.level });
    setShowForm(true);
  }
  function cancel() { setShowForm(false); setEditId(null); setForm(empty); }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/teacher/subjects/${editId}`, form);
        setMsg({ type: 'success', text: 'Matière mise à jour' });
      } else {
        await api.post('/teacher/subjects', form);
        setMsg({ type: 'success', text: 'Matière créée — un code d\'accès a été généré' });
      }
      cancel(); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette matière, ses modules et tout son contenu ?')) return;
    await api.delete(`/teacher/subjects/${id}`);
    load();
  }

  function openCodeModal(subject) {
    setCodeModal({
      subject, mode: 'regenerate', customCode: '',
      revokeExisting: false, loading: false, error: '',
    });
  }
  function closeCodeModal() { setCodeModal(null); }

  async function submitCodeModal() {
    if (!codeModal) return;
    setCodeModal(c => ({ ...c, loading: true, error: '' }));
    try {
      let result;
      if (codeModal.mode === 'regenerate') {
        const r = await api.post(`/teacher/subjects/${codeModal.subject.id}/regenerate-code`, {
          revoke_existing: codeModal.revokeExisting,
        });
        result = r.data;
      } else {
        // custom code
        const r = await api.put(`/teacher/subjects/${codeModal.subject.id}/code`, {
          access_code: codeModal.customCode.trim().toUpperCase(),
          revoke_existing: codeModal.revokeExisting,
        });
        result = r.data;
      }
      setMsg({
        type: 'success',
        text: `Code mis à jour : ${result.access_code}` +
              (result.revoked ? ' (accès apprenants révoqués)' : ''),
      });
      closeCodeModal();
      load();
    } catch (err) {
      setCodeModal(c => ({
        ...c, loading: false,
        error: err.response?.data?.message || 'Erreur',
      }));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mes matières</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez vos matières et organisez vos modules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/teacher/my-students" className="btn-secondary">
            <Users className="w-4 h-4" /> Mes apprenants
          </Link>
          <Link to="/teacher/profile" className="btn-secondary">
            <User className="w-4 h-4" /> Mon profil
          </Link>
          <button onClick={startCreate} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvelle matière
          </button>
        </div>
      </div>

      {msg.text && <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>}

      {/* Form */}
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
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary">{editId ? 'Mettre à jour' : 'Créer'}</button>
              <button type="button" onClick={cancel} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Subjects grid */}
      {subjects.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune matière. Cliquez sur "Nouvelle matière" pour commencer.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <motion.div key={s.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card-hover border-l-4 border-indigo-500">
              <div className="flex items-start justify-between mb-2">
                <span className="badge-purple">{LEVEL_LABEL[s.level]}</span>
                <span className="badge-blue flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {s.modules_count || 0} modules
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{s.title}</h3>
              {s.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{s.description}</p>
              )}
              <div className="text-xs text-slate-500 mb-3">
                Code d'accès : <span className="font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded">{s.access_code}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-3 border-t border-slate-100">
                <Link to={`/teacher/subjects/${s.id}/modules`} className="btn-sm btn-primary flex-1">
                  <Layers className="w-3.5 h-3.5" /> Modules
                </Link>
                <button onClick={() => startEdit(s)} className="btn-sm btn-secondary" title="Modifier">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openCodeModal(s)} className="btn-sm btn-secondary" title="Gérer le code">
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="btn-sm btn-danger" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ============== Code access modal (v5) ============== */}
      {codeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" /> Code d'accès
                </h3>
                <p className="text-sm text-slate-500">{codeModal.subject.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Code actuel : <span className="font-mono">{codeModal.subject.access_code}</span>
                </p>
              </div>
              <button onClick={closeCodeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {codeModal.error && (
              <div className="alert-error mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{codeModal.error}</span>
              </div>
            )}

            {/* Mode picker */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setCodeModal(c => ({ ...c, mode: 'regenerate' }))}
                className={`p-3 rounded-lg border-2 text-left ${
                  codeModal.mode === 'regenerate'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <RefreshCw className="w-4 h-4 text-indigo-600 mb-1" />
                <p className="text-xs font-medium">Générer aléatoire</p>
              </button>
              <button
                onClick={() => setCodeModal(c => ({ ...c, mode: 'custom' }))}
                className={`p-3 rounded-lg border-2 text-left ${
                  codeModal.mode === 'custom'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <Edit2 className="w-4 h-4 text-indigo-600 mb-1" />
                <p className="text-xs font-medium">Code personnalisé</p>
              </button>
            </div>

            {codeModal.mode === 'custom' && (
              <div className="mb-4">
                <label className="label">Nouveau code (4-20 caractères)</label>
                <input className="input font-mono uppercase"
                  placeholder="EX: MATHS2024"
                  maxLength={20}
                  value={codeModal.customCode}
                  onChange={e => setCodeModal(c => ({
                    ...c, customCode: e.target.value.toUpperCase(),
                  }))} />
              </div>
            )}

            {/* Revoke checkbox */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5"
                  checked={codeModal.revokeExisting}
                  onChange={e => setCodeModal(c => ({
                    ...c, revokeExisting: e.target.checked,
                  }))} />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Révoquer les accès existants
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {codeModal.revokeExisting
                      ? "⚠️ Les apprenants déjà inscrits perdront l'accès et devront ressaisir le nouveau code."
                      : "Les apprenants déjà inscrits gardent l'accès. Le nouveau code servira uniquement pour les nouvelles inscriptions."}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={submitCodeModal}
                disabled={codeModal.loading ||
                  (codeModal.mode === 'custom' && codeModal.customCode.trim().length < 4)}
                className="btn-primary flex-1 disabled:opacity-50">
                {codeModal.loading ? 'Enregistrement...' : 'Confirmer'}
              </button>
              <button onClick={closeCodeModal} className="btn-secondary">Annuler</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
