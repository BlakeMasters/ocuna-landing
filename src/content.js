import { DOC_PAGES } from "./content/docPages.js";

export const SITE_ORIGIN = "https://ocuna-ai.com";
export const CONTACT_EMAIL = "business@ocuna-ai.com";
export const OCURA_OSS_REPO = "https://github.com/BlakeMasters/ocura-oss";
export const OCURA_OSS_PYPI = "https://pypi.org/project/ocura-oss/";
export const OCURA_OSS_VERSION = "0.3.0";

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
    "Ocuna builds the execution layer for AI workloads that branch as they run. Ocura is its runtime. Ocura OSS is a local execution ledger for recording, branching, and comparing command runs.",
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
      `Ocura OSS ${OCURA_OSS_VERSION}: a local execution ledger for recording, branching, and comparing command runs. Use the JSON CLI or typed Python API from terminals, scripts, and AI agents.`,
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
  "/docs/automation": {
    title: "Scripts and AI agents | Ocura OSS",
    description: "Drive the Ocura OSS record, branch, rerun, and compare workflow with JSON commands or the Python API inside your existing execution environment.",
  },
  "/docs/examples": {
    title: "PyTorch, JAX, and Ray example | Ocura OSS",
    description: "Run a small autoregressive training experiment with PyTorch or JAX, optionally using a local Ray task, and reconstruct its comparison from saved evidence.",
  },
  "/docs/state": {
    title: "State and verification | Ocura OSS",
    description: "Understand Ocura OSS records, lineage, logs, checksums, and the local execution model.",
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
  ...DOC_PAGES.map((page) => page.route),
  "/contact",
]);
