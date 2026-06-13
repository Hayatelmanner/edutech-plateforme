// frontend/src/pages/super/TeachersList.jsx
// Manage teachers: CRUD + block/unblock + reset password.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus, Edit2, Trash2, Lock, Unlock, KeyRound, X, Search, Users,
} from 'lucide-react';
import api from '../../services/api';

const empty = { full_name: '', email: '', password: '', subject_specialty: '' };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [resetForId, setResetForId] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  async function load() {
    try { const r = await api.get('/super/teachers'); setTeachers(r.data); }
    catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  function startCreate() { setEditId(null); setForm(empty); setShowForm(true); }
  function startEdit(t) {
    setEditId(t.id);
    setForm({ full_name: t.full_name, email: t.email, password: '', subject_specialty: t.subject_specialty || '' });
    setShowForm(true);
  }
  function cancel() { setShowForm(false); setEditId(null); setForm(empty); }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      if (editId) {
        await api.put(`/super/teachers/${editId}`, {
          full_name: form.full_name, email: form.email, subject_specialty: form.subject_specialty,
        });
        setMsg({ type: 'success', text: 'Enseignant mis à jour' });
      } else {
        await api.post('/super/teachers', form);
        setMsg({ type: 'success', text: 'Enseignant créé' });
      }
      cancel(); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  async function toggleStatus(t) {
    const next = t.status === 'active' ? 'blocked' : 'active';
    if (!confirm(`${next === 'blocked' ? 'Désactiver' : 'Réactiver'} ce compte ?`)) return;
    await api.patch(`/super/teachers/${t.id}/status`, { status: next });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet enseignant et toutes ses matières ?')) return;
    await api.delete(`/super/teachers/${id}`);
    load();
  }

  async function handleReset(e) {
    e.preventDefault();
    if (resetPwd.length < 6) { setMsg({ type: 'error', text: '6 caractères minimum' }); return; }
    try {
      await api.post(`/super/teachers/${resetForId}/reset-password`, { password: resetPwd });
      setResetForId(null); setResetPwd('');
      setMsg({ type: 'success', text: 'Mot de passe réinitialisé' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enseignants</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez les comptes enseignants de la plateforme</p>
        </div>
        <button onClick={startCreate} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Nouvel enseignant
        </button>
      </div>

      {msg.text && (
        <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editId ? 'Modifier' : 'Créer'} un enseignant</h2>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom complet</label>
              <input className="input" required value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editId && (
              <div>
                <label className="label">Mot de passe</label>
                <input type="password" className="input" required minLength={6} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div>
              <label className="label">Matière (spécialité)</label>
              <input className="input" placeholder="ex: Mathématiques" value={form.subject_specialty}
                onChange={e => setForm({ ...form, subject_specialty: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">
                {editId ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" onClick={cancel} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Reset password modal */}
      {resetForId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Réinitialiser le mot de passe</h3>
            <form onSubmit={handleReset}>
              <input type="password" required minLength={6} className="input mb-4"
                placeholder="Nouveau mot de passe" value={resetPwd}
                onChange={e => setResetPwd(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setResetForId(null); setResetPwd(''); }}
                  className="btn-secondary">Annuler</button>
                <button className="btn-primary">Réinitialiser</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Nom</th><th>Email</th><th>Spécialité</th>
              <th>Statut</th><th>Dernière connexion</th><th>Créé le</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Aucun enseignant</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id}>
                <td className="font-medium">{t.full_name}</td>
                <td>{t.email}</td>
                <td>{t.subject_specialty || '—'}</td>
                <td>
                  {t.status === 'active'
                    ? <span className="badge-green">Actif</span>
                    : <span className="badge-red">Bloqué</span>}
                </td>
                <td className="text-slate-500">{fmtDate(t.last_login)}</td>
                <td className="text-slate-500">{fmtDate(t.created_at)}</td>
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <Link to={`/super/teachers/${t.id}/students`} title="Voir les apprenants inscrits"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600">
                      <Users className="w-4 h-4" />
                    </Link>
                    <button onClick={() => startEdit(t)} title="Modifier"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setResetForId(t.id)} title="Réinitialiser mot de passe"
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(t)}
                      title={t.status === 'active' ? 'Désactiver' : 'Réactiver'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                      {t.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(t.id)} title="Supprimer"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
