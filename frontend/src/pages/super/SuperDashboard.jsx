// frontend/src/pages/super/SuperDashboard.jsx
// Modern admin dashboard: stats cards, top subjects bar chart, activity feeds.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, FileText, HelpCircle, Activity,
  TrendingUp, FilePlus, LogIn,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../../services/api';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="card relative overflow-hidden"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${color}`} />
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-sm text-slate-500 font-medium">{label}</p>
    <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
  </motion.div>
);

const LEVEL_LABEL = { tronc_commun: 'Tronc Commun', '1bac': '1ère Bac', '2bac': '2ème Bac' };
const ROLE_LABEL = { teacher: 'Enseignant', student: 'Apprenant', super: 'Admin' };

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function SuperDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/super/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-slate-500">Chargement du tableau de bord...</div>;

  // Defensive: ensure all expected fields exist
  const safeData = {
    stats: data.stats || {},
    top_subjects:     Array.isArray(data.top_subjects)     ? data.top_subjects     : [],
    recent_resources: Array.isArray(data.recent_resources) ? data.recent_resources : [],
    recent_logins:    Array.isArray(data.recent_logins)    ? data.recent_logins    : [],
  };

  const stats = [
    { icon: Users,        label: 'Enseignants',       value: safeData.stats.teachers || 0,       color: 'from-blue-500 to-indigo-500' },
    { icon: GraduationCap,label: 'Apprenants',        value: safeData.stats.students || 0,       color: 'from-purple-500 to-pink-500' },
    { icon: BookOpen,     label: 'Matières',          value: safeData.stats.subjects || 0,       color: 'from-emerald-500 to-teal-500' },
    { icon: FileText,     label: 'Ressources',        value: safeData.stats.resources || 0,      color: 'from-amber-500 to-orange-500' },
    { icon: HelpCircle,   label: 'Quiz',              value: safeData.stats.quizzes || 0,        color: 'from-rose-500 to-red-500' },
    { icon: Activity,     label: 'Actifs (7 jours)',  value: safeData.stats.active_users_7d || 0,color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Aperçu général de la plateforme EduTech</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.05} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top subjects chart - by NUMBER OF ENROLLED STUDENTS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Matières les plus suivies</h2>
          </div>
          {safeData.top_subjects.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">Pas encore de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={safeData.top_subjects} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 'auto']} allowDecimals={false} />
                <YAxis type="category" dataKey="title" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [`${v} apprenant(s)`, 'Inscrits']}
                />
                <Bar dataKey="students_count" fill="url(#colorBar)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent logins */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card">
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">Dernières connexions</h2>
          </div>
          <div className="space-y-3">
            {safeData.recent_logins.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune connexion récente</p>
            ) : safeData.recent_logins.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {u.full_name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{ROLE_LABEL[u.role]} · {u.email}</p>
                </div>
                <span className="text-xs text-slate-400">{timeAgo(u.last_login)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent resources added */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card">
        <div className="flex items-center gap-2 mb-4">
          <FilePlus className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Derniers ajouts de ressources</h2>
        </div>
        {safeData.recent_resources.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune ressource récente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr><th className="py-2">Titre</th><th>Type</th><th>Matière</th><th>Quand</th></tr>
              </thead>
              <tbody>
                {safeData.recent_resources.map(r => {
                  // Map v3 types to label/color
                  const typeMeta = {
                    pdf_course:  ['Cours',       'badge-blue'],
                    course:      ['Cours',       'badge-blue'],
                    summary:     ['Résumé',      'badge-blue'],
                    tp:          ['TP',          'badge-yellow'],
                    evaluation:  ['Évaluation',  'badge-purple'],
                    video:       ['Vidéo',       'badge-red'],
                    image:       ['Schéma',      'badge-purple'],
                    interactive: ['Interactif',  'badge-green'],
                  };
                  const [label, badge] = typeMeta[r.type] || ['Autre', 'badge-gray'];
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-800">{r.title}</td>
                      <td><span className={`badge ${badge}`}>{label}</span></td>
                      <td className="text-slate-600">{r.subject_title}</td>
                      <td className="text-slate-400">{timeAgo(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
