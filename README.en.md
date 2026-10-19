# Kingshot Assistant

[简体中文](README.md) | **English**

[Open the app](https://link6.github.io/kingshot-assistant/) · [Download desktop app](https://github.com/Link6/kingshot-assistant/releases/latest) · [Desktop builds](https://github.com/Link6/kingshot-assistant/actions/workflows/desktop.yml)

A rally coordination and castle reinforcement timing assistant for Kingshot, with Chinese and English interfaces and an Electron desktop app. Local timing needs no account. Calculations run on your device, and common inputs are saved locally. Room collaboration requires Discord membership verification; explicitly shared records and march times are stored in Supabase and synchronized with room members.

Scripts and styles use content-hashed filenames so updated HTML cannot reuse stale assets. Normal online refreshes prefer the latest HTML; offline use restores a complete cached build. Updates do not automatically reload active timers. Run `npm run prepare:web` after editing source files; local serving, tests, desktop packaging, and Pages deployment also prepare assets automatically.

This project is licensed under the [MIT License](LICENSE). Copyright © 2026 Link6.

## Features

- **Desktop updates:** Windows Setup and Linux AppImage editions check GitHub Releases after startup and every six hours, offer in-app download with progress, verify the package, then ask before installing and restarting. Ordinary exit never installs an update. Portable Windows and unsigned macOS builds offer release checks and a download-page link. Older versions require one manual installation of v0.3.1 to gain the updater.
- **Defense counter rallies:** Follow a selected enemy attack with a configurable positive impact offset. Reuse saved leaders or retain new ones, plan launches or record rallies already gathering/marching, calibrate actual readings, and compare target versus predicted impact. Defense timelines include allied phases and impacts with 10/30-second zoom. Enemy or leader changes require review while observed progress is retained. Hosts and commanders control shared counters; linked leaders receive personal counter instructions and other members keep reinforcement cues.
- **Separate battle rooms:** Verified Discord members enter a dedicated interface using an 8-character code. Local drafts and timers stay separate. Members confirm their march time and follow personal action cues. Hosts and commanders select rally leaders, publish one shared schedule, calibrate actual launches, switch to reinforcement defense, and broadcast messages or march checks. Each member gets defense windows based on their own march time. Server-side capacity, expiry and update limits protect the free-tier quota. Countdown animation stays local. See [setup and permissions](supabase/README.md).
- **Launch calibration and landing gaps:** Adjust a scheduled leader by ±0.1 / ±1 second, record a launch now, or enter an actual launch timestamp. Only that leader changes. Estimated arrivals and insertion windows update immediately. This is also available in local mode.
- **Stop cancelled enemy rallies:** Stop an enemy timer to remove it from reinforcement windows while retaining its draft. Read and record a fresh countdown when it starts again. Available locally and in battle rooms; room changes are controlled by hosts and commanders and shared with all members.
- **Personal pet and retained march time:** Switching room modes keeps existing march confirmations. Maintain your own pet estimate beside your march time using its elapsed minutes. The timer is saved for your account in this browser across reloads. Pet warnings suggest checking your march reading without forcing another submission.

- **Rally coordination:** Calculate when each leader should start a rally so multiple rallies reach the same target together. Use an automatic schedule or set a shared arrival time.
- **UTC clock and schedule:** View the current UTC time and copy a compact list of leader names and UTC rally start times, sorted by launch order, to share with your team.
- **Reinforcement timing:** Record enemy countdowns to calculate when to send reinforcements between consecutive attacks, accounting for your march time and a margin on each side of the gap.
- **Live countdowns and fine adjustments:** Countdown starts immediately after recording and switches from Rallying to Marching automatically. Adjust recorded times with `−1 / −0.1 / +0.1 / +1 second` buttons.
- **Narrow-window warning:** When the usable reinforcement window after margins is greater than 0 but less than 1 second, a yellow warning appears: **Reinforcements may fail. Check your hospital capacity.**
- **Battle timeline:** A rolling 60-second view separates departure and reinforcement arrival windows from individual enemy arrivals. Windows under one second are yellow; gaps without a safe window are gray. Select a band for its full UTC range. Records, fine adjustments and valid march/margin changes update it immediately.
- **Languages and desktop support:** Switching languages preserves active timers. Electron adds an always-on-top window, compact mode, remembered window position, and background system notifications.

## How to use

### Coordinate rally arrivals

1. Open **Rally sync**, add your leaders, and enter each name, rally preparation duration, and actual march time to the same target.
2. Choose **Automatic** and set how much preparation time to leave before the first launch, or choose **Set arrival time**. The arrival-time input uses your **device's local time**; scheduled results are displayed in UTC.
3. Click **Generate countdowns** and follow the launch cues. A launch time means **the moment you start the rally**.
4. Under the large countdown, find **UTC rally schedule** and click **Copy schedule** to paste it to your team. The button is always visible and becomes available once a schedule has been generated.

Example copied text:

```text
Leader A 12:30:05 UTC
Leader B 12:30:15 UTC
Leader C 12:30:20 UTC
```

Copied text contains only names and start times, with no dates, numbering, or shared arrival time. Times use `HH:mm:ss UTC` without fractional seconds; internal timing retains its original precision. After editing leaders or settings, generate the schedule again to apply your changes; until then, countdowns and copied text use the existing schedule.

### Reinforce between attacks

1. Open **Reinforcements** and enter your actual march time and the margin to leave on each side of the gap.
2. Add at least two enemy teams. Choose **Rallying** or **Marching**, then enter the relevant game countdown and march time.
3. When the game's countdown matches your input, click **Record now** for that team. Its live countdown appears immediately for comparison with the game.
4. Correct any mismatch using the adjustment buttons: `+` delays the recorded timing and `−` advances it. Changes immediately update the estimated attack arrival and reinforcement windows without resetting elapsed time or changing other teams. Once rallying ends, only march time can be adjusted.
5. Follow the reinforcement cue to send your troops. The displayed time is **when you should send them**, with your march time already subtracted.

The input fields remain available for the next recording. Recording again replaces only that team's record. If margins leave no usable gap, no usable reinforcement window is offered; a window under 1 second triggers the yellow warning.

Supported duration formats include `5:00`, `35`, `29.5s`, and `4m 40s`. Plain numbers are interpreted as seconds.

### Estimate leader pet timers

Each leader in **Rally sync** and **Reinforcements** has an independent pet estimate timer. When you notice an active pet, enter your estimate of how many minutes it has already been active and click **Pet seen active**. Enter `0` if unsure: this estimates the latest end from the observation time, and the effect may end sooner.

- Uses a 2-hour duration and shows a yellow reminder **5 minutes** before the estimated end. With sound enabled, it plays one cue; the desktop app also schedules a background reminder.
- The reminder names the affected leaders. **Update march time** takes you to the input. Check the actual game reading, update the march time, then regenerate the rally schedule or record the enemy attack again, depending on the tool. The assistant does not automatically calculate movement speed after the pet effect ends.
- Enter a revised elapsed duration and click **Apply new estimate** to correct it. Once you confirm the effect has ended, click **Mark as ended** to clear that leader's timer and reminder.
- Pet estimates use absolute timestamps saved locally, so reloading, switching languages, regenerating schedules, or recording attacks again does not restart them. A significant device-clock change prompts you to review the estimate.

### Add to your phone's home screen

The web app's installation name follows the page language: **Kingshot Timing Assistant** (short name **Kingshot Timer**) in English, or **Kingshot 战术计时助手** (short name **战术计时**) in Chinese. First visits follow the browser language, with English for non-Chinese locales; a saved language choice takes precedence. Changing languages updates installation metadata and the Apple home-screen name, including offline. Both manifests keep the same app identity. Browsers manage names of already installed apps, so changing languages does not guarantee an immediate rename.

The browser's native installation promotion stays enabled: the app does not cancel `beforeinstallprompt` or automatically show a custom banner. When the browser offers installation, **Install app** appears in the footer and directly opens the native install prompt when clicked, on both Android and desktop browsers.

The browser controls whether and when automatic installation prompts appear, including after dismissal. The app does not force a prompt on page load or unrelated clicks. Mobile browsers without a native prompt offer **Installation help** in the footer, with Safari steps for iPhone and external-browser instructions for embedded browsers. Installation controls are hidden in standalone mode and Electron. Installing does not remove background timing or sound-alert limitations.

## Run locally

Requires Node.js 24 or later. The website has no third-party runtime dependencies, so `npm ci` is not required to serve it.

```sh
git clone https://github.com/Link6/kingshot-assistant.git
cd kingshot-assistant
npm start
```

Open [http://localhost:4173](http://localhost:4173). You can also open `dist/index.html` directly; offline caching requires HTTP/HTTPS.

Run checks:

```sh
npm test
```

## Electron desktop app

To use the app, download the executable for your system from [Releases](https://github.com/Link6/kingshot-assistant/releases/latest). Windows offers an installer and a portable version. Node.js is not required to run these downloads.

The desktop product name is **Kingshot Assistant**, with one set of downloads per platform. The interface and window title can switch between Chinese and English. The Windows application, installer and uninstaller, macOS application and DMG, and Linux AppImage use the project's gold K icon. Windows builds verify every icon size embedded in the actual EXEs.

Install development dependencies and start the app:

```sh
npm ci
npm run desktop
```

Build on the corresponding operating system:

| System | Command | Output |
| --- | --- | --- |
| Windows | `npm run dist:win` | Installer EXE and portable EXE |
| macOS | `npm run dist:mac` | DMG |
| Linux | `npm run dist:linux` | AppImage |

Installing dependencies downloads the Electron runtime, and packaging may download additional build tools. Output is written to `desktop-release/`. Code signing and macOS notarization are not configured. Starting in v0.3.1, supported installed editions check for updates after 10 seconds and every six hours, download on request, verify the package, and install only after confirmation. Release automation uploads and verifies the update manifests and Windows blockmaps alongside the executables.

Alternatively, manually run [Build desktop apps](https://github.com/Link6/kingshot-assistant/actions/workflows/desktop.yml) in GitHub Actions. After the run completes, download `desktop-windows-latest`, `desktop-macos-latest`, or `desktop-ubuntu-latest` from its Artifacts section. Pushing a `v*` tag that matches the version in `package.json` automatically publishes a Release after all three platforms build successfully, attaching the executables and SHA-256 checksums. Release notes are stored in `release-notes/<tag>.md`.

## Deploy to GitHub Pages

In the repository, set **Settings → Pages → Source** to **GitHub Actions**. A push to `main` runs the tests and then deploys `dist/` through [Deploy GitHub Pages](.github/workflows/pages.yml).

Asset paths, offline caching, and local storage support the `/kingshot-assistant/` project path. The website works offline after an online visit has finished caching its assets. If an update still shows the old interface, perform a hard refresh; if needed, close and reopen the page.

## Data and timing notes

- Common inputs are saved in the current browser or desktop app. Data does not sync automatically across devices, domains, or between the web and desktop apps.
- Switching languages preserves active timers. Reloading restores inputs and pet estimates; regenerate the rally schedule or record enemy attack countdowns again. Rally schedules and attack records are cleared after sleep/resume or a detected large clock change. Pet estimates are retained and require review after clock changes.
- UTC is derived from your device clock, not read from the game server. Make sure your device time is accurate.
- The assistant calculates from manual input and does not read or control the game. Reinforcement calculations assume your troops should arrive at the castle between two enemy attacks. Actual results depend on game latency and your actions, so verify timings in play.
- Keep the website in the foreground during battle; background tabs or a locked screen may delay alerts. Sound cues apply only to the currently selected tool. Desktop background alerts also depend on system notification settings.
