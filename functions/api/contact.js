import { Resend } from "resend";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const { name, email, message } = body;
    if (!name || !email || !message) {
      return json({ ok: false, error: "Missing fields" }, 400);
    }

    const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Square Frames <noreply@sqframes.com>",
      to: ["admin@sqframes.com"],
      reply_to: email,
      subject: `New Enquiry from ${name}`,
      html: `
        <strong>Name:</strong> ${name}<br/>
        <strong>Email:</strong> ${email}<br/><br/>
        <strong>Message:</strong><br/>${message}
      `
    });

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "Server error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}
