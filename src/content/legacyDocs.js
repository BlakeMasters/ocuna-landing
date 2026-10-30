import { OSS } from "./oss.js";

// Compatibility destinations only. Documentation is maintained at Protention.
export const DOC_REDIRECTS = [
  { route: "/docs", target: OSS.home, file: "ocura-oss.md" },
  { route: "/docs/cli", target: OSS.cli, file: "cli.md" },
  { route: "/docs/api", target: OSS.api, file: "api.md" },
  { route: "/docs/automation", target: OSS.automation, file: "automation.md" },
  { route: "/docs/examples", target: OSS.examples, file: "examples.md" },
  { route: "/docs/state", target: OSS.state, file: "state.md" },
];

export function documentationTarget(path) {
  const route = path.replace(/\/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "");
  const page = DOC_REDIRECTS.find((item) => item.route === route || `/docs/${item.file}` === route);
  if (!page) return null;
  return route.endsWith(".md") ? `https://protention.dev/docs/${page.file}` : page.target;
}
