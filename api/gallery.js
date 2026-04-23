const { neon } = require('@neondatabase/serverless');

function parseBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify admin token
  const token = req.headers['x-admin-token'] || '';
  if (token !== (process.env.ADMIN_TOKEN || 'elevare-admin-tok-2025-js')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (req.method === 'POST') {
      const { category, url, resource_type, public_id, caption } = parseBody(req);
      const [item] = await sql`INSERT INTO gallery_items (category,url,resource_type,public_id,caption) VALUES (${category},${url},${resource_type||'image'},${public_id||''},${caption||''}) RETURNING *`;
      return res.json(item);
    }
    if (req.method === 'DELETE') {
      const id = parseInt((req.url || '').split('/').pop());
      await sql`DELETE FROM gallery_items WHERE id=${id}`;
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
