import { resolveInstagramUser, fetchInstagramProfile, fetchInstagramReels } from './instagram';
import { resolveTikTokUser, fetchTikTokPosts } from './tiktok';
import { resolveYouTubeChannel, fetchYouTubeVideos } from './youtube';
import {
  updateAnalyticsAccount,
  upsertMediaItem,
  upsertAccountSnapshot,
  upsertMediaSnapshot,
  getMediaExternalIds,
} from '../db-analytics';

type AccountRow = {
  id: string;
  platform: string;
  username: string;
  account_id?: string;
};

export async function syncAccount(account: AccountRow, full = false) {
  const { id, platform, username } = account;

  try {
    switch (platform) {
      case 'instagram': await syncInstagram(id, username, account.account_id, full); break;
      case 'tiktok':    await syncTikTok(id, username, account.account_id, full); break;
      case 'youtube':   await syncYouTube(id, username, account.account_id, full); break;
      default: throw new Error(`Unsupported platform: ${platform}`);
    }
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[analytics] sync failed for ${platform}/${username}:`, message);
    return { success: false, error: message };
  }
}

async function syncInstagram(accountDbId: string, username: string, existingUserId?: string, full = false) {
  const userId = existingUserId || await resolveInstagramUser(username);
  const [profile, knownIds] = await Promise.all([
    fetchInstagramProfile(userId),
    getMediaExternalIds(accountDbId),
  ]);

  const reels = await fetchInstagramReels(
    userId,
    full ? 10 : 2,
    full ? undefined : (knownIds as Set<string>),
  );

  let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0;
  for (const r of reels) {
    totalViews += r.views;
    totalLikes += r.likes;
    totalComments += r.comments;
    totalShares += r.shares;
    totalSaves += r.saves;
  }

  const totalInteractions = totalLikes + totalComments + totalShares;
  const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

  await updateAnalyticsAccount(accountDbId, {
    accountId: userId,
    displayName: profile.displayName,
    profileUrl: profile.profileUrl,
    followers: profile.followers,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate,
    metadata: { following: profile.following, mediaCount: profile.mediaCount, totalSaves },
  });

  await upsertAccountSnapshot(accountDbId, {
    followers: profile.followers,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate,
  });

  for (const r of reels) {
    const interactions = r.likes + r.comments + r.shares;
    const mediaEngagement = r.views > 0 ? (interactions / r.views) * 100 : 0;
    const mediaItem = await upsertMediaItem({
      accountId: accountDbId,
      platform: 'instagram',
      externalId: r.externalId,
      title: null,
      caption: r.caption,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl,
      publishedAt: r.publishedAt || null,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saves,
      engagementRate: mediaEngagement,
      metadata: null,
    });
    await upsertMediaSnapshot(mediaItem.id, {
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      engagementRate: mediaEngagement,
    });
  }
}

async function syncTikTok(accountDbId: string, username: string, existingSecUid?: string, full = false) {
  const [userInfo, knownIds] = await Promise.all([
    resolveTikTokUser(username),
    getMediaExternalIds(accountDbId),
  ]);
  const secUid = existingSecUid || userInfo.secUid;

  const posts = await fetchTikTokPosts(
    secUid,
    full ? 5 : 2,
    full ? undefined : (knownIds as Set<string>),
  );

  let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;
  for (const p of posts) {
    totalViews += p.views;
    totalLikes += p.likes;
    totalComments += p.comments;
    totalShares += p.shares;
  }

  const totalInteractions = totalLikes + totalComments + totalShares;
  const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

  await updateAnalyticsAccount(accountDbId, {
    accountId: userInfo.secUid,
    displayName: userInfo.displayName,
    profileUrl: userInfo.profileUrl,
    followers: userInfo.followers,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate,
    metadata: { following: userInfo.following, heartCount: userInfo.likes, videoCount: userInfo.videoCount },
  });

  await upsertAccountSnapshot(accountDbId, {
    followers: userInfo.followers,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate,
  });

  for (const p of posts) {
    const interactions = p.likes + p.comments + p.shares;
    const mediaEngagement = p.views > 0 ? (interactions / p.views) * 100 : 0;
    const mediaItem = await upsertMediaItem({
      accountId: accountDbId,
      platform: 'tiktok',
      externalId: p.externalId,
      title: null,
      caption: p.caption,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl,
      publishedAt: p.publishedAt || null,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: 0,
      engagementRate: mediaEngagement,
      metadata: null,
    });
    await upsertMediaSnapshot(mediaItem.id, {
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      engagementRate: mediaEngagement,
    });
  }
}

async function syncYouTube(accountDbId: string, identifier: string, existingChannelId?: string, full = false) {
  const [channel, knownIds] = await Promise.all([
    resolveYouTubeChannel(existingChannelId || identifier),
    getMediaExternalIds(accountDbId),
  ]);

  const videos = await fetchYouTubeVideos(
    channel.channelId,
    full ? 120 : 50,
    full ? undefined : (knownIds as Set<string>),
  );

  let totalViews = 0, totalLikes = 0, totalComments = 0;
  for (const v of videos) {
    totalViews += v.views;
    totalLikes += v.likes;
    totalComments += v.comments;
  }

  const totalInteractions = totalLikes + totalComments;
  const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

  await updateAnalyticsAccount(accountDbId, {
    accountId: channel.channelId,
    displayName: channel.title,
    profileUrl: channel.thumbnailUrl,
    followers: channel.subscriberCount,
    totalViews,
    totalLikes,
    totalComments,
    totalShares: 0,
    engagementRate,
    metadata: { channelVideoCount: channel.videoCount, channelViewCount: channel.viewCount, uploadsPlaylistId: channel.uploadsPlaylistId },
  });

  await upsertAccountSnapshot(accountDbId, {
    followers: channel.subscriberCount,
    totalViews,
    totalLikes,
    totalComments,
    totalShares: 0,
    engagementRate,
  });

  for (const v of videos) {
    const interactions = v.likes + v.comments;
    const mediaEngagement = v.views > 0 ? (interactions / v.views) * 100 : 0;
    const mediaItem = await upsertMediaItem({
      accountId: accountDbId,
      platform: 'youtube',
      externalId: v.externalId,
      title: v.title,
      caption: v.caption,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      publishedAt: v.publishedAt || null,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      shares: 0,
      saves: 0,
      engagementRate: mediaEngagement,
      metadata: null,
    });
    await upsertMediaSnapshot(mediaItem.id, {
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      shares: 0,
      engagementRate: mediaEngagement,
    });
  }
}

export async function syncAllAccounts(accounts: AccountRow[], full = false) {
  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const account of accounts) {
    if (results.length > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }
    const result = await syncAccount(account, full);
    results.push({ id: account.id, ...result });
  }
  return results;
}
