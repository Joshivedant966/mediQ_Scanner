# mediQ — Neon Database Setup Guide

## Files in this package
| File | Purpose |
|------|---------|
| `index.html` | Main website (unchanged) |
| `index.css` | Styles (unchanged) |
| `index.js` | Frontend JS — API_BASE updated to `/api` |
| `api.js` | ⭐ NEW Express backend that connects to your Neon DB |

---

## Step 1 — Install dependencies

```bash
npm install express pg cors dotenv
```

---

## Step 2 — Add your Neon connection string

Open `api.js` and find this line:

```js
'postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require'
```

Replace it with your actual Neon connection string from:
**Neon Console → Your Project → Connection Details → Connection string**

It will look like:
```
postgresql://alice:abc123@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Optional: Use a .env file (recommended)
Create a `.env` file in the same folder:
```
DATABASE_URL=postgresql://your_user:your_pass@your_host/neondb?sslmode=require
```
Then `api.js` will automatically pick it up.

---

## Step 3 — Check your table name

In `api.js`, confirm this matches your Neon table:
```js
const TABLE_NAME = 'medicines';
```

Your existing mediQ table should already use this name.

---

## Step 4 — Run

```bash
node api.js
```

You should see:
```
✅ Connected to Neon PostgreSQL
🚀 mediQ API running at http://localhost:3000
```

Then open: **http://localhost:3000**

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `password authentication failed` | Check your Neon connection string |
| `relation "medicines" does not exist` | Change `TABLE_NAME` in api.js to match your actual table name |
| `ECONNREFUSED` | Make sure `node api.js` is running before opening the site |
| Column not found errors | Your Neon table may use different column names — check Neon Console |
