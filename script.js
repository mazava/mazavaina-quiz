let pseudo = "";
let score = 0;
let q1Done = false;
let q2Done = false;
let q3Done = false;

Reveal.initialize({
  hash: true,
  controls: true,
  progress: true,
  slideNumber: true,
  transition: "slide"
});

// Démarrage avec pseudo obligatoire
function startQuiz() {
  const input = document.getElementById("pseudoInput");
  const erreur = document.getElementById("messageErreur");

  pseudo = input.value.trim();

  if (pseudo === "") {
    erreur.textContent = "Merci de créer un pseudo avant de commencer.";
    return;
  }

  erreur.textContent = "";
  Reveal.slide(1);
}

// Quiz 1 : une seule réponse
function validerQ1() {
  if (q1Done) return;

  const reponse = document.querySelector('input[name="q1"]:checked');
  const feedback = document.getElementById("feedbackQ1");

  if (!reponse) {
    feedback.textContent = "Choisis une réponse.";
    feedback.className = "incorrect";
    return;
  }

  if (reponse.value === "1") {
    score++;
    feedback.textContent = "Bonne réponse !";
    feedback.className = "correct";
  } else {
    feedback.textContent = "Mauvaise réponse. La bonne réponse était Reveal.js.";
    feedback.className = "incorrect";
  }

  q1Done = true;
  setTimeout(() => Reveal.slide(2), 1000);
}

// Quiz 2 : choix multiples
function validerQ2() {
  if (q2Done) return;

  const cases = document.querySelectorAll('input[name="q2"]:checked');
  const valeurs = Array.from(cases).map(c => c.value).sort();
  const bonnesReponses = ["css", "html", "javascript"].sort();
  const feedback = document.getElementById("feedbackQ2");

  if (valeurs.length === 0) {
    feedback.textContent = "Choisis au moins une réponse.";
    feedback.className = "incorrect";
    return;
  }

  const estCorrect =
    valeurs.length === bonnesReponses.length &&
    valeurs.every((v, i) => v === bonnesReponses[i]);

  if (estCorrect) {
    score++;
    feedback.textContent = "Bonne réponse !";
    feedback.className = "correct";
  } else {
    feedback.textContent = "Mauvaise réponse. Les bonnes réponses sont HTML, CSS et JavaScript.";
    feedback.className = "incorrect";
  }

  q2Done = true;
  setTimeout(() => Reveal.slide(3), 1000);
}

// Quiz 3 : phrase à compléter
function validerQ3() {
  if (q3Done) return;

  const reponse = document.getElementById("q3").value.trim().toLowerCase();
  const feedback = document.getElementById("feedbackQ3");

  if (reponse === "") {
    feedback.textContent = "Complète la phrase.";
    feedback.className = "incorrect";
    return;
  }

  // On accepte plusieurs formulations proches
  const bonnes = ["présentations", "presentation", "présentation", "slides", "diapositives"];

  if (bonnes.includes(reponse)) {
    score++;
    feedback.textContent = "Bonne réponse !";
    feedback.className = "correct";
  } else {
    feedback.textContent = "Mauvaise réponse. Une réponse attendue était : présentations.";
    feedback.className = "incorrect";
  }

  q3Done = true;

  document.getElementById("resultatFinal").textContent =
    `${pseudo}, ton score est de ${score}/3.`;

  setTimeout(() => Reveal.slide(4), 1000);
}

// Enregistrer le score dans localStorage
function terminerQuiz() {
  const joueurs = JSON.parse(localStorage.getItem("classementQuiz")) || [];

  joueurs.push({
    pseudo: pseudo,
    score: score,
    date: new Date().toLocaleString()
  });

  joueurs.sort((a, b) => b.score - a.score);

  localStorage.setItem("classementQuiz", JSON.stringify(joueurs));

  afficherClassement();
  Reveal.slide(5);
}

// Afficher le classement
function afficherClassement() {
  const joueurs = JSON.parse(localStorage.getItem("classementQuiz")) || [];
  const tbody = document.getElementById("classement");

  tbody.innerHTML = "";

  joueurs.forEach((joueur, index) => {
    const ligne = document.createElement("tr");

    ligne.innerHTML = `
      <td>${index + 1}</td>
      <td>${joueur.pseudo}</td>
      <td>${joueur.score}/3</td>
    `;

    tbody.appendChild(ligne);
  });
}

// Recommencer le quiz
function recommencer() {
  pseudo = "";
  score = 0;
  q1Done = false;
  q2Done = false;
  q3Done = false;

  document.getElementById("pseudoInput").value = "";
  document.getElementById("q3").value = "";

  document.querySelectorAll("input").forEach(input => {
    if (input.type === "radio" || input.type === "checkbox") {
      input.checked = false;
    }
  });

  document.querySelectorAll("p[id^='feedback']").forEach(p => {
    p.textContent = "";
    p.className = "";
  });

  document.getElementById("resultatFinal").textContent = "";

  Reveal.slide(0);
}

// Vider le classement
function viderClassement() {
  localStorage.removeItem("classementQuiz");
  afficherClassement();
}

afficherClassement();
