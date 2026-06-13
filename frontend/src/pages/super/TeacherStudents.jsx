// frontend/src/pages/super/TeacherStudents.jsx (v6)
// Liste des apprenants inscrits dans les matières d'un enseignant donné.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, GraduationCap, Users, BookOpen, AlertCircle, Mail,
} from 'lucide-react';
import api from '../../services/api';

const LEVEL_LABEL = {
  tronc_commun: 'Tronc Commun',
  '1bac': '1ère Bac',
  '2bac': '2ème Bac',
};

export default function TeacherStudents() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get(`/super/teachers/${id}/students`);
        setData(r.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur');
      }
    }
    load();
  }, [id]);

  if (error) return (
    <div className="p-6 lg:p-8">
      <div className="alert-error"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>
    </div>
  );
  if (!data) return (
    <div className="p-6 lg:p-8"><p className="text-slate-500">Chargement...</p></div>
  );

  const totalStudents = data.subjects.reduce((s, x) => s + x.students.length, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link to="/super/teachers"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-4 h-4" /> Retour à la liste des enseignants
      </Link>

      {/* Teacher header */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-indigo-700">Apprenants de l'enseignant</p>
            <h1 className="text-2xl font-bold text-slate-800">{data.teacher.full_name}</h1>
            <p className="text-sm text-slate-500">{data.teacher.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <BookOpen className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
            <p className="text-xs text-slate-500 uppercase">Matières</p>
            <p className="text-xl font-bold text-slate-800">{data.subjects.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <Users className="w-4 h-4 mx-auto text-purple-600 mb-1" />
            <p className="text-xs text-slate-500 uppercase">Inscriptions</p>
            <p className="text-xl font-bold text-slate-800">{totalStudents}</p>
          </div>
        </div>
      </div>

      {/* Subjects + students */}
      {data.subjects.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          Cet enseignant n'a aucune matière créée
        </p>
      ) : (
        <div className="space-y-4">
          {data.subjects.map((s, idx) => (
            <motion.div
              key={s.subject_id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card"
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{s.subject_title}</h3>
                    <p className="text-xs text-slate-500">{LEVEL_LABEL[s.level] || s.level}</p>
                  </div>
                </div>
                <span className="badge-indigo">
                  {s.students.length} apprenant{s.students.length > 1 ? 's' : ''}
                </span>
              </div>

              {s.students.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-3 text-center bg-slate-50 rounded-lg">
                  Aucun apprenant inscrit dans cette matière
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Nom</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-center px-2 py-2 font-medium">Statut</th>
                        <th className="text-right px-3 py-2 font-medium">Inscrit le</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.students.map(stu => (
                        <tr key={stu.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {stu.full_name}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            <a href={`mailto:${stu.email}`}
                              className="inline-flex items-center gap-1 hover:text-indigo-600">
                              <Mail className="w-3 h-3" /> {stu.email}
                            </a>
                          </td>
                          <td className="text-center px-2 py-2">
                            {stu.status === 'blocked'
                              ? <span className="badge-red">Bloqué</span>
                              : <span className="badge-green">Actif</span>}
                          </td>
                          <td className="text-right px-3 py-2 text-slate-500 text-xs">
                            {stu.unlocked_at
                              ? new Date(stu.unlocked_at).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
