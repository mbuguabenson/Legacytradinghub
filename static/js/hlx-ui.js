/* ─────────────────────────────────────────────────────────────────────────
   Legacy Trading Hub UI overlay
   • Deriv OAuth 2.0 with PKCE authorization flow
   • WhatsApp / social media link routing
   • Brand token synchronization
   • Blue theme styling
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  var WHATSAPP = 'https://wa.me/216434';
  var CLIENT_ID = (typeof window !== 'undefined' && window.HLX_SETTINGS && window.HLX_SETTINGS.newAppId)
    ? window.HLX_SETTINGS.newAppId
    : (localStorage.getItem('config.new_app_id') || '34qV9FtmeYPRVWVJXIxr2');

  var css = document.createElement('style');
  css.textContent =
    '.social-icons-btn,[aria-label="Social Media"]{cursor:pointer !important;' +
      'filter:drop-shadow(0 0 6px rgba(37,211,102,.5));transition:filter .3s,transform .3s}' +
    '.social-icons-btn:hover,[aria-label="Social Media"]:hover{transform:scale(1.08);' +
      'filter:drop-shadow(0 0 13px rgba(37,211,102,.95))}';
  document.head.appendChild(css);

  // ── Header chat/social icon → WhatsApp (event delegation survives re-renders) ──
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var el = t.closest('.social-icons-btn, [aria-label="Social Media"]');
    if (el) {
      e.preventDefault(); e.stopImmediatePropagation();
      window.open(WHATSAPP, '_blank', 'noopener');
    }
  }, true);

  // ── Deriv OAuth 2.0 with PKCE Flow ──────────────────────────────────────────
  async function triggerDerivPKCELogin() {
    try {
      var clientId = (window.HLX_SETTINGS && window.HLX_SETTINGS.newAppId) ||
                     localStorage.getItem('config.new_app_id') ||
                     '34qV9FtmeYPRVWVJXIxr2';

      // 1. Generate 64-byte random code_verifier
      var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      var randomBytes = new Uint8Array(64);
      window.crypto.getRandomValues(randomBytes);
      var codeVerifier = Array.from(randomBytes, function (b) { return charset[b % charset.length]; }).join('');

      // 2. SHA-256 hash -> Base64URL code_challenge
      var encoder = new TextEncoder();
      var hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
      var hashArray = Array.from(new Uint8Array(hashBuffer));
      var codeChallenge = btoa(String.fromCharCode.apply(null, hashArray))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 3. Cryptographically random state
      var stateBytes = new Uint8Array(16);
      window.crypto.getRandomValues(stateBytes);
      var state = Array.from(stateBytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');

      // 4. Store in sessionStorage (exact keys used by Deriv app bundle)
      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('pkce_code_verifier_timestamp', Date.now().toString());
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_state_timestamp', Date.now().toString());

      // 5. Build New Deriv OAuth2 authorization URL (never includes legacy app_id)
      var redirectUri = window.location.origin + '/';
      var params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read,trade',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      var authUrl = 'https://auth.deriv.com/oauth2/auth?' + params.toString();
      window.location.href = authUrl;
    } catch (err) {
      console.error('[PKCE Auth Error]', err);
    }
  }

  // Intercept click on any Log in button across all rendered views
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t) return;
    var btn = t.closest ? t.closest('.auth-actions__primary, button.login, button.sign-in, [class*="login"], [data-testid*="login"]') : null;
    if (btn) {
      var text = (btn.textContent || '').trim().toLowerCase();
      // Ensure we only match "Log in" / "Login" / "Sign in", not "Sign up"
      if ((text.includes('log in') || text.includes('login') || text === 'sign in') && !text.includes('sign up')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerDerivPKCELogin();
      }
    }
  }, true);

  // Expose for programmatic use
  window.triggerDerivPKCELogin = triggerDerivPKCELogin;

  // ── Brand-token swap + Analysis-tool title theming ──
  var BRAND_RE = /\b(D[-‑]?Bot|Binary[Tt]ool)\b/g;
  var AUTHOR_RE = /Trader\s*Mike/gi;
  function rewrite() {
    var brandName = (window.HLX_SETTINGS && window.HLX_SETTINGS.brandName) || 'Legacy Trading Hub';
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var v = n.nodeValue;
      if (v && BRAND_RE.test(v)) v = v.replace(BRAND_RE, brandName);
      if (v && AUTHOR_RE.test(v)) v = v.replace(AUTHOR_RE, 'Sapplanta');
      if (v !== n.nodeValue) n.nodeValue = v;
    }
    document.querySelectorAll('h1,h2,h3,[class*="title"],[class*="heading"]').forEach(function (el) {
      if (el.__hlxTitled) return;
      var txt = (el.textContent || '').trim();
      if (/analysis\s?tool|Legacy\s*Trading\s*Hub\s*Analysis/i.test(txt) && txt.length < 50) {
        el.__hlxTitled = true;
        el.style.color = '#3b82f6';
        el.style.textShadow = '0 0 14px rgba(59,130,246,.5)';
      }
    });
  }

  var scheduled = false;
  function run() { scheduled = false; try { rewrite(); } catch (e) {} }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(run); } }
  function start() {
    run();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
