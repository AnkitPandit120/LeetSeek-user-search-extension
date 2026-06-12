// background.js

chrome.runtime.onInstalled.addListener(async () => {
  // Inject content.js into all existing LeetCode contest tabs on install or reload
  try {
    const tabs = await chrome.tabs.query({
      url: [
        "https://leetcode.com/contest/*"
      ]
    });

    for (const tab of tabs) {
      // Skip tabs that we don't have scripting access to or are loading
      if (!tab.url || tab.url.startsWith("chrome://")) continue;

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        console.log(`Successfully injected content.js into tab ${tab.id}`);
      } catch (err) {
        // May fail if script is already running or tab is loading
        console.warn(`Failed to inject into tab ${tab.id}:`, err);
      }
    }
  } catch (error) {
    console.error("Error executing background script injection:", error);
  }
});
