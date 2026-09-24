const DEFAULT_SITES = {
  default: {
    id: 'default',
    siteId: 'default',
    name: 'AppDeriv Sites Builder',
    appName: 'AppDeriv Sites Builder',
    logoTextMain: 'AppDeriv',
    logoTextAccent: 'Sites Builder',
    tagline: 'Build your trading brand.',
    description: 'Custom branded trading website.',
    derivAppId: '',
    allowedDomains: [],
    primaryDomain: 'appderivsites12.vercel.app',
    primaryColor: '#1e40af',
    accentColor: '#3b82f6',
    activeTabColor: '#3b82f6',
    botButtonColor: '#1d4ed8',
    botBuilderColor: '#0c1432',
    secondaryColor: '#0f172a',
    backgroundColor: '#04091f',
    fontFamily: 'Inter',
    fontGoogleParam: 'Inter:wght@300;400;500;600;700;800',
    referralUrl: '',
    specialAccounts: [],
    marketingAccounts: [],
  },
  legacytradinghub: {
    id: 'legacytradinghub',
    siteId: 'legacytradinghub',
    name: 'Legacy Trading Hub',
    appName: 'LegacyTradingHub',
    logoTextMain: 'Legacy',
    logoTextAccent: 'TradingHub',
    tagline: 'Institutional-Grade Trading Intelligence.',
    description: 'Premium algorithmic trading suite powered by Deriv.',
    derivAppId: '34qV9FtmeYPRVWVJXIxr2',
    allowedDomains: ['profhubdtrader.vercel.app', 'www.profhubdtrader.vercel.app'],
    primaryDomain: 'profhubdtrader.vercel.app',
    primaryColor: '#1e40af',
    accentColor: '#3b82f6',
    activeTabColor: '#3b82f6',
    botButtonColor: '#1d4ed8',
    botBuilderColor: '#0c1432',
    secondaryColor: '#0f172a',
    backgroundColor: '#04091f',
    fontFamily: 'Inter',
    fontGoogleParam: 'Inter:wght@300;400;500;600;700;800',
    referralUrl: '',
    specialAccounts: [],
    marketingAccounts: [],
  },
  binarytool_virid: {
    id: 'binarytool_virid',
    siteId: 'binarytool_virid',
    name: 'BinaryTool Virid',
    appName: 'BinaryTool',
    logoTextMain: 'BinaryTool',
    logoTextAccent: 'Virid',
    tagline: 'Build your trading brand.',
    description: 'Custom branded trading website.',
    derivAppId: '340Rq6GbW1fGHgpjdJS43',
    allowedDomains: ['binarytool-virid.vercel.app'],
    primaryDomain: 'binarytool-virid.vercel.app',
    primaryColor: '#1e40af',
    accentColor: '#3b82f6',
    activeTabColor: '#3b82f6',
    botButtonColor: '#1d4ed8',
    botBuilderColor: '#0c1432',
    secondaryColor: '#0f172a',
    backgroundColor: '#04091f',
    fontFamily: 'Inter',
    fontGoogleParam: 'Inter:wght@300;400;500;600;700;800',
    referralUrl: '',
    specialAccounts: [],
    marketingAccounts: [],
  },
  // Add additional hardcoded sites here.
  // Example:
  // example: {
  //   id: 'example',
  //   siteId: 'example',
  //   name: 'Example Brand',
  //   appName: 'Example Brand',
  //   logoTextMain: 'Example',
  //   logoTextAccent: 'Brand',
  //   tagline: 'Example trading site',
  //   description: 'A hardcoded example site.',
  //   derivAppId: '',
  //   allowedDomains: ['example.com', 'www.example.com'],
  //   primaryDomain: 'example.com',
  //   primaryColor: '#1d4ed8',
  //   accentColor: '#06b6d4',
  //   activeTabColor: '#06b6d4',
  //   botButtonColor: '#1d4ed8',
  //   botBuilderColor: '#0b0f19',
  //   secondaryColor: '#111827',
  //   backgroundColor: '#0f172a',
  //   fontFamily: 'Inter',
  //   fontGoogleParam: 'Inter:wght@300;400;500;600;700;800',
  //   referralUrl: '',
  //   specialAccounts: [],
  //   marketingAccounts: [],
  // },
};

const DEFAULT = DEFAULT_SITES.default;
const DEFAULT_SITE_KEY = 'default';

function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./i, '')
    .split(',')[0]
    .trim();
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const color = raw.startsWith('#') ? raw : `#${raw}`;
  const sixDigit = /^#?([0-9a-fA-F]{6})$/.exec(color);
  if (sixDigit) return `#${sixDigit[1].toLowerCase()}`;

  const eightDigit = /^#?([0-9a-fA-F]{8})$/.exec(color);
  if (eightDigit) return `#${eightDigit[1].slice(0, 6).toLowerCase()}`;

  const short = /^#?([0-9a-fA-F]{3})$/.exec(color);
  if (short) {
    const expanded = short[1].split('').map((digit) => digit + digit).join('');
    return `#${expanded.toLowerCase()}`;
  }

  return fallback;
}

function normalizeRedirectUrl(value, fallbackDomain) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (!fallbackDomain) return '';
    return `https://${fallbackDomain}/`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

function normalizeSpecialAccounts(value) {
  const source = Array.isArray(value) ? value : [];

  return source
    .map((item) => {
      if (!item || typeof item !== 'object') {
        if (typeof item === 'string' && item.trim()) {
          return { loginid: item.trim(), dotAccountId: '', subtract: 9857.28, description: 'Special ROT account' };
        }
        return null;
      }

      const loginid = item.loginid || item.login_id || item.account_id || item.id || '';
      const dotAccountId = item.dotAccountId || item.dot_account_id || item.dotAccount || '';
      const subtract = Number(item.subtract ?? item.amount ?? 9857.28);
      const description = item.description || 'Special ROT account derived from the authorized DOT account balance';

      if (!loginid) return null;

      return {
        loginid,
        dotAccountId,
        subtract: Number.isFinite(subtract) ? subtract : 9857.28,
        description,
      };
    })
    .filter(Boolean);
}

function findSiteByHostname(hostname) {
  const defaultSite = DEFAULT;
  if (!hostname) return defaultSite;

  const host = normalizeHostname(hostname);
  if (!host) return defaultSite;

  for (const site of Object.values(DEFAULT_SITES)) {
    const primary = normalizeHostname(site.primaryDomain);
    const allowed = Array.isArray(site.allowedDomains)
      ? site.allowedDomains.map((domain) => normalizeHostname(domain))
      : [];

    if ((primary && primary === host) || allowed.includes(host)) return site;
    if (primary && primary.replace(/^www\./i, '') === host.replace(/^www\./i, '')) return site;
    if (allowed.some((domain) => domain.replace(/^www\./i, '') === host.replace(/^www\./i, ''))) return site;
  }

  return defaultSite;
}

module.exports = Object.assign({}, DEFAULT, {
  sites: DEFAULT_SITES,
  defaultSiteKey: DEFAULT_SITE_KEY,
  getConfig: async (hostname) => findSiteByHostname(hostname),
});
