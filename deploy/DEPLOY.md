# PDFPup ko Hostinger subdomain par upload karna

Site sirf HTML, CSS aur JS files ki hai. Isme na koi database hai, na Node ya PHP chahiye.
Upload karne wali files: `index.html`, `images.html`, `about.html`, `privacy.html`, `terms.html`, `contact.html`, `ads.txt` aur `assets/` folder.

## Tarika A: Hostinger hPanel (shared ya cloud hosting)
1. hPanel kholo, phir **Websites → Manage → Domains → Subdomains** mein jao. Wahan subdomain bana do, jaise `tools`. Is subdomain ka ek folder banega, jaise `public_html/tools`.
2. **Files → File Manager** kholo aur us subdomain ke folder mein jao.
3. `pdfpup-site.zip` upload karo, phir us par right-click karke **Extract** karo.
4. Dhyaan rahe ki `index.html` seedha subdomain ke folder mein ho, kisi aur folder ke andar nahi.
5. **Security → SSL** mein jaakar subdomain ke liye free SSL install karo.

## Tarika B: Hostinger VPS (Ubuntu + nginx)
1. **DNS:** hPanel mein **Domains → DNS / Nameservers** mein jao. Ek record banao: Type `A`, Name `tools`, Points to = `<VPS ka IP>`.
2. **Files server par bhejo** (apne computer se):
   ```bash
   scp pdfpup-site.zip root@<VPS_IP>:/tmp/
   ```
3. **VPS par** (SSH karke):
   ```bash
   apt update && apt install -y nginx unzip
   mkdir -p /var/www/pdfpup && unzip -o /tmp/pdfpup-site.zip -d /var/www/pdfpup
   chown -R www-data:www-data /var/www/pdfpup
   ```
4. **nginx config:** `deploy/nginx-pdfpup.conf` ko `/etc/nginx/sites-available/pdfpup` mein copy karo, aur usme `tools.example.com` ki jagah apna subdomain likho. Phir:
   ```bash
   ln -s /etc/nginx/sites-available/pdfpup /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```
5. **Free SSL (https):**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d tools.example.com
   ```
6. **Dhyaan rakho:** agar VPS par Openwise ki dusri sites chal rahi hain, to unki config ko haath mat lagana. Upar ke steps sirf ek nayi file jodte hain.

## Update kaise karein
Nayi ZIP banao aur dobara extract kar do (Tarika A ka step 3, ya Tarika B ka step 2 aur 3).
