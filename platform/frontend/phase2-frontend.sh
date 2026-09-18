#!/bin/bash
# ============================================
# SHAHEEN - YS — Phase 2 Full Frontend
# Glassmorphism UI + Auth + Dashboard
# ============================================
set -e

cd ~/SHAHEEN-YS
echo "🎨 Building Phase 2 Frontend..."

mkdir -p platform/frontend/public/{css,js,img}
mkdir -p platform/docs

# ---------- serve.js ----------
cat > platform/frontend/serve.js <<'F1'
#!/usr/bin/env node
const http=require('http'),fs=require('fs'),path=require('path');
const P=process.env.FRONTEND_PORT||8080,R=path.join(__dirname,'public');
const M={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(R,u);if(!f.startsWith(R)){s.writeHead(403);return s.end('Forbidden');}fs.readFile(f,(e,d)=>{if(e){s.writeHead(404,{'Content-Type':'text/plain'});return s.end('404');}s.writeHead(200,{'Content-Type':M[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});s.end(d);});}).listen(P,()=>console.log(`🎨 SHAHEEN-YS Frontend: http://localhost:${P}`));
F1

# ---------- glass.css ----------
cat > platform/frontend/public/css/glass.css <<'F2'
:root{--p:#00d4ff;--s:#7b2ff7;--a:#00ffaa;--d:#ff3b5c;--ok:#00ff88;--bg:#05060f;--gb:rgba(255,255,255,.06);--gbd:rgba(255,255,255,.12);--gbds:rgba(0,212,255,.35);--sh:0 8px 32px rgba(0,0,0,.4);--bl:blur(20px) saturate(180%);--t1:#fff;--t2:rgba(255,255,255,.72);--t3:rgba(255,255,255,.45);--r:14px;--rl:20px;--rlx:28px;--tr:.3s cubic-bezier(.4,0,.2,1)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--t1);overflow-x:hidden;-webkit-font-smoothing:antialiased}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 30%,rgba(0,212,255,.18),transparent 45%),radial-gradient(circle at 80% 70%,rgba(123,47,247,.18),transparent 45%),radial-gradient(circle at 50% 50%,rgba(0,255,170,.08),transparent 60%),var(--bg);z-index:-2}
body::after{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,212,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.03) 1px,transparent 1px);background-size:60px 60px;z-index:-1;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%)}
.glass{background:var(--gb);backdrop-filter:var(--bl);-webkit-backdrop-filter:var(--bl);border:1px solid var(--gbd);border-radius:var(--rl);box-shadow:var(--sh)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;font-family:inherit;font-size:15px;font-weight:600;border:1px solid transparent;border-radius:var(--r);cursor:pointer;transition:all var(--tr);text-decoration:none;-webkit-tap-highlight-color:transparent}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,var(--p),var(--s));color:#fff;box-shadow:0 4px 20px rgba(0,212,255,.35)}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,212,255,.55)}
.btn-glass{background:var(--gb);backdrop-filter:var(--bl);-webkit-backdrop-filter:var(--bl);border:1px solid var(--gbd);color:var(--t1)}
.btn-glass:hover:not(:disabled){border-color:var(--gbds);background:rgba(255,255,255,.1)}
.btn-full{width:100%}
.input-group{margin-bottom:18px}
.input-group label{display:block;font-size:13px;font-weight:500;color:var(--t2);margin-bottom:8px}
.input{width:100%;padding:14px 18px;font-family:inherit;font-size:15px;color:var(--t1);background:var(--gb);backdrop-filter:var(--bl);-webkit-backdrop-filter:var(--bl);border:1px solid var(--gbd);border-radius:var(--r);transition:all var(--tr);outline:none}
.input::placeholder{color:var(--t3)}
.input:focus{border-color:var(--p);background:rgba(0,212,255,.06);box-shadow:0 0 0 4px rgba(0,212,255,.12)}
.status-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle}
.status-dot.connected{background:var(--ok);box-shadow:0 0 12px var(--ok);animation:pg 2s ease-in-out infinite}
.status-dot.error{background:var(--d);box-shadow:0 0 12px var(--d);animation:pr 1s ease-in-out infinite}
@keyframes pg{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.2)}}
@keyframes pr{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
h1,h2,h3{font-weight:700;letter-spacing:-.02em;line-height:1.2}
.text-gradient{background:linear-gradient(135deg,var(--p),var(--s),var(--a));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;background-size:200% auto;animation:gs 4s ease infinite}
@keyframes gs{0%,100%{background-position:0% center}50%{background-position:100% center}}
.container{max-width:1280px;margin:0 auto;padding:0 24px}
.hidden{display:none!important}
.text-center{text-align:center}
F2

# ---------- animations.css ----------
cat > platform/frontend/public/css/animations.css <<'F3'
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.fade-in-up{animation:fadeInUp .8s cubic-bezier(.4,0,.2,1) both}
.delay-1{animation-delay:.1s}.delay-2{animation-delay:.2s}.delay-3{animation-delay:.3s}.delay-4{animation-delay:.4s}.delay-5{animation-delay:.5s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.fade-in{animation:fadeIn 1s ease both}
@keyframes logoBreath{0%,100%{transform:scale(1);filter:drop-shadow(0 0 20px rgba(0,212,255,.4))}50%{transform:scale(1.05);filter:drop-shadow(0 0 40px rgba(0,212,255,.7))}}
.logo-breath{animation:logoBreath 4s ease-in-out infinite}
@keyframes rotateRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.rotating-ring{animation:rotateRing 20s linear infinite}
.rotating-ring-reverse{animation:rotateRing 30s linear infinite reverse}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.float{animation:float 5s ease-in-out infinite}
.spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:rotateRing .8s linear infinite}
F3

# ---------- api.js ----------
cat > platform/frontend/public/js/api.js <<'F4'
const API_BASE=`http://${window.location.hostname}:3000`;
class API{static async request(e,o={}){const c={credentials:'include',headers:{'Content-Type':'application/json',...(o.headers||{})},...o};if(o.body&&typeof o.body==='object')c.body=JSON.stringify(o.body);try{const r=await fetch(`${API_BASE}${e}`,c);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.message||`HTTP ${r.status}`);return d}catch(err){if(err.name==='TypeError')throw new Error('Cannot connect to server.');throw err}}
static health(){return this.request('/health')}
static register(email,password,name){return this.request('/api/auth/register',{method:'POST',body:{email,password,name}})}
static login(email,password){return this.request('/api/auth/login',{method:'POST',body:{email,password}})}
static logout(){return this.request('/api/auth/logout',{method:'POST'})}
static me(){return this.request('/api/auth/me')}}
class Toast{static c=null;static init(){if(this.c)return;this.c=document.createElement('div');this.c.style.cssText='position:fixed;top:24px;right:24px;z-index:10000;display:flex;flex-direction:column;gap:12px;pointer-events:none;';document.body.appendChild(this.c)}
static show(msg,type='info',dur=4000){this.init();const col={info:'#00d4ff',success:'#00ff88',error:'#ff3b5c',warning:'#ffb800'},ic={info:'ℹ️',success:'✅',error:'❌',warning:'⚠️'};const t=document.createElement('div');t.style.cssText=`background:rgba(20,24,45,.95);backdrop-filter:blur(20px);border:1px solid ${col[type]}40;border-left:4px solid ${col[type]};border-radius:12px;padding:14px 20px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);max-width:360px;display:flex;align-items:center;gap:10px;pointer-events:auto;`;t.innerHTML=`<span style="font-size:18px">${ic[type]}</span><span>${msg}</span>`;this.c.appendChild(t);setTimeout(()=>t.remove(),dur)}
static success(m){this.show(m,'success')}static error(m){this.show(m,'error')}static info(m){this.show(m,'info')}static warning(m){this.show(m,'warning')}}
const Storage={setUser(u){localStorage.setItem('shaheen_user',JSON.stringify(u))},getUser(){const d=localStorage.getItem('shaheen_user');return d?JSON.parse(d):null},clear(){localStorage.removeItem('shaheen_user')}};
window.API=API;window.Toast=Toast;window.Storage=Storage;
F4

echo "✅ CSS + JS files created"
ls -la platform/frontend/public/css/
ls -la platform/frontend/public/js/
ls -la platform/frontend/serve.js
