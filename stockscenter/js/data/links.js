// Fixed external links (DOM-free so node tests can import them). SPEC §0 / §5: two tokens, two repos.
export const DESKTOP_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new?name=StocksCenter%20desktop&contents=write&expires_in=366";
export const PHONE_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new?name=StocksCenter%20phone&contents=write&expires_in=366";
export const DEFAULT_OWNER = "yanivedelstein44-creator";
export const DEFAULT_CODE_REPO = "stockscenter";
export const DEFAULT_DATA_REPO = "stockscenter-data";

/**
 * TradingView symbol page (design/DESIGN.md, stock sheet): https://www.tradingview.com/symbols/<EXCHANGE>-<SYMBOL>/.
 * TradingView keeps the dot of class shares (NYSE-BRK.B; NYSE-BRK-B is a 404, checked 2026-11-12).
 * Without a usable exchange the page is /symbols/<SYMBOL>/.
 * Returns null for anything that is not a plain ticker, so a hostile symbol can never build another URL.
 */
export function tradingViewUrl(symbol, exchange) {
  const sym = String(symbol ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_.-]{0,19}$/.test(sym) || sym.includes("..")) return null;
  const ex = String(exchange ?? "").trim().toUpperCase();
  const prefix = /^[A-Z][A-Z0-9_]{0,19}$/.test(ex) ? ex + "-" : "";
  return `https://www.tradingview.com/symbols/${prefix}${sym}/`;
}
