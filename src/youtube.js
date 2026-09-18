export const DEFAULT_CHANNEL = "UC73le_vohvEOka1rjnOh3SQ";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const YT_API = "https://www.googleapis.com/youtube/v3";
const YT_UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";
const SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";

function originOf(env, request) {
  if (request) try { return new URL(request.url).origin; } catch {}
  return String(env.PUBLIC_DOMAIN || "https://heymia.lensflow.au").replace(/\/$/, "");
}
function redirectUri(env, request) {
  return originOf(env, request) + "/api/social/youtube/callback";
}
function clientId(env) {
  return env.YOUTUBE_CLIENT_ID || env.GOOGLE_CLIENT_ID || env.YT_CLIENT_ID || "";
}
function clientSecret(env) {
  return env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET || env.YT_CLIENT_SECRET || "";
}
function jsonPut(env, key, obj) {
  return env.VAULT.put(key, JSON.stringify(obj), { httpMetadata: { contentType: "application/json" } });
}

export function ytAppReady(env) {
  return !!(clientId(env) && clientSecret(env));
}

export async function getYtCreds(env) {
  const channel = env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL;
  if (env.YOUTUBE_REFRESH_TOKEN) {
    return { refresh_token: env.YOUTUBE_REFRESH_TOKEN, channel_id: channel, source: "env" };
  }
  if (env.VAULT) {
    const obj = await env.VAULT.get("social/youtube/credentials.json");
    if (obj) {
      try {
        const j = JSON.parse(await obj.text());
        if (j.refresh_token) return { ...j, channel_id: j.channel_id || channel, source: "vault" };
      } catch {}
    }
  }
  return { channel_id: channel, source: "none" };
}

export function youtubeSetup(env, request) {
  const origin = originOf(env, request);
  const cb = redirectUri(env, request);
  return {
    ok: true,
    channel_id: env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL,
    handle_hint: "73le_vohvEOka1rjnOh3SQ",
    app_ready: ytAppReady(env),
    client_id_set: !!clientId(env),
    client_secret_set: !!clientSecret(env),
    redirect_uri: cb,
    connect: origin + "/api/social/youtube/connect",
    google: {
      enable_api: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
      credentials: "https://console.cloud.google.com/apis/credentials",
      consent: "https://console.cloud.google.com/apis/credentials/consent",
    },
    secrets: [
      { name: "YOUTUBE_CLIENT_ID", why: "OAuth 2.0 Client ID (Web application)" },
      { name: "YOUTUBE_CLIENT_SECRET", why: "OAuth client secret" },
    ],
    optional: [{ name: "YOUTUBE_CHANNEL_ID", value: DEFAULT_CHANNEL }],
    steps: [
      "Google Cloud → enable YouTube Data API v3.",
      "APIs & Services → OAuth consent screen → External (or Internal). Scopes: youtube.upload, youtube.readonly. Add yourself as a test user.",
      "Credentials → Create OAuth client → Web application.",
      "Authorized redirect URI: paste redirect_uri exactly.",
      "Cloudflare secrets: YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET. Optional YOUTUBE_CHANNEL_ID=" + DEFAULT_CHANNEL,
      "HeyMia → Connect YouTube → approve the Google account that owns the channel.",
    ],
  };
}

async function accessToken(env, creds) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(env),
      client_secret: clientSecret(env),
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error(data.error_description || data.error || "YouTube token refresh failed");
  return data.access_token;
}

export async function ytAccount(env) {
  const creds = await getYtCreds(env);
  const setup = youtubeSetup(env);
  if (!creds.refresh_token) {
    return {
      ok: false,
      configured: false,
      channel_id: creds.channel_id,
      app_ready: ytAppReady(env),
      error: ytAppReady(env)
        ? "Channel saved. Click Connect YouTube and approve the Google account that owns UC73le_vohvEOka1rjnOh3SQ."
        : "Add YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET, then Connect YouTube.",
      setup,
    };
  }
  try {
    const tok = await accessToken(env, creds);
    const res = await fetch(YT_API + "/channels?part=snippet,contentDetails,statistics&mine=true", {
      headers: { Authorization: "Bearer " + tok },
    });
    const data = await res.json().catch(() => ({}));
    const ch = (data.items && data.items[0]) || {};
    return {
      ok: true,
      configured: true,
      channel_id: ch.id || creds.channel_id,
      title: ch.snippet?.title,
      customUrl: ch.snippet?.customUrl,
      videos: ch.statistics?.videoCount,
      source: creds.source,
    };
  } catch (e) {
    return { ok: false, configured: true, channel_id: creds.channel_id, error: String(e.message || e) };
  }
}

export async function saveYtConfig(env, body) {
  const rec = {
    refresh_token: String(body.refresh_token || body.YOUTUBE_REFRESH_TOKEN || "").trim(),
    channel_id: String(body.channel_id || body.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL).trim() || DEFAULT_CHANNEL,
    saved: new Date().toISOString(),
    source: "paste",
  };
  if (!rec.refresh_token) {
    rec.refresh_token = undefined;
    rec.channel_id = rec.channel_id || DEFAULT_CHANNEL;
  }
  if (env.VAULT) await jsonPut(env, "social/youtube/credentials.json", rec);
  return { ok: true, channel_id: rec.channel_id, connected: !!rec.refresh_token };
}

async function exchangeCode(env, request, code) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(env),
      client_secret: clientSecret(env),
      redirect_uri: redirectUri(env, request),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.refresh_token && !data.access_token) throw new Error(data.error_description || "YouTube OAuth failed");
  const rec = {
    refresh_token: data.refresh_token || "",
    access_token: data.access_token,
    channel_id: DEFAULT_CHANNEL,
    saved: new Date().toISOString(),
    source: "oauth",
  };
  if (!rec.refresh_token) {
    throw new Error("Google did not return a refresh_token. Remove HeyMia from Google Account → Third-party access, then Connect again (prompt=consent).");
  }
  try {
    const mine = await fetch(YT_API + "/channels?part=id,snippet&mine=true", {
      headers: { Authorization: "Bearer " + data.access_token },
    }).then((r) => r.json());
    if (mine.items && mine.items[0]) {
      rec.channel_id = mine.items[0].id;
      rec.title = mine.items[0].snippet?.title;
    }
  } catch {}
  if (env.VAULT) await jsonPut(env, "social/youtube/credentials.json", rec);
  return rec;
}

async function loadVideo(env, { key, url }) {
  if (key && env.VAULT) {
    const k = String(key).replace(/^\/+/, "");
    let obj = await env.VAULT.get(k);
    if (!obj) obj = await env.VAULT.get("files/" + k);
    if (!obj) obj = await env.VAULT.get("clips/" + k.replace(/^clips\//, ""));
    if (obj) {
      const buf = await obj.arrayBuffer();
      return { buf, type: obj.httpMetadata?.contentType || "video/mp4", name: k.split("/").pop() };
    }
  }
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch video HTTP " + res.status);
    return { buf: await res.arrayBuffer(), type: res.headers.get("content-type") || "video/mp4", name: "clip.mp4" };
  }
  throw new Error("Need vault key or https URL of the MP4");
}

export async function postYoutube(env, args, ctx) {
  const creds = await getYtCreds(env);
  if (!creds.refresh_token) {
    return { ok: false, error: "YouTube not connected. Add YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET, then Connect YouTube." };
  }
  const title = String(args.title || args.name || "HeyMia clip").slice(0, 100);
  const description = String(args.description || args.caption || args.text || "").slice(0, 5000);
  const privacy = /^(public|private|unlisted)$/i.test(args.privacy) ? String(args.privacy).toLowerCase() : "unlisted";
  const jobId = "yt-" + crypto.randomUUID().slice(0, 8);
  const job = { id: jobId, status: "uploading", title, privacy, key: args.key || "", created: new Date().toISOString() };
  if (env.VAULT) await jsonPut(env, "social/youtube/" + jobId + ".json", job);
  const run = async () => {
    try {
      const tok = await accessToken(env, creds);
      const media = await loadVideo(env, args);
      const meta = {
        snippet: {
          title,
          description,
          tags: Array.isArray(args.tags) ? args.tags : ["heymia"],
          categoryId: String(args.categoryId || "22"),
        },
        status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
      };
      const session = await fetch(YT_UPLOAD + "?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + tok,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(media.buf.byteLength),
          "X-Upload-Content-Type": media.type || "video/mp4",
        },
        body: JSON.stringify(meta),
      });
      const loc = session.headers.get("Location");
      if (!loc) {
        const err = await session.json().catch(() => ({}));
        throw new Error(err.error?.message || "YouTube did not start a resumable upload");
      }
      const put = await fetch(loc, {
        method: "PUT",
        headers: { Authorization: "Bearer " + tok, "Content-Type": media.type || "video/mp4" },
        body: media.buf,
      });
      const data = await put.json().catch(() => ({}));
      if (!put.ok) throw new Error(data.error?.message || "YouTube upload HTTP " + put.status);
      job.status = "published";
      job.video_id = data.id;
      job.url = "https://youtu.be/" + data.id;
      job.watch = "https://www.youtube.com/watch?v=" + data.id;
      job.finished = new Date().toISOString();
      if (env.VAULT) await jsonPut(env, "social/youtube/" + jobId + ".json", job);
      return job;
    } catch (e) {
      job.status = "failed";
      job.error = String(e.message || e);
      job.finished = new Date().toISOString();
      if (env.VAULT) await jsonPut(env, "social/youtube/" + jobId + ".json", job);
      return job;
    }
  };
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(run());
    return { ok: true, job_id: jobId, status: "uploading", channel_id: creds.channel_id, poll: "/api/social/youtube/jobs/" + jobId, message: "Uploading “" + title + "” to YouTube (" + privacy + ")." };
  }
  const done = await run();
  return done.status === "published"
    ? { ok: true, ...done }
    : { ok: false, ...done };
}

export async function tickYtJob(env, id) {
  if (!env.VAULT) return { error: "VAULT unbound" };
  const obj = await env.VAULT.get("social/youtube/" + id + ".json");
  if (!obj) return { error: "job not found" };
  return JSON.parse(await obj.text());
}

export async function handleYoutube(request, env, path, ctx) {
  const origin = originOf(env, request);
  if (path === "/api/social/youtube/setup" && request.method === "GET") {
    return { ...youtubeSetup(env, request), account: await ytAccount(env) };
  }
  if (path === "/api/social/youtube/connect" && request.method === "GET") {
    if (!ytAppReady(env)) {
      return { ok: false, error: "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.", setup: youtubeSetup(env, request) };
    }
    const url =
      AUTH + "?" +
      new URLSearchParams({
        client_id: clientId(env),
        redirect_uri: redirectUri(env, request),
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state: "youtube",
      });
    return new Response(null, { status: 302, headers: { Location: url, "Access-Control-Allow-Origin": "*" } });
  }
  if (path === "/api/social/youtube/callback" && request.method === "GET") {
    const u = new URL(request.url);
    const err = u.searchParams.get("error_description") || u.searchParams.get("error");
    if (err) return new Response(null, { status: 302, headers: { Location: origin + "/work?yt=error&msg=" + encodeURIComponent(err) } });
    try {
      const rec = await exchangeCode(env, request, u.searchParams.get("code") || "");
      return new Response(null, {
        status: 302,
        headers: { Location: origin + "/work?yt=connected&ch=" + encodeURIComponent(rec.channel_id || DEFAULT_CHANNEL) },
      });
    } catch (e) {
      return new Response(null, { status: 302, headers: { Location: origin + "/work?yt=error&msg=" + encodeURIComponent(String(e.message || e)) } });
    }
  }
  if (path === "/api/social/youtube/config" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!body.channel_id) body.channel_id = DEFAULT_CHANNEL;
    return saveYtConfig(env, body);
  }
  if (path === "/api/social/youtube" && request.method === "GET") return ytAccount(env);
  if (path === "/api/social/youtube" && request.method === "POST") {
    return postYoutube(env, await request.json().catch(() => ({})), ctx);
  }
  if (path.startsWith("/api/social/youtube/jobs/") && request.method === "GET") {
    return tickYtJob(env, path.split("/").pop());
  }
  return null;
}
