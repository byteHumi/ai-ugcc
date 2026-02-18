import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db';
import { getAllAnalyticsAccounts } from '@/lib/db-analytics';
import { syncAllAccounts } from '@/lib/analytics/sync';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseReady();
    const accounts = await getAllAnalyticsAccounts();
    const mode = request.nextUrl.searchParams.get('mode');
    const full = mode !== 'quick';
    console.log(`[analytics] ${full ? 'FULL' : 'quick'} refresh for ${accounts.length} accounts`);
    const results = await syncAllAccounts(accounts, full);
    const failed = results.filter((r: { success: boolean }) => !r.success);
    console.log(`[analytics] refresh done: ${results.length - failed.length} ok, ${failed.length} failed`);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[analytics] refresh all error:', error);
    return NextResponse.json({ error: 'Failed to refresh accounts' }, { status: 500 });
  }
}
