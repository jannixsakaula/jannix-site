// Password lives SERVER-SIDE only - never exposed to browser
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sakaula@2008';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'elevare-admin-tok-2025-js';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (body.password === ADMIN_PASSWORD) {
      return res.json({ ok: true, token: ADMIN_TOKEN });
    }
    return res.status(401).json({ ok: false, error: 'Incorrect password' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
