export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[`*[\]]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeHref(href) {
  const trimmed = href.trim().replaceAll('"', "");
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("mailto:")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return "#";
  }

  return "#";
}

function renderInline(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      return `<a href="${safeHref(href)}">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function headingText(value) {
  return value.replace(/[`*]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function headingId(text, { parentId = "", used = new Set() } = {}) {
  const base = slugify(text);
  let id = parentId && base ? `${parentId}-${base}` : base;
  if (!id) id = "section";
  let unique = id;
  let suffix = 2;
  while (used.has(unique)) {
    unique = `${id}-${suffix}`;
    suffix += 1;
  }
  used.add(unique);
  return unique;
}

export function extractHeadings(markdown) {
  const headings = [];
  const used = new Set();
  let parentId = "";
  let inFence = false;

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const text = headingText(match[2].trim());
    if (level === 2) parentId = slugify(text);
    headings.push({
      level,
      text,
      id: headingId(text, { parentId: level === 3 ? parentId : "", used }),
    });
  }

  return headings;
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const used = new Set();
  let parentId = "";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith("```")) {
      const fenceLang = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      const langClass = fenceLang ? ` class="language-${escapeHtml(fenceLang)}"` : "";
      html.push(`<pre><code${langClass}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = headingText(heading[2].trim());
      if (level === 2) parentId = slugify(text);
      const id = headingId(text, { parentId: level === 3 ? parentId : "", used });
      html.push(`<h${level} id="${id}" tabindex="-1">${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(`<li>${renderInline(lines[index].slice(2))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (line.startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        rows.push(lines[index]);
        index += 1;
      }
      const parsed = rows
        .map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()))
        .filter((cells) => cells.length && !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
      if (parsed.length) {
        const [header, ...body] = parsed;
        const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
        const bodyRows = body
          .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
          .join("");
        html.push(
          `<div class="docs-table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table></div>`,
        );
      }
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ") &&
      !lines[index].startsWith("|") &&
      !lines[index].startsWith("```")
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}
