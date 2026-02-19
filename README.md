# T20 World Cup 2026 - Villa Hakatha Predictions

A prediction game web application for T20 World Cup 2026.

🏏 **Live App:** https://vhpl-t20-prediction.vercel.app

---

## 🚀 Quick Start for AI Agents

**⚠️ IMPORTANT: Read [ARCHITECTURE.md](ARCHITECTURE.md) first before making ANY changes!**

This file contains:
- Complete database schema
- File structure and what each file does
- Where to make edits for different tasks
- Deployment process
- Common issues and solutions
- Timezone handling (CRITICAL!)

---

## 📋 Tech Stack

- **Frontend:** Single-page HTML app (Vanilla JS)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** PostgreSQL (Neon)
- **Deployment:** Vercel
- **Notifications:** Telegram Bot

---

## 🎯 Features

- User authentication
- Match predictions (lock 30 min before match)
- Real-time leaderboard
- Admin panel for match management
- Telegram notifications (reminders, live updates, results)
- Cross-device sync via database
- PWA support

---

## 🔐 Admin Access

Default credentials (⚠️ change in production):
- Username: `admin`
- Password: `admin123`

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture and schema
- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Deployment instructions
- **[API-SETUP-GUIDE.md](API-SETUP-GUIDE.md)** - API integration guide

---

## 🛠️ Development

### File Structure
```
/Users/ameeraaboobakur/          ← ROOT (Git & Vercel source)
├── index.html                    ← Main app (frontend + logic)
├── api/db.js                     ← Database API
├── api/cron.js                   ← Telegram cron job
└── ARCHITECTURE.md               ← READ THIS FIRST!
```

### Quick Commands

```bash
# Deploy to production
cd /Users/ameeraaboobakur/t20-deploy
npx vercel --prod --yes

# Update match time (see ARCHITECTURE.md for timezone handling!)
# Database stores UTC, UI shows Maldives time (UTC+5)

# Commit changes
cd /Users/ameeraaboobakur
git add .
git commit -m "Description"
git push origin main
```

---

## ⚠️ Critical Notes

1. **Timezone:** Database uses UTC, Maldives is UTC+5
   - 18:30 MVT = 13:30 UTC
2. **Deploy from:** `/Users/ameeraaboobakur/t20-deploy/`
3. **Edit files in:** `/Users/ameeraaboobakur/` (root)
4. **Match IDs include time:** Changing time = new match ID
5. **Users need hard refresh** after match updates

---

## 📱 Contact

For questions or issues, see [ARCHITECTURE.md](ARCHITECTURE.md) troubleshooting section.

---

**Made with ❤️ for Villa Hakatha Cricket League**
