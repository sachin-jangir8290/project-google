// PDFPup image tools — loaded only on images.html (after app.js, uses its helpers)
LIB.h2c=CDN+'html2canvas/1.4.1/html2canvas.min.js';
Object.assign(ICONS,{
 upscale:'<path d="M3 21l7-7M3 14v7h7"/><rect x="11" y="3" width="10" height="10" rx="2"/><path d="M14 10l4-4M15 6h3v3"/>',
 exif:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/><path d="m2 2 20 20"/>',
 tojpg:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 15V9M7 15H5M11 9h2a1.5 1.5 0 0 1 0 3h-2v3M11 9v3M19 9h-2v6h2v-3"/>',
 topng:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M5 15V9h1.5a1.5 1.5 0 0 1 0 3H5M10 15V9l3 6V9M19 9h-2v6h2v-3"/>',
 towebp:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m5 9 1 6 1.5-4 1.5 4 1-6M13 9h3M13 12h2.5M13 15h3M13 9v6"/>',
 img2pdf:'<rect x="2" y="4" width="11" height="11" rx="2"/><path d="m2 12 3-3 4 4"/><path d="M16 9h2l3 3v8a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-3"/>',
 base64:'<path d="m8 6-6 6 6 6M16 6l6 6-6 6M13 4l-2 16"/>',
 favicon:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m12 7 1.5 3 3.5.5-2.5 2.4.6 3.5L12 14.8 8.9 16.4l.6-3.5L7 10.5l3.5-.5z"/>',
 html2img:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M9 13l-2 2 2 2M15 13l2 2-2 2"/>',
 flip:'<path d="M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z"/>',
 border:'<rect x="3" y="3" width="18" height="18" rx="6"/><rect x="7" y="7" width="10" height="10" rx="2"/>',
 filters:'<circle cx="9" cy="9" r="6"/><circle cx="15" cy="9" r="6"/><circle cx="12" cy="15" r="6"/>',
 blur:'<circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1"/>',
 removebg:'<path d="M4 4h4M4 4v4M20 4h-4M20 4v4M4 20h4M4 20v-4M20 20h-4M20 20v-4"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-3 3-4 5-4s4 1 5 4"/>',
 meme:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
 collage:'<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
 picker:'<path d="m2 22 1-1h3l9-9M3 21v-3l9-9"/><path d="m15 6 3-3a2.1 2.1 0 0 1 3 3l-3 3 1 1-2 2-6-6 2-2z"/>',
});
const IMGA='image/*',EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const kb=b=>b>1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(0)+' KB';
const newC=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
async function imgC(f){const b=await createImageBitmap(f);const c=newC(b.width,b.height);c.getContext('2d').drawImage(b,0,0);return c}
const fmtOf=f=>EXT[f.type]?f.type:'image/png';
const flat=(c,bg='#fff')=>{const o=newC(c.width,c.height),x=o.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,o.width,o.height);x.drawImage(c,0,0);return o};
const enc=(c,t,q=.92)=>c2b(t==='image/jpeg'?flat(c):c,t,q);
const nm=(f,s,t)=>`${base(f)}${s}.${EXT[t]||'png'}`;
async function batch(fs,fn,zip){const out=[];for(const [i,f] of fs.entries()){prog(i+1,fs.length,'Image');out.push(await fn(await imgC(f),f))}await zipSave(out,zip)}
const draw=(c,w,h,fn)=>{const o=newC(w,h),x=o.getContext('2d');x.imageSmoothingQuality='high';fn(x,o);return o};
const conv=t=>fs=>batch(fs,async(c,f)=>[nm(f,'',t),await enc(c,t,.92)],'converted-'+EXT[t]+'.zip');

window.IMG_CATS=['All','Optimize','Convert','Edit','Create'];
window.IMG_TOOLS={
 compress:{cat:'Optimize',name:'Compress Image',desc:'Shrink JPG, PNG and WEBP files while keeping quality.',multi:1,accept:IMGA,
  opts:'<label>Quality: <select id="q"><option value=".8">High</option><option value=".65" selected>Recommended</option><option value=".45">Smallest</option></select></label><label>Output: <select id="of"><option value="auto">Auto (best)</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option></select></label>',
  run:async fs=>{let a=0,b=0;await batch(fs,async(c,f)=>{const t=val('of')==='auto'?(f.type==='image/png'?'image/webp':fmtOf(f)):val('of');let by=await enc(c,t,+val('q')),n=nm(f,'-compressed',t);if(by.length>=f.size){by=new Uint8Array(await f.arrayBuffer());n=f.name}a+=f.size;b+=by.length;return [n,by]},'compressed-images.zip');msg(`✅ ${kb(a)} → ${kb(b)} (${Math.max(0,Math.round(100-b/a*100))}% smaller)`)}},
 resize:{cat:'Optimize',name:'Resize Image',desc:'Change size by pixels or percentage — in bulk.',multi:1,accept:IMGA,
  opts:'<label><select id="rm"><option value="px">By pixels</option><option value="pct">By percentage</option></select></label><label>Width <input id="rw" type="number" placeholder="1080" style="width:90px"></label><label>Height <input id="rh" type="number" placeholder="auto" style="width:90px"></label><label><input type="checkbox" id="kr" checked> Keep ratio</label><label>Percent: <select id="pc"><option>25</option><option selected>50</option><option>75</option><option>150</option><option>200</option></select>%</label>',
  run:fs=>batch(fs,async(c,f)=>{let w,h;if(val('rm')==='pct'){const k=+val('pc')/100;w=c.width*k;h=c.height*k}else{w=+val('rw')||0;h=+val('rh')||0;if(!w&&!h)throw new Error('Enter width or height');
   if($('kr').checked){if(w&&!h)h=c.height*w/c.width;else if(h&&!w)w=c.width*h/c.height;else{const k=Math.min(w/c.width,h/c.height);w=c.width*k;h=c.height*k}}w=w||c.width;h=h||c.height}
   const o=draw(c,w,h,(x,o)=>x.drawImage(c,0,0,o.width,o.height)),t=fmtOf(f);return [nm(f,`-${o.width}x${o.height}`,t),await enc(o,t)]},'resized-images.zip')},
 crop:{cat:'Optimize',name:'Crop Image',desc:'Crop to square, 16:9, story size or exact pixels.',multi:1,accept:IMGA,
  opts:'<label>Shape: <select id="ar"><option>1:1</option><option>4:3</option><option>3:4</option><option>16:9</option><option>9:16</option><option>3:2</option><option value="px">Exact pixels</option></select></label><label>W <input id="cw" type="number" value="800" style="width:80px"></label><label>H <input id="ch" type="number" value="800" style="width:80px"></label><label>Keep: <select id="cp"><option value="c">Center</option><option value="t">Top</option><option value="b">Bottom</option></select></label>',
  run:fs=>batch(fs,async(c,f)=>{let w,h;if(val('ar')==='px'){w=Math.min(+val('cw')||c.width,c.width);h=Math.min(+val('ch')||c.height,c.height)}else{const [aw,ah]=val('ar').split(':').map(Number);w=c.width;h=w*ah/aw;if(h>c.height){h=c.height;w=h*aw/ah}}
   const sx=(c.width-w)/2,sy=val('cp')==='t'?0:val('cp')==='b'?c.height-h:(c.height-h)/2,o=draw(c,w,h,x=>x.drawImage(c,sx,sy,w,h,0,0,w,h)),t=fmtOf(f);return [nm(f,'-cropped',t),await enc(o,t)]},'cropped-images.zip')},
 upscale:{cat:'Optimize',name:'Upscale Image',desc:'Enlarge images 2× or 4× with smooth, sharp scaling.',multi:1,accept:IMGA,opts:'<label>Scale: <select id="us"><option>2</option><option>4</option></select>×</label>',
  run:fs=>batch(fs,async(c,f)=>{let cur=c;for(let s=+val('us');s>1;s/=2){const p=cur;cur=draw(p,p.width*2,p.height*2,(x,o)=>x.drawImage(p,0,0,o.width,o.height))}
   const x=cur.getContext('2d'),im=x.getImageData(0,0,cur.width,cur.height),d=im.data,src=new Uint8ClampedArray(d),W=cur.width;
   for(let i=W*4;i<d.length-W*4;i+=4){if(i%(W*4)<4||i%(W*4)>=W*4-4)continue;for(let k=0;k<3;k++){const v=5*src[i+k]-src[i+k-4]-src[i+k+4]-src[i+k-W*4]-src[i+k+W*4];d[i+k]=src[i+k]*.6+v*.4}}
   x.putImageData(im,0,0);const t=fmtOf(f);return [nm(f,`-x${val('us')}`,t),await enc(cur,t)]},'upscaled-images.zip')},
 exif:{cat:'Optimize',name:'Remove Metadata',desc:'Strip EXIF data like GPS location and camera info before sharing.',multi:1,accept:IMGA,
  run:fs=>batch(fs,async(c,f)=>{const t=fmtOf(f);return [nm(f,'-clean',t),await enc(c,t,.95)]},'clean-images.zip')},

 tojpg:{cat:'Convert',name:'Convert to JPG',desc:'Turn PNG, WEBP, GIF, BMP or SVG into JPG.',multi:1,accept:IMGA,run:conv('image/jpeg')},
 topng:{cat:'Convert',name:'Convert to PNG',desc:'Turn JPG, WEBP and more into lossless PNG.',multi:1,accept:IMGA,run:conv('image/png')},
 towebp:{cat:'Convert',name:'Convert to WEBP',desc:'Make lighter images for faster websites.',multi:1,accept:IMGA,run:conv('image/webp')},
 img2pdf:{cat:'Convert',name:'Image to PDF',desc:'Combine photos into a single PDF document.',multi:1,accept:IMGA,
  run:async fs=>{const o=await PDFDocument.create();for(const [i,f] of fs.entries()){prog(i+1,fs.length,'Image');const c=await imgC(f),img=await o.embedJpg(await enc(c,'image/jpeg',.92));o.addPage([c.width,c.height]).drawImage(img,{x:0,y:0,width:c.width,height:c.height})}save(await o.save(),'images.pdf')}},
 base64:{cat:'Convert',name:'Image to Base64',desc:'Get a data URL to embed an image in HTML or CSS.',accept:IMGA,
  run:async([f])=>{const r=new FileReader();const u=await new Promise(ok=>{r.onload=()=>ok(r.result);r.readAsDataURL(f)});$('out').innerHTML=`<textarea readonly class="b64">${u}</textarea><button class="btn sm" onclick="navigator.clipboard.writeText(this.previousSibling.value);this.textContent='Copied!'">Copy</button>`;msg(`Base64 ready (${kb(u.length)}).`)}},
 favicon:{cat:'Convert',name:'Favicon Generator',desc:'Create favicon.ico and app icons in every size.',accept:IMGA,
  run:async([f])=>{const c=await imgC(f),s=Math.min(c.width,c.height),sq=draw(c,s,s,x=>x.drawImage(c,(c.width-s)/2,(c.height-s)/2,s,s,0,0,s,s)),out=[],ico=[];
   for(const z of [16,32,48,64,128,180,192,512]){const b=await c2b(draw(sq,z,z,(x,o)=>x.drawImage(sq,0,0,z,z)),'image/png');out.push([z===180?'apple-touch-icon.png':`icon-${z}.png`,b]);if(z<=48)ico.push([z,b])}
   const head=6+16*ico.length,len=head+ico.reduce((a,[,b])=>a+b.length,0),buf=new Uint8Array(len),v=new DataView(buf.buffer);v.setUint16(2,1,true);v.setUint16(4,ico.length,true);let off=head;
   ico.forEach(([z,b],i)=>{const e=6+16*i;buf[e]=z;buf[e+1]=z;v.setUint16(e+4,1,true);v.setUint16(e+6,32,true);v.setUint32(e+8,b.length,true);v.setUint32(e+12,off,true);buf.set(b,off);off+=b.length});out.unshift(['favicon.ico',buf]);
   await zipSave(out,'favicons.zip');$('out').textContent='<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">'}},
 html2img:{cat:'Convert',name:'HTML to Image',desc:'Paste HTML and save it as a PNG image.',accept:'.html,.htm',optional:1,opts:'<textarea id="html" placeholder="<div style=&quot;padding:40px;background:#0ea5e9;color:#fff;font:700 40px sans-serif&quot;>Hello!</div>"></textarea>',
  run:async fs=>{const h=fs[0]?await fs[0].text():val('html');if(!h.trim())throw new Error('Add some HTML first');await need('h2c');const el=document.createElement('div');el.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;background:#fff';el.innerHTML=h;document.body.append(el);
   try{const c=await html2canvas(el,{scale:2,backgroundColor:null});save(await c2b(c,'image/png'),'html-image.png')}finally{el.remove()}}},

 rotate:{cat:'Edit',name:'Rotate Image',desc:'Rotate many images at once.',multi:1,accept:IMGA,opts:'<label><select id="deg"><option value="90">90° right</option><option value="180">180°</option><option value="270">90° left</option></select></label>',
  run:fs=>batch(fs,async(c,f)=>{const d=+val('deg'),sw=d%180,o=draw(c,sw?c.height:c.width,sw?c.width:c.height,(x,o)=>{x.translate(o.width/2,o.height/2);x.rotate(d*Math.PI/180);x.drawImage(c,-c.width/2,-c.height/2)}),t=fmtOf(f);return [nm(f,'-rotated',t),await enc(o,t)]},'rotated-images.zip')},
 flip:{cat:'Edit',name:'Flip Image',desc:'Mirror images horizontally or vertically.',multi:1,accept:IMGA,opts:'<label><select id="fd"><option value="h">Horizontal (mirror)</option><option value="v">Vertical</option><option value="b">Both</option></select></label>',
  run:fs=>batch(fs,async(c,f)=>{const m=val('fd'),o=draw(c,c.width,c.height,(x,o)=>{x.translate(m!=='v'?o.width:0,m!=='h'?o.height:0);x.scale(m!=='v'?-1:1,m!=='h'?-1:1);x.drawImage(c,0,0)}),t=fmtOf(f);return [nm(f,'-flipped',t),await enc(o,t)]},'flipped-images.zip')},
 watermark:{cat:'Edit',name:'Watermark Image',desc:'Protect photos with your name or brand text.',multi:1,accept:IMGA,
  opts:'<label>Text: <input id="wm" value="© My Brand"></label><label>Style: <select id="wp"><option value="br">Bottom right</option><option value="c">Center</option><option value="t">Tiled</option></select></label><label>Color: <input id="col" type="color" value="#ffffff"></label><label>Opacity: <select id="op"><option>0.3</option><option selected>0.5</option><option>0.8</option></select></label>',
  run:fs=>batch(fs,async(c,f)=>{const o=draw(c,c.width,c.height,(x,o)=>{x.drawImage(c,0,0);const s=Math.max(14,o.width/(val('wp')==='br'?28:14)),t=val('wm');x.font=`700 ${s}px Outfit,Arial,sans-serif`;x.fillStyle=val('col');x.globalAlpha=+val('op');x.shadowColor='#0008';x.shadowBlur=s/6;
   const w=x.measureText(t).width;if(val('wp')==='br'){x.fillText(t,o.width-w-s,o.height-s)}else if(val('wp')==='c'){x.textAlign='center';x.fillText(t,o.width/2,o.height/2)}else{x.rotate(-Math.PI/6);for(let yy=-o.height;yy<o.height*2;yy+=s*4)for(let xx=-o.width;xx<o.width*2;xx+=w+s*3)x.fillText(t,xx,yy)}}),tp=fmtOf(f);return [nm(f,'-watermarked',tp),await enc(o,tp)]},'watermarked-images.zip')},
 border:{cat:'Edit',name:'Border & Shape',desc:'Add borders, rounded corners or make a circle photo.',multi:1,accept:IMGA,
  opts:'<label>Shape: <select id="sh"><option value="r">Rounded corners</option><option value="o">Circle</option><option value="s">Square corners</option></select></label><label>Border: <input id="bw" type="number" value="20" style="width:70px">px</label><label>Color: <input id="col" type="color" value="#ffffff"></label>',
  run:fs=>batch(fs,async(c,f)=>{const b=+val('bw')||0,sh=val('sh');let src=c;if(sh==='o'){const s=Math.min(c.width,c.height);src=draw(c,s,s,x=>x.drawImage(c,(c.width-s)/2,(c.height-s)/2,s,s,0,0,s,s))}
   const W=src.width+2*b,H=src.height+2*b,R=sh==='o'?W/2:sh==='r'?Math.min(W,H)*.08:0,o=draw(src,W,H,(x)=>{const path=(r,i)=>{x.beginPath();x.roundRect(i,i,W-2*i,H-2*i,Math.max(0,r))};path(R,0);x.fillStyle=val('col');x.fill();path(R-b,b);x.save();x.clip();x.drawImage(src,b,b);x.restore()});return [nm(f,'-framed','image/png'),await enc(o,'image/png')]},'framed-images.zip')},
 filters:{cat:'Edit',name:'Photo Filters',desc:'Brightness, contrast, saturation and one-click looks.',multi:1,accept:IMGA,
  opts:'<label>Look: <select id="pre" onchange="setLook(this.value)"><option value="">Custom</option><option value="vivid">Vivid</option><option value="bw">Black & White</option><option value="vintage">Vintage</option><option value="cool">Cool</option><option value="warm">Warm</option></select></label><br><label>Brightness <input id="fb" type="range" min="50" max="150" value="100"></label><label>Contrast <input id="fc" type="range" min="50" max="150" value="100"></label><label>Saturation <input id="fs" type="range" min="0" max="200" value="100"></label><label>Sepia <input id="fp" type="range" min="0" max="100" value="0"></label><label>Grayscale <input id="fg" type="range" min="0" max="100" value="0"></label><label>Hue <input id="fh" type="range" min="-180" max="180" value="0"></label>',
  run:fs=>batch(fs,async(c,f)=>{const flt=`brightness(${val('fb')}%) contrast(${val('fc')}%) saturate(${val('fs')}%) sepia(${val('fp')}%) grayscale(${val('fg')}%) hue-rotate(${val('fh')}deg)`,o=draw(c,c.width,c.height,x=>{x.filter=flt;x.drawImage(c,0,0)}),t=fmtOf(f);return [nm(f,'-edited',t),await enc(o,t)]},'edited-images.zip')},
 blur:{cat:'Edit',name:'Blur & Pixelate',desc:'Blur or pixelate a photo to hide details.',multi:1,accept:IMGA,opts:'<label>Effect: <select id="bm"><option value="b">Blur</option><option value="p">Pixelate</option></select></label><label>Strength: <input id="bs" type="range" min="1" max="10" value="5"></label>',
  run:fs=>batch(fs,async(c,f)=>{const s=+val('bs');let o;if(val('bm')==='b')o=draw(c,c.width,c.height,x=>{x.filter=`blur(${Math.max(c.width,c.height)*s/600}px)`;x.drawImage(c,0,0)});else{const k=Math.max(4,Math.round(Math.max(c.width,c.height)*s/250)),sm=draw(c,c.width/k,c.height/k,(x,o)=>x.drawImage(c,0,0,o.width,o.height));o=draw(c,c.width,c.height,(x,o)=>{x.imageSmoothingEnabled=false;x.drawImage(sm,0,0,o.width,o.height)})}const t=fmtOf(f);return [nm(f,'-blurred',t),await enc(o,t)]},'blurred-images.zip')},
 removebg:{cat:'Edit',name:'Remove Background',desc:'Make plain (white or solid colour) backgrounds transparent.',multi:1,accept:IMGA,opts:'<label>Tolerance: <input id="tol" type="range" min="5" max="120" value="40"></label><p class="muted small">Works best on product photos, logos and signatures with a plain background.</p>',
  run:fs=>batch(fs,async(c,f)=>{const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data,W=c.width,H=c.height,tol=+val('tol'),seen=new Uint8Array(W*H),q=[];
   const cs=[0,W-1,(H-1)*W,H*W-1].map(i=>[d[i*4],d[i*4+1],d[i*4+2]]),bg=cs.reduce((a,b)=>a.map((v,k)=>v+b[k]/4),[0,0,0]);
   for(let xx=0;xx<W;xx++)q.push(xx,(H-1)*W+xx);for(let yy=0;yy<H;yy++)q.push(yy*W,yy*W+W-1);
   while(q.length){const i=q.pop();if(seen[i])continue;seen[i]=1;const p=i*4,dist=Math.abs(d[p]-bg[0])+Math.abs(d[p+1]-bg[1])+Math.abs(d[p+2]-bg[2]);if(dist>tol*3)continue;d[p+3]=dist>tol*2?Math.round(255*(dist-tol*2)/tol):0;
    const xx=i%W;if(xx>0)q.push(i-1);if(xx<W-1)q.push(i+1);if(i>=W)q.push(i-W);if(i<W*H-W)q.push(i+W)}
   x.putImageData(im,0,0);return [nm(f,'-no-bg','image/png'),await c2b(c,'image/png')]},'no-background.zip')},

 meme:{cat:'Create',name:'Meme Generator',desc:'Add classic top and bottom meme text to any picture.',accept:IMGA,opts:'<label>Top text: <input id="mt" value="WHEN THE PDF"></label><label>Bottom text: <input id="mb" value="FINALLY MERGES"></label><label>Size: <select id="ms"><option value="9">Small</option><option value="7" selected>Medium</option><option value="5">Big</option></select></label>',
  run:async([f])=>{const c=await imgC(f),o=draw(c,c.width,c.height,(x,o)=>{x.drawImage(c,0,0);const s=o.width/+val('ms');x.font=`900 ${s}px Impact,'Arial Black',sans-serif`;x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=s/10;x.lineJoin='round';
   const wrap=t=>{const ws=t.toUpperCase().split(' '),ls=[];let l='';ws.forEach(w=>{if(x.measureText(l+' '+w).width>o.width*.92&&l){ls.push(l);l=w}else l=l?l+' '+w:w});if(l)ls.push(l);return ls};
   wrap(val('mt')).forEach((l,i)=>{x.textBaseline='top';x.strokeText(l,o.width/2,s*.3+i*s);x.fillText(l,o.width/2,s*.3+i*s)});const bl=wrap(val('mb'));bl.forEach((l,i)=>{x.textBaseline='bottom';const y=o.height-s*.3-(bl.length-1-i)*s;x.strokeText(l,o.width/2,y);x.fillText(l,o.width/2,y)})});
   save(await enc(o,'image/jpeg',.92),base(f)+'-meme.jpg')}},
 collage:{cat:'Create',name:'Photo Collage',desc:'Arrange several photos in a neat grid.',multi:1,accept:IMGA,opts:'<label>Columns: <select id="cc"><option>2</option><option selected>3</option><option>4</option></select></label><label>Gap: <input id="cg" type="number" value="12" style="width:60px">px</label><label>Background: <input id="col" type="color" value="#ffffff"></label>',
  run:async fs=>{const cols=Math.min(+val('cc'),fs.length),g=+val('cg')||0,S=600,rows=Math.ceil(fs.length/cols),cs=[];for(const f of fs)cs.push(await imgC(f));
   const o=draw(cs[0],cols*S+(cols+1)*g,rows*S+(rows+1)*g,(x,o)=>{x.fillStyle=val('col');x.fillRect(0,0,o.width,o.height);cs.forEach((c,i)=>{const s=Math.min(c.width,c.height),X=g+(i%cols)*(S+g),Y=g+Math.floor(i/cols)*(S+g);x.drawImage(c,(c.width-s)/2,(c.height-s)/2,s,s,X,Y,S,S)})});
   save(await enc(o,'image/jpeg',.9),'collage.jpg')}},
 picker:{cat:'Create',name:'Color Picker',desc:'Click a photo to get HEX & RGB, plus its main colour palette.',accept:IMGA,
  onfile:async([f])=>{const c=await imgC(f),v=newC(Math.min(c.width,700),Math.min(c.width,700)*c.height/c.width);v.getContext('2d').drawImage(c,0,0,v.width,v.height);v.className='pick';$('out').innerHTML='<p class="muted">Click anywhere on the image:</p><div id="sw"></div>';$('out').prepend(v);
   v.onclick=e=>{const r=v.getBoundingClientRect(),[R,G,B]=v.getContext('2d').getImageData((e.clientX-r.left)*v.width/r.width,(e.clientY-r.top)*v.height/r.height,1,1).data,h='#'+[R,G,B].map(n=>n.toString(16).padStart(2,'0')).join('');$('sw').insertAdjacentHTML('afterbegin',`<span class="swatch" style="--s:${h}" onclick="navigator.clipboard.writeText('${h}')"><i></i>${h}<small>rgb(${R}, ${G}, ${B})</small></span>`)}},
  run:async([f])=>{const c=await imgC(f),v=draw(c,64,64,(x,o)=>x.drawImage(c,0,0,64,64)),d=v.getContext('2d').getImageData(0,0,64,64).data,m={};for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const k=[d[i],d[i+1],d[i+2]].map(n=>Math.round(n/32)*32>255?255:Math.round(n/32)*32).join();m[k]=(m[k]||0)+1}
   const pal=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>'#'+k.split(',').map(n=>(+n).toString(16).padStart(2,'0')).join(''));
   $('sw').insertAdjacentHTML('afterbegin','<div class="pal">'+pal.map(h=>`<span class="swatch" style="--s:${h}" onclick="navigator.clipboard.writeText('${h}')"><i></i>${h}</span>`).join('')+'</div>');msg('Main colours of your image (click a swatch to copy):')}},
};
function setLook(v){const L={vivid:[105,115,150,0,0,0],bw:[100,120,0,0,100,0],vintage:[105,90,80,45,0,-10],cool:[100,105,110,0,0,15],warm:[105,100,120,20,0,-8]}[v]||[100,100,100,0,0,0];['fb','fc','fs','fp','fg','fh'].forEach((id,i)=>$(id).value=L[i])}
