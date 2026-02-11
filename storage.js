/* 精打细算 Pro - 存储层（API + localStorage 兜底） */
(function() {
  const API_KEYS = ['userData', 'agent-memory', 'usage', 'aiTotal', 'tasksDone', 'ai-provider', 'ai-apikey', 'ai-daily-used', 'ai-last-reset', 'opp-scanner-cache', 'expense-records'];
  const TOKEN_KEY = 'auth_token';

  function getAuthHeader() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  function tryPullFromServer() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/sync', false);
      const h = getAuthHeader();
      for (const k in h) xhr.setRequestHeader(k, h[k]);
      xhr.send();
      if (xhr.status === 200) {
        const d = JSON.parse(xhr.responseText);
        if (d.ok && d.data) {
          for (const k of Object.keys(d.data)) {
            localStorage.setItem(k, d.data[k]);
          }
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function pushToServer() {
    try {
      const data = {};
      API_KEYS.forEach(k => {
        const v = localStorage.getItem(k);
        if (v !== null) data[k] = v;
      });
      if (Object.keys(data).length === 0) return;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/sync', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      const h = getAuthHeader();
      for (const k in h) xhr.setRequestHeader(k, h[k]);
      xhr.send(JSON.stringify({ data }));
    } catch (e) {}
  }

  const useApi = tryPullFromServer();
  if (useApi) {
    const _setItem = localStorage.setItem.bind(localStorage);
    const _removeItem = localStorage.removeItem.bind(localStorage);
    const _clear = localStorage.clear.bind(localStorage);
    let syncTimer = null;
    function schedulePush() {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => { pushToServer(); syncTimer = null; }, 500);
    }
    localStorage.setItem = function(k, v) {
      _setItem(k, v);
      if (API_KEYS.includes(k)) schedulePush();
    };
    localStorage.removeItem = function(k) {
      _removeItem(k);
      if (API_KEYS.includes(k)) schedulePush();
    };
    localStorage.clear = function() {
      _clear();
      schedulePush();
    };
    window.addEventListener('beforeunload', () => { clearTimeout(syncTimer); pushToServer(); });
  }
})();
