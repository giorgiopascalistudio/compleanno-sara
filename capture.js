/* ============================================================
   Quiz di compleanno — logica pagina foto (foto.html)
   Chiede nome e cognome una sola volta per telefono (localStorage,
   diverso da gioco.html che invece riparte sempre da zero), passa
   automaticamente alla schermata "partecipa al gioco" quando la
   regia avvia il quiz, ridimensiona le immagini nel browser, controlla
   la durata dei video (max 15s), carica tutto su Cloudinary (hosting
   gratuito, upload diretto senza server) e ne salva il link — insieme
   a didascalia e nome di chi l'ha caricato — nel database del gioco,
   così la regia può mostrarlo in loop.
   ============================================================ */

(function () {
  "use strict";

  const MAX_VIDEO_SECONDS = 15.5; // un po' di tolleranza sull'arrotondamento
  const NAME_KEY = "guestName_v1";

  // Nota: "CLOUDINARY_CONFIG" (dichiarato con `const` in cloudinary-config.js)
  // NON diventa una proprietà di `window`, a differenza di "firebase" (che lo
  // script del SDK imposta esplicitamente) — per questo qui si controlla la
  // variabile diretta, non "window.CLOUDINARY_CONFIG" (che è sempre undefined).
  const fbReady = window.firebase && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey.indexOf("INCOLLA") !== 0;
  const cloudReady = typeof CLOUDINARY_CONFIG !== "undefined" && CLOUDINARY_CONFIG.cloudName.indexOf("INCOLLA") !== 0 && CLOUDINARY_CONFIG.uploadPreset.indexOf("INCOLLA") !== 0;

  if (!fbReady || !cloudReady) {
    document.querySelector("main").innerHTML =
      '<div class="card" style="padding:24px;margin-top:18px;">' +
      "<h2>⚠️ Configurazione mancante</h2>" +
      "<p>Questo sito non è ancora collegato a Firebase e/o Cloudinary. Chi organizza il gioco deve completare " +
      "<code>firebase-config.js</code> e <code>cloudinary-config.js</code> seguendo il README.</p></div>";
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();
  const base = "games/" + GAME_ID;

  // --- schermate: nome / partecipa al gioco / scatta-carica ---
  const screens = {
    name: document.getElementById("screen-name"),
    joingame: document.getElementById("screen-joingame"),
    capture: document.getElementById("screen-capture"),
  };
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
  }

  // definita più sotto nel file, ma le dichiarazioni di funzione sono
  // "hoisted": è già utilizzabile qui, prima della sua definizione testuale
  const installTutorial = initInstallTutorial();

  let guestName = (localStorage.getItem(NAME_KEY) || "").trim();
  let gameIsRunning = false;
  let redirected = false; // evita di rilanciare il redirect più volte sullo stesso avvio
  const joinGameLink = document.getElementById("joinGameLink");

  function refreshJoinLink() {
    if (joinGameLink) joinGameLink.href = "gioco.html?name=" + encodeURIComponent(guestName);
  }

  function updateVisibleScreen() {
    if (!guestName) { showScreen("name"); return; }
    refreshJoinLink();
    if (!gameIsRunning) {
      redirected = false; // partita reimpostata: un prossimo avvio potrà reindirizzare di nuovo
      showScreen("capture");
      installTutorial.maybeAutoOpen();
      return;
    }
    showScreen("joingame");
    // Reindirizza da sola, senza dover reinquadrare un altro QR: il pulsante
    // "Partecipa ora" resta comunque visibile come ripiego, nel caso il
    // redirect automatico non partisse per qualche motivo.
    if (!redirected) {
      redirected = true;
      location.href = "gioco.html?name=" + encodeURIComponent(guestName);
    }
  }
  updateVisibleScreen();

  document.getElementById("nameGateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("guestNameInput").value.trim();
    if (!val) return;
    guestName = val.slice(0, 40);
    localStorage.setItem(NAME_KEY, guestName);
    updateVisibleScreen();
  });

  // Se chi ha già inquadrato questo QR è ancora sulla pagina quando la
  // regia avvia il quiz, la pagina si aggiorna da sola sulla schermata
  // "partecipa al gioco" (senza bisogno di reinquadrare nulla).
  db.ref(base + "/game").on("value", (snap) => {
    const g = snap.val();
    gameIsRunning = !!(g && g.state === "running");
    updateVisibleScreen();
  });

  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const preview = document.getElementById("preview");
  const previewImg = document.getElementById("previewImg");
  const previewVideo = document.getElementById("previewVideo");
  const captionInput = document.getElementById("captionInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const retakeBtn = document.getElementById("retakeBtn");
  const statusMsg = document.getElementById("statusMsg");
  const pickCard = document.getElementById("pickCard");
  const doneCard = document.getElementById("doneCard");

  let selectedBlob = null;
  let selectedType = null; // "image" | "video"
  let previewUrl = null;

  pickBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (file.type.indexOf("video") === 0) {
      statusMsg.textContent = "Controllo il video…";
      getVideoDuration(file).then((duration) => {
        if (duration > MAX_VIDEO_SECONDS) {
          statusMsg.textContent = "Il video dura " + Math.round(duration) + "s: il massimo consentito è 15 secondi. Scegline un altro.";
          fileInput.value = "";
          return;
        }
        selectedBlob = file;
        selectedType = "video";
        showPreview();
      }).catch(() => {
        statusMsg.textContent = "Non sono riuscito a leggere questo video, riprova.";
      });
      return;
    }

    statusMsg.textContent = "Preparo la foto…";
    resizeImage(file, 1600, 0.82).then((blob) => {
      selectedBlob = blob;
      selectedType = "image";
      showPreview();
    }).catch(() => {
      statusMsg.textContent = "Non sono riuscito a leggere questa foto, riprova.";
    });
  });

  function showPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(selectedBlob);
    if (selectedType === "video") {
      previewVideo.src = previewUrl;
      previewVideo.hidden = false;
      previewImg.hidden = true;
    } else {
      previewImg.src = previewUrl;
      previewImg.hidden = false;
      previewVideo.hidden = true;
    }
    preview.hidden = false;
    statusMsg.textContent = "";
  }

  function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      video.src = url;
    });
  }

  retakeBtn.addEventListener("click", () => {
    fileInput.value = "";
    selectedBlob = null;
    selectedType = null;
    preview.hidden = true;
    previewVideo.pause();
    captionInput.value = "";
    statusMsg.textContent = "";
  });

  // Ridimensiona lato browser prima di caricare: foto più leggere,
  // upload più veloci e meno spazio occupato. (I video non si toccano:
  // ridimensionarli richiederebbe strumenti troppo pesanti per una
  // semplice pagina web — restano già corti, max 15s.)
  function resizeImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      img.src = url;
    });
  }

  uploadBtn.addEventListener("click", () => {
    if (!selectedBlob) return;
    uploadBtn.disabled = true;
    retakeBtn.disabled = true;
    statusMsg.textContent = "Carico" + (selectedType === "video" ? " il video…" : " la foto…");

    const form = new FormData();
    form.append("file", selectedBlob, selectedType === "video" ? "video.mp4" : "foto.jpg");
    form.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    form.append("folder", base + "/photos");

    // "auto" riconosce da solo se è un'immagine o un video: stesso
    // endpoint per entrambi, niente da distinguere qui.
    fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CONFIG.cloudName + "/auto/upload", {
      method: "POST",
      body: form,
    })
      .then((res) => {
        if (!res.ok) throw new Error("upload fallito (" + res.status + ")");
        return res.json();
      })
      .then((data) => {
        const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
        return db.ref(base + "/photos/" + id).set({
          url: data.secure_url,
          type: selectedType,
          uploadedAt: firebase.database.ServerValue.TIMESTAMP,
          caption: captionInput.value.trim().slice(0, 80) || null,
          name: guestName || "Ospite",
        });
      })
      .then(() => {
        pickCard.classList.add("hidden-card");
        doneCard.classList.remove("hidden-card");
      })
      .catch((e) => {
        statusMsg.textContent = "Qualcosa è andato storto, riprova! (" + e.message + ")";
        uploadBtn.disabled = false;
        retakeBtn.disabled = false;
      });
  });

  document.getElementById("anotherBtn").addEventListener("click", () => {
    doneCard.classList.add("hidden-card");
    pickCard.classList.remove("hidden-card");
    preview.hidden = true;
    previewVideo.pause();
    selectedBlob = null;
    selectedType = null;
    fileInput.value = "";
    captionInput.value = "";
    statusMsg.textContent = "";
    uploadBtn.disabled = false;
    retakeBtn.disabled = false;
  });

  function initInstallTutorial() {
    const noop = { maybeAutoOpen() {} };
    const overlay = document.getElementById("tutorialOverlay");
    const hintLink = document.getElementById("installHintLink");
    if (!overlay || !hintLink) return noop;

    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (alreadyInstalled) return noop; // niente da installare: l'icona esiste già

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    if (!isIos && !isAndroid) return noop; // su desktop "salva in Home" non ha senso

    // Icone generiche disegnate al volo (nessuna dipendenza esterna):
    // "condividi" (freccia su + vassoio), "menù" (tre puntini), "aggiungi"
    // (più dentro un riquadro), "fatto" (segno di spunta).
    const ICONS = {
      share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><rect x="4" y="12" width="16" height="8" rx="2"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
      add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
    };

    const STEPS_IOS = [
      { icon: "share", title: "Tocca l'icona Condividi", desc: "In basso al centro dello schermo (su iPad, in alto a destra) trova il pulsante con il quadratino e la freccia verso l'alto, e toccalo." },
      { icon: "add", title: "Cerca “Aggiungi a Home”", desc: "Scorri il menù che si apre finché non vedi la voce “Aggiungi a schermata Home”, e toccala." },
      { icon: "check", title: "Conferma, sei pronta/o!", desc: "Tocca “Aggiungi” in alto a destra: comparirà un'icona nella tua schermata Home. Usala per tutta la serata, senza reinquadrare il QR!" },
    ];
    const STEPS_ANDROID = [
      { icon: "menu", title: "Apri il menù del browser", desc: "Tocca i tre puntini ⋮ in alto a destra dello schermo." },
      { icon: "add", title: "Scegli “Installa app”", desc: "Nel menù tocca “Installa app” (oppure “Aggiungi a schermata Home”, secondo il browser)." },
      { icon: "check", title: "Conferma, sei pronta/o!", desc: "Conferma toccando “Installa”: comparirà un'icona nella tua schermata Home. Usala per tutta la serata, senza reinquadrare il QR!" },
    ];
    const steps = isIos ? STEPS_IOS : STEPS_ANDROID;

    const dotsEl = document.getElementById("tutorialDots");
    const iconEl = document.getElementById("tutorialIcon");
    const titleEl = document.getElementById("tutorialTitle");
    const descEl = document.getElementById("tutorialDesc");
    const quickBtn = document.getElementById("tutorialQuickInstall");
    const prevBtn = document.getElementById("tutorialPrev");
    const nextBtn = document.getElementById("tutorialNext");
    const skipBtn = document.getElementById("tutorialSkip");
    const closeBtn = document.getElementById("tutorialClose");

    dotsEl.innerHTML = steps.map(() => "<span></span>").join("");
    const dots = dotsEl.querySelectorAll("span");

    // Su Android/Chrome il browser può offrire un'installazione in un solo
    // tocco: se disponibile, la mostriamo come scorciatoia sopra ai passi
    // manuali (che restano comunque validi come ripiego).
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      quickBtn.hidden = false;
    });
    quickBtn.addEventListener("click", () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => {
        deferredPrompt = null;
        quickBtn.hidden = true;
      });
    });

    let step = 0;
    function renderStep() {
      const s = steps[step];
      iconEl.innerHTML = ICONS[s.icon];
      titleEl.textContent = s.title;
      descEl.textContent = s.desc;
      dots.forEach((d, i) => d.classList.toggle("on", i === step));
      prevBtn.hidden = step === 0;
      quickBtn.hidden = !(isAndroid && step === 0 && deferredPrompt);
      nextBtn.textContent = step === steps.length - 1 ? "Fatto, ho salvato! 🎉" : "Avanti";
    }

    function openTutorial() {
      step = 0;
      renderStep();
      overlay.hidden = false;
    }
    function closeTutorial(remember) {
      overlay.hidden = true;
      if (remember) localStorage.setItem("installTutorialDone_v1", "1");
      hintLink.hidden = false; // resta sempre un modo per riaprirlo a piacere
    }

    prevBtn.addEventListener("click", () => { if (step > 0) { step--; renderStep(); } });
    nextBtn.addEventListener("click", () => {
      if (step < steps.length - 1) { step++; renderStep(); }
      else closeTutorial(true);
    });
    skipBtn.addEventListener("click", () => closeTutorial(true));
    closeBtn.addEventListener("click", () => closeTutorial(true));
    hintLink.addEventListener("click", openTutorial);

    // Al primissimo accesso su questo telefono (cioè la prima volta che si
    // arriva sulla schermata "scatta/carica") si apre da solo; da lì in poi
    // resta comunque richiamabile dal link discreto, senza più interrompere
    // chi ha già scelto di saltarlo o l'ha già completato.
    return {
      maybeAutoOpen() {
        if (!overlay.hidden) return; // già aperto
        if (localStorage.getItem("installTutorialAutoShown_v1") !== "1") {
          localStorage.setItem("installTutorialAutoShown_v1", "1");
          openTutorial();
        } else {
          hintLink.hidden = false;
        }
      },
    };
  }
})();
