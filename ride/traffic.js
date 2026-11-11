// RideLine live traffic (TomTom): flow + incident tiles over the map, key management, picker toggle.
const TTL={flow:null,inc:null,on:SET.get('traffic',true)};
function trafficLayer(){[TTL.flow,TTL.inc].forEach(l=>l&&map.removeLayer(l));TTL.flow=TTL.inc=null;ttState();
 const k=ttKey();if(!TTL.on||!k)return;const light=layerKey==='voyager'||layerKey==='street',q=`key=${encodeURIComponent(k)}`;
 TTL.flow=L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/${light?'relative0':'relative0-dark'}/{z}/{x}/{y}.png?${q}&thickness=8`,{maxZoom:20,maxNativeZoom:20,opacity:.85,zIndex:5,attribution:'Traffic © TomTom'}).addTo(map);
 TTL.inc=L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/incidents/${light?'s3':'night'}/{z}/{x}/{y}.png?${q}`,{maxZoom:20,maxNativeZoom:20,zIndex:6}).addTo(map)}
function ttState(){const k=ttKey();$('ttState').textContent=!k?'Add your TomTom key below':TTL.on?'On — traffic colours, jams and accidents':'Off';$('optTraffic').checked=TTL.on;$('ttKeyIn').placeholder=k?'Key saved ••••'+k.slice(-4):'TomTom API key'}
$('optTraffic').onchange=e=>{TTL.on=e.target.checked;SET.set('traffic',TTL.on);trafficLayer();if(route)plan({from:route.start})};
$('ttKeySave').onclick=()=>{const v=$('ttKeyIn').value.trim();if(v&&!/^[A-Za-z0-9]{20,64}$/.test(v)){toast('That does not look like a TomTom API key');return}
 SET.set('ttkey',v||null);$('ttKeyIn').value='';toast(v?'TomTom key saved on this phone':'TomTom key removed');trafficLayer();if(route)plan({from:route.start})};
// keep the traffic layer matched to the map style, and add a toggle to the style picker
const _setLayer=setLayer;setLayer=function(k){_setLayer(k);trafficLayer()};
const _pickUI=pickUI;pickUI=function(){_pickUI();$('lpick').insertAdjacentHTML('beforeend',`<label class="ltog"><span><b>Live traffic</b><small>${ttKey()?'TomTom · jams and accidents':'Add a TomTom key in Safety'}</small></span><input type="checkbox" id="pickTraffic" ${TTL.on&&ttKey()?'checked':''} ${ttKey()?'':'disabled'}><i></i></label>`);
 $('pickTraffic').onchange=e=>{TTL.on=e.target.checked;SET.set('traffic',TTL.on);trafficLayer();toast(TTL.on?'Live traffic on':'Live traffic off')}};
trafficLayer();
