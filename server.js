const express = require('express');
const path = require('path');
const fs = require('fs');
const BRAND = require('./brand.config');
const app = express();
const PORT = process.env.PORT || 3001;

// ─── TEMPLATE TOKEN RENDERING ────────────────────────────────────────────────
// index.html / manifest.json ship with %%TOKEN%% placeholders instead of
// hardcoded brand strings. Fill them in from brand.config.js on every request
// (cheap — these are small files) so editing brand.config.js is enough to
// re-skin the whole app; no rebuild step needed.
function darken(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function resolveRedirectUrl(site) {
  const value = site && (site.redirectUrl || site.redirect_url || site.redirect || '');
  const normalized = value && String(value).trim();
  if (!normalized) {
    const fallbackHost = site && site.primaryDomain ? site.primaryDomain : BRAND.primaryDomain;
    return fallbackHost ? `https://${fallbackHost}/` : 'https://localhost/';
  }
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized.replace(/^\/+/, '')}`;
}

function buildTokens(site) {
  const primaryColor = site.primaryColor || '#000000';
  return {
    '%%APP_NAME%%': site.appName,
    '%%LOGO_TEXT_MAIN%%': site.logoTextMain,
    '%%LOGO_TEXT_ACCENT%%': site.logoTextAccent,
    '%%LOGO_URL%%': site.logoUrl || '',
    '%%FAVICON_URL%%': site.faviconUrl || '/assets/media/favicon.png',
    '%%MANIFEST_ICON_URL%%': site.logoUrl || site.faviconUrl || '/assets/platform_logos/ic_platform_deriv_512x512.png',
    '%%CLIENT_ID%%': site.derivAppId || '34qV9FtmeYPRVWVJXIxr2',
    '%%DERIV_APP_ID%%': site.derivAppId || '34qV9FtmeYPRVWVJXIxr2',
    '%%REDIRECT_URI%%': resolveRedirectUrl(site),
    '%%TAGLINE%%': site.tagline,
    '%%DESCRIPTION%%': site.description,
    '%%PRIMARY_DOMAIN%%': site.primaryDomain,
    '%%ALLOWED_DOMAINS_JSON%%': JSON.stringify(site.allowedDomains || []),
    '%%PRIMARY_COLOR%%': primaryColor,
    '%%PRIMARY_COLOR_DARK%%': darken(primaryColor, 0x20),
    '%%ACCENT_COLOR%%': site.accentColor,
    '%%ACTIVE_TAB_COLOR%%': site.activeTabColor || site.accentColor,
    '%%BOT_BUTTON_COLOR%%': site.botButtonColor,
    '%%BOT_BUILDER_COLOR%%': site.botBuilderColor,
    '%%SECONDARY_COLOR%%': site.secondaryColor,
    '%%BACKGROUND_COLOR%%': site.backgroundColor,
    '%%FONT_FAMILY%%': `'${site.fontFamily || ''}'`,
    '%%FONT_GOOGLE_PARAM%%': site.fontGoogleParam || '',
  };
}

function renderTemplate(filePath, site, extraTokens = {}) {
  const TOKENS = buildTokens(site || BRAND);
  const tokens = { ...TOKENS, ...extraTokens };
  let s = fs.readFileSync(filePath, 'utf8');
  for (const [token, value] of Object.entries(tokens)) s = s.split(token).join(value);
  return s;
}

function currentHost(req) {
  const forwarded = req.headers['x-forwarded-host'] || req.headers.host || BRAND.primaryDomain || '';
  const host = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '');
  return host.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase();
}

async function resolveSiteForReq(req) {
  const host = currentHost(req);
  const site = (BRAND.getConfig && await BRAND.getConfig(host)) || BRAND;
  return site || BRAND;
}

// ─── SECURITY / ANTI-CLONE HEADERS ───────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function noCache(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// Per-site builders: produce the same objects previously served from global
// BRAND, but now computed per-request based on hostname.
function buildHLXSettings(site) {
  const DERIV_CLIENT_ID = site.derivAppId;
  const primaryColor = site.primaryColor || '#000000';
  return {
    brandName: site.appName,
    platformName: site.appName,
    siteTitle: `${site.appName} — ${site.tagline}`,
    logoUrl: site.logoUrl || '',
    logoFileId: '',
    faviconUrl: site.faviconUrl || '',
    faviconFileId: '',
    newAppId: DERIV_CLIENT_ID,
    oauthClientId: DERIV_CLIENT_ID,
    appId: DERIV_CLIENT_ID,
    legacyAppId: DERIV_CLIENT_ID,
    primaryColor: primaryColor,
    secondaryColor: site.secondaryColor,
    tabListBackground: primaryColor,
    tabActiveColor: site.activeTabColor,
    buttonPrimaryColor: site.accentColor,
    buttonLoginColor: '#ffffff',
    botLoadButtonColor: site.botButtonColor,
    botLoadButtonTextColor: '#ffffff',
    loaderPrimaryColor: primaryColor,
    loaderSecondaryColor: site.accentColor,
    loaderBackgroundColor: site.backgroundColor,
    loaderStyle: 'orbit_terminal',
    botCardStyle: 'minimal',
    botBuilderColor: site.botBuilderColor,
    botBuilderShellColor: site.botBuilderColor,
    listItemBackgroundGradient: `linear-gradient(135deg, #1a0f2e 0%, ${primaryColor} 45%, ${site.accentColor} 100%)`,
    listItemHoverGradient: `linear-gradient(135deg, #241640 0%, ${primaryColor} 55%, ${site.accentColor} 100%)`,
    referralUrl: site.referralUrl,
    referralTitle: 'Deriv Affiliate Link',
    referralText: '',
    specialAccounts: Array.isArray(site.specialAccounts) ? site.specialAccounts : [],
    marketingAccounts: Array.isArray(site.marketingAccounts) ? site.marketingAccounts : [],
    socialWhatsapp: '', socialTelegram: '', socialInstagram: '',
    socialFacebook: '', socialYoutube: '', socialTiktok: '', socialWebsite: '',
    redirectUrl: resolveRedirectUrl(site),
    redirectUri: resolveRedirectUrl(site),
    tabs: [
      { id: 'dashboard',      label: 'Dashboard',      always: true, icon: 'FaHome',      visible: true },
      { id: 'bot_builder',    label: 'Bot Builder',    always: true, icon: 'FaRobot',     visible: true },
      { id: 'free_bots',      label: 'Free Bots',                    icon: 'FaRobot',     visible: true },
      { id: 'analysis',       label: 'Analysis',                     icon: 'FaChartLine', visible: true },
      { id: 'dtrader',        label: 'D-Trader',                     icon: 'FaChartBar',  visible: true },
      { id: 'smart_analysis', label: 'Smart Analysis',               icon: 'FaChartLine', visible: true },
      { id: 'signals',        label: 'Signals',                      icon: 'FaSignal',    visible: true },
      { id: 'matches',        label: 'Matches',                      icon: 'FaCrown',     visible: true },
      { id: 'speedbot',       label: 'Speedbot',                     icon: 'FaBolt',      visible: true },
      { id: 'charts',         label: 'Charts',                       icon: 'FaChartLine', visible: true },
      { id: 'copy_trader',    label: 'Copy Trading',                 icon: 'FaCopy',      visible: true },
    ],
  };
}

function buildHLXSite(site) {
  const settings = buildHLXSettings(site);
  return {
    $id: (site.appName || 'site').toLowerCase(),
    name: site.appName,
    domains: site.allowedDomains,
    domainList: site.primaryDomain,
    settingsJson: JSON.stringify(settings),
    suspended: false,
    appId: site.derivAppId,
    brandName: site.appName,
    redirectUrl: resolveRedirectUrl(site),
    redirectUri: resolveRedirectUrl(site),
    logoUrl: site.logoUrl || '',
    faviconUrl: site.faviconUrl || '',
    primaryColor: site.primaryColor,
    secondaryColor: site.secondaryColor,
    accentColor: site.accentColor,
    activeTabColor: site.activeTabColor,
    botButtonColor: site.botButtonColor,
    botBuilderColor: site.botBuilderColor,
    backgroundColor: site.backgroundColor,
    textColor: '#e5e7eb',
    fontFamily: site.fontFamily || null,
    socialWhatsapp: '',
    socialTelegram: '',
    tabsConfig: settings.tabs,
    includeFreeBots: true,
    appIds: site.derivAppId ? [{ id: site.derivAppId, redirect: resolveRedirectUrl(site), name: site.appName }] : [],
  };
}

// ─── FREE BOTS LIBRARY ───────────────────────────────────────────────────────
// Served through the same /api/appwrite/bots + /bot-xml contract the bundle
// expects. Bot records are loaded locally from the bots folder.
const BOT_DIR = path.join(__dirname, 'bots');

function humanizeBotName(fileName) {
  const base = fileName.replace(/\.xml$/i, '');
  return base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBotSlug(fileName) {
  const base = fileName.replace(/\.xml$/i, '');
  return base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function getBotLibrary(site) {
  const siteId = site && (site.siteId || site.id || '');
  const now = new Date().toISOString();
  const botFiles = [];

  if (fs.existsSync(BOT_DIR) && fs.statSync(BOT_DIR).isDirectory()) {
    for (const fileName of fs.readdirSync(BOT_DIR)) {
      if (!fileName.toLowerCase().endsWith('.xml')) continue;
      const filePath = path.join(BOT_DIR, fileName);
      try {
        const xmlContent = fs.readFileSync(filePath, 'utf8');
        const id = buildBotSlug(fileName);
        botFiles.push({
          id,
          file: fileName,
          displayName: humanizeBotName(fileName),
          description: 'Bot loaded from the local bots folder.',
          category: 'Free Bot',
          folderId: 'free-bots',
          folderName: 'Free Bots',
          xmlContent,
          createdAt: now,
        });
      } catch (error) {
        console.warn('[deploy-server] Unable to read bot file:', filePath, error instanceof Error ? error.message : error);
      }
    }
  }

  return botFiles;
}

async function botCards(site) {
  const bots = await getBotLibrary(site);
  return bots.map((b) => ({
    id: b.id,
    displayName: b.displayName,
    description: b.description,
    folderId: b.folderId,
    folderName: b.folderName,
    category: b.category,
    storageFileId: b.id,
    createdAt: nowIso,
  }));
}

// ─── APPWRITE-CONTRACT ENDPOINTS (served locally, no external Appwrite) ───────
function jsonCors(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
}

app.get('/api/appwrite/site-settings', async (req, res) => {
  jsonCors(res); noCache(res);
  const site = await resolveSiteForReq(req);
  const hlxSite = buildHLXSite(site);
  res.json({ ok: true, hostname: req.query.hostname || site.primaryDomain, site: hlxSite });
});

app.get('/api/appwrite/site-entitlement', async (req, res) => {
  jsonCors(res); noCache(res);
  const site = await resolveSiteForReq(req);
  const hlxSite = buildHLXSite(site);
  res.json({ ok: true, entitlement: {
    allowed: true, status: 'active', reason: 'ok',
    hostname: req.query.hostname || site.primaryDomain,
    siteId: hlxSite.$id, siteName: site.appName, ownerId: hlxSite.$id, hasSiteToken: false,
  }});
});

app.get('/api/appwrite/bots', async (req, res) => {
  jsonCors(res);
  const site = await resolveSiteForReq(req);
  res.json({ ok: true, bots: await botCards(site) });
});

app.get('/api/appwrite/bot-xml', async (req, res) => {
  const site = await resolveSiteForReq(req);
  const id = String(req.query.id || '');
  const bots = await getBotLibrary(site);
  const bot = bots.find((b) => b.id === id || b.file === id);
  if (!bot) return res.status(404).type('text/plain').send('bot not found');

  if (bot.xmlContent) {
    res.setHeader('Content-Type', 'application/xml');
    return res.send(bot.xmlContent);
  }

  return res.status(404).type('text/plain').send('bot xml not found');
});

// ─── DERIV OAUTH PKCE TOKEN EXCHANGE PROXY ───────────────────────────────────
// The bundle POSTs { grant_type, client_id, code, environment, redirect_uri,
// code_verifier } here; we forward it to Deriv's token endpoint (server-side to
// avoid browser CORS on the token endpoint) and return the JSON verbatim.
app.post('/api/oauth/token', express.json(), async (req, res) => {
  jsonCors(res); noCache(res);
  try {
    const b = req.body || {};
    const env = (b.environment || '').toString().toLowerCase();
    const tokenUrl = env === 'staging'
      ? 'https://staging-auth.deriv.com/oauth2/token'
      : 'https://auth.deriv.com/oauth2/token';
    const site = resolveSiteForReq(req);
    const defaultClientId = site && site.derivAppId;
    const siteRedirect = resolveRedirectUrl(site);
    const form = new URLSearchParams({
      grant_type: b.grant_type || 'authorization_code',
      client_id: b.client_id || defaultClientId,
      code: b.code || '',
      redirect_uri: b.redirect_uri || siteRedirect,
      code_verifier: b.code_verifier || '',
    });
    const upstream = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: form.toString(),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'token_exchange_failed', detail: String(e && e.message || e) });
  }
});

// ─── HTML SHELL + STATIC ─────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  noCache(res);
  const site = await resolveSiteForReq(req);
  res.type('html').send(renderTemplate(path.join(__dirname, 'index.html'), site, {
    '%%PRIMARY_DOMAIN%%': currentHost(req),
    '%%ALLOWED_DOMAINS_JSON%%': JSON.stringify(site.allowedDomains || []),
  }));
});

// Minimal no-op service worker: the build registers a SW for PWA support, but we
// intentionally ship one with no fetch/caching handler so nothing is cached
// (freshness matters on a trading UI) and registration stops erroring on the
// SPA-fallback HTML it otherwise received.
app.get('/service-worker.js', (req, res) => {
  noCache(res);
  res.setHeader('Content-Type', 'application/javascript');
  res.send(
    "self.addEventListener('install',function(){self.skipWaiting();});\n" +
    "self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});\n"
  );
});
app.get(/^\/static\/js\/hlx-.*\.js$/, (req, res, next) => { noCache(res); next(); });

// Serve loader templates: prefer local files, otherwise fetch from the
// canonical upstream repo so sites can share a single loader implementation.
app.get('/loaders/:name', async (req, res) => {
  noCache(res);
  const name = String(req.params.name || '');
  const local = path.join(__dirname, 'loaders', name);
  const site = await resolveSiteForReq(req);

  // Helper: replace template tokens in a string using TOKENS
  async function replaceTokensInString(s, extra = {}) {
    const base = buildTokens(site);
    const tokens = { ...base, ...extra };
    let out = s;
    for (const [token, value] of Object.entries(tokens)) out = out.split(token).join(value);
    return out;
  }

  const appNameForHost = site.appName || BRAND.appName;
  const extra = {
    '%%YEAR%%': new Date().getFullYear(),
    '%%APP_NAME%%': appNameForHost,
    '%%TAGLINE%%': site.tagline,
  };
  if (fs.existsSync(local)) {
    try {
      const raw = fs.readFileSync(local, 'utf8');
      const html = await replaceTokensInString(raw, extra);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (e) {
      return res.status(500).type('text/plain').send('local loader read failed');
    }
  }
  try {
    const upstream = `https://raw.githubusercontent.com/sekicko/appderivsites/main/loaders/${encodeURIComponent(name)}`;
    const r = await fetch(upstream);
    if (!r.ok) return res.status(404).type('text/plain').send('Not found');
    const body = await r.text();
    const html = await replaceTokensInString(body, extra);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(502).type('text/plain').send('upstream fetch failed');
  }
});

app.get('/special-accounts.js', (req, res) => {
  noCache(res);
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'special-accounts.js'));
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/loaders', express.static(path.join(__dirname, 'loaders')));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/translations', express.static(path.join(__dirname, 'translations')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/bots', express.static(BOT_DIR));
app.use('/docs', express.static(path.join(__dirname, 'docs'))); // strategy guide PDFs
app.get('/deriv-logo.svg', (req, res) => res.sendFile(path.join(__dirname, 'deriv-logo.svg')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));

// Dynamic manifest.json — render brand tokens before sending so the PWA icon,
// name, and colors are always correct for the current site.
app.get('/manifest.json', async (req, res) => {
  noCache(res);
  const site = await resolveSiteForReq(req);
  // Build a fallback icon URL: prefer logoUrl, then faviconUrl, then the
  // local Deriv logo SVG (always present), to prevent a blank icon error.
  const iconUrl = site.logoUrl || site.faviconUrl || '/assets/platform_logos/ic_platform_deriv_512x512.png';
  const extraTokens = { '%%MANIFEST_ICON_URL%%': iconUrl };
  const rendered = renderTemplate(path.join(__dirname, 'manifest.json'), site, extraTokens);
  res.type('application/json').send(rendered);
});

// Serve favicon: prefer site faviconUrl redirect, else fall back to PNG favicon
app.get('/favicon.ico', async (req, res) => {
  const site = await resolveSiteForReq(req);
  const url = site.faviconUrl || site.logoUrl || '';
  if (url && url.startsWith('http')) return res.redirect(302, url);
  return res.sendFile(path.join(__dirname, 'assets', 'media', 'favicon.png'));
});

// Legacy HYPRLVX config endpoint (kept for any of our own overlays).
app.get('/api/site-config', async (req, res) => {
  jsonCors(res);
  const site = await resolveSiteForReq(req);
  if (req.query.host) {
    return res.json({ ok: true, site });
  }
  return res.type('html').send(renderTemplate(path.join(__dirname, 'api', 'site-config.html'), site));
});

// Featured bots (used by our own bot-library overlay).
app.get('/api/featured-bots', (req, res) => res.json({ bots: [
  { id: 'hyprlvx-pro-ai', name: 'HYPRLVX Pro AI', file: '/bots/HyprlvxProAI.xml', description: 'Advanced AI-powered signal engine built exclusively for HYPRLVX', category: 'AI Signal', badge: 'EXCLUSIVE' },
  { id: 'ximi', name: 'XIMI', file: '/bots/XIMI.xml', description: 'Even/Odd digit bot with virtual loss filter and martingale recovery', category: 'Digits', badge: 'POPULAR' },
  { id: 'bluebeam', name: 'BlueBeam Pro AI', file: '/bots/BlueBeam.xml', description: 'Over/Under digit strategy with dual-window market analysis', category: 'Over/Under', badge: 'HOT' },
  { id: 'dark-owl', name: 'Dark Owl', file: '/bots/DarkOwl.xml', description: 'Alternating Under 4 / Over 5 strategy with smart martingale', category: 'Over/Under', badge: null },
]}));

// Empty/OK stubs for any other /api/* the bundle probes.
app.all('/api/*', (req, res) => { jsonCors(res); res.json({ ok: true, data: null, status: 'ok' }); });

// Missing static assets must 404 cleanly (never fall through to the SPA HTML) so
// webpack's chunk loader degrades gracefully instead of trying to parse HTML as JS.
app.get(['/static/*', '/assets/*', '/translations/*', '/loaders/*'], (req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// ─── SPA FALLBACK ────────────────────────────────────────────────────────────
app.get('*', async (req, res) => {
  noCache(res);
  const site = await resolveSiteForReq(req);
  res.type('html').send(renderTemplate(path.join(__dirname, 'index.html'), site, {
    '%%PRIMARY_DOMAIN%%': currentHost(req),
    '%%ALLOWED_DOMAINS_JSON%%': JSON.stringify(site.allowedDomains || []),
  }));
});

// Vercel invokes this file as a serverless function (via module.exports) instead
// of binding a port, so only listen when actually run as a standalone process
// (local dev / Railway).
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`${BRAND.appName} running on port ${PORT}`));
}

module.exports = app;
