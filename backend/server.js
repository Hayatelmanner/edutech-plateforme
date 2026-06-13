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

// ⚙️ Configuration CORS pour autoriser Vercel + localhost en dev
const allowedOrigins = [
  'http://localhost:3000',           // Vite local
  'http://localhost:5173',           // Vite alt port
  process.env.FRONTEND_URL,          // Vercel (défini dans Render)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, scripts, ressources)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Non autorisé par CORS'));
  },
  credentials: true,
}));

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
  res.json({
    status: 'ok',
    message: 'EduTech API is running.',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Global error handler (handles multer errors etc.)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduTech API running on port ${PORT}`);
});