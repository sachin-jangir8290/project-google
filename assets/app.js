const {PDFDocument,degrees,rgb,StandardFonts}=PDFLib;
const $=id=>document.getElementById(id);
const val=id=>$(id)?$(id).value:'';
const CDN='https://cdnjs.cloudflare.com/ajax/libs/';
const LIB={pdfjs:CDN+'pdf.js/3.11.174/pdf.min.js',zip:CDN+'jszip/3.10.1/jszip.min.js',xlsx:CDN+'xlsx/0.18.5/xlsx.full.min.js',
 pptx:CDN+'pptxgenjs/3.12.0/pptxgen.bundle.js',mammoth:CDN+'mammoth/1.6.0/mammoth.browser.min.js',h2p:CDN+'html2pdf.js/0.10.1/html2pdf.bundle.min.js',
 jspdf:CDN+'jspdf/2.5.1/jspdf.umd.min.js',tess:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js'};
const _l={};
const need=(...ks)=>Promise.all(ks.map(k=>_l[k]||(_l[k]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=LIB[k];s.onload=ok;s.onerror=()=>{delete _l[k];no(new Error('Could not load library: '+k))};document.head.append(s)}))));
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const msg=t=>$('msg').textContent=t;
const prog=(i,n,w='Page')=>msg(`Processing… ${w} ${i}/${n}`);
const base=f=>f.name.replace(/\.[^.]+$/,'');
const hex=h=>{const n=parseInt(h.slice(1),16);return rgb((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)};

// ---------- helpers ----------
const range=(s,n)=>{const o=[];s.split(',').forEach(p=>{const [a,b]=p.trim().split('-').map(x=>parseInt(x));if(!a)return;for(let i=a;i<=(isNaN(b)?a:b);i++)if(i>=1&&i<=n&&!o.includes(i-1))o.push(i-1)});return o};
const embedAll=async(o,d)=>{const out=[];for(const p of d.getPages()){const {width,height}=p.getSize();out.push(p.node.Contents()?await o.embedPage(p):{width,height,blank:1})}return out};
const ftype=x=>{const L=PDFLib;return x instanceof L.PDFCheckBox?'check':x instanceof L.PDFTextField?'text':(x instanceof L.PDFDropdown||x instanceof L.PDFRadioGroup||x instanceof L.PDFOptionList)?'choice':''};
const load=async f=>PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});
function save(bytes,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(bytes instanceof Blob?bytes:new Blob([bytes],{type:type||(name.endsWith('.pdf')?'application/pdf':'application/octet-stream')}));a.download=name;document.body.append(a);a.click();a.remove()}
async function zipSave(entries,name){if(entries.length===1)return save(entries[0][1],entries[0][0]);await need('zip');const z=new JSZip();entries.forEach(([n,b])=>z.file(n,b));save(await z.generateAsync({type:'blob'}),name)}
async function pjs(f,password){await need('pdfjs');pdfjsLib.GlobalWorkerOptions.workerSrc=LIB.pdfjs.replace('pdf.min','pdf.worker.min');
 try{return await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer()),password}).promise}catch(e){if(e.name==='PasswordException')throw new Error(password?'Wrong password':'This PDF is password protected');throw e}}
async function render(doc,n,scale=1.5){const p=await doc.getPage(n),vp=p.getViewport({scale}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await p.render({canvasContext:x,viewport:vp}).promise;return {c,vp,p}}
const c2b=(c,type='image/jpeg',q=.85)=>new Promise(r=>c.toBlob(b=>b.arrayBuffer().then(a=>r(new Uint8Array(a))),type,q));
async function raster(doc,{scale=1.5,q=.8,edit}={}){const o=await PDFDocument.create();
 for(let i=1;i<=doc.numPages;i++){prog(i,doc.numPages);const {c,vp,p}=await render(doc,i,scale);if(edit)await edit(c,vp,p,i);
  const img=await o.embedJpg(await c2b(c,'image/jpeg',q)),w=vp.width/scale,h=vp.height/scale;o.addPage([w,h]).drawImage(img,{x:0,y:0,width:w,height:h})}
 return o.save()}
async function lines(doc,i){const tc=await (await doc.getPage(i)).getTextContent(),rows=[];
 for(const it of tc.items){if(!it.str.trim())continue;const x=it.transform[4],y=it.transform[5];let r=rows.find(r=>Math.abs(r.y-y)<3);if(!r)rows.push(r={y,items:[]});r.items.push({x,s:it.str,w:it.width})}
 rows.sort((a,b)=>b.y-a.y);rows.forEach(r=>r.items.sort((a,b)=>a.x-b.x));return rows}
const lineText=r=>r.items.map(i=>i.s).join(' ').replace(/\s+/g,' ').trim();
async function allText(f){const d=await pjs(f),out=[];for(let i=1;i<=d.numPages;i++)(await lines(d,i)).forEach(r=>out.push(lineText(r)));return out}
async function imgCanvas(f){const b=await createImageBitmap(f),c=document.createElement('canvas');c.width=b.width;c.height=b.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0);return c}
async function htmlPdf(html,name){await need('h2p');const el=document.createElement('div');el.innerHTML=html;el.style.cssText='color:#000;background:#fff;font-family:Arial,sans-serif;font-size:11pt;line-height:1.4';
 await html2pdf().set({margin:10,filename:name,image:{type:'jpeg',quality:.95},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4'},pagebreak:{mode:['css','legacy']}}).from(el).save()}
const TBL='<style>table{border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #999;padding:3px 6px;font-size:9pt}</style>';

// ---------- tools ----------
const CATS=['All','Organize','Optimize','Convert to PDF','Convert from PDF','Edit','Security'];
const PDF='.pdf,application/pdf';
const TOOLS={
 merge:{cat:'Organize',ic:'🔗',name:'Merge PDF',desc:'Combine PDFs in the order you want.',multi:1,accept:PDF,
  run:async fs=>{const o=await PDFDocument.create();for(const [i,f] of fs.entries()){prog(i+1,fs.length,'File');const d=await load(f);(await o.copyPages(d,d.getPageIndices())).forEach(p=>o.addPage(p))}save(await o.save(),'merged.pdf')}},
 split:{cat:'Organize',ic:'✂️',name:'Split PDF',desc:'Split into single pages or custom ranges.',accept:PDF,
  opts:'<label><select id="mode"><option value="all">Every page as a separate PDF</option><option value="r">Custom ranges</option></select></label><label>Ranges: <input id="pg" placeholder="1-3, 4-6, 7"></label>',
  run:async([f])=>{const d=await load(f),n=d.getPageCount(),groups=val('mode')==='all'?d.getPageIndices().map(i=>[i]):val('pg').split(',').map(r=>range(r,n)).filter(g=>g.length),out=[];
   for(const g of groups){const o=await PDFDocument.create();(await o.copyPages(d,g)).forEach(p=>o.addPage(p));out.push([`${base(f)}-${g[0]+1}${g.length>1?'-'+(g.at(-1)+1):''}.pdf`,await o.save()])}
   await zipSave(out,base(f)+'-split.zip')}},
 remove:{cat:'Organize',ic:'🗑️',name:'Remove Pages',desc:'Delete pages you do not need.',accept:PDF,opts:'<label>Pages to delete: <input id="pg" placeholder="2, 4-6"></label>',
  run:async([f])=>{const d=await load(f);range(val('pg'),d.getPageCount()).sort((a,b)=>b-a).forEach(i=>d.removePage(i));save(await d.save(),base(f)+'-removed.pdf')}},
 extract:{cat:'Organize',ic:'📑',name:'Extract Pages',desc:'Pull selected pages into a new PDF.',accept:PDF,opts:'<label>Pages: <input id="pg" placeholder="1-3, 5"></label>',
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create();(await o.copyPages(d,range(val('pg'),d.getPageCount()))).forEach(p=>o.addPage(p));save(await o.save(),base(f)+'-extracted.pdf')}},
 organize:{cat:'Organize',ic:'🔀',name:'Organize PDF',desc:'Re-order, duplicate or drop pages (e.g. 3,1,2,2).',accept:PDF,opts:'<label>New page order: <input id="pg" placeholder="3,1,2"></label>',
  run:async([f])=>{const d=await load(f),n=d.getPageCount(),o=await PDFDocument.create(),idx=val('pg').split(',').map(x=>parseInt(x)-1).filter(i=>i>=0&&i<n);(await o.copyPages(d,idx)).forEach(p=>o.addPage(p));save(await o.save(),base(f)+'-organized.pdf')}},
 scan:{cat:'Organize',ic:'📷',name:'Scan to PDF',desc:'Use your phone camera to capture pages into a PDF.',multi:1,accept:'image/*',capture:1,
  run:async fs=>TOOLS.jpg2pdf.run(fs,'scan.pdf')},

 compress:{cat:'Optimize',ic:'🗜️',name:'Compress PDF',desc:'Reduce file size while keeping good quality.',accept:PDF,
  opts:'<label><select id="lvl"><option value="1.6,.75">Low compression (best quality)</option><option value="1.25,.6" selected>Recommended</option><option value="1,.4">Extreme compression</option></select></label>',
  run:async([f])=>{const [s,q]=val('lvl').split(',').map(Number);const opt=await (await load(f)).save({useObjectStreams:true});let best=opt;
   try{const r=await raster(await pjs(f),{scale:s,q});if(r.length<best.length)best=r}catch(e){}
   const kb=b=>(b/1024).toFixed(0)+' KB';if(best.length>=f.size){msg(`Already optimized (${kb(f.size)}). No smaller version possible.`);return}
   save(best,base(f)+'-compressed.pdf');msg(`${kb(f.size)} → ${kb(best.length)} (${Math.round(100-best.length/f.size*100)}% smaller)`)}},
 repair:{cat:'Optimize',ic:'🛠️',name:'Repair PDF',desc:'Recover data from a damaged PDF.',accept:PDF,
  run:async([f])=>{try{save(await (await load(f)).save(),base(f)+'-repaired.pdf')}catch(e){save(await raster(await pjs(f)),base(f)+'-repaired.pdf')}}},
 ocr:{cat:'Optimize',ic:'🔍',name:'OCR PDF',desc:'Make scanned PDFs/images searchable and copy their text.',multi:1,accept:PDF+',image/*',
  opts:'<label>Language: <select id="lang"><option value="eng">English</option><option value="hin">Hindi</option><option value="eng+hin">English + Hindi</option><option value="mar">Marathi</option><option value="guj">Gujarati</option><option value="ben">Bengali</option><option value="tam">Tamil</option><option value="tel">Telugu</option><option value="urd">Urdu</option><option value="fra">French</option><option value="deu">German</option><option value="spa">Spanish</option></select></label>',
  run:async fs=>{await need('tess');msg('Loading OCR engine…');const w=await Tesseract.createWorker(val('lang')),canv=[];
   for(const f of fs){if(f.type.startsWith('image/'))canv.push(await imgCanvas(f));else{const d=await pjs(f);for(let i=1;i<=d.numPages;i++)canv.push((await render(d,i,2)).c)}}
   const o=await PDFDocument.create(),txt=[];
   for(const [i,c] of canv.entries()){prog(i+1,canv.length);const {data}=await w.recognize(c,{},{text:true,pdf:true});txt.push(data.text);
    if(data.pdf){const pd=await PDFDocument.load(new Uint8Array(data.pdf));(await o.copyPages(pd,pd.getPageIndices())).forEach(p=>o.addPage(p))}}
   await w.terminate();if(o.getPageCount())save(await o.save(),'ocr-searchable.pdf');save(new Blob([txt.join('\n\n----- page -----\n\n')],{type:'text/plain'}),'ocr-text.txt');
   $('out').textContent=txt.join('\n\n----- page -----\n\n')}},

 jpg2pdf:{cat:'Convert to PDF',ic:'🖼️',name:'JPG to PDF',desc:'Convert JPG, PNG, WEBP images to PDF.',multi:1,accept:'image/*',
  opts:'<label>Page size: <select id="ps"><option value="fit">Same as image</option><option value="a4">A4</option><option value="letter">Letter</option></select></label><label>Margin: <select id="mg"><option value="0">None</option><option value="20">Small</option><option value="40">Big</option></select></label>',
  run:async(fs,name='images.pdf')=>{const o=await PDFDocument.create(),S={a4:[595,842],letter:[612,792]};
   for(const [i,f] of fs.entries()){prog(i+1,fs.length,'Image');const c=await imgCanvas(f),img=await o.embedJpg(await c2b(c,'image/jpeg',.92));const m=+val('mg')||0;
    let [W,H]=S[val('ps')]||[c.width+2*m,c.height+2*m];if(S[val('ps')]&&c.width>c.height)[W,H]=[H,W];
    const k=Math.min((W-2*m)/c.width,(H-2*m)/c.height),w=c.width*k,h=c.height*k;o.addPage([W,H]).drawImage(img,{x:(W-w)/2,y:(H-h)/2,width:w,height:h})}
   save(await o.save(),name)}},
 word2pdf:{cat:'Convert to PDF',ic:'📝',name:'Word to PDF',desc:'Convert DOCX documents to PDF.',accept:'.docx',
  run:async([f])=>{await need('mammoth');const r=await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()});await htmlPdf(TBL+r.value,base(f)+'.pdf')}},
 excel2pdf:{cat:'Convert to PDF',ic:'📊',name:'Excel to PDF',desc:'Convert XLSX/XLS/CSV spreadsheets to PDF.',accept:'.xlsx,.xls,.csv,.ods',
  run:async([f])=>{await need('xlsx');const wb=XLSX.read(await f.arrayBuffer());const html=wb.SheetNames.map((n,i)=>`<h3 ${i?'style="page-break-before:always"':''}>${esc(n)}</h3>`+XLSX.utils.sheet_to_html(wb.Sheets[n],{header:'',footer:''})).join('');await htmlPdf(TBL+html,base(f)+'.pdf')}},
 ppt2pdf:{cat:'Convert to PDF',ic:'📽️',name:'PowerPoint to PDF',desc:'Convert PPTX slides (text & images) to PDF.',accept:'.pptx',
  run:async([f])=>{await need('zip');const z=await JSZip.loadAsync(await f.arrayBuffer()),ns=Object.keys(z.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));let html='';
   for(const [i,n] of ns.entries()){const x=await z.file(n).async('string'),paras=[...x.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(m=>[...m[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(t=>t[1]).join('')).filter(Boolean);
    let imgs='';const rel=z.file(n.replace('slides/','slides/_rels/')+'.rels');if(rel){for(const m of (await rel.async('string')).matchAll(/Target="\.\.\/media\/([^"]+\.(png|jpe?g|gif))"/gi)){const b=await z.file('ppt/media/'+m[1]).async('base64');imgs+=`<img src="data:image/${m[2].replace('jpg','jpeg')};base64,${b}" style="max-width:45%;max-height:200px;margin:4px">`}}
    html+=`<div style="${i?'page-break-before:always;':''}border:1px solid #ccc;padding:20px;min-height:150mm"><small>Slide ${i+1}</small>${paras.map((p,j)=>j?`<p>${p}</p>`:`<h2>${p}</h2>`).join('')}${imgs}</div>`}
   await htmlPdf(html,base(f)+'.pdf')}},
 html2pdf:{cat:'Convert to PDF',ic:'🌐',name:'HTML to PDF',desc:'Paste HTML (or upload a .html file) and convert it to PDF.',accept:'.html,.htm',optional:1,opts:'<textarea id="html" placeholder="<h1>Hello</h1><p>Paste your HTML here…</p>"></textarea>',
  run:async fs=>{const h=fs[0]?await fs[0].text():val('html');if(!h.trim())throw new Error('Add some HTML first');await htmlPdf(h,'page.pdf')}},

 pdf2jpg:{cat:'Convert from PDF',ic:'🏞️',name:'PDF to JPG',desc:'Turn each page into a JPG or PNG image.',accept:PDF,
  opts:'<label>Format: <select id="fmt"><option value="jpeg">JPG</option><option value="png">PNG</option></select></label><label>Quality: <select id="sc"><option value="1.5">Normal</option><option value="3">High</option></select></label>',
  run:async([f])=>{const d=await pjs(f),out=[],t=val('fmt');for(let i=1;i<=d.numPages;i++){prog(i,d.numPages);const {c}=await render(d,i,+val('sc'));out.push([`${base(f)}-${i}.${t==='png'?'png':'jpg'}`,await c2b(c,'image/'+t,.92)])}await zipSave(out,base(f)+'-images.zip')}},
 pdf2word:{cat:'Convert from PDF',ic:'📄',name:'PDF to Word',desc:'Convert PDF text into an editable Word document.',accept:PDF,
  run:async([f])=>{const d=await pjs(f);let h='';for(let i=1;i<=d.numPages;i++){prog(i,d.numPages);const rs=await lines(d,i);let prev=null;h+=i>1?'<br style="page-break-before:always">':'';
    for(const r of rs){if(prev&&prev-r.y>22)h+='<p>&nbsp;</p>';h+=`<p style="margin:0">${esc(lineText(r))}</p>`;prev=r.y}}
   if(!h.replace(/<[^>]+>|&nbsp;/g,'').trim())throw new Error('No text found — this looks scanned. Run OCR PDF first.');
   save(new Blob([`<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri">${h}</body></html>`],{type:'application/msword'}),base(f)+'.doc')}},
 pdf2excel:{cat:'Convert from PDF',ic:'📈',name:'PDF to Excel',desc:'Pull tables from PDF into an Excel sheet.',accept:PDF,
  run:async([f])=>{await need('xlsx');const d=await pjs(f),wb=XLSX.utils.book_new();
   for(let i=1;i<=d.numPages;i++){prog(i,d.numPages);const rows=(await lines(d,i)).map(r=>{const cells=[];let end=-1e9;for(const it of r.items){if(it.x-end>8||!cells.length)cells.push(it.s.trim());else cells[cells.length-1]+=' '+it.s.trim();end=it.x+it.w}return cells.map(c=>c!==''&&!isNaN(c.replace(/,/g,''))?+c.replace(/,/g,''):c)});
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Page '+i)}
   save(new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'})),base(f)+'.xlsx')}},
 pdf2ppt:{cat:'Convert from PDF',ic:'🎞️',name:'PDF to PowerPoint',desc:'Turn every page into a PPTX slide.',accept:PDF,
  run:async([f])=>{await need('pptx');const d=await pjs(f),pp=new PptxGenJS(),v=(await d.getPage(1)).getViewport({scale:1});pp.defineLayout({name:'P',width:v.width/72,height:v.height/72});pp.layout='P';
   for(let i=1;i<=d.numPages;i++){prog(i,d.numPages);const {c}=await render(d,i,2);pp.addSlide().addImage({data:c.toDataURL('image/jpeg',.9),x:0,y:0,w:v.width/72,h:v.height/72})}
   await pp.writeFile({fileName:base(f)+'.pptx'})}},
 pdf2txt:{cat:'Convert from PDF',ic:'🔤',name:'PDF to Text',desc:'Extract all text from a PDF.',accept:PDF,
  run:async([f])=>{const t=(await allText(f)).join('\n');$('out').textContent=t;save(new Blob([t],{type:'text/plain'}),base(f)+'.txt')}},

 edit:{cat:'Edit',ic:'✏️',name:'Edit PDF',desc:'Add text anywhere on your PDF pages.',accept:PDF,preview:'text',
  opts:'<label>Page: <input id="pp" type="number" value="1" min="1" style="width:70px"></label><label>Text: <input id="tx" value="Your text"></label><label>Size: <input id="sz" type="number" value="16" style="width:60px"></label><label>Color: <input id="col" type="color" value="#000000"></label><br><button type="button" onclick="marks=[];drawPreview()">Undo all</button>',
  run:async([f])=>{if(!marks.length)throw new Error('Click on the page to place text first');const d=await load(f),fn=await d.embedFont(StandardFonts.Helvetica);
   for(const m of marks)d.getPage(m.page-1).drawText(m.text,{x:m.x,y:m.y-m.size*.8,size:m.size,font:fn,color:hex(m.color)});save(await d.save(),base(f)+'-edited.pdf')}},
 sign:{cat:'Edit',ic:'✍️',name:'Sign PDF',desc:'Draw or type your signature and place it.',accept:PDF,preview:'sig',
  opts:'<canvas id="sig" width="400" height="130"></canvas><label>Or type: <input id="tsig" placeholder="Your name"></label><button type="button" onclick="clearSig()">Clear</button><br><label>Page: <input id="pp" type="number" value="1" min="1" style="width:70px"></label><label>Width (pt): <input id="sw" type="number" value="150" style="width:70px"></label><button type="button" onclick="marks=[];drawPreview()">Undo all</button>',
  run:async([f])=>{if(!marks.length)throw new Error('Click on the page to place your signature');const d=await load(f);
   for(const m of marks){const img=await d.embedPng(m.png),h=m.w*img.height/img.width;d.getPage(m.page-1).drawImage(img,{x:m.x-m.w/2,y:m.y-h/2,width:m.w,height:h})}save(await d.save(),base(f)+'-signed.pdf')}},
 watermark:{cat:'Edit',ic:'💧',name:'Watermark',desc:'Stamp text over every page.',accept:PDF,
  opts:'<label>Text: <input id="wm" value="CONFIDENTIAL"></label><label>Size: <input id="sz" type="number" value="50" style="width:60px"></label><label>Color: <input id="col" type="color" value="#d02020"></label><label>Opacity: <select id="op"><option>0.15</option><option selected>0.3</option><option>0.5</option></select></label>',
  run:async([f])=>{const d=await load(f),fn=await d.embedFont(StandardFonts.HelveticaBold),t=val('wm'),s=+val('sz');d.getPages().forEach(p=>{const w=fn.widthOfTextAtSize(t,s),{width:W,height:H}=p.getSize();
   p.drawText(t,{x:W/2-w/2*.707,y:H/2-w/2*.707,size:s,font:fn,color:hex(val('col')),opacity:+val('op'),rotate:degrees(45)})});save(await d.save(),base(f)+'-watermarked.pdf')}},
 rotate:{cat:'Edit',ic:'🔄',name:'Rotate PDF',desc:'Rotate all or selected pages.',accept:PDF,opts:'<label><select id="deg"><option value="90">90° right</option><option value="180">180°</option><option value="270">90° left</option></select></label><label>Pages (blank = all): <input id="pg" placeholder="1,3-4"></label>',
  run:async([f])=>{const d=await load(f),sel=val('pg').trim()?range(val('pg'),d.getPageCount()):d.getPageIndices();sel.forEach(i=>{const p=d.getPage(i);p.setRotation(degrees((p.getRotation().angle+ +val('deg'))%360))});save(await d.save(),base(f)+'-rotated.pdf')}},
 numbers:{cat:'Edit',ic:'🔢',name:'Page Numbers',desc:'Add page numbers with your style.',accept:PDF,
  opts:'<label>Position: <select id="pos"><option value="bc">Bottom center</option><option value="br">Bottom right</option><option value="bl">Bottom left</option><option value="tc">Top center</option><option value="tr">Top right</option></select></label><label>Format: <select id="fm"><option value="n">1</option><option value="nt">1 / 10</option><option value="p">Page 1</option><option value="pt">Page 1 of 10</option></select></label><label>Start at: <input id="st" type="number" value="1" style="width:60px"></label>',
  run:async([f])=>{const d=await load(f),fn=await d.embedFont(StandardFonts.Helvetica),ps=d.getPages(),st=+val('st')||1,pos=val('pos'),T=ps.length+st-1;
   ps.forEach((p,i)=>{const n=i+st,t={n:`${n}`,nt:`${n} / ${T}`,p:`Page ${n}`,pt:`Page ${n} of ${T}`}[val('fm')],w=fn.widthOfTextAtSize(t,11),{width:W,height:H}=p.getSize();
    p.drawText(t,{x:pos[1]==='c'?W/2-w/2:pos[1]==='r'?W-w-30:30,y:pos[0]==='b'?20:H-30,size:11,font:fn})});save(await d.save(),base(f)+'-numbered.pdf')}},
 crop:{cat:'Edit',ic:'🔲',name:'Crop PDF',desc:'Trim margins from every page (in mm).',accept:PDF,
  opts:'<label>Top <input id="ct" type="number" value="10" style="width:60px"></label><label>Bottom <input id="cb" type="number" value="10" style="width:60px"></label><label>Left <input id="cl" type="number" value="10" style="width:60px"></label><label>Right <input id="cr" type="number" value="10" style="width:60px"></label>',
  run:async([f])=>{const d=await load(f),k=72/25.4,[t,b,l,r]=['ct','cb','cl','cr'].map(i=>(+val(i)||0)*k);d.getPages().forEach(p=>{const m=p.getMediaBox(),box=[m.x+l,m.y+b,m.width-l-r,m.height-t-b];if(box[2]<10||box[3]<10)throw new Error('Margins too big');p.setCropBox(...box);p.setMediaBox(...box)});save(await d.save(),base(f)+'-cropped.pdf')}},
 redact:{cat:'Edit',ic:'⬛',name:'Redact PDF',desc:'Permanently black out words (names, numbers, etc.).',accept:PDF,opts:'<label>Words to hide (comma separated): <input id="rw" placeholder="John, 9876543210" style="width:300px"></label>',
  run:async([f])=>{const ws=val('rw').split(',').map(w=>w.trim().toLowerCase()).filter(Boolean);if(!ws.length)throw new Error('Enter words to redact');let hits=0;
   const b=await raster(await pjs(f),{scale:2,q:.9,edit:async(c,vp,p)=>{const x=c.getContext('2d');x.fillStyle='#000';for(const it of (await p.getTextContent()).items){const s=it.str.toLowerCase();if(!ws.some(w=>s.includes(w)))continue;hits++;
    const h=it.height||Math.hypot(it.transform[2],it.transform[3]),[x1,y1,x2,y2]=vp.convertToViewportRectangle([it.transform[4],it.transform[5]-h*.25,it.transform[4]+it.width,it.transform[5]+h]);x.fillRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1))}}});
   save(b,base(f)+'-redacted.pdf');msg(`Done — ${hits} text area(s) redacted. Text is removed permanently (pages are flattened).`)}},
 compare:{cat:'Edit',ic:'⚖️',name:'Compare PDF',desc:'See text differences between two PDFs.',multi:1,accept:PDF,
  run:async fs=>{if(fs.length!==2)throw new Error('Select exactly 2 PDFs');const [a,b]=await Promise.all(fs.map(allText)),n=a.length,m=b.length,L=Array.from({length:n+1},()=>new Uint16Array(m+1));
   for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
   let i=0,j=0,h='',ch=0;while(i<n||j<m){if(i<n&&j<m&&a[i]===b[j]){h+=esc(a[i])+'\n';i++;j++}else if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){h+=`<span class="add">+ ${esc(b[j++])}</span>\n`;ch++}else{h+=`<span class="del">- ${esc(a[i++])}</span>\n`;ch++}}
   $('out').innerHTML=h;msg(ch?`${ch} changed line(s). Red = only in "${fs[0].name}", green = only in "${fs[1].name}".`:'No text differences found.')}},
 meta:{cat:'Edit',ic:'🏷️',name:'Edit Metadata',desc:'Change title, author, subject and keywords.',accept:PDF,opts:'<label>Title <input id="ti"></label><label>Author <input id="au"></label><label>Subject <input id="su"></label><label>Keywords <input id="kw"></label>',
  run:async([f])=>{const d=await load(f);d.setTitle(val('ti'));d.setAuthor(val('au'));d.setSubject(val('su'));d.setKeywords(val('kw').split(',').map(s=>s.trim()));save(await d.save(),base(f)+'.pdf')}},

 unlock:{cat:'Security',ic:'🔓',name:'Unlock PDF',desc:'Remove the password from a PDF you own.',accept:PDF,opts:'<label>Password: <input id="pw" type="password"></label>',
  run:async([f])=>{save(await raster(await pjs(f,val('pw')||undefined),{scale:2,q:.9}),base(f)+'-unlocked.pdf')}},
 protect:{cat:'Security',ic:'🔒',name:'Protect PDF',desc:'Encrypt a PDF with a password.',accept:PDF,opts:'<label>Password: <input id="pw" type="password"></label><label>Repeat: <input id="pw2" type="password"></label>',
  run:async([f])=>{const pw=val('pw');if(!pw)throw new Error('Enter a password');if(pw!==val('pw2'))throw new Error('Passwords do not match');await need('jspdf');const d=await pjs(f);let doc;
   for(let i=1;i<=d.numPages;i++){prog(i,d.numPages);const {c,vp}=await render(d,i,2),w=vp.width/2,h=vp.height/2,o=w>h?'l':'p';
    if(!doc)doc=new jspdf.jsPDF({unit:'pt',format:[w,h],orientation:o,encryption:{userPassword:pw,ownerPassword:pw+'#owner',userPermissions:['print']}});else doc.addPage([w,h],o);doc.addImage(c.toDataURL('image/jpeg',.85),'JPEG',0,0,w,h)}
   save(doc.output('blob'),base(f)+'-protected.pdf')}},
 // ----- more tools -----
 reverse:{cat:'Organize',ic:'',name:'Reverse PDF',desc:'Flip the page order — last page becomes first.',accept:PDF,
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create();(await o.copyPages(d,d.getPageIndices().reverse())).forEach(p=>o.addPage(p));save(await o.save(),base(f)+'-reversed.pdf')}},
 alternate:{cat:'Organize',ic:'',name:'Alternate & Mix',desc:'Interleave pages of two PDFs (great for double-sided scans).',multi:1,accept:PDF,
  opts:'<label><input type="checkbox" id="rv"> Reverse the second file (back pages scanned in reverse)</label>',
  run:async fs=>{if(fs.length!==2)throw new Error('Select exactly 2 PDFs');const [a,b]=await Promise.all(fs.map(load)),o=await PDFDocument.create(),A=await o.copyPages(a,a.getPageIndices());let B=await o.copyPages(b,b.getPageIndices());if($('rv').checked)B.reverse();
   for(let i=0;i<Math.max(A.length,B.length);i++){if(A[i])o.addPage(A[i]);if(B[i])o.addPage(B[i])}save(await o.save(),'mixed.pdf')}},
 insert:{cat:'Organize',ic:'',name:'Insert Blank Pages',desc:'Add empty pages after any page.',accept:PDF,opts:'<label>After pages (0 = at start): <input id="pg" placeholder="0, 3, 5"></label>',
  run:async([f])=>{const d=await load(f),n=d.getPageCount(),at=[...new Set(val('pg').split(',').map(x=>parseInt(x)).filter(x=>x>=0&&x<=n))].sort((a,b)=>b-a);if(!at.length)throw new Error('Enter page numbers');
   at.forEach(i=>{const {width,height}=d.getPage(Math.max(0,i-1)).getSize();d.insertPage(i,[width,height])});save(await d.save(),base(f)+'-blank-added.pdf')}},
 blank:{cat:'Organize',ic:'',name:'Remove Blank Pages',desc:'Detect and delete empty pages automatically.',accept:PDF,
  run:async([f])=>{const pd=await pjs(f),keep=[];for(let i=1;i<=pd.numPages;i++){prog(i,pd.numPages);const {c}=await render(pd,i,.5),px=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let j=0;j<px.length;j+=4)if(px[j]+px[j+1]+px[j+2]<720)ink++;if(ink/(px.length/4)>.002)keep.push(i-1)}
   const removed=pd.numPages-keep.length;if(!removed){msg('No blank pages found.');return}if(!keep.length)throw new Error('All pages look blank');const d=await load(f),o=await PDFDocument.create();(await o.copyPages(d,keep)).forEach(p=>o.addPage(p));save(await o.save(),base(f)+'-no-blanks.pdf');msg(`Removed ${removed} blank page(s).`)}},
 nup:{cat:'Organize',ic:'',name:'Multiple Pages per Sheet',desc:'Print 2 or 4 pages on one sheet to save paper.',accept:PDF,opts:'<label>Pages per sheet: <select id="nu"><option>2</option><option>4</option></select></label>',
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create(),n=+val('nu'),ep=await embedAll(o,d),[W,H]=n===2?[842,595]:[595,842],cols=2,rows=n/2,cw=W/cols,ch=H/rows;
   for(let i=0;i<ep.length;i+=n){const pg=o.addPage([W,H]);ep.slice(i,i+n).forEach((e,k)=>{if(e.blank)return;const s=Math.min((cw-20)/e.width,(ch-20)/e.height),w=e.width*s,h=e.height*s,cx=k%cols,cy=Math.floor(k/cols);pg.drawPage(e,{x:cx*cw+(cw-w)/2,y:H-(cy+1)*ch+(ch-h)/2,width:w,height:h})})}
   save(await o.save(),base(f)+`-${n}up.pdf`)}},
 resize:{cat:'Organize',ic:'',name:'Resize Pages',desc:'Fit every page to A4, Letter, A3 or A5.',accept:PDF,opts:'<label>Size: <select id="ps"><option value="595,842">A4</option><option value="612,792">Letter</option><option value="842,1191">A3</option><option value="420,595">A5</option><option value="612,1008">Legal</option></select></label>',
  run:async([f])=>{const d=await load(f),o=await PDFDocument.create(),[w0,h0]=val('ps').split(',').map(Number);for(const e of await embedAll(o,d)){const [W,H]=e.width>e.height?[h0,w0]:[w0,h0],s=Math.min(W/e.width,H/e.height),pg=o.addPage([W,H]);if(!e.blank)pg.drawPage(e,{x:(W-e.width*s)/2,y:(H-e.height*s)/2,width:e.width*s,height:e.height*s})}save(await o.save(),base(f)+'-resized.pdf')}},

 grayscale:{cat:'Optimize',ic:'',name:'Grayscale PDF',desc:'Convert colour pages to black & white to save ink.',accept:PDF,
  run:async([f])=>save(await raster(await pjs(f),{scale:1.6,q:.8,edit:c=>{const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),p=im.data;for(let i=0;i<p.length;i+=4){const g=p[i]*.299+p[i+1]*.587+p[i+2]*.114;p[i]=p[i+1]=p[i+2]=g}x.putImageData(im,0,0)}}),base(f)+'-grayscale.pdf')},
 flatten:{cat:'Optimize',ic:'',name:'Flatten PDF',desc:'Lock form fields so filled values cannot be changed.',accept:PDF,
  run:async([f])=>{const d=await load(f),fm=d.getForm(),n=fm.getFields().length;if(!n){msg('This PDF has no form fields to flatten.');return}fm.flatten();save(await d.save(),base(f)+'-flattened.pdf');msg(`Flattened ${n} field(s).`)}},
 info:{cat:'Optimize',ic:'',name:'PDF Info',desc:'See pages, size, fonts, metadata and whether text is searchable.',accept:PDF,
  run:async([f])=>{const d=await load(f),pd=await pjs(f),sz=d.getPage(0).getSize();let txt=0;for(let i=1;i<=Math.min(pd.numPages,5);i++)txt+=(await (await pd.getPage(i)).getTextContent()).items.length;
   const rows=[['File',f.name],['File size',(f.size/1024).toFixed(1)+' KB'],['Pages',d.getPageCount()],['Page size',`${Math.round(sz.width)} × ${Math.round(sz.height)} pt (${(sz.width/72*25.4).toFixed(0)} × ${(sz.height/72*25.4).toFixed(0)} mm)`],
    ['Title',d.getTitle()||'—'],['Author',d.getAuthor()||'—'],['Creator',d.getCreator()||'—'],['Producer',d.getProducer()||'—'],['Created',d.getCreationDate()?.toLocaleString()||'—'],['Modified',d.getModificationDate()?.toLocaleString()||'—'],
    ['Form fields',d.getForm().getFields().length],['Searchable text',txt?'Yes':'No (scanned — use OCR PDF)'],['Encrypted',d.isEncrypted?'Yes':'No']];
   $('out').innerHTML='<table class="info">'+rows.map(([k,v])=>`<tr><th>${k}</th><td>${esc(String(v))}</td></tr>`).join('')+'</table>';msg('Here is your PDF report:')}},

 txt2pdf:{cat:'Convert to PDF',ic:'',name:'Text to PDF',desc:'Turn a .txt file or typed text into a clean PDF.',accept:'.txt,.md,.csv,.log,text/plain',optional:1,opts:'<textarea id="html" placeholder="Type or paste your text here…"></textarea>',
  run:async fs=>{const t=fs[0]?await fs[0].text():val('html');if(!t.trim())throw new Error('Add some text first');await htmlPdf(`<div style="white-space:pre-wrap;font-size:11pt">${esc(t)}</div>`,(fs[0]?base(fs[0]):'text')+'.pdf')}},

 fillform:{cat:'Edit',ic:'',name:'Fill PDF Form',desc:'Type into the form fields of any fillable PDF.',accept:PDF,
  onfile:async([f])=>{const fs=(await load(f)).getForm().getFields();if(!fs.length){$('opts').innerHTML='<p class="muted">This PDF has no fillable fields.</p>';return}
   $('opts').innerHTML='<div class="form">'+fs.map((x,i)=>{const n=esc(x.getName()),t=ftype(x);if(t==='check')return `<label class="row"><span>${n}</span><input type="checkbox" data-f="${i}" ${x.isChecked()?'checked':''}></label>`;
    if(t==='choice')return `<label class="row"><span>${n}</span><select data-f="${i}"><option value="">—</option>${x.getOptions().map(o=>`<option>${esc(o)}</option>`).join('')}</select></label>`;
    if(t==='text')return `<label class="row"><span>${n}</span><input data-f="${i}" value="${esc(x.getText()||'')}"></label>`;return ''}).join('')+'</div><label><input type="checkbox" id="fl"> Lock (flatten) after filling</label>'},
  run:async([f])=>{const d=await load(f),fm=d.getForm(),fs=fm.getFields();document.querySelectorAll('[data-f]').forEach(el=>{const x=fs[+el.dataset.f],t=ftype(x);
    if(t==='check')el.checked?x.check():x.uncheck();else if(t==='text')x.setText(el.value);else if(el.value)x.select(el.value)});if($('fl')?.checked)fm.flatten();save(await d.save(),base(f)+'-filled.pdf')}},
 headerfooter:{cat:'Edit',ic:'',name:'Header & Footer',desc:'Add text to the top and bottom of every page. Use {n} and {total}.',accept:PDF,
  opts:'<label>Header: <input id="hd" placeholder="Company name"></label><label>Footer: <input id="ft" value="Page {n} of {total}"></label><label>Align: <select id="al"><option value="c">Center</option><option value="l">Left</option><option value="r">Right</option></select></label><label>Size: <input id="sz" type="number" value="10" style="width:60px"></label>',
  run:async([f])=>{const d=await load(f),fn=await d.embedFont(StandardFonts.Helvetica),ps=d.getPages(),s=+val('sz')||10,al=val('al');
   ps.forEach((p,i)=>{const {width:W,height:H}=p.getSize();[[val('hd'),H-28],[val('ft'),18]].forEach(([t,y])=>{if(!t)return;t=t.replace(/\{n\}/g,i+1).replace(/\{total\}/g,ps.length);const w=fn.widthOfTextAtSize(t,s);p.drawText(t,{x:al==='l'?36:al==='r'?W-w-36:W/2-w/2,y,size:s,font:fn,color:rgb(.25,.25,.25)})})});
   save(await d.save(),base(f)+'-header-footer.pdf')}},
 stamp:{cat:'Edit',ic:'',name:'Add Image / Logo',desc:'Stamp your logo or a stamp image on every page.',multi:1,accept:PDF+',image/*',
  opts:'<p class="muted small">Select 1 PDF and 1 image.</p><label>Position: <select id="pos"><option value="tr">Top right</option><option value="tl">Top left</option><option value="br">Bottom right</option><option value="bl">Bottom left</option><option value="c">Center</option></select></label><label>Width: <select id="iw"><option value=".15">Small</option><option value=".25" selected>Medium</option><option value=".45">Large</option></select></label><label>Opacity: <select id="op"><option>1</option><option>0.6</option><option>0.3</option></select></label>',
  run:async fs=>{const pf=fs.find(f=>/pdf/.test(f.type)||/\.pdf$/i.test(f.name)),im=fs.find(f=>f.type.startsWith('image/'));if(!pf||!im)throw new Error('Select one PDF and one image');
   const d=await load(pf),c=await imgCanvas(im),img=await d.embedPng(await c2b(c,'image/png')),pos=val('pos'),m=24;
   d.getPages().forEach(p=>{const {width:W,height:H}=p.getSize(),w=W*+val('iw'),h=w*c.height/c.width;p.drawImage(img,{x:pos==='c'?(W-w)/2:pos[1]==='l'?m:W-w-m,y:pos==='c'?(H-h)/2:pos[0]==='b'?m:H-h-m,width:w,height:h,opacity:+val('op')})});save(await d.save(),base(pf)+'-stamped.pdf')}},

};

// ---------- UI ----------
let cur,files=[],marks=[],pvDoc=null,pvVp=null,cat='All';
function grid(){$('tabs').innerHTML=CATS.map(c=>`<button class="${c===cat?'on':''}" onclick="cat='${c}';grid()">${c}</button>`).join('');
 $('grid').innerHTML=Object.entries(TOOLS).filter(([,t])=>cat==='All'||t.cat===cat).map(([k,t],i)=>`<a href="#${k}" class="card c${CATS.indexOf(t.cat)}" style="--d:${i*30}ms" onclick="openTool('${k}');return false"><div class="ic">${svg(k)}</div><h3>${t.name}</h3><p>${t.desc}</p></a>`).join('')}
function filterTools(q){q=q.toLowerCase().trim();cat='All';grid();let n=0;document.querySelectorAll('#grid .card').forEach(c=>{const m=!q||c.textContent.toLowerCase().includes(q);c.hidden=!m;n+=m});$('none').hidden=!!n}
function goCat(c){home();cat=c;grid();$('tools').scrollIntoView({behavior:'smooth'})}
function home(){$('home').hidden=false;$('tool').hidden=true;window.scrollTo(0,0);history.replaceState(null,'',location.pathname)}
function openTool(k){cur=TOOLS[k];files=[];marks=[];pvDoc=null;$('home').hidden=true;$('tool').hidden=false;$('t-title').textContent=cur.name;$('t-ic').className='tic c'+CATS.indexOf(cur.cat);$('t-ic').innerHTML=svg(k);$('t-desc').textContent=cur.desc;
 const fi=$('file');fi.accept=cur.accept;fi.multiple=!!cur.multi;cur.capture?fi.setAttribute('capture','environment'):fi.removeAttribute('capture');
 $('drop').querySelector('b').textContent=cur.capture?'Take photo / select images':cur.multi?'Select files':'Select file';
 $('opts').innerHTML=cur.opts||'';$('out').innerHTML='';$('pvw').hidden=true;msg('');render2();location.hash=k;window.scrollTo(0,0);
 if(cur.preview==='sig')initSig();if($('pp'))$('pp').onchange=drawPreview}
function render2(){$('list').innerHTML=files.map((f,i)=>`<li><span>${esc(f.name)} <span class="muted small">${(f.size/1024).toFixed(0)} KB</span></span><span>${cur.multi?`<button onclick="mv(${i},-1)">▲</button><button onclick="mv(${i},1)">▼</button>`:''}<button onclick="files.splice(${i},1);render2()">✕</button></span></li>`).join('');
 $('run').disabled=!files.length&&!cur.optional;if(cur.preview&&files.length&&!pvDoc)pjs(files[0]).then(d=>{pvDoc=d;$('pp').max=d.numPages;drawPreview()}).catch(e=>msg('Error: '+e.message))}
function mv(i,d){const j=i+d;if(j<0||j>=files.length)return;[files[i],files[j]]=[files[j],files[i]];render2()}
function add(fl){fl=[...fl];if(!fl.length)return;files=cur.multi?files.concat(fl):fl.slice(0,1);pvDoc=null;marks=[];render2();if(cur.onfile&&files.length)cur.onfile(files).catch(e=>msg('❌ '+e.message))}
async function drawPreview(){if(!pvDoc)return;const pg=Math.min(Math.max(1,+val('pp')||1),pvDoc.numPages),{c,vp}=await render(pvDoc,pg,1.5),cv=$('pv');cv.width=c.width;cv.height=c.height;const x=cv.getContext('2d');x.drawImage(c,0,0);pvVp=vp;$('pvw').hidden=false;
 for(const m of marks.filter(m=>m.page===pg)){const [px,py]=vp.convertToViewportPoint(m.x,m.y);if(m.text){x.fillStyle=m.color;x.font=`${m.size*1.5}px Helvetica,Arial`;x.fillText(m.text,px,py+m.size*1.5*.2)}else{const im=new Image();im.src=URL.createObjectURL(new Blob([m.png],{type:'image/png'}));await im.decode();const w=m.w*1.5,h=w*im.height/im.width;x.drawImage(im,px-w/2,py-h/2,w,h)}}}
$('pv').onclick=async e=>{if(!pvVp)return;const r=e.target.getBoundingClientRect(),cx=(e.clientX-r.left)*e.target.width/r.width,cy=(e.clientY-r.top)*e.target.height/r.height,[x,y]=pvVp.convertToPdfPoint(cx,cy),page=Math.min(Math.max(1,+val('pp')||1),pvDoc.numPages);
 if(cur.preview==='text'){if(!val('tx'))return;marks.push({page,x,y,text:val('tx'),size:+val('sz')||16,color:val('col')})}
 else{const s=$('sig'),png=trimSig(s);if(!png)return msg('Draw or type your signature first');marks.push({page,x,y,w:+val('sw')||150,png:await c2b(png,'image/png')})}
 drawPreview()};
let sigDirty=false;
function initSig(){const s=$('sig'),x=s.getContext('2d');x.lineWidth=2.5;x.lineCap='round';x.strokeStyle='#0a2a8a';let dn=false;sigDirty=false;
 const pt=e=>{const r=s.getBoundingClientRect();return [(e.clientX-r.left)*s.width/r.width,(e.clientY-r.top)*s.height/r.height]};
 s.onpointerdown=e=>{dn=true;sigDirty=true;x.beginPath();x.moveTo(...pt(e));s.setPointerCapture(e.pointerId)};s.onpointermove=e=>{if(dn){x.lineTo(...pt(e));x.stroke()}};s.onpointerup=()=>dn=false;
 $('tsig').oninput=e=>{x.clearRect(0,0,s.width,s.height);x.fillStyle='#0a2a8a';x.font='italic 48px "Brush Script MT","Segoe Script",cursive';x.fillText(e.target.value,20,85);sigDirty=!!e.target.value}}
function clearSig(){const s=$('sig');s.getContext('2d').clearRect(0,0,s.width,s.height);$('tsig').value='';sigDirty=false}
function trimSig(s){if(!sigDirty)return null;const d=s.getContext('2d').getImageData(0,0,s.width,s.height).data;let x0=s.width,y0=s.height,x1=0,y1=0;
 for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(d[(y*s.width+x)*4+3]>0){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 if(x1<=x0)return null;const c=document.createElement('canvas');c.width=x1-x0+4;c.height=y1-y0+4;c.getContext('2d').drawImage(s,x0-2,y0-2,c.width,c.height,0,0,c.width,c.height);return c}
$('file').onchange=e=>{add(e.target.files);e.target.value=''};
const dr=$('drop');dr.ondragover=e=>{e.preventDefault();dr.classList.add('over')};dr.ondragleave=()=>dr.classList.remove('over');dr.ondrop=e=>{e.preventDefault();dr.classList.remove('over');add(e.dataTransfer.files)};
$('run').onclick=async()=>{$('run').disabled=true;msg('Processing…');try{await cur.run(files);if($('msg').textContent.startsWith('Processing'))msg('✅ Done! Your download has started.')}catch(e){console.error(e);msg('❌ '+e.message)}$('run').disabled=false};
window.addEventListener('DOMContentLoaded',()=>{
if(window.IMG_TOOLS){Object.keys(TOOLS).forEach(k=>delete TOOLS[k]);Object.assign(TOOLS,IMG_TOOLS);CATS.splice(0,CATS.length,...IMG_CATS)}
document.querySelectorAll('i[data-i]').forEach(e=>e.outerHTML=svg(e.dataset.i,e.className));
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12}):null;
document.querySelectorAll('[data-r]').forEach(e=>io?io.observe(e):e.classList.add('in'));
window.addEventListener('hashchange',()=>{const k=location.hash.slice(1);if(TOOLS[k]&&cur!==TOOLS[k])openTool(k)});
grid();if(TOOLS[location.hash.slice(1)])openTool(location.hash.slice(1));
});
