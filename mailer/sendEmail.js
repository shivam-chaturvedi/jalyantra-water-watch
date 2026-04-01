const transporter = require("./transporter");

const sendEmail = async ({
  to,
  subject,
  text,
  html,
  from,
}) => {
  if (!to || !subject) {
    throw new Error("'to' and 'subject' are required to send an email");
  }

  const mailOptions = {
    from: from || process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
};

module.exports = sendEmail;
