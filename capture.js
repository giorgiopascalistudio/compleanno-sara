/* ============================================================
   Quiz di compleanno — logica pagina foto (foto.html)
   Ridimensiona l'immagine nel browser, la carica su Cloudinary
   (hosting gratuito, upload diretto senza server) e ne salva il
   link nel database del gioco, così la regia può mostrarla in loop.
   ============================================================ */

(function () {
  "use strict";

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
  const uploadBtn = document.getElementById("uploadBtn");
  const retakeBtn = document.getElementById("retakeBtn");
  const statusMsg = document.getElementById("statusMsg");
  const pickCard = document.getElementById("pickCard");
  const doneCard = document.getElementById("doneCard");

  let selectedBlob = null;
  let previewUrl = null;

  pickBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    statusMsg.textContent = "Preparo la foto…";
    resizeImage(file, 1600, 0.82).then((blob) => {
      selectedBlob = blob;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      previewImg.src = previewUrl;
      preview.hidden = false;
      statusMsg.textContent = "";
    }).catch(() => {
      statusMsg.textContent = "Non sono riuscito a leggere questa foto, riprova.";
    });
  });

  retakeBtn.addEventListener("click", () => {
    fileInput.value = "";
    selectedBlob = null;
    preview.hidden = true;
    statusMsg.textContent = "";
  });

  // Ridimensiona lato browser prima di caricare: foto più leggere,
  // upload più veloci e meno spazio occupato.
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
    statusMsg.textContent = "Carico la foto…";

    const form = new FormData();
    form.append("file", selectedBlob, "foto.jpg");
    form.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    form.append("folder", base + "/photos");

    fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CONFIG.cloudName + "/image/upload", {
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
    selectedBlob = null;
    fileInput.value = "";
    statusMsg.textContent = "";
    uploadBtn.disabled = false;
    retakeBtn.disabled = false;
  });
})();
