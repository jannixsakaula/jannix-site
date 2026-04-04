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

function send(res, status, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(data);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    return res.status(200).end();
  }

  const fullPath = req.url.split('?')[0];
  const path = fullPath.replace(/^\/api/, '') || '/';
  const method = req.method;
  let body = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  try {
    if (!process.env.DATABASE_URL) {
      return send(res, 500, { error: 'DATABASE_URL not set in Vercel Environment Variables' });
    }

    const sql = neon(process.env.DATABASE_URL);
    await initDB(sql);

    if ((path === '/load' || path === '' || path === '/') && method === 'GET') {
      const [content, posts, media, gallery] = await Promise.all([
        sql`SELECT key, value FROM site_content`,
        sql`SELECT * FROM blog_posts ORDER BY created_at DESC`,
        sql`SELECT section, slot_key, url, resource_type FROM media_items`,
        sql`SELECT * FROM gallery_items ORDER BY category, sort_order, created_at DESC`
      ]);
      const cm = {};
      content.forEach(r => { cm[r.key] = r.value; });
      return send(res, 200, { content: cm, posts, media, gallery });
    }

    if (path === '/save-all-content' && method === 'POST') {
      for (const [key, value] of Object.entries(body.content || {})) {
        await sql`INSERT INTO site_content (key,value,updated_at) VALUES (${key},${value},NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
      }
      return send(res, 200, { ok: true });
    }

    if (path === '/cloudinary-sign' && method === 'POST') {
      const timestamp = Math.round(Date.now() / 1000);
      const folder = 'jannix-sakaula';
      const signature = sign({ folder, timestamp });
      return send(res, 200, { signature, timestamp, folder, cloud_name: CLOUDINARY_CLOUD, api_key: CLOUDINARY_API_KEY });
    }

    if (path === '/save-media' && method === 'POST') {
      const { section, slot_key, url, resource_type, public_id } = body;
      await sql`INSERT INTO media_items (section,slot_key,url,resource_type,public_id) VALUES (${section},${slot_key},${url},${resource_type||'image'},${public_id||''}) ON CONFLICT (section,slot_key) DO UPDATE SET url=EXCLUDED.url, resource_type=EXCLUDED.resource_type, public_id=EXCLUDED.public_id`;
      return send(res, 200, { ok: true });
    }

    if (path === '/gallery' && method === 'POST') {
      const { category, url, resource_type, public_id, caption } = body;
      const [item] = await sql`INSERT INTO gallery_items (category,url,resource_type,public_id,caption) VALUES (${category},${url},${resource_type||'image'},${public_id||''},${caption||''}) RETURNING *`;
      return send(res, 200, item);
    }

    if (path.startsWith('/gallery/') && method === 'DELETE') {
      await sql`DELETE FROM gallery_items WHERE id=${parseInt(path.split('/')[2])}`;
      return send(res, 200, { ok: true });
    }

    if (path === '/blog' && method === 'POST') {
      const { title, excerpt, content, category, post_date } = body;
      const [post] = await sql`INSERT INTO blog_posts (title,excerpt,content,category,post_date) VALUES (${title},${excerpt},${content},${category||'Youth Advocacy'},${post_date||''}) RETURNING *`;
      return send(res, 200, post);
    }

    if (path.startsWith('/blog/') && method === 'DELETE') {
      await sql`DELETE FROM blog_posts WHERE id=${parseInt(path.split('/')[2])}`;
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Route not found: ' + path });

  } catch (err) {
    console.error('API Error:', err);
    return send(res, 500, { error: err.message });
  }
};
