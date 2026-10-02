const NATASHA = "en-AU-NatashaNeural";
const EDGE_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

async function sha(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(out);
}

async function secMsGec() {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  ticks = Math.round(ticks * 1e7);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(ticks) + EDGE_TOKEN));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function escapeSsml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

async function natashaMp3(text) {
  const sec = await secMsGec();
  const conn = crypto.randomUUID().replace(/-/g, "");
  const url = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken="
    + EDGE_TOKEN + "&ConnectionId=" + conn + "&Sec-MS-GEC=" + sec + "&Sec-MS-GEC-Version=1-143.0.3650.75";
  const resp = await fetch(url, {
    headers: {
      Upgrade: "websocket",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
      Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error("Natasha socket was not accepted");
  if (typeof ws.accept === "function") ws.accept();
  const parts = [];
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      if (parts.length) resolve();
      else reject(new Error("Natasha timed out"));
    }, 15000);
    const sendJob = () => {
      const ts = new Date().toUTCString();
      ws.send("X-Timestamp:" + ts + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
        + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
      const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-AU'><voice name='"
        + NATASHA + "'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>" + escapeSsml(text) + "</prosody></voice></speak>";
      const req = crypto.randomUUID().replace(/-/g, "");
      ws.send("X-RequestId:" + req + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:" + ts + "Z\r\nPath:ssml\r\n\r\n" + ssml);
    };
    if (ws.readyState === 1) sendJob();
    else ws.addEventListener("open", sendJob);
    ws.addEventListener("message", async (ev) => {
      let u;
      if (typeof ev.data === "string") {
        if (ev.data.includes("Path:turn.end")) { clearTimeout(timer); try { ws.close(); } catch {} resolve(); }
        return;
      }
      if (ev.data instanceof Blob) u = new Uint8Array(await ev.data.arrayBuffer());
      else u = new Uint8Array(ev.data);
      if (u.length < 2) return;
      const hl = (u[0] << 8) | u[1];
      const head = new TextDecoder().decode(u.slice(2, 2 + hl));
      const body = u.slice(2 + hl);
      if (head.includes("Path:turn.end")) { clearTimeout(timer); try { ws.close(); } catch {} resolve(); return; }
      if (head.includes("audio/mpeg") && body.length) parts.push(body);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      if (parts.length) resolve();
      else reject(new Error("Natasha connection failed"));
    });
    ws.addEventListener("close", () => {
      clearTimeout(timer);
      if (parts.length) resolve();
    });
  });
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  if (!out.length) throw new Error("Natasha returned no audio");
  return out.buffer;
}

export async function handleTts(request, env, path) {
  if (path !== "/tts" && path !== "/api/tts") return null;
  if (request.method === "GET") {
    return { ok: true, monthly: false, elevenlabs: false, engine: NATASHA, speaker: "Natasha", note: "Mia speaks as Natasha. Australian, mid-20s. No ElevenLabs." };
  }
  if (request.method !== "POST") return { error: "method" };
  const body = await request.json().catch(() => ({}));
  const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (!text) return { error: "text required", use_browser: true };
  const cacheKey = "tts/natasha/" + (await sha(text)) + ".mp3";
  if (env.VAULT) {
    try {
      const hit = await env.VAULT.get(cacheKey);
      if (hit) return { ok: true, cached: true, format: "mp3", voice: NATASHA, audio: b64(await hit.arrayBuffer()), monthly: false };
    } catch {}
  }
  try {
    const audioBuf = await natashaMp3(text);
    if (env.VAULT) {
      try { await env.VAULT.put(cacheKey, audioBuf, { httpMetadata: { contentType: "audio/mpeg" } }); } catch {}
    }
    return { ok: true, cached: false, format: "mp3", voice: NATASHA, audio: b64(audioBuf), monthly: false };
  } catch (err) {
    return { ok: false, use_browser: true, voice: NATASHA, error: String(err && err.message || err) };
  }
}
