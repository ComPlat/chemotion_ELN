import PeriodicTableFetcher from 'src/fetchers/PeriodicTableFetcher';

let elementRegex = null;
let fetchPromise = null;

// Build a regex that matches element symbols longest-first so two-char symbols
// (e.g. Br, Si, Al) are matched before their single-char prefixes (B, S, A...).
export const buildElementRegex = (symbols) => {
  const sorted = [...symbols].sort((a, b) => b.length - a.length);
  return new RegExp(`(${sorted.join('|')})`, 'g');
};

// Fetch symbols from the backend once; cache result for the session.
export const getElementRegex = () => {
  if (elementRegex) return Promise.resolve(elementRegex);
  if (!fetchPromise) {
    fetchPromise = PeriodicTableFetcher.fetchSymbols()
      .then((symbols) => {
        elementRegex = buildElementRegex(symbols);
        fetchPromise = null;
        return elementRegex;
      });
  }
  return fetchPromise;
};

// Synchronous accessor — only valid after getElementRegex() has resolved at least once.
export const getElementRegexSync = () => elementRegex;
