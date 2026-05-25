# myToWatch — How To Run

Sections: [Backend Server](#1-backend-server), [Web Browser](#2-web-browser-api-only), [iOS](#3-ios), [Android TV](#4-android-tv), [Linux Server](#5-linux-server-self-hosted).

---

## Prerequisites (all platforms)

| Tool | Required version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Git | any | https://git-scm.com |

```bash
# Verify
node -v    # v20+
pnpm -v    # 9+
docker -v  # Docker version 25+
```

Clone and install:

```bash
git clone <your-repo-url>
cd myToWatch
pnpm install
```

---

## 1. Backend Server

### Option A — Docker (recommended for production / Android TV)

The backend + Postgres run in Docker. No local Postgres needed.

**Step 1 — Create your `.env` file** (one-time setup):

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in real values:

```env
# Leave DATABASE_URL as-is for Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytowatch"

# Generate three random 32+ char secrets (run these in your terminal):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="<generate-random-32-chars>"
JWT_REFRESH_SECRET="<generate-random-32-chars>"
ENCRYPTION_KEY="<generate-random-32-chars>"

# Get a free key at https://www.themoviedb.org/settings/api
TMDB_API_KEY="<your-tmdb-api-key>"
```

> **Security:** `backend/.env` is gitignored. Never commit it. Provider configs are AES-256 encrypted in the database.

**Step 2 — Start the stack:**

```bash
# From the repo root
docker compose up --build
```

First run takes ~2 minutes (builds image, downloads Postgres). Subsequent starts take ~10 seconds.

**Step 3 — Verify it's running:**

```bash
curl http://localhost:3000/health
# → {"ok":true}
```

**Stop:**
```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop + delete all data (full reset)
```

---

### Option B — Local dev (hot reload)

Use this when developing the backend.

**Prerequisite:** Postgres must be running. Easiest way — start just the DB container:

```bash
docker compose up db -d
```

**Step 1 — Create `.env`** (same as Option A above).

**Step 2 — Run migrations:**

```bash
cd backend
pnpm db:migrate
```

**Step 3 — Start the dev server:**

```bash
cd backend
pnpm dev
# → tsx watch src/index.ts
# → Listening on port 3000
```

Changes to `backend/src/**` hot-reload automatically.

---

### First-time setup: create your admin account

After the server is running (either option), register the first user. The **first registered user automatically becomes ADMIN**.

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "email": "you@example.com", "role": "ADMIN" }
}
```

Save the `accessToken` — you'll need it to call other endpoints (or use the mobile app which handles this automatically).

---

## 2. Web Browser (API only)

The backend is a JSON REST API — there is no web frontend. The mobile app (Expo) handles all UI. However, you can:

### Explore the API from a browser

With the backend running, open: `http://localhost:3000/health`

### Use Expo Go in a web browser (development only)

```bash
cd apps/mobile
pnpm dev
# → Press w for web
```

> **Note:** The web version is for development inspection only. The TV layout and D-pad navigation only work on Android TV. The production targets are Android TV and iOS.

---

## 3. iOS

### Option A — Expo Go (fastest, no Xcode needed)

Run on your physical iPhone or iPad without building a native binary.

**Step 1 — Install Expo Go** on your iPhone/iPad from the App Store.

**Step 2 — Start the backend** (see Section 1). Note your machine's local IP address:

```bash
# Mac/Linux
ipconfig getifaddr en0       # e.g. 192.168.1.42

# Windows
ipconfig | findstr "IPv4"    # e.g. 192.168.1.42
```

Your phone and computer must be on the same Wi-Fi network.

**Step 3 — Start the Expo dev server:**

```bash
cd apps/mobile
pnpm dev
```

**Step 4 — Open on iPhone:**

- Open the Camera app and scan the QR code printed in the terminal
- OR open Expo Go → tap the QR scan icon

**Step 5 — Connect to your backend:**

In the app's onboarding screen, enter:
```
http://192.168.1.42:3000
```
(Replace with your actual IP from Step 2.)

---

### Option B — iOS Simulator (Mac only, requires Xcode)

**Step 1 — Install Xcode** from the Mac App Store (free, ~7 GB).

**Step 2 — Install Xcode Command Line Tools:**

```bash
xcode-select --install
```

**Step 3 — Start the backend:**

```bash
# From repo root
docker compose up --build -d
```

**Step 4 — Start Expo and launch simulator:**

```bash
cd apps/mobile
pnpm dev
# → Press i to open iOS Simulator
```

Expo will open the Simulator automatically (defaults to latest iPhone model).

**Step 5 — Connect to backend:**

In the simulator, the backend is at `http://localhost:3000` (simulator shares the host network on Mac).

Enter `http://localhost:3000` in the onboarding screen.

---

### Option C — Production build (TestFlight / App Store)

**Requirements:** Mac with Xcode 15+, Apple Developer account ($99/year).

```bash
cd apps/mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (one-time)
eas build:configure

# Build for iOS (takes ~15 min on EAS servers)
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

> The backend URL is entered by users at first launch (onboarding screen). No hardcoding needed.

---

## 4. Android TV

### Option A — Physical Android TV device (recommended)

Works with: NVIDIA SHIELD, Chromecast with Google TV, Xiaomi Mi Box, Amazon Fire TV Stick 4K, any Android TV / Google TV device.

**Step 1 — Enable Developer Options on your TV:**

1. Go to **Settings → About → Build** (or Device Preferences → About)
2. Click **Build** 7 times until "Developer mode enabled" appears
3. Go to **Settings → Developer Options**
4. Enable **USB debugging** (and **ADB over network** if you want wireless)

**Step 2 — Connect ADB:**

```bash
# Find your TV's IP in Settings → About → Network
adb connect 192.168.1.100:5555   # replace with your TV's IP

# Verify connection
adb devices
# → 192.168.1.100:5555  device
```

If `adb` is not found, install Android Platform Tools:
- Mac: `brew install android-platform-tools`
- Windows: Download from https://developer.android.com/studio/releases/platform-tools

**Step 3 — Build and install the app:**

```bash
cd apps/mobile

# Prebuild native project (generates android/ directory)
npx expo prebuild --platform android

# Build debug APK
npx expo run:android --device
```

Expo will detect your connected TV and deploy to it. The app appears in the Android TV launcher under **Apps**.

**Step 4 — Start your backend** (see Section 1). Note your server's local IP.

**Step 5 — Connect in the app:**

In the onboarding screen on your TV, navigate with D-pad to the URL field and enter your backend URL:
```
http://192.168.1.42:3000
```

---

### Option B — Android TV Emulator (development, no physical TV)

**Step 1 — Install Android Studio:** https://developer.android.com/studio

**Step 2 — Create an Android TV AVD:**

1. Open Android Studio → **Virtual Device Manager**
2. Click **Create Device**
3. Category: **TV** → select **Android TV (1080p)** → Next
4. System Image: **API 31** (Android 12) → Download if needed → Next
5. Finish → Start the emulator

**Step 3 — Build and run:**

```bash
cd apps/mobile
npx expo prebuild --platform android
npx expo run:android
```

Expo auto-detects the running emulator.

**Step 4 — Backend access from emulator:**

The emulator's `localhost` is NOT your machine. Use the special Android emulator address:
```
http://10.0.2.2:3000
```

Enter this in the onboarding screen.

---

### Option C — Production APK (sideload or Play Store)

For deploying to a TV without a development machine connected.

**Step 1 — Build a release APK:**

```bash
cd apps/mobile

# Install EAS CLI if not already installed
npm install -g eas-cli
eas login

# Build release Android APK
eas build --platform android --profile preview
```

EAS builds in the cloud. You'll get a download link to a `.apk` file.

**Step 2 — Sideload to Android TV:**

```bash
# Transfer APK to TV via ADB
adb connect 192.168.1.100:5555
adb install mytowatch.apk
```

OR

```bash
# Copy APK to USB drive, insert into TV
# Open Files app on TV → install APK
# (Enable "Unknown sources" in Developer Options first)
```

**Step 3 — Submit to Google Play (optional):**

```bash
# Build AAB (required for Play Store)
eas build --platform android --profile production

# Submit
eas submit --platform android
```

Play Store review is required. The app appears in the "Android TV" section automatically because of the `LEANBACK_LAUNCHER` intent filter in `app.json`.

---

## 5. Linux Server (self-hosted)

Full instructions for running the backend on any Linux machine — Ubuntu/Debian home server, Raspberry Pi, VPS, NAS with Docker.

---

### 5a. Install dependencies

```bash
# Ubuntu / Debian / Raspberry Pi OS
sudo apt-get update && sudo apt-get install -y \
  curl git ca-certificates gnupg lsb-release

# Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# Docker Engine (not Docker Desktop — this is the headless server version)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # allow running docker without sudo
newgrp docker                   # apply group change without logout
```

Verify:

```bash
node -v     # v20+
pnpm -v     # 9+
docker -v   # Docker version 25+
docker compose version   # v2+
```

> On Raspberry Pi 4/5, use Raspberry Pi OS 64-bit (Bookworm). All steps are identical.

---

### 5b. Get the code

```bash
# Clone the repo
git clone <your-repo-url> /opt/mytowatch
cd /opt/mytowatch
```

Or copy from another machine:

```bash
# From your dev machine
scp -r . user@server-ip:/opt/mytowatch
```

---

### 5c. Configure environment

```bash
cd /opt/mytowatch
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in all values:

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/mytowatch"

# Generate each secret — run on your server:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="<32-char-random-hex>"
JWT_REFRESH_SECRET="<32-char-random-hex>"
ENCRYPTION_KEY="<32-char-random-hex>"

# Free key at https://www.themoviedb.org/settings/api
TMDB_API_KEY="<your-key>"

NODE_ENV=production
PORT=3000
```

> **Never commit `.env`.** It is gitignored. Store it only on the server.

---

### 5d. Start with Docker Compose

```bash
cd /opt/mytowatch
docker compose up -d --build
```

- `--build` compiles the backend image (takes ~2 min first time)
- `-d` runs in background (detached)
- Postgres data persists in Docker volume `pgdata` across restarts

Check it's running:

```bash
docker compose ps
# NAME                STATUS
# mytowatch-api-1     running
# mytowatch-db-1      running

curl http://localhost:3000/health
# → {"ok":true}
```

View logs:

```bash
docker compose logs -f api    # backend logs, live
docker compose logs -f db     # postgres logs
```

---

### 5e. Auto-start on boot (systemd)

Docker itself auto-starts on boot after `sudo systemctl enable docker`. To make the containers also start automatically, add `restart: always` to `docker-compose.yml`:

```yaml
# docker-compose.yml
services:
  api:
    restart: always
    # ... rest of config

  db:
    restart: always
    # ... rest of config
```

Apply the change:

```bash
docker compose up -d   # recreates containers with new restart policy
```

Verify restart policy is set:

```bash
docker inspect mytowatch-api-1 | grep RestartPolicy -A3
# "RestartPolicy": { "Name": "always", ... }
```

Now the backend survives server reboots with no manual intervention.

---

### 5f. Find server IP (for the app)

```bash
hostname -I | awk '{print $1}'
# e.g. 192.168.1.50
```

Enter `http://192.168.1.50:3000` in the myToWatch app's onboarding screen.

If your router supports it, assign a **static DHCP lease** to the server's MAC address so the IP never changes. Look for this in your router's admin panel under "DHCP reservations" or "Static IP".

---

### 5g. Expose via domain / reverse proxy (optional)

To access from outside your home network, or to use HTTPS:

**Install Caddy** (handles HTTPS certificates automatically via Let's Encrypt):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```
# Replace with your actual domain pointing to this server's public IP
mytowatch.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Start Caddy:

```bash
sudo systemctl enable --now caddy
```

Caddy automatically provisions TLS certificates. Users enter `https://mytowatch.yourdomain.com` in the app onboarding — no port number needed.

**DNS setup:** Point your domain's A record to the server's public IP. If your ISP gives you a dynamic IP, use a service like [DuckDNS](https://www.duckdns.org) (free) with a cron job to update it:

```bash
# /etc/cron.d/duckdns — update IP every 5 minutes
*/5 * * * * root curl -s "https://www.duckdns.org/update?domains=mytowatch&token=<token>&ip=" > /dev/null 2>&1
```

---

### 5h. Firewall (UFW)

If UFW is active, open only the ports you need:

```bash
sudo ufw allow ssh        # keep SSH open or you'll lock yourself out
sudo ufw allow 3000/tcp   # myToWatch API (LAN only — no reverse proxy)
# OR if using Caddy:
sudo ufw allow 80/tcp     # Caddy HTTP (for ACME challenge)
sudo ufw allow 443/tcp    # Caddy HTTPS
sudo ufw enable
sudo ufw status
```

Do **not** expose port 5432 (Postgres) to the internet.

---

### 5i. Register admin account

First user to register becomes ADMIN:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"strong-password"}'
```

---

### 5j. Backup Postgres data

The database lives in a Docker volume (`pgdata`). Backup to a file:

```bash
# Dump
docker compose exec db pg_dump -U postgres mytowatch > backup-$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U postgres mytowatch < backup-20260525.sql
```

Automate with cron:

```bash
# /etc/cron.d/mytowatch-backup — daily at 3am
0 3 * * * root cd /opt/mytowatch && docker compose exec -T db pg_dump -U postgres mytowatch > /opt/backups/mytowatch-$(date +\%Y\%m\%d).sql
```

---

### 5k. Update the backend

When you push new code:

```bash
cd /opt/mytowatch
git pull
docker compose up -d --build   # rebuilds image, zero manual steps
```

Migrations run automatically on container startup (the Dockerfile CMD runs `prisma migrate deploy` before starting the server).

---

### Common Linux commands

| Task | Command |
|---|---|
| Stop server | `docker compose down` |
| Stop + wipe DB | `docker compose down -v` |
| View live logs | `docker compose logs -f api` |
| Restart backend only | `docker compose restart api` |
| Open Postgres shell | `docker compose exec db psql -U postgres mytowatch` |
| Check disk usage | `docker system df` |
| Free Docker space | `docker system prune` |

---

## Self-hosted Docker deployment (permanent server)

For running the backend on a home server (NAS, Raspberry Pi, old PC):

**Step 1 — Copy files to server:**

```bash
scp -r . user@your-server:/opt/mytowatch
```

**Step 2 — Create `.env` on the server:**

```bash
ssh user@your-server
cd /opt/mytowatch
cp backend/.env.example backend/.env
nano backend/.env   # fill in secrets + TMDB key
```

**Step 3 — Start with Docker:**

```bash
docker compose up -d --build
```

Add `--restart always` to docker-compose.yml services for auto-restart on reboot:
```yaml
services:
  api:
    restart: always
  db:
    restart: always
```

**Step 4 — Find your server's IP and use it in the app:**

```bash
# On the server
hostname -I | awk '{print $1}'   # e.g. 192.168.1.50
```

Enter `http://192.168.1.50:3000` in the app's onboarding screen on your TV.

---

## Connecting to Jellyfin

After logging in as ADMIN, go to **Settings → Providers → Add Provider**:

| Field | Value |
|---|---|
| Plugin | Jellyfin |
| Name | Jellyfin Home (or any label) |
| Server URL | `http://192.168.1.50:8096` (your Jellyfin server's IP + port) |
| API Key | Jellyfin Dashboard → API Keys → create new key |
| User ID | Jellyfin Dashboard → Users → click your user → copy ID from URL |

Hit **Save**, then **Test** to verify the connection.

Once connected, searching for a movie/show and viewing its detail page will show **"Available on Jellyfin"** with a **▶ Play** button. Pressing Play on an Android TV will launch the Jellyfin app directly at that content.

---

## Connecting to Netflix

Netflix does not provide a public API for availability checking. The Netflix plugin generates deep links based on TMDB → Netflix ID mapping.

In **Settings → Providers → Add Provider**:

| Field | Value |
|---|---|
| Plugin | Netflix |
| Name | Netflix |
| Config | (no fields required) |

The Play button will launch the Netflix app on Android TV at the correct title (if you have a Netflix subscription and the app installed).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `curl: (7) Failed to connect to localhost port 3000` | Backend not running. Run `docker compose up`. |
| `Cannot reach server` in app onboarding | Phone/TV and server must be on same Wi-Fi. Use IP not `localhost`. Emulator: use `10.0.2.2`. |
| `adb: device offline` | Restart ADB: `adb kill-server && adb start-server && adb connect <IP>` |
| Jellyfin test fails | Check Jellyfin is running and reachable from server. Verify API key is valid. |
| App not in TV launcher | Must use `LEANBACK_LAUNCHER` intent — already in `app.json`. Reinstall if needed. |
| Token expired errors | Log out and log in again. 15-min access tokens auto-refresh; 30-day refresh token requires re-login when expired. |
| `pnpm install` fails in WSL | `npx prisma generate` then rerun tests. Windows and Linux need separate native binaries. |
