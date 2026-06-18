# 🔍 LeetPulse + LeetSeek ⚡

> A premium, all-in-one Chrome extension for competitive programmers — track your coding circle's progress and hunt down competitors on live contest leaderboards, all from a single gorgeous popup.

![LeetPulse Extension Preview](Screenshot.png)

---

## ✨ What's Inside

| Tab | Tool | Purpose |
|-----|------|---------|
| 🟠 **LeetPulse** | Stats Tracker | Track friends' LeetCode progress, ratings & submissions |
| 🔵 **LeetSeek** | Contest Search | Locate users on live contest ranking pages |

---

## 🌟 Feature Breakdown

### 👤 Personal Onboarding & Greeting

- **First-run onboarding** prompts you to set your own LeetCode username
- Username is **verified live** against the LeetCode GraphQL API before saving — no fake usernames slip through
- After setup, a personalized **"Hello 👋, {Username}!"** greeting banner is shown on every open
- **Change Username** link lets you update it at any time without restarting

---

### 👥 Friend Progress Tracker (LeetPulse)

Add any LeetCode user to your personal watchlist and get a live snapshot of their coding stats:

- **Add by Username** — type a username and hit Add (or press `Enter`); the extension verifies the account exists on LeetCode before saving
- **Duplicate Guard** — silently rejects adding the same username twice
- **Stats Card** for each friend showing:
  - ✅ **Total Solved** — combined problem count
  - 🟢 **Easy** count
  - 🟡 **Medium** count
  - 🔴 **Hard** count
  - 🏆 **Contest Rating** (official competitive rating, or `N/A` if unrated)
- **Profile Redirect** — click any friend's username to open their LeetCode profile in a new tab
- **Delete Friend** — remove a tracked user instantly with the ✕ button on their card

---

### 📜 Recent Accepted Submissions Accordion

Each friend card includes a collapsible **Recent AC ▼** section:

- Shows the **last 5 accepted submissions** with relative time labels (e.g. `2h ago`, `3d ago`, `1mo ago`)
- Each submission is a **clickable link** that opens the problem directly in a new tab
- Gracefully shows *"No recent submissions found"* when no data is available
- Relative timestamps are computed client-side — no additional API calls needed

---

### 🔍 Search & Dynamic Filters

- **Instant search bar** — filter your friends list in real-time as you type; query is persisted to storage so it survives popup reopens
- **Sort dropdown** with three modes:
  - `Sort Alphabetically` — A → Z by username
  - `Sort by Total Solved` — highest problem count first
  - `Sort by Contest Rating` — top-rated first (unrated friends sort to bottom)
- Filter state (search query + sort preference) is **persisted across sessions** via `chrome.storage.local`

---

### 🔄 Stats Refresh

Two refresh mechanisms keep your data current:

| Mechanism | Trigger | Behaviour |
|-----------|---------|-----------|
| **Silent Background Refresh** | On every popup open | Fetches fresh stats for all friends in parallel without blocking the UI |
| **Manual Refresh** | Click the 🔄 button | Spins the icon while fetching; falls back to cached stats on network error |

Both use `Promise.allSettled` so a single failed fetch never cancels the rest.

---

### 📊 Visual Progress Graph (Chart Modal)

Click the bar-chart icon to open a full **Progress Graph** modal:

- **Total Solved view** — stacked column bars per friend split into:
  - 🟦 Easy (teal `#2ec4b6`)
  - 🟨 Medium (amber `#ffb703`)
  - 🔴 Hard (red `#ff5b5b`)
  - Total count shown above each bar
- **Contest Rating view** — single-color (light blue `#00d2fc`) column bars with rating numbers above
- Toggle between the two views instantly using the **Total Solved / Contest Rating** buttons
- Chart is drawn on a native **HTML5 2D Canvas** with device-pixel-ratio (HiDPI) scaling for crisp rendering on Retina displays — no external chart libraries required
- Chart respects the current **day/night theme** for correct text and grid colors
- Last selected chart metric is **persisted** so the modal reopens on your preferred view

---

### 🌓 Synchronized Day / Night Theme

- **Dark Mode (default):** Sleek glassmorphism-inspired dark overlay with vibrant difficulty-color accents
- **Light Mode:** Warm, high-contrast light theme with optimized palette for daytime readability
- A **☀️ / 🌙 toggle button** is present in both the LeetPulse and LeetSeek tab headers — clicking either one switches the theme globally and keeps both buttons in sync
- Theme preference is **saved to storage** and restored on every popup open
- The progress chart **redraws automatically** when the theme is toggled while the modal is open

---

### 🏆 LeetSeek — Live Contest Leaderboard Search

Switch to the **Contest Search** tab to hunt for users on an active LeetCode contest ranking page:

#### Smart Context Detection
- The extension **detects whether your current browser tab is a valid contest ranking page** (`leetcode.com/contest/*/ranking/*`)
- If you're not on a ranking page, the form is **blurred with an overlay** instructing you to navigate to one first — preventing invalid searches

#### Search Configuration (Popup)
Configure your search before launching:

| Setting | Description |
|---------|-------------|
| **Keywords** | Comma-separated list of usernames or substrings to hunt for |
| **Match Type** | `Exact Name` — full username match only; `Keyword/Partial` — substring match |
| **Start Page** | First leaderboard page to scan (default: 1) |
| **End Page** | Last leaderboard page to scan (default: 10) |

Clicking **Start Search** injects the search state into the contest tab and closes the popup — the search runs directly inside the LeetCode page.

#### In-Page Search Panel (Content Script)
Once launched, a floating **glassmorphism panel** appears on the contest ranking page in the top-right corner:

- **Live progress bar** — updates as each page is scanned (percentage shown)
- **Status line** — real-time messages: `⏳ Loading page N...`, `🔍 Searching page N...`, `✅ Page loaded (X users)`
- **Results table** — matches appear as they are found, showing username + page number
- **Duplicate guard** — the same username is never added to results twice
- **🛑 Stop button** — immediately halts the scan at any time
- **⚙️ Reset button** — appears after stopping/completion to reconfigure and re-run
- **Early exit for exact mode** — when all requested exact usernames are found, the scan stops immediately without scanning remaining pages
- **Session persistence** — search state is saved to `sessionStorage`; if the page reloads mid-search (e.g. due to page navigation), the search **automatically resumes** from where it left off

#### Robust Page Loading
The content script uses a smart polling strategy to wait for dynamic React content to render before scanning:
- Checks for at least **10 users** to be present and for loading indicators to disappear
- Requires **3 consecutive stable checks** before declaring a page fully loaded
- Falls back gracefully if a page partially loads after a 15-second timeout
- Navigates between pages using LeetCode's own **next page button** to avoid triggering anti-bot measures

---

## 🛡️ Security

- All user-supplied strings rendered into the DOM are sanitized via an `escapeHtml()` function to prevent XSS
- Uses `chrome.storage.local` (not `localStorage`) for isolated extension storage
- Only requests the minimum permissions required: `scripting`, `activeTab`, `tabs`, `storage`
- Host permissions are scoped narrowly to `leetcode.com/contest/*` and `leetcode.com/graphql/`

---

## 📥 Installation

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/AnkitPandit120/LeetSeek-user-search-extension.git
   ```
2. Open **Google Chrome** and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the project folder
5. Pin the extension from the Chrome toolbar for quick access

---

## 📂 File Structure

```
LeetSeek-user-search-extension/
├── manifest.json        # Manifest V3 — permissions, host rules, icons, popup & background
├── background.js        # Service worker — programmatic content script injection on demand
├── content.js           # In-page floating panel — scraping loop, pagination, session state
├── popup.html           # Two-tab popup layout (LeetPulse + Contest Search) with chart modal
├── popup.js             # All popup logic: onboarding, friends CRUD, chart drawing, LeetSeek form
├── styles.css           # Full design system — dark/light themes, animations, custom properties
├── icon16.png           # Toolbar icon (16 × 16)
├── icon48.png           # Extensions page icon (48 × 48)
└── icon128.png          # Chrome Web Store icon (128 × 128)
```

---

## 🔑 Permissions Explained

| Permission | Why it's needed |
|-----------|----------------|
| `storage` | Persist friends list, username, theme, sort/filter preferences |
| `tabs` | Read current tab URL (contest page detection), open new tabs for profiles/problems |
| `scripting` | Re-inject `content.js` if the extension context is lost on a tab reload |
| `activeTab` | Access the URL of the currently active contest ranking tab |
| `https://leetcode.com/contest/*` | Run content scripts on contest ranking pages |
| `https://leetcode.com/graphql/` | Fetch user stats, ratings, and recent submissions |

---

## 🛠️ Tech Stack

- **Chrome Extension Manifest V3** — service worker background, content scripts, popup
- **Vanilla JavaScript** — zero runtime dependencies; no React, Vue, or bundler required
- **HTML5 Canvas 2D API** — custom HiDPI chart rendering without external libraries
- **LeetCode GraphQL API** — single-query fetch for solved counts, contest rating, and recent submissions
- **CSS Custom Properties** — full dark/light theming with Outfit font (Google Fonts)

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute.

---

## 🙌 Credits

Developed with ❤️ by **[Ankit Pandit](https://github.com/AnkitPandit120)** × **techsfc**
