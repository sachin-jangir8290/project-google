const {PDFDocument,degrees,rgb,StandardFonts}=PDFLib;
const $=id=>document.getElementById(id);
const range=(s,n)=>{const out=new Set();s.split(',').forEach(p=>{const [a,b]=p.split('-').map(x=>parseInt(x));if(!a)return;for(let i=a;i<=(b||a);i++)if(i>=1&&i<=n)out.add(i-1)});return [...out].sort((x,y)=>x-y)};
const load=async f=>PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});
const save=(bytes,name,type='application/pdf')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type}));a.download=name;a.click()};
const val=id=>$(id).value;

const TOOLS={
 merge:{ic:'🔗',name:'Merge PDF',desc:'Combine multiple PDFs into one, in the order you want.',multi:1,accept:'.pdf',
  run:async fs=>{const out=await PDFDocument.create();for(const f of fs){const d=await load(f);(await out.copyPages(d,d.getPageIndices())).forEach(p=>out.addPage(p))}save(await out.save(),'merged.pdf')}},
 split:{ic:'✂️',name:'Split PDF',desc:'Split every page into its own PDF file.',accept:'.pdf',
  run:async([f])=>{const d=await load(f);for(const i of d.getPageIndices()){const o=await PDFDocument.create();o.addPage((await o.copyPages(d,[i]))[0]);save(await o.save(),`page-${i+1}.pdf`)}}},
 extract:{ic:'📑',name:'Extract Pages',desc:'Pick pages (e.g. 1-3,5) into a new PDF.',accept:'.pdf',opts:'Pages: <input id="pg" placeholder="1-3,5">',
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create();(await o.copyPages(d,range(val('pg'),d.getPageCount()))).forEach(p=>o.addPage(p));save(await o.save(),'extracted.pdf')}},
 remove:{ic:'🗑️',name:'Remove Pages',desc:'Delete the pages you do not need.',accept:'.pdf',opts:'Pages to delete: <input id="pg" placeholder="2,4-6">',
  run:async([f])=>{const d=await load(f);range(val('pg'),d.getPageCount()).reverse().forEach(i=>d.removePage(i));save(await d.save(),'removed.pdf')}},
 rotate:{ic:'🔄',name:'Rotate PDF',desc:'Rotate all pages of your PDF.',accept:'.pdf',opts:'<select id="deg"><option>90</option><option>180</option><option>270</option></select>°',
  run:async([f])=>{const d=await load(f);d.getPages().forEach(p=>p.setRotation(degrees((p.getRotation().angle+ +val('deg'))%360)));save(await d.save(),'rotated.pdf')}},
 jpg2pdf:{ic:'🖼️',name:'JPG/PNG to PDF',desc:'Convert images into a single PDF.',multi:1,accept:'image/jpeg,image/png',
  run:async fs=>{const o=await PDFDocument.create();for(const f of fs){const b=await f.arrayBuffer();const img=f.type==='image/png'?await o.embedPng(b):await o.embedJpg(b);o.addPage([img.width,img.height]).drawImage(img,{x:0,y:0,width:img.width,height:img.height})}save(await o.save(),'images.pdf')}},
 numbers:{ic:'🔢',name:'Add Page Numbers',desc:'Stamp page numbers at the bottom.',accept:'.pdf',
  run:async([f])=>{const d=await load(f),fn=await d.embedFont(StandardFonts.Helvetica),ps=d.getPages();ps.forEach((p,i)=>{const t=`${i+1} / ${ps.length}`;p.drawText(t,{x:p.getWidth()/2-fn.widthOfTextAtSize(t,11)/2,y:20,size:11,font:fn})});save(await d.save(),'numbered.pdf')}},
 watermark:{ic:'💧',name:'Watermark',desc:'Add diagonal text over every page.',accept:'.pdf',opts:'Text: <input id="wm" value="CONFIDENTIAL">',
  run:async([f])=>{const d=await load(f),fn=await d.embedFont(StandardFonts.HelveticaBold);d.getPages().forEach(p=>p.drawText(val('wm'),{x:p.getWidth()/5,y:p.getHeight()/3,size:50,font:fn,color:rgb(.8,.1,.1),opacity:.25,rotate:degrees(45)}));save(await d.save(),'watermarked.pdf')}},
 reorder:{ic:'🔀',name:'Organize PDF',desc:'Re-order pages, e.g. 3,1,2.',accept:'.pdf',opts:'New order: <input id="pg" placeholder="3,1,2">',
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create(),n=d.getPageCount();const idx=val('pg').split(',').map(x=>parseInt(x)-1).filter(i=>i>=0&&i<n);(await o.copyPages(d,idx)).forEach(p=>o.addPage(p));save(await o.save(),'organized.pdf')}},
 meta:{ic:'🏷️',name:'Edit Metadata',desc:'Change title and author of a PDF.',accept:'.pdf',opts:'Title: <input id="ti"> Author: <input id="au">',
  run:async([f])=>{const d=await load(f);d.setTitle(val('ti'));d.setAuthor(val('au'));save(await d.save(),'edited.pdf')}},
 compress:{ic:'🗜️',name:'Optimize PDF',desc:'Re-save with object streams to reduce size.',accept:'.pdf',
  run:async([f])=>{const d=await load(f);const b=await d.save({useObjectStreams:true});$('msg').textContent=`${(f.size/1024).toFixed(0)} KB → ${(b.length/1024).toFixed(0)} KB`;save(b,'optimized.pdf')}},
};

let cur,files=[];
$('grid').innerHTML=Object.entries(TOOLS).map(([k,t])=>`<div class="card" onclick="openTool('${k}')"><div class="ic">${t.ic}</div><h3>${t.name}</h3><p>${t.desc}</p></div>`).join('');
function home(){$('home').hidden=false;$('tool').hidden=true;location.hash=''}
function openTool(k){cur=TOOLS[k];files=[];$('home').hidden=true;$('tool').hidden=false;$('t-title').textContent=cur.name;$('t-desc').textContent=cur.desc;
 $('file').accept=cur.accept;$('file').multiple=!!cur.multi;$('opts').innerHTML=cur.opts||'';$('msg').textContent='';render();location.hash=k}
function render(){$('list').innerHTML=files.map((f,i)=>`<li><span>${f.name}</span><span>${cur.multi?`<button onclick="mv(${i},-1)">▲</button><button onclick="mv(${i},1)">▼</button>`:''}<button onclick="files.splice(${i},1);render()">✕</button></span></li>`).join('');$('run').disabled=!files.length}
function mv(i,d){const j=i+d;if(j<0||j>=files.length)return;[files[i],files[j]]=[files[j],files[i]];render()}
function add(fl){fl=[...fl];files=cur.multi?files.concat(fl):fl.slice(0,1);render()}
$('file').onchange=e=>{add(e.target.files);e.target.value=''};
const dr=$('drop');dr.ondragover=e=>{e.preventDefault();dr.classList.add('over')};dr.ondragleave=()=>dr.classList.remove('over');
dr.ondrop=e=>{e.preventDefault();dr.classList.remove('over');add(e.dataTransfer.files)};
$('run').onclick=async()=>{$('run').disabled=true;$('msg').textContent='Processing…';try{await cur.run(files);if($('msg').textContent==='Processing…')$('msg').textContent='Done! Download started.'}catch(e){$('msg').textContent='Error: '+e.message}$('run').disabled=false};
if(TOOLS[location.hash.slice(1)])openTool(location.hash.slice(1));
