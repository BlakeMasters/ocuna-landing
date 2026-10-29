import { useEffect, useRef, useState } from "react";
import { CHAPTERS, DURATION, sceneStart } from "../lib/engravedTimeline.js";
import { mountEngravedMotion } from "../lib/engravedPlayer.js";

import "./EngravedMotion.css";

const clock = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
export default function EngravedMotion({ embedded = false, playing: controlledPlaying, onPlayingChange }) {
  const hostRef = useRef(null), canvasRef = useRef(null), playerRef = useRef(null), userChoice = useRef(false);
  const [localPlaying, setLocalPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const controlled = controlledPlaying !== undefined;
  const playing = controlled ? controlledPlaying : localPlaying;
  const [ready, setReady] = useState(false), [error, setError] = useState(null);
  const [frame, setFrame] = useState({ time: 0, scene: 0, progress: 0 });

  useEffect(() => {
    // A transferred canvas cannot be transferred again. Give every effect mount
    // its own surface, including React StrictMode's setup/cleanup/setup cycle.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", CHAPTERS[0].description);
    hostRef.current.append(canvas); canvasRef.current = canvas;
    let longTaskObserver;
    if (import.meta.env.DEV && typeof PerformanceObserver !== "undefined") {
      let count = 0, max = 0;
      canvasRef.current.dataset.mainLongTasks = "0"; canvasRef.current.dataset.mainMaxLongTaskMs = "0";
      try {
        longTaskObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) { count++; max = Math.max(max, entry.duration); }
          canvas.dataset.mainLongTasks = String(count); canvas.dataset.mainMaxLongTaskMs = max.toFixed(2);
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch { /* Optional local profiling. */ }
    }
    const player = mountEngravedMotion(canvasRef.current, {
      playing, paper: !embedded,
      background: embedded ? getComputedStyle(hostRef.current.closest(".system-home")).backgroundColor : "#f2f2f2",
      onUpdate: next => setFrame(previous => embedded && previous.scene === next.scene ? previous : next), onReady: () => setReady(true), onError: setError,
    });
    playerRef.current = player;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { if (!controlled && !userChoice.current) setLocalPlaying(!query.matches); };
    query.addEventListener("change", preference);
    return () => { longTaskObserver?.disconnect(); player.dispose(); playerRef.current = null; canvas.remove(); canvasRef.current = null; query.removeEventListener("change", preference); };
  }, []);

  useEffect(() => { playerRef.current?.setPlaying(playing); }, [playing]);
  useEffect(() => { canvasRef.current?.setAttribute("aria-label", CHAPTERS[frame.scene].description); }, [frame.scene]);

  function toggle() { userChoice.current = true; if (controlled) onPlayingChange?.(!playing); else setLocalPlaying(value => !value); }
  function choose(scene) { playerRef.current?.seek(sceneStart(scene)); }

  return (
    <section className={`engraved-film${embedded ? " engraved-film--home" : ""}`} aria-label="Animated engravings">
      <div className="engraved-stage" aria-busy={!ready && !error}>
        <div className="engraved-surface" ref={hostRef} />
        {!embedded && frame.scene === 7 && <span className="protein-site-label" style={{ opacity: 1 - frame.progress }}>Binding target</span>}
        {!ready && !error && <p className="engraved-loading" role="status">Loading animation…</p>}
        {error && <div className="engraved-fallback"><p role="status">{error.message}</p></div>}
      </div>
      {!embedded && <div className="engraved-controls">
        <div className="engraved-transport">
          <button className="engraved-play" type="button" disabled={!ready} onClick={toggle} aria-label={playing ? "Pause animation" : "Play animation"} aria-pressed={playing}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 6v12M16 6v12" /> : <path d="m9 5 10 7-10 7Z" />}</svg>
          </button>
          <button className="engraved-restart" type="button" disabled={!ready} aria-label="Restart animation" onClick={() => playerRef.current?.seek(0)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 7M5 3v6h6" /></svg>
          </button>
        </div>
        <>
        <nav className="engraved-chapters" aria-label="Animation scenes">
          {CHAPTERS.map((chapter, index) => <button key={chapter.name} type="button" disabled={!ready} aria-pressed={frame.scene === index} onClick={() => choose(index)}>{chapter.name}</button>)}
        </nav>
        <span className="engraved-clock" aria-hidden="true">{clock(frame.time)} <span>/ {clock(DURATION)}</span></span>
        <input className="engraved-timeline" aria-label="Animation timeline" type="range" min="0" max={DURATION - .01} step="0.01" value={frame.time} disabled={!ready} onChange={event => playerRef.current?.seek(Number(event.target.value))} aria-valuetext={`${CHAPTERS[frame.scene].name}, ${Math.floor(frame.time)} seconds of ${DURATION}`} style={{ "--progress": `${frame.time / DURATION * 100}%` }} />
        </>
      </div>}
      {!embedded && <p className="engraved-help">Use the timeline to inspect a transition.</p>}
    </section>
  );
}
