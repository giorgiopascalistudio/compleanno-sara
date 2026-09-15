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

  let photos = [];
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
    const url = photos[idx % photos.length];
    img.src = url;
    img.classList.remove("photo-out");
    void img.offsetWidth; // forza il reflow: l'animazione riparte da capo anche se la classe era già stata rimossa
    img.classList.add("photo-in");

    const nextIdx = (idx + 1) % photos.length;
    preload(photos[nextIdx]);
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
    db.ref(base + "/photos").orderByChild("uploadedAt").on("value", (snap) => {
      const list = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v && v.url) list.push(v.url);
      });
      const hadNone = photos.length === 0;
      photos = list;

      const empty = document.getElementById("photoEmpty");
      if (empty) empty.hidden = photos.length > 0;

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
