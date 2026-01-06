const fromAddress = "admin@sqframes.com";
const toAddress = "admin@sqframes.com";

const mcPayload = {
  personalizations: [
    {
      to: [{ email: toAddress }],
      cc: [{ email }], // user gets a copy
    },
  ],
  from: { email: fromAddress, name: "Square Frames" },
  reply_to: { email, name }, // reply goes to customer
  subject,
  content: [
    { type: "text/plain", value: textBody },
    { type: "text/html", value: htmlBody },
  ],
};
