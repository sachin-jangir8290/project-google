// PDFPup PDF Editor — runs fully in the browser (pdf.js for display, pdf-lib for saving)
const {PDFDocument,rgb,StandardFonts,LineCapStyle,BlendMode}=PDFLib;
const $=id=>document.getElementById(id);
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ---------- icons ----------
const IC={
 select:'<path d="m4 3 7 17 2.5-7.5L21 10z"/>',
 edittext:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/><path d="m17 14 3 3-4 4h-3v-3z"/>',
 text:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
 pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 highlight:'<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
 shape:'<path d="M8.3 10a.7.7 0 0 1-.6-1L11.4 2.7a.7.7 0 0 1 1.2 0L16.3 9a.7.7 0 0 1-.6 1z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
 rect:'<rect x="3" y="5" width="18" height="14" rx="1.5"/>',square:'<rect x="4" y="4" width="16" height="16" rx="1.5"/>',
 ellipse:'<circle cx="12" cy="12" r="8.5"/>',
 line:'<path d="M5 19 19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
 arrow:'<path d="M4 12h15M14 7l5 5-5 5"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
 sign:'<path d="M3 17c3-6 5-9 6-8s-2 7 0 8 3-4 5-4 1 3 3 3 3-2 4-2"/><path d="M3 21h18"/>',
 whiteout:'<path d="m7 21-4-4L14 6l7 7-8 8z"/><path d="M22 21H7M5 11l9 9"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
 dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
 pick:'<path d="m2 22 1-1h3l9-9M3 21v-3l9-9"/><path d="m15 6 3-3a2.1 2.1 0 0 1 3 3l-3 3 1 1-2 2-6-6 2-2z"/>',
 draw:'<path d="M3 15c2-4 4-6 6-4s-1 6 2 6 4-8 7-8 2 5 3 5"/>',type:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
 frame:'<rect x="4" y="4" width="16" height="16" rx="2"/>',stroke:'<path d="M4 6h16M4 12h16M4 18h16"/>',
};
const svg=k=>`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const TOOLS=[['select','Select'],['edittext','Edit text'],'|',['text','Add text'],['pen','Draw'],['highlight','Highlight'],['shape','Shapes'],'|',['image','Image'],['sign','Signature'],['whiteout','Whiteout']];
const SHAPES=['rect','ellipse','line','arrow'];
const HINT={select:'Click an item to select · drag to move · corner to resize',edittext:'Click any existing text in the PDF to change it',text:'Click on the page to add text',image:'Click on the page where the image should go',sign:'Click on the page where your signature should go',pen:'Draw freely on the page',highlight:'Drag over text to highlight it',rect:'Drag to draw a rectangle',ellipse:'Drag to draw a circle',line:'Drag to draw a line',arrow:'Drag to draw an arrow',whiteout:'Drag over anything to cover it with white'};
const COLORS=['#0f172a','#ffffff','#ef4444','#0ea5e9','#facc15','#22c55e','#f97316'];
const HL=['#facc15','#86efac','#f9a8d4','#93c5fd','#fdba74'];

let bytes=null,doc=null,fname='document.pdf',pages=[],objs=[],sel=null,mode='select',shape='rect',Z=1,hist=[],fut=[],nid=1,pending=null,dirty=false;
const D={color:'#0f172a',fc:null,font:'Helvetica',size:16,bold:false,italic:false,u:false,sw:2,dash:'solid',op:1,hl:'#facc15',hw:14};
const CSSF={Helvetica:'Helvetica,Arial,sans-serif',Times:'"Times New Roman",Times,serif',Courier:'"Courier New",Courier,monospace'};

const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)};
const hex=h=>{const n=parseInt(h.slice(1),16);return rgb((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)};
const dashArr=o=>o.dash==='dash'?[o.sw*3,o.sw*2]:o.dash==='dot'?[o.sw,o.sw*1.5]:null;
const setState=t=>$('state').textContent=t;
const mark=()=>{dirty=true;setState('Unsaved changes')};

// ---------- toolbar ----------
$('undo').innerHTML=svg('undo');$('redo').innerHTML=svg('redo');$('dl').querySelector('.ic-dl').outerHTML=svg('dl');
$('tools').innerHTML=TOOLS.map(t=>t==='|'?'<span class="tsep"></span>':`<button data-m="${t[0]}" data-n="${t[1]}" aria-label="${t[1]}">${svg(t[0])}</button>`).join('')+'<span class="lbl" id="hint"></span>';
$('tools').onclick=e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m==='shape'?shape:b.dataset.m)};
function setMode(m){mode=m;if(SHAPES.includes(m))shape=m;document.body.className='ed m-'+m;
 document.querySelectorAll('#tools button').forEach(b=>b.classList.toggle('on',b.dataset.m===m||(b.dataset.m==='shape'&&SHAPES.includes(m))));
 $('hint').textContent=HINT[m]||'';if(m!=='select'&&m!=='edittext')select(null,true);panel()}

// ---------- right panel ----------
const swRow=(k,val,list,none)=>`<div class="sw">${none?`<button class="c none ${val==null?'on':''}" data-k="${k}" data-v="" title="None"></button>`:''}${list.map(c=>`<button class="c ${val&&val.toLowerCase()===c?'on':''}" style="--v:${c}" data-k="${k}" data-v="${c}" title="${c}"></button>`).join('')}<label class="pick" title="Custom colour">${svg('pick')}<input type="color" data-k="${k}" value="${val||'#0f172a'}"></label></div>`;
const opSel=v=>`<select class="sel op" data-k="op">${[100,75,50,25].map(p=>`<option value="${p/100}" ${Math.round(v*100)===p?'selected':''}>${p}%</option>`).join('')}</select>`;
const swSel=v=>`<select class="sel" data-k="sw">${[1,2,3,4,6,8,12].map(n=>`<option value="${n}" ${+v===n?'selected':''}>${n}pt</option>`).join('')}</select>`;
const dashSel=v=>`<select class="sel" data-k="dash">${[['solid','Solid ───'],['dash','Dashed – – –'],['dot','Dotted · · ·']].map(([k,n])=>`<option value="${k}" ${v===k?'selected':''}>${n}</option>`).join('')}</select>`;
function panel(){const p=$('panel'),s=sel||D,t=sel?sel.t:mode;let h='';
 if(!pages.length){p.innerHTML=`<div class="card tips"><div class="ph2"><span class="pi">${svg('edittext')}</span>PDF Editor</div>Open a PDF, then:<br>• <b>Edit text</b> — click any text to change it<br>• <b>Add text, draw, highlight, shapes</b><br>• <b>Image & signature</b><br>• Move, resize, delete anything<br><br>Shortcuts: <kbd>Ctrl Z</kbd> undo · <kbd>Del</kbd> delete</div>`;return}
 if(t==='text'||t==='edittext'){h+=`<div class="card"><div class="ph2"><span class="pi">${svg('text')}</span>Text style</div>
  <div class="row"><select class="sel" data-k="font">${['Helvetica','Times','Courier'].map(f=>`<option ${s.font===f?'selected':''}>${f}</option>`).join('')}</select>
  <select class="sel" data-k="size" style="width:96px;flex:none">${[...new Set([8,9,10,11,12,14,16,18,20,24,28,32,36,48,64,72,Math.round(s.size)])].sort((a,b)=>a-b).map(n=>`<option value="${n}" ${Math.round(s.size)===n?'selected':''}>${n}pt</option>`).join('')}</select></div>
  <div class="lab"></div><div class="seg" style="width:max-content"><button data-t="bold" class="${s.bold?'on':''}"><b>B</b></button><button data-t="italic" class="${s.italic?'on':''}"><i>I</i></button><button data-t="u" class="${s.u?'on':''}"><u>U</u></button></div>
  <div class="lab">Colour</div>${swRow('color',s.color,COLORS)}
  <div class="lab">Opacity</div>${opSel(s.op)}</div>`}
 if(SHAPES.includes(t)){const box=t==='rect'||t==='ellipse';
  h+=`<div class="card"><div class="ph2"><span class="pi">${svg('shape')}</span>Shape</div><div class="shapes">${SHAPES.map(k=>`<button data-shape="${k}" class="${t===k?'on':''}" title="${k}">${svg(k)}</button>`).join('')}</div>
  ${box?`<div class="lab">Fill</div><div class="row">${swRow('fc',s.fc,COLORS,1)}</div>`:''}
  <div class="lab">${box?'Border':'Stroke'}</div><div class="row">${swSel(s.sw)}${dashSel(s.dash)}</div>
  <div class="lab"></div>${swRow('color',s.color,COLORS,0)}
  <div class="lab">Opacity</div>${opSel(s.op)}</div>`}
 if(t==='pen'){h+=`<div class="card"><div class="ph2"><span class="pi">${svg('pen')}</span>Pen</div><div class="lab">Thickness</div>${swSel(s.sw)}<div class="lab">Colour</div>${swRow('color',s.color,COLORS)}<div class="lab">Opacity</div>${opSel(s.op)}</div>`}
 if(t==='highlight'){const c=sel?sel.color:D.hl,w=sel?sel.sw:D.hw;h+=`<div class="card"><div class="ph2"><span class="pi">${svg('highlight')}</span>Highlighter</div><div class="lab">Colour</div>${swRow('hl',c,HL)}<div class="lab">Thickness</div><select class="sel" data-k="hw">${[8,12,14,18,24].map(n=>`<option value="${n}" ${+w===n?'selected':''}>${n}pt</option>`).join('')}</select></div>`}
 if(t==='image'||t==='sign'){h+=`<div class="card"><div class="ph2"><span class="pi">${svg(t)}</span>${t==='sign'?'Signature':'Image'}</div><p class="tips">${sel?'Drag to move, use the corner handle to resize.':HINT[t]}</p>${sel?`<div class="lab">Opacity</div>${opSel(s.op)}`:`<button class="pri" style="width:100%;justify-content:center" id="pnew">${t==='sign'?'Create signature':'Choose image'}</button>`}</div>`}
 if(t==='whiteout'){h+=`<div class="card"><div class="ph2"><span class="pi">${svg('whiteout')}</span>Whiteout</div><p class="tips">${HINT.whiteout}. Use it to hide text or marks, then add new text on top.</p></div>`}
 if(t==='select'&&!sel){h+=`<div class="card tips"><div class="ph2"><span class="pi">${svg('select')}</span>Select</div>Click any item you added to change its style, move it or resize it.<br><br>To change the PDF's own text, use <b>Edit text</b>.</div>`}
 if(sel)h+=`<button class="delbtn" id="pdel">${svg('trash')} Delete</button>`;
 p.innerHTML=h;if($('pdel'))$('pdel').onclick=()=>remove(sel);if($('pnew'))$('pnew').onclick=()=>{const pg=pages[curPage()];pending={pg,p:{x:pg.w*.3,y:pg.h*.4}};mode==='sign'?openSig():$('imgf').click()}}
$('panel').addEventListener('click',e=>{const c=e.target.closest('.c');if(c){setProp(c.dataset.k,c.dataset.v||null);return}
 const t=e.target.closest('[data-t]');if(t){setProp(t.dataset.t,!(sel?sel[t.dataset.t]:D[t.dataset.t]));return}
 const sh=e.target.closest('[data-shape]');if(sh){if(sel&&SHAPES.includes(sel.t)&&(['rect','ellipse'].includes(sel.t)===['rect','ellipse'].includes(sh.dataset.shape))){push();sel.t=sh.dataset.shape;const e2=sel.el;e2.className='ob ob-'+sel.t+' on';draw(sel);panel()}else setMode(sh.dataset.shape)}});
$('panel').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;const v=e.target.value;setProp(k,['size','sw','op','hw'].includes(k)?+v:v)});
$('panel').addEventListener('input',e=>{if(e.target.type==='color')setProp(e.target.dataset.k,e.target.value,true)});
function setProp(k,v,live){if(k==='hl'){D.hl=v;if(sel&&sel.t==='highlight'){push();sel.color=v;draw(sel)}panel();return}
 if(k==='hw'){D.hw=v;if(sel&&sel.t==='highlight'){push();sel.sw=v;draw(sel)}return}
 D[k]=v;if(sel){const ok={text:['color','font','size','bold','italic','u','op'],rect:['color','fc','sw','dash','op'],ellipse:['color','fc','sw','dash','op'],line:['color','sw','dash','op'],arrow:['color','sw','dash','op'],pen:['color','sw','op'],image:['op'],whiteout:[],highlight:[]}[sel.t]||[];
  if(ok.includes(k)){if(!live||!setProp._l){push()}setProp._l=live;sel[k]=v;draw(sel);mark()}}
 if(!live)panel()}

// ---------- open ----------
$('file').onchange=e=>e.target.files[0]&&openPdf(e.target.files[0]);
$('pages').ondragover=e=>e.preventDefault();$('pages').ondrop=e=>{e.preventDefault();const f=[...e.dataTransfer.files].find(f=>/pdf/i.test(f.type)||/\.pdf$/i.test(f.name));if(f)openPdf(f)};
async function openPdf(f){
 try{fname=f.name;bytes=new Uint8Array(await f.arrayBuffer());doc=await pdfjsLib.getDocument({data:bytes.slice()}).promise}
 catch(e){toast(e.name==='PasswordException'?'This PDF is password protected — unlock it first.':'Could not open this PDF.');return}
 $('fname').textContent=f.name.replace(/\.pdf$/i,'');setState(`${doc.numPages} page${doc.numPages>1?'s':''} · no changes yet`);pages=[];objs=[];hist=[];fut=[];sel=null;dirty=false;syncUR();$('pages').innerHTML='';$('thumbs').innerHTML='';
 for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),vp=p.getViewport({scale:1}),el=document.createElement('div');el.className='pg';el.dataset.i=i-1;
  el.innerHTML='<canvas class="r"></canvas><div class="ol"></div><div class="tl"></div>';$('pages').append(el);
  const pg={i:i-1,p,w:vp.width,h:vp.height,el,items:[]};pages.push(pg);
  const tc=await p.getTextContent(),st=tc.styles;try{await p.getOperatorList()}catch(_){}
  const fo=n=>{try{return p.commonObjs.has(n)?p.commonObjs.get(n):null}catch(_){return null}};
  pg.items=tc.items.filter(t=>t.str.trim()&&Math.abs(t.transform[1])<.01).map(t=>{const m=pdfjsLib.Util.transform(vp.transform,t.transform),fh=Math.hypot(m[2],m[3]),f=fo(t.fontName)||{};
   const ff=[(st[t.fontName]||{}).fontFamily||'',f.name||'',f.bold||f.black?'bold':'',f.italic?'italic':'',f.isSerifFont?'serif':'',f.isMonospace?'mono':''].join(' ');
   return {x:m[4],y:m[5]-fh*.88,w:t.width,h:fh*1.12,s:fh,str:t.str,ff}});
  const th=document.createElement('a');th.className='th';th.innerHTML=`<canvas></canvas>${i}`;th.onclick=()=>el.scrollIntoView({behavior:'smooth'});$('thumbs').append(th);
  const tv=p.getViewport({scale:180/vp.width}),tcv=th.querySelector('canvas');tcv.width=tv.width;tcv.height=tv.height;p.render({canvasContext:tcv.getContext('2d'),viewport:tv})}
 fit();$('zoom').hidden=false;$('dl').disabled=false;setMode('edittext');toast('PDF loaded — click any text to edit it, or pick a tool above.')}
function fit(){const avail=$('pages').clientWidth-48;Z=Math.min(1.6,Math.max(.35,avail/Math.max(...pages.map(p=>p.w))));layout()}
async function layout(){$('zl').textContent=Math.round(Z*100)+'%';const dpr=Math.min(2,window.devicePixelRatio||1);
 for(const pg of pages){pg.el.style.width=pg.w*Z+'px';pg.el.style.height=pg.h*Z+'px';
  pg.el.querySelector('.tl').innerHTML=pg.items.map((t,k)=>`<span class="tli" data-k="${k}" style="left:${t.x*Z}px;top:${t.y*Z}px;width:${t.w*Z}px;height:${t.h*Z}px" title="Click to edit"></span>`).join('')}
 objs.forEach(draw);
 for(const pg of pages){const c=pg.el.querySelector('canvas.r'),vp=pg.p.getViewport({scale:Z*dpr});c.width=vp.width;c.height=vp.height;if(pg.task)pg.task.cancel();pg.task=pg.p.render({canvasContext:c.getContext('2d'),viewport:vp});pg.task.promise.catch(()=>{})}}
$('zin').onclick=()=>{Z=Math.min(3,Z*1.2);layout()};$('zout').onclick=()=>{Z=Math.max(.3,Z/1.2);layout()};$('zfit').onclick=fit;
const curPage=()=>{const r=$('pages').getBoundingClientRect();let best=0,bd=1e9;pages.forEach((p,i)=>{const d=Math.abs(p.el.getBoundingClientRect().top-r.top);if(d<bd){bd=d;best=i}});return best};
$('pages').addEventListener('scroll',()=>{const i=curPage();document.querySelectorAll('#thumbs .th').forEach((t,k)=>t.classList.toggle('on',k===i))},{passive:true});

// ---------- objects ----------
const strip=o=>{const {el,...r}=o;return r};
function push(){hist.push(JSON.stringify(objs.map(strip)));if(hist.length>80)hist.shift();fut=[];syncUR();mark()}
function syncUR(){$('undo').disabled=!hist.length;$('redo').disabled=!fut.length}
function restore(s){objs.forEach(o=>o.el&&o.el.remove());objs=JSON.parse(s);objs.forEach(mk);sel=null;panel();mark()}
$('undo').onclick=()=>{if(!hist.length)return;fut.push(JSON.stringify(objs.map(strip)));restore(hist.pop());syncUR()};
$('redo').onclick=()=>{if(!fut.length)return;hist.push(JSON.stringify(objs.map(strip)));restore(fut.pop());syncUR()};
function add(o){o.id=nid++;o.op??=D.op;objs.push(o);mk(o);mark();return o}
function remove(o){if(!o)return;push();o.el.remove();objs=objs.filter(x=>x!==o);if(sel===o)sel=null;panel()}
function mk(o){nid=Math.max(nid,o.id+1);const e=document.createElement('div');e.className='ob ob-'+o.t;e.dataset.id=o.id;o.el=e;
 if(o.t==='text'){const t=document.createElement('div');t.className='tx';t.contentEditable='true';t.spellcheck=false;t.textContent=o.text;
  t.addEventListener('focus',()=>{t._before=JSON.stringify(objs.map(strip))});
  t.addEventListener('input',()=>{o.text=t.innerText.replace(/\n$/,'');measure(o);mark()});
  t.addEventListener('blur',()=>{if(t._before&&t._before!==JSON.stringify(objs.map(strip))){hist.push(t._before);fut=[];syncUR()}if(!o.text.trim()&&objs.includes(o)){e.remove();objs=objs.filter(x=>x!==o);if(sel===o){sel=null;panel()}}});
  e.append(t)}
 else if(o.t==='image')e.innerHTML=`<img src="${o.src}" alt="">`;else e.innerHTML='<svg></svg>';
 e.insertAdjacentHTML('beforeend','<i class="rz" title="Resize"></i><b class="del" title="Delete">×</b>');
 pages[o.pg].el.querySelector('.ol').append(e);draw(o)}
function bbox(o){if(o.pts){const xs=o.pts.map(p=>p[0]),ys=o.pts.map(p=>p[1]),pad=o.sw/2+(o.t==='arrow'?o.sw*3:1);return {x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,w:Math.max(...xs)-Math.min(...xs)+pad*2,h:Math.max(...ys)-Math.min(...ys)+pad*2}}return {x:o.x,y:o.y,w:o.w||0,h:o.h||0}}
function measure(o){const t=o.el.querySelector('.tx');o.w=t.offsetWidth/Z;o.h=t.offsetHeight/Z}
function arrowHead(o){const [a,b]=o.pts,ang=Math.atan2(b[1]-a[1],b[0]-a[0]),L=Math.max(8,o.sw*3.5);return [[b[0]-L*Math.cos(ang-.45),b[1]-L*Math.sin(ang-.45)],[b[0]-L*Math.cos(ang+.45),b[1]-L*Math.sin(ang+.45)]]}
const pathD=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
function draw(o){const e=o.el;if(!e)return;e.style.opacity=o.op;
 if(o.t==='text'){const t=e.querySelector('.tx');Object.assign(t.style,{fontSize:o.size*Z+'px',color:o.color,fontFamily:CSSF[o.font],fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textDecoration:o.u?'underline':'none'});e.style.left=o.x*Z+'px';e.style.top=o.y*Z+'px';measure(o);return}
 const b=bbox(o);Object.assign(e.style,{left:b.x*Z+'px',top:b.y*Z+'px',width:b.w*Z+'px',height:b.h*Z+'px'});if(o.t==='image')return;
 const s=e.querySelector('svg');s.setAttribute('viewBox',`${b.x} ${b.y} ${b.w} ${b.h}`);s.setAttribute('preserveAspectRatio','none');
 const da=dashArr(o),dash=da?`stroke-dasharray="${da.join(' ')}"`:'',fill=o.fc||'none';let h='';
 if(o.t==='rect')h=`<rect x="${o.x+o.sw/2}" y="${o.y+o.sw/2}" width="${Math.max(0,o.w-o.sw)}" height="${Math.max(0,o.h-o.sw)}" fill="${fill}" stroke="${o.color}" stroke-width="${o.sw}" ${dash}/>`;
 else if(o.t==='whiteout')h=`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#fff"/>`;
 else if(o.t==='ellipse')h=`<ellipse cx="${o.x+o.w/2}" cy="${o.y+o.h/2}" rx="${Math.max(0,o.w/2-o.sw/2)}" ry="${Math.max(0,o.h/2-o.sw/2)}" fill="${fill}" stroke="${o.color}" stroke-width="${o.sw}" ${dash}/>`;
 else if(o.t==='line'||o.t==='arrow'){const [a,c]=o.pts;h=`<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${o.color}" stroke-width="${o.sw}" stroke-linecap="round" ${dash}/>`;if(o.t==='arrow'){const [p,q]=arrowHead(o);h+=`<path d="M${p}L${c}L${q}" fill="none" stroke="${o.color}" stroke-width="${o.sw}" stroke-linecap="round" stroke-linejoin="round"/>`}}
 else if(o.t==='pen'||o.t==='highlight')h=`<path d="${pathD(o.pts)}" fill="none" stroke="${o.color}" stroke-width="${o.sw}" stroke-linecap="${o.t==='highlight'?'butt':'round'}" stroke-linejoin="round" ${o.t==='highlight'?'style="mix-blend-mode:multiply" opacity=".4"':''}/>`;
 s.innerHTML=h}
function select(o,quiet){if(sel&&sel.el)sel.el.classList.remove('on');sel=o;if(o&&o.el)o.el.classList.add('on');if(!quiet)panel()}

// ---------- pointer interactions ----------
const toPt=(e,el)=>{const r=el.getBoundingClientRect();return {x:(e.clientX-r.left)/Z,y:(e.clientY-r.top)/Z}};
function drag(onMove,onUp){const mv=e=>{e.preventDefault();onMove(e)},up=e=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);onUp&&onUp(e)};window.addEventListener('pointermove',mv,{passive:false});window.addEventListener('pointerup',up)}
$('pages').addEventListener('pointerdown',e=>{
 const pe=e.target.closest('.pg');if(!pe)return;const pg=pages[+pe.dataset.i],p0=toPt(e,pe),oe=e.target.closest('.ob'),o=oe&&objs.find(x=>x.id==oe.dataset.id);
 if(e.target.classList.contains('del')){e.preventDefault();remove(o);return}
 if(e.target.classList.contains('rz')){e.preventDefault();e.stopPropagation();push();const b0=bbox(o),snap=JSON.parse(JSON.stringify(strip(o)));
  drag(ev=>{const p=toPt(ev,pe),k=Math.max(.05,(p.x-b0.x)/b0.w),kh=Math.max(.05,(p.y-b0.y)/b0.h);
   if(o.t==='text'){o.size=Math.max(4,snap.size*k)}else if(o.pts){o.pts=snap.pts.map(([x,y])=>[b0.x+(x-b0.x)*k,b0.y+(y-b0.y)*kh])}else if(o.t==='image'){o.w=snap.w*k;o.h=snap.h*k}else{o.w=Math.max(4,p.x-o.x);o.h=Math.max(4,p.y-o.y)}draw(o)},()=>panel());return}
 if(o){const tx=e.target.closest('.tx');if(tx&&sel===o)return;select(o);if(tx&&e.detail>1)return;e.preventDefault();push();const snap=JSON.parse(JSON.stringify(strip(o)));let moved=false;
  drag(ev=>{const p=toPt(ev,pe),dx=p.x-p0.x,dy=p.y-p0.y;if(Math.abs(dx)+Math.abs(dy)>.5)moved=true;if(o.pts)o.pts=snap.pts.map(([x,y])=>[x+dx,y+dy]);else{o.x=snap.x+dx;o.y=snap.y+dy}draw(o)},()=>{if(!moved){hist.pop();syncUR();if(tx){tx.focus();placeCaret(tx)}}});return}
 if(mode==='edittext'){const s=e.target.closest('.tli');if(s){e.preventDefault();editExisting(pg,pg.items[+s.dataset.k])}else select(null);return}
 if(mode==='select'){select(null);if(document.activeElement)document.activeElement.blur();return}
 e.preventDefault();
 if(mode==='text'){push();const t=add({t:'text',pg:pg.i,x:p0.x,y:p0.y-D.size*.6,text:'Type here',size:D.size,color:D.color,font:D.font,bold:D.bold,italic:D.italic,u:D.u});setMode('select');select(t);const tx=t.el.querySelector('.tx');tx.focus();document.execCommand('selectAll',false,null);return}
 if(mode==='image'){pending={pg,p:p0};$('imgf').click();return}
 if(mode==='sign'){pending={pg,p:p0};openSig();return}
 push();let o2;
 if(['rect','ellipse','whiteout'].includes(mode))o2=add({t:mode,pg:pg.i,x:p0.x,y:p0.y,w:1,h:1,color:D.color,fc:D.fc,sw:D.sw,dash:D.dash});
 else if(mode==='line'||mode==='arrow')o2=add({t:mode,pg:pg.i,pts:[[p0.x,p0.y],[p0.x,p0.y]],color:D.color,sw:D.sw,dash:D.dash});
 else if(mode==='pen')o2=add({t:'pen',pg:pg.i,pts:[[p0.x,p0.y]],color:D.color,sw:D.sw});
 else if(mode==='highlight')o2=add({t:'highlight',pg:pg.i,pts:[[p0.x,p0.y]],color:D.hl,sw:D.hw,op:1});
 if(!o2)return;
 drag(ev=>{const p=toPt(ev,pe);if(o2.pts){if(o2.t==='line'||o2.t==='arrow')o2.pts[1]=[p.x,p.y];else{const l=o2.pts.at(-1);if(Math.hypot(p.x-l[0],p.y-l[1])>1)o2.pts.push([p.x,p.y])}}
  else{o2.x=Math.min(p.x,p0.x);o2.y=Math.min(p.y,p0.y);o2.w=Math.abs(p.x-p0.x);o2.h=Math.abs(p.y-p0.y)}draw(o2)},
  ()=>{if((o2.pts&&o2.pts.length<2)||(!o2.pts&&(o2.w<3||o2.h<3))||(o2.t==='line'||o2.t==='arrow')&&Math.hypot(o2.pts[1][0]-o2.pts[0][0],o2.pts[1][1]-o2.pts[0][1])<3){o2.el.remove();objs=objs.filter(x=>x!==o2);hist.pop();syncUR();return}select(o2)});
});
function placeCaret(el){const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}
function editExisting(pg,it){push();const pad=Math.max(1,it.s*.08);
 add({t:'whiteout',pg:pg.i,x:it.x-pad,y:it.y-pad,w:it.w+pad*2,h:it.h+pad*2,op:1});
 const ff=it.ff.toLowerCase(),font=/mono|courier/.test(ff)?'Courier':/times|roman|georgia|garamond|cambria|(^|[^-])serif/.test(ff)&&!/sans|helvetica|arial/.test(ff)?'Times':'Helvetica';
 const t=add({t:'text',pg:pg.i,x:it.x,y:it.y+it.h/2-it.s*.6,text:it.str,size:Math.round(it.s*10)/10,color:'#000000',font,bold:/bold|black|heavy|semibold/.test(ff),italic:/italic|oblique/.test(ff),u:false,op:1});
 select(t);const tx=t.el.querySelector('.tx');tx.focus();placeCaret(tx)}
document.addEventListener('keydown',e=>{const ed=document.activeElement&&(document.activeElement.classList.contains('tx')||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!ed){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click()}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!ed){e.preventDefault();$('redo').click()}
 else if((e.key==='Delete'||e.key==='Backspace')&&sel&&!ed){e.preventDefault();remove(sel)}
 else if(e.key==='Escape'){if(!$('sigm').hidden){$('sigx').click();return}if(ed)document.activeElement.blur();select(null)}});

// ---------- image ----------
$('imgf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!pending)return;placeImage(await readURL(f),200)};
const readURL=f=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});
function placeImage(src,maxW,isSig){const im=new Image();im.onload=()=>{const {pg,p}=pending,w=Math.min(maxW,im.width,pg.w*.8),h=w*im.height/im.width;push();const o=add({t:'image',pg:pg.i,x:Math.max(0,Math.min(p.x,pg.w-w)),y:Math.max(0,Math.min(p.y,pg.h-h)),w,h,src,sig:!!isSig});setMode('select');select(o);pending=null};im.src=src}

// ---------- signature modal ----------
const sc=$('sigc'),sx=sc.getContext('2d');let tab='draw',strokes=[],sigColor='#0f172a',sigImg=null;
const TI={draw:['draw','Draw'],image:['image','Image'],type:['type','Type']};
document.querySelectorAll('#sigtabs button').forEach(b=>b.innerHTML=svg(TI[b.dataset.t][0])+TI[b.dataset.t][1]);
$('sigundo').innerHTML=svg('undo');$('sigclr').innerHTML=svg('trash');
function sigSw(){$('sigsw').innerHTML=['#0f172a','#ffffff','#ef4444','#0ea5e9','#4353ff','#22c55e'].map(c=>`<button class="c ${c===sigColor?'on':''}" style="--v:${c}" data-c="${c}"></button>`).join('')+`<label class="pick">${svg('pick')}<input type="color" value="${sigColor}"></label>`}
$('sigsw').onclick=e=>{const c=e.target.closest('.c');if(c){sigColor=c.dataset.c;sigSw();redrawSig()}};$('sigsw').oninput=e=>{sigColor=e.target.value;redrawSig()};
function setTab(t){tab=t;document.querySelectorAll('#sigtabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));document.querySelectorAll('.sigarea>[data-p]').forEach(d=>d.hidden=d.dataset.p!==t);
 $('sigw').hidden=t!=='draw';$('sigfont').hidden=t!=='type';$('sigsw').style.visibility=t==='image'?'hidden':'visible';if(t==='type')setTimeout(()=>$('sigt').focus(),50)}
$('sigtabs').onclick=e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.t)};
function openSig(){strokes=[];sigImg=null;$('sigt').value='';$('sigimg').hidden=true;$('sigimgt').hidden=false;$('sigchg').hidden=true;sigSw();redrawSig();setTab('draw');$('sigm').hidden=false}
function redrawSig(){sx.clearRect(0,0,sc.width,sc.height);for(const s of strokes){sx.strokeStyle=sigColor;sx.lineWidth=s.w*2;sx.lineCap='round';sx.lineJoin='round';sx.beginPath();s.p.forEach((q,i)=>i?sx.lineTo(...q):sx.moveTo(...q));sx.stroke()}
 $('sigph').hidden=strokes.length>0;$('sigt').style.color=sigColor;$('sigt').style.fontFamily=`'${$('sigfont').value}',cursive`}
(()=>{let cur=null;const pt=e=>{const r=sc.getBoundingClientRect();return [(e.clientX-r.left)*sc.width/r.width,(e.clientY-r.top)*sc.height/r.height]};
 sc.onpointerdown=e=>{sc.setPointerCapture(e.pointerId);cur={w:+$('sigw').value,p:[pt(e)]};strokes.push(cur);redrawSig()};
 sc.onpointermove=e=>{if(cur){cur.p.push(pt(e));redrawSig()}};sc.onpointerup=()=>cur=null})();
$('sigundo').onclick=()=>{strokes.pop();redrawSig()};$('sigclr').onclick=()=>{strokes=[];redrawSig()};$('sigfont').onchange=redrawSig;
$('sigf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;sigImg=await readURL(f);$('sigimg').src=sigImg;$('sigimg').hidden=false;$('sigimgt').hidden=true;$('sigchg').hidden=false};
$('sigx').onclick=()=>{$('sigm').hidden=true;pending=null};
$('sigok').onclick=async()=>{let url;
 if(tab==='image'){if(!sigImg){toast('Upload an image first');return}url=sigImg}
 else{const c=document.createElement('canvas'),x=c.getContext('2d');
  if(tab==='draw'){if(!strokes.length){toast('Draw your signature first');return}const d=sx.getImageData(0,0,sc.width,sc.height).data;let x0=sc.width,y0=sc.height,x1=0,y1=0;
   for(let y=0;y<sc.height;y++)for(let xx=0;xx<sc.width;xx++)if(d[(y*sc.width+xx)*4+3]){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y}
   c.width=x1-x0+8;c.height=y1-y0+8;x.drawImage(sc,x0-4,y0-4,c.width,c.height,0,0,c.width,c.height)}
  else{const t=$('sigt').value.trim();if(!t){toast('Type your name first');return}const fam=$('sigfont').value,f=`120px '${fam}'`;try{await document.fonts.load(f,t)}catch(_){}
   x.font=f;const w=x.measureText(t).width;c.width=Math.ceil(w)+40;c.height=180;x.font=f;x.fillStyle=sigColor;x.textBaseline='middle';x.fillText(t,20,95)}
  url=c.toDataURL('image/png')}
 $('sigm').hidden=true;placeImage(url,170,true)};

// ---------- export ----------
const FN={Helvetica:['Helvetica','HelveticaBold','HelveticaOblique','HelveticaBoldOblique'],Times:['TimesRoman','TimesRomanBold','TimesRomanItalic','TimesRomanBoldItalic'],Courier:['Courier','CourierBold','CourierOblique','CourierBoldOblique']};
async function dataBytes(src){const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())}
function textPng(o){const k=3,lines=o.text.split('\n'),c=document.createElement('canvas'),x=c.getContext('2d'),f=`${o.italic?'italic ':''}${o.bold?'700':'400'} ${o.size*k}px ${CSSF[o.font]}`;x.font=f;
 const ws=lines.map(l=>x.measureText(l).width);c.width=Math.ceil(Math.max(1,...ws))+4;c.height=Math.ceil(lines.length*o.size*1.2*k);x.font=f;x.fillStyle=o.color;x.textBaseline='alphabetic';
 lines.forEach((l,i)=>{const y=(i*1.2+.95)*o.size*k;x.fillText(l,0,y);if(o.u)x.fillRect(0,y+o.size*k*.1,ws[i],Math.max(1,o.size*k*.06))});return {url:c.toDataURL('image/png'),w:c.width/k,h:c.height/k}}
$('dl').onclick=async()=>{if(document.activeElement)document.activeElement.blur();const btn=$('dl');btn.disabled=true;setState('Saving…');
 try{const out=await PDFDocument.load(bytes,{ignoreEncryption:true}),fonts={};let rot=false;
  for(const o of objs){const page=out.getPage(o.pg),cb=page.getCropBox(),X=v=>cb.x+v,Y=v=>cb.y+cb.height-v;if(page.getRotation().angle%360)rot=true;
   const da=dashArr(o)||undefined;
   if(o.t==='text'){const n=FN[o.font][(o.bold?1:0)+(o.italic?2:0)],font=fonts[n]||(fonts[n]=await out.embedFont(StandardFonts[n])),lines=o.text.split('\n');
    let ok=true;try{lines.forEach(l=>font.encodeText(l))}catch(_){ok=false}
    if(ok)lines.forEach((l,i)=>{const by=Y(o.y+(i*1.2+.95)*o.size);page.drawText(l,{x:X(o.x),y:by,size:o.size,font,color:hex(o.color),opacity:o.op});
     if(o.u&&l)page.drawLine({start:{x:X(o.x),y:by-o.size*.12},end:{x:X(o.x)+font.widthOfTextAtSize(l,o.size),y:by-o.size*.12},thickness:Math.max(.5,o.size*.06),color:hex(o.color),opacity:o.op})});
    else{const t=textPng(o),img=await out.embedPng(await dataBytes(t.url));page.drawImage(img,{x:X(o.x),y:Y(o.y+t.h),width:t.w,height:t.h,opacity:o.op})}}
   else if(o.t==='image'){const img=await out.embedPng(await dataBytes(o.src));page.drawImage(img,{x:X(o.x),y:Y(o.y+o.h),width:o.w,height:o.h,opacity:o.op})}
   else if(o.t==='whiteout')page.drawRectangle({x:X(o.x),y:Y(o.y+o.h),width:o.w,height:o.h,color:rgb(1,1,1)});
   else if(o.t==='rect')page.drawRectangle({x:X(o.x+o.sw/2),y:Y(o.y+o.h-o.sw/2),width:Math.max(0,o.w-o.sw),height:Math.max(0,o.h-o.sw),borderColor:hex(o.color),borderWidth:o.sw,borderOpacity:o.op,borderDashArray:da,...(o.fc?{color:hex(o.fc),opacity:o.op}:{})});
   else if(o.t==='ellipse')page.drawEllipse({x:X(o.x+o.w/2),y:Y(o.y+o.h/2),xScale:Math.max(0,o.w/2-o.sw/2),yScale:Math.max(0,o.h/2-o.sw/2),borderColor:hex(o.color),borderWidth:o.sw,borderOpacity:o.op,borderDashArray:da,...(o.fc?{color:hex(o.fc),opacity:o.op}:{})});
   else if(o.t==='line'||o.t==='arrow'){const L=(a,b,d)=>page.drawLine({start:{x:X(a[0]),y:Y(a[1])},end:{x:X(b[0]),y:Y(b[1])},thickness:o.sw,color:hex(o.color),opacity:o.op,lineCap:LineCapStyle.Round,dashArray:d});L(o.pts[0],o.pts[1],da);if(o.t==='arrow'){const [p,q]=arrowHead(o);L(p,o.pts[1]);L(q,o.pts[1])}}
   else if(o.t==='pen'||o.t==='highlight')page.drawSvgPath(pathD(o.pts),{x:cb.x,y:cb.y+cb.height,borderColor:hex(o.color),borderWidth:o.sw,borderOpacity:o.t==='highlight'?.4:o.op,borderLineCap:o.t==='highlight'?LineCapStyle.Butt:LineCapStyle.Round,...(o.t==='highlight'?{blendMode:BlendMode.Multiply}:{})});
  }
  const b=await out.save(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([b],{type:'application/pdf'}));a.download=fname.replace(/\.pdf$/i,'')+'-edited.pdf';document.body.append(a);a.click();a.remove();
  dirty=false;setState('Downloaded just now');toast(rot?'Saved! Note: some pages are rotated — check item positions.':'✅ Saved! Your edited PDF is downloading.')}
 catch(e){console.error(e);setState('Unsaved changes');toast('Could not save: '+e.message)}
 btn.disabled=false};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
setMode('select');
