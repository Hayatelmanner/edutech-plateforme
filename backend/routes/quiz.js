// backend/routes/quiz.js (v4)
// Routes du module Quiz refactoré.
// Préfixe : /api/quiz
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quizController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ============== TEACHER ==============
router.post(  '/teacher/quizzes',
  verifyToken, requireRole('teacher'), ctrl.createQuiz);
router.get(   '/teacher/quizzes/:id',
  verifyToken, requireRole('teacher'), ctrl.getQuizForTeacher);
router.put(   '/teacher/quizzes/:id',
  verifyToken, requireRole('teacher'), ctrl.updateQuiz);
router.delete('/teacher/quizzes/:id',
  verifyToken, requireRole('teacher'), ctrl.deleteQuiz);

// Granular question CRUD
router.post(  '/teacher/quizzes/:quizId/questions',
  verifyToken, requireRole('teacher'), ctrl.addQuestion);
router.delete('/teacher/questions/:id',
  verifyToken, requireRole('teacher'), ctrl.deleteQuestion);
router.patch( '/teacher/questions/reorder',
  verifyToken, requireRole('teacher'), ctrl.reorderQuestions);

// Results & statistics
router.get(   '/teacher/quizzes/:id/results',
  verifyToken, requireRole('teacher'), ctrl.getQuizResults);
router.get(   '/teacher/quizzes/:id/students/:studentId/attempts',
  verifyToken, requireRole('teacher'), ctrl.getStudentAttempts);

// ============== STUDENT ==============
router.get(   '/student/quizzes/:id',
  verifyToken, requireRole('student'), ctrl.getQuizForStudent);
router.post(  '/student/quizzes/:id/start',
  verifyToken, requireRole('student'), ctrl.startAttempt);
router.post(  '/student/attempts/:attemptId/submit',
  verifyToken, requireRole('student'), ctrl.submitAttempt);
router.get(   '/student/attempts/:attemptId',
  verifyToken, requireRole('student'), ctrl.getAttemptResult);
router.get(   '/student/quizzes/:id/history',
  verifyToken, requireRole('student'), ctrl.getStudentHistory);

module.exports = router;
