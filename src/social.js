const GRAPH = "https://graph.facebook.com/v22.0";
const FB = "https://www.facebook.com/v22.0";
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
].join(",");

function envToken(env) {
  return env.META_PAGE_TOKEN || env.IG_ACCESS_TOKEN || env.FACEBOOK_TOKEN || "";
}
function envIg(env) {
  return env.IG_USER_ID || env.INSTAGRAM_USER_ID || "";
}
function publicOrigin(env, request) {
  if (request) try { return new URL(request.url).origin; } catch {}
  return String(env.PUBLIC_DOMAIN || "https://heymia.lensflow.au").replace(/\/$/, "");
}
function redirectUri(env, request) {
  return publicOrigin(env, request) + "/api/social/instagram/callback";
}
function jsonPut(env, key, obj) {
  return env.VAULT.put(key, JSON.stringify(obj), { httpMetadata: { contentType: "application/json" } });
}

export async function getCreds(env) {
  if (envToken(env) && envIg(env)) {
    return { token: envToken(env), ig_user_id: envIg(env), source: "env" };
  }
  if (env.VAULT) {
    const obj = await env.VAULT.get("social/ig/credentials.json");
    if (obj) {
      try {
        const j = JSON.parse(await obj.text());
        if (j.token && j.ig_user_id) return { ...j, source: "vault" };
      } catch {}
    }
  }
  return { token: envToken(env), ig_user_id: envIg(env), source: "none" };
}

export function igConfigured(env) {
  return !!(envToken(env) && envIg(env));
}

export function igAppReady(env) {
  return !!(env.META_APP_ID && env.META_APP_SECRET);
}

export function graphSetup(env, request) {
  const origin = publicOrigin(env, request);
  const cb = redirectUri(env, request);
  return {
    ok: true,
    graph: GRAPH,
    app_id_set: !!env.META_APP_ID,
    app_secret_set: !!env.META_APP_SECRET,
    page_token_set: !!envToken(env),
    ig_user_set: !!envIg(env),
    redirect_uri: cb,
    connect: origin + "/api/social/instagram/connect",
    scopes: SCOPES.split(","),
    meta: {
      create_app: "https://developers.facebook.com/apps/creation/",
      dashboard: "https://developers.facebook.com/apps/",
      products: ["Facebook Login", "Instagram"],
      login_settings: "Facebook Login → Settings → Valid OAuth Redirect URIs",
      paste_this_redirect: cb,
      use_cases: "Instagram API setup / Content publishing",
    },
    cloudflare_secrets: [
      { name: "META_APP_ID", why: "App ID from Meta dashboard (Settings → Basic)" },
      { name: "META_APP_SECRET", why: "App Secret from Settings → Basic" },
    ],
    or_paste: [
      { name: "META_PAGE_TOKEN", why: "System User or Page token — skip OAuth" },
      { name: "IG_USER_ID", why: "Instagram professional numeric id" },
    ],
    steps: [
      "Create an app at developers.facebook.com (type: Business).",
      "Add products: Facebook Login and Instagram.",
      "App → Facebook Login → Settings → Valid OAuth Redirect URIs → paste redirect_uri exactly.",
      "App → Settings → Basic → copy App ID and App Secret into Cloudflare as META_APP_ID and META_APP_SECRET.",
      "Instagram must be Professional and linked to a Facebook Page you admin.",
      "In App Review later: instagram_content_publish. In Dev mode it only posts as app testers/admins.",
      "Open /api/social/instagram/connect (or the Connect button) and approve the Page + Instagram.",
    ],
  };
}

export async function igAccount(env) {
  const c = await getCreds(env);
  if (!c.token || !c.ig_user_id) {
    return {
      ok: false,
      configured: false,
      app_ready: igAppReady(env),
      error: igAppReady(env)
        ? "App is ready. Click Connect Instagram and approve the Page."
        : "Add META_APP_ID + META_APP_SECRET (OAuth) or META_PAGE_TOKEN + IG_USER_ID (paste).",
    };
  }
  const res = await fetch(
    GRAPH + "/" + c.ig_user_id + "?fields=id,username,name,account_type,followers_count&access_token=" + encodeURIComponent(c.token)
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, configured: true, error: data.error?.message || "Instagram HTTP " + res.status };
  return { ok: true, configured: true, source: c.source, username: data.username, id: data.id, name: data.name, account_type: data.account_type, followers: data.followers_count };
}

async function graphPost(path, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(GRAPH + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Graph HTTP " + res.status);
  return data;
}

async function graphGet(path, tok) {
  const res = await fetch(GRAPH + path + (path.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(tok));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Graph HTTP " + res.status);
  return data;
}

async function containerStatus(id, tok) {
  const data = await graphGet("/" + id + "?fields=status_code,status", tok);
  return String(data.status_code || data.status || "").toUpperCase();
}

function publicMediaUrl(env, { key, url }) {
  if (url && /^https:\/\//i.test(url)) return url;
  if (key) return publicOrigin(env) + "/files?key=" + encodeURIComponent(String(key).replace(/^\/+/, ""));
  return "";
}

function isVideo(key, url, type) {
  const t = String(type || "").toUpperCase();
  if (t === "IMAGE" || t === "PHOTO") return false;
  const s = String(key || url || "");
  if (/\.(png|jpe?g|webp|gif)$/i.test(s)) return false;
  return true;
}

export async function tickIgJob(env, id) {
  if (!env.VAULT) return { error: "VAULT unbound" };
  const obj = await env.VAULT.get("social/ig/" + id + ".json");
  if (!obj) return { error: "job not found", id };
  const job = JSON.parse(await obj.text());
  if (job.status === "published" || job.status === "failed") return job;
  const c = await getCreds(env);
  try {
    const st = await containerStatus(job.container_id, c.token);
    job.container_status = st;
    if (st === "ERROR" || st === "EXPIRED") throw new Error("Instagram container " + st);
    if (st && st !== "FINISHED" && st !== "PUBLISHED") {
      await jsonPut(env, "social/ig/" + id + ".json", job);
      return job;
    }
    const pub = await graphPost("/" + c.ig_user_id + "/media_publish", {
      creation_id: job.container_id,
      access_token: c.token,
    });
    job.status = "published";
    job.media_id = pub.id;
    job.username = c.username || job.username;
    job.finished = new Date().toISOString();
    await jsonPut(env, "social/ig/" + id + ".json", job);
    return job;
  } catch (e) {
    job.status = "failed";
    job.error = String(e.message || e);
    job.finished = new Date().toISOString();
    await jsonPut(env, "social/ig/" + id + ".json", job);
    return job;
  }
}

export async function postInstagram(env, args, ctx) {
  const c = await getCreds(env);
  if (!c.token || !c.ig_user_id) {
    return { ok: false, error: "Instagram not connected. Add META_APP_ID + META_APP_SECRET and click Connect, or paste META_PAGE_TOKEN + IG_USER_ID." };
  }
  const caption = String(args.caption || args.text || "").slice(0, 2200);
  const mediaUrl = publicMediaUrl(env, args);
  if (!mediaUrl) return { ok: false, error: "Need a public https URL or a vault key (clips/…)" };
  const video = isVideo(args.key, mediaUrl, args.type || args.media_type);
  const id = "ig-" + crypto.randomUUID().slice(0, 8);
  const fields = { caption, access_token: c.token };
  if (video) {
    fields.media_type = "REELS";
    fields.video_url = mediaUrl;
    fields.share_to_feed = "true";
  } else {
    fields.image_url = mediaUrl;
  }
  try {
    const created = await graphPost("/" + c.ig_user_id + "/media", fields);
    const job = {
      id,
      status: video ? "processing" : "ready",
      container_id: created.id,
      media_url: mediaUrl,
      caption,
      video,
      key: args.key || "",
      username: c.username || "",
      created: new Date().toISOString(),
    };
    if (env.VAULT) await jsonPut(env, "social/ig/" + id + ".json", job);
    const finish = async () => {
      if (!video) return tickIgJob(env, id);
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const j = await tickIgJob(env, id);
        if (j.status === "published" || j.status === "failed") return j;
      }
    };
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(finish());
    else await finish();
    return {
      ok: true,
      job_id: id,
      status: job.status,
      container_id: created.id,
      poll: "/api/social/instagram/jobs/" + id,
      message: video
        ? "Instagram is processing the reel. Publish runs when the container is FINISHED."
        : "Image container created — publishing now.",
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export async function saveIgConfig(env, body) {
  const token = String(body.token || body.META_PAGE_TOKEN || "").trim();
  const ig_user_id = String(body.ig_user_id || body.IG_USER_ID || "").trim();
  if (!token || !ig_user_id) return { ok: false, error: "Need token and ig_user_id" };
  const rec = { token, ig_user_id, saved: new Date().toISOString(), source: "paste" };
  if (env.VAULT) await jsonPut(env, "social/ig/credentials.json", rec);
  return { ok: true, ig_user_id, message: "Saved. Instagram posts will use this Page token." };
}

async function exchangeCode(env, request, code) {
  const cb = redirectUri(env, request);
  const res = await fetch(
    GRAPH + "/oauth/access_token?" +
      new URLSearchParams({
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        redirect_uri: cb,
        code,
      })
  );
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error(data.error?.message || "Token exchange failed");
  let userTok = data.access_token;
  const longLived = await fetch(
    GRAPH + "/oauth/access_token?" +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        fb_exchange_token: userTok,
      })
  ).then((r) => r.json()).catch(() => ({}));
  if (longLived.access_token) userTok = longLived.access_token;
  const pages = await graphGet("/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}", userTok);
  const list = pages.data || [];
  const page = list.find((p) => p.instagram_business_account && p.instagram_business_account.id);
  if (!page) {
    throw new Error("No Facebook Page with a linked Professional Instagram. Link IG to a Page you admin, then Connect again.");
  }
  const rec = {
    token: page.access_token,
    ig_user_id: page.instagram_business_account.id,
    username: page.instagram_business_account.username || "",
    page_id: page.id,
    page_name: page.name,
    saved: new Date().toISOString(),
    source: "oauth",
  };
  if (env.VAULT) await jsonPut(env, "social/ig/credentials.json", rec);
  return rec;
}

export async function handleSocial(request, env, path, ctx) {
  const origin = publicOrigin(env, request);
  if (path === "/api/social/instagram/setup" && request.method === "GET") {
    const account = await igAccount(env);
    return { ...graphSetup(env, request), account };
  }
  if (path === "/api/social/instagram/connect" && request.method === "GET") {
    if (!igAppReady(env)) {
      return { ok: false, error: "Set META_APP_ID and META_APP_SECRET first.", setup: graphSetup(env, request) };
    }
    const url =
      FB + "/dialog/oauth?" +
      new URLSearchParams({
        client_id: env.META_APP_ID,
        redirect_uri: redirectUri(env, request),
        scope: SCOPES,
        response_type: "code",
        state: "heymia",
      });
    return new Response(null, { status: 302, headers: { Location: url, "Access-Control-Allow-Origin": "*" } });
  }
  if (path === "/api/social/instagram/callback" && request.method === "GET") {
    const u = new URL(request.url);
    const err = u.searchParams.get("error_description") || u.searchParams.get("error");
    if (err) {
      return new Response(null, { status: 302, headers: { Location: origin + "/work?ig=error&msg=" + encodeURIComponent(err) } });
    }
    try {
      const rec = await exchangeCode(env, request, u.searchParams.get("code") || "");
      return new Response(null, {
        status: 302,
        headers: { Location: origin + "/work?ig=connected&user=" + encodeURIComponent(rec.username || rec.ig_user_id) },
      });
    } catch (e) {
      return new Response(null, {
        status: 302,
        headers: { Location: origin + "/work?ig=error&msg=" + encodeURIComponent(String(e.message || e)) },
      });
    }
  }
  if (path === "/api/social/instagram/config" && request.method === "POST") {
    return saveIgConfig(env, await request.json().catch(() => ({})));
  }
  if (path === "/api/social/instagram" && request.method === "GET") return igAccount(env);
  if (path === "/api/social/instagram" && request.method === "POST") {
    return postInstagram(env, await request.json().catch(() => ({})), ctx);
  }
  if (path.startsWith("/api/social/instagram/jobs/") && request.method === "GET") {
    return tickIgJob(env, path.split("/").pop());
  }
  return null;
}
