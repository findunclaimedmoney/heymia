const SPA_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HeyMia | Workflow Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #07060a; --panel: rgba(18, 16, 26, 0.88); --accent: #ec4899; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: #f8fafc; height: 100vh; overflow: hidden; }
    .serif { font-family: 'Playfair Display', serif; }
    .glass { background: var(--panel); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
    .glass-light { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
    .drop-zone.dragover { border-color: #ec4899 !important; background: rgba(236,72,153,0.12) !important; }
    .msg-user { background: rgba(236,72,153,0.18); border: 1px solid rgba(236,72,153,0.3); }
    .msg-mia { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    .tab-active { background: linear-gradient(90deg, #ec4899, #a855f7); color: white; }
    .preview-empty { background: radial-gradient(circle at center, #1e1b4b 0%, #07060a 70%); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease forwards; }
  </style>
</head>
<body class="flex flex-col h-screen">

  <!-- TOP BAR -->
  <header class="h-14 flex items-center gap-4 px-4 lg:px-6 glass border-b border-white/10 z-40 shrink-0">
    <div class="flex items-center gap-2.5 shrink-0">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-pink-500/30">H</div>
      <div class="hidden sm:block">
        <div class="font-bold text-sm leading-none serif">HeyMia</div>
        <div class="text-[9px] text-pink-400 font-semibold tracking-wider uppercase">Workflow</div>
      </div>
    </div>

    <!-- Global Search -->
    <div class="flex-1 max-w-2xl relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input id="global-search" type="text" placeholder="Search files, scripts, businesses, deployments..." class="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-pink-500/60 transition" oninput="runGlobalSearch(this.value)">
      <div id="search-results" class="absolute top-full left-0 right-0 mt-1 glass rounded-xl border border-white/10 shadow-2xl max-h-72 overflow-y-auto hidden z-50"></div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button onclick="switchMode('work')" id="btn-mode-work" class="px-3 py-1.5 rounded-lg text-xs font-bold tab-active">Work</button>
      <button onclick="switchMode('play')" id="btn-mode-play" class="px-3 py-1.5 rounded-lg text-xs font-bold glass-light text-slate-300">Play</button>
      <button onclick="openLiveAvatar()" class="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-xs font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Live Avatar</button>
      <button onclick="toggleSettings()" class="p-2 rounded-lg glass-light hover:bg-white/10 text-slate-300" title="Settings & Gemini Key">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
    </div>
  </header>

  <!-- MAIN SPLIT -->
  <div class="flex-1 flex overflow-hidden">

    <!-- LEFT: Mia Agent Chat + Upload -->
    <aside class="w-80 lg:w-96 flex flex-col glass border-r border-white/10 shrink-0">
      <div class="p-3 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold">M</div>
          <div>
            <div class="text-xs font-bold">Mia Agent</div>
            <div class="text-[9px] text-emerald-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online</div>
          </div>
        </div>
        <button onclick="clearChat()" class="text-[10px] text-slate-500 hover:text-slate-300">Clear</button>
      </div>

      <div id="mia-chat" class="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        <div class="msg-mia rounded-2xl rounded-tl-sm p-3 fade-in">
          <div class="font-bold text-pink-400 text-[10px] mb-1">Mia</div>
          Ready. Drop mixed files or tell me what to build. I will categorise them, route voice assets to ElevenLabs, video/avatar assets to LiveAvatar, and keep everything under <span class="text-pink-300">www.heymia.lensflow.au</span>.
        </div>
      </div>

      <div class="p-3 border-t border-white/10 space-y-2">
        <div id="drop-zone" class="drop-zone border-2 border-dashed border-pink-500/30 rounded-xl p-5 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-500/5 transition group">
          <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition">
            <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p class="text-xs font-bold text-white">Upload Files</p>
          <p class="text-[10px] text-slate-400 mt-1">Drag &amp; drop or click • Multiple files supported</p>
          <input type="file" id="file-input" multiple class="hidden" accept="*/*">
        </div>
        <div id="upload-status" class="text-[10px] text-center text-slate-500 hidden"></div>
        <form id="chat-form" onsubmit="sendToMia(event)" class="flex gap-2">
          <input id="mia-input" type="text" placeholder="Tell Mia what to do..." class="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-500">
          <button type="submit" class="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold">Send</button>
        </form>
      </div>
    </aside>

    <!-- RIGHT: Tools -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <div class="h-11 flex items-center gap-1 px-4 border-b border-white/10 glass shrink-0 overflow-x-auto">
        <button onclick="switchTool('vault')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium tab-active shrink-0" data-tool="vault">File Vault</button>
        <button onclick="switchTool('workflow')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="workflow">Workflow</button>
        <button onclick="switchTool('checklist')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="checklist">Checklist</button>
        <button onclick="switchTool('training')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="training">Daily Training</button>
        <button onclick="switchTool('editor')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="editor">CapCut Editor</button>
        <button onclick="switchTool('replace')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="replace">Find &amp; Replace</button>
        <button onclick="switchTool('deploy')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="deploy">Deploy</button>
        <button onclick="switchTool('studio')" class="tool-tab px-3 py-1.5 rounded-lg text-xs font-medium glass-light text-slate-300 shrink-0" data-tool="studio">Fan Studio</button>
      </div>

      <div class="flex-1 overflow-hidden relative">
        <div id="tool-vault" class="absolute inset-0 flex">
          <div class="w-56 border-r border-white/10 p-3 overflow-y-auto">
            <div class="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Categories</div>
            <div id="cat-list" class="space-y-1"></div>
          </div>
          <div class="flex-1 flex flex-col">
            <div class="px-4 py-2 border-b border-white/10 text-xs font-semibold" id="cat-label">All Files</div>
            <div id="file-grid" class="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start"></div>
          </div>
          <div class="w-72 border-l border-white/10 flex flex-col">
            <div class="p-3 border-b border-white/10 text-xs font-bold">Preview &amp; Deploy</div>
            <div id="preview-area" class="flex-1 flex flex-col items-center justify-center p-4">
              <div class="w-full aspect-video rounded-xl preview-empty border border-white/10 flex items-center justify-center text-slate-500 text-xs mb-3">Select a file</div>
              <div id="prev-meta" class="text-[10px] text-slate-400 w-full space-y-1 hidden"></div>
            </div>
            <div class="p-3 border-t border-white/10 space-y-2">
              <button id="btn-deploy" onclick="deploySelected()" disabled class="w-full py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-xs font-bold disabled:opacity-40">Publish / Deploy</button>
              <button id="btn-route" onclick="routeSelected()" disabled class="w-full py-2 rounded-xl glass-light text-xs font-medium disabled:opacity-40">Ask Mia to Route</button>
            </div>
          </div>
        </div>

        <div id="tool-workflow" class="absolute inset-0 hidden p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto space-y-4">
            <div class="glass rounded-2xl p-5 border border-white/10">
              <h2 class="text-lg font-bold serif mb-1">HeyMia Daily Workflow</h2>
              <p class="text-xs text-slate-400 mb-4">Standard operating procedure for every business day</p>
              <div class="space-y-3" id="workflow-steps">
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">1</div><div><div class="text-sm font-semibold">Morning Intake</div><div class="text-[11px] text-slate-400">Upload overnight files → Mia auto-categorises &amp; routes</div></div></div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">2</div><div><div class="text-sm font-semibold">Content Review</div><div class="text-[11px] text-slate-400">Open File Vault, preview, run Find &amp; Replace if needed</div></div></div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">3</div><div><div class="text-sm font-semibold">Daily Training Session</div><div class="text-[11px] text-slate-400">Train Mia on new preferences, brand voice, room scripts</div></div></div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">4</div><div><div class="text-sm font-semibold">Produce &amp; Edit</div><div class="text-[11px] text-slate-400">Use CapCut Editor or send assets to LiveAvatar / ElevenLabs</div></div></div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">5</div><div><div class="text-sm font-semibold">Deploy &amp; Publish</div><div class="text-[11px] text-slate-400">Queue finished assets and publish to www.heymia.lensflow.au</div></div></div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/5"><div class="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0">6</div><div><div class="text-sm font-semibold">Evening Checklist</div><div class="text-[11px] text-slate-400">Close open tasks, note tomorrow priorities, log training notes</div></div></div>
              </div>
            </div>
          </div>
        </div>

        <div id="tool-checklist" class="absolute inset-0 hidden p-6 overflow-y-auto">
          <div class="max-w-2xl mx-auto">
            <div class="glass rounded-2xl p-5 border border-white/10">
              <div class="flex items-center justify-between mb-4">
                <div><h2 class="text-lg font-bold serif">Daily Checklist</h2><p class="text-xs text-slate-400" id="checklist-date"></p></div>
                <button onclick="addChecklistItem()" class="px-3 py-1.5 rounded-lg bg-pink-600/80 text-xs font-bold">+ Add Item</button>
              </div>
              <div id="checklist-items" class="space-y-2"></div>
              <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span id="checklist-progress" class="text-slate-400">0 / 0 complete</span>
                <button onclick="resetChecklist()" class="text-slate-500 hover:text-slate-300">Reset for tomorrow</button>
              </div>
            </div>
          </div>
        </div>

        <div id="tool-training" class="absolute inset-0 hidden p-6 overflow-y-auto">
          <div class="max-w-3xl mx-auto space-y-4">
            <div class="glass rounded-2xl p-5 border border-white/10">
              <h2 class="text-lg font-bold serif mb-1">Daily Training Session for Mia</h2>
              <p class="text-xs text-slate-400 mb-4">Teach Mia new preferences, brand voice, room scripts or business rules. These notes are injected into every Gemini reply.</p>
              <textarea id="training-input" rows="5" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500 resize-none mb-3" placeholder="Example: Always greet users by name. Prefer short playful answers in The Bedroom. Never mention competitors. New promo code is SUMMER25..."></textarea>
              <div class="flex gap-2">
                <button onclick="saveTraining()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold">Save Training Note</button>
                <button onclick="clearTraining()" class="px-4 py-2 rounded-xl glass-light text-xs font-medium">Clear All Notes</button>
              </div>
            </div>
            <div class="glass rounded-2xl p-5 border border-white/10">
              <h3 class="text-sm font-bold mb-3">Saved Training Notes</h3>
              <div id="training-log" class="space-y-2 text-xs text-slate-300 max-h-64 overflow-y-auto"></div>
            </div>
          </div>
        </div>

        <div id="tool-editor" class="absolute inset-0 hidden flex flex-col bg-black/30">
          <div class="flex-1 flex items-center justify-center p-6">
            <div class="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black relative">
              <video id="ed-video" class="w-full h-full object-contain" controls></video>
              <div id="ed-overlay" class="absolute inset-0 flex items-center justify-center pointer-events-none"><div id="ed-text" class="text-3xl font-bold text-white drop-shadow-lg opacity-0"></div></div>
            </div>
          </div>
          <div class="h-28 border-t border-white/10 glass p-3">
            <div class="flex items-center gap-2 mb-2">
              <button onclick="edAction('text')" class="px-3 py-1.5 rounded-lg glass-light text-xs">Add Text</button>
              <button onclick="edAction('filter')" class="px-3 py-1.5 rounded-lg glass-light text-xs">Filter</button>
              <button onclick="edAction('export')" class="ml-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold">Export</button>
            </div>
            <input id="ed-text-input" type="text" placeholder="Overlay text..." class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none" oninput="document.getElementById('ed-text').textContent=this.value;document.getElementById('ed-text').style.opacity=this.value?1:0">
          </div>
        </div>

        <div id="tool-replace" class="absolute inset-0 hidden p-6 overflow-y-auto">
          <div class="max-w-3xl mx-auto glass rounded-2xl p-6 border border-white/10">
            <h2 class="text-lg font-bold serif mb-1">Find &amp; Replace</h2>
            <p class="text-xs text-slate-400 mb-5">Replace any sentence, paragraph or link across all content at once.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div><label class="text-[10px] text-slate-400 block mb-1">Find</label><textarea id="find-txt" rows="4" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-500 resize-none"></textarea></div>
              <div><label class="text-[10px] text-slate-400 block mb-1">Replace with</label><textarea id="repl-txt" rows="4" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-500 resize-none"></textarea></div>
            </div>
            <div class="flex gap-3">
              <button onclick="doFindReplace(false)" class="px-4 py-2 rounded-xl glass-light text-xs font-bold">Preview</button>
              <button onclick="doFindReplace(true)" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold">Replace All</button>
            </div>
            <div id="repl-log" class="mt-4 text-xs text-slate-300 space-y-1"></div>
          </div>
        </div>

        <div id="tool-deploy" class="absolute inset-0 hidden p-6 overflow-y-auto">
          <div class="glass rounded-2xl p-5 border border-white/10 mb-4">
            <h2 class="text-sm font-bold">Deployment Queue</h2>
            <p class="text-xs text-slate-400">Files ready for publish to www.heymia.lensflow.au</p>
          </div>
          <div id="deploy-list" class="space-y-3"></div>
        </div>

        <div id="tool-studio" class="absolute inset-0 hidden flex flex-col">
          <div class="flex-1 relative bg-black">
            <div id="avatar-container" class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="w-32 h-32 rounded-full border-2 border-pink-500/40 flex items-center justify-center mx-auto mb-4"><div class="w-24 h-24 rounded-full bg-gradient-to-br from-pink-600/40 to-purple-700/40 flex items-center justify-center text-4xl">💋</div></div>
                <p class="text-sm text-slate-400 mb-4">Live Avatar Studio</p>
                <button onclick="startLiveSession()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-sm font-bold shadow-lg shadow-pink-500/30">Start Live Session</button>
              </div>
            </div>
            <iframe id="avatar-iframe" class="absolute inset-0 w-full h-full hidden border-0" allow="camera;microphone;autoplay"></iframe>
          </div>
          <div class="h-14 border-t border-white/10 glass flex items-center justify-between px-4">
            <div class="text-xs text-slate-400" id="studio-status">Idle</div>
            <button onclick="stopLiveSession()" class="px-4 py-1.5 rounded-lg bg-red-600/30 text-red-300 text-xs font-bold border border-red-500/40">End Session</button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- SETTINGS MODAL -->
  <div id="settings-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 pointer-events-none transition">
    <div class="glass rounded-2xl p-6 w-full max-w-md border border-white/15">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-bold serif">Settings</h3>
        <button onclick="toggleSettings()" class="text-slate-400 hover:text-white text-lg">&times;</button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-xs text-slate-400 block mb-1.5">Gemini API Key (enables real AI for Mia)</label>
          <input id="gemini-key-input" type="password" placeholder="AIza..." class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500">
          <p class="text-[10px] text-slate-500 mt-1">Stored only in your browser. Never sent to our servers.</p>
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1.5">Worker Base URL</label>
          <input id="worker-url-input" type="text" placeholder="https://your-worker.workers.dev" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500">
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="w-2 h-2 rounded-full" id="gemini-status-dot"></span>
          <span id="gemini-status-text" class="text-slate-400">Gemini: not configured</span>
        </div>
        <button onclick="saveSettings()" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-sm font-bold">Save Settings</button>
      </div>
    </div>
  </div>

  <script>
    let WORKER_BASE = localStorage.getItem('heymia_worker') || (window.location.origin.includes('localhost') ? 'https://your-worker.your-subdomain.workers.dev' : window.location.origin);
    const PUBLIC_DOMAIN = 'https://www.heymia.lensflow.au';

    const state = {
      files: [], selectedId: null,
      geminiKey: localStorage.getItem('heymia_gemini') || '',
      trainingNotes: JSON.parse(localStorage.getItem('heymia_training') || '[]'),
      checklist: JSON.parse(localStorage.getItem('heymia_checklist') || 'null'),
      currentCat: 'all', deployQueue: [],
      contentStore: [
        { id: 's1', name: 'Jess Bedroom Intro', content: 'Welcome to my private Fan Studio! We have 5 minutes together in The Bedroom. What\'s on your mind today?' },
        { id: 's2', name: 'Landing Headline', content: 'She remembers what every other girl forgets. Real conversation. Real connection.' },
        { id: 's3', name: 'Promo Link', content: 'https://www.heymia.lensflow.au/studio/bedroom?ref=promo5' },
      ],
      liveSessionId: null, mode: 'work',
    };

    const CATS = [
      { id: 'fanstudio', name: 'Fan Studio', icon: '💋', color: '#ec4899' },
      { id: 'lensflow', name: 'Lensflow AI', icon: '🎬', color: '#f97316' },
      { id: 'jess', name: 'Jess Companion', icon: '🤖', color: '#a855f7' },
      { id: 'marketing', name: 'Marketing', icon: '📣', color: '#38bdf8' },
      { id: 'scripts', name: 'Scripts & Prompts', icon: '📝', color: '#22c55e' },
      { id: 'legal', name: 'Legal', icon: '⚖️', color: '#eab308' },
      { id: 'finance', name: 'Finance', icon: '💰', color: '#14b8a6' },
      { id: 'unsorted', name: 'Unsorted', icon: '📦', color: '#64748b' },
    ];

    const DEFAULT_CHECKLIST = [
      { id: 1, text: 'Upload overnight / new files', done: false },
      { id: 2, text: 'Review File Vault categories', done: false },
      { id: 3, text: 'Run Daily Training Session for Mia', done: false },
      { id: 4, text: 'Check LiveAvatar / Fan Studio readiness', done: false },
      { id: 5, text: 'Produce or edit content (CapCut / scripts)', done: false },
      { id: 6, text: 'Deploy finished assets to www.heymia.lensflow.au', done: false },
      { id: 7, text: 'Log evening notes & set tomorrow priorities', done: false },
    ];

    document.addEventListener('DOMContentLoaded', () => {
      setupDrop(); renderCats(); renderFiles(); initChecklist(); renderTraining(); updateGeminiStatus();
      const geminiMsg = state.geminiKey ? 'Gemini AI active.' : 'Add Gemini key in Settings for full AI assistance.';
      addMia('System ready. Domain: ' + PUBLIC_DOMAIN + '. ' + geminiMsg);
    });

    function switchMode(m) {
      state.mode = m;
      document.getElementById('btn-mode-work').className = m === 'work' ? 'px-3 py-1.5 rounded-lg text-xs font-bold tab-active' : 'px-3 py-1.5 rounded-lg text-xs font-bold glass-light text-slate-300';
      document.getElementById('btn-mode-play').className = m === 'play' ? 'px-3 py-1.5 rounded-lg text-xs font-bold tab-active' : 'px-3 py-1.5 rounded-lg text-xs font-bold glass-light text-slate-300';
      if (m === 'play') switchTool('studio'); else switchTool('vault');
    }

    function switchTool(t) {
      document.querySelectorAll('[id^="tool-"]').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex', 'flex-col'); });
      const panel = document.getElementById('tool-' + t);
      if (panel) {
        panel.classList.remove('hidden');
        if (t === 'vault' || t === 'editor' || t === 'studio') panel.classList.add('flex');
        if (t === 'editor' || t === 'studio') panel.classList.add('flex-col');
      }
      if (t === 'checklist') renderChecklist();
      if (t === 'training') renderTraining();
      if (t === 'deploy') renderDeploy();
      document.querySelectorAll('.tool-tab').forEach(btn => {
        const base = 'tool-tab px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ';
        btn.className = btn.dataset.tool === t ? base + 'tab-active' : base + 'glass-light text-slate-300';
      });
    }

    function addMia(text, role = 'mia') {
      const box = document.getElementById('mia-chat');
      const div = document.createElement('div');
      div.className = (role === 'user' ? 'msg-user ml-6' : 'msg-mia mr-4') + ' rounded-2xl p-3 fade-in';
      div.innerHTML = `<div class="font-bold text-[10px] mb-1 ${role === 'user' ? 'text-slate-400 text-right' : 'text-pink-400'}">${role === 'user' ? 'You' : 'Mia'}</div>${escapeHtml(text)}`;
      box.appendChild(div); box.scrollTop = box.scrollHeight;
    }

    async function sendToMia(e) {
      e.preventDefault();
      const input = document.getElementById('mia-input');
      const text = input.value.trim();
      if (!text) return;
      addMia(text, 'user'); input.value = '';
      const lower = text.toLowerCase();
      if (lower.includes('live avatar') || lower.includes('start session')) { addMia('Opening Fan Studio and starting LiveAvatar…'); switchTool('studio'); startLiveSession(); return; }
      if (lower.includes('open vault') || lower.includes('show files')) { switchTool('vault'); addMia('File Vault is open.'); return; }
      if (lower.includes('checklist')) { switchTool('checklist'); addMia('Checklist ready.'); return; }
      if (lower.includes('train') || lower.includes('training')) { switchTool('training'); addMia('Daily Training panel open. Write what you want me to remember.'); return; }
      if (state.geminiKey) {
        addMia('Thinking…');
        try {
          const trainingContext = state.trainingNotes.length ? '\n\nDaily training notes you must follow:\n' + state.trainingNotes.map(n => '- ' + n.text).join('\n') : '';
          const fileList = state.files.map(f => `- ${f.name} (${f.type || 'unknown'}, ${f.category})`).join('\n');
          const system = `You are Mia, the operations agent for HeyMia (www.heymia.lensflow.au). You help with file management, content creation, Fan Studio, LiveAvatar, CapCut editing, deployments and daily workflow. Keep answers short, clear and actionable (2-5 sentences). Current files in vault (${state.files.length}):\n${fileList || 'No files yet'}. Domain: ${PUBLIC_DOMAIN}.${trainingContext}`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: system + '\n\nUser: ' + text }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 400 } }),
          });
          const data = await res.json();
          const box = document.getElementById('mia-chat');
          if (box.lastChild && box.lastChild.textContent.includes('Thinking')) box.removeChild(box.lastChild);
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a reply. Check the Gemini key in Settings.';
          addMia(reply);
        } catch (err) {
          const box = document.getElementById('mia-chat');
          if (box.lastChild && box.lastChild.textContent.includes('Thinking')) box.removeChild(box.lastChild);
          addMia('Gemini request failed. Check your API key and network. Falling back to local help.');
          localFallback(text);
        }
      } else { localFallback(text); }
    }

    function localFallback(text) {
      const lower = text.toLowerCase();
      if (lower.includes('upload') || lower.includes('file')) addMia('Drop files on the upload zone. I will auto-categorise and route them. Add a Gemini key in Settings for full AI assistance.');
      else if (lower.includes('deploy') || lower.includes('publish')) { addMia('Open the Deploy tab. Select files in Vault and click Publish.'); switchTool('deploy'); }
      else if (lower.includes('workflow')) { switchTool('workflow'); addMia('Here is the daily workflow.'); }
      else addMia('I can help with uploads, routing, LiveAvatar, CapCut, Find & Replace, Workflow, Checklist and Daily Training. Add your Gemini API key in Settings (gear icon) for full conversational AI.');
    }

    function clearChat() { document.getElementById('mia-chat').innerHTML = ''; addMia('Chat cleared. How can I help?'); }

    function toggleSettings() {
      const m = document.getElementById('settings-modal');
      m.classList.toggle('opacity-0'); m.classList.toggle('pointer-events-none');
      if (!m.classList.contains('opacity-0')) {
        document.getElementById('gemini-key-input').value = state.geminiKey ? '••••••••' + state.geminiKey.slice(-4) : '';
        document.getElementById('worker-url-input').value = WORKER_BASE;
        updateGeminiStatus();
      }
    }

    function saveSettings() {
      const keyInput = document.getElementById('gemini-key-input').value.trim();
      if (keyInput && !keyInput.startsWith('••')) { state.geminiKey = keyInput; localStorage.setItem('heymia_gemini', keyInput); }
      const workerUrl = document.getElementById('worker-url-input').value.trim();
      if (workerUrl) { WORKER_BASE = workerUrl; localStorage.setItem('heymia_worker', workerUrl); }
      updateGeminiStatus(); toggleSettings();
      addMia(state.geminiKey ? 'Gemini key saved. I am now fully AI-assisted.' : 'Settings saved.');
    }

    function updateGeminiStatus() {
      const dot = document.getElementById('gemini-status-dot'); const txt = document.getElementById('gemini-status-text');
      if (!dot) return;
      if (state.geminiKey) { dot.className = 'w-2 h-2 rounded-full bg-emerald-400'; txt.textContent = 'Gemini: active'; txt.className = 'text-emerald-400'; }
      else { dot.className = 'w-2 h-2 rounded-full bg-slate-500'; txt.textContent = 'Gemini: not configured'; txt.className = 'text-slate-400'; }
    }

    function initChecklist() {
      const today = new Date().toDateString();
      if (!state.checklist || state.checklist.date !== today) { state.checklist = { date: today, items: DEFAULT_CHECKLIST.map(i => ({ ...i })) }; localStorage.setItem('heymia_checklist', JSON.stringify(state.checklist)); }
      document.getElementById('checklist-date').textContent = state.checklist.date;
      renderChecklist();
    }

    function renderChecklist() {
      const box = document.getElementById('checklist-items');
      if (!box) return;
      box.innerHTML = state.checklist.items.map(item => `<label class="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 cursor-pointer"><input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleCheck(${item.id})" class="rounded border-white/20"><span class="text-sm ${item.done ? 'line-through text-slate-500' : ''}">${item.text}</span></label>`).join('');
      const done = state.checklist.items.filter(i => i.done).length;
      document.getElementById('checklist-progress').textContent = `${done} / ${state.checklist.items.length} complete`;
    }

    function toggleCheck(id) { const item = state.checklist.items.find(i => i.id === id); if (item) item.done = !item.done; localStorage.setItem('heymia_checklist', JSON.stringify(state.checklist)); renderChecklist(); }
    function addChecklistItem() { const text = prompt('New checklist item:'); if (!text) return; const id = Date.now(); state.checklist.items.push({ id, text, done: false }); localStorage.setItem('heymia_checklist', JSON.stringify(state.checklist)); renderChecklist(); }
    function resetChecklist() { state.checklist = { date: new Date().toDateString(), items: DEFAULT_CHECKLIST.map(i => ({ ...i })) }; localStorage.setItem('heymia_checklist', JSON.stringify(state.checklist)); document.getElementById('checklist-date').textContent = state.checklist.date; renderChecklist(); addMia('Checklist reset for today.'); }

    function renderTraining() {
      const log = document.getElementById('training-log');
      if (!log) return;
      if (!state.trainingNotes.length) { log.innerHTML = '<div class="text-slate-500">No training notes yet. Add your first note above.</div>'; return; }
      log.innerHTML = state.trainingNotes.map((n, i) => `<div class="p-3 rounded-xl bg-white/5 flex justify-between gap-2"><div><div class="text-[10px] text-slate-500 mb-0.5">${n.date}</div>${escapeHtml(n.text)}</div><button onclick="removeTraining(${i})" class="text-slate-500 hover:text-red-400 text-xs shrink-0">✕</button></div>`).join('');
    }

    function saveTraining() {
      const input = document.getElementById('training-input'); const text = input.value.trim();
      if (!text) return;
      state.trainingNotes.unshift({ text, date: new Date().toLocaleString() });
      localStorage.setItem('heymia_training', JSON.stringify(state.trainingNotes));
      input.value = ''; renderTraining();
      addMia('Training note saved. I will follow it in every future reply' + (state.geminiKey ? ' (Gemini active).' : '.'));
    }

    function removeTraining(i) { state.trainingNotes.splice(i, 1); localStorage.setItem('heymia_training', JSON.stringify(state.trainingNotes)); renderTraining(); }
    function clearTraining() { if (!confirm('Clear all training notes?')) return; state.trainingNotes = []; localStorage.setItem('heymia_training', '[]'); renderTraining(); addMia('All training notes cleared.'); }

    function setupDrop() {
      const zone = document.getElementById('drop-zone'); const input = document.getElementById('file-input');
      zone.onclick = () => input.click();
      zone.ondragover = e => { e.preventDefault(); zone.classList.add('dragover'); };
      zone.ondragleave = () => zone.classList.remove('dragover');
      zone.ondrop = e => { e.preventDefault(); zone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); };
      input.onchange = e => handleFiles(e.target.files);
    }

    async function handleFiles(list) {
      if (!list || list.length === 0) return;
      const statusEl = document.getElementById('upload-status');
      statusEl.classList.remove('hidden'); statusEl.textContent = `Uploading ${list.length} file(s)…`; statusEl.className = 'text-[10px] text-center text-pink-400';
      let done = 0;
      for (const file of list) {
        const id = 'f' + Date.now() + Math.random().toString(36).slice(2, 6);
        const cat = guessCat(file.name, file.type);
        const entry = { id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, category: cat, url: URL.createObjectURL(file), fileObj: file, status: 'uploaded' };
        state.files.push(entry);
        addMia(`Received "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Auto-tagged → ${catName(cat)}.`);
        try {
          const res = await fetch(WORKER_BASE + '/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, fileType: file.type, category: cat }) });
          if (res.ok) {
            const data = await res.json(); entry.routedTo = data.destination;
            addMia(`Route: ${data.destination} — ${data.reason}`);
            if (data.destination === 'liveavatar') addMia('Avatar/video asset detected. You can start a LiveAvatar session from the Fan Studio tab.');
          }
        } catch (err) { addMia(`Local processing complete for "${file.name}". (Worker route optional until deployed)`); }
        done++; statusEl.textContent = `Processed ${done}/${list.length}`;
      }
      statusEl.textContent = `✓ ${list.length} file(s) uploaded & ready in File Vault`; statusEl.className = 'text-[10px] text-center text-emerald-400';
      setTimeout(() => statusEl.classList.add('hidden'), 4000);
      renderCats(); renderFiles(); switchTool('vault');
    }

    function guessCat(name, type) {
      const n = name.toLowerCase();
      if (n.includes('bedroom') || n.includes('dungeon') || n.includes('bdsm') || n.includes('fan') || n.includes('jess')) return 'fanstudio';
      if (n.includes('lens') || n.includes('4k') || n.includes('avatar') || type.startsWith('video/')) return 'lensflow';
      if (n.includes('prompt') || n.includes('script') || n.endsWith('.txt') || n.endsWith('.md')) return 'scripts';
      if (n.includes('ad') || n.includes('promo') || n.includes('marketing') || n.includes('banner')) return 'marketing';
      if (n.includes('legal') || n.includes('terms') || n.includes('privacy')) return 'legal';
      if (n.includes('invoice') || n.includes('finance') || n.includes('payment')) return 'finance';
      if (n.includes('jess') || n.includes('companion')) return 'jess';
      return 'unsorted';
    }

    function catName(id) { return CATS.find(c => c.id === id)?.name || id; }

    function renderCats() {
      const list = document.getElementById('cat-list');
      list.innerHTML = `<button onclick="setCat('all')" class="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 ${state.currentCat === 'all' ? 'bg-pink-500/15 text-pink-300' : ''}">📁 All (${state.files.length})</button>` + CATS.map(c => { const cnt = state.files.filter(f => f.category === c.id).length; return `<button onclick="setCat('${c.id}')" class="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 ${state.currentCat === c.id ? 'bg-pink-500/15 text-pink-300' : ''}">${c.icon} ${c.name} <span class="opacity-50">${cnt}</span></button>`; }).join('');
    }

    function setCat(id) { state.currentCat = id; document.getElementById('cat-label').textContent = id === 'all' ? 'All Files' : catName(id); renderCats(); renderFiles(); }

    function renderFiles() {
      let files = state.files;
      if (state.currentCat !== 'all') files = files.filter(f => f.category === state.currentCat);
      const grid = document.getElementById('file-grid');
      if (!files.length) { grid.innerHTML = '<div class="col-span-full text-center text-slate-500 text-xs py-16">No files yet. Drop mixed files on the left.</div>'; return; }
      grid.innerHTML = files.map(f => { const isImg = f.type.startsWith('image/'); return `<div onclick="selectFile('${f.id}')" class="glass-light rounded-xl p-2.5 cursor-pointer border transition ${state.selectedId === f.id ? 'border-pink-500/60 bg-pink-500/10' : 'border-transparent'}"><div class="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-1.5 overflow-hidden">${isImg ? `<img src="${f.url}" class="w-full h-full object-cover">` : `<span class="text-xl">${f.type.startsWith('video/') ? '🎥' : '📎'}</span>`}</div><div class="text-[10px] font-medium truncate">${f.name}</div><div class="text-[9px] text-slate-500">${catName(f.category)}${f.routedTo ? ' → ' + f.routedTo : ''}</div></div>`; }).join('');
    }

    function selectFile(id) {
      state.selectedId = id; const f = state.files.find(x => x.id === id);
      if (!f) return;
      renderFiles();
      const area = document.getElementById('preview-area'); const meta = document.getElementById('prev-meta');
      meta.classList.remove('hidden');
      meta.innerHTML = `<div>Name: ${f.name}</div><div>Type: ${f.type}</div><div>Size: ${(f.size / 1024).toFixed(1)} KB</div><div>Category: <span class="text-pink-400">${catName(f.category)}</span></div>${f.routedTo ? `<div>Routed: <span class="text-emerald-400">${f.routedTo}</span></div>` : ''}`;
      const frame = area.querySelector('div');
      if (f.type.startsWith('image/')) frame.innerHTML = `<img src="${f.url}" class="w-full h-full object-contain rounded-xl">`;
      else if (f.type.startsWith('video/')) frame.innerHTML = `<video src="${f.url}" class="w-full h-full object-contain" controls></video>`;
      else frame.innerHTML = `<div class="text-slate-500 text-xs text-center"><div class="text-2xl mb-1">📎</div>${f.name}</div>`;
      document.getElementById('btn-deploy').disabled = false; document.getElementById('btn-route').disabled = false;
    }

    function deploySelected() {
      const f = state.files.find(x => x.id === state.selectedId);
      if (!f) return;
      if (!state.deployQueue.find(d => d.id === f.id)) state.deployQueue.push({ ...f, status: 'queued' });
      addMia(`"${f.name}" added to deployment queue for ${PUBLIC_DOMAIN}.`); renderDeploy();
    }

    async function routeSelected() {
      const f = state.files.find(x => x.id === state.selectedId);
      if (!f) return;
      addMia(`Re-routing "${f.name}"…`);
      try {
        const res = await fetch(WORKER_BASE + '/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: f.name, fileType: f.type, category: f.category }) });
        const data = await res.json(); f.routedTo = data.destination;
        addMia(`New route: ${data.destination} — ${data.reason}`); selectFile(f.id);
      } catch { addMia('Could not reach Worker. Check WORKER_BASE URL.'); }
    }

    function renderDeploy() {
      const list = document.getElementById('deploy-list');
      if (!state.deployQueue.length) { list.innerHTML = '<div class="text-center text-slate-500 text-xs py-12">Queue empty. Select a file in Vault and click Publish / Deploy.</div>'; return; }
      list.innerHTML = state.deployQueue.map((d, i) => `<div class="glass rounded-xl p-4 border border-white/10 flex items-center justify-between"><div><div class="text-sm font-medium">${d.name}</div><div class="text-[10px] text-slate-400">${catName(d.category)} • ${d.status}</div></div><button onclick="doDeploy(${i})" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold">Deploy Now</button></div>`).join('');
    }

    function doDeploy(i) { state.deployQueue[i].status = 'live'; addMia(`Deployed "${state.deployQueue[i].name}" → ${PUBLIC_DOMAIN}`); renderDeploy(); }

    function runGlobalSearch(q) {
      const box = document.getElementById('search-results');
      if (!q.trim()) { box.classList.add('hidden'); return; }
      const lower = q.toLowerCase(); const hits = [];
      state.files.forEach(f => { if (f.name.toLowerCase().includes(lower) || f.category.includes(lower) || (f.routedTo || '').includes(lower)) hits.push({ type: 'file', label: f.name, sub: catName(f.category), id: f.id }); });
      state.contentStore.forEach(c => { if (c.name.toLowerCase().includes(lower) || c.content.toLowerCase().includes(lower)) hits.push({ type: 'content', label: c.name, sub: c.content.slice(0, 60) + '…' }); });
      if (!hits.length) { box.innerHTML = '<div class="p-3 text-xs text-slate-500">No matches</div>'; }
      else { box.innerHTML = hits.slice(0, 12).map(h => `<div class="px-3 py-2 hover:bg-white/5 cursor-pointer text-xs border-b border-white/5 last:border-0" onclick="searchGo('${h.type}','${h.id || ''}')"><div class="font-medium">${h.label}</div><div class="text-[10px] text-slate-500">${h.sub}</div></div>`).join(''); }
      box.classList.remove('hidden');
    }

    function searchGo(type, id) { document.getElementById('search-results').classList.add('hidden'); if (type === 'file' && id) { switchTool('vault'); selectFile(id); } }

    function doFindReplace(execute) {
      const find = document.getElementById('find-txt').value; const repl = document.getElementById('repl-txt').value;
      if (!find) return;
      let total = 0; const log = document.getElementById('repl-log'); log.innerHTML = '';
      state.contentStore.forEach(item => {
        const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = item.content.match(regex);
        if (matches) { total += matches.length; if (execute) item.content = item.content.replace(regex, repl); log.innerHTML += `<div class="p-2 rounded bg-white/5">${item.name}: ${matches.length} match(es)</div>`; }
      });
      log.innerHTML += `<div class="mt-2 font-bold text-emerald-400">${execute ? 'Replaced' : 'Found'} ${total} occurrence(s)</div>`;
      if (execute) addMia(`Find & Replace completed — ${total} replacements across content store.`);
    }

    function edAction(act) {
      if (act === 'export') { addMia('Export requested. In production this renders via FFmpeg.wasm or CapCut desktop. Preview is ready.'); alert('Export demo complete. Source media can be downloaded from the preview.'); }
      else if (act === 'filter') { const v = document.getElementById('ed-video'); v.style.filter = v.style.filter ? 'none' : 'sepia(0.3) saturate(1.3) brightness(1.05)'; }
    }

    async function startLiveSession() {
      const status = document.getElementById('studio-status'); status.textContent = 'Creating session…';
      try {
        const res = await fetch(WORKER_BASE + '/session');
        if (!res.ok) throw new Error('session failed');
        const data = await res.json(); state.liveSessionId = data.session_id;
        await fetch(WORKER_BASE + '/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: data.session_id }) });
        const iframe = document.getElementById('avatar-iframe'); const container = document.getElementById('avatar-container');
        iframe.src = data.avatar_url || (await (await fetch(WORKER_BASE + '/config')).json()).avatar_url;
        iframe.classList.remove('hidden'); container.classList.add('hidden');
        status.textContent = 'Live • Session ' + data.session_id.slice(0, 8);
        addMia('LiveAvatar session started. Session ID: ' + data.session_id);
      } catch (err) {
        status.textContent = 'Worker unreachable — using local preview';
        addMia('Could not reach LiveAvatar Worker. Check that WORKER_BASE points to your deployed Worker and CORS is open. Local studio preview is still available.');
      }
    }

    async function stopLiveSession() {
      if (state.liveSessionId) { try { await fetch(WORKER_BASE + '/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: state.liveSessionId }) }); } catch {} }
      state.liveSessionId = null;
      document.getElementById('avatar-iframe').classList.add('hidden'); document.getElementById('avatar-iframe').src = '';
      document.getElementById('avatar-container').classList.remove('hidden');
      document.getElementById('studio-status').textContent = 'Idle';
      addMia('LiveAvatar session ended.');
    }

    function openLiveAvatar() { switchMode('play'); switchTool('studio'); startLiveSession(); }
    function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  </script>
</body>
</html>
`;

// ========== HeyMia Worker — Workflow Command Center ==========

const AVATAR_ID = "3559b3f9-29e3-48eb-a4ff-7a7dc5b47ca9";
const AVATAR_URL = "https://embed.liveavatar.com/v1/" + AVATAR_ID;
const WS_URL = "wss://embed.liveavatar.com/v1/" + AVATAR_ID + "/ws";

const AGENT_PROMPTS = {
  Mia: "You are Mia, the empathetic personal assistant for John Morgan. Guide with clarity, patience and kindness. You are the operational partner for LensFlow, Glimr, and Missing Cash. Work mode: fast, structured, task-oriented. Handle file intake, categorisation, routing, workflow steps, daily checklists. Play mode: hand off to LiveAvatar sessions. Be competent, calm, loyal to business first, transparent. Never invent data or hide errors. Become warmer with training. Stay concise and actionable.",
  Jess: "You are Jess, a warm engaging companion in Play mode. Conversational, fun, ready for LiveAvatar sessions."
};

function getSP(a) { return AGENT_PROMPTS[a] || "You are a helpful AI assistant."; }

async function saveMem(e, a, c, k, v) { if (!e.MEMORY) return; await e.MEMORY.put("mem:" + a + ":" + c + ":" + k, JSON.stringify({ value: v, t: Date.now() })); }
async function recallMem(e, a, c) { if (!e.MEMORY) return []; const l = await e.MEMORY.list({ prefix: "mem:" + a + ":" + c + ":" }); const m = []; for (const k of l.keys) { const v = await e.MEMORY.get(k.name); if (v) m.push(JSON.parse(v)); } return m.slice(0, 10); }
async function saveFile(e, n, t, c, co) { if (!e.MEMORY) return { error: "KV not bound" }; const id = crypto.randomUUID(); await e.MEMORY.put("file:" + id, JSON.stringify({ id, name: n, type: t, category: c, content: co, created_at: new Date().toISOString() })); return { id, status: "saved" }; }
async function listFiles(e, c) { if (!e.MEMORY) return []; const l = await e.MEMORY.list({ prefix: "file:" }); const f = []; for (const k of l.keys) { const v = await e.MEMORY.get(k.name); if (v) { const d = JSON.parse(v); if (!c || d.category === c) f.push({ id: d.id, name: d.name, type: d.type, category: d.category, created_at: d.created_at }); } } return f; }
async function searchFiles(e, q) { if (!e.MEMORY) return []; const l = await e.MEMORY.list({ prefix: "file:" }); const r = []; q = q.toLowerCase(); for (const k of l.keys) { const v = await e.MEMORY.get(k.name); if (v) { const d = JSON.parse(v); if (d.name.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q))) r.push({ id: d.id, name: d.name, type: d.type, category: d.category, created_at: d.created_at }); } } return r; }

const jobs = new Map();
function createJob(t, d) { const id = crypto.randomUUID(); const j = { id, type: t, data: d, status: "queued", created_at: new Date().toISOString() }; jobs.set(id, j); return j; }
function listJobs(s) { const a = Array.from(jobs.values()); return s ? a.filter(j => j.status === s) : a; }

const sessions = new Map();

const corsH = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400" };
function jsonR(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { ...corsH, "Content-Type": "application/json" } }); }
function htmlR(h) { return new Response(h, { headers: { ...corsH, "Content-Type": "text/html; charset=utf-8" } }); }

function routeFile(fileName, fileType, category) {
  const n = (fileName || "").toLowerCase(); const t = fileType || "";
  let destination = "local"; let reason = "Default local processing"; let suggested_action = "Store in File Vault for manual review";
  if (t.startsWith("video/") || n.includes("avatar") || n.includes("4k") || n.includes("lens")) { destination = "liveavatar"; reason = "Video/avatar asset detected — route to LiveAvatar for rendering"; suggested_action = "Send to LiveAvatar session for real-time avatar generation"; }
  else if (t.startsWith("audio/") || n.includes("voice") || n.includes("elevenlabs") || n.includes("tts")) { destination = "elevenlabs"; reason = "Audio/voice asset detected — route to ElevenLabs for TTS processing"; suggested_action = "Process through ElevenLabs API for voice synthesis"; }
  else if (n.includes("script") || n.includes("prompt") || n.includes(".txt") || n.includes(".md")) { destination = "scripts"; reason = "Text/script asset — store for content generation"; suggested_action = "Add to script library for Mia to reference"; }
  else if (category === "fanstudio" || n.includes("bedroom") || n.includes("jess")) { destination = "liveavatar"; reason = "Fan Studio content — route to LiveAvatar for interactive sessions"; suggested_action = "Queue for Fan Studio LiveAvatar session"; }
  return { destination, reason, suggested_action };
}

async function handleChat(e, body) {
  const messages = body.messages || []; const mode = body.mode || "work"; const agent = body.agent || "Mia";
  const systemPrompt = getSP(agent); let context = systemPrompt;
  const files = await listFiles(e);
  if (files.length) context += "\n\nFiles in vault (" + files.length + "):\n" + files.map(f => "- " + f.name + " (" + f.category + ")").join("\n");
  if (e.MEMORY) { const mem = await recallMem(e, agent, mode); if (mem.length) context += "\n\nRelevant memories:\n" + mem.map(m => "- " + m.value).join("\n"); }
  const contents = [{ role: "user", parts: [{ text: context }] }];
  for (const m of messages.slice(-10)) contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
  const geminiKey = e.GEMINI_API_KEY || e.GEMINI;
  if (geminiKey) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiKey, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } }) });
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) { if (e.MEMORY && messages.length > 0) await saveMem(e, agent, mode, "last", messages[messages.length - 1].content.slice(0, 200)); return { response: reply, agent, model: "gemini-2.0-flash" }; }
    } catch (err) {}
  }
  const lastMsg = messages[messages.length - 1]?.content || "";
  let reply = "I am Mia, your workflow assistant. ";
  if (mode === "play") reply = "I am " + agent + ". ";
  reply += "I can help with file management, routing, LiveAvatar sessions, checklists, and daily training. ";
  reply += "Configure a Gemini API key in worker secrets for full AI responses. ";
  reply += "You said: \"" + lastMsg.slice(0, 100) + "\"";
  return { response: reply, agent, model: "fallback" };
}

async function handleCheckout(e, body) {
  const stripeKey = e.STRIPE_SECRET_KEY || e.STRIPE;
  if (!stripeKey) return { error: "Stripe not configured" };
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Bearer " + stripeKey }, body: new URLSearchParams({ "mode": "payment", "line_items[0][price]": body.price_id || "price_1Tx8hkEHzw6rVQI2QnfDm6Kl", "line_items[0][quantity]": "1", "success_url": body.success_url || (e.request?.url?.origin || "") + "/credits?payment=success&session_id={CHECKOUT_SESSION_ID}", "cancel_url": body.cancel_url || (e.request?.url?.origin || "") + "/credits?payment=cancelled" }).toString() });
    const data = await res.json();
    if (data.url) return { checkout_url: data.url, session_id: data.id };
    return { error: data.error?.message || "Checkout failed" };
  } catch (err) { return { error: err.message }; }
}

async function verifyPayment(e, sessionId) {
  const stripeKey = e.STRIPE_SECRET_KEY || e.STRIPE;
  if (!stripeKey) return { error: "Stripe not configured" };
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions/" + sessionId, { headers: { "Authorization": "Bearer " + stripeKey } });
    const data = await res.json();
    return { payment_status: data.payment_status, amount_total: data.amount_total, currency: data.currency, customer_email: data.customer_details?.email };
  } catch (err) { return { error: err.message }; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url); const path = url.pathname; const method = request.method;
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsH });

    if (path === "/" && method === "GET") {
      const secrets = { liveavatar: !!(env.LIVEAVATAR_API_KEY || env.LIVEAVATAR), stripe: !!(env.STRIPE_SECRET_KEY || env.STRIPE), ai: !!(env.GEMINI_API_KEY || env.GEMINI) };
      return jsonR({ status: "ok", ai_model: secrets.ai ? "gemini-2.0-flash" : "fallback", avatar_id: AVATAR_ID, secrets_configured: secrets });
    }
    if (path === "/config" && method === "GET") return jsonR({ avatar_url: AVATAR_URL, ws_url: WS_URL, avatar_id: AVATAR_ID });
    if (path === "/route" && method === "POST") { try { const body = await request.json(); return jsonR(routeFile(body.fileName, body.fileType, body.category)); } catch { return jsonR({ error: "Invalid request body" }, 400); } }
    if (path === "/chat" && method === "POST") { try { const body = await request.json(); return jsonR(await handleChat(env, body)); } catch { return jsonR({ error: "Chat processing failed" }, 500); } }
    if (path === "/files" && method === "POST") { try { const body = await request.json(); return jsonR(await saveFile(env, body.name, body.type, body.category, body.content)); } catch { return jsonR({ error: "Failed to save file" }, 500); } }
    if (path === "/files" && method === "GET") { const cat = url.searchParams.get("category"); return jsonR({ files: await listFiles(env, cat) }); }
    if (path === "/search" && method === "GET") { const q = url.searchParams.get("q") || ""; return jsonR({ results: await searchFiles(env, q) }); }
    if (path === "/session" && method === "GET") { const sessionId = crypto.randomUUID(); const token = crypto.randomUUID(); sessions.set(sessionId, { id: sessionId, token, status: "created", created_at: new Date().toISOString() }); return jsonR({ session_id: sessionId, token, avatar_url: AVATAR_URL, ws_url: WS_URL }); }
    if (path === "/start" && method === "POST") { try { const body = await request.json(); const s = sessions.get(body.session_id); if (!s) return jsonR({ error: "Session not found" }, 404); s.status = "active"; return jsonR({ status: "started", session_id: s.id }); } catch { return jsonR({ error: "Invalid request" }, 400); } }
    if (path === "/stop" && method === "POST") { try { const body = await request.json(); const s = sessions.get(body.session_id); if (!s) return jsonR({ error: "Session not found" }, 404); s.status = "stopped"; return jsonR({ status: "stopped", session_id: s.id }); } catch { return jsonR({ error: "Invalid request" }, 400); } }
    if (path === "/jobs" && method === "GET") { const status = url.searchParams.get("status"); return jsonR({ jobs: listJobs(status) }); }
    if (path === "/jobs" && method === "POST") { try { const body = await request.json(); return jsonR(createJob(body.type, body.data)); } catch { return jsonR({ error: "Invalid request" }, 400); } }
    if (path === "/checkout" && method === "POST") { try { const body = await request.json(); return jsonR(await handleCheckout(env, body)); } catch { return jsonR({ error: "Checkout failed" }, 500); } }
    if (path === "/verify-payment" && method === "POST") { try { const body = await request.json(); return jsonR(await verifyPayment(env, body.session_id)); } catch { return jsonR({ error: "Verification failed" }, 500); } }

    if (method === "GET") return htmlR(SPA_HTML);
    return jsonR({ error: "Not found" }, 404);
  }
};
