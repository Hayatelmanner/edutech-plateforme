// backend/controllers/quizController.js (v4)
// Module Quiz refactoré : un seul controller pour toutes les actions quiz.
//
// Types de questions supportés :
//   - mcq_single   : QCM à 1 bonne réponse
//   - mcq_multi    : QCM à plusieurs bonnes réponses
//   - true_false   : Vrai / Faux (2 options stockées comme mcq_single)
//   - short_answer : réponse courte (comparée avec correct_text, insensible à la casse)

const db = require('../config/db');
const { logAction } = require('../utils/logger');

// ================================================================
//  HELPERS - ownership checks
// ================================================================

async function teacherOwnsQuiz(teacherId, quizId) {
  const [r] = await db.query(
    `SELECT q.id FROM quizzes q
     JOIN subjects s ON s.id = q.subject_id
     WHERE q.id = ? AND s.teacher_id = ?`,
    [quizId, teacherId]
  );
  return r.length > 0;
}

async function teacherOwnsQuestion(teacherId, questionId) {
  const [r] = await db.query(
    `SELECT qq.id FROM quiz_questions qq
     JOIN quizzes q ON q.id = qq.quiz_id
     JOIN subjects s ON s.id = q.subject_id
     WHERE qq.id = ? AND s.teacher_id = ?`,
    [questionId, teacherId]
  );
  return r.length > 0;
}

// Check that the student has unlocked the subject of this quiz AND that
// the access code is still active (using same rules as studentController)
async function studentCanAccessQuiz(studentId, quizId) {
  const [rows] = await db.query(
    `SELECT q.id, q.is_active,
            s.code_active, s.code_expiration, s.last_revoked_at,
            ss.unlocked_at
     FROM quizzes q
     JOIN subjects s ON s.id = q.subject_id
     JOIN student_subjects ss ON ss.subject_id = s.id AND ss.student_id = ?
     WHERE q.id = ?`,
    [studentId, quizId]
  );
  if (rows.length === 0) return false;
  const r = rows[0];
  if (r.is_active === 0) return false;
  if (r.code_active === 0) return false;
  if (r.code_expiration) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(r.code_expiration) < today) return false;
  }
  // v5 : revoked after this student's enrollment
  if (r.last_revoked_at && new Date(r.unlocked_at) < new Date(r.last_revoked_at)) {
    return false;
  }
  return true;
}

// ================================================================
//  TEACHER — Quiz CRUD
// ================================================================

// POST /api/quiz/teacher/quizzes
// Body : module_id, part_id, title, description, duration_minutes, max_attempts,
//        pass_score, show_correction, is_active, display_mode, questions
//
// questions : [{
//   type, text, image_url, points, feedback, order_index,
//   options: [{ text, is_correct, order_index }],  // pour mcq_*, true_false
//   correct_text: '...'                             // pour short_answer
// }]
exports.createQuiz = async (req, res) => {
  const {
    module_id, part_id, title, description,
    duration_minutes, max_attempts, pass_score, show_correction,
    is_active, display_mode, questions,
  } = req.body;

  if (!module_id || !part_id || !title) {
    return res.status(400).json({ message: 'module_id, part_id et titre requis' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'Au moins une question est requise' });
  }

  try {
    // Verify ownership
    const [own] = await db.query(
      `SELECT m.subject_id FROM modules m
       JOIN subjects s ON s.id = m.subject_id
       WHERE m.id = ? AND s.teacher_id = ?`,
      [module_id, req.user.id]
    );
    if (own.length === 0) return res.status(404).json({ message: 'Module introuvable' });
    const subjectId = own[0].subject_id;

    // Verify part belongs to this module
    const [parts] = await db.query(
      'SELECT id FROM parts WHERE id = ? AND module_id = ?',
      [part_id, module_id]
    );
    if (parts.length === 0) return res.status(400).json({ message: 'Partie invalide' });

    // Insert quiz
    const [qr] = await db.query(
      `INSERT INTO quizzes (
        subject_id, module_id, part_id, title, description,
        duration_minutes, max_attempts, pass_score,
        show_correction, is_active, display_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subjectId, module_id, part_id, title, description || null,
        duration_minutes || null, max_attempts || null, pass_score ?? 50,
        show_correction ? 1 : 0, is_active === undefined ? 1 : (is_active ? 1 : 0),
        display_mode || 'one_by_one',
      ]
    );
    const quizId = qr.insertId;

    // Insert questions + options
    for (let i = 0; i < questions.length; i++) {
      await insertQuestion(quizId, questions[i], i);
    }

    logAction(req.user.id, req.user.email, `Création quiz "${title}"`);
    res.status(201).json({ id: quizId, message: 'Quiz créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Helper : insert one question + its options
async function insertQuestion(quizId, q, defaultOrder) {
  if (!q.type || !q.text) throw new Error('Question incomplète');

  const [ins] = await db.query(
    `INSERT INTO quiz_questions
       (quiz_id, type, question, image_url, points, feedback, order_index, correct_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quizId, q.type, q.text, q.image_url || null,
      q.points || 1, q.feedback || null,
      q.order_index ?? defaultOrder,
      q.type === 'short_answer' ? (q.correct_text || '').trim() : null,
    ]
  );
  const questionId = ins.insertId;

  // Insert options for MCQ/true_false
  if (q.type !== 'short_answer' && Array.isArray(q.options)) {
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      await db.query(
        'INSERT INTO quiz_options (question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?)',
        [questionId, opt.text, opt.is_correct ? 1 : 0, opt.order_index ?? j]
      );
    }
  }
}

// GET /api/quiz/teacher/quizzes/:id  -> full quiz detail with questions + options
exports.getQuizForTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    const quiz = await loadFullQuiz(id, /* includeCorrect */ true);
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Load helper used by both teacher and student
async function loadFullQuiz(quizId, includeCorrect) {
  const [[quizRow]] = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  if (!quizRow) return null;

  const [questions] = await db.query(
    `SELECT id, type, question, image_url, points, feedback, order_index, correct_text
     FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC`,
    [quizId]
  );

  for (const q of questions) {
    const [opts] = await db.query(
      `SELECT id, text, ${includeCorrect ? 'is_correct,' : ''} order_index
       FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC`,
      [q.id]
    );
    q.options = opts;
    // Hide correct_text from students
    if (!includeCorrect) delete q.correct_text;
  }
  return { ...quizRow, questions };
}

// PUT /api/quiz/teacher/quizzes/:id  -> update quiz settings + replace questions
// (replacing is simpler than partial diffing)
exports.updateQuiz = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, duration_minutes, max_attempts, pass_score,
    show_correction, is_active, display_mode, questions,
  } = req.body;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }

    await db.query(
      `UPDATE quizzes SET
        title = ?, description = ?,
        duration_minutes = ?, max_attempts = ?, pass_score = ?,
        show_correction = ?, is_active = ?, display_mode = ?
       WHERE id = ?`,
      [
        title, description || null,
        duration_minutes || null, max_attempts || null, pass_score ?? 50,
        show_correction ? 1 : 0, is_active ? 1 : 0,
        display_mode || 'one_by_one', id,
      ]
    );

    // Replace questions if provided
    if (Array.isArray(questions)) {
      // Cascade will drop options + answers tied to old questions? NO — answers reference questions,
      // so deleting questions would orphan/cascade attempts. To preserve attempts integrity, we
      // simply rebuild only when there are no attempts yet.
      const [[hasAttempts]] = await db.query(
        'SELECT COUNT(*) AS c FROM quiz_attempts WHERE quiz_id = ?', [id]
      );
      if (hasAttempts.c > 0) {
        return res.status(400).json({
          message: 'Impossible de modifier les questions : des apprenants ont déjà passé ce quiz. ' +
                   'Vous pouvez modifier les paramètres mais pas les questions.',
        });
      }
      await db.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [id]);
      for (let i = 0; i < questions.length; i++) {
        await insertQuestion(id, questions[i], i);
      }
    }

    logAction(req.user.id, req.user.email, `Modification quiz #${id}`);
    res.json({ message: 'Quiz mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/quiz/teacher/quizzes/:id
exports.deleteQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    await db.query('DELETE FROM quizzes WHERE id = ?', [id]);
    // Clean orphan progress entries
    await db.query('DELETE FROM student_progress WHERE item_type = "quiz" AND item_id = ?', [id]);
    logAction(req.user.id, req.user.email, `Suppression quiz #${id}`);
    res.json({ message: 'Quiz supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  TEACHER — Question CRUD (granular endpoints)
// ================================================================

// POST /api/quiz/teacher/quizzes/:quizId/questions
exports.addQuestion = async (req, res) => {
  const { quizId } = req.params;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, quizId))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    // Get next order_index
    const [[maxRow]] = await db.query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM quiz_questions WHERE quiz_id = ?',
      [quizId]
    );
    await insertQuestion(quizId, req.body, maxRow.next_order);
    res.status(201).json({ message: 'Question ajoutée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /api/quiz/teacher/questions/:id
exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsQuestion(req.user.id, id))) {
      return res.status(404).json({ message: 'Question introuvable' });
    }
    await db.query('DELETE FROM quiz_questions WHERE id = ?', [id]);
    res.json({ message: 'Question supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PATCH /api/quiz/teacher/questions/reorder
// body : { quiz_id, order: [questionId1, questionId2, ...] }
exports.reorderQuestions = async (req, res) => {
  const { quiz_id, order } = req.body;
  if (!quiz_id || !Array.isArray(order)) {
    return res.status(400).json({ message: 'Paramètres invalides' });
  }
  try {
    if (!(await teacherOwnsQuiz(req.user.id, quiz_id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    for (let i = 0; i < order.length; i++) {
      await db.query(
        'UPDATE quiz_questions SET order_index = ? WHERE id = ? AND quiz_id = ?',
        [i, order[i], quiz_id]
      );
    }
    res.json({ message: 'Ordre mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  TEACHER — Results & statistics
// ================================================================

// GET /api/quiz/teacher/quizzes/:id/results  -> list of attempts with student info
exports.getQuizResults = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }

    // Aggregated stats per student (latest attempt + count)
    const [students] = await db.query(
      `SELECT u.id AS student_id, u.full_name, u.email, u.level,
              COUNT(a.id) AS attempts_count,
              MAX(a.percentage) AS best_percentage,
              MAX(a.submitted_at) AS last_attempt_at,
              (SELECT a2.percentage FROM quiz_attempts a2
                 WHERE a2.quiz_id = ? AND a2.student_id = u.id
                       AND a2.submitted_at IS NOT NULL
                 ORDER BY a2.submitted_at DESC LIMIT 1) AS latest_percentage,
              (SELECT a2.passed FROM quiz_attempts a2
                 WHERE a2.quiz_id = ? AND a2.student_id = u.id
                       AND a2.submitted_at IS NOT NULL
                 ORDER BY a2.submitted_at DESC LIMIT 1) AS latest_passed
       FROM quiz_attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.quiz_id = ? AND a.submitted_at IS NOT NULL
       GROUP BY u.id, u.full_name, u.email, u.level
       ORDER BY last_attempt_at DESC`,
      [id, id, id]
    );

    // Quiz-level stats
    const [[stats]] = await db.query(
      `SELECT
         COUNT(DISTINCT student_id) AS unique_students,
         COUNT(*) AS total_attempts,
         AVG(percentage) AS average_percentage,
         SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passed_count
       FROM quiz_attempts
       WHERE quiz_id = ? AND submitted_at IS NOT NULL`,
      [id]
    );

    res.json({
      stats: {
        unique_students: stats.unique_students || 0,
        total_attempts: stats.total_attempts || 0,
        average_percentage: stats.average_percentage
          ? Math.round(stats.average_percentage * 10) / 10 : 0,
        passed_count: stats.passed_count || 0,
        success_rate: stats.unique_students > 0
          ? Math.round((stats.passed_count / stats.unique_students) * 100) : 0,
      },
      students,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/quiz/teacher/quizzes/:id/students/:studentId/attempts
//   -> all attempts of one specific student on one quiz
exports.getStudentAttempts = async (req, res) => {
  const { id, studentId } = req.params;
  try {
    if (!(await teacherOwnsQuiz(req.user.id, id))) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    const [rows] = await db.query(
      `SELECT * FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND submitted_at IS NOT NULL
       ORDER BY submitted_at DESC`,
      [id, studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  STUDENT — Take quiz
// ================================================================

// GET /api/quiz/student/quizzes/:id  -> quiz to take (no correct answers leaked)
exports.getQuizForStudent = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await studentCanAccessQuiz(req.user.id, id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const quiz = await loadFullQuiz(id, /* includeCorrect */ false);
    if (!quiz) return res.status(404).json({ message: 'Quiz introuvable' });

    // Also include : how many attempts the student already made + best score
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS attempts_count,
              MAX(percentage) AS best_percentage
       FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND submitted_at IS NOT NULL`,
      [id, req.user.id]
    );
    quiz.attempts_count = stats.attempts_count || 0;
    quiz.best_percentage = stats.best_percentage || null;
    quiz.attempts_left = quiz.max_attempts !== null
      ? Math.max(0, quiz.max_attempts - quiz.attempts_count)
      : null;

    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/quiz/student/quizzes/:id/start  -> create a new attempt (and return its id)
exports.startAttempt = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await studentCanAccessQuiz(req.user.id, id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const [[quiz]] = await db.query('SELECT * FROM quizzes WHERE id = ?', [id]);
    if (!quiz) return res.status(404).json({ message: 'Quiz introuvable' });
    if (quiz.is_active === 0) {
      return res.status(403).json({ message: 'Ce quiz n\'est pas actif' });
    }

    // Check max attempts limit
    if (quiz.max_attempts !== null) {
      const [[cnt]] = await db.query(
        `SELECT COUNT(*) AS c FROM quiz_attempts
         WHERE quiz_id = ? AND student_id = ? AND submitted_at IS NOT NULL`,
        [id, req.user.id]
      );
      if (cnt.c >= quiz.max_attempts) {
        return res.status(403).json({
          message: `Vous avez atteint le nombre maximum de tentatives (${quiz.max_attempts})`,
        });
      }
    }

    const [r] = await db.query(
      'INSERT INTO quiz_attempts (quiz_id, student_id, started_at) VALUES (?, ?, NOW())',
      [id, req.user.id]
    );
    res.status(201).json({ attempt_id: r.insertId, started_at: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/quiz/student/attempts/:attemptId/submit
// Body : { answers: [{ question_id, selected_option_ids: [], text_answer: '' }] }
exports.submitAttempt = async (req, res) => {
  const { attemptId } = req.params;
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ message: 'Réponses invalides' });

  try {
    // Verify attempt belongs to this student and is not yet submitted
    const [[attempt]] = await db.query(
      'SELECT * FROM quiz_attempts WHERE id = ? AND student_id = ?',
      [attemptId, req.user.id]
    );
    if (!attempt) return res.status(404).json({ message: 'Tentative introuvable' });
    if (attempt.submitted_at) return res.status(400).json({ message: 'Tentative déjà soumise' });

    // Get quiz and questions
    const quiz = await loadFullQuiz(attempt.quiz_id, true);
    if (!quiz) return res.status(404).json({ message: 'Quiz introuvable' });

    let score = 0;
    let maxScore = 0;

    // Index answers by question_id for quick lookup
    const answersByQ = {};
    for (const a of answers) answersByQ[a.question_id] = a;

    // Evaluate each question
    for (const q of quiz.questions) {
      maxScore += q.points || 1;
      const studentAnswer = answersByQ[q.id];
      let isCorrect = false;
      let pointsEarned = 0;
      let selectedIds = null;
      let textAns = null;

      if (studentAnswer) {
        if (q.type === 'short_answer') {
          textAns = (studentAnswer.text_answer || '').trim();
          isCorrect = textAns.toLowerCase() === (q.correct_text || '').trim().toLowerCase();
        } else {
          // mcq_single / mcq_multi / true_false
          selectedIds = Array.isArray(studentAnswer.selected_option_ids)
            ? studentAnswer.selected_option_ids
            : [];
          const correctIds = q.options.filter(o => o.is_correct).map(o => o.id);

          if (q.type === 'mcq_multi') {
            // All correct AND no incorrect
            const sortedSel = [...selectedIds].sort();
            const sortedCor = [...correctIds].sort();
            isCorrect = sortedSel.length === sortedCor.length &&
                        sortedSel.every((v, i) => v === sortedCor[i]);
          } else {
            // mcq_single, true_false : 1 correct option, student must pick it
            isCorrect = selectedIds.length === 1 && correctIds.includes(selectedIds[0]);
          }
        }
        if (isCorrect) pointsEarned = q.points || 1;
        score += pointsEarned;
      }

      // Save answer
      await db.query(
        `INSERT INTO quiz_answers
           (attempt_id, question_id, selected_option_ids, text_answer, is_correct, points_earned)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          attemptId, q.id,
          selectedIds ? JSON.stringify(selectedIds) : null,
          textAns,
          isCorrect ? 1 : 0,
          pointsEarned,
        ]
      );
    }

    const percentage = maxScore > 0
      ? Math.round((score / maxScore) * 10000) / 100  // 2 decimals
      : 0;
    const passed = percentage >= (quiz.pass_score || 50) ? 1 : 0;
    const timeSpent = Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    await db.query(
      `UPDATE quiz_attempts SET
        submitted_at = NOW(),
        score = ?, max_score = ?, percentage = ?, passed = ?, time_spent_seconds = ?
       WHERE id = ?`,
      [score, maxScore, percentage, passed, timeSpent, attemptId]
    );

    // Update student_progress (best score wins) - so the module progress tracking still works
    await db.query(
      `INSERT INTO student_progress
         (student_id, item_type, item_id, module_id, score, total)
       VALUES (?, 'quiz', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         score = GREATEST(VALUES(score), score),
         total = VALUES(total)`,
      [req.user.id, attempt.quiz_id, quiz.module_id, score, maxScore]
    );

    logAction(req.user.id, req.user.email,
      `Quiz #${attempt.quiz_id} soumis (${score}/${maxScore})`);

    res.json({
      attempt_id: Number(attemptId),
      score, max_score: maxScore, percentage,
      passed: !!passed, time_spent_seconds: timeSpent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ================================================================
//  STUDENT — Results & history
// ================================================================

// GET /api/quiz/student/attempts/:attemptId  -> detailed result (with correction if allowed)
exports.getAttemptResult = async (req, res) => {
  const { attemptId } = req.params;
  try {
    const [[attempt]] = await db.query(
      'SELECT * FROM quiz_attempts WHERE id = ? AND student_id = ?',
      [attemptId, req.user.id]
    );
    if (!attempt) return res.status(404).json({ message: 'Tentative introuvable' });
    if (!attempt.submitted_at) return res.status(400).json({ message: 'Tentative non soumise' });

    const [[quiz]] = await db.query(
      `SELECT id, title, description, pass_score, show_correction
       FROM quizzes WHERE id = ?`,
      [attempt.quiz_id]
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz introuvable' });

    const includeCorrection = quiz.show_correction === 1;

    // Load questions + student answers
    const [questions] = await db.query(
      `SELECT id, type, question, image_url, points, feedback,
              ${includeCorrection ? 'correct_text,' : ''} order_index
       FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC`,
      [attempt.quiz_id]
    );
    const [studentAnswers] = await db.query(
      'SELECT * FROM quiz_answers WHERE attempt_id = ?', [attemptId]
    );
    const answersByQ = {};
    for (const a of studentAnswers) {
      answersByQ[a.question_id] = {
        ...a,
        selected_option_ids: a.selected_option_ids
          ? (typeof a.selected_option_ids === 'string' ? JSON.parse(a.selected_option_ids) : a.selected_option_ids)
          : null,
      };
    }

    for (const q of questions) {
      const [opts] = await db.query(
        `SELECT id, text, ${includeCorrection ? 'is_correct,' : ''} order_index
         FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC`,
        [q.id]
      );
      q.options = opts;
      q.student_answer = answersByQ[q.id] || null;
      if (!includeCorrection) delete q.feedback;
    }

    res.json({ attempt, quiz, questions, show_correction: includeCorrection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/quiz/student/quizzes/:id/history -> list student's attempts on this quiz
exports.getStudentHistory = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await studentCanAccessQuiz(req.user.id, id))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const [rows] = await db.query(
      `SELECT id, started_at, submitted_at, score, max_score, percentage, passed, time_spent_seconds
       FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND submitted_at IS NOT NULL
       ORDER BY submitted_at DESC`,
      [id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
