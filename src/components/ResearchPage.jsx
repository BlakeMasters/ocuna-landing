import { useEffect } from "react";
import { asset, pagePath } from "../assets.js";
import { getResearchPost, RESEARCH_ART, RESEARCH_POSTS } from "../content/research.js";
import "./ResearchPage.css";

function Arrow({ diagonal = false }) {
  return <svg className="field-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} /></svg>;
}

function NoteArt({ kind, thumbnail = false, priority = false }) {
  const illustration = RESEARCH_ART[kind] ?? RESEARCH_ART.trail;
  return <img className={thumbnail ? "field-thumbnail" : undefined} src={asset(`research/${illustration.file}`)} alt={thumbnail ? "" : illustration.alt} loading={thumbnail ? "lazy" : "eager"} fetchPriority={priority ? "high" : undefined} width="1536" height="1024" />;
}

function ArticleLink({ post, onNavigate, children, ...props }) {
  const href = `/research/${post.slug}`;
  return <a href={pagePath(href)} onClick={(event) => onNavigate(event, href)} {...props}>{children}</a>;
}

function ResearchIndex({ onNavigate }) {
  const [featured, ...posts] = RESEARCH_POSTS;

  return <main className="field-page" id="top" tabIndex={-1}>
    <div className="field-shell">
      <section className="field-masthead" aria-labelledby="field-title">
        <h1 id="field-title">Field Notes</h1>
      </section>
      <section aria-label="Featured field note">
        <ArticleLink post={featured} onNavigate={onNavigate} className="field-feature">
          <div className="field-feature-copy">
            <h2>{featured.title}</h2>
            <span className="field-read">Read article <Arrow /></span>
            <p className="field-feature-meta">{featured.category} <span>·</span> {featured.readTime}</p>
          </div>
          <figure className="field-feature-image">
            <NoteArt kind={featured.art} priority />
          </figure>
        </ArticleLink>
      </section>

      <section className="field-notebook" aria-label="More field notes">
        <div className="field-entries">
          {posts.map((post) => <ArticleLink key={post.slug} post={post} onNavigate={onNavigate} className="field-entry">
            <div className="field-entry-art"><NoteArt kind={post.art} thumbnail /></div>
            <div className="field-entry-copy"><p className="field-category">{post.category}</p><h2>{post.title}</h2><div className="field-entry-meta">{post.readTime}</div></div>
            <Arrow diagonal />
          </ArticleLink>)}
        </div>
      </section>
    </div>
  </main>;
}

function ResearchArticle({ post, onNavigate }) {
  return <main className="field-page field-article-page" id="top" tabIndex={-1}>
    <div className="field-shell">
      <a className="field-back" href={pagePath("/research")} onClick={(event) => onNavigate(event, "/research")}><span aria-hidden="true">←</span> All field notes</a>
      <header className="field-article-heading"><p className="field-category">{post.category}</p><h1>{post.title}</h1><div className="field-article-byline"><span>Ocuna Research<span className="field-article-date"><time dateTime={post.date}>{post.dateLabel}</time> · {post.readTime}</span></span></div></header>
      <div className="field-article-cover">
        <NoteArt kind={post.art} />
      </div>
      <div className="field-reading-layout"><aside className="field-article-contents"><p className="field-contents-title">Contents</p><nav aria-label="Article sections">{post.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav></aside>
        <article className="field-prose">{post.sections.map((section) => <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.code && <pre><code>{section.code}</code></pre>}{section.links && <ul className="field-source-links">{section.links.map((link) => <li key={link.href}><a href={link.href}>{link.label} <Arrow diagonal /></a></li>)}</ul>}</section>)}</article>
      </div>
      <section className="field-related" aria-labelledby="field-related-title"><div className="field-notebook-heading"><h2 id="field-related-title">Read next</h2></div>{RESEARCH_POSTS.filter((item) => item.slug !== post.slug).map((item) => <ArticleLink post={item} onNavigate={onNavigate} className="field-related-link" key={item.slug}><span>{item.category}</span><h3>{item.title}</h3><Arrow diagonal /></ArticleLink>)}</section>
    </div>
  </main>;
}

export default function ResearchPage({ route, onNavigate }) {
  const post = getResearchPost(route);
  useEffect(() => { if (!window.location.hash) window.scrollTo({ top: 0 }); }, [route]);
  return post ? <ResearchArticle key={post.slug} post={post} onNavigate={onNavigate} /> : <ResearchIndex onNavigate={onNavigate} />;
}
