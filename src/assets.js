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

  return path;
}
