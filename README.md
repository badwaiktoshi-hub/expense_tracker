# Expense Tracker — Setup Guide

Personal finance PWA with billing-cycle cap tracking, savings goals, EMI management, and money-lent tracking. All data stays on your device — nothing is sent anywhere.

---

## What you're getting

7 files that together make a complete app:
- `index.html` — the page itself
- `app.js` — the app logic (~2000 lines of code)
- `service-worker.js` — makes it work offline
- `manifest.json` — tells iPhone it's an installable app
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — app icons

---

## Setup — about 10 minutes

### Step 1 · Upload files to your GitHub repo

1. Open your existing repo on github.com in Safari or any browser
2. You'll see a button **Add file** → **Upload files**
3. Drag all 7 files from this folder into the box, or click the link to choose them
4. Scroll down → in the **Commit changes** box, type `Initial commit`
5. Click the green **Commit changes** button

Wait a few seconds. The page will refresh and you'll see all 7 files listed.

### Step 2 · Turn on GitHub Pages

1. In your repo, click the **Settings** tab (gear icon, top-right area)
2. In the left sidebar, click **Pages**
3. Under **Build and deployment** → **Source**, select **Deploy from a branch**
4. Under **Branch**, select **main** and folder **/ (root)** → click **Save**
5. The page will reload. Wait 30–60 seconds.
6. At the top of that Pages settings page, you'll see a green box: **Your site is live at https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/**

Copy that URL.

### Step 3 · Open it on your iPhone

1. Open **Safari** on your iPhone (must be Safari — not Chrome)
2. Paste the URL → press Go
3. The app will load and you'll see the welcome screen

### Step 4 · Install to home screen

1. Tap the **Share** button at the bottom (square with up arrow)
2. Scroll down the share sheet
3. Tap **Add to Home Screen**
4. Tap **Add** in the top-right

You'll see the **Expenses** icon appear on your home screen. From now on, open it from there — it runs full-screen like a native app.

### Step 5 · First-time setup inside the app

1. Tap through the 3 onboarding screens
2. Set your monthly cap (the most you want to spend on personal expenses each cycle)
3. Set your billing cycle start day (e.g., if your statement closes on the 14th, the cycle starts on the 15th)
4. Optionally add your first card

Then you're in. Add cards from **More → Cards**, set up regular bills from **More → Regular Expenses**, and tap **+** in the bottom nav to log anything.

---

## Verify it works offline

1. Open the app from your home screen
2. Turn on Airplane Mode
3. Open the app again — it should still work fully

If it doesn't, open the URL in Safari one more time while online (this lets the service worker finish caching), then try airplane mode again.

---

## Setting a PIN (optional but recommended)

The app stores your data on the device. If you want to lock the app:

**More → Settings → Set PIN lock** → choose a 4–6 digit PIN.

After this, every time you open the app you'll need to enter the PIN.

---

## Backups

Your data lives in your iPhone's browser storage. If you delete the app or wipe your phone, the data is gone unless you backed it up.

**More → Backup & Restore → Export backup** — downloads a JSON file. Save it to iCloud Drive, email it to yourself, or AirDrop it somewhere safe.

To restore on a new device: install the app there, then **Backup & Restore → Import backup**.

Tip: export a backup every couple of weeks, just in case.

---

## How the cap works (it's a bit different)

The cap is calculated on your **billing cycle**, not the calendar month. If your cycle is 15th to 14th, the cap resets on the 15th — not the 1st.

**EMIs reduce your effective cap.** If your cap is ₹20,000 and you have ₹5,000 of active EMIs, your real spending room is ₹15,000.

**Cards can be on a shared cap or have their own.** Default is shared. To give a card its own cap, go to **More → Cards → tap the card → Cap mode → Own cap**.

**Cash spends are excluded by default.** Toggle "Include this cash spend in monthly cap" when logging a cash expense if you want it to count.

**80% and 100% trigger toasts.** When you cross 80%, you'll see a warning. When you cross 100%, the toast turns red and the app starts asking whether each new expense was avoidable.

---

## Updating the app later

If I send you a new version, repeat Step 1: drag the new files to your GitHub repo, commit, and within a minute your phone will have the update next time you open the app.

---

## If something breaks

- **Blank page on iPhone**: open Safari → URL → tap once. If still blank, open Safari Settings → Advanced → Website Data → search your repo URL → remove. Re-open the URL.
- **Updates not showing**: pull down to refresh in the app. Or remove from home screen and re-add.
- **Lost data**: check **More → Backup & Restore** if you have a backup file. Otherwise, sadly, browser storage was cleared.

---

Built per spec v2.0 · Sage glassmorphic UI · Inter font · Works offline.
