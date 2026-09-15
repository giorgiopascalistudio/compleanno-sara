/* ============================================================
   Quiz di compleanno — logica pagina foto (foto.html)
   Ridimensiona le immagini nel browser, controlla la durata dei
   video (max 15s), carica tutto su Cloudinary (hosting gratuito,
   upload diretto senza server) e ne salva il link nel database del
   gioco, così la regia può mostrarlo in loop.
   ============================================================ */

(function () {
  "use strict";

  const MAX_VIDEO_SECONDS = 15.5; // un po' di tolleranza sull'arrotondamento

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

  const fileInput = document.getElementById("fileInput");
  const pickBtn = document.getElementById("pickBtn");
  const preview = document.getElementById("preview");
  const previewImg = document.getElementById("previewImg");
  const previewVideo = document.getElementById("previewVideo");
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
    statusMsg.textContent = "";
    uploadBtn.disabled = false;
    retakeBtn.disabled = false;
  });

  // --- suggerimento "aggiungi a schermata Home", una tantum ---
  initInstallBanner();

  function initInstallBanner() {
    const banner = document.getElementById("installBanner");
    if (!banner) return;

    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const alreadyDismissed = localStorage.getItem("installHintDismissed_v1") === "1";
    if (alreadyInstalled || alreadyDismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installText = document.getElementById("installText");
    const installCta = document.getElementById("installCta");

    if (isIos) {
      installText.innerHTML = "<b>Consiglio:</b> tocca l'icona di condivisione <b>⎋</b> qui sotto (o in alto, secondo il browser) e scegli <b>\"Aggiungi a Home\"</b>: riaprirai questa pagina in un tap per tutta la serata, senza reinquadrare il QR ogni volta.";
    } else {
      installText.textContent = "Consiglio: aggiungi questa pagina alla schermata Home per riaprirla in un tap per tutta la serata, senza dover reinquadrare il QR ogni volta.";
    }

    banner.hidden = false;

    // Su Android/Chrome si può offrire un pulsante che apre davvero il
    // prompt di installazione nativo, invece delle sole istruzioni.
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installCta.hidden = false;
    });
    installCta.addEventListener("click", () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => {
        deferredPrompt = null;
        installCta.hidden = true;
      });
    });

    document.getElementById("installClose").addEventListener("click", () => {
      banner.hidden = true;
      localStorage.setItem("installHintDismissed_v1", "1");
    });
  }
})();
