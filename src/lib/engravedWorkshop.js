import { sceneStart } from "./engravedTimeline.js";
import { panoramaActors } from "./engravedCast.js";
import { humanoidState } from "./engravedHumanoid.js";

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const fract = value => value - Math.floor(value);
const hash = value => fract(Math.sin(value * 127.13 + 73.1) * 43758.5453);

// One sparse drawing describes the room and the mechanisms inside it. These
// paths are baked into the film; no new objects run on the homepage.
function workshopPen(context, opacity, camera) {
  const levels = [.065, .10, .145, .20, .265, .34, .43, .53];
  const paths = levels.map(() => context.createInkPath?.() ?? new Path2D());
  function line(x1, y1, x2, y2, alpha = .20, grain = false) {
    const y = (y1 + y2) / 2;
    const edge = clamp((y - camera.top) / 38) * clamp((camera.bottom - y) / 45);
    const value = alpha * edge;
    if (value < .025) return;
    let bucket = 0;
    while (bucket < levels.length - 1 && value > (levels[bucket] + levels[bucket + 1]) / 2) bucket++;
    const path = paths[bucket], length = Math.hypot(x2 - x1, y2 - y1);
    const cuts = grain ? Math.max(1, Math.ceil(length / 19)) : 1;
    for (let i = 0; i < cuts; i++) {
      const a = i / cuts, b = Math.min(1, (i + .86) / cuts);
      path.moveTo(mix(x1, x2, a), mix(y1, y2, a));
      path.lineTo(mix(x1, x2, b), mix(y1, y2, b));
    }
  }
  function path(points, alpha = .20, grain = false) {
    for (let i = 1; i < points.length; i++) line(...points[i - 1], ...points[i], alpha, grain);
  }
  function curve(fn, steps = 70, alpha = .20, broken = false) {
    let previous = fn(0);
    for (let i = 1; i <= steps; i++) {
      const point = fn(i / steps);
      if (!broken || i % 9 !== 0) line(...previous, ...point, typeof alpha === "function" ? alpha(i / steps) : alpha);
      previous = point;
    }
  }
  function ellipse(cx, cy, rx, ry, alpha = .20, turn = 0, from = 0, to = TAU) {
    const c = Math.cos(turn), s = Math.sin(turn);
    curve(t => { const a = mix(from, to, t), x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * c - y * s, cy + x * s + y * c]; }, Math.max(24, Math.ceil(Math.max(rx, ry) * Math.abs(to - from) / 6)), alpha);
  }
  function hatch(x, y, width, height, alpha = .10, slope = 3) {
    for (let cut = 0; cut <= Math.floor(width / 8); cut++) {
      const u = cut * 8;
      line(x + u, y + hash(cut * 17) * 2, x + u + slope, y + height, alpha);
    }
  }
  return {
    line, path, curve, ellipse, hatch,
    finish() {
      context.strokeStyle = "#424242"; context.lineCap = "round"; context.lineJoin = "round";
      for (let i = 0; i < paths.length; i++) {
        context.lineWidth = i > 4 ? 1.55 : 1.4;
        context.globalAlpha = opacity * levels[i] * (i > 1 ? 1.24 : 1); context.stroke(paths[i]);
      }
    },
  };
}

function plinth(p, x, y, halfWidth, depth = 24, height = 35, alpha = .14) {
  p.path([[x - halfWidth, y], [x + halfWidth, y], [x + halfWidth + depth, y + depth * .44], [x - halfWidth + depth, y + depth * .44], [x - halfWidth, y]], alpha);
  p.path([[x - halfWidth, y], [x - halfWidth, y + height], [x + halfWidth + depth, y + height + depth * .44], [x + halfWidth + depth, y + depth * .44]], alpha * .8);
  p.hatch(x - halfWidth + 5, y + 6, halfWidth * 1.9, height - 11, alpha * .65, 1);
}

function pulley(p, x, y, radius, angle, alpha = .265, teeth = true) {
  if (teeth) {
    const count = Math.max(16, Math.round(radius / 3.4)), points = [];
    for (let tooth = 0; tooth < count; tooth++) for (const [fraction, offset] of [[0,-3],[.18,2.8],[.69,2.8],[.88,-3]]) {
      const a = angle + (tooth + fraction) / count * TAU;
      points.push([x + Math.cos(a) * (radius + offset), y + Math.sin(a) * (radius + offset)]);
    }
    points.push(points[0]); p.path(points, alpha);
  } else p.ellipse(x, y, radius, radius, alpha);
  p.ellipse(x, y, radius - 7, radius - 7, alpha * .7);
  p.ellipse(x, y, radius * .70, radius * .70, alpha * .8);
  p.ellipse(x, y, 11, 11, alpha); p.ellipse(x, y, 4, 4, alpha * 1.3);
  for (let spoke = 0; spoke < 6; spoke++) {
    const a = angle + spoke / 6 * TAU, c = Math.cos(a), s = Math.sin(a);
    for (const side of [-1, 1]) p.line(x + c * 14 - s * side * 3, y + s * 14 + c * side * 3, x + c * radius * .67 - s * side * 3, y + s * radius * .67 + c * side * 3, alpha * .9);
    p.ellipse(x + c * radius * .83, y + s * radius * .83, 2.2, 2.2, alpha * .8);
  }
}

export function workshopDrive(seconds, radius, direction = 1) {
  // Every wheel's rim has the same belt speed, regardless of its radius.
  return seconds * 26 / radius * direction;
}

export function workshopBeltTangent(a,b,crossed,side){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
  const along=Math.max(-.999,Math.min(.999,(a.r-(crossed?-b.r:b.r))/length));
  const across=Math.sqrt(1-along*along)*side;
  const nx=dx/length*along-dy/length*across,ny=dy/length*along+dx/length*across;
  return {a:[a.x+nx*a.r,a.y+ny*a.r],b:[b.x+nx*b.r*(crossed?-1:1),b.y+ny*b.r*(crossed?-1:1)],normal:[nx,ny]};
}

function belt(p, a, b, time, crossed = false) {
  for (const side of [-1, 1]) {
    const tangent=workshopBeltTangent(a,b,crossed,side),[ax,ay]=tangent.a,[bx,by]=tangent.b,[nx,ny]=tangent.normal;
    const length=Math.hypot(bx-ax,by-ay);
    p.line(ax, ay, bx, by, .145); p.line(ax + nx * 2, ay + ny * 2, bx + nx * 2, by + ny * 2, .065);
    for (let stitch = 0; stitch < 7; stitch++) {
      const u = fract(stitch / 7 + time * 26 / length * side);
      const x = mix(ax, bx, u), y = mix(ay, by, u);
      p.line(x - nx * 2, y - ny * 2, x + nx * 2, y + ny * 2, .265);
    }
  }
}

function bearing(p, x, y, radius, ground = 707) {
  p.path([[x - 9, y + 10], [x - 24, ground], [x + 24, ground], [x + 9, y + 10]], .10);
  p.line(x - 35, ground + 5, x + 35, ground + 5, .145);
  p.ellipse(x, y, radius + 6, radius + 6, .065, 0, .1, Math.PI - .1);
}

function instrumentRoom(p, time, camera) {
  const span = camera.right - camera.left, mobile = span < 2200;
  const railY = 710, depth = mobile ? 95 : 160;
  // A curved instrument deck, with short engraved cuts instead of a stage box.
  for (let row = 0; row < 7; row++) p.curve(t => {
    const x = mix(camera.left - 40, camera.right + 40, t);
    return [x, railY + row * 6 + Math.sin((t - .5) * Math.PI) ** 2 * depth * .12];
  }, Math.ceil(span / 18), row % 3 ? .10 : .145, true);
  for (const side of [-1, 1]) {
    const offset = Math.min(1390, span * .35), x = 700 + side * offset;
    const rx = Math.min(560, span * .21);
    // Distant curved masonry and an instrument slit make a room with depth.
    for (const inset of [0, 12, 30]) p.curve(t => [x + Math.cos(Math.PI + t * Math.PI) * (rx - inset), 365 + Math.sin(Math.PI + t * Math.PI) * (230 - inset * .4)], 115, inset ? .065 : .10, true);
    for (const angle of [-2.75,-2.35,-1.95,-1.56,-1.17,-.78,-.39]) {
      const px = x + Math.cos(angle) * rx, py = 365 + Math.sin(angle) * 230;
      p.line(px, py, x + Math.cos(angle) * (rx - 22), 365 + Math.sin(angle) * 211, .10);
    }
    // A tilting telescope follows the drive, tucked to the edge of the room.
    const turn = -.34 + Math.sin(time * .19 + side) * .15, length = Math.min(170, span * .075);
    const at = (u, v) => [x + Math.cos(turn) * u - Math.sin(turn) * v, 415 + Math.sin(turn) * u + Math.cos(turn) * v];
    p.path([at(-length * .5,-13),at(length * .6,-18),at(length * .6,18),at(-length * .5,13),at(-length * .5,-13)], .145);
    p.ellipse(...at(length * .6,0), 5, 18, .20, turn);
    p.path([[x,430],[x-26,566],[x+26,566],[x,430]], .10);
    p.ellipse(x, 430, 15, 12, .20);
    p.line(x - 50, 572, x + 50, 572, .10);
    for (let ray = 0; ray < 4; ray++) p.line(...at(length * .7, (ray - 1.5) * 3), ...at(length * 1.2, (ray - 1.5) * 5), .065);
  }
  const spread = Math.min(1870, span * .41), anchor = 700 - spread, k = mobile ? .70 : 1;
  const drive = [
    {x:anchor, y:570, r:99*k}, {x:700-Math.min(950,span*.295),y:542,r:132*k},
    {x:700-Math.min(405,span*.20),y:580,r:57*k}, {x:700+Math.min(423,span*.20),y:586,r:52*k},
    {x:700+Math.min(1120,span*.30),y:562,r:106*k}, {x:700+spread,y:588,r:76*k},
  ];
  for (let i = 0; i < drive.length; i++) {
    const wheel = drive[i];
    if (wheel.x + wheel.r < camera.left || wheel.x - wheel.r > camera.right) continue;
    const direction = i < 2 ? 1 : -1;
    pulley(p, wheel.x, wheel.y, wheel.r, workshopDrive(time, wheel.r, direction) + i * .31, i === 1 ? .34 : .265, i !== 1);
    bearing(p, wheel.x, wheel.y, 14);
    if (i && i !== 3) belt(p, drive[i - 1], wheel, time, i === 2);
  }
  // A visible escapement gives the instrument clock an alternating impulse.
  const x = 700 + Math.min(1570, span * .38), pivotY = 297;
  const angle = Math.sin(time * 1.9) * .22, length = 196;
  const end = [x + Math.sin(angle) * length, pivotY + Math.cos(angle) * length];
  p.line(x, pivotY, ...end, .265); p.line(x + 3, pivotY, end[0] + 3, end[1], .10);
  p.ellipse(...end, 21, 21, .265); p.ellipse(...end, 15, 15, .10);
  p.ellipse(x, pivotY, 8, 8, .20);
  p.path([[x-20,pivotY-14],[x+20,pivotY-14],[x+14,pivotY+7],[x-14,pivotY+7]], .10);
}

function fan(p, x, y, radius, time, turn = 0) {
  p.ellipse(x, y, radius, radius * .86, .20, turn);
  p.ellipse(x, y, radius + 4, (radius + 4) * .86, .10, turn);
  p.ellipse(x, y, 4, 4, .265);
  for (let blade = 0; blade < 5; blade++) {
    const a = time * .65 + blade / 5 * TAU;
    p.curve(t => {const r = 6 + t * (radius - 9), phi = a + t * .48; return [x + Math.cos(phi) * r, y + Math.sin(phi) * r * .86];}, 16, .20);
    p.curve(t => {const r = 6 + t * (radius - 9), phi = a + t * .48 + .12; return [x + Math.cos(phi) * r, y + Math.sin(phi) * r * .86];}, 16, .10);
  }
}

function cabinet(p, x, y, width, height, side, time, cooling = false) {
  const depth = width * .18, top = [[x-width/2,y],[x+width/2,y],[x+width/2+side*depth,y+depth*.5],[x-width/2+side*depth,y+depth*.5],[x-width/2,y]];
  p.path(top, .145);
  p.path([[x-width/2,y],[x-width/2,y+height],[x+width/2,y+height],[x+width/2,y],[x-width/2,y]], .20);
  p.path([[x+side*width/2,y],[x+side*(width/2+depth),y+depth*.5],[x+side*(width/2+depth),y+height+depth*.5],[x+side*width/2,y+height]], .10);
  p.line(x-width*.42,y+height+7,x+width*.42,y+height+7,.145);
  p.hatch(x+side*width*.38,y+17,width*.055,height-30,.065,0);
  if (cooling) {
    for (const station of [.24,.53,.82]) fan(p,x,y+height*station,width*.24,time+station*2);
    for (const edge of [-1,1]) for (const offset of [0,5]) p.path([[x+edge*(width*.43-offset),y-24],[x+edge*(width*.43-offset),y+height+25],[x+edge*width*.8,y+height+25]],.10);
  } else for (let shelf=0;shelf<7;shelf++) {
    const yy=y+22+shelf*(height-40)/7;
    p.path([[x-width*.39,yy],[x+width*.39,yy],[x+width*.39,yy+18],[x-width*.39,yy+18],[x-width*.39,yy]],.145);
    for (let slot=0;slot<6;slot++) p.line(x-width*.32+slot*width*.115,yy+5,x-width*.32+slot*width*.115,yy+12,.10);
    const flash=Math.max(0,1-Math.abs(fract(time*.24-shelf*.11)-.5)*6);
    if(flash>0) p.line(x-width*.31,yy+7,x-width*.31+width*.57*flash,yy+7,.265);
  }
}

export function workshopRoutePoint(points, fraction) {
  const lengths=points.slice(1).map((point,index)=>Math.hypot(point[0]-points[index][0],point[1]-points[index][1]));
  const total=lengths.reduce((a,b)=>a+b,0);let distance=clamp(fraction)*total;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]||i===lengths.length-1){const u=lengths[i]?distance/lengths[i]:0;return [mix(points[i][0],points[i+1][0],u),mix(points[i][1],points[i+1][1],u)];}
    distance-=lengths[i];
  }
  return [...points[0]];
}

function cartridge(p,x,y,size,alpha=.265){
  p.path([[x-size,y],[x+size,y],[x+size+size*.35,y+size*.3],[x-size+size*.35,y+size*.3],[x-size,y]],alpha);
  p.path([[x-size,y],[x-size,y-size*.7],[x+size,y-size*.7],[x+size,y],[x+size+size*.35,y+size*.3],[x+size+size*.35,y-size*.4],[x+size,y-size*.7]],alpha*.8);
  for(let cut=0;cut<4;cut++)p.line(x-size*.7+cut*size*.4,y-size*.5,x-size*.7+cut*size*.4,y-size*.15,alpha*.55);
}

function computeRoom(p,time,camera){
  const span=camera.right-camera.left,mobile=span<2200;
  const spread=Math.min(1490,span*.365),width=mobile?158:245;
  const left=700-spread,right=700+spread;
  // Storage at one side and a cooling/power manifold at the other give the
  // central processor an input/output context rather than repeating its body.
  cabinet(p,left,292,width,296,-1,time,false);
  cabinet(p,right,240,width*.92,342,1,time,true);
  plinth(p,left,606,width*.69,26,39,.145);plinth(p,right,606,width*.67,-26,39,.145);
  // The cutaway turns on a shared raised mounting deck, reached by the two
  // service runs. Its open upper plane leaves the processor's cuts legible.
  p.path([[280,658],[1120,658],[1240,704],[160,704],[280,658]],.10,true);
  p.path([[160,704],[160,718],[1240,718],[1240,704]],.10,true);
  for(const side of[-1,1])for(let seam=0;seam<3;seam++)p.path([[700+side*430,706+seam*4],[700+side*560,706+seam*4]],.10,true);
  if(!mobile){cabinet(p,left-width*1.35,337,width*.72,248,-1,time-2,false);cabinet(p,right+width*1.3,315,width*.68,268,1,time+3,true);}
  for(const side of[-1,1]){
    const x=side<0?left:right;
    for(let lane=0;lane<3;lane++){
      const points=[[x,621+lane*7],[x-side*115,670+lane*12],[700+side*490,670+lane*12],[700+side*(300+lane*10),586+lane*7]];
      p.path(points,.145);p.path(points.map(([px,py])=>[px,py+3]),.065);
      for(const corner of[1,2])p.ellipse(...points[corner],5,3,.20);
      for(let item=0;item<3;item++){
        const u=fract(time*.074+item/3+lane*.12+(side>0?.17:0));
        const fraction=side<0?u:1-u,point=workshopRoutePoint(points,fraction);
        const fade=Math.min(1,u*15,(1-u)*15);
        cartridge(p,...point,7+lane%2*2,.20+fade*.14);
      }
    }
    // A faint returning loom crosses underneath the packet layer.
    for(let cable=0;cable<5;cable++)p.curve(t=>[mix(x,700+side*245,t),704+Math.sin(t*Math.PI)*(33+cable*3)+cable*4],90,.065,cable%2===0);
  }
  // Ceiling service rails recede towards the single processor's mounting deck.
  for(const side of[-1,1])for(let rail=0;rail<3;rail++)p.path([[700+side*280,178+rail*9],[700+side*720,130+rail*9],[700+side*Math.min(2380,span*.49),130+rail*9]],.065,true);
  for(let row=0;row<5;row++)p.curve(t=>[mix(camera.left,camera.right,t),778+row*12+Math.sin(t*Math.PI)*4],Math.ceil(span/20),.065,true);
}

function robotRoom(p,time,seconds,camera){
  const span=camera.right-camera.left,actors=[...panoramaActors(6,seconds,camera),{x:700,y:400,scale:1,seconds,robotVariant:'standard'}];
  const left=camera.left-35,right=camera.right+35;
  // A vaulted service canopy and suspended task lights establish the room's
  // depth above the three workcells, leaving their screens on open paper.
  const roof=u=>[mix(left,right,u),193-Math.sin(u*Math.PI)*140];
  for(const offset of[0,9,24])p.curve(u=>{const at=roof(u);return[at[0],at[1]+offset];},Math.ceil(span/19),offset===9?.10:.065,true);
  for(const side of[-1,1]){
    const lightX=700+side*Math.min(680,span*.17),u=(lightX-left)/(right-left),ceiling=roof(u)[1];
    for(const offset of[-48,48])p.line(lightX+offset,ceiling+24,lightX+offset,209,.10);
    p.path([[lightX-73,209],[lightX+73,209],[lightX+81,220],[lightX-65,220],[lightX-73,209]],.145);
    for(let strip=0;strip<7;strip++)p.line(lightX-57+strip*19,214,lightX-49+strip*19,214,.20);
  }
  // The common deck actually reaches all three plinths. Its shallow curve and
  // changing stanchion depths describe a workshop, rather than a floor grid.
  for(const offset of[0,8,27])p.curve(u=>[mix(left,right,u),650+Math.sin(u*Math.PI)*12+offset],Math.ceil(span/21),offset===8?.145:.10,true);
  for(let support=0;support<9;support++){
    const u=(support+.5)/9,x=mix(left,right,u),top=665+Math.sin(u*Math.PI)*12;
    const length=51+Math.sin(u*Math.PI)*23;
    p.path([[x-4,top],[x-7,top+length],[x+7,top+length],[x+4,top]],.10);
  }
  // A curved transfer lane connects all workcells below their pickup benches.
  const lane=u=>[mix(left,right,u),724+Math.sin(u*Math.PI)*21];
  for(const offset of[0,7,28,36])p.curve(t=>{const a=lane(t);return[a[0],a[1]+offset];},Math.ceil(span/18),offset===7?.20:.10,true);
  for(let roller=0;roller<Math.ceil(span/56);roller++){
    const u=roller/Math.ceil(span/56),a=lane(u);
    p.line(a[0],a[1]+8,a[0]+7,a[1]+27,.10);
  }
  for(let item=0;item<8;item++){
    const u=fract(time*.019+item/8),point=lane(u);
    cartridge(p,point[0],point[1]+8,16+item%3*3,.20);
  }
  for(let id=0;id<actors.length;id++){
    const actor=actors[id],scale=actor.scale,x=actor.x,base=actor.y+252*scale;
    plinth(p,x,base+13,110*scale,28*scale,35*scale,.145);
    // An articulated optical inspector beside each bench tracks the cartridge
    // through its lift. Its light cuts remain sparse and mechanically anchored.
    const state=humanoidState(actor.seconds-sceneStart(6));
    const target=[x+10*scale,actor.y+(state.object[1]-12)*scale];
    const side=id===0?-1:1,postX=x+side*158*scale,postY=actor.y+205*scale;
    const elbow=[postX-side*20*scale,postY-136*scale];
    const head=[postX-side*49*scale,postY-(135+state.lift*45)*scale];
    p.path([[postX-8*scale,postY],[postX+8*scale,postY],[postX+5*scale,postY-110*scale],[postX-5*scale,postY-110*scale],[postX-8*scale,postY]],.10);
    p.path([[postX,postY-109*scale],elbow,head],.20);
    p.ellipse(...elbow,5*scale,5*scale,.20);
    p.ellipse(...head,9*scale,6*scale,.265);
    if(state.grip>.9){
      const scan=.65+.35*Math.sin(time*1.6+id*1.7);
      p.line(head[0]-3*scale,head[1],target[0]-22*scale,target[1]+scan*26*scale,.065);
      p.line(head[0]+3*scale,head[1],target[0]+20*scale,target[1]+scan*26*scale,.065);
      p.ellipse(target[0],target[1]+scan*26*scale,20*scale,3*scale,.10);
    }
    // Each workcell's supply magazine has its own useful form.
    const magazineX=x-side*157*scale,magazineY=actor.y+202*scale;
    for(let tray=0;tray<(id===0?4:3);tray++){
      p.path([[magazineX-24*scale,magazineY-tray*13*scale],[magazineX+24*scale,magazineY-tray*13*scale],[magazineX+31*scale,magazineY+(7-tray*13)*scale],[magazineX-17*scale,magazineY+(7-tray*13)*scale]],.10);
    }
    for(const shift of[-9,9])p.line(magazineX+shift*scale,magazineY+8*scale,magazineX+shift*scale,base+8,.10);
  }
  // Sparse staggered service trusses establish a deep workshop without a
  // rectangular frame enclosing the artwork or a strong floor grid.
  for(const side of[-1,1]){
    const x=700+side*Math.min(2270,span*.47),inset=700+side*Math.min(880,span*.38);
    p.path([[x+side*36,594],[x,470],[inset,232]],.065,true);
    p.path([[x+side*43,590],[x+side*8,466],[inset,244]],.065,true);
    for(let rung=1;rung<8;rung++){const u=rung/8;p.line(mix(x,inset,u),mix(470,232,u),mix(x+side*8,inset,u),mix(466,244,u),.10);}
  }
  for(let contour=0;contour<4;contour++)p.curve(u=>[mix(left,right,u),825+contour*18+Math.sin(u*Math.PI)*22],Math.ceil(span/23),.065,true);
}

export function drawEngravedWorkshop(context,scene,seconds,camera,opacity=1){
  if(opacity<=0||![3,5,6].includes(scene))return;
  const time=seconds-sceneStart(scene),p=workshopPen(context,clamp(opacity),camera);
  context.save();
  if(scene===3)instrumentRoom(p,time,camera);
  if(scene===5)computeRoom(p,time,camera);
  if(scene===6)robotRoom(p,time,seconds,camera);
  p.finish();context.restore();
}
