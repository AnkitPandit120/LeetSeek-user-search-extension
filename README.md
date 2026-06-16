# 🔍 LeetPulse Extension ⚡

A powerful, premium browser extension that combines two essential LeetCode tools in one gorgeous dashboard: a **Friend Progress & Stats Tracker (LeetPulse)** to compare stats/submissions and a **Contest User & Keyword Search** to locate competitors on active contest leaderboards.

---

## 🌟 Key Features

### 👥 1. LeetPulse Stats Tracker
Keep tabs on your coding circle and motivate each other with real-time analytics:
*   **Personal Onboarding:** Configure your LeetCode username to receive a customized greeting banner.
*   **Track Coding Progress:** Add friends by LeetCode username to load their Total Solved breakdown (Easy, Medium, Hard) and official Contest Ratings.
*   **Collapsible Recent AC List:** Click the **Recent AC ▼** accordion on any friend's card to reveal their top 5 recently solved questions with relative time labels (e.g., `2h ago`). Clicking a question opens it directly in a new tab.
*   **Profile Redirection:** Click any friend's username to jump directly to their LeetCode profile page.
*   **Search & Dynamic Filters:** Search friends list instantly and sort them alphabetically, by Total Solved count, or by Contest Rating.
*   **Silent Background Refresh:** Auto-refreshes all stats silently in the background on startup, keeping cached stats current without network lags.

### 📊 2. Visual Progress Graph Modal
Visualize and compare coding metrics across your circle:
*   **Stacked Solved Comparison:** Renders stacked columns representing easy (teal), medium (yellow), and hard (red) counts, with total numbers shown above the columns.
*   **Contest Rating Chart:** Toggles to display official competitive ratings side-by-side.
*   **High-DPI Scaling:** Draws on a native HTML5 2D Canvas context with device-pixel-ratio scaling to guarantee crisp rendering without external libraries.

### 🌓 3. Synced Day/Night Theme Toggles
*   **Midnight Dark Theme:** Sleek glassmorphism overlay style with vibrant difficulty-color accents.
*   **Day Light Theme:** A warm, clean, high-contrast light theme with optimized color palettes for daytime readability.
*   **Synchronized Controls:** Theme toggles in both tab headers keep your selections synchronized across all active extension menus.

### 🔍 4. LeetSeek Live Contest Search
*   **Multi-User Lookup:** Search multiple comma-separated usernames or keywords on active contest pages.
*   **Match Modes:** Run exact checks (terminates early when matches are found) or partial/keyword substring matches.
*   **Range Customization:** Set custom starting and ending page limits for scans.
*   **Dynamic Scraper Panel:** Monitors live page iterations, shows percentage progress bars, and tabulates matches with page numbers.

---

## 📸 Preview

Here’s the extension interface:

![LeetCode Contest User Search Demo](Screenshot.png)

---

## 📥 Installation

Install it locally in your Chrome browser:

1.  **Download or Clone** this repository:
    ```bash
    git clone https://github.com/AnkitPandit120/LeetSeek-user-search-extension.git
    ```
2.  Open Google Chrome and navigate to: `chrome://extensions/`
3.  Enable **Developer mode** using the toggle switch in the top-right corner.
4.  Click the **Load unpacked** button in the top-left corner.
5.  Select the extracted project folder (`leetcode-rank-search-extension-main` or `LeetSeek-user-search-extension`).

---

## 📂 File Structure

```txt
LeetSeek-user-search-extension/
├── manifest.json        # Manifest V3 configuration (added local storage & host permissions)
├── background.js        # Automates programmatic content script injection
├── content.js           # Core scraping, state management, and UI panel contest logic
├── popup.html           # Multi-tab layout featuring LeetPulse, Contest Search, & Theme buttons
├── popup.js             # Onboarding, storage, drawing engine, GraphQL parser & mock loader
├── styles.css           # Custom properties styling (dark/light themes, animations, variables)
├── icon16.png           # Toolbar icon (16x16)
├── icon48.png           # Extension page icon (48x48)
└── icon128.png          # Web Store display icon (128x128)
```

---

## 📜 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute.

---

## 🙌 Credits

*   Developed with ❤️ by **[Ankit Pandit](https://github.com/AnkitPandit120)** x **techsfc**
