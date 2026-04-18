/* ════════════════════════════════════════════════════════════════
   mediQ — api.js
   Express backend that connects to your Neon PostgreSQL database.

   SETUP:
   1. npm install express pg cors dotenv
   2. Set your Neon connection string (see STEP 1 below)
   3. node api.js
   4. Open http://localhost:3001

   ════════════════════════════════════════════════════════════════ */

require('dotenv').config();          // optional: load .env file
const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ──────────────────────────────────────────────────────────────
   STEP 1 ▶ PASTE YOUR NEON CONNECTION STRING HERE
   Get it from: Neon Console → Your Project → Connection Details
   It looks like:
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

   Option A: Hardcode it (quick start, not for production)
   Option B: Put it in a .env file as DATABASE_URL=postgresql://...
   ────────────────────────────────────────────────────────────── */
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require';
//  ↑↑↑  Replace this with your actual Neon connection string  ↑↑↑

/* ──────────────────────────────────────────────────────────────
   STEP 2 ▶ SET YOUR TABLE NAME (if different from 'medicines')
   ────────────────────────────────────────────────────────────── */
const TABLE_NAME = 'medicines';

/* ─────────────────────── DB POOL */
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }   // required for Neon
});

/* ─────────────────────── CORS — allow any origin (public read-only) */
app.use(cors());
app.use(express.json());

/* ─────────────────────── SERVE STATIC FILES (HTML/CSS/JS) */
app.use(express.static(__dirname));

/* ────────────────────────────────────────────────────────────
   GET /api/medicines
   Returns all rows from the medicines table.
   Supports optional ?q= query param for server-side search.
   ──────────────────────────────────────────────────────────── */
app.get('/api/medicines', async (req, res) => {
  try {
    const { q } = req.query;

    let sql, params;

    if (q && q.trim()) {
      // Server-side search across common fields
      const search = `%${q.trim().toLowerCase()}%`;
      sql = `
        SELECT * FROM ${TABLE_NAME}
        WHERE
          LOWER(name)          LIKE $1 OR
          LOWER(id)            LIKE $1 OR
          LOWER(category)      LIKE $1 OR
          LOWER(manufacturer)  LIKE $1 OR
          LOWER("batchNumber") LIKE $1
        ORDER BY id ASC
      `;
      params = [search];
    } else {
      sql    = `SELECT * FROM ${TABLE_NAME} ORDER BY id ASC`;
      params = [];
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);

  } catch (err) {
    console.error('DB error /api/medicines:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/medicines/:id
   Returns a single medicine by its mediQ ID (e.g. MQ-0001)
   ──────────────────────────────────────────────────────────── */
app.get('/api/medicines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM ${TABLE_NAME} WHERE id = $1 LIMIT 1`,
      [id.toUpperCase()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Medicine not found: ' + id });
    }
    res.json(result.rows[0]);

  } catch (err) {
    console.error('DB error /api/medicines/:id:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/stats
   Quick stats for the hero section counters (optional use).
   ──────────────────────────────────────────────────────────── */
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                               AS total,
        COUNT(*) FILTER (WHERE "expiryDate" < NOW())          AS expired,
        COUNT(*) FILTER (WHERE "expiryDate" BETWEEN NOW()
                         AND NOW() + INTERVAL '90 days')      AS expiring_soon,
        COUNT(*) FILTER (WHERE quantity <= COALESCE("reorderLevel", 0)) AS low_stock
      FROM ${TABLE_NAME}
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error /api/stats:', err.message);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

/* ─────────────────────── START SERVER */
pool.connect()
  .then(client => {
    client.release();
    console.log('✅ Connected to Neon PostgreSQL');
    app.listen(PORT, () => {
      console.log(`🚀 mediQ API running at http://localhost:${PORT}`);
      console.log(`   Open: http://localhost:${PORT}/index.html`);
      console.log(`   API:  http://localhost:${PORT}/api/medicines`);
    });
  })
  .catch(err => {
    console.error('❌ Could not connect to Neon database:', err.message);
    console.error('   Check your DATABASE_URL / connection string in api.js');
    process.exit(1);
  });



  