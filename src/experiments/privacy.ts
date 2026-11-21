/** The parts of `navigator` the privacy checks read, so tests can pass plain objects. */
export type PrivacySignals = {
  doNotTrack?: string | null;
  /** Do Not Track on older Safari and IE exposed it on window. */
  windowDoNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  userAgent?: string;
  webdriver?: boolean;
  /** document.prerendering: the page is being prerendered and nobody is looking yet. */
  prerendering?: boolean;
};

const BOT_UA =
  /bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|vercel|python|curl|wget|node-fetch|axios|go-http|java\/|phantomjs|puppeteer|playwright|selenium/i;

/** Do Not Track or Global Privacy Control is on: the visitor asked not to be measured. */
export function optedOut(s: PrivacySignals): boolean {
  if (s.globalPrivacyControl === true) return true;
  return s.doNotTrack === "1" || s.doNotTrack === "yes" || s.windowDoNotTrack === "1";
}

/** Crawlers, link previews, monitors and automated browsers. */
export function isBot(s: PrivacySignals): boolean {
  if (s.webdriver === true) return true;
  if (s.prerendering === true) return true;
  const ua = s.userAgent ?? "";
  return ua.length === 0 || BOT_UA.test(ua);
}

/** Whether this visitor takes part: not opted out and not a bot. Nothing is sent otherwise. */
export function mayMeasure(s: PrivacySignals): boolean {
  return !optedOut(s) && !isBot(s);
}

export function browserSignals(): PrivacySignals {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return {
    doNotTrack: nav.doNotTrack,
    windowDoNotTrack: (window as Window & { doNotTrack?: string }).doNotTrack ?? null,
    globalPrivacyControl: nav.globalPrivacyControl,
    userAgent: nav.userAgent,
    webdriver: nav.webdriver,
    prerendering: (document as Document & { prerendering?: boolean }).prerendering,
  };
}
