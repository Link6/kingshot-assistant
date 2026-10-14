# Kingshot Assistant

[简体中文](README.md) | **English**

[Open the app](https://link6.github.io/kingshot-assistant/) · [Download desktop app](https://github.com/Link6/kingshot-assistant/releases/latest) · [Desktop builds](https://github.com/Link6/kingshot-assistant/actions/workflows/desktop.yml)

A rally coordination and castle reinforcement timing assistant for Kingshot, with Chinese and English interfaces and an Electron desktop app. No account is required. Calculations run on your device, and common inputs are saved locally.

## Features

- **Rally coordination:** Calculate when each leader should start a rally so multiple rallies reach the same target together. Use an automatic schedule or set a shared arrival time.
- **UTC clock and schedule:** View the current UTC time and copy a compact list of leader names and UTC rally start times, sorted by launch order, to share with your team.
- **Reinforcement timing:** Record enemy countdowns to calculate when to send reinforcements between consecutive attacks, accounting for your march time and a margin on each side of the gap.
- **Live countdowns and fine adjustments:** Countdown starts immediately after recording and switches from Rallying to Marching automatically. Adjust recorded times with `−1 / −0.1 / +0.1 / +1 second` buttons.
- **Narrow-window warning:** When the usable reinforcement window after margins is greater than 0 but less than 1 second, a yellow warning appears: **Reinforcements may fail. Check your hospital capacity.**
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
Leader C 12:30:20.5 UTC
```

Copied text contains only names and start times, with no dates, numbering, or shared arrival time. Fractional seconds are preserved when needed. After editing leaders or settings, generate the schedule again to apply your changes; until then, countdowns and copied text use the existing schedule.

### Reinforce between attacks

1. Open **Reinforcements** and enter your actual march time and the margin to leave on each side of the gap.
2. Add at least two enemy teams. Choose **Rallying** or **Marching**, then enter the relevant game countdown and march time.
3. When the game's countdown matches your input, click **Record now** for that team. Its live countdown appears immediately for comparison with the game.
4. Correct any mismatch using the adjustment buttons: `+` delays the recorded timing and `−` advances it. Changes immediately update the estimated attack arrival and reinforcement windows without resetting elapsed time or changing other teams. Once rallying ends, only march time can be adjusted.
5. Follow the reinforcement cue to send your troops. The displayed time is **when you should send them**, with your march time already subtracted.

The input fields remain available for the next recording. Recording again replaces only that team's record. If margins leave no usable gap, no usable reinforcement window is offered; a window under 1 second triggers the yellow warning.

Supported duration formats include `5:00`, `35`, `29.5s`, and `4m 40s`. Plain numbers are interpreted as seconds.

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

Installing dependencies downloads the Electron runtime, and packaging may download additional build tools. Output is written to `desktop-release/`. Code signing, macOS notarization, and automatic updates are not configured.

Alternatively, manually run [Build desktop apps](https://github.com/Link6/kingshot-assistant/actions/workflows/desktop.yml) in GitHub Actions. After the run completes, download `desktop-windows-latest`, `desktop-macos-latest`, or `desktop-ubuntu-latest` from its Artifacts section. Pushing a `v*` tag that matches the version in `package.json` automatically publishes a Release after all three platforms build successfully, attaching the executables and SHA-256 checksums. Release notes are stored in `release-notes/<tag>.md`.

## Deploy to GitHub Pages

In the repository, set **Settings → Pages → Source** to **GitHub Actions**. A push to `main` runs the tests and then deploys `dist/` through [Deploy GitHub Pages](.github/workflows/pages.yml).

Asset paths, offline caching, and local storage support the `/kingshot-assistant/` project path. The website works offline after an online visit has finished caching its assets. If an update still shows the old interface, perform a hard refresh; if needed, close and reopen the page.

## Data and timing notes

- Common inputs are saved in the current browser or desktop app. Data does not sync automatically across devices, domains, or between the web and desktop apps.
- Switching languages preserves active timers. Reloading restores inputs only: regenerate the rally schedule or record enemy countdowns again. Live timers are cleared after sleep/resume or a detected large clock change.
- UTC is derived from your device clock, not read from the game server. Make sure your device time is accurate.
- The assistant calculates from manual input and does not read or control the game. Reinforcement calculations assume your troops should arrive at the castle between two enemy attacks. Actual results depend on game latency and your actions, so verify timings in play.
- Keep the website in the foreground during battle; background tabs or a locked screen may delay alerts. Sound cues apply only to the currently selected tool. Desktop background alerts also depend on system notification settings.
