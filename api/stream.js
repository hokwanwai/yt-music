export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).send('Missing video ID');
  }

  const candidates = [
    `https://inv.tux.pizza/latest_version?id=${id}&itag=140&local=true`,
    `https://invidious.nerdvpn.de/latest_version?id=${id}&itag=140&local=true`,
    `https://yt.artemislena.eu/latest_version?id=${id}&itag=140&local=true`
  ];

  for (const streamUrl of candidates) {
    try {
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok && response.body) {
        res.setHeader('Content-Type', 'audio/mp4');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      }
    } catch (e) {
      console.warn('嘗試下一個串流源...', streamUrl);
    }
  }

  return res.status(502).send('Audio stream currently unavailable');
}
