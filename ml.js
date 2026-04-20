/**
 * /api/ml
 * Proxy genérico para qualquer endpoint autenticado da API do Mercado Livre.
 *
 * O navegador NÃO pode chamar api.mercadolibre.com diretamente (CORS).
 * Esta função roda no servidor Vercel, recebe o token e o path,
 * e faz a requisição por conta do navegador.
 *
 * POST /api/ml
 * Body (JSON):
 *   path    : caminho da API, ex: "/users/me" ou "/users/123/shipping_preferences"
 *   method  : "GET" (padrão) | "POST" | "PUT"
 *   token   : access_token do vendedor (APP_USR-...)
 *   headers : objeto com headers extras opcionais (ex: { "X-Version": "v3" })
 *   body    : corpo da requisição (para POST/PUT)
 */

const ML_BASE = 'https://api.mercadolibre.com';

// Paths permitidos — segurança: impede uso como proxy genérico da internet
const ALLOWED_PATH_PREFIXES = [
  '/users/',
  '/users/me',
  '/shipping/',
  '/seller-reputation/',
];

function isAllowedPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, method = 'GET', token, headers: extraHeaders = {}, body: reqBody } = req.body || {};

  // Validações
  if (!path)  return res.status(400).json({ error: 'path é obrigatório' });
  if (!token) return res.status(400).json({ error: 'token é obrigatório' });

  if (!isAllowedPath(path)) {
    return res.status(403).json({ error: `Path não permitido: ${path}` });
  }

  // Sanitizar path — não permitir query params injetados via path
  const url = `${ML_BASE}${path}`;

  try {
    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        'User-Agent':    'MLMonitor/1.0',
        ...extraHeaders,
      },
    };

    if (reqBody && (method === 'POST' || method === 'PUT')) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(reqBody);
    }

    const mlRes = await fetch(url, fetchOptions);
    const contentType = mlRes.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await mlRes.json();
    } else {
      const text = await mlRes.text();
      data = { raw: text };
    }

    // Token expirado — sinaliza para o front renovar
    if (mlRes.status === 401) {
      return res.status(401).json({ ...data, _ml_monitor_error: 'token_expired' });
    }

    return res.status(mlRes.status).json(data);

  } catch (err) {
    console.error(`[api/ml] Erro ao chamar ${path}:`, err);
    return res.status(502).json({
      error: 'Falha ao comunicar com o Mercado Livre',
      detail: err.message,
      path,
    });
  }
}
