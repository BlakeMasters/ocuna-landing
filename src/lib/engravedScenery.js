const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223 | 0;
    return (state >>> 0) / 4294967296;
  };
}
const ridge = (x, seed = 0) => Math.sin(x * .0031 + seed) * 29 + Math.sin(x * .0087 - seed * .7) * 12 + Math.sin(x * .021 + seed * 2) * 4;

// Background cuts are drawn once into a transparent plate. The open center keeps
// the original sculpture, its fine contours and articulated annotations readable.
function engraver(context, bounds, seed, strokes) {
  const rng = random(seed);
  function line(x1, y1, x2, y2, alpha = .16, width = 1.2) {
    const x = (x1 + x2) / 2, y = (y1 + y2) / 2;
    const clearing = Math.exp(-(((x - 700) / 430) ** 6)) * Math.exp(-(((y - 330) / 370) ** 6));
    const edge = clamp((y - bounds.top) / 60) * clamp((bounds.bottom - y) / 75);
    context.globalAlpha = Math.min(.22, alpha * 1.15) * (1 - clearing * .88) * edge;
    // Panoramic plates reduce a world cut to less than one output pixel. Give
    // faint background cuts enough coverage to survive the prepared encoding.
    context.lineWidth = Math.max(2.05, width);
    // Keep the exact world-space cuts beside the painted plate so a scene can
    // reconstruct from its own linework without changing its cached hold.
    strokes?.push([x1, y1, x2, y2, context.globalAlpha, context.lineWidth, "#575757"]);
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  }
  function curve(fn, steps = 120, alpha = .16, width = 1.2, broken = false) {
    let a = fn(0);
    for (let i = 1; i <= steps; i++) {
      const b = fn(i / steps);
      if (!broken || rng() > .12) line(a[0], a[1], b[0], b[1], alpha, width);
      a = b;
    }
  }
  function path(points, alpha = .16, width = 1.2) {
    for (let i = 1; i < points.length; i++) line(...points[i - 1], ...points[i], alpha, width);
  }
  function ellipse(x, y, rx, ry, alpha = .16, rotation = 0, broken = false) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    curve(t => {
      const a = t * TAU, u = Math.cos(a) * rx, v = Math.sin(a) * ry;
      return [x + u * c - v * s, y + u * s + v * c];
    }, Math.ceil(Math.max(rx, ry) / 3) + 24, alpha, 1.15, broken);
  }
  function hatch(x, y, width, height, alpha = .12, slant = 5) {
    for (let u = 0; u < width; u += 8 + rng() * 4) {
      const start = rng() * height * .18, length = height * (.50 + rng() * .36);
      line(x + u, y + start, x + u + slant, y + start + length, alpha * (.7 + rng() * .3));
    }
  }
  return { ...bounds, rng, line, curve, path, ellipse, hatch };
}

function landscape(p, horizon, seed, rows = 15, alpha = .15) {
  const span = p.right - p.left;
  for (let row = 0; row < rows; row++) {
    const depth = row / Math.max(1, rows - 1);
    p.curve(t => {
      const x = p.left + t * span;
      return [x, horizon + depth ** 1.35 * 155 + ridge(x, seed) * (1 - depth * .65) + Math.sin(x * .019 + row * .7) * depth * 3];
    }, Math.ceil(span / 10), alpha * (.65 + depth * .35), 1.2, row % 3 === 1);
  }
}

function stars(p, count = 100) {
  for (let i = 0; i < count; i++) {
    const x = mix(p.left + 30, p.right - 30, p.rng()), y = mix(p.top + 70, 590, p.rng());
    const size = 1 + p.rng() * 2.4;
    p.line(x - size, y, x + size, y, .13 + p.rng() * .08);
    if (i % 5 === 0) p.line(x, y - size, x, y + size, .13);
  }
}

function flankTerrain(p, seed, height = 235) {
  for (const [left, right, side] of [[p.left - 30, 340, -1], [1060, p.right + 30, 1]]) {
    const span = right - left;
    const profile = t => {
      const outward = side < 0 ? 1 - t : t;
      return 672 - outward ** .72 * height * (.84 + Math.sin(t * 5.1 + seed + side) * .16) + ridge(left + t * span, seed) * .6 * outward ** .3;
    };
    // The broad mountain shoulders are cut by incomplete geological contours.
    for (let row = 0; row < 19; row++) p.curve(t => {
      const x = mix(left, right, t), top = profile(t);
      return [x, top + row / 18 * (696 - top) + Math.sin(t * 21 + row * .4) * row * .14];
    }, Math.ceil(span / 11), .115 + row % 4 * .014, 1.2, row % 4 !== 0);
    for (let x = left + 12; x < right; x += 20 + p.rng() * 10) {
      const t = (x - left) / span, top = profile(t), y = top + 10 + p.rng() * Math.max(12, 675 - top);
      const length = 9 + p.rng() * 21;
      p.line(x, y, x + side * (4 + p.rng() * 6), y + length, .09 + p.rng() * .045);
    }
    // Uneven cloud ribbons sit above each shoulder, leaving the subject clear.
    for (let row = 0; row < 7; row++) p.curve(t => {
      const x = mix(left, right, t);
      return [x, 349 + row * 11 + Math.sin(t * 6 + seed) * 13 + Math.sin(t * 17 + row * .4) * 3];
    }, Math.ceil(span / 10), .075 + row % 3 * .007, 1.1, true);
  }
}

function moon(p) {
  stars(p, Math.ceil((p.right - p.left) / 25));
  flankTerrain(p, 2.7, 255);
  landscape(p, 704, 3.6, 18, .20);
  for (let i = 0; i < 55; i++) {
    const x = mix(p.left, p.right, p.rng()), y = 758 + p.rng() * 125;
    const radius = 5 + p.rng() ** 2 * 43;
    p.ellipse(x, y, radius, radius * .16, .14);
    if (radius > 17) p.ellipse(x + 2, y + 2, radius * .79, radius * .11, .09);
  }
  // Long broken dust strata, rather than a flat rectangular sky texture.
  for (let row = 0; row < 7; row++) for (const side of [-1, 1]) {
    const center = 700 + side * 1230;
    p.curve(t => [center + (t - .5) * 1450, 180 + row * 19 + Math.sin(t * 5 + row * .3) * 30], 180, .065, 1.1, true);
  }
}

function tide(p) {
  const span = p.right - p.left;
  for (let row = 0; row < 42; row++) {
    const depth = row / 41;
    p.curve(t => {
      const x = p.left + t * span;
      const swell = Math.sin(x * .005 + depth * 3) * (7 + depth * 14);
      return [x, 533 + depth ** 1.22 * 357 + swell + Math.sin(x * .028 - depth * 13) * (2 + depth * 4)];
    }, Math.ceil(span / 9), .105 + depth * .10, 1.15, row % 6 === 2);
  }
  for (const side of [-1, 1]) {
    const start = 700 + side * 1000;
    for (let row = 0; row < 6; row++) p.curve(t => {
      const x = start + side * t * 1400;
      return [x, 485 + row * 5 - Math.sin(t * Math.PI) ** 2 * 43 + ridge(x, 6) * .27];
    }, 160, .10);
  }
  for (let i = 0; i < 95; i++) {
    const x = mix(p.left, p.right, p.rng()), y = 630 + p.rng() * 236, length = 5 + p.rng() * 27;
    p.curve(t => [x + t * length, y - Math.sin(t * Math.PI) * 2], 8, .14);
  }
}

function bonsai(p) {
  // Distant hills and a weathered terrace frame the small tree and its pot.
  flankTerrain(p, 5.3, 215);
  landscape(p, 577, 2.2, 7, .105);
  for (let row = 0; row < 12; row++) {
    const y = 715 + row ** 1.4 * 5.4;
    p.curve(t => {
      const x = mix(p.left, p.right, t);
      return [x, y + Math.sin(x * .004 + row * .33) * (2 + row * .42)];
    }, Math.ceil((p.right - p.left) / 14), .09 + row * .003, 1.15, row % 3 !== 0);
  }
  for (let x = Math.floor(p.left / 170) * 170; x < p.right; x += 170) {
    const y = 740 + p.rng() * 85, length = 60 + p.rng() * 90;
    p.path([[x, y], [x + length, y - 4], [x + length + 12, y + 13], [x - 5, y + 16]], .105);
    p.hatch(x + 5, y + 3, length * .83, 9, .07, 4);
  }
  for (let i = 0; i < 34; i++) {
    const x = mix(p.left, p.right, (i + .3 + p.rng() * .4) / 34);
    if (x > 280 && x < 1120) continue;
    const y = 720 + p.rng() * 65;
    for (let stem = 0; stem < 5; stem++) {
      const height = 20 + p.rng() * 40, bend = (p.rng() - .5) * 22;
      p.curve(t => [x + stem * 2 + bend * t * t, y - t * height], 14, .14);
      p.line(x + stem * 2 + bend * .5, y - height * .7, x + stem * 2 + bend + 7, y - height * .8, .10);
    }
  }
}

function floor(p, horizon = 714, alpha = .11) {
  for (let row = 0; row < 11; row++) {
    const y = horizon + row ** 1.65 * 3.9;
    p.line(p.left, y, p.right, y, alpha * (.6 + row * .035));
  }
  for (let x = p.left - 300; x <= p.right + 300; x += 280) {
    p.line(mix(x, 700, .73), horizon, x, p.bottom + 30, alpha * .8);
  }
}

function mechanism(p) {
  floor(p, 733, .075);
  for (let row = 0; row < 6; row++) p.curve(t => {
    const x = mix(p.left, p.right, t);
    return [x, 704 + row * 4 + Math.sin(x * .012 + row) * .8];
  }, Math.ceil((p.right - p.left) / 12), .11, 1.1, true);
  for (const side of [-1, 1]) {
    const x = 700 + side * Math.min(1200, (p.right - p.left) * .42), rx = Math.min(330, (p.right - p.left) * .15);
    p.path([[x-rx,532],[x-rx,264]], .095); p.path([[x+rx,264],[x+rx,532]], .095);
    p.curve(t => [x + Math.cos(Math.PI+t*Math.PI)*rx, 264+Math.sin(Math.PI+t*Math.PI)*190], 140, .095);
    p.line(x,81,x,532,.075);
    for (const y of [278,405,532]) p.line(x-rx,y,x+rx,y,.065);
  }
}

function wormhole(p) {
  stars(p, Math.ceil((p.right - p.left) / 35));
  for (let row = 0; row < 21; row++) {
    const offset = (row - 10) * 32;
    p.curve(t => {
      const x = mix(p.left, p.right, t), distance = (x - 700) / 630;
      return [x, 420 + offset * (1 - .64 * Math.exp(-distance * distance)) + Math.sin(x * .0015 + row * .13) * 32];
    }, Math.ceil((p.right - p.left) / 12), .085 + Math.abs(row - 10) * .004, 1.1, row % 4 === 1);
  }
  for (const side of [-1, 1]) for (let curve = 0; curve < 11; curve++) {
    const x = 700 + side * (660 + curve * 150);
    p.curve(t => [x + Math.sin(t * Math.PI) * side * (100 + curve * 9), mix(p.top + 35, p.bottom - 10, t)], 140, .075, 1.1, true);
  }
}

function cabinet(p, x, y, width, height, side) {
  const depth = 22;
  p.path([[x, y], [x + width, y - 5], [x + width, y + height], [x, y + height + 3], [x, y]], .15);
  p.path([[x + width, y - 5], [x + width + side * depth, y + 9], [x + width + side * depth, y + height - 11], [x + width, y + height]], .105);
  for (let row = 0; row < 9; row++) {
    const yy = y + 18 + row * (height - 35) / 9;
    p.path([[x + 12, yy], [x + width - 12, yy - 2], [x + width - 12, yy + 9], [x + 12, yy + 10]], .095);
    for (let slot = 0; slot < 5; slot++) p.line(x + 18 + slot * (width - 40) / 5, yy + 3, x + 18 + slot * (width - 40) / 5 + 5, yy + 3, .15);
  }
  p.hatch(x + width - 17, y + 14, 8, height - 24, .06, 0);
}

function compute(p) {
  floor(p, 708, .055);
  const span = p.right-p.left;
  for (const side of [-1,1]) {
    const x=700+side*Math.min(1450,span*.32), width=Math.min(430,span*.25);
    p.path([[x-width,703],[x+width,703],[x+width+28,719],[x-width-28,719],[x-width,703]],.10);
    p.hatch(x-width+10,708,width*2-20,7,.07,5);
  }
}

function robotics(p) {
  floor(p,737,.055);
  // One continuous work surface serves all three active humanoid workcells.
  for (const y of [704,715,730]) p.curve(t=>[mix(p.left,p.right,t),y+Math.sin(t*11)*.8],220,.12,1.2,true);
  p.hatch(p.left,718,p.right-p.left,9,.065,4);
  const span=p.right-p.left, far=Math.min(2300,span*.48);
  p.line(p.left,166,p.right,166,.075);p.line(p.left,180,p.right,180,.065);
  for(const side of [-1,1]) {
    const x=700+side*far;
    p.path([[x-8,180],[x-8,703],[x+8,703],[x+8,180]],.085);
    if(span>2200) cabinet(p,x-85,435,170,265,side);
  }
}

function molecule(p, x, y, size) {
  const points = Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.4;
    return [x + Math.cos(a) * size * (.55 + i * .045), y + Math.sin(a) * size * (.45 + i * .03)];
  });
  for (let i = 1; i < points.length; i++) {
    p.line(...points[i - 1], ...points[i], .11);
    p.ellipse(...points[i], 4 + i % 3, 3 + i % 2, .12);
  }
}

function protein(p) {
  // The living ribbon field now supplies the molecular actors; these few cuts
  // describe only the far membrane at the limits of the microscope view.
  for (const side of [-1,1]) for(let layer=0;layer<4;layer++) p.curve(t=>{
    const x=mix(p.left,p.right,t);
    return [x,side<0?115+layer*6+Math.sin(t*8)*31:800+layer*6+Math.sin(t*9)*29];
  },220,.065,1.1,true);
}

const ENVIRONMENTS = [moon, tide, bonsai, mechanism, wormhole, compute, robotics, protein];

export function createEngravedScenery(createCanvas, width, height, camera) {
  const cached = new Map();
  function prepare(scene) {
    if (cached.has(scene)) return cached.get(scene);
    const image = createCanvas(width, height), context = image.getContext("2d"), strokes = [];
    context.setTransform(camera.scale, 0, 0, camera.scale, camera.offsetX, camera.offsetY);
    context.strokeStyle = "#575757"; context.lineCap = "round"; context.lineJoin = "round";
    ENVIRONMENTS[scene](engraver(context, camera, 1709 + scene * 271, strokes));
    context.globalAlpha = 1;
    const plate = { image, strokes };
    cached.set(scene, plate);
    return plate;
  }
  return {
    draw(context, scene, seconds, opacity = 1) {
      if (!ENVIRONMENTS[scene] || opacity <= 0) return;
      context.save();
      context.globalAlpha = clamp(opacity);
      context.drawImage(prepare(scene).image, 0, 0, width, height);
      context.restore();
    },
    strokes(scene) { return ENVIRONMENTS[scene] ? prepare(scene).strokes : []; },
    dispose() { cached.clear(); },
  };
}
