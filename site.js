/* site.js - shared overlay + enquiry submit (Resend backend) */

(function () {
  const overlayId = "inquiry-form-overlay";
  const overlay = document.getElementById(overlayId);
  const toastEl = document.getElementById("toast");
  const pageRoot = document.querySelector("main") || document.body;

  function toast(msg, ms = 2600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.style.display = "none"), ms);
  }

  function setInert(on) {
    // avoids aria-hidden warnings + keeps focus accessible
    try {
      if (on) pageRoot.setAttribute("inert", "");
      else pageRoot.removeAttribute("inert");
    } catch {}
  }

  function openInquiry(productName) {
    if (!overlay) return;
    // Set product if provided
    const prod = overlay.querySelector("#form-product");
    if (prod && typeof productName === "string") prod.value = productName;

    overlay.style.display = "flex";
    document.body.classList.add("modal-open");
    setInert(true);

    // focus first field
    const first = overlay.querySelector("#form-name") || overlay.querySelector("input,textarea,button");
    if (first) setTimeout(() => first.focus(), 10);
  }

  function closeInquiry() {
    if (!overlay) return;
    overlay.style.display = "none";
    document.body.classList.remove("modal-open");
    setInert(false);
  }

  // Expose for index.html product modal button
  window.openInquiry = openInquiry;
  window.closeInquiry = closeInquiry;

  // Header button(s): <a data-open-inquiry ...>
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-inquiry]");
    if (!btn) return;
    e.preventDefault();
    openInquiry(btn.getAttribute("data-product") || "");
  });

  // Close on backdrop click
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeInquiry();
    });
  }

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.style.display === "flex") closeInquiry();
  });

  // Shared submit handler for BOTH overlay and inline forms
  async function handleSubmit(form, opts = {}) {
    const get = (sel) => form.querySelector(sel);
    const payload = {
      product: (get("#form-product") || get("[name='product']") || {}).value || "",
      name: (get("#form-name") || get("[name='name']") || {}).value || "",
      email: (get("#form-email") || get("[name='email']") || {}).value || "",
      location: (get("#form-location") || get("[name='location']") || {}).value || "",
      message: (get("#form-msg") || get("[name='message']") || {}).value || "",
      page: window.location.href,
      website: (get("#form-website") || get("[name='website']") || {}).value || "" // honeypot
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const out = await res.json().catch(() => ({}));

      if (res.ok && out.ok) {
        toast("Sent! We’ll get back to you shortly.");
        form.reset();
        if (opts.closeOverlay) closeInquiry();
        return;
      }

      const details = out && (out.error || out.details)
        ? (out.error + (out.details ? "\n\n" + JSON.stringify(out.details).slice(0, 500) : ""))
        : "Unknown error";

      toast("Send failed.\n\n" + details, 6500);
      console.error(out);
    } catch (err) {
      toast("Send failed.\n\nPlease email admin@sqframes.com", 6500);
      console.error(err);
    }
  }

  // Wire overlay form
  const overlayForm = document.getElementById("inquiryForm");
  if (overlayForm) {
    overlayForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubmit(overlayForm, { closeOverlay: true });
    });
  }

  // Wire any inline enquiry form: class="js-enquiry-form"
  document.querySelectorAll("form.js-enquiry-form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubmit(f, { closeOverlay: false });
    });
  });
})();
