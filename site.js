/* site.js — Shared enquiry overlay + submit handler (works on ALL pages) */
(() => {
  const OVERLAY_ID = "inquiry-form-overlay";
  const TOAST_ID = "toast";

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function ensureToast() {
    let toast = document.getElementById(TOAST_ID);
    if (toast) return toast;

    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  }

  function toast(msg, ms = 2600) {
    const el = ensureToast();
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = "none"; }, ms);
  }

  function buildOverlayIfMissing() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="form-box">
        <button type="button" class="close-btn" data-close-inquiry
          style="position:absolute; top:16px; right:16px; background:none;"
          aria-label="Close">&times;</button>

        <h3 style="margin:0 0 18px 0; font-size:1.3rem;">Send an Enquiry</h3>

        <form id="inquiryForm">
          <input type="hidden" id="form-product" value="Website enquiry" />

          <!-- Honeypot -->
          <input type="text" id="form-website" value=""
            style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true" />

          <div class="form-group">
            <label for="form-name">Name</label>
            <input type="text" id="form-name" required placeholder="Your name" />
          </div>

          <div class="form-group">
            <label for="form-email">Email</label>
            <input type="email" id="form-email" required placeholder="you@company.com" />
          </div>

          <div class="form-group">
            <label for="form-location">Location (Optional)</label>
            <input type="text" id="form-location" placeholder="Fiji" />
          </div>

          <div class="form-group">
            <label for="form-msg">Message</label>
            <textarea id="form-msg" placeholder="Tell us what you need..." rows="4"></textarea>
          </div>

          <button type="submit" class="cta-btn">Email Square Frames</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function lockScroll(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function openInquiry(product = "") {
    const overlay = buildOverlayIfMissing();
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    lockScroll(true);

    const prod = document.getElementById("form-product");
    if (prod) prod.value = product ? String(product) : (prod.value || "Website enquiry");

    const first = document.getElementById("form-name");
    if (first) setTimeout(() => first.focus(), 60);
  }

  function closeInquiry() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    lockScroll(false);
  }

  // Expose for your product modal button: openInquiry("Product name")
  window.openInquiry = openInquiry;
  window.closeInquiry = closeInquiry;

  async function submitInquiry(form) {
    const payload = {
      product: qs("#form-product")?.value || "Website enquiry",
      name: qs("#form-name")?.value || "",
      email: qs("#form-email")?.value || "",
      location: qs("#form-location")?.value || "",
      message: qs("#form-msg")?.value || "",
      page: window.location.href,
      website: qs("#form-website")?.value || "" // honeypot
    };

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const out = await res.json().catch(() => ({}));
    return { res, out };
  }

  function bindOverlayBehavior() {
    const overlay = buildOverlayIfMissing();

    // Close button
    overlay.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close-inquiry]");
      if (closeBtn) closeInquiry();

      // Backdrop click
      if (e.target === overlay) closeInquiry();
    });

    // ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.style.display === "flex") closeInquiry();
    });

    // Form submit
    const form = qs("#inquiryForm", overlay);
    if (form && !form.dataset.bound) {
      form.dataset.bound = "1";
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const { res, out } = await submitInquiry(form);
          if (res.ok && out && out.ok) {
            toast("Sent! We’ll get back to you shortly.");
            form.reset();
            closeInquiry();
          } else {
            toast("Send failed.\n\nPlease email admin@sqframes.com", 6000);
            console.error(out);
          }
        } catch (err) {
          toast("Send failed.\n\nPlease email admin@sqframes.com", 6000);
          console.error(err);
        }
      });
    }
  }

  function bindOpeners() {
    // Any element with [data-open-inquiry] opens overlay
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open-inquiry]");
      if (!opener) return;

      e.preventDefault();
      const product = opener.getAttribute("data-product") || "";
      openInquiry(product);
    });
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    bindOverlayBehavior();
    bindOpeners();
  });
})();
