const SPEAKER = "luna";
const MODELS = ["@cf/deepgram/aura-1", "@cf/deepgram/aura-2-en"];

async function sha(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

export async function handleTts(request, env, path) {
  if (path !== "/tts" && path !== "/api/tts") return null;
  if (request.method === "GET") {
    return {
      ok: true,
      monthly: false,
      elevenlabs: false,
      engine: env.AI ? "aura+browser" : "browser",
      speaker: SPEAKER,
      note: "Default Mia voice is the browser voice — free, locked, no ElevenLabs. Studio Aura is optional and cached.",
    };
  }
  if (request.method !== "POST") return { error: "method" };
  const body = await request.json().catch(() => ({}));
  const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 800);
  if (!text) return { error: "text required", use_browser: true };
  if (!env.AI || typeof env.AI.run !== "function") {
    return { ok: false, use_browser: true, reason: "browser voice" };
  }
  const speaker = String(body.speaker || SPEAKER).slice(0, 24);
  const key = "tts/mia/" + (await sha(speaker + "|" + text)) + ".mp3";
  if (env.VAULT) {
    try {
      const hit = await env.VAULT.get(key);
      if (hit) {
        const audio = b64(await hit.arrayBuffer());
        return { ok: true, cached: true, format: "mp3", voice: speaker, audio, monthly: false };
      }
    } catch {}
  }
  let lastErr = "";
  for (const model of MODELS) {
    try {
      const resp = await env.AI.run(model, { text, speaker, encoding: "mp3" }, { returnRawResponse: true });
      const buf = resp && typeof resp.arrayBuffer === "function"
        ? await resp.arrayBuffer()
        : resp instanceof ArrayBuffer
          ? resp
          : null;
      if (!buf || !buf.byteLength) continue;
      if (env.VAULT) {
        try {
          await env.VAULT.put(key, buf, { httpMetadata: { contentType: "audio/mpeg" } });
        } catch {}
      }
      return { ok: true, cached: false, format: "mp3", voice: speaker, model, audio: b64(buf), monthly: false };
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }
  return { ok: false, use_browser: true, error: lastErr || "aura failed" };
}
