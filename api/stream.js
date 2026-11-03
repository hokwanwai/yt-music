export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).send('Missing ID');

  const sources = [
    `https://inv.tux.pizza/latest_version?id=${id}&itag=140&local=true`,
    `https://invidious.nerdvpn.de/latest_version?id=${id}&itag=140&local=true`,
    `https://yt.artemislena.eu/latest_version?id=${id}&itag=140&local=true`
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (response.ok && response.body) {
        res.setHeader('Content-Type', 'audio/mp4');
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      }
    } catch (e) {}
  }
  return res.status(502).send('Error');
}
