import { CHAPTERS, filmFrame } from "./engravedTimeline.js";

/** Native media playback only: no canvas, worker, particle loop, or frame timer. */
export function mountPreparedPlayback({ host, opening, loop, poster, assets, sourceUrl = value => value, playing = true, onDescription = () => {}, onVariant = () => {} }) {
  const query = window.matchMedia("(max-width: 620px)");
  let variant = query.matches ? "mobile" : "desktop";
  let phase = "poster", started = false, inView = false, disposed = false, failed = false, blocked = false;
  let openingAt = 0, loopAt = assets.loopEntry, loopCued = false, epoch = 0, cycle = 0, lastLoopTime, lastScene = -1;
  const removers = [];
  const canPlay = () => playing && inView && !document.hidden && !disposed && !failed;
  const active = () => phase === "loop" ? loop : opening;
  // Source replacement clears currentTime until metadata arrives. Retain the
  // requested seek for another resize and for the chapter description meanwhile.
  const position = () => active().readyState >= 1 ? active().currentTime || 0 : phase === "loop" ? loopAt : openingAt;
  const listen = (target, name, fn) => { target.addEventListener(name, fn); removers.push(() => target.removeEventListener(name, fn)); };
  for (const media of [opening, loop]) { media.muted = true; media.defaultMuted = true; media.playsInline = true; media.preload = "none"; }
  opening.loop = false; loop.loop = true;

  function publish() {
    if (disposed) return;
    const still = !started || failed || blocked;
    const time = still ? 0 : position();
    const frame = filmFrame(time);
    Object.assign(host.dataset, { renderer: "prepared-video", mode: still ? "poster" : phase, variant, scene: CHAPTERS[frame.scene].name, time: time.toFixed(3), cycle: String(cycle), playing: String(!still && canPlay() && !active().paused), simulatedStrokes: "0" });
    poster.style.visibility = still || active().readyState < 2 ? "visible" : "hidden";
    opening.style.visibility = !still && phase !== "loop" && opening.readyState >= 2 ? "visible" : "hidden";
    loop.style.visibility = !still && phase === "loop" && loop.readyState >= 2 ? "visible" : "hidden";
    const quality = active().getVideoPlaybackQuality?.();
    if (quality) Object.assign(host.dataset, { mediaFrames: String(quality.totalVideoFrames), mediaDroppedFrames: String(quality.droppedVideoFrames) });
    if (frame.scene !== lastScene) { lastScene = frame.scene; onDescription(CHAPTERS[frame.scene].description); }
  }
  function pause() { epoch++; opening.pause(); loop.pause(); }
  function play(media) {
    const token = epoch;
    const result = media.play();
    result?.then(() => { if (!disposed && token === epoch) { blocked = false; publish(); } }).catch(error => {
      if (!disposed && token === epoch && canPlay() && error.name !== "AbortError") { blocked = true; publish(); }
    });
  }
  function loadVariant() {
    loopCued = false; lastLoopTime = undefined;
    const selected = assets.variants[variant];
    poster.src = sourceUrl(selected.poster); onVariant(variant);
    opening.preload = "auto"; loop.preload = "auto";
    if (phase !== "loop") opening.src = sourceUrl(selected.intro.src);
    else opening.removeAttribute("src");
    loop.src = sourceUrl(selected.loop.src);
    opening.load(); loop.load();
  }
  function handoff() {
    if (loopCued && loop.readyState >= 2 && !loop.seeking) {
      phase = "loop"; opening.pause(); opening.removeAttribute("src"); opening.load(); lastLoopTime = loop.currentTime;
      if (canPlay()) play(loop);
    }
    publish();
  }
  function sync() {
    if (disposed) return;
    if (!canPlay()) { pause(); publish(); return; }
    if (!started) { started = true; phase = "opening"; loadVariant(); }
    if (phase === "handoff") handoff();
    else play(active());
    publish();
  }
  listen(opening, "ended", () => { phase = "handoff"; handoff(); });
  for (const media of [opening, loop]) {
    listen(media, "loadedmetadata", () => {
      media.currentTime = media === loop ? loopAt : openingAt;
      if (media === loop) loopCued = true;
    });
    for (const event of ["loadeddata", "canplay", "seeked", "playing", "pause"]) listen(media, event, () => { if (phase === "handoff") handoff(); else publish(); });
    listen(media, "error", () => { failed = true; pause(); publish(); });
    listen(media, "timeupdate", () => {
      if (media === loop && phase === "loop") {
        if (lastLoopTime !== undefined && loop.currentTime + .5 < lastLoopTime) cycle++;
        lastLoopTime = loop.currentTime;
      }
      publish();
    });
  }
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: .02 });
  intersection.observe(host);
  listen(document, "visibilitychange", sync);
  listen(query, "change", () => {
    const next = query.matches ? "mobile" : "desktop";
    if (variant === next) return;
    const time = position();
    pause(); variant = next;
    poster.src = sourceUrl(assets.variants[variant].poster); onVariant(variant);
    if (started) {
      openingAt = phase === "loop" ? 0 : Math.min(time, assets.loopEntry - .001);
      loopAt = phase === "loop" ? time : assets.loopEntry;
      loadVariant(); sync();
    } else publish();
  });
  onVariant(variant); publish(); sync();
  return {
    setPlaying(value) { playing = Boolean(value); sync(); },
    dispose() {
      disposed = true; pause(); intersection.disconnect(); removers.forEach(remove => remove());
      for (const media of [opening, loop]) { media.removeAttribute("src"); media.load(); }
    },
  };
}
