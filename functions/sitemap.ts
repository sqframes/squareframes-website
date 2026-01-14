export const onRequestGet: PagesFunction = async () => {
  const SHEET_ID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
  const SHEET_NAME = "Sheet1";

  const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`);
  const rows = await res.json();

  const base = "https://sqframes.com";

  const urls = rows
    .filter((r: any) => r.slug)
    .map((r: any) => `
      <url>
        <loc>${base}/p/${r.slug}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
    `)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/about.html</loc>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${base}/contact.html</loc>
    <priority>0.6</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
};
