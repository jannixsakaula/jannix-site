const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const CLOUDINARY_CLOUD = 'dgsi6tlxe';
const CLOUDINARY_API_KEY = '846197634832984';
const CLOUDINARY_API_SECRET = 'SoYKajfCiCXBLK45Qk74KgpXkno';

async function initDB(sql) {
  await sql`CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS blog_posts (id SERIAL PRIMARY KEY, title TEXT NOT NULL, excerpt TEXT, content TEXT, category TEXT DEFAULT 'Youth Advocacy', post_date TEXT, created_at TIMESTAMP DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS media_items (id SERIAL PRIMARY KEY, section TEXT NOT NULL, slot_key TEXT NOT NULL, url TEXT NOT NULL, resource_type TEXT DEFAULT 'image', public_id TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(section, slot_key))`;
  await sql`CREATE TABLE IF NOT EXISTS gallery_items (id SERIAL PRIMARY KEY, category TEXT NOT NULL, url TEXT NOT NULL, resource_type TEXT DEFAULT 'image', public_id TEXT, caption TEXT DEFAULT '', sort_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`;
}

function sign(params) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(str + CLOUDINARY_API_SECRET).digest('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await initDB(sql);

    const path = (req.url || '/').replace('/api', '') || '/';
    const method = req.method;
    const body = req.body || {};

    // LOAD ALL
    if (path === '/load' && method === 'GET') {
      const [content, posts, media, gallery] = await Promise.all([
        sql`SELECT key, value FROM site_content`,
        sql`SELECT * FROM blog_posts ORDER BY created_at DESC`,
        sql`SELECT section, slot_key, url, resource_type FROM media_items`,
        sql`SELECT * FROM gallery_items ORDER BY category, sort_order, created_at DESC`
      ]);
      const cm = {};
      content.forEach(r => cm[r.key] = r.value);
      return res.json({ content: cm, posts, media, gallery });
    }

    // SAVE ALL CONTENT
    if (path === '/save-all-content' && method === 'POST') {
      for (const [key, value] of Object.entries(body.content || {})) {
        await sql`INSERT INTO site_content (key,value,updated_at) VALUES (${key},${value},NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
      }
      return res.json({ ok: true });
    }

    // CLOUDINARY SIGN
    if (path === '/cloudinary-sign' && method === 'POST') {
      const timestamp = Math.round(Date.now() / 1000);
      const folder = 'jannix-sakaula';
      const signature = sign({ folder, timestamp });
      return res.json({ signature, timestamp, folder, cloud_name: CLOUDINARY_CLOUD, api_key: CLOUDINARY_API_KEY });
    }

    // SAVE MEDIA
    if (path === '/save-media' && method === 'POST') {
      const { section, slot_key, url, resource_type, public_id } = body;
      await sql`INSERT INTO media_items (section,slot_key,url,resource_type,public_id) VALUES (${section},${slot_key},${url},${resource_type||'image'},${public_id||''}) ON CONFLICT (section,slot_key) DO UPDATE SET url=EXCLUDED.url, resource_type=EXCLUDED.resource_type, public_id=EXCLUDED.public_id`;
      return res.json({ ok: true });
    }

    // GALLERY ADD
    if (path === '/gallery' && method === 'POST') {
      const { category, url, resource_type, public_id, caption } = body;
      const [item] = await sql`INSERT INTO gallery_items (category,url,resource_type,public_id,caption) VALUES (${category},${url},${resource_type||'image'},${public_id||''},${caption||''}) RETURNING *`;
      return res.json(item);
    }

    // GALLERY DELETE
    if (path.startsWith('/gallery/') && method === 'DELETE') {
      const id = parseInt(path.split('/')[2]);
      await sql`DELETE FROM gallery_items WHERE id=${id}`;
      return res.json({ ok: true });
    }

    // BLOG CREATE
    if (path === '/blog' && method === 'POST') {
      const { title, excerpt, content, category, post_date } = body;
      const [post] = await sql`INSERT INTO blog_posts (title,excerpt,content,category,post_date) VALUES (${title},${excerpt},${content},${category||'Youth Advocacy'},${post_date||''}) RETURNING *`;
      return res.json(post);
    }

    // BLOG DELETE
    if (path.startsWith('/blog/') && method === 'DELETE') {
      await sql`DELETE FROM blog_posts WHERE id=${parseInt(path.split('/')[2])}`;
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
