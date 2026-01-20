import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const productsPath = path.join(ROOT, 'products.json');
const templatePath = path.join(ROOT, 'product-template.html');

if (!fs.existsSync(productsPath)) {
  console.error('Missing products.json');
  process.exit(1);
}
if (!fs.existsSync(templatePath)) {
  console.error('Missing product-template.html');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
  .filter(p => p && p.slug && p.name);

const template = fs.readFileSync(templatePath, 'utf8');

function escHtml(s='') {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function makeMetaDescription(p){
  const name = p.name;
  const cat = p.category || 'Products';
  const bits = [];
  if (p.short) bits.push(p.short);
  if (p.description) bits.push(p.description);
  const blurb = bits.join(' — ').replace(/\s+/g,' ').trim();
  const lead = blurb ? `${blurb}. ` : '';
  return `${name} (${cat}). ${lead}Request pricing and availability from Square Frames (Fiji). Servicing Suva, Nasinu, Nausori, Lami, Lautoka, Nadi, Labasa and all of Fiji.`;
}

function makeDetailPills(p){
  const dims = (p.dimensions || '').split(/\n|\r\n/).map(s=>s.trim()).filter(Boolean);
  const max = 8;
  const pills = dims.slice(0,max).map(d=>`<span class="dim-pill">${escHtml(d)}</span>`).join('\n                ');
  return pills || '<span class="dim-pill">Ask for sizes</span>';
}

function makePoints(p){
  const pts = [];
  if (p.short) pts.push(p.short);
  if (p.description) {
    p.description.split(/\n|\r\n/).map(s=>s.trim()).filter(Boolean).forEach(x=>pts.push(x));
  }
  const uniq = [...new Set(pts)].slice(0,10);
  if (!uniq.length) return '<li>Request pricing, availability, and suitable specifications for your application.</li>';
  return uniq.map(t=>`<li>${escHtml(t)}</li>`).join('\n              ');
}

function firstImage(p){
  return (p.images && p.images.length) ? p.images[0] : 'https://sqframes.com/images/og-cover.png';
}
function secondImage(p){
  return (p.images && p.images.length > 1) ? p.images[1] : firstImage(p);
}

function imagesJsonForAttr(p){
  const imgs = (p.images && p.images.length) ? p.images : [firstImage(p)];
  // JSON string for embedding inside single quotes in HTML attribute
  return JSON.stringify(imgs.map(String));
}

function inject(template, p){
  const slug = String(p.slug).trim();
  const name = String(p.name).trim();
  const cat = String(p.category || '').trim();
  const img1 = firstImage(p);
  const img2 = secondImage(p);

  let out = template;

  out = out.replaceAll('PRODUCT_NAME', escHtml(name));
  out = out.replaceAll('CATEGORY', escHtml(cat));
  out = out.replaceAll('SLUG', `${encodeURIComponent(slug)}/`);

  out = out.replaceAll('IMAGE_1', escHtml(img1));
  out = out.replaceAll('IMAGE_2', escHtml(img2));
  out = out.replaceAll('IMAGES_JSON', escHtml(imagesJsonForAttr(p)));

  // Better meta description
  out = out.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escHtml(makeMetaDescription(p))}" />`
  );

  // Replace size pills section
  out = out.replace(
    /<div class="dim-list">[\s\S]*?<\/div>/,
    `<div class="dim-list">\n                ${makeDetailPills(p)}\n              </div>`
  );

  // Replace bullet points
  out = out.replace(
    /<ul class="about-list">[\s\S]*?<\/ul>/,
    `<ul class="about-list">\n              ${makePoints(p)}\n            </ul>`
  );

  // JSON-LD description
  const shortDesc = (p.short || p.description || `${name} from Square Frames Fiji`).replace(/\s+/g,' ').trim();
  out = out.replaceAll('SHORT_DESCRIPTION', escHtml(shortDesc));

  // Canonical/og url should be /slug/
  out = out.replaceAll(`https://sqframes.com/${encodeURIComponent(slug)}/`, `https://sqframes.com/${encodeURIComponent(slug)}/`);

  return out;
}

// Build /<slug>/index.html pages
let count = 0;
for (const p of products) {
  const slug = String(p.slug).trim();
  const dir = path.join(ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = inject(template, p);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  count++;
}

console.log(`Generated ${count} product page(s).`);
