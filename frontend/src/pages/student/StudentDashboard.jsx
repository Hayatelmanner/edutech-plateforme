// frontend/src/pages/student/StudentDashboard.jsx (v3)
// List subjects of the student's level + unlock modal + link to "My progress".
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  KeyRound, BookOpen, Lock, CheckCircle2, AlertCircle,
  TrendingUp, ChevronRight, GraduationCap, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

const LEVEL_LABEL = {
  tronc_commun: 'Tronc Commun',
  '1bac': '1ère Bac',
  '2bac': '2ème Bac',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const formRef = useRef(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector('input')?.focus();
  }

  async function load() {
    try {
      const r = await api.get('/student/subjects');
      setSubjects(r.data);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, []);

  async function handleUnlock(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.post('/student/unlock', { access_code: code });
      setMsg({ type: 'success', text: 'Matière débloquée !' });
      setCode('');
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            Bonjour, {user.full_name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Niveau : <span className="badge-purple">{LEVEL_LABEL[user.level]}</span>
          </p>
        </div>
        <Link to="/student/progress" className="btn-secondary">
          <TrendingUp className="w-4 h-4" /> Ma progression
        </Link>
      </div>

      {/* v5 : Revocation/expiration banner */}
      {subjects.some(s => s.revoked || s.code_blocked) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          onClick={scrollToForm}
          className="bg-red-50 border-2 border-red-300 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-800">
                Accès expiré ou code modifié — veuillez saisir le nouveau code
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {subjects.filter(s => s.revoked || s.code_blocked).length === 1
                  ? `Une matière nécessite la saisie du nouveau code d'accès.`
                  : `${subjects.filter(s => s.revoked || s.code_blocked).length} matières nécessitent la saisie du nouveau code d'accès.`}
                {' '}Cliquez ici pour ressaisir.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Unlock card */}
      <motion.div ref={formRef}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
        <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          Débloquer une matière
        </h3>
        <p className="text-sm text-slate-600 mb-3">
          Entrez le code d'accès donné par votre enseignant.
        </p>
        <form onSubmit={handleUnlock} className="flex flex-wrap gap-2">
          <input
            placeholder="ABC12XYZ"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="input flex-1 min-w-[200px] !uppercase font-mono"
            required
          />
          <button className="btn-primary">Valider</button>
        </form>
        {msg.text && (
          <div className={`alert-${msg.type} mt-3`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> :
                                       <AlertCircle  className="w-5 h-5 shrink-0 mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}
      </motion.div>

      {/* Subjects */}
      <h2 className="text-lg font-semibold text-slate-700">Matières disponibles pour votre niveau</h2>
      {subjects.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">Aucune matière disponible pour votre niveau.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-hover relative"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="badge-purple">{LEVEL_LABEL[s.level]}</span>
                {s.revoked
                  ? <span className="badge-red flex items-center gap-1"><Lock className="w-3 h-3" /> Code modifié</span>
                  : s.code_blocked
                  ? <span className="badge-red flex items-center gap-1"><Lock className="w-3 h-3" /> Code désactivé</span>
                  : s.unlocked
                  ? <span className="badge-green">✓ Débloqué</span>
                  : <span className="badge-red flex items-center gap-1"><Lock className="w-3 h-3" /> Verrouillé</span>}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{s.title}</h3>
              <p className="text-xs text-slate-500 mb-2">Enseignant : {s.teacher_name}</p>
              {s.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{s.description}</p>
              )}
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                <BookOpen className="w-3 h-3" /> {s.modules_count || 0} module(s)
              </p>
              {s.revoked ? (
                <button onClick={scrollToForm}
                  className="btn-sm w-full justify-center bg-red-100 text-red-700 hover:bg-red-200">
                  Ressaisir le nouveau code
                </button>
              ) : s.code_blocked ? (
                <p className="text-xs text-red-600 text-center py-2 bg-red-50 rounded-lg">
                  🚫 Accès bloqué par l'administrateur
                </p>
              ) : s.unlocked ? (
                <Link
                  to={`/student/subjects/${s.id}/modules`}
                  className="btn-primary btn-sm w-full justify-center"
                >
                  Accéder aux modules <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  🔒 Entrez le code pour accéder
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
