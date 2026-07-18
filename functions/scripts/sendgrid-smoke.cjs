const sgMail = require('@sendgrid/mail');

function getRequired(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

async function main() {
  const apiKey = getRequired('SENDGRID_API_KEY');
  const from = getRequired('SENDGRID_FROM_EMAIL');
  const to = getRequired('SENDGRID_TO_EMAIL');

  const useEuResidency = String(process.env.SENDGRID_EU_RESIDENCY || '').toLowerCase() === 'true';

  sgMail.setApiKey(apiKey);
  if (useEuResidency && typeof sgMail.setDataResidency === 'function') {
    sgMail.setDataResidency('eu');
  }

  const now = new Date().toISOString();
  const msg = {
    to,
    from,
    subject: process.env.SENDGRID_SUBJECT || 'SendGrid test email from Home Inspection App',
    text: process.env.SENDGRID_TEXT || `SendGrid test sent at ${now}`,
    html: process.env.SENDGRID_HTML || `<strong>SendGrid test sent at ${now}</strong>`,
  };

  const [response] = await sgMail.send(msg);
  console.log('SendGrid send ok');
  console.log('Status:', response.statusCode);
  console.log('Message ID:', response.headers['x-message-id'] || '(not provided)');
}

main().catch((err) => {
  const details = err && err.response && err.response.body ? JSON.stringify(err.response.body) : err.message;
  console.error('SendGrid send failed:', details);
  process.exit(1);
});
