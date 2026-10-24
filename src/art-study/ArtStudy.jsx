import { useCallback, useEffect, useRef, useState } from "react";
import ImageMarks from "../components/ImageMarks.jsx";

const SOURCES = [
  { id: "woodland", label: "Watercolor woodland", src: "/critter/watercolor-woodland.png", alt: "Watercolor trees framing an open woodland clearing.", tone: "dark" },
  { id: "tree", label: "Raccoons & tree", src: "/images/ocuna_background1c.webp", alt: "Three raccoons around the roots of a hollow tree.", tone: "dark" },
  { id: "engraving", label: "Raccoon field note", src: "/research/raccoon-field-note.png", alt: "A detailed raccoon engraving on cream paper, reaching toward a small orange circle.", tone: "paper" },
];

export default function ArtStudy() {
  const [source, setSource] = useState(SOURCES[0]);
  const [mode, setMode] = useState("hatch");
  const [tone, setTone] = useState("dark");
  const [cellSize, setCellSize] = useState(7);
  const [underlay, setUnderlay] = useState(16);
  const [exposure, setExposure] = useState(180);
  const [glow, setGlow] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [split, setSplit] = useState(38);
  const [status, setStatus] = useState({ state: "loading" });
  const [uploadError, setUploadError] = useState("");
  const canvasRef = useRef(null);
  const uploadRef = useRef(null);
  const requestRef = useRef(0);
  const onStatus = useCallback((next) => setStatus(next), []);

  useEffect(() => () => {
    requestRef.current += 1;
    if (uploadRef.current) URL.revokeObjectURL(uploadRef.current);
  }, []);

  function selectSource(id) {
    requestRef.current += 1;
    const selected = SOURCES.find((item) => item.id === id);
    if (!selected) return;
    setSource(selected);
    setTone(selected.tone);
    setUploadError("");
    if (uploadRef.current) URL.revokeObjectURL(uploadRef.current);
    uploadRef.current = null;
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++requestRef.current;
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose a PNG, JPEG, WebP, or SVG image.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (request !== requestRef.current) { URL.revokeObjectURL(url); return; }
      if (image.width * image.height > 40_000_000) throw new Error("large");
      if (uploadRef.current) URL.revokeObjectURL(uploadRef.current);
      uploadRef.current = url;
      setSource({ id: "upload", label: file.name, src: url, alt: `Your image: ${file.name}` });
      setUploadError("");
    } catch (error) {
      URL.revokeObjectURL(url);
      if (request === requestRef.current) setUploadError(error.message === "large" ? "Choose an image smaller than 40 megapixels." : "This image could not be opened. Try a PNG or JPEG.");
    }
  }

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `ocuna-${mode}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  return (
    <div className="art-study">
      <header className="art-header"><a className="art-brand" href="/">Ocuna</a><a href="/">Back to site <span aria-hidden="true">↗</span></a></header>
      <main>
        <div className="art-intro"><h1>Image rendering</h1><p>Lines and characters, drawn from the image. Drag to compare.</p></div>
        <section className="art-workspace" aria-label="Interactive image rendering comparison">
          <div className="art-toolbar">
            <div className="art-mode" role="group" aria-label="Rendering style">
              <button type="button" aria-pressed={mode === "hatch"} onClick={() => setMode("hatch")}>Diagonal hatching</button>
              <button type="button" aria-pressed={mode === "ascii"} onClick={() => setMode("ascii")}>Colored ASCII</button>
            </div>
            <div className="art-image-picker"><label className="sr-only" htmlFor="art-source">Source image</label><select id="art-source" value={source.id} onChange={(event) => selectSource(event.target.value)}>{SOURCES.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}{source.id === "upload" && <option value="upload">{source.label}</option>}</select><label className="art-upload">Open image<input type="file" accept="image/*" onChange={upload} /></label></div>
          </div>
          <ImageMarks src={source.src} alt={source.alt} mode={mode} tone={tone} cellSize={cellSize} underlay={underlay / 100} exposure={exposure / 100} glow={glow} animate={animate} split={split} onSplitChange={setSplit} onStatus={onStatus} outputRef={canvasRef} />
          <div className="art-controls">
            <label className="art-range" htmlFor="art-size"><span>Mark size <output>{cellSize} px</output></span><input id="art-size" type="range" min="4" max="16" step="1" value={cellSize} onChange={(event) => setCellSize(Number(event.target.value))} /></label>
            <label className="art-range" htmlFor="art-underlay"><span>Image beneath <output>{underlay}%</output></span><input id="art-underlay" type="range" min="0" max="65" value={underlay} onChange={(event) => setUnderlay(Number(event.target.value))} /></label>
            <label className="art-range" htmlFor="art-exposure"><span>Brightness <output>{(exposure / 100).toFixed(1)}×</output></span><input id="art-exposure" type="range" min="50" max="300" step="10" value={exposure} disabled={tone === "paper"} onChange={(event) => setExposure(Number(event.target.value))} /></label>
            <label className="art-background">Background<select aria-label="Background" value={tone} onChange={(event) => setTone(event.target.value)}><option value="dark">Dark</option><option value="paper">Paper</option></select></label>
            <label className="art-glow"><input type="checkbox" checked={glow} onChange={(event) => setGlow(event.target.checked)} disabled={tone === "paper"} />Glow</label>
            <div className="art-actions"><button type="button" onClick={() => setAnimate((value) => !value)}>{animate ? "Pause" : "Play"}</button><button type="button" onClick={download} disabled={status.state !== "ready"}>Save PNG <span aria-hidden="true">↓</span></button></div>
          </div>
          <p className="art-error" role="alert">{uploadError || (status.state === "error" ? status.message : "")}</p>
        </section>
        <section className="art-explanation" aria-label="How the effects work">
          <article><h2>Diagonal hatching</h2><p>Sample the image on a grid. Its light and edges decide which way each line leans, how long it is, and how brightly it appears. Nearby lines form the chevrons.</p></article>
          <article><h2>Colored ASCII</h2><p>Replace each sample with a character of similar visual weight, then give it the original color. Small changes to the characters create motion without moving the subject.</p></article>
          <article><h2>The soft color underneath</h2><p>A faint image layer keeps the shape readable; blurred marks add glow. Set “Image beneath” to zero to see just the marks. Images you open stay in your browser.</p></article>
        </section>
      </main>
    </div>
  );
}
