export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Accept-Ranges', 'bytes');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).send('Missing video ID');

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  const cobaltInstances = [
    "https://api.cobalt.tools/api/json",
    "https://cobalt-api.kwiatekm.tokyo/api/json",
    "https://api.server.ovh/api/json"
  ];

  let audioUrl = null;

  for (const apiUrl of cobaltInstances) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadMode: "audio",
          audioFormat: "mp3"
        }),
        signal: controller.signal
      });

      clearTimeout(timer);
      if (!resp.ok) continue;

      const data = await resp.json();
      if (data && data.url) {
        audioUrl = data.url;
        break;
      }
    } catch (e) {}
  }

  // 若 Cobalt 實例均忙，使用 Invidious 專用音訊中轉
  if (!audioUrl) {
    audioUrl = `https://invidious.nerdvpn.de/latest_version?id=${id}&itag=140&local=true`;
  }

  try {
    const audioResp = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!audioResp.ok) throw new Error("Audio source failed");

    res.setHeader('Content-Type', audioResp.headers.get('content-type') || 'audio/mp4');
    const contentLength = audioResp.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const reader = audioResp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    return res.end();
  } catch (err) {
    return res.status(502).send('Stream error');
  }
}
