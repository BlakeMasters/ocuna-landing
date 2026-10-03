/** Ocuna's original contours, animated with a continuous vector deformation rig. */
import { RACCOON_CONTOURS } from "./raccoon_art.js";
const NS = "http://www.w3.org/2000/svg";
const DURATION = 16;
const SIMPLE_DURATION = 14.8 + 10; // Keep the page clear for ten seconds between walks.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const pulse = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));

/** Seconds map to a deterministic pose, also used by scrubbing and still exports. */
export function raccoonPose(seconds, variation = 0, profile = "varied") {
  if (profile === "startle-sniff") {
    const t = clamp(Number(seconds) || 0, 0, SIMPLE_DURATION);
    const enter = clamp((t - .1) / 7);
    const leave = clamp((t - 9) / 5.3);
    // Hold walking speed until the final 6% of the approach, then stop smoothly.
    const arrival = enter < .94 ? enter / .97 : 1 - (1 - enter) ** 2 / (.06 * 1.94);
    const departure = leave < .24 ? leave ** 2 / (.24 * 1.76) : (leave - .12) / .88;
    const x = mix(-550, 365, arrival) + 1000 * departure;
    const walk = t < 7.1 ? 1 - ramp(t, 6.68, 7.1)
      : ramp(t, 9, 9.5) * (1 - ramp(t, 14, 14.3));
    const startle = pulse(t, 7.08, 7.18, 7.3, 7.5);
    const down = pulse(t, 7.5, 7.95, 8.4, 9);
    const phase = (x + 550) / 140 * Math.PI * 2;
    return {
      t, x, walk, phase, down, startle, turn: 0, back: 0, profile,
      bob: -1.5 * Math.cos(phase * 2) * walk - 2.2 * startle + 1.8 * down,
      pitch: -2.5 * startle + 9 * down,
      blink: pulse(t, 7.14, 7.19, 7.22, 7.31),
      phaseLabel: t < 7.1 ? "Walking in" : t < 7.5 ? "Startled"
        : t < 9 ? "Sniffing" : t < 14.3 ? "Walking out" : "Offstage",
    };
  }
  const t = clamp(Number(seconds) || 0, 0, DURATION);
  const enter = clamp((t - .25) / 3.9);
  const leave = clamp((t - 10.3) / 4.65);
  // Linear travel with a gentle braking / accelerating section at the stop.
  const arrival = enter < .72 ? enter / .86 : 1 - (1 - enter) ** 2 / (.28 * 1.72);
  const departure = leave < .24 ? leave ** 2 / (.24 * 1.76) : (leave - .12) / .88;
  const x = mix(-550, 365, arrival) + 1000 * departure;
  const walk = t < 4.15 ? (1 - ramp(t, 3.65, 4.15))
    : ramp(t, 10.3, 10.85) * (1 - ramp(t, 14.65, 14.95));
  // Keep the traced head intact; change only its soft idle gestures.
  const down = variation === 1
    ? .7 * Math.max(pulse(t, 6.3, 6.85, 7.25, 7.8), pulse(t, 8.0, 8.4, 8.65, 9.2))
    : variation === 2 ? 0 : pulse(t, 7.2, 8.05, 9.05, 9.9);
  const turn = variation === 2
    ? .7 * Math.max(pulse(t, 5.1, 5.7, 6.0, 6.7), pulse(t, 8.0, 8.5, 8.85, 9.45))
    : pulse(t, 4.85, 5.5, 6.25, 6.95);
  const back = variation === 2 ? pulse(t, 5.6, 6.1, 6.25, 6.9) : pulse(t, 5.8, 6.25, 6.3, 6.95);
  const phase = (x + 550) / 140 * Math.PI * 2;
  return {
    t, x, walk, phase, down, turn, back,
    bob: -1.5 * Math.cos(phase * 2) * walk + .25 * Math.sin(t * 2.4),
    pitch: -3 * pulse(t, 4.2, 4.5, 4.8, 5.1) - 6 * turn + 4 * back + 16 * down,
    blink: Math.max(pulse(t, 4.5, 4.56, 4.59, 4.7), pulse(t, 6.85, 6.91, 6.96, 7.06),
      pulse(t, 9.55, 9.61, 9.65, 9.75)),
    phaseLabel: t < 4.15 ? "Walking in" : t < 7.2 ? "Looking around"
      : t < 9.9 ? "Looking down" : t < 10.3 ? "One last glance" : t < 14.95 ? "Walking out" : "Offstage",
  };
}

export function mountRaccoonWalk(host, props = {}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const simple = props.profile === "startle-sniff";
  const duration = simple ? SIMPLE_DURATION : DURATION;
  let disposed = false, frame = 0, time = reduced.matches ? (simple ? 7.5 : 5.6) : clamp(props.initialTime ?? 0, 0, duration);
  let variation = 0;
  let playing = props.autoplay === true && !reduced.matches;
  let loop = props.loop === true, speed = 1, previous = null, visible = true;
  const html = (parent, tag, className, value) => {
    const el = doc.createElement(tag); el.className = className;
    if (value !== undefined) el.textContent = value;
    parent.append(el); return el;
  };
  const svg = (parent, tag, attributes = {}) => {
    const el = doc.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, String(value));
    parent.append(el); return el;
  };
  const bare = props.controls === false;
  const root = html(host, "section", bare ? "raccoon-walk rw-bare" : "raccoon-walk");
  root.setAttribute("aria-label", "Ocuna raccoon animation");
  const style = html(root, "style", "");
  style.textContent = `
    body .lecture-output.section-width-full:has(.raccoon-walk){max-inline-size:none}
    .raccoon-walk{color:#17201e;background:#fff;border:1px solid #dedfda;border-radius:6px;overflow:hidden;isolation:isolate;font:14px/1.4 system-ui,sans-serif;width:100%;box-sizing:border-box}
    .raccoon-walk *{box-sizing:border-box}.raccoon-walk .rw-scene{display:block;width:100%;height:auto;max-height:62vh;background:#fff;overflow:hidden}
    .raccoon-walk .rw-controls{padding:17px 22px 16px;border-top:1px solid #eceee9;background:#fafbf8;display:grid;gap:15px}
    .raccoon-walk .rw-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.raccoon-walk .rw-grow{flex:1}
    .raccoon-walk button{font:inherit;color:#27322e;background:#fff;border:1px solid #d4d9d2;border-radius:6px;padding:8px 14px;line-height:1.2;cursor:pointer}
    .raccoon-walk button:hover{background:#eef2ec}.raccoon-walk .rw-play{min-width:78px;background:#203d31;color:#fff;border-color:#203d31}.raccoon-walk .rw-play:hover{background:#315743}
    .raccoon-walk input[type=range]{width:100%;accent-color:#365943;cursor:pointer;min-width:60px;margin:0}
    .raccoon-walk .rw-timeline{display:grid;grid-template-columns:1fr auto;gap:15px;align-items:center}
    .raccoon-walk .rw-time{font:12px ui-monospace,monospace;color:#63716a;min-width:90px;text-align:right}
    .raccoon-walk .rw-phase{font-size:13px;color:#526159}.raccoon-walk .rw-loop{display:flex;gap:6px;align-items:center;font-size:12px;white-space:nowrap}.raccoon-walk input[type=checkbox]{accent-color:#365943}
    .raccoon-walk .rw-cues{display:flex;gap:18px;flex-wrap:wrap}.raccoon-walk .rw-cues button{padding:0;border:0;background:none;font-size:11px;letter-spacing:.06em;color:#738177;text-transform:uppercase}.raccoon-walk .rw-cues button[aria-current=true]{color:#213e2e;font-weight:700}
    .raccoon-walk select{font:inherit;font-size:12px;border:1px solid #d4d9d2;border-radius:5px;padding:5px;background:#fff;color:#263b2f}
    .raccoon-walk :focus-visible{outline:2px solid #396749;outline-offset:4px}
    @media(max-width:600px){.raccoon-walk .rw-controls{padding:12px;gap:12px}.raccoon-walk .rw-cues{gap:12px}.raccoon-walk .rw-phase{width:100%;order:5}.raccoon-walk .rw-scene{min-height:240px;object-fit:contain}}
    .raccoon-walk.rw-bare{color:var(--notebook-ink,#17201e);background:transparent;border:0;border-radius:0;pointer-events:none}
    .raccoon-walk.rw-bare .rw-scene{background:transparent;min-height:0}
    .raccoon-walk.rw-bare [data-raccoon] path{fill:currentColor}
  `;
  // A pixel-sized actor uses a 1:1 viewBox; the presentation's original scalable
  // scene remains available when both actor sizing options are omitted.
  const relativeSize = props.actorWidthEm !== undefined;
  const fixedSize = props.actorWidth !== undefined || relativeSize;
  const paced = simple && fixedSize && Number(props.walkCadence) > 0;
  let entryRate = 1, exitRate = 1;
  const targetWidth = Math.max(1, Number(props.actorWidth) || 120);
  let lastTargetWidth = targetWidth;
  let sceneWidth = 1280;
  let actorScale = fixedSize ? targetWidth / 860 : props.scale ?? .62;
  const baseline = props.baseline ?? 72;
  const scene = svg(root, "svg", { viewBox: `0 0 1280 ${props.sceneHeight ?? 420}`, class: "rw-scene", role: "img",
    "aria-label": simple ? "The Ocuna raccoon walks in, briefly startles, sniffs downward, and walks on."
      : "The Ocuna raccoon walks across the page, occasionally pausing to look around or sniff." });
  const desc = svg(scene, "desc");
  desc.textContent = "The Ocuna raccoon logo, traced into smooth vector contours and animated without lettering.";
  const shadow = svg(scene, "ellipse", { cy: baseline + 395 * actorScale, cx: 0,
    rx: 160 * actorScale, ry: 1.5, fill: "#17201e", opacity: .018, style: "filter:blur(1px)" });
  const actor = svg(scene, "g", { "data-raccoon": "" });
  const farForeleg = svg(actor, "path", { fill: "#050505", "data-leg": "far-front" });
  const art = svg(actor, "path", { fill: "#050505", "fill-rule": "evenodd", "data-raccoon-mark": "" });
  let drawControls = () => {};
  if (!bare) {
    const controls = html(root, "div", "rw-controls");
    const timeline = html(controls, "div", "rw-timeline");
    const slider = html(timeline, "input", "");
    slider.type = "range"; slider.min = "0"; slider.max = String(duration); slider.step = ".01";
    slider.setAttribute("aria-label", "Raccoon animation position");
    const clock = html(timeline, "span", "rw-time");
    const row = html(controls, "div", "rw-row");
    const play = html(row, "button", "rw-play", "Play"); play.type = "button";
    const replay = html(row, "button", "", "Replay"); replay.type = "button";
    const phase = html(row, "span", "rw-phase");
    html(row, "span", "rw-grow");
    const rate = html(row, "select", ""); rate.setAttribute("aria-label", "Animation speed");
    for (const [value, label] of [[.5, "0.5× speed"], [1, "1× speed"], [1.5, "1.5× speed"]]) {
      const option = html(rate, "option", "", label); option.value = String(value); option.selected = value === 1;
    }
    const loopLabel = html(row, "label", "rw-loop");
    const loopInput = html(loopLabel, "input", ""); loopInput.type = "checkbox"; loopInput.checked = loop;
    html(loopLabel, "span", "", "Loop");
    const cues = html(controls, "div", "rw-cues");
    const cueStops = simple ? [["Enter", 3.6], ["Startle", 7.25], ["Sniff", 8.2], ["Walk on", 11.2]]
      : [["01 / Enter", 2], ["02 / Look around", 5.8], ["03 / Look down", 8.5], ["04 / Exit", 12.2]];
    const cueButtons = cueStops
      .map(([label, at]) => {
        const button = html(cues, "button", "", label); button.type = "button";
        button.addEventListener("click", () => seek(at)); return button;
      });
    drawControls = p => {
      slider.value = String(time);
      slider.setAttribute("aria-valuetext", `${time.toFixed(1)} seconds: ${p.phaseLabel}`);
      clock.textContent = `${time.toFixed(1).padStart(4, "0")} / ${duration.toFixed(1)} s`;
      phase.textContent = p.phaseLabel;
      play.textContent = playing ? "Pause" : time >= duration ? "Replay" : "Play";
      const cueIndex = simple ? (time < 7.1 ? 0 : time < 7.5 ? 1 : time < 9 ? 2 : 3)
        : (time < 4.15 ? 0 : time < 7.2 ? 1 : time < 10.3 ? 2 : 3);
      cueButtons.forEach((button, i) => button.setAttribute("aria-current", String(i === cueIndex)));
    };
    play.addEventListener("click", () => playing ? pause() : start());
    replay.addEventListener("click", () => start(true));
    slider.addEventListener("input", () => seek(slider.value));
    rate.addEventListener("change", () => { speed = Number(rate.value); previous = null; });
    loopInput.addEventListener("change", () => { loop = loopInput.checked; });
    const stopKeys = event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " "].includes(event.key)) event.stopPropagation(); };
    controls.addEventListener("keydown", stopKeys);
  }

  function curve(points) {
    const n = points.length, f = v => v.toFixed(2);
    const middle = (a,b) => `${f((a[0]+b[0])/2)} ${f((a[1]+b[1])/2)}`;
    return `M${middle(points[n-1],points[0])}` + points.map((p,i) =>
      `Q${f(p[0])} ${f(p[1])} ${middle(p,points[(i+1)%n])}`).join("") + "Z";
  }
  function draw() {
    const p = raccoonPose(time, variation, props.profile);
    root.dataset.time = time.toFixed(3); root.dataset.phase = p.phaseLabel;
    root.dataset.playing = String(playing);
    root.dataset.variation = simple ? "startle-sniff" : ["look-around", "sniff", "quick-glance"][variation];
    const stop = sceneWidth / 2 - 444 * actorScale;
    const actorX = fixedSize
      ? p.x <= 365
        ? mix(-860 * actorScale - 16, stop, clamp((p.x + 550) / 915))
        : mix(stop, sceneWidth + 16, clamp((p.x - 365) / 1000))
      : p.x + (props.centerActor ? 444 * (.62 - actorScale) : 0);
    actor.setAttribute("transform", `translate(${actorX} ${baseline}) scale(${actorScale})`);
    shadow.setAttribute("cx", String(actorX + 444 * actorScale));
    // A stance occupies 62% of a stride and retracts the paw by 140 source
    // units. Advance that stride from actual ground travel, including SVG scale.
    const gaitPose = fixedSize ? { ...p, phase: actorX / actorScale / (140 / .62) * Math.PI * 2 } : p;
    if (fixedSize && simple) {
      gaitPose.bob = -1.5 * Math.cos(gaitPose.phase * 2) * p.walk - 2.2 * p.startle + 1.8 * p.down;
    }
    const contours = raccoonContours(gaitPose).map(curve);
    farForeleg.setAttribute("d", contours[0]);
    art.setAttribute("d", contours.slice(1).join(""));
    drawControls(p);
  }
  function resize() {
    if (disposed || !fixedSize) return;
    const width = host.getBoundingClientRect().width;
    const requestedWidth = relativeSize
      ? parseFloat(win.getComputedStyle(host).fontSize) * props.actorWidthEm : targetWidth;
    if (width <= 0 || (width === sceneWidth && requestedWidth === lastTargetWidth)) return;
    sceneWidth = width;
    lastTargetWidth = requestedWidth;
    actorScale = Math.min(requestedWidth, width * .32) / 860;
    if (paced) {
      // Keep the stride cadence steady as the full-width travel lane changes.
      // These factors are the linear slopes of the arrival / departure curves.
      const stop = sceneWidth / 2 - 444 * actorScale;
      const groundSpeed = (140 / .62) * props.walkCadence * actorScale;
      entryRate = Math.min(1, groundSpeed * 7 * .97 / (stop + 860 * actorScale + 16));
      exitRate = Math.min(1, groundSpeed * 5.3 * .88 / (sceneWidth + 16 - stop));
    }
    const stageScale = relativeSize ? actorScale * 860 / 120 : 1;
    scene.setAttribute("viewBox", `0 0 ${sceneWidth} ${(props.sceneHeight ?? 420) * stageScale}`);
    shadow.setAttribute("cy", String(baseline + 395 * actorScale));
    shadow.setAttribute("rx", String(160 * actorScale));
    draw();
  }
  function schedule() {
    if (!disposed && playing && visible && !doc.hidden && !frame) frame = win.requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!playing || disposed || !visible || doc.hidden) { previous = null; return; }
    if (previous !== null) {
      // Soften the brief idle gesture without extending the ten-second gap.
      const pace = paced ? time < 7.1 ? entryRate : time < 9 ? .8 : time < 14.3 ? exitRate : 1 : 1;
      time += Math.min((now-previous)/1000, .1) * speed * pace;
    }
    previous = now;
    if (time >= duration) {
      if (loop) {
        time %= duration;
        // Select a new gesture only while the actor is entirely offstage.
        if (props.variations && !simple) variation = (variation + 1 + Math.floor(Math.random() * 2)) % 3;
      } else { time = duration; playing = false; }
    }
    draw(); schedule();
  }
  function pause() { playing = false; previous = null; win.cancelAnimationFrame(frame); frame = 0; draw(); }
  function seek(value) { pause(); time = clamp(Number(value) || 0, 0, duration); draw(); }
  function start(reset = false) { if (reset || time >= duration) time = 0; playing = true; previous = null; draw(); schedule(); }
  function visibility() { previous = null; if (doc.hidden) { win.cancelAnimationFrame(frame); frame = 0; } else schedule(); }
  function motionChanged() { if (reduced.matches) pause(); }
  doc.addEventListener("visibilitychange", visibility);
  reduced.addEventListener("change", motionChanged);
  const observer = win.IntersectionObserver ? new win.IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; previous = null;
    if (!visible) { win.cancelAnimationFrame(frame); frame = 0; } else schedule();
  }) : null;
  observer?.observe(root);
  const resizeObserver = fixedSize && win.ResizeObserver ? new win.ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  resize();
  draw(); schedule();
  return {
    seek,
    play: start,
    pause,
    dispose() {
      disposed = true; win.cancelAnimationFrame(frame); observer?.disconnect(); resizeObserver?.disconnect();
      doc.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", motionChanged); root.remove();
    },
  };
}

// Foot contacts travel backwards while planted; the return arc clears the floor.
function foot(pose, offset, restOffset = 0, restHeight = 0) {
  const cycle = ((pose.phase / (Math.PI * 2) + offset) % 1 + 1) % 1;
  const swing = clamp((cycle - .62) / .38);
  return {
    x: (restOffset + (cycle < .62 ? mix(70, -70, cycle / .62) : mix(-70, 70, smooth(swing)))) * pose.walk,
    y: (restHeight - 26 * Math.sin(swing * Math.PI) ** 2) * pose.walk - pose.bob,
  };
}

/** Deformed source points, shared by rendering and geometric checks. */
export function raccoonContours(p) {
  const simple = p.profile === "startle-sniff";
  const feet = [foot(p, 0), foot(p, .5, -40), foot(p, .75, -10), foot(p, .25, -65, 7)];
  const headAngle = (p.pitch + (simple ? .2 : .6) * Math.sin(p.phase) * p.walk) * Math.PI / 180;
  const hc = Math.cos(headAngle), hs = Math.sin(headAngle);
  const pivotX = simple ? 664 : 590, pivotY = simple ? 58 : 162;
  const tailAngle = (2.5 * Math.sin(p.phase * .5) * p.walk
    + 1.8 * Math.sin(p.t * 1.6) * (1 - p.walk) - p.down * 2) * Math.PI / 180;
  const tc = Math.cos(tailAngle), ts = Math.sin(tailAngle);
  return RACCOON_CONTOURS.map((contour, index) => contour.map(([ox, oy], vertex) => {
    let x = ox, y = oy;
    if (index === 5) y = 130 + (y - 130) * (1 - .96 * p.blink);
    // The short profile rotates the face at its attachment, with no horizontal
    // compression. Keep the long back/neck contours outside this head binding.
    const hw = simple ? smooth((ox - 615) / 60) * (1 - smooth((oy - 205) / 60))
      : smooth((ox - 485) / 175) * (1 - smooth((oy - 185) / 100));
    const hx = (x - pivotX) * (simple ? 1 : 1 - .10 * p.turn), hy = y - pivotY;
    x += (pivotX + hx * hc - hy * hs - x) * hw;
    y += (pivotY + hx * hs + hy * hc - y) * hw;
    const tailVertex = index === 1 ? vertex >= 40 && vertex <= 65 : index >= 2 && index <= 4;
    const tw = tailVertex ? (1 - smooth((ox - 235) / 85)) * smooth((oy - 95) / 65) : 0;
    const tx = ox - 245, ty = oy - 132;
    x += (245 + tx * tc - ty * ts - ox) * tw;
    y += (132 + tx * ts + ty * tc - oy) * tw;
    // Fixed source contour ranges bind both sides of each paw to the same bone.
    const nearHind = index === 1 && vertex >= 66 && vertex <= 127;
    const farHind = index === 1 && vertex >= 227 && vertex <= 249;
    const nearFront = index === 1 && ((vertex >= 201 && vertex <= 222) || (vertex >= 253 && vertex <= 280));
    const weights = [
      nearHind ? smooth((oy - 245) / 105) : 0,
      farHind ? smooth((oy - 235) / 125) : 0,
      nearFront ? smooth((oy - 210) / 150) : 0,
      index === 0 ? smooth((oy - 235) / 130) : 0,
    ];
    weights.forEach((weight, i) => { x += feet[i].x * weight; y += feet[i].y * weight; });
    return [x, y + p.bob];
  }));
}
