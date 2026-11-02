import {
  CONTACT_EMAIL,
  pageMeta,
  SITE_ORIGIN,
} from "../content.js";
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
          "Ocura is Ocuna’s branch-aware scheduler and evidence engine.",
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
    ],
  };

  // Redirect destinations describe their own pages; the 404 is not indexable.
  const meta = pageMeta[route];
  if (!meta || route === "/404") return graph;

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
      ...(post.updated ? { dateModified: post.updated } : {}),
      image: `${SITE_ORIGIN}/research/${RESEARCH_ART[post.art].file}`,
      mainEntityOfPage: { "@id": page["@id"] },
      author: { "@type": "Organization", name: "Ocuna Research", url: `${SITE_ORIGIN}/research` },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    });
  }

  return graph;
}
