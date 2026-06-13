// frontend/src/pages/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export default function Register() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', level: 'tronc_commun',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/auth/register-student', form);
      setSuccess('Compte créé. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-purple-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mb-3">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Créer un compte apprenant</h1>
            <p className="text-slate-500 text-sm mt-1">Rejoignez EduTech en quelques secondes</p>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert-success mb-4">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom complet</label>
              <input name="full_name" required className="input"
                value={form.full_name} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" name="email" required className="input"
                value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input type="password" name="password" required minLength={6} className="input"
                value={form.password} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Niveau</label>
              <select name="level" value={form.level} onChange={handleChange} className="input">
                <option value="tronc_commun">Tronc Commun</option>
                <option value="1bac">1ère Bac</option>
                <option value="2bac">2ème Bac</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              Créer mon compte
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
