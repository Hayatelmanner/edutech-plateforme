// frontend/src/pages/teacher/TeacherProfile.jsx
import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TeacherProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user.full_name,
    email: user.email,
    subject_specialty: user.subject_specialty || '',
    password: '',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.put('/teacher/profile', form);
      updateUser({
        full_name: form.full_name,
        email: form.email,
        subject_specialty: form.subject_specialty,
      });
      setForm({ ...form, password: '' });
      setMsg({ type: 'success', text: 'Profil mis à jour' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Mon profil</h1>
      <div className="card form">
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom complet</label>
            <input name="full_name" required value={form.full_name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" required value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Matière (spécialité)</label>
            <input name="subject_specialty" value={form.subject_specialty} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Nouveau mot de passe <small>(laisser vide pour ne pas changer)</small></label>
            <input type="password" name="password" value={form.password} onChange={handleChange} />
          </div>
          <button className="btn">Enregistrer</button>
        </form>
      </div>
    </div>
  );
}
