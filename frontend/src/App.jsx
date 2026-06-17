import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const questions = [
  {
    id: 1,
    type: "single",
    titre: "Quiz 1 : Une seule réponse",
    question:
      "Quelle librairie JavaScript permet de créer des présentations web interactives ?",
    options: ["Bootstrap", "Reveal.js", "jQuery"],
    bonneReponse: "Reveal.js"
  },
  {
    id: 2,
    type: "multiple",
    titre: "Quiz 2 : Choix multiples",
    question:
      "Quels éléments sont des langages utilisés pour créer une page web ?",
    options: ["HTML", "CSS", "Excel", "JavaScript"],
    bonnesReponses: ["HTML", "CSS", "JavaScript"]
  },
  {
    id: 3,
    type: "text",
    titre: "Quiz 3 : Phrase à compléter",
    question:
      "Reveal.js permet de créer des __________ dans le navigateur.",
    bonnesReponses: [
      "présentations",
      "presentation",
      "présentation",
      "slides",
      "diapositives"
    ]
  }
];

function App() {
  const [page, setPage] = useState("accueil");
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

  const questionActuelle = questions[indexQuestion];

  const progression = useMemo(() => {
    if (page !== "quiz") return 0;
    return Math.round(((indexQuestion + 1) / questions.length) * 100);
  }, [page, indexQuestion]);

  useEffect(() => {
    chargerClassement();
  }, []);

  function demarrerQuiz() {
    const nom = pseudo.trim();

    if (!nom || nom.length < 2) {
      setErreur("Merci de créer un pseudo d'au moins 2 caractères.");
      return;
    }

    setPseudoValide(nom);
    setErreur("");
    setPage("quiz");
  }

  function changerReponse(questionId, valeur) {
    setReponses((anciennes) => ({
      ...anciennes,
      [questionId]: valeur
    }));
  }

  function cocherChoixMultiple(questionId, option) {
    const actuelles = reponses[questionId] || [];

    if (actuelles.includes(option)) {
      changerReponse(
        questionId,
        actuelles.filter((item) => item !== option)
      );
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

      correct = reponse === question.bonneReponse;
    }

    if (question.type === "multiple") {
      if (!Array.isArray(reponse) || reponse.length === 0) {
        setFeedback("Choisis au moins une réponse.");
        return;
      }

      const attendues = [...question.bonnesReponses].sort();
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

      correct = question.bonnesReponses
        .map(normaliserTexte)
        .includes(normaliserTexte(reponse));
    }

    if (correct) {
      setScore((ancien) => ancien + 1);
      setFeedback("Bonne réponse !");
    } else {
      setFeedback("Mauvaise réponse.");
    }

    setQuestionsValidees((anciennes) => ({
      ...anciennes,
      [question.id]: true
    }));

    setTimeout(() => {
      allerQuestionSuivante();
    }, 700);
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pseudo: pseudoValide,
          score,
          total: questions.length
        })
      });

      if (!response.ok) {
        throw new Error("Erreur API");
      }

      setResultatEnregistre(true);
      await chargerClassement();
      setPage("classement");
    } catch (error) {
      setErreur(
        "Impossible d'enregistrer le résultat. Vérifie que le backend est lancé ou que VITE_API_URL est configuré."
      );
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

  async function viderClassement() {
    try {
      await fetch(`${API_URL}/classement`, {
        method: "DELETE"
      });

      await chargerClassement();
    } catch (error) {
      setErreur("Impossible de vider le classement.");
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
    setResultatEnregistre(false);
  }

  return (
    <main className="app">
      <section className="card">
        {page === "accueil" && (
          <Accueil
            pseudo={pseudo}
            setPseudo={setPseudo}
            demarrerQuiz={demarrerQuiz}
            erreur={erreur}
          />
        )}

        {page === "quiz" && (
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
          <ClassementPage
            classement={classement}
            recommencer={recommencer}
            viderClassement={viderClassement}
          />
        )}
      </section>
    </main>
  );
}

function Accueil({ pseudo, setPseudo, demarrerQuiz, erreur }) {
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

      <p className="note">Version mobile-first sans Reveal.js</p>
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

function ClassementPage({ classement, recommencer, viderClassement }) {
  return (
    <>
      <h2>Classement des utilisateurs</h2>

      {classement.length === 0 ? (
        <p>Aucun résultat enregistré pour le moment.</p>
      ) : (
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
                  <td>
                    {joueur.score}/{joueur.total}
                  </td>
                  <td>{new Date(joueur.date_creation).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="actions">
        <button type="button" onClick={recommencer}>
          Recommencer
        </button>

        <button type="button" className="danger" onClick={viderClassement}>
          Vider le classement
        </button>
      </div>
    </>
  );
}

export default App;
