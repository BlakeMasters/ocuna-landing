import {
  CONTACT_EMAIL,
  OCURA_OSS_DOCS,
  OCURA_OSS_PYPI,
  OCURA_OSS_REPO,
  OCURA_OSS_VERSION,
  pageMeta,
  SITE_ORIGIN,
} from "../content.js";
import { isDocRoute } from "./docPages.js";
import { FOUR1 } from "./four1.js";
import { getResearchPost, RESEARCH_ART, RESEARCH_POSTS } from "./research.js";

export function jsonLdGraph(route = "/") {
  const graph = {
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
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: "Ocuna",
        url: `${SITE_ORIGIN}/`,
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
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
        "@type": "SoftwareApplication",
        "@id": `${SITE_ORIGIN}/four1#product`,
        name: "Four1",
        url: `${SITE_ORIGIN}/four1`,
        image: `${SITE_ORIGIN}/four1/city.png`,
        description: `${FOUR1.definition} Being built toward a downloadable desktop app; a public download is not yet available.`,
        applicationCategory: "DeveloperApplication",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        brand: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${SITE_ORIGIN}/docs#ocura-oss`,
        name: "Ocura OSS",
        url: OCURA_OSS_DOCS,
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

  // Redirect destinations describe their own pages; the 404 is not indexable.
  const meta = pageMeta[route];
  if (!meta || route === "/404" || isDocRoute(route)) return graph;

  const url = `${SITE_ORIGIN}${route === "/ocuna" ? "/" : route}`;
  const post = getResearchPost(route);
  const page = {
    "@type": route === "/research" ? "CollectionPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: meta.title,
    description: meta.description,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
  };
  graph["@graph"].push(page);

  if (route === "/research") {
    page.mainEntity = {
      "@type": "ItemList",
      itemListElement: RESEARCH_POSTS.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `${SITE_ORIGIN}/research/${item.slug}`,
      })),
    };
  }

  if (post) {
    page.mainEntity = { "@id": `${url}#article` };
    graph["@graph"].push({
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      url,
      headline: post.title,
      description: post.description,
      articleSection: post.category,
      datePublished: post.date,
      image: `${SITE_ORIGIN}/research/${RESEARCH_ART[post.art].file}`,
      mainEntityOfPage: { "@id": page["@id"] },
      author: { "@type": "Organization", name: "Ocuna Research", url: `${SITE_ORIGIN}/research` },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    });
  }

  return graph;
}
