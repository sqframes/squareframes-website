// site.js (DROP-IN)
// Works across index/about/faq.
// Opens overlay on any element with [data-open-inquiry]
// Provides global openInquiry() for product modal buttons
// Uses inert safely (whole page except overlay)

(function () {
  const overlay = document.getElementById("inquiry-form-overlay");
  const form = document.getElementById("inquiryForm");
  if (!overlay) return;

  let lastActiveEl = null;

  function setPageInert(on) {
    // Make everything except overlay inert
    const kids = Array.from(document.body.children);
    for (const el of kids) {
      if (el === overlay) continue;

      if (on) {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      } else {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
    }
  }

  function openOverlay(productName = "") {
    lastActiveEl = document.activeElement;

    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    setPageInert(true);

    const prod = document.getElementById("form-product");
    if (prod && productName) prod.value = productName;

    const first = document.getElementById("form-name");
    if (first) setTimeout(() => first.focus(), 30);
  }

  function closeOverlay() {
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    setPageInert(false);

    // Restore focus where user was
    if (lastActiveEl && typeof lastActiveEl.focus === "function") {
      setTimeout(() => lastActiveEl.focus(), 30);
    }
  }

  // expose globals
  window.openInquiry = openOverlay;
  window.openInquiryForm = openOverlay;
  window.closeInquiry = closeOverlay;
  window.closeInquiryForm = closeOverlay;

  // click-to-open
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-inquiry]");
    if (!trigger) return;
    e.preventDefault();
    openOverlay("");
  });

  // close on backdrop
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  // close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") closeOverlay();
  });

  // Submit handler
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        product: document.getElementById("form-product")?.value || "",
        name: document.getElementById("form-name")?.value || "",
        email: document.getElementById("form-email")?.value || "",
        location: document.getElementById("form-location")?.value || "",
        message: document.getElementById("form-msg")?.value || "",
        page: window.location.href,
        website: document.getElementById("form-website")?.value || ""
      };

      const toastEl = document.getElementById("toast");
      const toast = (msg, ms = 2600) => {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.style.display = "block";
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => (toastEl.style.display = "none"), ms);
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
          e.target.reset();
          closeOverlay();
        } else {
          toast("Send failed. Please email admin@sqframes.com", 6000);
          console.error(out);
        }
      } catch (err) {
        console.error(err);
        toast("Send failed. Please email admin@sqframes.com", 6000);
      }
    });
  }
})();
