// frontend/src/pages/super/LogsList.jsx
// Show activity logs (last 50 by default, expandable to 200).
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../services/api';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function LogsList() {
  const [logs, setLogs] = useState([]);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`/super/logs?limit=${limit}`);
      setLogs(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [limit]);

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Historique des activités
          </h1>
          <p className="text-slate-500 text-sm mt-1">Toutes les actions importantes sur la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input !py-2 !w-auto" value={limit}
            onChange={e => setLimit(Number(e.target.value))}>
            <option value={50}>50 dernières</option>
            <option value={100}>100 dernières</option>
            <option value={200}>200 dernières</option>
          </select>
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="card !p-0">
        {logs.length === 0 ? (
          <p className="text-slate-400 text-sm py-12 text-center">Aucune activité enregistrée</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((l, i) => (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{l.action}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {l.user_email || 'Système'}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{timeAgo(l.created_at)}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
