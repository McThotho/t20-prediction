# Instructions for AI Agents

## 🎯 MANDATORY: Read Before Starting Any Task

**Before making ANY changes to this T20 prediction app, you MUST:**

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md) completely**
   - Contains database schema, file structure, deployment process
   - Explains timezone handling (CRITICAL for match times!)
   - Lists common issues and solutions

2. **Verify your understanding:**
   - Database uses UTC timezone
   - Maldives time is UTC+5 (18:30 MVT = 13:30 UTC)
   - Match IDs include date/time (changing time = new match)
   - Deploy from `/Users/ameeraaboobakur/t20-deploy/`
   - Edit files in `/Users/ameeraaboobakur/` (root)
   - Database is source of truth when `USE_DATABASE = true`

## 🚫 Common Mistakes to Avoid

1. **DON'T edit files in `/Users/ameeraaboobakur/t20-deploy/`** - it's ignored
2. **DON'T forget timezone conversion** when updating match times
3. **DON'T skip database updates** - frontend alone won't work
4. **DON'T assume local time is UTC** - always convert!

## ✅ Standard Workflow

1. Read ARCHITECTURE.md
2. Identify which files need changes (see Quick Reference table)
3. Make changes in `/Users/ameeraaboobakur/` (root)
4. Test locally if possible
5. Commit to git
6. Deploy: `cd t20-deploy && npx vercel --prod --yes`
7. Verify on production URL

## 📋 Quick Reference

See the **Quick Reference table** in [ARCHITECTURE.md](ARCHITECTURE.md) for:
- Which file to edit for each type of change
- Whether deployment is required
- Line numbers for common edits

---

**If you're unsure about anything, check ARCHITECTURE.md first!**
