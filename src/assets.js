import { isDocRoute } from "./content/docPages.js";

const base = import.meta.env.BASE_URL || "/";

export function asset(path) {
  return `${base}${path.replace(/^\/+/, "")}`;
}

export function pagePath(path = "") {
  const cleanPath = path.replace(/^\/+/, "");
  return `${base}${cleanPath}`;
}

export function routeFromLocation(location = window.location) {
  const basePath = new URL(base, location.origin).pathname;
  let path = location.pathname;

  if (basePath !== "/" && path.startsWith(basePath)) {
    path = `/${path.slice(basePath.length)}`;
  }

  path = path.replace(/\/+$/, "") || "/";

  if (path === "/critter-acknowledgement.html") {
    return "/critter-acknowledgement";
  }

  if (path === "/onveil.html") {
    return "/onveil";
  }

  if (path === "/ocuna.html") {
    return "/ocuna";
  }

  if (path === "/ocura.html") {
    return "/ocura";
  }

  if (path.endsWith(".html") && isDocRoute(path.slice(0, -5))) {
    return path.slice(0, -5);
  }

  if (path === "/contact.html") {
    return "/contact";
  }

  return path;
}
