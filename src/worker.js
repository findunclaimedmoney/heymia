import workHtml from "./ui/work.html.js";
import { handleAgentChat, routeFile, grokTroubleshoot } from "./ai.js";
import { handleUiAdmin, matchHtmlPage, serveUI, unwrapHtml } from "./routing.js";
import { listSites, mimeOf, publishSite, servePublishedSite, vaultBound, designSiteHtml } from "./sites.js";
import { classifyProject, organizeVault, listProducts, seedProducts } from "./projects.js";
import { seedMarketing, listMarketing, saveMarketing, CAPCUT_FREE, MARKETING_KINDS, SOCIAL, saveSocial, readSocial, shareUrl } from "./marketing.js";

const VERSION = "3.7.0";
const AVATAR_ID = "3559b3f9-29e3-48eb-a4ff-7a7dc5b47ca9";
const AVATAR_URL = "https://embed.liveavatar.com/v1/" + AVATAR_ID;
const WS_URL = "wss://embed.liveavatar.com/v1/" + AVATAR_ID + "/ws";

const corsH = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-File-Name, X-Filename, X-Category, X-Site, X-Path",
  "Access-Control-Max-Age": "86400",
};

function jsonR(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsH, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

const jobs = new Map();
const sessions = new Map();

async function saveMem(e, a, c, k, v) {
  const rec = { value: v, t: Date.now(), agent: a, category: c, key: k };
  const body = JSON.stringify(rec);
  if (e.MEMORY) await e.MEMORY.put("mem:" + a + ":" + c + ":" + k, body);
  if (vaultBound(e)) {
    await e.VAULT.put("mem/" + a + "/" + c + "/" + k + ".json", body, {
      httpMetadata: { contentType: "application/json" },
    });
  }
}
async function recallMem(e, a, c, k) {
  c = c || "general";
  a = a || "Mia";
  if (k) {
    if (e.MEMORY) {
      const raw = await e.MEMORY.get("mem:" + a + ":" + c + ":" + k);
      if (raw) return { ok: true, memories: [JSON.parse(raw)] };
    }
    if (vaultBound(e)) {
      const obj = await e.VAULT.get("mem/" + a + "/" + c + "/" + k + ".json");
      if (obj) return { ok: true, memories: [JSON.parse(await obj.text())] };
    }
    return { ok: false, memories: [], error: "not found" };
  }
  const out = [];
  if (e.MEMORY) {
    const listed = await e.MEMORY.list({ prefix: "mem:" + a + ":" + c + ":", limit: 40 });
    for (const item of listed.keys || []) {
      const raw = await e.MEMORY.get(item.name);
      if (raw) out.push(JSON.parse(raw));
    }
  } else if (vaultBound(e)) {
    const listed = await e.VAULT.list({ prefix: "mem/" + a + "/" + c + "/", limit: 40 });
    for (const o of listed.objects || []) {
      const obj = await e.VAULT.get(o.key);
      if (obj) out.push(JSON.parse(await obj.text()));
    }
  }
  return { ok: true, memories: out };
}
async function listKvFiles(e, c) {
  if (!e.MEMORY) return [];
  const l = await e.MEMORY.list({ prefix: "file:" });
  const f = [];
  for (const k of l.keys) {
    const v = await e.MEMORY.get(k.name);
    if (!v) continue;
    const d = JSON.parse(v);
    if (!c || d.category === c) f.push({ id: d.id, name: d.name, type: d.type, category: d.category, created_at: d.created_at });
  }
  return f;
}
async function listR2Files(env, prefix = "") {
  if (!vaultBound(env)) return [];
  const listed = await env.VAULT.list({ prefix, limit: 1000 });
  return (listed.objects || []).map((o) => ({
    key: o.key,
    name: o.key.replace(/^files\//, ""),
    size: o.size,
    uploaded: o.uploaded,
    category: o.key.startsWith("ui/") ? "ui" : o.key.startsWith("sites/") ? "sites" : o.key.startsWith("projects/") ? "project" : "vault",
    project: classifyProject(o.key, o.key.split("/").pop()),
  }));
}

const LAST_DEPLOY_KEY = "deploy/last.json";

async function readLastDeploy(env) {
  try {
    if (vaultBound(env)) {
      const obj = await env.VAULT.get(LAST_DEPLOY_KEY);
      if (obj) return JSON.parse(await obj.text());
    }
    if (env.MEMORY) {
      const v = await env.MEMORY.get("deploy:last");
      if (v) return JSON.parse(v);
    }
  } catch {}
  return null;
}

async function writeLastDeploy(env, rec) {
  const body = JSON.stringify(rec);
  if (vaultBound(env)) {
    await env.VAULT.put(LAST_DEPLOY_KEY, body, { httpMetadata: { contentType: "application/json" } });
  }
  if (env.MEMORY) await env.MEMORY.put("deploy:last", body);
}

async function resolveVaultKey(env, key) {
  if (!key) return null;
  const raw = String(key).replace(/^\//, "");
  const tries = [raw];
  if (!raw.startsWith("files/") && !raw.startsWith("ui/") && !raw.startsWith("vault/")) {
    tries.push("files/" + raw, "vault/" + raw, "ui/" + raw);
  }
  for (const k of tries) {
    const obj = await env.VAULT.get(k);
    if (obj) return { key: k, obj };
  }
  return null;
}

async function runDeploy(env, body) {
  const started = new Date().toISOString();
  const action = body.action || "log";
  const rec = {
    ok: false,
    action,
    name: body.name || body.slug || body.key || "",
    url: body.url || "",
    error: body.error || "",
    at: started,
    verified: false,
  };
  try {
    if (action === "log") {
      rec.ok = body.ok !== false && !body.error;
      rec.at = body.at || started;
      await writeLastDeploy(env, rec);
      return rec;
    }
    if (action === "publish_site" || action === "site") {
      if (!vaultBound(env)) throw new Error("VAULT unbound — cannot publish");
      const pub = await publishSite(env, body);
      rec.ok = true;
      rec.url = pub.url;
      rec.name = pub.slug;
    } else if (action === "activate_ui" || action === "ui") {
      if (!vaultBound(env)) throw new Error("VAULT unbound — cannot activate UI");
      const target = String(body.target || "work").toLowerCase();
      if (!["work", "play", "landing", "admin", "studio"].includes(target)) throw new Error("invalid target");
      const found = await resolveVaultKey(env, body.key);
      if (!found) throw new Error("source key not found in R2: " + (body.key || "(empty)"));
      const activeKey = "ui/" + target + "-active.html";
      await env.VAULT.put(activeKey, await found.obj.arrayBuffer(), {
        httpMetadata: { contentType: "text/html;charset=UTF-8" },
        customMetadata: { sourceKey: found.key, activatedAt: started },
      });
      const domain = env.PUBLIC_DOMAIN || "";
      rec.ok = true;
      rec.name = found.key;
      rec.url = domain + (target === "play" ? "/play" : target === "work" ? "/work" : "/" + target);
    } else {
      throw new Error("unknown deploy action: " + action);
    }
    rec.at = new Date().toISOString();
    rec.error = "";
  } catch (e) {
    rec.ok = false;
    rec.error = String(e.message || e);
    rec.at = new Date().toISOString();
  }
  await writeLastDeploy(env, rec);
  return rec;
}

async function statusPayload(env) {
  let vault = "missing";
  if (vaultBound(env)) {
    vault = "bound";
    try {
      await env.VAULT.list({ prefix: "", limit: 1 });
    } catch (e) {
      vault = "error:" + (e.message || e);
    }
  }
  return {
    ok: vault === "bound",
    status: "ok",
    service: "heymia",
    version: VERSION,
    ai_model: (env.XAI_API_KEY || env.GROK_API_KEY) ? "grok-4.5" : (env.GEMINI_MODEL || "gemini-3.8-flash"),
    vault,
    last_deploy: await readLastDeploy(env),
    ai: env.AI ? "bound" : "missing",
    gemini: env.GEMINI_API_KEY || env.GEMINI ? "set" : "unset",
    grok: env.XAI_API_KEY || env.GROK_API_KEY ? "set" : "unset",
    liveavatar: env.LIVEAVATAR_API_KEY || env.LIVEAVATAR ? "set" : "unset",
    stripe: env.STRIPE_SECRET_KEY || env.STRIPE ? "set" : "unset",
    domain: env.PUBLIC_DOMAIN || null,
    avatar_id: AVATAR_ID,
    secrets_configured: {
      liveavatar: !!(env.LIVEAVATAR_API_KEY || env.LIVEAVATAR),
      grok: !!(env.XAI_API_KEY || env.GROK_API_KEY),
      stripe: !!(env.STRIPE_SECRET_KEY || env.STRIPE),
      ai: !!(env.GEMINI_API_KEY || env.GEMINI),
      workers_ai: !!env.AI,
    },
  };
}

async function putVaultFile(env, name, body, type, category) {
  const safe = String(name || "upload.bin").replace(/^\/+/, "").replace(/\.\./g, "");
  let payload = body;
  if (/\.html?$/i.test(safe) || (type && String(type).includes("html"))) {
    payload = unwrapHtml(body);
  }
  if (vaultBound(env)) {
    const key = "files/" + safe;
    await env.VAULT.put(key, payload, { httpMetadata: { contentType: type || mimeOf(safe) } });
    return { ok: true, key, name: safe, size: payload.byteLength || payload.length || 0, category: category || "vault" };
  }
  if (env.MEMORY) {
    const id = crypto.randomUUID();
    const content = typeof body === "string" ? body : new TextDecoder().decode(body);
    await env.MEMORY.put("file:" + id, JSON.stringify({ id, name: safe, type, category, content, created_at: new Date().toISOString() }));
    return { ok: true, id, name: safe, status: "saved-kv" };
  }
  return { error: "VAULT and MEMORY unbound", status: 503 };
}

async function handleCheckout(e, body) {
  const stripeKey = e.STRIPE_SECRET_KEY || e.STRIPE;
  if (!stripeKey) return { error: "Stripe not configured" };
  const origin = e.PUBLIC_DOMAIN || "https://heymia.lensflow.au";
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Bearer " + stripeKey },
    body: new URLSearchParams({
      mode: "payment",
      "line_items[0][price]": body.price_id || "price_1Tx8hkEHzw6rVQI2QnfDm6Kl",
      "line_items[0][quantity]": "1",
      success_url: body.success_url || origin + "/credits?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: body.cancel_url || origin + "/credits?payment=cancelled",
    }).toString(),
  });
  const data = await res.json();
  if (data.url) return { checkout_url: data.url, session_id: data.id };
  return { error: data.error?.message || "Checkout failed" };
}

function createJob(t, d) {
  const id = crypto.randomUUID();
  const j = { id, type: t, data: d, status: "queued", created_at: new Date().toISOString() };
  jobs.set(id, j);
  return j;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsH });

    try {
      if (path === "/health" || path === "/api/status" || (path === "/" && url.searchParams.get("format") === "json")) {
        return jsonR(await statusPayload(env));
      }
      if (path === "/config" && method === "GET") return jsonR({ avatar_url: AVATAR_URL, ws_url: WS_URL, avatar_id: AVATAR_ID, version: VERSION, model: env.GEMINI_MODEL || "gemini-3.8-flash" });
      if (path === "/env-check" && method === "GET") return jsonR(await statusPayload(env));

      const uiAdmin = await handleUiAdmin(request, env, path);
      if (uiAdmin) return jsonR(uiAdmin, uiAdmin.status || 200);

      if (path === "/route" && method === "POST") {
        const body = await request.json();
        return jsonR(routeFile(body.fileName, body.fileType, body.category));
      }

      if ((path === "/chat" || path === "/api/chat") && method === "POST") {
        const body = await request.json();
        const helpers = {
          listFiles: async () => {
            const r2 = await listR2Files(env);
            const kv = await listKvFiles(env);
            return r2.concat(kv);
          },
          runTool: async (name, args) => {
            args = args || {};
            if (name === "worker_status") return statusPayload(env);
            if (name === "list_vault") return { files: await listR2Files(env, args.prefix || "") };
            if (name === "organize_vault") return organizeVault(env);
            if (name === "seed_marketing") return seedMarketing(env);
            if (name === "list_marketing") return listMarketing(env, args.project);
            if (name === "save_marketing") return saveMarketing(env, args);
            if (name === "save_social") return saveSocial(env, args.project, args.links);
            if (name === "publish_site") {
              if (!vaultBound(env)) return { error: "VAULT unbound" };
              return publishSite(env, args);
            }
            if (name === "design_site") {
              if (!vaultBound(env)) return { error: "VAULT unbound" };
              const html = args.html || designSiteHtml(args);
              const rec = await publishSite(env, { ...args, html });
              rec.designed = !args.html;
              return rec;
            }
            if (name === "list_sites") {
              if (!vaultBound(env)) return { error: "VAULT unbound", sites: [] };
              return { ok: true, sites: await listSites(env) };
            }
            if (name === "route_file") return routeFile(args.fileName, args.fileType, args.category);
            if (name === "last_deploy" || name === "deploy_status") {
              const last = (await readLastDeploy(env)) || { ok: false, error: "no deploys yet" };
              if (name === "last_deploy") return last;
              return { last, worker: await statusPayload(env) };
            }
            if (name === "create_file") {
              return putVaultFile(env, args.name, args.content || "", args.type || "text/plain", args.category || "vault");
            }
            if (name === "read_file") {
              if (!vaultBound(env)) return { error: "VAULT unbound" };
              const found = await resolveVaultKey(env, args.key || args.name);
              if (!found) return { error: "not found", key: args.key || args.name };
              const text = await found.obj.text();
              return { ok: true, key: found.key, bytes: text.length, content: text.slice(0, 8000) };
            }
            if (name === "save_memory") {
              await saveMem(env, "Mia", args.category || "training", args.key, String(args.value || "").slice(0, 2000));
              return { ok: true, key: args.key, category: args.category || "training" };
            }
            if (name === "recall_memory") {
              return recallMem(env, "Mia", args.category || "training", args.key);
            }
            if (name === "create_site") {
              if (!vaultBound(env)) return { error: "VAULT unbound" };
              const html = args.html || designSiteHtml({ ...args, brief: args.brief || args.tagline || args.name });
              const rec = await publishSite(env, { ...args, html });
              rec.designed = !args.html;
              return rec;
            }
            if (name === "create_room") {
              if (!vaultBound(env)) return { error: "VAULT unbound" };
              const rec = { id: "room-" + crypto.randomUUID().slice(0, 8), name: args.name, theme: args.theme || "", prompt: args.prompt || "", created: new Date().toISOString() };
              await env.VAULT.put("rooms/" + rec.id + ".json", JSON.stringify(rec), { httpMetadata: { contentType: "application/json" } });
              return rec;
            }
            return { error: "unknown tool " + name };
          },
        };
        const result = await handleAgentChat(env, body, helpers);
        if (env.MEMORY && body.messages?.length) {
          await saveMem(env, body.agent || "Mia", body.mode || "work", "last", String(body.messages.at(-1).content || "").slice(0, 200));
        }
        return jsonR(result);
      }

      if (path === "/files" || path === "/api/vault") {
        if (method === "GET") {
          const key = url.searchParams.get("key");
          if (key && vaultBound(env)) {
            const found = await resolveVaultKey(env, key);
            if (!found) return jsonR({ error: "not found" }, 404);
            return new Response(found.obj.body, { headers: { ...corsH, "Content-Type": found.obj.httpMetadata?.contentType || mimeOf(found.key) } });
          }
          const cat = url.searchParams.get("category");
          const files = vaultBound(env) ? await listR2Files(env) : await listKvFiles(env, cat);
          return jsonR({ ok: true, files, objects: files });
        }
        if (method === "POST") {
          const name = request.headers.get("X-File-Name") || request.headers.get("X-Filename");
          const category = request.headers.get("X-Category") || "vault";
          const type = request.headers.get("Content-Type") || "application/octet-stream";
          if (name) {
            const body = await request.arrayBuffer();
            const saved = await putVaultFile(env, name, body, type, category);
            return jsonR(saved, saved.status || 200);
          }
          const body = await request.json().catch(() => ({}));
          const saved = await putVaultFile(env, body.name, body.content || "", body.type, body.category);
          return jsonR(saved, saved.status || 200);
        }
        if (method === "DELETE") {
          const key = url.searchParams.get("key");
          if (!key || !vaultBound(env)) return jsonR({ error: "key required" }, 400);
          await env.VAULT.delete(key.startsWith("files/") ? key : "files/" + key);
          return jsonR({ ok: true, deleted: key });
        }
      }

      if (path === "/api/deploy" || path === "/deploy-status") {
        if (method === "GET") {
          return jsonR({ ok: true, last: await readLastDeploy(env), worker: await statusPayload(env) });
        }
        if (method === "POST") {
          const rec = await runDeploy(env, await request.json());
          return jsonR(rec, rec.ok ? 200 : 400);
        }
      }

      if (path === "/api/organize" && method === "POST") {
        if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
        return jsonR(await organizeVault(env));
      }
      if (path === "/api/organize" && method === "GET") {
        const files = vaultBound(env) ? await listR2Files(env) : [];
        const plan = {};
        for (const f of files) {
          const p = f.project || "heymia";
          plan[p] = plan[p] || [];
          plan[p].push(f.key);
        }
        return jsonR({ ok: true, plan, files: files.length });
      }
      if (path === "/api/products" && method === "GET") {
        if (!vaultBound(env)) return jsonR({ ok: true, products: [] });
        return jsonR({ ok: true, products: await listProducts(env) });
      }
      if (path === "/api/products" && method === "POST") {
        if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
        const seeded = await seedProducts(env);
        const mkt = await seedMarketing(env);
        const org = await organizeVault(env);
        return jsonR({ ok: true, ...seeded, marketing: mkt, organize: org });
      }
      if (path === "/api/marketing" && method === "GET") {
        if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
        const project = url.searchParams.get("project") || "";
        return jsonR({ ...(await listMarketing(env, project)), capcut: CAPCUT_FREE, kinds: MARKETING_KINDS, social: SOCIAL, links: project ? await readSocial(env, project) : {} });
      }
      if (path === "/api/marketing" && method === "POST") {
        if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
        const body = await request.json().catch(() => ({}));
        if (body.action === "seed" || !body.name && !body.links && body.action !== "social") {
          const mkt = await seedMarketing(env);
          return jsonR(mkt);
        }
        if (body.action === "social" || body.links) {
          return jsonR(await saveSocial(env, body.project, body.links));
        }
        return jsonR(await saveMarketing(env, body));
      }
      if (path === "/api/social" && method === "GET") {
        if (!vaultBound(env)) return jsonR({ links: {} });
        const project = url.searchParams.get("project") || "";
        return jsonR({ ok: true, project, networks: SOCIAL, links: await readSocial(env, project), share: SOCIAL.map((s) => ({ ...s, share: shareUrl(s.id, url.searchParams.get("page") || "", url.searchParams.get("text") || "") })) });
      }

      if (path === "/api/grok" && method === "GET") {
        return jsonR({ ok: true, grok: !!(env.XAI_API_KEY || env.GROK_API_KEY), model: "grok-4.5" });
      }
      if (path === "/api/grok" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const status = await statusPayload(env);
        const g = await grokTroubleshoot(env, {
          question: body.question || body.message || "",
          context: JSON.stringify({ status, last_deploy: status.last_deploy, extra: body.context || "" }).slice(0, 2500),
        });
        return jsonR({ reply: g.text || g.error, response: g.text || g.error, ...g });
      }

      if (path === "/api/design" && method === "POST") {
        const body = await request.json();
        const html = body.html || designSiteHtml(body);
        if (!vaultBound(env)) return jsonR({ ok: true, html, preview: true, slug: (body.name || "site").toLowerCase() });
        const rec = await publishSite(env, { ...body, html });
        rec.html = html;
        rec.ok = true;
        await writeLastDeploy(env, { ok: true, action: "design_site", name: rec.slug, url: rec.url, at: new Date().toISOString() });
        return jsonR(rec);
      }

      if (path.startsWith("/api/sites")) {
        if (!vaultBound(env)) return jsonR({ error: "VAULT missing. Cannot publish sites." }, 503);
        if (path === "/api/sites" && method === "GET") return jsonR({ ok: true, sites: await listSites(env) });
        if (path === "/api/sites" && method === "POST") {
          const body = await request.json();
          return jsonR(await publishSite(env, body));
        }
        const one = path.match(/^\/api\/sites\/([^/]+)$/);
        if (one && method === "DELETE") {
          const slug = one[1];
          const listed = await env.VAULT.list({ prefix: "sites/" + slug + "/", limit: 1000 });
          for (const o of listed.objects || []) await env.VAULT.delete(o.key);
          return jsonR({ ok: true, deleted: slug });
        }
      }

      if (path.startsWith("/s/") && method === "GET") {
        if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
        return servePublishedSite(env, path);
      }

      if (path === "/session" && method === "GET") {
        const sessionId = crypto.randomUUID();
        const token = crypto.randomUUID();
        const companion = url.searchParams.get("companion") || "jess";
        sessions.set(sessionId, { id: sessionId, token, companion, status: "created", created_at: new Date().toISOString() });
        return jsonR({ session_id: sessionId, token, companion, avatar_url: AVATAR_URL, ws_url: WS_URL });
      }
      if (path === "/start" && method === "POST") {
        const body = await request.json();
        const s = sessions.get(body.session_id);
        if (!s) return jsonR({ error: "Session not found" }, 404);
        s.status = "active";
        return jsonR({ status: "started", session_id: s.id, avatar_url: AVATAR_URL });
      }
      if (path === "/stop" && method === "POST") {
        const body = await request.json();
        const s = sessions.get(body.session_id);
        if (!s) return jsonR({ error: "Session not found" }, 404);
        s.status = "stopped";
        return jsonR({ status: "stopped", session_id: s.id });
      }
      if (path === "/jobs" && method === "GET") return jsonR({ jobs: Array.from(jobs.values()) });
      if (path === "/jobs" && method === "POST") {
        const body = await request.json();
        return jsonR(createJob(body.type, body.data));
      }
      if ((path === "/checkout" || path === "/api/checkout") && method === "POST") return jsonR(await handleCheckout(env, await request.json()));
      if (path === "/verify-payment" && method === "POST") {
        const stripeKey = env.STRIPE_SECRET_KEY || env.STRIPE;
        if (!stripeKey) return jsonR({ error: "Stripe not configured" }, 503);
        const body = await request.json();
        const res = await fetch("https://api.stripe.com/v1/checkout/sessions/" + body.session_id, { headers: { Authorization: "Bearer " + stripeKey } });
        const data = await res.json();
        return jsonR({ payment_status: data.payment_status, amount_total: data.amount_total, currency: data.currency });
      }

      const page = matchHtmlPage(path);
      if (page && method === "GET") {
        return serveUI(env, page.r2Key, workHtml, page.name);
      }

      if (method === "GET" && (path === "/" || path.endsWith(".html"))) {
        return serveUI(env, "ui/work-active.html", workHtml, "work");
      }

      return jsonR({ error: "Not found", path }, 404);
    } catch (err) {
      return jsonR({ error: String(err && err.message || err) }, 500);
    }
  },
};
