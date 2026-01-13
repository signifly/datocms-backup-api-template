export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>DatoCMS Backup API</h1>
      <p>This is the API service for DatoCMS automatic environment backups.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>GET /api/health</code> - Health check</li>
        <li><code>GET/PUT /api/config</code> - Configuration management</li>
        <li><code>POST /api/backup/trigger</code> - Trigger manual backup</li>
        <li><code>GET /api/backup/history</code> - Get backup history</li>
        <li><code>GET /api/cron/backup</code> - Cron endpoint (Vercel cron only)</li>
      </ul>
      <p>
        <a href="https://github.com/signifly/datocms-plugin-signifly-backups">
          Documentation
        </a>
      </p>
    </main>
  );
}
