document.getElementById("startSearchBtn").addEventListener("click", async () => {
  // Send message to content script in current active tab using modern async/await
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert("Failed to find an active tab.");
      return;
    }
    const response = await chrome.tabs.sendMessage(tab.id, { action: "startSearch" });
    if (response && response.status === "started") {
      // Dialog opened successfully - close the extension popup so the user can interact with the page
      window.close();
    } else {
      alert("Failed to start search. Make sure you are on the LeetCode contest page.");
    }
  } catch (error) {
    console.error("Error starting search:", error);
    alert("Failed to start search. Make sure you are on the LeetCode contest page and the page is fully loaded.");
  }
});
