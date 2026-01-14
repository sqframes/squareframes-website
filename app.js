// app.js — minimal catalogue loader (Google Sheets → cards)
const sheetID = "1g5GT6RsbSW4qpfzcUbd1_mrdcakjRiylB5fzsmTMaD0";
const sheetName = "Sheet1";
const dataURL = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;

const grid = document.getElementById("grid");
const q = document.getElementById("q");
const cat = document.getElementById("cat");

let items = [];

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function firstImage(images) {
  const p = String(images || "").split(",").map(x => x.trim()).filter(Boolean);
  return p[0] || "/images/tab_icon.png";
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = `<div class="loading">No items found.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const name = esc(p.name);
    const category = esc(p.category);
    const slug = esc(p.slug);
    const img = esc(firstImage(p.images));
    const descLine = esc(String(p.description || "").split("\n")[0] || "");

    return `
      <article class="card">
        <a class="cardLink" href="/p/${slug}" aria-label="${name}">
          <img class="thumb" src="${img}" alt="${name}${category ? " - " + category : ""}" loading="lazy">
          <div class="cardBody">
            <div class="metaRow">
              ${category ? `<span class="pill">${category}</span>` : ""}
            </div>
            <h3 class="title">${name}</h3>
            ${descLine ? `<p class="desc">${descLine}</p>` : ""}
          </div>
        </a>
      </article>
    `;
  }).join("");
}

function applyFilters() {
  const term = (q.value || "").trim().toLowerCase();
  const c = (cat.value || "").trim();

  const filtered = items.filter(p => {
    const nm = String(p.name || "").toLowerCase();
    const cg = String(p.category || "");
    return (!term || nm.includes(term)) && (!c || cg === c);
  });

  render(filtered);
}

fetch(dataURL)
  .then(r => r.json())
  .then(data => {
    items = (data || []).map(x => ({
      name: x.name || "",
      slug: x.slug || "",
      category: x.category || "",
      description: x.description || "",
      images: x.images || "",
      price: x.price || "",
      dimensions: x.dimensions || x.Dimensions || ""
    })).filter(x => x.slug && x.name);

    // categories
    const cats = [...new Set(items.map(x => x.category).filter(Boolean))].sort();
    cat.innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option>${esc(c)}</option>`).join("");

    render(items);

    q.addEventListener("input", applyFilters);
    cat.addEventListener("change", applyFilters);
  })
  .catch(() => {
    grid.innerHTML = `<div class="loading">System error loading catalogue.</div>`;
  });
