import { CITY_SIZE, ROOFTOP_FLUES, cityPlacement, steamAt } from "./cityAtmosphere.js";

// Rooftop contours traced in the approved artwork's source coordinates.
// Each band contains original image pixels, including their existing roof faces.
// Nearer rooflines pass faster, giving the camera an elevated travelling view.
const CITY_BANDS = [
  {
    speed: 9,
    flues: [0,1,2,3],
    roof: [[0,188],[110,188],[138,204],[138,380],[200,380],[200,317],[212,317],[212,380],[253,380],[258,394],[272,403],[272,552],[281,552],[281,527],[337,527],[337,579],[401,579],[417,596],[417,656],[426,656],[426,627],[457,627],[457,657],[463,657],[463,712],[529,712],[529,708],[555,708],[555,702],[592,702],[592,670],[600,670],[600,656],[619,656],[619,616],[622,616],[622,656],[649,656],[649,668],[672,668],[672,775],[762,775],[762,810],[788,810],[788,775],[799,775],[799,758],[840,758],[840,775],[853,775],[853,826],[894,826],[894,793],[912,793],[912,762],[922,762],[922,751],[960,751],[960,786],[982,786],[982,737],[989,733],[995,738],[995,787],[1026,787],[1026,734],[1042,734],[1042,723],[1143,723],[1143,748],[1155,748],[1155,715],[1169,715],[1169,706],[1177,706],[1177,662],[1187,655],[1199,657],[1199,706],[1221,706],[1221,716],[1235,716],[1235,735],[1258,735],[1258,558],[1263,552],[1302,552],[1302,602],[1395,602],[1395,577],[1421,557],[1453,557],[1453,365],[1478,356],[1478,349],[1483,344],[1538,344],[1538,446],[1579,446],[1579,267],[1591,267],[1591,255],[1605,255],[1605,163],[1610,163],[1610,255],[1614,255],[1614,235],[1618,235],[1618,255],[1672,255]],
  },
  {
    speed: 16,
    flues: [],
    roof: [[0,572],[122,572],[122,446],[148,446],[165,457],[165,502],[181,512],[194,587],[253,587],[253,643],[280,661],[280,722],[313,722],[313,579],[341,579],[341,722],[360,722],[360,676],[372,676],[372,743],[381,743],[381,676],[393,676],[393,743],[402,743],[402,676],[414,676],[414,725],[469,725],[469,712],[500,712],[517,725],[517,742],[543,742],[543,820],[698,820],[698,839],[836,839],[836,889],[974,889],[974,839],[1004,839],[1004,856],[1152,856],[1152,826],[1161,826],[1161,776],[1229,776],[1229,788],[1338,788],[1338,735],[1350,724],[1484,724],[1484,598],[1505,586],[1529,598],[1529,724],[1564,724],[1564,624],[1587,624],[1587,535],[1604,535],[1604,624],[1614,624],[1614,535],[1631,535],[1631,624],[1640,624],[1640,425],[1657,414],[1672,414]],
  },
  {
    speed: 25,
    flues: [4,5],
    roof: [[0,371],[13,371],[52,394],[52,537],[66,546],[66,643],[253,643],[253,856],[281,856],[281,788],[325,788],[325,743],[542,743],[542,820],[697,820],[697,839],[836,839],[836,890],[974,890],[974,839],[1028,839],[1028,903],[1058,903],[1058,856],[1248,856],[1248,813],[1338,813],[1338,738],[1350,724],[1564,724],[1564,624],[1587,624],[1587,535],[1604,535],[1604,624],[1614,624],[1614,535],[1631,535],[1631,624],[1640,624],[1640,425],[1657,414],[1672,414]],
  },
];

export function cityTravel(time, speed) {
  const period = CITY_SIZE.width * 2;
  return ((time * speed) % period + period) % period;
}

export function createCityPanorama(image, compact) {
  // Small screens cache smaller source bands. Mirrored neighbours meet at
  // identical source edges, so the panorama wraps without a crossfade or seam.
  const resolution = compact ? 0.65 : 1;
  const bands = CITY_BANDS.map((band) => {
    const surface = document.createElement("canvas");
    surface.width = Math.round(CITY_SIZE.width * resolution);
    surface.height = Math.round(CITY_SIZE.height * resolution);
    const context = surface.getContext("2d");
    if (!context) return null;
    context.scale(resolution, resolution);
    context.beginPath();
    band.roof.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
    context.lineTo(CITY_SIZE.width, CITY_SIZE.height);
    context.lineTo(0, CITY_SIZE.height);
    context.closePath();
    context.clip();
    context.drawImage(image, 0, 0, CITY_SIZE.width, CITY_SIZE.height);
    return { ...band, surface };
  });
  return bands.every(Boolean) ? { image, bands } : null;
}

function drawSteam(context, sprite, band, time, compact, budget, visible = [-Infinity, Infinity]) {
  for (const flueIndex of band.flues) {
    const flue = ROOFTOP_FLUES[flueIndex];
    if (flue.x < visible[0] - 100 || flue.x > visible[1] + 100) continue;
    context.save();
    context.beginPath();
    context.rect(flue.x - 200, 0, 400, flue.y + 1);
    context.clip();
    for (let index = 0, count = compact ? 4 : 7; index < count; index++) {
      if (budget.remaining-- <= 0) break;
      const puff = steamAt(flue, time + 7, index, count);
      context.globalAlpha = puff.alpha;
      context.drawImage(sprite, puff.x - puff.radius, puff.y - puff.radius * 1.9,
        puff.radius * 2, puff.radius * 3.1);
    }
    context.restore();
  }
}

export function drawCityPanorama(context, panorama, sprite, time, width, height, dpr, compact, still = false) {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#111312";
  context.fillRect(0, 0, width, height);
  // Extend the source's quiet sky across the viewport before placing the city.
  // Compact layouts therefore have no horizontal edge above the roofline band.
  if (!still) context.drawImage(panorama.image, 150, 0, 1250, 160, 0, 0, width, height);
  const placement = cityPlacement(width, height, compact);
  context.translate(placement.x, placement.y);
  context.scale(placement.scale, placement.scale);
  const budget = { remaining: compact ? 40 : 64 };

  if (still) {
    context.drawImage(panorama.image, 0, 0, CITY_SIZE.width, CITY_SIZE.height);
    for (const band of panorama.bands) drawSteam(context, sprite, band, 0, compact, budget);
    context.globalAlpha = 1;
    return;
  }

  // Only roofline bands move: the reading surface and its horizon stay steady.
  for (const band of panorama.bands) {
    const travel = cityTravel(time, band.speed);
    const first = Math.floor(travel / CITY_SIZE.width) - 1;
    for (let tile = first; tile <= first + 3; tile++) {
      const x = tile * CITY_SIZE.width - travel;
      if (x > CITY_SIZE.width + 210 || x + CITY_SIZE.width < -210) continue;
      context.save();
      context.translate(x, 0);
      const mirrored = Math.abs(tile % 2) === 1;
      if (mirrored) {
        context.translate(CITY_SIZE.width, 0);
        context.scale(-1, 1);
      }
      context.globalAlpha = 1;
      context.drawImage(band.surface, 0, 0, CITY_SIZE.width, CITY_SIZE.height);
      const visible = mirrored ? [x, CITY_SIZE.width + x] : [-x, CITY_SIZE.width - x];
      drawSteam(context, sprite, band, time, compact, budget, visible);
      context.restore();
    }
  }
  // A low atmospheric layer slips across the moving rooflines independently.
  for (let index = 0; index < 3; index++) {
    const phase = time / (30 + index * 3) * Math.PI * 2 + index * 1.9;
    context.globalAlpha = 0.09 + Math.sin(phase) * 0.02;
    const x = [280, 850, 1440][index] + Math.sin(phase) * 48;
    context.drawImage(sprite, x - 300, 748 + index * 22, 600, 78);
  }
  context.globalAlpha = 1;
}
