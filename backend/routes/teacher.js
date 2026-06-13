// backend/routes/teacher.js (v3)
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadPdf } = require('../middleware/upload');

router.use(verifyToken, requireRole('teacher'));

// Profile
router.put('/profile', ctrl.updateProfile);

// My students (v6)
router.get('/my-students', ctrl.getMyStudents);

// Subjects
router.get('/subjects', ctrl.getSubjects);
router.post('/subjects', ctrl.createSubject);
router.put('/subjects/:id', ctrl.updateSubject);
router.delete('/subjects/:id', ctrl.deleteSubject);
router.post('/subjects/:id/regenerate-code', ctrl.regenerateAccessCode);
router.put('/subjects/:id/code', ctrl.setCustomAccessCode);

// Modules
router.get('/subjects/:id/modules', ctrl.getModules);
router.post('/subjects/:id/modules', ctrl.createModule);
router.get('/modules/:id', ctrl.getModuleDetail);
router.put('/modules/:id', ctrl.updateModule);
router.delete('/modules/:id', ctrl.deleteModule);
router.patch('/modules/:id/visibility', ctrl.toggleModuleVisibility);

// Parts (v3.3 : sections inside a module)
router.get('/modules/:id/parts', ctrl.getParts);
router.post('/modules/:id/parts', ctrl.createPart);
router.put('/parts/:id', ctrl.updatePart);
router.delete('/parts/:id', ctrl.deletePart);
router.patch('/parts/:id/visibility', ctrl.togglePartVisibility);

// Resources (within a module)
router.post('/modules/:id/resources', uploadPdf.single('file'), ctrl.createResource);
router.delete('/resources/:id', ctrl.deleteResource);
router.patch('/resources/:id/visibility', ctrl.toggleResourceVisibility);

// Quizzes (within a module)
// Quizzes (within a module) — REPLACED by /api/quiz/teacher/* in v4
// router.post('/modules/:id/quizzes', ctrl.createQuiz);
// router.get('/quizzes/:id', ctrl.getQuizDetail);
// router.delete('/quizzes/:id', ctrl.deleteQuiz);

// Projects (within a module)
router.post('/modules/:id/projects', ctrl.createProject);
router.delete('/projects/:id', ctrl.deleteProject);
router.get('/projects/:id/submissions', ctrl.getProjectSubmissions);

module.exports = router;
