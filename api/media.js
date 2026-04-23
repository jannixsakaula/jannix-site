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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify admin token
  const token = req.headers['x-admin-token'] || '';
  if (token !== (process.env.ADMIN_TOKEN || 'elevare-admin-tok-2025-js')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const { section, slot_key, url, resource_type, public_id } = parseBody(req);
    await sql`INSERT INTO media_items (section,slot_key,url,resource_type,public_id) VALUES (${section},${slot_key},${url},${resource_type||'image'},${public_id||''}) ON CONFLICT (section,slot_key) DO UPDATE SET url=EXCLUDED.url, resource_type=EXCLUDED.resource_type, public_id=EXCLUDED.public_id`;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
