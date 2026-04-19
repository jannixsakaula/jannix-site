const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = neon(process.env.DATABASE_URL);
    const { section, slot_key, url, resource_type, public_id } = req.body || {};
    await sql`INSERT INTO media_items (section,slot_key,url,resource_type,public_id) VALUES (${section},${slot_key},${url},${resource_type||'image'},${public_id||''}) ON CONFLICT (section,slot_key) DO UPDATE SET url=EXCLUDED.url, resource_type=EXCLUDED.resource_type, public_id=EXCLUDED.public_id`;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
