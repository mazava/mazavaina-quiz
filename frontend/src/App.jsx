import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [page, setPage] = useState("accueil");
  const [questions, setQuestions] = useState([]);
  const [pseudo, setPseudo] = useState("");
  const [pseudoValide, setPseudoValide] = useState("");
  const [indexQuestion, setIndexQuestion] = useState(0);
  const [reponses, setReponses] = useState({});
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

  async function chargerMonClassement(nom) {
    const response = await fetch(`${API_URL}/classement/${encodeURIComponent(nom)}`);
    if (!response.ok) throw new Error("Classement personnel introuvable");
    const data = await response.json();
    setMonClassement(data);
  }

  function ouvrirAdmin() {
    if (resultatEnregistre) return;
    setErreur("");
    setMessage("");
    setPage("admin");
  }

  async function demarrerQuiz() {
    const nom = pseudo.trim();

    if (!nom || nom.length < 2) {
      setErreur("Merci de créer un pseudo d'au moins 2 caractères.");
      return;
    }

    if (questions.length === 0) {
      setErreur("Aucune question n'est disponible. Le quiz ne peut pas démarrer.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/pseudos/${encodeURIComponent(nom)}`);
      const data = await response.json();

      if (data.exists) {
        setErreur("Ce pseudo existe déjà. Merci d'en choisir un autre.");
        return;
      }

      setPseudoValide(nom);
      setErreur("");
      setPage("quiz");
    } catch (error) {
      setErreur("Impossible de vérifier le pseudo. Vérifie le backend.");
    }
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
    return String(texte).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function questionEstRepondue(question) {
    const reponse = reponses[question.id];
    if (question.type === "multiple") return Array.isArray(reponse) && reponse.length > 0;
    return Boolean(String(reponse || "").trim());
  }

  function reponseCorrecte(question) {
    const reponse = reponses[question.id];
    if (question.type === "single") return reponse === question.bonnes_reponses[0];
    if (question.type === "multiple") {
      const attendues = [...question.bonnes_reponses].sort();
      const donnees = Array.isArray(reponse) ? [...reponse].sort() : [];
      return attendues.length === donnees.length && attendues.every((v, i) => v === donnees[i]);
    }
    if (question.type === "text") {
      return question.bonnes_reponses.map(normaliserTexte).includes(normaliserTexte(reponse));
    }
    return false;
  }

  function calculerScoreFinal() {
    return questions.reduce((total, question) => total + (reponseCorrecte(question) ? 1 : 0), 0);
  }

  function validerQuestion() {
    if (!questionEstRepondue(questionActuelle)) {
      setFeedback(
        questionActuelle.type === "multiple" ? "Choisis au moins une réponse." : "Réponds à la question avant de continuer."
      );
      return;
    }

    setFeedback("");
    if (indexQuestion < questions.length - 1) {
      setIndexQuestion((ancien) => ancien + 1);
    } else {
      setPage("resultat");
    }
  }

  function revenirQuestionPrecedente() {
    setFeedback("");
    if (indexQuestion > 0) {
      setIndexQuestion((ancien) => ancien - 1);
    } else {
      setPage("accueil");
    }
  }

  function revenirDepuisResultat() {
    if (resultatEnregistre) return;
    setPage("quiz");
    setIndexQuestion(Math.max(questions.length - 1, 0));
  }

  async function enregistrerResultat() {
    if (resultatEnregistre) return;

    const scoreFinal = calculerScoreFinal();

    try {
      const response = await fetch(`${API_URL}/resultats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudoValide, score: scoreFinal, total: questions.length })
      });

      const data = await response.json();

      if (!response.ok) {
        setErreur(data.error || "Impossible d'enregistrer le résultat.");
        return;
      }

      setResultatEnregistre(true);
      await chargerMonClassement(pseudoValide);
      setPage("mon-classement");
    } catch (error) {
      setErreur("Impossible d'enregistrer le résultat.");
    }
  }

  function recommencer() {
    setPage("accueil");
    setPseudo("");
    setPseudoValide("");
    setIndexQuestion(0);
    setReponses({});
    setFeedback("");
    setErreur("");
    setMessage("");
    setMonClassement(null);
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
    const options = formQuestion.optionsTexte.split("\n").map((item) => item.trim()).filter(Boolean);
    const bonnes_reponses = formQuestion.bonnesReponsesTexte.split("\n").map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch(`${API_URL}/admin/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
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
      setFormQuestion({ titre: "", question: "", type: "single", optionsTexte: "", bonnesReponsesTexte: "" });
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

  async function supprimerToutesQuestions() {
    if (!confirm("Supprimer toutes les questions du quiz ?")) return;
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
      {!resultatEnregistre && (
        <button className="settings-button" type="button" onClick={ouvrirAdmin} aria-label="Configuration">⚙️</button>
      )}
      <section className="card">
        {page === "accueil" && (
          <Accueil pseudo={pseudo} setPseudo={setPseudo} demarrerQuiz={demarrerQuiz} erreur={erreur} totalQuestions={questions.length} />
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
          <ResultatPage pseudo={pseudoValide} score={calculerScoreFinal()} total={questions.length} enregistrerResultat={enregistrerResultat} revenirDepuisResultat={revenirDepuisResultat} erreur={erreur} />
        )}
        {page === "mon-classement" && <MonClassementPage monClassement={monClassement} />}
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
      <input type="text" placeholder="Entre ton pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
      <button type="button" onClick={demarrerQuiz}>Démarrer le Quiz</button>
      {erreur && <p className="erreur">{erreur}</p>}
      <p className="note">{totalQuestions} question(s) disponible(s)</p>
    </>
  );
}

function QuizPage({ pseudo, question, indexQuestion, totalQuestions, progression, reponse, changerReponse, cocherChoixMultiple, validerQuestion, revenirQuestionPrecedente, feedback }) {
  return (
    <>
      <p className="pseudo">Joueur : {pseudo}</p>
      <div className="progress-wrapper"><div className="progress-bar" style={{ width: `${progression}%` }} /></div>
      <p className="question-count">Question {indexQuestion + 1} / {totalQuestions}</p>
      <h2>{question.titre}</h2>
      <p className="question">{question.question}</p>
      {question.type === "single" && (
        <div className="options">
          {question.options.map((option) => (
            <label className="option" key={option}>
              <input type="radio" name={`question-${question.id}`} checked={reponse === option} onChange={() => changerReponse(question.id, option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "multiple" && (
        <div className="options">
          {question.options.map((option) => (
            <label className="option" key={option}>
              <input type="checkbox" checked={Array.isArray(reponse) && reponse.includes(option)} onChange={() => cocherChoixMultiple(question.id, option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "text" && <input type="text" placeholder="Ta réponse" value={reponse || ""} onChange={(e) => changerReponse(question.id, e.target.value)} />}
      <div className="actions two-buttons">
        <button type="button" className="secondary" onClick={revenirQuestionPrecedente}>Retour</button>
        <button type="button" onClick={validerQuestion}>Continuer</button>
      </div>
      {feedback && <p className="incorrect">{feedback}</p>}
    </>
  );
}

function ResultatPage({ pseudo, score, total, enregistrerResultat, revenirDepuisResultat, erreur }) {
  return (
    <>
      <h2>Résultat final</h2>
      <p className="score">{pseudo}, ton score est de {score}/{total}.</p>
      <div className="actions two-buttons">
        <button type="button" className="secondary" onClick={revenirDepuisResultat}>Modifier mes réponses</button>
        <button type="button" onClick={enregistrerResultat}>Enregistrer et voir mon classement</button>
      </div>
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
          <p className="rank">Rang #{monClassement.rang}</p>
          <p><strong>Pseudo :</strong> {monClassement.pseudo}</p>
          <p><strong>Score :</strong> {monClassement.score}/{monClassement.total}</p>
          <p><strong>Date :</strong> {new Date(monClassement.date_creation).toLocaleString()}</p>
        </div>
      )}
      <p className="note">Quiz terminé. Ton résultat est enregistré.</p>
    </>
  );
}

function AdminPage(props) {
  const { adminConnecte, adminUser, setAdminUser, adminPassword, setAdminPassword, connecterAdmin, deconnecterAdmin, formQuestion, setFormQuestion, ajouterQuestion, questions, supprimerQuestion, supprimerToutesQuestions, classement, viderClassementAdmin, message, erreur, retourQuiz } = props;
  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Configuration du Quiz</h1>
        <button type="button" onClick={retourQuiz}>Retour au quiz</button>
      </div>
      {message && <p className="message">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}
      {!adminConnecte ? (
        <div className="admin-card">
          <h2>Connexion admin</h2>
          <input type="text" placeholder="Identifiant" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} />
          <input type="password" placeholder="Mot de passe" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          <button type="button" onClick={connecterAdmin}>Se connecter</button>
        </div>
      ) : (
        <>
          <div className="admin-card">
            <div className="admin-title-row"><h2>Ajouter une question</h2><button type="button" className="danger" onClick={deconnecterAdmin}>Déconnexion</button></div>
            <form onSubmit={ajouterQuestion}>
              <label>Titre</label>
              <input type="text" value={formQuestion.titre} onChange={(e) => setFormQuestion({ ...formQuestion, titre: e.target.value })} placeholder="Ex : Quiz Bible" />
              <label>Question</label>
              <textarea value={formQuestion.question} onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })} placeholder="Ex : Qui a construit l'arche ?" />
              <label>Type de réponse</label>
              <select value={formQuestion.type} onChange={(e) => setFormQuestion({ ...formQuestion, type: e.target.value })}>
                <option value="single">Une seule réponse</option><option value="multiple">Plusieurs réponses</option><option value="text">Mot ou expression</option>
              </select>
              {(formQuestion.type === "single" || formQuestion.type === "multiple") && (<><label>Options proposées, une par ligne</label><textarea value={formQuestion.optionsTexte} onChange={(e) => setFormQuestion({ ...formQuestion, optionsTexte: e.target.value })} placeholder={"Moïse\nNoé\nAbraham"} /></>)}
              <label>Bonne(s) réponse(s), une par ligne</label>
              <textarea value={formQuestion.bonnesReponsesTexte} onChange={(e) => setFormQuestion({ ...formQuestion, bonnesReponsesTexte: e.target.value })} placeholder={formQuestion.type === "text" ? "présentations\nslides" : "Noé"} />
              <button type="submit">Ajouter la question</button>
            </form>
          </div>
          <div className="admin-card">
            <div className="admin-title-row"><h2>Questions existantes</h2><button type="button" className="danger" onClick={supprimerToutesQuestions}>Supprimer tous les quiz</button></div>
            {questions.length === 0 ? <p>Aucune question.</p> : <div className="question-list">{questions.map((q) => <div className="question-admin" key={q.id}><h3>{q.titre}</h3><p>{q.question}</p><p><strong>Type :</strong> {q.type}</p>{q.options.length > 0 && <p><strong>Options :</strong> {q.options.join(", ")}</p>}<p><strong>Réponse(s) :</strong> {q.bonnes_reponses.join(", ")}</p><button type="button" className="danger" onClick={() => supprimerQuestion(q.id)}>Supprimer</button></div>)}</div>}
          </div>
          <div className="admin-card"><h2>Classement</h2><Classement classement={classement} /><button type="button" className="danger" onClick={viderClassementAdmin}>Vider le classement</button></div>
        </>
      )}
    </div>
  );
}

function Classement({ classement }) {
  if (!classement || classement.length === 0) return <p>Aucun résultat enregistré pour le moment.</p>;
  return <div className="table-wrapper"><table><thead><tr><th>Rang</th><th>Pseudo</th><th>Score</th><th>Date</th></tr></thead><tbody>{classement.map((joueur) => <tr key={joueur.id}><td>{joueur.rang}</td><td>{joueur.pseudo}</td><td>{joueur.score}/{joueur.total}</td><td>{new Date(joueur.date_creation).toLocaleString()}</td></tr>)}</tbody></table></div>;
}

export default App;
