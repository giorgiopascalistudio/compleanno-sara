/* ============================================================
   Glitter oro & argento — sfondo animato leggero su <canvas>.
   ============================================================ */

(function () {
  "use strict";

  const COLORS = ["#fbe9ad", "#e0b24f", "#fbe9ad", "#e0b24f", "#f4f5f8", "#c7cad3"];

  function initGlitter(canvasId, opts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const density = (opts && opts.density) || 0.00009; // particelle per px^2
    let W, H, dpr;
    let particles = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(W * H * density);
      particles = new Array(count).fill(0).map(makeParticle);
    }

    function makeParticle() {
      const star = Math.random() < 0.3;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: star ? 2.4 + Math.random() * 2.8 : 0.6 + Math.random() * 1.7,
        star: star,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        phase: Math.random() * Math.PI * 2,
        speed: 1.1 + Math.random() * 2,
        driftX: (Math.random() - 0.5) * 0.16,
        driftY: -0.09 - Math.random() * 0.2,
      };
    }

    function drawStar(p, alpha) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6 + p.r;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0);
      ctx.moveTo(0, -p.r); ctx.lineTo(0, p.r);
      ctx.stroke();
      ctx.restore();
    }

    function drawDot(p, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 3 + p.r;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        // contrasto alto: il glitter si "accende" e si spegne, non resta sempre visibile
        const tw = 0.12 + 0.88 * Math.pow(Math.abs(Math.sin(t * 0.0016 * p.speed + p.phase)), 1.6);
        p.x += p.driftX;
        p.y += p.driftY;
        if (p.y < -6) p.y = H + 6;
        if (p.x < -6) p.x = W + 6;
        if (p.x > W + 6) p.x = -6;
        if (p.star) {
          drawStar(p, tw);
        } else {
          drawDot(p, tw);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    if (reduceMotion) {
      frame(0); // un solo frame statico, niente loop
    } else {
      requestAnimationFrame(frame);
    }
  }

  window.initGlitter = initGlitter;
})();
