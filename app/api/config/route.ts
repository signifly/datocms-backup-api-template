import { NextRequest, NextResponse } from 'next/server';
import {
  getConfig,
  setConfig,
  deleteConfig,
  registerProject,
  unregisterProject,
  updateProjectActivity,
  getApiToken,
  secureCompare,
  validateProjectId,
  validateApiTokenFormat,
  DEFAULT_SCHEDULES,
  type BackupConfig,
  type GetConfigResponse,
  type UpdateConfigRequest,
  type UpdateConfigResponse,
  type ApiError,
} from '@casperjuel/datocms-backup-api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
): Promise<NextResponse<GetConfigResponse | ApiError>> {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId || !validateProjectId(projectId)) {
    return NextResponse.json(
      { error: 'Invalid or missing projectId parameter' },
      { status: 400 }
    );
  }

  const config = await getConfig(projectId);

  if (config) {
    return NextResponse.json({
      config: { ...config, apiToken: '***' },
    });
  }

  return NextResponse.json({ config: null });
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<UpdateConfigResponse | ApiError>> {
  try {
    const body = (await request.json()) as UpdateConfigRequest;
    const { projectId, apiToken, config: configUpdates } = body;

    if (!projectId || !validateProjectId(projectId)) {
      return NextResponse.json(
        { error: 'Invalid or missing projectId' },
        { status: 400 }
      );
    }

    if (!apiToken || !validateApiTokenFormat(apiToken)) {
      return NextResponse.json(
        { error: 'Invalid or missing apiToken format' },
        { status: 400 }
      );
    }

    const existingConfig = await getConfig(projectId);
    const now = new Date().toISOString();

    const newConfig: BackupConfig = {
      projectId,
      apiToken,
      sourceEnvironment: configUpdates?.sourceEnvironment || existingConfig?.sourceEnvironment || 'main',
      schedules: {
        daily: configUpdates?.schedules?.daily || existingConfig?.schedules?.daily || DEFAULT_SCHEDULES.daily,
        weekly: configUpdates?.schedules?.weekly || existingConfig?.schedules?.weekly || DEFAULT_SCHEDULES.weekly,
        monthly: configUpdates?.schedules?.monthly || existingConfig?.schedules?.monthly || DEFAULT_SCHEDULES.monthly,
      },
      notifications: configUpdates?.notifications || existingConfig?.notifications,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
    };

    await setConfig(newConfig);

    if (!existingConfig) {
      await registerProject({
        projectId,
        siteName: projectId,
        registeredAt: now,
        lastActiveAt: now,
      });
    } else {
      await updateProjectActivity(projectId);
    }

    return NextResponse.json({
      success: true,
      config: { ...newConfig, apiToken: '***' },
    });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const token = await getApiToken();

  if (!projectId || !validateProjectId(projectId)) {
    return NextResponse.json(
      { error: 'Invalid or missing projectId parameter' },
      { status: 400 }
    );
  }

  const config = await getConfig(projectId);

  if (!config) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!token || !secureCompare(config.apiToken, token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteConfig(projectId);
  await unregisterProject(projectId);

  return NextResponse.json({ success: true });
}
