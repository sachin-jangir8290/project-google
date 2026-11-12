// RideLine heading-up map + floating window (Android picture-in-picture).
// The map turns with you while riding, so the road ahead is always up. Two fingers rotate the map by hand;
// the compass button switches between "direction up" and "north up".
let headUp=store.get('headUp')!==false;
document.body.insertAdjacentHTML('beforeend',`<button class="round compassb" id="compassBtn" title="Direction up / North up"><svg viewBox="0 0 24 24" id="compassN"><path d="M12 2 8 12h8z" fill="#ff5a5a" stroke="none"/><path d="M12 22l4-10H8z" fill="currentColor" stroke="none" opacity=".6"/></svg></button>`);
function compassUI(){const b=map.getBearing();$('compassN').style.transform=`rotate(${b}deg)`;$('compassBtn').classList.toggle('on',headUp);$('compassBtn').classList.toggle('show',headUp||Math.abs(b)>1)}
map.on('rotate',()=>{compassUI();if(typeof drawMe==='function'&&me){const el=riderMk&&riderMk.getElement(),h=riderHeading()+map.getBearing();el&&el.querySelectorAll('.core,.cone').forEach(x=>x.style.transform=`rotate(${h}deg)`)}});
let hTarget=0;
function headTick(){if(!headUp||!follow||!me){return}
 const want=-riderHeading();let cur=map.getBearing(),d=((want-cur+540)%360)-180;if(Math.abs(d)<2)return;
 // smooth turn so the map does not jump with every GPS fix
 map.setBearing(cur+d*.35)}
setInterval(()=>{if(riding||(headUp&&follow&&stats.speed>1.5))headTick()},250);
$('compassBtn').onclick=()=>{headUp=!headUp;store.set('headUp',headUp);if(!headUp)map.setBearing(0);else{follow=true;$('recenter').classList.add('on');headTick()}
 toast(headUp?'Map turns with your direction':'North up');compassUI()};
const _stopHU=stopRide;stopRide=function(){const r=_stopHU.apply(this,arguments);if(!headUp)map.setBearing(0);compassUI();return r};
compassUI();

// ===================== floating window =====================
// MainActivity switches to a small floating window when you leave the app during a ride and calls onPip(true/false).
window.onPip=on=>{document.body.classList.toggle('pip',!!on);if(on){follow=true;setTimeout(()=>{map.invalidateSize();me&&followTo(me)},150)}else setTimeout(()=>map.invalidateSize(),150)};
// tell Android whether leaving the app should open the floating window
setInterval(()=>{try{window.NovaNative&&NovaNative.setPipAllowed&&NovaNative.setPipAllowed(!!(riding||route))}catch(_){}},2000);
