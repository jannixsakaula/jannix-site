 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/api/save.js b/api/save.js
index 1bc6e16d17ed7a176b1afd2878539b1983413ab1..14a4ba2be86689d41d30ea762a76be19af54de4c 100644
--- a/api/save.js
+++ b/api/save.js
@@ -1,18 +1,34 @@
 const { neon } = require('@neondatabase/serverless');
 
+function parseBody(req) {
+  if (!req || req.body == null) return {};
+  if (typeof req.body === 'string') {
+    try {
+      return JSON.parse(req.body);
+    } catch {
+      return {};
+    }
+  }
+  return req.body;
+}
+
 module.exports = async (req, res) => {
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
   if (req.method === 'OPTIONS') return res.status(200).end();
+
   try {
     const sql = neon(process.env.DATABASE_URL);
-    const body = req.body || {};
-    for (const [key, value] of Object.entries(body.content || {})) {
+    const body = parseBody(req);
+    const contentEntries = Object.entries(body.content || {});
+
+    for (const [key, value] of contentEntries) {
       await sql`INSERT INTO site_content (key,value,updated_at) VALUES (${key},${value},NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
     }
-    return res.json({ ok: true });
+
+    return res.json({ ok: true, saved: contentEntries.length });
   } catch (err) {
     return res.status(500).json({ error: err.message });
   }
 };
 
EOF
)
