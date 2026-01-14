export async function onRequestPost({ request, env }) {
  // CORS (safe even if same-origin)
  const cors = {
    "access-control-allow-origin": "https://sqframes.com",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  try {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const data = await request.json().catch(() => null);
    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    // Honeypot
    if (data.website) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const message = (data.message || "").trim();
    const product = (data.product || "").trim();
    const location = (data.location || "").trim();
    const page = (data.page || "").trim();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing name/email/message" }),
        { status: 400, headers: { "content-type": "application/json", ...cors } }
      );
    }

    // ✅ Make sure the key exists
    if (!env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing RESEND_API_KEY in Cloudflare Pages (Production env vars).",
        }),
        { status: 500, headers: { "content-type": "application/json", ...cors } }
      );
    }

    // ✅ Use a Resend-safe FROM unless sqframes.com domain is verified in Resend
    // If you verified sqframes.com in Resend, you can change this to: "Square Frames <admin@sqframes.com>"
    const FROM = "Square Frames <onboarding@resend.dev>";

    const subject = `Website enquiry – ${product || "General"}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0">${escapeHtml(subject)}</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Location:</strong> ${escapeHtml(location || "-")}</p>
        <p><strong>Product:</strong> ${escapeHtml(product || "-")}</p>
        <p><strong>Page:</strong> ${escapeHtml(page || "-")}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    // ✅ THIS MUST BE await fetch(...) (NOT new fetch)
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: ["admin@sqframes.com"],
        reply_to: email,
        subject,
        html,
      }),
    });

    const text = await resendResp.text();

    if (!resendResp.ok) {
      // Return the real error so we can fix fast
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Resend rejected request",
          details: text,
        }),
        { status: 500, headers: { "content-type": "application/json", ...cors } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", ...cors },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        details: String(err && err.message ? err.message : err),
      }),
      { status: 500, headers: { "content-type": "application/json", ...cors } }
    );
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
