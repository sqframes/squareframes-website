#!/usr/bin/env python3
"""Generate static product pages, sitemap, and Netlify redirects from data/products.json.

Usage:
  python generate-products.py

Creates:
  - products/<slug>/index.html
  - sitemap.xml
  - _redirects

Recommended products.json (Cloudinary images, multi-image gallery):
[
  {
    "slug": "exterior-plywood-18mm",
    "name": "Exterior Plywood 18mm",
    "category": "Plywood",
    "price": "Request Quote",
    "description": "Line 1\nLine 2",
    "dimensions": "2400 x 1200\n18mm",
    "images": [
      "https://res.cloudinary.com/<cloud>/image/upload/products/plywood/plywood-18mm-1.jpg",
      "https://res.cloudinary.com/<cloud>/image/upload/products/plywood/plywood-18mm-2.jpg"
    ],
    "tags": ["plywood","construction","exterior"]
  }
]

Backwards compatible:
- images can be a comma-separated string
- tags can be a comma-separated string
"""

import json, os, html
from urllib.parse import quote

SITE_BASE = "https://sqframes.com"
DATA_FILE = os.path.join("data", "products.json")
PRODUCTS_DIR = "products"

def is_cloudinary(url: str) -> bool:
    u = (url or "")
    return ("res.cloudinary.com" in u) and ("/upload/" in u)

def cld(url: str, transform: str) -> str:
    """Insert Cloudinary transformation string after /upload/."""
    if not url or not is_cloudinary(url):
        return url
    a, b = url.split("/upload/", 1)
    t = (transform or "").strip("/").strip()
    if t:
        return f"{a}/upload/{t}/{b.lstrip('/')}"
    return f"{a}/upload/{b.lstrip('/')}"

def as_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        return [s.strip() for s in v.split(",") if s.strip()]
    s = str(v).strip()
    return [s] if s else []

def product_page_html(p: dict) -> str:
    name = p.get("name", "Product")
    slug = (p.get("slug", "") or "").strip()
    category = p.get("category", "Products")
    desc = (p.get("description") or "").strip()
    desc_first = (desc.splitlines()[0] if desc else f"{name} from Square Frames.")
    desc_lines = [line.strip() for line in desc.splitlines() if line.strip()]
    li = "\n".join([f"          <li>{html.escape(line)}</li>" for line in desc_lines]) or "          <li>Request details and availability.</li>"

    dims_raw = (p.get("dimensions") or "").strip()
    dims_lines = [d.strip() for d in dims_raw.splitlines() if d.strip()]
    dims_block = ""
    if dims_lines:
        dims_html = "\n".join([f'              <span class="pill">{html.escape(d)}</span>' for d in dims_lines])
        dims_block = f"""
        <div id="dims-box" class="dimension-box">
          <div class="dim-label">Details</div>
          <div id="dims-list" class="dim-list">
{dims_html}
          </div>
        </div>"""

    price = (p.get("price") or "").strip()
    price_html = f'<strong id="price" style="font-size:1.05rem; color:#0f172a;">{html.escape(price)}</strong>' if price else '<strong id="price" style="font-size:1.05rem; color:#0f172a;"></strong>'

    images = as_list(p.get("images"))
    img0 = images[0] if images else "/images/tab_icon.png"

    abs_url = f"{SITE_BASE}/products/{quote(slug)}/"

    # Cloudinary defaults (responsive + social crop)
    main_400  = cld(img0, "w_400,q_auto,f_auto")
    main_800  = cld(img0, "w_800,q_auto,f_auto")
    main_1200 = cld(img0, "w_1200,q_auto,f_auto")
    og_img    = cld(img0, "w_1200,h_630,c_fill,g_auto,q_auto,f_auto")

    schema_images = []
    if images:
        schema_images.append(cld(images[0], "w_1200,q_auto,f_auto"))
        for u in images[1:]:
            schema_images.append(cld(u, "w_1200,q_auto,f_auto"))
    else:
        schema_images.append(f"{SITE_BASE}{img0}" if img0.startswith("/") else img0)

    meta_desc = f"{desc_first} Nationwide supply across Fiji. Request a quote."

    product_ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "category": category,
        "image": schema_images,
        "description": meta_desc,
        "brand": {"@type": "Brand", "name": "Square Frames"},
        "url": abs_url,
    }
    ld_json = json.dumps(product_ld, ensure_ascii=False)

    # Gallery thumbs (only shown if >1 image)
    thumbs_html = ""
    nav_html = ""
    if len(images) > 1:
        btns = []
        for i, u in enumerate(images):
            t = cld(u, "w_200,q_auto,f_auto")
            a = " active" if i == 0 else ""
            btns.append(
                f'<button class="product-thumb{a}" type="button" '
                f'data-src400="{html.escape(cld(u, "w_400,q_auto,f_auto"))}" '
                f'data-src800="{html.escape(cld(u, "w_800,q_auto,f_auto"))}" '
                f'data-src1200="{html.escape(cld(u, "w_1200,q_auto,f_auto"))}" '
                f'aria-label="View image {i+1}">'
                f'<img src="{html.escape(t)}" alt="{html.escape(name)} thumbnail {i+1}" loading="lazy"></button>'
            )
        thumbs_html = f"""<div class="product-thumbs" aria-label="Product image thumbnails">
          {''.join(btns)}
        </div>"""
        nav_html = """<button class="nav-arrow prev" type="button" aria-label="Previous image" id="pgPrev">‹</button>
        <button class="nav-arrow next" type="button" aria-label="Next image" id="pgNext">›</button>"""

    # JS kept out of f-string literal (so braces don't break parsing)
    gallery_js = ""
    if len(images) > 1:
        gallery_js = """
<script>
(function(){
  const thumbs = Array.from(document.querySelectorAll('.product-thumb'));
  const main = document.getElementById('pgMain');
  const prev = document.getElementById('pgPrev');
  const next = document.getElementById('pgNext');
  if (!main || thumbs.length === 0) return;

  let idx = 0;

  function setActive(i){
    idx = (i + thumbs.length) % thumbs.length;
    thumbs.forEach((b, n) => b.classList.toggle('active', n === idx));
    const b = thumbs[idx];
    main.src = b.dataset.src800 || (b.querySelector('img') ? b.querySelector('img').src : main.src);

    const s400 = b.dataset.src400 || '';
    const s800 = b.dataset.src800 || '';
    const s1200 = b.dataset.src1200 || '';
    if (s400 && s800 && s1200) {
      main.setAttribute('srcset', s400 + ' 400w, ' + s800 + ' 800w, ' + s1200 + ' 1200w');
    }
  }

  thumbs.forEach((b, i) => b.addEventListener('click', () => setActive(i)));
  if (prev) prev.addEventListener('click', () => setActive(idx - 1));
  if (next) next.addEventListener('click', () => setActive(idx + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') setActive(idx - 1);
    if (e.key === 'ArrowRight') setActive(idx + 1);
  });
})();
</script>
"""

    head = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>{html.escape(name)} | Square Frames</title>
  <meta name="description" content="{html.escape(meta_desc)}" />
  <meta name="robots" content="index, follow" />
  <meta name="theme-color" content="#ffffff" />

  <link rel="canonical" href="{abs_url}" />
  <link rel="stylesheet" href="/style.css" />

  <link rel="icon" href="/images/tab_icon.png" type="image/png" />
  <link rel="apple-touch-icon" href="/images/tab_icon.png" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Square Frames" />
  <meta property="og:title" content="{html.escape(name)}" />
  <meta property="og:description" content="{html.escape(meta_desc)}" />
  <meta property="og:url" content="{abs_url}" />
  <meta property="og:image" content="{html.escape(og_img if og_img else main_1200)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{html.escape(name)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{html.escape(name)}" />
  <meta name="twitter:description" content="{html.escape(meta_desc)}" />
  <meta name="twitter:image" content="{html.escape(og_img if og_img else main_1200)}" />

  <script type="application/ld+json">{ld_json}</script>
</head>

<body>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand" aria-label="Square Frames Home">
        <img src="/images/sqf_logo_transparent.png" alt="Square Frames">
      </a>

      <nav class="nav-pills" aria-label="Main navigation">
        <a href="/about.html">About</a>
        <a href="/faq.html">FAQ</a>
        <a href="/contact.html#enquiry">Contact</a>
        <a class="btn-cta" href="/contact.html#enquiry">Request Quote</a>
      </nav>
    </div>
  </header>

  <main class="content-page">
    <div class="breadcrumb">
      <a href="/">Home</a> <span style="opacity:.55;">›</span>
      <span>{html.escape(category)}</span>
    </div>

    <section class="hero2">
      <h1>{html.escape(name)}</h1>
      <p class="meta">{html.escape(category)} • Supply across Fiji</p>
    </section>

    <section class="cols">
      <div class="media">
        <div class="product-gallery" role="region" aria-label="Product image gallery">
          {nav_html}
          <img id="pgMain" class="product-main" src="{html.escape(main_800)}"
               srcset="{html.escape(main_400)} 400w, {html.escape(main_800)} 800w, {html.escape(main_1200)} 1200w"
               sizes="(max-width: 900px) 92vw, 620px"
               alt="{html.escape(name)}" loading="eager">
          {thumbs_html}
        </div>
      </div>

      <div class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
          <strong id="cat" style="text-transform:uppercase; letter-spacing:1px; font-size:.85rem; color:#34B0E0;">{html.escape(category)}</strong>
          {price_html}
        </div>

        {dims_block}

        <ul class="list" id="desc">
{li}
        </ul>

        <div class="ctaRow">
          <a class="cta-btn" href="/contact.html#enquiry" style="display:inline-block; text-decoration:none;">Request Quote</a>
          <a class="cta-btn" href="tel:+6797855919" style="display:inline-block; text-decoration:none;">Call +679 785 5919</a>
        </div>

        <p class="note">
          For faster service, include the item name, quantities (if known), and your location in Fiji.
        </p>
      </div>
    </section>

    <div class="section" style="margin-top:26px;">
      <h2 style="margin:0 0 10px 0;">More from Square Frames</h2>
      <p style="margin:0; color:#334155; line-height:1.7;">
        Browse our full catalogue on the homepage, or contact us for availability and pricing across Fiji.
      </p>
      <p style="margin:10px 0 0 0;">
        <a href="/" style="font-weight:900; text-decoration:none;">View all products →</a>
      </p>
    </div>
  </main>
"""
    tail = """
</body>
</html>
"""
    return head + gallery_js + tail

def make_sitemap(product_slugs):
    core = [
        (f"{SITE_BASE}/", "weekly", "1.0"),
        (f"{SITE_BASE}/about.html", "monthly", "0.7"),
        (f"{SITE_BASE}/faq.html", "monthly", "0.7"),
        (f"{SITE_BASE}/contact.html", "monthly", "0.7"),
    ]
    urls = core + [(f"{SITE_BASE}/products/{quote(s)}/", "weekly", "0.7") for s in product_slugs]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">', '']
    for loc, chg, prio in urls:
        out += [
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <changefreq>{chg}</changefreq>",
            f"    <priority>{prio}</priority>",
            "  </url>",
            ""
        ]
    out.append("</urlset>\n")
    return "\n".join(out)

def main():
    if not os.path.exists(DATA_FILE):
        raise SystemExit(f"Missing {DATA_FILE}")

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        products = json.load(f)

    os.makedirs(PRODUCTS_DIR, exist_ok=True)

    slugs = []
    for p in products:
        slug = (p.get("slug") or "").strip()
        if not slug:
            continue
        slugs.append(slug)
        out_dir = os.path.join(PRODUCTS_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(product_page_html(p))

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write(make_sitemap(slugs))

    rules = [f"/{s}    /products/{s}/   301" for s in slugs]
    rules.append("/*    /index.html   200")
    with open("_redirects", "w", encoding="utf-8") as f:
        f.write("\n".join(rules) + "\n")

    print(f"Generated {len(slugs)} product pages.")

if __name__ == "__main__":
    main()
