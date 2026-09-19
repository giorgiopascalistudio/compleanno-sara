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
  const photoUrl = location.href.replace(/[^/]*$/, "") + "foto.html";
  try {
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById("qrBox"), {
      text: joinUrl,
      width: 230,
      height: 230,
      correctLevel: QRCode.CorrectLevel.H,
    });
    new QRCode(document.getElementById("photoQrBox"), {
      text: photoUrl,
      width: 170,
      height: 170,
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) { /* libreria QR non caricata: link testuale resta visibile */ }

  // slideshow delle foto ricordo — è la schermata "di riposo" quando non
  // c'è nessun quiz in corso (vedi render()). Avvolto in try/catch: se per
  // qualunque motivo fallisse, non deve bloccare il resto della regia.
  let photoSlideshow = { start() {}, stop() {} };
  try {
    if (window.initPhotoSlideshow) photoSlideshow = window.initPhotoSlideshow(db, base);
  } catch (e) { console.error("Errore nello slideshow foto:", e); }

  // --- schermate ---
  const screens = {
    photos: document.getElementById("screen-photos"),
    pre: document.getElementById("screen-pre"),
    live: document.getElementById("screen-live"),
    final: document.getElementById("screen-final"),
  };
  const stageEl = document.querySelector(".stage");
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
    // sulla schermata foto niente titolo/eyebrow né "↺ Nuova partita": resta
    // solo l'iconcina del gioco (vedi CSS .stage.mode-photos)
    stageEl.classList.toggle("mode-photos", name === "photos");
  }
  // Le foto sono la schermata di default per tutta la serata; si passa al
  // quiz premendo l'iconcina discreta, che apre la "lobby" (stato
  // "gathering"): da lì in poi lo stato è sincronizzato su Firebase, così
  // anche gli invitati sanno che il gioco sta per iniziare e possono
  // scegliere di parteciparvi (vedi capture.js), invece di essere dati per
  // scontato "dentro" solo perché avevano già inquadrato il QR delle foto.
  let lastScreenName = null;

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
      // punteggio più alto vince; a parità, chi ha consegnato prima (timeMs più basso)
      .sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  }

  // Per la vista "in corso" NON si ordina per punteggio e non lo si mostra:
  // nessuno deve poter dedurre dalla proiezione chi sta rispondendo meglio
  // prima che il tempo scada. Si ordina solo per ordine di ingresso.
  function joinOrderPlayers() {
    return Object.entries(players)
      .map(([id, p]) => ({ id, name: p.name || "Ospite", finished: !!p.finishedAt, joinedAt: typeof p.joinedAt === "number" ? p.joinedAt : 0 }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  function render() {
    const count = Object.keys(players).length;
    document.getElementById("preCount").textContent = count;
    document.getElementById("liveCount").textContent = count;
    document.getElementById("joinedNames").innerHTML = Object.values(players)
      .map((p) => '<span class="name-chip">' + escapeHtml(p.name || "Ospite") + "</span>")
      .join("");

    let target;
    if (currentGame.state === "running") {
      const dur = currentGame.durationMs || DEFAULT_DURATION;
      const remaining = (currentGame.startedAt || serverNow()) + dur - serverNow();
      if (remaining <= 0) {
        endGame();
        return;
      }
      target = "live";
    } else if (currentGame.state === "ended") {
      target = "final";
    } else if (currentGame.state === "gathering") {
      target = "pre";
    } else {
      target = "photos";
    }

    // avvia/ferma lo slideshow solo quando si entra o si esce dalla
    // schermata foto, non ad ogni singolo aggiornamento di Firebase
    if (target !== lastScreenName) {
      if (lastScreenName === "photos") photoSlideshow.stop();
      if (target === "photos") photoSlideshow.start();
      lastScreenName = target;
    }
    showScreen(target);

    if (target === "live") {
      renderBoard();
      startTimer();
    } else {
      stopTimer();
      if (target === "final") renderFinal();
    }
  }

  function renderBoard() {
    const list = joinOrderPlayers();
    const board = document.getElementById("liveBoard");
    if (!list.length) {
      board.innerHTML = '<div class="empty-note">In attesa dei primi giocatori…</div>';
      return;
    }
    // niente punteggi qui: solo chi ha già inviato e chi sta ancora rispondendo
    board.innerHTML = list.map((p) => (
      '<div class="row live-row">' +
      '<div class="rname">' + escapeHtml(p.name) + "</div>" +
      '<div class="badge' + (p.finished ? " done" : "") + '">' + (p.finished ? "✓ risposte inviate" : "in corso…") + "</div>" +
      "</div>"
    )).join("");
  }

  function renderFinal() {
    const list = rankedPlayers();
    const podiumEl = document.getElementById("podium");
    const restEl = document.getElementById("restList");
    const restHeading = document.getElementById("restHeading");
    if (!list.length) {
      podiumEl.innerHTML = "";
      restHeading.hidden = true;
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
    restHeading.hidden = rest.length === 0;
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
    // aggiorna subito la vista in locale, senza aspettare che la scrittura
    // faccia il giro di andata/ritorno con il server prima di ridisegnare
    currentGame = Object.assign({}, currentGame, { state: "ended" });
    render();
    gameRef.update({ state: "ended" }).catch((e) => console.error("Errore nel terminare la partita:", e));
  }

  // Conferma dentro la pagina, al posto di window.confirm(): su alcuni
  // browser, dopo un paio di finestre di dialogo native, compare la spunta
  // "impedisci ad altre pagine di creare finestre di dialogo" — da quel
  // momento in poi confirm() si rifiuta SEMPRE in silenzio, senza errori,
  // e ogni pulsante che lo usa smette di funzionare senza spiegazione.
  const modalOverlay = document.getElementById("modalOverlay");
  const modalMsg = document.getElementById("modalMsg");
  const modalConfirm = document.getElementById("modalConfirm");
  const modalCancel = document.getElementById("modalCancel");
  function askConfirm(message, onYes) {
    modalMsg.textContent = message;
    modalOverlay.hidden = false;
    function onConfirmClick() { cleanup(); onYes(); }
    function onCancelClick() { cleanup(); }
    function onOverlayClick(e) { if (e.target === modalOverlay) onCancelClick(); }
    function cleanup() {
      modalOverlay.hidden = true;
      modalConfirm.removeEventListener("click", onConfirmClick);
      modalCancel.removeEventListener("click", onCancelClick);
      modalOverlay.removeEventListener("click", onOverlayClick);
    }
    modalConfirm.addEventListener("click", onConfirmClick);
    modalCancel.addEventListener("click", onCancelClick);
    modalOverlay.addEventListener("click", onOverlayClick);
  }
  window.pageConfirm = askConfirm; // riusata da photos.js per il cestino sulle foto

  // Collega un pulsante in modo "sicuro": se per qualunque motivo un
  // elemento non viene trovato (id sbagliato, caricamento parziale...) non
  // deve bloccare in silenzio l'aggancio di TUTTI i pulsanti successivi —
  // cosa che capiterebbe usando semplici catene .addEventListener in fila,
  // dove un errore su una riga impedisce alle righe dopo di essere eseguite.
  function on(id, handler) {
    const el = document.getElementById(id);
    if (!el) { console.error("Pulsante non trovato nella pagina:", id); return; }
    el.addEventListener("click", handler);
  }

  on("startBtn", () => {
    // la richiesta di schermo intero deve essere la primissima cosa del gestore
    if (window.tryFullscreen) window.tryFullscreen();
    const count = Object.keys(players).length;
    const go = () => {
      // aggiorna subito la vista in locale, senza aspettare che la scrittura
      // faccia il giro di andata/ritorno con il server prima di ridisegnare
      currentGame = { state: "running", startedAt: serverNow(), durationMs: DEFAULT_DURATION };
      render();
      gameRef.set({
        state: "running",
        startedAt: firebase.database.ServerValue.TIMESTAMP,
        durationMs: DEFAULT_DURATION,
      }).catch((e) => console.error("Errore nell'avviare la partita:", e));
    };
    if (count === 0) {
      askConfirm("Nessun invitato è ancora entrato. Avviare comunque il gioco?", go);
    } else {
      go();
    }
  });

  on("endNowBtn", () => {
    // per quando tutti gli invitati finiscono prima dello scadere del tempo:
    // chiude subito la partita e passa alla classifica finale, come se il
    // tempo fosse scaduto in questo istante.
    askConfirm("Terminare subito la partita e mostrare la classifica?", () => {
      stopTimer();
      endGame();
    });
  });

  // Azzera la partita e torna alla schermata foto. Aggiorna SUBITO lo stato
  // locale e ridisegna (invece di aspettare che la scrittura su Firebase
  // faccia il giro di ritorno attraverso il listener "value"): così la
  // regia risponde all'istante anche se la rete è lenta o il giro di
  // andata/ritorno con il server impiega un momento — non si resta mai
  // con un pulsante che sembra non aver fatto nulla.
  function resetToPhotos() {
    stopTimer();
    players = {};
    currentGame = { state: "waiting", startedAt: null, durationMs: DEFAULT_DURATION };
    render();
    playersRef.remove().catch((e) => console.error("Errore nel cancellare i giocatori:", e));
    gameRef.set({ state: "waiting", startedAt: null, durationMs: DEFAULT_DURATION })
      .catch((e) => console.error("Errore nel reimpostare la partita:", e));
  }

  on("resetBtn", () => {
    askConfirm("Sicuro? Verranno cancellati tutti i giocatori e i punteggi per iniziare una nuova partita.", resetToPhotos);
  });

  // iconcina discreta sulla schermata foto: apre la lobby ("gathering"),
  // sincronizzata su Firebase — da questo momento gli invitati vedono un
  // invito a partecipare (vedi capture.js) e chi tocca "Partecipa" viene
  // contato qui in tempo reale. Il quiz vero e proprio parte solo dopo,
  // premendo "Inizia il gioco".
  on("quizToggleBtn", () => {
    currentGame = { state: "gathering", startedAt: null, durationMs: DEFAULT_DURATION };
    render();
    gameRef.set({ state: "gathering", startedAt: null, durationMs: DEFAULT_DURATION })
      .catch((e) => console.error("Errore nell'aprire la lobby:", e));
  });

  // dal podio finale, si torna alla schermata foto per il resto della
  // serata (equivale a "Nuova partita" ma senza dover confermare, dato
  // che a questo punto la partita è già stata vista fino in fondo)
  on("backToPhotosBtn", resetToPhotos);

  // pulsante nei controlli: esce dal gioco (in qualunque momento, anche a
  // partita in corso) e torna subito alla sezione foto/video
  on("exitToPhotosBtn", () => {
    if (currentGame.state === "running") {
      askConfirm("La partita è in corso: uscire ora la termina per tutti e cancella i punteggi. Tornare alle foto?", resetToPhotos);
    } else if (currentGame.state === "gathering") {
      askConfirm("Chiudere la lobby e tornare alle foto?", resetToPhotos);
    } else {
      askConfirm("Tornare alla sezione foto/video?", resetToPhotos);
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
