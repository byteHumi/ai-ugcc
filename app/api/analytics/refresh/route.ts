import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db';
import { getAllAnalyticsAccounts } from '@/lib/db-analytics';
import { syncAllAccounts } from '@/lib/analytics/sync';

export async function POST() {
  try {
    await ensureDatabaseReady();
    const accounts = await getAllAnalyticsAccounts();
    console.log(`[analytics] refreshing ${accounts.length} accounts:`, accounts.map((a: { platform: string; username: string }) => `${a.platform}/${a.username}`));
    const results = await syncAllAccounts(accounts);
    const failed = results.filter((r: { success: boolean }) => !r.success);
    console.log(`[analytics] refresh done: ${results.length - failed.length} ok, ${failed.length} failed`);
    if (failed.length > 0) console.log('[analytics] failures:', failed);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[analytics] refresh all error:', error);
    return NextResponse.json({ error: 'Failed to refresh accounts' }, { status: 500 });
  }
}
