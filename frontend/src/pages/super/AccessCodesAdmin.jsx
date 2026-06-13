// frontend/src/pages/super/AccessCodesAdmin.jsx
// View all access codes and manage active state, expiration, max usage.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Power, Calendar, Users, Save, X } from 'lucide-react';
import api from '../../services/api';

export default function AccessCodesAdmin() {
  const [codes, setCodes] = useState([]);
  const [editing, setEditing] = useState(null); // subject row being edited
  const [form, setForm] = useState({
    code_expiration: '', code_max_usage: '',
    access_code: '', revoke_existing: false,   // v5
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  async function load() {
    try { const r = await api.get('/super/access-codes'); setCodes(r.data); }
    catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(c) {
    try {
      await api.patch(`/super/access-codes/${c.id}`, { code_active: c.code_active ? 0 : 1 });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  function startEdit(c) {
    setEditing(c);
    setForm({
      code_expiration: c.code_expiration ? c.code_expiration.split('T')[0] : '',
      code_max_usage: c.code_max_usage ?? '',
      access_code: c.access_code || '',
      revoke_existing: false,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const body = {
        code_expiration: form.code_expiration || null,
        code_max_usage: form.code_max_usage === '' ? null : Number(form.code_max_usage),
      };
      // v5 : only send access_code if actually changed
      const newCode = (form.access_code || '').trim().toUpperCase();
      if (newCode && newCode !== editing.access_code) {
        body.access_code = newCode;
      }
      if (form.revoke_existing) body.revoke_existing = true;

      await api.patch(`/super/access-codes/${editing.id}`, body);
      setEditing(null);
      setMsg({ type: 'success', text: 'Code mis à jour' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  function isExpired(c) {
    if (!c.code_expiration) return false;
    return new Date(c.code_expiration) < new Date(new Date().toDateString());
  }
  function isExhausted(c) {
    return c.code_max_usage !== null && c.code_usage_count >= c.code_max_usage;
  }

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Codes d'accès</h1>
        <p className="text-slate-500 text-sm mt-1">
          Activez/désactivez les codes, définissez une date d'expiration et un nombre max d'utilisations.
        </p>
      </div>

      {msg.text && <div className={`alert-${msg.type}`}><span>{msg.text}</span></div>}

      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Matière</th><th>Enseignant</th><th>Code</th>
              <th>Statut</th><th>Expiration</th><th>Utilisations</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Aucun code</td></tr>
            ) : codes.map(c => {
              const expired = isExpired(c);
              const exhausted = isExhausted(c);
              const inactive = !c.code_active || expired || exhausted;
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.title}</td>
                  <td>{c.teacher_name}</td>
                  <td>
                    <span className="font-mono text-sm bg-amber-50 text-amber-800 px-2 py-1 rounded">
                      {c.access_code}
                    </span>
                  </td>
                  <td>
                    {!c.code_active && <span className="badge-red">Désactivé</span>}
                    {c.code_active && expired && <span className="badge-red">Expiré</span>}
                    {c.code_active && !expired && exhausted && <span className="badge-red">Épuisé</span>}
                    {c.code_active && !expired && !exhausted && <span className="badge-green">Actif</span>}
                  </td>
                  <td className="text-slate-500">
                    {c.code_expiration ? new Date(c.code_expiration).toLocaleDateString() : '—'}
                  </td>
                  <td className="text-slate-600">
                    {c.code_usage_count}{c.code_max_usage !== null ? ` / ${c.code_max_usage}` : ''}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => startEdit(c)} title="Configurer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(c)}
                        title={c.code_active ? 'Désactiver' : 'Réactiver'}
                        className={`p-1.5 rounded-lg ${
                          c.code_active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-emerald-50 text-emerald-600'
                        }`}>
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Configurer le code</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Matière : <strong>{editing.title}</strong>
            </p>
            <form onSubmit={handleSave} className="space-y-4">
              {/* v5 : code itself */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> Code d'accès
                </label>
                <input type="text" className="input font-mono uppercase"
                  maxLength={20}
                  value={form.access_code}
                  onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })} />
                <p className="text-xs text-slate-400 mt-1">
                  Modifier ce champ remplace l'ancien code (4-20 caractères).
                </p>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Date d'expiration
                </label>
                <input type="date" className="input"
                  value={form.code_expiration}
                  onChange={e => setForm({ ...form, code_expiration: e.target.value })} />
                <p className="text-xs text-slate-400 mt-1">Laisser vide pour aucune limite</p>
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Nombre maximum d'utilisations
                </label>
                <input type="number" min="1" className="input"
                  placeholder="Illimité"
                  value={form.code_max_usage}
                  onChange={e => setForm({ ...form, code_max_usage: e.target.value })} />
                <p className="text-xs text-slate-400 mt-1">
                  Utilisations actuelles : {editing.code_usage_count}
                </p>
              </div>

              {/* v5 : revoke checkbox (only meaningful when code actually changes) */}
              {form.access_code.trim().toUpperCase() !== (editing.access_code || '') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5"
                      checked={form.revoke_existing}
                      onChange={e => setForm({ ...form, revoke_existing: e.target.checked })} />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        Révoquer les accès existants
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {form.revoke_existing
                          ? "⚠️ Les apprenants déjà inscrits perdront l'accès et devront ressaisir le nouveau code."
                          : "Les apprenants déjà inscrits gardent l'accès."}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
                  Annuler
                </button>
                <button className="btn-primary">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
