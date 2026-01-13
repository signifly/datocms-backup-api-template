import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getConfig,
  getActiveProjects,
  getRunHistory,
  addRun,
  updateRun,
  updateProjectActivity,
  verifyCronSecret,
  createBackup,
  getScheduledBackups,
  generateBackupEnvironmentId,
  enforceRetention,
  type BackupRun,
  type BackupType,
  type CronBackupResponse,
  type CronBackupResult,
} from '@signifly/datocms-backup-api';

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

  const results: CronBackupResult[] = [];
  const timestamp = new Date().toISOString();

  console.log(`[CRON] Backup cron started at ${timestamp}`);

  try {
    const projectIds = await getActiveProjects();
    console.log(`[CRON] Found ${projectIds.length} active projects`);

    for (const projectId of projectIds) {
      try {
        const config = await getConfig(projectId);

        if (!config) {
          console.log(`[CRON] No config found for project ${projectId}, skipping`);
          continue;
        }

        const { runs } = await getRunHistory(projectId, 100, 0);
        const lastRuns: Record<BackupType, Date | null> = {
          daily: null,
          weekly: null,
          monthly: null,
          manual: null,
        };

        for (const run of runs) {
          if (run.status === 'completed' && !lastRuns[run.type]) {
            lastRuns[run.type] = new Date(run.completedAt || run.startedAt);
          }
        }

        const scheduledBackups = getScheduledBackups(config, lastRuns);
        console.log(`[CRON] Project ${projectId}: ${scheduledBackups.length} backups to run`);

        for (const backup of scheduledBackups) {
          const targetEnvironmentId = generateBackupEnvironmentId(backup.schedule.prefix);

          const run: BackupRun = {
            id: uuidv4(),
            projectId,
            type: backup.type,
            status: 'in_progress',
            sourceEnvironment: config.sourceEnvironment,
            targetEnvironment: targetEnvironmentId,
            startedAt: new Date().toISOString(),
            metadata: {
              triggeredBy: 'cron',
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

          results.push({
            projectId,
            type: backup.type,
            runId: run.id,
            status: result.success ? 'started' : 'error',
            error: result.error,
          });

          console.log(
            `[CRON] Project ${projectId}: ${backup.type} backup ${result.success ? 'completed' : 'failed'}`
          );

          if (result.success) {
            try {
              const retentionResult = await enforceRetention(config, backup.type);
              console.log(
                `[CRON] Project ${projectId}: cleaned up ${retentionResult.deletedEnvironments.length} old environments`
              );
            } catch (error) {
              console.error(`[CRON] Retention cleanup error:`, error);
            }
          }
        }

        await updateProjectActivity(projectId);
      } catch (error) {
        console.error(`[CRON] Error processing project ${projectId}:`, error);
        results.push({
          projectId,
          type: 'daily',
          runId: '',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[CRON] Backup cron completed. Processed ${results.length} backups`);

    return NextResponse.json({
      success: true,
      executed: results,
      timestamp,
    });
  } catch (error) {
    console.error('[CRON] Critical error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
