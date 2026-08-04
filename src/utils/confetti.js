// Dependency-free canvas confetti burst. Respects prefers-reduced-motion.
export function burstConfetti({ duration = 2200 } = {}) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2000';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const colors = ['#2b74e7', '#ffd93b', '#1b9a55', '#e4574c', '#7c3aed', '#0891b2'];
  const N = Math.min(180, Math.floor(W / 6));
  const parts = Array.from({ length: N }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -12 - 4,
    size: Math.random() * 6 + 4,
    color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
  }));

  const start = performance.now();
  const gravity = 0.32;
  const tick = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
