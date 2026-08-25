export const SITE_ORIGIN = "https://ocuna-ai.com";
export const CONTACT_EMAIL = "business@ocuna-ai.com";
export const OCURA_OSS_REPO = "https://github.com/BlakeMasters/ocura-oss";
export const OCURA_OSS_PYPI = "https://pypi.org/project/ocura-oss/";
export const OCURA_OSS_VERSION = "0.2.2";

export const companyNavItems = [
  { label: "Docs", href: "/docs" },
  { label: "Contact", href: "/contact" },
];

export const ocuraNavItems = [
  { label: "Scheduler", href: "#work" },
  { label: "Training + Inference", href: "#market" },
  { label: "Critter Acknowledgement", href: "#critter" },
  { label: "Docs", href: "/docs" },
];

export const productItems = [
  {
    label: "Ocura",
    href: "/ocura",
    description: "Branch-aware AI runtime",
  },
  {
    label: "OnVeil",
    href: "/onveil",
    description: "Execution authority research",
  },
];

export const footerNavItems = [
  { label: "Docs", href: "/docs" },
  { label: "Contact", href: "/contact" },
];

export const acknowledgementCopy =
  "Ocuna recognizes the raccoon (Procyon lotor) as a model of stochastic behavioral expression shaped by high variability, adaptive learning, and individual divergence across natural and urban environments. Empirical studies describe flexible, probabilistic problem-solving strategies, with solution pathways varying across individuals and trials. Rapid associative learning produces structured stochasticity: a dynamic repertoire shaped by cognition, ecology, chance, novel stimuli, and competition. This acknowledgement celebrates an adaptive behavioral system that continuously samples, tests, and revises its strategies across changing surroundings.";

const homeMeta = {
  title: "Ocuna | Infrastructure for uncertain computation",
  description:
    "Ocuna builds the execution layer for AI workloads that branch as they run. Ocura is its runtime. Ocura OSS is a public research package for recording local command runs.",
};

export const pageMeta = {
  "/": homeMeta,
  "/ocuna": homeMeta,
  "/ocura": {
    title: "Ocura | Branch-aware AI runtime",
    description:
      "Ocura is Ocuna’s branch-aware scheduler and evidence engine for AI training and inference workloads.",
  },
  "/onveil": {
    title: "OnVeil | Authority Research",
    description: "OnVeil explores authority checks and operator controls for software execution.",
  },
  "/critter-acknowledgement": {
    title: "Ocuna | Critter Acknowledgement",
    description: "Ocuna's acknowledgement of structured stochasticity, adaptation, and the raccoon.",
  },
  "/docs": {
    title: "Ocura OSS | Documentation",
    description:
      `Ocura OSS records trusted local command executions as project-local records. Version ${OCURA_OSS_VERSION} is published on PyPI. It provides a CLI and a typed Python API, and is not the Ocura engine.`,
  },
  "/docs/cli": {
    title: "CLI reference | Ocura OSS",
    description:
      "Complete command-line reference for Ocura OSS, including commands, options, output, state behavior, and exit status.",
  },
  "/docs/api": {
    title: "Python API reference | Ocura OSS",
    description:
      "Complete Python API reference for Ocura OSS workflows, Store access, data models, enums, exceptions, and typing.",
  },
  "/contact": {
    title: "Contact Ocuna",
    description: "Reach Ocuna at business@ocuna-ai.com for product, research, and partnership questions.",
  },
  "/404": {
    title: "Page not found | Ocuna",
    description: "This path is not a page on ocuna-ai.com. Return home, open Ocura, or read the Ocura OSS docs.",
  },
};

export const knownRoutes = new Set([
  "/",
  "/ocuna",
  "/ocura",
  "/onveil",
  "/critter-acknowledgement",
  "/docs",
  "/docs/cli",
  "/docs/api",
  "/contact",
]);
