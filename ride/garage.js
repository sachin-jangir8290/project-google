// RideLine garage: fuel & mileage, service reminders, parking, hazard reports, live trip sharing,
// rain along the route, achievements.
Object.assign(RI,{
 pothole:'<ellipse cx="12" cy="15" rx="9" ry="4"/><path d="M7 14.5c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5M12 3v6M9.5 6.5 12 9l2.5-2.5"/>',
 accident:'<path d="M3 17h2l1.5-5h7L16 17h2"/><circle cx="7" cy="17" r="2"/><circle cx="15" cy="17" r="2"/><path d="m17 4 1 3 3 .5-2.5 2 .5 3-2-1.5"/>',
 checkpost:'<path d="M3 21V9l9-6 9 6v12"/><path d="M3 13h18M9 21v-5h6v5"/>',
 water:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M3 21c2 0 2-1.5 4.5-1.5S10 21 12 21s2-1.5 4.5-1.5S19 21 21 21"/>',
 block:'<rect x="3" y="8" width="18" height="6" rx="1.5"/><path d="M7 8 4 14M12 8l-3 6M17 8l-3 6M21 8l-3 6M6 14v6M18 14v6"/>',
 animal:'<path d="M5 10c0-3 2-5 4-5l1 3h4l1-3c2 0 4 2 4 5v3c0 4-3 7-7 7s-7-3-7-7z"/><circle cx="9.5" cy="12" r=".8"/><circle cx="14.5" cy="12" r=".8"/><path d="M11 16h2"/>',
 parking:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
 wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
 chain:'<rect x="2" y="8" width="9" height="8" rx="4"/><rect x="13" y="8" width="9" height="8" rx="4"/><path d="M9 12h6"/>',
 tyre:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
 oil:'<path d="M3 9h9l2 3h4l3-3v3l-3 6H5a2 2 0 0 1-2-2z"/><path d="M19 4c0 1.5-1.5 2.5-1.5 4"/>',
 trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
 moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
 sunrise:'<path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/>',
 road:'<path d="M5 21 9 3M19 21 15 3M12 6v2M12 11v2M12 16v3"/>',
 rain:'<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 19v2M8 13v2M12 21v2M12 15v2M16 19v2M16 13v2"/>',
});
['fuelH:fuel','servH:wrench','achH:trophy','parkH:parking','rainH:rain'].forEach(x=>{const [id,n]=x.split(':');const e=$(id);if(e)e.insertAdjacentHTML('afterbegin',ic(n))});
$('reportI').innerHTML=ic('warn');$('shareI').innerHTML=ic('share');

// ===================== odometer (bike km) =====================
const G2={odo:SET.get('odo',null),lastDist:0};
function odoAdd(m){if(G2.odo==null)return;G2.odo+=m/1000;SET.set('odo',+G2.odo.toFixed(2))}
$('odo').value=G2.odo!=null?Math.round(G2.odo):'';
$('odo').onchange=e=>{const v=+e.target.value;if(v>=0){G2.odo=v;SET.set('odo',v);serviceUI();fuelUI();toast('Odometer saved')}};
setInterval(()=>{if(!riding){G2.lastDist=0;return}const d=stats.dist-G2.lastDist;if(d>0){odoAdd(d);G2.lastDist=stats.dist}},5000);
const kmNow=()=>G2.odo!=null?G2.odo:((store.get('history')||[]).reduce((a,r)=>a+r.dist,0)/1000+(riding?stats.dist/1000:0));

// ===================== fuel & mileage =====================
const tank=()=>+SET.get('tank',12);$('tankSize').value=String(tank());$('tankSize').onchange=e=>{SET.set('tank',+e.target.value);fuelUI()};
function fills(){return store.get('fills')||[]}
$('fuelForm').onsubmit=e=>{e.preventDefault();const l=+$('fLit').value,a=+$('fAmt').value||0;if(!(l>0))return;
 const f=fills();f.unshift({t:Date.now(),km:+kmNow().toFixed(1),l,a,full:$('fFull').checked});store.set('fills',f.slice(0,200));$('fLit').value='';$('fAmt').value='';fuelUI();toast('Fill-up saved')};
function mileage(){const f=fills().slice().reverse();let km=0,l=0;for(let i=1;i<f.length;i++){const d=f[i].km-f[i-1].km;if(d>0&&d<2000){km+=d;l+=f[i].l}}return l>0?km/l:null}
function fuelUI(){const f=fills(),kmpl=mileage()||(SET.get('kmplGuess',45));
 if(!f.length){$('fuelLeft').textContent='—';$('fuelRange').textContent='Add a fill-up to start';$('fuelFill').style.width='0%'}
 else{const last=f[0],sinceKm=Math.max(0,kmNow()-last.km);let lit=(last.full?tank():Math.min(tank(),last.l))-sinceKm/kmpl;lit=Math.max(0,Math.min(tank(),lit));
  $('fuelLeft').textContent=`${lit.toFixed(1)} L left`;$('fuelRange').textContent=`About ${Math.round(lit*kmpl)} km range${mileage()?'':' (estimated at '+kmpl+' km/l)'}`;
  $('fuelFill').style.width=Math.round(lit/tank()*100)+'%';$('fuelFill').className=lit/tank()<.15?'low':'';G2.range=lit*kmpl}
 const m=mileage();$('fuelKmpl').textContent=m?m.toFixed(1):'—';
 const spent=f.reduce((a,x)=>a+(x.a||0),0),km=f.length>1?f[0].km-f[f.length-1].km:0;$('fuelCost').textContent=spent&&km>0?(spent/km).toFixed(2):'—';
 const mo=new Date();mo.setDate(1);mo.setHours(0,0,0,0);$('fuelMonth').textContent=Math.round(f.filter(x=>x.t>=mo.getTime()).reduce((a,x)=>a+(x.a||0),0))||'—'}
fuelUI();setInterval(fuelUI,30000);
// low-fuel warning during a ride (once per fill-up)
setInterval(()=>{if(!riding||G2.range==null)return;const f=fills()[0];if(!f)return;const key='lowfuel_'+f.t;if(G2.range<25&&!SET.get(key,false)){SET.set(key,true);say(`Fuel is low, about ${Math.round(G2.range)} kilometres left. Say "nearest petrol pump" to Nova.`);toast(`Low fuel: about ${Math.round(G2.range)} km left`)}},20000);

// ===================== service reminders =====================
const SERV=[{k:'oil',n:'Engine oil change',i:'oil',every:3000},{k:'chain',n:'Chain clean & lube',i:'chain',every:600},{k:'tyre',n:'Tyre pressure check',i:'tyre',every:500},{k:'service',n:'General service',i:'wrench',every:5000}];
function serviceUI(){const done=store.get('serv')||{},now=kmNow();
 $('servList').innerHTML=SERV.map(s=>{const last=done[s.k]!=null?done[s.k]:null,left=last==null?null:last+s.every-now,pct=left==null?0:Math.max(0,Math.min(100,100-left/s.every*100)),due=left!=null&&left<=0,soon=left!=null&&left>0&&left<s.every*.15;
  return `<li class="${due?'due':soon?'soon':''}"><span class="si">${ic(s.i)}</span><span class="sm"><b>${s.n}</b><small>${last==null?`Every ${s.every} km — tap Done after the next one`:due?`Due now (${Math.round(-left)} km over)`:`In ${Math.round(left)} km`}</small><i style="width:${pct}%"></i></span><button data-k="${s.k}">Done</button></li>`}).join('')}
$('servList').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b)return;const d=store.get('serv')||{};d[b.dataset.k]=+kmNow().toFixed(1);store.set('serv',d);serviceUI();toast('Marked as done')};
serviceUI();setInterval(serviceUI,60000);
setTimeout(()=>{const done=store.get('serv')||{},due=SERV.filter(s=>done[s.k]!=null&&done[s.k]+s.every<=kmNow());if(due.length)toast(`Service due: ${due.map(s=>s.n).join(', ')}`)},6000);

// ===================== parking =====================
let parkMk=null;
function parkUI(){const p=store.get('park');$('parkFind').disabled=!p;if(parkMk){map.removeLayer(parkMk);parkMk=null}
 if(p){$('parkTxt').textContent=`Parked ${clock(new Date(p.t))}${p.note?' · '+p.note:''}${me?' · '+fmtD(hav(me,p.ll))+' away':''}`;
  parkMk=L.marker(p.ll,{icon:L.divIcon({className:'',html:`<div class="hz help hi-parking">${ic('parking')}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),title:'Your bike'}).addTo(map);$('parkSave').textContent='Park here again'}
 else{$('parkTxt').textContent='Save where you parked and find your bike later.';$('parkSave').textContent='Park here'}}
$('parkSave').onclick=()=>{if(!me){startWatch();toast('Finding your location…');return}store.set('park',{ll:[me[0],me[1]],t:Date.now()});parkUI();toast('Parking spot saved')};
$('parkFind').onclick=()=>{const p=store.get('park');if(!p)return;to={lat:p.ll[0],lng:p.ll[1],name:'My bike'};$('to').value='My bike';from=null;
 const old=profile;profile='bike';plan().then(()=>{profile=old});follow=false;map.flyTo(p.ll,17)};
parkUI();setInterval(parkUI,60000);

// ===================== hazard reports =====================
const REP={pothole:['Pothole','pothole'],accident:['Accident','accident'],checkpost:['Police check','checkpost'],water:['Water logging','water'],block:['Road blocked','block'],animal:['Animals on road','animal']};
const RL=L.layerGroup().addTo(map);
function reports(){const now=Date.now();return (store.get('reports')||[]).filter(r=>now-r.t<(r.k==='pothole'?30*86400000:6*3600000))}
function drawReports(){RL.clearLayers();reports().forEach(r=>L.marker(r.ll,{icon:L.divIcon({className:'',html:`<div class="hz rep">${ic(REP[r.k][1])}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),title:`${REP[r.k][0]}${r.by?' · '+r.by:''}`}).addTo(RL))}
function addReport(r,silent){const l=reports().filter(x=>!(x.k===r.k&&hav(x.ll,r.ll)<40));l.unshift(r);store.set('reports',l.slice(0,300));drawReports();if(!silent)toast(`${REP[r.k][0]} reported`)}
$('rpGrid').innerHTML=Object.entries(REP).map(([k,v])=>`<button data-k="${k}">${ic(v[1])}<span>${v[0]}</span></button>`).join('');
$('reportBtn').onclick=()=>{if(!me){toast('Turn on GPS to report a hazard');return}$('rpick').hidden=false};$('rpX').onclick=()=>$('rpick').hidden=true;
$('rpGrid').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b)return;const r={k:b.dataset.k,ll:[+me[0].toFixed(5),+me[1].toFixed(5)],t:Date.now(),by:SET.get('rname','')||''};
 addReport(r);$('rpick').hidden=true;if(G.room)gSend({t:'msg',text:`Reported: ${REP[r.k][0]} here`,name:myName(),rep:r})};
// warn when a reported hazard is just ahead
const warned=new Set();
setInterval(()=>{if(!riding||!me||stats.speed<2)return;for(const r of reports()){const d=hav(me,r.ll),key=r.k+r.t;if(d<180&&d>25&&!warned.has(key)){const ahead=Math.abs(((bearing(me,r.ll)-heading+540)%360)-180)<50;if(!ahead)continue;
 warned.add(key);say(`${REP[r.k][0]} reported ahead, ${Math.round(d/10)*10} metres`);toast(`${REP[r.k][0]} ahead — ${Math.round(d/10)*10} m`)}}},2000);
// reports from friends in the group
const _gOn=gOn;gOn=function(m){if(m.t==='msg'&&m.rep&&REP[m.rep.k]&&m.id!==G.id)addReport({...m.rep,by:m.name},true);_gOn(m)};
drawReports();

// ===================== share live trip with family =====================
function liveURL(code){const base=location.protocol==='https:'&&!location.host.includes('appassets')?`${location.origin}${location.pathname.replace(/[^/]*$/,'')}`:'https://pdfpup.openwise.tech/ride/';return `${base}live.html#${code}`}
$('shareLive').onclick=async()=>{if(!G.room){const c=Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');gConnect(c)}
 const url=liveURL(G.room),txt=`Follow my ride live on RideLine${to?' to '+to.name:''}: ${url}`;
 try{if(navigator.share){await navigator.share({title:'My live ride',text:txt});return}}catch(_){}
 location.href=`https://wa.me/?text=${encodeURIComponent(txt)}`};

// ===================== rain along the route =====================
async function rainAlong(){$('rainCard').hidden=true;if(!route)return;const n=6,pts=[],v=route.dist/route.dur;
 for(let k=0;k<n;k++){const target=route.dist*k/(n-1);let i=route.cum.findIndex(c=>c>=target);if(i<0)i=route.co.length-1;pts.push({ll:route.co[i],km:target/1000,at:Date.now()+target/v*1000})}
 try{const j=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pts.map(p=>p.ll[0].toFixed(3)).join(',')}&longitude=${pts.map(p=>p.ll[1].toFixed(3)).join(',')}&hourly=precipitation_probability,precipitation&forecast_days=2&timezone=auto`)).json();
  const arr=Array.isArray(j)?j:[j];
  pts.forEach((p,i)=>{const h=arr[i]&&arr[i].hourly;if(!h)return;const tz=(arr[i].utc_offset_seconds||0)*1000;let best=0,bd=1e15;h.time.forEach((t,k)=>{const d=Math.abs(Date.parse(t+'Z')-tz-p.at);if(d<bd){bd=d;best=k}});p.prob=h.precipitation_probability[best]||0;p.mm=h.precipitation[best]||0});
  const wet=pts.filter(p=>p.prob>=40);$('rainCard').hidden=false;
  $('rainBar').innerHTML=pts.map((p,ix)=>`<div class="${p.prob>=60?'hi':p.prob>=40?'mid':''}"><i style="height:${Math.max(6,p.prob)}%"></i><small>${ix===0?'Start':p.km.toFixed(p.km<10?1:0)+' km'}</small><em>${clock(new Date(p.at)).replace(/\s?[AP]M/i,'')}</em></div>`).join('');
  $('rainTxt').textContent=wet.length?`Rain likely near ${Math.round(wet[0].km)} km around ${clock(new Date(wet[0].at))} (${wet[0].prob}%). Carry rain gear and brake gently.`:'No rain expected along the route at the time you pass.';
  if(wet.length)window.__rainAhead=wet[0]}
 catch(_){$('rainCard').hidden=true}}
const _onRoute=SAFE.onRoute;SAFE.onRoute=function(){_onRoute();rainAlong()};

// ===================== achievements =====================
const ACH=[
 {k:'first',n:'First ride',d:'Finish your first ride',i:'flag',ok:h=>h.length>=1},
 {k:'k100',n:'100 km club',d:'Ride 100 km in total',i:'road',ok:h=>h.reduce((a,r)=>a+r.dist,0)>=100000},
 {k:'k1000',n:'1000 km legend',d:'Ride 1000 km in total',i:'trophy',ok:h=>h.reduce((a,r)=>a+r.dist,0)>=1000000},
 {k:'long',n:'Long hauler',d:'One ride of 100 km',i:'road',ok:h=>h.some(r=>r.dist>=100000)},
 {k:'ten',n:'Regular rider',d:'Finish 10 rides',i:'medal',ok:h=>h.length>=10},
 {k:'smooth',n:'Smooth rider',d:'Score 90+ on a ride',i:'score',ok:h=>h.some(r=>r.score>=90)},
 {k:'night',n:'Night rider',d:'Start a ride after 8 PM',i:'moon',ok:h=>h.some(r=>new Date(r.t).getHours()>=20)},
 {k:'early',n:'Early bird',d:'Start a ride before 6 AM',i:'sunrise',ok:h=>h.some(r=>new Date(r.t).getHours()<6)},
 {k:'twisty',n:'Curve hunter',d:'Ride a Twisty route',i:'twisty',ok:()=>SET.get('didTwisty',false)},
 {k:'helper',n:'Road helper',d:'Report a hazard',i:'warn',ok:()=>(store.get('reports')||[]).some(r=>!r.by||r.by===(SET.get('rname','')||''))},
];
function achUI(){const h=store.get('history')||[],got=store.get('ach')||{};let newOne=null;
 $('achGrid').innerHTML=ACH.map(a=>{const ok=a.ok(h);if(ok&&!got[a.k]){got[a.k]=Date.now();newOne=a}return `<div class="${ok?'unl':''}" title="${a.d}">${ic(a.i)}<b>${a.n}</b><small>${ok?'Unlocked':a.d}</small></div>`}).join('');
 store.set('ach',got);if(newOne&&h.length){toast(`Achievement unlocked: ${newOne.n}`);say(`Achievement unlocked. ${newOne.n}`)}}
achUI();
const _renderHist2=renderHist;renderHist=function(){_renderHist2();achUI()};
const _startRide3=startRide;startRide=async function(){if(rideStyle==='twisty'&&route&&route.src==='tomtom')SET.set('didTwisty',true);G2.lastDist=0;return _startRide3()};
const _stopRide2=stopRide;stopRide=function(a){if(riding)odoAdd(Math.max(0,stats.dist-G2.lastDist));G2.lastDist=0;_stopRide2(a);serviceUI();fuelUI();achUI()};
