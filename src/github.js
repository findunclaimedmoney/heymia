const READ = new Set(["findunclaimedmoney/heymia", "findunclaimedmoney/lensflow-backend"]);
const WRITE = new Set(["findunclaimedmoney/heymia"]);

function token(env) {
  return env.GITHUB_TOKEN || env.GH_TOKEN || env.GITHUB_PAT || "";
}

function repoOf(args, write) {
  const repo = String(args.repo || "findunclaimedmoney/heymia")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const allow = write ? WRITE : READ;
  if (!allow.has(repo)) {
    return { error: (write ? "Write is only allowed on findunclaimedmoney/heymia. " : "Repo not permitted. ") + repo };
  }
  return { repo };
}

function cleanPath(p, allowEmpty) {
  const path = String(p || "").replace(/^\/+/, "");
  if (path.includes("..") || /(^|\/)\.env|id_rsa|credentials|\.pem$/i.test(path)) return null;
  if (!path && !allowEmpty) return null;
  return path;
}

async function gh(env, method, path, body) {
  const key = token(env);
  if (!key) return { ok: false, status: 0, data: { message: "GITHUB_TOKEN is not on the Worker." } };
  const res = await fetch("https://api.github.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      Accept: "application/vnd.github+json",
      "User-Agent": "heymia",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function toB64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64) {
  const bin = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function githubReady(env) {
  return !!token(env);
}

export async function githubList(env, args) {
  const gate = repoOf(args || {}, false);
  if (gate.error) return gate;
  const path = cleanPath((args && args.path) || "", true);
  if (path == null) return { error: "bad path" };
  const got = await gh(env, "GET", "/repos/" + gate.repo + "/contents" + (path ? "/" + path : "") + "?ref=main");
  if (!got.ok) return { error: got.data.message || "GitHub HTTP " + got.status, repo: gate.repo };
  const rows = Array.isArray(got.data) ? got.data : [got.data];
  return {
    ok: true,
    repo: gate.repo,
    entries: rows.map((r) => ({ name: r.name, path: r.path, type: r.type, size: r.size || 0 })),
  };
}

export async function githubRead(env, args) {
  const gate = repoOf(args || {}, false);
  if (gate.error) return gate;
  const path = cleanPath(args && args.path);
  if (path == null) return { error: "bad path" };
  const got = await gh(env, "GET", "/repos/" + gate.repo + "/contents/" + path + "?ref=main");
  if (!got.ok) return { error: got.data.message || "GitHub HTTP " + got.status, repo: gate.repo, path };
  if (got.data.type !== "file" || !got.data.content) return { error: "not a file", path };
  const text = fromB64(got.data.content);
  return { ok: true, repo: gate.repo, path, sha: got.data.sha, bytes: text.length, content: text.slice(0, 20000) };
}

export async function githubWrite(env, args) {
  const gate = repoOf(args || {}, true);
  if (gate.error) return gate;
  const path = cleanPath(args && args.path);
  if (path == null) return { error: "bad path" };
  const content = String(args.content ?? "");
  if (!content) return { error: "empty content" };
  if (content.length > 120000) return { error: "file too large" };
  const prior = await gh(env, "GET", "/repos/" + gate.repo + "/contents/" + path + "?ref=main");
  const sha = prior.ok && prior.data && prior.data.sha ? prior.data.sha : "";
  const body = {
    message: String(args.message || "Mia: " + path).slice(0, 140),
    content: toB64(content),
    branch: "main",
  };
  if (sha) body.sha = sha;
  const put = await gh(env, "PUT", "/repos/" + gate.repo + "/contents/" + path, body);
  if (!put.ok) return { error: put.data.message || "GitHub HTTP " + put.status, repo: gate.repo, path };
  return {
    ok: true,
    repo: gate.repo,
    path,
    commit: put.data.commit && put.data.commit.sha,
    url: put.data.content && put.data.content.html_url,
  };
}
