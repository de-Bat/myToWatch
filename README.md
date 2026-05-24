# myToWatch

Cross-platform watchlist manager for movies and TV series. iOS · Android TV · Web Desktop.

## Quick Start (self-hosted)

**Prerequisites:** Docker, Docker Compose

1. Create `.env` in the project root:
   ```
   JWT_SECRET=<32+ random chars>
   JWT_REFRESH_SECRET=<32+ random chars>
   ENCRYPTION_KEY=<exactly 32 chars>
   TMDB_API_KEY=<from themoviedb.org/settings/api>
   ```

2. Start all services:
   ```bash
   docker compose up
   ```

3. API available at `http://localhost:3000`

The first user to register at `POST /auth/register` becomes ADMIN.

## Development

```bash
pnpm install
cd backend && cp .env.example .env   # fill in values
cd backend && docker compose up -d db
cd backend && pnpm dev
```

## Test

```bash
cd backend && pnpm test
```

Requires Postgres running with `TEST_DATABASE_URL` set in `backend/.env`.

## API Reference

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | /auth/register | — | — | Register (first = ADMIN) |
| POST | /auth/login | — | — | Login, get tokens |
| POST | /auth/refresh | — | — | Refresh access token |
| GET | /media/search?q= | ✓ | any | Search TMDB |
| GET | /media/:id | ✓ | any | Get media detail |
| GET | /media/:id/providers | ✓ | any | Available providers + deep-links |
| GET | /watchlist | ✓ | any | My watchlist |
| POST | /watchlist | ✓ | any | Add to watchlist |
| PATCH | /watchlist/:id | ✓ | any | Update status |
| DELETE | /watchlist/:id | ✓ | any | Remove from watchlist |
| GET | /progress/:mediaId | ✓ | any | My progress for media |
| PUT | /progress/:mediaId | ✓ | any | Update progress |
| POST | /progress/sync | ✓ | any | Pull progress from providers |
| GET | /providers | ✓ | any | List configured providers |
| POST | /providers | ✓ | ADMIN | Add provider |
| PATCH | /providers/:id | ✓ | ADMIN | Update provider |
| DELETE | /providers/:id | ✓ | ADMIN | Delete provider |
| GET | /users | ✓ | ADMIN | List users |
| PATCH | /users/:id/role | ✓ | ADMIN | Change user role |
| DELETE | /users/:id | ✓ | ADMIN | Delete user |

## Plans

- **Plan 1 (this):** Monorepo + Backend core
- **Plan 2:** Provider plugin system + progress sync (Jellyfin/Plex/Netflix)
- **Plan 3:** Expo frontend — iOS + Web Desktop
- **Plan 4:** Android TV adaptations + production hardening
