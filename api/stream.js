export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Accept-Ranges', 'bytes');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).send('Missing video ID');

  // 目前運作良好且不限速的專用 Piped API 節點群
  const PIPED_APIS = [
    "https://api.piped.private.coffee",
    "https://pipedapi.leptons.xyz",
    "https://pipedapi.nosebs.ru",
    "https://pipedapi.r4fo.com"
  ];

  for (const host of PIPED_APIS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(`${host}/streams/${id}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!resp.ok) continue;
      const data = await resp.json();

      if (data && data.audioStreams && data.audioStreams.length > 0) {
        // 優先揀選相容性最好的 m4a/aac 串流
        const m4a = data.audioStreams.find(s => s.mimeType && s.mimeType.includes('mp4'));
        const targetStream = m4a || data.audioStreams[0];

        // 伺服器端抓取二進制數據管接至前端，突破 IP 鎖
        const audioFetch = await fetch(targetStream.url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.youtube.com/"
          }
        });

        if (audioFetch.ok && audioFetch.body) {
          res.setHeader('Content-Type', audioFetch.headers.get('content-type') || 'audio/mp4');
          const reader = audioFetch.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          return res.end();
        }
      }
    } catch (e) {
      // 嘗試下一組節點
    }
  }

  return res.status(502).send('No stream available');
}
