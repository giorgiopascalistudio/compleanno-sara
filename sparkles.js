/* ============================================================
   Glitter oro & argento — pioggia di brillantini animata su <canvas>.
   Cade dall'alto come una cascata, con bagliore e picchi di luce.
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
    let lastT = null;

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
      const star = Math.random() < 0.32;
      return {
        homeX: Math.random() * W,
        y: Math.random() * H,
        r: star ? 2.4 + Math.random() * 2.8 : 0.7 + Math.random() * 1.8,
        star: star,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: 1.3 + Math.random() * 2.2, // velocità dello sfarfallio
        fall: 26 + Math.random() * 46, // px/s di caduta — la "cascata"
        swayAmp: 6 + Math.random() * 16, // ampiezza dell'ondeggio laterale
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.4 + Math.random() * 0.6,
      };
    }

    function drawStar(p, x, alpha, glow) {
      ctx.save();
      ctx.translate(x, p.y);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = glow;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0);
      ctx.moveTo(0, -p.r); ctx.lineTo(0, p.r);
      ctx.stroke();
      if (alpha > 0.82) {
        // picco di luce: un piccolo bagliore bianco al centro, come un vero riflesso
        ctx.globalAlpha = (alpha - 0.82) / 0.18;
        ctx.fillStyle = "#fffdf6";
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawDot(p, x, alpha, glow) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = glow;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame(t) {
      if (lastT === null) lastT = t;
      const dt = Math.min(0.05, (t - lastT) / 1000); // secondi, clampato per evitare salti
      lastT = t;

      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        // contrasto alto: il glitter si "accende" e si spegne, non resta sempre acceso
        const tw = 0.1 + 0.9 * Math.pow(Math.abs(Math.sin(t * 0.0017 * p.twSpeed + p.twPhase)), 1.7);
        p.y += p.fall * dt;
        if (p.y > H + 8) { p.y = -8; p.homeX = Math.random() * W; }
        const x = p.homeX + Math.sin(t * 0.001 * p.swaySpeed + p.swayPhase) * p.swayAmp;
        const glow = (p.star ? 7 : 4) + p.r * 1.6 + tw * 6;
        if (p.star) {
          drawStar(p, x, tw, glow);
        } else {
          drawDot(p, x, tw, glow);
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
