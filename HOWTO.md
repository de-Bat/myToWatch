# myToWatch — How To Run

Four sections: [Backend Server](#1-backend-server), [Web Browser](#2-web-browser-api-only), [iOS Simulator / Device](#3-ios), [Android TV](#4-android-tv).

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
