export async function onRequestGet() {
  const base = "https://sqframes.com";

  const SHEET_ID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
  const SHEET_NAME = "Sheet1";

  let slugs = [];

  try {
    const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`, {
      headers: { accept: "application/json" }
    });
    if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
    const rows = await res.json();

    slugs = [...new Set(
      (rows || [])
        .map(r => String(r.slug || "").trim())
        .filter(Boolean)
    )];
  } catch (e) {
    slugs = [];
  }

  const staticUrls = [
    { loc: `${base}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${base}/about.html`, changefreq: "monthly", priority: "0.7" },
    { loc: `${base}/contact.html`, changefreq: "monthly", priority: "0.7" },
    { loc: `${base}/faq.html`, changefreq: "monthly", priority: "0.6" }
  ];

  const productUrls = slugs.map(s => ({
    loc: `${base}/p/${encodeURIComponent(s)}`,
    changefreq: "weekly",
    priority: "0.7"
  }));

  const all = [...staticUrls, ...productUrls];

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function escapeXml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
