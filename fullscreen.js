/* ============================================================
   Richiesta di schermo intero al primo tocco/click dell'utente.
   I browser permettono la Fullscreen API solo dopo un gesto reale:
   non è possibile forzarla al semplice caricamento della pagina.
   Su iPhone Safari l'API non esiste affatto (limite del browser,
   non del sito): in quel caso la chiamata non fa nulla, in silenzio.
   ============================================================ */

(function () {
  "use strict";

  function requestFs(el) {
    el = el || document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!fn) return;
    try {
      const p = fn.call(el);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignorato: niente fullscreen disponibile qui */ }
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  function toggleFs() {
    if (isFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exit) { try { exit.call(document); } catch (e) {} }
    } else {
      requestFs();
    }
  }

  window.tryFullscreen = requestFs;
  window.toggleFullscreen = toggleFs;
  window.isFullscreenActive = isFullscreen;
})();
