/**
 * /api/accounts.js
 * Persistência de contas no Vercel KV (Redis).
 * Requer: MASTER_PASSWORD, JWT_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * GET  /api/accounts         — lista contas salvas
 * POST /api/accounts         — salva/atualiza conta { action:'save', account:{...} }
 * POST /api/accounts         — remove conta { action:'delete', id }
 *
 * Todos os endpoints exigem header: Authorization: Bearer <jwt>
 */

const crypto = require('crypto');

function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

async function kvGet(key) {
  const url = `${process.env.KV_REST_API_URL}/get/${key}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const url = `${process.env.KV_REST_API_URL}/set/${key}`;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

function authMiddleware(req) {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '').trim();
  return token ? verifyJWT(token, process.env.JWT_SECRET) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Check env vars
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    // KV not configured — return empty, app falls back to localStorage
    if (req.method === 'GET') return res.status(200).json({ accounts: [], kv: false });
    return res.status(200).json({ ok: true, kv: false });
  }

  // Auth check
  const payload = authMiddleware(req);
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });

  const KV_KEY = `ml_monitor_accounts_${payload.user}`;

  try {
    if (req.method === 'GET') {
      const accounts = await kvGet(KV_KEY) || [];
      return res.status(200).json({ accounts, kv: true });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { action, account, id } = body || {};

      let accounts = await kvGet(KV_KEY) || [];

      if (action === 'save') {
        // Upsert by id
        const idx = accounts.findIndex(a => a.id === account.id);
        if (idx >= 0) accounts[idx] = account;
        else accounts.push(account);
        await kvSet(KV_KEY, accounts);
        return res.status(200).json({ ok: true, count: accounts.length });
      }

      if (action === 'delete') {
        accounts = accounts.filter(a => a.id !== id);
        await kvSet(KV_KEY, accounts);
        return res.status(200).json({ ok: true, count: accounts.length });
      }

      if (action === 'replace_all') {
        // Replace entire list (used on logout/sync)
        await kvSet(KV_KEY, body.accounts || []);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'action inválida' });
    }
  } catch (err) {
    console.error('[api/accounts]', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(405).json({ error: 'Método não suportado' });
};
