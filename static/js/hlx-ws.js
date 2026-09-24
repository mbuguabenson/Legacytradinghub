/* ─────────────────────────────────────────────────────────────────────────
   HYPRLVX WebSocket app_id bridge
   Two jobs, both done by intercepting `new WebSocket(url)` before the bundle
   opens its Deriv sockets (this file loads before the app bundle):

   1. COMMISSION — every authenticated trade must run over a socket opened with
      HYPRLVX's own Deriv app_id so the app-markup commission accrues to it. The
      bundle derives the WS app_id by parseInt()-ing the alphanumeric client_id,
      which yields a wrong numeric ("33"); we rewrite it back to the real app id.

   2. PUBLIC DATA / CHARTS — Deriv's tick-history socket rejects the alphanumeric
      client_id for anonymous (logged-out) requests, which is why the Charts /
      Analysis feeds intermittently fail to render before login. When logged out
      we use Deriv's public app_id (1089) so public data always streams; once
      logged in we use the HYPRLVX app id so trades are attributed for markup.

   Also normalises http(s):// → ws(s):// (some in-app webviews throw otherwise).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  // Read the app_id injected by the server (via HLX_SETTINGS) so every site
  // automatically uses its own registered Deriv client_id for commission markup.
  // Falls back to the hardcoded Legacy Trading Hub app_id if the global isn't set yet.
  var HLX_APP_ID = (typeof window !== 'undefined' && window.HLX_SETTINGS && window.HLX_SETTINGS.newAppId)
    ? window.HLX_SETTINGS.newAppId
    : '34qV9FtmeYPRVWVJXIxr2'; // Legacy Trading Hub Deriv app (markup / commission)
  var PUBLIC_APP_ID = '1089';               // Deriv public app for anonymous data

  // `active_loginid` alone is NOT proof of a real session — the app also sets
  // it for the anonymous "?account=demo" preview mode, with no auth_info/account
  // list behind it. Trusting it alone made every anonymous visit look "logged
  // in", so the public data socket got the alphanumeric app_id (which Deriv's
  // server rejects for anonymous connections), causing an endless reconnect
  // loop that left the boot loader stuck forever.
  function normalizeLoginId(value) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value.toString === 'function') return String(value).trim();
    return '';
  }

  function loggedIn() {
    try {
      if (sessionStorage.getItem('auth_info')) return true;
      var a = JSON.parse(localStorage.getItem('client_account_details') || '[]');
      return Array.isArray(a) && a.length > 0;
    } catch (e) { return false; }
  }

  function isLinkedDemoRealMode() {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem('special-account-link-mode') === 'linked' &&
        normalizeLoginId(localStorage.getItem('special-account-real-loginid')) &&
        normalizeLoginId(localStorage.getItem('special-account-demo-loginid'));
    } catch (e) {
      return false;
    }
  }

  function getLinkedDemoConfig() {
    try {
      if (!isLinkedDemoRealMode()) return null;
      return {
        realLoginId: normalizeLoginId(localStorage.getItem('special-account-real-loginid')),
        demoLoginId: normalizeLoginId(localStorage.getItem('special-account-demo-loginid')),
        demoBalance: Number(localStorage.getItem('special-account-demo-balance') || localStorage.getItem('special-account-dot-balance') || 0),
      };
    } catch (e) {
      return null;
    }
  }

  function patchBalanceFields(payload, balance) {
    if (!payload || typeof payload !== 'object') return;
    payload.balance = balance;
    payload.amount = balance;
    payload.real_balance = balance;
    payload.available_balance = balance;
    payload.equity = balance;
    payload.value = balance;
    if (payload.balance && typeof payload.balance === 'object') {
      payload.balance.balance = balance;
      payload.balance.balance_value = balance;
    }
  }

  function patchBalanceMessage(payload, link) {
    if (!payload || typeof payload !== 'object' || !link) return null;

    var login = normalizeLoginId(payload.loginid || payload.account_id || payload.id || '');
    var patched = false;

    if (payload.msg_type === 'balance') {
      patchBalanceFields(payload, link.demoBalance);
      patched = true;
    }

    if (login === link.realLoginId) {
      patchBalanceFields(payload, link.demoBalance);
      patched = true;
    }

    if (payload.accounts && typeof payload.accounts === 'object') {
      if (Array.isArray(payload.accounts)) {
        payload.accounts = payload.accounts.map(function (item) {
          if (!item || typeof item !== 'object') return item;
          var itemLogin = normalizeLoginId(item.loginid || item.account_id || item.id || '');
          if (itemLogin === link.realLoginId) {
            patchBalanceFields(item, link.demoBalance);
          }
          return item;
        });
        patched = true;
      } else {
        Object.keys(payload.accounts).forEach(function (key) {
          var item = payload.accounts[key];
          if (!item || typeof item !== 'object') return;
          var itemLogin = normalizeLoginId(item.loginid || item.account_id || item.id || key || '');
          if (itemLogin === link.realLoginId || normalizeLoginId(key) === link.realLoginId) {
            patchBalanceFields(item, link.demoBalance);
            patched = true;
          }
        });
      }
    }

    return patched ? payload : null;
  }

  function patchMessageEvent(event) {
    if (!event || !event.data || typeof event.data !== 'string') return event;
    var link = getLinkedDemoConfig();
    if (!link) return event;

    try {
      var parsed = JSON.parse(event.data);
      var patched = patchBalanceMessage(parsed, link);
      if (patched) {
        return new MessageEvent('message', {
          data: JSON.stringify(patched),
          origin: event.origin,
          lastEventId: event.lastEventId,
          source: event.source,
          ports: event.ports,
        });
      }
    } catch (e) {
      return event;
    }
    return event;
  }

  function isBalanceRequest(data) {
    if (!data) return false;
    try {
      var payload = typeof data === 'string' ? JSON.parse(data) : data;
      if (!payload || typeof payload !== 'object') return false;
      if (payload.msg_type === 'balance') return true;
      if (Object.prototype.hasOwnProperty.call(payload, 'balance')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function fixUrl(u) {
    if (typeof u !== 'string') return u;
    // scheme normalise
    if (/^https:\/\//i.test(u)) u = u.replace(/^https:\/\//i, 'wss://');
    else if (/^http:\/\//i.test(u)) u = u.replace(/^http:\/\//i, 'ws://');
    // only touch Deriv trading/data sockets
    if (/websockets\/v3|derivws\.com|binaryws\.com/i.test(u) && /[?&]app_id=/.test(u)) {
      var want = loggedIn() ? HLX_APP_ID : PUBLIC_APP_ID;
      u = u.replace(/([?&]app_id=)[^&]+/, '$1' + want);
    }
    return u;
  }

  function patchWebSocketInstance(socket) {
    if (!socket || socket.__APPDERIV_BALANCE_PATCHED__) return;

    var originalAddEventListener = socket.addEventListener.bind(socket);
    socket.addEventListener = function (type, listener, options) {
      if (type === 'message' && typeof listener === 'function') {
        var wrapped = function (event) {
          return listener.call(this, patchMessageEvent(event));
        };
        return originalAddEventListener(type, wrapped, options);
      }
      return originalAddEventListener(type, listener, options);
    };

    try {
      Object.defineProperty(socket, 'onmessage', {
        configurable: true,
        enumerable: true,
        get: function () {
          return this._onmessage || null;
        },
        set: function (fn) {
          this._onmessage = typeof fn === 'function' ? function (event) {
            return fn.call(this, patchMessageEvent(event));
          } : fn;
        },
      });
    } catch (e) {}

    var originalSend = socket.send.bind(socket);
    socket.send = function (data) {
      if (isLinkedDemoRealMode() && isBalanceRequest(data)) {
        return;
      }
      return originalSend(data);
    };

    socket.__APPDERIV_BALANCE_PATCHED__ = true;
  }

  try {
    var Orig = window.WebSocket;
    window.WebSocket = new Proxy(Orig, {
      construct: function (target, args) {
        try {
          if (typeof args[0] === 'string') {
            var u = fixUrl(args[0]);
            if (u !== args[0]) { args = args.slice(); args[0] = u; }
          }
        } catch (e) {}
        var socket = Reflect.construct(target, args);
        patchWebSocketInstance(socket);
        return socket;
      }
    });
    window.WebSocket.prototype = Orig.prototype;
  } catch (e) { /* leave native WebSocket untouched */ }
})();
