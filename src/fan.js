import { createMovie } from "./cinema.js";
import { magickPrompt } from "./imagine.js";

const AVATAR = "https://embed.liveavatar.com/v1/3559b3f9-29e3-48eb-a4ff-7a7dc5b47ca9";

const BEATS = [
  { id: "walk", label: "She walks", line: "adult woman walking a city street at dusk, full body, looking ahead" },
  { id: "descend", label: "He comes down", line: "tall man in a long dark coat descending in a beam of light onto the street" },
  { id: "face", label: "Her face", line: "close on her face, eyes wide, lips parted, excited, looking up at him" },
  { id: "invite", label: "She invites him", line: "she takes his hand and leads him toward her door, she wants him there" },
  { id: "door", label: "Her place", line: "she opens her apartment door at night and looks back at him, warm light" },
  { id: "close", label: "Close", line: "they stand close in a dim room, both clothed, she looks up flushed and smiling" },
];

export function storyShots(input = {}) {
  const title = String(input.title || "Untitled").slice(0, 80);
  const about = String(input.about || input.description || "").slice(0, 1200);
  const woman = String(input.woman || "Ava").slice(0, 40);
  const look = String(input.look || "adult blonde woman, 28, black top, jeans").slice(0, 240);
  const seconds = Math.max(30, Math.min(90, Number(input.seconds) || 60));
  const hold = Math.round(seconds / BEATS.length);
  const shots = BEATS.map((b, i) => {
    const prompt = magickPrompt([
      title + ".",
      "Movie: " + (about || "He spots her. Comes down. She takes him home."),
      "Shot " + (i + 1) + " of " + BEATS.length + ": " + b.line + ".",
      "Lead: " + woman + ", " + look + ". Same face every shot. Adults. She invites him. Not forced. No text, no watermark.",
    ].join(" "));
    return { id: b.id, label: b.label, start: i * hold, dur: hold, prompt };
  });
  return { title, about, woman, look, seconds, shots };
}

export function clipBrief(input = {}) {
  const story = storyShots(input);
  return {
    ...story,
    prompt: story.shots.map((s) => s.label + ": " + s.prompt).join("\n"),
    avatar: AVATAR,
    live: "/session",
  };
}

export async function makeFanClip(env, input = {}) {
  const brief = clipBrief(input);
  const movie = await createMovie(env, {
    title: brief.title,
    premise: brief.about || brief.prompt,
    genre: "romance",
    lead: brief.woman,
    look: brief.look,
    runtime: Math.max(8, Math.round(brief.seconds / 60) || 1),
  });
  return { ok: true, ...brief, movie };
}

export function fanHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fan Studio · HeyMia</title>
<style>
body{margin:0;background:#07060a;color:#f8fafc;font-family:system-ui,sans-serif}
main{max-width:820px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:36px;margin:0 0 6px}
p{color:#94a3b8}
label{display:block;font-size:12px;margin:14px 0 6px;color:#ec4899}
input,textarea,select{width:100%;box-sizing:border-box;background:#12101a;color:#fff;border:1px solid #ffffff22;border-radius:12px;padding:12px;font:inherit}
textarea{min-height:120px}
button{margin-top:14px;background:linear-gradient(90deg,#ec4899,#a855f7);color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;cursor:pointer}
.card{margin-top:18px;background:#12101a;border:1px solid #ffffff14;border-radius:16px;padding:14px}
a{color:#ec4899}
iframe{width:100%;height:420px;border:0;border-radius:12px;background:#000;margin-top:16px}
.shot{border-top:1px solid #ffffff14;padding:10px 0}
</style></head><body><main>
<h1>Fan Studio</h1>
<p>Write the movie. Mia splits it into shots: she walks, he comes down, her face, she invites him home. Adults. She invites him. Not forced.</p>
<label>Title</label><input id="title" value="The Watcher">
<label>Woman</label><input id="woman" value="Ava">
<label>Look</label><input id="look" value="adult blonde woman, 28, black top, jeans, same face every shot">
<label>Length</label><select id="seconds"><option value="30">30 seconds</option><option value="60" selected>60 seconds</option><option value="90">90 seconds</option></select>
<label>What the movie is about</label>
<textarea id="about">A blonde woman walks the street. A watcher from heaven spots her and comes down. His scent hits. She is excited and invites him back to her place.</textarea>
<button onclick="make()">Create movie</button>
<div id="out" class="card">Shots land here.</div>
<iframe src="${AVATAR}" title="Live Avatar"></iframe>
<script>
async function make(){
  const body={title:title.value,woman:woman.value,look:look.value,about:about.value,seconds:Number(seconds.value)};
  const r=await fetch('/api/fan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json();
  const shots=(j.shots||[]).map(s=>'<div class="shot"><b>'+s.label+'</b> · '+s.dur+'s<pre style="white-space:pre-wrap;font-size:12px">'+s.prompt+'</pre></div>').join('');
  out.innerHTML='<b>'+(j.title||'')+'</b><p>'+(j.about||j.error||'')+'</p><p>'+(j.seconds||'')+'s · '+(j.woman||'')+'</p>'+shots;
}
</script>
</main></body></html>`;
}
