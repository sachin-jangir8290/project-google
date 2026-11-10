// PDFPup animated logo: PDF page -> puppy face -> PDF page (loops)
(function(){
  let n=0;
  const make=()=>{const g='lg'+(n++);return `<svg class="pup" viewBox="0 0 64 64" aria-hidden="true">
<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0369a1"/></linearGradient></defs>
<rect width="64" height="64" rx="18" fill="url(#${g})"/>
<g class="lg-doc">
 <path d="M22 11h14l8 8v29a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3z" fill="#fff"/><path d="M36 11v8h8z" fill="#bae6fd"/>
 <rect x="22.5" y="26" width="18" height="8" rx="2.5" fill="#0ea5e9"/><text x="31.5" y="32.3" font-size="6.4" font-weight="800" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">PDF</text>
 <rect x="22.5" y="38" width="18" height="2.6" rx="1.3" fill="#cfe3f5"/><rect x="22.5" y="43" width="11" height="2.6" rx="1.3" fill="#cfe3f5"/>
</g>
<g class="lg-dog">
 <path class="ear-l" d="M17 17c-6 1-9 13-6 22 2 4 7 3 8-1l3-14c1-5-1-8-5-7z" fill="#334155"/>
 <path class="ear-r" d="M47 17c6 1 9 13 6 22-2 4-7 3-8-1l-3-14c-1-5 1-8 5-7z" fill="#334155"/>
 <ellipse cx="32" cy="34" rx="15" ry="16" fill="#fff"/>
 <ellipse cx="38.5" cy="28.5" rx="6.2" ry="6.6" fill="#dbe7f3"/>
 <g class="eyes"><ellipse cx="25.5" cy="30" rx="2.3" ry="2.9" fill="#0b0f19"/><ellipse cx="38.5" cy="30" rx="2.3" ry="2.9" fill="#0b0f19"/><circle cx="26.3" cy="29" r=".8" fill="#fff"/><circle cx="39.3" cy="29" r=".8" fill="#fff"/></g>
 <ellipse cx="32" cy="41" rx="8.5" ry="6.3" fill="#eef4fa"/>
 <path d="M28.3 37.6h7.4c1.1 0 1.6 1.1 1 1.9L33 42.8a1.4 1.4 0 0 1-2 0l-3.7-3.3c-.6-.8-.1-1.9 1-1.9z" fill="#0b0f19"/>
 <path class="tongue" d="M30 45h4v2.6a2 2 0 0 1-4 0z" fill="#fb7185"/>
</g></svg>`};
  document.querySelectorAll('.mark').forEach(m=>{const s=document.createElement('span');s.className='mark';s.style.cssText=m.style.cssText;s.innerHTML=make();m.replaceWith(s)});
})();
