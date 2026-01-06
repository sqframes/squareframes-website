export async function onRequestPost(context) {
  try {
    const { request } = context;

    // Only allow JSON
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid content type" }), {
        status: 415,
        headers: { "content-type": "application/json" },
      });
    }

    const data = await request.json();

    // Basic honeypot (optional field; should be empty)
    if (data.website && String(data.website).trim() !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const location = String(data.location || "").trim();
    const message = String(data.message || "").trim();
    const product = String(data.product || "").trim();
    const page = String(data.page || "").trim();

    // Minimal validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Very light email sanity check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const fromAddress = "webquery@sqframes.com";
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

    // MailChannels Email API
    const mcPayload = {
      personalizations: [
        {
          to: [{ email: toAddress }],
          cc: [{ email }], // CC the user (as requested)
        },
      ],
      from: { email: fromAddress, name: "Square Frames Web Query" },
      reply_to: { email, name }, // makes "Reply" go to the user
      subject,
      content: [
        { type: "text/plain", value: textBody },
        { type: "text/html", value: htmlBody },
      ],
    };

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mcPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "Email send failed", details: errText }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
