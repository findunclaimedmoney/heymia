export const PRODUCTS = [
  {
    slug: "sovereignquant",
    name: "Sovereign Quant",
    urls: [],
    blurb: "Multi-agent quant system",
    aliases: ["sovereign-quant", "sovereignquant", "agent-core", "quant"],
  },
  {
    slug: "lensflow",
    name: "LensFlow Dating",
    urls: ["https://lensflow.com.au"],
    blurb: "Dating site · companions · Play",
    aliases: ["lensflow", "liveavatar", "heymia-play", "jess", "fanstudio"],
  },
  {
    slug: "missingcash",
    name: "Missing Cash",
    urls: ["https://missingcash.com.au"],
    blurb: "Unclaimed money finder",
    aliases: ["missingcash", "missing-cash", "unclaimed"],
  },
  {
    slug: "bartermint",
    name: "Bartermint",
    urls: ["https://bartermint.polsia.app", "https://bartermint.onhercules.app"],
    blurb: "Barter marketplace",
    aliases: ["bartermint", "polsia", "hercules"],
  },
  {
    slug: "realestate",
    name: "LensFlow Real Estate",
    urls: [],
    blurb: "Pipeline + mobile",
    aliases: ["realestate", "real-estate", "pipeline"],
  },
];

const ALIAS = {};
for (const p of PRODUCTS) {
  ALIAS[p.slug] = p.slug;
  for (const a of p.aliases) ALIAS[a] = p.slug;
}

export function cleanFileName(key) {
  let n = String(key || "").split("/").pop() || "file";
  n = n.replace(/^\d{10,}-/, "");
  n = n.replace(/^upload-\d{10,}$/, "work-active.html");
  n = n.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (n.length > 80) n = n.slice(0, 80);
  return n || "file";
}

export function classifyProject(key, name) {
  const s = (String(key || "") + " " + String(name || "")).toLowerCase();
  const m = String(key || "").match(/^projects\/([^/]+)/);
  if (m && ALIAS[m[1]]) return ALIAS[m[1]];
  if (m && PRODUCTS.some((p) => p.slug === m[1])) return m[1];
  if (/sovereign|quant|mitosis|agent-core|agentcore|daemon/.test(s)) return "sovereignquant";
  if (/missing.?cash|unclaimed/.test(s)) return "missingcash";
  if (/bartermint|polsia|hercules/.test(s)) return "bartermint";
  if (/real.?estate|pipeline/.test(s)) return "realestate";
  if (/lensflow|screenshot|companion|liveindicator|jess|play-(fix|add)|fan/.test(s)) return "lensflow";
  if (/ui\/play/.test(s)) return "lensflow";
  if (/ui\/work|heymia-work|heymia-memory|work-(fix|add|support)|convex/.test(s)) return "heymia";
  return "heymia";
}

function boardHtml(p) {
  const links = (p.urls || []).map((u) => `<p><a href="${u}">${u}</a></p>`).join("") || "<p>No live URL yet.</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.name}</title>
<style>body{font-family:system-ui;background:#07060a;color:#f8fafc;margin:0;padding:24px}a{color:#ec4899} .card{background:#16141f;border:1px solid #ffffff14;border-radius:16px;padding:20px;max-width:640px}</style></head>
<body><div class="card"><h1>${p.name}</h1><p>${p.blurb}</p>${links}<p>Open this project on <a href="/work">HeyMia /work</a> · files live in R2 <code>projects/${p.slug}/</code></p></div></body></html>`;
}

export async function seedProducts(env) {
  if (!env.VAULT) return { ok: false, error: "VAULT unbound" };
  const created = [];
  for (const p of PRODUCTS) {
    const metaKey = "projects/" + p.slug + "/_project.json";
    const htmlKey = "projects/" + p.slug + "/index.html";
    await env.VAULT.put(metaKey, JSON.stringify({ ...p, seeded: new Date().toISOString() }), {
      httpMetadata: { contentType: "application/json" },
    });
    const exists = await env.VAULT.head(htmlKey);
    if (!exists) {
      await env.VAULT.put(htmlKey, boardHtml(p), { httpMetadata: { contentType: "text/html;charset=UTF-8" } });
    }
    created.push(p.slug);
  }
  try {
    const { seedMarketing } = await import("./marketing.js");
    await seedMarketing(env);
  } catch {}
  return { ok: true, products: created };
}

export async function listProducts(env) {
  const files = [];
  if (env.VAULT) {
    const listed = await env.VAULT.list({ prefix: "projects/", limit: 1000 });
    for (const o of listed.objects || []) files.push(o.key);
  }
  return PRODUCTS.map((p) => ({
    ...p,
    files: files.filter((k) => k.startsWith("projects/" + p.slug + "/")).length,
  }));
}

export async function organizeVault(env) {
  if (!env.VAULT) return { ok: false, error: "VAULT unbound" };
  await seedProducts(env);
  const listed = await env.VAULT.list({ prefix: "", limit: 1000 });
  const moved = [];
  const skipped = [];
  const projects = {};
  const bump = (slug) => {
    projects[slug] = (projects[slug] || 0) + 1;
  };
  for (const o of listed.objects || []) {
    const key = o.key;
    if (key.startsWith("ui/") || key.startsWith("sites/") || key.startsWith("mem/") || key.startsWith("rooms/") || key.startsWith("deploy/")) {
      skipped.push({ key, reason: "system" });
      continue;
    }
    if (/\/_project\.json$|\/index\.html$/.test(key)) {
      bump(key.split("/")[1] || "heymia");
      continue;
    }
    const name = cleanFileName(key);
    const slug = classifyProject(key, name);
    const dest = "projects/" + slug + "/" + name;
    bump(slug);
    if (dest === key) continue;
    try {
      const exists = await env.VAULT.head(dest);
      if (exists) {
        if (key.startsWith("vault/") || (key.startsWith("projects/") && key !== dest)) {
          try { await env.VAULT.delete(key); } catch {}
        }
        skipped.push({ key, dest, reason: "duplicate" });
        continue;
      }
      const obj = await env.VAULT.get(key);
      if (!obj) continue;
      await env.VAULT.put(dest, await obj.arrayBuffer(), {
        httpMetadata: obj.httpMetadata || { contentType: "application/octet-stream" },
        customMetadata: { project: slug, sourceKey: key },
      });
      if (key.startsWith("vault/") || key.startsWith("projects/")) {
        try { await env.VAULT.delete(key); } catch {}
      }
      moved.push({ from: key, to: dest, project: slug });
    } catch (e) {
      skipped.push({ key, dest, reason: String(e.message || e) });
    }
  }
  return {
    ok: true,
    moved: moved.length,
    skipped: skipped.length,
    files: moved,
    projects,
    products: await listProducts(env),
    message: "Filed into Sovereign Quant, LensFlow Dating, Missing Cash, Bartermint, Real Estate.",
  };
}
