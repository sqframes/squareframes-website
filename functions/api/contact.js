// /functions/api/contact.js
// Cloudflare Pages Function: handles POST /api/contact
// Sends enquiry email via Resend HTTP API (no npm packages).

export async function onRequestPost({ request, env }) {
  try {
    // Only allow JSON
    const ct = request.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("application/json")) {
      return json({ ok: false, error: "Expected application/json" }, 415);
    }

    const body = await request.json().catch(() => ({}));

    // Honeypot (silently accept bots)
    if (body.website && String(body.website).trim() !== "") {
      return json({ ok: true });
    }

    const name = safe(body.name);
    const email = safe(body.email);
    const message = safe(body.message);
    const product = safe(body.product);
    const location = safe(body.location);
    const page = safe(body.page);

    if (!name || !email || !message) {
      return json({ ok: false, error: "Missing fields" }, 400);
    }

    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: "Missing RESEND_API_KEY env var" }, 500);
    }

    // IMPORTANT:
    // Resend requires FROM to be an address on a verified sending domain.
    // You asked to use admin@sqframes.com as the sender:
    const from = "Square Frames <admin@sqframes.com>";
    const to = ["admin@sqframes.com"];

    const subject = product
      ? `Quote Request: ${product} — ${name}`
      : `New Enquiry — ${name}`;

    const plain = [
      "Square Frames Enquiry",
      "",
      product ? `Product: ${product}` : null,
      `Name: ${name}`,
      `Email: ${email}`,
      location ? `Location: ${location}` : null,
      page ? `Page: ${page}` : null,
      "",
      "Message:",
      message
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0;">Square Frames Enquiry</h2>
        ${product ? `<p><strong>Product:</strong> ${escapeHtml(product)}</p>` : ""}
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ""}
        ${page ? `<p><strong>Page:</strong> ${escapeHtml(page)}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eee;margin:14px 0"/>
        <p style="white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
      </div>
    `;

    // Send email via Resend HTTP API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        cc: email ? [email] : undefined,     // CC the customer (as requested)
        subject,
        html,
        text: plain,
        reply_to: email                      // Reply goes to the customer
      })
    });

    const out = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      return json(
        {
          ok: false,
          error: "Resend rejected request",
          details: out
        },
        502
      );
    }

    return json({ ok: true, id: out.id || null });
  } catch (err) {
    // Cloudflare logs will show this in Pages Functions logs
    console.error(err);
    return json({ ok: false, error: "Server error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(stripUndefined(data)), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function safe(v) {
  return String(v ?? "").trim();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripUndefined(obj) {
  // Remove undefined keys so JSON.stringify doesn't include them in some runtimes
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}
