const dotenv = require("dotenv");
const sendEmail = require("../sendEmail");

dotenv.config();

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, text, html, from } = req.body || {};

  if (!to || !subject) {
    return res.status(400).json({ error: "'to' and 'subject' are required" });
  }

  try {
    const info = await sendEmail({ to, subject, text, html, from });
    return res.status(200).json({ message: "Email sent", messageId: info.messageId });
  } catch (error) {
    console.error("[Mailer] sendEmail error", error);
    return res.status(500).json({ error: error.message });
  }
};
