const HOME_ROUTES = new Set(["/", "/ocuna", "/ocura"]);

// This runs in the head before the static homepage can paint. Only its temporary
// wrapper is hidden: React's replacement is visible without a readiness signal.
function beginHomeStartup() {
  if (typeof HTMLScriptElement === "undefined" || !HTMLScriptElement.supports || !HTMLScriptElement.supports("module")) return;
  const html = document.documentElement;
  const reveal = () => {
    html.removeAttribute("data-home-startup");
    window.clearTimeout(timer);
    window.removeEventListener("error", onError, true);
  };
  const onError = event => {
    if (event.error || (event.target?.tagName === "SCRIPT" && event.target.type === "module")) reveal();
  };
  const timer = window.setTimeout(reveal, 5000);
  window.addEventListener("error", onError, true);
  html.setAttribute("data-home-startup", "pending");
}

export function homeStartupMarkup(route, content) {
  if (!HOME_ROUTES.has(route)) return { content, head: "", bodyClass: "" };
  const head = `<style id="home-startup-style">html body.landing-route{background:#f8f7f4;color:#1c2530}html body.landing-route::before{display:none}html[data-home-startup="pending"] [data-home-prerender]{visibility:hidden}</style>
<script id="home-startup">(${beginHomeStartup.toString()})();</script>`;
  return { content: `<div data-home-prerender>${content}</div>`, head, bodyClass: "landing-route" };
}
