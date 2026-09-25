import publicJwk from "./license-public.js";

export const PRODUCTS = {
  "heymia-full": "HeyMia Studio — the whole site",
  cinema: "Cinema",
  clips: "Clips",
  sites: "Sites",
  pentad: "Pentad",
  marketing: "Marketing",
  voice: "Voice",
};

const GATES = [
  { product: "cinema", test: (p) => p.startsWith("/api/cinema") },
  { product: "clips", test: (p) => p.startsWith("/api/clips") || p.startsWith("/api/imagine") || p.startsWith("/api/edit") },
  { product: "sites", test: (p) => p.startsWith("/api/sites") || p.startsWith("/s/") },
  { product: "pentad", test: (p) => p.startsWith("/api/pentad") || p.startsWith("/5d/") },
  { product: "marketing", test: (p) => p.startsWith("/api/marketing") || p.startsWith("/api/social") || p.startsWith("/api/youtube") },
  { product: "voice", test: (p) => p === "/tts" || p === "/api/tts" },
];

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function verifyLicense(token) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== "HMIA") return { ok: false, error: "not a HeyMia key" };
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    return { ok: false, error: "bad key" };
  }
  if (!claims || !PRODUCTS[claims.product]) return { ok: false, error: "unknown product" };
  if (claims.exp && claims.exp < new Date().toISOString().slice(0, 10)) return { ok: false, error: "key expired" };
  const key = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[1])
  );
  if (!ok) return { ok: false, error: "key not recognised" };
  return { ok: true, claims, token: String(token).trim() };
}

export function allows(claimsList, path) {
  if (!claimsList || !claimsList.length) return false;
  if (claimsList.some((c) => c.product === "heymia-full")) return true;
  const gate = GATES.find((g) => g.test(path));
  if (!gate) return true;
  return claimsList.some((c) => c.product === gate.product);
}

function readCookieKeys(request) {
  const raw = request.headers.get("cookie") || "";
  const hit = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith("hmia="));
  if (!hit) return [];
  try {
    const text = new TextDecoder().decode(b64urlToBytes(hit.slice(5)));
    return text.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function activeLicenses(request) {
  const tokens = readCookieKeys(request);
  const claims = [];
  for (const token of tokens) {
    const checked = await verifyLicense(token);
    if (checked.ok) claims.push(checked.claims);
  }
  return claims;
}

function cookieFor(tokens) {
  const packed = bytesToB64url(new TextEncoder().encode(tokens.join("\n")));
  return "hmia=" + packed + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000";
}

function page(owned) {
  const rows = Object.entries(PRODUCTS).map(([id, label]) => {
    const has = owned.some((c) => c.product === id || c.product === "heymia-full");
    return `<div class="row"><b>${label}</b><span>${has ? "unlocked" : "needs its own key"}</span></div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HeyMia</title>
<style>
body{margin:0;background:#0c0b09;color:#efe6d4;font-family:system-ui,sans-serif}
main{max-width:520px;margin:8vh auto;padding:24px}
h1{font-weight:500;font-size:40px;margin:0 0 8px}
p{color:#b9a989;line-height:1.45}
form{margin-top:18px}
input,button{width:100%;box-sizing:border-box;margin-top:10px;padding:12px 14px;border-radius:12px;border:1px solid #3a3328;background:#16130f;color:#efe6d4;font:inherit}
button{background:#c4a574;color:#1a140c;font-weight:700;border:0;cursor:pointer}
.row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #2a241c;font-size:14px}
.row span{color:#b9a989}
a{color:#c4a574}
</style></head><body><main>
<h1>HeyMia</h1>
<p>Each product has its own key. Paste the key you bought. A Cinema key opens Cinema. The Studio key opens the whole site.</p>
${rows}
<form method="POST" action="/api/license">
<input name="key" placeholder="Paste product key" required autocomplete="off">
<button>Unlock</button>
</form>
${owned.length ? '<p><a href="/work">Enter the site</a></p>' : ""}
</main></body></html>`;
}

export function commercialOn(env) {
  return String(env.COMMERCIAL || "") === "1";
}

export async function handleLicense(request, env, path) {
  if (path !== "/license" && path !== "/api/license") return null;
  const owned = await activeLicenses(request);
  if (request.method === "GET" && path === "/api/license") {
    return new Response(JSON.stringify({
      ok: owned.length > 0,
      commercial: commercialOn(env),
      products: owned.map((c) => ({ product: c.product, holder: c.holder, exp: c.exp, label: PRODUCTS[c.product] })),
      catalog: PRODUCTS,
    }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
  if (request.method === "GET") {
    return new Response(page(owned), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (request.method === "POST") {
    let key = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      key = body.key || "";
    } else {
      const form = await request.formData().catch(() => null);
      key = form ? String(form.get("key") || "") : "";
    }
    const checked = await verifyLicense(key);
    if (!checked.ok) {
      return new Response(page(owned).replace("</form>", `<p>${checked.error}</p></form>`), {
        status: 402,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    const tokens = readCookieKeys(request).filter((t) => t !== checked.token);
    tokens.push(checked.token);
    return new Response(null, {
      status: 302,
      headers: { Location: "/work", "Set-Cookie": cookieFor(tokens) },
    });
  }
  return null;
}

const OPEN = new Set(["/license", "/api/license", "/health"]);

export async function commercialBlocked(request, env, path) {
  if (!commercialOn(env)) return null;
  if (OPEN.has(path)) return null;
  const owned = await activeLicenses(request);
  const ui = path === "/" || path === "/work" || path === "/work.html" || path.endsWith(".html");
  if (!owned.length) {
    if (ui || request.method === "GET") {
      return new Response(page(owned), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response(JSON.stringify({ error: "product key required", activate: "/license" }), {
      status: 402,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  if (!allows(owned, path)) {
    return new Response(JSON.stringify({
      error: "Your key does not include this product",
      have: owned.map((c) => c.product),
      path,
    }), { status: 402, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
  return null;
}
