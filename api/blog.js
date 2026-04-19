const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (req.method === 'POST') {
      const { title, excerpt, content, category, post_date } = req.body || {};
      const [post] = await sql`INSERT INTO blog_posts (title,excerpt,content,category,post_date) VALUES (${title},${excerpt},${content},${category||'Youth Advocacy'},${post_date||''}) RETURNING *`;
      return res.json(post);
    }
    if (req.method === 'DELETE') {
      const id = parseInt((req.url || '').split('/').pop());
      await sql`DELETE FROM blog_posts WHERE id=${id}`;
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
