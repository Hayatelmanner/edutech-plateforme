<div align="center">

# 🎓 EduTech — Plateforme Éducative

### Plateforme éducative et ressources pédagogiques interactives pour le Tronc Commun marocain

---

## 📖 À propos

**EduTech** est une plateforme MVP avec **3 rôles** (Super User, Enseignant, Apprenant) permettant la gestion de matières, l'utilisation de codes d'accès, l'upload de PDF, la création de quiz QCM et l'intégration de ressources pédagogiques interactives.


## 🛠️ Technologies utilisées

| Côté | Technologies |
|------|--------------|
| **Frontend** | React 18, Vite, React Router, Axios |
| **Backend** | Node.js, Express, JWT, bcryptjs, multer |
| **Base de données** | MySQL 8 (via XAMPP en local) |
| **Ressources interactives** | HTML5, CSS3, JavaScript natif |

---

## 📁 Structure du projet

```
edutech/
├── backend/                  # API Node.js + Express
│   ├── config/db.js          # Connexion MySQL
│   ├── controllers/          # Logique métier (auth, super, teacher, student)
│   ├── middleware/           # JWT auth + upload PDF
│   ├── routes/               # Routes API
│   ├── uploads/              # PDFs uploadés (créé automatiquement)
│   ├── .env                  # Variables d'environnement (à créer)
│   ├── .env.example          # Modèle à copier
│   ├── server.js             # Point d'entrée
│   └── package.json
│
├── database/
│   └── edutech.sql           # Schéma + données initiales
│
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/       # Navbar, ProtectedRoute
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Home, auth, super, teacher, student
│   │   ├── services/api.js
│   │   ├── styles/global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── ressources-interactives/  # 5 ressources HTML autonomes
│   ├── carte_mentale_globale.html
│   ├── Carte_mentale_les_logiciles.html
│   ├── Donnée_Traitement_Résultat.html
│   ├── Mini_jeu_Traduis_en_binaire.html
│   └── Jeu-de-classement-des-peripheriques.html
│
├── .gitignore
├── LICENSE
└── README.md                 # Ce fichier
```

---

## 🛠️ Prérequis

Avant de commencer, installez les logiciels suivants :

| Logiciel | Version | Lien de téléchargement |
|----------|---------|-------------------------|
| **Node.js** | 18 ou + | [nodejs.org](https://nodejs.org) (version LTS) |
| **XAMPP** | dernière | [apachefriends.org](https://www.apachefriends.org) |
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |
| **VS Code** *(recommandé)* | dernière | [code.visualstudio.com](https://code.visualstudio.com) |

### Vérification de l'installation

Ouvrez un terminal et tapez :

```bash
node -v       # doit afficher v18.x.x ou +
npm -v        # doit afficher 9.x.x ou +
git --version # doit afficher git version 2.x.x
```

---

## 📥 Installation pas-à-pas

### Étape 1 — Télécharger le projet

#### Option A : Cloner avec Git (recommandé)
```bash
git clone https://github.com/Hayatelmanner/edutech-plateforme.git
cd edutech-plateforme
```

#### Option B : Télécharger en ZIP
1. Sur la page GitHub du projet → bouton vert **"Code"** → **"Download ZIP"**
2. Décompresser le ZIP dans un dossier (ex : `C:\edutech-plateforme\`)
3. Ouvrir un terminal dans ce dossier

---

### Étape 2 — Démarrer XAMPP

1. Ouvrir **XAMPP Control Panel**
2. Cliquer sur **Start** à côté de :
   - ✅ **Apache**
   - ✅ **MySQL**
3. Vérifier que MySQL tourne sur le port **3306** (par défaut)

> 💡 Si MySQL ne démarre pas, vérifier qu'un autre service (comme MySQL Workbench) n'utilise pas déjà le port 3306.

---

### Étape 3 — Importer la base de données

1. Ouvrir un navigateur sur **http://localhost/phpmyadmin**
2. Cliquer sur l'onglet **"Importer"** en haut
3. Cliquer sur **"Choisir un fichier"**
4. Sélectionner le fichier `database/edutech.sql` du projet
5. Cliquer sur **"Exécuter"** en bas
6. ✅ La base `edutech` est créée avec les tables et les comptes de test

> 💡 Le fichier SQL crée automatiquement :
> - **Super User** : `super@edutech.com` / `super123`
> - **Enseignant test** : `ahmed@edutech.com` / `teacher123`

---

### Étape 4 — Configurer et lancer le backend

Ouvrir un **terminal** dans le dossier `backend/` :

```bash
cd backend
npm install
```

#### Configuration du fichier `.env`

Le projet contient un fichier `.env.example`. Copier-le en `.env` :

**Sur Windows (PowerShell) :**
```powershell
Copy-Item .env.example .env
```

**Sur Linux/Mac :**
```bash
cp .env.example .env
```

Ouvrir le fichier `.env` et vérifier :

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=edutech
DB_PORT=3306
JWT_SECRET=edutech_secret_change_me_in_production
JWT_EXPIRES_IN=1d
```

> ⚠️ **Important** : Si votre MySQL XAMPP a un mot de passe `root`, mettez-le dans `DB_PASSWORD`. Sinon, laissez vide.

#### Lancer le serveur

```bash
npm start
```

Vous devez voir :
```
EduTech API running on http://localhost:5000
```

✅ **Garder ce terminal ouvert.**

---

### Étape 5 — Lancer le frontend

Ouvrir un **second terminal** dans le dossier `frontend/` :

```bash
cd frontend
npm install
npm run dev
```

Le navigateur s'ouvre automatiquement sur :
```
http://localhost:3000
```

✅ **La plateforme est prête !**

---

## 🔐 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 🔧 Super User | `super@edutech.com` | `super123` |
| 👨‍🏫 Enseignant | `ahmed@edutech.com` | `teacher123` |
| 🎓 Apprenant | *à créer via la page Inscription* | — |

---

## 🎯 Parcours d'utilisation

### 👤 En tant que Super User
1. Se connecter avec `super@edutech.com`
2. Aller dans **"Gestion des enseignants"** → créer un nouvel enseignant
3. Consulter la liste des apprenants dans **"Apprenants"**

### 👨‍🏫 En tant qu'Enseignant
1. Se connecter avec les identifiants donnés par le Super User
2. Créer une matière → un **code d'accès unique** est généré automatiquement
3. Cliquer sur **"Gérer le contenu"** pour ajouter :
   - 📄 Cours (PDF)
   - 🧪 TP (PDF)
   - 🎮 Ressources interactives (lien ou HTML)
   - 📝 Quiz QCM
4. Communiquer le code aux apprenants

### 🎓 En tant qu'Apprenant
1. S'inscrire (page Inscription) en choisissant son niveau :
   - Tronc Commun
   - 1ère Bac
   - 2ème Bac
2. Se connecter
3. Voir les matières disponibles pour son niveau (verrouillées 🔒)
4. Entrer le **code d'accès** donné par l'enseignant → débloque la matière
5. Accéder aux cours, TP, ressources et quiz

---

## 📚 Ressources pédagogiques interactives incluses

5 ressources HTML autonomes sont fournies dans `ressources-interactives/` :

| Ressource | Type | Objectif pédagogique |
|-----------|------|---------------------|
| Carte mentale globale | 🧠 Carte mentale | Structurer toutes les notions du module 1 |
| Carte mentale "Les logiciels" | 🧠 Carte mentale | Distinction logiciels de base / d'application |
| Simulateur D→T→R | 🔄 Simulation | Visualiser le traitement de l'information |
| Mini-jeu "Traduis en binaire" | 🎮 Jeu | Comprendre le codage de l'information |
| Jeu de classement des périphériques | 🎮 Jeu | Distinguer entrée/sortie/stockage |

Ces ressources peuvent être ouvertes **directement dans un navigateur** (double-clic sur le fichier `.html`) sans installation.

---

## 🔌 Endpoints principaux de l'API

| Méthode | Route | Rôle requis |
|---------|-------|-------------|
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/register-student` | Public |
| `GET`  | `/api/auth/me` | Authentifié |
| `GET/POST/PUT/DELETE` | `/api/super/teachers` | Super User |
| `GET`  | `/api/super/students` | Super User |
| `GET/POST/PUT/DELETE` | `/api/teacher/subjects` | Enseignant |
| `POST` | `/api/teacher/subjects/:id/regenerate-code` | Enseignant |
| `GET/POST` | `/api/teacher/subjects/:id/resources` | Enseignant |
| `GET/POST` | `/api/teacher/subjects/:id/quizzes` | Enseignant |
| `GET`  | `/api/student/subjects` | Apprenant |
| `POST` | `/api/student/unlock` | Apprenant |
| `GET`  | `/api/student/subjects/:id/resources` | Apprenant |
| `POST` | `/api/student/quizzes/:id/submit` | Apprenant |

---

## 🧱 Schéma de la base de données

| Table | Description |
|-------|-------------|
| `users` | Super User, Enseignants, Apprenants (champ `role`) |
| `subjects` | Matières créées par les enseignants (avec `access_code` unique) |
| `student_subjects` | Liaison apprenant ↔ matière débloquée |
| `resources` | Cours PDF, TP PDF, ressources interactives |
| `quizzes` + `quiz_questions` | Quiz QCM avec 4 options A/B/C/D |

---

## 🐛 Dépannage

| Problème | Solution |
|----------|----------|
| `ECONNREFUSED` sur MySQL | XAMPP MySQL n'est pas démarré → ouvrir le panneau et cliquer Start |
| `Access denied for user 'root'` | Vérifier `DB_PASSWORD` dans `backend/.env` |
| Frontend ne charge pas l'API | Vérifier que le backend tourne sur le port `5000` |
| `CORS error` | Redémarrer le backend (`Ctrl+C` puis `npm start`) |
| Upload PDF échoue | Le fichier doit être **< 20 Mo** et de type **PDF** |
| Login renvoie 401 | Réimporter `database/edutech.sql` (les hashs bcrypt sont fournis) |
| Port 3000 ou 5000 occupé | Modifier le port dans `vite.config.js` (frontend) ou `.env` (backend) |
| `npm install` échoue | Supprimer `node_modules` et `package-lock.json` puis recommencer |
| Page blanche au démarrage | Vider le cache du navigateur (Ctrl+Shift+R) |


## ✅ Fonctionnalités livrées

- [x] Authentification JWT avec 3 rôles
- [x] Protection des routes côté serveur ET côté client
- [x] Inscription apprenant avec choix du niveau
- [x] CRUD enseignants (Super User)
- [x] Liste des apprenants (Super User)
- [x] CRUD matières + génération de codes d'accès uniques (Enseignant)
- [x] Régénération de code à la demande
- [x] Upload PDF (cours + TP) avec multer
- [x] Ressources interactives (liens / HTML)
- [x] Quiz QCM avec 4 options + auto-correction
- [x] Système de codes d'accès par matière (apprenant)
- [x] Filtrage des matières par niveau de l'apprenant
- [x] Profil enseignant modifiable
- [x] 5 ressources pédagogiques interactives prêtes à l'emploi


## 🤝 Contribution

Ce projet est académique. Pour toute question ou suggestion :

1. Ouvrir une **Issue** sur GitHub
2. Ou contacter l'auteur directement


## 📄 Licence

Projet académique réalisé dans le cadre du PPE — CRMEF Casablanca-Settat, 2025–2026.


---

## 👩‍💻 Auteur

**Hayat EL MANNER**
Stagiaire enseignante en Informatique
CRMEF Casablanca-Settat — Année 2025–2026

---

<div align="center">

### 💚 Si ce projet vous aide, n'hésitez pas à laisser une ⭐ sur GitHub !

**Bon développement ! 🚀**

</div>