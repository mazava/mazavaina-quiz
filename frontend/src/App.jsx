import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const QUESTION_TYPES = {
  fill_blank: {
    label: "Mot à compléter",
    helper: "L'utilisateur complète le mot ou l'expression manquante."
  },
  short_answer: {
    label: "Réponse courte",
    helper: "L'utilisateur saisit une réponse courte libre."
  },
  multiple_choice: {
    label: "Choix multiples",
    helper: "L'utilisateur choisit une seule réponse parmi plusieurs propositions."
  },
  checkbox: {
    label: "Cases à cocher",
    helper: "L'utilisateur coche une ou plusieurs bonnes réponses."
  }
};

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
  const [monClassement, setMonClassement] = useState(null);
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
    type: "multiple_choice",
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
    } catch {
      setErreur("Impossible de charger les questions.");
    }
  }

  async function chargerClassement() {
    try {
      const response = await fetch(`${API_URL}/classement`);
      const data = await response.json();
      setClassement(data);
    } catch (error) {
      console.error("Erreur classement :", error);
    }
  }

  async function demarrerQuiz() {
    const nom = pseudo.trim();

    if (!nom || nom.length < 2) {
      setErreur("Merci de créer un pseudo d'au moins 2 caractères.");
      return;
    }

    if (questions.length === 0) {
      setErreur("Aucune question disponible. Le quiz ne peut pas démarrer.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/pseudos/${encodeURIComponent(nom)}`);
      const data = await response.json();

      if (data.exists) {
        setErreur("Ce pseudo existe déjà. Merci d'en créer un autre.");
        return;
      }
    } catch {
      setErreur("Impossible de vérifier le pseudo.");
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

  function validerQuestion() {
    const question = questionActuelle;

    if (questionsValidees[question.id]) {
      allerQuestionSuivante();
      return;
    }

    const reponse = reponses[question.id];
    let correct = false;

    if (question.type === "multiple_choice") {
      if (!reponse) {
        setFeedback("Choisis une réponse.");
        return;
      }
      correct = reponse === question.bonnes_reponses[0];
    }

    if (question.type === "checkbox") {
      if (!Array.isArray(reponse) || reponse.length === 0) {
        setFeedback("Coche au moins une réponse.");
        return;
      }

      const attendues = [...question.bonnes_reponses].sort();
      const donnees = [...reponse].sort();

      correct =
        attendues.length === donnees.length &&
        attendues.every((valeur, index) => valeur === donnees[index]);
    }

    if (question.type === "short_answer" || question.type === "fill_blank") {
      if (!reponse || !String(reponse).trim()) {
        setFeedback("Saisis une réponse.");
        return;
      }

      correct = question.bonnes_reponses
        .map(normalizeText)
        .includes(normalizeText(reponse));
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

  function revenirQuestionPrecedente() {
    if (indexQuestion > 0) {
      setFeedback("");
      setIndexQuestion((ancien) => ancien - 1);
    } else {
      setPage("accueil");
    }
  }

  async function enregistrerResultat() {
    if (resultatEnregistre) {
      setPage("mon-classement");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/resultats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudoValide, score, total: questions.length })
      });

      const data = await response.json();

      if (!response.ok) {
        setErreur(data.error || "Impossible d'enregistrer le résultat.");
        return;
      }

      setResultatEnregistre(true);
      await chargerClassement();

      const monResultat = await fetch(`${API_URL}/classement/${encodeURIComponent(pseudoValide)}`);
      const monData = await monResultat.json();

      if (monResultat.ok) {
        setMonClassement(monData);
      }

      setPage("mon-classement");
    } catch {
      setErreur("Impossible d'enregistrer le résultat.");
    }
  }

  function recommencer() {
    if (resultatEnregistre) {
      setPage("mon-classement");
      return;
    }

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
  }

  function ouvrirAdmin() {
    setErreur("");
    setMessage("");
    setPage("admin");
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
    } catch {
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
        type: "multiple_choice",
        optionsTexte: "",
        bonnesReponsesTexte: ""
      });

      setMessage("Question ajoutée avec succès.");
      await chargerQuestions();
    } catch {
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
    } catch {
      setErreur("Suppression impossible.");
    }
  }

  async function supprimerToutesQuestions() {
    if (!confirm("Supprimer toutes les questions ?")) return;

    try {
      const response = await fetch(`${API_URL}/admin/questions`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (!response.ok) {
        setErreur("Suppression impossible.");
        return;
      }

      setMessage("Toutes les questions ont été supprimées.");
      await chargerQuestions();
    } catch {
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
    } catch {
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
            revenirQuestionPrecedente={revenirQuestionPrecedente}
            feedback={feedback}
          />
        )}

        {page === "resultat" && (
          <ResultatPage
            pseudo={pseudoValide}
            score={score}
            total={questions.length}
            enregistrerResultat={enregistrerResultat}
            revenir={() => setPage("quiz")}
            verrouille={resultatEnregistre}
            erreur={erreur}
          />
        )}

        {page === "mon-classement" && (
          <MonClassementPage monClassement={monClassement} />
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
            supprimerToutesQuestions={supprimerToutesQuestions}
            classement={classement}
            viderClassementAdmin={viderClassementAdmin}
            message={message}
            erreur={erreur}
            retourQuiz={() => setPage(resultatEnregistre ? "mon-classement" : "accueil")}
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

      <button type="button" onClick={demarrerQuiz} disabled={totalQuestions === 0}>
        Démarrer le Quiz
      </button>

      {totalQuestions === 0 && (
        <p className="erreur">Aucune question disponible pour le moment.</p>
      )}

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
  revenirQuestionPrecedente,
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

      <span className="type-badge">{QUESTION_TYPES[question.type]?.label || question.type}</span>

      <h2>{question.titre}</h2>

      {question.type === "fill_blank" ? (
        <FillBlankQuestion
          question={question}
          reponse={reponse}
          changerReponse={changerReponse}
        />
      ) : (
        <>
          <p className="question">{question.question}</p>
          <QuestionInput
            question={question}
            reponse={reponse}
            changerReponse={changerReponse}
            cocherChoixMultiple={cocherChoixMultiple}
          />
        </>
      )}

      <div className="actions">
        <button type="button" className="secondary" onClick={revenirQuestionPrecedente}>
          Retour
        </button>

        <button type="button" onClick={validerQuestion}>
          Valider
        </button>
      </div>

      {feedback && (
        <p className={feedback.includes("Bonne") ? "correct" : "incorrect"}>
          {feedback}
        </p>
      )}
    </>
  );
}

function FillBlankQuestion({ question, reponse, changerReponse }) {
  const parts = question.question.includes("____")
    ? question.question.split("____")
    : [question.question + " ", ""];

  return (
    <div className="fill-blank">
      <span>{parts[0]}</span>
      <input
        className="inline-answer"
        type="text"
        placeholder="mot"
        value={reponse || ""}
        onChange={(e) => changerReponse(question.id, e.target.value)}
      />
      <span>{parts.slice(1).join("____")}</span>
    </div>
  );
}

function QuestionInput({ question, reponse, changerReponse, cocherChoixMultiple }) {
  if (question.type === "multiple_choice") {
    return (
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
    );
  }

  if (question.type === "checkbox") {
    return (
      <div className="options">
        {question.options.map((option) => (
          <label className="option checkbox-option" key={option}>
            <input
              type="checkbox"
              checked={Array.isArray(reponse) && reponse.includes(option)}
              onChange={() => cocherChoixMultiple(question.id, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "short_answer") {
    return (
      <div className="short-answer-zone">
        <input
          type="text"
          placeholder="Ta réponse courte"
          value={reponse || ""}
          onChange={(e) => changerReponse(question.id, e.target.value)}
        />
      </div>
    );
  }

  return <p className="erreur">Type de question non reconnu.</p>;
}

function ResultatPage({ pseudo, score, total, enregistrerResultat, revenir, verrouille, erreur }) {
  return (
    <>
      <h2>Résultat final</h2>
      <p className="score">
        {pseudo}, ton score est de {score}/{total}.
      </p>

      {!verrouille && (
        <button type="button" className="secondary" onClick={revenir}>
          Revenir au quiz
        </button>
      )}

      <button type="button" onClick={enregistrerResultat}>
        Enregistrer et voir mon classement
      </button>

      {erreur && <p className="erreur">{erreur}</p>}
    </>
  );
}

function MonClassementPage({ monClassement }) {
  return (
    <>
      <h2>Mon classement</h2>

      {!monClassement ? (
        <p>Classement en cours de chargement...</p>
      ) : (
        <div className="personal-ranking">
          <p className="rank-number">Rang #{monClassement.rang}</p>
          <p><strong>Pseudo :</strong> {monClassement.pseudo}</p>
          <p><strong>Score :</strong> {monClassement.score}/{monClassement.total}</p>
          <p><strong>Date :</strong> {new Date(monClassement.date_creation).toLocaleString()}</p>
        </div>
      )}

      <p className="note">
        Ton résultat est enregistré. Tu ne peux plus revenir modifier tes réponses.
      </p>
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
    supprimerToutesQuestions,
    classement,
    viderClassementAdmin,
    message,
    erreur,
    retourQuiz
  } = props;

  const showOptions =
    formQuestion.type === "multiple_choice" || formQuestion.type === "checkbox";

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Configuration du Quiz</h1>
        <button type="button" onClick={retourQuiz}>
          Retour
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
                placeholder="Ex : Quiz biblique"
              />

              <label>Type de question</label>
              <select
                value={formQuestion.type}
                onChange={(e) => setFormQuestion({ ...formQuestion, type: e.target.value })}
              >
                <option value="fill_blank">Mot à compléter</option>
                <option value="short_answer">Réponse courte</option>
                <option value="multiple_choice">Choix multiples</option>
                <option value="checkbox">Cases à cocher</option>
              </select>

              <p className="note">{QUESTION_TYPES[formQuestion.type]?.helper}</p>

              <label>Question</label>
              <textarea
                value={formQuestion.question}
                onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })}
                placeholder={
                  formQuestion.type === "fill_blank"
                    ? "Ex : Reveal.js permet de créer des ____ dans le navigateur."
                    : "Ex : Qui a construit l'arche ?"
                }
              />

              {showOptions && (
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
                placeholder={
                  formQuestion.type === "checkbox"
                    ? "HTML\nCSS\nJavaScript"
                    : "Noé"
                }
              />

              <button type="submit">Ajouter la question</button>
            </form>
          </div>

          <div className="admin-card">
            <div className="admin-title-row">
              <h2>Questions existantes</h2>
              <button type="button" className="danger" onClick={supprimerToutesQuestions}>
                Supprimer tous les quiz
              </button>
            </div>

            {questions.length === 0 ? (
              <p>Aucune question.</p>
            ) : (
              <div className="question-list">
                {questions.map((q) => (
                  <div className="question-admin" key={q.id}>
                    <h3>{q.titre}</h3>
                    <span className="type-badge">{QUESTION_TYPES[q.type]?.label || q.type}</span>
                    <p>{q.question}</p>
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
            <h2>Classement général</h2>
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
          {classement.map((joueur) => (
            <tr key={joueur.id}>
              <td>{joueur.rang}</td>
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
