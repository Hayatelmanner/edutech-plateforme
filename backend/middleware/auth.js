// backend/middleware/auth.js
// JWT verification + role authorization + status check (v2).
// Now also rejects requests from users whose status is "blocked".
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Verify token, attach user info, and reject blocked accounts
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check status from DB (handles cases where admin blocked the user
    // after token issuance)
    const [rows] = await db.query(
      'SELECT status FROM users WHERE id = ?',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Compte introuvable' });
    }
    if (rows[0].status === 'blocked') {
      return res.status(403).json({ message: 'Votre compte a été désactivé' });
    }

    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide' });
  }
}

// Restrict access to specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
