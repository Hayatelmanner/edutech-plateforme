// backend/config/db.js
// MySQL connection pool using mysql2
const mysql = require('mysql2');
require('dotenv').config();

// ⚙️ Configuration adaptative : SSL en production (Railway), pas en local (XAMPP)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
};

// 🔐 Activer SSL uniquement en production (Railway exige SSL)
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

// 🧪 Test de connexion au démarrage
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erreur de connexion MySQL:', err.message);
  } else {
    console.log('✅ MySQL connecté avec succès');
    connection.release();
  }
});

// Export the promise-based version for async/await
module.exports = pool.promise();