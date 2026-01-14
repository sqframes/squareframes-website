export async function onRequestGet({ request }) {
  const site = "https://sqframes.com";

  // Same sheet as your site
  const sheetID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
  const sheetName = "Sheet1";
  const dataURL = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;

  // Static pages you always want in the sitemap
  const staticUrls = [
    { loc: `${site}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${site}/about.html`, changefreq: "monthly", priority: "0.7" },
    { loc: `${site}/contact.html`, changefreq: "monthly", priority: "0.7" },
    { loc: `${site}/faq.html`, changefreq: "monthly", priority: "0.6" }
  ];

  let productUrls = [];

  try {
    const res = await fetch(dataURL, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
    const data = await res.json();

    // Collect unique slugs
    const slugs = [...new Set((data || [])
      .map(x => String(x.slug || "").trim())
      .filter(Boolean)
    )];

    productUrls = slugs.map(slug => ({
      loc: `${site}/p/${encodeURIComponent(slug)}`,
      changefreq: "weekly",
      priority: "0.7"
    }));
  } catch (e) {
    // If sheet fetch fails, still return static sitemap (better than breaking)
    productUrls = [];
  }

  const all = [...staticUrls, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      // cache a little (Cloudflare edge), but not too long
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
