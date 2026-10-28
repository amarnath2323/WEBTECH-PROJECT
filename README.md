# ResumeForge

ResumeForge is a resume builder and portfolio app with a vanilla JavaScript frontend and an Express 5 API backed by SQLite.

## Requirements

- Node.js 22.5 or newer (`node:sqlite` is used by the backend)
- npm

## Run locally

```sh
npm install
npm start
```

Open <http://localhost:5000>. The server creates `resumeforge.db` and its tables on first startup. In non-production environments it seeds a demo account:

- Email: `amarnath@example.com`
- Password: `password123`

Create your own account from the Sign In dialog to keep your resumes and portfolio separate from the demo profile. Serve the app through Express rather than opening `index.html` directly; the API and public portfolios require the server.

## Configuration

Copy `.env.example` to `.env` and set values as needed:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | unset | Set to `production` to disable demo data and require a secure JWT secret |
| `JWT_SECRET` | Development-only value | Random secret of at least 32 characters; required in production |
| `DB_TYPE` | `sqlite` | SQLite is the supported database engine |
| `SQLITE_PATH` | `./resumeforge.db` | Path to the SQLite database |

Generate a production secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Keep `.env` and the SQLite database private and backed up.

## Backend API

- `GET /api/health` — service and database status
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` — account registration and bearer-token authentication
- `/api/resumes` — authenticated resume create, list, read, update, duplicate, delete, and local-data sync
- `/api/portfolio/settings` — authenticated public portfolio settings
- `GET /p/:slug` and `POST /api/portfolio/:slug/contact` — published public portfolios and contact submissions
- `/api/messages` — authenticated inbox, read, and delete operations
- `POST /api/ai/ats-analyze`, `POST /api/ai/enhance-bullet` — local heuristic ATS analysis and bullet rewrites (these endpoints do not call a third-party AI provider)

The JSON API is limited to 1 MB per request. Authentication uses expiring JWT bearer tokens; passwords are stored using salted scrypt hashes. Account-owned resources are scoped to the authenticated user. Public portfolio URLs accept only published profiles.

## Tests

```sh
npm test
```

The integration tests use a temporary SQLite database and an ephemeral local port; they do not modify the development database.

## Notes

- Resume drafts are locally autosaved when signed out and stored in SQLite when signed in.
- SQLite is the only currently supported database. MySQL configuration is intentionally not advertised as implemented.
- Resume strength and ATS analysis are heuristics, not an employment or hiring prediction.
- Review all resume content for accuracy before sharing it.
