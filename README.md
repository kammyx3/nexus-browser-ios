# Nexus Browser for iOS

## Prerequisites

- A GitHub account (free)
- iPhone with iOS 16+
- Sideloadly (https://sideloadly.io) or AltStore

## Build the IPA (cloud, no Mac needed)

1. **Create a GitHub repository** and push this code:

```bash
cd C:\Users\kammy\Documents\Applications\Websites\nexus-ios
git init
git add .
git commit -m "Initial commit"
gh repo create nexus-browser-ios --public --push
```

2. **Go to GitHub Actions** in your repo.

3. Click **"Build IPA"** workflow, then **"Run workflow"**.

4. Wait ~5 minutes for the build to finish.

5. Download the **NexusBrowser-iOS** artifact — this is your `.ipa` file.

## Sideload with Sideloadly

1. Unzip the downloaded artifact to get `NexusBrowser.ipa`.

2. Connect your iPhone to your PC.

3. Open **Sideloadly**.

4. Drag `NexusBrowser.ipa` into Sideloadly.

5. Enter your Apple ID when prompted.

6. Click **Start** — Sideloadly will sign and install the app.

7. On your iPhone, go to **Settings → General → VPN & Device Management** and trust your developer profile.

8. Open the **Nexus Browser** app.

## What works

- Web search via DuckDuckGo (no API key needed)
- Browse pages via native WKWebView
- Back/forward navigation
- Home button to return to search
- Dark theme

## Development (requires Mac)

```bash
cd nexus-ios
npm install
npm run dev          # Vite dev server for UI changes
npm run build:ios    # Build + sync to iOS
npx cap open ios     # Open in Xcode
```
