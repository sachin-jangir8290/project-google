// RideLine camera navigation + background tracking.
// 1) In the camera view: the route drawn as a line over the live video, a turn card and a mini map with your location.
// 2) While riding, the Android app keeps recording GPS in the background; when you come back, the missed track is replayed.

// ===================== route line over the camera =====================
const CN={hdg:null,map:null,line:null,dot:null,raf:0};
function compassOn(){const h=e=>{let v=null;if(e.webkitCompassHeading!=null)v=e.webkitCompassHeading;else if(e.absolute&&e.alpha!=null)v=360-e.alpha;if(v!=null){const so=(screen.orientation&&screen.orientation.angle)||0;CN.hdg=(v+so+360)%360}};
 addEventListener('deviceorientationabsolute',h,true);addEventListener('deviceorientation',h,true)}
compassOn();
// moving: trust the GPS course; standing still: use the compass
const camHeading=()=>(stats.speed>2.5||CN.hdg==null)?heading:CN.hdg;
function bearing(a,b){const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0])),x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));return (deg(Math.atan2(y,x))+360)%360}
function camUI(){if($('camNav'))return;
 $('eye').insertAdjacentHTML('beforeend',`<canvas id="arLine"></canvas><div class="camturn" id="camTurn" hidden><i id="ctIc"></i><div><b id="ctD">—</b><small id="ctT">—</small></div></div><div class="camnav" id="camNav"><div id="camMap"></div><span class="cmdist" id="cmDist"></span></div>`);
 CN.map=L.map('camMap',{zoomControl:false,attributionControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false,keyboard:false});
 L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'+cartoQ(),{subdomains:'abcd',maxZoom:19}).addTo(CN.map);
 CN.map.setView(me||map.getCenter(),16)}
function camRoute(){if(!CN.map)return;if(CN.line){CN.map.removeLayer(CN.line);CN.line=null}
 if(route&&route.co)CN.line=L.polyline(route.co,{color:'#d6f53f',weight:6,opacity:.95}).addTo(CN.map)}
function camTick(){CN.raf=requestAnimationFrame(camTick);if(!EYE.on)return;
 const cv=$('arLine'),W=cv.clientWidth,H=cv.clientHeight,dpr=devicePixelRatio||1;if(cv.width!==W*dpr){cv.width=W*dpr;cv.height=H*dpr}
 const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 if(CN.map&&me){if(!CN.dot)CN.dot=L.marker(me,{icon:L.divIcon({className:'',html:'<span class="cmme"></span>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(CN.map);CN.dot.setLatLng(me);CN.map.setView(me,CN.map.getZoom(),{animate:false})}
 const turn=$('camTurn');
 if(!route||!me||EYE.mode==='rear'){turn.hidden=true;$('cmDist').textContent=route?'':'No route';return}
 const a=route.along||0,s=route.steps.find((x,i)=>i>0&&x.cum>a+3)||route.steps[route.steps.length-1],d=Math.max(0,s.cum-a);
 turn.hidden=false;$('ctIc').innerHTML=turnIcon(s.type,s.mod);$('ctD').textContent=fmtD(d);$('ctT').textContent=s.text;$('cmDist').textContent=fmtD(Math.max(0,route.dist-a))+' left';
 // project the next ~250 m of the route onto the camera image (simple ground-plane perspective)
 const hd=camHeading(),hz=H*.45,cx=W/2,fov=60,f=(W/2)/Math.tan(rad(fov/2)),camH=1.3,pts=[];
 pts.push([cx,H]);const i0=Math.max(0,route.pi||0);
 for(let i=i0+1;i<route.co.length&&i<i0+400;i++){const p=route.co[i],dist=hav(me,p);if(dist>260)break;if(dist<4)continue;
  const rel=rad(((bearing(me,p)-hd+540)%360)-180);const fw=dist*Math.cos(rel),side=dist*Math.sin(rel);if(fw<2){continue}
  pts.push([cx+side/fw*f,hz+camH/fw*f*4])}
 if(pts.length<2){const rel=((bearing(me,route.co[Math.min(route.co.length-1,i0+1)])-hd+540)%360)-180;g.fillStyle='rgba(214,245,63,.9)';g.font='700 15px Urbanist,sans-serif';g.textAlign='center';g.fillText(Math.abs(rel)>100?'Route is behind you':rel>0?'Route is to your right →':'← Route is to your left',cx,H*.6);return}
 const draw=(w,c)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],Math.max(hz,p[1])):g.moveTo(p[0],p[1]));g.lineWidth=w;g.strokeStyle=c;g.lineJoin=g.lineCap='round';g.stroke()};
 draw(34,'rgba(11,18,12,.35)');draw(22,'rgba(214,245,63,.75)');draw(6,'rgba(255,255,255,.9)')}
const _eyeOpen=eyeOpen;eyeOpen=async function(m){const r=await _eyeOpen(m);camUI();setTimeout(()=>{CN.map.invalidateSize();camRoute()},100);
 try{DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission&&DeviceOrientationEvent.requestPermission().catch(()=>{})}catch(_){}
 cancelAnimationFrame(CN.raf);camTick();return r};
const _eyeClose=eyeClose;eyeClose=function(){cancelAnimationFrame(CN.raf);return _eyeClose()};
SAFE.onRoute=(o=>function(){const r=o.apply(this,arguments);camRoute();return r})(SAFE.onRoute||function(){});

// ===================== background tracking (Android) =====================
const BG={native:!!(window.NovaNative&&NovaNative.bgStart),lastT:0};
function bgReplay(){if(!BG.native)return;let a=[];try{a=JSON.parse(NovaNative.bgDrain()||'[]')}catch(_){}
 a=a.filter(x=>x.t>BG.lastT);if(!a.length)return;
 for(const x of a){BG.lastT=x.t;onPos({timestamp:x.t,coords:{latitude:x.lat,longitude:x.lng,accuracy:x.acc,speed:x.spd,heading:x.hdg,altitude:x.alt}})}
if(a.length>5)toast(`Caught up ${a.length} location updates from the background`)}
const _onPosBG=onPos;onPos=function(p){const t=p.timestamp||Date.now();if(t>BG.lastT)BG.lastT=t;return _onPosBG(p)};
const _startBG=startRide;startRide=async function(){const r=await _startBG.apply(this,arguments);if(BG.native){BG.lastT=Date.now();try{NovaNative.bgDrain();NovaNative.bgStart()}catch(_){}}return r};
const _stopBG=stopRide;stopRide=function(){if(BG.native){bgReplay();try{NovaNative.bgStop()}catch(_){}}return _stopBG.apply(this,arguments)};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&riding){bgReplay();startWatch&&startWatch()}});
// while the app is open the WebView GPS is used; just discard the service's copy
setInterval(()=>{if(BG.native&&riding&&!document.hidden){try{NovaNative.bgDrain()}catch(_){}}},5000);
