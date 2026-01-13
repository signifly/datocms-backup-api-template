import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getConfig,
  addRun,
  updateRun,
  getApiToken,
  secureCompare,
  createBackup,
  generateBackupEnvironmentId,
  validateProjectId,
  validateBackupType,
  validateEnvironmentPrefix,
  validateNote,
  type BackupRun,
  type TriggerBackupRequest,
  type TriggerBackupResponse,
  type ApiError,
} from '@casperjuel/datocms-backup-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  request: NextRequest
): Promise<NextResponse<TriggerBackupResponse | ApiError>> {
  try {
    const body = (await request.json()) as TriggerBackupRequest;
    const { projectId, type = 'manual', options } = body;
    const token = await getApiToken();

    if (!projectId || !validateProjectId(projectId)) {
      return NextResponse.json(
        { error: 'Invalid or missing projectId' },
        { status: 400 }
      );
    }

    const validatedType = validateBackupType(type) || 'manual';
    const sanitizedPrefix = validateEnvironmentPrefix(options?.environmentPrefix);
    const sanitizedNote = validateNote(options?.note);

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

    const prefix = sanitizedPrefix || `${validatedType}-backup`;
    const targetEnvironmentId = generateBackupEnvironmentId(prefix);

    const run: BackupRun = {
      id: uuidv4(),
      projectId,
      type: validatedType,
      status: 'in_progress',
      sourceEnvironment: config.sourceEnvironment,
      targetEnvironment: targetEnvironmentId,
      startedAt: new Date().toISOString(),
      metadata: {
        triggeredBy: 'manual',
        note: sanitizedNote,
      },
    };

    await addRun(run);

    const startTime = Date.now();
    const result = await createBackup(
      config.apiToken,
      config.sourceEnvironment,
      targetEnvironmentId
    );
    const duration = Date.now() - startTime;

    const completedRun: BackupRun = {
      ...run,
      status: result.success ? 'completed' : 'failed',
      completedAt: new Date().toISOString(),
      duration,
      error: result.error,
      metadata: {
        ...run.metadata,
        environmentId: result.environmentId,
      },
    };

    await updateRun(completedRun);

    return NextResponse.json({
      success: result.success,
      run: completedRun,
      error: result.error,
    });
  } catch (error) {
    console.error('Backup trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger backup. Please try again.' },
      { status: 500 }
    );
  }
}
