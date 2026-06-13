// backend/controllers/authController.js
// v2: rejects blocked accounts, updates last_login, writes activity logs.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAction } = require('../utils/logger');
require('dotenv').config();

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const user = rows[0];

    // Block disabled accounts
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Votre compte est désactivé. Contactez l\'administrateur.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Track last login (non-blocking)
    db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]).catch(() => {});

    // Activity log
    logAction(user.id, user.email, 'Connexion réussie');

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        level: user.level,
        subject_specialty: user.subject_specialty,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/auth/register-student
exports.registerStudent = async (req, res) => {
  const { full_name, email, password, level } = req.body;
  if (!full_name || !email || !password || !level) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }
  const validLevels = ['tronc_commun', '1bac', '2bac'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({ message: 'Niveau invalide' });
  }
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, role, level) VALUES (?, ?, ?, "student", ?)',
      [full_name, email, hash, level]
    );
    logAction(result.insertId, email, 'Inscription nouvel apprenant');
    res.status(201).json({ message: 'Compte créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, role, status, level, subject_specialty FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
