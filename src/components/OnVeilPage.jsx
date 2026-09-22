import { pagePath } from "../assets.js";
import CritterGlassCard from "./CritterGlassCard.jsx";
import { OnVeilFlowSection } from "./LandingPage.jsx";
import "./OnVeilPage.css";

const notes = [
  {
    lead: "Agents have real access.",
    body: "A crawler used to read pages and leave. Agents now log in, fill out forms, merge code, and spend money, often with a long-lived token nobody is watching.",
  },
  {
    lead: "One bad instruction is enough.",
    body: "A leaked token, or a prompt hidden in a web page, can turn a helpful agent into a flood of requests. For a small service, that is an outage.",
  },
  {
    lead: "A check before every action.",
    body: "OnVeil puts a check between an agent and the thing it wants to do. The agent presents a grant, the check reads it, and only then does the action run. We are also working on how operators review the grants that were used.",
  },
];

const skyline = [
  [0, 70, 96], [64, 46, 132], [104, 84, 74], [182, 52, 150], [228, 70, 108],
  [292, 40, 84], [326, 96, 126], [416, 58, 92], [468, 44, 160], [506, 80, 104],
  [580, 60, 72], [634, 50, 118], [678, 90, 88], [762, 46, 142], [802, 74, 98],
  [870, 56, 124], [920, 88, 80], [1002, 48, 154], [1044, 76, 102], [1114, 54, 130],
  [1162, 92, 86], [1248, 50, 140], [1292, 72, 100], [1358, 82, 122],
];

const crowdRows = [
  { base: 70, scale: 0.34, step: 30, offset: 12 },
  { base: 110, scale: 0.44, step: 38, offset: 0 },
  { base: 150, scale: 0.56, step: 47, offset: 22 },
];

const LIT_RANGE = [43 + 14, 576 - 14];

const RAY_COUNT = 22;
const rayStops = Array.from({ length: RAY_COUNT }, (_, index) => {
  const start = (index * 360) / RAY_COUNT + ((index * 5) % 3);
  const end = start + 4 + ((index * 7) % 5);
  return `var(--ray-ink) ${start}deg ${end}deg, transparent ${end}deg ${(index + 1) * (360 / RAY_COUNT)}deg`;
}).join(", ");

function Figure({ x, base, scale, className }) {
  const s = scale;
  return (
    <g className={className}>
      <circle cx={x} cy={base - 70 * s} r={17 * s} />
      <path
        d={`M${x - 31 * s} ${base} C${x - 31 * s} ${base - 38 * s} ${x - 20 * s} ${base - 49 * s} ${x} ${base - 49 * s} C${x + 20 * s} ${base - 49 * s} ${x + 31 * s} ${base - 38 * s} ${x + 31 * s} ${base} Z`}
      />
    </g>
  );
}

function Crowd() {
  return (
    <svg className="ov-scene__crowd" viewBox="0 0 1440 150" aria-hidden="true" focusable="false">
      {crowdRows.flatMap(({ base, scale, step, offset }, row) =>
        Array.from({ length: Math.ceil(1440 / step) }, (_, index) => {
          const x = offset + index * step + (((index * 37 + row * 11) % 9) - 4);
          const y = base - ((index * 13 + row * 5) % 5) * 2;
          const lit = x > LIT_RANGE[0] && x < LIT_RANGE[1];
          return (
            <Figure
              className={lit ? "ov-scene__agent" : "ov-scene__stray"}
              key={`${row}-${index}`}
              x={x}
              base={y}
              scale={scale}
            />
          );
        }),
      )}
    </svg>
  );
}

function Skyline() {
  return (
    <svg
      className="ov-scene__skyline"
      viewBox="0 0 1440 170"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {skyline.map(([x, w, h], index) => (
        <g key={x}>
          <rect className="ov-skyline__block" x={x} y={170 - h} width={w} height={h} />
          {index % 3 === 1 ? (
            <rect className="ov-skyline__block" x={x + w * 0.3} y={158 - h} width={w * 0.4} height={14} />
          ) : null}
          {Array.from({ length: Math.floor((h - 24) / 16) }, (_, row) =>
            Array.from({ length: Math.floor((w - 12) / 12) }, (_, col) =>
              (row * 7 + col * 5 + index * 3) % 11 === 0 ? (
                <rect
                  className="ov-skyline__window"
                  key={`${row}-${col}`}
                  x={x + 8 + col * 12}
                  y={170 - h + 14 + row * 16}
                  width={5}
                  height={7}
                />
              ) : null,
            ),
          )}
        </g>
      ))}
    </svg>
  );
}

function Eye() {
  return (
    <svg className="ov-scene__eye" viewBox="30 30 360 160" aria-hidden="true" focusable="false">
      <g filter="url(#ovp-grit)">
        <path className="ov-eye__white" d="M40 110 C110 22 310 22 380 110 C310 198 110 198 40 110 Z" />
        <circle className="ov-eye__iris" cx="210" cy="110" r="58" />
        <circle className="ov-eye__ring" cx="210" cy="110" r="38" />
        <circle className="ov-eye__pupil" cx="210" cy="110" r="12" />
      </g>
    </svg>
  );
}

export default function OnVeilPage() {
  return (
    <main className="ov-page" id="top" tabIndex={-1}>
      <svg className="ov-page__defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="ovp-grit" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -34 26.4"
              result="specks"
            />
            <feComposite in="rough" in2="specks" operator="in" />
          </filter>
          <pattern id="ovp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#161311" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#ebe3d3" strokeWidth="1.4" strokeOpacity="0.38" />
          </pattern>
        </defs>
      </svg>

      <section className="ov-scene" aria-labelledby="onveil-title">
        <div className="ov-scene__art" aria-hidden="true">
          <div
            className="ov-scene__rays"
            style={{ backgroundImage: `conic-gradient(from 0deg at var(--eye-x) var(--eye-y), ${rayStops})` }}
          />
          <Skyline />
          <div className="ov-scene__beam" />
          <Crowd />
          <Eye />
        </div>

        <div className="shell ov-scene__content">
          <div className="ov-scene__intro">
            <h1 className="ov-page__title" id="onveil-title">
              Checking what agents are allowed to run
            </h1>
            <p>
              More AI agents are online every month. They crawl pages, call APIs, open pull
              requests, and run commands, usually with someone&rsquo;s credentials attached.
              Most services can&rsquo;t tell a well-behaved agent from a hijacked one until
              something breaks.
            </p>
            <p>
              OnVeil is Ocuna&rsquo;s research into checking an agent&rsquo;s authority
              before it executes anything.
            </p>
            <a className="ov-page__link" href={pagePath("")}>
              More from Ocuna
            </a>
          </div>

          <div className="ov-scene__notes">
            <h2 className="ov-page__subtitle">Why we&rsquo;re working on it</h2>
            {notes.map((note) => (
              <p className="ov-scene__note" key={note.lead}>
                <strong>{note.lead}</strong> {note.body}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="ov-page__signal">
        <div className="ov-page__flow-stage">
          <OnVeilFlowSection />
        </div>
      </section>

      <section className="ov-page__critter" id="critter">
        <div className="shell">
          <CritterGlassCard
            title="Natural Instinct"
            description="The raccoon motif references behavioral variation, learning, and adaptation."
          />
        </div>
      </section>
    </main>
  );
}
