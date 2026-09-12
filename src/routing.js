// ═══════════════════════════════════════════════════════════════
// HEYMIA R2 PAGES ROUTING — Paste this into your index.js fetch handler
// ═══════════════════════════════════════════════════════════════
// Serves pages from R2 first, falling back to embedded HTML.

// ── Pages: R2-first with embedded fallback ──
if (wantHtml) {
  async function serveUI(r2Key, fallbackHtml, uiName) {
    if (env.VAULT) {
      try {
        const obj = await env.VAULT.get(r2Key);
        if (obj) {
          return new Response(obj.body, {
            headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-cache", "X-HeyMia-UI": uiName + "-r2" },
          });
        }
      } catch (e) {}
    }
    return new Response(fallbackHtml, {
      headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-cache", "X-HeyMia-UI": uiName },
    });
  }

  if (path === "/" || path === "/studio" || path === "/jess" || path === "/5minsession" || path === "/index.html") {
    return await serveUI("ui/studio-active.html", HTML_STUDIO, "studio");
  }
  if (path === "/work") return await serveUI("ui/work-active.html", HTML_WORK, "work");
  if (path === "/play") return await serveUI("ui/play-active.html", HTML_PLAY, "play");
  if (path === "/home" || path === "/landing") return await serveUI("ui/landing-active.html", HTML_LANDING, "landing");
  if (path === "/admin") return await serveUI("ui/admin-active.html", HTML_ADMIN, "admin");
}

// ── /ui/status — Check which pages are active in R2 ──
if (path === "/ui/status" && request.method === "GET") {
  if (!env.VAULT) return json({ error: "VAULT not bound" }, 500);
  const keys = ["studio", "work", "play", "landing", "admin"];
  const status = {};
  for (const k of keys) {
    const head = await env.VAULT.head("ui/" + k + "-active.html");
    status[k] = { active: !!head, uploaded: head?.uploaded || null };
  }
  return json({ ...status, hint: "Upload HTML via /files then POST /ui/activate { target: studio|work|play|landing|admin, key: vault/... }" });
}

// ── /ui/activate — Activate an uploaded R2 page ──
if (path === "/ui/activate" && request.method === "POST") {
  if (!env.VAULT) return json({ error: "VAULT not bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const target = (body.target || "work").toLowerCase();
  const key = body.key;
  if (!key) return json({ error: "key required (R2 object key of uploaded HTML)" }, 400);
  if (!["studio", "work", "play", "landing", "admin"].includes(target)) return json({ error: "target must be studio, work, play, landing or admin" }, 400);
  const obj = await env.VAULT.get(key);
  if (!obj) return json({ error: "source key not found in R2" }, 404);
  const activeKey = "ui/" + target + "-active.html";
  const buf = await obj.arrayBuffer();
  await env.VAULT.put(activeKey, buf, { httpMetadata: { contentType: "text/html;charset=UTF-8" }, customMetadata: { sourceKey: key, activatedAt: new Date().toISOString() } });
  return json({ ok: true, target, activeKey, sourceKey: key, message: "UI activated. Hard refresh the site." });
}

// ── /ui/reset — Revert a page to embedded fallback ──
if (path === "/ui/reset" && request.method === "POST") {
  if (!env.VAULT) return json({ error: "VAULT not bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const target = (body.target || "work").toLowerCase();
  if (!["studio", "work", "play", "landing", "admin"].includes(target)) return json({ error: "target must be studio, work, play, landing or admin" }, 400);
  const activeKey = "ui/" + target + "-active.html";
  await env.VAULT.delete(activeKey);
  return json({ ok: true, reset: activeKey, message: "Reverted to embedded UI in Worker." });
}
