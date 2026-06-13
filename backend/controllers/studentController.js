// backend/controllers/studentController.js (v3)
// Student actions:
//   - browse subjects of own level + unlock with code (with v2 limits)
//   - browse modules of unlocked subjects
//   - view module content (resources/quizzes/projects)
//   - submit project files
//   - track detailed progress (resources opened, quizzes done, projects submitted)
const db = require('../config/db');
const { logAction } = require('../utils/logger');

// Helper : student must have unlocked the subject AND the code must still be active.
// If admin disables / expires / exhausts the code, students lose access immediately.
// v5 : if the teacher changed the code with "revoke existing", students enrolled
// before the revocation timestamp also lose access until they re-enter the new code.
async function studentHasAccess(studentId, subjectId) {
  const [rows] = await db.query(
    `SELECT ss.id, ss.unlocked_at,
            s.code_active, s.code_expiration, s.code_max_usage, s.code_usage_count,
            s.last_revoked_at
     FROM student_subjects ss
     JOIN subjects s ON s.id = ss.subject_id
     WHERE ss.student_id = ? AND ss.subject_id = ?`,
    [studentId, subjectId]
  );
  if (rows.length === 0) return false;
  const r = rows[0];
  // Code disabled
  if (r.code_active === 0) return false;
  // Code expired
  if (r.code_expiration) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(r.code_expiration) < today) return false;
  }
  // v5 : code revoked AFTER this student unlocked the subject
  if (r.last_revoked_at && new Date(r.unlocked_at) < new Date(r.last_revoked_at)) {
    return false;
  }
  // (max_usage is checked at unlock time only — already-unlocked students keep access)
  return true;
}

// Helper : access via module_id (find its subject)
async function studentHasAccessViaModule(studentId, moduleId) {
  const [rows] = await db.query(
    `SELECT s.id AS subject_id
     FROM student_subjects ss
     JOIN modules m ON m.subject_id = ss.subject_id
     JOIN subjects s ON s.id = ss.subject_id
     WHERE ss.student_id = ? AND m.id = ?`,
    [studentId, moduleId]
  );
  if (rows.length === 0) return false;
  // Reuse the subject-level check (status of access code)
  return studentHasAccess(studentId, rows[0].subject_id);
}

// ============== SUBJECTS ==============
exports.getSubjectsForLevel = async (req, res) => {
  try {
    const [user] = await db.query('SELECT level FROM users WHERE id = ?', [req.user.id]);
    if (user.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const level = user[0].level;

    // "unlocked" = student has the row in student_subjects AND the access code is still valid
    // "code_blocked" = student had unlocked but the admin/teacher disabled or expired the code
    // "revoked"     = teacher changed the code with "revoke existing" : student must re-enter
    const [rows] = await db.query(
      `SELECT s.id, s.title, s.description, s.level, u.full_name AS teacher_name,
              s.code_active, s.code_expiration, s.last_revoked_at,
              ss.unlocked_at,
              CASE WHEN ss.id IS NULL THEN 0 ELSE 1 END AS unlocked,
              (SELECT COUNT(*) FROM modules WHERE subject_id = s.id) AS modules_count
       FROM subjects s
       JOIN users u ON s.teacher_id = u.id
       LEFT JOIN student_subjects ss
              ON ss.subject_id = s.id AND ss.student_id = ?
       WHERE s.level = ?
       ORDER BY s.id DESC`,
      [req.user.id, level]
    );

    // Annotate access status flags
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const annotated = rows.map(r => {
      let codeBlocked = false;
      let revoked = false;
      if (r.unlocked) {
        if (r.code_active === 0) codeBlocked = true;
        else if (r.code_expiration && new Date(r.code_expiration) < today) codeBlocked = true;
        // v5 : revocation = code changed after this student unlocked the subject
        if (r.last_revoked_at && r.unlocked_at &&
            new Date(r.unlocked_at) < new Date(r.last_revoked_at)) {
          revoked = true;
        }
      }
      return { ...r, code_blocked: codeBlocked ? 1 : 0, revoked: revoked ? 1 : 0 };
    });
    res.json(annotated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.unlockSubject = async (req, res) => {
  const { access_code } = req.body;
  if (!access_code) return res.status(400).json({ message: 'Code d\'accès requis' });
  try {
    const [user] = await db.query('SELECT level FROM users WHERE id = ?', [req.user.id]);
    const level = user[0].level;

    const [rows] = await db.query(
      'SELECT * FROM subjects WHERE access_code = ? AND level = ?',
      [access_code.toUpperCase().trim(), level]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Code invalide ou matière hors de votre niveau' });
    }
    const subject = rows[0];

    // v2 validations
    if (subject.code_active === 0) return res.status(403).json({ message: 'Ce code a été désactivé' });
    if (subject.code_expiration) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(subject.code_expiration) < today) {
        return res.status(403).json({ message: 'Ce code a expiré' });
      }
    }
    if (subject.code_max_usage !== null && subject.code_usage_count >= subject.code_max_usage) {
      return res.status(403).json({ message: 'Ce code a atteint son nombre maximum d\'utilisations' });
    }

    // v5 : if the student already has a row but it was revoked, refresh unlocked_at
    // so they regain access. Otherwise, INSERT IGNORE for new enrollments.
    const [[existing]] = await db.query(
      'SELECT id FROM student_subjects WHERE student_id = ? AND subject_id = ?',
      [req.user.id, subject.id]
    );

    if (existing) {
      // Already enrolled : refresh unlocked_at to "now" so the revocation check passes
      await db.query(
        'UPDATE student_subjects SET unlocked_at = NOW() WHERE id = ?',
        [existing.id]
      );
      logAction(req.user.id, req.user.email,
        `Re-saisie du code matière "${subject.title}" (accès restauré)`);
    } else {
      // First-time enrollment
      await db.query(
        'INSERT INTO student_subjects (student_id, subject_id) VALUES (?, ?)',
        [req.user.id, subject.id]
      );
      await db.query(
        'UPDATE subjects SET code_usage_count = code_usage_count + 1 WHERE id = ?',
        [subject.id]
      );
      logAction(req.user.id, req.user.email, `Déblocage matière "${subject.title}"`);
    }
    res.json({ message: 'Matière débloquée', subject_id: subject.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== MODULES (NEW v3) ==============
// GET /api/student/subjects/:id/modules
exports.getModules = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await studentHasAccess(req.user.id, id))) {
      return res.status(403).json({ message: 'Accès refusé. Entrez le code d\'accès.' });
    }
    db.query('UPDATE subjects SET views_count = views_count + 1 WHERE id = ?', [id]).catch(() => {});

    // Get VISIBLE modules + count of VISIBLE items per module
    // resources_count : only counts resources in (visible parts OR no part)
    // completed_count : only counts progress entries whose underlying item still exists AND is visible
    const [rows] = await db.query(
      `SELECT m.*,
              (SELECT COUNT(*) FROM resources r
                 LEFT JOIN parts p ON r.part_id = p.id
                 WHERE r.module_id = m.id AND r.visible = 1
                   AND (r.part_id IS NULL OR p.visible = 1)) AS resources_count,
              (SELECT COUNT(*) FROM quizzes q
                 LEFT JOIN parts p ON q.part_id = p.id
                 WHERE q.module_id = m.id
                   AND (q.part_id IS NULL OR p.visible = 1)) AS quizzes_count,
              (SELECT COUNT(*) FROM projects pr
                 LEFT JOIN parts p ON pr.part_id = p.id
                 WHERE pr.module_id = m.id
                   AND (pr.part_id IS NULL OR p.visible = 1)) AS projects_count,
              (
                (SELECT COUNT(*) FROM student_progress sp
                   JOIN resources r ON sp.item_id = r.id AND sp.item_type = 'resource'
                   LEFT JOIN parts p ON r.part_id = p.id
                   WHERE sp.student_id = ? AND sp.module_id = m.id AND r.visible = 1
                     AND (r.part_id IS NULL OR p.visible = 1))
                +
                (SELECT COUNT(*) FROM student_progress sp
                   JOIN quizzes q ON sp.item_id = q.id AND sp.item_type = 'quiz'
                   LEFT JOIN parts p ON q.part_id = p.id
                   WHERE sp.student_id = ? AND sp.module_id = m.id
                     AND (q.part_id IS NULL OR p.visible = 1))
                +
                (SELECT COUNT(*) FROM student_progress sp
                   JOIN projects pr ON sp.item_id = pr.id AND sp.item_type = 'project'
                   LEFT JOIN parts p ON pr.part_id = p.id
                   WHERE sp.student_id = ? AND sp.module_id = m.id
                     AND (pr.part_id IS NULL OR p.visible = 1))
              ) AS completed_count
       FROM modules m
       WHERE m.subject_id = ? AND m.visible = 1
       ORDER BY m.order_index ASC, m.id ASC`,
      [req.user.id, req.user.id, req.user.id, id]
    );
    // Cap : completed_count cannot exceed total
    const safe = rows.map(r => ({
      ...r,
      completed_count: Math.min(
        r.completed_count || 0,
        (r.resources_count || 0) + (r.quizzes_count || 0) + (r.projects_count || 0)
      ),
    }));
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/student/modules/:id  -> module detail with all content + per-item completion
exports.getModuleDetail = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await studentHasAccessViaModule(req.user.id, id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const [moduleRows] = await db.query('SELECT * FROM modules WHERE id = ?', [id]);
    if (moduleRows.length === 0) return res.status(404).json({ message: 'Module introuvable' });
    // Block access to hidden modules
    if (moduleRows[0].visible === 0) {
      return res.status(404).json({ message: 'Module introuvable' });
    }

    // Only visible parts (or NULL part_id = "directly attached to module")
    const [parts] = await db.query(
      'SELECT * FROM parts WHERE module_id = ? AND visible = 1 ORDER BY order_index ASC, id ASC',
      [id]
    );
    const visiblePartIds = parts.map(p => p.id);

    // Resources : visible AND (part_id IS NULL OR part_id IN visible parts)
    let resources;
    if (visiblePartIds.length > 0) {
      const [r] = await db.query(
        `SELECT * FROM resources
         WHERE module_id = ? AND visible = 1
           AND (part_id IS NULL OR part_id IN (?))
         ORDER BY id ASC`,
        [id, visiblePartIds]
      );
      resources = r;
    } else {
      // No visible parts → only show resources without part_id
      const [r] = await db.query(
        `SELECT * FROM resources
         WHERE module_id = ? AND visible = 1 AND part_id IS NULL
         ORDER BY id ASC`,
        [id]
      );
      resources = r;
    }

    const [quizzes]   = await db.query(
      `SELECT q.id, q.title, q.part_id FROM quizzes q
       LEFT JOIN parts p ON q.part_id = p.id
       WHERE q.module_id = ? AND (q.part_id IS NULL OR p.visible = 1)`,
      [id]
    );
    const [projects]  = await db.query(
      `SELECT pr.* FROM projects pr
       LEFT JOIN parts p ON pr.part_id = p.id
       WHERE pr.module_id = ? AND (pr.part_id IS NULL OR p.visible = 1)
       ORDER BY pr.id ASC`,
      [id]
    );

    // Get this student's progress entries for this module
    const [progress] = await db.query(
      'SELECT item_type, item_id, score, total FROM student_progress WHERE student_id = ? AND module_id = ?',
      [req.user.id, id]
    );

    // Build a quick lookup map
    const progressMap = {};
    for (const p of progress) progressMap[`${p.item_type}_${p.item_id}`] = p;

    // Annotate each item with "completed: true/false" + score for quizzes
    const annotatedResources = resources.map(r => ({ ...r, completed: !!progressMap[`resource_${r.id}`] }));
    const annotatedQuizzes   = quizzes.map(q => {
      const p = progressMap[`quiz_${q.id}`];
      return { ...q, completed: !!p, score: p?.score ?? null, total: p?.total ?? null };
    });

    // For projects: did the student already submit?
    const [submissions] = await db.query(
      `SELECT project_id, file_path, submitted_at FROM project_submissions
       WHERE student_id = ? AND project_id IN (?)`,
      [req.user.id, projects.length ? projects.map(p => p.id) : [0]]
    );
    const subMap = {};
    for (const s of submissions) subMap[s.project_id] = s;
    const annotatedProjects = projects.map(p => ({
      ...p,
      submission: subMap[p.id] || null,
      completed: !!subMap[p.id],
    }));

    res.json({
      ...moduleRows[0],
      parts,
      resources: annotatedResources,
      quizzes: annotatedQuizzes,
      projects: annotatedProjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/student/progress  body: { item_type, item_id, module_id }
// Marks a resource as opened (idempotent).
exports.markProgress = async (req, res) => {
  const { item_type, item_id, module_id } = req.body;
  if (!['resource', 'quiz', 'project'].includes(item_type) || !item_id || !module_id) {
    return res.status(400).json({ message: 'Paramètres invalides' });
  }
  try {
    if (!(await studentHasAccessViaModule(req.user.id, module_id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // v3.2 : reject if the module or the resource is hidden
    const [mod] = await db.query('SELECT visible FROM modules WHERE id = ?', [module_id]);
    if (mod.length === 0 || mod[0].visible === 0) {
      return res.status(403).json({ message: 'Contenu non disponible' });
    }
    if (item_type === 'resource') {
      const [r] = await db.query('SELECT visible FROM resources WHERE id = ?', [item_id]);
      if (r.length === 0 || r[0].visible === 0) {
        return res.status(403).json({ message: 'Ressource non disponible' });
      }
    }

    await db.query(
      `INSERT IGNORE INTO student_progress (student_id, item_type, item_id, module_id)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, item_type, item_id, module_id]
    );
    res.json({ message: 'Progression enregistrée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============== QUIZZES ==============
// REMOVED in v4 — quiz logic moved to controllers/quizController.js
// Old endpoints have been deleted. New endpoints live under /api/quiz/student/*

// ============== PROJECT SUBMISSIONS ==============
// POST /api/student/projects/:id/submit  (multipart, file field "file")
exports.submitProject = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Fichier requis' });
  try {
    const [projectRows] = await db.query(
      `SELECT p.*, m.subject_id FROM projects p
       JOIN modules m ON p.module_id = m.id
       WHERE p.id = ?`, [id]
    );
    if (projectRows.length === 0) return res.status(404).json({ message: 'Projet introuvable' });
    if (!(await studentHasAccess(req.user.id, projectRows[0].subject_id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const moduleId = projectRows[0].module_id;

    // If a previous submission exists, replace its file_path
    const [existing] = await db.query(
      'SELECT id FROM project_submissions WHERE project_id = ? AND student_id = ?',
      [id, req.user.id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE project_submissions SET file_path = ?, note = ?, submitted_at = NOW() WHERE id = ?',
        [req.file.filename, note || null, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO project_submissions (project_id, student_id, file_path, note) VALUES (?, ?, ?, ?)',
        [id, req.user.id, req.file.filename, note || null]
      );
    }

    // Mark progress
    await db.query(
      `INSERT IGNORE INTO student_progress (student_id, item_type, item_id, module_id)
       VALUES (?, 'project', ?, ?)`,
      [req.user.id, id, moduleId]
    );
    logAction(req.user.id, req.user.email, `Dépôt projet #${id}`);
    res.json({ message: 'Projet déposé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

// ============== PROGRESS OVERVIEW ==============
// GET /api/student/progress -> overview by subject
exports.getProgress = async (req, res) => {
  try {
    // total_items  = sum of VISIBLE resources + quizzes + projects in VISIBLE modules
    // completed_items = student_progress entries whose underlying item still exists AND is visible.
    //   This way, if the teacher deletes or hides a resource, the progress correctly drops.
    const [rows] = await db.query(
      `SELECT
         s.id AS subject_id, s.title AS subject_title, s.level,
         (SELECT COUNT(*) FROM modules WHERE subject_id = s.id AND visible = 1) AS total_modules,
         (
           (SELECT COUNT(*) FROM resources r JOIN modules m ON r.module_id = m.id
              LEFT JOIN parts pt ON r.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1 AND r.visible = 1
                AND (r.part_id IS NULL OR pt.visible = 1)) +
           (SELECT COUNT(*) FROM quizzes q JOIN modules m ON q.module_id = m.id
              LEFT JOIN parts pt ON q.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1
                AND (q.part_id IS NULL OR pt.visible = 1)) +
           (SELECT COUNT(*) FROM projects pr JOIN modules m ON pr.module_id = m.id
              LEFT JOIN parts pt ON pr.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1
                AND (pr.part_id IS NULL OR pt.visible = 1))
         ) AS total_items,
         (
           -- completed RESOURCES still existing AND visible (part visible too)
           (SELECT COUNT(*) FROM student_progress sp
              JOIN modules   m ON sp.module_id = m.id
              JOIN resources r ON sp.item_id = r.id AND sp.item_type = 'resource'
              LEFT JOIN parts pt ON r.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1 AND r.visible = 1
                AND (r.part_id IS NULL OR pt.visible = 1)
                AND sp.student_id = ?)
           +
           -- completed QUIZZES still existing AND in visible part
           (SELECT COUNT(*) FROM student_progress sp
              JOIN modules m ON sp.module_id = m.id
              JOIN quizzes q ON sp.item_id = q.id AND sp.item_type = 'quiz'
              LEFT JOIN parts pt ON q.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1
                AND (q.part_id IS NULL OR pt.visible = 1)
                AND sp.student_id = ?)
           +
           -- completed PROJECTS still existing AND in visible part
           (SELECT COUNT(*) FROM student_progress sp
              JOIN modules  m ON sp.module_id = m.id
              JOIN projects pr ON sp.item_id = pr.id AND sp.item_type = 'project'
              LEFT JOIN parts pt ON pr.part_id = pt.id
              WHERE m.subject_id = s.id AND m.visible = 1
                AND (pr.part_id IS NULL OR pt.visible = 1)
                AND sp.student_id = ?)
         ) AS completed_items
       FROM student_subjects ss
       JOIN subjects s ON ss.subject_id = s.id
       WHERE ss.student_id = ?
       ORDER BY s.title`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    // Defensive cap : completed should never exceed total
    const safe = rows.map(r => ({
      ...r,
      completed_items: Math.min(r.completed_items || 0, r.total_items || 0),
    }));
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
