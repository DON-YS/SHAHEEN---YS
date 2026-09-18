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
