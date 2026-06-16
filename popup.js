document.addEventListener("DOMContentLoaded", async () => {
  // Initialize navigation tabs
  initTabs();

  // Initialize LeetCode Stalker Greeting & Friends List
  initStalker();

  // Initialize original Contest Search logic
  await initContestSearch();
});

// ==========================================
// GraphQL API Integration
// ==========================================

const LEETCODE_GRAPHQL_QUERY = `
query getUserProfileAndRanking($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
  userContestRanking(username: $username) {
    rating
  }
}
`;

async function fetchLeetCodeStats(username) {
  try {
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: LEETCODE_GRAPHQL_QUERY,
        variables: { username }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    const matchedUser = result.data?.matchedUser;
    if (!matchedUser) {
      return null; // Username doesn't exist
    }

    const submissions = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const total = submissions.find(s => s.difficulty === "All")?.count ?? 0;
    const easy = submissions.find(s => s.difficulty === "Easy")?.count ?? 0;
    const medium = submissions.find(s => s.difficulty === "Medium")?.count ?? 0;
    const hard = submissions.find(s => s.difficulty === "Hard")?.count ?? 0;

    const rating = result.data?.userContestRanking?.rating ?? null;

    return {
      total,
      easy,
      medium,
      hard,
      rating
    };
  } catch (err) {
    console.error("fetchLeetCodeStats error:", err);
    throw err;
  }
}

// ==========================================
// Tab Navigation
// ==========================================

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  chrome.storage.local.get("activeTab", (data) => {
    const activeTab = data.activeTab || "stalker-tab";

    // Set initial active states
    tabButtons.forEach(btn => {
      if (btn.getAttribute("data-tab") === activeTab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    tabContents.forEach(content => {
      if (content.getAttribute("id") === activeTab) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
  });

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetTab).classList.add("active");

      chrome.storage.local.set({ activeTab: targetTab });
    });
  });
}

// ==========================================
// LeetCode Stalker Logic
// ==========================================

function initStalker() {
  // Pre-populate filters from storage
  chrome.storage.local.get(["sortType", "searchQuery"], (data) => {
    if (data.sortType) {
      document.getElementById("sort-friends-select").value = data.sortType;
    }
    if (data.searchQuery) {
      document.getElementById("search-friends-input").value = data.searchQuery;
    }
    renderGreetingOnboarding();
    renderFriendsList();
  });

  // Add friend event triggers
  document.getElementById("add-friend-btn").addEventListener("click", addFriend);
  document.getElementById("friend-username-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addFriend();
    }
  });

  // Search input filter trigger
  const searchInput = document.getElementById("search-friends-input");
  searchInput.addEventListener("input", () => {
    chrome.storage.local.set({ searchQuery: searchInput.value.trim() }, () => {
      renderFriendsList();
    });
  });

  // Sort select dropdown trigger
  const sortSelect = document.getElementById("sort-friends-select");
  sortSelect.addEventListener("change", () => {
    chrome.storage.local.set({ sortType: sortSelect.value }, () => {
      renderFriendsList();
    });
  });

  // Refresh all stats button trigger
  document.getElementById("refresh-all-btn").addEventListener("click", refreshAllFriends);
}

// Render the user greeting banner or onboarding screen
function renderGreetingOnboarding() {
  const container = document.getElementById("user-greeting-section");
  chrome.storage.local.get("myUsername", (data) => {
    const username = data.myUsername;
    if (username) {
      container.innerHTML = `
        <div class="greeting-row">
          <div class="greeting-text">Hello 👋, <span>${escapeHtml(username)}</span> !</div>
          <button id="change-username-link" class="change-user-link">Change Username</button>
        </div>
      `;
      document.getElementById("change-username-link").addEventListener("click", () => {
        promptForUsername(username);
      });
    } else {
      promptForUsername();
    }
  });
}

// Prompt view to set/update personal username
function promptForUsername(currentVal = "") {
  const container = document.getElementById("user-greeting-section");
  container.innerHTML = `
    <div class="onboard-form">
      <div class="onboard-title">Set Username:</div>
      <div class="onboard-input-group">
        <input type="text" id="my-username-input" placeholder="e.g. Sid_Jiyani" value="${escapeHtml(currentVal)}" />
        <button id="save-username-btn" class="btn primary-btn">Save</button>
      </div>
      <div id="onboard-status" class="status-msg"></div>
    </div>
  `;

  const saveBtn = document.getElementById("save-username-btn");
  const inputEl = document.getElementById("my-username-input");
  const statusEl = document.getElementById("onboard-status");

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveBtn.click();
    }
  });

  saveBtn.addEventListener("click", async () => {
    const val = inputEl.value.trim();
    if (!val) {
      statusEl.className = "status-msg error";
      statusEl.textContent = "Please enter a valid username.";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    statusEl.className = "status-msg success";
    statusEl.textContent = "Verifying username...";

    try {
      const stats = await fetchLeetCodeStats(val);
      if (stats === null) {
        statusEl.className = "status-msg error";
        statusEl.textContent = "Username does not exist on LeetCode.";
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        return;
      }

      chrome.storage.local.set({ myUsername: val }, () => {
        renderGreetingOnboarding();
      });
    } catch (e) {
      statusEl.className = "status-msg error";
      statusEl.textContent = "Error verifying username. Try again.";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}

// Render the list of tracked friends
function renderFriendsList() {
  const container = document.getElementById("friends-list-container");

  chrome.storage.local.get(["friends", "sortType", "searchQuery"], (data) => {
    let friends = data.friends || [];
    const sortType = data.sortType || "alpha";
    const searchQuery = data.searchQuery || "";

    // 1. Apply Search Query Filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      friends = friends.filter(f => f.username.toLowerCase().includes(queryLower));
    }

    // 2. Apply Sorting
    friends.sort((a, b) => {
      if (sortType === "alpha") {
        return a.username.localeCompare(b.username);
      } else if (sortType === "total") {
        return (b.stats.total || 0) - (a.stats.total || 0);
      } else if (sortType === "rating") {
        const ratingA = a.stats.rating !== null ? a.stats.rating : 0;
        const ratingB = b.stats.rating !== null ? b.stats.rating : 0;
        return ratingB - ratingA;
      }
      return 0;
    });

    // 3. Render list or empty view
    if (friends.length === 0) {
      container.innerHTML = `
        <div class="empty-friends">
          ${searchQuery ? "No matching friends found." : "No friends tracked yet. Add one above!"}
        </div>
      `;
      return;
    }

    container.innerHTML = friends.map(friend => {
      const ratingVal = friend.stats.rating !== null ? Math.round(friend.stats.rating) : "N/A";
      return `
        <div class="friend-card">
          <div class="friend-header">
            <a href="https://leetcode.com/u/${escapeHtml(friend.username)}/" class="friend-name-link" title="View LeetCode Profile">
              ${escapeHtml(friend.username)}
              <svg class="external-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
            <button class="friend-delete-btn" data-username="${escapeHtml(friend.username)}" title="Delete friend">
              <svg class="delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <table class="stats-table">
            <thead>
              <tr>
                <th>Total</th>
                <th>Easy</th>
                <th>Medium</th>
                <th>Hard</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="total-val">${friend.stats.total}</td>
                <td class="easy-val">${friend.stats.easy}</td>
                <td class="medium-val">${friend.stats.medium}</td>
                <td class="hard-val">${friend.stats.hard}</td>
                <td class="rating-val">${ratingVal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join("");

    // 4. Attach Delete Listeners
    container.querySelectorAll(".friend-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent card redirect click from firing
        const usernameToDelete = btn.getAttribute("data-username");
        deleteFriend(usernameToDelete);
      });
    });

    // 5. Attach Redirect Listeners to profile links
    container.querySelectorAll(".friend-name-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const url = link.getAttribute("href");
        chrome.tabs.create({ url });
      });
    });
  });
}

// Add friend workflow
async function addFriend() {
  const inputEl = document.getElementById("friend-username-input");
  const statusEl = document.getElementById("add-friend-status");
  const addBtn = document.getElementById("add-friend-btn");

  const username = inputEl.value.trim();
  if (!username) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Please enter a username.";
    return;
  }

  addBtn.disabled = true;
  inputEl.disabled = true;
  statusEl.className = "status-msg success";
  statusEl.textContent = `Searching LeetCode user "${escapeHtml(username)}"...`;

  try {
    const data = await chrome.storage.local.get("friends");
    const friends = data.friends || [];

    const exists = friends.some(f => f.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      statusEl.className = "status-msg error";
      statusEl.textContent = "This user is already in your friends list.";
      return;
    }

    const stats = await fetchLeetCodeStats(username);
    if (!stats) {
      statusEl.className = "status-msg error";
      statusEl.textContent = "User not found on LeetCode.";
      return;
    }

    // Add new friend to storage array
    friends.push({
      username: username,
      stats: stats,
      lastUpdated: Date.now()
    });

    await chrome.storage.local.set({ friends });

    inputEl.value = "";
    statusEl.className = "status-msg success";
    statusEl.textContent = "Friend added successfully!";
    setTimeout(() => {
      if (statusEl.textContent === "Friend added successfully!") {
        statusEl.textContent = "";
      }
    }, 3000);

    renderFriendsList();
  } catch (err) {
    statusEl.className = "status-msg error";
    statusEl.textContent = "Error fetching user data from LeetCode.";
  } finally {
    addBtn.disabled = false;
    inputEl.disabled = false;
  }
}

// Delete friend workflow
function deleteFriend(username) {
  chrome.storage.local.get("friends", (data) => {
    let friends = data.friends || [];
    friends = friends.filter(f => f.username.toLowerCase() !== username.toLowerCase());
    chrome.storage.local.set({ friends }, () => {
      renderFriendsList();
    });
  });
}

// Refresh statistics for all friends
async function refreshAllFriends() {
  const refreshBtn = document.getElementById("refresh-all-btn");
  if (refreshBtn.classList.contains("spinning")) return;

  refreshBtn.classList.add("spinning");

  try {
    const data = await chrome.storage.local.get("friends");
    const friends = data.friends || [];
    if (friends.length === 0) {
      return;
    }

    const updatedFriends = [];
    const fetchPromises = friends.map(async (friend) => {
      try {
        const stats = await fetchLeetCodeStats(friend.username);
        if (stats) {
          return {
            ...friend,
            stats,
            lastUpdated: Date.now()
          };
        }
      } catch (e) {
        console.warn(`Failed to update stats for ${friend.username}:`, e);
      }
      return friend; // Keep cached stats on failure
    });

    const results = await Promise.allSettled(fetchPromises);
    results.forEach(res => {
      if (res.status === "fulfilled") {
        updatedFriends.push(res.value);
      }
    });

    await chrome.storage.local.set({ friends: updatedFriends });
    renderFriendsList();
  } catch (err) {
    console.error("Error refreshing friends:", err);
  } finally {
    refreshBtn.classList.remove("spinning");
  }
}

// Helper: Escape HTML strings to protect against basic XSS injection
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

// ==========================================
// Original Contest Search (LeetSeek) Logic
// ==========================================

async function initContestSearch() {
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

    // Active contest page detected: show control panel
    mainContainer.style.display = "block";
    statusContainer.style.display = "none";

    startSearchBtn.addEventListener("click", async () => {
      startSearchBtn.disabled = true;
      startSearchBtn.textContent = "Connecting...";
      try {
        await triggerSearch(tab.id);
      } catch (err) {
        console.warn("Script context lost. Attempting programmatic content.js re-injection...", err);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
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
}

async function triggerSearch(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, { action: "startSearch" });
  if (response && response.status === "started") {
    window.close();
  } else {
    throw new Error("Invalid response status from content script");
  }
}
