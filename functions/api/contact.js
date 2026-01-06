const fromAddress = "admin@sqframes.com";
const toAddress = "admin@sqframes.com";

const mcPayload = {
  personalizations: [
    {
      to: [{ email: toAddress }],
      cc: [{ email }], // user copy (optional)
    },
  ],
  from: { email: fromAddress, name: "Square Frames" },
  reply_to: { email, name },
  subject,
  content: [
    { type: "text/plain", value: textBody },
    { type: "text/html", value: htmlBody },
  ],
};
