/* ════════════════════════════════════════════════════════════════
   mediQ — api/medicines.js
   Vercel Serverless Function — replaces the Express api.js
   Connects to your Neon PostgreSQL database.
   ════════════════════════════════════════════════════════════════ */

const { Pool } = require('pg');

const TABLE_NAME = 'medicines';

// Pool is created once and reused across warm invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // CORS headers — allow your Vercel domain to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, id } = req.query;

    // GET /api/medicines?id=MQ-0001  → single medicine
    if (id) {
      const result = await pool.query(
        `SELECT * FROM ${TABLE_NAME} WHERE id = $1 LIMIT 1`,
        [id.toUpperCase()]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Medicine not found: ' + id });
      }
      return res.status(200).json(result.rows[0]);
    }

    // GET /api/medicines?q=paracetamol  → search
    if (q && q.trim()) {
      const search = `%${q.trim().toLowerCase()}%`;
      const result = await pool.query(
        `SELECT * FROM ${TABLE_NAME}
         WHERE
           LOWER(name)          LIKE $1 OR
           LOWER(id)            LIKE $1 OR
           LOWER(category)      LIKE $1 OR
           LOWER(manufacturer)  LIKE $1 OR
           LOWER("batchNumber") LIKE $1
         ORDER BY id ASC`,
        [search]
      );
      return res.status(200).json(result.rows);
    }

    // GET /api/medicines  → all medicines
    const result = await pool.query(
      `SELECT * FROM ${TABLE_NAME} ORDER BY id ASC`
    );
    return res.status(200).json(result.rows);

  } catch (err) {
    console.error('DB error:', err.message);
    return res.status(500).json({ error: 'Database error: ' + err.message });
  }
}
