const PAGES = ["studio", "work", "play", "landing", "admin"];

export function unwrapHtml(raw) {
  let s = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  if (!s) return s;
  if (/WebKitFormBoundary|Content-Disposition:\s*form-data/i.test(s)) {
    const doc = s.match(/<!DOCTYPE html[\s\S]*<\/html>/i) || s.match(/<html[\s\S]*<\/html>/i);
    if (doc) s = doc[0];
  }
  s = s.replace(/^\uFEFF/, "").trim();
  return s;
}

function htmlResponse(html, uiName, version) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-cache",
      "X-HeyMia-UI": uiName,
      "X-HeyMia-Version": String(version || ""),
    },
  });
}

export async function serveUI(env, r2Key, fallbackHtml, uiName, version) {
  const bundled = unwrapHtml(fallbackHtml);
  if (env.VAULT && r2Key) {
    try {
      const head = await env.VAULT.head(r2Key);
      const r2Ver = head && head.customMetadata && head.customMetadata.uiVersion;
      if (!head || (version && r2Ver !== String(version))) {
        await env.VAULT.put(r2Key, bundled, {
          httpMetadata: { contentType: "text/html;charset=UTF-8" },
          customMetadata: { uiVersion: String(version || ""), source: "git" },
        });
        const rec = {
          ok: true,
          action: "git_ui",
          name: "worker-" + (version || uiName),
          url: (env.PUBLIC_DOMAIN || "") + (uiName === "play" ? "/play" : "/work"),
          error: "",
          at: new Date().toISOString(),
          verified: true,
        };
        try {
          await env.VAULT.put("deploy/last.json", JSON.stringify(rec), {
            httpMetadata: { contentType: "application/json" },
          });
          if (env.MEMORY) await env.MEMORY.put("deploy:last", JSON.stringify(rec));
        } catch {}
      }
    } catch {}
  }
  return htmlResponse(bundled, uiName + "-git", version);
}

export async function handleUiAdmin(request, env, path) {
  if (path === "/ui/status" && request.method === "GET") {
    if (!env.VAULT) return { error: "VAULT not bound" };
    const status = {};
    for (const k of PAGES) {
      const head = await env.VAULT.head("ui/" + k + "-active.html");
      status[k] = { active: !!head, uploaded: head?.uploaded || null };
    }
    return {
      ...status,
      workActive: !!(status.work && status.work.active),
      workUploaded: status.work && status.work.uploaded,
      playActive: !!(status.play && status.play.active),
      playUploaded: status.play && status.play.uploaded,
      hint: "Git deploys the Worker UI automatically. Upload HTML via /files then POST /ui/activate { target, key } only for a custom override.",
    };
  }
  if (path === "/ui/activate" && request.method === "POST") {
    if (!env.VAULT) return { error: "VAULT not bound", status: 500 };
    const body = await request.json().catch(() => ({}));
    const target = (body.target || "work").toLowerCase();
    const key = body.key;
    if (!key) return { error: "key required", status: 400 };
    if (!PAGES.includes(target)) return { error: "invalid target", status: 400 };
    const obj = await env.VAULT.get(key);
    if (!obj) return { error: "source key not found in R2", status: 404 };
    const html = unwrapHtml(await obj.arrayBuffer());
    const activeKey = "ui/" + target + "-active.html";
    await env.VAULT.put(activeKey, html, {
      httpMetadata: { contentType: "text/html;charset=UTF-8" },
      customMetadata: { sourceKey: key, activatedAt: new Date().toISOString() },
    });
    return { ok: true, target, activeKey, sourceKey: key, message: "UI activated. Hard refresh." };
  }
  if (path === "/ui/reset" && request.method === "POST") {
    if (!env.VAULT) return { error: "VAULT not bound", status: 500 };
    const body = await request.json().catch(() => ({}));
    const target = (body.target || "work").toLowerCase();
    if (!PAGES.includes(target)) return { error: "invalid target", status: 400 };
    const activeKey = "ui/" + target + "-active.html";
    await env.VAULT.delete(activeKey);
    return { ok: true, reset: activeKey, message: "Reverted to embedded UI." };
  }
  if ((path === "/ui/repair" || path === "/api/repair-ui") && request.method === "POST") {
    if (!env.VAULT) return { error: "VAULT not bound", status: 500 };
    const body = await request.json().catch(() => ({}));
    const target = (body.target || "work").toLowerCase();
    const activeKey = "ui/" + target + "-active.html";
    const obj = await env.VAULT.get(activeKey);
    if (!obj) return { error: "no active UI for " + target, status: 404 };
    const before = await obj.arrayBuffer();
    const html = unwrapHtml(before);
    await env.VAULT.put(activeKey, html, { httpMetadata: { contentType: "text/html;charset=UTF-8" } });
    return { ok: true, target, activeKey, beforeBytes: before.byteLength, afterBytes: html.length, stripped: before.byteLength !== html.length };
  }
  return null;
}

export function matchHtmlPage(path) {
  if (path === "/" || path === "/studio" || path === "/jess" || path === "/5minsession" || path === "/index.html" || path === "/work") {
    return { r2Key: "ui/work-active.html", name: "work" };
  }
  if (path === "/play") return { r2Key: "ui/play-active.html", name: "play" };
  if (path === "/home" || path === "/landing") return { r2Key: "ui/landing-active.html", name: "landing" };
  if (path === "/admin") return { r2Key: "ui/admin-active.html", name: "admin" };
  return null;
}
