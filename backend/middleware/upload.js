// backend/middleware/upload.js (v3)
// Two upload configurations:
//   - uploadPdf : for course/TP/evaluation resources (PDF only)
//   - uploadProject : for student project submissions (PDF / ZIP / images)
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + safeName);
  },
});

// PDF only (cours, TP, évaluation)
const uploadPdf = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Project submissions: accept PDF, ZIP, common archives, images
const uploadProject = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/octet-stream', // some browsers send ZIP as this
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format de fichier non autorisé (PDF, ZIP ou image uniquement)'), false);
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for projects
});

module.exports = { uploadPdf, uploadProject };
