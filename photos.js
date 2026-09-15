/* ============================================================
   Quiz di compleanno — slideshow foto ricordo (index.html / regia)
   Ogni foto resta visibile 3s, con dissolvenza in entrata e uscita,
   poi si passa alla successiva in ordine di caricamento; arrivate
   in fondo si riparte dall'inizio. Le nuove foto caricate dagli
   invitati entrano da sole nel giro, in tempo reale.
   ============================================================ */

(function () {
  "use strict";

  const HOLD_MS = 3000;
  const OUT_MS = 500;

  let photos = []; // [{ key, url }, ...] — key = id del record su Firebase
  let idx = 0;
  let cycleTimer = null;
  let running = false;

  function preload(url) {
    if (!url) return;
    const im = new Image();
    im.src = url;
  }

  function showNext() {
    if (!running || !photos.length) return;
    const img = document.getElementById("photoImg");
    if (!img) return;
    const photo = photos[idx % photos.length];
    img.src = photo.url;
    img.dataset.key = photo.key;
    img.classList.remove("photo-out");
    void img.offsetWidth; // forza il reflow: l'animazione riparte da capo anche se la classe era già stata rimossa
    img.classList.add("photo-in");

    const nextIdx = (idx + 1) % photos.length;
    if (photos[nextIdx]) preload(photos[nextIdx].url);
    idx = nextIdx;

    clearTimeout(cycleTimer);
    cycleTimer = setTimeout(() => {
      if (!running) return;
      img.classList.remove("photo-in");
      img.classList.add("photo-out");
      cycleTimer = setTimeout(showNext, OUT_MS);
    }, HOLD_MS);
  }

  window.initPhotoSlideshow = function (db, base) {
    const photosRef = db.ref(base + "/photos");

    photosRef.orderByChild("uploadedAt").on("value", (snap) => {
      const list = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v && v.url) list.push({ key: child.key, url: v.url });
      });
      const hadNone = photos.length === 0;
      photos = list;

      const empty = document.getElementById("photoEmpty");
      const deleteBtn = document.getElementById("deletePhotoBtn");
      if (empty) empty.hidden = photos.length > 0;
      if (deleteBtn) deleteBtn.hidden = photos.length === 0;

      if (!photos.length) {
        clearTimeout(cycleTimer);
        const img = document.getElementById("photoImg");
        if (img) { img.classList.remove("photo-in", "photo-out"); img.removeAttribute("src"); }
        return;
      }
      if (running && hadNone) {
        idx = 0;
        showNext();
      } else if (idx >= photos.length) {
        idx = 0;
      }
    });

    // Cancellare la foto originale su Cloudinary NON la toglie dal loop:
    // qui si mostra solo il link salvato nel database del gioco, quindi va
    // tolto anche da lì. Il cestino sulla foto in mostra fa proprio questo
    // (senza toccare Cloudinary, che resta comunque il tuo archivio foto).
    const deleteBtn = document.getElementById("deletePhotoBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        const img = document.getElementById("photoImg");
        const key = img && img.dataset.key;
        if (!key) return;
        const doRemove = () => {
          photosRef.child(key).remove().catch((e) => console.error("Errore nel togliere la foto:", e));
        };
        if (window.pageConfirm) {
          window.pageConfirm("Togliere questa foto dal loop sul maxischermo? Resta comunque su Cloudinary.", doRemove);
        } else {
          doRemove();
        }
      });
    }

    return {
      start() {
        if (running) return;
        running = true;
        if (photos.length) showNext();
      },
      stop() {
        running = false;
        clearTimeout(cycleTimer);
      },
    };
  };
})();
