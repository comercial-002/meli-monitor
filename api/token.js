export default async function handler(req, res) {
  try {
    // aceita tanto JSON quanto vazio (evita crash)
    let code;

    if (req.body) {
      try {
        const parsed = typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body;

        code = parsed.code;
      } catch (e) {
        return res.status(400).json({ error: 'Body inválido' });
      }
    }

    if (!code) {
      return res.status(400).json({ error: 'Code não enviado' });
    }

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: 'https://meli-monitor.vercel.app/callback.html'
      })
    });

    const data = await response.json();

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
