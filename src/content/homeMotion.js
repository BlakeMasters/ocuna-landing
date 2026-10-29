import { raccoonContours, raccoonPose } from "../lib/lectpy-raccoon/raccoon_walk.js";
import { PREPARED_FILM } from "./preparedFilm.js";

export function homeRaccoonHtml() {
  const contours = raccoonContours(raccoonPose(7.1, 0, "startle-sniff"));
  const points = contours.flat(), low = [0, 1].map(axis => Math.min(...points.map(p => p[axis]))), high = [0, 1].map(axis => Math.max(...points.map(p => p[axis])));
  const scale = 58 / (high[1] - low[1]), x = 700 - (high[0] + low[0]) / 2 * scale, y = 64 - high[1] * scale;
  const drawing = contours.map(contour => `<path d="M${contour.map(point => point.map(v => v.toFixed(1)).join(",")).join("L")}Z"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 68" width="1400" height="68" role="img" aria-label="Ocuna raccoon" style="display:block;width:100%;height:68px"><g fill="#1c2530" fill-rule="evenodd" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})">${drawing}</g></svg>`;
}

export function homeEngravingHtml() {
  const { desktop, mobile } = PREPARED_FILM.variants;
  return `<figure id="home-engraving" aria-label="Animated engravings" style="width:100%;margin:0 auto 4px;height:max(clamp(180px,30svh,300px),calc((100vw - 48px)/6.5));overflow:hidden;mix-blend-mode:multiply"><picture style="display:block;width:100%;height:100%"><source media="(max-width:620px)" srcset="/${mobile.poster}"/><img src="/${desktop.poster}" alt="An engraved moon with shaded craters above an etched landscape." width="${desktop.width}" height="${desktop.height}" decoding="async" style="width:100%;height:100%;object-fit:cover"/></picture></figure>`;
}
