import { generateClip, tickJob } from "./imagine.js";

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
  const sets = {
    cold_open: [
      `Extreme close-up of ${hero}'s eye. An impossible door is only in the pupil.`,
      `Smash wide. The same room. The wall is still a wall.`,
      `${hero} blinks. For one frame a door seam appears in the wallpaper.`,
      `Insert: a hand stops just short of that seam.`,
      `Back to the eye. The pupil-door opens a crack of warm light.`,
      `Eight frames of black, then ${hero}'s face, close, looking into the lens.`,
    ],
    world: [
      `${hero} at a small table, blue hour, one practical lamp, dust in the beam.`,
      `The coat on the chair. ${hero} does not put it on yet.`,
      `Window: an ordinary street. No door anywhere.`,
      `${hero} pours water. The glass reflects a door the room does not have.`,
      `They stand, decide, and sit back down.`,
      `Wide: the room holds still. ${hero} is small in it.`,
    ],
    inciting: [
      `A door is in the wall where paint was. Handheld push-in.`,
      `${hero} steps back. The door stays.`,
      `They touch the frame. It is warm. The wall around it is cold.`,
      `The handle turns by itself one inch, then stops.`,
      `${hero} looks behind them. The room is the same. The door is not.`,
      `They take the handle. Cut on the click.`,
    ],
    fun_and_games: [
      `Steadicam through the doorway. The next room is a stair that should not fit.`,
      `${hero} walks a corridor that is longer than the building.`,
      `A window on the other side shows their own room, empty.`,
      `They test a rule: look back. The door is farther away.`,
      `Scale shift. ${hero} is tiny under a ceiling of doors.`,
      `They laugh once, then stop, because the laugh echoes in a voice that is not theirs.`,
    ],
    midpoint: [
      `Overhead: ${hero} sees the cost written on the floor in their own handwriting.`,
      `Slow dolly. They pick the paper up. It is blank from this side.`,
      `Match cut: the same paper in the real room, now with a sentence.`,
      `${hero} understands the door kept something of them.`,
      `They try to go back. The corridor has one more turn.`,
      `Hold on their face. The decision is not spoken.`,
    ],
    bad_guys_close: [
      `Cross-cut: something tall at the far end of the corridor, not running, arriving.`,
      `${hero} runs. The corridor loops to the same lamp.`,
      `The thing is the door, walking.`,
      `Close on shoes. Theirs, then not theirs.`,
      `A hand on their shoulder that is their own hand from the cold open.`,
      `They stop running. The corridor goes quiet.`,
    ],
    dark_night: [
      `Static wide. ${hero} small, rain or ash, one breath.`,
      `They take the coat off. The signature detail stays.`,
      `No music. A clock that is not in the room ticks once.`,
      `They almost say the line and do not.`,
      `The door, far, waits with its light off.`,
      `One tear or none. Do not decorate it.`,
    ],
    climax: [
      `The cold-open eye, reversed: we are inside the pupil looking out at ${hero}.`,
      `They step through toward us.`,
      `48fps to 24 as their foot lands in the real room.`,
      `The door behind them is paint again.`,
      `The paper in the real room now has their name and not the word for what hunted them.`,
      `They look at us the way the eye looked at them.`,
    ],
    button: [
      `The wall is a wall. Hold.`,
      `A seam of light at the skirting board, one inch, then gone.`,
      `Black. Eight frames.`,
      `${title} as a light leak, not a title card.`,
      `The lamp is still on in the empty room.`,
      `Cut to black and stay there.`,
    ],
  };
  const list = sets[fn] || sets.world;
  const action = list[beat % list.length];
  const camera = beat % 2 ? "24mm anamorphic push" : "85mm close, shallow focus";
  const motion = ["slow dolly in", "handheld breathe", "locked-off"][beat % 3];
  const light = genre + " lighting, practical lamps only";
  return {
    camera,
    motion,
    interrupt: beat % 2 === 0 ? "hard cut on a sting" : "match-cut on the eye-line",
    prompt: `${action} Camera: ${camera}, ${motion}. ${light}. ${lock}. No text, no watermark, no logo.`,
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
        prompt: s.prompt,
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
      note: "Shots render on Grok Imagine, two at a time, until each one is an mp4. The film plays in order on this page.",
      ffmpeg: scenes.map((s) => `file '${s.id}.mp4'`).join("\n"),
      command: "ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -c:a aac -movflags +faststart movie.mp4",
    },
    created: new Date().toISOString(),
  };
}

export function planShort(input = {}) {
  const seconds = Math.max(30, Math.min(90, Number(input.seconds) || 30));
  const n = seconds <= 35 ? 3 : seconds <= 65 ? 5 : 6;
  const dur = Math.min(15, Math.max(8, Math.round(seconds / n)));
  const title = String(input.title || "Animated short").slice(0, 80);
  const premise = String(input.premise || input.brief || "A short animated story with a beginning, a turn, and a held ending.").slice(0, 800);
  const hero = String(input.hero || "the hero").slice(0, 48);
  const slug = slugify(title + "-" + seconds + "s");
  const lock = "Stylized children's animation, same face, same clothes, warm light, fully clothed, no text, no watermark, no logo.";
  const actions = [
    `${hero} enters in one clear pose. The place is simple and readable. ${premise}`,
    `${hero} wants something and moves toward it. Same face, same clothes.`,
    `A small obstacle stops ${hero}. They react. The style does not change.`,
    `${hero} tries again a different way. Hold the same world.`,
    `The turn. What ${hero} wanted costs one kind thing.`,
    `Ending. ${hero} still. The point of the story is visible. Hold the last second.`,
  ];
  const shots = actions.slice(0, n).map((action, k) => ({
    id: "s01-" + (k + 1),
    dur,
    camera: k % 2 ? "gentle push-in" : "locked wide",
    motion: "slow and readable",
    interrupt: "cut on the action",
    prompt: action + " " + lock + " Shot " + (k + 1) + " of " + n + ". Continue the same character.",
  }));
  return {
    ok: true,
    slug,
    title,
    animated: true,
    render: false,
    logline: `${seconds}s animated short. ${hero}. ${premise.slice(0, 160)}`,
    premise,
    genre: "animation",
    vibe: "warm",
    runtime_min: 1,
    runtime_sec: dur * n,
    seconds: dur * n,
    hero,
    want: premise.slice(0, 80),
    lock,
    hook_3s: hero + " moves. No titles.",
    hook_15s: title,
    characters: [{ name: hero, look: "one design, never redesigned mid-film", voice: "none in the picture", want: "" }],
    scenes: [{
      id: "sc-01",
      index: 1,
      start: 0,
      duration: dur * n,
      fn: "short",
      purpose: "One animated short, played in order. Not a 30-minute bible.",
      location: "the story",
      dialogue: "",
      shots,
    }],
    viral: { youtube: { title: title + " — " + (dur * n) + "s animated short", description: premise } },
    stitch: { note: "Shots render two at a time and play in order on this page.", ffmpeg: shots.map((s) => "file '" + s.id + ".mp4'").join("\n") },
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
  const movie = input.seconds || input.animated || input.short ? planShort(input) : planMovie(input);
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

function flatShots(movie) {
  const shots = [];
  for (const scene of movie.scenes || []) {
    for (const shot of scene.shots || []) shots.push(shot);
  }
  return shots;
}

export async function advanceFilm(env, movie, ctx) {
  if (!movie || !movie.scenes) return { ok: false, error: "no film" };
  const shots = flatShots(movie);
  for (const shot of shots) {
    if (!shot.job_id || shot.status === "done" || shot.status === "failed") continue;
    const job = await tickJob(env, shot.job_id);
    shot.status = job.status || shot.status;
    shot.key = job.key || shot.key || "";
    shot.download = job.download || shot.download || "";
    shot.error = job.error || "";
  }
  const active = shots.filter((s) => s.status === "rendering" || s.status === "queued").length;
  let started = 0;
  if (movie.render) {
    for (const shot of shots) {
      if (active + started >= 2) break;
      if (shot.job_id) continue;
      const rec = await generateClip(env, {
        title: (movie.slug || "film") + " " + shot.id,
        story: shot.prompt,
        duration: Math.min(15, Math.max(5, Number(shot.dur) || 10)),
        look: movie.animated ? "animation" : "",
      }, ctx);
      shot.job_id = rec.job_id || "";
      shot.status = rec.ok ? "rendering" : "failed";
      shot.error = rec.error || "";
      if (rec.ok) started++;
      else break;
    }
  }
  const done = shots.filter((s) => s.status === "done" && s.key).length;
  movie.progress = { done, total: shots.length, rendering: shots.filter((s) => s.status === "rendering").length, started };
  await saveMovie(env, movie);
  return { ok: true, slug: movie.slug, title: movie.title, progress: movie.progress, render: !!movie.render };
}

export async function advanceFilms(env, ctx) {
  const listed = await listMovies(env);
  const films = [];
  for (const row of listed.movies || []) {
    const movie = await getMovie(env, row.slug);
    if (!movie || movie.error || !movie.render) continue;
    films.push(await advanceFilm(env, movie, ctx));
  }
  return { ok: true, films };
}

export async function handleCinema(request, env, path, ctx) {
  const url = new URL(request.url);
  if (path !== "/api/cinema") return null;
  if (request.method === "GET") {
    const slug = url.searchParams.get("slug");
    if (slug) return new Response(JSON.stringify(await getMovie(env, slug)), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    return new Response(JSON.stringify(await listMovies(env)), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (body.action === "render" || body.action === "advance") {
      const movie = await getMovie(env, body.slug || "");
      if (!movie || movie.error) {
        return new Response(JSON.stringify(movie || { error: "not found" }), { status: 404, headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
      }
      if (body.action === "render") movie.render = body.stop ? false : true;
      if (body.retry) {
        for (const scene of movie.scenes || []) {
          for (const shot of scene.shots || []) {
            if (shot.status === "failed") {
              shot.job_id = "";
              shot.status = "";
              shot.error = "";
            }
          }
        }
      }
      const rec = await advanceFilm(env, movie, ctx);
      const full = await getMovie(env, movie.slug);
      return new Response(JSON.stringify({ ...full, progress: rec.progress }), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    }
    const rec = await createMovie(env, body);
    if (!body.start) {
      return new Response(JSON.stringify(rec), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    }
    const movie = await getMovie(env, rec.slug);
    movie.render = true;
    const advanced = await advanceFilm(env, movie, ctx);
    const full = await getMovie(env, movie.slug);
    return new Response(JSON.stringify({ ...full, progress: advanced.progress }), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  return null;
}
