import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);
  const { action } = req.query;

  try {
    switch (action) {
      case 'init':
        // Create tables
        await sql`
          CREATE TABLE IF NOT EXISTS users (
            username VARCHAR(255) PRIMARY KEY,
            phone VARCHAR(20) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            needs_reset BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // Add unique constraint on phone if it doesn't exist (for existing tables)
        try {
          await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone)`;
        } catch (e) {
          console.log('Phone unique index may already exist:', e.message);
        }

        await sql`
          CREATE TABLE IF NOT EXISTS predictions (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) REFERENCES users(username) ON DELETE CASCADE,
            match_id VARCHAR(255) NOT NULL,
            team VARCHAR(255) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            result VARCHAR(50),
            UNIQUE(username, match_id)
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS matches (
            id VARCHAR(255) PRIMARY KEY,
            team1_name VARCHAR(255) NOT NULL,
            team1_flag VARCHAR(10) NOT NULL,
            team1_code VARCHAR(10) NOT NULL,
            team1_group VARCHAR(10) NOT NULL,
            team2_name VARCHAR(255) NOT NULL,
            team2_flag VARCHAR(10) NOT NULL,
            team2_code VARCHAR(10) NOT NULL,
            team2_group VARCHAR(10) NOT NULL,
            date_time TIMESTAMP NOT NULL,
            stage VARCHAR(50) DEFAULT 'group',
            status VARCHAR(50) DEFAULT 'upcoming',
            winner VARCHAR(255),
            points INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS user_stats (
            username VARCHAR(255) PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
            total_predictions INTEGER DEFAULT 0,
            correct_predictions INTEGER DEFAULT 0,
            points INTEGER DEFAULT 0,
            accuracy DECIMAL(5,2) DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // Add reminder_sent column if it doesn't exist
        try {
          await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`;
        } catch (e) {
          console.log('reminder_sent column may already exist:', e.message);
        }

        // Insert default admin user if not exists
        await sql`
          INSERT INTO users (username, phone, password, role)
          VALUES ('admin', '0000000', 'admin123', 'admin')
          ON CONFLICT (username) DO NOTHING
        `;

        return res.status(200).json({ success: true, message: 'Database initialized' });

      case 'getUsers':
        const users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
        return res.status(200).json(users);

      case 'getDuplicatePhones':
        const duplicates = await sql`
          SELECT phone, COUNT(*) as count, array_agg(username) as usernames
          FROM users
          WHERE phone IS NOT NULL AND phone != ''
          GROUP BY phone
          HAVING COUNT(*) > 1
        `;
        return res.status(200).json(duplicates);

      case 'addUser':
        const { username, phone, password, role, needsReset } = req.body;
        await sql`
          INSERT INTO users (username, phone, password, role, needs_reset)
          VALUES (${username}, ${phone}, ${password}, ${role || 'user'}, ${needsReset || false})
        `;
        return res.status(200).json({ success: true });

      case 'deleteUser':
        const { username: delUsername } = req.body;
        await sql`DELETE FROM users WHERE username = ${delUsername}`;
        return res.status(200).json({ success: true });

      case 'updateUser':
        const { username: upUsername, phone: upPhone, password: upPassword, needsReset: upNeedsReset } = req.body;
        if (upPhone !== undefined) {
          await sql`
            UPDATE users
            SET phone = ${upPhone}, password = ${upPassword}, needs_reset = ${upNeedsReset}
            WHERE username = ${upUsername}
          `;
        } else {
          await sql`
            UPDATE users
            SET password = ${upPassword}, needs_reset = ${upNeedsReset}
            WHERE username = ${upUsername}
          `;
        }
        return res.status(200).json({ success: true });

      case 'getPredictions':
        const predictions = await sql`SELECT * FROM predictions ORDER BY timestamp DESC`;
        return res.status(200).json(predictions);

      case 'getUserPredictions':
        const { username: predUsername } = req.query;
        const userPreds = await sql`
          SELECT * FROM predictions
          WHERE username = ${predUsername}
          ORDER BY timestamp DESC
        `;
        return res.status(200).json(userPreds);

      case 'savePrediction':
        const { username: saveUsername, matchId, team, result } = req.body;
        await sql`
          INSERT INTO predictions (username, match_id, team, result)
          VALUES (${saveUsername}, ${matchId}, ${team}, ${result || null})
          ON CONFLICT (username, match_id)
          DO UPDATE SET team = ${team},
            result = COALESCE(predictions.result, ${result || null}),
            timestamp = CURRENT_TIMESTAMP
        `;
        return res.status(200).json({ success: true });

      case 'deletePrediction':
        const { username: delPredUsername, matchId: delMatchId } = req.body;
        await sql`
          DELETE FROM predictions
          WHERE username = ${delPredUsername} AND match_id = ${delMatchId}
        `;
        return res.status(200).json({ success: true });

      case 'getMatches':
        const matches = await sql`SELECT * FROM matches ORDER BY date_time ASC`;
        return res.status(200).json(matches);

      case 'addMatch':
        const { match } = req.body;
        await sql`
          INSERT INTO matches (
            id, team1_name, team1_flag, team1_code, team1_group,
            team2_name, team2_flag, team2_code, team2_group,
            date_time, stage, status, winner, points
          ) VALUES (
            ${match.id}, ${match.team1.name}, ${match.team1.flag},
            ${match.team1.code}, ${match.team1.group},
            ${match.team2.name}, ${match.team2.flag},
            ${match.team2.code}, ${match.team2.group},
            ${match.dateTime}, ${match.stage}, ${match.status},
            ${match.winner || null}, ${match.points || 1}
          )
        `;
        return res.status(200).json({ success: true });

      case 'updateMatch':
        const { matchId: upMatchId, status, winner, points } = req.body;
        await sql`
          UPDATE matches
          SET status = ${status}, winner = ${winner}, points = ${points}
          WHERE id = ${upMatchId}
        `;
        return res.status(200).json({ success: true });

      case 'deleteMatch':
        const { matchId: delMatchId2 } = req.body;
        await sql`DELETE FROM matches WHERE id = ${delMatchId2}`;
        return res.status(200).json({ success: true });

      case 'getStats':
        const stats = await sql`SELECT * FROM user_stats ORDER BY points DESC, accuracy DESC`;
        return res.status(200).json(stats);

      case 'updateStats':
        const { stats: statsData } = req.body;
        for (const stat of statsData) {
          await sql`
            INSERT INTO user_stats (username, total_predictions, correct_predictions, points, accuracy)
            VALUES (${stat.username}, ${stat.totalPredictions}, ${stat.correctPredictions}, ${stat.points}, ${stat.accuracy})
            ON CONFLICT (username)
            DO UPDATE SET
              total_predictions = ${stat.totalPredictions},
              correct_predictions = ${stat.correctPredictions},
              points = ${stat.points},
              accuracy = ${stat.accuracy},
              updated_at = CURRENT_TIMESTAMP
          `;
        }
        return res.status(200).json({ success: true });

      case 'sendTelegram': {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!botToken || !chatId) {
          return res.status(200).json({ success: true, skipped: true, message: 'Telegram not configured' });
        }
        const { matchDetails, leaderboardTop } = req.body;
        let text = `🏏 *Match Result!*\n\n`;
        text += `${matchDetails.team1Flag} ${matchDetails.team1} vs ${matchDetails.team2} ${matchDetails.team2Flag}\n`;
        text += `🏆 *Winner: ${matchDetails.winner}*\n\n`;
        text += `📊 *Leaderboard Updated!*\n`;
        const medals = ['🥇', '🥈', '🥉'];
        leaderboardTop.forEach((user, i) => {
          text += `${medals[i]} ${user.username} — ${user.points} pts\n`;
        });
        text += `\n👉 [Check full standings](https://vhpl-t20-prediction.vercel.app)`;

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
        const tgData = await tgRes.json();
        return res.status(200).json({ success: tgData.ok, result: tgData });
      }

      case 'sendTelegramUpdate': {
        const botToken2 = process.env.TELEGRAM_BOT_TOKEN;
        const chatId2 = process.env.TELEGRAM_CHAT_ID;
        if (!botToken2 || !chatId2) {
          return res.status(200).json({ success: true, skipped: true, message: 'Telegram not configured' });
        }
        const { text: msgText } = req.body;
        const tgRes2 = await fetch(`https://api.telegram.org/bot${botToken2}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId2, text: msgText, parse_mode: 'Markdown', disable_web_page_preview: false })
        });
        const tgData2 = await tgRes2.json();
        return res.status(200).json({ success: tgData2.ok, result: tgData2 });
      }

      case 'getTelegramChatId': {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not set in environment variables' });
        }
        const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
        const updatesData = await updatesRes.json();
        const chats = [];
        if (updatesData.ok && updatesData.result) {
          for (const update of updatesData.result) {
            const chat = update.message?.chat;
            if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
              if (!chats.find(c => c.id === chat.id)) {
                chats.push({ id: chat.id, title: chat.title, type: chat.type });
              }
            }
          }
        }
        return res.status(200).json({
          success: true,
          message: chats.length > 0
            ? 'Found group chats. Use the "id" value as your TELEGRAM_CHAT_ID environment variable.'
            : 'No group chats found. Make sure the bot is added to a group and someone has sent a message.',
          chats
        });
      }

      case 'revertMatchResults': {
        const { matchId: revertMatchId } = req.body;
        // Reset all predictions for this match back to pending
        await sql`
          UPDATE predictions SET result = NULL
          WHERE match_id = ${revertMatchId}
        `;
        // Recalculate stats for ALL users
        const revertAllPreds = await sql`SELECT username, result FROM predictions WHERE result IS NOT NULL`;
        const revertStats = {};
        for (const p of revertAllPreds) {
          if (!revertStats[p.username]) {
            revertStats[p.username] = { correct: 0 };
          }
          if (p.result === 'correct') {
            revertStats[p.username].correct += 1;
          }
        }
        const revertUserTotals = await sql`SELECT username, COUNT(*) as cnt FROM predictions GROUP BY username`;
        for (const u of revertUserTotals) {
          if (!revertStats[u.username]) {
            revertStats[u.username] = { correct: 0 };
          }
          const s = revertStats[u.username];
          const accuracy = u.cnt > 0 ? Math.round((s.correct / u.cnt) * 10000) / 100 : 0;
          await sql`
            INSERT INTO user_stats (username, total_predictions, correct_predictions, points, accuracy)
            VALUES (${u.username}, ${u.cnt}, ${s.correct}, ${s.correct}, ${accuracy})
            ON CONFLICT (username)
            DO UPDATE SET
              total_predictions = ${u.cnt},
              correct_predictions = ${s.correct},
              points = ${s.correct},
              accuracy = ${accuracy},
              updated_at = CURRENT_TIMESTAMP
          `;
        }
        return res.status(200).json({ success: true });
      }

      case 'updateMatchResults': {
        const { matchId: resultsMatchId, winner: resultsWinner } = req.body;
        // Mark all predictions for this match as correct/incorrect in a single query
        await sql`
          UPDATE predictions
          SET result = CASE WHEN team = ${resultsWinner} THEN 'correct' ELSE 'incorrect' END
          WHERE match_id = ${resultsMatchId}
        `;
        // Recalculate stats for ALL users who have predictions
        const allPreds = await sql`SELECT username, result FROM predictions WHERE result IS NOT NULL`;
        const userStats = {};
        for (const p of allPreds) {
          if (!userStats[p.username]) {
            userStats[p.username] = { correct: 0, total: 0 };
          }
          userStats[p.username].total += 1;
          if (p.result === 'correct') {
            userStats[p.username].correct += 1;
          }
        }
        // Also include users with no scored predictions yet
        const allUserPreds = await sql`SELECT DISTINCT username, COUNT(*) as cnt FROM predictions GROUP BY username`;
        for (const u of allUserPreds) {
          if (!userStats[u.username]) {
            userStats[u.username] = { correct: 0, total: 0 };
          }
        }
        // Update stats table
        for (const [username, s] of Object.entries(userStats)) {
          const totalPreds = (allUserPreds.find(u => u.username === username)?.cnt) || s.total;
          const accuracy = totalPreds > 0 ? Math.round((s.correct / totalPreds) * 10000) / 100 : 0;
          await sql`
            INSERT INTO user_stats (username, total_predictions, correct_predictions, points, accuracy)
            VALUES (${username}, ${totalPreds}, ${s.correct}, ${s.correct}, ${accuracy})
            ON CONFLICT (username)
            DO UPDATE SET
              total_predictions = ${totalPreds},
              correct_predictions = ${s.correct},
              points = ${s.correct},
              accuracy = ${accuracy},
              updated_at = CURRENT_TIMESTAMP
          `;
        }
        return res.status(200).json({ success: true, updated: Object.keys(userStats).length });
      }

      case 'checkAndSendReminders': {
        const reminderBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const reminderChatId = process.env.TELEGRAM_CHAT_ID;
        if (!reminderBotToken || !reminderChatId) {
          return res.status(200).json({ success: true, skipped: true, message: 'Telegram not configured' });
        }

        // Find upcoming matches starting within the next 65 minutes that haven't had reminders sent
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
          let reminderText = `⏰ *FINAL REMINDER!*\n\n`;
          reminderText += `⭐ *${matchPoints} ${matchPoints === 1 ? 'Point' : 'Points'}*\n`;
          reminderText += `🏏 *${match.team1_name}* (${match.team1_code}) vs *${match.team2_name}* (${match.team2_code})\n\n`;
          reminderText += `📅 Match starts in ~${minutesUntil} minutes!\n`;
          reminderText += `⚠️ You have *30 minutes* to lock in your prediction!\n\n`;
          reminderText += `🔒 Predictions close 30 min before kick-off.\n`;
          reminderText += `Don't miss out!\n\n`;
          reminderText += `👉 [Predict now!](https://vhpl-t20-prediction.vercel.app)`;

          try {
            const reminderRes = await fetch(`https://api.telegram.org/bot${reminderBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: reminderChatId, text: reminderText, parse_mode: 'Markdown' })
            });
            const reminderData = await reminderRes.json();

            if (reminderData.ok) {
              await sql`UPDATE matches SET reminder_sent = true WHERE id = ${match.id}`;
              sent.push(match.id);
            }
          } catch (e) {
            console.error(`Failed to send reminder for match ${match.id}:`, e.message);
          }
        }

        return res.status(200).json({ success: true, checked: upcomingMatches.length, sent: sent.length, matches: sent });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}
