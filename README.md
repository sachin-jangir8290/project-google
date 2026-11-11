# PDFPup

Free PDF tools that run entirely in the browser (no server, files never uploaded).

**Organize:** Merge, Split, Remove pages, Extract pages, Organize, Scan to PDF
**Optimize:** Compress, Repair, OCR (searchable PDF + text)
**Convert to PDF:** JPG/PNG, Word, Excel, PowerPoint, HTML
**Convert from PDF:** JPG/PNG, Word, Excel, PowerPoint, Text
**Edit:** Edit (add text), Sign, Watermark, Rotate, Page numbers, Crop, Redact, Compare, Metadata
**Security:** Unlock, Protect (password)

Open `index.html` in a browser, or host the folder on any static host (GitHub Pages, Netlify).
Libraries (pdf-lib, pdf.js, JSZip, SheetJS, PptxGenJS, mammoth, html2pdf, jsPDF, tesseract.js) load from CDN on demand.

## Google AdSense
1. Site ko apne domain/subdomain par live karo aur AdSense (adsense.google.com) mein apply karo.
2. Approval ke baad `assets/ads.js` mein `ADSENSE_CLIENT` aur `AD_SLOTS` bharo.
3. `ads.txt` mein apna publisher ID daalo.
4. `contact.html` mein apna asli email daalo.

## Image tools
`images.html` — 22 image tools (compress, resize, crop, upscale, remove metadata, convert to JPG/PNG/WEBP, image to PDF, base64, favicon generator, HTML to image, rotate, flip, watermark, border & shape, filters, blur & pixelate, remove background, meme generator, collage, color picker). Code: `assets/imgtools.js`.

## RideLine (bike navigation)
`ride/` — a phone-first bike navigation web app: glowing route on a satellite map, next-turn card, voice guidance, re-routing, ride stats, weather and elevation. Open `ride/index.html` (needs HTTPS for GPS). Uses Leaflet, Esri/CARTO/OSM tiles, OSRM (routing.openstreetmap.de), Nominatim and Open-Meteo.

### RideLine Android app
`android/` wraps `ride/` in a WebView app (GPS + camera permissions). The GitHub Actions workflow `.github/workflows/android.yml` builds `RideLine.apk` on every push that touches `ride/` or `android/` and attaches it to a GitHub Release — download it from the repository's **Releases** page.
