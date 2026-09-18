import editHtml from "./ui/edit.html.js";
import { vaultBound, mimeOf } from "./sites.js";

function jsonR(d, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  });
}

function slug(s) {
  return String(s || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "job";
}

export function serveEdit(request) {
  const url = new URL(request.url);
  const embed = url.searchParams.get("embed") === "1";
  const headers = {
    "Content-Type": "text/html;charset=UTF-8",
    "Cache-Control": "no-cache",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (!embed) {
    headers["Cross-Origin-Opener-Policy"] = "same-origin";
    headers["Cross-Origin-Embedder-Policy"] = "credentialless";
  }
  return new Response(editHtml, { headers });
}

export function ffmpegRecipe(job = {}) {
  const args = ["-y"];
  if (job.trim_start) args.push("-ss", String(job.trim_start));
  args.push("-i", "input");
  if (job.trim_end && job.trim_start != null) {
    args.push("-t", String(Math.max(0.05, Number(job.trim_end) - Number(job.trim_start || 0))));
  }
  const vf = [];
  if (job.crop) {
    const c = typeof job.crop === "string" ? job.crop : [job.crop.w, job.crop.h, job.crop.x, job.crop.y].join(":");
    vf.push("crop=" + c);
  }
  if (Number(job.rotate) === 90) vf.push("transpose=1");
  if (Number(job.rotate) === 180) vf.push("transpose=1,transpose=1");
  if (Number(job.rotate) === 270) vf.push("transpose=2");
  if (job.flip === "h" || job.flip === "hv") vf.push("hflip");
  if (job.flip === "v" || job.flip === "hv") vf.push("vflip");
  if (job.speed && Number(job.speed) !== 1) vf.push("setpts=PTS/" + job.speed);
  const af = [];
  if (job.mute) af.push("volume=0");
  else if (job.volume != null && Number(job.volume) !== 1) af.push("volume=" + job.volume);
  if (vf.length) args.push("-vf", vf.join(","));
  if (af.length) args.push("-af", af.join(","));
  if (job.extract_audio) args.push("-vn");
  args.push(job.extract_audio ? "out.wav" : "out.mp4");
  return {
    engine: "ffmpeg.wasm",
    note: "Cloudflare Workers cannot spawn native FFmpeg. The Cut bench runs this recipe in the browser.",
    args,
    open: "/edit?key=" + encodeURIComponent(job.key || "") + (job.id ? "&job=" + job.id : ""),
  };
}

export async function saveEditJob(env, job) {
  const id = slug(job.id || job.name || "edit") + "-" + Date.now().toString(36).slice(-5);
  const rec = { ...job, id, at: new Date().toISOString() };
  const recipe = ffmpegRecipe({ ...rec, id });
  rec.recipe = recipe;
  if (vaultBound(env)) {
    await env.VAULT.put("edit/jobs/" + id + ".json", JSON.stringify(rec), {
      httpMetadata: { contentType: "application/json" },
    });
  }
  return { ok: true, id, job: rec, url: recipe.open, message: "Open Cut to run FFmpeg.wasm on this recipe." };
}

export async function loadEditJob(env, id) {
  if (!id) return { ok: false, error: "id required" };
  if (!vaultBound(env)) return { ok: false, error: "VAULT unbound" };
  const obj = await env.VAULT.get("edit/jobs/" + id + ".json");
  if (!obj) return { ok: false, error: "job not found" };
  return { ok: true, job: JSON.parse(await obj.text()) };
}

async function tryInpaint(env, imageBytes, maskBytes, prompt) {
  if (!env.AI) return { ok: false, error: "Workers AI unbound" };
  const models = [
    "@cf/runwayml/stable-diffusion-v1-5-inpainting",
    "@cf/black-forest-labs/flux-1-schnell",
  ];
  const image = [...imageBytes];
  const mask = [...maskBytes];
  let last = "no model";
  for (const model of models) {
    try {
      const body = model.includes("inpaint")
        ? { prompt: prompt || "remove the object, fill with matching background", image, mask }
        : { prompt: prompt || "clean photograph, empty background, no logo", image };
      const out = await env.AI.run(model, body);
      if (!out) continue;
      let bytes = out;
      if (out instanceof ReadableStream) bytes = new Uint8Array(await new Response(out).arrayBuffer());
      else if (out.image) bytes = typeof out.image === "string" ? out.image : out.image;
      else if (out instanceof ArrayBuffer) bytes = new Uint8Array(out);
      if (typeof bytes !== "string") {
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        let bin = "";
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        bytes = btoa(bin);
      }
      return { ok: true, image: bytes, model };
    } catch (e) {
      last = String(e.message || e);
    }
  }
  return { ok: false, error: last, fallback: "telea" };
}

function b64ToBytes(s) {
  const bin = atob(String(s || "").replace(/^data:[^;]+;base64,/, ""));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export async function handleEdit(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;
  if ((path === "/edit" || path === "/edit.html" || path === "/cut") && method === "GET") {
    return serveEdit(request);
  }
  if (path === "/api/edit/inpaint" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const image = b64ToBytes(body.image || "");
    const mask = b64ToBytes(body.mask || "");
    if (!image.length) return jsonR({ ok: false, error: "image required" }, 400);
    const rec = await tryInpaint(env, image, mask, body.prompt);
    return jsonR(rec, rec.ok ? 200 : 503);
  }
  if (path === "/api/edit/job" && method === "POST") {
    return jsonR(await saveEditJob(env, await request.json().catch(() => ({}))));
  }
  if (path === "/api/edit/job" && method === "GET") {
    return jsonR(await loadEditJob(env, url.searchParams.get("id")));
  }
  if (path === "/api/edit/recipe" && method === "POST") {
    return jsonR(ffmpegRecipe(await request.json().catch(() => ({}))));
  }
  if (path === "/api/edit/save" && method === "POST") {
    if (!vaultBound(env)) return jsonR({ error: "VAULT unbound" }, 503);
    const name = request.headers.get("X-File-Name") || "cut-export.bin";
    const type = request.headers.get("Content-Type") || mimeOf(name);
    const buf = await request.arrayBuffer();
    const key = "files/" + String(name).replace(/^\/+/, "").replace(/\.\./g, "");
    await env.VAULT.put(key, buf, { httpMetadata: { contentType: type } });
    return jsonR({ ok: true, key, name, size: buf.byteLength });
  }
  return null;
}
