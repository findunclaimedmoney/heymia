export function cut2Html() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cut · HeyMia</title>
<style>
body{margin:0;background:#0a0a0b;color:#f4f4f5;font-family:system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:20px}
h1{margin:0 0 4px;font-size:32px}
p{color:#a1a1aa}
.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
video{width:100%;background:#000;border-radius:12px;max-height:70vh}
label{display:block;font-size:12px;color:#ec4899;margin:12px 0 4px}
input{width:100%;box-sizing:border-box;background:#121214;color:#fff;border:1px solid #ffffff22;border-radius:10px;padding:10px}
button{margin-top:12px;margin-right:8px;background:#ec4899;color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:700;cursor:pointer}
.card{background:#121214;border:1px solid #ffffff14;border-radius:16px;padding:14px}
.clip{border-top:1px solid #ffffff14;padding:8px 0;font-size:13px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Cut</h1>
<p>Drop every shot. Mia stitches them in order. No watermark. No length cap. Adults only.</p>
<div class="grid">
  <video id="v" controls></video>
  <div class="card">
    <label>Shots</label><input id="file" type="file" accept="video/*" multiple>
    <div id="list"></div>
    <label>Title</label><input id="title" value="The Watcher">
    <label>Line on the film</label><input id="about" value="He comes down. She invites him home.">
    <button id="go">Export movie</button>
    <p id="stat">Ready.</p>
    <a id="dl" hidden>Download</a>
  </div>
</div>
<script>
const v=document.getElementById('v');
let files=[];
file.onchange=()=>{
  files=[...file.files];
  list.innerHTML=files.map((f,i)=>'<div class="clip">'+(i+1)+'. '+f.name+'</div>').join('')||'';
  if(files[0]){v.src=URL.createObjectURL(files[0]);v.play()}
};
function draw(x,vid,title,about){
  x.fillStyle='#000';x.fillRect(0,0,1080,1920);
  const vw=vid.videoWidth||1080,vh=vid.videoHeight||1920;
  const s=Math.max(1080/vw,1920/vh);
  const w=vw*s,h=vh*s;
  x.drawImage(vid,(1080-w)/2,(1920-h)/2,w,h);
  x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,1680,1080,240);
  x.fillStyle='#fff';x.font='700 42px sans-serif';x.textAlign='center';
  x.fillText(title,540,1760);
  x.fillStyle='#f5b942';x.font='26px sans-serif';
  x.fillText(String(about).slice(0,90),540,1820);
}
function playFile(file){
  return new Promise(res=>{
    v.src=URL.createObjectURL(file);
    v.onloadeddata=()=>{v.currentTime=0;v.play().then(res).catch(res)};
  });
}
go.onclick=async()=>{
  if(!files.length){stat.textContent='Drop the shots first.';return}
  stat.textContent='Stitching '+files.length+' shots…';
  const c=document.createElement('canvas');c.width=1080;c.height=1920;
  const x=c.getContext('2d');
  const stream=c.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:'video/webm'});
  const chunks=[];
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise(r=>rec.onstop=r);
  rec.start();
  let stop=false;
  (function loop(){ if(!stop){ draw(x,v,title.value,about.value); requestAnimationFrame(loop);} })();
  for(const f of files){
    await playFile(f);
    await new Promise(r=>{ v.onended=r; setTimeout(r, Math.max(1000,(v.duration||10)*1000+400)); });
  }
  stop=true; rec.stop(); await done;
  const blob=new Blob(chunks,{type:'video/webm'});
  dl.href=URL.createObjectURL(blob);
  dl.download=(title.value||'movie')+'.webm';
  dl.hidden=false; dl.textContent='Download movie';
  stat.textContent='Done. No watermark. No length cap.';
};
</script>
</main></body></html>`;
}
