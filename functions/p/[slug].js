export async function onRequestGet({ params, request }) {
  const slug = (params?.slug || "").toString().trim();

  const site = "https://sqframes.com";
  const sheetID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
  const sheetName = "Sheet1";
  const dataURL = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;

  const fallbackTitle = "Square Frames | Hardware, Timber, Tools & OHS Supplies in Fiji";
  const fallbackDesc =
    "Square Frames supplies hardware, tools, timber products, OHS safety equipment, cleaning supplies, and services across Fiji.";
  const fallbackImg = `${site}/images/tab_icon.png`;

  const canonical = slug ? `${site}/p/${encodeURIComponent(slug)}` : `${site}/`;

  if (!slug) {
    return html(
      renderBasic({
        title: fallbackTitle,
        desc: fallbackDesc,
        img: fallbackImg,
        canonical: `${site}/`
      })
    );
  }

  let item = null;
  try {
    const res = await fetch(dataURL, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();

    const want = normSlug(slug);
    item =
      (data || []).find((x) => normSlug(x?.slug) === want) ||
      (data || []).find((x) => String(x?.slug || "").trim() === slug) ||
      null;
  } catch {
    return html(renderBasic({ title: fallbackTitle, desc: fallbackDesc, img: fallbackImg, canonical }));
  }

  if (!item) {
    return html(
      renderBasic({
        title: `Not found | Square Frames`,
        desc: "This item may have been renamed or removed. Browse the Square Frames catalogue.",
        img: fallbackImg,
        canonical
      })
    );
  }

  const name = clean(item.name) || "Product";
  const category = clean(item.category);
  const img = absolutize(firstImage(item.images) || fallbackImg, site);

  const descLine = firstLine(item.description);
  const desc = truncate(
    descLine ||
      `${name}${category ? " – " + category : ""}. Request a quote from Square Frames (Suva), servicing all of Fiji.`,
    155
  );

  // Visible details
  const dims = splitLines(item.dimensions || item.Dimensions);
  const bullets = splitLines(item.description);

  // Product schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: [img],
    description: clean(item.description) || desc,
    brand: { "@type": "Brand", name: "Square Frames" },
    ...(category ? { category } : {}),
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "FJD",
      price: clean(item.price).replace(/[^0-9.]/g, "") || "0",
      url: canonical
    }
  };

  // Redirect real users to your interactive catalogue page (after OG tags are read)
  // Most social crawlers ignore JS; humans will be redirected.
  const catalogueUrl = `${site}/${encodeURIComponent(slug)}`;

  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>

  <title>${e(`${name} | Square Frames`)}</title>
  <link rel="canonical" href="${e(canonical)}"/>
  <meta name="description" content="${e(desc)}"/>
  <meta name="robots" content="index,follow"/>

  <!-- Open Graph (Social previews) -->
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Square Frames"/>
  <meta property="og:url" content="${e(canonical)}"/>
  <meta property="og:title" content="${e(name + " | Square Frames")}"/>
  <meta property="og:description" content="${e(desc)}"/>
  <meta property="og:image" content="${e(img)}"/>

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${e(name + " | Square Frames")}"/>
  <meta name="twitter:description" content="${e(desc)}"/>
  <meta name="twitter:image" content="${e(img)}"/>

  <link rel="stylesheet" href="/style.css"/>
  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>

  <!-- Human redirect to live catalogue -->
  <meta http-equiv="refresh" content="1;url=${e(catalogueUrl)}" />
  <script>
    // redirect humans quickly; bots typically ignore JS
    setTimeout(function(){ window.location.href = ${JSON.stringify(catalogueUrl)}; }, 150);
  </script>
</head>
<body>
  <header class="header">
    <a class="brand" href="/" aria-label="Square Frames Home">
      <img src="/images/sqf_logo_transparent.png" alt="Square Frames">
    </a>
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/about.html">About</a>
      <a href="/faq.html">FAQ</a>
      <a href="/contact.html#enquiry">Contact</a>
      <a class="cta" href="/contact.html#enquiry">Request Quote</a>
    </nav>
  </header>

  <main class="wrap">
    <div class="crumbs"><a href="/">Home</a> <span>›</span> <span>${e(category || "Product")}</span></div>

    <section class="pHero">
      <h1>${e(name)}</h1>
      <p class="pMeta">${e(desc)}</p>
      <p class="pMeta"><a href="${e(catalogueUrl)}">Open this product →</a></p>
    </section>

    <section class="pGrid">
      <div class="pMedia">
        <img src="${e(img)}" alt="${e(name)}" />
      </div>

      <div class="pPanel">
        ${category ? `<div class="pill">${e(category)}</div>` : ""}

        ${dims.length ? `
          <h2>Details</h2>
          <div class="pills">${dims.map(d => `<span class="pill dark">${e(d)}</span>`).join("")}</div>
        ` : ""}

        ${bullets.length ? `
          <h2>Highlights</h2>
          <ul class="bullets">${bullets.map(b => `<li>${e(b)}</li>`).join("")}</ul>
        ` : ""}

        <div class="actions">
          <a class="cta wide" href="/contact.html#enquiry">Request Quote</a>
          <a class="btn wide" href="${e(catalogueUrl)}">View in catalogue</a>
        </div>

        <!-- ✅ Removed:
             - Call +679 button
             - "Include quantities..." note
        -->
      </div>
    </section>

    <section class="pMore">
      <h2>Browse more products</h2>
      <p><a href="/">View the full catalogue →</a></p>
    </section>
  </main>

  <footer class="footer">
    <strong>Square Frames</strong> · Servicing all of Fiji<br/>
    Phone: <a href="tel:+6797855919">+679 785 5919</a> · Email: <a href="mailto:admin@sqframes.com">admin@sqframes.com</a><br/>
    &copy; 2026 Square Frames. All rights reserved.
  </footer>
</body>
</html>`;

  return html(page);
}

function html(body) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

function renderBasic({ title, desc, img, canonical }) {
  return `<!doctype html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${e(title)}</title>
<link rel="canonical" href="${e(canonical)}"/>
<meta name="description" content="${e(desc)}"/><meta name="robots" content="index,follow"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="Square Frames"/>
<meta property="og:url" content="${e(canonical)}"/><meta property="og:title" content="${e(title)}"/>
<meta property="og:description" content="${e(desc)}"/><meta property="og:image" content="${e(img)}"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${e(img)}"/>
<link rel="stylesheet" href="/style.css"/>
</head><body>
<header class="header"><a class="brand" href="/"><img src="/images/sqf_logo_transparent.png" alt="Square Frames"></a></header>
<main class="wrap"><h1>${e(title)}</h1><p>${e(desc)}</p><p><a href="/">Open catalogue →</a></p></main>
</body></html>`;
}

function normSlug(v) {
  return String(v || "").trim().toLowerCase();
}

function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function truncate(s, n) {
  s = clean(s);
  return s.length > n ? s.slice(0, n - 1).trim() + "…" : s;
}

function firstLine(desc) {
  return splitLines(desc)[0] || "";
}

function splitLines(v) {
  return String(v || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function firstImage(images) {
  // supports comma OR newline separated
  return String(images || "")
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean)[0] || "";
}

function absolutize(u, site) {
  u = String(u || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return site + u;
  return site + "/" + u;
}

function e(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
