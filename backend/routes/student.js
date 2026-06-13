// backend/routes/student.js (v3)
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadProject } = require('../middleware/upload');

router.use(verifyToken, requireRole('student'));

// Subjects
router.get('/subjects', ctrl.getSubjectsForLevel);
router.post('/unlock', ctrl.unlockSubject);

// Modules
router.get('/subjects/:id/modules', ctrl.getModules);
router.get('/modules/:id', ctrl.getModuleDetail);

// Quizzes
// Quizzes — REPLACED by /api/quiz/student/* in v4
// router.get('/quizzes/:id', ctrl.getQuizForStudent);
// router.post('/quizzes/:id/submit', ctrl.submitQuiz);

// Project submissions
router.post('/projects/:id/submit', uploadProject.single('file'), ctrl.submitProject);

// Progress
router.post('/progress', ctrl.markProgress);
router.get('/progress', ctrl.getProgress);

module.exports = router;
