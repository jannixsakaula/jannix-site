const { neon } = require('@neondatabase/serverless');

function parseBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (typeof req.body === 'object') return req.body;
  return {};
}

async function readBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined) {
      resolve(parseBody(req));
      return;
    }
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
    setTimeout(() => resolve({}), 5000);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = await readBody(req);
    const entries = Object.entries(body.content || {});
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No content to save', received: JSON.stringify(body).substring(0, 200) });
    }
    for (const [key, value] of entries) {
      await sql`INSERT INTO site_content (key,value,updated_at) VALUES (${key},${value},NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
    }
    return res.json({ ok: true, saved: entries.length });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: err.message });
  }
};
