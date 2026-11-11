// RideLine more: multi-stop trips, offline map download, auto night map, weekly stats & streak,
// convoy mode, GPX export, English-first Nova.
Object.assign(RI,{
 download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
 week:'<path d="M4 20V10M9 20V4M14 20v-7M19 20v-11M2 20h20"/>',
 group:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',
 gpx:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8 16l2.5-3 2 2 3.5-4"/>',
 stop:'<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>',
});
['offH:download','weekH:week'].forEach(x=>{const [id,n]=x.split(':');$(id).insertAdjacentHTML('afterbegin',ic(n))});
$('regroupI').innerHTML=ic('group');

// ===================== English-first Nova =====================
if(!SET.get('novaLangSet',false)){SET.set('novaLangSet',true);if(NOVA.lang==='auto'){NOVA.lang='en';SET.set('novaLang','en');document.querySelectorAll('#novaLang button').forEach(b=>b.classList.toggle('on',b.dataset.l==='en'));chips()}}

// ===================== multi-stop trips =====================
function renderStops(){$('stopList').innerHTML=stops.map((s,i)=>`<div class="stopc"><span class="sn">${i+1}</span><span class="st">${esc2(s.name)}</span><button data-i="${i}" aria-label="Remove stop">${ic('x')}</button></div>`).join('')}
window.renderStops=renderStops;renderStops();
$('stopIn').oninput=()=>sugg('stopIn');
$('stopList').onclick=e=>{const b=e.target.closest('button[data-i]');if(!b)return;stops.splice(+b.dataset.i,1);store.set('stops',stops);renderStops();if(to)plan()};
// numbered stop pins on the map
const stopLayer=L.layerGroup().addTo(map);
function drawStops(){stopLayer.clearLayers();stops.forEach((s,i)=>L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:`<div class="stoppin">${i+1}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),title:s.name,zIndexOffset:400}).addTo(stopLayer))}
const _onRoute2=SAFE.onRoute;SAFE.onRoute=function(){_onRoute2();drawStops()};drawStops();

// ===================== offline maps =====================
function tileXY(lat,lng,z){const n=2**z;return [Math.floor((lng+180)/360*n),Math.floor((1-Math.log(Math.tan(rad(lat))+1/Math.cos(rad(lat)))/Math.PI)/2*n)]}
function tileUrlsFor(points,radiusTiles,zMin,zMax,max){const L2=LAYERS[layerKey].l,layers=L2.getLayers?L2.getLayers():[L2],set=new Set();
 for(let z=zMin;z<=zMax;z++){const seen=new Set();for(const p of points){const [x,y]=tileXY(p[0],p[1],z);for(let dx=-radiusTiles;dx<=radiusTiles;dx++)for(let dy=-radiusTiles;dy<=radiusTiles;dy++){const k=(x+dx)+'/'+(y+dy);if(seen.has(k))continue;seen.add(k);
   for(const tl of layers){if(!tl.getTileUrl)continue;const keep=tl._tileZoom;tl._tileZoom=z;set.add(tl.getTileUrl({x:x+dx,y:y+dy,z}));tl._tileZoom=keep;if(set.size>=max)return [...set]}}}}
 return [...set]}
let offBusy=false;
async function saveTiles(urls,label){if(!OFF.ok){toast('Offline maps need the app or an https site');return}if(offBusy)return;offBusy=true;$('offBar').hidden=false;let done=0,fail=0,bytes=0;const c=await caches.open(TILE_CACHE);
 const q=urls.slice(),work=async()=>{while(q.length){const u=q.shift();try{if(!(await c.match(u))){const r=await fetch(u,{mode:'cors'});if(!r.ok)throw 0;const b=await r.clone().blob();bytes+=b.size;await c.put(u,r)}}catch(_){fail++}done++;
  $('offFill').style.width=Math.round(done/urls.length*100)+'%';$('offTxt').textContent=`Saving ${label}… ${done}/${urls.length} tiles`}};
 await Promise.all(Array.from({length:6},work));offBusy=false;$('offBar').hidden=true;
 const meta=store.get('offline')||[];meta.unshift({label,t:Date.now(),tiles:urls.length-fail,mb:+(bytes/1048576).toFixed(1),style:LAYERS[layerKey].name});store.set('offline',meta.slice(0,10));offUI();
 toast(fail?`Saved ${urls.length-fail} tiles (${fail} failed — check network)`:`${label} saved for offline use`)}
function offUI(){const m=store.get('offline')||[];$('offTxt').textContent=m.length?`Saved: ${m.slice(0,3).map(x=>`${x.label} (${x.style}, ${x.mb} MB)`).join(', ')}`:'Save the map so it keeps working without mobile network.';$('offClear').hidden=!m.length}
$('offRoute').onclick=()=>{if(!route){toast('Plan a route first');return}const step=Math.max(1,Math.floor(route.co.length/400)),pts=route.co.filter((_,i)=>i%step===0);
 const urls=tileUrlsFor(pts,1,10,16,6000);toast(`Saving about ${urls.length} map tiles for this route`);saveTiles(urls,'Route to '+to.name)};
$('offArea').onclick=()=>{const c=me||[map.getCenter().lat,map.getCenter().lng],urls=tileUrlsFor([c],2,10,13,3000).concat(tileUrlsFor([c],3,14,15,3000)).concat(tileUrlsFor([c],4,16,16,3000));saveTiles([...new Set(urls)],'Area around you')};
$('offClear').onclick=async()=>{if(OFF.ok)await caches.delete(TILE_CACHE);store.set('offline',[]);offUI();toast('Saved maps deleted')};
offUI();

// ===================== auto night map =====================
function sunTimes(lat,lng,d=new Date()){const r=Math.PI/180,day=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5),g=2*Math.PI/365*(day-1),
 eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g),
 ha=Math.acos(Math.cos(90.833*r)/(Math.cos(lat*r)*Math.cos(dec))-Math.tan(lat*r)*Math.tan(dec))/r,mid=720-4*lng-eq,base=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
 return {rise:new Date(base+(mid-4*ha)*6e4),set:new Date(base+(mid+4*ha)*6e4)}}
let autoNight=SET.get('autoNight',true);
function nightCheck(){if(!autoNight)return;const c=me||[map.getCenter().lat,map.getCenter().lng],s=sunTimes(c[0],c[1]),now=new Date(),night=now<s.rise||now>s.set;
 if(night&&layerKey!=='dark'){SET.set('dayLayer',layerKey);setLayer('dark');toast('Night map on after sunset')}
 else if(!night&&layerKey==='dark'&&SET.get('dayLayer',null)){setLayer(SET.get('dayLayer'));SET.set('dayLayer',null)}}
setTimeout(nightCheck,3000);setInterval(nightCheck,300000);
const _pickUI2=pickUI;pickUI=function(){_pickUI2();$('lpick').insertAdjacentHTML('beforeend',`<label class="ltog"><span><b>Auto night map</b><small>Night map from sunset to sunrise</small></span><input type="checkbox" id="pickNight" ${autoNight?'checked':''}><i></i></label>`);
 $('pickNight').onchange=e=>{autoNight=e.target.checked;SET.set('autoNight',autoNight);if(!autoNight)SET.set('dayLayer',null);else nightCheck()}};

// ===================== weekly stats & streak =====================
function weekUI(){const h=store.get('history')||[],day=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()},today=day(Date.now()),km={};
 h.forEach(r=>{const k=day(r.t);km[k]=(km[k]||0)+r.dist/1000});
 const days=Array.from({length:7},(_,i)=>today-(6-i)*864e5),vals=days.map(d=>km[d]||0),mx=Math.max(5,...vals);
 let streak=0;for(let d=km[today]?today:today-864e5;km[d];d-=864e5)streak++;
 $('wkKm').textContent=Math.round(vals.reduce((a,b)=>a+b,0));$('wkStreak').textContent=streak;$('wkRides').textContent=h.filter(r=>r.t>=days[0]).length;
 $('wkChart').innerHTML=days.map((d,i)=>`<div class="${d===today?'today':''}"><em>${vals[i]?Math.round(vals[i]):''}</em><i style="height:${Math.max(4,vals[i]/mx*100)}%"></i><small>${new Date(d).toLocaleDateString('en',{weekday:'short'}).slice(0,2)}</small></div>`).join('')}
weekUI();const _rh3=renderHist;renderHist=function(){_rh3();weekUI();gpxButtons()};

// ===================== GPX export =====================
function gpx(r){const t0=new Date(r.t),pts=r.pts||[],step=pts.length>1?r.secs/(pts.length-1):0;
 return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RideLine" xmlns="http://www.topografix.com/GPX/1/1">\n <metadata><name>${esc2(r.to)}</name><time>${t0.toISOString()}</time></metadata>\n <trk><name>${esc2(r.to)} · ${(r.dist/1000).toFixed(1)} km</name><type>motorcycling</type><trkseg>\n`+
  pts.map((p,i)=>`  <trkpt lat="${p[0]}" lon="${p[1]}"><time>${new Date(t0.getTime()+i*step*1000).toISOString()}</time></trkpt>`).join('\n')+`\n </trkseg></trk>\n</gpx>\n`}
function saveFile(name,mime,text){try{if(window.NovaNative&&NovaNative.shareFile){NovaNative.shareFile(name,mime,text);return}}catch(_){}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
function gpxButtons(){const h=store.get('history')||[];document.querySelectorAll('#histList li[data-i]').forEach(li=>{if(li.querySelector('.gpxb'))return;const r=h[+li.dataset.i];if(!r||!r.pts||r.pts.length<2)return;
 li.insertAdjacentHTML('beforeend',`<button class="gpxb" data-g="${li.dataset.i}" title="Export GPX">${ic('gpx')}</button>`)})}
$('histList').addEventListener('click',e=>{const b=e.target.closest('.gpxb');if(!b)return;e.stopPropagation();const r=(store.get('history')||[])[+b.dataset.g];if(!r)return;
 const d=new Date(r.t),name=`RideLine-${d.toISOString().slice(0,10)}-${(r.to||'ride').replace(/[^A-Za-z0-9]+/g,'-').slice(0,30)}.gpx`;saveFile(name,'application/gpx+xml',gpx(r));toast('GPX ready: '+name)},true);
gpxButtons();

// ===================== convoy mode =====================
let convoy=SET.get('convoy',true);$('convoyOn').checked=convoy;$('convoyOn').onchange=e=>{convoy=e.target.checked;SET.set('convoy',convoy)};
const CV={far:{},stop:{},stopSince:{}};
setInterval(()=>{if(!convoy||!G.room||!me||!riding)return;const now=Date.now();
 for(const m of Object.values(G.members)){if(m.id===G.id||m.lat==null)continue;const d=hav(me,[m.lat,m.lng]);
  if(d>1500&&!CV.far[m.id]){CV.far[m.id]=1;say(`${m.name} is ${(d/1000).toFixed(1)} kilometres away from the group`);toast(`${m.name} is ${fmtD(d)} away`)}else if(d<800)CV.far[m.id]=0;
  if(m.riding&&(m.spd||0)<3){CV.stopSince[m.id]=CV.stopSince[m.id]||now;if(now-CV.stopSince[m.id]>120000&&!CV.stop[m.id]){CV.stop[m.id]=1;say(`${m.name} has stopped for two minutes`);toast(`${m.name} has stopped — check on them`)}}
  else{CV.stopSince[m.id]=0;CV.stop[m.id]=0}}},10000);
$('regroupBtn').onclick=()=>{if(!G.room){toast('Join a group first');return}if(!me){toast('Turn on GPS first');return}
 gSend({t:'msg',text:`Regroup at my location`,name:myName(),meet:{ll:[+me[0].toFixed(5),+me[1].toFixed(5)]}});toast('Regroup request sent')};
const _gOn2=gOn;gOn=function(m){_gOn2(m);if(m.t==='msg'&&m.meet&&m.id!==G.id){const ll=m.meet.ll;say(`${m.name} asks everyone to regroup at their location`);
 toast(`${m.name}: regroup — route ready`);to={lat:ll[0],lng:ll[1],name:`${m.name} (regroup)`};$('to').value=to.name;from=null;plan()}};
