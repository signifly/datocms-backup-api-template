import { NextRequest, NextResponse } from 'next/server';
import {
  checkKvConnection,
  verifyApiSecret,
  API_VERSION,
  type HealthResponse,
} from '@signifly/datocms-backup-api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
): Promise<NextResponse<HealthResponse | { error: string }>> {
  const apiSecretValid = await verifyApiSecret();

  if (!apiSecretValid) {
    return NextResponse.json({ error: 'Invalid API secret' }, { status: 401 });
  }

  const kvConnected = await checkKvConnection();

  return NextResponse.json({
    status: kvConnected ? 'ok' : 'error',
    version: API_VERSION,
    kvConnected,
    timestamp: new Date().toISOString(),
  });
}
