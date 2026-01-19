/* site.js — shared inquiry overlay + submit handler + accessibility polish
   Works on: index.html, about.html, faq.html (any page that has #inquiry-form-overlay + #inquiryForm)
*/

(function () {
  const overlay = document.getElementById("inquiry-form-overlay");
  const form = document.getElementById("inquiryForm");

  // If a page doesn't have the overlay, do nothing safely.
  if (!overlay || !form) return;

  const productInput = document.getElementById("form-product");
  const websiteInput = document.getElementById("form-website"); // honeypot
  const nameInput = document.getElementById("form-name");
  const emailInput = document.getElementById("form-email");
  const locationInput = document.getElementById("form-location");
  const msgInput = document.getElementById("form-msg");

  const toastEl = document.getElementById("toast");
  const pageMain = document.querySelector("main") || document.body;

  let lastFocusEl = null;

  function toast(msg, ms = 3000) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.style.display = "none";
    }, ms);
  }

  function setInert(on) {
    // Prevents "Blocked aria-hidden..." warnings by using inert
    // (supported in modern Chromium; harmless elsewhere)
    if (on) {
      pageMain.setAttribute("inert", "");
      pageMain.setAttribute("aria-hidden", "true");
    } else {
      pageMain.removeAttribute("inert");
      pageMain.removeAttribute("aria-hidden");
    }
  }

  function openInquiry(productName) {
    lastFocusEl = document.activeElement;

    // Set product
    if (productInput) productInput.value = String(productName || "").trim();

    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setInert(true);

    // focus first field
    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 0);
  }

  function closeInquiry() {
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
    setInert(false);

    // restore focus
    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      setTimeout(() => lastFocusEl.focus(), 0);
    }
  }

  // Expose for inline calls (your product modal uses openInquiry(...))
  window.openInquiry = openInquiry;
  window.closeInquiry = closeInquiry;

  // Open buttons: any element with [data-open-inquiry]
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-inquiry]");
    if (!btn) return;
    e.preventDefault();
    openInquiry(productInput ? productInput.value : "");
  });

  // Close on backdrop click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeInquiry();
  });

  // Close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") closeInquiry();
  });

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      product: productInput ? productInput.value : "",
      name: nameInput ? nameInput.value : "",
      email: emailInput ? emailInput.value : "",
      location: locationInput ? locationInput.value : "",
      message: msgInput ? msgInput.value : "",
      page: window.location.href,
      website: websiteInput ? websiteInput.value : "" // honeypot
    };

    // Basic validation
    if (!payload.name.trim() || !payload.email.trim() || !payload.message.trim()) {
      toast("Please fill Name, Email and Message.", 3500);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const out = await res.json().catch(() => ({}));

      if (res.ok && out && out.ok) {
        toast("Sent! We’ll get back to you shortly.", 3200);
        form.reset();
        if (productInput && payload.product) productInput.value = payload.product; // keep product filled
        closeInquiry(); // ✅ closes overlay and user stays on same page
      } else {
        const msg =
          (out && out.error) ? out.error :
          "Send failed. Please email admin@sqframes.com";
        toast(msg, 6000);
        console.error(out);
      }
    } catch (err) {
      console.error(err);
      toast("Send failed. Please email admin@sqframes.com", 6000);
    }
  });

  // Default hidden
  overlay.setAttribute("aria-hidden", "true");
})();
