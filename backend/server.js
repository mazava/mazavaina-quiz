require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-moi-token-admin-secret";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Origine non autorisée par CORS"));
  }
}));
app.use(express.json());

const db = new sqlite3.Database("./quiz.db", (err) => {
  if (err) console.error("Erreur connexion SQLite :", err.message);
  else console.log("Base SQLite connectée.");
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS resultats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL DEFAULT 3,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    question TEXT NOT NULL,
    type TEXT NOT NULL,
    options TEXT NOT NULL DEFAULT '[]',
    bonnes_reponses TEXT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.get("SELECT COUNT(*) AS count FROM questions", [], (err, row) => {
    if (!err && row.count === 0) seedQuestions();
  });
});

function seedQuestions() {
  const demo = [
    {
      titre: "Quiz 1 : Une seule réponse",
      question: "Quelle librairie JavaScript permet de créer des présentations web interactives ?",
      type: "single",
      options: ["Bootstrap", "Reveal.js", "jQuery"],
      bonnes_reponses: ["Reveal.js"]
    },
    {
      titre: "Quiz 2 : Choix multiples",
      question: "Quels éléments sont des langages utilisés pour créer une page web ?",
      type: "multiple",
      options: ["HTML", "CSS", "Excel", "JavaScript"],
      bonnes_reponses: ["HTML", "CSS", "JavaScript"]
    },
    {
      titre: "Quiz 3 : Mot ou expression",
      question: "Reveal.js permet de créer des __________ dans le navigateur.",
      type: "text",
      options: [],
      bonnes_reponses: ["présentations", "presentation", "présentation", "slides", "diapositives"]
    }
  ];

  const stmt = db.prepare(`INSERT INTO questions (titre, question, type, options, bonnes_reponses)
    VALUES (?, ?, ?, ?, ?)`);
  demo.forEach(q => stmt.run(q.titre, q.question, q.type, JSON.stringify(q.options), JSON.stringify(q.bonnes_reponses)));
  stmt.finalize();
}

function parseQuestion(row) {
  return {
    id: row.id,
    titre: row.titre,
    question: row.question,
    type: row.type,
    options: JSON.parse(row.options || "[]"),
    bonnes_reponses: JSON.parse(row.bonnes_reponses || "[]"),
    date_creation: row.date_creation
  };
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "Accès admin non autorisé." });
  next();
}

app.get("/", (req, res) => {
  res.json({
    message: "API Mazavaina Quiz v2.1 admin opérationnelle",
    endpoints: {
      questions: "GET /questions",
      resultats: "POST /resultats",
      classement: "GET /classement",
      adminLogin: "POST /admin/login",
      addQuestion: "POST /admin/questions",
      deleteQuestion: "DELETE /admin/questions/:id",
      clearClassement: "DELETE /admin/classement"
    }
  });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    return res.json({ message: "Connexion admin réussie.", token: ADMIN_TOKEN });
  }
  return res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
});

app.get("/questions", (req, res) => {
  db.all(`SELECT id, titre, question, type, options, bonnes_reponses, date_creation FROM questions ORDER BY id ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(parseQuestion));
  });
});

app.post("/admin/questions", requireAdmin, (req, res) => {
  const { titre, question, type, options, bonnes_reponses } = req.body;
  const allowedTypes = ["single", "multiple", "text"];

  if (!titre || !question || !type) return res.status(400).json({ error: "Le titre, la question et le type sont obligatoires." });
  if (!allowedTypes.includes(type)) return res.status(400).json({ error: "Type invalide. Utilise : single, multiple ou text." });
  if (!Array.isArray(bonnes_reponses) || bonnes_reponses.length === 0) return res.status(400).json({ error: "Au moins une bonne réponse est obligatoire." });

  const cleanOptions = Array.isArray(options) ? options.map(o => String(o).trim()).filter(Boolean) : [];
  const cleanAnswers = bonnes_reponses.map(r => String(r).trim()).filter(Boolean);

  if ((type === "single" || type === "multiple") && cleanOptions.length < 2) return res.status(400).json({ error: "Les questions à choix doivent avoir au moins deux options." });
  if (type === "single" && cleanAnswers.length !== 1) return res.status(400).json({ error: "Une question à réponse unique doit avoir exactement une bonne réponse." });

  if (type === "single" || type === "multiple") {
    const missing = cleanAnswers.filter(answer => !cleanOptions.includes(answer));
    if (missing.length > 0) return res.status(400).json({ error: `Bonne réponse absente des options : ${missing.join(", ")}` });
  }

  db.run(`INSERT INTO questions (titre, question, type, options, bonnes_reponses) VALUES (?, ?, ?, ?, ?)`,
    [titre.trim(), question.trim(), type, JSON.stringify(cleanOptions), JSON.stringify(cleanAnswers)],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, titre: titre.trim(), question: question.trim(), type, options: cleanOptions, bonnes_reponses: cleanAnswers });
    }
  );
});

app.delete("/admin/questions/:id", requireAdmin, (req, res) => {
  db.run("DELETE FROM questions WHERE id = ?", [Number(req.params.id)], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Question supprimée.", lignes_supprimees: this.changes });
  });
});

app.post("/resultats", (req, res) => {
  const { pseudo, score, total } = req.body;
  if (!pseudo || typeof pseudo !== "string" || pseudo.trim().length < 2) return res.status(400).json({ error: "Le pseudo est obligatoire." });
  if (typeof score !== "number" || score < 0) return res.status(400).json({ error: "Le score doit être un nombre positif." });
  if (typeof total !== "number" || total < 1) return res.status(400).json({ error: "Le total doit être un nombre positif." });

  db.run("INSERT INTO resultats (pseudo, score, total) VALUES (?, ?, ?)", [pseudo.trim(), score, total], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, pseudo: pseudo.trim(), score, total });
  });
});

app.get("/classement", (req, res) => {
  db.all(`SELECT id, pseudo, score, total, date_creation FROM resultats ORDER BY score DESC, date_creation ASC LIMIT 100`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete("/admin/classement", requireAdmin, (req, res) => {
  db.run("DELETE FROM resultats", [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Classement vidé avec succès.", lignes_supprimees: this.changes });
  });
});

app.listen(PORT, () => console.log(`Backend lancé sur http://localhost:${PORT}`));
