export const DOCS_ORIGIN = "https://protention.dev";

export const DOC_PAGES = [
  { route: "/docs", destination: `${DOCS_ORIGIN}/`, label: "Overview", crumb: "Overview", file: "ocura-oss.md", repositoryPath: "docs/index.md" },
  { route: "/docs/cli", destination: `${DOCS_ORIGIN}/cli/`, label: "CLI reference", crumb: "CLI reference", file: "cli.md", repositoryPath: "docs/cli.md" },
  { route: "/docs/api", destination: `${DOCS_ORIGIN}/api/`, label: "Python API", crumb: "Python API reference", file: "api.md", repositoryPath: "docs/python-api.md" },
  { route: "/docs/automation", destination: `${DOCS_ORIGIN}/automation/`, label: "Scripts and AI agents", crumb: "Scripts and AI agents", file: "automation.md", repositoryPath: "docs/automation.md" },
  { route: "/docs/examples", destination: `${DOCS_ORIGIN}/examples/`, label: "Training example", crumb: "PyTorch, JAX, and Ray", file: "examples.md", repositoryPath: "examples/autoregressive/README.md" },
  { route: "/docs/state", destination: `${DOCS_ORIGIN}/state/`, label: "State and verification", crumb: "State and verification", file: "state.md", repositoryPath: "docs/state-and-verification.md" },
];

export const isDocRoute = (route) => DOC_PAGES.some((page) => page.route === route);
