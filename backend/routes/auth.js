// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register-student', ctrl.registerStudent);
router.get('/me', verifyToken, ctrl.me);

module.exports = router;
