// RideLine — bike navigation (Leaflet map, OSRM routing, Nominatim search, Open-Meteo weather & elevation)
const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2800)};
const store={get:k=>{try{return JSON.parse(localStorage.getItem('rl_'+k))}catch(_){return null}},set:(k,v)=>{try{localStorage.setItem('rl_'+k,JSON.stringify(v))}catch(_){}}};
const isPhone=()=>matchMedia('(max-width:860px)').matches;

// ---------- geo helpers ----------
const R=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
function hav(a,b){const dLat=rad(b[0]-a[0]),dLng=rad(b[1]-a[1]),s=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function bearing(a,b){const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0])),x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));return (deg(Math.atan2(y,x))+360)%360}
const fmtD=m=>m<1000?`${Math.max(0,Math.round(m/10)*10)} m`:`${(m/1000).toFixed(m<10000?1:0)} km`;
const fmtT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} h ${m} min`:`${Math.max(1,m)} min`};
const clock=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const COMPASS=['N','NE','E','SE','S','SW','W','NW'],compass=d=>COMPASS[Math.round(d/45)%8];
const DIRW={N:'north',NE:'northeast',E:'east',SE:'southeast',S:'south',SW:'southwest',W:'west',NW:'northwest'};

// ---------- map ----------
const map=L.map('map',{zoomControl:false,attributionControl:true,tap:true}).setView(store.get('view')||[28.6139,77.2090],13);
const esri=p=>`https://server.arcgisonline.com/ArcGIS/rest/services/${p}/MapServer/tile/{z}/{y}/{x}`;
const LAYERS={
 sat:{name:'Satellite',l:L.layerGroup([L.tileLayer(esri('World_Imagery'),{maxZoom:19,maxNativeZoom:18,attribution:'Imagery © Esri'}),L.tileLayer(esri('Reference/World_Transportation'),{maxZoom:19,opacity:.9}),L.tileLayer(esri('Reference/World_Boundaries_and_Places'),{maxZoom:19})])},
 dark:{name:'Night',l:L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:20,subdomains:'abcd',attribution:'© OpenStreetMap contributors © CARTO'})},
 street:{name:'Street',l:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'})}};
let layerKey=store.get('layer')||'sat';if(!LAYERS[layerKey])layerKey='sat';LAYERS[layerKey].l.addTo(map);
$('layerBtn').onclick=()=>{const ks=Object.keys(LAYERS);map.removeLayer(LAYERS[layerKey].l);layerKey=ks[(ks.indexOf(layerKey)+1)%ks.length];LAYERS[layerKey].l.addTo(map);store.set('layer',layerKey);toast(LAYERS[layerKey].name+' map')};
map.on('moveend',()=>{const c=map.getCenter();store.set('view',[+c.lat.toFixed(4),+c.lng.toFixed(4)])});

// ---------- icons ----------
const S=(d,extra='')=>`<svg viewBox="0 0 24 24" ${extra}>${d}</svg>`;
function turnIcon(type,mod){
 if(type==='arrive')return S('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>');
 if(type==='roundabout'||type==='rotary'||type==='roundabout turn'||type==='exit roundabout')return S('<circle cx="12" cy="10" r="4"/><path d="M12 14v7M16 10h4M18 8l2 2-2 2"/>');
 if(type==='depart')return S('<path d="M12 20V5M6 11l6-6 6 6"/>');
 const bent='<path d="M8 21v-8a4 4 0 0 1 4-4h8M16 5l4 4-4 4"/>';
 switch(mod){
  case 'right':return S(bent);case 'left':return S(bent,'style="transform:scaleX(-1)"');
  case 'sharp right':return S('<path d="M7 4v9a5 5 0 0 0 5 5h3M16 14l4 4-4 4"/>'.replace('M16 14l4 4-4 4','M14 14l4 4-4 4'),'style="transform:rotate(180deg) scaleX(-1)"');
  case 'sharp left':return S('<path d="M7 4v9a5 5 0 0 0 5 5h3M14 14l4 4-4 4"/>','style="transform:rotate(180deg)"');
  case 'slight right':return S('<path d="M8 21V12l8-8M10 4h6v6"/>');case 'slight left':return S('<path d="M8 21V12l8-8M10 4h6v6"/>','style="transform:scaleX(-1)"');
  case 'uturn':return S('<path d="M8 21V9a5 5 0 0 1 10 0v4M14 10l4 4 4-4"/>');
  default:return S('<path d="M12 20V5M6 11l6-6 6 6"/>')}}
function instr(s){const m=s.maneuver,mod=m.modifier||'straight',road=s.name||s.ref||'',on=road?` onto ${road}`:'';
 switch(m.type){
  case 'depart':return `Head ${DIRW[compass(m.bearing_after||0)]}${road?' on '+road:''}`;
  case 'arrive':return 'Arrive at your destination';
  case 'roundabout':case 'rotary':return `At the roundabout, take exit ${m.exit||1}${on}`;
  case 'exit roundabout':case 'exit rotary':return `Exit the roundabout${on}`;
  case 'fork':return `Keep ${mod.replace('slight ','')} at the fork${on}`;
  case 'merge':return `Merge ${mod.replace('slight ','')}${on}`;
  case 'on ramp':return `Take the ramp${on}`;case 'off ramp':return `Take the exit${on}`;
  case 'new name':case 'continue':if(mod==='straight')return `Continue${road?' on '+road:' straight'}`;
  default:if(mod==='uturn')return 'Make a U-turn';if(mod==='straight')return `Go straight${on}`;
   return `${mod.startsWith('slight')?'Bear':'Turn'} ${mod.replace('slight ','').replace('sharp ','')}${on}`}}

// ---------- state ----------
let me=null,myAcc=999,heading=0,riderMk=null,accCircle=null,follow=true,from=null,to=store.get('to'),profile=store.get('profile')||'car',route=null,riding=false,demo=null,watchId=null,wake=null,voice=store.get('voice')!==false,stepView=null,rerouting=false,offCount=0;
const stats={t0:0,dist:0,moving:0,max:0,last:null,lastT:0,hist:[],speed:0,tick:null};
const rl=L.layerGroup().addTo(map);let doneLine=null;

// ---------- clock / meta ----------
function meta(){const d=new Date();$('metaDate').textContent='📅 '+d.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'})+'  ·  🕒 '+clock(d)}
meta();setInterval(meta,30000);

// ---------- location ----------
function startWatch(){if(!('geolocation' in navigator)){toast('Location is not available on this device');return}
 if(watchId!=null)return;watchId=navigator.geolocation.watchPosition(p=>{if(!demo)onPos(p)},e=>{if(e.code===1)toast('Allow location access to see yourself on the map');},{enableHighAccuracy:true,maximumAge:2000,timeout:20000})}
function onPos(p){const c=p.coords,ll=[c.latitude,c.longitude],now=p.timestamp||Date.now();myAcc=c.accuracy||10;
 let spd=c.speed!=null&&!isNaN(c.speed)?c.speed:null;
 if(stats.last){const d=hav(stats.last,ll),dt=(now-stats.lastT)/1000;if(spd==null&&dt>0)spd=d/dt;if(d>4)heading=c.heading!=null&&!isNaN(c.heading)?c.heading:bearing(stats.last,ll);
  if(riding&&d>3&&myAcc<50&&d<500){stats.dist+=d;if((spd||0)>1)stats.moving+=dt}}
 stats.speed=Math.max(0,spd||0);if(riding)stats.max=Math.max(stats.max,stats.speed);stats.last=ll;stats.lastT=now;
 const first=!me;me=ll;drawMe();
 if(follow&&(riding||first))map.setView(ll,riding?Math.max(map.getZoom(),16):Math.max(map.getZoom(),15),{animate:!first});
 if(first&&to&&!route)plan();
 if(riding)progress();renderStats();window.SAFE&&SAFE.onPos();window.FEAT&&FEAT.onPos()}
function drawMe(){const html=`<div class="rider"><span class="pulse"></span><span class="core" style="transform:rotate(${heading}deg)">${S('<path d="M12 3 6 20l6-4 6 4z"/>')}</span></div>`;
 if(!riderMk){riderMk=L.marker(me,{icon:L.divIcon({className:'',html,iconSize:[46,46],iconAnchor:[23,23]}),zIndexOffset:1000,interactive:false}).addTo(map);accCircle=L.circle(me,{radius:myAcc,color:'#d6f53f',weight:1,opacity:.4,fillOpacity:.06,interactive:false}).addTo(map)}
 else{riderMk.setLatLng(me);const core=riderMk.getElement()&&riderMk.getElement().querySelector('.core');if(core)core.style.transform=`rotate(${heading}deg)`;accCircle.setLatLng(me).setRadius(Math.min(myAcc,200))}}
$('useLoc').onclick=()=>{from=null;$('from').value='';startWatch();if(me){map.setView(me,16);plan()}else toast('Finding your location…')};
$('recenter').onclick=()=>{follow=true;$('recenter').classList.add('on');if(me)map.setView(me,Math.max(map.getZoom(),16));else{startWatch();toast('Finding your location…')}};
map.on('dragstart',()=>{follow=false;$('recenter').classList.remove('on')});
$('zoomIn').onclick=()=>map.zoomIn();$('zoomOut').onclick=()=>map.zoomOut();

// ---------- search ----------
let sTimer=null,sField=null,sItems=[];
function sugg(field){const q=$(field).value.trim();clearTimeout(sTimer);if(q.length<3){$('sugg').hidden=true;return}
 sTimer=setTimeout(async()=>{try{const c=me||[map.getCenter().lat,map.getCenter().lng];
  const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}&viewbox=${c[1]-1},${c[0]+1},${c[1]+1},${c[0]-1}`);
  sItems=await r.json();sField=field;$('sugg').innerHTML=sItems.length?sItems.map((it,i)=>{const [a,...b]=it.display_name.split(', ');return `<li data-i="${i}">${a}<small>${b.slice(0,3).join(', ')}</small></li>`}).join(''):'<li>No places found</li>';$('sugg').hidden=false}
  catch(_){toast('Search needs an internet connection')}},400)}
$('to').oninput=()=>sugg('to');$('from').oninput=()=>sugg('from');
$('sugg').onclick=e=>{const li=e.target.closest('li[data-i]');if(!li)return;const it=sItems[+li.dataset.i],p={lat:+it.lat,lng:+it.lon,name:it.display_name.split(', ')[0]};
 $(sField).value=p.name;$('sugg').hidden=true;if(sField==='to'){to=p;store.set('to',to)}else from=p;plan()};
document.addEventListener('click',e=>{if(!e.target.closest('.plan'))$('sugg').hidden=true});
map.on('contextmenu',async e=>{to={lat:e.latlng.lat,lng:e.latlng.lng,name:'Dropped pin'};$('to').value='Dropped pin';plan();
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=17`),j=await r.json();if(j&&j.name||j.address){to.name=j.name||j.address.road||j.address.suburb||'Dropped pin';$('to').value=to.name;$('destTitle').textContent=to.name;store.set('to',to)}}catch(_){}});
document.querySelectorAll('#profile button').forEach(b=>{b.classList.toggle('on',b.dataset.p===profile);b.onclick=()=>{profile=b.dataset.p;store.set('profile',profile);document.querySelectorAll('#profile button').forEach(x=>x.classList.toggle('on',x===b));if(route)plan()}});
if(to){$('to').value=to.name;$('destTitle').textContent=to.name}

// ---------- routing ----------
async function plan(opts={}){if(!to)return;const a=opts.from||(from?[from.lat,from.lng]:me);if(!a){startWatch();toast('Turn on location, or type a start point');return}
 $('statusChip').textContent=opts.reroute?'Re-routing…':'Finding route…';
 try{const url=`https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${a[1]},${a[0]};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`;
  const j=await (await fetch(url)).json();if(j.code!=='Ok'||!j.routes||!j.routes.length)throw new Error(j.message||'No route');
  build(j.routes[0]);draw(!opts.reroute);weather();elevation();window.SAFE&&SAFE.onRoute();rerouting=false;offCount=0;
  $('statusChip').textContent=riding?'Navigating':'Route ready';$('destTitle').textContent=to.name;$('demoBtn').hidden=riding;
  if(opts.reroute)say('Route recalculated')}
 catch(e){rerouting=false;$('statusChip').textContent='No route';toast('Could not find a route. Check your connection or try another place.')}}
function build(r){const co=r.geometry.coordinates.map(([x,y])=>[y,x]),cum=[0];for(let i=1;i<co.length;i++)cum.push(cum[i-1]+hav(co[i-1],co[i]));
 let k=0;const steps=r.legs[0].steps.map(s=>{const loc=[s.maneuver.location[1],s.maneuver.location[0]];let bi=k,bd=1e12;for(let i=k;i<co.length;i++){const d=hav(co[i],loc);if(d<bd){bd=d;bi=i}if(d<1)break;if(i-k>4000)break}k=bi;
  return {ll:loc,cum:cum[bi],text:instr(s),type:s.maneuver.type,mod:s.maneuver.modifier||'straight',dist:s.distance,said:{}}});
 route={co,cum,dist:r.distance,dur:r.duration,steps,idx:0}}
function draw(fit){rl.clearLayers();doneLine=null;const co=route.co;
 L.polyline(co,{color:'#0b120c',weight:12,opacity:.55,interactive:false}).addTo(rl);
 L.polyline(co,{color:'#d6f53f',weight:20,opacity:.22,interactive:false,className:'glow'}).addTo(rl);
 L.polyline(co,{color:'#d6f53f',weight:9,opacity:.28,interactive:false}).addTo(rl);
 L.polyline(co,{color:'#d6f53f',weight:6,opacity:1,interactive:false,dashArray:'0 12',lineCap:'round'}).addTo(rl);
 doneLine=L.polyline([],{color:'#7d8a78',weight:6,opacity:.95,interactive:false}).addTo(rl);
 const turns=route.steps.filter(s=>s.type!=='depart'&&s.type!=='arrive'),every=Math.max(1,Math.ceil(turns.length/18));
 turns.forEach((s,i)=>{L.marker(s.ll,{icon:L.divIcon({className:'',html:'<div class="tdot"></div>',iconSize:[12,12],iconAnchor:[6,6]}),interactive:false}).addTo(rl);
  if(i%every===0)L.marker(s.ll,{icon:L.divIcon({className:'',html:`<span class="rlabel turn">${turnIcon(s.type,s.mod)}${fmtD(s.cum)}</span>`,iconSize:[0,0],iconAnchor:[0,26]}),interactive:false}).addTo(rl)});
 const mid=route.co[Math.floor(co.length/2)];L.marker(mid,{icon:L.divIcon({className:'',html:`<span class="rlabel">${fmtD(route.dist)} · ${fmtT(route.dur)}</span>`,iconSize:[0,0]}),interactive:false}).addTo(rl);
 L.marker(co[0],{icon:L.divIcon({className:'',html:`<div class="pin start">${S('<circle cx="12" cy="12" r="4"/>')}</div>`,iconSize:[38,38],iconAnchor:[19,19]})}).addTo(rl);
 L.marker(co[co.length-1],{icon:L.divIcon({className:'',html:`<div class="pin">${S('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>')}</div>`,iconSize:[38,38],iconAnchor:[19,19]})}).addTo(rl);
 if(fit){const ph=isPhone();map.fitBounds(L.latLngBounds(co),{paddingTopLeft:ph?[30,170]:[350,160],paddingBottomRight:ph?[30,150]:[360,140],maxZoom:17})}
 $('turnList').innerHTML=route.steps.map((s,i)=>`<li data-i="${i}"><span class="ti">${turnIcon(s.type,s.mod)}</span><span>${s.text}</span><small>${fmtD(s.cum)}</small></li>`).join('');
 $('rDist').textContent=fmtD(route.dist);$('rTime').textContent=fmtT(route.dur);$('routeChip').textContent=`${route.steps.length-2} turns · ${profile==='car'?'Motorbike':'Cycle'}`;
 dock();showNext();summary()}
function summary(){if(!route)return;$('summary').hidden=false;$('sumName').textContent=to.name;$('sumSub').textContent=`${fmtD(route.dist)} · ${profile==='car'?'Motorbike':'Cycle'} · ETA ${clock(new Date(Date.now()+route.dur*1000))}`;$('sumTime').textContent=fmtT(route.dur);$('sumDist').textContent=fmtD(route.dist);$('sumChip').textContent=$('routeChip').textContent.split('· ').pop()}
$('turnList').onclick=e=>{const li=e.target.closest('li[data-i]');if(!li||!route)return;const i=+li.dataset.i;stepView=i;follow=false;$('recenter').classList.remove('on');map.flyTo(route.steps[i].ll,17,{duration:.6});showNext(i);if(isPhone())minSheet(true)};
$('nextStep').onclick=()=>stepNav(1);$('prevStep').onclick=()=>stepNav(-1);
function stepNav(d){if(!route)return;const base=stepView??route.idx;const i=Math.max(0,Math.min(route.steps.length-1,base+d));stepView=i;follow=false;$('recenter').classList.remove('on');map.flyTo(route.steps[i].ll,17,{duration:.5});showNext(i)}

// ---------- navigation progress ----------
function project(ll){const co=route.co,lat0=rad(ll[0]),kx=Math.cos(lat0)*R*Math.PI/180,ky=R*Math.PI/180;let best={d:1e12,along:0,i:0};
 const from=Math.max(0,(route.pi||0)-30),toI=Math.min(co.length-1,(route.pi||0)+400),scan=(a,b)=>{for(let i=a;i<b;i++){const A=co[i],B=co[i+1],ax=(A[1]-ll[1])*kx,ay=(A[0]-ll[0])*ky,bx=(B[1]-ll[1])*kx,by=(B[0]-ll[0])*ky,dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
  let t=L2?-(ax*dx+ay*dy)/L2:0;t=Math.max(0,Math.min(1,t));const px=ax+t*dx,py=ay+t*dy,d=Math.hypot(px,py);if(d<best.d)best={d,i,along:route.cum[i]+t*(route.cum[i+1]-route.cum[i]),pt:[A[0]+t*(B[0]-A[0]),A[1]+t*(B[1]-A[1])]}}};
 scan(from,toI);if(best.d>80)scan(0,co.length-1);return best}
function progress(){if(!route||!me)return;const p=project(me);route.pi=p.i;route.along=p.along;
 if(p.d>45&&myAcc<40){if(++offCount>=3&&!rerouting){rerouting=true;toast('Off route — finding a new way');plan({from:me,reroute:true});return}}else offCount=0;
 doneLine.setLatLngs(route.co.slice(0,p.i+1).concat([p.pt]));
 const remain=route.dist-p.along;if(remain<25){arrive();return}
 let ni=route.steps.findIndex((s,i)=>i>0&&s.cum>p.along+3);if(ni<0)ni=route.steps.length-1;route.idx=ni;const s=route.steps[ni],dTo=s.cum-p.along;
 if(stepView==null)showNext(ni,dTo);
 if(!s.said.far&&dTo<600&&dTo>250){s.said.far=1;say(`In ${fmtD(Math.round(dTo/50)*50).replace('m','metres').replace('km','kilometres')}, ${s.text}`)}
 if(!s.said.near&&dTo<=130&&dTo>35){s.said.near=1;say(`In ${Math.round(dTo/10)*10} metres, ${s.text}`)}
 if(!s.said.now&&dTo<=35){s.said.now=1;say(s.text)}
 document.querySelectorAll('#turnList li').forEach((li,i)=>{li.classList.toggle('done',i<ni);li.classList.toggle('on',i===ni)});dock();window.SAFE&&SAFE.onProgress(p.along)}
function showNext(i,dTo){if(!route){$('next').hidden=true;return}i=i??route.idx??1;if(i===0&&route.steps.length>1&&!riding)i=1;const s=route.steps[i];if(!s)return;
 $('next').hidden=false;$('nicon').innerHTML=turnIcon(s.type,s.mod);$('ninstr').textContent=s.text;
 const d=dTo??(s.cum-(route.along||0));$('ndist').textContent=fmtD(d);$('next').classList.toggle('soon',riding&&d<150);
 const n=route.steps[i+1];$('nthen').textContent=n&&n.cum-s.cum<400?`Then ${n.text.charAt(0).toLowerCase()+n.text.slice(1)}`:(stepView!=null?`Turn ${i} of ${route.steps.length-1} · ${fmtD(s.cum)} from start`:'')}
function dock(){if(!route){$('dRemain').textContent='—';$('dEta').textContent='—';return}const remain=route.dist-(route.along||0),avgPlan=route.dist/route.dur,avgMe=stats.moving>60?stats.dist/stats.moving:0,v=avgMe>2?(avgMe+avgPlan)/2:avgPlan;
 $('dRemain').textContent=(remain/1000).toFixed(remain<10000?1:0);const eta=new Date(Date.now()+remain/v*1000);$('dEta').textContent=clock(eta).replace(/\s?[AP]M/i,'');$('metaEta').textContent='🏁 ETA '+clock(eta)}
function arrive(){say('You have arrived at your destination');toast('🏁 You have arrived!');$('statusChip').textContent='Arrived';$('next').hidden=false;$('nicon').innerHTML=turnIcon('arrive');$('ndist').textContent='Arrived';$('ninstr').textContent=to.name;$('nthen').textContent=`${(stats.dist/1000).toFixed(1)} km in ${fmtT((Date.now()-stats.t0)/1000)}`;stopRide(true)}

// ---------- ride start / stop ----------
$('goBtn').onclick=()=>riding?stopRide():startRide();
async function startRide(){startWatch();riding=true;follow=true;stepView=null;$('recenter').classList.add('on');Object.assign(stats,{t0:Date.now(),dist:0,moving:0,max:0,hist:[]});
 $('goBtn').classList.add('stop');$('goTxt').textContent='STOP';$('goSub').textContent=route?'navigating':'free ride';$('liveChip').hidden=false;$('statusChip').textContent=route?'Navigating':'Free ride';$('demoBtn').hidden=true;
 window.SAFE&&SAFE.onStart();if(route){route.steps.forEach(s=>s.said={});say('Ride started. Wear your helmet. '+route.steps[0].text);if(me)progress()}if(me)map.setView(me,17);
 clearInterval(stats.tick);stats.tick=setInterval(()=>{const sp=stats.speed*3.6;stats.hist.push(sp);if(stats.hist.length>36)stats.hist.shift();renderStats()},2000);
 try{wake=await navigator.wakeLock.request('screen')}catch(_){};if(isPhone())openSheet('ride')}
function stopRide(arrived){if(riding&&window.FEAT)FEAT.onStop(arrived);riding=false;clearInterval(stats.tick);if(demo){clearInterval(demo);demo=null}
 $('goBtn').classList.remove('stop');$('goTxt').textContent='START';$('goSub').textContent='ride';$('liveChip').hidden=true;if(!arrived)$('statusChip').textContent=route?'Route ready':'Plan a ride';$('demoBtn').hidden=!route;
 try{wake&&wake.release()}catch(_){}wake=null;renderStats()}
document.addEventListener('visibilitychange',async()=>{if(riding&&document.visibilityState==='visible'&&!wake){try{wake=await navigator.wakeLock.request('screen')}catch(_){}}});

// ---------- demo ride ----------
$('demoBtn').onclick=()=>{if(!route)return;const co=route.co,cum=route.cum;let along=0;const v=40/3.6;startRide();toast('Demo ride: simulating 40 km/h');
 demo=setInterval(()=>{along+=v;if(along>=route.dist)along=route.dist-1;let i=cum.findIndex(c=>c>along);if(i<1)i=1;const t=(along-cum[i-1])/(cum[i]-cum[i-1]||1),A=co[i-1],B=co[i];
  onPos({coords:{latitude:A[0]+t*(B[0]-A[0]),longitude:A[1]+t*(B[1]-A[1]),accuracy:5,speed:v*(0.85+Math.random()*.3),heading:bearing(A,B)},timestamp:Date.now()})},1000)};

// ---------- stats ----------
function renderStats(){const el=riding?(Date.now()-stats.t0)/1000:0;$('sSpeed').textContent=Math.round(stats.speed*3.6);
 $('sAvg').textContent=stats.moving>5?Math.round(stats.dist/stats.moving*3.6):0;$('sDist').textContent=(stats.dist/1000).toFixed(1);
 const h=Math.floor(el/3600),m=Math.floor(el%3600/60),s=Math.floor(el%60);$('sTime').textContent=h?`${h}:${String(m).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;$('sMax').textContent=`max ${Math.round(stats.max*3.6)} km/h`;
 const hist=stats.hist.slice(-36),pad=Array(36-hist.length).fill(null).concat(hist),mx=Math.max(40,...hist);
 $('bars').innerHTML=pad.map(v=>v==null?'<i></i>':`<i class="${v<25?'e':v<60?'c':'f'}" style="height:${Math.max(6,v/mx*100)}%"></i>`).join('')}
renderStats();

// ---------- voice ----------
function say(t){if(!voice||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-IN';u.rate=1;speechSynthesis.speak(u)}catch(_){}}
function syncVoice(){$('voiceBtn').setAttribute('aria-pressed',voice)}syncVoice();
$('voiceBtn').onclick=()=>{voice=!voice;store.set('voice',voice);syncVoice();toast(voice?'Voice guidance on':'Voice guidance off');if(voice)say('Voice guidance on')};

// ---------- weather ----------
async function weather(){const p=route?route.co[0]:me;if(!p)return;
 try{const j=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p[0].toFixed(3)}&longitude=${p[1].toFixed(3)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,is_day&hourly=precipitation_probability&forecast_hours=3&timezone=auto`)).json(),c=j.current;
  const ws=Math.round(c.wind_speed_10m),wd=c.wind_direction_10m,rain=Math.max(0,...(j.hourly&&j.hourly.precipitation_probability||[0]).slice(0,3)),tC=Math.round(c.temperature_2m);
  $('windSpd').textContent=ws;$('windDir').textContent=`km/h, from ${DIRW[compass(wd)]}`;$('temp').textContent=tC+'°C';$('rain').textContent=rain+'%';
  let rel='';if(route&&route.co.length>1){const k=route.co.findIndex((_,i)=>route.cum[i]>800),rb=bearing(route.co[0],route.co[k>0?k:route.co.length-1]),r=(wd-rb+360)%360;rel=r<45||r>315?'Headwind':r>135&&r<225?'Tailwind':`Crosswind ${r<180?'right':'left'}`}
  $('windChip').textContent=rel||`Wind ${compass(wd)}`;
  const tips=[];if(rain>=50)tips.push(`Rain is likely (${rain}%). Carry rain gear and brake gently on wet roads.`);
  if(rel==='Headwind'&&ws>=20)tips.push(`Strong headwind of ${ws} km/h at the start — expect a slower ride.`);else if(rel.startsWith('Crosswind')&&ws>=25)tips.push(`Gusty ${rel.toLowerCase()} at ${ws} km/h — hold the handlebar firmly on open stretches.`);
  if(tC>=36)tips.push(`It is ${tC}°C. Drink water every 30 minutes and avoid the midday sun.`);else if(tC<=10)tips.push(`It is ${tC}°C. Wear gloves and a warm layer.`);
  if(!c.is_day)tips.push('It is dark — switch on your headlight and wear something reflective.');
  if(route)tips.push(`${fmtD(route.dist)} to ${to.name}, about ${fmtT(route.dur)}.`);
  $('tipText').textContent=tips.slice(0,2).join(' ')||'Good riding weather. Ride safe and wear your helmet.';$('tipUpd').textContent='● Updated '+clock(new Date())}
 catch(_){$('windChip').textContent='Weather offline'}}

// ---------- elevation profile ----------
async function elevation(){if(!route)return;const n=Math.min(90,Math.max(10,Math.round(route.dist/150))),pts=[];
 for(let k=0;k<n;k++){const target=route.dist*k/(n-1);let i=route.cum.findIndex(c=>c>=target);if(i<0)i=route.co.length-1;pts.push(route.co[i])}
 try{const j=await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${pts.map(p=>p[0].toFixed(4)).join(',')}&longitude=${pts.map(p=>p[1].toFixed(4)).join(',')}`)).json(),e=j.elevation;if(!e||!e.length)throw 0;
  let climb=0;for(let i=1;i<e.length;i++)if(e[i]>e[i-1])climb+=e[i]-e[i-1];const mn=Math.min(...e),mx=Math.max(...e),rng=Math.max(20,mx-mn),W=300,H=90,
  xy=e.map((v,i)=>[i/(e.length-1)*W,H-8-(v-mn)/rng*(H-24)]),line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  $('elevSvg').innerHTML=`<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6f53f" stop-opacity=".55"/><stop offset="1" stop-color="#d6f53f" stop-opacity="0"/></linearGradient></defs>
   <path d="M0 ${H} ${line.slice(1)} L${W} ${H}Z" fill="url(#eg)"/><path d="${line}" fill="none" stroke="#d6f53f" stroke-width="2" vector-effect="non-scaling-stroke"/>
   <circle cx="${xy[xy.length-1][0]}" cy="${xy[xy.length-1][1]}" r="4" fill="#d6f53f"/>`;
  $('rClimb').textContent=Math.round(climb)+' m';setTimeout(summary,0);$('elab').innerHTML=`<span>Low ${Math.round(mn)} m</span><span>High ${Math.round(mx)} m</span>`;$('routeChip').textContent=`${route.steps.length-2} turns · ${climb/route.dist*1000>15?'Hilly':climb/route.dist*1000>5?'Rolling':'Mostly flat'}`}
 catch(_){$('rClimb').textContent='—';$('elevSvg').innerHTML='<text x="150" y="50" text-anchor="middle" fill="#a6b3a2" font-size="12">Elevation unavailable</text>'}}

// ---------- tabs & mobile sheet ----------
const home=new Map();let curTab='home';
function openSheet(tab){curTab=tab;document.body.classList.add('sheet');document.body.classList.remove('sheetmin');
 document.querySelectorAll('#bnav button,#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 const body=$('sbody');[...body.children].forEach(back);
 const cards=[...document.querySelectorAll('.side .card')].filter(c=>(c.dataset.sheet||'').split(' ').includes(tab));
 cards.forEach(c=>{if(!home.has(c))home.set(c,{p:c.parentNode,n:c.nextSibling});body.append(c)});body.scrollTop=0}
function back(c){const h=home.get(c);if(h)h.p.insertBefore(c,h.n&&h.n.parentNode===h.p?h.n:null);home.delete(c)}
function closeSheet(){document.body.classList.remove('sheet','sheetmin');[...$('sbody').children].forEach(back)}
function minSheet(on=true){document.body.classList.toggle('sheetmin',on)}
$('grab').onclick=()=>minSheet(!document.body.classList.contains('sheetmin'));
$('sheetBtn').onclick=()=>document.body.classList.contains('sheet')?closeSheet():openSheet('home');
$('bnav').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab===curTab&&document.body.classList.contains('sheet')&&!document.body.classList.contains('sheetmin')){minSheet(true);return}openSheet(b.dataset.tab)};
$('tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));
 const c=document.querySelector(`.side [data-sheet~="${b.dataset.tab}"]`);if(c)c.scrollIntoView({behavior:'smooth',block:'nearest'});
 if(b.dataset.tab==='home'&&route){follow=false;map.fitBounds(L.latLngBounds(route.co),{paddingTopLeft:[350,160],paddingBottomRight:[360,140]})}};
const mq=matchMedia('(max-width:860px)');mq.addEventListener('change',()=>mq.matches?openSheet(curTab):closeSheet());
if(mq.matches)openSheet('home');

// ---------- boot ----------
startWatch();
if('serviceWorker' in navigator){}
