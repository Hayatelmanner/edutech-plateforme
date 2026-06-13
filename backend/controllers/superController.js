// backend/controllers/superController.js
// v2 - Full Super Admin actions:
//   - Teachers: CRUD + activate/block + reset password
//   - Students: list + view subjects + block/unblock + delete
//   - Subjects: full CRUD + reassign teacher + view resources
//   - Access codes: list, toggle active, set expiration / max usage
//   - Dashboard stats + activity feed + logs
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAction } = require('../utils/logger');

// ================================================================
//  TEACHERS
// ================================================================

// GET /api/super/teachers
exports.getTeachers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, status, subject_specialty, last_login, created_at
       FROM users
       WHERE role = "teacher"
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/super/teachers
exports.createTeacher = async (req, res) => {
  const { full_name, email, password, subject_specialty } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, role, subject_specialty) VALUES (?, ?, ?, "teacher", ?)',
      [full_name, email, hash, subject_specialty || null]
    );
    logAction(req.user.id, req.user.email, `Création enseignant ${email}`);
    res.status(201).json({ id: result.insertId, message: 'Enseignant créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/super/teachers/:id
exports.updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, subject_specialty } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? AND role = "teacher"', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Enseignant introuvable' });

    await db.query(
      'UPDATE users SET full_name = ?, email = ?, subject_specialty = ? WHERE id = ?',
      [full_name, email, subject_specialty || null, id]
    );
    logAction(req.user.id, req.user.email, `Modification enseignant #${id}`);
    res.json({ message: 'Enseignant mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/super/teachers/:id
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM users WHERE id = ? AND role = "teacher"',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Enseignant introuvable' });
    logAction(req.user.id, req.user.email, `Suppression enseignant #${id}`);
    res.json({ message: 'Enseignant supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/super/teachers/:id/status  body: { status: 'active' | 'blocked' }
exports.toggleTeacherStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'blocked'].includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }
  try {
    const [result] = await db.query(
      'UPDATE users SET status = ? WHERE id = ? AND role = "teacher"',
      [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Enseignant introuvable' });
    logAction(req.user.id, req.user.email, `Statut enseignant #${id} -> ${status}`);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/super/teachers/:id/reset-password  body: { password }
exports.resetTeacherPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Mot de passe trop court (6 caractères minimum)' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE id = ? AND role = "teacher"',
      [hash, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Enseignant introuvable' });
    logAction(req.user.id, req.user.email, `Réinitialisation mot de passe enseignant #${id}`);
    res.json({ message: 'Mot de passe réinitialisé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/super/teachers/:id/students
// Returns the list of students enrolled in any subject of this teacher,
// grouped by subject for clarity.
exports.getTeacherStudents = async (req, res) => {
  const { id } = req.params;
  try {
    // Check teacher exists
    const [t] = await db.query(
      'SELECT id, full_name, email FROM users WHERE id = ? AND role = "teacher"',
      [id]
    );
    if (t.length === 0) return res.status(404).json({ message: 'Enseignant introuvable' });

    // For each subject of this teacher, list its enrolled students
    const [rows] = await db.query(
      `SELECT s.id   AS subject_id, s.title AS subject_title, s.level,
              u.id   AS student_id, u.full_name, u.email, u.status,
              ss.unlocked_at
       FROM subjects s
       LEFT JOIN student_subjects ss ON ss.subject_id = s.id
       LEFT JOIN users u ON u.id = ss.student_id
       WHERE s.teacher_id = ?
       ORDER BY s.title, u.full_name`,
      [id]
    );

    // Group by subject
    const subjectsMap = {};
    for (const r of rows) {
      if (!subjectsMap[r.subject_id]) {
        subjectsMap[r.subject_id] = {
          subject_id: r.subject_id,
          subject_title: r.subject_title,
          level: r.level,
          students: [],
        };
      }
      if (r.student_id) {
        subjectsMap[r.subject_id].students.push({
          id: r.student_id,
          full_name: r.full_name,
          email: r.email,
          status: r.status,
          unlocked_at: r.unlocked_at,
        });
      }
    }

    res.json({
      teacher: t[0],
      subjects: Object.values(subjectsMap),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  STUDENTS
// ================================================================

// GET /api/super/students
exports.getStudents = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, level, status, last_login, created_at
       FROM users
       WHERE role = "student"
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/super/students/:id/subjects -> subjects unlocked by this student
//   + nombre de consultations (items consultés) par matière
exports.getStudentSubjects = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.title, s.level, u.full_name AS teacher_name, ss.unlocked_at,
              (SELECT COUNT(*) FROM student_progress sp
                 JOIN modules m ON sp.module_id = m.id
                 WHERE sp.student_id = ? AND m.subject_id = s.id) AS consultations_count,
              (SELECT
                  (SELECT COUNT(*) FROM resources r JOIN modules m ON r.module_id=m.id WHERE m.subject_id=s.id) +
                  (SELECT COUNT(*) FROM quizzes   q JOIN modules m ON q.module_id=m.id WHERE m.subject_id=s.id) +
                  (SELECT COUNT(*) FROM projects  p JOIN modules m ON p.module_id=m.id WHERE m.subject_id=s.id)
              ) AS total_items
       FROM student_subjects ss
       JOIN subjects s ON ss.subject_id = s.id
       JOIN users u ON s.teacher_id = u.id
       WHERE ss.student_id = ?
       ORDER BY ss.unlocked_at DESC`,
      [id, id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/super/students/:id/status
exports.toggleStudentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'blocked'].includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }
  try {
    const [result] = await db.query(
      'UPDATE users SET status = ? WHERE id = ? AND role = "student"',
      [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Apprenant introuvable' });
    logAction(req.user.id, req.user.email, `Statut apprenant #${id} -> ${status}`);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/super/students/:id
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM users WHERE id = ? AND role = "student"',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Apprenant introuvable' });
    logAction(req.user.id, req.user.email, `Suppression apprenant #${id}`);
    res.json({ message: 'Apprenant supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  SUBJECTS (admin view : full control over all subjects)
// ================================================================

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/super/subjects
exports.getSubjects = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.full_name AS teacher_name, u.email AS teacher_email,
              (SELECT COUNT(*) FROM resources WHERE subject_id = s.id) AS resources_count,
              (SELECT COUNT(*) FROM quizzes  WHERE subject_id = s.id) AS quizzes_count,
              (SELECT COUNT(*) FROM student_subjects WHERE subject_id = s.id) AS students_count
       FROM subjects s
       JOIN users u ON s.teacher_id = u.id
       ORDER BY s.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/super/subjects -> admin creates a subject and assigns it
exports.createSubject = async (req, res) => {
  const { title, description, level, teacher_id } = req.body;
  if (!title || !level || !teacher_id) {
    return res.status(400).json({ message: 'Titre, niveau et enseignant requis' });
  }
  try {
    // Verify teacher exists
    const [t] = await db.query('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
    if (t.length === 0) return res.status(400).json({ message: 'Enseignant invalide' });

    // Unique access code
    let code, unique = false;
    while (!unique) {
      code = generateAccessCode();
      const [c] = await db.query('SELECT id FROM subjects WHERE access_code = ?', [code]);
      if (c.length === 0) unique = true;
    }

    const [result] = await db.query(
      'INSERT INTO subjects (title, description, level, access_code, teacher_id) VALUES (?, ?, ?, ?, ?)',
      [title, description || '', level, code, teacher_id]
    );
    logAction(req.user.id, req.user.email, `Création matière "${title}"`);
    res.status(201).json({ id: result.insertId, access_code: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/super/subjects/:id -> update + can change teacher
exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { title, description, level, teacher_id } = req.body;
  try {
    const [exist] = await db.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (exist.length === 0) return res.status(404).json({ message: 'Matière introuvable' });

    if (teacher_id) {
      const [t] = await db.query('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
      if (t.length === 0) return res.status(400).json({ message: 'Enseignant invalide' });
    }

    await db.query(
      'UPDATE subjects SET title = ?, description = ?, level = ?, teacher_id = COALESCE(?, teacher_id) WHERE id = ?',
      [title, description || '', level, teacher_id || null, id]
    );
    logAction(req.user.id, req.user.email, `Modification matière #${id}`);
    res.json({ message: 'Matière mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/super/subjects/:id
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM subjects WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Matière introuvable' });
    logAction(req.user.id, req.user.email, `Suppression matière #${id}`);
    res.json({ message: 'Matière supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/super/subjects/:id/resources -> admin view of all resources of a subject
exports.getSubjectResources = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM resources WHERE subject_id = ? ORDER BY id DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  ACCESS CODES management
// ================================================================

// GET /api/super/access-codes
exports.getAccessCodes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.title, s.access_code, s.code_active, s.code_expiration,
              s.code_max_usage, s.code_usage_count, u.full_name AS teacher_name
       FROM subjects s
       JOIN users u ON s.teacher_id = u.id
       ORDER BY s.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/super/access-codes/:subjectId
// body: { code_active?, code_expiration? (YYYY-MM-DD or null), code_max_usage?,
//         access_code? (new code), revoke_existing? (true|false) }
exports.updateAccessCode = async (req, res) => {
  const { subjectId } = req.params;
  const {
    code_active, code_expiration, code_max_usage,
    access_code, revoke_existing,
  } = req.body;
  try {
    const [exist] = await db.query('SELECT id FROM subjects WHERE id = ?', [subjectId]);
    if (exist.length === 0) return res.status(404).json({ message: 'Matière introuvable' });

    // Build a dynamic update with only provided fields
    const fields = [];
    const values = [];
    if (code_active !== undefined) {
      fields.push('code_active = ?');
      values.push(code_active ? 1 : 0);
    }
    if (code_expiration !== undefined) {
      fields.push('code_expiration = ?');
      values.push(code_expiration || null);
    }
    if (code_max_usage !== undefined) {
      fields.push('code_max_usage = ?');
      values.push(code_max_usage === '' || code_max_usage === null ? null : Number(code_max_usage));
    }
    // v5 : support changing the code itself + revocation
    if (access_code !== undefined && access_code !== null) {
      const newCode = String(access_code).trim().toUpperCase();
      if (newCode.length < 4 || newCode.length > 20) {
        return res.status(400).json({ message: 'Code : entre 4 et 20 caractères' });
      }
      // Check uniqueness
      const [dup] = await db.query(
        'SELECT id FROM subjects WHERE access_code = ? AND id != ?', [newCode, subjectId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: 'Ce code est déjà utilisé par une autre matière' });
      }
      fields.push('access_code = ?');
      values.push(newCode);
      fields.push('code_usage_count = 0');  // reset usage counter on code change
    }
    if (revoke_existing) {
      fields.push('last_revoked_at = NOW()');
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
    }
    values.push(subjectId);
    await db.query(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`, values);
    logAction(req.user.id, req.user.email,
      `Mise à jour code d'accès matière #${subjectId}` +
      (revoke_existing ? ' (accès révoqués)' : ''));
    res.json({ message: 'Code mis à jour', revoked: !!revoke_existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  DASHBOARD STATS + ACTIVITY
// ================================================================

// GET /api/super/dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Each db.query returns [rows, fields]. We index by [0] to get rows.
    const r1 = await db.query('SELECT COUNT(*) AS total FROM users WHERE role = "teacher"');
    const r2 = await db.query('SELECT COUNT(*) AS total FROM users WHERE role = "student"');
    const r3 = await db.query('SELECT COUNT(*) AS total FROM subjects');
    const r4 = await db.query('SELECT COUNT(*) AS total FROM resources');
    const r5 = await db.query('SELECT COUNT(*) AS total FROM quizzes');
    const r6 = await db.query(
      `SELECT COUNT(*) AS total FROM users
       WHERE role IN ("teacher","student")
         AND last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    // CHANGED v3 : matières les plus suivies (par nombre d'apprenants inscrits)
    //   au lieu de "matières les plus consultées" (views_count, supprimé)
    const r7 = await db.query(
      `SELECT s.id, s.title, u.full_name AS teacher_name,
              (SELECT COUNT(*) FROM student_subjects WHERE subject_id = s.id) AS students_count
       FROM subjects s
       JOIN users u ON s.teacher_id = u.id
       ORDER BY students_count DESC
       LIMIT 5`
    );
    const r8 = await db.query(
      `SELECT r.id, r.title, r.type, r.created_at, s.title AS subject_title
       FROM resources r
       JOIN subjects s ON r.subject_id = s.id
       ORDER BY r.created_at DESC
       LIMIT 5`
    );
    const r9 = await db.query(
      `SELECT id, full_name, email, role, last_login
       FROM users
       WHERE last_login IS NOT NULL
       ORDER BY last_login DESC
       LIMIT 5`
    );

    res.json({
      stats: {
        teachers:        r1[0][0]?.total || 0,
        students:        r2[0][0]?.total || 0,
        subjects:        r3[0][0]?.total || 0,
        resources:       r4[0][0]?.total || 0,
        quizzes:         r5[0][0]?.total || 0,
        active_users_7d: r6[0][0]?.total || 0,
      },
      top_subjects:     r7[0] || [],   // [{id, title, teacher_name, students_count}]
      recent_resources: r8[0] || [],
      recent_logins:    r9[0] || [],
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/super/logs?limit=50
exports.getLogs = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const [rows] = await db.query(
      'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
