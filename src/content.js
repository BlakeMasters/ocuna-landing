import { RESEARCH_META, RESEARCH_ROUTES } from "./content/research.js";
import { FOUR1 } from "./content/four1.js";
import { CRITTER } from "./content/critter.js";

import { OSS } from "./content/oss.js";

export const OCURA_OSS_DOCS = OSS.home;
export const SITE_ORIGIN = "https://ocuna-ai.com";
export const CONTACT_EMAIL = "business@ocuna-ai.com";
export const companyNavItems = [
  { label: "Research", href: "/research" },
  { label: "Contact", href: "/contact" },
];

export const productItems = [
  {
    label: "Ocura",
    href: "#work",
    description: "Branch-aware AI runtime",
  },
  {
    label: "Four1",
    href: "/four1",
    description: "Research across machines and providers",
  },
];

export const footerNavItems = [
  { label: "Research", href: "/research" },
  { label: "Contact", href: "/contact" },
];

export const acknowledgementCopy =
  `${CRITTER.recognition} (${CRITTER.species}). ${CRITTER.acknowledgement}`;

const homeMeta = {
  title: "Ocuna | Accelerating Uncertain computation",
  description:
    "Ocuna builds the execution layer for AI workloads that branch as they run. Ocura is its runtime.",
};

export const pageMeta = {
  ...RESEARCH_META,
  "/": homeMeta,
  "/ocuna": homeMeta,
  "/ocura": {
    title: "Ocura | Branch-aware AI runtime",
    description:
      "Ocura is Ocuna’s branch-aware scheduler and evidence engine for AI training and inference workloads.",
  },
  "/four1": {
    title: "Four1 | Research across your machines",
    description: FOUR1.definition,
    image: "/four1/city.png",
  },
  "/critter-acknowledgement": {
    title: "Ocuna | Critter Acknowledgement",
    description: "Ocuna’s acknowledgement of the raccoon, with a drawing from The Cambridge Natural History (1902) and quotations from Tenants of the Trees (1907).",
    image: `/${CRITTER.illustration.file}`,
  },
  "/contact": {
    title: "Contact Ocuna",
    description: "Reach Ocuna at business@ocuna-ai.com for product, research, and partnership questions.",
  },
  "/404": {
    title: "Page not found | Ocuna",
    description: "Page not found. Return to Ocuna or browse a gallery of historical raccoon illustrations.",
  },
};

export const knownRoutes = new Set([
  "/",
  "/ocuna",
  "/ocura",
  "/four1",
  "/critter-acknowledgement",
  ...RESEARCH_ROUTES,
  "/contact",
]);
