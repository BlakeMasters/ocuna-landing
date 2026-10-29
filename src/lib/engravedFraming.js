// One camera for the subject and its environment; mobile is explicit for baking.
export function engravedFraming(width, height, variant = "auto") {
  const mobile = variant === "mobile" || (variant === "auto" && width < 700);
  const scale = Math.min(width / (mobile ? 1200 : 1400), height / (mobile ? 980 : 1050));
  const offsetX = width / 2 - 700 * scale, offsetY = height / 2 - 400 * scale;
  return {
    scale, offsetX, offsetY,
    left: -offsetX / scale, top: -offsetY / scale,
    right: (width - offsetX) / scale, bottom: (height - offsetY) / scale,
  };
}
