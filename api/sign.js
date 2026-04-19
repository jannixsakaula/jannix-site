const crypto = require('crypto');
const CLOUDINARY_API_SECRET = 'SoYKajfCiCXBLK45Qk74KgpXkno';
const CLOUDINARY_API_KEY = '846197634832984';
const CLOUDINARY_CLOUD = 'dgsi6tlxe';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'jannix-sakaula';
  const str = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(str).digest('hex');
  return res.json({ signature, timestamp, folder, cloud_name: CLOUDINARY_CLOUD, api_key: CLOUDINARY_API_KEY });
};
