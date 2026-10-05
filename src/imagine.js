import { saveClip } from "./clips.js";

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "clip";
}

export function magickPrompt(story, { quality } = {}) {
  const four = String(quality || "").toLowerCase().includes("4k");
  return [
    "Cinematic myth, 2.39:1 anamorphic 35mm, 24fps, practical fire and rain,",
    "volumetric god-rays, teal-orange grade with gold highlights, fine film grain,",
    "shallow depth of field, IMAX-scale emotion, photoreal, no text, no watermark, no logo.",
    four ? "Ultra-detailed 4K: scale micro-texture, skin, weather, lens breathing." : "Native 1080p, filmic, not stretched.",
    "STORY:",
    String(story || "").slice(0, 1200),
    "Camera: slow dolly, breathing handheld, match-cut on eyes. Ending held 1 second.",
    "Adults only. She invites him. Not forced.",
  ].join(" ");
}

async function putJob(env, job) {
  if (!env.VAULT) return;
  await env.VAULT.put("clips/jobs/" + job.id + ".json", JSON.stringify(job), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function getJob(env, id) {
  if (!env.VAULT) return { error: "VAULT unbound" };
  const obj = await env.VAULT.get("clips/jobs/" + id + ".json");
  if (!obj) return { error: "job not found", id };
  return JSON.parse(await obj.text());
}

async function startXaiVideo(key, prompt, duration, resolution) {
  const res = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: "grok-imagine-video-1.5",
      prompt,
      duration: Math.min(15, Math.max(5, Number(duration) || 12)),
      resolution: resolution === "1080p" || resolution === "720p" || resolution === "480p" ? resolution : "1080p",
      aspect_ratio: "16:9",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.error || ("xAI video HTTP " + res.status);
    if (res.status === 403) throw new Error("XAI_API_KEY is set but xAI has no credits. Add balance at console.x.ai.");
    throw new Error(String(msg));
  }
  return data.request_id || data.id || data.video_id;
}

async function pollXaiVideo(key, rid) {
  const res = await fetch("https://api.x.ai/v1/videos/" + rid, {
    headers: { Authorization: "Bearer " + key },
  });
  const data = await res.json().catch(() => ({}));
  const status = String(data.status || data.state || "").toLowerCase();
  const url = data.video?.url || data.url || data.video_url || data.result?.url;
  return { status, url, raw: data };
}

async function startVeo(key, prompt, resolution) {
  const model = "veo-3.1-generate-preview";
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":predictLongRunning?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio: "16:9",
          durationSeconds: 8,
          resolution: resolution === "4k" || resolution === "4K" ? "4k" : "1080p",
        },
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Veo HTTP " + res.status);
  const name = data.name || data.operation || "";
  if (!name) throw new Error("Veo did not return an operation name");
  return name;
}

async function pollVeo(key, name) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/" + name + "?key=" + encodeURIComponent(key));
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error.message || "Veo poll error");
  if (!data.done) return { status: "pending" };
  const b64 =
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.bytesBase64Encoded ||
    data.response?.generatedVideos?.[0]?.video?.bytesBase64Encoded ||
    data.response?.predictions?.[0]?.bytesBase64Encoded;
  const uri =
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    data.response?.generatedVideos?.[0]?.video?.uri;
  return { status: "done", b64, uri, raw: data };
}

async function storeFromUrl(env, job, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download video HTTP " + res.status);
  const buf = await res.arrayBuffer();
  const saved = await saveClip(env, { name: job.slug + ".mp4", body: buf, type: "video/mp4", title: job.title });
  job.status = "done";
  job.key = saved.key;
  job.download = saved.download;
  job.bytes = saved.size;
  job.finished = new Date().toISOString();
  await putJob(env, job);
  return job;
}

async function storeFromB64(env, job, b64) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const saved = await saveClip(env, { name: job.slug + ".mp4", body: bin, type: "video/mp4", title: job.title });
  job.status = "done";
  job.key = saved.key;
  job.download = saved.download;
  job.bytes = saved.size;
  job.finished = new Date().toISOString();
  await putJob(env, job);
  return job;
}

export async function tickJob(env, id) {
  const job = await getJob(env, id);
  if (job.error) return job;
  if (job.status === "done" || job.status === "failed") return job;
  try {
    if (job.engine === "veo") {
      const gem = env.GEMINI_API_KEY || env.GEMINI;
      const p = await pollVeo(gem, job.op);
      if (p.status !== "done") return job;
      if (p.b64) return storeFromB64(env, job, p.b64);
      if (p.uri) return storeFromUrl(env, job, p.uri);
      throw new Error("Veo finished with no video bytes");
    }
    const key = env.XAI_API_KEY || env.GROK_API_KEY;
    const p = await pollXaiVideo(key, job.op);
    if (p.status === "failed" || p.status === "expired") throw new Error("xAI video " + p.status);
    if (p.url) return storeFromUrl(env, job, p.url);
    if (p.status === "done" && !p.url) throw new Error("xAI said done but sent no URL");
    return job;
  } catch (e) {
    job.status = "failed";
    job.error = String(e.message || e);
    job.finished = new Date().toISOString();
    await putJob(env, job);
    return job;
  }
}

export async function generateClip(env, args, ctx) {
  const title = String(args.title || "Untitled clip").slice(0, 80);
  const story = String(args.story || args.prompt || args.premise || "").trim();
  if (!story) return { ok: false, error: "Need a story / prompt" };
  const want4k = /4k/i.test(String(args.quality || args.resolution || ""));
  const duration = Math.min(15, Number(args.duration) || 12);
  const prompt = magickPrompt(story, { quality: "1080p" });
  const id = "job-" + crypto.randomUUID().slice(0, 8);
  const job = {
    id,
    title,
    slug: slugify(title),
    status: "queued",
    engine: "grok-imagine-video-1.5",
    quality: "1080p",
    duration,
    prompt,
    created: new Date().toISOString(),
    note: want4k
      ? "4K Veo is off. Rendered on Grok Imagine Video at 1080p."
      : "1080p on grok-imagine-video-1.5. Not Veo.",
  };
  try {
    const key = env.XAI_API_KEY || env.GROK_API_KEY;
    if (!key) throw new Error("XAI_API_KEY not set — Mia cannot call Grok Imagine Video.");
    job.op = await startXaiVideo(key, prompt, duration, "1080p");
    job.status = "rendering";
    await putJob(env, job);
    const loop = async () => {
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const j = await tickJob(env, id);
        if (j.status === "done" || j.status === "failed") return;
      }
    };
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(loop());
    return {
      ok: true,
      job_id: id,
      status: job.status,
      engine: job.engine,
      quality: job.quality,
      duration: job.duration,
      note: job.note,
      poll: "/api/clips/jobs/" + id,
      message: "Mia started rendering on " + job.engine + ".",
    };
  } catch (e) {
    job.status = "failed";
    job.error = String(e.message || e);
    await putJob(env, job);
    return { ok: false, job_id: id, error: job.error, note: job.note };
  }
}

function hfToken(env) {
  return env.HF_TOKEN || env.HUGGINGFACE_TOKEN || env.HUGGINGFACE_API_KEY || env.HF_API_TOKEN || "";
}

async function saveStill(env, title, bytes, engine, extra) {
  const slug = slugify(title);
  const fileKey = "images/" + slug + ".jpg";
  if (env.VAULT) {
    await env.VAULT.put(fileKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
  }
  return {
    ok: true,
    engine,
    title,
    key: fileKey,
    download: "/files?key=" + encodeURIComponent(fileKey) + "&download=1",
    message: "Mia made the still with " + engine + ". It is in images/.",
    ...extra,
  };
}

async function imageFromHuggingFace(env, prompt, title) {
  const token = hfToken(env);
  if (!token) return { ok: false, error: "HF_TOKEN is not set on this Worker." };
  const res = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt.slice(0, 1500) }),
  });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("json") || type.includes("text")) {
    const err = await res.text().catch(() => "");
    let msg = err.slice(0, 300);
    try { msg = JSON.parse(err).error || msg; } catch {}
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Hugging Face rejected the token. Create a new read token and save it on Cloudflare as HF_TOKEN." };
    }
    return { ok: false, error: "Hugging Face image HTTP " + res.status + (msg ? ": " + msg : "") };
  }
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) return { ok: false, error: "Hugging Face returned an empty image." };
  return saveStill(env, title, bytes, "FLUX.1-schnell");
}

export async function generateImage(env, args) {
  const prompt = String(args.prompt || args.story || args.title || "").trim();
  if (!prompt) return { ok: false, error: "Need a prompt" };
  const title = String(args.title || prompt).slice(0, 80);
  const key = env.XAI_API_KEY || env.GROK_API_KEY;
  if (!key) return imageFromHuggingFace(env, prompt, title);
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: "grok-imagine-image-2.0",
      prompt: prompt.slice(0, 2000),
      n: 1,
      aspect_ratio: args.aspect_ratio || "16:9",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.error || ("image HTTP " + res.status);
    const hf = await imageFromHuggingFace(env, prompt, title);
    if (hf.ok) return { ...hf, note: "Grok Imagine failed (" + msg + "). Used Hugging Face instead." };
    if (res.status === 403) return { ok: false, error: "XAI_API_KEY is set but xAI has no credits. Hugging Face also failed: " + (hf.error || "no HF_TOKEN") };
    return { ok: false, error: String(msg) + (hf.error ? " · HF: " + hf.error : "") };
  }
  const url = data.data?.[0]?.url || data.url || data.image?.url;
  const b64 = data.data?.[0]?.b64_json;
  if (!url && !b64) return { ok: false, error: "Grok Imagine returned no image", raw: data };
  let bytes;
  if (b64) bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  else {
    const img = await fetch(url);
    if (!img.ok) return { ok: false, error: "image download HTTP " + img.status, url };
    bytes = await img.arrayBuffer();
  }
  const slug = slugify(title);
  const fileKey = "images/" + slug + ".jpg";
  if (env.VAULT) {
    await env.VAULT.put(fileKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
  }
  return {
    ok: true,
    engine: "grok-imagine-image-2.0",
    title,
    key: fileKey,
    download: env.VAULT ? "/files?key=" + encodeURIComponent(fileKey) + "&download=1" : url,
    message: "Mia made the still with Grok Imagine. It is in images/.",
  };
}

export async function handleImagine(request, env, path, ctx) {
  if (path === "/api/images/generate" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return generateImage(env, body);
  }
  if (path === "/api/clips/generate" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const rec = await generateClip(env, body, ctx);
    return rec;
  }
  if (path.startsWith("/api/clips/jobs/") && request.method === "GET") {
    const id = path.split("/").pop();
    return tickJob(env, id);
  }
  return null;
}
