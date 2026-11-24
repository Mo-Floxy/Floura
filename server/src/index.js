import app from './app.js';

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  console.log(`🌸 FLOURA API ready on http://localhost:${PORT}`);
  if (!process.env.SMTP_HOST) console.log('ℹ️  Email delivery is not configured — verification/reset tokens are returned in API responses for local development.');
});
