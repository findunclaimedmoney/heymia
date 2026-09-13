import { PRODUCTS } from "./projects.js";

export const MARKETING_KINDS = [
  { id: "clips", name: "Clips", hint: "15–30s hooks" },
  { id: "videos", name: "Videos", hint: "Longer edits" },
  { id: "posts", name: "Posts", hint: "Feed stills 1:1" },
  { id: "stories", name: "Stories", hint: "9:16 Reels / TikTok" },
  { id: "ads", name: "Ads", hint: "Paid creative" },
  { id: "scripts", name: "Scripts", hint: "Voiceover + shot list" },
  { id: "captions", name: "Captions", hint: "SRT / on-screen text" },
];

export const CAPCUT_FREE = [
  { name: "CapCut editor", url: "https://www.capcut.com/editor", use: "Timeline, trim, text, music — free 1080p" },
  { name: "Templates", url: "https://www.capcut.com/explore", use: "Free trending templates" },
  { name: "Auto captions", url: "https://www.capcut.com/tools/auto-captions", use: "Burn captions (free)" },
  { name: "Text to speech", url: "https://www.capcut.com/tools/text-to-speech", use: "Voiceover from script" },
  { name: "Background remover", url: "https://www.capcut.com/tools/background-remover", use: "Cut out subject" },
  { name: "Auto cut", url: "https://www.capcut.com/tools/auto-cut", use: "Jump cuts from silence" },
  { name: "AI writer", url: "https://www.capcut.com/tools/ai-writer", use: "Hook / CTA copy" },
  { name: "Text to video", url: "https://www.capcut.com/tools/text-to-video", use: "Script → clip" },
  { name: "Image to video", url: "https://www.capcut.com/tools/image-to-video", use: "Still → motion" },
  { name: "Script to video", url: "https://www.capcut.com/tools/script-to-video", use: "Shot assembly" },
  { name: "Noise reduction", url: "https://www.capcut.com/tools/noise-reduction", use: "Clean audio" },
  { name: "Video enhancer", url: "https://www.capcut.com/tools/video-enhancer", use: "Sharpen / upscale 1080p" },
];

function readme(kind, product) {
  return "# " + product.name + " / " + kind.name + "\n\n" + kind.hint + "\nDrop finished " + kind.id + " here.\nCapCut free export: 1080p, no Pro assets.\n";
}

export async function seedMarketing(env) {
  if (!env.VAULT) return { ok: false, error: "VAULT unbound" };
  const created = [];
  for (const p of PRODUCTS) {
    for (const k of MARKETING_KINDS) {
      const key = "projects/" + p.slug + "/marketing/" + k.id + "/README.md";
      const exists = await env.VAULT.head(key);
      if (!exists) {
        await env.VAULT.put(key, readme(k, p), { httpMetadata: { contentType: "text/markdown;charset=UTF-8" } });
        created.push(key);
      }
    }
  }
  return { ok: true, created: created.length, folders: PRODUCTS.length * MARKETING_KINDS.length };
}

export async function listMarketing(env, project) {
  if (!env.VAULT) return { ok: false, files: [] };
  const prefix = project ? "projects/" + project + "/marketing/" : "projects/";
  const listed = await env.VAULT.list({ prefix, limit: 1000 });
  const files = (listed.objects || [])
    .filter((o) => o.key.includes("/marketing/"))
    .map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded }));
  const by = {};
  for (const f of files) {
    const parts = f.key.split("/");
    const slug = parts[1] || "heymia";
    const kind = parts[3] || "clips";
    by[slug] = by[slug] || {};
    by[slug][kind] = (by[slug][kind] || 0) + 1;
  }
  return { ok: true, files, by };
}

export async function saveMarketing(env, { project, kind, name, content, type }) {
  if (!env.VAULT) return { ok: false, error: "VAULT unbound" };
  const p = PRODUCTS.find((x) => x.slug === project) || PRODUCTS[0];
  const k = MARKETING_KINDS.find((x) => x.id === kind) || MARKETING_KINDS[0];
  const safe = String(name || "asset-" + Date.now()).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80);
  const key = "projects/" + p.slug + "/marketing/" + k.id + "/" + safe;
  let body = content || "";
  if (typeof body === "string" && body.startsWith("data:")) {
    const b64 = body.split(",")[1] || "";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    body = arr;
  }
  await env.VAULT.put(key, body, { httpMetadata: { contentType: type || "text/plain;charset=UTF-8" } });
  return { ok: true, key, project: p.slug, kind: k.id, url: "/files?key=" + encodeURIComponent(key) };
}
