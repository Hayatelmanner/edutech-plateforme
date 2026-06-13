// backend/controllers/teacherController.js (v3)
// Teacher actions:
//   - profile: update own info
//   - subjects: CRUD on owned subjects (+ access code)
//   - modules: CRUD on modules of own subjects
//   - resources: 8 types (PDF upload OR URL/HTML)
//   - quizzes: rattachés à un module
//   - projects: énoncés + voir dépôts apprenants
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logAction } = require('../utils/logger');

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper : check that the teacher owns the subject (via subject_id, module_id, or resource_id)
async function teacherOwnsSubject(teacherId, subjectId) {
  const [r] = await db.query(
    'SELECT id FROM subjects WHERE id = ? AND teacher_id = ?',
    [subjectId, teacherId]
  );
  return r.length > 0;
}
async function teacherOwnsModule(teacherId, moduleId) {
  const [r] = await db.query(
    `SELECT m.id FROM modules m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.id = ? AND s.teacher_id = ?`,
    [moduleId, teacherId]
  );
  return r.length > 0;
}
// v3.3 : ownership check via a part_id
async function teacherOwnsPart(teacherId, partId) {
  const [r] = await db.query(
    `SELECT p.id FROM parts p
     JOIN modules m  ON m.id = p.module_id
     JOIN subjects s ON s.id = m.subject_id
     WHERE p.id = ? AND s.teacher_id = ?`,
    [partId, teacherId]
  );
  return r.length > 0;
}

// ============== PROFILE ==============
exports.updateProfile = async (req, res) => {
  const { full_name, email, subject_specialty, password } = req.body;
  try {
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET full_name = ?, email = ?, subject_specialty = ?, password = ? WHERE id = ?',
        [full_name, email, subject_specialty || null, hash, req.user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET full_name = ?, email = ?, subject_specialty = ? WHERE id = ?',
        [full_name, email, subject_specialty || null, req.user.id]
      );
    }
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== SUBJECTS ==============
exports.getSubjects = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM modules WHERE subject_id = s.id) AS modules_count
       FROM subjects s
       WHERE s.teacher_id = ?
       ORDER BY s.id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createSubject = async (req, res) => {
  const { title, description, level } = req.body;
  if (!title || !level) return res.status(400).json({ message: 'Titre et niveau requis' });
  try {
    let code, unique = false;
    while (!unique) {
      code = generateAccessCode();
      const [c] = await db.query('SELECT id FROM subjects WHERE access_code = ?', [code]);
      if (c.length === 0) unique = true;
    }
    const [result] = await db.query(
      'INSERT INTO subjects (title, description, level, access_code, teacher_id) VALUES (?, ?, ?, ?, ?)',
      [title, description || '', level, code, req.user.id]
    );
    logAction(req.user.id, req.user.email, `Création matière "${title}"`);
    res.status(201).json({ id: result.insertId, access_code: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { title, description, level } = req.body;
  try {
    if (!(await teacherOwnsSubject(req.user.id, id))) {
      return res.status(404).json({ message: 'Matière introuvable' });
    }
    await db.query(
      'UPDATE subjects SET title = ?, description = ?, level = ? WHERE id = ?',
      [title, description || '', level, id]
    );
    res.json({ message: 'Matière mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM subjects WHERE id = ? AND teacher_id = ?', [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Matière introuvable' });
    res.json({ message: 'Matière supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/teacher/subjects/:id/code
// Body : { revoke_existing: true|false }
// Génère un nouveau code aléatoire ; révoque les accès existants si demandé.
exports.regenerateAccessCode = async (req, res) => {
  const { id } = req.params;
  const { revoke_existing } = req.body;
  try {
    if (!(await teacherOwnsSubject(req.user.id, id))) {
      return res.status(404).json({ message: 'Matière introuvable' });
    }
    let code, unique = false;
    while (!unique) {
      code = generateAccessCode();
      const [c] = await db.query('SELECT id FROM subjects WHERE access_code = ?', [code]);
      if (c.length === 0) unique = true;
    }

    // If teacher chose to revoke : set last_revoked_at to now.
    // The existing student_subjects rows are kept (so we still know who was enrolled),
    // but their unlocked_at will be older than last_revoked_at → access denied.
    if (revoke_existing) {
      await db.query(
        'UPDATE subjects SET access_code = ?, code_usage_count = 0, last_revoked_at = NOW() WHERE id = ?',
        [code, id]
      );
    } else {
      await db.query(
        'UPDATE subjects SET access_code = ?, code_usage_count = 0 WHERE id = ?',
        [code, id]
      );
    }
    res.json({ access_code: code, revoked: !!revoke_existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/teacher/subjects/:id/code
// Body : { access_code: 'CUSTOM', revoke_existing: true|false }
// L'enseignant peut définir un code personnalisé (au lieu de regen aléatoire).
exports.setCustomAccessCode = async (req, res) => {
  const { id } = req.params;
  const { access_code, revoke_existing } = req.body;
  if (!access_code || !access_code.trim()) {
    return res.status(400).json({ message: 'Code requis' });
  }
  const code = access_code.trim().toUpperCase();
  if (code.length < 4 || code.length > 20) {
    return res.status(400).json({ message: 'Code : entre 4 et 20 caractères' });
  }

  try {
    if (!(await teacherOwnsSubject(req.user.id, id))) {
      return res.status(404).json({ message: 'Matière introuvable' });
    }
    // Check uniqueness
    const [exists] = await db.query(
      'SELECT id FROM subjects WHERE access_code = ? AND id != ?', [code, id]
    );
    if (exists.length > 0) {
      return res.status(409).json({ message: 'Ce code est déjà utilisé par une autre matière' });
    }

    if (revoke_existing) {
      await db.query(
        'UPDATE subjects SET access_code = ?, code_usage_count = 0, last_revoked_at = NOW() WHERE id = ?',
        [code, id]
      );
    } else {
      await db.query(
        'UPDATE subjects SET access_code = ?, code_usage_count = 0 WHERE id = ?',
        [code, id]
      );
    }
    res.json({ access_code: code, revoked: !!revoke_existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== MODULES (NEW v3) ==============
// GET /api/teacher/subjects/:id/modules
exports.getModules = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsSubject(req.user.id, id))) {
      return res.status(404).json({ message: 'Matière introuvable' });
    }
    const [rows] = await db.query(
      `SELECT m.*,
              (SELECT COUNT(*) FROM resources WHERE module_id = m.id) AS resources_count,
              (SELECT COUNT(*) FROM quizzes   WHERE module_id = m.id) AS quizzes_count,
              (SELECT COUNT(*) FROM projects  WHERE module_id = m.id) AS projects_count
       FROM modules m
       WHERE m.subject_id = ?
       ORDER BY m.order_index ASC, m.id ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createModule = async (req, res) => {
  const { id } = req.params; // subject id
  const { title, description, order_index } = req.body;
  if (!title) return res.status(400).json({ message: 'Titre requis' });
  try {
    if (!(await teacherOwnsSubject(req.user.id, id))) {
      return res.status(404).json({ message: 'Matière introuvable' });
    }
    // If no order_index provided, put at the end
    let order = order_index;
    if (order === undefined || order === null || order === '') {
      const [max] = await db.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM modules WHERE subject_id = ?', [id]
      );
      order = max[0].next_order;
    }
    const [result] = await db.query(
      'INSERT INTO modules (subject_id, title, description, order_index) VALUES (?, ?, ?, ?)',
      [id, title, description || '', order]
    );
    res.status(201).json({ id: result.insertId, message: 'Module créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateModule = async (req, res) => {
  const { id } = req.params; // module id
  const { title, description, order_index } = req.body;
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    await db.query(
      'UPDATE modules SET title = ?, description = ?, order_index = ? WHERE id = ?',
      [title, description || '', order_index ?? 0, id]
    );
    res.json({ message: 'Module mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteModule = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    await db.query('DELETE FROM modules WHERE id = ?', [id]);
    res.json({ message: 'Module supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/teacher/modules/:id  -> module details + resources + quizzes + projects
exports.getModuleDetail = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    const [moduleRows] = await db.query('SELECT * FROM modules WHERE id = ?', [id]);
    const [parts]      = await db.query(
      'SELECT * FROM parts WHERE module_id = ? ORDER BY order_index ASC, id ASC',
      [id]
    );
    const [resources]  = await db.query('SELECT * FROM resources WHERE module_id = ? ORDER BY id DESC', [id]);
    const [quizzes]    = await db.query('SELECT id, part_id, title, created_at FROM quizzes WHERE module_id = ? ORDER BY id DESC', [id]);
    const [projects]   = await db.query('SELECT * FROM projects WHERE module_id = ? ORDER BY id DESC', [id]);
    res.json({ ...moduleRows[0], parts, resources, quizzes, projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== RESOURCES (8 types) ==============
// POST /api/teacher/modules/:id/resources
// Body : title, type, part_id (REQUIRED v3.4), [file] (PDF), [url], [content_html]
exports.createResource = async (req, res) => {
  const { id } = req.params; // module id
  const { title, type, url, content_html, part_id } = req.body;
  if (!title || !type) return res.status(400).json({ message: 'Titre et type requis' });
  if (!part_id) return res.status(400).json({ message: 'Vous devez d\'abord créer une partie, puis y rattacher la ressource' });

  const validTypes = ['pdf_course', 'summary', 'video', 'image', 'interactive', 'tp', 'evaluation'];
  if (!validTypes.includes(type)) return res.status(400).json({ message: 'Type invalide' });

  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }

    // Validate part_id : must belong to THIS module
    const [partRows] = await db.query(
      'SELECT id FROM parts WHERE id = ? AND module_id = ?',
      [part_id, id]
    );
    if (partRows.length === 0) {
      return res.status(400).json({ message: 'Partie invalide' });
    }

    // Get subject_id (kept for legacy queries)
    const [m] = await db.query('SELECT subject_id FROM modules WHERE id = ?', [id]);
    const subjectId = m[0].subject_id;

    let file_path = null;
    let finalUrl = null;
    let finalHtml = null;

    // Validation per type
    if (['pdf_course', 'tp', 'evaluation'].includes(type)) {
      if (!req.file) return res.status(400).json({ message: 'Fichier PDF requis pour ce type' });
      file_path = req.file.filename;
    } else if (['video', 'image'].includes(type)) {
      if (!url) return res.status(400).json({ message: 'URL requise pour ce type' });
      finalUrl = url;
    } else if (type === 'summary') {
      // v6 : summary accepts EITHER a PDF file OR HTML/text content
      if (req.file) {
        file_path = req.file.filename;
      } else if (content_html) {
        finalHtml = content_html;
      } else {
        return res.status(400).json({ message: 'Fichier PDF ou contenu texte requis' });
      }
    } else if (type === 'interactive') {
      if (!url && !content_html) return res.status(400).json({ message: 'URL ou contenu requis' });
      finalUrl = url || null;
      finalHtml = content_html || null;
    }

    await db.query(
      `INSERT INTO resources (subject_id, module_id, part_id, title, type, file_path, content_html, url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [subjectId, id, part_id, title, type, file_path, finalHtml, finalUrl]
    );
    res.status(201).json({ message: 'Ressource ajoutée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteResource = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT r.* FROM resources r
       JOIN modules m  ON r.module_id = m.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE r.id = ? AND s.teacher_id = ?`,
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Ressource introuvable' });
    if (rows[0].file_path) {
      const fp = path.join(__dirname, '..', 'uploads', rows[0].file_path);
      fs.unlink(fp, () => {});
    }
    // Delete the resource. Also clean orphan progress entries.
    await db.query('DELETE FROM resources WHERE id = ?', [id]);
    await db.query(
      'DELETE FROM student_progress WHERE item_type = "resource" AND item_id = ?',
      [id]
    );
    res.json({ message: 'Ressource supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== QUIZZES ==============
// REMOVED in v4 — quiz logic moved to controllers/quizController.js

// ============== PROJECTS (NEW v3) ==============
// POST /api/teacher/modules/:id/projects
exports.createProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, deadline, part_id } = req.body;
  if (!title) return res.status(400).json({ message: 'Titre requis' });
  if (!part_id) return res.status(400).json({ message: 'Vous devez d\'abord créer une partie, puis y rattacher le projet' });

  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }

    // Validate part_id : must belong to this module
    const [partRows] = await db.query(
      'SELECT id FROM parts WHERE id = ? AND module_id = ?',
      [part_id, id]
    );
    if (partRows.length === 0) {
      return res.status(400).json({ message: 'Partie invalide' });
    }

    const [result] = await db.query(
      'INSERT INTO projects (module_id, part_id, title, description, deadline) VALUES (?, ?, ?, ?, ?)',
      [id, part_id, title, description || '', deadline || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Projet créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      `DELETE p FROM projects p
       JOIN modules m ON p.module_id = m.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE p.id = ? AND s.teacher_id = ?`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Projet introuvable' });
    await db.query('DELETE FROM student_progress WHERE item_type = "project" AND item_id = ?', [id]);
    res.json({ message: 'Projet supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/teacher/projects/:id/submissions  -> list of student submissions
exports.getProjectSubmissions = async (req, res) => {
  const { id } = req.params;
  try {
    // Ownership check
    const [own] = await db.query(
      `SELECT p.id FROM projects p
       JOIN modules m  ON p.module_id = m.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE p.id = ? AND s.teacher_id = ?`,
      [id, req.user.id]
    );
    if (own.length === 0) return res.status(404).json({ message: 'Projet introuvable' });

    const [rows] = await db.query(
      `SELECT ps.*, u.full_name AS student_name, u.email AS student_email
       FROM project_submissions ps
       JOIN users u ON ps.student_id = u.id
       WHERE ps.project_id = ?
       ORDER BY ps.submitted_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== VISIBILITY (NEW v3.2) ==============
// PATCH /api/teacher/modules/:id/visibility   body: { visible: 0|1 }
exports.toggleModuleVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  if (visible !== 0 && visible !== 1 && visible !== true && visible !== false) {
    return res.status(400).json({ message: 'Visibilité invalide' });
  }
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    await db.query('UPDATE modules SET visible = ? WHERE id = ?', [visible ? 1 : 0, id]);
    res.json({ message: 'Visibilité mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/teacher/resources/:id/visibility   body: { visible: 0|1 }
exports.toggleResourceVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  if (visible !== 0 && visible !== 1 && visible !== true && visible !== false) {
    return res.status(400).json({ message: 'Visibilité invalide' });
  }
  try {
    // Verify the resource belongs to one of this teacher's subjects
    const [rows] = await db.query(
      `SELECT r.id FROM resources r
       JOIN modules  m ON r.module_id = m.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE r.id = ? AND s.teacher_id = ?`,
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Ressource introuvable' });
    await db.query('UPDATE resources SET visible = ? WHERE id = ?', [visible ? 1 : 0, id]);
    res.json({ message: 'Visibilité mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== PARTS (NEW v3.3) ==============
// Une "partie" découpe un module en sections (ex: "Vocabulaire de base").
// Une ressource peut être rattachée à une partie (optionnel).

// GET /api/teacher/modules/:id/parts
exports.getParts = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    const [rows] = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM resources WHERE part_id = p.id) AS resources_count,
              (SELECT COUNT(*) FROM quizzes   WHERE part_id = p.id) AS quizzes_count,
              (SELECT COUNT(*) FROM projects  WHERE part_id = p.id) AS projects_count
       FROM parts p
       WHERE p.module_id = ?
       ORDER BY p.order_index ASC, p.id ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/teacher/modules/:id/parts
exports.createPart = async (req, res) => {
  const { id } = req.params;
  const { title, description, order_index } = req.body;
  if (!title) return res.status(400).json({ message: 'Titre requis' });
  try {
    if (!(await teacherOwnsModule(req.user.id, id))) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    // If no order_index, append at the end
    let order = order_index;
    if (order === undefined || order === null || order === '') {
      const [max] = await db.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM parts WHERE module_id = ?', [id]
      );
      order = max[0].next_order;
    }
    const [result] = await db.query(
      'INSERT INTO parts (module_id, title, description, order_index) VALUES (?, ?, ?, ?)',
      [id, title, description || '', order]
    );
    res.status(201).json({ id: result.insertId, message: 'Partie créée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /api/teacher/parts/:id
exports.updatePart = async (req, res) => {
  const { id } = req.params;
  const { title, description, order_index } = req.body;
  try {
    if (!(await teacherOwnsPart(req.user.id, id))) {
      return res.status(404).json({ message: 'Partie introuvable' });
    }
    await db.query(
      'UPDATE parts SET title = ?, description = ?, order_index = ? WHERE id = ?',
      [title, description || '', order_index ?? 0, id]
    );
    res.json({ message: 'Partie mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/teacher/parts/:id
// Note : ON DELETE SET NULL on resources -> les ressources reviennent au module sans partie.
exports.deletePart = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsPart(req.user.id, id))) {
      return res.status(404).json({ message: 'Partie introuvable' });
    }
    await db.query('DELETE FROM parts WHERE id = ?', [id]);
    res.json({ message: 'Partie supprimée — les ressources sont conservées dans le module' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/teacher/parts/:id/visibility   body: { visible: 0|1 }
exports.togglePartVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  if (visible !== 0 && visible !== 1 && visible !== true && visible !== false) {
    return res.status(400).json({ message: 'Visibilité invalide' });
  }
  try {
    if (!(await teacherOwnsPart(req.user.id, id))) {
      return res.status(404).json({ message: 'Partie introuvable' });
    }
    await db.query('UPDATE parts SET visible = ? WHERE id = ?', [visible ? 1 : 0, id]);
    res.json({ message: 'Visibilité mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== MY STUDENTS (NEW v6) ==============
// GET /api/teacher/my-students
// Returns all subjects of the connected teacher, each with its enrolled students.
exports.getMyStudents = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id   AS subject_id, s.title AS subject_title, s.level,
              u.id   AS student_id, u.full_name, u.email, u.status,
              ss.unlocked_at
       FROM subjects s
       LEFT JOIN student_subjects ss ON ss.subject_id = s.id
       LEFT JOIN users u ON u.id = ss.student_id
       WHERE s.teacher_id = ?
       ORDER BY s.title, u.full_name`,
      [req.user.id]
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

    res.json(Object.values(subjectsMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
