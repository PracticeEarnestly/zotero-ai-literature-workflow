// An isolated, bundled parser: no network fetches and no upstream imports.
Bridge.markdownParser = new Bridge.marked.Marked({ gfm: true, breaks: false, async: false,
  renderer: {
    html(token) { return Bridge.escapeHTML(token.text); },
    image(token) { return Bridge.escapeHTML(token.text || "图片"); },
    link(token) {
      const label = this.parser.parseInline(token.tokens);
      const href = String(token.href || "").trim();
      if (!/^(https?:\/\/|zotero:\/\/|mailto:)/i.test(href) || /[\u0000-\u0020\u007f]/.test(href)) return label;
      return `<a href="${Bridge.escapeHTML(href)}"${token.title ? ` title="${Bridge.escapeHTML(token.title)}"` : ""}>${label}</a>`;
    },
    checkbox(token) { return token.checked ? "☑ " : "☐ "; },
  },
  extensions: [
    { name: "bridgeInlineMath", level: "inline",
      start(src) { const i = src.search(/\$|\\\(/); return i < 0 ? undefined : i; },
      tokenizer(src) {
        const m = /^\$(?!\$)((?:\\.|[^$\n])+?)\$(?!\$)/.exec(src) || /^\\\((.+?)\\\)/.exec(src);
        if (m) return { type: "bridgeInlineMath", raw: m[0], text: m[1] };
      },
      renderer(token) { return `<span class="math">$${Bridge.escapeHTML(token.text)}$</span>`; },
    },
    { name: "bridgeBlockMath", level: "block",
      start(src) { const i = src.search(/^\s*(?:\$\$|\\\[)/m); return i < 0 ? undefined : i; },
      tokenizer(src) {
        const m = /^\s*\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(src)
          || /^\s*\\\[([\s\S]+?)\\\][ \t]*(?:\n|$)/.exec(src);
        if (m) return { type: "bridgeBlockMath", raw: m[0], text: m[1].trim() };
      },
      renderer(token) { return `<pre class="math">$$${Bridge.escapeHTML(token.text)}$$</pre>\n`; },
    },
  ],
});
Bridge.renderMarkdown = value => Bridge.markdownParser.parse(String(value));
Bridge.decodeLegacyText = value => String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (_, entity) => {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const cp = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
  return Number.isInteger(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "�";
});
Bridge.reformatLegacyHTML = html => {
  if (!html.includes('data-llm-automation-bridge="figure-table-deep-review"')
      || html.includes('data-bridge-format="markdown-v1"')) return null;
  // Only the old writer's exact escaped pre-wrap body is eligible. Do not
  // reinterpret arbitrary rich text or a user's unrelated same-title note.
  const old = /<pre style="white-space: pre-wrap; font-family: inherit;">([\s\S]*?)<\/pre>/;
  const match = old.exec(html);
  if (!match || /<\/?[a-z][^>]*>/i.test(match[1])) return null;
  const markdown = Bridge.decodeLegacyText(match[1]);
  return { markdown, html: html.replace(old, () => `<div data-bridge-format="markdown-v1">${Bridge.renderMarkdown(markdown)}</div>`) };
};
