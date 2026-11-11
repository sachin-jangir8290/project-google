// RideLine features: Explore (photo cards + place detail), Ride history, Group ride.
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ===================== Explore nearby (Wikipedia places with photos) =====================
const EX={list:[],tab:'near',cur:null,loaded:0,at:null};
const level=km=>km<8?'Easy':km<25?'Moderate':km<60?'Long':'Expert';
const estT=m=>m*1.3/(profile==='car'?28/3.6:15/3.6);
const satThumb=(lat,lng)=>{const z=15,n=2**z,x=Math.floor((lng+180)/360*n),y=Math.floor((1-Math.log(Math.tan(rad(lat))+1/Math.cos(rad(lat)))/Math.PI)/2*n);return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`};
async function loadPlaces(force){const c=me||[map.getCenter().lat,map.getCenter().lng];if(!force&&EX.at&&hav(EX.at,c)<3000&&EX.list.length)return;EX.at=c;
 try{const u=`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${c[0]}|${c[1]}&ggsradius=10000&ggslimit=30&prop=pageimages|coordinates|description&piprop=thumbnail&pithumbsize=640`;
  const j=await (await fetch(u)).json(),pages=Object.values((j.query&&j.query.pages)||{});
  EX.list=pages.filter(p=>p.coordinates).map(p=>({id:p.pageid,name:p.title,desc:p.description||'',lat:p.coordinates[0].lat,lng:p.coordinates[0].lon,img:p.thumbnail&&p.thumbnail.source,d:hav(c,[p.coordinates[0].lat,p.coordinates[0].lon])}))
   .filter(p=>p.d>400).sort((a,b)=>(b.img?1:0)-(a.img?1:0)||a.d-b.d).slice(0,12);renderPlaces()}
 catch(_){$('places').innerHTML='<div class="pempty">Could not load nearby places. Check your internet connection.</div>'}}
function saved(){return store.get('saved')||[]}
function renderPlaces(){const l=EX.tab==='saved'?saved():EX.list;
 if(!l.length){$('places').innerHTML=`<div class="pempty">${EX.tab==='saved'?'Tap the bookmark on a place to save it here.':'No places found nearby.'}</div>`;return}
 $('places').innerHTML=l.map((p,i)=>{const d=me?hav(me,[p.lat,p.lng]):p.d,km=d*1.3/1000;return `<button class="pcard" data-i="${i}" style="background-image:linear-gradient(180deg,rgba(0,0,0,.35),transparent 35%,transparent 55%,rgba(0,0,0,.75)),url('${esc(p.img||satThumb(p.lat,p.lng))}')">
  <span class="pt"><b>${esc(p.name)}</b><small>${esc(p.desc||fmtD(d)+' away')}</small></span><span class="parr">${S('<path d="M7 17 17 7M8 7h9v9"/>')}</span>
  <span class="pmeta"><span>${S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}<b>${fmtT(estT(d))}</b></span><span>${S('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>')}<b>${km.toFixed(km<10?1:0)} km</b></span><span>${S('<path d="m12 3 1.9 5.8H20l-5 3.6 1.9 5.8L12 14.6l-5 3.6L9 12.4 4 8.8h6.1z"/>')}<b>${level(km)}</b></span></span></button>`}).join('')}
$('places').onclick=e=>{const b=e.target.closest('.pcard');if(!b)return;openPlace((EX.tab==='saved'?saved():EX.list)[+b.dataset.i])};
$('exTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;EX.tab=b.dataset.x;document.querySelectorAll('#exTabs button').forEach(x=>x.classList.toggle('on',x===b));renderPlaces()};
let pTab='details';
async function openPlace(p){EX.cur=p;$('place').hidden=false;document.body.classList.add('placeon');
 $('phero').style.backgroundImage=`url('${esc(p.img||satThumb(p.lat,p.lng))}')`;$('pCredit').textContent=p.img?'Photo: Wikipedia':'Imagery © Esri';
 $('pTitle').textContent=p.name;$('pSub').textContent=p.desc||'Nearby place';const d=me?hav(me,[p.lat,p.lng]):p.d;
 $('pTime').textContent=fmtT(estT(d));$('pDist').textContent=fmtD(d*1.3);$('pLevel').textContent=level(d*1.3/1000);syncSave();setPTab('details');
 to={lat:p.lat,lng:p.lng,name:p.name};$('to').value=p.name;from=null;await plan();
 if(route&&EX.cur===p){$('pTime').textContent=fmtT(route.dur);$('pDist').textContent=fmtD(route.dist);$('pLevel').textContent=level(route.dist/1000);if(pTab==='route')setPTab('route')}
 if(!p.extract&&p.id){try{const j=await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&exsentences=6&pageids=${p.id}`)).json();p.extract=(j.query.pages[p.id]||{}).extract||'';if(pTab==='details'&&EX.cur===p)setPTab('details')}catch(_){}}}
function closePlace(){$('place').hidden=true;document.body.classList.remove('placeon')}
function setPTab(t){pTab=t;document.querySelectorAll('#pTabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===t));const p=EX.cur;
 if(t==='details')$('pBody').innerHTML=`<h3>Ride to ${esc(p.name)}</h3><p>${esc(p.extract||p.desc||'Loading details…')}</p>${p.id?`<p class="src">Text from Wikipedia</p>`:''}`;
 else if(t==='route')$('pBody').innerHTML=route&&to&&to.name===p.name?`<ol class="plist">${route.steps.map(s=>`<li><span class="ti">${turnIcon(s.type,s.mod)}</span><span>${esc(s.text)}</span><small>${fmtD(s.cum)}</small></li>`).join('')}</ol>`:'<p>Finding the route…</p>';
 else{const notes=store.get('notes')||{};$('pBody').innerHTML=`<textarea id="pNote" placeholder="Your notes: parking, best time to go, fuel stops…">${esc(notes[p.name]||'')}</textarea><p class="src">Saved on this phone.</p>`;
  $('pNote').oninput=e=>{const n=store.get('notes')||{};n[p.name]=e.target.value;store.set('notes',n)}}}
$('pTabs').onclick=e=>{const b=e.target.closest('button');if(b)setPTab(b.dataset.p)};
$('pBack').onclick=closePlace;
function syncSave(){$('pSave').classList.toggle('on',saved().some(s=>s.name===EX.cur.name))}
$('pSave').onclick=()=>{let l=saved();const p=EX.cur;if(l.some(s=>s.name===p.name)){l=l.filter(s=>s.name!==p.name);toast('Removed from saved')}else{l.unshift({id:p.id,name:p.name,desc:p.desc,lat:p.lat,lng:p.lng,img:p.img,d:p.d});toast('Saved')}store.set('saved',l.slice(0,30));syncSave();if(EX.tab==='saved')renderPlaces()};
$('pGo').onclick=()=>{closePlace();if(!route){toast('Route is still loading');return}if(!riding){rememberTrip();startRide()}};

// ===================== Ride history =====================
const TRK={pts:[]};
function trackPoint(){if(!riding||!me)return;const l=TRK.pts[TRK.pts.length-1];if(!l||hav(l,me)>15)TRK.pts.push([+me[0].toFixed(5),+me[1].toFixed(5)])}
function saveRide(arrived){const secs=(Date.now()-stats.t0)/1000;if(stats.dist<50||secs<30){TRK.pts=[];return}
 let pts=TRK.pts;const step=Math.ceil(pts.length/300);if(step>1)pts=pts.filter((_,i)=>i%step===0);
 const r={t:stats.t0,secs,dist:stats.dist,avg:stats.moving>5?stats.dist/stats.moving:0,max:stats.max,to:route&&to?to.name:'Free ride',arrived:!!arrived,pts};
 const h=store.get('history')||[];h.unshift(r);store.set('history',h.slice(0,50));TRK.pts=[];renderHist();toast(`Ride saved: ${(r.dist/1000).toFixed(1)} km`)}
let histLayer=null;
function renderHist(){const h=store.get('history')||[];
 const tot=h.reduce((a,r)=>({d:a.d+r.dist,s:a.s+r.secs}),{d:0,s:0});
 $('histTot').innerHTML=h.length?`<div><b>${h.length}</b><small>Rides</small></div><div><b>${(tot.d/1000).toFixed(0)}</b><small>Total km</small></div><div><b>${tot.s<3600?Math.round(tot.s/60):(tot.s/3600).toFixed(1)}</b><small>${tot.s<3600?'Minutes':'Hours'}</small></div>`:'';
 $('histList').innerHTML=h.length?h.map((r,i)=>{const d=new Date(r.t);return `<li data-i="${i}"><span class="hd"><b>${d.getDate()}</b><small>${d.toLocaleDateString([],{month:'short'})}</small></span><span class="hm"><b>${esc(r.to)}</b><small>${clock(d)} · ${fmtT(r.secs)} · avg ${Math.round(r.avg*3.6)} · max ${Math.round(r.max*3.6)} km/h</small></span><em>${(r.dist/1000).toFixed(1)} km</em></li>`}).join(''):'<li class="empty">Your finished rides will appear here.</li>'}
$('histList').onclick=e=>{const li=e.target.closest('li[data-i]');if(!li)return;const r=(store.get('history')||[])[+li.dataset.i];if(!r||!r.pts||r.pts.length<2){toast('No track saved for this ride');return}
 if(histLayer)map.removeLayer(histLayer);histLayer=L.layerGroup([L.polyline(r.pts,{color:'#0b120c',weight:9,opacity:.5}),L.polyline(r.pts,{color:'#ffb020',weight:5}),
  L.circleMarker(r.pts[0],{radius:7,color:'#0b120c',fillColor:'#fff',fillOpacity:1}),L.circleMarker(r.pts[r.pts.length-1],{radius:7,color:'#0b120c',fillColor:'#ffb020',fillOpacity:1})]).addTo(map);
 follow=false;map.fitBounds(L.latLngBounds(r.pts),{padding:[60,60]});if(isPhone())minSheet(true);toast(`${esc(r.to)} · ${(r.dist/1000).toFixed(1)} km — tap the map to clear`);map.once('click',()=>{if(histLayer){map.removeLayer(histLayer);histLayer=null}})};
renderHist();

// ===================== Group ride =====================
const COLORS2=['#d6f53f','#60a5fa','#f472b6','#fbbf24','#34d399','#a78bfa','#fb7185','#22d3ee'];
const G={ws:null,room:null,id:SET.get('gid',null)||Math.random().toString(36).slice(2,10),members:{},msgs:[],markers:{},timer:null,retry:0,want:false};SET.set('gid',G.id);
function gServer(){
 const saved=SET.get('gserver','');if(saved)return saved;if(location.protocol==='https:'&&!location.host.includes('appassets'))return `wss://${location.host}/ride-ws`;return 'wss://pdfpup.openwise.tech/ride-ws'}
$('grpServer').value=gServer();$('grpServer').onchange=e=>SET.set('gserver',e.target.value.trim());
const myName=()=>SET.get('rname','')||'Rider';
const myColor=()=>COLORS2[parseInt(G.id,36)%COLORS2.length];
function gConnect(room){G.room=room;G.want=true;SET.set('groom',room);try{G.ws&&G.ws.close()}catch(_){}
 let ws;try{ws=new WebSocket(gServer())}catch(_){toast('Group server address is not valid');return}G.ws=ws;
 ws.onopen=()=>{G.retry=0;ws.send(JSON.stringify({t:'join',room,id:G.id,name:myName(),color:myColor()}));gSendPos();gUI()};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}gOn(m)};
 ws.onclose=()=>{if(G.ws!==ws)return;gUI();if(G.want){const t=Math.min(30000,2000*2**G.retry++);setTimeout(()=>{if(G.want&&G.ws===ws)gConnect(G.room)},t)}};
 ws.onerror=()=>{if(G.retry===0)toast('Could not reach the group server')};
 clearInterval(G.timer);G.timer=setInterval(gSendPos,3000);gUI()}
function gLeave(){G.want=false;try{G.ws&&G.ws.send(JSON.stringify({t:'leave'}));G.ws.close()}catch(_){}G.ws=null;G.room=null;SET.set('groom',null);clearInterval(G.timer);
 Object.values(G.markers).forEach(m=>map.removeLayer(m));G.markers={};G.members={};G.msgs=[];gUI();$('bubbles').hidden=true}
function gSend(o){if(G.ws&&G.ws.readyState===1)G.ws.send(JSON.stringify(o))}
function gSendPos(){if(me)gSend({t:'pos',lat:+me[0].toFixed(5),lng:+me[1].toFixed(5),spd:Math.round(stats.speed*3.6),dist:Math.round(stats.dist),riding,name:myName(),color:myColor(),dest:to?to.name:''})}
function gOn(m){if(m.t==='state'){G.members={};(m.members||[]).forEach(x=>G.members[x.id]=x);G.msgs=m.msgs||[]}
 else if(m.t==='pos'||m.t==='join'){G.members[m.id]={...(G.members[m.id]||{}),...m};if(m.t==='join'&&m.id!==G.id)toast(`${m.name} joined the group`)}
 else if(m.t==='leave'){if(G.members[m.id])toast(`${G.members[m.id].name} left`);delete G.members[m.id];if(G.markers[m.id]){map.removeLayer(G.markers[m.id]);delete G.markers[m.id]}}
 else if(m.t==='msg'){G.msgs.push(m);G.msgs=G.msgs.slice(-50);if(m.id!==G.id){say(`${m.name} says: ${m.text}`);if(navigator.vibrate)navigator.vibrate(80)}}
 else if(m.t==='sos'&&m.id!==G.id){say(`Emergency! ${m.name} needs help`);if(navigator.vibrate)navigator.vibrate([600,200,600,200,600]);
  const ll=[m.lat,m.lng];toast(`SOS from ${m.name} — tap their pin`);if(m.lat){follow=false;map.flyTo(ll,16)}G.msgs.push({id:m.id,name:m.name,text:'SOS — needs help here',ts:Date.now(),sos:1})}
 gUI()}
function initials(n){return n.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'}
function gUI(){const on=!!G.room;$('grpOut').hidden=on;$('grpIn').hidden=!on;const live=on&&G.ws&&G.ws.readyState===1;$('grpLive').hidden=!live;
 if(!on)return;$('grpCodeV').textContent=G.room+(live?'':' · connecting…');
 G.members[G.id]={...(G.members[G.id]||{}),id:G.id,name:myName(),color:myColor(),dist:Math.round(stats.dist),spd:Math.round(stats.speed*3.6),riding,lat:me&&me[0],lng:me&&me[1]};
 const list=Object.values(G.members).sort((a,b)=>(b.dist||0)-(a.dist||0)),pos=list.findIndex(x=>x.id===G.id)+1,ord=n=>n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');
 $('grpRank').innerHTML=list.length>1?`<span class="av" style="--c:${myColor()}">${esc(initials(myName()))}</span><span><b>You are in ${ord(pos)} place</b><small>${list.length} riders in the group${pos===1?' · keep it up':''}</small></span>`:'<span><b>Share the code with friends</b><small>They join with the same code</small></span>';
 $('grpMembers').innerHTML=list.map((x,i)=>`<li class="${x.id===G.id?'me':''}"><em>${String(i+1).padStart(2,'0')}</em><span class="av" style="--c:${esc(x.color||'#d6f53f')}">${esc(initials(x.name||'?'))}</span><span class="gn"><b>${esc(x.name||'Rider')}${x.id===G.id?' (you)':''}</b><small>${x.riding?`${x.spd||0} km/h`:'not riding'}${x.lat&&me&&x.id!==G.id?' · '+fmtD(hav(me,[x.lat,x.lng]))+' away':''}</small></span><i>${((x.dist||0)/1000).toFixed(1)}km</i></li>`).join('');
 $('grpChat').innerHTML=G.msgs.slice(-20).map(m=>`<div class="gm ${m.id===G.id?'mine':''} ${m.sos?'sos':''}"><b>${esc(m.name)}</b>${esc(m.text)}</div>`).join('')||'<p class="hint">No messages yet.</p>';$('grpChat').scrollTop=1e6;
 // map markers
 for(const x of list){if(x.id===G.id||x.lat==null)continue;const html=`<div class="gpin" style="--c:${esc(x.color||'#d6f53f')}">${esc(initials(x.name||'?'))}</div>`;
  if(!G.markers[x.id])G.markers[x.id]=L.marker([x.lat,x.lng],{icon:L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19]}),title:x.name}).addTo(map);else G.markers[x.id].setLatLng([x.lat,x.lng])}
 // bubbles
 const recent=G.msgs.filter(m=>Date.now()-(m.ts||0)<60000).slice(-2);$('bubbles').hidden=!recent.length;$('bubbles').innerHTML=recent.map(m=>`<div class="bub ${m.sos?'sos':''}"><span class="av" style="--c:${esc((G.members[m.id]||{}).color||'#d6f53f')}">${esc(initials(m.name))}</span><span><b>${esc(m.name)}</b>${esc(m.text)}</span></div>`).join('')}
setInterval(()=>{if(G.room)gUI()},5000);
$('grpCreate').onclick=()=>{const c=Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');gConnect(c);toast(`Group ${c} created — share the code`)};
$('grpJoin').onclick=()=>{const c=$('grpCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{4,8}$/.test(c)){toast('Enter the 4–8 letter group code');return}gConnect(c)};
$('grpLeave').onclick=gLeave;
$('grpShare').onclick=async()=>{const t=`Join my RideLine group ride! Code: ${G.room}`;try{if(navigator.share){await navigator.share({text:t});return}}catch(_){}
 try{await navigator.clipboard.writeText(t);toast('Copied — paste it in WhatsApp')}catch(_){location.href=`https://wa.me/?text=${encodeURIComponent(t)}`}};
$('grpForm').onsubmit=e=>{e.preventDefault();const t=$('grpMsg').value.trim();if(!t)return;if(!G.ws||G.ws.readyState!==1){toast('Not connected to the group');return}gSend({t:'msg',text:t,name:myName()});$('grpMsg').value=''};
// SOS also alerts the group
const _openSOS=openSOS;openSOS=function(crash){_openSOS(crash);if(G.room&&me)gSend({t:'sos',lat:me[0],lng:me[1],name:myName(),crash:!!crash})};
if(SET.get('groom',null))gConnect(SET.get('groom'));

// ===================== hooks =====================
window.FEAT={onPos(){trackPoint();if(!EX.loaded){EX.loaded=1;loadPlaces()}},onStop(arrived){saveRide(arrived)}};
setTimeout(()=>{if(!EX.loaded){EX.loaded=1;loadPlaces()}},2500);
