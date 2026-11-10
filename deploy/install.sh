#!/usr/bin/env bash
# PDFPup one-command installer for Ubuntu/Debian VPS (nginx + free SSL)
# Usage:  bash install.sh tools.yourdomain.com
set -euo pipefail
DOMAIN="${1:-}"
REPO_ZIP="https://github.com/sachin-jangir8290/project-google/archive/refs/heads/ccr-8b6d5951-inq9q9.zip"
WEBROOT="/var/www/pdfpup"

if [ -z "$DOMAIN" ]; then echo "❌ Subdomain likho:  bash install.sh tools.yourdomain.com"; exit 1; fi
if [ "$(id -u)" != "0" ]; then echo "❌ root user se chalao (ya sudo bash install.sh $DOMAIN)"; exit 1; fi

echo "▶ 1/6 Checking web server..."
if ! command -v nginx >/dev/null 2>&1; then
  if ss -ltnp 2>/dev/null | grep -q ':80 '; then
    echo "❌ Port 80 par pehle se koi aur web server chal raha hai (Apache / OpenLiteSpeed / CyberPanel):"
    ss -ltnp | grep ':80 ' || true
    echo "   Is VPS par us panel mein website add karke files upload karo (DEPLOY.md - Tarika A). Kuch change nahi kiya gaya."
    exit 1
  fi
fi

echo "▶ 2/6 Installing nginx, unzip, curl..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx unzip curl >/dev/null

echo "▶ 3/6 Downloading PDFPup..."
TMP="$(mktemp -d)"
if ! curl -fsSL "$REPO_ZIP" -o "$TMP/site.zip"; then
  echo "❌ GitHub se download nahi hua (repo private ho sakta hai)."
  echo "   pdfpup-site.zip ko /root/ mein upload karke ye chalao:  bash install.sh $DOMAIN  (script khud /root/pdfpup-site.zip use karegi)"
  [ -f /root/pdfpup-site.zip ] || exit 1
  mkdir -p "$TMP/src" && unzip -q /root/pdfpup-site.zip -d "$TMP/src"; SRC="$TMP/src"
else
  unzip -q "$TMP/site.zip" -d "$TMP"; SRC="$(find "$TMP" -maxdepth 1 -type d -name 'project-google-*' | head -1)"
fi

echo "▶ 4/6 Copying files to $WEBROOT ..."
mkdir -p "$WEBROOT"
cp -r "$SRC"/index.html "$SRC"/images.html "$SRC"/about.html "$SRC"/privacy.html "$SRC"/terms.html "$SRC"/contact.html "$SRC"/ads.txt "$SRC"/assets "$WEBROOT"/
chown -R www-data:www-data "$WEBROOT"
rm -rf "$TMP"

echo "▶ 5/6 Configuring nginx for $DOMAIN ..."
cat > /etc/nginx/sites-available/pdfpup <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    root $WEBROOT;
    index index.html;
    location / { try_files \$uri \$uri/ =404; }
    location ~* \.(css|js|svg|png|jpg|webp|ico)\$ { expires 7d; add_header Cache-Control "public"; }
    gzip on;
    gzip_types text/css application/javascript image/svg+xml text/plain;
}
NGINX
ln -sf /etc/nginx/sites-available/pdfpup /etc/nginx/sites-enabled/pdfpup
nginx -t
systemctl enable --now nginx >/dev/null 2>&1 || true
systemctl reload nginx

echo "▶ 6/6 Free SSL (https)..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo "✅ Done!  https://$DOMAIN"
else
  echo "⚠️ Site chal rahi hai: http://$DOMAIN"
  echo "   SSL abhi nahi laga — shayad DNS (A record → is VPS ka IP) abhi update nahi hua. 10-30 min baad ye chalao:"
  echo "   certbot --nginx -d $DOMAIN"
fi
