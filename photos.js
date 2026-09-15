/* ============================================================
   Quiz di compleanno — slideshow foto/video ricordo (index.html / regia)
   Ogni foto resta visibile 3s; ogni video viene riprodotto per intero
   (dura al massimo 15s), sempre con dissolvenza in entrata e uscita.
   Poi si passa al successivo in ordine di caricamento; arrivati in
   fondo si riparte dall'inizio. I nuovi contenuti caricati dagli
   invitati entrano da soli nel giro, in tempo reale.
   ============================================================ */

(function () {
  "use strict";

  const HOLD_MS = 3000; // tempo di visione di una foto
  const OUT_MS = 500;

  let items = []; // [{ key, url, type: "image"|"video", caption, name }, ...]
  let idx = 0;
  let cycleTimer = null;
  let running = false;

  function preload(item) {
    if (!item || item.type !== "image") return;
    const im = new Image();
    im.src = item.url;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderMeta(item) {
    const meta = document.getElementById("photoMeta");
    if (!meta) return;
    const parts = [];
    if (item.name) parts.push('<div class="who">' + escapeHtml(item.name) + "</div>");
    if (item.caption) parts.push('<div class="cap">' + escapeHtml(item.caption) + "</div>");
    meta.innerHTML = parts.join("");
  }

  function showNext() {
    if (!running || !items.length) return;
    const item = items[idx % items.length];
    const img = document.getElementById("photoImg");
    const video = document.getElementById("photoVideo");
    const meta = document.getElementById("photoMeta");
    if (!img || !video) return;

    // ferma l'eventuale video precedente prima di mostrare il prossimo elemento
    video.pause();
    video.onended = null;
    video.classList.remove("photo-in", "photo-out");
    img.classList.remove("photo-in", "photo-out");
    if (meta) meta.classList.remove("photo-in", "photo-out");

    const nextIdx = (idx + 1) % items.length;
    preload(items[nextIdx]);
    idx = nextIdx;

    renderMeta(item);

    if (item.type === "video") {
      img.style.display = "none";
      video.style.display = "";
      video.src = item.url;
      video.dataset.key = item.key;
      video.currentTime = 0;
      video.play().catch(() => {}); // riproduzione automatica bloccata su alcuni browser: si vede comunque il fermo immagine
      void video.offsetWidth;
      video.classList.add("photo-in");
      if (meta) meta.classList.add("photo-in");
      clearTimeout(cycleTimer);
      video.onended = () => {
        if (!running) return;
        video.classList.remove("photo-in");
        video.classList.add("photo-out");
        if (meta) { meta.classList.remove("photo-in"); meta.classList.add("photo-out"); }
        cycleTimer = setTimeout(showNext, OUT_MS);
      };
    } else {
      video.style.display = "none";
      img.style.display = "";
      img.src = item.url;
      img.dataset.key = item.key;
      void img.offsetWidth; // forza il reflow: l'animazione riparte da capo anche se la classe era già stata rimossa
      img.classList.add("photo-in");
      if (meta) meta.classList.add("photo-in");
      clearTimeout(cycleTimer);
      cycleTimer = setTimeout(() => {
        if (!running) return;
        img.classList.remove("photo-in");
        img.classList.add("photo-out");
        if (meta) { meta.classList.remove("photo-in"); meta.classList.add("photo-out"); }
        cycleTimer = setTimeout(showNext, OUT_MS);
      }, HOLD_MS);
    }
  }

  window.initPhotoSlideshow = function (db, base) {
    const photosRef = db.ref(base + "/photos");

    photosRef.orderByChild("uploadedAt").on("value", (snap) => {
      const list = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v && v.url) list.push({ key: child.key, url: v.url, type: v.type === "video" ? "video" : "image", caption: v.caption || "", name: v.name || "" });
      });
      const hadNone = items.length === 0;
      items = list;

      const empty = document.getElementById("photoEmpty");
      const deleteBtn = document.getElementById("deletePhotoBtn");
      if (empty) empty.hidden = items.length > 0;
      if (deleteBtn) deleteBtn.hidden = items.length === 0;

      if (!items.length) {
        clearTimeout(cycleTimer);
        const img = document.getElementById("photoImg");
        const video = document.getElementById("photoVideo");
        const meta = document.getElementById("photoMeta");
        if (img) { img.classList.remove("photo-in", "photo-out"); img.removeAttribute("src"); }
        if (video) { video.pause(); video.onended = null; video.classList.remove("photo-in", "photo-out"); video.removeAttribute("src"); }
        if (meta) { meta.classList.remove("photo-in", "photo-out"); meta.innerHTML = ""; }
        return;
      }
      if (running && hadNone) {
        idx = 0;
        showNext();
      } else if (idx >= items.length) {
        idx = 0;
      }
    });

    // Cancellare l'originale su Cloudinary NON lo toglie dal loop: qui si
    // mostra solo il link salvato nel database del gioco, quindi va tolto
    // anche da lì. Il cestino sull'elemento in mostra fa proprio questo
    // (senza toccare Cloudinary, che resta comunque il tuo archivio).
    const deleteBtn = document.getElementById("deletePhotoBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        const img = document.getElementById("photoImg");
        const video = document.getElementById("photoVideo");
        const visible = video && video.style.display !== "none" ? video : img;
        const key = visible && visible.dataset.key;
        if (!key) return;
        const doRemove = () => {
          photosRef.child(key).remove().catch((e) => console.error("Errore nel togliere l'elemento:", e));
        };
        if (window.pageConfirm) {
          window.pageConfirm("Togliere questo elemento dal loop sul maxischermo? Resta comunque su Cloudinary.", doRemove);
        } else {
          doRemove();
        }
      });
    }

    return {
      start() {
        if (running) return;
        running = true;
        if (items.length) showNext();
      },
      stop() {
        running = false;
        clearTimeout(cycleTimer);
        const video = document.getElementById("photoVideo");
        if (video) video.pause();
      },
    };
  };
})();
