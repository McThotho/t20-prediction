# T20 World Cup 2026 Prediction App - Architecture & Schema Documentation

**READ THIS FIRST before making ANY changes to the application!**

---

## 📁 Project Structure

```
/Users/ameeraaboobakur/          ← ROOT (Git repository & Vercel deployment source)
├── index.html                    ← MAIN APP FILE (frontend + all logic)
├── t20-worldcup-logo.png        ← App logo
├── favicon.svg                   ← Favicon
├── manifest.json                 ← PWA manifest
├── package.json                  ← Node dependencies
├── vercel.json                   ← Vercel config
├── .gitignore                    ← Git ignore rules
├── api/                          ← SERVERLESS BACKEND
│   ├── db.js                     ← DATABASE API (all DB operations)
│   └── cron.js                   ← CRON job for Telegram reminders
├── t20-deploy/                   ← DUPLICATE/OLD FOLDER (IGNORED - DO NOT USE!)
└── *.md files                    ← Documentation

⚠️ CRITICAL: Only edit files in ROOT (/Users/ameeraaboobakur/), NOT in t20-deploy/
```

---

## 🗄️ Database Schema (PostgreSQL via Neon)

**Connection:** Via environment variable `DATABASE_URL`

### Table: `users`
```sql
CREATE TABLE users (
  username VARCHAR(255) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',           -- 'user' or 'admin'
  needs_reset BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `predictions`
```sql
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) REFERENCES users(username) ON DELETE CASCADE,
  match_id VARCHAR(255) NOT NULL,
  team VARCHAR(255) NOT NULL,                 -- Team name user predicted
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  result VARCHAR(50),                         -- 'correct', 'incorrect', or NULL
  UNIQUE(username, match_id)
);
```

### Table: `matches`
```sql
CREATE TABLE matches (
  id VARCHAR(255) PRIMARY KEY,                -- Format: fixture_YYYY-MM-DD_HH:MM_CODE1_CODE2
  team1_name VARCHAR(255) NOT NULL,
  team1_flag VARCHAR(10) NOT NULL,
  team1_code VARCHAR(10) NOT NULL,           -- e.g., 'AUS', 'IND'
  team1_group VARCHAR(10) NOT NULL,          -- e.g., 'A', 'B'
  team2_name VARCHAR(255) NOT NULL,
  team2_flag VARCHAR(10) NOT NULL,
  team2_code VARCHAR(10) NOT NULL,
  team2_group VARCHAR(10) NOT NULL,
  date_time TIMESTAMP NOT NULL,              -- ⚠️ ALWAYS IN UTC!
  stage VARCHAR(50) DEFAULT 'group',         -- 'group', 'super8', 'semi', 'final'
  status VARCHAR(50) DEFAULT 'upcoming',     -- 'upcoming', 'completed'
  winner VARCHAR(255),
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Telegram notification tracking
  reminder_sent BOOLEAN DEFAULT false,
  match_started_sent BOOLEAN DEFAULT false,
  toss_notified BOOLEAN DEFAULT false,
  innings1_notified BOOLEAN DEFAULT false,
  innings2_notified BOOLEAN DEFAULT false,
  inn1_powerplay_notified BOOLEAN DEFAULT false,
  inn1_middle_notified BOOLEAN DEFAULT false,
  inn2_powerplay_notified BOOLEAN DEFAULT false,
  inn2_middle_notified BOOLEAN DEFAULT false,
  inn1_last_wickets INTEGER DEFAULT 0,
  inn2_last_wickets INTEGER DEFAULT 0
);
```

### Table: `user_stats`
```sql
CREATE TABLE user_stats (
  username VARCHAR(255) PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 Frontend Architecture

**File:** `/Users/ameeraaboobakur/index.html` (Single Page App - 4100+ lines)

### Key Configuration (Lines 2028-2031)
```javascript
const USE_DATABASE = true;  // Set to true to use Postgres, false for localStorage
const API_URL = '/api/db';
```

### Data Sources (in order of precedence)
1. **Database (PostgreSQL)** ← Primary source when `USE_DATABASE = true`
2. **LocalStorage** ← Fallback/cache
3. **Hard-coded fixtures** ← Initial seed data (lines 2310-2320)

### Match Fixtures (Lines 2310-2320)
```javascript
const GROUP_STAGE_FIXTURES = [
    { date: '2026-02-20', time: '18:30', team1: 'Australia', team2: 'Oman' },
    // ... more fixtures
];
```

⚠️ **TIMEZONE CRITICAL:** 
- Fixtures use **LOCAL time** (Maldives MVT = UTC+5)
- When creating Date objects: `new Date('2026-02-20T18:30')` = 18:30 local time
- Database stores **UTC time**: Maldives 18:30 MVT = 13:30 UTC
- **Formula:** UTC_time = Local_MVT_time - 5 hours

### Team Data (Lines ~2170)
```javascript
const TEAMS = [
    { name: 'Australia', flag: '🇦🇺', code: 'AUS', group: 'B', countryCode: 'au' },
    { name: 'India', flag: '🇮🇳', code: 'IND', group: 'A', countryCode: 'in' },
    // ... 20 teams total
];
```

### Key Functions
- **`renderMatches()`** (Line 3504): Renders match cards with predictions
- **`loadGroupStageFixtures()`** (Line 3006): Loads initial fixtures to localStorage
- **`formatDate(date)`** (Line 3879): Formats dates for display
- **`predictWinner(matchId, teamName)`** (Line 3629): Saves predictions
- **`dbCall(action, body)`** (Line ~2900): Makes API calls to backend

---

## 🔌 Backend API

**File:** `/Users/ameeraaboobakur/api/db.js` (Serverless Function)

### API Endpoints (all via `/api/db?action=...`)

#### User Management
- `init` - Initialize database tables
- `getUsers` - Get all users
- `addUser` - Add new user
- `updateUser` - Update user password/phone
- `deleteUser` - Delete user
- `getDuplicatePhones` - Find duplicate phone numbers

#### Predictions
- `getPredictions` - Get all predictions
- `getUserPredictions` - Get predictions for specific user
- `savePrediction` - Save/update prediction
- `deletePrediction` - Delete prediction

#### Matches
- `getMatches` - Get all matches
- `addMatch` - Add new match
- `updateMatch` - Update match status/winner/points
- `deleteMatch` - Delete match
- `updateMatchResults` - Mark predictions correct/incorrect after match
- `revertMatchResults` - Revert match results

#### Stats
- `getStats` - Get user statistics
- `updateStats` - Update user stats

#### Telegram Integration
- `sendTelegram` - Send match result notification
- `sendTelegramUpdate` - Send custom message
- `getTelegramChatId` - Get available chat IDs
- `checkAndSendReminders` - Send match reminders (called by cron)
- `checkLiveMatchUpdates` - Send live match updates

---

## 🚀 Deployment Process

### Production URL
**https://vhpl-t20-prediction.vercel.app**

### Deploy Command (from `/Users/ameeraaboobakur/t20-deploy/`)
```bash
npx vercel --prod --yes
```

### Deployment Flow
1. Vercel reads files from **ROOT** (`/Users/ameeraaboobakur/`)
2. Deploys `index.html` as main page
3. Deploys `api/` folder as serverless functions
4. Environment variables must be set in Vercel dashboard:
   - `DATABASE_URL` (required)
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_CHAT_ID` (optional)
   - `CRICKET_API_KEY` (optional)

---

## 📝 How to Make Changes

### 1. Update Match Time/Date

**⚠️ CRITICAL: Handle Timezones Correctly!**

#### Step 1: Update Database
```bash
# Example: Change match from Feb 19 22:30 to Feb 20 18:30 (Maldives time)
# Maldives is UTC+5, so 18:30 MVT = 13:30 UTC

# Delete old match
curl -X POST "https://vhpl-t20-prediction.vercel.app/api/db?action=deleteMatch" \
  -H "Content-Type: application/json" \
  -d '{"matchId": "fixture_2026-02-19_22:30_AUS_OMA"}'

# Add new match with UTC time
curl -X POST "https://vhpl-t20-prediction.vercel.app/api/db?action=addMatch" \
  -H "Content-Type: application/json" \
  -d '{
    "match": {
      "id": "fixture_2026-02-20_18:30_AUS_OMA",
      "team1": {"name": "Australia", "flag": "🇦🇺", "code": "AUS", "group": "B"},
      "team2": {"name": "Oman", "flag": "🇴🇲", "code": "OMA", "group": "B"},
      "dateTime": "2026-02-20T13:30:00.000Z",
      "stage": "group",
      "status": "upcoming",
      "winner": null,
      "points": 1
    }
  }'
```

#### Step 2: Update HTML fixtures (for consistency)
**File:** `/Users/ameeraaboobakur/index.html` (around line 2317)
```javascript
{ date: '2026-02-20', time: '18:30', team1: 'Australia', team2: 'Oman' }
```

#### Step 3: Commit & Deploy
```bash
cd /Users/ameeraaboobakur
git add index.html
git commit -m "Update match time"
cd t20-deploy
npx vercel --prod --yes
```

### 2. Add New Match (Admin Panel)

Use the admin panel in the app:
1. Login as admin
2. Navigate to "Manage Matches"
3. Select teams, date, time, stage
4. Click "Add Match"

### 3. Update API Logic

**File:** `/Users/ameeraaboobakur/api/db.js`

Edit the appropriate case in the switch statement, then deploy.

### 4. Update Frontend UI/Logic

**File:** `/Users/ameeraaboobakur/index.html`

All HTML, CSS, and JavaScript are in this single file.

---

## 🔧 Environment Variables

Set in Vercel Dashboard (Settings → Environment Variables):

```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Optional (Telegram notifications)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890

# Optional (Live match updates)
CRICKET_API_KEY=your-cricapi-key
```

---

## 🐛 Common Issues & Solutions

### Issue: Match shows wrong time
**Cause:** Timezone confusion between UTC and MVT
**Solution:** Database must store UTC. Formula: `UTC = MVT - 5 hours`

### Issue: Changes not visible after deployment
**Cause:** Browser localStorage cache
**Solution:** Users must hard refresh (Cmd+Shift+R) or clear cache

### Issue: Database not updating
**Cause:** `USE_DATABASE` might be false
**Solution:** Check line 2030 in index.html, ensure `USE_DATABASE = true`

### Issue: Predictions not saving
**Cause:** Match is locked (less than 30 min before start)
**Solution:** Predictions lock 30 minutes before match time

---

## 📊 Data Flow Diagram

```
User Browser
    ↓
index.html (Frontend)
    ↓
localStorage (Cache) ←→ Database (via /api/db)
    ↓
PostgreSQL (Neon)
    ↑
Telegram Bot (Notifications)
    ↑
Cron Job (/api/cron)
```

---

## 🎯 Quick Reference

| Task | File to Edit | Deploy Required |
|------|-------------|-----------------|
| Match time/date | Database + index.html (line ~2317) | Yes |
| Team data | index.html (line ~2170) | Yes |
| UI styling | index.html (CSS in `<style>` tag) | Yes |
| API logic | api/db.js | Yes |
| Telegram messages | api/db.js (lines 260-495) | Yes |
| Admin users | Database `users` table | No |

---

## 🔐 Default Admin Credentials

```
Username: admin
Password: admin123
Phone: 0000000
```

**⚠️ Change these in production!**

---

## 📱 Telegram Integration

### Setup
1. Create bot with @BotFather
2. Get bot token → Set as `TELEGRAM_BOT_TOKEN`
3. Add bot to group
4. Call `/api/db?action=getTelegramChatId` to get chat ID
5. Set chat ID as `TELEGRAM_CHAT_ID`

### Notification Types
- Match reminders (60 min before)
- Match started
- Live updates (powerplay, middle overs, wickets)
- Match results

---

## 📌 Important Notes for AI Agents

1. **Always read this file first** before making changes
2. **Verify timezone**: Database uses UTC, UI shows local (MVT)
3. **Match IDs include date/time**: Changing time requires new match ID
4. **Deploy from `/Users/ameeraaboobakur/t20-deploy/`** directory
5. **Edit files in `/Users/ameeraaboobakur/`** (root), NOT t20-deploy/
6. **Database is source of truth** when `USE_DATABASE = true`
7. **Users need hard refresh** after match time changes

---

**Last Updated:** 2026-02-19  
**App Version:** 1.0  
**Database:** Neon PostgreSQL  
**Hosting:** Vercel
