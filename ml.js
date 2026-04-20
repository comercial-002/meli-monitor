/**
 * /api/ml.js
 * Proxy reverso para a API do Mercado Livre.
 *
 * IMPORTANTE: usa CommonJS (module.exports) — obrigatório para
 * Vercel Serverless Functions em .js sem configuração extra.
 *
 * POST /api/ml
 * Body JSON: { path: "/users/me", token: "APP_USR-...", headers: {} }
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { path, token, headers: extraHeaders = {} } = body;

  if (!path)  return res.status(400).json({ error: 'path obrigatorio' });
  if (!token) return res.status(400).json({ error: 'token obrigatorio' });

  // Segurança: só permite chamadas para api.mercadolibre.com
  const url = 'https://api.mercadolibre.com' + (path.startsWith('/') ? path : '/' + path);

  try {
    const mlRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        ...extraHeaders,
      },
    });

    // Se for JSON, parseia e repassa
    const contentType = mlRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await mlRes.json();
      return res.status(mlRes.status).json(data);
    }

    // Caso contrário repassa como texto
    const text = await mlRes.text();
    return res.status(mlRes.status).send(text);

  } catch (err) {
    console.error('[api/ml]', err.message);
    return res.status(502).json({
      error:  'Falha ao comunicar com o Mercado Livre',
      detail: err.message,
    });
  }
};
