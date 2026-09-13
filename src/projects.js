export function cleanFileName(key) {
  return String(key || "")
    .split("/")
    .pop()
    .replace(/^\d{10,}-/, "")
    .replace(/^upload-\d{10,}$/, "work-active.html") || "file";
}

export function classifyProject(key, name) {
  const s = String(key || "") + " " + String(name || "");
  const lower = s.toLowerCase();
  const m = String(key || "").match(/^projects\/([^/]+)/);
  if (m) return m[1];
  if (/ui\/play|play-(fix|add)/i.test(lower)) return "heymia-play";
  if (/ui\/work|work-(fix|add|support)|heymia-memory|heymia-upload|upload-\d{10,}/i.test(lower)) return "heymia-work";
  if (/convex/i.test(lower)) return "convex";
  if (/sovereign|quant/i.test(lower)) return "sovereign-quant";
  if (/mitosis|agent-core|agentcore|daemon|master system/i.test(lower)) return "agent-core";
  if (/companion|liveindicator|convex-rooms|usecompanion|useautonomous/i.test(lower)) return "liveavatar";
  if (/glimr/i.test(lower)) return "glimr";
  if (/lensflow|screenshot/i.test(lower)) return "lensflow";
  return "inbox";
}

export async function organizeVault(env) {
  if (!env.VAULT) return { ok: false, error: "VAULT unbound" };
  const listed = await env.VAULT.list({ prefix: "", limit: 1000 });
  const moved = [];
  const skipped = [];
  const projects = {};
  const bump = (slug) => {
    projects[slug] = (projects[slug] || 0) + 1;
  };
  for (const o of listed.objects || []) {
    const key = o.key;
    if (key.startsWith("projects/")) {
      bump(key.split("/")[1] || "inbox");
      continue;
    }
    if (key.startsWith("ui/")) {
      bump(key.includes("play") ? "heymia-play" : "heymia-work");
      skipped.push({ key, reason: "live-ui" });
      continue;
    }
    if (key.startsWith("sites/") || key.startsWith("mem/") || key.startsWith("rooms/") || key.startsWith("deploy/")) {
      skipped.push({ key, reason: "system" });
      continue;
    }
    const name = cleanFileName(key);
    const slug = classifyProject(key, name);
    const dest = "projects/" + slug + "/" + name;
    bump(slug);
    if (dest === key) continue;
    const exists = await env.VAULT.head(dest);
    if (exists) {
      await env.VAULT.delete(key);
      skipped.push({ key, dest, reason: "duplicate" });
      continue;
    }
    const obj = await env.VAULT.get(key);
    if (!obj) continue;
    await env.VAULT.put(dest, await obj.arrayBuffer(), {
      httpMetadata: obj.httpMetadata || { contentType: "application/octet-stream" },
      customMetadata: { project: slug, sourceKey: key },
    });
    await env.VAULT.delete(key);
    moved.push({ from: key, to: dest, project: slug });
  }
  return {
    ok: true,
    moved: moved.length,
    skipped: skipped.length,
    files: moved,
    projects,
    message: "Filed " + moved.length + " file(s) into project folders. Live UI left in ui/.",
  };
}
