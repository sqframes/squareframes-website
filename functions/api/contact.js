export async function onRequestGet() {
  return json({ ok: true, message: "Contact API online. POST JSON to /api/contact to send." }, 200);
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "Invalid content type (expected application/json)" }, 415);
    }

    const data = await request.json();

    // Optional honeypot: if you add a hidden field "website" in your forms, bots fill it
    if (data.website && String(data.website).trim() !== "") {
      return json({ ok: true }, 200);
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const location = String(data.location || "").trim();
    const message = String(data.message || "").trim();
    const product = String(data.product || "").trim();
    const page = String(data.page || "").trim();

    if (!name || !email || !message) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Invalid email" }, 400);
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return json({ ok: false, error: "Missing RESEND_API_KEY in Cloudflare Pages env vars" }, 500);
    }

    // Your requirements:
    // - Sender: admin@sqframes.com (must be verified in Resend)
    // - To: admin@sqframes.com
    // - CC: customer email
    // - Reply-To: customer email (so Reply goes to them)
    const fromAddress = "Square Frames <admin@sqframes.com>";
    const toAddress = "admin@sqframes.com";

    const subject = product
      ? `Enquiry: ${product} (${name})`
      : `Website enquiry (Square Frames) - ${name}`;

    const textBody =
`Name: ${name}
Email: ${email}
Location: ${location || "-"}

Item: ${product || "-"}
Page: ${page || "-"}

Message:
${message}`;

    const htmlBody = `
      <h2>Square Frames Website Enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
         <strong>Email:</strong> ${escapeHtml(email)}<br/>
         <strong>Location:</strong> ${escapeHtml(location || "-")}<br/>
         <strong>Item:</strong> ${escapeHtml(product || "-")}<br/>
         <strong>Page:</strong> ${escapeHtml(page || "-")}</p>
      <hr/>
      <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
    `;

    // Resend Send Email endpoint:
    // Base: https://api.resend.com
    // Auth: Authorization: Bearer re_...
    // Docs: Resend API intro + examples :contentReference[oaicite:3]{index=3}
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        cc: [email],
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    const respText = await resp.text().catch(() => "");
    if (!resp.ok) {
      return json(
        {
          ok: false,
          error: "Resend rejected the send",
          status: resp.status,
          details: respText.slice(0, 2000),
        },
        502
      );
    }

    // Resend returns JSON on success (id, etc.). Not required, but handy.
    let parsed = null;
    try { parsed = JSON.parse(respText); } catch (_) {}

    return json({ ok: true, resend: parsed }, 200);
  } catch (e) {
    return json({ ok: false, error: "Server error", details: String(e) }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
