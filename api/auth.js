/**
 * /api/auth.js
 * Login master do sistema — autentica o operador com usuário/senha
 * e devolve um JWT simples de sessão (24h).
 *
 * Env vars:
 *   MASTER_USER     — usuário master (default: admin)
 *   MASTER_PASSWORD — senha master (obrigatória)
 *   JWT_SECRET      — segredo para HMAC (obrigatório)
 */

const crypto = require('crypto');

function signJWT(payload, secret) {
  const header  = Buffer.from(JSON.stringify({ alg:'HS256', typ:'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const JWT_SECRET = process.env.JWT_SECRET;
  const MASTER_USER = process.env.MASTER_USER || 'admin';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

  if (!JWT_SECRET || !MASTER_PASSWORD) {
    return res.status(500).json({ error: 'JWT_SECRET e MASTER_PASSWORD não configurados no Vercel.' });
  }

  // POST /api/auth — login
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { username, password, action } = body || {};

    // Verify existing token
    if (action === 'verify') {
      const { token } = body;
      const payload = verifyJWT(token, JWT_SECRET);
      return res.status(payload ? 200 : 401).json(payload ? { ok: true, user: payload.user } : { error: 'Token inválido ou expirado' });
    }

    // Login
    if (username !== MASTER_USER || password !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    const token = signJWT({ user: MASTER_USER, exp: Math.floor(Date.now()/1000) + 86400 }, JWT_SECRET);
    return res.status(200).json({ token, user: MASTER_USER });
  }

  return res.status(405).json({ error: 'Use POST' });
};
