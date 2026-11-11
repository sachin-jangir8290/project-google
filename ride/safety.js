// RideLine safety: Traffic Eye (front & rear guard), speed limits, hazards, nearby help, crash detection & SOS, rain radar, break reminder.
const SET={get(k,d){const v=store.get('s_'+k);return v==null?d:v},set(k,v){store.set('s_'+k,v)}};
const OVERPASS='https://overpass-api.de/api/interpreter';
async function overpass(q){const r=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});if(!r.ok)throw new Error('overpass '+r.status);return r.json()}

// ================= Traffic Eye =================
const EYE={on:false,mode:'front',facing:'environment',stream:null,model:null,busy:false,timer:null,zh:{left:[],center:[],right:[]},lastWarn:{},hist:[]};
const VCLS={car:{n:'Car',p:'Cars',h:1.5},motorcycle:{n:'Bike',p:'Bikes',h:1.2},truck:{n:'Truck',p:'Trucks',h:3.2},bus:{n:'Bus',p:'Buses',h:3.2},bicycle:{n:'Cycle',p:'Cycles',h:1.1},person:{n:'Person',p:'People',h:1.7}};
const VORDER=['car','motorcycle','truck','bus','bicycle','person'];
const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('load '+src));document.head.append(s)});
async function eyeModel(){if(EYE.model)return EYE.model;
 if(!window.tf)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.20.0/tf.min.js');
 if(!window.cocoSsd)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
 EYE.model=await cocoSsd.load({base:'lite_mobilenet_v2'});return EYE.model}
function eyeUI(){const rear=EYE.mode==='rear';document.body.classList.toggle('eye-rear',rear&&EYE.on);
 document.querySelectorAll('#eyeMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===EYE.mode));
 $('eyeTitle').textContent=rear?'Behind you':'Ahead of you';$('aheadLbl').textContent=rear?'Closest behind':'Nearest ahead';$('radarMid').textContent=rear?'Behind':'Ahead';
 $('radar').hidden=!EYE.on}
async function eyeStream(){if(EYE.stream){EYE.stream.getTracks().forEach(t=>t.stop());EYE.stream=null}
 try{EYE.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:EYE.facing},width:{ideal:1280},height:{ideal:720}},audio:false});$('cam').srcObject=EYE.stream;await $('cam').play();return true}
 catch(e){$('eyeNote').textContent='Camera not available. Allow camera access in settings.';toast('Camera permission is needed for Traffic Eye');return false}}
async function eyeOpen(mode){if(mode)EYE.mode=mode;EYE.facing=EYE.mode==='rear'?SET.get('rearCam','user'):'environment';
 EYE.on=true;document.body.classList.add('eyeon');$('eye').hidden=false;$('eyeBtn').classList.add('on');eyeUI();renderAround([]);
 if(!await eyeStream())return;$('eyeNote').textContent='Loading vehicle detector… (first time needs internet)';
 try{await eyeModel();$('eyeNote').textContent=EYE.mode==='rear'?'Rear guard watches left, behind and right.':'Mount the phone facing the road. Distances are estimates.';clearTimeout(EYE.timer);eyeLoop()}
 catch(e){$('eyeNote').textContent='Could not load the detector. Check your internet connection and try again.'}
 try{if(!wake)wake=await navigator.wakeLock.request('screen')}catch(_){}
 if(EYE.mode==='rear')toast(EYE.facing==='user'?'Rear guard: selfie camera looks behind you. Keep the phone facing you on the handlebar.':'Rear guard: point this phone backwards (second phone on the back of the bike).')}
function eyeClose(){EYE.on=false;clearTimeout(EYE.timer);document.body.classList.remove('eyeon','eye-rear');$('eye').hidden=true;$('radar').hidden=true;$('eyeBtn').classList.remove('on');$('warn').hidden=true;
 if(EYE.stream){EYE.stream.getTracks().forEach(t=>t.stop());EYE.stream=null}const c=$('boxes');c.getContext('2d').clearRect(0,0,c.width,c.height)}
$('eyeBtn').onclick=()=>EYE.on?eyeClose():eyeOpen();$('eyeClose').onclick=eyeClose;
$('eyeMode').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.m===EYE.mode)return;EYE.zh={left:[],center:[],right:[]};eyeOpen(b.dataset.m)};
$('eyeFlip').onclick=async()=>{EYE.facing=EYE.facing==='user'?'environment':'user';if(EYE.mode==='rear')SET.set('rearCam',EYE.facing);await eyeStream();toast(EYE.facing==='user'?'Using selfie camera':'Using back camera')};
async function eyeLoop(){if(!EYE.on)return;const v=$('cam');
 if(v.readyState>=2&&!EYE.busy&&EYE.model){EYE.busy=true;try{const preds=await EYE.model.detect(v,25,0.45);eyeFrame(preds.filter(p=>VCLS[p.class]))}catch(_){}EYE.busy=false}
 EYE.timer=setTimeout(eyeLoop,document.hidden?1000:180)}
function eyeFrame(preds){const rear=EYE.mode==='rear',v=$('cam'),c=$('boxes'),W=c.clientWidth,H=c.clientHeight,dpr=Math.min(2,devicePixelRatio||1);
 const vw=v.videoWidth||1,vh=v.videoHeight||1,f=vh/(2*Math.tan(rad(48)/2)),now=performance.now();
 // When the camera looks backwards, the image is a mirror of the rider's view: image-left is the rider's right.
 const items=preds.map(p=>{const [bx,by,bw,bh]=p.bbox,cx=(bx+bw/2)/vw,img=cx<.36?'L':cx>.64?'R':'C',zone=img==='C'?'center':rear?(img==='L'?'right':'left'):(img==='L'?'left':'right');
  return {...p,d:VCLS[p.class].h*f/Math.max(8,bh),zone}}).filter(i=>i.d<60);
 const veh=items.filter(i=>i.class!=='person');
 const threat={};
 for(const z of ['left','center','right']){const near=veh.filter(i=>i.zone===z).sort((a,b)=>a.d-b.d)[0],h=EYE.zh[z];h.push({t:now,d:near?near.d:null});while(h.length&&now-h[0].t>1500)h.shift();
  const old=h.find(x=>x.d!=null),approach=near&&old&&now-old.t>500?(old.d-near.d)/((now-old.t)/1000):0;
  const lim=rear?(z==='center'?7:5):(z==='center'?6:3);threat[z]={near,approach,level:!near?0:(near.d<lim||(approach>3&&near.d<15))?2:(near.d<lim*2.5||approach>1.5)?1:0}}
 // boxes (front view only; rear view shows a small preview)
 if(!rear){if(c.width!==W*dpr||c.height!==H*dpr){c.width=W*dpr;c.height=H*dpr}const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
  for(const i of items){const t=threat[i.zone],hot=t&&t.near===i&&t.level===2,col=hot?'#ff4d4f':i.zone==='center'?'#d6f53f':'rgba(255,255,255,.85)',[bx,by,bw,bh]=i.bbox,r=[ox+bx*sc,oy+by*sc,bw*sc,bh*sc];
   x.lineWidth=i.zone==='center'?3.5:2;x.strokeStyle=col;x.beginPath();x.roundRect?x.roundRect(...r,8):x.rect(...r);x.stroke();
   const label=`${VCLS[i.class].n} ~${Math.round(i.d)} m`;x.font='700 13px Urbanist,sans-serif';const tw=x.measureText(label).width+14,ly=Math.max(0,r[1]-24);
   x.fillStyle=col;x.beginPath();x.roundRect?x.roundRect(r[0],ly,tw,22,11):x.rect(r[0],ly,tw,22);x.fill();x.fillStyle='#0b120c';x.fillText(label,r[0]+7,ly+15)}}
 renderAround(items,threat);radar(threat);
 // alerts
 const worst=['center','left','right'].map(z=>({z,...threat[z]})).filter(t=>t.level===2).sort((a,b)=>a.near.d-b.near.d)[0];
 $('warn').hidden=!worst;if(worst){$('warn').innerHTML=ic('warn')+(rear?(worst.z==='center'?'Vehicle close behind':'Vehicle on your '+worst.z):'Vehicle close ahead');
  if(now-(EYE.lastWarn[worst.z]||0)>4000){EYE.lastWarn[worst.z]=now;const n=VCLS[worst.near.class].n;
   say(rear?(worst.z==='center'?`${n} close behind you`:`${n} approaching on your ${worst.z}`):(worst.z==='center'?`${n} close ahead`:`${n} very close on your ${worst.z}`));if(navigator.vibrate)navigator.vibrate([200,100,200])}}}
function renderAround(items,threat){const cnt={};VORDER.forEach(k=>cnt[k]=0);items.forEach(i=>cnt[i.class]++);
 $('vgrid').innerHTML=VORDER.map(k=>`<div class="${cnt[k]?'has':''}"><b>${cnt[k]}</b><small>${VCLS[k].p}</small></div>`).join('');
 const t=threat&&['center','left','right'].map(z=>({z,...threat[z]})).filter(x=>x.near).sort((a,b)=>a.near.d-b.near.d)[0];
 $('ahead').classList.toggle('close',!!(t&&t.level===2));
 $('aheadTxt').textContent=t?`${VCLS[t.near.class].n} · ${t.z==='center'?(EYE.mode==='rear'?'behind':'ahead'):t.z} · ~${Math.round(t.near.d)} m${t.approach>1.5?' · closing':''}`:'Clear'}
function radar(threat){let txt='Clear';
 document.querySelectorAll('#radar .lane').forEach(l=>{const t=threat[l.dataset.z];l.className='lane'+(t.level===2?' danger':t.level===1?' warn2':'');
  l.innerHTML=t.near?`<i class="${t.level===2?'hot':t.level===1?'mid':''}" style="bottom:${Math.max(4,Math.min(92,t.near.d/40*100))}%"></i>`:''});
 const w=['center','left','right'].map(z=>({z,...threat[z]})).filter(t=>t.near).sort((a,b)=>b.level-a.level||a.near.d-b.near.d)[0];
 if(w)txt=`${w.z==='center'?(EYE.mode==='rear'?'Behind':'Ahead'):w.z[0].toUpperCase()+w.z.slice(1)} ~${Math.round(w.near.d)} m`;$('radarTxt').textContent=txt}

// ================= options =================
const OPT={crash:SET.get('crash',true),haz:SET.get('haz',true),rain:SET.get('rain',false),rest:SET.get('rest',true),max:SET.get('max',60)};
[['optCrash','crash'],['optHaz','haz'],['optRain','rain'],['optRest','rest']].forEach(([id,k])=>{$(id).checked=OPT[k];$(id).onchange=e=>{OPT[k]=e.target.checked;SET.set(k,OPT[k]);if(k==='rain')rainLayer();if(k==='haz')drawHaz()}});
$('optMax').value=String(OPT.max);$('optMax').onchange=e=>{OPT.max=+e.target.value;SET.set('max',OPT.max);speedUI()};
$('sosName').value=SET.get('cname','');$('sosPhone').value=SET.get('cphone','');
$('sosName').oninput=e=>SET.set('cname',e.target.value.trim());$('sosPhone').oninput=e=>SET.set('cphone',e.target.value.replace(/[^\d+]/g,''));

// ================= speed limit =================
const SPD={limit:null,src:'alert',lastQ:0,lastQll:null,over:0,lastWarn:0};
async function fetchLimit(){if(!me)return;SPD.lastQ=Date.now();SPD.lastQll=me;
 try{const j=await overpass(`[out:json][timeout:8];way(around:25,${me[0]},${me[1]})[highway][maxspeed];out tags 3;`);
  const v=(j.elements||[]).map(e=>{const m=String(e.tags.maxspeed).match(/\d+/);if(!m)return null;let n=+m[0];if(/mph/.test(e.tags.maxspeed))n=Math.round(n*1.609);return n}).filter(Boolean);
  if(v.length){SPD.limit=v[0];SPD.src='limit'}else{SPD.limit=null;SPD.src='alert'}}catch(_){}speedUI()}
function speedUI(){const lim=SPD.limit||OPT.max,v=Math.round(stats.speed*3.6);$('limitV').textContent=lim;$('limitS').textContent=SPD.limit?'limit':'alert';$('curV').textContent=v;
 const over=riding&&v>lim+3;$('curSpd').classList.toggle('over',over);
 if(over){SPD.over++;if(SPD.over>=3&&Date.now()-SPD.lastWarn>20000){SPD.lastWarn=Date.now();say(`Slow down. ${SPD.limit?'Speed limit':'Your limit'} is ${lim}`)}}else SPD.over=Math.max(0,SPD.over-1)}

// ================= hazards along the route =================
const HZ={items:[],layer:L.layerGroup().addTo(map),help:[],helpLayer:L.layerGroup().addTo(map)};
const HZT={bump:{e:'bump',n:'Speed breakers',say:'Speed breaker ahead'},school:{e:'school',n:'School zones',say:'School zone ahead. Slow down'},camera:{e:'camera',n:'Speed cameras',say:'Speed camera ahead'},signal:{e:'signal',n:'Traffic signals',say:null},curve:{e:'curve',n:'Sharp curves',say:'Sharp curve ahead. Slow down'},jam:{e:'jam',n:'Traffic jams',say:'Traffic jam ahead'},closure:{e:'closure',n:'Road closures',say:'Road closed ahead'},works:{e:'works',n:'Road works',say:'Road works ahead. Slow down'},crossing:{e:'crossing',n:'Zebra crossings',say:null}};
async function loadHazards(){HZ.items=[];HZ.layer.clearLayers();if(!route)return;
 // sharp curves from the route shape (not at a planned turn)
 const co=route.co,cum=route.cum;let j=0;
 for(let i=0;i<co.length;i++){while(j<co.length-1&&cum[j]<cum[i]+35)j++;let k=i;while(k>0&&cum[i]-cum[k]<35)k--;if(j<=i||k>=i)continue;
  const b1=bearing(co[k],co[i]),b2=bearing(co[i],co[j]),turn=Math.abs(((b2-b1+540)%360)-180);
  if(turn>65&&!route.steps.some(s=>Math.abs(s.cum-cum[i])<60)&&!HZ.items.some(h=>h.t==='curve'&&Math.abs(h.cum-cum[i])<150))HZ.items.push({t:'curve',ll:co[i],cum:cum[i]})}
 (route.traffic||[]).forEach(t=>HZ.items.push({t:t.cat==='ROAD_CLOSURE'?'closure':t.cat==='ROAD_WORK'?'works':'jam',ll:co[t.s]||co[0],cum:t.cum,delay:t.delay,len:t.len}));
 renderHaz();
 const step=Math.max(1,Math.ceil(co.length/120)),pts=co.filter((_,i)=>i%step===0).concat([co[co.length-1]]).map(p=>p[0].toFixed(5)+','+p[1].toFixed(5)).join(',');
 try{const q=`[out:json][timeout:20];(node(around:30,${pts})[traffic_calming];node(around:30,${pts})[highway=speed_camera];node(around:30,${pts})[highway=traffic_signals];node(around:30,${pts})[highway=crossing][crossing=zebra];nwr(around:150,${pts})[amenity=school];);out center 300;`;
  const r=await overpass(q);for(const e of r.elements||[]){const ll=[e.lat||e.center&&e.center.lat,e.lon||e.center&&e.center.lon];if(!ll[0])continue;
   const t=e.tags.traffic_calming?'bump':e.tags.highway==='speed_camera'?'camera':e.tags.highway==='traffic_signals'?'signal':e.tags.highway==='crossing'?'crossing':'school';
   const c=alongOf(ll);if(c==null)continue;if(HZ.items.some(h=>h.t===t&&Math.abs(h.cum-c)<(t==='school'?250:40)))continue;HZ.items.push({t,ll,cum:c})}}
 catch(_){toast('Hazard data is busy right now — curves are still shown')}
 HZ.items.sort((a,b)=>a.cum-b.cum);renderHaz()}
function hazCount(){return HZ.items.filter(h=>h.t!=='crossing'&&h.t!=='signal').length}
function alongOf(ll){let best=1e12,bi=-1;for(let i=0;i<route.co.length;i++){const d=hav(route.co[i],ll);if(d<best){best=d;bi=i}}return best<250?route.cum[bi]:null}
function renderHaz(){$('sumHaz').textContent=hazCount();const cnt={};HZ.items.forEach(h=>cnt[h.t]=(cnt[h.t]||0)+1);
 const keys=Object.keys(HZT).filter(k=>cnt[k]);$('hazGrid').innerHTML=keys.length?keys.map(k=>`<div><em class="hzi hz-${k}">${ic(HZT[k].e)}</em><span><b>${cnt[k]}</b><br><small>${HZT[k].n}</small></span></div>`).join(''):'<p class="hint">No hazards found on this route.</p>';drawHaz()}
function drawHaz(){HZ.layer.clearLayers();if(!OPT.haz)return;HZ.items.filter(h=>h.t!=='crossing').forEach(h=>L.marker(h.ll,{icon:L.divIcon({className:'',html:`<div class="hz ${h.t==='camera'?'cam':''}" title="${HZT[h.t].n}">${ic(HZT[h.t].e)}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),interactive:false}).addTo(HZ.layer))}
function hazAhead(along){if(!OPT.haz)return;for(const h of HZ.items){const d=h.cum-along;const range=h.t==='school'?250:/jam|closure|works/.test(h.t)?600:150;if(d<0||d>range||h.said||!HZT[h.t].say)continue;h.said=1;say(HZT[h.t].say+(h.delay>=60?`, about ${Math.round(h.delay/60)} minutes delay`:''));toast(`${HZT[h.t].say} — ${Math.round(d/10)*10} m`);break}}

// ================= nearby help =================
let helpQ=0;
async function loadHelp(){if(!me||Date.now()-helpQ<120000)return;helpQ=Date.now();
 try{const r=await overpass(`[out:json][timeout:15];(nwr(around:6000,${me[0]},${me[1]})[amenity~"^(hospital|clinic)$"];nwr(around:6000,${me[0]},${me[1]})[amenity=fuel];nwr(around:6000,${me[0]},${me[1]})[amenity=police];);out center 80;`);
  const map2={hospital:['hospital','Hospital'],clinic:['hospital','Clinic'],fuel:['fuel','Fuel'],police:['police','Police']};
  HZ.help=(r.elements||[]).map(e=>{const ll=[e.lat||e.center.lat,e.lon||e.center.lon],a=e.tags.amenity;return {ll,a,e:map2[a][0],kind:map2[a][1],name:e.tags.name||map2[a][1],d:hav(me,ll)}}).sort((a,b)=>a.d-b.d);
  const pick=[...HZ.help.filter(h=>h.a==='hospital'||h.a==='clinic').slice(0,2),...HZ.help.filter(h=>h.a==='fuel').slice(0,2),...HZ.help.filter(h=>h.a==='police').slice(0,1)];
  $('helpList').innerHTML=pick.length?pick.map((h,i)=>`<li data-i="${HZ.help.indexOf(h)}"><i class="hi-${h.e}">${ic(h.e)}</i><span>${h.name}</span><small>${fmtD(h.d)}</small></li>`).join(''):'<li class="empty">Nothing found within 6 km.</li>';
  HZ.helpLayer.clearLayers();pick.forEach(h=>L.marker(h.ll,{icon:L.divIcon({className:'',html:`<div class="hz help hi-${h.e}">${ic(h.e)}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),title:h.name}).addTo(HZ.helpLayer));
  const hosp=HZ.help.find(h=>h.a==='hospital'||h.a==='clinic');$('sosHospD').textContent=hosp?`${hosp.name} · ${fmtD(hosp.d)}`:'none nearby'}
 catch(_){$('helpList').innerHTML='<li class="empty">Could not load nearby places. Try again later.</li>';helpQ=0}}
$('helpList').onclick=e=>{const li=e.target.closest('li[data-i]');if(!li)return;goTo(HZ.help[+li.dataset.i])};
function goTo(h){to={lat:h.ll[0],lng:h.ll[1],name:h.name};store.set('to',to);$('to').value=h.name;from=null;plan();if(isPhone())openSheet('home')}

// ================= rain radar =================
let rainL=null;
async function rainLayer(){if(rainL){map.removeLayer(rainL);rainL=null}if(!OPT.rain)return;
 try{const j=await (await fetch('https://api.rainviewer.com/public/weather-maps.json')).json(),f=j.radar.past[j.radar.past.length-1];
  rainL=L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/4/1_1.png`,{opacity:.6,maxNativeZoom:7,maxZoom:20,attribution:'Rain © RainViewer'}).addTo(map);toast('Rain radar on — '+clock(new Date(f.time*1000)))}
 catch(_){toast('Rain radar is not available right now')}}
rainLayer();

// ================= crash detection & SOS =================
const SOS={timer:null,n:0,impact:0};
function sosLinks(){const ll=me||(route&&route.co[0]),url=ll?`https://maps.google.com/?q=${ll[0].toFixed(6)},${ll[1].toFixed(6)}`:'',name=SET.get('cname',''),ph=SET.get('cphone','');
 const msg=`SOS! I need help. My location: ${url}`;$('sosLoc').textContent=ll?'Location: '+url:'Location: not available yet';
 $('sosCallC').href=ph?`tel:${ph}`:'#';$('sosCallC').classList.toggle('off',!ph);$('sosCName').textContent=ph?(name||ph):'Add in Safety';
 $('sosSms').href=ph?`sms:${ph}?body=${encodeURIComponent(msg)}`:'#';$('sosSms').classList.toggle('off',!ph);
 $('sosWa').href=`https://wa.me/${ph.replace(/^\+/,'')}?text=${encodeURIComponent(msg)}`;return {msg,ph}}
function openSOS(crash){sosLinks();$('sos').hidden=false;$('sosTitle').textContent=crash?'Crash detected?':'Emergency';
 $('sosMsg').textContent=crash?'If you are OK, tap the button. Otherwise help options open automatically.':'Get help fast. Your live location is included.';
 clearInterval(SOS.timer);$('sosCount').hidden=!crash;$('sosOk').textContent=crash?"I'm OK — cancel":'Close';
 if(crash){SOS.n=30;$('sosN').textContent=SOS.n;say('Crash detected. Are you OK? Tap I am OK to cancel.');if(navigator.vibrate)navigator.vibrate([500,200,500,200,500]);
  SOS.timer=setInterval(()=>{SOS.n--;$('sosN').textContent=SOS.n;if(SOS.n%10===0&&SOS.n>0)say(`Sending alert in ${SOS.n} seconds`);
   if(SOS.n<=0){clearInterval(SOS.timer);$('sosCount').hidden=true;$('sosMsg').textContent='Alert ready. Tap Call 112 or send your location now.';const {ph}=sosLinks();say('Opening emergency message');if(ph)location.href=$('sosSms').href}},1000)}}
function closeSOS(){clearInterval(SOS.timer);$('sos').hidden=true}
$('sosBtn').onclick=()=>openSOS(false);$('sosOk').onclick=closeSOS;
$('sosCallC').onclick=e=>{if(!SET.get('cphone','')){e.preventDefault();closeSOS();openSheetSafe()}};$('sosSms').onclick=$('sosCallC').onclick;
$('sosHosp').onclick=()=>{const h=HZ.help.find(h=>h.a==='hospital'||h.a==='clinic');if(!h){toast('No hospital found nearby yet');return}closeSOS();goTo(h)};
function openSheetSafe(){if(isPhone())openSheet('safety');else{const c=document.querySelector('.sosc');c.scrollIntoView({behavior:'smooth'});$('sosPhone').focus()}toast('Add an emergency contact')}
window.addEventListener('devicemotion',e=>{if(!riding||!OPT.crash||!$('sos').hidden)return;const a=e.accelerationIncludingGravity;if(!a)return;const g=Math.hypot(a.x||0,a.y||0,a.z||0);
 if(g>34&&Date.now()-SOS.impact>8000){SOS.impact=Date.now();const v0=stats.speed;setTimeout(()=>{if(v0*3.6>8&&stats.speed*3.6<6)openSOS(true)},5000)}});
async function motionPermission(){try{if(typeof DeviceMotionEvent!=='undefined'&&DeviceMotionEvent.requestPermission)await DeviceMotionEvent.requestPermission()}catch(_){}}

// ================= break reminder =================
let restAt=0;setInterval(()=>{if(!riding||!OPT.rest)return;const h=(Date.now()-stats.t0)/3600000;if(h>=2*(restAt+1)){restAt++;say(`You have been riding for ${2*restAt} hours. Take a short break and drink water.`);toast('Time for a short break')}},60000);

// ================= hooks from the navigator =================
window.SAFE={
 onRoute(){HZ.items=[];loadHazards()},
 onPos(){speedUI();if(riding&&me&&(Date.now()-SPD.lastQ>20000||(SPD.lastQll&&hav(SPD.lastQll,me)>300)))fetchLimit();if(!SPD.lastQll&&me)fetchLimit();loadHelp()},
 onProgress(along){hazAhead(along)},
 onStart(){restAt=0;SPD.over=0;HZ.items.forEach(h=>h.said=0);motionPermission()}};
speedUI();


// ================= greeting, quick destinations, ride card & compass =================
function greet(){const n=SET.get('rname','')||'Rider';$('hello').textContent=`Hello, ${n}`;$('avatarBtn').textContent=n.trim()[0].toUpperCase()}
$('riderName').value=SET.get('rname','');$('riderName').oninput=e=>{SET.set('rname',e.target.value.trim());greet()};greet();
$('avatarBtn').onclick=()=>{if(isPhone())openSheet('safety');setTimeout(()=>$('riderName').focus(),200)};
function rememberTrip(){if(!to)return;const l=(store.get('trips')||[]).filter(t=>t.name!==to.name);l.unshift(to);store.set('trips',l.slice(0,5));lastChip()}
function lastChip(){const l=store.get('trips')||[],t=l.find(t=>!to||t.name!==to.name);$('qLast').hidden=!t;if(t)$('qLast').innerHTML=ic('history')+esc2(t.name.slice(0,18))}
lastChip();
document.querySelectorAll('#qchips [data-i]').forEach(b=>b.insertAdjacentHTML('afterbegin',ic(b.dataset.i)));
$('qchips').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const q=b.dataset.q;
 if(q==='last'){const l=store.get('trips')||[],t=l.find(t=>!to||t.name!==to.name);if(t){to=t;store.set('to',to);$('to').value=t.name;from=null;plan()}return}
 if(!me){startWatch();toast('Finding your location first…');return}
 if(!HZ.help.length){helpQ=0;toast('Searching nearby…');await loadHelp()}
 const h=HZ.help.find(h=>q==='hospital'?(h.a==='hospital'||h.a==='clinic'):h.a===q);if(h){toast(`${h.name} · ${fmtD(h.d)}`);goTo(h)}else toast('Nothing found nearby')};
function rideToggle(){riding?stopRide():(rememberTrip(),startRide())}
$('startPill').onclick=rideToggle;$('rideGo').onclick=rideToggle;$('emergBtn').onclick=()=>openSOS(false);
// compass dial
(function dial(){let t='<g id="ring">';for(let a=0;a<360;a+=5){const big=a%30===0,r1=big?84:90,r2=98,x=Math.sin(rad(a)),y=-Math.cos(rad(a));
  t+=`<line x1="${110+x*r1}" y1="${110+y*r1}" x2="${110+x*r2}" y2="${110+y*r2}" stroke="${a===0?'#d6f53f':'rgba(255,255,255,'+(big?.7:.25)+')'}" stroke-width="${big?2:1}"/>`;
  if(big&&a%90)t+=`<text x="${110+x*70}" y="${110+y*70+4}" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.55)" font-family="Urbanist,sans-serif" transform="rotate(${a} ${110+x*70} ${110+y*70})">${a}</text>`}
 t+='</g><circle cx="110" cy="110" r="56" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)"/><path d="M110 18 104 30h12z" fill="#d6f53f"/>';$('dial').innerHTML=t})();
let devHdg=null;
window.addEventListener('deviceorientationabsolute',e=>{if(e.alpha!=null)devHdg=(360-e.alpha)%360},true);
window.addEventListener('deviceorientation',e=>{if(e.webkitCompassHeading!=null)devHdg=e.webkitCompassHeading},true);
function rideCard(){const moving=stats.speed*3.6>6,h=Math.round(((moving||devHdg==null)?heading:devHdg)+360)%360;
 $('ring').setAttribute('transform',`rotate(${-h} 110 110)`);$('hdg').textContent=h+'°';$('hdgDir').textContent=compass(h);
 const el=riding?(Date.now()-stats.t0)/1000:0;$('rdTime').textContent=riding?fmtT(el):'0 min';
 $('rdDist').textContent=(stats.dist/1000).toFixed(1)+' km';
 if(route){const remain=Math.max(0,route.dist-(route.along||0)),v=route.dist/route.dur;$('rdDistLeft').textContent=`${fmtD(remain)} left`;$('rdTimeLeft').textContent=riding?`${fmtT(remain/v)} left`:`about ${fmtT(route.dur)}`}
 else{$('rdDistLeft').textContent=riding?'Free ride':'No route';$('rdTimeLeft').textContent=riding?'Riding':'Not started'}
 $('rdSpd').textContent=Math.round(stats.speed*3.6);$('rdLim').textContent=SPD.limit||OPT.max;$('rdLimL').textContent=SPD.limit?'Speed limit':'Speed alert';
 const lbl=riding?'Stop ride':'Start ride';[$('rideGo'),$('startPill')].forEach((b,i)=>{b.classList.toggle('stop',riding);b.firstChild.textContent=riding?'Stop ride ':(i?'Start your ride ':'Start ride ')})}
setInterval(rideCard,1000);rideCard();
