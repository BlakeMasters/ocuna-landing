import { FOUR1 } from "../../content/four1.js";
import { escapeHtml } from "../../lib/markdown.js";
import { modelEdges, modelProjection, terminalFrame } from "./researchStageMotion.js";

const drawingStyles = `
  .research-stage__svg { display: block; width: 100%; height: auto; }
  .research-stage__structure { stroke: #4b4b4b; stroke-width: 1; stroke-linejoin: round; }
  .research-stage__detail { fill: none; stroke: #b1b1b1; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; }
  .research-stage__fine { fill: none; stroke: #747474; stroke-width: .85; stroke-linecap: round; stroke-linejoin: round; }
  .research-stage__wire { fill: none; stroke: #a1a1a1; stroke-width: 1.2; stroke-linejoin: round; }
  .research-stage__trace { stroke: #d3d3d3; }
  .research-stage__terminal-line { fill: #c6c6c6; font: 6px ui-monospace, SFMono-Regular, Consolas, monospace; }
  .research-stage__model-edge { stroke: #bcbcbc; stroke-width: .9; fill: none; }
  .research-stage__model-node { fill: #d5d5d5; }
  @media (max-width: 620px) {
    .research-stage__detail { stroke-width: 1.8; }
  }
`;

const connections = [
  { name: "lab", path: "M470 256 V300 Q470 312 482 312 H599 Q611 312 611 326 V350" },
  { name: "study", path: "M611 350 V328 Q611 314 627 314 H802 Q816 314 816 300 V262" },
  { name: "wave", path: "M611 397 V410 Q611 425 595 425 H260 Q246 425 246 439 V491" },
  { name: "model", path: "M611 397 V543 Q611 557 597 557 H487 Q472 557 472 542 V491" },
  { name: "terminal", path: "M611 397 V410 Q611 425 627 425 H826 Q840 425 840 439 V491" },
];

function structureModel(x, y) {
  const points = modelProjection();
  return `<g transform="translate(${x} ${y})">
    ${modelEdges.map(([start, end]) => {
      const a = points[start], b = points[end];
      return `<line data-model-edge="" class="research-stage__model-edge" x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" opacity="${(0.2 + (a.depth + b.depth) * 0.35).toFixed(2)}"/>`;
    }).join("")}
    ${points.map((point) => `<circle data-model-node="" class="research-stage__model-node" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${(1 + point.depth * 0.9).toFixed(2)}" opacity="${(0.35 + point.depth * 0.65).toFixed(2)}"/>`).join("")}
  </g>`;
}

function terminalScreen(x, y, id) {
  const output = terminalFrame(18);
  return `<g transform="translate(${x} ${y})">
    <defs><clipPath id="${id}-terminal-clip"><rect x="0" y="-6" width="96" height="46"/></clipPath></defs>
    <g clip-path="url(#${id}-terminal-clip)"><g data-terminal-content="">
      ${Array.from({ length: 7 }, (_, index) => `<text data-terminal-row="" class="research-stage__terminal-line" y="${index * 7.5}">${escapeHtml(output.rows[index] || "")}</text>`).join("")}
      <rect data-terminal-cursor="" x="${output.cursorX}" y="${output.cursorY}" width="3.1" height="5.8" fill="#d5d5d5"/>
    </g></g>
  </g>`;
}

function localScreen(x, y, kind, id) {
  const data = kind === "lab"
    ? `<path class="research-stage__fine" d="M${x + 7} ${y + 25}h50m-50-17v17"/><path class="research-stage__detail research-stage__trace research-stage__trace--lab" pathLength="1" d="M${x + 9} ${y + 23}q8-1 12-9t10-3q7 9 13 0t11 1"/>`
    : `<g data-study-result=""><path class="research-stage__fine" d="M${x + 7} ${y + 26}h50m-50-18v18"/><path class="research-stage__detail research-stage__trace research-stage__trace--review" pathLength="1" d="M${x + 9} ${y + 24}q8-1 12-9t10-3q7 9 13 0t11 1"/><path d="M${x + 9} ${y + 23}q8-1 12-7t10-3q7 6 13 0t11 0" stroke="#888" stroke-width=".8" stroke-dasharray="2 2" fill="none"/></g>`;
  return `<g>
    <path d="m${x + 63} ${y + 1} 3 2v33l-3-1Z" fill="#292929"/>
    <rect x="${x}" y="${y}" width="64" height="35" rx="2" fill="url(#${id}-device)" stroke="#858585" stroke-width=".7"/>
    <rect x="${x + 3}" y="${y + 3}" width="58" height="28" rx=".7" fill="#1b1b1b"/>
    ${data}
    <path d="M${x - 6} ${y + 35}h76l6 3H${x - 12}Z" fill="#a5a5a5"/>
    <path d="M${x - 12} ${y + 38}h88v2H${x - 12}Z" fill="#4e4e4e"/>
  </g>`;
}

function books(x, y, count, height = 38) {
  const shades = ["#777", "#494949", "#929292", "#5d5d5d", "#b0b0b0"];
  return Array.from({ length: count }, (_, index) => {
    const width = [9, 12, 7, 10][index % 4];
    const top = y - height + (index % 3) * 3;
    const left = x + index * 13;
    return `<g><rect x="${left}" y="${top}" width="${width}" height="${y - top}" rx=".8" fill="${shades[index % shades.length]}"/><path d="M${left + 2} ${top + 2}v${y - top - 4}" stroke="#ddd" stroke-opacity=".22" stroke-width=".75"/><path d="M${left + 3} ${top + 8}h${Math.max(2, width - 6)}" stroke="#ddd" stroke-opacity=".5" stroke-width=".8"/></g>`;
  }).join("");
}

function labFigure(id) {
  return `<g data-lab-body="">
    <path d="M239 224c-9 4-11 11-7 19 4 8 2 16-3 23 12-4 19-14 17-26Z" fill="#464646"/>
    <path d="m245 238-2 10 12 4 1-13Z" fill="#adadad"/>
    <path d="M239 216c5-8 16-8 21 0l1 10 4 5-5 2c-1 8-6 12-12 8l-7-9Z" fill="#c6c6c6"/>
    <path d="M236 229c-5-10-2-19 6-22 12-5 22 5 21 15-5-5-11-6-16-4l-3 12Z" fill="#454545"/>
    <path d="M239 216c4-6 11-6 17-2m-18 23c-3 8-2 15-6 21" stroke="#777" stroke-width=".8" fill="none"/>
    <path d="m254 225 4 1m-1 4 3 2m-7 5 4 .5" stroke="#777" stroke-width=".8" stroke-linecap="round" fill="none"/>
    <path d="M229 287c-4-16-3-31 8-39 6-5 15-5 22 0 12 8 16 25 15 39Z" fill="url(#${id}-coat)"/>
    <path d="M235 255c-4 8-4 18-3 27m15-33 6 12-6 12m12-22 5 9-8 10m-6 5-1 10" stroke="#dddddd" stroke-opacity=".65" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M231 280c5-1 9-1 14 0m14-3 9 4" stroke="#777" stroke-width=".8" fill="none"/>
    <path d="M254 279v5" stroke="#686868" stroke-width=".8"/>
    <path d="M247 249c-3 8-5 11-7 13l8 8" stroke="#777" stroke-opacity=".6" stroke-width=".8" fill="none"/>
  </g>`;
}

function studyFigure(id) {
  return `<g>
    <path d="M875 301v-48c0-12 18-15 23-2 3 9 2 32-1 49Z" fill="#494949" stroke="#767676" stroke-width="1.2"/>
    <path d="M880 291v-34c0-11 11-12 13-2l-1 36Z" fill="#313131"/>
    <path d="M845 302c14-4 35-4 53 0l3 8c-18 4-39 3-58-1Z" fill="#555"/>
    <path d="M849 312c2 15-4 23-10 31m51-31c-1 14 2 24 8 31" stroke="#777" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M850 296c4 5 2 18-1 27l-11 13 5 4 15-12c8-13 11-23 8-32Z" fill="#494949"/>
    <path d="M861 298c2 13 8 24 17 33l11 7 5-5-11-11c-3-9-4-17-3-25Z" fill="#555"/>
    <path d="M839 333c5 2 9 2 13 1l-2 8c-7 2-14 1-19-1 0-3 3-5 8-8Zm49-2c4 2 7 4 12 5 3 1 4 3 3 6h-16l-2-6Z" fill="#8b8b8b"/>
    <path d="M831 341h19m38 1h15" stroke="#393939" stroke-width="1.4" stroke-linecap="round"/>
    <g data-study-head="">
    <path d="m859 241 1 12 12 1-2-14Z" fill="#aaa"/>
    <path d="M860 216c11-4 18 4 17 14l-4 11c-6 9-14 7-18-2l-5-4 5-5 1-8Z" fill="#c1c1c1"/>
    <path d="M855 226c-5-5-1-12 5-13 3-6 10-5 13-1 10-2 13 10 7 17l-5 8-4-9-3-7c-5 4-8 1-13 5Z" fill="#424242"/>
    <path d="M857 217c3-3 6-3 9-1m3-1c4 0 7 3 8 6" stroke="#707070" stroke-width=".8" fill="none"/>
    <path d="M854 237c5 3 6 6 11 6 4-1 6-5 8-7l-1 7c-6 9-14 3-18-6Z" fill="#777"/>
    <circle cx="857" cy="230" r="3.2" fill="none" stroke="#515151" stroke-width=".9"/>
    <path d="m860 229 10-1m-18 3h2m1-4 3 .5m-2 8 3 1" stroke="#626262" stroke-width=".75" stroke-linecap="round" fill="none"/>
    </g>
    <path d="M848 299c-4-9-3-27 2-38 5-12 17-17 28-10 13 9 14 25 12 46Z" fill="url(#${id}-sweater)"/>
    <path d="M855 255c3 6 8 8 15 5m-1-6c-1 8-5 13-12 20m28-10c2 10 1 19-2 28m-33-10c4 3 9 5 16 5" stroke="#9b9b9b" stroke-opacity=".65" stroke-width="1" stroke-linecap="round" fill="none"/>
    <path d="M851 295c11 1 22 1 34-1" stroke="#414141" stroke-width="1.4" fill="none"/>
  </g>`;
}

function openStudyBook() {
  return `<g>
    <path d="M822 289q17-5 33 3 16-8 34-5l1 4q-17-3-35 4-17-7-33-3Z" fill="#606060"/>
    <path d="M824 279q15-5 33-1l-2 13q-16-6-32 1Z" fill="#b7b7b7" stroke="#999" stroke-width=".6"/>
    <path d="M857 278q16-5 31-2l-1 13q-16-4-32 2Z" fill="#d2d2d2" stroke="#aaa" stroke-width=".6"/>
    <path d="M857 278l-2 13m-25-9q11-2 21 1m-22 2q12-1 21 2m12-6q10-3 20-2m-21 5q10-2 20-1" fill="none" stroke="#777" stroke-width=".7"/>
    <g data-study-page="" opacity="0">
      <path data-study-page-sheet="" d="M857 278q16-5 31-2l-1 13q-16-4-32 2Z" fill="#d2d2d2" stroke="#b4b4b4" stroke-width=".6"/>
      <path data-study-page-lines="" d="M862 281q10-3 20-2m-21 5q10-2 20-1" fill="none" stroke="#858585" stroke-width=".65"/>
    </g>
  </g>`;
}

function monitor(x, y, kind, id) {
  const contents = kind === "wave"
    ? `<path class="research-stage__fine" opacity=".5" d="M${x + 13} ${y + 31}h91M${x + 13} ${y + 13}v38"/><path class="research-stage__detail research-stage__trace research-stage__trace--computer" pathLength="1" d="M${x + 14} ${y + 33}q9-4 16-1t10-14q5-16 9 17t9-6q5-14 11-5t12 3q8-7 19 4"/>`
    : kind === "model"
      ? structureModel(x + 57, y + 32)
      : terminalScreen(x + 10, y + 13, id);
  return `<g>
    <path d="M${x + 113} ${y + 2}l6 4v61l-6-2Z" fill="#272727"/>
    <rect x="${x}" y="${y}" width="116" height="68" rx="4" fill="url(#${id}-device)" stroke="#777" stroke-width=".8"/>
    <rect x="${x + 5}" y="${y + 5}" width="106" height="55" rx="1.5" fill="#171717"/>
    ${contents}
    <path d="M${x + 53} ${y + 68}h11v15H${x + 53}Z" fill="#696969"/>
    <path d="M${x + 33} ${y + 83}h50l9 5H${x + 25}Z" fill="#999"/>
    <path d="M${x + 25} ${y + 88}h67v2H${x + 25}Z" fill="#5e5e5e"/>
    <path d="M${x + 8} ${y + 64}h99" stroke="#626262" stroke-width=".7"/>
  </g>`;
}

function workstation(x, y, kind, id) {
  return `<g>
    <ellipse cx="${x + 61}" cy="${y + 176}" rx="87" ry="11" fill="#101010" opacity=".4"/>
    <path d="M${x - 21} ${y + 109}h7v58h-7Zm146 0h7v58h-7Z" fill="#656565"/>
    <path d="M${x - 20} ${y + 163}h10l-4 5h-13Zm144 0h10l8 5h-14Z" fill="#3a3a3a"/>
    <path d="M${x - 25} ${y + 88}h171l14 16H${x - 39}Z" fill="url(#${id}-desktop)" stroke="#8b8b8b" stroke-width=".8"/>
    <path d="M${x - 39} ${y + 104}h199v6H${x - 39}Z" fill="#494949"/>
    ${monitor(x, y, kind, id)}
    <path d="M${x + 7} ${y + 96}h77l5 5H${x + 1}Z" fill="#b3b3b3"/>
    <path d="M${x + 12} ${y + 98}h66m-66 2h66" stroke="#5c5c5c" stroke-width=".6"/>
    <ellipse cx="${x + 106}" cy="${y + 98}" rx="5" ry="2.5" fill="#aaa"/>
    <path d="M${x + 32} ${y + 153}h57l5 8H${x + 27}Z" fill="#555"/>
    <rect x="${x + 34}" y="${y + 127}" width="51" height="34" rx="8" fill="url(#${id}-chair)" stroke="#666" stroke-width=".7"/>
    <path d="M${x + 38} ${y + 132}q20-4 42 0" stroke="#787878" stroke-width=".75" fill="none"/>
    <path d="M${x + 61} ${y + 161}v14m0 0-24 6m24-6 25 6m-25-6v9" stroke="#717171" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}

// The same inspectable SVG supplies the React scene and its no-JavaScript view.
// Device activity is attached to this fixed set without rebuilding the artwork.
export function researchStageSvg(prefix = "four1-stage", logoHref = "/four1/logo.png") {
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "four1-stage";
  return `<svg id="${id}-svg" class="research-stage__svg" xmlns="http://www.w3.org/2000/svg" viewBox="28 60 1144 672" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-description">
    <title id="${id}-title">${escapeHtml(FOUR1.environmentScene.title)}</title>
    <desc id="${id}-description">${escapeHtml(FOUR1.environmentScene.description)}</desc>
    <style>${drawingStyles}</style>
    <defs>
      <linearGradient id="${id}-wall" x2="0" y2="1"><stop stop-color="#2c2c2c"/><stop offset="1" stop-color="#202020"/></linearGradient>
      <linearGradient id="${id}-floor" x2="0" y2="1"><stop stop-color="#454545"/><stop offset="1" stop-color="#353535"/></linearGradient>
      <linearGradient id="${id}-desktop" x2="0" y2="1"><stop stop-color="#979797"/><stop offset="1" stop-color="#737373"/></linearGradient>
      <linearGradient id="${id}-device" x2="1" y2="1"><stop stop-color="#757575"/><stop offset="1" stop-color="#454545"/></linearGradient>
      <linearGradient id="${id}-chair" x2="0" y2="1"><stop stop-color="#5e5e5e"/><stop offset="1" stop-color="#353535"/></linearGradient>
      <linearGradient id="${id}-coat" x2="1" y2="1"><stop stop-color="#b1b1b1"/><stop offset="1" stop-color="#818181"/></linearGradient>
      <linearGradient id="${id}-sweater" x2="1" y2="1"><stop stop-color="#858585"/><stop offset="1" stop-color="#535353"/></linearGradient>
      <linearGradient id="${id}-wood" x2="0" y2="1"><stop stop-color="#696969"/><stop offset="1" stop-color="#3b3b3b"/></linearGradient>
      <linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="#bcbcbc" stop-opacity=".1"/><stop offset=".55" stop-color="#bcbcbc" stop-opacity=".02"/><stop offset="1" stop-color="#bcbcbc" stop-opacity=".07"/></linearGradient>
      <linearGradient id="${id}-light" x2="0" y2="1"><stop stop-color="#dedede" stop-opacity=".09"/><stop offset="1" stop-color="#dedede" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}-pool"><stop stop-color="#bbb" stop-opacity=".09"/><stop offset="1" stop-color="#bbb" stop-opacity="0"/></radialGradient>
    </defs>

    <ellipse cx="600" cy="626" rx="580" ry="78" fill="url(#${id}-pool)"/>
    <g class="research-stage__structure">
      <path d="m78 84 15-10h1015l14 10Z" fill="#414141"/>
      <path d="M78 84h1044v9H78Z" fill="#292929"/>
      <path d="M84 93v535h12V93m1013 0v535h12V93" fill="#2b2b2b"/>
      <path d="M114 137h443v185H114Zm554 0h418v185H668Z" fill="url(#${id}-wall)"/>
      <path d="m84 170 30-33v185l-30 41Zm1002-33 33 33v193l-33-41Z" fill="#222"/>
      <path d="M114 322h443l29 40H84Zm554 0h418l33 40H636Z" fill="url(#${id}-floor)"/>
      <path d="M68 362h1064v9H68Z" fill="#696969"/>
      <path d="M68 371h1064v17H68Z" fill="#303030"/>
      <path d="M79 389h1042v7H79Z" fill="#161616" stroke="none"/>
      <path d="M114 414h972v193H114Z" fill="url(#${id}-wall)"/>
      <path d="m84 441 30-27v193l-43 55Zm1002-27 33 27v221l-33-55Z" fill="#202020"/>
      <path d="M114 607h972l63 62H51Z" fill="url(#${id}-floor)"/>
      <path d="M51 669h1098v7H51Z" fill="#606060"/>
      <path d="M51 676h1098v20H51Z" fill="#303030"/>
    </g>

    <path d="M116 321h438m116 0h414M116 606h968" stroke="#5b5b5b" stroke-width="1" fill="none"/>
    <path d="M89 357h481m74 0h473M74 663h1057" stroke="#999" stroke-width=".7" opacity=".2" fill="none"/>
    <ellipse cx="330" cy="341" rx="175" ry="13" fill="#111" opacity=".35"/>
    <ellipse cx="821" cy="342" rx="124" ry="11" fill="#111" opacity=".35"/>

    <g fill="#646464" stroke="#959595" stroke-width=".7">
      ${[277, 816].map((x) => `<path d="M${x} 93v15" fill="none"/><path d="M${x - 13} 108h26l-5 16h-16Z"/><path d="M${x - 8} 124h16" stroke="#c4c4c4" stroke-width="1.8"/>`).join("")}
    </g>
    <path d="m264 128-104 194h283L286 128Z" fill="url(#${id}-light)"/>
    <path class="research-stage__lamp-glow" d="m806 128-114 194h311L828 128Z" fill="url(#${id}-light)"/>

    <g aria-hidden="true">
      <path d="M602 141h18v455h-18Z" fill="#181818"/>
      <path d="M611 153v431" stroke="#353535" stroke-width="1"/>
      ${connections.map(({ name, path }) => `<path class="research-stage__wire" d="${path}" stroke-opacity=".25"/><path data-stage-link="${name}" d="${path}" pathLength="1" fill="none" stroke="#dedede" stroke-width="1.7" stroke-linecap="round" stroke-dasharray=".15 1" opacity="0"/>`).join("")}
      <rect x="580" y="342" width="64" height="64" rx="4" fill="#222" stroke="#737373" stroke-width=".8"/>
      <image href="${escapeHtml(logoHref)}" x="585" y="347" width="54" height="54" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <g aria-hidden="true">
      <!-- Laboratory: sample bench, microscope, glassware and a measurement plot. -->
      <rect x="153" y="180" width="145" height="67" rx="2" fill="#363636" stroke="#5c5c5c" stroke-width=".9"/>
      <rect x="158" y="185" width="135" height="57" rx="1" fill="#2b2b2b"/>
      <path class="research-stage__fine" opacity=".6" d="M168 196v36h114m-114-18h114"/>
      <path class="research-stage__detail research-stage__trace" pathLength="1" d="M173 228q14-1 21-11t17-7q14 8 23-10t16-5q13 14 27 2" opacity=".8"/>
      <path d="m430 188 8-6h91v75l-8 5v-74Z" fill="#484848"/>
      <rect x="430" y="188" width="91" height="74" fill="#2b2b2b" stroke="#616161" stroke-width=".8"/>
      <path d="M435 222h81m-81 32h81" stroke="#747474" stroke-width="2"/>
      <g fill="#929292" fill-opacity=".15" stroke="#b8b8b8" stroke-width=".85">
        <path d="M445 201v7l-4 9h17l-5-9v-7Z M473 201v16h12v-16Z M496 196v21h11v-21Z"/>
        <path d="M445 233v16h13v-16Z M473 229v20h13v-20Z M501 234v15h9v-15Z"/>
      </g>
      <path d="M444 199h10m18 0h14m9-5h13m-65 37h15m13-4h15m13 5h13" stroke="#aaa" stroke-width="2"/>

      <!-- Figures sit behind the bench; only their working hands cross its surface. -->
      ${labFigure(id)}

      <path d="M174 279h330l16 14H158Z" fill="url(#${id}-desktop)" stroke="#9a9a9a" stroke-width=".8"/>
      <path d="M158 293h362v8H158Z" fill="#555"/>
      <path d="M174 301h95v40h-95Zm236 0h92v40h-92Z" fill="#515151"/>
      <path d="M178 306h86v30h-86Zm236 0h84v30h-84Z" fill="#454545" stroke="#606060" stroke-width=".7"/>
      <path d="M178 321h86m150 0h84M186 312h14m222 0h14" stroke="#929292" stroke-width="1"/>
      <path d="M181 341v9m76-9v9m160-9v9m77-9v9" stroke="#686868" stroke-width="3"/>

      <g>
        <ellipse cx="307" cy="280" rx="34" ry="4" fill="#222" opacity=".35"/>
        <path d="M284 274h48l5 5h-59Z" fill="#c5c5c5"/>
        <path d="M278 279h59v3h-59Z" fill="#727272"/>
        <path d="M307 272q24-15 6-43l7-6q24 35-3 54Z" fill="#8b8b8b" stroke="#b0b0b0" stroke-width=".8"/>
        <path d="m278 220 8-5 32 16-8 7Z" fill="#b0b0b0"/>
        <path d="m272 224 8-5 4 6-8 5Z" fill="#555"/>
        <path d="m307 233 7-4 4 7-7 4Z" fill="#d0d0d0"/>
        <path d="M288 253h37v4h-37Z" fill="#b8b8b8"/>
        <path d="m299 255-10 18h8l11-18Z" fill="#737373"/>
        <g data-microscope-focus="">
          <circle cx="319" cy="253" r="5" fill="#4b4b4b" stroke="#aaa" stroke-width="1"/>
          <circle cx="319" cy="253" r="2" fill="#999"/>
          <path d="M319 249v2m-4 2h2m2 2v2m2-4h2" stroke="#bcbcbc" stroke-width=".7"/>
        </g>
      </g>
      <path d="M352 235v17l-11 24q16 6 34 0l-11-24v-17Z" fill="#bcbcbc" fill-opacity=".13" stroke="#aaa" stroke-width="1.2"/>
      <path class="research-stage__sample" d="M347 266h23l5 10q-17 5-34 0Z" fill="#a6a6a6" fill-opacity=".5"/>
      <path d="M350 233h16m-14 5h12" stroke="#bababa" stroke-width="1.2"/>
      <path d="M393 247v29q9 4 19 0v-29" fill="#aaa" fill-opacity=".1" stroke="#aaa" stroke-width="1.1"/>
      <path d="M392 247h22m-19 21h15" stroke="#aaa" stroke-width="1"/>
      ${localScreen(438, 239, "lab", id)}
      <path data-lab-arm="" d="M261 252c9-2 15 7 22 12l25-14 4 6-27 16q-7 7-11-1l-17-11Z" fill="url(#${id}-coat)"/>
      <g data-lab-hand="">
        <path d="M308 251q5-3 10-2l4 3-1 5-5 1-8-2Z" fill="#c8c8c8"/>
        <path d="M314 251q4-1 7 2m-8 1h8m-7 2h6" stroke="#858585" stroke-width=".65" stroke-linecap="round" fill="none"/>
      </g>

      <!-- Study: source material and the same evidence reviewed on a local device. -->
      <path d="m925 155 8-7h135l8 9v165l-11 7V155Z" fill="#444"/>
      <rect x="925" y="155" width="140" height="173" fill="url(#${id}-wood)"/>
      <rect x="933" y="164" width="124" height="139" fill="#222"/>
      ${books(936, 205, 9, 35)}${books(936, 249, 9, 35)}${books(936, 291, 9, 32)}
      <path d="M933 207h124m-124 44h124m-124 42h124" stroke="#737373" stroke-width="3"/>
      <path d="M991 164v139" stroke="#606060" stroke-width="4"/>
      <path d="M921 155h148v5H921ZM927 321h139v7H927Z" fill="#777"/>
      <path d="M937 307h48v12h-48Zm60 0h49v12h-49Z" fill="#414141" stroke="#777" stroke-width=".7"/>
      <path d="M932 161v158m127-158v158" stroke="#858585" stroke-width=".7"/>

      <rect x="709" y="181" width="60" height="71" rx="1" fill="#5e5e5e"/>
      <rect x="714" y="186" width="50" height="61" fill="#929292"/>
      <path d="M722 197h31m-31 5h26m-26 7h31m-31 5h28m-28 5h30m-30 8h22m-22 5h28" stroke="#484848" stroke-width=".8" opacity=".6"/>
      <rect x="785" y="183" width="82" height="57" rx="1" fill="#545454"/>
      <rect x="790" y="188" width="72" height="47" fill="#a3a3a3"/>
      <path d="M799 196v31h54" fill="none" stroke="#505050" stroke-width=".8"/>
      <path d="M801 224q8-1 13-11t11-4q8 10 15 0t12 1" fill="none" stroke="#444" stroke-width="1.1"/>
      <path d="M801 222q8-1 13-8t11-3q8 7 15 0t12 0" fill="none" stroke="#626262" stroke-width=".8" stroke-dasharray="2 2"/>
      <path d="M703 323h226l27 30H680Z" fill="#303030" stroke="#5c5c5c" stroke-width=".6"/>
      <path d="M703 329h223l16 18H691Z" fill="none" stroke="#777" stroke-opacity=".3" stroke-width=".8"/>
      ${studyFigure(id)}

      <path d="M707 281h208l16 14H691Z" fill="#8b8b8b" stroke="#aaa" stroke-width=".7"/>
      <path d="M691 295h240v7H691Z" fill="#555"/>
      <path d="M705 302h211v10H705Z" fill="url(#${id}-wood)"/>
      <path d="M709 310h49v32h-49Z" fill="url(#${id}-wood)"/>
      <path d="M714 314h39v10h-39Zm0 13h39v10h-39Z" fill="#444" stroke="#737373" stroke-width=".6"/>
      <path d="M731 319h7m-7 13h7" stroke="#b0b0b0" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M711 341h8l-2 8h-10Zm37 0h8l3 8h-10Z" fill="#777"/>
      <path d="M902 311h10l-2 8c-2 4-2 8 1 12l-1 13h-8l-1-13c3-4 3-8 1-12Z" fill="#777"/>
      <path d="M900 343h12l3 6h-18Z" fill="#555"/>
      <path d="M762 306h117" stroke="#8f8f8f" stroke-opacity=".5" stroke-width=".8"/>
      ${localScreen(774, 241, "study", id)}
      <path d="M873 279h27v-5h-27Z" fill="#bababa"/><path d="M869 273h28v-5h-28Z" fill="#858585"/>
      <path d="M874 276h23m-26-6h23" stroke="#dedede" stroke-opacity=".4" stroke-width=".8"/>
      <ellipse cx="744" cy="279" rx="17" ry="3" fill="#a8a8a8"/>
      <path d="M744 278c-7-14 3-20 0-35" stroke="#999" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M723 242c1-14 10-16 22-16s20 2 21 16Z" fill="#737373" stroke="#aaa" stroke-width=".8"/>
      <path d="M725 241h38" stroke="#d5d5d5" stroke-width="1.4"/>
      <path d="M730 232c8-3 20-3 29 0" stroke="#bcbcbc" stroke-opacity=".3" stroke-width=".7" fill="none"/>
      <path class="research-stage__lamp-glow" d="m730 245-9 37h58l-20-37Z" fill="#ddd" opacity=".08"/>
      ${openStudyBook()}
      <path data-study-arm="" d="M872 258q-10 13-12 17l-20 7-4 5 23-7q7-2 11-9l4-6Z" fill="url(#${id}-sweater)"/>
      <g data-study-hand="" transform="translate(838 286)">
        <path d="M-5-2q4-3 8-1l3 2-2 2-5-1-3 1Z" fill="#bcbcbc"/>
        <path d="M-2-1h5m-4 2h4" stroke="#777" stroke-width=".65" stroke-linecap="round"/>
      </g>
    </g>

    <g aria-hidden="true">
      ${workstation(188, 463, "wave", id)}
      ${workstation(414, 463, "model", id)}
      ${workstation(782, 463, "code", id)}
      <g>
        <ellipse cx="1006" cy="604" rx="60" ry="9" fill="#111" opacity=".4"/>
        <path d="m945 446 12-8h89l12 11-17-3Z" fill="#676767"/>
        <path d="m1041 446 17 3v148l-17 4Z" fill="#252525"/>
        <rect x="945" y="446" width="96" height="155" rx="2" fill="url(#${id}-device)" stroke="#707070" stroke-width=".8"/>
        <rect x="951" y="452" width="84" height="143" rx="1" fill="#242424"/>
        ${[458, 487, 516, 545].map((y) => `<rect x="956" y="${y}" width="74" height="23" rx="1.5" fill="#3b3b3b" stroke="#505050" stroke-width=".6"/><path d="M964 ${y + 7}h37m-37 4h37m-37 4h37" stroke="#8c8c8c" stroke-width=".7"/><rect x="1016" y="${y + 9}" width="5" height="2" rx=".7" fill="#b1b1b1"/>`).join("")}
        <path d="M957 579h71m-71 4h71m-71 4h71" stroke="#5b5b5b" stroke-width=".8"/>
      </g>
    </g>

    <!-- Foreground seats establish the audience's view of the open set. -->
    <g fill="#191919">
      ${[210, 340, 470, 600, 730, 860, 990].map((x, index) => `<path d="M${x - 27} ${716 - Math.abs(index - 3) * 3}v-10q0-14 27-14t27 14v10Z"/>`).join("")}
    </g>
  </svg>`;
}
