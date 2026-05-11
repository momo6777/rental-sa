import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

serve(async (req) => {
  try {
    const { to, subject, html }: EmailPayload = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'نظام إدارة العقارات <noreply@yourdomain.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
