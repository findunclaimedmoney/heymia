function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "film";
}

const LOCK =
  "cinematic 2.39:1 anamorphic, 35mm grain, volumetric light, practical lamps only, continuity of face/wardrobe/time-of-day, no text, no watermark, no logo";

const ENGINES = [
  { name: "Kling", url: "https://klingai.com", use: "8s motion shots, character lock" },
  { name: "Runway Gen-4", url: "https://runwayml.com", use: "camera moves, act2 coverage" },
  { name: "Luma Ray", url: "https://lumalabs.ai/dream-machine", use: "dream physics, magic beats" },
  { name: "Hailuo", url: "https://hailuoai.video", use: "cheap volume, B-roll" },
  { name: "Pika", url: "https://pika.art", use: "stylised inserts" },
  { name: "CapCut", url: "https://www.capcut.com", use: "captions, beat-cut, 1080 export" },
  { name: "ElevenLabs", url: "https://elevenlabs.io/app/speech-synthesis", use: "dialogue + VO" },
  { name: "Suno", url: "https://suno.com", use: "score + stingers" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function sceneFn(i, n) {
  const t = i / Math.max(1, n - 1);
  if (i === 0) return "cold_open";
  if (t < 0.12) return "world";
  if (t < 0.22) return "inciting";
  if (t < 0.4) return "fun_and_games";
  if (t < 0.5) return "midpoint";
  if (t < 0.68) return "bad_guys_close";
  if (t < 0.78) return "dark_night";
  if (t < 0.92) return "climax";
  return "button";
}

function purposeOf(fn) {
  return {
    cold_open: "Pattern interrupt in 3 seconds. No credits. Promise the whole movie.",
    world: "Ordinary world in one image. Who they are before the door.",
    inciting: "The impossible thing happens. They cannot go back.",
    fun_and_games: "Wonder + rules of the magic. Pattern interrupt every 8s.",
    midpoint: "False victory or true cost. Open a loop that pays at climax.",
    bad_guys_close: "Pressure. Time, antagonist, or the magic turning.",
    dark_night: "They almost quit. Quiet. One line of dialogue.",
    climax: "Payoff of the cold-open image. Reverse it.",
    button: "Sequel hook + end-screen. 8 seconds. No speech.",
  }[fn];
}

function shotFor(fn, ctx, beat) {
  const { hero, lock, genre, title } = ctx;
  const look = {
    cold_open: `Extreme close-up of ${hero}'s eye reflecting an impossible door. Smash to wide. ${lock}.`,
    world: `${hero} in their real room at blue hour, one practical lamp, dust in the beam. ${lock}.`,
    inciting: `The door appears where a wall should be. Handheld push-in, 24fps, ${genre} lighting. ${lock}.`,
    fun_and_games: `Steadicam follow ${hero} through the other side — scale shift, impossible architecture. ${lock}.`,
    midpoint: `Overhead crane: ${hero} realises the cost. Slow dolly. ${lock}.`,
    bad_guys_close: `Cross-cut: the thing hunting them vs ${hero} running a corridor that loops. ${lock}.`,
    dark_night: `Static wide, ${hero} small in frame, rain or ash, one breath. ${lock}.`,
    climax: `The cold-open image reversed: ${hero} now on the other side of the eye/door. 48fps ramp to 24. ${lock}.`,
    button: `The door closes. Hold 8 frames of black. ${title} mark as a light leak, not a title card. ${lock}.`,
  };
  return {
    camera: beat % 2 ? "24mm anamorphic push" : "85mm close, shallow",
    motion: beat % 3 === 0 ? "slow dolly in" : beat % 3 === 1 ? "handheld breathe" : "locked-off",
    prompt: look[fn],
    interrupt: beat % 2 === 0 ? "hard cut on a sound design sting" : "match-cut on eye-line",
  };
}

function dialogueFor(fn, ctx) {
  const { hero, want } = ctx;
  return {
    cold_open: `${hero}: Don't blink.`,
    world: `${hero}: If I don't go, I'll dream it anyway.`,
    inciting: `${hero}: That's my wall. That's not my wall.`,
    fun_and_games: `${hero}: The rules are simple. Don't look back at the door.`,
    midpoint: `${hero}: It wanted ${want}. It used me to get it.`,
    bad_guys_close: `Voice: You can keep the movie. We keep you.`,
    dark_night: `${hero}: I came for magic. I stay for the people in it.`,
    climax: `${hero}: Lights up.`,
    button: ``,
  }[fn];
}

export function planMovie(input = {}) {
  const title = String(input.title || "The Door That Shouldn't").slice(0, 80);
  const premise = String(input.premise || input.brief || "A seeker finds a door in a wall that never had one, and the other side is a movie that watches back.").slice(0, 1200);
  const genre = String(input.genre || "magical realism").slice(0, 48);
  const vibe = String(input.vibe || "wonder, dread, payoff").slice(0, 80);
  const minutes = Math.max(8, Math.min(90, Number(input.runtime) || 30));
  const hero = String(input.hero || "the seeker").slice(0, 48);
  const want = String(input.want || "the one true thing on the other side").slice(0, 80);
  const n = minutes <= 12 ? 9 : minutes <= 20 ? 12 : minutes <= 40 ? 18 : 24;
  const sceneLen = Math.max(20, Math.round((minutes * 60) / n));
  const slug = slugify(title);
  const ctx = { title, premise, genre, vibe, hero, want, lock: LOCK };
  const scenes = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    const fn = sceneFn(i, n);
    const shots = [0, 1, 2, 3, 4, 5].map((k) => {
      const s = shotFor(fn, ctx, i + k);
      return {
        id: `s${pad(i + 1)}-${k + 1}`,
        dur: Math.max(5, Math.round(sceneLen / 6)),
        camera: s.camera,
        motion: s.motion,
        interrupt: s.interrupt,
        prompt: s.prompt + ` Shot ${k + 1}/6 of scene ${i + 1}. Keep ${hero} wardrobe identical.`,
      };
    });
    scenes.push({
      id: "sc-" + pad(i + 1),
      index: i + 1,
      start: t,
      duration: sceneLen,
      fn,
      purpose: purposeOf(fn),
      location: i === 0 ? "the real room" : fn === "button" ? "black / light leak" : "the other side",
      dialogue: dialogueFor(fn, ctx),
      music: fn === "dark_night" ? "near silence, one cello" : fn === "climax" ? "full theme, no lyrics" : "pulse under, no vocal",
      shots,
    });
    t += sceneLen;
  }
  const hook3 = `A door where a wall should be. ${hero} looks at us. Cut.`;
  const hook15 = `${title}: ${premise.split(".")[0]}. Stay for the reverse of the first image.`;
  return {
    ok: true,
    slug,
    title,
    logline: `${hero} wants ${want}. A ${genre} ${minutes}-minute film: ${premise.slice(0, 180)}`,
    premise,
    genre,
    vibe,
    runtime_min: minutes,
    runtime_sec: t,
    hero,
    want,
    lock: LOCK,
    hook_3s: hook3,
    hook_15s: hook15,
    characters: [
      { name: hero, look: `lead, 20s–40s, one signature coat, one scar or jewel you never change, ${LOCK}`, voice: "close-mic, dry, no announcer", want },
      { name: "the door", look: "architecture as antagonist, brass, wrong geometry", voice: "sub-bass, not words", want: "to be looked at" },
    ],
    acts: [
      { name: "I · Door", minutes: Math.round(minutes * 0.25), until: "they step through" },
      { name: "II · Other side", minutes: Math.round(minutes * 0.5), until: "the midpoint cost" },
      { name: "III · Reverse", minutes: Math.round(minutes * 0.25), until: "the first image pays off" },
    ],
    scenes,
    viral: {
      retention: [
        "No logo in first 8s",
        "Hard cut every 8s in Act I",
        "Open loop at 90s, pay at climax",
        "Midpoint at 50% runtime on a visual rhyme with shot 1",
        "Captions burned, 6 words max, never covering eyes",
      ],
      youtube: {
        title: `${title} — a ${minutes}-minute ${genre} film`,
        description: `${hook15}\n\n0:00 Cold open\n${pad(Math.round(minutes * 0.25))}:00 Act II\n${pad(Math.round(minutes * 0.5))}:00 Midpoint\n${pad(Math.round(minutes * 0.78))}:00 Climax\n\nShot on HeyMia Cinema · ${genre}`,
        tags: [genre, "short film", "AI film", title, hero, "magical realism", "cinematic"],
        thumbnails: [
          `${hero} face 60% of frame, the door tiny in the pupil, orange vs teal, 3-word title overlay only on YouTube not in the video`,
          `wide: ${hero} standing in a room that is also a sky, high contrast, no text`,
          `the reversed cold-open still, desaturated, one red practical`,
        ],
      },
      shorts: [
        { at: "0:00", hook: hook3, dur: 12 },
        { at: midpointLabel(minutes), hook: "The cost. Then cut to black for 4 frames.", dur: 15 },
        { at: climaxLabel(minutes), hook: "The first image, reversed. No caption.", dur: 12 },
      ],
    },
    engines: ENGINES,
    stitch: {
      note: "Generate each shot 5–10s in Kling/Runway/Luma with the lock prompt. Drop files as scene-01.mp4 … in the Cut bench and concat.",
      ffmpeg: scenes.map((s) => `file '${s.id}.mp4'`).join("\n"),
      command: "ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -c:a aac -movflags +faststart movie.mp4",
    },
    created: new Date().toISOString(),
  };
}

function midpointLabel(m) {
  const min = Math.floor(m * 0.5);
  return min + ":00";
}
function climaxLabel(m) {
  const min = Math.floor(m * 0.78);
  return min + ":00";
}

export function screenplayMd(movie) {
  const lines = [`# ${movie.title}`, "", `> ${movie.logline}`, "", `Runtime ${movie.runtime_min} min · ${movie.genre}`, "", "## Characters", ""];
  (movie.characters || []).forEach((c) => lines.push(`- **${c.name}** — ${c.look}. Wants: ${c.want}`));
  lines.push("", "## Hook", movie.hook_3s, "", "## Scenes", "");
  (movie.scenes || []).forEach((s) => {
    const start = Math.floor(s.start / 60) + ":" + pad(s.start % 60);
    lines.push(`### ${s.id}  ${start}  (${s.fn})`, s.purpose, "", `INT/EXT ${s.location} — ${s.duration}s`, "");
    if (s.dialogue) lines.push(s.dialogue, "");
    (s.shots || []).forEach((sh) => lines.push(`- ${sh.id} [${sh.dur}s] ${sh.camera} / ${sh.motion}`, `  ${sh.prompt}`));
    lines.push("");
  });
  return lines.join("\n");
}

export function shotsMd(movie) {
  const lines = [`# Shot prompts — ${movie.title}`, "", movie.lock, ""];
  (movie.scenes || []).forEach((s) => {
    (s.shots || []).forEach((sh) => {
      lines.push(`## ${sh.id}`, sh.prompt, "");
    });
  });
  return lines.join("\n");
}

export async function saveMovie(env, movie) {
  if (!env.VAULT) return { ...movie, saved: false, error: "VAULT unbound" };
  const base = "movies/" + movie.slug + "/";
  const put = (key, body, type) =>
    env.VAULT.put(base + key, body, { httpMetadata: { contentType: type } });
  await put("bible.json", JSON.stringify(movie, null, 2), "application/json; charset=utf-8");
  await put("screenplay.md", screenplayMd(movie), "text/markdown; charset=utf-8");
  await put("shots.md", shotsMd(movie), "text/markdown; charset=utf-8");
  await put("youtube.txt", (movie.viral && movie.viral.youtube && (movie.viral.youtube.title + "\n\n" + movie.viral.youtube.description)) || "", "text/plain; charset=utf-8");
  await put("ffmpeg-concat.txt", movie.stitch.ffmpeg, "text/plain; charset=utf-8");
  return { ...movie, saved: true, prefix: base, url: "/api/cinema?slug=" + movie.slug };
}

export async function createMovie(env, input = {}) {
  const movie = planMovie(input);
  return saveMovie(env, movie);
}

export async function listMovies(env) {
  if (!env.VAULT) return { ok: false, movies: [], error: "VAULT unbound" };
  const listed = await env.VAULT.list({ prefix: "movies/", delimiter: "/" });
  const prefixes = (listed.delimitedPrefixes || []).map((p) => p.replace(/\/$/, "").split("/").pop());
  const movies = [];
  for (const slug of prefixes.slice(0, 24)) {
    try {
      const obj = await env.VAULT.get("movies/" + slug + "/bible.json");
      if (!obj) continue;
      const j = JSON.parse(await obj.text());
      movies.push({ slug, title: j.title, runtime_min: j.runtime_min, created: j.created, scenes: (j.scenes || []).length });
    } catch {}
  }
  return { ok: true, movies };
}

export async function getMovie(env, slug) {
  if (!env.VAULT) return { error: "VAULT unbound" };
  const obj = await env.VAULT.get("movies/" + slugify(slug) + "/bible.json");
  if (!obj) return { error: "not found", slug };
  return JSON.parse(await obj.text());
}

export async function handleCinema(request, env, path) {
  const url = new URL(request.url);
  if (path !== "/api/cinema") return null;
  if (request.method === "GET") {
    const slug = url.searchParams.get("slug");
    if (slug) return new Response(JSON.stringify(await getMovie(env, slug)), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    return new Response(JSON.stringify(await listMovies(env)), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const rec = await createMovie(env, body);
    return new Response(JSON.stringify(rec), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  return null;
}
