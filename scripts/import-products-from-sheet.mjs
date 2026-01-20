/**
 * scripts/import-products-from-sheet.mjs
 *
 * Pulls product rows from your Google Sheet (tab: External) and writes products.json
 *
 * Usage:
 *   node scripts/import-products-from-sheet.mjs
 *
 * Notes:
 * - Sheet must be viewable (public or shared in a way that CSV export works)
 * - Reads columns: slug, name, category, description, dimensions, price, images, tags
 */

import fs from "node:fs";
import path from "node:path";

const SHEET_ID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
const SHEET_TAB = "External"; // seen in your sheet UI
const OUT_FILE = path.join(process.cwd(), "products.json");

// Google "gviz" CSV export (works for viewable sheets)
const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;

function normalizeNewlines(s) {
  return String(s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function splitImages(s) {
  // images in your sheet are comma-separated; some have spaces after commas
  const raw = normalizeNewlines(s);
  if (!raw) return [];
  return raw
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function splitTags(s) {
  // tags might be comma-separated or newline-separated
  const raw = normalizeNewlines(s);
  if (!raw) return [];
  return raw
    .split(/,|\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function makeShort(desc) {
  const d = normalizeNewlines(desc);
  if (!d) return "";
  // Use first non-empty line as "short"
  const firstLine = d.split("\n").map(x => x.trim()).filter(Boolean)[0] || "";
  // Keep short from becoming huge
  return firstLine.length > 140 ? firstLine.slice(0, 137) + "..." : firstLine;
}

// Minimal CSV parser that handles quoted fields + commas correctly
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        cur += ch;
      }
    }
  }

  // last cell
  row.push(cur);
  rows.push(row);

  // remove trailing empty last row
  if (rows.length && rows[rows.length - 1].every(c => String(c).trim() === "")) {
    rows.pop();
  }
  return rows;
}

function slugifyFallback(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanPrice(p) {
  const s = String(p ?? "").trim();
  // keep as-is; you have both "Contact for Price" and "$125.00"
  return s;
}

async function main() {
  console.log("Fetching CSV:", CSV_URL);

  const res = await fetch(CSV_URL, {
    headers: { "user-agent": "sqframes-importer" }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sheet CSV (${res.status})`);
  }

  const csv = await res.text();
  const rows = parseCSV(csv);

  if (!rows.length) throw new Error("CSV returned no rows.");

  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name);

  const required = ["slug", "name", "category", "description", "dimensions", "price", "images", "tags"];
  for (const col of required) {
    if (idx(col) === -1) {
      console.warn(`Warning: Missing expected column "${col}" in sheet header.`);
    }
  }

  const products = [];
  const seenSlugs = new Set();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (col) => {
      const i = idx(col);
      return i >= 0 ? (cells[i] ?? "") : "";
    };

    const name = String(get("name")).trim();
    const slugRaw = String(get("slug")).trim();
    const slug = slugRaw || slugifyFallback(name);
    const category = String(get("category")).trim();
    const description = normalizeNewlines(get("description"));
    const dimensions = normalizeNewlines(get("dimensions"));
    const price = cleanPrice(get("price"));
    const images = splitImages(get("images"));
    const tags = splitTags(get("tags"));

    if (!name && !slug) continue;

    const finalSlug = slug || slugifyFallback(name);
    if (!finalSlug) continue;

    if (seenSlugs.has(finalSlug)) {
      console.warn(`Duplicate slug "${finalSlug}" (row ${r + 1}) — skipping duplicate.`);
      continue;
    }
    seenSlugs.add(finalSlug);

    products.push({
      slug: finalSlug,
      name: name || finalSlug,
      category: category || "",
      short: makeShort(description),
      description: description || "",
      dimensions: dimensions || "",
      price: price || "",
      images: images,
      tags: tags
    });
  }

  // Stable sort (helps diffs)
  products.sort((a, b) => a.name.localeCompare(b.name, "en"));

  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2) + "\n", "utf8");
  console.log(`Wrote ${products.length} products -> ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
