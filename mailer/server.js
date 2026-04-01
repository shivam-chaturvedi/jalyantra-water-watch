const express = require("express");
const dotenv = require("dotenv");
const sendEmail = require("./sendEmail");

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, html, from } = req.body;

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
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`[Mailer] Listening on port ${port}`);
  });
}

module.exports = app;
