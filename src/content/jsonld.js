import {
  CONTACT_EMAIL,
  OCURA_OSS_PYPI,
  OCURA_OSS_REPO,
  OCURA_OSS_VERSION,
  SITE_ORIGIN,
} from "../content.js";

export function jsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "Ocuna",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/images/ocuna_logo.png`,
        email: CONTACT_EMAIL,
        description:
          "Ocuna builds infrastructure for monitored AI model execution. Ocura is its branch-aware scheduler and evidence engine.",
        contactPoint: {
          "@type": "ContactPoint",
          email: CONTACT_EMAIL,
          contactType: "customer support",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_ORIGIN}/ocura#product`,
        name: "Ocura",
        url: `${SITE_ORIGIN}/ocura`,
        description:
          "Ocura is Ocuna’s branch-aware scheduler and evidence engine. Ocura OSS is the public research package for recorded local command runs.",
        applicationCategory: "DeveloperApplication",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        brand: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${SITE_ORIGIN}/docs#ocura-oss`,
        name: "Ocura OSS",
        url: `${SITE_ORIGIN}/docs`,
        codeRepository: OCURA_OSS_REPO,
        license: "https://www.mozilla.org/MPL/2.0/",
        programmingLanguage: "Python",
        installUrl: OCURA_OSS_PYPI,
        softwareVersion: OCURA_OSS_VERSION,
        description:
          "A local execution ledger for recording, branching, and comparing command runs. Use the JSON CLI or typed Python API from terminals, scripts, and AI agents. Repository examples support PyTorch, JAX, and a local Ray task.",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}
