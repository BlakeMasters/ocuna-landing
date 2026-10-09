export function mountNappingRaccoon(host, initiallyPaused = false) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = initiallyPaused, inView = false, disposed = false;

  function sync() {
    if (disposed) return;
    host.dataset.running = String(!paused && inView && !doc.hidden && !reduced.matches);
  }
  const observer = new win.IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  observer.observe(host);
  reduced.addEventListener("change", sync);
  doc.addEventListener("visibilitychange", sync);
  sync();

  return {
    setPaused(value) { paused = value; sync(); },
    dispose() {
      disposed = true;
      host.dataset.running = "false";
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      doc.removeEventListener("visibilitychange", sync);
    },
  };
}
