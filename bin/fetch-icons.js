#!/usr/bin/env node
// One-shot: grab each platform's favicon (GitHub org avatar for repo-hosted, site favicon
// otherwise); generate a small SVG tile fallback when none is fetchable. Writes site/icons/*,
// patches each platform with an `icon` path. Run once, then delete.
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), ICONS=path.join(ROOT,'site','icons');
fs.mkdirSync(ICONS,{recursive:true});
const FILE=path.join(ROOT,'site','index.html');
let html=fs.readFileSync(FILE,'utf8');
const arr=JSON.parse(html.match(/const PLATFORMS=(\[[\s\S]*?\n\]);/)[1]);

const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const IMG=new Set(['image/png','image/x-icon','image/vnd.microsoft.icon','image/jpeg','image/gif','image/webp','image/svg+xml']);
function tryFetch(url,out){
  try{
    execSync(`curl -fsSL --max-time 18 -A "Mozilla/5.0" -o "${out}" "${url}"`,{stdio:'ignore'});
    const sz=fs.statSync(out).size;
    const mime=execSync(`file -b --mime-type "${out}"`,{encoding:'utf8'}).trim();
    if(sz>120 && IMG.has(mime)) return true;
  }catch(e){}
  try{fs.unlinkSync(out);}catch(e){}
  return false;
}
function candidates(p){
  try{
    const u=new URL(p.url);
    if(u.hostname==='github.com'){
      const owner=u.pathname.split('/').filter(Boolean)[0];
      return [`https://github.com/${owner}.png?size=120`];
    }
    const d=u.hostname.replace(/^www\./,'');
    return [`https://${d}/favicon.ico`,`https://${d}/favicon.png`,
            `https://icons.duckduckgo.com/ip3/${d}.ico`];
  }catch(e){ return []; }
}
// deterministic color from name
function hue(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h;}
function svgTile(name){
  const init=name.replace(/[^A-Za-z0-9]/g,'').slice(0,1).toUpperCase()||'?';
  const h=hue(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="hsl(${h} 62% 52%)"/><text x="16" y="22" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="16" font-weight="700" fill="#fff">${init}</text></svg>`;
}

let fetched=0, svg=0;
for(const p of arr){
  const s=slug(p.name);
  let saved=null;
  for(const url of candidates(p)){
    const ext = url.includes('.png')||url.includes('github.com')?'png':'ico';
    const out=path.join(ICONS,`${s}.${ext}`);
    if(tryFetch(url,out)){ saved=`icons/${s}.${ext}`; fetched++; break; }
  }
  if(!saved){
    fs.writeFileSync(path.join(ICONS,`${s}.svg`), svgTile(p.name));
    saved=`icons/${s}.svg`; svg++;
  }
  p.icon=saved;
  console.log(`  ${p.name.padEnd(14)} -> ${saved}`);
}
const lit='[\n'+arr.map(o=>JSON.stringify(o)).join(',\n')+'\n]';
html=html.replace(/const PLATFORMS=\[[\s\S]*?\n\];/,'const PLATFORMS='+lit+';');
fs.writeFileSync(FILE,html);
console.log(`\nReal favicons: ${fetched} · SVG fallbacks: ${svg} · total ${arr.length}`);
