function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "clip";
}
function esc(s) {
  const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&#39;" };
  return String(s || "").replace(/[&<>"']/g, (c) => map[c]);
}
function vaultBound(env) {
  return !!(env && env.VAULT && typeof env.VAULT.put === "function");
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-File-Name, X-Filename, X-Title",
  };
}
function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...cors(), "Content-Type": "application/json; charset=utf-8" } });
}

export const CLIPS_PREFIX = "clips/";

export function clipHtml({ title, caption, src } = {}) {
  const name = String(title || "Clip").slice(0, 80);
  const line = String(caption || "A clip wrapped as a page — play, share, embed.").slice(0, 400);
  const video = src || "video.mp4";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}</title>
<meta name="description" content="${esc(line)}">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description: line,
    contentUrl: video,
    encodingFormat: "video/mp4",
  })}</script>
<link rel="alternate" type="text/plain" href="llms.txt" title="llms.txt">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Outfit:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--ink:#0b0a09;--bone:#efe6d4;--mute:#b9a989;--gold:#c4a574}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--ink);color:var(--bone);font-family:Outfit,system-ui,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 64px}
.kicker{letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:var(--gold)}
h1{font-family:"Cormorant Garamond",serif;font-size:clamp(32px,6vw,64px);font-weight:500;margin:8px 0 12px;letter-spacing:-.03em}
.cap{color:var(--mute);max-width:560px;line-height:1.5}
.stage{margin:28px 0;border-radius:22px;overflow:hidden;background:#000;border:1px solid rgba(239,230,212,.12)}
video{display:block;width:100%;max-height:78vh;background:#000}
.code{margin-top:28px;background:#12100c;border:1px solid rgba(239,230,212,.12);border-radius:16px;padding:16px;overflow:auto}
.code p{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
pre{margin:0;white-space:pre-wrap;font-size:12px;color:var(--mute)}
a{color:var(--gold)}
</style>
</head>
<body>
<div class="wrap">
  <div class="kicker">HeyMia clip · MP4 as HTML</div>
  <h1>${esc(name)}</h1>
  <p class="cap">${esc(line)}</p>
  <div class="stage">
    <video src="${esc(video)}" controls playsinline preload="metadata"></video>
  </div>
  <div class="code">
    <p>Embed</p>
    <pre><video src="${esc(video)}" controls playsinline></video></pre>
  </div>
</div>
</body></html>`;
}

export async function convertMp4(env, { key, name, title, caption } = {}) {
  if (!vaultBound(env)) return { error: "VAULT unbound" };
  const srcKey = String(key || "").replace(/^\/+/, "");
  if (!srcKey) return { error: "Need the vault key of the MP4" };
  const obj = await env.VAULT.get(srcKey);
  if (!obj) {
    const alt = await env.VAULT.get("files/" + srcKey);
    if (!alt) return { error: "MP4 not found: " + srcKey };
    return convertMp4(env, { key: "files/" + srcKey, name, title, caption });
  }
  const fileName = name || srcKey.split("/").pop() || "clip.mp4";
  const slug = slugify(title || fileName.replace(/\.mp4$/i, ""));
  const html = clipHtml({ title: title || fileName, caption, src: "video.mp4" });
  const buf = await obj.arrayBuffer();
  const type = obj.httpMetadata?.contentType || "video/mp4";
  await env.VAULT.put("sites/" + slug + "/video.mp4", buf, { httpMetadata: { contentType: type } });
  await env.VAULT.put("sites/" + slug + "/index.html", html, { httpMetadata: { contentType: "text/html;charset=UTF-8" } });
  const llms = "# " + (title || slug) + "\n\n> " + (caption || "Video clip published as an HTML page.") + "\n";
  await env.VAULT.put("sites/" + slug + "/llms.txt", llms, { httpMetadata: { contentType: "text/plain;charset=UTF-8" } });
  await saveClip(env, { name: fileName, body: buf, type, title: title || fileName });
  const url = (env.PUBLIC_DOMAIN || "") + "/s/" + slug + "/";
  return {
    ok: true,
    slug,
    url,
    html,
    video: url + "video.mp4",
    clip: CLIPS_PREFIX + slugify(fileName.replace(/\.mp4$/i, "")) + ".mp4",
    message: "Clip is a page at " + url,
  };
}

export async function seedClipsFolder(env) {
  if (!vaultBound(env)) return { ok: false, error: "VAULT unbound" };
  const note =
    "HeyMia Clips\nDrop MP4 / MOV / WEBM here. Download one or the whole folder as a zip from the Clips tab.\n";
  const meta = JSON.stringify({
    folder: "clips",
    created: new Date().toISOString(),
    purpose: "Store and download Mia-made video clips",
  });
  await env.VAULT.put("clips/_folder.json", meta, { httpMetadata: { contentType: "application/json" } });
  await env.VAULT.put("files/clips/_folder.json", meta, { httpMetadata: { contentType: "application/json" } });
  await env.VAULT.put("clips/README.txt", note, { httpMetadata: { contentType: "text/plain;charset=UTF-8" } });
  await env.VAULT.put(
    "clips/ash-and-altar.txt",
    "Ash and Altar — 15s myth.\nA mother births a dragon and dies shielding her from a priest who names her witch.\nThe dragon returns, does not burn the square, and lays the mother's pendant on the altar.\nUpload ash-and-altar.mp4 into this folder to keep the picture with the story.\n",
    { httpMetadata: { contentType: "text/plain;charset=UTF-8" } }
  );
  return { ok: true, folder: "clips/" };
}

export async function listClips(env) {
  if (!vaultBound(env)) return { ok: false, clips: [], error: "VAULT unbound" };
  const seen = new Set();
  const clips = [];
  for (const prefix of ["clips/", "files/clips/"]) {
    const listed = await env.VAULT.list({ prefix, limit: 200 });
    for (const o of listed.objects || []) {
      if (seen.has(o.key)) continue;
      seen.add(o.key);
      const name = o.key.split("/").pop();
      if (!name || name.startsWith("_")) continue;
      clips.push({
        key: o.key,
        name,
        size: o.size || 0,
        uploaded: o.uploaded || null,
        video: /\.(mp4|mov|webm|m4v)$/i.test(name),
        url: "/files?key=" + encodeURIComponent(o.key),
        download: "/files?key=" + encodeURIComponent(o.key) + "&download=1",
      });
    }
  }
  clips.sort((a, b) => String(b.uploaded || "").localeCompare(String(a.uploaded || "")));
  return { ok: true, folder: "clips/", clips };
}

export async function saveClip(env, { name, body, type, title } = {}) {
  if (!vaultBound(env)) return { error: "VAULT unbound" };
  const file = String(name || title || "clip.mp4").replace(/^\/+/, "").split("/").pop();
  const base = slugify(file.replace(/\.[^.]+$/, ""));
  const ext = (file.match(/\.([a-z0-9]+)$/i) || [, "mp4"])[1].toLowerCase();
  const key = CLIPS_PREFIX + base + "." + ext;
  await env.VAULT.put(key, body, { httpMetadata: { contentType: type || "video/mp4" } });
  await env.VAULT.put("files/" + key, body, { httpMetadata: { contentType: type || "video/mp4" } });
  return { ok: true, key, name: base + "." + ext, size: body.byteLength || body.length || 0, download: "/files?key=" + encodeURIComponent(key) + "&download=1" };
}

export async function handleClips(request, env, path) {
  if (path !== "/api/clips" && path !== "/api/clips/") return null;
  if (request.method === "GET") {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (key && url.searchParams.get("download")) {
      const obj = await env.VAULT.get(key);
      if (!obj) return json({ error: "not found", key }, 404);
      const name = key.split("/").pop() || "clip.bin";
      return new Response(obj.body, {
        headers: {
          ...cors(),
          "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
          "Content-Disposition": 'attachment; filename="' + name.replace(/"/g, "") + '"',
        },
      });
    }
    return json(await listClips(env));
  }
  if (request.method === "POST") {
    const name = request.headers.get("X-File-Name") || request.headers.get("X-Filename") || "clip.mp4";
    const type = request.headers.get("Content-Type") || "video/mp4";
    const title = request.headers.get("X-Title") || "";
    const body = await request.arrayBuffer();
    if (!body.byteLength) return json({ error: "empty file" }, 400);
    return json(await saveClip(env, { name, body, type, title }));
  }
  return null;
}
