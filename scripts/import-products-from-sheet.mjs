import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, "products.json");

// Your Google Sheet
const SHEET_ID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
const SHEET_TAB = "External"; // change if your tab name differs

// Works when sheet is viewable (public/shared)
const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;

function normalizeNewlines(s) {
  return String(s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function splitImages(s) {
  const raw = normalizeNewlines(s);
  if (!raw) return [];
  // Support comma-separated OR newline separated
  return raw
    .split(/,|\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function splitTags(s) {
  const raw = normalizeNewlines(s);
  if (!raw) return [];
  return raw
    .split(/,|\n/)
    .map(x => x.trim())
    .filter(Boolean);
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

function makeShort(desc) {
  const d = normalizeNewlines(desc);
  if (!d) return "";
  const firstLine = d.split("\n").map(x => x.trim()).filter(Boolean)[0] || "";
  return firstLine.length > 140 ? firstLine.slice(0, 137) + "..." : firstLine;
}

// Robust CSV parser (handles quotes/commas)
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

  row.push(cur);
  rows.push(row);

  if (rows.length && rows[rows.length - 1].every(c => String(c).trim() === "")) {
    rows.pop();
  }
  return rows;
}

async function main() {
  console.log("Fetching products from:", CSV_URL);

  const res = await fetch(CSV_URL, { headers: { "user-agent": "sqframes-importer" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet CSV (${res.status}). Make sure the sheet/tab is accessible.`);
  }

  const csv = await res.text();
  const rows = parseCSV(csv);
  if (!rows.length) throw new Error("CSV returned no rows.");

  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name);

  // Expected columns (case-insensitive)
  // slug, name, category, description, dimensions, price, images, tags
  const products = [];
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];

    const get = (col) => {
      const i = idx(col);
      return i >= 0 ? (cells[i] ?? "") : "";
    };

    const name = String(get("name")).trim();
    const slugRaw = String(get("slug")).trim();
    const slug = slugRaw || slugifyFallback(name);

    if (!slug || !name) continue; // require at least slug+name

    if (seen.has(slug)) continue;
    seen.add(slug);

    const category = String(get("category")).trim();
    const description = normalizeNewlines(get("description"));
    const dimensions = normalizeNewlines(get("dimensions"));
    const price = String(get("price")).trim();
    const images = splitImages(get("images"));
    const tags = splitTags(get("tags"));

    products.push({
      slug,
      name,
      category,
      price,
      description,
      short: makeShort(description),
      dimensions,
      images,
      tags
    });
  }

  // Stable ordering (helps diffs)
  products.sort((a, b) => a.name.localeCompare(b.name, "en"));

  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2) + "\n", "utf8");
  console.log(`Wrote ${products.length} products -> products.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
