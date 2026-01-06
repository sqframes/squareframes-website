export async function onRequestGet() {
  return new Response(
    JSON.stringify({ ok: true, message: "Contact API is online. Send POST JSON to /api/contact." }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "Invalid content type (expected application/json)" }, 415);
    }

    const data = await request.json();

    // Honeypot support (optional)
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

    // Use a REAL mailbox as sender (you requested admin@sqframes.com)
    const fromAddress = "admin@sqframes.com";
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

    const mcPayload = {
      personalizations: [
        {
          to: [{ email: toAddress }],
          cc: [{ email }], // CC the user (as requested)
        },
      ],
      from: { email: fromAddress, name: "Square Frames" },
      reply_to: { email, name }, // Reply goes to customer
      subject,
      content: [
        { type: "text/plain", value: textBody },
        { type: "text/html", value: htmlBody },
      ],
    };

    const apiKey = env.MAILCHANNELS_API_KEY;
    if (!apiKey) {
      return json({ ok: false, error: "Missing MAILCHANNELS_API_KEY in Cloudflare Pages env vars" }, 500);
    }

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(mcPayload),
    });

    const respText = await resp.text().catch(() => "");
    if (!resp.ok) {
      return json(
        { ok: false, error: "MailChannels rejected the send", status: resp.status, details: respText.slice(0, 2000) },
        502
      );
    }

    return json({ ok: true }, 200);
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
