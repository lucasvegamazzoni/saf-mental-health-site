import { useEffect } from 'react';

export const SITE_NAME = 'SAF Check-in';
export const SITE_ORIGIN = 'https://saf-checkin.web.app';

/**
 * Per-route <title>, meta description and canonical URL. The app is a SPA, so
 * search engines see index.html's defaults first and this on render — Google
 * executes JS, and the canonical keeps the GitHub Pages mirror from competing.
 */
export function useSeo(title: string, description: string, path?: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    const url = `${SITE_ORIGIN}${path ?? window.location.pathname}`;
    setMeta('property', 'og:url', url);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
    return () => {
      document.title = previous;
    };
  }, [title, description, path]);
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}
