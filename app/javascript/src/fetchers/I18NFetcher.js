const fetchMessages = (path) => fetch(path)
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .catch((error) => {
    console.error('Error fetching JSON:', error);
    return {};
  });

export default class I18NFetcher {
  static fetchGeneralMessages(locale) {
    return fetchMessages(`/i18n/${locale}.json`);
  }

  static fetchAdminMessages(locale) {
    return fetchMessages(`/i18n/admin/${locale}.json`);
  }
}
