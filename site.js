// site.js (DROP-IN)
// Works across index/about/faq.
// Opens overlay on any element with [data-open-inquiry]
// Provides global openInquiry() for product modal buttons
// Fixes aria-hidden focus warnings using inert

(function () {
  const overlay = document.getElementById("inquiry-form-overlay");
  const form = document.getElementById("inquiryForm");

  if (!overlay) return;

  const pageRoot = document.querySelector("main") || document.body;

  function setInert(on) {
    // prevent aria-hidden console warning + block focus behind overlay
    if (on) {
      pageRoot.setAttribute("inert", "");
      pageRoot.setAttribute("aria-hidden", "true");
    } else {
      pageRoot.removeAttribute("inert");
      pageRoot.removeAttribute("aria-hidden");
    }
  }

  function openOverlay(productName = "") {
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    setInert(true);

    const prod = document.getElementById("form-product");
    if (prod && productName) prod.value = productName;

    const first = document.getElementById("form-name");
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeOverlay() {
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    setInert(false);
  }

  // expose globals (so your existing HTML can call them if needed)
  window.openInquiry = openOverlay;
  window.openInquiryForm = openOverlay;
  window.closeInquiry = closeOverlay;
  window.closeInquiryForm = closeOverlay;

  // click-to-open for buttons/links
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

  // Submit handler (works everywhere)
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

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        const out = await res.json().catch(() => ({}));

        const toastEl = document.getElementById("toast");
        const toast = (msg, ms = 2600) => {
          if (!toastEl) return;
          toastEl.textContent = msg;
          toastEl.style.display = "block";
          clearTimeout(toastEl._t);
          toastEl._t = setTimeout(() => (toastEl.style.display = "none"), ms);
        };

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
        const toastEl = document.getElementById("toast");
        if (toastEl) {
          toastEl.textContent = "Send failed. Please email admin@sqframes.com";
          toastEl.style.display = "block";
        }
      }
    });
  }
})();
