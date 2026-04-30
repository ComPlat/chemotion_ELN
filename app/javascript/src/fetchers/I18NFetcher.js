const fetchJson = (path, fallback) => fetch(path)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .catch((error) => {
    console.error('Error fetching JSON:', error);
    return fallback;
  });

export default class I18NFetcher {
  static fetchAvailableLocales() {
    return fetchJson('/api/v1/public/i18n/locales', []);
  }

  static fetchGeneralMessages(locale) {
    return fetchJson(`/i18n/${locale}.json`, {});
  }

  static fetchAdminMessages(locale) {
    return fetchJson(`/i18n/admin/${locale}.json`, {});
  }
}
