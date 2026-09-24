(function () {
  const SPECIAL_ACCOUNT_DEFAULT_SUBTRACT = 9751.63;

  const DEFAULT_SPECIAL_ACCOUNTS = [
    { loginid: 'ROT92165703', dotAccountId: 'DOT93636292', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT92013755', dotAccountId: 'DOT93349323', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT90270277', dotAccountId: 'DOT90970096', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT92162993', dotAccountId: 'DOT93443538', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91032609', dotAccountId: 'DOT92192170', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91259979', dotAccountId: 'DOT92441968', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT911629', dotAccountId: 'DOT923275', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91840423', dotAccountId: 'DOT93139883', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT92188061', dotAccountId: 'DOT90744185', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT90310220', dotAccountId: 'DOT91156837', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91158629', dotAccountId: 'DOT92327275', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT92211317', dotAccountId: 'DOT93735355', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91668004', dotAccountId: 'DOT92946630', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91632244', dotAccountId: 'DOT92908185', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91317679', dotAccountId: 'DOT92505040', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT92064113', dotAccountId: 'DOT93418836', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT920699', dotAccountId: 'DOT938245', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91152666', dotAccountId: 'DOT92321098', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT90835603', dotAccountId: 'DOT91964215', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91831095', dotAccountId: 'DOT93129432', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
    { loginid: 'ROT91844947', dotAccountId: 'DOT93145012', subtract: SPECIAL_ACCOUNT_DEFAULT_SUBTRACT, description: 'ROT account balance derived from the authorized DOT account balance' },
  ];

  function normalizeLoginId(value) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value.toString === 'function') return String(value).trim();
    return '';
  }

  function safeJsonParse(value, fallback) {
    try {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = JSON.parse(value);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  const LINKED_ACCOUNT_KEYS = {
    REAL_LOGINID: 'special-account-real-loginid',
    REAL_AUTH_TOKEN: 'special-account-real-auth-token',
    DEMO_LOGINID: 'special-account-demo-loginid',
    DEMO_AUTH_TOKEN: 'special-account-demo-auth-token',
    LINK_MODE: 'special-account-link-mode',
  };

  function getStorageScope() {
    return typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
  }

  function normalizeAccountMap(value) {
    if (!value) return {};
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.reduce((acc, item) => {
          if (!item || typeof item !== 'object') return acc;
          const login = normalizeLoginId(item.loginid || item.account_id || item.id);
          if (login) acc[login] = item.token || item.authToken || item.value || '';
          return acc;
        }, {});
      }
      return Object.entries(value).reduce((acc, [key, entry]) => {
        const login = normalizeLoginId(key);
        if (login) acc[login] = entry;
        return acc;
      }, {});
    }
    return {};
  }

  // rawGet: an unpatched getItem fn — avoids infinite recursion when called from
  // inside the patched storageScope.getItem.
  function getSpecialStorageContext(storageScope, rawGet) {
    if (!storageScope) return null;
    const get = rawGet || storageScope.getItem.bind(storageScope);

    const activeLoginId = normalizeLoginId(get('active_loginid'));
    const special = getSpecialAccountByLoginId(activeLoginId)
      || getSpecialAccountByDotAccountId(activeLoginId)
      || getSpecialAccountByLoginId(get('special-account-loginid'))
      || getSpecialAccountByDotAccountId(get('special-account-dot-account-id'));

    if (!special) return null;

    const accountsList = normalizeAccountMap(safeJsonParse(get('accountsList'), {}));
    const clientAccounts = normalizeAccountMap(safeJsonParse(get('clientAccounts'), {}));
    const dotToken = accountsList[special.dotAccountId] || clientAccounts[special.dotAccountId]?.token || clientAccounts[special.dotAccountId]?.authToken || '';

    return {
      special,
      activeLoginId,
      dotToken,
      accountsList,
      clientAccounts,
    };
  }

  function getLinkedDemoAccount(storageScope, rawGet) {
    if (!storageScope) return null;
    const realLoginId = normalizeLoginId(storageScope.getItem(LINKED_ACCOUNT_KEYS.REAL_LOGINID));
    const realAuthToken = normalizeLoginId(storageScope.getItem(LINKED_ACCOUNT_KEYS.REAL_AUTH_TOKEN));
    const demoLoginId = normalizeLoginId(storageScope.getItem(LINKED_ACCOUNT_KEYS.DEMO_LOGINID));
    const demoAuthToken = normalizeLoginId(storageScope.getItem(LINKED_ACCOUNT_KEYS.DEMO_AUTH_TOKEN));
    const linkMode = normalizeLoginId(storageScope.getItem(LINKED_ACCOUNT_KEYS.LINK_MODE));
    if (!realLoginId || !demoLoginId) return null;
    const demoBalance = getDemoBalanceFromStorage(storageScope, demoLoginId);
    return { realLoginId, realAuthToken, demoLoginId, demoAuthToken, linkMode, demoBalance };
  }

  function patchAccountEntriesWithDemoBalance(entries, link) {
    if (!entries || !link) return entries;
    if (Array.isArray(entries)) {
      return entries.map((entry) => {
        if (!entry || typeof entry !== 'object') return entry;
        const login = normalizeLoginId(entry.loginid || entry.account_id || entry.id);
        if (login === link.realLoginId) {
          return {
            ...entry,
            balance: link.demoBalance,
            amount: link.demoBalance,
            real_balance: link.demoBalance,
            available_balance: link.demoBalance,
            equity: link.demoBalance,
            value: link.demoBalance,
          };
        }
        return entry;
      });
    }
    const patched = {};
    for (const [key, entry] of Object.entries(entries)) {
      if (!entry || typeof entry !== 'object') {
        patched[key] = entry;
        continue;
      }
      const login = normalizeLoginId(entry.loginid || entry.account_id || entry.id || key);
      if (login === link.realLoginId) {
        patched[key] = {
          ...entry,
          loginid: link.realLoginId,
          account_id: link.realLoginId,
          id: link.realLoginId,
          balance: link.demoBalance,
          amount: link.demoBalance,
          real_balance: link.demoBalance,
          available_balance: link.demoBalance,
          equity: link.demoBalance,
          value: link.demoBalance,
        };
      } else {
        patched[key] = entry;
      }
    }
    return patched;
  }

  function setLinkedDemoAccount(storageScope, realLoginId, realAuthToken, demoLoginId, demoAuthToken) {
    if (!storageScope) return;
    storageScope.setItem(LINKED_ACCOUNT_KEYS.REAL_LOGINID, normalizeLoginId(realLoginId));
    if (realAuthToken) storageScope.setItem(LINKED_ACCOUNT_KEYS.REAL_AUTH_TOKEN, normalizeLoginId(realAuthToken));
    storageScope.setItem(LINKED_ACCOUNT_KEYS.DEMO_LOGINID, normalizeLoginId(demoLoginId));
    if (demoAuthToken) storageScope.setItem(LINKED_ACCOUNT_KEYS.DEMO_AUTH_TOKEN, normalizeLoginId(demoAuthToken));
    storageScope.setItem(LINKED_ACCOUNT_KEYS.LINK_MODE, 'linked');
  }

  function clearLinkedDemoAccount(storageScope) {
    if (!storageScope) return;
    storageScope.removeItem(LINKED_ACCOUNT_KEYS.REAL_LOGINID);
    storageScope.removeItem(LINKED_ACCOUNT_KEYS.REAL_AUTH_TOKEN);
    storageScope.removeItem(LINKED_ACCOUNT_KEYS.DEMO_LOGINID);
    storageScope.removeItem(LINKED_ACCOUNT_KEYS.DEMO_AUTH_TOKEN);
    storageScope.removeItem(LINKED_ACCOUNT_KEYS.LINK_MODE);
  }

  function getDemoBalanceFromStorage(storageScope, demoLoginId) {
    if (!storageScope || !demoLoginId) return 0;
    const allAccounts = safeJsonParse(storageScope.getItem('all_accounts_balance'), {});
    if (allAccounts && allAccounts.accounts && typeof allAccounts.accounts === 'object') {
      const entry = allAccounts.accounts[demoLoginId] || allAccounts.accounts[normalizeLoginId(demoLoginId)];
      const balance = readAccountBalance(entry);
      if (balance !== 0) return balance;
    }
    const accountsList = safeJsonParse(storageScope.getItem('accountsList'), []);
    const rows = Array.isArray(accountsList) ? accountsList : Object.values(accountsList || {});
    for (const row of rows) {
      const login = normalizeLoginId(row && (row.loginid || row.account_id || row.id));
      if (login === demoLoginId) {
        const balance = readAccountBalance(row);
        if (balance !== 0) return balance;
      }
    }
    const clientDetails = safeJsonParse(storageScope.getItem('client_account_details'), []);
    if (Array.isArray(clientDetails)) {
      for (const row of clientDetails) {
        const login = normalizeLoginId(row && row.loginid);
        if (login === demoLoginId) {
          const balance = readAccountBalance(row);
          if (balance !== 0) return balance;
        }
      }
    }
    const storedDemoBalance = readBalance(storageScope.getItem('special-account-demo-balance'));
    if (storedDemoBalance !== 0) return storedDemoBalance;
    return 0;
  }

  function applyDemoBalanceOverlay(storageScope) {
    if (!storageScope) return;
    const link = getLinkedDemoAccount(storageScope);
    if (!link || !link.realLoginId || !link.demoLoginId) return;
    const demoBalance = getDemoBalanceFromStorage(storageScope, link.demoLoginId);
    const derivedBalance = demoBalance;

    function patchEntry(entry) {
      if (!entry || typeof entry !== 'object') return entry;
      const login = normalizeLoginId(entry.loginid || entry.account_id || entry.id);
      if (login !== link.realLoginId) return entry;
      return {
        ...entry,
        loginid: link.realLoginId,
        account_id: link.realLoginId,
        id: link.realLoginId,
        balance: derivedBalance,
        amount: derivedBalance,
        real_balance: derivedBalance,
        available_balance: derivedBalance,
        equity: derivedBalance,
        value: derivedBalance,
      };
    }

    const allAccounts = safeJsonParse(storageScope.getItem('all_accounts_balance'), {});
    if (allAccounts && typeof allAccounts === 'object' && allAccounts.accounts && typeof allAccounts.accounts === 'object') {
      const existing = allAccounts.accounts[link.realLoginId] || allAccounts.accounts[normalizeLoginId(link.realLoginId)] || {};
      allAccounts.accounts[link.realLoginId] = patchEntry(existing);
      storageScope.setItem('all_accounts_balance', JSON.stringify(allAccounts));
    }

    const accountsList = safeJsonParse(storageScope.getItem('accountsList'), []);
    if (Array.isArray(accountsList)) {
      storageScope.setItem('accountsList', JSON.stringify(accountsList.map(patchEntry)));
    } else if (accountsList && typeof accountsList === 'object') {
      const patched = {};
      for (const [key, value] of Object.entries(accountsList)) {
        patched[key] = patchEntry(value);
      }
      storageScope.setItem('accountsList', JSON.stringify(patched));
    }

    const clientDetails = safeJsonParse(storageScope.getItem('client_account_details'), []);
    if (Array.isArray(clientDetails)) {
      storageScope.setItem('client_account_details', JSON.stringify(clientDetails.map(patchEntry)));
    }

    if (link.realLoginId) {
      storageScope.setItem('balance', String(derivedBalance));
    }
  }

  function syncSpecialAccountStorage(storageScope) {
    if (!storageScope) return;

    const context = getSpecialStorageContext(storageScope);
    if (!context) return;

    const { special, dotToken, accountsList, clientAccounts } = context;

    if (dotToken) {
      storageScope.setItem('authToken', dotToken);
    }

    if (special.loginid && dotToken) {
      const nextAccountsList = { ...accountsList, [special.loginid]: dotToken };
      storageScope.setItem('accountsList', JSON.stringify(nextAccountsList));
    }

    if (special.loginid && dotToken) {
      const nextClientAccounts = { ...clientAccounts };
      const dotEntry = clientAccounts[special.dotAccountId] || {};
      nextClientAccounts[special.loginid] = {
        ...(dotEntry && typeof dotEntry === 'object' ? dotEntry : {}),
        account_id: special.loginid,
        loginid: special.loginid,
        token: dotToken,
        authToken: dotToken,
      };
      storageScope.setItem('clientAccounts', JSON.stringify(nextClientAccounts));
    }

    if (special.loginid) {
      storageScope.setItem('show_as_cr', special.loginid);
      storageScope.setItem('account_type', 'real');
    }
  }

  function patchStorageScope(storageScope) {
    if (!storageScope || storageScope.__APPDERIV_SPECIAL_STORAGE_PATCHED__) return;

    const originalGetItem = storageScope.getItem.bind(storageScope);
    const originalSetItem = storageScope.setItem.bind(storageScope);
    const originalRemoveItem = storageScope.removeItem.bind(storageScope);

    storageScope.getItem = function (key) {
      const value = originalGetItem(key);
      // Always pass originalGetItem so context lookups never recurse back into
      // this patched getter, which would cause an infinite call stack.
      const context = getSpecialStorageContext(storageScope, originalGetItem);
      const linkedDemo = getLinkedDemoAccount(storageScope, originalGetItem);

      if (key === 'authToken') {
        if (context && context.dotToken) return context.dotToken;
      }

      if (key === 'accountsList') {
        if (context && context.special.loginid && context.dotToken) {
          const nextAccountsList = { ...context.accountsList, [context.special.loginid]: context.dotToken };
          return JSON.stringify(nextAccountsList);
        }
        if (linkedDemo && linkedDemo.realLoginId && linkedDemo.demoBalance !== undefined) {
          const parsed = safeJsonParse(value, {});
          return JSON.stringify(patchAccountEntriesWithDemoBalance(parsed, linkedDemo));
        }
      }

      if (key === 'clientAccounts') {
        if (context && context.special.loginid && context.dotToken) {
          const nextClientAccounts = { ...context.clientAccounts };
          const dotEntry = context.clientAccounts[context.special.dotAccountId] || {};
          nextClientAccounts[context.special.loginid] = {
            ...(dotEntry && typeof dotEntry === 'object' ? dotEntry : {}),
            account_id: context.special.loginid,
            loginid: context.special.loginid,
            token: context.dotToken,
            authToken: context.dotToken,
          };
          return JSON.stringify(nextClientAccounts);
        }
        if (linkedDemo && linkedDemo.realLoginId && linkedDemo.demoBalance !== undefined) {
          const parsed = safeJsonParse(value, {});
          return JSON.stringify(patchAccountEntriesWithDemoBalance(parsed, linkedDemo));
        }
      }

      if (key === 'all_accounts_balance') {
        if (linkedDemo && linkedDemo.realLoginId && linkedDemo.demoBalance !== undefined) {
          const parsed = safeJsonParse(value, {});
          if (parsed && typeof parsed === 'object') {
            const next = { ...(parsed || {}) };
            if (next.accounts && typeof next.accounts === 'object') {
              next.accounts = patchAccountEntriesWithDemoBalance(next.accounts, linkedDemo);
            }
            return JSON.stringify(next);
          }
        }
      }

      if (key === 'client_account_details') {
        if (linkedDemo && linkedDemo.realLoginId && linkedDemo.demoBalance !== undefined) {
          const parsed = safeJsonParse(value, []);
          return JSON.stringify(patchAccountEntriesWithDemoBalance(parsed, linkedDemo));
        }
      }

      if (key === 'balance') {
        if (linkedDemo && linkedDemo.realLoginId) {
          // Use originalGetItem here — inside the patched getter we must never
          // call the patched version again or we get infinite recursion.
          const activeLogin = normalizeLoginId(originalGetItem('active_loginid'));
          if (activeLogin === linkedDemo.realLoginId) {
            return String(linkedDemo.demoBalance);
          }
        }
      }

      if (key === 'show_as_cr') {
        if (context && context.special.loginid) return context.special.loginid;
      }

      return value;
    };

    storageScope.setItem = function (key, value) {
      const normalizedKey = String(key || '');
      const result = originalSetItem(normalizedKey, value);
      if (normalizedKey === 'active_loginid') {
        syncSpecialAccountStorage(storageScope);
      } else if (normalizedKey === 'accountsList' || normalizedKey === 'clientAccounts' || normalizedKey === 'active_loginid' || normalizedKey === 'authToken') {
        syncSpecialAccountStorage(storageScope);
      }
      return result;
    };

    storageScope.removeItem = function (key) {
      const result = originalRemoveItem(key);
      if (key === 'active_loginid' || key === 'accountsList' || key === 'clientAccounts') {
        syncSpecialAccountStorage(storageScope);
      }
      return result;
    };

    storageScope.__APPDERIV_SPECIAL_STORAGE_PATCHED__ = true;
  }

  function readBalance(value) {
    if (value === null || value === undefined || value === '') return 0;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function readAccountBalance(account) {
    if (!account || typeof account !== 'object') return 0;

    const candidates = [
      account.balance,
      account.amount,
      account.real_balance,
      account.available_balance,
      account.balance_value,
      account.equity,
      account.value,
    ];

    for (const candidate of candidates) {
      const numeric = readBalance(candidate);
      if (numeric !== 0 || candidate !== undefined) {
        return numeric;
      }
    }

    return 0;
  }

  function applyBalanceToAccountEntry(entry, special, derivedBalance, fallbackCurrency) {
    if (!entry || typeof entry !== 'object') return entry;

    const login = normalizeLoginId(entry.loginid || entry.account_id || entry.id);
    if (!login || (login !== special.loginid && login !== special.dotAccountId)) return entry;

    return {
      ...entry,
      loginid: special.loginid,
      account_id: special.loginid,
      id: special.loginid,
      balance: derivedBalance,
      amount: derivedBalance,
      real_balance: derivedBalance,
      available_balance: derivedBalance,
      equity: derivedBalance,
      value: derivedBalance,
      currency: entry.currency || fallbackCurrency || 'USD',
    };
  }

  function calculateDerivedBalance(linkedBalance, subtract) {
    const numericBalance = Number(linkedBalance);
    const subtractAmount = Number(subtract ?? SPECIAL_ACCOUNT_DEFAULT_SUBTRACT);
    if (!Number.isFinite(numericBalance) || numericBalance <= 0) return 0;
    if (!Number.isFinite(subtractAmount)) return Math.max(0, numericBalance);
    return Math.max(0, numericBalance - subtractAmount);
  }

  function mergeSpecialAccounts(entries) {
    const merged = new Map();
    for (const item of [...DEFAULT_SPECIAL_ACCOUNTS, ...(Array.isArray(entries) ? entries : [])]) {
      const normalized = item && typeof item === 'object' ? item : null;
      if (!normalized || !normalized.loginid) continue;
      const loginid = normalizeLoginId(normalized.loginid);
      const dotAccountId = normalizeLoginId(normalized.dotAccountId || normalized.dot_account_id || normalized.dotAccount || '');
      const subtract = Number(normalized.subtract ?? normalized.amount ?? SPECIAL_ACCOUNT_DEFAULT_SUBTRACT);
      merged.set(loginid, {
        loginid,
        dotAccountId,
        subtract: Number.isFinite(subtract) ? subtract : SPECIAL_ACCOUNT_DEFAULT_SUBTRACT,
        description: normalized.description || 'ROT account balance derived from the authorized DOT account balance',
      });
    }
    return Array.from(merged.values());
  }

  function getSpecialAccounts() {
    const configured = [];
    const globalScope = typeof window !== 'undefined' ? window : globalThis;

    if (globalScope && typeof globalScope === 'object') {
      const siteSettings =
        safeJsonParse(globalScope.localStorage && globalScope.localStorage.getItem ? globalScope.localStorage.getItem('config.site_settings_json') : null, null) ||
        (globalScope.__APPDERIV_SITE_SETTINGS__ || null);

      const siteAccounts = siteSettings && Array.isArray(siteSettings.specialAccounts)
        ? siteSettings.specialAccounts
        : Array.isArray(siteSettings && siteSettings.site && siteSettings.site.specialAccounts)
          ? siteSettings.site.specialAccounts
          : [];

      if (siteAccounts.length) configured.push(...siteAccounts);
      if (Array.isArray(globalScope.__APPDERIV_SPECIAL_ACCOUNTS__)) {
        configured.push(...globalScope.__APPDERIV_SPECIAL_ACCOUNTS__);
      }
    }

    return mergeSpecialAccounts(configured);
  }

  function getSpecialAccountConfig(loginId) {
    const normalized = normalizeLoginId(loginId);
    if (!normalized) return null;
    return getSpecialAccounts().find((account) => account.loginid === normalized) || null;
  }

  function getSpecialAccountConfigByDotAccountId(dotAccountId) {
    const normalized = normalizeLoginId(dotAccountId);
    if (!normalized) return null;
    return getSpecialAccounts().find((account) => account.dotAccountId === normalized) || null;
  }

  function getSpecialAccountDotAccountId(loginId) {
    return getSpecialAccountConfig(loginId)?.dotAccountId || '';
  }

  function getSpecialAccountByLoginId(loginId) {
    const normalized = normalizeLoginId(loginId);
    if (!normalized) return null;
    return getSpecialAccounts().find((account) => account.loginid === normalized) || null;
  }

  function getSpecialAccountByDotAccountId(dotAccountId) {
    const normalized = normalizeLoginId(dotAccountId);
    if (!normalized) return null;
    return getSpecialAccounts().find((account) => account.dotAccountId === normalized) || null;
  }

  function getDotBalanceFromAccounts(allAccountsBalance, accounts, fallbackDotLoginId) {
    const candidates = [
      Array.isArray(accounts) ? accounts.find((account) => normalizeLoginId(account && account.loginid).toUpperCase().startsWith('DOT'))?.loginid : null,
      fallbackDotLoginId,
    ].filter(Boolean);

    for (const loginid of candidates) {
      const normalizedLoginId = normalizeLoginId(loginid).toUpperCase();
      const allBalanceEntry =
        (allAccountsBalance && allAccountsBalance.accounts && allAccountsBalance.accounts[normalizedLoginId]) ||
        (allAccountsBalance && allAccountsBalance.accounts && allAccountsBalance.accounts[normalizeLoginId(loginid)]) ||
        (allAccountsBalance && allAccountsBalance.accounts && allAccountsBalance.accounts[normalizeLoginId(loginid).toLowerCase()]);
      const balanceFromAllBalance = Number(typeof allBalanceEntry === 'object' ? (allBalanceEntry?.balance ?? 0) : (allBalanceEntry ?? 0));
      if (Number.isFinite(balanceFromAllBalance) && balanceFromAllBalance !== 0) return balanceFromAllBalance;

      const accountFromList = Array.isArray(accounts)
        ? accounts.find((account) => normalizeLoginId(account && account.loginid).toUpperCase() === normalizedLoginId)
        : null;
      const balanceFromAccount = Number(accountFromList?.balance ?? 0);
      if (Number.isFinite(balanceFromAccount) && balanceFromAccount !== 0) return balanceFromAccount;
    }

    return Number.NaN;
  }

  function getSpecialAccountDisplayBalance(loginId, serverBalance, currency, allAccountsBalance, accounts) {
    const config = getSpecialAccountConfig(loginId);
    if (!config) return Number(serverBalance ?? 0);

    const dotBalance = getDotBalanceFromAccounts(allAccountsBalance, accounts, config.dotAccountId);
    if (!Number.isFinite(dotBalance)) return Number(serverBalance ?? 0);

    const derivedBalance = Math.max(0, dotBalance - config.subtract);
    const shouldAddRealBalance = currency === 'USD' && Number(serverBalance ?? 0) < 1;
    const displayBalance = shouldAddRealBalance ? Math.max(0, derivedBalance + Number(serverBalance ?? 0)) : derivedBalance;
    return Number.isFinite(displayBalance) ? Number(displayBalance.toFixed(currency === 'BTC' ? 8 : 2)) : Number(serverBalance ?? 0);
  }

  function getActiveLoginId() {
    const storageScope = getStorageScope();
    if (!storageScope) return '';

    const activeLoginId = normalizeLoginId(storageScope.getItem('active_loginid'));
    if (activeLoginId) return activeLoginId;

    const details = safeJsonParse(storageScope.getItem('client_account_details'), []);
    if (Array.isArray(details)) {
      for (const account of details) {
        const loginid = normalizeLoginId(account && account.loginid);
        if (loginid) return loginid;
      }
    }

    const list = safeJsonParse(storageScope.getItem('accountsList'), []);
    const rows = Array.isArray(list) ? list : Object.values(list || {});
    for (const item of rows) {
      const loginid = normalizeLoginId(item && (item.loginid || item.account_id || item.id));
      if (loginid) return loginid;
    }

    return '';
  }

  function getDotBalanceForSpecialAccount(account) {
    const storageScope = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
    if (!account || !storageScope) return 0;

    const dotAccountId = account.dotAccountId;
    const loginid = account.loginid;

    const storedDotBalance = readBalance(storageScope.getItem('special-account-dot-balance'));
    if (storedDotBalance !== 0) return storedDotBalance;

    const storedDemoBalance = readBalance(storageScope.getItem('special-account-demo-balance'));
    if (storedDemoBalance !== 0) return storedDemoBalance;

    const allAccounts = safeJsonParse(storageScope.getItem('all_accounts_balance'), {});
    if (allAccounts && allAccounts.accounts && typeof allAccounts.accounts === 'object') {
      const direct = readAccountBalance(allAccounts.accounts[dotAccountId]);
      if (direct !== 0) return direct;
      const loginBalance = readAccountBalance(allAccounts.accounts[loginid]);
      if (loginBalance !== 0) return loginBalance;
    }

    const accountsList = safeJsonParse(storageScope.getItem('accountsList'), []);
    const rows = Array.isArray(accountsList) ? accountsList : Object.values(accountsList || {});
    for (const item of rows) {
      const login = normalizeLoginId(item && (item.loginid || item.account_id || item.id));
      if (login === dotAccountId || login === loginid) {
        const value = readAccountBalance(item);
        if (value !== 0) return value;
      }
    }

    const details = safeJsonParse(storageScope.getItem('client_account_details'), []);
    if (Array.isArray(details)) {
      for (const item of details) {
        const login = normalizeLoginId(item && item.loginid);
        if (login === dotAccountId || login === loginid) {
          const value = readAccountBalance(item);
          if (value !== 0) return value;
        }
      }
    }

    const legacyBalance = readBalance(storageScope.getItem('special-account-dot-balance'));
    if (legacyBalance !== 0) return legacyBalance;

    return 0;
  }

  function applySharedBalanceToAccountData(special, derivedBalance) {
    const storageScope = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
    if (!storageScope || !special) return;

    const allAccounts = safeJsonParse(storageScope.getItem('all_accounts_balance'), {});
    if (!allAccounts || typeof allAccounts !== 'object') return;
    if (!allAccounts.accounts || typeof allAccounts.accounts !== 'object') allAccounts.accounts = {};

    const patchAccounts = [special.loginid, special.dotAccountId].filter(Boolean);
    patchAccounts.forEach((loginid) => {
      const existing = allAccounts.accounts[loginid] || {};
      allAccounts.accounts[loginid] = {
        ...existing,
        loginid,
        balance: derivedBalance,
        amount: derivedBalance,
        real_balance: derivedBalance,
        available_balance: derivedBalance,
        equity: derivedBalance,
        value: derivedBalance,
        currency: existing.currency || 'USD',
      };
    });

    if (allAccounts.accounts) {
      Object.keys(allAccounts.accounts).forEach((key) => {
        const entry = allAccounts.accounts[key];
        const normalizedKey = normalizeLoginId(key);
        if (normalizedKey && patchAccounts.includes(normalizedKey)) {
          allAccounts.accounts[key] = {
            ...entry,
            loginid: normalizedKey,
            balance: derivedBalance,
            amount: derivedBalance,
            real_balance: derivedBalance,
            available_balance: derivedBalance,
            equity: derivedBalance,
            value: derivedBalance,
          };
        }
      });
    }

    storageScope.setItem('all_accounts_balance', JSON.stringify(allAccounts));

    const accountListRaw = safeJsonParse(storageScope.getItem('accountsList'), []);
    const rows = Array.isArray(accountListRaw) ? accountListRaw : Object.values(accountListRaw || {});
    if (rows.length) {
      const nextRows = rows.map((row) => applyBalanceToAccountEntry(row, special, derivedBalance, row && row.currency ? row.currency : 'USD'));
      storageScope.setItem('accountsList', JSON.stringify(nextRows));
    }

    const details = safeJsonParse(storageScope.getItem('client_account_details'), []);
    if (Array.isArray(details)) {
      const nextDetails = details.map((item) => applyBalanceToAccountEntry(item, special, derivedBalance, item && item.currency ? item.currency : 'USD'));
      storageScope.setItem('client_account_details', JSON.stringify(nextDetails));
    }

    const activeLogin = normalizeLoginId(storageScope.getItem('active_loginid'));
    if (!activeLogin || activeLogin === special.dotAccountId || activeLogin === special.loginid) {
      storageScope.setItem('active_loginid', special.loginid);
      storageScope.setItem('account_type', 'real');
    }

    storageScope.setItem('balance', String(derivedBalance));
  }

  function clearSpecialState() {
    const storageScope = getStorageScope();
    if (!storageScope) return;

    storageScope.removeItem('special-account-loginid');
    storageScope.removeItem('special-account-dot-account-id');
    storageScope.removeItem('special-account-status');
    storageScope.removeItem('special-account-balance');
    storageScope.removeItem('special-account-demo-balance');
    storageScope.removeItem('special-account-dot-balance');
    storageScope.setItem('special-account-mode', 'demo');

    if (typeof window !== 'undefined') {
      window.__APPDERIV_SPECIAL_ACCOUNT__ = null;
      window.dispatchEvent(new Event('special-account-updated'));
    }
  }

  function applySpecialAccountBalance() {
    const storageScope = getStorageScope();
    if (!storageScope) return false;

    patchStorageScope(storageScope);
    const context = getSpecialStorageContext(storageScope);

    if (context && context.activeLoginId && context.special && context.activeLoginId !== context.special.loginid) {
      storageScope.setItem('active_loginid', context.special.loginid);
      storageScope.setItem('show_as_cr', context.special.loginid);
    }

    const activeLoginId = getActiveLoginId();
    const special = getSpecialAccountByLoginId(activeLoginId)
      || getSpecialAccountByDotAccountId(activeLoginId)
      || getSpecialAccountByLoginId(storageScope.getItem('special-account-loginid'))
      || getSpecialAccountByDotAccountId(storageScope.getItem('special-account-dot-account-id'));

    if (!special) {
      clearSpecialState();
      return false;
    }

    const linkedBalance = getDotBalanceForSpecialAccount(special);
    const derivedBalance = calculateDerivedBalance(linkedBalance, special.subtract);

    storageScope.setItem('special-account-loginid', special.loginid);
    storageScope.setItem('special-account-dot-account-id', special.dotAccountId);
    storageScope.setItem('special-account-status', 'special');
    storageScope.setItem('special-account-balance', String(derivedBalance));
    storageScope.setItem('special-account-mode', 'real');
    storageScope.setItem('special-account-demo-balance', String(linkedBalance));
    storageScope.setItem('special-account-dot-balance', String(linkedBalance));

    const activeLogin = normalizeLoginId(storageScope.getItem('active_loginid'));
    if (!activeLogin || activeLogin !== special.loginid) {
      storageScope.setItem('active_loginid', special.loginid);
    }

    storageScope.setItem('show_as_cr', special.loginid);
    storageScope.setItem('account_type', 'real');
    storageScope.setItem('authToken', storageScope.getItem('authToken') || '');

    applySharedBalanceToAccountData(special, derivedBalance);
    applyDemoBalanceOverlay(storageScope);

    if (typeof window !== 'undefined') {
      syncSpecialAccountStorage(storageScope);
      window.__APPDERIV_SPECIAL_ACCOUNT__ = {
        loginid: special.loginid,
        dotAccountId: special.dotAccountId,
        subtract: special.subtract,
        linkedBalance,
        derivedBalance,
        isSpecial: true,
      };
      window.dispatchEvent(new Event('special-account-updated'));
      window.dispatchEvent(new Event('active_loginid_changed'));
      window.dispatchEvent(new Event('balance-updated'));
      try {
        window.dispatchEvent(new StorageEvent('storage', { key: 'all_accounts_balance', newValue: storageScope.getItem('all_accounts_balance') }));
      } catch (error) {
        window.dispatchEvent(new Event('storage'));
      }
    }

    return true;
  }

  function startSpecialAccountSync() {
    const globalScope = typeof window !== 'undefined' ? window : globalThis;
    if (!globalScope) return;

    patchStorageScope(getStorageScope());

    const existing = globalScope.__APPDERIV_SPECIAL_ACCOUNT_INTERVAL__;
    if (existing) {
      globalScope.clearInterval(existing);
    }

    applySpecialAccountBalance();
    const intervalId = globalScope.setInterval(applySpecialAccountBalance, 1000);
    globalScope.__APPDERIV_SPECIAL_ACCOUNT_INTERVAL__ = intervalId;

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', applySpecialAccountBalance);
      window.addEventListener('focus', applySpecialAccountBalance);
      window.addEventListener('load', applySpecialAccountBalance);
    }
  }

  const api = {
    SPECIAL_ACCOUNTS: getSpecialAccounts(),
    getSpecialAccountConfig,
    getSpecialAccountConfigByDotAccountId,
    getSpecialAccountByLoginId,
    getSpecialAccountByDotAccountId,
    getSpecialAccountDotAccountId,
    getSpecialAccountDisplayBalance,
    getSpecialAccountBalanceForLogin(loginId) {
      const special = getSpecialAccountByLoginId(loginId) || getSpecialAccountByDotAccountId(loginId);
      if (!special) return 0;
      const linkedBalance = getDotBalanceForSpecialAccount(special);
      return calculateDerivedBalance(linkedBalance, special.subtract);
    },
    calculateDerivedBalance,
  };

  if (typeof window !== 'undefined') {
    window.__APPDERIV_SPECIAL_ACCOUNTS__ = api.SPECIAL_ACCOUNTS;
    window.isSpecialAccountLogin = function (loginId) {
      return !!getSpecialAccountByLoginId(loginId);
    };
    window.getSpecialAccountByLoginId = function (loginId) {
      return getSpecialAccountByLoginId(loginId);
    };
    window.getSpecialAccountConfig = function (loginId) {
      return getSpecialAccountConfig(loginId);
    };
    window.getSpecialAccountDotAccountId = function (loginId) {
      return getSpecialAccountDotAccountId(loginId);
    };
    window.getSpecialAccountDisplayBalance = function (loginId, serverBalance, currency, allAccountsBalance, accounts) {
      return getSpecialAccountDisplayBalance(loginId, serverBalance, currency, allAccountsBalance, accounts);
    };
    window.getSpecialAccountBalanceForLogin = function (loginId) {
      return api.getSpecialAccountBalanceForLogin(loginId);
    };
    window.linkDemoAccountToRealAccount = function (realLoginId, realAuthToken, demoLoginId, demoAuthToken) {
      const storageScope = window.localStorage;
      setLinkedDemoAccount(storageScope, realLoginId, realAuthToken, demoLoginId, demoAuthToken);
      storageScope.setItem('active_loginid', normalizeLoginId(realLoginId));
      storageScope.setItem('show_as_cr', normalizeLoginId(realLoginId));
      storageScope.setItem('account_type', 'real');
      applyDemoBalanceOverlay(storageScope);
      window.dispatchEvent(new Event('special-account-updated'));
      window.dispatchEvent(new Event('active_loginid_changed'));
      window.dispatchEvent(new Event('balance-updated'));
    };
    window.clearDemoAccountLink = function () {
      const storageScope = window.localStorage;
      clearLinkedDemoAccount(storageScope);
      window.dispatchEvent(new Event('special-account-updated'));
      window.dispatchEvent(new Event('active_loginid_changed'));
      window.dispatchEvent(new Event('balance-updated'));
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startSpecialAccountSync, { once: true });
    } else {
      startSpecialAccountSync();
    }
  } else if (typeof window !== 'undefined') {
    startSpecialAccountSync();
  }
})();
