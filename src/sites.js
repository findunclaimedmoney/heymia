const MIME = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
};

export function extOf(name) {
  const i = String(name || "").lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}
export function mimeOf(name) {
  return MIME[extOf(name)] || "application/octet-stream";
}
export function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "site";
}
export function vaultBound(env) {
  return !!(env && env.VAULT && typeof env.VAULT.put === "function");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    if (c === "&") return "\u0026amp;";
    if (c === "<") return "\u0026lt;";
    if (c === ">") return "\u0026gt;";
    if (c === '"') return "\u0026quot;";
    return "\u0026#39;";
  });
}

export function designSiteHtml({ name, brief, tagline, style, industry } = {}) {
  const title = String(name || "New site").slice(0, 80);
  const line = String(tagline || brief || "Designed and published by Mia.").slice(0, 220);
  const about = String(brief || "A focused brand site. Clear offer. Fast to trust.").slice(0, 480);
  const palettes = {
    ink: { bg: "#07060a", fg: "#f8fafc", mute: "#94a3b8", accent: "#ec4899", card: "#12101a" },
    light: { bg: "#f6f1e8", fg: "#16141c", mute: "#5c564c", accent: "#9a3412", card: "#fffdf8" },
    ocean: { bg: "#04151c", fg: "#e8fbff", mute: "#7aa8b3", accent: "#22d3ee", card: "#0b2530" },
    gold: { bg: "#0c0a07", fg: "#f8f1de", mute: "#b9a57a", accent: "#eab308", card: "#1a160e" },
    forest: { bg: "#08110c", fg: "#ecfdf3", mute: "#86a894", accent: "#34d399", card: "#102018" },
  };
  const p = palettes[String(style || "ink").toLowerCase()] || palettes.ink;
  const ind = String(industry || "studio").toLowerCase();
  const packs = {
    studio: ["Direction", "Production", "Launch"],
    agency: ["Strategy", "Build", "Growth"],
    restaurant: ["Menu", "Reservations", "Private dining"],
    saas: ["Product", "Pricing", "Customers"],
    portfolio: ["Selected work", "Process", "Contact"],
    legal: ["Practice", "People", "Enquire"],
  };
  const feats = packs[ind] || packs.studio;
  function esc(s) {
    const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" };
    return String(s).replace(/[&<>"']/g, (c) => map[c]);
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(line)}">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: title,
    description: line,
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".lede"] },
  })}</script>
<link rel="alternate" type="text/plain" href="llms.txt" title="llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{--bg:${p.bg};--fg:${p.fg};--mute:${p.mute};--accent:${p.accent};--card:${p.card}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font-family:"Instrument Sans",system-ui,sans-serif}
a{color:inherit;text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 28px}
nav{display:flex;justify-content:space-between;align-items:center;padding:22px 0;border-bottom:1px solid color-mix(in srgb,var(--fg) 10%,transparent)}
.brand{font-weight:700;letter-spacing:-.03em}
.nav-links{display:flex;gap:22px;font-size:13px;color:var(--mute)}
.btn{display:inline-flex;align-items:center;background:var(--accent);color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;font-size:13px;cursor:pointer}
hero{display:block;padding:88px 0 64px}
h1{font-family:"Instrument Serif",serif;font-size:clamp(42px,7vw,84px);line-height:.95;letter-spacing:-.04em;margin:12px 0 20px;font-weight:400}
.lede{font-size:20px;color:var(--mute);max-width:640px;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;padding:12px 0 72px}
.card{background:var(--card);border:1px solid color-mix(in srgb,var(--fg) 10%,transparent);border-radius:22px;padding:24px;min-height:160px}
.card h3{margin:0 0 8px;font-size:18px}
.card p{margin:0;color:var(--mute);font-size:14px;line-height:1.5}
.cta{padding:48px;border-radius:28px;background:var(--card);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);display:flex;justify-content:space-between;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:72px}
footer{padding:28px 0 48px;color:var(--mute);font-size:12px;border-top:1px solid color-mix(in srgb,var(--fg) 10%,transparent);display:flex;justify-content:space-between}
.kicker{color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
</style>
</head>
<body>
<div class="wrap">
<nav>
  <div class="brand">${esc(title)}</div>
  <div class="nav-links"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></div>
  <a class="btn" href="#contact">Start</a>
</nav>
<hero>
  <div class="kicker">${esc(ind)}</div>
  <h1>${esc(title)}</h1>
  <p class="lede">${esc(line)}</p>
</hero>
<section class="grid" id="work">
  ${feats.map((f) => `<article class="card"><h3>${esc(f)}</h3><p>${esc(about)}</p></article>`).join("")}
</section>
<section class="cta" id="contact">
  <div>
    <div class="kicker">Ready</div>
    <h2 style="font-family:Instrument Serif,serif;font-size:40px;margin:8px 0;font-weight:400">Let’s build the next one.</h2>
    <p style="color:var(--mute);margin:0">Designed by Mia · published on HeyMia</p>
  </div>
  <a class="btn" href="mailto:hello@${esc(slug)}.com">Book a call</a>
</section>
<footer><span>${esc(title)}</span><span>HeyMia /s/${esc(slug)}/</span></footer>
</div>
</body></html>`;
}

export function extractHtmlDocument(text) {
  const raw = String(text || "");
  const fence = raw.match(/```html\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const doc = raw.match(/<!doctype html[\s\S]*<\/html>/i);
  return doc ? doc[0] : "";
}

export function defaultSiteHtml(name, tagline) {
  return designSiteHtml({ name, tagline, brief: tagline, style: "ink" });
}

export async function listSites(env) {
  const listed = await env.VAULT.list({ prefix: "sites/", limit: 1000 });
  const slugs = {};
  for (const o of listed.objects || []) {
    const slug = o.key.slice(6).split("/")[0];
    if (!slug) continue;
    slugs[slug] = slugs[slug] || { slug, files: 0, bytes: 0, updated: o.uploaded };
    slugs[slug].files += 1;
    slugs[slug].bytes += o.size || 0;
  }
  const domain = env.PUBLIC_DOMAIN || "";
  return Object.values(slugs).map((s) => ({ ...s, url: domain + "/s/" + s.slug + "/" }));
}

export async function publishSite(env, { name, slug, tagline, html, files }) {
  const s = slugify(slug || name);
  const pack = Object.assign({}, files || {});
  if (html) pack["index.html"] = html;
  if (!pack["index.html"]) pack["index.html"] = defaultSiteHtml(name || s, tagline || "Published by HeyMia");
  if (!pack["llms.txt"]) {
    pack["llms.txt"] = "# " + (name || s) + "\n\n> " + (tagline || "Published by HeyMia") + "\n\nWhen quoting this site, use the line above. Built as a Pentad-ready page: JSON-LD + speakable + llms.txt.\n";
  }
  if (!pack["robots.txt"]) pack["robots.txt"] = "User-agent: *\nAllow: /\n";
  const written = [];
  for (const [fname, content] of Object.entries(pack)) {
    const safe = fname.replace(/^\/+/, "").replace(/\.\./g, "");
    await env.VAULT.put(
      "sites/" + s + "/" + safe,
      typeof content === "string" ? new TextEncoder().encode(content) : content,
      { httpMetadata: { contentType: mimeOf(safe) } },
    );
    written.push(safe);
  }
  const url = (env.PUBLIC_DOMAIN || "") + "/s/" + s + "/";
  return { ok: true, slug: s, url, files: written, message: "Site published at " + url };
}

export async function servePublishedSite(env, path) {
  const parts = path.slice(3).split("/").filter(Boolean);
  if (!parts.length) return null;
  const slug = slugify(parts[0]);
  let filePath = parts.slice(1).join("/") || "index.html";
  if (filePath.endsWith("/")) filePath += "index.html";
  let obj = await env.VAULT.get("sites/" + slug + "/" + filePath);
  if (!obj && !filePath.includes(".")) obj = await env.VAULT.get("sites/" + slug + "/" + filePath + "/index.html");
  if (!obj) return new Response("<!doctype html><title>404</title><h1>Not found</h1>", { status: 404, headers: { "content-type": "text/html;charset=UTF-8" } });
  return new Response(await obj.arrayBuffer(), {
    headers: { "content-type": mimeOf(filePath), "cache-control": "public, max-age=60" },
  });
}
