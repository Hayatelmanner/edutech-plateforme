// frontend/src/pages/super/StudentsList.jsx
// Manage students: list, block/unblock, delete, view their unlocked subjects.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Lock, Unlock, Trash2, BookOpen, X } from 'lucide-react';
import api from '../../services/api';

const LEVEL_LABEL = { tronc_commun: 'Tronc Commun', '1bac': '1ère Bac', '2bac': '2ème Bac' };
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null); // { student, subjects }

  async function load() {
    try { const r = await api.get('/super/students'); setStudents(r.data); }
    catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  async function toggleStatus(s) {
    const next = s.status === 'active' ? 'blocked' : 'active';
    if (!confirm(`${next === 'blocked' ? 'Bloquer' : 'Débloquer'} cet apprenant ?`)) return;
    await api.patch(`/super/students/${s.id}/status`, { status: next });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet apprenant ?')) return;
    await api.delete(`/super/students/${id}`);
    load();
  }

  async function viewSubjects(s) {
    try {
      const r = await api.get(`/super/students/${s.id}/subjects`);
      setViewing({ student: s, subjects: r.data });
    } catch { /* silent */ }
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Apprenants</h1>
        <p className="text-slate-500 text-sm mt-1">Tous les apprenants inscrits sur la plateforme</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-10" placeholder="Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Nom</th><th>Email</th><th>Niveau</th>
              <th>Statut</th><th>Dernière connexion</th><th>Inscrit le</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Aucun apprenant</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.full_name}</td>
                <td>{s.email}</td>
                <td><span className="badge-purple">{LEVEL_LABEL[s.level]}</span></td>
                <td>
                  {s.status === 'active'
                    ? <span className="badge-green">Actif</span>
                    : <span className="badge-red">Bloqué</span>}
                </td>
                <td className="text-slate-500">{fmtDate(s.last_login)}</td>
                <td className="text-slate-500">{fmtDate(s.created_at)}</td>
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => viewSubjects(s)} title="Voir matières"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(s)}
                      title={s.status === 'active' ? 'Bloquer' : 'Débloquer'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                      {s.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(s.id)} title="Supprimer"
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

      {/* Subjects modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Matières débloquées et consultations</h3>
                <p className="text-sm text-slate-500">{viewing.student.full_name}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {viewing.subjects.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">
                Aucune matière débloquée pour cet apprenant.
              </p>
            ) : (
              <div className="space-y-2">
                {viewing.subjects.map(s => {
                  const total = s.total_items || 0;
                  const seen  = s.consultations_count || 0;
                  const pct   = total > 0 ? Math.round((seen / total) * 100) : 0;
                  return (
                    <div key={s.id} className="p-3 rounded-lg bg-slate-50">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{s.title}</p>
                          <p className="text-xs text-slate-500">
                            {LEVEL_LABEL[s.level]} · Enseignant : {s.teacher_name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-indigo-600">
                            {seen}/{total} consulté(s)
                          </p>
                          <p className="text-xs text-slate-400">débloqué le {fmtDate(s.unlocked_at)}</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 shrink-0">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
