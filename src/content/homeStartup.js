const HOME_ROUTES = new Set(["/", "/ocuna", "/ocura"]);

// This runs in the head before the static page can paint. Only its temporary
// wrapper is hidden: React's replacement is visible without a readiness signal.
function beginPageStartup(attribute) {
  if (typeof HTMLScriptElement === "undefined" || !HTMLScriptElement.supports || !HTMLScriptElement.supports("module")) return;
  const html = document.documentElement;
  const reveal = () => {
    html.removeAttribute(attribute);
    window.clearTimeout(timer);
    window.removeEventListener("error", onError, true);
  };
  const onError = event => {
    if (event.error || (event.target?.tagName === "SCRIPT" && event.target.type === "module")) reveal();
  };
  const timer = window.setTimeout(reveal, 5000);
  window.addEventListener("error", onError, true);
  html.setAttribute(attribute, "pending");
}

export function homeStartupMarkup(route, content) {
  if (!HOME_ROUTES.has(route)) return { content, head: "", bodyClass: "" };
  const head = `<style id="home-startup-style">html body.landing-route{background:#f8f7f4;color:#1c2530}html body.landing-route::before{display:none}html[data-home-startup="pending"] [data-home-prerender]{visibility:hidden}</style>
<script id="home-startup">(${beginPageStartup.toString()})("data-home-startup");</script>`;
  return { content: `<div data-home-prerender>${content}</div>`, head, bodyClass: "landing-route" };
}

export function notFoundStartupMarkup(content) {
  const head = `<style id="not-found-startup-style">html body.not-found-route{background-color:#eee5d3;color:#382e25}html body.not-found-route::before{display:none}html[data-not-found-startup="pending"] [data-not-found-prerender]{visibility:hidden}</style>
<script id="not-found-startup">(${beginPageStartup.toString()})("data-not-found-startup");</script>`;
  return { content: `<div data-not-found-prerender>${content}</div>`, head, bodyClass: "paper-route not-found-route" };
}
