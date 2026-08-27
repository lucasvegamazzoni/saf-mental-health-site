// Node has no Referer; the web API key is referrer-restricted (LUC-95). Present a dev origin.
const of = globalThis.fetch;
globalThis.fetch = (u, o = {}) => of(u, { ...o, headers: { ...(o.headers || {}), Referer: 'http://localhost:5199/' } });
