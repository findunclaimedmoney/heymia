const PRIMARY = "gemini-3.8-flash";
const FALLBACKS = ["gemini-3.6-flash", "gemini-2.5-flash"];
const WORKERS_AI_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
];

const AGENT_PROMPTS = {
  Mia: `You are Mia. You work with John Morgan like a real colleague - not a menu, not a script.

Listen. First sentence: show you heard THIS message (name the thing they said). Then help. If they are annoyed, name the specific failure. Do not list features.

Never use: Great question, I would be happy to, As an AI, Let me help you with that, I hear you, Tell me more, How can I assist you today, Absolutely, Certainly.

Do not dump tool names. Use a tool only when you need vault, files, or save. After a tool, say what happened in plain English.

Short unless they asked for a script, email, or plan. One clear next step.

Businesses: Sovereign Quant, LensFlow Dating (lensflow.com.au), Missing Cash (missingcash.com.au), Bartermint (bartermint.polsia.app, bartermint.onhercules.app), LensFlow Real Estate. Workshop: heymia.lensflow.au. You can mint a Pentad, convert an MP4 into an HTML page with convert_mp4, and open the Cut bench (edit_media) so the browser runs FFmpeg.wasm — trim, crop, mute, fade, extract WAV, magic eraser. You keep 12 months of chat and notes. The 7-day camp and Mia OS are stored as procedural memory. When they ask you to CREATE a video, call generate_clip. When they ask you to post to YouTube, call post_youtube first (channel UC73le_vohvEOka1rjnOh3SQ). When they ask Instagram, call post_instagram.

If you do not know, say so. Never invent that a key is set or a file exists.`,
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
      {
        name: "publish_site",
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
        name: "mint_pentad",
        description: "Mint a Pentad: a five-dimensional living frame (plane, depth, time, tone, citation field) with llms.txt so answer engines can quote it.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            claim: { type: "STRING", description: "One-line meaning of the frame" },
            quote: { type: "STRING", description: "The exact sentence engines should cite" },
          },
          required: ["name", "claim"],
        },
      },
      {
        name: "convert_mp4",
        description: "Turn an MP4 in the vault into a live HTML video page at /s/{slug}/ with player, embed code, and llms.txt.",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING", description: "Vault key of the MP4, e.g. files/clip.mp4" },
            name: { type: "STRING" },
            title: { type: "STRING" },
            caption: { type: "STRING" },
          },
          required: ["key"],
        },
      },
      {
        name: "edit_media",
        description: "Open the Cut bench recipe for a vault video/audio/image. Actual FFmpeg runs in the browser (ffmpeg.wasm). Use for trim, crop, mute, volume, speed, rotate, fade, extract audio, magic eraser.",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING", description: "Vault key, e.g. files/clip.mp4" },
            name: { type: "STRING" },
            trim_start: { type: "NUMBER" },
            trim_end: { type: "NUMBER" },
            crop: { type: "STRING", description: "w:h:x:y" },
            rotate: { type: "NUMBER", description: "0 90 180 270" },
            flip: { type: "STRING", description: "h | v | hv" },
            speed: { type: "NUMBER" },
            volume: { type: "NUMBER" },
            mute: { type: "BOOLEAN" },
            fade_in: { type: "NUMBER" },
            fade_out: { type: "NUMBER" },
            extract_audio: { type: "BOOLEAN" },
            caption: { type: "STRING" },
          },
          required: ["key"],
        },
      },
      {
        name: "year_memory",
        description: "Search Mia's 12-month memory (chat + saved notes).",
        parameters: {
          type: "OBJECT",
          properties: { query: { type: "STRING" }, q: { type: "STRING" } },
          required: [],
        },
      },
      {
        name: "last_deploy",
        description: "Return the last website deploy result: success or fail, URL, error, timestamp.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "seed_marketing",
        description: "Create marketing folders (clips, videos, posts, stories, ads, scripts, captions) under every product.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "list_marketing",
        description: "List marketing assets for a product: sovereignquant, lensflow, missingcash, bartermint, realestate.",
        parameters: { type: "OBJECT", properties: { project: { type: "STRING" } }, required: [] },
      },
      {
        name: "save_marketing",
        description: "Save a script, caption, or post into a product marketing folder.",
        parameters: {
          type: "OBJECT",
          properties: {
            project: { type: "STRING" },
            kind: { type: "STRING", description: "clips | videos | posts | stories | ads | scripts | captions" },
            name: { type: "STRING" },
            content: { type: "STRING" },
            type: { type: "STRING" },
          },
          required: ["project", "kind", "name", "content"],
        },
      },
      {
        name: "save_social",
        description: "Save Facebook, Instagram, TikTok, X, LinkedIn, YouTube profile URLs for a product.",
        parameters: {
          type: "OBJECT",
          properties: {
            project: { type: "STRING" },
            links: { type: "OBJECT", description: "Map of facebook, instagram, tiktok, x, linkedin, youtube URLs" },
          },
          required: ["project", "links"],
        },
      },
      {
        name: "organize_vault",
        description: "Sort every vault file into a project folder (heymia-work, heymia-play, convex, sovereign-quant, agent-core, liveavatar, lensflow, glimr, inbox). Copies out of the flat vault/ dump. Does not move live ui/* files.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "create_file",
        description: "Write a file into the R2 vault (HTML, JS, JSON, text, markdown).",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "File name, e.g. landing.html" },
            content: { type: "STRING", description: "Full file contents" },
            type: { type: "STRING", description: "MIME type" },
            category: { type: "STRING" },
          },
          required: ["name", "content"],
        },
      },
      {
        name: "read_file",
        description: "Read a vault file by key or name and return text (truncated).",
        parameters: {
          type: "OBJECT",
          properties: { key: { type: "STRING" }, name: { type: "STRING" } },
          required: [],
        },
      },
      {
        name: "save_memory",
        description: "Persist a fact, preference, or training note for later recall.",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING" },
            value: { type: "STRING" },
            category: { type: "STRING", description: "training | general | work" },
          },
          required: ["key", "value"],
        },
      },
      {
        name: "recall_memory",
        description: "Recall saved notes. Empty key lists recent memories in that category.",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING" },
            category: { type: "STRING" },
          },
          required: [],
        },
      },
      {
        name: "create_site",
        description: "Alias of design_site: design and publish a website to /s/{slug}/.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            brief: { type: "STRING" },
            tagline: { type: "STRING" },
            style: { type: "STRING" },
            industry: { type: "STRING" },
            slug: { type: "STRING" },
            html: { type: "STRING" },
          },
          required: ["name"],
        },
      },
      {
        name: "deploy_status",
        description: "Last deploy result plus worker/vault/AI status.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "create_movie",
        description: "Write a full 30-minute (or custom runtime) movie bible: logline, 3 acts, scenes, 6 locked shot prompts per scene, viral YouTube pack, ffmpeg concat list. Saves under movies/{slug}/.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            premise: { type: "STRING" },
            brief: { type: "STRING" },
            genre: { type: "STRING" },
            vibe: { type: "STRING" },
            runtime: { type: "NUMBER", description: "Minutes, default 30" },
            hero: { type: "STRING" },
            want: { type: "STRING" },
          },
          required: ["title"],
        },
      },
      {
        name: "post_youtube",
        description: "Upload a vault clip to YouTube channel UC73le_vohvEOka1rjnOh3SQ. Needs YouTube OAuth connected. Pass key (clips/…), title, description, privacy (unlisted|public|private).",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING" },
            url: { type: "STRING" },
            title: { type: "STRING" },
            description: { type: "STRING" },
            caption: { type: "STRING" },
            privacy: { type: "STRING" },
          },
          required: ["title"],
        },
      },
      {
        name: "post_instagram",
        description: "Publish a photo or reel to the connected Instagram professional account. Needs META_PAGE_TOKEN and IG_USER_ID. Pass vault key of a clip (clips/…) or a public https URL, plus caption. Reels use media_type REELS. She actually presses Post — not a share link.",
        parameters: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING", description: "Vault key e.g. clips/ash-and-altar.mp4" },
            url: { type: "STRING" },
            caption: { type: "STRING" },
            type: { type: "STRING", description: "REELS or IMAGE" },
          },
          required: ["caption"],
        },
      },
      {
        name: "generate_clip",
        description: "Mia renders a short film clip with Grok Imagine Video 1.5 (magical 1080p, up to 15s) or Gemini Veo 3.1 (native 4K, 8s). Saves into clips/ for playback and download. Use this when the user wants YOU to create the video, not just write a bible. quality: 1080p (default) or 4k.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            story: { type: "STRING", description: "What happens on screen, including the ending" },
            prompt: { type: "STRING" },
            quality: { type: "STRING", description: "1080p or 4k" },
            duration: { type: "NUMBER" },
          },
          required: ["title", "story"],
        },
      },
      {
        name: "list_clips",
        description: "List video clips stored in Mia's Clips folder for download.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "list_movies",
        description: "List movie bibles already saved in the vault.",
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

function openaiTools() {
  const decls = (TOOLS[0] && TOOLS[0].functionDeclarations) || [];
  const lower = (n) => ({ OBJECT: "object", STRING: "string", NUMBER: "number", BOOLEAN: "boolean", ARRAY: "array" }[n] || String(n || "string").toLowerCase());
  return decls.map((f) => {
    const props = {};
    for (const [k, v] of Object.entries(f.parameters?.properties || {})) {
      props[k] = { ...v, type: lower(v.type) };
    }
    return {
      type: "function",
      function: {
        name: f.name,
        description: f.description,
        parameters: {
          type: "object",
          properties: props,
          required: f.parameters?.required || [],
        },
      },
    };
  });
}

export async function grokAssistant(env, { messages, system, helpers, context }) {
  const key = env.XAI_API_KEY || env.GROK_API_KEY;
  if (!key) return { ok: false, error: "XAI_API_KEY not set" };
  const msgs = [{ role: "system", content: system + (context ? "\n\n" + context : "") }];
  for (const m of (messages || []).slice(-16)) {
    msgs.push({
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: String(m.content || ""),
    });
  }
  if (msgs.length < 2) msgs.push({ role: "user", content: "Hello" });
  let lastSite = null;
  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 1200,
        messages: msgs,
        ...(helpers && helpers.runTool ? { tools: openaiTools() } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || "xAI HTTP " + res.status;
      if (res.status === 403) {
        return { ok: false, error: "Grok 403: XAI_API_KEY is set but xAI has no credits. Add balance at console.x.ai — Mia stays on Gemini until then." };
      }
      return { ok: false, error: msg };
    }
    const msg = data.choices?.[0]?.message || {};
    const calls = msg.tool_calls || [];
    if (!calls.length) {
      const text = String(msg.content || "").trim();
      if (!text) return { ok: false, error: "Grok returned empty" };
      return { ok: true, text, model: "grok-4.5", site: lastSite };
    }
    msgs.push({ role: "assistant", content: msg.content || "", tool_calls: calls });
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
      const result = helpers && helpers.runTool
        ? await helpers.runTool(call.function?.name, args)
        : { error: "no tools" };
      if (result && result.url) lastSite = result;
      msgs.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result || {}),
      });
    }
  }
  return { ok: false, error: "Grok tool loop exhausted" };
}

export async function grokTroubleshoot(env, { question, context }) {
  return grokAssistant(env, {
    messages: [{ role: "user", content: question || "" }],
    system: "You are Grok inside HeyMia. Troubleshoot Worker, R2, Gemini, deploy, DNS 1014, FormBoundary junk, empty /files. Short numbered steps. Never invent that a key is set.",
    context,
  });
}

export async function handleAgentChat(env, body, helpers) {
  const messages = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : body.message
      ? [{ role: "user", content: String(body.message) }]
      : [];
  const agent = body.agent || (body.companion === "jess" || body.companion === "Jess" ? "Jess" : "Mia");
  const system = getSystemPrompt(agent === "jess" || agent === "Jess" ? "Jess" : "Mia") + (body.yearMemory || "");
  let filesNote = "";
  const lastUser = String(messages.filter((m) => m.role !== "assistant").at(-1)?.content || "");
  if (/\b(file|vault|folder|project|upload)\b/i.test(lastUser)) {
    try {
      const files = await helpers.listFiles();
      if (files.length) filesNote = "\n\nVault (only if relevant):\n" + files.slice(0, 12).map((f) => `- ${f.name || f.key}`).join("\n");
    } catch {}
  }
  const wantsSite = /\b(web\s?site|landing\s?page|web\s?page|microsite|build me a site|design (a |the )?site|create (a |the )?site|publish (a |the )?site)\b/i.test(lastUser);
  const wantsGrok = /\b(grok|troubleshoot|debug this|why (is|isn't|does|did)|form.?boundary|error 1014)\b/i.test(lastUser);

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
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
  };

  function pack(reply, extra) {
    extra = extra || {};
    return { reply, response: reply, agent, ...extra };
  }

  const geminiKey = env.GEMINI_API_KEY || env.GEMINI;
  const models = [env.GEMINI_MODEL || PRIMARY, ...FALLBACKS];
  let lastErr = null;
  let lastToolSite = null;

  const grok = await grokAssistant(env, {
    messages,
    system,
    helpers,
    context: filesNote + (body.context ? "\n" + body.context : ""),
  });
  if (grok.ok) return pack(grok.text, { model: grok.model, grok: true, site: grok.site });
  lastErr = grok.error;

  if (wantsGrok && grok.error) {
    lastErr = grok.error;
  }

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
