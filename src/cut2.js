export function cut2Html() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cut 2 · HeyMia</title>
<style>
body{margin:0;background:#0a0a0b;color:#f4f4f5;font-family:system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:20px}
h1{margin:0 0 4px;font-size:32px}
p{color:#a1a1aa}
.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
video{width:100%;background:#000;border-radius:12px;max-height:70vh}
label{display:block;font-size:12px;color:#ec4899;margin:12px 0 4px}
input{width:100%;box-sizing:border-box;background:#121214;color:#fff;border:1px solid #ffffff22;border-radius:10px;padding:10px}
button{margin-top:12px;background:#ec4899;color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:700;cursor:pointer}
.card{background:#121214;border:1px solid #ffffff14;border-radius:16px;padding:14px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Cut 2</h1>
<p>Free editor. Drop a clip, add the movie line, export 1080p. No watermark.</p>
<div class="grid">
  <video id="v" controls></video>
  <div class="card">
    <label>Video</label><input id="file" type="file" accept="video/*">
    <label>Title</label><input id="title" value="The Watcher">
    <label>What the movie is about</label><input id="about" value="A watcher comes down. She sees him. Shock hits her face.">
    <label>Start (sec)</label><input id="start" type="number" value="0" min="0" step="0.1">
    <label>Length (sec)</label><input id="len" type="number" value="30" min="1" step="1">
    <button id="go">Export 1080p</button>
    <p id="stat">Ready.</p>
    <a id="dl" hidden>Download</a>
  </div>
</div>
<script>
const v=document.getElementById('v');
file.onchange=()=>{v.src=URL.createObjectURL(file.files[0]);v.play()};
go.onclick=async()=>{
  if(!file.files[0]){stat.textContent='Drop a video first.';return}
  stat.textContent='Exporting…';
  const c=document.createElement('canvas');c.width=1080;c.height=1920;
  const x=c.getContext('2d');
  const stream=c.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:'video/webm'});
  const chunks=[];
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise(r=>rec.onstop=r);
  v.currentTime=Number(start.value)||0;
  await new Promise(r=>v.onseeked=r);
  rec.start();
  const t0=performance.now();
  const ms=(Number(len.value)||30)*1000;
  function frame(){
    x.fillStyle='#000';x.fillRect(0,0,1080,1920);
    const vw=v.videoWidth||1080,vh=v.videoHeight||1920;
    const s=Math.max(1080/vw,1920/vh);
    const w=vw*s,h=vh*s;
    x.drawImage(v,(1080-w)/2,(1920-h)/2,w,h);
    x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,1560,1080,360);
    x.fillStyle='#fff';x.font='700 48px sans-serif';x.textAlign='center';
    x.fillText(title.value,540,1660);
    x.fillStyle='#f5b942';x.font='28px sans-serif';
    x.fillText(about.value.slice(0,80),540,1720);
    if(performance.now()-t0<ms && !v.ended) requestAnimationFrame(frame);
    else rec.stop();
  }
  v.play();frame();
  await done;
  const blob=new Blob(chunks,{type:'video/webm'});
  dl.href=URL.createObjectURL(blob);
  dl.download=(title.value||'cut')+'.webm';
  dl.hidden=false;dl.textContent='Download cut';
  stat.textContent='Done. 1080x1920, no watermark.';
};
</script>
</main></body></html>`;
}
