import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ArtStudy from "./ArtStudy.jsx";
import "./art-study.css";

createRoot(document.getElementById("root")).render(
  <StrictMode><ArtStudy /></StrictMode>,
);
