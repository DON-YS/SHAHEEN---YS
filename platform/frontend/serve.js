#!/usr/bin/env node
const http=require('http'),fs=require('fs'),path=require('path');
const P=process.env.FRONTEND_PORT||8080,R=path.join(__dirname,'public');
const M={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(R,u);if(!f.startsWith(R)){s.writeHead(403);return s.end('Forbidden');}fs.readFile(f,(e,d)=>{if(e){s.writeHead(404,{'Content-Type':'text/plain'});return s.end('404');}s.writeHead(200,{'Content-Type':M[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});s.end(d);});}).listen(P,()=>console.log(`🎨 SHAHEEN-YS Frontend: http://localhost:${P}`));
