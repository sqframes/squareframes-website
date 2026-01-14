export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot (optional)
    if (body.website && String(body.website).trim() !== "") {
      return json({ ok: true }); // silently accept bots
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

    // IMPORTANT: from must be @sqframes.com (your verified domain)
    const from = "Square Frames <admin@sqframes.com>";
    const to = ["admin@sqframes.com"];

    const subject = product
      ? `Quote Request: ${product} — ${name}`
      : `New Enquiry — ${name}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0;">Square Frames Enquiry</h2>
        ${product ? `<p><strong>Product:</strong> ${escapeHtml(product)}</p>` : ""}
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ""}
        ${page ? `<p><strong>Page:</strong> ${escapeHtml(page)}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eee;margin:14px 0"/>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `;

    // Send email via Resend HTTP API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        reply_to: email // lets you reply directly to the customer
        // If you want to CC the customer too, add:
        // cc: [email]
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
    console.error(err);
    return json({ ok: false, error: "Server error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function safe(v) {
  return String(v || "").trim();
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
