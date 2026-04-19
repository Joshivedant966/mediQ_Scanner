/* ════════════════════════════════════════════════════════════════
   mediQ — api/medicines.js
   Vercel Serverless Function — connects to Neon PostgreSQL.
   Aliases snake_case DB columns to camelCase for the frontend.
   ════════════════════════════════════════════════════════════════ */

const { Pool } = require('pg');

const TABLE_NAME = 'medicines';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* SELECT with camelCase aliases to match frontend expectations */
const SELECT_COLS = `
  id,
  name,
  category,
  unit,
  manufacturer,
  batch_number      AS "batchNumber",
  supplier,
  location,
  quantity,
  reorder_level     AS "reorderLevel",
  purchase_price    AS "purchasePrice",
  selling_price     AS "sellingPrice",
  registered_date   AS "registeredDate",
  manufacture_date  AS "manufactureDate",
  expiry_date       AS "expiryDate",
  description
`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { q, id } = req.query;

    if (id) {
      const result = await pool.query(
        `SELECT ${SELECT_COLS} FROM ${TABLE_NAME} WHERE id = $1 LIMIT 1`,
        [id.toUpperCase()]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Medicine not found: ' + id });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (q && q.trim()) {
      const search = `%${q.trim().toLowerCase()}%`;
      const result = await pool.query(
        `SELECT ${SELECT_COLS} FROM ${TABLE_NAME}
         WHERE
           LOWER(name)         LIKE $1 OR
           LOWER(id)           LIKE $1 OR
           LOWER(category)     LIKE $1 OR
           LOWER(manufacturer) LIKE $1 OR
           LOWER(batch_number) LIKE $1
         ORDER BY id ASC`,
        [search]
      );
      return res.status(200).json(result.rows);
    }

    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM ${TABLE_NAME} ORDER BY id ASC`
    );
    return res.status(200).json(result.rows);

  } catch (err) {
    console.error('DB error:', err.message);
    return res.status(500).json({ error: 'Database error: ' + err.message });
  }
}