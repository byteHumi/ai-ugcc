const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const BASE = 'https://www.googleapis.com/youtube/v3';

async function ytGet(path: string) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}key=${YOUTUBE_API_KEY}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function resolveYouTubeChannel(identifier: string): Promise<{ channelId: string; title: string; thumbnailUrl: string; subscriberCount: number; videoCount: number; viewCount: number; uploadsPlaylistId: string }> {
  // Try as channel ID first
  let data = await ytGet(`/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(identifier)}`);
  let channel = data?.items?.[0];

  if (!channel) {
    // Try as username/handle
    data = await ytGet(`/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(identifier)}`);
    channel = data?.items?.[0];
  }

  if (!channel) {
    // Search for channel
    const searchData = await ytGet(`/search?part=snippet&type=channel&q=${encodeURIComponent(identifier)}&maxResults=1`);
    const channelId = searchData?.items?.[0]?.snippet?.channelId;
    if (channelId) {
      data = await ytGet(`/channels?part=snippet,statistics,contentDetails&id=${channelId}`);
      channel = data?.items?.[0];
    }
  }

  if (!channel) throw new Error(`Could not resolve YouTube channel: ${identifier}`);

  return {
    channelId: channel.id,
    title: channel.snippet?.title || '',
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || '',
    subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
    videoCount: Number(channel.statistics?.videoCount ?? 0),
    viewCount: Number(channel.statistics?.viewCount ?? 0),
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads || '',
  };
}

type YouTubeVideo = {
  externalId: string;
  title: string;
  caption: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
};

export async function fetchYouTubeVideos(channelId: string, maxVideos = 120): Promise<YouTubeVideo[]> {
  // Get uploads playlist
  const channelData = await ytGet(`/channels?part=contentDetails&id=${channelId}`);
  const uploadsPlaylistId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Get all playlist items (paginated)
  const videoIds: string[] = [];
  let pageToken = '';

  while (videoIds.length < maxVideos) {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
    const plData = await ytGet(`/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50${pageParam}`);
    const items = plData?.items || [];
    for (const item of items) {
      const vid = item?.contentDetails?.videoId;
      if (!vid) continue;
      videoIds.push(vid);
    }
    pageToken = plData?.nextPageToken || '';
    if (!pageToken || items.length === 0) break;
  }

  if (videoIds.length === 0) return [];

  // Batch video details (50 at a time)
  const videos: YouTubeVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const vData = await ytGet(`/videos?part=snippet,statistics&id=${batch.join(',')}`);
    for (const v of vData?.items || []) {
      videos.push({
        externalId: v.id,
        title: v.snippet?.title || '',
        caption: v.snippet?.description || '',
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
        publishedAt: v.snippet?.publishedAt || '',
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
      });
    }
  }

  return videos;
}
