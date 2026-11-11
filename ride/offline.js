// RideLine offline maps: every map tile is looked up in the phone's tile cache first, then the network.
// Loaded before ride.js so the base map layers use it from their first tile.
const TILE_CACHE='rideline-tiles-v1';
const OFF={ok:typeof caches!=='undefined'&&window.isSecureContext};
(function(){if(!window.L)return;
 L.TileLayer.prototype.createTile=function(coords,done){const img=document.createElement('img');
  L.DomEvent.on(img,'load',L.Util.bind(this._tileOnLoad,this,done,img));L.DomEvent.on(img,'error',L.Util.bind(this._tileOnError,this,done,img));
  if(this.options.crossOrigin||this.options.crossOrigin==='')img.crossOrigin=this.options.crossOrigin===true?'':this.options.crossOrigin;
  img.alt='';img.setAttribute('role','presentation');const url=this.getTileUrl(coords);
  if(!OFF.ok||this.options.noCache){img.src=url;return img}
  caches.open(TILE_CACHE).then(c=>c.match(url)).then(r=>{if(!r){img.src=url;return}return r.blob().then(b=>{const u=URL.createObjectURL(b);img.onload=()=>URL.revokeObjectURL(u);img.src=u})}).catch(()=>{img.src=url});
  return img}})();
