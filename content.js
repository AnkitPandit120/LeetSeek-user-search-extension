(() => {
  // Add a global stop flag
  window.__stopLeetCodeSearch = false;

  // Helper to extract current page number from URL path
  function getCurrentPage() {
    const match = window.location.pathname.match(/\/ranking\/(\d+)\/?/);
    return match ? parseInt(match[1], 10) : 1;
  }

  // Helper to navigate to a specific page by updating URL (triggers reload)
  function navigateToPage(targetPage) {
    const contestMatch = window.location.pathname.match(/\/contest\/([^\/]+)\/ranking/);
    if (!contestMatch) {
      console.error("Could not detect contest name from URL pathname:", window.location.pathname);
      return false;
    }
    const contestName = contestMatch[1];
    window.location.href = `/contest/${contestName}/ranking/${targetPage}/`;
    return true;
  }

  // Helper to create or get the search dialog element
  function createOrGetDialog() {
    let dialog = document.getElementById("leetcode-search-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "leetcode-search-dialog";
      dialog.style.position = "fixed";
      dialog.style.top = "16px";
      dialog.style.right = "16px";
      dialog.style.padding = "16px";
      dialog.style.backgroundColor = "rgba(24, 24, 28, 0.95)";
      dialog.style.backdropFilter = "blur(8px)";
      dialog.style.border = "1px solid rgba(255, 255, 255, 0.08)";
      dialog.style.borderRadius = "12px";
      dialog.style.zIndex = "10000";
      dialog.style.fontSize = "13px";
      dialog.style.width = "300px";
      dialog.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.4)";
      dialog.style.color = "#f8f9fa";
      dialog.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      dialog.style.userSelect = "none";
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  // Renders the Setup Form inside the dialog
  function showSetupUI(dialog, savedState = {}) {
    window.__stopLeetCodeSearch = true;

    const keywordsVal = savedState.keywords ? savedState.keywords.join(", ") : "";
    const startPageVal = savedState.startPage || 1;
    const endPageVal = savedState.endPage || 10;
    const matchTypeVal = savedState.matchType || "exact";

    dialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🔍</span>
          <span style="font-weight: 600; font-size: 15px; color: #f8f9fa;">Rank Keyword Search</span>
        </div>
        <button id="closeBtn" title="Close" style="background: transparent; border: none; font-weight: bold; font-size: 20px; line-height: 1; color: #a0a0b0; cursor: pointer; padding: 0 4px; transition: color 0.2s;">×</button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 500; color: #a0a0b0; margin-bottom: 6px;">Keywords (comma-separated)</label>
        <textarea id="keywordsInput" placeholder="e.g. tech, fc, tourist" style="width: 100%; box-sizing: border-box; height: 64px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; border-radius: 6px; padding: 8px; font-family: inherit; font-size: 13px; resize: none; outline: none; transition: border-color 0.2s;"></textarea>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 500; color: #a0a0b0; margin-bottom: 6px;">Match Type</label>
        <div style="display: flex; gap: 8px;">
          <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s;" id="matchExactLabel">
            <input type="radio" name="matchType" id="matchExact" value="exact" ${matchTypeVal === "exact" ? "checked" : ""} style="margin: 0; cursor: pointer;" />
            Exact Name
          </label>
          <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s;" id="matchPartialLabel">
            <input type="radio" name="matchType" id="matchPartial" value="partial" ${matchTypeVal === "partial" ? "checked" : ""} style="margin: 0; cursor: pointer;" />
            Keyword/Partial
          </label>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div style="flex: 1;">
          <label style="display: block; font-size: 11px; font-weight: 500; color: #a0a0b0; margin-bottom: 6px;">Start Page</label>
          <input type="number" id="startPageInput" value="${startPageVal}" min="1" style="width: 100%; box-sizing: border-box; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; border-radius: 6px; padding: 8px; font-size: 13px; outline: none; transition: border-color 0.2s;" />
        </div>
        <div style="flex: 1;">
          <label style="display: block; font-size: 11px; font-weight: 500; color: #a0a0b0; margin-bottom: 6px;">End Page</label>
          <input type="number" id="endPageInput" value="${endPageVal}" min="1" style="width: 100%; box-sizing: border-box; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; border-radius: 6px; padding: 8px; font-size: 13px; outline: none; transition: border-color 0.2s;" />
        </div>
      </div>

      <button id="startSearchBtnSubmit" style="width: 100%; background-color: #ffa116; color: #121214; font-weight: 600; border: none; padding: 10px 0; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background-color 0.2s, transform 0.1s;">Start Search</button>
    `;

    // Visual interactions
    const inputs = dialog.querySelectorAll('textarea, input[type="number"]');
    inputs.forEach(input => {
      input.style.transition = "border-color 0.2s";
      input.addEventListener('focus', () => {
        input.style.borderColor = '#ffa116';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      });
    });

    const matchExact = dialog.querySelector('#matchExact');
    const matchPartial = dialog.querySelector('#matchPartial');
    const matchExactLabel = dialog.querySelector('#matchExactLabel');
    const matchPartialLabel = dialog.querySelector('#matchPartialLabel');

    function updateLabels() {
      if (matchExact.checked) {
        matchExactLabel.style.borderColor = '#ffa116';
        matchExactLabel.style.backgroundColor = 'rgba(255, 161, 22, 0.1)';
        matchPartialLabel.style.borderColor = 'rgba(255,255,255,0.15)';
        matchPartialLabel.style.backgroundColor = 'rgba(255,255,255,0.05)';
      } else {
        matchPartialLabel.style.borderColor = '#ffa116';
        matchPartialLabel.style.backgroundColor = 'rgba(255, 161, 22, 0.1)';
        matchExactLabel.style.borderColor = 'rgba(255,255,255,0.15)';
        matchExactLabel.style.backgroundColor = 'rgba(255,255,255,0.05)';
      }
    }

    matchExact.addEventListener('change', updateLabels);
    matchPartial.addEventListener('change', updateLabels);
    updateLabels();

    const startBtn = dialog.querySelector('#startSearchBtnSubmit');
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.backgroundColor = '#ffb84d';
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.backgroundColor = '#ffa116';
    });
    startBtn.addEventListener('mousedown', () => {
      startBtn.style.transform = 'scale(0.98)';
    });
    startBtn.addEventListener('mouseup', () => {
      startBtn.style.transform = 'scale(1)';
    });

    if (keywordsVal) {
      dialog.querySelector('#keywordsInput').value = keywordsVal;
    }

    dialog.querySelector('#closeBtn').addEventListener('click', () => {
      dialog.remove();
      sessionStorage.removeItem('leetcode_search_state');
    });

    dialog.querySelector('#startSearchBtnSubmit').addEventListener('click', () => {
      const rawKeywords = dialog.querySelector('#keywordsInput').value;
      const keywords = rawKeywords
        .split(',')
        .map(kw => kw.trim().toLowerCase())
        .filter(kw => kw);

      if (keywords.length === 0) {
        alert("Please enter at least one valid keyword.");
        return;
      }

      const startPage = parseInt(dialog.querySelector('#startPageInput').value, 10) || 1;
      const endPage = parseInt(dialog.querySelector('#endPageInput').value, 10) || 1;

      if (startPage > endPage) {
        alert("Start page cannot be greater than end page.");
        return;
      }

      const matchType = dialog.querySelector('input[name="matchType"]:checked').value;

      const state = {
        keywords,
        startPage,
        endPage,
        matchType,
        currentPage: startPage,
        matches: [],
        isActive: true
      };
      sessionStorage.setItem('leetcode_search_state', JSON.stringify(state));

      executeSearchFlow(state);
    });
  }

  // Renders the Searching Progress UI inside the dialog (Result Table format)
  function showSearchingUI(dialog, state) {
    const totalPagesToSearch = state.endPage - state.startPage + 1;
    const currentProgressPage = state.currentPage - state.startPage;
    const progressPercent = totalPagesToSearch > 0 
      ? Math.min(100, Math.round((currentProgressPage / totalPagesToSearch) * 100))
      : 0;

    dialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px; animation: pulse 1.5s infinite;">🔍</span>
          <span style="font-weight: 600; font-size: 15px; color: #f8f9fa;">Searching Keywords...</span>
        </div>
        <button id="closeBtn" title="Close" style="background: transparent; border: none; font-weight: bold; font-size: 20px; line-height: 1; color: #a0a0b0; cursor: pointer; padding: 0 4px; transition: color 0.2s;">×</button>
      </div>

      <div id="loading-status" style="margin-bottom: 8px; color: #a0a0b0; font-style: italic; font-size: 12px;">
        Initialising...
      </div>

      <div style="background-color: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; margin-bottom: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
        <div id="search-progress-bar" style="background-color: #ffa116; width: ${progressPercent}%; height: 100%; transition: width 0.3s ease;"></div>
      </div>

      <!-- Results table container -->
      <div style="margin-bottom: 16px; max-height: 200px; overflow-y: auto; background-color: rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 8px; border: 1px solid rgba(255,255,255,0.04);">
        <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: #a0a0b0; font-size: 11px;">
              <th style="padding: 4px 2px; width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">User</th>
              <th style="padding: 4px 2px; width: 30%; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Page</th>
            </tr>
          </thead>
          <tbody id="results-table-body">
            ${state.matches.length === 0 ? `
              <tr>
                <td colspan="2" id="no-matches-row" style="padding: 20px 0; text-align: center; color: #707080; font-style: italic; font-size: 11px;">No matches found yet.</td>
              </tr>
            ` : state.matches.map(m => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td style="padding: 6px 2px; color: #f8f9fa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${m.username}">${m.username}</td>
                <td style="padding: 6px 2px; text-align: right; color: #2ec4b6;">${m.page}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="stopBtn" style="flex: 1; background-color: #ef4444; color: white; font-weight: 600; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer; transition: background-color 0.2s;">🛑 Stop</button>
        <button id="setupBtn" style="flex: 1; background-color: rgba(255, 255, 255, 0.1); color: #f8f9fa; font-weight: 600; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; display: none;">⚙️ Reset</button>
      </div>
    `;

    // Inject css keyframes if missing
    if (!document.getElementById("leetcode-search-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "leetcode-search-styles";
      styleTag.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(styleTag);
    }

    dialog.querySelector('#closeBtn').addEventListener('click', () => {
      dialog.remove();
      window.__stopLeetCodeSearch = true;
      sessionStorage.removeItem('leetcode_search_state');
    });

    const stopBtn = dialog.querySelector('#stopBtn');
    stopBtn.addEventListener('click', () => {
      window.__stopLeetCodeSearch = true;
      dialog.querySelector('#loading-status').textContent = "🛑 Stopped manually";
      stopBtn.style.display = "none";
      dialog.querySelector('#setupBtn').style.display = "block";
      
      const saved = sessionStorage.getItem('leetcode_search_state');
      if (saved) {
        const stateObj = JSON.parse(saved);
        stateObj.isActive = false;
        sessionStorage.setItem('leetcode_search_state', JSON.stringify(stateObj));
      }
    });

    dialog.querySelector('#setupBtn').addEventListener('click', () => {
      showSetupUI(dialog, state);
    });
  }

  // Directs flow: Handles start page redirect or calls the scraping pagination loop
  async function executeSearchFlow(state) {
    window.__stopLeetCodeSearch = false;
    const dialog = createOrGetDialog();
    showSearchingUI(dialog, state);

    const currentPage = getCurrentPage();
    const isRankingPage = window.location.pathname.includes('/ranking');

    if (!isRankingPage || currentPage !== state.currentPage) {
      dialog.querySelector('#loading-status').textContent = `🔄 Redirecting to rankings page ${state.currentPage}...`;
      const navigated = navigateToPage(state.currentPage);
      if (!navigated) {
        dialog.querySelector('#loading-status').textContent = `❌ Navigation failed!`;
        sessionStorage.removeItem('leetcode_search_state');
      }
      return;
    }

    await searchAndClickNext(dialog, state);
  }

  // Wait for dynamic LeetCode page components to settle
  async function waitForPageToLoad(dialog, pageNumber, timeout = 15000) {
    const loadingStatus = dialog.querySelector('#loading-status');
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    loadingStatus.textContent = `⏳ Loading page ${pageNumber}...`;
    
    const minExpectedUsersPerPage = 10;
    const checkInterval = 300;
    const maxAttempts = Math.floor(timeout / checkInterval);
    
    let stableCount = 0;
    let lastCount = 0;
    const requiredStableChecks = 3;

    for (let i = 0; i < maxAttempts; i++) {
      if (window.__stopLeetCodeSearch) {
        loadingStatus.textContent = "🛑 Stopped";
        return false;
      }

      await delay(checkInterval);
      
      const nameDivs = document.querySelectorAll('a[href*="/u/"] .truncate');
      const currentCount = nameDivs.length;
      const isLoading = document.querySelector('.loading, .spinner, [data-loading="true"]') !== null;
      
      console.log(`Page ${pageNumber} check ${i + 1}: Found ${currentCount} users, loading indicator: ${isLoading}`);
      
      if (currentCount >= minExpectedUsersPerPage && !isLoading) {
        if (currentCount === lastCount) {
          stableCount++;
          if (stableCount >= requiredStableChecks) {
            console.log(`✅ Page ${pageNumber} fully loaded with ${currentCount} users`);
            loadingStatus.textContent = `✅ Page ${pageNumber} loaded (${currentCount} users)`;
            await delay(500);
            return true;
          }
        } else {
          stableCount = 0;
        }
        lastCount = currentCount;
      } else {
        stableCount = 0;
        lastCount = currentCount;
      }
      
      if (i % 5 === 0) {
        loadingStatus.textContent = `⏳ Loading page ${pageNumber}... (${currentCount} users found)`;
      }
    }
    
    const finalCount = document.querySelectorAll('a[href*="/u/"] .truncate').length;
    if (finalCount > 0) {
      console.warn(`⚠️ Page ${pageNumber} load timeout, but found ${finalCount} users. Proceeding...`);
      loadingStatus.textContent = `⚠️ Page ${pageNumber} partially loaded (${finalCount} users)`;
      return true;
    }
    
    console.error(`❌ Failed to load page ${pageNumber} after ${timeout/1000} seconds`);
    loadingStatus.textContent = `❌ Failed to load page ${pageNumber}`;
    return false;
  }

  // Core search and navigation pagination loop
  async function searchAndClickNext(dialog, state) {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));
    const loadingStatus = dialog.querySelector('#loading-status');
    const progressBar = dialog.querySelector('#search-progress-bar');
    const tableBody = dialog.querySelector('#results-table-body');

    function updateStateInStorage() {
      sessionStorage.setItem('leetcode_search_state', JSON.stringify(state));
    }

    // Helper to dynamically insert a new row in results UI
    function insertRowInTable(match) {
      const noMatchesRow = document.getElementById("no-matches-row");
      if (noMatchesRow) {
        noMatchesRow.closest('tr').remove();
      }

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid rgba(255, 255, 255, 0.04)";
      tr.innerHTML = `
        <td style="padding: 6px 2px; color: #f8f9fa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${match.username}">${match.username}</td>
        <td style="padding: 6px 2px; text-align: right; color: #2ec4b6;">${match.page}</td>
      `;
      tableBody.appendChild(tr);
    }

    while (!window.__stopLeetCodeSearch) {
      const page = state.currentPage;
      console.log(`🔍 Searching Page ${page}...`);
      loadingStatus.textContent = `🔍 Searching page ${page}...`;

      const totalPagesToSearch = state.endPage - state.startPage + 1;
      const currentProgressPage = page - state.startPage;
      const progressPercent = totalPagesToSearch > 0 
        ? Math.min(100, Math.round((currentProgressPage / totalPagesToSearch) * 100))
        : 0;
      if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
      }

      const loaded = await waitForPageToLoad(dialog, page);
      if (!loaded) {
        if (!window.__stopLeetCodeSearch) {
          loadingStatus.textContent = `⚠️ Load failed on page ${page}. Stopping.`;
          alert(`⚠️ Could not load page ${page}. Stopping search.`);
          state.isActive = false;
          updateStateInStorage();
        }
        break;
      }

      const nameDivs = Array.from(document.querySelectorAll('a[href*="/u/"] .truncate'));
      console.log(`Found ${nameDivs.length} name elements on page ${page}`);

      let foundNewMatchOnPage = false;
      for (const div of nameDivs) {
        const displayedName = div.textContent.trim();
        const displayedNameLower = displayedName.toLowerCase();
        
        // Prevent duplicate results in same search
        const isDuplicate = state.matches.some(m => m.username.toLowerCase() === displayedNameLower);
        if (isDuplicate) continue;

        // Check if username matches any keyword based on matchType option
        const matchedKeyword = state.keywords.find(kw => {
          if (state.matchType === "exact") {
            return displayedNameLower === kw;
          } else {
            return displayedNameLower.includes(kw);
          }
        });
        if (matchedKeyword) {
          const newMatch = {
            username: displayedName,
            page: page,
            keyword: matchedKeyword
          };

          state.matches.push(newMatch);
          insertRowInTable(newMatch);
          foundNewMatchOnPage = true;
          console.log(`✅ Found '${displayedName}' on page ${page} matching keyword '${matchedKeyword}' (${state.matchType} match)`);
        }
      }

      if (foundNewMatchOnPage) {
        updateStateInStorage();
      }

      // If exact matching mode and we have found all requested usernames, stop immediately!
      if (state.matchType === "exact" && state.matches.length === state.keywords.length) {
        loadingStatus.textContent = "✅ All exact matches found!";
        if (progressBar) progressBar.style.width = "100%";
        alert("✅ All exact matches found!");
        state.isActive = false;
        updateStateInStorage();
        break;
      }

      if (page >= state.endPage) {
        loadingStatus.textContent = "🔍 Search complete (reached limit)";
        if (progressBar) progressBar.style.width = "100%";
        alert("🔍 Search complete. Limit reached.");
        state.isActive = false;
        updateStateInStorage();
        break;
      }

      const nextBtn = document.querySelector('button[aria-label="next"]');
      if (!nextBtn || nextBtn.classList.contains("cursor-not-allowed") || nextBtn.disabled) {
        loadingStatus.textContent = "🔍 Search complete (no more pages)";
        if (progressBar) progressBar.style.width = "100%";
        alert("🔍 Search complete. No more pages.");
        state.isActive = false;
        updateStateInStorage();
        break;
      }

      console.log(`Navigating to page ${page + 1}...`);
      nextBtn.click();
      
      state.currentPage = page + 1;
      updateStateInStorage();

      await delay(300);
    }

    const stopBtn = dialog.querySelector('#stopBtn');
    if (stopBtn) stopBtn.style.display = "none";
    const setupBtn = dialog.querySelector('#setupBtn');
    if (setupBtn) setupBtn.style.display = "block";
  }

  // Restore session state if the page reloaded due to a start page jump
  const savedState = sessionStorage.getItem('leetcode_search_state');
  if (savedState) {
    try {
      const stateObj = JSON.parse(savedState);
      if (stateObj.isActive) {
        executeSearchFlow(stateObj);
      }
    } catch (e) {
      console.error("Error restoring search state:", e);
      sessionStorage.removeItem('leetcode_search_state');
    }
  }

  // Listener for extension popup start triggers
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSearch") {
      // Validate that we are on a contest page before creating the dialog
      const contestMatch = window.location.pathname.match(/\/contest\/([^\/]+)/);
      const contestName = contestMatch ? contestMatch[1] : null;
      if (!contestName || contestName === "api" || contestName === "ranking") {
        alert("⚠️ Please navigate to a specific LeetCode contest page first.");
        sendResponse({ status: "failed", reason: "invalid_page" });
        return;
      }

      const dialog = createOrGetDialog();
      const saved = sessionStorage.getItem('leetcode_search_state');
      if (saved) {
        try {
          const stateObj = JSON.parse(saved);
          if (stateObj.isActive) {
            showSearchingUI(dialog, stateObj);
            sendResponse({ status: "started" });
            return;
          }
        } catch (e) {}
      }
      
      const prefillState = saved ? JSON.parse(saved) : {};
      showSetupUI(dialog, prefillState);
      sendResponse({ status: "started" });

    } else if (request.action === "startSearchWithParams") {
      // Validate contest page
      const contestMatch = window.location.pathname.match(/\/contest\/([^\/]+)/);
      const contestName = contestMatch ? contestMatch[1] : null;
      if (!contestName || contestName === "api" || contestName === "ranking") {
        sendResponse({ status: "failed", reason: "invalid_page" });
        return;
      }

      const state = request.state;
      // Persist state and launch search immediately (skip setup UI)
      sessionStorage.setItem('leetcode_search_state', JSON.stringify(state));
      executeSearchFlow(state);
      sendResponse({ status: "started" });
    }
  });
})();