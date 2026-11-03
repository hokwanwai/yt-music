export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json([]);

  const searchHosts = [
    "https://api.piped.private.coffee",
    "https://pipedapi.kavin.rocks",
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza"
  ];

  for (const host of searchHosts) {
    try {
      const isPiped = host.includes('piped');
      const url = isPiped 
        ? `${host}/search?q=${encodeURIComponent(q)}&filter=videos`
        : `${host}/api/v1/search?q=${encodeURIComponent(q)}&type=video`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) continue;
      const data = await response.json();

      let results = [];
      if (isPiped && data.items) {
        results = data.items.filter(i => i.type === 'stream' && i.url).map(i => ({
          id: i.url.replace('/watch?v=', ''),
          title: i.title || '未知標題',
          author: i.uploaderName || 'YouTube',
          thumb: i.thumbnail || `https://i.ytimg.com/vi/${i.url.replace('/watch?v=', '')}/hqdefault.jpg`,
          duration: i.duration || 0
        }));
      } else if (Array.isArray(data)) {
        results = data.filter(i => i.videoId).map(i => ({
          id: i.videoId,
          title: i.title || '未知標題',
          author: i.author || 'YouTube',
          thumb: (i.videoThumbnails && i.videoThumbnails[0] ? i.videoThumbnails[0].url : `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg`),
          duration: i.lengthSeconds || 0
        }));
      }

      if (results.length > 0) {
        return res.status(200).json(results);
      }
    } catch (e) {
      // 嘗試下一個節點
    }
  }

  return res.status(502).json({ error: "Search failed" });
}
