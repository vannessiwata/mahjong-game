/**
 * Email Notification Service for Hong Kong Mahjong Room Events using Resend API.
 * Uses native fetch (Node 18+) so no external dependencies are needed.
 */

async function sendRoomCreatedEmail({ roomId, creatorName, players }) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL || 'vannessiwata2002@gmail.com';

  if (!apiKey) {
    console.log('[Email Notification] Skipped: RESEND_API_KEY is not configured.');
    return;
  }

  const seatNames = ['East (東)', 'South (南)', 'West (西)', 'North (北)'];
  const playerRows = players
    .map((p, idx) => {
      const isHost = idx === 0 || p.name === creatorName;
      const roleBadge = p.isBot
        ? '<span style="color: #94a3b8; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px;">Bot AI</span>'
        : `<span style="color: #34d399; font-size: 11px; font-weight: bold; background: #064e3b; padding: 2px 6px; border-radius: 4px;">Pemain${isHost ? ' • 👑 Host' : ''}</span>`;

      return `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px; color: #94a3b8;">${seatNames[idx]}</td>
          <td style="padding: 10px; font-weight: bold; color: ${isHost ? '#fde047' : '#f1f5f9'};">
            ${p.name || 'Empty'}
          </td>
          <td style="padding: 10px; text-align: right;">
            ${roleBadge}
          </td>
        </tr>
      `;
    })
    .join('');

  const nowWIB = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Room Baru Mahjong Dibuat</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #021a10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #052e16; border: 1px solid #166534; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #064e3b, #047857); padding: 24px 20px; text-align: center; border-bottom: 2px solid #22c55e;">
          <div style="font-size: 40px; line-height: 1; margin-bottom: 6px;">🀄</div>
          <h1 style="margin: 0; color: #fde047; font-size: 24px; font-weight: 900; letter-spacing: 1px;">HONG KONG MAHJONG</h1>
          <p style="margin: 6px 0 0; color: #a7f3d0; font-size: 13px; font-weight: bold;">Notifikasi Room Baru Dibuat</p>
        </div>

        <!-- Room Code Highlight -->
        <div style="padding: 24px 20px 10px;">
          <div style="background-color: #022c22; border: 1px dashed #22c55e; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #86efac; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 4px;">
              Kode Room
            </div>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #fde047; font-family: monospace;">
              ${roomId}
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #cbd5e1;">
              Dibuat oleh: <strong style="color: #ffffff;">${creatorName}</strong>
            </div>
          </div>
        </div>

        <!-- Player List -->
        <div style="padding: 10px 20px 20px;">
          <h3 style="color: #f8fafc; font-size: 14px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px;">
            👥 Susunan Pemain Awal (4 Kursi):
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #022c22; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #064e3b; color: #86efac; text-align: left;">
                <th style="padding: 8px 10px;">Arah Kursi</th>
                <th style="padding: 8px 10px;">Nama</th>
                <th style="padding: 8px 10px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${playerRows}
            </tbody>
          </table>

          <div style="margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
            🕒 Waktu Dibuat: <span style="color: #cbd5e1;">${nowWIB} WIB</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #021a10; padding: 14px; text-align: center; border-top: 1px solid #14532d; font-size: 11px; color: #64748b;">
          Sistem Notifikasi Game Hong Kong Mahjong Multiplayer
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Mahjong Room <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject: `🀄 [Mahjong] Room Baru Dibuat: [${roomId}] oleh ${creatorName}`,
        html: htmlContent,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`[Email Notification] Email sent successfully to ${toEmail}. Resend ID: ${data.id}`);
    } else {
      console.error(`[Email Notification] Resend API error:`, data);
    }
  } catch (error) {
    console.error(`[Email Notification] Error sending room email:`, error);
  }
}

module.exports = {
  sendRoomCreatedEmail,
};
