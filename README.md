# DatoCMS Backup API

Backend service for [Signifly's DatoCMS Automatic Backups Plugin](https://github.com/signifly/datocms-plugin-signifly-backups).

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsignifly%2Fdatocms-backup-api-template&env=CRON_SECRET&envDescription=Secret%20for%20cron%20endpoint%20authentication.%20Generate%20with%3A%20openssl%20rand%20-hex%2032&stores=%5B%7B%22type%22%3A%22kv%22%7D%5D)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes | Secret for cron endpoint authentication |
| `API_SECRET` | No | Secret for API endpoint authentication |
| `ENCRYPTION_KEY` | No | 64 hex chars for encrypting stored tokens |

## Updating

To update to the latest version:

```bash
npm update @signifly/datocms-backup-api
```

Or enable Dependabot for automatic update PRs.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/config` | GET, PUT, DELETE | Configuration management |
| `/api/backup/trigger` | POST | Trigger manual backup |
| `/api/backup/history` | GET | Get backup history |
| `/api/cron/backup` | GET | Cron endpoint (Vercel cron only) |

## License

MIT - [Signifly](https://signifly.com)
