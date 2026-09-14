/* ============================================================
   Quiz di compleanno — logica pagina ospite (gioco.html)
   ============================================================ */

(function () {
  "use strict";

  if (!window.firebase || !FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.indexOf("INCOLLA") === 0) {
    document.querySelector("main").innerHTML =
      '<div class="card join-card" style="margin-top:18px;">' +
      "<h2>⚠️ Configurazione mancante</h2>" +
      "<p>Questo sito non è ancora collegato a Firebase. Chi organizza il gioco deve completare " +
      "<code>firebase-config.js</code> seguendo il README.</p></div>";
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();
  const base = "games/" + GAME_ID;

  // --- offset orologio locale/server, per un countdown sincronizzato ---
  let serverOffset = 0;
  db.ref(".info/serverTimeOffset").on("value", (snap) => {
    serverOffset = snap.val() || 0;
  });
  function serverNow() {
    return Date.now() + serverOffset;
  }

  // --- identità giocatore ---
  // Nessuna persistenza tra visite: ogni volta che si apre questa pagina
  // (cioè ogni volta che si inquadra il QR) si riparte da zero con il
  // modulo per inserire il nome, invece di riprendere una sessione
  // precedente salvata nel browser.
  let playerId = null;
  let playerName = null;

  const answersLocal = {}; // cache locale delle risposte digitate
  let quizBuilt = false;
  let locked = false;
  let currentGame = null;
  let timerInterval = null;
  let lastReason = null;
  let currentQ = 0; // indice della domanda mostrata (una alla volta)

  // --- elementi ---
  const screens = {
    join: document.getElementById("screen-join"),
    waiting: document.getElementById("screen-waiting"),
    quiz: document.getElementById("screen-quiz"),
    done: document.getElementById("screen-done"),
  };
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
  }

  const topbarName = document.getElementById("topbarName");
  const waitingName = document.getElementById("waitingName");
  const timerPill = document.getElementById("timerPill");
  const timerText = document.getElementById("timerText");
  const playersCountEl = document.getElementById("playersCount");
  const qList = document.getElementById("qList");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const finalScore = document.getElementById("finalScore");
  const doneMsg = document.getElementById("doneMsg");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  function playerRef() {
    return db.ref(base + "/players/" + playerId);
  }

  function joinAsPlayer(name) {
    playerId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    playerName = name;
    playerRef().set({
      name: name,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      score: 0,
      answeredCount: 0,
      finishedAt: null,
      answers: {},
    });
  }

  document.getElementById("joinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("nameInput").value.trim();
    if (!val) return;
    if (window.tryFullscreen) window.tryFullscreen(); // primo gesto utente: unica occasione per chiedere lo schermo intero
    document.getElementById("joinBtn").disabled = true;
    joinAsPlayer(val.slice(0, 30));
    afterIdentityKnown();
  });

  function afterIdentityKnown() {
    topbarName.textContent = playerName;
    waitingName.textContent = playerName;
    watchGame();
    watchPlayersCount();
  }

  function watchPlayersCount() {
    db.ref(base + "/players").on("value", (snap) => {
      playersCountEl.textContent = snap.numChildren();
    });
  }

  function watchGame() {
    db.ref(base + "/game").on("value", (snap) => {
      currentGame = snap.val() || { state: "waiting", durationMs: 600000 };
      render();
    });
  }

  function render() {
    if (!playerId) {
      showScreen("join");
      return;
    }
    if (!currentGame) {
      showScreen("waiting");
      return;
    }
    if (locked) {
      renderDone();
      return;
    }
    if (currentGame.state === "running") {
      const dur = currentGame.durationMs || 600000;
      const remaining = (currentGame.startedAt || serverNow()) + dur - serverNow();
      if (remaining <= 0) {
        finishQuiz("time");
        return;
      }
      if (!quizBuilt) buildQuiz();
      showScreen("quiz");
      startTimer();
    } else if (currentGame.state === "ended") {
      finishQuiz("ended");
    } else {
      showScreen("waiting");
    }
  }

  function startTimer() {
    timerPill.hidden = false;
    if (timerInterval) return;
    tickTimer();
    timerInterval = setInterval(tickTimer, 1000);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }
  function tickTimer() {
    if (!currentGame || currentGame.state !== "running") return;
    const dur = currentGame.durationMs || 600000;
    const remaining = Math.max(0, (currentGame.startedAt || serverNow()) + dur - serverNow());
    const mm = Math.floor(remaining / 60000);
    const ss = Math.floor((remaining % 60000) / 1000);
    timerText.textContent = mm + ":" + String(ss).padStart(2, "0");
    timerPill.classList.toggle("low", remaining <= 60000);
    if (remaining <= 0) {
      stopTimer();
      finishQuiz("time");
    }
  }

  function buildQuiz() {
    quizBuilt = true;
    currentQ = firstUnanswered();
    renderQuestion();
  }

  function firstUnanswered() {
    for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
      if (!(answersLocal["q" + i] || "").trim()) return i;
    }
    return QUIZ_QUESTIONS.length - 1;
  }

  // le domande compaiono una alla volta: questa funzione ridisegna
  // solo la domanda "currentQ" dentro #qList e aggiorna i pulsanti nav.
  function renderQuestion() {
    const i = currentQ;
    const item = QUIZ_QUESTIONS[i];
    const val = answersLocal["q" + i] || "";
    const isLast = i === QUIZ_QUESTIONS.length - 1;

    qList.innerHTML =
      '<div class="card q-card' + (val ? " answered" : "") + '" id="qcard-active">' +
      '<div class="q-head"><div class="q-num">' + (i + 1) + '</div><div class="q-text">' + escapeHtml(item.q) + "</div></div>" +
      '<input type="text" id="qinput-active" placeholder="La tua risposta…" autocomplete="off" value="' + escapeAttr(val) + '">' +
      '<div class="q-status" id="qstatus-active">' + (val.trim() ? "salvata ✓" : "") + "</div>" +
      "</div>";

    const input = document.getElementById("qinput-active");
    let t = null;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => saveAnswer(i, input.value), 450);
    });
    input.addEventListener("blur", () => {
      clearTimeout(t);
      saveAnswer(i, input.value);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); goNext(); }
    });

    prevBtn.disabled = i === 0;
    nextBtn.textContent = isLast ? "Invia le risposte ✅" : "Avanti ✨";
    nextBtn.classList.toggle("silver", !isLast);
    updateProgress();
  }

  function goPrev() {
    if (currentQ === 0) return;
    currentQ -= 1;
    renderQuestion();
  }

  function goNext() {
    const input = document.getElementById("qinput-active");
    const value = input ? input.value : (answersLocal["q" + currentQ] || "");
    saveAnswer(currentQ, value);
    const isLast = currentQ === QUIZ_QUESTIONS.length - 1;
    if (isLast) {
      finishQuiz("submit");
      return;
    }
    fireGlitterBurst(nextBtn);
    currentQ += 1;
    renderQuestion();
  }

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);

  function fireGlitterBurst(originEl) {
    if (typeof confetti !== "function" || !originEl) return;
    const rect = originEl.getBoundingClientRect();
    confetti({
      particleCount: 26,
      spread: 75,
      startVelocity: 34,
      scalar: 0.75,
      gravity: 0.9,
      ticks: 90,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ["#fbe9ad", "#e0b24f", "#b0812a", "#f4f5f8", "#c7cad3"],
      disableForReducedMotion: true,
    });
  }

  function saveAnswer(i, value) {
    if (locked) return;
    answersLocal["q" + i] = value;
    if (i === currentQ) {
      const card = document.getElementById("qcard-active");
      const status = document.getElementById("qstatus-active");
      if (card) card.classList.toggle("answered", value.trim().length > 0);
      if (status) status.textContent = value.trim() ? "salvata ✓" : "";
    }
    updateProgress();
    playerRef().update({
      ["answers/q" + i]: value,
      answeredCount: countAnswered(),
    });
  }

  function countAnswered() {
    return Object.values(answersLocal).filter((v) => (v || "").trim().length > 0).length;
  }

  function computeScore() {
    let score = 0;
    QUIZ_QUESTIONS.forEach((item, i) => {
      if (isCorrectAnswer(answersLocal["q" + i] || "", item.accepted)) score++;
    });
    return score;
  }

  function updateProgress() {
    const n = countAnswered();
    progressFill.style.width = Math.round((n / QUIZ_QUESTIONS.length) * 100) + "%";
    progressLabel.textContent = n;
  }

  function finishQuiz(reason) {
    if (locked) {
      renderDone();
      return;
    }
    locked = true;
    lastReason = reason;
    stopTimer();
    const score = computeScore();
    const startedAt = (currentGame && currentGame.startedAt) || serverNow();
    playerRef().update({
      score: score,
      answeredCount: countAnswered(),
      finishedAt: firebase.database.ServerValue.TIMESTAMP,
      timeMs: Math.max(0, serverNow() - startedAt),
    });
    renderDone(score);
  }

  function renderDone(scoreArg) {
    const score = typeof scoreArg === "number" ? scoreArg : computeScore();
    finalScore.textContent = score;
    if (lastReason === "time") {
      doneMsg.textContent = "Tempo scaduto! Le tue risposte sono state inviate automaticamente. Guarda la classifica sul maxischermo 🏆";
    } else if (lastReason === "ended" && countAnswered() === 0) {
      doneMsg.textContent = "Il gioco è già terminato. Guarda la classifica sul maxischermo!";
    } else {
      doneMsg.textContent = "Grazie per aver giocato! Guarda la classifica generale sul maxischermo per scoprire la tua posizione 🏆";
    }
    showScreen("done");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  // --- avvio: si parte sempre dal modulo nome ---
  showScreen("join");
})();
