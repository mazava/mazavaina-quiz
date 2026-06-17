require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origine non autorisée par CORS"));
      }
    }
  })
);

app.use(express.json());

const db = new sqlite3.Database("./quiz.db", (err) => {
  if (err) {
    console.error("Erreur connexion SQLite :", err.message);
  } else {
    console.log("Base SQLite connectée.");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS resultats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pseudo TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL DEFAULT 3,
      date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.get("/", (req, res) => {
  res.json({
    message: "API Mazavaina Quiz v2 opérationnelle",
    endpoints: {
      resultats: "POST /resultats",
      classement: "GET /classement",
      viderClassement: "DELETE /classement"
    }
  });
});

app.post("/resultats", (req, res) => {
  const { pseudo, score, total } = req.body;

  if (!pseudo || typeof pseudo !== "string" || pseudo.trim().length < 2) {
    return res.status(400).json({
      error: "Le pseudo est obligatoire et doit contenir au moins 2 caractères."
    });
  }

  if (typeof score !== "number" || score < 0) {
    return res.status(400).json({ error: "Le score doit être un nombre positif." });
  }

  if (typeof total !== "number" || total < 1) {
    return res.status(400).json({ error: "Le total doit être un nombre positif." });
  }

  db.run(
    "INSERT INTO resultats (pseudo, score, total) VALUES (?, ?, ?)",
    [pseudo.trim(), score, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        id: this.lastID,
        pseudo: pseudo.trim(),
        score,
        total
      });
    }
  );
});

app.get("/classement", (req, res) => {
  db.all(
    `
    SELECT id, pseudo, score, total, date_creation
    FROM resultats
    ORDER BY score DESC, date_creation ASC
    LIMIT 100
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.delete("/classement", (req, res) => {
  db.run("DELETE FROM resultats", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      message: "Classement vidé avec succès.",
      lignes_supprimees: this.changes
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend lancé sur http://localhost:${PORT}`);
});
