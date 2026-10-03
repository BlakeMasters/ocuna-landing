import { useId } from "react";

const routes = [
  { group: "inference", path: "M180 207 L228 235 L262 215", delay: -1.5 },
  { group: "inference", path: "M166 223 L209 248 L209 276 L260 306", delay: -4 },
  { group: "training", path: "M183 373 L221 351 L221 329 L262 305", delay: -0.5 },
  { group: "training", path: "M151 410 L200 438 L258 405 L258 356 L299 332", delay: -3 },
  { group: "research", path: "M451 214 L483 195 L483 142 L508 128", delay: -2 },
  { group: "research", path: "M535 127 L577 151", delay: -4.5 },
  { group: "research", path: "M592 178 L552 201 L535 211", delay: -1 },
  { group: "research", path: "M502 217 L475 233 L451 219", delay: -3.5 },
  { group: "records", path: "M449 286 L490 310 L490 353 L526 374", delay: -2.7 },
  { group: "records", path: "M397 337 L446 366 L483 345 L528 371", delay: -0.8 },
];

function IsoBlock({ x, y, size = 48, depth = 30, className = "", children }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`system-block ${className}`}>
        <path className="system-block-left" d={`M${-size} 0 L0 ${size / 2} V${size / 2 + depth} L${-size} ${depth} Z`} />
        <path className="system-block-right" d={`M0 ${size / 2} L${size} 0 V${depth} L0 ${size / 2 + depth} Z`} />
        <path className="system-block-top" d={`M0 ${-size / 2} L${size} 0 L0 ${size / 2} L${-size} 0 Z`} />
        <g transform="matrix(1 .5 -1 .5 0 0)">{children}</g>
      </g>
    </g>
  );
}

function ChipCells({ large = false }) {
  const step = large ? 22 : 12;
  const cell = large ? 15 : 8;
  return Array.from({ length: 9 }, (_, index) => (
    <rect key={index} className="system-chip-cell" x={(index % 3 - 1) * step - cell / 2} y={(Math.floor(index / 3) - 1) * step - cell / 2} width={cell} height={cell} style={{ animationDelay: `${index * -0.65}s` }} />
  ));
}

export default function DistributedComputeDiagram() {
  const diagramId = useId();
  return (
    <svg className="system-diagram" viewBox="0 78 680 400" role="img" aria-labelledby={`${diagramId}-title ${diagramId}-description`} focusable="false">
      <title id={`${diagramId}-title`}>Ocuna’s compute and research systems</title>
      <desc id={`${diagramId}-description`}>A conceptual illustration of training and inference paths around the Ocura runtime, connected research agents in Four1, and a stack of run records. Moving squares represent work travelling along the paths.</desc>
      <g className="system-ground" fill="none">
        <path d="M354 108 582 239 354 370 126 239Z" />
        <path d="M354 131 542 239 354 347 166 239Z" />
        <path d="M354 157 497 239 354 321 211 239Z" />
        <path d="M354 108V158M126 239H212M582 239H497M354 321V370" />
      </g>

      {routes.map((route, index) => (
        <g className={`system-route-group system-route-group--${route.group}`} key={route.path}>
          <path className="system-route" d={route.path} />
          <g className="system-packet" style={{ offsetPath: `path('${route.path}')`, animationDelay: `${route.delay}s`, animationDuration: `${4.6 + index % 3 * 0.7}s` }}>
            <path d="M0 -4 7 0 0 4-7 0Z" />
          </g>
        </g>
      ))}

      <g className="system-node system-node--inference">
        <IsoBlock x={132} y={178} size={49} depth={46} className="system-block--inference">
          <rect className="system-chip-outline" x="-20" y="-20" width="40" height="40" />
          <ChipCells />
        </IsoBlock>
        <path className="system-module-detail" d="M92 205v20m9-15v20m9-15v20m9-15v20" />
      </g>

      <g className="system-node system-node--training">
        <IsoBlock x={137} y={390} size={46} depth={12} />
        <IsoBlock x={137} y={372} size={46} depth={12} />
        <IsoBlock x={137} y={354} size={46} depth={12} className="system-block--training">
          <path className="system-workload-lines" d="M-24-20H24M-24-6H24M-24 8H8M-24 22H24" />
        </IsoBlock>
      </g>

      <g className="system-node system-node--research">
        <IsoBlock x={519} y={121} size={25} depth={24} className="system-block--research"><rect className="system-device-screen" x="-12" y="-12" width="24" height="24" /><path className="system-device-glyph" d="m-5-4 5 4-5 4M3 5h5" /></IsoBlock>
        <IsoBlock x={602} y={165} size={25} depth={24} className="system-block--research"><rect className="system-device-screen" x="-12" y="-12" width="24" height="24" /><path className="system-device-glyph" d="m-5-4 5 4-5 4M3 5h5" /></IsoBlock>
        <IsoBlock x={517} y={213} size={25} depth={24} className="system-block--research"><rect className="system-device-screen" x="-12" y="-12" width="24" height="24" /><path className="system-device-glyph" d="m-5-4 5 4-5 4M3 5h5" /></IsoBlock>
      </g>

      <g className="system-runtime">
        <IsoBlock x={354} y={304} size={107} depth={10} className="system-block--base" />
        <g className="system-runtime-layer system-runtime-layer--lower">
          <IsoBlock x={354} y={266} size={91} depth={18} />
        </g>
        <g className="system-runtime-layer system-runtime-layer--middle">
          <IsoBlock x={354} y={233} size={91} depth={18} />
        </g>
        <g className="system-runtime-layer system-runtime-layer--upper">
          <IsoBlock x={354} y={200} size={91} depth={18} className="system-block--runtime"><ChipCells large /></IsoBlock>
        </g>
      </g>

      <g className="system-node system-node--records">
        <IsoBlock x={563} y={420} size={51} depth={9} />
        <IsoBlock x={563} y={402} size={51} depth={9} />
        <IsoBlock x={563} y={384} size={51} depth={9} className="system-block--records">
          <path className="system-record-lines" d="M-27-24H27M-27-9H27M-27 6H7M-27 21H27" />
          <path className="system-record-check" d="m13 8 6 6 13-17" />
        </IsoBlock>
      </g>
    </svg>
  );
}
