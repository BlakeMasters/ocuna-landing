import React from "react";
import { createRoot } from "react-dom/client";
import EngravedMotion from "../components/EngravedMotion.jsx";
import "./motion-study.css";

function MotionStudy() {
  return <>
    <a className="motion-skip" href="#study">Skip to animation</a>
    <header className="motion-header">
      <a href="/" className="motion-brand" aria-label="Ocuna home"><img src="/images/ocuna_title_logo_nobackground.webp" alt="Ocuna" width="150" height="54" /></a>
      <a className="motion-home" href="/">Back to Ocuna <span aria-hidden="true">↗</span></a>
    </header>
    <main id="study" className="motion-main" tabIndex={-1}>
      <h1>Forms in motion.</h1>
      <EngravedMotion />
    </main>
  </>;
}

createRoot(document.getElementById("root")).render(<MotionStudy />);
