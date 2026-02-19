import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(200).json({ success: true, skipped: true });
  }

  try {
    // Find upcoming matches starting within the next 65 minutes with no reminder sent
    const upcomingMatches = await sql`
      SELECT * FROM matches
      WHERE status = 'upcoming'
        AND (reminder_sent = false OR reminder_sent IS NULL)
        AND date_time > NOW()
        AND date_time <= NOW() + INTERVAL '65 minutes'
    `;

    const sent = [];
    for (const match of upcomingMatches) {
      const matchTime = new Date(match.date_time);
      const now = new Date();
      const minutesUntil = Math.round((matchTime - now) / 60000);

      const matchPoints = match.points || 1;
      let text = `⏰ *FINAL REMINDER!*\n\n`;
      text += `⭐ *${matchPoints} ${matchPoints === 1 ? 'Point' : 'Points'}*\n`;
      text += `🏏 *${match.team1_name}* (${match.team1_code}) vs *${match.team2_name}* (${match.team2_code})\n\n`;
      text += `📅 Match starts in ~${minutesUntil} minutes!\n`;
      text += `⚠️ You have *30 minutes* to lock in your prediction!\n\n`;
      text += `🔒 Predictions close 30 min before kick-off.\n`;
      text += `Don't miss out!\n\n`;
      text += `👉 [Predict now!](https://vhpl-t20-prediction.vercel.app)`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
      const tgData = await tgRes.json();

      if (tgData.ok) {
        await sql`UPDATE matches SET reminder_sent = true WHERE id = ${match.id}`;
        sent.push(match.id);
      }
    }

    return res.status(200).json({ success: true, checked: upcomingMatches.length, sent: sent.length });
  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
