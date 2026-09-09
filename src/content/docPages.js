export const DOC_PAGES = [
  { route: "/docs", label: "Overview", crumb: "Overview", file: "ocura-oss.md", repositoryPath: "README.md" },
  { route: "/docs/cli", label: "CLI reference", crumb: "CLI reference", file: "cli.md", repositoryPath: "docs/cli.md" },
  { route: "/docs/api", label: "Python API", crumb: "Python API reference", file: "api.md", repositoryPath: "docs/python-api.md" },
  { route: "/docs/automation", label: "Scripts and AI agents", crumb: "Scripts and AI agents", file: "automation.md", repositoryPath: "docs/automation.md" },
  { route: "/docs/examples", label: "Training example", crumb: "PyTorch, JAX, and Ray", file: "examples.md", repositoryPath: "examples/autoregressive/README.md" },
  { route: "/docs/state", label: "State and verification", crumb: "State and verification", file: "state.md", repositoryPath: "docs/state-and-verification.md" },
];

export const isDocRoute = (route) => DOC_PAGES.some((page) => page.route === route);
