import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [page, setPage] = useState("accueil");
  const [questions, setQuestions] = useState([]);
  const [pseudo, setPseudo] = useState("");
  const [pseudoValide, setPseudoValide] = useState("");
  const [indexQuestion, setIndexQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [reponses, setReponses] = useState({});
  const [questionsValidees, setQuestionsValidees] = useState({});
  const [feedback, setFeedback] = useState("");
  const [classement, setClassement] = useState([]);
  const [resultatEnregistre, setResultatEnregistre] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") || "");
  const [adminConnecte, setAdminConnecte] = useState(Boolean(localStorage.getItem("adminToken")));
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [formQuestion, setFormQuestion] = useState({
    titre: "",
    question: "",
    type: "single",
    optionsTexte: "",
    bonnesReponsesTexte: ""
  });

  const questionActuelle = questions[indexQuestion];

  const progression = useMemo(() => {
    if (page !== "quiz" || questions.length === 0) return 0;
    return Math.round(((indexQuestion + 1) / questions.length) * 100);
  }, [page, indexQuestion, questions.length]);

  useEffect(() => {
    chargerQuestions();
    chargerClassement();
  }, []);

  async function chargerQuestions() {
    try {
      const response = await fetch(`${API_URL}/questions`);
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      setErreur("Impossible de charger les questions.");
    }
  }

  async function chargerClassement() {
    try {
      const response = await fetch(`${API_URL}/classement`);
      const data = await response.json();
      setClassement(data);
    } catch (error) {
      console.error("Erreur de chargement du classement :", error);
    }
  }

  function ouvrirAdmin() {
    setErreur("");
    setMessage("");
    setPage("admin");
  }

  function demarrerQuiz() {
    const nom = pseudo.trim();

    if (!nom || nom.length < 2) {
      setErreur("Merci de créer un pseudo d'au moins 2 caractères.");
      return;
    }

    if (questions.length === 0) {
      setErreur("Aucune question disponible.");
      return;
    }

    setPseudoValide(nom);
    setErreur("");
    setPage("quiz");
  }

  function changerReponse(questionId, valeur) {
    setReponses((anciennes) => ({ ...anciennes, [questionId]: valeur }));
  }

  function cocherChoixMultiple(questionId, option) {
    const actuelles = reponses[questionId] || [];

    if (actuelles.includes(option)) {
      changerReponse(questionId, actuelles.filter((item) => item !== option));
    } else {
      changerReponse(questionId, [...actuelles, option]);
    }
  }

  function normaliserTexte(texte) {
    return String(texte)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function validerQuestion() {
    const question = questionActuelle;

    if (questionsValidees[question.id]) {
      allerQuestionSuivante();
      return;
    }

    const reponse = reponses[question.id];
    let correct = false;

    if (question.type === "single") {
      if (!reponse) {
        setFeedback("Choisis une réponse.");
        return;
      }
      correct = reponse === question.bonnes_reponses[0];
    }

    if (question.type === "multiple") {
      if (!Array.isArray(reponse) || reponse.length === 0) {
        setFeedback("Choisis au moins une réponse.");
        return;
      }

      const attendues = [...question.bonnes_reponses].sort();
      const donnees = [...reponse].sort();

      correct =
        attendues.length === donnees.length &&
        attendues.every((valeur, index) => valeur === donnees[index]);
    }

    if (question.type === "text") {
      if (!reponse || !String(reponse).trim()) {
        setFeedback("Complète la phrase.");
        return;
      }

      correct = question.bonnes_reponses
        .map(normaliserTexte)
        .includes(normaliserTexte(reponse));
    }

    if (correct) {
      setScore((ancien) => ancien + 1);
      setFeedback("Bonne réponse !");
    } else {
      setFeedback("Mauvaise réponse.");
    }

    setQuestionsValidees((anciennes) => ({ ...anciennes, [question.id]: true }));
    setTimeout(() => allerQuestionSuivante(), 700);
  }

  function allerQuestionSuivante() {
    setFeedback("");

    if (indexQuestion < questions.length - 1) {
      setIndexQuestion((ancien) => ancien + 1);
    } else {
      setPage("resultat");
    }
  }

  async function enregistrerResultat() {
    if (resultatEnregistre) {
      setPage("classement");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/resultats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudoValide, score, total: questions.length })
      });

      if (!response.ok) throw new Error("Erreur API");

      setResultatEnregistre(true);
      await chargerClassement();
      setPage("classement");
    } catch (error) {
      setErreur("Impossible d'enregistrer le résultat.");
    }
  }

  function recommencer() {
    setPage("accueil");
    setPseudo("");
    setPseudoValide("");
    setIndexQuestion(0);
    setScore(0);
    setReponses({});
    setQuestionsValidees({});
    setFeedback("");
    setErreur("");
    setMessage("");
    setResultatEnregistre(false);
  }

  async function connecterAdmin() {
    setErreur("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setErreur(data.error || "Connexion impossible.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      setAdminToken(data.token);
      setAdminConnecte(true);
      setAdminPassword("");
      setMessage("Connexion admin réussie.");
    } catch (error) {
      setErreur("Impossible de contacter le backend.");
    }
  }

  function deconnecterAdmin() {
    localStorage.removeItem("adminToken");
    setAdminToken("");
    setAdminConnecte(false);
    setMessage("Déconnexion réussie.");
  }

  async function ajouterQuestion(event) {
    event.preventDefault();
    setErreur("");
    setMessage("");

    const options = formQuestion.optionsTexte
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const bonnes_reponses = formQuestion.bonnesReponsesTexte
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`${API_URL}/admin/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          titre: formQuestion.titre,
          question: formQuestion.question,
          type: formQuestion.type,
          options,
          bonnes_reponses
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErreur(data.error || "Impossible d'ajouter la question.");
        return;
      }

      setFormQuestion({
        titre: "",
        question: "",
        type: "single",
        optionsTexte: "",
        bonnesReponsesTexte: ""
      });

      setMessage("Question ajoutée avec succès.");
      await chargerQuestions();
    } catch (error) {
      setErreur("Impossible d'ajouter la question.");
    }
  }

  async function supprimerQuestion(id) {
    if (!confirm("Supprimer cette question ?")) return;

    try {
      const response = await fetch(`${API_URL}/admin/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (!response.ok) {
        setErreur("Suppression impossible.");
        return;
      }

      setMessage("Question supprimée.");
      await chargerQuestions();
    } catch (error) {
      setErreur("Suppression impossible.");
    }
  }

  async function viderClassementAdmin() {
    if (!confirm("Vider tout le classement ?")) return;

    try {
      const response = await fetch(`${API_URL}/admin/classement`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (!response.ok) {
        setErreur("Impossible de vider le classement.");
        return;
      }

      setMessage("Classement vidé.");
      await chargerClassement();
    } catch (error) {
      setErreur("Impossible de vider le classement.");
    }
  }

  return (
    <main className="app">
      <button className="settings-button" type="button" onClick={ouvrirAdmin} aria-label="Configuration">
        ⚙️
      </button>

      <section className="card">
        {page === "accueil" && (
          <Accueil
            pseudo={pseudo}
            setPseudo={setPseudo}
            demarrerQuiz={demarrerQuiz}
            erreur={erreur}
            totalQuestions={questions.length}
          />
        )}

        {page === "quiz" && questionActuelle && (
          <QuizPage
            pseudo={pseudoValide}
            question={questionActuelle}
            indexQuestion={indexQuestion}
            totalQuestions={questions.length}
            progression={progression}
            reponse={reponses[questionActuelle.id]}
            changerReponse={changerReponse}
            cocherChoixMultiple={cocherChoixMultiple}
            validerQuestion={validerQuestion}
            feedback={feedback}
          />
        )}

        {page === "resultat" && (
          <ResultatPage
            pseudo={pseudoValide}
            score={score}
            total={questions.length}
            enregistrerResultat={enregistrerResultat}
            erreur={erreur}
          />
        )}

        {page === "classement" && (
          <ClassementPage classement={classement} recommencer={recommencer} />
        )}

        {page === "admin" && (
          <AdminPage
            adminConnecte={adminConnecte}
            adminUser={adminUser}
            setAdminUser={setAdminUser}
            adminPassword={adminPassword}
            setAdminPassword={setAdminPassword}
            connecterAdmin={connecterAdmin}
            deconnecterAdmin={deconnecterAdmin}
            formQuestion={formQuestion}
            setFormQuestion={setFormQuestion}
            ajouterQuestion={ajouterQuestion}
            questions={questions}
            supprimerQuestion={supprimerQuestion}
            classement={classement}
            viderClassementAdmin={viderClassementAdmin}
            message={message}
            erreur={erreur}
            retourQuiz={() => setPage("accueil")}
          />
        )}
      </section>
    </main>
  );
}

function Accueil({ pseudo, setPseudo, demarrerQuiz, erreur, totalQuestions }) {
  return (
    <>
      <h1>Bienvenue au Quiz</h1>
      <p>Crée ton pseudo avant de commencer.</p>

      <input
        type="text"
        placeholder="Entre ton pseudo"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
      />

      <button type="button" onClick={demarrerQuiz}>
        Démarrer le Quiz
      </button>

      {erreur && <p className="erreur">{erreur}</p>}

      <p className="note">{totalQuestions} question(s) disponible(s)</p>
    </>
  );
}

function QuizPage({
  pseudo,
  question,
  indexQuestion,
  totalQuestions,
  progression,
  reponse,
  changerReponse,
  cocherChoixMultiple,
  validerQuestion,
  feedback
}) {
  return (
    <>
      <p className="pseudo">Joueur : {pseudo}</p>

      <div className="progress-wrapper">
        <div className="progress-bar" style={{ width: `${progression}%` }} />
      </div>

      <p className="question-count">
        Question {indexQuestion + 1} / {totalQuestions}
      </p>

      <h2>{question.titre}</h2>
      <p className="question">{question.question}</p>

      {question.type === "single" && (
        <div className="options">
          {question.options.map((option) => (
            <label className="option" key={option}>
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={reponse === option}
                onChange={() => changerReponse(question.id, option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple" && (
        <div className="options">
          {question.options.map((option) => (
            <label className="option" key={option}>
              <input
                type="checkbox"
                checked={Array.isArray(reponse) && reponse.includes(option)}
                onChange={() => cocherChoixMultiple(question.id, option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <input
          type="text"
          placeholder="Ta réponse"
          value={reponse || ""}
          onChange={(e) => changerReponse(question.id, e.target.value)}
        />
      )}

      <button type="button" onClick={validerQuestion}>
        Valider
      </button>

      {feedback && (
        <p className={feedback.includes("Bonne") ? "correct" : "incorrect"}>
          {feedback}
        </p>
      )}
    </>
  );
}

function ResultatPage({ pseudo, score, total, enregistrerResultat, erreur }) {
  return (
    <>
      <h2>Résultat final</h2>
      <p className="score">
        {pseudo}, ton score est de {score}/{total}.
      </p>

      <button type="button" onClick={enregistrerResultat}>
        Enregistrer et voir le classement
      </button>

      {erreur && <p className="erreur">{erreur}</p>}
    </>
  );
}

function ClassementPage({ classement, recommencer }) {
  return (
    <>
      <h2>Classement des utilisateurs</h2>
      <Classement classement={classement} />

      <div className="actions">
        <button type="button" onClick={recommencer}>
          Recommencer
        </button>
      </div>
    </>
  );
}

function AdminPage(props) {
  const {
    adminConnecte,
    adminUser,
    setAdminUser,
    adminPassword,
    setAdminPassword,
    connecterAdmin,
    deconnecterAdmin,
    formQuestion,
    setFormQuestion,
    ajouterQuestion,
    questions,
    supprimerQuestion,
    classement,
    viderClassementAdmin,
    message,
    erreur,
    retourQuiz
  } = props;

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Configuration du Quiz</h1>
        <button type="button" onClick={retourQuiz}>
          Retour au quiz
        </button>
      </div>

      {message && <p className="message">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      {!adminConnecte ? (
        <div className="admin-card">
          <h2>Connexion admin</h2>
          <input
            type="text"
            placeholder="Identifiant"
            value={adminUser}
            onChange={(e) => setAdminUser(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <button type="button" onClick={connecterAdmin}>
            Se connecter
          </button>
        </div>
      ) : (
        <>
          <div className="admin-card">
            <div className="admin-title-row">
              <h2>Ajouter une question</h2>
              <button type="button" className="danger" onClick={deconnecterAdmin}>
                Déconnexion
              </button>
            </div>

            <form onSubmit={ajouterQuestion}>
              <label>Titre</label>
              <input
                type="text"
                value={formQuestion.titre}
                onChange={(e) => setFormQuestion({ ...formQuestion, titre: e.target.value })}
                placeholder="Ex : Quiz Bible"
              />

              <label>Question</label>
              <textarea
                value={formQuestion.question}
                onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })}
                placeholder="Ex : Qui a construit l'arche ?"
              />

              <label>Type de réponse</label>
              <select
                value={formQuestion.type}
                onChange={(e) => setFormQuestion({ ...formQuestion, type: e.target.value })}
              >
                <option value="single">Une seule réponse</option>
                <option value="multiple">Plusieurs réponses</option>
                <option value="text">Mot ou expression</option>
              </select>

              {(formQuestion.type === "single" || formQuestion.type === "multiple") && (
                <>
                  <label>Options proposées, une par ligne</label>
                  <textarea
                    value={formQuestion.optionsTexte}
                    onChange={(e) =>
                      setFormQuestion({ ...formQuestion, optionsTexte: e.target.value })
                    }
                    placeholder={"Moïse\nNoé\nAbraham"}
                  />
                </>
              )}

              <label>Bonne(s) réponse(s), une par ligne</label>
              <textarea
                value={formQuestion.bonnesReponsesTexte}
                onChange={(e) =>
                  setFormQuestion({ ...formQuestion, bonnesReponsesTexte: e.target.value })
                }
                placeholder={formQuestion.type === "text" ? "présentations\nslides" : "Noé"}
              />

              <button type="submit">Ajouter la question</button>
            </form>
          </div>

          <div className="admin-card">
            <h2>Questions existantes</h2>
            {questions.length === 0 ? (
              <p>Aucune question.</p>
            ) : (
              <div className="question-list">
                {questions.map((q) => (
                  <div className="question-admin" key={q.id}>
                    <h3>{q.titre}</h3>
                    <p>{q.question}</p>
                    <p><strong>Type :</strong> {q.type}</p>
                    {q.options.length > 0 && (
                      <p><strong>Options :</strong> {q.options.join(", ")}</p>
                    )}
                    <p><strong>Réponse(s) :</strong> {q.bonnes_reponses.join(", ")}</p>
                    <button type="button" className="danger" onClick={() => supprimerQuestion(q.id)}>
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card">
            <h2>Classement</h2>
            <Classement classement={classement} />
            <button type="button" className="danger" onClick={viderClassementAdmin}>
              Vider le classement
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Classement({ classement }) {
  if (!classement || classement.length === 0) {
    return <p>Aucun résultat enregistré pour le moment.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Pseudo</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {classement.map((joueur, index) => (
            <tr key={joueur.id}>
              <td>{index + 1}</td>
              <td>{joueur.pseudo}</td>
              <td>{joueur.score}/{joueur.total}</td>
              <td>{new Date(joueur.date_creation).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
