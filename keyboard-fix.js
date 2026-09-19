/* ============================================================
   Su iPhone "100dvh" non si riduce quando compare la tastiera (quel
   valore segue solo i cambi di barra del browser, non la tastiera): il
   contenuto fisso in basso — pulsanti Avanti/Indietro, box di testo —
   resta nascosto sotto la tastiera invece di alzarsi con lei.
   L'API VisualViewport riporta invece l'altezza REALMENTE visibile:
   la usiamo per una variabile CSS che il layout usa al posto di
   "100dvh", così l'intera schermata (fissa, senza scorrimento) si
   restringe insieme alla tastiera invece di restarne coperta.
   ============================================================ */
(function () {
  "use strict";

  function apply() {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty("--app-vh", h + "px");
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", apply);
    window.visualViewport.addEventListener("scroll", apply);
  }
  window.addEventListener("resize", apply);
  apply();
})();
