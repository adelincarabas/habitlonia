// Sends through Resend (https://resend.com) when RESEND_API_KEY is set. Without it, dev prints the
// message to the console so the flow can still be tested; production refuses rather than silently dropping mail.
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM ?? 'Habitlonia <onboarding@resend.dev>';

if (!apiKey && process.env.NODE_ENV !== 'production') {
  console.warn('RESEND_API_KEY is not set; password reset codes are printed here instead of emailed.');
}

type Message = { to: string; subject: string; text: string; html: string };

async function send(message: Message): Promise<void> {
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY must be set in production to send email');
    }
    console.log(`[mail] To ${message.to}: ${message.subject}\n${message.text}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, ...message }),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export async function sendPasswordResetCode(to: { email: string; name: string }, code: string): Promise<void> {
  await send({
    to: to.email,
    subject: `${code} is your Habitlonia reset code`,
    text: `Hi ${to.name},\n\nYour code to set a new Habitlonia password is ${code}. It expires in 15 minutes.\n\nIf you didn't ask for this, you can ignore this email; your password hasn't changed.`,
    html: `<p>Hi ${escapeHtml(to.name)},</p>
<p>Your code to set a new Habitlonia password is:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
<p>It expires in 15 minutes.</p>
<p style="color:#8A8A93">If you didn't ask for this, you can ignore this email; your password hasn't changed.</p>`,
  });
}
