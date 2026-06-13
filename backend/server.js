// backend/server.js
// EduTech main API server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const superRoutes = require('./routes/super');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const quizRoutes = require('./routes/quiz');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static folder for uploaded PDFs (accessible at /uploads/<filename>)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/super', superRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/quiz', quizRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('EduTech API is running.');
});

// Global error handler (handles multer errors etc.)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduTech API running on http://localhost:${PORT}`);
});
