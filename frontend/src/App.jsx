import { useEffect, useRef, useState } from "react";
import Reveal from "reveal.js";

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
  const deckRef = useRef(null);
  const revealRef = useRef(null);

  const [pseudo, setPseudo] = useState("");
  const [pseudoValide, setPseudoValide] = useState("");
  const [score, setScore] = useState(0);
  const [reponseSimple, setReponseSimple] = useState("");
  const [reponsesMultiples, setReponsesMultiples] = useState([]);
  const [reponseTexte, setReponseTexte] = useState("");
  const [feedbacks, setFeedbacks] = useState({});
  const [questionsValidees, setQuestionsValidees] = useState({});
  const [classement, setClassement] = useState([]);
  const [resultatEnregistre, setResultatEnregistre] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!deckRef.current || revealRef.current) return;

    revealRef.current = new Reveal(deckRef.current, {
      hash: true,
      controls: true,
      progress: true,
      slideNumber: true,
      transition: "slide",
      keyboard: true,
      touch: true,

      // Important pour les boutons sur mobile
      embedded: false
    });

    revealRef.current.initialize();
    chargerClassement();

    return () => {
      try {
        revealRef.current?.destroy();
      } catch (error) {
        console.error(error);
      }
      revealRef.current = null;
    };
  }, []);

  function allerSlide(index) {
    revealRef.current?.slide(index);
  }

  function demarrerQuiz() {
    const nom = pseudo.trim();

    if (!nom || nom.length < 2) {
      setErreur("Merci de créer un pseudo d'au moins 2 caractères.");
      return;
    }

    setPseudoValide(nom);
    setErreur("");
    allerSlide(1);
  }

  function cocherChoixMultiple(option) {
    setReponsesMultiples((anciennesReponses) => {
      if (anciennesReponses.includes(option)) {
        return anciennesReponses.filter((item) => item !== option);
      }

      return [...anciennesReponses, option];
    });
  }

  function mettreFeedback(questionId, message, type) {
    setFeedbacks((anciens) => ({
      ...anciens,
      [questionId]: { message, type }
    }));
  }

  function validerQuestion(question) {
    if (!pseudoValide) {
      setErreur("Tu dois d'abord créer un pseudo.");
      allerSlide(0);
      return;
    }

    if (questionsValidees[question.id]) {
      allerSlide(question.id + 1);
      return;
    }

    let correct = false;

    if (question.type === "single") {
      if (!reponseSimple) {
        mettreFeedback(question.id, "Choisis une réponse.", "incorrect");
        return;
      }

      correct = reponseSimple === question.bonneReponse;
    }

    if (question.type === "multiple") {
      if (reponsesMultiples.length === 0) {
        mettreFeedback(question.id, "Choisis au moins une réponse.", "incorrect");
        return;
      }

      const attendues = [...question.bonnesReponses].sort();
      const donnees = [...reponsesMultiples].sort();

      correct =
        attendues.length === donnees.length &&
        attendues.every((valeur, index) => valeur === donnees[index]);
    }

    if (question.type === "text") {
      const texte = reponseTexte.trim().toLowerCase();

      if (!texte) {
        mettreFeedback(question.id, "Complète la phrase.", "incorrect");
        return;
      }

      correct = question.bonnesReponses.includes(texte);
    }

    if (correct) {
      setScore((ancienScore) => ancienScore + 1);
      mettreFeedback(question.id, "Bonne réponse !", "correct");
    } else {
      mettreFeedback(question.id, "Mauvaise réponse.", "incorrect");
    }

    setQuestionsValidees((anciennes) => ({
      ...anciennes,
      [question.id]: true
    }));

    setTimeout(() => {
      allerSlide(question.id + 1);
    }, 900);
  }

  async function enregistrerResultat() {
    if (resultatEnregistre) {
      allerSlide(5);
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
      allerSlide(5);
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
    setPseudo("");
    setPseudoValide("");
    setScore(0);
    setReponseSimple("");
    setReponsesMultiples([]);
    setReponseTexte("");
    setFeedbacks({});
    setQuestionsValidees({});
    setResultatEnregistre(false);
    setErreur("");
    allerSlide(0);
  }

  return (
    <div className="reveal quiz-reveal" ref={deckRef}>
      <div className="slides">
        <section>
          <div className="quiz-card">
            <h1>Bienvenue au Quiz</h1>
            <p>Crée ton pseudo avant de commencer.</p>

            <input
              type="text"
              placeholder="Entre ton pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
            />

            <button onClick={demarrerQuiz}>Démarrer le Quiz</button>

            {erreur && <p className="erreur">{erreur}</p>}

            <p className="small">
              Navigation Reveal.js : boutons, clavier et progression.
            </p>
          </div>
        </section>

        <section>
          <SlideQuestion
            question={questions[0]}
            pseudo={pseudoValide}
            reponseSimple={reponseSimple}
            setReponseSimple={setReponseSimple}
            feedback={feedbacks[1]}
            validerQuestion={validerQuestion}
          />
        </section>

        <section>
          <SlideQuestion
            question={questions[1]}
            pseudo={pseudoValide}
            reponsesMultiples={reponsesMultiples}
            cocherChoixMultiple={cocherChoixMultiple}
            feedback={feedbacks[2]}
            validerQuestion={validerQuestion}
          />
        </section>

        <section>
          <SlideQuestion
            question={questions[2]}
            pseudo={pseudoValide}
            reponseTexte={reponseTexte}
            setReponseTexte={setReponseTexte}
            feedback={feedbacks[3]}
            validerQuestion={validerQuestion}
          />
        </section>

        <section>
          <div className="quiz-card">
            <h2>Résultat final</h2>

            <p className="score">
              {pseudoValide || "Joueur"}, ton score est de {score}/{questions.length}.
            </p>

            <button onClick={enregistrerResultat}>
              Enregistrer et voir le classement
            </button>

            {erreur && <p className="erreur">{erreur}</p>}
          </div>
        </section>

        <section>
          <div className="quiz-card classement-card">
            <h2>Classement des utilisateurs</h2>

            {classement.length === 0 ? (
              <p>Aucun résultat enregistré pour le moment.</p>
            ) : (
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
            )}

            <div className="actions">
              <button onClick={recommencer}>Recommencer</button>
              <button className="danger" onClick={viderClassement}>
                Vider le classement
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SlideQuestion({
  question,
  pseudo,
  reponseSimple,
  setReponseSimple,
  reponsesMultiples,
  cocherChoixMultiple,
  reponseTexte,
  setReponseTexte,
  feedback,
  validerQuestion
}) {
  return (
    <div className="quiz-card">
      <p className="pseudo">Joueur : {pseudo || "pseudo non créé"}</p>

      <h2>{question.titre}</h2>
      <p className="question">{question.question}</p>

      {question.type === "single" && (
        <div className="options">
          {question.options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={reponseSimple === option}
                onChange={() => setReponseSimple(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple" && (
        <div className="options">
          {question.options.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={reponsesMultiples.includes(option)}
                onChange={() => cocherChoixMultiple(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <input
          type="text"
          placeholder="Ta réponse"
          value={reponseTexte}
          onChange={(e) => setReponseTexte(e.target.value)}
        />
      )}

      <button onClick={() => validerQuestion(question)}>Valider</button>

      {feedback && (
        <p className={feedback.type === "correct" ? "correct" : "incorrect"}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

export default App;
