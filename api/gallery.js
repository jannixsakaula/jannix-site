const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (req.method === 'POST') {
      const { category, url, resource_type, public_id, caption } = req.body || {};
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
