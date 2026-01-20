// site.js (CLEAN DROP-IN)
(function () {
  const overlay = document.getElementById("inquiry-form-overlay");
  const form = document.getElementById("inquiryForm");
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
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    setInert(true);

    const prod = document.getElementById("form-product");
    if (prod && productName) prod.value = productName;

    const first = document.getElementById("form-name");
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeOverlay() {
    if (!overlay) return;
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

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.style.display === "flex") closeOverlay();
    });
  }

  if (form && overlay) {
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

  // ==========================
  // Simple product image carousel (no layout changes)
  // ==========================
  function initCarousels() {
    const carousels = document.querySelectorAll("[data-carousel]");
    carousels.forEach((root) => {
      let images = [];
      try {
        images = JSON.parse(root.getAttribute("data-images") || "[]");
      } catch {
        images = [];
      }

      images = (images || []).map(String).filter(Boolean);
      if (!images.length) return;

      const imgEl = root.querySelector("img");
      const prevBtn = root.querySelector("[data-carousel-prev]");
      const nextBtn = root.querySelector("[data-carousel-next]");
      if (!imgEl) return;

      let i = 0;
      function render() {
        imgEl.classList.add("is-fading");
        const src = images[i];
        imgEl.src = src;
        imgEl.addEventListener(
          "load",
          () => {
            requestAnimationFrame(() => imgEl.classList.remove("is-fading"));
          },
          { once: true }
        );

        if (prevBtn) prevBtn.disabled = images.length <= 1;
        if (nextBtn) nextBtn.disabled = images.length <= 1;
      }

      function prev() {
        i = (i - 1 + images.length) % images.length;
        render();
      }
      function next() {
        i = (i + 1) % images.length;
        render();
      }

      prevBtn?.addEventListener("click", prev);
      nextBtn?.addEventListener("click", next);

      // Swipe support
      let startX = 0;
      let startY = 0;
      let tracking = false;

      root.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          tracking = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        },
        { passive: true }
      );

      root.addEventListener(
        "touchend",
        (e) => {
          if (!tracking) return;
          tracking = false;
          const t = e.changedTouches[0];
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy)) return;
          if (dx > 0) prev();
          else next();
        },
        { passive: true }
      );

      render();
    });
  }

  initCarousels();
})();
