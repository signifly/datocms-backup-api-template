import { NextRequest, NextResponse } from 'next/server';
import {
  getConfig,
  getRunHistory,
  getApiToken,
  secureCompare,
  validateLimit,
  validateOffset,
  validateBackupType,
  validateStatus,
  validateProjectId,
  type HistoryResponse,
  type ApiError,
} from '@casperjuel/datocms-backup-api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
): Promise<NextResponse<HistoryResponse | ApiError>> {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId || !validateProjectId(projectId)) {
    return NextResponse.json(
      { error: 'Invalid or missing projectId parameter' },
      { status: 400 }
    );
  }

  const limit = validateLimit(searchParams.get('limit'));
  const offset = validateOffset(searchParams.get('offset'));
  const typeFilter = validateBackupType(searchParams.get('type'));
  const statusFilter = validateStatus(searchParams.get('status'));

  const token = await getApiToken();
  const config = await getConfig(projectId);

  if (!config) {
    return NextResponse.json(
      { error: 'Project not configured' },
      { status: 404 }
    );
  }

  if (!token || !secureCompare(config.apiToken, token)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { runs, total } = await getRunHistory(projectId, limit + 1, offset);

  let filteredRuns = runs;

  if (typeFilter) {
    filteredRuns = filteredRuns.filter((run) => run.type === typeFilter);
  }

  if (statusFilter) {
    filteredRuns = filteredRuns.filter((run) => run.status === statusFilter);
  }

  const hasMore = runs.length > limit;
  const resultRuns = filteredRuns.slice(0, limit);

  return NextResponse.json({
    runs: resultRuns,
    total,
    hasMore,
  });
}
