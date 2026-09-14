/* ============================================================
   Quiz di compleanno — logica pagina regia / maxischermo (index.html)
   ============================================================ */

(function () {
  "use strict";

  if (!window.firebase || !FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.indexOf("INCOLLA") === 0) {
    document.querySelector(".stage").innerHTML =
      "<h1>⚠️ Configurazione mancante</h1><p>Completa <code>firebase-config.js</code> seguendo il README prima di usare la regia.</p>";
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();
  const base = "games/" + GAME_ID;
  const gameRef = db.ref(base + "/game");
  const playersRef = db.ref(base + "/players");

  let serverOffset = 0;
  db.ref(".info/serverTimeOffset").on("value", (snap) => { serverOffset = snap.val() || 0; });
  function serverNow() { return Date.now() + serverOffset; }

  const DEFAULT_DURATION = 600000; // 10 minuti

  // --- QR / link ---
  // pagina invitati = "gioco.html" nella stessa cartella di questa pagina,
  // qualunque sia il nome/percorso con cui questa (la regia) è servita.
  const joinUrl = location.href.replace(/[^/]*$/, "") + "gioco.html";
  document.getElementById("joinUrl").textContent = joinUrl;
  try {
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById("qrBox"), {
      text: joinUrl,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) { /* libreria QR non caricata: link testuale resta visibile */ }

  // --- schermate ---
  const screens = {
    pre: document.getElementById("screen-pre"),
    live: document.getElementById("screen-live"),
    final: document.getElementById("screen-final"),
  };
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
  }

  let players = {};
  let currentGame = { state: "waiting", durationMs: DEFAULT_DURATION };
  let timerInterval = null;
  let confettiFired = false;
  let endWriteAttempted = false;

  playersRef.on("value", (snap) => {
    players = snap.val() || {};
    render();
  });

  gameRef.on("value", (snap) => {
    currentGame = snap.val() || { state: "waiting", durationMs: DEFAULT_DURATION };
    if (currentGame.state !== "ended") { confettiFired = false; endWriteAttempted = false; }
    render();
  });

  function rankedPlayers() {
    return Object.entries(players)
      .map(([id, p]) => ({ id, name: p.name || "Ospite", score: p.score || 0, finished: !!p.finishedAt, timeMs: typeof p.timeMs === "number" ? p.timeMs : Infinity }))
      .sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  }

  function render() {
    const count = Object.keys(players).length;
    document.getElementById("preCount").textContent = count;
    document.getElementById("liveCount").textContent = count;
    document.getElementById("joinedNames").innerHTML = Object.values(players)
      .map((p) => '<span class="name-chip">' + escapeHtml(p.name || "Ospite") + "</span>")
      .join("");

    if (currentGame.state === "running") {
      const dur = currentGame.durationMs || DEFAULT_DURATION;
      const remaining = (currentGame.startedAt || serverNow()) + dur - serverNow();
      if (remaining <= 0) {
        endGame();
        return;
      }
      showScreen("live");
      renderBoard();
      startTimer();
    } else if (currentGame.state === "ended") {
      stopTimer();
      showScreen("final");
      renderFinal();
    } else {
      stopTimer();
      showScreen("pre");
    }
  }

  function renderBoard() {
    const list = rankedPlayers();
    const board = document.getElementById("liveBoard");
    if (!list.length) {
      board.innerHTML = '<div class="empty-note">In attesa dei primi giocatori…</div>';
      return;
    }
    board.innerHTML = list.map((p, i) => {
      const rankClass = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
      return (
        '<div class="row ' + rankClass + '">' +
        '<div class="rank">' + (i + 1) + "</div>" +
        '<div class="rname">' + escapeHtml(p.name) +
        '<div class="rstatus">' + (p.finished ? "risposte inviate" : "in corso…") + "</div></div>" +
        '<div class="rscore tabular">' + p.score + "/30</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderFinal() {
    const list = rankedPlayers();
    const podiumEl = document.getElementById("podium");
    const restEl = document.getElementById("restList");
    if (!list.length) {
      podiumEl.innerHTML = "";
      restEl.innerHTML = '<div class="empty-note">Nessun giocatore ha partecipato.</div>';
      return;
    }
    const top3 = list.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    podiumEl.innerHTML = top3.map((p, i) => (
      '<div class="place p' + (i + 1) + '">' +
      '<div class="medal">' + medals[i] + "</div>" +
      '<div class="pname">' + escapeHtml(p.name) + "</div>" +
      '<div class="pscore">' + p.score + "/30</div>" +
      '<div class="bar"></div>' +
      "</div>"
    )).join("");

    const rest = list.slice(3);
    restEl.innerHTML = rest.map((p, i) => (
      '<div class="row">' +
      '<div class="rank">' + (i + 4) + "</div>" +
      '<div class="rname">' + escapeHtml(p.name) + "</div>" +
      '<div class="rscore tabular">' + p.score + "/30</div>" +
      "</div>"
    )).join("");

    if (!confettiFired) {
      confettiFired = true;
      fireConfetti();
    }
  }

  function fireConfetti() {
    if (typeof confetti !== "function") return;
    const duration = 2500;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 65, origin: { x: 0 }, colors: ["#fbe9ad", "#e0b24f", "#b0812a", "#f4f5f8"] });
      confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1 }, colors: ["#fbe9ad", "#e0b24f", "#b0812a", "#f4f5f8"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  function startTimer() {
    if (timerInterval) return;
    tick();
    timerInterval = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }
  function tick() {
    if (!currentGame || currentGame.state !== "running") return;
    const dur = currentGame.durationMs || DEFAULT_DURATION;
    const remaining = Math.max(0, (currentGame.startedAt || serverNow()) + dur - serverNow());
    const mm = Math.floor(remaining / 60000);
    const ss = Math.floor((remaining % 60000) / 1000);
    const el = document.getElementById("liveTimer");
    el.textContent = mm + ":" + String(ss).padStart(2, "0");
    el.classList.toggle("low", remaining <= 60000);
    if (remaining <= 0) {
      stopTimer();
      endGame();
    }
  }

  function endGame() {
    if (endWriteAttempted) return;
    endWriteAttempted = true;
    gameRef.update({ state: "ended" });
  }

  document.getElementById("startBtn").addEventListener("click", () => {
    const count = Object.keys(players).length;
    if (count === 0 && !confirm("Nessun invitato è ancora entrato. Avviare comunque il gioco?")) return;
    if (window.tryFullscreen) window.tryFullscreen(); // primo gesto utente: buon momento per chiedere lo schermo intero sul proiettore
    gameRef.set({
      state: "running",
      startedAt: firebase.database.ServerValue.TIMESTAMP,
      durationMs: DEFAULT_DURATION,
    });
  });

  document.getElementById("fsBtn").addEventListener("click", () => {
    if (window.toggleFullscreen) window.toggleFullscreen();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Sicuro? Verranno cancellati tutti i giocatori e i punteggi per iniziare una nuova partita.")) return;
    playersRef.remove();
    gameRef.set({ state: "waiting", startedAt: null, durationMs: DEFAULT_DURATION });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
