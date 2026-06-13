// backend/utils/logger.js
// Simple helper to insert activity log entries.
// Always non-blocking: errors are swallowed to never break a real request.
const db = require('../config/db');

async function logAction(userId, userEmail, action) {
  try {
    await db.query(
      'INSERT INTO logs (user_id, user_email, action) VALUES (?, ?, ?)',
      [userId || null, userEmail || null, action]
    );
  } catch (err) {
    console.error('Log error:', err.message);
  }
}

module.exports = { logAction };
