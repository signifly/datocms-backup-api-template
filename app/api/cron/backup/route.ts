import { NextResponse } from 'next/server';
import {
  verifyCronSecret,
  handleCronBackup,
  type CronBackupResponse,
} from '@casperjuel/datocms-backup-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(): Promise<NextResponse<CronBackupResponse | { error: string }>> {
  const isAuthorized = await verifyCronSecret();

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // All logic is in the package - just call the handler
    const result = await handleCronBackup();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CRON] Critical error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
