# Backend 1 — quick developer notes

This repository provides a small Express API for reminders. It can run in two modes:

- Mock mode (recommended for fast local development)
- Real DB mode (connects to Postgres/Supabase via `DATABASE_URL` in `.env`)

## Run with mock data (quick)

This is the fastest way to develop without needing DB credentials.

In PowerShell (temporary for the session):

```powershell
$env:USE_MOCK_DB='true'
node nodeserver.js
```

Or start in background:

```powershell
$env:USE_MOCK_DB='true'
Start-Process -FilePath node -ArgumentList 'nodeserver.js'
```

Then visit:
- http://localhost:5001/health
- http://localhost:5001/api/reminders

The mock responses are returned when `USE_MOCK_DB` is set to `true`.

## Try the real DB (diagnostics)

If you need real DB connectivity (integration / E2E tests / production), put a valid `DATABASE_URL` into `.env`.

1. Confirm the connection string from your Supabase dashboard (Settings → Database → Connection string).
2. Paste it into `.env` as `DATABASE_URL=postgresql://...` (do NOT commit `.env`).
3. Test connectivity quickly using the included script:

```powershell
node scripts/diagnostics/db_test.js
```

If that shows `Tenant or user not found` or other errors, follow these checks:

- Ensure the DB user exists and the password is correct. If in doubt, reset the password in Supabase and use the updated connection string.
- If the password contains special characters (e.g., `@`), use the exact connection string Supabase provides — it will be URL-encoded.
- Confirm the project/tenant is active in Supabase.

You can also run the automated variants tester which tries common fixes:

```powershell
node scripts/diagnostics/db_try_variants.js
```

It attempts a few variants (decoded auth, `%40` -> `@`, with/without SSL) and prints detailed errors.

## Next steps & helpers I added

- `nodeserver.js` — new server entrypoint with CORS and graceful shutdown.
- `db_test.js` — simple SELECT NOW() test using the project's `db` module.
- `db_try_variants.js` — tries a few connection-string variants to surface more detailed errors.
- Mock support in `routes/reminders.js` (enable with `USE_MOCK_DB=true`).

Files for diagnostics are located under `scripts/diagnostics/` for convenience.

Quick start
----------

1. Copy `.env.example` to `.env` and fill `DATABASE_URL` if you plan to use the real DB.
2. To run with mock data (no DB required):

```powershell
$env:USE_MOCK_DB='true'
node nodeserver.js
```

3. To run the test suite:

```powershell
npm test
```

Deploy & Security
-----------------

This project is small but will store credentials to reach your Postgres database. Follow these practical, low-risk steps when deploying:

- Keep secrets out of version control
	- Do NOT commit `.env` files. Use `.env.example` as a template.
	- Use environment variables from your host (Docker, systemd, cloud provider) or a secrets manager (AWS Secrets Manager, Azure Key Vault, etc.) in production.

- DATABASE_URL
	- Provide a full Postgres connection string in the environment variable `DATABASE_URL` when you run in real DB mode. Example format: `postgresql://user:password@host:6543/dbname`.
	- If your password contains special characters, use the connection string provided by your provider (many providers URL-encode credentials for you).

- SSL/TLS
	- For managed Postgres providers (Supabase, RDS), enable SSL in the DB client. Current `db/index.js` sets `ssl.rejectUnauthorized = false` to support common managed providers; for production you should pin CA certs or enable proper verification when possible.

- Run-time configuration
	- Use `PORT` to set the server port. Default is `5001`.
	- Use `USE_MOCK_DB=true` in local development to avoid touching your database.

- CI / test
	- Add a CI job that runs `npm ci` and `npm test` on pull requests. Do not run integration tests that use real DB credentials in CI unless you have a dedicated testing DB and credentials injected via secrets.

- Minimal deploy checklist
	1. Ensure `DATABASE_URL` is set in the target environment and points to the correct DB/project.
 2. Ensure any firewall or network policies allow your app to reach the DB host and port.
 3. Ensure logging/monitoring are configured so DB errors are visible (stderr/stdout, log aggregator).
 4. Do a smoke test: `GET /health` and `GET /api/reminders`.
 5. If rolling back, ensure you restore previous `DATABASE_URL` or keep previous release available until data consistency is verified.

Optional hardening ideas
-----------------------

- Add structured logging (Pino, Winston) to capture request ids and correlate DB errors.
- Add rate limiting on endpoints to reduce the blast radius in case of abuse.
- Consider stricter SSL verification for DB connections (pin CA certs) if you control the deployment environment.

Helper: start/stop servers (Windows PowerShell)
---------------------------------------------

I added a small helper script `scripts/serverctl.ps1` to start/stop the main and mock servers on Windows. Examples:

Start the main server:

```powershell
.\scripts\serverctl.ps1 start main
```

Start a mock server on port 5002:

```powershell
.\scripts\serverctl.ps1 start mock
```

Stop servers:

```powershell
.\scripts\serverctl.ps1 stop main
.\scripts\serverctl.ps1 stop mock
```

Status:

```powershell
.\scripts\serverctl.ps1 status
```



If you want, I can also:

- Add a small automated test for the mock endpoint.
- Attempt further connection attempts if you provide updated/alternate credentials.
- Add a README section showing how to run the server on Linux/macOS.
