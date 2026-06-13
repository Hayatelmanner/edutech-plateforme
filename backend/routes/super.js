// backend/routes/super.js (v2)
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/superController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes here require Super User role
router.use(verifyToken, requireRole('super'));

// Dashboard + activity
router.get('/dashboard', ctrl.getDashboard);
router.get('/logs', ctrl.getLogs);

// Teachers
router.get('/teachers', ctrl.getTeachers);
router.post('/teachers', ctrl.createTeacher);
router.put('/teachers/:id', ctrl.updateTeacher);
router.delete('/teachers/:id', ctrl.deleteTeacher);
router.patch('/teachers/:id/status', ctrl.toggleTeacherStatus);
router.post('/teachers/:id/reset-password', ctrl.resetTeacherPassword);
router.get('/teachers/:id/students', ctrl.getTeacherStudents);

// Students
router.get('/students', ctrl.getStudents);
router.get('/students/:id/subjects', ctrl.getStudentSubjects);
router.patch('/students/:id/status', ctrl.toggleStudentStatus);
router.delete('/students/:id', ctrl.deleteStudent);

// Subjects (full admin control)
router.get('/subjects', ctrl.getSubjects);
router.post('/subjects', ctrl.createSubject);
router.put('/subjects/:id', ctrl.updateSubject);
router.delete('/subjects/:id', ctrl.deleteSubject);
router.get('/subjects/:id/resources', ctrl.getSubjectResources);

// Access codes
router.get('/access-codes', ctrl.getAccessCodes);
router.patch('/access-codes/:subjectId', ctrl.updateAccessCode);

module.exports = router;
