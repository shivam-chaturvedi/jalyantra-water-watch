# Mailer service

Simple Node.js mailer using Express and Nodemailer. Configure SMTP credentials in `.env` (see `.env.example`).

## Local dev

```bash
cd mailer
npm install
npm start
```

POST JSON to `http://localhost:3001/api/send-email`:

```json
{
  "to": "user@example.com",
  "subject": "Watcher update",
  "text": "Plain text body",
  "html": "<strong>Rich body</strong>"
}
```

## Vercel

Deploy using the `/api/send-email` serverless function. Ensure the same env vars exist in the Vercel dashboard before deploying.
