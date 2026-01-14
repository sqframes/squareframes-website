export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    // Honeypot spam check
    if (data.website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const { name, email, message, product, location, page } = data;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const resend = new fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Square Frames <admin@sqframes.com>",
        to: ["admin@sqframes.com"],
        reply_to: email,
        subject: `Website enquiry – ${product || "General"}`,
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Location:</strong> ${location || "-"}</p>
          <p><strong>Product:</strong> ${product || "-"}</p>
          <p><strong>Page:</strong> ${page || "-"}</p>
          <p><strong>Message:</strong><br/>${message}</p>
        `
      })
    });

    if (!resend.ok) {
      const err = await resend.text();
      return new Response(
        JSON.stringify({ ok: false, error: "Email send failed", details: err }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500 }
    );
  }
}
