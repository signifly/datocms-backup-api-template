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
  let run: BackupRun | null = null;

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

    run = {
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

    try {
      await updateRun(completedRun);
    } catch (updateError) {
      console.error('Failed to update run status:', updateError);
      // Still return success if backup worked, even if status update failed
    }

    return NextResponse.json({
      success: result.success,
      run: completedRun,
      error: result.error,
    });
  } catch (error) {
    console.error('Backup trigger error:', error);

    // Try to mark run as failed if we have a run record
    if (run) {
      try {
        await updateRun({
          ...run,
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (updateError) {
        console.error('Failed to update run status on error:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to trigger backup. Please try again.' },
      { status: 500 }
    );
  }
}
