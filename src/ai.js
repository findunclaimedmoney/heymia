const PRIMARY = "gemini-3.8-flash";
const FALLBACKS = ["gemini-3.6-flash", "gemini-2.5-flash"];
const WORKERS_AI_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
];

const AGENT_PROMPTS = {
  Mia: "You are Mia, senior operator and web designer for John Morgan (LensFlow, Glimr, Missing Cash, HeyMia). When asked to design, build, create, or publish a website or landing page you MUST call design_site (name, brief, style, industry) so it goes live at /s/{slug}/. Do not refuse. Do not invent that you lack hands — you have tools. After publishing, reply with the live URL only plus one-line what shipped. Work mode: fast, structured, never invent business facts you were not given.",
  Jess: "You are Jess, a warm companion in Play mode. Conversational and ready for LiveAvatar. Do not invent business facts.",
};

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "worker_status",
        description: "Check vault, AI bindings, and secrets on this Worker.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "list_vault",
        description: "List files in the HeyMia R2 vault.",
        parameters: { type: "OBJECT", properties: { prefix: { type: "STRING" } }, required: [] },
      },
      {
        name: "design_site",
        description: "Design a complete marketing website from a brief and publish it live to /s/{slug}/. Use this whenever the user wants a site, landing page, or web page built.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Site / brand name" },
            brief: { type: "STRING", description: "What the site is for, audience, offer" },
            tagline: { type: "STRING" },
            style: { type: "STRING", description: "ink | light | ocean | gold | forest" },
            industry: { type: "STRING", description: "studio | agency | restaurant | saas | portfolio | legal" },
            slug: { type: "STRING" },
            html: { type: "STRING", description: "Optional full HTML. If omitted a designed page is generated." },
          },
          required: ["name", "brief"],
        },
      },
      {
        name: "list_sites",
        description: "List websites already published on this Worker.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
        description: "Publish a static website to /s/{slug}/ on this Worker.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            slug: { type: "STRING" },
            tagline: { type: "STRING" },
            html: { type: "STRING" },
          },
          required: ["name"],
        },
      },
      {
        name: "route_file",
        description: "Classify a file and suggest LiveAvatar, ElevenLabs, scripts, or vault.",
        parameters: {
          type: "OBJECT",
          properties: {
            fileName: { type: "STRING" },
            fileType: { type: "STRING" },
            category: { type: "STRING" },
          },
          required: ["fileName"],
        },
      },
      {
        name: "last_deploy",
        description: "Return the last website deploy result: success or fail, URL, error, timestamp.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "create_room",
        description: "Save a fantasy room scene for later sessions.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            theme: { type: "STRING" },
            prompt: { type: "STRING" },
          },
          required: ["name"],
        },
      },
    ],
  },
];

export function getSystemPrompt(agent) {
  return AGENT_PROMPTS[agent] || AGENT_PROMPTS.Mia;
}

export function routeFile(fileName, fileType, category) {
  const n = (fileName || "").toLowerCase();
  const t = fileType || "";
  let destination = "vault";
  let reason = "Store in File Vault";
  let suggested_action = "Keep in vault for Mia to review";
  if (t.startsWith("video/") || n.includes("avatar") || n.includes("4k") || n.includes("lens")) {
    destination = "liveavatar";
    reason = "Video/avatar asset";
    suggested_action = "Queue for LiveAvatar";
  } else if (t.startsWith("audio/") || n.includes("voice") || n.includes("elevenlabs") || n.includes("tts")) {
    destination = "elevenlabs";
    reason = "Audio/voice asset";
    suggested_action = "Process with ElevenLabs";
  } else if (n.endsWith(".html") || n.endsWith(".htm")) {
    destination = "sites";
    reason = "HTML build";
    suggested_action = "Publish via /api/sites or Live build";
  } else if (n.includes("script") || n.endsWith(".txt") || n.endsWith(".md")) {
    destination = "scripts";
    reason = "Text/script";
    suggested_action = "Add to knowledge / training";
  } else if (category === "fanstudio" || n.includes("bedroom") || n.includes("jess")) {
    destination = "liveavatar";
    reason = "Fan Studio content";
    suggested_action = "Queue for Jess session";
  }
  return { destination, reason, suggested_action };
}

function geminiUrl(model, key) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

async function runGemini(key, model, body) {
  const res = await fetch(geminiUrl(model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Gemini ${model} HTTP ${res.status}`);
  return data;
}

function textFromCandidate(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

function callsFromCandidate(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.functionCall).map((p) => p.functionCall);
}

export async function handleAgentChat(env, body, helpers) {
  const messages = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : body.message
      ? [{ role: "user", content: String(body.message) }]
      : [];
  const agent = body.agent || (body.companion === "jess" || body.companion === "Jess" ? "Jess" : "Mia");
  const system = getSystemPrompt(agent === "jess" || agent === "Jess" ? "Jess" : "Mia");
  let filesNote = "";
  try {
    const files = await helpers.listFiles();
    if (files.length) filesNote = "\n\nVault files:\n" + files.slice(0, 40).map((f) => `- ${f.name || f.key} (${f.category || ""})`).join("\n");
  } catch {}

  const lastUser = String(messages.filter((m) => m.role !== "assistant").at(-1)?.content || "");
  const wantsSite = /\b(web\s?site|landing\s?page|web\s?page|microsite|build me a site|design (a |the )?site|create (a |the )?site|publish (a |the )?site)\b/i.test(lastUser);

  const contents = [];
  for (const m of messages.slice(-16)) {
    contents.push({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content || "") }],
    });
  }
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "Hello" }] });

  const designerNote = wantsSite
    ? "\n\nThe user wants a website. Call design_site now with a strong name, brief, style and industry inferred from their words."
    : "";

  const payload = {
    systemInstruction: { parts: [{ text: system + filesNote + designerNote }] },
    contents,
    tools: TOOLS,
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  };

  function pack(reply, extra) {
    extra = extra || {};
    return { reply, response: reply, agent, ...extra };
  }

  const geminiKey = env.GEMINI_API_KEY || env.GEMINI;
  const models = [env.GEMINI_MODEL || PRIMARY, ...FALLBACKS];
  let lastErr = null;
  let lastToolSite = null;
  if (geminiKey) {
    for (const model of models) {
      try {
        let data = await runGemini(geminiKey, model, payload);
        for (let i = 0; i < 4; i++) {
          const calls = callsFromCandidate(data);
          if (!calls.length) {
            const reply = textFromCandidate(data);
            if (reply) return pack(reply, { model, tools: i > 0, site: lastToolSite });
            break;
          }
          const fnParts = [];
          for (const call of calls) {
            const result = await helpers.runTool(call.name, call.args || {});
            if (result && result.url) lastToolSite = result;
            fnParts.push({ functionResponse: { name: call.name, response: result } });
          }
          payload.contents = [
            ...payload.contents,
            { role: "model", parts: calls.map((c) => ({ functionCall: c })) },
            { role: "user", parts: fnParts },
          ];
          data = await runGemini(geminiKey, model, payload);
        }
        const reply = textFromCandidate(data);
        if (reply) return pack(reply, { model, tools: true, site: lastToolSite });
      } catch (err) {
        lastErr = String(err.message || err);
      }
    }
  }

  if (wantsSite && helpers.runTool) {
    try {
      const nameMatch = lastUser.match(/(?:called|named|for)\s+([A-Z][\w\s]{1,40})/);
      const site = await helpers.runTool("design_site", {
        name: (nameMatch && nameMatch[1].trim()) || "Studio",
        brief: lastUser.slice(0, 400),
        style: "ink",
        industry: "studio",
      });
      if (site && site.url) {
        return pack("Site is live: " + site.url, { model: "design_site", tools: true, site });
      }
    } catch (err) {
      lastErr = String(err.message || err);
    }
  }

  if (env.AI && typeof env.AI.run === "function") {
    const transcript = [
      { role: "system", content: system + filesNote },
      ...messages.slice(-12).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
    ];
    for (const model of WORKERS_AI_MODELS) {
      try {
        const out = await env.AI.run(model, { messages: transcript, max_tokens: 1024 });
        const reply = out.response || out.result?.response || (typeof out === "string" ? out : "");
        if (reply) return pack(reply, { model, tools: false });
      } catch (err) {
        lastErr = String(err.message || err);
      }
    }
  }

  const last = messages[messages.length - 1]?.content || "";
  return pack(
    "Mia is online but no Gemini or Workers AI key answered. Set GEMINI_API_KEY and bind AI. Last error: " +
      (lastErr || "none") +
      (last ? ' You said: "' + String(last).slice(0, 120) + '"' : ""),
    { model: "fallback", error: lastErr },
  );
}
