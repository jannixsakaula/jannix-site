const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [content, posts, media, gallery] = await Promise.all([
      sql`SELECT key, value FROM site_content`,
      sql`SELECT * FROM blog_posts ORDER BY created_at DESC`,
      sql`SELECT section, slot_key, url, resource_type FROM media_items`,
      sql`SELECT * FROM gallery_items ORDER BY category, sort_order, created_at DESC`
    ]);
    const cm = {};
    content.forEach(r => { cm[r.key] = r.value; });
    return res.json({ content: cm, posts, media, gallery });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
