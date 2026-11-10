// PDFPup logo: static dog face (no animation)
document.querySelectorAll('.mark').forEach(m=>{const i=document.createElement('img');i.className='mark dog';i.src='assets/logo-dog.png';i.alt='PDFPup';i.style.cssText=m.style.cssText;m.replaceWith(i)});
