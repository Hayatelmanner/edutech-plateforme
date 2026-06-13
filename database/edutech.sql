-- =========================================================
-- EduTech Platform - Schéma COMPLET consolidé (v1 -> v5)
-- =========================================================
-- Ce fichier regroupe en UN SEUL script l'état final de la base
-- après edutech.sql + v2 + v3 + v3.2 + v3.3 + v3.4 + v4 + v5.
--
-- À importer une seule fois dans phpMyAdmin (XAMPP).
-- (Inutile d'exécuter les anciennes migrations : tout est déjà inclus.)
-- =========================================================

DROP DATABASE IF EXISTS edutech;
CREATE DATABASE edutech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edutech;

-- ---------------------------------------------------------
-- 1. users (Super Admin + Enseignants + Apprenants)
-- ---------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super','teacher','student') NOT NULL,
    status ENUM('active','blocked') NOT NULL DEFAULT 'active',
    level ENUM('tronc_commun','1bac','2bac') DEFAULT NULL,   -- apprenants uniquement
    subject_specialty VARCHAR(100) DEFAULT NULL,             -- enseignants uniquement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_users_role (role)
);

-- ---------------------------------------------------------
-- 2. subjects (matières créées par les enseignants)
-- ---------------------------------------------------------
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    level ENUM('tronc_commun','1bac','2bac') NOT NULL,
    access_code VARCHAR(20) NOT NULL UNIQUE,                 -- code donné aux apprenants
    code_active TINYINT(1) NOT NULL DEFAULT 1,
    code_expiration DATE NULL DEFAULT NULL,
    code_max_usage INT NULL DEFAULT NULL,
    code_usage_count INT NOT NULL DEFAULT 0,
    last_revoked_at TIMESTAMP NULL DEFAULT NULL,             -- v5 : révocation des accès
    views_count INT NOT NULL DEFAULT 0,
    teacher_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 3. student_subjects (matières débloquées par un apprenant)
-- ---------------------------------------------------------
CREATE TABLE student_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,         -- comparé à last_revoked_at
    UNIQUE KEY unique_pair (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 4. modules (chaque matière contient plusieurs modules)
-- ---------------------------------------------------------
CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_modules_subject (subject_id, order_index)
);

-- ---------------------------------------------------------
-- 5. parts (un module est découpé en parties)
-- ---------------------------------------------------------
CREATE TABLE parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    INDEX idx_parts_module (module_id, order_index)
);

-- ---------------------------------------------------------
-- 6. resources (cours, résumés, vidéos, TP, évaluations...)
-- ---------------------------------------------------------
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    module_id INT NULL,
    part_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    type ENUM(
        'pdf_course',   -- cours PDF
        'summary',      -- résumé (texte/HTML)
        'video',        -- vidéo (URL externe)
        'image',        -- schéma (URL externe)
        'interactive',  -- activité interactive
        'tp',           -- travaux pratiques (PDF)
        'evaluation',   -- évaluation pratique (PDF)
        'course'        -- ancien type (compatibilité)
    ) NOT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    content_html TEXT DEFAULT NULL,
    url VARCHAR(500) NULL,
    visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id)   REFERENCES parts(id)   ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 7. quizzes (rattachés à un module / une partie)
-- ---------------------------------------------------------
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    module_id INT NULL,
    part_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NULL DEFAULT NULL,                  -- NULL = pas de limite
    max_attempts INT NULL DEFAULT NULL,                      -- NULL = illimité
    pass_score INT NOT NULL DEFAULT 50,                      -- % minimum pour réussir
    show_correction TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    display_mode ENUM('one_by_one','all_at_once') NOT NULL DEFAULT 'one_by_one',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id)   REFERENCES parts(id)   ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 8. quiz_questions (QCM, vrai/faux, réponse courte...)
-- ---------------------------------------------------------
CREATE TABLE quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    type ENUM('mcq_single','mcq_multi','true_false','short_answer') NOT NULL DEFAULT 'mcq_single',
    image_url VARCHAR(500) NULL,
    points INT NOT NULL DEFAULT 1,
    feedback TEXT NULL,
    order_index INT NOT NULL DEFAULT 0,
    correct_text VARCHAR(500) NULL,                          -- pour les réponses courtes
    question TEXT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 9. quiz_options (options de réponse)
-- ---------------------------------------------------------
CREATE TABLE quiz_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
    INDEX idx_options_question (question_id, order_index)
);

-- ---------------------------------------------------------
-- 10. quiz_attempts (historique des tentatives)
-- ---------------------------------------------------------
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL DEFAULT NULL,                -- NULL = en cours
    score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    time_spent_seconds INT NULL DEFAULT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_attempts_quiz (quiz_id),
    INDEX idx_attempts_student (student_id, quiz_id)
);

-- ---------------------------------------------------------
-- 11. quiz_answers (réponse par question dans une tentative)
-- ---------------------------------------------------------
CREATE TABLE quiz_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_ids JSON NULL,                           -- array d'ids pour les QCM
    text_answer VARCHAR(500) NULL,                           -- pour les réponses courtes
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    points_earned INT NOT NULL DEFAULT 0,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
    INDEX idx_answers_attempt (attempt_id)
);

-- ---------------------------------------------------------
-- 12. projects (mini-projets posés par l'enseignant)
-- ---------------------------------------------------------
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    part_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id)   REFERENCES parts(id)   ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 13. project_submissions (dépôts des apprenants)
-- ---------------------------------------------------------
CREATE TABLE project_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    note TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subm_project (project_id),
    INDEX idx_subm_student (student_id)
);

-- ---------------------------------------------------------
-- 14. student_progress (suivi détaillé item par item)
-- ---------------------------------------------------------
CREATE TABLE student_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    item_type ENUM('resource','quiz','project') NOT NULL,
    item_id INT NOT NULL,
    module_id INT NOT NULL,
    score INT NULL,
    total INT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_progress (student_id, item_type, item_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    INDEX idx_progress_student (student_id),
    INDEX idx_progress_module (module_id)
);

-- ---------------------------------------------------------
-- 15. logs (journal d'activité)
-- ---------------------------------------------------------
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_email VARCHAR(150) NULL,                            -- snapshot si l'utilisateur est supprimé
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_logs_created (created_at)
);

-- =========================================================
-- DONNÉES INITIALES
-- =========================================================
-- Super Admin  -> super@edutech.com / super123
-- Enseignant   -> ahmed@edutech.com / teacher123
-- (mots de passe déjà hachés en bcrypt)
-- =========================================================
INSERT INTO users (full_name, email, password, role) VALUES
('Super Admin',
 'super@edutech.com',
 '$2b$10$yGzLantSjktO4k8hdAlMb.q35rr9GBreqW1HdjqUN0ZTKZ9p7PRSe',
 'super');

INSERT INTO users (full_name, email, password, role, subject_specialty) VALUES
('Mr. Ahmed',
 'ahmed@edutech.com',
 '$2b$10$DGAeXewJ6ue15X/M.fxBjOPhKyeMoi67JWHHgcfKSpDgHAYl1mUiW',
 'teacher',
 'Mathématiques');
