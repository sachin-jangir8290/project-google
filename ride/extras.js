// RideLine extras: Ride Style routing (Fastest / Twisty / No highway / No toll), Ride Score, Glance mode.

// ===================== Ride Style =====================
let rideStyle=SET.get('style','fastest');
document.querySelectorAll('#rstyle [data-i]').forEach(b=>b.insertAdjacentHTML('afterbegin',ic(b.dataset.i)));
function styleUI(){document.querySelectorAll('#rstyle button').forEach(b=>b.classList.toggle('on',b.dataset.s===rideStyle))}styleUI();
$('rstyle').onclick=e=>{const b=e.target.closest('button');if(!b)return;rideStyle=b.dataset.s;SET.set('style',rideStyle);styleUI();
 const msg={fastest:'Fastest route',twisty:'Twisty route: curvy, hilly roads for a fun ride',nohighway:'Avoiding highways',notoll:'Avoiding toll roads'}[rideStyle];
 if(rideStyle==='twisty'&&!ttKey())toast('Twisty routes need a TomTom key (Safety tab)');else toast(msg);if(to)plan({from:route&&route.start})};
// TomTom: add route type / avoid options to the routing request
const _fetch=window.fetch.bind(window);
window.fetch=function(u,o){if(typeof u==='string'){
  if(u.includes('api.tomtom.com/routing/1/calculateRoute')){
   if(rideStyle==='twisty'&&profile==='car')u=u.replace('routeType=fastest','routeType=thrilling&hilliness=high&windingness=high');
   if(rideStyle==='nohighway')u+='&avoid=motorways';if(rideStyle==='notoll')u+='&avoid=tollRoads'}
  else if(u.includes('routing.openstreetmap.de')&&(rideStyle==='nohighway'||rideStyle==='notoll')&&profile==='car')u+='&exclude='+(rideStyle==='notoll'?'toll':'motorway')}
 return _fetch(u,o)};

// ===================== Ride Score =====================
const SC={on:false,ridingS:0,overS:0,brakes:0,accels:0,lastV:null,lastT:0,cool:0};
function scoreReset(){Object.assign(SC,{on:true,ridingS:0,overS:0,brakes:0,accels:0,lastV:null,lastT:0,cool:0});renderScore()}
// harsh braking / acceleration from the change in GPS speed
const _onPos=onPos;onPos=function(p){_onPos(p);if(!riding||!SC.on)return;const now=p.timestamp||Date.now(),v=stats.speed;
 if(SC.lastV!=null){const dt=(now-SC.lastT)/1000;if(dt>.4&&dt<4){const a=(v-SC.lastV)/dt;if(now>SC.cool){if(a<-3.5&&SC.lastV>4){SC.brakes++;SC.cool=now+3000}else if(a>3&&v>3){SC.accels++;SC.cool=now+3000}}}}
 SC.lastV=v;SC.lastT=now};
setInterval(()=>{if(!riding||!SC.on)return;SC.ridingS++;const lim=SPD.limit||OPT.max;if(stats.speed*3.6>lim+3)SC.overS++;if(SC.ridingS%5===0)renderScore()},1000);
function scoreCalc(){const mins=Math.max(1,SC.ridingS/60),overPct=SC.ridingS?SC.overS/SC.ridingS:0,perTen=n=>n/mins*10;
 const pSpeed=Math.min(40,overPct*120),pBrake=Math.min(30,perTen(SC.brakes)*6),pAccel=Math.min(20,perTen(SC.accels)*4);
 const score=Math.max(0,Math.round(100-pSpeed-pBrake-pAccel));
 const badge=score>=90?['Smooth Rider','smooth']:score>=75?['Safe Rider','safe']:score>=60?['Needs care','care']:['Risky ride','risky'];
 const tips=[];if(overPct>.05)tips.push(`You were over the limit ${Math.round(overPct*100)}% of the time. Ease off in towns and near schools.`);
 if(SC.brakes)tips.push(`${SC.brakes} hard ${SC.brakes>1?'brakes':'brake'}. Keep more distance and look further ahead.`);
 if(SC.accels)tips.push(`${SC.accels} sudden ${SC.accels>1?'accelerations':'acceleration'}. Roll the throttle on smoothly.`);
 if(!tips.length)tips.push('Smooth, steady and within limits. Great riding!');
 return {score,badge,overPct,brakes:SC.brakes,accels:SC.accels,tips}}
function arc(el,v){el.style.strokeDashoffset=String(314.16*(1-v/100));el.style.stroke=v>=90?'#d6f53f':v>=75?'#6ee7b7':v>=60?'#ffb020':'#ff5a5a'}
function facHTML(r){return `<div class="${r.overPct>.05?'bad':''}">${ic('fast')}<b>${Math.round(r.overPct*100)}%</b><small>Over limit</small></div><div class="${r.brakes?'bad':''}">${ic('brake')}<b>${r.brakes}</b><small>Hard brakes</small></div><div class="${r.accels?'bad':''}">${ic('score')}<b>${r.accels}</b><small>Hard starts</small></div>`}
function renderScore(){if(!SC.ridingS){$('scoreV').textContent='—';$('scoreL').textContent=riding?'Scoring your ride…':'Start a ride';$('scoreFac').innerHTML='';arc($('scoreArc'),0);return}
 const r=scoreCalc();$('scoreV').textContent=r.score;$('scoreL').textContent=riding?'Live score':r.badge[0];arc($('scoreArc'),r.score);$('scoreFac').innerHTML=facHTML(r)}
renderScore();
const _startRide2=startRide;startRide=async function(){scoreReset();return _startRide2()};
const _stopRide=stopRide;stopRide=function(arrived){const was=riding&&SC.on&&SC.ridingS>=60;const r=was?scoreCalc():null;const t0=stats.t0;_stopRide(arrived);SC.on=false;
 if(!r)return;const h=store.get('history')||[];if(h[0]&&h[0].t===t0){h[0].score=r.score;store.set('history',h);renderHist()}
 renderScore();$('scoreV').textContent=r.score;$('scoreL').textContent=r.badge[0];
 $('spTitle').textContent=r.badge[0];$('spV').textContent=r.score;$('spFac').innerHTML=facHTML(r);$('spTips').innerHTML=r.tips.map(t=>`<li>${ic('check')}<span>${t}</span></li>`).join('');
 $('scorePop').hidden=false;requestAnimationFrame(()=>arc($('spArc'),r.score));say(`Ride score ${r.score}. ${r.badge[0]}.`)};
$('spOk').onclick=()=>$('scorePop').hidden=true;
// show the score in the history list
const _renderHist=renderHist;renderHist=function(){_renderHist();const h=store.get('history')||[];document.querySelectorAll('#histList li[data-i]').forEach(li=>{const r=h[+li.dataset.i];if(r&&r.score!=null){const b=li.querySelector('.hm b');if(b&&!b.querySelector('.scp'))b.insertAdjacentHTML('beforeend',`<i class="scp">${r.score}</i>`)}})};renderHist();

// ===================== Glance mode =====================
let glTimer=null;
function glanceOpen(){$('glance').hidden=false;glanceUpdate();clearInterval(glTimer);glTimer=setInterval(glanceUpdate,700);try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{})}catch(_){}}
function glanceClose(){$('glance').hidden=true;clearInterval(glTimer);try{document.fullscreenElement&&document.exitFullscreen()}catch(_){}}
function glanceUpdate(){const v=Math.round(stats.speed*3.6),lim=SPD.limit||OPT.max;$('glSpd').textContent=v;$('glLim').textContent=lim;$('glance').classList.toggle('over',riding&&v>lim+3);
 $('glTime').textContent=clock(new Date());
 if(route){const a=route.along||0,s=route.steps.find((x,i)=>i>0&&x.cum>a+3)||route.steps[route.steps.length-1],d=Math.max(0,s.cum-a),rem=Math.max(0,route.dist-a);
  $('glIcon').innerHTML=turnIcon(s.type,s.mod);$('glDist').textContent=fmtD(d);$('glInstr').textContent=s.text;$('glEta').textContent=`${fmtD(rem)} · ETA ${clock(new Date(Date.now()+rem/(route.dist/route.dur)*1000))}`;$('glance').classList.toggle('soon',riding&&d<150)}
 else{$('glIcon').innerHTML=ic('glance');$('glDist').textContent=`${(stats.dist/1000).toFixed(1)} km`;$('glInstr').textContent=riding?'Free ride':'No route — pick a destination';$('glEta').textContent=''}}
$('glanceBtn').onclick=glanceOpen;$('glance').onclick=glanceClose;
