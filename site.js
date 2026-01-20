// site.js (CLEAN DROP-IN)
(function () {
  const overlay = document.getElementById("inquiry-form-overlay");
  const form = document.getElementById("inquiryForm");
  if (!overlay) return;

  const pageRoot = document.querySelector("main") || document.body;

  function setInert(on) {
    if (on) {
      pageRoot.setAttribute("inert", "");
      pageRoot.setAttribute("aria-hidden", "true");
    } else {
      pageRoot.removeAttribute("inert");
      pageRoot.removeAttribute("aria-hidden");
    }
  }

  function toast(msg, ms = 2600) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.style.display = "none"), ms);
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

  window.openInquiry = openOverlay;
  window.closeInquiry = closeOverlay;
  window.openInquiryForm = openOverlay;
  window.closeInquiryForm = closeOverlay;

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-inquiry]");
    if (!trigger) return;
    e.preventDefault();
    const product = trigger.getAttribute("data-product") || "";
    openOverlay(product);
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") closeOverlay();
  });

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
