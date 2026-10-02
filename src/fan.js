import { createMovie } from "./cinema.js";
import { magickPrompt } from "./imagine.js";

const AVATAR = "https://embed.liveavatar.com/v1/3559b3f9-29e3-48eb-a4ff-7a7dc5b47ca9";

export function clipBrief(input = {}) {
  const title = String(input.title || "Untitled").slice(0, 80);
  const about = String(input.about || input.description || input.premise || "").slice(0, 1200);
  const woman = String(input.woman || input.name || "Ava").slice(0, 40);
  const look = String(input.look || "adult woman, 28, elegant, camera-facing, soft light").slice(0, 240);
  const story = [
    title + ".",
    "Movie: " + (about || "A short film about a woman who will not look away."),
    "Lead: " + woman + ", " + look + ".",
    "Adult woman only. Same face the whole clip. Eyes on camera. No text, no watermark.",
  ].join(" ");
  return {
    title,
    about,
    woman,
    look,
    prompt: magickPrompt(story),
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
input,textarea{width:100%;box-sizing:border-box;background:#12101a;color:#fff;border:1px solid #ffffff22;border-radius:12px;padding:12px;font:inherit}
textarea{min-height:120px}
button{margin-top:14px;background:linear-gradient(90deg,#ec4899,#a855f7);color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;cursor:pointer}
.card{margin-top:18px;background:#12101a;border:1px solid #ffffff14;border-radius:16px;padding:14px}
a{color:#ec4899}
iframe{width:100%;height:420px;border:0;border-radius:12px;background:#000}
</style></head><body><main>
<h1>Fan Studio</h1>
<p>Write what the movie is about. Mia builds the woman clip and keeps that description on the film.</p>
<label>Title</label><input id="title" value="She Doesn't Look Away">
<label>Woman</label><input id="woman" value="Ava">
<label>Look</label><input id="look" value="adult woman, 28, dark wavy hair, black blazer, soft smile, eyes on camera">
<label>What the movie is about</label>
<textarea id="about">A woman stands in front of the camera and tells one true story. She never looks away. The clip is the first scene of the film.</textarea>
<button onclick="make()">Create clip</button>
<div id="out" class="card">Live Avatar sits here after you create the clip.</div>
<iframe src="${AVATAR}" title="Live Avatar"></iframe>
<script>
async function make(){
  const body={title:title.value,woman:woman.value,look:look.value,about:about.value};
  const r=await fetch('/api/fan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json();
  out.innerHTML='<b>'+ (j.title||'') +'</b><p>'+ (j.about||'') +'</p><p>Lead: '+ (j.woman||'') +'</p><p><a href="'+(j.avatar||'#')+'" target="_blank">Open Live Avatar</a></p><pre style="white-space:pre-wrap;font-size:12px">'+ (j.prompt||j.error||'') +'</pre>';
}
</script>
</main></body></html>`;
}
