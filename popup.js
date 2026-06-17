// ==========================================
// Chrome API Mocking for Local Testing
// ==========================================
if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
  window.chrome = {
    storage: {
      local: {
        get: function(keys, callback) {
          const res = {};
          const processKeys = (keysList) => {
            keysList.forEach(k => {
              const val = localStorage.getItem(k);
              try {
                res[k] = val ? JSON.parse(val) : undefined;
              } catch (e) {
                res[k] = val;
              }
            });
          };

          if (typeof keys === "string") {
            processKeys([keys]);
          } else if (Array.isArray(keys)) {
            processKeys(keys);
          } else if (typeof keys === "object" && keys !== null) {
            Object.keys(keys).forEach(k => {
              const val = localStorage.getItem(k);
              try {
                res[k] = val ? JSON.parse(val) : keys[k];
              } catch (e) {
                res[k] = val;
              }
            });
          }

          if (callback) {
            setTimeout(() => callback(res), 0);
            return;
          }
          return Promise.resolve(res);
        },
        set: function(items, callback) {
          Object.keys(items).forEach(k => {
            localStorage.setItem(k, JSON.stringify(items[k]));
          });
          if (callback) {
            setTimeout(callback, 0);
            return;
          }
          return Promise.resolve();
        }
      }
    },
    tabs: {
      query: function(queryInfo, callback) {
        const tabsList = [{ id: 1, url: "https://leetcode.com/contest/" }];
        if (callback) {
          setTimeout(() => callback(tabsList), 0);
          return;
        }
        return Promise.resolve(tabsList);
      },
      create: function(createProperties, callback) {
        console.log("Mock chrome.tabs.create:", createProperties);
        window.open(createProperties.url, "_blank");
        if (callback) {
          setTimeout(() => callback({}), 0);
          return;
        }
        return Promise.resolve({});
      },
      sendMessage: function(tabId, message, options, responseCallback) {
        if (typeof options === "function") {
          responseCallback = options;
          options = {};
        }
        console.log("Mock chrome.tabs.sendMessage:", tabId, message);
        const resp = { status: "started" };
        if (responseCallback) {
          setTimeout(() => responseCallback(resp), 0);
          return;
        }
        return Promise.resolve(resp);
      }
    },
    scripting: {
      executeScript: function(details, callback) {
        console.log("Mock chrome.scripting.executeScript:", details);
        if (callback) {
          setTimeout(callback, 0);
          return;
        }
        return Promise.resolve();
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize theme
  initTheme();

  // Initialize navigation tabs
  initTabs();

  // Initialize LeetCode Stalker Greeting & Friends List
  initStalker();

  // Initialize original Contest Search logic
  await initContestSearch();

  // Footer Link Redirect
  const footerLink = document.getElementById("footer-link");
  if (footerLink) {
    footerLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: footerLink.getAttribute("href") });
    });
  }
});

// ==========================================
// GraphQL API Integration
// ==========================================

const LEETCODE_GRAPHQL_QUERY = `
query getUserProfileRankingAndSubmissions($username: String!) {
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
  recentAcSubmissionList(username: $username, limit: 5) {
    id
    title
    titleSlug
    timestamp
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
    const recentSubmissions = result.data?.recentAcSubmissionList || [];

    return {
      total,
      easy,
      medium,
      hard,
      rating,
      submissions: recentSubmissions
    };
  } catch (err) {
    console.error("fetchLeetCodeStats error:", err);
    throw err;
  }
}

// ==========================================
// Theme (Day/Night) Navigation
// ==========================================

function initTheme() {
  const themeToggleBtns = document.querySelectorAll(".theme-toggle-btn");

  const updateBtns = (theme) => {
    themeToggleBtns.forEach(btn => {
      if (theme === "light") {
        btn.textContent = "🌙";
        btn.title = "Toggle Night Mode";
      } else {
        btn.textContent = "☀️";
        btn.title = "Toggle Day Mode";
      }
    });
  };

  chrome.storage.local.get("theme", (data) => {
    const currentTheme = data.theme || "dark";
    const body = document.body;
    if (currentTheme === "light") {
      body.classList.add("light-theme");
      updateBtns("light");
    } else {
      body.classList.remove("light-theme");
      updateBtns("dark");
    }
  });

  themeToggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const body = document.body;
      const isLight = body.classList.contains("light-theme");
      if (isLight) {
        body.classList.remove("light-theme");
        updateBtns("dark");
        chrome.storage.local.set({ theme: "dark" });
      } else {
        body.classList.add("light-theme");
        updateBtns("light");
        chrome.storage.local.set({ theme: "light" });
      }

      // Redraw chart if modal is open
      const chartModal = document.getElementById("chart-modal");
      if (chartModal && chartModal.classList.contains("active")) {
        chrome.storage.local.get("chartMetric", (data) => {
          const metric = data.chartMetric || "solved";
          drawProgressChart(metric);
        });
      }
    });
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  chrome.storage.local.get("activeTab", (data) => {
    const activeTab = "stalker-tab";

    tabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === activeTab);
    });
    tabContents.forEach(content => {
      content.classList.toggle("active", content.getAttribute("id") === activeTab);
    });

    if (activeTab === "search-tab") {
      checkAndApplyContestState();
    }
  });

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetTab).classList.add("active");

      chrome.storage.local.set({ activeTab: targetTab });

      if (targetTab === "search-tab") {
        checkAndApplyContestState();
      }
    });
  });
}

// Checks if current active tab is a LeetCode contest page.
// Blurs the form and shows overlay if not; clears blur if yes.
async function checkAndApplyContestState() {
  const formInner = document.getElementById("seek-form-inner");
  const overlay   = document.getElementById("seek-not-contest-overlay");
  if (!formInner || !overlay) return;

  // Valid: leetcode.com/contest/{contest-name}/ranking[/page]
  const CONTEST_RANKING_RE = /leetcode\.com\/contest\/[^\/]+\/ranking/;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isContest = tab?.url && CONTEST_RANKING_RE.test(tab.url);

    if (isContest) {
      formInner.classList.remove("seek-form-blurred");
      overlay.className = "seek-overlay seek-overlay-hidden";
    } else {
      formInner.classList.add("seek-form-blurred");
      overlay.className = "seek-overlay seek-overlay-visible";
    }
  } catch (e) {
    formInner.classList.add("seek-form-blurred");
    overlay.className = "seek-overlay seek-overlay-visible";
  }
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

    // Auto-refresh friend statistics silently on popup load
    refreshAllFriendsSilently();
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

  // Graph Modal Event Triggers
  const chartModal = document.getElementById("chart-modal");
  document.getElementById("show-chart-btn").addEventListener("click", () => {
    chartModal.classList.add("active");
    chrome.storage.local.get("chartMetric", (data) => {
      const metric = data.chartMetric || "solved";
      setActiveChartToggle(metric);
      drawProgressChart(metric);
    });
  });

  document.getElementById("close-modal-btn").addEventListener("click", () => {
    chartModal.classList.remove("active");
  });

  chartModal.addEventListener("click", (e) => {
    if (e.target === chartModal) {
      chartModal.classList.remove("active");
    }
  });

  const toggleSolved = document.getElementById("chart-toggle-solved");
  const toggleRating = document.getElementById("chart-toggle-rating");

  toggleSolved.addEventListener("click", () => {
    setActiveChartToggle("solved");
    chrome.storage.local.set({ chartMetric: "solved" }, () => {
      drawProgressChart("solved");
    });
  });

  toggleRating.addEventListener("click", () => {
    setActiveChartToggle("rating");
    chrome.storage.local.set({ chartMetric: "rating" }, () => {
      drawProgressChart("rating");
    });
  });
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
        const ratingA = (a.stats && a.stats.rating != null) ? a.stats.rating : 0;
        const ratingB = (b.stats && b.stats.rating != null) ? b.stats.rating : 0;
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
      const ratingVal = (friend.stats && friend.stats.rating != null) ? Math.round(friend.stats.rating) : "N/A";
      
      // Render submissions html
      const submissions = friend.submissions || [];
      let submissionsHtml = "";
      if (submissions.length > 0) {
        const items = submissions.slice(0, 5).map(sub => {
          const relTime = getRelativeTime(sub.timestamp);
          return `
            <li class="submission-item">
              <a href="https://leetcode.com/problems/${escapeHtml(sub.titleSlug)}/" class="submission-link" title="Solve Problem">
                ${escapeHtml(sub.title)}
                <svg class="mini-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              <span class="submission-time">${escapeHtml(relTime)}</span>
            </li>
          `;
        }).join("");

        submissionsHtml = `
          <details class="friend-submissions-details">
            <summary class="submissions-title">
              Recent AC <span class="arrow">▼</span>
            </summary>
            <div class="submissions-content">
              <ul class="submissions-list">
                ${items}
              </ul>
            </div>
          </details>
        `;
      } else {
        submissionsHtml = `
          <details class="friend-submissions-details">
            <summary class="submissions-title">
              Recent AC <span class="arrow">▼</span>
            </summary>
            <div class="submissions-content">
              <p class="no-submissions">No recent submissions found</p>
            </div>
          </details>
        `;
      }

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
          ${submissionsHtml}
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

    // 6. Attach Redirect Listeners to submission links
    container.querySelectorAll(".submission-link").forEach(link => {
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
      stats: {
        total: stats.total,
        easy: stats.easy,
        medium: stats.medium,
        hard: stats.hard,
        rating: stats.rating
      },
      submissions: stats.submissions || [],
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
            username: friend.username,
            stats: {
              total: stats.total,
              easy: stats.easy,
              medium: stats.medium,
              hard: stats.hard,
              rating: stats.rating
            },
            submissions: stats.submissions || [],
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
  const startSearchBtn = document.getElementById("startSearchBtn");
  const errorMsg = document.getElementById("seek-error-msg");

  if (!startSearchBtn) return;

  startSearchBtn.addEventListener("click", async () => {
    // Clear previous error
    hideError();

    // Read form values
    const keywordsRaw = document.getElementById("keywordsInput")?.value?.trim() || "";
    const matchType = document.querySelector('input[name="matchType"]:checked')?.value || "exact";
    const startPage = parseInt(document.getElementById("startPageInput")?.value) || 1;
    const endPage = parseInt(document.getElementById("endPageInput")?.value) || 10;

    // Validate keywords
    if (!keywordsRaw) {
      showError("Please enter at least one keyword.");
      return;
    }

    const keywords = keywordsRaw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);

    if (endPage < startPage) {
      showError("End page must be greater than or equal to Start page.");
      return;
    }

    // Check active tab
    let tab;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (e) {
      showError("Could not query active tab.");
      return;
    }

    // Valid: leetcode.com/contest/{contest-name}/ranking[/page]
    const CONTEST_RANKING_RE = /leetcode\.com\/contest\/[^\/]+\/ranking/;
    const isContestPage = tab?.url && CONTEST_RANKING_RE.test(tab.url);
    if (!isContestPage) {
      // Should not reach here if overlay is shown, but guard anyway
      showError("Please open a LeetCode contest ranking page first.");
      return;
    }

    // Launch search
    startSearchBtn.disabled = true;
    startSearchBtn.textContent = "Launching...";

    const state = {
      keywords,
      matchType,
      startPage,
      endPage,
      currentPage: startPage,
      matches: [],
      isActive: true
    };

    try {
      await sendSearchMessage(tab.id, state);
      window.close();
    } catch (err) {
      // Re-inject content.js if context is lost
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        await sendSearchMessage(tab.id, state);
        window.close();
      } catch (injectionErr) {
        console.error("Re-injection failed:", injectionErr);
        showError("Failed to launch. Please refresh the LeetCode tab and try again.");
        startSearchBtn.disabled = false;
        startSearchBtn.textContent = "Start Search";
      }
    }
  });

  function showError(msg) {
    if (!errorMsg) return;
    errorMsg.textContent = msg;
    errorMsg.className = "seek-error-visible";
  }

  function hideError() {
    if (!errorMsg) return;
    errorMsg.textContent = "";
    errorMsg.className = "seek-error-hidden";
  }
}

async function sendSearchMessage(tabId, state) {
  const response = await chrome.tabs.sendMessage(tabId, {
    action: "startSearchWithParams",
    state
  });
  if (!response || response.status !== "started") {
    throw new Error("Invalid response from content script");
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

// ==========================================
// Chart Drawing & Helper Methods
// ==========================================

function getRelativeTime(timestamp) {
  const diff = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (diff < 0) return "just now";
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function setActiveChartToggle(metric) {
  const toggleSolved = document.getElementById("chart-toggle-solved");
  const toggleRating = document.getElementById("chart-toggle-rating");
  if (!toggleSolved || !toggleRating) return;

  if (metric === "solved") {
    toggleSolved.classList.add("active");
    toggleRating.classList.remove("active");
  } else {
    toggleSolved.classList.remove("active");
    toggleRating.classList.add("active");
  }
}

function drawProgressChart(metric) {
  const canvas = document.getElementById("friends-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Fix: Use fixed layout dimensions since getBoundingClientRect() is 0 when modal is hidden or transitioning
  const width = 340;
  const height = 230;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  chrome.storage.local.get("friends", (data) => {
    try {
      const isLightTheme = document.body.classList.contains("light-theme");
      const friends = data.friends || [];
      if (friends.length === 0) {
        ctx.fillStyle = isLightTheme ? "#64748b" : "#a0a0b0";
        ctx.font = "italic 13px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No friends tracked yet.", width / 2, height / 2);
        return;
      }

      const paddingLeft = 35;
      const paddingRight = 15;
      const paddingTop = 30;
      const paddingBottom = 35;
      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      ctx.strokeStyle = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.fillStyle = isLightTheme ? "#64748b" : "#a0a0b0";
      ctx.font = "500 10px 'Outfit', sans-serif";
      ctx.textAlign = "right";

      // 1. Calculate Maximum Range with safety guards
      let maxVal = 0;
      if (metric === "solved") {
        friends.forEach(f => {
          const total = (f.stats && f.stats.total) || 0;
          if (total > maxVal) maxVal = total;
        });
      } else {
        friends.forEach(f => {
          const rating = (f.stats && f.stats.rating !== null && f.stats.rating !== undefined) ? Math.round(f.stats.rating) : 0;
          if (rating > maxVal) maxVal = rating;
        });
      }

      if (maxVal === 0) maxVal = 100;
      const ySegments = 4;
      const yStep = Math.ceil(maxVal / ySegments / 10) * 10;
      maxVal = yStep * ySegments;

      // Draw grid lines
      for (let i = 0; i <= ySegments; i++) {
        const val = yStep * i;
        const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;

        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        ctx.fillText(val, paddingLeft - 8, y + 3);
      }

      // Base line
      ctx.strokeStyle = isLightTheme ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop + chartHeight);
      ctx.lineTo(width - paddingRight, paddingTop + chartHeight);
      ctx.stroke();

      // 2. Draw Column Bars
      const barSpacing = 16;
      const numFriends = friends.length;
      const totalSpacing = barSpacing * (numFriends - 1);
      const barWidth = Math.max(12, Math.min(45, (chartWidth - totalSpacing) / numFriends));
      const startX = paddingLeft + (chartWidth - (barWidth * numFriends + barSpacing * (numFriends - 1))) / 2;

      friends.forEach((friend, idx) => {
        const x = startX + idx * (barWidth + barSpacing);
        const name = friend.username;

        // Draw username labels
        ctx.fillStyle = isLightTheme ? "#64748b" : "#a0a0b0";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(x + barWidth / 2, paddingTop + chartHeight + 12);
        ctx.font = "600 9px 'Outfit', sans-serif";
        let displayName = name;
        if (displayName.length > 8) displayName = displayName.substring(0, 6) + "..";
        ctx.fillText(displayName, 0, 0);
        ctx.restore();

        const yBaseline = paddingTop + chartHeight;

        if (metric === "solved") {
          const easy = (friend.stats && friend.stats.easy) || 0;
          const medium = (friend.stats && friend.stats.medium) || 0;
          const hard = (friend.stats && friend.stats.hard) || 0;
          const total = (friend.stats && friend.stats.total) || 0;

          const hEasy = (easy / maxVal) * chartHeight;
          const hMedium = (medium / maxVal) * chartHeight;
          const hHard = (hard / maxVal) * chartHeight;

          let currentY = yBaseline;

          // Hard Segment (Red) — bottom
          if (hard > 0) {
            ctx.fillStyle = "#ff5b5b";
            const roundTop = (medium === 0 && easy === 0);
            drawRoundedRect(ctx, x, currentY - hHard, barWidth, hHard, 2, true, roundTop);
            currentY -= hHard;
          }
          // Medium Segment (Orange/Yellow) — middle
          if (medium > 0) {
            ctx.fillStyle = "#ffb703";
            const roundBottom = (hard === 0);
            const roundTop = (easy === 0);
            drawRoundedRect(ctx, x, currentY - hMedium, barWidth, hMedium, 2, roundBottom, roundTop);
            currentY -= hMedium;
          }
          // Easy Segment (Teal/Blue) — top
          if (easy > 0) {
            ctx.fillStyle = "#2ec4b6";
            const roundBottom = (hard === 0 && medium === 0);
            drawRoundedRect(ctx, x, currentY - hEasy, barWidth, hEasy, 2, roundBottom, true);
            currentY -= hEasy;
          }

          // Draw total count number
          if (total > 0) {
            ctx.fillStyle = isLightTheme ? "#1e293b" : "#f8f9fa";
            ctx.font = "700 9px monospace";
            ctx.fillText(total, x + barWidth / 2, currentY - 5);
          }
        } else {
          const rating = (friend.stats && friend.stats.rating !== null && friend.stats.rating !== undefined) ? Math.round(friend.stats.rating) : 0;
          const hRating = (rating / maxVal) * chartHeight;

          if (rating > 0) {
            ctx.fillStyle = "#00d2fc"; // Rating light blue
            drawRoundedRect(ctx, x, yBaseline - hRating, barWidth, hRating, 3, true, true);

            ctx.fillStyle = isLightTheme ? "#1e293b" : "#f8f9fa";
            ctx.font = "700 9px monospace";
            ctx.fillText(rating, x + barWidth / 2, yBaseline - hRating - 5);
          } else {
            ctx.fillStyle = isLightTheme ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.25)";
            ctx.font = "italic 9px 'Outfit', sans-serif";
            ctx.fillText("N/A", x + barWidth / 2, yBaseline - 8);
          }
        }
      });
    } catch (err) {
      console.error("Error drawing progress chart callback:", err);
    }
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius, roundBottom = true, roundTop = true) {
  if (height <= 0) return;
  ctx.beginPath();
  if (roundTop) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
  }

  if (roundBottom) {
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  } else {
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
  }

  if (roundTop) {
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  } else {
    ctx.lineTo(x, y);
  }
  ctx.fill();
}

async function refreshAllFriendsSilently() {
  try {
    const data = await chrome.storage.local.get("friends");
    const friends = data.friends || [];
    if (friends.length === 0) return;

    const updatedFriends = [];
    const fetchPromises = friends.map(async (friend) => {
      try {
        const stats = await fetchLeetCodeStats(friend.username);
        if (stats) {
          return {
            username: friend.username,
            stats: {
              total: stats.total,
              easy: stats.easy,
              medium: stats.medium,
              hard: stats.hard,
              rating: stats.rating
            },
            submissions: stats.submissions || [],
            lastUpdated: Date.now()
          };
        }
      } catch (e) {
        console.warn(`Failed to silently update stats for ${friend.username}:`, e);
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
    console.error("Silent refresh error:", err);
  }
}
