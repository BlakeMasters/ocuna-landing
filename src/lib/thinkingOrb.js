const TRANSITION_MS = 400;

// Keep one canvas and one clock through state changes, pauses and visibility changes.
export function createThinkingOrbRenderer(canvas, win, modes, initial) {
  const context = canvas.getContext("2d");
  if (!context) return { update() {}, dispose() {} };

  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  let options = { ...initial };
  let mode = modes[options.state] ?? modes.globe;
  let outgoing = null;
  let transitionAt = 0;
  let elapsed = 600;
  let previous = null;
  let request = 0;
  let disposed = false;
  let visible = !win.IntersectionObserver;

  function canRun() {
    return !disposed && !options.paused && !motion.matches && visible && !win.document.hidden;
  }

  function paint() {
    const { size, dark } = options;
    const dpr = Math.min(2, win.devicePixelRatio || 1);
    const resolution = Math.round(size * dpr);
    // Assigning either dimension clears the canvas, even if it did not change.
    if (canvas.width !== resolution) canvas.width = resolution;
    if (canvas.height !== resolution) canvas.height = resolution;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size, size);

    function layer(shape, opacity) {
      if (!opacity) return;
      context.save();
      context.globalAlpha = opacity;
      shape.draw(context, size, (elapsed / 1000) * shape.speed, dark);
      context.restore();
    }

    if (outgoing && !motion.matches) {
      const progress = Math.min(1, (elapsed - transitionAt) / TRANSITION_MS);
      const blend = progress * progress * (3 - 2 * progress);
      layer(outgoing, 1 - blend);
      layer(mode, blend);
      if (progress === 1) outgoing = null;
    } else {
      layer(mode, 1);
    }
  }

  function tick(now) {
    request = 0;
    if (!canRun()) return;
    if (previous !== null) elapsed += Math.max(0, now - previous);
    previous = now;
    paint();
    request = win.requestAnimationFrame(tick);
  }

  function sync() {
    if (canRun()) {
      if (!request) request = win.requestAnimationFrame(tick);
    } else {
      win.cancelAnimationFrame(request);
      request = 0;
      previous = null;
    }
  }

  const observer = win.IntersectionObserver ? new win.IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }) : null;
  observer?.observe(canvas);

  function onMotion() {
    if (motion.matches) outgoing = null;
    paint();
    sync();
  }
  motion.addEventListener("change", onMotion);
  win.document.addEventListener("visibilitychange", sync);
  paint();
  sync();

  return {
    update(next) {
      if (disposed) return;
      options = { ...options, ...next };
      const nextMode = modes[options.state] ?? modes.globe;
      if (nextMode !== mode) {
        outgoing = motion.matches ? null : mode;
        mode = nextMode;
        transitionAt = elapsed;
      }
      paint();
      sync();
    },
    dispose() {
      disposed = true;
      sync();
      observer?.disconnect();
      motion.removeEventListener("change", onMotion);
      win.document.removeEventListener("visibilitychange", sync);
    },
  };
}
