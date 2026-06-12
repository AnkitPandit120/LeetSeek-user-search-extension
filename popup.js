document.addEventListener("DOMContentLoaded", async () => {
  const statusContainer = document.getElementById("statusContainer");
  const mainContainer = document.getElementById("mainContainer");
  const startSearchBtn = document.getElementById("startSearchBtn");
  const openLeetcodeBtn = document.getElementById("openLeetcodeBtn");
  const errorMessage = document.getElementById("errorMessage");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showErrorState("No active tab found. Please select a LeetCode page.");
      return;
    }

    const isContestPage = tab.url.startsWith("https://leetcode.com/contest/");
    if (!isContestPage) {
      showErrorState("You are not on a LeetCode contest page. Please open a contest ranking page first.");
      return;
    }

    // Tab is correct! Show the start search interface
    mainContainer.style.display = "block";
    statusContainer.style.display = "none";

    startSearchBtn.addEventListener("click", async () => {
      startSearchBtn.disabled = true;
      startSearchBtn.textContent = "Connecting...";
      try {
        // Send message to start search
        await triggerSearch(tab.id);
      } catch (err) {
        console.warn("Script context lost. Attempting programmatic content.js re-injection...", err);
        try {
          // Attempt injection
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
          // Retry message
          await triggerSearch(tab.id);
        } catch (injectionErr) {
          console.error("Re-injection failed:", injectionErr);
          alert("Failed to initialize the search panel. Please refresh the LeetCode tab and try again.");
          startSearchBtn.disabled = false;
          startSearchBtn.textContent = "Start User Search";
        }
      }
    });

  } catch (error) {
    console.error("Popup initiation error:", error);
    showErrorState("An unexpected error occurred in the extension.");
  }

  function showErrorState(message) {
    mainContainer.style.display = "none";
    statusContainer.style.display = "block";
    errorMessage.textContent = message;
  }

  if (openLeetcodeBtn) {
    openLeetcodeBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://leetcode.com/contest/" });
      window.close();
    });
  }
});

async function triggerSearch(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, { action: "startSearch" });
  if (response && response.status === "started") {
    window.close();
  } else {
    throw new Error("Invalid response status from content script");
  }
}
