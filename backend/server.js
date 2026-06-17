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
});

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

function buildClassement(rows) {
  return rows.map((row, index) => ({
    rang: index + 1,
    id: row.id,
    pseudo: row.pseudo,
    score: row.score,
    total: row.total,
    date_creation: row.date_creation
  }));
}

app.get("/", (req, res) => {
  res.json({
    message: "API Mazavaina Quiz v2.2 opérationnelle",
    endpoints: {
      questions: "GET /questions",
      pseudoExists: "GET /pseudos/:pseudo",
      resultats: "POST /resultats",
      classement: "GET /classement",
      monClassement: "GET /classement/:pseudo",
      adminLogin: "POST /admin/login",
      addQuestion: "POST /admin/questions",
      deleteQuestion: "DELETE /admin/questions/:id",
      deleteAllQuestions: "DELETE /admin/questions",
      clearClassement: "DELETE /admin/classement"
    }
  });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) return res.json({ message: "Connexion admin réussie.", token: ADMIN_TOKEN });
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

app.delete("/admin/questions", requireAdmin, (req, res) => {
  db.run("DELETE FROM questions", [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Toutes les questions ont été supprimées.", lignes_supprimees: this.changes });
  });
});

app.get("/pseudos/:pseudo", (req, res) => {
  const pseudo = String(req.params.pseudo || "").trim();
  if (!pseudo) return res.status(400).json({ error: "Pseudo obligatoire." });
  db.get("SELECT id FROM resultats WHERE lower(pseudo) = lower(?) LIMIT 1", [pseudo], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ pseudo, exists: Boolean(row) });
  });
});

app.post("/resultats", (req, res) => {
  const { pseudo, score, total } = req.body;
  const cleanPseudo = String(pseudo || "").trim();
  if (!cleanPseudo || cleanPseudo.length < 2) return res.status(400).json({ error: "Le pseudo est obligatoire." });
  if (typeof score !== "number" || score < 0) return res.status(400).json({ error: "Le score doit être un nombre positif." });
  if (typeof total !== "number" || total < 1) return res.status(400).json({ error: "Le total doit être un nombre positif." });
  db.get("SELECT id FROM resultats WHERE lower(pseudo) = lower(?) LIMIT 1", [cleanPseudo], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: "Ce pseudo existe déjà. Merci d'en choisir un autre." });
    db.run("INSERT INTO resultats (pseudo, score, total) VALUES (?, ?, ?)", [cleanPseudo, score, total], function(insertErr) {
      if (insertErr) return res.status(500).json({ error: insertErr.message });
      res.status(201).json({ id: this.lastID, pseudo: cleanPseudo, score, total });
    });
  });
});

app.get("/classement", (req, res) => {
  db.all(`SELECT id, pseudo, score, total, date_creation FROM resultats ORDER BY score DESC, date_creation ASC LIMIT 100`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(buildClassement(rows));
  });
});

app.get("/classement/:pseudo", (req, res) => {
  const pseudo = String(req.params.pseudo || "").trim();
  db.all(`SELECT id, pseudo, score, total, date_creation FROM resultats ORDER BY score DESC, date_creation ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const classement = buildClassement(rows);
    const joueur = classement.find(item => item.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (!joueur) return res.status(404).json({ error: "Classement introuvable pour ce pseudo." });
    res.json(joueur);
  });
});

app.delete("/admin/classement", requireAdmin, (req, res) => {
  db.run("DELETE FROM resultats", [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Classement vidé avec succès.", lignes_supprimees: this.changes });
  });
});

app.listen(PORT, () => console.log(`Backend lancé sur http://localhost:${PORT}`));
