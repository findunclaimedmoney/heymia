const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function vaultBound(env) {
  return !!(env && env.VAULT && typeof env.VAULT.put === "function");
}
function dayKey(t) {
  return new Date(t || Date.now()).toISOString().slice(0, 10);
}
function agentName(a) {
  return String(a || "Mia").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "Mia";
}
function cut(s, n) {
  return String(s || "").slice(0, n);
}

export async function appendChat(env, agent, turns) {
  if (!vaultBound(env) || !turns || !turns.length) return { ok: false };
  const a = agentName(agent);
  const day = dayKey();
  const key = "mem/" + a + "/chat/" + day + ".json";
  let arr = [];
  try {
    const obj = await env.VAULT.get(key);
    if (obj) arr = JSON.parse(await obj.text()) || [];
  } catch {}
  const now = Date.now();
  for (const t of turns) {
    if (!t || !t.content) continue;
    arr.push({ t: now, role: t.role === "assistant" || t.role === "model" ? "assistant" : "user", content: cut(t.content, 4000) });
  }
  if (arr.length > 600) arr = arr.slice(-600);
  await env.VAULT.put(key, JSON.stringify(arr), { httpMetadata: { contentType: "application/json" } });
  return { ok: true, day, n: arr.length };
}

export async function loadChat(env, agent, limit) {
  limit = Math.min(Number(limit) || 80, 200);
  if (!vaultBound(env)) return { ok: true, turns: [], months: 12 };
  const a = agentName(agent);
  const listed = await env.VAULT.list({ prefix: "mem/" + a + "/chat/", limit: 400 });
  const cutoff = Date.now() - YEAR_MS;
  const keys = (listed.objects || [])
    .map((o) => o.key)
    .filter((k) => {
      const d = k.split("/").pop().replace(".json", "");
      const t = Date.parse(d);
      return !t || t >= cutoff;
    })
    .sort()
    .reverse();
  const turns = [];
  for (const key of keys) {
    if (turns.length >= limit) break;
    try {
      const obj = await env.VAULT.get(key);
      if (!obj) continue;
      const arr = JSON.parse(await obj.text()) || [];
      for (let i = arr.length - 1; i >= 0; i--) {
        const row = arr[i];
        if (!row || (row.t && row.t < cutoff)) continue;
        turns.unshift(row);
        if (turns.length >= limit) break;
      }
    } catch {}
  }
  return { ok: true, turns, months: 12, files: keys.length };
}

export async function saveFact(env, agent, key, value, category) {
  if (!vaultBound(env)) return { ok: false, error: "VAULT unbound" };
  const a = agentName(agent);
  const id = String(key || "note-" + Date.now()).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const rec = { t: Date.now(), key: id, value: cut(value, 4000), category: category || "training", agent: a };
  await env.VAULT.put("mem/" + a + "/facts/" + id + ".json", JSON.stringify(rec), {
    httpMetadata: { contentType: "application/json" },
  });
  return { ok: true, ...rec };
}

export async function searchYear(env, agent, query) {
  if (!vaultBound(env)) return { ok: true, memories: [] };
  const a = agentName(agent);
  const cutoff = Date.now() - YEAR_MS;
  const q = String(query || "").toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 8);
  const out = [];
  const facts = await env.VAULT.list({ prefix: "mem/" + a + "/facts/", limit: 400 });
  for (const o of facts.objects || []) {
    try {
      const obj = await env.VAULT.get(o.key);
      if (!obj) continue;
      const rec = JSON.parse(await obj.text());
      if (rec.t && rec.t < cutoff) continue;
      const blob = (rec.key + " " + rec.value).toLowerCase();
      if (!q.length || q.some((w) => blob.includes(w))) out.push(rec);
      if (out.length >= 24) break;
    } catch {}
  }
  if (out.length < 12 && q.length) {
    const chat = await loadChat(env, a, 60);
    for (const t of chat.turns || []) {
      const blob = String(t.content || "").toLowerCase();
      if (q.some((w) => blob.includes(w))) {
        out.push({ t: t.t, key: "chat", value: cut(t.content, 400), category: "chat", role: t.role });
      }
      if (out.length >= 24) break;
    }
  }
  return { ok: true, memories: out, months: 12 };
}

export async function yearBrief(env, agent, query) {
  const { trainingBrief } = await import("./training.js");
  const facts = await searchYear(env, agent, query || "");
  const core = await loadCoreFacts(env, agent);
  const chat = await loadChat(env, agent, 24);
  const factLines = [...core, ...(facts.memories || [])]
    .filter((m) => m && m.category !== "chat")
    .slice(0, 16)
    .map((m) => "- [" + (m.type || m.category || "note") + "] " + (m.key ? m.key + ": " : "") + cut(m.value, 280));
  const chatLines = (chat.turns || []).slice(-14).map((t) => (t.role === "assistant" ? "Mia: " : "John: ") + cut(t.content, 180));
  let text = trainingBrief();
  text += "\nTwelve-month memory is on. Do not ask the user to repeat stored facts.\n";
  if (factLines.length) text += "Persistent memories:\n" + uniqueLines(factLines).join("\n") + "\n";
  if (chatLines.length) text += "Recent conversation (retrieved, not invented):\n" + chatLines.join("\n") + "\n";
  return text;
}

async function loadCoreFacts(env, agent) {
  if (!vaultBound(env)) return [];
  const a = agentName(agent);
  const out = [];
  for (const id of ["os-core", "master-rule", "memory-protocol", "user-john", "preserve-first", "no-fake-done"]) {
    try {
      const obj = await env.VAULT.get("mem/" + a + "/facts/" + id + ".json");
      if (obj) out.push(JSON.parse(await obj.text()));
    } catch {}
  }
  return out;
}

function uniqueLines(arr) {
  const seen = new Set();
  return arr.filter((l) => {
    const k = l.slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function memoryReport(env, agent) {
  const a = agentName(agent);
  const chat = await loadChat(env, a, 80);
  const facts = await searchYear(env, a, "");
  const byType = {};
  for (const m of facts.memories || []) {
    const t = m.type || m.category || "note";
    byType[t] = (byType[t] || 0) + 1;
  }
  return {
    ok: true,
    months: 12,
    chat_turns: (chat.turns || []).length,
    chat_files: chat.files || 0,
    memories: (facts.memories || []).length,
    by_type: byType,
    last_chat: (chat.turns || []).slice(-1)[0] || null,
  };
}

export async function pruneYear(env, agent) {
  if (!vaultBound(env)) return { ok: false };
  const a = agentName(agent);
  const cutoff = Date.now() - YEAR_MS;
  let removed = 0;
  for (const prefix of ["mem/" + a + "/chat/", "mem/" + a + "/facts/"]) {
    const listed = await env.VAULT.list({ prefix, limit: 1000 });
    for (const o of listed.objects || []) {
      const day = (o.key.split("/").pop() || "").replace(".json", "");
      const t = Date.parse(day);
      if (t && t < cutoff) {
        await env.VAULT.delete(o.key);
        removed++;
      }
    }
  }
  return { ok: true, removed, keep_days: 365 };
}
